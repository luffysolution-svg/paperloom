# PDF export consistency investigation — 2026-11-01

Branch: `fix/pdf-export-math-20261101`, based on PaperLoom `v0.1.10` (`261db1951`).

## Confirmed findings

- In *Intermolecular and Surface Forces*, PDF page 32 (printed page 102), translated item `p032-b004` contains six inline equations delimited by `\( … \)`.
- The live reader recognizes these delimiters; the Python render tokenizer recognized only `$…$` and `$$…$$`. Consequently, the persisted translation PDF contained literal LaTeX. Saving/downloading that PDF did not introduce the defect.
- Both the saved translation on F: and the task's persisted translation PDF have identical SHA-256 hashes.
- The saved `20261101040111-ff2317-side-by-side.pdf` preserves the English source on the left and Chinese translation on the right on all 36 pages. Verified against both input documents by extracting each pane's text. Independent MuPDF and Poppler renders of page 1 also show English/Chinese. The supplied screenshot with two Chinese panes does not reflect the file's stored content; a viewing application's translation feature is a possible explanation, not a confirmed cause.
- Markdown export also left `\( … \)` and `\[ … \]` unchanged, although Obsidian needs dollar delimiters.
- Word uses the shared Python render layout. Its cached downloads need a renderer-version change to expose the formula fix after an application upgrade.

## Changes

- Recognize backslash math delimiters in the shared render tokenizer and extract their formula bodies.
- Normalize multiline inline math before passing it to the PDF/Word layout paths.
- Convert backslash delimiters to dollar math in Markdown exports, including standalone equation blocks. Preserve escaped/unclosed delimiters, existing dollar math, and prices.
- Preserve code spans and fenced code examples. Keep fence detection in the original line context and require whitespace after closing fences.
- Respect the existing canonical inline-formula length limit when recognizing backslash delimiters, so normalization cannot silently discard formula classification. Longer inputs stay literal.
- Increment Word's renderer cache version from 2 to 3.
- Add regressions using the reported paragraph and delimiter/escaping cases. New regressions were observed failing before their corresponding fixes.
- Independent review identified code-literal and length-boundary regressions, then two fence-parsing edge cases. Each was reproduced and corrected with regression coverage.

## Verification

- Python rendering, text layout, and formula marker tests: **705 passed, 21 skipped**, plus 8 subtests; dependency deprecation warnings remain.
- Markdown service/API tests, run serially: **35 passed**.
- Derived-artifact tests: **9 passed, 1 ignored** subprocess fixture.
- Word converter: **30 passed**.
- Re-rendered the complete 36-page document using existing translations, without calling a translation provider. No literal LaTeX commands remain in the resulting PDF. Visually inspected page 32 and comparison pages 1/32.
- Verified every comparison page preserves its source/translation pane's text. The real page-32 Word sample contains native OMML equations without literal LaTeX commands.
- Original source/translation JSON files were hash-checked and remain unchanged. Corrected PDFs were saved beside the user's F: files with `-fixed` suffixes.
- `git diff --check`: passes.

Environment notes: the initial Python run encountered a pre-existing GBK decoding failure in `test_word_export.py::test_cli_has_an_entry_point`; running with `PYTHONUTF8=1`, as the packaged desktop already does, passed. `npm run test:doc` failed to discover `tests/` under this machine's Node 25; explicitly enumerating the same `*.test.mjs` files passed all 30 tests. A parallel Markdown API run failed `zotero_writeback_batch_continues_after_failure_deduplicates_and_reuses_authorization`, followed by poisoned-lock failures in `obsidian_integration_routes_discover_export_and_remember` and `obsidian_batch_export_resolves_documents_and_returns_per_item_results`. All 35 tests passed serially without changes to those tests or integration code.

## Upstream review

Fetched `https://github.com/wxyhgk/retain-pdf.git`; main is `a665c2aea` dated 2026-10-25. No later main commits were present when checked on November 1. Relevant changes not imported wholesale:

