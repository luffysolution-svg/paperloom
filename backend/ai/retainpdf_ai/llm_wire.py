"""Native provider wires, normalized to the host's existing tool-call contract."""
from __future__ import annotations

import json
from typing import Any, Callable, Iterable

from .request_control import AIStreamIncomplete, RequestControl

PROTOCOLS = ("openai", "openai_responses", "anthropic")


def endpoint(base_url: str, protocol: str) -> str:
    base = base_url.strip().rstrip("/")
    for suffix in ("/chat/completions", "/responses", "/messages"):
        if base.endswith(suffix):
            base = base[:-len(suffix)]
            break
    if protocol == "anthropic" and not base.endswith("/v1"):
        base += "/v1"
    return base + {"openai": "/chat/completions", "openai_responses": "/responses", "anthropic": "/messages"}[protocol]


def headers(api_key: str, protocol: str) -> dict[str, str]:
    if protocol == "anthropic":
        return {"x-api-key": api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"}
    return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}


def request_body(protocol: str, model: str, messages: list[dict], tools: list[dict]) -> dict:
    if protocol == "openai":
        body = {"model": model, "messages": [{k: v for k, v in m.items() if not k.startswith("_")} for m in messages]}
        if tools:
            body["tools"] = tools
        return body
    system = "\n\n".join(str(m.get("content") or "") for m in messages if m.get("role") in {"system", "developer"})
    turns: list[dict] = []
    for message in messages:
        role = message.get("role")
        if role in {"system", "developer"}:
            continue
        if protocol == "openai_responses":
            if message.get("_responses_output"):
                turns.extend(message["_responses_output"])
            elif role == "tool":
                turns.append({"type": "function_call_output", "call_id": message["tool_call_id"], "output": message.get("content") or ""})
            else:
                if message.get("content"):
                    turns.append({"role": role, "content": message["content"]})
                for call in message.get("tool_calls") or []:
                    turns.append({"type": "function_call", "call_id": call["id"], **call["function"]})
        else:
            if role == "tool":
                turn = {"role": "user", "content": [{"type": "tool_result", "tool_use_id": message["tool_call_id"], "content": message.get("content") or ""}]}
            else:
                content = message.get("_anthropic_content")
                if content is None:
                    content = [{"type": "text", "text": message["content"]}] if message.get("content") else []
                    for call in message.get("tool_calls") or []:
                        content.append({"type": "tool_use", "id": call["id"], "name": call["function"]["name"], "input": json.loads(call["function"]["arguments"])})
                turn = {"role": role, "content": content}
            if turns and turns[-1]["role"] == turn["role"]:
                turns[-1]["content"].extend(turn["content"])
            else:
                turns.append(turn)
    if protocol == "openai_responses":
        body = {"model": model, "input": turns, "instructions": system, "store": False, "include": ["reasoning.encrypted_content"]}
        if tools:
            body["tools"] = [{"type": "function", **t["function"], "strict": False} for t in tools]
        return body
    body = {"model": model, "system": system, "messages": turns, "max_tokens": 16384}
    if tools:
        body["tools"] = [{"name": t["function"]["name"], "description": t["function"].get("description", ""), "input_schema": t["function"]["parameters"]} for t in tools]
    return body


def response_message(protocol: str, data: dict) -> dict:
    if protocol == "openai":
        return data["choices"][0]["message"]
    calls = []
    text = []
    result: dict[str, Any] = {"role": "assistant"}
    if protocol == "openai_responses":
        if data.get("status") != "completed" or data.get("error"):
            raise AIStreamIncomplete()
        output = data.get("output") or []
        result["_responses_output"] = output
        for item in output:
            if item.get("type") == "function_call":
                calls.append({"id": item["call_id"], "type": "function", "function": {"name": item["name"], "arguments": item["arguments"]}})
            elif item.get("type") == "message":
                text.extend(p.get("text") or p.get("refusal") or "" for p in item.get("content") or [])
    else:
        if data.get("stop_reason") not in {"end_turn", "tool_use", "stop_sequence"}:
            raise AIStreamIncomplete()
        result["_anthropic_content"] = data.get("content") or []
        for part in result["_anthropic_content"]:
            if part.get("type") == "text":
                text.append(part.get("text") or "")
            elif part.get("type") == "tool_use":
                calls.append({"id": part["id"], "type": "function", "function": {"name": part["name"], "arguments": json.dumps(part["input"], ensure_ascii=False)}})
    result["content"] = "".join(text)
    if calls:
        result["tool_calls"] = calls
    return result


def stream_message(protocol: str, lines: Iterable, on_delta: Callable | None, control: RequestControl | None) -> dict:
    """Use completed provider items as truth; retain signed/encrypted reasoning."""
    output: dict[int, dict] = {}
    blocks: dict[int, dict] = {}
    stop_reason = None
    completed = None
    stopped = False
    pending: list[str] = []
    has_tools = False
    for raw in lines:
        if control:
            control.raise_if_stopped()
        line = raw.decode("utf-8") if isinstance(raw, bytes) else raw
        if not line.startswith("data:"):
            continue
        try:
            event = json.loads(line[5:].strip())
        except (ValueError, TypeError) as exc:
            raise AIStreamIncomplete() from exc
        kind = event.get("type", "")
        if kind in {"error", "response.failed", "response.incomplete"}:
            raise AIStreamIncomplete()
        piece = ""
        if protocol == "openai_responses":
            if kind == "response.output_text.delta":
                piece = event.get("delta") or ""
            elif kind == "response.output_item.added" and event.get("item", {}).get("type") == "function_call":
                has_tools = True
                pending.clear()
            elif kind == "response.output_item.done":
                output[event["output_index"]] = event["item"]
            elif kind == "response.completed":
                completed = event["response"]
                break
        else:
            index = event.get("index", 0)
            if kind == "content_block_start":
                blocks[index] = dict(event["content_block"])
                if blocks[index]["type"] == "tool_use":
                    has_tools = True
                    pending.clear()
            elif kind == "content_block_delta":
                delta = event.get("delta") or {}
                block = blocks.get(index)
                if block is None:
                    raise AIStreamIncomplete()
                field = {"text_delta": "text", "input_json_delta": "_json", "thinking_delta": "thinking", "signature_delta": "signature"}.get(delta.get("type"))
                if field:
                    value = delta.get("partial_json") if field == "_json" else delta.get(field)
                    block[field] = block.get(field, "") + (value or "")
                if delta.get("type") == "text_delta":
                    piece = delta.get("text") or ""
            elif kind == "message_delta":
                stop_reason = event.get("delta", {}).get("stop_reason")
            elif kind == "message_stop":
                stopped = True
                break
        if piece and not has_tools:
            pending.append(piece)
            if on_delta and sum(map(len, pending)) >= 64:
                on_delta("".join(pending))
                pending.clear()
    if protocol == "openai_responses":
        if completed is None:
            raise AIStreamIncomplete()
        if not completed.get("output"):
            completed["output"] = [output[i] for i in sorted(output)]
        message = response_message(protocol, completed)
    else:
        if not stopped:
            raise AIStreamIncomplete()
        for block in blocks.values():
            if "_json" in block:
                raw_json = block.pop("_json")
                if not raw_json:
                    continue  # A no-argument tool may emit one empty input delta.
                try:
                    block["input"] = json.loads(raw_json)
                except ValueError as exc:
                    raise AIStreamIncomplete() from exc
        message = response_message(protocol, {"content": [blocks[i] for i in sorted(blocks)], "stop_reason": stop_reason})
    if on_delta and pending and not message.get("tool_calls"):
        on_delta("".join(pending))
    return message
