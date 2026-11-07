import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  API_PROTOCOL_LABELS, authenticateAiConnection, fetchAiConnections, probeAiConnection, removeAiConnection,
  saveAiConnection, saveAiSelection, type AgentPreset, type AiConnection, type AiConnectionCatalog, type AiConnectionProbe, type ApiProtocol,
} from "@retainpdf/api";
import { AiBrandMark, AiModelSelect, AI_PROVIDERS, aiConnectionBrand, aiConnectionName, agentBrand, connectionProvider, isVisibleAiConnection, rememberAgentOptions, type AiProvider } from "@retainpdf/reader/ai";
import { listModels } from "@/platform/api/index.js";
import { API_PREFIX } from "@/platform/config/api-constants.js";
import { hasModelApiKey, readSettingsModelApiKey } from "@/features/reader/domain.js";
import { SecretInput } from "./SecretInput.js";

function newConnection(kind: AiConnection["kind"]): AiConnection {
  return { id: "", name: "", kind, api_protocol: "openai", base_url: "", model: "", models: [], preset: "custom", command: "", args: [], cwd: "" };
}

export function AiConnectionsSettings() {
  const [catalog, setCatalog] = useState<AiConnectionCatalog | null>(null);
  const [draft, setDraft] = useState<AiConnection | null>(null);
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<"byoa" | "byok">("byoa");
  const [key, setKey] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [args, setArgs] = useState("[]");
  const [environment, setEnvironment] = useState("");
  const [modelNames, setModelNames] = useState("");
  const [modelLoading, setModelLoading] = useState(false);
  const [modelNotice, setModelNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [results, setResults] = useState<Record<string, AiConnectionProbe>>({});
  const [deleting, setDeleting] = useState(false);
  const active = useRef(true);
  const modelRequest = useRef(0);
  const id = useId();
  useEffect(() => {
    active.current = true;
    void fetchAiConnections().then((result) => { if (active.current) setCatalog(result); })
      .catch((err) => { if (active.current) setError(err.message); });
    return () => { active.current = false; modelRequest.current++; };
  }, []);

  function select(connection: AiConnection) {
    modelRequest.current++;
    setDraft({ ...connection, name: aiConnectionName(connection) }); setKey(""); setClearKey(false);
    setArgs(JSON.stringify(connection.args, null, 2)); setEnvironment(""); setModelNames(connection.models.join("\n"));
    setDirty(false); setError(""); setNotice(""); setModelNotice(""); setModelLoading(false); setDeleting(false); setLeaving(false);
  }
  function update(value: Partial<AiConnection>) {
    setDraft((current) => current ? { ...current, ...value } : current); setDirty(true); setNotice(""); setLeaving(false);
    if (value.base_url !== undefined || value.api_protocol !== undefined) { modelRequest.current++; setModelLoading(false); setModelNotice(""); setModelNames(""); }
  }
  function closeEditor() { setDraft(null); setKey(""); setDirty(false); setError(""); setLeaving(false); setAdding(false); setNotice(""); }
  function chooseAgent(preset?: AgentPreset) {
    select({ ...newConnection("byoa"), ...(preset ? { name: preset.name, preset: preset.id, command: preset.command, args: preset.args } : { name: "自定义 Agent" }) });
  }
  function chooseProvider(provider: AiProvider) {
    select({ ...newConnection("byok"), provider: provider.id, name: provider.name, base_url: provider.baseUrl, api_protocol: provider.protocol });
  }

  async function fetchModels() {
    if (!draft || modelLoading) return;
    const request = ++modelRequest.current;
    const apiKey = key.trim() || (draft.legacy_inherited ? readSettingsModelApiKey() : "");
    if (!apiKey && !draft.api_key_configured) { setModelNotice("先填写 API Key，再读取可用模型；也可以直接输入模型名称。"); return; }
    if (!draft.base_url.trim()) { setModelNotice("请先填写服务地址。"); return; }
    const stored = catalog?.connections.find((connection) => connection.id === draft.id);
    if (!apiKey && stored && (stored.base_url.trim() !== draft.base_url.trim() || stored.api_protocol !== draft.api_protocol)) {
      setModelNotice("服务地址或协议已修改。请先保存并验证，或重新填写 API Key 后读取新服务的模型。"); return;
    }
    setModelLoading(true); setModelNotice("");
    try {
      const result = apiKey
        ? await listModels(API_PREFIX, { api_key: apiKey, base_url: draft.base_url.trim(), api_protocol: draft.api_protocol })
        : await probeAiConnection(draft.id, { models_only: true });
      if (!active.current || request !== modelRequest.current) return;
      const names = Array.isArray(result.models) ? result.models.filter((name: unknown): name is string => typeof name === "string" && Boolean(name.trim())).slice(0, 200) : [];
      if (names.length) { setModelNames(names.join("\n")); setDirty(true); setModelNotice(`已读取 ${names.length} 个模型，请选择用于对话的模型。`); }
      else setModelNotice(result.summary || result.message || "服务未提供模型列表，可直接输入模型名称。");
    } catch (err) { if (active.current && request === modelRequest.current) setModelNotice(`${(err as Error).message} 也可以直接输入模型名称。`); }
    finally { if (active.current && request === modelRequest.current) setModelLoading(false); }
  }

  async function verify(connection: AiConnection) {
    let result = await probeAiConnection(connection.id, connection.kind === "byoa" ? { prepare: true, fresh: true } : {});
    while (result.status === "preparing" && active.current) {
      setNotice(result.message);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      if (!active.current) return null;
      result = await probeAiConnection(connection.id, { prepare: true });
    }
    if (!active.current) return null;
    setResults((current) => ({ ...current, [connection.id]: result }));
    if (result.config_options) rememberAgentOptions(connection.id, result.config_options);
    return result;
  }

  async function save() {
    if (!draft || !catalog) return;
    setBusy("save"); setError(""); setNotice(""); setLeaving(false);
    try {
      if (draft.kind === "byok" && !draft.model.trim()) throw new Error("请选择或输入一个对话模型。");
      if (draft.kind === "byok" && !key.trim() && !draft.api_key_configured && !(draft.legacy_inherited && hasModelApiKey()) && !clearKey) throw new Error("请填写 API Key。");
      let parsedArgs: unknown, env: unknown;
      try { parsedArgs = JSON.parse(args); env = environment.trim() ? JSON.parse(environment) : {}; }
      catch { throw new Error("高级设置中的 JSON 格式不正确，请检查启动参数和环境变量。"); }
      if (!Array.isArray(parsedArgs) || parsedArgs.some((v) => typeof v !== "string")) throw new Error("启动参数应为 JSON 字符串数组，例如 [\"acp\"]。");
      if (!env || Array.isArray(env) || typeof env !== "object" || Object.values(env).some((v) => typeof v !== "string")) throw new Error("环境变量应为 JSON 对象，值使用字符串。");
      const { api_key_configured, env_names, legacy_inherited, ...record } = draft;
      const apiKey = key.trim() || (legacy_inherited ? readSettingsModelApiKey() : "");
      const result = await saveAiConnection({ ...record, name: draft.name.trim(), env: env as Record<string, string>, args: parsedArgs,
        models: [...new Set([draft.model, ...modelNames.split(/[\n,]/)].map((v) => v.trim()).filter(Boolean))].slice(0, 200),
        ...(clearKey ? { api_key: "" } : apiKey ? { api_key: apiKey } : {}),
      }, catalog.revision);
      if (!active.current) return;
      const saved = result.connections.find((c) => c.id === draft.id) || result.connections[result.connections.length - 1];
      setCatalog(result); select(saved); setBusy("verify"); setNotice(saved.kind === "byoa" ? "正在连接 Agent…" : "已保存，正在验证模型…");
      const checked = await verify(saved);
      if (!checked) return;
      if (checked.ready) {
        saveAiSelection("", { connectionId: saved.id, model: "", options: {} });
        setDraft(null); setAdding(false); setNotice(`${aiConnectionName(saved)} 已连接，可以开始对话了。`);
        void fetchAiConnections().then((next) => { if (active.current) setCatalog(next); }).catch(() => {});
      } else { setNotice(""); setError(`设置已保存，连接尚未就绪。${checked.message}`); }
    } catch (err) {
      if (!active.current) return;
      const message = (err as Error).message;
      setError(message); setNotice("");
      if (message.includes("其他窗口")) void fetchAiConnections().then(setCatalog).catch(() => {});
    } finally { if (active.current) setBusy(""); }
  }

  async function remove() {
    if (!draft || !catalog) return;
    setBusy("delete"); setError("");
    try { const next = await removeAiConnection(draft.id, catalog.revision); setCatalog(next); closeEditor(); setNotice("服务已移除，已有对话记录仍可查看。"); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(""); }
  }

  const saved = catalog?.connections.filter((connection) => isVisibleAiConnection(connection, hasModelApiKey())) || [];
  const preset = catalog?.presets.find((p) => p.id === draft?.preset);
  const provider = draft?.kind === "byok" ? connectionProvider(draft) : null;
  const probe = draft ? results[draft.id] : undefined;
  const detected = catalog?.presets.filter((p) => p.installed || p.host_installed) || [];
  const others = catalog?.presets.filter((p) => !p.installed && !p.host_installed) || [];
  const needsInstall = Boolean(preset && !preset.installed && !preset.host_installed && preset.id !== "zcode" && draft?.command === preset.command);
  const locked = Boolean(busy);

  function agentRow(agent: AgentPreset) {
    const exists = saved.find((connection) => connection.kind === "byoa" && connection.preset === agent.id);
    return <button type="button" className="ai-service-choice" key={agent.id} onClick={() => exists ? select(exists) : chooseAgent(agent)}>
      <AiBrandMark brand={agentBrand(agent.id)} size={25} /><span><strong>{agent.name}</strong><small>{exists ? "已添加" : agent.installed ? "已检测到 · 可连接" : agent.host_installed ? "已检测到 · 连接时准备组件" : "需要先安装并登录"}</small></span><ChevronRight size={15} aria-hidden="true" />
    </button>;
  }

  return <section className="credential-card ai-connections-settings" aria-labelledby={`${id}-title`}>
    <div className="ai-connections-heading"><div><h3 id={`${id}-title`}>AI 服务</h3><p>用已登录的本机 Agent，或连接自己的模型 API。</p></div>
      {!draft && saved.length && !adding ? <button type="button" className="app-button secondary" onClick={() => { setAdding(true); setNotice(""); }}><Plus size={14} aria-hidden="true" />添加服务</button> : null}
    </div>
    {!catalog && !error ? <p className="ai-settings-loading" role="status"><Loader2 size={15} className="reader-ai-spin" />正在读取服务…</p> : null}
    {catalog && !draft ? <>
      {saved.length ? <div className="ai-saved-services" aria-label="已添加的 AI 服务">{saved.map((connection) => {
        const state = results[connection.id];
        return <button type="button" className="ai-saved-service" key={connection.id} onClick={() => select(connection)}>
          <AiBrandMark brand={aiConnectionBrand(connection)} size={27} /><span><strong>{aiConnectionName(connection)}</strong><small>{state && !state.ready ? "需要检查连接" : connection.kind === "byoa" ? "使用本机登录" : connection.model}</small></span>
          <span className={`ai-service-state${state?.ready ? " is-ready" : ""}`}>{state?.ready ? <Check size={12} aria-hidden="true" /> : null}{state?.ready ? "已连接" : connection.kind === "byok" && !connection.api_key_configured && !connection.legacy_inherited ? "待配置" : "已添加"}</span><ChevronRight size={15} aria-hidden="true" />
        </button>;
      })}</div> : null}
      {adding || !saved.length ? <div className={`ai-service-chooser${saved.length ? " has-saved" : ""}`}>
        <div className="ai-service-chooser-head"><div className="ai-service-tabs" role="tablist" aria-label="添加 AI 服务的方式">
          <button type="button" role="tab" aria-selected={tab === "byoa"} aria-controls={`${id}-agents`} id={`${id}-agent-tab`} onClick={() => setTab("byoa")}>本机 Agent</button>
          <button type="button" role="tab" aria-selected={tab === "byok"} aria-controls={`${id}-apis`} id={`${id}-api-tab`} onClick={() => setTab("byok")}>模型 API</button>
        </div>{saved.length ? <button type="button" className="ai-service-text-button" onClick={() => setAdding(false)}>完成</button> : null}</div>
        {tab === "byoa" ? <div id={`${id}-agents`} role="tabpanel" aria-labelledby={`${id}-agent-tab`}>
          <p className="ai-service-intro">复用你已安装的 Agent 和登录，无需另外填写 API Key。</p>
          {detected.length ? <div className="ai-service-choices">{detected.map(agentRow)}</div> : <p className="ai-service-empty">还没有检测到本机 Agent。选择下方的 Agent 查看连接方式，或使用模型 API。</p>}
          <details className="ai-service-all" open={!detected.length || undefined}><summary>浏览全部 {catalog.presets.length} 种 Agent</summary><div className="ai-service-choices">{others.map(agentRow)}</div></details>
          <button type="button" className="ai-service-text-button ai-service-custom" onClick={() => chooseAgent()}><Plus size={13} />添加自定义 ACP Agent</button>
        </div> : <div id={`${id}-apis`} role="tabpanel" aria-labelledby={`${id}-api-tab`}>
          <p className="ai-service-intro">选择服务商，填写 API Key，再选择一个对话模型。</p>
          <div className="ai-service-choices">{AI_PROVIDERS.map((item) => <button type="button" className="ai-service-choice" key={item.id} onClick={() => chooseProvider(item)}>
            <AiBrandMark brand={item.brand} size={25} /><span><strong>{item.name}</strong><small>{item.id === "custom" ? "兼容 OpenAI 或 Anthropic 的接口" : "使用自己的 API Key"}</small></span><ChevronRight size={15} aria-hidden="true" />
          </button>)}</div>
        </div>}
      </div> : null}
    </> : null}
    {draft ? <div className="ai-service-editor">
      <button type="button" className="ai-service-back" disabled={locked} onClick={() => dirty ? setLeaving(true) : closeEditor()}><ArrowLeft size={14} />{saved.length ? "所有服务" : "选择其他服务"}</button>
      {leaving ? <div className="ai-service-confirm" role="alert"><span>有未保存的修改。</span><button type="button" onClick={() => setLeaving(false)}>继续编辑</button><button type="button" onClick={closeEditor}>放弃修改</button></div> : null}
      <div className="ai-service-identity"><AiBrandMark brand={aiConnectionBrand(draft)} size={32} /><div><h4>{draft.kind === "byoa" ? preset?.name || "自定义 Agent" : provider?.name}</h4><p>{draft.kind === "byoa" ? preset ? preset.installed || preset.host_installed ? "已检测到本机 Agent，连接后复用现有登录。" : "请先在本机安装并登录，再回来连接。" : "连接支持 ACP 的本机程序。" : "API Key 仅保存在本机，模型可在每次对话中切换。"}</p></div></div>
      <div className="ai-service-form">
        {draft.kind === "byok" ? <>
          {provider?.id === "custom" ? <label className="ai-service-field"><span>服务地址</span><input aria-label="服务地址" type="url" value={draft.base_url} placeholder="https://api.example.com/v1" disabled={locked} onChange={(event) => update({ base_url: event.target.value })} /></label> : null}
          <label className="ai-service-field"><span>API Key{provider?.keyUrl ? <a href={provider.keyUrl} target="_blank" rel="noreferrer">获取 Key<ArrowUpRight size={12} /></a> : null}</span>
            <SecretInput aria-label="API Key" secretLabel="API Key" value={key} disabled={locked || clearKey} autoComplete="off" placeholder={draft.api_key_configured || (draft.legacy_inherited && hasModelApiKey()) ? "已保存，留空保留" : "粘贴服务商提供的 API Key"} onChange={(event) => { setKey(event.target.value); setDirty(true); modelRequest.current++; setModelLoading(false); setModelNotice(""); }} />
          </label>
          <div className="ai-service-field"><div className="ai-service-field-label"><span>对话模型</span><button type="button" className="ai-service-text-button" disabled={locked || modelLoading || clearKey} onClick={() => void fetchModels()}>{modelLoading ? <Loader2 size={12} className="reader-ai-spin" /> : <RefreshCw size={12} />}读取模型</button></div>
            <AiModelSelect value={draft.model} items={[...new Set([draft.model, ...modelNames.split(/[\n,]/)])].filter(Boolean)} onChange={(model) => update({ model })} disabled={locked} loading={modelLoading} onRefresh={() => void fetchModels()} />
            {modelNotice ? <p className="ai-service-field-hint" role="status">{modelNotice}</p> : null}
          </div>
        </> : preset ? <div className="ai-service-agent-guide">
          <p>{needsInstall ? "这个连接会使用你本机的 Agent。安装并完成登录后，点击下方按钮重新检测。" : preset.installed ? "连接会检查登录状态并读取可用模型，不会发送对话请求。" : "首次连接会自动准备所需的连接组件，然后读取登录状态和可用模型。"}</p>
          {needsInstall ? <a href="https://docs.agentero.app/frontend/settings/#_4" target="_blank" rel="noreferrer">查看安装与登录说明<ArrowUpRight size={13} /></a> : null}
          {preset.hint ? <details><summary>登录提示</summary><p>{preset.hint}</p></details> : null}
        </div> : <label className="ai-service-field"><span>程序路径</span><input aria-label="Agent 程序路径" value={draft.command} disabled={locked} onChange={(event) => update({ command: event.target.value })} placeholder="可执行程序的名称或完整路径" /></label>}
        <details className="ai-service-advanced"><summary>高级设置</summary><div className="ai-service-advanced-fields">
          <label className="ai-service-field"><span>显示名称</span><input aria-label="服务显示名称" value={draft.name} disabled={locked} onChange={(event) => update({ name: event.target.value })} /></label>
          {draft.kind === "byok" ? <>
            <label className="ai-service-field"><span>API 协议</span><select aria-label="API 协议" value={draft.api_protocol} disabled={locked} onChange={(event) => update({ api_protocol: event.target.value as ApiProtocol })}>{Object.entries(API_PROTOCOL_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            {provider?.id !== "custom" ? <label className="ai-service-field"><span>服务地址</span><input type="url" aria-label="服务地址" value={draft.base_url} disabled={locked} onChange={(event) => update({ base_url: event.target.value })} /></label> : null}
            <label className="ai-service-field"><span>自定义模型列表 <small>每行一个</small></span><textarea aria-label="自定义模型列表" rows={3} value={modelNames} disabled={locked} onChange={(event) => { setModelNames(event.target.value); setDirty(true); }} /></label>
            {draft.api_key_configured ? <label className="ai-service-clear-key"><input type="checkbox" checked={clearKey} disabled={locked} onChange={(event) => { setClearKey(event.target.checked); setDirty(true); }} />清除已保存的 API Key</label> : null}
          </> : <>
            {preset ? <label className="ai-service-field"><span>程序路径</span><input aria-label="Agent 程序路径" value={draft.command} disabled={locked} onChange={(event) => update({ command: event.target.value })} /></label> : null}
            <label className="ai-service-field"><span>启动参数 <small>JSON 数组</small></span><textarea aria-label="Agent 启动参数" rows={2} value={args} disabled={locked} onChange={(event) => { setArgs(event.target.value); setDirty(true); }} /></label>
            <label className="ai-service-field"><span>工作目录 <small>可选</small></span><input aria-label="Agent 工作目录" value={draft.cwd} disabled={locked} onChange={(event) => update({ cwd: event.target.value })} /></label>
            <label className="ai-service-field"><span>环境变量 <small>JSON 对象</small></span><textarea aria-label="Agent 环境变量" rows={2} value={environment} disabled={locked} onChange={(event) => { setEnvironment(event.target.value); setDirty(true); }} placeholder="{}" /><small>留空保留已存值；删除某项时，将它的值设为空字符串。{draft.env_names?.length ? ` 已保存：${draft.env_names.join("、")}` : ""}</small></label>
          </>}
        </div></details>
      </div>
      {probe?.auth_methods?.length && !probe.ready ? <div className="ai-service-auth"><p>需要先完成 Agent 登录。可以在原 CLI 登录，也可使用以下方式：</p>{probe.auth_methods.map((method) => <button type="button" className="app-button secondary" key={method.id} disabled={locked} onClick={async () => {
        setBusy("auth"); setError("");
        try { await authenticateAiConnection(draft.id, method.id); setNotice("已完成认证请求，请重新连接。"); }
        catch (err) { setError((err as Error).message); }
        finally { setBusy(""); }
      }}>{method.name}</button>)}</div> : null}
      <div className="ai-service-editor-actions">
        {needsInstall ? <button type="button" className="app-button" disabled={locked} onClick={async () => { setBusy("scan"); setError(""); try { setCatalog(await fetchAiConnections()); setNotice("检测已更新。"); } catch (err) { setError((err as Error).message); } finally { setBusy(""); } }}><RefreshCw size={14} />重新检测</button>
          : <button type="button" className="app-button" disabled={locked || modelLoading} onClick={() => void save()}>{locked ? <Loader2 size={14} className="reader-ai-spin" /> : null}{busy === "save" ? "正在保存…" : busy === "verify" ? "正在连接…" : draft.kind === "byok" ? "保存并验证" : `连接${preset ? ` ${preset.name}` : " Agent"}`}</button>}
        {draft.kind === "byok" ? <span className="ai-service-action-hint">验证会发送一次简短的模型请求</span> : null}
        {draft.id && draft.id !== "legacy" ? <button type="button" className="ai-service-remove" disabled={locked} onClick={() => setDeleting(!deleting)}><Trash2 size={13} />移除</button> : null}
      </div>
      {deleting ? <div className="ai-service-confirm" role="alert"><span>移除「{draft.name}」？已有对话会保留。</span><button type="button" onClick={() => setDeleting(false)}>保留</button><button type="button" disabled={locked} onClick={() => void remove()}>确认移除</button></div> : null}
    </div> : null}
    {notice ? <p className={`ai-service-notice${!draft && !busy ? " is-ready" : ""}`} role="status">{busy ? <Loader2 size={14} className="reader-ai-spin" /> : !draft ? <Check size={14} /> : null}{notice}</p> : null}
    {error ? <p className="ai-service-error" role="alert">{error}{!catalog ? <button type="button" className="ai-service-text-button" onClick={() => { setError(""); void fetchAiConnections().then(setCatalog).catch((err) => setError(err.message)); }}>重试</button> : null}</p> : null}
  </section>;
}
