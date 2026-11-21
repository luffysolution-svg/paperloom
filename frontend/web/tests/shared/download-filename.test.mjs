/**
 * 下载文件名以后端为准（backend/packages/retainpdf-files/src/download_names.rs：类型前缀_书名_后缀）。
 *
 * 以前前端传进来的 preferredName 排在响应头前面，同一个译文 PDF 从左栏下载叫
 * `…-translated.pdf`、从阅读器下载叫 `zh_….pdf`；「另存为」对话框预填的也是前端自己
 * 拼的名字。
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { downloadProtectedResponse, fileNameFromDisposition } = await import("../../src/platform/utils/downloads.ts");

function fileSystemTarget() {
  return {
    kind: "file-system",
    handle: { createWritable: async () => ({ write: async () => {}, close: async () => {}, abort: async () => {} }) },
  };
}

const HEADER = "attachment; filename=\"zh___ ___translated.pdf\"; filename*=UTF-8''zh_%E5%85%B1%E8%BD%AD%20%E5%8D%A4%E7%B4%A0_translated.pdf";

describe("下载文件名", () => {
  it("响应头里的名字压过前端自己拼的名字，「另存为」预填的也是它", async () => {
    const asked = [];
    const filename = await downloadProtectedResponse({
      fetchResponse: async () => new Response("pdf", { headers: { "content-disposition": HEADER } }),
      fallbackName: "job-1.pdf",
      preferredName: "zh_原文件名.pdf",
      target: (name) => { asked.push(name); return Promise.resolve(fileSystemTarget()); },
    });
    assert.equal(filename, "zh_共轭 卤素_translated.pdf");
    assert.deepEqual(asked, ["zh_共轭 卤素_translated.pdf"]);
  });

  it("响应没带文件名（旧后端）时才用前端的名字兜底", async () => {
    const filename = await downloadProtectedResponse({
      fetchResponse: async () => new Response("pdf"),
      fallbackName: "job-1.pdf",
      preferredName: "zh_原文件名.pdf",
      target: () => Promise.resolve(fileSystemTarget()),
    });
    assert.equal(filename, "zh_原文件名.pdf");
  });

  it("inline 响应头里的名字同样认得（译文 PDF、Markdown 既能看也能下载）", () => {
    assert.equal(
      fileNameFromDisposition("inline; filename=\"orig_x_ocr.md\"; filename*=UTF-8''orig_x_ocr.md", "full.md"),
      "orig_x_ocr.md",
    );
  });
});
