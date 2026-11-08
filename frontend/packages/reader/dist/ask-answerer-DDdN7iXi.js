import { r as G } from "./config-DT8amRQ9.js";
const p = "retainpdf.reader.ai.conversation.v1:";
function T(e = {}) {
  const n = `${e.jobId || ""}`.trim(), r = `${e.documentId || ""}`.trim();
  return r ? `${p}doc:${r}` : n ? `${p}job:${n}` : `${p}anonymous`;
}
function E(e) {
  const n = `${e.jobId || ""}`.trim();
  return n ? `${p}job:${n}` : "";
}
function _() {
  try {
    return typeof globalThis.localStorage > "u" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
function K(e = {}) {
  const n = _();
  if (!n)
    return "";
  try {
    const r = T(e), i = `${n.getItem(r) || ""}`.trim();
    if (i) return i;
    const o = `${e.documentId || ""}`.trim() ? E(e) : "", u = o ? `${n.getItem(o) || ""}`.trim() : "";
    return u && n.setItem(r, u), u;
  } catch {
    return "";
  }
}
function J(e, n) {
  const r = `${n || ""}`.trim(), i = _();
  if (!(!i || !r))
    try {
      i.setItem(T(e), r);
    } catch {
    }
}
function h(e = {}) {
  const n = _();
  if (n)
    try {
      n.removeItem(T(e));
      const r = `${e.documentId || ""}`.trim() ? E(e) : "";
      r && n.removeItem(r);
    } catch {
    }
}
const O = "/api/v1";
function j() {
  throw new Error("ask not injected (provide ask impl via createReaderAskAnswerer)");
}
function z() {
  return Promise.resolve(null);
}
const H = 240;
function V(e = "", n = H) {
  const r = `${e}`.replace(/\s+/g, " ").trim();
  return r.length <= n ? r : `${r.slice(0, n).trim()}…`;
}
function W({ question: e = "", scope: n = "document", context: r = null, resolveQuote: i = null } = {}) {
  const o = `${e}`.trim();
  if (!o)
    return "";
  if (n === "selection") {
    const u = typeof i == "function" && r ? i(r) : null, s = V((u == null ? void 0 : u.quoteText) || (r == null ? void 0 : r.quoteText) || "");
    if (s) {
      const c = (r == null ? void 0 : r.pane) === "translated" ? "译文" : "原文", f = (r == null ? void 0 : r.kind) === "formula" ? "公式" : (r == null ? void 0 : r.kind) === "table" ? "表格" : (r == null ? void 0 : r.kind) === "figure" ? "图片" : (r == null ? void 0 : r.kind) === "text" ? "文字" : "片段";
      return `（针对选中的${c}${f}：「${s}」）${o}`;
    }
    if (r != null && r.page)
      return `（针对第 ${Number(r.page)} 页的选区内容）${o}`;
  }
  return n === "page" && (r != null && r.page) ? `（当前第 ${Number(r.page)} 页）${o}` : o;
}
function Z({
  jobId: e = "",
  documentId: n = "",
  apiPrefix: r = O,
  ask: i = j,
  documentByJobId: o = z,
  resolveQuote: u = null,
  // 前端凭据设置里的模型 API Key(与翻译流程同源),按请求随问答一起传给后端
  llmConfig: s = G
} = {}) {
  const c = `${n || ""}`.trim();
  let f = null, a = K({
    jobId: e,
    documentId: c
  });
  function b() {
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
  function v(t, l = "") {
    const $ = `${t || ""}`.trim();
    $ && (a = $, J({ jobId: e, documentId: l }, $));
  }
  async function R({
    question: t = "",
    scope: l = "document",
    context: $ = null,
    onToolEvent: S = null,
    onTurnEvent: D = null,
    onProgressEvent: P = null,
    onAgentOperationEvent: B = null,
    onAgentConfirmationRequiredEvent: L = null,
    onAgentSessionEvent: g = null,
    onAnswerDelta: M = null,
    onCompress: U = null,
    parentId: q = "",
    regenerate: F = !1,
    userMessageId: N = "",
    assistantMessageId: Q = "",
    assistantMode: X = "reading",
    /** 取消信号：中止 SSE；aborted 后不回写会话粘性（防旧流污染新会话） */
    signal: d = null
  } = {}) {
    const A = W({ context: $, question: t, resolveQuote: u, scope: l });
    if (!A)
      throw new Error("请输入问题。");
    const w = typeof s == "function" ? s() : s || {}, C = `${w.apiKey || ""}`.trim(), m = await b();
    if (!m && `${e || ""}`.trim())
      throw new Error("无法关联当前文档，暂不能做整本问答。请确认任务已绑定文档后重试。");
    a || (a = K({ jobId: e, documentId: m }));
    const y = await i({
      question: A,
      documentId: m,
      // document_id is the durable knowledge/operation identity. A job is an
      // immutable pipeline attempt and may be a retry/render child without
      // its own document.v1 or Markdown. Once the document is known, letting
      // the backend resolve its authoritative readable artifacts prevents the
      // Reader from pinning AI to a transient job directory.
      jobId: m ? "" : `${e || ""}`.trim(),
      conversationId: a,
      parentId: `${q || ""}`.trim(),
      regenerate: !!F,
      userMessageId: `${N || ""}`.trim(),
      assistantMessageId: `${Q || ""}`.trim(),
      assistantMode: X,
      onToolEvent: S,
      onTurnEvent: D,
      onProgressEvent: P,
      onAgentOperationEvent: B,
      onAgentConfirmationRequiredEvent: L,
      onAgentSessionEvent: (I) => {
        !(d != null && d.aborted) && (I != null && I.conversation_id) && v(I.conversation_id, m), g == null || g(I);
      },
      onAnswerDelta: M,
      onCompress: U,
      llmApiKey: C,
      ...C ? {
        llmBaseUrl: `${w.baseUrl || ""}`.trim(),
        llmModel: `${w.model || ""}`.trim()
      } : {},
      signal: d
    }), k = `${(y == null ? void 0 : y.conversationId) || ""}`.trim();
    return k && !(d != null && d.aborted) && v(k, m), {
      ...y,
      conversationId: k || a,
      scope: l
    };
  }
  return {
    answer: R,
    getConversationId: () => a,
    setConversationId: (t, l = "") => {
      v(t, l);
    },
    clearConversationId: (t = "") => {
      a = "", h({ jobId: e, documentId: t }), t && h({ documentId: t }), h({ jobId: e });
    },
    getDocumentId: () => b(),
    ensureLoaded: async () => !!await b()
  };
}
export {
  T as a,
  W as b,
  h as c,
  Z as d,
  K as l,
  J as s
};
//# sourceMappingURL=ask-answerer-DDdN7iXi.js.map
