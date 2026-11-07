import { jsx as a, jsxs as P, Fragment as be } from "react/jsx-runtime";
import { useState as U, useRef as B, useEffect as G, useMemo as X, useCallback as V, useId as mt } from "react";
import { k as He, d as ft, u as ht, a as gt, l as yt, c as vt } from "./AgentInteractionPanel-CFN0rfvR.js";
import { Square as wt, ArrowUp as It, Copy as bt, GitBranch as Rt, RefreshCw as Ct, Sigma as Ge, Table2 as Nt, Image as kt, Type as Mt, X as Re, BookOpen as Ve, Sparkles as ge, Loader2 as Ce, FileText as Ae, ArrowDown as Qe, Quote as _t, ListTree as At, FlaskConical as St, ShieldCheck as $t, Bot as Tt, ChevronUp as xt, ChevronDown as Ye, TriangleAlert as Je, ExternalLink as Et, Check as Xe, Circle as Pt, Plus as Ot, Pencil as Dt, Trash2 as Ft } from "lucide-react";
import { g as me, h as fe, i as De, j as qt, d as zt, b as Bt } from "./ReaderApp-DczAps1w.js";
import { ThreadPrimitive as ae, ComposerPrimitive as ve, MessagePrimitive as Ze, ActionBarPrimitive as Me, useAui as Lt, SelectionToolbarPrimitive as jt, useExternalStoreRuntime as Kt, AssistantRuntimeProvider as Wt } from "@assistant-ui/react";
import { r as et } from "./reader-regions-DsePY7B_.js";
import { e as ue, q as oe, C as Fe, l as Ut, v as Ht } from "./answer-enhance-DShVYmyb.js";
import { b as Gt, m as Vt, s as Qt, l as tt, c as he, d as $e, a as Yt } from "./answer-quote-iOOg1onX.js";
import { Chat as Jt, useChat as Xt } from "@ai-sdk/react";
import { selectionForRequest as Zt } from "@retainpdf/api";
import { describeToolEvent as en } from "@retainpdf/domain/ai";
import { toSessionSummary as tn } from "@retainpdf/domain/session";
import { l as nn } from "./ask-answerer-BdU294ED.js";
import { getConversation as qe, messagesToBranchItems as Ie, nextForkConversationTitle as rn } from "@retainpdf/api/conversations";
import { c as _e } from "./ai-chat-ZSCffLDD.js";
import { agentOperationShouldReplace as sn, agentOperationEventSeq as an, agentOperationShouldPoll as on, agentOperationErrorStatus as cn, agentOperationErrorMessage as dn, resolveAgentOperationActionKey as ln, clearAgentOperationActionKey as un } from "@retainpdf/api/agent-operation-model";
function nt(t) {
  return t.content.filter((e) => e.type === "text").map((e) => e.text).join(`
`).trim();
}
function ze({ label: t }) {
  return /* @__PURE__ */ P("div", { className: "aui-thinking", role: "status", "aria-live": "polite", children: [
    /* @__PURE__ */ a(Ce, { className: "aui-spin", size: 14, strokeWidth: 2.4, "aria-hidden": !0 }),
    /* @__PURE__ */ a("span", { children: t || "思考中…" })
  ] });
}
function pn({ message: t }) {
  return /* @__PURE__ */ a(Ze.Root, { className: "aui-msg aui-msg-user", "data-role": "user", children: /* @__PURE__ */ a("div", { className: "aui-msg-bubble", children: /* @__PURE__ */ a("div", { className: "aui-md-plain", children: nt(t) }) }) });
}
function mn({
  jobId: t,
  message: e,
  citations: n,
  progress: r,
  incompleteReason: i,
  streaming: s,
  branchBusy: o,
  onJumpCitation: l,
  onBranchFromAnswer: p
}) {
  var h, f;
  const c = nt(e);
  return /* @__PURE__ */ a(Ze.Root, { className: "aui-msg aui-msg-assistant", "data-role": "assistant", children: /* @__PURE__ */ P("div", { className: "aui-msg-stack", children: [
    s && r ? /* @__PURE__ */ a(ze, { label: r }) : null,
    s && !r && !c ? /* @__PURE__ */ a(ze, { label: "思考中…" }) : null,
    !s && i === "rounds_exhausted" ? /* @__PURE__ */ a("div", { className: "aui-msg-truncated", role: "status", children: "检索与计算的步数已用尽，这个回答是提前收尾的——追问一句可以让它接着做。" }) : null,
    c ? /* @__PURE__ */ a("div", { className: "aui-msg-bubble", children: /* @__PURE__ */ a(
      ft,
      {
        content: c,
        streaming: s,
        citations: n,
        jobId: t,
        className: "aui-md",
        streamingClassName: "aui-md-streaming",
        pendingClassName: "aui-md-pending",
        finalClassName: "aui-md-final",
        onJumpCitation: l
      }
    ) }) : null,
    /* @__PURE__ */ P(
      Me.Root,
      {
        className: "aui-msg-actions",
        "data-reader-ai-actions": "",
        hideWhenRunning: !0,
        autohide: "not-last",
        children: [
          /* @__PURE__ */ a(Me.Copy, { className: "aui-action-btn", "aria-label": "复制答案", title: "复制答案", children: /* @__PURE__ */ a(bt, { size: 14, strokeWidth: 2.1, "aria-hidden": !0 }) }),
          p ? /* @__PURE__ */ a(
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
              children: /* @__PURE__ */ a(Rt, { size: 14, strokeWidth: 2.2, "aria-hidden": !0 })
            }
          ) : null,
          /* @__PURE__ */ a(Me.Reload, { className: "aui-action-btn", "aria-label": "重新生成", title: "重新生成", children: /* @__PURE__ */ a(Ct, { size: 14, strokeWidth: 2.2, "aria-hidden": !0 }) })
        ]
      }
    ),
    (f = (h = e.metadata) == null ? void 0 : h.custom) != null && f.source ? /* @__PURE__ */ a("div", { className: "reader-ai-answer-source", children: String(e.metadata.custom.source) }) : null
  ] }) });
}
function rt({
  jobId: t,
  citationsByMessageId: e,
  progressByMessageId: n,
  incompleteByMessageId: r,
  streamingAssistantId: i,
  isRunning: s,
  branchBusy: o,
  onJumpCitation: l,
  onBranchFromAnswer: p
}) {
  return /* @__PURE__ */ a("div", { className: "aui-message-group", "data-slot": "aui_message-group", children: /* @__PURE__ */ a(ae.Messages, { children: ({ message: c }) => {
    var f;
    if (c.role === "user") return /* @__PURE__ */ a(pn, { message: c });
    if (c.role !== "assistant") return null;
    const h = ((f = c.status) == null ? void 0 : f.type) === "running" || s && i === c.id;
    return /* @__PURE__ */ a(
      mn,
      {
        jobId: t,
        message: c,
        citations: e[c.id] || [],
        progress: n[c.id] || "",
        incompleteReason: r[c.id] || "",
        streaming: h,
        branchBusy: o,
        onJumpCitation: l,
        onBranchFromAnswer: p
      }
    );
  } }) });
}
function fn({
  mode: t,
  disabled: e,
  onChange: n
}) {
  return /* @__PURE__ */ P("div", { className: "aui-assistant-mode", role: "group", "aria-label": "AI 模式", children: [
    /* @__PURE__ */ P(
      "button",
      {
        type: "button",
        className: t !== "operations" ? "is-active" : "",
        "aria-pressed": t !== "operations",
        disabled: e,
        onClick: () => n == null ? void 0 : n("reading"),
        children: [
          /* @__PURE__ */ a(Ve, { size: 12, strokeWidth: 2.2, "aria-hidden": !0 }),
          /* @__PURE__ */ a("span", { children: "阅读问答" })
        ]
      }
    ),
    /* @__PURE__ */ P(
      "button",
      {
        type: "button",
        className: t === "operations" ? "is-active" : "",
        "aria-pressed": t === "operations",
        disabled: e,
        onClick: () => n == null ? void 0 : n("operations"),
        children: [
          /* @__PURE__ */ a(ge, { size: 12, strokeWidth: 2.2, "aria-hidden": !0 }),
          /* @__PURE__ */ a("span", { children: "PDF Agent" })
        ]
      }
    )
  ] });
}
function hn({
  selectionContext: t,
  onClear: e
}) {
  if (!t) return null;
  const n = t.selectionType === "text" ? "text" : t.kind, r = t.selectionType === "text" ? t.quote : et(t.region, t.pane), i = n === "formula" ? "公式" : n === "table" ? "表格" : n === "figure" ? "图片" : "文字";
  return /* @__PURE__ */ P("div", { className: "aui-selection-context", "data-reader-ai-selection-context": "", children: [
    /* @__PURE__ */ a(n === "formula" ? Ge : n === "table" ? Nt : n === "figure" ? kt : Mt, { size: 14, strokeWidth: 2.1, "aria-hidden": !0 }),
    /* @__PURE__ */ P("span", { className: "aui-selection-context-meta", children: [
      t.pane === "translated" ? "译文" : "原文",
      " · ",
      t.page,
      " 页 · ",
      i
    ] }),
    /* @__PURE__ */ a("span", { className: "aui-selection-context-text", children: r || "已选择此区域" }),
    /* @__PURE__ */ a(
      "button",
      {
        type: "button",
        className: "aui-selection-context-remove",
        "aria-label": "移除选区上下文",
        title: "移除选区",
        onClick: e,
        children: /* @__PURE__ */ a(Re, { size: 13, strokeWidth: 2.4, "aria-hidden": !0 })
      }
    )
  ] });
}
function st({
  isRunning: t,
  branchBusy: e,
  mode: n,
  onModeChange: r,
  selectionContext: i,
  onClearSelectionContext: s
}) {
  const o = He();
  return /* @__PURE__ */ P(ve.Root, { className: "aui-composer", "data-reader-ai-composer": "", children: [
    /* @__PURE__ */ P("div", { className: "aui-composer-shell", children: [
      n !== "operations" ? /* @__PURE__ */ a(hn, { selectionContext: i, onClear: s }) : null,
      /* @__PURE__ */ a(
        ve.Input,
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
      /* @__PURE__ */ P("div", { className: "aui-composer-toolbar", children: [
        /* @__PURE__ */ P("div", { className: "reader-ai-composer-leading", children: [
          o,
          /* @__PURE__ */ a(fn, { mode: n, disabled: t || e, onChange: r })
        ] }),
        /* @__PURE__ */ a("div", { className: "aui-composer-actions", children: t ? /* @__PURE__ */ a(ve.Cancel, { className: "aui-send aui-send-stop", "aria-label": "停止生成", children: /* @__PURE__ */ a(wt, { size: 12, strokeWidth: 2.6, "aria-hidden": !0 }) }) : /* @__PURE__ */ a(ve.Send, { className: "aui-send", "aria-label": "发送", children: /* @__PURE__ */ a(It, { size: 16, strokeWidth: 2.5, "aria-hidden": !0 }) }) })
      ] })
    ] }),
    /* @__PURE__ */ a("p", { className: "aui-hint", children: "AI 可能会出错，请核对原文与引用" })
  ] });
}
function at() {
  const t = He();
  return /* @__PURE__ */ P("div", { className: "aui-composer aui-composer-locked", role: "alert", children: [
    /* @__PURE__ */ a("p", { className: "aui-llm-lock-msg", children: "连接 AI 服务后即可提问" }),
    /* @__PURE__ */ a("p", { className: "aui-hint", children: "选择已登录的本机 Agent，或添加模型 API。" }),
    t
  ] });
}
const gn = [
  { prompt: "把第 1 页旋转 90 度。", label: "旋转页面", icon: Ae },
  { prompt: "删除最后一页。", label: "删除页面", icon: Ae }
];
function yn({
  jobId: t,
  empty: e,
  citationsByMessageId: n,
  progressByMessageId: r,
  incompleteByMessageId: i,
  streamingAssistantId: s,
  isRunning: o,
  missingLlmKey: l,
  branchBusy: p,
  agentRequestBlocked: c = !1,
  agentOperationPanel: h,
  onModeChange: f,
  onJumpCitation: C,
  onBranchFromAnswer: v
}) {
  const u = p || c;
  return /* @__PURE__ */ P(be, { children: [
    e ? /* @__PURE__ */ P("div", { className: "aui-empty", children: [
      /* @__PURE__ */ a("div", { className: "aui-empty-mascot", "aria-hidden": !0, children: /* @__PURE__ */ a("span", { className: "aui-empty-mascot-face", children: /* @__PURE__ */ a(ge, { size: 21, strokeWidth: 1.9 }) }) }),
      /* @__PURE__ */ a("h2", { className: "aui-empty-title", children: "想怎样处理 PDF？" }),
      /* @__PURE__ */ a("p", { className: "aui-empty-sub", children: "创建候选版本后由你预览和确认" }),
      /* @__PURE__ */ a("div", { className: "aui-suggestions", role: "group", "aria-label": "推荐问题", children: gn.map((M) => {
        const x = M.icon;
        return /* @__PURE__ */ P(
          ae.Suggestion,
          {
            prompt: M.prompt,
            send: !0,
            type: "button",
            className: "aui-suggestion",
            disabled: u || l,
            children: [
              /* @__PURE__ */ a(x, { size: 14, strokeWidth: 2, "aria-hidden": !0, className: "aui-suggestion-icon" }),
              /* @__PURE__ */ a("span", { className: "aui-suggestion-label", children: M.label })
            ]
          },
          M.prompt
        );
      }) })
    ] }) : null,
    /* @__PURE__ */ a(
      rt,
      {
        jobId: t,
        citationsByMessageId: n,
        progressByMessageId: r,
        incompleteByMessageId: i,
        streamingAssistantId: s,
        isRunning: o,
        branchBusy: p,
        onJumpCitation: C,
        onBranchFromAnswer: v
      }
    ),
    h,
    /* @__PURE__ */ P(ae.ViewportFooter, { className: "aui-thread-viewport-footer", children: [
      !e && !p ? /* @__PURE__ */ a(
        ae.ScrollToBottom,
        {
          className: "aui-scroll-bottom-btn aui-scroll-bottom",
          "aria-label": "滚到最新",
          children: /* @__PURE__ */ a(Qe, { size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
        }
      ) : null,
      l ? /* @__PURE__ */ a(at, {}) : /* @__PURE__ */ a(
        st,
        {
          isRunning: o,
          branchBusy: u,
          mode: "operations",
          onModeChange: f,
          selectionContext: null,
          onClearSelectionContext: void 0
        }
      )
    ] })
  ] });
}
function vn() {
  const t = Lt(), e = (n) => {
    var o, l, p;
    n.preventDefault();
    const r = `${((o = globalThis.getSelection) == null ? void 0 : o.call(globalThis)) || ""}`.trim();
    if (!r) return;
    const i = Gt(r);
    if (!i) return;
    const s = t.thread.composer();
    s.setText(Vt(s.getState().text || "", i));
    try {
      (p = (l = globalThis.getSelection) == null ? void 0 : l.call(globalThis)) == null || p.removeAllRanges();
    } catch {
    }
  };
  return /* @__PURE__ */ a(jt.Root, { className: "reader-ai-selection-toolbar", children: /* @__PURE__ */ P(
    "button",
    {
      type: "button",
      className: "reader-ai-selection-quote",
      onPointerDown: e,
      title: "引用这段话继续提问",
      children: [
        /* @__PURE__ */ a(_t, { size: 12, strokeWidth: 2.4, "aria-hidden": !0 }),
        /* @__PURE__ */ a("span", { children: "引用" })
      ]
    }
  ) });
}
const wn = [
  { prompt: "用几句话总结这篇文献的核心内容。", label: "总结本文", icon: Ve },
  { prompt: "这篇文献的主要结论是什么？", label: "提炼主要结论", icon: At },
  { prompt: "作者用了什么方法或模型？", label: "梳理方法与模型", icon: St },
  { prompt: "解释文中的关键公式。", label: "解释关键公式", icon: Ge }
];
function In({
  jobId: t,
  empty: e,
  citationsByMessageId: n,
  progressByMessageId: r,
  incompleteByMessageId: i,
  streamingAssistantId: s,
  isRunning: o,
  missingLlmKey: l,
  branchBusy: p,
  composerDisabled: c = !1,
  onModeChange: h,
  onJumpCitation: f,
  onBranchFromAnswer: C,
  selectionContext: v = null,
  onClearSelectionContext: u,
  footerExtra: M = null
}) {
  return /* @__PURE__ */ P(be, { children: [
    e ? /* @__PURE__ */ P("div", { className: "aui-empty", children: [
      /* @__PURE__ */ a("div", { className: "aui-empty-mascot", "aria-hidden": !0, children: /* @__PURE__ */ a("span", { className: "aui-empty-mascot-face", children: /* @__PURE__ */ a(ge, { size: 21, strokeWidth: 1.9 }) }) }),
      /* @__PURE__ */ a("h2", { className: "aui-empty-title", children: "一起读懂这篇文档" }),
      /* @__PURE__ */ a("p", { className: "aui-empty-sub", children: "总结、解释、检索与计算，不修改 PDF" }),
      /* @__PURE__ */ a("div", { className: "aui-suggestions", role: "group", "aria-label": "推荐问题", children: wn.map((x) => {
        const _ = x.icon;
        return /* @__PURE__ */ P(
          ae.Suggestion,
          {
            prompt: x.prompt,
            send: !0,
            type: "button",
            className: "aui-suggestion",
            disabled: p || c || l,
            children: [
              /* @__PURE__ */ a(_, { size: 14, strokeWidth: 2, "aria-hidden": !0, className: "aui-suggestion-icon" }),
              /* @__PURE__ */ a("span", { className: "aui-suggestion-label", children: x.label })
            ]
          },
          x.prompt
        );
      }) })
    ] }) : null,
    /* @__PURE__ */ a(vn, {}),
    /* @__PURE__ */ a(
      rt,
      {
        jobId: t,
        citationsByMessageId: n,
        progressByMessageId: r,
        incompleteByMessageId: i,
        streamingAssistantId: s,
        isRunning: o,
        branchBusy: p,
        onJumpCitation: f,
        onBranchFromAnswer: C
      }
    ),
    M,
    /* @__PURE__ */ P(ae.ViewportFooter, { className: "aui-thread-viewport-footer", children: [
      !e && !p ? /* @__PURE__ */ a(
        ae.ScrollToBottom,
        {
          className: "aui-scroll-bottom-btn aui-scroll-bottom",
          "aria-label": "滚到最新",
          children: /* @__PURE__ */ a(Qe, { size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
        }
      ) : null,
      l ? /* @__PURE__ */ a(at, {}) : /* @__PURE__ */ a(
        st,
        {
          isRunning: o,
          branchBusy: p || c,
          mode: "reading",
          onModeChange: h,
          selectionContext: v,
          onClearSelectionContext: u
        }
      )
    ] })
  ] });
}
function bn({
  jobId: t,
  messages: e,
  citationsByMessageId: n,
  progressByMessageId: r,
  incompleteByMessageId: i,
  streamingAssistantId: s,
  isRunning: o,
  missingLlmKey: l,
  branchBusy: p,
  agentRequestBlocked: c = !1,
  agentOperationPanel: h,
  assistantMode: f = "reading",
  onAssistantModeChange: C,
  onJumpCitation: v,
  onBranchFromAnswer: u,
  selectionContext: M = null,
  onClearSelectionContext: x
}) {
  const _ = e.length === 0, D = f === "operations";
  return /* @__PURE__ */ a(
    ae.Root,
    {
      className: `aui-thread aui-thread-root${l ? " is-llm-locked" : ""}`,
      "data-chat-ui": "assistant-ui-official-thread",
      children: /* @__PURE__ */ a(
        ae.Viewport,
        {
          className: "aui-viewport",
          "data-slot": "aui_thread-viewport",
          "data-reader-ai-viewport": "true",
          turnAnchor: "top",
          autoScroll: !0,
          children: /* @__PURE__ */ a("div", { className: `aui-thread-inner${_ ? " is-empty" : ""}`, children: D ? /* @__PURE__ */ a(
            yn,
            {
              jobId: t,
              empty: _,
              citationsByMessageId: n,
              progressByMessageId: r,
              incompleteByMessageId: i,
              streamingAssistantId: s,
              isRunning: o,
              missingLlmKey: l,
              branchBusy: p,
              agentRequestBlocked: c,
              agentOperationPanel: h,
              onModeChange: C,
              onJumpCitation: v,
              onBranchFromAnswer: u
            }
          ) : /* @__PURE__ */ a(
            In,
            {
              jobId: t,
              empty: _,
              citationsByMessageId: n,
              progressByMessageId: r,
              incompleteByMessageId: i,
              streamingAssistantId: s,
              isRunning: o,
              missingLlmKey: l,
              branchBusy: p,
              composerDisabled: c,
              onModeChange: C,
              onJumpCitation: v,
              onBranchFromAnswer: u,
              selectionContext: M,
              onClearSelectionContext: x
            }
          ) })
        }
      )
    }
  );
}
const it = "retainpdf.reader-agent-operation.dismissed.v1", Rn = /* @__PURE__ */ new Set(["failed", "cancelled"]);
function Be(t) {
  return [
    `${t.operation_id || ""}`.trim(),
    Number(t.current_attempt) || 0,
    `${t.status || ""}`
  ].join(":");
}
function Cn() {
  var t;
  try {
    const e = JSON.parse(((t = globalThis.localStorage) == null ? void 0 : t.getItem(it)) || "[]");
    return new Set(Array.isArray(e) ? e.filter((n) => typeof n == "string") : []);
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function Nn(t) {
  var e;
  try {
    (e = globalThis.localStorage) == null || e.setItem(
      it,
      JSON.stringify(Array.from(t).slice(-100))
    );
  } catch {
  }
}
function ot(t, e) {
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
function kn(t) {
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
function Mn(t) {
  return t === "failed" || t === "ambiguous" ? Je : t === "cancelled" ? Re : t === "committed" || t === "result_ready" ? Xe : ["queued", "running", "validating"].includes(t) ? Ce : Pt;
}
function _n({ events: t, mode: e }) {
  return /* @__PURE__ */ a("ol", { className: "reader-agent-operation-timeline", "aria-label": "PDF 操作步骤", children: t.map((n) => {
    const r = Mn(n.status), i = ["queued", "running", "validating"].includes(n.status);
    return /* @__PURE__ */ P("li", { children: [
      /* @__PURE__ */ a(r, { className: i ? "is-spinning" : "", size: 12, "aria-hidden": !0 }),
      /* @__PURE__ */ a("span", { children: n.summary || n.event || ot(n.status, e) }),
      /* @__PURE__ */ a("time", { children: n.ts ? new Date(n.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "" })
    ] }, `${n.attempt}:${n.seq}`);
  }) });
}
function An({
  operation: t,
  loadCandidate: e
}) {
  const [n, r] = U(!1), [i, s] = U(""), [o, l] = U(""), p = B("");
  return G(() => {
    let c = !1;
    return l(""), e(t).then((h) => {
      if (c) return;
      const f = URL.createObjectURL(h);
      p.current && URL.revokeObjectURL(p.current), p.current = f, s(f);
    }).catch(() => {
      c || l("候选 PDF 加载失败，请重试。");
    }), () => {
      c = !0;
    };
  }, [e, t.operation_id, t.current_attempt]), G(() => () => {
    p.current && URL.revokeObjectURL(p.current);
  }, []), /* @__PURE__ */ P(be, { children: [
    /* @__PURE__ */ P("div", { className: "reader-agent-operation-candidate", children: [
      /* @__PURE__ */ P("div", { children: [
        /* @__PURE__ */ a(Ae, { size: 13, "aria-hidden": !0 }),
        /* @__PURE__ */ a("span", { children: "候选 PDF" })
      ] }),
      /* @__PURE__ */ a("button", { type: "button", disabled: !i, onClick: () => r((c) => !c), children: i ? n ? "收起" : "预览" : "加载中…" }),
      /* @__PURE__ */ a(
        "button",
        {
          type: "button",
          disabled: !i,
          "aria-label": "新窗口打开候选 PDF",
          onClick: () => window.open(i, "_blank", "noopener,noreferrer"),
          children: /* @__PURE__ */ a(Et, { size: 12, "aria-hidden": !0 })
        }
      )
    ] }),
    n ? /* @__PURE__ */ a("iframe", { className: "reader-agent-operation-preview", src: i, title: "候选 PDF 预览" }) : null,
    o ? /* @__PURE__ */ a("p", { className: "reader-agent-operation-error", role: "alert", children: o }) : null
  ] });
}
function Sn({
  entry: t,
  mode: e,
  loadCandidate: n,
  onAction: r,
  onDismiss: i
}) {
  var x;
  const { operation: s, pendingAction: o, error: l } = t, [p, c] = U(!1), [h, f] = U(!1), C = s.events || [], v = kn(s.status), u = !!((s.status === "result_ready" || s.status === "committed") && s.candidate_available), M = Rn.has(s.status);
  return /* @__PURE__ */ P("article", { className: `reader-agent-operation-card is-${s.status}`, "data-operation-id": s.operation_id, children: [
    /* @__PURE__ */ P("header", { children: [
      /* @__PURE__ */ a("span", { className: "reader-agent-operation-icon", "aria-hidden": !0, children: /* @__PURE__ */ a(Tt, { size: 15 }) }),
      /* @__PURE__ */ P("div", { className: "reader-agent-operation-title", children: [
        /* @__PURE__ */ a("span", { children: "PDF 操作" }),
        /* @__PURE__ */ a("strong", { children: s.intent_summary || "处理当前 PDF" })
      ] }),
      /* @__PURE__ */ P("div", { className: "reader-agent-operation-head-actions", children: [
        /* @__PURE__ */ a("span", { className: "reader-agent-operation-status", children: ot(s.status, e) }),
        M ? /* @__PURE__ */ a(
          "button",
          {
            type: "button",
            className: "reader-agent-operation-dismiss",
            "aria-label": s.status === "failed" ? "隐藏这条失败提示" : "隐藏这条已取消提示",
            title: "隐藏",
            onClick: () => i(s),
            children: /* @__PURE__ */ a(Re, { size: 13, "aria-hidden": !0 })
          }
        ) : null
      ] })
    ] }),
    (x = s.affected_pages) != null && x.length ? /* @__PURE__ */ P("p", { className: "reader-agent-operation-scope", children: [
      "影响页码：",
      s.affected_pages.join("、")
    ] }) : null,
    C.length ? /* @__PURE__ */ P("div", { className: "reader-agent-operation-details", children: [
      /* @__PURE__ */ P("button", { type: "button", onClick: () => c((_) => !_), children: [
        p ? /* @__PURE__ */ a(xt, { size: 12, "aria-hidden": !0 }) : /* @__PURE__ */ a(Ye, { size: 12, "aria-hidden": !0 }),
        p ? "收起步骤" : `执行步骤 ${C.length}`
      ] }),
      p ? /* @__PURE__ */ a(_n, { events: C, mode: e }) : null
    ] }) : null,
    u ? /* @__PURE__ */ a(An, { operation: s, loadCandidate: n }) : null,
    l ? /* @__PURE__ */ a("p", { className: "reader-agent-operation-error", role: "alert", children: l }) : null,
    h ? /* @__PURE__ */ P("div", { className: "reader-agent-operation-risk", role: "alertdialog", "aria-label": "确认重复执行风险", children: [
      /* @__PURE__ */ a(Je, { size: 14, "aria-hidden": !0 }),
      /* @__PURE__ */ a("p", { children: "上一次执行结果不确定，重试可能重复操作。确认接受风险后再继续。" }),
      /* @__PURE__ */ P("div", { children: [
        /* @__PURE__ */ a("button", { type: "button", onClick: () => f(!1), disabled: !!o, children: "返回" }),
        /* @__PURE__ */ a(
          "button",
          {
            type: "button",
            className: "is-danger",
            disabled: !!o,
            onClick: async () => {
              await r("retry", s, { acceptDuplicateRisk: !0 }), f(!1);
            },
            children: o === "retry" ? "处理中…" : "接受风险并重试"
          }
        )
      ] })
    ] }) : v.length ? /* @__PURE__ */ a("div", { className: "reader-agent-operation-actions", children: v.map((_) => /* @__PURE__ */ a(
      "button",
      {
        type: "button",
        className: _.primary ? "is-primary" : _.danger ? "is-danger" : "",
        disabled: !!o,
        onClick: () => {
          _.risk ? f(!0) : r(_.action, s);
        },
        children: o === _.action ? "处理中…" : _.label
      },
      _.action
    )) }) : null
  ] });
}
function $n({
  entries: t,
  confirmationMode: e,
  runtimeRestarting: n,
  loadCandidate: r,
  onAction: i
}) {
  const [s, o] = U(Cn), l = t.filter((c) => !s.has(Be(c.operation)));
  function p(c) {
    const h = Be(c);
    o((f) => {
      const C = new Set(f);
      return C.add(h), Nn(C), C;
    });
  }
  return /* @__PURE__ */ P("section", { className: `reader-agent-operations${l.length ? " has-operations" : ""}`, "aria-label": "AI PDF 操作", children: [
    /* @__PURE__ */ P("div", { className: `reader-agent-mode${e === "green_light" ? " is-green" : ""}`, children: [
      /* @__PURE__ */ a($t, { size: 13, "aria-hidden": !0 }),
      /* @__PURE__ */ a("span", { children: e === "green_light" ? "绿灯模式 · 自动执行并应用" : "需要确认 · 操作前等待授权" })
    ] }),
    n ? /* @__PURE__ */ P("div", { className: "reader-agent-restarting", role: "status", children: [
      /* @__PURE__ */ a(Ce, { className: "is-spinning", size: 13, "aria-hidden": !0 }),
      "正在重启 Agent，新请求暂不可用"
    ] }) : null,
    l.map((c) => /* @__PURE__ */ a(
      Sn,
      {
        entry: c,
        mode: e,
        loadCandidate: r,
        onAction: i,
        onDismiss: p
      },
      c.operation.operation_id
    ))
  ] });
}
const Tn = (t) => t, xn = Object.freeze([]), En = Object.freeze({}), Le = Object.freeze({}), Pn = Object.freeze({
  entries: [],
  confirmationMode: "explicit",
  runtimeRestarting: !1,
  runtimeCredentialConfigured: !1,
  perform: async () => {
  },
  loadCandidate: async () => new Blob()
});
function On(t) {
  return t.content.filter((e) => e.type === "text").map((e) => e.text).join(`
`).trim();
}
function Dn(t, e, n) {
  var r, i, s, o;
  return ((r = t.status) == null ? void 0 : r.type) === "running" || n && e === t.id ? { type: "running" } : ((i = t.status) == null ? void 0 : i.type) === "incomplete" || ((s = t.status) == null ? void 0 : s.type) === "error" ? {
    type: "incomplete",
    reason: ((o = t.status) == null ? void 0 : o.reason) === "cancelled" ? "cancelled" : "error"
  } : { type: "complete", reason: "stop" };
}
function Fn({
  connectionConfigured: t = !1,
  connectionBlocked: e = !1,
  jobId: n = "",
  messages: r = xn,
  citationsByMessageId: i = En,
  progressByMessageId: s = Le,
  contentByMessageId: o = Le,
  streamingAssistantId: l = "",
  isRunning: p = !1,
  onSubmit: c,
  onRetry: h,
  onCancel: f,
  onJumpCitation: C,
  onBranchFromAnswer: v,
  branchBusy: u = !1,
  agentOperations: M = Pn,
  assistantMode: x = "reading",
  onAssistantModeChange: _,
  selectionContext: D = null,
  onClearSelectionContext: O
}) {
  const [, I] = U(0);
  G(() => {
    const d = () => I((N) => N + 1);
    return window.addEventListener("focus", d), window.addEventListener("storage", d), document.addEventListener(Fe, d), () => {
      window.removeEventListener("focus", d), window.removeEventListener("storage", d), document.removeEventListener(Fe, d);
    };
  }, []);
  const F = e || !t && !Ut() && !M.runtimeCredentialConfigured, g = X(() => r.map((d) => ({
    id: d.id,
    role: d.role,
    content: o[d.id] || d.content || "",
    ...d.source ? { metadata: { custom: { source: d.source } } } : {},
    ...d.role === "assistant" ? { status: Dn(d, l, p) } : {}
  })), [o, p, r, l]), b = X(() => {
    var N, E;
    const d = {};
    for (const A of r) {
      if (A.role !== "assistant") continue;
      const y = `${((N = A.status) == null ? void 0 : N.reason) || ""}`.trim();
      ((E = A.status) == null ? void 0 : E.type) === "incomplete" && y && y !== "cancelled" && (d[A.id] = y);
    }
    return d;
  }, [r]), R = V(async (d) => {
    const N = d ? Math.max(0, r.findIndex((A) => A.id === d) + 1) : 0, E = r.slice(N).find((A) => A.role === "assistant");
    E && await h(E.id);
  }, [r, h]), $ = V(async (d) => {
    const N = On(d);
    !N || p || u || M.runtimeRestarting || F || await c(N);
  }, [M.runtimeRestarting, u, p, F, c]), m = V(async () => {
    await f();
  }, [f]), w = X(() => ({
    messages: g,
    isRunning: p,
    isDisabled: u || M.runtimeRestarting || F,
    convertMessage: Tn,
    onNew: $,
    onReload: R,
    onCancel: m
  }), [
    M.runtimeRestarting,
    u,
    m,
    $,
    p,
    F,
    R,
    g
  ]), T = Kt(w);
  return /* @__PURE__ */ a(Wt, { runtime: T, children: /* @__PURE__ */ a(
    bn,
    {
      jobId: n,
      messages: r,
      citationsByMessageId: i,
      progressByMessageId: s,
      incompleteByMessageId: b,
      streamingAssistantId: l,
      isRunning: p,
      missingLlmKey: F,
      branchBusy: u,
      agentRequestBlocked: M.runtimeRestarting,
      assistantMode: x,
      onAssistantModeChange: _,
      selectionContext: D,
      onClearSelectionContext: O,
      agentOperationPanel: M.entries.length > 0 || M.runtimeRestarting ? /* @__PURE__ */ a(
        $n,
        {
          entries: M.entries,
          confirmationMode: M.confirmationMode,
          runtimeRestarting: M.runtimeRestarting,
          loadCandidate: M.loadCandidate,
          onAction: M.perform
        }
      ) : null,
      onJumpCitation: C,
      onBranchFromAnswer: v
    }
  ) });
}
function we(t = 900, e = 0) {
  ue(t, { overlayDelayMs: e }), oe(t);
}
function qn({
  sessions: t,
  activeId: e,
  busy: n = !1,
  disabled: r = !1,
  errorText: i = "",
  onSwitch: s,
  onNew: o,
  onDelete: l,
  onRename: p
}) {
  const c = t.length > 0, h = n || r, [f, C] = U(!1), [v, u] = U(""), [M, x] = U(""), _ = B(null), D = mt();
  function O(d) {
    const N = `${d || ""}`.match(/^fork-(\d+)-(.*)$/i);
    if (!N) return d;
    const E = N[2].trim();
    return E ? `${E} · 分支${N[1]}` : `分支${N[1]}`;
  }
  const I = B(!1), F = B(null), g = t.find((d) => d.id === e) || null, b = g ? g.messageCount ? O(g.title) : `${O(g.title)}（空）` : c ? "选择以往对话" : "新对话";
  G(() => {
    if (!f) {
      u("");
      return;
    }
    const d = (A) => {
      if (I.current) return;
      const y = _.current;
      y && (A.target instanceof Node && y.contains(A.target) || (C(!1), u("")));
    }, N = (A) => {
      A.key === "Escape" && (C(!1), u(""));
    }, E = window.setTimeout(() => {
      document.addEventListener("pointerdown", d, !0);
    }, 0);
    return document.addEventListener("keydown", N), () => {
      window.clearTimeout(E), document.removeEventListener("pointerdown", d, !0), document.removeEventListener("keydown", N);
    };
  }, [f]), G(() => {
    if (!v) return;
    const d = F.current;
    d && (d.focus(), d.select());
  }, [v]);
  const R = (d) => {
    const N = `${d || ""}`.trim();
    !N || h || I.current || v || (I.current = !0, we(1e3, 0), requestAnimationFrame(() => {
      C(!1), window.setTimeout(() => {
        (async () => {
          try {
            await s(N);
          } finally {
            we(400, 0), I.current = !1;
          }
        })();
      }, 40);
    }));
  }, $ = (d) => {
    h || (u(d.id), x(d.title || ""));
  }, m = () => {
    const d = v, N = M;
    u(""), d && p(d, N);
  }, w = () => {
    u(""), x("");
  }, T = (d) => {
    var A;
    if (h || I.current) return;
    const N = d.title || "未命名对话";
    (A = globalThis.confirm) != null && A.call(globalThis, `确定删除对话「${N}」？此操作不可恢复。`) && (I.current = !0, we(800, 0), (async () => {
      try {
        await l(d.id);
      } finally {
        I.current = !1;
      }
    })());
  };
  return /* @__PURE__ */ P(
    "div",
    {
      className: "aui-session-bar",
      "data-reader-ai-sessions": "",
      ref: _,
      onPointerDown: (d) => {
        d.stopPropagation();
      },
      onClick: (d) => {
        d.stopPropagation();
      },
      children: [
        /* @__PURE__ */ P("div", { className: "aui-session-row", children: [
          /* @__PURE__ */ P(
            "button",
            {
              type: "button",
              className: `aui-session-trigger${f ? " is-open" : ""}`,
              "aria-label": "切换对话窗口",
              "aria-haspopup": "listbox",
              "aria-expanded": f,
              "aria-controls": D,
              disabled: h || !c,
              title: b,
              onClick: () => {
                h || !c || C((d) => !d);
              },
              children: [
                /* @__PURE__ */ a("span", { className: "aui-session-trigger-label", children: b }),
                /* @__PURE__ */ a(Ye, { size: 14, strokeWidth: 2.4, "aria-hidden": !0 })
              ]
            }
          ),
          /* @__PURE__ */ P(
            "button",
            {
              type: "button",
              className: "aui-session-btn",
              disabled: h,
              title: "新对话窗口",
              "aria-label": "新对话",
              onClick: () => {
                h || I.current || (I.current = !0, we(800), C(!1), u(""), window.setTimeout(() => {
                  (async () => {
                    try {
                      await o();
                    } finally {
                      I.current = !1;
                    }
                  })();
                }, 40));
              },
              children: [
                n ? /* @__PURE__ */ a(Ce, { className: "aui-spin", size: 14, strokeWidth: 2.4, "aria-hidden": !0 }) : /* @__PURE__ */ a(Ot, { size: 14, strokeWidth: 2.4, "aria-hidden": !0 }),
                /* @__PURE__ */ a("span", { children: "新对话" })
              ]
            }
          )
        ] }),
        f && c ? /* @__PURE__ */ a(
          "ul",
          {
            id: D,
            className: "aui-session-list",
            role: "listbox",
            "aria-label": "以往对话",
            children: t.map((d) => {
              const N = d.messageCount ? O(d.title) : `${O(d.title)}（空）`, E = d.id === e, A = v === d.id;
              return /* @__PURE__ */ a("li", { className: "aui-session-row-item", role: "presentation", children: A ? /* @__PURE__ */ P("div", { className: "aui-session-edit", children: [
                /* @__PURE__ */ a(
                  "input",
                  {
                    ref: F,
                    className: "aui-session-edit-input",
                    value: M,
                    maxLength: 80,
                    "aria-label": "对话标题",
                    disabled: h,
                    onChange: (y) => x(y.target.value),
                    onKeyDown: (y) => {
                      y.key === "Enter" ? (y.preventDefault(), m()) : y.key === "Escape" && (y.preventDefault(), w());
                    },
                    onClick: (y) => y.stopPropagation()
                  }
                ),
                /* @__PURE__ */ a(
                  "button",
                  {
                    type: "button",
                    className: "aui-session-icon-btn",
                    "aria-label": "保存标题",
                    title: "保存",
                    disabled: h || !M.trim(),
                    onClick: (y) => {
                      y.stopPropagation(), m();
                    },
                    children: /* @__PURE__ */ a(Xe, { size: 13, strokeWidth: 2.5, "aria-hidden": !0 })
                  }
                ),
                /* @__PURE__ */ a(
                  "button",
                  {
                    type: "button",
                    className: "aui-session-icon-btn",
                    "aria-label": "取消重命名",
                    title: "取消",
                    disabled: h,
                    onClick: (y) => {
                      y.stopPropagation(), w();
                    },
                    children: /* @__PURE__ */ a(Re, { size: 13, strokeWidth: 2.5, "aria-hidden": !0 })
                  }
                )
              ] }) : /* @__PURE__ */ P(be, { children: [
                /* @__PURE__ */ P(
                  "button",
                  {
                    type: "button",
                    role: "option",
                    "aria-selected": E,
                    className: `aui-session-item${E ? " is-active" : ""}`,
                    disabled: h,
                    title: N,
                    onPointerDown: (y) => {
                      y.stopPropagation(), !E && !h && oe(1e3);
                    },
                    onClick: (y) => {
                      if (y.preventDefault(), y.stopPropagation(), E) {
                        C(!1);
                        return;
                      }
                      R(d.id);
                    },
                    children: [
                      /* @__PURE__ */ a("span", { className: "aui-session-item-title", children: N }),
                      E ? /* @__PURE__ */ a("span", { className: "aui-session-item-badge", children: "当前" }) : null
                    ]
                  }
                ),
                /* @__PURE__ */ a(
                  "button",
                  {
                    type: "button",
                    className: "aui-session-icon-btn",
                    "aria-label": `重命名 ${N}`,
                    title: "重命名",
                    disabled: h,
                    onClick: (y) => {
                      y.preventDefault(), y.stopPropagation(), $(d);
                    },
                    children: /* @__PURE__ */ a(Dt, { size: 13, strokeWidth: 2.4, "aria-hidden": !0 })
                  }
                ),
                /* @__PURE__ */ a(
                  "button",
                  {
                    type: "button",
                    className: "aui-session-icon-btn is-danger",
                    "aria-label": `删除 ${N}`,
                    title: "删除",
                    disabled: h,
                    onClick: (y) => {
                      y.preventDefault(), y.stopPropagation(), T(d);
                    },
                    children: /* @__PURE__ */ a(Ft, { size: 13, strokeWidth: 2.4, "aria-hidden": !0 })
                  }
                )
              ] }) }, d.id);
            })
          }
        ) : null,
        i ? /* @__PURE__ */ a("div", { className: "aui-session-error", role: "alert", children: i }) : null
      ]
    }
  );
}
function ct(t) {
  return ((t == null ? void 0 : t.parts) || []).filter((e) => e.type === "text").map((e) => e.text).join("").trim();
}
function zn(t, e) {
  const n = `${e.question || ""}`.trim();
  if (n) return n;
  for (let r = t.length - 1; r >= 0; r -= 1) {
    const i = t[r];
    if (i.role !== "user") continue;
    const s = ct(i);
    if (s) return s;
  }
  return "";
}
function Bn(t) {
  const e = Number(t == null ? void 0 : t.status) || 0, n = `${(t == null ? void 0 : t.message) || ""}`;
  return e === 502 || /\b502\b/.test(n);
}
class Ln {
  constructor(e) {
    this.options = e;
  }
  async sendMessages({
    abortSignal: e,
    body: n,
    messages: r,
    trigger: i
  }) {
    var D, O, I, F, g;
    const s = n || {}, o = zn(r, s);
    if (!o) throw new Error("请输入问题。");
    const l = s.assistantMode || ((O = (D = this.options).getAssistantMode) == null ? void 0 : O.call(D)) || "reading", p = s.scope || "document", c = s.context ? { ...s.context } : null, h = `${s.assistantMessageId || ""}`.trim() || `a-${Date.now().toString(36)}`, f = `${h}-text`, C = this.options.getRemoteAnswerer(), v = ((F = (I = this.options).getLocalAnswerer) == null ? void 0 : F.call(I)) || null, u = Zt(((g = C == null ? void 0 : C.getConversationId) == null ? void 0 : g.call(C)) || ""), M = { connectionId: u.connectionId, connectionModel: u.model, connectionOptions: { ...u.options } };
    if (!C && !v)
      throw new Error("问答暂不可用：请确认已打开任务阅读器。");
    let x = !1;
    const _ = /* @__PURE__ */ new Set();
    return new ReadableStream({
      cancel: () => {
        x = !0;
      },
      start: (b) => {
        let R = "", $ = {
          citations: [],
          progress: i === "regenerate-message" ? "正在重新生成…" : "正在检索文档…",
          status: "running"
        };
        const m = (T) => {
          if (!x)
            try {
              b.enqueue(T);
            } catch {
              x = !0;
            }
        }, w = (T) => {
          $ = { ...$, ...T }, m({ type: "message-metadata", messageMetadata: $ });
        };
        m({ type: "start", messageId: h, messageMetadata: $ }), m({ type: "start-step" }), m({ type: "text-start", id: f }), (async () => {
          var T, d, N, E, A, y;
          try {
            if (await ((T = C == null ? void 0 : C.ensureLoaded) == null ? void 0 : T.call(C, this.options.jobId)), e != null && e.aborted) throw new Error("aborted");
            let q = C || v, K = !1, k;
            try {
              k = await q.answer({
                question: o,
                ...M,
                assistantMode: l,
                scope: p,
                context: c,
                parentId: `${s.parentId || ""}`.trim(),
                regenerate: s.regenerate ?? i === "regenerate-message",
                userMessageId: `${s.userMessageId || ""}`.trim(),
                assistantMessageId: h,
                onAgentSessionEvent: (S) => {
                  var ee, Y, j;
                  const z = (ee = S == null ? void 0 : S.capabilities) == null ? void 0 : ee.document_operation_confirmation_mode;
                  (z === "explicit" || z === "green_light") && ((j = (Y = this.options).onConfirmationMode) == null || j.call(Y, z));
                },
                onAgentOperationEvent: (S) => {
                  var ee, Y;
                  const z = `${(S == null ? void 0 : S.operation_id) || ""}`.trim();
                  z && ((Y = (ee = this.options).onAgentOperationSignal) == null || Y.call(ee, {
                    operationId: z,
                    conversationId: `${(S == null ? void 0 : S.conversation_id) || ""}`.trim() || void 0
                  }));
                },
                onAgentConfirmationRequiredEvent: (S) => {
                  var J, H;
                  const z = `${(S == null ? void 0 : S.operation_id) || ""}`.trim();
                  if (!z) return;
                  const ee = `${(S == null ? void 0 : S.action) || ""}`, Y = `${(S == null ? void 0 : S.current_attempt) ?? ""}`, j = `${z}:${Y}:${ee}`;
                  _.has(j) || (_.add(j), (H = (J = this.options).onAgentOperationSignal) == null || H.call(J, { operationId: z }));
                },
                onToolEvent: (S) => {
                  if (R || e != null && e.aborted) return;
                  const z = en(S);
                  z && w({ progress: z });
                },
                onProgressEvent: (S) => {
                  if (R || e != null && e.aborted) return;
                  const z = `${(S == null ? void 0 : S.message) || ""}`.trim();
                  z && w({ progress: z });
                },
                onAnswerDelta: (S, z) => {
                  !z || e != null && e.aborted || (R += z, $.progress && w({ progress: "" }), m({ type: "text-delta", id: f, delta: z }));
                },
                onCompress: (S) => {
                  if (R || e != null && e.aborted) return;
                  const z = Number(S == null ? void 0 : S.dropped_turns) || 0;
                  z && w({ progress: `已压缩 ${z} 轮早期对话` });
                },
                signal: e
              });
            } catch (S) {
              if (e != null && e.aborted || l === "operations" || !C || !v || !Bn(S)) throw S;
              if (K = !0, w({ progress: "在线服务暂不可用，改用本地检索…" }), await ((d = v.ensureLoaded) == null ? void 0 : d.call(v, this.options.jobId)), e != null && e.aborted) throw new Error("aborted");
              q = v, k = await q.answer({
                question: o,
                assistantMode: l,
                scope: p,
                context: c,
                signal: e
              });
            }
            if (e != null && e.aborted) {
              w({ progress: "", status: "cancelled", statusText: "已取消" }), m({ type: "abort", reason: "cancelled" });
              return;
            }
            const L = k == null ? void 0 : k.confirmationMode;
            (L === "explicit" || L === "green_light") && ((E = (N = this.options).onConfirmationMode) == null || E.call(N, L));
            const Q = `${(k == null ? void 0 : k.conversationId) || ""}`.trim() || void 0, Z = /* @__PURE__ */ new Set();
            for (const S of (k == null ? void 0 : k.operationRefs) || []) {
              const z = typeof S == "string" ? S : `${(S == null ? void 0 : S.operation_id) || ""}`;
              z.trim() && Z.add(z.trim());
            }
            for (const S of (k == null ? void 0 : k.confirmationRequests) || []) {
              const z = `${(S == null ? void 0 : S.operation_id) || ""}`.trim();
              z && Z.add(z);
            }
            for (const S of Z)
              (y = (A = this.options).onAgentOperationSignal) == null || y.call(A, {
                operationId: S,
                conversationId: Q,
                confirmationMode: L || void 0
              });
            const te = Ht(k == null ? void 0 : k.citations);
            let ne = Qt(
              `${(k == null ? void 0 : k.answer) || R || ""}`.trim() || "没有找到可用回答。",
              te
            );
            if (K && (ne += `

_在线服务暂不可用，以上来自本地文档检索。_`), (k == null ? void 0 : k.persisted) === !1 && (ne += `

_⚠️ 本轮回答未能写入历史记录（存储暂时不可用），刷新后可能丢失。_`), !R)
              m({ type: "text-delta", id: f, delta: ne });
            else if (ne.startsWith(R)) {
              const S = ne.slice(R.length);
              S && m({ type: "text-delta", id: f, delta: S });
            }
            m({ type: "text-end", id: f }), w({
              citations: te,
              persisted: (k == null ? void 0 : k.persisted) !== !1,
              progress: "",
              status: "complete",
              incompleteReason: `${(k == null ? void 0 : k.incompleteReason) || ""}`.trim(),
              source: `${(k == null ? void 0 : k.source) || ""}`.trim()
            }), m({ type: "finish-step" }), m({ type: "finish", finishReason: "stop", messageMetadata: $ });
          } catch (q) {
            if (e != null && e.aborted)
              w({ progress: "", status: "cancelled", statusText: "已取消" }), m({ type: "abort", reason: "cancelled" });
            else {
              const K = q instanceof Error && q.message ? q.message : "生成回答失败，请重试。";
              w({ progress: "", status: "error", statusText: K }), m({ type: "error", errorText: K });
            }
          } finally {
            if (!x) {
              x = !0;
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
function jn(t) {
  return ct(t);
}
function dt(t) {
  return t.map((e) => {
    var n, r;
    return {
      id: e.id,
      role: e.role,
      metadata: e.role === "assistant" ? {
        citations: e.citations || [],
        ...e.source ? { source: e.source } : {},
        progress: e.progress || "",
        status: ((n = e.status) == null ? void 0 : n.type) === "running" ? "running" : ((r = e.status) == null ? void 0 : r.type) === "incomplete" ? e.status.reason === "cancelled" ? "cancelled" : "error" : "complete"
      } : void 0,
      parts: [{ type: "text", text: e.content || "" }]
    };
  });
}
function Kn(t) {
  const e = t.metadata || {}, n = e.status === "running", r = e.status === "cancelled" || e.status === "error", i = jn(t), s = i.trim() || (r ? `${e.statusText || ""}`.trim() : "");
  return {
    id: t.id,
    role: t.role,
    content: t.role === "assistant" ? s : i,
    ...t.role === "assistant" ? {
      citations: e.citations || [],
      ...e.source ? { source: e.source } : {},
      progress: e.progress || "",
      // 「答完了但没做完」和「中断/出错」是两回事:正文是完整的一段话,只是背后的
      // 工作被轮次预算截断了。所以它走 incomplete + 具体原因,而不是 error。
      status: n ? { type: "running" } : r ? {
        type: "incomplete",
        reason: e.status === "cancelled" ? "cancelled" : "error"
      } : `${e.incompleteReason || ""}`.trim() ? {
        type: "incomplete",
        reason: `${e.incompleteReason}`.trim()
      } : { type: "complete", reason: "stop" }
    } : {}
  };
}
function Wn(t) {
  const e = B(t.remoteAnswerer), n = B(t.localAnswerer), r = B(t.onAgentOperationSignal), i = B(t.onConfirmationMode), s = B(t.onStopped);
  s.current = t.onStopped;
  const o = B(t.assistantMode);
  e.current = t.remoteAnswerer, n.current = t.localAnswerer, r.current = t.onAgentOperationSignal, i.current = t.onConfirmationMode, o.current = t.assistantMode;
  const l = X(() => new Jt({
    id: `reader-${t.jobId || "idle"}`,
    transport: new Ln({
      jobId: t.jobId,
      getRemoteAnswerer: () => e.current,
      getLocalAnswerer: () => n.current,
      getAssistantMode: () => o.current,
      onAgentOperationSignal: (p) => {
        var c;
        return (c = r.current) == null ? void 0 : c.call(r, p);
      },
      onConfirmationMode: (p) => {
        var c;
        return (c = i.current) == null ? void 0 : c.call(i, p);
      }
    })
  }), [t.jobId]);
  return G(() => {
    t.enabled || l.stop().finally(() => {
      var p;
      return (p = s.current) == null ? void 0 : p.call(s);
    });
  }, [l, t.enabled]), G(() => () => {
    l.stop().finally(() => {
      var p;
      return (p = s.current) == null ? void 0 : p.call(s);
    });
  }, [l]), Xt({ chat: l, experimental_throttle: 16 });
}
function Un(t) {
  for (let e = t.length - 1; e >= 0; e -= 1)
    if (t[e].role === "assistant") return t[e];
}
function Te(t, e) {
  return {
    version: 1,
    headId: e,
    items: t.map((n) => {
      var r;
      return {
        parentId: n.parentId,
        message: {
          id: n.message.id,
          role: n.message.role,
          content: n.message.content,
          ...n.message.progress ? { progress: n.message.progress } : {},
          ...n.message.source ? { source: n.message.source } : {},
          ...(r = n.message.citations) != null && r.length ? { citations: n.message.citations } : {},
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
function lt(t) {
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
  const n = new Map(t.map((l) => [l.message.id, l])), r = e && n.get(e) || t.at(-1);
  if (!r) return [];
  const i = [];
  let s = r;
  const o = /* @__PURE__ */ new Set();
  for (; s && !o.has(s.message.id); )
    o.add(s.message.id), i.push(s.message), s = s.parentId ? n.get(s.parentId) : void 0;
  return i.reverse();
}
function Hn(t, e) {
  var n;
  return e ? ((n = t.find((r) => r.message.id === e)) == null ? void 0 : n.message) ?? null : null;
}
function Gn(t, e) {
  const n = new Map(t.map((o) => [o.message.id, o]));
  let r = n.get(e);
  if (!r) return [];
  const i = [], s = /* @__PURE__ */ new Set();
  for (; r && !s.has(r.message.id); )
    s.add(r.message.id), i.push(r), r = r.parentId ? n.get(r.parentId) : void 0;
  return i.reverse();
}
function Vn(t, e, n) {
  var h, f, C, v;
  const r = `${e || ""}`.trim();
  if (!r || !t.length) return [];
  let i = r;
  t.some((u) => u.message.id === i) || (n && t.some((u) => u.message.id === n) ? i = n : i = ((h = [...t].reverse().find((u) => u.message.role === "assistant")) == null ? void 0 : h.message.id) || "");
  let s = Gn(t, i);
  if (s.length >= 2 && ((f = s.at(-1)) == null ? void 0 : f.message.role) === "assistant") return s;
  s.length === 1 && ((C = s[0]) == null ? void 0 : C.message.role) === "user" && (s = []);
  const o = ce(t, n || i);
  let l = o.findIndex((u) => u.id === i);
  if (l < 0 && (l = o.length - 1), l < 0) return s;
  const p = new Map(t.map((u) => [u.message.id, u])), c = o.slice(0, l + 1).map((u) => p.get(u.id)).filter((u) => !!u);
  for (; c.length && ((v = c.at(-1)) == null ? void 0 : v.message.role) !== "assistant"; ) c.pop();
  return c.length ? c : s;
}
function Se(t) {
  return t.map((e) => ({
    parentId: e.parentId,
    message: {
      ...e.message,
      citations: e.message.citations || [],
      status: e.message.status
    }
  }));
}
const Qn = {
  stopStream: () => Promise.resolve(),
  clearMessages: () => {
  },
  showMessages: () => {
  }
};
function Yn(t) {
  var n;
  const e = {};
  for (const r of t) {
    const i = r.message;
    i.role === "assistant" && ((n = i.citations) != null && n.length) && (e[i.id] = i.citations);
  }
  return e;
}
function Jn(t) {
  const e = {};
  for (const n of t) {
    const r = n.message;
    r.role === "assistant" && r.progress && (e[r.id] = r.progress);
  }
  return e;
}
function Xn(t) {
  const e = {};
  for (const n of t) {
    const r = n.message;
    r.content && (e[r.id] = r.content);
  }
  return e;
}
function Zn(t, e, n) {
  var i;
  const r = e || ((i = n == null ? void 0 : n.getConversationId) == null ? void 0 : i.call(n)) || "";
  return (t || []).map((s) => ({
    ...tn(s, { active: r }),
    active: s.conversation_id === r
  }));
}
function er(t) {
  const { setItems: e, setHeadId: n } = t;
  return {
    readItems: () => t.itemsRef.current,
    readHeadId: () => t.headIdRef.current,
    appendExchange: ({ parentId: r, userId: i, assistantId: s, question: o, progress: l }) => {
      e((p) => [
        ...p,
        { parentId: r, message: { id: i, role: "user", content: o } },
        {
          parentId: i,
          message: {
            id: s,
            role: "assistant",
            content: "",
            progress: l,
            status: { type: "running" },
            citations: []
          }
        }
      ]), n(s);
    },
    appendRetryTurn: ({ assistantId: r, branchParent: i }) => {
      e((s) => [
        ...s,
        {
          parentId: i,
          message: {
            id: r,
            role: "assistant",
            content: "",
            progress: "正在重新生成…",
            status: { type: "running" },
            citations: []
          }
        }
      ]), n(r);
    },
    markRunningCancelled: () => {
      e(
        (r) => r.map(
          (i) => {
            var s;
            return ((s = i.message.status) == null ? void 0 : s.type) === "running" ? {
              ...i,
              message: {
                ...i.message,
                status: { type: "incomplete", reason: "cancelled" },
                progress: "",
                content: i.message.content.trim() || "已取消"
              }
            } : i;
          }
        )
      );
    },
    markRunningAsError: (r) => {
      const i = `${r || ""}`.trim() || "生成回答失败，请重试。";
      e((s) => s.map((o) => {
        var l;
        return ((l = o.message.status) == null ? void 0 : l.type) === "running" ? {
          ...o,
          message: {
            ...o.message,
            content: o.message.content.trim() || i,
            progress: "",
            citations: [],
            status: { type: "incomplete", reason: "error" }
          }
        } : o;
      }));
    },
    mergeChatMirror: (r) => {
      r.size && e((i) => i.map((s) => {
        const o = r.get(s.message.id);
        return o ? { ...s, message: { ...s.message, ...o } } : s;
      }));
    }
  };
}
function tr(t) {
  const {
    jobId: e,
    documentId: n,
    enabled: r,
    refreshSessions: i,
    applyConversationTree: s,
    remoteRef: o,
    streamRef: l,
    itemsRef: p,
    documentIdRef: c,
    lastJobRef: h,
    persistReadyRef: f,
    switchTokenRef: C,
    sessionListGenerationRef: v,
    activeConversationIdRef: u,
    setItems: M,
    setHeadId: x,
    setSessions: _,
    setActiveConversationId: D,
    setSessionBusy: O
  } = t;
  G(() => {
    const I = o.current;
    if (!e) {
      v.current += 1, C.current += 1, M([]), x(null), _([]), D(""), l.current.clearMessages(), u.current = "", h.current = "", c.current = "", f.current = !1;
      return;
    }
    const F = h.current !== e;
    if (F && (v.current += 1, C.current += 1, h.current = e, f.current = !1, M([]), x(null), l.current.clearMessages(), _([]), D(""), u.current = "", c.current = "", O(!1)), !r || !I) {
      v.current += 1;
      return;
    }
    let g = !1;
    return (async () => {
      var T, d, N, E;
      let b = `${n || c.current || ""}`.trim();
      if (!b) {
        try {
          b = `${await ((T = I.getDocumentId) == null ? void 0 : T.call(I)) || ""}`.trim();
        } catch {
          b = "";
        }
        if (g) return;
      }
      b && (c.current = b);
      let R = null;
      if (!g && b && (R = await i(b)), !(F || !p.current.length) || g) {
        g || (f.current = !0);
        return;
      }
      const m = nn({ jobId: e, documentId: b }) || `${((d = I.getConversationId) == null ? void 0 : d.call(I)) || ""}`.trim();
      if (m) {
        D(m), u.current = m, (N = I.setConversationId) == null || N.call(I, m, b);
        try {
          const A = await qe(m);
          if (g) return;
          const y = Ie(A.messages || []);
          if (y.length) {
            s(y, A.head_id), requestAnimationFrame(() => {
              g || (f.current = !0);
            });
            return;
          }
        } catch {
        }
      }
      if (!g && b)
        try {
          const A = R ?? await i(b);
          if (g || !A) return;
          const y = A[0];
          if (y != null && y.conversation_id) {
            const q = y.conversation_id;
            D(q), u.current = q, (E = I.setConversationId) == null || E.call(I, q, b);
            try {
              const K = await qe(q);
              if (g) return;
              s(
                Ie(K.messages || []),
                K.head_id
              ), requestAnimationFrame(() => {
                g || (f.current = !0);
              });
              return;
            } catch {
            }
          }
        } catch {
        }
      if (g) return;
      const w = tt({ jobId: e, documentId: b }, m);
      if (w != null && w.items.length) {
        const A = lt(w);
        M(A.items), x(A.headId), l.current.showMessages(ce(A.items, A.headId));
      } else
        M([]), x(null), l.current.clearMessages();
      requestAnimationFrame(() => {
        g || (f.current = !0);
      });
    })(), () => {
      g = !0, v.current += 1;
    };
  }, [e, n, r, i, s]);
}
function nr(t) {
  const {
    jobId: e,
    documentId: n,
    items: r,
    headId: i,
    activeConversationId: s,
    documentIdRef: o,
    persistReadyRef: l
  } = t;
  G(() => {
    if (!e || !l.current) return;
    const p = s, c = { jobId: e, documentId: n || o.current }, h = window.setTimeout(() => {
      if (!r.length) {
        he(c, p);
        return;
      }
      $e(c, Te(r, i), p);
    }, 280);
    return () => window.clearTimeout(h);
  }, [e, n, r, i, s]);
}
function rr(t) {
  const {
    jobId: e,
    documentId: n,
    sessionBusy: r,
    sessions: i,
    streamRef: s,
    remoteRef: o,
    itemsRef: l,
    headIdRef: p,
    activeConversationIdRef: c,
    documentIdRef: h,
    switchTokenRef: f,
    persistReadyRef: C,
    setSessionBusy: v,
    setSessionError: u,
    setActiveConversationId: M,
    setItems: x,
    setHeadId: _,
    setSessions: D,
    refreshSessions: O,
    applyConversationTree: I
  } = t, F = V(() => {
    var w, T;
    const m = `${((T = (w = o.current) == null ? void 0 : w.getConversationId) == null ? void 0 : T.call(w)) || ""}`.trim();
    m && M(m);
  }, []), g = V(async () => {
    var w, T;
    if (r) return;
    await s.current.stopStream(), ue(900), oe(900), v(!0), u("");
    const m = ++f.current;
    try {
      if (await new Promise((E) => {
        window.setTimeout(E, 40);
      }), m !== f.current) return;
      const d = o.current, N = h.current || `${await ((w = d == null ? void 0 : d.getDocumentId) == null ? void 0 : w.call(d)) || ""}`.trim();
      if (m !== f.current) return;
      h.current = N, (T = d == null ? void 0 : d.clearConversationId) == null || T.call(d, N), M(""), c.current = "", x([]), _(null), s.current.clearMessages(), he({ jobId: e, documentId: N }), N && await O(N, m);
    } catch (d) {
      console.warn("[reader-ai] new session failed", d), u("无法创建新对话，请重试。");
    } finally {
      m === f.current && v(!1);
    }
  }, [e, O, r]), b = V(async (m) => {
    var E, A, y, q, K;
    const w = `${m || ""}`.trim();
    if (!w)
      return u("无法分支：消息 id 无效。"), !1;
    if (r)
      return u("请稍候，当前有会话操作进行中。"), !1;
    await s.current.stopStream();
    const T = Vn(l.current, w, p.current);
    if (!T.length)
      return u("无法分支：找不到到此答案的对话路径。"), !1;
    if (T[T.length - 1].message.role !== "assistant")
      return u("只能从助手答案处开新对话。"), !1;
    v(!0), u("");
    const N = ++f.current;
    try {
      if (await new Promise((W) => {
        window.setTimeout(W, 40);
      }), N !== f.current) return !1;
      const k = o.current;
      let L = h.current || `${await ((E = k == null ? void 0 : k.getDocumentId) == null ? void 0 : E.call(k)) || ""}`.trim();
      if (N !== f.current) return !1;
      if (h.current = L, !L)
        try {
          if (L = `${await ((A = k == null ? void 0 : k.getDocumentId) == null ? void 0 : A.call(k)) || ""}`.trim(), N !== f.current) return !1;
          h.current = L;
        } catch {
          L = "";
        }
      if (!L)
        return u("无法分支：文档未就绪，请稍后重试。"), !1;
      const Q = T.map((W, ie) => ({
        id: W.message.id,
        role: W.message.role,
        content: W.message.content,
        citations: W.message.citations,
        parentId: ie === 0 ? null : T[ie - 1].message.id
      })), Z = c.current || ((y = k == null ? void 0 : k.getConversationId) == null ? void 0 : y.call(k)) || "", te = (i || []).find((W) => W.conversation_id === Z), ne = Q.find((W) => W.role === "user"), S = `${(te == null ? void 0 : te.title) || ""}`.trim() || `${(ne == null ? void 0 : ne.content) || ""}`.replace(/\s+/g, " ").trim() || "未命名对话", z = (i || []).map((W) => W.title || ""), ee = rn(S, z), Y = await me().forkFromPath({
        documentId: L,
        title: ee,
        path: Q
      });
      if (N !== f.current) return !1;
      const j = Se(Y.items), J = ((q = j[j.length - 1]) == null ? void 0 : q.message.id) || null, H = Y.conversation.conversation_id;
      if (!H || !j.length)
        throw new Error("fork returned empty conversation");
      return ue(600), oe(600), x(j), _(J), s.current.showMessages(ce(j, J)), M(H), c.current = H, (K = k == null ? void 0 : k.setConversationId) == null || K.call(k, H, L), D((W) => {
        const ie = {
          conversation_id: H,
          title: ee,
          document_id: L,
          created_at: Y.conversation.created_at || (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: Y.conversation.updated_at || (/* @__PURE__ */ new Date()).toISOString(),
          message_count: j.length,
          head_id: J || ""
        }, de = W.filter((pe) => pe.conversation_id !== H);
        return [ie, ...de];
      }), $e(
        { jobId: e, documentId: L },
        Te(j, J),
        H
      ), await O(L, N), !0;
    } catch (k) {
      return console.warn("[reader-ai] branch from answer failed", k), N === f.current && u("分支失败：未能复制上文到新对话。请检查网络后重试。"), !1;
    } finally {
      N === f.current && v(!1);
    }
  }, [e, O, r, i]), R = V(async (m) => {
    var d, N, E, A;
    const w = `${m || ""}`.trim();
    if (!w || r) return;
    await s.current.stopStream(), v(!0), u("");
    const T = ++f.current;
    try {
      const y = o.current, q = h.current || `${await ((d = y == null ? void 0 : y.getDocumentId) == null ? void 0 : d.call(y)) || ""}`.trim();
      if (T !== f.current) return;
      h.current = q;
      try {
        await me().delete(w);
      } catch (L) {
        if ((Number(L == null ? void 0 : L.status) || 0) !== 404) throw L;
      }
      he({ jobId: e, documentId: q }, w);
      const k = (c.current || ((N = y == null ? void 0 : y.getConversationId) == null ? void 0 : N.call(y)) || "") === w;
      if (D((L) => L.filter((Q) => Q.conversation_id !== w)), k) {
        (E = y == null ? void 0 : y.clearConversationId) == null || E.call(y, q), M(""), c.current = "", x([]), _(null), s.current.clearMessages(), he({ jobId: e, documentId: q });
        const L = q ? await O(q, T) : [];
        if (T !== f.current || !L) return;
        const Q = L[0];
        if (Q != null && Q.conversation_id) {
          const Z = Q.conversation_id;
          M(Z), c.current = Z;
          try {
            const te = await me().get(Z);
            if (T !== f.current) return;
            I(
              Ie(te.messages || []),
              te.head_id
            ), (A = y == null ? void 0 : y.setConversationId) == null || A.call(y, Z, q);
          } catch {
            x([]), _(null);
          }
        }
      } else q && await O(q, T);
    } catch (y) {
      console.warn("[reader-ai] delete session failed", y), u("删除对话失败，请重试。");
    } finally {
      T === f.current && v(!1);
    }
  }, [I, e, O, r]), $ = V(async (m, w) => {
    const T = `${m || ""}`.trim(), d = `${w || ""}`.replace(/\s+/g, " ").trim();
    if (!T || !d || r) return;
    v(!0), u("");
    const N = ++f.current;
    try {
      const E = d.slice(0, 80);
      if (await me().patch(T, { title: E }), N !== f.current) return;
      D(
        (y) => y.map(
          (q) => q.conversation_id === T ? { ...q, title: E } : q
        )
      );
      const A = h.current;
      A && await O(A, N);
    } catch (E) {
      console.warn("[reader-ai] rename session failed", E), u("重命名失败，请重试。");
    } finally {
      N === f.current && v(!1);
    }
  }, [O, r]);
  return {
    adoptRemoteConversationId: F,
    newSession: g,
    branchFromAnswer: b,
    removeSession: R,
    renameSession: $
  };
}
function sr(t) {
  var ee;
  const {
    jobId: e,
    documentId: n = "",
    enabled: r,
    remoteAnswerer: i = null,
    stream: s = Qn
  } = t, [o, l] = U([]), [p, c] = U(null), [h, f] = U([]), [C, v] = U(""), [u, M] = U(!1), [x, _] = U(""), D = B(o), O = B(p), I = B(C), F = B(!1), g = B(""), b = B(""), R = B(0), $ = B(0), m = B(s);
  m.current = s;
  const w = B(i);
  w.current = i, D.current = o, O.current = p, I.current = C;
  const T = V(async (Y = "", j) => {
    const J = `${Y || b.current || ""}`.trim(), H = ++$.current;
    if (!J)
      return H === $.current && (j === void 0 || j === R.current) && f([]), [];
    try {
      const W = me();
      if (!W) return null;
      const de = (await W.list({ document_id: J, limit: 50 })).conversations || [];
      return H === $.current && J === `${b.current || ""}`.trim() && (j === void 0 || j === R.current) ? (f(de), de) : null;
    } catch {
      return null;
    }
  }, []), d = V((Y, j) => {
    var W;
    const J = Se(Y), H = `${j || ""}`.trim() || ((W = J[J.length - 1]) == null ? void 0 : W.message.id) || null;
    l(J), c(H), m.current.showMessages(ce(J, H));
  }, []), N = V(() => `${n || b.current || e}`.trim(), [n, e]);
  tr({
    jobId: e,
    documentId: n,
    enabled: r,
    refreshSessions: T,
    applyConversationTree: d,
    remoteRef: w,
    streamRef: m,
    itemsRef: D,
    documentIdRef: b,
    lastJobRef: g,
    persistReadyRef: F,
    switchTokenRef: R,
    sessionListGenerationRef: $,
    activeConversationIdRef: I,
    setItems: l,
    setHeadId: c,
    setSessions: f,
    setActiveConversationId: v,
    setSessionBusy: M
  }), nr({
    jobId: e,
    documentId: n,
    items: o,
    headId: p,
    activeConversationId: C,
    documentIdRef: b,
    persistReadyRef: F
  });
  const E = X(
    () => ce(o, p),
    [o, p]
  ), A = X(
    () => Yn(o),
    [o]
  ), y = X(
    () => Jn(o),
    [o]
  ), q = X(
    () => Xn(o),
    [o]
  ), K = X(() => er({ setItems: l, setHeadId: c, itemsRef: D, headIdRef: O }), []), {
    adoptRemoteConversationId: k,
    newSession: L,
    branchFromAnswer: Q,
    removeSession: Z,
    renameSession: te
  } = rr({
    jobId: e,
    documentId: n,
    sessionBusy: u,
    sessions: h,
    streamRef: m,
    remoteRef: w,
    itemsRef: D,
    headIdRef: O,
    activeConversationIdRef: I,
    documentIdRef: b,
    switchTokenRef: R,
    persistReadyRef: F,
    setSessionBusy: M,
    setSessionError: _,
    setActiveConversationId: v,
    setItems: l,
    setHeadId: c,
    setSessions: f,
    refreshSessions: T,
    applyConversationTree: d
  }), ne = V(async (Y) => {
    var W, ie, de, pe, xe, Ee, Pe, Oe;
    const j = `${Y || ""}`.trim(), J = I.current || ((ie = (W = w.current) == null ? void 0 : W.getConversationId) == null ? void 0 : ie.call(W)) || "";
    if (!j || j === J || u) return;
    await m.current.stopStream(), ue(1200), oe(1200), M(!0), _("");
    const H = ++R.current;
    F.current = !1, v(j), I.current = j, l([]), c(null), m.current.clearMessages();
    try {
      if (await new Promise((ye) => {
        window.setTimeout(ye, 80);
      }), H !== R.current) return;
      try {
        (xe = (pe = (de = globalThis.document) == null ? void 0 : de.activeElement) == null ? void 0 : pe.blur) == null || xe.call(pe);
      } catch {
      }
      const re = w.current, se = b.current || `${await ((Ee = re == null ? void 0 : re.getDocumentId) == null ? void 0 : Ee.call(re)) || ""}`.trim();
      if (H !== R.current) return;
      b.current = se;
      const le = me();
      if (!le) throw new Error("Reader conversations unavailable");
      const Ne = await le.get(j);
      if (H !== R.current) return;
      ue(800), oe(800);
      const ke = Ie(Ne.messages || []);
      if (d(ke, Ne.head_id), (Pe = re == null ? void 0 : re.setConversationId) == null || Pe.call(re, j, se), F.current = !0, ke.length) {
        const ye = Se(ke);
        $e(
          { jobId: e, documentId: se },
          Te(
            ye,
            `${Ne.head_id || ""}`.trim() || ((Oe = ye.at(-1)) == null ? void 0 : Oe.message.id) || null
          ),
          j
        );
      } else
        he({ jobId: e, documentId: se }, j);
      se && await T(se, H), ue(350), oe(350);
    } catch (re) {
      if (console.warn("[reader-ai] switch session failed", re), H === R.current) {
        _("加载该对话失败，请检查网络后重试。");
        const se = tt(
          { jobId: e, documentId: n || b.current },
          j
        );
        if (se != null && se.items.length) {
          const le = lt(se);
          l(le.items), c(le.headId), m.current.showMessages(ce(le.items, le.headId));
        } else
          l([]), c(null);
        F.current = !0;
      }
    } finally {
      H === R.current && M(!1);
    }
  }, [
    d,
    e,
    n,
    T,
    u
  ]), S = X(
    () => Zn(h, C, i),
    [h, C, i]
  ), z = X(() => ({
    refreshSessions: T,
    adoptRemoteConversationId: k,
    newSession: L,
    switchSession: ne,
    removeSession: Z,
    renameSession: te,
    branchFromAnswer: Q
  }), [
    T,
    k,
    L,
    ne,
    Z,
    te,
    Q
  ]);
  return {
    items: o,
    headId: p,
    messages: E,
    citationsByMessageId: A,
    progressByMessageId: y,
    contentByMessageId: q,
    sessions: S,
    activeConversationId: C || ((ee = i == null ? void 0 : i.getConversationId) == null ? void 0 : ee.call(i)) || "",
    sessionBusy: u,
    sessionError: x,
    resolveRequestScopeKey: N,
    tree: K,
    sessionCommands: z
  };
}
const ar = "retainpdf.reader.ai.request.v1:", ir = Object.freeze({
  assistantMode: "reading",
  scope: "document",
  context: null
});
function ut(t, e) {
  return `${ar}${`${t || ""}`.trim()}:${`${e || ""}`.trim()}`;
}
function or(t) {
  if (!t || typeof t != "object" || Array.isArray(t)) return null;
  const e = t, n = e.assistantMode === "operations" ? "operations" : e.assistantMode === "reading" ? "reading" : null, r = e.scope === "selection" || e.scope === "page" || e.scope === "document" ? e.scope : null;
  if (!n || !r) return null;
  const i = e.context && typeof e.context == "object" && !Array.isArray(e.context) ? { ...e.context } : null;
  return { assistantMode: n, scope: r, context: i };
}
function je(t, e, n) {
  var s;
  const r = `${t || ""}`.trim(), i = `${e || ""}`.trim();
  if (!(!r || !i))
    try {
      (s = globalThis.localStorage) == null || s.setItem(
        ut(r, i),
        JSON.stringify(n)
      );
    } catch {
    }
}
function Ke(t, e) {
  var i;
  const n = `${t || ""}`.trim(), r = `${e || ""}`.trim();
  if (!n || !r) return null;
  try {
    const s = (i = globalThis.localStorage) == null ? void 0 : i.getItem(ut(n, r));
    return s ? or(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}
function cr(t) {
  const e = `${t.scopeKey || ""}`.trim(), n = `${t.jobId || ""}`.trim(), r = `${t.assistantMessageId || ""}`.trim();
  return Ke(e, r) || (e !== n ? Ke(n, r) : null) || ir;
}
function dr(t) {
  const { assistantMode: e, selectionContext: n } = t;
  return e === "operations" ? { assistantMode: e, scope: "document", context: null } : n ? { assistantMode: e, scope: "selection", context: { ...n } } : { assistantMode: e, scope: "document", context: null };
}
function lr(t) {
  var F;
  const { jobId: e, assistantMode: n, selectionContext: r = null, tree: i, chat: s, getScopeKey: o } = t, l = B(i);
  l.current = i;
  const p = B(s);
  p.current = s;
  const c = B(n);
  c.current = n;
  const h = B(r);
  h.current = r;
  const f = B(o);
  f.current = o;
  const C = s.status, v = C === "submitted" || C === "streaming", u = B(v);
  u.current = v;
  const M = v ? `${((F = Un(s.messages)) == null ? void 0 : F.id) || ""}` : "", x = s.messages, _ = s.error;
  G(() => {
    if (!x.length) return;
    const g = new Map(x.map((R) => [R.id, R])), b = /* @__PURE__ */ new Map();
    for (const [R, $] of g)
      b.set(R, Kn($));
    l.current.mergeChatMirror(b);
  }, [x]), G(() => {
    !_ || C !== "error" || l.current.markRunningAsError(_.message);
  }, [_, C]);
  const D = V(async (g) => {
    if (u.current) return;
    const b = `${g || ""}`.trim();
    if (!b) return;
    const R = l.current, $ = p.current, m = c.current, w = h.current, T = f.current(), d = R.readHeadId(), N = _e("u"), E = _e("a"), A = dr({
      assistantMode: m,
      selectionContext: (w == null ? void 0 : w.selectionType) === "text" ? {
        page: w.page,
        page_idx: Math.max(0, w.page - 1),
        pane: w.pane,
        kind: "text",
        block_id: "",
        quoteText: w.quote
      } : w ? {
        page: w.page,
        page_idx: Math.max(0, w.page - 1),
        pane: w.pane,
        kind: w.kind,
        block_id: w.selectionType === "region" ? w.region.itemId : "",
        quoteText: et(w.region, w.pane)
      } : null
    });
    je(T, E, A), R.appendExchange({
      parentId: d,
      userId: N,
      assistantId: E,
      question: b,
      progress: A.assistantMode === "operations" ? "正在规划 PDF 操作…" : "正在理解文档…"
    }), await $.sendUserMessage(
      { id: N, role: "user", parts: [{ type: "text", text: b }] },
      {
        body: {
          assistantMessageId: E,
          assistantMode: A.assistantMode,
          parentId: d,
          question: b,
          regenerate: !1,
          userMessageId: N,
          scope: A.scope,
          context: A.context
        }
      }
    );
  }, []), O = V(async (g) => {
    if (u.current) return;
    const b = l.current, R = p.current, $ = b.readItems(), m = $.find(
      (K) => K.message.id === g && K.message.role === "assistant"
    ), w = (m == null ? void 0 : m.parentId) ?? null, T = w ? Hn($, w) : null;
    let d = "", N = w;
    if ((T == null ? void 0 : T.role) === "user")
      d = T.content.trim();
    else {
      const K = ce($, w ?? b.readHeadId());
      for (let k = K.length - 1; k >= 0; k -= 1)
        if (K[k].role === "user") {
          d = K[k].content.trim(), N = K[k].id;
          break;
        }
    }
    if (!d) return;
    const E = _e("a"), A = N || w, y = f.current(), q = cr({
      scopeKey: y,
      jobId: e,
      assistantMessageId: g
    });
    je(y, E, q), b.appendRetryTurn({ assistantId: E, branchParent: A }), R.replaceVisible(dt(ce($, g))), await R.regenerateFrom({
      messageId: g,
      body: {
        assistantMessageId: E,
        assistantMode: q.assistantMode,
        parentId: A,
        question: d,
        regenerate: !0,
        userMessageId: N || "",
        scope: q.scope,
        context: q.context
      }
    });
  }, [e]), I = V(async () => {
    await p.current.stopStream(), l.current.markRunningCancelled();
  }, []);
  return {
    isRunning: v,
    streamingAssistantId: M,
    submitQuestion: D,
    retryAnswer: O,
    cancelAnswer: I
  };
}
const ur = "retainpdf.reader-agent-operation.action-key.v1:", pr = "reader-";
function We(t, e) {
  return on(t, e);
}
function mr(t) {
  return an(t);
}
function fr(t, e) {
  return sn(t, e);
}
function hr(t) {
  return cn(t);
}
function gr(t) {
  return dn(t);
}
function yr({
  conversationId: t,
  enabled: e,
  discovering: n,
  signal: r,
  confirmationModeHint: i,
  onDocumentCommitted: s
}) {
  const [o, l] = U({}), [p, c] = U("explicit"), [h, f] = U(!1), [C, v] = U(!1), u = B(/* @__PURE__ */ new Set()), M = B(/* @__PURE__ */ new Set()), x = B(/* @__PURE__ */ new Set()), _ = V((g, b = !1) => {
    g != null && g.operation_id && l((R) => {
      const $ = R[g.operation_id];
      return fr($ == null ? void 0 : $.operation, g) ? {
        ...R,
        [g.operation_id]: {
          ...$,
          operation: g,
          pendingAction: void 0,
          error: void 0
        }
      } : !b || !($ != null && $.pendingAction) ? R : {
        ...R,
        [g.operation_id]: { ...$, pendingAction: void 0 }
      };
    });
  }, []), D = V(async (g, b = !1) => {
    const R = `${g || ""}`.trim(), $ = `refresh:${R}`;
    if (!(!R || u.current.has($))) {
      u.current.add($);
      try {
        const m = fe();
        if (!m) return;
        _(await m.get(R), b);
      } catch {
      } finally {
        u.current.delete($);
      }
    }
  }, [_]), O = V(async () => {
    const g = `${t || ""}`.trim(), b = `recover:${g}`;
    if (!(!e || !g || u.current.has(b))) {
      u.current.add(b);
      try {
        const R = fe();
        if (!R) return;
        const $ = await R.list(g, {});
        if (!x.current.has(g)) {
          for (const m of $.operations || [])
            m.status === "committed" && M.current.add(m.operation_id);
          x.current.add(g);
        }
        for (const m of $.operations || []) _(m);
      } catch {
      } finally {
        u.current.delete(b);
      }
    }
  }, [t, e, _]);
  G(() => {
    if (!e) return;
    let g = !1;
    const b = async () => {
      try {
        const $ = fe();
        if (!$) return;
        const m = await $.fetchRuntimeConfig();
        if (g) return;
        c(m.agent_confirmation_mode || "explicit"), v(!!m.llm_api_key_configured), f(
          m.restart_required || m.restart_state === "pending" || m.active_revision !== m.configured_revision
        );
      } catch {
        g || (f(!1), v(!1));
      }
    };
    b();
    const R = window.setInterval(b, 3e3);
    return () => {
      g = !0, window.clearInterval(R);
    };
  }, [e]), G(() => {
    i && c(i);
  }, [i]), G(() => {
    r != null && r.confirmationMode && c(r.confirmationMode), r != null && r.operationId && D(r.operationId);
  }, [D, r]), G(() => {
    O();
  }, [O]), G(() => {
    n || O();
  }, [n, O]);
  const I = X(
    () => Object.values(o).filter((g) => !!t && g.operation.conversation_id === t).sort((g, b) => `${g.operation.created_at || ""}`.localeCompare(`${b.operation.created_at || ""}`)),
    [t, o]
  );
  G(() => {
    var g;
    for (const b of I) {
      const R = b.operation;
      R.status !== "committed" || M.current.has(R.operation_id) || (M.current.add(R.operation_id), s == null || s({
        documentId: R.document_id,
        revision: ((g = R.candidate) == null ? void 0 : g.version_id) || `${R.updated_at || ""}` || `${R.operation_id}:${mr(R)}`
      }));
    }
  }, [I, s]);
  const F = I.some((g) => We(g.operation.status, p));
  return G(() => {
    if (!e || !t || !n && !F) return;
    const g = window.setInterval(() => {
      O();
      for (const b of I)
        We(b.operation.status, p) && D(b.operation.operation_id);
    }, 1400);
    return () => window.clearInterval(g);
  }, [p, t, n, e, I, F, O, D]), G(() => {
    if (!e) return;
    const g = () => void O(), b = () => {
      document.visibilityState === "visible" && g();
    };
    return window.addEventListener("online", g), document.addEventListener("visibilitychange", b), () => {
      window.removeEventListener("online", g), document.removeEventListener("visibilitychange", b);
    };
  }, [e, O]), {
    entries: I,
    confirmationMode: p,
    runtimeRestarting: h,
    runtimeCredentialConfigured: C,
    setEntriesById: l,
    inFlightRef: u,
    upsert: _,
    refresh: D
  };
}
function vr() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return;
  }
}
function pt() {
  return {
    storagePrefix: ur,
    keyPrefix: pr,
    storage: vr()
  };
}
function wr(t, e, n) {
  return ln(t, e, n, pt());
}
function Ue(t, e, n) {
  un(t, e, n, pt());
}
function Ir({
  refresh: t,
  upsert: e,
  setEntriesById: n,
  inFlightRef: r
}) {
  const i = B(/* @__PURE__ */ new Map());
  return { perform: V(async (o, l, p = {}) => {
    const c = `${l.operation_id || ""}`.trim(), h = `action:${c}`;
    if (!c || r.current.has(h)) return;
    if (o === "retry" && l.status === "ambiguous" && p.acceptDuplicateRisk !== !0) {
      n((v) => ({
        ...v,
        [c]: {
          ...v[c],
          error: "请先确认重复执行风险，再重新执行操作。"
        }
      }));
      return;
    }
    const f = wr(c, o, i.current);
    r.current.add(h), n((v) => ({
      ...v,
      [c]: { ...v[c], pendingAction: o, error: void 0 }
    }));
    const C = {
      idempotency_key: f,
      expected_status: l.status,
      expected_attempt: l.current_attempt,
      expected_program_sha256: l.program_sha256 || ""
    };
    try {
      const v = fe();
      if (!v) throw new Error("Reader AI operations unavailable");
      let u;
      o === "run" ? u = await v.run(c, C) : o === "cancel" ? u = await v.cancel(c, { ...C, reason: "user_rejected" }) : o === "commit" ? u = await v.commit(c, C) : u = await v.retry(c, p.acceptDuplicateRisk ? { ...C, accept_duplicate_risk: !0 } : C), Ue(c, o, i.current), e(u, !0);
    } catch (v) {
      hr(v) === 409 ? (Ue(c, o, i.current), await t(c, !0)) : n((u) => ({
        ...u,
        [c]: {
          ...u[c],
          pendingAction: void 0,
          error: gr(v)
        }
      }));
    } finally {
      r.current.delete(h);
    }
  }, [t, e]) };
}
function br({
  conversationId: t,
  enabled: e,
  discovering: n,
  signal: r,
  confirmationModeHint: i,
  onDocumentCommitted: s
}) {
  const o = yr({
    conversationId: t,
    enabled: e,
    discovering: n,
    signal: r,
    confirmationModeHint: i,
    onDocumentCommitted: s
  }), { perform: l } = Ir({
    refresh: o.refresh,
    upsert: o.upsert,
    setEntriesById: o.setEntriesById,
    inFlightRef: o.inFlightRef
  }), p = V((c) => {
    var h;
    return ((h = fe()) == null ? void 0 : h.fetchCandidate(c.operation_id)) ?? Promise.reject(new Error("Reader AI operations unavailable"));
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
function Rr(t) {
  var $;
  const {
    jobId: e,
    documentId: n = "",
    sessionIdentity: r = "",
    enabled: i,
    selectionContext: s = null,
    onDocumentCommitted: o
  } = t, l = `${e}\0${n}\0${r}`, [p, c] = U("reading"), [h, f] = U(null), [C, v] = U();
  G(() => {
    c("reading"), f(null), v(void 0);
  }, [l]);
  const u = X(() => {
    var m;
    return !i || !e ? null : ((m = De()) == null ? void 0 : m.createRemoteAnswerer({ jobId: e, documentId: n })) ?? qt({ jobId: e, documentId: n });
  }, [n, i, e]), M = X(() => {
    var m;
    return !i || !e ? null : ((m = De()) == null ? void 0 : m.createLocalAnswerer({ jobId: e })) ?? Yt({
      loadMarkdownPayload: zt.loadMarkdownPayload
    });
  }, [i, e]), x = B(null), _ = Wn({
    jobId: e,
    enabled: i,
    remoteAnswerer: u,
    localAnswerer: M,
    assistantMode: p,
    onAgentOperationSignal: (m) => {
      f({ ...m, nonce: Date.now() + Math.random() });
    },
    onConfirmationMode: v,
    onStopped: () => {
      var m;
      return (m = x.current) == null ? void 0 : m.markRunningCancelled();
    }
  }), D = X(() => ({
    messages: _.messages,
    status: _.status,
    error: _.error,
    sendUserMessage: (m, w) => _.sendMessage(
      m,
      w
    ),
    regenerateFrom: (m) => _.regenerate(
      m
    ),
    stopStream: () => _.stop(),
    replaceVisible: (m) => _.setMessages([...m])
  }), [_]), O = X(() => ({
    stopStream: () => D.stopStream(),
    clearMessages: () => D.replaceVisible([]),
    showMessages: (m) => D.replaceVisible(dt(m))
  }), [D]), I = sr({
    jobId: e,
    documentId: n,
    enabled: i,
    remoteAnswerer: u,
    stream: O
  });
  x.current = I.tree;
  const F = lr({
    jobId: e,
    assistantMode: p,
    selectionContext: s,
    tree: I.tree,
    chat: D,
    getScopeKey: () => I.resolveRequestScopeKey()
  }), g = I.activeConversationId || (h == null ? void 0 : h.conversationId) || `${(($ = u == null ? void 0 : u.getConversationId) == null ? void 0 : $.call(u)) || ""}`.trim(), b = br({
    conversationId: g,
    enabled: i,
    discovering: F.isRunning,
    signal: h,
    confirmationModeHint: C,
    onDocumentCommitted: o
  }), R = B(!1);
  return G(() => {
    R.current = !1;
  }, [e]), G(() => {
    R.current = !1;
  }, [l]), G(() => {
    R.current && !F.isRunning && (I.sessionCommands.refreshSessions(), I.sessionCommands.adoptRemoteConversationId()), R.current = F.isRunning;
  }, [I, F.isRunning]), {
    citationsByMessageId: I.citationsByMessageId,
    progressByMessageId: I.progressByMessageId,
    contentByMessageId: I.contentByMessageId,
    streamingAssistantId: F.streamingAssistantId,
    isRunning: F.isRunning,
    messages: I.messages,
    sessions: I.sessions,
    activeConversationId: I.activeConversationId,
    sessionBusy: I.sessionBusy,
    sessionError: I.sessionError,
    submitQuestion: F.submitQuestion,
    retryAnswer: F.retryAnswer,
    cancelAnswer: F.cancelAnswer,
    newSession: I.sessionCommands.newSession,
    switchSession: I.sessionCommands.switchSession,
    removeSession: I.sessionCommands.removeSession,
    renameSession: I.sessionCommands.renameSession,
    branchFromAnswer: I.sessionCommands.branchFromAnswer,
    agentOperations: b,
    assistantMode: p,
    setAssistantMode: c
  };
}
function Br({
  open: t,
  jobId: e,
  documentId: n = "",
  sessionIdentity: r = "",
  onClose: i,
  onJumpCitation: s,
  onDocumentCommitted: o,
  layout: l = "floating",
  side: p = "right",
  selectionContext: c = null,
  onClearSelectionContext: h
}) {
  const f = t && !!e, {
    citationsByMessageId: C,
    progressByMessageId: v,
    contentByMessageId: u,
    streamingAssistantId: M,
    isRunning: x,
    sessions: _,
    activeConversationId: D,
    sessionBusy: O,
    sessionError: I,
    messages: F,
    submitQuestion: g,
    retryAnswer: b,
    cancelAnswer: R,
    newSession: $,
    switchSession: m,
    removeSession: w,
    renameSession: T,
    branchFromAnswer: d,
    agentOperations: N,
    assistantMode: E,
    setAssistantMode: A
  } = Rr({
    jobId: e,
    documentId: n,
    sessionIdentity: r,
    enabled: f,
    selectionContext: c,
    onDocumentCommitted: o
  }), [y, q] = U(""), K = ht(D, x), k = V(async (Q) => {
    q(""), await d(Q) && (q(
      "已保存新对话（fork-n-原名）：复制了到此答案的上文，原对话不变。顶部列表可切换。"
    ), window.setTimeout(() => q(""), 6e3));
  }, [d]), L = V((Q) => {
    s(Q);
  }, [s]);
  return /* @__PURE__ */ a(
    Bt,
    {
      id: "reader-ai-panel",
      open: t,
      title: "PaperLoom AI",
      titleIcon: /* @__PURE__ */ a(ge, { size: 14, strokeWidth: 2.1, "aria-hidden": !0 }),
      storageKey: "retainpdf.reader.ai-float.pos.v2",
      ariaLabel: "阅读问答",
      width: 420,
      placement: l === "workspace" ? "workspace" : l === "docked" ? "dock-right" : "floating",
      showHeader: l !== "workspace",
      className: `reader-float-ai is-${l}${l === "workspace" ? ` is-pane-${p}` : ""}${O ? " is-session-busy" : ""}`,
      onClose: i,
      children: e ? /* @__PURE__ */ P("div", { className: "reader-float-ai-body", children: [
        /* @__PURE__ */ a(gt, { conversationId: D, running: x }),
        /* @__PURE__ */ a(
          qn,
          {
            sessions: _,
            activeId: D,
            busy: O,
            errorText: I,
            onSwitch: m,
            onNew: $,
            onDelete: w,
            onRename: T
          }
        ),
        y ? /* @__PURE__ */ a("div", { className: "aui-session-banner", role: "status", children: y }) : null,
        /* @__PURE__ */ a("div", { className: "reader-float-ai-thread-wrap", "aria-busy": O || void 0, children: /* @__PURE__ */ a(yt, { value: /* @__PURE__ */ a(vt, { controller: K, disabled: x || O }), children: /* @__PURE__ */ a(
          Fn,
          {
            connectionConfigured: K.configured,
            connectionBlocked: K.blocked,
            jobId: e,
            messages: F,
            citationsByMessageId: C,
            progressByMessageId: v,
            contentByMessageId: u,
            streamingAssistantId: M,
            isRunning: x,
            onSubmit: g,
            onRetry: b,
            onCancel: R,
            onJumpCitation: L,
            onBranchFromAnswer: k,
            branchBusy: O,
            agentOperations: N,
            assistantMode: E,
            onAssistantModeChange: A,
            selectionContext: c,
            onClearSelectionContext: h
          }
        ) }) })
      ] }) : /* @__PURE__ */ P("div", { className: "reader-float-ai-empty", children: [
        /* @__PURE__ */ a(ge, { size: 22, strokeWidth: 1.75, "aria-hidden": !0 }),
        /* @__PURE__ */ a("p", { children: "当前文档还没有可用于 AI 的解析产物" }),
        /* @__PURE__ */ a("span", { children: "请先完成 OCR 文档解析" })
      ] })
    }
  );
}
export {
  Br as ReaderAiPanel
};
//# sourceMappingURL=ReaderAiPanel-D74M2ri2.js.map
