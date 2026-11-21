import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { flushSync } from "react-dom";
import { deferred, wait } from "../helpers/async.mjs";

// 库检索面板的竞态：查询变了以后旧请求回来不能写回结果；书目在一次检索里只取一次；
// 阅读状态连点、第一次失败时，回滚不能冲掉第二次的结果。

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
for (const key of ["window", "document", "HTMLElement", "CustomEvent", "Event", "Node", "MutationObserver"]) {
  Object.defineProperty(globalThis, key, { value: dom.window[key] ?? dom.window, writable: true, configurable: true });
}
globalThis.window = dom.window;
globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const { mountLibrarySearchApp } = await import("../../src/features/library/ui/island/library-search-app.jsx");

async function until(predicate, what) {
  const deadline = Date.now() + 10_000;
  while (!predicate() && Date.now() < deadline) await wait(10);
  assert.ok(predicate(), what);
}

function mount(ports) {
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  let deliver = null;
  const app = mountLibrarySearchApp(host, {
    subscribeQuery: (subscriber) => {
      deliver = subscriber;
      subscriber("");
      return () => {};
    },
    patchDocument: async () => ({}),
    openReader: () => {},
    ...ports,
  });
  return {
    host,
    setQuery: async (q) => {
      await until(() => typeof deliver === "function", "岛屿已订阅查询");
      // 真实输入是 input 事件里同步触发的：React 按同步优先级渲染，查询变了的 effect 清理（作废旧请求）
      // 在事件里就跑完。这里用 flushSync 照样做，不靠等几毫秒——机器忙的时候 10ms 不够，旧请求先写回结果。
      flushSync(() => deliver(q));
    },
    cleanup() {
      app.unmount();
      host.remove();
    },
  };
}

const hit = (text) => ({ document_id: "doc-a", job_id: "job-a", page_idx: 0, block_id: "b", source_snippet: `[${text}]` });
const docA = { document_id: "doc-a", title: "测试文档", reading_status: "unread" };

test("查询变了以后，还在路上的旧请求回来不写回结果", async () => {
  const pending = {};
  const harness = mount({
    searchLibrary: (q) => {
      pending[q] = deferred();
      return pending[q].promise;
    },
    fetchDocumentList: async () => ({ documents: [] }),
  });
  await harness.setQuery("旧词");
  await until(() => pending["旧词"], "旧词的检索已发出");
  // 旧词的请求还在路上，用户接着改了查询
  await harness.setQuery("新词");
  // 新词还在防抖期间，旧请求回来了
  pending["旧词"].resolve({ hits: [hit("旧词")] });
  await wait(30);
  assert.doesNotMatch(harness.host.textContent, /旧词/, "防抖期间不该显示上一次的命中");
  await until(() => pending["新词"], "新词的检索已发出");
  pending["新词"].resolve({ hits: [hit("新词")] });
  await until(() => /新词/.test(harness.host.textContent), "新词的结果显示出来");
  harness.cleanup();
});

test("一次检索里书目只取一次，清空后重新打开再取", async () => {
  let documentFetches = 0;
  const harness = mount({
    searchLibrary: async (q) => ({ hits: [hit(q)] }),
    fetchDocumentList: async () => {
      documentFetches += 1;
      return { documents: [docA] };
    },
  });
  await harness.setQuery("测");
  const marks = () => [...harness.host.querySelectorAll(".lib-search-snippet mark")].map((m) => m.textContent).join(",");
  await until(() => marks() === "测", "第一次结果");
  await harness.setQuery("测试");
  await until(() => marks() === "测试", "第二次结果");
  assert.equal(documentFetches, 1, "同一次检索里换词不重拉书目");
  await harness.setQuery("");
  await until(() => !harness.host.querySelector(".lib-search-panel"), "清空后面板收起");
  await harness.setQuery("文档");
  await until(() => marks() === "文档", "重新打开后的结果");
  assert.equal(documentFetches, 2, "清空后重新打开会再取一次");
  harness.cleanup();
});

test("阅读状态连点两下、第一次失败，回滚不冲掉第二次的结果", async () => {
  const calls = [];
  const harness = mount({
    searchLibrary: async () => ({ hits: [] }),
    fetchDocumentList: async () => ({ documents: [docA] }),
    patchDocument: (documentId, payload) => {
      const call = deferred();
      calls.push({ payload, call });
      return call.promise;
    },
  });
  await harness.setQuery("测试");
  const status = () => harness.host.querySelector(".lib-search-doc-status");
  await until(() => status()?.textContent === "未读", "文档行出现");
  status().dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  await until(() => status().textContent === "在读", "第一次乐观更新");
  status().dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  await until(() => status().textContent === "读完", "第二次乐观更新");
  assert.deepEqual(calls.map((c) => c.payload.reading_status), ["reading", "done"]);

  calls[0].call.reject(new Error("网络错误"));
  calls[1].call.resolve({});
  await wait(30);
  assert.equal(status().textContent, "读完", "第一次失败的回滚不能把第二次设的「读完」冲回「未读」");
  harness.cleanup();
});
