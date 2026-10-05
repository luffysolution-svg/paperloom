import type { ReaderAgentOperation, ReaderAgentRuntimeConfig } from "../../../contracts/ai-operations.js";
import type { ReaderAgentOperationEntry, ReaderAgentOperationPerformOptions } from "./use-reader-agent-operations.js";
type OperationAction = "run" | "cancel" | "commit" | "retry";
export declare function readerAgentOperationDismissalKey(operation: ReaderAgentOperation): string;
export declare function ReaderAgentOperationPanel({ entries, confirmationMode, runtimeRestarting, loadCandidate, onAction, }: {
    entries: ReaderAgentOperationEntry[];
    confirmationMode: ReaderAgentRuntimeConfig["agent_confirmation_mode"];
    runtimeRestarting: boolean;
    loadCandidate: (operation: ReaderAgentOperation) => Promise<Blob>;
    onAction: (action: OperationAction, operation: ReaderAgentOperation, options?: ReaderAgentOperationPerformOptions) => void | Promise<void>;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=ReaderAgentOperationPanel.d.ts.map