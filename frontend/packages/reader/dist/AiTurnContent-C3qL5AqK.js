import { jsxs as b, jsx as r, Fragment as _ } from "react/jsx-runtime";
import { useId as j, useState as R, useCallback as S, useRef as L, useEffect as C, useLayoutEffect as ie, createContext as se, useContext as V, useMemo as F, memo as le } from "react";
import { Loader2 as Z, Clock3 as oe, ListChecks as ce, ChevronDown as D, Brain as de, Search as ue, BookOpen as he, Wrench as me, CircleAlert as fe, Check as pe } from "lucide-react";
import { w as q, e as ge, j as Q, y as O, x as J, v as be, a as ye, h as xe, l as we, g as ve, u as $e } from "./answer-enhance-D8zK9znw.js";
import Ne, { setCustomComponents as ke, PreCodeNode as Me, MathInlineNode as _e } from "markstream-react";
import { createPortal as Ae } from "react-dom";
const Le = "retainpdf-chart", Ce = 6, Ie = 40, Se = /* @__PURE__ */ new Set(["bar", "line", "pie"]);
function Ee(e) {
  if (typeof e == "number") return Number.isFinite(e) ? e : null;
  if (typeof e == "string" && e.trim()) {
    const t = Number(e);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}
function P(e, t = "") {
  return `${e ?? ""}`.trim() || t;
}
function Pe(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const n of e) {
    if (!n || typeof n != "object") continue;
    const i = n, a = Ee(i.value ?? i.y);
    if (a !== null && (t.push({ label: P(i.label ?? i.x, `${t.length + 1}`), value: a }), t.length >= Ie))
      break;
  }
  return t;
}
function Re(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const n of e) {
    if (!n || typeof n != "object") continue;
    const i = n, a = Pe(i.points ?? i.data);
    if (a.length && (t.push({ name: P(i.name, `系列 ${t.length + 1}`), points: a }), t.length >= Ce))
      break;
  }
  return t;
}
function Te(e) {
  const t = `${e || ""}`.trim();
  if (!t) return null;
  let n;
  try {
    n = JSON.parse(t);
  } catch {
    return null;
  }
  if (!n || typeof n != "object" || Array.isArray(n)) return null;
  const i = n, a = `${i.kind ?? i.type ?? ""}`.trim().toLowerCase();
  if (!Se.has(a)) return null;
  const s = Re(i.series);
  if (!s.length) return null;
  const c = a === "pie" ? s.slice(0, 1) : s;
  return {
    kind: a,
    title: P(i.title),
    xLabel: P(i.xLabel ?? i.x_label),
    yLabel: P(i.yLabel ?? i.y_label),
    series: c
  };
}
function Oe(e) {
  const t = e.series.flatMap((c) => c.points.map((o) => o.value)), n = Math.min(...t), i = Math.max(...t), a = Math.min(0, n), s = Math.max(0, i);
  return a === s ? { min: a, max: s + 1 } : { min: a, max: s };
}
function z(e) {
  let t = [];
  for (const n of e.series)
    n.points.length > t.length && (t = n.points);
  return t.map((n) => n.label);
}
const ee = 640, H = 300, x = { top: 16, right: 16, bottom: 44, left: 52 }, A = ee - x.left - x.right, k = H - x.top - x.bottom, Y = [
  "var(--chart-1, #4c6ef5)",
  "var(--chart-2, #f08c00)",
  "var(--chart-3, #2f9e44)",
  "var(--chart-4, #e03131)",
  "var(--chart-5, #ae3ec9)",
  "var(--chart-6, #0c8599)"
], T = (e) => Y[e % Y.length];
function De(e, t) {
  return Array.from({ length: 5 }, (i, a) => e + (t - e) * a / 4);
}
function je(e) {
  const t = Math.abs(e);
  return t >= 1e4 ? `${(e / 1e3).toFixed(0)}k` : Number.isInteger(e) ? `${e}` : e.toFixed(t < 1 ? 2 : 1);
}
function ze(e) {
  return e <= 8 ? 1 : Math.ceil(e / 8);
}
function He({
  spec: e,
  min: t,
  max: n,
  labels: i
}) {
  const a = (o) => x.top + k - (o - t) / (n - t) * k, s = ze(i.length), c = A / Math.max(1, i.length);
  return /* @__PURE__ */ b("g", { className: "reader-answer-chart-axes", children: [
    De(t, n).map((o) => /* @__PURE__ */ b("g", { children: [
      /* @__PURE__ */ r(
        "line",
        {
          className: "reader-answer-chart-grid",
          x1: x.left,
          x2: x.left + A,
          y1: a(o),
          y2: a(o)
        }
      ),
      /* @__PURE__ */ r("text", { className: "reader-answer-chart-tick", x: x.left - 8, y: a(o), textAnchor: "end", dominantBaseline: "middle", children: je(o) })
    ] }, o)),
    i.map((o, h) => h % s === 0 ? /* @__PURE__ */ r(
      "text",
      {
        className: "reader-answer-chart-tick",
        x: x.left + c * (h + 0.5),
        y: x.top + k + 18,
        textAnchor: "middle",
        children: o.length > 10 ? `${o.slice(0, 9)}…` : o
      },
      `${o}-${h}`
    ) : null),
    e.yLabel ? /* @__PURE__ */ r("text", { className: "reader-answer-chart-axis-label", x: x.left, y: x.top - 4, textAnchor: "start", children: e.yLabel }) : null,
    e.xLabel ? /* @__PURE__ */ r(
      "text",
      {
        className: "reader-answer-chart-axis-label",
        x: x.left + A,
        y: H - 6,
        textAnchor: "end",
        children: e.xLabel
      }
    ) : null
  ] });
}
function We({ spec: e, min: t, max: n }) {
  const i = z(e), a = A / Math.max(1, i.length), s = a * 0.7, c = s / e.series.length, o = (d) => x.top + k - (d - t) / (n - t) * k, h = o(0);
  return /* @__PURE__ */ r(_, { children: e.series.map((d, l) => /* @__PURE__ */ r("g", { fill: T(l), children: d.points.map((u, f) => {
    const p = o(u.value), g = x.left + a * f + (a - s) / 2 + c * l;
    return /* @__PURE__ */ r(
      "rect",
      {
        x: g,
        y: Math.min(p, h),
        width: Math.max(1, c - 1),
        height: Math.max(1, Math.abs(h - p)),
        rx: 2,
        children: /* @__PURE__ */ r("title", { children: `${d.name} · ${u.label}: ${u.value}` })
      },
      `${u.label}-${f}`
    );
  }) }, d.name)) });
}
function Be({ spec: e, min: t, max: n }) {
  const i = z(e), a = A / Math.max(1, i.length), s = (o) => x.top + k - (o - t) / (n - t) * k, c = (o) => x.left + a * (o + 0.5);
  return /* @__PURE__ */ r(_, { children: e.series.map((o, h) => {
    const d = o.points.map((l, u) => `${u === 0 ? "M" : "L"} ${c(u)} ${s(l.value)}`).join(" ");
    return /* @__PURE__ */ b("g", { stroke: T(h), fill: T(h), children: [
      /* @__PURE__ */ r("path", { className: "reader-answer-chart-line", d, fill: "none" }),
      o.points.map((l, u) => /* @__PURE__ */ r(
        "circle",
        {
          cx: c(u),
          cy: s(l.value),
          r: 3,
          stroke: "none",
          children: /* @__PURE__ */ r("title", { children: `${o.name} · ${l.label}: ${l.value}` })
        },
        `${l.label}-${u}`
      ))
    ] }, o.name);
  }) });
}
function Fe({ spec: e }) {
  var h;
  const t = ((h = e.series[0]) == null ? void 0 : h.points) ?? [], n = t.map((d) => Math.max(0, d.value)), i = n.reduce((d, l) => d + l, 0);
  if (i <= 0) return null;
  const a = x.left + A / 2, s = x.top + k / 2, c = Math.min(A, k) / 2 - 8;
  let o = -Math.PI / 2;
  return /* @__PURE__ */ r(_, { children: t.map((d, l) => {
    const u = n[l] / i, f = o + u * Math.PI * 2, p = a + c * Math.cos(o), g = s + c * Math.sin(o), w = a + c * Math.cos(f), $ = s + c * Math.sin(f), N = u > 0.5 ? 1 : 0, m = u >= 1 ? `M ${a} ${s - c} A ${c} ${c} 0 1 1 ${a - 0.01} ${s - c} Z` : `M ${a} ${s} L ${p} ${g} A ${c} ${c} 0 ${N} 1 ${w} ${$} Z`;
    return o = f, /* @__PURE__ */ r("path", { d: m, fill: T(l), children: /* @__PURE__ */ r("title", { children: `${d.label}: ${d.value}（${(u * 100).toFixed(1)}%）` }) }, `${d.label}-${l}`);
  }) });
}
function Ye({ spec: e }) {
  var n;
  const t = e.kind === "pie" ? (((n = e.series[0]) == null ? void 0 : n.points) ?? []).map((i) => i.label) : e.series.map((i) => i.name);
  return t.length < 2 ? null : /* @__PURE__ */ r("ul", { className: "reader-answer-chart-legend", children: t.map((i, a) => /* @__PURE__ */ b("li", { children: [
    /* @__PURE__ */ r("span", { className: "reader-answer-chart-swatch", style: { background: T(a) }, "aria-hidden": !0 }),
    i
  ] }, `${i}-${a}`)) });
}
function Ue({ spec: e }) {
  const t = j(), { min: n, max: i } = Oe(e), a = z(e), s = e.title || `${e.series.length} 个系列的${e.kind === "pie" ? "占比" : "对比"}图`;
  return /* @__PURE__ */ b("figure", { className: "reader-answer-chart", children: [
    /* @__PURE__ */ b(
      "svg",
      {
        className: `reader-answer-chart-svg is-${e.kind}`,
        viewBox: `0 0 ${ee} ${H}`,
        role: "img",
        "aria-labelledby": t,
        preserveAspectRatio: "xMidYMid meet",
        children: [
          /* @__PURE__ */ r("title", { id: t, children: s }),
          e.kind !== "pie" ? /* @__PURE__ */ r(He, { spec: e, min: n, max: i, labels: a }) : null,
          e.kind === "bar" ? /* @__PURE__ */ r(We, { spec: e, min: n, max: i }) : null,
          e.kind === "line" ? /* @__PURE__ */ r(Be, { spec: e, min: n, max: i }) : null,
          e.kind === "pie" ? /* @__PURE__ */ r(Fe, { spec: e }) : null
        ]
      }
    ),
    /* @__PURE__ */ r(Ye, { spec: e }),
    e.title ? /* @__PURE__ */ r("figcaption", { className: "reader-answer-chart-caption", children: e.title }) : null
  ] });
}
const Xe = 1600;
function Ge(e) {
  const t = `${e || ""}`.trim().toLowerCase();
  return !t || t === "text" || t === "plain" ? "" : {
    js: "JavaScript",
    jsx: "JSX",
    ts: "TypeScript",
    tsx: "TSX",
    py: "Python",
    python: "Python",
    rs: "Rust",
    rust: "Rust",
    sh: "Shell",
    bash: "Shell",
    zsh: "Shell",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    sql: "SQL",
    html: "HTML",
    css: "CSS",
    md: "Markdown",
    markdown: "Markdown"
  }[t] || t;
}
function Ke({
  language: e,
  code: t,
  children: n
}) {
  const [i, a] = R(!1), s = Ge(e), c = S(() => {
    var h;
    const o = `${t || ""}`;
    o.trim() && ((h = navigator.clipboard) == null || h.writeText(o).then(
      () => {
        var d;
        a(!0), (d = globalThis.setTimeout) == null || d.call(globalThis, () => a(!1), Xe);
      },
      () => {
      }
    ));
  }, [t]);
  return /* @__PURE__ */ b("div", { className: "reader-answer-code", children: [
    /* @__PURE__ */ b("div", { className: "reader-answer-code-bar", children: [
      /* @__PURE__ */ r("span", { className: "reader-answer-code-lang", children: s }),
      /* @__PURE__ */ r(
        "button",
        {
          type: "button",
          className: "reader-answer-code-copy",
          onClick: c,
          title: "复制代码",
          children: i ? "已复制" : "复制"
        }
      )
    ] }),
    n
  ] });
}
const Ve = 8, Ze = 8;
function qe(e, t, n, { gap: i = Ve, margin: a = Ze } = {}) {
  const s = n.height - e.bottom, c = e.top, o = t.height + i + a, h = s >= o || s >= c ? "bottom" : "top", d = h === "bottom" ? e.bottom + i : e.top - i - t.height, l = Math.max(a, n.height - t.height - a), u = Math.min(Math.max(d, a), l), f = e.left + e.width / 2 - t.width / 2, p = Math.max(a, n.width - t.width - a);
  return { left: Math.min(Math.max(f, a), p), top: u, placement: h };
}
const Qe = 240, te = 180;
function ne(e, t) {
  const n = `${e || ""}`.replace(/\s+/g, " ").trim();
  return n.length <= t ? n : `${n.slice(0, t - 1)}…`;
}
function ae(e, t) {
  return q(e) === null ? [] : `${e.job_id || t || ""}`.trim() ? ["translated", "source"] : [];
}
function Je(e, t) {
  return ae(e, t).length > 0 || ne(`${e.snippet || ""}`, te).length > 0;
}
function et({
  citation: e,
  jobId: t,
  anchor: n,
  cardId: i,
  onPointerEnter: a,
  onPointerLeave: s
}) {
  const c = L(null), o = L(null), h = ae(e, t), d = q(e), l = d === null ? null : d + 1, u = ne(`${e.snippet || ""}`, te), [f, p] = R(
    h.length ? "loading" : "none"
  ), [g, w] = R(null);
  C(() => {
    const m = o.current;
    if (!m || !h.length) return;
    const y = `${e.job_id || t || ""}`.trim(), v = new AbortController();
    return (async () => {
      for (const I of h) {
        const M = ge(
          y,
          d ?? 0,
          I,
          {}
        );
        if (!M) break;
        if (m.setAttribute("data-ai-src", M), m.classList.remove("is-missing"), await Q(m, { signal: v.signal }), v.signal.aborted) return;
        if (!m.classList.contains("is-missing")) {
          p("ready");
          return;
        }
      }
      v.signal.aborted || p("failed");
    })(), () => {
      v.abort(), O(m);
    };
  }, [e, t, d, h.length]), ie(() => {
    const m = c.current;
    if (!m || !n) return;
    const y = () => {
      const v = n.getBoundingClientRect(), I = m.getBoundingClientRect(), M = qe(
        { top: v.top, left: v.left, bottom: v.bottom, width: v.width },
        {
          width: I.width || m.offsetWidth,
          height: I.height || m.offsetHeight
        },
        { width: window.innerWidth || 0, height: window.innerHeight || 0 }
      );
      w((E) => E && E.left === M.left && E.top === M.top && E.placement === M.placement ? E : M);
    };
    return y(), window.addEventListener("scroll", y, !0), window.addEventListener("resize", y), () => {
      window.removeEventListener("scroll", y, !0), window.removeEventListener("resize", y);
    };
  }, [n, f, u]);
  const $ = /* @__PURE__ */ b(
    "div",
    {
      ref: c,
      id: i,
      role: "tooltip",
      className: `reader-ai-citation-card${g ? " is-placed" : ""}`,
      "data-placement": (g == null ? void 0 : g.placement) || "bottom",
      style: { left: `${(g == null ? void 0 : g.left) ?? 0}px`, top: `${(g == null ? void 0 : g.top) ?? 0}px` },
      onMouseEnter: a,
      onMouseLeave: s,
      children: [
        h.length ? /* @__PURE__ */ b("div", { className: "reader-ai-citation-card-figure", "data-state": f, children: [
          /* @__PURE__ */ r(
            "img",
            {
              ref: o,
              alt: l ? `第 ${l} 页预览` : "来源页预览",
              className: "reader-ai-citation-card-thumb",
              decoding: "async",
              width: Qe
            }
          ),
          f === "failed" ? /* @__PURE__ */ r("span", { className: "reader-ai-citation-card-thumb-fallback", children: "预览暂不可用" }) : null
        ] }) : null,
        /* @__PURE__ */ b("div", { className: "reader-ai-citation-card-text", children: [
          /* @__PURE__ */ r("div", { className: "reader-ai-citation-card-head", children: l ? `第 ${l} 页` : "来源" }),
          u ? /* @__PURE__ */ r("p", { className: "reader-ai-citation-card-snippet", children: u }) : null
        ] })
      ]
    }
  ), N = typeof document > "u" ? null : document.body;
  return N ? Ae($, N) : $;
}
const tt = 140, U = 180;
function nt({ citation: e, label: t, jobId: n, onJump: i }) {
  const [a, s] = R(!1), c = L(null), o = L(null), h = `reader-ai-citation-card-${j().replace(/[^a-zA-Z0-9_-]/g, "")}`, d = J(e), l = Je(e, n), u = S(() => {
    o.current !== null && (clearTimeout(o.current), o.current = null);
  }, []), f = S((w, $) => {
    u(), o.current = setTimeout(() => {
      o.current = null, s(w);
    }, $);
  }, [u]);
  C(() => () => u(), [u]), C(() => {
    l || s(!1);
  }, [l]);
  const p = S(() => {
    u(), s(!0);
  }, [u]), g = S(() => {
    u(), s(!1);
  }, [u]);
  return /* @__PURE__ */ b(_, { children: [
    /* @__PURE__ */ b(
      "button",
      {
        ref: c,
        type: "button",
        className: "reader-ai-citation-ref",
        "data-page": d ?? void 0,
        "aria-describedby": a ? h : void 0,
        "aria-expanded": l ? a : void 0,
        title: d ? `跳到第 ${d} 页` : "定位来源",
        onClick: (w) => {
          w.preventDefault(), w.stopPropagation(), g(), i == null || i(e);
        },
        onMouseEnter: l ? () => f(!0, tt) : void 0,
        onMouseLeave: l ? () => f(!1, U) : void 0,
        onFocus: l ? p : void 0,
        onBlur: l ? g : void 0,
        onKeyDown: (w) => {
          w.key === "Escape" && a && (w.stopPropagation(), g());
        },
        children: [
          "[",
          t,
          "]"
        ]
      }
    ),
    a && l ? /* @__PURE__ */ r(
      et,
      {
        citation: e,
        jobId: n,
        anchor: c.current,
        cardId: h,
        onPointerEnter: p,
        onPointerLeave: () => f(!1, U)
      }
    ) : null
  ] });
}
const re = "retainpdf-ai-answer", X = 320, at = 2, W = se({
  final: !1,
  jobId: "",
  citations: []
});
function rt(e) {
  const t = Number(e.naturalWidth) || 0, n = e.closest(".reader-ai-image-jump"), i = n || e, a = t > 0 && t < X;
  if (e.classList.toggle("is-low-resolution", a), n == null || n.classList.toggle("is-low-resolution", a), a) {
    const s = Math.min(
      X,
      Math.max(t, t * at)
    );
    i.style.setProperty("--reader-ai-image-width", `${s}px`);
  } else
    i.style.removeProperty("--reader-ai-image-width");
}
function it({ node: e }) {
  const { final: t, jobId: n, citations: i, onJumpCitation: a } = V(W), s = L(null), c = L(null), o = `${e.alt || ""}`.trim(), h = be(e.src, n, {}, ye(i)), d = xe(e.src, i, n), l = J(d), u = S((p) => {
    var $;
    const g = s.current;
    if (g === p || (($ = c.current) == null || $.abort(), c.current = null, g && O(g), s.current = p, !p || !h)) return;
    const w = new AbortController();
    c.current = w, (async () => {
      for (const N of [0, 250, 750, 1500]) {
        if (N && await new Promise((y) => globalThis.setTimeout(y, N)), w.signal.aborted) return;
        const m = s.current;
        if (!m || m !== p || m.classList.contains("is-hydrated") && m.src.startsWith("blob:")) return;
        await Q(m, { signal: w.signal });
      }
    })();
  }, [h]);
  if (C(() => () => {
    var p;
    (p = c.current) == null || p.abort(), c.current = null, O(s.current), s.current = null;
  }, []), !h)
    return t ? /* @__PURE__ */ r("span", { className: "aui-image-blocked", children: o ? `[图片不可用：${o}]` : "[图片不可用]" }) : /* @__PURE__ */ r("span", { className: "aui-image-pending", "aria-label": o || "图片加载中", children: o ? `[图片：${o}]` : "[图片加载中]" });
  const f = /* @__PURE__ */ r(
    "img",
    {
      ref: u,
      alt: o,
      "data-ai-src": h,
      decoding: "async",
      loading: "lazy",
      onLoad: (p) => rt(p.currentTarget),
      title: e.title || void 0
    }
  );
  return !d || !a ? f : /* @__PURE__ */ b(
    "button",
    {
      type: "button",
      className: "reader-ai-image-jump",
      "data-page": l ?? void 0,
      title: l ? `定位到 PDF 第 ${l} 页` : "定位到图片来源",
      onClick: (p) => {
        p.preventDefault(), p.stopPropagation(), a({ ...d, image_url: h });
      },
      children: [
        f,
        /* @__PURE__ */ r("span", { className: "reader-ai-image-jump-label", "aria-hidden": "true", children: l ? `定位 p.${l}` : "定位来源" })
      ]
    }
  );
}
function st({ node: e }) {
  const { citations: t, jobId: n, onJumpCitation: i } = V(W), a = `${e.href || ""}`.match(/^#retainpdf-citation-(\d+)$/), s = a ? t.find((o) => `${o.ref}` === a[1]) : null;
  if (s)
    return /* @__PURE__ */ r(
      nt,
      {
        citation: s,
        label: `${(a == null ? void 0 : a[1]) ?? ""}`,
        jobId: n,
        onJump: i
      }
    );
  const c = `${e.text || e.href || ""}`.trim();
  return /* @__PURE__ */ r(
    "span",
    {
      className: "aui-md-extlink",
      "data-href": `${e.href || ""}`.trim() || void 0,
      title: c || void 0,
      children: c
    }
  );
}
function lt(e) {
  const t = e.node;
  if (`${(t == null ? void 0 : t.language) || ""}`.trim().toLowerCase() === Le) {
    const n = Te(`${(t == null ? void 0 : t.code) || ""}`);
    if (n) return /* @__PURE__ */ r(Ue, { spec: n });
  }
  return /* @__PURE__ */ r(Ke, { language: `${(t == null ? void 0 : t.language) || ""}`, code: `${(t == null ? void 0 : t.code) || ""}`, children: /* @__PURE__ */ r(Me, { node: e.node }) });
}
function ot({ node: e }) {
  return /* @__PURE__ */ r(
    _e,
    {
      node: e.markup === "$$" ? { ...e, markup: "$" } : e
    }
  );
}
ke(re, {
  image: it,
  link: st,
  math_inline: ot,
  code_block: lt
});
function ct({
  content: e,
  final: t,
  indexKey: n,
  jobId: i,
  citations: a = [],
  onJumpCitation: s,
  onClickCapture: c
}) {
  return /* @__PURE__ */ r(W.Provider, { value: { final: t, jobId: i, citations: a, onJumpCitation: s }, children: /* @__PURE__ */ r(
    "div",
    {
      className: "retain-markstream-shell",
      "data-markdown-renderer": "markstream-react",
      onClickCapture: c,
      children: /* @__PURE__ */ r(
        Ne,
        {
          batchRendering: !t,
          content: e,
          customId: re,
          fade: !1,
          final: t,
          htmlPolicy: "escape",
          indexKey: n,
          maxLiveNodes: 0,
          renderCodeBlocksAsPre: !0,
          showTooltips: !1,
          smoothStreaming: !1,
          typewriter: !1
        }
      )
    }
  ) });
}
function G({
  content: e,
  streaming: t = !1,
  citations: n = [],
  jobId: i = "",
  className: a = "",
  streamingClassName: s = "",
  pendingClassName: c = "",
  finalClassName: o = "",
  citationFooterMax: h = 5,
  onJumpCitation: d
}) {
  var N;
  const l = L(null), u = j(), f = t ? `${e || ""}` : `${e || ""}`.trim(), p = `${i || ((N = n.find((m) => m.job_id)) == null ? void 0 : N.job_id) || ""}`.trim(), g = F(() => {
    const m = /* @__PURE__ */ new Map();
    for (const y of n)
      we(y) && m.set(`${y.ref}`, y);
    return m;
  }, [n]), w = F(
    () => ve(f, g),
    [f, g]
  );
  return C(() => {
    var v;
    const m = l.current;
    if (!m || !f) return;
    const y = m.parentElement;
    if (y instanceof HTMLElement && h !== 0) {
      if (t) {
        (v = y.querySelector(".reader-ai-citations")) == null || v.remove();
        return;
      }
      $e(y, n, {
        onJump: (I) => d == null ? void 0 : d(I),
        answerText: f,
        max: h
      });
    }
  }, [t, p, g, n, d, f, h]), C(() => () => O(l.current), []), f.trim() ? /* @__PURE__ */ r("div", { ref: l, className: `${a} ${t ? s : o || c}`.trim(), children: /* @__PURE__ */ r(
    ct,
    {
      content: w,
      final: !t,
      indexKey: u,
      jobId: p,
      citations: n,
      onJumpCitation: d,
      onClickCapture: (m) => {
        const y = m.target;
        y instanceof Element && y.closest("a[href]") && (m.preventDefault(), m.stopPropagation());
      }
    }
  ) }) : null;
}
const dt = {
  search_fulltext: "检索文献",
  read_blocks: "阅读原文",
  list_documents: "查找文献",
  search_favorites: "检索收藏",
  search_markdown: "检索全文",
  read_markdown_chunk: "阅读全文",
  calculate_expression: "计算表达式",
  calculate_statistics: "统计分析",
  analyze_table: "分析表格",
  generate_chart: "生成图表"
}, B = (e = 0) => `${Math.max(1, Math.round(e / 1e3))} 秒`;
function K(e) {
  return (typeof e == "string" ? e : JSON.stringify(e, null, 2) || "").slice(0, 8e3);
}
function ut({ part: e, running: t }) {
  var s;
  const n = t && !["completed", "failed", "cancelled"].includes(e.status || ""), i = e.type === "reasoning" ? de : /search/.test(e.tool || "") ? ue : /read|list/.test(e.tool || "") ? he : me, a = e.type === "reasoning" ? "思考过程" : dt[e.tool || ""] || e.title || "执行工具";
  return /* @__PURE__ */ b("details", { className: `reader-ai-activity-step${n ? " is-active" : ""}`, children: [
    /* @__PURE__ */ b("summary", { children: [
      /* @__PURE__ */ r(i, { size: 15, "aria-hidden": "true" }),
      /* @__PURE__ */ r("span", { className: "reader-ai-activity-label", title: a, children: a }),
      e.summary || n && e.type === "reasoning" && e.text ? /* @__PURE__ */ r("span", { className: "reader-ai-activity-summary", children: e.summary || ((s = e.text) == null ? void 0 : s.slice(-90).replace(/\s+/g, " ")) }) : null,
      /* @__PURE__ */ r("span", { className: "reader-ai-activity-state", children: e.status === "failed" ? /* @__PURE__ */ r(fe, { size: 13, "aria-label": "执行失败" }) : n ? /* @__PURE__ */ r(Z, { size: 13, className: "reader-ai-spin", "aria-label": "进行中" }) : /* @__PURE__ */ r(pe, { size: 13, "aria-label": "已完成" }) }),
      e.duration_ms != null ? /* @__PURE__ */ r("span", { className: "reader-ai-activity-time", children: B(e.duration_ms) }) : null,
      /* @__PURE__ */ r(D, { size: 13, className: "reader-ai-details-chevron", "aria-hidden": "true" })
    ] }),
    /* @__PURE__ */ r("div", { className: "reader-ai-activity-detail", children: e.type === "reasoning" ? /* @__PURE__ */ r("div", { className: "reader-ai-reasoning-text", children: e.text }) : /* @__PURE__ */ b(_, { children: [
      e.input != null || e.input_preview ? /* @__PURE__ */ b(_, { children: [
        /* @__PURE__ */ r("span", { className: "reader-ai-detail-label", children: "输入" }),
        /* @__PURE__ */ r("pre", { children: K(e.input ?? e.input_preview) })
      ] }) : null,
      e.output != null || e.content != null ? /* @__PURE__ */ b(_, { children: [
        /* @__PURE__ */ r("span", { className: "reader-ai-detail-label", children: "结果" }),
        /* @__PURE__ */ r("pre", { children: K(e.output ?? e.content) })
      ] }) : null,
      !e.input && !e.input_preview && !e.output && !e.content ? /* @__PURE__ */ r("p", { children: n ? "正在执行，结果会在这里更新。" : e.summary || "执行已结束。" }) : null
    ] }) })
  ] });
}
function yt({ label: e, running: t, elapsedMs: n = 0 }) {
  const [i, a] = R(n);
  return C(() => {
    if (a(n), !t) return;
    const s = Date.now() - n, c = setInterval(() => a(Date.now() - s), 1e3);
    return () => clearInterval(c);
  }, [t, n]), !t && !n ? null : /* @__PURE__ */ b("div", { className: "reader-ai-run-status", role: "status", "aria-live": "polite", children: [
    t ? /* @__PURE__ */ r(Z, { size: 14, className: "reader-ai-spin", "aria-hidden": "true" }) : /* @__PURE__ */ r(oe, { size: 13, "aria-hidden": "true" }),
    /* @__PURE__ */ r("span", { children: t ? e || "正在处理问题" : "耗时" }),
    /* @__PURE__ */ r("span", { className: "reader-ai-run-elapsed", children: B(i) })
  ] });
}
const xt = le(function({ parts: t = [], content: n, citations: i = [], streaming: a = !1, metrics: s, jobId: c, onJumpCitation: o }) {
  if (!t.length) return /* @__PURE__ */ r(G, { content: n, streaming: a, citations: i, jobId: c, onJumpCitation: o });
  const h = t.map((l) => l.type).lastIndexOf("text"), d = [];
  return t.forEach((l, u) => {
    var f;
    l.type === "text" ? d.push({ key: l.id, parts: [l], textIndex: u }) : ((f = d.at(-1)) == null ? void 0 : f.textIndex) === void 0 && d.length ? d.at(-1).parts.push(l) : d.push({ key: l.id, parts: [l] });
  }), /* @__PURE__ */ b("div", { className: "reader-ai-turn-content", children: [
    d.map((l) => l.textIndex != null ? /* @__PURE__ */ r(
      G,
      {
        content: l.parts[0].text || "",
        streaming: a && l.textIndex === h,
        citations: i,
        citationFooterMax: l.textIndex === h ? 8 : 0,
        jobId: c,
        onJumpCitation: o
      },
      l.key
    ) : /* @__PURE__ */ r("div", { children: /* @__PURE__ */ b("details", { className: "reader-ai-activity-group", "aria-label": "执行过程", open: a, children: [
      /* @__PURE__ */ b("summary", { className: "reader-ai-activity-group-head", children: [
        /* @__PURE__ */ r(ce, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ r("span", { children: "思考与执行" }),
        /* @__PURE__ */ b("span", { className: "reader-ai-activity-summary", children: [
          l.parts.length,
          " 个步骤"
        ] }),
        /* @__PURE__ */ r(D, { size: 13, className: "reader-ai-details-chevron", "aria-hidden": "true" })
      ] }),
      /* @__PURE__ */ r("div", { className: "reader-ai-activity-list", children: l.parts.map((u) => /* @__PURE__ */ r(ut, { part: u, running: a }, u.id)) })
    ] }) }, l.key)),
    !a && (s != null && s.usage) ? /* @__PURE__ */ b("details", { className: "reader-ai-usage", children: [
      /* @__PURE__ */ b("summary", { children: [
        "上下文与用量",
        /* @__PURE__ */ r(D, { size: 12, "aria-hidden": "true" })
      ] }),
      /* @__PURE__ */ r("dl", { className: "reader-ai-usage-facts", children: Object.entries({
        "输入 Token": s.usage.input_tokens ?? s.usage.prompt_tokens ?? s.usage.used,
        "输出 Token": s.usage.output_tokens ?? s.usage.completion_tokens,
        上下文上限: s.usage.size ?? s.usage.context_window,
        首段正文: s.first_text_ms != null ? B(s.first_text_ms) : void 0
      }).filter(([, l]) => l != null).map(([l, u]) => /* @__PURE__ */ b("div", { children: [
        /* @__PURE__ */ r("dt", { children: l }),
        /* @__PURE__ */ r("dd", { children: String(u) })
      ] }, l)) })
    ] }) : null
  ] });
});
export {
  G as A,
  yt as a,
  xt as b
};
//# sourceMappingURL=AiTurnContent-C3qL5AqK.js.map
