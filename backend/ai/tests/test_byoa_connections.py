import json
import os
import sys
import threading
import time
from dataclasses import replace
from pathlib import Path

import pytest
from fastapi import HTTPException

from retainpdf_ai.agent_presets import PRESETS
from retainpdf_ai.byoa_runtime import ByoaRuntime, ConnectionManager
from retainpdf_ai.config import Settings
from retainpdf_ai.connections import Connection, ConnectionStore
from retainpdf_ai.request_control import AIRequestCancelled, RequestControl
from retainpdf_ai.tools import Tool, ToolRegistry


PEER = Path(__file__).parent / "fixtures" / "byoa_agent.py"


def test_catalog_is_the_complete_agentero_byoa_catalog():
    assert {p["id"] for p in PRESETS} == {"codex-acp", "claude-acp", "opencode", "pi", "grok-build", "codebuddy", "cursor-agent", "hermes", "antigravity-acp", "qodercli", "qoder-cn", "dsh", "kimi-code", "zcode", "minimax-code", "mimo-code"}


@pytest.mark.skipif(os.name != "nt", reason="Windows verbatim paths")
def test_cached_node_adapter_launches_under_canonical_rust_data_root(tmp_path):
    import subprocess
    from retainpdf_ai.agent_presets import cli_path, launch_argv
    script = tmp_path / "agent.js"
    script.write_text('process.stdout.write(process.argv[2]);', encoding="utf-8")
    shim = tmp_path / "agent.cmd"
    shim.write_text('@echo off\n"%dp0%\\agent.js" %*\n', encoding="utf-8")
    verbatim = "\\\\?\\" + str(shim.resolve())
    argv = launch_argv(verbatim, ["literal & argument"], dict(os.environ))
    result = subprocess.run(argv, capture_output=True, text=True, timeout=10)
    assert result.returncode == 0, result.stderr
    assert result.stdout == "literal & argument"
    assert cli_path("\\\\?\\UNC\\server\\share\\adapter") == "\\\\server\\share\\adapter"


@pytest.mark.skipif(os.name != "nt", reason="Windows verbatim paths")
def test_connector_preparation_passes_npm_a_normal_windows_prefix(tmp_path, monkeypatch):
    from retainpdf_ai import agent_adapters
    monkeypatch.setattr(agent_adapters, "executable", lambda command, *_: "" if command == "codex-acp" else command)
    def install(argv, **_):
        from types import SimpleNamespace
        directory = Path(argv[argv.index("--prefix") + 1])
        assert not str(directory).startswith("\\\\?\\")
        shim = directory / "node_modules/.bin/codex-acp.cmd"
        shim.parent.mkdir(parents=True)
        shim.write_text("@echo off", encoding="utf-8")
        return SimpleNamespace(returncode=0)
    monkeypatch.setattr(agent_adapters, "launch_argv", lambda command, args, env: [command, *args])
    monkeypatch.setattr(agent_adapters.subprocess, "run", install)
    connection = Connection(name="Codex", kind="byoa", preset="codex-acp", command="codex-acp")
    agent_adapters.prepare_adapter(connection, Path("\\\\?\\" + str(tmp_path.resolve())))


def test_connections_preserve_secret_updates_and_use_revision_cas(tmp_path):
    store = ConnectionStore(replace(Settings(), data_root=tmp_path))
    connection = Connection(name="API", base_url="https://example.test/v1", model="m", api_key="private-key", env={"PRIVATE": "secret"})
    result = store.write(connection, 0)
    public = result["connections"][-1]
    assert public["api_key_configured"]
    assert "private-key" not in json.dumps(result)
    assert "secret" not in json.dumps(result)
    assert public["env_names"] == ["PRIVATE"]
    with pytest.raises(HTTPException) as error:
        store.write(connection, 0)
    assert error.value.status_code == 409
    updated = store.get(public["id"]).model_copy(update={"name": "Renamed", "api_key": None, "env": {}})
    store.write(updated, 1)
    assert store.get(public["id"]).api_key == "private-key"
    assert store.get(public["id"]).env == {"PRIVATE": "secret"}


