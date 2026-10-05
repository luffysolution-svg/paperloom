import type { UIMessage } from "ai";
import type { ReaderAskStoreMessage } from "./reader-ask-tree.js";
import { RetainPdfChatTransport, type ReaderChatMessage } from "./retainpdf-chat-transport.js";
import type { ReaderAgentRuntimeConfig } from "../../../contracts/ai-operations.js";
import type { ReaderAgentOperationSignal } from "./use-reader-agent-operations.js";
import type { ReaderAssistantMode } from "../../../shared/ai/ask-answerer.js";
type ReaderAnswerer = ConstructorParameters<typeof RetainPdfChatTransport>[0] extends {
    getRemoteAnswerer: () => infer ANSWERER;
} ? ANSWERER : never;
export declare function storeMessagesToChat(messages: readonly ReaderAskStoreMessage[]): ReaderChatMessage[];
export declare function chatMessageToStore(message: ReaderChatMessage): ReaderAskStoreMessage;
export declare function useReaderChat(options: {
    jobId: string;
    enabled: boolean;
    remoteAnswerer: ReaderAnswerer;
    localAnswerer: ReaderAnswerer;
    assistantMode: ReaderAssistantMode;
    onAgentOperationSignal?: (signal: Omit<ReaderAgentOperationSignal, "nonce">) => void;
    onConfirmationMode?: (mode: ReaderAgentRuntimeConfig["agent_confirmation_mode"]) => void;
    /** chat.stop() 之后调用。显式「停止」按钮那条路在它自己那边收尾,这里管的是
     *  关面板与切文档——它们只调 stop()，消息会永远停在 running。 */
    onStopped?: () => void;
}): import("@ai-sdk/react").UseChatHelpers<ReaderChatMessage>;
export declare function lastAssistantMessage(messages: readonly UIMessage[]): UIMessage | undefined;
export {};
//# sourceMappingURL=use-reader-chat.d.ts.map