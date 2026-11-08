import importlib.util
import json
import os
from pathlib import Path
import sys
from threading import Thread
from urllib.error import HTTPError
from urllib.request import urlopen

import pytest


RELEASE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RELEASE_ROOT))
SPEC = importlib.util.spec_from_file_location("build_with_github_assets", RELEASE_ROOT / "build_with_github_assets.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


@pytest.fixture
def asset_server(tmp_path, monkeypatch):
    calls = []

    def download(repository, tag, name, destination):
        calls.append((repository, tag, name))
        destination.write_bytes(b"verified asset")

    monkeypatch.setattr(MODULE, "download_release_asset", download)
    with MODULE.create_asset_server(tmp_path) as server:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{server.server_port}", calls
        finally:
            server.shutdown()
            thread.join()


@pytest.mark.parametrize("repository,tag,name", [
    ("electron/electron", "v44.4.3", "SHASUMS256.txt"),
    ("electron-userland/electron-builder-binaries", "7zip%401.0.0", "7zip-win-x64.tar.gz"),
])
def test_mirror_downloads_official_assets_and_reuses_verified_files(asset_server, repository, tag, name):
    base, calls = asset_server
    for _ in range(2):
        with urlopen(f"{base}/{repository}/releases/download/{tag}/{name}") as response:
            assert response.read() == b"verified asset"
            assert response.headers["Content-Length"] == "14"
    assert calls == [(repository, tag.replace("%40", "@"), name)]


def test_foreign_repositories_and_file_paths_are_rejected(asset_server):
    base, calls = asset_server
    for path in ("/other/repository/releases/download/v1/payload", "/etc/passwd"):
        with pytest.raises(HTTPError) as error:
            urlopen(base + path)
        assert error.value.code == 404
    assert calls == []


def test_failed_verification_never_caches_a_partial_asset(asset_server, monkeypatch):
    base, calls = asset_server
    original = MODULE.download_release_asset

    def fail(repository, tag, name, destination):
        destination.write_bytes(b"partial")
        raise ValueError("SHA-256 mismatch")

    monkeypatch.setattr(MODULE, "download_release_asset", fail)
    url = f"{base}/electron/electron/releases/download/v44.4.3/SHASUMS256.txt"
    with pytest.raises(HTTPError) as error:
        urlopen(url)
    assert error.value.code == 502
    monkeypatch.setattr(MODULE, "download_release_asset", original)
    with urlopen(url) as response:
        assert response.read() == b"verified asset"
    assert len(calls) == 1


def test_build_receives_mirror_and_preserves_its_exit_status(tmp_path, monkeypatch):
    def download(_repository, _tag, _name, destination):
        destination.write_bytes(b"verified checksum")

    monkeypatch.setattr(MODULE, "download_release_asset", download)
    previous = os.environ.get("ELECTRON_MIRROR")
    output = tmp_path / "child.json"
    child = tmp_path / "child.py"
    child.write_text("""import json, os, pathlib, sys
from urllib.request import urlopen
with urlopen(os.environ['ELECTRON_MIRROR'] + 'v44.4.3/SHASUMS256.txt') as response:
    value = response.read().decode()
pathlib.Path(sys.argv[1]).write_text(json.dumps({'download': value, 'builder': os.environ['ELECTRON_BUILDER_BINARIES_MIRROR']}))
sys.exit(7)
""", encoding="utf-8")
    assert MODULE.run_build([sys.executable, str(child), str(output)]) == 7
    result = json.loads(output.read_text())
    assert result["download"] == "verified checksum"
    assert result["builder"].endswith("/electron-userland/electron-builder-binaries/releases/download/")
    assert os.environ.get("ELECTRON_MIRROR") == previous
