"""Ordered, provider-neutral turn parts shared by live streams and history."""
from __future__ import annotations

import copy
import threading
import time


class TurnTranscript:
    def __init__(self, run_id=""):
        self.run_id = run_id
        self.started = time.monotonic()
        self.parts = []
        self.citations = []
        self.metrics = {}
        self.seq = 0
        self._final = None
        self.lock = threading.RLock()

    @property
    def elapsed_ms(self):
        return round((time.monotonic() - self.started) * 1000)

    def accept(self, event):
        with self.lock:
            self.seq += 1
            now = self.elapsed_ms
            event = {**event, "seq": self.seq, "elapsed_ms": now, "run_id": self.run_id}
            kind = event.get("type")
            if kind in {"answer_delta", "reasoning_delta"} and event.get("text"):
                part_type = "text" if kind == "answer_delta" else "reasoning"
                if not self.parts or self.parts[-1]["type"] != part_type or self.parts[-1].get("status") != "running":
                    self._settle(now)
                    self.parts.append({"id": f"part-{self.seq}", "type": part_type, "text": "", "status": "running", "started_ms": now})
                self.parts[-1]["text"] += event["text"]
                event["part_id"] = self.parts[-1]["id"]
                self.metrics.setdefault("first_event_ms", now)
                if part_type == "text":
                    self.metrics.setdefault("first_text_ms", now)
            elif kind == "agent_tool":
                call_id = str(event.get("tool_call_id") or event.get("tool") or f"tool-{self.seq}")
                part = next((p for p in self.parts if p["id"] == f"tool:{call_id}"), None)
                if part is None:
                    self._settle(now)
                    part = {"id": f"tool:{call_id}", "type": "tool", "started_ms": now}
                    self.parts.append(part)
                part.update({k: copy.deepcopy(v) for k, v in event.items() if k not in {"type", "seq", "run_id", "elapsed_ms"}})
                if part.get("status") in {"completed", "failed", "cancelled"}:
                    part["duration_ms"] = now - part["started_ms"]
                self.metrics.setdefault("first_event_ms", now)
            elif kind == "agent_plan":
                part = next((p for p in self.parts if p["type"] == "plan"), None)
                if part is None:
                    part = {"id": "plan", "type": "plan"}
                    self.parts.append(part)
                part["entries"] = copy.deepcopy(event.get("entries", []))
            elif kind == "agent_notice":
                self.parts.append({"id": f"notice-{self.seq}", "type": "notice", "title": event.get("title", "Agent 提示"),
                                   "text": event.get("description", ""), "severity": event.get("severity", "info")})
            elif kind == "citations":
                self.citations = copy.deepcopy(event.get("citations", []))
            elif kind == "usage":
                usage = event.get("usage", {})
                visible = {k: v for k, v in usage.items() if k in {"input_tokens", "output_tokens", "prompt_tokens", "completion_tokens", "total_tokens", "used", "size", "cost", "currency", "cache_read_input_tokens", "cache_creation_input_tokens"}}
                for name in ("input_tokens_details", "output_tokens_details"):
                    if isinstance(usage.get(name), dict):
                        visible.update({k: v for k, v in usage[name].items() if k in {"cached_tokens", "reasoning_tokens"}})
                event["usage"] = visible
                self.metrics["usage"] = visible
            elif kind == "progress":
                self.metrics.setdefault("stages", {})[event.get("stage", "working")] = now
            return event

    def _settle(self, now):
        if self.parts and self.parts[-1]["type"] in {"text", "reasoning"} and self.parts[-1].get("status") == "running":
            self.parts[-1].update(status="completed", duration_ms=now - self.parts[-1]["started_ms"])

    def snapshot(self, *, status="running", answer=None):
        with self.lock:
            if self._final and self._final["status"] == status:
                return copy.deepcopy(self._final)
            now = self.elapsed_ms
            parts = copy.deepcopy(self.parts)
            if status != "running":
                for part in parts:
                    if part.get("status") in {"running", "pending", "in_progress"}:
                        part.update(status="completed" if status == "complete" else status,
                                    duration_ms=now - part.get("started_ms", now))
            text = "".join(p.get("text", "") for p in parts if p["type"] == "text")
            if answer is not None and answer != text:
                if answer.strip() == text.strip():
                    text_parts = [p for p in parts if p["type"] == "text"]
                    if text_parts:
                        text_parts[0]["text"] = text_parts[0]["text"].lstrip()
                        text_parts[-1]["text"] = text_parts[-1]["text"].rstrip()
                else:
                    # The final, citation-sanitized answer remains authoritative.
                    parts = [p for p in parts if p["type"] != "text"]
                    if answer:
                        parts.append({"id": "answer", "type": "text", "text": answer, "status": "completed"})
            metrics = copy.deepcopy(self.metrics)
            metrics["elapsed_ms"] = now
            snapshot = {"parts": parts, "metrics": metrics, "status": status, "run_id": self.run_id, "seq": self.seq}
            if status != "running":
                self._final = copy.deepcopy(snapshot)
            return snapshot

    def trace(self, original=(), *, status="complete", answer=None):
        return [*original, {"type": "turn_timeline", **self.snapshot(status=status, answer=answer)}]

    @property
    def answer(self):
        with self.lock:
            return "".join(p.get("text", "") for p in self.parts if p["type"] == "text")
