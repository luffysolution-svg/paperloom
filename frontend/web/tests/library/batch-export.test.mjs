import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/index.html" });
for (const key of ["window", "document", "DocumentFragment", "HTMLElement", "HTMLButtonElement", "HTMLInputElement", "CustomEvent", "Event", "KeyboardEvent", "MouseEvent", "Node", "MutationObserver", "NodeFilter"]) {
  Object.defineProperty(globalThis, key, { value: dom.window[key], writable: true, configurable: true });
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { act } = React;
const { createRoot } = await import("react-dom/client");
const { BatchExportDialog } = await import("../../src/features/library/ui/page/BatchExportDialog.tsx");

test("batch export offers five formats and retains partial results for a failed download retry", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const calls = [];
  let shouldFailDownload = true;
  const client = {
    pickDestination: async () => null,
    export: async (...args) => {
      calls.push(args);
      return { name: "paperloom-export-test.zip", exported: 1, failed: 1, items: [
        { document_id: "one", title: "One", folder: "one", message: null },
        { document_id: "two", title: "Two", folder: null, message: "请先完成翻译" },
      ] };
    },
    download: async (_name, _destination, progress) => { progress(10, 100); if (shouldFailDownload) throw new Error("网络中断"); },
  };
  const button = (text) => [...document.querySelectorAll("button")].find((node) => node.textContent === text);
  try {
    await act(async () => root.render(React.createElement(BatchExportDialog, { open: true, onOpenChange() {}, documentIds: ["one", "two"], client })));
    const select = document.querySelector("select");
    assert.deepEqual([...select.options].map((option) => option.value), ["translated", "comparison", "source", "markdown", "obsidian"]);
    await act(async () => { select.value = "obsidian"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    await act(async () => document.querySelector('input[type="checkbox"]').click());
    await act(async () => button("导出 ZIP").click());
    assert.deepEqual(calls, [[["one", "two"], "obsidian", false]]);
    assert.match(document.body.textContent, /已导出 1 篇，1 篇未导出/);
    assert.match(document.body.textContent, /Two：请先完成翻译/);
    assert.match(document.querySelector('[role="alert"]').textContent, /网络中断/);
    shouldFailDownload = false;
    await act(async () => button("重新下载导出包").click());
    assert.equal(calls.length, 1);
    assert.match(document.body.textContent, /导出包已下载/);
    assert.equal(document.querySelector('[role="alert"]'), null);
  } finally { await act(async () => root.unmount()); host.remove(); }
});
