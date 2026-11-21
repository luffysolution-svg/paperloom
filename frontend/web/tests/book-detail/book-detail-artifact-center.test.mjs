import test from "node:test";
import assert from "node:assert/strict";

import {
  buildArtifactCenterSections,
  formatArtifactBytes,
  formatArtifactTime,
  layoutArtifactCenter,
  mergeArtifactLinksIntoManifest,
  selectArtifactQuickDownloads,
} from "../../src/features/book-detail/domain/artifact-center-model.js";
import { readerCompatibleArtifactLinks } from "../../src/features/book-detail/ui/use-book-detail-artifact-center.js";

const source = {
  filename: "paper.pdf",
  url: "/api/v1/documents/doc-1/source.pdf",
  sizeBytes: 2_097_152,
  generatedAt: "2026-09-01T08:30:00Z",
};

const jobs = [
  {
    job_id: "ocr-1",
    workflow: "ocr",
    status: "succeeded",
    current_attempt: 2,
    created_at: "2026-09-01T09:00:00Z",
    updated_at: "2026-09-01T09:05:00Z",
  },
  {
    job_id: "translate-1",
    workflow: "book",
    status: "succeeded",
    attempt: 3,
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:10:00Z",
  },
];

test("artifact center: 只映射后端 ready 且有资源地址的真实产物", () => {
  const sections = buildArtifactCenterSections({
    documentId: "doc-1",
    source,
    jobs,
    manifests: {
      "ocr-1": {
        items: [
          {
            artifact_key: "normalized_document_json",
            ready: true,
            file_name: "document.v1.json",
            content_type: "application/json",
            size_bytes: 4096,
            updated_at: "2026-09-01T09:05:00Z",
            resource_url: "/api/v1/ocr/jobs/ocr-1/normalized-document",
          },
          {
            artifact_key: "normalization_report_json",
            ready: true,
            file_name: "normalization-report.json",
            resource_url: "/api/v1/ocr/jobs/ocr-1/normalization-report",
          },
          {
            artifact_key: "provider_raw_zip",
            ready: false,
            resource_url: "/should-not-render.zip",
          },
          {
            artifact_key: "source_pdf",
            ready: true,
            resource_url: "/duplicate-source.pdf",
          },
          {
            artifact_key: "markdown_images_dir",
            artifact_kind: "directory",
            ready: true,
            resource_url: "/api/v1/ocr/jobs/ocr-1/markdown/images/",
          },
        ],
      },
      "translate-1": {
        items: [
          {
            artifact_key: "translated_pdf",
            ready: true,
            file_name: "paper.zh.pdf",
            size_bytes: 8_388_608,
            resource_url: "/api/v1/jobs/translate-1/pdf",
          },
          {
            artifact_key: "markdown_bundle_zip",
            ready: true,
            file_name: "paper-markdown.zip",
            resource_url: "/api/v1/jobs/translate-1/download",
          },
          {
            artifact_key: "missing_url",
            ready: true,
          },
        ],
      },
    },
  });

  assert.deepEqual(sections.map((section) => section.id), [
    "source",
    "ocr",
    "translation",
    "diagnostics",
  ]);
  assert.equal(sections.find((section) => section.id === "source").items.length, 1);
  assert.equal(sections.find((section) => section.id === "ocr").items.length, 1);
  assert.equal(sections.find((section) => section.id === "translation").items.length, 2);
  assert.equal(sections.find((section) => section.id === "diagnostics").items.length, 1);
  assert.equal(
    sections.flatMap((section) => section.items).some((item) => item.url === "/should-not-render.zip"),
    false,
  );
  assert.equal(
    sections.find((section) => section.id === "ocr").items[0].attempt,
    2,
    "manifest 未给 attempt 时使用后端 job 字段",
  );
});

test("artifact center: Agent 只在上游提供真实候选 URL 时进入版本分组", () => {
  const sections = buildArtifactCenterSections({
    documentId: "doc-1",
    source,
    agentOperations: [
      {
        operation_id: "op-ready",
        status: "result_ready",
        current_attempt: 1,
        updated_at: "2026-09-01T11:00:00Z",
        candidate: { version_id: "candidate-1", url: "/api/v1/ai/operations/op-ready/candidate" },
      },
      {
        operation_id: "op-draft",
        status: "draft",
        candidate: null,
      },
    ],
  });
  const agent = sections.find((section) => section.id === "agent");
  assert.ok(agent);
  assert.equal(agent.items.length, 1);
  assert.equal(agent.items[0].label, "候选 PDF");
  assert.equal(agent.items[0].attempt, 1);
});

