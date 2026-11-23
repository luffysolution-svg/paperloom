import { e as z, m as E, a as I, b as U, n as B, p as F, r as H, c as L, d as v, s as A, w as P } from "../markdown-math-DN_X3M3x.js";
import { n as g } from "../reader-regions-B6o2DsPy.js";
import { a as C } from "../reader-regions-B6o2DsPy.js";
import { b as M, r as w } from "../reader-blocks-CX-ULKQa.js";
function $(a, n) {
  const r = n.replace(/^\s*\(\s*|\s*\)\s*$/g, "").trim();
  if (!r || /\\tag\*?\s*\{/.test(a)) return a;
  const e = a.trimEnd();
  return e.endsWith("$$") && e.length > 4 ? `${e.slice(0, -2).trimEnd()} \\tag{${r}}$$` : `${e} ${n.trim()}`;
}
function k() {
  const a = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Set();
  return (r) => {
    const e = a.get(r);
    if (e) return e;
    let o = r;
    try {
      o = new URL(r, "http://local.invalid/").pathname;
    } catch {
    }
    const i = (() => {
      try {
        return decodeURIComponent(o);
      } catch {
        return o;
      }
    })(), c = ((i.includes("/images/") ? i.slice(i.lastIndexOf("/images/") + 8) : "") || i.split("/").filter(Boolean).pop() || "image").replace(/^\/+/, "").split("/").map((t) => t.replace(/[^\w.\-一-鿿]+/g, "_") || "_").join("/");
    let l = `images/${c}`;
    for (let t = 2; n.has(l); t += 1) l = `images/${c.replace(/(\.[^./]+)?$/, `-${t}$1`)}`;
    return n.add(l), a.set(r, l), l;
  };
}
function b(a, n, r) {
  let e = a;
  for (const o of n)
    o && e.includes(o) && (e = e.split(o).join(r(o)));
  return e;
}
function p(a, n, r) {
  if (a.kind === "figure")
    return a.assetUrls.map((o) => `![](${r(o)})`).join(`

`);
  let e = b(w(a, n), a.assetUrls, r);
  return a.kind === "formula" && a.label && (e = $(e, a.label)), e;
}
function T(a) {
  const n = M(g(a));
  if (!n || n.length === 0) return null;
  const r = k(), e = /* @__PURE__ */ new Map(), o = (t) => {
    const s = r(t);
    return e.set(t, s), s;
  }, i = [], u = [], h = [];
  for (const t of n) {
    const s = p(t, "source", o), d = t.hasTranslation ? p(t, "translated", o) : s;
    s && i.push(s), d && u.push(d);
    const f = /\s+\^ref-(?:author-)?[\d-]+\s*$/;
    let m = f.test(s) ? d.replace(f, "") : d;
    /^#{1,6} /.test(s) && (m = t.kind === "heading" ? m.replace(/^#{1,6}\s+/, "") : m.replace(/^#{1,6} [^\n]*\n\n/, "")), s && h.push(t.hasTranslation && d && d !== s ? `${s}

${m}` : s);
  }
  const c = (t) => `${t.join(`

`).trim()}
`, l = Array.from(e, ([t, s]) => ({ url: t, path: s }));
  return {
    source: c(i),
    translated: c(u),
    bilingual: c(h),
    hasTranslation: n.some((t) => t.hasTranslation),
    assets: l
  };
}
export {
  T as buildReaderMarkdownExport,
  z as extractMarkdownMath,
  E as materializeMarkdownMathFallbackHtml,
  I as materializeMarkdownMathHtml,
  U as mathFailureStats,
  C as normalizeBlockKey,
  B as normalizeMathTex,
  F as parseMarkdownWithMath,
  H as renderMathFallbackHtml,
  L as resetMarkdownMathEngineLoader,
  v as revealProtectedTokens,
  A as setMarkdownMathEngineLoader,
  P as wrapMathSvgHtml
};
//# sourceMappingURL=content.js.map
