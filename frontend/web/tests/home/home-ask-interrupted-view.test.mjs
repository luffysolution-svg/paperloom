/**
 * 被中断的回答在界面上长什么样、能往哪走。
 *
 * 此前中断根本没有界面表达：正文尾巴上拼一句 Markdown 斜体 `_（已停止生成）_` 就算
 * 标记完了。那句标记在气泡**里面**，于是「复制」会把它一起抄走，划选引用也会把它带进
 * 下一个问题，而真正需要它的地方——「这条回答没写完」这个事实——反倒只是一行看起来
 * 像正文的斜体。
 *
 * 这里钉三件事：标识在气泡外面、复制抄的是干净正文、三个出口（保留 / 重新生成 /
 * 改写提问）都摆得出来。
 */

import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { describe, it, beforeEach } from "node:test";

const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/index.html" });
for (const key of [
  "window", "document", "DocumentFragment", "HTMLElement", "HTMLButtonElement",
  "Node", "Event", "CustomEvent", "MouseEvent", "KeyboardEvent", "MutationObserver", "NodeFilter",
]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key] ?? dom.window, writable: true, configurable: true,
  });
}
globalThis.window = dom.window;
globalThis.localStorage = dom.window.localStorage;
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const clipboardWrites = [];
Object.defineProperty(dom.window.navigator, "clipboard", {
  value: { writeText: (text) => { clipboardWrites.push(text); return Promise.resolve(); } },
  configurable: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator, writable: true, configurable: true,
});

const React = await import("react");
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { HomeAskThread } = await import("../../src/features/ask/ui/HomeAskThread.tsx");

/**
 * 两轮：第一轮答完，第二轮被中断。
 * 第二轮的 content 带「@ 范围」后缀、rawQuestion 是用户敲的原文——两者必须不同，
 * 否则「编辑框回填用哪个」这条分辨不出来。
 */
const INTERRUPTED_TURNS = [
  { id: "u1", role: "user", content: "第一轮问题", rawQuestion: "第一轮问题" },
  { id: "a1", role: "assistant", content: "第一轮回答", status: "complete", parentId: "u1" },
  {
    id: "u2",
    role: "user",
    content: "第二轮问题\n\n@某文档",
    rawQuestion: "第二轮问题",
    parentId: "a1",
  },
  { id: "a2", role: "assistant", content: "刚写了一半", status: "cancelled", parentId: "u2" },
];

function render(props = {}) {
  const host = dom.window.document.createElement("div");
  dom.window.document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(React.createElement(HomeAskThread, { messages: INTERRUPTED_TURNS, ...props }));
  });
  return {
    host,
    unmount: () => { act(() => root.unmount()); host.remove(); },
  };
}

const textOf = (node) => `${node?.textContent || ""}`;
const buttonWith = (scope, label) =>
  [...scope.querySelectorAll("button")].find((b) => textOf(b).includes(label));
const assistantTurns = (host) => [...host.querySelectorAll(".home-ask-msg-assistant")];

async function click(node) {
  assert.ok(node, "要点的按钮不存在");
  await act(async () => {
    node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
  });
}


describe("中断的视觉标识", () => {
  beforeEach(() => { clipboardWrites.length = 0; });

  it("被中断的回答带「已中断」标识", () => {
    const view = render();
    const stopped = assistantTurns(view.host).at(-1);
    assert.ok(textOf(stopped).includes("已中断"), "半截回答和写完的回答看上去一模一样");
    view.unmount();
  });

  it("标识在气泡外面，不是正文的一部分", () => {
    const view = render();
    const stopped = assistantTurns(view.host).at(-1);
    const bubbles = [...stopped.querySelectorAll(".home-ask-msg-bubble")];
    assert.ok(bubbles.some((b) => textOf(b).includes("刚写了一半")), "正文没渲染出来");
    assert.ok(
      bubbles.every((b) => !textOf(b).includes("已中断")),
      "中断标记又被塞回了正文气泡里——复制和引用都会把它带走",
    );
    const badge = stopped.querySelector(".home-ask-msg-interrupted");
    assert.ok(badge, "没有独立的中断标识");
    assert.ok(!badge.closest(".home-ask-msg-bubble"), "中断标识长在正文气泡里面");
    view.unmount();
  });

  it("写完的回答不带标识", () => {
    const view = render();
    const [done] = assistantTurns(view.host);
    assert.ok(!textOf(done).includes("已中断"), "正常回答被误标成中断");
    assert.ok(!done.querySelector(".home-ask-msg-interrupted"));
    view.unmount();
  });

  it("线程里不该再出现拼进正文的那句「已停止生成」", () => {
    const view = render();
    assert.ok(!textOf(view.host).includes("已停止生成"));
    view.unmount();
  });

  it("一个字都没出来的中断也看得见，不会整条消失", () => {
    const messages = [
      { id: "u1", role: "user", content: "问题" },
      { id: "a1", role: "assistant", content: "", status: "cancelled", parentId: "u1" },
    ];
    const view = render({ messages, onRegenerate: () => {} });
    const [turn] = assistantTurns(view.host);
    assert.ok(textOf(turn).includes("已中断"), "空的中断回答在线程里什么都不剩");
    assert.ok(buttonWith(turn, "重新生成"), "空的中断回答连重新生成的入口都没有");
    view.unmount();
  });
});


