---
name: paperloom-pdf-ops
description: Use PaperLoom to import PDFs, run OCR or translation, inspect jobs, export Markdown, and sync results to Zotero or Obsidian. Trigger for single-paper or batch document operations.
---

# PaperLoom PDF operations

## Workflow

1. Run `paperloom agent doctor --json` before a new session. Never print or request credentials in the chat.
2. Inspect existing documents and artifacts before uploading or starting a duplicate job.
3. For a batch, load the workflow file, run `paperloom agent workflow validate <file> --json`, then run it with `--dry-run` and show the item count, stages, estimated writes, and conflict policy.
4. Ask for confirmation before OCR, translation, Zotero writeback, Obsidian overwrite, or any operation that can incur model cost. A caller that already supplied an explicit confirmation flag may proceed.
5. Return the `run_id` or `job_id` immediately, then poll status or consume JSONL events. Keep each item result even when another item fails.
6. On failure, inspect events and the resume plan before retrying. Retry only the failed stage and record the reason.
7. Export Markdown or PDF only after the requested job reaches a terminal state. Include the output path and source identifiers.

## Useful commands

```text
paperloom agent document list --json
paperloom agent document search "query" --json
paperloom agent ocr submit <document-id> --json
paperloom agent translate submit <document-id> --json
paperloom agent job status <job-id> --json
paperloom agent job events <job-id> --events jsonl
paperloom agent workflow run workflow.yml --dry-run --json
paperloom agent zotero items users/0 --limit 50 --json
paperloom agent zotero import users/0 --attachments ITEM:ATTACHMENT --confirm --json
paperloom agent obsidian export --vault-id <vault> --folder PaperLoom --document-ids <document-id> --on-conflict ask --json
paperloom agent obsidian export --vault-id <vault> --folder PaperLoom --document-ids <document-id> --confirm --json
paperloom agent zotero writeback --document-ids <document-id> --confirm --json
```

## Safety and output rules

- Use `--json` for machine-readable output. Progress belongs on stderr or `--events jsonl`.
- Keep source PDFs immutable. PaperLoom artifacts are referenced by job ID and content hash.
- Do not claim that OCR or translation is complete until the job status and report confirm it.
- When writing to a vault or Zotero, report the exact target and conflict decision.
- Batch files follow `contracts/agent-batch-workflow.v1.schema.json`.

See [references/operations.md](references/operations.md) for the operation matrix.
