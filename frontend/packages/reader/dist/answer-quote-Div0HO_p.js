import { n as R } from "./markdown-payload-kK3ewW_I.js";
import { l as h } from "./ask-answerer-GNQdzitl.js";
function T(t = null) {
  return R(t).content.trim();
}
function b(t = "") {
  return `${t}`.replace(/```[\s\S]*?```/g, " ").replace(/!\[[^\]]*]\([^)]+\)/g, " ").replace(/\[[^\]]+]\([^)]+\)/g, " ").replace(/[#>*_`~|[\]()]/g, " ").replace(/\s+/g, " ").trim();
}
function B(t = "") {
  const r = b(t).toLowerCase(), n = r.match(/[a-z0-9][a-z0-9-]{1,}/g) || [], e = r.match(/[\u4e00-\u9fff]{2,}/g) || [];
  return [.../* @__PURE__ */ new Set([...n, ...e])].slice(0, 40);
}
function O(t = "") {
  const r = [];
  let n = "文档开头", e = [];
  for (const o of `${t}`.split(/\r?\n/)) {
    const i = o.match(/^(#{1,4})\s+(.+?)\s*$/);
    i && e.join(`
`).trim() && (r.push({
      title: n,
      text: e.join(`
`).trim()
    }), e = []), i && (n = i[2].trim()), e.push(o);
  }
  return e.join(`
`).trim() && r.push({
    title: n,
    text: e.join(`
`).trim()
  }), r;
}
function v(t, r) {
  const n = b(`${t.title}
${t.text}`).toLowerCase();
  return r.reduce((e, o) => e + (n.includes(o) ? 1 : 0), 0);
}
function M(t = "", r = 420) {
  const n = b(t);
  return n.length <= r ? n : `${n.slice(0, r).trim()}...`;
}
function w(t, r) {
  return r.length ? [
    "我先基于当前 Markdown 找到这些相关片段：",
    ...r.map((e, o) => `${o + 1}. ${e.title}：${M(e.text)}`),
    "",
    `问题：${t}`
  ].join(`
`) : "我没有在当前 Markdown 里找到足够相关的片段。可以换一个更具体的问题，或确认这个任务已经生成 Markdown。";
}
function Q({
  loadMarkdownPayload: t,
  maxSections: r = 3
} = {}) {
  let n = null, e = "";
  async function o(c) {
    return e || (n = await (t == null ? void 0 : t(c)), e = T(n), e);
  }
  async function i({ jobId: c = "", question: s = "", scope: u = "document", context: d = null } = {}) {
    const m = await o(c);
    if (!m)
      throw new Error("当前任务还没有可用于问答的 Markdown。");
    const C = B(`${s} ${d != null && d.page ? `第 ${d.page} 页` : ""}`), S = O(m).map((a) => ({
      ...a,
      score: v(a, C)
    })).sort((a, p) => p.score - a.score).filter((a, p) => a.score > 0 || p < r).slice(0, r);
    return {
      answer: w(s, S),
      citations: S.map((a) => a.title),
      scope: u
    };
  }
  return {
    answer: i,
    ensureLoaded: o
  };
}
const L = /\[\s*(p\d+[-_]b\d+)\s*\]/gi, F = new RegExp("(?<![\\w/])(p\\d+[-_]b\\d+)(?![\\w/])", "gi");
function $(t) {
  return `${t || ""}`.trim().toLowerCase().replace(/_/g, "-");
}
const D = /```[\s\S]*?(?:```|$)|`[^`\n]+`/g, j = "CODE_", _ = "";
function G(t, r = []) {
  let n = `${t || ""}`;
  if (!n) return "";
  const e = [];
  n = n.replace(D, (i) => {
    const c = `${j}${e.length}${_}`;
    return e.push(i), c;
  });
  const o = /* @__PURE__ */ new Map();
  for (const i of r) {
    const c = $(`${i.block_id || ""}`);
    if (!c) continue;
    const s = `${i.ref ?? ""}`.trim();
    s && o.set(c, s);
  }
  return n = n.replace(L, (i, c) => {
    const s = o.get($(c));
    return s ? `[${s}]` : "";
  }), n = n.replace(F, (i, c) => {
    const s = o.get($(c));
    return s ? `[${s}]` : "";
  }), n = n.replace(/\bblock_id\s*[=:：]\s*\S+/gi, ""), n = n.replace(/\bpage_idx\s*[=:：]\s*\d+/gi, ""), n = n.replace(/[ \t]{2,}/g, " "), n = n.replace(/ *\n/g, `
`), n = n.trim(), e.length && (n = n.replace(
    new RegExp(`${j}(\\d+)${_}`, "g"),
    (i, c) => e[Number(c)] ?? ""
  )), n;
}
const k = "retainpdf.reader.ai.thread-branch.v1:";
function g(t) {
  return typeof t == "string" ? { jobId: `${t || ""}`.trim(), documentId: "" } : {
    jobId: `${(t == null ? void 0 : t.jobId) || ""}`.trim(),
    documentId: `${(t == null ? void 0 : t.documentId) || ""}`.trim()
  };
}
function l(t, r = "") {
  const { jobId: n, documentId: e } = g(t), o = e ? "doc" : "job", i = e || n || "anonymous", c = `${r || ""}`.trim();
  return c ? `${k}${o}:${i}:conv:${c}` : `${k}${o}:${i}`;
}
function y() {
  try {
    return typeof globalThis.localStorage > "u" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
function f(t) {
  return !!t && typeof t == "object" && !Array.isArray(t);
}
function x(t) {
  if (!f(t) || typeof t.type != "string") return;
  const r = typeof t.reason == "string" ? t.reason : void 0;
  return r ? { type: t.type, reason: r } : { type: t.type };
}
function N(t) {
  if (!f(t)) return null;
  const r = `${t.id || ""}`.trim(), n = t.role === "user" || t.role === "assistant" ? t.role : null;
  if (!r || !n) return null;
  const e = Array.isArray(t.citations) ? t.citations : void 0, o = typeof t.progress == "string" ? t.progress : void 0;
  let i = x(t.status);
  return (i == null ? void 0 : i.type) === "running" && (i = { type: "incomplete", reason: "cancelled" }), {
    id: r,
    role: n,
    content: typeof t.content == "string" ? t.content : "",
    ...o ? { progress: o } : {},
    ...e != null && e.length ? { citations: e } : {},
    ...i ? { status: i } : {}
  };
}
function X(t) {
  var i;
  if (!f(t) || t.version !== 1 || !Array.isArray(t.items))
    return null;
  const r = [];
  for (const c of t.items) {
    if (!f(c)) continue;
    const s = N(c.message);
    if (!s) continue;
    const u = c.parentId === null || c.parentId === void 0 ? null : `${c.parentId}`.trim() || null;
    r.push({ parentId: u, message: s });
  }
  if (!r.length) return null;
  const n = t.headId, e = n == null ? ((i = r[r.length - 1]) == null ? void 0 : i.message.id) ?? null : `${n}`.trim() || null, o = `${t.conversationId || ""}`.trim();
  return { version: 1, headId: e, items: r, ...o ? { conversationId: o } : {} };
}
function I(t, r) {
  if (!t) return null;
  try {
    const n = X(JSON.parse(t));
    if (!n) return null;
    const e = `${n.conversationId || ""}`.trim();
    return e && r && e !== r ? null : n;
  } catch {
    return null;
  }
}
function A(t, r, n, e) {
  const o = {
    version: 1,
    headId: e.headId,
    items: e.items,
    ...n ? { conversationId: n } : {}
  };
  t.setItem(l(r, n), JSON.stringify(o));
}
function E(t, r, n, e, o) {
  try {
    const i = l(r, n);
    A(t, r, n, e), o && o !== i && t.removeItem(o);
  } catch {
  }
}
function U(t, r = "") {
  const n = y();
  if (!n) return null;
  try {
    const e = g(t), o = n.getItem(l(e, r)), i = I(o, r);
    if (i) return i;
    if (e.documentId && e.jobId) {
      const s = { jobId: e.jobId }, u = I(
        n.getItem(l(s, r)),
        r
      );
      if (u)
        return E(
          n,
          e,
          r,
          u,
          l(s, r)
        ), u;
    }
    if (!r) return null;
    const c = e.documentId ? [e, ...e.jobId ? [{ jobId: e.jobId }] : []] : [e];
    for (const s of c) {
      const u = I(
        n.getItem(l(s)),
        r
      );
      if (!u) continue;
      const d = `${u.conversationId || ""}`.trim(), m = e.documentId ? h({ documentId: e.documentId }) || h({ jobId: e.jobId }) : h({ jobId: e.jobId });
      if (d ? d === r : m === r)
        return e.documentId && E(
          n,
          e,
          r,
          u,
          l(s)
        ), u;
    }
    return null;
  } catch {
    return null;
  }
}
function q(t, r, n = "") {
  const e = y();
  if (!e) return;
  const o = g(t);
  if (!(!o.documentId && !o.jobId || !r.items.length))
    try {
      A(e, o, n, r);
    } catch {
    }
}
function H(t, r = "") {
  const n = y();
  if (n)
    try {
      const e = g(t);
      n.removeItem(l(e, r)), e.documentId && e.jobId && n.removeItem(l({ jobId: e.jobId }, r)), r || (n.removeItem(l(e)), e.documentId && e.jobId && n.removeItem(l({ jobId: e.jobId })));
    } catch {
    }
}
function P(t) {
  const r = new Map(t.items.map((c) => [c.message.id, c])), n = t.headId && r.get(t.headId) || t.items[t.items.length - 1];
  if (!n) return [];
  const e = [];
  let o = n;
  const i = /* @__PURE__ */ new Set();
  for (; o && !i.has(o.message.id); )
    i.add(o.message.id), e.push(o.message), o = o.parentId ? r.get(o.parentId) : void 0;
  return e.reverse();
}
const z = 600;
function V(t) {
  const r = `${t || ""}`.replace(/\r\n?/g, `
`).trim();
  return r ? `${(r.length > z ? `${r.slice(0, z).trimEnd()}…（已截断）` : r).split(`
`).map((o) => o.trim() ? `> ${o}` : ">").join(`
`)}

` : "";
}
function W(t, r) {
  const n = `${r || ""}`;
  if (!n) return `${t || ""}`;
  const e = `${t || ""}`.trimStart();
  return e ? `${n}${e}` : n;
}
export {
  z as M,
  Q as a,
  V as b,
  H as c,
  q as d,
  U as l,
  W as m,
  G as s,
  l as t,
  P as v
};
//# sourceMappingURL=answer-quote-Div0HO_p.js.map
