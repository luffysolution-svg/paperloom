/**
 * 每条回答自己带复制/重新生成，操作卡片也归到触发它的那一轮。
 *
 * 阅读器那侧早就有这两个按钮，主页一个都没有：想把回答拿走只能手动划选，
 * 答歪了只能重新打一遍问题。
 *
 * 操作卡片此前是整组堆在线程最底部的。单轮看不出问题，多轮就完全读不出哪张卡
 * 对应哪次请求——这里钉的就是「卡片在它那一轮的 DOM 里」，而不是「页面上存在」。
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
let clipboardFails = false;
Object.defineProperty(dom.window.navigator, "clipboard", {
  value: {
    writeText: (text) => {
      if (clipboardFails) return Promise.reject(new Error("拒绝访问剪贴板"));
      clipboardWrites.push(text);
      return Promise.resolve();
    },
  },
  configurable: true,
});
// Node 自带只读的 globalThis.navigator，直接赋值会抛 TypeError。
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator, writable: true, configurable: true,
});

const React = await import("react");
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { HomeAskThread } = await import("../../src/features/ask/ui/HomeAskThread.tsx");

/** 两轮对话：问 A / 答 A / 问 B / 答 B。 */
const TWO_TURNS = [
  { id: "u1", role: "user", content: "第一轮问题" },
  { id: "a1", role: "assistant", content: "第一轮回答", status: "done" },
  // content 是展示文本（带 @ 范围后缀），rawQuestion 才是用户敲进去的原文——
  // 两者必须不同，否则「回填用哪个」这条测试分辨不出来。
  { id: "u2", role: "user", content: "第二轮问题\n\n@某文档", parentId: "a1", rawQuestion: "第二轮问题" },
  { id: "a2", role: "assistant", content: "第二轮回答", status: "done" },
];

function operationEntry(operationId, requestMessageId) {
  return {
    remote: {
      operation_id: operationId,
      conversation_id: "conv-1",
      request_message_id: requestMessageId,
      document_id: "doc-1",
      intent_summary: `操作 ${operationId}`,
      status: "result_ready",
      current_attempt: 1,
      allowed_actions: [],
    },
  };
}

function render(props = {}) {
  const host = dom.window.document.createElement("div");
  dom.window.document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(React.createElement(HomeAskThread, { messages: TWO_TURNS, ...props }));
  });
  return {
    host,
    rerender: (next) => act(() => {
      root.render(React.createElement(HomeAskThread, { messages: TWO_TURNS, ...props, ...next }));
    }),
    unmount: () => { act(() => root.unmount()); host.remove(); },
  };
}

const textOf = (node) => `${node?.textContent || ""}`;
const buttons = (scope) => [...scope.querySelectorAll("button")];
const buttonWith = (scope, label) => buttons(scope).find((b) => textOf(b).includes(label));
const assistantTurns = (host) => [...host.querySelectorAll(".home-ask-msg-assistant")];

async function click(node) {
  await act(async () => {
    node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
  });
}