describe("中断的三个出口", () => {
  beforeEach(() => { clipboardWrites.length = 0; });

  it("保留：复制抄走的是干净正文，不带中断标记", async () => {
    const view = render();
    const stopped = assistantTurns(view.host).at(-1);
    await click(buttonWith(stopped, "复制"));
    assert.deepEqual(clipboardWrites, ["刚写了一半"], "复制把中断标记也抄走了");
    view.unmount();
  });

  it("重新生成：报的是这条回答和它那一轮的提问", async () => {
    const asked = [];
    const view = render({ onRegenerate: (id, q) => asked.push([id, q]) });
    const stopped = assistantTurns(view.host).at(-1);
    await click(buttonWith(stopped, "重新生成"));
    assert.deepEqual(
      asked,
      [["a2", "第二轮问题\n\n@某文档"]],
      "重新生成串到了别的轮次，或者没带上回答 id（新答案就挂不成兄弟分支）",
    );
    view.unmount();
  });

  it("改写提问：就地打开那一轮提问的编辑框，回填用户敲的原文", async () => {
    const view = render({ onEditQuestion: () => {} });
    const stopped = assistantTurns(view.host).at(-1);
    await click(buttonWith(stopped, "改写提问"));

    const editor = view.host.querySelector(".home-ask-msg-editor-input");
    assert.ok(editor, "点了改写提问，编辑框没打开");
    assert.equal(editor.value, "第二轮问题", "回填的是带 @ 后缀的展示文本，不是用户敲的原文");
    view.unmount();
  });

  it("改写提问改的是这一轮的提问，不是别轮的", async () => {
    const submitted = [];
    const view = render({ onEditQuestion: (id, q) => submitted.push([id, q]) });
    const stopped = assistantTurns(view.host).at(-1);
    await click(buttonWith(stopped, "改写提问"));

    const editor = view.host.querySelector(".home-ask-msg-editor-input");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        dom.window.HTMLTextAreaElement.prototype, "value",
      ).set;
      setter.call(editor, "换个问法");
      editor.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
    await click(buttonWith(view.host, "发送"));
    assert.deepEqual(submitted, [["u2", "换个问法"]], "改写落到了别的提问上");
    view.unmount();
  });

  it("首问的中断不给「改写提问」——服务端造不出第二个根，给了也是死按钮", () => {
    const messages = [
      { id: "u1", role: "user", content: "第一个问题" },
      { id: "a1", role: "assistant", content: "半截", status: "cancelled", parentId: "u1" },
    ];
    const view = render({ messages, onEditQuestion: () => {}, onRegenerate: () => {} });
    const [turn] = assistantTurns(view.host);
    assert.ok(!buttonWith(turn, "改写提问"), "首问给出了改不了的改写入口");
    assert.ok(buttonWith(turn, "重新生成"), "首问的中断连重新生成都没了");
    view.unmount();
  });

  it("正在生成时不给出口——这一轮还没落定", () => {
    const view = render({ isRunning: true, onEditQuestion: () => {}, onRegenerate: () => {} });
    const stopped = assistantTurns(view.host).at(-1);
    assert.ok(!buttonWith(stopped, "改写提问"));
    assert.ok(!buttonWith(stopped, "重新生成"));
    view.unmount();
  });

  it("写完的回答不给「改写提问」——那是中断专属的出口", () => {
    // 这一轮答完了，而且它的提问有父节点（首问那条「改不了」的规则挡不住它）。
    // 所以唯一能挡住改写入口的只剩「它没被中断」——不这样铺，本条测试会被首问规则
    // 顺手变绿，根本分辨不出 interrupted 到底有没有起作用。
    const messages = [
      { id: "u1", role: "user", content: "第一轮问题" },
      { id: "a1", role: "assistant", content: "第一轮回答", status: "complete", parentId: "u1" },
      { id: "u2", role: "user", content: "第二轮问题", rawQuestion: "第二轮问题", parentId: "a1" },
      { id: "a2", role: "assistant", content: "第二轮回答", status: "complete", parentId: "u2" },
    ];
    const view = render({ messages, onEditQuestion: () => {}, onRegenerate: () => {} });
    const done = assistantTurns(view.host).at(-1);
    assert.ok(buttonWith(done, "重新生成"), "正常回答的重新生成被弄丢了");
    assert.ok(!buttonWith(done, "改写提问"), "正常回答也冒出了改写提问");
    view.unmount();
  });
});
