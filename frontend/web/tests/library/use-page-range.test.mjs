import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// usePageRange：换文档（弹窗不关）要重置并回填新 pageCount，关闭要清空。

function makeDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/index.html",
  });
  for (const key of [
    "window",
    "document",
    "DocumentFragment",
    "HTMLElement",
    "HTMLButtonElement",
    "HTMLFormElement",
    "HTMLInputElement",
    "CustomEvent",
    "Event",
    "KeyboardEvent",
    "MouseEvent",
    "Node",
    "MutationObserver",
    "NodeFilter",
  ]) {
    Object.defineProperty(globalThis, key, {
      value: dom.window[key] ?? dom.window,
      writable: true,
      configurable: true,
    });
  }
  globalThis.window = dom.window;
  globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  return dom;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, description) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await wait(10);
  }
  assert.fail(`等待超时：${description}`);
}

test("usePageRange：换文档重置并回填新 pageCount；关闭清空；越界夹紧", async () => {
  makeDom();
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { usePageRange } = await import("../../src/features/book-detail/ui/use-page-range.js");

  const host = globalThis.document.createElement("div");
  globalThis.document.body.appendChild(host);
  const root = createRoot(host);
  let api = null;
  function Harness(props) {
    api = usePageRange(props);
    return React.createElement("span", null, `${api.rangeOn}|${api.startPage}|${api.endPage}`);
  }
  const render = (props) => root.render(React.createElement(Harness, props));

  render({ open: true, documentId: "doc-a", pageCount: 10 });
  await waitFor(() => api?.endPage === "10", "首本文档回填 endPage");

  // 换文档（弹窗不关）：重置并回填新 pageCount
  render({ open: true, documentId: "doc-b", pageCount: 5 });
  await waitFor(
    () => api?.endPage === "5" && api?.startPage === "1" && api?.rangeOn === false,
    "换文档重置并回填新 pageCount",
  );

  // pageCount 迟到：先 0 后 N
  render({ open: true, documentId: "doc-c", pageCount: 0 });
  await waitFor(() => api?.endPage === "", "新文档 pageCount 未到时 endPage 为空");
  render({ open: true, documentId: "doc-c", pageCount: 7 });
  await waitFor(() => api?.endPage === "7", "pageCount 迟到后回填");

  // 用户清空 endPage 后，无关重渲不得回填
  api.setEndPage("");
  render({ open: true, documentId: "doc-c", pageCount: 7 });
  await waitFor(() => api?.endPage === "", "用户清空后不回填");

  // pageCount 收缩 + rangeOn 时夹紧越界页码
  api.setRangeOn(true);
  api.setEndPage("150");
  api.setStartPage("120");
  render({ open: true, documentId: "doc-c", pageCount: 50 });
  await waitFor(() => api?.endPage === "50" && api?.startPage === "50", "pageCount 收缩夹紧越界页码");

  // 关闭清空
  render({ open: false, documentId: "doc-c", pageCount: 50 });
  await waitFor(
    () => api?.endPage === "" && api?.startPage === "1" && api?.rangeOn === false,
    "关闭清空",
  );

  root.unmount();
  host.remove();
});
