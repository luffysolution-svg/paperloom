import { jsxs as d, jsx as a, Fragment as S } from "react/jsx-runtime";
import { useId as e2, useState as k, useCallback as j, useRef as P, useEffect as M, useLayoutEffect as V2, createContext as L2, useContext as d2, useMemo as g2, memo as U2 } from "react";
import { Popover as H } from "radix-ui";
import { Plug as G2, ChevronDown as R, Search as _2, Loader2 as t2, RefreshCw as M2, Check as U, Plus as f2, ChevronLeft as C2, ChevronRight as a2, Settings2 as W2, ShieldCheck as Z2, Clock3 as K2, ListChecks as $2, BookOpen as I2, CircleAlert as D2, Brain as Y2, Wrench as X2 } from "lucide-react";
import { AI_AGENT_EVENT as G, AI_CONNECTIONS_CHANGED as v2, AI_SELECTION_CHANGED as y2, saveAiSelection as b2, probeAiConnection as Q2, selectionForRequest as J2, fetchAiConnections as e0, fetchAgentInteractions as t0, answerAgentInteraction as a0 } from "@retainpdf/api";
import { D as S2, g as n0, m as z2, F as Q, E as P2, B as r0, d as i0, k as l0, o as o0, j as s0, z as c0, l as w2, C as E2 } from "./answer-enhance-DShVYmyb.js";
import d0, { setCustomComponents as u0, PreCodeNode as h0, MathInlineNode as m0 } from "markstream-react";
import { createPortal as p0 } from "react-dom";
const g0 = "retainpdf-chart", f0 = 6, C0 = 40, D0 = /* @__PURE__ */ new Set(["bar", "line", "pie"]);
function v0(e) {
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
function y0(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const r of e) {
    if (!r || typeof r != "object") continue;
    const i = r, n = v0(i.value ?? i.y);
    if (n !== null && (t.push({ label: V(i.label ?? i.x, `${t.length + 1}`), value: n }), t.length >= C0))
      break;
  }
  return t;
}
function b0(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const r of e) {
    if (!r || typeof r != "object") continue;
    const i = r, n = y0(i.points ?? i.data);
    if (n.length && (t.push({ name: V(i.name, `系列 ${t.length + 1}`), points: n }), t.length >= f0))
      break;
  }
  return t;
}
function w0(e) {
  const t = `${e || ""}`.trim();
  if (!t) return null;
  let r;
  try {
    r = JSON.parse(t);
  } catch {
    return null;
  }
  if (!r || typeof r != "object" || Array.isArray(r)) return null;
  const i = r, n = `${i.kind ?? i.type ?? ""}`.trim().toLowerCase();
  if (!D0.has(n)) return null;
  const l = b0(i.series);
  if (!l.length) return null;
  const c = n === "pie" ? l.slice(0, 1) : l;
  return {
    kind: n,
    title: V(i.title),
    xLabel: V(i.xLabel ?? i.x_label),
    yLabel: V(i.yLabel ?? i.y_label),
    series: c
  };
}
function E0(e) {
  const t = e.series.flatMap((c) => c.points.map((s) => s.value)), r = Math.min(...t), i = Math.max(...t), n = Math.min(0, r), l = Math.max(0, i);
  return n === l ? { min: n, max: l + 1 } : { min: n, max: l };
}
function u2(e) {
  let t = [];
  for (const r of e.series)
    r.points.length > t.length && (t = r.points);
  return t.map((r) => r.label);
}
const H2 = 640, h2 = 300, _ = { top: 16, right: 16, bottom: 44, left: 52 }, O = H2 - _.left - _.right, z = h2 - _.top - _.bottom, F2 = [
  "var(--chart-1, #4c6ef5)",
  "var(--chart-2, #f08c00)",
  "var(--chart-3, #2f9e44)",
  "var(--chart-4, #e03131)",
  "var(--chart-5, #ae3ec9)",
  "var(--chart-6, #0c8599)"
], W = (e) => F2[e % F2.length];
function F0(e, t) {
  return Array.from({ length: 5 }, (i, n) => e + (t - e) * n / 4);
}
function x0(e) {
  const t = Math.abs(e);
  return t >= 1e4 ? `${(e / 1e3).toFixed(0)}k` : Number.isInteger(e) ? `${e}` : e.toFixed(t < 1 ? 2 : 1);
}
function A0(e) {
  return e <= 8 ? 1 : Math.ceil(e / 8);
}
function k0({
  spec: e,
  min: t,
  max: r,
  labels: i
}) {
  const n = (s) => _.top + z - (s - t) / (r - t) * z, l = A0(i.length), c = O / Math.max(1, i.length);
  return /* @__PURE__ */ d("g", { className: "reader-answer-chart-axes", children: [
    F0(t, r).map((s) => /* @__PURE__ */ d("g", { children: [
      /* @__PURE__ */ a(
        "line",
        {
          className: "reader-answer-chart-grid",
          x1: _.left,
          x2: _.left + O,
          y1: n(s),
          y2: n(s)
        }
      ),
      /* @__PURE__ */ a("text", { className: "reader-answer-chart-tick", x: _.left - 8, y: n(s), textAnchor: "end", dominantBaseline: "middle", children: x0(s) })
    ] }, s)),
    i.map((s, p) => p % l === 0 ? /* @__PURE__ */ a(
      "text",
      {
        className: "reader-answer-chart-tick",
        x: _.left + c * (p + 0.5),
        y: _.top + z + 18,
        textAnchor: "middle",
        children: s.length > 10 ? `${s.slice(0, 9)}…` : s
      },
      `${s}-${p}`
    ) : null),
    e.yLabel ? /* @__PURE__ */ a("text", { className: "reader-answer-chart-axis-label", x: _.left, y: _.top - 4, textAnchor: "start", children: e.yLabel }) : null,
    e.xLabel ? /* @__PURE__ */ a(
      "text",
      {
        className: "reader-answer-chart-axis-label",
        x: _.left + O,
        y: h2 - 6,
        textAnchor: "end",
        children: e.xLabel
      }
    ) : null
  ] });
}
function N0({ spec: e, min: t, max: r }) {
  const i = u2(e), n = O / Math.max(1, i.length), l = n * 0.7, c = l / e.series.length, s = (m) => _.top + z - (m - t) / (r - t) * z, p = s(0);
  return /* @__PURE__ */ a(S, { children: e.series.map((m, o) => /* @__PURE__ */ a("g", { fill: W(o), children: m.points.map((u, f) => {
    const v = s(u.value), w = _.left + n * f + (n - l) / 2 + c * o;
    return /* @__PURE__ */ a(
      "rect",
      {
        x: w,
        y: Math.min(v, p),
        width: Math.max(1, c - 1),
        height: Math.max(1, Math.abs(p - v)),
        rx: 2,
        children: /* @__PURE__ */ a("title", { children: `${m.name} · ${u.label}: ${u.value}` })
      },
      `${u.label}-${f}`
    );
  }) }, m.name)) });
}
function L0({ spec: e, min: t, max: r }) {
  const i = u2(e), n = O / Math.max(1, i.length), l = (s) => _.top + z - (s - t) / (r - t) * z, c = (s) => _.left + n * (s + 0.5);
  return /* @__PURE__ */ a(S, { children: e.series.map((s, p) => {
    const m = s.points.map((o, u) => `${u === 0 ? "M" : "L"} ${c(u)} ${l(o.value)}`).join(" ");
    return /* @__PURE__ */ d("g", { stroke: W(p), fill: W(p), children: [
      /* @__PURE__ */ a("path", { className: "reader-answer-chart-line", d: m, fill: "none" }),
      s.points.map((o, u) => /* @__PURE__ */ a(
        "circle",
        {
          cx: c(u),
          cy: l(o.value),
          r: 3,
          stroke: "none",
          children: /* @__PURE__ */ a("title", { children: `${s.name} · ${o.label}: ${o.value}` })
        },
        `${o.label}-${u}`
      ))
    ] }, s.name);
  }) });
}
function _0({ spec: e }) {
  var p;
  const t = ((p = e.series[0]) == null ? void 0 : p.points) ?? [], r = t.map((m) => Math.max(0, m.value)), i = r.reduce((m, o) => m + o, 0);
  if (i <= 0) return null;
  const n = _.left + O / 2, l = _.top + z / 2, c = Math.min(O, z) / 2 - 8;
  let s = -Math.PI / 2;
  return /* @__PURE__ */ a(S, { children: t.map((m, o) => {
    const u = r[o] / i, f = s + u * Math.PI * 2, v = n + c * Math.cos(s), w = l + c * Math.sin(s), D = n + c * Math.cos(f), F = l + c * Math.sin(f), x = u > 0.5 ? 1 : 0, y = u >= 1 ? `M ${n} ${l - c} A ${c} ${c} 0 1 1 ${n - 0.01} ${l - c} Z` : `M ${n} ${l} L ${v} ${w} A ${c} ${c} 0 ${x} 1 ${D} ${F} Z`;
    return s = f, /* @__PURE__ */ a("path", { d: y, fill: W(o), children: /* @__PURE__ */ a("title", { children: `${m.label}: ${m.value}（${(u * 100).toFixed(1)}%）` }) }, `${m.label}-${o}`);
  }) });
}
function M0({ spec: e }) {
  var r;
  const t = e.kind === "pie" ? (((r = e.series[0]) == null ? void 0 : r.points) ?? []).map((i) => i.label) : e.series.map((i) => i.name);
  return t.length < 2 ? null : /* @__PURE__ */ a("ul", { className: "reader-answer-chart-legend", children: t.map((i, n) => /* @__PURE__ */ d("li", { children: [
    /* @__PURE__ */ a("span", { className: "reader-answer-chart-swatch", style: { background: W(n) }, "aria-hidden": !0 }),
    i
  ] }, `${i}-${n}`)) });
}
function $0({ spec: e }) {
  const t = e2(), { min: r, max: i } = E0(e), n = u2(e), l = e.title || `${e.series.length} 个系列的${e.kind === "pie" ? "占比" : "对比"}图`;
  return /* @__PURE__ */ d("figure", { className: "reader-answer-chart", children: [
    /* @__PURE__ */ d(
      "svg",
      {
        className: `reader-answer-chart-svg is-${e.kind}`,
        viewBox: `0 0 ${H2} ${h2}`,
        role: "img",
        "aria-labelledby": t,
        preserveAspectRatio: "xMidYMid meet",
        children: [
          /* @__PURE__ */ a("title", { id: t, children: l }),
          e.kind !== "pie" ? /* @__PURE__ */ a(k0, { spec: e, min: r, max: i, labels: n }) : null,
          e.kind === "bar" ? /* @__PURE__ */ a(N0, { spec: e, min: r, max: i }) : null,
          e.kind === "line" ? /* @__PURE__ */ a(L0, { spec: e, min: r, max: i }) : null,
          e.kind === "pie" ? /* @__PURE__ */ a(_0, { spec: e }) : null
        ]
      }
    ),
    /* @__PURE__ */ a(M0, { spec: e }),
    e.title ? /* @__PURE__ */ a("figcaption", { className: "reader-answer-chart-caption", children: e.title }) : null
  ] });
}
const I0 = 1600;
function S0(e) {
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
function z0({
  language: e,
  code: t,
  children: r
}) {
  const [i, n] = k(!1), l = S0(e), c = j(() => {
    var p;
    const s = `${t || ""}`;
    s.trim() && ((p = navigator.clipboard) == null || p.writeText(s).then(
      () => {
        var m;
        n(!0), (m = globalThis.setTimeout) == null || m.call(globalThis, () => n(!1), I0);
      },
      () => {
      }
    ));
  }, [t]);
  return /* @__PURE__ */ d("div", { className: "reader-answer-code", children: [
    /* @__PURE__ */ d("div", { className: "reader-answer-code-bar", children: [
      /* @__PURE__ */ a("span", { className: "reader-answer-code-lang", children: l }),
      /* @__PURE__ */ a(
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
    r
  ] });
}
const P0 = 8, H0 = 8;
function R0(e, t, r, { gap: i = P0, margin: n = H0 } = {}) {
  const l = r.height - e.bottom, c = e.top, s = t.height + i + n, p = l >= s || l >= c ? "bottom" : "top", m = p === "bottom" ? e.bottom + i : e.top - i - t.height, o = Math.max(n, r.height - t.height - n), u = Math.min(Math.max(m, n), o), f = e.left + e.width / 2 - t.width / 2, v = Math.max(n, r.width - t.width - n);
  return { left: Math.min(Math.max(f, n), v), top: u, placement: p };
}
const O0 = 240, R2 = 180;
function O2(e, t) {
  const r = `${e || ""}`.replace(/\s+/g, " ").trim();
  return r.length <= t ? r : `${r.slice(0, t - 1)}…`;
}
function B2(e, t) {
  return S2(e) === null ? [] : `${e.job_id || t || ""}`.trim() ? ["translated", "source"] : [];
}
function B0(e, t) {
  return B2(e, t).length > 0 || O2(`${e.snippet || ""}`, R2).length > 0;
}
function T0({
  citation: e,
  jobId: t,
  anchor: r,
  cardId: i,
  onPointerEnter: n,
  onPointerLeave: l
}) {
  const c = P(null), s = P(null), p = B2(e, t), m = S2(e), o = m === null ? null : m + 1, u = O2(`${e.snippet || ""}`, R2), [f, v] = k(
    p.length ? "loading" : "none"
  ), [w, D] = k(null);
  M(() => {
    const y = s.current;
    if (!y || !p.length) return;
    const E = `${e.job_id || t || ""}`.trim(), b = new AbortController();
    return (async () => {
      for (const C of p) {
        const g = n0(
          E,
          m ?? 0,
          C,
          {}
        );
        if (!g) break;
        if (y.setAttribute("data-ai-src", g), y.classList.remove("is-missing"), await z2(y, { signal: b.signal }), b.signal.aborted) return;
        if (!y.classList.contains("is-missing")) {
          v("ready");
          return;
        }
      }
      b.signal.aborted || v("failed");
    })(), () => {
      b.abort(), Q(y);
    };
  }, [e, t, m, p.length]), V2(() => {
    const y = c.current;
    if (!y || !r) return;
    const E = () => {
      const b = r.getBoundingClientRect(), C = y.getBoundingClientRect(), g = R0(
        { top: b.top, left: b.left, bottom: b.bottom, width: b.width },
        {
          width: C.width || y.offsetWidth,
          height: C.height || y.offsetHeight
        },
        { width: window.innerWidth || 0, height: window.innerHeight || 0 }
      );
      D((A) => A && A.left === g.left && A.top === g.top && A.placement === g.placement ? A : g);
    };
    return E(), window.addEventListener("scroll", E, !0), window.addEventListener("resize", E), () => {
      window.removeEventListener("scroll", E, !0), window.removeEventListener("resize", E);
    };
  }, [r, f, u]);
  const F = /* @__PURE__ */ d(
    "div",
    {
      ref: c,
      id: i,
      role: "tooltip",
      className: `reader-ai-citation-card${w ? " is-placed" : ""}`,
      "data-placement": (w == null ? void 0 : w.placement) || "bottom",
      style: { left: `${(w == null ? void 0 : w.left) ?? 0}px`, top: `${(w == null ? void 0 : w.top) ?? 0}px` },
      onMouseEnter: n,
      onMouseLeave: l,
      children: [
        p.length ? /* @__PURE__ */ d("div", { className: "reader-ai-citation-card-figure", "data-state": f, children: [
          /* @__PURE__ */ a(
            "img",
            {
              ref: s,
              alt: o ? `第 ${o} 页预览` : "来源页预览",
              className: "reader-ai-citation-card-thumb",
              decoding: "async",
              width: O0
            }
          ),
          f === "failed" ? /* @__PURE__ */ a("span", { className: "reader-ai-citation-card-thumb-fallback", children: "预览暂不可用" }) : null
        ] }) : null,
        /* @__PURE__ */ d("div", { className: "reader-ai-citation-card-text", children: [
          /* @__PURE__ */ a("div", { className: "reader-ai-citation-card-head", children: o ? `第 ${o} 页` : "来源" }),
          u ? /* @__PURE__ */ a("p", { className: "reader-ai-citation-card-snippet", children: u }) : null
        ] })
      ]
    }
  ), x = typeof document > "u" ? null : document.body;
  return x ? p0(F, x) : F;
}
const j0 = 140, x2 = 180;
function q0({ citation: e, label: t, jobId: r, onJump: i }) {
  const [n, l] = k(!1), c = P(null), s = P(null), p = `reader-ai-citation-card-${e2().replace(/[^a-zA-Z0-9_-]/g, "")}`, m = P2(e), o = B0(e, r), u = j(() => {
    s.current !== null && (clearTimeout(s.current), s.current = null);
  }, []), f = j((D, F) => {
    u(), s.current = setTimeout(() => {
      s.current = null, l(D);
    }, F);
  }, [u]);
  M(() => () => u(), [u]), M(() => {
    o || l(!1);
  }, [o]);
  const v = j(() => {
    u(), l(!0);
  }, [u]), w = j(() => {
    u(), l(!1);
  }, [u]);
  return /* @__PURE__ */ d(S, { children: [
    /* @__PURE__ */ d(
      "button",
      {
        ref: c,
        type: "button",
        className: "reader-ai-citation-ref",
        "data-page": m ?? void 0,
        "aria-describedby": n ? p : void 0,
        "aria-expanded": o ? n : void 0,
        title: m ? `跳到第 ${m} 页` : "定位来源",
        onClick: (D) => {
          D.preventDefault(), D.stopPropagation(), w(), i == null || i(e);
        },
        onMouseEnter: o ? () => f(!0, j0) : void 0,
        onMouseLeave: o ? () => f(!1, x2) : void 0,
        onFocus: o ? v : void 0,
        onBlur: o ? w : void 0,
        onKeyDown: (D) => {
          D.key === "Escape" && n && (D.stopPropagation(), w());
        },
        children: [
          "[",
          t,
          "]"
        ]
      }
    ),
    n && o ? /* @__PURE__ */ a(
      T0,
      {
        citation: e,
        jobId: r,
        anchor: c.current,
        cardId: p,
        onPointerEnter: v,
        onPointerLeave: () => f(!1, x2)
      }
    ) : null
  ] });
}
const T2 = "retainpdf-ai-answer", A2 = 320, V0 = 2, m2 = L2({
  final: !1,
  jobId: "",
  citations: []
});
function U0(e) {
  const t = Number(e.naturalWidth) || 0, r = e.closest(".reader-ai-image-jump"), i = r || e, n = t > 0 && t < A2;
  if (e.classList.toggle("is-low-resolution", n), r == null || r.classList.toggle("is-low-resolution", n), n) {
    const l = Math.min(
      A2,
      Math.max(t, t * V0)
    );
    i.style.setProperty("--reader-ai-image-width", `${l}px`);
  } else
    i.style.removeProperty("--reader-ai-image-width");
}
function G0({ node: e }) {
  const { final: t, jobId: r, citations: i, onJumpCitation: n } = d2(m2), l = P(null), c = P(null), s = `${e.alt || ""}`.trim(), p = r0(e.src, r, {}, i0(i)), m = l0(e.src, i, r), o = P2(m), u = j((v) => {
    var F;
    const w = l.current;
    if (w === v || ((F = c.current) == null || F.abort(), c.current = null, w && Q(w), l.current = v, !v || !p)) return;
    const D = new AbortController();
    c.current = D, (async () => {
      for (const x of [0, 250, 750, 1500]) {
        if (x && await new Promise((E) => globalThis.setTimeout(E, x)), D.signal.aborted) return;
        const y = l.current;
        if (!y || y !== v || y.classList.contains("is-hydrated") && y.src.startsWith("blob:")) return;
        await z2(y, { signal: D.signal });
      }
    })();
  }, [p]);
  if (M(() => () => {
    var v;
    (v = c.current) == null || v.abort(), c.current = null, Q(l.current), l.current = null;
  }, []), !p)
    return t ? /* @__PURE__ */ a("span", { className: "aui-image-blocked", children: s ? `[图片不可用：${s}]` : "[图片不可用]" }) : /* @__PURE__ */ a("span", { className: "aui-image-pending", "aria-label": s || "图片加载中", children: s ? `[图片：${s}]` : "[图片加载中]" });
  const f = /* @__PURE__ */ a(
    "img",
    {
      ref: u,
      alt: s,
      "data-ai-src": p,
      decoding: "async",
      loading: "lazy",
      onLoad: (v) => U0(v.currentTarget),
      title: e.title || void 0
    }
  );
  return !m || !n ? f : /* @__PURE__ */ d(
    "button",
    {
      type: "button",
      className: "reader-ai-image-jump",
      "data-page": o ?? void 0,
      title: o ? `定位到 PDF 第 ${o} 页` : "定位到图片来源",
      onClick: (v) => {
        v.preventDefault(), v.stopPropagation(), n({ ...m, image_url: p });
      },
      children: [
        f,
        /* @__PURE__ */ a("span", { className: "reader-ai-image-jump-label", "aria-hidden": "true", children: o ? `定位 p.${o}` : "定位来源" })
      ]
    }
  );
}
function W0({ node: e }) {
  const { citations: t, jobId: r, onJumpCitation: i } = d2(m2), n = `${e.href || ""}`.match(/^#retainpdf-citation-(\d+)$/), l = n ? t.find((s) => `${s.ref}` === n[1]) : null;
  if (l)
    return /* @__PURE__ */ a(
      q0,
      {
        citation: l,
        label: `${(n == null ? void 0 : n[1]) ?? ""}`,
        jobId: r,
        onJump: i
      }
    );
  const c = `${e.text || e.href || ""}`.trim();
  return /* @__PURE__ */ a(
    "span",
    {
      className: "aui-md-extlink",
      "data-href": `${e.href || ""}`.trim() || void 0,
      title: c || void 0,
      children: c
    }
  );
}
function Z0(e) {
  const t = e.node;
  if (`${(t == null ? void 0 : t.language) || ""}`.trim().toLowerCase() === g0) {
    const r = w0(`${(t == null ? void 0 : t.code) || ""}`);
    if (r) return /* @__PURE__ */ a($0, { spec: r });
  }
  return /* @__PURE__ */ a(z0, { language: `${(t == null ? void 0 : t.language) || ""}`, code: `${(t == null ? void 0 : t.code) || ""}`, children: /* @__PURE__ */ a(h0, { node: e.node }) });
}
function K0({ node: e }) {
  return /* @__PURE__ */ a(
    m0,
    {
      node: e.markup === "$$" ? { ...e, markup: "$" } : e
    }
  );
}
u0(T2, {
  image: G0,
  link: W0,
  math_inline: K0,
  code_block: Z0
});
function Y0({
  content: e,
  final: t,
  indexKey: r,
  jobId: i,
  citations: n = [],
  onJumpCitation: l,
  onClickCapture: c
}) {
  return /* @__PURE__ */ a(m2.Provider, { value: { final: t, jobId: i, citations: n, onJumpCitation: l }, children: /* @__PURE__ */ a(
    "div",
    {
      className: "retain-markstream-shell",
      "data-markdown-renderer": "markstream-react",
      onClickCapture: c,
      children: /* @__PURE__ */ a(
        d0,
        {
          batchRendering: !t,
          content: e,
          customId: T2,
          fade: !1,
          final: t,
          htmlPolicy: "escape",
          indexKey: r,
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
function n2({
  content: e,
  streaming: t = !1,
  citations: r = [],
  jobId: i = "",
  className: n = "",
  streamingClassName: l = "",
  pendingClassName: c = "",
  finalClassName: s = "",
  citationFooterMax: p = 5,
  onJumpCitation: m
}) {
  var x;
  const o = P(null), u = e2(), f = t ? `${e || ""}` : `${e || ""}`.trim(), v = `${i || ((x = r.find((y) => y.job_id)) == null ? void 0 : x.job_id) || ""}`.trim(), w = g2(() => {
    const y = /* @__PURE__ */ new Map();
    for (const E of r)
      o0(E) && y.set(`${E.ref}`, E);
    return y;
  }, [r]), D = g2(
    () => s0(f, w),
    [f, w]
  );
  return M(() => {
    var b;
    const y = o.current;
    if (!y || !f) return;
    const E = y.parentElement;
    if (E instanceof HTMLElement && p !== 0) {
      if (t) {
        (b = E.querySelector(".reader-ai-citations")) == null || b.remove();
        return;
      }
      c0(E, r, {
        onJump: (C) => m == null ? void 0 : m(C),
        answerText: f,
        max: p
      });
    }
  }, [t, v, w, r, m, f, p]), M(() => () => Q(o.current), []), f.trim() ? /* @__PURE__ */ a("div", { ref: o, className: `${n} ${t ? l : s || c}`.trim(), children: /* @__PURE__ */ a(
    Y0,
    {
      content: D,
      final: !t,
      indexKey: u,
      jobId: v,
      citations: r,
      onJumpCitation: m,
      onClickCapture: (y) => {
        const E = y.target;
        E instanceof Element && E.closest("a[href]") && (y.preventDefault(), y.stopPropagation());
      }
    }
  ) }) : null;
}
const r2 = [
  { id: "openai", name: "OpenAI", brand: "codex", baseUrl: "https://api.openai.com/v1", protocol: "openai_responses", keyUrl: "https://platform.openai.com/api-keys" },
  { id: "anthropic", name: "Anthropic / Claude", brand: "claude", baseUrl: "https://api.anthropic.com/v1", protocol: "anthropic", keyUrl: "https://console.anthropic.com/settings/keys" },
  { id: "deepseek", name: "DeepSeek", brand: "deepseek", baseUrl: "https://api.deepseek.com/v1", protocol: "openai", keyUrl: "https://platform.deepseek.com/api_keys" },
  { id: "openrouter", name: "OpenRouter", brand: "openrouter", baseUrl: "https://openrouter.ai/api/v1", protocol: "openai", keyUrl: "https://openrouter.ai/settings/keys" },
  { id: "qwen", name: "通义千问", brand: "qwen", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", protocol: "openai" },
  { id: "custom", name: "其他模型服务", brand: "custom", baseUrl: "", protocol: "openai" }
], j2 = {
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
function o2(e) {
  if (e.provider) return r2.find((i) => i.id === e.provider) || r2.at(-1);
  const t = e.base_url.toLowerCase(), r = t.includes("anthropic") ? "anthropic" : t.includes("deepseek") ? "deepseek" : t.includes("openrouter") ? "openrouter" : t.includes("dashscope") ? "qwen" : t.includes("openai.com") ? "openai" : "custom";
  return r2.find((i) => i.id === r);
}
function i2(e) {
  return e.kind === "byoa" ? j2[e.preset] || "custom" : o2(e).brand;
}
function ce(e) {
  return j2[e] || "custom";
}
function K(e) {
  return e.id === "legacy" && e.name === "现有模型连接" ? o2(e).id === "custom" ? "默认模型服务" : o2(e).name : e.name;
}
function k2(e, t = !1) {
  return !e.legacy_inherited || !!(e.api_key_configured || t);
}
const X0 = {
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
function l2({ brand: e, size: t = 24 }) {
  const r = e === "custom" ? null : X0[e];
  return /* @__PURE__ */ a("span", { className: "reader-ai-brand", "aria-hidden": "true", style: { width: t, height: t }, children: r ? r.monochrome ? /* @__PURE__ */ a("span", { className: "reader-ai-brand-mask", style: { maskImage: `url("${r.image}")`, WebkitMaskImage: `url("${r.image}")` } }) : /* @__PURE__ */ a("img", { src: r.image, alt: "", width: t, height: t }) : /* @__PURE__ */ a(G2, { size: t * 0.8, strokeWidth: 1.7 }) });
}
function s2({ items: e, value: t, onSelect: r, allowCustom: i = !1, defaultLabel: n = "服务默认模型", defaultValue: l = "", loading: c = !1, error: s = "", onRefresh: p }) {
  const [m, o] = k(""), u = e2(), f = m.trim(), v = e.filter((D) => (f || !n || D.value !== l) && `${D.name} ${D.value} ${D.group || ""}`.toLowerCase().includes(f.toLowerCase()));
  function w(D) {
    var y;
    if (D.key !== "ArrowDown" && D.key !== "ArrowUp") return;
    const F = [...D.currentTarget.querySelectorAll("input, [role='option']")], x = F.indexOf(document.activeElement);
    x < 0 || (D.preventDefault(), (y = F[(x + (D.key === "ArrowDown" ? 1 : -1) + F.length) % F.length]) == null || y.focus());
  }
  return /* @__PURE__ */ d("div", { className: "reader-ai-model-list", onKeyDown: w, children: [
    /* @__PURE__ */ d("div", { className: "reader-ai-model-search", children: [
      /* @__PURE__ */ a(_2, { size: 15, "aria-hidden": "true" }),
      /* @__PURE__ */ a(
        "input",
        {
          "aria-label": "搜索模型",
          role: "combobox",
          "aria-autocomplete": "list",
          "aria-controls": u,
          "aria-expanded": "true",
          autoComplete: "off",
          placeholder: i ? "搜索或输入模型名称…" : "搜索模型…",
          value: m,
          onChange: (D) => o(D.target.value)
        }
      ),
      p ? /* @__PURE__ */ a("button", { type: "button", className: "reader-ai-menu-icon", "aria-label": "刷新模型列表", disabled: c, onClick: p, children: c ? /* @__PURE__ */ a(t2, { size: 14, className: "reader-ai-spin", "aria-hidden": "true" }) : /* @__PURE__ */ a(M2, { size: 14, "aria-hidden": "true" }) }) : null
    ] }),
    /* @__PURE__ */ d("div", { className: "reader-ai-model-results", id: u, role: "listbox", "aria-label": "可用模型", "aria-busy": c, children: [
      !f && n ? /* @__PURE__ */ d("button", { type: "button", role: "option", "aria-selected": !t || t === l, className: "reader-ai-model-option", onClick: () => r(""), children: [
        /* @__PURE__ */ a("span", { children: n }),
        !t || t === l ? /* @__PURE__ */ a(U, { size: 15, "aria-hidden": "true" }) : null
      ] }) : null,
      v.map((D, F) => {
        var x;
        return /* @__PURE__ */ d("div", { children: [
          D.group && D.group !== ((x = v[F - 1]) == null ? void 0 : x.group) ? /* @__PURE__ */ a("p", { className: "reader-ai-menu-label", children: D.group }) : null,
          /* @__PURE__ */ d("button", { type: "button", role: "option", "aria-selected": t === D.value, className: "reader-ai-model-option", onClick: () => r(D.value), children: [
            /* @__PURE__ */ a("span", { title: D.value, children: D.name }),
            t === D.value ? /* @__PURE__ */ a(U, { size: 15, "aria-hidden": "true" }) : null
          ] })
        ] }, D.value);
      }),
      i && f && !e.some((D) => D.value === f) ? /* @__PURE__ */ d("button", { type: "button", role: "option", "aria-selected": "false", className: "reader-ai-model-option reader-ai-model-custom", onClick: () => r(f), children: [
        /* @__PURE__ */ d("span", { children: [
          "使用「",
          f,
          "」"
        ] }),
        /* @__PURE__ */ a("small", { children: "自定义模型" })
      ] }) : null,
      !v.length && (!i || !f) ? /* @__PURE__ */ a("p", { className: "reader-ai-menu-empty", children: c ? "正在读取模型…" : f ? "没有匹配的模型" : i ? "可搜索列表，也可输入服务商提供的模型名称。" : "由 Agent 使用其默认模型。" }) : null
    ] }),
    s ? /* @__PURE__ */ a("p", { className: "reader-ai-menu-notice", role: "status", children: s }) : null
  ] });
}
function de({ value: e, items: t, onChange: r, disabled: i = !1, loading: n = !1, error: l = "", onRefresh: c }) {
  const [s, p] = k(!1);
  return /* @__PURE__ */ d(H.Root, { open: s, onOpenChange: p, children: [
    /* @__PURE__ */ d(H.Trigger, { type: "button", className: "reader-ai-model-field", "aria-label": "选择默认模型", disabled: i, children: [
      /* @__PURE__ */ a("span", { className: e ? "" : "reader-ai-placeholder", children: e || "选择或输入模型" }),
      /* @__PURE__ */ a(R, { size: 15, "aria-hidden": "true" })
    ] }),
    /* @__PURE__ */ a(H.Portal, { children: /* @__PURE__ */ a(H.Content, { className: "reader-ai-service-menu reader-ai-model-field-menu", align: "start", sideOffset: 6, collisionPadding: 12, "aria-label": "选择默认模型", children: /* @__PURE__ */ a(
      s2,
      {
        value: e,
        items: t.map((m) => ({ value: m, name: m })),
        onSelect: (m) => {
          r(m), p(!1);
        },
        allowCustom: !0,
        defaultLabel: "",
        loading: n,
        error: l,
        onRefresh: c
      }
    ) }) })
  ] });
}
const q2 = L2(null), ue = q2.Provider, he = () => d2(q2), J = /* @__PURE__ */ new Map(), c2 = /* @__PURE__ */ new Map();
function Q0(e, t, r) {
  J.set(e, t), r && c2.set(e, r), document.dispatchEvent(new CustomEvent(G, { detail: { type: "agent_connection", connection_id: e, config_options: t, capabilities: r } }));
}
function Y(e) {
  const t = J2(e);
  return t.connectionId ? t : { connectionId: "legacy", model: "", options: {} };
}
function me(e, t = !1) {
  const r = P(t);
  r.current = t;
  const [i, n] = k(null), [l, c] = k(() => Y(e)), [s, p] = k([]), [m, o] = k(), [u, f] = k(""), [v, w] = k(!0), [D, F] = k(w2);
  M(() => {
    let b = !0;
    const C = () => {
      w(!0), F(w2()), e0().then((g) => {
        b && (n(g), f(""));
      }).catch((g) => {
        b && f(g.message || "无法读取 AI 服务");
      }).finally(() => {
        b && w(!1);
      });
    };
    return C(), document.addEventListener(v2, C), document.addEventListener(E2, C), () => {
      b = !1, document.removeEventListener(v2, C), document.removeEventListener(E2, C);
    };
  }, []), M(() => {
    c(Y(e));
    const b = () => {
      r.current || c(Y(e));
    };
    return document.addEventListener(y2, b), window.addEventListener("storage", b), () => {
      document.removeEventListener(y2, b), window.removeEventListener("storage", b);
    };
  }, [e]), M(() => {
    !t && e && c(Y(e));
  }, [t, e]);
  const x = (i == null ? void 0 : i.connections.filter((b) => k2(b, D))) || [], y = x.find((b) => b.id === l.connectionId);
  M(() => {
    if (!i || l.connectionId !== "legacy" || y) return;
    const b = i.connections.find((C) => k2(C, D) && (C.kind === "byoa" || C.api_key_configured));
    b && b2(e, { connectionId: b.id, model: "", options: {} });
  }, [i, l.connectionId, y, D, e]), M(() => {
    p(J.get(l.connectionId) || []), o(c2.get(l.connectionId));
    const b = (C) => {
      const g = C.detail;
      if ((g == null ? void 0 : g.type) !== "agent_connection" || g.connection_id !== l.connectionId || g.conversation_id && g.conversation_id !== e) return;
      const A = g.config_options || [];
      J.set(l.connectionId, A), p(A), g.capabilities && (c2.set(l.connectionId, g.capabilities), o(g.capabilities));
    };
    return document.addEventListener(G, b), () => document.removeEventListener(G, b);
  }, [l.connectionId, e]);
  const E = !!(y && (y.kind === "byoa" || y.api_key_configured || y.legacy_inherited && D));
  return {
    catalog: i,
    connections: x,
    selection: l,
    selected: y,
    options: s,
    capabilities: m,
    error: u,
    loading: v,
    configured: E,
    blocked: !!(i && !E),
    change: (b) => {
      c(b), b2(e, b);
    }
  };
}
function X(e) {
  return (e == null ? void 0 : e.options.flatMap((t) => "group" in t ? t.options.map((r) => ({ ...r, group: t.name })) : [t])) || [];
}
function pe({ controller: e, disabled: t = !1, onManage: r }) {
  var q;
  const { connections: i, selected: n, selection: l, options: c, change: s, loading: p, error: m } = e, [o, u] = k(!1), [f, v] = k("models"), [w, D] = k(""), [F, x] = k(!1), [y, E] = k(""), b = P(null), C = c.find((h) => h.category === "model"), g = l.model || (n == null ? void 0 : n.model) || (C == null ? void 0 : C.currentValue) || "", A = ((q = X(C).find((h) => h.value === g)) == null ? void 0 : q.name) || g || "默认模型", $ = c.filter((h) => h !== C && h.type === "select"), N = $.find((h) => h.id === w), I = (n == null ? void 0 : n.kind) === "byoa" ? X(C) : [.../* @__PURE__ */ new Set([n == null ? void 0 : n.model, ...(n == null ? void 0 : n.models) || []])].filter((h) => !!h).map((h) => ({ value: h, name: h })), Z = r || (() => {
    if (document.getElementById("home-root")) document.dispatchEvent(new CustomEvent("retainpdf:open-browser-credentials"));
    else {
      const h = new URL("index.html", window.location.href);
      h.searchParams.set("settings", "api"), window.location.assign(h.href);
    }
  });
  M(() => {
    E(""), D("");
  }, [l.connectionId]), M(() => {
    t && u(!1);
  }, [t]), M(() => {
    var h, L;
    o && f === "models" && ((L = (h = b.current) == null ? void 0 : h.querySelector("input")) == null || L.focus());
  }, [o, f, l.connectionId]);
  async function B(h = n) {
    if (!(!h || F)) {
      x(!0), E("");
      try {
        const L = await Q2(h.id);
        Q0(h.id, L.config_options || [], L.capabilities), L.ready || E(L.message);
      } catch (L) {
        E(L.message);
      } finally {
        x(!1);
      }
    }
  }
  return /* @__PURE__ */ a("div", { className: "reader-ai-connection-control", children: /* @__PURE__ */ d(H.Root, { open: o, onOpenChange: (h) => {
    u(h), v(n ? "models" : "services"), D(""), h && (n == null ? void 0 : n.kind) === "byoa" && !c.length && B();
  }, children: [
    /* @__PURE__ */ d(
      H.Trigger,
      {
        className: "reader-ai-service-trigger",
        type: "button",
        disabled: t || p,
        "aria-label": n ? `切换 AI 服务与模型，当前 ${K(n)}，${A}` : "添加 AI 服务",
        children: [
          p ? /* @__PURE__ */ a(t2, { size: 15, className: "reader-ai-spin", "aria-hidden": "true" }) : n ? /* @__PURE__ */ a(l2, { brand: i2(n), size: 17 }) : /* @__PURE__ */ a(f2, { size: 15, "aria-hidden": "true" }),
          /* @__PURE__ */ a("span", { className: "reader-ai-service-name", children: n ? K(n) : p ? "读取服务…" : "选择 AI 服务" }),
          n ? /* @__PURE__ */ d(S, { children: [
            /* @__PURE__ */ a("span", { className: "reader-ai-service-dot", "aria-hidden": "true", children: "·" }),
            /* @__PURE__ */ a("span", { className: "reader-ai-service-model", title: A, children: A })
          ] }) : null,
          /* @__PURE__ */ a(R, { size: 12, className: "reader-ai-service-chevron", "aria-hidden": "true" })
        ]
      }
    ),
    /* @__PURE__ */ a(H.Portal, { children: /* @__PURE__ */ d(
      H.Content,
      {
        ref: b,
        className: "reader-ai-service-menu",
        align: "start",
        side: "top",
        sideOffset: 8,
        collisionPadding: 12,
        "aria-label": "AI 服务与模型",
        onOpenAutoFocus: (h) => {
          var L, T;
          f === "models" && (h.preventDefault(), (T = (L = b.current) == null ? void 0 : L.querySelector("input")) == null || T.focus());
        },
        children: [
          f === "services" ? /* @__PURE__ */ d(S, { children: [
            /* @__PURE__ */ d("div", { className: "reader-ai-menu-head", children: [
              n ? /* @__PURE__ */ a("button", { className: "reader-ai-menu-icon", type: "button", "aria-label": "返回模型选择", onClick: () => v("models"), children: /* @__PURE__ */ a(C2, { size: 16 }) }) : null,
              /* @__PURE__ */ a("strong", { children: "选择 AI 服务" })
            ] }),
            /* @__PURE__ */ d("div", { className: "reader-ai-service-rows", role: "listbox", "aria-label": "已连接的 AI 服务", children: [
              i.map((h) => /* @__PURE__ */ d("button", { type: "button", role: "option", "aria-selected": (n == null ? void 0 : n.id) === h.id, className: "reader-ai-service-row", onClick: () => {
                s({ connectionId: h.id, model: "", options: {} }), v("models"), h.kind === "byoa" && !J.has(h.id) && B(h);
              }, children: [
                /* @__PURE__ */ a(l2, { brand: i2(h), size: 23 }),
                /* @__PURE__ */ d("span", { children: [
                  /* @__PURE__ */ a("strong", { children: K(h) }),
                  /* @__PURE__ */ a("small", { children: h.kind === "byoa" ? "使用本机登录" : h.model || "模型 API" })
                ] }),
                (n == null ? void 0 : n.id) === h.id ? /* @__PURE__ */ a(U, { size: 15, "aria-hidden": "true" }) : null
              ] }, h.id)),
              i.length ? null : /* @__PURE__ */ a("p", { className: "reader-ai-menu-empty", children: "连接本机 Agent 或模型 API 后，就可以开始对话。" })
            ] })
          ] }) : f === "settings" ? /* @__PURE__ */ d(S, { children: [
            /* @__PURE__ */ d("div", { className: "reader-ai-menu-head", children: [
              /* @__PURE__ */ a("button", { type: "button", className: "reader-ai-menu-icon", "aria-label": "返回模型选择", onClick: () => {
                v("models"), D("");
              }, children: /* @__PURE__ */ a(C2, { size: 16 }) }),
              /* @__PURE__ */ a("strong", { children: (N == null ? void 0 : N.name) || "对话设置" })
            ] }),
            N ? /* @__PURE__ */ a(s2, { items: X(N), value: l.options[N.id] ?? N.currentValue, defaultLabel: "", onSelect: (h) => {
              s({ ...l, options: { ...l.options, [N.id]: h } }), D("");
            } }, N.id) : $.map((h) => {
              var L;
              return /* @__PURE__ */ d("button", { type: "button", className: "reader-ai-menu-action", onClick: () => D(h.id), children: [
                /* @__PURE__ */ a("span", { children: h.name }),
                /* @__PURE__ */ a("small", { children: (L = X(h).find((T) => T.value === (l.options[h.id] ?? h.currentValue))) == null ? void 0 : L.name }),
                /* @__PURE__ */ a(a2, { size: 14 })
              ] }, h.id);
            }),
            N ? null : /* @__PURE__ */ d("button", { type: "button", className: "reader-ai-menu-action", disabled: F, onClick: () => void B(), children: [
              /* @__PURE__ */ a(M2, { size: 14, className: F ? "reader-ai-spin" : "" }),
              /* @__PURE__ */ a("span", { children: F ? "正在读取…" : "重新读取 Agent 配置" })
            ] })
          ] }) : /* @__PURE__ */ d(S, { children: [
            /* @__PURE__ */ d("button", { type: "button", className: "reader-ai-menu-current", onClick: () => v("services"), children: [
              n ? /* @__PURE__ */ a(l2, { brand: i2(n), size: 24 }) : null,
              /* @__PURE__ */ d("span", { children: [
                /* @__PURE__ */ a("strong", { children: n ? K(n) : "选择 AI 服务" }),
                /* @__PURE__ */ a("small", { children: "切换服务" })
              ] }),
              /* @__PURE__ */ a(a2, { size: 15, "aria-hidden": "true" })
            ] }),
            /* @__PURE__ */ a(
              s2,
              {
                items: I,
                value: l.model,
                defaultLabel: (n == null ? void 0 : n.kind) === "byoa" ? "Agent 默认模型" : n != null && n.model ? `默认 · ${n.model}` : "服务默认模型",
                defaultValue: (n == null ? void 0 : n.kind) === "byok" ? n.model : void 0,
                allowCustom: (n == null ? void 0 : n.kind) === "byok",
                loading: F,
                onSelect: (h) => {
                  s({ ...l, model: h }), u(!1);
                }
              },
              l.connectionId
            ),
            (n == null ? void 0 : n.kind) === "byoa" ? /* @__PURE__ */ d("button", { type: "button", className: "reader-ai-menu-action reader-ai-menu-divider", onClick: () => v("settings"), children: [
              /* @__PURE__ */ a(W2, { size: 14 }),
              /* @__PURE__ */ a("span", { children: "对话设置" }),
              /* @__PURE__ */ a(a2, { size: 14 })
            ] }) : null
          ] }),
          m || y ? /* @__PURE__ */ a("p", { className: "reader-ai-menu-notice", role: "status", children: m || y }) : null,
          /* @__PURE__ */ d("button", { type: "button", className: "reader-ai-menu-action reader-ai-menu-divider", onClick: () => {
            u(!1), Z();
          }, children: [
            /* @__PURE__ */ a(f2, { size: 14, "aria-hidden": "true" }),
            /* @__PURE__ */ a("span", { children: i.length ? "管理 AI 服务" : "添加 AI 服务" })
          ] })
        ]
      }
    ) })
  ] }) });
}
function ge({ conversationId: e, running: t }) {
  var w, D, F, x, y, E, b;
  const [r, i] = k([]), [n, l] = k({}), [c, s] = k(!1), [p, m] = k("");
  M(() => {
    i([]), l({}), m("");
    let C = !0;
    e && t0(e).then((A) => {
      C && i(A);
    }).catch(() => {
    });
    const g = (A) => {
      const $ = A.detail;
      !$ || $.conversation_id !== e || ($.type === "agent_interaction" ? i((N) => N.some((I) => I.interaction_id === $.interaction_id) ? N : [...N, $]) : $.type === "agent_interaction_resolved" && i((N) => N.filter((I) => I.interaction_id !== $.interaction_id)));
    };
    return document.addEventListener(G, g), () => {
      C = !1, document.removeEventListener(G, g);
    };
  }, [e, t]);
  const o = r[0];
  if (M(() => {
    var A, $;
    const C = (($ = (A = o == null ? void 0 : o.request) == null ? void 0 : A.requestedSchema) == null ? void 0 : $.properties) || {}, g = Object.fromEntries(Object.entries(C).flatMap(([N, I]) => Object.hasOwn(I, "default") ? [[N, I.default]] : I.type === "boolean" ? [[N, !1]] : []));
    l(g), m("");
  }, [o == null ? void 0 : o.interaction_id]), !o) return null;
  const u = o.request, f = ((w = u.requestedSchema) == null ? void 0 : w.properties) || {};
  async function v(C) {
    s(!0), m("");
    try {
      await a0(o.interaction_id, C), i((g) => g.filter((A) => A.interaction_id !== o.interaction_id)), l({});
    } catch (g) {
      m(g.message);
    } finally {
      s(!1);
    }
  }
  return /* @__PURE__ */ d("section", { className: "reader-ai-agent-interaction", "aria-label": "Agent 请求确认", "aria-live": "polite", children: [
    /* @__PURE__ */ d("div", { className: "reader-ai-agent-interaction-head", children: [
      /* @__PURE__ */ a(Z2, { size: 17, "aria-hidden": "true" }),
      /* @__PURE__ */ d("strong", { children: [
        o.connection_name,
        " ",
        o.kind === "permission" ? "请求权限" : "需要你的补充"
      ] })
    ] }),
    /* @__PURE__ */ a("p", { children: u.message || ((D = u.toolCall) == null ? void 0 : D.title) || "请确认本次操作" }),
    o.kind === "permission" && ((x = (F = u.toolCall) == null ? void 0 : F.rawInput) != null && x.command) ? /* @__PURE__ */ a("pre", { className: "reader-ai-agent-command", children: String(u.toolCall.rawInput.command).slice(0, 4e3) }) : null,
    o.kind === "permission" && ((E = (y = u.toolCall) == null ? void 0 : y.locations) != null && E.length) ? /* @__PURE__ */ a("p", { className: "reader-ai-connection-notice", children: u.toolCall.locations.map((C) => C.path).filter(Boolean).join("、") }) : null,
    o.kind === "form" ? /* @__PURE__ */ d("form", { onSubmit: (C) => {
      C.preventDefault(), v({ action: "accept", content: n });
    }, children: [
      Object.entries(f).map(([C, g]) => {
        var A, $, N, I, Z, B, q;
        return /* @__PURE__ */ d("label", { className: "reader-ai-agent-form-field", children: [
          /* @__PURE__ */ d("span", { children: [
            g.title || C,
            ($ = (A = u.requestedSchema) == null ? void 0 : A.required) != null && $.includes(C) ? " *" : ""
          ] }),
          g.description ? /* @__PURE__ */ a("small", { children: g.description }) : null,
          g.type === "array" && ((N = g.items) != null && N.enum) ? /* @__PURE__ */ a(
            "select",
            {
              multiple: !0,
              "aria-label": g.title || C,
              value: Array.isArray(n[C]) ? n[C] : [],
              onChange: (h) => l((L) => ({ ...L, [C]: Array.from(h.target.selectedOptions, (T) => T.value) })),
              children: g.items.enum.map((h) => /* @__PURE__ */ a("option", { value: h, children: h }, h))
            }
          ) : g.enum ? /* @__PURE__ */ d(
            "select",
            {
              "aria-label": g.title || C,
              required: (Z = (I = u.requestedSchema) == null ? void 0 : I.required) == null ? void 0 : Z.includes(C),
              value: String(n[C] ?? ""),
              onChange: (h) => l((L) => ({ ...L, [C]: h.target.value })),
              children: [
                /* @__PURE__ */ a("option", { value: "", children: "请选择" }),
                g.enum.map((h) => /* @__PURE__ */ a("option", { value: h, children: h }, h))
              ]
            }
          ) : /* @__PURE__ */ a(
            "input",
            {
              "aria-label": g.title || C,
              type: g.type === "boolean" ? "checkbox" : ["integer", "number"].includes(g.type) ? "number" : "text",
              value: g.type === "boolean" ? void 0 : String(n[C] ?? ""),
              checked: g.type === "boolean" ? !!n[C] : void 0,
              min: g.minimum,
              max: g.maximum,
              minLength: g.minLength,
              maxLength: g.maxLength,
              step: g.type === "number" ? "any" : void 0,
              required: g.type !== "boolean" && ((q = (B = u.requestedSchema) == null ? void 0 : B.required) == null ? void 0 : q.includes(C)),
              onChange: (h) => l((L) => ({ ...L, [C]: g.type === "boolean" ? h.target.checked : ["integer", "number"].includes(g.type) ? Number(h.target.value) : h.target.value }))
            }
          )
        ] }, C);
      }),
      /* @__PURE__ */ d("div", { className: "reader-ai-agent-interaction-actions", children: [
        /* @__PURE__ */ a("button", { type: "submit", disabled: c, children: "发送补充" }),
        /* @__PURE__ */ a("button", { type: "button", disabled: c, onClick: () => void v({ action: "decline" }), children: "拒绝" }),
        /* @__PURE__ */ a("button", { type: "button", disabled: c, onClick: () => void v({ action: "cancel" }), children: "取消" })
      ] })
    ] }) : /* @__PURE__ */ d("div", { className: "reader-ai-agent-interaction-actions", children: [
      (b = u.options) == null ? void 0 : b.map((C) => /* @__PURE__ */ a("button", { type: "button", disabled: c, onClick: () => void v({ option_id: C.optionId }), children: C.name }, C.optionId)),
      /* @__PURE__ */ a("button", { type: "button", disabled: c, onClick: () => void v({}), children: "取消" })
    ] }),
    p ? /* @__PURE__ */ a("p", { role: "alert", className: "reader-ai-connection-error", children: p }) : null
  ] });
}
const J0 = {
  search_fulltext: "检索文献",
  read_blocks: "阅读原文",
  list_documents: "查找文献",
  search_favorites: "检索收藏",
  search_markdown: "检索全文",
  read_markdown_chunk: "阅读全文",
  read_figure: "查看图表",
  calculate_expression: "计算表达式",
  calculate_statistics: "统计分析",
  analyze_table: "分析表格",
  generate_chart: "生成图表",
  exec_command: "运行命令",
  read_file: "读取文件"
}, p2 = (e = 0) => `${Math.max(1, Math.round(e / 1e3))} 秒`;
function N2(e) {
  return (typeof e == "string" ? e : JSON.stringify(e, null, 2) || "").slice(0, 8e3);
}
function ee({ part: e, running: t }) {
  var l, c;
  if (e.type === "notice") return /* @__PURE__ */ d("details", { className: "reader-ai-activity-step ai-agent-notice", children: [
    /* @__PURE__ */ d("summary", { children: [
      /* @__PURE__ */ a(D2, { size: 14, "aria-hidden": "true" }),
      /* @__PURE__ */ a("span", { children: e.title }),
      /* @__PURE__ */ a(R, { size: 12, "aria-hidden": "true" })
    ] }),
    e.text ? /* @__PURE__ */ a("div", { className: "reader-ai-activity-detail", children: e.text }) : null
  ] });
  const r = t && !["completed", "failed", "cancelled"].includes(e.status || ""), i = e.type === "reasoning" ? Y2 : e.type === "plan" ? $2 : /search/.test(e.tool || "") ? _2 : /read|list/.test(e.tool || "") ? I2 : X2, n = e.type === "reasoning" ? "思考过程" : e.type === "plan" ? "执行计划" : J0[e.tool || ""] || e.title || "执行工具";
  return /* @__PURE__ */ d("details", { className: `reader-ai-activity-step${r ? " is-active" : ""}`, children: [
    /* @__PURE__ */ d("summary", { children: [
      /* @__PURE__ */ a(i, { size: 15, "aria-hidden": "true" }),
      /* @__PURE__ */ a("span", { className: "reader-ai-activity-label", title: n, children: n }),
      e.summary || r && e.type === "reasoning" && e.text ? /* @__PURE__ */ a("span", { className: "reader-ai-activity-summary", children: e.summary || ((l = e.text) == null ? void 0 : l.slice(-90).replace(/\s+/g, " ")) }) : null,
      /* @__PURE__ */ a("span", { className: "reader-ai-activity-state", children: e.status === "failed" ? /* @__PURE__ */ a(D2, { size: 13, "aria-label": "执行失败" }) : r ? /* @__PURE__ */ a(t2, { size: 13, className: "reader-ai-spin", "aria-label": "进行中" }) : /* @__PURE__ */ a(U, { size: 13, "aria-label": "已完成" }) }),
      e.duration_ms != null ? /* @__PURE__ */ a("span", { className: "reader-ai-activity-time", children: p2(e.duration_ms) }) : null,
      /* @__PURE__ */ a(R, { size: 13, className: "reader-ai-details-chevron", "aria-hidden": "true" })
    ] }),
    /* @__PURE__ */ a("div", { className: "reader-ai-activity-detail", children: e.type === "reasoning" ? /* @__PURE__ */ a("div", { className: "reader-ai-reasoning-text", children: e.text }) : e.type === "plan" ? /* @__PURE__ */ a("ol", { className: "reader-ai-plan-list", children: (c = e.entries) == null ? void 0 : c.map((s, p) => /* @__PURE__ */ d("li", { "data-status": s.status, children: [
      s.status === "completed" ? /* @__PURE__ */ a(U, { size: 13, "aria-hidden": "true" }) : /* @__PURE__ */ a("span", { className: "reader-ai-plan-dot" }),
      /* @__PURE__ */ a("span", { children: s.content })
    ] }, p)) }) : /* @__PURE__ */ d(S, { children: [
      e.input != null || e.input_preview ? /* @__PURE__ */ d(S, { children: [
        /* @__PURE__ */ a("span", { className: "reader-ai-detail-label", children: "输入" }),
        /* @__PURE__ */ a("pre", { children: N2(e.input ?? e.input_preview) })
      ] }) : null,
      e.output != null || e.content != null ? /* @__PURE__ */ d(S, { children: [
        /* @__PURE__ */ a("span", { className: "reader-ai-detail-label", children: "结果" }),
        /* @__PURE__ */ a("pre", { children: N2(e.output ?? e.content) })
      ] }) : null,
      !e.input && !e.input_preview && !e.output && !e.content ? /* @__PURE__ */ a("p", { children: r ? "正在执行，结果会在这里更新。" : e.summary || "执行已结束。" }) : null
    ] }) })
  ] });
}
function fe({ label: e, running: t, elapsedMs: r = 0 }) {
  const [i, n] = k(r);
  return M(() => {
    if (n(r), !t) return;
    const l = Date.now() - r, c = setInterval(() => n(Date.now() - l), 1e3);
    return () => clearInterval(c);
  }, [t, r]), !t && !r ? null : /* @__PURE__ */ d("div", { className: "reader-ai-run-status", role: "status", "aria-live": "polite", children: [
    t ? /* @__PURE__ */ a(t2, { size: 14, className: "reader-ai-spin", "aria-hidden": "true" }) : /* @__PURE__ */ a(K2, { size: 13, "aria-hidden": "true" }),
    /* @__PURE__ */ a("span", { children: t ? e || "正在处理问题" : "耗时" }),
    /* @__PURE__ */ a("span", { className: "reader-ai-run-elapsed", children: p2(i) })
  ] });
}
const Ce = U2(function({ parts: t = [], content: r, citations: i = [], streaming: n = !1, metrics: l, jobId: c, onJumpCitation: s }) {
  if (!t.length) return /* @__PURE__ */ a(n2, { content: r, streaming: n, citations: i, jobId: c, onJumpCitation: s });
  const p = t.map((o) => o.type).lastIndexOf("text"), m = [];
  return t.forEach((o, u) => {
    var f;
    o.type === "text" ? m.push({ key: o.id, parts: [o], textIndex: u }) : ((f = m.at(-1)) == null ? void 0 : f.textIndex) === void 0 && m.length ? m.at(-1).parts.push(o) : m.push({ key: o.id, parts: [o] });
  }), /* @__PURE__ */ d("div", { className: "reader-ai-turn-content", children: [
    m.map((o) => o.textIndex != null ? /* @__PURE__ */ a(
      n2,
      {
        content: o.parts[0].text || "",
        streaming: n && o.textIndex === p,
        citations: i,
        citationFooterMax: o.textIndex === p ? 8 : 0,
        jobId: c,
        onJumpCitation: s
      },
      o.key
    ) : /* @__PURE__ */ d("div", { children: [
      /* @__PURE__ */ d("details", { className: "reader-ai-activity-group", "aria-label": "执行过程", open: n, children: [
        /* @__PURE__ */ d("summary", { className: "reader-ai-activity-group-head", children: [
          /* @__PURE__ */ a($2, { size: 15, "aria-hidden": "true" }),
          /* @__PURE__ */ a("span", { children: "思考与执行" }),
          /* @__PURE__ */ d("span", { className: "reader-ai-activity-summary", children: [
            o.parts.length,
            " 个步骤"
          ] }),
          /* @__PURE__ */ a(R, { size: 13, className: "reader-ai-details-chevron", "aria-hidden": "true" })
        ] }),
        /* @__PURE__ */ a("div", { className: "reader-ai-activity-list", children: o.parts.map((u) => /* @__PURE__ */ a(ee, { part: u, running: n }, u.id)) })
      ] }),
      (() => {
        const u = [...new Set(o.parts.flatMap((f) => f.tool === "read_figure" && f.output && typeof f.output == "object" ? f.output.image_urls || [] : []))];
        return u.length ? /* @__PURE__ */ d("details", { className: "reader-ai-figure-gallery", children: [
          /* @__PURE__ */ d("summary", { children: [
            /* @__PURE__ */ a(I2, { size: 14, "aria-hidden": "true" }),
            "查看 ",
            u.length,
            " 张原图",
            /* @__PURE__ */ a(R, { size: 12, "aria-hidden": "true" })
          ] }),
          /* @__PURE__ */ a(n2, { content: u.map((f, v) => `![图表 ${v + 1}](${f})`).join(`

`), citations: i, jobId: c, citationFooterMax: 0 })
        ] }) : null;
      })()
    ] }, o.key)),
    !n && (l != null && l.usage) ? /* @__PURE__ */ d("details", { className: "reader-ai-usage", children: [
      /* @__PURE__ */ d("summary", { children: [
        "上下文与用量",
        /* @__PURE__ */ a(R, { size: 12, "aria-hidden": "true" })
      ] }),
      /* @__PURE__ */ a("dl", { className: "reader-ai-usage-facts", children: Object.entries({
        "输入 Token": l.usage.input_tokens ?? l.usage.prompt_tokens ?? l.usage.used,
        "输出 Token": l.usage.output_tokens ?? l.usage.completion_tokens,
        上下文上限: l.usage.size ?? l.usage.context_window,
        首段正文: l.first_text_ms != null ? p2(l.first_text_ms) : void 0
      }).filter(([, o]) => o != null).map(([o, u]) => /* @__PURE__ */ d("div", { children: [
        /* @__PURE__ */ a("dt", { children: o }),
        /* @__PURE__ */ a("dd", { children: String(u) })
      ] }, o)) })
    ] }) : null
  ] });
});
export {
  r2 as A,
  ge as a,
  l2 as b,
  pe as c,
  n2 as d,
  de as e,
  fe as f,
  Ce as g,
  ce as h,
  i2 as i,
  K as j,
  o2 as k,
  k2 as l,
  he as m,
  ue as n,
  Q0 as r,
  me as u
};
//# sourceMappingURL=AiTurnContent-D8ylgAX6.js.map
