// 会话列表项：服务端 ConversationRecord → 侧栏 HomeAskSession（归一逻辑见 domain）

import type { ConversationRecord } from "@/platform/api/index.js";
import { toSessionSummary } from "@retainpdf/domain/session";

export type HomeAskSession = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  documentId?: string;
};

export function recordToSession(c: ConversationRecord): HomeAskSession {
  return toSessionSummary(c, { documentId: true });
}
