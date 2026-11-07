"""Deterministic ACP peer for real subprocess, tool bridge and permission tests."""
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

sys.stdin.reconfigure(encoding="utf-8")
sys.stdout.reconfigure(encoding="utf-8")

session_id = "test-session"
servers = []
loaded = False
def send(message):
    print(json.dumps({"jsonrpc": "2.0", **message}), flush=True)

def read():
    return json.loads(sys.stdin.readline())

def log(message):
    if os.environ.get("FAKE_ACP_LOG"):
        with Path(os.environ["FAKE_ACP_LOG"]).open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(message) + "\n")

def report_error(type, value, traceback):
    log({"failure": f"{type.__name__}: {value}"})
sys.excepthook = report_error

config = [{"id": "model-choice", "name": "Model", "category": "model", "type": "select", "currentValue": "model-a", "options": [{"value": "model-a", "name": "Model A"}, {"value": "model-b", "name": "Model B"}]}]
for line in sys.stdin:
    message = json.loads(line)
    method, params = message.get("method"), message.get("params") or {}
    log({"method": method, "params": params, "home": os.environ.get("HOME"), "userprofile": os.environ.get("USERPROFILE")})
    if method == "initialize":
        result = {"protocolVersion": 1, "agentCapabilities": {"loadSession": True}, "authMethods": [{"id": "local", "name": "Local login"}]}
    elif method == "authenticate":
        result = {}
    elif method in {"session/new", "session/load"}:
        servers = params.get("mcpServers", [])
        result = {"sessionId": session_id, "configOptions": config}
        if os.environ.get("FAKE_ACP_STARTUP"):
            result["_meta"] = {"piAcp": {"startupInfo": os.environ["FAKE_ACP_STARTUP"]}}
        if method == "session/load":
            loaded = True
            send({"method": "session/update", "params": {"sessionId": session_id, "update": {"sessionUpdate": "agent_message_chunk", "content": {"type": "text", "text": "Do not duplicate replayed history"}}}})
    elif method == "session/set_config_option":
        config[0]["currentValue"] = params["value"]
        result = {"configOptions": config}
    elif method == "session/prompt":
        prompt = params["prompt"][0]["text"]
        if loaded and os.environ.get("FAKE_ACP_FOLLOWUP_NO_TOOLS"):
            send({"method": "session/update", "params": {"sessionId": session_id, "update": {"sessionUpdate": "agent_message_chunk", "content": {"type": "text", "text": "Evidence [1]"}}}})
            send({"id": message["id"], "result": {"stopReason": "end_turn"}})
            continue
        if os.environ.get("FAKE_ACP_STARTUP"):
            send({"method": "session/update", "params": {"sessionId": session_id, "update": {"sessionUpdate": "agent_message_chunk", "content": {"type": "text", "text": os.environ["FAKE_ACP_STARTUP"]}}}})
        if "hang forever" in prompt:
            while sys.stdin.readline():
                pass
            break
        if os.environ.get("FAKE_ACP_PERMISSION"):
            send({"id": "permission", "method": "session/request_permission", "params": {"sessionId": session_id, "toolCall": {"title": "Read document", "kind": "read"}, "options": [{"optionId": "yes", "kind": "allow_once", "name": "Allow once"}, {"optionId": "no", "kind": "reject_once", "name": "Reject"}]}})
            log({"permission_reply": read()})
        if servers:
            server = servers[0]
            url = server["args"][server["args"].index("--url") + 1]
            token = server["env"][0]["value"]
        else:
            url = re.search(r'http://127\.0\.0\.1:\d+/', prompt).group()
            token = os.environ["RETAINPDF_TOOL_TOKEN"]
        request = urllib.request.Request(url, json.dumps({"method": "tools/call", "params": {"name": "search_fulltext", "arguments": {"document_id": "outside", "query": "evidence"}}}).encode(), {"Authorization": "Bearer " + token})
        with urllib.request.urlopen(request) as response:
            log({"tool_result": json.load(response)})
        for text in ("Evidence ", "[1]"):
            send({"method": "session/update", "params": {"sessionId": session_id, "update": {"sessionUpdate": "agent_message_chunk", "content": {"type": "text", "text": text}}}})
        result = {"stopReason": "end_turn"}
    elif method == "session/cancel":
        continue
    else:
        send({"id": message.get("id"), "error": {"code": -32601, "message": "Unsupported method"}})
        continue
    send({"id": message["id"], "result": result})
