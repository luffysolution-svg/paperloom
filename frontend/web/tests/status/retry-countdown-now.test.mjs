// OCR 队列繁忙的「N 秒后可重试」倒计时：到点就停掉定时器，不再每秒重渲；
// 截止时间已经过了就不起定时器。以前 FailurePanel 里的 setInterval 没有停的条件。
import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/" });
for (const key of ["window", "document", "HTMLElement", "Node"]) {
  Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true, writable: true });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { useRetryCountdownNow } = await import("../../src/features/job-detail/ui/useRetryCountdownNow.ts");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function mount(retryAtMs) {
  const state = { renders: 0, now: 0, intervals: 0, cleared: 0 };
  const realSet = dom.window.setInterval.bind(dom.window);
  const realClear = dom.window.clearInterval.bind(dom.window);
  dom.window.setInterval = (fn, ms) => { state.intervals += 1; return realSet(fn, ms); };
  dom.window.clearInterval = (id) => { state.cleared += 1; return realClear(id); };
  function Probe() {
    state.renders += 1;
    state.now = useRetryCountdownNow(retryAtMs, "job-1");
    return null;
  }
  const host = dom.window.document.createElement("div");
  dom.window.document.body.append(host);
  const root = createRoot(host);
  root.render(React.createElement(Probe));
  return {
    state,
    cleanup() {
      root.unmount();
      host.remove();
      dom.window.setInterval = realSet;
      dom.window.clearInterval = realClear;
    },
  };
}

test("倒计时到点后定时器停下，不再每秒重渲", async () => {
  const harness = mount(Date.now() + 1100);
  await sleep(2400);
  assert.ok(harness.state.now >= Date.now() - 1500, "到点前每秒刷新过当前时间");
  const rendersAfterDeadline = harness.state.renders;
  assert.equal(harness.state.cleared >= 1, true, "过了截止时间定时器已清掉");
  await sleep(1300);
  assert.equal(harness.state.renders, rendersAfterDeadline, "到点以后不该再重渲");
  harness.cleanup();
});

test("截止时间已经过了，或者没有截止时间，就不起定时器", async () => {
  const past = mount(Date.now() - 5000);
  await sleep(50);
  assert.equal(past.state.intervals, 0);
  past.cleanup();
  const none = mount(null);
  await sleep(50);
  assert.equal(none.state.intervals, 0);
  none.cleanup();
});
