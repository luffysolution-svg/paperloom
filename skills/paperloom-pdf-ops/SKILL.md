---
name: paperloom-pdf-ops
description: Use PaperLoom to import PDFs, run OCR or translation, inspect jobs, export Markdown, and sync results to Zotero or Obsidian. Trigger for single-paper or batch document operations.
---

# PaperLoom PDF operations

## Interface priority

Prefer the connected `paperloom` MCP server tools whenever available — they work across Windows, macOS, and Linux without requiring `paperloom` on shell `PATH`:

- Health & discovery: `get_capabilities`, `list_documents`, `search_documents`, `get_document`
- Ingest & jobs: `upload_pdf`, `submit_ocr`, `submit_translation`, `get_job_status`, `get_job_events`, `cancel_job`, `retry_job`, `run_batch_workflow`, `get_run_status`
- Export & integrations: `export_markdown`, `zotero_status`, `zotero_collections`, `zotero_items`, `import_zotero_attachments`, `writeback_zotero`, `obsidian_status`, `export_obsidian`

Only fall back to the `paperloom` terminal CLI when MCP tools are not attached in the current host session.

## Workflow

1. Call `get_capabilities` (or run `paperloom agent doctor --json` if using CLI) before a new session. Never print or request credentials in the chat.
2. Inspect existing documents and artifacts (`list_documents`, `get_document`) before uploading or starting a duplicate job.
3. For a batch, call `run_batch_workflow` with `dry_run: true` first (or `paperloom agent workflow validate` + `--dry-run`) and show the item count, stages, estimated writes, and conflict policy.
4. Ask for confirmation before OCR, translation, Zotero writeback, Obsidian overwrite, or any operation that can incur model cost. Pass `confirmed: true` (or `--confirm`) only after explicit confirmation.
5. Return the `run_id` or `job_id` immediately, then poll status (`get_job_status`, `get_job_events`, `get_run_status`). Keep each item result even when another item fails.
6. On failure, inspect events and the resume plan before retrying (`retry_job`). Retry only the failed stage and record the reason.
7. Export Markdown or PDF only after the requested job reaches a terminal state. Include the output path and source identifiers.

## Optional CLI fallback commands

```text
paperloom agent document list --json
paperloom agent document search "query" --json
paperloom agent ocr submit <document-id> --json
paperloom agent translate submit <document-id> --json
paperloom agent job status <job-id> --json
paperloom agent job events <job-id> --json
paperloom agent workflow run workflow.yml --dry-run --json
paperloom agent zotero items users/0 --limit 50 --json
paperloom agent zotero import users/0 --attachments ITEM:ATTACHMENT --confirm --json
paperloom agent obsidian export --vault-id <vault> --folder PaperLoom --document-ids <document-id> --on-conflict ask --json
paperloom agent obsidian export --vault-id <vault> --folder PaperLoom --document-ids <document-id> --confirm --json
paperloom agent zotero writeback --document-ids <document-id> --confirm --json
```

## Safety and output rules

- Use `--json` for machine-readable output. Progress and diagnostics belong on stderr; job events are returned by `paperloom agent job events`.
- Keep source PDFs immutable. PaperLoom artifacts are referenced by job ID and content hash.
- Do not claim that OCR or translation is complete until the job status and report confirm it.
- When writing to a vault or Zotero, report the exact target and conflict decision.
- Batch files follow `contracts/agent-batch-workflow.v1.schema.json`.

See [references/operations.md](references/operations.md) for the operation matrix.
