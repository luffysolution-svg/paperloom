import { type ReaderAskTreeItem } from "./reader-ask-tree.js";
import { type ReaderAskSessionSummary, type ReaderConversationRemotePort, type ReaderConversationSessionCommands, type ReaderConversationStreamPort, type ReaderConversationTreePort } from "./reader-conversation-ports.js";
export type { ReaderAskSessionSummary, ReaderConversationRemotePort, ReaderConversationStreamPort, ReaderConversationTreePort, ReaderConversationSessionCommands, };
export declare function useReaderConversation(options: {
    jobId: string;
    documentId?: string;
    enabled: boolean;
    remoteAnswerer?: ReaderConversationRemotePort | null;
    stream?: ReaderConversationStreamPort;
}): {
    items: ReaderAskTreeItem[];
    headId: string;
    messages: import("./reader-ask-tree.js").ReaderAskStoreMessage[];
    citationsByMessageId: Record<string, import("../../../external.js").AiCitationLike[]>;
    progressByMessageId: Record<string, string>;
    contentByMessageId: Record<string, string>;
    sessions: ReaderAskSessionSummary[];
    activeConversationId: string;
    sessionBusy: boolean;
    sessionError: string;
    resolveRequestScopeKey: () => string;
    tree: ReaderConversationTreePort;
    sessionCommands: ReaderConversationSessionCommands;
};
export type ReaderConversation = ReturnType<typeof useReaderConversation>;
//# sourceMappingURL=use-reader-conversation.d.ts.map