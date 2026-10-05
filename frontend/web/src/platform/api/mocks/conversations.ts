// AI 会话 CRUD mock 适配器：只保留 mock 分支（真实网络走 @retainpdf/api/conversations）。

import { API_PREFIX } from "@/platform/config/api-constants.js";

export type ConversationRecord = {
  conversation_id: string;
  title: string;
  document_id?: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
  head_id?: string;
};

export type MessageRecord = {
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

export type ConversationDetail = ConversationRecord & {
  messages: MessageRecord[];
};

export async function createConversation(
  payload: { title?: string; document_id?: string } = {},
  apiPrefix = API_PREFIX,
): Promise<ConversationRecord> {
  void apiPrefix;
  return {
    conversation_id: `mock-conv-${Date.now().toString(36)}`,
    title: payload.title || "",
    document_id: payload.document_id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    message_count: 0,
    head_id: "",
  };
}

export async function listConversations(
  query: { limit?: number; offset?: number; document_id?: string } = {},
  apiPrefix = API_PREFIX,
): Promise<{ conversations: ConversationRecord[] }> {
  void query;
  void apiPrefix;
  return { conversations: [] };
}

export async function getConversation(
  conversationId: string,
  apiPrefix = API_PREFIX,
): Promise<ConversationDetail> {
  void apiPrefix;
  const id = `${conversationId || ""}`.trim();
  if (!id) {
    throw new Error("conversation_id required");
  }
  return {
    conversation_id: id,
    title: "",
    created_at: "",
    updated_at: "",
    message_count: 0,
    head_id: "",
    messages: [],
  };
}

export async function deleteConversation(
  conversationId: string,
  apiPrefix = API_PREFIX,
): Promise<{ deleted: boolean }> {
  void apiPrefix;
  const id = `${conversationId || ""}`.trim();
  if (!id) {
    throw new Error("conversation_id required");
  }
  return { deleted: true };
}

export async function patchConversation(
  conversationId: string,
  payload: { head_id?: string; title?: string },
  apiPrefix = API_PREFIX,
): Promise<ConversationRecord> {
  void apiPrefix;
  const id = `${conversationId || ""}`.trim();
  if (!id) {
    throw new Error("conversation_id required");
  }
  return {
    conversation_id: id,
    title: payload.title || "",
    created_at: "",
    updated_at: "",
    head_id: payload.head_id || "",
  };
}

export async function appendConversationMessage(
  conversationId: string,
  payload: {
    role: string;
    content: string;
    parent_id?: string;
    message_id?: string;
    citations_json?: string;
    tool_trace_json?: string;
    model?: string;
    set_head?: boolean;
  },
  apiPrefix = API_PREFIX,
): Promise<MessageRecord> {
  void apiPrefix;
  const id = `${conversationId || ""}`.trim();
  if (!id) {
    throw new Error("conversation_id required");
  }
  return {
    message_id: payload.message_id || `mock-msg-${Date.now().toString(36)}`,
    conversation_id: id,
    seq: 1,
    role: payload.role,
    content: payload.content,
    parent_id: payload.parent_id || "",
    created_at: new Date().toISOString(),
  };
}

/** 去掉 fork-n- / 分支 · 前缀，得到原始对话名。 */
export function baseConversationTitle(title: string): string {
  let t = `${title || ""}`.replace(/\s+/g, " ").trim();
  if (!t) return "未命名对话";
  const fork = t.match(/^fork-\d+-(.+)$/i);
  if (fork?.[1]) t = fork[1].trim();
  t = t.replace(/^分支\s*[·•\-—]\s*/, "").trim();
  return t || "未命名对话";
}

/**
 * 生成 fork 标题：fork-n-xxx
 * n 为相对同一原始名已有 fork 的递增序号；xxx 为原对话名。
 */
export function nextForkConversationTitle(
  sourceTitle: string,
  existingTitles: string[] = [],
): string {
  const base = baseConversationTitle(sourceTitle);
  let maxN = 0;
  for (const raw of existingTitles) {
    const t = `${raw || ""}`.trim();
    const m = t.match(/^fork-(\d+)-(.+)$/i);
    if (!m) continue;
    if (baseConversationTitle(t) !== base) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > maxN) maxN = n;
  }
  const title = `fork-${maxN + 1}-${base}`;
  // DB/UI 标题不宜过长
  return title.length > 80 ? `${title.slice(0, 79).trim()}…` : title;
}

