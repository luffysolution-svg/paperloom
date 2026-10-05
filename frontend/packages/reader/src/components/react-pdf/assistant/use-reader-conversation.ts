// Shared conversation/history shell: tree state, session lifecycle, hydration,
// and persistence. This hook owns no streaming and no PDF operations; the
// reading request hook drives new turns through the typed tree port, and the
// facade wires the stream port to the chat owner.
//
// The implementation is split into focused modules (ports, derived selectors,
// tree port, persistence, hydration, session CRUD) while this file keeps the
// shell state/refs, the session-switch guard, and re-exports the stable public
// surface. The split is mechanical: exports, persistence keys, and timing are
// unchanged.

import { useCallback, useMemo, useRef, useState } from "react";
import {
  armReaderAiClickShield,
  clearThreadBranchSnapshot,
  loadThreadBranchSnapshot,
  lockReaderAiNavigation,
  messagesToBranchItems,
  saveThreadBranchSnapshot,
} from "../../../external.js";
import {
  snapshotFromTree,
  treeFromSnapshot,
  treeItemsFromBranchItems,
  visibleMessages,
  type ReaderAskTreeItem,
} from "./reader-ask-tree.js";
import {
  NOOP_STREAM_PORT,
  type ReaderAskSessionSummary,
  type ReaderConversationRemotePort,
  type ReaderConversationSessionCommands,
  type ReaderConversationStreamPort,
  type ReaderConversationTreePort,
} from "./reader-conversation-ports.js";
import { readerConversationPort } from "../../../external.js";
import {
  buildReaderAskSessionSummaries,
  citationsByMessageIdFromItems,
  contentByMessageIdFromItems,
  progressByMessageIdFromItems,
} from "./reader-conversation-derived.js";
import type { ReaderConversationRecord } from "../../../contracts/conversations.js";
import { createReaderConversationTreePort } from "./reader-conversation-tree.js";
import { useReaderConversationHydrate } from "./use-reader-conversation-hydrate.js";
import { useReaderConversationPersistence } from "./use-reader-conversation-persistence.js";
import { useReaderSessionCommands } from "./use-reader-session-commands.js";

export type {
  ReaderAskSessionSummary,
  ReaderConversationRemotePort,
  ReaderConversationStreamPort,
  ReaderConversationTreePort,
  ReaderConversationSessionCommands,
};

