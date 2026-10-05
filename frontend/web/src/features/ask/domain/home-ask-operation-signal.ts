// Agent 操作变更信号：一次 Agent turn 可能创建/触碰多个 operation，
// 用带 revision 的信号日志（而非 last-write-wins 标量）驱动 operations 刷新。

export type HomeAgentOperationSignal = {
  operationId: string;
  conversationId: string;
  revision: number;
  dedupeKey: string;
};

/** 一次 turn 结束时要补发的信号（尚未编号，revision 由信号日志分配）。 */
export type HomeAgentOperationSignalDraft = Omit<HomeAgentOperationSignal, "revision">;

/**
 * 从 /ai/ask 的最终结果里扇出操作刷新信号。
 *
 * 流式回调已经报过一轮，但非流式 JSON 响应根本不走 SSE 回调，只能从 done 的结果里
 * 补。dedupeKey 带上 attempt 和 seq，好让业务层把这两条路重复的那部分收敛掉。
 */
export function operationSignalsFromResult(
  result: {
    operationRefs?: unknown;
    confirmationRequests?: unknown;
  } | null | undefined,
  conversationId: string,
): HomeAgentOperationSignalDraft[] {
  const drafts: HomeAgentOperationSignalDraft[] = [];

  for (const ref of Array.isArray(result?.operationRefs) ? result.operationRefs : []) {
    const entry = ref as { operation_id?: string; current_attempt?: unknown; latest_event_seq?: unknown };
    const operationId = typeof ref === "string" ? ref.trim() : `${entry?.operation_id || ""}`.trim();
    if (!operationId) continue;
    const attempt = typeof ref === "string" ? 0 : Number(entry?.current_attempt) || 0;
    const latestSeq = typeof ref === "string" ? 0 : Number(entry?.latest_event_seq) || 0;
    drafts.push({
      operationId,
      conversationId,
      dedupeKey: `${operationId}:done:${attempt}:${latestSeq}`,
    });
  }

  for (const request of Array.isArray(result?.confirmationRequests) ? result.confirmationRequests : []) {
    const entry = request as { operation_id?: string; action?: string; current_attempt?: unknown };
    const operationId = `${entry?.operation_id || ""}`.trim();
    if (!operationId) continue;
    drafts.push({
      operationId,
      conversationId,
      dedupeKey: `${operationId}:${entry?.action || "refresh"}:${Number(entry?.current_attempt) || 0}`,
    });
  }

  return drafts;
}
