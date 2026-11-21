# @retainpdf/api

Typed API clients using generated wire DTOs from `@retainpdf/contracts`.

- `jobs.ts` → `fetchJobPayload`, `fetchJobList`, `fetchJobsByIds` (batch live state for library cards via `GET jobs?job_ids=`)
- `jobs-actions.ts` → `deleteJob` (`DELETE jobs/:id`), cancel / resume / retry-stage
- `documents.ts` / `collections.ts` / `search.ts` → book library clients; their views (`DocumentRecord`, `CollectionRecord`, `SearchResultView` …) are re-exported from `@retainpdf/contracts/library-documents`
- `types.ts` → generated Job/library DTO re-exports plus the generic `ApiResponse` envelope
- `src/generated/*.ts` → request functions generated from the `endpoints` tables in `contracts/*.schema.json` (entries with `client_name`, `transport: json`); `request.ts` is the shared transport (URL, query, key, envelope, errors). Do not edit generated files — run `npm --prefix frontend/packages/api run generate:client`; `generate:client:check` and `web/tests/contracts/api-client-codegen.test.mjs` fail when they drift. Plan: `docs/ops/planning/api-client-codegen/`

Build: `npm --prefix frontend/packages/api run build` → `dist/`
Usage: `import { fetchJobsByIds } from "@retainpdf/api/jobs"`

The shelf API (`library/books`) was removed from the backend on 2026-10-22; `contracts/library-books` is only used for the delete result shape `LibraryDeleteResultView`.

Browser-aware runtime configuration helpers are public at `@retainpdf/api/runtime`.
The old `@retainpdf/api/internal/runtime` entry remains available only as a
compatibility path for existing consumers.
