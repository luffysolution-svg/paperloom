import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, RefreshCw, Sparkles, Trash2, Wrench } from "lucide-react";
import { Badge, Button, Checkbox, SegmentedControl, type SegmentedOption } from "@retainpdf/ui";
import {
  getDesktopHost,
  type AgentId,
  type AgentIntegrationStatus,
  type AgentMcpTestResult,
} from "@/platform/desktop/host.js";
import {
  AGENT_CATALOG,
  compactDisplayPath,
  skillsModeLabel,
} from "./agent-integration-catalog.js";
import { AgentManualConfigSection } from "./AgentManualConfigSection.jsx";

type ViewMode = "install" | "manual";

const VIEW_OPTIONS: ReadonlyArray<SegmentedOption<ViewMode>> = [
  { value: "install", label: "一键全局安装" },
  { value: "manual", label: "手动配置与代码" },
];

const ALL_AGENT_IDS: AgentId[] = AGENT_CATALOG.map((agent) => agent.id);

export function AgentIntegrationPanel() {
  const desktop = getDesktopHost();
  const [view, setView] = useState<ViewMode>(desktop ? "install" : "manual");
  const [status, setStatus] = useState<AgentIntegrationStatus | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<AgentId[]>(ALL_AGENT_IDS);
  const [selectionSeeded, setSelectionSeeded] = useState(false);
  const [installMcp, setInstallMcp] = useState(true);
  const [installSkills, setInstallSkills] = useState(true);
  const [busyKey, setBusyKey] = useState<string>("");
  const [testing, setTesting] = useState(false);
  const [probe, setProbe] = useState<AgentMcpTestResult | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "warn" | "error"; text: string } | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!desktop) return;
    try {
      const next = await desktop.agentIntegrationStatus();
      setStatus(next);
      if (!selectionSeeded && next?.agents) {
        const detected = ALL_AGENT_IDS.filter((id) => next.agents[id]?.detected);
        if (detected.length > 0) setSelectedAgents(detected);
        setSelectionSeeded(true);
      }
    } catch {
      setStatus(null);
    }
  }, [desktop, selectionSeeded]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  function toggleAgent(id: AgentId) {
    setSelectedAgents((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  async function runInstall(targets: AgentId[], key: string) {
    if (!desktop) return;
    if (!targets.length) {
      setNotice({ tone: "error", text: "请至少选择一个 Agent 客户端。" });
      return;
    }
    if (!installMcp && !installSkills) {
      setNotice({ tone: "error", text: "请至少勾选「MCP 服务」或「科研 Skills」之一。" });
      return;
    }
    setBusyKey(key);
    setNotice(null);
    try {
      const result = await desktop.installAgentIntegrations({
        agents: targets,
        installMcp,
        installSkills,
      });
      if (result?.status) setStatus(result.status);
      else await refreshStatus();
      if (result?.ok) {
        const parts = [
          result.configuredMcp?.length ? `已更新 ${result.configuredMcp.length} 个客户端全局 MCP` : "",
          installSkills ? "已同步共享 Skills（零重复）" : "",
          result.cleanedDuplicates?.length ? `已清理 ${result.cleanedDuplicates.length} 处旧重复目录` : "",
        ].filter(Boolean);
        const warningText = result.warnings?.length ? `；注意：${result.warnings.join(" ")}` : "";
        setNotice({
          tone: result.warnings?.length ? "warn" : "ok",
          text: `${parts.join("，") || "全局配置已完成"}${warningText}`,
        });
      } else {
        setNotice({ tone: "error", text: result?.error || "安装失败，请检查文件权限后重试。" });
      }
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : `${error}` });
    } finally {
      setBusyKey("");
    }
  }

  async function runUninstall(agentId: AgentId) {
    if (!desktop) return;
    setBusyKey(`remove:${agentId}`);
    setNotice(null);
    try {
      const result = await desktop.uninstallAgentIntegrations({
        agents: [agentId],
        removeMcp: true,
        removeSkills: true,
      });
      if (result?.status) setStatus(result.status);
      else await refreshStatus();
      const label = AGENT_CATALOG.find((item) => item.id === agentId)?.label || agentId;
      setNotice({ tone: "ok", text: `已移除 ${label} 的 PaperLoom 全局配置。` });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : `${error}` });
    } finally {
      setBusyKey("");
    }
  }

  async function runMcpSelfTest() {
    if (!desktop) return;
    setTesting(true);
    setProbe(null);
    try {
      const result = await desktop.testAgentMcp();
      setProbe(result);
    } catch (error) {
      setProbe({
        ok: false,
        cliPath: status?.cliPath || "",
        error: error instanceof Error ? error.message : `${error}`,
      });
    } finally {
      setTesting(false);
    }
  }

  const summaryLine = useMemo(() => {
    const names = selectedAgents
      .map((id) => AGENT_CATALOG.find((item) => item.id === id)?.label || id)
      .join("、");
    const comps = [installMcp ? "MCP" : "", installSkills ? "Skills" : ""].filter(Boolean).join(" + ");
    return `全局安装 · ${selectedAgents.length ? names : "未选择客户端"} · ${comps || "未选择组件"}`;
  }, [installMcp, installSkills, selectedAgents]);

  const cliDisplay = status?.cliPath
    ? compactDisplayPath(status.cliPath, status.homeDir)
    : desktop ? "未检测到内置 CLI" : "浏览器模式（请使用下方配置模板）";

  const sharedSkillCount = status?.sharedSkills?.length ?? 0;
  const totalSkillCount = status?.allSkills?.length ?? 3;

  return (
    <section className="agent-integration-panel" data-agent-integration-panel>
      <div className="agent-integration-runtime">
        <div className="agent-integration-runtime-info">
          <div className="agent-integration-runtime-row">
            <span
              className={`agent-integration-dot ${status?.cliAvailable ? "is-ready" : "is-warn"}`}
              aria-hidden
            />
            <strong className="agent-integration-runtime-title">内置 MCP 运行时</strong>
            <Badge tone={status?.cliAvailable ? "done" : "warn"}>
              {status?.cliAvailable ? "已就绪" : desktop ? "缺少 CLI" : "仅手动模板"}
            </Badge>
            <Badge tone={sharedSkillCount === totalSkillCount ? "done" : "muted"}>
              共享 Skills {sharedSkillCount}/{totalSkillCount}
            </Badge>
          </div>
          <p className="agent-integration-runtime-path" title={status?.cliPath || cliDisplay}>
            {cliDisplay}
          </p>
        </div>

        {desktop ? (
          <div className="agent-integration-runtime-actions">
            <Button
              variant="secondary"
              size="sm"
              pending={testing}
              disabled={!status?.cliAvailable || Boolean(busyKey)}
              onClick={runMcpSelfTest}
              data-agent-action="test-mcp"
            >
              <Activity size={13} aria-hidden />
              {testing ? "检测中…" : "检测 MCP"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={Boolean(busyKey) || testing}
              onClick={() => void refreshStatus()}
              data-agent-action="refresh"
            >
              <RefreshCw size={13} aria-hidden />
              刷新
            </Button>
          </div>
        ) : null}
      </div>

      {probe ? (
        <div
          className={`agent-integration-banner ${probe.ok ? "is-ok" : "is-error"}`}
          role={probe.ok ? "status" : "alert"}
          data-agent-probe-result
        >
          <CheckCircle2 size={14} aria-hidden />
          <span>
            {probe.ok
              ? `UTF-8 MCP 握手正常（协议 ${probe.protocolVersion} · ${probe.toolCount} 个工具就绪，${probe.backendMessage}）。`
              : probe.error || "MCP 握手检测失败。"}
          </span>
        </div>
      ) : null}

      <div className="agent-integration-toolbar">
        <SegmentedControl<ViewMode>
          label="接入方式"
          size="sm"
          value={view}
          options={VIEW_OPTIONS}
          onChange={setView}
        />
        {view === "install" ? (
          <div className="agent-integration-components">
            <Checkbox
              checked={installMcp}
              onChange={(event) => setInstallMcp(event.target.checked)}
              label="MCP 服务"
            />
            <Checkbox
              checked={installSkills}
              onChange={(event) => setInstallSkills(event.target.checked)}
              label="科研 Skills"
            />
          </div>
        ) : null}
      </div>

      {view === "install" ? (
        <div className="agent-integration-install-view">
          <p className="agent-integration-dedup-hint">
            <Sparkles size={13} aria-hidden />
            <span>
              默认全部写入用户级全局配置，无需项目目录。Codex / Pi / Hermes 共享 <code>~/.agents/skills</code>，Claude Code / WorkBuddy 自动链接，避免重复加载。
            </span>
          </p>

          <div className="agent-integration-cards">
            {AGENT_CATALOG.map((agent) => {
              const item = status?.agents?.[agent.id];
              const checked = selectedAgents.includes(agent.id);
              const configured = Boolean(item?.mcpConfigured || item?.skillsConfigured);
              const hasDupes = Boolean(item?.duplicateSkillPaths?.length);
              const mcpDisplay = compactDisplayPath(item?.mcpConfigPath || agent.defaultMcpFile, status?.homeDir);
              const itemBusy = busyKey === `one:${agent.id}` || busyKey === `remove:${agent.id}`;

              return (
                <article
                  key={agent.id}
                  className={[
                    "agent-integration-client",
                    checked ? "is-selected" : "",
                    configured ? "is-configured" : "",
                  ].filter(Boolean).join(" ")}
                  data-agent-card={agent.id}
                >
                  <div className="agent-integration-client-head">
                    <div className="agent-integration-client-id">
                      <Checkbox
                        checked={checked}
                        onChange={() => toggleAgent(agent.id)}
                        label={agent.label}
                      />
                      <span className="agent-integration-client-sub">{agent.subtitle}</span>
                    </div>
                    <div className="agent-integration-client-badges">
                      {item?.detected ? <Badge tone="active">已检测</Badge> : <Badge tone="muted">未检测</Badge>}
                      {item?.mcpConfigured ? <Badge tone="done">MCP</Badge> : null}
                      {item?.skillsConfigured ? <Badge tone="done">Skills</Badge> : null}
                      {hasDupes ? <Badge tone="warn">待去重</Badge> : null}
                    </div>
                  </div>

                  <dl className="agent-integration-client-meta">
                    <div>
                      <dt>MCP 配置</dt>
                      <dd title={item?.mcpConfigPath || agent.defaultMcpFile}>{mcpDisplay}</dd>
                    </div>
                    <div>
                      <dt>Skills</dt>
                      <dd>{item?.skillsConfigured ? skillsModeLabel(agent.id, item) : agent.skillsStrategy}</dd>
                    </div>
                  </dl>

                  <footer className="agent-integration-client-foot">
                    <span className="agent-integration-client-note">
                      {agent.id === "pi" && item && !item.adapterInstalled
                        ? "未检测到 pi-mcp-adapter，请切到「手动配置」复制安装命令。"
                        : agent.officialNote}
                    </span>
                    {desktop ? (
                      <div className="agent-integration-client-actions">
                        <Button
                          variant="secondary"
                          size="sm"
                          pending={busyKey === `one:${agent.id}`}
                          disabled={Boolean(busyKey) && !itemBusy}
                          onClick={() => void runInstall([agent.id], `one:${agent.id}`)}
                        >
                          <Wrench size={12} aria-hidden />
                          {configured ? "更新" : "安装"}
                        </Button>
                        {configured ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            pending={busyKey === `remove:${agent.id}`}
                            disabled={Boolean(busyKey) && !itemBusy}
                            onClick={() => void runUninstall(agent.id)}
                            aria-label={`移除 ${agent.label} 配置`}
                            title={`移除 ${agent.label} 配置`}
                          >
                            <Trash2 size={12} aria-hidden />
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </footer>
                </article>
              );
            })}
          </div>

          <div className="agent-integration-footer">
            <span className="agent-integration-summary">{summaryLine}</span>
            <Button
              variant="primary"
              pending={busyKey === "batch"}
              disabled={!desktop || (Boolean(busyKey) && busyKey !== "batch")}
              onClick={() => void runInstall(selectedAgents, "batch")}
              data-agent-action="install"
            >
              {busyKey === "batch" ? "正在配置…" : "一键全局安装所选"}
            </Button>
          </div>
        </div>
      ) : (
        <AgentManualConfigSection
          cliPath={status?.cliPath || ""}
          homeDir={status?.homeDir}
          platform={status?.platform || desktop?.platform}
          sharedSkillsDir={status?.sharedSkillsDir}
          workbuddyConfigPath={status?.agents?.workbuddy?.mcpConfigPath}
        />
      )}

      {notice ? (
        <p
          className={
            notice.tone === "error"
              ? "agent-integration-banner is-error"
              : notice.tone === "warn"
                ? "agent-integration-banner is-warn"
                : "agent-integration-banner is-ok"
          }
          role={notice.tone === "error" ? "alert" : "status"}
          data-agent-notice
        >
          {notice.text}
        </p>
      ) : null}
    </section>
  );
}
