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

for (const provider of ["paddle", "mineru"]) test(`${provider} OCR submission sends ocr.credential_ref without token plaintext`, async () => {
  let submitted = null;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    submitted = { url: `${url}`, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ data: { job_id: "job-ocr" } }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    await submitJobRequest("/api/v1", {
      workflow: "ocr",
      source: { upload_id: "upload-ocr" },
      ocr: {
        provider,
        credential_ref: "cred_saved_ocr",
        paddle_token: "",
      },
      runtime: { timeout_seconds: 120, no_output_timeout_seconds: 0 },
    });

    // 和翻译任务一样走 POST /jobs 的 JSON：凭据引用放在 ocr.credential_ref，不带任何令牌明文。
    assert.match(submitted.url, /\/api\/v1\/jobs$/);
    assert.equal(submitted.body.ocr.credential_ref, "cred_saved_ocr");
    assert.equal(submitted.body.ocr.provider, provider);
    assert.ok(!submitted.body.ocr.paddle_token, "没有 paddle 令牌明文");
    assert.ok(!submitted.body.ocr.mineru_token, "没有 mineru 令牌明文");
  } finally {
    globalThis.fetch = previousFetch;
  }
});
