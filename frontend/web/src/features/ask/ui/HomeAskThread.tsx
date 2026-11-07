// 主页 AI 消息列表：轻量 markdown 预览 + 引用跳阅读器

import { memo, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, BookOpen, CircleSlash, FlaskConical, ListTree, Pencil, Sparkles } from "lucide-react";
import { AiTurnContent, AiRunStatus, type AiCitationLike } from "@retainpdf/reader/ai";
import { buildReaderUrl } from "@/platform/navigation/pages.js";
import { navigateToReader } from "@/features/reader/domain.js";
import type { HomeAskCitation, HomeAskMessage } from "../domain/types.js";
import type { HomeAskBranchNav } from "../domain/home-ask-branches.js";
import { BranchSwitcher, MessageActions, QuestionEditor } from "./HomeAskMessageControls.js";
import { AgentOperationCard } from "./operations/AgentOperationCard.js";
import type {
  AgentOperationAction,
  AgentOperationEntry,
  AgentOperationPerformOptions,
  AgentOperationView,
  AgentConfirmationMode,
} from "../domain/operations/types.js";

export const HOME_ASK_SUGGESTIONS: Array<{
  prompt: string;
  label: string;
  icon: typeof BookOpen;
}> = [
  {
    prompt: "最近入库的文献里，有哪些值得优先阅读的主题？",
    label: "浏览存档主题",
    icon: BookOpen,
  },
  {
    prompt: "帮我对比不同文献对同一问题的主要结论。",
    label: "跨文献对比结论",
    icon: ListTree,
  },
  {
    prompt: "有哪些常用的方法或实验设计？",
    label: "梳理方法模型",
    icon: FlaskConical,
  },
  {
    prompt: "用几句话总结图书馆里一篇核心论文。",
    label: "快速总结一篇",
    icon: Sparkles,
  },
];

function openCitation(citation: HomeAskCitation) {
  const jobId = `${citation.job_id || ""}`.trim();
  if (!jobId) return;
  const rawPageIdx = citation.page_idx;
  const pageIdx = rawPageIdx !== null && rawPageIdx !== undefined && `${rawPageIdx}`.trim() !== "" && Number.isFinite(Number(rawPageIdx))
    ? Math.max(0, Math.floor(Number(citation.page_idx)))
    : undefined;
  const blockId = `${citation.block_id || ""}`.trim();
  const url = buildReaderUrl(jobId, { page: pageIdx ?? null, blockId });
  if (!url) return;
  navigateToReader(url);
}

const AssistantBody = memo(function AssistantBody({
  message,
}: {
  message: HomeAskMessage;
}) {
  const streaming = message.status === "streaming";
  const bodyText = `${message.content || ""}`;
  const citations = (message.citations || []) as AiCitationLike[];
  return (
    <div className="home-ask-md"><AiTurnContent
      parts={message.parts}
      metrics={message.metrics}
      content={bodyText}
      streaming={streaming}
      citations={citations}
      onJumpCitation={(citation) => openCitation(citation as HomeAskCitation)}
    /></div>
  );
});

export type HomeAskThreadProps = {
  messages: HomeAskMessage[];
  isRunning?: boolean;
  operationsByRequestMessage?: Record<string, AgentOperationEntry[]>;
  loadCandidate?: (operation: AgentOperationView) => Promise<Blob>;
  confirmationMode?: AgentConfirmationMode;
  onOperationAction?: (
    action: AgentOperationAction,
    operation: AgentOperationView,
    options?: AgentOperationPerformOptions,
  ) => void | Promise<void>;
  /**
   * 重新生成/重试。给的是**这条回答**的 id 加上它那一轮的提问——新答案要挂到同一个
   * 提问下成为兄弟分支，光有问题文本会退化成再追加一轮重复提问。
   */
  onRegenerate?: (assistantMessageId: string, question: string) => void;
  /** 有多版回答的消息 → 它是第几版、共几版、前后两版的 id。 */
  branches?: Record<string, HomeAskBranchNav>;
  /** 切到另一版回答。 */
  onSwitchBranch?: (messageId: string) => void;
  /** 改写某条历史提问，另开一个分支重新作答。 */
  onEditQuestion?: (userMessageId: string, question: string) => void;
  revealMessageId?: string;
};

