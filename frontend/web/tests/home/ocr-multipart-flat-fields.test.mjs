import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {
  location: {
    search: "",
    protocol: "http:",
    hostname: "127.0.0.1",
    origin: "http://127.0.0.1:40001",
  },
};

const { submitJobRequest } = await import("@retainpdf/api/jobs-submit");

function stubXhr(onSend) {
  const previousXhr = globalThis.XMLHttpRequest;
  globalThis.XMLHttpRequest = class {
    constructor() {
      this.status = 200;
      this.response = { data: { job_id: "job-ocr" } };
      this.upload = { addEventListener() {} };
      this.listeners = {};
    }
    open() {}
    setRequestHeader(name, value) {
      this.requestHeaders = { ...(this.requestHeaders || {}), [name]: value };
    }
    addEventListener(name, callback) {
      this.listeners[name] = callback;
    }
    send(form) {
      onSend(form, this.requestHeaders || {});
      this.listeners.load();
    }
  };
  return () => {
    globalThis.XMLHttpRequest = previousXhr;
  };
}

test("OCR multipart 携带 runtime 空闲超时字段 no_output_timeout_seconds", async () => {
  let submittedForm = null;
  const restore = stubXhr((form) => {
    submittedForm = form;
  });
  try {
    await submitJobRequest("/api/v1", {
      workflow: "ocr",
      source: { upload_id: "upload-ocr" },
      ocr: { provider: "paddle", credential_ref: "cred_saved_ocr" },
      runtime: { timeout_seconds: 120, no_output_timeout_seconds: 30 },
    });
    assert.equal(submittedForm.get("timeout_seconds"), "120");
    assert.equal(submittedForm.get("no_output_timeout_seconds"), "30");
  } finally {
    restore();
  }
});

test("旧扁平字段仍被拒绝：no_output_timeout_seconds 不能出现在顶层", async () => {
  await assert.rejects(
    submitJobRequest("/api/v1", {
      workflow: "book",
      source: { upload_id: "upload-1" },
      no_output_timeout_seconds: 30,
    }),
    /no_output_timeout_seconds/,
  );
});
