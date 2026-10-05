import test from "node:test";
import assert from "node:assert/strict";

import { createReaderDataPort } from "../../../../frontend/packages/reader/src/shared/data/data-port.ts";

// 阅读器数据层：manifest 失败致命（保留准确错误），regions/metadata 可选
// （失败非致命但必须记录），以及同一 job 的短期请求复用。

test("loadReaderPayload propagates a real manifest failure with its accurate message", async () => {
  const port = createReaderDataPort({
    loadJob: async () => ({ status: "running" }),
    loadManifest: async () => {
      throw Object.assign(new Error("读取产物清单失败，请稍后重试。(503)"), { status: 503 });
    },
  });

  await assert.rejects(
    () => port.loadReaderPayload("job-manifest-fail"),
    /读取产物清单失败，请稍后重试。\(503\)/,
  );
});

test("loadReaderPayload keeps the in-progress 404 manifest as an empty artifact set", async () => {
  const port = createReaderDataPort({
    loadJob: async () => ({ status: "running" }),
    loadManifest: async () => {
      throw Object.assign(new Error("manifest not ready"), { status: 404 });
    },
  });

  const payload = await port.loadReaderPayload("job-ocr");
  assert.deepEqual(payload.manifestPayload, { items: [] });
});

test("loadReaderPayload records regions/metadata failures without failing the load", async () => {
  const regionsError = new Error("读取阅读区域失败，请稍后重试。(500)");
  const metadataError = new Error("读取阅读元数据失败，请稍后重试。(500)");
  const port = createReaderDataPort({
    loadJob: async () => ({ status: "succeeded" }),
    loadManifest: async () => ({ items: [{ key: "source_pdf" }] }),
    loadRegions: async () => {
      throw regionsError;
    },
    loadMetadata: async () => {
      throw metadataError;
    },
  });

  const payload = await port.loadReaderPayload("job-optional-fail");
  assert.deepEqual(payload.regionsPayload, { items: [] });
  assert.equal(payload.readerMetadata, null);
  assert.equal(payload.readerErrors.regions, regionsError);
  assert.equal(payload.readerErrors.metadata, metadataError);
});

test("loadReaderPayload reports null errors when optional artifacts succeed", async () => {
  const port = createReaderDataPort({
    loadJob: async () => ({ status: "succeeded" }),
    loadManifest: async () => ({ items: [] }),
    loadRegions: async () => ({ items: [{ item_id: "r1" }] }),
    loadMetadata: async () => ({ source: { pages: [] } }),
  });

  const payload = await port.loadReaderPayload("job-optional-ok");
  assert.deepEqual(payload.regionsPayload, { items: [{ item_id: "r1" }] });
  assert.deepEqual(payload.readerMetadata, { source: { pages: [] } });
  assert.deepEqual(payload.readerErrors, { regions: null, metadata: null });
});

test("loadReaderPayload can skip optional artifacts entirely", async () => {
  let regionsCalls = 0;
  let metadataCalls = 0;
  const port = createReaderDataPort({
    loadJob: async () => ({ status: "succeeded" }),
    loadManifest: async () => ({ items: [] }),
    loadRegions: async () => {
      regionsCalls += 1;
      return { items: [] };
    },
    loadMetadata: async () => {
      metadataCalls += 1;
      return null;
    },
  });

  const payload = await port.loadReaderPayload("job-committed", {
    includeOptionalArtifacts: false,
  });
  assert.equal(regionsCalls, 0);
  assert.equal(metadataCalls, 0);
  assert.deepEqual(payload.regionsPayload, { items: [] });
  assert.equal(payload.readerMetadata, null);
  assert.deepEqual(payload.readerErrors, { regions: null, metadata: null });
});

test("all payload paths share one in-flight job request and reuse it briefly", async () => {
  let jobCalls = 0;
  const port = createReaderDataPort({
    loadJob: async () => {
      jobCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 30));
      return { status: "running", source_artifact_job_id: "" };
    },
    loadManifest: async () => ({ items: [] }),
    loadRegions: async () => ({ items: [] }),
    loadMetadata: async () => null,
    loadMarkdownDocument: async () => ({ content: "" }),
    loadMarkdown: async () => ({ content: "" }),
    loadMarkdownSource: async () => null,
  });

  await Promise.all([
    port.loadReaderPayload("job-shared"),
    port.loadMarkdownPayload("job-shared"),
    port.loadMarkdownSource("job-shared"),
    port.loadJobPayload("job-shared"),
  ]);
  assert.equal(jobCalls, 1, "并发调用必须复用同一个 in-flight job 请求");

  await port.loadJobPayload("job-shared");
  assert.equal(jobCalls, 1, "短期窗口内的紧邻调用仍复用已解析结果");

  await new Promise((resolve) => setTimeout(resolve, 300));
  await port.loadJobPayload("job-shared");
  assert.equal(jobCalls, 2, "超过复用窗口后轮询仍取新数据");
});
