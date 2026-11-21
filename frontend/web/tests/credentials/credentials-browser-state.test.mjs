// 浏览器凭据：DOM 契约、credentials state port 的真值来源、上传就绪门禁与凭据控制器
// 只经 port 读写。
// 从原 credentials-validation.test.mjs（960+ 行）拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import { CREDENTIAL_DOM_IDS } from "../../src/features/credentials/domain/credentials-dom-contract.js";
import { mountBrowserCredentialsFeature } from "../../src/features/credentials/domain/browser.js";
import {
  createCredentialsStatePort,
  hasCompleteCredentials,
  ocrTokenFromCredentials,
} from "../../src/features/credentials/domain/state.js";
import { createUploadStatePort } from "../../src/features/ingest/domain/upload/state.js";
import { createLegacyStateFixture } from "../helpers/legacy-state-fixture.mjs";

test("credentials state port owns credential source of truth and token helpers", () => {
  const mirrored = [];
  const port = createCredentialsStatePort({
    initialState: {
      ocrProvider: "paddle",
      ocrCredentialRef: "cred_ocr",
      paddleToken: "paddle-token",
      translationCredentialRef: "cred_test",
    },
    mirrorToDom: (snapshot) => mirrored.push(snapshot),
  });

  assert.equal(port.getOcrToken({ providerId: "paddle" }), "paddle-token");
  assert.equal(port.getOcrToken({ providerId: "unknown-provider" }), "paddle-token");
  assert.equal(port.getCredentials().ocrCredentialRef, "cred_ocr");
  assert.equal(port.hasComplete(), true);
  assert.equal(ocrTokenFromCredentials({ ocrProvider: "paddle" }, {
    defaultPaddleToken: () => "paddle-default",
  }), "paddle-default");
  assert.equal(hasCompleteCredentials({ ocrProvider: "paddle", translationCredentialRef: "cred_test" }, {
    defaultPaddleToken: () => "paddle-default",
  }), true);

  port.patchCredentials({ ocrProvider: "bad-provider", paddleToken: "" });

  assert.equal(port.getCredentials().ocrProvider, "paddle");
  assert.equal(port.getCredentials().paddleToken, "");
  assert.equal(mirrored.length, 1);
});

test("credentials state port owns validation and balance runtime state", () => {
  const mirroredRuntime = [];
  const port = createCredentialsStatePort({
    initialState: {
      ocrProvider: "paddle",
      paddleToken: "paddle-token",
      modelApiKey: "sk-test",
    },
    mirrorRuntime: (snapshot) => mirroredRuntime.push(snapshot),
  });

  assert.deepEqual(port.getDeepSeekBalanceState(), {
    balanceCny: null,
    balanceChecked: false,
  });

  port.setDeepSeekBalance("3.5", true);
  assert.deepEqual(port.getDeepSeekBalanceState(), {
    balanceCny: 3.5,
    balanceChecked: true,
  });

  port.setOcrValidationCache({
    provider: "paddle",
    token: "paddle-token",
    status: "valid",
  });

  assert.equal(port.hasValidOcrValidationCache({
    provider: "paddle",
    token: "paddle-token",
  }), true);

  port.resetDeepSeekBalance();
  port.resetOcrValidationCache();

  assert.deepEqual(port.getDeepSeekBalanceState(), {
    balanceCny: null,
    balanceChecked: false,
  });
  assert.equal(port.hasValidOcrValidationCache({
    provider: "paddle",
    token: "paddle-token",
  }), false);
  assert.equal(mirroredRuntime.length, 4);
});

function createClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    toggle(name, force) {
      if (force === undefined ? !values.has(name) : force) {
        values.add(name);
      } else {
        values.delete(name);
      }
    },
    contains: (name) => values.has(name),
  };
}

function createCredentialNode(overrides = {}) {
  return {
    classList: createClassList(),
    dataset: {},
    hidden: false,
    value: "",
    textContent: "",
    title: "",
    addEventListener() {},
    closest() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    ...overrides,
  };
}

