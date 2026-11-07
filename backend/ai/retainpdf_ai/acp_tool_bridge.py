"""Session-scoped document tools shared by MCP-capable agents and Pi's CLI."""
from __future__ import annotations

import json
import secrets
import sys
import threading
import os
import shlex
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from .agent import assign_refs, public_tool_payload, scope_tool_arguments, tool_specs_for_scope
from .agent_command_broker import AgentCommandBroker, BrokerScope
from .runtimes.openai_operations import DOCUMENT_AGENT_TOOLS, invoke_operation_tool
from .unified_tools import CALCULATION_TOOL_NAMES, agent_tool_event, with_tool_context


class ToolBridge:
    def __init__(self, settings, rust, registry, *, conversation_id, document_id, job_id, request_message_id, question, confirmed, emit, control):
        self.registry = registry
        self.control = control
        self.emit = emit
        self.conversation_id, self.document_id, self.job_id = conversation_id, document_id, job_id
        self.request_message_id = request_message_id
        self.citations, self.trace, self.operations = {}, [], {}
        self.lock = threading.Lock()
        self.next_ref = 1
        self.ran = set()
        self.token = secrets.token_urlsafe(32)
        self.script = str(Path(__file__).with_name("acp_tools.py"))
        self.operation_tools = bool(document_id and request_message_id and rust)
        reading = tool_specs_for_scope(registry, document_id, job_id) if registry and (document_id or job_id) else registry.specs(frozenset({"list_documents", "search_fulltext", "read_blocks", "search_favorites"})) if registry else []
        self.specs = [*reading, *(DOCUMENT_AGENT_TOOLS if self.operation_tools else [])]
        self.names = {s["function"]["name"] for s in self.specs}
        self.broker = AgentCommandBroker(state_root=settings.data_root / "agent-runtime" / "byoa", cli_command=settings.agent_cli_command or settings.fx_agent_cli_command,
            rust_api_url=settings.rust_api_base, rust=rust, host_only=True,
            scope=BrokerScope(conversation_id=conversation_id, document_id=document_id, job_id=job_id, request_message_id=request_message_id,
                              intent_summary=question, confirmed=confirmed, green_light=settings.agent_confirmation_mode == "green_light"),
            on_operation_event=self._operation) if self.operation_tools else None
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
                    result = owner.dispatch(message)
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

    def __enter__(self):
        if self.broker:
            self.broker.__enter__()
        self.thread = threading.Thread(target=self.server.serve_forever, kwargs={"poll_interval": 0.1}, daemon=True)
        self.thread.start()
        return self

    def __exit__(self, *_args):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=1)
        if self.broker:
            self.broker.close()

    def mcp_server(self):
        return {"name": "paperloom", "command": sys.executable, "args": [self.script, "--stdio", "--url", self.url],
                "env": [{"name": "RETAINPDF_TOOL_TOKEN", "value": self.token}]}

    def instructions(self):
        python = shlex.quote(sys.executable.replace("\\", "/"))
        script = shlex.quote(self.script.replace("\\", "/"))
        prefix = "& " if os.name == "nt" else ""
        command = f"{prefix}{python} {script} --url {self.url}"
        return (
            "你在 PaperLoom 中回答用户。请用 paperloom 文档工具查询实际内容后回答，引用格式为 [1]、[2]；不要编造引用。"
            + (f"本轮已选定 document_id={self.document_id}，job_id={self.job_id}，直接使用此范围，无需列出文库。\n" if self.document_id else "\n")
            + "search_fulltext 的 snippet 仅用于定位，可能截断；命中后用 read_blocks 读取完整页再核实数字和方法定义。"
            "工具结果的 page 从 1 开始，read_blocks 的 page_idx 从 0 开始；可用 max_blocks=48 读取整页。\n"
            "文档操作通过 PaperLoom 工具创建候选，遵守工具返回的确认要求。\n"
            "若你的 MCP 适配器没有加载这些工具（例如 Pi），用内置 bash/terminal 调用下面的本轮工具桥接。"
            "它与 MCP 提供相同的工具，不需要读取用户库文件。\n"
            f"{'PowerShell' if os.name == 'nt' else 'Shell'} 列出工具：{command} --list\n"
            f"调用工具：{command} --name TOOL_NAME --arguments 'JSON_OBJECT'\n"
            + ("如果使用 Bash，请去掉命令开头的 &。\n" if os.name == "nt" else "")
            + "认证已在 RETAINPDF_TOOL_TOKEN 环境变量中，不要输出此值。工具仅在本轮有效。\n"
        )

    def _operation(self, event):
        id = event.get("operation_id")
        if id:
            self.operations[id] = {k: v for k, v in event.items() if k in {"operation_id", "status", "current_attempt", "latest_event_seq"}}
        self.emit(event)

    def dispatch(self, message):
        self.control.raise_if_stopped()
        method = message.get("method")
        if method == "initialize":
            return {"protocolVersion": message.get("params", {}).get("protocolVersion", "2024-11-05"), "capabilities": {"tools": {}}, "serverInfo": {"name": "paperloom", "version": "0.2.0"}}
        if method == "ping":
            return {}
        if method == "tools/list":
            return {"tools": [{"name": s["function"]["name"], "description": s["function"].get("description", ""), "inputSchema": s["function"]["parameters"]} for s in self.specs]}
        if method != "tools/call":
            raise ValueError("Unsupported MCP method")
        params = message.get("params") or {}
        name, args = params.get("name"), params.get("arguments") or {}
        if name not in self.names or not isinstance(args, dict):
            raise ValueError("Unknown tool")
        with self.lock:
            self.control.raise_if_stopped()
            if len(self.trace) >= 32:
                raise ValueError("Tool budget exhausted")
            call_id = secrets.token_hex(8)
            self.emit(agent_tool_event(name, call_id, "running"))
            if name.startswith("retainpdf_"):
                result = invoke_operation_tool(self.broker, name, args, ran_in_this_turn=self.ran)
            else:
                scoped = scope_tool_arguments(name, args, document_id=self.document_id, job_id=self.job_id)
                if name in CALCULATION_TOOL_NAMES:
                    scoped = with_tool_context(scoped, conversation_id=self.conversation_id, document_id=self.document_id,
                                               job_id=self.job_id, request_message_id=self.request_message_id, tool_call_id=call_id)
                result = self.registry.invoke(name, scoped)
                self.next_ref = assign_refs(result, self.citations, self.next_ref)
                if name not in CALCULATION_TOOL_NAMES:
                    result = public_tool_payload(result)
            status = "failed" if result.get("error") else "completed"
            self.trace.append({"tool": name, "status": status})
            self.emit(agent_tool_event(name, call_id, status, result))
            return {"content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False)}], "isError": bool(result.get("error"))}