/**
 * 从答案处分叉成「新会话窗口」：
 * 把 root→fork 路径复制到新 conversation（新 message_id），原会话不动。
 */
export async function forkConversationFromPath(
  options: {
    documentId?: string;
    title?: string;
    path: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      citations?: unknown[];
      parentId?: string | null;
    }>;
  },
  apiPrefix = API_PREFIX,
): Promise<{ conversation: ConversationRecord; items: ReturnType<typeof messagesToBranchItems> }> {
  void apiPrefix;
  const path = options.path || [];
  if (!path.length) {
    throw new Error("fork path empty");
  }
  const firstUser = path.find((m) => m.role === "user");
  const rawTitle = `${options.title || firstUser?.content || "未命名对话"}`.replace(/\s+/g, " ").trim();
  const title = rawTitle.length > 80 ? `${rawTitle.slice(0, 79).trim()}…` : rawTitle;

  const idMap = new Map<string, string>();
  const makeId = (role: string, i: number) =>
    `fork-${role[0] || "m"}-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 7)}`;

  path.forEach((m, i) => {
    idMap.set(m.id, makeId(m.role, i));
  });

  const forkMessages = path.map((m, i) => {
    const newId = idMap.get(m.id)!;
    const parentRaw = m.parentId ? idMap.get(m.parentId) || "" : "";
    const parentId =
      parentRaw
      || (i > 0 ? idMap.get(path[i - 1].id) || "" : "");
    let citations_json = "";
    if (m.citations?.length) {
      try {
        citations_json = JSON.stringify(m.citations);
      } catch {
        citations_json = "[]";
      }
    }
    return {
      role: m.role,
      content: m.content,
      message_id: newId,
      parent_id: parentId,
      citations_json,
    };
  });

  const items: ReturnType<typeof messagesToBranchItems> = forkMessages.map((fm) => ({
    parentId: fm.parent_id || null,
    message: {
      id: fm.message_id,
      role: fm.role as "user" | "assistant",
      content: fm.content,
      ...(fm.citations_json && fm.citations_json !== "[]" ? { citations: JSON.parse(fm.citations_json) } : {}),
      ...(fm.role === "assistant"
        ? { status: { type: "complete", reason: "stop" as const } }
        : {}),
    },
  }));

  const mockConv: ConversationRecord = {
    conversation_id: `mock-conv-${Date.now().toString(36)}`,
    title: title || "未命名对话",
    document_id: options.documentId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    message_count: forkMessages.length,
    head_id: forkMessages[forkMessages.length - 1]?.message_id || "",
  };
  return { conversation: mockConv, items };
}

/** 服务端消息 → 前端分支树 items。 */
export function messagesToBranchItems(messages: MessageRecord[]): Array<{
  parentId: string | null;
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations?: unknown[];
    status?: { type: string; reason?: string };
  };
}> {
  const items: Array<{
    parentId: string | null;
    message: {
      id: string;
      role: "user" | "assistant";
      content: string;
      citations?: unknown[];
      status?: { type: string; reason?: string };
    };
  }> = [];
  for (const m of messages) {
    const role = m.role === "user" || m.role === "assistant" ? m.role : null;
    if (!role) continue;
    let citations: unknown[] | undefined;
    try {
      const raw = JSON.parse(m.citations_json || "[]");
      if (Array.isArray(raw) && raw.length) citations = raw;
    } catch {
      // ignore
    }
    const parent = `${m.parent_id || ""}`.trim();
    items.push({
      parentId: parent || null,
      message: {
        id: m.message_id,
        role,
        content: m.content || "",
        ...(citations ? { citations } : {}),
        // assistant-ui: status 仅允许 assistant；user 带 status 会直接 throw
        ...(role === "assistant"
          ? { status: { type: "complete", reason: "stop" } }
          : {}),
      },
    });
  }
  return items;
}