| Area | Upstream changes |
| --- | --- |
| Rendering | [`90d878b95`](https://github.com/wxyhgk/retain-pdf/commit/90d878b95): default `rpr_fit` engine; [`b9c2cdd03`](https://github.com/wxyhgk/retain-pdf/commit/b9c2cdd03): separate math package; translation/base package restructuring. These require coordinated integration with this fork. |
| Export/cache | [`e7514b3ec`](https://github.com/wxyhgk/retain-pdf/commit/e7514b3ec): capture input stamps before generation, preview timeouts; [`2758c1a10`](https://github.com/wxyhgk/retain-pdf/commit/2758c1a10): derived-cache retention; [`2614029da`](https://github.com/wxyhgk/retain-pdf/commit/2614029da): terminate descendant processes on Windows. |
| Tasks/uploads | [`948373132`](https://github.com/wxyhgk/retain-pdf/commit/948373132): FIFO queue and queue limit; [`8f9e28368`](https://github.com/wxyhgk/retain-pdf/commit/8f9e28368): stream uploads to disk; [`6fc528a7f`](https://github.com/wxyhgk/retain-pdf/commit/6fc528a7f): numeric parameter bounds. |
| Database/operations | [`0e157ed5c`](https://github.com/wxyhgk/retain-pdf/commit/0e157ed5c): concurrent schema upgrades and optional mandatory backup; [`6b8098c20`](https://github.com/wxyhgk/retain-pdf/commit/6b8098c20): WAL test fixture; request IDs and access logs. |

Upstream's corresponding Python tokenizer still lacks backslash-delimited math recognition. No direct upstream fix for this issue was found. This branch contains the focused fixes above. A local Windows candidate was subsequently built and accepted as recorded below.

## Upload/setup continuation follow-up

The subsequent desktop report exposed two independent breaks in the upload flow:

- Desktop bootstrap updates its singleton's `desktopConfigured`, while the home composition creates a separate desktop state initialized to false. The submit guard trusted that false flag even when the current OCR and translation credentials were complete. It now also accepts the current workflow's credentials, using the same readiness contract as submit controls.
- Successful setup saved and closed settings without continuing the pending upload form. The save flow now calls an injected setup-completion hook only after persistence succeeds. When the upload dialog is still open and an upload exists, composition requests submission through the original form. This preserves its existing duplicate-submit guard and the navigation to the document's progress tab. Ordinary settings saves and setup without an uploaded document do not start a job.
- Browser QA also confirmed that the upload tile's file input has `pointer-events: none`, with no outer drop handler. The tile now handles drag-over/drop and passes the dropped FileList to the existing upload handler. Disabled, locked, and uploading states reject another drop.

Regression coverage observed failures before fixes for the stale desktop flag, save-without-continuation, and missing drop handling. Coverage also checks ordinary settings saves, persistence failures and retry, persistence-before-submit ordering, and exactly one submission with the uploaded source.

Validation:

- Home, credentials, and ingest suites: **458 passed** serially before the additional drag/drop regression. After adding drop handling, the affected component/upload suites passed **40 tests**, including that new regression.
- TypeScript checking and the production frontend build passed. Existing build warnings remain.
- An isolated local fixture server supplied fake desktop settings and job/provider responses. Ordinary upload with saved credentials opened progress after one click. A real browser DataTransfer/DragEvent fixture exercised PDF parsing, upload, missing-credential setup, save, automatic submission, and progress navigation; the fixture API recorded exactly one job for the correct upload. This verifies browser event handling rather than a physical Explorer drag gesture. No real translation provider was called.
- Proof image: `tmp/upload-setup-diagnostics/save-start-progress.png`.

QA environment notes: the initial parallel frontend run had a pre-existing key-visibility test fail while its fields were being prepared; that test left its mounted home behind and caused seven subsequent failures in the same file. The full serial run passed without changing that test. Ego Browser later encountered an EPERM lock on its own state file; final setup/continuation QA used the available Chrome connector and a served repository fixture, without changing browser file-access permissions.

The fixes remain on `fix/pdf-export-math-20261101`.

## Local Windows acceptance build

At the user's request, built **0.1.11-rc.1** into `F:/PaperLoom-builds/0.1.11-rc.1/` for local acceptance before publication. The user subsequently reported that testing passed and authorized the stable release.

- Windows x64 portable EXE, NSIS Setup EXE, and Setup block map generated with Electron 44.4.3 / electron-builder 26.15.3, explicitly using `--publish never`.
- Recompiled all Rust workspace binaries in the release profile. Desktop lint/tests passed all 65 cases; document/frontend builds, desktop first-run smoke, frontend bundle checks, and bundle manifest validation passed.
- Checked the packaged ASAR version and frontend bundle hash, the three packaged Rust binary hashes against the new release build, and the two changed Python module hashes against source.
- Started the packaged backend with an isolated data directory: health, database, and authenticated jobs API checks passed. No existing application data was used or changed by this smoke check.
- Used the packaged Python, Typst, fonts, pipeline, Word CLI, and Electron-as-Node runtime to regenerate the real problem page. PDF math renders without raw commands; comparison panes retain their source/translation text; Word contains 19 native OMML equations. Samples are in the candidate's `validation/` directory.
- Included `SHA256SUMS.txt`, `BUILD-INFO.json`, and `README-测试说明.txt`. The guide covers exiting the old tray process, all of today's fixes, and re-rendering existing jobs before checking saved PDFs.

Local build environment: Node's unfiltered `fs.cpSync` fast path aborted on this Windows machine under both Node 25 and the CI-pinned Node 22.22.0. A temporary build-only bootstrap selected Node's JavaScript traversal by supplying a pass-through filter; a focused copy probe and subsequent byte comparisons passed. This bootstrap is outside application sources and is absent from the package. Used the already installed, version-verified Electron 44.4.3 distribution after the redundant download stalled. The standalone console probe warns without PYTHONPATH; the packaged runtime import path was verified by executing the actual pipeline and Word export successfully.

Candidate versioning used `RETAIN_PDF_VERSION=0.1.11-rc.1`; generated repository assets and the temporary desktop package version are restored after packaging. The verified local artifacts retain the candidate version. No commit, tag, push, GitHub workflow dispatch, Release publication, or Package publication was performed in this local build step.

## Stable release preparation

The user accepted the local candidate and authorized committing all of today's fixes, releasing **v0.1.11**, and cleaning the temporary builds/tests while retaining the local old application. Root/desktop npm versions, npm lock entries, backend/pipeline Python versions, the uv lock, and generated frontend version are aligned to 0.1.11. The uv lock and generated Python requirements checks pass; release-version/package tests pass before tagging.

The existing desktop workflow builds Windows portable/Setup/blockmap, Linux DEB, macOS DMG, complete corresponding source, third-party corresponding source and checksums. The existing Docker workflow builds and promotes both app and web Packages after its quality gates. Publication must use the new source revision rather than uploading the local RC binaries. Cleanup is limited to the generated candidate application/resources and temporary diagnostics; book files, translation data, and user credentials/configuration are outside that cleanup scope.

The first publication attempt was stopped by the dependency-report gate before any deliverables were published. Regenerated the report for the new formula regression and made the report's two relative-path writers use POSIX separators so Windows and Linux produce the same file. A new path-format regression failed on Windows before this two-line tooling fix and passed after it. The functional application code accepted by the user is unchanged.
