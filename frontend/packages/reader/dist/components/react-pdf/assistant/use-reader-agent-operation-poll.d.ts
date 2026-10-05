import type { ReaderAgentOperation, ReaderAgentRuntimeConfig } from "../../../contracts/ai-operations.js";
import { type ReaderAgentOperationEntry, type ReaderAgentOperationSignal } from "./reader-agent-operation-model.js";
export declare function useReaderAgentOperationPoll({ conversationId, enabled, discovering, signal, confirmationModeHint, onDocumentCommitted, }: {
    conversationId: string;
    enabled: boolean;
    discovering: boolean;
    signal: ReaderAgentOperationSignal | null;
    confirmationModeHint?: ReaderAgentRuntimeConfig["agent_confirmation_mode"];
    onDocumentCommitted?: (input: {
        documentId: string;
        revision: string;
    }) => void;
}): {
    entries: ReaderAgentOperationEntry[];
    confirmationMode: "explicit" | "green_light";
    runtimeRestarting: boolean;
    runtimeCredentialConfigured: boolean;
    setEntriesById: import("react").Dispatch<import("react").SetStateAction<Record<string, ReaderAgentOperationEntry>>>;
    inFlightRef: import("react").RefObject<Set<string>>;
    upsert: (operation: ReaderAgentOperation, settlePending?: boolean) => void;
    refresh: (operationId: string, settlePending?: boolean) => Promise<void>;
};
//# sourceMappingURL=use-reader-agent-operation-poll.d.ts.map