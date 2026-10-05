"""Python package versions must stay aligned with the release tag.

pipeline and the backend workspace share one version; ai-service is
versioned independently and is intentionally excluded.
"""

import re
import tomllib
from pathlib import Path

import pytest


SERVICES_ROOT = Path(__file__).resolve().parents[3]
WORKSPACE_VERSION = tomllib.loads(
    (SERVICES_ROOT / "pyproject.toml").read_text(encoding="utf-8")
)["project"]["version"]


def _member_version(member: str) -> str:
    return tomllib.loads(
        (SERVICES_ROOT / member / "pyproject.toml").read_text(encoding="utf-8")
    )["project"]["version"]


def test_pipeline_version_matches_workspace() -> None:
    assert _member_version("pipeline") == WORKSPACE_VERSION


def test_workspace_version_matches_release_tag() -> None:
    import subprocess

    proc = subprocess.run(
        ["git", "describe", "--tags", "--exact-match", "HEAD"],
        capture_output=True,
        text=True,
        cwd=SERVICES_ROOT.parent,
    )
    tag = proc.stdout.strip()
    if proc.returncode != 0 or not tag:
        pytest.skip("HEAD is not a tagged release; member alignment is checked separately")
    # Delivery tags can carry hotfix/prerelease/build labels while the Python
    # workspace keeps the shared numeric package version.
    assert _release_base_version(tag) == WORKSPACE_VERSION, (
        f"workspace {WORKSPACE_VERSION} != release tag {tag}"
    )


def _release_base_version(tag: str) -> str:
    match = re.fullmatch(r"v?(\d+\.\d+\.\d+)(?:[-+][0-9A-Za-z.+-]+)?", tag)
    assert match is not None, f"invalid release version tag: {tag}"
    return match[1]


@pytest.mark.parametrize("tag", ["4.2.2", "v4.2.2", "v4.2.2-hotfix-4", "4.2.2-rc.1+build.2"])
def test_release_base_version_accepts_delivery_labels(tag: str) -> None:
    assert _release_base_version(tag) == "4.2.2"


def test_wheel_data_files_covered() -> None:
    """Non-code data (prompts, schemas) must be declared in package-data,
    or the installed wheel silently misses them at runtime."""
    pyproject = tomllib.loads(
        (SERVICES_ROOT / "pipeline" / "pyproject.toml").read_text(encoding="utf-8")
    )
    package_data = pyproject["tool"]["setuptools"]["package-data"]
    flat = ["/".join(key.split(".")[-2:]) for key in package_data]
    assert any("translate/prompts" in entry for entry in flat)
    assert any("document_schema" in entry for entry in flat)
    prompts_dir = SERVICES_ROOT / "pipeline" / "retainpdf_pipeline" / "translate" / "prompts"
    assert any(prompts_dir.glob("*.txt")), "prompts dir has no txt to ship"
