/**
 * 同一个确认请求只触发一次操作面板刷新。
 *
 * 后端两条路都会带上它:turn 进行中发 `agent_confirmation_required` 事件，`done` 里
 * 又有一份 `confirmation_requests` 清单。`readAiAskStream` **有意**把两条都透出——
 * 非流式调用拿不到中途的事件，监听器挂载晚了也会漏——它自己的测试写明了这条分工:
 * 「业务层按 operation/action/attempt 去重」。
 *
 * 但业务层此前没有去重。于是每个操作触发两次 onAgentOperationSignal，每次带新 nonce，
 * 重复轮询一轮。幂等键挡住了重复执行，所以只是白跑，不是数据损坏。
 *
 * 去重键带上 attempt 和 action:同一操作的**下一次尝试**是新的确认，必须再报。
 */

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";

const requireFromReader = createRequire(
  new URL("../../../../frontend/packages/reader/package.json", import.meta.url),
);
const { Chat } = await import(pathToFileURL(requireFromReader.resolve("@ai-sdk/react")).href);
const { RetainPdfChatTransport } = await import(
  "../../../../frontend/packages/reader/src/components/react-pdf/assistant/retainpdf-chat-transport.ts"
);

const CONFIRMATION = {
  schema: "retainpdf_agent_confirmation_v1",
  operation_id: "op-abcd1234",
  action: "run",
  status: "awaiting_confirmation",
  current_attempt: 1,
  latest_event_seq: 3,
};

async function runTurn(emit) {
  const signals = [];
  const answerer = {
    async ensureLoaded() {},
    async answer(options) {
      emit(options.onAgentConfirmationRequiredEvent);
      return { answer: "好的", citations: [], persisted: true };
    },
  };
  const chat = new Chat({
    id: `chat-${Math.random().toString(36).slice(2)}`,
    transport: new RetainPdfChatTransport({
      jobId: "job-1",
      getRemoteAnswerer: () => answerer,
      getLocalAnswerer: () => null,
      onAgentOperationSignal: (signal) => signals.push(signal),
    }),
  });
  await chat.sendMessage({
    id: `u-${Math.random().toString(36).slice(2)}`,
    role: "user",
    parts: [{ type: "text", text: "跑一下这个操作" }],
  });
  return signals;
}

describe("确认请求的上报", () => {
  it("同一个请求到两次只刷新一次", async () => {
    const signals = await runTurn((notify) => {
      notify({ type: "agent_confirmation_required", ...CONFIRMATION });
      notify({ type: "agent_confirmation_required", ...CONFIRMATION });
    });
    assert.equal(signals.length, 1, `触发了 ${signals.length} 次刷新`);
    assert.equal(signals[0].operationId, CONFIRMATION.operation_id);
  });

  it("同一操作的下一次尝试要再报", async () => {
    const signals = await runTurn((notify) => {
      notify({ type: "agent_confirmation_required", ...CONFIRMATION });
      notify({ type: "agent_confirmation_required", ...CONFIRMATION, current_attempt: 2 });
    });
    assert.equal(signals.length, 2);
  });

  it("不同操作各报各的", async () => {
    const signals = await runTurn((notify) => {
      notify({ type: "agent_confirmation_required", ...CONFIRMATION });
      notify({ type: "agent_confirmation_required", ...CONFIRMATION, operation_id: "op-efgh5678" });
    });
    assert.deepEqual(signals.map((s) => s.operationId).sort(), ["op-abcd1234", "op-efgh5678"]);
  });

  it("缺少 operation_id 的事件被忽略", async () => {
    const signals = await runTurn((notify) => {
      notify({ type: "agent_confirmation_required", ...CONFIRMATION, operation_id: "" });
    });
    assert.deepEqual(signals, []);
  });
});
