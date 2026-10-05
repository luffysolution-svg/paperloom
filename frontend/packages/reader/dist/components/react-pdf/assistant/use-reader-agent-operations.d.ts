import type { ReaderAgentOperation, ReaderAgentRuntimeConfig } from "../../../contracts/ai-operations.js";
import { type ReaderAgentOperationSignal } from "./reader-agent-operation-model.js";
export type { ReaderAgentOperationSignal, ReaderAgentOperationEntry, ReaderAgentOperationPerformOptions, } from "./reader-agent-operation-model.js";
export { shouldReplaceAgentOperation } from "./reader-agent-operation-model.js";
export declare function useReaderAgentOperations({ conversationId, enabled, discovering, signal, confirmationModeHint, onDocumentCommitted, }: {
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
    entries: import("./reader-agent-operation-model.js").ReaderAgentOperationEntry[];
    confirmationMode: "explicit" | "green_light";
    runtimeRestarting: boolean;
    runtimeCredentialConfigured: boolean;
    perform: (action: "run" | "cancel" | "commit" | "retry", operation: ReaderAgentOperation, options?: import("./reader-agent-operation-model.js").ReaderAgentOperationPerformOptions) => Promise<void>;
    loadCandidate: (operation: ReaderAgentOperation) => Promise<Blob>;
};
//# sourceMappingURL=use-reader-agent-operations.d.ts.map