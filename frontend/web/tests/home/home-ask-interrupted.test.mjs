/**
 * 「已中断」是一等状态，以及「谁算中断」不能靠猜。
 *
 * 两件事钉在这里：
 *
 * 1. 判别。此前 use-home-ask-turn.ts 用 `/abort/i.test(error.message)` 判断「是不是用户
 *    点了停止」。上游 provider 返回 "Request aborted by upstream"、网关返回
 *    "connection aborted by peer" 这类消息时，一次真正的失败会被吞成一条安静的
 *    「已停止生成」：不红、不给重试、也不说原因。依据只能是 AbortController 的信号和
 *    DOMException("AbortError")，服务端在响应体里写了什么都不算数。
 *
 * 2. 状态。中断此前被标成 `complete`，再往正文尾巴上拼一句 Markdown 斜体
 *    `_（已停止生成）_` 当标记。那句标记混在 `content` 里，会被「复制」抄走、被「引用」
 *    带进下一个问题，半截回答和写完的回答在数据上也分不出来。
 *
 * 和 home-ask-regenerate-payload.test.mjs 一样从网络边界钉：打桩 fetch，断言落到消息上
 * 的状态与真正发出去的请求体。
 */

import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { describe, it, beforeEach } from "node:test";

const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/index.html" });
for (const key of ["window", "document", "HTMLElement", "Node", "Event", "CustomEvent"]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key] ?? dom.window, writable: true, configurable: true,
  });
}
globalThis.window = dom.window;
globalThis.localStorage = dom.window.localStorage;
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator, writable: true, configurable: true,
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const requests = [];

/** 本轮 /ai/ask 怎么应答。open = 挂着不结束，等测试自己喂事件或中止。 */
let askPlan = { mode: "done" };
/** 正挂着的那条流。 */
let liveStream = null;

const encoder = new TextEncoder();

// jsdom 不提供 Response / ReadableStream，用 Node 自带的那套。
function sseResponse(events) {
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n`).join("");
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

function jsonResponse(data) {
  return new Response(JSON.stringify({ code: 0, message: "ok", data }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}

/**
 * 一条不会自己结束的 SSE 流。
 *
 * 中止必须走 signal：真 fetch 被 abort 时是让响应体以 DOMException("AbortError") 出错，
 * 这里照着做。若打桩的 fetch 不理 signal，`stop()` 之后读取端会一直挂着，这条测试就
 * 变成了在测超时。
 */
function openSseResponse(signal) {
  let controller = null;
  const stream = new ReadableStream({
    start(c) { controller = c; },
    cancel() { controller = null; },
  });
  const fail = () => {
    try { controller?.error(new DOMException("The operation was aborted.", "AbortError")); }
    catch { /* 已经关了 */ }
  };
  if (signal?.aborted) fail();
  else signal?.addEventListener("abort", fail, { once: true });
  liveStream = {
    push: (event) => {
      try { controller?.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n`)); }
      catch { /* 已经关了 */ }
    },
  };
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  writable: true,
  value: async (input, init = {}) => {
    const url = `${typeof input === "string" ? input : input?.url || ""}`;
    let body = null;
    try { body = init.body ? JSON.parse(`${init.body}`) : null; } catch { /* 非 JSON */ }
    requests.push({ url, body, method: `${init.method || "GET"}`.toUpperCase() });
    if (/\/conversations(\?|$)/.test(url)) {
      return jsonResponse({ conversation_id: "conv-1", title: "t", created_at: "", updated_at: "" });
    }
    if (/ai\/ask/.test(url)) {
      if (askPlan.mode === "open") return openSseResponse(init.signal);
      if (askPlan.mode === "sse-error") {
        return sseResponse([{ type: "error", message: askPlan.message }]);
      }
      return sseResponse([
        { type: "answer_delta", text: "答案" },
        { type: "done", answer: "答案", citations: [], conversation_id: "conv-1" },
      ]);
    }
    return jsonResponse({});
  },
});

const React = await import("react");
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { useHomeAskRuntime } = await import("../../src/features/ask/ui/use-home-ask-runtime.ts");
const { classifyTurnFailure } = await import("../../src/features/ask/domain/home-ask-turn-failure.ts");

const askBodies = () => requests.filter((r) => /ai\/ask/.test(r.url)).map((r) => r.body);

async function settle(ms = 4) {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
}

async function waitFor(predicate, label) {
  for (let i = 0; i < 300; i += 1) {
    if (predicate()) return;
    await settle();
  }
  throw new Error(`等不到：${label}`);
}

