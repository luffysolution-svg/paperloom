import { e as x, m as A, a as k, b as I, n as w, p as $, r as T, c as b, d as y, s as z, w as B } from "../markdown-math-XkF5urpn.js";
import { n as P } from "../block-key-BTxcG28S.js";
const h = Object.freeze({
  sentence: { label: "句子" },
  data: { label: "数据" },
  figure: { label: "图表" }
});
function n(e, o) {
  return Array.isArray(e) ? [...e].sort((t, a) => {
    const s = o(t) - o(a);
    if (s !== 0)
      return s;
    const u = `${(t == null ? void 0 : t.createdAt) || ""}`, r = `${(a == null ? void 0 : a.createdAt) || ""}`;
    return u < r ? -1 : u > r ? 1 : 0;
  }) : [];
}
function d(e, o) {
  const t = [];
  for (const a of n(e, o)) {
    const s = o(a), u = t[t.length - 1];
    u && u.pageIdx === s ? u.items.push(a) : t.push({ pageIdx: s, items: [a] });
  }
  return t;
}
const l = (e) => Number((e == null ? void 0 : e.pageIdx) ?? 0);
function f(e) {
  return n(e, l);
}
function p(e) {
  return d(e, l);
}
function c(e) {
  return `${e || ""}`.split(`
`).map((o) => `> ${o}`);
}
function g({
  title: e = "",
  annotations: o = []
} = {}) {
  const t = e ? `# ${e} 批注` : "# 批注", a = p(o);
  if (a.length === 0)
    return `${t}

(暂无批注)
`;
  const s = [t, ""];
  for (const u of a) {
    s.push(`## 第 ${u.pageIdx + 1} 页`, "");
    for (const r of u.items)
      s.push(...c(r == null ? void 0 : r.quoteText)), r != null && r.translatedQuoteText && s.push(...c(`—— ${r.translatedQuoteText}`)), r != null && r.note && s.push("", `笔记:${r.note}`), s.push("");
  }
  return s.join(`
`);
}
function i(e) {
  return {
    pageIdx: e == null ? void 0 : e.pageIdx,
    blockId: e == null ? void 0 : e.blockId
  };
}
export {
  h as ANNOTATION_KIND_META,
  i as annotationAnchor,
  g as buildAnnotationsMarkdown,
  x as extractMarkdownMath,
  p as groupAnnotationsByPage,
  d as groupByPageAndCreatedAt,
  A as materializeMarkdownMathFallbackHtml,
  k as materializeMarkdownMathHtml,
  I as mathFailureStats,
  P as normalizeBlockKey,
  w as normalizeMathTex,
  $ as parseMarkdownWithMath,
  T as renderMathFallbackHtml,
  b as resetMarkdownMathEngineLoader,
  y as revealProtectedTokens,
  z as setMarkdownMathEngineLoader,
  f as sortAnnotations,
  n as sortByPageAndCreatedAt,
  B as wrapMathSvgHtml
};
//# sourceMappingURL=content.js.map