@pytest.mark.parametrize("preset", ["custom", "pi"])
def test_subprocess_agent_context_tools_permissions_model_and_resume(tmp_path, preset):
    calls = []
    def search(args):
        calls.append(args)
        return {"hits": [{"document_id": "doc-1", "job_id": "job-1", "page_idx": 0, "block_id": "b-1", "text": "evidence"}]}
    registry = ToolRegistry([Tool("search_fulltext", "Search", {"type": "object", "properties": {}}, search)], content_source_resolver=lambda *_: "structured")
    manager = ConnectionManager(replace(Settings(), data_root=tmp_path), None, registry)
    log = tmp_path / "events.jsonl"
    connection = Connection(id="local", name="Local", kind="byoa", preset=preset, command=sys.executable, args=[str(PEER)], cwd=str(tmp_path) if preset == "custom" else "", env={"FAKE_ACP_LOG": str(log), "FAKE_ACP_PERMISSION": "1", "FAKE_ACP_STARTUP": "## Context\n- private user skills\n", "FAKE_ACP_FOLLOWUP_NO_TOOLS": "1"})
    runtime = ByoaRuntime(manager, connection, "model-b", {})
    events = []
    def emit(event):
        events.append(event)
        if event["type"] == "agent_interaction":
            manager.interactions.respond(event["interaction_id"], {"option_id": "yes"})
    try:
        result = runtime.ask("read document", conversation_id="c-1", document_id="doc-1", job_id="job-1", on_event=emit)
    except Exception:
        errors = [json.loads(line).get("failure") for line in log.read_text(encoding="utf-8").splitlines() if "failure" in json.loads(line)]
        pytest.fail(str(errors))
    assert result.answer == "Evidence [1]"
    assert "".join(e["text"] for e in events if e["type"] == "answer_delta") == result.answer
    assert len(result.citations) == 1
    assert calls[0]["document_id"] == "doc-1"  # Cannot broaden the reading scope.
    history = [{"role": "user", "content": "read document"}, {"role": "assistant", "content": result.answer}]
    followup = runtime.ask("continue", history=history, conversation_id="c-1", document_id="doc-1", job_id="job-1", on_event=emit)
    assert followup.answer == result.answer
    assert followup.citations == result.citations
    assert followup.tool_trace == []
    recorded = [json.loads(line) for line in log.read_text(encoding="utf-8").splitlines()]
    workdirs = [r["params"]["cwd"] for r in recorded if r.get("method") in {"session/new", "session/load"}]
    assert all(Path(value).is_relative_to(tmp_path / "agent-runtime/byoa/workspaces") for value in workdirs) if preset == "pi" else all(Path(value) == tmp_path for value in workdirs)
    assert sum(r.get("method") == "initialize" for r in recorded) == 1
    assert sum(r.get("method") == "session/new" for r in recorded) == 1
    assert not any(r.get("method") == "session/load" for r in recorded)
    # A process loss still restores the native session on the next turn.
    next(iter(manager.sessions.sessions.values())).client.close()
    runtime.ask("continue after restart", history=history, conversation_id="c-1", document_id="doc-1", job_id="job-1", on_event=emit)
    restarted = [json.loads(line) for line in log.read_text(encoding="utf-8").splitlines()]
    assert sum(r.get("method") == "session/load" for r in restarted) == 1
    assert any(r.get("method") == "session/set_config_option" and r["params"]["value"] == "model-b" for r in recorded)
    assert all(r["userprofile"] == os.environ.get("USERPROFILE") for r in recorded if "method" in r)
    assert any(r.get("permission_reply", {}).get("result", {}).get("outcome", {}).get("optionId") == "yes" for r in recorded)
    runtime.ask("other conversation", conversation_id="c-2", document_id="doc-1", on_event=emit)
    assert not manager.interactions.pending


def test_cancel_stops_agent_process_and_releases_conversation(tmp_path):
    manager = ConnectionManager(replace(Settings(), data_root=tmp_path), None, None)
    connection = Connection(id="cancel", name="Local", kind="byoa", command=sys.executable, args=[str(PEER)], cwd=str(tmp_path))
    runtime = ByoaRuntime(manager, connection, "", {})
    control = RequestControl(10)
    errors = []
    def run():
        try:
            runtime.ask("hang forever", conversation_id="cancel", request_control=control)
        except Exception as exc:
            errors.append(exc)
    worker = threading.Thread(target=run)
    worker.start()
    time.sleep(0.3)
    control.cancel()
    worker.join(timeout=5)
    assert not worker.is_alive()
    assert errors and isinstance(errors[0], AIRequestCancelled)
    assert manager.turn_lock(connection.id, "cancel").acquire(blocking=False)


def test_selection_uses_its_own_protocol_and_key(tmp_path):
    from retainpdf_ai.api_contracts import AskInput
    manager = ConnectionManager(replace(Settings(), data_root=tmp_path, llm_api_key="old"), None, None)
    saved = manager.store.write(Connection(name="Claude API", api_protocol="anthropic", base_url="https://api.example/v1", api_key="new", model="default"), 0)
    id = saved["connections"][-1]["id"]
    runtime, settings = manager.resolve(AskInput(question="q", connection_id=id, connection_model="alternate", llm_api_key="translation-key"))
    assert settings.llm_api_key == "new"
    assert settings.llm_api_protocol == "anthropic"
    assert settings.llm_model == "alternate"
    assert runtime.runtime_id == f"byok:{id}"
    # Explicitly clearing a saved legacy connection must not bring back a
    # translation key from the browser's compatibility configuration.
    manager.store.write(Connection(id="legacy", name="Legacy", base_url="https://example.test/v1", model="m", api_key=""), 1)
    with pytest.raises(HTTPException) as error:
        manager.resolve(AskInput(question="q", connection_id="legacy", llm_api_key="browser-translation-key"))
    assert error.value.status_code == 400


