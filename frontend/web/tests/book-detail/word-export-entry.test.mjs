/**
 * Word 排版稿的下载入口：从译文 PDF 的就绪状态派生，清晰度挂在地址上。
 *
 * 这条链路和另外四个常用下载不一样——它是**按请求现生成**的（后端
 * `GET /jobs/{id}/docx` 起 `retainpdf-pipeline layout-docx`），所以 URL 必须带上
 * 这一次选的 DPI，否则后端会按默认值给出（或命中别人的缓存）。
 */

import test from "node:test";
import assert from "node:assert/strict";

import { mergeArtifactLinksIntoManifest } from "../../src/features/book-detail/domain/artifact-resources.js";
import { buildArtifactCenterSections } from "../../src/features/book-detail/domain/artifact-center-sections.js";
import { selectArtifactQuickDownloads } from "../../src/features/book-detail/domain/artifact-quick-downloads.js";
import {
  clampWordExportDpi,
  DEFAULT_WORD_EXPORT_DPI,
  readWordExportDpi,
  withWordExportDpi,
  writeWordExportDpi,
  WORD_EXPORT_DPI_OPTIONS,
} from "../../src/features/book-detail/domain/word-export-settings.js";

const JOB = {
  job_id: "job-1",
  workflow: "book",
  status: "succeeded",
  updated_at: "2026-09-18T10:00:00Z",
};

function quickDownloads(job = JOB, links = { pdf_ready: true, pdf_url: "/api/v1/jobs/job-1/pdf" }) {
  const manifest = mergeArtifactLinksIntoManifest(job, { items: [] }, links);
  const sections = buildArtifactCenterSections({
    documentId: "doc-1",
    source: {},
    jobs: [job],
    manifests: { "job-1": manifest },
  });
  return selectArtifactQuickDownloads(sections);
}

test("译文 PDF 就绪时才有 Word 排版稿入口", () => {
  const ready = quickDownloads();
  assert.ok(ready.word, "译文 PDF 已就绪，却没有 Word 入口");
  assert.equal(ready.word.url, "/api/v1/jobs/job-1/docx");

  const notReady = quickDownloads(JOB, { pdf_ready: false, pdf_url: "/api/v1/jobs/job-1/pdf" });
  assert.equal(notReady.word, null, "译文 PDF 没好就不该给 Word 入口");
});

test("OCR 任务没有 Word 排版稿——它根本没有译文可排", () => {
  const ocr = quickDownloads(
    { ...JOB, workflow: "ocr" },
    { pdf_ready: true, pdf_url: "/api/v1/jobs/job-1/pdf" },
  );
  assert.equal(ocr.word, null);
});

test("docx 是译文 PDF 的兄弟路由，不是它的子路径", () => {
  // 这条是为 side-by-side 那种「往后拼」的写法准备的:照抄会拼出 /pdf/docx。
  const { word, comparison } = quickDownloads();
  assert.equal(comparison.url, "/api/v1/jobs/job-1/pdf/side-by-side");
  assert.equal(word.url, "/api/v1/jobs/job-1/docx");
  assert.ok(!word.url.includes("/pdf/"), `拼成了子路径:${word.url}`);
});

test("清晰度挂到地址上，不会拼出第二个问号", () => {
  assert.equal(withWordExportDpi("/api/v1/jobs/job-1/docx", 300), "/api/v1/jobs/job-1/docx?dpi=300");
  assert.equal(
    withWordExportDpi("/api/v1/jobs/job-1/docx?attempt=2", 120),
    "/api/v1/jobs/job-1/docx?attempt=2&dpi=120",
  );
  // 已经带了 dpi 的话是替换而不是追加，否则后端读到的是第一个。
  assert.equal(
    withWordExportDpi("/api/v1/jobs/job-1/docx?dpi=72", 300),
    "/api/v1/jobs/job-1/docx?dpi=300",
  );
  // 相对地址进去还是相对地址——不能把当前域名焊进链接。
  assert.ok(!withWordExportDpi("/api/v1/jobs/job-1/docx", 180).includes("http"));
  // 绝对地址保持绝对。
  assert.equal(
    withWordExportDpi("https://api.example.com/api/v1/jobs/job-1/docx", 180),
    "https://api.example.com/api/v1/jobs/job-1/docx?dpi=180",
  );
});

test("清晰度夹在后端认的区间里", () => {
  // 后端 `dpi.clamp(72, 300)`。两边不一致的话，前端以为选了 600、后端给的是 300，
  // 而缓存键按前端发出去的值分——会白建一份一模一样的产物。
  assert.equal(clampWordExportDpi(600), 300);
  assert.equal(clampWordExportDpi(10), 72);
  assert.equal(clampWordExportDpi("180"), 180);
  assert.equal(clampWordExportDpi("不是数字"), DEFAULT_WORD_EXPORT_DPI);
  assert.equal(clampWordExportDpi(undefined), DEFAULT_WORD_EXPORT_DPI);
  for (const option of WORD_EXPORT_DPI_OPTIONS) {
    assert.equal(clampWordExportDpi(option.value), option.value, `${option.value} 被夹掉了`);
  }
});

test("默认清晰度和后端一致——不一致会白建一份缓存", () => {
  // 后端 `DEFAULT_BACKGROUND_DPI = 180`(derived_artifacts/word.rs)。
  assert.equal(DEFAULT_WORD_EXPORT_DPI, 180);
  assert.ok(
    WORD_EXPORT_DPI_OPTIONS.some((option) => option.value === DEFAULT_WORD_EXPORT_DPI),
    "默认值不在可选项里，用户没法选回默认",
  );
});

test("记住上次选的清晰度；存储不可用时退回默认值而不是抛", () => {
  const store = new Map();
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
  assert.equal(readWordExportDpi(storage), DEFAULT_WORD_EXPORT_DPI);
  writeWordExportDpi(300, storage);
  assert.equal(readWordExportDpi(storage), 300);
  // 存进去的越界值读出来也要夹住(手改过 localStorage、或旧版本写的)。
  storage.setItem("retainpdf.book-detail.word-export.dpi.v1", "9999");
  assert.equal(readWordExportDpi(storage), 300);

  const throwing = {
    getItem() { throw new Error("站点数据被禁用"); },
    setItem() { throw new Error("站点数据被禁用"); },
  };
  assert.equal(readWordExportDpi(throwing), DEFAULT_WORD_EXPORT_DPI);
  assert.doesNotThrow(() => writeWordExportDpi(120, throwing));
});
