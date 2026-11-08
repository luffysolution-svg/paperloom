import hashlib
import importlib.util
import io
import json
from pathlib import Path
from urllib.error import HTTPError

import pytest


SPEC = importlib.util.spec_from_file_location(
    "download_github_asset", Path(__file__).resolve().parents[1] / "download_github_asset.py"
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


@pytest.fixture
def github(monkeypatch):
    content = b"verified Typst archive"
    asset = {"id": 123, "name": "typst.zip", "size": len(content),
             "digest": f"sha256:{hashlib.sha256(content).hexdigest()}"}
    release = {"assets": [asset]}
    requests = []

    def urlopen(request, timeout):
        requests.append(request)
        if len(requests) == 1:
            return io.BytesIO(json.dumps(release).encode())
        return io.BytesIO(content)

    monkeypatch.setattr(MODULE, "urlopen", urlopen)
    monkeypatch.setattr(MODULE.time, "sleep", lambda _seconds: None)
    return content, asset, release, requests


def test_download_uses_release_api_and_binary_accept_header(tmp_path, github):
    content, _asset, _release, requests = github
    target = tmp_path / "typst.zip"
    MODULE.download_release_asset("typst/typst", "v0.15.1", "typst.zip", target)
    assert target.read_bytes() == content
    assert [request.full_url for request in requests] == [
        "https://api.github.com/repos/typst/typst/releases/tags/v0.15.1",
        "https://api.github.com/repos/typst/typst/releases/assets/123",
    ]
    assert [request.get_header("Accept") for request in requests] == [
        "application/vnd.github+json", "application/octet-stream",
    ]


def test_missing_asset_stops_before_creating_output(tmp_path, github):
    _content, _asset, release, requests = github
    release["assets"] = []
    target = tmp_path / "typst.zip"
    with pytest.raises(ValueError, match="asset not found"):
        MODULE.download_release_asset("typst/typst", "v0.15.1", "typst.zip", target)
    assert not target.exists()
    assert len(requests) == 1


@pytest.mark.parametrize("field,value,message", [
    ("size", 100, "size mismatch"),
    ("digest", "sha256:" + "0" * 64, "SHA-256 mismatch"),
])
def test_incomplete_or_corrupted_asset_fails(tmp_path, github, field, value, message):
    _content, asset, _release, _requests = github
    asset[field] = value
    with pytest.raises(ValueError, match=message):
        MODULE.download_release_asset("typst/typst", "v0.15.1", "typst.zip", tmp_path / "typst.zip")


@pytest.mark.parametrize("stage", ["metadata", "binary"])
def test_http_error_never_becomes_an_archive(tmp_path, github, monkeypatch, stage):
    original = MODULE.urlopen

    def fail(request, timeout):
        if stage == "metadata" or "/assets/" in request.full_url:
            raise HTTPError(request.full_url, 504, "Gateway Timeout", None, None)
        return original(request, timeout)

    monkeypatch.setattr(MODULE, "urlopen", fail)
    target = tmp_path / "typst.zip"
    with pytest.raises(HTTPError):
        MODULE.download_release_asset("typst/typst", "v0.15.1", "typst.zip", target)
    assert not target.exists()


def test_pinned_asset_skips_release_lookup(tmp_path, github, monkeypatch):
    content, asset, _release, _requests = github
    monkeypatch.setattr(MODULE, "ASSET_PINS", {"typst/typst": {"v0.15.1": {"typst.zip": asset}}})
    urls = []

    def binary(request, timeout):
        urls.append(request.full_url)
        return io.BytesIO(content)

    monkeypatch.setattr(MODULE, "urlopen", binary)
    target = tmp_path / "typst.zip"
    MODULE.download_release_asset("typst/typst", "v0.15.1", "typst.zip", target)
    assert target.read_bytes() == content
    assert urls == ["https://api.github.com/repos/typst/typst/releases/assets/123"]


@pytest.mark.parametrize("status,expected_attempts", [(502, 3), (503, 3), (504, 3), (403, 1), (404, 1)])
def test_api_retries_are_bounded(tmp_path, github, monkeypatch, status, expected_attempts):
    attempts = []

    def fail(request, timeout):
        attempts.append(request.full_url)
        raise HTTPError(request.full_url, status, "failure", None, None)

    monkeypatch.setattr(MODULE, "urlopen", fail)
    with pytest.raises(HTTPError):
        MODULE.download_release_asset("typst/typst", "v0.15.1", "typst.zip", tmp_path / "typst.zip")
    assert len(attempts) == expected_attempts


def test_api_recovers_from_a_temporary_gateway_failure(tmp_path, github, monkeypatch):
    content, _asset, _release, requests = github
    original = MODULE.urlopen
    failed = False

    def temporary(request, timeout):
        nonlocal failed
        if not failed:
            failed = True
            raise HTTPError(request.full_url, 504, "Gateway Timeout", None, None)
        return original(request, timeout)

    monkeypatch.setattr(MODULE, "urlopen", temporary)
    target = tmp_path / "typst.zip"
    MODULE.download_release_asset("typst/typst", "v0.15.1", "typst.zip", target)
    assert target.read_bytes() == content
    assert len(requests) == 2
