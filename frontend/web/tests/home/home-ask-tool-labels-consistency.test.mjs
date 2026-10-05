import test from "node:test";
import assert from "node:assert/strict";

const { describeToolEvent: webDescribe } = await import(
  "../../src/features/ask/domain/home-ask-message-mapping.ts"
);
const {
  TOOL_EVENT_LABELS,
  describeToolEvent: readerDescribe,
} = await import(
  "../../../../frontend/packages/reader/src/shared/ai/tool-labels.ts"
);

const INPUTS = [
  "search_markdown",
  { tool: "search_markdown" },
  { event: "read_markdown_chunk" },
  { type: "list_documents" },
  { tool: "read_blocks" },
  { tool: "search_favorites" },
  { tool: "search_fulltext" },
  { tool: "unknown_tool" },
  { name: "read_block" },
  {},
  null,
  undefined,
];

test("web home-ask describeToolEvent matches reader shared/ai/tool-labels exactly", () => {
  for (const input of INPUTS) {
    assert.equal(
      webDescribe(input),
      readerDescribe(input),
      `mismatch for ${JSON.stringify(input)}`,
    );
  }
});

test("both implementations resolve every canonical tool label", () => {
  for (const [tool, label] of Object.entries(TOOL_EVENT_LABELS)) {
    assert.equal(readerDescribe({ tool }), label);
    assert.equal(webDescribe({ tool }), label);
  }
});
