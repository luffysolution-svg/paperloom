"""Loopback HTTP integration, separate from the strictly offline translation suite."""
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from retainpdf_pipeline.translate.llm.providers.deepseek.translation_client import translate_single_item_plain_text_unstructured
from retainpdf_pipeline.translate.llm.shared import model_wire as wire


@pytest.mark.parametrize("protocol", ["openai", "openai_responses", "anthropic"])
@pytest.mark.parametrize("streaming", [False, True])
def test_translation_sample_over_native_http(monkeypatch, protocol, streaming):
    text = "机器学习用于分析实验数据。"
    recorded = []
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_POST(self):
            recorded.append((self.path, dict(self.headers), json.loads(self.rfile.read(int(self.headers["Content-Length"])))))
            if protocol == "openai":
                data = {"choices": [{"message": {"content": text}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 12, "completion_tokens": 8}}
                events = [{"choices": [{"delta": {"content": text}}]}, {"choices": [{"delta": {}, "finish_reason": "stop"}]}]
            elif protocol == "openai_responses":
                data = {"status": "completed", "output": [{"type": "message", "content": [{"type": "output_text", "text": text}]}], "usage": {"input_tokens": 12, "output_tokens": 8}}
                events = [{"type": "response.output_text.delta", "delta": text}, {"type": "response.completed", "response": data}]
            else:
                data = {"stop_reason": "end_turn", "content": [{"type": "text", "text": text}], "usage": {"input_tokens": 12, "output_tokens": 8}}
                events = [{"type": "message_start", "message": {"usage": {"input_tokens": 12}}}, {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": text}}, {"type": "message_delta", "delta": {"stop_reason": "end_turn"}, "usage": {"output_tokens": 8}}, {"type": "message_stop"}]
            body = (("".join("data: " + json.dumps(e, ensure_ascii=False) + "\n\n" for e in events) + ("data: [DONE]\n\n" if protocol == "openai" else "")) if streaming else json.dumps(data, ensure_ascii=False)).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8" if streaming else "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    worker = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.05}, daemon=True)
    worker.start()
    base = f"http://127.0.0.1:{server.server_port}/v1"
    wire.register_connection(base_url=base, model="sample", protocol=protocol)
    monkeypatch.setenv("PDF_TRANSLATOR_DEEPSEEK_STREAM", "1" if streaming else "0")
    monkeypatch.delenv("RETAIN_MODEL_EXECUTOR_URL", raising=False)
    try:
        result = translate_single_item_plain_text_unstructured({"item_id": "p1-b1", "text": "Machine learning is used to analyze experimental data.", "type": "text"}, api_key="test-only-key", model="sample", base_url=base, timeout_s=3, http_retry_attempts=1)
        assert result["p1-b1"]["translated_text"] == text
        assert len(recorded) == 1
        path, headers, body = recorded[0]
        assert path == "/v1/" + {"openai": "chat/completions", "openai_responses": "responses", "anthropic": "messages"}[protocol]
        if protocol == "anthropic":
            assert headers["x-api-key"] == "test-only-key"
            assert body["max_tokens"] > 0
            assert "system" in body
        elif protocol == "openai_responses":
            assert body["store"] is False and "input" in body
        else:
            assert headers["Authorization"] == "Bearer test-only-key"
    finally:
        server.shutdown(); server.server_close(); worker.join(timeout=1)
        wire.clear_registered_connections()
