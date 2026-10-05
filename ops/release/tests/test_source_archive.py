"""Offline checks for the aggregate backend source delivery contract."""
from __future__ import annotations

import importlib.util
import io
import json
import fnmatch
from pathlib import Path
import sys
import tarfile

import pytest

RELEASE_ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("build_source_archive", RELEASE_ROOT / "build_source_archive.py")
assert spec and spec.loader
archive_tool = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = archive_tool
spec.loader.exec_module(archive_tool)


def make_archive(path: Path, *, omit: str = "", extra: str = "") -> dict:
    provenance = {"schema": "retainpdf_backend_source_v1", "version": "test"}
    with tarfile.open(path, "w:gz") as archive:
        files = {name: b"fixture" for name in archive_tool.REQUIRED_FILES if name != omit}
        files["SOURCE.json"] = json.dumps(provenance).encode()
        if extra:
            files[extra] = b"unsafe"
        for name, payload in files.items():
            member = tarfile.TarInfo("source/" + name)
            member.size = len(payload)
            archive.addfile(member, io.BytesIO(payload))
    return provenance


def test_aggregate_archive_accepts_required_layout(tmp_path: Path) -> None:
    path = tmp_path / "source.tar.gz"
    provenance = make_archive(path)
    archive_tool._validate_archive(path, prefix="source/", provenance=provenance)


@pytest.mark.parametrize("missing", ["Cargo.toml", "backend/api/Cargo.toml", "resources/fonts/LICENSE-OFL-1.1.txt"])
def test_aggregate_archive_rejects_missing_components(tmp_path: Path, missing: str) -> None:
    path = tmp_path / "source.tar.gz"
    provenance = make_archive(path, omit=missing)
    with pytest.raises(RuntimeError, match="incomplete"):
        archive_tool._validate_archive(path, prefix="source/", provenance=provenance)


def test_archive_rejects_parent_traversal(tmp_path: Path) -> None:
    path = tmp_path / "source.tar.gz"
    provenance = make_archive(path, extra="../escape")
    with pytest.raises(RuntimeError, match="unsafe"):
        archive_tool._validate_archive(path, prefix="source/", provenance=provenance)


def test_archive_scope_excludes_runtime_data_and_frontend() -> None:
    assert "backend" in archive_tool.ARCHIVE_PATHS
    assert "database" in archive_tool.ARCHIVE_PATHS
    assert "Cargo.lock" in archive_tool.ARCHIVE_PATHS
    assert not {"data", "var", "frontend"}.intersection(archive_tool.ARCHIVE_PATHS)


def test_archive_includes_inputs_needed_to_build_the_backend_docker_image() -> None:
    root = RELEASE_ROOT.parents[1]
    dockerfile = (root / "ops/deployment/docker/backend/Dockerfile.app").read_text(encoding="utf-8")
    sources = []
    for line in dockerfile.splitlines():
        if line.startswith("COPY ") and not line.startswith("COPY --from="):
            sources.extend(line.split()[1:-1])
    missing = [
        source for source in sources
        if not any(
            source == scope or source.startswith(scope + "/") or fnmatch.fnmatchcase(source, scope)
            for scope in archive_tool.ARCHIVE_PATHS
        )
    ]
    assert missing == [], f"Backend source archive cannot build its Dockerfile: {missing}"


def test_archive_keeps_first_party_and_dependency_license_inputs() -> None:
    for source in (
        "LICENSE",
        "LICENSE-MIT",
        "THIRD_PARTY_NOTICES.md",
        "CORRESPONDING_SOURCE.md",
        "resources/licenses",
    ):
        assert source in archive_tool.ARCHIVE_PATHS


def test_desktop_release_attaches_complete_corresponding_source() -> None:
    workflow = (RELEASE_ROOT.parents[1] / ".github/workflows/release-desktop.yml").read_text(
        encoding="utf-8"
    )
    assert "PaperLoom-${version}-source.tar.gz" in workflow
    assert "PyMuPDF-1.26.5-source.tar.gz" in workflow
    assert "8ef335e07f648492df240f2247854d0e7c0467afb9c4dc2376ec30978ec158c3" in workflow
    assert "sha256sum --check --strict" in workflow
    assert "release-assets/CORRESPONDING_SOURCE.md" in workflow


def test_network_ui_and_images_offer_agpl_source() -> None:
    root = RELEASE_ROOT.parents[1]
    top_bar = (root / "frontend/web/src/app/home/shell/AppTopBar.tsx").read_text(
        encoding="utf-8"
    )
    docker_workflow = (root / ".github/workflows/release-docker.yml").read_text(
        encoding="utf-8"
    )
    assert "https://github.com/luffysolution-svg/paperloom" in top_bar
    assert "对应源码（AGPL-3.0）" in top_bar
    assert "org.opencontainers.image.source=https://github.com/${{ github.repository }}" in docker_workflow
    assert "org.opencontainers.image.licenses=AGPL-3.0-only" in docker_workflow

def test_docker_release_separates_manifest_platforms_from_image_config() -> None:
    workflow = (RELEASE_ROOT.parents[1] / ".github/workflows/release-docker.yml").read_text(
        encoding="utf-8"
    )
    assert "--format '{{json .Manifest}}'" in workflow
    assert "--format '{{json .Image}}'" in workflow
    assert 'docker-candidates/${target}-manifest.json' in workflow
    assert 'docker-candidates/${target}-image.json' in workflow
    assert '.manifests[]' in workflow
    assert "jq -r 'keys[]'" not in workflow
