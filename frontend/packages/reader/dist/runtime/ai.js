import { a as ee, b as te, d as re, e as ae, c as ne, f as se, g as ie, h as oe, j as ce, k as de, i as ue, l as le, m as fe, n as Ae, o as me, p as pe, q as ge, t as he, u as ye, r as ve, v as $e, w as Ie, x as Se, y as we, s as Ce, z as Ee } from "../answer-enhance-D8zK9znw.js";
import { M as ke, b as Me, c as _e, a as Ne, l as Re, m as Te, s as xe, d as He, t as Fe, v as Le } from "../answer-quote-Div0HO_p.js";
import { b as De, c as Oe, a as ze, d as Ue, l as Xe, s as Be } from "../ask-answerer-GNQdzitl.js";
import { C as Ke, M as qe, h as je, n as Qe, a as We, b as Je, r as Ve, s as Ye } from "../config-CgaWliJ_.js";
import { Marked as T } from "marked";
import { p as x } from "../markdown-math-XkF5urpn.js";
const w = "CITE_", C = "";
function v(t) {
  return `${t}`.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function H(t) {
  const a = [];
  return { text: `${t ?? ""}`.replace(/\[(\d+)\]/g, (n, o) => {
    const d = `${w}${a.length}${C}`;
    return a.push(o), d;
  }), refs: a };
}
function F(t, a) {
  return a.length ? `${t ?? ""}`.replace(
    new RegExp(`${w}(\\d+)${C}`, "g"),
    (r, n) => {
      const o = a[Number(n)];
      return o != null ? `[${o}]` : "";
    }
  ) : t;
}
function Q(t) {
  return v(t || "").replace(/`([^`\n]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br />");
}
function L(t) {
  if (typeof t == "string") return t;
  const a = t;
  return `${(a == null ? void 0 : a.raw) ?? (a == null ? void 0 : a.text) ?? ""}`;
}
const $ = new T();
$.setOptions({ gfm: !0, breaks: !0 });
$.use({
  renderer: {
    html: (t) => v(L(t))
  }
});
const P = /^\s*(?:javascript|vbscript|data:text\/html)/i;
function D(t) {
  const a = globalThis.document;
  if (!a)
    return v(t);
  const r = a.createElement("template");
  r.innerHTML = t;
  const n = r.content;
  return n.querySelectorAll("script, iframe, object, embed, base, link, meta, form").forEach((o) => o.remove()), n.querySelectorAll("*").forEach((o) => {
    for (const d of [...o.attributes]) {
      const i = d.name.toLowerCase();
      if (i.startsWith("on") || i === "srcdoc") {
        o.removeAttribute(d.name);
        continue;
      }
      if ((i === "href" || i === "src" || i === "xlink:href") && P.test(d.value)) {
        o.removeAttribute(d.name);
        continue;
      }
      i === "target" && o.removeAttribute(d.name);
    }
  }), r.innerHTML;
}
const f = /* @__PURE__ */ new Map(), O = 48;
function W(t) {
  const a = `${t || ""}`.trim();
  return a ? f.get(a) ?? null : null;
}
function z(t, a) {
  const r = `${t || ""}`.trim();
  if (r)
    for (f.has(r) && f.delete(r), f.set(r, a); f.size > O; ) {
      const n = f.keys().next().value;
      if (n == null) break;
      f.delete(n);
    }
}
async function J(t) {
  const a = `${t || ""}`;
  if (!a.trim()) return "";
  const r = f.get(a);
  if (r != null) return r;
  const { text: n, refs: o } = H(a), d = await x(n, (l) => {
    const p = String($.parse(l, { async: !1 }));
    return D(p);
  }), i = F(d, o);
  return z(a, i), i;
}
const U = 20, I = 18;
function X(t = {}) {
  const r = (Array.isArray(t == null ? void 0 : t.messages) ? t.messages : []).find(
    (o) => (o == null ? void 0 : o.role) === "user" && `${(o == null ? void 0 : o.text) || ""}`.trim()
  ), n = `${(r == null ? void 0 : r.text) || (t == null ? void 0 : t.title) || ""}`.replace(/\s+/g, " ").trim();
  return n ? n.length > I ? `${n.slice(0, I).trim()}…` : n : "新对话";
}
function S({
  sessions: t = [],
  activeId: a = ""
} = {}) {
  return (Array.isArray(t) ? t : []).map((r) => ({
    id: `${(r == null ? void 0 : r.id) || ""}`,
    title: X(r),
    updatedAt: Number(r == null ? void 0 : r.updatedAt) || 0,
    messageCount: Array.isArray(r == null ? void 0 : r.messages) ? r.messages.length : 0,
    active: `${(r == null ? void 0 : r.id) || ""}` == `${a}`
  })).filter((r) => r.id).sort((r, n) => n.updatedAt - r.updatedAt);
}
function B({ sessions: t = [], activeId: a = "" } = {}, r = U) {
  const n = Array.isArray(t) ? [...t] : [];
  if (n.length <= r)
    return n;
  const d = n.sort(
    (i, l) => (Number(l == null ? void 0 : l.updatedAt) || 0) - (Number(i == null ? void 0 : i.updatedAt) || 0)
  ).slice(0, r);
  if (a && !d.some((i) => `${i == null ? void 0 : i.id}` == `${a}`)) {
    const i = n.find((l) => `${l == null ? void 0 : l.id}` == `${a}`);
    i && (d[d.length - 1] = i);
  }
  return d;
}
const G = "retainpdf-ai-chat-v1:";
function K(t) {
  return `${G}${`${t || ""}`.trim()}`;
}
function A() {
  try {
    return Date.now();
  } catch {
    return 0;
  }
}
function h(t, a) {
  return { id: t, title: "", createdAt: a, updatedAt: a, messages: [], history: [] };
}
function V({
  jobId: t = "",
  storage: a = globalThis.localStorage || null
} = {}) {
  const r = K(t), n = !!(`${t || ""}`.trim() && a);
  let o = 0;
  function d() {
    return o += 1, `s-${A().toString(36)}-${o}`;
  }
  function i() {
    var u;
    const s = { activeId: "", sessions: [] };
    if (!n)
      return s;
    let e = null;
    try {
      const c = a.getItem(r);
      e = c ? JSON.parse(c) : null;
    } catch {
      return s;
    }
    if (!e || typeof e != "object")
      return s;
    if (Array.isArray(e.sessions)) {
      const c = e.sessions.filter((g) => g && `${g.id || ""}`.trim());
      return { activeId: c.some((g) => `${g.id}` == `${e.activeId}`) ? `${e.activeId}` : `${((u = c[0]) == null ? void 0 : u.id) || ""}`, sessions: c };
    }
    if (Array.isArray(e.messages) || Array.isArray(e.history)) {
      const c = A(), m = {
        ...h(d(), c),
        messages: Array.isArray(e.messages) ? e.messages : [],
        history: Array.isArray(e.history) ? e.history : []
      };
      return { activeId: m.id, sessions: [m] };
    }
    return s;
  }
  function l(s) {
    var e;
    if (n)
      try {
        const u = B(s), c = u.some((m) => `${m.id}` == `${s.activeId}`) ? s.activeId : `${((e = u[0]) == null ? void 0 : e.id) || ""}`;
        a.setItem(r, JSON.stringify({ v: 2, activeId: c, sessions: u }));
      } catch {
      }
  }
  function p(s) {
    let e = s.sessions.find((u) => `${u.id}` == `${s.activeId}`);
    return e || (e = h(d(), A()), s.sessions.push(e), s.activeId = e.id), e;
  }
  function y() {
    if (!n)
      return { messages: [], history: [] };
    const s = i(), e = s.sessions.find((u) => `${u.id}` == `${s.activeId}`);
    return {
      messages: Array.isArray(e == null ? void 0 : e.messages) ? e.messages : [],
      history: Array.isArray(e == null ? void 0 : e.history) ? e.history : []
    };
  }
  function E({ messages: s = [], history: e = [] } = {}) {
    if (!n)
      return;
    const u = i(), c = p(u);
    c.messages = s.slice(-40), c.history = e.slice(-40), c.updatedAt = A(), l(u);
  }
  function b() {
    if (!n)
      return;
    const s = i(), e = p(s);
    e.messages = [], e.history = [], e.title = "", e.updatedAt = A(), l(s);
  }
  function k() {
    return n ? S(i()) : [];
  }
  function M() {
    return n ? `${i().activeId || ""}` : "";
  }
  function _() {
    if (!n)
      return "";
    const s = i(), e = h(d(), A());
    return s.sessions.push(e), s.activeId = e.id, l(s), e.id;
  }
  function N(s) {
    if (!n)
      return { messages: [], history: [] };
    const e = i();
    return e.sessions.some((u) => `${u.id}` == `${s}`) && (e.activeId = `${s}`, l(e)), y();
  }
  function R(s) {
    if (!n)
      return { messages: [], history: [] };
    const e = i(), u = `${s || e.activeId}`;
    if (e.sessions = e.sessions.filter((c) => `${c.id}` !== u), `${e.activeId}` === u) {
      const c = S(e)[0];
      e.activeId = c ? c.id : "";
    }
    if (!e.sessions.length) {
      const c = h(d(), A());
      e.sessions.push(c), e.activeId = c.id;
    }
    return l(e), y();
  }
  return {
    load: y,
    save: E,
    clear: b,
    enabled: n,
    listSessions: k,
    activeSessionId: M,
    newSession: _,
    switchSession: N,
    deleteSession: R
  };
}
export {
  Ke as CREDENTIALS_CHANGED_EVENT,
  ke as MAX_QUOTE_CHARS,
  U as MAX_SESSIONS,
  qe as MISSING_MODEL_API_KEY_MESSAGE,
  ee as answerDocumentIds,
  te as armReaderAiClickShield,
  re as buildMarkdownImageApiUrl,
  ae as buildPagePreviewUrl,
  Me as buildQuoteBlock,
  De as buildScopedQuestion,
  ne as clearReaderAiNavigationLock,
  Oe as clearStoredConversationId,
  _e as clearThreadBranchSnapshot,
  se as clipSnippet,
  ze as conversationStorageKey,
  V as createReaderAiHistoryStore,
  Ue as createReaderAskAnswerer,
  Ne as createReaderMarkdownAnswerer,
  ie as decorateCitationMarkdown,
  X as deriveSessionTitle,
  oe as findCitationForAnswerImage,
  je as hasModelApiKey,
  ce as hydrateProtectedImages,
  de as injectCitationMarkers,
  ue as installReaderWindowOpenGuard,
  le as isAgenticCitation,
  fe as isReaderAiNavigationLocked,
  Xe as loadStoredConversationId,
  Re as loadThreadBranchSnapshot,
  Ae as lockReaderAiNavigation,
  Te as mergeQuoteIntoDraft,
  me as mountAnswerHtml,
  pe as neutralizeMarkdownAnchors,
  ge as normalizeAiCitations,
  Qe as notifyCredentialsChanged,
  W as peekFinalAnswerHtmlCache,
  he as pickCitationsForAnswer,
  H as protectNumericCitations,
  We as readSettingsModelApiKey,
  ye as renderCitationFooter,
  J as renderFinalAnswerHtml,
  Q as renderStreamingPreviewHtml,
  ve as resetAnswerEnhanceAdapters,
  Je as resetReaderAiConfigAdapters,
  $e as resolveAnswerImageUrl,
  Ie as resolveCitationPageIdx,
  Se as resolveCitationPageNumber,
  Ve as resolveReaderAiConfig,
  F as restoreNumericCitations,
  we as revokeHydratedImageUrls,
  xe as sanitizeAssistantAnswer,
  Be as saveStoredConversationId,
  He as saveThreadBranchSnapshot,
  Ce as setAnswerEnhanceAdapters,
  Ye as setReaderAiConfigAdapters,
  Ee as shouldIgnoreReaderAiNavEvent,
  S as summarizeSessions,
  Fe as threadBranchStorageKey,
  B as trimSessions,
  Le as visiblePathFromSnapshot
};
//# sourceMappingURL=ai.js.map
