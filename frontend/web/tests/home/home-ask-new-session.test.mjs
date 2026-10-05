import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  url: "http://localhost/",
});
for (const k of ["window", "document", "HTMLElement", "Node", "MutationObserver", "navigator", "CustomEvent", "Event", "localStorage"]) {
  try {
    Object.defineProperty(globalThis, k, {
      value: dom.window[k] ?? globalThis[k],
      writable: true,
      configurable: true,
    });
  } catch { /* 只读键忽略 */ }
}
globalThis.window = dom.window;
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

// 首轮 send 挂起在建会话网络请求上，保持 running=true，制造“生成中新会话”窗口
globalThis.fetch = () => new Promise(() => {});

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { useHomeAskRuntime } = await import(
  "../../src/features/ask/ui/use-home-ask-runtime.ts"
);

function wait(ms = 50) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("newSession 复位运行态：生成中新会话后可立即再问", async () => {
  const apiRef = { current: null };
  function Harness() {
    apiRef.current = useHomeAskRuntime();
    return null;
  }
  const root = createRoot(dom.window.document.getElementById("root"));
  root.render(React.createElement(Harness));
  await wait();

  void apiRef.current.send("第一问");
  await wait();
  assert.equal(apiRef.current.isRunning, true);
  assert.equal(apiRef.current.messages.length, 2);

  apiRef.current.newSession();
  await wait();
  assert.equal(apiRef.current.messages.length, 0);
  assert.equal(apiRef.current.isRunning, false);

  // runningRef 卡住会导致 send 直接 return，消息数保持 0
  void apiRef.current.send("第二问");
  await wait();
  assert.equal(apiRef.current.messages.length, 2);
  assert.equal(apiRef.current.isRunning, true);

  root.unmount();
});
