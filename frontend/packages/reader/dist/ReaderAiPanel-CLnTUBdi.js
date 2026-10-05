import { jsx as i, jsxs as x, Fragment as be } from "react/jsx-runtime";
import { useState as W, useRef as B, useEffect as U, useMemo as Q, useCallback as H, useId as pt } from "react";
import { Square as mt, ArrowUp as ft, Copy as ht, GitBranch as gt, RefreshCw as yt, Sigma as He, Table2 as wt, Image as vt, Type as It, X as Re, BookOpen as Ge, Sparkles as ge, Loader2 as Ce, FileText as Se, ArrowDown as Ve, Quote as bt, ListTree as Rt, FlaskConical as Ct, ShieldCheck as Nt, Bot as Mt, ChevronUp as _t, ChevronDown as Ye, TriangleAlert as Qe, ExternalLink as kt, Check as Je, Circle as St, Plus as At, Pencil as $t, Trash2 as Tt } from "lucide-react";
import { g as me, h as fe, i as De, j as xt, d as Et, b as Pt } from "./ReaderApp-BFnKNkdf.js";
import { ThreadPrimitive as se, ComposerPrimitive as we, MessagePrimitive as Xe, ActionBarPrimitive as _e, useAui as Ot, SelectionToolbarPrimitive as Dt, useExternalStoreRuntime as Ft, AssistantRuntimeProvider as zt } from "@assistant-ui/react";
import { A as qt } from "./AiMarkdownAnswer-BKvhvx2o.js";
import { r as Ze } from "./reader-regions-DsePY7B_.js";
import { M as Bt, C as Fe, h as Lt } from "./config-CgaWliJ_.js";
import { b as ue, n as oe, q as jt } from "./answer-enhance-D8zK9znw.js";
import { b as Kt, m as Wt, s as Ut, l as et, c as he, d as $e, a as Ht } from "./answer-quote-Div0HO_p.js";
import { Chat as Gt, useChat as Vt } from "@ai-sdk/react";
import { describeToolEvent as Yt } from "@retainpdf/domain/ai";
import { toSessionSummary as Qt } from "@retainpdf/domain/session";
import { l as Jt } from "./ask-answerer-GNQdzitl.js";
import { getConversation as ze, messagesToBranchItems as Ie, nextForkConversationTitle as Xt } from "@retainpdf/api/conversations";
import { c as ke } from "./ai-chat-ZSCffLDD.js";
import { agentOperationShouldReplace as Zt, agentOperationEventSeq as en, agentOperationShouldPoll as tn, agentOperationErrorStatus as nn, agentOperationErrorMessage as rn, resolveAgentOperationActionKey as sn, clearAgentOperationActionKey as an } from "@retainpdf/api/agent-operation-model";
function tt(t) {
  return t.content.filter((e) => e.type === "text").map((e) => e.text).join(`
`).trim();
}
function qe({ label: t }) {
  return /* @__PURE__ */ x("div", { className: "aui-thinking", role: "status", "aria-live": "polite", children: [
    /* @__PURE__ */ i(Ce, { className: "aui-spin", size: 14, strokeWidth: 2.4, "aria-hidden": !0 }),
    /* @__PURE__ */ i("span", { children: t || "思考中…" })
  ] });
}
function on({ message: t }) {
  return /* @__PURE__ */ i(Xe.Root, { className: "aui-msg aui-msg-user", "data-role": "user", children: /* @__PURE__ */ i("div", { className: "aui-msg-bubble", children: /* @__PURE__ */ i("div", { className: "aui-md-plain", children: tt(t) }) }) });
}
function cn({
  jobId: t,
  message: e,
  citations: n,
  progress: s,
  incompleteReason: a,
  streaming: r,
  branchBusy: o,
  onJumpCitation: l,
  onBranchFromAnswer: p
}) {
  const c = tt(e);
  return /* @__PURE__ */ i(Xe.Root, { className: "aui-msg aui-msg-assistant", "data-role": "assistant", children: /* @__PURE__ */ x("div", { className: "aui-msg-stack", children: [
    r && s ? /* @__PURE__ */ i(qe, { label: s }) : null,
    r && !s && !c ? /* @__PURE__ */ i(qe, { label: "思考中…" }) : null,
    !r && a === "rounds_exhausted" ? /* @__PURE__ */ i("div", { className: "aui-msg-truncated", role: "status", children: "检索与计算的步数已用尽，这个回答是提前收尾的——追问一句可以让它接着做。" }) : null,
    c ? /* @__PURE__ */ i("div", { className: "aui-msg-bubble", children: /* @__PURE__ */ i(
      qt,
      {
        content: c,
        streaming: r,
        citations: n,
        jobId: t,
        className: "aui-md",
        streamingClassName: "aui-md-streaming",
        pendingClassName: "aui-md-pending",
        finalClassName: "aui-md-final",
        onJumpCitation: l
      }
    ) }) : null,
    /* @__PURE__ */ x(
      _e.Root,
      {
        className: "aui-msg-actions",
        "data-reader-ai-actions": "",
        hideWhenRunning: !0,
        autohide: "not-last",
        children: [
          /* @__PURE__ */ i(_e.Copy, { className: "aui-action-btn", "aria-label": "复制答案", title: "复制答案", children: /* @__PURE__ */ i(ht, { size: 14, strokeWidth: 2.1, "aria-hidden": !0 }) }),
          p ? /* @__PURE__ */ i(
            "button",
            {
              type: "button",
              className: "aui-action-btn aui-action-btn-branch",
              "aria-label": "从这里开新对话",
              title: "从这里开新对话",
              disabled: o,
              onClick: async () => {
                ue(1200, { overlayDelayMs: 0 }), oe(1200), await p(e.id);
              },
              children: /* @__PURE__ */ i(gt, { size: 14, strokeWidth: 2.2, "aria-hidden": !0 })
            }
          ) : null,
          /* @__PURE__ */ i(_e.Reload, { className: "aui-action-btn", "aria-label": "重新生成", title: "重新生成", children: /* @__PURE__ */ i(yt, { size: 14, strokeWidth: 2.2, "aria-hidden": !0 }) })
        ]
      }
    )
  ] }) });
}
function nt({
  jobId: t,
  citationsByMessageId: e,
  progressByMessageId: n,
  incompleteByMessageId: s,
  streamingAssistantId: a,
  isRunning: r,
  branchBusy: o,
  onJumpCitation: l,
  onBranchFromAnswer: p
}) {
  return /* @__PURE__ */ i("div", { className: "aui-message-group", "data-slot": "aui_message-group", children: /* @__PURE__ */ i(se.Messages, { children: ({ message: c }) => {
    var w;
    if (c.role === "user") return /* @__PURE__ */ i(on, { message: c });
    if (c.role !== "assistant") return null;
    const I = ((w = c.status) == null ? void 0 : w.type) === "running" || r && a === c.id;
    return /* @__PURE__ */ i(
      cn,
      {
        jobId: t,
        message: c,
        citations: e[c.id] || [],
        progress: n[c.id] || "",
        incompleteReason: s[c.id] || "",
        streaming: I,
        branchBusy: o,
        onJumpCitation: l,
        onBranchFromAnswer: p
      }
    );
  } }) });
}
function dn({
  mode: t,
  disabled: e,
  onChange: n
}) {
  return /* @__PURE__ */ x("div", { className: "aui-assistant-mode", role: "group", "aria-label": "AI 模式", children: [
    /* @__PURE__ */ x(
      "button",
      {
        type: "button",
        className: t !== "operations" ? "is-active" : "",
        "aria-pressed": t !== "operations",
        disabled: e,
        onClick: () => n == null ? void 0 : n("reading"),
        children: [
          /* @__PURE__ */ i(Ge, { size: 12, strokeWidth: 2.2, "aria-hidden": !0 }),
          /* @__PURE__ */ i("span", { children: "阅读问答" })
        ]
      }
    ),
    /* @__PURE__ */ x(
      "button",
      {
        type: "button",
        className: t === "operations" ? "is-active" : "",
        "aria-pressed": t === "operations",
        disabled: e,
        onClick: () => n == null ? void 0 : n("operations"),
        children: [
          /* @__PURE__ */ i(ge, { size: 12, strokeWidth: 2.2, "aria-hidden": !0 }),
          /* @__PURE__ */ i("span", { children: "PDF Agent" })
        ]
      }
    )
  ] });
}
function ln({
  selectionContext: t,
  onClear: e
}) {
  if (!t) return null;
  const n = t.selectionType === "text" ? "text" : t.kind, s = t.selectionType === "text" ? t.quote : Ze(t.region, t.pane), a = n === "formula" ? "公式" : n === "table" ? "表格" : n === "figure" ? "图片" : "文字";
  return /* @__PURE__ */ x("div", { className: "aui-selection-context", "data-reader-ai-selection-context": "", children: [
    /* @__PURE__ */ i(n === "formula" ? He : n === "table" ? wt : n === "figure" ? vt : It, { size: 14, strokeWidth: 2.1, "aria-hidden": !0 }),
    /* @__PURE__ */ x("span", { className: "aui-selection-context-meta", children: [
      t.pane === "translated" ? "译文" : "原文",
      " · ",
      t.page,
      " 页 · ",
      a
    ] }),
    /* @__PURE__ */ i("span", { className: "aui-selection-context-text", children: s || "已选择此区域" }),
    /* @__PURE__ */ i(
      "button",
      {
        type: "button",
        className: "aui-selection-context-remove",
        "aria-label": "移除选区上下文",
        title: "移除选区",
        onClick: e,
        children: /* @__PURE__ */ i(Re, { size: 13, strokeWidth: 2.4, "aria-hidden": !0 })
      }
    )
  ] });
}
function rt({
  isRunning: t,
  branchBusy: e,
  mode: n,
  onModeChange: s,
  selectionContext: a,
  onClearSelectionContext: r
}) {
  return /* @__PURE__ */ x(we.Root, { className: "aui-composer", "data-reader-ai-composer": "", children: [
    /* @__PURE__ */ x("div", { className: "aui-composer-shell", children: [
      n !== "operations" ? /* @__PURE__ */ i(ln, { selectionContext: a, onClear: r }) : null,
      /* @__PURE__ */ i(
        we.Input,
        {
          className: "aui-input",
          rows: 1,
          placeholder: n === "operations" ? "描述要执行的 PDF 操作…" : "询问当前文档…",
          "aria-label": n === "operations" ? "描述 PDF 操作" : "向文档 AI 提问",
          autoFocus: !0,
          enterKeyHint: "send",
          disabled: e,
          submitMode: "enter"
        }
      ),
      /* @__PURE__ */ x("div", { className: "aui-composer-toolbar", children: [
        /* @__PURE__ */ i(dn, { mode: n, disabled: t || e, onChange: s }),
        /* @__PURE__ */ i("div", { className: "aui-composer-actions", children: t ? /* @__PURE__ */ i(we.Cancel, { className: "aui-send aui-send-stop", "aria-label": "停止生成", children: /* @__PURE__ */ i(mt, { size: 12, strokeWidth: 2.6, "aria-hidden": !0 }) }) : /* @__PURE__ */ i(we.Send, { className: "aui-send", "aria-label": "发送", children: /* @__PURE__ */ i(ft, { size: 16, strokeWidth: 2.5, "aria-hidden": !0 }) }) })
      ] })
    ] }),
    /* @__PURE__ */ i("p", { className: "aui-hint", children: "AI 可能会出错，请核对原文与引用" })
  ] });
}
function st() {
  return /* @__PURE__ */ x("div", { className: "aui-composer aui-composer-locked", role: "alert", children: [
    /* @__PURE__ */ i("p", { className: "aui-llm-lock-msg", children: Bt }),
    /* @__PURE__ */ i("p", { className: "aui-hint", children: "请到首页「设置 → API 设置」填写模型 Key 后即可提问" })
  ] });
}
const un = [
  { prompt: "把第 1 页旋转 90 度。", label: "旋转页面", icon: Se },
  { prompt: "删除最后一页。", label: "删除页面", icon: Se }
];
function pn({
  jobId: t,
  empty: e,
  citationsByMessageId: n,
  progressByMessageId: s,
  incompleteByMessageId: a,
  streamingAssistantId: r,
  isRunning: o,
  missingLlmKey: l,
  branchBusy: p,
  agentRequestBlocked: c = !1,
  agentOperationPanel: I,
  onModeChange: w,
  onJumpCitation: C,
  onBranchFromAnswer: m
}) {
  const u = p || c;
  return /* @__PURE__ */ x(be, { children: [
    e ? /* @__PURE__ */ x("div", { className: "aui-empty", children: [
      /* @__PURE__ */ i("div", { className: "aui-empty-mascot", "aria-hidden": !0, children: /* @__PURE__ */ i("span", { className: "aui-empty-mascot-face", children: /* @__PURE__ */ i(ge, { size: 21, strokeWidth: 1.9 }) }) }),
      /* @__PURE__ */ i("h2", { className: "aui-empty-title", children: "想怎样处理 PDF？" }),
      /* @__PURE__ */ i("p", { className: "aui-empty-sub", children: "创建候选版本后由你预览和确认" }),
      /* @__PURE__ */ i("div", { className: "aui-suggestions", role: "group", "aria-label": "推荐问题", children: un.map((E) => {
        const P = E.icon;
        return /* @__PURE__ */ x(
          se.Suggestion,
          {
            prompt: E.prompt,
            send: !0,
            type: "button",
            className: "aui-suggestion",
            disabled: u || l,
            children: [
              /* @__PURE__ */ i(P, { size: 14, strokeWidth: 2, "aria-hidden": !0, className: "aui-suggestion-icon" }),
              /* @__PURE__ */ i("span", { className: "aui-suggestion-label", children: E.label })
            ]
          },
          E.prompt
        );
      }) })
    ] }) : null,
    /* @__PURE__ */ i(
      nt,
      {
        jobId: t,
        citationsByMessageId: n,
        progressByMessageId: s,
        incompleteByMessageId: a,
        streamingAssistantId: r,
        isRunning: o,
        branchBusy: p,
        onJumpCitation: C,
        onBranchFromAnswer: m
      }
    ),
    I,
    /* @__PURE__ */ x(se.ViewportFooter, { className: "aui-thread-viewport-footer", children: [
      !e && !p ? /* @__PURE__ */ i(
        se.ScrollToBottom,
        {
          className: "aui-scroll-bottom-btn aui-scroll-bottom",
          "aria-label": "滚到最新",
          children: /* @__PURE__ */ i(Ve, { size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
        }
      ) : null,
      l ? /* @__PURE__ */ i(st, {}) : /* @__PURE__ */ i(
        rt,
        {
          isRunning: o,
          branchBusy: u,
          mode: "operations",
          onModeChange: w,
          selectionContext: null,
          onClearSelectionContext: void 0
        }
      )
    ] })
  ] });
}
function mn() {
  const t = Ot(), e = (n) => {
    var o, l, p;
    n.preventDefault();
    const s = `${((o = globalThis.getSelection) == null ? void 0 : o.call(globalThis)) || ""}`.trim();
    if (!s) return;
    const a = Kt(s);
    if (!a) return;
    const r = t.thread.composer();
    r.setText(Wt(r.getState().text || "", a));
    try {
      (p = (l = globalThis.getSelection) == null ? void 0 : l.call(globalThis)) == null || p.removeAllRanges();
    } catch {
    }
  };
  return /* @__PURE__ */ i(Dt.Root, { className: "reader-ai-selection-toolbar", children: /* @__PURE__ */ x(
    "button",
    {
      type: "button",
      className: "reader-ai-selection-quote",
      onPointerDown: e,
      title: "引用这段话继续提问",
      children: [
        /* @__PURE__ */ i(bt, { size: 12, strokeWidth: 2.4, "aria-hidden": !0 }),
        /* @__PURE__ */ i("span", { children: "引用" })
      ]
    }
  ) });
}
const fn = [
  { prompt: "用几句话总结这篇文献的核心内容。", label: "总结本文", icon: Ge },
  { prompt: "这篇文献的主要结论是什么？", label: "提炼主要结论", icon: Rt },
  { prompt: "作者用了什么方法或模型？", label: "梳理方法与模型", icon: Ct },
  { prompt: "解释文中的关键公式。", label: "解释关键公式", icon: He }
];
function hn({
  jobId: t,
  empty: e,
  citationsByMessageId: n,
  progressByMessageId: s,
  incompleteByMessageId: a,
  streamingAssistantId: r,
  isRunning: o,
  missingLlmKey: l,
  branchBusy: p,
  composerDisabled: c = !1,
  onModeChange: I,
  onJumpCitation: w,
  onBranchFromAnswer: C,
  selectionContext: m = null,
  onClearSelectionContext: u,
  footerExtra: E = null
}) {
  return /* @__PURE__ */ x(be, { children: [
    e ? /* @__PURE__ */ x("div", { className: "aui-empty", children: [
      /* @__PURE__ */ i("div", { className: "aui-empty-mascot", "aria-hidden": !0, children: /* @__PURE__ */ i("span", { className: "aui-empty-mascot-face", children: /* @__PURE__ */ i(ge, { size: 21, strokeWidth: 1.9 }) }) }),
      /* @__PURE__ */ i("h2", { className: "aui-empty-title", children: "一起读懂这篇文档" }),
      /* @__PURE__ */ i("p", { className: "aui-empty-sub", children: "总结、解释、检索与计算，不修改 PDF" }),
      /* @__PURE__ */ i("div", { className: "aui-suggestions", role: "group", "aria-label": "推荐问题", children: fn.map((P) => {
        const _ = P.icon;
        return /* @__PURE__ */ x(
          se.Suggestion,
          {
            prompt: P.prompt,
            send: !0,
            type: "button",
            className: "aui-suggestion",
            disabled: p || c || l,
            children: [
              /* @__PURE__ */ i(_, { size: 14, strokeWidth: 2, "aria-hidden": !0, className: "aui-suggestion-icon" }),
              /* @__PURE__ */ i("span", { className: "aui-suggestion-label", children: P.label })
            ]
          },
          P.prompt
        );
      }) })
    ] }) : null,
    /* @__PURE__ */ i(mn, {}),
    /* @__PURE__ */ i(
      nt,
      {
        jobId: t,
        citationsByMessageId: n,
        progressByMessageId: s,
        incompleteByMessageId: a,
        streamingAssistantId: r,
        isRunning: o,
        branchBusy: p,
        onJumpCitation: w,
        onBranchFromAnswer: C
      }
    ),
    E,
    /* @__PURE__ */ x(se.ViewportFooter, { className: "aui-thread-viewport-footer", children: [
      !e && !p ? /* @__PURE__ */ i(
        se.ScrollToBottom,
        {
          className: "aui-scroll-bottom-btn aui-scroll-bottom",
          "aria-label": "滚到最新",
          children: /* @__PURE__ */ i(Ve, { size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
        }
      ) : null,
      l ? /* @__PURE__ */ i(st, {}) : /* @__PURE__ */ i(
        rt,
        {
          isRunning: o,
          branchBusy: p || c,
          mode: "reading",
          onModeChange: I,
          selectionContext: m,
          onClearSelectionContext: u
        }
      )
    ] })
  ] });
}
function gn({
  jobId: t,
  messages: e,
  citationsByMessageId: n,
  progressByMessageId: s,
  incompleteByMessageId: a,
  streamingAssistantId: r,
  isRunning: o,
  missingLlmKey: l,
  branchBusy: p,
  agentRequestBlocked: c = !1,
  agentOperationPanel: I,
  assistantMode: w = "reading",
  onAssistantModeChange: C,
  onJumpCitation: m,
  onBranchFromAnswer: u,
  selectionContext: E = null,
  onClearSelectionContext: P
}) {
  const _ = e.length === 0, D = w === "operations";
  return /* @__PURE__ */ i(
    se.Root,
    {
      className: `aui-thread aui-thread-root${l ? " is-llm-locked" : ""}`,
      "data-chat-ui": "assistant-ui-official-thread",
      children: /* @__PURE__ */ i(
        se.Viewport,
        {
          className: "aui-viewport",
          "data-slot": "aui_thread-viewport",
          "data-reader-ai-viewport": "true",
          turnAnchor: "top",
          autoScroll: !0,
          children: /* @__PURE__ */ i("div", { className: `aui-thread-inner${_ ? " is-empty" : ""}`, children: D ? /* @__PURE__ */ i(
            pn,
            {
              jobId: t,
              empty: _,
              citationsByMessageId: n,
              progressByMessageId: s,
              incompleteByMessageId: a,
              streamingAssistantId: r,
              isRunning: o,
              missingLlmKey: l,
              branchBusy: p,
              agentRequestBlocked: c,
              agentOperationPanel: I,
              onModeChange: C,
              onJumpCitation: m,
              onBranchFromAnswer: u
            }
          ) : /* @__PURE__ */ i(
            hn,
            {
              jobId: t,
              empty: _,
              citationsByMessageId: n,
              progressByMessageId: s,
              incompleteByMessageId: a,
              streamingAssistantId: r,
              isRunning: o,
              missingLlmKey: l,
              branchBusy: p,
              composerDisabled: c,
              onModeChange: C,
              onJumpCitation: m,
              onBranchFromAnswer: u,
              selectionContext: E,
              onClearSelectionContext: P
            }
          ) })
        }
      )
    }
  );
}
const at = "retainpdf.reader-agent-operation.dismissed.v1", yn = /* @__PURE__ */ new Set(["failed", "cancelled"]);
function Be(t) {
  return [
    `${t.operation_id || ""}`.trim(),
    Number(t.current_attempt) || 0,
    `${t.status || ""}`
  ].join(":");
}
function wn() {
  var t;
  try {
    const e = JSON.parse(((t = globalThis.localStorage) == null ? void 0 : t.getItem(at)) || "[]");
    return new Set(Array.isArray(e) ? e.filter((n) => typeof n == "string") : []);
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function vn(t) {
  var e;
  try {
    (e = globalThis.localStorage) == null || e.setItem(
      at,
      JSON.stringify(Array.from(t).slice(-100))
    );
  } catch {
  }
}
function it(t, e) {
  switch (t) {
    case "draft":
    case "awaiting_confirmation":
      return e === "green_light" ? "等待自动执行" : "等待确认";
    case "queued":
      return "等待执行";
    case "running":
      return "正在执行";
    case "validating":
      return "正在验证";
    case "result_ready":
      return e === "green_light" ? "等待自动应用" : "候选已就绪";
    case "committed":
      return e === "green_light" ? "AI 已直接应用" : "已应用";
    case "failed":
      return "执行失败";
    case "cancelled":
      return "已取消";
    case "ambiguous":
      return "结果不确定";
    default:
      return `${t}`;
  }
}
function In(t) {
  switch (t) {
    case "draft":
    case "awaiting_confirmation":
      return [
        { action: "cancel", label: "拒绝" },
        { action: "run", label: "确认执行", primary: !0 }
      ];
    case "queued":
    case "running":
    case "validating":
      return [{ action: "cancel", label: "取消 PDF 操作", danger: !0 }];
    case "result_ready":
      return [
        { action: "cancel", label: "拒绝候选" },
        { action: "commit", label: "接受并应用", primary: !0 }
      ];
    case "failed":
      return [{ action: "retry", label: "重试", primary: !0 }];
    case "ambiguous":
      return [{ action: "retry", label: "确认风险并重试", danger: !0, risk: !0 }];
    default:
      return [];
  }
}
function bn(t) {
  return t === "failed" || t === "ambiguous" ? Qe : t === "cancelled" ? Re : t === "committed" || t === "result_ready" ? Je : ["queued", "running", "validating"].includes(t) ? Ce : St;
}
function Rn({ events: t, mode: e }) {
  return /* @__PURE__ */ i("ol", { className: "reader-agent-operation-timeline", "aria-label": "PDF 操作步骤", children: t.map((n) => {
    const s = bn(n.status), a = ["queued", "running", "validating"].includes(n.status);
    return /* @__PURE__ */ x("li", { children: [
      /* @__PURE__ */ i(s, { className: a ? "is-spinning" : "", size: 12, "aria-hidden": !0 }),
      /* @__PURE__ */ i("span", { children: n.summary || n.event || it(n.status, e) }),
      /* @__PURE__ */ i("time", { children: n.ts ? new Date(n.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "" })
    ] }, `${n.attempt}:${n.seq}`);
  }) });
}
function Cn({
  operation: t,
  loadCandidate: e
}) {
  const [n, s] = W(!1), [a, r] = W(""), [o, l] = W(""), p = B("");
  return U(() => {
    let c = !1;
    return l(""), e(t).then((I) => {
      if (c) return;
      const w = URL.createObjectURL(I);
      p.current && URL.revokeObjectURL(p.current), p.current = w, r(w);
    }).catch(() => {
      c || l("候选 PDF 加载失败，请重试。");
    }), () => {
      c = !0;
    };
  }, [e, t.operation_id, t.current_attempt]), U(() => () => {
    p.current && URL.revokeObjectURL(p.current);
  }, []), /* @__PURE__ */ x(be, { children: [
    /* @__PURE__ */ x("div", { className: "reader-agent-operation-candidate", children: [
      /* @__PURE__ */ x("div", { children: [
        /* @__PURE__ */ i(Se, { size: 13, "aria-hidden": !0 }),
        /* @__PURE__ */ i("span", { children: "候选 PDF" })
      ] }),
      /* @__PURE__ */ i("button", { type: "button", disabled: !a, onClick: () => s((c) => !c), children: a ? n ? "收起" : "预览" : "加载中…" }),
      /* @__PURE__ */ i(
        "button",
        {
          type: "button",
          disabled: !a,
          "aria-label": "新窗口打开候选 PDF",
          onClick: () => window.open(a, "_blank", "noopener,noreferrer"),
          children: /* @__PURE__ */ i(kt, { size: 12, "aria-hidden": !0 })
        }
      )
    ] }),
    n ? /* @__PURE__ */ i("iframe", { className: "reader-agent-operation-preview", src: a, title: "候选 PDF 预览" }) : null,
    o ? /* @__PURE__ */ i("p", { className: "reader-agent-operation-error", role: "alert", children: o }) : null
  ] });
}
function Nn({
  entry: t,
  mode: e,
  loadCandidate: n,
  onAction: s,
  onDismiss: a
}) {
  var P;
  const { operation: r, pendingAction: o, error: l } = t, [p, c] = W(!1), [I, w] = W(!1), C = r.events || [], m = In(r.status), u = !!((r.status === "result_ready" || r.status === "committed") && r.candidate_available), E = yn.has(r.status);
  return /* @__PURE__ */ x("article", { className: `reader-agent-operation-card is-${r.status}`, "data-operation-id": r.operation_id, children: [
    /* @__PURE__ */ x("header", { children: [
      /* @__PURE__ */ i("span", { className: "reader-agent-operation-icon", "aria-hidden": !0, children: /* @__PURE__ */ i(Mt, { size: 15 }) }),
      /* @__PURE__ */ x("div", { className: "reader-agent-operation-title", children: [
        /* @__PURE__ */ i("span", { children: "PDF 操作" }),
        /* @__PURE__ */ i("strong", { children: r.intent_summary || "处理当前 PDF" })
      ] }),
      /* @__PURE__ */ x("div", { className: "reader-agent-operation-head-actions", children: [
        /* @__PURE__ */ i("span", { className: "reader-agent-operation-status", children: it(r.status, e) }),
        E ? /* @__PURE__ */ i(
          "button",
          {
            type: "button",
            className: "reader-agent-operation-dismiss",
            "aria-label": r.status === "failed" ? "隐藏这条失败提示" : "隐藏这条已取消提示",
            title: "隐藏",
            onClick: () => a(r),
            children: /* @__PURE__ */ i(Re, { size: 13, "aria-hidden": !0 })
          }
        ) : null
      ] })
    ] }),
    (P = r.affected_pages) != null && P.length ? /* @__PURE__ */ x("p", { className: "reader-agent-operation-scope", children: [
      "影响页码：",
      r.affected_pages.join("、")
    ] }) : null,
    C.length ? /* @__PURE__ */ x("div", { className: "reader-agent-operation-details", children: [
      /* @__PURE__ */ x("button", { type: "button", onClick: () => c((_) => !_), children: [
        p ? /* @__PURE__ */ i(_t, { size: 12, "aria-hidden": !0 }) : /* @__PURE__ */ i(Ye, { size: 12, "aria-hidden": !0 }),
        p ? "收起步骤" : `执行步骤 ${C.length}`
      ] }),
      p ? /* @__PURE__ */ i(Rn, { events: C, mode: e }) : null
    ] }) : null,
    u ? /* @__PURE__ */ i(Cn, { operation: r, loadCandidate: n }) : null,
    l ? /* @__PURE__ */ i("p", { className: "reader-agent-operation-error", role: "alert", children: l }) : null,
    I ? /* @__PURE__ */ x("div", { className: "reader-agent-operation-risk", role: "alertdialog", "aria-label": "确认重复执行风险", children: [
      /* @__PURE__ */ i(Qe, { size: 14, "aria-hidden": !0 }),
      /* @__PURE__ */ i("p", { children: "上一次执行结果不确定，重试可能重复操作。确认接受风险后再继续。" }),
      /* @__PURE__ */ x("div", { children: [
        /* @__PURE__ */ i("button", { type: "button", onClick: () => w(!1), disabled: !!o, children: "返回" }),
        /* @__PURE__ */ i(
          "button",
          {
            type: "button",
            className: "is-danger",
            disabled: !!o,
            onClick: async () => {
              await s("retry", r, { acceptDuplicateRisk: !0 }), w(!1);
            },
            children: o === "retry" ? "处理中…" : "接受风险并重试"
          }
        )
      ] })
    ] }) : m.length ? /* @__PURE__ */ i("div", { className: "reader-agent-operation-actions", children: m.map((_) => /* @__PURE__ */ i(
      "button",
      {
        type: "button",
        className: _.primary ? "is-primary" : _.danger ? "is-danger" : "",
        disabled: !!o,
        onClick: () => {
          _.risk ? w(!0) : s(_.action, r);
        },
        children: o === _.action ? "处理中…" : _.label
      },
      _.action
    )) }) : null
  ] });
}
function Mn({
  entries: t,
  confirmationMode: e,
  runtimeRestarting: n,
  loadCandidate: s,
  onAction: a
}) {
  const [r, o] = W(wn), l = t.filter((c) => !r.has(Be(c.operation)));
  function p(c) {
    const I = Be(c);
    o((w) => {
      const C = new Set(w);
      return C.add(I), vn(C), C;
    });
  }
  return /* @__PURE__ */ x("section", { className: `reader-agent-operations${l.length ? " has-operations" : ""}`, "aria-label": "AI PDF 操作", children: [
    /* @__PURE__ */ x("div", { className: `reader-agent-mode${e === "green_light" ? " is-green" : ""}`, children: [
      /* @__PURE__ */ i(Nt, { size: 13, "aria-hidden": !0 }),
      /* @__PURE__ */ i("span", { children: e === "green_light" ? "绿灯模式 · 自动执行并应用" : "需要确认 · 操作前等待授权" })
    ] }),
    n ? /* @__PURE__ */ x("div", { className: "reader-agent-restarting", role: "status", children: [
      /* @__PURE__ */ i(Ce, { className: "is-spinning", size: 13, "aria-hidden": !0 }),
      "正在重启 Agent，新请求暂不可用"
    ] }) : null,
    l.map((c) => /* @__PURE__ */ i(
      Nn,
      {
        entry: c,
        mode: e,
        loadCandidate: s,
        onAction: a,
        onDismiss: p
      },
      c.operation.operation_id
    ))
  ] });
}
const _n = (t) => t, kn = Object.freeze([]), Sn = Object.freeze({}), Le = Object.freeze({}), An = Object.freeze({
  entries: [],
  confirmationMode: "explicit",
  runtimeRestarting: !1,
  runtimeCredentialConfigured: !1,
  perform: async () => {
  },
  loadCandidate: async () => new Blob()
});
function $n(t) {
  return t.content.filter((e) => e.type === "text").map((e) => e.text).join(`
`).trim();
}
function Tn(t, e, n) {
  var s, a, r, o;
  return ((s = t.status) == null ? void 0 : s.type) === "running" || n && e === t.id ? { type: "running" } : ((a = t.status) == null ? void 0 : a.type) === "incomplete" || ((r = t.status) == null ? void 0 : r.type) === "error" ? {
    type: "incomplete",
    reason: ((o = t.status) == null ? void 0 : o.reason) === "cancelled" ? "cancelled" : "error"
  } : { type: "complete", reason: "stop" };
}
function xn({
  jobId: t = "",
  messages: e = kn,
  citationsByMessageId: n = Sn,
  progressByMessageId: s = Le,
  contentByMessageId: a = Le,
  streamingAssistantId: r = "",
  isRunning: o = !1,
  onSubmit: l,
  onRetry: p,
  onCancel: c,
  onJumpCitation: I,
  onBranchFromAnswer: w,
  branchBusy: C = !1,
  agentOperations: m = An,
  assistantMode: u = "reading",
  onAssistantModeChange: E,
  selectionContext: P = null,
  onClearSelectionContext: _
}) {
  const [, D] = W(0);
  U(() => {
    const h = () => D((k) => k + 1);
    return window.addEventListener("focus", h), window.addEventListener("storage", h), document.addEventListener(Fe, h), () => {
      window.removeEventListener("focus", h), window.removeEventListener("storage", h), document.removeEventListener(Fe, h);
    };
  }, []);
  const T = !Lt() && !m.runtimeCredentialConfigured, b = Q(() => e.map((h) => ({
    id: h.id,
    role: h.role,
    content: a[h.id] || h.content || "",
    ...h.role === "assistant" ? { status: Tn(h, r, o) } : {}
  })), [a, o, e, r]), O = Q(() => {
    var k, f;
    const h = {};
    for (const N of e) {
      if (N.role !== "assistant") continue;
      const A = `${((k = N.status) == null ? void 0 : k.reason) || ""}`.trim();
      ((f = N.status) == null ? void 0 : f.type) === "incomplete" && A && A !== "cancelled" && (h[N.id] = A);
    }
    return h;
  }, [e]), y = H(async (h) => {
    const k = h ? Math.max(0, e.findIndex((N) => N.id === h) + 1) : 0, f = e.slice(k).find((N) => N.role === "assistant");
    f && await p(f.id);
  }, [e, p]), g = H(async (h) => {
    const k = $n(h);
    !k || o || C || m.runtimeRestarting || T || await l(k);
  }, [m.runtimeRestarting, C, o, T, l]), R = H(async () => {
    await c();
  }, [c]), S = Q(() => ({
    messages: b,
    isRunning: o,
    isDisabled: C || m.runtimeRestarting || T,
    convertMessage: _n,
    onNew: g,
    onReload: y,
    onCancel: R
  }), [
    m.runtimeRestarting,
    C,
    R,
    g,
    o,
    T,
    y,
    b
  ]), v = Ft(S);
  return /* @__PURE__ */ i(zt, { runtime: v, children: /* @__PURE__ */ i(
    gn,
    {
      jobId: t,
      messages: e,
      citationsByMessageId: n,
      progressByMessageId: s,
      incompleteByMessageId: O,
      streamingAssistantId: r,
      isRunning: o,
      missingLlmKey: T,
      branchBusy: C,
      agentRequestBlocked: m.runtimeRestarting,
      assistantMode: u,
      onAssistantModeChange: E,
      selectionContext: P,
      onClearSelectionContext: _,
      agentOperationPanel: m.entries.length > 0 || m.runtimeRestarting ? /* @__PURE__ */ i(
        Mn,
        {
          entries: m.entries,
          confirmationMode: m.confirmationMode,
          runtimeRestarting: m.runtimeRestarting,
          loadCandidate: m.loadCandidate,
          onAction: m.perform
        }
      ) : null,
      onJumpCitation: I,
      onBranchFromAnswer: w
    }
  ) });
}
function ve(t = 900, e = 0) {
  ue(t, { overlayDelayMs: e }), oe(t);
}
function En({
  sessions: t,
  activeId: e,
  busy: n = !1,
  disabled: s = !1,
  errorText: a = "",
  onSwitch: r,
  onNew: o,
  onDelete: l,
  onRename: p
}) {
  const c = t.length > 0, I = n || s, [w, C] = W(!1), [m, u] = W(""), [E, P] = W(""), _ = B(null), D = pt();
  function T(f) {
    const N = `${f || ""}`.match(/^fork-(\d+)-(.*)$/i);
    if (!N) return f;
    const A = N[2].trim();
    return A ? `${A} · 分支${N[1]}` : `分支${N[1]}`;
  }
  const b = B(!1), O = B(null), y = t.find((f) => f.id === e) || null, g = y ? y.messageCount ? T(y.title) : `${T(y.title)}（空）` : c ? "选择以往对话" : "新对话";
  U(() => {
    if (!w) {
      u("");
      return;
    }
    const f = ($) => {
      if (b.current) return;
      const d = _.current;
      d && ($.target instanceof Node && d.contains($.target) || (C(!1), u("")));
    }, N = ($) => {
      $.key === "Escape" && (C(!1), u(""));
    }, A = window.setTimeout(() => {
      document.addEventListener("pointerdown", f, !0);
    }, 0);
    return document.addEventListener("keydown", N), () => {
      window.clearTimeout(A), document.removeEventListener("pointerdown", f, !0), document.removeEventListener("keydown", N);
    };
  }, [w]), U(() => {
    if (!m) return;
    const f = O.current;
    f && (f.focus(), f.select());
  }, [m]);
  const R = (f) => {
    const N = `${f || ""}`.trim();
    !N || I || b.current || m || (b.current = !0, ve(1e3, 0), requestAnimationFrame(() => {
      C(!1), window.setTimeout(() => {
        (async () => {
          try {
            await r(N);
          } finally {
            ve(400, 0), b.current = !1;
          }
        })();
      }, 40);
    }));
  }, S = (f) => {
    I || (u(f.id), P(f.title || ""));
  }, v = () => {
    const f = m, N = E;
    u(""), f && p(f, N);
  }, h = () => {
    u(""), P("");
  }, k = (f) => {
    var $;
    if (I || b.current) return;
    const N = f.title || "未命名对话";
    ($ = globalThis.confirm) != null && $.call(globalThis, `确定删除对话「${N}」？此操作不可恢复。`) && (b.current = !0, ve(800, 0), (async () => {
      try {
        await l(f.id);
      } finally {
        b.current = !1;
      }
    })());
  };
  return /* @__PURE__ */ x(
    "div",
    {
      className: "aui-session-bar",
      "data-reader-ai-sessions": "",
      ref: _,
      onPointerDown: (f) => {
        f.stopPropagation();
      },
      onClick: (f) => {
        f.stopPropagation();
      },
      children: [
        /* @__PURE__ */ x("div", { className: "aui-session-row", children: [
          /* @__PURE__ */ x(
            "button",
            {
              type: "button",
              className: `aui-session-trigger${w ? " is-open" : ""}`,
              "aria-label": "切换对话窗口",
              "aria-haspopup": "listbox",
              "aria-expanded": w,
              "aria-controls": D,
              disabled: I || !c,
              title: g,
              onClick: () => {
                I || !c || C((f) => !f);
              },
              children: [
                /* @__PURE__ */ i("span", { className: "aui-session-trigger-label", children: g }),
                /* @__PURE__ */ i(Ye, { size: 14, strokeWidth: 2.4, "aria-hidden": !0 })
              ]
            }
          ),
          /* @__PURE__ */ x(
            "button",
            {
              type: "button",
              className: "aui-session-btn",
              disabled: I,
              title: "新对话窗口",
              "aria-label": "新对话",
              onClick: () => {
                I || b.current || (b.current = !0, ve(800), C(!1), u(""), window.setTimeout(() => {
                  (async () => {
                    try {
                      await o();
                    } finally {
                      b.current = !1;
                    }
                  })();
                }, 40));
              },
              children: [
                n ? /* @__PURE__ */ i(Ce, { className: "aui-spin", size: 14, strokeWidth: 2.4, "aria-hidden": !0 }) : /* @__PURE__ */ i(At, { size: 14, strokeWidth: 2.4, "aria-hidden": !0 }),
                /* @__PURE__ */ i("span", { children: "新对话" })
              ]
            }
          )
        ] }),
        w && c ? /* @__PURE__ */ i(
          "ul",
          {
            id: D,
            className: "aui-session-list",
            role: "listbox",
            "aria-label": "以往对话",
            children: t.map((f) => {
              const N = f.messageCount ? T(f.title) : `${T(f.title)}（空）`, A = f.id === e, $ = m === f.id;
              return /* @__PURE__ */ i("li", { className: "aui-session-row-item", role: "presentation", children: $ ? /* @__PURE__ */ x("div", { className: "aui-session-edit", children: [
                /* @__PURE__ */ i(
                  "input",
                  {
                    ref: O,
                    className: "aui-session-edit-input",
                    value: E,
                    maxLength: 80,
                    "aria-label": "对话标题",
                    disabled: I,
                    onChange: (d) => P(d.target.value),
                    onKeyDown: (d) => {
                      d.key === "Enter" ? (d.preventDefault(), v()) : d.key === "Escape" && (d.preventDefault(), h());
                    },
                    onClick: (d) => d.stopPropagation()
                  }
                ),
                /* @__PURE__ */ i(
                  "button",
                  {
                    type: "button",
                    className: "aui-session-icon-btn",
                    "aria-label": "保存标题",
                    title: "保存",
                    disabled: I || !E.trim(),
                    onClick: (d) => {
                      d.stopPropagation(), v();
                    },
                    children: /* @__PURE__ */ i(Je, { size: 13, strokeWidth: 2.5, "aria-hidden": !0 })
                  }
                ),
                /* @__PURE__ */ i(
                  "button",
                  {
                    type: "button",
                    className: "aui-session-icon-btn",
                    "aria-label": "取消重命名",
                    title: "取消",
                    disabled: I,
                    onClick: (d) => {
                      d.stopPropagation(), h();
                    },
                    children: /* @__PURE__ */ i(Re, { size: 13, strokeWidth: 2.5, "aria-hidden": !0 })
                  }
                )
              ] }) : /* @__PURE__ */ x(be, { children: [
                /* @__PURE__ */ x(
                  "button",
                  {
                    type: "button",
                    role: "option",
                    "aria-selected": A,
                    className: `aui-session-item${A ? " is-active" : ""}`,
                    disabled: I,
                    title: N,
                    onPointerDown: (d) => {
                      d.stopPropagation(), !A && !I && oe(1e3);
                    },
                    onClick: (d) => {
                      if (d.preventDefault(), d.stopPropagation(), A) {
                        C(!1);
                        return;
                      }
                      R(f.id);
                    },
                    children: [
                      /* @__PURE__ */ i("span", { className: "aui-session-item-title", children: N }),
                      A ? /* @__PURE__ */ i("span", { className: "aui-session-item-badge", children: "当前" }) : null
                    ]
                  }
                ),
                /* @__PURE__ */ i(
                  "button",
                  {
                    type: "button",
                    className: "aui-session-icon-btn",
                    "aria-label": `重命名 ${N}`,
                    title: "重命名",
                    disabled: I,
                    onClick: (d) => {
                      d.preventDefault(), d.stopPropagation(), S(f);
                    },
                    children: /* @__PURE__ */ i($t, { size: 13, strokeWidth: 2.4, "aria-hidden": !0 })
                  }
                ),
                /* @__PURE__ */ i(
                  "button",
                  {
                    type: "button",
                    className: "aui-session-icon-btn is-danger",
                    "aria-label": `删除 ${N}`,
                    title: "删除",
                    disabled: I,
                    onClick: (d) => {
                      d.preventDefault(), d.stopPropagation(), k(f);
                    },
                    children: /* @__PURE__ */ i(Tt, { size: 13, strokeWidth: 2.4, "aria-hidden": !0 })
                  }
                )
              ] }) }, f.id);
            })
          }
        ) : null,
        a ? /* @__PURE__ */ i("div", { className: "aui-session-error", role: "alert", children: a }) : null
      ]
    }
  );
}
function ot(t) {
  return ((t == null ? void 0 : t.parts) || []).filter((e) => e.type === "text").map((e) => e.text).join("").trim();
}
function Pn(t, e) {
  const n = `${e.question || ""}`.trim();
  if (n) return n;
  for (let s = t.length - 1; s >= 0; s -= 1) {
    const a = t[s];
    if (a.role !== "user") continue;
    const r = ot(a);
    if (r) return r;
  }
  return "";
}
function On(t) {
  const e = Number(t == null ? void 0 : t.status) || 0, n = `${(t == null ? void 0 : t.message) || ""}`;
  return e === 502 || /\b502\b/.test(n);
}
class Dn {
  constructor(e) {
    this.options = e;
  }
  async sendMessages({
    abortSignal: e,
    body: n,
    messages: s,
    trigger: a
  }) {
    var P, _, D, T;
    const r = n || {}, o = Pn(s, r);
    if (!o) throw new Error("请输入问题。");
    const l = r.assistantMode || ((_ = (P = this.options).getAssistantMode) == null ? void 0 : _.call(P)) || "reading", p = r.scope || "document", c = r.context ? { ...r.context } : null, I = `${r.assistantMessageId || ""}`.trim() || `a-${Date.now().toString(36)}`, w = `${I}-text`, C = this.options.getRemoteAnswerer(), m = ((T = (D = this.options).getLocalAnswerer) == null ? void 0 : T.call(D)) || null;
    if (!C && !m)
      throw new Error("问答暂不可用：请确认已打开任务阅读器。");
    let u = !1;
    const E = /* @__PURE__ */ new Set();
    return new ReadableStream({
      cancel: () => {
        u = !0;
      },
      start: (b) => {
        let O = "", y = {
          citations: [],
          progress: a === "regenerate-message" ? "正在重新生成…" : "正在检索文档…",
          status: "running"
        };
        const g = (S) => {
          if (!u)
            try {
              b.enqueue(S);
            } catch {
              u = !0;
            }
        }, R = (S) => {
          y = { ...y, ...S }, g({ type: "message-metadata", messageMetadata: y });
        };
        g({ type: "start", messageId: I, messageMetadata: y }), g({ type: "start-step" }), g({ type: "text-start", id: w }), (async () => {
          var S, v, h, k, f, N;
          try {
            if (await ((S = C == null ? void 0 : C.ensureLoaded) == null ? void 0 : S.call(C, this.options.jobId)), e != null && e.aborted) throw new Error("aborted");
            let A = C || m, $ = !1, d;
            try {
              d = await A.answer({
                question: o,
                assistantMode: l,
                scope: p,
                context: c,
                parentId: `${r.parentId || ""}`.trim(),
                regenerate: r.regenerate ?? a === "regenerate-message",
                userMessageId: `${r.userMessageId || ""}`.trim(),
                assistantMessageId: I,
                onAgentSessionEvent: (M) => {
                  var X, te, re;
                  const z = (X = M == null ? void 0 : M.capabilities) == null ? void 0 : X.document_operation_confirmation_mode;
                  (z === "explicit" || z === "green_light") && ((re = (te = this.options).onConfirmationMode) == null || re.call(te, z));
                },
                onAgentOperationEvent: (M) => {
                  var X, te;
                  const z = `${(M == null ? void 0 : M.operation_id) || ""}`.trim();
                  z && ((te = (X = this.options).onAgentOperationSignal) == null || te.call(X, {
                    operationId: z,
                    conversationId: `${(M == null ? void 0 : M.conversation_id) || ""}`.trim() || void 0
                  }));
                },
                onAgentConfirmationRequiredEvent: (M) => {
                  var ae, Z;
                  const z = `${(M == null ? void 0 : M.operation_id) || ""}`.trim();
                  if (!z) return;
                  const X = `${(M == null ? void 0 : M.action) || ""}`, te = `${(M == null ? void 0 : M.current_attempt) ?? ""}`, re = `${z}:${te}:${X}`;
                  E.has(re) || (E.add(re), (Z = (ae = this.options).onAgentOperationSignal) == null || Z.call(ae, { operationId: z }));
                },
                onToolEvent: (M) => {
                  if (O || e != null && e.aborted) return;
                  const z = Yt(M);
                  z && R({ progress: z });
                },
                onProgressEvent: (M) => {
                  if (O || e != null && e.aborted) return;
                  const z = `${(M == null ? void 0 : M.message) || ""}`.trim();
                  z && R({ progress: z });
                },
                onAnswerDelta: (M, z) => {
                  !z || e != null && e.aborted || (O += z, y.progress && R({ progress: "" }), g({ type: "text-delta", id: w, delta: z }));
                },
                onCompress: (M) => {
                  if (O || e != null && e.aborted) return;
                  const z = Number(M == null ? void 0 : M.dropped_turns) || 0;
                  z && R({ progress: `已压缩 ${z} 轮早期对话` });
                },
                signal: e
              });
            } catch (M) {
              if (e != null && e.aborted || l === "operations" || !C || !m || !On(M)) throw M;
              if ($ = !0, R({ progress: "在线服务暂不可用，改用本地检索…" }), await ((v = m.ensureLoaded) == null ? void 0 : v.call(m, this.options.jobId)), e != null && e.aborted) throw new Error("aborted");
              A = m, d = await A.answer({
                question: o,
                assistantMode: l,
                scope: p,
                context: c,
                signal: e
              });
            }
            if (e != null && e.aborted) {
              R({ progress: "", status: "cancelled", statusText: "已取消" }), g({ type: "abort", reason: "cancelled" });
              return;
            }
            const q = d == null ? void 0 : d.confirmationMode;
            (q === "explicit" || q === "green_light") && ((k = (h = this.options).onConfirmationMode) == null || k.call(h, q));
            const G = `${(d == null ? void 0 : d.conversationId) || ""}`.trim() || void 0, F = /* @__PURE__ */ new Set();
            for (const M of (d == null ? void 0 : d.operationRefs) || []) {
              const z = typeof M == "string" ? M : `${(M == null ? void 0 : M.operation_id) || ""}`;
              z.trim() && F.add(z.trim());
            }
            for (const M of (d == null ? void 0 : d.confirmationRequests) || []) {
              const z = `${(M == null ? void 0 : M.operation_id) || ""}`.trim();
              z && F.add(z);
            }
            for (const M of F)
              (N = (f = this.options).onAgentOperationSignal) == null || N.call(f, {
                operationId: M,
                conversationId: G,
                confirmationMode: q || void 0
              });
            const L = jt(d == null ? void 0 : d.citations);
            let V = Ut(
              `${(d == null ? void 0 : d.answer) || O || ""}`.trim() || "没有找到可用回答。",
              L
            );
            if ($ && (V += `

_在线服务暂不可用，以上来自本地文档检索。_`), (d == null ? void 0 : d.persisted) === !1 && (V += `

_⚠️ 本轮回答未能写入历史记录（存储暂时不可用），刷新后可能丢失。_`), !O)
              g({ type: "text-delta", id: w, delta: V });
            else if (V.startsWith(O)) {
              const M = V.slice(O.length);
              M && g({ type: "text-delta", id: w, delta: M });
            }
            g({ type: "text-end", id: w }), R({
              citations: L,
              persisted: (d == null ? void 0 : d.persisted) !== !1,
              progress: "",
              status: "complete",
              incompleteReason: `${(d == null ? void 0 : d.incompleteReason) || ""}`.trim()
            }), g({ type: "finish-step" }), g({ type: "finish", finishReason: "stop", messageMetadata: y });
          } catch (A) {
            if (e != null && e.aborted)
              R({ progress: "", status: "cancelled", statusText: "已取消" }), g({ type: "abort", reason: "cancelled" });
            else {
              const $ = A instanceof Error && A.message ? A.message : "生成回答失败，请重试。";
              R({ progress: "", status: "error", statusText: $ }), g({ type: "error", errorText: $ });
            }
          } finally {
            if (!u) {
              u = !0;
              try {
                b.close();
              } catch {
              }
            }
          }
        })();
      }
    });
  }
  async reconnectToStream() {
    return null;
  }
}
function Fn(t) {
  return ot(t);
}
function ct(t) {
  return t.map((e) => {
    var n, s;
    return {
      id: e.id,
      role: e.role,
      metadata: e.role === "assistant" ? {
        citations: e.citations || [],
        progress: e.progress || "",
        status: ((n = e.status) == null ? void 0 : n.type) === "running" ? "running" : ((s = e.status) == null ? void 0 : s.type) === "incomplete" ? e.status.reason === "cancelled" ? "cancelled" : "error" : "complete"
      } : void 0,
      parts: [{ type: "text", text: e.content || "" }]
    };
  });
}
function zn(t) {
  const e = t.metadata || {}, n = e.status === "running", s = e.status === "cancelled" || e.status === "error", a = Fn(t), r = a.trim() || (s ? `${e.statusText || ""}`.trim() : "");
  return {
    id: t.id,
    role: t.role,
    content: t.role === "assistant" ? r : a,
    ...t.role === "assistant" ? {
      citations: e.citations || [],
      progress: e.progress || "",
      // 「答完了但没做完」和「中断/出错」是两回事:正文是完整的一段话,只是背后的
      // 工作被轮次预算截断了。所以它走 incomplete + 具体原因,而不是 error。
      status: n ? { type: "running" } : s ? {
        type: "incomplete",
        reason: e.status === "cancelled" ? "cancelled" : "error"
      } : `${e.incompleteReason || ""}`.trim() ? {
        type: "incomplete",
        reason: `${e.incompleteReason}`.trim()
      } : { type: "complete", reason: "stop" }
    } : {}
  };
}
function qn(t) {
  const e = B(t.remoteAnswerer), n = B(t.localAnswerer), s = B(t.onAgentOperationSignal), a = B(t.onConfirmationMode), r = B(t.onStopped);
  r.current = t.onStopped;
  const o = B(t.assistantMode);
  e.current = t.remoteAnswerer, n.current = t.localAnswerer, s.current = t.onAgentOperationSignal, a.current = t.onConfirmationMode, o.current = t.assistantMode;
  const l = Q(() => new Gt({
    id: `reader-${t.jobId || "idle"}`,
    transport: new Dn({
      jobId: t.jobId,
      getRemoteAnswerer: () => e.current,
      getLocalAnswerer: () => n.current,
      getAssistantMode: () => o.current,
      onAgentOperationSignal: (p) => {
        var c;
        return (c = s.current) == null ? void 0 : c.call(s, p);
      },
      onConfirmationMode: (p) => {
        var c;
        return (c = a.current) == null ? void 0 : c.call(a, p);
      }
    })
  }), [t.jobId]);
  return U(() => {
    t.enabled || l.stop().finally(() => {
      var p;
      return (p = r.current) == null ? void 0 : p.call(r);
    });
  }, [l, t.enabled]), U(() => () => {
    l.stop().finally(() => {
      var p;
      return (p = r.current) == null ? void 0 : p.call(r);
    });
  }, [l]), Vt({ chat: l, experimental_throttle: 16 });
}
function Bn(t) {
  for (let e = t.length - 1; e >= 0; e -= 1)
    if (t[e].role === "assistant") return t[e];
}
function Te(t, e) {
  return {
    version: 1,
    headId: e,
    items: t.map((n) => {
      var s;
      return {
        parentId: n.parentId,
        message: {
          id: n.message.id,
          role: n.message.role,
          content: n.message.content,
          ...n.message.progress ? { progress: n.message.progress } : {},
          ...(s = n.message.citations) != null && s.length ? { citations: n.message.citations } : {},
          ...n.message.status ? {
            status: {
              type: n.message.status.type,
              ...n.message.status.reason ? { reason: `${n.message.status.reason}` } : {}
            }
          } : {}
        }
      };
    })
  };
}
function dt(t) {
  return {
    items: t.items.map((e) => ({
      parentId: e.parentId,
      message: {
        ...e.message,
        citations: e.message.citations || [],
        status: e.message.status
      }
    })),
    headId: t.headId
  };
}
function ce(t, e) {
  if (!t.length) return [];
  const n = new Map(t.map((l) => [l.message.id, l])), s = e && n.get(e) || t.at(-1);
  if (!s) return [];
  const a = [];
  let r = s;
  const o = /* @__PURE__ */ new Set();
  for (; r && !o.has(r.message.id); )
    o.add(r.message.id), a.push(r.message), r = r.parentId ? n.get(r.parentId) : void 0;
  return a.reverse();
}
function Ln(t, e) {
  var n;
  return e ? ((n = t.find((s) => s.message.id === e)) == null ? void 0 : n.message) ?? null : null;
}
function jn(t, e) {
  const n = new Map(t.map((o) => [o.message.id, o]));
  let s = n.get(e);
  if (!s) return [];
  const a = [], r = /* @__PURE__ */ new Set();
  for (; s && !r.has(s.message.id); )
    r.add(s.message.id), a.push(s), s = s.parentId ? n.get(s.parentId) : void 0;
  return a.reverse();
}
function Kn(t, e, n) {
  var I, w, C, m;
  const s = `${e || ""}`.trim();
  if (!s || !t.length) return [];
  let a = s;
  t.some((u) => u.message.id === a) || (n && t.some((u) => u.message.id === n) ? a = n : a = ((I = [...t].reverse().find((u) => u.message.role === "assistant")) == null ? void 0 : I.message.id) || "");
  let r = jn(t, a);
  if (r.length >= 2 && ((w = r.at(-1)) == null ? void 0 : w.message.role) === "assistant") return r;
  r.length === 1 && ((C = r[0]) == null ? void 0 : C.message.role) === "user" && (r = []);
  const o = ce(t, n || a);
  let l = o.findIndex((u) => u.id === a);
  if (l < 0 && (l = o.length - 1), l < 0) return r;
  const p = new Map(t.map((u) => [u.message.id, u])), c = o.slice(0, l + 1).map((u) => p.get(u.id)).filter((u) => !!u);
  for (; c.length && ((m = c.at(-1)) == null ? void 0 : m.message.role) !== "assistant"; ) c.pop();
  return c.length ? c : r;
}
function Ae(t) {
  return t.map((e) => ({
    parentId: e.parentId,
    message: {
      ...e.message,
      citations: e.message.citations || [],
      status: e.message.status
    }
  }));
}
const Wn = {
  stopStream: () => Promise.resolve(),
  clearMessages: () => {
  },
  showMessages: () => {
  }
};
function Un(t) {
  var n;
  const e = {};
  for (const s of t) {
    const a = s.message;
    a.role === "assistant" && ((n = a.citations) != null && n.length) && (e[a.id] = a.citations);
  }
  return e;
}
function Hn(t) {
  const e = {};
  for (const n of t) {
    const s = n.message;
    s.role === "assistant" && s.progress && (e[s.id] = s.progress);
  }
  return e;
}
function Gn(t) {
  const e = {};
  for (const n of t) {
    const s = n.message;
    s.content && (e[s.id] = s.content);
  }
  return e;
}
function Vn(t, e, n) {
  var a;
  const s = e || ((a = n == null ? void 0 : n.getConversationId) == null ? void 0 : a.call(n)) || "";
  return (t || []).map((r) => ({
    ...Qt(r, { active: s }),
    active: r.conversation_id === s
  }));
}
function Yn(t) {
  const { setItems: e, setHeadId: n } = t;
  return {
    readItems: () => t.itemsRef.current,
    readHeadId: () => t.headIdRef.current,
    appendExchange: ({ parentId: s, userId: a, assistantId: r, question: o, progress: l }) => {
      e((p) => [
        ...p,
        { parentId: s, message: { id: a, role: "user", content: o } },
        {
          parentId: a,
          message: {
            id: r,
            role: "assistant",
            content: "",
            progress: l,
            status: { type: "running" },
            citations: []
          }
        }
      ]), n(r);
    },
    appendRetryTurn: ({ assistantId: s, branchParent: a }) => {
      e((r) => [
        ...r,
        {
          parentId: a,
          message: {
            id: s,
            role: "assistant",
            content: "",
            progress: "正在重新生成…",
            status: { type: "running" },
            citations: []
          }
        }
      ]), n(s);
    },
    markRunningCancelled: () => {
      e(
        (s) => s.map(
          (a) => {
            var r;
            return ((r = a.message.status) == null ? void 0 : r.type) === "running" ? {
              ...a,
              message: {
                ...a.message,
                status: { type: "incomplete", reason: "cancelled" },
                progress: "",
                content: a.message.content.trim() || "已取消"
              }
            } : a;
          }
        )
      );
    },
    markRunningAsError: (s) => {
      const a = `${s || ""}`.trim() || "生成回答失败，请重试。";
      e((r) => r.map((o) => {
        var l;
        return ((l = o.message.status) == null ? void 0 : l.type) === "running" ? {
          ...o,
          message: {
            ...o.message,
            content: o.message.content.trim() || a,
            progress: "",
            citations: [],
            status: { type: "incomplete", reason: "error" }
          }
        } : o;
      }));
    },
    mergeChatMirror: (s) => {
      s.size && e((a) => a.map((r) => {
        const o = s.get(r.message.id);
        return o ? { ...r, message: { ...r.message, ...o } } : r;
      }));
    }
  };
}
function Qn(t) {
  const {
    jobId: e,
    documentId: n,
    enabled: s,
    refreshSessions: a,
    applyConversationTree: r,
    remoteRef: o,
    streamRef: l,
    itemsRef: p,
    documentIdRef: c,
    lastJobRef: I,
    persistReadyRef: w,
    switchTokenRef: C,
    sessionListGenerationRef: m,
    activeConversationIdRef: u,
    setItems: E,
    setHeadId: P,
    setSessions: _,
    setActiveConversationId: D,
    setSessionBusy: T
  } = t;
  U(() => {
    const b = o.current;
    if (!e) {
      m.current += 1, C.current += 1, E([]), P(null), _([]), D(""), l.current.clearMessages(), u.current = "", I.current = "", c.current = "", w.current = !1;
      return;
    }
    const O = I.current !== e;
    if (O && (m.current += 1, C.current += 1, I.current = e, w.current = !1, E([]), P(null), l.current.clearMessages(), _([]), D(""), u.current = "", c.current = "", T(!1)), !s || !b) {
      m.current += 1;
      return;
    }
    let y = !1;
    return (async () => {
      var k, f, N, A;
      let g = `${n || c.current || ""}`.trim();
      if (!g) {
        try {
          g = `${await ((k = b.getDocumentId) == null ? void 0 : k.call(b)) || ""}`.trim();
        } catch {
          g = "";
        }
        if (y) return;
      }
      g && (c.current = g);
      let R = null;
      if (!y && g && (R = await a(g)), !(O || !p.current.length) || y) {
        y || (w.current = !0);
        return;
      }
      const v = Jt({ jobId: e, documentId: g }) || `${((f = b.getConversationId) == null ? void 0 : f.call(b)) || ""}`.trim();
      if (v) {
        D(v), u.current = v, (N = b.setConversationId) == null || N.call(b, v, g);
        try {
          const $ = await ze(v);
          if (y) return;
          const d = Ie($.messages || []);
          if (d.length) {
            r(d, $.head_id), requestAnimationFrame(() => {
              y || (w.current = !0);
            });
            return;
          }
        } catch {
        }
      }
      if (!y && g)
        try {
          const $ = R ?? await a(g);
          if (y || !$) return;
          const d = $[0];
          if (d != null && d.conversation_id) {
            const q = d.conversation_id;
            D(q), u.current = q, (A = b.setConversationId) == null || A.call(b, q, g);
            try {
              const G = await ze(q);
              if (y) return;
              r(
                Ie(G.messages || []),
                G.head_id
              ), requestAnimationFrame(() => {
                y || (w.current = !0);
              });
              return;
            } catch {
            }
          }
        } catch {
        }
      if (y) return;
      const h = et({ jobId: e, documentId: g }, v);
      if (h != null && h.items.length) {
        const $ = dt(h);
        E($.items), P($.headId), l.current.showMessages(ce($.items, $.headId));
      } else
        E([]), P(null), l.current.clearMessages();
      requestAnimationFrame(() => {
        y || (w.current = !0);
      });
    })(), () => {
      y = !0, m.current += 1;
    };
  }, [e, n, s, a, r]);
}
function Jn(t) {
  const {
    jobId: e,
    documentId: n,
    items: s,
    headId: a,
    activeConversationId: r,
    documentIdRef: o,
    persistReadyRef: l
  } = t;
  U(() => {
    if (!e || !l.current) return;
    const p = r, c = { jobId: e, documentId: n || o.current }, I = window.setTimeout(() => {
      if (!s.length) {
        he(c, p);
        return;
      }
      $e(c, Te(s, a), p);
    }, 280);
    return () => window.clearTimeout(I);
  }, [e, n, s, a, r]);
}
function Xn(t) {
  const {
    jobId: e,
    documentId: n,
    sessionBusy: s,
    sessions: a,
    streamRef: r,
    remoteRef: o,
    itemsRef: l,
    headIdRef: p,
    activeConversationIdRef: c,
    documentIdRef: I,
    switchTokenRef: w,
    persistReadyRef: C,
    setSessionBusy: m,
    setSessionError: u,
    setActiveConversationId: E,
    setItems: P,
    setHeadId: _,
    setSessions: D,
    refreshSessions: T,
    applyConversationTree: b
  } = t, O = H(() => {
    var h, k;
    const v = `${((k = (h = o.current) == null ? void 0 : h.getConversationId) == null ? void 0 : k.call(h)) || ""}`.trim();
    v && E(v);
  }, []), y = H(async () => {
    var h, k;
    if (s) return;
    await r.current.stopStream(), ue(900), oe(900), m(!0), u("");
    const v = ++w.current;
    try {
      if (await new Promise((A) => {
        window.setTimeout(A, 40);
      }), v !== w.current) return;
      const f = o.current, N = I.current || `${await ((h = f == null ? void 0 : f.getDocumentId) == null ? void 0 : h.call(f)) || ""}`.trim();
      if (v !== w.current) return;
      I.current = N, (k = f == null ? void 0 : f.clearConversationId) == null || k.call(f, N), E(""), c.current = "", P([]), _(null), r.current.clearMessages(), he({ jobId: e, documentId: N }), N && await T(N, v);
    } catch (f) {
      console.warn("[reader-ai] new session failed", f), u("无法创建新对话，请重试。");
    } finally {
      v === w.current && m(!1);
    }
  }, [e, T, s]), g = H(async (v) => {
    var A, $, d, q, G;
    const h = `${v || ""}`.trim();
    if (!h)
      return u("无法分支：消息 id 无效。"), !1;
    if (s)
      return u("请稍候，当前有会话操作进行中。"), !1;
    await r.current.stopStream();
    const k = Kn(l.current, h, p.current);
    if (!k.length)
      return u("无法分支：找不到到此答案的对话路径。"), !1;
    if (k[k.length - 1].message.role !== "assistant")
      return u("只能从助手答案处开新对话。"), !1;
    m(!0), u("");
    const N = ++w.current;
    try {
      if (await new Promise((j) => {
        window.setTimeout(j, 40);
      }), N !== w.current) return !1;
      const F = o.current;
      let L = I.current || `${await ((A = F == null ? void 0 : F.getDocumentId) == null ? void 0 : A.call(F)) || ""}`.trim();
      if (N !== w.current) return !1;
      if (I.current = L, !L)
        try {
          if (L = `${await (($ = F == null ? void 0 : F.getDocumentId) == null ? void 0 : $.call(F)) || ""}`.trim(), N !== w.current) return !1;
          I.current = L;
        } catch {
          L = "";
        }
      if (!L)
        return u("无法分支：文档未就绪，请稍后重试。"), !1;
      const V = k.map((j, ie) => ({
        id: j.message.id,
        role: j.message.role,
        content: j.message.content,
        citations: j.message.citations,
        parentId: ie === 0 ? null : k[ie - 1].message.id
      })), M = c.current || ((d = F == null ? void 0 : F.getConversationId) == null ? void 0 : d.call(F)) || "", z = (a || []).find((j) => j.conversation_id === M), X = V.find((j) => j.role === "user"), te = `${(z == null ? void 0 : z.title) || ""}`.trim() || `${(X == null ? void 0 : X.content) || ""}`.replace(/\s+/g, " ").trim() || "未命名对话", re = (a || []).map((j) => j.title || ""), ae = Xt(te, re), Z = await me().forkFromPath({
        documentId: L,
        title: ae,
        path: V
      });
      if (N !== w.current) return !1;
      const K = Ae(Z.items), J = ((q = K[K.length - 1]) == null ? void 0 : q.message.id) || null, Y = Z.conversation.conversation_id;
      if (!Y || !K.length)
        throw new Error("fork returned empty conversation");
      return ue(600), oe(600), P(K), _(J), r.current.showMessages(ce(K, J)), E(Y), c.current = Y, (G = F == null ? void 0 : F.setConversationId) == null || G.call(F, Y, L), D((j) => {
        const ie = {
          conversation_id: Y,
          title: ae,
          document_id: L,
          created_at: Z.conversation.created_at || (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: Z.conversation.updated_at || (/* @__PURE__ */ new Date()).toISOString(),
          message_count: K.length,
          head_id: J || ""
        }, de = j.filter((pe) => pe.conversation_id !== Y);
        return [ie, ...de];
      }), $e(
        { jobId: e, documentId: L },
        Te(K, J),
        Y
      ), await T(L, N), !0;
    } catch (F) {
      return console.warn("[reader-ai] branch from answer failed", F), N === w.current && u("分支失败：未能复制上文到新对话。请检查网络后重试。"), !1;
    } finally {
      N === w.current && m(!1);
    }
  }, [e, T, s, a]), R = H(async (v) => {
    var f, N, A, $;
    const h = `${v || ""}`.trim();
    if (!h || s) return;
    await r.current.stopStream(), m(!0), u("");
    const k = ++w.current;
    try {
      const d = o.current, q = I.current || `${await ((f = d == null ? void 0 : d.getDocumentId) == null ? void 0 : f.call(d)) || ""}`.trim();
      if (k !== w.current) return;
      I.current = q;
      try {
        await me().delete(h);
      } catch (L) {
        if ((Number(L == null ? void 0 : L.status) || 0) !== 404) throw L;
      }
      he({ jobId: e, documentId: q }, h);
      const F = (c.current || ((N = d == null ? void 0 : d.getConversationId) == null ? void 0 : N.call(d)) || "") === h;
      if (D((L) => L.filter((V) => V.conversation_id !== h)), F) {
        (A = d == null ? void 0 : d.clearConversationId) == null || A.call(d, q), E(""), c.current = "", P([]), _(null), r.current.clearMessages(), he({ jobId: e, documentId: q });
        const L = q ? await T(q, k) : [];
        if (k !== w.current || !L) return;
        const V = L[0];
        if (V != null && V.conversation_id) {
          const M = V.conversation_id;
          E(M), c.current = M;
          try {
            const z = await me().get(M);
            if (k !== w.current) return;
            b(
              Ie(z.messages || []),
              z.head_id
            ), ($ = d == null ? void 0 : d.setConversationId) == null || $.call(d, M, q);
          } catch {
            P([]), _(null);
          }
        }
      } else q && await T(q, k);
    } catch (d) {
      console.warn("[reader-ai] delete session failed", d), u("删除对话失败，请重试。");
    } finally {
      k === w.current && m(!1);
    }
  }, [b, e, T, s]), S = H(async (v, h) => {
    const k = `${v || ""}`.trim(), f = `${h || ""}`.replace(/\s+/g, " ").trim();
    if (!k || !f || s) return;
    m(!0), u("");
    const N = ++w.current;
    try {
      const A = f.slice(0, 80);
      if (await me().patch(k, { title: A }), N !== w.current) return;
      D(
        (d) => d.map(
          (q) => q.conversation_id === k ? { ...q, title: A } : q
        )
      );
      const $ = I.current;
      $ && await T($, N);
    } catch (A) {
      console.warn("[reader-ai] rename session failed", A), u("重命名失败，请重试。");
    } finally {
      N === w.current && m(!1);
    }
  }, [T, s]);
  return {
    adoptRemoteConversationId: O,
    newSession: y,
    branchFromAnswer: g,
    removeSession: R,
    renameSession: S
  };
}
function Zn(t) {
  var ae;
  const {
    jobId: e,
    documentId: n = "",
    enabled: s,
    remoteAnswerer: a = null,
    stream: r = Wn
  } = t, [o, l] = W([]), [p, c] = W(null), [I, w] = W([]), [C, m] = W(""), [u, E] = W(!1), [P, _] = W(""), D = B(o), T = B(p), b = B(C), O = B(!1), y = B(""), g = B(""), R = B(0), S = B(0), v = B(r);
  v.current = r;
  const h = B(a);
  h.current = a, D.current = o, T.current = p, b.current = C;
  const k = H(async (Z = "", K) => {
    const J = `${Z || g.current || ""}`.trim(), Y = ++S.current;
    if (!J)
      return Y === S.current && (K === void 0 || K === R.current) && w([]), [];
    try {
      const j = me();
      if (!j) return null;
      const de = (await j.list({ document_id: J, limit: 50 })).conversations || [];
      return Y === S.current && J === `${g.current || ""}`.trim() && (K === void 0 || K === R.current) ? (w(de), de) : null;
    } catch {
      return null;
    }
  }, []), f = H((Z, K) => {
    var j;
    const J = Ae(Z), Y = `${K || ""}`.trim() || ((j = J[J.length - 1]) == null ? void 0 : j.message.id) || null;
    l(J), c(Y), v.current.showMessages(ce(J, Y));
  }, []), N = H(() => `${n || g.current || e}`.trim(), [n, e]);
  Qn({
    jobId: e,
    documentId: n,
    enabled: s,
    refreshSessions: k,
    applyConversationTree: f,
    remoteRef: h,
    streamRef: v,
    itemsRef: D,
    documentIdRef: g,
    lastJobRef: y,
    persistReadyRef: O,
    switchTokenRef: R,
    sessionListGenerationRef: S,
    activeConversationIdRef: b,
    setItems: l,
    setHeadId: c,
    setSessions: w,
    setActiveConversationId: m,
    setSessionBusy: E
  }), Jn({
    jobId: e,
    documentId: n,
    items: o,
    headId: p,
    activeConversationId: C,
    documentIdRef: g,
    persistReadyRef: O
  });
  const A = Q(
    () => ce(o, p),
    [o, p]
  ), $ = Q(
    () => Un(o),
    [o]
  ), d = Q(
    () => Hn(o),
    [o]
  ), q = Q(
    () => Gn(o),
    [o]
  ), G = Q(() => Yn({ setItems: l, setHeadId: c, itemsRef: D, headIdRef: T }), []), {
    adoptRemoteConversationId: F,
    newSession: L,
    branchFromAnswer: V,
    removeSession: M,
    renameSession: z
  } = Xn({
    jobId: e,
    documentId: n,
    sessionBusy: u,
    sessions: I,
    streamRef: v,
    remoteRef: h,
    itemsRef: D,
    headIdRef: T,
    activeConversationIdRef: b,
    documentIdRef: g,
    switchTokenRef: R,
    persistReadyRef: O,
    setSessionBusy: E,
    setSessionError: _,
    setActiveConversationId: m,
    setItems: l,
    setHeadId: c,
    setSessions: w,
    refreshSessions: k,
    applyConversationTree: f
  }), X = H(async (Z) => {
    var j, ie, de, pe, xe, Ee, Pe, Oe;
    const K = `${Z || ""}`.trim(), J = b.current || ((ie = (j = h.current) == null ? void 0 : j.getConversationId) == null ? void 0 : ie.call(j)) || "";
    if (!K || K === J || u) return;
    await v.current.stopStream(), ue(1200), oe(1200), E(!0), _("");
    const Y = ++R.current;
    O.current = !1, m(K), b.current = K, l([]), c(null), v.current.clearMessages();
    try {
      if (await new Promise((ye) => {
        window.setTimeout(ye, 80);
      }), Y !== R.current) return;
      try {
        (xe = (pe = (de = globalThis.document) == null ? void 0 : de.activeElement) == null ? void 0 : pe.blur) == null || xe.call(pe);
      } catch {
      }
      const ee = h.current, ne = g.current || `${await ((Ee = ee == null ? void 0 : ee.getDocumentId) == null ? void 0 : Ee.call(ee)) || ""}`.trim();
      if (Y !== R.current) return;
      g.current = ne;
      const le = me();
      if (!le) throw new Error("Reader conversations unavailable");
      const Ne = await le.get(K);
      if (Y !== R.current) return;
      ue(800), oe(800);
      const Me = Ie(Ne.messages || []);
      if (f(Me, Ne.head_id), (Pe = ee == null ? void 0 : ee.setConversationId) == null || Pe.call(ee, K, ne), O.current = !0, Me.length) {
        const ye = Ae(Me);
        $e(
          { jobId: e, documentId: ne },
          Te(
            ye,
            `${Ne.head_id || ""}`.trim() || ((Oe = ye.at(-1)) == null ? void 0 : Oe.message.id) || null
          ),
          K
        );
      } else
        he({ jobId: e, documentId: ne }, K);
      ne && await k(ne, Y), ue(350), oe(350);
    } catch (ee) {
      if (console.warn("[reader-ai] switch session failed", ee), Y === R.current) {
        _("加载该对话失败，请检查网络后重试。");
        const ne = et(
          { jobId: e, documentId: n || g.current },
          K
        );
        if (ne != null && ne.items.length) {
          const le = dt(ne);
          l(le.items), c(le.headId), v.current.showMessages(ce(le.items, le.headId));
        } else
          l([]), c(null);
        O.current = !0;
      }
    } finally {
      Y === R.current && E(!1);
    }
  }, [
    f,
    e,
    n,
    k,
    u
  ]), te = Q(
    () => Vn(I, C, a),
    [I, C, a]
  ), re = Q(() => ({
    refreshSessions: k,
    adoptRemoteConversationId: F,
    newSession: L,
    switchSession: X,
    removeSession: M,
    renameSession: z,
    branchFromAnswer: V
  }), [
    k,
    F,
    L,
    X,
    M,
    z,
    V
  ]);
  return {
    items: o,
    headId: p,
    messages: A,
    citationsByMessageId: $,
    progressByMessageId: d,
    contentByMessageId: q,
    sessions: te,
    activeConversationId: C || ((ae = a == null ? void 0 : a.getConversationId) == null ? void 0 : ae.call(a)) || "",
    sessionBusy: u,
    sessionError: P,
    resolveRequestScopeKey: N,
    tree: G,
    sessionCommands: re
  };
}
const er = "retainpdf.reader.ai.request.v1:", tr = Object.freeze({
  assistantMode: "reading",
  scope: "document",
  context: null
});
function lt(t, e) {
  return `${er}${`${t || ""}`.trim()}:${`${e || ""}`.trim()}`;
}
function nr(t) {
  if (!t || typeof t != "object" || Array.isArray(t)) return null;
  const e = t, n = e.assistantMode === "operations" ? "operations" : e.assistantMode === "reading" ? "reading" : null, s = e.scope === "selection" || e.scope === "page" || e.scope === "document" ? e.scope : null;
  if (!n || !s) return null;
  const a = e.context && typeof e.context == "object" && !Array.isArray(e.context) ? { ...e.context } : null;
  return { assistantMode: n, scope: s, context: a };
}
function je(t, e, n) {
  var r;
  const s = `${t || ""}`.trim(), a = `${e || ""}`.trim();
  if (!(!s || !a))
    try {
      (r = globalThis.localStorage) == null || r.setItem(
        lt(s, a),
        JSON.stringify(n)
      );
    } catch {
    }
}
function Ke(t, e) {
  var a;
  const n = `${t || ""}`.trim(), s = `${e || ""}`.trim();
  if (!n || !s) return null;
  try {
    const r = (a = globalThis.localStorage) == null ? void 0 : a.getItem(lt(n, s));
    return r ? nr(JSON.parse(r)) : null;
  } catch {
    return null;
  }
}
function rr(t) {
  const e = `${t.scopeKey || ""}`.trim(), n = `${t.jobId || ""}`.trim(), s = `${t.assistantMessageId || ""}`.trim();
  return Ke(e, s) || (e !== n ? Ke(n, s) : null) || tr;
}
function sr(t) {
  const { assistantMode: e, selectionContext: n } = t;
  return e === "operations" ? { assistantMode: e, scope: "document", context: null } : n ? { assistantMode: e, scope: "selection", context: { ...n } } : { assistantMode: e, scope: "document", context: null };
}
function ar(t) {
  var O;
  const { jobId: e, assistantMode: n, selectionContext: s = null, tree: a, chat: r, getScopeKey: o } = t, l = B(a);
  l.current = a;
  const p = B(r);
  p.current = r;
  const c = B(n);
  c.current = n;
  const I = B(s);
  I.current = s;
  const w = B(o);
  w.current = o;
  const C = r.status, m = C === "submitted" || C === "streaming", u = B(m);
  u.current = m;
  const E = m ? `${((O = Bn(r.messages)) == null ? void 0 : O.id) || ""}` : "", P = r.messages, _ = r.error;
  U(() => {
    if (!P.length) return;
    const y = new Map(P.map((R) => [R.id, R])), g = /* @__PURE__ */ new Map();
    for (const [R, S] of y)
      g.set(R, zn(S));
    l.current.mergeChatMirror(g);
  }, [P]), U(() => {
    !_ || C !== "error" || l.current.markRunningAsError(_.message);
  }, [_, C]);
  const D = H(async (y) => {
    if (u.current) return;
    const g = `${y || ""}`.trim();
    if (!g) return;
    const R = l.current, S = p.current, v = c.current, h = I.current, k = w.current(), f = R.readHeadId(), N = ke("u"), A = ke("a"), $ = sr({
      assistantMode: v,
      selectionContext: (h == null ? void 0 : h.selectionType) === "text" ? {
        page: h.page,
        page_idx: Math.max(0, h.page - 1),
        pane: h.pane,
        kind: "text",
        block_id: "",
        quoteText: h.quote
      } : h ? {
        page: h.page,
        page_idx: Math.max(0, h.page - 1),
        pane: h.pane,
        kind: h.kind,
        block_id: h.selectionType === "region" ? h.region.itemId : "",
        quoteText: Ze(h.region, h.pane)
      } : null
    });
    je(k, A, $), R.appendExchange({
      parentId: f,
      userId: N,
      assistantId: A,
      question: g,
      progress: $.assistantMode === "operations" ? "正在规划 PDF 操作…" : "正在理解文档…"
    }), await S.sendUserMessage(
      { id: N, role: "user", parts: [{ type: "text", text: g }] },
      {
        body: {
          assistantMessageId: A,
          assistantMode: $.assistantMode,
          parentId: f,
          question: g,
          regenerate: !1,
          userMessageId: N,
          scope: $.scope,
          context: $.context
        }
      }
    );
  }, []), T = H(async (y) => {
    if (u.current) return;
    const g = l.current, R = p.current, S = g.readItems(), v = S.find(
      (G) => G.message.id === y && G.message.role === "assistant"
    ), h = (v == null ? void 0 : v.parentId) ?? null, k = h ? Ln(S, h) : null;
    let f = "", N = h;
    if ((k == null ? void 0 : k.role) === "user")
      f = k.content.trim();
    else {
      const G = ce(S, h ?? g.readHeadId());
      for (let F = G.length - 1; F >= 0; F -= 1)
        if (G[F].role === "user") {
          f = G[F].content.trim(), N = G[F].id;
          break;
        }
    }
    if (!f) return;
    const A = ke("a"), $ = N || h, d = w.current(), q = rr({
      scopeKey: d,
      jobId: e,
      assistantMessageId: y
    });
    je(d, A, q), g.appendRetryTurn({ assistantId: A, branchParent: $ }), R.replaceVisible(ct(ce(S, y))), await R.regenerateFrom({
      messageId: y,
      body: {
        assistantMessageId: A,
        assistantMode: q.assistantMode,
        parentId: $,
        question: f,
        regenerate: !0,
        userMessageId: N || "",
        scope: q.scope,
        context: q.context
      }
    });
  }, [e]), b = H(async () => {
    await p.current.stopStream(), l.current.markRunningCancelled();
  }, []);
  return {
    isRunning: m,
    streamingAssistantId: E,
    submitQuestion: D,
    retryAnswer: T,
    cancelAnswer: b
  };
}
const ir = "retainpdf.reader-agent-operation.action-key.v1:", or = "reader-";
function We(t, e) {
  return tn(t, e);
}
function cr(t) {
  return en(t);
}
function dr(t, e) {
  return Zt(t, e);
}
function lr(t) {
  return nn(t);
}
function ur(t) {
  return rn(t);
}
function pr({
  conversationId: t,
  enabled: e,
  discovering: n,
  signal: s,
  confirmationModeHint: a,
  onDocumentCommitted: r
}) {
  const [o, l] = W({}), [p, c] = W("explicit"), [I, w] = W(!1), [C, m] = W(!1), u = B(/* @__PURE__ */ new Set()), E = B(/* @__PURE__ */ new Set()), P = B(/* @__PURE__ */ new Set()), _ = H((y, g = !1) => {
    y != null && y.operation_id && l((R) => {
      const S = R[y.operation_id];
      return dr(S == null ? void 0 : S.operation, y) ? {
        ...R,
        [y.operation_id]: {
          ...S,
          operation: y,
          pendingAction: void 0,
          error: void 0
        }
      } : !g || !(S != null && S.pendingAction) ? R : {
        ...R,
        [y.operation_id]: { ...S, pendingAction: void 0 }
      };
    });
  }, []), D = H(async (y, g = !1) => {
    const R = `${y || ""}`.trim(), S = `refresh:${R}`;
    if (!(!R || u.current.has(S))) {
      u.current.add(S);
      try {
        const v = fe();
        if (!v) return;
        _(await v.get(R), g);
      } catch {
      } finally {
        u.current.delete(S);
      }
    }
  }, [_]), T = H(async () => {
    const y = `${t || ""}`.trim(), g = `recover:${y}`;
    if (!(!e || !y || u.current.has(g))) {
      u.current.add(g);
      try {
        const R = fe();
        if (!R) return;
        const S = await R.list(y, {});
        if (!P.current.has(y)) {
          for (const v of S.operations || [])
            v.status === "committed" && E.current.add(v.operation_id);
          P.current.add(y);
        }
        for (const v of S.operations || []) _(v);
      } catch {
      } finally {
        u.current.delete(g);
      }
    }
  }, [t, e, _]);
  U(() => {
    if (!e) return;
    let y = !1;
    const g = async () => {
      try {
        const S = fe();
        if (!S) return;
        const v = await S.fetchRuntimeConfig();
        if (y) return;
        c(v.agent_confirmation_mode || "explicit"), m(!!v.llm_api_key_configured), w(
          v.restart_required || v.restart_state === "pending" || v.active_revision !== v.configured_revision
        );
      } catch {
        y || (w(!1), m(!1));
      }
    };
    g();
    const R = window.setInterval(g, 3e3);
    return () => {
      y = !0, window.clearInterval(R);
    };
  }, [e]), U(() => {
    a && c(a);
  }, [a]), U(() => {
    s != null && s.confirmationMode && c(s.confirmationMode), s != null && s.operationId && D(s.operationId);
  }, [D, s]), U(() => {
    T();
  }, [T]), U(() => {
    n || T();
  }, [n, T]);
  const b = Q(
    () => Object.values(o).filter((y) => !!t && y.operation.conversation_id === t).sort((y, g) => `${y.operation.created_at || ""}`.localeCompare(`${g.operation.created_at || ""}`)),
    [t, o]
  );
  U(() => {
    var y;
    for (const g of b) {
      const R = g.operation;
      R.status !== "committed" || E.current.has(R.operation_id) || (E.current.add(R.operation_id), r == null || r({
        documentId: R.document_id,
        revision: ((y = R.candidate) == null ? void 0 : y.version_id) || `${R.updated_at || ""}` || `${R.operation_id}:${cr(R)}`
      }));
    }
  }, [b, r]);
  const O = b.some((y) => We(y.operation.status, p));
  return U(() => {
    if (!e || !t || !n && !O) return;
    const y = window.setInterval(() => {
      T();
      for (const g of b)
        We(g.operation.status, p) && D(g.operation.operation_id);
    }, 1400);
    return () => window.clearInterval(y);
  }, [p, t, n, e, b, O, T, D]), U(() => {
    if (!e) return;
    const y = () => void T(), g = () => {
      document.visibilityState === "visible" && y();
    };
    return window.addEventListener("online", y), document.addEventListener("visibilitychange", g), () => {
      window.removeEventListener("online", y), document.removeEventListener("visibilitychange", g);
    };
  }, [e, T]), {
    entries: b,
    confirmationMode: p,
    runtimeRestarting: I,
    runtimeCredentialConfigured: C,
    setEntriesById: l,
    inFlightRef: u,
    upsert: _,
    refresh: D
  };
}
function mr() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return;
  }
}
function ut() {
  return {
    storagePrefix: ir,
    keyPrefix: or,
    storage: mr()
  };
}
function fr(t, e, n) {
  return sn(t, e, n, ut());
}
function Ue(t, e, n) {
  an(t, e, n, ut());
}
function hr({
  refresh: t,
  upsert: e,
  setEntriesById: n,
  inFlightRef: s
}) {
  const a = B(/* @__PURE__ */ new Map());
  return { perform: H(async (o, l, p = {}) => {
    const c = `${l.operation_id || ""}`.trim(), I = `action:${c}`;
    if (!c || s.current.has(I)) return;
    if (o === "retry" && l.status === "ambiguous" && p.acceptDuplicateRisk !== !0) {
      n((m) => ({
        ...m,
        [c]: {
          ...m[c],
          error: "请先确认重复执行风险，再重新执行操作。"
        }
      }));
      return;
    }
    const w = fr(c, o, a.current);
    s.current.add(I), n((m) => ({
      ...m,
      [c]: { ...m[c], pendingAction: o, error: void 0 }
    }));
    const C = {
      idempotency_key: w,
      expected_status: l.status,
      expected_attempt: l.current_attempt,
      expected_program_sha256: l.program_sha256 || ""
    };
    try {
      const m = fe();
      if (!m) throw new Error("Reader AI operations unavailable");
      let u;
      o === "run" ? u = await m.run(c, C) : o === "cancel" ? u = await m.cancel(c, { ...C, reason: "user_rejected" }) : o === "commit" ? u = await m.commit(c, C) : u = await m.retry(c, p.acceptDuplicateRisk ? { ...C, accept_duplicate_risk: !0 } : C), Ue(c, o, a.current), e(u, !0);
    } catch (m) {
      lr(m) === 409 ? (Ue(c, o, a.current), await t(c, !0)) : n((u) => ({
        ...u,
        [c]: {
          ...u[c],
          pendingAction: void 0,
          error: ur(m)
        }
      }));
    } finally {
      s.current.delete(I);
    }
  }, [t, e]) };
}
function gr({
  conversationId: t,
  enabled: e,
  discovering: n,
  signal: s,
  confirmationModeHint: a,
  onDocumentCommitted: r
}) {
  const o = pr({
    conversationId: t,
    enabled: e,
    discovering: n,
    signal: s,
    confirmationModeHint: a,
    onDocumentCommitted: r
  }), { perform: l } = hr({
    refresh: o.refresh,
    upsert: o.upsert,
    setEntriesById: o.setEntriesById,
    inFlightRef: o.inFlightRef
  }), p = H((c) => {
    var I;
    return ((I = fe()) == null ? void 0 : I.fetchCandidate(c.operation_id)) ?? Promise.reject(new Error("Reader AI operations unavailable"));
  }, []);
  return {
    entries: o.entries,
    confirmationMode: o.confirmationMode,
    runtimeRestarting: o.runtimeRestarting,
    runtimeCredentialConfigured: o.runtimeCredentialConfigured,
    perform: l,
    loadCandidate: p
  };
}
function yr(t) {
  var S;
  const {
    jobId: e,
    documentId: n = "",
    sessionIdentity: s = "",
    enabled: a,
    selectionContext: r = null,
    onDocumentCommitted: o
  } = t, l = `${e}\0${n}\0${s}`, [p, c] = W("reading"), [I, w] = W(null), [C, m] = W();
  U(() => {
    c("reading"), w(null), m(void 0);
  }, [l]);
  const u = Q(() => {
    var v;
    return !a || !e ? null : ((v = De()) == null ? void 0 : v.createRemoteAnswerer({ jobId: e, documentId: n })) ?? xt({ jobId: e, documentId: n });
  }, [n, a, e]), E = Q(() => {
    var v;
    return !a || !e ? null : ((v = De()) == null ? void 0 : v.createLocalAnswerer({ jobId: e })) ?? Ht({
      loadMarkdownPayload: Et.loadMarkdownPayload
    });
  }, [a, e]), P = B(null), _ = qn({
    jobId: e,
    enabled: a,
    remoteAnswerer: u,
    localAnswerer: E,
    assistantMode: p,
    onAgentOperationSignal: (v) => {
      w({ ...v, nonce: Date.now() + Math.random() });
    },
    onConfirmationMode: m,
    onStopped: () => {
      var v;
      return (v = P.current) == null ? void 0 : v.markRunningCancelled();
    }
  }), D = Q(() => ({
    messages: _.messages,
    status: _.status,
    error: _.error,
    sendUserMessage: (v, h) => _.sendMessage(
      v,
      h
    ),
    regenerateFrom: (v) => _.regenerate(
      v
    ),
    stopStream: () => _.stop(),
    replaceVisible: (v) => _.setMessages([...v])
  }), [_]), T = Q(() => ({
    stopStream: () => D.stopStream(),
    clearMessages: () => D.replaceVisible([]),
    showMessages: (v) => D.replaceVisible(ct(v))
  }), [D]), b = Zn({
    jobId: e,
    documentId: n,
    enabled: a,
    remoteAnswerer: u,
    stream: T
  });
  P.current = b.tree;
  const O = ar({
    jobId: e,
    assistantMode: p,
    selectionContext: r,
    tree: b.tree,
    chat: D,
    getScopeKey: () => b.resolveRequestScopeKey()
  }), y = b.activeConversationId || (I == null ? void 0 : I.conversationId) || `${((S = u == null ? void 0 : u.getConversationId) == null ? void 0 : S.call(u)) || ""}`.trim(), g = gr({
    conversationId: y,
    enabled: a,
    discovering: O.isRunning,
    signal: I,
    confirmationModeHint: C,
    onDocumentCommitted: o
  }), R = B(!1);
  return U(() => {
    R.current = !1;
  }, [e]), U(() => {
    R.current = !1;
  }, [l]), U(() => {
    R.current && !O.isRunning && (b.sessionCommands.refreshSessions(), b.sessionCommands.adoptRemoteConversationId()), R.current = O.isRunning;
  }, [b, O.isRunning]), {
    citationsByMessageId: b.citationsByMessageId,
    progressByMessageId: b.progressByMessageId,
    contentByMessageId: b.contentByMessageId,
    streamingAssistantId: O.streamingAssistantId,
    isRunning: O.isRunning,
    messages: b.messages,
    sessions: b.sessions,
    activeConversationId: b.activeConversationId,
    sessionBusy: b.sessionBusy,
    sessionError: b.sessionError,
    submitQuestion: O.submitQuestion,
    retryAnswer: O.retryAnswer,
    cancelAnswer: O.cancelAnswer,
    newSession: b.sessionCommands.newSession,
    switchSession: b.sessionCommands.switchSession,
    removeSession: b.sessionCommands.removeSession,
    renameSession: b.sessionCommands.renameSession,
    branchFromAnswer: b.sessionCommands.branchFromAnswer,
    agentOperations: g,
    assistantMode: p,
    setAssistantMode: c
  };
}
function Or({
  open: t,
  jobId: e,
  documentId: n = "",
  sessionIdentity: s = "",
  onClose: a,
  onJumpCitation: r,
  onDocumentCommitted: o,
  layout: l = "floating",
  side: p = "right",
  selectionContext: c = null,
  onClearSelectionContext: I
}) {
  const w = t && !!e, {
    citationsByMessageId: C,
    progressByMessageId: m,
    contentByMessageId: u,
    streamingAssistantId: E,
    isRunning: P,
    sessions: _,
    activeConversationId: D,
    sessionBusy: T,
    sessionError: b,
    messages: O,
    submitQuestion: y,
    retryAnswer: g,
    cancelAnswer: R,
    newSession: S,
    switchSession: v,
    removeSession: h,
    renameSession: k,
    branchFromAnswer: f,
    agentOperations: N,
    assistantMode: A,
    setAssistantMode: $
  } = yr({
    jobId: e,
    documentId: n,
    sessionIdentity: s,
    enabled: w,
    selectionContext: c,
    onDocumentCommitted: o
  }), [d, q] = W(""), G = H(async (L) => {
    q(""), await f(L) && (q(
      "已保存新对话（fork-n-原名）：复制了到此答案的上文，原对话不变。顶部列表可切换。"
    ), window.setTimeout(() => q(""), 6e3));
  }, [f]), F = H((L) => {
    r(L);
  }, [r]);
  return /* @__PURE__ */ i(
    Pt,
    {
      id: "reader-ai-panel",
      open: t,
      title: "PaperLoom AI",
      titleIcon: /* @__PURE__ */ i(ge, { size: 14, strokeWidth: 2.1, "aria-hidden": !0 }),
      storageKey: "retainpdf.reader.ai-float.pos.v2",
      ariaLabel: "阅读问答",
      width: 420,
      placement: l === "workspace" ? "workspace" : l === "docked" ? "dock-right" : "floating",
      showHeader: l !== "workspace",
      className: `reader-float-ai is-${l}${l === "workspace" ? ` is-pane-${p}` : ""}${T ? " is-session-busy" : ""}`,
      onClose: a,
      children: e ? /* @__PURE__ */ x("div", { className: "reader-float-ai-body", children: [
        /* @__PURE__ */ i(
          En,
          {
            sessions: _,
            activeId: D,
            busy: T,
            errorText: b,
            onSwitch: v,
            onNew: S,
            onDelete: h,
            onRename: k
          }
        ),
        d ? /* @__PURE__ */ i("div", { className: "aui-session-banner", role: "status", children: d }) : null,
        /* @__PURE__ */ i("div", { className: "reader-float-ai-thread-wrap", "aria-busy": T || void 0, children: /* @__PURE__ */ i(
          xn,
          {
            jobId: e,
            messages: O,
            citationsByMessageId: C,
            progressByMessageId: m,
            contentByMessageId: u,
            streamingAssistantId: E,
            isRunning: P,
            onSubmit: y,
            onRetry: g,
            onCancel: R,
            onJumpCitation: F,
            onBranchFromAnswer: G,
            branchBusy: T,
            agentOperations: N,
            assistantMode: A,
            onAssistantModeChange: $,
            selectionContext: c,
            onClearSelectionContext: I
          }
        ) })
      ] }) : /* @__PURE__ */ x("div", { className: "reader-float-ai-empty", children: [
        /* @__PURE__ */ i(ge, { size: 22, strokeWidth: 1.75, "aria-hidden": !0 }),
        /* @__PURE__ */ i("p", { children: "当前文档还没有可用于 AI 的解析产物" }),
        /* @__PURE__ */ i("span", { children: "请先完成 OCR 文档解析" })
      ] })
    }
  );
}
export {
  Or as ReaderAiPanel
};
//# sourceMappingURL=ReaderAiPanel-CLnTUBdi.js.map
