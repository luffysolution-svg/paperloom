#!/usr/bin/env python3
"""PaperLoom's dependency-free stdio MCP bridge.

The bridge intentionally keeps the host adapter small. It discovers the running
PaperLoom API from the same runtime file as the Rust CLI and forwards structured
tool calls to that API. No model or document content is cached here.
"""

from __future__ import annotations

import json
import os
import pathlib
import re
import sys
from datetime import datetime, timezone
import urllib.error
import urllib.parse
import urllib.request
import uuid
from typing import Any

from paper_search import search as search_scholarly_records


PROTOCOL_VERSION = "2025-06-18"
SERVER_VERSION = "0.4.3"


def _envelope(data: Any = None, *, warnings: list[str] | None = None, references: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    return {"ok": True, "data": data, "warnings": warnings or [], "references": references or []}


def _error(message: str, *, code: str = "agent_error") -> dict[str, Any]:
    return {"ok": False, "data": None, "warnings": [message], "references": [], "error": {"code": code, "message": message}}


def _runtime_path() -> pathlib.Path:
    explicit = os.environ.get("RETAINPDF_HOME") or os.environ.get("PAPERLOOM_HOME")
    if explicit:
        return pathlib.Path(explicit) / "run" / "backend.json"
    home = pathlib.Path(os.environ.get("USERPROFILE") or os.environ.get("HOME") or pathlib.Path.home())
    return home / ".paperloom" / "run" / "backend.json"


class PaperLoomApi:
    def __init__(self) -> None:
        self.base = os.environ.get("PAPERLOOM_API_BASE", "").rstrip("/")
        self.api_key = os.environ.get("PAPERLOOM_API_KEY", "")
        if not self.base:
            try:
                runtime = json.loads(_runtime_path().read_text(encoding="utf-8"))
            except (OSError, ValueError):
                runtime = {}
            self.base = str(runtime.get("api_base", "")).rstrip("/")
            self.api_key = self.api_key or str(runtime.get("api_key", ""))

    @property
    def data_dir(self) -> pathlib.Path:
        explicit = os.environ.get("PAPERLOOM_DATA_DIR")
        if explicit:
            return pathlib.Path(explicit).expanduser()
        try:
            runtime = json.loads(_runtime_path().read_text(encoding="utf-8"))
        except (OSError, ValueError):
            runtime = {}
        configured = runtime.get("data_dir")
        return pathlib.Path(configured).expanduser() if configured else pathlib.Path.home() / ".paperloom" / "data"

    def request(self, method: str, path: str, body: Any = None, *, query: dict[str, Any] | None = None) -> Any:
        if not self.base:
            raise RuntimeError("PaperLoom 后端未运行，且没有 PAPERLOOM_API_BASE 或 backend.json")
        url = self.base + path
        if query:
            url += "?" + urllib.parse.urlencode({k: v for k, v in query.items() if v is not None and v != ""})
        headers = {"Accept": "application/json"}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        payload = None
        if body is not None:
            payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=payload, headers=headers, method=method)
        try:
            opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
            with opener.open(req, timeout=600) as response:
                raw = response.read()
                value = json.loads(raw.decode("utf-8")) if raw else None
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            try:
                detail = json.loads(raw)
            except ValueError:
                detail = raw
            raise RuntimeError(f"PaperLoom API HTTP {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"无法连接 PaperLoom 后端: {exc.reason}") from exc
        if isinstance(value, dict) and "data" in value:
            return value["data"]
        return value

    def upload(self, path: pathlib.Path) -> Any:
        if not self.base:
            raise RuntimeError("PaperLoom 后端未运行，且没有 API 配置")
        boundary = "----paperloom-mcp-" + uuid.uuid4().hex
        filename = path.name or "upload.pdf"
        content = path.read_bytes()
        parts = [
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\nContent-Type: application/pdf\r\n\r\n".encode(),
            content,
            f"\r\n--{boundary}--\r\n".encode(),
        ]
        headers = {"Content-Type": f"multipart/form-data; boundary={boundary}", "Accept": "application/json"}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        req = urllib.request.Request(self.base + "/api/v1/uploads", data=b"".join(parts), headers=headers, method="POST")
        try:
            opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
            with opener.open(req, timeout=600) as response:
                value = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, urllib.error.HTTPError) as exc:
            raise RuntimeError(f"PDF 上传失败: {exc}") from exc
        return value.get("data", value) if isinstance(value, dict) else value


