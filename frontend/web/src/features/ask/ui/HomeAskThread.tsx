// 主页 AI 消息列表：轻量 markdown 预览 + 引用跳阅读器

import { useState } from "react";
import { AlertTriangle, BookOpen, CircleSlash, FlaskConical, ListTree, Loader2, Pencil, Sparkles } from "lucide-react";
import { AiMarkdownAnswer, type AiCitationLike } from "@retainpdf/reader/ai";
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

function AssistantBody({
  message,
}: {
  message: HomeAskMessage;
}) {
  const streaming = message.status === "streaming";
  const bodyText = `${message.content || ""}`;
  const citations = (message.citations || []) as AiCitationLike[];
  return (
    <AiMarkdownAnswer
      content={bodyText}
      streaming={streaming}
      citations={citations}
      className="home-ask-md"
      streamingClassName="home-ask-md-streaming"
      pendingClassName="home-ask-md-pending"
      finalClassName="home-ask-md-final"
      onJumpCitation={(citation) => openCitation(citation as HomeAskCitation)}
    />
  );
}

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
}: HomeAskThreadProps) {
  const [editingId, setEditingId] = useState("");
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
    <div className="home-ask-thread" role="log" aria-live="polite">
      {messages.map((m) => {
        if (m.role === "user") {
          // 会话首问没有父节点，服务端造不出第二个根，所以改不了——不给入口，
          // 而不是给一个点了没反应的按钮。
          const canEdit = Boolean(onEditQuestion) && Boolean(m.parentId) && !isRunning;
          const branch = branches[m.id];
          return (
            <div key={m.id} className="home-ask-msg home-ask-msg-user">
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
        const hasBody = Boolean(m.content?.trim());
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
          <div key={m.id} className="home-ask-msg home-ask-msg-assistant">
            {streaming && m.progress ? (
              <div className="home-ask-thinking" role="status">
                <Loader2 className="home-ask-spin" size={13} strokeWidth={2.4} aria-hidden />
                <span>{m.progress}</span>
              </div>
            ) : null}
            {streaming && !m.progress && !hasBody ? (
              <div className="home-ask-thinking" role="status">
                <Loader2 className="home-ask-spin" size={13} strokeWidth={2.4} aria-hidden />
                <span>思考中…</span>
              </div>
            ) : null}
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
                {/* 停止时服务端在落库之前就抛出了(raise_if_stopped 排在 persist_turn
                    前面),所以这半截回答只活在这个页面里。刷新就没了——用户有权在
                    刷新之前知道这件事,而不是回来发现整轮消失了。
                    「复制」就在下面那条操作条上,所以指过去而不是另加一个按钮。 */}
                <span>
                  {hasBody
                    ? "已中断，回答只写了一半；它不会保存，刷新后就没了——要留就先复制"
                    : "已中断，还没开始作答；这一轮不会保存"}
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
