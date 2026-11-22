# PaperLoom Agent skills

这些目录是 PaperLoom 面向外部 Agent 的单一真源。Claude Code、Codex、Pi、OpenCode、ZCode、DeepSeek Harness 和 WorkBuddy 只需要加载对应的 `SKILL.md`，可执行动作统一调用 `paperloom agent` CLI 或本地 MCP。

技能文件不保存 API key、论文正文或对话历史。宿主配置由 Agent 安装器写入，说明见 `docs/ops/agent-hosts.md`。

手动配置命令、Pi 项目配置、Obsidian 验收和可直接交给 Agent 的配置提示词见 [Agent setup guide](../docs/ops/agent-setup.md)。

## 技能

- `paperloom-pdf-ops` 处理导入、OCR、翻译、任务恢复、导出、Zotero 和 Obsidian。
- `paperloom-paper-reader` 生成带页码和块 ID 的证据链阅读结果。
- `paperloom-paper-search` 组织本地库、Zotero 和外部学术来源的检索与去重。

外部检索通过 MCP 的 `search_scholarly` 工具调用 OpenAlex、Crossref、Semantic Scholar 和 Europe PMC，并返回去重后的来源警告与元数据。

技能只描述编排规则。模型选择、OCR 和渲染仍由 PaperLoom 配置和后端负责。