describe("主页问答的消息级操作", () => {
  beforeEach(() => { clipboardWrites.length = 0; clipboardFails = false; });

  it("复制的是这条回答，不是整个线程", async () => {
    const view = render();
    const [first] = assistantTurns(view.host);
    await click(buttonWith(first, "复制"));
    assert.deepEqual(clipboardWrites, ["第一轮回答"]);
    view.unmount();
  });

  it("复制成功后按钮给出反馈", async () => {
    const view = render();
    const [first] = assistantTurns(view.host);
    await click(buttonWith(first, "复制"));
    assert.ok(textOf(first).includes("已复制"), "复制完没有任何反馈");
    view.unmount();
  });

  it("剪贴板被拒时不假装成功，也不炸掉整条消息", async () => {
    clipboardFails = true;
    const view = render();
    const [first] = assistantTurns(view.host);
    await click(buttonWith(first, "复制"));
    assert.ok(!textOf(first).includes("已复制"), "复制失败却显示成功");
    assert.ok(textOf(first).includes("第一轮回答"), "消息被异常带崩");
    view.unmount();
  });

  it("重新生成报的是这一轮的回答和提问，不是最后一轮的", async () => {
    // 两个参数都是必须的：光有问题文本，发出去就成了「把同一个问题再问一遍」，
    // 对话里会多出一条重复提问；回答 id 才能让新答案挂成兄弟分支。
    const asked = [];
    const view = render({ onRegenerate: (id, q) => asked.push([id, q]) });
    const [first] = assistantTurns(view.host);
    await click(buttonWith(first, "重新生成"));
    assert.deepEqual(asked, [["a1", "第一轮问题"]], "重新生成串到了别的轮次");
    view.unmount();
  });

  it("失败的回答给的是「重试」", () => {
    const messages = [
      { id: "u1", role: "user", content: "会失败的问题" },
      { id: "a1", role: "assistant", content: "请求失败", status: "error" },
    ];
    const view = render({ messages, onRegenerate: () => {} });
    const [turn] = assistantTurns(view.host);
    assert.ok(buttonWith(turn, "重试"), "失败的回答没有重试入口");
    view.unmount();
  });

  it("流式期间不出操作——答案还没写完，复制和重新生成都没有意义", () => {
    const messages = [
      { id: "u1", role: "user", content: "问题" },
      { id: "a1", role: "assistant", content: "正在写…", status: "streaming" },
    ];
    const view = render({ messages, isRunning: true, onRegenerate: () => {} });
    assert.equal(view.host.querySelectorAll(".home-ask-msg-actions").length, 0);
    view.unmount();
  });

  it("还有请求在跑时不让重新生成", () => {
    const view = render({ isRunning: true, onRegenerate: () => {} });
    const [first] = assistantTurns(view.host);
    assert.ok(!buttonWith(first, "重新生成"), "跑着的时候还能再点一次重新生成");
    view.unmount();
  });
});

describe("操作卡片的归位", () => {
  it("卡片落在触发它的那一轮里", () => {
    const view = render({
      operationsByRequestMessage: { a1: [operationEntry("op-1", "a1")] },
    });
    const turns = assistantTurns(view.host);
    assert.equal(turns[0].querySelectorAll(".home-ask-msg-operation").length, 1);
    assert.equal(turns[1].querySelectorAll(".home-ask-msg-operation").length, 0,
      "卡片跑到了别的轮次");
    view.unmount();
  });

  it("两轮各有各的卡片", () => {
    const view = render({
      operationsByRequestMessage: {
        a1: [operationEntry("op-1", "a1")],
        a2: [operationEntry("op-2", "a2")],
      },
    });
    const turns = assistantTurns(view.host);
    assert.ok(textOf(turns[0]).includes("操作 op-1"));
    assert.ok(!textOf(turns[0]).includes("操作 op-2"));
    assert.ok(textOf(turns[1]).includes("操作 op-2"));
    view.unmount();
  });

  it("同一 operation_id 重复出现只渲染一张卡", () => {
    const view = render({
      operationsByRequestMessage: {
        a1: [operationEntry("op-1", "a1"), operationEntry("op-1", "a1")],
      },
    });
    assert.equal(view.host.querySelectorAll(".home-ask-msg-operation").length, 1);
    view.unmount();
  });
});


