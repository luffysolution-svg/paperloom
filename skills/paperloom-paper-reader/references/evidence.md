# Evidence record

Each claim should be serializable as:

```json
{
  "claim_id": "claim-001",
  "text": "作者报告……",
  "support_level": "direct",
  "references": [{"source_kind":"region","document_id":"doc-1","job_id":"job-1","page":3,"item_id":"p3-07","quote":"…"}],
  "notes": ""
}
```

`unsupported` is a valid result. It means the current PaperLoom evidence did not locate support.
