# Agent 宿主配置

PaperLoom 提供一个本地 stdio MCP 入口。Codex、Claude Code、Pi、OpenCode、ZCode、DeepSeek Harness 和 WorkBuddy 都可以通过同一个入口访问文献、任务、Reader、Zotero、Obsidian 和学术检索能力。

## 统一入口

确保 `paperloom` 已安装到 `PATH`，或者使用构建产物的绝对路径。启动命令始终是：

```text
paperloom agent mcp
```

如果使用项目目录中的构建产物，把 `paperloom` 替换为：

```text
<paperloom-project>/target/release/paperloom.exe
```

Windows 使用 `.exe`，Linux 和 macOS 使用对应的可执行文件名。宿主只负责启动 MCP，业务逻辑由 PaperLoom CLI 和后端提供。

## Claude Code

项目级配置：

```powershell
claude mcp add --scope project --transport stdio paperloom -- paperloom agent mcp
claude mcp list
```

使用绝对路径时：

```powershell
claude mcp add --scope project --transport stdio paperloom -- `
  "<paperloom-cli-path>" agent mcp
```

在 Claude Code 中执行 `/mcp`，确认 `paperloom` 已连接。将以下目录作为只读技能说明加载：

```text
skills/paperloom-pdf-ops
skills/paperloom-paper-reader
skills/paperloom-paper-search
```

## Codex

```powershell
codex mcp add paperloom -- paperloom agent mcp
codex mcp list
codex mcp get paperloom
```

手动配置用户级 `config.toml` 时使用：

```toml
[mcp_servers.paperloom]
command = "<paperloom-cli-path>"
args = ["agent", "mcp"]
cwd = "<paperloom-project>"
startup_timeout_sec = 15.0
tool_timeout_sec = 600.0
```

## Pi

```powershell
pi mcp add paperloom --local --cwd <paperloom-project> -- paperloom agent mcp
pi mcp list --json
```

临时加载技能：

```powershell
pi --skill skills/paperloom-paper-reader/SKILL.md
```

## OpenCode、ZCode、DeepSeek Harness 和 WorkBuddy

在宿主的 MCP 设置中新增一个名为 `paperloom` 的 stdio server：

```text
command: paperloom
args: agent mcp
```

宿主只接受绝对路径时，使用 `where paperloom` 或 `which paperloom` 找到可执行文件。将三个 `skills/paperloom-*` 目录作为只读指令挂载，不要把 API key 写入宿主配置或技能文件。

## 连接检查

```powershell
paperloom agent doctor --json
paperloom agent capabilities --json
```

直接检查 MCP 握手：

```powershell
'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' |
  & <paperloom-cli-path> agent mcp
```

初始化阶段不需要文献输入。后端未启动时，MCP 仍应完成握手，调用需要后端的工具时再返回连接错误。

## 权限和密钥

- API key 由 PaperLoom 配置或环境变量读取，MCP 返回结果不会回显密钥。
- OCR、翻译、批量工作流、Zotero 导入和写回、Obsidian 写入等操作需要明确确认。
- 批量操作先使用 `dry_run` 或 `--dry-run`，确认数量、目标和冲突策略后再执行。
- 运行记录写入 PaperLoom 数据目录的 `agent-runs/<run-id>/`，其中保存清单、事件和逐项结果。
