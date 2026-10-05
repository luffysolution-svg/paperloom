import { type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { messagesToBranchItems } from "../../../external.js";
import { type ReaderAskTreeItem } from "./reader-ask-tree.js";
import type { ReaderConversationRecord } from "../../../contracts/conversations.js";
import type { ReaderConversationRemotePort, ReaderConversationStreamPort } from "./reader-conversation-ports.js";
export declare function useReaderSessionCommands(params: {
    jobId: string;
    documentId: string;
    sessionBusy: boolean;
    sessions: readonly ReaderConversationRecord[];
    streamRef: MutableRefObject<ReaderConversationStreamPort>;
    remoteRef: MutableRefObject<ReaderConversationRemotePort | null>;
    itemsRef: MutableRefObject<ReaderAskTreeItem[]>;
    headIdRef: MutableRefObject<string | null>;
    activeConversationIdRef: MutableRefObject<string>;
    documentIdRef: MutableRefObject<string>;
    switchTokenRef: MutableRefObject<number>;
    persistReadyRef: MutableRefObject<boolean>;
    setSessionBusy: (busy: boolean) => void;
    setSessionError: (error: string) => void;
    setActiveConversationId: (conversationId: string) => void;
    setItems: Dispatch<SetStateAction<ReaderAskTreeItem[]>>;
    setHeadId: Dispatch<SetStateAction<string | null>>;
    setSessions: Dispatch<SetStateAction<ReaderConversationRecord[]>>;
    refreshSessions: (documentId?: string, expectedSwitchToken?: number) => Promise<ReaderConversationRecord[] | null>;
    applyConversationTree: (branchItems: ReturnType<typeof messagesToBranchItems>, head?: string | null) => void;
}): {
    adoptRemoteConversationId: () => void;
    newSession: () => Promise<void>;
    branchFromAnswer: (assistantMessageId: string) => Promise<boolean>;
    removeSession: (conversationId: string) => Promise<void>;
    renameSession: (conversationId: string, title: string) => Promise<void>;
};
//# sourceMappingURL=use-reader-session-commands.d.ts.map