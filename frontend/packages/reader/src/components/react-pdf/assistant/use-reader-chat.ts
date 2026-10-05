import { useEffect, useMemo, useRef } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import type { ReaderAskStoreMessage } from "./reader-ask-tree.js";
import {
  readerChatMessageText,
  RetainPdfChatTransport,
  type ReaderChatMessage,
  type ReaderChatMetadata,
} from "./retainpdf-chat-transport.js";
import type { ReaderAgentRuntimeConfig } from "../../../contracts/ai-operations.js";
import type { ReaderAgentOperationSignal } from "./use-reader-agent-operations.js";
import type { ReaderAssistantMode } from "../../../shared/ai/ask-answerer.js";

type ReaderAnswerer = ConstructorParameters<typeof RetainPdfChatTransport>[0] extends {
  getRemoteAnswerer: () => infer ANSWERER;
} ? ANSWERER : never;

export function storeMessagesToChat(
  messages: readonly ReaderAskStoreMessage[],
): ReaderChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    metadata: message.role === "assistant"
      ? {
        citations: message.citations || [],
        progress: message.progress || "",
        status: message.status?.type === "running"
          ? "running"
          : message.status?.type === "incomplete"
            ? message.status.reason === "cancelled" ? "cancelled" : "error"
            : "complete",
      }
      : undefined,
    parts: [{ type: "text", text: message.content || "" }],
  }));
}

export function chatMessageToStore(message: ReaderChatMessage): ReaderAskStoreMessage {
  const metadata = (message.metadata || {}) as ReaderChatMetadata;
  const running = metadata.status === "running";
  const incomplete = metadata.status === "cancelled" || metadata.status === "error";
  // 终态但没有正文时用状态文案兜底。markRunningAsError 指望不上:它只处理
  // status 还是 "running" 的条目，而这份镜像已经把它推进 incomplete 了，
  // 于是那条补文案的逻辑一次也不会命中。
  const text = readerChatMessageText(message);
  const content = text.trim() || (incomplete ? `${metadata.statusText || ""}`.trim() : "");
  return {
    id: message.id,
    role: message.role as "user" | "assistant",
    content: message.role === "assistant" ? content : text,
    ...(message.role === "assistant" ? {
      citations: metadata.citations || [],
      progress: metadata.progress || "",
      // 「答完了但没做完」和「中断/出错」是两回事:正文是完整的一段话,只是背后的
      // 工作被轮次预算截断了。所以它走 incomplete + 具体原因,而不是 error。
      status: running
        ? { type: "running" as const }
        : incomplete
          ? {
            type: "incomplete" as const,
            reason: metadata.status === "cancelled" ? "cancelled" as const : "error" as const,
          }
          : `${metadata.incompleteReason || ""}`.trim()
            ? {
              type: "incomplete" as const,
              reason: `${metadata.incompleteReason}`.trim(),
            }
            : { type: "complete" as const, reason: "stop" as const },
    } : {}),
  };
}

export function useReaderChat(options: {
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
}) {
  const remoteRef = useRef(options.remoteAnswerer);
  const localRef = useRef(options.localAnswerer);
  const operationSignalRef = useRef(options.onAgentOperationSignal);
  const confirmationModeRef = useRef(options.onConfirmationMode);
  const stoppedRef = useRef(options.onStopped);
  stoppedRef.current = options.onStopped;
  const assistantModeRef = useRef(options.assistantMode);
  remoteRef.current = options.remoteAnswerer;
  localRef.current = options.localAnswerer;
  operationSignalRef.current = options.onAgentOperationSignal;
  confirmationModeRef.current = options.onConfirmationMode;
  assistantModeRef.current = options.assistantMode;

  const chat = useMemo(() => new Chat<ReaderChatMessage>({
    id: `reader-${options.jobId || "idle"}`,
    transport: new RetainPdfChatTransport({
      jobId: options.jobId,
      getRemoteAnswerer: () => remoteRef.current,
      getLocalAnswerer: () => localRef.current,
      getAssistantMode: () => assistantModeRef.current,
      onAgentOperationSignal: (signal) => operationSignalRef.current?.(signal),
      onConfirmationMode: (mode) => confirmationModeRef.current?.(mode),
    }),
  }), [options.jobId]);

  // Hiding the AI workspace (including switching to Markdown) must stop the
  // model stream that belongs to it. Chat.stop() only aborts this transport's
  // request; durable PDF operations already dispatched through the operation
  // API keep their own lifecycle and are deliberately not cancelled here.
  // 只调 stop() 不够。消息的 running 状态会被镜像写进本地快照并原样恢复,重开面板后
  // 那条消息永远显示「思考中…」,而且因为流已经停了,连停止按钮都不会出现。
  useEffect(() => {
    if (options.enabled) return;
    void chat.stop().finally(() => stoppedRef.current?.());
  }, [chat, options.enabled]);

  // A document/job switch replaces the Chat instance. AI SDK unsubscribes the
  // old external store, but it does not abort that Chat's active transport.
  useEffect(() => () => {
    void chat.stop().finally(() => stoppedRef.current?.());
  }, [chat]);

  // A job switch creates a fresh Chat instance whose initial message list is
  // already empty. Do not call setMessages from an effect here: useChat owns an
  // external store, and effect-driven resets can create a getSnapshot/update
  // cycle under React 19.
  return useChat<ReaderChatMessage>({ chat, experimental_throttle: 16 });
}

export function lastAssistantMessage(messages: readonly UIMessage[]): UIMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "assistant") return messages[index];
  }
  return undefined;
}
