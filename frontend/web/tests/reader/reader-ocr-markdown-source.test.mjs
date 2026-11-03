import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const base = "http://127.0.0.1:41000";
const dom = new JSDOM("", { url: `${base}/reader.html?job_id=ocr-markdown` });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
window.__FRONT_RUNTIME_CONFIG__ = { apiBase: base, xApiKey: "reader-fixture-key" };
const { configureDefaultArtifactUrlConfigPort } = await import("@retainpdf/domain/job");
configureDefaultArtifactUrlConfigPort({ resolveApiBase: () => base });
const { createReaderDataPort } = await import("../../src/features/reader/domain/host/data.ts");

test("OCR Markdown preview uses the published jobs route for both content and images", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push(`${url}`);
    if (`${url}` === `${base}/api/v1/jobs/ocr-markdown`) {
      return Response.json({ code: 0, data: { job_id: "ocr-markdown", workflow: "ocr", status: "succeeded",
        artifacts: { markdown: { ready: true, raw_url: `${base}/api/v1/ocr/jobs/ocr-markdown/markdown?raw=true`,
          images_base_url: `${base}/api/v1/ocr/jobs/ocr-markdown/markdown/images/` } } } });
    }
    if (`${url}` === `${base}/api/v1/jobs/ocr-markdown/markdown?raw=true`) {
      assert.ok(init.headers.Range);
      return new Response("# Existing OCR Markdown", { status: 200 });
    }
    return new Response("not found", { status: 404 });
  };
  try {
    const port = createReaderDataPort();
    const source = await port.loadMarkdownSource("ocr-markdown");
    assert.equal(source.rawUrl, `${base}/api/v1/jobs/ocr-markdown/markdown?raw=true`);
    assert.equal(source.imagesBaseUrl, `${base}/api/v1/jobs/ocr-markdown/markdown/images/`);
    const content = await port.loadMarkdownRange(source.rawUrl, 0, 1023);
    assert.equal(content.status, 200);
    assert.equal(new TextDecoder().decode(content.bytes), "# Existing OCR Markdown");
    assert.ok(calls.every((url) => !url.includes("/ocr/jobs/")));
  } finally { globalThis.fetch = previousFetch; }
});

test("translation Markdown keeps its advertised content and image addresses", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ code: 0, data: { job_id: "translation-markdown", workflow: "translate",
    artifacts: { markdown: { ready: true, raw_url: "https://assets.example/paper.md", images_base_url: "https://assets.example/images/" } } } });
  try {
    const source = await createReaderDataPort().loadMarkdownSource("translation-markdown");
    assert.equal(source.rawUrl, "https://assets.example/paper.md");
    assert.equal(source.imagesBaseUrl, "https://assets.example/images/");
  } finally { globalThis.fetch = previousFetch; }
});
