# Document Metadata Suggestions

[API spec index](../../API_SPEC.md)

The document metadata API derives durable, reviewable title suggestions from
the uploaded PDF and normalized OCR output. It never lets a model or OCR
adapter write `documents.title` directly.

## Endpoints

```text
POST /api/v1/documents/{document_id}/metadata-suggestions
GET  /api/v1/documents/{document_id}/metadata-suggestions?limit=20
POST /api/v1/documents/{document_id}/metadata-suggestions/{suggestion_id}/apply
```

## Generate a suggestion

Request:

```json
{
  "job_id": "optional-ocr-job-id",
  "fields": ["title"],
  "apply_if_default": true
}
```

- `job_id` must belong to the selected document and expose a readable
  `normalized_document_json`. When omitted, the newest usable document job is
  selected.
- Version 1 supports only `title`. The array is retained so authors, year, and
  DOI can be added without replacing the endpoint.
- `apply_if_default` only applies the selected title while the title still has
  its default provenance: `title_source=filename` and `title_locked=false`.
  The title text is **not** compared with `source_filename` any more
  (2026-10-19): uploading the same PDF again under another file name changes
  `source_filename` but keeps the title, which used to look like a user rename
  and silently disabled auto naming. Titles renamed before title provenance
  existed (database schema v12) were marked `user` + locked by migration v28.
- Unknown request fields are rejected with `400` (a misspelled
  `apply_if_default` no longer silently means "do not apply"). The frontend
  sends `{job_id, fields: ["title"], apply_if_default: true}`.
- Candidate priority is explicit OCR `structure_role=document_title`, provider
  `doc_title`, legacy `structure_role=title + layout_role=title`, then PDF Info
  metadata. Generic headings and abstracts are excluded.
- Only the PDF Info dictionary is parsed to read its `Title` (the whole PDF is
  parsed only when Info sits in a compressed object stream); encrypted PDFs
  contribute no Info title. The normalized document is streamed: its bytes are
  hashed as read (the evidence hash is unchanged) and only the first 8 pages
  are kept. Both run on a blocking worker thread, not on the async runtime.
- The normalized document is the one the job registered
  (`artifacts.normalized_document_json`, read through the jobs package's
  `stored_path`). The handler no longer guesses
  `<job root>/ocr/normalized/document.v1.json` for jobs that did not register
  one; such jobs are skipped (or `DOCUMENT_METADATA_SOURCE_NOT_READY` when
  named by `job_id`), the same as OCR reuse and stage retries.

Response data:

```json
{
  "suggestion_id": "meta-20260903123000-a1b2c3",
  "document_id": "sha256-document-id",
  "source_job_id": "ocr-job-id",
  "artifact_sha256": "sha256-of-the-source-and-normalized-evidence",
  "status": "completed",
  "fields": ["title"],
  "title_candidates": [
    {
      "value": "A Reliable Paper Title",
      "source": "ocr_structure",
      "confidence": 0.99,
      "evidence": [
        {
          "source": "normalized_document",
          "page_idx": 0,
          "block_id": "p001-b0001",
          "structure_role": "document_title",
          "layout_role": "title"
        }
      ]
    }
  ],
  "selected_title": "A Reliable Paper Title",
  "generation_method": "ocr_structure",
  "needs_ai_review": false,
  "applied": false,
  "can_apply": true,
  "created_at": "2026-09-03T12:30:00Z",
  "updated_at": "2026-09-03T12:30:00Z"
}
```

The suggestion and its evidence hash are persisted before it is returned, so
the frontend can recover it with `GET` after refresh or connection loss.

## List suggestions

`GET /api/v1/documents/{document_id}/metadata-suggestions?limit=20` returns the
newest suggestions first (`created_at DESC, suggestion_id DESC`):

```json
{ "suggestions": [ ... ], "limit": 20, "has_more": false }
```

- `limit` defaults to `20`; outside `1..=100` it is rejected with `400`
  (`limit must be 1..=100`). Before 2026-10-22 it was silently clamped.
- `limit` and `has_more` were added on 2026-10-22; `has_more` is computed by
  reading one extra row. There is no `offset`: raise `limit` to see more.
