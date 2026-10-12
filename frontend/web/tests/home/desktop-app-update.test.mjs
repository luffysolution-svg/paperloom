import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const key of ["window", "document", "DocumentFragment", "HTMLElement", "HTMLButtonElement", "HTMLInputElement", "CustomEvent", "Event", "KeyboardEvent", "MouseEvent", "Node", "MutationObserver", "NodeFilter"]) {
  Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true, writable: true });
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { createAppUpdateViewFeature, mountAppUpdateFeature, AppUpdateBanner } = await import("../../src/features/app-update/index.js");

test("desktop update events show progress and installation controls; disposed homes release subscriptions", async () => {
  const view = createAppUpdateViewFeature();
  let event, unsubscribed = false;
  const calls = [];
  const base = { currentVersion: "0.1.7", latestVersion: "v0.2.0", mode: "portable", title: "PaperLoom 0.2.0", body: "changes" };
  const feature = mountAppUpdateFeature({
    enabled: false,
    desktopUpdater: {
      invoke: async (command) => { calls.push(command); return { ...base, status: "available" }; },
      subscribe: (callback) => { event = callback; return () => { unsubscribed = true; }; },
    },
    viewPort: view.viewPort,
  });
  await React.act(async () => { await feature.checkForUpdates({ manual: true }); });
  assert.ok(calls.includes("check_app_update"), "manual checking is enabled independently of startup auto checking");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await React.act(async () => { root.render(React.createElement(AppUpdateBanner, { view, handlersRef: view.handlersRef })); });
  await React.act(async () => { document.getElementById("app-update-btn").click(); });
  assert.equal(document.getElementById("app-update-download-btn")?.textContent, "下载更新");
  await React.act(async () => { event({ ...base, status: "downloading", percent: 42 }); });
  assert.equal(document.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow"), "42");
  assert.ok(document.getElementById("app-update-cancel-btn"));
  assert.equal(document.getElementById("app-update-check-btn").disabled, true);
  await React.act(async () => { event({ ...base, status: "downloaded", percent: 100 }); });
  assert.equal(document.getElementById("app-update-install-btn")?.textContent, "重启并更新");
  await React.act(async () => { document.getElementById("app-update-install-btn").click(); });
  assert.ok(calls.includes("install_app_update"));
  await React.act(async () => { event({ ...base, status: "downloaded", mode: "mac", error: "请退出并替换应用" }); });
  assert.equal(document.getElementById("app-update-install-btn")?.textContent, "打开安装包");
  assert.match(document.getElementById("app-update-dialog").textContent, /请退出并替换应用/);
  feature.dispose();
  assert.equal(unsubscribed, true);
  await React.act(async () => { root.unmount(); });
  host.remove();
});

test("desktop bridge failures remain visible and allow a new check", async () => {
  const view = createAppUpdateViewFeature();
  const feature = mountAppUpdateFeature({ enabled: false, viewPort: view.viewPort,
    desktopUpdater: { invoke: async () => { throw new Error("connection failed"); }, subscribe: () => () => {} },
  });
  await feature.checkForUpdates({ manual: true });
  assert.equal(view.store.getSnapshot().buttonState, "error");
  assert.match(view.store.getSnapshot().statusText, /connection failed/);
  feature.dispose();
});

test("late initial bridge errors cannot replace a newer download progress event", async () => {
  const view = createAppUpdateViewFeature();
  let event, rejectInitial;
  const initial = new Promise((_resolve, reject) => { rejectInitial = reject; });
  const feature = mountAppUpdateFeature({ enabled: false, viewPort: view.viewPort,
    desktopUpdater: { invoke: () => initial, subscribe: (callback) => { event = callback; return () => {}; } },
  });
  event({ status: "downloading", mode: "portable", percent: 42 });
  rejectInitial(new Error("old failed request"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(view.store.getSnapshot().buttonState, "downloading");
  feature.dispose();
});

test("a previous failed update remains visible until the user explicitly checks again", async () => {
  const view = createAppUpdateViewFeature();
  const previousTimer = window.setTimeout;
  let tick;
  window.setTimeout = (callback) => { tick = callback; return 1; };
  const calls = [];
  const feature = mountAppUpdateFeature({ enabled: true, viewPort: view.viewPort,
    desktopUpdater: {
      invoke: async (command) => { calls.push(command); return { status: command === "get_app_update_state" ? "error" : "available", error: "last install failed" }; },
      subscribe: () => () => {},
    },
  });
  try {
    await new Promise((resolve) => setTimeout(resolve, 0));
    tick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(calls, ["get_app_update_state"]);
    assert.match(view.store.getSnapshot().statusText, /last install failed/);
    await feature.checkForUpdates({ manual: true });
    assert.ok(calls.includes("check_app_update"));
  } finally { feature.dispose(); window.setTimeout = previousTimer; }
});
