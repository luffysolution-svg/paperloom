import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { waitFor } from "../helpers/async.mjs";
import { byId, clickWithMouseDown } from "../helpers/dom.mjs";
import { bootHomeApp } from "../helpers/home-app.mjs";

// 主页发现性 P0 回归：任务中心可达入口、sonner 宿主、空态 CTA、Ask 解锁。
// Ask 输入条解锁的组件级断言见 home-ask-composer-split.test.mjs；
// deriveLibraryPageState 原形状断言见 tests/library/library-page-state.test.mjs（未改动）。

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/index.html" });
for (const key of ["window", "document", "DocumentFragment", "HTMLElement", "HTMLButtonElement", "HTMLFormElement", "HTMLInputElement", "HTMLTextAreaElement", "CustomEvent", "Event", "KeyboardEvent", "MouseEvent", "Node", "MutationObserver", "NodeFilter", "navigator"]) {
  try {
    Object.defineProperty(globalThis, key, {
      value: dom.window[key] ?? globalThis[key],
      writable: true,
      configurable: true,
    });
  } catch {
    /* 只读键忽略 */
  }
}
globalThis.window = dom.window;
globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const { createHomeComposition } = await import("../../src/app/home/create-home-composition.js");
const { HomeApp } = await import("../../src/app/home/HomeApp.jsx");
const { deriveLibraryEmptyAction } = await import("../../src/features/library/domain/library-page-state.js");

function createServices() {
  return createHomeComposition({
    fetchGlossaries: async () => ({ items: [] }),
    loadPersistedDeveloperConfig: () => ({}),
    loadPersistedBrowserConfig: () => ({}),
  });
}

const mountHome = (hostId) => bootHomeApp(dom, { services: createServices(), hostId });

function unmountHome({ host, root, services }) {
  root.unmount();
  services.dispose();
  host.remove();
}

test("空态 CTA 推导：新库去上传，有搜索词清搜索", () => {
  assert.equal(deriveLibraryEmptyAction({}), "upload");
  assert.equal(deriveLibraryEmptyAction({ query: "" }), "upload");
  assert.equal(deriveLibraryEmptyAction({ query: "  " }), "upload");
  assert.equal(deriveLibraryEmptyAction({ query: "quantum" }), "clear-search");
});

test("主页：底部任务入口可达，打开/返回挂载切换", async () => {
  const mounted = await mountHome("home-discover-tasks");
  try {
    assert.equal(byId(dom, "task-center-view"), null, "默认不挂载任务中心");
    const entry = byId(dom, "home-task-center-btn");
    assert.ok(entry, "主页底部应有任务中心入口 #home-task-center-btn");
    assert.equal(entry.getAttribute("aria-label"), "任务中心");

    clickWithMouseDown(dom, entry);
    await waitFor(() => byId(dom, "task-center-view") !== null, "点击入口后任务中心挂载");
    assert.ok(byId(dom, "task-center-back-btn"), "任务浮层应有返回按钮");

    clickWithMouseDown(dom, byId(dom, "task-center-back-btn"));
    await waitFor(() => byId(dom, "task-center-view") === null, "返回后任务中心卸载");
    assert.ok(byId(dom, "library-view"), "返回后图书馆视图恢复");
  } finally {
    unmountHome(mounted);
  }
});

test("主页：sonner 宿主常驻（任务中心取消/重试 toast 经它渲染）", async () => {
  const mounted = await mountHome("home-discover-toaster");
  try {
    // DownloadToastHost 内含唯一的 <Toaster/>；TaskCenter 不自带宿主以免双宿主重影。
    // 注：本仓库 sonner 版本渲染的宿主是 section[aria-label^=Notifications]（无 data-sonner-toaster）。
    const hostOf = () => dom.window.document.querySelector('section[aria-label^="Notifications"]');
    await waitFor(() => hostOf() !== null, "sonner Toaster 宿主挂载");
    const { toast } = await import("sonner");
    toast.success("任务中心 toast 探测");
    await waitFor(
      () => hostOf() && hostOf().textContent.includes("任务中心 toast 探测"),
      "经共享宿主渲染 toast.success",
    );
    toast.dismiss();
  } finally {
    unmountHome(mounted);
  }
});

test("主页：搜索有词时底部出现清搜索，点后回到全量", async () => {
  const mounted = await mountHome("home-discover-clear");
  try {
    await waitFor(() => byId(dom, "library-search-input") !== null, "图书馆搜索框挂载");
    assert.equal(byId(dom, "library-search-clear-btn"), null, "无搜索词时不清搜索按钮");

    mounted.services.library.viewPort.store.actions.setQuery("quantum");
    await waitFor(() => byId(dom, "library-search-clear-btn") !== null, "有搜索词时清搜索按钮出现");
    assert.equal(byId(dom, "library-search-input").value, "quantum");

    clickWithMouseDown(dom, byId(dom, "library-search-clear-btn"));
    await waitFor(() => byId(dom, "library-search-input").value === "", "点击后搜索框清空");
    await waitFor(() => byId(dom, "library-search-clear-btn") === null, "清空后按钮消失");
  } finally {
    unmountHome(mounted);
  }
});