test("缺少文件名和 MIME 的旧清单仍可按产物类型预览", () => {
  const [section] = buildArtifactCenterSections({
    documentId: "doc-1", jobs: [jobs[1]],
    manifests: { "translate-1": { items: ["pdf", "markdown_raw", "normalized_document_json"].map(key => ({
      artifact_key: key, ready: true, resource_url: "/artifacts/" + key,
    })) } },
  });
  assert.deepEqual(section.items.map(item => item.preview), ["pdf", "markdown", "json"]);
});

test("artifact center: 译文就绪时提供 Obsidian 笔记包下载", () => {
  const manifest = mergeArtifactLinksIntoManifest(jobs[1], { items: [] }, {
    pdf_ready: true,
    pdf_url: "http://127.0.0.1:46000/api/v1/jobs/translate-1/pdf?v=1",
  });
  const item = manifest.items.find((entry) => entry.artifact_key === "obsidian_notes_zip");
  assert.equal(item?.resource_url, "http://127.0.0.1:46000/api/v1/jobs/translate-1/markdown/export");
  assert.equal(item?.content_type, "application/zip");

  const sections = buildArtifactCenterSections({
    documentId: "doc-1",
    source,
    jobs: [jobs[1]],
    manifests: { "translate-1": manifest },
  });
  const labels = sections.flatMap((section) => section.items.map((entry) => entry.label));
  assert.ok(labels.includes("Obsidian 笔记包"));
});

test("artifact center: 左栏快捷下载只选择四种常用产物并优先原始 Markdown", () => {
  const sections = buildArtifactCenterSections({
    documentId: "doc-1",
    source,
    jobs,
    manifests: {
      "translate-1": {
        items: [
          { artifact_key: "markdown_bundle_zip", ready: true, file_name: "bundle.zip", resource_url: "/bundle.zip" },
          { artifact_key: "markdown_raw", ready: true, file_name: "paper.md", resource_url: "/paper.md" },
          { artifact_key: "translated_pdf", ready: true, file_name: "paper.zh.pdf", resource_url: "/translated.pdf" },
          { artifact_key: "side_by_side_pdf", ready: true, file_name: "paper.compare.pdf", resource_url: "/comparison.pdf" },
        ],
      },
    },
  });

  const downloads = selectArtifactQuickDownloads(sections);
  assert.equal(downloads.source?.url, source.url);
  assert.equal(downloads.markdown?.url, "/paper.md", "优先直接 Markdown，不用任务包替代");
  assert.equal(downloads.translated?.url, "/translated.pdf");
  assert.equal(downloads.comparison?.url, "/comparison.pdf");
});

test("artifact center: 细清单为空时沿用 Reader 的发布产物入口", () => {
  const translationJob = jobs[1];
  const manifest = mergeArtifactLinksIntoManifest(translationJob, {
    items: [
      { artifact_key: "translated_pdf", ready: false, resource_url: null },
      { artifact_key: "side_by_side_pdf", ready: false, resource_url: null },
    ],
  }, {
    pdf_ready: true,
    markdown_ready: true,
    bundle_ready: true,
    pdf_url: "http://127.0.0.1:41000/api/v1/jobs/translate-1/pdf",
    markdown: {
      ready: true,
      raw_url: "http://127.0.0.1:41000/api/v1/jobs/translate-1/markdown?raw=true",
      file_name: "paper.md",
    },
    pdf: {
      ready: true,
      url: "http://127.0.0.1:41000/api/v1/jobs/translate-1/pdf",
      file_name: "paper.zh.pdf",
    },
    bundle_url: "http://127.0.0.1:41000/api/v1/jobs/translate-1/download",
  });
  const sections = buildArtifactCenterSections({
    documentId: "doc-1",
    source,
    jobs: [translationJob],
    manifests: { "translate-1": manifest },
  });
  const downloads = selectArtifactQuickDownloads(sections);

  assert.equal(downloads.markdown?.filename, "paper.md");
  assert.equal(downloads.translated?.filename, "paper.zh.pdf");
  assert.equal(
    downloads.comparison?.url,
    "http://127.0.0.1:41000/api/v1/jobs/translate-1/files/output/side-by-side.pdf?download=1",
  );
});

test("artifact center: OCR Markdown 使用实际可下载的统一 jobs 路由", () => {
  const links = readerCompatibleArtifactLinks(jobs[0], {
    markdown_ready: true,
    markdown: {
      ready: true,
      raw_url: "http://127.0.0.1:41000/api/v1/ocr/jobs/ocr-1/markdown?raw=true",
    },
  });
  assert.equal(
    links?.markdown?.raw_url,
    "http://127.0.0.1:41000/api/v1/jobs/ocr-1/files/output/ocr.md",
  );
});

