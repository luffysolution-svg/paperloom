import test from "node:test";
import assert from "node:assert/strict";
import { waitFor } from "../helpers/async.mjs";
import { makeDom } from "../helpers/dom.mjs";

// usePageRange：换文档（弹窗不关）要重置并回填新 pageCount，关闭要清空。

test("usePageRange：换文档重置并回填 1-N；关闭清空；越界在校验时报出而不是悄悄夹紧", async () => {
  makeDom();
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { usePageRange } = await import("../../src/features/book-detail/ui/use-page-range.js");

  const host = globalThis.document.createElement("div");
  globalThis.document.body.appendChild(host);
  const root = createRoot(host);
  let api = null;
  function Harness(props) {
    api = usePageRange(props);
    return React.createElement("span", null, `${api.rangeOn}|${api.pageSpec}`);
  }
  const render = (props) => root.render(React.createElement(Harness, props));

  render({ open: true, documentId: "doc-a", pageCount: 10 });
  await waitFor(() => api?.pageSpec === "1-10", "首本文档回填 1-10");

  // 换文档（弹窗不关）：重置并回填新 pageCount
  render({ open: true, documentId: "doc-b", pageCount: 5 });
  await waitFor(
    () => api?.pageSpec === "1-5" && api?.rangeOn === false,
    "换文档重置并回填新 pageCount",
  );

  // 单页书回填成 "1"，不是 "1-1"
  render({ open: true, documentId: "doc-one", pageCount: 1 });
  await waitFor(() => api?.pageSpec === "1", "单页书回填 1");

  // pageCount 迟到：先 0 后 N
  render({ open: true, documentId: "doc-c", pageCount: 0 });
  await waitFor(() => api?.pageSpec === "", "新文档 pageCount 未到时为空");
  render({ open: true, documentId: "doc-c", pageCount: 7 });
  await waitFor(() => api?.pageSpec === "1-7", "pageCount 迟到后回填");

  // 用户清空后，无关重渲不得回填
  api.setPageSpec("");
  render({ open: true, documentId: "doc-c", pageCount: 7 });
  await waitFor(() => api?.pageSpec === "", "用户清空后不回填");

  // 越界：**不悄悄夹紧**。原来的起止两框会在 pageCount 收缩时把 120-150 夹成 50-50 ——
  // 用户以为翻 31 页，实际只翻了 1 页，而且没人告诉他。改成校验时报出来，输入原样保留。
  api.setRangeOn(true);
  api.setPageSpec("120-150");
  render({ open: true, documentId: "doc-c", pageCount: 50 });
  await waitFor(() => api?.pageSpec === "120-150" && api?.rangeOn === true, "越界的输入原样保留");
  const outOfRange = api.validateRange();
  assert.equal(outOfRange.valid, false, "越界的范围被放行了");
  assert.match(outOfRange.error, /50 页/, "越界提示里没说总页数");

  // 混合范围：校验交出升序页号和规范化字符串，两条提交路径都靠它
  api.setPageSpec("12-13, 1-3, 7");
  await waitFor(() => api?.pageSpec === "12-13, 1-3, 7", "混合范围落到下一次渲染");
  const mixed = api.validateRange();
  assert.equal(mixed.valid, true, `混合范围被拒：${mixed.error}`);
  assert.deepEqual(mixed.pages, [1, 2, 3, 7, 12, 13]);
  assert.equal(mixed.spec, "1-3,7,12-13");
  assert.equal(mixed.all, false);

  // 没勾「指定页码」时整本：pages 是 1..N，spec 是 1-N
  api.setRangeOn(false);
  await waitFor(() => api?.rangeOn === false, "关掉指定页码");
  const whole = api.validateRange();
  assert.equal(whole.valid, true);
  assert.equal(whole.pages.length, 50);
  assert.equal(whole.spec, "1-50");
  assert.equal(whole.all, true);

  // 关闭清空
  render({ open: false, documentId: "doc-c", pageCount: 50 });
  await waitFor(() => api?.pageSpec === "" && api?.rangeOn === false, "关闭清空");

  root.unmount();
  host.remove();
});
