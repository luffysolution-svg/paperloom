from __future__ import annotations

import requests

from retainpdf_translation.artifacts.aggregator import TranslationRunDiagnostics, translation_run_diagnostics_scope
from retainpdf_translation.llm.providers.deepseek import client, transport


def test_translation_requests_send_stable_opencode_session(monkeypatch):
    seen = []

    class Session:
        def post(self, url, **kwargs):
            seen.append((url, kwargs["headers"]))
            response = requests.Response()
            response.status_code = 200
            response._content = b'{"choices":[{"message":{"content":"ok"}}]}'
            return response

    monkeypatch.setattr(client, "get_session", lambda: Session())
    monkeypatch.setattr(client, "_prewarm_dns", lambda *args, **kwargs: None)
    monkeypatch.setattr(client, "should_use_stream_responses", lambda: False)
    monkeypatch.delenv("RETAIN_MODEL_EXECUTOR_URL", raising=False)
    monkeypatch.delenv("RETAIN_MODEL_EXECUTOR_ENABLED", raising=False)
    sessions = []
    for _ in range(2):
        run = TranslationRunDiagnostics(
            provider_family="deepseek_compatible", model="deepseek-v4.1-flash",
            base_url="https://opencode.ai/inference/go/v1", configured_workers=5,
            configured_batch_size=8, configured_classify_batch_size=12,
        )
        with translation_run_diagnostics_scope(run):
            for _ in range(2):
                assert client.request_chat_content(
                    [{"role": "user", "content": "hello"}], api_key="test-key",
                    model=run.model, base_url=run.base_url, max_attempts=1,
                ) == "ok"
        first, second = seen[-2:]
        assert first[0] == "https://opencode.ai/inference/go/v1/chat/completions"
        assert first[1]["User-Agent"].startswith("RetainPDF/")
        assert first[1]["Authorization"] == "Bearer test-key"
        assert first[1]["x-opencode-session"] == second[1]["x-opencode-session"]
        sessions.append(first[1]["x-opencode-session"])
    assert sessions[0] != sessions[1]


def test_headers_do_not_match_other_hosts_or_url_paths():
    for url in ["https://api.deepseek.com/v1", "https://opencode.ai.example/v1", "https://example.com/opencode.ai"]:
        assert "x-opencode-session" not in transport.build_headers("test-key", url)
    assert transport.build_headers("test-key", "https://opencode.ai/zen/go/v1") == transport.build_headers("test-key", "https://opencode.ai/zen/go/v1")
