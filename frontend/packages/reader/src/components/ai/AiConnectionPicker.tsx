import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Popover } from "radix-ui";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw, Settings2 } from "lucide-react";
import {
  AI_AGENT_EVENT, AI_CONNECTIONS_CHANGED, AI_SELECTION_CHANGED,
  fetchAiConnections, probeAiConnection, saveAiSelection, selectionForRequest,
  type AgentConfigOption, type AiConnectionCatalog, type AiConnectionSelection,
} from "@retainpdf/api";
import { hasModelApiKey, CREDENTIALS_CHANGED_EVENT } from "../../shared/ai/config.js";
import { aiConnectionBrand, aiConnectionName, isVisibleAiConnection } from "../../shared/ai/service-presets.js";
import { AiBrandMark } from "./AiBrandMark.js";
import { AiModelList, type AiModelItem } from "./AiModelSelect.js";

const ComposerControl = createContext<ReactNode>(null);
export const AiComposerControlProvider = ComposerControl.Provider;
export const useAiComposerControl = () => useContext(ComposerControl);
const optionCache = new Map<string, AgentConfigOption[]>();
const capabilityCache = new Map<string, Record<string, any>>();
export function rememberAgentOptions(id: string, options: AgentConfigOption[], capabilities?: Record<string, any>) {
  optionCache.set(id, options);
  if (capabilities) capabilityCache.set(id, capabilities);
  document.dispatchEvent(new CustomEvent(AI_AGENT_EVENT, { detail: { type: "agent_connection", connection_id: id, config_options: options, capabilities } }));
}

function initialSelection(id: string): AiConnectionSelection {
  const current = selectionForRequest(id);
  return current.connectionId ? current : { connectionId: "legacy", model: "", options: {} };
}

export function useAiConnection(conversationId: string, locked = false) {
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  const [catalog, setCatalog] = useState<AiConnectionCatalog | null>(null);
  const [selection, setSelection] = useState(() => initialSelection(conversationId));
  const [options, setOptions] = useState<AgentConfigOption[]>([]);
  const [capabilities, setCapabilities] = useState<Record<string, any> | undefined>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [browserKey, setBrowserKey] = useState(hasModelApiKey);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      setLoading(true); setBrowserKey(hasModelApiKey());
      void fetchAiConnections().then((next) => { if (active) { setCatalog(next); setError(""); } })
        .catch((err) => { if (active) setError(err.message || "无法读取 AI 服务"); })
        .finally(() => { if (active) setLoading(false); });
    };
    refresh();
    document.addEventListener(AI_CONNECTIONS_CHANGED, refresh);
    document.addEventListener(CREDENTIALS_CHANGED_EVENT, refresh);
    return () => { active = false; document.removeEventListener(AI_CONNECTIONS_CHANGED, refresh); document.removeEventListener(CREDENTIALS_CHANGED_EVENT, refresh); };
  }, []);
  useEffect(() => {
    setSelection(initialSelection(conversationId));
    const refresh = () => { if (!lockedRef.current) setSelection(initialSelection(conversationId)); };
    document.addEventListener(AI_SELECTION_CHANGED, refresh);
    window.addEventListener("storage", refresh);
    return () => { document.removeEventListener(AI_SELECTION_CHANGED, refresh); window.removeEventListener("storage", refresh); };
  }, [conversationId]);
  useEffect(() => { if (!locked && conversationId) setSelection(initialSelection(conversationId)); }, [locked, conversationId]);
  const connections = catalog?.connections.filter((item) => isVisibleAiConnection(item, browserKey)) || [];
  const selected = connections.find((item) => item.id === selection.connectionId);
  useEffect(() => {
    if (!catalog || selection.connectionId !== "legacy" || selected) return;
    const first = catalog.connections.find((item) => isVisibleAiConnection(item, browserKey) && (item.kind === "byoa" || item.api_key_configured));
    if (first) saveAiSelection(conversationId, { connectionId: first.id, model: "", options: {} });
  }, [catalog, selection.connectionId, selected, browserKey, conversationId]);
  useEffect(() => {
    setOptions(optionCache.get(selection.connectionId) || []);
    setCapabilities(capabilityCache.get(selection.connectionId));
    const update = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.type !== "agent_connection" || detail.connection_id !== selection.connectionId) return;
      if (detail.conversation_id && detail.conversation_id !== conversationId) return;
      const next = detail.config_options || [];
      optionCache.set(selection.connectionId, next); setOptions(next);
      if (detail.capabilities) { capabilityCache.set(selection.connectionId, detail.capabilities); setCapabilities(detail.capabilities); }
    };
    document.addEventListener(AI_AGENT_EVENT, update);
    return () => document.removeEventListener(AI_AGENT_EVENT, update);
  }, [selection.connectionId, conversationId]);
  const configured = Boolean(selected && (selected.kind === "byoa" || selected.api_key_configured || (selected.legacy_inherited && browserKey)));
  return { catalog, connections, selection, selected, options, capabilities, error, loading, configured, blocked: Boolean(catalog && !configured),
    change: (next: AiConnectionSelection) => { setSelection(next); saveAiSelection(conversationId, next); } };
}

