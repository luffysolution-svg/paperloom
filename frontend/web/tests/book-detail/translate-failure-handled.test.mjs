// 书籍详情「翻译」提交失败（比如额度不够）：原因显示在页面上，handleTranslate 自己接住，
// 不再往按钮回调外面抛——以前会留下一个未处理的 rejection。
import test from "node:test";
import assert from "node:assert/strict";

test("翻译提交失败：错误交给 setError 显示，handleTranslate 不再往外抛", async () => {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  for (const key of ["window", "document", "HTMLElement", "Event", "Node", "MutationObserver"]) {
    Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, writable: true, configurable: true });
  }
  globalThis.window = dom.window;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;

  const { createRoot } = await import("react-dom/client");
  const React = await import("react");
  const { useBookDetailTranslate } = await import("../../src/features/book-detail/ui/use-book-detail-translate.js");

  const shown = [];
  let api = null;
  function Probe() {
    api = useBookDetailTranslate({
      open: true,
      documentId: "doc_1",
      pageCount: 12,
      reusableOcrJob: null,
      actions: {
        submitDocument: async () => { throw new Error("页数额度不够：这次要 12 页，还剩 3 页，请联系管理员"); },
      },
      // 和 useDocumentMeta 的 withBusy 一样：记下错误、再往上抛。
      withBusy: async (_key, fn, failMessage) => {
        try {
          await fn();
        } catch (err) {
          shown.push(err?.message || failMessage);
          throw err;
        }
      },
      setError: (message) => shown.push(message),
    });
    return null;
  }
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root = createRoot(host);
  root.render(React.createElement(Probe));
  const deadline = Date.now() + 10_000;
  while (api === null && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));

  await assert.doesNotReject(api.handleTranslate(), "失败不再往外抛");
  assert.ok(shown.includes("页数额度不够：这次要 12 页，还剩 3 页，请联系管理员"), "原话显示给用户");
  root.unmount();
  host.remove();
});
