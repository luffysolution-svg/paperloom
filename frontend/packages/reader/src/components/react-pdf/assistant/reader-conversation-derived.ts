// Pure selectors over the conversation tree/session list. No React state and
// no side effects, so the shell can memoize them with the same dependency
// lists it used before extraction.

import { toSessionSummary } from "@retainpdf/domain/session";
import type { AiCitationLike, ConversationRecord } from "../../../external.js";
import type { ReaderAskTreeItem } from "./reader-ask-tree.js";
import type {
  ReaderAskSessionSummary,
  ReaderConversationRemotePort,
} from "./reader-conversation-ports.js";

export function citationsByMessageIdFromItems(
  items: readonly ReaderAskTreeItem[],
): Record<string, AiCitationLike[]> {
  const map: Record<string, AiCitationLike[]> = {};
  for (const item of items) {
    const m = item.message;
    if (m.role === "assistant" && m.citations?.length) {
      map[m.id] = m.citations;
    }
  }
  return map;
}

export function progressByMessageIdFromItems(
  items: readonly ReaderAskTreeItem[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of items) {
    const m = item.message;
    if (m.role === "assistant" && m.progress) {
      map[m.id] = m.progress;
    }
  }
  return map;
}

export function contentByMessageIdFromItems(
  items: readonly ReaderAskTreeItem[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of items) {
    const m = item.message;
    if (m.content) map[m.id] = m.content;
  }
  return map;
}

export function buildReaderAskSessionSummaries(
  sessions: readonly ConversationRecord[],
  activeConversationId: string,
  remoteAnswerer: ReaderConversationRemotePort | null | undefined,
): ReaderAskSessionSummary[] {
  const active = activeConversationId
    || remoteAnswerer?.getConversationId?.()
    || "";
  return (sessions || []).map((s) => ({
    ...toSessionSummary(s, { active }),
    active: s.conversation_id === active,
  }));
}
