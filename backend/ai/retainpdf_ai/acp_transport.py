"""ACP v1 stdio transport. Structured argv, inherited CLI identity, bounded I/O."""
from __future__ import annotations

import json
import os
import queue
import signal
import subprocess
import threading
from pathlib import Path

from .agent_presets import host_executable, launch_argv
from .request_control import AIProviderError, RequestControl


class AcpError(AIProviderError):
    code = "AI_AGENT_ERROR"

    def __init__(self, code, message="Agent 请求失败，请检查登录状态或运行连接检测。"):
        self.rpc_code = code
        super().__init__(message)


class AcpClient:
    def __init__(self, connection, *, on_update=None, on_request=None, extra_env=None):
        self.connection = connection
        env = {**os.environ, **connection.env, **(extra_env or {})}
        # Native ACP agents use local HTTP services; preserve proxies and bypass loopback.
        bypass = [part.strip() for key in ("NO_PROXY", "no_proxy") for part in env.get(key, "").split(",") if part.strip()]
        env["NO_PROXY"] = ",".join(dict.fromkeys([*bypass, "127.0.0.1", "localhost", "::1"]))
        if "no_proxy" in env:
            env["no_proxy"] = env["NO_PROXY"]
        # The adapter must bind to the user's CLI, including explicit overrides.
        for preset, variable, host in (("codex-acp", "CODEX_PATH", "codex"), ("claude-acp", "CLAUDE_CODE_EXECUTABLE", "claude")):
            if connection.preset == preset and not env.get(variable):
                path = host_executable(host, env)
                if path:
                    env[variable] = path
        argv = launch_argv(connection.command, connection.args, env)
        self.process = subprocess.Popen(
            argv, cwd=connection.cwd or str(Path.home()), env=env,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, encoding="utf-8", errors="replace", bufsize=1,
            start_new_session=os.name != "nt",
            creationflags=(subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP) if os.name == "nt" else 0,
        )
        self.on_update = on_update or (lambda _params: None)
        self.on_request = on_request
        self._write_lock = threading.Lock()
        self._lock = threading.Lock()
        self._pending = {}
        self._id = 0
        self._closed = False
        threading.Thread(target=self._read, daemon=True).start()
        # Drain stderr without retaining or exposing CLI credentials/log bodies.
        threading.Thread(target=self._drain, daemon=True).start()

    def _drain(self):
        while self.process.stderr.read(4096):
            pass

    def send(self, message):
        with self._write_lock:
            try:
                self.process.stdin.write(json.dumps({"jsonrpc": "2.0", **message}, ensure_ascii=False) + "\n")
                self.process.stdin.flush()
            except (OSError, ValueError) as exc:
                raise AcpError("disconnected", "Agent 进程已退出，请重新检测连接。") from exc

    def _read(self):
        try:
            while True:
                line = self.process.stdout.readline(4 * 1024 * 1024 + 1)
                if not line:
                    break
                if len(line) > 4 * 1024 * 1024:
                    break
                try:
                    message = json.loads(line)
                except ValueError:
                    continue  # Some CLIs print a startup banner before ACP.
                if not isinstance(message, dict):
                    continue
                if "method" in message:
                    if "id" in message:
                        threading.Thread(target=self._request, args=(message,), daemon=True).start()
                    elif message["method"] == "session/update":
                        self.on_update(message.get("params") or {})
                else:
                    with self._lock:
                        target = self._pending.get(message.get("id"))
                    if target:
                        target.put(message)
        finally:
            with self._lock:
                for target in self._pending.values():
                    target.put({"error": {"code": "disconnected"}})

    def _request(self, message):
        try:
            if self.on_request is None:
                raise AcpError(-32601)
            result = self.on_request(message["method"], message.get("params") or {})
            self.send({"id": message["id"], "result": result})
        except Exception:
            try:
                self.send({"id": message["id"], "error": {"code": -32601, "message": "Client capability unavailable or request cancelled"}})
            except AcpError:
                pass

    def call(self, method, params, control: RequestControl):
        with self._lock:
            self._id += 1
            id = self._id
            target = queue.Queue()
            self._pending[id] = target
        try:
            self.send({"id": id, "method": method, "params": params})
            while True:
                control.raise_if_stopped()
                try:
                    reply = target.get(timeout=min(0.2, max(0.01, control.remaining_seconds)))
                    break
                except queue.Empty:
                    if self.process.poll() is not None:
                        raise AcpError("disconnected", "Agent 进程已退出，请检查启动参数与登录状态。")
            if reply.get("error"):
                control.raise_if_stopped()
                code = reply["error"].get("code")
                if code == -32000:
                    raise AcpError(code, "Agent 需要登录，请在原 CLI 完成登录，或在连接检测中选择认证方式。")
                raise AcpError(code)
            return reply.get("result") or {}
        finally:
            with self._lock:
                self._pending.pop(id, None)

    def initialize(self, control):
        result = self.call("initialize", {"protocolVersion": 1, "clientInfo": {"name": "paperloom", "version": "0.2.0"},
            "clientCapabilities": {"fs": {"readTextFile": False, "writeTextFile": False}, "terminal": False, "elicitation": {"form": {}}}}, control)
        if result.get("protocolVersion") != 1:
            raise AcpError("version", "此 Agent 未协商到 ACP v1，请更新适配器。")
        return result

    def close(self):
        if self._closed:
            return
        self._closed = True
        if self.process.poll() is None:
            try:
                if os.name == "nt":
                    subprocess.run(["taskkill", "/PID", str(self.process.pid), "/T", "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW, timeout=5)
                else:
                    os.killpg(self.process.pid, signal.SIGTERM)
                self.process.wait(timeout=2)
            except (OSError, subprocess.TimeoutExpired):
                self.process.kill()
                self.process.wait(timeout=2)
        for pipe in (self.process.stdin, self.process.stdout, self.process.stderr):
            try:
                pipe.close()
            except (OSError, ValueError):
                pass


def config_options(session):
    if session.get("configOptions"):
        return session["configOptions"]
    options = []
    for category, key, items, current, value_key, label_key in (
        ("model", "models", "availableModels", "currentModelId", "modelId", "name"),
        ("mode", "modes", "availableModes", "currentModeId", "id", "name"),
    ):
        legacy = session.get(key) or {}
        if legacy.get(items):
            options.append({"id": category, "category": category, "name": "模型" if category == "model" else "模式", "type": "select", "currentValue": legacy.get(current, ""),
                            "options": [{"value": item[value_key], "name": item.get(label_key) or item[value_key]} for item in legacy[items]], "legacy": True})
    return options
