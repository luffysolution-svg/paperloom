import type { AgentClientStatus, AgentId } from "@/platform/desktop/host.js";

export type ManualConfigTarget = "universal" | AgentId;

export interface AgentMeta {
  id: AgentId;
  label: string;
  subtitle: string;
  defaultMcpFile: string;
  skillsStrategy: string;
  officialNote: string;
}

export const AGENT_CATALOG: readonly AgentMeta[] = [
  {
    id: "codex",
    label: "Codex",
    subtitle: "OpenAI Codex CLI & App",
    defaultMcpFile: "~/.codex/config.toml",
    skillsStrategy: "共用 ~/.agents/skills（自动清理旧重复目录）",
    officialNote: "直接写入 [mcp_servers.paperloom]，重启会话生效。",
  },
  {
    id: "claude",
    label: "Claude Code",
    subtitle: "Anthropic CLI",
    defaultMcpFile: "~/.claude.json",
    skillsStrategy: "链接 ~/.claude/skills → ~/.agents/skills",
    officialNote: "User 级全局配置，在会话中输入 /mcp 可查看连接。",
  },
  {
    id: "pi",
    label: "Pi",
    subtitle: "Pi Coding Agent",
    defaultMcpFile: "~/.pi/agent/mcp.json",
    skillsStrategy: "原生扫描 ~/.agents/skills（零重复）",
    officialNote: "需安装 pi-mcp-adapter 扩展以加载 mcp.json。",
  },
  {
    id: "workbuddy",
    label: "WorkBuddy",
    subtitle: "Tencent WorkBuddy / CodeBuddy",
    defaultMcpFile: "~/.workbuddy/mcp.json",
    skillsStrategy: "链接 skills → ~/.agents/skills",
    officialNote: "自动识别 ~/.workbuddy 或 ~/.codebuddy，仅写一份。",
  },
  {
    id: "hermes",
    label: "Hermes",
    subtitle: "Nous Research Hermes Agent",
    defaultMcpFile: "~/.hermes/config.yaml",
    skillsStrategy: "external_dirs 指向 ~/.agents/skills",
    officialNote: "修改后在 Hermes 中执行 /reload-mcp 立即生效。",
  },
] as const;

export const SKILL_ITEMS = [
  { id: "paperloom-pdf-ops", title: "PDF 处理与同步", desc: "导入、OCR、翻译、批量工作流、Zotero 与 Obsidian 同步" },
  { id: "paperloom-paper-reader", title: "证据链精读", desc: "按目录、页码、区域和图表资源产出可追溯阅读笔记" },
  { id: "paperloom-paper-search", title: "学术检索去重", desc: "联合检索本地书库、Zotero、OpenAlex、Crossref 等来源" },
] as const;

export interface ManualSnippetCard {
  id: string;
  title: string;
  pathLabel: string;
  language: string;
  code: string;
  note?: string;
}