test("browser credential gate reads upload readiness from upload state port", () => {
  const previousDocument = global.document;
  const state = createLegacyStateFixture();
  const uploadStatePort = createUploadStatePort(state);
  uploadStatePort.setUpload({
    uploadId: "upload-ready",
    uploadedFileName: "book.pdf",
    uploadedPageCount: 12,
    uploadedBytes: 1024,
  });

  const tileCalls = [];
  const elements = new Map([
    [CREDENTIAL_DOM_IDS.trigger, createCredentialNode()],
    [CREDENTIAL_DOM_IDS.gate, createCredentialNode()],
    [CREDENTIAL_DOM_IDS.file, createCredentialNode({
      closest(selector) {
        return selector === ".upload-tile" ? createCredentialNode() : null;
      },
    })],
    ["upload-glyph", createCredentialNode()],
    ["file-label", createCredentialNode()],
    ["upload-help", createCredentialNode()],
    ["upload-status", createCredentialNode()],
  ]);

  global.document = {
    addEventListener() {},
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector(selector) {
      return selector === ".upload-meta" ? createCredentialNode() : null;
    },
  };

  try {
    const feature = mountBrowserCredentialsFeature({
      apiPrefix: "api/v1",
      state,
      uploadStatePort,
      applyHiddenCredentialInputs() {},
      defaultPaddleToken: () => "",
      defaultModelApiKey: () => "",
      defaultModelBaseUrl: () => "",
      getTaskOptions: () => ({}),
      saveTaskOptions() {},
      saveBrowserStoredConfig() {},
      readHiddenCredentialInputs: () => ({
        ocrProvider: "paddle",
        paddleToken: "paddle",
        modelApiKey: "sk",
      }),
      saveDesktopConfig() {},
      checkApiConnectivity: async () => true,
      validateOcrToken: async () => ({ ok: true }),
      validateDeepSeekToken: async () => ({ ok: true }),
      queryDeepSeekBalance: async () => ({ ok: true, balance_cny: 100 }),
      onCredentialStateChange() {},
      // 旧 DOM 直写 viewPort(browser-view-port.js)已随 cutover 删除;这里内联
      // 复刻其 updateCredentialGate 对 uploadTilePort 的转发语义(镜像旧
      // view.js#updateCredentialGateView 非 desktopMode 分支),不依赖真实 DOM。
      viewPort: {
        bindEvents() {},
        updateCredentialGate: ({ show, uploadEnabled, uploadReady }) => {
          tileCalls.push(["locked", { locked: show || !uploadEnabled, enabled: !show && uploadEnabled }]);
          tileCalls.push(["text", { labelVisible: !show, helpVisible: true, statusVisible: show ? false : null }]);
          tileCalls.push(["ready", !show && uploadEnabled && uploadReady]);
          return true;
        },
      },
      dialogElementsPort: { elements: () => ({}) },
    });

    feature.updateCredentialGate({
      workflowNeedsCredentials: () => false,
      workflowNeedsUpload: () => true,
      refreshSubmitControls() {},
    });

    assert.deepEqual(tileCalls.at(-1), ["ready", true]);
  } finally {
    global.document = previousDocument;
  }
});

test("browser credentials controller routes UI operations through view port", () => {
  const calls = [];
  const state = createLegacyStateFixture();
  const uploadStatePort = createUploadStatePort(state);
  const credentialsStatePort = createCredentialsStatePort({
    initialState: {
      ocrProvider: "paddle",
      paddleToken: "paddle-token",
      modelApiKey: "",
    },
  });
  let boundHandlers = null;
  const feature = mountBrowserCredentialsFeature({
      apiPrefix: "api/v1",
      state,
      uploadStatePort,
      credentialsStatePort,
      applyHiddenCredentialInputs() {},
      defaultPaddleToken: () => "",
      defaultModelApiKey: () => "",
      defaultModelBaseUrl: () => "",
      getTaskOptions: () => ({}),
      saveTaskOptions() {},
      saveBrowserStoredConfig() {},
      readHiddenCredentialInputs: () => credentialsStatePort.getCredentials(),
      saveDesktopConfig() {},
      checkApiConnectivity: async () => true,
      validateOcrToken: async () => ({ ok: true }),
      validateDeepSeekToken: async () => ({ ok: true }),
      queryDeepSeekBalance: async () => ({ ok: true, balance_cny: 100 }),
      onCredentialStateChange() {},
      viewPort: {
        activateTab: (tabName) => calls.push(["tab", tabName]),
        bindEvents: (handlers) => {
          boundHandlers = handlers;
          calls.push(["bind"]);
        },
        closeDialog: () => calls.push(["close"]),
        dialogElements: () => ({ dialog: {} }),
        setDeepSeekTopUpVisible: (visible) => calls.push(["top-up", visible]),
        setDeepSeekValidationMessage: (message, tone) => calls.push(["deepseek-message", message, tone]),
        setDialogMode: ({ setupMode }) => calls.push(["mode", setupMode]),
        setDialogStatus: (message, tone) => calls.push(["status", message, tone]),
        setHiddenOcrProvider: (provider) => calls.push(["hidden-provider", provider]),
        setOcrValidationMessage: (message, tone, provider) => calls.push(["ocr-message", message, tone, provider]),
        syncOcrProviderControls: (provider) => calls.push(["controls", provider]),
        updateCredentialGate: (payload) => {
          calls.push(["gate", payload.show, payload.uploadReady]);
          return true;
        },
      },
      dialogElementsPort: {
        elements: () => ({
          paddleInput: createCredentialNode(),
          apiKeyInput: createCredentialNode(),
          modelBaseUrlInput: createCredentialNode(),
          modelNameInput: createCredentialNode(),
          mathModeSelect: createCredentialNode(),
        }),
        syncOcrProviderControls: (provider) => calls.push(["sync-dialog-controls", provider]),
      },
    });

  feature.prepareCredentialsPanels({ setupMode: true });
  assert.equal(feature.hasOcrCredentials(), true, "仅 OCR 有 token 即满足静态凭据门");
  assert.equal(feature.hasBrowserCredentials(), false, "完整翻译仍要求模型 API Key");
  feature.updateCredentialGate({
    workflowNeedsCredentials: () => true,
    workflowNeedsUpload: () => true,
    hasCredentials: () => feature.hasOcrCredentials(),
    refreshSubmitControls: () => calls.push(["refresh-submit"]),
  });
  boundHandlers.changeProvider({ currentTarget: { value: "unknown-provider" } });

  assert.equal(calls.some(([kind]) => kind === "bind"), true);
  assert.equal(calls.some(([kind, setupMode]) => kind === "mode" && setupMode === true), true);
  assert.equal(calls.some(([kind, show]) => kind === "gate" && show === false), true);
  assert.equal(calls.some(([kind]) => kind === "refresh-submit"), true);
  assert.equal(calls.some(([kind]) => kind === "sync-dialog-controls"), true);
  const hiddenProvider = calls.find(([kind]) => kind === "hidden-provider")?.[1] || "";
  const controlsProvider = calls.find(([kind]) => kind === "controls")?.[1] || "";
  assert.equal(Boolean(hiddenProvider), true);
  assert.equal(controlsProvider, hiddenProvider);
});

