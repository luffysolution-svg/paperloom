import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Input, Select } from "@retainpdf/ui";
import { getDesktopHost } from "@/platform/desktop/host.js";

const AGENTS = [
  { id: "codex", label: "Codex" },
  { id: "claude", label: "Claude Code" },
  { id: "pi", label: "Pi" },
] as const;

type AgentId = (typeof AGENTS)[number]["id"];
type Scope = "project" | "global";

export function AgentIntegrationPanel() {
  const desktop = getDesktopHost();
  const [scope, setScope] = useState<Scope>("project");
  const [agents, setAgents] = useState<AgentId[]>(AGENTS.map((agent) => agent.id));
  const [installMcp, setInstallMcp] = useState(true);
  const [installSkills, setInstallSkills] = useState(true);
  const [projectRoot, setProjectRoot] = useState("");
  const [status, setStatus] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!desktop) return;
    desktop.agentIntegrationStatus({ projectRoot }).then(setStatus).catch(() => setStatus(null));
  }, [desktop, projectRoot]);

  const commandPreview = useMemo(() => {
    const selected = agents.length === AGENTS.length ? "全部 Agent" : agents.join("、");
    const components = [installMcp ? "MCP" : "", installSkills ? "Skills" : ""].filter(Boolean).join(" + ");
    return `${scope === "global" ? "全局" : "当前项目"} · ${selected} · ${components || "未选择组件"}`;
  }, [agents, installMcp, installSkills, scope]);

  function toggleAgent(agent: AgentId) {
    setAgents((current) => current.includes(agent)
      ? current.filter((item) => item !== agent)
      : [...current, agent]);
  }

  async function chooseProject() {
    if (!desktop) return;
    const selected = await desktop.pickDirectory({ title: "选择 Agent 项目目录", defaultPath: projectRoot || undefined });
    if (selected) setProjectRoot(selected);
  }

  async function install() {
    if (!desktop) return;
    if (!agents.length) {
      setMessage({ ok: false, text: "至少选择一个 Agent。" });
      return;
    }
    if (!installMcp && !installSkills) {
      setMessage({ ok: false, text: "至少选择 MCP 或 Skills。" });
      return;
    }
    if (scope === "project" && !projectRoot) {
      setMessage({ ok: false, text: "项目级安装需要先选择项目目录。" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await desktop.installAgentIntegrations({
        scope,
        agents,
        installMcp,
        installSkills,
        projectRoot: projectRoot || undefined,
      }) as { ok?: boolean; commands?: string[]; files?: string[]; warnings?: string[]; error?: string };
      if (result?.ok) {
        const details = [
          result.commands?.length ? `已配置 ${result.commands.length} 项 MCP。` : "",
          result.files?.length ? `已安装 ${result.files.length} 个 Skills 文件。` : "",
          result.warnings?.join(" ") || "",
        ].filter(Boolean).join(" ");
        setMessage({ ok: true, text: details || "配置已完成。" });
        setStatus(await desktop.agentIntegrationStatus({ projectRoot }));
      } else {
        setMessage({ ok: false, text: result?.error || "安装失败。" });
      }
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : `${error}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="agent-integration-panel" data-agent-integration-panel>
      <div className="agent-integration-card">
        <p className="agent-integration-lead">
          把 PaperLoom 的 MCP 和科研 Skills 安装到 Agent。桌面版优先使用内置 CLI，避免每次启动都依赖 npx 网络下载。
        </p>
        <div className="agent-integration-grid">
          <label className="agent-integration-field">
            <span>安装范围</span>
            <Select size="sm" value={scope} onChange={(event) => setScope(event.target.value as Scope)}>
              <option value="project">当前项目</option>
              <option value="global">全局</option>
            </Select>
          </label>
          {scope === "project" ? (
            <div className="agent-integration-field">
              <span>项目目录</span>
              <div className="agent-integration-inline">
                <Input size="sm" value={projectRoot} onChange={(event) => setProjectRoot(event.target.value)} placeholder="选择项目目录" />
                <Button variant="secondary" onClick={chooseProject}>选择</Button>
              </div>
            </div>
          ) : null}
        </div>
        <fieldset className="agent-integration-fieldset">
          <legend>Agent</legend>
          <div className="agent-integration-checks">
            {AGENTS.map((agent) => (
              <Checkbox key={agent.id} checked={agents.includes(agent.id)} onChange={() => toggleAgent(agent.id)} label={agent.label} />
            ))}
          </div>
        </fieldset>
        <fieldset className="agent-integration-fieldset">
          <legend>组件</legend>
          <div className="agent-integration-checks">
            <Checkbox checked={installMcp} onChange={(event) => setInstallMcp(event.target.checked)} label="MCP 服务器" />
            <Checkbox checked={installSkills} onChange={(event) => setInstallSkills(event.target.checked)} label="科研 Skills" />
          </div>
        </fieldset>
        <p className="agent-integration-command"><code>{commandPreview}</code></p>
        <Button variant="primary" pending={busy} onClick={install} data-agent-action="install">
          {busy ? "正在安装…" : "安装 MCP 与 Skills"}
        </Button>
        {message ? <p className={message.ok ? "agent-integration-message is-ok" : "agent-integration-message is-error"} role={message.ok ? "status" : "alert"}>{message.text}</p> : null}
        {status ? <pre className="agent-integration-status">{JSON.stringify(status, null, 2)}</pre> : null}
      </div>
    </section>
  );
}