def test_authenticated_run_control_is_idempotent_and_completion_releases_it(tmp_path):
    manager = ConnectionManager(replace(Settings(), data_root=tmp_path), None, None)
    control = RequestControl(10)
    manager.track_run("one", control)
    assert manager.cancel_run("one")
    assert control.cancelled
    assert not manager.cancel_run("one")
    finished = RequestControl(10)
    manager.track_run("two", finished)
    finished.finish()
    assert not manager.active_runs


def test_connection_and_interaction_routes_require_the_application_key(tmp_path):
    from fastapi.testclient import TestClient
    from retainpdf_ai.app import build_app
    from retainpdf_ai.runtimes.contracts import RuntimeCapabilities
    class Runtime:
        runtime_id = "test"
        capabilities = RuntimeCapabilities(document_reading=True, document_operations=False, streaming=True, durable_sessions=False, model_transport="host_chat")
    settings = replace(Settings(), data_root=tmp_path, api_keys=frozenset({"app-test-key"}))
    client = TestClient(build_app(settings=settings, runtime=Runtime()))
    assert client.get("/v1/connections").status_code == 401
    assert client.post("/v1/connections/runs/test/cancel").status_code == 401
    assert client.post("/v1/connections/interactions/test", json={}).status_code == 401
    headers = {"X-API-Key": "app-test-key"}
    result = client.put("/v1/connections", headers=headers, json={"expected_revision":0,"connection":{"name":"API","base_url":"https://example.test/v1","model":"m","api_key":"private-test-key"}})
    assert result.status_code == 200
    assert "private-test-key" not in result.text
    assert client.get("/v1/connections", headers=headers).json()["data"]["revision"] == 1
    assert client.post("/v1/connections/runs/finished/cancel", headers=headers).json()["data"]["cancelled"] is False


@pytest.mark.skipif(os.name != "nt", reason="Windows npm launcher")
def test_windows_npm_shims_launch_native_executables_and_node_scripts_without_a_shell(tmp_path):
    from retainpdf_ai.agent_presets import launch_argv
    shim = tmp_path / "agent.cmd"
    shim.write_text('@echo off\n"%dp0%\\node_modules\\agent\\bin\\agent.exe" %*\n', encoding="utf-8")
    argv = launch_argv(str(shim), ["acp", "literal & argument"], dict(os.environ))
    assert argv == [str(tmp_path / "node_modules/agent/bin/agent.exe"), "acp", "literal & argument"]
    shim.write_text('@echo off\n"%dp0%\\node_modules\\agent\\bin\\agent.js" %*\n', encoding="utf-8")
    argv = launch_argv(str(shim), ["acp"], dict(os.environ))
    assert Path(argv[0]).stem.lower() == "node"
    assert argv[1] == str(tmp_path / "node_modules/agent/bin/agent.js")
    shim.write_text('@echo off\nIF EXIST "%dp0%\\node.exe" SET "_prog=%dp0%\\node.exe"\n"%_prog%" "%dp0%\\..\\agent\\cli.js" %*\n', encoding="utf-8")
    argv = launch_argv(str(shim), ["acp"], dict(os.environ))
    assert Path(argv[1]).name == "cli.js"


def test_prepare_connection_runs_once_and_retry_can_recover(tmp_path, monkeypatch):
    from retainpdf_ai import byoa_runtime
    manager = ConnectionManager(replace(Settings(), data_root=tmp_path), None, None)
    manager.store.write(Connection(id="local", name="Codex", kind="byoa", preset="codex-acp", command="codex-acp"), 0)
    entered, release = threading.Event(), threading.Event()
    calls = []
    def prepare(*_):
        calls.append("prepare")
        entered.set()
        assert release.wait(3)
    monkeypatch.setattr(byoa_runtime, "prepare_adapter", prepare)
    monkeypatch.setattr(manager, "probe", lambda _: {"ready": True, "status": "ready", "message": "Connected"})
    assert manager.prepare_probe("local", fresh=True)["status"] == "preparing"
    assert entered.wait(3)
    assert manager.prepare_probe("local", fresh=True)["status"] == "preparing"
    release.set()
    deadline = time.monotonic() + 3
    while manager.prepare_probe("local")["status"] == "preparing" and time.monotonic() < deadline:
        time.sleep(0.01)
    assert manager.prepare_probe("local")["ready"]
    assert calls == ["prepare"]
    def unavailable(*_):
        raise ValueError("Install the CLI first")
    monkeypatch.setattr(byoa_runtime, "prepare_adapter", unavailable)
    manager.prepare_probe("local", fresh=True)
    deadline = time.monotonic() + 3
    while manager.prepare_probe("local")["status"] == "preparing" and time.monotonic() < deadline:
        time.sleep(0.01)
    assert manager.prepare_probe("local")["message"] == "Install the CLI first"


