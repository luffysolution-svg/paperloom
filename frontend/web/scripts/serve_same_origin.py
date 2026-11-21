#!/usr/bin/env python3
"""Serve the web frontend and the Rust API from a single origin.

Static files, cache headers and the frontend's own ``/health`` still come from
``serve_static``; this script adds forwarding of ``/api/*`` to the Rust API so
the browser never needs to reach the API port.

Why one origin: under WSL2, localhost forwarding can fail per port — the
frontend port forwards to Windows while the API port does not — which leaves
the Windows browser unable to reach ``http://127.0.0.1:<api-port>`` even though
the API answers inside the distro. Serving both from one port sidesteps the
forwarding entirely and keeps the API same-origin (no CORS).

Two behaviours differ from ``serve_static`` on purpose:

* ``apiBase`` is pinned to this origin when the runtime-config scripts are
  served. Keeping the configured value (``http://<host>:41000`` by default)
  would send the browser straight at the API port and defeat the whole point.
* ``X-API-Key`` is injected while forwarding, not written into the browser's
  runtime-config, so a request that already carries a key still wins and
  nothing has to be configured in the page.

Settings (flags win over the environment)
    --host / --port / --root   as in ``serve_static.py``
    --api-base                 Rust API root, default ``http://127.0.0.1:41000``
    --api-key                  ``X-API-Key`` to add when the request carries none
"""

from __future__ import annotations

import argparse
import functools
import http.server
import importlib.util
import json
import os
import shutil
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[2]

CONFIG_PATHS = frozenset({"/runtime-config.js", "/runtime-config.local.js"})

# 逐跳头不透传，由本进程重新生成；content-length 不在其中。
HOP_BY_HOP = frozenset({
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
})

# 这两个由本进程自己发（send_response 已经发了一份），透传上游的就会变成两份。
PROXY_OWN_HEADERS = frozenset({"server", "date"})


def _has_response_body(command: str, status: int) -> bool:
    """这些响应按规范没有响应体，代理不能替它们写 chunked 结尾。

    1xx / 204 / 304 与 HEAD 的响应都没有体。若照常写出 `0\\r\\n\\r\\n`，浏览器
    不会去读这几个字节，它们会留在 keep-alive 连接上，被当成**下一个响应**的
    开头 —— 下一个响应于是成了坏响应。
    """
    return command != "HEAD" and status >= 200 and status not in (204, 304)


