// ProgressBlock 的渲染层契约：视觉数字与无障碍数值必须同源。
//
// 这四条都曾经同时存在，且都只在"渲染出来看"时才暴露——单测 model 看不到，
// 因为问题出在 model → DOM 这一段：
//   1. 圆环在 .status-progress-block 容器**外面**，不受 visible 的 hidden 控制，
//      于是不展示进度的阶段里凭空显示 "0%"；
//   2. barPercent 的 `: 0` 兜底本只用于把条画空，却同时喂给了 aria-valuenow，
//      缺数时屏幕显示 — 而读屏读到 0%；
//   3. 视觉走 roundPercent、aria 走原始值，两者对不上（67% vs 66.666…）；
//   4. indeterminate 时 model 的 42 是 CSS 动画角度，被当成真实进度报了出去。

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
for (const key of ["window", "document", "HTMLElement", "Event", "Node", "MutationObserver"]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key] ?? dom.window,
    writable: true,
    configurable: true,
  });
}
globalThis.window = dom.window;
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const { createRoot } = await import("react-dom/client");
const React = await import("react");
const { ProgressBlock } = await import("../../src/features/jobs/ui/ProgressBlock.jsx");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function renderProgress(renderOptions) {
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  root.render(React.createElement(ProgressBlock, { renderOptions }));
  await wait(30);
  const view = {
    ringText: host.querySelector(".status-progress-ring-text")?.textContent ?? null,
    footPercent: host.querySelector(".status-progress-percent")?.textContent ?? null,
    ariaValueNow: host.querySelector(".status-progress-bar")?.getAttribute("aria-valuenow"),
    ariaValueText: host.querySelector(".status-progress-bar")?.getAttribute("aria-valuetext"),
    ringHidden: host.querySelector(".status-progress-ring-wrap")?.getAttribute("aria-hidden"),
    progressbarCount: host.querySelectorAll('[role="progressbar"]').length,
  };
  root.unmount();
  host.remove();
  return view;
}

test("不展示进度的阶段：圆环不伪造 0%，也不报无障碍数值", async () => {
  // status=running 不在 VISIBLE_STATUSES 里，阶段名也不在 VISIBLE_STAGE_KEYS 里
  // ——上传中、归一化、阶段切换的空隙都会走到这里。
  const view = await renderProgress({ stageKey: "uploading", status: "running" });
  assert.equal(view.ringText, "—", "圆环必须显示 —，而不是把 model 的占位 0 画成 0%");
  assert.equal(view.footPercent, "—");
  assert.equal(view.ariaValueNow, null, "没有进度就不该报 aria-valuenow");
});

test("缺数的失败态：视觉与无障碍都说“无数据”", async () => {
  const view = await renderProgress({ stageKey: "failed", status: "failed" });
  assert.equal(view.ringText, "—");
  assert.equal(view.ariaValueNow, null, "0% 和“无数据”对读屏用户是两回事");
  assert.equal(view.ariaValueText, "—");
});

test("正常进度：读屏读到的数就是屏幕上那个数", async () => {
  const view = await renderProgress({
    stageKey: "translate",
    status: "running",
    current: 2,
    total: 3,
  });
  assert.equal(view.ringText, "67%");
  assert.equal(view.footPercent, "67%");
  // 曾经是 66.66666666666666——视觉 round 了，aria 没有。
  assert.equal(view.ariaValueNow, "67");
});

test("不确定态：不把 CSS 动画用的 42 当成真实进度报出去", async () => {
  const view = await renderProgress({
    stageKey: "translate",
    status: "running",
    indeterminate: true,
  });
  assert.equal(view.ringText, "...");
  assert.equal(view.footPercent, "处理中");
  // ARIA 规范：不确定的 progressbar 省略 aria-valuenow，用 valuetext 说明状态。
  assert.equal(view.ariaValueNow, null);
  assert.equal(view.ariaValueText, "处理中");
});

test("同一张卡片只暴露一个 progressbar 给辅助技术", async () => {
  const view = await renderProgress({
    stageKey: "translate",
    status: "running",
    current: 1,
    total: 4,
  });
  // 条和圆环画的是同一个值；两个 role="progressbar" + 同名 aria-label 会被读两遍。
  assert.equal(view.progressbarCount, 1);
  assert.equal(view.ringHidden, "true", "圆环是纯视觉，退出无障碍树");
});
