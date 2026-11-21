import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {
  location: { protocol: "http:", hostname: "127.0.0.1" },
  __FRONT_RUNTIME_CONFIG__: {
    apiBase: "http://127.0.0.1:41000",
    xApiKey: "translation-debug-key",
  },
};

const {
  fetchTranslationDiagnostics,
  fetchTranslationItem,
  replayTranslationItem,
} = await import("@retainpdf/api/translation-debug");

function notFound(reason) {
  const error = reason ? { code: "NOT_FOUND", details: { reason } } : { code: "NOT_FOUND" };
  return new Response(JSON.stringify({ code: 404, message: "x", error }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

async function withFetch(response, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => response();
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("翻译报告、清单还没产出（404 + not_ready）提示还没生成，不说成找不到", async () => {
  await withFetch(() => notFound("not_ready"), async () => {
    await assert.rejects(fetchTranslationDiagnostics("job-1", "/api/v1"), /还没生成/);
    await assert.rejects(fetchTranslationItem("job-1", "item-1", "/api/v1"), /还没生成/);
    await assert.rejects(replayTranslationItem("job-1", "item-1", "/api/v1"), /还没生成/);
  });
});

test("不带 reason 的 404 照旧是找不到", async () => {
  await withFetch(() => notFound(""), async () => {
    await assert.rejects(fetchTranslationDiagnostics("job-1", "/api/v1"), /未找到翻译调试信息/);
    await assert.rejects(fetchTranslationItem("job-1", "item-1", "/api/v1"), /未找到该翻译 item，请确认/);
    await assert.rejects(replayTranslationItem("job-1", "item-1", "/api/v1"), /无法重放/);
  });
});
