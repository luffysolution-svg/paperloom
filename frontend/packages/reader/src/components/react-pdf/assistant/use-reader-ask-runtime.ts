// Compatibility/composition facade: reading Q&A and PDF Agent stay separate.
//
// Conversation/tree/session lifecycle lives in use-reader-conversation,
// chat request/stream projection in use-reader-reading-request (over
// use-reader-chat), and durable operation state in
// use-reader-agent-operations. This module only composes those typed ports,
// adapts the chat owner into the narrow reading port, and re-exposes the
// previous public surface so existing callers keep working.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createReaderAskAnswerer,
  createReaderMarkdownAnswerer,
  defaultReaderDataPort,
  readerAskChatPort,
} from "../../../external.js";
import {
  storeMessagesToChat,
  useReaderChat,
} from "./use-reader-chat.js";
import type { ReaderChatMessage } from "./retainpdf-chat-transport.js";
import {
  useReaderConversation,
  type ReaderConversationStreamPort,
} from "./use-reader-conversation.js";
import {
  useReaderReadingRequest,
  type ReaderReadingChatPort,
} from "./use-reader-reading-request.js";
import type { ReaderAgentRuntimeConfig } from "../../../contracts/ai-operations.js";
import type { ReaderAssistantMode } from "../../../shared/ai/ask-answerer.js";
import type { ReaderSelection } from "../../../shared/data/reader-regions.js";
import {
  useReaderAgentOperations,
  type ReaderAgentOperationSignal,
} from "./use-reader-agent-operations.js";
export type { ReaderAskStoreMessage } from "./reader-ask-tree.js";
export type { ReaderAskSessionSummary } from "./use-reader-conversation.js";
export {
  loadReaderRequestSnapshot,
  saveReaderRequestSnapshot,
} from "./reader-request-snapshots.js";
export type { ReaderRequestSnapshot } from "./reader-request-snapshots.js";

