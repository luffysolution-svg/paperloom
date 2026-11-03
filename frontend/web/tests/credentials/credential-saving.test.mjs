import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.CustomEvent = dom.window.CustomEvent;
const { createBrowserCredentialSaveFlow } = await import("../../src/features/credentials/domain/save-flow.js");
const { createCredentialsStatePort } = await import("../../src/features/credentials/domain/state-port.js");
const { createTranslationProfiles } = await import("../../src/features/credentials/domain/translation-profiles.js");
const { loadBrowserStoredConfig } = await import("../../src/platform/config/persisted-config.js");

function fixture({ provider = "paddle", initial = {}, setup = false } = {}) {
  const port = createCredentialsStatePort({ initialState: { ...initial, ocrProvider: provider } });
  const elements = {
    paddleInput: { value: "new-paddle" }, mineruInput: { value: "new-mineru" },
    apiKeyInput: { value: "new-translation" }, modelBaseUrlInput: { value: "https://api.deepseek.com/v1" },
    modelNameInput: { value: "fixture-model" }, translationWorkersInput: { value: "5" },
  };
  const elementPort = { elements: () => elements };
  const translation = createTranslationProfiles({ dialogElementsPort: elementPort });
  let options = { translationProvider: "deepseek" };
  const calls = { sync: 0, complete: 0, close: 0, options: 0, statuses: [] };
  const flow = createBrowserCredentialSaveFlow({
    credentialsStatePort: port,
    access: { readCurrentCredentials: port.getCredentials, currentOcrProvider: () => provider },
    translation,
    getTaskOptions: () => options,
    saveTaskOptions: async (next) => { calls.options++; options = next; },
    viewPort: {
      setOcrValidationMessage() {}, setDeepSeekValidationMessage() {},
      setDialogStatus: (message, tone) => calls.statuses.push({ message, tone }),
      closeDialog: () => calls.close++,
    },
    setupModePort: { currentSetupMode: () => setup },
    onSetupComplete: () => calls.complete++,
    dialogElementsPort: elementPort,
    syncBrowserDialogFromCredentialState: () => calls.sync++,
    runtimeEnv: { isDesktopMode: () => false },
  });
  return { port, elements, calls, flow, getOptions: () => options };
}

for (const provider of ["paddle", "mineru"]) {
  test(`first setup preserves both newly entered OCR tokens with ${provider} selected`, async () => {
    const { flow, port, calls } = fixture({ provider, setup: true });
    assert.equal(await flow.handleSave(), true);
    const reloaded = createCredentialsStatePort({ initialState: loadBrowserStoredConfig() }).getCredentials();
    assert.equal(reloaded.paddleToken, "new-paddle");
    assert.equal(reloaded.mineruToken, "new-mineru");
    assert.equal(reloaded.modelApiKey, "new-translation");
    assert.deepEqual(reloaded, port.getCredentials());
    assert.equal(calls.complete, 1);
  });
}

test("saving OCR alone accepts an unfinished translation and leaves its draft and saved key intact", async () => {
  const { flow, port, elements, calls } = fixture({ initial: { modelApiKey: "saved-translation" }, setup: true });
  elements.modelBaseUrlInput.value = "invalid-draft";
  elements.modelNameInput.value = "";
  assert.equal(await flow.handleSave("ocr"), true);
  assert.equal(port.getCredentials().modelApiKey, "saved-translation");
  assert.equal(elements.apiKeyInput.value, "new-translation");
  assert.equal(elements.modelBaseUrlInput.value, "invalid-draft");
  assert.equal(calls.options, 0);
  assert.equal(calls.sync, 0);
  assert.equal(calls.complete, 0);
  assert.equal(calls.close, 0);
});

test("saving translation alone does not require OCR or persist an OCR draft", async () => {
  const { flow, port, elements, calls } = fixture({ setup: true });
  assert.equal(await flow.handleSave("translation"), true);
  assert.equal(port.getCredentials().paddleToken, "");
  assert.equal(port.getCredentials().mineruToken, "");
  assert.equal(elements.paddleInput.value, "new-paddle");
  assert.equal(elements.mineruInput.value, "new-mineru");
  assert.equal(port.getCredentials().modelApiKey, "new-translation");
  assert.equal(calls.options, 1);
  assert.equal(calls.sync, 0);
  assert.equal(calls.complete, 0);
});

test("saving translation with OCR already configured preserves both saved tokens", async () => {
  const { flow } = fixture({ initial: { paddleToken: "saved-paddle", mineruToken: "saved-mineru" } });
  await flow.handleSave("translation");
  const reloaded = loadBrowserStoredConfig();
  assert.equal(reloaded.paddleToken, "saved-paddle");
  assert.equal(reloaded.mineruToken, "saved-mineru");
});

test("blank OCR fields retain saved tokens on a full save", async () => {
  const { flow, elements } = fixture({ initial: { paddleToken: "saved-paddle", mineruToken: "saved-mineru" } });
  elements.paddleInput.value = "";
  elements.mineruInput.value = "";
  await flow.handleSave();
  assert.equal(loadBrowserStoredConfig().paddleToken, "saved-paddle");
  assert.equal(loadBrowserStoredConfig().mineruToken, "saved-mineru");
});
