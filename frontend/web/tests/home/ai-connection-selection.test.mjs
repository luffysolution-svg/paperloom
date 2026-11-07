import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("", { url: "http://localhost" });
for (const key of ["window", "document", "localStorage", "Event", "CustomEvent"]) {
  Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true, writable: true });
}
const { saveAiSelection, loadAiSelection } = await import("@retainpdf/api");
const { askLibraryAi } = await import("@retainpdf/api/ai");
const { normalizeTranslationProfile } = await import("../../src/features/credentials/domain/translation-profile.js");

test("connection/model selections are isolated by conversation and override legacy translation keys", async () => {
  saveAiSelection("conversation-a", { connectionId: "agent-a", model: "agent-model", options: { mode: "ask" } });
  saveAiSelection("conversation-b", { connectionId: "byok-b", model: "api-model", options: {} });
  const requests = [];
  const fetchImpl = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ code: 0, data: { answer: "ok", citations: [] } }), { headers: { "Content-Type": "application/json" } });
  };
  await askLibraryAi({ question: "read", conversationId: "conversation-a", llmApiKey: "translation-key", llmBaseUrl: "https://translation.test", llmModel: "translation-model", fetchImpl });
  await askLibraryAi({ question: "read", conversationId: "conversation-b", fetchImpl });
  assert.equal(requests[0].connection_id, "agent-a");
  assert.equal(requests[0].connection_model, "agent-model");
  assert.deepEqual(requests[0].connection_options, { mode: "ask" });
  assert.equal(Object.hasOwn(requests[0], "llm_api_key"), false);
  assert.equal(Object.hasOwn(requests[0], "llm_base_url"), false);
  assert.equal(requests[1].connection_id, "byok-b");
  assert.equal(loadAiSelection("conversation-a").model, "agent-model");
});

test("changing a selector during an active request leaves the dispatched model fixed", async () => {
  const abort = new AbortController();
  const requests = [];
  saveAiSelection("freeze", { connectionId: "api", model: "first", options: {} });
  let finish;
  const pending = askLibraryAi({ question: "q", conversationId: "freeze", signal: abort.signal, fetchImpl: async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return new Promise((resolve) => { finish = resolve; });
  } });
  saveAiSelection("freeze", { connectionId: "other", model: "second", options: {} });
  finish(new Response(JSON.stringify({ code: 0, data: { answer: "ok" } }), { headers: { "Content-Type": "application/json" } }));
  await pending;
  assert.equal(requests[0].connection_model, "first");
});

test("another window's draft does not replace this page's unsent selection", () => {
  saveAiSelection("", { connectionId: "reader-api", model: "reader-model", options: {} });
  const stored = JSON.parse(localStorage.getItem("paperloom.ai-selection.v1"));
  stored.draft = { connectionId: "other-page-agent", model: "agent-model", options: {} };
  localStorage.setItem("paperloom.ai-selection.v1", JSON.stringify(stored));
  window.dispatchEvent(new window.StorageEvent("storage", { key: "paperloom.ai-selection.v1" }));
  assert.equal(loadAiSelection().connectionId, "reader-api");
});

test("binding a streamed first turn preserves a newer draft choice", async () => {
  saveAiSelection("", { connectionId: "first-api", model: "first-model", options: {} });
  let respond;
  const pending = askLibraryAi({ question: "q", fetchImpl: async () => new Promise((resolve) => { respond = resolve; }) });
  saveAiSelection("", { connectionId: "next-agent", model: "next-model", options: {} });
  const events = [
    { type: "agent_session", conversation_id: "bound-first-turn", agent_runtime: "byok:first-api", assistant_mode: "reading", resolved_mode: "reading", content_source: "structured", capabilities: {} },
    { type: "done", answer: "ok", conversation_id: "bound-first-turn", citations: [] },
  ];
  respond(new Response(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""), { headers: { "Content-Type": "text/event-stream" } }));
  await pending;
  assert.equal(loadAiSelection("bound-first-turn").connectionId, "first-api");
  assert.equal(loadAiSelection().connectionId, "next-agent");
});

test("stop sends an authenticated cancel control request while the SSE response is idle", async () => {
  const abort = new AbortController();
  const urls = [];
  saveAiSelection("cancel-test", { connectionId: "local", model: "", options: {} });
  const pending = askLibraryAi({ question: "q", conversationId: "cancel-test", assistantMessageId: "run-id", signal: abort.signal, fetchImpl: async (url, options) => {
    urls.push(String(url));
    if (String(url).endsWith("/cancel")) return new Response("{}");
    return new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }));
  } });
  abort.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.ok(urls.some((url) => url.endsWith("/connections/runs/run-id/cancel")));
});

test("translation profiles retain each native protocol independently", () => {
  for (const apiProtocol of ["openai", "openai_responses", "anthropic"]) {
    assert.equal(normalizeTranslationProfile("custom", { apiProtocol, baseUrl: "https://example.test/v1", model: "m" }).apiProtocol, apiProtocol);
  }
  assert.equal(normalizeTranslationProfile("custom", {}).apiProtocol, "openai");
});

test("legacy browser credentials carry the native protocol into chat overrides", async () => {
  const { buildHomeAskModelRequestOverrides } = await import("../../src/features/ask/domain/home-ask-request-config.js");
  assert.equal(buildHomeAskModelRequestOverrides({ apiKey: "test", baseUrl: "https://example.test/v1", model: "m", apiProtocol: "anthropic" }).llmApiProtocol, "anthropic");
});
