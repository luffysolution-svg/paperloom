# PaperLoom stdio MCP bridge

`paperloom_mcp.py` is a dependency-free local MCP server. It discovers the
running PaperLoom API from `~/.paperloom/run/backend.json`, or from
`PAPERLOOM_API_BASE`, `PAPERLOOM_API_KEY`, and `PAPERLOOM_DATA_DIR`.

Run it through the CLI so every host uses the same entry point.

```text
paperloom agent mcp
```

The bridge exposes document and Reader resources, OCR and translation jobs,
Zotero and Obsidian actions with explicit confirmation, batch run manifests,
and normalized scholarly search over OpenAlex, Crossref, Semantic Scholar, and
Europe PMC. It writes no credentials to run directories.

The Python files use only the standard library. Protocol tests run with

```text
python -m unittest discover -s backend/agent-mcp/tests -v
```