export function useReaderAskRuntime(options: {
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
  onDocumentCommitted?: (input: { documentId: string; revision: string }) => void;
}) {
  const {
    jobId,
    documentId = "",
    sessionIdentity = "",
    enabled,
    selectionContext = null,
    onDocumentCommitted,
  } = options;
  // 单一 scope key：job / document / route 身份任一变化都触发重置。
  const resetScopeKey = `${jobId}\u0000${documentId}\u0000${sessionIdentity}`;
  const [assistantMode, setAssistantMode] = useState<ReaderAssistantMode>("reading");
  const [agentOperationSignal, setAgentOperationSignal] = useState<ReaderAgentOperationSignal | null>(null);
  const [agentConfirmationModeHint, setAgentConfirmationModeHint] = useState<ReaderAgentRuntimeConfig["agent_confirmation_mode"]>();

  // Default to reading Q&A on every document; PDF Agent is always explicit.
  useEffect(() => {
    setAssistantMode("reading");
    setAgentOperationSignal(null);
    setAgentConfirmationModeHint(undefined);
  }, [resetScopeKey]);

  const remoteAnswerer = useMemo(() => {
    if (!enabled || !jobId) return null;
    return readerAskChatPort()?.createRemoteAnswerer({ jobId, documentId })
      ?? createReaderAskAnswerer({ jobId, documentId });
  }, [documentId, enabled, jobId]);

  const localAnswerer = useMemo(() => {
    if (!enabled || !jobId) return null;
    return readerAskChatPort()?.createLocalAnswerer({ jobId })
      ?? createReaderMarkdownAnswerer({
        loadMarkdownPayload: defaultReaderDataPort.loadMarkdownPayload,
      });
  }, [enabled, jobId]);

  // conversation 在下面才创建，而 useReaderChat 现在就要拿到收尾回调，所以用 ref
  // 反向接线。
  const conversationTreeRef = useRef<{ markRunningCancelled: () => void } | null>(null);

  const chatOwner = useReaderChat({
    jobId,
    enabled,
    remoteAnswerer,
    localAnswerer,
    assistantMode,
    onAgentOperationSignal: (signal) => {
      setAgentOperationSignal({ ...signal, nonce: Date.now() + Math.random() });
    },
    onConfirmationMode: setAgentConfirmationModeHint,
    onStopped: () => conversationTreeRef.current?.markRunningCancelled(),
  });

  // Narrow adapter: the reading hook drives sends/regenerates and the
  // conversation shell drives show/clear/stop. Neither receives the other
  // hook's state or a raw React setter.
  const chatPort: ReaderReadingChatPort = useMemo(() => ({
    messages: chatOwner.messages as readonly ReaderChatMessage[],
    status: chatOwner.status,
    error: chatOwner.error as Error | undefined,
    sendUserMessage: (message, request) => chatOwner.sendMessage(
      message as Parameters<typeof chatOwner.sendMessage>[0],
      request as Parameters<typeof chatOwner.sendMessage>[1],
    ),
    regenerateFrom: (request) => chatOwner.regenerate(
      request as Parameters<typeof chatOwner.regenerate>[0],
    ),
    stopStream: () => chatOwner.stop(),
    replaceVisible: (messages) => chatOwner.setMessages([...messages]),
  }), [chatOwner]);

  const streamPort: ReaderConversationStreamPort = useMemo(() => ({
    stopStream: () => chatPort.stopStream(),
    clearMessages: () => chatPort.replaceVisible([]),
    showMessages: (messages) => chatPort.replaceVisible(storeMessagesToChat(messages)),
  }), [chatPort]);

  const conversation = useReaderConversation({
    jobId,
    documentId,
    enabled,
    remoteAnswerer,
    stream: streamPort,
  });

  conversationTreeRef.current = conversation.tree;

  const reading = useReaderReadingRequest({
    jobId,
    assistantMode,
    selectionContext,
    tree: conversation.tree,
    chat: chatPort,
    getScopeKey: () => conversation.resolveRequestScopeKey(),
  });

  const operationConversationId = conversation.activeConversationId
    || agentOperationSignal?.conversationId
    || `${remoteAnswerer?.getConversationId?.() || ""}`.trim();
  const agentOperations = useReaderAgentOperations({
    conversationId: operationConversationId,
    enabled,
    discovering: reading.isRunning,
    signal: agentOperationSignal,
    confirmationModeHint: agentConfirmationModeHint,
    onDocumentCommitted,
  });

  // Answer completion refreshes the session list titles/ordering.
  const prevRunning = useRef(false);
  useEffect(() => {
    prevRunning.current = false;
  }, [jobId]);
  // 统一 scope 重置：documentId / sessionIdentity 变化时，即使 jobId 不变，
  // 也要丢弃上一份文档的运行标记，避免把 A 的完成事件记到 B 上。
  useEffect(() => {
    prevRunning.current = false;
  }, [resetScopeKey]);
  useEffect(() => {
    if (prevRunning.current && !reading.isRunning) {
      void conversation.sessionCommands.refreshSessions();
      conversation.sessionCommands.adoptRemoteConversationId();
    }
    prevRunning.current = reading.isRunning;
  }, [conversation, reading.isRunning]);

  return {
    citationsByMessageId: conversation.citationsByMessageId,
    progressByMessageId: conversation.progressByMessageId,
    contentByMessageId: conversation.contentByMessageId,
    streamingAssistantId: reading.streamingAssistantId,
    isRunning: reading.isRunning,
    messages: conversation.messages,
    sessions: conversation.sessions,
    activeConversationId: conversation.activeConversationId,
    sessionBusy: conversation.sessionBusy,
    sessionError: conversation.sessionError,
    submitQuestion: reading.submitQuestion,
    retryAnswer: reading.retryAnswer,
    cancelAnswer: reading.cancelAnswer,
    newSession: conversation.sessionCommands.newSession,
    switchSession: conversation.sessionCommands.switchSession,
    removeSession: conversation.sessionCommands.removeSession,
    renameSession: conversation.sessionCommands.renameSession,
    branchFromAnswer: conversation.sessionCommands.branchFromAnswer,
    agentOperations,
    assistantMode,
    setAssistantMode,
  };
}
