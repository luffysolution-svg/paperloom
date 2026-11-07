import { b as j } from "./answer-enhance-DShVYmyb.js";
const b = "retainpdf.reader.ai.conversation.v1:";
function T(e = {}) {
  const n = `${e.jobId || ""}`.trim(), r = `${e.documentId || ""}`.trim();
  return r ? `${b}doc:${r}` : n ? `${b}job:${n}` : `${b}anonymous`;
}
function C(e) {
  const n = `${e.jobId || ""}`.trim();
  return n ? `${b}job:${n}` : "";
}
function A() {
  try {
    return typeof globalThis.localStorage > "u" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
function P(e = {}) {
  const n = A();
  if (!n)
    return "";
  try {
    const r = T(e), i = `${n.getItem(r) || ""}`.trim();
    if (i) return i;
    const o = `${e.documentId || ""}`.trim() ? C(e) : "", u = o ? `${n.getItem(o) || ""}`.trim() : "";
    return u && n.setItem(r, u), u;
  } catch {
    return "";
  }
}
function z(e, n) {
  const r = `${n || ""}`.trim(), i = A();
  if (!(!i || !r))
    try {
      i.setItem(T(e), r);
    } catch {
    }
}
function h(e = {}) {
  const n = A();
  if (n)
    try {
      n.removeItem(T(e));
      const r = `${e.documentId || ""}`.trim() ? C(e) : "";
      r && n.removeItem(r);
    } catch {
    }
}
const H = "/api/v1";
function V() {
  throw new Error("ask not injected (provide ask impl via createReaderAskAnswerer)");
}
function W() {
  return Promise.resolve(null);
}
const Y = 240;
function Z(e = "", n = Y) {
  const r = `${e}`.replace(/\s+/g, " ").trim();
  return r.length <= n ? r : `${r.slice(0, n).trim()}…`;
}
function x({ question: e = "", scope: n = "document", context: r = null, resolveQuote: i = null } = {}) {
  const o = `${e}`.trim();
  if (!o)
    return "";
  if (n === "selection") {
    const u = typeof i == "function" && r ? i(r) : null, s = Z((u == null ? void 0 : u.quoteText) || (r == null ? void 0 : r.quoteText) || "");
    if (s) {
      const c = (r == null ? void 0 : r.pane) === "translated" ? "译文" : "原文", f = (r == null ? void 0 : r.kind) === "formula" ? "公式" : (r == null ? void 0 : r.kind) === "table" ? "表格" : (r == null ? void 0 : r.kind) === "figure" ? "图片" : (r == null ? void 0 : r.kind) === "text" ? "文字" : "片段";
      return `（针对选中的${c}${f}：「${s}」）${o}`;
    }
    if (r != null && r.page)
      return `（针对第 ${Number(r.page)} 页的选区内容）${o}`;
  }
  return n === "page" && (r != null && r.page) ? `（当前第 ${Number(r.page)} 页）${o}` : o;
}
function er({
  jobId: e = "",
  documentId: n = "",
  apiPrefix: r = H,
  ask: i = V,
  documentByJobId: o = W,
  resolveQuote: u = null,
  // 前端凭据设置里的模型 API Key(与翻译流程同源),按请求随问答一起传给后端
  llmConfig: s = j
} = {}) {
  const c = `${n || ""}`.trim();
  let f = null, a = P({
    jobId: e,
    documentId: c
  });
  function v() {
    return f || (f = (async () => {
      if (c) return c;
      try {
        const t = await o(r, e);
        return `${(t == null ? void 0 : t.document_id) || ""}`.trim();
      } catch {
        return "";
      }
    })()), f;
  }
  function g(t, l = "") {
    const $ = `${t || ""}`.trim();
    $ && (a = $, z({ jobId: e, documentId: l }, $));
  }
  async function K({
    question: t = "",
    scope: l = "document",
    context: $ = null,
    onToolEvent: E = null,
    onTurnEvent: R = null,
    onProgressEvent: S = null,
    onAgentOperationEvent: D = null,
    onAgentConfirmationRequiredEvent: B = null,
    onAgentSessionEvent: w = null,
    onAnswerDelta: L = null,
    onCompress: M = null,
    parentId: U = "",
    regenerate: q = !1,
    userMessageId: F = "",
    assistantMessageId: N = "",
    assistantMode: Q = "reading",
    connectionId: X,
    connectionModel: G,
    connectionOptions: J,
    /** 取消信号：中止 SSE；aborted 后不回写会话粘性（防旧流污染新会话） */
    signal: d = null
  } = {}) {
    const _ = x({ context: $, question: t, resolveQuote: u, scope: l });
    if (!_)
      throw new Error("请输入问题。");
    const I = typeof s == "function" ? s() : s || {}, O = `${I.apiKey || ""}`.trim(), m = await v();
    if (!m && `${e || ""}`.trim())
      throw new Error("无法关联当前文档，暂不能做整本问答。请确认任务已绑定文档后重试。");
    a || (a = P({ jobId: e, documentId: m }));
    const p = await i({
      question: _,
      documentId: m,
      // document_id is the durable knowledge/operation identity. A job is an
      // immutable pipeline attempt and may be a retry/render child without
      // its own document.v1 or Markdown. Once the document is known, letting
      // the backend resolve its authoritative readable artifacts prevents the
      // Reader from pinning AI to a transient job directory.
      jobId: m ? "" : `${e || ""}`.trim(),
      conversationId: a,
      parentId: `${U || ""}`.trim(),
      regenerate: !!q,
      userMessageId: `${F || ""}`.trim(),
      assistantMessageId: `${N || ""}`.trim(),
      assistantMode: Q,
      connectionId: X,
      connectionModel: G,
      connectionOptions: J,
      onToolEvent: E,
      onTurnEvent: R,
      onProgressEvent: S,
      onAgentOperationEvent: D,
      onAgentConfirmationRequiredEvent: B,
      onAgentSessionEvent: (y) => {
        !(d != null && d.aborted) && (y != null && y.conversation_id) && g(y.conversation_id, m), w == null || w(y);
      },
      onAnswerDelta: L,
      onCompress: M,
      llmApiKey: O,
      llmBaseUrl: `${I.baseUrl || ""}`.trim(),
      llmModel: `${I.model || ""}`.trim(),
      ...I.apiProtocol ? { llmApiProtocol: I.apiProtocol } : {},
      signal: d
    }), k = `${(p == null ? void 0 : p.conversationId) || ""}`.trim();
    return k && !(d != null && d.aborted) && g(k, m), {
      ...p,
      conversationId: k || a,
      scope: l
    };
  }
  return {
    answer: K,
    getConversationId: () => a,
    setConversationId: (t, l = "") => {
      g(t, l);
    },
    clearConversationId: (t = "") => {
      a = "", h({ jobId: e, documentId: t }), t && h({ documentId: t }), h({ jobId: e });
    },
    getDocumentId: () => v(),
    ensureLoaded: async () => !!await v()
  };
}
export {
  T as a,
  x as b,
  h as c,
  er as d,
  P as l,
  z as s
};
//# sourceMappingURL=ask-answerer-CU7UxZb4.js.map
