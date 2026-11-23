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

## 2. 全局注册 MCP（推荐桌面端一键配置）

桌面端「设置 → MCP 与 Skills」默认提供 **全局一键安装**（Codex、Claude Code、Pi、WorkBuddy、Hermes），自动合并各客户端全局配置文件、共享 `~/.agents/skills` 并清理旧重复目录，同时提供「检测 MCP」按钮验证 UTF-8 握手与后端连通性，以及「手动配置与代码」复制面板。

### Codex（`~/.codex/config.toml`）

```powershell
codex mcp add paperloom -- "<paperloom-cli-path>" agent mcp
codex mcp list
codex mcp get paperloom
```

### Claude Code（`~/.claude.json`，User 全局）

```powershell
claude mcp add --scope user --transport stdio paperloom -- "<paperloom-cli-path>" agent mcp
claude mcp list
```

在 Claude Code 会话中执行 `/mcp`，确认 `paperloom` 已连接。

### Pi（`~/.pi/agent/mcp.json`）

Pi 需先安装官方推荐的 MCP 适配器：

```bash
pi install npm:pi-mcp-adapter
```

然后在 `~/.pi/agent/mcp.json` 中合并 `mcpServers.paperloom`（`command: "<paperloom-cli-path>"`, `args: ["agent", "mcp"]`）。

### WorkBuddy / CodeBuddy（`~/.workbuddy/mcp.json` 或 `~/.codebuddy/mcp.json`）

在对应全局 `mcp.json` 的 `mcpServers` 中新增 `paperloom`（`command: "<paperloom-cli-path>"`, `args: ["agent", "mcp"]`）。若本机已存在 `~/.codebuddy`，桌面端一键安装会自动写入该目录，不会双写。

### Hermes（`~/.hermes/config.yaml`）

在 `~/.hermes/config.yaml` 中加入 `mcp_servers.paperloom` 与 `skills.external_dirs: ["~/.agents/skills"]`，保存后在会话内运行 `/reload-mcp`。

### 其他宿主

在 Cursor、Windsurf、OpenCode、Cherry Studio 等宿主的 MCP 设置中直接粘贴通用 `mcpServers` JSON（桌面端「手动配置与代码 → 通用 JSON」可一键复制）。详细宿主配置与去重策略见 [agent-hosts.md](./agent-hosts.md)。

直接验证 UTF-8 握手：

```powershell
'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}' |
  & <paperloom-cli-path> agent mcp
```

## 3. Skills（全局共享、零重复）

桌面端统一将以下三个科研 Skills 安装到开放标准共享目录 **`~/.agents/skills/`**：

- `paperloom-pdf-ops/SKILL.md`：优先通过 MCP 工具完成导入、OCR、翻译、任务恢复、批量工作流以及 Zotero/Obsidian 同步（CLI 作为终端备选）。
- `paperloom-paper-reader/SKILL.md`：按页码、区域和资源链接组织证据链阅读。
- `paperloom-paper-search/SKILL.md`：本地文献、Zotero 和外部学术来源检索与去重。

去重策略：
- **Codex**、**Pi** 原生扫描 `~/.agents/skills/`（一键安装会自动清理 `~/.codex/skills`、`~/.pi/agent/skills` 中的旧重复项）。
- **Hermes** 通过 `skills.external_dirs` 指向 `~/.agents/skills/`。
- **Claude Code**（`~/.claude/skills/`）与 **WorkBuddy**（`~/.workbuddy/skills/` 或 `~/.codebuddy/skills/`）通过目录链接指向 `~/.agents/skills/`，保持单一真源。

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
  --attachments ITEM_KEY:ATTACHMENT_KEY:main,ITEM_KEY:SI_KEY:si `
  --confirm --json
```

附件类型可省略，交给后端识别。MCP 的 `import_zotero_attachments` 在每个附件上用 `supplement` 指定类型，主文为 `false`，SI 为 `true`。

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

单篇可用 `--job-id` 选定 OCR 或翻译任务。MCP 的 `export_obsidian` 接受单篇 `job_id` 或批量 `document_ids`。使用 `--folder-by-collection` 可按 Zotero 分类建目录。离线交付使用 ZIP，单个 Markdown 的图片链接指向 PaperLoom 服务。

```powershell
paperloom agent reader markdown <job-id> --output source.md --json
paperloom agent obsidian bundle <job-id> --output paper.zip --json
paperloom agent obsidian sync-zotero <job-id> --vault-id <vault-id> --folder Literature/PaperLoom --confirm --json
```

MCP 的 `export_markdown` 默认返回带书目信息和引文链接的原文，`format: "raw"` 用于读取 OCR 原稿，`format: "obsidian_zip"` 与 `output` 一起使用。已导出的主笔记可用 `sync_obsidian_to_zotero` 回写书目和「阅读笔记」，使用导出时的目录和 `folder_by_collection` 设置。

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
