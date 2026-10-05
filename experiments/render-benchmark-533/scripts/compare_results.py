#!/usr/bin/env python3
"""Compare benchmark results between baseline and optimized runs."""

import json
import sys
from pathlib import Path


def load_report(run_id: str) -> dict:
    """Load benchmark report."""
    report_path = Path(__file__).parent.parent / "runs" / run_id / "report.json"
    if not report_path.exists():
        raise FileNotFoundError(f"Report not found: {report_path}")
    return json.loads(report_path.read_text())


def compare_reports(baseline_id: str, optimized_id: str):
    """Compare two benchmark reports."""
    baseline = load_report(baseline_id)
    optimized = load_report(optimized_id)

    print(f"=== Benchmark Comparison: {baseline_id} vs {optimized_id} ===\n")

    # Overall metrics
    baseline_time = baseline["render_elapsed_seconds"]
    optimized_time = optimized["render_elapsed_seconds"]
    improvement = baseline_time - optimized_time
    improvement_pct = (improvement / baseline_time) * 100

    print(f"Overall Performance:")
    print(f"  Baseline:  {baseline_time:.2f}s")
    print(f"  Optimized: {optimized_time:.2f}s")
    print(f"  Improvement: {improvement:.2f}s ({improvement_pct:.1f}%)")
    print()

    # Detailed breakdown
    print("Detailed Breakdown:")
    baseline_diag = baseline["render_diagnostics"]
    optimized_diag = optimized["render_diagnostics"]

    metrics = [
        ("payload_prepare", "Payload Prepare"),
        ("typst_source_prepare", "Typst Source Prepare"),
        ("compile", "Typst Compile"),
        ("overlay_merge", "PDF Merge"),
    ]

    for key, label in metrics:
        key_full = f"{key}_elapsed_seconds"
        baseline_val = baseline_diag.get(key_full, 0.0)
        optimized_val = optimized_diag.get(key_full, 0.0)
        diff = baseline_val - optimized_val
        diff_pct = (diff / baseline_val * 100) if baseline_val > 0 else 0

        print(f"  {label}:")
        print(f"    Baseline:  {baseline_val:.2f}s")
        print(f"    Optimized: {optimized_val:.2f}s")
        print(f"    Improvement: {diff:+.2f}s ({diff_pct:+.1f}%)")

    print()
    print(f"Success: baseline={baseline['success']}, optimized={optimized['success']}")
    print(f"Pages: baseline={baseline['pages_processed']}, optimized={optimized['pages_processed']}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: compare_results.py <baseline_run_id> <optimized_run_id>")
        sys.exit(1)

    compare_reports(sys.argv[1], sys.argv[2])
