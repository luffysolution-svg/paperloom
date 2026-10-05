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
export declare function toSessionSummary(record: SessionSummaryRecord | null | undefined, options?: ToSessionSummaryOptions): SessionSummary;
