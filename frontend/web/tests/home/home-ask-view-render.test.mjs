/**
 * 真的把 HomeAskView 渲染出来。
 *
 * 之前没有任何测试渲染过这个组件——纯逻辑（引用块、消息树、分支导航）各自有测试，
 * 但「这些东西在页面上摆成什么样」没人看过。代价是一个重复渲染的「引用」浮层按钮
 * 一路进了发布产物：两个一模一样的 <button> 逐像素重合，阴影叠了两层，而全套
 * 1816 条测试没有一条会数它。
 *
 * 所以这里钉的是**元素的个数与身份**，不是某个纯函数的返回值。
 */

import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { describe, it, before, after } from "node:test";

const dom = new JSDOM("<!doctype html><body></body>", {
  url: "http://localhost/index.html", pretendToBeVisual: true,
});
for (const key of [
  "window", "document", "HTMLElement", "HTMLButtonElement", "HTMLTextAreaElement",
  "Node", "Event", "CustomEvent", "MouseEvent", "KeyboardEvent", "PointerEvent",
  "DocumentFragment", "MutationObserver", "NodeFilter", "Range",
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
// 选区 hook 读的是 globalThis.getSelection（不是 window 上那个）。少了这一行，
// 浮层在 jsdom 里永远出不来——这条测试会安静地变成摆设。
globalThis.getSelection = dom.window.getSelection.bind(dom.window);
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.matchMedia = () => ({
  matches: false, addEventListener() {}, removeEventListener() {},
  addListener() {}, removeListener() {},
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom 不实现 Element.scrollTo，而跟随底部的 hook 会调它（真浏览器里有）。
if (!dom.window.Element.prototype.scrollTo) {
  dom.window.Element.prototype.scrollTo = function scrollTo() {};
}
// jsdom 不做布局，getBoundingClientRect 一律返回全 0；而选区 hook 有一条
// 「零尺寸的选区不算数」的守卫（真浏览器里那是折叠选区）。给 Range 一个非零矩形，
// 否则浮层在 jsdom 里永远出不来，这条测试就成了摆设。
dom.window.Range.prototype.getBoundingClientRect = function getBoundingClientRect() {
  return { x: 100, y: 200, left: 100, top: 200, right: 260, bottom: 218, width: 160, height: 18 };
};

// 视图挂载时会拿 localStorage 里的粘性会话 id 去 hydrate。必须让它**真的加载出线程**
// ——空态走的是 hero 布局，根本没有可选文字，测不到浮层。
const CONVERSATION_ID = "conv-render-test";
dom.window.localStorage.setItem("retainpdf.home.ai.conversation.v1", CONVERSATION_ID);

const DETAIL = {
  conversation_id: CONVERSATION_ID,
  title: "渲染测试",
  head_id: "a1",
  messages: [
    { message_id: "u1", role: "user", content: "一个问题", parent_id: "" },
    { message_id: "a1", role: "assistant", content: "一段回答的正文，用来划选。", parent_id: "u1" },
  ],
};

const envelope = (data) => new Response(
  JSON.stringify({ code: 0, message: "ok", data }),
  { status: 200, headers: { "Content-Type": "application/json" } },
);

Object.defineProperty(globalThis, "fetch", {
  configurable: true, writable: true,
  value: async (input) => {
    const url = `${typeof input === "string" ? input : input?.url || ""}`;
    if (new RegExp(`/conversations/${CONVERSATION_ID}`).test(url)) return envelope(DETAIL);
    if (/\/conversations(\?|$)/.test(url)) return envelope({ conversations: [] });
    return envelope({});
  },
});

const React = await import("react");
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { HomeAskView } = await import("../../src/features/ask/ui/HomeAskView.tsx");
const { HomeCredentialsStatePortContext } = await import(
  "../../src/ui/context/home-services-context.tsx"
);

/** HomeAskView 只用到凭据这一个窄口，挂它一个就够，不必立起整个 shell。 */
const credentialsPort = {
  store: {
    getSnapshot: () => ({}),
    subscribe: () => () => {},
  },
};

let host;
let root;

before(async () => {
  host = dom.window.document.createElement("div");
  dom.window.document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root.render(React.createElement(
      HomeCredentialsStatePortContext.Provider,
      { value: credentialsPort },
      React.createElement(HomeAskView),
    ));
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 120)); });
});

after(() => { act(() => root.unmount()); host.remove(); });

/** 在线程里造一个选区并告知 hook（它听的是 pointerup）。 */
async function selectInThread(text) {
  const container = host.querySelector(".home-ask-scroll");
  // 没有线程容器就是这条测试的前提没立住，必须失败而不是悄悄跳过。
  assert.ok(container, "线程没有加载出来，浮层根本没机会出现");
  const node = dom.window.document.createTextNode(text);
  const holder = dom.window.document.createElement("p");
  holder.append(node);
  container.append(holder);
  const range = dom.window.document.createRange();
  range.setStart(node, 0);
  range.setEnd(node, text.length);
  const selection = dom.window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  await act(async () => {
    dom.window.document.dispatchEvent(new dom.window.Event("pointerup", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));
  });
  return true;
}

describe("HomeAskView 渲染", () => {
  it("挂得起来", () => {
    assert.ok(host.querySelector("#home-ask-view"), "视图没有渲染");
  });

  it("线程真的加载出来了——不然下面那条测不到东西", () => {
    assert.ok(host.querySelector(".home-ask-scroll"), "没有线程容器");
    assert.ok(
      host.textContent.includes("一段回答的正文"),
      "回答没有渲染出来",
    );
  });

  it("选中线程里的文字只浮出一个「引用」按钮", async () => {
    // 这条是为那次重复渲染写的：两个按钮同坐标叠着，肉眼只看得出阴影偏重。
    await selectInThread("用来触发引用浮层的一段文字");
    const floats = host.querySelectorAll(".home-ask-quote-float");
    assert.equal(floats.length, 1, `浮出了 ${floats.length} 个引用按钮`);
  });

  it("没有选区时不留浮层", async () => {
    dom.window.getSelection().removeAllRanges();
    // hook 在 pointerup 之后延一拍再读选区（拖选过程中 selectionchange 会连发），
    // 所以这里也要等那一拍，否则读到的还是上一条用例留下的浮层。
    await act(async () => {
      dom.window.document.dispatchEvent(new dom.window.Event("pointerup", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
    });
    assert.equal(host.querySelectorAll(".home-ask-quote-float").length, 0);
  });
});
