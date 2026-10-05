"""Lock the Python runtime-config producer to the shared v1 contract."""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from pydantic import ValidationError
from retainpdf_ai.api_contracts import RuntimeConfigUpdate
from retainpdf_ai.app import build_app
from retainpdf_ai.config import Settings

CONTRACT_PATH = (
    Path(__file__).resolve().parents[2] / "contracts" / "runtime-config.v1.schema.json"
)


class _UnusedAgent:
    def ask(self, *_args, **_kwargs):  # pragma: no cover - config route only
        raise AssertionError("agent should not run")


def _contract() -> dict:
    return json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))


def test_runtime_config_update_fields_and_extra_policy_match_contract():
    schema = _contract()["definitions"]["RuntimeConfigUpdate"]

    assert set(schema["properties"]) == set(RuntimeConfigUpdate.model_fields)
    assert "required" not in schema
    assert schema["additionalProperties"] is False
    try:
        RuntimeConfigUpdate.model_validate({"future_field": "rejected"})
    except ValidationError as error:
        assert error.errors()[0]["type"] == "extra_forbidden"
    else:  # pragma: no cover - protects the public no-silent-noop contract
        raise AssertionError("unknown runtime config fields must be rejected")


def _assert_view_contract(view: dict) -> None:
    contract = _contract()
    schema = contract["definitions"]["RuntimeConfigView"]
    assert set(view) == set(schema["properties"]) == set(schema["required"])
    assert view["configured_runtime"] in contract["definitions"]["ConfiguredRuntime"]["enum"]
    assert view["active_runtime"] in contract["definitions"]["ActiveRuntime"]["enum"]
    for key in ("llm_api_key", "fx_gateway_api_key"):
        assert schema["properties"][key]["type"] == "string"
        assert isinstance(view[key], str)
        assert view[f"{key}_configured"] is bool(view[key].strip())
        assert isinstance(view[f"{key}_masked"], str)


@pytest.mark.parametrize("llm_key, gateway_key", [
    ("fixture-model-key", "fixture-gateway-key"),
    ("", ""),
    ("fixture-model-key", ""),
    ("", "fixture-gateway-key"),
])
def test_runtime_config_view_matches_visible_local_key_contract(tmp_path, llm_key, gateway_key):
    client = TestClient(
        build_app(
            Settings(
                api_keys=frozenset({"test-key"}),
                llm_api_key=llm_key,
                fx_gateway_api_key=gateway_key,
                data_root=tmp_path,
            ),
            agent=_UnusedAgent(),
            restart_callback=lambda: None,
        )
    )

    response = client.get(
        "/v1/runtime-config",
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 200
    view = response.json()["data"]
    _assert_view_contract(view)
    assert view["llm_api_key"] == llm_key
    assert view["fx_gateway_api_key"] == gateway_key


@pytest.mark.parametrize("method", ["get", "put"])
@pytest.mark.parametrize("headers", [{}, {"X-API-Key": "wrong-fixture-key"}])
def test_runtime_config_key_views_still_require_api_authentication(tmp_path, method, headers):
    client = TestClient(build_app(
        Settings(
            api_keys=frozenset({"test-key"}),
            llm_api_key="fixture-model-key",
            fx_gateway_api_key="fixture-gateway-key",
            data_root=tmp_path,
        ),
        agent=_UnusedAgent(),
        restart_callback=lambda: None,
    ))
    kwargs = {"json": {}} if method == "put" else {}
    response = client.request(method, "/v1/runtime-config", headers=headers, **kwargs)
    assert response.status_code == 401
    assert "fixture-model-key" not in response.text
    assert "fixture-gateway-key" not in response.text


def test_runtime_config_put_and_reread_return_saved_keys_and_keep_clear_semantics(tmp_path):
    client = TestClient(build_app(
        Settings(
            api_keys=frozenset({"test-key"}),
            llm_api_key="fixture-startup-key",
            data_root=tmp_path,
        ),
        agent=_UnusedAgent(),
        restart_callback=lambda: None,
    ))
    headers = {"X-API-Key": "test-key"}
    before = client.get("/v1/runtime-config", headers=headers).json()["data"]
    response = client.put("/v1/runtime-config", headers=headers, json={
        "expected_revision": before["configured_revision"],
        "llm_api_key": "fixture-saved-model-key",
        "fx_gateway_api_key": "fixture-saved-gateway-key",
    })
    assert response.status_code == 200
    saved = response.json()["data"]
    _assert_view_contract(saved)
    assert saved["llm_api_key"] == "fixture-saved-model-key"
    assert saved["fx_gateway_api_key"] == "fixture-saved-gateway-key"
    assert client.get("/v1/runtime-config", headers=headers).json()["data"] == saved

    response = client.put("/v1/runtime-config", headers=headers, json={
        "expected_revision": saved["configured_revision"],
        "llm_api_key": "",
        "fx_gateway_api_key": "",
    })
    assert response.status_code == 200
    assert response.json()["data"] == saved

    response = client.put("/v1/runtime-config", headers=headers, json={
        "expected_revision": saved["configured_revision"],
        "clear_fx_gateway_api_key": True,
    })
    assert response.status_code == 200
    cleared = response.json()["data"]
    _assert_view_contract(cleared)
    assert cleared["fx_gateway_api_key"] == ""
    assert cleared["fx_gateway_api_key_configured"] is False
    assert cleared["llm_api_key"] == saved["llm_api_key"]
    assert client.get("/v1/runtime-config", headers=headers).json()["data"] == cleared


def test_runtime_config_http_rejects_unknown_fields_without_persisting(tmp_path):
    client = TestClient(
        build_app(
            Settings(api_keys=frozenset({"test-key"}), data_root=tmp_path),
            agent=_UnusedAgent(),
            restart_callback=lambda: None,
        )
    )
    headers = {"X-API-Key": "test-key"}
    before = client.get("/v1/runtime-config", headers=headers).json()["data"]

    response = client.put(
        "/v1/runtime-config",
        headers=headers,
        json={
            "expected_revision": before["configured_revision"],
            "llm_modle": "typo-must-not-be-ignored",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["type"] == "extra_forbidden"
    after = client.get("/v1/runtime-config", headers=headers).json()["data"]
    assert after["configured_revision"] == before["configured_revision"]
