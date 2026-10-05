"""Every publishing path must include the same tests and architecture gates."""
from pathlib import Path
import re

import pytest


WORKFLOWS = Path(__file__).resolve().parents[2] / "workflows"


def job(workflow: str, name: str) -> str:
    source = (WORKFLOWS / workflow).read_text()
    match = re.search(rf"^  {re.escape(name)}:\n(.*?)(?=^  [\w-]+:|\Z)", source, re.M | re.S)
    assert match is not None, f"missing {name} in {workflow}"
    return match.group(1)


@pytest.mark.parametrize("workflow", [
    "publish-current-web.yml", "release-desktop.yml", "release-docker.yml",
])
def test_publish_workflows_require_complete_tests(workflow):
    gate = job(workflow, "quality-gate")
    assert "uses: ./.github/workflows/tests.yml" in gate
    assert re.search(r"^    if:", gate, re.M) is None
    assert "secrets: inherit" not in gate


@pytest.mark.parametrize("workflow,build_job", [
    ("publish-current-web.yml", "publish-web"),
    ("release-desktop.yml", "build-windows-release"),
    ("release-desktop.yml", "build-linux-release"),
    ("release-desktop.yml", "build-macos-release"),
    ("release-docker.yml", "build"),
])
def test_build_and_publish_cannot_bypass_failed_tests(workflow, build_job):
    build = job(workflow, build_job)
    assert "    needs: quality-gate\n" in build
    # Step conditions are fine; a job-level override could bypass success().
    assert re.search(r"^    if:", build, re.M) is None
    assert re.search(r"^    continue-on-error:", build, re.M) is None


def test_tests_include_reusable_architecture_gate():
    assert "uses: ./.github/workflows/rust-api-architecture.yml" in job("tests.yml", "architecture")
    source = (WORKFLOWS / "rust-api-architecture.yml").read_text()
    assert "  workflow_call: {}" in source
    assert 'python3 "$RETAIN_PDF_SERVICES_ROOT/api/scripts/check_architecture.py"' in source
    assert 'python3 "$RETAIN_PDF_SERVICES_ROOT/pipeline/devtools/check_pipeline_architecture.py"' in source


@pytest.mark.parametrize("workflow", ["tests.yml", "rust-api-architecture.yml"])
def test_tag_quality_gates_are_not_cancelled_by_other_release_runs(workflow):
    source = (WORKFLOWS / workflow).read_text()
    assert "cancel-in-progress: ${{ github.ref_type != 'tag' }}" in source