TOOLS: list[dict[str, Any]] = [
    {"name": "get_capabilities", "description": "读取 PaperLoom 后端和 Agent 接口能力。", "inputSchema": {"type": "object", "properties": {}}},
    {"name": "list_documents", "description": "列出 PaperLoom 文献。", "inputSchema": {"type": "object", "properties": {"limit": {"type": "integer", "minimum": 1, "maximum": 100}, "offset": {"type": "integer", "minimum": 0}, "q": {"type": "string"}}}},
    {"name": "search_documents", "description": "搜索 PaperLoom 文献正文。", "inputSchema": {"type": "object", "required": ["query"], "properties": {"query": {"type": "string", "minLength": 1}, "limit": {"type": "integer", "minimum": 1, "maximum": 100}, "document_id": {"type": "string"}}}},
    {"name": "search_scholarly", "description": "搜索 OpenAlex、Crossref、Semantic Scholar 和 Europe PMC，并按 DOI 或标题去重。", "inputSchema": {"type": "object", "required": ["query"], "properties": {"query": {"type": "string", "minLength": 1}, "providers": {"type": "array", "items": {"type": "string", "enum": ["openalex", "crossref", "semantic_scholar", "europe_pmc"]}}, "limit": {"type": "integer", "minimum": 1, "maximum": 100}}}},
    {"name": "get_document", "description": "读取文献元数据和关联文件。", "inputSchema": {"type": "object", "required": ["document_id"], "properties": {"document_id": {"type": "string", "minLength": 1}}}},
    {"name": "upload_pdf", "description": "上传单个 PDF 并创建文献记录。", "inputSchema": {"type": "object", "required": ["path"], "properties": {"path": {"type": "string", "minLength": 1}}}},
    {"name": "submit_ocr", "description": "提交单篇 OCR 任务。", "inputSchema": {"type": "object", "required": ["document_id"], "properties": {"document_id": {"type": "string", "minLength": 1}, "options": {"type": "object"}}}},
    {"name": "submit_translation", "description": "提交单篇翻译任务。", "inputSchema": {"type": "object", "required": ["document_id"], "properties": {"document_id": {"type": "string", "minLength": 1}, "options": {"type": "object"}}}},
    {"name": "get_job_status", "description": "读取任务状态和进度。", "inputSchema": {"type": "object", "required": ["job_id"], "properties": {"job_id": {"type": "string", "minLength": 1}}}},
    {"name": "get_job_events", "description": "读取任务进度事件。", "inputSchema": {"type": "object", "required": ["job_id"], "properties": {"job_id": {"type": "string", "minLength": 1}, "limit": {"type": "integer", "minimum": 1, "maximum": 500}}}},
    {"name": "cancel_job", "description": "取消运行中的任务。", "inputSchema": {"type": "object", "required": ["job_id"], "properties": {"job_id": {"type": "string", "minLength": 1}}}},
    {"name": "retry_job", "description": "重试任务阶段。", "inputSchema": {"type": "object", "required": ["job_id", "stage"], "properties": {"job_id": {"type": "string", "minLength": 1}, "stage": {"type": "string", "minLength": 1}}}},
    {"name": "get_document_outline", "description": "读取 Reader 文献目录。", "inputSchema": {"type": "object", "required": ["job_id"], "properties": {"job_id": {"type": "string", "minLength": 1}}}},
    {"name": "get_page_context", "description": "读取指定页面的 OCR、Markdown 和区域上下文。", "inputSchema": {"type": "object", "required": ["job_id", "page"], "properties": {"job_id": {"type": "string", "minLength": 1}, "page": {"type": "integer", "minimum": 1}}}},
    {"name": "get_region_context", "description": "读取一个 Reader 区域及其证据定位。", "inputSchema": {"type": "object", "required": ["job_id", "item_id"], "properties": {"job_id": {"type": "string", "minLength": 1}, "item_id": {"type": "string", "minLength": 1}}}},
    {"name": "get_figure_resource", "description": "读取图表区域、图注上下文和对应页面图像资源。", "inputSchema": {"type": "object", "required": ["job_id", "item_id"], "properties": {"job_id": {"type": "string", "minLength": 1}, "item_id": {"type": "string", "minLength": 1}}}},
    {"name": "validate_evidence", "description": "校验 Agent 回答中的页码、区域、引用和支持等级。", "inputSchema": {"type": "object", "required": ["references"], "properties": {"references": {"type": "array", "minItems": 1, "items": {"type": "object"}}, "support_level": {"type": "string", "enum": ["direct", "inferred", "hypothesis", "unsupported", "conflicting"]}}}},
    {"name": "search_document", "description": "在任务的 Reader 内容中检索。", "inputSchema": {"type": "object", "required": ["query"], "properties": {"query": {"type": "string", "minLength": 1}, "job_id": {"type": "string"}, "document_id": {"type": "string"}, "limit": {"type": "integer", "minimum": 1, "maximum": 100}}}},
    {"name": "export_markdown", "description": "导出任务 Markdown。", "inputSchema": {"type": "object", "required": ["job_id"], "properties": {"job_id": {"type": "string", "minLength": 1}, "output": {"type": "string"}}}},
    {"name": "zotero_status", "description": "读取本机 Zotero 连接状态。", "inputSchema": {"type": "object", "properties": {}}},
    {"name": "zotero_collections", "description": "读取 Zotero 分类。", "inputSchema": {"type": "object", "required": ["library_id"], "properties": {"library_id": {"type": "string", "minLength": 1}}}},
    {"name": "zotero_items", "description": "读取 Zotero 条目和 PDF 附件。", "inputSchema": {"type": "object", "required": ["library_id"], "properties": {"library_id": {"type": "string", "minLength": 1}, "collection_key": {"type": "string"}, "q": {"type": "string"}, "limit": {"type": "integer", "minimum": 1, "maximum": 100}}}},
    {"name": "import_zotero_attachments", "description": "将 Zotero PDF 附件导入 PaperLoom。执行前需确认。", "inputSchema": {"type": "object", "required": ["library_id", "attachments"], "properties": {"library_id": {"type": "string", "minLength": 1}, "collection_key": {"type": "string"}, "attachments": {"type": "array", "minItems": 1, "items": {"type": "object", "required": ["item_key", "attachment_key"], "properties": {"item_key": {"type": "string"}, "attachment_key": {"type": "string"}}}}, "confirmed": {"type": "boolean"}}}},
    {"name": "obsidian_status", "description": "读取可发现的 Obsidian Vault。", "inputSchema": {"type": "object", "properties": {}}},
    {"name": "export_obsidian", "description": "将任务 Markdown 写入 Obsidian。执行前需确认。", "inputSchema": {"type": "object", "required": ["job_id", "vault_id"], "properties": {"job_id": {"type": "string", "minLength": 1}, "vault_id": {"type": "string", "minLength": 1}, "folder": {"type": "string"}, "include_source": {"type": "boolean"}, "on_conflict": {"type": "string", "enum": ["ask", "rename", "overwrite", "skip"]}, "confirmed": {"type": "boolean"}}}},
    {"name": "writeback_zotero", "description": "将译文 PDF 写回 Zotero。执行前需确认。", "inputSchema": {"type": "object", "required": ["job_id"], "properties": {"job_id": {"type": "string", "minLength": 1}, "confirmed": {"type": "boolean"}}}},
    {"name": "run_batch_workflow", "description": "以 dry-run 或逐项任务方式执行批量 OCR/翻译，并持久化运行记录。", "inputSchema": {"type": "object", "required": ["items", "action"], "properties": {"items": {"type": "array", "minItems": 1, "items": {"type": "object", "properties": {"path": {"type": "string"}, "document_id": {"type": "string"}}}}, "action": {"type": "string", "enum": ["ocr", "translate"]}, "dry_run": {"type": "boolean"}, "confirmed": {"type": "boolean"}, "max_items": {"type": "integer", "minimum": 1, "maximum": 10000}, "failure_policy": {"type": "string", "enum": ["continue", "stop"]}, "options": {"type": "object"}}}},
    {"name": "get_run_status", "description": "读取批量工作流的清单、逐项状态和事件。", "inputSchema": {"type": "object", "required": ["run_id"], "properties": {"run_id": {"type": "string", "minLength": 1}}}},
]


