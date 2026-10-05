import test from "node:test";
import assert from "node:assert/strict";

const ai = await import("@retainpdf/domain/ai");
const session = await import("@retainpdf/domain/session");

test("domain/ai describeToolEvent: canonical labels and fallbacks", () => {
  assert.equal(ai.describeToolEvent("search_markdown"), "检索 Markdown");
  assert.equal(ai.describeToolEvent({ tool: "read_markdown_chunk" }), "阅读 Markdown 片段");
  assert.equal(ai.describeToolEvent({ event: "list_documents" }), "确认文档信息");
  // 不再看 `type`。后端事件的 `type` 永远是信封名（`agent_tool`），不是工具名，
  // 而这条宽松兜底正是界面上出现「执行 agent_tool」的原因。
  assert.equal(ai.describeToolEvent({ type: "read_blocks" }), "处理中");
  assert.equal(ai.describeToolEvent({ type: "agent_tool", tool: "read_blocks" }), "阅读相关段落");
  assert.equal(ai.describeToolEvent({ tool: "unknown_tool" }), "执行 unknown_tool");
  assert.equal(ai.describeToolEvent({}), "处理中");
  assert.equal(ai.describeToolEvent(null), "处理中");
  assert.deepEqual(ai.TOOL_EVENT_LABELS, {
    search_markdown: "检索 Markdown",
    read_markdown_chunk: "阅读 Markdown 片段",
    list_documents: "确认文档信息",
    read_blocks: "阅读相关段落",
    search_favorites: "查找收藏",
    search_fulltext: "检索文档内容",
    calculate_expression: "计算表达式",
    calculate_statistics: "计算统计量",
    analyze_table: "分析文档表格",
    generate_chart: "生成图表",
  });
});

test("domain/session toSessionSummary: web shape normalizes id/title/count/documentId", () => {
  const summary = session.toSessionSummary(
    {
      conversation_id: " c1 ",
      title: "  ",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "",
      message_count: "3",
      document_id: " d1 ",
    },
    { documentId: true },
  );
  assert.deepEqual(summary, {
    id: "c1",
    title: "未命名对话",
    updatedAt: "2026-01-01T00:00:00Z",
    messageCount: 3,
    documentId: "d1",
  });
});

test("domain/session toSessionSummary: reader shape derives active", () => {
  assert.deepEqual(
    session.toSessionSummary(
      { conversation_id: "c1", title: "T", updated_at: "2026-09-01T00:00:00Z", message_count: 3 },
      { active: "c1" },
    ),
    {
      id: "c1",
      title: "T",
      updatedAt: "2026-09-01T00:00:00Z",
      messageCount: 3,
      active: true,
    },
  );
  assert.equal(
    session.toSessionSummary({ conversation_id: "c2" }, { active: "c1" }).active,
    false,
  );
  assert.equal(session.toSessionSummary({}, {}).active, undefined);
});

test("domain/session makeId: prefix + stable separator format", () => {
  const id = session.makeId("a");
  assert.match(id, /^a-[a-z0-9]+-[a-z0-9]+$/);
  assert.notEqual(session.makeId("a"), session.makeId("a"));
});
