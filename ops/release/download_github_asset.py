"""Download a public GitHub release asset through the binary asset API."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


def download_release_asset(repository: str, tag: str, name: str, destination: Path) -> None:
    api = f"https://api.github.com/repos/{repository}/releases"
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "PaperLoom-Release"}
    with urlopen(Request(f"{api}/tags/{quote(tag, safe='')}", headers=headers), timeout=60) as response:
        release = json.load(response)
    asset = next((item for item in release["assets"] if item["name"] == name), None)
    if asset is None:
        raise ValueError(f"GitHub release asset not found: {repository}@{tag}/{name}")
    headers["Accept"] = "application/octet-stream"
    request = Request(f"{api}/assets/{int(asset['id'])}", headers=headers)
    digest = hashlib.sha256()
    size = 0
    with urlopen(request, timeout=60) as response, destination.open("wb") as output:
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
