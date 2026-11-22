import { jsxs as V, jsx as L } from "react/jsx-runtime";
import { useEffect as Y, useRef as q, useState as B, useMemo as Ve } from "react";
import { Search as Se, ChevronUp as Re, ChevronDown as Ue, ListTree as De } from "lucide-react";
import { c as me, d as ve, r as re, f as he, u as je } from "./ReaderApp-DsSATMmR.js";
import { e as pe, m as Ke, a as we } from "./markdown-math-DN_X3M3x.js";
import { n as We } from "./markdown-payload-kK3ewW_I.js";
import { r as He, b as Qe } from "./reader-blocks-BxElLvLX.js";
const Me = "h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, pre";
function Oe(t) {
  t.querySelectorAll(".reader-markdown-search-hit, .reader-markdown-search-hit-active").forEach((e) => {
    e.classList.remove("reader-markdown-search-hit", "reader-markdown-search-hit-active");
  });
}
function Te(t, e) {
  Oe(t);
  const n = e.trim().toLocaleLowerCase();
  if (!n) return [];
  const o = [...t.querySelectorAll(Me)].filter((a) => [...a.children].some((c) => c.matches(Me)) ? !1 : (a.textContent || "").toLocaleLowerCase().includes(n));
  return o.forEach((a) => a.classList.add("reader-markdown-search-hit")), o;
}
function ze({
  id: t,
  open: e,
  ariaLabel: n,
  className: r = "",
  onClose: o,
  toolbar: a,
  children: c
}) {
  return Y(() => {
    if (!e) return;
    const d = (f) => {
      var M;
      if (f.key !== "Escape") return;
      const p = f.target;
      (M = p == null ? void 0 : p.closest) != null && M.call(p, "textarea, input, select, [contenteditable='true']") || (f.preventDefault(), o());
    };
    return window.addEventListener("keydown", d), () => window.removeEventListener("keydown", d);
  }, [e, o]), e ? /* @__PURE__ */ V(
    "aside",
    {
      id: t,
      className: `reader-notes-panel reader-notes-panel--workspace${a ? " has-panel-toolbar" : ""} ${r}`.trim(),
      "aria-label": n,
      role: "dialog",
      "aria-modal": "false",
      children: [
        a ? /* @__PURE__ */ L("div", { className: "reader-notes-panel-toolbar", children: a }) : null,
        /* @__PURE__ */ L("div", { className: "reader-notes-panel-body", children: c })
      ]
    }
  ) : null;
}
function Xe(t) {
  return t.normalize("NFKC").trim().toLocaleLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-+|-+$/g, "") || "section";
}
function ne(t, e = /* @__PURE__ */ new Map()) {
  return [...t.querySelectorAll("h1, h2, h3, h4, h5, h6")].flatMap((n) => {
    const r = (n.textContent || "").replace(/\s+/g, " ").trim();
    if (!r) return [];
    const o = Xe(r), a = (e.get(o) || 0) + 1;
    e.set(o, a);
    const c = a === 1 ? `reader-md-${o}` : `reader-md-${o}-${a}`;
    return n.id = c, [{ id: c, level: Number(n.tagName.slice(1)), text: r }];
  });
}
function Ge(t, e = "http://localhost/") {
  var n;
  if (/^mock:\/\//i.test(t)) return !0;
  try {
    const r = ((n = globalThis.location) == null ? void 0 : n.href) || "http://localhost/", o = new URL(e, r), a = new URL(t, o);
    if (!/\/api\/v1\/jobs\/[^/]+\/(?:markdown|files\/output\/ocr)\/images\//.test(a.pathname)) return !1;
    if (!/^[a-z][a-z\d+.-]*:/i.test(t)) return !0;
    const c = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(a.hostname);
    return a.origin === o.origin || c;
  } catch {
    return !1;
  }
}
function Je(t, e) {
  if (/^data:image\//i.test(t) || /^blob:/i.test(t)) return !0;
  try {
    const n = new URL(t, e);
    return n.protocol === "http:" || n.protocol === "https:";
  } catch {
    return !1;
  }
}
function ge(t, e) {
  let n = !1, r = 0, o = 0, a = 0;
  const c = [], d = [], f = /* @__PURE__ */ new Set(), p = (l, w) => {
    const h = l.ownerDocument.createElement("span");
    h.className = "reader-markdown-image-missing", h.textContent = w, h.title = l.getAttribute("data-reader-md-src") || "", l.replaceWith(h);
  };
  for (const l of t) {
    const w = l.getAttribute("data-reader-md-src") || "", h = l.ownerDocument.baseURI || "http://localhost/";
    Ge(w, e.protectedBaseUrl || h) ? d.push(l) : Je(w, h) ? l.src = w : p(l, "[图片地址不可用]");
  }
  const M = () => {
    var l;
    return (l = e.onProgress) == null ? void 0 : l.call(e, { failed: a, loaded: o, total: d.length });
  }, m = () => {
    if (!n)
      for (; r < 4 && c.length > 0; ) {
        const l = c.shift();
        if (!(l != null && l.isConnected)) continue;
        r += 1;
        const w = l.getAttribute("data-reader-md-src") || "";
        e.fetchImage(w, e.signal ? { signal: e.signal } : void 0).then(async (h) => {
          if (!(h != null && h.ok)) throw new Error(`HTTP ${(h == null ? void 0 : h.status) || 0}`);
          const N = URL.createObjectURL(await h.blob());
          if (n || !l.isConnected) {
            try {
              URL.revokeObjectURL(N);
            } catch {
            }
            return;
          }
          e.onObjectUrl(N), l.src = N, o += 1;
        }).catch(() => {
          n || !l.isConnected || (a += 1, p(l, "[图片暂不可用]"));
        }).finally(() => {
          r -= 1, n || (M(), m());
        });
      }
  }, b = (l) => {
    n || f.has(l) || (f.add(l), c.push(l), m());
  }, S = globalThis.IntersectionObserver;
  let k = null;
  return S && d.length > 0 ? (k = new S((l) => {
    l.forEach((w) => {
      if (!w.isIntersecting) return;
      const h = w.target;
      k == null || k.unobserve(h), b(h);
    });
  }, { root: e.root || null, rootMargin: "600px 0px" }), d.forEach((l) => k == null ? void 0 : k.observe(l))) : d.forEach(b), M(), () => {
    n = !0, c.length = 0, k == null || k.disconnect();
  };
}
function Ye(t) {
  t.querySelectorAll("[data-reader-tex], .reader-md-math-error").forEach((e) => {
    const n = e.dataset.readerTex ?? e.textContent ?? "", r = e.ownerDocument.createTextNode(`${e.classList.contains("reader-md-math-display") ? `
` : ""}$${n}$${e.classList.contains("reader-md-math-display") ? `
` : ""}`);
    e.replaceWith(r);
  }), t.querySelectorAll(".reader-md-copy-actions, .reader-md-internal-back").forEach((e) => e.remove());
}
function Ee(t) {
  const e = t.ownerDocument, n = e.createElement("div");
  n.className = "reader-md-image-preview", n.setAttribute("role", "dialog"), n.setAttribute("aria-label", "图片预览");
  const r = t.cloneNode(!0);
  r.removeAttribute("loading"), r.removeAttribute("data-reader-md-src"), r.src = t.currentSrc || t.src;
  const o = () => n.remove();
  n.onclick = (a) => {
    a.target === n && o();
  }, n.append(r), e.body.append(n), n.tabIndex = -1, n.focus(), n.onkeydown = (a) => {
    a.key === "Escape" && o();
  };
}
function Ze(t) {
  const e = t.closest(".reader-markdown-content") || t;
  if (e.dataset.readerMarkdownInteractionsBound === "true") return;
  e.dataset.readerMarkdownInteractionsBound = "true";
  let n = null;
  const r = e.ownerDocument, o = e.closest(".reader-notes-panel-body") || e, a = r.createElement("button");
  a.type = "button", a.className = "reader-md-internal-back", a.textContent = "返回上次位置", a.hidden = !0, a.onclick = () => {
    n != null && (o.scrollTo({ top: n, behavior: "smooth" }), a.hidden = !0);
  }, e.prepend(a), e.addEventListener("click", (c) => {
    var m, b;
    const f = c.target.closest("a[href^='#']");
    if (!f || !e.contains(f)) return;
    const p = decodeURIComponent(f.getAttribute("href").slice(1)), M = e.ownerDocument.getElementById(p);
    !M || !e.contains(M) || (c.preventDefault(), n = o.scrollTop, (m = M.scrollIntoView) == null || m.call(M, { block: "center", behavior: "smooth" }), a.hidden = !1, M.classList.add("reader-md-internal-target"), (b = r.defaultView) == null || b.setTimeout(() => M.classList.remove("reader-md-internal-target"), 1200));
  });
}
const et = {
  "\\": "\\textbackslash{}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}"
};
function Be(t, e) {
  if (t.nodeType === 3) {
    const a = t.textContent || "";
    return e === "Markdown" ? a.replace(/[\\|*_`<>[\]]/g, "\\$&") : a.replace(/[\\&%$#_{}~^]/g, (c) => et[c] ?? "\\" + c);
  }
  const n = t;
  if (t.nodeType !== 1 || n.classList.contains("reader-md-copy-actions")) return "";
  const r = n.dataset.readerTex ?? (n.classList.contains("reader-md-math-error") ? n.textContent : null);
  if (r != null) return "$" + (e === "Markdown" ? r.replace(/\|/g, "\\|") : r) + "$";
  if (n.tagName === "BR") return e === "Markdown" ? "<br>" : " ";
  const o = Array.from(n.childNodes, (a) => Be(a, e)).join("");
  if (n.tagName === "SUP" || n.tagName === "SUB") {
    const a = n.tagName.toLowerCase();
    return e === "Markdown" ? `<${a}>${o}</${a}>` : `${a === "sup" ? "\\textsuperscript" : "\\textsubscript"}{${o}}`;
  }
  return n.tagName === "P" ? o + " " : o;
}
function Pe(t, e) {
  const n = Array.from(t.rows), r = n.map(() => []);
  n.forEach((c, d) => {
    let f = 0;
    for (const p of c.cells) {
      for (; r[d][f] !== void 0; ) f++;
      const m = c.parentElement.rows.length - c.sectionRowIndex, b = Math.min(p.rowSpan || m, m);
      for (let S = 0; S < b; S++)
        for (let k = 0; k < p.colSpan; k++) r[d + S][f + k] = "";
      r[d][f] = Be(p, e).replace(/\s+/g, " ").trim(), f += p.colSpan;
    }
  });
  const o = r.reduce((c, d) => Math.max(c, d.length), 0);
  if (!o) return "";
  const a = r.map((c) => Array.from({ length: o }, (d, f) => c[f] ?? ""));
  return e === "Markdown" ? (a.splice(1, 0, Array(o).fill("---")), a.map((c) => "| " + c.join(" | ") + " |").join(`
`)) : [
    `\\begin{tabular}{${"l".repeat(o)}}`,
    ...a.map((c) => c.join(" & ") + " \\\\"),
    "\\end{tabular}"
  ].join(`
`);
}
function tt(t) {
  const e = t.cloneNode(!0);
  return Ye(e), e.setAttribute("border", "1"), e.style.borderCollapse = "collapse", e.querySelectorAll("th, td").forEach((n) => {
    n.style.border = "1px solid #b8bec8", n.style.padding = "4px 8px";
  }), { html: e.outerHTML, text: Pe(t, "Markdown") };
}
async function nt(t, e) {
  var n;
  try {
    if ((n = navigator.clipboard) != null && n.write && typeof ClipboardItem < "u")
      return await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([t], { type: "text/html" }),
        "text/plain": new Blob([e], { type: "text/plain" })
      })]), !0;
  } catch {
  }
  return me(e);
}
async function rt(t) {
  const e = new URL(t.currentSrc || t.src, t.ownerDocument.baseURI);
  let n = t;
  /^https?:$/.test(e.protocol) && e.origin !== location.origin && (n = new Image(), n.crossOrigin = "anonymous", n.src = e.href), await n.decode();
  const r = t.ownerDocument.createElement("canvas");
  return r.width = n.naturalWidth, r.height = n.naturalHeight, r.getContext("2d").drawImage(n, 0, 0), new Promise((o, a) => {
    r.toBlob((c) => c ? o(c) : a(new Error("PNG 编码失败")), "image/png");
  });
}
function at(t) {
  var e, n;
  Ze(t);
  for (const r of t.querySelectorAll("img[data-reader-md-src], table")) {
    const o = r.ownerDocument, a = o.createElement("span");
    a.className = "reader-md-copy-actions";
    const c = o.createElement("span");
    c.setAttribute("role", "status"), a.append(c);
    const d = r.tagName === "IMG";
    d ? (a.hidden = !0, r.closest("a") || r.addEventListener("click", () => Ee(r)), r.addEventListener("load", () => {
      a.hidden = !1;
    }, { once: !0 })) : a.append("复制为");
    for (const f of d ? ["复制图片", "放大", "下载"] : ["Markdown", "LaTeX", "Word"]) {
      const p = o.createElement("button");
      p.type = "button", p.textContent = f, p.setAttribute("aria-label", d ? f : "复制表格为 " + f), p.onclick = async (M) => {
        M.stopPropagation(), c.textContent = "";
        let m = !1;
        try {
          if (d && f === "放大")
            Ee(r), m = !0;
          else if (d && f === "下载") {
            const b = r, S = b.currentSrc || b.src || b.dataset.readerMdSrc;
            if (S) {
              const k = o.createElement("a");
              k.href = S, k.download = "paperloom-image", k.click(), m = !0;
            }
          } else if (d)
            await navigator.clipboard.write([new ClipboardItem({ "image/png": rt(r) })]), m = !0;
          else if (f === "Word") {
            const b = tt(r);
            m = await nt(b.html, b.text);
          } else
            m = await me(Pe(r, f));
        } catch {
        }
        c.textContent = m ? "已复制" : "复制失败";
      }, a.append(p);
    }
    (r.closest("a") || r).after(a);
  }
  for (const r of t.querySelectorAll(".reader-md-math-display")) {
    if (r.closest("table") || r.dataset.readerFormulaActionsBound === "true") continue;
    const o = r.dataset.readerTex || ((n = (e = r.querySelector(".reader-md-math-error")) == null ? void 0 : e.textContent) == null ? void 0 : n.trim()) || "";
    if (!o) continue;
    r.dataset.readerFormulaActionsBound = "true";
    const a = r.ownerDocument.createElement("span");
    a.className = "reader-md-copy-actions reader-md-formula-actions";
    const c = r.ownerDocument.createElement("span");
    c.setAttribute("role", "status");
    const d = r.ownerDocument.createElement("button");
    d.type = "button", d.textContent = "复制 LaTeX", d.setAttribute("aria-label", "复制公式 LaTeX"), d.onclick = async (f) => {
      f.stopPropagation(), c.textContent = await me(o) ? "已复制" : "复制失败";
    }, a.append(d, c), r.after(a);
  }
}
let de = null;
function be() {
  return de || (de = import("marked").catch((t) => {
    throw de = null, t;
  })), de;
}
function ot(t) {
  t.querySelectorAll("script, iframe, object, embed, style, link, meta, base, form, input, button, textarea, select").forEach((e) => e.remove()), t.querySelectorAll("*").forEach((e) => {
    for (const n of [...e.attributes])
      /^on/i.test(n.name) && e.removeAttribute(n.name);
  }), t.querySelectorAll("a[href]").forEach((e) => {
    const n = e, r = n.getAttribute("href") || "";
    /^\s*javascript:/i.test(r) ? n.removeAttribute("href") : /^\s*#/.test(r) && (n.classList.add("reader-md-internal-link"), n.removeAttribute("target")), /^\s*#/.test(r) || (n.setAttribute("target", "_blank"), n.setAttribute("rel", "noopener noreferrer"));
  });
}
function ae(t, e, n, r = {}) {
  const o = t.ownerDocument.createElement("template");
  return o.innerHTML = e, ot(o.content), o.content.querySelectorAll("img[src]").forEach((a) => {
    var f;
    const c = a.getAttribute("src") || "", d = ((f = r.resolveAssetUrl) == null ? void 0 : f.call(r, n, c)) || c;
    a.setAttribute("data-reader-md-src", d), a.setAttribute("loading", "lazy"), a.setAttribute("decoding", "async"), a.removeAttribute("src");
  }), t.replaceChildren(o.content), at(t), t.classList.remove("hidden"), [...t.querySelectorAll("img[data-reader-md-src]")];
}
const st = /^ {0,3}\[\^([^\]\r\n]+)\]:[ \t]*(.*)$/, Le = /^ {0,3}(```+|~~~+)/, ct = /(`+)([^`\r\n]*?)\1/g;
function lt(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}
function it(t) {
  return t.trim().toLocaleLowerCase().replace(/[^\p{Letter}\p{Number}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "note";
}
function Ce(t) {
  return t.trim().normalize("NFKC").toLocaleLowerCase();
}
function Ae(t) {
  return /^\t/.test(t) ? t.slice(1) : /^ {4}/.test(t) ? t.slice(4) : null;
}
function ke(t) {
  const e = `${t || ""}`.split(/\r?\n/), n = [], r = /* @__PURE__ */ new Map();
  let o = !1;
  for (let l = 0; l < e.length; l += 1) {
    const w = e[l];
    if (w.match(Le)) {
      o = !o, n.push(w);
      continue;
    }
    if (!o) {
      const N = w.match(st);
      if (N) {
        const y = [N[2]];
        for (; l + 1 < e.length; ) {
          const x = e[l + 1], I = Ae(x);
          if (I != null) {
            y.push(I), l += 1;
            continue;
          }
          if (x.trim() === "" && e[l + 2] && Ae(e[l + 2]) != null) {
            y.push(""), l += 1;
            continue;
          }
          break;
        }
        const $ = N[1].trim();
        r.set(Ce($), { label: $, value: y.join(`
`).trim() });
        continue;
      }
    }
    n.push(w);
  }
  const a = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new Set(), f = (l, w) => {
    const h = c.get(l);
    if (h) return h;
    const N = it(w);
    let y = N, $ = 2;
    for (; d.has(y); )
      y = `${N}-${$}`, $ += 1;
    return d.add(y), c.set(l, y), y;
  };
  for (const [l, w] of r) f(l, w.label);
  let p = !1;
  const M = (l) => {
    let w = "", h = 0;
    for (const N of l.matchAll(ct)) {
      const y = N.index ?? 0;
      w += m(l.slice(h, y)), w += N[0], h = y + N[0].length;
    }
    return w + m(l.slice(h));
  }, m = (l) => l.replace(/\[\^([^\]\r\n]+)\]/g, (w, h) => {
    const N = h.trim(), y = Ce(N), $ = r.get(y);
    if (!$) return w;
    const x = f(y, $.label), I = `reader-md-footnote-${x}`, E = a.get(y) || [], R = `reader-md-footnote-ref-${x}${E.length ? `-${E.length + 1}` : ""}`;
    return E.push(R), a.set(y, E), `<sup class="reader-md-footnote-ref" id="${R}"><a href="#${I}">[${lt(N)}]</a></sup>`;
  }), b = n.map((l) => l.match(Le) ? (p = !p, l) : p ? l : M(l));
  if (r.size === 0) return b.join(`
`);
  const S = ["", '<section class="reader-md-footnotes" aria-label="脚注">', "", "## 脚注", ""];
  let k = 1;
  for (const [l, w] of r) {
    const h = f(l, w.label), N = `reader-md-footnote-${h}`, $ = (a.get(l) || [`reader-md-footnote-ref-${h}`]).map((i) => `<a href="#${i}" class="reader-md-footnote-back">↩</a>`).join(" "), x = w.value.split(/\r?\n/), E = [x.shift() || "", ...x];
    let R = E.length - 1;
    for (; R > 0 && !E[R].trim(); ) R -= 1;
    E[R] = `${E[R]} ${$}`.trim(), S.push(`${k}. <span id="${N}"></span>${E[0]}`);
    const s = " ".repeat(String(k).length + 2);
    for (const i of E.slice(1)) S.push(`${s}${i}`);
    k += 1;
  }
  return S.push("", "</section>"), `${b.join(`
`)}
${S.join(`
`)}`;
}
function dt(t, e) {
  let n = e;
  for (; n < t.length; ) {
    const r = t.indexOf(`
`, n), o = r === -1 ? t.length : r, a = t.slice(n, o).trim();
    if (a !== "") return a;
    if (r === -1) return null;
    n = r + 1;
  }
  return null;
}
const ut = /^\s{0,3}\[(?:\^)?[^\]]+\]:/;
function $e(t) {
  const e = t.match(/^(?:([-*+])|(\d+)([.)]))\s+/);
  return e ? e[1] ? `ul:${e[1]}` : `ol:${e[3]}` : null;
}
function ft(t, e, n) {
  const r = dt(t, e);
  if (!r) return !1;
  if (ut.test(r)) return !0;
  const o = n ? $e(n) : null, a = $e(r);
  return o != null && o === a;
}
function xe(t, { minChars: e = 16384 } = {}) {
  if (!t) return null;
  let n = "", r = null, o = 0;
  const a = t.length;
  for (; o < a; ) {
    const c = t.indexOf(`
`, o), d = c === -1 ? a : c, p = t.slice(o, d).trim(), M = p.match(/^(`{3,}|~{3,})/);
    if (M) {
      const m = M[1][0];
      n ? n === m && (n = "") : n = m;
    }
    if (!n && p === "") {
      const m = c === -1 ? a : c + 1;
      if (m >= e && !ft(t, m, r))
        return { complete: t.slice(0, m), rest: t.slice(m) };
    } else p !== "" && (r = p);
    if (c === -1) break;
    o = c + 1;
  }
  return null;
}
function mt({
  open: t,
  jobId: e,
  sourceOnly: n,
  searchQueryRef: r,
  reapplySearchRef: o
}) {
  const a = q(null), [c, d] = B("尚未加载"), f = q([]), p = q(null), M = q(/* @__PURE__ */ new Map()), m = q([]), b = q(null), S = q(!1), k = q(!1), l = q(null), [w, h] = B([]), [N, y] = B(!1), [$, x] = B(!1), I = () => {
    for (const i of f.current)
      try {
        URL.revokeObjectURL(i);
      } catch {
      }
    f.current = [];
  }, E = () => {
    var i, g;
    (i = p.current) == null || i.call(p), p.current = null;
    for (const v of m.current) v();
    m.current = [], (g = b.current) == null || g.call(b), b.current = null, I();
  }, R = () => {
    const i = a.current;
    i && (M.current = /* @__PURE__ */ new Map(), h(ne(i, M.current)));
  }, s = () => {
    const i = l.current, g = a.current;
    if (!i || !g) return;
    const v = [...g.querySelectorAll("h1, h2, h3, h4, h5, h6")].find((U) => U.id === i);
    v && (l.current = null, typeof v.scrollIntoView == "function" && v.scrollIntoView({ block: "start", behavior: "smooth" }));
  };
  return Y(() => () => {
    var i;
    (i = p.current) == null || i.call(p), I();
  }, []), Y(() => {
    if (!t) {
      E(), h([]), k.current = !1, y(!1);
      return;
    }
    let i = !1;
    E(), M.current = /* @__PURE__ */ new Map(), k.current = !1, y(!1), h([]), S.current = !1, l.current = null, x(!1);
    const g = new AbortController(), v = ve;
    async function U() {
      var u, C, T, P, O, j;
      const F = e.startsWith("doc:");
      if (!e || F) {
        d(!e && n ? "源文档阅读不提供 Markdown 产物" : "该任务暂无 Markdown 产物"), a.current && (a.current.replaceChildren(), a.current.classList.add("hidden"));
        return;
      }
      d("正在加载 Markdown…"), (u = a.current) == null || u.replaceChildren(), (C = a.current) == null || C.classList.add("hidden");
      try {
        if (typeof (v == null ? void 0 : v.loadMarkdownSource) == "function" && typeof (v == null ? void 0 : v.loadMarkdownRange) == "function") {
          const z = await v.loadMarkdownSource(e, g.signal);
          if (i) return;
          if (z != null && z.rawUrl) {
            await D(z);
            return;
          }
        }
      } catch {
      }
      try {
        const z = await ve.loadMarkdownPayload(e);
        if (i) return;
        const { content: K, imagesBaseUrl: X } = We(z);
        if (!K.trim()) {
          d("该任务暂无 Markdown 产物"), (T = a.current) == null || T.replaceChildren(), (P = a.current) == null || P.classList.add("hidden");
          return;
        }
        const { marked: _ } = await be();
        if (i || !a.current) return;
        const Q = ke(K), { text: ue, slots: G } = pe(Q, { bareLatex: !0 }), J = String(_.parse(ue, { async: !1 })), oe = Ke(J, G);
        ae(a.current, oe, X, {
          resolveAssetUrl: re
        }), h(ne(a.current)), (O = o.current) == null || O.call(o), d(G.length > 0 ? `正文已显示 · 正在渲染 ${G.length} 个公式…` : "");
        const se = G.length > 0 ? await we(J, G) : J;
        if (i || !a.current) return;
        const fe = ae(a.current, se, X, {
          resolveAssetUrl: re
        });
        h(ne(a.current)), k.current = !0, y(!0), (j = o.current) == null || j.call(o), d("");
        const ce = a.current.closest(".reader-notes-panel-body");
        p.current = ge(fe, {
          root: ce,
          protectedBaseUrl: X || a.current.ownerDocument.baseURI,
          fetchImage: he,
          signal: g.signal,
          onObjectUrl: (A) => f.current.push(A),
          onProgress: ({ failed: A }) => {
            !i && A > 0 && d(`正文已加载 · ${A} 张图片不可用`);
          }
        });
      } catch (z) {
        if (i) return;
        d(z instanceof Error ? z.message : "Markdown 加载失败");
      }
    }
    async function D(F) {
      var ce;
      const u = a.current;
      if (!u) return;
      const C = 262144, T = 8192, P = `${F.imagesBaseUrl || ""}`, O = u.closest(".reader-notes-panel-body");
      let j = new TextDecoder(), z = 0, K = `${F.etag || ""}`, X = Number.isFinite(Number(F.totalBytes)) ? Number(F.totalBytes) : null, _ = "", Q = !1;
      const ue = 4, G = 4e3;
      let J = 0;
      const oe = () => {
        for (const A of m.current) A();
        m.current = [], I(), M.current = /* @__PURE__ */ new Map(), h([]);
      }, se = async (A) => {
        const { marked: W } = await be();
        if (i || !a.current) return;
        const H = ke(A), { text: ee, slots: te } = pe(H, { bareLatex: !0 }), le = String(W.parse(ee, { async: !1 })), qe = te.length > 0 ? await we(le, te) : le;
        if (i || !a.current) return;
        const ie = u.ownerDocument.createElement("section");
        ie.className = "reader-markdown-chunk";
        const Fe = ae(ie, qe, P, {
          resolveAssetUrl: re
        });
        u.appendChild(ie), u.classList.remove("hidden");
        const ye = ne(ie, M.current);
        ye.length && h((Z) => [...Z, ...ye]), s();
        const _e = ge(Fe, {
          root: O,
          protectedBaseUrl: P || u.ownerDocument.baseURI,
          fetchImage: he,
          signal: g.signal,
          onObjectUrl: (Z) => f.current.push(Z),
          onProgress: ({ failed: Z }) => {
            !i && Z > 0 && d(`正文已加载 · ${Z} 张图片不可用`);
          }
        });
        m.current.push(_e);
      }, fe = async () => {
        S.current || !O || i || u.scrollHeight <= O.clientHeight * 2 || (x(!0), d("已加载部分 · 滚动或点击继续加载"), await new Promise((A) => {
          let W = !1, H = null;
          const ee = (le) => {
            W || (W = !0, O.removeEventListener("scroll", te), H && (clearTimeout(H), H = null), b.current = null, i || (x(!1), le && (J = 0)), A());
          }, te = () => {
            (u.scrollHeight <= O.clientHeight * 2 || O.scrollTop + O.clientHeight >= u.scrollHeight - 800) && ee(!0);
          };
          b.current = () => ee(!0), O.addEventListener("scroll", te, { passive: !0 }), J < ue && (J += 1, H = setTimeout(() => ee(!1), G));
        }));
      };
      try {
        for (; !Q && !i; ) {
          const A = await v.loadMarkdownRange(
            F.rawUrl,
            z,
            z + C - 1,
            K || void 0,
            g.signal
          );
          if (i) return;
          if (A.status === 404) {
            d("该任务暂无 Markdown 产物"), u.replaceChildren(), u.classList.add("hidden");
            return;
          }
          if (A.status === 200)
            u.replaceChildren(), oe(), j = new TextDecoder(), _ = j.decode(A.bytes, { stream: !1 }), Q = !0;
          else if (A.status === 206) {
            if (K && A.etag && A.etag !== K) {
              u.replaceChildren(), oe(), j = new TextDecoder(), _ = "", z = 0, Q = !1, K = A.etag;
              continue;
            }
            !K && A.etag && (K = A.etag), A.totalBytes != null && (X = A.totalBytes);
            const H = A.rangeEnd != null ? A.rangeEnd + 1 : z + A.bytes.length;
            Q = X != null ? H >= X : A.bytes.length < C, _ += j.decode(A.bytes, { stream: !Q }), z = H;
          } else
            throw new Error(`读取 Markdown 失败，请稍后重试。(${A.status})`);
          let W = xe(_, { minChars: T });
          for (; W && !i; ) {
            if (_ = W.rest, await se(W.complete), i) return;
            await fe(), W = xe(_, { minChars: T });
          }
          Q && _.trim() && (await se(_), _ = "");
        }
        i || (R(), k.current = !0, y(!0), s(), d(""), r.current.trim() && ((ce = o.current) == null || ce.call(o)));
      } catch (A) {
        if (i || g.signal.aborted) return;
        d(A instanceof Error ? A.message : "Markdown 加载失败");
      }
    }
    return U(), () => {
      i = !0, g.abort(), E();
    };
  }, [t, e, n]), {
    contentRef: a,
    status: c,
    setStatus: d,
    outline: w,
    setOutline: h,
    outlineComplete: N,
    setOutlineComplete: y,
    outlineCompleteRef: k,
    pendingResume: $,
    rebuildOutline: R,
    renderAllRef: S,
    pendingAnchorRef: l,
    resumeCleanupRef: b
  };
}
const Ie = 40, Ne = { resolveAssetUrl: re };
function ht(t, e, n, r) {
  const [o, a] = B(""), [c, d] = B([]), f = q(/* @__PURE__ */ new Map()), [p, M] = B(0);
  return Y(() => {
    const m = t.current;
    if (!r || !m) return;
    let b = !1;
    const S = new AbortController(), k = [], l = [], w = /* @__PURE__ */ new Map();
    f.current = w, m.replaceChildren(), a("正在排版…");
    const h = m.closest(".reader-notes-panel-body"), N = async ($, x) => {
      const I = ke($), { text: E, slots: R } = pe(I, { bareLatex: !0 }), s = x(E);
      return R.length > 0 ? we(s, R) : s;
    }, y = async ($, x, I, E) => {
      if (x.kind === "figure") {
        const s = x.assetUrls.map((i) => `<img src="${pt(i)}" alt="">`).join("");
        return ae($, s, "", Ne);
      }
      let R = await N(He(x, I), E);
      return x.kind === "formula" && x.label && (R += `<span class="reader-md-formula-label">${wt(x.label)}</span>`), ae($, R, "", Ne);
    };
    return (async () => {
      try {
        const { marked: $ } = await be(), x = (I) => String($.parse(I, { async: !1 }));
        for (let I = 0; I < e.length; I += Ie) {
          if (b) return;
          const E = m.ownerDocument.createDocumentFragment(), R = [];
          for (const s of e.slice(I, I + Ie)) {
            const i = m.ownerDocument.createElement("div");
            i.className = `reader-md-block is-${s.kind}`, i.dataset.mdBlock = s.key, i.dataset.mdPage = `${s.page}`, i.tabIndex = 0, i.setAttribute("aria-label", `跳到第 ${s.page} 页的这一块`);
            const g = n === "bilingual" && s.hasTranslation, v = g ? ["source", "translated"] : [n === "source" ? "source" : "translated"];
            for (const U of v) {
              const D = m.ownerDocument.createElement("div");
              if (D.className = g ? `reader-md-block-${U}` : "reader-md-block-body", R.push(...await y(D, s, U, x)), b) return;
              i.appendChild(D);
            }
            i.setAttribute("role", i.querySelector("button") ? "group" : "button");
            for (const U of s.itemIds) w.set(U, i);
            E.appendChild(i);
          }
          m.appendChild(E), m.classList.remove("hidden"), l.push(ge(R, {
            root: h,
            // 受保护的判断要以 API 地址为准（它可能是局域网 IP，和静态页不同源）。
            protectedBaseUrl: re("", "/api/v1/"),
            fetchImage: he,
            signal: S.signal,
            onObjectUrl: (s) => k.push(s)
          })), await new Promise((s) => setTimeout(s, 0));
        }
        if (b) return;
        d(ne(m).filter((I) => {
          var E;
          return !((E = m.querySelector(`#${CSS.escape(I.id)}`)) != null && E.closest(".reader-md-block-source"));
        })), a(`${e.length} 块`), M((I) => I + 1);
      } catch ($) {
        b || a($ instanceof Error ? $.message : "Markdown 排版失败");
      }
    })(), () => {
      b = !0, S.abort();
      for (const $ of l) $();
      for (const $ of k)
        try {
          URL.revokeObjectURL($);
        } catch {
        }
    };
  }, [e, n, r, t]), { status: o, outline: c, elementsRef: f, renderedRevision: p };
}
function pt(t) {
  return t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function wt(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const gt = [
  { value: "translated", label: "译文" },
  { value: "source", label: "原文" },
  { value: "bilingual", label: "双语" }
];
function bt({
  open: t,
  blocks: e,
  side: n = "right",
  regionHover: r,
  jumpToBlock: o,
  onClose: a
}) {
  const c = q(null), d = e.some((s) => s.hasTranslation), [f, p] = B(d ? "translated" : "source"), { status: M, outline: m, elementsRef: b, renderedRevision: S } = ht(c, e, f, t), [k, l] = B(!1), [w, h] = B(""), N = q([]), [y, $] = B(0), [x, I] = B(-1);
  Y(() => {
    if (!r) return;
    let s = null;
    const i = () => {
      const { itemId: v, origin: U } = r.get(), D = v ? b.current.get(v) ?? null : null;
      D !== s && (s == null || s.classList.remove("is-linked"), s = D, D && (D.classList.add("is-linked"), U === "pdf" && typeof D.scrollIntoView == "function" && D.scrollIntoView({ block: "nearest", behavior: "smooth" })));
    };
    i();
    const g = r.subscribe(i);
    return () => {
      g(), s == null || s.classList.remove("is-linked");
    };
  }, [r, b, S]), Y(() => {
    const s = c.current;
    if (!s) return;
    const i = (u) => u instanceof Element ? u.closest("[data-md-block]") : null, g = (u) => {
      const C = i(u.target);
      r == null || r.set((C == null ? void 0 : C.dataset.mdBlock) ?? null, "markdown");
    }, v = () => r == null ? void 0 : r.set(null, "markdown"), U = (u) => {
      const C = u == null ? void 0 : u.dataset.mdBlock;
      C && (o == null || o(C));
    }, D = (u) => {
      var C;
      (C = s.ownerDocument.getSelection()) != null && C.toString() || u.target instanceof Element && u.target.closest("a[href]") || U(i(u.target));
    }, F = (u) => {
      if (u.key !== "Enter" && u.key !== " ") return;
      const C = i(u.target);
      !C || C !== u.target || (u.preventDefault(), U(C));
    };
    return s.addEventListener("mouseover", g), s.addEventListener("mouseleave", v), s.addEventListener("click", D), s.addEventListener("keydown", F), () => {
      s.removeEventListener("mouseover", g), s.removeEventListener("mouseleave", v), s.removeEventListener("click", D), s.removeEventListener("keydown", F);
    };
  }, [r, o]);
  const E = (s, i = !0) => {
    const g = N.current;
    if (g.forEach((D) => D.classList.remove("reader-markdown-search-hit-active")), g.length === 0) {
      I(-1);
      return;
    }
    const v = (s + g.length) % g.length, U = g[v];
    U.classList.add("reader-markdown-search-hit-active"), I(v), i && typeof U.scrollIntoView == "function" && U.scrollIntoView({ block: "center", behavior: "smooth" });
  }, R = (s, i = !1) => {
    const g = c.current;
    if (!g) return;
    s.trim() || Oe(g);
    const v = s.trim() ? Te(g, s) : [];
    N.current = v, $(v.length), E(v.length > 0 ? 0 : -1, i);
  };
  return Y(() => {
    w.trim() && R(w);
  }, [S]), /* @__PURE__ */ V(
    ze,
    {
      id: "reader-markdown-panel",
      open: t,
      ariaLabel: "Markdown 预览",
      className: `is-pane-${n}`,
      onClose: a,
      toolbar: /* @__PURE__ */ L("span", { className: "reader-notes-count", children: M || "已加载" }),
      children: [
        /* @__PURE__ */ V("div", { className: "reader-markdown-nav", "aria-label": "Markdown 导航与搜索", children: [
          d ? /* @__PURE__ */ L("div", { className: "reader-md-view-switch", role: "tablist", "aria-label": "显示原文还是译文", children: gt.map((s) => /* @__PURE__ */ L(
            "button",
            {
              type: "button",
              role: "tab",
              "aria-selected": f === s.value,
              className: f === s.value ? "is-active" : void 0,
              onClick: () => p(s.value),
              children: s.label
            },
            s.value
          )) }) : null,
          /* @__PURE__ */ V("label", { className: "reader-markdown-search", children: [
            /* @__PURE__ */ L(Se, { size: 13, "aria-hidden": !0 }),
            /* @__PURE__ */ L(
              "input",
              {
                type: "search",
                value: w,
                placeholder: "搜索正文",
                "aria-label": "搜索 Markdown 正文",
                onChange: (s) => {
                  h(s.target.value), R(s.target.value, !1);
                },
                onKeyDown: (s) => {
                  s.key !== "Enter" || y === 0 || (s.preventDefault(), E(x + (s.shiftKey ? -1 : 1)));
                }
              }
            ),
            w ? /* @__PURE__ */ L("span", { className: "reader-markdown-search-count", "aria-live": "polite", children: y > 0 ? `${x + 1}/${y}` : "0/0" }) : null,
            /* @__PURE__ */ L(
              "button",
              {
                type: "button",
                "aria-label": "上一个搜索结果",
                disabled: y === 0,
                onClick: () => E(x - 1),
                children: /* @__PURE__ */ L(Re, { size: 13, "aria-hidden": !0 })
              }
            ),
            /* @__PURE__ */ L(
              "button",
              {
                type: "button",
                "aria-label": "下一个搜索结果",
                disabled: y === 0,
                onClick: () => E(x + 1),
                children: /* @__PURE__ */ L(Ue, { size: 13, "aria-hidden": !0 })
              }
            )
          ] }),
          /* @__PURE__ */ V(
            "button",
            {
              type: "button",
              className: "reader-markdown-outline-toggle",
              "aria-expanded": k,
              disabled: m.length === 0,
              onClick: () => l((s) => !s),
              children: [
                /* @__PURE__ */ L(De, { size: 13, "aria-hidden": !0 }),
                "目录",
                m.length > 0 ? ` ${m.length}` : ""
              ]
            }
          )
        ] }),
        k && m.length > 0 ? /* @__PURE__ */ L("nav", { className: "reader-markdown-outline", "aria-label": "Markdown 目录", children: m.map((s) => /* @__PURE__ */ L(
          "button",
          {
            type: "button",
            style: { "--reader-md-outline-level": s.level - 1 },
            onClick: () => {
              var v, U, D;
              const i = (v = c.current) == null ? void 0 : v.querySelector(`#${CSS.escape(s.id)}`);
              (U = i == null ? void 0 : i.scrollIntoView) == null || U.call(i, { block: "start", behavior: "smooth" });
              const g = (D = i == null ? void 0 : i.closest("[data-md-block]")) == null ? void 0 : D.dataset.mdBlock;
              g && (o == null || o(g));
            },
            children: s.text
          },
          s.id
        )) }) : null,
        /* @__PURE__ */ L(
          "article",
          {
            ref: c,
            id: "reader-markdown-content",
            className: "reader-markdown-content reader-float-markdown-content is-blocks"
          }
        )
      ]
    }
  );
}
function $t(t) {
  const e = je(), n = e == null ? void 0 : e.regions, r = Ve(() => n ? Qe(n) : null, [n]);
  return r && r.length > 0 ? /* @__PURE__ */ L(
    bt,
    {
      open: t.open,
      blocks: r,
      side: t.side,
      regionHover: e == null ? void 0 : e.regionHover,
      jumpToBlock: e == null ? void 0 : e.jumpToBlock,
      onClose: t.onClose
    }
  ) : /* @__PURE__ */ L(kt, { ...t });
}
function kt({
  open: t,
  jobId: e,
  sourceOnly: n,
  side: r = "right",
  onClose: o
}) {
  var D, F;
  const a = q([]), c = q(""), d = q(() => {
  }), [f, p] = B(!1), [M, m] = B(""), [b, S] = B(0), [k, l] = B(-1), {
    contentRef: w,
    status: h,
    setStatus: N,
    outline: y,
    outlineComplete: $,
    setOutlineComplete: x,
    outlineCompleteRef: I,
    pendingResume: E,
    rebuildOutline: R,
    renderAllRef: s,
    pendingAnchorRef: i,
    resumeCleanupRef: g
  } = mt({
    open: t,
    jobId: e,
    sourceOnly: n,
    searchQueryRef: c,
    reapplySearchRef: d
  }), v = (u, C = !0) => {
    const T = a.current;
    if (T.forEach((j) => j.classList.remove("reader-markdown-search-hit-active")), T.length === 0) {
      l(-1);
      return;
    }
    const P = (u + T.length) % T.length, O = T[P];
    O.classList.add("reader-markdown-search-hit-active"), l(P), C && typeof O.scrollIntoView == "function" && O.scrollIntoView({ block: "center", behavior: "smooth" });
  }, U = (u, C = !1) => {
    var O;
    const T = `${u || ""}`.trim();
    if (s.current = T.length > 0, s.current && ((O = g.current) == null || O.call(g)), !w.current) return;
    const P = Te(w.current, u);
    a.current = P, S(P.length), v(P.length > 0 ? 0 : -1, C);
  };
  return d.current = () => U(c.current), /* @__PURE__ */ V(
    ze,
    {
      id: "reader-markdown-panel",
      open: t,
      ariaLabel: "Markdown 预览",
      className: `is-pane-${r}`,
      onClose: o,
      toolbar: /* @__PURE__ */ L("span", { className: "reader-notes-count", children: h || "已加载" }),
      children: [
        /* @__PURE__ */ V("div", { className: "reader-markdown-nav", "aria-label": "Markdown 导航与搜索", children: [
          /* @__PURE__ */ V("label", { className: "reader-markdown-search", children: [
            /* @__PURE__ */ L(Se, { size: 13, "aria-hidden": !0 }),
            /* @__PURE__ */ L(
              "input",
              {
                type: "search",
                value: M,
                placeholder: "搜索正文",
                "aria-label": "搜索 Markdown 正文",
                onChange: (u) => {
                  const C = u.target.value;
                  c.current = C, m(C), U(C, !1);
                },
                onKeyDown: (u) => {
                  u.key !== "Enter" || b === 0 || (u.preventDefault(), v(k + (u.shiftKey ? -1 : 1)));
                }
              }
            ),
            M ? /* @__PURE__ */ L("span", { className: "reader-markdown-search-count", "aria-live": "polite", children: b > 0 ? `${k + 1}/${b}` : "0/0" }) : null,
            /* @__PURE__ */ L(
              "button",
              {
                type: "button",
                "aria-label": "上一个搜索结果",
                disabled: b === 0,
                onClick: () => v(k - 1),
                children: /* @__PURE__ */ L(Re, { size: 13, "aria-hidden": !0 })
              }
            ),
            /* @__PURE__ */ L(
              "button",
              {
                type: "button",
                "aria-label": "下一个搜索结果",
                disabled: b === 0,
                onClick: () => v(k + 1),
                children: /* @__PURE__ */ L(Ue, { size: 13, "aria-hidden": !0 })
              }
            )
          ] }),
          /* @__PURE__ */ V(
            "button",
            {
              type: "button",
              className: "reader-markdown-outline-toggle",
              "aria-expanded": f,
              disabled: y.length === 0,
              onClick: () => {
                R(), x(I.current), p((u) => !u);
              },
              children: [
                /* @__PURE__ */ L(De, { size: 13, "aria-hidden": !0 }),
                "目录",
                y.length > 0 ? ` ${y.length}` : ""
              ]
            }
          ),
          E ? /* @__PURE__ */ L(
            "button",
            {
              type: "button",
              className: "reader-markdown-resume",
              onClick: () => {
                var u;
                return (u = g.current) == null ? void 0 : u.call(g);
              },
              children: "继续加载"
            }
          ) : null
        ] }),
        f && y.length > 0 ? /* @__PURE__ */ V("nav", { className: "reader-markdown-outline", "aria-label": "Markdown 目录", children: [
          $ ? null : /* @__PURE__ */ L("p", { className: "reader-markdown-outline-note", children: "仅显示已加载内容，滚动可加载更多" }),
          y.map((u) => /* @__PURE__ */ L(
            "button",
            {
              type: "button",
              style: { "--reader-md-outline-level": u.level - 1 },
              onClick: () => {
                var T, P;
                const C = [...((T = w.current) == null ? void 0 : T.querySelectorAll("h1, h2, h3, h4, h5, h6")) || []].find((O) => O.id === u.id);
                if (C && typeof C.scrollIntoView == "function") {
                  C.scrollIntoView({ block: "start", behavior: "smooth" });
                  return;
                }
                i.current = u.id, s.current = !0, (P = g.current) == null || P.call(g), N("正在加载目标章节…");
              },
              children: u.text
            },
            u.id
          ))
        ] }) : null,
        h && !((F = (D = w.current) == null ? void 0 : D.childNodes) != null && F.length) ? /* @__PURE__ */ L("p", { className: "reader-notes-empty", children: h }) : null,
        /* @__PURE__ */ L(
          "article",
          {
            ref: w,
            id: "reader-markdown-content",
            className: "reader-markdown-content reader-float-markdown-content"
          }
        )
      ]
    }
  );
}
export {
  $t as ReaderMarkdownPanel,
  ne as buildMarkdownOutline,
  Oe as clearMarkdownSearchHighlights,
  Te as findMarkdownSearchTargets,
  Ge as isProtectedMarkdownAssetUrl,
  ge as startMarkdownImageLoading
};
//# sourceMappingURL=ReaderMarkdownPanel-BeOAn05I.js.map
