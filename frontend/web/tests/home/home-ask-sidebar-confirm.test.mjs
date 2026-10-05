import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// 组件动态导入：必须晚于全局 jsdom 变量就位（静态 import 会抢跑）。

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/index.html",
});
for (const key of ["window", "document", "DocumentFragment", "HTMLElement", "HTMLButtonElement", "HTMLFormElement", "HTMLInputElement", "HTMLSelectElement", "HTMLTextAreaElement", "Node", "MutationObserver", "NodeFilter", "CustomEvent", "Event", "MouseEvent", "KeyboardEvent", "getComputedStyle"]) {
  Object.defineProperty(globalThis, key, {
    value: key === "getComputedStyle" ? dom.window.getComputedStyle.bind(dom.window) : (dom.window[key] ?? dom.window),
    writable: true,
    configurable: true,
  });
}
globalThis.window = dom.window;
globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

async function mountSidebar({ onDelete }) {
  const { createRoot } = await import("react-dom/client");
  const React = await import("react");
  const { HomeAskSidebar } = await import("../../src/features/ask/ui/HomeAskSidebar.jsx");
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  root.render(
    React.createElement(HomeAskSidebar, {
      sessions: [{ id: "s1", title: "连通性验证", updatedAt: new Date().toISOString() }],
      activeId: "s1",
      onNew: () => {},
      onSelect: () => {},
      onDelete,
      onRename: () => {},
    }),
  );
  return { root, host };
}

async function waitFor(predicate, description) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  assert.fail(`等待超时：${description}`);
}

function click(element) {
  element.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
  element.dispatchEvent(new dom.window.MouseEvent("mouseup", { bubbles: true, button: 0 }));
  element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
}

test("侧栏删除先弹确认框，确认后才调 onDelete", async () => {
  const deleted = [];
  const { root, host } = await mountSidebar({ onDelete: (id) => deleted.push(id) });
  try {
    await waitFor(
      () => host.querySelector(".home-ask-sidebar-del") !== null,
      "删除按钮渲染",
    );
    click(host.querySelector(".home-ask-sidebar-del"));
    await waitFor(
      () => dom.window.document.getElementById("home-ask-delete-confirm") !== null,
      "删除确认框打开",
    );
    assert.equal(deleted.length, 0, "确认前不删除");
    click(dom.window.document.getElementById("home-ask-delete-confirm-confirm"));
    await waitFor(() => deleted.length === 1, "确认后删除");
    assert.deepEqual(deleted, ["s1"]);
  } finally {
    root.unmount();
    host.remove();
  }
});
