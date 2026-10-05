/**
 * 失败的回答不能渲染成一个空气泡。
 *
 * 真实故障:文档的内容分在两个 job 里，后端返回 409
 * `AI_DOCUMENT_CONTENT_UNAVAILABLE`「当前文档没有可用于问答的结构化数据或
 * Markdown 产物」。界面上出现的是**一个空气泡加三个操作按钮**，一个字都没有。
 *
 * 链路是这么断的:
 *
 * 1. 409 在流开始**之前**抛出，transport 把 metadata.status 设成 "error" 并发一个
 *    error chunk；
 * 2. `chatMessageToStore` 的 content 取自消息的文本片段——一个都没有，所以是空串；
 * 3. `markRunningAsError` 只处理 status 还是 "running" 的条目，而第 2 步已经把它推进
 *    `incomplete` 了，那条补文案的逻辑一次都不会命中。
 *
 * 错误文案一直存在，只是从来没进过消息内容。所以让它同时进 metadata，映射时兜底。
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { chatMessageToStore } from "../../../packages/reader/src/components/react-pdf/assistant/use-reader-chat.ts";
import { askLibraryAi } from "../../../packages/api/src/ai.ts";

function assistantMessage(metadata, parts = []) {
  return { id: "a1", role: "assistant", parts, metadata };
}

describe("失败的回答要看得见", () => {
  it("409 对象型 detail 的实际错误原因传给回答界面", async () => {
    const message = "当前文档没有可用于问答的结构化数据或 Markdown 产物";
    await assert.rejects(askLibraryAi({
      question: "解释材料合成和表征",
      fetchImpl: async () => new Response(JSON.stringify({ detail: {
        code: "AI_DOCUMENT_CONTENT_UNAVAILABLE", message, retryable: false,
      } }), { status: 409, headers: { "Content-Type": "application/json" } }),
    }), { message: `${message}(409)`, status: 409 });
  });

  it("流还没开始就失败时，错误文案进正文", () => {
    const stored = chatMessageToStore(
      assistantMessage({
        status: "error",
        statusText: "当前文档没有可用于问答的结构化数据或 Markdown 产物",
      }),
    );

    assert.equal(stored.status.type, "incomplete");
    assert.equal(stored.status.reason, "error");
    assert.match(stored.content, /没有可用于问答/, `渲染成了空气泡：${JSON.stringify(stored.content)}`);
  });

  it("取消同样有文案", () => {
    const stored = chatMessageToStore(
      assistantMessage({ status: "cancelled", statusText: "已取消" }),
    );

    assert.equal(stored.status.reason, "cancelled");
    assert.equal(stored.content, "已取消");
  });

  it("已经流出正文时不覆盖它", () => {
    const stored = chatMessageToStore(
      assistantMessage({ status: "error", statusText: "网络中断" }, [
        { type: "text", text: "已经生成的半截回答" },
      ]),
    );

    assert.equal(stored.content, "已经生成的半截回答");
  });

  it("正常完成的回答不受影响", () => {
    const stored = chatMessageToStore(
      assistantMessage({ status: "complete" }, [{ type: "text", text: "正常答案" }]),
    );

    assert.equal(stored.status.type, "complete");
    assert.equal(stored.content, "正常答案");
  });

  it("没有 statusText 时仍然是空的——兜底文案由上层提供", () => {
    const stored = chatMessageToStore(assistantMessage({ status: "error" }));
    assert.equal(stored.content, "");
  });
});
