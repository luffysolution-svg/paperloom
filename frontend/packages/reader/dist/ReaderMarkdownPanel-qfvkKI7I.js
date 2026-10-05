import { jsxs as Z, jsx as E } from "react/jsx-runtime";
import { useRef as I, useState as z, useEffect as fe } from "react";
import { Search as Ue, ChevronUp as Ce, ChevronDown as Le, ListTree as Ne, FileCode2 as Re } from "lucide-react";
import { d as me, r as ue, e as we, b as Ie } from "./ReaderApp-BFnKNkdf.js";
import { e as ge, m as Oe, a as ke } from "./markdown-math-XkF5urpn.js";
import { n as Se } from "./markdown-payload-kK3ewW_I.js";
const be = "h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, pre";
function xe(t) {
  t.querySelectorAll(".reader-markdown-search-hit, .reader-markdown-search-hit-active").forEach((r) => {
    r.classList.remove("reader-markdown-search-hit", "reader-markdown-search-hit-active");
  });
}
function De(t, r) {
  xe(t);
  const n = r.trim().toLocaleLowerCase();
  if (!n) return [];
  const a = [...t.querySelectorAll(be)].filter((e) => [...e.children].some((d) => d.matches(be)) ? !1 : (e.textContent || "").toLocaleLowerCase().includes(n));
  return a.forEach((e) => e.classList.add("reader-markdown-search-hit")), a;
}
function He(t) {
  return t.normalize("NFKC").trim().toLocaleLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-+|-+$/g, "") || "section";
}
function ce(t, r = /* @__PURE__ */ new Map()) {
  return [...t.querySelectorAll("h1, h2, h3, h4, h5, h6")].flatMap((n) => {
    const s = (n.textContent || "").replace(/\s+/g, " ").trim();
    if (!s) return [];
    const a = He(s), e = (r.get(a) || 0) + 1;
    r.set(a, e);
    const d = e === 1 ? `reader-md-${a}` : `reader-md-${a}-${e}`;
    return n.id = d, [{ id: d, level: Number(n.tagName.slice(1)), text: s }];
  });
}
function Te(t, r = "http://localhost/") {
  var n;
  if (/^mock:\/\//i.test(t)) return !0;
  try {
    const s = ((n = globalThis.location) == null ? void 0 : n.href) || "http://localhost/", a = new URL(r, s), e = new URL(t, a);
    if (!/\/api\/v1\/jobs\/[^/]+\/markdown\/images\//.test(e.pathname)) return !1;
    if (!/^[a-z][a-z\d+.-]*:/i.test(t)) return !0;
    const d = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(e.hostname);
    return e.origin === a.origin || d;
  } catch {
    return !1;
  }
}
function $e(t, r) {
  if (/^data:image\//i.test(t) || /^blob:/i.test(t)) return !0;
  try {
    const n = new URL(t, r);
    return n.protocol === "http:" || n.protocol === "https:";
  } catch {
    return !1;
  }
}
function pe(t, r) {
  let n = !1, s = 0, a = 0, e = 0;
  const d = [], i = [], U = /* @__PURE__ */ new Set(), w = (o, A) => {
    const l = o.ownerDocument.createElement("span");
    l.className = "reader-markdown-image-missing", l.textContent = A, l.title = o.getAttribute("data-reader-md-src") || "", o.replaceWith(l);
  };
  for (const o of t) {
    const A = o.getAttribute("data-reader-md-src") || "", l = o.ownerDocument.baseURI || "http://localhost/";
    Te(A, r.protectedBaseUrl || l) ? i.push(o) : $e(A, l) ? o.src = A : w(o, "[图片地址不可用]");
  }
  const L = () => {
    var o;
    return (o = r.onProgress) == null ? void 0 : o.call(r, { failed: e, loaded: a, total: i.length });
  }, g = () => {
    if (!n)
      for (; s < 4 && d.length > 0; ) {
        const o = d.shift();
        if (!(o != null && o.isConnected)) continue;
        s += 1;
        const A = o.getAttribute("data-reader-md-src") || "";
        r.fetchImage(A, r.signal ? { signal: r.signal } : void 0).then(async (l) => {
          if (!(l != null && l.ok)) throw new Error(`HTTP ${(l == null ? void 0 : l.status) || 0}`);
          const x = URL.createObjectURL(await l.blob());
          if (n || !o.isConnected) {
            try {
              URL.revokeObjectURL(x);
            } catch {
            }
            return;
          }
          r.onObjectUrl(x), o.src = x, a += 1;
        }).catch(() => {
          n || !o.isConnected || (e += 1, w(o, "[图片暂不可用]"));
        }).finally(() => {
          s -= 1, n || (L(), g());
        });
      }
  }, N = (o) => {
    n || U.has(o) || (U.add(o), d.push(o), g());
  }, R = globalThis.IntersectionObserver;
  let b = null;
  return R && i.length > 0 ? (b = new R((o) => {
    o.forEach((A) => {
      if (!A.isIntersecting) return;
      const l = A.target;
      b == null || b.unobserve(l), N(l);
    });
  }, { root: r.root || null, rootMargin: "600px 0px" }), i.forEach((o) => b == null ? void 0 : b.observe(o))) : i.forEach(N), L(), () => {
    n = !0, d.length = 0, b == null || b.disconnect();
  };
}
let se = null;
function Me() {
  return se || (se = import("marked").catch((t) => {
    throw se = null, t;
  })), se;
}
function qe(t) {
  t.querySelectorAll("script, iframe, object, embed, style, link, meta, base, form, input, button, textarea, select").forEach((r) => r.remove()), t.querySelectorAll("*").forEach((r) => {
    for (const n of [...r.attributes])
      /^on/i.test(n.name) && r.removeAttribute(n.name);
  }), t.querySelectorAll("a[href]").forEach((r) => {
    const n = r;
    /^\s*javascript:/i.test(n.getAttribute("href") || "") && n.removeAttribute("href"), n.setAttribute("target", "_blank"), n.setAttribute("rel", "noopener noreferrer");
  });
}
function de(t, r, n, s = {}) {
  const a = t.ownerDocument.createElement("template");
  return a.innerHTML = r, qe(a.content), a.content.querySelectorAll("img[src]").forEach((e) => {
    var U;
    const d = e.getAttribute("src") || "", i = ((U = s.resolveAssetUrl) == null ? void 0 : U.call(s, n, d)) || d;
    e.setAttribute("data-reader-md-src", i), e.setAttribute("loading", "lazy"), e.setAttribute("decoding", "async"), e.removeAttribute("src");
  }), t.replaceChildren(a.content), t.classList.remove("hidden"), [...t.querySelectorAll("img[data-reader-md-src]")];
}
function ze(t, r) {
  let n = r;
  for (; n < t.length; ) {
    const s = t.indexOf(`
`, n), a = s === -1 ? t.length : s, e = t.slice(n, a).trim();
    if (e !== "") return e;
    if (s === -1) return null;
    n = s + 1;
  }
  return null;
}
const Be = /^\s{0,3}\[[^\]]+\]:/;
function ve(t) {
  const r = t.match(/^(?:([-*+])|(\d+)([.)]))\s+/);
  return r ? r[1] ? `ul:${r[1]}` : `ol:${r[3]}` : null;
}
function Pe(t, r, n) {
  const s = ze(t, r);
  if (!s) return !1;
  if (Be.test(s)) return !0;
  const a = n ? ve(n) : null, e = ve(s);
  return a != null && a === e;
}
function ye(t, { minChars: r = 16384 } = {}) {
  if (!t) return null;
  let n = "", s = null, a = 0;
  const e = t.length;
  for (; a < e; ) {
    const d = t.indexOf(`
`, a), i = d === -1 ? e : d, w = t.slice(a, i).trim(), L = w.match(/^(`{3,}|~{3,})/);
    if (L) {
      const g = L[1][0];
      n ? n === g && (n = "") : n = g;
    }
    if (!n && w === "") {
      const g = d === -1 ? e : d + 1;
      if (g >= r && !Pe(t, g, s))
        return { complete: t.slice(0, g), rest: t.slice(g) };
    } else w !== "" && (s = w);
    if (d === -1) break;
    a = d + 1;
  }
  return null;
}
function _e({
  open: t,
  jobId: r,
  sourceOnly: n,
  searchQueryRef: s,
  reapplySearchRef: a
}) {
  const e = I(null), [d, i] = z("尚未加载"), U = I([]), w = I(null), L = I(/* @__PURE__ */ new Map()), g = I([]), N = I(null), R = I(!1), b = I(!1), o = I(null), [A, l] = z([]), [x, B] = z(!1), [P, V] = z(!1), Q = () => {
    for (const c of U.current)
      try {
        URL.revokeObjectURL(c);
      } catch {
      }
    U.current = [];
  }, X = () => {
    var c, C;
    (c = w.current) == null || c.call(w), w.current = null;
    for (const f of g.current) f();
    g.current = [], (C = N.current) == null || C.call(N), N.current = null, Q();
  }, ee = () => {
    const c = e.current;
    c && (L.current = /* @__PURE__ */ new Map(), l(ce(c, L.current)));
  }, te = () => {
    const c = o.current, C = e.current;
    if (!c || !C) return;
    const f = [...C.querySelectorAll("h1, h2, h3, h4, h5, h6")].find(($) => $.id === c);
    f && (o.current = null, typeof f.scrollIntoView == "function" && f.scrollIntoView({ block: "start", behavior: "smooth" }));
  };
  return fe(() => () => {
    var c;
    (c = w.current) == null || c.call(w), Q();
  }, []), fe(() => {
    if (!t) {
      X(), l([]), b.current = !1, B(!1);
      return;
    }
    let c = !1;
    X(), L.current = /* @__PURE__ */ new Map(), b.current = !1, B(!1), l([]), R.current = !1, o.current = null, V(!1);
    const C = new AbortController(), f = me;
    async function $() {
      var k, u, M, v, m, y;
      const S = r.startsWith("doc:");
      if (!r || S) {
        i(!r && n ? "源文档阅读不提供 Markdown 产物" : "该任务暂无 Markdown 产物"), e.current && (e.current.replaceChildren(), e.current.classList.add("hidden"));
        return;
      }
      i("正在加载 Markdown…"), (k = e.current) == null || k.replaceChildren(), (u = e.current) == null || u.classList.add("hidden");
      try {
        if (typeof (f == null ? void 0 : f.loadMarkdownSource) == "function" && typeof (f == null ? void 0 : f.loadMarkdownRange) == "function") {
          const p = await f.loadMarkdownSource(r, C.signal);
          if (c) return;
          if (p != null && p.rawUrl) {
            await re(p);
            return;
          }
        }
      } catch {
      }
      try {
        const p = await me.loadMarkdownPayload(r);
        if (c) return;
        const { content: D, imagesBaseUrl: _ } = Se(p);
        if (!D.trim()) {
          i("该任务暂无 Markdown 产物"), (M = e.current) == null || M.replaceChildren(), (v = e.current) == null || v.classList.add("hidden");
          return;
        }
        const { marked: O } = await Me();
        if (c || !e.current) return;
        const { text: q, slots: F } = ge(D, { bareLatex: !0 }), G = String(O.parse(q, { async: !1 })), J = Oe(G, F);
        de(e.current, J, _, {
          resolveAssetUrl: ue
        }), l(ce(e.current)), (m = a.current) == null || m.call(a), i(F.length > 0 ? `正文已显示 · 正在渲染 ${F.length} 个公式…` : "");
        const ne = F.length > 0 ? await ke(G, F) : G;
        if (c || !e.current) return;
        const ae = de(e.current, ne, _, {
          resolveAssetUrl: ue
        });
        l(ce(e.current)), b.current = !0, B(!0), (y = a.current) == null || y.call(a), i("");
        const le = e.current.closest(".reader-notes-panel-body");
        w.current = pe(ae, {
          root: le,
          protectedBaseUrl: _ || e.current.ownerDocument.baseURI,
          fetchImage: we,
          signal: C.signal,
          onObjectUrl: (j) => U.current.push(j),
          onProgress: ({ failed: j }) => {
            !c && j > 0 && i(`正文已加载 · ${j} 张图片不可用`);
          }
        });
      } catch (p) {
        if (c) return;
        i(p instanceof Error ? p.message : "Markdown 加载失败");
      }
    }
    async function re(S) {
      var j;
      const k = e.current;
      if (!k) return;
      const u = 262144, M = 8192, v = `${S.imagesBaseUrl || ""}`, m = k.closest(".reader-notes-panel-body");
      let y = new TextDecoder(), p = 0, D = `${S.etag || ""}`, _ = Number.isFinite(Number(S.totalBytes)) ? Number(S.totalBytes) : null, O = "", q = !1;
      const F = 4, G = 4e3;
      let J = 0;
      const ne = () => {
        for (const h of g.current) h();
        g.current = [], Q(), L.current = /* @__PURE__ */ new Map(), l([]);
      }, ae = async (h) => {
        const { marked: H } = await Me();
        if (c || !e.current) return;
        const { text: T, slots: K } = ge(h, { bareLatex: !0 }), Y = String(H.parse(T, { async: !1 })), ie = K.length > 0 ? await ke(Y, K) : Y;
        if (c || !e.current) return;
        const oe = k.ownerDocument.createElement("section");
        oe.className = "reader-markdown-chunk";
        const Ae = de(oe, ie, v, {
          resolveAssetUrl: ue
        });
        k.appendChild(oe), k.classList.remove("hidden");
        const he = ce(oe, L.current);
        he.length && l((W) => [...W, ...he]), te();
        const Ee = pe(Ae, {
          root: m,
          protectedBaseUrl: v || k.ownerDocument.baseURI,
          fetchImage: we,
          signal: C.signal,
          onObjectUrl: (W) => U.current.push(W),
          onProgress: ({ failed: W }) => {
            !c && W > 0 && i(`正文已加载 · ${W} 张图片不可用`);
          }
        });
        g.current.push(Ee);
      }, le = async () => {
        R.current || !m || c || k.scrollHeight <= m.clientHeight * 2 || (V(!0), i("已加载部分 · 滚动或点击继续加载"), await new Promise((h) => {
          let H = !1, T = null;
          const K = (ie) => {
            H || (H = !0, m.removeEventListener("scroll", Y), T && (clearTimeout(T), T = null), N.current = null, c || (V(!1), ie && (J = 0)), h());
          }, Y = () => {
            (k.scrollHeight <= m.clientHeight * 2 || m.scrollTop + m.clientHeight >= k.scrollHeight - 800) && K(!0);
          };
          N.current = () => K(!0), m.addEventListener("scroll", Y, { passive: !0 }), J < F && (J += 1, T = setTimeout(() => K(!1), G));
        }));
      };
      try {
        for (; !q && !c; ) {
          const h = await f.loadMarkdownRange(
            S.rawUrl,
            p,
            p + u - 1,
            D || void 0,
            C.signal
          );
          if (c) return;
          if (h.status === 404) {
            i("该任务暂无 Markdown 产物"), k.replaceChildren(), k.classList.add("hidden");
            return;
          }
          if (h.status === 200)
            k.replaceChildren(), ne(), y = new TextDecoder(), O = y.decode(h.bytes, { stream: !1 }), q = !0;
          else if (h.status === 206) {
            if (D && h.etag && h.etag !== D) {
              k.replaceChildren(), ne(), y = new TextDecoder(), O = "", p = 0, q = !1, D = h.etag;
              continue;
            }
            !D && h.etag && (D = h.etag), h.totalBytes != null && (_ = h.totalBytes);
            const T = h.rangeEnd != null ? h.rangeEnd + 1 : p + h.bytes.length;
            q = _ != null ? T >= _ : h.bytes.length < u, O += y.decode(h.bytes, { stream: !q }), p = T;
          } else
            throw new Error(`读取 Markdown 失败，请稍后重试。(${h.status})`);
          let H = ye(O, { minChars: M });
          for (; H && !c; ) {
            if (O = H.rest, await ae(H.complete), c) return;
            await le(), H = ye(O, { minChars: M });
          }
          q && O.trim() && (await ae(O), O = "");
        }
        c || (ee(), b.current = !0, B(!0), te(), i(""), s.current.trim() && ((j = a.current) == null || j.call(a)));
      } catch (h) {
        if (c || C.signal.aborted) return;
        i(h instanceof Error ? h.message : "Markdown 加载失败");
      }
    }
    return $(), () => {
      c = !0, C.abort(), X();
    };
  }, [t, r, n]), {
    contentRef: e,
    status: d,
    setStatus: i,
    outline: A,
    setOutline: l,
    outlineComplete: x,
    setOutlineComplete: B,
    outlineCompleteRef: b,
    pendingResume: P,
    rebuildOutline: ee,
    renderAllRef: R,
    pendingAnchorRef: o,
    resumeCleanupRef: N
  };
}
function Xe({
  open: t,
  jobId: r,
  sourceOnly: n,
  layout: s = "floating",
  side: a = "right",
  onClose: e
}) {
  var S, k;
  const d = I([]), i = I(""), U = I(() => {
  }), [w, L] = z(!1), [g, N] = z(""), [R, b] = z(0), [o, A] = z(-1), {
    contentRef: l,
    status: x,
    setStatus: B,
    outline: P,
    outlineComplete: V,
    setOutlineComplete: Q,
    outlineCompleteRef: X,
    pendingResume: ee,
    rebuildOutline: te,
    renderAllRef: c,
    pendingAnchorRef: C,
    resumeCleanupRef: f
  } = _e({
    open: t,
    jobId: r,
    sourceOnly: n,
    searchQueryRef: i,
    reapplySearchRef: U
  }), $ = (u, M = !0) => {
    const v = d.current;
    if (v.forEach((p) => p.classList.remove("reader-markdown-search-hit-active")), v.length === 0) {
      A(-1);
      return;
    }
    const m = (u + v.length) % v.length, y = v[m];
    y.classList.add("reader-markdown-search-hit-active"), A(m), M && typeof y.scrollIntoView == "function" && y.scrollIntoView({ block: "center", behavior: "smooth" });
  }, re = (u, M = !1) => {
    var y;
    const v = `${u || ""}`.trim();
    if (c.current = v.length > 0, c.current && ((y = f.current) == null || y.call(f)), !l.current) return;
    const m = De(l.current, u);
    d.current = m, b(m.length), $(m.length > 0 ? 0 : -1, M);
  };
  return U.current = () => re(i.current), /* @__PURE__ */ Z(
    Ie,
    {
      id: "reader-markdown-panel",
      open: t,
      title: "Markdown",
      subtitle: s === "docked" ? "识别与翻译产出 · PDF / Markdown 分栏" : "识别与翻译产出 · 拖动可移动",
      titleIcon: /* @__PURE__ */ E(Re, { size: 14, strokeWidth: 2.25, "aria-hidden": !0 }),
      storageKey: "retainpdf.reader.markdown-float.pos.v1",
      ariaLabel: "Markdown 预览",
      width: 420,
      placement: s === "workspace" ? "workspace" : s === "docked" ? "dock-right" : "floating",
      showHeader: s !== "workspace",
      className: s === "workspace" ? `is-pane-${a}` : void 0,
      onClose: e,
      toolbar: /* @__PURE__ */ E("span", { className: "reader-notes-count", children: x || "已加载" }),
      children: [
        /* @__PURE__ */ Z("div", { className: "reader-markdown-nav", "aria-label": "Markdown 导航与搜索", children: [
          /* @__PURE__ */ Z("label", { className: "reader-markdown-search", children: [
            /* @__PURE__ */ E(Ue, { size: 13, "aria-hidden": !0 }),
            /* @__PURE__ */ E(
              "input",
              {
                type: "search",
                value: g,
                placeholder: "搜索正文",
                "aria-label": "搜索 Markdown 正文",
                onChange: (u) => {
                  const M = u.target.value;
                  i.current = M, N(M), re(M, !1);
                },
                onKeyDown: (u) => {
                  u.key !== "Enter" || R === 0 || (u.preventDefault(), $(o + (u.shiftKey ? -1 : 1)));
                }
              }
            ),
            g ? /* @__PURE__ */ E("span", { className: "reader-markdown-search-count", "aria-live": "polite", children: R > 0 ? `${o + 1}/${R}` : "0/0" }) : null,
            /* @__PURE__ */ E(
              "button",
              {
                type: "button",
                "aria-label": "上一个搜索结果",
                disabled: R === 0,
                onClick: () => $(o - 1),
                children: /* @__PURE__ */ E(Ce, { size: 13, "aria-hidden": !0 })
              }
            ),
            /* @__PURE__ */ E(
              "button",
              {
                type: "button",
                "aria-label": "下一个搜索结果",
                disabled: R === 0,
                onClick: () => $(o + 1),
                children: /* @__PURE__ */ E(Le, { size: 13, "aria-hidden": !0 })
              }
            )
          ] }),
          /* @__PURE__ */ Z(
            "button",
            {
              type: "button",
              className: "reader-markdown-outline-toggle",
              "aria-expanded": w,
              disabled: P.length === 0,
              onClick: () => {
                te(), Q(X.current), L((u) => !u);
              },
              children: [
                /* @__PURE__ */ E(Ne, { size: 13, "aria-hidden": !0 }),
                "目录",
                P.length > 0 ? ` ${P.length}` : ""
              ]
            }
          ),
          ee ? /* @__PURE__ */ E(
            "button",
            {
              type: "button",
              className: "reader-markdown-resume",
              onClick: () => {
                var u;
                return (u = f.current) == null ? void 0 : u.call(f);
              },
              children: "继续加载"
            }
          ) : null
        ] }),
        w && P.length > 0 ? /* @__PURE__ */ Z("nav", { className: "reader-markdown-outline", "aria-label": "Markdown 目录", children: [
          V ? null : /* @__PURE__ */ E("p", { className: "reader-markdown-outline-note", children: "仅显示已加载内容，滚动可加载更多" }),
          P.map((u) => /* @__PURE__ */ E(
            "button",
            {
              type: "button",
              style: { "--reader-md-outline-level": u.level - 1 },
              onClick: () => {
                var v, m;
                const M = [...((v = l.current) == null ? void 0 : v.querySelectorAll("h1, h2, h3, h4, h5, h6")) || []].find((y) => y.id === u.id);
                if (M && typeof M.scrollIntoView == "function") {
                  M.scrollIntoView({ block: "start", behavior: "smooth" });
                  return;
                }
                C.current = u.id, c.current = !0, (m = f.current) == null || m.call(f), B("正在加载目标章节…");
              },
              children: u.text
            },
            u.id
          ))
        ] }) : null,
        x && !((k = (S = l.current) == null ? void 0 : S.childNodes) != null && k.length) ? /* @__PURE__ */ E("p", { className: "reader-notes-empty", children: x }) : null,
        /* @__PURE__ */ E(
          "article",
          {
            ref: l,
            id: "reader-markdown-content",
            className: "reader-markdown-content reader-float-markdown-content"
          }
        )
      ]
    }
  );
}
export {
  Xe as ReaderMarkdownPanel,
  ce as buildMarkdownOutline,
  xe as clearMarkdownSearchHighlights,
  De as findMarkdownSearchTargets,
  Te as isProtectedMarkdownAssetUrl,
  pe as startMarkdownImageLoading
};
//# sourceMappingURL=ReaderMarkdownPanel-qfvkKI7I.js.map
