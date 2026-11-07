"""Session-scoped document tools shared by MCP-capable agents and Pi's CLI."""
from __future__ import annotations

import json
import secrets
import sys
import threading
import os
import shlex
from pathlib import Path
from dataclasses import asdict

from .agent import assign_refs, public_tool_payload, scope_tool_arguments, tool_specs_for_scope
from .agent_command_broker import AgentCommandBroker, BrokerScope
from .runtimes.openai_operations import DOCUMENT_AGENT_TOOLS, invoke_operation_tool
from .unified_tools import CALCULATION_TOOL_NAMES, agent_tool_event, with_tool_context
from .acp_sessions import ToolEndpoint


class ToolBridge:
    def __init__(self, settings, rust, registry, *, conversation_id, document_id, job_id, request_message_id, question, confirmed, emit, control, gateway=None, visual_tools=True):
        self.registry = registry
        self.visual_tools = visual_tools
        self.control = control
        self.emit = emit
        self.conversation_id, self.document_id, self.job_id = conversation_id, document_id, job_id
        self.request_message_id = request_message_id
        self.citations, self.trace, self.operations = {}, [], {}
        self.lock = threading.Lock()
        self.operation_lock = threading.Lock()
        self.call_count = 0
        self.next_ref = 1
        self.ran = set()
        self.endpoint = gateway or ToolEndpoint()
        self.owns_endpoint = gateway is None
        self.token = self.endpoint.token
        self.script = str(Path(__file__).with_name("acp_tools.py"))
        self.operation_tools = bool(document_id and request_message_id and rust)
        reading = tool_specs_for_scope(registry, document_id, job_id) if registry and (document_id or job_id) else registry.specs(frozenset({"list_documents", "search_fulltext", "read_blocks", "read_figure", "search_favorites"})) if registry else []
        self.specs = [*reading, *(DOCUMENT_AGENT_TOOLS if self.operation_tools else [])]
        self.names = {s["function"]["name"] for s in self.specs}
        self.broker = AgentCommandBroker(state_root=settings.data_root / "agent-runtime" / "byoa", cli_command=settings.agent_cli_command or settings.fx_agent_cli_command,
            rust_api_url=settings.rust_api_base, rust=rust, host_only=True,
            scope=BrokerScope(conversation_id=conversation_id, document_id=document_id, job_id=job_id, request_message_id=request_message_id,
                              intent_summary=question, confirmed=confirmed, green_light=settings.agent_confirmation_mode == "green_light"),
            on_operation_event=self._operation) if self.operation_tools else None
        self.url = self.endpoint.url

    def __enter__(self):
        if self.broker:
            self.broker.__enter__()
        self.endpoint.delegate = self
        self.endpoint.tools = self.dispatch({"method": "tools/list"})["tools"]
        return self

    def __exit__(self, *_args):
        self.endpoint.delegate = None
        if self.owns_endpoint:
            self.endpoint.close()
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
            "图表视觉解读请调用 read_figure 查看实际图片，并结合图注和正文。没有读到图片时说明依据是图注与正文。\n"
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
            if self.call_count >= 32:
                raise ValueError("Tool budget exhausted")
            self.call_count += 1
        call_id = secrets.token_hex(8)
        self.emit({**agent_tool_event(name, call_id, "running"), "input": args})
        images = []
        if name.startswith("retainpdf_"):
            with self.operation_lock:
                result = invoke_operation_tool(self.broker, name, args, ran_in_this_turn=self.ran)
        else:
            scoped = scope_tool_arguments(name, args, document_id=self.document_id, job_id=self.job_id)
            if name in CALCULATION_TOOL_NAMES:
                scoped = with_tool_context(scoped, conversation_id=self.conversation_id, document_id=self.document_id,
                                           job_id=self.job_id, request_message_id=self.request_message_id, tool_call_id=call_id)
            result = self.registry.invoke(name, scoped)
            images = result.pop("_images", [])
            if images and not self.visual_tools:
                images = []
                result["hint"] = "当前 Agent 的工具连接不支持图片内容。请依据图注与正文说明，或请用户直接添加图片，不能声称已经查看原图。"
            with self.lock:
                self.next_ref = assign_refs(result, self.citations, self.next_ref)
            if name not in CALCULATION_TOOL_NAMES:
                result = public_tool_payload(result)
        status = "failed" if result.get("error") else "completed"
        with self.lock:
            self.trace.append({"tool": name, "status": status})
            citations = [asdict(c) for c in self.citations.values()]
        event = agent_tool_event(name, call_id, status, result)
        if name == "read_blocks" and not result.get("error"):
            event["summary"] = f"第 {int(args.get('page_idx', 0)) + 1} 页，读取 {len(result.get('blocks', []))} 个内容块"
        elif name == "search_fulltext" and not result.get("error"):
            event["summary"] = f"找到 {len(result.get('hits', []))} 处相关内容"
        if name == "read_figure":
            event.update(summary=f"已查看 {len(images)} 张图表图片" if images else "未找到可读取的图表图片", image_count=len(images))
        self.emit(event)
        if citations:
            self.emit({"type": "citations", "citations": citations})
        return {"content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False)}, *images], "isError": bool(result.get("error"))}
