import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";

// CollectionsView 已迁至 src/features/collections 并改为 props 注入：
// 不再需要 HomeServicesProvider 包裹，依赖直接传入。
import { CollectionsView } from "../../src/features/collections/ui/CollectionsView.js";
import { deferred, waitFor } from "../helpers/async.mjs";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "http://localhost/index.html",
  });
  for (const key of ["window", "document", "HTMLElement", "Node", "MutationObserver"]) {
    Object.defineProperty(globalThis, key, {
      value: dom.window[key] ?? dom.window,
      configurable: true,
      writable: true,
    });
  }
  globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  return dom;
}

function versionSignal(version = 1) {
  const snapshot = Object.freeze({ version });
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    actions: { bump() {} },
  };
}

function renderCollections(dom, listCollections) {
  const props = {
    controller: {
      listCollections,
      fetchFolderBooks: async () => [],
    },
    dialogStore: { open() {} },
    // Reproduce the bug: this view mounts after a previous collection edit,
    // so the shared version is already non-zero although this instance has
    // never completed its initial request.
    reloadSignal: versionSignal(3),
    libraryActions: {
      openJobReader() {},
      openSourceReader() {},
      selectJob() {},
      openBookDetail() {},
    },
  };
  const root = createRoot(dom.window.document.getElementById("root"));
  root.render(React.createElement(CollectionsView, props));
  return root;
}

test("合集首次挂载时即使刷新版本非零，也会在请求完成后退出 loading", async () => {
  const dom = installDom();
  const request = deferred();
  const root = renderCollections(dom, () => request.promise);

  await waitFor(
    () => dom.window.document.body.textContent.includes("正在加载合集…"),
    "未进入合集首屏 loading",
  );
  request.resolve({ collections: [] });
  await waitFor(
    () => !dom.window.document.body.textContent.includes("正在加载合集…"),
    "合集请求完成后仍停留在 loading",
  );
  assert.ok(dom.window.document.getElementById("categories-empty"));
  root.unmount();
});

test("合集首次请求失败也会退出 loading 并显示错误", async () => {
  const dom = installDom();
  const request = deferred();
  let requestStarted = false;
  const root = renderCollections(dom, () => {
    requestStarted = true;
    return request.promise;
  });

  await waitFor(
    () => requestStarted,
    "合集首次请求没有开始",
  );
  request.reject(new Error("合集服务暂不可用"));
  await waitFor(
    () => dom.window.document.body.textContent.includes("合集服务暂不可用"),
    "请求失败后没有显示合集错误",
  );
  assert.doesNotMatch(dom.window.document.body.textContent, /正在加载合集/);
  root.unmount();
});

test("首次请求失败后切走（卸载），自动重试的定时器跟着取消，不再发请求", async () => {
  const dom = installDom();
  let calls = 0;
  const root = renderCollections(dom, async () => {
    calls += 1;
    throw new Error("合集服务暂不可用");
  });
  await waitFor(() => calls === 1, "合集首次请求没有开始");
  await new Promise((resolve) => setTimeout(resolve, 20));
  root.unmount();
  // 自动重试排在 1.5 秒后
  await new Promise((resolve) => setTimeout(resolve, 1700));
  assert.equal(calls, 1, "卸载后不该再发自动重试的请求");
});
