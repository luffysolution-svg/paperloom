// 多用户模式的上传页：模型和 OCR 由平台统一配，浏览器里没有 Key 也能点「直接翻译」，
// 不出「请先配置接口」提示条，不查本机 DeepSeek 余额，提交前也不跑本机 provider 预检。
// 以前按钮一直是灰的（「请先完成接口设置后再提交」），普通用户根本提交不了。
import test from "node:test";
import assert from "node:assert/strict";
import { setApiAuthMode } from "@retainpdf/api/http";
import { createWorkflowModeController } from "../../src/features/ingest/domain/workflow/workflow-mode.ts";
import { startSubmitPreflight } from "../../src/features/ingest/domain/actions/submit/preflight.ts";
import { workflowConstants } from "../../src/features/ingest/domain/workflow-config.ts";

function makeController({ balanceCalls }) {
  const states = [];
  const gates = [];
  const controller = createWorkflowModeController({
    constants: workflowConstants(),
    developerConfigWithDefaults: () => ({ workflow: "book", renderSourceJobId: "" }),
    isOcrOnlyMode: () => false,
    getDeveloperConfig: () => ({}),
    getUploadState: () => ({ uploadId: "up-1", uploadedPageCount: 10 }),
    getDeepSeekBalanceState: () => { balanceCalls.push(1); return { balanceCny: 0, balanceChecked: true }; },
    currentPageRanges: () => "",
    defaultModelBaseUrl: () => "https://api.deepseek.com/v1",
    configPort: { isMock: () => false, mockScenario: () => "" },
    isDesktopMode: () => false,
    viewPort: {
      setSubmitControls: (state) => states.push(state),
      renderBudgetNote: () => {},
    },
    renderPageRangeSummary: () => {},
    defaultFileLabel: () => "",
    normalizeWorkflow: (w) => w,
    hasBrowserCredentials: () => false,
    updateCredentialGatePort: (port) => gates.push(port.hasCredentials()),
    loadGlossaryOptions: () => {},
  });
  return { controller, states, gates };
}

test("浏览器里没有 Key：单机照旧拦着；多用户能点、不出接口提示、不查本机余额", () => {
  try {
    setApiAuthMode("single");
    let balanceCalls = [];
    let { controller, states } = makeController({ balanceCalls });
    controller.refreshSubmitControls();
    assert.equal(states.at(-1).disabled, true, "单机缺 Key 照旧拦");

    setApiAuthMode("multi");
    balanceCalls = [];
    ({ controller, states } = makeController({ balanceCalls }));
    controller.refreshSubmitControls();
    assert.equal(states.at(-1).disabled, false, "多用户：直接能提交");
    assert.equal(balanceCalls.length, 0, "多用户不查本机 DeepSeek 余额");
  } finally {
    setApiAuthMode("single");
  }
});

test("多用户：提交前不跑本机 DeepSeek 余额 / OCR Token 预检，也就不弹误导提示", async () => {
  const calls = [];
  const options = {
    workflow: "book",
    workflowNeedsUpload: () => true,
    workflowNeedsCredentials: () => true,
    currentBudgetState: () => { calls.push("budget"); return { visible: true, blocking: true, message: "余额不足" }; },
    refreshDeepSeekBalance: async () => { calls.push("balance"); },
    ensureOcrCredentialsReady: async () => { calls.push("ocr"); return false; },
    notifyPreflightWarning: (message) => calls.push(`warn:${message}`),
  };
  try {
    setApiAuthMode("multi");
    await startSubmitPreflight(options);
    assert.deepEqual(calls, []);
  } finally {
    setApiAuthMode("single");
  }
});