describe("版本切换器", () => {
  const nav = { index: 2, count: 2, prevId: "a0", nextId: "" };

  it("有多版时显示第几版/共几版", () => {
    const view = render({ branches: { a1: nav }, onSwitchBranch: () => {} });
    const [first] = assistantTurns(view.host);
    assert.ok(textOf(first).includes("2/2"), "没有显示版本序号");
    view.unmount();
  });

  it("只有一版的消息不显示切换器", () => {
    const view = render({ branches: { a1: nav }, onSwitchBranch: () => {} });
    const [, second] = assistantTurns(view.host);
    assert.ok(!second.querySelector(".home-ask-msg-branch"), "只有一版也显示了切换器");
    view.unmount();
  });

  it("点上一版报的是上一版的 id", async () => {
    const switched = [];
    const view = render({ branches: { a1: nav }, onSwitchBranch: (id) => switched.push(id) });
    const [first] = assistantTurns(view.host);
    await click(first.querySelector("[aria-label='上一版回答']"));
    assert.deepEqual(switched, ["a0"]);
    view.unmount();
  });

  it("到头的那一侧禁用，但仍然占位——否则 1/2 会左右跳", () => {
    const view = render({ branches: { a1: nav }, onSwitchBranch: () => {} });
    const [first] = assistantTurns(view.host);
    const next = first.querySelector("[aria-label='下一版回答']");
    assert.ok(next, "到头的按钮被整个拿掉了");
    assert.equal(next.disabled, true);
    view.unmount();
  });

  it("正在生成时不给切", () => {
    const view = render({ branches: { a1: nav }, onSwitchBranch: () => {}, isRunning: true });
    assert.equal(view.host.querySelectorAll(".home-ask-msg-branch").length, 0);
    view.unmount();
  });
});


describe("改写历史提问的入口", () => {
  const userTurns = (host) => [...host.querySelectorAll(".home-ask-msg-user")];

  it("有父节点的提问给编辑入口", () => {
    const view = render({ onEditQuestion: () => {} });
    const second = userTurns(view.host)[1];
    assert.ok(buttonWith(second, "编辑"), "第二轮提问没有编辑入口");
    view.unmount();
  });

  it("会话首问不给编辑入口——服务端造不出第二个根，给了也点不动", () => {
    const view = render({ onEditQuestion: () => {} });
    const first = userTurns(view.host)[0];
    assert.ok(!buttonWith(first, "编辑"), "首问也给了编辑入口");
    view.unmount();
  });

  it("正在生成时不给编辑", () => {
    const view = render({ onEditQuestion: () => {}, isRunning: true });
    assert.ok(!buttonWith(userTurns(view.host)[1], "编辑"));
    view.unmount();
  });

  it("点编辑打开输入框，回填的是用户输入的原文", async () => {
    const view = render({ onEditQuestion: () => {} });
    await click(buttonWith(userTurns(view.host)[1], "编辑"));
    const input = view.host.querySelector(".home-ask-msg-editor-input");
    assert.ok(input, "没有打开编辑框");
    assert.equal(input.value, "第二轮问题");
    view.unmount();
  });

  it("发送报上提问 id 和改写后的文本", async () => {
    const edits = [];
    const view = render({ onEditQuestion: (id, q) => edits.push([id, q]) });
    await click(buttonWith(userTurns(view.host)[1], "编辑"));
    const input = view.host.querySelector(".home-ask-msg-editor-input");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        dom.window.HTMLTextAreaElement.prototype, "value").set;
      setter.call(input, "换个问法");
      input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
    await click(buttonWith(view.host, "发送"));
    assert.deepEqual(edits, [["u2", "换个问法"]]);
    view.unmount();
  });

  it("取消不发任何东西，并且把原文放回去", async () => {
    const edits = [];
    const view = render({ onEditQuestion: (id, q) => edits.push([id, q]) });
    await click(buttonWith(userTurns(view.host)[1], "编辑"));
    await click(buttonWith(view.host, "取消"));
    assert.deepEqual(edits, []);
    assert.ok(!view.host.querySelector(".home-ask-msg-editor-input"), "编辑框没有关掉");
    assert.ok(textOf(userTurns(view.host)[1]).includes("第二轮问题"));
    view.unmount();
  });

  it("空内容不给发", async () => {
    const view = render({ onEditQuestion: () => {} });
    await click(buttonWith(userTurns(view.host)[1], "编辑"));
    const input = view.host.querySelector(".home-ask-msg-editor-input");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        dom.window.HTMLTextAreaElement.prototype, "value").set;
      setter.call(input, "   ");
      input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
    assert.equal(buttonWith(view.host, "发送").disabled, true);
    view.unmount();
  });
});


