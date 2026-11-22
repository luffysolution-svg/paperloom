# PaperLoom Agent、MCP、Skills 和 Obsidian 配置

本文面向 Windows 本地使用，Linux 和 macOS 只需要替换可执行文件路径与 shell 写法。

PaperLoom 的连接结构是 Agent 宿主启动本地 stdio MCP，MCP 再连接 PaperLoom 后端。OCR、翻译、任务状态、Zotero 和 Obsidian 写回继续由 PaperLoom 后端负责。

## 一次性准备

在项目根目录执行：

```powershell
cd E:\开发\PaperLoom
cargo build --release --bin paperloom
```

如果使用当前源码调试版本，可以使用：

```text
E:\开发\PaperLoom\target\debug\paperloom.exe
```

发布版本或本地 release 构建优先使用 `target/release/paperloom.exe`。PaperLoom 后端需要先由桌面端启动，或者由开发栈启动。

检查 CLI：

```powershell
paperloom agent doctor --json
paperloom agent capabilities --json
```

当前机器没有把 CLI 放入 PATH 时，可以临时加入：

```powershell
$env:Path = "E:\开发\PaperLoom\target\release;$env:Path"
```

项目根目录的 [tools/paperloom-mcp.cmd](../../tools/paperloom-mcp.cmd) 会自动尝试 release、交叉编译 release、debug 和 PATH 中的 `paperloom.exe`。

## Codex

