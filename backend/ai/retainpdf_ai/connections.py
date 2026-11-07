"""Revisioned local AI connections. Request snapshots never restart the sidecar."""
from __future__ import annotations

import json
import os
import re
import secrets
import threading
from dataclasses import replace
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from fastapi import Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .agent_presets import PRESETS, preset_catalog
from .config import Settings


class Connection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(default="", max_length=128, pattern=r"^[a-zA-Z0-9_-]*$")
    name: str = Field(min_length=1, max_length=80)
    kind: Literal["byok", "byoa"] = "byok"
    provider: str = Field(default="", max_length=80)
    api_protocol: Literal["openai", "openai_responses", "anthropic"] = "openai"
    base_url: str = Field(default="", max_length=2048)
    model: str = Field(default="", max_length=256)
    models: list[str] = Field(default_factory=list, max_length=200)
    api_key: str | None = Field(default=None, max_length=8192)
    preset: str = "custom"
    command: str = Field(default="", max_length=4096)
    args: list[str] = Field(default_factory=list, max_length=100)
    env: dict[str, str] = Field(default_factory=dict, max_length=100)
    cwd: str = Field(default="", max_length=4096)

    @model_validator(mode="after")
    def valid(self):
        self.name = self.name.strip()
        if not self.name:
            raise ValueError("请填写连接名称")
        if self.kind == "byok":
            url = urlsplit(self.base_url)
            if url.scheme not in {"http", "https"} or not url.hostname or url.username or url.password or url.query or url.fragment:
                raise ValueError("API URL 必须是有效的 HTTP(S) 地址，且不含凭据、查询或片段")
        else:
            if self.preset not in {p["id"] for p in PRESETS} | {"custom"}:
                raise ValueError("未知 Agent 预设")
            if not self.command.strip() or any(c in self.command for c in "\r\n\0"):
                raise ValueError("请填写 Agent 可执行文件")
            if any("\0" in arg or len(arg) > 8192 for arg in self.args):
                raise ValueError("Agent 参数无效")
            if any(not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key) or "\0" in value for key, value in self.env.items()):
                raise ValueError("环境变量名称或值无效")
            if self.cwd and not Path(self.cwd).is_dir():
                raise ValueError("工作目录不存在")
        return self


class ConnectionWrite(BaseModel):
    expected_revision: int = Field(ge=0)
    connection: Connection


