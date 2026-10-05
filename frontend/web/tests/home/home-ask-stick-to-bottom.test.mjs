/**
 * 跟随底部，但用户往回看时让开。
 *
 * 原来是每次消息变化就 `scrollIntoView({ behavior: "smooth" })`。流式回答每来一个
 * 增量就重新触发一次平滑滚动动画，动画互相打断；而且不判断用户有没有上滑——想往回
 * 看一眼，下一个 token 就把你拽回底部。
 *
 * 阅读器那侧用 assistant-ui 的 autoScroll，行为由 reader-ai-autoscroll.test.mjs 钉着
 * （上滑打断跟随 / 手动滚底恢复跟随 / 流式增长不拖回底部）。主页这三条同样要成立。
 */

import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { describe, it, beforeEach } from "node:test";

const dom = new JSDOM("<!doctype html><body></body>", { pretendToBeVisual: true });
for (const key of ["window", "document", "HTMLElement", "Element", "Node", "Event"]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key], writable: true, configurable: true,
  });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = await import("react");
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { useStickToBottom } = await import(
  "../../src/features/ask/ui/use-stick-to-bottom.ts"
);

/** 一个能记录 scrollTo 调用的假滚动容器。jsdom 不做布局，所以尺寸自己摆。 */
function makeScroller({ scrollHeight = 1000, clientHeight = 400, scrollTop = 600 } = {}) {
  const calls = [];
  const listeners = new Set();
  const node = {
    scrollHeight,
    clientHeight,
    scrollTop,
    addEventListener: (type, fn) => { if (type === "scroll") listeners.add(fn); },
    removeEventListener: (type, fn) => { if (type === "scroll") listeners.delete(fn); },
    scrollTo: (options) => { calls.push(options); node.scrollTop = options.top; },
  };
  return { node, calls, fireScroll: () => listeners.forEach((fn) => fn()) };
}

function mount(ref, { streaming = false } = {}) {
  const host = dom.window.document.createElement("div");
  const root = createRoot(host);
  let setKey;
  function Probe() {
    const [key, set] = React.useState(0);
    setKey = set;
    useStickToBottom(ref, key, { streaming });
    return null;
  }
  act(() => { root.render(React.createElement(Probe)); });
  return { bump: () => act(() => { setKey((n) => n + 1); }), unmount: () => act(() => root.unmount()) };
}

describe("主页问答的跟随底部", () => {
  let scroller;
  beforeEach(() => { scroller = makeScroller(); });

  it("贴着底部时跟随新内容", () => {
    scroller.node.scrollTop = 600; // 1000 - 400 = 600，正好贴底
    const ref = { current: scroller.node };
    const probe = mount(ref);
    scroller.node.scrollHeight = 1400;
    probe.bump();
    assert.ok(scroller.calls.length > 0, "贴底时没有跟随");
    assert.equal(scroller.calls.at(-1).top, 1400);
    probe.unmount();
  });

  it("用户上滑之后不再被拽回底部", () => {
    const ref = { current: scroller.node };
    const probe = mount(ref);
    // 用户往回看
    scroller.node.scrollTop = 100;
    scroller.fireScroll();
    const before = scroller.calls.length;
    scroller.node.scrollHeight = 1400;
    probe.bump();
    assert.equal(scroller.calls.length, before, "用户上滑后仍被拽回底部");
    probe.unmount();
  });

  it("用户自己滚回底部后恢复跟随", () => {
    const ref = { current: scroller.node };
    const probe = mount(ref);
    scroller.node.scrollTop = 100;
    scroller.fireScroll();
    probe.bump();
    // 滚回底部
    scroller.node.scrollTop = 600;
    scroller.fireScroll();
    scroller.node.scrollHeight = 1400;
    probe.bump();
    assert.equal(scroller.calls.at(-1)?.top, 1400, "滚回底部后没有恢复跟随");
    probe.unmount();
  });

  it("流式期间用 auto，不用 smooth", () => {
    const ref = { current: scroller.node };
    const probe = mount(ref, { streaming: true });
    probe.bump();
    assert.equal(scroller.calls.at(-1)?.behavior, "auto", "流式仍在用平滑滚动，动画会互相打断");
    probe.unmount();
  });

  it("非流式时用 smooth", () => {
    const ref = { current: scroller.node };
    const probe = mount(ref, { streaming: false });
    probe.bump();
    assert.equal(scroller.calls.at(-1)?.behavior, "smooth");
    probe.unmount();
  });

  it("差一点点到底也算贴底——留了阈值，免得亚像素误差让跟随失效", () => {
    scroller.node.scrollTop = 600 - 40; // 距底 40px，阈值 48
    const ref = { current: scroller.node };
    const probe = mount(ref);
    scroller.node.scrollHeight = 1400;
    probe.bump();
    assert.ok(scroller.calls.length > 0);
    probe.unmount();
  });
});
