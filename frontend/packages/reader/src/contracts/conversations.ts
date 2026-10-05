export type ReaderConversationRecord = {
  conversation_id: string;
  title: string;
  document_id?: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
  head_id?: string;
};
export type ReaderMessageRecord = {
  message_id: string;
  conversation_id: string;
  seq: number;
  role: "user" | "assistant" | string;
  content: string;
  citations_json?: string;
  tool_trace_json?: string;
  model?: string;
  created_at: string;
  parent_id?: string;
};
export type ReaderConversationDetail = ReaderConversationRecord & { messages: ReaderMessageRecord[] };
export type ReaderConversationPathItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: unknown[];
  parentId?: string | null;
};
export type ReaderConversationPort = {
  create: (payload?: { title?: string; document_id?: string }) => Promise<ReaderConversationRecord>;
  list: (query?: { limit?: number; offset?: number; document_id?: string }) => Promise<{ conversations: ReaderConversationRecord[] }>;
  get: (conversationId: string) => Promise<ReaderConversationDetail>;
  delete: (conversationId: string) => Promise<{ deleted: boolean }>;
  patch: (conversationId: string, payload: { head_id?: string; title?: string }) => Promise<ReaderConversationRecord>;
  appendMessage: (conversationId: string, payload: Record<string, unknown>) => Promise<ReaderMessageRecord>;
  forkFromPath: (options: { documentId?: string; title?: string; path: ReaderConversationPathItem[] }) => Promise<{ conversation: ReaderConversationRecord; items: Array<{ parentId: string | null; message: any }> }>;
};