function shellQuoteArg(value: string): string {
  if (!/[\s"'\\]/u.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

export function compactDisplayPath(raw: string, homeDir?: string): string {
  if (!raw) return "";
  if (homeDir) {
    const normHome = homeDir.replace(/[\\/]+$/, "");
    if (raw.toLowerCase().startsWith(normHome.toLowerCase())) {
      const suffix = raw.slice(normHome.length);
      if (!suffix || suffix.startsWith("/") || suffix.startsWith("\\")) {
        return `~${suffix.replace(/\\/g, "/")}`;
      }
    }
  }
  return raw;
}

export function skillsModeLabel(agentId: AgentId, state?: AgentClientStatus | null): string {
  if (!state || !state.skillsConfigured) return "未配置";
  if (state.skillsMode === "shared") return "共用 ~/.agents/skills";
  if (state.skillsMode === "linked") return "已链接共享目录";
  if (state.skillsMode === "external_dir") return "external_dirs 共享";
  if (state.skillsMode === "copied") return "已复制安装";
  if (agentId === "hermes" && state.skillsMode === "local") return "本地 ~/.hermes/skills";
  return "已配置";
}

export function buildManualSnippets(
  target: ManualConfigTarget,
  options: { cliPath?: string; homeDir?: string; workbuddyConfigPath?: string; platform?: string } = {},
): ManualSnippetCard[] {
  const cli = options.cliPath || (options.platform === "win32" ? "paperloom.exe" : "paperloom");
  const quotedCli = shellQuoteArg(cli);
  const standardJson = JSON.stringify(
    { mcpServers: { paperloom: { command: cli, args: ["agent", "mcp"] } } },
    null,
    2,
  );

  if (target === "universal") {
    return [
      {
        id: "universal-json",
        title: "通用 MCP Server JSON",
        pathLabel: "适用于 Cursor / Windsurf / OpenCode / Cherry Studio 等",
        language: "JSON",
        code: standardJson,
        note: "直接粘贴到任意支持 stdio MCP 的客户端配置文件即可，使用桌面端内置 CLI，无需联网拉取 npx。",
      },
      {
        id: "universal-handshake",
        title: "终端自检命令",
        pathLabel: "验证 MCP 握手与工具列表",
        language: "Shell",
        code: `${quotedCli} agent doctor --json`,
        note: "可检查内置 CLI 与本地 PaperLoom 后端的实时连通状态。",
      },
    ];
  }

  if (target === "codex") {
    return [
      {
        id: "codex-cli",
        title: "Codex CLI 一键注册（全局）",
        pathLabel: "官方命令 · 自动写入 ~/.codex/config.toml",
        language: "Shell",
        code: `codex mcp add paperloom -- ${quotedCli} agent mcp`,
      },
      {
        id: "codex-toml",
        title: "手动编辑 config.toml",
        pathLabel: "~/.codex/config.toml",
        language: "TOML",
        code: [
          "[mcp_servers.paperloom]",
          `command = ${JSON.stringify(cli)}`,
          'args = ["agent", "mcp"]',
          "startup_timeout_sec = 30.0",
          "tool_timeout_sec = 600.0",
        ].join("\n"),
        note: "Codex 原生扫描 ~/.agents/skills，请勿同时复制到 ~/.codex/skills 以免出现重复条目。",
      },
    ];
  }

  if (target === "claude") {
    const claudeJson = JSON.stringify(
      { mcpServers: { paperloom: { type: "stdio", command: cli, args: ["agent", "mcp"] } } },
      null,
      2,
    );
    return [
      {
        id: "claude-cli",
        title: "Claude Code 一键注册（User 全局）",
        pathLabel: "官方命令 · 自动写入 ~/.claude.json",
        language: "Shell",
        code: `claude mcp add --scope user --transport stdio paperloom -- ${quotedCli} agent mcp`,
      },
      {
        id: "claude-json",
        title: "手动合并到 ~/.claude.json",
        pathLabel: "~/.claude.json（非 ~/.claude/mcp.json）",
        language: "JSON",
        code: claudeJson,
        note: "Claude Code 全局 Skills 目录为 ~/.claude/skills，一键安装会通过链接指向 ~/.agents/skills。",
      },
    ];
  }

  if (target === "pi") {
    return [
      {
        id: "pi-adapter",
        title: "安装 Pi MCP 适配器（首次必需）",
        pathLabel: "官方扩展 · npm:pi-mcp-adapter",
        language: "Shell",
        code: "pi install npm:pi-mcp-adapter",
        note: "Pi 核心保持极简，需安装 pi-mcp-adapter 才会读取 mcp.json；Skills 自动从 ~/.agents/skills 加载。",
      },
      {
        id: "pi-json",
        title: "Pi 全局 MCP 配置",
        pathLabel: "~/.pi/agent/mcp.json",
        language: "JSON",
        code: standardJson,
      },
    ];
  }

  if (target === "workbuddy") {
    const wbPath = compactDisplayPath(options.workbuddyConfigPath || "~/.workbuddy/mcp.json", options.homeDir);
    return [
      {
        id: "workbuddy-json",
        title: "WorkBuddy / CodeBuddy 全局 MCP 配置",
        pathLabel: wbPath,
        language: "JSON",
        code: standardJson,
        note: "若本机使用 ~/.codebuddy，一键安装会自动写入该目录，不会同时创建两份重复配置。",
      },
    ];
  }

  return [
    {
      id: "hermes-yaml",
      title: "Hermes 全局配置（MCP + 共享 Skills）",
      pathLabel: "~/.hermes/config.yaml",
      language: "YAML",
      code: [
        "mcp_servers:",
        "  paperloom:",
        `    command: ${JSON.stringify(cli)}`,
        "    args:",
        '      - "agent"',
        '      - "mcp"',
        "",
        "skills:",
        "  external_dirs:",
        '    - "~/.agents/skills"',
      ].join("\n"),
      note: "保存后在 Hermes 会话中执行 /reload-mcp 即可热重载，无需复制第二份 Skills。",
    },
  ];
}
