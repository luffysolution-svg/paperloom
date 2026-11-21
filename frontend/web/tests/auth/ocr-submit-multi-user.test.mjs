// 只做 OCR 的任务：单机和多用户都走 POST /jobs（JSON + upload_id），不再用旧入口 /ocr/jobs（multipart）。
import test from "node:test";
import assert from "node:assert/strict";
import { setApiAuthMode } from "../../../packages/api/src/internal/runtime.ts";
import { submitJobRequest } from "../../../packages/api/src/jobs-submit.ts";

const OCR_PAYLOAD = { workflow: "ocr", source: { upload_id: "up-1", file: "blob-placeholder" }, ocr: { provider: "mineru" }, runtime: { timeout_seconds: 1800 }, __file: "x" };
const OCR_JSON = { workflow: "ocr", source: { upload_id: "up-1" }, ocr: { provider: "mineru" }, runtime: { timeout_seconds: 1800 } };

function stubFetch(calls) {
  return async (url, init = {}) => {
    calls.push({ url: `${url}`, init });
    return new Response(JSON.stringify({ code: 0, message: "ok", data: { job_id: "j1" } }), { status: 200, headers: { "content-type": "application/json" } });
  };
}

for (const mode of ["single", "multi"]) {
  test(`${mode}：OCR 走 /jobs 的 JSON，去掉浏览器里的文件字段；没有 upload_id 也没有文件直接报错`, async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = stubFetch(calls);
    try {
      setApiAuthMode(mode);
      await submitJobRequest("/api/v1", OCR_PAYLOAD);
      assert.equal(calls.length, 1);
      assert.match(calls[0].url, /\/api\/v1\/jobs$/);
      assert.deepEqual(JSON.parse(calls[0].init.body), OCR_JSON);
      if (mode === "multi") assert.equal(calls[0].init.credentials, "include");
      await assert.rejects(submitJobRequest("/api/v1", { workflow: "ocr", source: {} }), /请先上传文件/);
      assert.equal(calls.length, 1, "报错前不发请求");
    } finally {
      setApiAuthMode("single");
      globalThis.fetch = originalFetch;
    }
  });
}

test("调用方直接给了文件：先 POST /uploads 拿 upload_id，再 POST /jobs", async () => {
  const originalFetch = globalThis.fetch;
  const originalXhr = globalThis.XMLHttpRequest;
  const calls = [];
  globalThis.fetch = stubFetch(calls);
  // 上传走 XMLHttpRequest（为了报进度），node 里没有，换成一个只回 upload_id 的假实现。
  globalThis.XMLHttpRequest = class {
    constructor() { this.upload = { addEventListener() {} }; this.listeners = {}; }
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader() {}
    addEventListener(name, fn) { this.listeners[name] = fn; }
    send(body) {
      calls.push({ url: this.url, init: { method: this.method, body } });
      this.status = 200;
      this.response = { code: 0, message: "ok", data: { upload_id: "up-direct" } };
      this.listeners.load?.();
    }
  };
  try {
    const file = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    await submitJobRequest("/api/v1", { workflow: "ocr", source: {}, ocr: { provider: "paddle" }, __file: file });
    assert.deepEqual(calls.map((c) => c.url.replace(/^.*\/api\/v1/, "")), ["/uploads", "/jobs"]);
    assert.ok(calls[0].init.body instanceof FormData);
    assert.ok(calls[0].init.body.get("file") instanceof Blob);
    assert.deepEqual(JSON.parse(calls[1].init.body), { workflow: "ocr", source: { upload_id: "up-direct" }, ocr: { provider: "paddle" } });
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.XMLHttpRequest = originalXhr;
  }
});
