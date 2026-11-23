import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import paperloom_mcp as mcp  # noqa: E402


class FakeApi:
    def __init__(self):
        self.calls = []

    def request(self, method, path, body=None, *, query=None):
        self.calls.append((method, path, body, query))
        if path == "/ready":
            return {"ready": True}
        return {"path": path, "body": body, "query": query}


class BatchApi(FakeApi):
    @property
    def data_dir(self):
        return pathlib.Path(self._data_dir)

    def upload(self, path):
        self.calls.append(("UPLOAD", str(path), None, None))
        return {"document_id": "uploaded-doc"}

    def prepare_job_options(self, action, options):
        return options, False, []

    def request(self, method, path, body=None, *, query=None):
        self.calls.append((method, path, body, query))
        if method == "POST" and path.startswith("/api/v1/documents/"):
            return {"job_id": "job-1"}
        if method == "GET" and path == "/api/v1/jobs/job-1":
            return {"job_id": "job-1", "status": "succeeded"}
        return {"path": path, "body": body, "query": query}


class ReaderApi(FakeApi):
    @property
    def base(self):
        return "http://127.0.0.1:46000"

    def request(self, method, path, body=None, *, query=None):
        self.calls.append((method, path, body, query))
        if path.endswith("/reader/metadata"):
            return {"source": {"page_count": 2}, "translated": {"page_count": 2}}
        if path.endswith("/reader/markdown"):
            return {"content": "# Title", "content_with_absolute_image_urls": "# Title\n\n![Figure](http://localhost/figure)"}
        if path.endswith("/reader/regions"):
            return {"items": [
                {
                    "item_id": "p002-b0001",
                    "source": {"page": 2, "text": "330 valid responses"},
                    "translated": {"page": 2, "text": "共收集到 330 份有效答卷"},
                    "region_type": "paragraph",
                    "asset_urls": [],
                },
                {
                    "item_id": "p001-b0001",
                    "source": {"page": 1, "text": "Figure 1"},
                    "translated": {"page": 1, "text": "图 1"},
                    "region_type": "figure",
                    "asset_urls": ["/api/v1/jobs/job-1/files/output/ocr/images/page-1/figure.png"],
                },
            ]}
        return super().request(method, path, body, query=query)


class ConfiguredBatchApi(BatchApi):
    def prepare_job_options(self, action, options):
        return {
            "translation": {"model": "deepseek-flash", "api_key": "translation-secret"},
            "ocr": {"provider": "paddle", "paddle_token": "paddle-secret"},
        }, True, []