export function HomeAskThread({
  messages,
  isRunning = false,
  operationsByRequestMessage = {},
  loadCandidate = async () => new Blob(),
  confirmationMode = "explicit",
  onOperationAction = () => {},
  onRegenerate,
  branches = {},
  onSwitchBranch,
  onEditQuestion,
  revealMessageId = "",
}: HomeAskThreadProps) {
  const [editingId, setEditingId] = useState("");
  const [visibleCount, setVisibleCount] = useState(60);
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<{ top: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const node = rootRef.current?.closest<HTMLElement>(".home-ask-scroll");
    if (node && anchorRef.current) node.scrollTop = anchorRef.current.top + node.scrollHeight - anchorRef.current.height;
    anchorRef.current = null;
  }, [visibleCount]);
  useLayoutEffect(() => {
    if (!revealMessageId) return;
    const index = messages.findIndex((message) => message.id === revealMessageId);
    if (index < 0) return;
    if (messages.length - index > visibleCount) setVisibleCount(messages.length - index);
    const frame = requestAnimationFrame(() => document.getElementById(`ask-${revealMessageId}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
    return () => cancelAnimationFrame(frame);
  }, [revealMessageId, messages.length, visibleCount]);
  const empty = messages.length === 0;
  // 操作卡片按「触发它的那条请求消息」归位,而不是全部堆在线程最底部。
  // 多轮对话里堆在最后会让人看不出哪张卡对应哪次请求。
  const operationsFor = (requestMessageId: string) => {
    const group = operationsByRequestMessage[requestMessageId] || [];
    const seen = new Set<string>();
    return group.filter((entry) => {
      const id = `${entry.remote.operation_id || ""}`.trim();
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  // 空态由 HomeAskView 的 hero 区渲染（Notion：问候 + 居中输入 + 建议）
  if (empty) {
    return null;
  }

  return (
    <div ref={rootRef} className="home-ask-thread" role="log" aria-live="polite">
      {messages.length > visibleCount ? <button className="home-ask-load-earlier" type="button" onClick={() => {
        const node = rootRef.current?.closest<HTMLElement>(".home-ask-scroll");
        if (node) anchorRef.current = { top: node.scrollTop, height: node.scrollHeight };
        setVisibleCount((count) => count + 40);
      }}>载入更早的对话（{messages.length - visibleCount} 条）</button> : null}
      {messages.slice(-visibleCount).map((m) => {
        if (m.role === "user") {
          // 会话首问没有父节点，服务端造不出第二个根，所以改不了——不给入口，
          // 而不是给一个点了没反应的按钮。
          const canEdit = Boolean(onEditQuestion) && Boolean(m.parentId) && !isRunning;
          const branch = branches[m.id];
          return (
            <div key={m.id} id={`ask-${m.id}`} className="home-ask-msg home-ask-msg-user">
              {editingId === m.id ? (
                <QuestionEditor
                  initial={m.rawQuestion || m.content || ""}
                  onCancel={() => setEditingId("")}
                  onSubmit={(next) => {
                    setEditingId("");
                    onEditQuestion?.(m.id, next);
                  }}
                />
              ) : (
                <>
                  <div className="home-ask-msg-bubble">
                    {m.attachments?.length ? <div className="home-ask-message-images">{m.attachments.map((image, index) => <img key={index} src={`data:${image.mime_type};base64,${image.data}`} alt={image.name || "附图"} />)}</div> : null}
                    <div className="home-ask-md-plain">{m.content}</div>
                  </div>
                  {branch || canEdit ? (
                    <div className="home-ask-msg-actions is-user">
                      {branch && onSwitchBranch && !isRunning ? (
                        <BranchSwitcher branch={branch} onSwitch={onSwitchBranch} />
                      ) : null}
                      {canEdit ? (
                        <button
                          type="button"
                          className="home-ask-msg-action"
                          onClick={() => setEditingId(m.id)}
                          title="改写这个问题"
                        >
                          <Pencil size={13} strokeWidth={2.2} aria-hidden />
                          <span>编辑</span>
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          );
        }
        const streaming = m.status === "streaming";
        const hasBody = Boolean(m.content?.trim() || m.parts?.length);
        const failed = m.status === "error";
        // 用户点停止、只写了半截。它是一等状态，不再靠正文里那句斜体标记来认。
        const interrupted = m.status === "cancelled";
        // 轮次预算用尽、模型被强制收尾。和「中断」不同:它不是用户喊停的，回答也写完
        // 了——只是背后的工作没做完。语气照常，所以不标出来就看不出来。
        const cutShort = !interrupted && m.incompleteReason === "rounds_exhausted";
        // 重新生成要用触发这条回答的那次提问。消息是成对追加的,所以取它前面那条 user。
        const askedIndex = messages.findIndex((item) => item.id === m.id) - 1;
        const asked = askedIndex >= 0 && messages[askedIndex]?.role === "user"
          ? messages[askedIndex]
          : null;
        const askedQuestion = `${asked?.content || ""}`.trim();
        // 中断后的「改写提问」出口：点它就是打开那一轮提问的内联编辑框，和用户气泡上
        // 的「编辑」是同一条路径。首问没有父节点、服务端造不出第二个根，所以同样不给。
        const canEditAsked = Boolean(onEditQuestion) && Boolean(asked?.parentId) && !isRunning;
        const operations = operationsFor(m.id);
        return (
          <div key={m.id} id={`ask-${m.id}`} className="home-ask-msg home-ask-msg-assistant">
            {streaming ? <AiRunStatus label={m.progress} running elapsedMs={m.metrics?.elapsed_ms || 0} /> : null}
            {hasBody || failed ? (
              <div
                className={`home-ask-msg-bubble${failed ? " is-error" : ""}${interrupted ? " is-interrupted" : ""}`}
              >
                <AssistantBody message={m} />
              </div>
            ) : null}
            {/* 「已中断」是标识，不是正文：它在气泡外面，复制/引用都带不走它。
                一个字都没来得及出来的中断也要显示——否则这条消息在线程里什么都不剩，
                连重新生成的入口都跟着消失，看上去像提问石沉大海。 */}
            {interrupted ? (
              <div className="home-ask-msg-interrupted" role="status">
                <CircleSlash size={13} strokeWidth={2.2} aria-hidden />
                <span>
                  {hasBody
                    ? m.persisted === false ? "已中断，这段内容尚未保存，可先复制" : m.persisted ? "已中断，已生成的内容保留在对话中" : "已中断，正在保存已生成的内容"
                    : "已中断，尚未生成回答"}
                </span>
              </div>
            ) : null}
            {cutShort ? (
              <div className="home-ask-msg-truncated" role="status">
                <AlertTriangle size={13} strokeWidth={2.2} aria-hidden />
                <span>检索与计算的步数已用尽，这个回答是提前收尾的——追问一句可以让它接着做。</span>
              </div>
            ) : null}
            {!streaming && (hasBody || failed || interrupted || cutShort) ? (
              <MessageActions
                content={m.content || ""}
                failed={failed}
                interrupted={interrupted}
                canRegenerate={Boolean(askedQuestion) && !isRunning}
                onRegenerate={() => onRegenerate?.(m.id, askedQuestion)}
                onEditQuestion={canEditAsked && asked
                  ? () => setEditingId(asked.id)
                  : undefined}
                branch={branches[m.id]}
                onSwitchBranch={isRunning ? undefined : onSwitchBranch}
              />
            ) : null}
            {m.source ? <div className="reader-ai-answer-source">{m.source}</div> : null}
            {failed && m.errorText && m.content !== m.errorText ? <p className="home-ask-turn-error" role="alert">{m.errorText}</p> : null}
            {m.status === "complete" && m.persisted === false ? <p className="home-ask-turn-error" role="status">本轮尚未保存，请先复制需要保留的内容。</p> : null}
            {m.status === "complete" && m.metrics?.elapsed_ms ? <AiRunStatus running={false} elapsedMs={m.metrics.elapsed_ms} /> : null}
            {operations.map((entry) => (
              <div key={entry.remote.operation_id} className="home-ask-msg-operation">
                <AgentOperationCard
                  entry={entry}
                  loadCandidate={loadCandidate}
                  confirmationMode={confirmationMode}
                  onAction={onOperationAction}
                />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
