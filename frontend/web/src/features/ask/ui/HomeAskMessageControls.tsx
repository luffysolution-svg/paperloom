// 消息级控件：回答下面的操作条、多版切换器、历史提问的内联编辑框。
//
// 从 HomeAskThread 拆出来的——那边只负责把消息排成线程，这些是挂在单条消息上的交互。

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, Pencil, RotateCcw } from "lucide-react";
import type { HomeAskBranchNav } from "../domain/home-ask-branches.js";

/**
 * 一条回答下面的操作。阅读器那侧早就有复制与重新生成，主页此前一个都没有。
 *
 * 被中断的回答（status === "cancelled"）走的是同一条操作条，只是多一个「改写提问」。
 * 半截回答需要三个出口（业界把这个模式叫 Interrupt and Resume：半截结果留在原地、
 * 标好中断，并给出接下来能做什么），这里选的是：
 *
 *   1. 保留——**默认，不占按钮**。半截答案本身常常已经够用了；它原地留着，带一个
 *      「已中断」标识，「复制」抄走的是干净正文。什么都不点就是保留，所以不需要一个
 *      写着「保留」的按钮：那种按钮只会让人以为不点就会丢。
 *   2. 重新生成——复用既有那套。新答案挂成同一个提问下的兄弟版本，被中断的那版留在
 *      树里，切换器给出 « 1/2 »，随时切回去看。所以它不是「丢弃重来」，是「再要一版」。
 *   3. 改写提问——复用编辑历史提问那套。中断往往是因为看头两句就发现问错了，此时要改
 *      的是问题不是答案；入口放在这条回答下面，省掉「回到上面那条提问再找编辑」一步。
 *      改写同样是挂兄弟版本，原提问和这半截回答都留着。
 *
 * 没有「丢弃」按钮：真正把节点从树上摘掉要经 `dropNode`，而它只在 runtime 组合层
 * （use-home-ask-runtime.ts）内部，没有透出到 HomeAskThread 的 props。要给这个出口
 * 得先把它透出来——那是另一处改动，不在本次改动范围内。在此之前，「重新生成」和
 * 「改写提问」都会把半截那版从可见路径上换下去，已经覆盖了「不想要它了」的主诉求。
 */
export function MessageActions({
  content,
  failed,
  interrupted = false,
  canRegenerate,
  onRegenerate,
  onEditQuestion,
  branch,
  onSwitchBranch,
}: {
  content: string;
  failed: boolean;
  /** 用户点停止、只写了半截。 */
  interrupted?: boolean;
  canRegenerate: boolean;
  onRegenerate: () => void;
  /** 给了才出「改写提问」。是否可改（首问改不了）由调用方判定。 */
  onEditQuestion?: () => void;
  branch?: HomeAskBranchNav;
  onSwitchBranch?: (messageId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    const text = `${content || ""}`.trim();
    if (!text) return;
    // 剪贴板在非安全上下文或被拒权限时会 reject。复制失败不该让整条消息崩掉,
    // 也不该假装成功——按钮不变成对勾就是没复制上。
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      },
      () => {},
    );
  }, [content]);

  return (
    <div className="home-ask-msg-actions">
      {branch && onSwitchBranch ? (
        <BranchSwitcher branch={branch} onSwitch={onSwitchBranch} />
      ) : null}
      {content.trim() ? (
        <button type="button" className="home-ask-msg-action" onClick={copy} title="复制回答">
          {copied
            ? <Check size={13} strokeWidth={2.2} aria-hidden />
            : <Copy size={13} strokeWidth={2.2} aria-hidden />}
          <span>{copied ? "已复制" : "复制"}</span>
        </button>
      ) : null}
      {canRegenerate ? (
        <button
          type="button"
          className="home-ask-msg-action"
          onClick={onRegenerate}
          title={failed
            ? "重试这次提问"
            : interrupted
              ? "重新回答这一轮；被中断的这版留作上一个版本"
              : "重新生成回答"}
        >
          <RotateCcw size={13} strokeWidth={2.2} aria-hidden />
          <span>{failed ? "重试" : "重新生成"}</span>
        </button>
      ) : null}
      {interrupted && onEditQuestion ? (
        <button
          type="button"
          className="home-ask-msg-action"
          onClick={onEditQuestion}
          title="改写这一轮的问题再问一次"
        >
          <Pencil size={13} strokeWidth={2.2} aria-hidden />
          <span>改写提问</span>
        </button>
      ) : null}
    </div>
  );
}


/**
 * 同一个提问下的多版回答之间来回切。
 *
 * 重新生成会把新答案挂成兄弟版本，旧的那版从可见路径上换下去但还在树里。没有这个
 * 切换器的话，重新生成一次就等于把上一版永久藏起来了。
 */
export function BranchSwitcher({
  branch,
  onSwitch,
}: {
  branch: HomeAskBranchNav;
  onSwitch: (messageId: string) => void;
}) {
  return (
    <div className="home-ask-msg-branch" role="group" aria-label="回答版本">
      <button
        type="button"
        className="home-ask-msg-branch-nav"
        onClick={() => branch.prevId && onSwitch(branch.prevId)}
        disabled={!branch.prevId}
        aria-label="上一版回答"
        title="上一版回答"
      >
        <ChevronLeft size={13} strokeWidth={2.4} aria-hidden />
      </button>
      <span className="home-ask-msg-branch-count">
        {branch.index}/{branch.count}
      </span>
      <button
        type="button"
        className="home-ask-msg-branch-nav"
        onClick={() => branch.nextId && onSwitch(branch.nextId)}
        disabled={!branch.nextId}
        aria-label="下一版回答"
        title="下一版回答"
      >
        <ChevronRight size={13} strokeWidth={2.4} aria-hidden />
      </button>
    </div>
  );
}


/**
 * 历史提问的内联编辑框。
 *
 * 保存等于「在同一个父节点下挂一条新提问」——原提问和它底下的回答都留在树里，靠提问
 * 上的版本切换器切回去。所以这里不是「改掉原来那条」，措辞也用「发送」而不是「保存」。
 */
export function QuestionEditor({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: string;
  onCancel: () => void;
  onSubmit: (question: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.focus();
    // 光标落到末尾，而不是选中全文——多数改动是补一句，不是重写。
    node.setSelectionRange(node.value.length, node.value.length);
  }, []);

  const submit = () => {
    const next = draft.trim();
    if (!next) return;
    onSubmit(next);
  };

  return (
    <div className="home-ask-msg-editor">
      <textarea
        ref={ref}
        className="home-ask-msg-editor-input"
        value={draft}
        rows={Math.min(8, Math.max(2, draft.split("\n").length + 1))}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
            return;
          }
          // 和输入框一致：Enter 发送，Shift+Enter 换行。
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        aria-label="改写问题"
      />
      <div className="home-ask-msg-editor-actions">
        <button type="button" className="home-ask-msg-action" onClick={onCancel}>
          取消
        </button>
        <button
          type="button"
          className="home-ask-msg-action is-primary"
          onClick={submit}
          disabled={!draft.trim()}
        >
          发送
        </button>
      </div>
    </div>
  );
}
