---
name: paperloom-paper-reader
description: Use PaperLoom's structured Markdown, regions, page images, formulas, tables, and reports to answer evidence-traceable questions about papers. Trigger for paper reading, method explanation, figure interpretation, comparison, or review notes.
---

# PaperLoom evidence-first reading

## Workflow

1. Identify the document and check OCR/Markdown/translation status.
2. Read the outline before loading the full text. Use search to locate relevant blocks.
3. Call `get_page_context` with the selected `job_id` and a one-based page number. Copy the exact `item_id` from the returned regions into `get_region_context` or `get_figure_resource`. When a reported count conflicts with a table or total, check the original PDF before attributing the discrepancy to the authors.
4. Keep three layers separate: `author_text`, `agent_interpretation`, and `hypothesis`.
5. Attach a reference object to each material claim. Use `direct`, `inferred`, `hypothesis`, `unsupported`, or `conflicting` support levels.
6. A region's `source.text` is the extracted source text. Attribute a suspected typo or missing reference to the paper only after inspecting the original PDF or page image. If only extracted text is available, identify the discrepancy there and leave its origin open.
7. When producing a note, write `reading-note.md`, `claims.json`, `evidence.json`, and `open-questions.md` under the run directory or the requested Obsidian managed block.

## Prompts this skill supports

- What problem, assumptions, method, and contribution does this paper present?
- Explain the formula on page N and define each variable.
- Interpret figure/table N with axes, groups, trends, and the author's stated conclusion.
- Compare this paper with a selected set of documents.
- Build an evidence matrix or a replication checklist.

Never infer a value from a blurry figure without marking it as an estimate. A compiled formula checks syntax only and does not replace checking the source page.
