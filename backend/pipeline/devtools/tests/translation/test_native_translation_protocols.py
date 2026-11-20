"""Offline completion validation for native translation provider protocols."""
import json
from unittest.mock import MagicMock

import pytest

from retainpdf_pipeline.translate.llm.providers.deepseek import client as deepseek_client
from retainpdf_pipeline.translate.llm.shared import model_wire as wire


@pytest.mark.parametrize("protocol", ["openai_responses", "anthropic"])
def test_native_translation_stream_cannot_return_a_partial_document(protocol):
    line = {"type": "response.output_text.delta", "delta": "partial"} if protocol == "openai_responses" else {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "partial"}}
    with pytest.raises(ValueError):
        wire.read_text_stream(["data: " + json.dumps(line)], protocol)


def _mock_openai_session(monkeypatch, payload):
    response = MagicMock()
    response.status_code = 200
    response.text = json.dumps(payload)
    response.json.return_value = payload
    response.raise_for_status.return_value = None
    session = MagicMock()
    session.post.return_value = response
    monkeypatch.setattr(deepseek_client, "get_session", lambda: session)
    monkeypatch.setattr(deepseek_client, "_prewarm_dns", lambda *_a, **_k: None)
    monkeypatch.setattr(deepseek_client, "should_use_stream_responses", lambda: False)
    return session


def test_openai_protocol_drops_temperature_for_documented_no_temperature_models(monkeypatch):
    wire.clear_registered_connections()
    session = _mock_openai_session(monkeypatch, {"choices": [{"message": {"content": "ok"}}]})
    try:
        content = deepseek_client.request_chat_content(
            messages=[{"role": "user", "content": "x"}],
            api_key="k",
            model="claude-haiku-5-5",
            base_url="https://api.anthropic.com/v1",
            api_protocol="openai",
        )
    finally:
        wire.clear_registered_connections()
    assert content == "ok"
    assert "temperature" not in session.post.call_args.kwargs["json"]


def test_openai_protocol_keeps_temperature_for_other_models(monkeypatch):
    wire.clear_registered_connections()
    session = _mock_openai_session(monkeypatch, {"choices": [{"message": {"content": "ok"}}]})
    try:
        content = deepseek_client.request_chat_content(
            messages=[{"role": "user", "content": "x"}],
            api_key="k",
            model="deepseek-chat",
            base_url="https://api.deepseek.com/v1",
            temperature=0.2,
            api_protocol="openai",
        )
    finally:
        wire.clear_registered_connections()
    assert content == "ok"
    assert session.post.call_args.kwargs["json"]["temperature"] == 0.2
