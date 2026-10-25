# Upstream fixes implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Backport the five fixes selected in the upstream assessment and verify their behavior.

**Architecture:** Adapt each patch to the existing PaperLoom paths and APIs. Preserve package names, agent capability authentication, and desktop integration. Keep the existing QR update.

**Tech Stack:** TypeScript, React, Node test runner, Rust, Axum, Tokio, reqwest.

**Spec:** User request to port and test the five fixes identified in this conversation.

## Constraints

- No whole-history merge or unrelated upstream restructuring.
- Work on `fix/upstream-backports-20261025`; no publication requested.
- Observe focused regression failures before changing production code.
- Rebuild tracked frontend artifacts and run applicable package checks.

## Review focus

- Glossary entries without context retain their existing default behavior.
- Clearing a search invalidates pending work; failed document loads can retry.
- Preloaded and cached PDFs remain usable; cancelled downloads cannot become current.
- Remote process termination retains its configured worker shutdown grace.
- Agent capabilities remain supported; empty keys and query secrets are rejected or excluded appropriately.

## Tasks

- [x] 1. `8499ef4f4`: add glossary context/default tests and disabled-options tests; run red; port changes in `glossaries-store.ts`, `GlossaryImportPanel.tsx`, `glossary-options.ts`; run green.
- [x] 2. `824475763`: add deterministic search race, list reuse/reset, and optimistic status tests; run red; port `library-search-app.tsx` changes using existing types; run green.
- [x] 3. `11196f250`: add first-render PDF identity and abort tests; run red; adapt `useProtectedPdfFile.ts` while preserving worker buffer copies; run green.
- [x] 4. `9207945c2`: add real local-server proxy/timeout/grace tests; run red; update `backend/api/src/services/runtime_gateway.rs` and `runtime/probe_client.rs`; run green. The existing CLI already bypasses proxies.
- [x] 5. `38280a3a8`: independently investigate auth boundaries; add exact/invalid/empty-key and query-log tests; run red; share matching in `retain-core`, apply to the existing API/jobsd entry points, redact tracing queries; run green; obtain one read-only security review. This checkout has no upstream terminal route.
- [x] 6. Run web suite, frontend type checks/build, desktop frontend synchronization check, and Rust workspace tests. Review diff and record actual outcomes.

## Execution notes

- User explicitly authorized sequential implementation and testing; continue without a planning approval gate.
- Use a new branch in the existing checkout to preserve the already reviewed QR changes and installed build dependencies.
- Upstream has renamed Rust packages; map patches onto current paths rather than importing the renames.
- Ported companion test fix `243c27df6`: jobs-control's source scanner must inspect production code rather than fake-server paths in unit tests.
- Independent review reproduced two upstream PDF cache regressions: mounted cache hits disappeared after LRU eviction, and a cached successful retry could retain an old error. Added failing transition tests, retained cached files in URL-associated hook state, and gave valid cache hits precedence over stale loaded errors. All 43 PDF/reader tests pass.
- Security review found no concrete bypass or compatibility regression. API capabilities and worker bearer capabilities remain separate; both routers omit query strings from request spans. The comparison implementation establishes source-level traversal behavior, not a formal timing guarantee for all optimized binaries/CPUs.
- Final web/reader type checks, web build, 65 desktop tests, desktop first-run smoke and packaged frontend bundle checks pass.
- Windows regenerates unrelated CSS differently; restored the original CSS bytes and restamped/copied the final frontend assets.

## Verification results

- Web and reader TypeScript checks: pass.
- Final full web suite (`node --import ./tests/helpers/register-jsx.mjs --test --test-force-exit --test-concurrency=1`, from `frontend/web`): 1912 passed, 0 failed, 2 skipped.
- Web build and final generated JS import resolution: pass (206 extracted relative imports).
- Desktop tests: 65 passed; desktop first-run and frontend bundle smoke checks: pass.
- Rust workspace (`cargo test --locked --workspace --no-fail-fast`): 986 passed, 17 failed, 4 ignored. The failures below also reproduce on unmodified `ecc682eb`.
- Baseline comparison used a disposable detached checkout. Its initial run had 16 failures, including an additional worker-bridge environment failure because that checkout has no project Python environment. Fifteen failures overlapped with the patched run. Re-running the baseline's core path test from E: reproduced the cross-drive E:/C: failure; the baseline upload timeout test failed twice and passed once. Thus all 17 patched-run failures have baseline reproductions. The temporary checkout was removed after comparison.
- First full web run: 1909 passed, 1 missing-browser failure, 2 skipped. Installed the required Playwright Chromium; the failed browser test then passed. A subsequent concurrent run hit a credentials-test timeout and Node allocation failure; its credentials file passed all 13 tests in isolation. The final serial run passed with the completed PDF cache fix.
- Revalidated the proxy integration test against the current source after removing the temporary baseline checkout. Sharing the target directory had reused a baseline core artifact; clearing only the `retain-core` build cache resolved that verification setup issue without source changes.
- The user subsequently authorized commit, push and publication of release assets. Release version: `v0.1.10`; existing GitHub Actions quality gates and corresponding-source requirements remain enabled.

### Rust baseline failures

- `api_tests::document_operations::restricted_page_program_produces_validates_and_commits_a_real_pdf`
- `api_tests::document_operations::restricted_program_retry_reuses_immutable_inputs_and_survives_api_restart`
- `api_tests::document_operations::tampered_visual_validation_fails_closed_before_candidate_publication`
- `api_tests::ocr_lifecycle::canceling_a_normalizing_ocr_job_kills_the_worker_process`
- `api_tests::ocr_lifecycle::ocr_only_submission_reaches_reader_and_document_outputs`
- `api_tests::translation_debug::replay::translation_replay_route_redacts_secrets`
- `app::state::tests::upload_processing_snapshot_changes_only_for_new_state`
- `job_runner::lifecycle::tests::repeated_launch_starts_only_one_real_local_worker`
- `job_runner::process_runner::tests::execute_process_job_injects_provider_and_translation_envs`
- `job_runner::process_runner::tests::execute_process_job_preserves_timeout_process_output`
- `job_runner::process_runner::tests::maybe_attach_ai_failure_diagnosis_persists_ai_result_and_event`
- `job_runner::process_runner::tests::silence_is_allowed_when_no_output_timeout_is_disabled`
- `job_runner::process_runner::tests::silent_worker_is_cut_by_the_no_output_timeout_not_the_total_one`
- `services::jobs::reader_regions::artifacts::tests::markdown_asset_relative_path_rejects_paths_outside_authenticated_image_root`
- `services::uploads::tests::repair_timeout_and_failure_are_bounded_and_redacted`
- `storage_paths::tests::to_relative_accepts_cwd_relative_paths_under_relative_data_root`
- `worker_command::tests::normalize_command_writes_stage_spec_and_uses_spec_flag`
