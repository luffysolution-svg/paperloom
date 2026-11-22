# Agent run directories

Every asynchronous batch started by the CLI or MCP has a run directory under the configured data directory:

```text
<paperloom-data>/agent-runs/<run-id>/
  manifest.json
  events.jsonl
  evidence.json
  claims.json
  outputs/
  errors.jsonl
```

`manifest.json` follows `contracts/agent-run-manifest.v1.schema.json`. Events are append-only JSON Lines. A resumed run keeps the original `run_id` and adds a resume event. Source PDFs and backend job artifacts remain in their normal locations and are referenced by IDs or hashes.

Run files must not contain API keys. The `doctor` command checks the directory's ability to create a temporary file, but does not upload files or call a model.
