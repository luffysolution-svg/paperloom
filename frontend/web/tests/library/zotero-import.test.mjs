import test from "node:test";
import assert from "node:assert/strict";

const calls = [];
let nextResponse = { status: 200, body: {} };
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: `${url}`, init });
  return new Response(JSON.stringify(nextResponse.body), {
    status: nextResponse.status,
    headers: { "Content-Type": "application/json" },
  });
};

const { listZoteroItems, importZoteroAttachments, writeTranslatedPdfToZotero, writeDocumentsToZotero } = await import(
  "../../src/platform/api/domains/zotero.ts"
);
const { orderCollections, runZoteroImport } = await import(
  "../../src/features/zotero/domain/import-flow.ts"
);

test("zotero api: 条目查询只带非空参数", async () => {
  calls.length = 0;
  nextResponse = { status: 200, body: { data: { items: [], total: 0 } } };
  await listZoteroItems({ library_id: "users/0", collection_key: undefined, q: "", start: 0, limit: 50 });
  const url = new URL(calls[0].url, "http://x");
  assert.match(url.pathname, /\/api\/v1\/integrations\/zotero\/items$/);
  assert.equal(url.searchParams.get("library_id"), "users/0");
  assert.equal(url.searchParams.has("collection_key"), false);
  assert.equal(url.searchParams.has("q"), false);
  assert.equal(url.searchParams.get("limit"), "50");
});

test("zotero api: 译文 PDF 写回任务对应的 Zotero 文献", async () => {
  calls.length = 0;
  nextResponse = {
    status: 200,
    body: {
      data: {
        status: "created",
        attachment_key: "ABC12345",
        filename: "PaperLoom-zh.pdf",
        zotero_uri: "zotero://open-pdf/library/items/ABC12345",
      },
    },
  };
  const result = await writeTranslatedPdfToZotero("job /1");
  const url = new URL(calls[0].url, "http://x");
  assert.match(url.pathname, /\/api\/v1\/jobs\/job%20%2F1\/zotero\/writeback$/);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(result.status, "created");
});

test("zotero api: 导入失败时带上后端消息", async () => {
  nextResponse = { status: 400, body: { message: "invalid zotero library: x" } };
  await assert.rejects(
    importZoteroAttachments({ library_id: "x", attachments: [] }),
    /invalid zotero library: x\(400\)/,
  );
});

test("zotero api: 批量写回保留逐篇成功和失败结果", async () => {
  calls.length = 0;
  nextResponse = { status: 200, body: { data: {
    created: 1, updated: 1, failed: 1,
    items: [{ document_id: "d1", result: { status: "created" }, message: null },
      { document_id: "d2", result: { status: "updated" }, message: null },
      { document_id: "d3", result: null, message: "没有可写回的已完成译文" }],
  } } };
  const result = await writeDocumentsToZotero(["d1", "d2", "d3"]);
  assert.match(new URL(calls[0].url, "http://x").pathname, /\/integrations\/zotero\/writeback-batch$/);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), { document_ids: ["d1", "d2", "d3"] });
  assert.equal(result.items[2].message, "没有可写回的已完成译文");
  assert.equal(result.updated, 1);
});

test("orderCollections: 按树序排列并带深度，孤儿分类当顶层", () => {
  const ordered = orderCollections([
    { key: "B", name: "光催化", parent_key: "A" },
    { key: "A", name: "能源", parent_key: null },
    { key: "C", name: "孤儿", parent_key: "MISSING" },
  ]);
  assert.deepEqual(ordered.map((c) => [c.key, c.depth]), [["A", 0], ["B", 1], ["C", 0]]);
});

test("runZoteroImport: 按分类分组导入，刷新书库后逐篇翻译，复用已有任务并去重", async () => {
  const requests = [];
  const translated = [];
  let refreshed = 0;
  const summary = await runZoteroImport({
    libraryId: "users/0",
    translate: true,
    selections: [
      { item_key: "I1", attachment_key: "A1", collection_key: "C1", title: "一" },
      { item_key: "I2", attachment_key: "A2", collection_key: "", title: "二" },
      { item_key: "I3", attachment_key: "A3", collection_key: "C1", title: "三" },
      { item_key: "I4", attachment_key: "A4", collection_key: "", title: "四" },
    ],
    importAttachments: async (payload) => {
      requests.push(payload);
      return payload.attachments.map(({ item_key, attachment_key }) => {
        if (attachment_key === "A3") {
          return { item_key, attachment_key, status: "failed", document_id: null, title: "", translation_job_id: null, message: "附件不在本机" };
        }
        if (attachment_key === "A4") {
          // 与 A2 是同一文件。
          return { item_key, attachment_key, status: "existing", document_id: "doc-2", title: "四", translation_job_id: null, message: null };
        }
        if (attachment_key === "A2") {
          return { item_key, attachment_key, status: "existing", document_id: "doc-2", title: "二", translation_job_id: null, message: null };
        }
        return { item_key, attachment_key, status: "existing", document_id: "doc-1", title: "一", translation_job_id: "job-1", message: null };
      });
    },
    translateDocument: async (documentId) => translated.push(documentId),
    requestLibraryRefresh: () => {
      refreshed += 1;
    },
  });

  assert.deepEqual(requests.map((r) => [r.collection_key, r.attachments.length]), [["C1", 2], [undefined, 2]]);
  assert.equal(refreshed, 1);
  assert.deepEqual(translated, ["doc-2"]);
  assert.equal(summary.queued, 1);
  assert.equal(summary.reused, 1);
  assert.deepEqual(summary.failed, [{ title: "三", message: "附件不在本机" }]);
});

test("runZoteroImport: 不翻译时只导入；接口异常记到整组", async () => {
  const translated = [];
  const summary = await runZoteroImport({
    libraryId: "users/0",
    translate: false,
    selections: [
      { item_key: "I1", attachment_key: "A1", collection_key: "", title: "一" },
      { item_key: "I2", attachment_key: "A2", collection_key: "C9", title: "二" },
    ],
    importAttachments: async (payload) => {
      if (payload.collection_key === "C9") throw new Error("无法连接 Zotero");
      return [{ item_key: "I1", attachment_key: "A1", status: "imported", document_id: "doc-1", title: "一", translation_job_id: null, message: null }];
    },
    translateDocument: async (documentId) => translated.push(documentId),
    requestLibraryRefresh: () => {},
  });
  assert.deepEqual(translated, []);
  assert.equal(summary.stored, 1);
  assert.deepEqual(summary.failed, [{ title: "二", message: "无法连接 Zotero" }]);
});
