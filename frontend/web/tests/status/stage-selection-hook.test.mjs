import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { waitFor } from "../helpers/async.mjs";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "http://localhost/index.html",
  });
  for (const key of ["window", "document", "HTMLElement", "Node", "MutationObserver"]) {
    Object.defineProperty(globalThis, key, {
      value: dom.window[key] ?? dom.window,
      writable: true,
      configurable: true,
    });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  return dom;
}

// 等 render 刷出来用 helpers 的 waitFor，不用固定 sleep：固定 sleep 赌的是「React 在 N 毫秒内
// 把 render 刷出来」。concurrency=4 下 CPU 被抢，scheduler 的宏任务就落在 N 之后，断言读到
// 的是刷之前的状态。实测：24 个忙等进程下这条 20 遍红 1 遍。
function wait(ms = 25) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 「不该多出一次 render」是条负向断言，这个窗口放长只会让门禁更严，不会更脆。 */
const SETTLE_MS = 200;

test("阶段选择对 null / undefined / 空串等价输入不追加状态更新", async () => {
  const dom = installDom();
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { useStageSelection } = await import(
    "../../src/features/jobs/ui/useStageSelection.js"
  );
  let renderCount = 0;

  function Harness({ jobId, currentStageKey }) {
    renderCount += 1;
    const selection = useStageSelection({ jobId, currentStageKey });
    return React.createElement("span", null, selection.currentStageKey || "idle");
  }

  const root = createRoot(dom.window.document.getElementById("root"));
  root.render(React.createElement(Harness, { jobId: null, currentStageKey: null }));
  await waitFor(() => renderCount >= 1, "首次 render 落地");
  const beforeEquivalentUpdate = renderCount;

  root.render(React.createElement(Harness, { jobId: undefined, currentStageKey: undefined }));
  // 先等父级那一次 render 真的落地，再给 effect 一个窗口：它若多写一轮 state，
  // 就会在 SETTLE_MS 里多出一次 render。
  await waitFor(
    () => renderCount >= beforeEquivalentUpdate + 1,
    () => `父级请求的那一次 render 落地，实际 renderCount=${renderCount}`,
  );
  await wait(SETTLE_MS);

  assert.equal(
    renderCount,
    beforeEquivalentUpdate + 1,
    "等价输入只能产生父级请求的一次 render，effect 不得再写一轮 state",
  );

  root.unmount();
});
