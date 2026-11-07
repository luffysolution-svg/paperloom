import test from "node:test";
import assert from "node:assert/strict";
import { applyTurnEvent, timelineFromTrace } from "../../../packages/api/dist/turn-parts.js";

test("reasoning, tools and answer retain their order and tool patch identity", () => {
  let parts = [];
  for (const event of [
    { type: "reasoning_delta", seq: 1, part_id: "think", text: "Look up" },
    { type: "agent_tool", tool_call_id: "read", title: "Read page", status: "running", input: { page: 2 } },
    { type: "agent_tool", tool_call_id: "read", status: "completed" },
    { type: "answer_delta", seq: 4, part_id: "answer", text: "Result" },
  ]) parts = applyTurnEvent(parts, event);
  assert.deepEqual(parts.map((part) => part.type), ["reasoning", "tool", "text"]);
  assert.equal(parts[1].title, "Read page");
  assert.deepEqual(parts[1].input, { page: 2 });
  assert.equal(parts[1].status, "completed");
  const snapshot = timelineFromTrace(JSON.stringify([{ type: "turn_timeline", parts, metrics: { elapsed_ms: 20 } }]));
  assert.deepEqual(snapshot.parts, parts);
});

test("unrelated events preserve parts and final snapshots replace streamed state", () => {
  const parts = [{ id: "old", type: "text", text: "partial" }];
  assert.equal(applyTurnEvent(parts, { type: "heartbeat" }), parts);
  const final = [{ id: "answer", type: "text", text: "complete" }];
  assert.equal(applyTurnEvent(parts, { type: "done", parts: final }), final);
});
