---
name: paperloom-pdf-ops
description: Use PaperLoom to import PDFs, run OCR or translation, inspect jobs, export Markdown, and sync results to Zotero or Obsidian. Trigger for single-paper or batch document operations.
---

# PaperLoom PDF operations

## Interface priority

Prefer the connected `paperloom` MCP server tools whenever available — they work across Windows, macOS, and Linux without requiring `paperloom` on shell `PATH`:

- Health & discovery: `get_capabilities`, `list_documents`, `search_documents`, `get_document`
- Ingest & jobs: `upload_pdf`, `submit_ocr`, `submit_translation`, `get_job_status`, `get_job_events`, `cancel_job`, `retry_job`, `run_batch_workflow`, `get_run_status`
- Export & integrations: `export_markdown`, `obsidian_status`, `export_obsidian`, `sync_obsidian_to_zotero`, `zotero_status`, `zotero_collections`, `zotero_items`, `import_zotero_attachments`, `writeback_zotero`

Only fall back to the `paperloom` terminal CLI when MCP tools are not attached in the current host session.

## Workflow

1. Call `get_capabilities` (or run `paperloom agent doctor --json` if using CLI) before a new session. Never print or request credentials in the chat.
2. Inspect existing documents and artifacts (`list_documents`, `get_document`) before uploading or starting a duplicate job.
3. For a Zotero batch, import the selected PDF attachments and use the returned PaperLoom `document_id` values. For a batch of local PDFs, use `path` entries. Preview the batch with `run_batch_workflow` and `dry_run: true` (CLI: `workflow validate`, then `workflow run --dry-run`). Report the selected papers, page scope and writes. If preflight reports errors, resolve them before submitting. A preview without a configuration check verifies the plan only.
4. Ask for confirmation before OCR, translation, Zotero writeback, Obsidian overwrite, or any operation that can incur model cost. Pass `confirmed: true` (or `--confirm`) only after explicit confirmation.
5. After submission, return the execution `run_id` and each paper's `job_id`. Read `get_run_status` for the batch manifest and `get_job_status` for each job's current state. A submission can contain both queued and failed papers.
6. On failure, inspect events and the resume plan before retrying (`retry_job`). Retry only the failed stage and record the reason.
7. A completed OCR job can export its source note directly. Use `export_obsidian` to write notes and assets to a vault. For an offline handoff, use `export_markdown` with `format: "obsidian_zip"` and an output path. Its default single Markdown uses backend image URLs. Choose `format: "raw"` to inspect the provider's OCR draft.
8. On Zotero import, set an attachment's `supplement` to true for SI or false for the main paper when the role is known. To sync edited bibliographic fields and the `## 阅读笔记` section, call `sync_obsidian_to_zotero` with the exported job, vault, folder and collection-folder setting. Report the returned fields and note status. If the user wants the translated PDF attached to Zotero, use `writeback_zotero`.

PaperLoom's default translation target is Simplified Chinese. For the whole PDF, omit `ocr.page_ranges` and `translation.page_ranges`.

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
paperloom agent zotero import users/0 --attachments ITEM:PDF:main,ITEM:SUPP:si --confirm --json
paperloom agent reader markdown <job-id> --output source.md --json
paperloom agent obsidian bundle <job-id> --output paper.zip --json
paperloom agent obsidian export --vault-id <vault> --folder PaperLoom --document-ids <document-id> --confirm --json
paperloom agent obsidian sync-zotero <job-id> --vault-id <vault> --folder PaperLoom --confirm --json
paperloom agent zotero writeback --document-ids <document-id> --confirm --json
```

## Safety and output rules

- Use `--json` for machine-readable output. Progress and diagnostics belong on stderr; job events are returned by `paperloom agent job events`.
- Keep source PDFs immutable. PaperLoom artifacts are referenced by job ID and content hash.
- Do not claim that OCR or translation is complete until the job status and report confirm it.
- When writing to a vault or Zotero, report the exact target and conflict decision.
- Batch files follow `contracts/agent-batch-workflow.v1.schema.json`.

See [references/operations.md](references/operations.md) for the operation matrix.
