import { n as se } from "../block-key-BTxcG28S.js";
const M = "RP_MATH_", T = "";
let u = null, f = null;
function W(e) {
  f = e, u = null;
}
function Y() {
  f = null, u = null;
}
function P(e) {
  return `${e}`.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function H(e) {
  return `${M}${e}${T}`;
}
const j = /[0-9A-Za-z\\{}_^()\[\]|+\-=,.:;'~*/<>!\u00b0\u00b1\u00d7\u00f7\u2212\u2202\u03b1-\u03c9\u0391-\u03a9]+/g, L = /\\[A-Za-z]+|[_^]\{/;
function S(e, n) {
  const t = new RegExp(`${M}\\d+${T}`, "g"), r = (c) => c.replace(
    j,
    (s) => L.test(s) ? n(s, !1) : s
  );
  let a = "", o = 0, l;
  for (; (l = t.exec(e)) !== null; )
    a += r(e.slice(o, l.index)) + l[0], o = l.index + l[0].length;
  return a += r(e.slice(o)), a;
}
const z = /<([futnvc]\d+-[0-9a-z]{3})\/>/g;
function F(e) {
  let n = 0;
  return { text: `${e ?? ""}`.replace(z, (r, a) => (n += 1, `[未还原 token ${a}]`)), count: n };
}
function B(e, n = {}) {
  const t = [], r = F(`${e ?? ""}`);
  r.count && (i.protectedTokens += r.count, i.protectedTokens <= 5 && console.warn(
    `[markdown-math] 译文里有 ${r.count} 个未还原的保护 token，已原样显示`
  ));
  let a = r.text;
  const o = (l, c) => {
    const s = `${l ?? ""}`.trim();
    if (!s)
      return c ? `$$${l}$$` : `$${l}$`;
    const g = H(t.length);
    return t.push({ token: g, tex: s, display: c }), g;
  };
  return a = a.replace(/\$\$([\s\S]+?)\$\$/g, (l, c) => o(c, !0)), a = a.replace(new RegExp("(?<![\\\\$])\\$(?!\\$)((?:\\\\.|[^$\\n])+?)\\$(?!\\$)", "g"), (l, c) => `${c}`.trim() ? o(c, !1) : l), n.bareLatex && (a = S(a, o)), { text: a, slots: t };
}
const D = 20, O = /data-mml-node="mtext"[^>]*fill="red"/;
function d(e, n) {
  var o;
  const t = e, r = t == null ? void 0 : t[n];
  if (r !== void 0)
    return r;
  const a = (o = t == null ? void 0 : t.default) == null ? void 0 : o[n];
  if (a !== void 0)
    return a;
  throw new Error(`mathjax-full 未导出 ${n}（CJS/ESM 互操作问题）`);
}
async function C() {
  const [e, n, t, r, a, o] = await Promise.all([
    import("mathjax-full/js/mathjax.js"),
    import("mathjax-full/js/input/tex.js"),
    import("mathjax-full/js/output/svg.js"),
    import("mathjax-full/js/adaptors/liteAdaptor.js"),
    import("mathjax-full/js/handlers/html.js"),
    import("mathjax-full/js/input/tex/AllPackages.js")
  ]), l = d(e, "mathjax"), c = d(n, "TeX"), s = d(t, "SVG"), g = d(r, "liteAdaptor"), R = d(a, "RegisterHTMLHandler"), y = d(o, "AllPackages"), $ = g();
  R($);
  const I = l.document("", {
    InputJax: new c({
      // 方案 C：宽容渲染。`unicode` 包让 Unicode 数学符号（⟨⟩、希腊字母、
      // 运算符等）尽量直接渲染，减少严格 TeX 的报错面。
      //
      // 摘掉 `html` 包。它提供 `\href`/`\class`/`\cssId`，链接原样进 SVG，而译文
      // 是模型对 OCR 文本的输出、源头是用户上传的 PDF——不是可信输入。实测
      // `$\href{javascript:alert(1)}{x}$` 渲染出 `<a href="javascript:alert(1)">`，
      // 而实时翻译叠层是 dangerouslySetInnerHTML 直接注入，中间没有任何消毒层。
      //
      // 试过在字符串层用正则摘掉危险协议，不成立：`jav&#x61;script:` 在字符串里
      // 看着无害，浏览器解析属性时会把实体解码回 `javascript:`。能被绕过的清洗器
      // 比没有更糟，它只提供虚假的安全感。所以从根上不产生这类属性。
      //
      // 代价：文档里真有 `\href` 时不再渲染成链接，退化成失败回退显示原文。渲染
      // PDF 的 mitex 本来也不支持 `\href`，两边因此一致。
      packages: y.filter((m) => m !== "html").concat("unicode")
    }),
    OutputJax: new s({ fontCache: "none" })
  });
  return {
    convert(m, N) {
      const b = I.convert(m, { display: N }), p = $.outerHTML(b);
      if (!/<svg[\s>]/i.test(p))
        throw new Error("mathjax produced no svg");
      if (/data-mjx-error|merror/i.test(p))
        throw new Error("mathjax error node");
      if (O.test(p))
        throw new Error("mathjax undefined command");
      return p;
    }
  };
}
const i = {
  engineLoad: 0,
  convert: 0,
  lastReason: "",
  /** 最近若干条失败的公式原文，用来判断是哪一类写法出了问题。 */
  samples: [],
  /** 译文里漏还原的后端保护 token 数量。不是渲染失败，是上游漏了一步。 */
  protectedTokens: 0
};
try {
  globalThis.__retainMathFailures = i;
} catch {
}
function x(e, n, t = "") {
  const r = `${(n == null ? void 0 : n.message) || n}`;
  if (i.lastReason = r, e === "engine-load") {
    i.engineLoad += 1, console.warn("[markdown-math] MathJax 引擎加载失败，公式将退回纯文本：", r);
    return;
  }
  i.convert += 1, i.samples.length < D && i.samples.push(t), i.convert <= 5 && console.warn(`[markdown-math] 公式渲染失败（第 ${i.convert} 条）：`, t, r);
}
function J() {
  return u || (u = (f ?? C)().catch((n) => {
    throw u = null, n;
  })), u;
}
function h(e, n) {
  const t = `<code class="reader-md-math-error" title="公式渲染失败">${P(e)}</code>`;
  return n ? `<div class="reader-md-math reader-md-math-display reader-md-math-failed">${t}</div>` : `<span class="reader-md-math reader-md-math-inline reader-md-math-failed">${t}</span>`;
}
function K(e, n) {
  const t = n ? "reader-md-math reader-md-math-display" : "reader-md-math reader-md-math-inline", r = n ? "div" : "span";
  return `<${r} class="${t}">${e}</${r}>`;
}
const U = [
  [/[⟨〈]/g, "\\langle "],
  [/[⟩〉]/g, "\\rangle "],
  [/∣/g, "\\mid "],
  [/‖/g, "\\| "],
  [/[≤⩽]/g, "\\le "],
  [/[≥⩾]/g, "\\ge "],
  [/≠/g, "\\ne "],
  [/≈/g, "\\approx "],
  [/≡/g, "\\equiv "],
  [/×/g, "\\times "],
  [/÷/g, "\\div "],
  [/[·⋅]/g, "\\cdot "],
  [/±/g, "\\pm "],
  [/∓/g, "\\mp "],
  [/[−–]/g, "-"],
  [/∞/g, "\\infty "],
  [/∑/g, "\\sum "],
  [/∏/g, "\\prod "],
  [/∫/g, "\\int "],
  [/√/g, "\\surd "],
  [/∂/g, "\\partial "],
  [/∇/g, "\\nabla "],
  [/→/g, "\\to "],
  [/←/g, "\\leftarrow "],
  [/⇒/g, "\\Rightarrow "],
  [/⇔/g, "\\Leftrightarrow "],
  [/∈/g, "\\in "],
  [/∉/g, "\\notin "],
  [/∀/g, "\\forall "],
  [/∃/g, "\\exists "],
  [/∅/g, "\\emptyset "],
  [/∝/g, "\\propto "],
  [/≃/g, "\\simeq "],
  [/≅/g, "\\cong "],
  [/⊥/g, "\\perp "],
  [/∥/g, "\\parallel "],
  [/[′ʹ]/g, "'"],
  [/[″ʺ]/g, "''"],
  [/Δ/g, "\\Delta "],
  [/Ω/g, "\\Omega "],
  [/μ/g, "\\mu "],
  [/λ/g, "\\lambda "],
  [/σ/g, "\\sigma "],
  [/π/g, "\\pi "],
  [/θ/g, "\\theta "],
  [/φ/g, "\\varphi "],
  [/α/g, "\\alpha "],
  [/β/g, "\\beta "],
  [/γ/g, "\\gamma "],
  [/ω/g, "\\omega "]
];
function Z(e) {
  let n = `${e ?? ""}`;
  for (const [t, r] of U)
    n = n.replace(t, r);
  return q(n) ? G(n) : n;
}
function q(e) {
  const n = "(?:\\{[^{}]*\\}|\\\\[A-Za-z]+|[A-Za-z0-9*])", t = new RegExp(`[_^]${n}\\s*(?=[_^])`), r = new RegExp(`[_^]${n}\\s*'`);
  return t.test(e) || r.test(e) || /\^\s*\^/.test(e) || /__/.test(e);
}
function w(e, n) {
  let t = 0, r = n;
  for (; r < e.length; r += 1)
    if (e[r] === "{") t += 1;
    else if (e[r] === "}" && (t -= 1, t === 0)) {
      r += 1;
      break;
    }
  return { arg: e.slice(n, r), next: r };
}
function A(e, n) {
  let t = n;
  for (; t < e.length && e[t] === " "; ) t += 1;
  if (e[t] === "{") return w(e, t);
  if (e[t] === "\\") {
    let r = t + 1;
    for (; r < e.length && /[A-Za-z]/.test(e[r]); ) r += 1;
    let a = r > t + 1 ? r : r + 1;
    for (; ; ) {
      let o = a;
      for (; o < e.length && e[o] === " "; ) o += 1;
      if (e[o] !== "{") break;
      a = w(e, o).next;
    }
    return { arg: e.slice(t, a), next: a };
  }
  return { arg: e[t] ?? "", next: t + 1 };
}
function G(e) {
  const n = e.replace(/\^\s*\^/g, "^").replace(/''/g, "^{\\prime\\prime}").replace(/'/g, "^{\\prime}");
  let t = "", r = 0;
  for (; r < n.length; ) {
    const a = n[r];
    if (a !== "_" && a !== "^") {
      t += a, r += 1;
      continue;
    }
    const o = A(n, r + 1);
    let l = o.arg, c = o.next;
    for (; c < n.length; ) {
      let s = c;
      for (; s < n.length && n[s] === " "; ) s += 1;
      if (n[s] !== a) break;
      const g = A(n, s + 1);
      l = `${l}${n.slice(c, s)}${a}${g.arg}`, c = g.next;
    }
    t += `${a}{${l}}`, r = c;
  }
  return t;
}
async function X(e, n) {
  if (!n.length)
    return e;
  let t = null;
  try {
    t = await J();
  } catch (o) {
    t = null, x("engine-load", o);
  }
  const r = /* @__PURE__ */ new Map();
  let a = 0;
  for (const o of n) {
    let l;
    if (t)
      try {
        l = K(t.convert(Z(o.tex), o.display), o.display);
      } catch (c) {
        l = h(o.tex, o.display), x("convert", c, o.tex);
      }
    else
      l = h(o.tex, o.display);
    r.set(o.token, l), a += 1, a % 24 === 0 && await new Promise((c) => setTimeout(c, 0));
  }
  return E(`${e ?? ""}`, n, r);
}
function E(e, n, t) {
  if (!n.length) return e;
  const r = new RegExp(
    n.map((a) => a.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
    "g"
  );
  return e.replace(r, (a) => t.get(a) || a);
}
function ee(e, n) {
  const t = new Map(
    n.map((r) => [r.token, h(r.tex, r.display)])
  );
  return E(`${e ?? ""}`, n, t);
}
async function te(e, n) {
  const { text: t, slots: r } = B(e), a = n(t);
  return X(a, r);
}
const ne = Object.freeze({
  sentence: { label: "句子" },
  data: { label: "数据" },
  figure: { label: "图表" }
});
function _(e, n) {
  return Array.isArray(e) ? [...e].sort((t, r) => {
    const a = n(t) - n(r);
    if (a !== 0)
      return a;
    const o = `${(t == null ? void 0 : t.createdAt) || ""}`, l = `${(r == null ? void 0 : r.createdAt) || ""}`;
    return o < l ? -1 : o > l ? 1 : 0;
  }) : [];
}
function Q(e, n) {
  const t = [];
  for (const r of _(e, n)) {
    const a = n(r), o = t[t.length - 1];
    o && o.pageIdx === a ? o.items.push(r) : t.push({ pageIdx: a, items: [r] });
  }
  return t;
}
const v = (e) => Number((e == null ? void 0 : e.pageIdx) ?? 0);
function re(e) {
  return _(e, v);
}
function V(e) {
  return Q(e, v);
}
function k(e) {
  return `${e || ""}`.split(`
`).map((n) => `> ${n}`);
}
function ae({
  title: e = "",
  annotations: n = []
} = {}) {
  const t = e ? `# ${e} 批注` : "# 批注", r = V(n);
  if (r.length === 0)
    return `${t}

(暂无批注)
`;
  const a = [t, ""];
  for (const o of r) {
    a.push(`## 第 ${o.pageIdx + 1} 页`, "");
    for (const l of o.items)
      a.push(...k(l == null ? void 0 : l.quoteText)), l != null && l.translatedQuoteText && a.push(...k(`—— ${l.translatedQuoteText}`)), l != null && l.note && a.push("", `笔记:${l.note}`), a.push("");
  }
  return a.join(`
`);
}
function oe(e) {
  return {
    pageIdx: e == null ? void 0 : e.pageIdx,
    blockId: e == null ? void 0 : e.blockId
  };
}
export {
  ne as ANNOTATION_KIND_META,
  oe as annotationAnchor,
  ae as buildAnnotationsMarkdown,
  B as extractMarkdownMath,
  V as groupAnnotationsByPage,
  Q as groupByPageAndCreatedAt,
  ee as materializeMarkdownMathFallbackHtml,
  X as materializeMarkdownMathHtml,
  i as mathFailureStats,
  se as normalizeBlockKey,
  Z as normalizeMathTex,
  te as parseMarkdownWithMath,
  h as renderMathFallbackHtml,
  Y as resetMarkdownMathEngineLoader,
  F as revealProtectedTokens,
  W as setMarkdownMathEngineLoader,
  re as sortAnnotations,
  _ as sortByPageAndCreatedAt,
  K as wrapMathSvgHtml
};
//# sourceMappingURL=content.js.map
