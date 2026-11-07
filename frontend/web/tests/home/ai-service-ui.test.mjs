import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/index.html" });
for (const key of ["window", "document", "DocumentFragment", "Element", "SVGElement", "HTMLElement", "HTMLButtonElement", "HTMLInputElement", "CustomEvent", "Event", "KeyboardEvent", "MouseEvent", "Node", "MutationObserver", "NodeFilter", "localStorage"]) {
  Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true, writable: true });
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { AiConnectionsSettings } = await import("../../src/features/credentials/ui/AiConnectionsSettings.js");
const { AiConnectionPicker, AI_PROVIDERS, isVisibleAiConnection, aiConnectionName } = await import("@retainpdf/reader/ai");
const { loadAiSelection } = await import("@retainpdf/api");
const base = { id: "", name: "", kind: "byok", api_protocol: "openai", base_url: "https://api.deepseek.com/v1", model: "", models: [], preset: "custom", command: "", args: [], cwd: "" };
const legacy = { ...base, id: "legacy", name: "现有模型连接", legacy_inherited: true, api_key_configured: false };
const connection = { ...base, id: "deepseek", name: "DeepSeek", model: "chat-model", models: ["chat-model", "reasoning-model"], api_key_configured: true };
const catalog = { revision: 0, connections: [legacy], presets: [{ id: "codex-acp", name: "Codex", command: "codex-acp", host: "codex", args: [], installed: false, host_installed: true, hint: "", can_prepare: true }] };
const wait = () => new Promise((resolve) => setTimeout(resolve, 20));
async function until(predicate) { for (let i = 0; i < 100; i++) { if (predicate()) return; await wait(); } assert.fail(`Timed out: ${document.body.textContent}`); }
const button = (text) => [...document.querySelectorAll("button")].find((node) => node.textContent.trim() === text);
function fill(element, value) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
  setter.call(element, value); element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}
async function mount(element) { const host = document.createElement("div"); document.body.append(host); const root = createRoot(host); root.render(element); await wait(); return { root, host }; }

test("first run starts with recognizable choices and keeps technical fields out of the ordinary flow", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ code: 0, data: catalog }));
  const { root, host } = await mount(React.createElement(AiConnectionsSettings));
  try {
    await until(() => button("本机 Agent"));
    assert.equal(host.textContent.includes("现有模型连接"), false);
    assert.match(host.textContent, /已检测到/);
    button("模型 API").click(); await wait();
    button("DeepSeek使用自己的 API Key").click(); await wait();
    assert.ok(host.querySelector(".ai-service-identity .reader-ai-brand img"));
    assert.equal(host.querySelector("details.ai-service-advanced").open, false);
    assert.ok(host.querySelector("[aria-label='API Key']"));
    assert.ok(host.querySelector("[aria-label='选择默认模型']"));
    assert.equal(host.querySelector("datalist"), null);
    assert.equal(host.querySelector("[aria-label='API 协议']").closest("details").open, false);
    fill(host.querySelector("[aria-label='API Key']"), "draft-test-key"); await wait();
    button("选择其他服务").click(); await wait();
    assert.match(host.textContent, /有未保存的修改/);
    button("继续编辑").click(); await wait();
    assert.equal(host.querySelector("[aria-label='API Key']").value, "draft-test-key");
  } finally { root.unmount(); host.remove(); }
});

test("one composer menu searches without persisting keystrokes, then commits an explicit model choice", async () => {
  let selection = { connectionId: connection.id, model: "", options: { mode: "ask" } };
  const changes = [];
  const controller = { catalog, connections: [connection], selected: connection, selection, options: [], loading: false, error: "", change: (next) => { selection = next; changes.push(next); } };
  const { root, host } = await mount(React.createElement(AiConnectionPicker, { controller }));
  try {
    host.querySelector("button").click();
    await until(() => document.querySelector("[aria-label='搜索模型']"));
    assert.equal(document.activeElement?.getAttribute("aria-label"), "搜索模型");
    fill(document.querySelector("[aria-label='搜索模型']"), "reasoning"); await wait();
    assert.equal(changes.length, 0);
    assert.equal(document.querySelector("datalist"), null);
    const item = [...document.querySelectorAll("[role=option]")].find((node) => node.textContent === "reasoning-model");
    assert.ok(item); item.click(); await wait();
    assert.equal(changes.length, 1);
    assert.equal(selection.model, "reasoning-model");
    assert.deepEqual(selection.options, { mode: "ask" });
    assert.equal(document.querySelector(".reader-ai-service-menu"), null);
  } finally { root.unmount(); host.remove(); }
});

test("editing a saved endpoint never fetches models from its previous configuration", async () => {
  const requests = [];
  globalThis.fetch = async (url) => { requests.push(String(url)); return new Response(JSON.stringify({ code: 0, data: { ...catalog, connections: [connection] } })); };
  const { root, host } = await mount(React.createElement(AiConnectionsSettings));
  try {
    await until(() => host.querySelector(".ai-saved-service"));
    host.querySelector(".ai-saved-service").click(); await wait();
    host.querySelector(".ai-service-advanced summary").click();
    fill(host.querySelector("[aria-label='服务地址']"), "https://new-service.test/v1"); await wait();
    button("读取模型").click(); await wait();
    assert.match(host.querySelector(".ai-service-field-hint").textContent, /服务地址或协议已修改/);
    assert.equal(requests.some((url) => url.endsWith("/probe")), false);
  } finally { root.unmount(); host.remove(); }
});

test("custom model names require explicit confirmation and generation locks the selector", async () => {
  const changes = [];
  const controller = { catalog, connections: [connection], selected: connection, selection: { connectionId: connection.id, model: "", options: {} }, options: [], loading: false, error: "", change: (next) => changes.push(next) };
  const { root, host } = await mount(React.createElement(AiConnectionPicker, { controller }));
  try {
    host.querySelector("button").click(); await until(() => document.querySelector("[aria-label='搜索模型']"));
    fill(document.querySelector("[aria-label='搜索模型']"), "my-custom-model"); await wait();
    assert.equal(changes.length, 0);
    document.querySelector(".reader-ai-model-custom").click(); await wait();
    assert.equal(changes[0].model, "my-custom-model");
    root.render(React.createElement(AiConnectionPicker, { controller, disabled: true })); await wait();
    assert.equal(host.querySelector("button").disabled, true);
  } finally { root.unmount(); host.remove(); }
});

test("service identity preserves legacy credentials and all three native protocols", () => {
  assert.equal(isVisibleAiConnection(legacy), false);
  assert.equal(isVisibleAiConnection(legacy, true), true);
  assert.equal(aiConnectionName(legacy), "DeepSeek");
  assert.equal(AI_PROVIDERS.find((p) => p.id === "openai").protocol, "openai_responses");
  assert.equal(AI_PROVIDERS.find((p) => p.id === "anthropic").protocol, "anthropic");
  assert.equal(AI_PROVIDERS.find((p) => p.id === "deepseek").protocol, "openai");
  assert.equal(loadAiSelection("unrelated").connectionId, "");
});
