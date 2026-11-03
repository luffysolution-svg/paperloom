import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.CustomEvent = dom.window.CustomEvent;
let disk = { browserConfig: {}, developerConfig: {} };
window.retainPdfDesktop = {
  loadDesktopConfig: async () => structuredClone(disk),
  saveDesktopConfig: async (payload) => {
    disk = structuredClone(payload);
    return structuredClone(disk);
  },
};
const { loadPersistedConfig } = await import("../../src/platform/config/desktop-persistence.js");
const { loadDeveloperStoredConfig, savePersistedBrowserStoredConfig, savePersistedDeveloperStoredConfig } =
  await import("../../src/platform/config/persisted-config.js");
const { createCredentialsStatePort } = await import("../../src/features/credentials/domain/state-port.js");
const { createServiceProfiles } = await import("../../src/features/credentials/domain/service-profiles.js");

test("both OCR keys and named profiles survive desktop IPC saves and reloads", async () => {
  await loadPersistedConfig();
  const port = createCredentialsStatePort({ initialState: {
    ocrProvider: "mineru", paddleToken: "desktop-paddle-a", mineruToken: "desktop-mineru-a", modelApiKey: "desktop-translation-a",
  } });
  const manager = createServiceProfiles({
    getSettings: loadDeveloperStoredConfig,
    getTaskOptions: () => ({ model: "desktop-model", baseUrl: "https://desktop.example/v1", workers: 5 }),
    saveSettings: (next) => savePersistedDeveloperStoredConfig({ ...loadDeveloperStoredConfig(), ...next }),
    credentialsStatePort: port,
    onApply() {},
  });
  await savePersistedBrowserStoredConfig(port.getCredentials());
  await manager.save("本机主方案");
  const firstId = manager.getState().activeId;
  port.patchCredentials({ paddleToken: "desktop-paddle-b", mineruToken: "desktop-mineru-b", modelApiKey: "desktop-translation-b" });
  await savePersistedBrowserStoredConfig(port.getCredentials());
  await manager.save("本机备用方案");
  let reloaded = await loadPersistedConfig();
  assert.equal(reloaded.browserConfig.paddleToken, "desktop-paddle-b");
  assert.equal(reloaded.browserConfig.mineruToken, "desktop-mineru-b");
  assert.equal(reloaded.developerConfig.serviceProfiles.length, 2);
  assert.equal(reloaded.developerConfig.serviceProfiles[0].credentials.mineruToken, "desktop-mineru-a");
  await manager.apply(firstId);
  reloaded = await loadPersistedConfig();
  assert.equal(reloaded.browserConfig.paddleToken, "desktop-paddle-a");
  assert.equal(reloaded.browserConfig.mineruToken, "desktop-mineru-a");
  assert.equal(reloaded.browserConfig.modelApiKey, "desktop-translation-a");
  assert.equal(reloaded.developerConfig.activeServiceProfileId, firstId);
});
