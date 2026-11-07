import { C as ee, M as te, d as re, e as ae, f as ne, g as se, c as ie, h as oe, j as ce, k as de, l as ue, m as le, n as fe, i as Ae, o as me, p as ge, q as pe, t as he, u as ye, v as ve, w as $e, x as Ie, y as Se, z as we, r as Ce, A as Ee, B as ke, D as Me, E as _e, b as be, F as Ne, a as Re, s as Te, G as He } from "../answer-enhance-DShVYmyb.js";
import { M as Fe, b as Le, c as De, a as Pe, l as Oe, m as ze, s as Be, d as Ge, t as Ue, v as Xe } from "../answer-quote-CYnPOEkM.js";
import { b as qe, c as je, a as Qe, d as We, l as Je, s as Ve } from "../ask-answerer-CU7UxZb4.js";
import { Marked as T } from "marked";
import { p as H } from "../markdown-math-XkF5urpn.js";
const w = "CITE_", C = "";
function v(t) {
  return `${t}`.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function x(t) {
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
const D = /^\s*(?:javascript|vbscript|data:text\/html)/i;
function P(t) {
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
      if ((i === "href" || i === "src" || i === "xlink:href") && D.test(d.value)) {
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
  const { text: n, refs: o } = x(a), d = await H(n, (l) => {
    const g = String($.parse(l, { async: !1 }));
    return P(g);
  }), i = F(d, o);
  return z(a, i), i;
}
const B = 20, I = 18;
function G(t = {}) {
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
    title: G(r),
    updatedAt: Number(r == null ? void 0 : r.updatedAt) || 0,
    messageCount: Array.isArray(r == null ? void 0 : r.messages) ? r.messages.length : 0,
    active: `${(r == null ? void 0 : r.id) || ""}` == `${a}`
  })).filter((r) => r.id).sort((r, n) => n.updatedAt - r.updatedAt);
}
function U({ sessions: t = [], activeId: a = "" } = {}, r = B) {
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
const X = "retainpdf-ai-chat-v1:";
function K(t) {
  return `${X}${`${t || ""}`.trim()}`;
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
      const c = e.sessions.filter((p) => p && `${p.id || ""}`.trim());
      return { activeId: c.some((p) => `${p.id}` == `${e.activeId}`) ? `${e.activeId}` : `${((u = c[0]) == null ? void 0 : u.id) || ""}`, sessions: c };
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
        const u = U(s), c = u.some((m) => `${m.id}` == `${s.activeId}`) ? s.activeId : `${((e = u[0]) == null ? void 0 : e.id) || ""}`;
        a.setItem(r, JSON.stringify({ v: 2, activeId: c, sessions: u }));
      } catch {
      }
  }
  function g(s) {
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
    const u = i(), c = g(u);
    c.messages = s.slice(-40), c.history = e.slice(-40), c.updatedAt = A(), l(u);
  }
  function k() {
    if (!n)
      return;
    const s = i(), e = g(s);
    e.messages = [], e.history = [], e.title = "", e.updatedAt = A(), l(s);
  }
  function M() {
    return n ? S(i()) : [];
  }
  function _() {
    return n ? `${i().activeId || ""}` : "";
  }
  function b() {
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
    clear: k,
    enabled: n,
    listSessions: M,
    activeSessionId: _,
    newSession: b,
    switchSession: N,
    deleteSession: R
  };
}
export {
  ee as CREDENTIALS_CHANGED_EVENT,
  Fe as MAX_QUOTE_CHARS,
  B as MAX_SESSIONS,
  te as MISSING_MODEL_API_KEY_MESSAGE,
  re as answerDocumentIds,
  ae as armReaderAiClickShield,
  ne as buildMarkdownImageApiUrl,
  se as buildPagePreviewUrl,
  Le as buildQuoteBlock,
  qe as buildScopedQuestion,
  ie as clearReaderAiNavigationLock,
  je as clearStoredConversationId,
  De as clearThreadBranchSnapshot,
  oe as clipSnippet,
  Qe as conversationStorageKey,
  V as createReaderAiHistoryStore,
  We as createReaderAskAnswerer,
  Pe as createReaderMarkdownAnswerer,
  ce as decorateCitationMarkdown,
  G as deriveSessionTitle,
  de as findCitationForAnswerImage,
  ue as hasModelApiKey,
  le as hydrateProtectedImages,
  fe as injectCitationMarkers,
  Ae as installReaderWindowOpenGuard,
  me as isAgenticCitation,
  ge as isReaderAiNavigationLocked,
  Je as loadStoredConversationId,
  Oe as loadThreadBranchSnapshot,
  pe as lockReaderAiNavigation,
  ze as mergeQuoteIntoDraft,
  he as mountAnswerHtml,
  ye as neutralizeMarkdownAnchors,
  ve as normalizeAiCitations,
  $e as notifyCredentialsChanged,
  W as peekFinalAnswerHtmlCache,
  Ie as pickCitationsForAnswer,
  x as protectNumericCitations,
  Se as readSettingsModelApiKey,
  we as renderCitationFooter,
  J as renderFinalAnswerHtml,
  Q as renderStreamingPreviewHtml,
  Ce as resetAnswerEnhanceAdapters,
  Ee as resetReaderAiConfigAdapters,
  ke as resolveAnswerImageUrl,
  Me as resolveCitationPageIdx,
  _e as resolveCitationPageNumber,
  be as resolveReaderAiConfig,
  F as restoreNumericCitations,
  Ne as revokeHydratedImageUrls,
  Be as sanitizeAssistantAnswer,
  Ve as saveStoredConversationId,
  Ge as saveThreadBranchSnapshot,
  Re as setAnswerEnhanceAdapters,
  Te as setReaderAiConfigAdapters,
  He as shouldIgnoreReaderAiNavEvent,
  S as summarizeSessions,
  Ue as threadBranchStorageKey,
  U as trimSessions,
  Xe as visiblePathFromSnapshot
};
//# sourceMappingURL=ai.js.map
