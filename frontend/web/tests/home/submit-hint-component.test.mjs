import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// ProcessingChoicePanel：提交按钮常显 + 禁用原因与下一步指引行。

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/index.html" });
for (const key of ["window", "document", "DocumentFragment", "HTMLElement", "HTMLButtonElement", "HTMLFormElement", "HTMLInputElement", "CustomEvent", "Event", "KeyboardEvent", "MouseEvent", "Node", "MutationObserver", "NodeFilter"]) {
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

const { createRoot } = await import("react-dom/client");
const React = await import("react");
const { ProcessingChoicePanel } = await import("../../src/features/ingest/ui/components/upload/ProcessingChoicePanel.jsx");
const { APP_EVENTS } = await import("@/platform/contracts/app-contract.js");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, description) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await wait(15);
  }
  assert.fail(`等待超时：${description}`);
}

function baseProps(overrides = {}) {
  return {
    visible: true,
    uploadReady: false,
    submitBusy: false,
    submitDisabled: true,
    submitLabel: "直接翻译",
    ocrOnly: false,
    pageRangeButtonVisible: true,
    pageRangeOpen: false,
    onToggleTranslationOptions: () => {},
    onStoreOnly: () => {},
    translationOptionsSlot: null,
    ...overrides,
  };
}

async function renderPanel(props) {
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  root.render(React.createElement(ProcessingChoicePanel, props));
  await waitFor(() => host.querySelector("#submit-btn") !== null, "提交按钮渲染");
  await wait(0);
  return { host, root };
}

test("缺文件：按钮禁用但可见，hint 指引选择文件并可一键打开", async () => {
  const fileInput = dom.window.document.createElement("input");
  fileInput.id = "file";
  fileInput.type = "file";
  dom.window.document.body.appendChild(fileInput);
  let fileClicked = 0;
  fileInput.click = () => { fileClicked += 1; };

  const { host, root } = await renderPanel(baseProps());
  const submitBtn = host.querySelector("#submit-btn");
  assert.equal(submitBtn.disabled, true);
  assert.match(submitBtn.getAttribute("title") || "", /选择 PDF/);
  assert.equal(submitBtn.getAttribute("aria-describedby"), "submit-hint");

  const hint = host.querySelector("#submit-hint");
  assert.ok(hint, "禁用时有一行明确文案");
  assert.match(hint.textContent, /选择 PDF/);

  hint.querySelector(".submit-hint-action").dispatchEvent(
    new dom.window.MouseEvent("click", { bubbles: true }),
  );
  await wait(0);
  assert.equal(fileClicked, 1, "hint 动作把用户带到文件选择");

  root.unmount();
  host.remove();
  fileInput.remove();
});

test("已上传被拦：hint 指引补凭据并可一键打开设置", async () => {
  const { host, root } = await renderPanel(baseProps({ uploadReady: true, submitDisabled: true }));
  const submitBtn = host.querySelector("#submit-btn");
  assert.equal(submitBtn.disabled, true);
  assert.match(submitBtn.getAttribute("title") || "", /接口设置/);

  const hint = host.querySelector("#submit-hint");
  assert.ok(hint);
  assert.match(hint.textContent, /接口设置/);
  assert.match(hint.textContent, /术语表/);

  let settingsOpened = 0;
  const onOpen = () => { settingsOpened += 1; };
  dom.window.document.addEventListener(APP_EVENTS.openBrowserCredentials, onOpen);
  hint.querySelector(".submit-hint-action").dispatchEvent(
    new dom.window.MouseEvent("click", { bubbles: true }),
  );
  await wait(0);
  dom.window.document.removeEventListener(APP_EVENTS.openBrowserCredentials, onOpen);
  assert.equal(settingsOpened, 1, "hint 动作把用户带到凭据设置");

  root.unmount();
  host.remove();
});

test("可提交时：无 hint，按钮文案与 title 保持原样", async () => {
  const { host, root } = await renderPanel(baseProps({ uploadReady: true, submitDisabled: false }));
  const submitBtn = host.querySelector("#submit-btn");
  assert.equal(submitBtn.disabled, false);
  assert.equal(submitBtn.getAttribute("aria-describedby"), null);
  assert.equal(host.querySelector("#submit-hint"), null);
  assert.match(submitBtn.textContent.trim(), /直接翻译/);

  root.unmount();
  host.remove();
});
