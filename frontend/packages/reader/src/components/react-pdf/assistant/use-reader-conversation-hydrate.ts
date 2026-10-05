// Session-list hydration + message-tree recovery. This effect owns the
// job/enabled gating, document-id resolution, sticky-conversation restore, and
// the local-snapshot fallback. It receives the shell's refs/setters so the
// shell stays the single owner of state.

import { useEffect, type MutableRefObject } from "react";
import {
  getConversation,
  loadStoredConversationId,
  loadThreadBranchSnapshot,
  messagesToBranchItems,
  type ConversationRecord,
} from "../../../external.js";
import {
  treeFromSnapshot,
  visibleMessages,
  type ReaderAskTreeItem,
} from "./reader-ask-tree.js";
import type {
  ReaderConversationRemotePort,
  ReaderConversationStreamPort,
} from "./reader-conversation-ports.js";

export function useReaderConversationHydrate(params: {
  jobId: string;
  documentId: string;
  enabled: boolean;
  refreshSessions: (
    documentId?: string,
    expectedSwitchToken?: number,
  ) => Promise<ConversationRecord[] | null>;
  applyConversationTree: (
    branchItems: ReturnType<typeof messagesToBranchItems>,
    head?: string | null,
  ) => void;
  remoteRef: MutableRefObject<ReaderConversationRemotePort | null>;
  streamRef: MutableRefObject<ReaderConversationStreamPort>;
  itemsRef: MutableRefObject<ReaderAskTreeItem[]>;
  documentIdRef: MutableRefObject<string>;
  lastJobRef: MutableRefObject<string>;
  persistReadyRef: MutableRefObject<boolean>;
  switchTokenRef: MutableRefObject<number>;
  sessionListGenerationRef: MutableRefObject<number>;
  activeConversationIdRef: MutableRefObject<string>;
  setItems: (items: ReaderAskTreeItem[]) => void;
  setHeadId: (headId: string | null) => void;
  setSessions: (sessions: ConversationRecord[]) => void;
  setActiveConversationId: (conversationId: string) => void;
  setSessionBusy: (busy: boolean) => void;
}) {
  const {
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
  } = params;

  // job 切换 / 面板打开：拉会话列表 + hydrate 消息树
  // 注意：面板关闭时 enabled=false 也会跑 effect；不能用 lastJobRef 在 enabled 翻转时直接 return，
  // 否则「打开面板」永远不会 refreshSessions（用户只能新对话后才看到列表）。
  useEffect(() => {
    const remote = remoteRef.current;
    if (!jobId) {
      sessionListGenerationRef.current += 1;
      switchTokenRef.current += 1;
      setItems([]);
      setHeadId(null);
      setSessions([]);
      setActiveConversationId("");
      streamRef.current.clearMessages();
      activeConversationIdRef.current = "";
      lastJobRef.current = "";
      documentIdRef.current = "";
      persistReadyRef.current = false;
      return;
    }

    const jobChanged = lastJobRef.current !== jobId;
    if (jobChanged) {
      sessionListGenerationRef.current += 1;
      switchTokenRef.current += 1;
      lastJobRef.current = jobId;
      persistReadyRef.current = false;
      setItems([]);
      setHeadId(null);
      streamRef.current.clearMessages();
      setSessions([]);
      setActiveConversationId("");
      activeConversationIdRef.current = "";
      documentIdRef.current = "";
      setSessionBusy(false);
    }

    // 面板未打开：只记 job，等 enabled 再拉网
    if (!enabled || !remote) {
      sessionListGenerationRef.current += 1;
      return;
    }

    let cancelled = false;
    void (async () => {
      // 1) 解析 document_id（列表按文档过滤）
      let docId = `${documentId || documentIdRef.current || ""}`.trim();
      if (!docId) {
        try {
          docId = `${(await remote.getDocumentId?.()) || ""}`.trim();
        } catch {
          docId = "";
        }
        if (cancelled) return;
      }
      if (docId) documentIdRef.current = docId;

      // 2) 始终刷新会话列表（打开面板 / 切 job 都要）
      let listedRows: ConversationRecord[] | null = null;
      if (!cancelled && docId) {
        listedRows = await refreshSessions(docId);
      }

      // 3) 消息树：job 刚切换，或当前还是空树时再 hydrate
      const needHydrate = jobChanged || !itemsRef.current.length;
      if (!needHydrate || cancelled) {
        if (!cancelled) persistReadyRef.current = true;
        return;
      }

      const convId =
        loadStoredConversationId({ jobId, documentId: docId })
        || `${remote.getConversationId?.() || ""}`.trim();

      if (convId) {
        setActiveConversationId(convId);
        activeConversationIdRef.current = convId;
        remote.setConversationId?.(convId, docId);
        try {
          const detail = await getConversation(convId);
          if (cancelled) return;
          const branchItems = messagesToBranchItems(detail.messages || []);
          if (branchItems.length) {
            applyConversationTree(branchItems, detail.head_id);
            requestAnimationFrame(() => {
              if (!cancelled) persistReadyRef.current = true;
            });
            return;
          }
        } catch {
          // 网络/404 → 本地快照
        }
      }

      // 无粘性会话：若列表里已有对话，自动挂最近一条，便于直接切换
      if (!cancelled && docId) {
        try {
          const rows = listedRows ?? await refreshSessions(docId);
          if (cancelled) return;
          if (!rows) return;
          const latest = rows[0];
          if (latest?.conversation_id) {
            const latestId = latest.conversation_id;
            setActiveConversationId(latestId);
            activeConversationIdRef.current = latestId;
            remote.setConversationId?.(latestId, docId);
            try {
              const detail = await getConversation(latestId);
              if (cancelled) return;
              applyConversationTree(
                messagesToBranchItems(detail.messages || []),
                detail.head_id,
              );
              requestAnimationFrame(() => {
                if (!cancelled) persistReadyRef.current = true;
              });
              return;
            } catch {
              // fall through to snapshot
            }
          }
        } catch {
          // ignore list failure
        }
      }

      if (cancelled) return;
      const saved = loadThreadBranchSnapshot({ jobId, documentId: docId }, convId);
      if (saved?.items.length) {
        const tree = treeFromSnapshot(saved);
        setItems(tree.items);
        setHeadId(tree.headId);
        streamRef.current.showMessages(visibleMessages(tree.items, tree.headId));
      } else {
        setItems([]);
        setHeadId(null);
        streamRef.current.clearMessages();
      }
      requestAnimationFrame(() => {
        if (!cancelled) persistReadyRef.current = true;
      });
    })();

    return () => {
      cancelled = true;
      sessionListGenerationRef.current += 1;
    };
  }, [jobId, documentId, enabled, refreshSessions, applyConversationTree]);
}