export function useReaderConversation(options: {
  jobId: string;
  documentId?: string;
  enabled: boolean;
  remoteAnswerer?: ReaderConversationRemotePort | null;
  stream?: ReaderConversationStreamPort;
}) {
  const {
    jobId,
    documentId = "",
    enabled,
    remoteAnswerer = null,
    stream = NOOP_STREAM_PORT,
  } = options;
  const [items, setItems] = useState<ReaderAskTreeItem[]>([]);
  const [headId, setHeadId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ReaderConversationRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const itemsRef = useRef(items);
  const headIdRef = useRef(headId);
  const activeConversationIdRef = useRef(activeConversationId);
  const persistReadyRef = useRef(false);
  const lastJobRef = useRef("");
  const documentIdRef = useRef("");
  const switchTokenRef = useRef(0);
  const sessionListGenerationRef = useRef(0);
  const streamRef = useRef(stream);
  streamRef.current = stream;
  const remoteRef = useRef(remoteAnswerer);
  remoteRef.current = remoteAnswerer;

  itemsRef.current = items;
  headIdRef.current = headId;
  activeConversationIdRef.current = activeConversationId;

  const refreshSessions = useCallback(async (
    docId = "",
    expectedSwitchToken?: number,
  ): Promise<ReaderConversationRecord[] | null> => {
    const doc = `${docId || documentIdRef.current || ""}`.trim();
    const generation = ++sessionListGenerationRef.current;
    if (!doc) {
      if (
        generation === sessionListGenerationRef.current
        && (expectedSwitchToken === undefined || expectedSwitchToken === switchTokenRef.current)
      ) setSessions([]);
      return [];
    }
    try {
      const port = readerConversationPort();
      if (!port) return null;
      const res = await port.list({ document_id: doc, limit: 50 });
      const rows = res.conversations || [];
      if (
        generation === sessionListGenerationRef.current
        && doc === `${documentIdRef.current || ""}`.trim()
        && (expectedSwitchToken === undefined || expectedSwitchToken === switchTokenRef.current)
      ) {
        setSessions(rows);
        return rows;
      }
      return null;
    } catch {
      // 列表失败不挡主流程
      return null;
    }
  }, []);

  const applyConversationTree = useCallback((
    branchItems: ReturnType<typeof messagesToBranchItems>,
    head?: string | null,
  ) => {
    const tree = treeItemsFromBranchItems(branchItems);
    const nextHead = `${head || ""}`.trim()
      || tree[tree.length - 1]?.message.id
      || null;
    setItems(tree);
    setHeadId(nextHead);
    streamRef.current.showMessages(visibleMessages(tree, nextHead));
  }, []);

  const resolveRequestScopeKey = useCallback((): string => (
    `${documentId || documentIdRef.current || jobId}`.trim()
  ), [documentId, jobId]);

  useReaderConversationHydrate({
    jobId,
    documentId,
    enabled,
    refreshSessions,
    applyConversationTree,
    remoteRef,
    streamRef,
    itemsRef,
    documentIdRef,
    lastJobRef,
    persistReadyRef,
    switchTokenRef,
    sessionListGenerationRef,
    activeConversationIdRef,
    setItems,
    setHeadId,
    setSessions,
    setActiveConversationId,
    setSessionBusy,
  });

  useReaderConversationPersistence({
    jobId,
    documentId,
    items,
    headId,
    activeConversationId,
    documentIdRef,
    persistReadyRef,
  });

  const messages = useMemo(
    () => visibleMessages(items, headId),
    [items, headId],
  );

  const citationsByMessageId = useMemo(
    () => citationsByMessageIdFromItems(items),
    [items],
  );

  const progressByMessageId = useMemo(
    () => progressByMessageIdFromItems(items),
    [items],
  );

  const contentByMessageId = useMemo(
    () => contentByMessageIdFromItems(items),
    [items],
  );

  const tree: ReaderConversationTreePort = useMemo(() => (
    createReaderConversationTreePort({ setItems, setHeadId, itemsRef, headIdRef })
  ), []);

  const {
    adoptRemoteConversationId,
    newSession,
    branchFromAnswer,
    removeSession,
    renameSession,
  } = useReaderSessionCommands({
    jobId,
    documentId,
    sessionBusy,
    sessions,
    streamRef,
    remoteRef,
    itemsRef,
    headIdRef,
    activeConversationIdRef,
    documentIdRef,
    switchTokenRef,
    persistReadyRef,
    setSessionBusy,
    setSessionError,
    setActiveConversationId,
    setItems,
    setHeadId,
    setSessions,
    refreshSessions,
    applyConversationTree,
  });

  /** 切换已有会话窗口。 */
  const switchSession = useCallback(async (conversationId: string) => {
    const id = `${conversationId || ""}`.trim();
    const current =
      activeConversationIdRef.current
      || remoteRef.current?.getConversationId?.()
      || "";
    if (!id || id === current || sessionBusy) return;

    await streamRef.current.stopStream();

    // 短时隔离即可；过长会像「点了没反应 / 乱跳」
    armReaderAiClickShield(1200);
    lockReaderAiNavigation(1200);
    setSessionBusy(true);
    setSessionError("");
    const token = ++switchTokenRef.current;

    // The persistence effect observes activeConversationId + items. Suspend it
    // before selecting the target, otherwise a slow GET can make the 280 ms
    // debounce erase that target's recovery snapshot while items is empty.
    persistReadyRef.current = false;

    // 先切 UI 选中态 + 清空，避免仍显示上一会话内容
    setActiveConversationId(id);
    activeConversationIdRef.current = id;
    setItems([]);
    setHeadId(null);
    streamRef.current.clearMessages();

    try {
      await new Promise<void>((r) => {
        window.setTimeout(r, 80);
      });
      if (token !== switchTokenRef.current) return;

      try {
        (globalThis.document?.activeElement as HTMLElement | null)?.blur?.();
      } catch {
        // ignore
      }

      const remote = remoteRef.current;
      const docId = documentIdRef.current
        || `${(await remote?.getDocumentId?.()) || ""}`.trim();
      if (token !== switchTokenRef.current) return;
      documentIdRef.current = docId;

      const port = readerConversationPort();
      if (!port) throw new Error("Reader conversations unavailable");
      const detail = await port.get(id);
      if (token !== switchTokenRef.current) return;

      armReaderAiClickShield(800);
      lockReaderAiNavigation(800);

      const branchItems = messagesToBranchItems(detail.messages || []);
      applyConversationTree(branchItems, detail.head_id);
      remote?.setConversationId?.(id, docId);
      persistReadyRef.current = true;

      // 本地快照与服务端对齐（按会话隔离）
      if (branchItems.length) {
        const snapshotItems = treeItemsFromBranchItems(branchItems);
        saveThreadBranchSnapshot(
          { jobId, documentId: docId },
          snapshotFromTree(
            snapshotItems,
            `${detail.head_id || ""}`.trim()
              || snapshotItems.at(-1)?.message.id
              || null,
          ),
          id,
        );
      } else {
        clearThreadBranchSnapshot({ jobId, documentId: docId }, id);
      }

      if (docId) await refreshSessions(docId, token);

      // assistant-ui ThreadPrimitive.Viewport 管理滚动；这里不再直接操作 DOM。
      armReaderAiClickShield(350);
      lockReaderAiNavigation(350);
    } catch (error) {
      console.warn("[reader-ai] switch session failed", error);
      if (token === switchTokenRef.current) {
        setSessionError("加载该对话失败，请检查网络后重试。");
        const saved = loadThreadBranchSnapshot(
          { jobId, documentId: documentId || documentIdRef.current },
          id,
        );
        if (saved?.items.length) {
          const recovered = treeFromSnapshot(saved);
          setItems(recovered.items);
          setHeadId(recovered.headId);
          streamRef.current.showMessages(visibleMessages(recovered.items, recovered.headId));
        } else {
          // 失败时不要展示旧会话内容；目标无快照时保持明确空态。
          setItems([]);
          setHeadId(null);
        }
        persistReadyRef.current = true;
      }
    } finally {
      if (token === switchTokenRef.current) setSessionBusy(false);
    }
  }, [
    applyConversationTree,
    jobId,
    documentId,
    refreshSessions,
    sessionBusy,
  ]);

  const sessionSummaries: ReaderAskSessionSummary[] = useMemo(
    () => buildReaderAskSessionSummaries(sessions, activeConversationId, remoteAnswerer),
    [sessions, activeConversationId, remoteAnswerer],
  );

  const sessionCommands: ReaderConversationSessionCommands = useMemo(() => ({
    refreshSessions,
    adoptRemoteConversationId,
    newSession,
    switchSession,
    removeSession,
    renameSession,
    branchFromAnswer,
  }), [
    refreshSessions,
    adoptRemoteConversationId,
    newSession,
    switchSession,
    removeSession,
    renameSession,
    branchFromAnswer,
  ]);

  return {
    items,
    headId,
    messages,
    citationsByMessageId,
    progressByMessageId,
    contentByMessageId,
    sessions: sessionSummaries,
    activeConversationId: activeConversationId
      || remoteAnswerer?.getConversationId?.()
      || "",
    sessionBusy,
    sessionError,
    resolveRequestScopeKey,
    tree,
    sessionCommands,
  };
}

export type ReaderConversation = ReturnType<typeof useReaderConversation>;