class ConnectionStore:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.path = settings.data_root / "secrets" / "ai-connections.json"
        self.lock = threading.RLock()

    def _read(self):
        if not self.path.exists():
            return {"schema": "paperloom_ai_connections_v1", "revision": 0, "connections": []}
        if self.path.is_symlink() or self.path.stat().st_size > 2 * 1024 * 1024:
            raise HTTPException(500, "AI 连接配置文件无效")
        data = json.loads(self.path.read_text(encoding="utf-8"))
        if data.get("schema") != "paperloom_ai_connections_v1":
            raise HTTPException(500, "AI 连接配置版本不受支持")
        return data

    def _legacy(self):
        s = self.settings
        return Connection(id="legacy", name="现有模型连接", base_url=s.llm_base_url, model=s.llm_model,
                          api_protocol=s.llm_api_protocol, api_key=s.llm_api_key)

    def list(self):
        with self.lock:
            data = self._read()
            records = list(data["connections"])
            if not any(c["id"] == "legacy" for c in records):
                records.insert(0, {**self._legacy().model_dump(), "legacy_inherited": True})
            def public(record):
                record = dict(record)
                record["api_key_configured"] = bool(record.pop("api_key", None))
                # Env overrides may contain user credentials; reveal names only.
                record["env_names"] = list(record.pop("env", {}))
                return record
            return {"revision": data["revision"], "connections": [public(c) for c in records], "presets": preset_catalog(self.settings.data_root)}

    def is_saved(self, id: str) -> bool:
        with self.lock:
            return any(c["id"] == id for c in self._read()["connections"])

    def get(self, id: str) -> Connection:
        with self.lock:
            data = self._read()
            raw = next((c for c in data["connections"] if c["id"] == id), None)
            if raw is None and id == "legacy":
                return self._legacy()
            if raw is None:
                raise HTTPException(404, "该连接已删除，请重新选择")
            return Connection.model_validate(raw)

    def write(self, connection: Connection | None, expected: int, delete_id=""):
        with self.lock:
            data = self._read()
            if data["revision"] != expected:
                raise HTTPException(409, "连接已在其他窗口更新，请刷新后重试。当前输入可继续保留。")
            records = data["connections"]
            if connection:
                connection = connection.model_copy(deep=True)
                connection.id = connection.id or secrets.token_hex(12)
                old = next((c for c in records if c["id"] == connection.id), None)
                if connection.api_key is None:
                    connection.api_key = (old or {}).get("api_key", self.settings.llm_api_key if connection.id == "legacy" else "")
                if connection.kind == "byok" and not connection.model.strip():
                    raise HTTPException(400, "请填写默认模型")
                # Empty env from an editor means keep the saved overrides. Explicit
                # deletion is sent as {NAME: ""}; values never leave the backend.
                if old:
                    connection.env = {**old.get("env", {}), **connection.env}
                records = [c for c in records if c["id"] != connection.id] + [connection.model_dump()]
            else:
                if delete_id == "legacy":
                    raise HTTPException(400, "现有模型连接可编辑，不能删除")
                records = [c for c in records if c["id"] != delete_id]
            if len(records) > 100:
                raise HTTPException(400, "最多保存 100 个连接")
            data.update(revision=data["revision"] + 1, connections=records)
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temp = self.path.with_name(f".{self.path.name}.{secrets.token_hex(6)}.tmp")
            descriptor = os.open(temp, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            try:
                with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
                    json.dump(data, stream, ensure_ascii=False, indent=2)
                    stream.flush()
                    os.fsync(stream.fileno())
                os.replace(temp, self.path)
            finally:
                temp.unlink(missing_ok=True)
            return self.list()

    def request_settings(self, connection, model=""):
        return replace(self.settings, llm_api_key=connection.api_key or "", llm_credential_ref="",
                       llm_api_protocol=connection.api_protocol, llm_base_url=connection.base_url,
                       llm_model=model or connection.model)


def register_connection_routes(app, manager, require_api_key):
    deps = [Depends(require_api_key)]

    @app.get("/v1/connections", dependencies=deps)
    def list_connections():
        return {"code": 0, "data": manager.store.list()}

    @app.put("/v1/connections", dependencies=deps)
    def save_connection(payload: ConnectionWrite):
        return {"code": 0, "data": manager.store.write(payload.connection, payload.expected_revision)}

    @app.delete("/v1/connections/{connection_id}", dependencies=deps)
    def delete_connection(connection_id: str, expected_revision: int):
        return {"code": 0, "data": manager.store.write(None, expected_revision, connection_id)}

    @app.post("/v1/connections/{connection_id}/probe", dependencies=deps)
    def probe(connection_id: str, payload: dict | None = None):
        if payload and payload.get("models_only"):
            return {"code": 0, "data": manager.list_models(connection_id)}
        if payload and payload.get("prepare"):
            return {"code": 0, "data": manager.prepare_probe(connection_id, fresh=bool(payload.get("fresh")))}
        return {"code": 0, "data": manager.probe(connection_id)}

    @app.post("/v1/connections/{connection_id}/authenticate", dependencies=deps)
    def authenticate(connection_id: str, payload: dict):
        return {"code": 0, "data": manager.authenticate(connection_id, payload)}

    @app.post("/v1/connections/interactions/{interaction_id}", dependencies=deps)
    def interaction(interaction_id: str, payload: dict):
        manager.interactions.respond(interaction_id, payload)
        return {"code": 0, "data": {"accepted": True}}

    @app.post("/v1/connections/runs/{run_id}/cancel", dependencies=deps)
    def cancel_run(run_id: str):
        return {"code": 0, "data": {"cancelled": manager.cancel_run(run_id)}}