describe("提前收尾的提示", () => {
  const cutShort = [
    { id: "u1", role: "user", content: "要算的问题" },
    { id: "a1", role: "assistant", content: "一个语气正常的回答。", status: "complete",
      parentId: "u1", incompleteReason: "rounds_exhausted" },
  ];

  it("标出来——不标的话它和正常回答一模一样", () => {
    const view = render({ messages: cutShort });
    assert.ok(view.host.querySelector(".home-ask-msg-truncated"), "没有提示提前收尾");
    view.unmount();
  });

  it("提示在气泡外面，复制带不走它", () => {
    const view = render({ messages: cutShort });
    const badge = view.host.querySelector(".home-ask-msg-truncated");
    assert.equal(badge.closest(".home-ask-msg-bubble"), null, "提示被塞进了正文气泡里");
    const bubbles = [...view.host.querySelectorAll(".home-ask-msg-bubble")];
    assert.ok(bubbles.every((b) => !textOf(b).includes("步数已用尽")), "提示混进了正文");
    view.unmount();
  });

  it("正常回答不显示", () => {
    const view = render();
    assert.equal(view.host.querySelectorAll(".home-ask-msg-truncated").length, 0);
    view.unmount();
  });

  it("不认识的原因不显示——将来后端多一种值时不要冒出一句错的解释", () => {
    const unknown = cutShort.map((m) => (
      m.role === "assistant" ? { ...m, incompleteReason: "以后才有的原因" } : m
    ));
    const view = render({ messages: unknown });
    assert.equal(view.host.querySelectorAll(".home-ask-msg-truncated").length, 0);
    view.unmount();
  });

  it("被中断的回答只说中断，不重复说提前收尾", () => {
    const both = cutShort.map((m) => (
      m.role === "assistant" ? { ...m, status: "cancelled" } : m
    ));
    const view = render({ messages: both });
    assert.ok(view.host.querySelector(".home-ask-msg-interrupted"));
    assert.equal(view.host.querySelectorAll(".home-ask-msg-truncated").length, 0,
      "同一条回答同时挂了两个标识");
    view.unmount();
  });
});


describe("中断的回答不会被保存这件事", () => {
  /**
   * 停止时服务端在落库之前就抛出了（raise_if_stopped 排在 persist_turn 前面），
   * 所以半截回答只活在当前页面里。刷新回来整轮都不见了——用户有权在刷新之前知道，
   * 而不是回来才发现。
   */
  const cancelled = (content) => ([
    { id: "u1", role: "user", content: "问题" },
    { id: "a1", role: "assistant", content, status: "cancelled", parentId: "u1" },
  ]);

  it("有半截正文时说清楚它不会保存", () => {
    const view = render({ messages: cancelled("写了一半的回答") });
    const badge = textOf(view.host.querySelector(".home-ask-msg-interrupted"));
    assert.ok(badge.includes("不会保存"), `提示没有说保存的事：${badge}`);
    view.unmount();
  });

  it("指向已有的「复制」，而不是另加一个按钮", () => {
    const view = render({ messages: cancelled("写了一半的回答") });
    const badge = textOf(view.host.querySelector(".home-ask-msg-interrupted"));
    assert.ok(badge.includes("复制"), `没有告诉用户怎么留住它：${badge}`);
    // 而「复制」确实就在下面的操作条上。
    assert.ok(buttonWith(view.host, "复制"), "操作条上没有复制");
    view.unmount();
  });

  it("一个字都没出来时不提「复制」——没有东西可复制", () => {
    const view = render({ messages: cancelled("") });
    const badge = textOf(view.host.querySelector(".home-ask-msg-interrupted"));
    assert.ok(badge.includes("不会保存"));
    assert.ok(!badge.includes("复制"), `没有正文却让人去复制：${badge}`);
    view.unmount();
  });

  it("这句话在气泡外面，复制带不走它", () => {
    const view = render({ messages: cancelled("写了一半的回答") });
    const badge = view.host.querySelector(".home-ask-msg-interrupted");
    assert.equal(badge.closest(".home-ask-msg-bubble"), null);
    view.unmount();
  });

  it("正常回答不说这句——它是会保存的", () => {
    const view = render();
    assert.equal(view.host.querySelectorAll(".home-ask-msg-interrupted").length, 0);
    view.unmount();
  });
});