function mountRuntime() {
  const host = dom.window.document.createElement("div");
  const root = createRoot(host);
  const api = {};
  function Probe() {
    api.current = useHomeAskRuntime();
    return null;
  }
  act(() => { root.render(React.createElement(Probe)); });
  return {
    get messages() { return api.current.messages; },
    get branches() { return api.current.branches; },
    get answers() { return api.current.messages.filter((m) => m.role === "assistant"); },
    send: async (...args) => { await act(async () => { await api.current.send(...args); }); },
    switchBranch: async (id) => { await act(async () => { api.current.switchBranch(id); }); },
    /**
     * 发一轮、等首个 delta 落地、再点停止。
     * `deltas` 为空表示一个字都没出来就被停掉。
     */
    interrupt: async (question, deltas = ["半截回答"], options = undefined) => {
      askPlan = { mode: "open" };
      liveStream = null;
      let pending = null;
      await act(async () => {
        pending = api.current.send(question, [], options);
        await Promise.resolve();
      });
      await waitFor(() => liveStream !== null, "流没有建立");
      for (const text of deltas) {
        liveStream.push({ type: "answer_delta", text });
      }
      if (deltas.length) {
        await waitFor(
          () => api.current.messages.some((m) => `${m.content || ""}`.includes(deltas.at(-1))),
          "delta 没有落到消息上",
        );
      } else {
        await settle();
      }
      await act(async () => { api.current.stop(); await pending; });
      askPlan = { mode: "done" };
    },
    unmount: () => act(() => root.unmount()),
  };
}

function reset() {
  requests.length = 0;
  askPlan = { mode: "done" };
  liveStream = null;
  try { dom.window.localStorage.clear(); } catch { /* ignore */ }
}


describe("谁算「用户中止」", () => {
  it("服务端错误消息里带 abort 字样的，是错误不是中止", () => {
    const failure = classifyTurnFailure(new Error("Request aborted by upstream"), null);
    assert.equal(failure.kind, "error", "消息里有 abort 就被当成了用户点停止");
    assert.equal(failure.message, "Request aborted by upstream", "原因被吞了");
  });

  it("AbortController 的信号是依据", () => {
    const ctrl = new AbortController();
    ctrl.abort();
    assert.equal(classifyTurnFailure(new Error("随便什么"), ctrl.signal).kind, "cancelled");
  });

  it("DOMException(\"AbortError\") 是依据", () => {
    const err = new DOMException("Aborted", "AbortError");
    assert.equal(classifyTurnFailure(err, new AbortController().signal).kind, "cancelled");
  });

  it("连接层断掉说人话，但仍然是错误——我们这边没有断点续传", () => {
    const failure = classifyTurnFailure(new TypeError("Failed to fetch"), null);
    assert.equal(failure.kind, "error");
    assert.ok(!/fetch/i.test(failure.message), "把英文的 Failed to fetch 直接摆给用户看了");
  });

  it("什么都没有时给一句能重试的兜底", () => {
    assert.deepEqual(classifyTurnFailure(null, null), { kind: "error", message: "生成回答失败，请重试。" });
  });
});


describe("服务端报错不会被伪装成中止", () => {
  beforeEach(reset);

  it("上游返回 \"Request aborted by upstream\"，这一轮是错误，看得见原因也能重试", async () => {
    askPlan = { mode: "sse-error", message: "Request aborted by upstream" };
    const runtime = mountRuntime();
    await runtime.send("问题");

    const [answer] = runtime.answers;
    assert.equal(answer.status, "error", "一次真失败被吞成了用户中止");
    assert.ok(
      `${answer.content}`.includes("Request aborted by upstream"),
      "失败原因没有留在消息里，用户不知道为什么没答",
    );
    assert.ok(
      !`${answer.content}`.includes("已停止生成"),
      "报错的回答被贴上了「已停止生成」",
    );
    runtime.unmount();
  });

  it("普通服务端错误照旧是错误", async () => {
    askPlan = { mode: "sse-error", message: "模型额度用尽" };
    const runtime = mountRuntime();
    await runtime.send("问题");
    assert.equal(runtime.answers[0].status, "error");
    assert.ok(`${runtime.answers[0].content}`.includes("模型额度用尽"));
    runtime.unmount();
  });
});


