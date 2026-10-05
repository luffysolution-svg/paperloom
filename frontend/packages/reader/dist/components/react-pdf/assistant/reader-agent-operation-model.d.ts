import type { ReaderAgentOperation, ReaderAgentRuntimeConfig } from "../../../contracts/ai-operations.js";
export type ReaderAgentOperationSignal = {
    operationId: string;
    conversationId?: string;
    confirmationMode?: ReaderAgentRuntimeConfig["agent_confirmation_mode"];
    nonce: number;
};
export type ReaderAgentOperationEntry = {
    operation: ReaderAgentOperation;
    pendingAction?: "run" | "cancel" | "commit" | "retry";
    error?: string;
};
export type ReaderAgentOperationPerformOptions = {
    acceptDuplicateRisk?: boolean;
};
export declare const ACTION_KEY_PREFIX = "retainpdf.reader-agent-operation.action-key.v1:";
export declare const READER_ACTION_KEY_ID_PREFIX = "reader-";
export declare const ACTIVE_STATUSES: ReadonlySet<string>;
export declare const GREEN_LIGHT_TRANSITION_STATUSES: ReadonlySet<string>;
export declare function shouldPoll(status: string, mode: ReaderAgentRuntimeConfig["agent_confirmation_mode"]): boolean;
export declare function eventSeq(operation: ReaderAgentOperation): number;
export declare function shouldReplaceAgentOperation(current: ReaderAgentOperation | undefined, next: ReaderAgentOperation): boolean;
export declare function makeActionKey(operationId: string, action: string): string;
export declare function errorStatus(error: unknown): number;
export declare function errorMessage(error: unknown): string;
//# sourceMappingURL=reader-agent-operation-model.d.ts.map