"""Run a desktop build with GitHub release downloads served through the asset API."""
from __future__ import annotations

import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from threading import Thread
from urllib.error import URLError
from urllib.parse import unquote, urlsplit

from download_github_asset import download_release_asset


def create_asset_server(cache: Path) -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.serve_asset(body=True)

        def do_HEAD(self):
            self.serve_asset(body=False)

        def serve_asset(self, *, body: bool):
            path = unquote(urlsplit(self.path).path)
            match = re.fullmatch(
                r"/(electron/electron|electron-userland/electron-builder-binaries)/releases/download/([^/]+)/([^/]+)",
                path,
            )
            if match is None:
                self.send_error(404)
                return
            repository, tag, name = match.groups()
            target = cache / hashlib.sha256(path.encode()).hexdigest()
            if not target.exists():
                with tempfile.NamedTemporaryFile(dir=cache, delete=False) as temporary:
                    partial = Path(temporary.name)
                try:
                    download_release_asset(repository, tag, name, partial)
                    partial.replace(target)
                except (URLError, ValueError) as error:
                    self.log_error("GitHub download failed: %s", error)
                    self.send_error(502, "GitHub asset download failed")
                    return
                finally:
                    partial.unlink(missing_ok=True)
            self.send_response(200)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Length", str(target.stat().st_size))
            self.end_headers()
            if body:
                with target.open("rb") as source:
                    shutil.copyfileobj(source, self.wfile)

    return ThreadingHTTPServer(("127.0.0.1", 0), Handler)


def run_build(command: list[str]) -> int:
    with tempfile.TemporaryDirectory(prefix="paperloom-build-downloads-") as directory:
        with create_asset_server(Path(directory)) as server:
            thread = Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base = f"http://127.0.0.1:{server.server_port}"
            env = {**os.environ,
                   "ELECTRON_MIRROR": f"{base}/electron/electron/releases/download/",
                   "ELECTRON_BUILDER_BINARIES_MIRROR": f"{base}/electron-userland/electron-builder-binaries/releases/download/",
                   "ELECTRON_BUILDER_BINARIES_ALLOW_HTTP": "true"}
            no_proxy = ",".join(filter(None, [env.get("NO_PROXY") or env.get("no_proxy"), "127.0.0.1,localhost"]))
            env["NO_PROXY"] = env["no_proxy"] = no_proxy
            if os.name == "nt":
                command = [os.environ["COMSPEC"], "/d", "/s", "/c", subprocess.list2cmdline(command)]
            try:
                return subprocess.run(command, env=env, check=False).returncode
            finally:
                server.shutdown()
                thread.join()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("usage: build_with_github_assets.py <build command> [arguments]")
    raise SystemExit(run_build(sys.argv[1:]))
