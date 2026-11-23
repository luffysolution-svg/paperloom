# Operation matrix

| 操作 | 默认 | 需要确认 | 主要结果 |
| --- | --- | --- | --- |
| list/search/read | 只读 | 否 | envelope + references |
| upload/import | 写入 PaperLoom | 是 | document_id |
| OCR/translation | 异步、可能产生费用 | 是 | job_id |
| cancel/retry/resume | 改变任务状态 | 是 | job status |
| `export_markdown` | 阅读用原文，可存为单个 .md | 否 | 正文、书目、引用链接及 API 图片地址 |
| `export_markdown` 的 `obsidian_zip` 格式 | 保存到指定 ZIP 路径 | 否 | 原文或译文笔记及可用的图片、PDF、SI |
| `export_obsidian` | 写入 vault，可按 Zotero 分类分目录 | 是 | 库内笔记路径及冲突结果 |
| `sync_obsidian_to_zotero` | 回写现有主笔记中的书目和阅读笔记 | 是 | `fields_written` 和 `note_status` |
| `writeback_zotero` | 向 Zotero 添加译文 PDF | 是 | 条目和附件结果 |

OCR 或翻译的批处理提交后，按每篇任务的完成状态调用导出工具。单篇可指定 `job_id`。批量写入 vault 时，将 `document_ids` 传给 `export_obsidian`，或用 CLI 的 `obsidian export --document-ids`。回写笔记使用与导出相同的目录和 `folder_by_collection` 设置。遇到冲突应报告后端给出的字段或笔记，供用户决定保留哪一版。

所有结果都应保留 `document_id`、`job_id`、页码或块 ID。`warnings` 不得被 Agent 静默丢弃。
