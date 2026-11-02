import test from "node:test";
import assert from "node:assert/strict";

globalThis.window ||= {
  location: { protocol: "http:", hostname: "127.0.0.1", search: "" },
  __FRONT_RUNTIME_CONFIG__: { apiBase: "http://127.0.0.1:41000", xApiKey: "test-key" },
};

const { submitJson, submitUploadRequest, refusedSubmissionError, isRefusedSubmission } = await import("@retainpdf/api/http");
const { translateDocument, ocrDocument } = await import("@retainpdf/api/documents");

const payload = (reason) => ({ message: "server diagnostic in English", error: { details: { reason } } });

test("job, resume, document translation and OCR retain actionable resource errors", async () => {
  const original = globalThis.fetch;
  try {
    for (const [status, reason, message] of [
      [503, "insufficient_storage", "磁盘空间不够，删掉一些任务再试。"],
      [429, "queue_full", "任务队列已满，请等待部分任务开始后再试。"],
    ]) {
      globalThis.fetch = async () => new Response(JSON.stringify(payload(reason)), { status, headers: { "Content-Type": "application/json" } });
      for (const action of [
        () => submitJson("http://127.0.0.1:41000/api/v1/jobs", {}),
        () => submitJson("http://127.0.0.1:41000/api/v1/jobs/j1/actions/rerun", {}),
        () => translateDocument("/api/v1", "d1", {}),
        () => ocrDocument("/api/v1", "d1", {}),
      ]) {
        await assert.rejects(action, (error) => error.message === message && error.reason === reason && error.status === status && isRefusedSubmission(error));
      }
    }
  } finally { globalThis.fetch = original; }
});

test("multipart upload uses the structured reason instead of the English message", async () => {
  const original = globalThis.XMLHttpRequest;
  class Xhr {
    status = 503;
    response = payload("insufficient_storage");
    upload = { addEventListener() {} };
    listeners = {};
    open() {}
    setRequestHeader() {}
    addEventListener(name, callback) { this.listeners[name] = callback; }
    send() { this.listeners.load(); }
  }
  globalThis.XMLHttpRequest = Xhr;
  try {
    await assert.rejects(() => submitUploadRequest("http://127.0.0.1:41000/api/v1/uploads", {}),
      { message: "磁盘空间不够，删掉一些任务再试。", reason: "insufficient_storage" });
  } finally { globalThis.XMLHttpRequest = original; }
});

test("ordinary 503 errors are not misidentified as a disk or queue refusal", () => {
  assert.equal(refusedSubmissionError(503, { message: "insufficient_storage" }), null);
  assert.equal(isRefusedSubmission(new Error("disk full")), false);
});

test("submit diagnostics show a resource refusal directly without a failure report", async () => {
  const { reportSubmitError } = await import("../../src/features/ingest/domain/actions/submit/errors.js");
  const writes = [];
  const error = refusedSubmissionError(503, payload("insufficient_storage"));
  reportSubmitError({ err: error, setText: (...args) => writes.push(args) });
  assert.deepEqual(writes, [["error-box", "磁盘空间不够，删掉一些任务再试。"]]);
});
