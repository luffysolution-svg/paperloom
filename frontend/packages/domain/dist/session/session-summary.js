// 会话记录 → 侧栏摘要（标题兜底、message_count 归一），web 与 reader 共用。
export function toSessionSummary(record, options = {}) {
    const source = record || {};
    const id = `${source.conversation_id || ""}`.trim();
    const summary = {
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
