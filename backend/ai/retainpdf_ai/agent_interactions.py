"""Run-scoped ACP permission/form requests, answered over authenticated HTTP."""
import secrets
import threading

from fastapi import HTTPException


class Interactions:
    def __init__(self):
        self.lock = threading.Lock()
        self.pending = {}

    def ask(self, kind, params, *, connection, conversation_id, emit, control):
        id = secrets.token_urlsafe(24)
        ready = threading.Event()
        slot = {"event": ready, "response": None, "kind": kind, "params": params, "conversation_id": conversation_id,
                "connection_name": connection.name}
        with self.lock:
            self.pending[id] = slot
        emit({"type": "agent_interaction", "interaction_id": id, "kind": kind, "connection_name": connection.name,
              "conversation_id": conversation_id, "request": params})
        try:
            while not ready.wait(0.2):
                control.raise_if_stopped()
            response = slot["response"]
            if kind == "permission":
                selected = response.get("option_id")
                return {"outcome": {"outcome": "selected", "optionId": selected}} if selected else {"outcome": {"outcome": "cancelled"}}
            return {"action": response.get("action", "cancel"), **({"content": response["content"]} if response.get("action") == "accept" else {})}
        finally:
            with self.lock:
                self.pending.pop(id, None)
            emit({"type": "agent_interaction_resolved", "interaction_id": id, "conversation_id": conversation_id})

    def respond(self, id, response):
        with self.lock:
            slot = self.pending.get(id)
            if not slot or slot["event"].is_set():
                raise HTTPException(409, "此请求已结束或已在其他窗口处理")
            if slot["kind"] == "permission":
                if response.get("option_id") and response["option_id"] not in {o.get("optionId") for o in slot["params"].get("options", [])}:
                    raise HTTPException(400, "未知权限选项")
            else:
                if response.get("action") not in {"accept", "decline", "cancel"}:
                    raise HTTPException(400, "未知交互操作")
                if response.get("action") == "accept":
                    content = response.get("content")
                    schema = slot["params"].get("requestedSchema") or {}
                    if not isinstance(content, dict) or any(key not in content for key in schema.get("required", [])):
                        raise HTTPException(400, "请填写所有必填项")
                    for key, value in content.items():
                        field = schema.get("properties", {}).get(key)
                        if not field or (field.get("enum") and value not in field["enum"]):
                            raise HTTPException(400, "表单值无效")
                        expected = field.get("type", "string")
                        if (expected == "boolean" and type(value) is not bool) or (expected == "string" and not isinstance(value, str)) or (expected in {"number", "integer"} and (isinstance(value, bool) or not isinstance(value, (int, float)))):
                            raise HTTPException(400, "表单值类型无效")
                        if expected == "integer" and type(value) is not int:
                            raise HTTPException(400, "请填写整数")
                        if expected in {"number", "integer"}:
                            if ("minimum" in field and value < field["minimum"]) or ("maximum" in field and value > field["maximum"]):
                                raise HTTPException(400, "数值超出要求的范围")
                        if expected == "string" and not field.get("minLength", 0) <= len(value) <= field.get("maxLength", 100000):
                            raise HTTPException(400, "文本长度不符合要求")
                        if expected == "array":
                            allowed = field.get("items", {}).get("enum", [])
                            if not isinstance(value, list) or any(item not in allowed for item in value):
                                raise HTTPException(400, "多选值无效")
            slot["response"] = response
            slot["event"].set()

    def list_pending(self, conversation_id):
        with self.lock:
            return [{"type": "agent_interaction", "interaction_id": id, "kind": slot["kind"], "request": slot["params"],
                     "conversation_id": conversation_id, "connection_name": slot["connection_name"]}
                    for id, slot in self.pending.items() if slot["conversation_id"] == conversation_id and not slot["event"].is_set()]
