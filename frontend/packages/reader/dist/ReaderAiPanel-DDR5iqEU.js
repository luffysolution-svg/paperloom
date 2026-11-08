import { jsx as a, jsxs as P, Fragment as be } from "react/jsx-runtime";
import { useState as U, useRef as B, useEffect as H, useMemo as J, useCallback as G, useId as ut } from "react";
import { Square as pt, ArrowUp as mt, Copy as ft, GitBranch as ht, RefreshCw as gt, Sigma as Ue, Table2 as yt, Image as wt, Type as vt, X as Re, BookOpen as He, Sparkles as ge, FileText as ke, ArrowDown as Ge, Quote as It, ListTree as bt, FlaskConical as Rt, ShieldCheck as Ct, Loader2 as Ae, Bot as Nt, ChevronUp as _t, ChevronDown as Ve, TriangleAlert as Qe, ExternalLink as Mt, Check as Ye, Circle as kt, Plus as St, Pencil as At, Trash2 as $t } from "lucide-react";
import { g as me, h as fe, i as De, j as Tt, d as xt, b as Et } from "./ReaderApp-DaEc-jtQ.js";
import { ThreadPrimitive as ae, ComposerPrimitive as we, MessagePrimitive as Je, ActionBarPrimitive as _e, useAui as Pt, SelectionToolbarPrimitive as Ot, useExternalStoreRuntime as Dt, AssistantRuntimeProvider as Ft } from "@assistant-ui/react";
import { a as qt, b as zt } from "./AiTurnContent-C3qL5AqK.js";
import { r as Xe } from "./reader-regions-DsePY7B_.js";
import { b as ue, n as oe, q as Bt } from "./answer-enhance-D8zK9znw.js";
import { b as Lt, m as jt, s as Kt, l as Ze, c as he, d as $e, a as Wt } from "./answer-quote-DAI2qqGg.js";
import { C as Fe, h as Ut } from "./config-DT8amRQ9.js";
import { Chat as Ht, useChat as Gt } from "@ai-sdk/react";
import { applyTurnEvent as Vt } from "@retainpdf/api";
import { describeToolEvent as Qt } from "@retainpdf/domain/ai";
import { toSessionSummary as Yt } from "@retainpdf/domain/session";
import { l as Jt } from "./ask-answerer-DDdN7iXi.js";
import { getConversation as qe, messagesToBranchItems as Ie, nextForkConversationTitle as Xt } from "@retainpdf/api/conversations";
import { c as Me } from "./ai-chat-ZSCffLDD.js";
import { agentOperationShouldReplace as Zt, agentOperationEventSeq as en, agentOperationShouldPoll as tn, agentOperationErrorStatus as nn, agentOperationErrorMessage as rn, resolveAgentOperationActionKey as sn, clearAgentOperationActionKey as an } from "@retainpdf/api/agent-operation-model";
function et(t) {
  return t.content.filter((e) => e.type === "text").map((e) => e.text).join(`
`).trim();
}
function on({ message: t }) {
  return /* @__PURE__ */ a(Je.Root, { className: "aui-msg aui-msg-user", "data-role": "user", children: /* @__PURE__ */ a("div", { className: "aui-msg-bubble", children: /* @__PURE__ */ a("div", { className: "aui-md-plain", children: et(t) }) }) });
}
function cn({
  jobId: t,
  message: e,
  citations: n,
  progress: s,
  incompleteReason: i,
  streaming: r,
  branchBusy: o,
  onJumpCitation: u,
  onBranchFromAnswer: m
}) {
  var I, w, C, p, l, T, E, _, D, $, R, O, y, g, b, S, v;
  const c = et(e);
  return /* @__PURE__ */ a(Je.Root, { className: "aui-msg aui-msg-assistant", "data-role": "assistant", children: /* @__PURE__ */ P("div", { className: "aui-msg-stack", children: [
    r ? /* @__PURE__ */ a(qt, { running: !0, label: s, elapsedMs: ((C = (w = (I = e.metadata) == null ? void 0 : I.custom) == null ? void 0 : w.metrics) == null ? void 0 : C.elapsed_ms) || 0 }) : null,
    ((p = e.status) == null ? void 0 : p.type) === "incomplete" && e.status.reason === "cancelled" ? /* @__PURE__ */ a("div", { className: "reader-ai-run-status", role: "status", children: "已中断，已生成的内容保留在对话中" }) : null,
    !r && ((l = e.status) == null ? void 0 : l.type) === "incomplete" && e.status.reason === "error" ? /* @__PURE__ */ a("div", { className: "reader-ai-turn-error", role: "alert", children: String(((_ = (E = (T = e.metadata) == null ? void 0 : T.custom) == null ? void 0 : E.metrics) == null ? void 0 : _.error) || "本轮未完成，请重新生成或检查连接设置。") }) : null,
    !r && i === "rounds_exhausted" ? /* @__PURE__ */ a("div", { className: "aui-msg-truncated", role: "status", children: "检索与计算的步数已用尽，这个回答是提前收尾的——追问一句可以让它接着做。" }) : null,
    c || (R = ($ = (D = e.metadata) == null ? void 0 : D.custom) == null ? void 0 : $.parts) != null && R.length ? /* @__PURE__ */ a("div", { className: "aui-msg-bubble", children: /* @__PURE__ */ a("div", { className: "aui-md", children: /* @__PURE__ */ a(
      zt,
      {
        parts: (y = (O = e.metadata) == null ? void 0 : O.custom) == null ? void 0 : y.parts,
        metrics: (b = (g = e.metadata) == null ? void 0 : g.custom) == null ? void 0 : b.metrics,
        content: c,
        streaming: r,
        citations: n,
        jobId: t,
        onJumpCitation: u
      }
    ) }) }) : null,
    /* @__PURE__ */ P(
      _e.Root,
      {
        className: "aui-msg-actions",
        "data-reader-ai-actions": "",
        hideWhenRunning: !0,
        autohide: "not-last",
        children: [
          /* @__PURE__ */ a(_e.Copy, { className: "aui-action-btn", "aria-label": "复制答案", title: "复制答案", children: /* @__PURE__ */ a(ft, { size: 14, strokeWidth: 2.1, "aria-hidden": !0 }) }),
          m ? /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              className: "aui-action-btn aui-action-btn-branch",
              "aria-label": "从这里开新对话",
              title: "从这里开新对话",
              disabled: o,
              onClick: async () => {
                ue(1200, { overlayDelayMs: 0 }), oe(1200), await m(e.id);
              },
              children: /* @__PURE__ */ a(ht, { size: 14, strokeWidth: 2.2, "aria-hidden": !0 })
            }
          ) : null,
          /* @__PURE__ */ a(_e.Reload, { className: "aui-action-btn", "aria-label": "重新生成", title: "重新生成", children: /* @__PURE__ */ a(gt, { size: 14, strokeWidth: 2.2, "aria-hidden": !0 }) })
        ]
      }
    ),
    (v = (S = e.metadata) == null ? void 0 : S.custom) != null && v.source ? /* @__PURE__ */ a("div", { className: "reader-ai-answer-source", children: String(e.metadata.custom.source) }) : null
  ] }) });
}
function tt({
  jobId: t,
  citationsByMessageId: e,
  progressByMessageId: n,
  incompleteByMessageId: s,
  streamingAssistantId: i,
  isRunning: r,
  branchBusy: o,
  onJumpCitation: u,
  onBranchFromAnswer: m
}) {
  return /* @__PURE__ */ a("div", { className: "aui-message-group", "data-slot": "aui_message-group", children: /* @__PURE__ */ a(ae.Messages, { children: ({ message: c }) => {
    var w;
    if (c.role === "user") return /* @__PURE__ */ a(on, { message: c });
    if (c.role !== "assistant") return null;
    const I = ((w = c.status) == null ? void 0 : w.type) === "running" || r && i === c.id;
    return /* @__PURE__ */ a(
      cn,
      {
        jobId: t,
        message: c,
        citations: e[c.id] || [],
        progress: n[c.id] || "",
        incompleteReason: s[c.id] || "",
        streaming: I,
        branchBusy: o,
        onJumpCitation: u,
        onBranchFromAnswer: m
      }
    );
  } }) });
}
function dn({
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
          /* @__PURE__ */ a(He, { size: 12, strokeWidth: 2.2, "aria-hidden": !0 }),
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
function ln({
  selectionContext: t,
  onClear: e
}) {
  if (!t) return null;
  const n = t.selectionType === "text" ? "text" : t.kind, s = t.selectionType === "text" ? t.quote : Xe(t.region, t.pane), i = n === "formula" ? "公式" : n === "table" ? "表格" : n === "figure" ? "图片" : "文字";
  return /* @__PURE__ */ P("div", { className: "aui-selection-context", "data-reader-ai-selection-context": "", children: [
    /* @__PURE__ */ a(n === "formula" ? Ue : n === "table" ? yt : n === "figure" ? wt : vt, { size: 14, strokeWidth: 2.1, "aria-hidden": !0 }),
    /* @__PURE__ */ P("span", { className: "aui-selection-context-meta", children: [
      t.pane === "translated" ? "译文" : "原文",
      " · ",
      t.page,
      " 页 · ",
      i
    ] }),
    /* @__PURE__ */ a("span", { className: "aui-selection-context-text", children: s || "已选择此区域" }),
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
function nt({
  isRunning: t,
  branchBusy: e,
  mode: n,
  onModeChange: s,
  selectionContext: i,
  onClearSelectionContext: r
}) {
  return /* @__PURE__ */ P(we.Root, { className: "aui-composer", "data-reader-ai-composer": "", children: [
    /* @__PURE__ */ P("div", { className: "aui-composer-shell", children: [
      n !== "operations" ? /* @__PURE__ */ a(ln, { selectionContext: i, onClear: r }) : null,
      /* @__PURE__ */ a(
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
      /* @__PURE__ */ P("div", { className: "aui-composer-toolbar", children: [
        /* @__PURE__ */ a("div", { className: "reader-ai-composer-leading", children: /* @__PURE__ */ a(dn, { mode: n, disabled: t || e, onChange: s }) }),
        /* @__PURE__ */ a("div", { className: "aui-composer-actions", children: t ? /* @__PURE__ */ a(we.Cancel, { className: "aui-send aui-send-stop", "aria-label": "停止生成", children: /* @__PURE__ */ a(pt, { size: 12, strokeWidth: 2.6, "aria-hidden": !0 }) }) : /* @__PURE__ */ a(we.Send, { className: "aui-send", "aria-label": "发送", children: /* @__PURE__ */ a(mt, { size: 16, strokeWidth: 2.5, "aria-hidden": !0 }) }) })
      ] })
    ] }),
    /* @__PURE__ */ a("p", { className: "aui-hint", children: "AI 可能会出错，请核对原文与引用" })
  ] });
}
function rt() {
  return /* @__PURE__ */ P("div", { className: "aui-composer aui-composer-locked", role: "alert", children: [
    /* @__PURE__ */ a("p", { className: "aui-llm-lock-msg", children: "配置模型 API 后即可提问" }),
    /* @__PURE__ */ a("p", { className: "aui-hint", children: "请在设置中填写模型 API Key、地址和模型。" })
  ] });
}
const un = [
  { prompt: "把第 1 页旋转 90 度。", label: "旋转页面", icon: ke },
  { prompt: "删除最后一页。", label: "删除页面", icon: ke }
];
function pn({
  jobId: t,
  empty: e,
  citationsByMessageId: n,
  progressByMessageId: s,
  incompleteByMessageId: i,
  streamingAssistantId: r,
  isRunning: o,
  missingLlmKey: u,
  branchBusy: m,
  agentRequestBlocked: c = !1,
  agentOperationPanel: I,
  onModeChange: w,
  onJumpCitation: C,
  onBranchFromAnswer: p
}) {
  const l = m || c;
  return /* @__PURE__ */ P(be, { children: [
    e ? /* @__PURE__ */ P("div", { className: "aui-empty", children: [
      /* @__PURE__ */ a("div", { className: "aui-empty-mascot", "aria-hidden": !0, children: /* @__PURE__ */ a("span", { className: "aui-empty-mascot-face", children: /* @__PURE__ */ a(ge, { size: 21, strokeWidth: 1.9 }) }) }),
      /* @__PURE__ */ a("h2", { className: "aui-empty-title", children: "想怎样处理 PDF？" }),
      /* @__PURE__ */ a("p", { className: "aui-empty-sub", children: "创建候选版本后由你预览和确认" }),
      /* @__PURE__ */ a("div", { className: "aui-suggestions", role: "group", "aria-label": "推荐问题", children: un.map((T) => {
        const E = T.icon;
        return /* @__PURE__ */ P(
          ae.Suggestion,
          {
            prompt: T.prompt,
            send: !0,
            type: "button",
            className: "aui-suggestion",
            disabled: l || u,
            children: [
              /* @__PURE__ */ a(E, { size: 14, strokeWidth: 2, "aria-hidden": !0, className: "aui-suggestion-icon" }),
              /* @__PURE__ */ a("span", { className: "aui-suggestion-label", children: T.label })
            ]
          },
          T.prompt
        );
      }) })
    ] }) : null,
    /* @__PURE__ */ a(
      tt,
      {
        jobId: t,
        citationsByMessageId: n,
        progressByMessageId: s,
        incompleteByMessageId: i,
        streamingAssistantId: r,
        isRunning: o,
        branchBusy: m,
        onJumpCitation: C,
        onBranchFromAnswer: p
      }
    ),
    I,
    /* @__PURE__ */ P(ae.ViewportFooter, { className: "aui-thread-viewport-footer", children: [
      !e && !m ? /* @__PURE__ */ a(
        ae.ScrollToBottom,
        {
          className: "aui-scroll-bottom-btn aui-scroll-bottom",
          "aria-label": "滚到最新",
          children: /* @__PURE__ */ a(Ge, { size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
        }
      ) : null,
      u ? /* @__PURE__ */ a(rt, {}) : /* @__PURE__ */ a(
        nt,
        {
          isRunning: o,
          branchBusy: l,
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
  const t = Pt(), e = (n) => {
    var o, u, m;
    n.preventDefault();
    const s = `${((o = globalThis.getSelection) == null ? void 0 : o.call(globalThis)) || ""}`.trim();
    if (!s) return;
    const i = Lt(s);
    if (!i) return;
    const r = t.thread.composer();
    r.setText(jt(r.getState().text || "", i));
    try {
      (m = (u = globalThis.getSelection) == null ? void 0 : u.call(globalThis)) == null || m.removeAllRanges();
    } catch {
    }
  };
  return /* @__PURE__ */ a(Ot.Root, { className: "reader-ai-selection-toolbar", children: /* @__PURE__ */ P(
    "button",
    {
      type: "button",
      className: "reader-ai-selection-quote",
      onPointerDown: e,
      title: "引用这段话继续提问",
      children: [
        /* @__PURE__ */ a(It, { size: 12, strokeWidth: 2.4, "aria-hidden": !0 }),
        /* @__PURE__ */ a("span", { children: "引用" })
      ]
    }
  ) });
}
const fn = [
  { prompt: "用几句话总结这篇文献的核心内容。", label: "总结本文", icon: He },
  { prompt: "这篇文献的主要结论是什么？", label: "提炼主要结论", icon: bt },
  { prompt: "作者用了什么方法或模型？", label: "梳理方法与模型", icon: Rt },
  { prompt: "解释文中的关键公式。", label: "解释关键公式", icon: Ue }
];
function hn({
  jobId: t,
  empty: e,
  citationsByMessageId: n,
  progressByMessageId: s,
  incompleteByMessageId: i,
  streamingAssistantId: r,
  isRunning: o,
  missingLlmKey: u,
  branchBusy: m,
  composerDisabled: c = !1,
  onModeChange: I,
  onJumpCitation: w,
  onBranchFromAnswer: C,
  selectionContext: p = null,
  onClearSelectionContext: l,
  footerExtra: T = null
}) {
  return /* @__PURE__ */ P(be, { children: [
    e ? /* @__PURE__ */ P("div", { className: "aui-empty", children: [
      /* @__PURE__ */ a("div", { className: "aui-empty-mascot", "aria-hidden": !0, children: /* @__PURE__ */ a("span", { className: "aui-empty-mascot-face", children: /* @__PURE__ */ a(ge, { size: 21, strokeWidth: 1.9 }) }) }),
      /* @__PURE__ */ a("h2", { className: "aui-empty-title", children: "一起读懂这篇文档" }),
      /* @__PURE__ */ a("p", { className: "aui-empty-sub", children: "总结、解释、检索与计算，不修改 PDF" }),
      /* @__PURE__ */ a("div", { className: "aui-suggestions", role: "group", "aria-label": "推荐问题", children: fn.map((E) => {
        const _ = E.icon;
        return /* @__PURE__ */ P(
          ae.Suggestion,
          {
            prompt: E.prompt,
            send: !0,
            type: "button",
            className: "aui-suggestion",
            disabled: m || c || u,
            children: [
              /* @__PURE__ */ a(_, { size: 14, strokeWidth: 2, "aria-hidden": !0, className: "aui-suggestion-icon" }),
              /* @__PURE__ */ a("span", { className: "aui-suggestion-label", children: E.label })
            ]
          },
          E.prompt
        );
      }) })
    ] }) : null,
    /* @__PURE__ */ a(mn, {}),
    /* @__PURE__ */ a(
      tt,
      {
        jobId: t,
        citationsByMessageId: n,
        progressByMessageId: s,
        incompleteByMessageId: i,
        streamingAssistantId: r,
        isRunning: o,
        branchBusy: m,
        onJumpCitation: w,
        onBranchFromAnswer: C
      }
    ),
    T,
    /* @__PURE__ */ P(ae.ViewportFooter, { className: "aui-thread-viewport-footer", children: [
      !e && !m ? /* @__PURE__ */ a(
        ae.ScrollToBottom,
        {
          className: "aui-scroll-bottom-btn aui-scroll-bottom",
          "aria-label": "滚到最新",
          children: /* @__PURE__ */ a(Ge, { size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
        }
      ) : null,
      u ? /* @__PURE__ */ a(rt, {}) : /* @__PURE__ */ a(
        nt,
        {
          isRunning: o,
          branchBusy: m || c,
          mode: "reading",
          onModeChange: I,
          selectionContext: p,
          onClearSelectionContext: l
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
  incompleteByMessageId: i,
  streamingAssistantId: r,
  isRunning: o,
  missingLlmKey: u,
  branchBusy: m,
  agentRequestBlocked: c = !1,
  agentOperationPanel: I,
  assistantMode: w = "reading",
  onAssistantModeChange: C,
  onJumpCitation: p,
  onBranchFromAnswer: l,
  selectionContext: T = null,
  onClearSelectionContext: E
}) {
  const _ = e.length === 0, D = w === "operations";
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
          children: /* @__PURE__ */ a("div", { className: `aui-thread-inner${_ ? " is-empty" : ""}`, children: D ? /* @__PURE__ */ a(
            pn,
            {
              jobId: t,
              empty: _,
              citationsByMessageId: n,
              progressByMessageId: s,
              incompleteByMessageId: i,
              streamingAssistantId: r,
              isRunning: o,
              missingLlmKey: u,
              branchBusy: m,
              agentRequestBlocked: c,
              agentOperationPanel: I,
              onModeChange: C,
              onJumpCitation: p,
              onBranchFromAnswer: l
            }
          ) : /* @__PURE__ */ a(
            hn,
            {
              jobId: t,
              empty: _,
              citationsByMessageId: n,
              progressByMessageId: s,
              incompleteByMessageId: i,
              streamingAssistantId: r,
              isRunning: o,
              missingLlmKey: u,
              branchBusy: m,
              composerDisabled: c,
              onModeChange: C,
              onJumpCitation: p,
              onBranchFromAnswer: l,
              selectionContext: T,
              onClearSelectionContext: E
            }
          ) })
        }
      )
    }
  );
}
const st = "retainpdf.reader-agent-operation.dismissed.v1", yn = /* @__PURE__ */ new Set(["failed", "cancelled"]);
function ze(t) {
  return [
    `${t.operation_id || ""}`.trim(),
    Number(t.current_attempt) || 0,
    `${t.status || ""}`
  ].join(":");
}
function wn() {
  var t;
  try {
    const e = JSON.parse(((t = globalThis.localStorage) == null ? void 0 : t.getItem(st)) || "[]");
    return new Set(Array.isArray(e) ? e.filter((n) => typeof n == "string") : []);
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function vn(t) {
  var e;
  try {
    (e = globalThis.localStorage) == null || e.setItem(
      st,
      JSON.stringify(Array.from(t).slice(-100))
    );
  } catch {
  }
}
function at(t, e) {
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
  return t === "failed" || t === "ambiguous" ? Qe : t === "cancelled" ? Re : t === "committed" || t === "result_ready" ? Ye : ["queued", "running", "validating"].includes(t) ? Ae : kt;
}
function Rn({ events: t, mode: e }) {
  return /* @__PURE__ */ a("ol", { className: "reader-agent-operation-timeline", "aria-label": "PDF 操作步骤", children: t.map((n) => {
    const s = bn(n.status), i = ["queued", "running", "validating"].includes(n.status);
    return /* @__PURE__ */ P("li", { children: [
      /* @__PURE__ */ a(s, { className: i ? "is-spinning" : "", size: 12, "aria-hidden": !0 }),
      /* @__PURE__ */ a("span", { children: n.summary || n.event || at(n.status, e) }),
      /* @__PURE__ */ a("time", { children: n.ts ? new Date(n.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "" })
    ] }, `${n.attempt}:${n.seq}`);
  }) });
}
function Cn({
  operation: t,
  loadCandidate: e
}) {
  const [n, s] = U(!1), [i, r] = U(""), [o, u] = U(""), m = B("");
  return H(() => {
    let c = !1;
    return u(""), e(t).then((I) => {
      if (c) return;
      const w = URL.createObjectURL(I);
      m.current && URL.revokeObjectURL(m.current), m.current = w, r(w);
    }).catch(() => {
      c || u("候选 PDF 加载失败，请重试。");
    }), () => {
      c = !0;
    };
  }, [e, t.operation_id, t.current_attempt]), H(() => () => {
    m.current && URL.revokeObjectURL(m.current);
  }, []), /* @__PURE__ */ P(be, { children: [
    /* @__PURE__ */ P("div", { className: "reader-agent-operation-candidate", children: [
      /* @__PURE__ */ P("div", { children: [
        /* @__PURE__ */ a(ke, { size: 13, "aria-hidden": !0 }),
        /* @__PURE__ */ a("span", { children: "候选 PDF" })
      ] }),
      /* @__PURE__ */ a("button", { type: "button", disabled: !i, onClick: () => s((c) => !c), children: i ? n ? "收起" : "预览" : "加载中…" }),
      /* @__PURE__ */ a(
        "button",
        {
          type: "button",
          disabled: !i,
          "aria-label": "新窗口打开候选 PDF",
          onClick: () => window.open(i, "_blank", "noopener,noreferrer"),
          children: /* @__PURE__ */ a(Mt, { size: 12, "aria-hidden": !0 })
        }
      )
    ] }),
    n ? /* @__PURE__ */ a("iframe", { className: "reader-agent-operation-preview", src: i, title: "候选 PDF 预览" }) : null,
    o ? /* @__PURE__ */ a("p", { className: "reader-agent-operation-error", role: "alert", children: o }) : null
  ] });
}
function Nn({
  entry: t,
  mode: e,
  loadCandidate: n,
  onAction: s,
  onDismiss: i
}) {
  var E;
  const { operation: r, pendingAction: o, error: u } = t, [m, c] = U(!1), [I, w] = U(!1), C = r.events || [], p = In(r.status), l = !!((r.status === "result_ready" || r.status === "committed") && r.candidate_available), T = yn.has(r.status);
  return /* @__PURE__ */ P("article", { className: `reader-agent-operation-card is-${r.status}`, "data-operation-id": r.operation_id, children: [
    /* @__PURE__ */ P("header", { children: [
      /* @__PURE__ */ a("span", { className: "reader-agent-operation-icon", "aria-hidden": !0, children: /* @__PURE__ */ a(Nt, { size: 15 }) }),
      /* @__PURE__ */ P("div", { className: "reader-agent-operation-title", children: [
        /* @__PURE__ */ a("span", { children: "PDF 操作" }),
        /* @__PURE__ */ a("strong", { children: r.intent_summary || "处理当前 PDF" })
      ] }),
      /* @__PURE__ */ P("div", { className: "reader-agent-operation-head-actions", children: [
        /* @__PURE__ */ a("span", { className: "reader-agent-operation-status", children: at(r.status, e) }),
        T ? /* @__PURE__ */ a(
          "button",
          {
            type: "button",
            className: "reader-agent-operation-dismiss",
            "aria-label": r.status === "failed" ? "隐藏这条失败提示" : "隐藏这条已取消提示",
            title: "隐藏",
            onClick: () => i(r),
            children: /* @__PURE__ */ a(Re, { size: 13, "aria-hidden": !0 })
          }
        ) : null
      ] })
    ] }),
    (E = r.affected_pages) != null && E.length ? /* @__PURE__ */ P("p", { className: "reader-agent-operation-scope", children: [
      "影响页码：",
      r.affected_pages.join("、")
    ] }) : null,
    C.length ? /* @__PURE__ */ P("div", { className: "reader-agent-operation-details", children: [
      /* @__PURE__ */ P("button", { type: "button", onClick: () => c((_) => !_), children: [
        m ? /* @__PURE__ */ a(_t, { size: 12, "aria-hidden": !0 }) : /* @__PURE__ */ a(Ve, { size: 12, "aria-hidden": !0 }),
        m ? "收起步骤" : `执行步骤 ${C.length}`
      ] }),
      m ? /* @__PURE__ */ a(Rn, { events: C, mode: e }) : null
    ] }) : null,
    l ? /* @__PURE__ */ a(Cn, { operation: r, loadCandidate: n }) : null,
    u ? /* @__PURE__ */ a("p", { className: "reader-agent-operation-error", role: "alert", children: u }) : null,
    I ? /* @__PURE__ */ P("div", { className: "reader-agent-operation-risk", role: "alertdialog", "aria-label": "确认重复执行风险", children: [
      /* @__PURE__ */ a(Qe, { size: 14, "aria-hidden": !0 }),
      /* @__PURE__ */ a("p", { children: "上一次执行结果不确定，重试可能重复操作。确认接受风险后再继续。" }),
      /* @__PURE__ */ P("div", { children: [
        /* @__PURE__ */ a("button", { type: "button", onClick: () => w(!1), disabled: !!o, children: "返回" }),
        /* @__PURE__ */ a(
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
    ] }) : p.length ? /* @__PURE__ */ a("div", { className: "reader-agent-operation-actions", children: p.map((_) => /* @__PURE__ */ a(
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
function _n({
  entries: t,
  confirmationMode: e,
  runtimeRestarting: n,
  loadCandidate: s,
  onAction: i
}) {
  const [r, o] = U(wn), u = t.filter((c) => !r.has(ze(c.operation)));
  function m(c) {
    const I = ze(c);
    o((w) => {
      const C = new Set(w);
      return C.add(I), vn(C), C;
    });
  }
  return /* @__PURE__ */ P("section", { className: `reader-agent-operations${u.length ? " has-operations" : ""}`, "aria-label": "AI PDF 操作", children: [
    /* @__PURE__ */ P("div", { className: `reader-agent-mode${e === "green_light" ? " is-green" : ""}`, children: [
      /* @__PURE__ */ a(Ct, { size: 13, "aria-hidden": !0 }),
      /* @__PURE__ */ a("span", { children: e === "green_light" ? "绿灯模式 · 自动执行并应用" : "需要确认 · 操作前等待授权" })
    ] }),
    n ? /* @__PURE__ */ P("div", { className: "reader-agent-restarting", role: "status", children: [
      /* @__PURE__ */ a(Ae, { className: "is-spinning", size: 13, "aria-hidden": !0 }),
      "正在重启 Agent，新请求暂不可用"
    ] }) : null,
    u.map((c) => /* @__PURE__ */ a(
      Nn,
      {
        entry: c,
        mode: e,
        loadCandidate: s,
        onAction: i,
        onDismiss: m
      },
      c.operation.operation_id
    ))
  ] });
}
const Mn = (t) => t, kn = Object.freeze([]), Sn = Object.freeze({}), Be = Object.freeze({}), An = Object.freeze({
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
  var s, i, r, o;
  return ((s = t.status) == null ? void 0 : s.type) === "running" || n && e === t.id ? { type: "running" } : ((i = t.status) == null ? void 0 : i.type) === "incomplete" || ((r = t.status) == null ? void 0 : r.type) === "error" ? {
    type: "incomplete",
    reason: ((o = t.status) == null ? void 0 : o.reason) === "cancelled" ? "cancelled" : "error"
  } : { type: "complete", reason: "stop" };
}
function xn({
  jobId: t = "",
  messages: e = kn,
  citationsByMessageId: n = Sn,
  progressByMessageId: s = Be,
  contentByMessageId: i = Be,
  streamingAssistantId: r = "",
  isRunning: o = !1,
  onSubmit: u,
  onRetry: m,
  onCancel: c,
  onJumpCitation: I,
  onBranchFromAnswer: w,
  branchBusy: C = !1,
  agentOperations: p = An,
  assistantMode: l = "reading",
  onAssistantModeChange: T,
  selectionContext: E = null,
  onClearSelectionContext: _
}) {
  const [, D] = U(0);
  H(() => {
    const f = () => D((M) => M + 1);
    return window.addEventListener("focus", f), window.addEventListener("storage", f), document.addEventListener(Fe, f), () => {
      window.removeEventListener("focus", f), window.removeEventListener("storage", f), document.removeEventListener(Fe, f);
    };
  }, []);
  const $ = !Ut() && !p.runtimeCredentialConfigured, R = J(() => e.map((f) => ({
    id: f.id,
    role: f.role,
    content: i[f.id] || f.content || "",
    metadata: { custom: { source: f.source, parts: f.parts, metrics: f.metrics } },
    ...f.role === "assistant" ? { status: Tn(f, r, o) } : {}
  })), [i, o, e, r]), O = J(() => {
    var M, h;
    const f = {};
    for (const N of e) {
      if (N.role !== "assistant") continue;
      const A = `${((M = N.status) == null ? void 0 : M.reason) || ""}`.trim();
      ((h = N.status) == null ? void 0 : h.type) === "incomplete" && A && A !== "cancelled" && (f[N.id] = A);
    }
    return f;
  }, [e]), y = G(async (f) => {
    const M = f ? Math.max(0, e.findIndex((N) => N.id === f) + 1) : 0, h = e.slice(M).find((N) => N.role === "assistant");
    h && await m(h.id);
  }, [e, m]), g = G(async (f) => {
    const M = $n(f);
    !M || o || C || p.runtimeRestarting || $ || await u(M);
  }, [p.runtimeRestarting, C, o, $, u]), b = G(async () => {
    await c();
  }, [c]), S = J(() => ({
    messages: R,
    isRunning: o,
    isDisabled: C || p.runtimeRestarting || $,
    convertMessage: Mn,
    onNew: g,
    onReload: y,
    onCancel: b
  }), [
    p.runtimeRestarting,
    C,
    b,
    g,
    o,
    $,
    y,
    R
  ]), v = Dt(S);
  return /* @__PURE__ */ a(Ft, { runtime: v, children: /* @__PURE__ */ a(
    gn,
    {
      jobId: t,
      messages: e,
      citationsByMessageId: n,
      progressByMessageId: s,
      incompleteByMessageId: O,
      streamingAssistantId: r,
      isRunning: o,
      missingLlmKey: $,
      branchBusy: C,
      agentRequestBlocked: p.runtimeRestarting,
      assistantMode: l,
      onAssistantModeChange: T,
      selectionContext: E,
      onClearSelectionContext: _,
      agentOperationPanel: p.entries.length > 0 || p.runtimeRestarting ? /* @__PURE__ */ a(
        _n,
        {
          entries: p.entries,
          confirmationMode: p.confirmationMode,
          runtimeRestarting: p.runtimeRestarting,
          loadCandidate: p.loadCandidate,
          onAction: p.perform
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
  errorText: i = "",
  onSwitch: r,
  onNew: o,
  onDelete: u,
  onRename: m
}) {
  const c = t.length > 0, I = n || s, [w, C] = U(!1), [p, l] = U(""), [T, E] = U(""), _ = B(null), D = ut();
  function $(h) {
    const N = `${h || ""}`.match(/^fork-(\d+)-(.*)$/i);
    if (!N) return h;
    const A = N[2].trim();
    return A ? `${A} · 分支${N[1]}` : `分支${N[1]}`;
  }
  const R = B(!1), O = B(null), y = t.find((h) => h.id === e) || null, g = y ? y.messageCount ? $(y.title) : `${$(y.title)}（空）` : c ? "选择以往对话" : "新对话";
  H(() => {
    if (!w) {
      l("");
      return;
    }
    const h = (x) => {
      if (R.current) return;
      const d = _.current;
      d && (x.target instanceof Node && d.contains(x.target) || (C(!1), l("")));
    }, N = (x) => {
      x.key === "Escape" && (C(!1), l(""));
    }, A = window.setTimeout(() => {
      document.addEventListener("pointerdown", h, !0);
    }, 0);
    return document.addEventListener("keydown", N), () => {
      window.clearTimeout(A), document.removeEventListener("pointerdown", h, !0), document.removeEventListener("keydown", N);
    };
  }, [w]), H(() => {
    if (!p) return;
    const h = O.current;
    h && (h.focus(), h.select());
  }, [p]);
  const b = (h) => {
    const N = `${h || ""}`.trim();
    !N || I || R.current || p || (R.current = !0, ve(1e3, 0), requestAnimationFrame(() => {
      C(!1), window.setTimeout(() => {
        (async () => {
          try {
            await r(N);
          } finally {
            ve(400, 0), R.current = !1;
          }
        })();
      }, 40);
    }));
  }, S = (h) => {
    I || (l(h.id), E(h.title || ""));
  }, v = () => {
    const h = p, N = T;
    l(""), h && m(h, N);
  }, f = () => {
    l(""), E("");
  }, M = (h) => {
    var x;
    if (I || R.current) return;
    const N = h.title || "未命名对话";
    (x = globalThis.confirm) != null && x.call(globalThis, `确定删除对话「${N}」？此操作不可恢复。`) && (R.current = !0, ve(800, 0), (async () => {
      try {
        await u(h.id);
      } finally {
        R.current = !1;
      }
    })());
  };
  return /* @__PURE__ */ P(
    "div",
    {
      className: "aui-session-bar",
      "data-reader-ai-sessions": "",
      ref: _,
      onPointerDown: (h) => {
        h.stopPropagation();
      },
      onClick: (h) => {
        h.stopPropagation();
      },
      children: [
        /* @__PURE__ */ P("div", { className: "aui-session-row", children: [
          /* @__PURE__ */ P(
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
                I || !c || C((h) => !h);
              },
              children: [
                /* @__PURE__ */ a("span", { className: "aui-session-trigger-label", children: g }),
                /* @__PURE__ */ a(Ve, { size: 14, strokeWidth: 2.4, "aria-hidden": !0 })
              ]
            }
          ),
          /* @__PURE__ */ P(
            "button",
            {
              type: "button",
              className: "aui-session-btn",
              disabled: I,
              title: "新对话窗口",
              "aria-label": "新对话",
              onClick: () => {
                I || R.current || (R.current = !0, ve(800), C(!1), l(""), window.setTimeout(() => {
                  (async () => {
                    try {
                      await o();
                    } finally {
                      R.current = !1;
                    }
                  })();
                }, 40));
              },
              children: [
                n ? /* @__PURE__ */ a(Ae, { className: "aui-spin", size: 14, strokeWidth: 2.4, "aria-hidden": !0 }) : /* @__PURE__ */ a(St, { size: 14, strokeWidth: 2.4, "aria-hidden": !0 }),
                /* @__PURE__ */ a("span", { children: "新对话" })
              ]
            }
          )
        ] }),
        w && c ? /* @__PURE__ */ a(
          "ul",
          {
            id: D,
            className: "aui-session-list",
            role: "listbox",
            "aria-label": "以往对话",
            children: t.map((h) => {
              const N = h.messageCount ? $(h.title) : `${$(h.title)}（空）`, A = h.id === e, x = p === h.id;
              return /* @__PURE__ */ a("li", { className: "aui-session-row-item", role: "presentation", children: x ? /* @__PURE__ */ P("div", { className: "aui-session-edit", children: [
                /* @__PURE__ */ a(
                  "input",
                  {
                    ref: O,
                    className: "aui-session-edit-input",
                    value: T,
                    maxLength: 80,
                    "aria-label": "对话标题",
                    disabled: I,
                    onChange: (d) => E(d.target.value),
                    onKeyDown: (d) => {
                      d.key === "Enter" ? (d.preventDefault(), v()) : d.key === "Escape" && (d.preventDefault(), f());
                    },
                    onClick: (d) => d.stopPropagation()
                  }
                ),
                /* @__PURE__ */ a(
                  "button",
                  {
                    type: "button",
                    className: "aui-session-icon-btn",
                    "aria-label": "保存标题",
                    title: "保存",
                    disabled: I || !T.trim(),
                    onClick: (d) => {
                      d.stopPropagation(), v();
                    },
                    children: /* @__PURE__ */ a(Ye, { size: 13, strokeWidth: 2.5, "aria-hidden": !0 })
                  }
                ),
                /* @__PURE__ */ a(
                  "button",
                  {
                    type: "button",
                    className: "aui-session-icon-btn",
                    "aria-label": "取消重命名",
                    title: "取消",
                    disabled: I,
                    onClick: (d) => {
                      d.stopPropagation(), f();
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
                      b(h.id);
                    },
                    children: [
                      /* @__PURE__ */ a("span", { className: "aui-session-item-title", children: N }),
                      A ? /* @__PURE__ */ a("span", { className: "aui-session-item-badge", children: "当前" }) : null
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
                    disabled: I,
                    onClick: (d) => {
                      d.preventDefault(), d.stopPropagation(), S(h);
                    },
                    children: /* @__PURE__ */ a(At, { size: 13, strokeWidth: 2.4, "aria-hidden": !0 })
                  }
                ),
                /* @__PURE__ */ a(
                  "button",
                  {
                    type: "button",
                    className: "aui-session-icon-btn is-danger",
                    "aria-label": `删除 ${N}`,
                    title: "删除",
                    disabled: I,
                    onClick: (d) => {
                      d.preventDefault(), d.stopPropagation(), M(h);
                    },
                    children: /* @__PURE__ */ a($t, { size: 13, strokeWidth: 2.4, "aria-hidden": !0 })
                  }
                )
              ] }) }, h.id);
            })
          }
        ) : null,
        i ? /* @__PURE__ */ a("div", { className: "aui-session-error", role: "alert", children: i }) : null
      ]
    }
  );
}
function it(t) {
  return ((t == null ? void 0 : t.parts) || []).filter((e) => e.type === "text").map((e) => e.text).join("").trim();
}
function Pn(t, e) {
  const n = `${e.question || ""}`.trim();
  if (n) return n;
  for (let s = t.length - 1; s >= 0; s -= 1) {
    const i = t[s];
    if (i.role !== "user") continue;
    const r = it(i);
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
    trigger: i
  }) {
    var E, _, D, $;
    const r = n || {}, o = Pn(s, r);
    if (!o) throw new Error("请输入问题。");
    const u = r.assistantMode || ((_ = (E = this.options).getAssistantMode) == null ? void 0 : _.call(E)) || "reading", m = r.scope || "document", c = r.context ? { ...r.context } : null, I = `${r.assistantMessageId || ""}`.trim() || `a-${Date.now().toString(36)}`, w = `${I}-text`, C = this.options.getRemoteAnswerer(), p = (($ = (D = this.options).getLocalAnswerer) == null ? void 0 : $.call(D)) || null;
    if (!C && !p)
      throw new Error("问答暂不可用：请确认已打开任务阅读器。");
    let l = !1;
    const T = /* @__PURE__ */ new Set();
    return new ReadableStream({
      cancel: () => {
        l = !0;
      },
      start: (R) => {
        let O = "", y = {
          citations: [],
          progress: i === "regenerate-message" ? "正在重新生成…" : "正在检索文档…",
          status: "running"
        };
        const g = (S) => {
          if (!l)
            try {
              R.enqueue(S);
            } catch {
              l = !0;
            }
        }, b = (S) => {
          y = { ...y, ...S }, g({ type: "message-metadata", messageMetadata: y });
        };
        g({ type: "start", messageId: I, messageMetadata: y }), g({ type: "start-step" }), g({ type: "text-start", id: w }), (async () => {
          var S, v, f, M, h, N;
          try {
            if (await ((S = C == null ? void 0 : C.ensureLoaded) == null ? void 0 : S.call(C, this.options.jobId)), e != null && e.aborted) throw new Error("aborted");
            let A = C || p, x = !1, d;
            try {
              let z = [];
              d = await A.answer({
                onTurnEvent: (k) => {
                  z = Vt(z, k), z.length && b({ parts: z }), k.type === "citations" && b({ citations: k.citations }), k.metrics && b({ metrics: k.metrics }), k.type === "done" && b({ metrics: k.metrics, parts: k.parts || z });
                },
                question: o,
                assistantMode: u,
                scope: m,
                context: c,
                parentId: `${r.parentId || ""}`.trim(),
                regenerate: r.regenerate ?? i === "regenerate-message",
                userMessageId: `${r.userMessageId || ""}`.trim(),
                assistantMessageId: I,
                onAgentSessionEvent: (k) => {
                  var te, ne, re;
                  const j = (te = k == null ? void 0 : k.capabilities) == null ? void 0 : te.document_operation_confirmation_mode;
                  (j === "explicit" || j === "green_light") && ((re = (ne = this.options).onConfirmationMode) == null || re.call(ne, j));
                },
                onAgentOperationEvent: (k) => {
                  var te, ne;
                  const j = `${(k == null ? void 0 : k.operation_id) || ""}`.trim();
                  j && ((ne = (te = this.options).onAgentOperationSignal) == null || ne.call(te, {
                    operationId: j,
                    conversationId: `${(k == null ? void 0 : k.conversation_id) || ""}`.trim() || void 0
                  }));
                },
                onAgentConfirmationRequiredEvent: (k) => {
                  var Z, K;
                  const j = `${(k == null ? void 0 : k.operation_id) || ""}`.trim();
                  if (!j) return;
                  const te = `${(k == null ? void 0 : k.action) || ""}`, ne = `${(k == null ? void 0 : k.current_attempt) ?? ""}`, re = `${j}:${ne}:${te}`;
                  T.has(re) || (T.add(re), (K = (Z = this.options).onAgentOperationSignal) == null || K.call(Z, { operationId: j }));
                },
                onToolEvent: (k) => {
                  if (e != null && e.aborted) return;
                  const j = Qt(k);
                  j && b({ progress: j });
                },
                onProgressEvent: (k) => {
                  if (e != null && e.aborted) return;
                  const j = `${(k == null ? void 0 : k.message) || ""}`.trim();
                  j && b({ progress: j });
                },
                onAnswerDelta: (k, j) => {
                  !j || e != null && e.aborted || (O += j, y.progress && b({ progress: "" }), g({ type: "text-delta", id: w, delta: j }));
                },
                onCompress: (k) => {
                  if (O || e != null && e.aborted) return;
                  const j = Number(k == null ? void 0 : k.dropped_turns) || 0;
                  j && b({ progress: `已压缩 ${j} 轮早期对话` });
                },
                signal: e
              });
            } catch (z) {
              if (e != null && e.aborted || u === "operations" || !C || !p || !On(z)) throw z;
              if (x = !0, b({ progress: "在线服务暂不可用，改用本地检索…" }), await ((v = p.ensureLoaded) == null ? void 0 : v.call(p, this.options.jobId)), e != null && e.aborted) throw new Error("aborted");
              A = p, d = await A.answer({
                question: o,
                assistantMode: u,
                scope: m,
                context: c,
                signal: e
              });
            }
            if (e != null && e.aborted) {
              b({ progress: "", status: "cancelled", statusText: "已取消" }), g({ type: "abort", reason: "cancelled" });
              return;
            }
            const q = d == null ? void 0 : d.confirmationMode;
            (q === "explicit" || q === "green_light") && ((M = (f = this.options).onConfirmationMode) == null || M.call(f, q));
            const V = `${(d == null ? void 0 : d.conversationId) || ""}`.trim() || void 0, F = /* @__PURE__ */ new Set();
            for (const z of (d == null ? void 0 : d.operationRefs) || []) {
              const k = typeof z == "string" ? z : `${(z == null ? void 0 : z.operation_id) || ""}`;
              k.trim() && F.add(k.trim());
            }
            for (const z of (d == null ? void 0 : d.confirmationRequests) || []) {
              const k = `${(z == null ? void 0 : z.operation_id) || ""}`.trim();
              k && F.add(k);
            }
            for (const z of F)
              (N = (h = this.options).onAgentOperationSignal) == null || N.call(h, {
                operationId: z,
                conversationId: V,
                confirmationMode: q || void 0
              });
            const L = Bt(d == null ? void 0 : d.citations);
            let Q = Kt(
              `${(d == null ? void 0 : d.answer) || O || ""}`.trim() || "没有找到可用回答。",
              L
            );
            if (x && (Q += `

_在线服务暂不可用，以上来自本地文档检索。_`), (d == null ? void 0 : d.persisted) === !1 && (Q += `

_⚠️ 本轮回答未能写入历史记录（存储暂时不可用），刷新后可能丢失。_`), !O)
              g({ type: "text-delta", id: w, delta: Q });
            else if (Q.startsWith(O)) {
              const z = Q.slice(O.length);
              z && g({ type: "text-delta", id: w, delta: z });
            }
            g({ type: "text-end", id: w }), b({
              citations: L,
              persisted: (d == null ? void 0 : d.persisted) !== !1,
              progress: "",
              status: "complete",
              incompleteReason: `${(d == null ? void 0 : d.incompleteReason) || ""}`.trim(),
              source: `${(d == null ? void 0 : d.source) || ""}`.trim()
            }), g({ type: "finish-step" }), g({ type: "finish", finishReason: "stop", messageMetadata: y });
          } catch (A) {
            if (e != null && e.aborted)
              b({ progress: "", status: "cancelled", statusText: "已取消" }), g({ type: "abort", reason: "cancelled" });
            else {
              const x = A instanceof Error && A.message ? A.message : "生成回答失败，请重试。";
              b({ progress: "", status: "error", statusText: x }), g({ type: "error", errorText: x });
            }
          } finally {
            if (!l) {
              l = !0;
              try {
                R.close();
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
  return it(t);
}
function ot(t) {
  return t.map((e) => {
    var n, s;
    return {
      id: e.id,
      role: e.role,
      metadata: e.role === "assistant" ? {
        citations: e.citations || [],
        parts: e.parts,
        metrics: e.metrics,
        ...e.source ? { source: e.source } : {},
        progress: e.progress || "",
        status: ((n = e.status) == null ? void 0 : n.type) === "running" ? "running" : ((s = e.status) == null ? void 0 : s.type) === "incomplete" ? e.status.reason === "cancelled" ? "cancelled" : "error" : "complete"
      } : void 0,
      parts: [{ type: "text", text: e.content || "" }]
    };
  });
}
function qn(t) {
  const e = t.metadata || {}, n = e.status === "running", s = e.status === "cancelled" || e.status === "error", i = Fn(t), r = i.trim() || (s ? `${e.statusText || ""}`.trim() : "");
  return {
    id: t.id,
    role: t.role,
    content: t.role === "assistant" ? r : i,
    ...t.role === "assistant" ? {
      citations: e.citations || [],
      parts: e.parts,
      metrics: e.metrics,
      ...e.source ? { source: e.source } : {},
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
function zn(t) {
  const e = B(t.remoteAnswerer), n = B(t.localAnswerer), s = B(t.onAgentOperationSignal), i = B(t.onConfirmationMode), r = B(t.onStopped);
  r.current = t.onStopped;
  const o = B(t.assistantMode);
  e.current = t.remoteAnswerer, n.current = t.localAnswerer, s.current = t.onAgentOperationSignal, i.current = t.onConfirmationMode, o.current = t.assistantMode;
  const u = J(() => new Ht({
    id: `reader-${t.jobId || "idle"}`,
    transport: new Dn({
      jobId: t.jobId,
      getRemoteAnswerer: () => e.current,
      getLocalAnswerer: () => n.current,
      getAssistantMode: () => o.current,
      onAgentOperationSignal: (m) => {
        var c;
        return (c = s.current) == null ? void 0 : c.call(s, m);
      },
      onConfirmationMode: (m) => {
        var c;
        return (c = i.current) == null ? void 0 : c.call(i, m);
      }
    })
  }), [t.jobId]);
  return H(() => {
    t.enabled || u.stop().finally(() => {
      var m;
      return (m = r.current) == null ? void 0 : m.call(r);
    });
  }, [u, t.enabled]), H(() => () => {
    u.stop().finally(() => {
      var m;
      return (m = r.current) == null ? void 0 : m.call(r);
    });
  }, [u]), Gt({ chat: u, experimental_throttle: 16 });
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
          ...n.message.parts ? { parts: n.message.parts, metrics: n.message.metrics } : {},
          ...n.message.progress ? { progress: n.message.progress } : {},
          ...n.message.source ? { source: n.message.source } : {},
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
function ct(t) {
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
  const n = new Map(t.map((u) => [u.message.id, u])), s = e && n.get(e) || t.at(-1);
  if (!s) return [];
  const i = [];
  let r = s;
  const o = /* @__PURE__ */ new Set();
  for (; r && !o.has(r.message.id); )
    o.add(r.message.id), i.push(r.message), r = r.parentId ? n.get(r.parentId) : void 0;
  return i.reverse();
}
function Ln(t, e) {
  var n;
  return e ? ((n = t.find((s) => s.message.id === e)) == null ? void 0 : n.message) ?? null : null;
}
function jn(t, e) {
  const n = new Map(t.map((o) => [o.message.id, o]));
  let s = n.get(e);
  if (!s) return [];
  const i = [], r = /* @__PURE__ */ new Set();
  for (; s && !r.has(s.message.id); )
    r.add(s.message.id), i.push(s), s = s.parentId ? n.get(s.parentId) : void 0;
  return i.reverse();
}
function Kn(t, e, n) {
  var I, w, C, p;
  const s = `${e || ""}`.trim();
  if (!s || !t.length) return [];
  let i = s;
  t.some((l) => l.message.id === i) || (n && t.some((l) => l.message.id === n) ? i = n : i = ((I = [...t].reverse().find((l) => l.message.role === "assistant")) == null ? void 0 : I.message.id) || "");
  let r = jn(t, i);
  if (r.length >= 2 && ((w = r.at(-1)) == null ? void 0 : w.message.role) === "assistant") return r;
  r.length === 1 && ((C = r[0]) == null ? void 0 : C.message.role) === "user" && (r = []);
  const o = ce(t, n || i);
  let u = o.findIndex((l) => l.id === i);
  if (u < 0 && (u = o.length - 1), u < 0) return r;
  const m = new Map(t.map((l) => [l.message.id, l])), c = o.slice(0, u + 1).map((l) => m.get(l.id)).filter((l) => !!l);
  for (; c.length && ((p = c.at(-1)) == null ? void 0 : p.message.role) !== "assistant"; ) c.pop();
  return c.length ? c : r;
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
    const i = s.message;
    i.role === "assistant" && ((n = i.citations) != null && n.length) && (e[i.id] = i.citations);
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
  var i;
  const s = e || ((i = n == null ? void 0 : n.getConversationId) == null ? void 0 : i.call(n)) || "";
  return (t || []).map((r) => ({
    ...Yt(r, { active: s }),
    active: r.conversation_id === s
  }));
}
function Qn(t) {
  const { setItems: e, setHeadId: n } = t;
  return {
    readItems: () => t.itemsRef.current,
    readHeadId: () => t.headIdRef.current,
    appendExchange: ({ parentId: s, userId: i, assistantId: r, question: o, progress: u }) => {
      e((m) => [
        ...m,
        { parentId: s, message: { id: i, role: "user", content: o } },
        {
          parentId: i,
          message: {
            id: r,
            role: "assistant",
            content: "",
            progress: u,
            status: { type: "running" },
            citations: []
          }
        }
      ]), n(r);
    },
    appendRetryTurn: ({ assistantId: s, branchParent: i }) => {
      e((r) => [
        ...r,
        {
          parentId: i,
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
          (i) => {
            var r;
            return ((r = i.message.status) == null ? void 0 : r.type) === "running" ? {
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
    markRunningAsError: (s) => {
      const i = `${s || ""}`.trim() || "生成回答失败，请重试。";
      e((r) => r.map((o) => {
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
    mergeChatMirror: (s) => {
      s.size && e((i) => i.map((r) => {
        const o = s.get(r.message.id);
        return o ? { ...r, message: { ...r.message, ...o } } : r;
      }));
    }
  };
}
function Yn(t) {
  const {
    jobId: e,
    documentId: n,
    enabled: s,
    refreshSessions: i,
    applyConversationTree: r,
    remoteRef: o,
    streamRef: u,
    itemsRef: m,
    documentIdRef: c,
    lastJobRef: I,
    persistReadyRef: w,
    switchTokenRef: C,
    sessionListGenerationRef: p,
    activeConversationIdRef: l,
    setItems: T,
    setHeadId: E,
    setSessions: _,
    setActiveConversationId: D,
    setSessionBusy: $
  } = t;
  H(() => {
    const R = o.current;
    if (!e) {
      p.current += 1, C.current += 1, T([]), E(null), _([]), D(""), u.current.clearMessages(), l.current = "", I.current = "", c.current = "", w.current = !1;
      return;
    }
    const O = I.current !== e;
    if (O && (p.current += 1, C.current += 1, I.current = e, w.current = !1, T([]), E(null), u.current.clearMessages(), _([]), D(""), l.current = "", c.current = "", $(!1)), !s || !R) {
      p.current += 1;
      return;
    }
    let y = !1;
    return (async () => {
      var M, h, N, A;
      let g = `${n || c.current || ""}`.trim();
      if (!g) {
        try {
          g = `${await ((M = R.getDocumentId) == null ? void 0 : M.call(R)) || ""}`.trim();
        } catch {
          g = "";
        }
        if (y) return;
      }
      g && (c.current = g);
      let b = null;
      if (!y && g && (b = await i(g)), !(O || !m.current.length) || y) {
        y || (w.current = !0);
        return;
      }
      const v = Jt({ jobId: e, documentId: g }) || `${((h = R.getConversationId) == null ? void 0 : h.call(R)) || ""}`.trim();
      if (v) {
        D(v), l.current = v, (N = R.setConversationId) == null || N.call(R, v, g);
        try {
          const x = await qe(v);
          if (y) return;
          const d = Ie(x.messages || []);
          if (d.length) {
            r(d, x.head_id), requestAnimationFrame(() => {
              y || (w.current = !0);
            });
            return;
          }
        } catch {
        }
      }
      if (!y && g)
        try {
          const x = b ?? await i(g);
          if (y || !x) return;
          const d = x[0];
          if (d != null && d.conversation_id) {
            const q = d.conversation_id;
            D(q), l.current = q, (A = R.setConversationId) == null || A.call(R, q, g);
            try {
              const V = await qe(q);
              if (y) return;
              r(
                Ie(V.messages || []),
                V.head_id
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
      const f = Ze({ jobId: e, documentId: g }, v);
      if (f != null && f.items.length) {
        const x = ct(f);
        T(x.items), E(x.headId), u.current.showMessages(ce(x.items, x.headId));
      } else
        T([]), E(null), u.current.clearMessages();
      requestAnimationFrame(() => {
        y || (w.current = !0);
      });
    })(), () => {
      y = !0, p.current += 1;
    };
  }, [e, n, s, i, r]);
}
function Jn(t) {
  const {
    jobId: e,
    documentId: n,
    items: s,
    headId: i,
    activeConversationId: r,
    documentIdRef: o,
    persistReadyRef: u
  } = t;
  H(() => {
    if (!e || !u.current) return;
    const m = r, c = { jobId: e, documentId: n || o.current }, I = window.setTimeout(() => {
      if (!s.length) {
        he(c, m);
        return;
      }
      $e(c, Te(s, i), m);
    }, 280);
    return () => window.clearTimeout(I);
  }, [e, n, s, i, r]);
}
function Xn(t) {
  const {
    jobId: e,
    documentId: n,
    sessionBusy: s,
    sessions: i,
    streamRef: r,
    remoteRef: o,
    itemsRef: u,
    headIdRef: m,
    activeConversationIdRef: c,
    documentIdRef: I,
    switchTokenRef: w,
    persistReadyRef: C,
    setSessionBusy: p,
    setSessionError: l,
    setActiveConversationId: T,
    setItems: E,
    setHeadId: _,
    setSessions: D,
    refreshSessions: $,
    applyConversationTree: R
  } = t, O = G(() => {
    var f, M;
    const v = `${((M = (f = o.current) == null ? void 0 : f.getConversationId) == null ? void 0 : M.call(f)) || ""}`.trim();
    v && T(v);
  }, []), y = G(async () => {
    var f, M;
    if (s) return;
    await r.current.stopStream(), ue(900), oe(900), p(!0), l("");
    const v = ++w.current;
    try {
      if (await new Promise((A) => {
        window.setTimeout(A, 40);
      }), v !== w.current) return;
      const h = o.current, N = I.current || `${await ((f = h == null ? void 0 : h.getDocumentId) == null ? void 0 : f.call(h)) || ""}`.trim();
      if (v !== w.current) return;
      I.current = N, (M = h == null ? void 0 : h.clearConversationId) == null || M.call(h, N), T(""), c.current = "", E([]), _(null), r.current.clearMessages(), he({ jobId: e, documentId: N }), N && await $(N, v);
    } catch (h) {
      console.warn("[reader-ai] new session failed", h), l("无法创建新对话，请重试。");
    } finally {
      v === w.current && p(!1);
    }
  }, [e, $, s]), g = G(async (v) => {
    var A, x, d, q, V;
    const f = `${v || ""}`.trim();
    if (!f)
      return l("无法分支：消息 id 无效。"), !1;
    if (s)
      return l("请稍候，当前有会话操作进行中。"), !1;
    await r.current.stopStream();
    const M = Kn(u.current, f, m.current);
    if (!M.length)
      return l("无法分支：找不到到此答案的对话路径。"), !1;
    if (M[M.length - 1].message.role !== "assistant")
      return l("只能从助手答案处开新对话。"), !1;
    p(!0), l("");
    const N = ++w.current;
    try {
      if (await new Promise((W) => {
        window.setTimeout(W, 40);
      }), N !== w.current) return !1;
      const F = o.current;
      let L = I.current || `${await ((A = F == null ? void 0 : F.getDocumentId) == null ? void 0 : A.call(F)) || ""}`.trim();
      if (N !== w.current) return !1;
      if (I.current = L, !L)
        try {
          if (L = `${await ((x = F == null ? void 0 : F.getDocumentId) == null ? void 0 : x.call(F)) || ""}`.trim(), N !== w.current) return !1;
          I.current = L;
        } catch {
          L = "";
        }
      if (!L)
        return l("无法分支：文档未就绪，请稍后重试。"), !1;
      const Q = M.map((W, ie) => ({
        id: W.message.id,
        role: W.message.role,
        content: W.message.content,
        citations: W.message.citations,
        parentId: ie === 0 ? null : M[ie - 1].message.id
      })), z = c.current || ((d = F == null ? void 0 : F.getConversationId) == null ? void 0 : d.call(F)) || "", k = (i || []).find((W) => W.conversation_id === z), j = Q.find((W) => W.role === "user"), te = `${(k == null ? void 0 : k.title) || ""}`.trim() || `${(j == null ? void 0 : j.content) || ""}`.replace(/\s+/g, " ").trim() || "未命名对话", ne = (i || []).map((W) => W.title || ""), re = Xt(te, ne), Z = await me().forkFromPath({
        documentId: L,
        title: re,
        path: Q
      });
      if (N !== w.current) return !1;
      const K = Se(Z.items), X = ((q = K[K.length - 1]) == null ? void 0 : q.message.id) || null, Y = Z.conversation.conversation_id;
      if (!Y || !K.length)
        throw new Error("fork returned empty conversation");
      return ue(600), oe(600), E(K), _(X), r.current.showMessages(ce(K, X)), T(Y), c.current = Y, (V = F == null ? void 0 : F.setConversationId) == null || V.call(F, Y, L), D((W) => {
        const ie = {
          conversation_id: Y,
          title: re,
          document_id: L,
          created_at: Z.conversation.created_at || (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: Z.conversation.updated_at || (/* @__PURE__ */ new Date()).toISOString(),
          message_count: K.length,
          head_id: X || ""
        }, de = W.filter((pe) => pe.conversation_id !== Y);
        return [ie, ...de];
      }), $e(
        { jobId: e, documentId: L },
        Te(K, X),
        Y
      ), await $(L, N), !0;
    } catch (F) {
      return console.warn("[reader-ai] branch from answer failed", F), N === w.current && l("分支失败：未能复制上文到新对话。请检查网络后重试。"), !1;
    } finally {
      N === w.current && p(!1);
    }
  }, [e, $, s, i]), b = G(async (v) => {
    var h, N, A, x;
    const f = `${v || ""}`.trim();
    if (!f || s) return;
    await r.current.stopStream(), p(!0), l("");
    const M = ++w.current;
    try {
      const d = o.current, q = I.current || `${await ((h = d == null ? void 0 : d.getDocumentId) == null ? void 0 : h.call(d)) || ""}`.trim();
      if (M !== w.current) return;
      I.current = q;
      try {
        await me().delete(f);
      } catch (L) {
        if ((Number(L == null ? void 0 : L.status) || 0) !== 404) throw L;
      }
      he({ jobId: e, documentId: q }, f);
      const F = (c.current || ((N = d == null ? void 0 : d.getConversationId) == null ? void 0 : N.call(d)) || "") === f;
      if (D((L) => L.filter((Q) => Q.conversation_id !== f)), F) {
        (A = d == null ? void 0 : d.clearConversationId) == null || A.call(d, q), T(""), c.current = "", E([]), _(null), r.current.clearMessages(), he({ jobId: e, documentId: q });
        const L = q ? await $(q, M) : [];
        if (M !== w.current || !L) return;
        const Q = L[0];
        if (Q != null && Q.conversation_id) {
          const z = Q.conversation_id;
          T(z), c.current = z;
          try {
            const k = await me().get(z);
            if (M !== w.current) return;
            R(
              Ie(k.messages || []),
              k.head_id
            ), (x = d == null ? void 0 : d.setConversationId) == null || x.call(d, z, q);
          } catch {
            E([]), _(null);
          }
        }
      } else q && await $(q, M);
    } catch (d) {
      console.warn("[reader-ai] delete session failed", d), l("删除对话失败，请重试。");
    } finally {
      M === w.current && p(!1);
    }
  }, [R, e, $, s]), S = G(async (v, f) => {
    const M = `${v || ""}`.trim(), h = `${f || ""}`.replace(/\s+/g, " ").trim();
    if (!M || !h || s) return;
    p(!0), l("");
    const N = ++w.current;
    try {
      const A = h.slice(0, 80);
      if (await me().patch(M, { title: A }), N !== w.current) return;
      D(
        (d) => d.map(
          (q) => q.conversation_id === M ? { ...q, title: A } : q
        )
      );
      const x = I.current;
      x && await $(x, N);
    } catch (A) {
      console.warn("[reader-ai] rename session failed", A), l("重命名失败，请重试。");
    } finally {
      N === w.current && p(!1);
    }
  }, [$, s]);
  return {
    adoptRemoteConversationId: O,
    newSession: y,
    branchFromAnswer: g,
    removeSession: b,
    renameSession: S
  };
}
function Zn(t) {
  var re;
  const {
    jobId: e,
    documentId: n = "",
    enabled: s,
    remoteAnswerer: i = null,
    stream: r = Wn
  } = t, [o, u] = U([]), [m, c] = U(null), [I, w] = U([]), [C, p] = U(""), [l, T] = U(!1), [E, _] = U(""), D = B(o), $ = B(m), R = B(C), O = B(!1), y = B(""), g = B(""), b = B(0), S = B(0), v = B(r);
  v.current = r;
  const f = B(i);
  f.current = i, D.current = o, $.current = m, R.current = C;
  const M = G(async (Z = "", K) => {
    const X = `${Z || g.current || ""}`.trim(), Y = ++S.current;
    if (!X)
      return Y === S.current && (K === void 0 || K === b.current) && w([]), [];
    try {
      const W = me();
      if (!W) return null;
      const de = (await W.list({ document_id: X, limit: 50 })).conversations || [];
      return Y === S.current && X === `${g.current || ""}`.trim() && (K === void 0 || K === b.current) ? (w(de), de) : null;
    } catch {
      return null;
    }
  }, []), h = G((Z, K) => {
    var W;
    const X = Se(Z), Y = `${K || ""}`.trim() || ((W = X[X.length - 1]) == null ? void 0 : W.message.id) || null;
    u(X), c(Y), v.current.showMessages(ce(X, Y));
  }, []), N = G(() => `${n || g.current || e}`.trim(), [n, e]);
  Yn({
    jobId: e,
    documentId: n,
    enabled: s,
    refreshSessions: M,
    applyConversationTree: h,
    remoteRef: f,
    streamRef: v,
    itemsRef: D,
    documentIdRef: g,
    lastJobRef: y,
    persistReadyRef: O,
    switchTokenRef: b,
    sessionListGenerationRef: S,
    activeConversationIdRef: R,
    setItems: u,
    setHeadId: c,
    setSessions: w,
    setActiveConversationId: p,
    setSessionBusy: T
  }), Jn({
    jobId: e,
    documentId: n,
    items: o,
    headId: m,
    activeConversationId: C,
    documentIdRef: g,
    persistReadyRef: O
  });
  const A = J(
    () => ce(o, m),
    [o, m]
  ), x = J(
    () => Un(o),
    [o]
  ), d = J(
    () => Hn(o),
    [o]
  ), q = J(
    () => Gn(o),
    [o]
  ), V = J(() => Qn({ setItems: u, setHeadId: c, itemsRef: D, headIdRef: $ }), []), {
    adoptRemoteConversationId: F,
    newSession: L,
    branchFromAnswer: Q,
    removeSession: z,
    renameSession: k
  } = Xn({
    jobId: e,
    documentId: n,
    sessionBusy: l,
    sessions: I,
    streamRef: v,
    remoteRef: f,
    itemsRef: D,
    headIdRef: $,
    activeConversationIdRef: R,
    documentIdRef: g,
    switchTokenRef: b,
    persistReadyRef: O,
    setSessionBusy: T,
    setSessionError: _,
    setActiveConversationId: p,
    setItems: u,
    setHeadId: c,
    setSessions: w,
    refreshSessions: M,
    applyConversationTree: h
  }), j = G(async (Z) => {
    var W, ie, de, pe, xe, Ee, Pe, Oe;
    const K = `${Z || ""}`.trim(), X = R.current || ((ie = (W = f.current) == null ? void 0 : W.getConversationId) == null ? void 0 : ie.call(W)) || "";
    if (!K || K === X || l) return;
    await v.current.stopStream(), ue(1200), oe(1200), T(!0), _("");
    const Y = ++b.current;
    O.current = !1, p(K), R.current = K, u([]), c(null), v.current.clearMessages();
    try {
      if (await new Promise((ye) => {
        window.setTimeout(ye, 80);
      }), Y !== b.current) return;
      try {
        (xe = (pe = (de = globalThis.document) == null ? void 0 : de.activeElement) == null ? void 0 : pe.blur) == null || xe.call(pe);
      } catch {
      }
      const ee = f.current, se = g.current || `${await ((Ee = ee == null ? void 0 : ee.getDocumentId) == null ? void 0 : Ee.call(ee)) || ""}`.trim();
      if (Y !== b.current) return;
      g.current = se;
      const le = me();
      if (!le) throw new Error("Reader conversations unavailable");
      const Ce = await le.get(K);
      if (Y !== b.current) return;
      ue(800), oe(800);
      const Ne = Ie(Ce.messages || []);
      if (h(Ne, Ce.head_id), (Pe = ee == null ? void 0 : ee.setConversationId) == null || Pe.call(ee, K, se), O.current = !0, Ne.length) {
        const ye = Se(Ne);
        $e(
          { jobId: e, documentId: se },
          Te(
            ye,
            `${Ce.head_id || ""}`.trim() || ((Oe = ye.at(-1)) == null ? void 0 : Oe.message.id) || null
          ),
          K
        );
      } else
        he({ jobId: e, documentId: se }, K);
      se && await M(se, Y), ue(350), oe(350);
    } catch (ee) {
      if (console.warn("[reader-ai] switch session failed", ee), Y === b.current) {
        _("加载该对话失败，请检查网络后重试。");
        const se = Ze(
          { jobId: e, documentId: n || g.current },
          K
        );
        if (se != null && se.items.length) {
          const le = ct(se);
          u(le.items), c(le.headId), v.current.showMessages(ce(le.items, le.headId));
        } else
          u([]), c(null);
        O.current = !0;
      }
    } finally {
      Y === b.current && T(!1);
    }
  }, [
    h,
    e,
    n,
    M,
    l
  ]), te = J(
    () => Vn(I, C, i),
    [I, C, i]
  ), ne = J(() => ({
    refreshSessions: M,
    adoptRemoteConversationId: F,
    newSession: L,
    switchSession: j,
    removeSession: z,
    renameSession: k,
    branchFromAnswer: Q
  }), [
    M,
    F,
    L,
    j,
    z,
    k,
    Q
  ]);
  return {
    items: o,
    headId: m,
    messages: A,
    citationsByMessageId: x,
    progressByMessageId: d,
    contentByMessageId: q,
    sessions: te,
    activeConversationId: C || ((re = i == null ? void 0 : i.getConversationId) == null ? void 0 : re.call(i)) || "",
    sessionBusy: l,
    sessionError: E,
    resolveRequestScopeKey: N,
    tree: V,
    sessionCommands: ne
  };
}
const er = "retainpdf.reader.ai.request.v1:", tr = Object.freeze({
  assistantMode: "reading",
  scope: "document",
  context: null
});
function dt(t, e) {
  return `${er}${`${t || ""}`.trim()}:${`${e || ""}`.trim()}`;
}
function nr(t) {
  if (!t || typeof t != "object" || Array.isArray(t)) return null;
  const e = t, n = e.assistantMode === "operations" ? "operations" : e.assistantMode === "reading" ? "reading" : null, s = e.scope === "selection" || e.scope === "page" || e.scope === "document" ? e.scope : null;
  if (!n || !s) return null;
  const i = e.context && typeof e.context == "object" && !Array.isArray(e.context) ? { ...e.context } : null;
  return { assistantMode: n, scope: s, context: i };
}
function Le(t, e, n) {
  var r;
  const s = `${t || ""}`.trim(), i = `${e || ""}`.trim();
  if (!(!s || !i))
    try {
      (r = globalThis.localStorage) == null || r.setItem(
        dt(s, i),
        JSON.stringify(n)
      );
    } catch {
    }
}
function je(t, e) {
  var i;
  const n = `${t || ""}`.trim(), s = `${e || ""}`.trim();
  if (!n || !s) return null;
  try {
    const r = (i = globalThis.localStorage) == null ? void 0 : i.getItem(dt(n, s));
    return r ? nr(JSON.parse(r)) : null;
  } catch {
    return null;
  }
}
function rr(t) {
  const e = `${t.scopeKey || ""}`.trim(), n = `${t.jobId || ""}`.trim(), s = `${t.assistantMessageId || ""}`.trim();
  return je(e, s) || (e !== n ? je(n, s) : null) || tr;
}
function sr(t) {
  const { assistantMode: e, selectionContext: n } = t;
  return e === "operations" ? { assistantMode: e, scope: "document", context: null } : n ? { assistantMode: e, scope: "selection", context: { ...n } } : { assistantMode: e, scope: "document", context: null };
}
function ar(t) {
  var O;
  const { jobId: e, assistantMode: n, selectionContext: s = null, tree: i, chat: r, getScopeKey: o } = t, u = B(i);
  u.current = i;
  const m = B(r);
  m.current = r;
  const c = B(n);
  c.current = n;
  const I = B(s);
  I.current = s;
  const w = B(o);
  w.current = o;
  const C = r.status, p = C === "submitted" || C === "streaming", l = B(p);
  l.current = p;
  const T = p ? `${((O = Bn(r.messages)) == null ? void 0 : O.id) || ""}` : "", E = r.messages, _ = r.error;
  H(() => {
    if (!E.length) return;
    const y = new Map(E.map((b) => [b.id, b])), g = /* @__PURE__ */ new Map();
    for (const [b, S] of y)
      g.set(b, qn(S));
    u.current.mergeChatMirror(g);
  }, [E]), H(() => {
    !_ || C !== "error" || u.current.markRunningAsError(_.message);
  }, [_, C]);
  const D = G(async (y) => {
    if (l.current) return;
    const g = `${y || ""}`.trim();
    if (!g) return;
    const b = u.current, S = m.current, v = c.current, f = I.current, M = w.current(), h = b.readHeadId(), N = Me("u"), A = Me("a"), x = sr({
      assistantMode: v,
      selectionContext: (f == null ? void 0 : f.selectionType) === "text" ? {
        page: f.page,
        page_idx: Math.max(0, f.page - 1),
        pane: f.pane,
        kind: "text",
        block_id: "",
        quoteText: f.quote
      } : f ? {
        page: f.page,
        page_idx: Math.max(0, f.page - 1),
        pane: f.pane,
        kind: f.kind,
        block_id: f.selectionType === "region" ? f.region.itemId : "",
        quoteText: Xe(f.region, f.pane)
      } : null
    });
    Le(M, A, x), b.appendExchange({
      parentId: h,
      userId: N,
      assistantId: A,
      question: g,
      progress: x.assistantMode === "operations" ? "正在规划 PDF 操作…" : "正在理解文档…"
    }), await S.sendUserMessage(
      { id: N, role: "user", parts: [{ type: "text", text: g }] },
      {
        body: {
          assistantMessageId: A,
          assistantMode: x.assistantMode,
          parentId: h,
          question: g,
          regenerate: !1,
          userMessageId: N,
          scope: x.scope,
          context: x.context
        }
      }
    );
  }, []), $ = G(async (y) => {
    if (l.current) return;
    const g = u.current, b = m.current, S = g.readItems(), v = S.find(
      (V) => V.message.id === y && V.message.role === "assistant"
    ), f = (v == null ? void 0 : v.parentId) ?? null, M = f ? Ln(S, f) : null;
    let h = "", N = f;
    if ((M == null ? void 0 : M.role) === "user")
      h = M.content.trim();
    else {
      const V = ce(S, f ?? g.readHeadId());
      for (let F = V.length - 1; F >= 0; F -= 1)
        if (V[F].role === "user") {
          h = V[F].content.trim(), N = V[F].id;
          break;
        }
    }
    if (!h) return;
    const A = Me("a"), x = N || f, d = w.current(), q = rr({
      scopeKey: d,
      jobId: e,
      assistantMessageId: y
    });
    Le(d, A, q), g.appendRetryTurn({ assistantId: A, branchParent: x }), b.replaceVisible(ot(ce(S, y))), await b.regenerateFrom({
      messageId: y,
      body: {
        assistantMessageId: A,
        assistantMode: q.assistantMode,
        parentId: x,
        question: h,
        regenerate: !0,
        userMessageId: N || "",
        scope: q.scope,
        context: q.context
      }
    });
  }, [e]), R = G(async () => {
    await m.current.stopStream(), u.current.markRunningCancelled();
  }, []);
  return {
    isRunning: p,
    streamingAssistantId: T,
    submitQuestion: D,
    retryAnswer: $,
    cancelAnswer: R
  };
}
const ir = "retainpdf.reader-agent-operation.action-key.v1:", or = "reader-";
function Ke(t, e) {
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
  confirmationModeHint: i,
  onDocumentCommitted: r
}) {
  const [o, u] = U({}), [m, c] = U("explicit"), [I, w] = U(!1), [C, p] = U(!1), l = B(/* @__PURE__ */ new Set()), T = B(/* @__PURE__ */ new Set()), E = B(/* @__PURE__ */ new Set()), _ = G((y, g = !1) => {
    y != null && y.operation_id && u((b) => {
      const S = b[y.operation_id];
      return dr(S == null ? void 0 : S.operation, y) ? {
        ...b,
        [y.operation_id]: {
          ...S,
          operation: y,
          pendingAction: void 0,
          error: void 0
        }
      } : !g || !(S != null && S.pendingAction) ? b : {
        ...b,
        [y.operation_id]: { ...S, pendingAction: void 0 }
      };
    });
  }, []), D = G(async (y, g = !1) => {
    const b = `${y || ""}`.trim(), S = `refresh:${b}`;
    if (!(!b || l.current.has(S))) {
      l.current.add(S);
      try {
        const v = fe();
        if (!v) return;
        _(await v.get(b), g);
      } catch {
      } finally {
        l.current.delete(S);
      }
    }
  }, [_]), $ = G(async () => {
    const y = `${t || ""}`.trim(), g = `recover:${y}`;
    if (!(!e || !y || l.current.has(g))) {
      l.current.add(g);
      try {
        const b = fe();
        if (!b) return;
        const S = await b.list(y, {});
        if (!E.current.has(y)) {
          for (const v of S.operations || [])
            v.status === "committed" && T.current.add(v.operation_id);
          E.current.add(y);
        }
        for (const v of S.operations || []) _(v);
      } catch {
      } finally {
        l.current.delete(g);
      }
    }
  }, [t, e, _]);
  H(() => {
    if (!e) return;
    let y = !1;
    const g = async () => {
      try {
        const S = fe();
        if (!S) return;
        const v = await S.fetchRuntimeConfig();
        if (y) return;
        c(v.agent_confirmation_mode || "explicit"), p(!!v.llm_api_key_configured), w(
          v.restart_required || v.restart_state === "pending" || v.active_revision !== v.configured_revision
        );
      } catch {
        y || (w(!1), p(!1));
      }
    };
    g();
    const b = window.setInterval(g, 3e3);
    return () => {
      y = !0, window.clearInterval(b);
    };
  }, [e]), H(() => {
    i && c(i);
  }, [i]), H(() => {
    s != null && s.confirmationMode && c(s.confirmationMode), s != null && s.operationId && D(s.operationId);
  }, [D, s]), H(() => {
    $();
  }, [$]), H(() => {
    n || $();
  }, [n, $]);
  const R = J(
    () => Object.values(o).filter((y) => !!t && y.operation.conversation_id === t).sort((y, g) => `${y.operation.created_at || ""}`.localeCompare(`${g.operation.created_at || ""}`)),
    [t, o]
  );
  H(() => {
    var y;
    for (const g of R) {
      const b = g.operation;
      b.status !== "committed" || T.current.has(b.operation_id) || (T.current.add(b.operation_id), r == null || r({
        documentId: b.document_id,
        revision: ((y = b.candidate) == null ? void 0 : y.version_id) || `${b.updated_at || ""}` || `${b.operation_id}:${cr(b)}`
      }));
    }
  }, [R, r]);
  const O = R.some((y) => Ke(y.operation.status, m));
  return H(() => {
    if (!e || !t || !n && !O) return;
    const y = window.setInterval(() => {
      $();
      for (const g of R)
        Ke(g.operation.status, m) && D(g.operation.operation_id);
    }, 1400);
    return () => window.clearInterval(y);
  }, [m, t, n, e, R, O, $, D]), H(() => {
    if (!e) return;
    const y = () => void $(), g = () => {
      document.visibilityState === "visible" && y();
    };
    return window.addEventListener("online", y), document.addEventListener("visibilitychange", g), () => {
      window.removeEventListener("online", y), document.removeEventListener("visibilitychange", g);
    };
  }, [e, $]), {
    entries: R,
    confirmationMode: m,
    runtimeRestarting: I,
    runtimeCredentialConfigured: C,
    setEntriesById: u,
    inFlightRef: l,
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
function lt() {
  return {
    storagePrefix: ir,
    keyPrefix: or,
    storage: mr()
  };
}
function fr(t, e, n) {
  return sn(t, e, n, lt());
}
function We(t, e, n) {
  an(t, e, n, lt());
}
function hr({
  refresh: t,
  upsert: e,
  setEntriesById: n,
  inFlightRef: s
}) {
  const i = B(/* @__PURE__ */ new Map());
  return { perform: G(async (o, u, m = {}) => {
    const c = `${u.operation_id || ""}`.trim(), I = `action:${c}`;
    if (!c || s.current.has(I)) return;
    if (o === "retry" && u.status === "ambiguous" && m.acceptDuplicateRisk !== !0) {
      n((p) => ({
        ...p,
        [c]: {
          ...p[c],
          error: "请先确认重复执行风险，再重新执行操作。"
        }
      }));
      return;
    }
    const w = fr(c, o, i.current);
    s.current.add(I), n((p) => ({
      ...p,
      [c]: { ...p[c], pendingAction: o, error: void 0 }
    }));
    const C = {
      idempotency_key: w,
      expected_status: u.status,
      expected_attempt: u.current_attempt,
      expected_program_sha256: u.program_sha256 || ""
    };
    try {
      const p = fe();
      if (!p) throw new Error("Reader AI operations unavailable");
      let l;
      o === "run" ? l = await p.run(c, C) : o === "cancel" ? l = await p.cancel(c, { ...C, reason: "user_rejected" }) : o === "commit" ? l = await p.commit(c, C) : l = await p.retry(c, m.acceptDuplicateRisk ? { ...C, accept_duplicate_risk: !0 } : C), We(c, o, i.current), e(l, !0);
    } catch (p) {
      lr(p) === 409 ? (We(c, o, i.current), await t(c, !0)) : n((l) => ({
        ...l,
        [c]: {
          ...l[c],
          pendingAction: void 0,
          error: ur(p)
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
  confirmationModeHint: i,
  onDocumentCommitted: r
}) {
  const o = pr({
    conversationId: t,
    enabled: e,
    discovering: n,
    signal: s,
    confirmationModeHint: i,
    onDocumentCommitted: r
  }), { perform: u } = hr({
    refresh: o.refresh,
    upsert: o.upsert,
    setEntriesById: o.setEntriesById,
    inFlightRef: o.inFlightRef
  }), m = G((c) => {
    var I;
    return ((I = fe()) == null ? void 0 : I.fetchCandidate(c.operation_id)) ?? Promise.reject(new Error("Reader AI operations unavailable"));
  }, []);
  return {
    entries: o.entries,
    confirmationMode: o.confirmationMode,
    runtimeRestarting: o.runtimeRestarting,
    runtimeCredentialConfigured: o.runtimeCredentialConfigured,
    perform: u,
    loadCandidate: m
  };
}
function yr(t) {
  var S;
  const {
    jobId: e,
    documentId: n = "",
    sessionIdentity: s = "",
    enabled: i,
    selectionContext: r = null,
    onDocumentCommitted: o
  } = t, u = `${e}\0${n}\0${s}`, [m, c] = U("reading"), [I, w] = U(null), [C, p] = U();
  H(() => {
    c("reading"), w(null), p(void 0);
  }, [u]);
  const l = J(() => {
    var v;
    return !i || !e ? null : ((v = De()) == null ? void 0 : v.createRemoteAnswerer({ jobId: e, documentId: n })) ?? Tt({ jobId: e, documentId: n });
  }, [n, i, e]), T = J(() => {
    var v;
    return !i || !e ? null : ((v = De()) == null ? void 0 : v.createLocalAnswerer({ jobId: e })) ?? Wt({
      loadMarkdownPayload: xt.loadMarkdownPayload
    });
  }, [i, e]), E = B(null), _ = zn({
    jobId: e,
    enabled: i,
    remoteAnswerer: l,
    localAnswerer: T,
    assistantMode: m,
    onAgentOperationSignal: (v) => {
      w({ ...v, nonce: Date.now() + Math.random() });
    },
    onConfirmationMode: p,
    onStopped: () => {
      var v;
      return (v = E.current) == null ? void 0 : v.markRunningCancelled();
    }
  }), D = J(() => ({
    messages: _.messages,
    status: _.status,
    error: _.error,
    sendUserMessage: (v, f) => _.sendMessage(
      v,
      f
    ),
    regenerateFrom: (v) => _.regenerate(
      v
    ),
    stopStream: () => _.stop(),
    replaceVisible: (v) => _.setMessages([...v])
  }), [_]), $ = J(() => ({
    stopStream: () => D.stopStream(),
    clearMessages: () => D.replaceVisible([]),
    showMessages: (v) => D.replaceVisible(ot(v))
  }), [D]), R = Zn({
    jobId: e,
    documentId: n,
    enabled: i,
    remoteAnswerer: l,
    stream: $
  });
  E.current = R.tree;
  const O = ar({
    jobId: e,
    assistantMode: m,
    selectionContext: r,
    tree: R.tree,
    chat: D,
    getScopeKey: () => R.resolveRequestScopeKey()
  }), y = R.activeConversationId || (I == null ? void 0 : I.conversationId) || `${((S = l == null ? void 0 : l.getConversationId) == null ? void 0 : S.call(l)) || ""}`.trim(), g = gr({
    conversationId: y,
    enabled: i,
    discovering: O.isRunning,
    signal: I,
    confirmationModeHint: C,
    onDocumentCommitted: o
  }), b = B(!1);
  return H(() => {
    b.current = !1;
  }, [e]), H(() => {
    b.current = !1;
  }, [u]), H(() => {
    b.current && !O.isRunning && (R.sessionCommands.refreshSessions(), R.sessionCommands.adoptRemoteConversationId()), b.current = O.isRunning;
  }, [R, O.isRunning]), {
    citationsByMessageId: R.citationsByMessageId,
    progressByMessageId: R.progressByMessageId,
    contentByMessageId: R.contentByMessageId,
    streamingAssistantId: O.streamingAssistantId,
    isRunning: O.isRunning,
    messages: R.messages,
    sessions: R.sessions,
    activeConversationId: R.activeConversationId,
    sessionBusy: R.sessionBusy,
    sessionError: R.sessionError,
    submitQuestion: O.submitQuestion,
    retryAnswer: O.retryAnswer,
    cancelAnswer: O.cancelAnswer,
    newSession: R.sessionCommands.newSession,
    switchSession: R.sessionCommands.switchSession,
    removeSession: R.sessionCommands.removeSession,
    renameSession: R.sessionCommands.renameSession,
    branchFromAnswer: R.sessionCommands.branchFromAnswer,
    agentOperations: g,
    assistantMode: m,
    setAssistantMode: c
  };
}
function Dr({
  open: t,
  jobId: e,
  documentId: n = "",
  sessionIdentity: s = "",
  onClose: i,
  onJumpCitation: r,
  onDocumentCommitted: o,
  layout: u = "floating",
  side: m = "right",
  selectionContext: c = null,
  onClearSelectionContext: I
}) {
  const w = t && !!e, {
    citationsByMessageId: C,
    progressByMessageId: p,
    contentByMessageId: l,
    streamingAssistantId: T,
    isRunning: E,
    sessions: _,
    activeConversationId: D,
    sessionBusy: $,
    sessionError: R,
    messages: O,
    submitQuestion: y,
    retryAnswer: g,
    cancelAnswer: b,
    newSession: S,
    switchSession: v,
    removeSession: f,
    renameSession: M,
    branchFromAnswer: h,
    agentOperations: N,
    assistantMode: A,
    setAssistantMode: x
  } = yr({
    jobId: e,
    documentId: n,
    sessionIdentity: s,
    enabled: w,
    selectionContext: c,
    onDocumentCommitted: o
  }), [d, q] = U(""), V = G(async (L) => {
    q(""), await h(L) && (q(
      "已保存新对话（fork-n-原名）：复制了到此答案的上文，原对话不变。顶部列表可切换。"
    ), window.setTimeout(() => q(""), 6e3));
  }, [h]), F = G((L) => {
    r(L);
  }, [r]);
  return /* @__PURE__ */ a(
    Et,
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
      className: `reader-float-ai is-${u}${u === "workspace" ? ` is-pane-${m}` : ""}${$ ? " is-session-busy" : ""}`,
      onClose: i,
      children: e ? /* @__PURE__ */ P("div", { className: "reader-float-ai-body", children: [
        /* @__PURE__ */ a(
          En,
          {
            sessions: _,
            activeId: D,
            busy: $,
            errorText: R,
            onSwitch: v,
            onNew: S,
            onDelete: f,
            onRename: M
          }
        ),
        d ? /* @__PURE__ */ a("div", { className: "aui-session-banner", role: "status", children: d }) : null,
        /* @__PURE__ */ a("div", { className: "reader-float-ai-thread-wrap", "aria-busy": $ || void 0, children: /* @__PURE__ */ a(
          xn,
          {
            jobId: e,
            messages: O,
            citationsByMessageId: C,
            progressByMessageId: p,
            contentByMessageId: l,
            streamingAssistantId: T,
            isRunning: E,
            onSubmit: y,
            onRetry: g,
            onCancel: b,
            onJumpCitation: F,
            onBranchFromAnswer: V,
            branchBusy: $,
            agentOperations: N,
            assistantMode: A,
            onAssistantModeChange: x,
            selectionContext: c,
            onClearSelectionContext: I
          }
        ) })
      ] }) : /* @__PURE__ */ P("div", { className: "reader-float-ai-empty", children: [
        /* @__PURE__ */ a(ge, { size: 22, strokeWidth: 1.75, "aria-hidden": !0 }),
        /* @__PURE__ */ a("p", { children: "当前文档还没有可用于 AI 的解析产物" }),
        /* @__PURE__ */ a("span", { children: "请先完成 OCR 文档解析" })
      ] })
    }
  );
}
export {
  Dr as ReaderAiPanel
};
//# sourceMappingURL=ReaderAiPanel-DDR5iqEU.js.map
