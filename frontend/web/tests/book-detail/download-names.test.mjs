// 前端镜像必须和后端 backend/packages/retainpdf-files/src/download_names.rs 给出一模一样的名字：
// 下面的例子和 Rust 那边的测试逐条相同，改规则要两边一起改。
import test from "node:test";
import assert from "node:assert/strict";

import { downloadFileName } from "../../src/features/book-detail/domain/download-names.ts";
import { buildArtifactCenterSections } from "../../src/features/book-detail/domain/artifact-center-sections.ts";

const TITLE = "The Harmonic Oscillator and Vibrational Spectroscopy";

test("每类文件都是「类型前缀_书名_后缀」（与 Rust 测试同一组例子）", () => {
  assert.deepEqual(
    ["source", "translated", "side-by-side", "layout", "ocr-markdown", "markdown-bundle", "bundle"].map((kind) => downloadFileName(TITLE, kind)),
    [
      `orig_${TITLE}_source.pdf`,
      `zh_${TITLE}_translated.pdf`,
      `dual_${TITLE}_side-by-side.pdf`,
      `zh_${TITLE}_layout.docx`,
      `orig_${TITLE}_ocr.md`,
      `orig_${TITLE}_markdown.zip`,
      `${TITLE}_bundle.zip`,
    ],
  );
});

test("书名清理和 Rust 一致", () => {
  assert.equal(downloadFileName("a/b: c?  \"d\"\n.pdf", "source"), "orig_a b c d_source.pdf");
  assert.equal(downloadFileName("   ", "bundle"), "document_bundle.zip");
  assert.equal(downloadFileName("共轭在卤素.pdf", "translated"), "zh_共轭在卤素_translated.pdf");
  // 「长」3 字节：180 字节恰好 60 个字。
  assert.equal(downloadFileName("长".repeat(300), "translated"), `zh_${"长".repeat(60)}_translated.pdf`);
});

test("边角输入和 Rust 一致（同一组例子）", () => {
  assert.equal(downloadFileName("x.Pdf", "source"), "orig_x_source.pdf");
  assert.equal(downloadFileName("\uFEFFtitle", "source"), "orig_title_source.pdf");
  assert.equal(downloadFileName("a\uFEFFb", "source"), "orig_a b_source.pdf");
  assert.equal(downloadFileName("ab".repeat(100), "bundle"), `${"ab".repeat(90)}_bundle.zip`);
});

test("文件页列表：给用户的文件写下载名，排查用的文件保持原名；不知道书名时保持原名", () => {
  const input = {
    documentId: "doc-1",
    source: { filename: "McQuarrie (2008)-10.pdf", url: "/source.pdf" },
    jobs: [{ job_id: "j", workflow: "book", status: "succeeded", created_at: "2026-10-06T00:00:00Z" }],
    manifests: {
      j: {
        items: [
          { artifact_key: "translated_pdf", ready: true, file_name: "x-translated.pdf", resource_path: "/t.pdf" },
          { artifact_key: "markdown_raw", ready: true, file_name: "full.md", resource_path: "/full.md" },
          { artifact_key: "events_jsonl", artifact_group: "debug", ready: true, file_name: "events.jsonl", resource_path: "/events" },
        ],
      },
    },
  };
  const names = (sections) => Object.fromEntries(sections.flatMap((s) => s.items).map((item) => [item.url, item.filename]));
  const withTitle = names(buildArtifactCenterSections({ ...input, title: TITLE }));
  assert.equal(withTitle["/source.pdf"], `orig_${TITLE}_source.pdf`);
  assert.equal(withTitle["/t.pdf"], `zh_${TITLE}_translated.pdf`);
  assert.equal(withTitle["/full.md"], `orig_${TITLE}_ocr.md`);
  assert.equal(withTitle["/events"], "events.jsonl");
  const noTitle = names(buildArtifactCenterSections(input));
  assert.equal(noTitle["/t.pdf"], "x-translated.pdf");
  assert.equal(noTitle["/source.pdf"], "McQuarrie (2008)-10.pdf");
});
