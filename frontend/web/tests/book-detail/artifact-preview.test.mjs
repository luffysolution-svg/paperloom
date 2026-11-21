import assert from "node:assert/strict";
import { resolveObjectURL } from "node:buffer";
import { after, before, test } from "node:test";
import { zipSync, strToU8 } from "fflate";
import { makeDom, DOM_GLOBAL_KEYS } from "../helpers/dom.mjs";

const dom = makeDom("", { keys: [...DOM_GLOBAL_KEYS, "Element", "HTMLTextAreaElement"] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act, createElement: h } = await import("react");
const { createRoot } = await import("react-dom/client");
const { BookDetailShell } = await import("../../src/features/book-detail/ui/shell/BookDetailShell.jsx");
const { BookDetailRightTabs } = await import("../../src/features/book-detail/ui/tabs/BookDetailRightTabs.jsx");
const { BookDetailArtifactsTab } = await import("../../src/features/book-detail/ui/tabs/BookDetailArtifactsTab.jsx");
const { buildArtifactCenterSections } = await import("../../src/features/book-detail/domain/artifact-center-model.js");

const entries = [
  ["markdown_raw", "full.md", "# original Markdown"],
  ["normalized_document_json", "document.v1.json", '{"fixture":"structured document"}'],
  ["markdown_bundle_zip", "ocr.zip", zipSync({
    "ocr/full.md": strToU8("# bundled Markdown"),
    "ocr/images/chart.png": new Uint8Array([42]),
  })],
  ["translated_pdf", "translated.pdf", "%PDF-1.7 translated"],
  ["side_by_side_pdf", "comparison.pdf", "%PDF-1.7 comparison"],
];
const resources = new Map(entries.map(([, name, body]) => ["/files/" + name, body]));
resources.set("/files/source.pdf", "%PDF-1.7 original");
const sections = buildArtifactCenterSections({
  documentId: "doc",
  source: { filename: "source.pdf", url: "/files/source.pdf" },
  jobs: [{ job_id: "job", workflow: "book", status: "succeeded" }],
  manifests: { job: { items: entries.map(([artifact_key, name]) => ({
    artifact_key, ready: true, file_name: name, resource_url: "/files/" + name,
  })) } },
});
const host = document.body.appendChild(document.createElement("div"));
const root = createRoot(host);
let navigated = false;
let lastRequest;
const originalFetch = globalThis.fetch;
before(async () => {
  globalThis.fetch = async url => {
    lastRequest = url;
    const body = resources.get(url);
    return body ? new Response(body) : new Response("missing", { status: 404 });
  };
  const navigate = () => { navigated = true; };
  await act(() => root.render(h(BookDetailShell, {
    open: true, title: "Test book", onOpenChange: navigate,
    right: h(BookDetailRightTabs, { open: true, defaultTab: "artifacts",
      artifactsTab: h(BookDetailArtifactsTab, { onOpenJob: navigate, onOpenSource: navigate,
        artifactCenter: { sections, loading: false, error: "", downloadingId: "", download: navigate },
      }),
    }),
  })));
});
after(async () => {
  await act(() => root.unmount());
  globalThis.fetch = originalFetch;
  dom.window.close();
});

for (const [key, filename, expected] of [...entries, ["source", "source.pdf", "%PDF-1.7 original"]]) {
  test("文件页预览并返回 " + filename, async () => {
    const id = key === "source" ? "source:doc" : "job:" + key;
    const row = document.querySelector('[data-artifact-id="' + id + '"]');
    await act(() => row.querySelector("button").click());
    assert.equal(lastRequest, "/files/" + filename);
    assert.equal(navigated, false);
    const preview = document.getElementById("book-detail-artifact-preview");
    assert.ok(preview.textContent.includes(filename));
    if (filename.endsWith(".pdf")) {
      const blob = resolveObjectURL(preview.querySelector("iframe").src);
      assert.equal(blob.type, "application/pdf");
      assert.equal(await blob.text(), expected);
    } else if (filename.endsWith(".zip")) {
      assert.match(preview.textContent, /# bundled Markdown/);
      assert.match(preview.textContent, /ocr\/images\/chart\.png/);
    } else {
      assert.match(preview.textContent, filename.endsWith(".md") ? /# original Markdown/ : /structured document/);
    }
    await act(() => preview.querySelector('button[aria-label="关闭"]').click());
    assert.equal(document.querySelectorAll('[role="dialog"]').length, 1);
    assert.equal(document.querySelector('[title="文件与产物"]').getAttribute("aria-selected"), "true");
    assert.equal(navigated, false);
  });
}

test("读取失败时在预览内显示状态，Escape 返回触发按钮", async () => {
  resources.delete("/files/full.md");
  const button = document.querySelector('[data-artifact-id="job:markdown_raw"] button');
  await act(() => { button.focus(); button.click(); });
  assert.match(document.querySelector('#book-detail-artifact-preview [role="alert"]').textContent, /404/);
  await act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1);
  assert.ok(document.activeElement === button, "键盘焦点返回所选文件");
});
