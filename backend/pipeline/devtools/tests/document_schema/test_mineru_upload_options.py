from pathlib import Path
from unittest.mock import Mock

from retainpdf_pipeline.ocr.mineru_provider import mineru_api, submission


def test_python_upload_options_use_provider_wire_levels(monkeypatch):
    post = Mock(return_value={"data": {"batch_id": "batch-1", "file_urls": ["https://example.invalid/upload"]}})
    monkeypatch.setattr(mineru_api, "post_json", post)
    result = mineru_api.apply_upload_url(
        token="fixture", file_name="scan.pdf", model_version="pipeline", data_id=" scan-1 ",
        is_ocr=True, enable_formula=False, enable_table=False, language="en",
        page_ranges=" 2,4-6 ", extra_formats=["html"],
    )
    assert result[0] == "batch-1"
    payload = post.call_args.args[2]
    assert payload == {
        "files": [{"name": "scan.pdf", "is_ocr": True, "data_id": "scan-1", "page_ranges": "2,4-6"}],
        "model_version": "pipeline", "enable_formula": False, "enable_table": False,
        "language": "en", "extra_formats": ["html"],
    }


def test_python_upload_defaults_and_empty_options(monkeypatch):
    post = Mock(return_value={"data": {"batch_id": "batch-1", "file_urls": ["https://example.invalid/upload"]}})
    monkeypatch.setattr(mineru_api, "post_json", post)
    mineru_api.apply_upload_url(token="fixture", file_name="scan.pdf", model_version="vlm", data_id="")
    assert post.call_args.args[2] == {
        "files": [{"name": "scan.pdf", "is_ocr": False}], "model_version": "vlm",
        "enable_formula": True, "enable_table": True, "language": "ch",
    }


def test_local_orchestration_forwards_options_and_queries_original_batch(monkeypatch):
    apply = Mock(return_value=("original-batch", "https://example.invalid/upload"))
    query = Mock(side_effect=[
        {"data": {"extract_result": [{"file_name": "scan.pdf", "state": "pending"}]}},
        {"data": {"extract_result": [{"file_name": "scan.pdf", "state": "done", "full_zip_url": "result.zip"}]}},
    ])
    monkeypatch.setattr(submission, "apply_upload_url", apply)
    monkeypatch.setattr(submission, "upload_file", Mock())
    monkeypatch.setattr(submission, "query_batch_status", query)
    monkeypatch.setattr(submission.time, "sleep", lambda _: None)
    options = dict(is_ocr=True, enable_formula=False, enable_table=False, language="en",
                   page_ranges="2-3", extra_formats=["html"])
    result = submission.run_local_extract_task(
        token="fixture", file_path=Path("scan.pdf"), model_version="vlm", data_id="scan",
        poll_interval=1, poll_timeout=20, **options,
    )
    apply.assert_called_once_with(token="fixture", file_name="scan.pdf", model_version="vlm", data_id="scan", **options)
    assert [call.args for call in query.call_args_list] == [("fixture", "original-batch")] * 2
    assert result["data"]["state"] == "done"
