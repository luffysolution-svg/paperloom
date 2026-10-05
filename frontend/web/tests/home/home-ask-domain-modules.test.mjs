import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/" });
globalThis.localStorage = dom.window.localStorage;

const { makeId } = await import("../../src/features/ask/domain/home-ask-ids.ts");
const {
  buildScopedQuestion,
  resolveScopesForAsk,
} = await import("../../src/features/ask/domain/home-ask-scope-prompt.ts");
const {
  describeToolEvent,
  parseCitations,
  messagesFromDetail,
} = await import("../../src/features/ask/domain/home-ask-message-mapping.ts");
const { recordToSession } = await import("../../src/features/ask/domain/home-ask-session.ts");
const {
  loadConversationId,
  saveConversationId,
} = await import("../../src/features/ask/domain/home-ask-conversation-storage.ts");

test("makeId: 前缀 + 稳定分隔格式", () => {
  const id = makeId("a");
  assert.match(id, /^a-[a-z0-9]+-[a-z0-9]+$/);
  assert.notEqual(makeId("a"), makeId("a"));
});

test("buildScopedQuestion: 空问题/无范围直接透传", () => {
  assert.equal(buildScopedQuestion("  ", []), "");
  assert.equal(buildScopedQuestion("问题", []), "问题");
});

test("buildScopedQuestion: 单文档范围硬前缀", () => {
  const q = buildScopedQuestion("解释一下", [{ kind: "document", id: "d1", title: "论文A" }]);
  assert.equal(q, "（范围：文档「论文A」）解释一下");
});

test("buildScopedQuestion: 多范围列出并附 resolvedDocs", () => {
  const q = buildScopedQuestion(
    "对比",
    [{ kind: "collection", id: "c1", title: "合集X", document_count: 2 }],
    [
      { kind: "document", id: "d1", title: "论文A" },
      { kind: "document", id: "d2", title: "论文B" },
    ],
  );
  assert.match(q, /合集「合集X」（2 篇）/);
  assert.match(q, /document_id=d1/);
  assert.match(q, /问题：对比$/);
});

test("resolveScopesForAsk: 无范围返回空; 单文档返回 primary", async () => {
  assert.deepEqual(await resolveScopesForAsk([]), { primaryDoc: null, resolvedDocs: [] });

  const one = await resolveScopesForAsk([{ kind: "document", id: "d1", title: "A" }]);
  assert.equal(one.primaryDoc?.id, "d1");
  assert.deepEqual(one.resolvedDocs.map((d) => d.id), ["d1"]);

  const two = await resolveScopesForAsk([
    { kind: "document", id: "d1", title: "A" },
    { kind: "document", id: "d2", title: "B" },
  ]);
  assert.equal(two.primaryDoc, null);
  assert.deepEqual(two.resolvedDocs.map((d) => d.id), ["d1", "d2"]);
});

test("describeToolEvent: 精确 tool 映射,未知回退执行文案", () => {
  assert.equal(describeToolEvent({ tool: "search_fulltext" }), "检索文档内容");
  assert.equal(describeToolEvent({ tool: "read_blocks" }), "阅读相关段落");
  assert.equal(describeToolEvent({ tool: "list_documents" }), "确认文档信息");
  assert.equal(describeToolEvent({ tool: "search_favorites" }), "查找收藏");
  assert.equal(describeToolEvent({ tool: "custom_op" }), "执行 custom_op");
  assert.equal(describeToolEvent({}), "处理中");
});

test("parseCitations: 数组/JSON 字符串/非法输入", () => {
  assert.deepEqual(parseCitations([{ job_id: "j1" }]), [{ job_id: "j1" }]);
  assert.deepEqual(parseCitations('[{"job_id":"j1"}]'), [{ job_id: "j1" }]);
  assert.deepEqual(parseCitations("{not json"), []);
  assert.deepEqual(parseCitations('{"a":1}'), []);
  assert.deepEqual(parseCitations(null), []);
});

test("messagesFromDetail: 只保留 user/assistant 并解析引用", () => {
  const out = messagesFromDetail({
    messages: [
      { message_id: "m1", role: "user", content: "问" },
      { message_id: "m2", role: "system", content: "忽略" },
      { message_id: "m3", role: "assistant", content: "答", citations_json: '[{"job_id":"j1"}]' },
      { role: "assistant", content: "无 id" },
    ],
  });
  assert.equal(out.length, 3);
  assert.deepEqual(out.map((m) => m.role), ["user", "assistant", "assistant"]);
  assert.deepEqual(out[1].citations, [{ job_id: "j1" }]);
  assert.equal(out[2].id.startsWith("m-"), true);
  assert.equal(out[0].status, "complete");
});

test("recordToSession: 空标题占位 + 字段归一", () => {
  const s = recordToSession({
    conversation_id: "c1",
    title: "  ",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "",
    message_count: "3",
    document_id: " d1 ",
  });
  assert.equal(s.id, "c1");
  assert.equal(s.title, "未命名对话");
  assert.equal(s.messageCount, 3);
  assert.equal(s.documentId, "d1");
});

test("conversation storage: save/load/clear 静默降级", () => {
  saveConversationId("c-1");
  assert.equal(loadConversationId(), "c-1");
  saveConversationId("  ");
  assert.equal(loadConversationId(), "");
  saveConversationId("");
  assert.equal(loadConversationId(), "");
});