推荐用 Codex CLI 写入用户级 MCP 配置。这个配置会被 Codex CLI 和 Codex IDE 共用。官方支持 `codex mcp add` 和 `codex mcp list` 管理服务器。[Codex MCP 文档](https://developers.openai.com/learn/docs-mcp)

使用已安装的 CLI：

```powershell
codex mcp add paperloom -- paperloom agent mcp
codex mcp list
codex mcp get paperloom
```

使用本项目 debug 二进制：

```powershell
codex mcp add paperloom -- "E:\开发\PaperLoom\target\debug\paperloom.exe" agent mcp
```

也可以在 `%USERPROFILE%\.codex\config.toml` 中手动加入：

```toml
[mcp_servers.paperloom]
command = "E:\\开发\\PaperLoom\\target\\debug\\paperloom.exe"
args = ["agent", "mcp"]
cwd = "E:\\开发\\PaperLoom"
startup_timeout_sec = 15.0
tool_timeout_sec = 600.0
```

项目里的 [mcp.json](../../mcp.json) 是可移植配置。用户级配置使用绝对路径时，更适合当前机器的 PATH 和调试构建状态。

## Claude Code

项目根目录已有 [.mcp.json](../../.mcp.json)。打开项目后执行：

```powershell
cd E:\开发\PaperLoom
claude mcp list
claude mcp get paperloom
```

在 Claude Code 会话中执行 `/mcp`，确认 `paperloom` 为 connected。Claude Code 的 stdio 配置命令格式如下，`--` 后面的内容原样传给 MCP 进程。[Claude Code MCP 文档](https://code.claude.com/docs/en/mcp)

```powershell
claude mcp add --scope local --transport stdio paperloom -- `
  "E:\开发\PaperLoom\target\debug\paperloom.exe" agent mcp
```

项目级共享配置使用：

```powershell
claude mcp add --scope project --transport stdio paperloom -- paperloom agent mcp
```

Claude Code 的 `.claude/skills/` 包装文件会指向 `skills/` 中的单一真源。三个技能分别负责 PDF 操作、证据链阅读和文献检索。

## Pi

项目已经包含 [`.pi/mcp.json`](../../.pi/mcp.json)，使用 `tools/paperloom-mcp.cmd` 自动定位 CLI：

```powershell
pi mcp list --json
```

手动重新配置项目级 MCP：

```powershell
pi mcp add paperloom --local --cwd E:\开发\PaperLoom -- cmd.exe /d /c tools\\paperloom-mcp.cmd
pi mcp list --json
```

Pi 还支持通过 `--skill` 临时加载某个技能：

```powershell
pi --skill skills/paperloom-paper-reader/SKILL.md
```

## Obsidian

当前 Obsidian 接入形态是 Vault 写入、受管区块更新和 `obsidian://` 回跳。PaperLoom 没有单独的 Obsidian 聊天插件，Agent 对话在 Codex、Claude Code 或 Pi 中进行。

先启动 Obsidian 并打开目标 Vault，然后检查发现结果：

```powershell
paperloom agent obsidian status --json
```

如果返回空列表，确认 `%APPDATA%\obsidian\obsidian.json` 存在。也可以在启动 PaperLoom 后端前设置：

```powershell
$env:PAPERLOOM_OBSIDIAN_CONFIG = "$env:APPDATA\obsidian\obsidian.json"
```

导出前先让 Agent 查询 `obsidian_status` 获取 `vault_id`，再使用 `export_obsidian`。该工具要求 `confirmed=true`。CLI 等价命令如下：

```powershell
paperloom agent obsidian export `
  --vault-id <vault_id> `
  --folder Literature/PaperLoom `
  --document-ids <document_id> `
  --on-conflict ask `
  --confirm `
  --json
```

重复导出只更新 PaperLoom 受管区块，保留手写内容。冲突策略支持 `ask`、`rename`、`overwrite` 和 `skip`。

## Zotero

Zotero 8 及以上需要在设置中允许本机其他应用通信：

**设置 → 高级 → 允许此电脑上的其他应用与 Zotero 通信**

保持 Zotero 运行后检查：

```powershell
paperloom agent zotero status --json
paperloom agent zotero collections users/0 --json
paperloom agent zotero items users/0 --limit 50 --json
```

Agent 批量流程应按下面顺序执行：

```text
读取 collection
→ 列出可用 PDF 附件
→ 确认导入数量
→ import_zotero_attachments confirmed=true
→ 对返回的 document_id 执行 run_batch_workflow dry_run=true
→ 用户确认后执行 confirmed=true 的 OCR/翻译
→ 轮询 get_run_status 和 get_job_status
→ 用户确认后 writeback_zotero confirmed=true
```

Zotero 导入 CLI 示例：

```powershell
paperloom agent zotero import users/0 `
  --attachments ITEM_KEY:ATTACHMENT_KEY `
  --confirm `
  --json
```

Zotero 本地 API 不可用时可设置 `PAPERLOOM_ZOTERO_DATA_DIR` 读取本地数据目录。数据目录模式适合浏览和导入，译文写回需要 Zotero 本地 API。

## 让 Agent 自动完成配置

把下面的提示词发送给 Codex、Claude Code 或 Pi，并在 PaperLoom 项目根目录执行：

```text
你正在配置 PaperLoom Agent 工作流。

请先读取：
- docs/ops/agent-setup.md
- docs/ops/agent-hosts.md
- skills/README.md
- skills/paperloom-pdf-ops/SKILL.md
- skills/paperloom-paper-reader/SKILL.md
- skills/paperloom-paper-search/SKILL.md

然后按以下顺序操作：
1. 执行 paperloom agent doctor --json。
2. 执行 paperloom agent capabilities --json。
3. 检查 paperloom MCP 是否已连接，并列出 MCP tools。
4. 调用 obsidian_status 和 zotero_status，只读检查外部库连接。
5. 不提交 OCR、翻译、Zotero 导入、Obsidian 写入或 Zotero 写回，先输出检查结果。
6. 如果发现 CLI 不在 PATH，使用 target/debug/paperloom.exe 或 target/release/paperloom.exe，并说明采用的路径。
7. 任何写操作都先给出 dry-run 计划，等待我明确确认后再执行。
```

## 让 Agent 执行科研任务

单篇精读：

```text
请处理当前选中的论文。先检查 OCR 和翻译状态，不要重复创建任务。
读取目录和相关页面，解释方法、公式、表格和图表。
所有重要结论都附 page、item_id、quote 和 support_level。
```

文献检索：

```text
检索 attention mechanism in scientific document understanding。
调用 search_scholarly，使用 OpenAlex、Crossref、Semantic Scholar 和 Europe PMC。
按 DOI、标题和第一作者年份去重，标记没有全文的记录。
```

批量翻译：

```text
处理 Zotero collection “AI材料设计”中的 PDF。
先列出附件和数量，只做 dry-run，不提交任务。
等我确认后再导入、OCR、翻译，并逐项跟踪失败任务。
```

## 验收命令

```powershell
paperloom agent doctor --json
paperloom agent capabilities --json
codex mcp list
claude mcp list
pi mcp list --json
```

直接验证 MCP 握手：

```powershell
@'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'@ |
  & .\target\debug\paperloom.exe agent mcp
```

批处理运行记录位于 PaperLoom 数据目录的 `agent-runs/<run-id>/` 下。API Key 只从环境或 PaperLoom 凭据配置读取，不放入 MCP JSON 和技能文件。

## 设置页「MCP 与 Skills」的后续设计

设置页增加这个分栏是合适的。它可以把当前手动配置收成一个可预览的安装流程：

- 安装范围选择全局或当前项目
- Agent 选择 Codex、Claude Code、Pi，也可以选择全部
- MCP 和 Skills 分开勾选
- 执行前展示将要修改的文件、命令和目标目录
- 全局安装和外部写入始终需要明确确认
- 安装后立即运行 `doctor`、MCP initialize 和 tools/list 验收

MCP 运行时优先使用桌面包内置的 PaperLoom CLI 和 stdio bridge。`npx` 适合首次引导或开发者手动安装，适合的形式是固定版本的安装器包，例如：

```powershell
npx --yes --package @paperloom/agent@0.4.1 paperloom-agent install --scope project --agents codex,claude,pi
```

正式桌面版不应依赖未固定版本的 `npx` 启动 MCP。这样可以避免启动时联网、版本漂移和额外的包供应链依赖。后续如果发布 npm 安装器，建议同时提供固定版本、`--dry-run`、`--scope global|project`、`--agents` 和 `--skills` 参数，设置页调用同一个安装器逻辑。
