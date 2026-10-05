// 会话记录 → 侧栏摘要（标题兜底、message_count 归一），web 与 reader 共用。

export type SessionSummaryRecord = {
  conversation_id?: string | null;
  title?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  message_count?: number | string | null;
  document_id?: string | null;
};

export type SessionSummary = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  active?: boolean;
  documentId?: string;
};

export type ToSessionSummaryOptions = {
  /** 当前活动会话 id；提供时按 `id === active` 写入 `active`。 */
  active?: string;
  /** 为 true 时附带归一后的 `documentId`。 */
  documentId?: boolean;
};

export function toSessionSummary(
  record: SessionSummaryRecord | null | undefined,
  options: ToSessionSummaryOptions = {},
): SessionSummary {
  const source = record || {};
  const id = `${source.conversation_id || ""}`.trim();
  const summary: SessionSummary = {
    id,
    title: `${source.title || ""}`.trim() || "未命名对话",
    updatedAt: `${source.updated_at || source.created_at || ""}`,
    messageCount: Number(source.message_count) || 0,
  };
  if (options.documentId) {
    summary.documentId = `${source.document_id || ""}`.trim() || undefined;
  }
  if (options.active !== undefined) {
    summary.active = id === options.active;
  }
  return summary;
}
