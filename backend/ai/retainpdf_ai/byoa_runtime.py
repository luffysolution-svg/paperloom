"""User-owned ACP Agents, canonical transcript recovery and native session loading."""
from __future__ import annotations

import hashlib
import json
import logging
import os
import secrets
import threading
import subprocess
import time
from dataclasses import asdict
from pathlib import Path

import httpx
from fastapi import HTTPException

from . import llm_wire
from .acp_tool_bridge import ToolBridge
from .acp_sessions import SessionPool
from .image_inputs import image_inputs
from .acp_transport import AcpClient, AcpError, config_options
from .agent import referenced_citations, sanitize_answer_text
from .agent_evidence import StreamingAnswerSanitizer
from .agent_interactions import Interactions
from .connections import ConnectionStore
from .agent_adapters import effective_connection, prepare_adapter
from .agent_presets import cli_path, launch_argv
from .request_control import AIProviderError, AIRequestError, AIRequestTimeout, AIStreamIncomplete, RequestControl
from .runtimes.contracts import AskResult, Citation, RuntimeCapabilities
from .runtimes.openai import OpenAICompatibleAgentRuntime


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


class ConnectionManager:
    def __init__(self, settings, rust, registry):
        self.settings, self.rust, self.registry = settings, rust, registry
        self.store = ConnectionStore(settings)
        self.interactions = Interactions()
        self.locks = {}
        self.lock = threading.Lock()
        self.active_runs = {}
        self.preparations = {}
        self.adapter_install_lock = threading.Lock()
        self.sessions = SessionPool()
        self.auth_tasks = {}

    def track_run(self, run_id, control, conversation_id=""):
        if not run_id:
            return
        with self.lock:
            if run_id in self.active_runs:
                raise HTTPException(409, "这次请求仍在运行，请先停止或等待完成。")
            self.active_runs[run_id] = {"control": control, "conversation_id": conversation_id}
        def release():
            with self.lock:
                if self.active_runs.get(run_id, {}).get("control") is control:
                    self.active_runs.pop(run_id, None)
        control.add_cancel_callback(release)

    def cancel_run(self, run_id):
        with self.lock:
            control = self.active_runs.get(run_id, {}).get("control")
        if control:
            control.cancel("user_cancelled")
        return bool(control)

    def list_runs(self, conversation_id):
        with self.lock:
            return [{"run_id": id, "status": "running", "elapsed_ms": item["control"].elapsed_ms}
                    for id, item in self.active_runs.items() if item["conversation_id"] == conversation_id]

    def resolve(self, payload):
        connection = self.store.get(payload.connection_id)
        if connection.id == "legacy" and not connection.api_key and payload.llm_api_key and not self.store.is_saved("legacy"):
            connection = connection.model_copy(update={"api_key": payload.llm_api_key, "base_url": payload.llm_base_url or connection.base_url,
                "model": payload.llm_model or connection.model, "api_protocol": payload.llm_api_protocol or connection.api_protocol})
        model = payload.connection_model.strip() or connection.model
        # Bind the persisted source/model to this turn's immutable snapshot.
        payload.llm_model = model
        if connection.kind == "byok":
            if not connection.api_key:
                raise HTTPException(400, "此连接还没有 API Key，请在 AI 连接设置中填写。")
            settings = self.store.request_settings(connection, model)
            registry = self.registry.scoped(payload.scope_document_ids) if self.registry else None
            runtime = OpenAICompatibleAgentRuntime(settings, self.rust, reading_registry=registry)
            runtime.runtime_id = f"byok:{connection.id}"
        else:
            settings = self.settings
            connection = effective_connection(connection, self.settings.data_root)
            runtime = ByoaRuntime(self, connection, model, dict(payload.connection_options))
        runtime.source_label = f"{connection.name} · {model}" if model else connection.name
        return runtime, settings

    def turn_lock(self, connection_id, conversation_id):
        with self.lock:
            return self.locks.setdefault((connection_id, conversation_id), threading.Lock())

    def prepare_probe(self, id, *, fresh=False):
        connection = self.store.get(id)
        if connection.kind != "byoa":
            return self.probe(id)
        with self.lock:
            current = self.preparations.get(id)
            if current and (current["status"] == "preparing" or not fresh):
                return dict(current)
            pending = {"ready": False, "status": "preparing", "message": "正在准备连接组件并连接 Agent…"}
            self.preparations[id] = pending

        def run():
            try:
                with self.adapter_install_lock:
                    prepare_adapter(connection, self.settings.data_root)
                result = self.probe(id)
            except (AIRequestError, ValueError, OSError, HTTPException) as exc:
                result = {"ready": False, "status": "unavailable", "message": str(exc) if isinstance(exc, (AIRequestError, ValueError)) else "准备连接失败，请检查程序和网络后重试。"}
            with self.lock:
                self.preparations[id] = result
        threading.Thread(target=run, daemon=True).start()
        return dict(pending)

    def list_models(self, id):
        connection = self.store.get(id)
        if connection.kind != "byok" or not connection.api_key:
            return {"ready": False, "status": "missing_key", "message": "请先填写 API Key", "models": []}
        suffix = {"openai": "/chat/completions", "openai_responses": "/responses", "anthropic": "/messages"}[connection.api_protocol]
        url = llm_wire.endpoint(connection.base_url, connection.api_protocol).removesuffix(suffix) + "/models"
        try:
            with httpx.Client(timeout=20) as client:
                response = client.get(url, headers=llm_wire.headers(connection.api_key, connection.api_protocol))
                response.raise_for_status()
                models = [item["id"] for item in response.json().get("data", []) if isinstance(item, dict) and isinstance(item.get("id"), str)][:200]
            return {"ready": bool(models), "status": "ready" if models else "empty", "models": models,
                    "message": "已读取可用模型" if models else "服务未提供模型列表，可直接输入模型名称。"}
        except (httpx.HTTPError, ValueError, TypeError):
            return {"ready": False, "status": "unavailable", "models": [], "message": "无法读取模型列表，请检查 API Key、服务地址与网络，或直接输入模型名称。"}

    def probe(self, id):
        connection = effective_connection(self.store.get(id), self.settings.data_root)
        if connection.kind == "byok":
            if not connection.api_key:
                return {"ready": False, "status": "missing_key", "message": "请先填写 API Key"}
            settings = self.store.request_settings(connection)
            from .agent_llm import build_deepseek_chat_fn
            control = RequestControl(30)
            try:
                with httpx.Client(timeout=20) as client:
                    result = build_deepseek_chat_fn(settings, client, request_control=control)([{"role": "user", "content": "Reply with OK only."}], [])
                    models = self.list_models(id)["models"]
                return {"ready": bool(result.get("content")), "status": "ready", "message": "协议、模型和认证已通过实际请求验证", "models": models}
            finally:
                control.finish()
        control = RequestControl(30)
        client = None
        initialized = {}
        try:
            client = AcpClient(connection)
            initialized = client.initialize(control)
            session = client.call("session/new", {"cwd": connection.cwd or str(Path.home()), "mcpServers": []}, control)
            if not session.get("sessionId"):
                raise AcpError("session", "Agent 未能创建有效会话，请更新适配器后重试。")
            return {"ready": True, "status": "ready", "message": "ACP 连接与会话就绪", "config_options": config_options(session),
                    "agent_info": initialized.get("agentInfo"), "capabilities": initialized.get("agentCapabilities", {}), "auth_methods": initialized.get("authMethods", [])}
        except (AIRequestError, ValueError, OSError) as exc:
            logging.getLogger(__name__).warning("ACP probe failed: preset=%s command=%s error=%s rpc_code=%s", connection.preset, Path(connection.command).name, type(exc).__name__, getattr(exc, "rpc_code", ""))
            return {"ready": False, "status": "auth_required" if isinstance(exc, AcpError) and exc.rpc_code == -32000 else "unavailable",
                    "message": str(exc) if isinstance(exc, (AIRequestError, ValueError)) else "无法启动 Agent，请检查程序路径与工作目录。", "auth_methods": initialized.get("authMethods", [])}
        finally:
            if client:
                client.close()
            control.finish()

    def authentication_status(self, id):
        with self.lock:
            task = self.auth_tasks.get(id)
            return {k: v for k, v in task.items() if k != "control"} if task else {"status": "idle", "message": "尚未开始登录"}

    def cancel_authentication(self, id):
        with self.lock:
            task = self.auth_tasks.get(id)
            control = task.get("control") if task else None
        if control:
            control.cancel("user_cancelled")
        return self.authentication_status(id)

    def authenticate(self, id, payload):
        connection = effective_connection(self.store.get(id), self.settings.data_root)
        if connection.kind != "byoa":
            raise HTTPException(400, "此连接使用 API Key 认证")
        control = RequestControl(120)
        with self.lock:
            if self.auth_tasks.get(id, {}).get("status") == "authenticating":
                return self.authentication_status_unlocked(id)
            self.auth_tasks[id] = {"status": "authenticating", "message": "等待登录完成，请在浏览器或登录窗口中继续。", "control": control}

        def run():
            client = None
            try:
                client = AcpClient(connection)
                control.add_cancel_callback(client.close)
                initialized = client.initialize(control)
                method = next((m for m in initialized.get("authMethods", []) if m.get("id") == payload.get("method_id")), None)
                if not method:
                    raise ValueError("请选择 Agent 提供的认证方式")
                if method.get("type", "agent") == "terminal":
                    if os.name != "nt":
                        raise ValueError("此认证方式需要交互终端，请在原 CLI 完成登录。")
                    extra = method.get("env") or {}
                    if any(k.upper() in {"PATH", "NODE_OPTIONS", "PYTHONPATH", "BASH_ENV", "SSL_CERT_FILE"} or k.upper().startswith(("LD_", "DYLD_")) for k in extra):
                        raise ValueError("此登录方式需要更改运行环境，请在原 CLI 完成登录。")
                    env = {**os.environ, **connection.env, **extra}
                    process = subprocess.Popen(launch_argv(connection.command, [*connection.args, *method.get("args", [])], env),
                        env=env, cwd=connection.cwd or str(Path.home()), creationflags=subprocess.CREATE_NEW_CONSOLE)
                    control.add_cancel_callback(process.terminate)
                    while process.poll() is None:
                        control.raise_if_stopped()
                        time.sleep(0.2)
                    control.remove_cancel_callback(process.terminate)
                    if process.returncode:
                        raise ValueError("登录未完成，请重试或在原 CLI 登录。")
                elif method.get("type", "agent") == "agent":
                    client.call("authenticate", {"methodId": method["id"]}, control)
                else:
                    raise ValueError("暂不支持此认证方式，请在原 CLI 完成登录。")
                control.raise_if_stopped()
                result = self.probe(id)
                result["status"] = "ready" if result.get("ready") else result.get("status", "unavailable")
                result["message"] = "登录成功，Agent 已就绪" if result.get("ready") else result["message"]
            except Exception as exc:
                timed_out = isinstance(exc, AIRequestTimeout)
                cancelled = control.cancelled and not timed_out
                result = {"status": "cancelled" if cancelled else "error", "ready": False,
                          "message": "登录超时，请重试或在原 CLI 完成登录。" if timed_out else "登录已取消" if cancelled else str(exc) if isinstance(exc, (AIRequestError, ValueError)) else "登录失败，请重试或在原 CLI 完成登录。"}
            finally:
                if client:
                    client.close()
                control.finish()
            with self.lock:
                self.auth_tasks[id] = result
        threading.Thread(target=run, daemon=True).start()
        return self.authentication_status(id)

    def authentication_status_unlocked(self, id):
        return {k: v for k, v in self.auth_tasks[id].items() if k != "control"}


