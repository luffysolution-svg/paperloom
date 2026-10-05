"""CLI regression independent of AI/API fixtures.

The regular run denies AI imports in a subprocess. For actual wheel acceptance,
set RETAINPDF_PIPELINE_ONLY_PYTHON to a standalone interpreter with only the
Pipeline wheel and its declared dependencies installed. That mode does not use
an import blocker: it requires AI/FastAPI to be genuinely absent and Pipeline
to resolve inside the standalone environment, not an editable source checkout.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import textwrap

import fitz
import pikepdf
import pytest


_ISOLATED_CLI = textwrap.dedent("""\
    import importlib.abc
    import importlib.util
    import json
    from pathlib import Path
    import sys

    isolation_mode = sys.argv.pop(1)
    if isolation_mode == "installed-wheel":
        assert importlib.util.find_spec("retainpdf_ai") is None
        assert importlib.util.find_spec("fastapi") is None
        import retainpdf_pipeline
        assert Path(retainpdf_pipeline.__file__).resolve().is_relative_to(Path(sys.prefix).resolve())
    else:
        class DenyAiImports(importlib.abc.MetaPathFinder):
            def find_spec(self, fullname, path=None, target=None):
                if fullname == "retainpdf_ai" or fullname.startswith("retainpdf_ai."):
                    raise ModuleNotFoundError("AI imports are unavailable in this regression", name=fullname)
                return None
        sys.meta_path.insert(0, DenyAiImports())
        try:
            import retainpdf_ai
        except ModuleNotFoundError as exc:
            assert exc.name == "retainpdf_ai"
        else:
            raise AssertionError("AI import guard did not take effect")

    from retainpdf_pipeline.entrypoints.console import main
    print(json.dumps({"pipeline_cli_isolation": isolation_mode}), flush=True)
    exit_code = main(["document-operation", *sys.argv[1:]])
    assert not any(name == "retainpdf_ai" or name.startswith("retainpdf_ai.") for name in sys.modules)
    raise SystemExit(exit_code)
