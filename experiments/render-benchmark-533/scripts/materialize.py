#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
from pathlib import Path


EXPERIMENT_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = EXPERIMENT_ROOT.parents[1]
CASE_JSON = EXPERIMENT_ROOT / "case.json"
DEFAULT_OUTPUT_ROOT = EXPERIMENT_ROOT / "case-data"


def _load_case() -> dict:
    return json.loads(CASE_JSON.read_text(encoding="utf-8"))


def _link_or_copy_file(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        dst.unlink()
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def _copy_tree(src: Path, dst: Path) -> None:
    if not src.exists():
        return
    for path in src.rglob("*"):
        rel = path.relative_to(src)
        target = dst / rel
        if path.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        elif path.is_file():
            _link_or_copy_file(path, target)


def _rewrite_prewarm_manifest(case_root: Path) -> None:
    manifest_path = case_root / "artifacts/render_prewarm/render_source_prewarm_manifest.json"
    source_pdf = case_root / "source/Quantum-Chemistry-&-Spectroscopy-by-Thomas-Engel.pdf"
    if not manifest_path.exists() or not source_pdf.exists():
        return
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    fingerprint = dict(manifest.get("fingerprint") or {})
    stat = source_pdf.stat()
    fingerprint["source_pdf_path"] = str(source_pdf.resolve())
    fingerprint["source_pdf_size"] = int(stat.st_size)
    fingerprint["source_pdf_mtime_ns"] = int(stat.st_mtime_ns)
    manifest["fingerprint"] = fingerprint
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def materialize(output_root: Path, *, overwrite: bool = False) -> Path:
    case = _load_case()
    source_job_root = (REPO_ROOT / case["source_job_root"]).resolve()
    case_root = output_root / case["case_id"] / "job"

    if case_root.exists() and overwrite:
        shutil.rmtree(case_root)
    case_root.mkdir(parents=True, exist_ok=True)

    required_dirs = [
        "source",
        "translated",
        "specs",
        "ocr/normalized",
        "artifacts/render_prewarm",
    ]
    for rel_dir in required_dirs:
        _copy_tree(source_job_root / rel_dir, case_root / rel_dir)
    _rewrite_prewarm_manifest(case_root)

    manifest = {
        "schema_version": "retainpdf.render_benchmark_materialized.v1",
        "case_id": case["case_id"],
        "source_job_root": str(source_job_root),
        "case_root": str(case_root),
        "link_strategy": "hardlink_or_copy",
    }
    (case_root / "benchmark-materialized.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return case_root


def main() -> None:
    parser = argparse.ArgumentParser(description="Materialize the 533-page render benchmark case.")
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    case_root = materialize(args.output_root.resolve(), overwrite=args.overwrite)
    print(case_root)


if __name__ == "__main__":
    main()
