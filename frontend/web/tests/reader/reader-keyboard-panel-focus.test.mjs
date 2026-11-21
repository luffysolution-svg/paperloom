/** 焦点在阅读辅助面板（Markdown / AI 等 dock 面板）里时，全局快捷键不翻 PDF。
 *
 * # 起因
 *
 * use-reader-keyboard 只放过 input / textarea / contenteditable。Markdown 面板的块是
 * tabIndex=0 的 div，AI 回答区也是普通可滚动容器 —— 焦点在它们上按 ↓ / PgDn / Home /
 * End，全局监听把键拦下去翻 PDF（实测 focus 一个 md 块按两次 ↓，PDF 从 1/48 跳到
 * 3/48，面板 scrollTop 不动；End 直接跳到第 48 页）。
 *
 * 这里真驱动 hook（jsdom + act），对 `.reader-notes-panel`（所有 dock 面板共用的壳，
 * 见 ReaderPanelShell）里外各派发键盘事件。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { useReaderKeyboard } from "../../../../frontend/packages/reader/src/hooks/use-reader-keyboard.ts";
import { installReaderDom } from "../helpers/dom.mjs";

async function mountKeyboard() {
  const calls = { pages: [], modes: [], zooms: [] };
  const mount = document.createElement("div");
  document.getElementById("root").appendChild(mount);
  const root = createRoot(mount);
  function Harness() {
    useReaderKeyboard({
      mode: "compare",
      sourceOnly: false,
      setMode: (mode) => calls.modes.push(mode),
      userZoom: 0.5,
      onZoomChange: (zoom) => calls.zooms.push(zoom),
      currentPage: 1,
      numPages: 48,
      goToPage: (page) => calls.pages.push(page),
    });
    return null;
  }
  await act(async () => root.render(createElement(Harness)));
  return { root, calls };
}

function buildPanel() {
  const panel = document.createElement("aside");
  panel.className = "reader-notes-panel reader-notes-panel--workspace";
  const body = document.createElement("div");
  body.className = "reader-notes-panel-body";
  const block = document.createElement("div");
  block.className = "reader-md-block";
  block.tabIndex = 0;
  body.appendChild(block);
  panel.appendChild(body);
  document.body.appendChild(panel);
  return { panel, body, block };
}

function press(target, key) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

test("正对照：焦点不在面板里时，↓ / End / 3 照旧翻 PDF、切模式", async () => {
  const env = installReaderDom({ extraKeys: ["KeyboardEvent"] });
  try {
    const { root, calls } = await mountKeyboard();
    const outside = document.createElement("div");
    outside.tabIndex = 0;
    document.body.appendChild(outside);
    assert.equal(press(outside, "ArrowDown").defaultPrevented, true);
    press(outside, "End");
    press(outside, "3");
    assert.deepEqual(calls.pages, [2, 48]);
    assert.deepEqual(calls.modes, ["translated"]);
    root.unmount();
  } finally {
    env.restore();
  }
});

test("焦点在 Markdown 块上：↓ / PgDn / Home / End 不翻 PDF、不 preventDefault（留给面板自己滚）", async () => {
  const env = installReaderDom({ extraKeys: ["KeyboardEvent"] });
  try {
    const { root, calls } = await mountKeyboard();
    const { block, body } = buildPanel();
    for (const key of ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", "j", "k"]) {
      const event = press(block, key);
      assert.equal(event.defaultPrevented, false, `${key} 被全局快捷键拦下了，面板滚不动`);
    }
    // 面板正文（AI 回答区之类的可滚动容器本身）上也一样。
    press(body, "ArrowDown");
    assert.deepEqual(calls.pages, [], "焦点在面板里却翻了 PDF");
    root.unmount();
  } finally {
    env.restore();
  }
});

test("焦点在面板里：模式 / 缩放快捷键也不处理", async () => {
  const env = installReaderDom({ extraKeys: ["KeyboardEvent"] });
  try {
    const { root, calls } = await mountKeyboard();
    const { block } = buildPanel();
    for (const key of ["1", "2", "3", "+", "-", "0"]) press(block, key);
    assert.deepEqual(calls.modes, []);
    assert.deepEqual(calls.zooms, []);
    root.unmount();
  } finally {
    env.restore();
  }
});
