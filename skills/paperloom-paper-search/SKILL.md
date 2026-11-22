---
name: paperloom-paper-search
description: Search PaperLoom's local library, Zotero collections, and configured scholarly providers, then deduplicate and organize a traceable reading set. Trigger for literature search, related work, citation expansion, or review preparation.
---

# PaperLoom literature search

## Workflow

1. Turn the research question into explicit concepts, synonyms, date limits, and inclusion/exclusion rules.
2. Search the local PaperLoom library and Zotero first. Add external providers only when configured and needed.
3. Record provider, query, retrieval time, result count, truncation, and failures.
4. Deduplicate by DOI first, then normalized title + first author + year. Keep a provenance list for merged records.
5. Separate discoverable metadata from accessible full text. Do not imply that a missing PDF was reviewed.
6. For a review, preserve the evidence matrix, excluded records, and unresolved conflicts as run outputs.

For a known title, call `list_documents` with a distinctive title phrase in `q`. For a passage, call `search_documents` with `query` and the selected `document_id`. Keep each hit's job and page identifiers when handing it to the Reader.

Use the MCP `search_scholarly` tool for OpenAlex, Crossref, Semantic Scholar,
and Europe PMC. It returns normalized records and provider warnings, then
deduplicates DOI matches before the Agent builds a reading set.

## Provider rules

OpenAlex, Crossref, Semantic Scholar, PubMed, and Europe PMC credentials are read from environment or PaperLoom configuration. Do not place keys in a workflow file or a Skill. A provider failure is recorded in `warnings` and does not erase successful sources.
