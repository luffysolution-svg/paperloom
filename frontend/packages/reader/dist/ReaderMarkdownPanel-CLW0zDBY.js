import { jsxs as _, jsx as y } from "react/jsx-runtime";
import { useEffect as Y, useRef as q, useState as B, useMemo as We } from "react";
import { Search as Se, ChevronUp as Ie, ChevronDown as De, ListTree as Re } from "lucide-react";
import { c as ce, d as ve, r as oe, f as he, u as Fe } from "./ReaderApp-CBNW2FsE.js";
import { e as pe, m as Ke, a as we } from "./markdown-math-DN_X3M3x.js";
import { n as Qe } from "./markdown-payload-kK3ewW_I.js";
import { r as Ge, b as Xe } from "./reader-blocks-BxElLvLX.js";
const Me = "h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, pre";
function Te(r) {
  r.querySelectorAll(".reader-markdown-search-hit, .reader-markdown-search-hit-active").forEach((t) => {
    t.classList.remove("reader-markdown-search-hit", "reader-markdown-search-hit-active");
  });
}
function Ue(r, t) {
  Te(r);
  const e = t.trim().toLocaleLowerCase();
  if (!e) return [];
  const o = [...r.querySelectorAll(Me)].filter((n) => [...n.children].some((s) => s.matches(Me)) ? !1 : (n.textContent || "").toLocaleLowerCase().includes(e));
  return o.forEach((n) => n.classList.add("reader-markdown-search-hit")), o;
}
function Oe({
  id: r,
  open: t,
  ariaLabel: e,
  className: a = "",
  keepMounted: o = !1,
  onClose: n,
  toolbar: s,
  children: i
}) {
  return Y(() => {
    if (!t) return;
    const f = (m) => {
      var u;
      if (m.key !== "Escape") return;
      const w = m.target;
      (u = w == null ? void 0 : w.closest) != null && u.call(w, "textarea, input, select, [contenteditable='true']") || (m.preventDefault(), n());
    };
    return window.addEventListener("keydown", f), () => window.removeEventListener("keydown", f);
  }, [t, n]), !t && !o ? null : /* @__PURE__ */ _(
    "aside",
    {
      id: r,
      className: `reader-notes-panel reader-notes-panel--workspace${s ? " has-panel-toolbar" : ""} ${a}`.trim(),
      "aria-label": e,
      role: "dialog",
      "aria-modal": "false",
      "data-hidden": t ? void 0 : "",
      inert: t ? void 0 : !0,
      "aria-hidden": t ? void 0 : !0,
      children: [
        s ? /* @__PURE__ */ y("div", { className: "reader-notes-panel-toolbar", children: s }) : null,
        /* @__PURE__ */ y("div", { className: "reader-notes-panel-body", children: i })
      ]
    }
  );
}
function Je(r) {
  return r.normalize("NFKC").trim().toLocaleLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-+|-+$/g, "") || "section";
}
function ae(r, t = /* @__PURE__ */ new Map()) {
  return [...r.querySelectorAll("h1, h2, h3, h4, h5, h6")].flatMap((e) => {
    const a = (e.textContent || "").replace(/\s+/g, " ").trim();
    if (!a) return [];
    const o = Je(a), n = (t.get(o) || 0) + 1;
    t.set(o, n);
    const s = n === 1 ? `reader-md-${o}` : `reader-md-${o}-${n}`;
    return e.id = s, [{ id: s, level: Number(e.tagName.slice(1)), text: a }];
  });
}
function Ye(r, t = "http://localhost/") {
  var e;
  if (/^mock:\/\//i.test(r)) return !0;
  try {
    const a = ((e = globalThis.location) == null ? void 0 : e.href) || "http://localhost/", o = new URL(t, a), n = new URL(r, o);
    if (!/\/api\/v1\/jobs\/[^/]+\/(?:markdown|files\/output\/ocr)\/images\//.test(n.pathname)) return !1;
    if (!/^[a-z][a-z\d+.-]*:/i.test(r)) return !0;
    const s = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(n.hostname);
    return n.origin === o.origin || s;
  } catch {
    return !1;
  }
}
function Ze(r, t) {
  if (/^data:image\//i.test(r) || /^blob:/i.test(r)) return !0;
  try {
    const e = new URL(r, t);
    return e.protocol === "http:" || e.protocol === "https:";
  } catch {
    return !1;
  }
}
function ge(r, t) {
  let e = !1, a = 0, o = 0, n = 0;
  const s = [], i = [], f = /* @__PURE__ */ new Set(), m = (p, M) => {
    const b = p.ownerDocument.createElement("span");
    b.className = "reader-markdown-image-missing", b.textContent = M, b.title = p.getAttribute("data-reader-md-src") || "", p.replaceWith(b);
  };
  for (const p of r) {
    const M = p.getAttribute("data-reader-md-src") || "", b = p.ownerDocument.baseURI || "http://localhost/";
    Ye(M, t.protectedBaseUrl || b) ? i.push(p) : Ze(M, b) ? p.src = M : m(p, "[图片地址不可用]");
  }
  const w = () => {
    var p;
    return (p = t.onProgress) == null ? void 0 : p.call(t, { failed: n, loaded: o, total: i.length });
  }, u = () => {
    if (!e)
      for (; a < 4 && s.length > 0; ) {
        const p = s.shift();
        if (!(p != null && p.isConnected)) continue;
        a += 1;
        const M = p.getAttribute("data-reader-md-src") || "";
        t.fetchImage(M, t.signal ? { signal: t.signal } : void 0).then(async (b) => {
          if (!(b != null && b.ok)) throw new Error(`HTTP ${(b == null ? void 0 : b.status) || 0}`);
          const H = URL.createObjectURL(await b.blob());
          if (e || !p.isConnected) {
            try {
              URL.revokeObjectURL(H);
            } catch {
            }
            return;
          }
          t.onObjectUrl(H), p.src = H, o += 1;
        }).catch(() => {
          e || !p.isConnected || (n += 1, m(p, "[图片暂不可用]"));
        }).finally(() => {
          a -= 1, e || (w(), u());
        });
      }
  }, k = (p) => {
    e || f.has(p) || (f.add(p), s.push(p), u());
  }, x = globalThis.IntersectionObserver;
  let E = null;
  return x && i.length > 0 ? (E = new x((p) => {
    p.forEach((M) => {
      if (!M.isIntersecting) return;
      const b = M.target;
      E == null || E.unobserve(b), k(b);
    });
  }, { root: t.root || null, rootMargin: "600px 0px" }), i.forEach((p) => E == null ? void 0 : E.observe(p))) : i.forEach(k), w(), () => {
    e = !0, s.length = 0, E == null || E.disconnect();
  };
}
function Be(r) {
  r.querySelectorAll("[data-reader-tex], .reader-md-math-error").forEach((t) => {
    const e = t.dataset.readerTex ?? t.textContent ?? "", a = t.ownerDocument.createTextNode(`${t.classList.contains("reader-md-math-display") ? `
` : ""}$${e}$${t.classList.contains("reader-md-math-display") ? `
` : ""}`);
    t.replaceWith(a);
  }), r.querySelectorAll(".reader-md-copy-actions, .reader-md-selection-actions, .reader-md-internal-back").forEach((t) => t.remove());
}
function Ce(r, t) {
  let e = r.nodeType === Node.ELEMENT_NODE ? r : r.parentElement;
  for (; e && e !== t; ) {
    if (e.matches("[data-reader-tex], .reader-md-math-error")) return e;
    e = e.parentElement;
  }
  return null;
}
function Pe(r) {
  if (r.nodeType === Node.TEXT_NODE) return r.textContent || "";
  if (r.nodeType !== Node.ELEMENT_NODE) return "";
  const t = r;
  if (t.classList.contains("reader-md-copy-actions") || t.classList.contains("reader-md-selection-actions") || t.classList.contains("reader-md-internal-back")) return "";
  if (t.tagName === "BR") return `
`;
  const e = Array.from(t.childNodes, Pe).join("");
  return /^(ADDRESS|ARTICLE|BLOCKQUOTE|DIV|H[1-6]|LI|OL|P|PRE|SECTION|TABLE|TR|UL)$/.test(t.tagName) ? `${e}
` : e;
}
function qe(r, t) {
  if (!(t != null && t.rangeCount) || t.isCollapsed) return null;
  const e = t.getRangeAt(0).cloneRange();
  if (!r.contains(e.commonAncestorContainer)) return null;
  const a = Ce(e.startContainer, r), o = Ce(e.endContainer, r);
  if (a && e.setStartBefore(a), o && e.setEndAfter(o), !r.contains(e.commonAncestorContainer)) return null;
  const n = e.cloneContents(), s = r.ownerDocument.createElement("div");
  s.append(n), Be(s);
  const i = Pe(s).replace(/[ \t]+\n/g, `
`).replace(/\n{3,}/g, `

`).trim();
  return i ? { text: i, html: s.innerHTML } : null;
}
function et(r) {
  r.dataset.readerCopyBound !== "true" && (r.dataset.readerCopyBound = "true", r.addEventListener("copy", (t) => {
    var o, n, s, i;
    const e = ((n = (o = r.ownerDocument).getSelection) == null ? void 0 : n.call(o)) ?? ((i = (s = r.ownerDocument.defaultView) == null ? void 0 : s.getSelection) == null ? void 0 : i.call(s)), a = qe(r, e);
    !a || !t.clipboardData || (t.clipboardData.setData("text/plain", a.text), t.clipboardData.setData("text/html", a.html), t.preventDefault());
  }));
}
function ze(r) {
  var f, m, w, u, k;
  const t = ((m = (f = r.ownerDocument).getSelection) == null ? void 0 : m.call(f)) ?? ((u = (w = r.ownerDocument.defaultView) == null ? void 0 : w.getSelection) == null ? void 0 : u.call(w)), e = qe(r, t);
  if (!e) return null;
  const a = t == null ? void 0 : t.anchorNode, o = a && ((k = a.nodeType === Node.ELEMENT_NODE ? a : a.parentElement) == null ? void 0 : k.closest("[data-md-block]")), n = o == null ? void 0 : o.dataset.mdPage, s = o == null ? void 0 : o.dataset.mdBlock, i = [n ? `第 ${n} 页` : "", s ? `块 ${s}` : ""].filter(Boolean).join("，") || "Markdown 正文";
  return { ...e, source: i };
}
function be(r) {
  var a;
  if (r.nodeType === Node.TEXT_NODE) return r.textContent || "";
  if (r.nodeType !== Node.ELEMENT_NODE) return "";
  const t = r, e = Array.from(t.childNodes, be).join("");
  switch (t.tagName) {
    case "BR":
      return `
`;
    case "STRONG":
    case "B":
      return `**${e.trim()}**`;
    case "EM":
    case "I":
      return `*${e.trim()}*`;
    case "CODE":
      return ((a = t.parentElement) == null ? void 0 : a.tagName) === "PRE" ? e : `\`${e}\``;
    case "PRE":
      return `

\`\`\`
${t.textContent || ""}
\`\`\`

`;
    case "A":
      return `[${e.trim()}](${t.getAttribute("href") || ""})`;
    case "IMG":
      return `![${t.getAttribute("alt") || ""}](${t.getAttribute("src") || t.getAttribute("data-reader-md-src") || ""})`;
    case "H1":
      return `

# ${e.trim()}

`;
    case "H2":
      return `

## ${e.trim()}

`;
    case "H3":
      return `

### ${e.trim()}

`;
    case "H4":
      return `

#### ${e.trim()}

`;
    case "H5":
      return `

##### ${e.trim()}

`;
    case "H6":
      return `

###### ${e.trim()}

`;
    case "LI":
      return e.trim();
    case "UL":
    case "OL":
      return Array.from(t.children).map((o, n) => `${t.tagName === "OL" ? `${n + 1}.` : "-"} ${be(o).trim()}`).join(`
`) + `

`;
    case "P":
    case "DIV":
      return `${e.trim()}

`;
    case "BLOCKQUOTE":
      return `${e.trim().split(`
`).map((o) => `> ${o}`).join(`
`)}

`;
    case "TABLE":
      return `

${ye(t, "Markdown")}

`;
    default:
      return e;
  }
}
function tt(r, t) {
  const e = t.createElement("div");
  return e.innerHTML = r, be(e).replace(/\n{3,}/g, `

`).trim();
}
async function rt(r, t) {
  const e = ze(r);
  return e ? t === "word" ? Ve(`<div>${e.html}</div>`, e.text) : t === "excerpt" ? ce(`${e.text}

来源：${e.source}`) : ce(t === "markdown" ? tt(e.html, r.ownerDocument) : e.text) : !1;
}
function nt(r) {
  if (r.dataset.readerSelectionActionsBound === "true") return;
  r.dataset.readerSelectionActionsBound = "true";
  const t = r.ownerDocument, e = t.createElement("div");
  e.className = "reader-md-selection-actions", e.hidden = !0, e.setAttribute("aria-label", "复制选区"), e.append("复制选区");
  const a = t.createElement("span");
  a.setAttribute("aria-live", "polite"), e.append(a);
  const o = [
    ["text", "纯文本"],
    ["markdown", "Markdown"],
    ["word", "Word"],
    ["excerpt", "摘录"]
  ];
  for (const [n, s] of o) {
    const i = t.createElement("button");
    i.type = "button", i.textContent = s, i.onclick = async () => {
      a.textContent = "", a.textContent = await rt(r, n) ? "已复制" : "请选择正文内容";
    }, e.append(i);
  }
  r.prepend(e), t.addEventListener("selectionchange", () => {
    var s;
    const n = (s = t.getSelection) == null ? void 0 : s.call(t);
    e.hidden = !n || n.isCollapsed || !ze(r);
  });
}
function Ae(r) {
  const t = r.ownerDocument, e = t.createElement("div");
  e.className = "reader-md-image-preview", e.setAttribute("role", "dialog"), e.setAttribute("aria-label", "图片预览");
  const a = r.cloneNode(!0);
  a.removeAttribute("loading"), a.removeAttribute("data-reader-md-src"), a.src = r.currentSrc || r.src;
  const o = () => e.remove();
  e.onclick = (n) => {
    n.target === e && o();
  }, e.append(a), t.body.append(e), e.tabIndex = -1, e.focus(), e.onkeydown = (n) => {
    n.key === "Escape" && o();
  };
}
function at(r) {
  if (r.dataset.readerMarkdownInteractionsBound === "true") return;
  r.dataset.readerMarkdownInteractionsBound = "true";
  let t = null;
  const e = r.ownerDocument, a = r.closest(".reader-notes-panel-body") || r, o = e.createElement("button");
  o.type = "button", o.className = "reader-md-internal-back", o.textContent = "返回上次位置", o.hidden = !0, o.onclick = () => {
    t != null && (a.scrollTo({ top: t, behavior: "smooth" }), o.hidden = !0);
  }, r.prepend(o), r.addEventListener("click", (n) => {
    var w, u;
    const i = n.target.closest("a[href^='#']");
    if (!i || !r.contains(i)) return;
    const f = decodeURIComponent(i.getAttribute("href").slice(1)), m = r.ownerDocument.getElementById(f);
    !m || !r.contains(m) || (n.preventDefault(), t = a.scrollTop, (w = m.scrollIntoView) == null || w.call(m, { block: "center", behavior: "smooth" }), o.hidden = !1, m.classList.add("reader-md-internal-target"), (u = e.defaultView) == null || u.setTimeout(() => m.classList.remove("reader-md-internal-target"), 1200));
  });
}
const ot = {
  "\\": "\\textbackslash{}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}"
};
function He(r, t) {
  if (r.nodeType === 3) {
    const n = r.textContent || "";
    return t === "Markdown" ? n.replace(/[\\|*_`<>[\]]/g, "\\$&") : n.replace(/[\\&%$#_{}~^]/g, (s) => ot[s] ?? "\\" + s);
  }
  const e = r;
  if (r.nodeType !== 1 || e.classList.contains("reader-md-copy-actions")) return "";
  const a = e.dataset.readerTex ?? (e.classList.contains("reader-md-math-error") ? e.textContent : null);
  if (a != null) return "$" + (t === "Markdown" ? a.replace(/\|/g, "\\|") : a) + "$";
  if (e.tagName === "BR") return t === "Markdown" ? "<br>" : " ";
  const o = Array.from(e.childNodes, (n) => He(n, t)).join("");
  if (e.tagName === "SUP" || e.tagName === "SUB") {
    const n = e.tagName.toLowerCase();
    return t === "Markdown" ? `<${n}>${o}</${n}>` : `${n === "sup" ? "\\textsuperscript" : "\\textsubscript"}{${o}}`;
  }
  return e.tagName === "P" ? o + " " : o;
}
function ye(r, t) {
  const e = Array.from(r.rows), a = e.map(() => []);
  e.forEach((s, i) => {
    let f = 0;
    for (const m of s.cells) {
      for (; a[i][f] !== void 0; ) f++;
      const u = s.parentElement.rows.length - s.sectionRowIndex, k = Math.min(m.rowSpan || u, u);
      for (let x = 0; x < k; x++)
        for (let E = 0; E < m.colSpan; E++) a[i + x][f + E] = "";
      a[i][f] = He(m, t).replace(/\s+/g, " ").trim(), f += m.colSpan;
    }
  });
  const o = a.reduce((s, i) => Math.max(s, i.length), 0);
  if (!o) return "";
  const n = a.map((s) => Array.from({ length: o }, (i, f) => s[f] ?? ""));
  return t === "Markdown" ? (n.splice(1, 0, Array(o).fill("---")), n.map((s) => "| " + s.join(" | ") + " |").join(`
`)) : [
    `\\begin{tabular}{${"l".repeat(o)}}`,
    ...n.map((s) => s.join(" & ") + " \\\\"),
    "\\end{tabular}"
  ].join(`
`);
}
function st(r) {
  const t = r.cloneNode(!0);
  return Be(t), t.setAttribute("border", "1"), t.style.borderCollapse = "collapse", t.querySelectorAll("th, td").forEach((e) => {
    e.style.border = "1px solid #b8bec8", e.style.padding = "4px 8px";
  }), { html: t.outerHTML, text: ye(r, "Markdown") };
}
async function Ve(r, t) {
  var e;
  try {
    if ((e = navigator.clipboard) != null && e.write && typeof ClipboardItem < "u")
      return await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([r], { type: "text/html" }),
        "text/plain": new Blob([t], { type: "text/plain" })
      })]), !0;
  } catch {
  }
  return ce(t);
}
async function ct(r) {
  const t = new URL(r.currentSrc || r.src, r.ownerDocument.baseURI);
  let e = r;
  /^https?:$/.test(t.protocol) && t.origin !== location.origin && (e = new Image(), e.crossOrigin = "anonymous", e.src = t.href), await e.decode();
  const a = r.ownerDocument.createElement("canvas");
  return a.width = e.naturalWidth, a.height = e.naturalHeight, a.getContext("2d").drawImage(e, 0, 0), new Promise((o, n) => {
    a.toBlob((s) => s ? o(s) : n(new Error("PNG 编码失败")), "image/png");
  });
}
function lt(r) {
  var t;
  et(r), nt(r), at(r);
  for (const e of r.querySelectorAll("img[data-reader-md-src], table")) {
    const a = e.ownerDocument, o = a.createElement("span");
    o.className = "reader-md-copy-actions";
    const n = a.createElement("span");
    n.setAttribute("role", "status"), o.append(n);
    const s = e.tagName === "IMG";
    s ? (o.hidden = !0, e.closest("a") || e.addEventListener("click", () => Ae(e)), e.addEventListener("load", () => {
      o.hidden = !1;
    }, { once: !0 })) : o.append("复制为");
    for (const i of s ? ["复制图片", "放大", "下载"] : ["Markdown", "LaTeX", "Word"]) {
      const f = a.createElement("button");
      f.type = "button", f.textContent = i, f.setAttribute("aria-label", s ? i : "复制表格为 " + i), f.onclick = async (m) => {
        m.stopPropagation(), n.textContent = "";
        let w = !1;
        try {
          if (s && i === "放大")
            Ae(e), w = !0;
          else if (s && i === "下载") {
            const u = e, k = u.currentSrc || u.src || u.dataset.readerMdSrc;
            if (k) {
              const x = a.createElement("a");
              x.href = k, x.download = "paperloom-image", x.click(), w = !0;
            }
          } else if (s)
            await navigator.clipboard.write([new ClipboardItem({ "image/png": ct(e) })]), w = !0;
          else if (i === "Word") {
            const u = st(e);
            w = await Ve(u.html, u.text);
          } else
            w = await ce(ye(e, i));
        } catch {
        }
        n.textContent = w ? "已复制" : "复制失败";
      }, o.append(f);
    }
    (e.closest("a") || e).after(o);
  }
  for (const e of r.querySelectorAll("pre > code")) {
    if (e.dataset.readerCodeActionsBound === "true") continue;
    e.dataset.readerCodeActionsBound = "true";
    const a = e.ownerDocument.createElement("span");
    a.className = "reader-md-copy-actions reader-md-code-actions";
    const o = e.ownerDocument.createElement("button");
    o.type = "button", o.textContent = "复制代码", o.setAttribute("aria-label", "复制代码");
    const n = e.ownerDocument.createElement("span");
    n.setAttribute("role", "status"), o.onclick = async (s) => {
      s.stopPropagation(), n.textContent = await ce(e.textContent || "") ? "已复制" : "复制失败";
    }, a.append(o, n), (t = e.parentElement) == null || t.after(a);
  }
}
let ue = null;
function ke() {
  return ue || (ue = import("marked").catch((r) => {
    throw ue = null, r;
  })), ue;
}
function it(r) {
  r.querySelectorAll("script, iframe, object, embed, style, link, meta, base, form, input, button, textarea, select").forEach((t) => t.remove()), r.querySelectorAll("*").forEach((t) => {
    for (const e of [...t.attributes])
      /^on/i.test(e.name) && t.removeAttribute(e.name);
  }), r.querySelectorAll("a[href]").forEach((t) => {
    const e = t, a = e.getAttribute("href") || "";
    /^\s*javascript:/i.test(a) ? e.removeAttribute("href") : /^\s*#/.test(a) && (e.classList.add("reader-md-internal-link"), e.removeAttribute("target")), /^\s*#/.test(a) || (e.setAttribute("target", "_blank"), e.setAttribute("rel", "noopener noreferrer"));
  });
}
function se(r, t, e, a = {}) {
  const o = r.ownerDocument.createElement("template");
  return o.innerHTML = t, it(o.content), o.content.querySelectorAll("img[src]").forEach((n) => {
    var f;
    const s = n.getAttribute("src") || "", i = ((f = a.resolveAssetUrl) == null ? void 0 : f.call(a, e, s)) || s;
    n.setAttribute("data-reader-md-src", i), n.setAttribute("loading", "lazy"), n.setAttribute("decoding", "async"), n.removeAttribute("src");
  }), r.replaceChildren(o.content), lt(r), r.classList.remove("hidden"), [...r.querySelectorAll("img[data-reader-md-src]")];
}
function dt(r, t) {
  let e = t;
  for (; e < r.length; ) {
    const a = r.indexOf(`
`, e), o = a === -1 ? r.length : a, n = r.slice(e, o).trim();
    if (n !== "") return n;
    if (a === -1) return null;
    e = a + 1;
  }
  return null;
}
const ut = /^\s{0,3}\[[^\]]+\]:/;
function Le(r) {
  const t = r.match(/^(?:([-*+])|(\d+)([.)]))\s+/);
  return t ? t[1] ? `ul:${t[1]}` : `ol:${t[3]}` : null;
}
function mt(r, t, e) {
  const a = dt(r, t);
  if (!a) return !1;
  if (ut.test(a)) return !0;
  const o = e ? Le(e) : null, n = Le(a);
  return o != null && o === n;
}
function Ne(r, { minChars: t = 16384 } = {}) {
  if (!r) return null;
  let e = "", a = null, o = 0;
  const n = r.length;
  for (; o < n; ) {
    const s = r.indexOf(`
`, o), i = s === -1 ? n : s, m = r.slice(o, i).trim(), w = m.match(/^(`{3,}|~{3,})/);
    if (w) {
      const u = w[1][0];
      e ? e === u && (e = "") : e = u;
    }
    if (!e && m === "") {
      const u = s === -1 ? n : s + 1;
      if (u >= t && !mt(r, u, a))
        return { complete: r.slice(0, u), rest: r.slice(u) };
    } else m !== "" && (a = m);
    if (s === -1) break;
    o = s + 1;
  }
  return null;
}
function ft({
  open: r,
  jobId: t,
  sourceOnly: e,
  searchQueryRef: a,
  reapplySearchRef: o
}) {
  const n = q(null), [s, i] = B("尚未加载"), f = q([]), m = q(null), w = q(/* @__PURE__ */ new Map()), u = q([]), k = q(null), x = q(!1), E = q(!1), p = q(null), [M, b] = B([]), [H, D] = B(!1), [R, $] = B(!1), A = () => {
    for (const l of f.current)
      try {
        URL.revokeObjectURL(l);
      } catch {
      }
    f.current = [];
  }, S = () => {
    var l, h;
    (l = m.current) == null || l.call(m), m.current = null;
    for (const g of u.current) g();
    u.current = [], (h = k.current) == null || h.call(k), k.current = null, A();
  }, T = () => {
    const l = n.current;
    l && (w.current = /* @__PURE__ */ new Map(), b(ae(l, w.current)));
  }, c = () => {
    const l = p.current, h = n.current;
    if (!l || !h) return;
    const g = [...h.querySelectorAll("h1, h2, h3, h4, h5, h6")].find((L) => L.id === l);
    g && (p.current = null, typeof g.scrollIntoView == "function" && g.scrollIntoView({ block: "start", behavior: "smooth" }));
  };
  return Y(() => () => {
    var l;
    (l = m.current) == null || l.call(m), A();
  }, []), Y(() => {
    if (!r) {
      S(), b([]), E.current = !1, D(!1);
      return;
    }
    let l = !1;
    S(), w.current = /* @__PURE__ */ new Map(), E.current = !1, D(!1), b([]), x.current = !1, p.current = null, $(!1);
    const h = new AbortController(), g = ve;
    async function L() {
      var d, v, U, P, I, j;
      const z = t.startsWith("doc:");
      if (!t || z) {
        i(!t && e ? "源文档阅读不提供 Markdown 产物" : "该任务暂无 Markdown 产物"), n.current && (n.current.replaceChildren(), n.current.classList.add("hidden"));
        return;
      }
      i("正在加载 Markdown…"), (d = n.current) == null || d.replaceChildren(), (v = n.current) == null || v.classList.add("hidden");
      try {
        if (typeof (g == null ? void 0 : g.loadMarkdownSource) == "function" && typeof (g == null ? void 0 : g.loadMarkdownRange) == "function") {
          const O = await g.loadMarkdownSource(t, h.signal);
          if (l) return;
          if (O != null && O.rawUrl) {
            await N(O);
            return;
          }
        }
      } catch {
      }
      try {
        const O = await ve.loadMarkdownPayload(t);
        if (l) return;
        const { content: W, imagesBaseUrl: G } = Qe(O);
        if (!W.trim()) {
          i("该任务暂无 Markdown 产物"), (U = n.current) == null || U.replaceChildren(), (P = n.current) == null || P.classList.add("hidden");
          return;
        }
        const { marked: V } = await ke();
        if (l || !n.current) return;
        const { text: Q, slots: X } = pe(W, { bareLatex: !0 }), te = String(V.parse(Q, { async: !1 })), re = Ke(te, X);
        se(n.current, re, G, {
          resolveAssetUrl: oe
        }), b(ae(n.current)), (I = o.current) == null || I.call(o), i(X.length > 0 ? `正文已显示 · 正在渲染 ${X.length} 个公式…` : "");
        const le = X.length > 0 ? await we(te, X) : te;
        if (l || !n.current) return;
        const ie = se(n.current, le, G, {
          resolveAssetUrl: oe
        });
        b(ae(n.current)), E.current = !0, D(!0), (j = o.current) == null || j.call(o), i("");
        const me = n.current.closest(".reader-notes-panel-body");
        m.current = ge(ie, {
          root: me,
          protectedBaseUrl: G || n.current.ownerDocument.baseURI,
          fetchImage: he,
          signal: h.signal,
          onObjectUrl: (J) => f.current.push(J),
          onProgress: ({ failed: J }) => {
            !l && J > 0 && i(`正文已加载 · ${J} 张图片不可用`);
          }
        });
      } catch (O) {
        if (l) return;
        i(O instanceof Error ? O.message : "Markdown 加载失败");
      }
    }
    async function N(z) {
      var J;
      const d = n.current;
      if (!d) return;
      const v = 262144, U = 8192, P = `${z.imagesBaseUrl || ""}`, I = d.closest(".reader-notes-panel-body");
      let j = new TextDecoder(), O = 0, W = `${z.etag || ""}`, G = Number.isFinite(Number(z.totalBytes)) ? Number(z.totalBytes) : null, V = "", Q = !1;
      const X = 4, te = 4e3;
      let re = 0;
      const le = () => {
        for (const C of u.current) C();
        u.current = [], A(), w.current = /* @__PURE__ */ new Map(), b([]);
      }, ie = async (C) => {
        const { marked: F } = await ke();
        if (l || !n.current) return;
        const { text: K, slots: Z } = pe(C, { bareLatex: !0 }), ne = String(F.parse(K, { async: !1 })), fe = Z.length > 0 ? await we(ne, Z) : ne;
        if (l || !n.current) return;
        const de = d.ownerDocument.createElement("section");
        de.className = "reader-markdown-chunk";
        const _e = se(de, fe, P, {
          resolveAssetUrl: oe
        });
        d.appendChild(de), d.classList.remove("hidden");
        const Ee = ae(de, w.current);
        Ee.length && b((ee) => [...ee, ...Ee]), c();
        const je = ge(_e, {
          root: I,
          protectedBaseUrl: P || d.ownerDocument.baseURI,
          fetchImage: he,
          signal: h.signal,
          onObjectUrl: (ee) => f.current.push(ee),
          onProgress: ({ failed: ee }) => {
            !l && ee > 0 && i(`正文已加载 · ${ee} 张图片不可用`);
          }
        });
        u.current.push(je);
      }, me = async () => {
        x.current || !I || l || d.scrollHeight <= I.clientHeight * 2 || ($(!0), i("已加载部分 · 滚动或点击继续加载"), await new Promise((C) => {
          let F = !1, K = null;
          const Z = (fe) => {
            F || (F = !0, I.removeEventListener("scroll", ne), K && (clearTimeout(K), K = null), k.current = null, l || ($(!1), fe && (re = 0)), C());
          }, ne = () => {
            (d.scrollHeight <= I.clientHeight * 2 || I.scrollTop + I.clientHeight >= d.scrollHeight - 800) && Z(!0);
          };
          k.current = () => Z(!0), I.addEventListener("scroll", ne, { passive: !0 }), re < X && (re += 1, K = setTimeout(() => Z(!1), te));
        }));
      };
      try {
        for (; !Q && !l; ) {
          const C = await g.loadMarkdownRange(
            z.rawUrl,
            O,
            O + v - 1,
            W || void 0,
            h.signal
          );
          if (l) return;
          if (C.status === 404) {
            i("该任务暂无 Markdown 产物"), d.replaceChildren(), d.classList.add("hidden");
            return;
          }
          if (C.status === 200)
            d.replaceChildren(), le(), j = new TextDecoder(), V = j.decode(C.bytes, { stream: !1 }), Q = !0;
          else if (C.status === 206) {
            if (W && C.etag && C.etag !== W) {
              d.replaceChildren(), le(), j = new TextDecoder(), V = "", O = 0, Q = !1, W = C.etag;
              continue;
            }
            !W && C.etag && (W = C.etag), C.totalBytes != null && (G = C.totalBytes);
            const K = C.rangeEnd != null ? C.rangeEnd + 1 : O + C.bytes.length;
            Q = G != null ? K >= G : C.bytes.length < v, V += j.decode(C.bytes, { stream: !Q }), O = K;
          } else
            throw new Error(`读取 Markdown 失败，请稍后重试。(${C.status})`);
          let F = Ne(V, { minChars: U });
          for (; F && !l; ) {
            if (V = F.rest, await ie(F.complete), l) return;
            await me(), F = Ne(V, { minChars: U });
          }
          Q && V.trim() && (await ie(V), V = "");
        }
        l || (T(), E.current = !0, D(!0), c(), i(""), a.current.trim() && ((J = o.current) == null || J.call(o)));
      } catch (C) {
        if (l || h.signal.aborted) return;
        i(C instanceof Error ? C.message : "Markdown 加载失败");
      }
    }
    return L(), () => {
      l = !0, h.abort(), S();
    };
  }, [r, t, e]), {
    contentRef: n,
    status: s,
    setStatus: i,
    outline: M,
    setOutline: b,
    outlineComplete: H,
    setOutlineComplete: D,
    outlineCompleteRef: E,
    pendingResume: R,
    rebuildOutline: T,
    renderAllRef: x,
    pendingAnchorRef: p,
    resumeCleanupRef: k
  };
}
const xe = 40, $e = { resolveAssetUrl: oe };
function ht(r, t, e, a) {
  const [o, n] = B(""), [s, i] = B([]), f = q(/* @__PURE__ */ new Map()), [m, w] = B(0);
  return Y(() => {
    const u = r.current;
    if (!a || !u) return;
    let k = !1;
    const x = new AbortController(), E = [], p = [], M = /* @__PURE__ */ new Map();
    f.current = M, u.replaceChildren(), n("正在排版…");
    const b = u.closest(".reader-notes-panel-body"), H = async (R, $) => {
      const { text: A, slots: S } = pe(R, { bareLatex: !0 }), T = $(A);
      return S.length > 0 ? we(T, S) : T;
    }, D = async (R, $, A, S) => {
      if ($.kind === "figure") {
        const c = $.assetUrls.map((l) => `<img src="${pt(l)}" alt="">`).join("");
        return se(R, c, "", $e);
      }
      let T = await H(Ge($, A), S);
      return $.kind === "formula" && $.label && (T += `<span class="reader-md-formula-label">${wt($.label)}</span>`), se(R, T, "", $e);
    };
    return (async () => {
      try {
        const { marked: R } = await ke(), $ = (A) => String(R.parse(A, { async: !1 }));
        for (let A = 0; A < t.length; A += xe) {
          if (k) return;
          const S = u.ownerDocument.createDocumentFragment(), T = [];
          for (const c of t.slice(A, A + xe)) {
            const l = u.ownerDocument.createElement("div");
            l.className = `reader-md-block is-${c.kind}`, l.dataset.mdBlock = c.key, l.dataset.mdPage = `${c.page}`, l.tabIndex = 0, l.setAttribute("aria-label", `跳到第 ${c.page} 页的这一块`);
            const h = e === "bilingual" && c.hasTranslation, g = h ? ["source", "translated"] : [e === "source" ? "source" : "translated"];
            for (const L of g) {
              const N = u.ownerDocument.createElement("div");
              if (N.className = h ? `reader-md-block-${L}` : "reader-md-block-body", T.push(...await D(N, c, L, $)), k) return;
              l.appendChild(N);
            }
            l.setAttribute("role", l.querySelector("button") ? "group" : "button");
            for (const L of c.itemIds) M.set(L, l);
            S.appendChild(l);
          }
          u.appendChild(S), u.classList.remove("hidden"), p.push(ge(T, {
            root: b,
            // 受保护的判断要以 API 地址为准（它可能是局域网 IP，和静态页不同源）。
            protectedBaseUrl: oe("", "/api/v1/"),
            fetchImage: he,
            signal: x.signal,
            onObjectUrl: (c) => E.push(c)
          })), await new Promise((c) => setTimeout(c, 0));
        }
        if (k) return;
        i(ae(u).filter((A) => {
          var S;
          return !((S = u.querySelector(`#${CSS.escape(A.id)}`)) != null && S.closest(".reader-md-block-source"));
        })), n(`${t.length} 块`), w((A) => A + 1);
      } catch (R) {
        k || n(R instanceof Error ? R.message : "Markdown 排版失败");
      }
    })(), () => {
      k = !0, x.abort();
      for (const R of p) R();
      for (const R of E)
        try {
          URL.revokeObjectURL(R);
        } catch {
        }
    };
  }, [t, e, a, r]), { status: o, outline: s, elementsRef: f, renderedRevision: m };
}
function pt(r) {
  return r.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function wt(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const gt = [
  { value: "translated", label: "译文" },
  { value: "source", label: "原文" },
  { value: "bilingual", label: "双语" }
];
function bt({
  open: r,
  blocks: t,
  side: e = "right",
  regionHover: a,
  jumpToBlock: o,
  onClose: n
}) {
  const s = q(null), i = t.some((c) => c.hasTranslation), [f, m] = B(i ? "translated" : "source"), { status: w, outline: u, elementsRef: k, renderedRevision: x } = ht(s, t, f, r), [E, p] = B(!1), [M, b] = B(""), H = q([]), [D, R] = B(0), [$, A] = B(-1);
  Y(() => {
    if (!a) return;
    let c = null;
    const l = () => {
      const { itemId: g, origin: L } = a.get(), N = g ? k.current.get(g) ?? null : null;
      N !== c && (c == null || c.classList.remove("is-linked"), c = N, N && (N.classList.add("is-linked"), L === "pdf" && typeof N.scrollIntoView == "function" && N.scrollIntoView({ block: "nearest", behavior: "smooth" })));
    };
    l();
    const h = a.subscribe(l);
    return () => {
      h(), c == null || c.classList.remove("is-linked");
    };
  }, [a, k, x]), Y(() => {
    const c = s.current;
    if (!c) return;
    const l = (d) => d instanceof Element ? d.closest("[data-md-block]") : null, h = (d) => {
      const v = l(d.target);
      a == null || a.set((v == null ? void 0 : v.dataset.mdBlock) ?? null, "markdown");
    }, g = () => a == null ? void 0 : a.set(null, "markdown"), L = (d) => {
      const v = d == null ? void 0 : d.dataset.mdBlock;
      v && (o == null || o(v));
    }, N = (d) => {
      var v;
      (v = c.ownerDocument.getSelection()) != null && v.toString() || d.target instanceof Element && d.target.closest("a[href]") || L(l(d.target));
    }, z = (d) => {
      if (d.key !== "Enter" && d.key !== " ") return;
      const v = l(d.target);
      !v || v !== d.target || (d.preventDefault(), L(v));
    };
    return c.addEventListener("mouseover", h), c.addEventListener("mouseleave", g), c.addEventListener("click", N), c.addEventListener("keydown", z), () => {
      c.removeEventListener("mouseover", h), c.removeEventListener("mouseleave", g), c.removeEventListener("click", N), c.removeEventListener("keydown", z);
    };
  }, [a, o]);
  const S = (c, l = !0) => {
    const h = H.current;
    if (h.forEach((N) => N.classList.remove("reader-markdown-search-hit-active")), h.length === 0) {
      A(-1);
      return;
    }
    const g = (c + h.length) % h.length, L = h[g];
    L.classList.add("reader-markdown-search-hit-active"), A(g), l && typeof L.scrollIntoView == "function" && L.scrollIntoView({ block: "center", behavior: "smooth" });
  }, T = (c, l = !1) => {
    const h = s.current;
    if (!h) return;
    c.trim() || Te(h);
    const g = c.trim() ? Ue(h, c) : [];
    H.current = g, R(g.length), S(g.length > 0 ? 0 : -1, l);
  };
  return Y(() => {
    M.trim() && T(M);
  }, [x]), /* @__PURE__ */ _(
    Oe,
    {
      id: "reader-markdown-panel",
      open: r,
      ariaLabel: "Markdown 预览",
      className: `is-pane-${e}`,
      onClose: n,
      toolbar: /* @__PURE__ */ y("span", { className: "reader-notes-count", children: w || "已加载" }),
      children: [
        /* @__PURE__ */ _("div", { className: "reader-markdown-nav", "aria-label": "Markdown 导航与搜索", children: [
          i ? /* @__PURE__ */ y("div", { className: "reader-md-view-switch", role: "tablist", "aria-label": "显示原文还是译文", children: gt.map((c) => /* @__PURE__ */ y(
            "button",
            {
              type: "button",
              role: "tab",
              "aria-selected": f === c.value,
              className: f === c.value ? "is-active" : void 0,
              onClick: () => m(c.value),
              children: c.label
            },
            c.value
          )) }) : null,
          /* @__PURE__ */ _("label", { className: "reader-markdown-search", children: [
            /* @__PURE__ */ y(Se, { size: 13, "aria-hidden": !0 }),
            /* @__PURE__ */ y(
              "input",
              {
                type: "search",
                value: M,
                placeholder: "搜索正文",
                "aria-label": "搜索 Markdown 正文",
                onChange: (c) => {
                  b(c.target.value), T(c.target.value, !1);
                },
                onKeyDown: (c) => {
                  c.key !== "Enter" || D === 0 || (c.preventDefault(), S($ + (c.shiftKey ? -1 : 1)));
                }
              }
            ),
            M ? /* @__PURE__ */ y("span", { className: "reader-markdown-search-count", "aria-live": "polite", children: D > 0 ? `${$ + 1}/${D}` : "0/0" }) : null,
            /* @__PURE__ */ y(
              "button",
              {
                type: "button",
                "aria-label": "上一个搜索结果",
                disabled: D === 0,
                onClick: () => S($ - 1),
                children: /* @__PURE__ */ y(Ie, { size: 13, "aria-hidden": !0 })
              }
            ),
            /* @__PURE__ */ y(
              "button",
              {
                type: "button",
                "aria-label": "下一个搜索结果",
                disabled: D === 0,
                onClick: () => S($ + 1),
                children: /* @__PURE__ */ y(De, { size: 13, "aria-hidden": !0 })
              }
            )
          ] }),
          /* @__PURE__ */ _(
            "button",
            {
              type: "button",
              className: "reader-markdown-outline-toggle",
              "aria-expanded": E,
              disabled: u.length === 0,
              onClick: () => p((c) => !c),
              children: [
                /* @__PURE__ */ y(Re, { size: 13, "aria-hidden": !0 }),
                "目录",
                u.length > 0 ? ` ${u.length}` : ""
              ]
            }
          )
        ] }),
        E && u.length > 0 ? /* @__PURE__ */ y("nav", { className: "reader-markdown-outline", "aria-label": "Markdown 目录", children: u.map((c) => /* @__PURE__ */ y(
          "button",
          {
            type: "button",
            style: { "--reader-md-outline-level": c.level - 1 },
            onClick: () => {
              var g, L, N;
              const l = (g = s.current) == null ? void 0 : g.querySelector(`#${CSS.escape(c.id)}`);
              (L = l == null ? void 0 : l.scrollIntoView) == null || L.call(l, { block: "start", behavior: "smooth" });
              const h = (N = l == null ? void 0 : l.closest("[data-md-block]")) == null ? void 0 : N.dataset.mdBlock;
              h && (o == null || o(h));
            },
            children: c.text
          },
          c.id
        )) }) : null,
        /* @__PURE__ */ y(
          "article",
          {
            ref: s,
            id: "reader-markdown-content",
            className: "reader-markdown-content reader-float-markdown-content is-blocks"
          }
        )
      ]
    }
  );
}
function Nt(r) {
  const t = Fe(), e = t == null ? void 0 : t.regions, a = We(() => e ? Xe(e) : null, [e]);
  return a && a.length > 0 ? /* @__PURE__ */ y(
    bt,
    {
      open: r.open,
      blocks: a,
      side: r.side,
      regionHover: t == null ? void 0 : t.regionHover,
      jumpToBlock: t == null ? void 0 : t.jumpToBlock,
      onClose: r.onClose
    }
  ) : /* @__PURE__ */ y(kt, { ...r });
}
function kt({
  open: r,
  jobId: t,
  sourceOnly: e,
  side: a = "right",
  onClose: o
}) {
  var N, z;
  const n = q([]), s = q(""), i = q(() => {
  }), [f, m] = B(!1), [w, u] = B(""), [k, x] = B(0), [E, p] = B(-1), {
    contentRef: M,
    status: b,
    setStatus: H,
    outline: D,
    outlineComplete: R,
    setOutlineComplete: $,
    outlineCompleteRef: A,
    pendingResume: S,
    rebuildOutline: T,
    renderAllRef: c,
    pendingAnchorRef: l,
    resumeCleanupRef: h
  } = ft({
    open: r,
    jobId: t,
    sourceOnly: e,
    searchQueryRef: s,
    reapplySearchRef: i
  }), g = (d, v = !0) => {
    const U = n.current;
    if (U.forEach((j) => j.classList.remove("reader-markdown-search-hit-active")), U.length === 0) {
      p(-1);
      return;
    }
    const P = (d + U.length) % U.length, I = U[P];
    I.classList.add("reader-markdown-search-hit-active"), p(P), v && typeof I.scrollIntoView == "function" && I.scrollIntoView({ block: "center", behavior: "smooth" });
  }, L = (d, v = !1) => {
    var I;
    const U = `${d || ""}`.trim();
    if (c.current = U.length > 0, c.current && ((I = h.current) == null || I.call(h)), !M.current) return;
    const P = Ue(M.current, d);
    n.current = P, x(P.length), g(P.length > 0 ? 0 : -1, v);
  };
  return i.current = () => L(s.current), /* @__PURE__ */ _(
    Oe,
    {
      id: "reader-markdown-panel",
      open: r,
      ariaLabel: "Markdown 预览",
      className: `is-pane-${a}`,
      onClose: o,
      toolbar: /* @__PURE__ */ y("span", { className: "reader-notes-count", children: b || "已加载" }),
      children: [
        /* @__PURE__ */ _("div", { className: "reader-markdown-nav", "aria-label": "Markdown 导航与搜索", children: [
          /* @__PURE__ */ _("label", { className: "reader-markdown-search", children: [
            /* @__PURE__ */ y(Se, { size: 13, "aria-hidden": !0 }),
            /* @__PURE__ */ y(
              "input",
              {
                type: "search",
                value: w,
                placeholder: "搜索正文",
                "aria-label": "搜索 Markdown 正文",
                onChange: (d) => {
                  const v = d.target.value;
                  s.current = v, u(v), L(v, !1);
                },
                onKeyDown: (d) => {
                  d.key !== "Enter" || k === 0 || (d.preventDefault(), g(E + (d.shiftKey ? -1 : 1)));
                }
              }
            ),
            w ? /* @__PURE__ */ y("span", { className: "reader-markdown-search-count", "aria-live": "polite", children: k > 0 ? `${E + 1}/${k}` : "0/0" }) : null,
            /* @__PURE__ */ y(
              "button",
              {
                type: "button",
                "aria-label": "上一个搜索结果",
                disabled: k === 0,
                onClick: () => g(E - 1),
                children: /* @__PURE__ */ y(Ie, { size: 13, "aria-hidden": !0 })
              }
            ),
            /* @__PURE__ */ y(
              "button",
              {
                type: "button",
                "aria-label": "下一个搜索结果",
                disabled: k === 0,
                onClick: () => g(E + 1),
                children: /* @__PURE__ */ y(De, { size: 13, "aria-hidden": !0 })
              }
            )
          ] }),
          /* @__PURE__ */ _(
            "button",
            {
              type: "button",
              className: "reader-markdown-outline-toggle",
              "aria-expanded": f,
              disabled: D.length === 0,
              onClick: () => {
                T(), $(A.current), m((d) => !d);
              },
              children: [
                /* @__PURE__ */ y(Re, { size: 13, "aria-hidden": !0 }),
                "目录",
                D.length > 0 ? ` ${D.length}` : ""
              ]
            }
          ),
          S ? /* @__PURE__ */ y(
            "button",
            {
              type: "button",
              className: "reader-markdown-resume",
              onClick: () => {
                var d;
                return (d = h.current) == null ? void 0 : d.call(h);
              },
              children: "继续加载"
            }
          ) : null
        ] }),
        f && D.length > 0 ? /* @__PURE__ */ _("nav", { className: "reader-markdown-outline", "aria-label": "Markdown 目录", children: [
          R ? null : /* @__PURE__ */ y("p", { className: "reader-markdown-outline-note", children: "仅显示已加载内容，滚动可加载更多" }),
          D.map((d) => /* @__PURE__ */ y(
            "button",
            {
              type: "button",
              style: { "--reader-md-outline-level": d.level - 1 },
              onClick: () => {
                var U, P;
                const v = [...((U = M.current) == null ? void 0 : U.querySelectorAll("h1, h2, h3, h4, h5, h6")) || []].find((I) => I.id === d.id);
                if (v && typeof v.scrollIntoView == "function") {
                  v.scrollIntoView({ block: "start", behavior: "smooth" });
                  return;
                }
                l.current = d.id, c.current = !0, (P = h.current) == null || P.call(h), H("正在加载目标章节…");
              },
              children: d.text
            },
            d.id
          ))
        ] }) : null,
        b && !((z = (N = M.current) == null ? void 0 : N.childNodes) != null && z.length) ? /* @__PURE__ */ y("p", { className: "reader-notes-empty", children: b }) : null,
        /* @__PURE__ */ y(
          "article",
          {
            ref: M,
            id: "reader-markdown-content",
            className: "reader-markdown-content reader-float-markdown-content"
          }
        )
      ]
    }
  );
}
export {
  Nt as ReaderMarkdownPanel,
  ae as buildMarkdownOutline,
  Te as clearMarkdownSearchHighlights,
  Ue as findMarkdownSearchTargets,
  Ye as isProtectedMarkdownAssetUrl,
  ge as startMarkdownImageLoading
};
//# sourceMappingURL=ReaderMarkdownPanel-CLW0zDBY.js.map
