import test from "node:test";
import assert from "node:assert/strict";

const shared = await import("@retainpdf/api/agent-operation-model");

test("shared model keeps active/green-light polling decisions", () => {
  assert.equal(shared.agentOperationShouldPoll("queued", "explicit"), true);
  assert.equal(shared.agentOperationShouldPoll("draft", "explicit"), false);
  assert.equal(shared.agentOperationShouldPoll("draft", "green_light"), true);
  assert.equal(shared.agentOperationShouldPoll("result_ready", "green_light"), true);
  assert.equal(shared.agentOperationShouldPoll("committed", "green_light"), false);
});

test("shared event seq prefers finite latest_event_seq and falls back to events", () => {
  assert.equal(shared.agentOperationEventSeq({ current_attempt: 1, latest_event_seq: 4 }), 4);
  assert.equal(
    shared.agentOperationEventSeq({ current_attempt: 1, events: [{ seq: 2 }, { seq: 7 }] }),
    7,
  );
});

test("shared shouldReplace is strict by default and lenient on equal timestamps when opted in", () => {
  const base = {
    current_attempt: 1,
    latest_event_seq: 1,
    updated_at: "2026-09-01T00:00:00Z",
    events: [],
  };
  assert.equal(shared.agentOperationShouldReplace(undefined, base), true);
  assert.equal(shared.agentOperationShouldReplace(base, { ...base }), false);
  assert.equal(
    shared.agentOperationShouldReplace(base, { ...base }, { replaceOnEqualTimestamp: true }),
    true,
  );
  assert.equal(
    shared.agentOperationShouldReplace(base, { ...base, latest_event_seq: 2 }),
    true,
  );
  assert.equal(
    shared.agentOperationShouldReplace(
      { ...base, current_attempt: 2 },
      { ...base, current_attempt: 1 },
    ),
    false,
  );
});

test("shared idempotency helpers preserve reader and web key formats", () => {
  const storage = new Map();
  const storageImpl = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, `${value}`),
    removeItem: (key) => storage.delete(key),
  };
  const keys = new Map();

  const readerKey = shared.resolveAgentOperationActionKey("op-9", "commit", keys, {
    storagePrefix: "retainpdf.reader-agent-operation.action-key.v1:",
    keyPrefix: "reader-",
    storage: storageImpl,
  });
  assert.match(readerKey, /^reader-commit-op-9-/);
  assert.equal(
    storage.get("retainpdf.reader-agent-operation.action-key.v1:op-9:commit"),
    readerKey,
  );

  const uiKeys = new Map();
  const uiKey = shared.resolveAgentOperationActionKey("op-3", "run", uiKeys, {
    storagePrefix: "retainpdf.agent-operation.action-key.v1:",
    keyPrefix: "ui-",
    storage: storageImpl,
  });
  assert.match(uiKey, /^ui-run-op-3-/);
  assert.equal(storage.get("retainpdf.agent-operation.action-key.v1:op-3:run"), uiKey);

  shared.clearAgentOperationActionKey("op-9", "commit", keys, {
    storagePrefix: "retainpdf.reader-agent-operation.action-key.v1:",
    keyPrefix: "reader-",
    storage: storageImpl,
  });
  assert.equal(keys.has("op-9:commit"), false);
  assert.equal(storage.has("retainpdf.reader-agent-operation.action-key.v1:op-9:commit"), false);
});

test("shared error helpers normalize status and message", () => {
  assert.equal(shared.agentOperationErrorStatus(Object.assign(new Error("x"), { status: 409 })), 409);
  assert.equal(shared.agentOperationErrorStatus({}), 0);
  assert.equal(shared.agentOperationErrorMessage(new Error("  失败  ")), "失败");
  assert.equal(shared.agentOperationErrorMessage(null), "操作请求失败，请重试。");
});
