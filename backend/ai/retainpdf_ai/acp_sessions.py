"""Warm ACP processes with a session-owned MCP endpoint and turn-owned tools."""
from __future__ import annotations

import atexit
import json
import secrets
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .acp_transport import AcpClient


class ToolEndpoint:
    def __init__(self):
        self.token = secrets.token_urlsafe(32)
        self.delegate = None
        self.tools = []
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_args):
                pass

            def do_POST(self):
                if not secrets.compare_digest(self.headers.get("Authorization", ""), "Bearer " + owner.token):
                    self.send_error(401)
                    return
                try:
                    length = int(self.headers.get("Content-Length", "0"))
                    if not 0 < length <= 1024 * 1024:
                        raise ValueError()
                    message = json.loads(self.rfile.read(length))
                    delegate = owner.delegate
                    if delegate is not None:
                        result = delegate.dispatch(message)
                    elif message.get("method") == "ping":
                        result = {}
                    elif message.get("method") == "tools/list":
                        result = {"tools": owner.tools}
                    else:
                        self.send_error(409, "No active turn")
                        return
                    body = json.dumps({"jsonrpc": "2.0", "id": message.get("id"), "result": result}, ensure_ascii=False).encode()
                except Exception:
                    self.send_error(400, "Invalid or expired tool request")
                    return
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_port}/"
        self.thread = threading.Thread(target=self.server.serve_forever, kwargs={"poll_interval": 0.1}, daemon=True)
        self.thread.start()

    def close(self):
        self.delegate = None
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=1)


class WarmAgent:
    def __init__(self, connection, control):
        self.endpoint = ToolEndpoint()
        self.client = None
        try:
            self.client = AcpClient(connection, extra_env={"RETAINPDF_TOOL_TOKEN": self.endpoint.token})
            self.initialized = self.client.initialize(control)
        except Exception:
            self.close()
            raise
        self.session = None
        self.history = None
        self.used = time.monotonic()
        self.busy = True

    def close(self):
        if self.client:
            self.client.close()
        self.endpoint.close()


class SessionPool:
    def __init__(self):
        self.sessions = {}
        self.lock = threading.Lock()
        self.stopped = threading.Event()
        threading.Thread(target=self._reap, daemon=True).start()
        atexit.register(self.close)

    def acquire(self, key, connection, history, control):
        stale = None
        with self.lock:
            entry = self.sessions.get(key)
            if entry and (entry.client.process.poll() is not None or entry.history != history):
                stale = self.sessions.pop(key)
                entry = None
            if entry:
                entry.busy = True
                return entry
        if stale:
            stale.close()
        entry = WarmAgent(connection, control)
        with self.lock:
            self.sessions[key] = entry
        return entry

    def release(self, key, entry, *, history=None, healthy=True):
        with self.lock:
            if self.sessions.get(key) is not entry:
                return
            if not healthy:
                self.sessions.pop(key).close()
            else:
                entry.history = history
                entry.used = time.monotonic()
                entry.busy = False
                entry.client.on_update = lambda _params: None
                entry.client.on_request = None

    def _reap(self):
        while not self.stopped.wait(30):
            with self.lock:
                idle = sorted(((k, v) for k, v in self.sessions.items() if not v.busy), key=lambda item: item[1].used)
                for key, entry in idle:
                    if time.monotonic() - entry.used > 300 or len(self.sessions) > 4:
                        self.sessions.pop(key).close()

    def close(self):
        self.stopped.set()
        with self.lock:
            for entry in self.sessions.values():
                entry.close()
            self.sessions.clear()
