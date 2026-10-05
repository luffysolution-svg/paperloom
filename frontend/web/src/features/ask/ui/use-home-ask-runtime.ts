// 主页图书馆级 AI 问答：全库 / @ 文档 + 会话列表（侧栏历史）
//
// 组合根。纯逻辑拆到 ../domain/：
// - home-ask-conversation-storage.ts 粘性会话 id 持久化
// - home-ask-scope-prompt.ts         提问范围 prompt 构建 + 合集展开
// - home-ask-message-mapping.ts      服务端消息/工具事件映射
// - home-ask-session.ts              会话列表项映射
// 副作用拆到同目录子 hook：
// - use-home-ask-sessions.ts         历史列表 / hydrate / 切换 / 删除 / 重命名
// - use-home-ask-turn.ts             单轮流式问答运行态
// - use-home-ask-operation-signals.ts Agent 操作信号日志
// 本文件只负责组合，并保持对外导出名/返回形状不变。

import { useCallback, useMemo, useRef, useState } from "react";
import { patchConversation } from "@/platform/api/index.js";
import {
  loadConversationId,
  saveConversationId,
} from "../domain/home-ask-conversation-storage.js";
import { branchNavigation, headForBranch } from "../domain/home-ask-branches.js";
import { visibleThread } from "../domain/home-ask-message-mapping.js";
import type { HomeAskMessage } from "../domain/types.js";
import { useHomeAskOperationSignals } from "./use-home-ask-operation-signals.js";
import { useHomeAskSessions } from "./use-home-ask-sessions.js";
import { useHomeAskTurn } from "./use-home-ask-turn.js";

export type { HomeAskSession } from "../domain/home-ask-session.js";
export type { HomeAgentOperationSignal } from "../domain/home-ask-operation-signal.js";

export function useHomeAskRuntime() {
  // 真值是整棵消息树 + 当前 head；线程里看得见的那一条由它们派生。重新生成挂出来的
  // 兄弟版本留在 nodes 里，切分支就是换 head——树扔了就切不回去了。
  const [nodes, setNodes] = useState<HomeAskMessage[]>([]);
  const [headId, setHeadId] = useState("");
  const [conversationId, setConversationId] = useState(loadConversationId);
  const [agentRuntime, setAgentRuntime] = useState("");
  const runningRef = useRef(false);
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;

  const messages = useMemo(() => visibleThread(nodes, headId), [nodes, headId]);
  const branches = useMemo(() => branchNavigation(nodes, messages), [nodes, messages]);

  // 发一轮请求要知道当前可见路径的末端（挂 parent_id）和某条回答对应的提问
  // （重新生成）。turn 里拿不到 messages 的当前值，和 conversationIdRef 同样用
  // 渲染期赋值的 ref 递过去。
  const messagesRef = useRef<HomeAskMessage[]>(messages);
  messagesRef.current = messages;
  const nodesRef = useRef<HomeAskMessage[]>(nodes);
  nodesRef.current = nodes;

  const patchMessage = useCallback((id: string, patch: Partial<HomeAskMessage>) => {
    setNodes((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  /** 追加节点并把 head 移到最后一个——新答案永远是当前显示的那一版。 */
  const appendNodes = useCallback((added: HomeAskMessage[]) => {
    if (!added.length) return;
    setNodes((prev) => [...prev, ...added]);
    setHeadId(added[added.length - 1].id);
  }, []);

  /** 丢掉一个节点并把 head 交给指定消息。用于「重新生成一个字都没出来就被停掉」。 */
  const dropNode = useCallback((id: string, nextHeadId: string) => {
    setNodes((prev) => prev.filter((m) => m.id !== id));
    setHeadId(nextHeadId);
  }, []);

  const replaceThread = useCallback((nextNodes: HomeAskMessage[], nextHeadId: string) => {
    setNodes(nextNodes);
    setHeadId(nextHeadId);
  }, []);

  const signals = useHomeAskOperationSignals();
  const sessions = useHomeAskSessions({
    runningRef,
    conversationIdRef,
    messagesLength: messages.length,
    replaceThread,
    setConversationId,
    setAgentRuntime,
  });
  const turn = useHomeAskTurn({
    runningRef,
    conversationIdRef,
    messagesRef,
    patchMessage,
    appendNodes,
    dropNode,
    setConversationId,
    setAgentRuntime,
    enqueueOperationSignal: signals.enqueueOperationSignal,
    refreshSessions: sessions.refreshSessions,
  });

  const newSession = useCallback(() => {
    // 新对话时若正在生成，先中止
    if (runningRef.current) turn.stop();
    turn.resetRunState();
    replaceThread([], "");
    setConversationId("");
    setAgentRuntime("");
    signals.resetOperationSignals();
    conversationIdRef.current = "";
    saveConversationId("");
  }, [turn.stop, turn.resetRunState, signals.resetOperationSignals, replaceThread]);

  /**
   * 切到同一个提问下的另一版回答。
   *
   * head 不落在那一版自己身上——它下面可能还接着后续对话，要走到这条分支最新的续写。
   * head 同时写回服务端：下一轮提问挂在 head 底下，恢复会话读的也是它，只改本地的话
   * 一刷新就跳回去了。
   */
  const switchBranch = useCallback((targetMessageId: string) => {
    if (runningRef.current) return;
    const nextHead = headForBranch(nodesRef.current, targetMessageId);
    if (!nextHead) return;
    setHeadId(nextHead);
    const convId = conversationIdRef.current;
    if (!convId) return;
    // 写回失败不该把已经切好的视图回滚——本地仍然是用户要看的那一版，
    // 下次恢复会话再按服务端的 head 走。
    void patchConversation(convId, { head_id: nextHead }).catch(() => {});
  }, [runningRef]);

  return {
    messages,
    branches,
    switchBranch,
    isRunning: turn.isRunning,
    conversationId,
    sessions: sessions.sessions,
    sessionsLoading: sessions.sessionsLoading,
    sessionBusy: sessions.sessionBusy,
    agentRuntime,
    operationSignals: signals.operationSignals,
    send: turn.send,
    stop: turn.stop,
    newSession,
    switchSession: sessions.switchSession,
    removeSession: sessions.removeSession,
    renameSession: sessions.renameSession,
    refreshSessions: sessions.refreshSessions,
    clearChat: newSession,
  };
}
