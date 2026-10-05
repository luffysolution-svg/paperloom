// Idempotency-key storage for agent operation actions. Keys are scoped per
// operation+action, cached in a Map for the current page, and mirrored to
// sessionStorage so a reload can replay the same action key. Prefix and
// behavior are unchanged from the original hook; the key construction is
// delegated to `@retainpdf/api/agent-operation-model`.

import {
  resolveAgentOperationActionKey as resolveSharedActionKey,
  clearAgentOperationActionKey as clearSharedActionKey,
  type AgentOperationActionKeyStorage,
} from "@retainpdf/api/agent-operation-model";
import {
  ACTION_KEY_PREFIX,
  READER_ACTION_KEY_ID_PREFIX,
} from "./reader-agent-operation-model.js";

function readerActionKeyStorage(): AgentOperationActionKeyStorage | undefined {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}

function readerOptions() {
  return {
    storagePrefix: ACTION_KEY_PREFIX,
    keyPrefix: READER_ACTION_KEY_ID_PREFIX,
    storage: readerActionKeyStorage(),
  };
}

export function resolveAgentOperationActionKey(
  operationId: string,
  action: string,
  keys: Map<string, string>,
): string {
  return resolveSharedActionKey(operationId, action, keys, readerOptions());
}

export function clearAgentOperationActionKey(
  operationId: string,
  action: string,
  keys: Map<string, string>,
): void {
  clearSharedActionKey(operationId, action, keys, readerOptions());
}
