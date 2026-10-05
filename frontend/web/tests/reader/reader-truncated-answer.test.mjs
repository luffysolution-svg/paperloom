/**
 * 阅读器也要说出「这个回答是提前收尾的」。
 *
 * 之前 `assistantStatus` 把任何 incomplete 原因一律窄化成 "error"，而
 * `incompleteReason` 在整个 reader 包里出现 0 次——「轮次用尽」这条提示在阅读器侧
 * 完全落空。更糟的是阅读模式的轮次预算是 3、比主页的 6 还紧，**这一侧更容易撞上**。
 *
 * assistant-ui 的 MessageStatus.incomplete.reason 是闭合集合，塞不进 rounds_exhausted，
 * 所以原因走单独一张按消息 id 的表（和 citations / progress 同一个模式）。
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const BASE = "../../../packages/reader/src/components/react-pdf/assistant/";

const THREAD = read(BASE + "ReaderAssistantThread.tsx");
const ROW = read(BASE + "reader-assistant-primitives.tsx");
const TRANSPORT = read(BASE + "retainpdf-chat-transport.ts");
const CHAT = read(BASE + "use-reader-chat.ts");

describe("恢复路径", () => {
  it("从消息里算出「为什么不完整」，而不是全丢给 error", () => {
    assert.match(THREAD, /incompleteByMessageId/);
  });

  it("排除 cancelled——那条有自己的呈现，不该混进来", () => {
    const block = THREAD.match(/const incompleteByMessageId[\s\S]*?\}, \[messages\]\);/)?.[0] || "";
    assert.ok(block, "找不到那张表的计算");
    assert.match(block, /!==\s*"cancelled"/);
  });
});

describe("直播路径", () => {
  it("transport 把原因写进 metadata——不然直播和刷新后说法不一致", () => {
    assert.match(TRANSPORT, /incompleteReason:\s*`\$\{result\?\.incompleteReason/);
  });

  it("metadata 映射回消息时落成 incomplete + 具体原因，而不是 complete", () => {
    assert.match(CHAT, /metadata\.incompleteReason/);
  });
});

describe("渲染", () => {
  it("只认识的原因才显示", () => {
    assert.match(ROW, /incompleteReason === "rounds_exhausted"/);
  });

  it("流式期间不显示——那时还没收尾", () => {
    assert.match(ROW, /!streaming && incompleteReason === "rounds_exhausted"/);
  });

  it("提示在气泡外面，复制和引用带不走它", () => {
    const row = ROW.match(/\{!streaming && incompleteReason[\s\S]*?\) : null\}/)?.[0] || "";
    assert.ok(row, "找不到提示的渲染");
    assert.ok(!row.includes("aui-msg-bubble"), "提示被放进了正文气泡里");
  });
});
