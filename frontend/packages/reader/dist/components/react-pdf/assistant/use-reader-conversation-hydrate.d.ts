import { type MutableRefObject } from "react";
import { messagesToBranchItems, type ConversationRecord } from "../../../external.js";
import { type ReaderAskTreeItem } from "./reader-ask-tree.js";
import type { ReaderConversationRemotePort, ReaderConversationStreamPort } from "./reader-conversation-ports.js";
export declare function useReaderConversationHydrate(params: {
    jobId: string;
    documentId: string;
    enabled: boolean;
    refreshSessions: (documentId?: string, expectedSwitchToken?: number) => Promise<ConversationRecord[] | null>;
    applyConversationTree: (branchItems: ReturnType<typeof messagesToBranchItems>, head?: string | null) => void;
    remoteRef: MutableRefObject<ReaderConversationRemotePort | null>;
    streamRef: MutableRefObject<ReaderConversationStreamPort>;
    itemsRef: MutableRefObject<ReaderAskTreeItem[]>;
    documentIdRef: MutableRefObject<string>;
    lastJobRef: MutableRefObject<string>;
    persistReadyRef: MutableRefObject<boolean>;
    switchTokenRef: MutableRefObject<number>;
    sessionListGenerationRef: MutableRefObject<number>;
    activeConversationIdRef: MutableRefObject<string>;
    setItems: (items: ReaderAskTreeItem[]) => void;
    setHeadId: (headId: string | null) => void;
    setSessions: (sessions: ConversationRecord[]) => void;
    setActiveConversationId: (conversationId: string) => void;
    setSessionBusy: (busy: boolean) => void;
}): void;
//# sourceMappingURL=use-reader-conversation-hydrate.d.ts.map