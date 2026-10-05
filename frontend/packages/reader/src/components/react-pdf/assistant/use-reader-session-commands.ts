// Session CRUD commands: new / branch / remove / rename / adopt. Extracted
// from the conversation shell so the shell can keep its switch/hydrate
// guards. Every callback preserves the original dependency list and timing
// (deferred switch tokens, click shields, snapshot bookkeeping).

import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
  armReaderAiClickShield,
  clearThreadBranchSnapshot,
  lockReaderAiNavigation,
  messagesToBranchItems,
  nextForkConversationTitle,
  saveThreadBranchSnapshot,
} from "../../../external.js";
import {
  pathForBranch,
  snapshotFromTree,
  treeItemsFromBranchItems,
  visibleMessages,
  type ReaderAskTreeItem,
} from "./reader-ask-tree.js";
import type { ReaderConversationRecord } from "../../../contracts/conversations.js";
import { readerConversationPort } from "../../../external.js";
import type {
  ReaderConversationRemotePort,
  ReaderConversationStreamPort,
} from "./reader-conversation-ports.js";

export function useReaderSessionCommands(params: {
  jobId: string;
  documentId: string;
  sessionBusy: boolean;
  sessions: readonly ReaderConversationRecord[];
  streamRef: MutableRefObject<ReaderConversationStreamPort>;
  remoteRef: MutableRefObject<ReaderConversationRemotePort | null>;
  itemsRef: MutableRefObject<ReaderAskTreeItem[]>;
  headIdRef: MutableRefObject<string | null>;
  activeConversationIdRef: MutableRefObject<string>;
  documentIdRef: MutableRefObject<string>;
  switchTokenRef: MutableRefObject<number>;
  persistReadyRef: MutableRefObject<boolean>;
  setSessionBusy: (busy: boolean) => void;
  setSessionError: (error: string) => void;
  setActiveConversationId: (conversationId: string) => void;
  setItems: Dispatch<SetStateAction<ReaderAskTreeItem[]>>;
  setHeadId: Dispatch<SetStateAction<string | null>>;
  setSessions: Dispatch<SetStateAction<ReaderConversationRecord[]>>;
  refreshSessions: (
    documentId?: string,
    expectedSwitchToken?: number,
  ) => Promise<ReaderConversationRecord[] | null>;
  applyConversationTree: (
    branchItems: ReturnType<typeof messagesToBranchItems>,
    head?: string | null,
  ) => void;
}) {
  const {
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
  } = params;

  const adoptRemoteConversationId = useCallback(() => {
    const id = `${remoteRef.current?.getConversationId?.() || ""}`.trim();
    if (id) setActiveConversationId(id);
  }, []);

  /** 新对话窗口：清空气泡，下次 ask 会 auto-create 新 conversation。 */
  const newSession = useCallback(async () => {
    if (sessionBusy) return;
    // AI SDK 统一持有取消控制器；切窗前停止旧流，避免回写新会话。
    await streamRef.current.stopStream();
    armReaderAiClickShield(900);
    lockReaderAiNavigation(900);
    setSessionBusy(true);
    setSessionError("");
    const token = ++switchTokenRef.current;

    try {
      await new Promise<void>((r) => {
        window.setTimeout(r, 40);
      });
      if (token !== switchTokenRef.current) return;
      const remote = remoteRef.current;
      const docId = documentIdRef.current
        || `${(await remote?.getDocumentId?.()) || ""}`.trim();
      if (token !== switchTokenRef.current) return;
      documentIdRef.current = docId;
      remote?.clearConversationId?.(docId);
      setActiveConversationId("");
      activeConversationIdRef.current = "";
      setItems([]);
      setHeadId(null);
      streamRef.current.clearMessages();
      clearThreadBranchSnapshot({ jobId, documentId: docId });
      if (docId) await refreshSessions(docId, token);
    } catch (error) {
      console.warn("[reader-ai] new session failed", error);
      setSessionError("无法创建新对话，请重试。");
    } finally {
      if (token === switchTokenRef.current) setSessionBusy(false);
    }
  }, [jobId, refreshSessions, sessionBusy]);

  /**
   * 从某条助手答案「开新对话」：
   * 复制 root→该答案 的历史到新 conversation，原会话原样保留。
   * 之后提问只带新会话上下文，避免原线程被续写污染（ChatGPT Branch in new chat）。
   * @returns 是否成功
   */
  const branchFromAnswer = useCallback(async (assistantMessageId: string): Promise<boolean> => {
    const forkId = `${assistantMessageId || ""}`.trim();
    // 允许在 busy 时排队失败要有提示；生成中也可 fork（先停本地 running）
    if (!forkId) {
      setSessionError("无法分支：消息 id 无效。");
      return false;
    }
    if (sessionBusy) {
      setSessionError("请稍候，当前有会话操作进行中。");
      return false;
    }
    await streamRef.current.stopStream();

    const path = pathForBranch(itemsRef.current, forkId, headIdRef.current);
    if (!path.length) {
      setSessionError("无法分支：找不到到此答案的对话路径。");
      return false;
    }
    const last = path[path.length - 1];
    if (last.message.role !== "assistant") {
      setSessionError("只能从助手答案处开新对话。");
      return false;
    }

    setSessionBusy(true);
    setSessionError("");
    const token = ++switchTokenRef.current;
    try {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 40);
      });
      if (token !== switchTokenRef.current) return false;

      const remote = remoteRef.current;
      let docId = documentIdRef.current
        || `${(await remote?.getDocumentId?.()) || ""}`.trim();
      if (token !== switchTokenRef.current) return false;
      documentIdRef.current = docId;
      if (!docId) {
        // 再试一次解析
        try {
          docId = `${(await remote?.getDocumentId?.()) || ""}`.trim();
          if (token !== switchTokenRef.current) return false;
          documentIdRef.current = docId;
        } catch {
          docId = "";
        }
      }
      if (!docId) {
        setSessionError("无法分支：文档未就绪，请稍后重试。");
        return false;
      }

      // 线性化 parent，保证 fork 写入时父子链完整（不依赖可能断裂的旧 parentId）
      const pathPayload = path.map((item, i) => ({
        id: item.message.id,
        role: item.message.role as "user" | "assistant",
        content: item.message.content,
        citations: item.message.citations,
        parentId: i === 0 ? null : path[i - 1].message.id,
      }));

      // 标题：fork-n-xxx（xxx = 当前/原始对话名）
      const currentId =
        activeConversationIdRef.current
        || remote?.getConversationId?.()
        || "";
      const currentRow = (sessions || []).find((s) => s.conversation_id === currentId);
      const firstUser = pathPayload.find((p) => p.role === "user");
      const sourceTitle =
        `${currentRow?.title || ""}`.trim()
        || `${firstUser?.content || ""}`.replace(/\s+/g, " ").trim()
        || "未命名对话";
      const existingTitles = (sessions || []).map((s) => s.title || "");
      const branchTitle = nextForkConversationTitle(sourceTitle, existingTitles);

      // 必须完整 fork 到服务端（含消息），禁止只建空会话
      const forked = await readerConversationPort()!.forkFromPath({
        documentId: docId,
        title: branchTitle,
        path: pathPayload,
      });
      if (token !== switchTokenRef.current) return false;
      const nextItems = treeItemsFromBranchItems(forked.items);
      const nextHead = nextItems[nextItems.length - 1]?.message.id || null;
      const nextConvId = forked.conversation.conversation_id;
      if (!nextConvId || !nextItems.length) {
        throw new Error("fork returned empty conversation");
      }

      armReaderAiClickShield(600);
      lockReaderAiNavigation(600);

      // 切到新会话：原会话仍在列表里可切回
      setItems(nextItems);
      setHeadId(nextHead);
      streamRef.current.showMessages(visibleMessages(nextItems, nextHead));
      setActiveConversationId(nextConvId);
      activeConversationIdRef.current = nextConvId;
      remote?.setConversationId?.(nextConvId, docId);

      // 乐观插入列表（带正确标题与消息数），再 refresh 对齐服务端
      setSessions((prev) => {
        const row: ReaderConversationRecord = {
          conversation_id: nextConvId,
          title: branchTitle,
          document_id: docId,
          created_at: forked.conversation.created_at || new Date().toISOString(),
          updated_at: forked.conversation.updated_at || new Date().toISOString(),
          message_count: nextItems.length,
          head_id: nextHead || "",
        };
        const without = prev.filter((s) => s.conversation_id !== nextConvId);
        return [row, ...without];
      });

      saveThreadBranchSnapshot(
        { jobId, documentId: docId },
        snapshotFromTree(nextItems, nextHead),
        nextConvId,
      );
      await refreshSessions(docId, token);

      return true;
    } catch (error) {
      console.warn("[reader-ai] branch from answer failed", error);
      if (token === switchTokenRef.current) {
        setSessionError("分支失败：未能复制上文到新对话。请检查网络后重试。");
      }
      return false;
    } finally {
      if (token === switchTokenRef.current) setSessionBusy(false);
    }
  }, [jobId, refreshSessions, sessionBusy, sessions]);

  /** 删除会话（服务端 + 本地快照）；删当前则切到最近一条或空窗。 */
  const removeSession = useCallback(async (conversationId: string) => {
    const id = `${conversationId || ""}`.trim();
    if (!id || sessionBusy) return;
    await streamRef.current.stopStream();
    setSessionBusy(true);
    setSessionError("");
    const token = ++switchTokenRef.current;
    try {
      const remote = remoteRef.current;
      const docId = documentIdRef.current
        || `${(await remote?.getDocumentId?.()) || ""}`.trim();
      if (token !== switchTokenRef.current) return;
      documentIdRef.current = docId;

      try {
        await readerConversationPort()!.delete(id);
      } catch (error) {
        const status = Number((error as { status?: number })?.status) || 0;
        if (status !== 404) throw error;
      }
      clearThreadBranchSnapshot({ jobId, documentId: docId }, id);

      const current =
        activeConversationIdRef.current
        || remote?.getConversationId?.()
        || "";
      const deletingActive = current === id;

      setSessions((prev) => prev.filter((s) => s.conversation_id !== id));

      if (deletingActive) {
        remote?.clearConversationId?.(docId);
        setActiveConversationId("");
        activeConversationIdRef.current = "";
        setItems([]);
        setHeadId(null);
        streamRef.current.clearMessages();
        clearThreadBranchSnapshot({ jobId, documentId: docId });

        const list = docId ? await refreshSessions(docId, token) : [];
        if (token !== switchTokenRef.current) return;
        if (!list) return;

        const next = list[0];
        if (next?.conversation_id) {
          const nextId = next.conversation_id;
          setActiveConversationId(nextId);
          activeConversationIdRef.current = nextId;
          try {
            const detail = await readerConversationPort()!.get(nextId);
            if (token !== switchTokenRef.current) return;
            applyConversationTree(
              messagesToBranchItems(detail.messages || []),
              detail.head_id,
            );
            remote?.setConversationId?.(nextId, docId);
          } catch {
            setItems([]);
            setHeadId(null);
          }
        }
      } else if (docId) {
        await refreshSessions(docId, token);
      }
    } catch (error) {
      console.warn("[reader-ai] delete session failed", error);
      setSessionError("删除对话失败，请重试。");
    } finally {
      if (token === switchTokenRef.current) setSessionBusy(false);
    }
  }, [applyConversationTree, jobId, refreshSessions, sessionBusy]);

  /** 重命名会话标题。 */
  const renameSession = useCallback(async (conversationId: string, title: string) => {
    const id = `${conversationId || ""}`.trim();
    const nextTitle = `${title || ""}`.replace(/\s+/g, " ").trim();
    if (!id || !nextTitle || sessionBusy) return;
    setSessionBusy(true);
    setSessionError("");
    const token = ++switchTokenRef.current;
    try {
      const clipped = nextTitle.slice(0, 80);
      await readerConversationPort()!.patch(id, { title: clipped });
      if (token !== switchTokenRef.current) return;
      setSessions((prev) =>
        prev.map((s) =>
          s.conversation_id === id ? { ...s, title: clipped } : s,
        ),
      );
      const docId = documentIdRef.current;
      if (docId) await refreshSessions(docId, token);
    } catch (error) {
      console.warn("[reader-ai] rename session failed", error);
      setSessionError("重命名失败，请重试。");
    } finally {
      if (token === switchTokenRef.current) setSessionBusy(false);
    }
  }, [refreshSessions, sessionBusy]);

  return {
    adoptRemoteConversationId,
    newSession,
    branchFromAnswer,
    removeSession,
    renameSession,
  };
}