test("browser credentials controller reads runtime and balance state through ports", async () => {
  const calls = [];
  const credentialsStatePort = createCredentialsStatePort({
    initialState: {
      ocrProvider: "paddle",
      paddleToken: "paddle-token",
      modelApiKey: "sk-test",
    },
  });
  let boundHandlers = null;
  const feature = mountBrowserCredentialsFeature({
    apiPrefix: "api/v1",
    state: {
      desktopMode: true,
      uploadId: "",
    },
    uploadStatePort: {
      getSnapshot: () => {
        calls.push(["upload-snapshot"]);
        return { uploadId: "port-upload" };
      },
    },
    runtimeEnvPort: {
      isDesktopMode: () => {
        calls.push(["desktop-mode"]);
        return false;
      },
    },
    balanceStatePort: {
      resetDeepSeekBalance: () => calls.push(["balance-reset"]),
    },
    credentialsStatePort,
    applyHiddenCredentialInputs() {},
    defaultPaddleToken: () => "",
    defaultModelApiKey: () => "",
    defaultModelBaseUrl: () => "",
    getTaskOptions: () => ({}),
    saveTaskOptions() {},
    saveBrowserStoredConfig() {},
    readHiddenCredentialInputs: () => credentialsStatePort.getCredentials(),
    saveDesktopConfig() {},
    checkApiConnectivity: async () => true,
    validateOcrToken: async () => ({ ok: true, status: "valid", summary: "ok" }),
    validateDeepSeekToken: async () => ({ ok: true }),
    queryDeepSeekBalance: async () => ({ ok: true, balance_cny: 100 }),
    onCredentialStateChange: () => calls.push(["credential-change"]),
    viewPort: {
      activateTab: (tabName) => calls.push(["tab", tabName]),
      bindEvents: (handlers) => {
        boundHandlers = handlers;
      },
      closeDialog: () => calls.push(["close"]),
      dialogElements: () => ({ dialog: { dataset: {} } }),
      setDeepSeekTopUpVisible: (visible) => calls.push(["top-up", visible]),
      setDeepSeekValidationMessage: (message, tone) => calls.push(["deepseek-message", message, tone]),
      setDialogMode: ({ setupMode }) => calls.push(["mode", setupMode]),
      setDialogStatus: (message, tone) => calls.push(["status", message, tone]),
      setHiddenOcrProvider: () => {},
      setOcrValidationMessage: (message, tone, provider) => calls.push(["ocr-message", message, tone, provider]),
      syncOcrProviderControls: () => {},
      updateCredentialGate: (payload) => {
        calls.push(["gate", payload.desktopMode, payload.uploadReady]);
        return true;
      },
    },
    dialogElementsPort: {
      elements: () => ({
        paddleInput: createCredentialNode({ value: "paddle-token" }),
        apiKeyInput: createCredentialNode({ value: "sk-test" }),
        modelBaseUrlInput: createCredentialNode(),
        modelNameInput: createCredentialNode(),
        mathModeSelect: createCredentialNode(),
      }),
      syncOcrProviderControls: () => {},
    },
  });

  feature.prepareCredentialsPanels();
  feature.updateCredentialGate({
    workflowNeedsCredentials: () => true,
    workflowNeedsUpload: () => true,
    refreshSubmitControls: () => calls.push(["refresh-submit"]),
  });
  await feature.ensureOcrCredentialsReady();
  boundHandlers.resetDeepSeekValidation();

  assert.ok(calls.some((call) => call[0] === "balance-reset"));
  assert.ok(calls.some((call) => call[0] === "upload-snapshot"));
  assert.ok(calls.some((call) => call[0] === "desktop-mode"));
  assert.ok(calls.some((call) => call[0] === "gate" && call[1] === false && call[2] === true));
  assert.ok(calls.some((call) => call[0] === "credential-change"));
});

