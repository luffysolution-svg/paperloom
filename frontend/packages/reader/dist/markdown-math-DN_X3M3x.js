const k = "RP_MATH_";
let p = null, f = null;
function K(e) {
  f = e, p = null;
}
function Z() {
  f = null, p = null;
}
function E(e) {
  return `${e}`.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function S(e) {
  return `${k}${e}`;
}
const N = /[0-9A-Za-z\\{}_^()\[\]|+\-=,.:;'~*/<>!\u00b0\u00b1\u00d7\u00f7\u2212\u2202\u03b1-\u03c9\u0391-\u03a9]+/g, F = /\\[A-Za-z]+|[_^]\{/;
function H(e, t) {
  const a = new RegExp(`${k}\\d+|</?[a-z][\\w:-]*(?:\\s[^<>]*)?/?>`, "gi"), n = (i) => i.replace(
    N,
    (s) => F.test(s) ? t(s, !1) : s
  );
  let r = "", l = 0, o;
  for (; (o = a.exec(e)) !== null; )
    r += n(e.slice(l, o.index)) + o[0], l = o.index + o[0].length;
  return r += n(e.slice(l)), r;
}
const y = /<([futnvc]\d+-[0-9a-z]{3})\/>/g;
function P(e) {
  let t = 0;
  return { text: `${e ?? ""}`.replace(y, (n, r) => (t += 1, `[未还原 token ${r}]`)), count: t };
}
function L(e, t = {}) {
  const a = [], n = P(`${e ?? ""}`);
  n.count && (g.protectedTokens += n.count, g.protectedTokens <= 5 && console.warn(
    `[markdown-math] 译文里有 ${n.count} 个未还原的保护 token，已原样显示`
  ));
  let r = n.text.replace(/<table\b[^>]*>[\s\S]*?<\/table\s*>/gi, (o) => o.replace(/<eq\b[^>]*>([\s\S]*?)<\/eq\s*>/gi, (i, s) => {
    const c = s.trim();
    return !c || c.startsWith("$") && c.endsWith("$") ? c : "$" + c + "$";
  }));
  const l = (o, i) => {
    const s = `${o ?? ""}`.trim();
    if (!s)
      return i ? `$$${o}$$` : `$${o}$`;
    const c = S(a.length);
    return a.push({ token: c, tex: s, display: i }), c;
  };
  return r = r.replace(/\$\$([\s\S]+?)\$\$/g, (o, i) => l(i, !0)), r = r.replace(new RegExp("(?<![\\\\$])\\$(?!\\$)((?:\\\\.|[^$\\n])+?)\\$(?!\\$)", "g"), (o, i) => `${i}`.trim() ? l(i, !1) : o), t.bareLatex && (r = H(r, l)), { text: r, slots: a };
}
const j = 20, I = /data-mml-node="mtext"[^>]*fill="red"/;
function d(e, t) {
  var l;
  const a = e, n = a == null ? void 0 : a[t];
  if (n !== void 0)
    return n;
  const r = (l = a == null ? void 0 : a.default) == null ? void 0 : l[t];
  if (r !== void 0)
    return r;
  throw new Error(`mathjax-full 未导出 ${t}（CJS/ESM 互操作问题）`);
}
async function z() {
  const [e, t, a, n, r, l] = await Promise.all([
    import("mathjax-full/js/mathjax.js"),
    import("mathjax-full/js/input/tex.js"),
    import("mathjax-full/js/output/svg.js"),
    import("mathjax-full/js/adaptors/liteAdaptor.js"),
    import("mathjax-full/js/handlers/html.js"),
    import("mathjax-full/js/input/tex/AllPackages.js")
  ]), o = d(e, "mathjax"), i = d(t, "TeX"), s = d(a, "SVG"), c = d(n, "liteAdaptor"), T = d(r, "RegisterHTMLHandler"), A = d(l, "AllPackages"), $ = c();
  T($);
  const v = o.document("", {
    InputJax: new i({
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
      packages: A.filter((u) => u !== "html").concat("unicode")
    }),
    OutputJax: new s({ fontCache: "none" })
  });
  return {
    convert(u, R) {
      const b = v.convert(u, { display: R }), m = $.outerHTML(b);
      if (!/<svg[\s>]/i.test(m))
        throw new Error("mathjax produced no svg");
      if (/data-mjx-error|merror/i.test(m))
        throw new Error("mathjax error node");
      if (I.test(m))
        throw new Error("mathjax undefined command");
      return m;
    }
  };
}
const g = {
  engineLoad: 0,
  convert: 0,
  lastReason: "",
  /** 最近若干条失败的公式原文，用来判断是哪一类写法出了问题。 */
  samples: [],
  /** 译文里漏还原的后端保护 token 数量。不是渲染失败，是上游漏了一步。 */
  protectedTokens: 0
};
try {
  globalThis.__retainMathFailures = g;
} catch {
}
function w(e, t, a = "") {
  const n = `${(t == null ? void 0 : t.message) || t}`;
  if (g.lastReason = n, e === "engine-load") {
    g.engineLoad += 1, console.warn("[markdown-math] MathJax 引擎加载失败，公式将退回纯文本：", n);
    return;
  }
  g.convert += 1, g.samples.length < j && g.samples.push(a), g.convert <= 5 && console.warn(`[markdown-math] 公式渲染失败（第 ${g.convert} 条）：`, a, n);
}
function O() {
  return p || (p = (f ?? z)().catch((t) => {
    throw p = null, t;
  })), p;
}
function h(e, t) {
  const a = `<code class="reader-md-math-error" title="公式渲染失败">${E(e)}</code>`;
  return t ? `<div class="reader-md-math reader-md-math-display reader-md-math-failed">${a}</div>` : `<span class="reader-md-math reader-md-math-inline reader-md-math-failed">${a}</span>`;
}
function D(e, t, a) {
  const n = t ? "reader-md-math reader-md-math-display" : "reader-md-math reader-md-math-inline", r = t ? "div" : "span", l = a === void 0 ? "" : ` data-reader-tex="${E(a)}"`;
  return `<${r} class="${n}"${l}>${e}</${r}>`;
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
function J(e) {
  let t = `${e ?? ""}`;
  for (const [a, n] of U)
    t = t.replace(a, n);
  return X(t) ? q(t) : t;
}
function X(e) {
  const t = "(?:\\{[^{}]*\\}|\\\\[A-Za-z]+|[A-Za-z0-9*])", a = new RegExp(`[_^]${t}\\s*(?=[_^])`), n = new RegExp(`[_^]${t}\\s*'`);
  return a.test(e) || n.test(e) || /\^\s*\^/.test(e) || /__/.test(e);
}
function x(e, t) {
  let a = 0, n = t;
  for (; n < e.length; n += 1)
    if (e[n] === "{") a += 1;
    else if (e[n] === "}" && (a -= 1, a === 0)) {
      n += 1;
      break;
    }
  return { arg: e.slice(t, n), next: n };
}
function M(e, t) {
  let a = t;
  for (; a < e.length && e[a] === " "; ) a += 1;
  if (e[a] === "{") return x(e, a);
  if (e[a] === "\\") {
    let n = a + 1;
    for (; n < e.length && /[A-Za-z]/.test(e[n]); ) n += 1;
    let r = n > a + 1 ? n : n + 1;
    for (; ; ) {
      let l = r;
      for (; l < e.length && e[l] === " "; ) l += 1;
      if (e[l] !== "{") break;
      r = x(e, l).next;
    }
    return { arg: e.slice(a, r), next: r };
  }
  return { arg: e[a] ?? "", next: a + 1 };
}
function q(e) {
  const t = e.replace(/\^\s*\^/g, "^").replace(/''/g, "^{\\prime\\prime}").replace(/'/g, "^{\\prime}");
  let a = "", n = 0;
  for (; n < t.length; ) {
    const r = t[n];
    if (r !== "_" && r !== "^") {
      a += r, n += 1;
      continue;
    }
    const l = M(t, n + 1);
    let o = l.arg, i = l.next;
    for (; i < t.length; ) {
      let s = i;
      for (; s < t.length && t[s] === " "; ) s += 1;
      if (t[s] !== r) break;
      const c = M(t, s + 1);
      o = `${o}${t.slice(i, s)}${r}${c.arg}`, i = c.next;
    }
    a += `${r}{${o}}`, n = i;
  }
  return a;
}
async function C(e, t, a = {}) {
  if (!t.length)
    return e;
  let n = null;
  try {
    n = await O();
  } catch (o) {
    n = null, w("engine-load", o);
  }
  const r = /* @__PURE__ */ new Map();
  let l = 0;
  for (const o of t) {
    let i;
    if (n)
      try {
        i = D(
          n.convert(J(o.tex), o.display),
          o.display,
          a.preserveSource === !1 ? void 0 : o.tex
        );
      } catch (s) {
        i = h(o.tex, o.display), w("convert", s, o.tex);
      }
    else
      i = h(o.tex, o.display);
    r.set(o.token, i), l += 1, l % 24 === 0 && await new Promise((s) => setTimeout(s, 0));
  }
  return _(`${e ?? ""}`, t, r);
}
function _(e, t, a) {
  if (!t.length) return e;
  const n = new RegExp(
    t.map((r) => r.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
    "g"
  );
  return e.replace(n, (r) => a.get(r) || r);
}
function B(e, t) {
  const a = new Map(
    t.map((n) => [n.token, h(n.tex, n.display)])
  );
  return _(`${e ?? ""}`, t, a);
}
async function G(e, t) {
  const { text: a, slots: n } = L(e), r = t(a);
  return C(r, n);
}
export {
  C as a,
  g as b,
  Z as c,
  P as d,
  L as e,
  B as m,
  J as n,
  G as p,
  h as r,
  K as s,
  D as w
};
//# sourceMappingURL=markdown-math-DN_X3M3x.js.map
