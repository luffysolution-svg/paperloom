import { jsxs as y, jsx as i, Fragment as j } from "react/jsx-runtime";
import { useId as O, useState as I, useCallback as E, useRef as k, useEffect as P, useLayoutEffect as tt, createContext as et, useContext as U, useMemo as B } from "react";
import { w as X, e as nt, j as G, y as T, x as K, v as rt, a as at, h as ot, l as st, g as it, u as lt } from "./answer-enhance-D8zK9znw.js";
import ct, { setCustomComponents as dt, PreCodeNode as ut, MathInlineNode as ht } from "markstream-react";
import { createPortal as ft } from "react-dom";
const mt = "retainpdf-chart", pt = 6, gt = 40, bt = /* @__PURE__ */ new Set(["bar", "line", "pie"]);
function $t(t) {
  if (typeof t == "number") return Number.isFinite(t) ? t : null;
  if (typeof t == "string" && t.trim()) {
    const e = Number(t);
    return Number.isFinite(e) ? e : null;
  }
  return null;
}
function S(t, e = "") {
  return `${t ?? ""}`.trim() || e;
}
function wt(t) {
  if (!Array.isArray(t)) return [];
  const e = [];
  for (const n of t) {
    if (!n || typeof n != "object") continue;
    const a = n, r = $t(a.value ?? a.y);
    if (r !== null && (e.push({ label: S(a.label ?? a.x, `${e.length + 1}`), value: r }), e.length >= gt))
      break;
  }
  return e;
}
function yt(t) {
  if (!Array.isArray(t)) return [];
  const e = [];
  for (const n of t) {
    if (!n || typeof n != "object") continue;
    const a = n, r = wt(a.points ?? a.data);
    if (r.length && (e.push({ name: S(a.name, `系列 ${e.length + 1}`), points: r }), e.length >= pt))
      break;
  }
  return e;
}
function xt(t) {
  const e = `${t || ""}`.trim();
  if (!e) return null;
  let n;
  try {
    n = JSON.parse(e);
  } catch {
    return null;
  }
  if (!n || typeof n != "object" || Array.isArray(n)) return null;
  const a = n, r = `${a.kind ?? a.type ?? ""}`.trim().toLowerCase();
  if (!bt.has(r)) return null;
  const s = yt(a.series);
  if (!s.length) return null;
  const l = r === "pie" ? s.slice(0, 1) : s;
  return {
    kind: r,
    title: S(a.title),
    xLabel: S(a.xLabel ?? a.x_label),
    yLabel: S(a.yLabel ?? a.y_label),
    series: l
  };
}
function Mt(t) {
  const e = t.series.flatMap((l) => l.points.map((o) => o.value)), n = Math.min(...e), a = Math.max(...e), r = Math.min(0, n), s = Math.max(0, a);
  return r === s ? { min: r, max: s + 1 } : { min: r, max: s };
}
function D(t) {
  let e = [];
  for (const n of t.series)
    n.points.length > e.length && (e = n.points);
  return e.map((n) => n.label);
}
const V = 640, H = 300, $ = { top: 16, right: 16, bottom: 44, left: 52 }, L = V - $.left - $.right, v = H - $.top - $.bottom, F = [
  "var(--chart-1, #4c6ef5)",
  "var(--chart-2, #f08c00)",
  "var(--chart-3, #2f9e44)",
  "var(--chart-4, #e03131)",
  "var(--chart-5, #ae3ec9)",
  "var(--chart-6, #0c8599)"
], _ = (t) => F[t % F.length];
function Nt(t, e) {
  return Array.from({ length: 5 }, (a, r) => t + (e - t) * r / 4);
}
function vt(t) {
  const e = Math.abs(t);
  return e >= 1e4 ? `${(t / 1e3).toFixed(0)}k` : Number.isInteger(t) ? `${t}` : t.toFixed(e < 1 ? 2 : 1);
}
function At(t) {
  return t <= 8 ? 1 : Math.ceil(t / 8);
}
function Lt({
  spec: t,
  min: e,
  max: n,
  labels: a
}) {
  const r = (o) => $.top + v - (o - e) / (n - e) * v, s = At(a.length), l = L / Math.max(1, a.length);
  return /* @__PURE__ */ y("g", { className: "reader-answer-chart-axes", children: [
    Nt(e, n).map((o) => /* @__PURE__ */ y("g", { children: [
      /* @__PURE__ */ i(
        "line",
        {
          className: "reader-answer-chart-grid",
          x1: $.left,
          x2: $.left + L,
          y1: r(o),
          y2: r(o)
        }
      ),
      /* @__PURE__ */ i("text", { className: "reader-answer-chart-tick", x: $.left - 8, y: r(o), textAnchor: "end", dominantBaseline: "middle", children: vt(o) })
    ] }, o)),
    a.map((o, u) => u % s === 0 ? /* @__PURE__ */ i(
      "text",
      {
        className: "reader-answer-chart-tick",
        x: $.left + l * (u + 0.5),
        y: $.top + v + 18,
        textAnchor: "middle",
        children: o.length > 10 ? `${o.slice(0, 9)}…` : o
      },
      `${o}-${u}`
    ) : null),
    t.yLabel ? /* @__PURE__ */ i("text", { className: "reader-answer-chart-axis-label", x: $.left, y: $.top - 4, textAnchor: "start", children: t.yLabel }) : null,
    t.xLabel ? /* @__PURE__ */ i(
      "text",
      {
        className: "reader-answer-chart-axis-label",
        x: $.left + L,
        y: H - 6,
        textAnchor: "end",
        children: t.xLabel
      }
    ) : null
  ] });
}
function kt({ spec: t, min: e, max: n }) {
  const a = D(t), r = L / Math.max(1, a.length), s = r * 0.7, l = s / t.series.length, o = (d) => $.top + v - (d - e) / (n - e) * v, u = o(0);
  return /* @__PURE__ */ i(j, { children: t.series.map((d, c) => /* @__PURE__ */ i("g", { fill: _(c), children: d.points.map((h, g) => {
    const m = o(h.value), p = $.left + r * g + (r - s) / 2 + l * c;
    return /* @__PURE__ */ i(
      "rect",
      {
        x: p,
        y: Math.min(m, u),
        width: Math.max(1, l - 1),
        height: Math.max(1, Math.abs(u - m)),
        rx: 2,
        children: /* @__PURE__ */ i("title", { children: `${d.name} · ${h.label}: ${h.value}` })
      },
      `${h.label}-${g}`
    );
  }) }, d.name)) });
}
function Ct({ spec: t, min: e, max: n }) {
  const a = D(t), r = L / Math.max(1, a.length), s = (o) => $.top + v - (o - e) / (n - e) * v, l = (o) => $.left + r * (o + 0.5);
  return /* @__PURE__ */ i(j, { children: t.series.map((o, u) => {
    const d = o.points.map((c, h) => `${h === 0 ? "M" : "L"} ${l(h)} ${s(c.value)}`).join(" ");
    return /* @__PURE__ */ y("g", { stroke: _(u), fill: _(u), children: [
      /* @__PURE__ */ i("path", { className: "reader-answer-chart-line", d, fill: "none" }),
      o.points.map((c, h) => /* @__PURE__ */ i(
        "circle",
        {
          cx: l(h),
          cy: s(c.value),
          r: 3,
          stroke: "none",
          children: /* @__PURE__ */ i("title", { children: `${o.name} · ${c.label}: ${c.value}` })
        },
        `${c.label}-${h}`
      ))
    ] }, o.name);
  }) });
}
function Et({ spec: t }) {
  var u;
  const e = ((u = t.series[0]) == null ? void 0 : u.points) ?? [], n = e.map((d) => Math.max(0, d.value)), a = n.reduce((d, c) => d + c, 0);
  if (a <= 0) return null;
  const r = $.left + L / 2, s = $.top + v / 2, l = Math.min(L, v) / 2 - 8;
  let o = -Math.PI / 2;
  return /* @__PURE__ */ i(j, { children: e.map((d, c) => {
    const h = n[c] / a, g = o + h * Math.PI * 2, m = r + l * Math.cos(o), p = s + l * Math.sin(o), w = r + l * Math.cos(g), M = s + l * Math.sin(g), N = h > 0.5 ? 1 : 0, f = h >= 1 ? `M ${r} ${s - l} A ${l} ${l} 0 1 1 ${r - 0.01} ${s - l} Z` : `M ${r} ${s} L ${m} ${p} A ${l} ${l} 0 ${N} 1 ${w} ${M} Z`;
    return o = g, /* @__PURE__ */ i("path", { d: f, fill: _(c), children: /* @__PURE__ */ i("title", { children: `${d.label}: ${d.value}（${(h * 100).toFixed(1)}%）` }) }, `${d.label}-${c}`);
  }) });
}
function Pt({ spec: t }) {
  var n;
  const e = t.kind === "pie" ? (((n = t.series[0]) == null ? void 0 : n.points) ?? []).map((a) => a.label) : t.series.map((a) => a.name);
  return e.length < 2 ? null : /* @__PURE__ */ i("ul", { className: "reader-answer-chart-legend", children: e.map((a, r) => /* @__PURE__ */ y("li", { children: [
    /* @__PURE__ */ i("span", { className: "reader-answer-chart-swatch", style: { background: _(r) }, "aria-hidden": !0 }),
    a
  ] }, `${a}-${r}`)) });
}
function Rt({ spec: t }) {
  const e = O(), { min: n, max: a } = Mt(t), r = D(t), s = t.title || `${t.series.length} 个系列的${t.kind === "pie" ? "占比" : "对比"}图`;
  return /* @__PURE__ */ y("figure", { className: "reader-answer-chart", children: [
    /* @__PURE__ */ y(
      "svg",
      {
        className: `reader-answer-chart-svg is-${t.kind}`,
        viewBox: `0 0 ${V} ${H}`,
        role: "img",
        "aria-labelledby": e,
        preserveAspectRatio: "xMidYMid meet",
        children: [
          /* @__PURE__ */ i("title", { id: e, children: s }),
          t.kind !== "pie" ? /* @__PURE__ */ i(Lt, { spec: t, min: n, max: a, labels: r }) : null,
          t.kind === "bar" ? /* @__PURE__ */ i(kt, { spec: t, min: n, max: a }) : null,
          t.kind === "line" ? /* @__PURE__ */ i(Ct, { spec: t, min: n, max: a }) : null,
          t.kind === "pie" ? /* @__PURE__ */ i(Et, { spec: t }) : null
        ]
      }
    ),
    /* @__PURE__ */ i(Pt, { spec: t }),
    t.title ? /* @__PURE__ */ i("figcaption", { className: "reader-answer-chart-caption", children: t.title }) : null
  ] });
}
const St = 1600;
function _t(t) {
  const e = `${t || ""}`.trim().toLowerCase();
  return !e || e === "text" || e === "plain" ? "" : {
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
  }[e] || e;
}
function It({
  language: t,
  code: e,
  children: n
}) {
  const [a, r] = I(!1), s = _t(t), l = E(() => {
    var u;
    const o = `${e || ""}`;
    o.trim() && ((u = navigator.clipboard) == null || u.writeText(o).then(
      () => {
        var d;
        r(!0), (d = globalThis.setTimeout) == null || d.call(globalThis, () => r(!1), St);
      },
      () => {
      }
    ));
  }, [e]);
  return /* @__PURE__ */ y("div", { className: "reader-answer-code", children: [
    /* @__PURE__ */ y("div", { className: "reader-answer-code-bar", children: [
      /* @__PURE__ */ i("span", { className: "reader-answer-code-lang", children: s }),
      /* @__PURE__ */ i(
        "button",
        {
          type: "button",
          className: "reader-answer-code-copy",
          onClick: l,
          title: "复制代码",
          children: a ? "已复制" : "复制"
        }
      )
    ] }),
    n
  ] });
}
const Tt = 8, jt = 8;
function Ot(t, e, n, { gap: a = Tt, margin: r = jt } = {}) {
  const s = n.height - t.bottom, l = t.top, o = e.height + a + r, u = s >= o || s >= l ? "bottom" : "top", d = u === "bottom" ? t.bottom + a : t.top - a - e.height, c = Math.max(r, n.height - e.height - r), h = Math.min(Math.max(d, r), c), g = t.left + t.width / 2 - e.width / 2, m = Math.max(r, n.width - e.width - r);
  return { left: Math.min(Math.max(g, r), m), top: h, placement: u };
}
const Dt = 240, Z = 180;
function q(t, e) {
  const n = `${t || ""}`.replace(/\s+/g, " ").trim();
  return n.length <= e ? n : `${n.slice(0, e - 1)}…`;
}
function Q(t, e) {
  return X(t) === null ? [] : `${t.job_id || e || ""}`.trim() ? ["translated", "source"] : [];
}
function Ht(t, e) {
  return Q(t, e).length > 0 || q(`${t.snippet || ""}`, Z).length > 0;
}
function Wt({
  citation: t,
  jobId: e,
  anchor: n,
  cardId: a,
  onPointerEnter: r,
  onPointerLeave: s
}) {
  const l = k(null), o = k(null), u = Q(t, e), d = X(t), c = d === null ? null : d + 1, h = q(`${t.snippet || ""}`, Z), [g, m] = I(
    u.length ? "loading" : "none"
  ), [p, w] = I(null);
  P(() => {
    const f = o.current;
    if (!f || !u.length) return;
    const b = `${t.job_id || e || ""}`.trim(), x = new AbortController();
    return (async () => {
      for (const C of u) {
        const A = nt(
          b,
          d ?? 0,
          C,
          {}
        );
        if (!A) break;
        if (f.setAttribute("data-ai-src", A), f.classList.remove("is-missing"), await G(f, { signal: x.signal }), x.signal.aborted) return;
        if (!f.classList.contains("is-missing")) {
          m("ready");
          return;
        }
      }
      x.signal.aborted || m("failed");
    })(), () => {
      x.abort(), T(f);
    };
  }, [t, e, d, u.length]), tt(() => {
    const f = l.current;
    if (!f || !n) return;
    const b = () => {
      const x = n.getBoundingClientRect(), C = f.getBoundingClientRect(), A = Ot(
        { top: x.top, left: x.left, bottom: x.bottom, width: x.width },
        {
          width: C.width || f.offsetWidth,
          height: C.height || f.offsetHeight
        },
        { width: window.innerWidth || 0, height: window.innerHeight || 0 }
      );
      w((R) => R && R.left === A.left && R.top === A.top && R.placement === A.placement ? R : A);
    };
    return b(), window.addEventListener("scroll", b, !0), window.addEventListener("resize", b), () => {
      window.removeEventListener("scroll", b, !0), window.removeEventListener("resize", b);
    };
  }, [n, g, h]);
  const M = /* @__PURE__ */ y(
    "div",
    {
      ref: l,
      id: a,
      role: "tooltip",
      className: `reader-ai-citation-card${p ? " is-placed" : ""}`,
      "data-placement": (p == null ? void 0 : p.placement) || "bottom",
      style: { left: `${(p == null ? void 0 : p.left) ?? 0}px`, top: `${(p == null ? void 0 : p.top) ?? 0}px` },
      onMouseEnter: r,
      onMouseLeave: s,
      children: [
        u.length ? /* @__PURE__ */ y("div", { className: "reader-ai-citation-card-figure", "data-state": g, children: [
          /* @__PURE__ */ i(
            "img",
            {
              ref: o,
              alt: c ? `第 ${c} 页预览` : "来源页预览",
              className: "reader-ai-citation-card-thumb",
              decoding: "async",
              width: Dt
            }
          ),
          g === "failed" ? /* @__PURE__ */ i("span", { className: "reader-ai-citation-card-thumb-fallback", children: "预览暂不可用" }) : null
        ] }) : null,
        /* @__PURE__ */ y("div", { className: "reader-ai-citation-card-text", children: [
          /* @__PURE__ */ i("div", { className: "reader-ai-citation-card-head", children: c ? `第 ${c} 页` : "来源" }),
          h ? /* @__PURE__ */ i("p", { className: "reader-ai-citation-card-snippet", children: h }) : null
        ] })
      ]
    }
  ), N = typeof document > "u" ? null : document.body;
  return N ? ft(M, N) : M;
}
const Bt = 140, Y = 180;
function Ft({ citation: t, label: e, jobId: n, onJump: a }) {
  const [r, s] = I(!1), l = k(null), o = k(null), u = `reader-ai-citation-card-${O().replace(/[^a-zA-Z0-9_-]/g, "")}`, d = K(t), c = Ht(t, n), h = E(() => {
    o.current !== null && (clearTimeout(o.current), o.current = null);
  }, []), g = E((w, M) => {
    h(), o.current = setTimeout(() => {
      o.current = null, s(w);
    }, M);
  }, [h]);
  P(() => () => h(), [h]), P(() => {
    c || s(!1);
  }, [c]);
  const m = E(() => {
    h(), s(!0);
  }, [h]), p = E(() => {
    h(), s(!1);
  }, [h]);
  return /* @__PURE__ */ y(j, { children: [
    /* @__PURE__ */ y(
      "button",
      {
        ref: l,
        type: "button",
        className: "reader-ai-citation-ref",
        "data-page": d ?? void 0,
        "aria-describedby": r ? u : void 0,
        "aria-expanded": c ? r : void 0,
        title: d ? `跳到第 ${d} 页` : "定位来源",
        onClick: (w) => {
          w.preventDefault(), w.stopPropagation(), p(), a == null || a(t);
        },
        onMouseEnter: c ? () => g(!0, Bt) : void 0,
        onMouseLeave: c ? () => g(!1, Y) : void 0,
        onFocus: c ? m : void 0,
        onBlur: c ? p : void 0,
        onKeyDown: (w) => {
          w.key === "Escape" && r && (w.stopPropagation(), p());
        },
        children: [
          "[",
          e,
          "]"
        ]
      }
    ),
    r && c ? /* @__PURE__ */ i(
      Wt,
      {
        citation: t,
        jobId: n,
        anchor: l.current,
        cardId: u,
        onPointerEnter: m,
        onPointerLeave: () => g(!1, Y)
      }
    ) : null
  ] });
}
const J = "retainpdf-ai-answer", z = 320, Yt = 2, W = et({
  final: !1,
  jobId: "",
  citations: []
});
function zt(t) {
  const e = Number(t.naturalWidth) || 0, n = t.closest(".reader-ai-image-jump"), a = n || t, r = e > 0 && e < z;
  if (t.classList.toggle("is-low-resolution", r), n == null || n.classList.toggle("is-low-resolution", r), r) {
    const s = Math.min(
      z,
      Math.max(e, e * Yt)
    );
    a.style.setProperty("--reader-ai-image-width", `${s}px`);
  } else
    a.style.removeProperty("--reader-ai-image-width");
}
function Ut({ node: t }) {
  const { final: e, jobId: n, citations: a, onJumpCitation: r } = U(W), s = k(null), l = k(null), o = `${t.alt || ""}`.trim(), u = rt(t.src, n, {}, at(a)), d = ot(t.src, a, n), c = K(d), h = E((m) => {
    var M;
    const p = s.current;
    if (p === m || ((M = l.current) == null || M.abort(), l.current = null, p && T(p), s.current = m, !m || !u)) return;
    const w = new AbortController();
    l.current = w, (async () => {
      for (const N of [0, 250, 750, 1500]) {
        if (N && await new Promise((b) => globalThis.setTimeout(b, N)), w.signal.aborted) return;
        const f = s.current;
        if (!f || f !== m || f.classList.contains("is-hydrated") && f.src.startsWith("blob:")) return;
        await G(f, { signal: w.signal });
      }
    })();
  }, [u]);
  if (P(() => () => {
    var m;
    (m = l.current) == null || m.abort(), l.current = null, T(s.current), s.current = null;
  }, []), !u)
    return e ? /* @__PURE__ */ i("span", { className: "aui-image-blocked", children: o ? `[图片不可用：${o}]` : "[图片不可用]" }) : /* @__PURE__ */ i("span", { className: "aui-image-pending", "aria-label": o || "图片加载中", children: o ? `[图片：${o}]` : "[图片加载中]" });
  const g = /* @__PURE__ */ i(
    "img",
    {
      ref: h,
      alt: o,
      "data-ai-src": u,
      decoding: "async",
      loading: "lazy",
      onLoad: (m) => zt(m.currentTarget),
      title: t.title || void 0
    }
  );
  return !d || !r ? g : /* @__PURE__ */ y(
    "button",
    {
      type: "button",
      className: "reader-ai-image-jump",
      "data-page": c ?? void 0,
      title: c ? `定位到 PDF 第 ${c} 页` : "定位到图片来源",
      onClick: (m) => {
        m.preventDefault(), m.stopPropagation(), r({ ...d, image_url: u });
      },
      children: [
        g,
        /* @__PURE__ */ i("span", { className: "reader-ai-image-jump-label", "aria-hidden": "true", children: c ? `定位 p.${c}` : "定位来源" })
      ]
    }
  );
}
function Xt({ node: t }) {
  const { citations: e, jobId: n, onJumpCitation: a } = U(W), r = `${t.href || ""}`.match(/^#retainpdf-citation-(\d+)$/), s = r ? e.find((o) => `${o.ref}` === r[1]) : null;
  if (s)
    return /* @__PURE__ */ i(
      Ft,
      {
        citation: s,
        label: `${(r == null ? void 0 : r[1]) ?? ""}`,
        jobId: n,
        onJump: a
      }
    );
  const l = `${t.text || t.href || ""}`.trim();
  return /* @__PURE__ */ i(
    "span",
    {
      className: "aui-md-extlink",
      "data-href": `${t.href || ""}`.trim() || void 0,
      title: l || void 0,
      children: l
    }
  );
}
function Gt(t) {
  const e = t.node;
  if (`${(e == null ? void 0 : e.language) || ""}`.trim().toLowerCase() === mt) {
    const n = xt(`${(e == null ? void 0 : e.code) || ""}`);
    if (n) return /* @__PURE__ */ i(Rt, { spec: n });
  }
  return /* @__PURE__ */ i(It, { language: `${(e == null ? void 0 : e.language) || ""}`, code: `${(e == null ? void 0 : e.code) || ""}`, children: /* @__PURE__ */ i(ut, { node: t.node }) });
}
function Kt({ node: t }) {
  return /* @__PURE__ */ i(
    ht,
    {
      node: t.markup === "$$" ? { ...t, markup: "$" } : t
    }
  );
}
dt(J, {
  image: Ut,
  link: Xt,
  math_inline: Kt,
  code_block: Gt
});
function Vt({
  content: t,
  final: e,
  indexKey: n,
  jobId: a,
  citations: r = [],
  onJumpCitation: s,
  onClickCapture: l
}) {
  return /* @__PURE__ */ i(W.Provider, { value: { final: e, jobId: a, citations: r, onJumpCitation: s }, children: /* @__PURE__ */ i(
    "div",
    {
      className: "retain-markstream-shell",
      "data-markdown-renderer": "markstream-react",
      onClickCapture: l,
      children: /* @__PURE__ */ i(
        ct,
        {
          batchRendering: !e,
          content: t,
          customId: J,
          fade: !1,
          final: e,
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
function ee({
  content: t,
  streaming: e = !1,
  citations: n = [],
  jobId: a = "",
  className: r = "",
  streamingClassName: s = "",
  pendingClassName: l = "",
  finalClassName: o = "",
  citationFooterMax: u = 5,
  onJumpCitation: d
}) {
  var N;
  const c = k(null), h = O(), g = e ? `${t || ""}` : `${t || ""}`.trim(), m = `${a || ((N = n.find((f) => f.job_id)) == null ? void 0 : N.job_id) || ""}`.trim(), p = B(() => {
    const f = /* @__PURE__ */ new Map();
    for (const b of n)
      st(b) && f.set(`${b.ref}`, b);
    return f;
  }, [n]), w = B(
    () => it(g, p),
    [g, p]
  );
  return P(() => {
    var x;
    const f = c.current;
    if (!f || !g) return;
    const b = f.parentElement;
    if (b instanceof HTMLElement) {
      if (e) {
        (x = b.querySelector(".reader-ai-citations")) == null || x.remove();
        return;
      }
      lt(b, n, {
        onJump: (C) => d == null ? void 0 : d(C),
        answerText: g,
        max: u
      });
    }
  }, [e, m, p, n, d, g, u]), P(() => () => T(c.current), []), g.trim() ? /* @__PURE__ */ i("div", { ref: c, className: `${r} ${e ? s : o || l}`.trim(), children: /* @__PURE__ */ i(
    Vt,
    {
      content: w,
      final: !e,
      indexKey: h,
      jobId: m,
      citations: n,
      onJumpCitation: d,
      onClickCapture: (f) => {
        const b = f.target;
        b instanceof Element && b.closest("a[href]") && (f.preventDefault(), f.stopPropagation());
      }
    }
  ) }) : null;
}
export {
  ee as A
};
//# sourceMappingURL=AiMarkdownAnswer-BKvhvx2o.js.map
