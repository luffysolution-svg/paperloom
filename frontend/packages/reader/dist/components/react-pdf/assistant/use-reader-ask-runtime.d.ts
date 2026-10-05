import type { ReaderAssistantMode } from "../../../shared/ai/ask-answerer.js";
import type { ReaderSelection } from "../../../shared/data/reader-regions.js";
export type { ReaderAskStoreMessage } from "./reader-ask-tree.js";
export type { ReaderAskSessionSummary } from "./use-reader-conversation.js";
export { loadReaderRequestSnapshot, saveReaderRequestSnapshot, } from "./reader-request-snapshots.js";
export type { ReaderRequestSnapshot } from "./reader-request-snapshots.js";
export declare function useReaderAskRuntime(options: {
    jobId: string;
    documentId?: string;
    /**
     * route 身份（job+document 组合）。jobId/documentId 任一变化都会改变它，
     * 因此用它作为 AI 运行时的统一重置 scope，避免只按 jobId 重置时
     * 「documentId 变了但 jobId 不变」导致会话/操作状态串档。
     */
    sessionIdentity?: string;
    enabled: boolean;
    selectionContext?: ReaderSelection | null;
    onDocumentCommitted?: (input: {
        documentId: string;
        revision: string;
    }) => void;
}): {
    citationsByMessageId: Record<string, import("../../../external.js").AiCitationLike[]>;
    progressByMessageId: Record<string, string>;
    contentByMessageId: Record<string, string>;
    streamingAssistantId: string;
    isRunning: boolean;
    messages: import("./reader-ask-tree.js").ReaderAskStoreMessage[];
    sessions: import("./reader-conversation-ports.js").ReaderAskSessionSummary[];
    activeConversationId: string;
    sessionBusy: boolean;
    sessionError: string;
    submitQuestion: (questionInput: string) => Promise<void>;
    retryAnswer: (assistantMessageId: string) => Promise<void>;
    cancelAnswer: () => Promise<void>;
    newSession: () => Promise<void>;
    switchSession: (conversationId: string) => Promise<void>;
    removeSession: (conversationId: string) => Promise<void>;
    renameSession: (conversationId: string, title: string) => Promise<void>;
    branchFromAnswer: (assistantMessageId: string) => Promise<boolean>;
    agentOperations: {
        entries: import("./reader-agent-operation-model.js").ReaderAgentOperationEntry[];
        confirmationMode: "explicit" | "green_light";
        runtimeRestarting: boolean;
        runtimeCredentialConfigured: boolean;
        perform: (action: "run" | "cancel" | "commit" | "retry", operation: import("../../../contracts/ai-operations.js").ReaderAgentOperation, options?: import("./reader-agent-operation-model.js").ReaderAgentOperationPerformOptions) => Promise<void>;
        loadCandidate: (operation: import("../../../contracts/ai-operations.js").ReaderAgentOperation) => Promise<Blob>;
    };
    assistantMode: ReaderAssistantMode;
    setAssistantMode: import("react").Dispatch<import("react").SetStateAction<ReaderAssistantMode>>;
};
//# sourceMappingURL=use-reader-ask-runtime.d.ts.map