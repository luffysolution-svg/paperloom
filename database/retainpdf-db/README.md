# retainpdf-db

SQLite persistence crate in the repository-root Cargo workspace. It owns `src/db.rs`
and `src/db/**`, including the existing versioned schema migrations and unit tests.
Migration SQL and `PRAGMA user_version` numbering are unchanged by the directory move.

`retainpdf-data` re-exports `retainpdf_db::db` for existing callers. Credentials, OCR providers,
worker commands, and event delivery remain in `backend/packages/retainpdf-data`.

Allowed internal dependency: `retainpdf-core` models, configuration and storage-path helpers.
Do not depend on API, job orchestration or `retainpdf-data`, which would reverse the boundary.

Run from the repository root: `cargo test --locked -p retainpdf-db`.
Real user databases remain at the configured runtime data location, never in this directory.
