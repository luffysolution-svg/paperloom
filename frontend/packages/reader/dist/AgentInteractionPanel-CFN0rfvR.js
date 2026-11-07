import { jsxs as f, jsx as r, Fragment as H } from "react/jsx-runtime";
import { useId as Q, useState as k, useCallback as T, useRef as S, useEffect as $, useLayoutEffect as H2, createContext as E2, useContext as o2, useMemo as d2 } from "react";
import { D as y2, g as R2, m as F2, F as Y, E as A2, B as z2, d as B2, k as O2, o as T2, j as q2, z as V2, l as u2, C as m2 } from "./answer-enhance-DShVYmyb.js";
import j2, { setCustomComponents as U2, PreCodeNode as G2, MathInlineNode as W2 } from "markstream-react";
import { createPortal as Z2 } from "react-dom";
import { Popover as R } from "radix-ui";
import { Plug as K2, ChevronDown as x2, Search as Y2, Loader2 as k2, RefreshCw as L2, Check as r2, Plus as h2, ChevronLeft as p2, ChevronRight as J, Settings2 as X2, ShieldCheck as Q2 } from "lucide-react";
import { AI_AGENT_EVENT as j, AI_CONNECTIONS_CHANGED as g2, AI_SELECTION_CHANGED as f2, saveAiSelection as C2, probeAiConnection as J2, selectionForRequest as e0, fetchAiConnections as t0, answerAgentInteraction as n0 } from "@retainpdf/api";
const r0 = "retainpdf-chart", a0 = 6, i0 = 40, o0 = /* @__PURE__ */ new Set(["bar", "line", "pie"]);
function l0(e) {
  if (typeof e == "number") return Number.isFinite(e) ? e : null;
  if (typeof e == "string" && e.trim()) {
    const t = Number(e);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}
function V(e, t = "") {
  return `${e ?? ""}`.trim() || t;
}
function s0(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const a of e) {
    if (!a || typeof a != "object") continue;
    const i = a, n = l0(i.value ?? i.y);
    if (n !== null && (t.push({ label: V(i.label ?? i.x, `${t.length + 1}`), value: n }), t.length >= i0))
      break;
  }
  return t;
}
function c0(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const a of e) {
    if (!a || typeof a != "object") continue;
    const i = a, n = s0(i.points ?? i.data);
    if (n.length && (t.push({ name: V(i.name, `系列 ${t.length + 1}`), points: n }), t.length >= a0))
      break;
  }
  return t;
}
function d0(e) {
  const t = `${e || ""}`.trim();
  if (!t) return null;
  let a;
  try {
    a = JSON.parse(t);
  } catch {
    return null;
  }
  if (!a || typeof a != "object" || Array.isArray(a)) return null;
  const i = a, n = `${i.kind ?? i.type ?? ""}`.trim().toLowerCase();
  if (!o0.has(n)) return null;
  const o = c0(i.series);
  if (!o.length) return null;
  const s = n === "pie" ? o.slice(0, 1) : o;
  return {
    kind: n,
    title: V(i.title),
    xLabel: V(i.xLabel ?? i.x_label),
    yLabel: V(i.yLabel ?? i.y_label),
    series: s
  };
}
function u0(e) {
  const t = e.series.flatMap((s) => s.points.map((l) => l.value)), a = Math.min(...t), i = Math.max(...t), n = Math.min(0, a), o = Math.max(0, i);
  return n === o ? { min: n, max: o + 1 } : { min: n, max: o };
}
function l2(e) {
  let t = [];
  for (const a of e.series)
    a.points.length > t.length && (t = a.points);
  return t.map((a) => a.label);
}
const N2 = 640, s2 = 300, M = { top: 16, right: 16, bottom: 44, left: 52 }, z = N2 - M.left - M.right, I = s2 - M.top - M.bottom, D2 = [
  "var(--chart-1, #4c6ef5)",
  "var(--chart-2, #f08c00)",
  "var(--chart-3, #2f9e44)",
  "var(--chart-4, #e03131)",
  "var(--chart-5, #ae3ec9)",
  "var(--chart-6, #0c8599)"
], U = (e) => D2[e % D2.length];
function m0(e, t) {
  return Array.from({ length: 5 }, (i, n) => e + (t - e) * n / 4);
}
function h0(e) {
  const t = Math.abs(e);
  return t >= 1e4 ? `${(e / 1e3).toFixed(0)}k` : Number.isInteger(e) ? `${e}` : e.toFixed(t < 1 ? 2 : 1);
}
function p0(e) {
  return e <= 8 ? 1 : Math.ceil(e / 8);
}
function g0({
  spec: e,
  min: t,
  max: a,
  labels: i
}) {
  const n = (l) => M.top + I - (l - t) / (a - t) * I, o = p0(i.length), s = z / Math.max(1, i.length);
  return /* @__PURE__ */ f("g", { className: "reader-answer-chart-axes", children: [
    m0(t, a).map((l) => /* @__PURE__ */ f("g", { children: [
      /* @__PURE__ */ r(
        "line",
        {
          className: "reader-answer-chart-grid",
          x1: M.left,
          x2: M.left + z,
          y1: n(l),
          y2: n(l)
        }
      ),
      /* @__PURE__ */ r("text", { className: "reader-answer-chart-tick", x: M.left - 8, y: n(l), textAnchor: "end", dominantBaseline: "middle", children: h0(l) })
    ] }, l)),
    i.map((l, g) => g % o === 0 ? /* @__PURE__ */ r(
      "text",
      {
        className: "reader-answer-chart-tick",
        x: M.left + s * (g + 0.5),
        y: M.top + I + 18,
        textAnchor: "middle",
        children: l.length > 10 ? `${l.slice(0, 9)}…` : l
      },
      `${l}-${g}`
    ) : null),
    e.yLabel ? /* @__PURE__ */ r("text", { className: "reader-answer-chart-axis-label", x: M.left, y: M.top - 4, textAnchor: "start", children: e.yLabel }) : null,
    e.xLabel ? /* @__PURE__ */ r(
      "text",
      {
        className: "reader-answer-chart-axis-label",
        x: M.left + z,
        y: s2 - 6,
        textAnchor: "end",
        children: e.xLabel
      }
    ) : null
  ] });
}
function f0({ spec: e, min: t, max: a }) {
  const i = l2(e), n = z / Math.max(1, i.length), o = n * 0.7, s = o / e.series.length, l = (m) => M.top + I - (m - t) / (a - t) * I, g = l(0);
  return /* @__PURE__ */ r(H, { children: e.series.map((m, d) => /* @__PURE__ */ r("g", { fill: U(d), children: m.points.map((h, v) => {
    const C = l(h.value), E = M.left + n * v + (n - o) / 2 + s * d;
    return /* @__PURE__ */ r(
      "rect",
      {
        x: E,
        y: Math.min(C, g),
        width: Math.max(1, s - 1),
        height: Math.max(1, Math.abs(g - C)),
        rx: 2,
        children: /* @__PURE__ */ r("title", { children: `${m.name} · ${h.label}: ${h.value}` })
      },
      `${h.label}-${v}`
    );
  }) }, m.name)) });
}
function C0({ spec: e, min: t, max: a }) {
  const i = l2(e), n = z / Math.max(1, i.length), o = (l) => M.top + I - (l - t) / (a - t) * I, s = (l) => M.left + n * (l + 0.5);
  return /* @__PURE__ */ r(H, { children: e.series.map((l, g) => {
    const m = l.points.map((d, h) => `${h === 0 ? "M" : "L"} ${s(h)} ${o(d.value)}`).join(" ");
    return /* @__PURE__ */ f("g", { stroke: U(g), fill: U(g), children: [
      /* @__PURE__ */ r("path", { className: "reader-answer-chart-line", d: m, fill: "none" }),
      l.points.map((d, h) => /* @__PURE__ */ r(
        "circle",
        {
          cx: s(h),
          cy: o(d.value),
          r: 3,
          stroke: "none",
          children: /* @__PURE__ */ r("title", { children: `${l.name} · ${d.label}: ${d.value}` })
        },
        `${d.label}-${h}`
      ))
    ] }, l.name);
  }) });
}
function D0({ spec: e }) {
  var g;
  const t = ((g = e.series[0]) == null ? void 0 : g.points) ?? [], a = t.map((m) => Math.max(0, m.value)), i = a.reduce((m, d) => m + d, 0);
  if (i <= 0) return null;
  const n = M.left + z / 2, o = M.top + I / 2, s = Math.min(z, I) / 2 - 8;
  let l = -Math.PI / 2;
  return /* @__PURE__ */ r(H, { children: t.map((m, d) => {
    const h = a[d] / i, v = l + h * Math.PI * 2, C = n + s * Math.cos(l), E = o + s * Math.sin(l), p = n + s * Math.cos(v), y = o + s * Math.sin(v), A = h > 0.5 ? 1 : 0, u = h >= 1 ? `M ${n} ${o - s} A ${s} ${s} 0 1 1 ${n - 0.01} ${o - s} Z` : `M ${n} ${o} L ${C} ${E} A ${s} ${s} 0 ${A} 1 ${p} ${y} Z`;
    return l = v, /* @__PURE__ */ r("path", { d: u, fill: U(d), children: /* @__PURE__ */ r("title", { children: `${m.label}: ${m.value}（${(h * 100).toFixed(1)}%）` }) }, `${m.label}-${d}`);
  }) });
}
function v0({ spec: e }) {
  var a;
  const t = e.kind === "pie" ? (((a = e.series[0]) == null ? void 0 : a.points) ?? []).map((i) => i.label) : e.series.map((i) => i.name);
  return t.length < 2 ? null : /* @__PURE__ */ r("ul", { className: "reader-answer-chart-legend", children: t.map((i, n) => /* @__PURE__ */ f("li", { children: [
    /* @__PURE__ */ r("span", { className: "reader-answer-chart-swatch", style: { background: U(n) }, "aria-hidden": !0 }),
    i
  ] }, `${i}-${n}`)) });
}
function b0({ spec: e }) {
  const t = Q(), { min: a, max: i } = u0(e), n = l2(e), o = e.title || `${e.series.length} 个系列的${e.kind === "pie" ? "占比" : "对比"}图`;
  return /* @__PURE__ */ f("figure", { className: "reader-answer-chart", children: [
    /* @__PURE__ */ f(
      "svg",
      {
        className: `reader-answer-chart-svg is-${e.kind}`,
        viewBox: `0 0 ${N2} ${s2}`,
        role: "img",
        "aria-labelledby": t,
        preserveAspectRatio: "xMidYMid meet",
        children: [
          /* @__PURE__ */ r("title", { id: t, children: o }),
          e.kind !== "pie" ? /* @__PURE__ */ r(g0, { spec: e, min: a, max: i, labels: n }) : null,
          e.kind === "bar" ? /* @__PURE__ */ r(f0, { spec: e, min: a, max: i }) : null,
          e.kind === "line" ? /* @__PURE__ */ r(C0, { spec: e, min: a, max: i }) : null,
          e.kind === "pie" ? /* @__PURE__ */ r(D0, { spec: e }) : null
        ]
      }
    ),
    /* @__PURE__ */ r(v0, { spec: e }),
    e.title ? /* @__PURE__ */ r("figcaption", { className: "reader-answer-chart-caption", children: e.title }) : null
  ] });
}
const w0 = 1600;
function E0(e) {
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
function y0({
  language: e,
  code: t,
  children: a
}) {
  const [i, n] = k(!1), o = E0(e), s = T(() => {
    var g;
    const l = `${t || ""}`;
    l.trim() && ((g = navigator.clipboard) == null || g.writeText(l).then(
      () => {
        var m;
        n(!0), (m = globalThis.setTimeout) == null || m.call(globalThis, () => n(!1), w0);
      },
      () => {
      }
    ));
  }, [t]);
  return /* @__PURE__ */ f("div", { className: "reader-answer-code", children: [
    /* @__PURE__ */ f("div", { className: "reader-answer-code-bar", children: [
      /* @__PURE__ */ r("span", { className: "reader-answer-code-lang", children: o }),
      /* @__PURE__ */ r(
        "button",
        {
          type: "button",
          className: "reader-answer-code-copy",
          onClick: s,
          title: "复制代码",
          children: i ? "已复制" : "复制"
        }
      )
    ] }),
    a
  ] });
}
const F0 = 8, A0 = 8;
function x0(e, t, a, { gap: i = F0, margin: n = A0 } = {}) {
  const o = a.height - e.bottom, s = e.top, l = t.height + i + n, g = o >= l || o >= s ? "bottom" : "top", m = g === "bottom" ? e.bottom + i : e.top - i - t.height, d = Math.max(n, a.height - t.height - n), h = Math.min(Math.max(m, n), d), v = e.left + e.width / 2 - t.width / 2, C = Math.max(n, a.width - t.width - n);
  return { left: Math.min(Math.max(v, n), C), top: h, placement: g };
}
const k0 = 240, M2 = 180;
function $2(e, t) {
  const a = `${e || ""}`.replace(/\s+/g, " ").trim();
  return a.length <= t ? a : `${a.slice(0, t - 1)}…`;
}
function _2(e, t) {
  return y2(e) === null ? [] : `${e.job_id || t || ""}`.trim() ? ["translated", "source"] : [];
}
function L0(e, t) {
  return _2(e, t).length > 0 || $2(`${e.snippet || ""}`, M2).length > 0;
}
function N0({
  citation: e,
  jobId: t,
  anchor: a,
  cardId: i,
  onPointerEnter: n,
  onPointerLeave: o
}) {
  const s = S(null), l = S(null), g = _2(e, t), m = y2(e), d = m === null ? null : m + 1, h = $2(`${e.snippet || ""}`, M2), [v, C] = k(
    g.length ? "loading" : "none"
  ), [E, p] = k(null);
  $(() => {
    const u = l.current;
    if (!u || !g.length) return;
    const w = `${e.job_id || t || ""}`.trim(), F = new AbortController();
    return (async () => {
      for (const D of g) {
        const b = R2(
          w,
          m ?? 0,
          D,
          {}
        );
        if (!b) break;
        if (u.setAttribute("data-ai-src", b), u.classList.remove("is-missing"), await F2(u, { signal: F.signal }), F.signal.aborted) return;
        if (!u.classList.contains("is-missing")) {
          C("ready");
          return;
        }
      }
      F.signal.aborted || C("failed");
    })(), () => {
      F.abort(), Y(u);
    };
  }, [e, t, m, g.length]), H2(() => {
    const u = s.current;
    if (!u || !a) return;
    const w = () => {
      const F = a.getBoundingClientRect(), D = u.getBoundingClientRect(), b = x0(
        { top: F.top, left: F.left, bottom: F.bottom, width: F.width },
        {
          width: D.width || u.offsetWidth,
          height: D.height || u.offsetHeight
        },
        { width: window.innerWidth || 0, height: window.innerHeight || 0 }
      );
      p((x) => x && x.left === b.left && x.top === b.top && x.placement === b.placement ? x : b);
    };
    return w(), window.addEventListener("scroll", w, !0), window.addEventListener("resize", w), () => {
      window.removeEventListener("scroll", w, !0), window.removeEventListener("resize", w);
    };
  }, [a, v, h]);
  const y = /* @__PURE__ */ f(
    "div",
    {
      ref: s,
      id: i,
      role: "tooltip",
      className: `reader-ai-citation-card${E ? " is-placed" : ""}`,
      "data-placement": (E == null ? void 0 : E.placement) || "bottom",
      style: { left: `${(E == null ? void 0 : E.left) ?? 0}px`, top: `${(E == null ? void 0 : E.top) ?? 0}px` },
      onMouseEnter: n,
      onMouseLeave: o,
      children: [
        g.length ? /* @__PURE__ */ f("div", { className: "reader-ai-citation-card-figure", "data-state": v, children: [
          /* @__PURE__ */ r(
            "img",
            {
              ref: l,
              alt: d ? `第 ${d} 页预览` : "来源页预览",
              className: "reader-ai-citation-card-thumb",
              decoding: "async",
              width: k0
            }
          ),
          v === "failed" ? /* @__PURE__ */ r("span", { className: "reader-ai-citation-card-thumb-fallback", children: "预览暂不可用" }) : null
        ] }) : null,
        /* @__PURE__ */ f("div", { className: "reader-ai-citation-card-text", children: [
          /* @__PURE__ */ r("div", { className: "reader-ai-citation-card-head", children: d ? `第 ${d} 页` : "来源" }),
          h ? /* @__PURE__ */ r("p", { className: "reader-ai-citation-card-snippet", children: h }) : null
        ] })
      ]
    }
  ), A = typeof document > "u" ? null : document.body;
  return A ? Z2(y, A) : y;
}
const M0 = 140, v2 = 180;
function $0({ citation: e, label: t, jobId: a, onJump: i }) {
  const [n, o] = k(!1), s = S(null), l = S(null), g = `reader-ai-citation-card-${Q().replace(/[^a-zA-Z0-9_-]/g, "")}`, m = A2(e), d = L0(e, a), h = T(() => {
    l.current !== null && (clearTimeout(l.current), l.current = null);
  }, []), v = T((p, y) => {
    h(), l.current = setTimeout(() => {
      l.current = null, o(p);
    }, y);
  }, [h]);
  $(() => () => h(), [h]), $(() => {
    d || o(!1);
  }, [d]);
  const C = T(() => {
    h(), o(!0);
  }, [h]), E = T(() => {
    h(), o(!1);
  }, [h]);
  return /* @__PURE__ */ f(H, { children: [
    /* @__PURE__ */ f(
      "button",
      {
        ref: s,
        type: "button",
        className: "reader-ai-citation-ref",
        "data-page": m ?? void 0,
        "aria-describedby": n ? g : void 0,
        "aria-expanded": d ? n : void 0,
        title: m ? `跳到第 ${m} 页` : "定位来源",
        onClick: (p) => {
          p.preventDefault(), p.stopPropagation(), E(), i == null || i(e);
        },
        onMouseEnter: d ? () => v(!0, M0) : void 0,
        onMouseLeave: d ? () => v(!1, v2) : void 0,
        onFocus: d ? C : void 0,
        onBlur: d ? E : void 0,
        onKeyDown: (p) => {
          p.key === "Escape" && n && (p.stopPropagation(), E());
        },
        children: [
          "[",
          t,
          "]"
        ]
      }
    ),
    n && d ? /* @__PURE__ */ r(
      N0,
      {
        citation: e,
        jobId: a,
        anchor: s.current,
        cardId: g,
        onPointerEnter: C,
        onPointerLeave: () => v(!1, v2)
      }
    ) : null
  ] });
}
const I2 = "retainpdf-ai-answer", b2 = 320, _0 = 2, c2 = E2({
  final: !1,
  jobId: "",
  citations: []
});
function I0(e) {
  const t = Number(e.naturalWidth) || 0, a = e.closest(".reader-ai-image-jump"), i = a || e, n = t > 0 && t < b2;
  if (e.classList.toggle("is-low-resolution", n), a == null || a.classList.toggle("is-low-resolution", n), n) {
    const o = Math.min(
      b2,
      Math.max(t, t * _0)
    );
    i.style.setProperty("--reader-ai-image-width", `${o}px`);
  } else
    i.style.removeProperty("--reader-ai-image-width");
}
function S0({ node: e }) {
  const { final: t, jobId: a, citations: i, onJumpCitation: n } = o2(c2), o = S(null), s = S(null), l = `${e.alt || ""}`.trim(), g = z2(e.src, a, {}, B2(i)), m = O2(e.src, i, a), d = A2(m), h = T((C) => {
    var y;
    const E = o.current;
    if (E === C || ((y = s.current) == null || y.abort(), s.current = null, E && Y(E), o.current = C, !C || !g)) return;
    const p = new AbortController();
    s.current = p, (async () => {
      for (const A of [0, 250, 750, 1500]) {
        if (A && await new Promise((w) => globalThis.setTimeout(w, A)), p.signal.aborted) return;
        const u = o.current;
        if (!u || u !== C || u.classList.contains("is-hydrated") && u.src.startsWith("blob:")) return;
        await F2(u, { signal: p.signal });
      }
    })();
  }, [g]);
  if ($(() => () => {
    var C;
    (C = s.current) == null || C.abort(), s.current = null, Y(o.current), o.current = null;
  }, []), !g)
    return t ? /* @__PURE__ */ r("span", { className: "aui-image-blocked", children: l ? `[图片不可用：${l}]` : "[图片不可用]" }) : /* @__PURE__ */ r("span", { className: "aui-image-pending", "aria-label": l || "图片加载中", children: l ? `[图片：${l}]` : "[图片加载中]" });
  const v = /* @__PURE__ */ r(
    "img",
    {
      ref: h,
      alt: l,
      "data-ai-src": g,
      decoding: "async",
      loading: "lazy",
      onLoad: (C) => I0(C.currentTarget),
      title: e.title || void 0
    }
  );
  return !m || !n ? v : /* @__PURE__ */ f(
    "button",
    {
      type: "button",
      className: "reader-ai-image-jump",
      "data-page": d ?? void 0,
      title: d ? `定位到 PDF 第 ${d} 页` : "定位到图片来源",
      onClick: (C) => {
        C.preventDefault(), C.stopPropagation(), n({ ...m, image_url: g });
      },
      children: [
        v,
        /* @__PURE__ */ r("span", { className: "reader-ai-image-jump-label", "aria-hidden": "true", children: d ? `定位 p.${d}` : "定位来源" })
      ]
    }
  );
}
function P0({ node: e }) {
  const { citations: t, jobId: a, onJumpCitation: i } = o2(c2), n = `${e.href || ""}`.match(/^#retainpdf-citation-(\d+)$/), o = n ? t.find((l) => `${l.ref}` === n[1]) : null;
  if (o)
    return /* @__PURE__ */ r(
      $0,
      {
        citation: o,
        label: `${(n == null ? void 0 : n[1]) ?? ""}`,
        jobId: a,
        onJump: i
      }
    );
  const s = `${e.text || e.href || ""}`.trim();
  return /* @__PURE__ */ r(
    "span",
    {
      className: "aui-md-extlink",
      "data-href": `${e.href || ""}`.trim() || void 0,
      title: s || void 0,
      children: s
    }
  );
}
function H0(e) {
  const t = e.node;
  if (`${(t == null ? void 0 : t.language) || ""}`.trim().toLowerCase() === r0) {
    const a = d0(`${(t == null ? void 0 : t.code) || ""}`);
    if (a) return /* @__PURE__ */ r(b0, { spec: a });
  }
  return /* @__PURE__ */ r(y0, { language: `${(t == null ? void 0 : t.language) || ""}`, code: `${(t == null ? void 0 : t.code) || ""}`, children: /* @__PURE__ */ r(G2, { node: e.node }) });
}
function R0({ node: e }) {
  return /* @__PURE__ */ r(
    W2,
    {
      node: e.markup === "$$" ? { ...e, markup: "$" } : e
    }
  );
}
U2(I2, {
  image: S0,
  link: P0,
  math_inline: R0,
  code_block: H0
});
function z0({
  content: e,
  final: t,
  indexKey: a,
  jobId: i,
  citations: n = [],
  onJumpCitation: o,
  onClickCapture: s
}) {
  return /* @__PURE__ */ r(c2.Provider, { value: { final: t, jobId: i, citations: n, onJumpCitation: o }, children: /* @__PURE__ */ r(
    "div",
    {
      className: "retain-markstream-shell",
      "data-markdown-renderer": "markstream-react",
      onClickCapture: s,
      children: /* @__PURE__ */ r(
        j2,
        {
          batchRendering: !t,
          content: e,
          customId: I2,
          fade: !1,
          final: t,
          htmlPolicy: "escape",
          indexKey: a,
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
function K0({
  content: e,
  streaming: t = !1,
  citations: a = [],
  jobId: i = "",
  className: n = "",
  streamingClassName: o = "",
  pendingClassName: s = "",
  finalClassName: l = "",
  citationFooterMax: g = 5,
  onJumpCitation: m
}) {
  var A;
  const d = S(null), h = Q(), v = t ? `${e || ""}` : `${e || ""}`.trim(), C = `${i || ((A = a.find((u) => u.job_id)) == null ? void 0 : A.job_id) || ""}`.trim(), E = d2(() => {
    const u = /* @__PURE__ */ new Map();
    for (const w of a)
      T2(w) && u.set(`${w.ref}`, w);
    return u;
  }, [a]), p = d2(
    () => q2(v, E),
    [v, E]
  );
  return $(() => {
    var F;
    const u = d.current;
    if (!u || !v) return;
    const w = u.parentElement;
    if (w instanceof HTMLElement) {
      if (t) {
        (F = w.querySelector(".reader-ai-citations")) == null || F.remove();
        return;
      }
      V2(w, a, {
        onJump: (D) => m == null ? void 0 : m(D),
        answerText: v,
        max: g
      });
    }
  }, [t, C, E, a, m, v, g]), $(() => () => Y(d.current), []), v.trim() ? /* @__PURE__ */ r("div", { ref: d, className: `${n} ${t ? o : l || s}`.trim(), children: /* @__PURE__ */ r(
    z0,
    {
      content: p,
      final: !t,
      indexKey: h,
      jobId: C,
      citations: a,
      onJumpCitation: m,
      onClickCapture: (u) => {
        const w = u.target;
        w instanceof Element && w.closest("a[href]") && (u.preventDefault(), u.stopPropagation());
      }
    }
  ) }) : null;
}
const e2 = [
  { id: "openai", name: "OpenAI", brand: "codex", baseUrl: "https://api.openai.com/v1", protocol: "openai_responses", keyUrl: "https://platform.openai.com/api-keys" },
  { id: "anthropic", name: "Anthropic / Claude", brand: "claude", baseUrl: "https://api.anthropic.com/v1", protocol: "anthropic", keyUrl: "https://console.anthropic.com/settings/keys" },
  { id: "deepseek", name: "DeepSeek", brand: "deepseek", baseUrl: "https://api.deepseek.com/v1", protocol: "openai", keyUrl: "https://platform.deepseek.com/api_keys" },
  { id: "openrouter", name: "OpenRouter", brand: "openrouter", baseUrl: "https://openrouter.ai/api/v1", protocol: "openai", keyUrl: "https://openrouter.ai/settings/keys" },
  { id: "qwen", name: "通义千问", brand: "qwen", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", protocol: "openai" },
  { id: "custom", name: "其他模型服务", brand: "custom", baseUrl: "", protocol: "openai" }
], S2 = {
  "codex-acp": "codex",
  "claude-acp": "claude",
  opencode: "opencode",
  pi: "pi",
  "grok-build": "grok",
  codebuddy: "codebuddy",
  "cursor-agent": "cursor",
  hermes: "hermes",
  "antigravity-acp": "antigravity",
  qodercli: "qoder",
  "qoder-cn": "qoder",
  dsh: "deepseek",
  "kimi-code": "kimi",
  zcode: "zai",
  "minimax-code": "minimax",
  "mimo-code": "mimo"
};
function a2(e) {
  if (e.provider) return e2.find((i) => i.id === e.provider) || e2.at(-1);
  const t = e.base_url.toLowerCase(), a = t.includes("anthropic") ? "anthropic" : t.includes("deepseek") ? "deepseek" : t.includes("openrouter") ? "openrouter" : t.includes("dashscope") ? "qwen" : t.includes("openai.com") ? "openai" : "custom";
  return e2.find((i) => i.id === a);
}
function t2(e) {
  return e.kind === "byoa" ? S2[e.preset] || "custom" : a2(e).brand;
}
function Y0(e) {
  return S2[e] || "custom";
}
function W(e) {
  return e.id === "legacy" && e.name === "现有模型连接" ? a2(e).id === "custom" ? "默认模型服务" : a2(e).name : e.name;
}
function w2(e, t = !1) {
  return !e.legacy_inherited || !!(e.api_key_configured || t);
}
const B0 = {
  codex: {
    image: "data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22currentColor%22%20fill-rule%3D%22evenodd%22%20aria-hidden%3D%22true%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%23000000%22%3E%3Ctitle%3EOpenAI%3C%2Ftitle%3E%3Cpath%20d%3D%22M21.55%2010.004a5.416%205.416%200%2000-.478-4.501c-1.217-2.09-3.662-3.166-6.05-2.66A5.59%205.59%200%200010.831%201C8.39.995%206.224%202.546%205.473%204.838A5.553%205.553%200%20001.76%207.496a5.487%205.487%200%2000.691%206.5%205.416%205.416%200%2000.477%204.502c1.217%202.09%203.662%203.165%206.05%202.66A5.586%205.586%200%200013.168%2023c2.443.006%204.61-1.546%205.361-3.84a5.553%205.553%200%20003.715-2.66%205.488%205.488%200%2000-.693-6.497v.001zm-8.381%2011.558a4.199%204.199%200%2001-2.675-.954c.034-.018.093-.05.132-.074l4.44-2.53a.71.71%200%2000.364-.623v-6.176l1.877%201.069c.02.01.033.029.036.05v5.115c-.003%202.274-1.87%204.118-4.174%204.123zM4.192%2017.78a4.059%204.059%200%2001-.498-2.763c.032.02.09.055.131.078l4.44%202.53c.225.13.504.13.73%200l5.42-3.088v2.138a.068.068%200%2001-.027.057L9.9%2019.288c-1.999%201.136-4.552.46-5.707-1.51h-.001zM3.023%208.216A4.15%204.15%200%20015.198%206.41l-.002.151v5.06a.711.711%200%2000.364.624l5.42%203.087-1.876%201.07a.067.067%200%2001-.063.005l-4.489-2.559c-1.995-1.14-2.679-3.658-1.53-5.63h.001zm15.417%203.54l-5.42-3.088L14.896%207.6a.067.067%200%2001.063-.006l4.489%202.557c1.998%201.14%202.683%203.662%201.529%205.633a4.163%204.163%200%2001-2.174%201.807V12.38a.71.71%200%2000-.363-.623zm1.867-2.773a6.04%206.04%200%2000-.132-.078l-4.44-2.53a.731.731%200%2000-.729%200l-5.42%203.088V7.325a.068.068%200%2001.027-.057L14.1%204.713c2-1.137%204.555-.46%205.707%201.513.487.833.664%201.809.499%202.757h.001zm-11.741%203.81l-1.877-1.068a.065.065%200%2001-.036-.051V6.559c.001-2.277%201.873-4.122%204.181-4.12.976%200%201.92.338%202.671.954-.034.018-.092.05-.131.073l-4.44%202.53a.71.71%200%2000-.365.623l-.003%206.173v.002zm1.02-2.168L12%209.25l2.414%201.375v2.75L12%2014.75l-2.415-1.375v-2.75z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E",
    monochrome: !0
  },
  claude: {
    image: "data:image/svg+xml,%3Csvg%20stroke%3D%22currentColor%22%20fill%3D%22currentColor%22%20stroke-width%3D%220%22%20role%3D%22img%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%23D97757%22%20height%3D%221em%22%20width%3D%221em%22%3E%3Cpath%20d%3D%22m4.7144%2015.9555%204.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608%201.5179.1032%202.2767.1578%201.6514.0972%202.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973%209.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686%201.9064%201.4754%202.4893%201.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335%206.6997%200l.9957.1336.419.3642.6192%201.4147%201.0018%202.2282%201.5543%203.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853%201.8517-.5586%202.9021-.3643%201.9429h.2125l.2429-.2429.9835-1.3053%201.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759%201.1293-.34%201.1657-1.0625%201.3478-.8804%201.1414-1.2628%201.7-.7893%201.36.0729.1093.1882-.0183%202.8535-.607%201.5421-.2794%201.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607%201.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929%201.0686%202.0035%201.8092%202.5075%202.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496%202.3436%203.5214.1214%201.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38%2017.959l-1.1414-1.9428-.1397.079-.674%207.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328%201.9672-2.1796%202.9446-1.7243%201.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889%202.386-3.0357%201.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385%204.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429%201.9064-1.3114Z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E",
    monochrome: !1
  },
  opencode: {
    image: "data:image/svg+xml,%3Csvg%20stroke%3D%22currentColor%22%20fill%3D%22currentColor%22%20stroke-width%3D%220%22%20role%3D%22img%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%23000000%22%20height%3D%221em%22%20width%3D%221em%22%3E%3Cpath%20d%3D%22M22%2024H2V0h20zM17%204.8H7v14.4h10z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E",
    monochrome: !0
  },
  cursor: {
    image: "data:image/svg+xml,%3Csvg%20stroke%3D%22currentColor%22%20fill%3D%22currentColor%22%20stroke-width%3D%220%22%20role%3D%22img%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%23000000%22%20height%3D%221em%22%20width%3D%221em%22%3E%3Cpath%20d%3D%22M11.503.131%201.891%205.678a.84.84%200%200%200-.42.726v11.188c0%20.3.162.575.42.724l9.609%205.55a1%201%200%200%200%20.998%200l9.61-5.55a.84.84%200%200%200%20.42-.724V6.404a.84.84%200%200%200-.42-.726L12.497.131a1.01%201.01%200%200%200-.996%200M2.657%206.338h18.55c.263%200%20.43.287.297.515L12.23%2022.918c-.062.107-.229.064-.229-.06V12.335a.59.59%200%200%200-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E",
    monochrome: !0
  },
  hermes: {
    image: "data:image/svg+xml,%3Csvg%20stroke%3D%22currentColor%22%20fill%3D%22currentColor%22%20stroke-width%3D%220%22%20role%3D%22img%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%238B5E3C%22%20height%3D%221em%22%20width%3D%221em%22%3E%3Cpath%20d%3D%22m21.818%204.516-1.05%204.148h2.175L24%204.516M19.41%2014.04h2.17l1.04-4.08h-2.178m-2.41%209.523h2.154l1.056-4.147h-2.16m.193-5.377H5.55v.92l3.341%203.161h9.349m2.41-9.525H0v1.116l3.206%203.032H19.6m-8.372%207.58%203.43%203.24h2.205l1.05-4.147h-6.685%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E",
    monochrome: !1
  },
  grok: {
    image: "data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22currentColor%22%20fill-rule%3D%22evenodd%22%20aria-hidden%3D%22true%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%23000000%22%3E%3Ctitle%3EGrok%3C%2Ftitle%3E%3Cpath%20d%3D%22M9.27%2015.29l7.978-5.897c.391-.29.95-.177%201.137.272.98%202.369.542%205.215-1.41%207.169-1.951%201.954-4.667%202.382-7.149%201.406l-2.711%201.257c3.889%202.661%208.611%202.003%2011.562-.953%202.341-2.344%203.066-5.539%202.388-8.42l.006.007c-.983-4.232.242-5.924%202.75-9.383.06-.082.12-.164.179-.248l-3.301%203.305v-.01L9.267%2015.292M7.623%2016.723c-2.792-2.67-2.31-6.801.071-9.184%201.761-1.763%204.647-2.483%207.166-1.425l2.705-1.25a7.808%207.808%200%2000-1.829-1A8.975%208.975%200%20005.984%205.83c-2.533%202.536-3.33%206.436-1.962%209.764%201.022%202.487-.653%204.246-2.34%206.022-.599.63-1.199%201.259-1.682%201.925l7.62-6.815%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E",
    monochrome: !0
  },
  pi: {
    image: "data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20800%20800%22%20fill%3D%22currentColor%22%20fill-rule%3D%22evenodd%22%20aria-hidden%3D%22true%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%23000000%22%3E%3Ctitle%3EPi%3C%2Ftitle%3E%3Cpath%20d%3D%22M165.29%20165.29H517.36V400H400V517.36H282.65V634.72H165.29ZM282.65%20282.65V400H400V282.65Z%22%3E%3C%2Fpath%3E%3Cpath%20d%3D%22M517.36%20400H634.72V634.72H517.36Z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E",
    monochrome: !0
  },
  deepseek: {
    image: "data:image/svg+xml,%3Csvg%20stroke%3D%22currentColor%22%20fill%3D%22currentColor%22%20stroke-width%3D%220%22%20role%3D%22img%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%234D6BFE%22%20height%3D%221em%22%20width%3D%221em%22%3E%3Cpath%20d%3D%22M23.748%204.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434%201.202-.422%201.84.027%201.436.633%202.58%201.838%203.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5%205.5%200%200%201-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12%2012%200%200%200-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3%203%200%200%201-.465.136%209.6%209.6%200%200%200-2.883-.101c-1.885.21-3.39%201.1-4.497%202.622C.082%208.776-.231%2010.854.152%2013.02c.403%202.284%201.568%204.175%203.36%205.653%201.857%201.533%203.997%202.284%206.438%202.14%201.482-.085%203.132-.284%204.994-1.86.47.234.962.328%201.78.398.629.058%201.235-.031%201.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926%201.095-1.295%202.768-3.598%203.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2%204.2%200%200%200%201.545-.475c1.397-.763%201.96-2.016%202.093-3.517.02-.23-.004-.467-.247-.588M11.58%2018.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7%204.7%200%200%201%201.53-.038c2.131.311%203.946%201.264%205.467%202.774.868.86%201.525%201.887%202.202%202.89.72%201.066%201.494%202.082%202.48%202.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306%200%200%201%20.415-.287.3.3%200%200%201%20.113.074.3.3%200%200%201%20.086.214c0%20.17-.136.307-.308.307a.303.303%200%200%201-.306-.307m3.11%201.596c-.2.081-.4.151-.591.16a1.25%201.25%200%200%201-.798-.254c-.274-.23-.47-.358-.551-.758a1.7%201.7%200%200%201%20.015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6%200%200%201-.254-.078.253.253%200%200%201-.114-.358%201%201%200%200%201%20.192-.21c.356-.202.767-.136%201.146.016.352.144.618.408%201.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E",
    monochrome: !1
  },
  kimi: {
    image: "data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20aria-hidden%3D%22true%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%23000000%22%3E%3Ctitle%3EKimi%20Code%3C%2Ftitle%3E%3Crect%20x%3D%221%22%20y%3D%221%22%20width%3D%2222%22%20height%3D%2222%22%20rx%3D%225.5%22%20fill%3D%22%230A0A0A%22%3E%3C%2Frect%3E%3Cpath%20d%3D%22M7.6%205.9V18.1M9.9%2010.7L15%206.3M9.9%2013.9L16.2%2018.1%22%20stroke%3D%22%23FFFFFF%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3C%2Fpath%3E%3Ccircle%20cx%3D%2216.9%22%20cy%3D%225.1%22%20r%3D%221.7%22%20fill%3D%22%231783FF%22%3E%3C%2Fcircle%3E%3C%2Fsvg%3E",
    monochrome: !1
  },
  zai: {
    image: "data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20aria-hidden%3D%22true%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%23000000%22%3E%3Ctitle%3EZCode%3C%2Ftitle%3E%3Crect%20x%3D%221%22%20y%3D%221%22%20width%3D%2222%22%20height%3D%2222%22%20rx%3D%225.5%22%20fill%3D%22%230A0A0A%22%3E%3C%2Frect%3E%3Cg%20fill%3D%22%23FFFFFF%22%20transform%3D%22translate(2.6%200)%20skewX(-12)%22%3E%3Crect%20x%3D%226%22%20y%3D%225.6%22%20width%3D%2212%22%20height%3D%222.7%22%3E%3C%2Frect%3E%3Cpolygon%20points%3D%2215.2%2C5.6%2018%2C5.6%208.8%2C18.4%206%2C18.4%22%3E%3C%2Fpolygon%3E%3Crect%20x%3D%226%22%20y%3D%2215.7%22%20width%3D%2212%22%20height%3D%222.7%22%3E%3C%2Frect%3E%3C%2Fg%3E%3Cpath%20d%3D%22M11.07%2012.69L13.03%2011.31%22%20stroke%3D%22%230A0A0A%22%20stroke-width%3D%221.2%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E",
    monochrome: !1
  },
  minimax: {
    image: "data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20aria-hidden%3D%22true%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%23000000%22%3E%3Ctitle%3EMiniMax%20Code%3C%2Ftitle%3E%3Crect%20x%3D%221%22%20y%3D%221%22%20width%3D%2222%22%20height%3D%2222%22%20rx%3D%225.5%22%20fill%3D%22%23111827%22%3E%3C%2Frect%3E%3Cpath%20d%3D%22M5.5%2017.5V7.1L10.3%2012L15.1%207.1V17.5%22%20stroke%3D%22%23FFFFFF%22%20stroke-width%3D%222.1%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3C%2Fpath%3E%3Cpath%20d%3D%22M18.5%207.1V17.5%22%20stroke%3D%22%2326C6DA%22%20stroke-width%3D%222.1%22%20stroke-linecap%3D%22round%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E",
    monochrome: !1
  },
  mimo: {
    image: "data:image/svg+xml,%3Csvg%20stroke%3D%22currentColor%22%20fill%3D%22currentColor%22%20stroke-width%3D%220%22%20role%3D%22img%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%23FF6900%22%20height%3D%221em%22%20width%3D%221em%22%3E%3Cpath%20d%3D%22M12%200C8.016%200%204.756.255%202.493%202.516.23%204.776%200%208.033%200%2012.012c0%203.98.23%207.235%202.494%209.497C4.757%2023.77%208.017%2024%2012%2024c3.983%200%207.243-.23%209.506-2.491C23.77%2019.247%2024%2015.99%2024%2012.012c0-3.984-.233-7.243-2.502-9.504C19.234.252%2015.978%200%2012%200zM4.906%207.405h5.624c1.47%200%203.007.068%203.764.827.746.746.827%202.233.83%203.676v4.54a.15.15%200%200%201-.152.147h-1.947a.15.15%200%200%201-.152-.148V11.83c-.002-.806-.048-1.634-.464-2.051-.358-.36-1.026-.441-1.72-.458H7.158a.15.15%200%200%200-.151.147v6.98a.15.15%200%200%201-.152.148H4.906a.15.15%200%200%201-.15-.148V7.554a.15.15%200%200%201%20.15-.149zm12.131%200h1.949a.15.15%200%200%201%20.15.15v8.892a.15.15%200%200%201-.15.148h-1.949a.15.15%200%200%201-.151-.148V7.554a.15.15%200%200%201%20.151-.149zM8.92%2010.948h2.046c.083%200%20.15.066.15.147v5.352a.15.15%200%200%201-.15.148H8.92a.15.15%200%200%201-.152-.148v-5.352a.15.15%200%200%201%20.152-.147Z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E",
    monochrome: !1
  },
  codebuddy: {
    image: "data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2040%2040%22%20fill%3D%22none%22%20aria-hidden%3D%22true%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%23000000%22%3E%3Ctitle%3ECodeBuddy%3C%2Ftitle%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22codebuddy-tile%22%20x1%3D%2220%22%20y1%3D%220%22%20x2%3D%2220%22%20y2%3D%2240%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%236C4DFF%22%3E%3C%2Fstop%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23583ED3%22%3E%3C%2Fstop%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22codebuddy-bird%22%20x1%3D%2214.639%22%20y1%3D%2210.7917%22%20x2%3D%2232.1712%22%20y2%3D%2241.1585%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%23FFFFFF%22%20stop-opacity%3D%220.8%22%3E%3C%2Fstop%3E%3Cstop%20offset%3D%220.4377%22%20stop-color%3D%22%23FFFFFF%22%3E%3C%2Fstop%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%2240%22%20height%3D%2240%22%20rx%3D%2220%22%20fill%3D%22url(%23codebuddy-tile)%22%3E%3C%2Frect%3E%3Ccircle%20cx%3D%2212.6%22%20cy%3D%2235%22%20r%3D%2210.5%22%20fill%3D%22%2332E6B9%22%20fill-opacity%3D%220.35%22%3E%3C%2Fcircle%3E%3Cpath%20d%3D%22M27.6897%203.3426C28.057%203.01322%2028.0795%202.99983%2028.3485%202.98366C28.7851%202.95177%2029.1858%203.16107%2029.8664%203.78072C31.4566%205.22574%2033.6703%208.19724%2035.047%2010.7343L35.5796%2011.7191L36.3309%2012.0927C37.0562%2012.4593%2038.2459%2013.2111%2038.7428%2013.614C38.9673%2013.7997%2038.9992%2013.8032%2039.2326%2013.7124C40.2872%2013.3017%2041.7982%2013.846%2043.1307%2015.1244C44.3302%2016.274%2045.479%2018.2384%2045.9191%2019.8778C45.9833%2020.1417%2046.0683%2020.709%2046.0994%2021.1314C46.1997%2022.6144%2045.7243%2023.7986%2044.8085%2024.3349C44.6213%2024.443%2044.6085%2024.4725%2044.6137%2024.939C44.6559%2027.1604%2044.0571%2029.3777%2042.8543%2031.54C41.4965%2033.9678%2039.0794%2036.4798%2035.8073%2038.846C34.0502%2040.1247%2029.8918%2042.5469%2028.0122%2043.3973C23.5096%2045.4244%2019.8999%2046.2022%2016.7645%2045.8181C14.8943%2045.5915%2012.7771%2044.8611%2011.5246%2044.0137C11.1951%2043.786%2011.1428%2043.7719%2010.8909%2043.8439C9.55017%2044.2289%207.79442%2043.4374%206.30272%2041.7817C5.70771%2041.1197%204.74709%2039.4939%204.43575%2038.6241C3.71569%2036.5887%203.85859%2034.752%204.81783%2033.6551C5.0657%2033.3725%205.07387%2033.3607%205.01972%2032.8856C4.93033%2032.1079%204.88982%2030.9566%204.93066%2030.2138L4.96343%2029.5205L3.92091%2027.6777C2.3078%2024.8074%201.28326%2022.3968%200.887982%2020.5554C0.679402%2019.546%200.692781%2019.0981%200.949061%2018.7667C1.10529%2018.5666%201.61622%2018.3594%202.23252%2018.2455C3.78518%2017.9729%207.17203%2018.2198%2010.9394%2018.885L11.3303%2018.9525L12.1903%2018.1921C13.6179%2016.9275%2014.5665%2016.2176%2016.315%2015.1274C18.1373%2013.9872%2020.1943%2013.0498%2022.5103%2012.3071L23.2533%2012.0687L23.6615%2010.9964C25.1239%207.13587%2026.6218%204.28969%2027.6897%203.3426ZM15.4393%2023.1261C13.7864%2024.0804%2012.9602%2024.5582%2012.3529%2025.093C9.89364%2027.2585%208.9738%2030.6888%2010.0208%2033.7938C10.2794%2034.5606%2010.7568%2035.387%2011.7111%2037.0398C12.6653%2038.6926%2013.1424%2039.5194%2013.6771%2040.1267C15.8426%2042.5859%2019.2732%2043.5045%2022.3783%2042.4574C23.145%2042.1989%2023.972%2041.7223%2025.6248%2040.768L35.1333%2035.2783C36.7862%2034.324%2037.6124%2033.8462%2038.2196%2033.3114C40.6789%2031.1459%2041.5988%2027.7156%2040.5518%2024.6105C40.2932%2023.8438%2039.8157%2023.0174%2038.8615%2021.3646C37.9072%2019.7117%2037.4302%2018.885%2036.8955%2018.2777C34.7299%2015.8185%2031.2993%2014.8999%2028.1943%2015.947C27.4275%2016.2055%2026.6006%2016.6821%2024.9478%2017.6364L15.4393%2023.1261Z%22%20fill%3D%22url(%23codebuddy-bird)%22%3E%3C%2Fpath%3E%3Crect%20x%3D%2215.8816%22%20y%3D%2230.0273%22%20width%3D%224.00904%22%20height%3D%228.32646%22%20rx%3D%222.00452%22%20transform%3D%22rotate(-30%2015.8816%2030.0273)%22%20fill%3D%22%23FFFFFF%22%3E%3C%2Frect%3E%3Crect%20x%3D%2226.6978%22%20y%3D%2223.7812%22%20width%3D%224.00904%22%20height%3D%228.32646%22%20rx%3D%222.00452%22%20transform%3D%22rotate(-30%2026.6978%2023.7812)%22%20fill%3D%22%23FFFFFF%22%3E%3C%2Frect%3E%3C%2Fsvg%3E",
    monochrome: !1
  },
  qoder: {
    image: "data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22currentColor%22%20fill-rule%3D%22evenodd%22%20aria-hidden%3D%22true%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%23000000%22%3E%3Ctitle%3EQoder%3C%2Ftitle%3E%3Cpath%20d%3D%22M23.376%2014.458v-4.056c0-2.304-1.003-4.154-2.748-5.075L11.612.574l-.046.086-.045.086c1.68.886%202.644%202.673%202.644%204.902v4.056a7.928%207.928%200%2001-.014.454l-.005.061c-.005.081-.01.164-.018.245a4.897%204.897%200%2001-.011.1l-.01.076c-.008.068-.015.135-.025.203l-.018.113-.01.058a9.99%209.99%200%2001-.098.513l-.007.03a7.209%207.209%200%2001-.074.294l-.024.086c-.027.099-.056.197-.087.296l-.027.085a9.592%209.592%200%2001-.111.323l-.033.085-.018.046c-.032.082-.064.166-.098.248-.019.048-.04.096-.061.145l-.007.017a6%206%200%2001-.084.187c-.024.056-.05.11-.077.165-.03.061-.058.122-.089.182a9.423%209.423%200%2001-.176.332c-.03.056-.062.111-.094.167-.031.053-.062.108-.095.16-.033.055-.066.11-.101.164-.033.053-.065.104-.1.155-.034.055-.07.107-.111.169l-.099.144a15.193%2015.193%200%2001-.34.457c-.04.05-.08.102-.121.151l-.107.128-.007.008a6.987%206.987%200%2001-.262.298l-.149.16-.116.12a9.562%209.562%200%2001-.204.198l-.03.03-.072.069a9.05%209.05%200%2001-.263.235l-.025.022-.029.026-.042.035a11.7%2011.7%200%2001-.22.18l-.07.055-.018.013a8.904%208.904%200%2001-.194.146c-.029.02-.057.042-.086.063a7.7%207.7%200%2001-.22.152l-.057.04a8.865%208.865%200%2001-.293.185l-.062.037a10.424%2010.424%200%2001-.307.173l-.037.02-.196.103-.108.052-.012.006a6.196%206.196%200%2001-.315.143c-.065.028-.13.054-.196.08l-.035.014-.086.034c-.07.026-.143.05-.215.075l-.039.014-.064.023a8.056%208.056%200%2001-.323.097l-.63.173a7.285%207.285%200%2001-.33.08l-.07.015c-.053.012-.104.023-.157.032l-.065.011-.085.015a2.332%202.332%200%2001-.194.027l-.085.01a4.715%204.715%200%2001-.16.018l-.034.003a4.861%204.861%200%2001-.246.016h-.033a2.714%202.714%200%2001-.155.005h-.106a3.384%203.384%200%2001-.225-.007H4.86l-.15-.012-.066-.006a5.586%205.586%200%2001-.187-.02l-.04-.005a5.14%205.14%200%2001-.219-.035l-.054-.01a6.943%206.943%200%2001-.347-.082l-.03-.008-.038-.01a5.034%205.034%200%2001-.269-.086l-.063-.023a4.216%204.216%200%2001-.188-.073l-.071-.031-.016-.007a4.959%204.959%200%2001-.16-.074l-.026-.013a.164.164%200%2000-.014-.007l-.671-.351.486.486h.016l8.995%204.742.093.048.03.014.02.01c.056.026.111.052.169.076l.016.008.073.032.195.076.022.008a.718.718%200%2001.03.012l.014.004a4.693%204.693%200%2000.323.1l.027.007c.073.02.147.038.22.055l.018.004.027.006.066.013.088.016c.075.014.15.026.226.038l.042.004c.064.009.128.016.193.022l.126.012.06.003.05.002.098.005c.046.002.094.002.14.003h.12c.05%200%20.1-.002.161-.005h.033l.07-.004a6.17%206.17%200%2000.184-.014l.033-.003a.753.753%200%2000.058-.005l.108-.012.081-.01.08-.01.129-.021.082-.014.071-.012c.054-.01.107-.021.16-.033l.066-.013.059-.013c.096-.022.192-.046.287-.073l.63-.172a7.354%207.354%200%2000.397-.122l.04-.015c.075-.025.149-.051.222-.078.032-.011.062-.024.093-.037l.03-.012c.067-.027.135-.054.2-.082l.128-.056.195-.09.021-.01.102-.05c.068-.034.135-.069.202-.105l.037-.02.073-.038c.08-.044.16-.092.24-.139l.026-.015a8.086%208.086%200%2000.322-.2l.065-.045%201.98.902a1.748%201.748%200%20002.472-1.59v-7.33l.004.004z%22%20opacity%3D%22.5%22%3E%3C%2Fpath%3E%3Cpath%20d%3D%22M11.617.576a3.904%203.904%200%2000-.093-.047c-.016-.009-.033-.016-.05-.024a5.854%205.854%200%2000-.166-.077l-.09-.04a4.094%204.094%200%2000-.194-.074c-.017-.006-.035-.015-.053-.02l-.013-.005a5.18%205.18%200%2000-.277-.088l-.07-.019a4.034%204.034%200%2000-.219-.053c-.015-.003-.03-.008-.044-.012L10.253.1l-.057-.011a5.177%205.177%200%2000-.225-.036L9.928.047a5.972%205.972%200%2000-.191-.022L9.669.02a1.33%201.33%200%2000-.058-.005L9.515.009a4.058%204.058%200%2000-.111-.005C9.354%200%209.304%200%209.254%200h-.109c-.052%200-.106.004-.16.004L8.884.01A5.32%205.32%200%20008.7.022l-.083.006h-.008c-.05.005-.1.013-.15.019l-.12.014c-.056.008-.112.018-.169.028-.037.006-.074.011-.11.018a7.054%207.054%200%2000-.572.133l-.63.172c-.111.031-.22.064-.33.1-.037.011-.072.025-.108.037a12.91%2012.91%200%2000-.345.126c-.067.027-.133.054-.2.083l-.128.055a11.916%2011.916%200%2000-.318.15%207.376%207.376%200%2000-.311.163c-.082.045-.16.092-.24.14a9.424%209.424%200%2000-.35.218l-.016.01-.06.04a9.242%209.242%200%2000-.51.37%2012.54%2012.54%200%2000-.315.254l-.043.034-.01.007-.045.041c-.09.078-.18.158-.268.24l-.106.101c-.07.067-.139.135-.207.204l-.056.054-.063.067-.153.164-.12.133-.148.17c-.024.03-.049.057-.073.086l-.043.053a5.96%205.96%200%2000-.123.155l-.118.151c-.04.053-.08.106-.118.16l-.075.101-.038.056-.107.155-.11.164a9.91%209.91%200%2000-.168.265c-.012.02-.023.043-.037.063a12.43%2012.43%200%2000-.192.335l-.09.168c-.019.034-.04.07-.057.105-.011.022-.02.043-.032.065l-.092.188-.08.167a19.15%2019.15%200%2000-.083.192c-.017.038-.035.076-.05.115-.008.016-.014.034-.021.051-.035.083-.067.167-.1.253l-.051.134c-.04.11-.077.22-.113.33l-.02.057c0%20.002%200%20.005-.002.007l-.008.026c-.032.1-.06.2-.09.301l-.023.089c-.027.1-.052.2-.075.301l-.007.03a7.63%207.63%200%2000-.057.267l-.008.048c-.015.074-.026.148-.038.223L.082%208.4c-.011.078-.02.156-.029.234-.006.051-.013.103-.017.154a6.57%206.57%200%2000-.02.26c-.003.044-.007.086-.009.13-.004.128-.007.257-.007.386v4.056c0%201.478.42%202.741%201.138%203.692A4.75%204.75%200%20002.73%2018.67l9.015%204.753c-1.656-.874-2.728-2.685-2.73-5.051v-4.056c0-.13.004-.26.01-.39.002-.043.006-.085.01-.128.005-.088.01-.174.019-.261l.017-.155c.01-.077.018-.155.029-.234l.026-.164c.013-.074.025-.15.039-.223.02-.105.04-.21.064-.313l.008-.031c.023-.1.048-.201.075-.301l.023-.088c.028-.1.058-.202.09-.302l.008-.025.021-.063c.036-.11.073-.22.113-.33l.052-.134c.031-.085.065-.169.1-.253.022-.056.047-.111.07-.166a13.856%2013.856%200%2001.164-.358c.03-.063.06-.126.092-.188l.088-.172a9.22%209.22%200%2001.187-.338l.096-.164c.034-.057.069-.112.104-.168l.1-.159a10.49%2010.49%200%2001.567-.786l.123-.155.116-.139c.05-.057.098-.115.148-.171a14.092%2014.092%200%2001.272-.297%209.706%209.706%200%2001.432-.425c.088-.083.177-.163.268-.241l.054-.048a10.08%2010.08%200%2001.553-.435l.092-.068c.075-.053.15-.105.226-.156.019-.013.038-.028.06-.04a9.18%209.18%200%2001.362-.227c.08-.047.16-.094.241-.139l.11-.058a7.643%207.643%200%2001.521-.256l.126-.056a7.509%207.509%200%2001.546-.208l.107-.037c.11-.036.22-.069.33-.1l.63-.172c.095-.026.191-.05.287-.072l.097-.02c.062-.014.125-.029.187-.04l.114-.018c.055-.01.11-.02.166-.028.04-.006.08-.01.12-.014.053-.007.105-.014.157-.019l.083-.006c.061-.005.123-.01.184-.013.034-.003.067-.003.101-.004l.16-.006h.11a3.187%203.187%200%2001.261.008l.153.01.067.007c.064.006.128.013.192.022l.043.005a5.232%205.232%200%2001.281.047l.141.03c.073.016.146.035.218.053l.07.019c.094.026.187.055.278.087l.067.025a4.326%204.326%200%2001.449.19l.143.072L11.617.576z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E",
    monochrome: !0
  },
  antigravity: {
    image: "data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22currentColor%22%20fill-rule%3D%22evenodd%22%20aria-hidden%3D%22true%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%23000000%22%3E%3Ctitle%3EAntigravity%3C%2Ftitle%3E%3Cpath%20d%3D%22M21.751%2022.607c1.34%201.005%203.35.335%201.508-1.508C17.73%2015.74%2018.904%201%2012.037%201%205.17%201%206.342%2015.74.815%2021.1c-2.01%202.009.167%202.511%201.507%201.506%205.192-3.517%204.857-9.714%209.715-9.714%204.857%200%204.522%206.197%209.714%209.715z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E",
    monochrome: !0
  },
  openrouter: {
    image: "data:image/svg+xml,%3Csvg%20stroke%3D%22currentColor%22%20fill%3D%22currentColor%22%20stroke-width%3D%220%22%20role%3D%22img%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20style%3D%22color%3A%23000000%22%20height%3D%221em%22%20width%3D%221em%22%3E%3Cpath%20d%3D%22M16.778%201.844v1.919q-.569-.026-1.138-.032-.708-.008-1.415.037c-1.93.126-4.023.728-6.149%202.237-2.911%202.066-2.731%201.95-4.14%202.75-.396.223-1.342.574-2.185.798-.841.225-1.753.333-1.751.333v4.229s.768.108%201.61.333c.842.224%201.789.575%202.185.799%201.41.798%201.228.683%204.14%202.75%202.126%201.509%204.22%202.11%206.148%202.236.88.058%201.716.041%202.555.005v1.918l7.222-4.168-7.222-4.17v2.176c-.86.038-1.611.065-2.278.021-1.364-.09-2.417-.357-3.979-1.465-2.244-1.593-2.866-2.027-3.68-2.508.889-.518%201.449-.906%203.822-2.59%201.56-1.109%202.614-1.377%203.978-1.466.667-.044%201.418-.017%202.278.02v2.176L24%206.014Z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E",
    monochrome: !0
  },
  qwen: {
    image: "data:image/svg+xml,%3Csvg%20width%3D%22200%22%20height%3D%22200%22%20viewBox%3D%220%200%20200%20200%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0D%0A%3Cpath%20d%3D%22M174.82%20108.75L155.38%2075L165.64%2057.75C166.46%2056.31%20166.46%2054.53%20165.64%2053.09L155.38%2035.84C154.86%2034.91%20153.87%2034.33%20152.78%2034.33H114.88L106.14%2019.03C105.62%2018.1%20104.63%2017.52%20103.54%2017.52H83.3C82.21%2017.52%2081.22%2018.1%2080.7%2019.03L61.26%2052.77H41.02C39.93%2052.77%2038.94%2053.35%2038.42%2054.28L28.16%2071.53C27.34%2072.97%2027.34%2074.75%2028.16%2076.19L45.52%20107.5L36.78%20122.8C35.96%20124.24%2035.96%20126.02%2036.78%20127.46L47.04%20144.71C47.56%20145.64%2048.55%20146.22%2049.64%20146.22H87.54L96.28%20161.52C96.8%20162.45%2097.79%20163.03%2098.88%20163.03H119.12C120.21%20163.03%20121.2%20162.45%20121.72%20161.52L141.16%20127.78H158.52C159.61%20127.78%20160.6%20127.2%20161.12%20126.27L171.38%20109.02C172.2%20107.58%20172.2%20105.8%20171.38%20104.36L174.82%20108.75Z%22%20fill%3D%22url(%23paint0_radial)%22%2F%3E%0D%0A%3Cpath%20d%3D%22M119.12%20163.03H98.88L87.54%20144.71H49.64L61.26%20126.39H80.7L38.42%2055.29H61.26L83.3%2019.03L93.56%2037.35L83.3%2055.29H161.58L151.32%2072.54L170.76%20106.28H151.32L141.16%2088.34L101.18%20163.03H119.12Z%22%20fill%3D%22white%22%2F%3E%0D%0A%3Cpath%20d%3D%22M127.86%2079.83H76.14L101.18%20122.11L127.86%2079.83Z%22%20fill%3D%22url(%23paint1_radial)%22%2F%3E%0D%0A%3Cdefs%3E%0D%0A%3CradialGradient%20id%3D%22paint0_radial%22%20cx%3D%220%22%20cy%3D%220%22%20r%3D%221%22%20gradientUnits%3D%22userSpaceOnUse%22%20gradientTransform%3D%22translate(100%20100)%20rotate(90)%20scale(100)%22%3E%0D%0A%3Cstop%20stop-color%3D%22%23665CEE%22%2F%3E%0D%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23332E91%22%2F%3E%0D%0A%3C%2FradialGradient%3E%0D%0A%3CradialGradient%20id%3D%22paint1_radial%22%20cx%3D%220%22%20cy%3D%220%22%20r%3D%221%22%20gradientUnits%3D%22userSpaceOnUse%22%20gradientTransform%3D%22translate(100%20100)%20rotate(90)%20scale(100)%22%3E%0D%0A%3Cstop%20stop-color%3D%22%23665CEE%22%2F%3E%0D%0A%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23332E91%22%2F%3E%0D%0A%3C%2FradialGradient%3E%0D%0A%3C%2Fdefs%3E%0D%0A%3C%2Fsvg%3E%0D%0A",
    monochrome: !1
  },
  "zai-api": {
    image: "data:image/svg+xml,%3Csvg%20fill%3D%22currentColor%22%20fill-rule%3D%22evenodd%22%20height%3D%221em%22%20style%3D%22flex%3Anone%3Bline-height%3A1%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%221em%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0D%0A%20%20%3Ctitle%3EZ.ai%3C%2Ftitle%3E%0D%0A%20%20%3Cpath%20d%3D%22M12.105%202L9.927%204.953H.653L2.83%202h9.276zM23.254%2019.048L21.078%2022h-9.242l2.174-2.952h9.244zM24%202L9.264%2022H0L14.736%202H24z%22%2F%3E%0D%0A%3C%2Fsvg%3E%0D%0A",
    monochrome: !1
  }
};
function n2({ brand: e, size: t = 24 }) {
  const a = e === "custom" ? null : B0[e];
  return /* @__PURE__ */ r("span", { className: "reader-ai-brand", "aria-hidden": "true", style: { width: t, height: t }, children: a ? a.monochrome ? /* @__PURE__ */ r("span", { className: "reader-ai-brand-mask", style: { maskImage: `url("${a.image}")`, WebkitMaskImage: `url("${a.image}")` } }) : /* @__PURE__ */ r("img", { src: a.image, alt: "", width: t, height: t }) : /* @__PURE__ */ r(K2, { size: t * 0.8, strokeWidth: 1.7 }) });
}
function i2({ items: e, value: t, onSelect: a, allowCustom: i = !1, defaultLabel: n = "服务默认模型", defaultValue: o = "", loading: s = !1, error: l = "", onRefresh: g }) {
  const [m, d] = k(""), h = Q(), v = m.trim(), C = e.filter((p) => (v || !n || p.value !== o) && `${p.name} ${p.value} ${p.group || ""}`.toLowerCase().includes(v.toLowerCase()));
  function E(p) {
    var u;
    if (p.key !== "ArrowDown" && p.key !== "ArrowUp") return;
    const y = [...p.currentTarget.querySelectorAll("input, [role='option']")], A = y.indexOf(document.activeElement);
    A < 0 || (p.preventDefault(), (u = y[(A + (p.key === "ArrowDown" ? 1 : -1) + y.length) % y.length]) == null || u.focus());
  }
  return /* @__PURE__ */ f("div", { className: "reader-ai-model-list", onKeyDown: E, children: [
    /* @__PURE__ */ f("div", { className: "reader-ai-model-search", children: [
      /* @__PURE__ */ r(Y2, { size: 15, "aria-hidden": "true" }),
      /* @__PURE__ */ r(
        "input",
        {
          "aria-label": "搜索模型",
          role: "combobox",
          "aria-autocomplete": "list",
          "aria-controls": h,
          "aria-expanded": "true",
          autoComplete: "off",
          placeholder: i ? "搜索或输入模型名称…" : "搜索模型…",
          value: m,
          onChange: (p) => d(p.target.value)
        }
      ),
      g ? /* @__PURE__ */ r("button", { type: "button", className: "reader-ai-menu-icon", "aria-label": "刷新模型列表", disabled: s, onClick: g, children: s ? /* @__PURE__ */ r(k2, { size: 14, className: "reader-ai-spin", "aria-hidden": "true" }) : /* @__PURE__ */ r(L2, { size: 14, "aria-hidden": "true" }) }) : null
    ] }),
    /* @__PURE__ */ f("div", { className: "reader-ai-model-results", id: h, role: "listbox", "aria-label": "可用模型", "aria-busy": s, children: [
      !v && n ? /* @__PURE__ */ f("button", { type: "button", role: "option", "aria-selected": !t || t === o, className: "reader-ai-model-option", onClick: () => a(""), children: [
        /* @__PURE__ */ r("span", { children: n }),
        !t || t === o ? /* @__PURE__ */ r(r2, { size: 15, "aria-hidden": "true" }) : null
      ] }) : null,
      C.map((p, y) => {
        var A;
        return /* @__PURE__ */ f("div", { children: [
          p.group && p.group !== ((A = C[y - 1]) == null ? void 0 : A.group) ? /* @__PURE__ */ r("p", { className: "reader-ai-menu-label", children: p.group }) : null,
          /* @__PURE__ */ f("button", { type: "button", role: "option", "aria-selected": t === p.value, className: "reader-ai-model-option", onClick: () => a(p.value), children: [
            /* @__PURE__ */ r("span", { title: p.value, children: p.name }),
            t === p.value ? /* @__PURE__ */ r(r2, { size: 15, "aria-hidden": "true" }) : null
          ] })
        ] }, p.value);
      }),
      i && v && !e.some((p) => p.value === v) ? /* @__PURE__ */ f("button", { type: "button", role: "option", "aria-selected": "false", className: "reader-ai-model-option reader-ai-model-custom", onClick: () => a(v), children: [
        /* @__PURE__ */ f("span", { children: [
          "使用「",
          v,
          "」"
        ] }),
        /* @__PURE__ */ r("small", { children: "自定义模型" })
      ] }) : null,
      !C.length && (!i || !v) ? /* @__PURE__ */ r("p", { className: "reader-ai-menu-empty", children: s ? "正在读取模型…" : v ? "没有匹配的模型" : i ? "可搜索列表，也可输入服务商提供的模型名称。" : "由 Agent 使用其默认模型。" }) : null
    ] }),
    l ? /* @__PURE__ */ r("p", { className: "reader-ai-menu-notice", role: "status", children: l }) : null
  ] });
}
function X0({ value: e, items: t, onChange: a, disabled: i = !1, loading: n = !1, error: o = "", onRefresh: s }) {
  const [l, g] = k(!1);
  return /* @__PURE__ */ f(R.Root, { open: l, onOpenChange: g, children: [
    /* @__PURE__ */ f(R.Trigger, { type: "button", className: "reader-ai-model-field", "aria-label": "选择默认模型", disabled: i, children: [
      /* @__PURE__ */ r("span", { className: e ? "" : "reader-ai-placeholder", children: e || "选择或输入模型" }),
      /* @__PURE__ */ r(x2, { size: 15, "aria-hidden": "true" })
    ] }),
    /* @__PURE__ */ r(R.Portal, { children: /* @__PURE__ */ r(R.Content, { className: "reader-ai-service-menu reader-ai-model-field-menu", align: "start", sideOffset: 6, collisionPadding: 12, "aria-label": "选择默认模型", children: /* @__PURE__ */ r(
      i2,
      {
        value: e,
        items: t.map((m) => ({ value: m, name: m })),
        onSelect: (m) => {
          a(m), g(!1);
        },
        allowCustom: !0,
        defaultLabel: "",
        loading: n,
        error: o,
        onRefresh: s
      }
    ) }) })
  ] });
}
const P2 = E2(null), Q0 = P2.Provider, J0 = () => o2(P2), X = /* @__PURE__ */ new Map();
function O0(e, t) {
  X.set(e, t), document.dispatchEvent(new CustomEvent(j, { detail: { type: "agent_connection", connection_id: e, config_options: t } }));
}
function Z(e) {
  const t = e0(e);
  return t.connectionId ? t : { connectionId: "legacy", model: "", options: {} };
}
function ee(e, t = !1) {
  const a = S(t);
  a.current = t;
  const [i, n] = k(null), [o, s] = k(() => Z(e)), [l, g] = k([]), [m, d] = k(""), [h, v] = k(!0), [C, E] = k(u2);
  $(() => {
    let u = !0;
    const w = () => {
      v(!0), E(u2()), t0().then((F) => {
        u && (n(F), d(""));
      }).catch((F) => {
        u && d(F.message || "无法读取 AI 服务");
      }).finally(() => {
        u && v(!1);
      });
    };
    return w(), document.addEventListener(g2, w), document.addEventListener(m2, w), () => {
      u = !1, document.removeEventListener(g2, w), document.removeEventListener(m2, w);
    };
  }, []), $(() => {
    s(Z(e));
    const u = () => {
      a.current || s(Z(e));
    };
    return document.addEventListener(f2, u), window.addEventListener("storage", u), () => {
      document.removeEventListener(f2, u), window.removeEventListener("storage", u);
    };
  }, [e]), $(() => {
    !t && e && s(Z(e));
  }, [t, e]);
  const p = (i == null ? void 0 : i.connections.filter((u) => w2(u, C))) || [], y = p.find((u) => u.id === o.connectionId);
  $(() => {
    if (!i || o.connectionId !== "legacy" || y) return;
    const u = i.connections.find((w) => w2(w, C) && (w.kind === "byoa" || w.api_key_configured));
    u && C2(e, { connectionId: u.id, model: "", options: {} });
  }, [i, o.connectionId, y, C, e]), $(() => {
    g(X.get(o.connectionId) || []);
    const u = (w) => {
      const F = w.detail;
      if ((F == null ? void 0 : F.type) !== "agent_connection" || F.connection_id !== o.connectionId || F.conversation_id && F.conversation_id !== e) return;
      const D = F.config_options || [];
      X.set(o.connectionId, D), g(D);
    };
    return document.addEventListener(j, u), () => document.removeEventListener(j, u);
  }, [o.connectionId, e]);
  const A = !!(y && (y.kind === "byoa" || y.api_key_configured || y.legacy_inherited && C));
  return {
    catalog: i,
    connections: p,
    selection: o,
    selected: y,
    options: l,
    error: m,
    loading: h,
    configured: A,
    blocked: !!(i && !A),
    change: (u) => {
      s(u), C2(e, u);
    }
  };
}
function K(e) {
  return (e == null ? void 0 : e.options.flatMap((t) => "group" in t ? t.options.map((a) => ({ ...a, group: t.name })) : [t])) || [];
}
function te({ controller: e, disabled: t = !1, onManage: a }) {
  var q;
  const { connections: i, selected: n, selection: o, options: s, change: l, loading: g, error: m } = e, [d, h] = k(!1), [v, C] = k("models"), [E, p] = k(""), [y, A] = k(!1), [u, w] = k(""), F = S(null), D = s.find((c) => c.category === "model"), b = o.model || (n == null ? void 0 : n.model) || (D == null ? void 0 : D.currentValue) || "", x = ((q = K(D).find((c) => c.value === b)) == null ? void 0 : q.name) || b || "默认模型", _ = s.filter((c) => c !== D && c.type === "select"), L = _.find((c) => c.id === E), P = (n == null ? void 0 : n.kind) === "byoa" ? K(D) : [.../* @__PURE__ */ new Set([n == null ? void 0 : n.model, ...(n == null ? void 0 : n.models) || []])].filter((c) => !!c).map((c) => ({ value: c, name: c })), G = a || (() => {
    if (document.getElementById("home-root")) document.dispatchEvent(new CustomEvent("retainpdf:open-browser-credentials"));
    else {
      const c = new URL("index.html", window.location.href);
      c.searchParams.set("settings", "api"), window.location.assign(c.href);
    }
  });
  $(() => {
    w(""), p("");
  }, [o.connectionId]), $(() => {
    t && h(!1);
  }, [t]), $(() => {
    var c, N;
    d && v === "models" && ((N = (c = F.current) == null ? void 0 : c.querySelector("input")) == null || N.focus());
  }, [d, v, o.connectionId]);
  async function B(c = n) {
    if (!(!c || y)) {
      A(!0), w("");
      try {
        const N = await J2(c.id);
        O0(c.id, N.config_options || []), N.ready || w(N.message);
      } catch (N) {
        w(N.message);
      } finally {
        A(!1);
      }
    }
  }
  return /* @__PURE__ */ r("div", { className: "reader-ai-connection-control", children: /* @__PURE__ */ f(R.Root, { open: d, onOpenChange: (c) => {
    h(c), C(n ? "models" : "services"), p(""), c && (n == null ? void 0 : n.kind) === "byoa" && !s.length && B();
  }, children: [
    /* @__PURE__ */ f(
      R.Trigger,
      {
        className: "reader-ai-service-trigger",
        type: "button",
        disabled: t || g,
        "aria-label": n ? `切换 AI 服务与模型，当前 ${W(n)}，${x}` : "添加 AI 服务",
        children: [
          g ? /* @__PURE__ */ r(k2, { size: 15, className: "reader-ai-spin", "aria-hidden": "true" }) : n ? /* @__PURE__ */ r(n2, { brand: t2(n), size: 17 }) : /* @__PURE__ */ r(h2, { size: 15, "aria-hidden": "true" }),
          /* @__PURE__ */ r("span", { className: "reader-ai-service-name", children: n ? W(n) : g ? "读取服务…" : "选择 AI 服务" }),
          n ? /* @__PURE__ */ f(H, { children: [
            /* @__PURE__ */ r("span", { className: "reader-ai-service-dot", "aria-hidden": "true", children: "·" }),
            /* @__PURE__ */ r("span", { className: "reader-ai-service-model", title: x, children: x })
          ] }) : null,
          /* @__PURE__ */ r(x2, { size: 12, className: "reader-ai-service-chevron", "aria-hidden": "true" })
        ]
      }
    ),
    /* @__PURE__ */ r(R.Portal, { children: /* @__PURE__ */ f(
      R.Content,
      {
        ref: F,
        className: "reader-ai-service-menu",
        align: "start",
        side: "top",
        sideOffset: 8,
        collisionPadding: 12,
        "aria-label": "AI 服务与模型",
        onOpenAutoFocus: (c) => {
          var N, O;
          v === "models" && (c.preventDefault(), (O = (N = F.current) == null ? void 0 : N.querySelector("input")) == null || O.focus());
        },
        children: [
          v === "services" ? /* @__PURE__ */ f(H, { children: [
            /* @__PURE__ */ f("div", { className: "reader-ai-menu-head", children: [
              n ? /* @__PURE__ */ r("button", { className: "reader-ai-menu-icon", type: "button", "aria-label": "返回模型选择", onClick: () => C("models"), children: /* @__PURE__ */ r(p2, { size: 16 }) }) : null,
              /* @__PURE__ */ r("strong", { children: "选择 AI 服务" })
            ] }),
            /* @__PURE__ */ f("div", { className: "reader-ai-service-rows", role: "listbox", "aria-label": "已连接的 AI 服务", children: [
              i.map((c) => /* @__PURE__ */ f("button", { type: "button", role: "option", "aria-selected": (n == null ? void 0 : n.id) === c.id, className: "reader-ai-service-row", onClick: () => {
                l({ connectionId: c.id, model: "", options: {} }), C("models"), c.kind === "byoa" && !X.has(c.id) && B(c);
              }, children: [
                /* @__PURE__ */ r(n2, { brand: t2(c), size: 23 }),
                /* @__PURE__ */ f("span", { children: [
                  /* @__PURE__ */ r("strong", { children: W(c) }),
                  /* @__PURE__ */ r("small", { children: c.kind === "byoa" ? "使用本机登录" : c.model || "模型 API" })
                ] }),
                (n == null ? void 0 : n.id) === c.id ? /* @__PURE__ */ r(r2, { size: 15, "aria-hidden": "true" }) : null
              ] }, c.id)),
              i.length ? null : /* @__PURE__ */ r("p", { className: "reader-ai-menu-empty", children: "连接本机 Agent 或模型 API 后，就可以开始对话。" })
            ] })
          ] }) : v === "settings" ? /* @__PURE__ */ f(H, { children: [
            /* @__PURE__ */ f("div", { className: "reader-ai-menu-head", children: [
              /* @__PURE__ */ r("button", { type: "button", className: "reader-ai-menu-icon", "aria-label": "返回模型选择", onClick: () => {
                C("models"), p("");
              }, children: /* @__PURE__ */ r(p2, { size: 16 }) }),
              /* @__PURE__ */ r("strong", { children: (L == null ? void 0 : L.name) || "对话设置" })
            ] }),
            L ? /* @__PURE__ */ r(i2, { items: K(L), value: o.options[L.id] ?? L.currentValue, defaultLabel: "", onSelect: (c) => {
              l({ ...o, options: { ...o.options, [L.id]: c } }), p("");
            } }, L.id) : _.map((c) => {
              var N;
              return /* @__PURE__ */ f("button", { type: "button", className: "reader-ai-menu-action", onClick: () => p(c.id), children: [
                /* @__PURE__ */ r("span", { children: c.name }),
                /* @__PURE__ */ r("small", { children: (N = K(c).find((O) => O.value === (o.options[c.id] ?? c.currentValue))) == null ? void 0 : N.name }),
                /* @__PURE__ */ r(J, { size: 14 })
              ] }, c.id);
            }),
            L ? null : /* @__PURE__ */ f("button", { type: "button", className: "reader-ai-menu-action", disabled: y, onClick: () => void B(), children: [
              /* @__PURE__ */ r(L2, { size: 14, className: y ? "reader-ai-spin" : "" }),
              /* @__PURE__ */ r("span", { children: y ? "正在读取…" : "重新读取 Agent 配置" })
            ] })
          ] }) : /* @__PURE__ */ f(H, { children: [
            /* @__PURE__ */ f("button", { type: "button", className: "reader-ai-menu-current", onClick: () => C("services"), children: [
              n ? /* @__PURE__ */ r(n2, { brand: t2(n), size: 24 }) : null,
              /* @__PURE__ */ f("span", { children: [
                /* @__PURE__ */ r("strong", { children: n ? W(n) : "选择 AI 服务" }),
                /* @__PURE__ */ r("small", { children: "切换服务" })
              ] }),
              /* @__PURE__ */ r(J, { size: 15, "aria-hidden": "true" })
            ] }),
            /* @__PURE__ */ r(
              i2,
              {
                items: P,
                value: o.model,
                defaultLabel: (n == null ? void 0 : n.kind) === "byoa" ? "Agent 默认模型" : n != null && n.model ? `默认 · ${n.model}` : "服务默认模型",
                defaultValue: (n == null ? void 0 : n.kind) === "byok" ? n.model : void 0,
                allowCustom: (n == null ? void 0 : n.kind) === "byok",
                loading: y,
                onSelect: (c) => {
                  l({ ...o, model: c }), h(!1);
                }
              },
              o.connectionId
            ),
            (n == null ? void 0 : n.kind) === "byoa" ? /* @__PURE__ */ f("button", { type: "button", className: "reader-ai-menu-action reader-ai-menu-divider", onClick: () => C("settings"), children: [
              /* @__PURE__ */ r(X2, { size: 14 }),
              /* @__PURE__ */ r("span", { children: "对话设置" }),
              /* @__PURE__ */ r(J, { size: 14 })
            ] }) : null
          ] }),
          m || u ? /* @__PURE__ */ r("p", { className: "reader-ai-menu-notice", role: "status", children: m || u }) : null,
          /* @__PURE__ */ f("button", { type: "button", className: "reader-ai-menu-action reader-ai-menu-divider", onClick: () => {
            h(!1), G();
          }, children: [
            /* @__PURE__ */ r(h2, { size: 14, "aria-hidden": "true" }),
            /* @__PURE__ */ r("span", { children: i.length ? "管理 AI 服务" : "添加 AI 服务" })
          ] })
        ]
      }
    ) })
  ] }) });
}
function ne({ conversationId: e, running: t }) {
  var E, p, y, A, u, w, F;
  const [a, i] = k([]), [n, o] = k({}), [s, l] = k(!1), [g, m] = k("");
  $(() => {
    i([]), o({}), m("");
    const D = (b) => {
      const x = b.detail;
      !x || x.conversation_id !== e || (x.type === "agent_interaction" ? i((_) => _.some((L) => L.interaction_id === x.interaction_id) ? _ : [..._, x]) : x.type === "agent_interaction_resolved" && i((_) => _.filter((L) => L.interaction_id !== x.interaction_id)));
    };
    return document.addEventListener(j, D), () => document.removeEventListener(j, D);
  }, [e]), $(() => {
    t || i([]);
  }, [t]);
  const d = a[0];
  if ($(() => {
    var x, _;
    const D = ((_ = (x = d == null ? void 0 : d.request) == null ? void 0 : x.requestedSchema) == null ? void 0 : _.properties) || {}, b = Object.fromEntries(Object.entries(D).flatMap(([L, P]) => Object.hasOwn(P, "default") ? [[L, P.default]] : P.type === "boolean" ? [[L, !1]] : []));
    o(b), m("");
  }, [d == null ? void 0 : d.interaction_id]), !d || !t) return null;
  const h = d.request, v = ((E = h.requestedSchema) == null ? void 0 : E.properties) || {};
  async function C(D) {
    l(!0), m("");
    try {
      await n0(d.interaction_id, D), i((b) => b.filter((x) => x.interaction_id !== d.interaction_id)), o({});
    } catch (b) {
      m(b.message);
    } finally {
      l(!1);
    }
  }
  return /* @__PURE__ */ f("section", { className: "reader-ai-agent-interaction", "aria-label": "Agent 请求确认", "aria-live": "polite", children: [
    /* @__PURE__ */ f("div", { className: "reader-ai-agent-interaction-head", children: [
      /* @__PURE__ */ r(Q2, { size: 17, "aria-hidden": "true" }),
      /* @__PURE__ */ f("strong", { children: [
        d.connection_name,
        " ",
        d.kind === "permission" ? "请求权限" : "需要你的补充"
      ] })
    ] }),
    /* @__PURE__ */ r("p", { children: h.message || ((p = h.toolCall) == null ? void 0 : p.title) || "请确认本次操作" }),
    d.kind === "permission" && ((A = (y = h.toolCall) == null ? void 0 : y.rawInput) != null && A.command) ? /* @__PURE__ */ r("pre", { className: "reader-ai-agent-command", children: String(h.toolCall.rawInput.command).slice(0, 4e3) }) : null,
    d.kind === "permission" && ((w = (u = h.toolCall) == null ? void 0 : u.locations) != null && w.length) ? /* @__PURE__ */ r("p", { className: "reader-ai-connection-notice", children: h.toolCall.locations.map((D) => D.path).filter(Boolean).join("、") }) : null,
    d.kind === "form" ? /* @__PURE__ */ f("form", { onSubmit: (D) => {
      D.preventDefault(), C({ action: "accept", content: n });
    }, children: [
      Object.entries(v).map(([D, b]) => {
        var x, _, L, P, G, B, q;
        return /* @__PURE__ */ f("label", { className: "reader-ai-agent-form-field", children: [
          /* @__PURE__ */ f("span", { children: [
            b.title || D,
            (_ = (x = h.requestedSchema) == null ? void 0 : x.required) != null && _.includes(D) ? " *" : ""
          ] }),
          b.description ? /* @__PURE__ */ r("small", { children: b.description }) : null,
          b.type === "array" && ((L = b.items) != null && L.enum) ? /* @__PURE__ */ r(
            "select",
            {
              multiple: !0,
              "aria-label": b.title || D,
              value: Array.isArray(n[D]) ? n[D] : [],
              onChange: (c) => o((N) => ({ ...N, [D]: Array.from(c.target.selectedOptions, (O) => O.value) })),
              children: b.items.enum.map((c) => /* @__PURE__ */ r("option", { value: c, children: c }, c))
            }
          ) : b.enum ? /* @__PURE__ */ f(
            "select",
            {
              "aria-label": b.title || D,
              required: (G = (P = h.requestedSchema) == null ? void 0 : P.required) == null ? void 0 : G.includes(D),
              value: String(n[D] ?? ""),
              onChange: (c) => o((N) => ({ ...N, [D]: c.target.value })),
              children: [
                /* @__PURE__ */ r("option", { value: "", children: "请选择" }),
                b.enum.map((c) => /* @__PURE__ */ r("option", { value: c, children: c }, c))
              ]
            }
          ) : /* @__PURE__ */ r(
            "input",
            {
              "aria-label": b.title || D,
              type: b.type === "boolean" ? "checkbox" : ["integer", "number"].includes(b.type) ? "number" : "text",
              value: b.type === "boolean" ? void 0 : String(n[D] ?? ""),
              checked: b.type === "boolean" ? !!n[D] : void 0,
              min: b.minimum,
              max: b.maximum,
              minLength: b.minLength,
              maxLength: b.maxLength,
              step: b.type === "number" ? "any" : void 0,
              required: b.type !== "boolean" && ((q = (B = h.requestedSchema) == null ? void 0 : B.required) == null ? void 0 : q.includes(D)),
              onChange: (c) => o((N) => ({ ...N, [D]: b.type === "boolean" ? c.target.checked : ["integer", "number"].includes(b.type) ? Number(c.target.value) : c.target.value }))
            }
          )
        ] }, D);
      }),
      /* @__PURE__ */ f("div", { className: "reader-ai-agent-interaction-actions", children: [
        /* @__PURE__ */ r("button", { type: "submit", disabled: s, children: "发送补充" }),
        /* @__PURE__ */ r("button", { type: "button", disabled: s, onClick: () => void C({ action: "decline" }), children: "拒绝" }),
        /* @__PURE__ */ r("button", { type: "button", disabled: s, onClick: () => void C({ action: "cancel" }), children: "取消" })
      ] })
    ] }) : /* @__PURE__ */ f("div", { className: "reader-ai-agent-interaction-actions", children: [
      (F = h.options) == null ? void 0 : F.map((D) => /* @__PURE__ */ r("button", { type: "button", disabled: s, onClick: () => void C({ option_id: D.optionId }), children: D.name }, D.optionId)),
      /* @__PURE__ */ r("button", { type: "button", disabled: s, onClick: () => void C({}), children: "取消" })
    ] }),
    g ? /* @__PURE__ */ r("p", { role: "alert", className: "reader-ai-connection-error", children: g }) : null
  ] });
}
export {
  e2 as A,
  ne as a,
  n2 as b,
  te as c,
  K0 as d,
  X0 as e,
  Y0 as f,
  t2 as g,
  W as h,
  a2 as i,
  w2 as j,
  J0 as k,
  Q0 as l,
  O0 as r,
  ee as u
};
//# sourceMappingURL=AgentInteractionPanel-CFN0rfvR.js.map
