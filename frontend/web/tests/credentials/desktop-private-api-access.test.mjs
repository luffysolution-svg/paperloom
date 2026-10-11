import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let enabled = false;
let rejectSave = false;
let resumeSave;
const saves = [];
window.retainPdfDesktop = {
  invoke() {},
  loadDesktopConfig: async () => ({ allowPrivateProviderUrls: enabled }),
  saveDesktopConfig: async (payload) => {
    if (rejectSave) throw new Error("disk unavailable");
    await new Promise((resolve) => { resumeSave = resolve; });
    saves.push(payload);
    enabled = payload.allowPrivateProviderUrls;
    return { allowPrivateProviderUrls: enabled };
  },
};
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { DesktopPrivateApiAccess } = await import("../../src/features/credentials/ui/DesktopPrivateApiAccess.jsx");

test("desktop local API switch requires an explicit click and reports restart and save failures", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await React.act(async () => { root.render(React.createElement(DesktopPrivateApiAccess)); });
    const checkbox = container.querySelector("input");
    assert.equal(checkbox.checked, false);
    assert.equal(saves.length, 0);
    React.act(() => { checkbox.click(); });
    assert.equal(checkbox.checked, true, "the pending save should reflect the user's selection immediately");
    assert.equal(checkbox.disabled, true);
    await React.act(async () => { resumeSave(); });
    assert.deepEqual(saves, [{ allowPrivateProviderUrls: true }]);
    assert.equal(checkbox.checked, true);
    assert.match(container.querySelector('[role="status"]').textContent, /重启/);
    rejectSave = true;
    await React.act(async () => { checkbox.click(); });
    assert.equal(checkbox.checked, true, "failed saves must keep the persisted permission");
    assert.match(container.querySelector('[role="status"]').textContent, /保存失败/);
  } finally {
    await React.act(async () => { root.unmount(); });
    container.remove();
  }
});
