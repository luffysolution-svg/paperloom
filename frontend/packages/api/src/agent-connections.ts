import { API_PREFIX, buildApiHeaders, buildApiUrl, unwrapEnvelope } from "./internal/runtime.js";

export type ApiProtocol = "openai" | "openai_responses" | "anthropic";
export const API_PROTOCOL_LABELS: Record<ApiProtocol, string> = {
  openai: "OpenAI Chat Completions", openai_responses: "OpenAI Responses", anthropic: "Anthropic Messages",
};
export type AiConnection = {
  id: string; name: string; kind: "byok" | "byoa"; api_protocol: ApiProtocol;
  base_url: string; model: string; models: string[]; api_key_configured?: boolean; api_key?: string | null;
  preset: string; command: string; args: string[]; env?: Record<string, string>; env_names?: string[]; cwd: string;
  legacy_inherited?: boolean;
  provider?: string;
};
export type AgentPreset = { id: string; name: string; command: string; args: string[]; host: string; install: string; hint: string; installed: boolean; host_installed: boolean; can_prepare?: boolean };
export type AgentConfigOption = { id: string; name: string; description?: string; category?: string; currentValue: string; type: string; options: ({ value: string; name: string } | { group: string; name: string; options: { value: string; name: string }[] })[] };
export type AiConnectionCatalog = { revision: number; connections: AiConnection[]; presets: AgentPreset[] };
export type AiConnectionProbe = { ready: boolean; status: string; message: string; models?: string[]; config_options?: AgentConfigOption[]; capabilities?: Record<string, any>; auth_methods?: { id: string; name: string; description?: string; type?: string; args?: string[]; env?: Record<string, string> }[] };
export type AiConnectionSelection = { connectionId: string; model: string; options: Record<string, string> };
export const AI_CONNECTIONS_CHANGED = "paperloom:ai-connections-changed";
export const AI_SELECTION_CHANGED = "paperloom:ai-selection-changed";
export const AI_AGENT_EVENT = "paperloom:agent-event";
const STORAGE_KEY = "paperloom.ai-selection.v1";
const selections = new Map<string, AiConnectionSelection>();

export function loadAiSelection(conversationId = ""): AiConnectionSelection {
  // Each open page owns its unsent draft; storage still supplies new pages.
  if (!conversationId && selections.has("draft")) return selections.get("draft")!;
  try {
    const stored = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || "{}");
    const value = stored[conversationId || "draft"];
    if (value?.connectionId) {
      const selection = { connectionId: value.connectionId, model: value.model || "", options: value.options || {} };
      if (!conversationId) selections.set("draft", selection);
      return selection;
    }
  } catch { /* Storage may be disabled. */ }
  return selections.get(conversationId || "draft") || { connectionId: "", model: "", options: {} };
}

export function saveAiSelection(conversationId: string, value: AiConnectionSelection, { updateDraft = true } = {}) {
  const key = conversationId || "draft";
  selections.set(key, value);
  if (updateDraft) selections.set("draft", value);
  try {
    const stored = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || "{}");
    stored[key] = value;
    // A current draft carries the last used connection into a new conversation.
    if (updateDraft) stored.draft = value;
    const keys = Object.keys(stored);
    for (const old of keys.slice(0, Math.max(0, keys.length - 300))) if (old !== key && old !== "draft") delete stored[old];
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch { /* In-memory choices still work. */ }
  if (typeof document !== "undefined") document.dispatchEvent(new Event(AI_SELECTION_CHANGED));
}

export function selectionForRequest(conversationId: string): AiConnectionSelection {
  const selection = loadAiSelection(conversationId);
  return selection.connectionId ? selection : loadAiSelection();
}

async function request<T>(path = "", method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(buildApiUrl(API_PREFIX, `ai/connections${path}`), {
    method, headers: buildApiHeaders({ "Content-Type": "application/json" }), cache: "no-store",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(method === "POST" ? 135_000 : 30_000),
  });
  const payload = await response.json();
  if (!response.ok) {
    const detail = payload?.detail;
    const message = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((v) => v.msg).join("；") : detail?.message || payload?.message;
    throw new Error(message || `连接请求失败 (${response.status})`);
  }
  return unwrapEnvelope<T>(payload);
}

let cachedCatalog: AiConnectionCatalog | null = null;
export const cachedAiConnections = () => cachedCatalog?.connections || [];
function catalogResponse(value: AiConnectionCatalog): AiConnectionCatalog {
  if (!value || !Array.isArray(value.connections) || !Array.isArray(value.presets) || !Number.isInteger(value.revision)) {
    throw new Error("AI 连接服务返回格式不正确，请确认后端已更新。");
  }
  return value;
}
export async function fetchAiConnections() { cachedCatalog = catalogResponse(await request<AiConnectionCatalog>()); return cachedCatalog; }
export async function saveAiConnection(connection: AiConnection, revision: number) {
  const result = await request<AiConnectionCatalog>("", "PUT", { expected_revision: revision, connection });
  cachedCatalog = catalogResponse(result);
  document.dispatchEvent(new Event(AI_CONNECTIONS_CHANGED));
  return result;
}
export async function removeAiConnection(id: string, revision: number) {
  const result = await request<AiConnectionCatalog>(`/${encodeURIComponent(id)}?expected_revision=${revision}`, "DELETE");
  cachedCatalog = catalogResponse(result);
  document.dispatchEvent(new Event(AI_CONNECTIONS_CHANGED));
  return result;
}
export const probeAiConnection = (id: string, options: { prepare?: boolean; fresh?: boolean; models_only?: boolean } = {}) => request<AiConnectionProbe>(`/${encodeURIComponent(id)}/probe`, "POST", options);
export const authenticateAiConnection = (id: string, method: string) => request<AiConnectionProbe>(`/${encodeURIComponent(id)}/authenticate`, "POST", { method_id: method });
export const fetchAiAuthentication = (id: string) => request<AiConnectionProbe>(`/${encodeURIComponent(id)}/authenticate`);
export const cancelAiAuthentication = (id: string) => request<AiConnectionProbe>(`/${encodeURIComponent(id)}/authenticate`, "DELETE");
export const fetchAgentInteractions = (id: string) => request<any[]>(`/interactions?conversation_id=${encodeURIComponent(id)}`);
export const fetchActiveAiRuns = (id: string) => request<{ run_id: string; elapsed_ms: number }[]>(`/runs?conversation_id=${encodeURIComponent(id)}`);
export const cancelAiRun = (id: string) => request(`/runs/${encodeURIComponent(id)}/cancel`, "POST");
export const answerAgentInteraction = (id: string, answer: Record<string, unknown>) => request(`/interactions/${encodeURIComponent(id)}`, "POST", answer);

export function emitAgentEvent(event: Record<string, unknown>) {
  if (typeof document !== "undefined") document.dispatchEvent(new CustomEvent(AI_AGENT_EVENT, { detail: event }));
}