- Unknown query parameters (including `offset`) are rejected with `400`
  (``unknown field `offset`, expected `limit` in the query string``). The
  frontend sends only `limit=20`.

## Apply a suggestion

Request:

```json
{
  "expected_document_updated_at": "2026-09-03T12:29:00Z"
}
```

The revision guard is optional, but clients should send the `updated_at` value
they displayed. Unknown request fields are rejected with `400`. Application
runs in an immediate SQLite transaction and returns both the updated
suggestion and document. It is idempotent when that suggestion is already
applied. The returned `document` has the same shape as
`GET`/`PATCH /api/v1/documents/{document_id}`, including `source_pdf_url`,
`cover_url` and `thumbnail_url` (before 2026-10-19 these three keys were
missing). The frontend currently only uses `apply_if_default` on generation;
it does not call this endpoint.

Manual `PATCH /api/v1/documents/{document_id}` title updates set
`title_source=user` and `title_locked=true`. Automatic suggestions cannot
overwrite that title. Automatically applied titles expose `title_source` as
`ocr` or `pdf_metadata` and remain distinguishable from user edits.

## Stable errors

Errors use the structured envelope: top-level `code` is the string code below,
`error.code` is the same code (except one, see the table), and
`error.details.reason` carries a stable lowercase reason (added 2026-10-19;
`error.details` used to be `{}`). Branch on `error.details.reason`, not on
`message`. A missing document is a plain `404` (`document not found: …`,
`error.details = {}`); the document's source PDF missing on disk is also a
plain `404` (the source comes with the upload; if it is gone it is lost, it
will not "become ready").

| HTTP | top-level `code` | `error.code` | `error.details.reason` | when |
|---|---|---|---|---|
| 400 | `DOCUMENT_METADATA_FIELD_UNSUPPORTED` | same | `field_unsupported` | `fields` asks for something other than `title` |
| 404 | `OCR_JOB_NOT_FOUND` | `DOCUMENT_METADATA_JOB_NOT_FOUND` | `job_not_found` | the explicitly selected `job_id` does not exist |
| 409 | `DOCUMENT_METADATA_JOB_MISMATCH` | same | `job_mismatch` | the job belongs to another document |
| 409 | `DOCUMENT_METADATA_SOURCE_NOT_READY` | same | `source_not_ready` | the selected job has no readable normalized OCR document |
| 409 | `DOCUMENT_METADATA_SOURCE_INVALID` | same | `source_invalid` | the normalized document is not valid JSON (was `422`) |
| 409 | `DOCUMENT_TITLE_CANDIDATE_NOT_FOUND` | same | `title_candidate_not_found` | neither PDF metadata nor OCR contains a usable title yet (was `422`) |
| 413 | `DOCUMENT_METADATA_SOURCE_TOO_LARGE` | same | `source_too_large` | the normalized document is over 256 MB |
| 404 | `DOCUMENT_METADATA_SUGGESTION_NOT_FOUND` | same | `suggestion_not_found` | the suggestion does not exist for this document |
| 409 | `DOCUMENT_TITLE_CHANGED` | same | `title_changed` | the title is user-locked or no longer has its default provenance |
| 409 | `DOCUMENT_REVISION_CONFLICT` | same | `revision_conflict` | `expected_document_updated_at` is stale |

`OCR_JOB_NOT_FOUND` keeps its top-level code for old clients, but its
`error.code` is `DOCUMENT_METADATA_JOB_NOT_FOUND`: the same top-level code is
used by job creation's OCR reuse with a different envelope (top-level `reason`
and `can_fallback_to_ocr`). Both carry `error.details.reason = "job_not_found"`.

The two former `422`s are state problems (the same request succeeds after OCR
finishes or with another OCR job), so they are `409` per the
[400/409 rule](../../../../docs/api/00-约定/02-认证与错误.md#400-和-409-的分工).

LLM normalization is intentionally outside this first deterministic phase.
Future AI fallback must consume bounded candidate evidence, write another
durable suggestion with `source=ai`, and still use the same guarded apply
transition; it must never mutate the document row directly.
