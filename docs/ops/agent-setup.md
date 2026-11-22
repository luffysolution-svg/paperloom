# PaperLoom Agent、MCP 和 Skills 使用指南

PaperLoom 将 PDF 处理和科研阅读能力提供给外部 Agent。Agent 宿主通过本地 stdio MCP 与 PaperLoom 连接，OCR、翻译、任务调度、Zotero 和 Obsidian 文件写入由 PaperLoom 负责。

本文使用 `<paperloom-project>` 表示 PaperLoom 项目目录，使用 `<paperloom-cli-path>` 表示 `paperloom` 可执行文件的路径。不要把真实 API key、论文正文或个人文件路径写入仓库配置。

## 1. 准备 CLI

在项目目录构建 CLI：

```powershell
cd <paperloom-project>
cargo build --release --bin paperloom
```

构建产物通常位于：

```text
<paperloom-project>/target/release/paperloom.exe
```

也可以将 CLI 加入当前终端的 `PATH`：

```powershell
$env:Path = "<paperloom-project>\target\release;$env:Path"
```

PaperLoom 后端需要先由桌面端或部署环境启动。确认 CLI 和后端状态：

```powershell
paperloom agent doctor --json
paperloom agent capabilities --json
```

`doctor` 只报告连接和配置状态，不会上传文件、调用模型或显示密钥。

## 2. 注册 MCP

### Codex

```powershell
codex mcp add paperloom -- paperloom agent mcp
codex mcp list
codex mcp get paperloom
```

Codex 默认把这条命令写入用户配置。如果只想对当前项目启用，可以把项目 `.codex` 目录作为 `CODEX_HOME`：

```powershell
$previousCodexHome = $env:CODEX_HOME
try {
  $env:CODEX_HOME = (Join-Path (Get-Location) ".codex")
  codex mcp add paperloom -- paperloom agent mcp
} finally {
  if ($null -eq $previousCodexHome) { Remove-Item Env:CODEX_HOME } else { $env:CODEX_HOME = $previousCodexHome }
}
```

项目配置需要在 Codex 信任该项目后生效。

使用绝对路径：

```powershell
codex mcp add paperloom -- "<paperloom-cli-path>" agent mcp
```

### Claude Code

```powershell
claude mcp add --scope project --transport stdio paperloom -- paperloom agent mcp
claude mcp list
```

全局配置使用 `--scope user`：

```powershell
claude mcp add --scope user --transport stdio paperloom -- paperloom agent mcp
```

在 Claude Code 会话中执行 `/mcp`，确认服务器已连接。

### Pi

```powershell
pi mcp add paperloom --local --cwd <paperloom-project> -- paperloom agent mcp
pi mcp list --json
```

全局配置去掉 `--local --cwd <paperloom-project>`：

```powershell
pi mcp add paperloom -- paperloom agent mcp
```

### 其他宿主

在 OpenCode、ZCode、DeepSeek Harness 或 WorkBuddy 的 MCP 设置中添加一个 stdio server：

```text
name: paperloom
command: paperloom
args: agent mcp
```

宿主只接受绝对路径时，使用 `where paperloom` 或 `which paperloom` 找到 CLI。详细宿主配置见 [agent-hosts.md](./agent-hosts.md)。

直接验证握手：

```powershell
'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' |
  & <paperloom-cli-path> agent mcp
```

## 3. Skills

将以下目录作为只读指令加载：

- `skills/paperloom-pdf-ops/SKILL.md` 负责导入、OCR、翻译、任务恢复、导出以及 Zotero/Obsidian 操作。
- `skills/paperloom-paper-reader/SKILL.md` 负责按页码、区域和资源链接组织证据链阅读。
- `skills/paperloom-paper-search/SKILL.md` 负责本地文献、Zotero 和外部学术来源检索与去重。

Skills 只描述工作流和输出约束，不保存密钥、论文正文或对话历史。CLI 和 MCP 共用 PaperLoom 后端的任务与资源。

## 4. MCP 能力

只读能力包括：

- 文献列表、元数据和全文搜索
- Reader 目录、页面、区域、Markdown 和报告
- 任务状态、事件、翻译质量和证据定位
- OpenAlex、Crossref、Semantic Scholar 和 Europe PMC 的学术检索

可执行能力包括：

- 上传 PDF、提交 OCR 和翻译
- 取消、续跑和阶段重试
- 单篇或批量工作流
- 导出 Markdown、写入 Obsidian 和写回 Zotero

MCP 工具返回统一结构：

```json
{
  "ok": true,
  "data": {},
  "warnings": [],
  "references": []
}
```

重要结论的 `references` 应包含 `source_kind`、`document_id` 或 `job_id`、页码、区域 ID、引用片段和资源 URI。支持等级使用 `direct`、`inferred`、`hypothesis`、`unsupported` 或 `conflicting`。

## 5. 单篇 PDF 工作流

```text
检查文献和已有任务
→ 必要时上传 PDF
→ 提交 OCR
→ 检查 Reader Markdown、页面和区域
→ 提交翻译
→ 查询任务和质量报告
→ 导出 Markdown 或生成带证据的阅读笔记
```

CLI 示例：

