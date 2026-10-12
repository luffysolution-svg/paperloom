import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("", { url: "http://app.test/index.html" });
globalThis.window = dom.window;
globalThis.localStorage = dom.window.localStorage;
window.__FRONT_RUNTIME_CONFIG__ = { apiBase: "http://backend.test" };
const { saveBrowserStoredConfig, saveDeveloperStoredConfig } = await import("../../src/platform/config/persisted-config.js");
const { resumeJob, rerunJob, retryJobStage } = await import("../../src/platform/api/domains/jobs-actions.js");
const provider = "https://model.example/CaseSensitive/v1";

test("resume, rerun and stage retry use the newly saved key without changing task options", async () => {
  saveBrowserStoredConfig({ modelApiKey: "replacement-key" });
  saveDeveloperStoredConfig({ baseUrl: `${provider}/` });
  const previousFetch = globalThis.fetch;
  const posts = [];
  globalThis.fetch = async (url, options = {}) => {
    if (options.method === "POST") {
      posts.push({ url: `${url}`, body: JSON.parse(options.body) });
      return new Response(JSON.stringify({ code: 0, data: { job_id: "next" } }), { status: 200 });
    }
    return new Response(JSON.stringify({ code: 0, data: { request_payload: { translation: { base_url: provider, credential_ref: "expired" } } } }), { status: 200 });
  };
  try {
    await resumeJob("job-1", "/api/v1");
    await rerunJob("http://backend.test/api/v1/jobs/job-1/rerun");
    await retryJobStage("job-1", "/api/v1", "translation", { overrides: { translation: { workers: 4 } }, ambiguous_request_policy: "accept_duplicate_risk" });
    assert.deepEqual(posts[0].body, { overrides: { translation: { api_key: "replacement-key" } } });
    assert.deepEqual(posts[1].body, posts[0].body);
    assert.deepEqual(posts[2].body, { stage: "translation", overrides: { translation: { workers: 4, api_key: "replacement-key" } }, ambiguous_request_policy: "accept_duplicate_risk" });
  } finally { globalThis.fetch = previousFetch; }
});

test("explicit credentials and a different provider endpoint are preserved", async () => {
  saveBrowserStoredConfig({ modelApiKey: "replacement-key" });
  saveDeveloperStoredConfig({ baseUrl: "https://different.example/v1" });
  const previousFetch = globalThis.fetch;
  const posts = [];
  globalThis.fetch = async (_url, options = {}) => {
    if (options.method === "POST") {
      posts.push(JSON.parse(options.body));
      return new Response(JSON.stringify({ code: 0, data: {} }), { status: 200 });
    }
    return new Response(JSON.stringify({ code: 0, data: { request_payload: { translation: { base_url: provider } } } }), { status: 200 });
  };
  try {
    await resumeJob("job-1", "/api/v1", { overrides: { translation: { credential_ref: "caller-selected" } } });
    await resumeJob("job-1", "/api/v1");
    assert.deepEqual(posts, [{ overrides: { translation: { credential_ref: "caller-selected" } } }, {}]);
  } finally { globalThis.fetch = previousFetch; }
});

test("a foreign rerun action never receives the locally saved model secret", async () => {
  saveBrowserStoredConfig({ modelApiKey: "replacement-key" });
  saveDeveloperStoredConfig({ baseUrl: provider });
  const previousFetch = globalThis.fetch;
  let body;
  globalThis.fetch = async (_url, options = {}) => {
    body = JSON.parse(options.body);
    return new Response(JSON.stringify({ code: 0, data: {} }), { status: 200 });
  };
  try {
    await rerunJob("https://foreign.example/api/v1/jobs/job-1/rerun");
    assert.deepEqual(body, {});
  } finally { globalThis.fetch = previousFetch; }
});
