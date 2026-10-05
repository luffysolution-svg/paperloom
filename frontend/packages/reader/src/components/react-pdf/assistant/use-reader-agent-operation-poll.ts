// Polling/recovery engine for durable Reader agent operations. Owns the
// entries store, runtime-config polling, SSE-hint refresh, online/visibility
// recovery, and committed-notification bookkeeping. Preserves every original
// interval (3000 ms config, 1400 ms operation poll) and effect dependency list.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReaderAgentOperation, ReaderAgentRuntimeConfig } from "../../../contracts/ai-operations.js";
import { readerAgentOperationPort } from "../../../external.js";
import {
  shouldPoll,
  shouldReplaceAgentOperation,
  eventSeq,
  type ReaderAgentOperationEntry,
  type ReaderAgentOperationSignal,
} from "./reader-agent-operation-model.js";

export function useReaderAgentOperationPoll({
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
  const [entriesById, setEntriesById] = useState<Record<string, ReaderAgentOperationEntry>>({});
  const [confirmationMode, setConfirmationMode] = useState<ReaderAgentRuntimeConfig["agent_confirmation_mode"]>("explicit");
  const [runtimeRestarting, setRuntimeRestarting] = useState(false);
  const [runtimeCredentialConfigured, setRuntimeCredentialConfigured] = useState(false);
  const inFlightRef = useRef(new Set<string>());
  const notifiedCommittedRef = useRef(new Set<string>());
  const recoveredConversationRef = useRef(new Set<string>());

  const upsert = useCallback((operation: ReaderAgentOperation, settlePending = false) => {
    if (!operation?.operation_id) return;
    setEntriesById((current) => {
      const entry = current[operation.operation_id];
      if (!shouldReplaceAgentOperation(entry?.operation, operation)) {
        if (!settlePending || !entry?.pendingAction) return current;
        return {
          ...current,
          [operation.operation_id]: { ...entry, pendingAction: undefined },
        };
      }
      return {
        ...current,
        [operation.operation_id]: {
          ...entry,
          operation,
          pendingAction: undefined,
          error: undefined,
        },
      };
    });
  }, []);

  const refresh = useCallback(async (operationId: string, settlePending = false) => {
    const id = `${operationId || ""}`.trim();
    const slot = `refresh:${id}`;
    if (!id || inFlightRef.current.has(slot)) return;
    inFlightRef.current.add(slot);
    try {
      const port = readerAgentOperationPort();
      if (!port) return;
      upsert(await port.get(id), settlePending);
    } catch {
      // SSE events are hints. A following list/poll remains authoritative.
    } finally {
      inFlightRef.current.delete(slot);
    }
  }, [upsert]);

  const recover = useCallback(async () => {
    const id = `${conversationId || ""}`.trim();
    const slot = `recover:${id}`;
    if (!enabled || !id || inFlightRef.current.has(slot)) return;
    inFlightRef.current.add(slot);
    try {
      const port = readerAgentOperationPort();
      if (!port) return;
      const result = await port.list(id, { });
      // The first list request hydrates history. A committed operation found in
      // that baseline is not a new commit and must not force the Reader back to
      // the source PDF. Later transitions are still announced normally.
      if (!recoveredConversationRef.current.has(id)) {
        for (const operation of result.operations || []) {
          if (operation.status === "committed") {
            notifiedCommittedRef.current.add(operation.operation_id);
          }
        }
        recoveredConversationRef.current.add(id);
      }
      for (const operation of result.operations || []) upsert(operation);
    } catch {
      // Conversation remains usable when operation recovery is temporarily unavailable.
    } finally {
      inFlightRef.current.delete(slot);
    }
  }, [conversationId, enabled, upsert]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const port = readerAgentOperationPort();
        if (!port) return;
        const config = await port.fetchRuntimeConfig();
        if (cancelled) return;
        setConfirmationMode(config.agent_confirmation_mode || "explicit");
        setRuntimeCredentialConfigured(Boolean(config.llm_api_key_configured));
        setRuntimeRestarting(
          config.restart_required
          || config.restart_state === "pending"
          || config.active_revision !== config.configured_revision,
        );
      } catch {
        if (!cancelled) {
          setRuntimeRestarting(false);
          setRuntimeCredentialConfigured(false);
        }
      }
    };
    void load();
    const timer = window.setInterval(load, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  useEffect(() => {
    if (confirmationModeHint) setConfirmationMode(confirmationModeHint);
  }, [confirmationModeHint]);

  useEffect(() => {
    if (signal?.confirmationMode) setConfirmationMode(signal.confirmationMode);
    if (signal?.operationId) void refresh(signal.operationId);
  }, [refresh, signal]);

  useEffect(() => {
    void recover();
  }, [recover]);

  useEffect(() => {
    if (!discovering) void recover();
  }, [discovering, recover]);

  const entries = useMemo(() => Object.values(entriesById)
    .filter((entry) => Boolean(conversationId) && entry.operation.conversation_id === conversationId)
    .sort((a, b) => `${a.operation.created_at || ""}`.localeCompare(`${b.operation.created_at || ""}`)),
  [conversationId, entriesById]);

  useEffect(() => {
    for (const entry of entries) {
      const operation = entry.operation;
      if (operation.status !== "committed" || notifiedCommittedRef.current.has(operation.operation_id)) {
        continue;
      }
      notifiedCommittedRef.current.add(operation.operation_id);
      onDocumentCommitted?.({
        documentId: operation.document_id,
        revision: operation.candidate?.version_id
          || `${operation.updated_at || ""}`
          || `${operation.operation_id}:${eventSeq(operation)}`,
      });
    }
  }, [entries, onDocumentCommitted]);

  const needsPolling = entries.some((entry) => shouldPoll(entry.operation.status, confirmationMode));
  useEffect(() => {
    if (!enabled || !conversationId || (!discovering && !needsPolling)) return;
    const timer = window.setInterval(() => {
      void recover();
      for (const entry of entries) {
        if (shouldPoll(entry.operation.status, confirmationMode)) {
          void refresh(entry.operation.operation_id);
        }
      }
    }, 1400);
    return () => window.clearInterval(timer);
  }, [confirmationMode, conversationId, discovering, enabled, entries, needsPolling, recover, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const sync = () => void recover();
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, recover]);

  return {
    entries,
    confirmationMode,
    runtimeRestarting,
    runtimeCredentialConfigured,
    setEntriesById,
    inFlightRef,
    upsert,
    refresh,
  };
}
