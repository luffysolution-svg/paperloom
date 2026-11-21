// 磁盘快满时后端拒绝上传、建任务、原地重跑：503 + error.details.reason = "insufficient_storage"，
// message 是英文。各入口都换成一句「磁盘空间不够，删掉一些任务再试。」，界面原样显示、不给诊断。
import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {
  location: { protocol: "http:", hostname: "127.0.0.1" },
  __FRONT_RUNTIME_CONFIG__: { apiBase: "http://127.0.0.1:41000", xApiKey: "storage-key" },
};

const {
  INSUFFICIENT_STORAGE_MESSAGE,
  insufficientStorageErrorFromPayload,
  isInsufficientStorageError,
  isRefusedSubmission,
  submitJson,
  submitUploadRequest,
} = await import("../../../packages/api/src/http.ts");
const { translateDocument, ocrDocument } = await import("../../../packages/api/src/documents.ts");
const { submitJobRequest } = await import("../../../packages/api/src/jobs-submit.ts");
const { resumeJob, retryJobStage } = await import("../../../packages/api/src/jobs-actions.ts");

const STORAGE_BODY = {
  code: 50300,
  message: "not enough free disk space to accept a new job: 512 MiB left on /data, need at least 1024 MiB",
  error: { code: "SERVICE_UNAVAILABLE", details: { reason: "insufficient_storage" } },
};

async function withFetch(status, body, run) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

function assertStorageError(error, what) {
  assert.ok(isRefusedSubmission(error), `${what}：认得出是提交被拒`);
  assert.ok(isInsufficientStorageError(error), `${what}：认得出是磁盘空间不够`);
  assert.equal(error.message, INSUFFICIENT_STORAGE_MESSAGE, `${what}：只有那句中文，不带英文原话、状态码和请求摘要`);
  assert.equal(error.status, 503, what);
  assert.equal(error.reason, "insufficient_storage", what);
}

test("建任务、书的翻译和 OCR、续跑、重试阶段：503 磁盘不够都换成一句中文", async () => {
  await withFetch(503, STORAGE_BODY, async () => {
    const payload = { workflow: "translate", source: { upload_id: "up-1" } };
    assertStorageError(await submitJson("http://127.0.0.1:41000/api/v1/jobs", payload).catch((e) => e), "submitJson");
    assertStorageError(await submitJobRequest("/api/v1", payload).catch((e) => e), "建任务");
    assertStorageError(await translateDocument("/api/v1", "doc-1", {}).catch((e) => e), "书的翻译");
    assertStorageError(await ocrDocument("/api/v1", "doc-1", {}).catch((e) => e), "书的 OCR");
    assertStorageError(await resumeJob("job-1", "/api/v1").catch((e) => e), "续跑");
    assertStorageError(await retryJobStage("job-1", "/api/v1", "render", { mode: "from_stage" }).catch((e) => e), "重试阶段");
  });
});

test("别的 503 照旧：没有这个 reason 时还是「提交失败: 503 后端原话」", async () => {
  await withFetch(503, { code: 50300, message: "jobsd unavailable", error: { code: "SERVICE_UNAVAILABLE" } }, async () => {
    const error = await submitJobRequest("/api/v1", { workflow: "translate", source: { upload_id: "up-1" } }).catch((e) => e);
    assert.ok(!isRefusedSubmission(error));
    assert.match(error.message, /^提交失败: 503 jobsd unavailable/);
  });
  assert.equal(insufficientStorageErrorFromPayload(503, null), null);
});

test("上传：XHR 回 503 磁盘不够也换成那句中文", async () => {
  const original = globalThis.XMLHttpRequest;
  globalThis.XMLHttpRequest = class {
    constructor() {
      this.upload = { addEventListener() {} };
      this.listeners = {};
    }
    open() {}
    setRequestHeader() {}
    addEventListener(name, listener) {
      this.listeners[name] = listener;
    }
    send() {
      this.status = 503;
      this.response = STORAGE_BODY;
      queueMicrotask(() => this.listeners.load());
    }
  };
  try {
    const error = await submitUploadRequest("http://127.0.0.1:41000/api/v1/uploads", {}).catch((e) => e);
    assertStorageError(error, "上传");
    assert.equal(error.url, "http://127.0.0.1:41000/api/v1/uploads");
  } finally {
    globalThis.XMLHttpRequest = original;
  }
});

test("界面：上传页、首页提交不出诊断，书库翻译 / OCR 不改写，任务操作照原话显示", async () => {
  const storage = () => insufficientStorageErrorFromPayload(503, STORAGE_BODY);
  const { reportSubmitError } = await import("../../src/features/ingest/domain/actions/submit/errors.ts");
  const { createDocumentSubmitActions } = await import("../../src/features/library/domain/documents/submit-actions.ts");
  const { describeActionError } = await import("../../src/platform/api/domains/jobs-actions.ts");
  const { mountUploadFeature } = await import("../../src/features/ingest/domain/upload/controller.js");
  const { createUploadStatePort } = await import("../../src/features/ingest/domain/upload/state.js");
  const { createLegacyStateFixture } = await import("../helpers/legacy-state-fixture.mjs");

  const texts = [];
  reportSubmitError({ err: storage(), workflow: "book", apiPrefix: "/api/v1", uploadId: "up-1", setText: (id, text) => texts.push([id, text]) });
  assert.deepEqual(texts, [["error-box", INSUFFICIENT_STORAGE_MESSAGE]]);

  const actions = createDocumentSubmitActions({
    promoteDocumentToJob: () => {},
    translateDocumentApi: async () => { throw storage(); },
    ocrDocumentApi: async () => { throw storage(); },
  });
  for (const run of [() => actions.translateDocument("doc-1"), () => actions.ocrDocument("doc-1")]) {
    const error = await run().catch((e) => e);
    assert.ok(isInsufficientStorageError(error), "保留 reason");
    assert.equal(error.message, INSUFFICIENT_STORAGE_MESSAGE);
  }

  assert.equal(describeActionError(storage()), INSUFFICIENT_STORAGE_MESSAGE);

  const uploadTexts = [];
  const statuses = [];
  const state = createLegacyStateFixture();
  const handler = mountUploadFeature({
    state,
    uploadStatePort: createUploadStatePort(state),
    defaultFileLabel: "选择 PDF",
    apiPrefix: "/api/v1",
    frontMaxBytes: 1024 * 1024,
    frontMaxPageCount: 999,
    countPdfPages: async () => 3,
    collectUploadFormData: () => ({}),
    submitUploadRequest: async () => { throw storage(); },
    resetUploadedFile() {},
    resetUploadProgress() {},
    setUploadProgress() {},
    clearFileInputValue() {},
    setText: (id, text) => uploadTexts.push([id, text]),
    applyWorkflowMode() {},
    refreshSubmitControls() {},
    workflowNeedsUpload: () => true,
    configPort: { buildUploadUrl: () => "http://127.0.0.1:41000/api/v1/uploads" },
    viewPort: {
      clearPageRanges() {},
      closeTranslationOptions() {},
      markUploadReady() {},
      openTranslationOptions() {},
      readPageRanges: () => ({ start: "", end: "" }),
      selectedFile: () => ({ name: "book.pdf", size: 1024 }),
      setFileLabel() {},
      setInlinePageRangeVisible() {},
      showUploadStatus: (message) => statuses.push(message),
      writePageRanges() {},
    },
  });
  await handler.handleFileSelected();
  assert.deepEqual(uploadTexts.at(-1), ["error-box", INSUFFICIENT_STORAGE_MESSAGE]);
  assert.equal(statuses.at(-1), "上传失败");
});
