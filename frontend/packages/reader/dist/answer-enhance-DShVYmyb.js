function R(...t) {
  for (const r of t) {
    const e = `${r ?? ""}`.trim();
    if (e)
      return e;
  }
  return "";
}
let w = null, v = () => null, _ = () => null, P = () => "", M = () => "";
function Q(t = {}) {
  "credentialsPort" in t && (w = t.credentialsPort ?? null), t.loadBrowserStoredConfig && (v = t.loadBrowserStoredConfig), t.loadDeveloperStoredConfig && (_ = t.loadDeveloperStoredConfig), t.defaultModelBaseUrl && (P = t.defaultModelBaseUrl), t.defaultModelName && (M = t.defaultModelName);
}
function Z() {
  w = null, v = () => null, _ = () => null, P = () => "", M = () => "";
}
function C(t = v()) {
  var r, e;
  try {
    const n = `${((e = (r = w == null ? void 0 : w.getCredentials) == null ? void 0 : r.call(w)) == null ? void 0 : e.modelApiKey) ?? ""}`.trim();
    if (n)
      return n;
  } catch {
  }
  return `${(t == null ? void 0 : t.modelApiKey) ?? ""}`.trim();
}
function J({
  browserConfig: t = v(),
  developerConfig: r = _()
} = {}) {
  return {
    apiKey: C(t),
    baseUrl: R(r == null ? void 0 : r.baseUrl, P()),
    model: R(r == null ? void 0 : r.model, M()),
    provider: "deepseek",
    ...(r == null ? void 0 : r.apiProtocol) === "anthropic" || (r == null ? void 0 : r.apiProtocol) === "openai_responses" ? { apiProtocol: r.apiProtocol } : {}
  };
}
function tt(t) {
  return t !== void 0 ? !!C(t) : !!C();
}
const O = "retainpdf:credentials-changed";
function et() {
  var t;
  try {
    (t = globalThis.document) == null || t.dispatchEvent(new CustomEvent(O));
  } catch {
  }
}
const rt = "缺少模型 API Key：请到设置 → API 设置填写 DeepSeek 等模型 Key（不是后端 X-API-Key）。";
let E = 0, b = null, A = null, U = !1;
function k(t = Date.now()) {
  return t < E;
}
function B(t = 700) {
  const r = Date.now() + Math.max(0, t);
  r > E && (E = r);
}
function T() {
  E = 0, b == null || b(), b = null, z();
}
function W() {
  if (typeof document > "u") return null;
  if (A && A.isConnected) return A;
  const t = document.createElement("div");
  t.setAttribute("data-reader-ai-pointer-shield", "1"), t.setAttribute("aria-hidden", "true"), Object.assign(t.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483000",
    cursor: "progress",
    background: "transparent",
    // 只作为切会话期间的状态标记，不再成为全屏命中目标。
    // 真正需要阻止的是引用/链接导航；编辑器、按钮和文本选择必须可用。
    pointerEvents: "none"
  });
  const r = (e) => {
    var a;
    e.preventDefault(), e.stopPropagation(), (a = e.stopImmediatePropagation) == null || a.call(e);
  };
  for (const e of [
    "pointerdown",
    "pointerup",
    "mousedown",
    "mouseup",
    "click",
    "auxclick",
    "dblclick",
    "contextmenu",
    "touchstart",
    "touchend"
  ])
    t.addEventListener(e, r, { capture: !0, passive: !1 });
  return document.documentElement.appendChild(t), A = t, t;
}
function z() {
  if (A) {
    try {
      A.remove();
    } catch {
    }
    A = null;
  }
}
function nt(t = 700, r = {}) {
  if (B(t), typeof document > "u") return;
  b == null || b(), b = null;
  const e = Date.now() + Math.max(0, t), a = Math.max(0, Number(r.overlayDelayMs) || 0);
  let n = null;
  a === 0 ? W() : n = setTimeout(() => {
    n = null, Date.now() < e && W();
  }, a);
  const i = (o) => {
    var d;
    if (Date.now() >= e) {
      c();
      return;
    }
    const u = o.target;
    u instanceof Element && u.closest(
      "[data-reader-ai-sessions], [data-reader-ai-actions], [data-reader-ai-composer], .aui-composer, input, textarea, select, [contenteditable='true']"
    ) || (o.preventDefault(), o.stopPropagation(), (d = o.stopImmediatePropagation) == null || d.call(o));
  }, s = { capture: !0, passive: !1 }, l = ["click", "auxclick", "dblclick", "pointerup", "mouseup"], c = () => {
    n != null && (clearTimeout(n), n = null);
    for (const o of l)
      document.removeEventListener(o, i, s);
    z(), b === c && (b = null);
  };
  for (const o of l)
    document.addEventListener(o, i, s);
  b = c, window.setTimeout(c, Math.max(0, t) + 48);
}
function K(t) {
  return k() ? !0 : t ? typeof MouseEvent < "u" && t instanceof MouseEvent && t.isTrusted === !1 : !1;
}
function at() {
  if (typeof window > "u" || typeof window.open != "function")
    return () => {
    };
  if (U) return () => {
  };
  U = !0, T();
  const t = window.open.bind(window);
  window.open = ((e, a, n) => k() ? null : t(e, a, n));
  const r = (e) => {
    if (!k()) return;
    const a = e.target;
    if (!(a instanceof Element) || a.closest("[data-reader-ai-sessions]")) return;
    a.closest("a[href]") && (e.preventDefault(), e.stopPropagation());
  };
  return document.addEventListener("click", r, !0), () => {
    window.open = t, document.removeEventListener("click", r, !0), U = !1, T();
  };
}
let S = (t) => `${t ?? ""}`.trim(), D = globalThis.fetch ?? (async () => {
  throw new Error("fetch not available");
});
function ot(t = {}) {
  t.resolveResourceUrl && (S = t.resolveResourceUrl), t.fetchProtected && (D = t.fetchProtected);
}
function it() {
  S = (t) => `${t ?? ""}`.trim(), D = globalThis.fetch ?? (async () => {
    throw new Error("fetch not available");
  });
}
function F(t) {
  try {
    return S(t) || `${t ?? ""}`.trim();
  } catch {
    return `${t ?? ""}`.trim();
  }
}
function G(t) {
  return !!t && typeof t == "object" && `${t.block_id || ""}`.trim() !== "";
}
function N(t) {
  if (!t || typeof t != "object") return null;
  const r = t.page_idx;
  if (r != null && `${r}`.trim() !== "") {
    const n = Number(r);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  const e = t.page;
  if (e != null && `${e}`.trim() !== "") {
    const n = Number(e);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n) - 1;
  }
  const a = `${t.block_id || ""}`.match(/(?:^|[^0-9])p0*([1-9]\d*)(?:-|_|\b)/i);
  if (a) {
    const n = Number(a[1]);
    if (Number.isFinite(n) && n >= 1) return n - 1;
  }
  return null;
}
function j(t) {
  const r = N(t);
  return r === null ? null : r + 1;
}
function st(t) {
  if (!Array.isArray(t)) return [];
  const r = [];
  for (const e of t) {
    if (!e || typeof e != "object") continue;
    const a = e, n = `${a.block_id || ""}`.trim();
    if (!n) continue;
    const i = N(a);
    r.push({
      ...a,
      block_id: n,
      ref: a.ref,
      page_idx: i === null ? void 0 : i,
      job_id: `${a.job_id || ""}`.trim(),
      document_id: `${a.document_id || ""}`.trim(),
      snippet: `${a.snippet || ""}`.trim()
    });
  }
  return r;
}
function L(t = "", r = 72) {
  const e = `${t}`.replace(/\s+/g, " ").trim();
  return e.length <= r ? e : `${e.slice(0, r).trim()}…`;
}
function q(t, r, { max: e = 5 } = {}) {
  const a = r.filter(G).map((o) => ({
    ...o,
    page_idx: N(o) ?? o.page_idx
  }));
  if (!a.length) return [];
  const n = /* @__PURE__ */ new Map();
  for (const o of a)
    n.set(`${o.ref}`, o);
  const i = [], s = /* @__PURE__ */ new Set();
  for (const o of `${t || ""}`.matchAll(/\[(\d+)\]/g)) {
    const u = o[1];
    s.has(u) || n.has(u) && (s.add(u), i.push(u));
  }
  if (i.length)
    return i.slice(0, e).map((o) => n.get(o));
  if (/\[\d+\]/.test(`${t || ""}`)) return [];
  const l = [], c = /* @__PURE__ */ new Set();
  for (const o of a) {
    const u = N(o);
    if (u !== null) {
      if (c.has(u)) continue;
      c.add(u);
    }
    if (l.push(o), l.length >= Math.min(3, e)) break;
  }
  return l;
}
const H = new RegExp(
  "(" + [
    "`+[^`\\n]*?`+",
    // 行内 code
    "\\$\\$[\\s\\S]*?\\$\\$",
    // 块级公式
    "(?<!\\\\)\\$(?:\\\\.|[^$\\\\\\n])+(?<!\\\\)\\$",
    // 行内公式
    "!?\\[(?:[^\\][]|\\[[^\\]]*\\])*\\]\\([^)]*\\)"
    // 图片与链接（含 URL）
  ].join("|") + ")",
  "g"
);
function ct(t, r) {
  if (!r.size || !t) return t;
  const e = (a) => a.split(H).map((n, i) => i % 2 === 1 ? n : n.replace(new RegExp("(?<!!)\\[(\\d+)\\](?!\\s*\\()", "g"), (s, l) => r.has(l) ? `[${l}](#retainpdf-citation-${l})` : s)).join("");
  return t.split(/(```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$))/g).map((a, n) => n % 2 === 1 ? a : e(a)).join("");
}
function lt(t, r, e = "translated", a = {}) {
  const n = a.resolveResourceUrl ?? F, i = `${t || ""}`.trim(), s = Math.max(1, Math.floor(Number(r) || 0) + 1);
  if (!i) return "";
  const l = `/api/v1/jobs/${encodeURIComponent(i)}/preview/pages/${s}?kind=${e}&width=240`;
  try {
    return n(l) || l;
  } catch {
    return l;
  }
}
function x(t, r, e = {}) {
  const a = e.resolveResourceUrl ?? F, n = `${t || ""}`.trim();
  let i = `${r || ""}`.trim().replace(/\\/g, "/").replace(/^\.\//, "");
  if (!n || !i || i.startsWith("/") || i.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(i))
    return "";
  for (; i.startsWith("images/"); )
    i = i.slice(7);
  const s = [];
  for (const c of i.split("/")) {
    if (!c) continue;
    let o = c;
    try {
      o = decodeURIComponent(c);
    } catch {
      return "";
    }
    if (!o || o === "." || o === ".." || /[\\/]/.test(o)) return "";
    s.push(encodeURIComponent(o));
  }
  if (!s.length || !/^page-\d+$/i.test(decodeURIComponent(s[0]))) return "";
  const l = `/api/v1/jobs/${encodeURIComponent(n)}/markdown/images/${s.join("/")}`;
  try {
    return a(l) || l;
  } catch {
    return l;
  }
}
function I(t, r, e = {}, a = []) {
  var d;
  const n = `${t || ""}`.trim(), i = `${r || ""}`.trim();
  if (!n || !i || n.startsWith("//")) return "";
  if (/^(?:\.\/)?(?:images\/)?page-\d+\//i.test(n))
    return x(i, n, e);
  let s;
  try {
    s = new URL(n, ((d = globalThis.location) == null ? void 0 : d.href) || "http://localhost/");
  } catch {
    return "";
  }
  const l = s.pathname.match(/^\/api\/v1\/jobs\/([^/]+)\/markdown\/images\/(.+)$/i);
  if (!l) return "";
  let c = "";
  try {
    c = decodeURIComponent(l[1]);
  } catch {
    return "";
  }
  if (c === i) return x(i, l[2], e);
  const o = `${s.searchParams.get("doc") || ""}`.trim();
  return !o || !new Set(
    [...a].map((f) => `${f || ""}`.trim()).filter(Boolean)
  ).has(o) ? "" : x(c, l[2], e);
}
function V(t) {
  const r = [
    t.image_url,
    ...Array.isArray(t.image_urls) ? t.image_urls : [],
    ...Array.isArray(t.asset_image_urls) ? t.asset_image_urls : []
  ];
  if (Array.isArray(t.assets))
    for (const n of t.assets)
      n && typeof n == "object" && r.push(n.image_url);
  const e = /* @__PURE__ */ new Set(), a = [];
  for (const n of r) {
    const i = `${n || ""}`.trim();
    !i || e.has(i) || (e.add(i), a.push(i));
  }
  return a;
}
function X(t) {
  var n;
  let r = `${t || ""}`.trim();
  try {
    r = decodeURIComponent(new URL(r, ((n = globalThis.location) == null ? void 0 : n.href) || "http://localhost/").pathname);
  } catch {
    try {
      r = decodeURIComponent(r);
    } catch {
    }
  }
  const e = r.match(/(?:^|\/)page-(\d+)(?:\/|$)/i);
  if (!e) return null;
  const a = Number(e[1]);
  return Number.isFinite(a) && a >= 1 ? Math.floor(a) : null;
}
function Y(t = []) {
  const r = /* @__PURE__ */ new Set();
  for (const e of t) {
    const a = `${(e == null ? void 0 : e.document_id) || ""}`.trim();
    a && r.add(a);
  }
  return [...r];
}
function ut(t, r, e) {
  const a = Y(r), n = I(t, e, {}, a);
  if (!n) return null;
  for (const s of r)
    for (const l of V(s))
      if (I(l, e, {}, a) === n) return s;
  const i = X(n);
  return i == null ? null : r.find((s) => j(s) === i) || null;
}
function dt(t, r, { jobId: e, documentRef: a = t.ownerDocument }) {
  const n = a.createElement("template");
  n.innerHTML = `${r || ""}`;
  let i = 0;
  return n.content.querySelectorAll("img").forEach((s) => {
    var o;
    const l = s.getAttribute("data-ai-src") || s.getAttribute("src") || "", c = I(l, e);
    if (s.removeAttribute("src"), s.removeAttribute("srcset"), !c) {
      const u = a.createElement("span");
      u.className = "aui-image-blocked", u.textContent = (o = s.getAttribute("alt")) != null && o.trim() ? `[图片不可用：${s.getAttribute("alt").trim()}]` : "[图片不可用]", s.replaceWith(u);
      return;
    }
    s.setAttribute("data-ai-src", c), s.setAttribute("loading", "lazy"), s.setAttribute("decoding", "async"), i += 1;
  }), t.replaceChildren(n.content), i;
}
function ft(t, {
  onOpen: r,
  documentRef: e = globalThis.document
} = {}) {
  var i, s;
  if (!t || !e) return;
  const a = [...((i = t.querySelectorAll) == null ? void 0 : i.call(t, "a[href]")) || []];
  for (const l of a) {
    const c = l, o = `${c.getAttribute("href") || ""}`.trim(), u = e.createElement("span");
    for (u.className = `aui-md-extlink${c.className ? ` ${c.className}` : ""}`.trim(); c.firstChild; )
      u.appendChild(c.firstChild);
    if (!((s = u.textContent) != null && s.trim()) && o && (u.textContent = o), o && !o.startsWith("#") && !/^\s*javascript:/i.test(o)) {
      u.dataset.href = o, u.setAttribute("role", "link"), u.tabIndex = 0, u.title = `打开链接：${o}`;
      const d = (f) => {
        f.preventDefault(), f.stopPropagation(), !K(f) && (k() || f instanceof MouseEvent && (f.button !== 0 || f.detail === 0) || r == null || r(o, f));
      };
      u.addEventListener("click", d), u.addEventListener("auxclick", (f) => {
        f.preventDefault(), f.stopPropagation();
      }), u.addEventListener("keydown", (f) => {
        f.key !== "Enter" && f.key !== " " || (f.preventDefault(), d(f));
      });
    } else
      u.removeAttribute("role");
    c.replaceWith(u);
  }
  const n = t;
  n instanceof Element && !n.dataset.auiLinkGuard && (n.dataset.auiLinkGuard = "1", n.addEventListener(
    "click",
    (l) => {
      const c = l.target;
      if (!(c instanceof Element)) return;
      const o = c.closest("a[href]");
      !o || !n.contains(o) || (l.preventDefault(), l.stopPropagation());
    },
    !0
  ));
}
function mt(t, r, e, a = globalThis.document) {
  var s, l, c, o;
  if (!r.size || !t) return;
  (s = t.querySelectorAll) == null || s.call(t, "button.reader-ai-citation-ref").forEach((u) => {
    var f;
    const d = u.parentNode;
    d && (d.replaceChild(a.createTextNode(u.textContent || ""), u), (f = d.normalize) == null || f.call(d));
  });
  const n = ((l = a.createTreeWalker) == null ? void 0 : l.call(a, t, 4)) || null, i = [];
  if (n) {
    let u = n.nextNode();
    for (; u; )
      (o = (c = u.parentElement) == null ? void 0 : c.closest) != null && o.call(c, "code, pre, .reader-ai-citation-ref, button, a, .aui-msg-actions") || i.push(u), u = n.nextNode();
  }
  for (const u of i) {
    const d = `${u.textContent || ""}`;
    if (!/\[\d+\]/.test(d)) continue;
    const f = a.createDocumentFragment();
    for (const y of d.split(/(\[\d+\])/)) {
      if (!y) continue;
      const m = y.match(/^\[(\d+)\]$/), p = m ? r.get(m[1]) : null;
      if (p) {
        const h = a.createElement("button");
        h.type = "button", h.className = "reader-ai-citation-ref", h.textContent = y;
        const g = j(p);
        h.title = g ? `跳到第 ${g} 页 · ${L(p.snippet || "", 60)}` : L(p.snippet || "相关片段", 60), g != null && (h.dataset.page = `${g}`), h.addEventListener("click", ($) => {
          $.preventDefault(), $.stopPropagation(), e == null || e(p);
        }), f.appendChild(h);
      } else
        f.appendChild(a.createTextNode(y));
    }
    u.replaceWith(f);
  }
}
function pt(t) {
  var a, n;
  if (!t) return;
  const r = t, e = [
    ...(a = r.matches) != null && a.call(r, "img.is-hydrated") ? [r] : [],
    ...((n = r.querySelectorAll) == null ? void 0 : n.call(r, "img.is-hydrated")) || []
  ];
  for (const i of e) {
    const s = i, l = s.src || "";
    if (l.startsWith("blob:"))
      try {
        URL.revokeObjectURL(l);
      } catch {
      }
    s.classList.remove("is-hydrated"), l.startsWith("blob:") && s.removeAttribute("src");
  }
}
async function ht(t, { fetchImpl: r = D, signal: e } = {}) {
  var i, s;
  const a = t, n = [
    ...(i = a.matches) != null && i.call(a, "img[data-ai-src]") ? [a] : [],
    ...((s = a.querySelectorAll) == null ? void 0 : s.call(a, "img[data-ai-src]")) || []
  ];
  await Promise.allSettled(n.map(async (l) => {
    var u;
    const c = l;
    if (e != null && e.aborted || !c.isConnected) return;
    const o = c.getAttribute("data-ai-src") || "";
    if (o)
      try {
        const d = await r(o, e ? { signal: e } : void 0);
        if (e != null && e.aborted || !c.isConnected) {
          try {
            const m = await ((u = d == null ? void 0 : d.blob) == null ? void 0 : u.call(d));
            if (m) {
              const p = URL.createObjectURL(m);
              URL.revokeObjectURL(p);
            }
          } catch {
          }
          return;
        }
        if (!(d != null && d.ok)) throw new Error(`HTTP ${(d == null ? void 0 : d.status) || 0}`);
        const f = URL.createObjectURL(await d.blob());
        if (e != null && e.aborted || !c.isConnected) {
          try {
            URL.revokeObjectURL(f);
          } catch {
          }
          return;
        }
        const y = c.src || "";
        if (y.startsWith("blob:"))
          try {
            URL.revokeObjectURL(y);
          } catch {
          }
        c.src = f, c.classList.add("is-hydrated"), c.classList.remove("is-missing");
      } catch {
        if (e != null && e.aborted || !c.isConnected) return;
        c.classList.add("is-missing"), c.alt = c.alt || "图片暂不可用";
      }
  }));
}
function bt(t, r, {
  onJump: e = null,
  answerText: a = "",
  max: n = 5,
  documentRef: i = globalThis.document
} = {}) {
  var u;
  (u = t.querySelector(".reader-ai-citations")) == null || u.remove();
  const s = q(a, r, { max: n });
  if (!s.length) return;
  const l = i.createElement("div");
  l.className = "reader-ai-citations", l.setAttribute("aria-label", "引用来源");
  const c = i.createElement("div");
  c.className = "reader-ai-citations-head", c.textContent = "来源", l.appendChild(c);
  const o = i.createElement("div");
  o.className = "reader-ai-citations-list";
  for (const d of s) {
    const f = j(d), y = f != null ? `p.${f}` : "", m = i.createElement("button");
    m.type = "button", m.className = "reader-ai-citation-item", f != null && (m.dataset.page = `${f}`), m.title = f != null ? `跳到第 ${f} 页` : "定位来源", m.addEventListener("click", ($) => {
      $.preventDefault(), $.stopPropagation(), e == null || e(d);
    });
    const p = i.createElement("span");
    p.className = "reader-ai-citation-refno", p.textContent = `[${d.ref ?? "?"}]`;
    const h = i.createElement("span");
    h.className = "reader-ai-citation-meta", h.textContent = y || "—";
    const g = i.createElement("span");
    g.className = "reader-ai-citation-copy", g.textContent = L(d.snippet || "相关片段", 64), m.append(p, h, g), o.appendChild(m);
  }
  l.appendChild(o), t.appendChild(l);
}
export {
  Z as A,
  I as B,
  O as C,
  N as D,
  j as E,
  pt as F,
  K as G,
  rt as M,
  ot as a,
  J as b,
  T as c,
  Y as d,
  nt as e,
  x as f,
  lt as g,
  L as h,
  at as i,
  ct as j,
  ut as k,
  tt as l,
  ht as m,
  mt as n,
  G as o,
  k as p,
  B as q,
  it as r,
  Q as s,
  dt as t,
  ft as u,
  st as v,
  et as w,
  q as x,
  C as y,
  bt as z
};
//# sourceMappingURL=answer-enhance-DShVYmyb.js.map
