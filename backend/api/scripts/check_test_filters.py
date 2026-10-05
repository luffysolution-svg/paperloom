#!/usr/bin/env python3
"""Verify the README's focused Rust test selections without executing tests.

Cargo may compile test binaries for --list. This never runs those tests or
contacts an API service, and rejects Cargo's otherwise-successful zero matches.
"""
from __future__ import annotations

from pathlib import Path
import re
import subprocess
import sys


WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
SELECTED_TESTS = (
    ("retain-jobs", "job_runner::process_runner::tests::execute_process_job_injects_provider_and_translation_envs"),
    ("rust_api", "api_tests::jobs_security::job_detail_and_events_routes_redact_secrets"),
)


def test_command(package: str, name: str, *, list_only: bool) -> list[str]:
    command = ["cargo", "test", "--locked", "-p", package, "--lib", name, "--", "--exact"]
    if list_only:
        command.append("--list")
    return command


def verify_selection(package: str, name: str, runner=None) -> list[str]:
    result = (runner or subprocess.run)(
        test_command(package, name, list_only=True),
        cwd=WORKSPACE_ROOT, text=True, capture_output=True, check=False,
    )
    if result.returncode:
        raise RuntimeError(f"{package}: cargo --list failed ({result.returncode})\n{result.stderr.strip()}")
    selected = re.findall(r"^(\S+): test$", result.stdout, flags=re.MULTILINE)
    if name not in selected:
        raise RuntimeError(f"{package}: test filter matched no expected test: {name}")
    return selected


def main() -> int:
    try:
        for package, name in SELECTED_TESTS:
            selected = verify_selection(package, name)
            print(f"{package}: {len(selected)} test selected: {name}")
    except (OSError, RuntimeError) as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
