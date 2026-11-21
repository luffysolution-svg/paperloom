import test from "node:test";
import assert from "node:assert/strict";
import {
  MOCK_DOCUMENT_ID,
  getMockDocument,
  getMockDocumentList,
  getMockSearchHits,
  patchMockDocument,
  translateMockDocument,
  deleteMockDocument,
} from "@/platform/mock/documents.js";
import { MOCK_JOB_ID } from "@/platform/mock/constants.js";

// ===== documents:形状与语义(与后端对接说明对齐) =====

test("mock 文档列表支持 reading_status 过滤", () => {
  const all = getMockDocumentList();
  assert.ok(all.documents.length >= 3);
  for (const doc of all.documents) {
    assert.ok(doc.document_id);
    // 文档中心模型:active_job_id 可空(馆藏态,只入库未翻译),不再是硬不变量。
    assert.ok(["unread", "reading", "done"].includes(doc.reading_status));
    // API 层给每篇文档填三个媒体 URL(镜像后端 with_document_media_urls)。
    assert.ok(doc.source_pdf_url, "source_pdf_url 让馆藏文档也能读原文");
    assert.ok(doc.cover_url);
    assert.ok(doc.thumbnail_url);
  }
  // 既有翻译过的文档、也有馆藏态文档(无 active_job_id)。
  assert.ok(all.documents.some((doc) => `${doc.active_job_id || ""}`.trim()), "存在已翻译文档");
  assert.ok(
    all.documents.some((doc) => !`${doc.active_job_id || ""}`.trim()),
    "存在馆藏态文档(无 active_job_id)",
  );
  const reading = getMockDocumentList({ readingStatus: "reading" });
  assert.ok(reading.documents.every((doc) => doc.reading_status === "reading"));
});

test("mock 文档列表支持 q 标题/文件名过滤（镜像后端 LIKE）", () => {
  const all = getMockDocumentList({ limit: 999 });
  const target = all.documents.find((doc) => `${doc.title || ""}`.trim());
  assert.ok(target, "至少一篇有标题的文档");
  const needle = `${target.title}`.trim().slice(0, 3);
  assert.ok(needle, "标题取前 3 字作查询词");
  const matched = getMockDocumentList({ limit: 999, q: needle });
  assert.ok(matched.documents.some((doc) => doc.document_id === target.document_id), "标题命中");
  assert.ok(
    matched.documents.every((doc) =>
      `${doc.title || ""}\n${doc.source_filename || ""}`.toLowerCase().includes(needle.toLowerCase()),
    ),
    "只返回标题或文件名命中的文档",
  );
  assert.equal(
    matched.total,
    all.documents.filter((doc) =>
      `${doc.title || ""}\n${doc.source_filename || ""}`.toLowerCase().includes(needle.toLowerCase()),
    ).length,
    "total 是过滤后计数",
  );
});

test("translateMockDocument:给馆藏文档挂 active_job_id 并返回提交视图", () => {
  const before = getMockDocumentList().documents.find((doc) => !`${doc.active_job_id || ""}`.trim());
  assert.ok(before, "至少一篇馆藏文档");
  const submission = translateMockDocument(before.document_id);
  assert.equal(submission.document_id, before.document_id);
  assert.ok(submission.job_id, "返回 job_id");
  assert.ok(["queued", "running", "pending"].includes(submission.status));
  const after = getMockDocument(before.document_id);
  assert.equal(after.active_job_id, submission.job_id, "馆藏文档挂上 active_job_id");
  // 幂等保护:已在翻译流程中再发起应报错。
  assert.throws(() => translateMockDocument(before.document_id), /409/);
});

test("deleteMockDocument:删除后从列表消失,再取抛 404", () => {
  // 用第二篇馆藏文档(其它 test 不碰它,避免跨用例状态串扰)。
  const target = "doc-ref-9b7e04";
  assert.ok(getMockDocumentList({ limit: 999 }).documents.some((doc) => doc.document_id === target));
  const result = deleteMockDocument(target);
  assert.equal(result.deleted, true);
  assert.equal(result.document_id, target);
  assert.equal(
    getMockDocumentList({ limit: 999 }).documents.some((doc) => doc.document_id === target),
    false,
    "删除后不在列表里",
  );
  assert.throws(() => getMockDocument(target), /404/);
  assert.throws(() => deleteMockDocument(target), /404/, "再删一次报 404");
});

test("PATCH 文档:reading_status 只认三个合法值", () => {
  assert.throws(() => patchMockDocument(MOCK_DOCUMENT_ID, { reading_status: "archived" }), /400/);
  patchMockDocument(MOCK_DOCUMENT_ID, { reading_status: "done" });
  assert.equal(getMockDocument(MOCK_DOCUMENT_ID).reading_status, "done");
});

// ===== search:命中形状与高亮包裹 =====

test("检索命中带锚点四元组,命中词以 [ ] 包裹", () => {
  const { hits } = getMockSearchHits("光谱");
  assert.ok(hits.length > 0);
  for (const hit of hits) {
    assert.ok(hit.document_id && hit.job_id && hit.block_id);
    assert.equal(typeof hit.page_idx, "number");
    assert.match(hit.source_snippet, /\[光谱\]/);
  }
  assert.deepEqual(getMockSearchHits("").hits, []);
});

// ===== 删除保护:409 呈现为友好文案,绝不自动 force =====

test("按 job_id 直查文档:active_job_id 命中 + 历史 run 也解析到同一文档", async () => {
  // isMockMode 靠 window.location.search 的 ?mock=,置好后再动态 import api 层
  globalThis.window = { location: { search: "?mock=succeeded", protocol: "http:", hostname: "127.0.0.1" } };
  const { fetchDocumentByJobId } = await import("@/platform/api/mocks/documents.js");
  // active_job_id 命中
  const active = await fetchDocumentByJobId("/api/v1", MOCK_JOB_ID);
  assert.equal(active?.document_id, MOCK_DOCUMENT_ID);
  // 历史 run(非 active)——正是 #1 要解决的:反查列表会漏,直查能命中
  const historical = await fetchDocumentByJobId("/api/v1", "mock-job-20260101-old");
  assert.equal(historical?.document_id, MOCK_DOCUMENT_ID, "历史 run 解析到所属文档");
  // 不属于任何文档 → null
  assert.equal(await fetchDocumentByJobId("/api/v1", "job-nonexistent"), null);
  assert.equal(await fetchDocumentByJobId("/api/v1", ""), null);
});