""")


def _write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def _visible_source(path: Path) -> None:
    with fitz.open() as document:
        for index, (width, height) in enumerate(((300, 500), (420, 260), (360, 360)), 1):
            page = document.new_page(width=width, height=height)
            page.insert_text((30, 62), f"CLI SOURCE PAGE {index}", fontsize=18)
            page.draw_rect(
                fitz.Rect(24, 100, width - 24, height - 24),
                color=(0.1, 0.1, 0.1),
                fill=(index / 4, 0.2, 0.7),
            )
            if index == 2:
                page.set_rotation(90)
        document.save(path)


def _run_operation(tmp_path: Path, program: object):
    workspace = tmp_path / "operation"
    input_dir, artifacts_dir = workspace / "input", workspace / "artifacts"
    input_dir.mkdir(parents=True)
    artifacts_dir.mkdir()
    source = input_dir / "source.pdf"
    _visible_source(source)
    source_bytes = source.read_bytes()
    program_path = input_dir / "program.json"
    limits_path = input_dir / "limits.json"
    _write_json(program_path, program)
    _write_json(limits_path, {
        "cpu_time_seconds": 30,
        "output_bytes": 32 * 1024 * 1024,
        "file_descriptor_count": 256,
        "memory_bytes": 2 * 1024 * 1024 * 1024,
        "process_count": 256,
    })
    candidate = artifacts_dir / "candidate.pdf"
    result = artifacts_dir / "result.json"
    visual = artifacts_dir / "visual-validation.json"
    standalone_python = os.environ.get("RETAINPDF_PIPELINE_ONLY_PYTHON")
    isolation_mode = "installed-wheel" if standalone_python else "import-guard"
    completed = subprocess.run(
        [
            standalone_python or sys.executable,
            "-I", "-c", _ISOLATED_CLI, isolation_mode,
            "--source", str(source),
            "--program", str(program_path),
            "--output", str(candidate),
            "--result", str(result),
            "--visual-validation", str(visual),
            "--limits", str(limits_path),
        ],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    assert source.read_bytes() == source_bytes
    assert {"pipeline_cli_isolation": isolation_mode} in [
        json.loads(line) for line in completed.stdout.splitlines() if line.startswith("{")
    ], completed.stdout + completed.stderr
    return completed, source, candidate, result, visual


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_document_operation_cli_runs_without_ai_and_preserves_page_semantics(tmp_path: Path) -> None:
    program = {
        "schema": "retainpdf_page_program_v1",
        "steps": [
            {"op": "select_pages", "pages": [3, 2, 2, 1]},
            {"op": "rotate_pages", "pages": [1, 3], "degrees": 90},
        ],
    }
    completed, source, candidate, result_path, visual_path = _run_operation(tmp_path, program)
    assert completed.returncode == 0, completed.stdout + completed.stderr
    result = json.loads(result_path.read_text(encoding="utf-8"))
    visual = json.loads(visual_path.read_text(encoding="utf-8"))
    canonical_program = json.dumps(
        program, ensure_ascii=False, sort_keys=True, separators=(",", ":"),
    ).encode("utf-8")
    program_sha256 = hashlib.sha256(canonical_program).hexdigest()
    assert result == {
        "schema": "retainpdf_page_program_result_v1",
        "status": "completed",
        "input_page_count": 3,
        "output_page_count": 4,
        "output_bytes": candidate.stat().st_size,
        "candidate_pdf_sha256": _sha256(candidate),
        "program_sha256": program_sha256,
        "visual_validation_sha256": _sha256(visual_path),
    }
    assert visual["schema"] == "retainpdf_visual_validation_v1"
    assert visual["valid"] is True
    assert visual["renderer"] == "pymupdf"
    assert visual["source_page_count"] == 3
    assert visual["candidate_page_count"] == visual["rendered_page_count"] == 4
    assert visual["mismatch_count"] == 0
    assert visual["mismatched_pages"] == []
    assert visual["source_pdf_sha256"] == _sha256(source)
    assert visual["candidate_pdf_sha256"] == _sha256(candidate)
    assert visual["program_sha256"] == program_sha256
    assert visual["expected_pixels_sha256"] == visual["candidate_pixels_sha256"]
    assert visual["duplicated_output_pages"] == 1
    assert visual["rotated_output_pages"] == 2
    assert visual["dropped_source_pages"] == 0
    plan_bytes = json.dumps([(2, 90), (1, 0), (1, 90), (0, 0)], separators=(",", ":")).encode()
    assert visual["page_plan_sha256"] == hashlib.sha256(plan_bytes).hexdigest()
    assert len(visual["page_geometry_sha256"]) == 64
    with pikepdf.open(candidate) as document:
        assert [int(page.obj.get("/Rotate", 0)) for page in document.pages] == [90, 90, 180, 0]
        assert [float(page.obj["/MediaBox"][2]) for page in document.pages] == [360, 420, 420, 300]
    with fitz.open(candidate) as document:
        assert [page.get_text().strip() for page in document] == [
            "CLI SOURCE PAGE 3", "CLI SOURCE PAGE 2", "CLI SOURCE PAGE 2", "CLI SOURCE PAGE 1",
        ]


@pytest.mark.parametrize("program", [
    [],
    {"schema": "retainpdf_page_program_v1", "steps": [{"op": "python", "code": "print(1)"}]},
])
def test_document_operation_cli_writes_failed_result_for_malformed_program(
    tmp_path: Path, program: object,
) -> None:
    completed, _source, candidate, result_path, visual_path = _run_operation(tmp_path, program)
    assert completed.returncode == 1, completed.stdout + completed.stderr
    result = json.loads(result_path.read_text(encoding="utf-8"))
    assert result["schema"] == "retainpdf_page_program_result_v1"
    assert result["status"] == "failed"
    assert result["error_code"] == "page_program_failed"
    assert result["detail"]
    assert not candidate.exists()
    assert not visual_path.exists()
    assert not list(result_path.parent.glob("*.tmp"))


def test_document_operation_help_remains_cold_without_ai_or_pdf_libraries(tmp_path: Path) -> None:
    probe = textwrap.dedent("""\
        import importlib.abc
        import sys
        class DenyHeavyImports(importlib.abc.MetaPathFinder):
            def find_spec(self, fullname, path=None, target=None):
                if fullname.split(".")[0] in {"retainpdf_ai", "fitz", "pymupdf", "pikepdf"}:
                    raise AssertionError("CLI help imported a runtime dependency: " + fullname)
                return None
        sys.meta_path.insert(0, DenyHeavyImports())
        from retainpdf_pipeline.entrypoints.console import main
        main(["document-operation", "--help"])
    """)
    completed = subprocess.run(
        [os.environ.get("RETAINPDF_PIPELINE_ONLY_PYTHON") or sys.executable, "-I", "-c", probe],
        cwd=tmp_path, capture_output=True, text=True, timeout=30, check=False,
    )
    assert completed.returncode == 0, completed.stdout + completed.stderr
    assert "--visual-validation" in completed.stdout
