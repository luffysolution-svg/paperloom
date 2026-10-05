import { n as b } from "./block-key-BTxcG28S.js";
function p(n) {
  return n && typeof n == "object" && !Array.isArray(n) ? n : null;
}
function M(n) {
  const t = p(n);
  return t && "data" in t ? t.data : n;
}
function h(n) {
  const t = Number(n);
  return Number.isFinite(t) && t > 0 ? t : null;
}
function w(n) {
  const t = p(n);
  if (!t || !Array.isArray(t.bbox) || t.bbox.length !== 4) return null;
  const r = t.bbox.map(Number);
  if (!r.every(Number.isFinite)) return null;
  const s = h(t.page);
  if (s == null) return null;
  const [o, e, a, l] = r, i = Math.min(o, a), u = Math.min(e, l), g = Math.max(o, a), c = Math.max(e, l);
  if (g <= i || c <= u) return null;
  const d = `${t.unit || "pdf_point"}`.trim().toLowerCase();
  if (d !== "pdf_point" && d !== "pt") return null;
  const f = `${t.origin || "top_left"}`.trim().toLowerCase();
  return f !== "top_left" && f !== "bottom_left" ? null : {
    page: Math.floor(s),
    bbox: [i, u, g, c],
    unit: "pdf_point",
    origin: f,
    text: `${t.text || ""}`
  };
}
function I(n) {
  const t = p(M(n)), r = Array.isArray(t == null ? void 0 : t.items) ? t.items : [], s = [];
  for (const o of r) {
    const e = p(o), a = `${(e == null ? void 0 : e.item_id) || (e == null ? void 0 : e.itemId) || ""}`.trim(), l = w(e == null ? void 0 : e.source), i = w(e == null ? void 0 : e.translated);
    !a || !l || !i || s.push({
      itemId: a,
      source: l,
      translated: i,
      markdown: `${(e == null ? void 0 : e.markdown) || ""}`,
      regionType: `${(e == null ? void 0 : e.region_type) || (e == null ? void 0 : e.regionType) || ""}`,
      status: `${(e == null ? void 0 : e.status) || ""}`,
      assetIds: (Array.isArray(e == null ? void 0 : e.asset_ids) ? e.asset_ids : []).map((u) => `${u || ""}`.trim()).filter(Boolean),
      assetUrls: (Array.isArray(e == null ? void 0 : e.asset_urls) ? e.asset_urls : []).map((u) => `${u || ""}`.trim()).filter(Boolean)
    });
  }
  return s;
}
function _(n) {
  const t = `${n || ""}`.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return t.includes("formula") || t.includes("equation") ? "formula" : t.includes("table") ? "table" : t.includes("figure") || t.includes("image") || t.includes("chart") || t.includes("seal") ? "figure" : t.includes("text") || t.includes("title") || t.includes("paragraph") || t.includes("reference") || t.includes("caption") ? "text" : "region";
}
function C(n) {
  const t = _(n.regionType);
  if (t !== "region") return t;
  if (n.assetIds.length || n.assetUrls.length) return "figure";
  const r = `${n.markdown || n.source.text || n.translated.text || ""}`.trim();
  return /^<table(?:\s|>)/i.test(r) || /\n\s*\|?\s*:?-{3,}/.test(r) ? "table" : /^\$\$[\s\S]+\$\$$/.test(r) || /^\\\[[\s\S]+\\\]$/.test(r) || /^\\begin\{(?:equation|align|gather|multline)\*?\}/.test(r) ? "formula" : r ? "text" : t;
}
function z(n) {
  const t = C(n);
  return t === "formula" || t === "table" || t === "figure";
}
function k(n, t) {
  return `${R(n, t).text || n.markdown || ""}`.trim();
}
function L(n) {
  let t = `${n || ""}`.trim();
  if (!t) return "";
  const r = t.match(/^```(?:latex|tex|math)?\s*([\s\S]*?)\s*```$/i);
  r && (t = r[1].trim());
  const s = [
    ["$$", "$$"],
    ["\\[", "\\]"],
    ["\\(", "\\)"],
    ["$", "$"]
  ];
  for (const [o, e] of s)
    if (t.startsWith(o) && t.endsWith(e) && t.length > o.length + e.length)
      return t.slice(o.length, -e.length).trim();
  return t;
}
function $(n) {
  const t = p(n);
  if (!t) return null;
  const r = [];
  for (const o of Array.isArray(t.pages) ? t.pages : []) {
    const e = p(o), a = h(e == null ? void 0 : e.page), l = h(e == null ? void 0 : e.width), i = h(e == null ? void 0 : e.height);
    a == null || l == null || i == null || r.push({ page: Math.floor(a), width: l, height: i });
  }
  if (!r.length) return null;
  const s = h(t.page_count ?? t.pageCount);
  return {
    pageCount: s == null ? r.length : Math.floor(s),
    pages: r
  };
}
function F(n) {
  const t = p(M(n));
  return {
    source: $(t == null ? void 0 : t.source),
    translated: $(t == null ? void 0 : t.translated)
  };
}
function N(n, t) {
  const r = b(t);
  return r && n.find((s) => b(s.itemId) === r) || null;
}
function m(n) {
  return `${n || ""}`.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, "").trim();
}
function A(n) {
  const t = `${n || ""}`.trim();
  if (!t) return [];
  const r = t.split(/\n\s*\n/g).map(m).filter(Boolean), s = t.split(">").map(m).filter(Boolean), o = [...r.reverse(), ...s.reverse(), m(t)];
  return [...new Set(o)].filter((e) => e.length >= 16);
}
function S(n, t) {
  if (!n || !t) return 0;
  if (n.includes(t)) return 1e4 + t.length;
  const r = Math.min(72, t.length);
  if (r < 24) return 0;
  const s = Math.min(32, Math.max(0, t.length - r));
  for (let o = 0; o <= s; o += 4) {
    const e = t.slice(o, o + r);
    if (e.length >= 24 && n.includes(e))
      return e.length * 100 - o;
  }
  return 0;
}
function U(n, t) {
  if (!t) return null;
  const r = N(n, t.block_id);
  if (r) return r;
  const s = A(t.snippet);
  if (!s.length) return null;
  const o = t.page_idx != null ? Number(t.page_idx) + 1 : t.page != null ? Number(t.page) : null, e = Number.isFinite(o) && Number(o) >= 1 ? n.filter((u) => u.source.page === Math.floor(Number(o)) || u.translated.page === Math.floor(Number(o))) : n;
  let a = null, l = 0, i = !1;
  for (const u of e) {
    const g = [u.source.text, u.translated.text, u.markdown].map(m).filter(Boolean);
    let c = 0;
    for (const d of s)
      for (const f of g)
        c = Math.max(c, S(f, d));
    c > l ? (a = u, l = c, i = !1) : c > 0 && c === l && (i = !0);
  }
  return l > 0 && !i ? a : null;
}
function y(n) {
  let t = `${n || ""}`.trim().replace(/\\/g, "/");
  if (!t) return "";
  try {
    t = decodeURIComponent(new URL(t, "http://retainpdf.local/").pathname);
  } catch {
    try {
      t = decodeURIComponent(t);
    } catch {
    }
  }
  const r = "/markdown/images/", s = t.toLowerCase().indexOf(r);
  return s >= 0 && (t = t.slice(s + r.length)), t.replace(/^\.?\/?(?:images\/)?/i, "").replace(/\/{2,}/g, "/");
}
function P(n, t, r) {
  const s = y(t);
  if (!s) return null;
  const o = Number(r);
  return (Number.isFinite(o) && o >= 1 ? n.filter((a) => a.source.page === Math.floor(o)) : n).find((a) => [...a.assetUrls, ...a.assetIds].some((l) => {
    const i = y(l);
    return !!i && (i === s || s.endsWith(`/${i}`) || i.endsWith(`/${s}`));
  })) || null;
}
function R(n, t) {
  return t === "translated" ? n.translated : n.source;
}
function T(n, t, r) {
  if (!n || !t) return null;
  const s = R(n, r), o = r === "translated" ? t.translated : t.source || t.translated, e = o == null ? void 0 : o.pages.find((a) => a.page === s.page);
  return e ? { itemId: n.itemId, region: n, box: s, pageSize: e } : null;
}
function K(n, t, r) {
  if (!n || t <= 0 || r <= 0) return null;
  const { box: s, pageSize: o } = n;
  if (o.width <= 0 || o.height <= 0) return null;
  const [e, a, l, i] = s.bbox, u = s.origin === "bottom_left" ? o.height - i : a, g = s.origin === "bottom_left" ? o.height - a : i, c = Math.max(0, Math.min(t, e / o.width * t)), d = Math.max(c, Math.min(t, l / o.width * t)), f = Math.max(0, Math.min(r, u / o.height * r)), x = Math.max(f, Math.min(r, g / o.height * r));
  return d <= c || x <= f ? null : { left: c, top: f, width: d - c, height: x - f };
}
export {
  P as a,
  U as b,
  I as c,
  _ as d,
  L as e,
  N as f,
  C as g,
  R as h,
  z as i,
  T as j,
  F as n,
  K as p,
  k as r
};
//# sourceMappingURL=reader-regions-DsePY7B_.js.map