def _required(args: dict[str, Any], names: list[str]) -> None:
    missing = [name for name in names if not isinstance(args.get(name), str) or not args[name].strip()]
    if missing:
        raise ValueError("缺少必填参数: " + ", ".join(missing))


def _run_dir(api: PaperLoomApi, run_id: str) -> pathlib.Path:
    if not re.fullmatch(r"[a-f0-9]{32}", run_id):
        raise ValueError("run_id 格式无效")
    return api.data_dir / "agent-runs" / run_id


def _write_run_event(run_dir: pathlib.Path, event: dict[str, Any]) -> None:
    with (run_dir / "events.jsonl").open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(event, ensure_ascii=False, separators=(",", ":")) + "\n")


def _batch_workflow(args: dict[str, Any], api: PaperLoomApi) -> dict[str, Any]:
    items = args.get("items")
    action = args.get("action")
    if not isinstance(items, list) or not items:
        raise ValueError("items 必须是非空数组")
    if action not in {"ocr", "translate"}:
        raise ValueError("action 只能是 ocr 或 translate")
    if "dry_run" in args and not isinstance(args["dry_run"], bool):
        raise ValueError("dry_run 必须是布尔值")
    dry_run = bool(args.get("dry_run", True))
    if not dry_run and args.get("confirmed") is not True:
        raise ValueError("批量 OCR/翻译会产生任务或费用，请在 confirmed=true 后再次调用")
    failure_policy = args.get("failure_policy", "continue")
    if failure_policy not in {"continue", "stop"}:
        raise ValueError("failure_policy 只能是 continue 或 stop")
    max_items = args.get("max_items", len(items))
    if not isinstance(max_items, int) or max_items < 1 or max_items > 10000:
        raise ValueError("max_items 必须在 1 到 10000 之间")
    selected = items[:max_items]
    plan: list[dict[str, Any]] = []
    for index, item in enumerate(selected):
        if not isinstance(item, dict):
            raise ValueError(f"items[{index}] 必须是对象")
        document_id = item.get("document_id")
        path = item.get("path")
        if document_id and path:
            raise ValueError(f"items[{index}] 只能提供 document_id 或 path 之一")
        if not document_id and not path:
            raise ValueError(f"items[{index}] 缺少 document_id 或 path")
        if path:
            source = pathlib.Path(str(path)).expanduser()
            if source.suffix.lower() != ".pdf" or not source.is_file():
                raise ValueError(f"items[{index}] path 必须是存在的 PDF 文件")
            plan.append({"index": index, "path": str(source), "document_id": None})
        else:
            plan.append({"index": index, "path": None, "document_id": str(document_id)})
    run_id = uuid.uuid4().hex
    run_dir = api.data_dir / "agent-runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    manifest = {
        "schema_version": "agent-run-manifest.v1",
        "run_id": run_id,
        "created_at": now,
        "updated_at": now,
        "command": "run_batch_workflow",
        "paperloom_version": "0.4.3",
        "inputs": plan,
        "options": {
            "action": action,
            "dry_run": dry_run,
            "max_items": max_items,
            "failure_policy": failure_policy,
            "parameters": args.get("options") if isinstance(args.get("options"), dict) else {},
        },
        "items": [
            {
                "item_id": str(item["index"]),
                "source": item.get("path") or item.get("document_id"),
                "document_id": item.get("document_id"),
                "status": "planned",
            }
            for item in plan
        ],
        "outputs": ["manifest.json", "events.jsonl", "results.json"],
    }
    (run_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (run_dir / "evidence.json").write_text("[]\n", encoding="utf-8")
    (run_dir / "claims.json").write_text("[]\n", encoding="utf-8")
    (run_dir / "errors.jsonl").write_text("", encoding="utf-8")
    (run_dir / "outputs").mkdir(exist_ok=True)
    results: list[dict[str, Any]] = []
    _write_run_event(run_dir, {"event": "run_created", "run_id": run_id, "items": len(plan), "dry_run": dry_run})
    if dry_run:
        results = [{**item, "status": "planned", "job_id": None} for item in plan]
    else:
        for item in plan:
            current = {**item, "status": "running", "job_id": None}
            try:
                document_id = item["document_id"]
                if item["path"]:
                    uploaded = api.upload(pathlib.Path(item["path"]))
                    document_id = uploaded.get("document_id") or uploaded.get("id") if isinstance(uploaded, dict) else None
                    if not document_id:
                        raise RuntimeError("上传响应没有 document_id")
                    current["document_id"] = document_id
                body = manifest["options"]["parameters"]
                submitted = api.request("POST", f"/api/v1/documents/{urllib.parse.quote(str(document_id), safe='')}/{action}", body)
                job_id = submitted.get("job_id") or submitted.get("id") if isinstance(submitted, dict) else None
                current.update({"status": "submitted", "job_id": job_id})
                manifest_item = next(entry for entry in manifest["items"] if entry["item_id"] == str(item["index"]))
                manifest_item.update({"status": "queued", "document_id": document_id, "job_id": job_id})
                _write_run_event(run_dir, {"event": "item_submitted", "index": item["index"], "document_id": document_id, "job_id": job_id})
            except Exception as exc:
                current.update({"status": "failed", "error": str(exc)})
                manifest_item = next(entry for entry in manifest["items"] if entry["item_id"] == str(item["index"]))
                manifest_item.update({"status": "failed", "error": str(exc)})
                _write_run_event(run_dir, {"event": "item_failed", "index": item["index"], "error": str(exc)})
                if failure_policy == "stop":
                    results.append(current)
                    break
            results.append(current)
    manifest["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    (run_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (run_dir / "results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    _write_run_event(run_dir, {"event": "run_finished", "run_id": run_id, "completed": len(results)})
    return {"run_id": run_id, "status": "planned" if dry_run else "submitted", "dry_run": dry_run, "items": results, "run_dir": str(run_dir)}


def _run_status(args: dict[str, Any], api: PaperLoomApi) -> dict[str, Any]:
    _required(args, ["run_id"])
    run_dir = _run_dir(api, args["run_id"])
    if not run_dir.is_dir():
        raise ValueError("未找到该 run_id")
    def read_json(name: str, fallback: Any) -> Any:
        try:
            return json.loads((run_dir / name).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return fallback
    events = []
    try:
        events = [json.loads(line) for line in (run_dir / "events.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    except OSError:
        pass
    return {"run_id": args["run_id"], "manifest": read_json("manifest.json", {}), "items": read_json("results.json", []), "events": events}


def _call_tool(name: str, args: dict[str, Any], api: PaperLoomApi) -> dict[str, Any]:
    if name == "get_capabilities":
        ready = api.request("GET", "/ready")
        return _envelope({"mcp": {"protocol_version": PROTOCOL_VERSION, "tools": [tool["name"] for tool in TOOLS]}, "backend": ready})
    if name == "list_documents":
        return _envelope(api.request("GET", "/api/v1/documents", query={"limit": args.get("limit", 20), "offset": args.get("offset", 0), "q": args.get("q", "")}))
    if name == "search_documents":
        _required(args, ["query"])
        return _envelope(api.request("GET", "/api/v1/search", query={"q": args["query"], "limit": args.get("limit", 20), "document_id": args.get("document_id")}))
    if name == "search_scholarly":
        _required(args, ["query"])
        records, warnings = search_scholarly_records(args["query"], providers=args.get("providers"), limit=args.get("limit", 10))
        return _envelope({"query": args["query"], "results": records, "providers": args.get("providers") or ["openalex", "crossref", "semantic_scholar", "europe_pmc"]}, warnings=warnings, references=[{"source_kind": "external", "uri": "https://api.openalex.org/"}])
    if name == "get_document":
        _required(args, ["document_id"])
        return _envelope(api.request("GET", "/api/v1/documents/" + urllib.parse.quote(args["document_id"], safe="")))
    if name == "upload_pdf":
        _required(args, ["path"])
        path = pathlib.Path(args["path"]).expanduser()
        if path.suffix.lower() != ".pdf" or not path.is_file():
            raise ValueError("path 必须是存在的 PDF 文件")
        return _envelope(api.upload(path))
    if name in {"submit_ocr", "submit_translation"}:
        _required(args, ["document_id"])
        route = "ocr" if name == "submit_ocr" else "translate"
        body = args.get("options") if isinstance(args.get("options"), dict) else {}
        return _envelope(api.request("POST", f"/api/v1/documents/{urllib.parse.quote(args['document_id'], safe='')}/{route}", body))
    if name == "get_job_status":
        _required(args, ["job_id"])
        return _envelope(api.request("GET", "/api/v1/jobs/" + urllib.parse.quote(args["job_id"], safe="")))
    if name == "get_job_events":
        _required(args, ["job_id"])
        return _envelope(api.request("GET", f"/api/v1/jobs/{urllib.parse.quote(args['job_id'], safe='')}/progress/events", query={"limit": args.get("limit", 100)}))
    if name in {"cancel_job", "retry_job"}:
        _required(args, ["job_id"])
        action = "cancel" if name == "cancel_job" else "retry-stage"
        if name == "retry_job":
            _required(args, ["stage"])
        body = {"stage": args["stage"]} if name == "retry_job" and args.get("stage") else {}
        return _envelope(api.request("POST", f"/api/v1/jobs/{urllib.parse.quote(args['job_id'], safe='')}/actions/{action}", body))
    if name == "get_document_outline":
        _required(args, ["job_id"])
        return _envelope(api.request("GET", f"/api/v1/jobs/{urllib.parse.quote(args['job_id'], safe='')}/reader/metadata"))
    if name == "get_page_context":
        _required(args, ["job_id"])
        page = args.get("page")
        if not isinstance(page, int) or page < 1:
            raise ValueError("page 必须是正整数")
        result = {"metadata": api.request("GET", f"/api/v1/jobs/{urllib.parse.quote(args['job_id'], safe='')}/reader/metadata"), "page": api.request("GET", f"/api/v1/jobs/{urllib.parse.quote(args['job_id'], safe='')}/progress/pages/{page}"), "regions": api.request("GET", f"/api/v1/jobs/{urllib.parse.quote(args['job_id'], safe='')}/reader/regions", query={"page": page})}
        return _envelope(result, references=[{"job_id": args["job_id"], "page": page, "source_kind": "page"}])
    if name == "get_region_context":
        _required(args, ["job_id", "item_id"])
        return _envelope(api.request("GET", f"/api/v1/jobs/{urllib.parse.quote(args['job_id'], safe='')}/reader/regions/{urllib.parse.quote(args['item_id'], safe='')}"), references=[{"job_id": args["job_id"], "item_id": args["item_id"], "source_kind": "region"}])
    if name == "get_figure_resource":
        _required(args, ["job_id", "item_id"])
        job_id = urllib.parse.quote(args["job_id"], safe="")
        item_id = urllib.parse.quote(args["item_id"], safe="")
        region = api.request("GET", f"/api/v1/jobs/{job_id}/reader/regions/{item_id}")
        page = None
        if isinstance(region, dict):
            for key in ("page", "page_idx", "page_number"):
                value = region.get(key)
                if isinstance(value, int):
                    page = value if key != "page_idx" else value + 1
                    break
        if page is None:
            raise ValueError("图表区域没有可用页码")
        image_uri = f"{api.base}/api/v1/jobs/{job_id}/files/pages/{page}"
        return _envelope(
            {"region": region, "page": page, "image": {"uri": image_uri, "mime_type": "image/jpeg"}},
            references=[{"job_id": args["job_id"], "item_id": args["item_id"], "page": page, "source_kind": "region", "uri": image_uri}],
        )
    if name == "validate_evidence":
        references = args.get("references")
        if not isinstance(references, list) or not references:
            raise ValueError("references 必须是非空数组")
        allowed = {"document", "job", "region", "page", "external", "user"}
        valid: list[dict[str, Any]] = []
        invalid: list[dict[str, Any]] = []
        for index, reference in enumerate(references):
            if not isinstance(reference, dict):
                invalid.append({"index": index, "reason": "引用必须是对象"})
                continue
            source_kind = reference.get("source_kind")
            reason = None
            if source_kind not in allowed:
                reason = "source_kind 无效"
            elif source_kind in {"job", "region", "page"} and not str(reference.get("job_id") or "").strip():
                reason = "缺少 job_id"
            elif source_kind == "region" and not str(reference.get("item_id") or "").strip():
                reason = "缺少 item_id"
            elif source_kind == "page" and (not isinstance(reference.get("page"), int) or reference["page"] < 1):
                reason = "page 必须是正整数"
            elif source_kind in {"document", "region", "page"} and not str(reference.get("quote") or "").strip():
                reason = "缺少 quote"
            if reason:
                invalid.append({"index": index, "reason": reason})
            else:
                valid.append(reference)
        support_level = args.get("support_level", "direct")
        if support_level not in {"direct", "inferred", "hypothesis", "unsupported", "conflicting"}:
            raise ValueError("support_level 无效")
        return _envelope({"valid": len(invalid) == 0, "support_level": support_level, "valid_references": valid, "invalid_references": invalid})
    if name == "search_document":
        _required(args, ["query"])
        return _envelope(api.request("GET", "/api/v1/search", query={"q": args["query"], "limit": args.get("limit", 20), "document_id": args.get("document_id")}))
    if name == "export_markdown":
        _required(args, ["job_id"])
        data = api.request("GET", f"/api/v1/jobs/{urllib.parse.quote(args['job_id'], safe='')}/reader/markdown")
        if args.get("output"):
            pathlib.Path(args["output"]).expanduser().write_text(data if isinstance(data, str) else json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            data = {"output": str(pathlib.Path(args["output"]).expanduser()), "content": data}
        return _envelope(data, references=[{"job_id": args["job_id"], "source_kind": "job"}])
    if name == "zotero_status":
        return _envelope(api.request("GET", "/api/v1/integrations/zotero"))
    if name == "zotero_collections":
        _required(args, ["library_id"])
        return _envelope(api.request("GET", "/api/v1/integrations/zotero/collections", query={"library_id": args["library_id"]}))
    if name == "zotero_items":
        _required(args, ["library_id"])
        return _envelope(api.request("GET", "/api/v1/integrations/zotero/items", query={"library_id": args["library_id"], "collection_key": args.get("collection_key"), "q": args.get("q"), "limit": args.get("limit", 50)}))
    if name == "import_zotero_attachments":
        _required(args, ["library_id"])
        if not isinstance(args.get("attachments"), list) or not args["attachments"]:
            raise ValueError("attachments 必须是非空数组")
        if args.get("confirmed") is not True:
            return _envelope(None, warnings=["这是写入 PaperLoom 书库的操作。请在 confirmed=true 后再次调用。"])
        body = {key: args[key] for key in ("library_id", "collection_key", "attachments") if key in args}
        return _envelope(api.request("POST", "/api/v1/integrations/zotero/import", body))
    if name == "obsidian_status":
        return _envelope(api.request("GET", "/api/v1/integrations/obsidian"))
    if name == "export_obsidian":
        _required(args, ["job_id", "vault_id"])
        if args.get("confirmed") is not True:
            return _envelope(None, warnings=["这是写入 Obsidian 的操作。请在 confirmed=true 后再次调用。"])
        body = {key: args[key] for key in ("vault_id", "folder", "include_source", "on_conflict") if key in args}
        return _envelope(api.request("POST", f"/api/v1/jobs/{urllib.parse.quote(args['job_id'], safe='')}/obsidian/export", body))
    if name == "writeback_zotero":
        _required(args, ["job_id"])
        if args.get("confirmed") is not True:
            return _envelope(None, warnings=["这是写回 Zotero 的操作。请在 confirmed=true 后再次调用。"])
        return _envelope(api.request("POST", f"/api/v1/jobs/{urllib.parse.quote(args['job_id'], safe='')}/zotero/writeback"))
    if name == "run_batch_workflow":
        return _envelope(_batch_workflow(args, api))
    if name == "get_run_status":
        return _envelope(_run_status(args, api))
    raise KeyError(name)


PROMPTS = {
    "read_paper": "按问题检索 PaperLoom 的 Reader 资源，先给出带页码和 item_id 的证据，再分别写作者原文、Agent 解读和待验证假设。",
    "explain_method": "拆解论文的方法、假设、数据集、基线、指标和实验条件，并为每个关键结论保留证据定位。",
    "interpret_figure": "读取图题、图注、坐标轴、图例和相关正文，解释趋势、对照、异常和作者结论，区分观察和推断。",
    "compare_papers": "按研究问题、方法、数据、指标、结果、局限和证据强度建立跨文献比较表。",
    "build_evidence_matrix": "建立 claim、source、page、item_id、quote、support_level 的证据矩阵。",
    "draft_literature_review": "基于已检索和去重的文献生成综述提纲，保留检索日期、纳入规则、排除记录和证据矩阵。",
    "prepare_obsidian_note": "生成可增量更新的 Obsidian 笔记，只更新 PaperLoom 管理区块并保留用户手写内容。",
    "review_translation_quality": "按术语、公式、图表、段落完整性和页级证据检查翻译质量，列出问题所在 item_id 和建议修订。",
}


def _resource_read(uri: str, api: PaperLoomApi) -> dict[str, Any]:
    parsed = urllib.parse.urlparse(uri)
    if parsed.scheme != "paperloom":
        raise ValueError("只支持 paperloom:// 资源")
    bits = [urllib.parse.unquote(part) for part in ([parsed.netloc] + parsed.path.strip("/").split("/")) if part]
    if bits[:1] == ["documents"] and len(bits) == 3 and bits[2] in {"metadata", "outline"}:
        endpoint = "" if bits[2] == "metadata" else "/reading"
        return _envelope(api.request("GET", f"/api/v1/documents/{urllib.parse.quote(bits[1], safe='')}{endpoint}"))
    if bits[:1] == ["jobs"] and len(bits) >= 3:
        job = urllib.parse.quote(bits[1], safe="")
        if bits[2] == "markdown":
            return _envelope(api.request("GET", f"/api/v1/jobs/{job}/reader/markdown"))
        if bits[2] == "regions":
            path = f"/api/v1/jobs/{job}/reader/regions" + (f"/{urllib.parse.quote(bits[3], safe='')}" if len(bits) > 3 else "")
            return _envelope(api.request("GET", path))
        if bits[2] == "reports" and len(bits) == 4:
            return _envelope(api.request("GET", f"/api/v1/jobs/{job}/reports/{bits[3]}"))
        if bits[2] == "pages" and len(bits) == 5 and bits[4] == "image":
            page = urllib.parse.quote(bits[3], safe="")
            return _envelope({"uri": f"{api.base}/api/v1/jobs/{job}/files/pages/{page}", "mime_type": "image/jpeg"})
    if bits[:1] == ["runs"] and len(bits) == 3:
        run_id = bits[1]
        run_dir = _run_dir(api, run_id)
        if bits[2] == "evidence":
            path = run_dir / "evidence.json"
        elif bits[2] == "manifest":
            path = run_dir / "manifest.json"
        elif bits[2] == "status":
            return _envelope(_run_status({"run_id": run_id}, api))
        else:
            raise ValueError("未知 run 资源")
        try:
            return _envelope(json.loads(path.read_text(encoding="utf-8")))
        except FileNotFoundError as exc:
            raise ValueError("未找到该 run 资源") from exc
    raise ValueError("未知 paperloom 资源 URI")


def handle(request: dict[str, Any], api: PaperLoomApi) -> dict[str, Any] | None:
    method = request.get("method")
    request_id = request.get("id")
    if method == "notifications/initialized":
        return None
    if method == "initialize":
        return {"jsonrpc": "2.0", "id": request_id, "result": {"protocolVersion": PROTOCOL_VERSION, "capabilities": {"tools": {}, "resources": {"subscribe": False, "listChanged": False}, "prompts": {"listChanged": False}}, "serverInfo": {"name": "paperloom", "version": SERVER_VERSION}}}
    if method == "ping":
        return {"jsonrpc": "2.0", "id": request_id, "result": {}}
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": request_id, "result": {"tools": TOOLS}}
    if method == "resources/list":
        return {"jsonrpc": "2.0", "id": request_id, "result": {"resources": [{"uri": "paperloom://documents/{document_id}/metadata", "name": "Document metadata", "mimeType": "application/json"}, {"uri": "paperloom://documents/{document_id}/outline", "name": "Document outline", "mimeType": "application/json"}, {"uri": "paperloom://jobs/{job_id}/markdown", "name": "Reader Markdown", "mimeType": "text/markdown"}, {"uri": "paperloom://jobs/{job_id}/regions", "name": "Reader regions", "mimeType": "application/json"}, {"uri": "paperloom://jobs/{job_id}/reports/{report}", "name": "Job report", "mimeType": "application/json"}, {"uri": "paperloom://jobs/{job_id}/pages/{page}/image", "name": "Page image", "mimeType": "image/jpeg"}, {"uri": "paperloom://runs/{run_id}/evidence", "name": "Batch evidence", "mimeType": "application/json"}, {"uri": "paperloom://runs/{run_id}/manifest", "name": "Batch manifest", "mimeType": "application/json"}]}}
    if method == "resources/read":
        try:
            result = _resource_read(str(request.get("params", {}).get("uri", "")), api)
            return {"jsonrpc": "2.0", "id": request_id, "result": {"contents": [{"uri": request["params"]["uri"], "mimeType": "application/json", "text": json.dumps(result, ensure_ascii=False)}]}}
        except Exception as exc:
            return {"jsonrpc": "2.0", "id": request_id, "error": {"code": -32000, "message": str(exc)}}
    if method == "prompts/list":
        return {"jsonrpc": "2.0", "id": request_id, "result": {"prompts": [{"name": name, "description": prompt} for name, prompt in PROMPTS.items()]}}
    if method == "prompts/get":
        name = str(request.get("params", {}).get("name", ""))
        if name not in PROMPTS:
            return {"jsonrpc": "2.0", "id": request_id, "error": {"code": -32602, "message": "unknown prompt"}}
        return {"jsonrpc": "2.0", "id": request_id, "result": {"description": PROMPTS[name], "messages": [{"role": "user", "content": {"type": "text", "text": PROMPTS[name]}}]}}
    if method == "tools/call":
        params = request.get("params") or {}
        name = params.get("name")
        args = params.get("arguments") or {}
        try:
            value = _call_tool(str(name), args, api)
            return {"jsonrpc": "2.0", "id": request_id, "result": {"content": [{"type": "text", "text": json.dumps(value, ensure_ascii=False)}], "structuredContent": value, "isError": not value.get("ok", False)}}
        except KeyError:
            return {"jsonrpc": "2.0", "id": request_id, "error": {"code": -32602, "message": f"unknown tool: {name}"}}
        except (ValueError, RuntimeError, OSError) as exc:
            value = _error(str(exc), code="invalid_request" if isinstance(exc, ValueError) else "backend_error")
            return {"jsonrpc": "2.0", "id": request_id, "result": {"content": [{"type": "text", "text": json.dumps(value, ensure_ascii=False)}], "structuredContent": value, "isError": True}}
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": -32601, "message": f"method not found: {method}"}}


def main() -> int:
    api = PaperLoomApi()
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            request = json.loads(line)
            response = handle(request, api)
            if response is not None:
                sys.stdout.write(json.dumps(response, ensure_ascii=False, separators=(",", ":")) + "\n")
                sys.stdout.flush()
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": str(exc)}}, ensure_ascii=False) + "\n")
            sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
