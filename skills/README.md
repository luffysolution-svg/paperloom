# PaperLoom Agent Skills

这些目录是 PaperLoom 面向外部 Agent 的单一真源。Codex、Claude Code、Pi、OpenCode、ZCode、DeepSeek Harness 和 WorkBuddy 只需要加载对应的 `SKILL.md`，实际动作统一调用 `paperloom agent` CLI 或本地 MCP。

## 技能

- `paperloom-pdf-ops` 负责 PDF 导入、OCR、翻译、任务恢复、导出、Zotero 和 Obsidian。
- `paperloom-paper-reader` 负责按页码、区域和资源链接组织证据链阅读，支持方法、公式、表格和图表解读。
- `paperloom-paper-search` 负责 PaperLoom 本地库、Zotero 和外部学术来源检索与去重。

## 使用约束

- 先读取任务状态和已有产物，再创建 OCR 或翻译任务。
- 批量任务先执行 dry-run，展示输入数量、任务阶段和写入目标，再等待确认。
- 每个重要结论保留 `document_id`、`job_id`、页码、区域 ID、引用片段和支持等级。
- 将作者原文、Agent 解读和待验证假设分开记录。
- 不把 API key、论文正文或对话历史写入技能文件和工作流文件。

## 外部学术检索

`search_scholarly` MCP 工具支持 OpenAlex、Crossref、Semantic Scholar 和 Europe PMC。工具会规范化元数据、按 DOI 或标题去重，并在部分来源不可用时返回 `warnings`。凭据从环境变量或 PaperLoom 配置读取。

## 配置和示例

宿主注册、Obsidian 和 Zotero 配置、批量工作流示例以及可直接交给 Agent 的提示词见 [Agent setup guide](../docs/ops/agent-setup.md)。不同宿主的 MCP 命令见 [Agent host configuration](../docs/ops/agent-hosts.md)。
