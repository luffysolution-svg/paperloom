// Action execution for agent operations: builds the CAS request body
// (expected status/attempt/program hash), resolves the idempotency key, and
// degrades 409 conflicts into a settle-refresh. Owns only the action-key map
// and never the polling store.

import { useCallback, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { ReaderAgentOperation, ReaderAgentRuntimeConfig } from "../../../contracts/ai-operations.js";
import { readerAgentOperationPort } from "../../../external.js";
import {
  errorMessage,
  errorStatus,
  type ReaderAgentOperationEntry,
  type ReaderAgentOperationPerformOptions,
} from "./reader-agent-operation-model.js";
import {
  clearAgentOperationActionKey,
  resolveAgentOperationActionKey,
} from "./reader-agent-operation-idempotency.js";

export function useReaderAgentOperationPerform({
  refresh,
  upsert,
  setEntriesById,
  inFlightRef,
}: {
  refresh: (operationId: string, settlePending?: boolean) => Promise<void>;
  upsert: (operation: ReaderAgentOperation, settlePending?: boolean) => void;
  setEntriesById: Dispatch<SetStateAction<Record<string, ReaderAgentOperationEntry>>>;
  inFlightRef: MutableRefObject<Set<string>>;
}) {
  const actionKeysRef = useRef(new Map<string, string>());

  const perform = useCallback(async (
    action: "run" | "cancel" | "commit" | "retry",
    operation: ReaderAgentOperation,
    options: ReaderAgentOperationPerformOptions = {},
  ) => {
    const operationId = `${operation.operation_id || ""}`.trim();
    const flightSlot = `action:${operationId}`;
    if (!operationId || inFlightRef.current.has(flightSlot)) return;
    if (action === "retry" && operation.status === "ambiguous" && options.acceptDuplicateRisk !== true) {
      setEntriesById((current) => ({
        ...current,
        [operationId]: {
          ...current[operationId],
          error: "请先确认重复执行风险，再重新执行操作。",
        },
      }));
      return;
    }

    const idempotencyKey = resolveAgentOperationActionKey(operationId, action, actionKeysRef.current);

    inFlightRef.current.add(flightSlot);
    setEntriesById((current) => ({
      ...current,
      [operationId]: { ...current[operationId], pendingAction: action, error: undefined },
    }));

    const common = {
      idempotency_key: idempotencyKey,
      expected_status: operation.status,
      expected_attempt: operation.current_attempt,
      expected_program_sha256: operation.program_sha256 || "",
    };
    try {
      const port = readerAgentOperationPort();
      if (!port) throw new Error("Reader AI operations unavailable");
      let next: ReaderAgentOperation;
      if (action === "run") next = await port.run(operationId, common);
      else if (action === "cancel") {
        next = await port.cancel(operationId, { ...common, reason: "user_rejected" });
      } else if (action === "commit") next = await port.commit(operationId, common);
      else {
        next = await port.retry(operationId, options.acceptDuplicateRisk
          ? { ...common, accept_duplicate_risk: true }
          : common);
      }
      clearAgentOperationActionKey(operationId, action, actionKeysRef.current);
      upsert(next, true);
    } catch (error) {
      if (errorStatus(error) === 409) {
        clearAgentOperationActionKey(operationId, action, actionKeysRef.current);
        await refresh(operationId, true);
      } else {
        setEntriesById((current) => ({
          ...current,
          [operationId]: {
            ...current[operationId],
            pendingAction: undefined,
            error: errorMessage(error),
          },
        }));
      }
    } finally {
      inFlightRef.current.delete(flightSlot);
    }
  }, [refresh, upsert]);

  return { perform };
}
