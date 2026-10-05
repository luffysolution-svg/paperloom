// Durable Reader PDF agent-operation state.
//
// The implementation is split into a pure model (types + ordering predicate),
// an idempotency store, a polling/recovery engine, and an action executor.
// This facade composes them and re-exports the stable public surface. Export
// names, storage keys, poll intervals, and CAS behavior are unchanged.

import { useCallback } from "react";
import type { ReaderAgentOperation, ReaderAgentRuntimeConfig } from "../../../contracts/ai-operations.js";
import { readerAgentOperationPort } from "../../../external.js";
import {
  type ReaderAgentOperationSignal,
} from "./reader-agent-operation-model.js";
import { useReaderAgentOperationPoll } from "./use-reader-agent-operation-poll.js";
import { useReaderAgentOperationPerform } from "./use-reader-agent-operation-perform.js";

export type {
  ReaderAgentOperationSignal,
  ReaderAgentOperationEntry,
  ReaderAgentOperationPerformOptions,
} from "./reader-agent-operation-model.js";
export { shouldReplaceAgentOperation } from "./reader-agent-operation-model.js";

export function useReaderAgentOperations({
  conversationId,
  enabled,
  discovering,
  signal,
  confirmationModeHint,
  onDocumentCommitted,
}: {
  conversationId: string;
  enabled: boolean;
  discovering: boolean;
  signal: ReaderAgentOperationSignal | null;
  confirmationModeHint?: ReaderAgentRuntimeConfig["agent_confirmation_mode"];
  onDocumentCommitted?: (input: { documentId: string; revision: string }) => void;
}) {
  const poll = useReaderAgentOperationPoll({
    conversationId,
    enabled,
    discovering,
    signal,
    confirmationModeHint,
    onDocumentCommitted,
  });

  const { perform } = useReaderAgentOperationPerform({
    refresh: poll.refresh,
    upsert: poll.upsert,
    setEntriesById: poll.setEntriesById,
    inFlightRef: poll.inFlightRef,
  });

  const loadCandidate = useCallback((operation: ReaderAgentOperation) => (
    readerAgentOperationPort()?.fetchCandidate(operation.operation_id)
      ?? Promise.reject(new Error("Reader AI operations unavailable"))
  ), []);

  return {
    entries: poll.entries,
    confirmationMode: poll.confirmationMode,
    runtimeRestarting: poll.runtimeRestarting,
    runtimeCredentialConfigured: poll.runtimeCredentialConfigured,
    perform,
    loadCandidate,
  };
}