describe("用户点停止：中断是状态，不是正文里的一句话", () => {
  beforeEach(reset);

  it("半截回答标成 cancelled", async () => {
    const runtime = mountRuntime();
    await runtime.interrupt("问题");
    assert.equal(runtime.answers[0].status, "cancelled", "中断没有自己的状态");
    runtime.unmount();
  });

  it("正文只剩真正流出来的那截，不掺标记", async () => {
    const runtime = mountRuntime();
    await runtime.interrupt("问题", ["半截回答"]);
    const answer = runtime.answers[0];
    assert.equal(
      answer.content,
      "半截回答",
      "中断标记被拼进了正文——它会被复制走、被引用进下一个问题",
    );
    runtime.unmount();
  });

  it("中断的回答不是 complete——写完的和没写完的必须能分开", async () => {
    const runtime = mountRuntime();
    await runtime.send("第一个问题");
    await runtime.interrupt("第二个问题");
    const [done, stopped] = runtime.answers;
    assert.equal(done.status, "complete");
    assert.notEqual(stopped.status, done.status, "半截回答和写完的回答状态一模一样");
    runtime.unmount();
  });

  it("一个字都没出来就被停掉，消息仍留在树上——否则连重新生成的入口都没了", async () => {
    const runtime = mountRuntime();
    await runtime.interrupt("问题", []);
    const [answer] = runtime.answers;
    assert.ok(answer, "空中断把整条回答弄没了");
    assert.equal(answer.status, "cancelled");
    assert.equal(`${answer.content || ""}`, "");
    runtime.unmount();
  });
});


describe("中断的回答给得出出口", () => {
  beforeEach(reset);

  it("中断的那条还挂在提问底下，重新生成认得出它那一轮", async () => {
    const runtime = mountRuntime();
    await runtime.interrupt("问题");
    const question = runtime.messages.find((m) => m.role === "user");
    assert.equal(runtime.answers[0].parentId, question.id, "中断的回答脱离了消息树");
    runtime.unmount();
  });

  it("重新生成把半截那版留成兄弟版本，切换器给出 2/2", async () => {
    const runtime = mountRuntime();
    await runtime.interrupt("问题");
    const stopped = runtime.answers[0];

    await runtime.send("问题", [], { regenerateOf: stopped.id });
    const fresh = runtime.answers[0];
    assert.equal(fresh.status, "complete");
    assert.notEqual(fresh.id, stopped.id);

    const body = askBodies().at(-1);
    assert.equal(body.regenerate, true, "重新生成中断的回答变成了又问一遍");

    const nav = runtime.branches[fresh.id];
    assert.ok(nav, "半截那版被永久藏起来了，没有切换器");
    assert.deepEqual([nav.index, nav.count, nav.prevId], [2, 2, stopped.id]);
    runtime.unmount();
  });

  it("改写提问挂成提问的兄弟版本；切回原提问，半截那版原样回来", async () => {
    const runtime = mountRuntime();
    await runtime.send("第一个问题");
    await runtime.interrupt("第二个问题");
    const stopped = runtime.answers.at(-1);
    const second = runtime.messages.filter((m) => m.role === "user").at(-1);

    await runtime.send("换个问法", [], { editOf: second.id });
    const body = askBodies().at(-1);
    assert.equal(body.parent_id, second.parentId, "改写后的提问没有和原提问同父");
    assert.equal(body.regenerate, undefined, "改写提问被当成了重新生成");
    assert.ok(
      !runtime.messages.some((m) => m.id === stopped.id),
      "改写之后半截那版还并排摆在线程里",
    );

    await runtime.switchBranch(second.id);
    const back = runtime.messages.find((m) => m.id === stopped.id);
    assert.ok(back, "切回原提问，半截那版没跟着回来");
    assert.equal(back.status, "cancelled", "切回来之后中断状态丢了");
    assert.equal(back.content, "半截回答", "切回来的正文和中断当时不一样");
    runtime.unmount();
  });

  it("重新生成一个字都没出来就被停掉：空壳被摘掉，切回原答案（别把看得见的答案弄丢）", async () => {
    const runtime = mountRuntime();
    await runtime.send("问题");
    const original = runtime.answers[0];

    await runtime.interrupt("问题", [], { regenerateOf: original.id });
    assert.equal(runtime.answers.length, 1, "多出了一个什么都没有的空版本");
    assert.equal(runtime.answers[0].id, original.id, "没有切回原答案");
    assert.deepEqual(runtime.branches, {}, "空壳还占着一格分支计数");
    runtime.unmount();
  });
});