test("browser credential save falls back to stored model api key when input is blank", async () => {
  const previousWindow = globalThis.window;
  const credentialCalls = [];
  const statuses = [];
  const state = createLegacyStateFixture();
  const credentialsStatePort = createCredentialsStatePort({
    initialState: {
      ocrProvider: "paddle",
      paddleToken: "paddle-token",
      modelApiKey: "existing-key",
    },
  });
  const elements = {
    paddleInput: createCredentialNode({ value: "" }),
    apiKeyInput: createCredentialNode({ value: "" }),
    modelBaseUrlInput: createCredentialNode({ value: "" }),
    modelNameInput: createCredentialNode({ value: "" }),
    translationWorkersInput: createCredentialNode({ value: "" }),
    mathModeSelect: createCredentialNode({ value: "direct_typst" }),
  };
  let boundHandlers = null;
  const feature = mountBrowserCredentialsFeature({
    apiPrefix: "api/v1",
    state,
    credentialsStatePort,
    applyHiddenCredentialInputs() {},
    defaultPaddleToken: () => "",
    defaultModelApiKey: () => "",
    defaultModelBaseUrl: () => "",
    getTaskOptions: () => ({
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-chat",
      workers: 5,
    }),
    saveTaskOptions() {},
    saveBrowserStoredConfig() {},
    readHiddenCredentialInputs: () => credentialsStatePort.getCredentials(),
    saveDesktopConfig() {},
    checkApiConnectivity: async () => true,
    validateOcrToken: async () => ({ ok: true }),
    validateDeepSeekToken: async () => ({ ok: true }),
    queryDeepSeekBalance: async () => ({ ok: true, balance_cny: 100 }),
    listCredentials: async () => ({ revision: 1, credentials: [] }),
    createCredential: async (apiPrefix, payload) => {
      credentialCalls.push(payload);
      return { revision: 1, credential: { credential_ref: `ref-${payload.kind}`, revision: 1 } };
    },
    updateCredential: async (apiPrefix, ref, payload) => {
      credentialCalls.push({ ...payload, credential_ref: ref });
      return { revision: 2, credential: { credential_ref: ref, revision: 2 } };
    },
    onCredentialStateChange() {},
    viewPort: {
      activateTab() {},
      bindEvents: (handlers) => {
        boundHandlers = handlers;
      },
      closeDialog() {},
      dialogElements: () => ({ dialog: { dataset: {} } }),
      setDeepSeekTopUpVisible() {},
      setDeepSeekValidationMessage() {},
      setDialogMode() {},
      setDialogStatus: (message, tone) => statuses.push([message, tone]),
      setHiddenOcrProvider() {},
      setOcrValidationMessage() {},
      syncOcrProviderControls() {},
      updateCredentialGate: () => true,
    },
    dialogElementsPort: {
      elements: () => elements,
      syncOcrProviderControls: () => {},
    },
  });

  globalThis.window = {};
  try {
    await boundHandlers.save();
  } finally {
    globalThis.window = previousWindow;
  }

  assert.equal(credentialCalls.length, 0, "ordinary local saves do not write credentials remotely");
  assert.equal(credentialsStatePort.getCredentials().modelApiKey, "existing-key");
  // 成功文案带时刻（"已保存 HH:MM:SS"）：连续保存时若停在恒定的"已保存"，
  // 屏幕零变化，用户无法判断这次到底存没存。
  const [savedMessage, savedTone] = statuses.at(-1);
  assert.match(savedMessage, /^已保存 \d{2}:\d{2}:\d{2}$/);
  assert.equal(savedTone, "valid");
  // 保存中必须是显式 pending 语气——保存按钮靠它禁用自己。
  assert.ok(
    statuses.some(([message, tone]) => message === "正在保存…" && tone === "pending"),
    "保存过程应先进入 pending 态",
  );
});
