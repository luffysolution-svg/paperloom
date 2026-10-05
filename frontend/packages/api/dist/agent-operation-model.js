// Shared, browser-safe pure model for durable agent operations.
//
// Reader (PDF panel) and the web ask surface used to carry near-identical
// copies of these decision functions. They now delegate here so the polling
// sets, stale-snapshot ordering, and idempotency-key construction cannot drift.
//
// Nothing in this module touches React, the DOM, fetch, or global storage; the
// idempotency helpers receive their storage/prefixes from the caller so each
// surface keeps its exact on-disk sessionStorage format.
export const AGENT_OPERATION_ACTIVE_STATUSES = new Set([
    "queued",
    "running",
    "validating",
]);
export const AGENT_OPERATION_GREEN_LIGHT_TRANSITION_STATUSES = new Set([
    "draft",
    "awaiting_confirmation",
    "result_ready",
]);
/**
 * Statuses that must keep being polled. Active work is always polled; the
 * green-light transition statuses are polled only in green-light mode, where
 * the server advances them without a user action.
 */
export function agentOperationShouldPoll(status, mode) {
    return AGENT_OPERATION_ACTIVE_STATUSES.has(status)
        || (mode === "green_light" && AGENT_OPERATION_GREEN_LIGHT_TRANSITION_STATUSES.has(status));
}
/**
 * Ordering sequence for an operation snapshot: the explicit `latest_event_seq`
 * when it is a finite number, otherwise the highest embedded event seq.
 */
export function agentOperationEventSeq(operation) {
    const latest = Number(operation?.latest_event_seq);
    if (Number.isFinite(latest))
        return latest;
    return Math.max(0, ...(operation?.events || []).map((event) => Number(event?.seq) || 0));
}
/**
 * Deterministic stale-snapshot predicate: newer attempts win; within an attempt
 * newer event seq wins; ties fall back to `updated_at`. `replaceOnEqualTimestamp`
 * selects strict (`>`) versus non-strict (`>=`) handling of the final tie.
 */
export function agentOperationShouldReplace(current, next, options = {}) {
    if (!current)
        return true;
    if (next.current_attempt !== current.current_attempt) {
        return next.current_attempt > current.current_attempt;
    }
    const currentSeq = agentOperationEventSeq(current);
    const nextSeq = agentOperationEventSeq(next);
    if (currentSeq !== nextSeq)
        return nextSeq > currentSeq;
    const currentUpdated = `${current.updated_at || ""}`;
    const nextUpdated = `${next.updated_at || ""}`;
    return options.replaceOnEqualTimestamp
        ? nextUpdated >= currentUpdated
        : nextUpdated > currentUpdated;
}
export function makeAgentOperationActionKey(operationId, action, keyPrefix) {
    const random = globalThis.crypto?.randomUUID?.()
        || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    return `${keyPrefix}${action}-${operationId}-${random}`.slice(0, 128);
}
/**
 * Resolve the idempotency key for an operation+action, reusing an in-memory
 * key, then a sessionStorage-persisted key, then minting a new one. The storage
 * slot and key body match the caller's pre-migration format exactly.
 */
export function resolveAgentOperationActionKey(operationId, action, keys, options) {
    const keySlot = `${operationId}:${action}`;
    const storageSlot = `${options.storagePrefix}${keySlot}`;
    let storedKey = "";
    try {
        storedKey = `${options.storage?.getItem(storageSlot) || ""}`.trim();
    }
    catch { /* optional */ }
    const idempotencyKey = keys.get(keySlot)
        || storedKey
        || makeAgentOperationActionKey(operationId, action, options.keyPrefix);
    keys.set(keySlot, idempotencyKey);
    try {
        options.storage?.setItem(storageSlot, idempotencyKey);
    }
    catch { /* optional */ }
    return idempotencyKey;
}
export function clearAgentOperationActionKey(operationId, action, keys, options) {
    keys.delete(`${operationId}:${action}`);
    try {
        options.storage?.removeItem(`${options.storagePrefix}${operationId}:${action}`);
    }
    catch { /* optional */ }
}
export function agentOperationErrorStatus(error) {
    return Number(error?.status) || 0;
}
export function agentOperationErrorMessage(error) {
    return error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "操作请求失败，请重试。";
}
