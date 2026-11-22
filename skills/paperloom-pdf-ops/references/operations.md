# Operation matrix

| 操作 | 默认 | 需要确认 | 主要结果 |
| --- | --- | --- | --- |
| list/search/read | 只读 | 否 | envelope + references |
| upload/import | 写入 PaperLoom | 是 | document_id |
| OCR/translation | 异步、可能产生费用 | 是 | job_id |
| cancel/retry/resume | 改变任务状态 | 是 | job status |
| Obsidian export | 写入 vault | 是 | output path + conflict |
| Zotero writeback | 写入 Zotero | 是 | item and attachment result |

所有结果都应保留 `document_id`、`job_id`、页码或块 ID。`warnings` 不得被 Agent 静默丢弃。
