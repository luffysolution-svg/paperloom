#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path


EXPERIMENT_ROOT = Path(__file__).resolve().parents[1]
RUNS_ROOT = EXPERIMENT_ROOT / "runs"
TYPST_CASES_ROOT = EXPERIMENT_ROOT / "typst-cases"


def _copy_file(src: Path, dst: Path) -> None:
    if not src.exists():
        raise FileNotFoundError(src)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def export_typst_case(run_id: str, *, output_name: str = "", overwrite: bool = False) -> Path:
    run_root = RUNS_ROOT / run_id
    if not run_root.exists():
        raise FileNotFoundError(f"run not found: {run_root}")

    name = output_name.strip() or run_id
    output_root = TYPST_CASES_ROOT / name
    if output_root.exists() and not overwrite:
        raise FileExistsError(f"typst case already exists: {output_root}")
    if output_root.exists():
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True)

    typst_root = run_root / "job/rendered/typst"
    overlay_typ = typst_root / "book-overlays/book-overlay.typ"
    overlay_pdf = typst_root / "book-overlays/book-overlay.pdf"
    prebuilt_typ = typst_root / "book-overlay-sources/book-overlay.typ.prebuilt"
    report_path = run_root / "report.json"

    _copy_file(overlay_typ, output_root / "book-overlay.typ")
    _copy_file(prebuilt_typ, output_root / "book-overlay.typ.prebuilt")
    if overlay_pdf.exists():
        _copy_file(overlay_pdf, output_root / "book-overlay.pdf")
    if report_path.exists():
        _copy_file(report_path, output_root / "source-run-report.json")

    metadata = {
        "schema_version": "retainpdf.typst_case.v1",
        "source_run_id": run_id,
        "typst_case_id": name,
        "source_run_root": str(run_root.resolve()),
        "source_files": {
            "overlay_typ": str(overlay_typ.resolve()),
            "prebuilt_typ": str(prebuilt_typ.resolve()),
            "overlay_pdf": str(overlay_pdf.resolve()) if overlay_pdf.exists() else "",
            "report": str(report_path.resolve()) if report_path.exists() else "",
        },
        "files": {
            "overlay_typ": "book-overlay.typ",
            "prebuilt_typ": "book-overlay.typ.prebuilt",
            "overlay_pdf": "book-overlay.pdf" if overlay_pdf.exists() else "",
            "source_run_report": "source-run-report.json" if report_path.exists() else "",
        },
    }
    (output_root / "typst-case.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(output_root)
    return output_root


def main() -> None:
    parser = argparse.ArgumentParser(description="Export Typst overlay artifacts from a render benchmark run.")
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--output-name", default="")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    export_typst_case(args.run_id, output_name=args.output_name, overwrite=args.overwrite)


if __name__ == "__main__":
    main()
