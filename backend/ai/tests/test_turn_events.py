import json
import sys
import threading
from dataclasses import replace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from retainpdf_ai.agent_llm import assemble_streaming_message
from retainpdf_ai.api_contracts import AskInput
from retainpdf_ai.ask_orchestration import AskOrchestrator, PreparedAsk
from retainpdf_ai.config import Settings
from retainpdf_ai.conversation_state import ConversationState
from retainpdf_ai.image_inputs import chat_images
from retainpdf_ai.llm_wire import request_body
from retainpdf_ai.request_control import RequestControl
from retainpdf_ai.request_routing import RouteDecision
from retainpdf_ai.runtimes.contracts import RuntimeCapabilities
from retainpdf_ai.tools import Tool, ToolRegistry
from retainpdf_ai.turn_events import TurnTranscript


def test_interleaved_parts_merge_partial_tool_updates_and_preserve_order():
    turn = TurnTranscript("run")
    turn.accept({"type": "reasoning_delta", "text": "Locate evidence"})
    turn.accept({"type": "answer_delta", "text": "I will check."})
    turn.accept({"type": "agent_tool", "tool_call_id": "read", "tool": "read_blocks", "status": "running", "input": {"page_idx": 1}})
    turn.accept({"type": "agent_tool", "tool_call_id": "read", "status": "completed"})
    turn.accept({"type": "answer_delta", "text": "The result."})
    parts = turn.snapshot(status="complete")["parts"]
    assert [p["type"] for p in parts] == ["reasoning", "text", "tool", "text"]
    assert parts[2]["input"] == {"page_idx": 1}
    assert parts[2]["tool"] == "read_blocks"
    assert parts[2]["status"] == "completed"
    assert turn.answer == "I will check.The result."


def test_native_notices_do_not_become_answer_text_and_usage_is_bounded():
    turn = TurnTranscript()
    turn.accept({"type": "agent_notice", "title": "Plugin update timed out"})
    event = turn.accept({"type": "usage", "usage": {"input_tokens": 42, "attribution": {"irrelevant": "large"}}})
    assert turn.answer == ""
    assert event["usage"] == {"input_tokens": 42}
    assert turn.parts[0]["type"] == "notice"


def test_final_snapshot_is_stable_and_whitespace_does_not_reorder_parts():
    turn = TurnTranscript()
    turn.accept({"type": "answer_delta", "text": "Before"})
    turn.accept({"type": "agent_tool", "tool_call_id": "t", "status": "completed"})
    turn.accept({"type": "answer_delta", "text": "After\n"})
    snapshot = turn.snapshot(status="complete", answer="BeforeAfter")
    assert [p["type"] for p in snapshot["parts"]] == ["text", "tool", "text"]
    turn.accept({"type": "progress", "stage": "saving", "message": "Saving"})
    assert turn.snapshot(status="complete", answer="BeforeAfter") == snapshot


def test_first_text_streams_immediately_and_visible_reasoning_is_separate():
    output, activity = [], []
    def chunks():
        yield 'data: ' + json.dumps({"choices": [{"delta": {"reasoning_content": "Check"}}]})
        yield 'data: ' + json.dumps({"choices": [{"delta": {"content": "OK"}}]})
        assert output == ["OK"]  # Before the stream's completion marker.
        yield 'data: ' + json.dumps({"choices": [{"delta": {}, "finish_reason": "stop"}]})
        yield 'data: [DONE]'
    message = assemble_streaming_message(chunks(), output.append, on_event=activity.append)
    assert message["content"] == "OK"
    assert activity == [{"type": "reasoning_delta", "text": "Check"}]


def test_image_blocks_are_native_in_all_three_provider_requests():
    images = [{"type": "image", "mimeType": "image/png", "data": "aW1hZ2U="}]
    messages = [{"role": "user", "content": [{"type": "text", "text": "Read this"}, *chat_images(images)]}]
    assert request_body("openai", "m", messages, [])["messages"][0]["content"][1]["type"] == "image_url"
    assert request_body("openai_responses", "m", messages, [])["input"][0]["content"][1]["type"] == "input_image"
    native = request_body("anthropic", "m", messages, [])["messages"][0]["content"][1]
    assert native["source"] == {"type": "base64", "media_type": "image/png", "data": "aW1hZ2U="}


def test_collection_scope_is_enforced_by_tools():
    seen = []
    def search(args):
        seen.append(args["document_id"])
        return {"hits": [{"document_id": args["document_id"], "text": "evidence"}]}
    registry = ToolRegistry([Tool("search_fulltext", "Search", {}, search), Tool("read_blocks", "Read", {}, search)]).scoped(["one", "two"])
    result = registry.invoke("search_fulltext", {"query": "paper"})
    assert {hit["document_id"] for hit in result["hits"]} == {"one", "two"}
    assert registry.invoke("read_blocks", {"document_id": "outside"}).get("error")
    assert "outside" not in seen


def test_cancelled_partial_answer_is_saved_with_timeline():
    writes, finished = [], threading.Event()
    class Store:
        def append_conversation_message(self, _id, **message):
            writes.append(message)
            return {"message_id": message.get("message_id")}
        def get_conversation(self, _id):
            return {"messages": []}
    class Runtime:
        runtime_id = "test"
        capabilities = RuntimeCapabilities(True, False, True, False, "runtime_managed")
        def ask(self, _question, *, on_event, request_control, **_kwargs):
            on_event({"type": "answer_delta", "text": "Partial answer"})
            request_control.cancel("user_cancelled")
            request_control.raise_if_stopped()
    settings = replace(Settings(), followup_suggestions=False)
    runtime = Runtime()
    state = ConversationState(settings, Store())
    orchestrator = AskOrchestrator(settings=settings, runtime=runtime, reading_runtime=runtime, conversation_state=state,
        chat_fn_builder=lambda _: None, confirmation_projector=lambda *_: [])
    prepared = PreparedAsk(runtime, "test", settings, RouteDecision("auto", "reading", "safe_reading_default"), "unscoped", 3)
    control = RequestControl(10)
    control.add_cancel_callback(finished.set)
    list(orchestrator.sse_events(AskInput(question="test", conversation_id="c", user_message_id="u", assistant_message_id="a", stream=True), prepared, request_control=control))
    # Persistence runs in the worker, after cancellation wakes the stream reader.
    for _ in range(100):
        if any(w.get("finish_reason") == "cancelled" for w in writes):
            break
        finished.wait(0.01)
        threading.Event().wait(0.01)
    saved = next(w for w in writes if w.get("finish_reason") == "cancelled")
    assert saved["content"] == "Partial answer"
    assert json.loads(saved["tool_trace_json"])[0]["parts"][0]["text"] == "Partial answer"