test("artifact center: 元数据格式只在字段存在时使用", () => {
  assert.equal(formatArtifactBytes(null), "");
  assert.equal(formatArtifactBytes(2_097_152), "2.0 MB");
  assert.equal(formatArtifactTime(""), "");
  assert.match(formatArtifactTime("2026-09-01T08:30:00Z"), /09\/01/);
});

test("artifact center: 内部文件名映射人话标签，不裸奔", () => {
  const sections = buildArtifactCenterSections({
    documentId: "doc-1",
    source,
    jobs,
    manifests: {
      "translate-1": {
        items: [
          { artifact_key: "job_events", ready: true, file_name: "events.json", resource_url: "/e" },
          { artifact_key: "ocr_provider_raw", ready: true, file_name: "paddle_result.json", resource_url: "/p" },
          { artifact_key: "translate_request_journal", ready: true, file_name: "translation-request-journal.jsonl", resource_url: "/j" },
          { artifact_key: "page_layout", ready: true, file_name: "layout.json", resource_url: "/l" },
          { artifact_key: "normalized_document_json", ready: true, file_name: "document.v1.json", resource_url: "/d" },
        ],
      },
    },
  });
  const labels = sections.flatMap((section) => section.items.map((item) => item.label));
  for (const [file, label] of [
    ["events.json", "事件记录"],
    ["paddle_result.json", "识别原始数据"],
    ["translation-request-journal.jsonl", "翻译请求记录"],
    ["layout.json", "版式数据"],
    ["document.v1.json", "结构化文档"],
  ]) {
    assert.ok(labels.includes(label), `${file} → ${label}`);
    assert.ok(!labels.some((text) => text === file), `${file} 不裸奔`);
  }
});

test("artifact center: /files 的文件名同样映射人话标签，服务商原始包不当成完整任务包", async () => {
  const { jobFilesToArtifactManifest } = await import("@retainpdf/api/jobs-artifacts");
  const file = (name) => ({ name, url: `/api/v1/jobs/translate-1/files/internal/${name}`, ready: true });
  const manifest = jobFilesToArtifactManifest({
    job_id: "translate-1",
    output: [file("all.zip"), file("ocr.zip")],
    internal: [
      file("events.jsonl"),
      file("ocr-provider/result.json"),
      file("ocr-provider/raw.zip"),
      file("translation-requests.jsonl"),
      file("translation-checkpoint.json"),
      file("render-config.json"),
    ],
  });
  const sections = buildArtifactCenterSections({ documentId: "doc-1", source, jobs, manifests: { "translate-1": manifest } });
  const labelOf = Object.fromEntries(sections.flatMap((section) => section.items.map((item) => [item.id, item.label])));
  for (const [key, label] of [
    ["artifact_bundle_zip", "完整任务包"],
    ["markdown_bundle_zip", "Markdown 任务包"],
    ["events_jsonl", "事件记录"],
    ["provider_result_json", "识别原始数据"],
    ["provider_bundle_zip", "识别原始数据"],
    ["translation_request_journal_jsonl", "翻译请求记录"],
    ["translation_checkpoint_json", "翻译断点"],
    ["render_config_json", "渲染配置"],
  ]) {
    assert.equal(labelOf[`translate-1:${key}`], label, `${key} → ${label}`);
  }
});

test("artifact center: 文件页每类只摆最新一份，调试文件和旧任务的同类文件收进调试区", () => {
  const ocrJobs = [
    { job_id: "ocr-new", workflow: "ocr", status: "succeeded", attempt: 1, created_at: "2026-10-06T02:32:50Z", updated_at: "2026-10-06T02:34:58Z" },
    { job_id: "ocr-old", workflow: "ocr", status: "failed", attempt: 16, created_at: "2026-10-06T02:28:11Z", updated_at: "2026-10-06T02:31:46Z" },
  ];
  const sections = buildArtifactCenterSections({
    documentId: "doc-1",
    source,
    jobs: ocrJobs,
    manifests: {
      "ocr-new": {
        items: [
          // 同一次任务里两个键指向同一份 paddle_result.json
          { artifact_key: "layout_json", artifact_group: "json", ready: true, file_name: "paddle_result.json", resource_path: "/new/layout" },
          { artifact_key: "provider_result_json", artifact_group: "provider", ready: true, file_name: "paddle_result.json", resource_path: "/new/provider" },
          { artifact_key: "events_jsonl", artifact_group: "debug", ready: true, file_name: "events.jsonl", resource_path: "/new/events" },
          { artifact_key: "markdown_raw", artifact_group: "markdown", ready: true, file_name: "full.md", resource_path: "/new/md", updated_at: "2026-10-06T02:34:58Z" },
          { artifact_key: "normalization_report_json", artifact_group: "json", ready: true, file_name: "document.v1.report.json", resource_path: "/new/report" },
        ],
      },
      "ocr-old": {
        items: [
          { artifact_key: "events_jsonl", artifact_group: "debug", ready: true, file_name: "events.jsonl", resource_path: "/old/events" },
          // 失败任务更晚写出的同类文件也不能顶掉成功任务的那份
          { artifact_key: "markdown_raw", artifact_group: "markdown", ready: true, file_name: "full.md", resource_path: "/old/md", updated_at: "2026-10-07T00:00:00Z" },
        ],
      },
    },
  });
  const layout = layoutArtifactCenter(sections);
  const ocr = layout.sections.find((section) => section.id === "ocr");
  assert.deepEqual(ocr.items.map((item) => item.url), ["/new/md"], "OCR 分组只剩成功任务的 Markdown");
  assert.equal(layout.sections.some((section) => section.id === "diagnostics"), false, "只有调试文件的「诊断与报告」整组收起");
  const debugUrls = layout.debug.map((entry) => entry.item.url).sort();
  assert.deepEqual(debugUrls, ["/new/events", "/new/layout", "/new/provider", "/new/report", "/old/events", "/old/md"]);
  assert.equal(layout.debug.find((entry) => entry.item.url === "/old/md").superseded, true, "旧任务的同类文件标成旧版本");
  assert.equal(layout.debug.find((entry) => entry.item.url === "/new/events").superseded, false);
  // 拆分只影响文件页怎么摆：sections 原样保留，左栏快捷下载照旧能挑到文件
  assert.equal(sections.find((section) => section.id === "ocr").items.length, 6);
});

