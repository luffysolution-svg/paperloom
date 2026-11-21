import tempfile
from pathlib import Path
from unittest import mock


from retainpdf_pipeline.render.workflow.context import RenderExecutionContext
from retainpdf_pipeline.render.workflow.modes import _compress_final_pdf_if_needed


def test_final_pdf_compression_skips_when_source_already_compressed() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        context = RenderExecutionContext(
            output_pdf_path=Path(tmp) / "out.pdf",
            start_page=0,
            end_page=0,
            source_image_compressed=True,
        )

        with mock.patch("retainpdf_pipeline.render.workflow.modes.compress_pdf_images_only") as compress_mock:
            compressed = _compress_final_pdf_if_needed(context, mode="overlay")

    assert compressed is False
    compress_mock.assert_not_called()


def test_final_pdf_compression_runs_when_source_not_compressed() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        context = RenderExecutionContext(
            output_pdf_path=Path(tmp) / "out.pdf",
            start_page=0,
            end_page=0,
            source_image_compressed=False,
        )

        with mock.patch("retainpdf_pipeline.render.workflow.modes.compress_pdf_images_only", return_value=True) as compress_mock:
            compressed = _compress_final_pdf_if_needed(context, mode="overlay")

    assert compressed is True
    compress_mock.assert_called_once_with(context.output_pdf_path, dpi=context.pdf_compress_dpi)


