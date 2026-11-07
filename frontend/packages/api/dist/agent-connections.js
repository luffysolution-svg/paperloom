import { API_PREFIX, buildApiHeaders, buildApiUrl, unwrapEnvelope } from "./internal/runtime.js";
export const API_PROTOCOL_LABELS = {
    openai: "OpenAI Chat Completions", openai_responses: "OpenAI Responses", anthropic: "Anthropic Messages",
};
export const AI_CONNECTIONS_CHANGED = "paperloom:ai-connections-changed";
export const AI_SELECTION_CHANGED = "paperloom:ai-selection-changed";
export const AI_AGENT_EVENT = "paperloom:agent-event";
const STORAGE_KEY = "paperloom.ai-selection.v1";
const selections = new Map();
export function loadAiSelection(conversationId = "") {
    // Each open page owns its unsent draft; storage still supplies new pages.
    if (!conversationId && selections.has("draft"))
        return selections.get("draft");
    try {
        const stored = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || "{}");
        const value = stored[conversationId || "draft"];
        if (value?.connectionId) {
            const selection = { connectionId: value.connectionId, model: value.model || "", options: value.options || {} };
            if (!conversationId)
                selections.set("draft", selection);
            return selection;
        }
    }
    catch { /* Storage may be disabled. */ }
    return selections.get(conversationId || "draft") || { connectionId: "", model: "", options: {} };
}
export function saveAiSelection(conversationId, value, { updateDraft = true } = {}) {
    const key = conversationId || "draft";
    selections.set(key, value);
    if (updateDraft)
        selections.set("draft", value);
    try {
        const stored = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || "{}");
        stored[key] = value;
        // A current draft carries the last used connection into a new conversation.
        if (updateDraft)
            stored.draft = value;
        const keys = Object.keys(stored);
        for (const old of keys.slice(0, Math.max(0, keys.length - 300)))
            if (old !== key && old !== "draft")
                delete stored[old];
        globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(stored));
    }
    catch { /* In-memory choices still work. */ }
    if (typeof document !== "undefined")
        document.dispatchEvent(new Event(AI_SELECTION_CHANGED));
}
export function selectionForRequest(conversationId) {
    const selection = loadAiSelection(conversationId);
    return selection.connectionId ? selection : loadAiSelection();
}
async function request(path = "", method = "GET", body) {
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
    return unwrapEnvelope(payload);
}
let cachedCatalog = null;
export const cachedAiConnections = () => cachedCatalog?.connections || [];
function catalogResponse(value) {
    if (!value || !Array.isArray(value.connections) || !Array.isArray(value.presets) || !Number.isInteger(value.revision)) {
        throw new Error("AI 连接服务返回格式不正确，请确认后端已更新。");
    }
    return value;
}
export async function fetchAiConnections() { cachedCatalog = catalogResponse(await request()); return cachedCatalog; }
export async function saveAiConnection(connection, revision) {
    const result = await request("", "PUT", { expected_revision: revision, connection });
    cachedCatalog = catalogResponse(result);
    document.dispatchEvent(new Event(AI_CONNECTIONS_CHANGED));
    return result;
}
export async function removeAiConnection(id, revision) {
    const result = await request(`/${encodeURIComponent(id)}?expected_revision=${revision}`, "DELETE");
    cachedCatalog = catalogResponse(result);
    document.dispatchEvent(new Event(AI_CONNECTIONS_CHANGED));
    return result;
}
export const probeAiConnection = (id, options = {}) => request(`/${encodeURIComponent(id)}/probe`, "POST", options);
export const authenticateAiConnection = (id, method) => request(`/${encodeURIComponent(id)}/authenticate`, "POST", { method_id: method });
export const answerAgentInteraction = (id, answer) => request(`/interactions/${encodeURIComponent(id)}`, "POST", answer);
export function emitAgentEvent(event) {
    if (typeof document !== "undefined")
        document.dispatchEvent(new CustomEvent(AI_AGENT_EVENT, { detail: event }));
}
