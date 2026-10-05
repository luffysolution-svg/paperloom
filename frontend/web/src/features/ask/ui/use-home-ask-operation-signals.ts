// Agent 操作信号日志：带去重 + 单调 revision，驱动 operations 子 hook 刷新。

import { useCallback, useRef, useState } from "react";
import type { HomeAgentOperationSignal } from "../domain/home-ask-operation-signal.js";

export function useHomeAskOperationSignals() {
  const [operationSignals, setOperationSignals] = useState<HomeAgentOperationSignal[]>([]);
  const operationSignalKeysRef = useRef(new Set<string>());
  const operationSignalRevisionRef = useRef(0);

  const enqueueOperationSignal = useCallback(({
    operationId,
    conversationId,
    dedupeKey,
  }: {
    operationId: string;
    conversationId: string;
    dedupeKey: string;
  }) => {
    const normalizedOperationId = `${operationId || ""}`.trim();
    const normalizedConversationId = `${conversationId || ""}`.trim();
    const normalizedKey = `${dedupeKey || ""}`.trim();
    if (!normalizedOperationId || !normalizedConversationId || !normalizedKey) return;
    if (operationSignalKeysRef.current.has(normalizedKey)) return;
    operationSignalKeysRef.current.add(normalizedKey);
    operationSignalRevisionRef.current += 1;
    const next: HomeAgentOperationSignal = {
      operationId: normalizedOperationId,
      conversationId: normalizedConversationId,
      revision: operationSignalRevisionRef.current,
      dedupeKey: normalizedKey,
    };
    // A single Agent turn may create or touch multiple operations in one React
    // tick. Keep a small signal journal instead of a last-write-wins scalar.
    setOperationSignals((current) => [...current, next].slice(-64));
  }, []);

  const resetOperationSignals = useCallback(() => {
    setOperationSignals([]);
    operationSignalKeysRef.current.clear();
  }, []);

  return { operationSignals, enqueueOperationSignal, resetOperationSignals };
}
