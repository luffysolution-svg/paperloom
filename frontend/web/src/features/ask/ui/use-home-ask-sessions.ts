// 会话列表与切换：历史拉取、粘性会话 hydrate、切换/删除/重命名。
// 只管理「会话维度」的副作用；消息/运行态由调用方注入的 setter 落地。

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  deleteConversation,
  getConversation,
  listConversations,
  patchConversation,
} from "@/platform/api/index.js";
import {
  loadConversationId,
  saveConversationId,
} from "../domain/home-ask-conversation-storage.js";
import { nodesFromDetail } from "../domain/home-ask-message-mapping.js";
import { recordToSession, type HomeAskSession } from "../domain/home-ask-session.js";
import type { HomeAskMessage } from "../domain/types.js";
import { fetchActiveAiRuns, cancelAiRun } from "@/platform/api/index.js";

type HomeAskSessionsDeps = {
  runningRef: { current: boolean };
  conversationIdRef: { current: string };
  messagesLength: number;
  /** 整棵树 + head 一起换掉:线程是从它们派生的。 */
  replaceThread: (nodes: HomeAskMessage[], headId: string) => void;
  setConversationId: Dispatch<SetStateAction<string>>;
  setAgentRuntime: Dispatch<SetStateAction<string>>;
};

export function useHomeAskSessions({
  runningRef,
  conversationIdRef,
  messagesLength,
  replaceThread,
  setConversationId,
  setAgentRuntime,
}: HomeAskSessionsDeps) {
  const [sessions, setSessions] = useState<HomeAskSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [remoteRunId, setRemoteRunId] = useState("");
  const checkRunning = useCallback(async (id: string, detail: { messages?: { finish_reason?: string }[] }) => {
    if (!detail.messages?.some((m) => m.finish_reason === "running")) return;
    const runs = await fetchActiveAiRuns(id).catch(() => []);
    if (runs.length && conversationIdRef.current === id) setRemoteRunId(runs[0].run_id);
  }, [conversationIdRef]);
  useEffect(() => {
    if (!remoteRunId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    runningRef.current = true;
    const id = conversationIdRef.current;
    let missingRunPolls = 0;
    const poll = async () => {
      try {
        const [detail, runs] = await Promise.all([getConversation(id), fetchActiveAiRuns(id)]);
        if (!active || conversationIdRef.current !== id) return;
        const thread = nodesFromDetail(detail);
        const live = runs.some((run) => run.run_id === remoteRunId);
        replaceThread(thread.nodes.map((node) => node.id === remoteRunId && live ? { ...node, status: "streaming", progress: "正在继续生成" } : node), thread.headId);
        if (!live) {
          const finishing = detail.messages.some((message) => message.message_id === remoteRunId && message.finish_reason === "running");
          if (!finishing || ++missingRunPolls >= 6) { runningRef.current = false; setRemoteRunId(""); return; }
        }
      } catch { /* Retain the latest persisted snapshot until the next poll. */ }
      if (active) timer = setTimeout(poll, 1200);
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [remoteRunId, conversationIdRef, replaceThread, runningRef]);

  const refreshSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await listConversations({ limit: 80 });
      const list = (res.conversations || [])
        .map(recordToSession)
        .filter((s) => s.id);
      setSessions(list);
    } catch {
      // 列表失败不挡主流程
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  // 启动时若有粘性 conversationId，尝试 hydrate（失败则当新对话）
  useEffect(() => {
    const id = loadConversationId();
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const detail = await getConversation(id);
        if (cancelled) return;
        setConversationId(id);
        conversationIdRef.current = id;
        const thread = nodesFromDetail(detail);
        replaceThread(thread.nodes, thread.headId);
        void checkRunning(id, detail);
      } catch {
        if (!cancelled) {
          saveConversationId("");
          setConversationId("");
          conversationIdRef.current = "";
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationIdRef, setConversationId, replaceThread]);

  const switchSession = useCallback(async (id: string) => {
    const next = `${id || ""}`.trim();
    if (!next || runningRef.current || sessionBusy) return;
    if (next === conversationIdRef.current && messagesLength > 0) return;
    setSessionBusy(true);
    try {
      const detail = await getConversation(next);
      setConversationId(next);
      setAgentRuntime("");
      conversationIdRef.current = next;
      saveConversationId(next);
      const thread = nodesFromDetail(detail);
        replaceThread(thread.nodes, thread.headId);
      void checkRunning(next, detail);
    } catch {
      // 切失败保持现状
    } finally {
      setSessionBusy(false);
    }
  }, [conversationIdRef, messagesLength, runningRef, sessionBusy, setAgentRuntime, setConversationId, replaceThread]);

  const removeSession = useCallback(async (id: string) => {
    const next = `${id || ""}`.trim();
    if (!next || runningRef.current || sessionBusy) return;
    setSessionBusy(true);
    try {
      await deleteConversation(next);
      setSessions((prev) => prev.filter((s) => s.id !== next));
      if (conversationIdRef.current === next) {
        replaceThread([], "");
        setConversationId("");
        setAgentRuntime("");
        conversationIdRef.current = "";
        saveConversationId("");
      }
    } catch {
      /* ignore */
    } finally {
      setSessionBusy(false);
      void refreshSessions();
    }
  }, [conversationIdRef, refreshSessions, runningRef, sessionBusy, setAgentRuntime, setConversationId, replaceThread]);

  const renameSession = useCallback(async (id: string, title: string) => {
    const next = `${id || ""}`.trim();
    const nextTitle = `${title || ""}`.trim();
    if (!next || !nextTitle || runningRef.current || sessionBusy) return false;
    setSessionBusy(true);
    try {
      const updated = await patchConversation(next, { title: nextTitle });
      const finalTitle = `${updated?.title || nextTitle}`.trim() || nextTitle;
      setSessions((prev) => prev.map((s) => (
        s.id === next
          ? { ...s, title: finalTitle, updatedAt: `${updated?.updated_at || s.updatedAt}` }
          : s
      )));
      return true;
    } catch {
      return false;
    } finally {
      setSessionBusy(false);
    }
  }, [runningRef, sessionBusy]);

  return {
    remoteRunning: Boolean(remoteRunId),
    stopRemote: () => { if (remoteRunId) void cancelAiRun(remoteRunId); },
    sessions,
    sessionsLoading,
    sessionBusy,
    refreshSessions,
    switchSession,
    removeSession,
    renameSession,
  };
}
