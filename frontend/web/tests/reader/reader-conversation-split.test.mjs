import test from "node:test";
import assert from "node:assert/strict";

const BASE = "../../../../frontend/packages/reader/src/components/react-pdf/assistant";

const model = await import(`${BASE}/reader-agent-operation-model.js`);
const idempotency = await import(`${BASE}/reader-agent-operation-idempotency.js`);
const derived = await import(`${BASE}/reader-conversation-derived.js`);
const tree = await import(`${BASE}/reader-conversation-tree.js`);
const ports = await import(`${BASE}/reader-conversation-ports.js`);

test("conversation/agent facades keep their runtime export surface after the split", async () => {
  const conversation = await import(`${BASE}/use-reader-conversation.js`);
  const agent = await import(`${BASE}/use-reader-agent-operations.js`);
  assert.deepEqual(Object.keys(conversation).sort(), ["useReaderConversation"]);
  assert.deepEqual(
    Object.keys(agent).sort(),
    ["shouldReplaceAgentOperation", "useReaderAgentOperations"],
  );
});

test("stale/equal poll snapshots are rejected while newer attempts or events win", () => {
  const base = {
    operation_id: "op-1",
    current_attempt: 1,
    latest_event_seq: 1,
    updated_at: "2026-09-01T00:00:00Z",
    events: [],
  };
  assert.equal(model.shouldReplaceAgentOperation(undefined, base), true);
  assert.equal(model.shouldReplaceAgentOperation(base, { ...base }), false);
  assert.equal(model.shouldReplaceAgentOperation(base, { ...base, latest_event_seq: 2 }), true);
  assert.equal(
    model.shouldReplaceAgentOperation(base, { ...base, current_attempt: 2, latest_event_seq: 0 }),
    true,
  );
  assert.equal(
    model.shouldReplaceAgentOperation({ ...base, current_attempt: 2 }, { ...base, current_attempt: 1 }),
    false,
  );
});

test("polling decision keeps active statuses and green-light transitions", () => {
  assert.equal(model.shouldPoll("queued", "explicit"), true);
  assert.equal(model.shouldPoll("draft", "explicit"), false);
  assert.equal(model.shouldPoll("draft", "green_light"), true);
  assert.equal(model.shouldPoll("result_ready", "green_light"), true);
  assert.equal(model.shouldPoll("committed", "green_light"), false);
});

test("idempotency key persists per operation+action and is cleared on settle", () => {
  const storage = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, `${value}`),
    removeItem: (key) => storage.delete(key),
  };
  try {
    const keys = new Map();
    const first = idempotency.resolveAgentOperationActionKey("op-9", "commit", keys);
    assert.match(first, /^reader-commit-op-9-/);
    assert.equal(idempotency.resolveAgentOperationActionKey("op-9", "commit", keys), first);
    assert.equal(storage.get(`${model.ACTION_KEY_PREFIX}op-9:commit`), first);
    idempotency.clearAgentOperationActionKey("op-9", "commit", keys);
    assert.equal(keys.has("op-9:commit"), false);
    assert.equal(storage.has(`${model.ACTION_KEY_PREFIX}op-9:commit`), false);
  } finally {
    delete globalThis.sessionStorage;
  }
});

test("derived selectors preserve citation/progress/content maps and summaries", () => {
  const items = [
    { parentId: null, message: { id: "u1", role: "user", content: "问题" } },
    {
      parentId: "u1",
      message: {
        id: "a1",
        role: "assistant",
        content: "",
        progress: "生成中",
        citations: [{ ref: 1, block_id: "b1" }],
      },
    },
  ];
  assert.deepEqual(derived.citationsByMessageIdFromItems(items), {
    a1: [{ ref: 1, block_id: "b1" }],
  });
  assert.deepEqual(derived.progressByMessageIdFromItems(items), { a1: "生成中" });
  assert.deepEqual(derived.contentByMessageIdFromItems(items), { u1: "问题" });

  const summaries = derived.buildReaderAskSessionSummaries(
    [{ conversation_id: "c1", title: "", updated_at: "2026-09-01T00:00:00Z", message_count: 3 }],
    "c1",
    null,
  );
  assert.deepEqual(summaries, [{
    id: "c1",
    title: "未命名对话",
    updatedAt: "2026-09-01T00:00:00Z",
    messageCount: 3,
    active: true,
  }]);
});

test("tree port mutates items/head via setters without leaking them", () => {
  const state = { items: [], headId: null };
  const port = tree.createReaderConversationTreePort({
    setItems: (updater) => {
      state.items = typeof updater === "function" ? updater(state.items) : updater;
    },
    setHeadId: (next) => {
      state.headId = next;
    },
    itemsRef: {
      get current() { return state.items; },
    },
    headIdRef: {
      get current() { return state.headId; },
    },
  });

  port.appendExchange({ parentId: null, userId: "u1", assistantId: "a1", question: "q", progress: "p" });
  assert.equal(state.items.length, 2);
  assert.equal(state.headId, "a1");
  assert.equal(port.readItems().length, 2);
  assert.equal(port.readHeadId(), "a1");

  port.appendRetryTurn({ assistantId: "a2", branchParent: "u1" });
  assert.equal(state.items.length, 3);
  assert.equal(state.headId, "a2");

  port.markRunningCancelled();
  assert.equal(state.items[1].message.status.type, "incomplete");
  assert.equal(state.items[1].message.status.reason, "cancelled");
  assert.equal(state.items[1].message.content, "已取消");

  port.mergeChatMirror(new Map([["a2", { id: "a2", role: "assistant", content: "done" }]]));
  assert.equal(state.items[2].message.content, "done");

  assert.equal(ports.NOOP_STREAM_PORT.stopStream() instanceof Promise, true);
});
