import test from "node:test";
import assert from "node:assert/strict";

// internal/runtime reads window.__FRONT_RUNTIME_CONFIG__ at call time.
globalThis.window = {
  location: { protocol: "http:", hostname: "127.0.0.1" },
  __FRONT_RUNTIME_CONFIG__: {
    apiBase: "http://127.0.0.1:41000",
    xApiKey: "documents-favorites-key",
  },
};

const { fetchDocumentList, deleteDocument, clearFavorites } = await import("@retainpdf/api/documents");

function okResponse(data) {
  return new Response(JSON.stringify({ code: 0, message: "ok", data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

test("fetchDocumentList 把目录筛选 q 透传后端，空串不发送", async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: `${url}`, options });
    return okResponse({ documents: [], total: 0, limit: 50, offset: 0 });
  };
  try {
    await fetchDocumentList("/api/v1", { q: "量子" });
    await fetchDocumentList("/api/v1", { q: "   " });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(
    calls[0].url,
    "http://127.0.0.1:41000/api/v1/documents?limit=50&offset=0&q=%E9%87%8F%E5%AD%90",
  );
  assert.equal(calls[0].options.headers["X-API-Key"], "documents-favorites-key");
  assert.ok(!calls[1].url.includes("q="), "空白 q 不应带查询参数");
});

test("deleteDocument 保留结构化 DELETE_BLOCKED_BY_FAVORITES 409", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({
      code: "DELETE_BLOCKED_BY_FAVORITES",
      message: "document is referenced by 2 favorite(s); remove the favorites first",
      error: {
        code: "DELETE_BLOCKED_BY_FAVORITES",
        http_status: 409,
        details: {
          scope: "document",
          document_id: "doc-1",
          favorite_count: 2,
          clear_favorites_path: "/api/v1/documents/doc-1/favorites",
        },
      },
    }),
    { status: 409, headers: { "Content-Type": "application/json" } },
  );
  try {
    await assert.rejects(
      deleteDocument("/api/v1", "doc-1"),
      (error) => error.status === 409
        && error.errorCode === "DELETE_BLOCKED_BY_FAVORITES"
        && error.favoriteCount === 2
        && error.favoriteScope === "document"
        && error.clearFavoritesPath === "/api/v1/documents/doc-1/favorites"
        && /2 favorite/.test(error.message),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("clearFavorites 对后端给的 clear_favorites_path 发 DELETE 并返回 deleted_count", async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: `${url}`, options });
    return okResponse({ deleted_count: 2 });
  };
  try {
    const deleted = await clearFavorites("/api/v1", "/api/v1/documents/doc-1/favorites");
    const none = await clearFavorites("/api/v1", "   ");
    assert.equal(deleted, 2);
    assert.equal(none, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 1, "空路径应短路，不发请求");
  assert.equal(calls[0].url, "http://127.0.0.1:41000/api/v1/documents/doc-1/favorites");
  assert.equal(calls[0].options.method, "DELETE");
  assert.equal(calls[0].options.headers["X-API-Key"], "documents-favorites-key");
});