class McpProtocolTests(unittest.TestCase):
    def test_initialize_and_catalogues(self):
        api = FakeApi()
        initialized = mcp.handle({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}, api)
        self.assertEqual(initialized["result"]["serverInfo"]["name"], "paperloom")
        tools = mcp.handle({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}, api)
        names = {tool["name"] for tool in tools["result"]["tools"]}
        self.assertIn("get_page_context", names)
        self.assertIn("writeback_zotero", names)
        prompts = mcp.handle({"jsonrpc": "2.0", "id": 3, "method": "prompts/list", "params": {}}, api)
        self.assertIn("read_paper", {item["name"] for item in prompts["result"]["prompts"]})

    def test_read_only_tool_uses_envelope(self):
        api = FakeApi()
        response = mcp.handle({"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "search_documents", "arguments": {"query": "transformer"}}}, api)
        payload = response["result"]["structuredContent"]
        self.assertTrue(payload["ok"])
        self.assertEqual(api.calls[0][1], "/api/v1/search")
        self.assertEqual(api.calls[0][3]["q"], "transformer")

    def test_write_requires_explicit_confirmation(self):
        api = FakeApi()
        response = mcp.handle({"jsonrpc": "2.0", "id": 5, "method": "tools/call", "params": {"name": "writeback_zotero", "arguments": {"job_id": "job-1"}}}, api)
        payload = response["result"]["structuredContent"]
        self.assertTrue(payload["ok"])
        self.assertEqual(len(api.calls), 0)
        self.assertIn("confirmed=true", payload["warnings"][0])

    def test_zotero_import_requires_explicit_confirmation(self):
        api = FakeApi()
        response = mcp.handle({"jsonrpc": "2.0", "id": 13, "method": "tools/call", "params": {"name": "import_zotero_attachments", "arguments": {"library_id": "users/0", "attachments": [{"item_key": "A", "attachment_key": "B"}]}}}, api)
        payload = response["result"]["structuredContent"]
        self.assertTrue(payload["ok"])
        self.assertIn("confirmed=true", payload["warnings"][0])
        self.assertEqual(api.calls, [])

    def test_resource_uri_is_readable(self):
        api = FakeApi()
        response = mcp.handle({"jsonrpc": "2.0", "id": 6, "method": "resources/read", "params": {"uri": "paperloom://documents/doc-1/metadata"}}, api)
        self.assertEqual(response["result"]["contents"][0]["uri"], "paperloom://documents/doc-1/metadata")
        self.assertEqual(api.calls[0][1], "/api/v1/documents/doc-1")

    def test_markdown_export_writes_the_document_text(self):
        with tempfile.TemporaryDirectory() as root:
            path = pathlib.Path(root) / "reader.md"
            api = ReaderApi()
            args = {"job_id": "job-1", "output": str(path)}
            result = mcp._call_tool("export_markdown", args, api)
            self.assertEqual(path.read_text(encoding="utf-8"), result["data"]["content"])
            self.assertTrue(result["data"]["content"].startswith("# Title\n"))
            self.assertEqual(api.calls[-1][3], {"obsidian": "true"})
            mcp._call_tool("export_markdown", {**args, "format": "raw"}, api)
            self.assertEqual(path.read_text(encoding="utf-8"), "# Title")
            self.assertIsNone(api.calls[-1][3])

    def test_vault_exports_and_zotero_note_sync_keep_their_targets(self):
        api = FakeApi()
        folder = {"vault_id": "vault", "folder": "Papers", "folder_by_collection": True}
        args = {"job_id": "a/b", **folder}
        mcp._call_tool("sync_obsidian_to_zotero", args, api)
        self.assertEqual(api.calls, [])
        mcp._call_tool("sync_obsidian_to_zotero", {**args, "confirmed": True}, api)
        self.assertEqual(api.calls.pop(), ("POST", "/api/v1/jobs/a%2Fb/obsidian/zotero-sync", folder, None))
        mcp._call_tool("export_obsidian", {**args, "include_source": False, "confirmed": True}, api)
        self.assertEqual(api.calls.pop(), ("POST", "/api/v1/jobs/a%2Fb/obsidian/export", {**folder, "include_source": False}, None))
        batch = {**folder, "document_ids": ["doc-1", "doc-2"]}
        mcp._call_tool("export_obsidian", {**batch, "confirmed": True}, api)
        self.assertEqual(api.calls.pop(), ("POST", "/api/v1/integrations/obsidian/export-batch", batch, None))
        with self.assertRaisesRegex(ValueError, "document_ids"):
            mcp._call_tool("export_obsidian", {**batch, "job_id": "job-1", "confirmed": True}, api)
        self.assertEqual(api.calls, [])
        attachments = [{"item_key": "A", "attachment_key": "P", "supplement": False},
                       {"item_key": "A", "attachment_key": "S", "supplement": True}]
        mcp._call_tool("import_zotero_attachments", {"library_id": "users/0", "attachments": attachments, "confirmed": True}, api)
        self.assertEqual(api.calls.pop()[2]["attachments"], attachments)

    def test_portable_export_requires_a_destination_and_uses_the_zip_endpoint(self):
        api = mock.Mock()
        args = {"job_id": "job-1", "format": "obsidian_zip", "include_source": False}
        with self.assertRaisesRegex(ValueError, "output"):
            mcp._call_tool("export_markdown", args, api)
        api.request.assert_not_called()
        api.request.return_value = {"output": "paper.zip", "bytes": 42}
        data = mcp._call_tool("export_markdown", {**args, "output": "paper.zip"}, api)
        api.request.assert_called_once_with("GET", "/api/v1/jobs/job-1/markdown/export",
                                            query={"include_source": "false"}, output=pathlib.Path("paper.zip"))
        self.assertEqual(data["data"], api.request.return_value)

    def test_run_resources_include_manifest_and_evidence(self):
        resources = mcp.handle({"jsonrpc": "2.0", "id": 11, "method": "resources/list", "params": {}}, FakeApi())
        uris = {resource["uri"] for resource in resources["result"]["resources"]}
        self.assertIn("paperloom://runs/{run_id}/manifest", uris)
        self.assertIn("paperloom://runs/{run_id}/evidence", uris)
        self.assertIn("paperloom://jobs/{job_id}/pages/{page}/image", uris)

    def test_figure_resource_and_evidence_validation(self):
        api = ReaderApi()
        reference = {"source_kind": "region", "job_id": "job-1", "item_id": "p001-b0001", "page": 1, "quote": "Figure 1"}
        evidence = mcp._call_tool("validate_evidence", {"references": [
            reference, {**reference, "page": 2}, {**reference, "quote": "unsupported quotation"}
        ]}, api)["data"]
        self.assertEqual(evidence["valid_references"], [reference])
        self.assertEqual([row["index"] for row in evidence["invalid_references"]], [1, 2])
        self.assertEqual(len(api.calls), 1)

    def test_reader_page_region_and_figure_tools_use_collection_endpoint(self):
        api = ReaderApi()
        page = mcp.handle({"jsonrpc": "2.0", "id": 21, "method": "tools/call", "params": {"name": "get_page_context", "arguments": {"job_id": "job-1", "page": 2}}}, api)
        self.assertEqual(page["result"]["structuredContent"]["data"]["page"]["items"][0]["item_id"], "p002-b0001")
        region = mcp.handle({"jsonrpc": "2.0", "id": 22, "method": "tools/call", "params": {"name": "get_region_context", "arguments": {"job_id": "job-1", "item_id": "p002-b0001"}}}, api)
        self.assertEqual(region["result"]["structuredContent"]["data"]["source"]["page"], 2)
        figure = mcp.handle({"jsonrpc": "2.0", "id": 23, "method": "tools/call", "params": {"name": "get_figure_resource", "arguments": {"job_id": "job-1", "item_id": "p001-b0001"}}}, api)
        self.assertEqual(figure["result"]["structuredContent"]["data"]["page"], 1)
        self.assertTrue(figure["result"]["structuredContent"]["data"]["image"]["uri"].endswith("/files/pages/1.jpg"))
        self.assertEqual(figure["result"]["structuredContent"]["data"]["assets"][0]["uri"], api.base + "/api/v1/jobs/job-1/files/output/ocr/images/page-1/figure.png")

    def test_search_document_reads_only_the_requested_job(self):
        api = ReaderApi()
        result = mcp.handle({"jsonrpc": "2.0", "id": 24, "method": "tools/call", "params": {"name": "search_document", "arguments": {"job_id": "job-1", "query": "responses"}}}, api)
        self.assertTrue(result["result"]["structuredContent"]["ok"])
        self.assertEqual(api.calls[-1][1], "/api/v1/jobs/job-1/reader/regions")
        hit, = result["result"]["structuredContent"]["data"]["hits"]
        self.assertEqual((hit["page"], hit["block_id"]), (2, "p002-b0001"))

    def test_invalid_arguments_are_mcp_tool_errors(self):
        api = FakeApi()
        response = mcp.handle({"jsonrpc": "2.0", "id": 7, "method": "tools/call", "params": {"name": "get_job_status", "arguments": {}}}, api)
        self.assertTrue(response["result"]["isError"])
        self.assertEqual(response["result"]["structuredContent"]["error"]["code"], "invalid_request")

    def test_scholarly_search_returns_normalized_results(self):
        original = mcp.search_scholarly_records
        try:
            mcp.search_scholarly_records = lambda query, providers=None, limit=10: ([
                {"provider": "crossref", "title": "A paper", "authors": ["A Author"], "year": 2024, "doi": "10.1/x", "abstract": None, "url": None, "venue": None}
            ], [])
            response = mcp.handle({"jsonrpc": "2.0", "id": 8, "method": "tools/call", "params": {"name": "search_scholarly", "arguments": {"query": "paper", "providers": ["crossref"]}}}, FakeApi())
            payload = response["result"]["structuredContent"]
            self.assertTrue(payload["ok"])
            self.assertEqual(payload["data"]["results"][0]["doi"], "10.1/x")
            self.assertEqual(payload["references"][0]["source_kind"], "external")
        finally:
            mcp.search_scholarly_records = original

    def test_batch_dry_run_persists_plan_and_can_be_read_back(self):
        with tempfile.TemporaryDirectory() as root:
            api = BatchApi()
            api._data_dir = root
            response = mcp.handle({"jsonrpc": "2.0", "id": 8, "method": "tools/call", "params": {"name": "run_batch_workflow", "arguments": {"action": "translate", "items": [{"document_id": "doc-1"}, {"document_id": "doc-2"}], "dry_run": True}}}, api)
            value = response["result"]["structuredContent"]["data"]
            self.assertEqual(value["status"], "planned")
            self.assertEqual(len(value["items"]), 2)
            status = mcp.handle({"jsonrpc": "2.0", "id": 9, "method": "tools/call", "params": {"name": "get_run_status", "arguments": {"run_id": value["run_id"]}}}, api)
            self.assertEqual(len(status["result"]["structuredContent"]["data"]["items"]), 2)
            self.assertTrue((pathlib.Path(root) / "agent-runs" / value["run_id"] / "events.jsonl").is_file())

    def test_batch_submits_each_document(self):
        with tempfile.TemporaryDirectory() as root:
            api = BatchApi()
            api._data_dir = root
            response = mcp.handle({"jsonrpc": "2.0", "id": 10, "method": "tools/call", "params": {"name": "run_batch_workflow", "arguments": {"action": "ocr", "items": [{"document_id": "doc-1"}], "dry_run": False, "confirmed": True}}}, api)
            value = response["result"]["structuredContent"]["data"]
            self.assertEqual(value["items"][0]["status"], "submitted")
            self.assertEqual(api.calls[0][1], "/api/v1/documents/doc-1/ocr")
            refreshed = mcp._run_status({"run_id": value["run_id"]}, api)
            self.assertEqual(refreshed["items"][0]["status"], "succeeded")

    def test_batch_uses_local_provider_defaults_and_redacts_the_manifest(self):
        with tempfile.TemporaryDirectory() as root:
            api = ConfiguredBatchApi()
            api._data_dir = root
            response = mcp.handle({"jsonrpc": "2.0", "id": 11, "method": "tools/call", "params": {"name": "run_batch_workflow", "arguments": {"action": "translate", "items": [{"document_id": "doc-1"}], "dry_run": False, "confirmed": True}}}, api)
            value = response["result"]["structuredContent"]["data"]
            self.assertEqual(value["status"], "submitted")
            body = api.calls[0][2]
            self.assertEqual(body["ocr"]["paddle_token"], "paddle-secret")
            self.assertEqual(body["translation"]["model"], "deepseek-flash")
            manifest = json.loads((pathlib.Path(root) / "agent-runs" / value["run_id"] / "manifest.json").read_text(encoding="utf8"))
            self.assertNotIn("secret", json.dumps(manifest))

    def test_batch_rejects_a_missing_local_provider_configuration_before_submit(self):
        with tempfile.TemporaryDirectory() as root:
            api = ConfiguredBatchApi()
            api._data_dir = root
            api.prepare_job_options = lambda action, options: (options, False, ["OCR 未配置凭据"])
            response = mcp.handle({"jsonrpc": "2.0", "id": 12, "method": "tools/call", "params": {"name": "run_batch_workflow", "arguments": {"action": "translate", "items": [{"document_id": "doc-1"}], "dry_run": False, "confirmed": True}}}, api)
            value = response["result"]["structuredContent"]["data"]
            self.assertEqual(value["status"], "blocked")
            self.assertEqual(api.calls, [])

    def test_batch_write_requires_confirmation(self):
        response = mcp.handle({"jsonrpc": "2.0", "id": 12, "method": "tools/call", "params": {"name": "run_batch_workflow", "arguments": {"action": "ocr", "items": [{"document_id": "doc-1"}], "dry_run": False}}}, BatchApi())
        self.assertTrue(response["result"]["isError"])
        self.assertIn("confirmed=true", response["result"]["structuredContent"]["error"]["message"])

    def test_preflight_marks_unknown_and_skipped_documents_without_submitting(self):
        with tempfile.TemporaryDirectory() as root:
            api = BatchApi()
            api._data_dir = root
            with mock.patch.object(api, "request", side_effect=RuntimeError("document not found")) as request:
                result = mcp._batch_workflow({"action": "ocr", "failure_policy": "stop", "items": [
                    {"document_id": "unknown"}, {"document_id": "second"},
                ]}, api)
            self.assertEqual(result["status"], "blocked")
            self.assertEqual([item["status"] for item in result["items"]], ["failed", "skipped"])
            request.assert_called_once_with("GET", "/api/v1/documents/unknown")

    def test_status_tracks_every_job_of_a_split_translation(self):
        with tempfile.TemporaryDirectory() as root:
            api = BatchApi()
            api._data_dir = root
            replies = [
                {"job_id": "first-page", "sibling_job_ids": ["second-page"]},
                {"status": "succeeded"}, {"status": "running"},
            ]
            with mock.patch.object(api, "request", side_effect=replies):
                run = mcp._batch_workflow({"action": "translate", "items": [{"document_id": "doc"}],
                                           "dry_run": False, "confirmed": True}, api)
                item, = mcp._run_status({"run_id": run["run_id"]}, api)["items"]
            self.assertEqual(item["status"], "running")
            self.assertEqual([(job["job_id"], job["status"]) for job in item["jobs"]],
                             [("first-page", "succeeded"), ("second-page", "running")])

    def test_remote_backend_and_older_cli_preserve_explicit_options(self):
        api = mcp.PaperLoomApi()
        options = {"translation": {"base_url": "https://models.example", "credential_ref": "ref"}}
        api.base = "https://library.example"
        with mock.patch.object(subprocess, "run") as run:
            self.assertEqual(api.prepare_job_options("translate", options), (options, False, []))
            run.assert_not_called()
        api.base = "http://localhost:46000"
        unknown = subprocess.CompletedProcess([], 2, b"", b"error: unrecognized subcommand 'prepare-job-options'")
        with mock.patch.dict(os.environ, {"PAPERLOOM_CONFIG_CLI": "old-cli"}), mock.patch.object(subprocess, "run", return_value=unknown):
            self.assertEqual(api.prepare_job_options("translate", options), (options, False, []))

    def test_notifications_do_not_emit_responses(self):
        api = FakeApi()
        self.assertIsNone(mcp.handle({"jsonrpc": "2.0", "method": "notifications/initialized"}, api))
        self.assertIsNone(mcp.handle({"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": 1}}, api))
        self.assertIsNone(mcp.handle({"jsonrpc": "2.0", "method": "custom/ping"}, api))

    def test_initialize_negotiates_supported_protocol_version(self):
        api = FakeApi()
        v1 = mcp.handle({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05"}}, api)
        self.assertEqual(v1["result"]["protocolVersion"], "2024-11-05")
        v2 = mcp.handle({"jsonrpc": "2.0", "id": 2, "method": "initialize", "params": {"protocolVersion": "2099-01-01"}}, api)
        self.assertEqual(v2["result"]["protocolVersion"], mcp.PROTOCOL_VERSION)

    def test_resource_templates_list(self):
        response = mcp.handle({"jsonrpc": "2.0", "id": 16, "method": "resources/templates/list", "params": {}}, FakeApi())
        templates = {item["uriTemplate"] for item in response["result"]["resourceTemplates"]}
        self.assertIn("paperloom://documents/{document_id}/metadata", templates)
        self.assertIn("paperloom://jobs/{job_id}/markdown", templates)

    def test_dynamic_runtime_file_discovery_without_restart(self):
        with tempfile.TemporaryDirectory() as home:
            old_home = os.environ.get("PAPERLOOM_HOME")
            old_retain = os.environ.get("RETAINPDF_HOME")
            old_base = os.environ.get("PAPERLOOM_API_BASE")
            try:
                os.environ["PAPERLOOM_HOME"] = home
                os.environ.pop("RETAINPDF_HOME", None)
                os.environ.pop("PAPERLOOM_API_BASE", None)
                api = mcp.PaperLoomApi()
                self.assertEqual(api.base, "")
                run_dir = pathlib.Path(home) / "run"
                run_dir.mkdir(parents=True, exist_ok=True)
                (run_dir / "backend.json").write_text(
                    json.dumps({"api_base": "http://127.0.0.1:46123", "api_key": "desktop-key"}),
                    encoding="utf-8",
                )
                self.assertEqual(api.base, "http://127.0.0.1:46123")
                self.assertEqual(api.api_key, "desktop-key")
            finally:
                if old_home is None:
                    os.environ.pop("PAPERLOOM_HOME", None)
                else:
                    os.environ["PAPERLOOM_HOME"] = old_home
                if old_retain is None:
                    os.environ.pop("RETAINPDF_HOME", None)
                else:
                    os.environ["RETAINPDF_HOME"] = old_retain
                if old_base is None:
                    os.environ.pop("PAPERLOOM_API_BASE", None)
                else:
                    os.environ["PAPERLOOM_API_BASE"] = old_base

    def test_stdio_subprocess_emits_strict_utf8_even_without_pythonutf8(self):
        env = {k: v for k, v in os.environ.items() if k not in {"PYTHONUTF8", "PYTHONIOENCODING"}}
        payload = (
            json.dumps({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-03-26"}})
            + "\n"
            + json.dumps({"jsonrpc": "2.0", "method": "notifications/initialized"})
            + "\n"
            + json.dumps({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})
            + "\n"
        ).encode("utf-8")
        proc = subprocess.run(
            [sys.executable, str(ROOT / "paperloom_mcp.py")],
            input=payload,
            capture_output=True,
            env=env,
            timeout=15,
            check=False,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr.decode("utf-8", errors="replace"))
        # Strict UTF-8 decode must succeed on every platform (esp. Chinese Windows GBK default).
        decoded = proc.stdout.decode("utf-8", errors="strict")
        lines = [line for line in decoded.splitlines() if line.strip()]
        self.assertEqual(len(lines), 2)
        init_resp = json.loads(lines[0])
        tools_resp = json.loads(lines[1])
        self.assertEqual(init_resp["result"]["protocolVersion"], "2025-03-26")
        tool_names = {tool["name"] for tool in tools_resp["result"]["tools"]}
        self.assertIn("search_scholarly", tool_names)
        self.assertIn("get_capabilities", tool_names)


if __name__ == "__main__":
    unittest.main()