```powershell
paperloom agent document import <paper.pdf> --json
paperloom agent document list --json
paperloom agent ocr submit <document-id> --json
paperloom agent translate submit <document-id> --json
paperloom agent job status <job-id> --json
paperloom agent job events <job-id> --json
paperloom agent reader outline <job-id> --json
paperloom agent reader page <job-id> 3 --json
paperloom agent reader region <job-id> <item-id> --json
```

提交任务前先检查是否已有可复用的 OCR 或翻译结果。不要仅凭提交成功判断处理完成，应以终态和报告为准。

## 6. 批量工作流

批量工作流文件必须符合 `agent-batch-workflow.v1`。最小示例：

```yaml
schema_version: agent-batch-workflow.v1
name: translate-papers
inputs:
  sources:
    - kind: document_id
      value: <document-id>
steps:
  - id: translate
    action: translate
    options: {}
execution:
  dry_run: true
  max_items: 20
  concurrency: 1
  failure_policy: continue
```

先校验和预览：

```powershell
paperloom agent workflow validate <workflow.yml> --json
paperloom agent workflow run <workflow.yml> --dry-run --json
```

确认输入数量、处理阶段、预计写入和冲突策略后再执行：

```powershell
paperloom agent workflow run <workflow.yml> --confirm --json
```

每次运行都会在 PaperLoom 数据目录的 `agent-runs/<run-id>/` 保存 manifest、事件和逐项结果。单项失败不会隐藏其他结果，`failure_policy: stop` 可在首个失败时停止。

## 7. Zotero

启动 Zotero 后检查连接：

```powershell
paperloom agent zotero status --json
paperloom agent zotero collections users/0 --json
paperloom agent zotero items users/0 --limit 50 --json
```

导入附件需要显式确认：

```powershell
paperloom agent zotero import users/0 `
  --attachments ITEM_KEY:ATTACHMENT_KEY `
  --confirm --json
```

典型批量流程是先列出 collection 中的 PDF，再导入并对返回的 `document_id` 执行批量 OCR/翻译。完成后确认目标任务，再写回译文：

```powershell
paperloom agent zotero writeback `
  --document-ids <document-id> `
  --confirm --json
```

Zotero 写回会修改外部文献库，Agent 必须说明目标条目和文件名，并在执行前等待明确确认。

## 8. Obsidian

启动 Obsidian 并打开目标 Vault，然后查看可用 Vault：

```powershell
paperloom agent obsidian status --json
```

导出示例：

```powershell
paperloom agent obsidian export `
  --vault-id <vault-id> `
  --folder Literature/PaperLoom `
  --document-ids <document-id> `
  --on-conflict ask `
  --confirm --json
```

冲突策略支持 `ask`、`rename`、`overwrite` 和 `skip`。导出只更新 PaperLoom 受管区块，保留用户手写内容。覆盖或批量写入前，Agent 应先展示目标 Vault、目录和冲突策略。

## 9. 科研阅读和检索提示词

### 配置检查

```text
请读取 docs/ops/agent-setup.md、docs/ops/agent-hosts.md 和三个 PaperLoom Skill。
先执行 paperloom agent doctor --json 和 paperloom agent capabilities --json。
列出 MCP tools，并只读检查 Zotero 和 Obsidian 状态。
不要提交 OCR、翻译、导入或写回任务。发现写操作时先给出 dry-run 计划并等待明确确认。
```

### 单篇精读

```text
请处理指定论文。先检查 OCR、Markdown 和翻译状态，不要重复创建任务。
按问题读取目录、页面和区域，解释方法、公式、表格和图表。
每个重要结论附 document_id、job_id、page、item_id、quote 和 support_level。
分别标记作者原文、Agent 解读和待验证假设。
```

### 学术检索和综述

```text
检索 <research question>。
先搜索 PaperLoom 和 Zotero，再调用 search_scholarly 查询 OpenAlex、Crossref、Semantic Scholar 和 Europe PMC。
按 DOI、标题、第一作者和年份去重，记录检索来源、时间、结果数量和失败来源。
区分只有元数据的记录与实际读取过全文的文献，再生成证据矩阵和综述提纲。
```

### 批量翻译

```text
处理 Zotero collection <collection-name> 中的 PDF。
先列出附件、文献数量和已有任务，只执行 dry-run，不提交任务。
等我确认后再导入、OCR、翻译，逐项跟踪 job_id、失败原因和重试结果。
完成后展示 Zotero 写回和 Obsidian 导出的目标，再等待确认。
```

## 10. 常见问题

- CLI 找不到：使用 `<paperloom-cli-path>` 的绝对路径，或把构建目录加入 `PATH`。
- MCP 无法握手：先直接运行 `paperloom agent mcp`，确认 stdout 只包含 JSON-RPC 响应。
- 后端未连接：启动 PaperLoom 后端后重新执行 `doctor`，不要在 MCP 配置里写入 API key。
- Zotero 没有可用附件：确认 Zotero 正在运行、collection 和 attachment key 正确。
- Obsidian 导出冲突：改用 `ask` 查看冲突，或在明确确认后选择 `rename`、`overwrite` 或 `skip`。
- 学术检索部分来源失败：查看返回的 `warnings`。成功来源仍可用于去重和建立阅读清单。
