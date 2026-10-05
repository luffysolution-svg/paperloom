from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from devtools.architecture_checks import document_operations as checks


def _check_sources(tmp_path, monkeypatch, pipeline=None, ai=None):
    roots = {"pipeline": tmp_path / "pipeline", "ai": tmp_path / "ai"}
    for kind, sources in (("pipeline", pipeline or {}), ("ai", ai or {})):
        for name, text in sources.items():
            path = roots[kind] / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
    monkeypatch.setattr(checks, "PACKAGE_ROOT", roots["pipeline"])
    monkeypatch.setattr(checks, "AI_PACKAGE_ROOT", roots["ai"])
    errors = []
    checks.check_document_operation_boundaries(errors)
    return errors


@pytest.mark.parametrize("statement", [
    "import retainpdf_ai",
    "import retainpdf_ai.document_operations.page_program as program",
    "from retainpdf_ai import document_operations",
    "def lazy():\n    from retainpdf_ai.document_operations import execute_page_program",
])
def test_pipeline_cannot_reintroduce_ai_imports(tmp_path, monkeypatch, statement):
    assert any("must not import the AI" in error for error in _check_sources(
        tmp_path, monkeypatch, pipeline={"entrypoints/worker.py": statement},
    ))


@pytest.mark.parametrize("statement", [
    "from retainpdf_pipeline.document_operations.page_program import execute_page_program",
    "def lazy():\n    from retainpdf_pipeline.document_operations.visual_validation import validate_page_program_visuals",
    "from retainpdf_pipeline.document_operations import page_program",
    "from retainpdf_pipeline.document_operations import *",
    "import retainpdf_pipeline.document_operations as operations",
    "def lazy():\n    from ..document_operations.page_program import execute_page_program",
    "from retainpdf_pipeline import document_operations as operations",
    "def lazy():\n    from .. import document_operations as operations",
])
def test_consumers_cannot_bypass_operation_public_surface(tmp_path, monkeypatch, statement):
    assert any("public functions" in error for error in _check_sources(
        tmp_path, monkeypatch, pipeline={"entrypoints/worker.py": statement},
    ))


def test_public_lazy_imports_and_domain_internal_imports_are_allowed(tmp_path, monkeypatch):
    assert not _check_sources(tmp_path, monkeypatch, pipeline={
        "entrypoints/worker.py": "def lazy():\n    from retainpdf_pipeline.document_operations import execute_page_program, validate_page_program_visuals as verify",
        "document_operations/visual_validation.py": "from .page_program import build_page_plan",
        "document_operations/__init__.py": "from .page_program import execute_page_program",
        "entrypoints/notes.py": '# import retainpdf_ai\nNOTE = "from retainpdf_ai import broken"',
        "entrypoints/relative.py": "def lazy():\n    from ..document_operations import execute_page_program as execute",
    })


def test_ai_cannot_replace_reverse_dependency_with_direct_pipeline_execution(tmp_path, monkeypatch):
    assert any("through the Rust API" in error for error in _check_sources(
        tmp_path, monkeypatch, ai={"agent.py": "def run():\n    from retainpdf_pipeline.document_operations import execute_page_program"},
    ))


def test_legacy_ai_operation_shim_is_rejected(tmp_path, monkeypatch):
    assert any("legacy implementations or shims" in error for error in _check_sources(
        tmp_path, monkeypatch, ai={"document_operations/__init__.py": "# old implementation location"},
    ))
