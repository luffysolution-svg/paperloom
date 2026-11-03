import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("", { url: "http://localhost/index.html" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const storage = await import("../../src/platform/config/storage.ts");
const persisted = await import("../../src/platform/config/persisted-config.ts");
const { backupApi } = await import("../../src/platform/api/domains/backups.ts");
const { restoreBackupClientConfig } = await import("../../src/platform/config/backup-client-config.ts");
let reply = null;
const calls = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url, init });
  return new Response(JSON.stringify({ data: reply }), { headers: { "Content-Type": "application/json" } });
};

test("local and WebDAV backups include all local model settings only with opt in", async () => {
  storage.writeBrowserStoredConfig({ ocrProvider: "mineru", paddleToken: "paddle", mineruToken: "mineru", modelApiKey: "translation" });
  storage.writeDeveloperStoredConfig({ model: "model", translationProfiles: { custom: { apiKey: "profile" } } });
  for (const create of [backupApi.create, backupApi.backupRemote]) {
    await create(false);
    assert.equal(JSON.parse(calls.at(-1).init.body).frontend_config, undefined);
    await create(true);
    const config = JSON.parse(calls.at(-1).init.body).frontend_config;
    assert.equal(config.browser_config.mineruToken, "mineru");
    assert.equal(config.browser_config.paddleToken, "paddle");
    assert.equal(config.browser_config.modelApiKey, "translation");
    assert.equal(config.developer_config.translationProfiles.custom.apiKey, "profile");
  }
});

test("completed restores hydrate local credentials once and preserve subsequent edits", async () => {
  reply = { restored_at: "restore-1", config: {
    browser_config: { ocrProvider: "paddle", paddleToken: "restored-ocr", modelApiKey: "restored-translation" },
    developer_config: { baseUrl: "https://example.com/v1", model: "restored-model", translationProfiles: { custom: { apiKey: "restored-profile" } } },
  } };
  await restoreBackupClientConfig();
  assert.equal(persisted.loadBrowserStoredConfig().paddleToken, "restored-ocr");
  assert.equal(persisted.loadBrowserStoredConfig().modelApiKey, "restored-translation");
  assert.equal(persisted.loadDeveloperStoredConfig().translationProfiles.custom.apiKey, "restored-profile");
  storage.writeBrowserStoredConfig({ paddleToken: "edited" });
  assert.equal(await restoreBackupClientConfig(), null);
  assert.equal(persisted.loadBrowserStoredConfig().paddleToken, "edited");
  reply.restored_at = "restore-2";
  await restoreBackupClientConfig();
  assert.equal(persisted.loadBrowserStoredConfig().paddleToken, "restored-ocr");
  reply = null;
  assert.equal(await restoreBackupClientConfig(), null);
  assert.equal(persisted.loadBrowserStoredConfig().paddleToken, "restored-ocr");
});
