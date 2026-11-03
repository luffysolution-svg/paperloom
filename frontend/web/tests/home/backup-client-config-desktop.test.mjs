import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("", { url: "http://localhost/index.html" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
let saved = { browserConfig: {}, developerConfig: {} };
const writes = [];
window.retainPdfDesktop = {
  loadDesktopConfig: async () => saved,
  saveDesktopConfig: async (payload) => { writes.push(payload); saved = payload; return payload; },
};
const { loadPersistedConfig } = await import("../../src/platform/config/desktop-persistence.ts");
const { restoreBackupClientConfig, backupClientConfig } = await import("../../src/platform/config/backup-client-config.ts");
globalThis.fetch = async () => new Response(JSON.stringify({ data: { restored_at: "desktop-restore", config: {
  browser_config: { ocrProvider: "mineru", mineruToken: "desktop-ocr", paddleToken: "desktop-paddle", modelApiKey: "desktop-translation" },
  developer_config: { model: "model", baseUrl: "https://example.com/v1", translationProfiles: { custom: { apiKey: "desktop-profile" } } },
} } }), { headers: { "Content-Type": "application/json" } });

test("restored model settings survive a desktop config reload and appear in the next backup", async () => {
  await loadPersistedConfig();
  await restoreBackupClientConfig();
  const reloaded = await loadPersistedConfig();
  assert.equal(reloaded.browserConfig.mineruToken, "desktop-ocr");
  assert.equal(reloaded.browserConfig.paddleToken, "desktop-paddle");
  assert.equal(reloaded.browserConfig.modelApiKey, "desktop-translation");
  assert.equal(reloaded.developerConfig.translationProfiles.custom.apiKey, "desktop-profile");
  assert.equal(backupClientConfig().browser_config.mineruToken, "desktop-ocr");
  const writeCount = writes.length;
  assert.equal(await restoreBackupClientConfig(), null);
  assert.equal(writes.length, writeCount);
});