test("artifact center: 调试文件按键名判断，书名里带 events 的译文 PDF 不算调试文件", () => {
  const sections = buildArtifactCenterSections({
    documentId: "doc-1",
    source,
    jobs,
    manifests: {
      "translate-1": {
        items: [
          { artifact_key: "translated_pdf", artifact_group: "rendered", ready: true, file_name: "Major events in pipeline chemistry-translated.pdf", resource_path: "/pdf" },
        ],
      },
    },
  });
  const item = sections.find((section) => section.id === "translation").items[0];
  assert.equal(item.debug, false);
  assert.equal(item.label, "译文 PDF");
});

test("artifact center: 识别报告不被「结构化文档」吃掉", () => {
  const sections = buildArtifactCenterSections({
    documentId: "doc-1",
    source,
    jobs,
    manifests: {
      "ocr-1": {
        items: [
          { artifact_key: "normalization_report_json", ready: true, file_name: "document.v1.report.json", resource_path: "/r" },
        ],
      },
    },
  });
  const labels = sections.flatMap((section) => section.items.map((item) => item.label));
  assert.deepEqual(labels.filter((label) => label !== "原始 PDF"), ["识别报告"]);
});

test("artifact center: OCR 组和「翻译与阅读」都有的同名文件，以翻译组为准；只做了 OCR 的书 OCR 组照常摆", () => {
  const jobs = [
    { job_id: "tr", workflow: "book", status: "succeeded", attempt: 1, created_at: "2026-10-06T03:00:00Z", updated_at: "2026-10-06T03:05:00Z" },
    { job_id: "tr-ocr", workflow: "ocr", status: "succeeded", attempt: 1, created_at: "2026-10-06T03:00:00Z", updated_at: "2026-10-06T03:02:00Z" },
  ];
  const md = (path) => ({ artifact_key: "markdown_raw", artifact_group: "markdown", ready: true, file_name: "full.md", resource_path: path });
  const sections = buildArtifactCenterSections({
    documentId: "doc-1",
    source,
    jobs,
    manifests: { tr: { items: [md("/tr/md")] }, "tr-ocr": { items: [md("/ocr/md")] } },
  });
  const layout = layoutArtifactCenter(sections);
  const visibleUrls = layout.sections.flatMap((section) => section.items.map((item) => item.url));
  assert.ok(visibleUrls.includes("/tr/md"), "翻译组的 Markdown 留在明面上");
  assert.ok(!visibleUrls.includes("/ocr/md"), "OCR 组的同名 Markdown 不再重复摆");
  const dup = layout.debug.find((entry) => entry.item.url === "/ocr/md");
  assert.equal(dup?.duplicate, true, "收进调试区，标成重复");
  assert.equal(layout.sections.find((section) => section.id === "ocr")?.mergedIntoTranslation, true, "OCR 组被合并空了要能说明原因");

  const ocrOnly = layoutArtifactCenter(buildArtifactCenterSections({
    documentId: "doc-1", source, jobs: [jobs[1]], manifests: { "tr-ocr": { items: [md("/ocr/md")] } },
  }));
  assert.ok(ocrOnly.sections.find((section) => section.id === "ocr").items.some((item) => item.url === "/ocr/md"));
});
