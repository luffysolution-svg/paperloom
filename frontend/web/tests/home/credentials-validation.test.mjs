import test from "node:test";
import assert from "node:assert/strict";

import {
  runDeepSeekBalanceCheck,
  runDeepSeekConnectivityCheck,
  runOcrTokenValidation,
} from "../../src/features/credentials/domain/validation.js";
import {
  handleBrowserDeepSeekValidate,
} from "../../src/features/credentials/domain/deepseek-flow.js";
import { ensureOcrCredentialValidationReady } from "../../src/features/credentials/domain/ocr-readiness-flow.js";
import {
  browserValidationIdForProvider,
  CREDENTIAL_DOM_DATASETS,
  CREDENTIAL_DOM_IDS,
  CREDENTIAL_DOM_SELECTORS,
} from "../../src/features/credentials/domain/credentials-dom-contract.js";
import { mountBrowserCredentialsFeature } from "../../src/features/credentials/domain/browser.js";
import {
  createCredentialsStatePort,
  hasCompleteCredentials,
  ocrTokenFromCredentials,
} from "../../src/features/credentials/domain/state.js";
import { createUploadStatePort } from "../../src/features/ingest/domain/upload/state.js";
import { createLegacyStateFixture } from "../helpers/legacy-state-fixture.mjs";

function createState() {
  return {
    credentials: {
      ocrValidation: {
        provider: "",
        token: "",
        status: "",
      },
    },
  };
}

