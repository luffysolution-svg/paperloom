import test from "node:test";
import assert from "node:assert/strict";

// 「全部文档」要按页取完：以前库检索只取默认的 50 本、合集只取 500 本，书多了就漏。
globalThis.window = globalThis.window || {
  location: { protocol: "http:", hostname: "127.0.0.1", search: "" },
  __FRONT_RUNTIME_CONFIG__: { apiBase: "http://127.0.0.1:41000", xApiKey: "paging-key" },
};

const { fetchAllDocuments, DOCUMENT_PAGE_LIMIT } = await import("../../src/features/library/domain/documents/fetch-all-documents.js");

function pagedFetcher(total, calls = []) {
  return async ({ limit, offset }) => {
    calls.push({ limit, offset });
    const count = Math.max(0, Math.min(limit, total - offset));
    const documents = Array.from({ length: count }, (_, i) => ({ document_id: `doc-${offset + i}` }));
    return { documents, total, has_more: offset + count < total };
  };
}

test("按 has_more 翻到最后一页，每页用上限 500", async () => {
  const calls = [];
  const docs = await fetchAllDocuments(pagedFetcher(1203, calls));
  assert.equal(docs.length, 1203);
  assert.deepEqual(calls, [
    { limit: DOCUMENT_PAGE_LIMIT, offset: 0 },
    { limit: DOCUMENT_PAGE_LIMIT, offset: 500 },
    { limit: DOCUMENT_PAGE_LIMIT, offset: 1000 },
  ]);
});

test("一页就取完时只发一次请求", async () => {
  const calls = [];
  const docs = await fetchAllDocuments(pagedFetcher(3, calls));
  assert.equal(docs.length, 3);
  assert.equal(calls.length, 1);
});

test("没有 has_more 时按 total 判断；都没有就只取一页", async () => {
  const withTotal = [];
  await fetchAllDocuments(async ({ offset }) => {
    withTotal.push(offset);
    return { documents: offset === 0 ? [{ document_id: "a" }] : [{ document_id: "b" }], total: 2 };
  });
  assert.deepEqual(withTotal, [0, 1]);

  const bare = [];
  await fetchAllDocuments(async ({ offset }) => {
    bare.push(offset);
    return { documents: [{ document_id: `x${offset}` }] };
  });
  assert.deepEqual(bare, [0]);
});

test("翻页期间页错开时按 document_id 去重；空页或 has_more 一直为真也会停", async () => {
  const docs = await fetchAllDocuments(async ({ offset }) => (offset === 0
    ? { documents: [{ document_id: "a" }, { document_id: "b" }], has_more: true }
    : { documents: [{ document_id: "b" }, { document_id: "c" }], has_more: false }));
  assert.deepEqual(docs.map((d) => d.document_id), ["a", "b", "c"]);

  let empty = 0;
  await fetchAllDocuments(async () => { empty += 1; return { documents: [], has_more: true }; });
  assert.equal(empty, 1);

  let stuck = 0;
  await fetchAllDocuments(async ({ offset }) => { stuck += 1; return { documents: [{ document_id: `s${offset}` }], has_more: true }; });
  assert.equal(stuck, 40);
});

test("合集的成员清单翻页取全，第二页带上 collection_id", async () => {
  const urls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    urls.push(`${url}`);
    const offset = Number(new URL(`${url}`).searchParams.get("offset"));
    const count = offset === 0 ? 500 : 20;
    const documents = Array.from({ length: count }, (_, i) => ({ document_id: `d${offset + i}` }));
    return new Response(JSON.stringify({ code: 0, data: { documents, total: 520, limit: 500, offset, has_more: offset === 0 } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const { createCollectionsController } = await import("../../src/features/collections/domain/controller.js");
    const ids = await createCollectionsController({ apiPrefix: "/api/v1" }).listCollectionDocumentIds("col-1");
    assert.equal(ids.length, 520);
    assert.equal(urls.length, 2);
    assert.match(urls[1], /[?&]offset=500(&|$)/);
    assert.match(urls[1], /[?&]collection_id=col-1(&|$)/);
    assert.match(urls[1], /[?&]limit=500(&|$)/);
  } finally {
    globalThis.fetch = original;
  }
});
