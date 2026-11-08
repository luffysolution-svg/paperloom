"""The retired connection API must not remain reachable through the AI service."""
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from retainpdf_ai.app import build_app
from retainpdf_ai.config import Settings


def test_connection_management_endpoints_are_absent(tmp_path):
    app = build_app(settings=Settings(data_root=tmp_path, llm_api_key="test-key", rust_api_key="test-rust-key"))
    with TestClient(app) as client:
        for method, path in [
            ("GET", "/v1/connections"),
            ("PUT", "/v1/connections"),
            ("POST", "/v1/connections/local/probe"),
            ("POST", "/v1/connections/local/authenticate"),
            ("GET", "/v1/connections/interactions"),
            ("GET", "/v1/connections/runs"),
            ("POST", "/v1/connections/runs/turn/cancel"),
        ]:
            assert client.request(method, path).status_code == 404
