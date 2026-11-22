# Agent 宿主全局配置

PaperLoom 提供统一的本地 stdio MCP 入口（`paperloom agent mcp` 或桌面端内置 `retainpdf` CLI），支持 **Codex**、**Claude Code**、**Pi**、**WorkBuddy / CodeBuddy** 与 **Hermes** 全局接入，并通过 `~/.agents/skills` 共享科研 Skills，避免重复安装和冲突提示。

## 1. 全局配置与去重策略

| 客户端 | 全局 MCP 配置文件 | Skills 加载与去重方式 |
| --- | --- | --- |
| **Codex** | `~/.codex/config.toml`（`$CODEX_HOME/config.toml`） | 原生扫描 `~/.agents/skills`，安装时自动清理旧 `~/.codex/skills/paperloom-*` 重复目录 |
| **Claude Code** | `~/.claude.json`（User Scope `mcpServers`） | 链接 `~/.claude/skills/paperloom-*` → `~/.agents/skills/paperloom-*` |
| **Pi** | `~/.pi/agent/mcp.json`（`$PI_CODING_AGENT_DIR/mcp.json`） | 原生扫描 `~/.agents/skills`，自动清理 `~/.pi/agent/skills/paperloom-*` 重复目录（需安装 `pi-mcp-adapter`） |
| **WorkBuddy** | `~/.workbuddy/mcp.json`（或已有 `~/.codebuddy/mcp.json`） | 链接到 `~/.agents/skills/paperloom-*`，自动识别单一配置目录不双写 |
| **Hermes** | `~/.hermes/config.yaml`（`$HERMES_HOME/config.yaml`） | 在 `skills.external_dirs` 中引用 `~/.agents/skills`，自动清理 `~/.hermes/skills/paperloom-*` |

在桌面端「设置 → MCP 与 Skills」中可直接一键全局安装、去重并执行 UTF-8 MCP 握手自检，或切换到「手动配置与代码」复制对应客户端的 JSON / TOML / YAML 与命令。

## 2. 各客户端手动配置参考

### Codex

```powershell
codex mcp add paperloom -- "<paperloom-cli-path>" agent mcp
```

或写入 `~/.codex/config.toml`：

```toml
[mcp_servers.paperloom]
command = "<paperloom-cli-path>"
args = ["agent", "mcp"]
startup_timeout_sec = 30.0
tool_timeout_sec = 600.0
```

### Claude Code

```powershell
claude mcp add --scope user --transport stdio paperloom -- "<paperloom-cli-path>" agent mcp
```

或合并到 `~/.claude.json` 的顶层 `mcpServers`（注意不是 `~/.claude/mcp.json`）：

```json
{
  "mcpServers": {
    "paperloom": {
      "type": "stdio",
      "command": "<paperloom-cli-path>",
      "args": ["agent", "mcp"]
    }
  }
}
```

### Pi

先安装官方推荐的 MCP 适配器：

```bash
pi install npm:pi-mcp-adapter
```

再在 `~/.pi/agent/mcp.json` 中合并：

```json
{
  "mcpServers": {
    "paperloom": {
      "command": "<paperloom-cli-path>",
      "args": ["agent", "mcp"]
    }
  }
}
```

### WorkBuddy / CodeBuddy

写入 `~/.workbuddy/mcp.json`（若本机使用 `~/.codebuddy` 则写入 `~/.codebuddy/mcp.json`）：

```json
{
  "mcpServers": {
    "paperloom": {
      "command": "<paperloom-cli-path>",
      "args": ["agent", "mcp"]
    }
  }
}
```

### Hermes

写入 `~/.hermes/config.yaml`，保存后在会话中执行 `/reload-mcp`：

```yaml
mcp_servers:
  paperloom:
    command: "<paperloom-cli-path>"
    args:
      - "agent"
      - "mcp"

skills:
  external_dirs:
    - "~/.agents/skills"
```

## 3. 连接与 UTF-8 握手检查

MCP bridge 强制使用二进制 UTF-8 读写 `stdin`/`stdout`，不会在 Windows 默认 GBK 环境下触发 `tools/list` 超时。初始化握手不依赖后端运行；当桌面端启动并写入 `~/.paperloom/run/backend.json` 后，MCP 工具会自动发现新端口，无需重启 Agent。

## 4. 权限与安全边界

- API key 由 PaperLoom 配置或环境变量读取，MCP 返回结果不会回显密钥。
- OCR、翻译、批量工作流、Zotero 导入/写回与 Obsidian 写入需要显式确认（`confirmed: true`）。
- 批量操作先执行 `dry_run: true` 预览数量与目标，再确认提交。