test("runOcrTokenValidation passes injected apiPrefix to OCR validation port", async () => {
  const calls = [];
  const messages = [];
  const result = await runOcrTokenValidation({
    apiPrefix: "/custom/api",
    state: createState(),
    providerId: "paddle",
    token: "ocr-token",
    validateOcrToken: async (...args) => {
      calls.push(args);
      return { ok: true, status: "valid", summary: "ok" };
    },
    setOcrValidationMessage: (...args) => messages.push(args),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [["/custom/api", "paddle", "ocr-token"]]);
  assert.equal(messages.at(-1)[1], "valid");
});

test("runOcrTokenValidation writes OCR validation state through credentials state port", async () => {
  const calls = [];
  const result = await runOcrTokenValidation({
    apiPrefix: "/custom/api",
    providerId: "paddle",
    token: "ocr-token",
    validateOcrToken: async () => ({ ok: true, status: "valid", summary: "ok" }),
    setOcrValidationMessage() {},
    credentialsStatePort: {
      resetOcrValidationCache: () => calls.push(["reset"]),
      setOcrValidationCache: (payload) => calls.push(["set", payload]),
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [[
    "set",
    {
      provider: "paddle",
      token: "ocr-token",
      status: "valid",
    },
  ]]);
});

test("runOcrTokenValidation does not call validation port without token", async () => {
  let called = false;
  const calls = [];
  const result = await runOcrTokenValidation({
    apiPrefix: "/custom/api",
    providerId: "paddle",
    token: "",
    validateOcrToken: async () => {
      called = true;
      return { ok: true };
    },
    setOcrValidationMessage() {},
    credentialsStatePort: {
      resetOcrValidationCache: () => calls.push(["reset"]),
      setOcrValidationCache: (payload) => calls.push(["set", payload]),
    },
  });

  assert.equal(result.ok, false);
  assert.equal(called, false);
  assert.deepEqual(calls, [["reset"]]);
});

test("stored OCR credential ref is ready without exposing or revalidating its secret", async () => {
  let validationCalls = 0;
  const result = await ensureOcrCredentialValidationReady({
    apiPrefix: "/api/v1",
    providerId: "paddle",
    credentials: {
      ocrProvider: "paddle",
      ocrCredentialRef: "cred_saved_ocr",
      paddleToken: "",
    },
    defaultPaddleToken: () => "",
    validateOcrToken: async () => {
      validationCalls += 1;
      return { ok: true };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "stored");
  assert.equal(result.credentialRef, "cred_saved_ocr");
  assert.equal(result.token, "");
  assert.equal(validationCalls, 0);
});

test("runDeepSeekConnectivityCheck passes injected apiPrefix and model to DeepSeek validation port", async () => {
  const calls = [];
  const result = await runDeepSeekConnectivityCheck({
    apiPrefix: "/custom/api",
    apiKey: "sk-test",
    baseUrl: "https://example.test/v1",
    model: "deepseek-flash",
    validateDeepSeekToken: async (...args) => {
      calls.push(args);
      return { ok: true, status: 200, summary: "ok" };
    },
    setDeepSeekValidationMessage() {},
  });

  assert.equal(result.ok, true);
  // model 必须随探针一起送到后端：后端据此走 /chat/completions 真调一次模型，
  // 少了它就退化成只验 Key，用户填错模型仍会拿到绿灯。
  assert.deepEqual(calls, [[
    "/custom/api",
    {
      api_key: "sk-test",
      base_url: "https://example.test/v1",
      model: "deepseek-flash",
    },
  ]]);
});

test("runDeepSeekConnectivityCheck marks in-flight state with the pending tone", async () => {
  const tones = [];
  await runDeepSeekConnectivityCheck({
    apiPrefix: "/custom/api",
    apiKey: "sk-test",
    baseUrl: "https://example.test/v1",
    model: "m",
    validateDeepSeekToken: async () => ({ ok: true, summary: "ok" }),
    setDeepSeekValidationMessage(_message, tone) {
      tones.push(tone);
    },
  });

  // 进行中必须是显式 "pending"：检测按钮只认这个语气来禁用自己，
  // 用空 tone 表示进行中会让每条中性提示都把按钮锁死。
  assert.equal(tones[0], "pending");
  assert.equal(tones.at(-1), "valid");
});

test("runDeepSeekConnectivityCheck surfaces the timeout message instead of a generic network error", async () => {
  const messages = [];
  const timeoutError = new Error("检测超时（30s），请检查 API URL 与网络后重试。");
  timeoutError.timedOut = true;

  const result = await runDeepSeekConnectivityCheck({
    apiPrefix: "/custom/api",
    apiKey: "sk-test",
    baseUrl: "https://example.test/v1",
    model: "m",
    validateDeepSeekToken: async () => {
      throw timeoutError;
    },
    setDeepSeekValidationMessage(message) {
      messages.push(message);
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "timeout");
  assert.equal(result.summary, timeoutError.message);
  assert.equal(messages.at(-1), timeoutError.message);
});

test("runDeepSeekConnectivityCheck still reports a generic failure for non-timeout errors", async () => {
  const result = await runDeepSeekConnectivityCheck({
    apiPrefix: "/custom/api",
    apiKey: "sk-test",
    baseUrl: "https://example.test/v1",
    model: "m",
    validateDeepSeekToken: async () => {
      throw new Error("提交失败: 500 boom");
    },
    setDeepSeekValidationMessage() {},
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  // 非超时异常不把原始 HTTP 文案抛给用户。
  assert.ok(!`${result.summary}`.includes("boom"));
});

test("runDeepSeekConnectivityCheck does not call validation port without API key", async () => {
  let called = false;
  const result = await runDeepSeekConnectivityCheck({
    apiPrefix: "/custom/api",
    apiKey: "",
    baseUrl: "https://example.test/v1",
    validateDeepSeekToken: async () => {
      called = true;
      return { ok: true };
    },
    setDeepSeekValidationMessage() {},
  });

  assert.equal(result.ok, false);
  assert.equal(called, false);
});

test("runDeepSeekBalanceCheck passes injected apiPrefix to balance port", async () => {
  const calls = [];
  const result = await runDeepSeekBalanceCheck({
    apiPrefix: "/custom/api",
    apiKey: "sk-test",
    baseUrl: "https://example.test/v1",
    queryDeepSeekBalance: async (...args) => {
      calls.push(args);
      return { ok: true, is_available: true };
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [[
    "/custom/api",
    {
      api_key: "sk-test",
      base_url: "https://example.test/v1",
    },
  ]]);
});

test("handleBrowserDeepSeekValidate writes balance through credentials state port", async () => {
  const calls = [];
  const messages = [];
  const result = await handleBrowserDeepSeekValidate({
    apiPrefix: "/custom/api",
    defaultModelApiKey: () => "sk-test",
    validateDeepSeekToken: async () => ({ ok: true, status: 200 }),
    queryDeepSeekBalance: async () => ({
      ok: true,
      is_available: true,
      balance_infos: [
        { currency: "CNY", total_balance: "3.25" },
      ],
    }),
    onBalanceChange: () => calls.push(["balance-change"]),
    credentialsStatePort: {
      getCredentials: () => ({ modelApiKey: "sk-test" }),
      resetDeepSeekBalance: () => calls.push(["state-reset"]),
      setDeepSeekBalance: (balanceCny, checked) => calls.push(["state-set", balanceCny, checked]),
    },
    viewPort: {
      elements: () => ({
        apiKeyInput: createCredentialNode({ value: "sk-test" }),
        modelBaseUrlInput: createCredentialNode({ value: "" }),
        modelNameInput: createCredentialNode({ value: "deepseek-flash" }),
      }),
      setTopUpVisible: (visible) => calls.push(["top-up", visible]),
      setValidationMessage: (message, tone) => messages.push([message, tone]),
    },
  });

  assert.equal(result.ok, true);
  assert.ok(calls.some((call) => call[0] === "state-reset"));
  assert.ok(calls.some((call) => call[0] === "state-set" && call[1] === 3.25 && call[2] === true));
  assert.deepEqual(messages.at(-1), ["DeepSeek 可用，余额 CNY 3.25", "valid"]);
});

test("third-party translation validation skips DeepSeek-only balance lookup", async () => {
  const calls = [];
  const messages = [];
  const result = await handleBrowserDeepSeekValidate({
    apiPrefix: "/custom/api",
    defaultModelApiKey: () => "sk-test",
    validateDeepSeekToken: async () => ({ ok: true, status: 200 }),
    queryDeepSeekBalance: async () => {
      calls.push(["balance-query"]);
      throw new Error("third-party balance endpoint must not be called");
    },
    credentialsStatePort: {
      getCredentials: () => ({ modelApiKey: "sk-test" }),
      resetDeepSeekBalance: () => calls.push(["state-reset"]),
      setDeepSeekBalance: () => calls.push(["state-set"]),
    },
    viewPort: {
      elements: () => ({
        apiKeyInput: createCredentialNode({ value: "sk-test" }),
        modelBaseUrlInput: createCredentialNode({ value: "https://api.example.com/v1" }),
        modelNameInput: createCredentialNode({ value: "some-model" }),
      }),
      setTopUpVisible: (visible) => calls.push(["top-up", visible]),
      setValidationMessage: (message, tone) => messages.push([message, tone]),
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "unsupported_provider");
  assert.equal(calls.some((call) => call[0] === "balance-query"), false);
  assert.equal(calls.some((call) => call[0] === "state-set"), false);
  assert.deepEqual(messages.at(-1), ["翻译接口可用", "valid"]);
});

test("Qwen translation validation uses connectivity only and reports provider name", async () => {
  const calls = [];
  const messages = [];
  const result = await handleBrowserDeepSeekValidate({
    apiPrefix: "/custom/api",
    defaultModelApiKey: () => "sk-test",
    validateDeepSeekToken: async () => ({ ok: true, status: 200 }),
    queryDeepSeekBalance: async () => {
      calls.push(["balance-query"]);
      throw new Error("Qwen must not call the DeepSeek balance endpoint");
    },
    credentialsStatePort: {
      getCredentials: () => ({ modelApiKey: "sk-test" }),
      resetDeepSeekBalance: () => calls.push(["state-reset"]),
      setDeepSeekBalance: () => calls.push(["state-set"]),
    },
    viewPort: {
      elements: () => ({
        apiKeyInput: createCredentialNode({ value: "sk-test" }),
        modelBaseUrlInput: createCredentialNode({
          value: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        }),
        modelNameInput: createCredentialNode({ value: "qwen3.8-flash" }),
      }),
      setTopUpVisible: (visible) => calls.push(["top-up", visible]),
      setValidationMessage: (message, tone) => messages.push([message, tone]),
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "unsupported_provider");
  assert.equal(calls.some((call) => call[0] === "balance-query"), false);
  assert.equal(calls.some((call) => call[0] === "state-set"), false);
  assert.deepEqual(messages.at(-1), ["Qwen 可用", "valid"]);
});

test("validation without a model name says so instead of claiming a full green light", async () => {
  const messages = [];
  const payloads = [];
  const result = await handleBrowserDeepSeekValidate({
    apiPrefix: "/custom/api",
    defaultModelApiKey: () => "sk-test",
    validateDeepSeekToken: async (_prefix, payload) => {
      payloads.push(payload);
      return { ok: true, status: 200 };
    },
    queryDeepSeekBalance: async () => ({ ok: true, is_available: true, balance_infos: [] }),
    credentialsStatePort: {
      getCredentials: () => ({ modelApiKey: "sk-test" }),
      resetDeepSeekBalance: () => {},
      setDeepSeekBalance: () => {},
    },
    viewPort: {
      elements: () => ({
        apiKeyInput: createCredentialNode({ value: "sk-test" }),
        modelBaseUrlInput: createCredentialNode({ value: "https://api.example.com/v1" }),
        // 模型名留空：后端只能退回 /models 连通性探针
        modelNameInput: createCredentialNode({ value: "" }),
      }),
      setTopUpVisible: () => {},
      setValidationMessage: (message, tone) => messages.push([message, tone]),
    },
  });

  assert.equal(result.ok, true);
  assert.equal(payloads.at(-1).model, "");
  // 覆盖面小于用户以为的"接口可用"时必须如实标注，否则又是一个假绿灯。
  assert.deepEqual(messages.at(-1), ["翻译接口可用（未验证模型）", "valid"]);
});

test("silent balance refresh must not overwrite the visible validation badge", async () => {
  const messages = [];
  const topUpCalls = [];
  const balanceWrites = [];
  await handleBrowserDeepSeekValidate({
    apiPrefix: "/custom/api",
    defaultModelApiKey: () => "sk-test",
    silent: true,
    validateDeepSeekToken: async () => ({ ok: true, status: 200 }),
    queryDeepSeekBalance: async () => ({
      ok: true,
      is_available: true,
      balance_infos: [{ currency: "CNY", total_balance: "0.5" }],
    }),
    credentialsStatePort: {
      getCredentials: () => ({ modelApiKey: "sk-test" }),
      resetDeepSeekBalance: () => {},
      setDeepSeekBalance: (amount, checked) => balanceWrites.push([amount, checked]),
    },
    viewPort: {
      elements: () => ({
        apiKeyInput: createCredentialNode({ value: "sk-test" }),
        modelBaseUrlInput: createCredentialNode({ value: "https://api.deepseek.com/v1" }),
        modelNameInput: createCredentialNode({ value: "deepseek-flash" }),
      }),
      setTopUpVisible: (visible) => topUpCalls.push(visible),
      setValidationMessage: (message, tone) => messages.push([message, tone]),
    },
  });

  // 余额是真值，silent 下仍要落库供上传门禁使用。
  assert.deepEqual(balanceWrites.at(-1), [0.5, true]);
  // 但面向用户的输出必须保持沉默：refreshDeepSeekBalance 默认 silent 且在后台
  // 跑，写这里就会把用户刚点「检测接口」看到的结果悄悄改掉。
  assert.equal(messages.length, 0);
  assert.deepEqual(topUpCalls, [false]);
});

test("low-balance top-up prompt ignores non-CNY balances instead of summing currencies", async () => {
  const balanceWrites = [];
  const topUpCalls = [];
  await handleBrowserDeepSeekValidate({
    apiPrefix: "/custom/api",
    defaultModelApiKey: () => "sk-test",
    validateDeepSeekToken: async () => ({ ok: true, status: 200 }),
    queryDeepSeekBalance: async () => ({
      ok: true,
      is_available: true,
      // 1 CNY + 1.5 USD：按币种直接相加会凑成 2.5 判成"余额充足"。
      balance_infos: [
        { currency: "CNY", total_balance: "1.00" },
        { currency: "USD", total_balance: "1.50" },
      ],
    }),
    credentialsStatePort: {
      getCredentials: () => ({ modelApiKey: "sk-test" }),
      resetDeepSeekBalance: () => {},
      setDeepSeekBalance: (amount) => balanceWrites.push(amount),
    },
    viewPort: {
      elements: () => ({
        apiKeyInput: createCredentialNode({ value: "sk-test" }),
        modelBaseUrlInput: createCredentialNode({ value: "https://api.deepseek.com/v1" }),
        modelNameInput: createCredentialNode({ value: "deepseek-flash" }),
      }),
      setTopUpVisible: (visible) => topUpCalls.push(visible),
      setValidationMessage: () => {},
    },
  });

  // 阈值是「2 元」，只能拿 CNY 档去比：1.00 < 2 应当提示充值。
  assert.equal(balanceWrites.at(-1), 1);
  assert.equal(topUpCalls.at(-1), true);
});

test("credentials DOM contract centralizes hidden inputs and browser dialog ids", () => {
  assert.equal(CREDENTIAL_DOM_IDS.hidden.ocrProvider, "ocr_provider");
  assert.equal(CREDENTIAL_DOM_IDS.hidden.modelApiKey, "api_key");
  assert.equal(CREDENTIAL_DOM_IDS.browser.ocrProviderSelect, "browser-ocr-provider-select");
  assert.equal(CREDENTIAL_DOM_IDS.browser.validations.deepseek, "browser-deepseek-validation");
  assert.equal(browserValidationIdForProvider("paddle"), CREDENTIAL_DOM_IDS.browser.validations.paddle);
  assert.equal(CREDENTIAL_DOM_DATASETS.credentialTab, "credentialTab");
  assert.equal(CREDENTIAL_DOM_SELECTORS.trigger, "#credentials-btn, #credential-gate-action");
});

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