def load_serve_static():
    """Import the sibling ``serve_static.py`` without requiring it on sys.path."""
    spec = importlib.util.spec_from_file_location(
        "retain_serve_static", HERE / "serve_static.py"
    )
    if spec is None or spec.loader is None:
        raise SystemExit(f"cannot load serve_static.py from {HERE}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def first_api_key_from_auth(path: Path) -> str:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return ""
    keys = payload.get("api_keys")
    if isinstance(keys, list) and keys:
        return str(keys[0]).strip()
    return ""


def resolve_api_key(cli_value: str) -> str:
    """Resolve the backend key. Mirrors serve_static's precedence, then adds
    ``RUST_API_KEYS`` (what ``ops/development/dev.sh`` exports and
    ``dev_stack.py`` configures) and the repository's own
    ``backend/api/auth.local.json``."""
    for name in ("RETAIN_PDF_PROXY_API_KEY", "RETAIN_PDF_FRONTEND_X_API_KEY"):
        value = os.environ.get(name, "").strip()
        if value:
            return value
    if cli_value:
        return cli_value
    from_env_keys = os.environ.get("RUST_API_KEYS", "").strip()
    if from_env_keys:
        return from_env_keys.split(",")[0].strip()
    return first_api_key_from_auth(REPO_ROOT / "backend" / "api" / "auth.local.json")


def build_handler(serve_static, api_base: str, api_key: str):
    class SameOriginHandler(serve_static.FrontendRequestHandler):
        """Static assets from ``serve_static``, ``/api/*`` forwarded upstream."""

        def _api_path(self) -> str:
            path = urllib.parse.urlsplit(self.path).path
            if path == "/api" or path.startswith("/api/"):
                return path
            return ""

        def _serve_runtime_config(self, path: str) -> None:
            """Serve a runtime-config with ``apiBase`` pinned to this origin.

            The disk file is kept as-is — only ``apiBase`` is overridden, and
            only here: in same-origin mode the browser must talk to this
            process, or the WSL2 port problem simply moves to the API port.
            """
            disk = Path(self.directory).resolve() / path.lstrip("/")
            chunks = []
            if disk.is_file():
                chunks.append(disk.read_text(encoding="utf-8"))
            else:
                chunks.append("window.__FRONT_RUNTIME_CONFIG__ = {};\n")
            chunks.append(
                "(function () {\n"
                "  var c = window.__FRONT_RUNTIME_CONFIG__ = "
                "window.__FRONT_RUNTIME_CONFIG__ || {};\n"
                "  c.apiBase = window.location.origin;\n"
                "})();\n"
            )
            script = "".join(chunks).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            # Cache-Control 不在这里发：这两个路径 serve_static.end_headers 已经
            # 特判成 no-store，自己再来一份就成了重复头。
            self.send_header("Content-Length", str(len(script)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(script)

        def end_headers(self) -> None:
            """转发 API 时不要 serve_static 那层缓存头。

            serve_static 会给「没单独列出的路径」加 `public, max-age=3600`，
            而 `/api/v1/...` 正落在这一类里。套到任务列表 / 任务详情上，浏览器
            会拿缓存顶一个小时：进度看着一直不动，新建的任务也不出现。上游
            自己发的 Cache-Control 照常透传，这里只是不额外加。
            """
            if self._api_path():
                http.server.BaseHTTPRequestHandler.end_headers(self)
                return
            super().end_headers()

        def _forward(self) -> None:
            length = int(self.headers.get("Content-Length") or 0)
            body = self.rfile.read(length) if length > 0 else None

            request = urllib.request.Request(api_base + self.path, data=body, method=self.command)
            for name, value in self.headers.items():
                lowered = name.lower()
                if lowered in HOP_BY_HOP or lowered in ("host", "x-api-key"):
                    continue
                request.add_header(name, value)
            # 前端已带 key 时尊重它（设置页可能配了另一把），缺失才补。
            client_key = self.headers.get("X-API-Key")
            if client_key:
                request.add_header("X-API-Key", client_key)
            elif api_key:
                request.add_header("X-API-Key", api_key)

            try:
                response = urllib.request.urlopen(request, timeout=3600)
            except urllib.error.HTTPError as exc:
                response = exc
            except Exception as exc:  # noqa: BLE001 - 代理兜底，报 502
                self._send_plain(502, f"proxy error: {exc}")
                return

            with response:
                status = getattr(response, "status", None) or response.code
                # content-length、Server、Date 单独处理，其余照透传。
                headers = [
                    (name, value)
                    for name, value in response.headers.items()
                    if name.lower() not in HOP_BY_HOP
                    and name.lower() not in PROXY_OWN_HEADERS
                    and name.lower() != "content-length"
                ]
                declared = response.headers.get("Content-Length")
                if not _has_response_body(self.command, status):
                    # 没有响应体：既不能加 Transfer-Encoding，也不能写结尾 chunk，
                    # 否则那几个字节会污染这条连接上的下一个响应（见 _has_response_body）。
                    extra = [("Content-Length", declared)] if declared is not None else []
                    self._send_headers(status, headers + extra)
                    return
                if declared is not None:
                    self._send_headers(status, headers + [("Content-Length", declared)])
                    # 长度已知：流式转发，避免大 PDF / ZIP 全量进内存。
                    shutil.copyfileobj(response, self.wfile, 64 * 1024)
                    return
                self._send_headers(status, headers + [("Transfer-Encoding", "chunked")])
                # 长度未知：边到边发，**不能**先读完再发。后端有两处是长连接、边生成
                # 边推送的 SSE —— 实时翻译事件流（routes/jobs/progress.rs）
                # 和阅读助手的流式回答（retainpdf-ai 的 api.rs）。整段缓冲会让浏览器在
                # 这两处一直收不到东西，直到 3600 秒超时，阅读助手也不再逐字显示。
                # 自己按 chunked 重新分帧（上游的 transfer-encoding 已在逐跳头里剥掉），
                # 这样仍是 HTTP/1.1 keep-alive，不必靠关连接来标记结束。
                while True:
                    chunk = response.read1(64 * 1024)
                    if not chunk:
                        break
                    self.wfile.write(b"%x\r\n" % len(chunk) + chunk + b"\r\n")
                    self.wfile.flush()
                self.wfile.write(b"0\r\n\r\n")
                self.wfile.flush()

        def _send_headers(self, status: int, headers) -> None:
            self.send_response(status)
            for name, value in headers:
                self.send_header(name, value)
            self.end_headers()

        def _send_plain(self, status: int, message: str) -> None:
            payload = message.encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def _dispatch(self) -> None:
            if self._api_path():
                self._forward()
                return
            config_path = urllib.parse.urlsplit(self.path).path
            if config_path in CONFIG_PATHS:
                self._serve_runtime_config(config_path)
                return
            delegate = getattr(super(SameOriginHandler, self), "do_" + self.command, None)
            if delegate is None:
                self.send_error(501, "Unsupported method (%r)" % self.command)
                return
            delegate()

        do_GET = _dispatch
        do_HEAD = _dispatch
        do_POST = _dispatch
        do_PUT = _dispatch
        do_PATCH = _dispatch
        do_DELETE = _dispatch
        do_OPTIONS = _dispatch

    return SameOriginHandler


def parse_args(argv=None) -> argparse.Namespace:
    serve_static = load_serve_static()
    parser = argparse.ArgumentParser(
        description="Serve the Retain PDF frontend and the Rust API on one origin.",
    )
    parser.add_argument("--host", default=serve_static.DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=serve_static.DEFAULT_PORT)
    parser.add_argument("--root", default=str(REPO_ROOT / "frontend" / "web"))
    parser.add_argument(
        "--api-base",
        default=os.environ.get("RETAIN_PDF_PROXY_API_BASE", "http://127.0.0.1:41000"),
    )
    parser.add_argument("--api-key", default="")
    return parser, serve_static, parser.parse_args(argv)


def main(argv=None) -> int:
    parser, serve_static, args = parse_args(argv)

    root = Path(args.root).resolve()
    if not root.exists():
        parser.error(f"frontend root does not exist: {root}")

    api_base = args.api_base.rstrip("/")
    api_key = resolve_api_key(args.api_key)
    handler = build_handler(serve_static, api_base, api_key)

    print(f"[same-origin] frontend {root}", flush=True)
    print(f"[same-origin] /api/* -> {api_base}", flush=True)
    print(
        "[same-origin] X-API-Key "
        + ("resolved; injected when the request omits it" if api_key else "not found; pass --api-key"),
        flush=True,
    )

    with serve_static.ThreadingHTTPServer(
        (args.host, args.port), functools.partial(handler, directory=str(root))
    ) as httpd:
        print(f"[same-origin] listening on http://{args.host}:{args.port}", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
