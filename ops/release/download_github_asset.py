"""Download a public GitHub release asset through the binary asset API."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import time
from urllib.error import HTTPError
from urllib.parse import quote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


class _StripCrossHostAuthRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if redirected is not None and urlsplit(newurl).netloc.lower() != urlsplit(req.full_url).netloc.lower():
            for header_name in list(redirected.headers):
                if header_name.lower() == "authorization":
                    redirected.remove_header(header_name)
        return redirected


urlopen = build_opener(_StripCrossHostAuthRedirectHandler).open
ASSET_PINS = json.loads(Path(__file__).with_name("github-assets.json").read_text(encoding="utf-8"))


def _github_token() -> str:
    return (
        os.environ.get("PAPERLOOM_GITHUB_TOKEN")
        or os.environ.get("GITHUB_TOKEN")
        or os.environ.get("GH_TOKEN")
        or ""
    ).strip()


def github_response(request: Request):
    for attempt in range(3):
        try:
            return urlopen(request, timeout=60)
        except HTTPError as error:
            if error.code not in (502, 503, 504) or attempt == 2:
                raise
            error.close()
            time.sleep(2 ** attempt)


def download_release_asset(repository: str, tag: str, name: str, destination: Path) -> None:
    api = f"https://api.github.com/repos/{repository}/releases"
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "PaperLoom-Release"}
    token = _github_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    asset = ASSET_PINS.get(repository, {}).get(tag, {}).get(name)
    if asset is None:
        with github_response(Request(f"{api}/tags/{quote(tag, safe='')}", headers=headers)) as response:
            release = json.load(response)
        asset = next((item for item in release["assets"] if item["name"] == name), None)
    if asset is None:
        raise ValueError(f"GitHub release asset not found: {repository}@{tag}/{name}")
    headers["Accept"] = "application/octet-stream"
    request = Request(f"{api}/assets/{int(asset['id'])}", headers=headers)
    digest = hashlib.sha256()
    size = 0
    with github_response(request) as response, destination.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
            digest.update(chunk)
            size += len(chunk)
    if size != asset["size"]:
        raise ValueError(f"GitHub asset size mismatch: {name}")
    if asset.get("digest") and asset["digest"] != f"sha256:{digest.hexdigest()}":
        raise ValueError(f"GitHub asset SHA-256 mismatch: {name}")
    print(f"Downloaded {name}: {size} bytes")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repository")
    parser.add_argument("tag")
    parser.add_argument("asset")
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    download_release_asset(args.repository, args.tag, args.asset, args.destination)


if __name__ == "__main__":
    main()
