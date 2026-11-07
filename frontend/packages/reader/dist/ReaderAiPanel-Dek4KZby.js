import { jsx as a, jsxs as O, Fragment as be } from "react/jsx-runtime";
import { useState as H, useRef as B, useEffect as V, useMemo as Z, useCallback as Q, useId as pt } from "react";
import { m as Ue, f as mt, g as ft, u as ht, a as gt, n as yt, c as vt } from "./AiTurnContent-DsLaqag-.js";
import { Square as wt, ArrowUp as It, Copy as bt, GitBranch as Rt, RefreshCw as Ct, Sigma as He, Table2 as Nt, Image as Mt, Type as _t, X as Re, BookOpen as Ge, Sparkles as ge, FileText as ke, ArrowDown as Ve, Quote as kt, ListTree as St, FlaskConical as At, ShieldCheck as $t, Loader2 as Ae, Bot as Tt, ChevronUp as xt, ChevronDown as Qe, TriangleAlert as Ye, ExternalLink as Et, Check as Je, Circle as Pt, Plus as Ot, Pencil as Dt, Trash2 as Ft } from "lucide-react";
import { g as me, h as fe, i as De, j as qt, d as zt, b as Bt } from "./ReaderApp-DfDVOaOp.js";
import { ThreadPrimitive as ae, ComposerPrimitive as ve, MessagePrimitive as Xe, ActionBarPrimitive as Me, useAui as Lt, SelectionToolbarPrimitive as jt, useExternalStoreRuntime as Kt, AssistantRuntimeProvider as Wt } from "@assistant-ui/react";
import { r as Ze } from "./reader-regions-DsePY7B_.js";
import { e as ue, q as oe, C as Fe, l as Ut, v as Ht } from "./answer-enhance-DShVYmyb.js";
import { b as Gt, m as Vt, s as Qt, l as et, c as he, d as $e, a as Yt } from "./answer-quote-CYnPOEkM.js";
import { Chat as Jt, useChat as Xt } from "@ai-sdk/react";
import { selectionForRequest as Zt, applyTurnEvent as en } from "@retainpdf/api";
import { describeToolEvent as tn } from "@retainpdf/domain/ai";
import { toSessionSummary as nn } from "@retainpdf/domain/session";
import { l as rn } from "./ask-answerer-CU7UxZb4.js";
import { getConversation as qe, messagesToBranchItems as Ie, nextForkConversationTitle as sn } from "@retainpdf/api/conversations";
import { c as _e } from "./ai-chat-ZSCffLDD.js";
import { agentOperationShouldReplace as an, agentOperationEventSeq as on, agentOperationShouldPoll as cn, agentOperationErrorStatus as dn, agentOperationErrorMessage as ln, resolveAgentOperationActionKey as un, clearAgentOperationActionKey as pn } from "@retainpdf/api/agent-operation-model";
function tt(t) {
  return t.content.filter((e) => e.type === "text").map((e) => e.text).join(`
`).trim();
}
function mn({ message: t }) {
  return /* @__PURE__ */ a(Xe.Root, { className: "aui-msg aui-msg-user", "data-role": "user", children: /* @__PURE__ */ a("div", { className: "aui-msg-bubble", children: /* @__PURE__ */ a("div", { className: "aui-md-plain", children: tt(t) }) }) });
}
function fn({
  jobId: t,
  message: e,
  citations: n,
  progress: r,
  incompleteReason: i,
  streaming: s,
  branchBusy: o,
  onJumpCitation: u,
  onBranchFromAnswer: p
}) {
  var g, f, R, y, l, _, $, k, D, P, I, F, h, b, C, S, m;
  const c = tt(e);
  return /* @__PURE__ */ a(Xe.Root, { className: "aui-msg aui-msg-assistant", "data-role": "assistant", children: /* @__PURE__ */ O("div", { className: "aui-msg-stack", children: [
    s ? /* @__PURE__ */ a(mt, { running: !0, label: r, elapsedMs: ((R = (f = (g = e.metadata) == null ? void 0 : g.custom) == null ? void 0 : f.metrics) == null ? void 0 : R.elapsed_ms) || 0 }) : null,
    ((y = e.status) == null ? void 0 : y.type) === "incomplete" && e.status.reason === "cancelled" ? /* @__PURE__ */ a("div", { className: "ai-run-status", role: "status", children: "已中断，已生成的内容保留在对话中" }) : null,
    !s && ((l = e.status) == null ? void 0 : l.type) === "incomplete" && e.status.reason === "error" ? /* @__PURE__ */ a("div", { className: "ai-turn-error", role: "alert", children: String(((k = ($ = (_ = e.metadata) == null ? void 0 : _.custom) == null ? void 0 : $.metrics) == null ? void 0 : k.error) || "本轮未完成，请重新生成或检查连接设置。") }) : null,
    !s && i === "rounds_exhausted" ? /* @__PURE__ */ a("div", { className: "aui-msg-truncated", role: "status", children: "检索与计算的步数已用尽，这个回答是提前收尾的——追问一句可以让它接着做。" }) : null,
    c || (I = (P = (D = e.metadata) == null ? void 0 : D.custom) == null ? void 0 : P.parts) != null && I.length ? /* @__PURE__ */ a("div", { className: "aui-msg-bubble", children: /* @__PURE__ */ a("div", { className: "aui-md", children: /* @__PURE__ */ a(
      ft,
      {
        parts: (h = (F = e.metadata) == null ? void 0 : F.custom) == null ? void 0 : h.parts,
        metrics: (C = (b = e.metadata) == null ? void 0 : b.custom) == null ? void 0 : C.metrics,
        content: c,
        streaming: s,
        citations: n,
        jobId: t,
        onJumpCitation: u
      }
    ) }) }) : null,
    /* @__PURE__ */ O(
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
    (m = (S = e.metadata) == null ? void 0 : S.custom) != null && m.source ? /* @__PURE__ */ a("div", { className: "reader-ai-answer-source", children: String(e.metadata.custom.source) }) : null
  ] }) });
}
function nt({
  jobId: t,
  citationsByMessageId: e,
  progressByMessageId: n,
  incompleteByMessageId: r,
  streamingAssistantId: i,
  isRunning: s,
  branchBusy: o,
  onJumpCitation: u,
  onBranchFromAnswer: p
}) {
  return /* @__PURE__ */ a("div", { className: "aui-message-group", "data-slot": "aui_message-group", children: /* @__PURE__ */ a(ae.Messages, { children: ({ message: c }) => {
    var f;
    if (c.role === "user") return /* @__PURE__ */ a(mn, { message: c });
    if (c.role !== "assistant") return null;
    const g = ((f = c.status) == null ? void 0 : f.type) === "running" || s && i === c.id;
    return /* @__PURE__ */ a(
      fn,
      {
        jobId: t,
        message: c,
        citations: e[c.id] || [],
        progress: n[c.id] || "",
        incompleteReason: r[c.id] || "",
        streaming: g,
        branchBusy: o,
        onJumpCitation: u,
        onBranchFromAnswer: p
      }
    );
  } }) });
}
function hn({
  mode: t,
  disabled: e,
  onChange: n
}) {
  return /* @__PURE__ */ O("div", { className: "aui-assistant-mode", role: "group", "aria-label": "AI 模式", children: [
    /* @__PURE__ */ O(
      "button",
      {
        type: "button",
        className: t !== "operations" ? "is-active" : "",
        "aria-pressed": t !== "operations",
        disabled: e,
        onClick: () => n == null ? void 0 : n("reading"),
        children: [
          /* @__PURE__ */ a(Ge, { size: 12, strokeWidth: 2.2, "aria-hidden": !0 }),
          /* @__PURE__ */ a("span", { children: "阅读问答" })
        ]
      }
    ),
    /* @__PURE__ */ O(
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
function gn({
  selectionContext: t,
  onClear: e
}) {
  if (!t) return null;
  const n = t.selectionType === "text" ? "text" : t.kind, r = t.selectionType === "text" ? t.quote : Ze(t.region, t.pane), i = n === "formula" ? "公式" : n === "table" ? "表格" : n === "figure" ? "图片" : "文字";
  return /* @__PURE__ */ O("div", { className: "aui-selection-context", "data-reader-ai-selection-context": "", children: [
    /* @__PURE__ */ a(n === "formula" ? He : n === "table" ? Nt : n === "figure" ? Mt : _t, { size: 14, strokeWidth: 2.1, "aria-hidden": !0 }),
    /* @__PURE__ */ O("span", { className: "aui-selection-context-meta", children: [
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
function rt({
  isRunning: t,
  branchBusy: e,
  mode: n,
  onModeChange: r,
  selectionContext: i,
  onClearSelectionContext: s
}) {
  const o = Ue();
  return /* @__PURE__ */ O(ve.Root, { className: "aui-composer", "data-reader-ai-composer": "", children: [
    /* @__PURE__ */ O("div", { className: "aui-composer-shell", children: [
      n !== "operations" ? /* @__PURE__ */ a(gn, { selectionContext: i, onClear: s }) : null,
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
      /* @__PURE__ */ O("div", { className: "aui-composer-toolbar", children: [
        /* @__PURE__ */ O("div", { className: "reader-ai-composer-leading", children: [
          o,
          /* @__PURE__ */ a(hn, { mode: n, disabled: t || e, onChange: r })
        ] }),
        /* @__PURE__ */ a("div", { className: "aui-composer-actions", children: t ? /* @__PURE__ */ a(ve.Cancel, { className: "aui-send aui-send-stop", "aria-label": "停止生成", children: /* @__PURE__ */ a(wt, { size: 12, strokeWidth: 2.6, "aria-hidden": !0 }) }) : /* @__PURE__ */ a(ve.Send, { className: "aui-send", "aria-label": "发送", children: /* @__PURE__ */ a(It, { size: 16, strokeWidth: 2.5, "aria-hidden": !0 }) }) })
      ] })
    ] }),
    /* @__PURE__ */ a("p", { className: "aui-hint", children: "AI 可能会出错，请核对原文与引用" })
  ] });
}
function st() {
  const t = Ue();
  return /* @__PURE__ */ O("div", { className: "aui-composer aui-composer-locked", role: "alert", children: [
    /* @__PURE__ */ a("p", { className: "aui-llm-lock-msg", children: "连接 AI 服务后即可提问" }),
    /* @__PURE__ */ a("p", { className: "aui-hint", children: "选择已登录的本机 Agent，或添加模型 API。" }),
    t
  ] });
}
const yn = [
  { prompt: "把第 1 页旋转 90 度。", label: "旋转页面", icon: ke },
  { prompt: "删除最后一页。", label: "删除页面", icon: ke }
];
function vn({
  jobId: t,
  empty: e,
  citationsByMessageId: n,
  progressByMessageId: r,
  incompleteByMessageId: i,
  streamingAssistantId: s,
  isRunning: o,
  missingLlmKey: u,
  branchBusy: p,
  agentRequestBlocked: c = !1,
  agentOperationPanel: g,
  onModeChange: f,
  onJumpCitation: R,
  onBranchFromAnswer: y
}) {
  const l = p || c;
  return /* @__PURE__ */ O(be, { children: [
    e ? /* @__PURE__ */ O("div", { className: "aui-empty", children: [
      /* @__PURE__ */ a("div", { className: "aui-empty-mascot", "aria-hidden": !0, children: /* @__PURE__ */ a("span", { className: "aui-empty-mascot-face", children: /* @__PURE__ */ a(ge, { size: 21, strokeWidth: 1.9 }) }) }),
      /* @__PURE__ */ a("h2", { className: "aui-empty-title", children: "想怎样处理 PDF？" }),
      /* @__PURE__ */ a("p", { className: "aui-empty-sub", children: "创建候选版本后由你预览和确认" }),
      /* @__PURE__ */ a("div", { className: "aui-suggestions", role: "group", "aria-label": "推荐问题", children: yn.map((_) => {
        const $ = _.icon;
        return /* @__PURE__ */ O(
          ae.Suggestion,
          {
            prompt: _.prompt,
            send: !0,
            type: "button",
            className: "aui-suggestion",
            disabled: l || u,
            children: [
              /* @__PURE__ */ a($, { size: 14, strokeWidth: 2, "aria-hidden": !0, className: "aui-suggestion-icon" }),
              /* @__PURE__ */ a("span", { className: "aui-suggestion-label", children: _.label })
            ]
          },
          _.prompt
        );
      }) })
    ] }) : null,
    /* @__PURE__ */ a(
      nt,
      {
        jobId: t,
        citationsByMessageId: n,
        progressByMessageId: r,
        incompleteByMessageId: i,
        streamingAssistantId: s,
        isRunning: o,
        branchBusy: p,
        onJumpCitation: R,
        onBranchFromAnswer: y
      }
    ),
    g,
    /* @__PURE__ */ O(ae.ViewportFooter, { className: "aui-thread-viewport-footer", children: [
      !e && !p ? /* @__PURE__ */ a(
        ae.ScrollToBottom,
        {
          className: "aui-scroll-bottom-btn aui-scroll-bottom",
          "aria-label": "滚到最新",
          children: /* @__PURE__ */ a(Ve, { size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
        }
      ) : null,
      u ? /* @__PURE__ */ a(st, {}) : /* @__PURE__ */ a(
        rt,
        {
          isRunning: o,
          branchBusy: l,
          mode: "operations",
          onModeChange: f,
          selectionContext: null,
          onClearSelectionContext: void 0
        }
      )
    ] })
  ] });
}
function wn() {
  const t = Lt(), e = (n) => {
    var o, u, p;
    n.preventDefault();
    const r = `${((o = globalThis.getSelection) == null ? void 0 : o.call(globalThis)) || ""}`.trim();
    if (!r) return;
    const i = Gt(r);
    if (!i) return;
    const s = t.thread.composer();
    s.setText(Vt(s.getState().text || "", i));
    try {
      (p = (u = globalThis.getSelection) == null ? void 0 : u.call(globalThis)) == null || p.removeAllRanges();
    } catch {
    }
  };
  return /* @__PURE__ */ a(jt.Root, { className: "reader-ai-selection-toolbar", children: /* @__PURE__ */ O(
    "button",
    {
      type: "button",
      className: "reader-ai-selection-quote",
      onPointerDown: e,
      title: "引用这段话继续提问",
      children: [
        /* @__PURE__ */ a(kt, { size: 12, strokeWidth: 2.4, "aria-hidden": !0 }),
        /* @__PURE__ */ a("span", { children: "引用" })
      ]
    }
  ) });
}
const In = [
  { prompt: "用几句话总结这篇文献的核心内容。", label: "总结本文", icon: Ge },
  { prompt: "这篇文献的主要结论是什么？", label: "提炼主要结论", icon: St },
  { prompt: "作者用了什么方法或模型？", label: "梳理方法与模型", icon: At },
  { prompt: "解释文中的关键公式。", label: "解释关键公式", icon: He }
];
function bn({
  jobId: t,
  empty: e,
  citationsByMessageId: n,
  progressByMessageId: r,
  incompleteByMessageId: i,
  streamingAssistantId: s,
  isRunning: o,
  missingLlmKey: u,
  branchBusy: p,
  composerDisabled: c = !1,
  onModeChange: g,
  onJumpCitation: f,
  onBranchFromAnswer: R,
  selectionContext: y = null,
  onClearSelectionContext: l,
  footerExtra: _ = null
}) {
  return /* @__PURE__ */ O(be, { children: [
    e ? /* @__PURE__ */ O("div", { className: "aui-empty", children: [
      /* @__PURE__ */ a("div", { className: "aui-empty-mascot", "aria-hidden": !0, children: /* @__PURE__ */ a("span", { className: "aui-empty-mascot-face", children: /* @__PURE__ */ a(ge, { size: 21, strokeWidth: 1.9 }) }) }),
      /* @__PURE__ */ a("h2", { className: "aui-empty-title", children: "一起读懂这篇文档" }),
      /* @__PURE__ */ a("p", { className: "aui-empty-sub", children: "总结、解释、检索与计算，不修改 PDF" }),
      /* @__PURE__ */ a("div", { className: "aui-suggestions", role: "group", "aria-label": "推荐问题", children: In.map(($) => {
        const k = $.icon;
        return /* @__PURE__ */ O(
          ae.Suggestion,
          {
            prompt: $.prompt,
            send: !0,
            type: "button",
            className: "aui-suggestion",
            disabled: p || c || u,
            children: [
              /* @__PURE__ */ a(k, { size: 14, strokeWidth: 2, "aria-hidden": !0, className: "aui-suggestion-icon" }),
              /* @__PURE__ */ a("span", { className: "aui-suggestion-label", children: $.label })
            ]
          },
          $.prompt
        );
      }) })
    ] }) : null,
    /* @__PURE__ */ a(wn, {}),
    /* @__PURE__ */ a(
      nt,
      {
        jobId: t,
        citationsByMessageId: n,
        progressByMessageId: r,
        incompleteByMessageId: i,
        streamingAssistantId: s,
        isRunning: o,
        branchBusy: p,
        onJumpCitation: f,
        onBranchFromAnswer: R
      }
    ),
    _,
    /* @__PURE__ */ O(ae.ViewportFooter, { className: "aui-thread-viewport-footer", children: [
      !e && !p ? /* @__PURE__ */ a(
        ae.ScrollToBottom,
        {
          className: "aui-scroll-bottom-btn aui-scroll-bottom",
          "aria-label": "滚到最新",
          children: /* @__PURE__ */ a(Ve, { size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
        }
      ) : null,
      u ? /* @__PURE__ */ a(st, {}) : /* @__PURE__ */ a(
        rt,
        {
          isRunning: o,
          branchBusy: p || c,
          mode: "reading",
          onModeChange: g,
          selectionContext: y,
          onClearSelectionContext: l
        }
      )
    ] })
  ] });
}
function Rn({
  jobId: t,
  messages: e,
  citationsByMessageId: n,
  progressByMessageId: r,
  incompleteByMessageId: i,
  streamingAssistantId: s,
  isRunning: o,
  missingLlmKey: u,
  branchBusy: p,
  agentRequestBlocked: c = !1,
  agentOperationPanel: g,
  assistantMode: f = "reading",
  onAssistantModeChange: R,
  onJumpCitation: y,
  onBranchFromAnswer: l,
  selectionContext: _ = null,
  onClearSelectionContext: $
}) {
  const k = e.length === 0, D = f === "operations";
  return /* @__PURE__ */ a(
    ae.Root,
    {
      className: `aui-thread aui-thread-root${u ? " is-llm-locked" : ""}`,
      "data-chat-ui": "assistant-ui-official-thread",
      children: /* @__PURE__ */ a(
        ae.Viewport,
        {
          className: "aui-viewport",
          "data-slot": "aui_thread-viewport",
          "data-reader-ai-viewport": "true",
          turnAnchor: "top",
          autoScroll: !0,
          children: /* @__PURE__ */ a("div", { className: `aui-thread-inner${k ? " is-empty" : ""}`, children: D ? /* @__PURE__ */ a(
            vn,
            {
              jobId: t,
              empty: k,
              citationsByMessageId: n,
              progressByMessageId: r,
              incompleteByMessageId: i,
              streamingAssistantId: s,
              isRunning: o,
              missingLlmKey: u,
              branchBusy: p,
              agentRequestBlocked: c,
              agentOperationPanel: g,
              onModeChange: R,
              onJumpCitation: y,
              onBranchFromAnswer: l
            }
          ) : /* @__PURE__ */ a(
            bn,
            {
              jobId: t,
              empty: k,
              citationsByMessageId: n,
              progressByMessageId: r,
              incompleteByMessageId: i,
              streamingAssistantId: s,
              isRunning: o,
              missingLlmKey: u,
              branchBusy: p,
              composerDisabled: c,
              onModeChange: R,
              onJumpCitation: y,
              onBranchFromAnswer: l,
              selectionContext: _,
              onClearSelectionContext: $
            }
          ) })
        }
      )
    }
  );
}
const at = "retainpdf.reader-agent-operation.dismissed.v1", Cn = /* @__PURE__ */ new Set(["failed", "cancelled"]);
function ze(t) {
  return [
    `${t.operation_id || ""}`.trim(),
    Number(t.current_attempt) || 0,
    `${t.status || ""}`
  ].join(":");
}
function Nn() {
  var t;
  try {
    const e = JSON.parse(((t = globalThis.localStorage) == null ? void 0 : t.getItem(at)) || "[]");
    return new Set(Array.isArray(e) ? e.filter((n) => typeof n == "string") : []);
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function Mn(t) {
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
function _n(t) {
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
function kn(t) {
  return t === "failed" || t === "ambiguous" ? Ye : t === "cancelled" ? Re : t === "committed" || t === "result_ready" ? Je : ["queued", "running", "validating"].includes(t) ? Ae : Pt;
}
function Sn({ events: t, mode: e }) {
  return /* @__PURE__ */ a("ol", { className: "reader-agent-operation-timeline", "aria-label": "PDF 操作步骤", children: t.map((n) => {
    const r = kn(n.status), i = ["queued", "running", "validating"].includes(n.status);
    return /* @__PURE__ */ O("li", { children: [
      /* @__PURE__ */ a(r, { className: i ? "is-spinning" : "", size: 12, "aria-hidden": !0 }),
      /* @__PURE__ */ a("span", { children: n.summary || n.event || it(n.status, e) }),
      /* @__PURE__ */ a("time", { children: n.ts ? new Date(n.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "" })
    ] }, `${n.attempt}:${n.seq}`);
  }) });
}
function An({
  operation: t,
  loadCandidate: e
}) {
  const [n, r] = H(!1), [i, s] = H(""), [o, u] = H(""), p = B("");
  return V(() => {
    let c = !1;
    return u(""), e(t).then((g) => {
      if (c) return;
      const f = URL.createObjectURL(g);
      p.current && URL.revokeObjectURL(p.current), p.current = f, s(f);
    }).catch(() => {
      c || u("候选 PDF 加载失败，请重试。");
    }), () => {
      c = !0;
    };
  }, [e, t.operation_id, t.current_attempt]), V(() => () => {
    p.current && URL.revokeObjectURL(p.current);
  }, []), /* @__PURE__ */ O(be, { children: [
    /* @__PURE__ */ O("div", { className: "reader-agent-operation-candidate", children: [
      /* @__PURE__ */ O("div", { children: [
        /* @__PURE__ */ a(ke, { size: 13, "aria-hidden": !0 }),
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
function $n({
  entry: t,
  mode: e,
  loadCandidate: n,
  onAction: r,
  onDismiss: i
}) {
  var $;
  const { operation: s, pendingAction: o, error: u } = t, [p, c] = H(!1), [g, f] = H(!1), R = s.events || [], y = _n(s.status), l = !!((s.status === "result_ready" || s.status === "committed") && s.candidate_available), _ = Cn.has(s.status);
  return /* @__PURE__ */ O("article", { className: `reader-agent-operation-card is-${s.status}`, "data-operation-id": s.operation_id, children: [
    /* @__PURE__ */ O("header", { children: [
      /* @__PURE__ */ a("span", { className: "reader-agent-operation-icon", "aria-hidden": !0, children: /* @__PURE__ */ a(Tt, { size: 15 }) }),
      /* @__PURE__ */ O("div", { className: "reader-agent-operation-title", children: [
        /* @__PURE__ */ a("span", { children: "PDF 操作" }),
        /* @__PURE__ */ a("strong", { children: s.intent_summary || "处理当前 PDF" })
      ] }),
      /* @__PURE__ */ O("div", { className: "reader-agent-operation-head-actions", children: [
        /* @__PURE__ */ a("span", { className: "reader-agent-operation-status", children: it(s.status, e) }),
        _ ? /* @__PURE__ */ a(
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
    ($ = s.affected_pages) != null && $.length ? /* @__PURE__ */ O("p", { className: "reader-agent-operation-scope", children: [
      "影响页码：",
      s.affected_pages.join("、")
    ] }) : null,
    R.length ? /* @__PURE__ */ O("div", { className: "reader-agent-operation-details", children: [
      /* @__PURE__ */ O("button", { type: "button", onClick: () => c((k) => !k), children: [
        p ? /* @__PURE__ */ a(xt, { size: 12, "aria-hidden": !0 }) : /* @__PURE__ */ a(Qe, { size: 12, "aria-hidden": !0 }),
        p ? "收起步骤" : `执行步骤 ${R.length}`
      ] }),
      p ? /* @__PURE__ */ a(Sn, { events: R, mode: e }) : null
    ] }) : null,
    l ? /* @__PURE__ */ a(An, { operation: s, loadCandidate: n }) : null,
    u ? /* @__PURE__ */ a("p", { className: "reader-agent-operation-error", role: "alert", children: u }) : null,
    g ? /* @__PURE__ */ O("div", { className: "reader-agent-operation-risk", role: "alertdialog", "aria-label": "确认重复执行风险", children: [
      /* @__PURE__ */ a(Ye, { size: 14, "aria-hidden": !0 }),
      /* @__PURE__ */ a("p", { children: "上一次执行结果不确定，重试可能重复操作。确认接受风险后再继续。" }),
      /* @__PURE__ */ O("div", { children: [
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
    ] }) : y.length ? /* @__PURE__ */ a("div", { className: "reader-agent-operation-actions", children: y.map((k) => /* @__PURE__ */ a(
      "button",
      {
        type: "button",
        className: k.primary ? "is-primary" : k.danger ? "is-danger" : "",
        disabled: !!o,
        onClick: () => {
          k.risk ? f(!0) : r(k.action, s);
        },
        children: o === k.action ? "处理中…" : k.label
      },
      k.action
    )) }) : null
  ] });
}
function Tn({
  entries: t,
  confirmationMode: e,
  runtimeRestarting: n,
  loadCandidate: r,
  onAction: i
}) {
  const [s, o] = H(Nn), u = t.filter((c) => !s.has(ze(c.operation)));
  function p(c) {
    const g = ze(c);
    o((f) => {
      const R = new Set(f);
      return R.add(g), Mn(R), R;
    });
  }
  return /* @__PURE__ */ O("section", { className: `reader-agent-operations${u.length ? " has-operations" : ""}`, "aria-label": "AI PDF 操作", children: [
    /* @__PURE__ */ O("div", { className: `reader-agent-mode${e === "green_light" ? " is-green" : ""}`, children: [
      /* @__PURE__ */ a($t, { size: 13, "aria-hidden": !0 }),
      /* @__PURE__ */ a("span", { children: e === "green_light" ? "绿灯模式 · 自动执行并应用" : "需要确认 · 操作前等待授权" })
    ] }),
    n ? /* @__PURE__ */ O("div", { className: "reader-agent-restarting", role: "status", children: [
      /* @__PURE__ */ a(Ae, { className: "is-spinning", size: 13, "aria-hidden": !0 }),
      "正在重启 Agent，新请求暂不可用"
    ] }) : null,
    u.map((c) => /* @__PURE__ */ a(
      $n,
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
const xn = (t) => t, En = Object.freeze([]), Pn = Object.freeze({}), Be = Object.freeze({}), On = Object.freeze({
  entries: [],
  confirmationMode: "explicit",
  runtimeRestarting: !1,
  runtimeCredentialConfigured: !1,
  perform: async () => {
  },
  loadCandidate: async () => new Blob()
});
function Dn(t) {
  return t.content.filter((e) => e.type === "text").map((e) => e.text).join(`
`).trim();
}
function Fn(t, e, n) {
  var r, i, s, o;
  return ((r = t.status) == null ? void 0 : r.type) === "running" || n && e === t.id ? { type: "running" } : ((i = t.status) == null ? void 0 : i.type) === "incomplete" || ((s = t.status) == null ? void 0 : s.type) === "error" ? {
    type: "incomplete",
    reason: ((o = t.status) == null ? void 0 : o.reason) === "cancelled" ? "cancelled" : "error"
  } : { type: "complete", reason: "stop" };
}
function qn({
  connectionConfigured: t = !1,
  connectionBlocked: e = !1,
  jobId: n = "",
  messages: r = En,
  citationsByMessageId: i = Pn,
  progressByMessageId: s = Be,
  contentByMessageId: o = Be,
  streamingAssistantId: u = "",
  isRunning: p = !1,
  onSubmit: c,
  onRetry: g,
  onCancel: f,
  onJumpCitation: R,
  onBranchFromAnswer: y,
  branchBusy: l = !1,
  agentOperations: _ = On,
  assistantMode: $ = "reading",
  onAssistantModeChange: k,
  selectionContext: D = null,
  onClearSelectionContext: P
}) {
  const [, I] = H(0);
  V(() => {
    const d = () => I((N) => N + 1);
    return window.addEventListener("focus", d), window.addEventListener("storage", d), document.addEventListener(Fe, d), () => {
      window.removeEventListener("focus", d), window.removeEventListener("storage", d), document.removeEventListener(Fe, d);
    };
  }, []);
  const F = e || !t && !Ut() && !_.runtimeCredentialConfigured, h = Z(() => r.map((d) => ({
    id: d.id,
    role: d.role,
    content: o[d.id] || d.content || "",
    metadata: { custom: { source: d.source, parts: d.parts, metrics: d.metrics } },
    ...d.role === "assistant" ? { status: Fn(d, u, p) } : {}
  })), [o, p, r, u]), b = Z(() => {
    var N, E;
    const d = {};
    for (const A of r) {
      if (A.role !== "assistant") continue;
      const v = `${((N = A.status) == null ? void 0 : N.reason) || ""}`.trim();
      ((E = A.status) == null ? void 0 : E.type) === "incomplete" && v && v !== "cancelled" && (d[A.id] = v);
    }
    return d;
  }, [r]), C = Q(async (d) => {
    const N = d ? Math.max(0, r.findIndex((A) => A.id === d) + 1) : 0, E = r.slice(N).find((A) => A.role === "assistant");
    E && await g(E.id);
  }, [r, g]), S = Q(async (d) => {
    const N = Dn(d);
    !N || p || l || _.runtimeRestarting || F || await c(N);
  }, [_.runtimeRestarting, l, p, F, c]), m = Q(async () => {
    await f();
  }, [f]), w = Z(() => ({
    messages: h,
    isRunning: p,
    isDisabled: l || _.runtimeRestarting || F,
    convertMessage: xn,
    onNew: S,
    onReload: C,
    onCancel: m
  }), [
    _.runtimeRestarting,
    l,
    m,
    S,
    p,
    F,
    C,
    h
  ]), T = Kt(w);
  return /* @__PURE__ */ a(Wt, { runtime: T, children: /* @__PURE__ */ a(
    Rn,
    {
      jobId: n,
      messages: r,
      citationsByMessageId: i,
      progressByMessageId: s,
      incompleteByMessageId: b,
      streamingAssistantId: u,
      isRunning: p,
      missingLlmKey: F,
      branchBusy: l,
      agentRequestBlocked: _.runtimeRestarting,
      assistantMode: $,
      onAssistantModeChange: k,
      selectionContext: D,
      onClearSelectionContext: P,
      agentOperationPanel: _.entries.length > 0 || _.runtimeRestarting ? /* @__PURE__ */ a(
        Tn,
        {
          entries: _.entries,
          confirmationMode: _.confirmationMode,
          runtimeRestarting: _.runtimeRestarting,
          loadCandidate: _.loadCandidate,
          onAction: _.perform
        }
      ) : null,
      onJumpCitation: R,
      onBranchFromAnswer: y
    }
  ) });
}
function we(t = 900, e = 0) {
  ue(t, { overlayDelayMs: e }), oe(t);
}
function zn({
  sessions: t,
  activeId: e,
  busy: n = !1,
  disabled: r = !1,
  errorText: i = "",
  onSwitch: s,
  onNew: o,
  onDelete: u,
  onRename: p
}) {
  const c = t.length > 0, g = n || r, [f, R] = H(!1), [y, l] = H(""), [_, $] = H(""), k = B(null), D = pt();
  function P(d) {
    const N = `${d || ""}`.match(/^fork-(\d+)-(.*)$/i);
    if (!N) return d;
    const E = N[2].trim();
    return E ? `${E} · 分支${N[1]}` : `分支${N[1]}`;
  }
  const I = B(!1), F = B(null), h = t.find((d) => d.id === e) || null, b = h ? h.messageCount ? P(h.title) : `${P(h.title)}（空）` : c ? "选择以往对话" : "新对话";
  V(() => {
    if (!f) {
      l("");
      return;
    }
    const d = (A) => {
      if (I.current) return;
      const v = k.current;
      v && (A.target instanceof Node && v.contains(A.target) || (R(!1), l("")));
    }, N = (A) => {
      A.key === "Escape" && (R(!1), l(""));
    }, E = window.setTimeout(() => {
      document.addEventListener("pointerdown", d, !0);
    }, 0);
    return document.addEventListener("keydown", N), () => {
      window.clearTimeout(E), document.removeEventListener("pointerdown", d, !0), document.removeEventListener("keydown", N);
    };
  }, [f]), V(() => {
    if (!y) return;
    const d = F.current;
    d && (d.focus(), d.select());
  }, [y]);
  const C = (d) => {
    const N = `${d || ""}`.trim();
    !N || g || I.current || y || (I.current = !0, we(1e3, 0), requestAnimationFrame(() => {
      R(!1), window.setTimeout(() => {
        (async () => {
          try {
            await s(N);
          } finally {
            we(400, 0), I.current = !1;
          }
        })();
      }, 40);
    }));
  }, S = (d) => {
    g || (l(d.id), $(d.title || ""));
  }, m = () => {
    const d = y, N = _;
    l(""), d && p(d, N);
  }, w = () => {
    l(""), $("");
  }, T = (d) => {
    var A;
    if (g || I.current) return;
    const N = d.title || "未命名对话";
    (A = globalThis.confirm) != null && A.call(globalThis, `确定删除对话「${N}」？此操作不可恢复。`) && (I.current = !0, we(800, 0), (async () => {
      try {
        await u(d.id);
      } finally {
        I.current = !1;
      }
    })());
  };
  return /* @__PURE__ */ O(
    "div",
    {
      className: "aui-session-bar",
      "data-reader-ai-sessions": "",
      ref: k,
      onPointerDown: (d) => {
        d.stopPropagation();
      },
      onClick: (d) => {
        d.stopPropagation();
      },
      children: [
        /* @__PURE__ */ O("div", { className: "aui-session-row", children: [
          /* @__PURE__ */ O(
            "button",
            {
              type: "button",
              className: `aui-session-trigger${f ? " is-open" : ""}`,
              "aria-label": "切换对话窗口",
              "aria-haspopup": "listbox",
              "aria-expanded": f,
              "aria-controls": D,
              disabled: g || !c,
              title: b,
              onClick: () => {
                g || !c || R((d) => !d);
              },
              children: [
                /* @__PURE__ */ a("span", { className: "aui-session-trigger-label", children: b }),
                /* @__PURE__ */ a(Qe, { size: 14, strokeWidth: 2.4, "aria-hidden": !0 })
              ]
            }
          ),
          /* @__PURE__ */ O(
            "button",
            {
              type: "button",
              className: "aui-session-btn",
              disabled: g,
              title: "新对话窗口",
              "aria-label": "新对话",
              onClick: () => {
                g || I.current || (I.current = !0, we(800), R(!1), l(""), window.setTimeout(() => {
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
                n ? /* @__PURE__ */ a(Ae, { className: "aui-spin", size: 14, strokeWidth: 2.4, "aria-hidden": !0 }) : /* @__PURE__ */ a(Ot, { size: 14, strokeWidth: 2.4, "aria-hidden": !0 }),
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
              const N = d.messageCount ? P(d.title) : `${P(d.title)}（空）`, E = d.id === e, A = y === d.id;
              return /* @__PURE__ */ a("li", { className: "aui-session-row-item", role: "presentation", children: A ? /* @__PURE__ */ O("div", { className: "aui-session-edit", children: [
                /* @__PURE__ */ a(
                  "input",
                  {
                    ref: F,
                    className: "aui-session-edit-input",
                    value: _,
                    maxLength: 80,
                    "aria-label": "对话标题",
                    disabled: g,
                    onChange: (v) => $(v.target.value),
                    onKeyDown: (v) => {
                      v.key === "Enter" ? (v.preventDefault(), m()) : v.key === "Escape" && (v.preventDefault(), w());
                    },
                    onClick: (v) => v.stopPropagation()
                  }
                ),
                /* @__PURE__ */ a(
                  "button",
                  {
                    type: "button",
                    className: "aui-session-icon-btn",
                    "aria-label": "保存标题",
                    title: "保存",
                    disabled: g || !_.trim(),
                    onClick: (v) => {
                      v.stopPropagation(), m();
                    },
                    children: /* @__PURE__ */ a(Je, { size: 13, strokeWidth: 2.5, "aria-hidden": !0 })
                  }
                ),
                /* @__PURE__ */ a(
                  "button",
                  {
                    type: "button",
                    className: "aui-session-icon-btn",
                    "aria-label": "取消重命名",
                    title: "取消",
                    disabled: g,
                    onClick: (v) => {
                      v.stopPropagation(), w();
                    },
                    children: /* @__PURE__ */ a(Re, { size: 13, strokeWidth: 2.5, "aria-hidden": !0 })
                  }
                )
              ] }) : /* @__PURE__ */ O(be, { children: [
                /* @__PURE__ */ O(
                  "button",
                  {
                    type: "button",
                    role: "option",
                    "aria-selected": E,
                    className: `aui-session-item${E ? " is-active" : ""}`,
                    disabled: g,
                    title: N,
                    onPointerDown: (v) => {
                      v.stopPropagation(), !E && !g && oe(1e3);
                    },
                    onClick: (v) => {
                      if (v.preventDefault(), v.stopPropagation(), E) {
                        R(!1);
                        return;
                      }
                      C(d.id);
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
                    disabled: g,
                    onClick: (v) => {
                      v.preventDefault(), v.stopPropagation(), S(d);
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
                    disabled: g,
                    onClick: (v) => {
                      v.preventDefault(), v.stopPropagation(), T(d);
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
function ot(t) {
  return ((t == null ? void 0 : t.parts) || []).filter((e) => e.type === "text").map((e) => e.text).join("").trim();
}
function Bn(t, e) {
  const n = `${e.question || ""}`.trim();
  if (n) return n;
  for (let r = t.length - 1; r >= 0; r -= 1) {
    const i = t[r];
    if (i.role !== "user") continue;
    const s = ot(i);
    if (s) return s;
  }
  return "";
}
function Ln(t) {
  const e = Number(t == null ? void 0 : t.status) || 0, n = `${(t == null ? void 0 : t.message) || ""}`;
  return e === 502 || /\b502\b/.test(n);
}
class jn {
  constructor(e) {
    this.options = e;
  }
  async sendMessages({
    abortSignal: e,
    body: n,
    messages: r,
    trigger: i
  }) {
    var D, P, I, F, h;
    const s = n || {}, o = Bn(r, s);
    if (!o) throw new Error("请输入问题。");
    const u = s.assistantMode || ((P = (D = this.options).getAssistantMode) == null ? void 0 : P.call(D)) || "reading", p = s.scope || "document", c = s.context ? { ...s.context } : null, g = `${s.assistantMessageId || ""}`.trim() || `a-${Date.now().toString(36)}`, f = `${g}-text`, R = this.options.getRemoteAnswerer(), y = ((F = (I = this.options).getLocalAnswerer) == null ? void 0 : F.call(I)) || null, l = Zt(((h = R == null ? void 0 : R.getConversationId) == null ? void 0 : h.call(R)) || ""), _ = { connectionId: l.connectionId, connectionModel: l.model, connectionOptions: { ...l.options } };
    if (!R && !y)
      throw new Error("问答暂不可用：请确认已打开任务阅读器。");
    let $ = !1;
    const k = /* @__PURE__ */ new Set();
    return new ReadableStream({
      cancel: () => {
        $ = !0;
      },
      start: (b) => {
        let C = "", S = {
          citations: [],
          progress: i === "regenerate-message" ? "正在重新生成…" : "正在检索文档…",
          status: "running"
        };
        const m = (T) => {
          if (!$)
            try {
              b.enqueue(T);
            } catch {
              $ = !0;
            }
        }, w = (T) => {
          S = { ...S, ...T }, m({ type: "message-metadata", messageMetadata: S });
        };
        m({ type: "start", messageId: g, messageMetadata: S }), m({ type: "start-step" }), m({ type: "text-start", id: f }), (async () => {
          var T, d, N, E, A, v;
          try {
            if (await ((T = R == null ? void 0 : R.ensureLoaded) == null ? void 0 : T.call(R, this.options.jobId)), e != null && e.aborted) throw new Error("aborted");
            let q = R || y, U = !1, M;
            try {
              let K = [];
              M = await q.answer({
                onTurnEvent: (x) => {
                  K = en(K, x), K.length && w({ parts: K }), x.type === "citations" && w({ citations: x.citations }), x.metrics && w({ metrics: x.metrics }), x.type === "done" && w({ metrics: x.metrics, parts: x.parts || K });
                },
                question: o,
                ..._,
                assistantMode: u,
                scope: p,
                context: c,
                parentId: `${s.parentId || ""}`.trim(),
                regenerate: s.regenerate ?? i === "regenerate-message",
                userMessageId: `${s.userMessageId || ""}`.trim(),
                assistantMessageId: g,
                onAgentSessionEvent: (x) => {
                  var X, z, Y;
                  const j = (X = x == null ? void 0 : x.capabilities) == null ? void 0 : X.document_operation_confirmation_mode;
                  (j === "explicit" || j === "green_light") && ((Y = (z = this.options).onConfirmationMode) == null || Y.call(z, j));
                },
                onAgentOperationEvent: (x) => {
                  var X, z;
                  const j = `${(x == null ? void 0 : x.operation_id) || ""}`.trim();
                  j && ((z = (X = this.options).onAgentOperationSignal) == null || z.call(X, {
                    operationId: j,
                    conversationId: `${(x == null ? void 0 : x.conversation_id) || ""}`.trim() || void 0
                  }));
                },
                onAgentConfirmationRequiredEvent: (x) => {
                  var G, W;
                  const j = `${(x == null ? void 0 : x.operation_id) || ""}`.trim();
                  if (!j) return;
                  const X = `${(x == null ? void 0 : x.action) || ""}`, z = `${(x == null ? void 0 : x.current_attempt) ?? ""}`, Y = `${j}:${z}:${X}`;
                  k.has(Y) || (k.add(Y), (W = (G = this.options).onAgentOperationSignal) == null || W.call(G, { operationId: j }));
                },
                onToolEvent: (x) => {
                  if (e != null && e.aborted) return;
                  const j = tn(x);
                  j && w({ progress: j });
                },
                onProgressEvent: (x) => {
                  if (e != null && e.aborted) return;
                  const j = `${(x == null ? void 0 : x.message) || ""}`.trim();
                  j && w({ progress: j });
                },
                onAnswerDelta: (x, j) => {
                  !j || e != null && e.aborted || (C += j, S.progress && w({ progress: "" }), m({ type: "text-delta", id: f, delta: j }));
                },
                onCompress: (x) => {
                  if (C || e != null && e.aborted) return;
                  const j = Number(x == null ? void 0 : x.dropped_turns) || 0;
                  j && w({ progress: `已压缩 ${j} 轮早期对话` });
                },
                signal: e
              });
            } catch (K) {
              if (e != null && e.aborted || u === "operations" || !R || !y || !Ln(K)) throw K;
              if (U = !0, w({ progress: "在线服务暂不可用，改用本地检索…" }), await ((d = y.ensureLoaded) == null ? void 0 : d.call(y, this.options.jobId)), e != null && e.aborted) throw new Error("aborted");
              q = y, M = await q.answer({
                question: o,
                assistantMode: u,
                scope: p,
                context: c,
                signal: e
              });
            }
            if (e != null && e.aborted) {
              w({ progress: "", status: "cancelled", statusText: "已取消" }), m({ type: "abort", reason: "cancelled" });
              return;
            }
            const L = M == null ? void 0 : M.confirmationMode;
            (L === "explicit" || L === "green_light") && ((E = (N = this.options).onConfirmationMode) == null || E.call(N, L));
            const J = `${(M == null ? void 0 : M.conversationId) || ""}`.trim() || void 0, ee = /* @__PURE__ */ new Set();
            for (const K of (M == null ? void 0 : M.operationRefs) || []) {
              const x = typeof K == "string" ? K : `${(K == null ? void 0 : K.operation_id) || ""}`;
              x.trim() && ee.add(x.trim());
            }
            for (const K of (M == null ? void 0 : M.confirmationRequests) || []) {
              const x = `${(K == null ? void 0 : K.operation_id) || ""}`.trim();
              x && ee.add(x);
            }
            for (const K of ee)
              (v = (A = this.options).onAgentOperationSignal) == null || v.call(A, {
                operationId: K,
                conversationId: J,
                confirmationMode: L || void 0
              });
            const te = Ht(M == null ? void 0 : M.citations);
            let ne = Qt(
              `${(M == null ? void 0 : M.answer) || C || ""}`.trim() || "没有找到可用回答。",
              te
            );
            if (U && (ne += `

_在线服务暂不可用，以上来自本地文档检索。_`), (M == null ? void 0 : M.persisted) === !1 && (ne += `

_⚠️ 本轮回答未能写入历史记录（存储暂时不可用），刷新后可能丢失。_`), !C)
              m({ type: "text-delta", id: f, delta: ne });
            else if (ne.startsWith(C)) {
              const K = ne.slice(C.length);
              K && m({ type: "text-delta", id: f, delta: K });
            }
            m({ type: "text-end", id: f }), w({
              citations: te,
              persisted: (M == null ? void 0 : M.persisted) !== !1,
              progress: "",
              status: "complete",
              incompleteReason: `${(M == null ? void 0 : M.incompleteReason) || ""}`.trim(),
              source: `${(M == null ? void 0 : M.source) || ""}`.trim()
            }), m({ type: "finish-step" }), m({ type: "finish", finishReason: "stop", messageMetadata: S });
          } catch (q) {
            if (e != null && e.aborted)
              w({ progress: "", status: "cancelled", statusText: "已取消" }), m({ type: "abort", reason: "cancelled" });
            else {
              const U = q instanceof Error && q.message ? q.message : "生成回答失败，请重试。";
              w({ progress: "", status: "error", statusText: U }), m({ type: "error", errorText: U });
            }
          } finally {
            if (!$) {
              $ = !0;
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
function Kn(t) {
  return ot(t);
}
function ct(t) {
  return t.map((e) => {
    var n, r;
    return {
      id: e.id,
      role: e.role,
      metadata: e.role === "assistant" ? {
        citations: e.citations || [],
        parts: e.parts,
        metrics: e.metrics,
        ...e.source ? { source: e.source } : {},
        progress: e.progress || "",
        status: ((n = e.status) == null ? void 0 : n.type) === "running" ? "running" : ((r = e.status) == null ? void 0 : r.type) === "incomplete" ? e.status.reason === "cancelled" ? "cancelled" : "error" : "complete"
      } : void 0,
      parts: [{ type: "text", text: e.content || "" }]
    };
  });
}
function Wn(t) {
  const e = t.metadata || {}, n = e.status === "running", r = e.status === "cancelled" || e.status === "error", i = Kn(t), s = i.trim() || (r ? `${e.statusText || ""}`.trim() : "");
  return {
    id: t.id,
    role: t.role,
    content: t.role === "assistant" ? s : i,
    ...t.role === "assistant" ? {
      citations: e.citations || [],
      parts: e.parts,
      metrics: e.metrics,
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
function Un(t) {
  const e = B(t.remoteAnswerer), n = B(t.localAnswerer), r = B(t.onAgentOperationSignal), i = B(t.onConfirmationMode), s = B(t.onStopped);
  s.current = t.onStopped;
  const o = B(t.assistantMode);
  e.current = t.remoteAnswerer, n.current = t.localAnswerer, r.current = t.onAgentOperationSignal, i.current = t.onConfirmationMode, o.current = t.assistantMode;
  const u = Z(() => new Jt({
    id: `reader-${t.jobId || "idle"}`,
    transport: new jn({
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
  return V(() => {
    t.enabled || u.stop().finally(() => {
      var p;
      return (p = s.current) == null ? void 0 : p.call(s);
    });
  }, [u, t.enabled]), V(() => () => {
    u.stop().finally(() => {
      var p;
      return (p = s.current) == null ? void 0 : p.call(s);
    });
  }, [u]), Xt({ chat: u, experimental_throttle: 16 });
}
function Hn(t) {
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
          ...n.message.parts ? { parts: n.message.parts, metrics: n.message.metrics } : {},
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
  const n = new Map(t.map((u) => [u.message.id, u])), r = e && n.get(e) || t.at(-1);
  if (!r) return [];
  const i = [];
  let s = r;
  const o = /* @__PURE__ */ new Set();
  for (; s && !o.has(s.message.id); )
    o.add(s.message.id), i.push(s.message), s = s.parentId ? n.get(s.parentId) : void 0;
  return i.reverse();
}
function Gn(t, e) {
  var n;
  return e ? ((n = t.find((r) => r.message.id === e)) == null ? void 0 : n.message) ?? null : null;
}
function Vn(t, e) {
  const n = new Map(t.map((o) => [o.message.id, o]));
  let r = n.get(e);
  if (!r) return [];
  const i = [], s = /* @__PURE__ */ new Set();
  for (; r && !s.has(r.message.id); )
    s.add(r.message.id), i.push(r), r = r.parentId ? n.get(r.parentId) : void 0;
  return i.reverse();
}
function Qn(t, e, n) {
  var g, f, R, y;
  const r = `${e || ""}`.trim();
  if (!r || !t.length) return [];
  let i = r;
  t.some((l) => l.message.id === i) || (n && t.some((l) => l.message.id === n) ? i = n : i = ((g = [...t].reverse().find((l) => l.message.role === "assistant")) == null ? void 0 : g.message.id) || "");
  let s = Vn(t, i);
  if (s.length >= 2 && ((f = s.at(-1)) == null ? void 0 : f.message.role) === "assistant") return s;
  s.length === 1 && ((R = s[0]) == null ? void 0 : R.message.role) === "user" && (s = []);
  const o = ce(t, n || i);
  let u = o.findIndex((l) => l.id === i);
  if (u < 0 && (u = o.length - 1), u < 0) return s;
  const p = new Map(t.map((l) => [l.message.id, l])), c = o.slice(0, u + 1).map((l) => p.get(l.id)).filter((l) => !!l);
  for (; c.length && ((y = c.at(-1)) == null ? void 0 : y.message.role) !== "assistant"; ) c.pop();
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
const Yn = {
  stopStream: () => Promise.resolve(),
  clearMessages: () => {
  },
  showMessages: () => {
  }
};
function Jn(t) {
  var n;
  const e = {};
  for (const r of t) {
    const i = r.message;
    i.role === "assistant" && ((n = i.citations) != null && n.length) && (e[i.id] = i.citations);
  }
  return e;
}
function Xn(t) {
  const e = {};
  for (const n of t) {
    const r = n.message;
    r.role === "assistant" && r.progress && (e[r.id] = r.progress);
  }
  return e;
}
function Zn(t) {
  const e = {};
  for (const n of t) {
    const r = n.message;
    r.content && (e[r.id] = r.content);
  }
  return e;
}
function er(t, e, n) {
  var i;
  const r = e || ((i = n == null ? void 0 : n.getConversationId) == null ? void 0 : i.call(n)) || "";
  return (t || []).map((s) => ({
    ...nn(s, { active: r }),
    active: s.conversation_id === r
  }));
}
function tr(t) {
  const { setItems: e, setHeadId: n } = t;
  return {
    readItems: () => t.itemsRef.current,
    readHeadId: () => t.headIdRef.current,
    appendExchange: ({ parentId: r, userId: i, assistantId: s, question: o, progress: u }) => {
      e((p) => [
        ...p,
        { parentId: r, message: { id: i, role: "user", content: o } },
        {
          parentId: i,
          message: {
            id: s,
            role: "assistant",
            content: "",
            progress: u,
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
        var u;
        return ((u = o.message.status) == null ? void 0 : u.type) === "running" ? {
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
function nr(t) {
  const {
    jobId: e,
    documentId: n,
    enabled: r,
    refreshSessions: i,
    applyConversationTree: s,
    remoteRef: o,
    streamRef: u,
    itemsRef: p,
    documentIdRef: c,
    lastJobRef: g,
    persistReadyRef: f,
    switchTokenRef: R,
    sessionListGenerationRef: y,
    activeConversationIdRef: l,
    setItems: _,
    setHeadId: $,
    setSessions: k,
    setActiveConversationId: D,
    setSessionBusy: P
  } = t;
  V(() => {
    const I = o.current;
    if (!e) {
      y.current += 1, R.current += 1, _([]), $(null), k([]), D(""), u.current.clearMessages(), l.current = "", g.current = "", c.current = "", f.current = !1;
      return;
    }
    const F = g.current !== e;
    if (F && (y.current += 1, R.current += 1, g.current = e, f.current = !1, _([]), $(null), u.current.clearMessages(), k([]), D(""), l.current = "", c.current = "", P(!1)), !r || !I) {
      y.current += 1;
      return;
    }
    let h = !1;
    return (async () => {
      var T, d, N, E;
      let b = `${n || c.current || ""}`.trim();
      if (!b) {
        try {
          b = `${await ((T = I.getDocumentId) == null ? void 0 : T.call(I)) || ""}`.trim();
        } catch {
          b = "";
        }
        if (h) return;
      }
      b && (c.current = b);
      let C = null;
      if (!h && b && (C = await i(b)), !(F || !p.current.length) || h) {
        h || (f.current = !0);
        return;
      }
      const m = rn({ jobId: e, documentId: b }) || `${((d = I.getConversationId) == null ? void 0 : d.call(I)) || ""}`.trim();
      if (m) {
        D(m), l.current = m, (N = I.setConversationId) == null || N.call(I, m, b);
        try {
          const A = await qe(m);
          if (h) return;
          const v = Ie(A.messages || []);
          if (v.length) {
            s(v, A.head_id), requestAnimationFrame(() => {
              h || (f.current = !0);
            });
            return;
          }
        } catch {
        }
      }
      if (!h && b)
        try {
          const A = C ?? await i(b);
          if (h || !A) return;
          const v = A[0];
          if (v != null && v.conversation_id) {
            const q = v.conversation_id;
            D(q), l.current = q, (E = I.setConversationId) == null || E.call(I, q, b);
            try {
              const U = await qe(q);
              if (h) return;
              s(
                Ie(U.messages || []),
                U.head_id
              ), requestAnimationFrame(() => {
                h || (f.current = !0);
              });
              return;
            } catch {
            }
          }
        } catch {
        }
      if (h) return;
      const w = et({ jobId: e, documentId: b }, m);
      if (w != null && w.items.length) {
        const A = dt(w);
        _(A.items), $(A.headId), u.current.showMessages(ce(A.items, A.headId));
      } else
        _([]), $(null), u.current.clearMessages();
      requestAnimationFrame(() => {
        h || (f.current = !0);
      });
    })(), () => {
      h = !0, y.current += 1;
    };
  }, [e, n, r, i, s]);
}
function rr(t) {
  const {
    jobId: e,
    documentId: n,
    items: r,
    headId: i,
    activeConversationId: s,
    documentIdRef: o,
    persistReadyRef: u
  } = t;
  V(() => {
    if (!e || !u.current) return;
    const p = s, c = { jobId: e, documentId: n || o.current }, g = window.setTimeout(() => {
      if (!r.length) {
        he(c, p);
        return;
      }
      $e(c, Te(r, i), p);
    }, 280);
    return () => window.clearTimeout(g);
  }, [e, n, r, i, s]);
}
function sr(t) {
  const {
    jobId: e,
    documentId: n,
    sessionBusy: r,
    sessions: i,
    streamRef: s,
    remoteRef: o,
    itemsRef: u,
    headIdRef: p,
    activeConversationIdRef: c,
    documentIdRef: g,
    switchTokenRef: f,
    persistReadyRef: R,
    setSessionBusy: y,
    setSessionError: l,
    setActiveConversationId: _,
    setItems: $,
    setHeadId: k,
    setSessions: D,
    refreshSessions: P,
    applyConversationTree: I
  } = t, F = Q(() => {
    var w, T;
    const m = `${((T = (w = o.current) == null ? void 0 : w.getConversationId) == null ? void 0 : T.call(w)) || ""}`.trim();
    m && _(m);
  }, []), h = Q(async () => {
    var w, T;
    if (r) return;
    await s.current.stopStream(), ue(900), oe(900), y(!0), l("");
    const m = ++f.current;
    try {
      if (await new Promise((E) => {
        window.setTimeout(E, 40);
      }), m !== f.current) return;
      const d = o.current, N = g.current || `${await ((w = d == null ? void 0 : d.getDocumentId) == null ? void 0 : w.call(d)) || ""}`.trim();
      if (m !== f.current) return;
      g.current = N, (T = d == null ? void 0 : d.clearConversationId) == null || T.call(d, N), _(""), c.current = "", $([]), k(null), s.current.clearMessages(), he({ jobId: e, documentId: N }), N && await P(N, m);
    } catch (d) {
      console.warn("[reader-ai] new session failed", d), l("无法创建新对话，请重试。");
    } finally {
      m === f.current && y(!1);
    }
  }, [e, P, r]), b = Q(async (m) => {
    var E, A, v, q, U;
    const w = `${m || ""}`.trim();
    if (!w)
      return l("无法分支：消息 id 无效。"), !1;
    if (r)
      return l("请稍候，当前有会话操作进行中。"), !1;
    await s.current.stopStream();
    const T = Qn(u.current, w, p.current);
    if (!T.length)
      return l("无法分支：找不到到此答案的对话路径。"), !1;
    if (T[T.length - 1].message.role !== "assistant")
      return l("只能从助手答案处开新对话。"), !1;
    y(!0), l("");
    const N = ++f.current;
    try {
      if (await new Promise((W) => {
        window.setTimeout(W, 40);
      }), N !== f.current) return !1;
      const M = o.current;
      let L = g.current || `${await ((E = M == null ? void 0 : M.getDocumentId) == null ? void 0 : E.call(M)) || ""}`.trim();
      if (N !== f.current) return !1;
      if (g.current = L, !L)
        try {
          if (L = `${await ((A = M == null ? void 0 : M.getDocumentId) == null ? void 0 : A.call(M)) || ""}`.trim(), N !== f.current) return !1;
          g.current = L;
        } catch {
          L = "";
        }
      if (!L)
        return l("无法分支：文档未就绪，请稍后重试。"), !1;
      const J = T.map((W, ie) => ({
        id: W.message.id,
        role: W.message.role,
        content: W.message.content,
        citations: W.message.citations,
        parentId: ie === 0 ? null : T[ie - 1].message.id
      })), ee = c.current || ((v = M == null ? void 0 : M.getConversationId) == null ? void 0 : v.call(M)) || "", te = (i || []).find((W) => W.conversation_id === ee), ne = J.find((W) => W.role === "user"), K = `${(te == null ? void 0 : te.title) || ""}`.trim() || `${(ne == null ? void 0 : ne.content) || ""}`.replace(/\s+/g, " ").trim() || "未命名对话", x = (i || []).map((W) => W.title || ""), j = sn(K, x), X = await me().forkFromPath({
        documentId: L,
        title: j,
        path: J
      });
      if (N !== f.current) return !1;
      const z = Se(X.items), Y = ((q = z[z.length - 1]) == null ? void 0 : q.message.id) || null, G = X.conversation.conversation_id;
      if (!G || !z.length)
        throw new Error("fork returned empty conversation");
      return ue(600), oe(600), $(z), k(Y), s.current.showMessages(ce(z, Y)), _(G), c.current = G, (U = M == null ? void 0 : M.setConversationId) == null || U.call(M, G, L), D((W) => {
        const ie = {
          conversation_id: G,
          title: j,
          document_id: L,
          created_at: X.conversation.created_at || (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: X.conversation.updated_at || (/* @__PURE__ */ new Date()).toISOString(),
          message_count: z.length,
          head_id: Y || ""
        }, de = W.filter((pe) => pe.conversation_id !== G);
        return [ie, ...de];
      }), $e(
        { jobId: e, documentId: L },
        Te(z, Y),
        G
      ), await P(L, N), !0;
    } catch (M) {
      return console.warn("[reader-ai] branch from answer failed", M), N === f.current && l("分支失败：未能复制上文到新对话。请检查网络后重试。"), !1;
    } finally {
      N === f.current && y(!1);
    }
  }, [e, P, r, i]), C = Q(async (m) => {
    var d, N, E, A;
    const w = `${m || ""}`.trim();
    if (!w || r) return;
    await s.current.stopStream(), y(!0), l("");
    const T = ++f.current;
    try {
      const v = o.current, q = g.current || `${await ((d = v == null ? void 0 : v.getDocumentId) == null ? void 0 : d.call(v)) || ""}`.trim();
      if (T !== f.current) return;
      g.current = q;
      try {
        await me().delete(w);
      } catch (L) {
        if ((Number(L == null ? void 0 : L.status) || 0) !== 404) throw L;
      }
      he({ jobId: e, documentId: q }, w);
      const M = (c.current || ((N = v == null ? void 0 : v.getConversationId) == null ? void 0 : N.call(v)) || "") === w;
      if (D((L) => L.filter((J) => J.conversation_id !== w)), M) {
        (E = v == null ? void 0 : v.clearConversationId) == null || E.call(v, q), _(""), c.current = "", $([]), k(null), s.current.clearMessages(), he({ jobId: e, documentId: q });
        const L = q ? await P(q, T) : [];
        if (T !== f.current || !L) return;
        const J = L[0];
        if (J != null && J.conversation_id) {
          const ee = J.conversation_id;
          _(ee), c.current = ee;
          try {
            const te = await me().get(ee);
            if (T !== f.current) return;
            I(
              Ie(te.messages || []),
              te.head_id
            ), (A = v == null ? void 0 : v.setConversationId) == null || A.call(v, ee, q);
          } catch {
            $([]), k(null);
          }
        }
      } else q && await P(q, T);
    } catch (v) {
      console.warn("[reader-ai] delete session failed", v), l("删除对话失败，请重试。");
    } finally {
      T === f.current && y(!1);
    }
  }, [I, e, P, r]), S = Q(async (m, w) => {
    const T = `${m || ""}`.trim(), d = `${w || ""}`.replace(/\s+/g, " ").trim();
    if (!T || !d || r) return;
    y(!0), l("");
    const N = ++f.current;
    try {
      const E = d.slice(0, 80);
      if (await me().patch(T, { title: E }), N !== f.current) return;
      D(
        (v) => v.map(
          (q) => q.conversation_id === T ? { ...q, title: E } : q
        )
      );
      const A = g.current;
      A && await P(A, N);
    } catch (E) {
      console.warn("[reader-ai] rename session failed", E), l("重命名失败，请重试。");
    } finally {
      N === f.current && y(!1);
    }
  }, [P, r]);
  return {
    adoptRemoteConversationId: F,
    newSession: h,
    branchFromAnswer: b,
    removeSession: C,
    renameSession: S
  };
}
function ar(t) {
  var j;
  const {
    jobId: e,
    documentId: n = "",
    enabled: r,
    remoteAnswerer: i = null,
    stream: s = Yn
  } = t, [o, u] = H([]), [p, c] = H(null), [g, f] = H([]), [R, y] = H(""), [l, _] = H(!1), [$, k] = H(""), D = B(o), P = B(p), I = B(R), F = B(!1), h = B(""), b = B(""), C = B(0), S = B(0), m = B(s);
  m.current = s;
  const w = B(i);
  w.current = i, D.current = o, P.current = p, I.current = R;
  const T = Q(async (X = "", z) => {
    const Y = `${X || b.current || ""}`.trim(), G = ++S.current;
    if (!Y)
      return G === S.current && (z === void 0 || z === C.current) && f([]), [];
    try {
      const W = me();
      if (!W) return null;
      const de = (await W.list({ document_id: Y, limit: 50 })).conversations || [];
      return G === S.current && Y === `${b.current || ""}`.trim() && (z === void 0 || z === C.current) ? (f(de), de) : null;
    } catch {
      return null;
    }
  }, []), d = Q((X, z) => {
    var W;
    const Y = Se(X), G = `${z || ""}`.trim() || ((W = Y[Y.length - 1]) == null ? void 0 : W.message.id) || null;
    u(Y), c(G), m.current.showMessages(ce(Y, G));
  }, []), N = Q(() => `${n || b.current || e}`.trim(), [n, e]);
  nr({
    jobId: e,
    documentId: n,
    enabled: r,
    refreshSessions: T,
    applyConversationTree: d,
    remoteRef: w,
    streamRef: m,
    itemsRef: D,
    documentIdRef: b,
    lastJobRef: h,
    persistReadyRef: F,
    switchTokenRef: C,
    sessionListGenerationRef: S,
    activeConversationIdRef: I,
    setItems: u,
    setHeadId: c,
    setSessions: f,
    setActiveConversationId: y,
    setSessionBusy: _
  }), rr({
    jobId: e,
    documentId: n,
    items: o,
    headId: p,
    activeConversationId: R,
    documentIdRef: b,
    persistReadyRef: F
  });
  const E = Z(
    () => ce(o, p),
    [o, p]
  ), A = Z(
    () => Jn(o),
    [o]
  ), v = Z(
    () => Xn(o),
    [o]
  ), q = Z(
    () => Zn(o),
    [o]
  ), U = Z(() => tr({ setItems: u, setHeadId: c, itemsRef: D, headIdRef: P }), []), {
    adoptRemoteConversationId: M,
    newSession: L,
    branchFromAnswer: J,
    removeSession: ee,
    renameSession: te
  } = sr({
    jobId: e,
    documentId: n,
    sessionBusy: l,
    sessions: g,
    streamRef: m,
    remoteRef: w,
    itemsRef: D,
    headIdRef: P,
    activeConversationIdRef: I,
    documentIdRef: b,
    switchTokenRef: C,
    persistReadyRef: F,
    setSessionBusy: _,
    setSessionError: k,
    setActiveConversationId: y,
    setItems: u,
    setHeadId: c,
    setSessions: f,
    refreshSessions: T,
    applyConversationTree: d
  }), ne = Q(async (X) => {
    var W, ie, de, pe, xe, Ee, Pe, Oe;
    const z = `${X || ""}`.trim(), Y = I.current || ((ie = (W = w.current) == null ? void 0 : W.getConversationId) == null ? void 0 : ie.call(W)) || "";
    if (!z || z === Y || l) return;
    await m.current.stopStream(), ue(1200), oe(1200), _(!0), k("");
    const G = ++C.current;
    F.current = !1, y(z), I.current = z, u([]), c(null), m.current.clearMessages();
    try {
      if (await new Promise((ye) => {
        window.setTimeout(ye, 80);
      }), G !== C.current) return;
      try {
        (xe = (pe = (de = globalThis.document) == null ? void 0 : de.activeElement) == null ? void 0 : pe.blur) == null || xe.call(pe);
      } catch {
      }
      const re = w.current, se = b.current || `${await ((Ee = re == null ? void 0 : re.getDocumentId) == null ? void 0 : Ee.call(re)) || ""}`.trim();
      if (G !== C.current) return;
      b.current = se;
      const le = me();
      if (!le) throw new Error("Reader conversations unavailable");
      const Ce = await le.get(z);
      if (G !== C.current) return;
      ue(800), oe(800);
      const Ne = Ie(Ce.messages || []);
      if (d(Ne, Ce.head_id), (Pe = re == null ? void 0 : re.setConversationId) == null || Pe.call(re, z, se), F.current = !0, Ne.length) {
        const ye = Se(Ne);
        $e(
          { jobId: e, documentId: se },
          Te(
            ye,
            `${Ce.head_id || ""}`.trim() || ((Oe = ye.at(-1)) == null ? void 0 : Oe.message.id) || null
          ),
          z
        );
      } else
        he({ jobId: e, documentId: se }, z);
      se && await T(se, G), ue(350), oe(350);
    } catch (re) {
      if (console.warn("[reader-ai] switch session failed", re), G === C.current) {
        k("加载该对话失败，请检查网络后重试。");
        const se = et(
          { jobId: e, documentId: n || b.current },
          z
        );
        if (se != null && se.items.length) {
          const le = dt(se);
          u(le.items), c(le.headId), m.current.showMessages(ce(le.items, le.headId));
        } else
          u([]), c(null);
        F.current = !0;
      }
    } finally {
      G === C.current && _(!1);
    }
  }, [
    d,
    e,
    n,
    T,
    l
  ]), K = Z(
    () => er(g, R, i),
    [g, R, i]
  ), x = Z(() => ({
    refreshSessions: T,
    adoptRemoteConversationId: M,
    newSession: L,
    switchSession: ne,
    removeSession: ee,
    renameSession: te,
    branchFromAnswer: J
  }), [
    T,
    M,
    L,
    ne,
    ee,
    te,
    J
  ]);
  return {
    items: o,
    headId: p,
    messages: E,
    citationsByMessageId: A,
    progressByMessageId: v,
    contentByMessageId: q,
    sessions: K,
    activeConversationId: R || ((j = i == null ? void 0 : i.getConversationId) == null ? void 0 : j.call(i)) || "",
    sessionBusy: l,
    sessionError: $,
    resolveRequestScopeKey: N,
    tree: U,
    sessionCommands: x
  };
}
const ir = "retainpdf.reader.ai.request.v1:", or = Object.freeze({
  assistantMode: "reading",
  scope: "document",
  context: null
});
function lt(t, e) {
  return `${ir}${`${t || ""}`.trim()}:${`${e || ""}`.trim()}`;
}
function cr(t) {
  if (!t || typeof t != "object" || Array.isArray(t)) return null;
  const e = t, n = e.assistantMode === "operations" ? "operations" : e.assistantMode === "reading" ? "reading" : null, r = e.scope === "selection" || e.scope === "page" || e.scope === "document" ? e.scope : null;
  if (!n || !r) return null;
  const i = e.context && typeof e.context == "object" && !Array.isArray(e.context) ? { ...e.context } : null;
  return { assistantMode: n, scope: r, context: i };
}
function Le(t, e, n) {
  var s;
  const r = `${t || ""}`.trim(), i = `${e || ""}`.trim();
  if (!(!r || !i))
    try {
      (s = globalThis.localStorage) == null || s.setItem(
        lt(r, i),
        JSON.stringify(n)
      );
    } catch {
    }
}
function je(t, e) {
  var i;
  const n = `${t || ""}`.trim(), r = `${e || ""}`.trim();
  if (!n || !r) return null;
  try {
    const s = (i = globalThis.localStorage) == null ? void 0 : i.getItem(lt(n, r));
    return s ? cr(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}
function dr(t) {
  const e = `${t.scopeKey || ""}`.trim(), n = `${t.jobId || ""}`.trim(), r = `${t.assistantMessageId || ""}`.trim();
  return je(e, r) || (e !== n ? je(n, r) : null) || or;
}
function lr(t) {
  const { assistantMode: e, selectionContext: n } = t;
  return e === "operations" ? { assistantMode: e, scope: "document", context: null } : n ? { assistantMode: e, scope: "selection", context: { ...n } } : { assistantMode: e, scope: "document", context: null };
}
function ur(t) {
  var F;
  const { jobId: e, assistantMode: n, selectionContext: r = null, tree: i, chat: s, getScopeKey: o } = t, u = B(i);
  u.current = i;
  const p = B(s);
  p.current = s;
  const c = B(n);
  c.current = n;
  const g = B(r);
  g.current = r;
  const f = B(o);
  f.current = o;
  const R = s.status, y = R === "submitted" || R === "streaming", l = B(y);
  l.current = y;
  const _ = y ? `${((F = Hn(s.messages)) == null ? void 0 : F.id) || ""}` : "", $ = s.messages, k = s.error;
  V(() => {
    if (!$.length) return;
    const h = new Map($.map((C) => [C.id, C])), b = /* @__PURE__ */ new Map();
    for (const [C, S] of h)
      b.set(C, Wn(S));
    u.current.mergeChatMirror(b);
  }, [$]), V(() => {
    !k || R !== "error" || u.current.markRunningAsError(k.message);
  }, [k, R]);
  const D = Q(async (h) => {
    if (l.current) return;
    const b = `${h || ""}`.trim();
    if (!b) return;
    const C = u.current, S = p.current, m = c.current, w = g.current, T = f.current(), d = C.readHeadId(), N = _e("u"), E = _e("a"), A = lr({
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
        quoteText: Ze(w.region, w.pane)
      } : null
    });
    Le(T, E, A), C.appendExchange({
      parentId: d,
      userId: N,
      assistantId: E,
      question: b,
      progress: A.assistantMode === "operations" ? "正在规划 PDF 操作…" : "正在理解文档…"
    }), await S.sendUserMessage(
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
  }, []), P = Q(async (h) => {
    if (l.current) return;
    const b = u.current, C = p.current, S = b.readItems(), m = S.find(
      (U) => U.message.id === h && U.message.role === "assistant"
    ), w = (m == null ? void 0 : m.parentId) ?? null, T = w ? Gn(S, w) : null;
    let d = "", N = w;
    if ((T == null ? void 0 : T.role) === "user")
      d = T.content.trim();
    else {
      const U = ce(S, w ?? b.readHeadId());
      for (let M = U.length - 1; M >= 0; M -= 1)
        if (U[M].role === "user") {
          d = U[M].content.trim(), N = U[M].id;
          break;
        }
    }
    if (!d) return;
    const E = _e("a"), A = N || w, v = f.current(), q = dr({
      scopeKey: v,
      jobId: e,
      assistantMessageId: h
    });
    Le(v, E, q), b.appendRetryTurn({ assistantId: E, branchParent: A }), C.replaceVisible(ct(ce(S, h))), await C.regenerateFrom({
      messageId: h,
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
  }, [e]), I = Q(async () => {
    await p.current.stopStream(), u.current.markRunningCancelled();
  }, []);
  return {
    isRunning: y,
    streamingAssistantId: _,
    submitQuestion: D,
    retryAnswer: P,
    cancelAnswer: I
  };
}
const pr = "retainpdf.reader-agent-operation.action-key.v1:", mr = "reader-";
function Ke(t, e) {
  return cn(t, e);
}
function fr(t) {
  return on(t);
}
function hr(t, e) {
  return an(t, e);
}
function gr(t) {
  return dn(t);
}
function yr(t) {
  return ln(t);
}
function vr({
  conversationId: t,
  enabled: e,
  discovering: n,
  signal: r,
  confirmationModeHint: i,
  onDocumentCommitted: s
}) {
  const [o, u] = H({}), [p, c] = H("explicit"), [g, f] = H(!1), [R, y] = H(!1), l = B(/* @__PURE__ */ new Set()), _ = B(/* @__PURE__ */ new Set()), $ = B(/* @__PURE__ */ new Set()), k = Q((h, b = !1) => {
    h != null && h.operation_id && u((C) => {
      const S = C[h.operation_id];
      return hr(S == null ? void 0 : S.operation, h) ? {
        ...C,
        [h.operation_id]: {
          ...S,
          operation: h,
          pendingAction: void 0,
          error: void 0
        }
      } : !b || !(S != null && S.pendingAction) ? C : {
        ...C,
        [h.operation_id]: { ...S, pendingAction: void 0 }
      };
    });
  }, []), D = Q(async (h, b = !1) => {
    const C = `${h || ""}`.trim(), S = `refresh:${C}`;
    if (!(!C || l.current.has(S))) {
      l.current.add(S);
      try {
        const m = fe();
        if (!m) return;
        k(await m.get(C), b);
      } catch {
      } finally {
        l.current.delete(S);
      }
    }
  }, [k]), P = Q(async () => {
    const h = `${t || ""}`.trim(), b = `recover:${h}`;
    if (!(!e || !h || l.current.has(b))) {
      l.current.add(b);
      try {
        const C = fe();
        if (!C) return;
        const S = await C.list(h, {});
        if (!$.current.has(h)) {
          for (const m of S.operations || [])
            m.status === "committed" && _.current.add(m.operation_id);
          $.current.add(h);
        }
        for (const m of S.operations || []) k(m);
      } catch {
      } finally {
        l.current.delete(b);
      }
    }
  }, [t, e, k]);
  V(() => {
    if (!e) return;
    let h = !1;
    const b = async () => {
      try {
        const S = fe();
        if (!S) return;
        const m = await S.fetchRuntimeConfig();
        if (h) return;
        c(m.agent_confirmation_mode || "explicit"), y(!!m.llm_api_key_configured), f(
          m.restart_required || m.restart_state === "pending" || m.active_revision !== m.configured_revision
        );
      } catch {
        h || (f(!1), y(!1));
      }
    };
    b();
    const C = window.setInterval(b, 3e3);
    return () => {
      h = !0, window.clearInterval(C);
    };
  }, [e]), V(() => {
    i && c(i);
  }, [i]), V(() => {
    r != null && r.confirmationMode && c(r.confirmationMode), r != null && r.operationId && D(r.operationId);
  }, [D, r]), V(() => {
    P();
  }, [P]), V(() => {
    n || P();
  }, [n, P]);
  const I = Z(
    () => Object.values(o).filter((h) => !!t && h.operation.conversation_id === t).sort((h, b) => `${h.operation.created_at || ""}`.localeCompare(`${b.operation.created_at || ""}`)),
    [t, o]
  );
  V(() => {
    var h;
    for (const b of I) {
      const C = b.operation;
      C.status !== "committed" || _.current.has(C.operation_id) || (_.current.add(C.operation_id), s == null || s({
        documentId: C.document_id,
        revision: ((h = C.candidate) == null ? void 0 : h.version_id) || `${C.updated_at || ""}` || `${C.operation_id}:${fr(C)}`
      }));
    }
  }, [I, s]);
  const F = I.some((h) => Ke(h.operation.status, p));
  return V(() => {
    if (!e || !t || !n && !F) return;
    const h = window.setInterval(() => {
      P();
      for (const b of I)
        Ke(b.operation.status, p) && D(b.operation.operation_id);
    }, 1400);
    return () => window.clearInterval(h);
  }, [p, t, n, e, I, F, P, D]), V(() => {
    if (!e) return;
    const h = () => void P(), b = () => {
      document.visibilityState === "visible" && h();
    };
    return window.addEventListener("online", h), document.addEventListener("visibilitychange", b), () => {
      window.removeEventListener("online", h), document.removeEventListener("visibilitychange", b);
    };
  }, [e, P]), {
    entries: I,
    confirmationMode: p,
    runtimeRestarting: g,
    runtimeCredentialConfigured: R,
    setEntriesById: u,
    inFlightRef: l,
    upsert: k,
    refresh: D
  };
}
function wr() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return;
  }
}
function ut() {
  return {
    storagePrefix: pr,
    keyPrefix: mr,
    storage: wr()
  };
}
function Ir(t, e, n) {
  return un(t, e, n, ut());
}
function We(t, e, n) {
  pn(t, e, n, ut());
}
function br({
  refresh: t,
  upsert: e,
  setEntriesById: n,
  inFlightRef: r
}) {
  const i = B(/* @__PURE__ */ new Map());
  return { perform: Q(async (o, u, p = {}) => {
    const c = `${u.operation_id || ""}`.trim(), g = `action:${c}`;
    if (!c || r.current.has(g)) return;
    if (o === "retry" && u.status === "ambiguous" && p.acceptDuplicateRisk !== !0) {
      n((y) => ({
        ...y,
        [c]: {
          ...y[c],
          error: "请先确认重复执行风险，再重新执行操作。"
        }
      }));
      return;
    }
    const f = Ir(c, o, i.current);
    r.current.add(g), n((y) => ({
      ...y,
      [c]: { ...y[c], pendingAction: o, error: void 0 }
    }));
    const R = {
      idempotency_key: f,
      expected_status: u.status,
      expected_attempt: u.current_attempt,
      expected_program_sha256: u.program_sha256 || ""
    };
    try {
      const y = fe();
      if (!y) throw new Error("Reader AI operations unavailable");
      let l;
      o === "run" ? l = await y.run(c, R) : o === "cancel" ? l = await y.cancel(c, { ...R, reason: "user_rejected" }) : o === "commit" ? l = await y.commit(c, R) : l = await y.retry(c, p.acceptDuplicateRisk ? { ...R, accept_duplicate_risk: !0 } : R), We(c, o, i.current), e(l, !0);
    } catch (y) {
      gr(y) === 409 ? (We(c, o, i.current), await t(c, !0)) : n((l) => ({
        ...l,
        [c]: {
          ...l[c],
          pendingAction: void 0,
          error: yr(y)
        }
      }));
    } finally {
      r.current.delete(g);
    }
  }, [t, e]) };
}
function Rr({
  conversationId: t,
  enabled: e,
  discovering: n,
  signal: r,
  confirmationModeHint: i,
  onDocumentCommitted: s
}) {
  const o = vr({
    conversationId: t,
    enabled: e,
    discovering: n,
    signal: r,
    confirmationModeHint: i,
    onDocumentCommitted: s
  }), { perform: u } = br({
    refresh: o.refresh,
    upsert: o.upsert,
    setEntriesById: o.setEntriesById,
    inFlightRef: o.inFlightRef
  }), p = Q((c) => {
    var g;
    return ((g = fe()) == null ? void 0 : g.fetchCandidate(c.operation_id)) ?? Promise.reject(new Error("Reader AI operations unavailable"));
  }, []);
  return {
    entries: o.entries,
    confirmationMode: o.confirmationMode,
    runtimeRestarting: o.runtimeRestarting,
    runtimeCredentialConfigured: o.runtimeCredentialConfigured,
    perform: u,
    loadCandidate: p
  };
}
function Cr(t) {
  var S;
  const {
    jobId: e,
    documentId: n = "",
    sessionIdentity: r = "",
    enabled: i,
    selectionContext: s = null,
    onDocumentCommitted: o
  } = t, u = `${e}\0${n}\0${r}`, [p, c] = H("reading"), [g, f] = H(null), [R, y] = H();
  V(() => {
    c("reading"), f(null), y(void 0);
  }, [u]);
  const l = Z(() => {
    var m;
    return !i || !e ? null : ((m = De()) == null ? void 0 : m.createRemoteAnswerer({ jobId: e, documentId: n })) ?? qt({ jobId: e, documentId: n });
  }, [n, i, e]), _ = Z(() => {
    var m;
    return !i || !e ? null : ((m = De()) == null ? void 0 : m.createLocalAnswerer({ jobId: e })) ?? Yt({
      loadMarkdownPayload: zt.loadMarkdownPayload
    });
  }, [i, e]), $ = B(null), k = Un({
    jobId: e,
    enabled: i,
    remoteAnswerer: l,
    localAnswerer: _,
    assistantMode: p,
    onAgentOperationSignal: (m) => {
      f({ ...m, nonce: Date.now() + Math.random() });
    },
    onConfirmationMode: y,
    onStopped: () => {
      var m;
      return (m = $.current) == null ? void 0 : m.markRunningCancelled();
    }
  }), D = Z(() => ({
    messages: k.messages,
    status: k.status,
    error: k.error,
    sendUserMessage: (m, w) => k.sendMessage(
      m,
      w
    ),
    regenerateFrom: (m) => k.regenerate(
      m
    ),
    stopStream: () => k.stop(),
    replaceVisible: (m) => k.setMessages([...m])
  }), [k]), P = Z(() => ({
    stopStream: () => D.stopStream(),
    clearMessages: () => D.replaceVisible([]),
    showMessages: (m) => D.replaceVisible(ct(m))
  }), [D]), I = ar({
    jobId: e,
    documentId: n,
    enabled: i,
    remoteAnswerer: l,
    stream: P
  });
  $.current = I.tree;
  const F = ur({
    jobId: e,
    assistantMode: p,
    selectionContext: s,
    tree: I.tree,
    chat: D,
    getScopeKey: () => I.resolveRequestScopeKey()
  }), h = I.activeConversationId || (g == null ? void 0 : g.conversationId) || `${((S = l == null ? void 0 : l.getConversationId) == null ? void 0 : S.call(l)) || ""}`.trim(), b = Rr({
    conversationId: h,
    enabled: i,
    discovering: F.isRunning,
    signal: g,
    confirmationModeHint: R,
    onDocumentCommitted: o
  }), C = B(!1);
  return V(() => {
    C.current = !1;
  }, [e]), V(() => {
    C.current = !1;
  }, [u]), V(() => {
    C.current && !F.isRunning && (I.sessionCommands.refreshSessions(), I.sessionCommands.adoptRemoteConversationId()), C.current = F.isRunning;
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
function Lr({
  open: t,
  jobId: e,
  documentId: n = "",
  sessionIdentity: r = "",
  onClose: i,
  onJumpCitation: s,
  onDocumentCommitted: o,
  layout: u = "floating",
  side: p = "right",
  selectionContext: c = null,
  onClearSelectionContext: g
}) {
  const f = t && !!e, {
    citationsByMessageId: R,
    progressByMessageId: y,
    contentByMessageId: l,
    streamingAssistantId: _,
    isRunning: $,
    sessions: k,
    activeConversationId: D,
    sessionBusy: P,
    sessionError: I,
    messages: F,
    submitQuestion: h,
    retryAnswer: b,
    cancelAnswer: C,
    newSession: S,
    switchSession: m,
    removeSession: w,
    renameSession: T,
    branchFromAnswer: d,
    agentOperations: N,
    assistantMode: E,
    setAssistantMode: A
  } = Cr({
    jobId: e,
    documentId: n,
    sessionIdentity: r,
    enabled: f,
    selectionContext: c,
    onDocumentCommitted: o
  }), [v, q] = H(""), U = ht(D, $), M = Q(async (J) => {
    q(""), await d(J) && (q(
      "已保存新对话（fork-n-原名）：复制了到此答案的上文，原对话不变。顶部列表可切换。"
    ), window.setTimeout(() => q(""), 6e3));
  }, [d]), L = Q((J) => {
    s(J);
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
      placement: u === "workspace" ? "workspace" : u === "docked" ? "dock-right" : "floating",
      showHeader: u !== "workspace",
      className: `reader-float-ai is-${u}${u === "workspace" ? ` is-pane-${p}` : ""}${P ? " is-session-busy" : ""}`,
      onClose: i,
      children: e ? /* @__PURE__ */ O("div", { className: "reader-float-ai-body", children: [
        /* @__PURE__ */ a(gt, { conversationId: D, running: $ }),
        /* @__PURE__ */ a(
          zn,
          {
            sessions: k,
            activeId: D,
            busy: P,
            errorText: I,
            onSwitch: m,
            onNew: S,
            onDelete: w,
            onRename: T
          }
        ),
        v ? /* @__PURE__ */ a("div", { className: "aui-session-banner", role: "status", children: v }) : null,
        /* @__PURE__ */ a("div", { className: "reader-float-ai-thread-wrap", "aria-busy": P || void 0, children: /* @__PURE__ */ a(yt, { value: /* @__PURE__ */ a(vt, { controller: U, disabled: $ || P }), children: /* @__PURE__ */ a(
          qn,
          {
            connectionConfigured: U.configured,
            connectionBlocked: U.blocked,
            jobId: e,
            messages: F,
            citationsByMessageId: R,
            progressByMessageId: y,
            contentByMessageId: l,
            streamingAssistantId: _,
            isRunning: $,
            onSubmit: h,
            onRetry: b,
            onCancel: C,
            onJumpCitation: L,
            onBranchFromAnswer: M,
            branchBusy: P,
            agentOperations: N,
            assistantMode: E,
            onAssistantModeChange: A,
            selectionContext: c,
            onClearSelectionContext: g
          }
        ) }) })
      ] }) : /* @__PURE__ */ O("div", { className: "reader-float-ai-empty", children: [
        /* @__PURE__ */ a(ge, { size: 22, strokeWidth: 1.75, "aria-hidden": !0 }),
        /* @__PURE__ */ a("p", { children: "当前文档还没有可用于 AI 的解析产物" }),
        /* @__PURE__ */ a("span", { children: "请先完成 OCR 文档解析" })
      ] })
    }
  );
}
export {
  Lr as ReaderAiPanel
};
//# sourceMappingURL=ReaderAiPanel-Dek4KZby.js.map
