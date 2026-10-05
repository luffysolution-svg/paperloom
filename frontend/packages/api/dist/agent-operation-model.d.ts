import type { AgentConfirmationMode } from "./agent-runtime-settings.js";
/**
 * Minimal structural view of an operation snapshot. Both the public
 * `@retainpdf/api` `AgentOperationView` and the web-local view type satisfy it.
 */
export type AgentOperationSnapshot = {
    current_attempt: number;
    latest_event_seq?: number | null;
    updated_at?: string | null;
    events?: ReadonlyArray<{
        seq?: number;
    } | null> | null;
};
export declare const AGENT_OPERATION_ACTIVE_STATUSES: ReadonlySet<string>;
export declare const AGENT_OPERATION_GREEN_LIGHT_TRANSITION_STATUSES: ReadonlySet<string>;
/**
 * Statuses that must keep being polled. Active work is always polled; the
 * green-light transition statuses are polled only in green-light mode, where
 * the server advances them without a user action.
 */
export declare function agentOperationShouldPoll(status: string, mode: AgentConfirmationMode): boolean;
/**
 * Ordering sequence for an operation snapshot: the explicit `latest_event_seq`
 * when it is a finite number, otherwise the highest embedded event seq.
 */
export declare function agentOperationEventSeq(operation: AgentOperationSnapshot): number;
export type AgentOperationReplaceOptions = {
    /**
     * When true, a snapshot that does not advance attempt/seq/updated_at may still
     * replace the current one. The web reducer relies on this so a mutation
     * response echoing the same server snapshot can settle a pending action.
     * When false (default), identical snapshots are ignored, which is what the
     * Reader polling engine wants so unchanged polls do not clear pending/error
     * state. Both behaviors keep the original per-surface semantics.
     */
    replaceOnEqualTimestamp?: boolean;
};
/**
 * Deterministic stale-snapshot predicate: newer attempts win; within an attempt
 * newer event seq wins; ties fall back to `updated_at`. `replaceOnEqualTimestamp`
 * selects strict (`>`) versus non-strict (`>=`) handling of the final tie.
 */
export declare function agentOperationShouldReplace(current: AgentOperationSnapshot | undefined, next: AgentOperationSnapshot, options?: AgentOperationReplaceOptions): boolean;
export type AgentOperationActionKeyStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type AgentOperationIdempotencyOptions = {
    /** sessionStorage slot prefix, e.g. "retainpdf.reader-agent-operation.action-key.v1:". */
    storagePrefix: string;
    /** key body prefix, e.g. "reader-" or "ui-". */
    keyPrefix: string;
    storage?: AgentOperationActionKeyStorage;
};
export declare function makeAgentOperationActionKey(operationId: string, action: string, keyPrefix: string): string;
/**
 * Resolve the idempotency key for an operation+action, reusing an in-memory
 * key, then a sessionStorage-persisted key, then minting a new one. The storage
 * slot and key body match the caller's pre-migration format exactly.
 */
export declare function resolveAgentOperationActionKey(operationId: string, action: string, keys: Map<string, string>, options: AgentOperationIdempotencyOptions): string;
export declare function clearAgentOperationActionKey(operationId: string, action: string, keys: Map<string, string>, options: AgentOperationIdempotencyOptions): void;
export declare function agentOperationErrorStatus(error: unknown): number;
export declare function agentOperationErrorMessage(error: unknown): string;
