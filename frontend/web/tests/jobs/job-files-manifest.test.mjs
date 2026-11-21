// 产物清单改读 /jobs/:id/files：接口包把它换成以前 artifacts-manifest 的形状，
// 详情页、书籍文件页、阅读器照旧按 artifact_key 找文件。
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

const { fetchJobArtifactsManifest, jobFilesToArtifactManifest } = await import("@retainpdf/api/jobs-artifacts");

const FILES = {
  job_id: "job-1",
  attempt: 2,
  source: {
    name: "source.pdf",
    url: "http://127.0.0.1:41000/api/v1/documents/doc-1/files/source.pdf",
    ready: true,
    on_demand: false,
    content_type: "application/pdf",
    size_bytes: 1500,
    updated_at: "2026-10-17T08:00:00Z",
    stage: "upload",
  },
  output: [
    { name: "translated.pdf", url: "http://127.0.0.1:41000/api/v1/jobs/job-1/files/output/translated.pdf", ready: true, on_demand: false, content_type: "application/pdf", size_bytes: 900, updated_at: "2026-10-17T08:10:00Z", stage: "rendering" },
    { name: "side-by-side.pdf", url: "http://127.0.0.1:41000/api/v1/jobs/job-1/files/output/side-by-side.pdf", ready: true, on_demand: true, content_type: "application/pdf", size_bytes: null, updated_at: null, stage: null },
    { name: "ocr.md", url: "http://127.0.0.1:41000/api/v1/jobs/job-1/files/output/ocr.md", ready: true, on_demand: false, content_type: "text/markdown; charset=utf-8", size_bytes: 40, updated_at: "2026-10-17T08:01:00Z", stage: "ocr" },
  ],
  pages: { page_count: 2, url_template: "http://127.0.0.1:41000/api/v1/jobs/job-1/files/pages/{page}.jpg" },
  internal: [
    { name: "ocr-provider/raw.zip", url: "http://127.0.0.1:41000/api/v1/jobs/job-1/files/internal/ocr-provider/raw.zip", ready: false, on_demand: false, content_type: "application/zip", size_bytes: null, updated_at: null, stage: "ocr" },
    { name: "brand-new.json", url: "http://127.0.0.1:41000/api/v1/jobs/job-1/files/internal/brand-new.json", ready: true, on_demand: false, content_type: "application/json", size_bytes: 3 },
  ],
};

test("/files 摊平成产物清单：原文在最前，文件名换回旧的产物键", () => {
  const manifest = jobFilesToArtifactManifest(FILES);
  assert.equal(manifest.job_id, "job-1");
  assert.deepEqual(
    manifest.items.map((item) => item.artifact_key),
    ["source_pdf", "translated_pdf", "side_by_side_pdf", "markdown_raw", "provider_bundle_zip", "brand-new.json"],
  );
  const source = manifest.items[0];
  assert.equal(source.resource_url, FILES.source.url, "原文走书的地址，不再是 /artifacts/source_pdf");
  assert.equal(source.artifact_group, "source");
  assert.equal(source.source_stage, "upload");
  assert.equal(source.updated_at, "2026-10-17T08:00:00Z");
  assert.equal(source.attempt, 2, "attempt 是 /files 顶层的值，每项一样");
  assert.equal(source.artifact_kind, "file");
});

test("按需生成的、没就绪的、表外的新文件都照实列出", () => {
  const items = Object.fromEntries(jobFilesToArtifactManifest(FILES).items.map((item) => [item.artifact_key, item]));
  assert.equal(items.side_by_side_pdf.on_demand, true);
  assert.equal(items.side_by_side_pdf.updated_at, null);
  assert.equal(items.provider_bundle_zip.ready, false);
  assert.equal(items.provider_bundle_zip.artifact_group, "provider");
  assert.equal(items["brand-new.json"].artifact_group, "");
  assert.equal(items["brand-new.json"].file_name, "brand-new.json");
});

test("空的、坏的 /files 给空清单，不抛错", () => {
  assert.deepEqual(jobFilesToArtifactManifest(null).items, []);
  assert.deepEqual(jobFilesToArtifactManifest({ job_id: "x" }).items, []);
  assert.deepEqual(jobFilesToArtifactManifest({ output: [{ name: "a.pdf" }, null, { url: "u" }] }).items, []);
});

function stubFetch(handler) {
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = String(input?.url ?? input);
    calls.push(url);
    return handler(url);
  };
  return { calls, restore: () => { globalThis.fetch = previous; } };
}

test("fetchJobArtifactsManifest 读 /files，不再请求 artifacts-manifest", async () => {
  const net = stubFetch(() => new Response(JSON.stringify({ code: 0, data: FILES }), { status: 200, headers: { "content-type": "application/json" } }));
  try {
    const manifest = await fetchJobArtifactsManifest("job-1");
    assert.equal(net.calls.length, 1);
    assert.match(net.calls[0], /\/api\/v1\/jobs\/job-1\/files$/);
    assert.equal(manifest.items[0].artifact_key, "source_pdf");
  } finally {
    net.restore();
  }
});

test("fetchJobArtifactsManifest：404 给空清单，其他错误抛中文提示", async () => {
  let net = stubFetch(() => new Response("not found", { status: 404 }));
  try {
    assert.deepEqual((await fetchJobArtifactsManifest("job-gone")).items, []);
  } finally {
    net.restore();
  }
  net = stubFetch(() => new Response("boom", { status: 500 }));
  try {
    await assert.rejects(fetchJobArtifactsManifest("job-1"), /读取任务文件失败.*500/);
  } finally {
    net.restore();
  }
});

test("任务详情产物清单：按需生成的文件没有大小写「-」，新加的几项有中文名", async () => {
  const { formatSizeBytes, summarizeArtifactLabel } = await import("@retainpdf/domain/job");
  assert.equal(formatSizeBytes(null), "-", "null 不能变成 0 B");
  assert.equal(formatSizeBytes(undefined), "-");
  assert.equal(formatSizeBytes(0), "0 B", "真的 0 字节照写");
  assert.equal(formatSizeBytes(2048), "2.0 KB");
  for (const [key, label] of [
    ["side_by_side_pdf", "对照 PDF"],
    ["layout_docx", "Word 排版稿"],
    ["artifact_bundle_zip", "完整任务包"],
  ]) {
    assert.equal(summarizeArtifactLabel(key), label);
  }
});
