import { e as y, m as z, a as E, b as I, n as U, p as B, r as F, c as H, d as L, s as v, w as P } from "../markdown-math-DN_X3M3x.js";
import { n as p } from "../reader-regions-B6o2DsPy.js";
import { a as A } from "../reader-regions-B6o2DsPy.js";
import { b as g, r as M } from "../reader-blocks-CX-ULKQa.js";
function w(a, n) {
  const s = n.replace(/^\s*\(\s*|\s*\)\s*$/g, "").trim();
  if (!s || /\\tag\*?\s*\{/.test(a)) return a;
  const e = a.trimEnd();
  return e.endsWith("$$") && e.length > 4 ? `${e.slice(0, -2).trimEnd()} \\tag{${s}}$$` : `${e} ${n.trim()}`;
}
function $() {
  const a = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Set();
  return (s) => {
    const e = a.get(s);
    if (e) return e;
    let o = s;
    try {
      o = new URL(s, "http://local.invalid/").pathname;
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
    return n.add(l), a.set(s, l), l;
  };
}
function k(a, n, s) {
  let e = a;
  for (const o of n)
    o && e.includes(o) && (e = e.split(o).join(s(o)));
  return e;
}
function h(a, n, s) {
  if (a.kind === "figure")
    return a.assetUrls.map((o) => `![](${s(o)})`).join(`

`);
  let e = k(M(a, n), a.assetUrls, s);
  return a.kind === "formula" && a.label && (e = w(e, a.label)), e;
}
function R(a) {
  const n = g(p(a));
  if (!n || n.length === 0) return null;
  const s = $(), e = /* @__PURE__ */ new Map(), o = (t) => {
    const r = s(t);
    return e.set(t, r), r;
  }, i = [], u = [], f = [];
  for (const t of n) {
    const r = h(t, "source", o), d = t.hasTranslation ? h(t, "translated", o) : r;
    r && i.push(r), d && u.push(d);
    let m = /\s\^ref-[\d-]+\s*$/.test(r) ? d.replace(/\s+\^ref-[\d-]+\s*$/, "") : d;
    /^#{1,6} /.test(r) && (m = t.kind === "heading" ? m.replace(/^#{1,6}\s+/, "") : m.replace(/^#{1,6} [^\n]*\n\n/, "")), r && f.push(t.hasTranslation && d && d !== r ? `${r}

${m}` : r);
  }
  const c = (t) => `${t.join(`

`).trim()}
`, l = Array.from(e, ([t, r]) => ({ url: t, path: r }));
  return {
    source: c(i),
    translated: c(u),
    bilingual: c(f),
    hasTranslation: n.some((t) => t.hasTranslation),
    assets: l
  };
}
export {
  R as buildReaderMarkdownExport,
  y as extractMarkdownMath,
  z as materializeMarkdownMathFallbackHtml,
  E as materializeMarkdownMathHtml,
  I as mathFailureStats,
  A as normalizeBlockKey,
  U as normalizeMathTex,
  B as parseMarkdownWithMath,
  F as renderMathFallbackHtml,
  H as resetMarkdownMathEngineLoader,
  L as revealProtectedTokens,
  v as setMarkdownMathEngineLoader,
  P as wrapMathSvgHtml
};
//# sourceMappingURL=content.js.map
