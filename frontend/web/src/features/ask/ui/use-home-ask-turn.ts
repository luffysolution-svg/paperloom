// 主页 AI 单轮问答的运行态：abort 控制、流式回调落地、错误/停止收尾。
// 纯编排；消息 patch 与状态 setter 由 runtime 组合层注入。

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { askLibraryAi, createConversation } from "@/platform/api/index.js";
import {
  resolveReaderAiConfig,
  sanitizeAssistantAnswer,
} from "@/features/reader/domain.js";
import { buildHomeAskModelRequestOverrides } from "../domain/home-ask-request-config.js";
import { buildScopedQuestion, resolveScopesForAsk } from "../domain/home-ask-scope-prompt.js";
import { describeToolEvent, findTurnUserMessage } from "../domain/home-ask-message-mapping.js";
import { operationSignalsFromResult } from "../domain/home-ask-operation-signal.js";
import { makeId } from "../domain/home-ask-ids.js";
import { classifyTurnFailure } from "../domain/home-ask-turn-failure.js";
import { saveConversationId } from "../domain/home-ask-conversation-storage.js";
import type { HomeAskCitation, HomeAskMessage, HomeAskScope } from "../domain/types.js";

type EnqueueOperationSignal = (params: {
  operationId: string;
  conversationId: string;
  dedupeKey: string;
}) => void;

type HomeAskTurnDeps = {
  runningRef: { current: boolean };
  conversationIdRef: { current: string };
  messagesRef: { current: HomeAskMessage[] };
  patchMessage: (id: string, patch: Partial<HomeAskMessage>) => void;
  /** 往树上挂节点，head 移到最后一个。 */
  appendNodes: (nodes: HomeAskMessage[]) => void;
  /** 摘掉一个节点并把 head 交给另一条消息。 */
  dropNode: (id: string, nextHeadId: string) => void;
  setConversationId: Dispatch<SetStateAction<string>>;
  setAgentRuntime: Dispatch<SetStateAction<string>>;
  enqueueOperationSignal: EnqueueOperationSignal;
  refreshSessions: () => void | Promise<void>;
};

