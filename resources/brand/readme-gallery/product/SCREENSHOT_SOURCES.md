# Screenshot sources

`obsidian-html-table-math.png` is the user's original PixPin capture from
2026-10-04 21:29:46. It shows a PaperLoom-exported note in a real Obsidian vault,
with HTML table formulas rendered by HTML Table Math 0.1.2. The user supplied the
file and confirmed the rendering. It has not been composited or retouched.

The existing `library.png`, `side-by-side-reader.png`, `markdown-reader.png`, and
`ai-assistant.png` were present before the release-verification session. They
have not been recaptured or relabeled as new PaperLoom verification evidence.

## Real captures on 2026-10-05

The Chinese README now uses the `*-real.png` captures below. Older gallery files
remain available for other documentation; they are no longer the Chinese README's
product/translation examples. No screenshot is a generated mockup or composite.

| File | Actual subject and capture |
| --- | --- |
| `paperloom-library-real.png` | User's PaperLoom library after real Zotero imports; Chromium screenshot of the installed candidate's local gateway. |
| `paperloom-progress-real.png` | Pan 2024 document's OCR/translation/render status in the same application. |
| `paperloom-translation-real.png` | Yang 2024 two-column source and translated PDF in the native PaperLoom window; user's PixPin capture `PixPin_2026-10-05_07-40-14.png` (Image #3). |
| `paperloom-figures-real.png` | Yang 2024 composite figure and original/translated captions; user's `PixPin_2026-10-05_07-40-37.png` (Image #4). |
| `paperloom-table-translation-real.png` | Li 2026 source/translated body, table and formulas; user's `PixPin_2026-10-05_07-43-14.png` (Image #7). |
| `paperloom-artifacts-real.png` | Zhang 2026 document's output files and download controls; user's `PixPin_2026-10-05_07-41-07.png` (Image #5). |
| `paperloom-zotero-import-real.png` | Native PaperLoom Zotero import dialog and local attachments; user's `PixPin_2026-10-05_07-41-40.png` (Image #6). |
| `paperloom-markdown-real.png` | Talebian 2025 source PDF and Markdown rendering in PaperLoom. |
| `paperloom-ai-real.png` | Yang 2024 materials-synthesis question and answer in the native PaperLoom window; user's `PixPin_2026-10-05_08-11-57.png`. The retrieval-budget warning remains visible. |
| `paperloom-ai-citations-real.png` | Its characterization-method table with a page-3 citation popup, page thumbnail and source excerpt; user's `PixPin_2026-10-05_08-12-37.png`. |
| `paperloom-zotero-batch-real.png` | Real library multi-select writeback; three existing attachments updated, zero failures. |
| `obsidian-frontmatter-real.png` | Talebian 2025 frontmatter displayed in Obsidian's properties panel; user's `PixPin_2026-10-05_07-37-50.png` (Image #1). This is a rendered properties view, not raw YAML. |
| `obsidian-text-real.png` | Yang 2024 note with embedded translated PDF, Chinese title and body; user's `PixPin_2026-10-05_07-45-50.png` (Image #8). |
| `obsidian-body-real.png` | Talebian 2025 HTML table, formulas, caption and outline in Obsidian with optional HTML Table Math 0.1.2; user's `PixPin_2026-10-05_07-38-47.png` (Image #2). |
| `obsidian-annotations-real.png` | Yang 2024 exported Zotero highlights/comments with page-location links and a child note; user's `PixPin_2026-10-05_07-46-16.png` (Image #9). |
| `zotero-translated-pdf-real.png` | Pan 2024's “PaperLoom 中文译文” attachment open in Zotero's native PDF reader, page 1 of 13; user's `PixPin_2026-10-05_07-54-34.png`. |

The papers are Pan 2024 (DOI `10.1016/j.cej.2024.150536`), Talebian-Kiakalaieh
2025 (DOI `10.1016/j.mser.2025.100993`) and Yang 2024, from the user's Zotero
library. Additional user captures show Li 2026's CdS/CuMoO4 paper, Zhang 2026's
NiPS3/CdS document files, and the import dialog's local Zotero library.
The user explicitly requested all twelve PixPin screenshots for README use and
confirmed that desktop AI worked in their own test. The later documentation update
did not perform another AI end-to-end verification.
This authorization does not establish third-party paper redistribution rights;
the separate fixture/public-distribution license review still applies.

The twelve supplied screenshots were copied byte-for-byte from the user's PixPin
files, including their visible desktop overlays and Windows watermark. Their
destination SHA-256 hashes were checked against the originals; no crop, retouch,
composite, or screenshot-content modification was made.

The retained library, progress, Markdown and batch-writeback captures show the
UI served by the actual Windows NSIS-installed candidate at
`F:\软件安装\Paperloom`, exercised in Chromium because native Windows automation
was unavailable. The user-supplied PaperLoom screenshots show its native window;
the supplied Obsidian screenshots show the native application. Formula and image
checks from the preceding verification used Obsidian's own renderer, without
changing exported text or captions.

The additional Zotero capture shows its native PDF reader. README's collapsible
sections and side-by-side tables change presentation only; each preview links to
the unchanged full-size screenshot.

No capture contains an API token, Zotero authorization key, proxy password or
signed URL. Documents may contain their published authors and bibliographic data.
Capture hashes and detailed execution evidence stay in the local verification
directory, outside the public source archive.