class ByoaRuntime:
    def __init__(self, manager, connection, model, options):
        self.manager, self.connection = manager, connection
        self.model, self.options = model, options
        self.runtime_id = f"acp:{connection.preset}:{connection.id}"
        self.capabilities = RuntimeCapabilities(document_reading=bool(manager.registry), document_operations=True, streaming=True,
            durable_sessions=True, model_transport="runtime_managed", confirmation_modes=frozenset({"explicit", "green_light"}))

    def content_source(self, document_id, job_id):
        return self.manager.registry.content_source(document_id, job_id) if self.manager.registry else "none"

    def ask(self, question, *, conversation_id="", document_id="", job_id="", request_message_id="", confirmed=False,
            on_event=None, history=None, request_control=None, scope_document_ids=None, attachments=None, **_kwargs):
        manager, connection = self.manager, self.connection
        if not connection.cwd:
            workdir = manager.settings.data_root / "agent-runtime" / "byoa" / "workspaces" / digest({"connection": connection.id, "conversation": conversation_id})
            workdir.mkdir(parents=True, exist_ok=True)
            connection = connection.model_copy(update={"cwd": cli_path(workdir)})
        control = request_control or RequestControl(manager.settings.byoa_request_deadline_s)
        emit = on_event or (lambda _event: None)
        history_images = [image for message in (history or []) for image in message.get("attachments", [])][-4:]
        history = [{"role": m["role"], "content": m["content"]} for m in (history or []) if m.get("role") in {"user", "assistant"}]
        turn_lock = manager.turn_lock(connection.id, conversation_id)
        if not turn_lock.acquire(blocking=False):
            raise AIProviderError("这个连接正在处理同一对话，请等待本轮结束。")
        client = None
        entry = None
        healthy = False
        next_history = None
        cancel = None
        identity = {"connection": connection.model_dump(exclude={"api_key", "env"}), "env_fingerprint": digest(connection.env),
                    "conversation": conversation_id, "document": document_id, "job": job_id, "scope": sorted(scope_document_ids or [])}
        pool_key = digest(identity)
        try:
            emit({"type": "progress", "stage": "connecting", "message": "正在连接 Agent"})
            entry = manager.sessions.acquire(pool_key, connection, history, control)
            client = entry.client
            initialized = entry.initialized
            registry = manager.registry.scoped(scope_document_ids) if manager.registry else None
            with ToolBridge(manager.settings, manager.rust, registry, conversation_id=conversation_id, document_id=document_id, job_id=job_id,
                            request_message_id=request_message_id, question=question, confirmed=confirmed, emit=emit, control=control, gateway=entry.endpoint,
                            visual_tools=connection.preset != "pi" and bool(initialized.get("agentCapabilities", {}).get("promptCapabilities", {}).get("image"))) as bridge:
                answer = []
                active_session = [""]
                prompting = [False]
                startup_info = [""]
                previous_message = [""]
                bridged_calls = set()
                sanitizer = StreamingAnswerSanitizer(bridge.citations)

                def update(params):
                    if params.get("sessionId") != active_session[0] or not prompting[0]:
                        return
                    event = params.get("update") or {}
                    kind = event.get("sessionUpdate")
                    if kind == "agent_message_chunk" and event.get("content", {}).get("type") == "text":
                        piece = event["content"].get("text") or ""
                        if startup_info[0] and piece == startup_info[0]:
                            return
                        if sum(map(len, answer)) + len(piece) > 1024 * 1024:
                            raise AIStreamIncomplete()
                        message_id = event.get("messageId", "")
                        if message_id and previous_message[0] and message_id != previous_message[0]:
                            piece = "\n\n" + piece
                        if message_id:
                            previous_message[0] = message_id
                        answer.append(piece)
                        clean = sanitizer.feed(piece)
                        if clean:
                            emit({"type": "answer_delta", "text": clean})
                    elif kind in {"tool_call", "tool_call_update"}:
                        call_id = event.get("toolCallId", "")
                        if str(event.get("title", "")).startswith("mcp.paperloom."):
                            bridged_calls.add(call_id)
                        if call_id in bridged_calls:
                            return  # The host bridge emits this same call with document metadata.
                        projected = {"type": "agent_tool", "tool_call_id": event.get("toolCallId", "")}
                        for source, target in (("title", "title"), ("name", "tool"), ("status", "status"), ("kind", "kind"),
                                               ("rawInput", "input"), ("rawOutput", "output"), ("content", "content"), ("locations", "locations")):
                            if source in event and event[source] is not None:
                                projected[target] = event[source]
                        if projected.get("title") == "Guardian Review":
                            projected["title"] = "检查工具权限"
                        emit(projected)
                    elif kind == "agent_thought_chunk" and event.get("content", {}).get("type") == "text":
                        emit({"type": "reasoning_delta", "text": event["content"].get("text", "")})
                    elif kind == "plan":
                        emit({"type": "agent_plan", "entries": event.get("entries", [])})
                    elif kind == "usage_update":
                        emit({"type": "usage", "usage": {k: v for k, v in event.items() if k != "sessionUpdate"}})
                    elif kind == "notice":
                        emit({"type": "agent_notice", "title": event.get("title", "Agent 提示"), "severity": event.get("severity", "info"),
                              "description": event.get("description", "")})
                    elif kind == "config_option_update":
                        emit({"type": "agent_connection", "conversation_id": conversation_id, "connection_id": connection.id, "config_options": event.get("configOptions", [])})

                def request(method, params):
                    if active_session[0] and params.get("sessionId") not in {None, active_session[0]}:
                        raise AcpError(-32602)
                    if method == "session/request_permission":
                        return manager.interactions.ask("permission", params, connection=connection, conversation_id=conversation_id, emit=emit, control=control)
                    if method == "elicitation/create" and params.get("mode") == "form":
                        return manager.interactions.ask("form", params, connection=connection, conversation_id=conversation_id, emit=emit, control=control)
                    raise AcpError(-32601)

                client.on_update, client.on_request = update, request
                control.add_cancel_callback(client.close)
                base_params = {"cwd": connection.cwd or str(Path.home()), "mcpServers": [bridge.mcp_server()] if connection.preset != "pi" else []}
                session_root = manager.settings.data_root / "agent-runtime" / "byoa" / "sessions"
                cursor_path = session_root / (digest({**identity, "history": history}) + ".json")
                saved = json.loads(cursor_path.read_text(encoding="utf-8")) if cursor_path.is_file() else None
                if saved:
                    bridge.citations.update({item["ref"]: Citation(**item) for item in saved.get("citations", [])
                                             if not scope_document_ids or item.get("document_id") in scope_document_ids})
                    bridge.next_ref = max(bridge.citations, default=0) + 1
                session = entry.session
                rebuilt = session is None
                if session is None and initialized.get("agentCapabilities", {}).get("loadSession") and saved:
                    try:
                        session = client.call("session/load", {**base_params, "sessionId": saved["session_id"]}, control)
                        session["sessionId"] = session.get("sessionId") or saved["session_id"]
                        rebuilt = False
                    except AcpError as exc:
                        if exc.rpc_code in {-32000, "disconnected"}:
                            raise
                        emit({"type": "progress", "stage": "routing", "message": "Agent 会话已失效，正在从对话记录恢复"})
                if session is None:
                    emit({"type": "progress", "stage": "session", "message": "正在准备对话与文档工具"})
                    session = client.call("session/new", base_params, control)
                entry.session = session
                active_session[0] = session.get("sessionId") or ""
                startup_info[0] = (session.get("_meta") or {}).get("piAcp", {}).get("startupInfo") or ""
                if not active_session[0]:
                    raise AcpError("session", "Agent 没有返回会话 ID，请更新适配器。")
                options = config_options(session)
                selected = dict(self.options)
                if self.model:
                    model_option = next((o for o in options if o.get("category") == "model"), None)
                    if model_option:
                        selected[model_option["id"]] = self.model
                    else:
                        raise AcpError("config", "此 Agent 未提供模型切换能力，请使用它的默认模型或重新检测连接。")
                for id, value in selected.items():
                    option = next((o for o in options if o.get("id") == id), None)
                    if not option:
                        raise AcpError("config", "此 Agent 未提供所选配置，请重新检测连接。")
                    if option.get("currentValue") == value:
                        continue
                    if option.get("legacy"):
                        method = "session/set_model" if option["category"] == "model" else "session/set_mode"
                        key = "modelId" if option["category"] == "model" else "modeId"
                        client.call(method, {"sessionId": active_session[0], key: value}, control)
                    else:
                        changed = client.call("session/set_config_option", {"sessionId": active_session[0], "configId": id, "value": value}, control)
                        options = changed.get("configOptions") or options
                session["configOptions"] = options
                actual_model = self.model or next((o.get("currentValue", "") for o in options if o.get("category") == "model"), "")
                self.source_label = f"{connection.name} · {actual_model}" if actual_model else connection.name
                emit({"type": "agent_connection", "conversation_id": conversation_id, "connection_id": connection.id, "connection_name": connection.name, "model": self.model,
                      "config_options": options, "rebuilt": rebuilt, "warm": entry.history is not None,
                      "capabilities": initialized.get("agentCapabilities", {})})
                transcript = ""
                if rebuilt and history:
                    transcript = "以下是已有对话数据，用于恢复上下文：\n" + json.dumps(history, ensure_ascii=False) + "\n"
                prompt = bridge.instructions() + transcript + "当前用户问题：\n" + question
                prompting[0] = True
                emit({"type": "progress", "stage": "thinking", "message": "Agent 正在处理问题"})

                def cancel():
                    try:
                        client.send({"method": "session/cancel", "params": {"sessionId": active_session[0]}})
                    except AcpError:
                        pass
                control.remove_cancel_callback(client.close)
                control.add_cancel_callback(cancel)
                control.add_cancel_callback(client.close)
                images = image_inputs(attachments)
                if rebuilt:
                    images = [*image_inputs(history_images), *images]
                if images and not initialized.get("agentCapabilities", {}).get("promptCapabilities", {}).get("image"):
                    raise AIProviderError("此 Agent 未声明图片输入能力，请切换支持图片的 Agent 或使用文字提问。")
                completed = client.call("session/prompt", {"sessionId": active_session[0], "prompt": [{"type": "text", "text": prompt}, *images]}, control)
                control.raise_if_stopped()
                if completed.get("stopReason") != "end_turn":
                    raise AIStreamIncomplete()
                tail = sanitizer.flush()
                if tail:
                    emit({"type": "answer_delta", "text": tail})
                text = sanitize_answer_text("".join(answer), bridge.citations)
                if not text.strip():
                    raise AIStreamIncomplete()
                # Multiple branches and connections keep independent resumable IDs.
                session_root.mkdir(parents=True, exist_ok=True)
                next_history = [*history, {"role": "user", "content": question}, {"role": "assistant", "content": text}]
                next_path = session_root / (digest({**identity, "history": next_history}) + ".json")
                temporary = next_path.with_suffix("." + secrets.token_hex(4) + ".tmp")
                temporary.write_text(json.dumps({"session_id": active_session[0], "citations": [asdict(value) for value in bridge.citations.values()]}), encoding="utf-8")
                os.replace(temporary, next_path)
                healthy = True
                return AskResult(answer=text, citations=referenced_citations(text, bridge.citations), tool_trace=bridge.trace, rounds=1, operation_refs=list(bridge.operations.values()))
        finally:
            if client:
                control.remove_cancel_callback(client.close)
                if cancel:
                    control.remove_cancel_callback(cancel)
            if entry:
                manager.sessions.release(pool_key, entry, history=next_history, healthy=healthy)
            turn_lock.release()
