import test from "node:test";
import assert from "node:assert/strict";
import { loadConversationScopes, saveConversationScopes } from "../../src/features/ask/domain/home-ask-conversation-storage.ts";

test("document and collection selections restore independently for each conversation", () => {
  const values = new Map();
  const original = globalThis.localStorage;
  globalThis.localStorage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  try {
    const document = [{ kind: "document", id: "paper", title: "Paper" }];
    const collection = [{ kind: "collection", id: "collection", title: "Collection" }];
    saveConversationScopes("a", document);
    saveConversationScopes("b", collection);
    assert.deepEqual(loadConversationScopes("a"), document);
    assert.deepEqual(loadConversationScopes("b"), collection);
    assert.deepEqual(loadConversationScopes(), collection);
  } finally { globalThis.localStorage = original; }
});
