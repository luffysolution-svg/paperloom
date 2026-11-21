from __future__ import annotations

from pathlib import Path


from devtools.architecture_checks import common as architecture_common
from devtools.architecture_checks import pipeline as architecture_pipeline


def test_imported_modules_reports_import_and_from_modules(tmp_path: Path) -> None:
    source = tmp_path / "imports.py"
    source.write_text(
        "import os\n"
        "import retainpdf_pipeline.render.source_cleanup as cleanup\n"
        "from retainpdf_translation.public import TranslationExecutionRequest\n",
        encoding="utf-8",
    )

    assert architecture_common.imported_modules(source) == [
        "os",
        "retainpdf_pipeline.render.source_cleanup",
        "retainpdf_translation.public",
    ]


def test_imported_from_symbols_reports_symbols(tmp_path: Path) -> None:
    source = tmp_path / "from_imports.py"
    source.write_text(
        "from retainpdf_translation.public import TranslationExecutionRequest, execute_translation_request as execute\n",
        encoding="utf-8",
    )

    assert architecture_common.imported_from_symbols(source) == [
        ("retainpdf_translation.public", "TranslationExecutionRequest"),
        ("retainpdf_translation.public", "execute_translation_request"),
    ]


def test_imported_modules_raises_on_syntax_error(tmp_path: Path) -> None:
    source = tmp_path / "broken.py"
    source.write_text("from retainpdf_translation.public import\n", encoding="utf-8")

    try:
        architecture_common.imported_modules(source)
    except architecture_common.ArchitectureCheckSyntaxError as exc:
        assert exc.path == source
        assert "syntax error while scanning imports" in str(exc)
        assert "broken.py" in str(exc)
    else:
        raise AssertionError("expected ArchitectureCheckSyntaxError")


def test_pipeline_main_fails_and_reports_syntax_error(
    tmp_path: Path,
    monkeypatch,
    capsys,
) -> None:
    source = tmp_path / "broken.py"
    source.write_text("from retainpdf_translation.public import\n", encoding="utf-8")

    def check_syntax_error(errors: list[str]) -> None:
        architecture_common.imported_modules(source)

    def check_noop(errors: list[str]) -> None:
        return None

    monkeypatch.setattr(architecture_pipeline, "check_pipeline_provider_leaks", check_syntax_error)
    for name in (
        "check_service_provider_raw_leaks",
        "check_document_semantic_boundaries",
        "check_entrypoint_stable_imports",
        "check_ocr_provider_boundaries",
        "check_translation_worker_protocol",
        "check_stage_spec_contract_checker",
        "check_translation_pipeline_facade_boundary",
        "check_translation_public_surface_usage",
        "check_devtools_translation_internal_usage",
        "check_render_pipeline_facade_boundary",
        "check_rendering_internal_boundaries",
        "check_translation_rendering_separation",
        "check_translation_internal_boundaries",
    ):
        monkeypatch.setattr(architecture_pipeline, name, check_noop)

    assert architecture_pipeline.main() == 1
    captured = capsys.readouterr()
    assert "pipeline architecture check failed:" in captured.err
    assert "broken.py: syntax error while scanning imports" in captured.err