export function useHomeAskTurn({
  runningRef,
  conversationIdRef,
  messagesRef,
  patchMessage,
  appendNodes,
  dropNode,
  setConversationId,
  setAgentRuntime,
  enqueueOperationSignal,
  refreshSessions,
}: HomeAskTurnDeps) {
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  /** 当前流式 assistant 消息 id，停止时用于收尾文案 */
  const streamingAssistantIdRef = useRef("");

  // 卸载（如切走 AI Tab）中止在途流式请求：请求跑到结束才释放既浪费，
  // patchMessage 还会写已卸载状态。注意只 abort，不断运行态（重挂载读持久会话）。
  useEffect(() => () => {
    try {
      abortRef.current?.abort();
    } catch {
      /* ignore */
    }
  }, []);

  const stop = useCallback(() => {
    const ctrl = abortRef.current;
    if (!ctrl) return;
    try {
      ctrl.abort();
    } catch {
      /* ignore */
    }
  }, []);

  // 与 send finally 同口径复位运行态；中止是异步落定的，runningRef 卡住会
  // 挡掉紧接着的 send（入口直接 return）。newSession 依赖此复位。
  const resetRunState = useCallback(() => {
    abortRef.current = null;
    streamingAssistantIdRef.current = "";
    runningRef.current = false;
    setIsRunning(false);
  }, [runningRef]);

  const send = useCallback(async (
    rawQuestion: string,
    scopes: HomeAskScope[] = [],
    { regenerateOf = "", editOf = "" }: { regenerateOf?: string; editOf?: string } = {},
  ) => {
    const question = `${rawQuestion || ""}`.trim();
    if (!question || runningRef.current) return;

    // 重新生成不是「把同一个问题再问一遍」:服务端在 regenerate 时跳过写入 user 消息，
    // 只把新答案挂到 parent_id 下成为兄弟分支，并把喂给模型的历史截断到 parent
    // （不然模型会看见自己刚被否掉的那一版）。少传 parent_id 就会退化成多一轮重复提问。
    const priorMessages = messagesRef.current;
    const regenerating = Boolean(regenerateOf);

    // 编辑历史提问 = 在**同一个父节点**下挂一条新的提问，成为原提问的兄弟版本，
    // 它自己再带一棵新的回答子树。原提问和它底下的回答都留在树里。
    const editedFrom = editOf
      ? priorMessages.find((m) => m.id === editOf && m.role === "user") || null
      : null;
    if (editOf && !editedFrom) return;
    // 会话第一条提问没有父节点，而服务端不接受「显式的根」——parent_id 传空会被解析成
    // 「挂到当前 head」，造不出第二个根。所以首问暂时不能改，UI 那边也不给入口。
    if (editedFrom && !editedFrom.parentId) return;
    const parentUser = regenerating
      ? findTurnUserMessage(priorMessages, regenerateOf)
      : null;
    if (regenerating && !parentUser) return;
    // 重新生成失败时把原答案放回去——它在服务端还在（成了兄弟分支），但视图里已经被
    // 换掉了，不还原就等于点一次重试把看得见的答案弄丢了。
    const priorAssistant = regenerating
      ? priorMessages.find((m) => m.id === regenerateOf) || null
      : null;
    const headId = editedFrom
      ? `${editedFrom.parentId || ""}`
      : (priorMessages.length ? `${priorMessages[priorMessages.length - 1].id}` : "");

    // 运行配置及密钥以本机后端的 runtime-config 为权威。浏览器里的旧配置
    // 只作为本次请求的可选覆盖；为空时让后端使用安全保存的凭据。
    const config = resolveReaderAiConfig();
    const modelRequestOverrides = buildHomeAskModelRequestOverrides(config);

    const userId = parentUser ? parentUser.id : makeId("u");
    const assistantId = makeId("a");
    const displayUser = scopes.length
      ? `${question}\n\n${scopes.map((s) => (s.kind === "collection" ? `@合集:${s.title}` : `@${s.title}`)).join(" ")}`
      : question;

    // 新请求前中止上一轮
    try {
      abortRef.current?.abort();
    } catch {
      /* ignore */
    }
    const abort = new AbortController();
    abortRef.current = abort;
    streamingAssistantIdRef.current = assistantId;

    runningRef.current = true;
    setIsRunning(true);
    const streamingAssistant: HomeAskMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      progress: regenerating
        ? "正在重新生成…"
        : (scopes.some((s) => s.kind === "collection") ? "正在解析合集…" : "正在准备…"),
      status: "streaming",
      parentId: userId,
    };
    // 重新生成只挂一个新答案:它和旧答案同一个 parent，成为兄弟版本，head 一移，
    // 可见路径自然换成新的那条，旧的留在树里等着被切回来。
    appendNodes(regenerating
      ? [streamingAssistant]
      : [
        {
          id: userId,
          role: "user",
          content: displayUser,
          status: "complete",
          rawQuestion: question,
          ...(headId ? { parentId: headId } : {}),
        },
        streamingAssistant,
      ]);

    try {
      const { primaryDoc, resolvedDocs } = await resolveScopesForAsk(scopes);
      if (abort.signal.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      if (scopes.some((s) => s.kind === "collection") && resolvedDocs.length === 0) {
        const emptyCol = scopes.find((s) => s.kind === "collection");
        patchMessage(assistantId, {
          content: `合集「${emptyCol?.title || ""}」里暂无文档，请先往合集加入文献后再问。`,
          progress: "",
          status: "error",
          citations: [],
        });
        return;
      }

      // 首轮请求必须先拿到 durable conversation_id。过去依赖 /ai/ask 在
      // done 才回传自动创建的会话；若 Agent 已创建 operation、但浏览器在
      // done 前断线，前端连按哪个 conversation 恢复都不知道。
      let requestConversationId = conversationIdRef.current;
      if (!requestConversationId) {
        const created = await createConversation({
          title: question.replace(/\s+/g, " ").trim().slice(0, 80),
          document_id: primaryDoc?.id || "",
        });
        requestConversationId = `${created?.conversation_id || ""}`.trim();
        if (!requestConversationId) throw new Error("创建 AI 会话失败，请重试。");
        setConversationId(requestConversationId);
        conversationIdRef.current = requestConversationId;
        saveConversationId(requestConversationId);
      }

      // 重新生成要原样重发当轮发过的那串文本。展示用的 content 带着「@标题」后缀，
      // 拿它去发等于把后缀也当成问题的一部分。
      const scopedQuestion = regenerating
        ? `${parentUser?.prompt || parentUser?.content || question}`
        : buildScopedQuestion(question, scopes, resolvedDocs);
      if (!regenerating && scopedQuestion !== displayUser) {
        patchMessage(userId, { prompt: scopedQuestion });
      }
      let answerStarted = false;
      const result = await askLibraryAi({
        question: scopedQuestion,
        documentId: primaryDoc?.id || "",
        jobId: primaryDoc?.job_id || "",
        conversationId: requestConversationId,
        parentId: regenerating ? userId : headId,
        regenerate: regenerating,
        userMessageId: userId,
        assistantMessageId: assistantId,
        ...modelRequestOverrides,
        signal: abort.signal,
        onToolEvent: (event) => {
          if (abort.signal.aborted || answerStarted) return;
          patchMessage(assistantId, {
            progress: describeToolEvent(event),
            status: "streaming",
          });
        },
        onAgentSessionEvent: (event) => {
          const runtime = `${event?.agent_runtime || event?.runtime || ""}`.trim();
          if (runtime) setAgentRuntime(runtime);
        },
        onAgentOperationEvent: (event) => {
          const operationId = `${event?.operation_id || ""}`.trim();
          if (!operationId) return;
          const attempt = Number(event?.current_attempt) || 0;
          const latestSeq = Number(event?.latest_event_seq) || 0;
          enqueueOperationSignal({
            operationId,
            conversationId: `${event?.conversation_id || requestConversationId}`.trim(),
            dedupeKey: `${event?.event_id || `${operationId}:state:${attempt}:${latestSeq}:${event?.status || ""}`}`,
          });
        },
        onAgentConfirmationRequiredEvent: (event) => {
          const operationId = `${event?.operation_id || ""}`.trim();
          if (!operationId) return;
          enqueueOperationSignal({
            operationId,
            conversationId: requestConversationId,
            dedupeKey: `${operationId}:${event?.action || "refresh"}:${Number(event?.current_attempt) || 0}`,
          });
        },
        onAnswerDelta: (fullText: string) => {
          if (abort.signal.aborted) return;
          answerStarted = true;
          const cleaned = sanitizeAssistantAnswer(fullText || "", []);
          const show = cleaned.trim() ? cleaned : `${fullText || ""}`;
          patchMessage(assistantId, {
            content: show,
            progress: "",
            status: "streaming",
          });
        },
      });

      if (abort.signal.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const citations = (Array.isArray(result?.citations)
        ? result.citations
        : []) as HomeAskCitation[];
      const answer = sanitizeAssistantAnswer(
        `${result?.answer || ""}`.trim() || "没有找到可用回答。",
        citations,
      );
      const nextConv = `${result?.conversationId || ""}`.trim();
      const resultRuntime = `${result?.agentRuntime || ""}`.trim();
      if (resultRuntime) setAgentRuntime(resultRuntime);
      for (const signal of operationSignalsFromResult(result, requestConversationId)) {
        enqueueOperationSignal(signal);
      }
      if (nextConv) {
        setConversationId(nextConv);
        conversationIdRef.current = nextConv;
        saveConversationId(nextConv);
      }
      patchMessage(assistantId, {
        content: answer,
        citations,
        progress: "",
        status: "complete",
        incompleteReason: `${result?.incompleteReason || ""}`.trim(),
      });
      void refreshSessions();
    } catch (error) {
      // 「是不是用户点了停止」只看信号和 AbortError，不看消息文本——理由见
      // home-ask-turn-failure.ts（上游一句 "Request aborted by upstream" 曾经足以
      // 让一次真失败伪装成一次用户中止）。
      const failure = classifyTurnFailure(error, abort.signal);
      if (failure.kind === "cancelled") {
        const partial = `${messagesRef.current.find((m) => m.id === assistantId)?.content || ""}`.trim();
        if (!partial && priorAssistant) {
          // 重新生成一个字都没出来就被停掉:把空壳摘掉、切回原答案。留着它会变成一个
          // 什么都没有的"版本",白占一格分支计数。
          dropNode(assistantId, priorAssistant.id);
        } else {
          // 已经流出来的正文原样留着，中断本身进 status。不再往正文尾巴上拼
          // `_（已停止生成）_`：那句标记会被复制走、被引用进下一个问题，也会让半截
          // 回答和写完的回答在数据上分不出来。界面上的「已中断」标识由 status 派生。
          patchMessage(assistantId, {
            content: partial,
            progress: "",
            status: "cancelled",
          });
        }
      } else {
        // 重新生成失败时错误就停在这一版上。它和原答案是兄弟，切换器给出 « 1/2 »，
        // 一键就能切回原来那版——两条不可能同时显示，它们共用一个父节点。
        patchMessage(assistantId, {
          content: failure.message,
          progress: "",
          status: "error",
          citations: [],
        });
      }
    } finally {
      if (abortRef.current === abort) {
        abortRef.current = null;
      }
      streamingAssistantIdRef.current = "";
      runningRef.current = false;
      setIsRunning(false);
    }
  }, [
    conversationIdRef,
    enqueueOperationSignal,
    messagesRef,
    patchMessage,
    appendNodes,
    dropNode,
    refreshSessions,
    runningRef,
    setAgentRuntime,
    setConversationId,
  ]);

  return { isRunning, send, stop, resetRunState };
}