@pytest.mark.parametrize("protocol,path", [("openai", "/v1/models"), ("openai_responses", "/v1/models"), ("anthropic", "/v1/models")])
def test_saved_model_discovery_uses_native_auth_without_inference(tmp_path, monkeypatch, protocol, path):
    import httpx
    from retainpdf_ai import byoa_runtime
    manager = ConnectionManager(replace(Settings(), data_root=tmp_path), None, None)
    saved = manager.store.write(Connection(id="api", name="Service", provider="openai", api_protocol=protocol, base_url="https://service.test/v1", model="m", api_key="secret"), 0)
    requests = []
    def handle(request):
        requests.append(request)
        return httpx.Response(200, json={"data": [{"id": "model-a"}, {"id": "model-b"}]})
    original_client = httpx.Client
    monkeypatch.setattr(byoa_runtime.httpx, "Client", lambda **kwargs: original_client(transport=httpx.MockTransport(handle), **kwargs))
    result = manager.list_models("api")
    assert result["models"] == ["model-a", "model-b"]
    assert len(requests) == 1 and requests[0].method == "GET" and requests[0].url.path == path
    assert requests[0].headers.get("x-api-key" if protocol == "anthropic" else "authorization") == ("secret" if protocol == "anthropic" else "Bearer secret")
    assert saved["connections"][-1]["provider"] == "openai"


def test_agent_local_http_bypasses_proxy_and_preserves_existing_exceptions(tmp_path, monkeypatch):
    from retainpdf_ai import acp_transport
    original = acp_transport.subprocess.Popen
    captured = []
    def spawn(*args, **kwargs):
        if "env" in kwargs:
            captured.append(kwargs["env"])
        return original(*args, **kwargs)
    monkeypatch.setattr(acp_transport.subprocess, "Popen", spawn)
    monkeypatch.setenv("NO_PROXY", "existing.example")
    monkeypatch.setenv("HTTP_PROXY", "http://proxy.example:8080")
    connection = Connection(name="Local", kind="byoa", command=sys.executable, args=[str(PEER)], cwd=str(tmp_path), env={"no_proxy": "other.example"})
    client = acp_transport.AcpClient(connection)
    try:
        assert client.initialize(RequestControl(5))["protocolVersion"] == 1
        assert set(captured[0]["NO_PROXY"].split(",")) >= {"existing.example", "other.example", "127.0.0.1", "localhost", "::1"}
        assert captured[0]["HTTP_PROXY"] == "http://proxy.example:8080"
    finally:
        client.close()
def test_authentication_completes_only_after_a_fresh_session_probe(tmp_path):
    manager = ConnectionManager(replace(Settings(), data_root=tmp_path), None, None)
    manager.store.write(Connection(id="auth", name="Test", kind="byoa", command=sys.executable,
        args=[str(PEER)], cwd=str(tmp_path)), 0)
    result = manager.authenticate("auth", {"method_id": "local"})
    deadline = time.monotonic() + 5
    while result["status"] == "authenticating" and time.monotonic() < deadline:
        time.sleep(0.02)
        result = manager.authentication_status("auth")
    assert result["ready"] is True
    assert result["status"] == "ready"
    assert result["config_options"]
    manager.sessions.close()


def test_pending_authentication_can_be_cancelled(tmp_path):
    manager = ConnectionManager(replace(Settings(), data_root=tmp_path), None, None)
    manager.store.write(Connection(id="auth", name="Test", kind="byoa", command=sys.executable,
        args=[str(PEER)], cwd=str(tmp_path), env={"FAKE_ACP_AUTH_HANG": "1"}), 0)
    manager.authenticate("auth", {"method_id": "local"})
    manager.cancel_authentication("auth")
    deadline = time.monotonic() + 5
    result = manager.authentication_status("auth")
    while result["status"] == "authenticating" and time.monotonic() < deadline:
        time.sleep(0.02)
        result = manager.authentication_status("auth")
    assert result["status"] == "cancelled"
    manager.sessions.close()