function optionItems(option?: AgentConfigOption): AiModelItem[] {
  return option?.options.flatMap((item) => "group" in item ? item.options.map((value) => ({ ...value, group: item.name })) : [item]) || [];
}

export function AiConnectionPicker({ controller, disabled = false, onManage }: {
  controller: ReturnType<typeof useAiConnection>; disabled?: boolean; onManage?: () => void;
}) {
  const { connections, selected, selection, options, change, loading, error } = controller;
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<"models" | "services" | "settings">("models");
  const [optionId, setOptionId] = useState("");
  const [probing, setProbing] = useState(false);
  const [notice, setNotice] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const modelOption = options.find((item) => item.category === "model");
  const model = selection.model || selected?.model || modelOption?.currentValue || "";
  const modelLabel = optionItems(modelOption).find((item) => item.value === model)?.name || model || "默认模型";
  const extraOptions = options.filter((item) => item !== modelOption && item.type === "select");
  const currentOption = extraOptions.find((item) => item.id === optionId);
  const models = selected?.kind === "byoa" ? optionItems(modelOption)
    : [...new Set([selected?.model, ...(selected?.models || [])])].filter((value): value is string => Boolean(value)).map((value) => ({ value, name: value }));
  const manage = onManage || (() => {
    if (document.getElementById("home-root")) document.dispatchEvent(new CustomEvent("retainpdf:open-browser-credentials"));
    else { const home = new URL("index.html", window.location.href); home.searchParams.set("settings", "api"); window.location.assign(home.href); }
  });
  useEffect(() => { setNotice(""); setOptionId(""); }, [selection.connectionId]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => {
    if (open && page === "models") menuRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [open, page, selection.connectionId]);
  async function probe(connection = selected) {
    if (!connection || probing) return;
    setProbing(true); setNotice("");
    try {
      const result = await probeAiConnection(connection.id);
      rememberAgentOptions(connection.id, result.config_options || [], result.capabilities);
      if (!result.ready) setNotice(result.message);
    } catch (err) { setNotice((err as Error).message); }
    finally { setProbing(false); }
  }
  return <div className="reader-ai-connection-control">
    <Popover.Root open={open} onOpenChange={(next) => {
      setOpen(next); setPage(selected ? "models" : "services"); setOptionId("");
      if (next && selected?.kind === "byoa" && !options.length) void probe();
    }}>
      <Popover.Trigger className="reader-ai-service-trigger" type="button" disabled={disabled || loading}
        aria-label={selected ? `切换 AI 服务与模型，当前 ${aiConnectionName(selected)}，${modelLabel}` : "添加 AI 服务"}>
        {loading ? <Loader2 size={15} className="reader-ai-spin" aria-hidden="true" /> : selected ? <AiBrandMark brand={aiConnectionBrand(selected)} size={17} /> : <Plus size={15} aria-hidden="true" />}
        <span className="reader-ai-service-name">{selected ? aiConnectionName(selected) : loading ? "读取服务…" : "选择 AI 服务"}</span>
        {selected ? <><span className="reader-ai-service-dot" aria-hidden="true">·</span><span className="reader-ai-service-model" title={modelLabel}>{modelLabel}</span></> : null}
        <ChevronDown size={12} className="reader-ai-service-chevron" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal><Popover.Content ref={menuRef} className="reader-ai-service-menu" align="start" side="top" sideOffset={8} collisionPadding={12} aria-label="AI 服务与模型"
        onOpenAutoFocus={(event) => { if (page === "models") { event.preventDefault(); menuRef.current?.querySelector<HTMLInputElement>("input")?.focus(); } }}>
        {page === "services" ? <>
          <div className="reader-ai-menu-head">{selected ? <button className="reader-ai-menu-icon" type="button" aria-label="返回模型选择" onClick={() => setPage("models")}><ChevronLeft size={16} /></button> : null}<strong>选择 AI 服务</strong></div>
          <div className="reader-ai-service-rows" role="listbox" aria-label="已连接的 AI 服务">
            {connections.map((connection) => <button type="button" role="option" aria-selected={selected?.id === connection.id} className="reader-ai-service-row" key={connection.id} onClick={() => {
              change({ connectionId: connection.id, model: "", options: {} }); setPage("models");
              if (connection.kind === "byoa" && !optionCache.has(connection.id)) void probe(connection);
            }}><AiBrandMark brand={aiConnectionBrand(connection)} size={23} /><span><strong>{aiConnectionName(connection)}</strong><small>{connection.kind === "byoa" ? "使用本机登录" : connection.model || "模型 API"}</small></span>{selected?.id === connection.id ? <Check size={15} aria-hidden="true" /> : null}</button>)}
            {!connections.length ? <p className="reader-ai-menu-empty">连接本机 Agent 或模型 API 后，就可以开始对话。</p> : null}
          </div>
        </> : page === "settings" ? <>
          <div className="reader-ai-menu-head"><button type="button" className="reader-ai-menu-icon" aria-label="返回模型选择" onClick={() => { setPage("models"); setOptionId(""); }}><ChevronLeft size={16} /></button><strong>{currentOption?.name || "对话设置"}</strong></div>
          {currentOption ? <AiModelList key={currentOption.id} items={optionItems(currentOption)} value={selection.options[currentOption.id] ?? currentOption.currentValue} defaultLabel="" onSelect={(value) => { change({ ...selection, options: { ...selection.options, [currentOption.id]: value } }); setOptionId(""); }} /> : extraOptions.map((option) => <button key={option.id} type="button" className="reader-ai-menu-action" onClick={() => setOptionId(option.id)}><span>{option.name}</span><small>{optionItems(option).find((item) => item.value === (selection.options[option.id] ?? option.currentValue))?.name}</small><ChevronRight size={14} /></button>)}
          {!currentOption ? <button type="button" className="reader-ai-menu-action" disabled={probing} onClick={() => void probe()}><RefreshCw size={14} className={probing ? "reader-ai-spin" : ""} /><span>{probing ? "正在读取…" : "重新读取 Agent 配置"}</span></button> : null}
        </> : <>
          <button type="button" className="reader-ai-menu-current" onClick={() => setPage("services")}>
            {selected ? <AiBrandMark brand={aiConnectionBrand(selected)} size={24} /> : null}<span><strong>{selected ? aiConnectionName(selected) : "选择 AI 服务"}</strong><small>切换服务</small></span><ChevronRight size={15} aria-hidden="true" />
          </button>
          <AiModelList key={selection.connectionId} items={models} value={selection.model} defaultLabel={selected?.kind === "byoa" ? "Agent 默认模型" : selected?.model ? `默认 · ${selected.model}` : "服务默认模型"}
            defaultValue={selected?.kind === "byok" ? selected.model : undefined}
            allowCustom={selected?.kind === "byok"} loading={probing} onSelect={(value) => { change({ ...selection, model: value }); setOpen(false); }} />
          {selected?.kind === "byoa" ? <button type="button" className="reader-ai-menu-action reader-ai-menu-divider" onClick={() => setPage("settings")}><Settings2 size={14} /><span>对话设置</span><ChevronRight size={14} /></button> : null}
        </>}
        {error || notice ? <p className="reader-ai-menu-notice" role="status">{error || notice}</p> : null}
        <button type="button" className="reader-ai-menu-action reader-ai-menu-divider" onClick={() => { setOpen(false); manage(); }}><Plus size={14} aria-hidden="true" /><span>{connections.length ? "管理 AI 服务" : "添加 AI 服务"}</span></button>
      </Popover.Content></Popover.Portal>
    </Popover.Root>
  </div>;
}
