import type { AiCitationLike, ConversationRecord } from "../../../external.js";
import type { ReaderAskTreeItem } from "./reader-ask-tree.js";
import type { ReaderAskSessionSummary, ReaderConversationRemotePort } from "./reader-conversation-ports.js";
export declare function citationsByMessageIdFromItems(items: readonly ReaderAskTreeItem[]): Record<string, AiCitationLike[]>;
export declare function progressByMessageIdFromItems(items: readonly ReaderAskTreeItem[]): Record<string, string>;
export declare function contentByMessageIdFromItems(items: readonly ReaderAskTreeItem[]): Record<string, string>;
export declare function buildReaderAskSessionSummaries(sessions: readonly ConversationRecord[], activeConversationId: string, remoteAnswerer: ReaderConversationRemotePort | null | undefined): ReaderAskSessionSummary[];
//# sourceMappingURL=reader-conversation-derived.d.ts.map