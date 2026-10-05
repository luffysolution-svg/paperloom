import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

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
    // 等全部重试延迟（0/80/200/400/800ms）打完，再记基准数，避免把在途重试误判成重跳
    await wait(1000);
    assert.ok(jumps.length >= 1, `首文档应跳页，实际 ${jumps.length} 次`);
    assert.deepEqual(jumps[0], ["job-A", 3]);
    // 同文档重渲染：去重，不应再跳
    const sameDocCount = jumps.length;
    root.render(React.createElement(Harness, { jobId: "job-A" }));
    await wait(80);
    assert.equal(jumps.length, sameDocCount);

    // 跨文档同 anchor：必须重新跳
    root.render(React.createElement(Harness, { jobId: "job-B" }));
    await wait();
    assert.ok(jumps.length > sameDocCount, "跨文档同 anchor 应重新跳页");
    assert.deepEqual(jumps.at(-1), ["job-B", 3]);

    root.unmount();
  } finally {
    setReaderAdapters(null);
  }
});
