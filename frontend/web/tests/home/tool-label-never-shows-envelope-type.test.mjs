/**
 * 工具标签不能把 SSE 的事件类型当成工具名。
 *
 * 界面上出现过「执行 agent_tool」。`agent_tool` 是**信封名**——SSE 事件的 `type`，
 * 所有工具事件都叫这个。`describeToolEvent` 的取值顺序是
 * `tool || event || type`，而后端发出的事件里**既没有 `tool` 也没有 `event`**，
 * 于是它退到了 `type`。
 *
 * 后端那边补上了 `tool: <工具名>`，前端这张中文标签表因此才真正生效；这边不再看
 * `type`，免得下次换个信封名又原样报给用户。
 *
 * 兜底顺序:工具名查表 → 有工具名但没登记则「执行 <名字>」→ 用后端的英文 title →
 * 「处理中」。英文 title 排在最后是因为它不适合直接上中文界面，但好过什么都不说。
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TOOL_EVENT_LABELS, describeToolEvent } from "@retainpdf/domain/ai";

describe("工具事件标签", () => {
  it("信封名不会被当成工具名", () => {
    for (const envelope of ["agent_tool", "agent_operation", "agent_session"]) {
      const label = describeToolEvent({ type: envelope });
      assert.doesNotMatch(label, /agent_/, `把信封名报给了用户：${label}`);
    }
  });

  it("后端真实事件解析成中文标签", () => {
    // 形状取自 unified_tools.agent_tool_event。
    const event = {
      type: "agent_tool",
      tool: "search_fulltext",
      tool_call_id: "c1",
      kind: "reading",
      title: "Search document",
      status: "running",
    };
    assert.equal(describeToolEvent(event), TOOL_EVENT_LABELS.search_fulltext);
  });

  it("每个登记过的工具都有中文标签", () => {
    for (const [tool, label] of Object.entries(TOOL_EVENT_LABELS)) {
      assert.equal(describeToolEvent({ tool }), label);
      assert.notEqual(label, tool, `${tool} 的标签就是工具名本身`);
    }
  });

  it("没登记的工具显示它的名字，而不是信封名", () => {
    assert.equal(describeToolEvent({ type: "agent_tool", tool: "brand_new_tool" }), "执行 brand_new_tool");
  });

  it("只有英文 title 时用它兜底", () => {
    assert.equal(describeToolEvent({ type: "agent_tool", title: "Search document" }), "Search document");
  });

  it("什么都没有时是通用文案", () => {
    for (const input of [{}, null, undefined, { type: "agent_tool" }]) {
      assert.equal(describeToolEvent(input), "处理中");
    }
  });
});
