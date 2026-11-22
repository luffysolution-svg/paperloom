import json
import pathlib
import sys
import tempfile
import unittest


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

    def test_run_resources_include_manifest_and_evidence(self):
        resources = mcp.handle({"jsonrpc": "2.0", "id": 11, "method": "resources/list", "params": {}}, FakeApi())
        uris = {resource["uri"] for resource in resources["result"]["resources"]}
        self.assertIn("paperloom://runs/{run_id}/manifest", uris)
        self.assertIn("paperloom://runs/{run_id}/evidence", uris)
        self.assertIn("paperloom://jobs/{job_id}/pages/{page}/image", uris)

    def test_figure_resource_and_evidence_validation(self):
        api = FakeApi()
        api.base = "http://127.0.0.1:46000"
        original = api.request
        def request(method, path, body=None, *, query=None):
            if path.endswith("/reader/regions/fig-1"):
                return {"item_id": "fig-1", "page_idx": 2, "text": "Figure 1"}
            return original(method, path, body, query=query)
        api.request = request
        figure = mcp.handle({"jsonrpc": "2.0", "id": 14, "method": "tools/call", "params": {"name": "get_figure_resource", "arguments": {"job_id": "job-1", "item_id": "fig-1"}}}, api)
        figure_data = figure["result"]["structuredContent"]["data"]
        self.assertEqual(figure_data["page"], 3)
        evidence = mcp.handle({"jsonrpc": "2.0", "id": 15, "method": "tools/call", "params": {"name": "validate_evidence", "arguments": {"references": [{"source_kind": "page", "job_id": "job-1", "page": 3, "quote": "Figure 1"}]}}}, api)
        self.assertTrue(evidence["result"]["structuredContent"]["data"]["valid"])

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

    def test_batch_write_requires_confirmation(self):
        response = mcp.handle({"jsonrpc": "2.0", "id": 12, "method": "tools/call", "params": {"name": "run_batch_workflow", "arguments": {"action": "ocr", "items": [{"document_id": "doc-1"}], "dry_run": False}}}, BatchApi())
        self.assertTrue(response["result"]["isError"])
        self.assertIn("confirmed=true", response["result"]["structuredContent"]["error"]["message"])


if __name__ == "__main__":
    unittest.main()
