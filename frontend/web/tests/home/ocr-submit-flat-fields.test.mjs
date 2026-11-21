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

test("OCR 提交带上 runtime 空闲超时字段 no_output_timeout_seconds", async () => {
  let submitted = null;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    submitted = JSON.parse(init.body);
    return new Response(JSON.stringify({ data: { job_id: "job-ocr" } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    await submitJobRequest("/api/v1", {
      workflow: "ocr",
      source: { upload_id: "upload-ocr" },
      ocr: { provider: "paddle", credential_ref: "cred_saved_ocr" },
      runtime: { timeout_seconds: 120, no_output_timeout_seconds: 30 },
    });
    assert.deepEqual(submitted.runtime, { timeout_seconds: 120, no_output_timeout_seconds: 30 });
  } finally {
    globalThis.fetch = previousFetch;
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
