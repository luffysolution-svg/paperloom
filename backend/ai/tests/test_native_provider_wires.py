import json
from dataclasses import replace

import httpx
import pytest

from retainpdf_ai import llm_wire
from retainpdf_ai.agent_llm import build_deepseek_chat_fn
from retainpdf_ai.config import Settings
from retainpdf_ai.request_control import AIStreamIncomplete


TOOLS = [{"type": "function", "function": {"name": "read_blocks", "description": "Read", "parameters": {"type": "object", "properties": {"page_idx": {"type": "integer"}}}}}]


@pytest.mark.parametrize("protocol,path", [("openai", "/chat/completions"), ("openai_responses", "/responses"), ("anthropic", "/messages")])
def test_native_multi_round_tool_wire(protocol, path):
    requests = []
    def respond(request):
        requests.append((request, json.loads(request.content)))
        if len(requests) == 1:
            if protocol == "openai":
                data = {"choices": [{"message": {"role": "assistant", "content": "", "tool_calls": [{"id": "call-1", "type": "function", "function": {"name": "read_blocks", "arguments": '{"page_idx":0}'}}]}}]}
            elif protocol == "openai_responses":
                data = {"status": "completed", "output": [{"type": "reasoning", "id": "reason-1", "encrypted_content": "signed"}, {"type": "function_call", "id": "item-1", "call_id": "call-1", "name": "read_blocks", "arguments": '{"page_idx":0}'}]}
            else:
                data = {"stop_reason": "tool_use", "content": [{"type": "thinking", "thinking": "private", "signature": "signed"}, {"type": "tool_use", "id": "call-1", "name": "read_blocks", "input": {"page_idx": 0}}]}
        else:
            data = {"choices": [{"message": {"role": "assistant", "content": "Answer [1]"}}]} if protocol == "openai" else {"status": "completed", "output": [{"type": "message", "content": [{"type": "output_text", "text": "Answer [1]"}]}]} if protocol == "openai_responses" else {"stop_reason": "end_turn", "content": [{"type": "text", "text": "Answer [1]"}]}
        return httpx.Response(200, json=data)
    client = httpx.Client(transport=httpx.MockTransport(respond))
    settings = replace(Settings(), llm_api_key="secret", llm_base_url="https://example.test/v1", llm_model="test", llm_api_protocol=protocol)
    chat = build_deepseek_chat_fn(settings, client)
    messages = [{"role": "system", "content": "Read sources"}, {"role": "user", "content": "Question"}]
    first = chat(messages, TOOLS)
    assert first["tool_calls"][0]["id"] == "call-1"
    messages += [first, {"role": "tool", "tool_call_id": "call-1", "content": '{"text":"Evidence"}'}]
    assert chat(messages, TOOLS)["content"] == "Answer [1]"
    request, body = requests[-1]
    assert request.url.path.endswith(path)
    if protocol == "anthropic":
        assert request.headers["x-api-key"] == "secret"
        assert "authorization" not in request.headers
        assert body["system"] == "Read sources"
        assert body["messages"][1]["content"][0]["signature"] == "signed"
        assert body["messages"][-1]["content"][0]["tool_use_id"] == "call-1"
    elif protocol == "openai_responses":
        assert body["store"] is False
        assert body["input"][1]["encrypted_content"] == "signed"
        assert body["input"][-1]["call_id"] == "call-1"
        assert body["tools"][0]["name"] == "read_blocks"
    else:
        assert "_anthropic_content" not in str(body)


@pytest.mark.parametrize("protocol", ["openai_responses", "anthropic"])
def test_native_stream_has_same_text_and_requires_completion(protocol):
    if protocol == "openai_responses":
        events = [{"type": "response.output_text.delta", "delta": "Hello"}, {"type": "response.completed", "response": {"status": "completed", "output": [{"type": "message", "content": [{"type": "output_text", "text": "Hello"}]}]}}]
    else:
        events = [{"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}}, {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Hello"}}, {"type": "message_delta", "delta": {"stop_reason": "end_turn"}}, {"type": "message_stop"}]
    lines = ["data: " + json.dumps(e) for e in events]
    pieces = []
    assert llm_wire.stream_message(protocol, lines, pieces.append, None)["content"] == "".join(pieces) == "Hello"
    with pytest.raises(AIStreamIncomplete):
        llm_wire.stream_message(protocol, lines[:-1], None, None)


def test_anthropic_no_argument_tool_accepts_an_empty_input_delta():
    events = [
        {"type": "content_block_start", "index": 0, "content_block": {"type": "tool_use", "id": "inspect", "name": "retainpdf_document_inspect", "input": {}}},
        {"type": "content_block_delta", "index": 0, "delta": {"type": "input_json_delta", "partial_json": ""}},
        {"type": "content_block_stop", "index": 0},
        {"type": "message_delta", "delta": {"stop_reason": "tool_use"}}, {"type": "message_stop"},
    ]
    message = llm_wire.stream_message("anthropic", ["data: " + json.dumps(e) for e in events], None, None)
    assert json.loads(message["tool_calls"][0]["function"]["arguments"]) == {}


def test_stream_tool_blocks_keep_arguments_and_signed_thinking():
    events = [
        {"type": "content_block_start", "index": 0, "content_block": {"type": "thinking", "thinking": "", "signature": ""}},
        {"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "private"}},
        {"type": "content_block_delta", "index": 0, "delta": {"type": "signature_delta", "signature": "signed"}},
        {"type": "content_block_start", "index": 1, "content_block": {"type": "tool_use", "id": "c", "name": "read_blocks", "input": {}}},
        {"type": "content_block_delta", "index": 1, "delta": {"type": "input_json_delta", "partial_json": '{"page_idx":'}},
        {"type": "content_block_delta", "index": 1, "delta": {"type": "input_json_delta", "partial_json": '1}'}},
        {"type": "message_delta", "delta": {"stop_reason": "tool_use"}}, {"type": "message_stop"},
    ]
    message = llm_wire.stream_message("anthropic", ["data: " + json.dumps(e) for e in events], None, None)
    assert json.loads(message["tool_calls"][0]["function"]["arguments"]) == {"page_idx": 1}
    assert message["_anthropic_content"][0]["signature"] == "signed"


@pytest.mark.parametrize("protocol", ["openai_responses", "anthropic"])
def test_incomplete_native_response_is_not_usable(protocol):
    data = {"status": "incomplete", "output": [{"type": "message", "content": [{"type": "output_text", "text": "partial"}]}]} if protocol == "openai_responses" else {"stop_reason": "max_tokens", "content": [{"type": "text", "text": "partial"}]}
    with pytest.raises(AIStreamIncomplete):
        llm_wire.response_message(protocol, data)


@pytest.mark.parametrize("base,protocol,expected", [
    ("https://example.test/v1/responses", "openai", "https://example.test/v1/chat/completions"),
    ("https://example.test/anthropic", "anthropic", "https://example.test/anthropic/v1/messages"),
    ("https://example.test/v1/messages", "anthropic", "https://example.test/v1/messages"),
])
def test_protocol_endpoint_normalization(base, protocol, expected):
    assert llm_wire.endpoint(base, protocol) == expected
