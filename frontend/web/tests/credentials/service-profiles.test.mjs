import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.CustomEvent = dom.window.CustomEvent;
const { createServiceProfiles } = await import("../../src/features/credentials/domain/service-profiles.js");
const { createCredentialsStatePort } = await import("../../src/features/credentials/domain/state-port.js");
const { loadBrowserStoredConfig } = await import("../../src/platform/config/persisted-config.js");

function fixture({ initialSettings = {}, saveSettings } = {}) {
  let settings = { workflow: "ocr", ...initialSettings };
  let options = { model: "model-a", baseUrl: "https://a.example/v1", workers: 3,
    translationProvider: "custom", translationProfiles: { custom: { apiKey: "translation-a" } } };
  const port = createCredentialsStatePort({ initialState: {
    ocrProvider: "paddle", paddleToken: "paddle-a", mineruToken: "mineru-a", modelApiKey: "translation-a",
  } });
  let applied = 0;
  const deps = {
    getSettings: () => settings,
    getTaskOptions: () => options,
    saveSettings: saveSettings || (async (next) => { settings = { ...settings, ...next }; options = { ...options, ...next }; }),
    credentialsStatePort: port,
    onApply: () => applied++,
  };
  const manager = createServiceProfiles(deps);
  return { manager, deps, port, options, getSettings: () => settings, applied: () => applied };
}

test("save as keeps the old keys and snapshots independent, then switching restores services", async () => {
  const f = fixture();
  await f.manager.save("日常翻译");
  const firstId = f.manager.getState().activeId;
  f.port.patchCredentials({ ocrProvider: "mineru", paddleToken: "paddle-b", mineruToken: "mineru-b", modelApiKey: "translation-b" });
  f.options.model = "model-b";
  f.options.translationProfiles.custom.apiKey = "translation-b";
  await f.manager.save("备用服务");
  const secondId = f.manager.getState().activeId;
  assert.notEqual(secondId, firstId);
  const profiles = f.manager.getState().profiles;
  assert.equal(profiles.length, 2);
  assert.equal(profiles[0].credentials.mineruToken, "mineru-a");
  assert.equal(profiles[0].translation.translationProfiles.custom.apiKey, "translation-a");
  // A fresh controller reads the persisted profile list rather than its own cache.
  const reloaded = createServiceProfiles(f.deps);
  await reloaded.apply(firstId);
  assert.equal(f.port.getCredentials().paddleToken, "paddle-a");
  assert.equal(f.port.getCredentials().mineruToken, "mineru-a");
  assert.equal(loadBrowserStoredConfig().modelApiKey, "translation-a");
  assert.equal(f.getSettings().model, "model-a");
  assert.equal(f.getSettings().workflow, "ocr", "profiles only change service settings");
  assert.equal(reloaded.getState().activeId, firstId);
  assert.equal(f.applied(), 1);
});

test("modify, rename and delete a profile without clearing the current credentials", async () => {
  const f = fixture();
  await f.manager.save("First");
  const id = f.manager.getState().activeId;
  f.port.patchCredentials({ mineruToken: "replaced-key" });
  await f.manager.save("First", id);
  assert.equal(f.manager.getState().profiles.length, 1);
  assert.equal(f.manager.getState().profiles[0].credentials.mineruToken, "replaced-key");
  await f.manager.rename(id, "  新名称  ");
  assert.equal(f.manager.getState().profiles[0].name, "新名称");
  await f.manager.remove(id);
  assert.equal(f.manager.getState().profiles.length, 0);
  assert.equal(f.manager.getState().activeId, "");
  assert.equal(f.port.getCredentials().mineruToken, "replaced-key");
});

test("empty names and deleted profiles report errors", async () => {
  const f = fixture();
  await assert.rejects(f.manager.save("   "), /名称/);
  await assert.rejects(f.manager.apply("removed"), /已删除/);
  assert.equal(f.manager.getState().profiles.length, 0);
});

test("profiles can be created on HTTP origins without crypto.randomUUID", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { value: {}, configurable: true });
  try {
    const f = fixture();
    await f.manager.save("HTTP scheme");
    assert.equal(f.manager.getState().profiles.length, 1);
    assert.ok(f.manager.getState().activeId);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
    else delete globalThis.crypto;
  }
});
