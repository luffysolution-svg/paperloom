// 书籍详情改标题时，后台任务完成会触发一次 refresh（重新读文档）。回来的服务端标题
// 不能冲掉用户正在输入的内容；不在编辑时照旧同步。
import test from "node:test";
import assert from "node:assert/strict";

test("useDocumentMeta：编辑标题期间 refresh 不覆盖输入框，退出编辑后照旧同步", async () => {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  for (const key of ["window", "document", "HTMLElement", "Event", "Node", "MutationObserver"]) {
    Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, writable: true, configurable: true });
  }
  globalThis.window = dom.window;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;

  let serverTitle = "服务端标题";
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ code: 0, data: { document_id: "doc_1", title: serverTitle } });

  const { createRoot } = await import("react-dom/client");
  const React = await import("react");
  const { useDocumentMeta } = await import("../../src/features/book-detail/ui/useDocumentMeta.js");

  let api = null;
  function Probe() {
    api = useDocumentMeta({
      open: true,
      documentId: "doc_1",
      item: { job_id: "job_1", title: "卡片标题" },
      actions: {},
    });
    return null;
  }
  const until = async (predicate, what) => {
    const deadline = Date.now() + 10_000;
    while (!predicate() && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
    assert.ok(predicate(), what);
  };

  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(React.createElement(Probe));
    await until(() => api?.titleText === "服务端标题", "打开时同步服务端标题");

    api.startEdit();
    await until(() => api.editing, "进入编辑");
    api.setTitleText("用户正在输入");
    await until(() => api.titleText === "用户正在输入", "输入生效");

    serverTitle = "任务完成后的新标题";
    await api.refresh();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(api.titleText, "用户正在输入", "编辑中的标题不能被 refresh 冲掉");
    assert.equal(api.doc?.title, "任务完成后的新标题", "文档本身照旧更新");

    api.setEditing(false);
    await until(() => !api.editing, "退出编辑");
    await api.refresh();
    await until(() => api.titleText === "任务完成后的新标题", "不在编辑时照旧同步");
  } finally {
    root.unmount();
    host.remove();
    globalThis.fetch = oldFetch;
  }
});
