/**
 * 真的把 ArtifactQuickDownloads 渲染出来。
 *
 * 纯逻辑测试钉不住「页面上摆成什么样」——上一次就是靠这种测试全绿地放过了一个重复
 * 渲染的浮层按钮。这里钉的是元素的个数与身份:五个下载按钮、一个设置按钮，以及
 * 「点 Word 那个，发出去的地址带不带 dpi」。
 */

import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { describe, it, before, after } from "node:test";

const dom = new JSDOM("<!doctype html><body></body>", {
  url: "http://localhost/index.html", pretendToBeVisual: true,
});
for (const key of [
  "window", "document", "HTMLElement", "HTMLButtonElement", "Node", "Event",
  "CustomEvent", "MouseEvent", "KeyboardEvent", "PointerEvent", "DocumentFragment",
  "MutationObserver", "NodeFilter", "Range", "DOMRect",
  // Radix 的焦点管理会 instanceof 这两个；少了就是 ReferenceError，对话框打不开。
  "HTMLInputElement", "HTMLTextAreaElement",
]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key] ?? dom.window, writable: true, configurable: true,
  });
}
globalThis.window = dom.window;
globalThis.localStorage = dom.window.localStorage;
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator, writable: true, configurable: true,
});
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.matchMedia = () => ({
  matches: false, addEventListener() {}, removeEventListener() {},
  addListener() {}, removeListener() {},
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// Radix 的 DismissableLayer 会摸这些；jsdom 没有。
dom.window.HTMLElement.prototype.hasPointerCapture ||= () => false;
dom.window.HTMLElement.prototype.setPointerCapture ||= () => {};
dom.window.HTMLElement.prototype.releasePointerCapture ||= () => {};
dom.window.HTMLElement.prototype.scrollIntoView ||= () => {};

const React = await import("react");
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { ArtifactQuickDownloads } = await import(
  "../../src/features/book-detail/ui/panels/ArtifactQuickDownloads.tsx"
);
const { mergeArtifactLinksIntoManifest } = await import(
  "../../src/features/book-detail/domain/artifact-resources.js"
);
const { buildArtifactCenterSections } = await import(
  "../../src/features/book-detail/domain/artifact-center-sections.js"
);

const JOB = {
  job_id: "job-1", workflow: "book", status: "succeeded",
  updated_at: "2026-09-18T10:00:00Z",
};
const SECTIONS = buildArtifactCenterSections({
  documentId: "doc-1",
  source: { filename: "paper.pdf", url: "/api/v1/documents/doc-1/source.pdf" },
  jobs: [JOB],
  manifests: {
    "job-1": mergeArtifactLinksIntoManifest(JOB, { items: [] }, {
      pdf_ready: true,
      pdf_url: "/api/v1/jobs/job-1/pdf",
      markdown_ready: true,
      markdown_url: "/api/v1/jobs/job-1/markdown",
    }),
  },
});

let host;
let root;
const downloaded = [];

before(async () => {
  host = dom.window.document.createElement("div");
  dom.window.document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root.render(React.createElement(ArtifactQuickDownloads, {
      sections: SECTIONS,
      loading: false,
      downloadingId: "",
      onDownload: (item) => downloaded.push(item),
    }));
  });
});

after(() => { act(() => root.unmount()); host.remove(); });

const click = async (element) => {
  await act(async () => {
    element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
  });
};

describe("常用下载面板", () => {
  it("五个下载按钮，一个不多一个不少", () => {
    const buttons = host.querySelectorAll(".book-detail-quick-download-btn");
    assert.equal(buttons.length, 5, `渲染了 ${buttons.length} 个下载按钮`);
    assert.ok(host.querySelector("#book-detail-download-word-btn"), "没有 Word 排版稿按钮");
  });

  it("Word 按钮是可用的——译文 PDF 已就绪", () => {
    const button = host.querySelector("#book-detail-download-word-btn");
    assert.equal(button.dataset.available, "true");
    assert.ok(!button.disabled);
  });

  it("有且只有一个设置按钮", () => {
    const gears = host.querySelectorAll(".book-detail-quick-downloads-settings");
    assert.equal(gears.length, 1, `渲染了 ${gears.length} 个设置按钮`);
  });

  it("点 Word 下载时地址带上清晰度", async () => {
    downloaded.length = 0;
    await click(host.querySelector("#book-detail-download-word-btn"));
    assert.equal(downloaded.length, 1, "没有触发下载");
    assert.match(downloaded[0].url, /\/api\/v1\/jobs\/job-1\/docx\?dpi=\d+$/, downloaded[0].url);
  });

  it("其余四个原样下载，不该被挂上 dpi", async () => {
    downloaded.length = 0;
    await click(host.querySelector("#book-detail-download-translated-btn"));
    assert.equal(downloaded.length, 1);
    assert.equal(downloaded[0].url, "/api/v1/jobs/job-1/pdf");
  });

  it("设置里换一档清晰度，下次下载就跟着变", async () => {
    await click(host.querySelector("#book-detail-download-settings-btn"));
    const option = dom.window.document.querySelector("#book-detail-export-dpi-300");
    assert.ok(option, "设置对话框里没有清晰度选项");
    await click(option);
    assert.equal(option.getAttribute("aria-checked"), "true", "选了却没选中");

    downloaded.length = 0;
    await click(host.querySelector("#book-detail-download-word-btn"));
    assert.equal(downloaded.length, 1, "没有触发下载");
    assert.ok(downloaded[0].url.endsWith("?dpi=300"), downloaded[0].url);
  });
});
