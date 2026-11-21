import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { waitFor } from "../helpers/async.mjs";

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  url: "http://localhost/reader.html?job_id=job-A",
});
for (const k of ["window", "document", "HTMLElement", "Node", "MutationObserver", "navigator", "CustomEvent", "Event"]) {
  try {
    Object.defineProperty(globalThis, k, {
      value: dom.window[k] ?? dom.window,
      writable: true,
      configurable: true,
    });
  } catch { /* 只读键忽略 */ }
}
globalThis.window = dom.window;
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { buildUrlAnchorAppliedKey, useUrlAnchorJump } = await import(
  "../../../../frontend/packages/reader/src/hooks/use-url-anchor-jump.ts"
);
const { setReaderAdapters } = await import(
  "../../../../frontend/packages/reader/src/adapters.ts"
);

function wait(ms = 150) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 重试链是 use-url-anchor-jump.ts 的 JUMP_DELAYS_MS = [0,80,200,400,800]：每应用一次锚点
// 就是固定 5 次 goToPage。「同文档重渲染」时 effect 依赖没变、cleanup 不跑、在途 timer 不被 clear。
//
// 以前等「jumps 连续 400ms 不再增长」：可链上最后一段间隔（400→800）正好也是 400ms，
// 机器一忙（负载几十），800ms 那次晚到一点，就被当成“落定”，它又掉进下面「不应再跳」的窗口里，
// 打出「实际 5、期望 4」。现在直接等够这 5 次，跟机器快慢无关。
// 改 JUMP_DELAYS_MS 的档数时要改这个数（下面的严格相等会先红）。
const JUMPS_PER_ANCHOR = 5;
const QUIET_MS = 400;
async function waitForJumpCount(jumps, count) {
  await waitFor(
    () => jumps.length >= count,
    () => `等待跳页打完：期望 ${count} 次，实际 ${jumps.length} 次`,
  );
  // 多出来的跳页只可能晚到，留一段再核对总数。
  await wait(QUIET_MS);
  assert.equal(jumps.length, count, `一次锚点应正好跳 ${JUMPS_PER_ANCHOR} 次`);
}

test("appliedKey 混入会话身份：同 anchor 跨文档键不同，同文档键稳定", () => {
  const anchor = { pageIdx: 2, blockId: "b-7" };
  const keyA = buildUrlAnchorAppliedKey(anchor, 3, { jobId: "job-A", documentId: "doc-A" });
  const keyB = buildUrlAnchorAppliedKey(anchor, 3, { jobId: "job-B", documentId: "doc-B" });
  assert.notEqual(keyA, keyB);
  assert.equal(
    buildUrlAnchorAppliedKey(anchor, 3, { jobId: "job-A", documentId: "doc-A" }),
    keyA,
  );
});

test("跨文档同 anchor 会重新跳页（同文档同 anchor 只跳一次）", async () => {
  setReaderAdapters({
    resolveReaderAnchor: () => ({ pageIdx: 2, blockId: "b-7" }),
  });
  try {
    const jumps = [];
    function Harness({ jobId }) {
      useUrlAnchorJump({
        enabled: true,
        numPages: 10,
        goToPage: (page) => jumps.push([jobId, page]),
        jobId,
        documentId: `doc-of-${jobId}`,
      });
      return null;
    }
    const root = createRoot(dom.window.document.getElementById("root"));
    root.render(React.createElement(Harness, { jobId: "job-A" }));
    await waitForJumpCount(jumps, JUMPS_PER_ANCHOR);
    assert.deepEqual(jumps[0], ["job-A", 3]);
    // 同文档重渲染：去重，不应再跳
    const sameDocCount = jumps.length;
    root.render(React.createElement(Harness, { jobId: "job-A" }));
    await wait(QUIET_MS);
    assert.equal(jumps.length, sameDocCount, "同文档同 anchor 不应再跳");

    // 跨文档同 anchor：必须重新跳
    root.render(React.createElement(Harness, { jobId: "job-B" }));
    await waitForJumpCount(jumps, sameDocCount + JUMPS_PER_ANCHOR);
    assert.deepEqual(jumps.at(-1), ["job-B", 3]);

    root.unmount();
  } finally {
    setReaderAdapters(null);
  }
});
