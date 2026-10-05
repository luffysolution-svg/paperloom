import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const { createDesktopConfigStore } = require("./desktop-config.js");

test("builds the complete runtime config for the active backend port", () => {
  const app = {
    getPath() {
      throw new Error("runtime config construction must not touch the filesystem");
    },
  };
  const store = createDesktopConfigStore(app, { desktopApiKey: "desktop-test-key" });
  store.setBackendApiPort(41234);

  const runtimeConfig = store.buildDesktopRuntimeConfig({
    ocrProvider: "paddle",
    ocrCredentialRef: "cred_ocr",
    translationCredentialRef: "cred_translation",
    mineruToken: "mineru-token",
    paddleToken: "paddle-token",
    modelApiKey: "model-key",
    model: "model-name",
    baseUrl: "https://model.example/v1",
    developerConfig: { trace: true },
  });

  assert.deepEqual(runtimeConfig, {
    apiBase: "http://127.0.0.1:41234",
    xApiKey: "desktop-test-key",
    ocrProvider: "paddle",
    ocrCredentialRef: "cred_ocr",
    translationCredentialRef: "cred_translation",
    mineruToken: "mineru-token",
    paddleToken: "paddle-token",
    modelApiKey: "model-key",
    model: "model-name",
    baseUrl: "https://model.example/v1",
    developerConfig: { trace: true },
  });
});

test("persists desktop credential values together with backend references", (t) => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "retainpdf-desktop-config-"));
  t.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const store = createDesktopConfigStore({
    getPath(name) {
      assert.equal(name, "userData");
      return userData;
    },
  });

  const saved = store.saveDesktopConfig({
    firstRunCompleted: true,
    ocrProvider: "paddle",
    ocrCredentialRef: "cred_ocr",
    translationCredentialRef: "cred_translation",
    paddleToken: "desktop-ocr",
    modelApiKey: "desktop-model",
  });

  assert.equal(saved.firstRunCompleted, true);
  assert.equal(saved.ocrCredentialRef, "cred_ocr");
  assert.equal(saved.translationCredentialRef, "cred_translation");
  assert.equal(saved.paddleToken, "desktop-ocr");
  assert.equal(saved.modelApiKey, "desktop-model");
  const raw = fs.readFileSync(store.resolveDesktopConfigPath(), "utf8");
  assert.equal(raw.includes("desktop-ocr"), true);
  assert.equal(raw.includes("desktop-model"), true);
});

test("restores desktop values from existing vault references during migration", (t) => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "retainpdf-desktop-vault-migration-"));
  t.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const secretsDir = path.join(userData, "data", "secrets");
  fs.mkdirSync(secretsDir, { recursive: true });
  fs.writeFileSync(path.join(secretsDir, "credentials.json"), JSON.stringify({
    credentials: {
      cred_ocr: { kind: "ocr_provider_token", provider: "paddle", secret: "restored-ocr" },
      cred_translation: { kind: "translation_api_key", secret: "restored-model" },
    },
  }));
  const store = createDesktopConfigStore({
    getPath(name) {
      assert.equal(name, "userData");
      return userData;
    },
  });

  const response = store.buildDesktopConfigResponse({
    firstRunCompleted: true,
    closeToTrayHintShown: false,
    ocrProvider: "paddle",
    ocrCredentialRef: "cred_ocr",
    translationCredentialRef: "cred_translation",
    paddleToken: "",
    modelApiKey: "",
    mineruToken: "",
    model: "model-name",
    baseUrl: "https://model.example/v1",
    developerConfig: {},
  });

  assert.equal(response.browserConfig.paddleToken, "restored-ocr");
  assert.equal(response.browserConfig.modelApiKey, "restored-model");
});

test("MinerU remains independently saved locally and restores only matching legacy tokens", (t) => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "retainpdf-desktop-mineru-"));
  t.after(() => fs.rmSync(userData, { recursive: true, force: true }));
  const secretsDir = path.join(userData, "data", "secrets");
  fs.mkdirSync(secretsDir, { recursive: true });
  fs.writeFileSync(path.join(secretsDir, "credentials.json"), JSON.stringify({
    credentials: {
      cred_mineru: { kind: "ocr_provider_token", provider: "mineru", secret: "legacy-mineru" },
      cred_paddle: { kind: "ocr_provider_token", provider: "paddle", secret: "legacy-paddle" },
    },
  }));
  const store = createDesktopConfigStore({ getPath: () => userData });
  const saved = store.saveDesktopConfig({
    ocrProvider: "mineru", mineruToken: "local-mineru", paddleToken: "local-paddle",
  });
  assert.equal(saved.ocrProvider, "mineru");
  assert.equal(store.loadDesktopConfig().mineruToken, "local-mineru");
  assert.equal(store.loadDesktopConfig().paddleToken, "local-paddle");
  assert.equal(store.buildDesktopConfigResponse({
    ...saved, mineruToken: "", ocrCredentialRef: "cred_mineru",
  }).browserConfig.mineruToken, "legacy-mineru");
  assert.equal(store.buildDesktopConfigResponse({
    ...saved, mineruToken: "", ocrCredentialRef: "cred_paddle",
  }).browserConfig.mineruToken, "");
  assert.equal(store.buildDesktopConfigResponse({
    ...saved, ocrCredentialRef: "cred_mineru",
  }).browserConfig.mineruToken, "local-mineru", "local edits win over legacy values");
});
