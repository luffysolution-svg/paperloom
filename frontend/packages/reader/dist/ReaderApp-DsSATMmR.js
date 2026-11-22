var rr = (e) => {
  throw TypeError(e);
};
var or = (e, t, n) => t.has(e) || rr("Cannot " + n);
var yt = (e, t, n) => (or(e, t, "read from private field"), n ? n.call(e) : t.get(e)), ar = (e, t, n) => t.has(e) ? rr("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, n), sr = (e, t, n, r) => (or(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n);
import { jsxs as L, jsx as p, Fragment as $e } from "react/jsx-runtime";
import { useMemo as q, useState as N, useEffect as D, useCallback as $, useRef as A, useLayoutEffect as Ee, memo as Xt, createContext as Ln, useContext as Cn, forwardRef as ro, useImperativeHandle as xn, useSyncExternalStore as oo, useId as ao, Suspense as ma, lazy as ha } from "react";
import { requireAdapter as gt, getReaderAdapters as Ne } from "./adapters.js";
import { resolveReaderDownloadName as pa, resolveReaderDownloadUrls as ga, READER_PROGRESS_COPY as Ce, trimString as Wt, READER_DOWNLOAD_ACTIONS as ba, disabledReason as ya } from "./runtime/state.js";
import { r as va, b as wa } from "./page-config-Ct7qR5rm.js";
import { documentSourcePdfPath as pn, isFinishedJobStatus as Pt } from "@retainpdf/domain/job";
import { n as so, d as Sa, f as nn, k as ir, b as Ia, c as Ra, j as Lt, p as Dn, g as gn, l as lr, i as Ea } from "./reader-regions-B6o2DsPy.js";
import { fetchDocumentReading as Pa } from "@retainpdf/api/documents";
import { isReaderTransportError as Ta, createReaderTransportError as ka } from "./contracts.js";
import { toast as bn, Toaster as Na } from "sonner";
import { X as bt, PenLine as zn, Check as io, Copy as Ma, ChevronUp as Aa, ChevronDown as lo, History as _a, LoaderCircle as La, Pin as Ca, LogOut as xa, Radio as Da, FileText as co, Columns2 as uo, Languages as fo, Keyboard as za, Download as Oa, ListOrdered as $a, TriangleAlert as Fa, ListTree as ja, Search as Ba, GitCompareArrows as Ua, LayoutGrid as Ha, Highlighter as Wa, Eraser as Va, Undo2 as Ka, Trash2 as Ja } from "lucide-react";
import { Button as re, Textarea as qa, IconButton as cr, Input as mo } from "@retainpdf/ui";
import { pdfjs as ho, Page as Ga, Document as Za } from "react-pdf";
import { e as Ya, m as Xa, a as Qa } from "./markdown-math-DN_X3M3x.js";
const es = (...e) => {
  var t, n;
  return ((n = (t = Ne()) == null ? void 0 : t.isMockMode) == null ? void 0 : n.call(t, ...e)) ?? !1;
}, ts = "", ns = Object.freeze({
  progress: "retainpdf-reader-progress"
}), rs = (e) => {
  var t, n;
  return ((n = (t = Ne()) == null ? void 0 : t.resolveResourceUrl) == null ? void 0 : n.call(t, e)) ?? e;
}, os = (...e) => {
  var n;
  return (((n = Ne()) == null ? void 0 : n.fetchProtected) ?? fetch)(...e);
}, xe = () => gt("defaultReaderDataPort"), dr = () => gt("defaultReaderPageConfigPort"), Ff = {
  get apiPrefix() {
    return xe().apiPrefix;
  },
  fetchProtected: (...e) => xe().fetchProtected(...e),
  loadMarkdownPayload: (e) => xe().loadMarkdownPayload(e),
  loadMarkdownSource: (e) => xe().loadMarkdownSource(e),
  loadMarkdownRange: (e, t, n, r, o) => xe().loadMarkdownRange(e, t, n, r, o),
  loadJobPayload: (e) => xe().loadJobPayload(e),
  loadReaderPayload: (e, t) => xe().loadReaderPayload(e, t),
  loadReaderOptionalArtifacts: (e) => xe().loadReaderOptionalArtifacts(e),
  get liveTranslation() {
    return xe().liveTranslation;
  }
}, po = {
  messageTargetOrigin: () => dr().messageTargetOrigin(),
  readerJobId: () => dr().readerJobId()
}, as = () => {
  var e;
  return ((e = Ne()) == null ? void 0 : e.liveTranslation) ?? null;
}, Tt = () => {
  var t;
  const e = Ne();
  return (e == null ? void 0 : e.pdf) ?? {
    fetchProtected: (e == null ? void 0 : e.fetchProtected) ?? ((t = e == null ? void 0 : e.defaultReaderDataPort) == null ? void 0 : t.fetchProtected) ?? fetch,
    resolvePdfjsVendorUrl: (n = "") => {
      var r;
      return ((r = e == null ? void 0 : e.resolvePdfjsVendorUrl) == null ? void 0 : r.call(e, n)) ?? "";
    }
  };
}, Ze = () => {
  const e = Ne();
  if (e != null && e.sessionData) return e.sessionData;
  const t = e == null ? void 0 : e.defaultReaderDataPort;
  if (!t) throw new Error("Reader adapter missing: defaultReaderDataPort (call setReaderAdapters)");
  return {
    loadReaderPayload: t.loadReaderPayload,
    // 旧宿主 / 测试替身可能没有这个方法：缺了就是 undefined，session 照旧一并加载。
    loadReaderOptionalArtifacts: t.loadReaderOptionalArtifacts,
    loadJobPayload: t.loadJobPayload,
    fetchDocumentByJobId: (...n) => gt("fetchDocumentByJobId")(...n),
    fetchProtected: t.fetchProtected,
    resolveResourceUrl: e.resolveResourceUrl ?? ((n) => n),
    resolveReaderSourcePdf: (n) => {
      var r;
      return ((r = e.resolveReaderSourcePdf) == null ? void 0 : r.call(e, n)) ?? null;
    },
    resolveReaderTranslatedPdfUrl: (n, r) => {
      var o;
      return ((o = e.resolveReaderTranslatedPdfUrl) == null ? void 0 : o.call(e, n, r)) ?? "";
    },
    resolveReaderArtifactUrl: (n) => {
      var r;
      return ((r = e.resolveReaderArtifactUrl) == null ? void 0 : r.call(e, n)) ?? "";
    }
  };
}, ss = (...e) => {
  var t, n;
  return ((n = (t = Ne()) == null ? void 0 : t.resolveReaderAnchor) == null ? void 0 : n.call(t, ...e)) ?? null;
}, is = () => {
  var e, t;
  return ((t = (e = Ne()) == null ? void 0 : e.resolveReaderDocumentId) == null ? void 0 : t.call(e)) ?? "";
}, ls = (...e) => {
  var t, n;
  return ((n = (t = Ne()) == null ? void 0 : t.resolveReaderJobId) == null ? void 0 : n.call(t, ...e)) ?? "";
}, cs = (...e) => {
  var t, n;
  return ((n = (t = Ne()) == null ? void 0 : t.resolveReaderDownloadName) == null ? void 0 : n.call(t, ...e)) ?? pa(...e);
}, ds = (...e) => {
  var t, n;
  return ((n = (t = Ne()) == null ? void 0 : t.resolveReaderDownloadUrls) == null ? void 0 : n.call(t, ...e)) ?? ga(...e);
}, us = (...e) => gt("downloadProtectedResource")(...e), fs = (...e) => gt("failDownloadToast")(...e), ms = (e, t) => gt("resolveMarkdownAssetUrl")(e, t), ur = "/api/v1";
function hs() {
  const e = () => {
    var r;
    return va(
      ((r = globalThis.location) == null ? void 0 : r.search) || ""
    );
  }, [t, n] = N(e);
  return D(() => {
    var i, l, c, d;
    const r = () => n(e()), o = (l = (i = globalThis.history) == null ? void 0 : i.pushState) == null ? void 0 : l.bind(globalThis.history), a = (d = (c = globalThis.history) == null ? void 0 : c.replaceState) == null ? void 0 : d.bind(globalThis.history);
    let s = !1;
    if (o && a)
      try {
        const f = (u) => function(...m) {
          const v = u.apply(this, m);
          return r(), globalThis.dispatchEvent(new Event("pushstate")), globalThis.dispatchEvent(new Event("replacestate")), globalThis.dispatchEvent(new Event("locationchange")), v;
        };
        globalThis.history.pushState = f(o), globalThis.history.replaceState = f(a), s = !0;
      } catch {
      }
    return window.addEventListener("popstate", r), window.addEventListener("hashchange", r), window.addEventListener("pushstate", r), window.addEventListener("replacestate", r), window.addEventListener("locationchange", r), () => {
      if (window.removeEventListener("popstate", r), window.removeEventListener("hashchange", r), window.removeEventListener("pushstate", r), window.removeEventListener("replacestate", r), window.removeEventListener("locationchange", r), s && o && a)
        try {
          globalThis.history.pushState = o, globalThis.history.replaceState = a;
        } catch {
        }
    };
  }, []), t;
}
function ps() {
  const e = hs(), t = q(() => ls(po), [e]), n = q(() => is(), [e]), r = t || n ? `job:${t}|document:${n}` : `location:${e}`;
  return { locationKey: e, jobId: t, routeDocumentId: n, sessionIdentity: r };
}
function gs(e) {
  const {
    routeDocumentId: t,
    jobId: n,
    sessionIdentity: r,
    sessionIdentityRef: o,
    documentIdRef: a,
    sessionJobIdRef: s,
    switchToSourceMode: i
  } = e, [l, c] = N({
    documentId: "",
    jobId: ""
  }), [d, f] = N({
    documentId: "",
    jobId: ""
  }), u = l.documentId === t ? l.jobId : "", m = d.documentId === t ? d.jobId : "", v = n || u, [h, y] = N({
    jobId: "",
    documentId: ""
  }), w = h.jobId === v ? h.documentId : "", g = t || w, S = !!t && !v, [b, I] = N(null), R = (b == null ? void 0 : b.sessionIdentity) === r && b.documentId === g ? b : null, T = S || !!R, O = $((j) => {
    const E = `${j.documentId || ""}`.trim();
    if (!E || a.current && a.current !== E) return;
    if (!a.current && s.current)
      y({
        jobId: s.current,
        documentId: E
      });
    else if (!a.current)
      return;
    const P = `${j.revision || ""}`.trim() || `${Date.now()}`;
    I({
      documentId: E,
      revision: P,
      sessionIdentity: o.current
    }), i();
  }, []);
  D(() => {
    I((j) => j && j.sessionIdentity !== r ? null : j);
  }, [r]);
  const C = $((j) => {
    switch (j.type) {
      case "resolved-document-job":
        c({ documentId: j.documentId, jobId: j.jobId });
        break;
      case "cleared-resolved-document-job":
        c({ documentId: "", jobId: "" });
        break;
      case "missing-document-job":
        f({ documentId: j.documentId, jobId: j.jobId });
        break;
      case "resolved-job-document":
        y((E) => E.jobId === j.jobId && E.documentId === j.documentId ? E : { jobId: j.jobId, documentId: j.documentId });
        break;
      case "committed-source":
        I({
          documentId: j.documentId,
          revision: j.revision,
          sessionIdentity: j.sessionIdentity
        });
        break;
    }
  }, []);
  return {
    resolvedDocumentJob: l,
    setResolvedDocumentJob: c,
    missingDocumentJob: d,
    setMissingDocumentJob: f,
    documentJobId: u,
    rejectedDocumentJobId: m,
    sessionJobId: v,
    resolvedJobDocument: h,
    setResolvedJobDocument: y,
    jobDocumentId: w,
    documentId: g,
    sourceOnly: S,
    committedDocumentSource: b,
    setCommittedDocumentSource: I,
    activeCommittedDocumentSource: R,
    sourceViewOnly: T,
    refreshCommittedDocument: O,
    applyIdentityEvent: C
  };
}
function fr(e) {
  return `${(e == null ? void 0 : e.status) || ""}`.trim().toLowerCase();
}
function bs(e) {
  var r, o, a, s;
  if (!e || typeof e != "object") return "";
  const t = e, n = [
    t.document_id,
    t.documentId,
    (r = t.document) == null ? void 0 : r.document_id,
    (o = t.book_summary) == null ? void 0 : o.document_id,
    (s = (a = t.request_payload) == null ? void 0 : a.source) == null ? void 0 : s.document_id
  ];
  for (const i of n) {
    const l = `${i || ""}`.trim();
    if (l) return l;
  }
  return "";
}
function mr(e, t) {
  return rs(pn(e, t));
}
function ys(e, t = "") {
  const n = `${e || ""}`.trim(), r = `${t || ""}`.trim();
  return !!(!n || r && (n === r || n === `${r}.pdf`) || /^\d{8,14}-[0-9a-f]{4,}$/i.test(n));
}
function vs(e, t) {
  var r;
  const n = [
    e == null ? void 0 : e.title,
    e == null ? void 0 : e.display_name,
    e == null ? void 0 : e.source_file_name,
    (r = e == null ? void 0 : e.book_summary) == null ? void 0 : r.source_file_name
  ];
  for (const o of n) {
    const a = `${o || ""}`.trim();
    if (a && !ys(a, t))
      return a.replace(/\.pdf$/i, "");
  }
  return "";
}
function yn({
  percent: e,
  text: t,
  stage: n
}) {
  var r;
  try {
    (r = window.parent) == null || r.postMessage(
      {
        type: ns.progress,
        stage: n,
        percent: e,
        text: t
      },
      po.messageTargetOrigin()
    );
  } catch {
  }
}
function Vt(e, t, n, r = "progress") {
  e({
    loading: !0,
    percent: t,
    text: n,
    stage: r,
    failed: !1
  }), yn({ percent: t, text: n, stage: r });
}
function ws(e) {
  const {
    sessionJobId: t,
    sessionIdentity: n,
    sessionIdentityRef: r,
    sessionJobIdRef: o,
    sessionEpochRef: a,
    closingRef: s
  } = e, [i, l] = N(null), [c, d] = N(null), [f, u] = N(""), [m, v] = N(0), h = f === n ? i : null, y = f === n ? c : null, w = fr(h), g = Pt(w), S = $(() => {
    v((C) => C + 1);
  }, []), b = $((C) => {
    l(C.jobPayload), d(C.manifestPayload), u(C.sessionIdentity);
  }, []), I = $((C) => {
    l(null), d(null), u(C);
  }, []), R = A(""), T = A(""), O = $(async () => {
    const C = o.current;
    if (!C || R.current === C) return;
    const j = Ze().loadJobPayload;
    if (typeof j != "function") return;
    const E = a.current.value;
    R.current = C;
    try {
      const P = await j(C);
      if (s.current || a.current.value !== E || o.current !== C || !P || typeof P != "object")
        return;
      const k = fr(P);
      l(P), u(r.current), !Pt(k) && T.current === C && (T.current = ""), k === "succeeded" && T.current !== C && (T.current = C, v((M) => M + 1));
    } catch {
    } finally {
      R.current === C && (R.current = "");
    }
  }, []);
  return D(() => {
    T.current = "";
  }, [n]), D(() => {
    if (!t || g || !h) return;
    const C = window.setInterval(() => {
      document.visibilityState !== "hidden" && O();
    }, 1e3);
    return () => window.clearInterval(C);
  }, [g, O, h, t]), {
    jobPayload: i,
    setJobPayload: l,
    manifestPayload: c,
    setManifestPayload: d,
    payloadSessionIdentity: f,
    setPayloadSessionIdentity: u,
    scopedJobPayload: h,
    scopedManifestPayload: y,
    jobStatus: w,
    jobTerminal: g,
    jobRefreshRevision: m,
    refreshJobArtifacts: S,
    refreshJobStatus: O,
    publishPayload: b,
    clearPayload: I
  };
}
function vn(e) {
  document.body.classList.remove(
    "reader-mode-source",
    "reader-mode-translated",
    "reader-mode-compare"
  ), document.body.classList.add(`reader-mode-${e}`);
}
function Ss(e, t) {
  e(t), vn(t);
}
function Is(e) {
  const [t, n] = N(e ? "source" : "compare"), r = $((a) => {
    e && a !== "source" || (n(a), vn(a));
  }, [e]), o = $((a) => {
    Ss(n, a);
  }, []);
  return D(() => (e && document.documentElement.classList.add("reader-source-only"), vn(t), () => {
    document.documentElement.classList.remove("reader-source-only");
  }), [e, t]), { mode: t, setMode: r, setModeState: n, switchSessionMode: o };
}
function hr(e) {
  return typeof e == "string" ? e.trim() : `${e ?? ""}`.trim();
}
function Rs(e) {
  const t = (e == null ? void 0 : e.data) ?? e, n = t && typeof t == "object" ? t : {};
  return {
    activeJobId: hr(n.active_job_id),
    activeVersionId: hr(n.active_version_id)
  };
}
function Es(e) {
  const { link: t, rejectedDocumentJobId: n, hasCommittedSource: r } = e, o = t.activeJobId && t.activeJobId !== n && !t.activeJobId.startsWith("doc:") ? t.activeJobId : "";
  return o ? { kind: "follow-active-job", jobId: o, activeVersionId: t.activeVersionId } : t.activeVersionId && !r ? { kind: "open-committed-source", documentId: "", revision: t.activeVersionId } : { kind: "open-source-url" };
}
function Ps(e) {
  const {
    payloadDocumentId: t,
    linkedActiveJobId: n,
    linkedActiveVersionId: r,
    sessionJobId: o,
    hasCommittedSource: a
  } = e;
  return t && r && n === o && !a ? { kind: "restore-committed-source", documentId: t, revision: r } : { kind: "open-job-artifacts" };
}
function Ts(e) {
  return e.status === 404 && e.reason !== "not_ready" && !e.jobId && !!e.routeDocumentId && !!e.documentJobId && e.sessionJobId === e.documentJobId;
}
const ks = /^merged-([0-9a-f]{64})-[0-9a-f]+$/;
function Ns(e) {
  var t;
  return e.status !== 404 || e.reason !== "merged_reading_expired" ? "" : ((t = ks.exec(`${e.sessionJobId || ""}`.trim())) == null ? void 0 : t[1]) || "";
}
const Ms = 48 * 1024 * 1024;
function As(e) {
  return e ? "ranged" in e ? e : { data: e.data.slice() } : null;
}
const _s = 2, Re = /* @__PURE__ */ new Map();
function wn(e, t) {
  Re.delete(e), Re.set(e, t);
}
function pr(e) {
  if (Re.size < _s) return;
  const t = Re.keys().next().value;
  t && Re.delete(t);
}
async function Ls(e) {
  var t, n;
  if (typeof e.json != "function") return "";
  try {
    const r = await e.json(), o = (n = (t = r == null ? void 0 : r.error) == null ? void 0 : t.details) == null ? void 0 : n.reason;
    return typeof o == "string" ? o.trim() : "";
  } catch {
    return "";
  }
}
async function go(e, t = Tt().fetchProtected, n = {}) {
  var d, f, u, m, v, h, y, w, g;
  const r = `${e || ""}`.trim();
  if (!r)
    return null;
  if (Re.has(r)) {
    const S = Re.get(r);
    return wn(r, S), S;
  }
  const o = new AbortController(), a = () => o.abort();
  (d = n.signal) != null && d.aborted && o.abort(), (u = (f = n.signal) == null ? void 0 : f.addEventListener) == null || u.call(f, "abort", a, { once: !0 });
  let s;
  try {
    s = await t(r, { signal: o.signal });
  } finally {
    (v = (m = n.signal) == null ? void 0 : m.removeEventListener) == null || v.call(m, "abort", a);
  }
  if (!s.ok) {
    const S = new Error(`读取 PDF 失败 (${s.status})`);
    S.status = s.status;
    const b = await Ls(s);
    throw b && (S.reason = b), S;
  }
  const i = Cs(r, s, t);
  if (i) {
    o.abort();
    const S = { ranged: i };
    return pr(), Re.set(r, S), S;
  }
  (y = (h = n.signal) == null ? void 0 : h.addEventListener) == null || y.call(h, "abort", a, { once: !0 });
  let l;
  try {
    l = await s.arrayBuffer();
  } finally {
    (g = (w = n.signal) == null ? void 0 : w.removeEventListener) == null || g.call(w, "abort", a);
  }
  const c = { data: new Uint8Array(l) };
  return Re.has(r) ? wn(r, c) : (pr(), Re.set(r, c)), c;
}
function Cs(e, t, n) {
  const r = t.headers;
  if (!r || typeof r.get != "function") return null;
  const o = Number(r.get("content-length") || 0), a = `${r.get("accept-ranges") || ""}`.toLowerCase().includes("bytes"), s = `${r.get("content-encoding") || ""}`.trim();
  return !a || s || !Number.isFinite(o) || o < Ms ? null : {
    url: e,
    length: o,
    async fetchRange(i, l) {
      const c = await n(e, { headers: { Range: `bytes=${i}-${l - 1}` } });
      if (c.status !== 206) throw new Error(`读取 PDF 片段失败 (${c.status})`);
      return new Uint8Array(await c.arrayBuffer());
    }
  };
}
const xs = { file: null, loading: !1, error: "" }, Ds = { file: null, loading: !0, error: "" };
function zs(e = "", t = null) {
  const n = `${e || ""}`.trim(), [r, o] = N(null);
  if (D(() => {
    if (t || !n) return;
    const s = Re.get(n);
    if (s) {
      wn(n, s);
      return;
    }
    const i = new AbortController();
    return go(n, void 0, { signal: i.signal }).then((l) => {
      i.signal.aborted || o({ url: n, file: l, loading: !1, error: "" });
    }).catch((l) => {
      i.signal.aborted || o({ url: n, file: null, loading: !1, error: (l == null ? void 0 : l.message) || String(l) });
    }), () => i.abort();
  }, [n, t]), t) return { file: t, loading: !1, error: "" };
  if (!n) return xs;
  if ((r == null ? void 0 : r.url) === n) return r;
  const a = Re.get(n);
  return a ? { file: a, loading: !1, error: "" } : Ds;
}
function Os(e) {
  const { sessionEpochRef: t, closingRef: n, abort: r, sessionEpoch: o } = e;
  let a = !1;
  const s = () => r.signal.aborted || n.current || t.current.value !== o;
  return {
    signal: r.signal,
    isClosedOrStale: s,
    isInactive: () => a || s(),
    markFailed: () => {
      a = !0;
    }
  };
}
async function Sn(e) {
  const { url: t, label: n, percentStart: r, percentEnd: o, fence: a, setBoot: s } = e;
  if (!t || a.isInactive())
    return null;
  Vt(s, r, n, "download");
  const i = await go(t, Tt().fetchProtected, {
    signal: a.signal
  });
  return a.isInactive() ? null : (Vt(s, o, n, "download"), i);
}
async function $s(e) {
  const { sourceFinal: t, translatedFinal: n, fence: r, setBoot: o } = e;
  Vt(o, 25, "正在下载 PDF…", "download");
  const a = [];
  let s = null, i = null;
  return t && a.push(
    Sn({
      url: t,
      label: "正在下载原文 PDF…",
      percentStart: 30,
      percentEnd: 55,
      fence: r,
      setBoot: o
    }).then((d) => {
      s = d;
    })
  ), n && a.push(
    Sn({
      url: n,
      label: "正在下载译文 PDF…",
      percentStart: 55,
      percentEnd: 85,
      fence: r,
      setBoot: o
    }).then((d) => {
      i = d;
    })
  ), await Promise.all(a), r.isInactive() ? { status: "inactive" } : !!t && !s || !!n && !i ? { status: "incomplete" } : { status: "downloaded", sourceBytes: s, translatedBytes: i };
}
function Fs(e, t, n) {
  const r = new URL(e);
  return n ? r.searchParams.set("job_id", n) : (r.searchParams.delete("job_id"), r.searchParams.set("document_id", t)), r.toString();
}
async function js({
  apiPrefix: e,
  documentId: t,
  expiredJobId: n,
  fetchReading: r = Pa,
  location: o = globalThis.location
}) {
  let a;
  try {
    const s = await r(e, t);
    a = `${(s == null ? void 0 : s.job_id) || ""}`.trim() || null;
  } catch {
    return !1;
  }
  return a === n || !o ? !1 : (o.replace(Fs(o.href, t, a)), !0);
}
const Ot = {
  regions: null,
  metadata: null
};
function Bs(e) {
  const {
    sessionJobId: t,
    jobId: n,
    routeDocumentId: r,
    documentJobId: o,
    rejectedDocumentJobId: a,
    sourceOnly: s,
    locationKey: i,
    sessionIdentity: l,
    committedSource: c,
    applyIdentityEvent: d,
    publishPayload: f,
    clearPayload: u,
    switchSessionMode: m,
    jobRefreshRevision: v,
    sessionEpochRef: h,
    closingRef: y,
    activeLoadAbortRef: w
  } = e, [g, S] = N(""), [b, I] = N(""), [R, T] = N(null), [O, C] = N(null), [j, E] = N(!1), [P, k] = N(""), [M, _] = N([]), [U, F] = N(!1), [G, ee] = N(() => ({
    source: null,
    translated: null
  })), [X, Q] = N(
    Ot
  ), [fe, le] = N({
    loading: !0,
    percent: 4,
    text: Ce.boot,
    stage: "progress",
    failed: !1
  });
  return D(() => {
    const ue = new AbortController(), be = h.current.value, H = Os({
      sessionEpochRef: h,
      closingRef: y,
      abort: ue,
      sessionEpoch: be
    });
    w.current = ue;
    const te = Ze();
    if (y.current)
      return ue.abort(), () => {
        w.current === ue && (w.current = null);
      };
    let me = !1;
    function ie(z, Y) {
      H.markFailed(), F(!0), le({
        loading: !1,
        percent: 100,
        text: z,
        stage: "failed",
        failed: !0
      }), yn({ percent: 100, text: Y, stage: "failed" });
    }
    function ye() {
      E(!0), me || F(!0), le({
        loading: !1,
        percent: 100,
        text: Ce.ready,
        stage: "ready",
        failed: !1
      }), yn({ percent: 100, text: Ce.ready, stage: "ready" });
    }
    function Be() {
      return c != null && c.documentId ? mr(
        c.documentId,
        c.revision
      ) : es() ? ts : te.resolveResourceUrl(pn(r));
    }
    async function Pe() {
      var V;
      let z = { activeJobId: "", activeVersionId: "" };
      try {
        const se = await ((V = te.fetchDocument) == null ? void 0 : V.call(te, r));
        se && (z = Rs(se));
      } catch {
      }
      const Y = Es({
        link: z,
        rejectedDocumentJobId: a,
        hasCommittedSource: !!c
      });
      if (Y.kind === "follow-active-job") {
        if (H.isInactive()) return;
        d({
          type: "resolved-document-job",
          documentId: r,
          jobId: Y.jobId
        }), Y.activeVersionId ? (c || d({
          type: "committed-source",
          documentId: r,
          revision: Y.activeVersionId,
          sessionIdentity: l
        }), m("source")) : m("compare");
        return;
      }
      if (Y.kind === "open-committed-source") {
        if (H.isInactive()) return;
        d({
          type: "committed-source",
          documentId: r,
          revision: Y.revision,
          sessionIdentity: l
        }), m("source");
        return;
      }
      const ce = Be();
      if (H.isInactive()) return;
      S(ce), I(""), k(""), u(l);
      const B = await Sn({
        url: ce,
        label: "正在下载原文 PDF…",
        percentStart: 30,
        percentEnd: 85,
        fence: H,
        setBoot: le
      });
      if (!H.isInactive()) {
        if (!B) {
          ie("源文件不可用：该文档没有可读取的源 PDF。", "源文件下载失败");
          return;
        }
        T(B), ye();
      }
    }
    async function Ie() {
      var J;
      const z = !c, Y = !!(z && te.loadSessionSnapshot && te.loadReaderOptionalArtifacts), ce = Y ? te.loadReaderOptionalArtifacts(t) : null, B = await ((J = te.loadSessionSnapshot) == null ? void 0 : J.call(te, {
        jobId: t,
        documentId: r,
        routeDocumentId: r,
        committedSource: c,
        includeOptionalArtifacts: z && !Y
      })), V = B ? {
        jobPayload: B.sourcePayload,
        manifestPayload: B.manifestPayload,
        readerMetadata: B.readerMetadata,
        regionsPayload: B.regions,
        readerErrors: B.readerErrors
      } : await te.loadReaderPayload(t, {
        includeOptionalArtifacts: z
      });
      if (H.isInactive()) return;
      let se = null;
      if (n && !r)
        if (B && B.linkedDocument !== void 0)
          se = B.linkedDocument;
        else {
          try {
            se = await te.fetchDocumentByJobId(ur, t);
          } catch {
          }
          if (H.isInactive()) return;
        }
      const ve = bs(V.jobPayload) || `${(se == null ? void 0 : se.document_id) || ""}`.trim();
      ve && !r && d({
        type: "resolved-job-document",
        jobId: t,
        documentId: ve
      });
      const pe = Ps({
        payloadDocumentId: ve,
        linkedActiveJobId: `${(se == null ? void 0 : se.active_job_id) || ""}`.trim(),
        linkedActiveVersionId: `${(se == null ? void 0 : se.active_version_id) || ""}`.trim(),
        sessionJobId: t,
        hasCommittedSource: !!c
      });
      if (pe.kind === "restore-committed-source") {
        if (H.isInactive()) return;
        d({
          type: "committed-source",
          documentId: pe.documentId,
          revision: pe.revision,
          sessionIdentity: l
        }), m("source");
        return;
      }
      const Se = te.resolveReaderSourcePdf(V.manifestPayload), it = te.resolveReaderTranslatedPdfUrl(V.jobPayload, V.manifestPayload), tn = typeof Se == "string" ? Se : te.resolveReaderArtifactUrl(Se), Ue = r || ve, He = c != null && c.documentId ? mr(
        c.documentId,
        c.revision
      ) : tn || (Ue ? te.resolveResourceUrl(pn(Ue)) : ""), Ye = c ? "" : it || "";
      S(He || ""), I(Ye), k(vs(V.jobPayload, t)), f({
        jobPayload: V.jobPayload || null,
        manifestPayload: V.manifestPayload || null,
        sessionIdentity: l
      });
      const xt = () => $s({
        sourceFinal: He || "",
        translatedFinal: Ye,
        fence: H,
        setBoot: le
      }), Dt = !!(He || Ye), lt = ce && Dt ? xt() : null;
      lt == null || lt.catch(() => {
      });
      const zt = (K) => {
        H.isInactive() || (_(c ? [] : so(K.regionsPayload)), ee(c ? { source: null, translated: null } : Sa(K.readerMetadata)), Q(c ? Ot : K.readerErrors ?? Ot), F(!0));
      };
      if (ce ? (me = !0, ce.then(zt)) : zt(V), !Dt) {
        ie(Ce.failed, Ce.failed);
        return;
      }
      const x = await (lt ?? xt());
      if (x.status !== "inactive") {
        if (x.status === "incomplete") {
          ie("PDF 下载失败，请重试", "PDF 下载失败");
          return;
        }
        T(x.sourceBytes), C(x.translatedBytes), ye();
      }
    }
    async function Te() {
      E(!1), T(null), C(null), _([]), F(!1), ee({ source: null, translated: null }), Q(Ot), Vt(le, 8, Ce.metadata, "metadata");
      try {
        if (s) {
          await Pe();
          return;
        }
        if (!t) {
          ie(Ce.failed, Ce.failed);
          return;
        }
        await Ie();
      } catch (z) {
        if (H.isClosedOrStale() || (z == null ? void 0 : z.name) === "AbortError") return;
        H.markFailed();
        const Y = Number(z == null ? void 0 : z.status), ce = `${(z == null ? void 0 : z.reason) || ""}`, B = Ns({ status: Y, reason: ce, sessionJobId: t });
        if (B && (await js({
          apiPrefix: ur,
          documentId: B,
          expiredJobId: t
        }) || H.isClosedOrStale()))
          return;
        if (Ts({
          status: Y,
          reason: ce,
          jobId: n,
          routeDocumentId: r,
          documentJobId: o,
          sessionJobId: t
        })) {
          d({ type: "missing-document-job", documentId: r, jobId: t }), d({ type: "cleared-resolved-document-job" }), m("source");
          return;
        }
        const V = z instanceof Error ? z.message : Ce.failed;
        ie(V, V);
      }
    }
    return Te(), () => {
      ue.abort(), w.current === ue && (w.current = null);
    };
  }, [t, r, o, a, s, i, c, v, n, l, d, f, u, m]), {
    sourceUrl: g,
    translatedUrl: b,
    sourceFile: R,
    translatedFile: O,
    assetsReady: j,
    title: P,
    regions: M,
    regionsSettled: U,
    readerMetadata: G,
    readerErrors: X,
    boot: fe
  };
}
function Us() {
  const e = A(!1), t = A(null), { locationKey: n, jobId: r, routeDocumentId: o, sessionIdentity: a } = ps(), s = A({ identity: "", value: 0 });
  s.current.identity !== a && (s.current = {
    identity: a,
    value: s.current.value + 1
  }, e.current = !1);
  const i = A(a), l = A(""), c = A(""), d = A(() => {
  }), f = $(() => d.current(), []), u = gs({
    routeDocumentId: o,
    jobId: r,
    sessionIdentity: a,
    sessionIdentityRef: i,
    documentIdRef: l,
    sessionJobIdRef: c,
    switchToSourceMode: f
  }), {
    sessionJobId: m,
    documentId: v,
    sourceOnly: h,
    sourceViewOnly: y
  } = u, { mode: w, setMode: g, switchSessionMode: S } = Is(y);
  d.current = () => {
    S("source");
  }, i.current = a, l.current = v, c.current = m;
  const b = ws({
    sessionJobId: m,
    sessionIdentity: a,
    sessionIdentityRef: i,
    sessionJobIdRef: c,
    sessionEpochRef: s,
    closingRef: e
  }), {
    scopedJobPayload: I,
    scopedManifestPayload: R,
    jobStatus: T,
    jobTerminal: O,
    jobRefreshRevision: C,
    refreshJobArtifacts: j,
    refreshJobStatus: E
  } = b, P = Bs({
    sessionJobId: m,
    jobId: r,
    routeDocumentId: o,
    documentJobId: u.documentJobId,
    rejectedDocumentJobId: u.rejectedDocumentJobId,
    sourceOnly: h,
    locationKey: n,
    sessionIdentity: a,
    committedSource: u.activeCommittedDocumentSource,
    applyIdentityEvent: u.applyIdentityEvent,
    publishPayload: b.publishPayload,
    clearPayload: b.clearPayload,
    switchSessionMode: S,
    jobRefreshRevision: C,
    sessionEpochRef: s,
    closingRef: e,
    activeLoadAbortRef: t
  }), k = $(() => {
    var _;
    e.current = !0, (_ = t.current) == null || _.abort();
  }, []), M = q(
    () => ({
      fetchProtected: Ze().fetchProtected,
      jobId: m,
      jobPayload: I,
      manifestPayload: R,
      sourceUrl: P.sourceUrl,
      translatedUrl: P.translatedUrl,
      sourceOnly: y
    }),
    [m, I, R, P.sourceUrl, P.translatedUrl, y]
  );
  return {
    jobId: m,
    jobStatus: T,
    workflow: `${(I == null ? void 0 : I.workflow) || ""}`.trim().toLowerCase(),
    jobTerminal: O,
    documentId: v,
    sessionIdentity: a,
    sourceOnly: h,
    mode: w,
    setMode: g,
    sourceUrl: P.sourceUrl,
    translatedUrl: P.translatedUrl,
    sourceFile: P.sourceFile,
    translatedFile: P.translatedFile,
    assetsReady: P.assetsReady,
    boot: P.boot,
    title: P.title,
    regions: P.regions,
    regionsSettled: P.regionsSettled,
    readerMetadata: P.readerMetadata,
    readerErrors: P.readerErrors,
    download: M,
    refreshJobArtifacts: j,
    refreshJobStatus: E,
    refreshCommittedDocument: u.refreshCommittedDocument,
    prepareClose: k
  };
}
const Hs = 160, Ws = 8, Vs = 0;
function Ks() {
  const e = A(null), [t, n] = N(null), [r, o] = N(Vs), a = $((s) => {
    e.current = s, n(s);
  }, []);
  return D(() => {
    const s = t;
    if (!s || typeof ResizeObserver > "u")
      return;
    const i = (c) => {
      !Number.isFinite(c) || c < Hs || o((d) => Math.abs(d - c) < Ws ? d : c);
    }, l = new ResizeObserver((c) => {
      var d, f;
      i(((f = (d = c[0]) == null ? void 0 : d.contentRect) == null ? void 0 : f.width) ?? s.clientWidth);
    });
    return l.observe(s), i(s.clientWidth), () => l.disconnect();
  }, [t]), {
    shellRef: e,
    shellEl: t,
    shellWidth: r,
    bindShell: a
  };
}
function Js(e) {
  const { mode: t, sourceOnly: n, assetsReady: r, hasSource: o, hasTranslated: a } = e, s = r && o, i = r && a && !n, l = t === "source" || t === "compare", c = !n && (t === "translated" || t === "compare");
  return {
    mountSource: s,
    mountTranslated: i,
    showSource: l,
    showTranslated: c,
    compareMode: t === "compare" && l && c && s && i,
    primaryPane: t === "translated" ? "translated" : "source"
  };
}
const rn = { source: 0, translated: 0 };
function qs(e, t) {
  const {
    mode: n,
    sourceOnly: r,
    assetsReady: o,
    sourceUrl: a,
    translatedUrl: s,
    sourceFile: i,
    translatedFile: l
  } = e, c = `${(t == null ? void 0 : t.identityKey) || ""}\0${a}\0${s}`, d = A(c);
  d.current = c;
  const [f, u] = N(() => ({
    identity: c,
    pages: rn
  })), [m, v] = N(() => ({ identity: c, tick: 0 })), h = f.identity === c ? f.pages : rn, y = m.identity === c ? m.tick : 0, w = Js({
    mode: n,
    sourceOnly: r,
    assetsReady: o,
    hasSource: !!i || !!a,
    hasTranslated: !!l
  }), { primaryPane: g } = w, S = $((E, P) => {
    d.current === c && u((k) => {
      const M = k.identity === c ? k.pages : rn;
      return M[P] === E && k.identity === c ? k : {
        identity: c,
        pages: { ...M, [P]: E }
      };
    });
  }, [c]), b = A(null), I = $(() => {
    b.current && clearTimeout(b.current);
    const E = c;
    b.current = setTimeout(() => {
      b.current = null, d.current === E && v((P) => ({
        identity: E,
        tick: P.identity === E ? P.tick + 1 : 1
      }));
    }, 60);
  }, [c]);
  D(() => (b.current && (clearTimeout(b.current), b.current = null), u((E) => E.identity === c && E.pages.source === 0 && E.pages.translated === 0 ? E : { identity: c, pages: { source: 0, translated: 0 } }), v((E) => E.identity === c && E.tick === 0 ? E : { identity: c, tick: 0 }), () => {
    b.current && (clearTimeout(b.current), b.current = null);
  }), [c]);
  const R = q(
    () => Math.max(h.source, h.translated),
    [h]
  ), T = g === "translated" ? h.translated : h.source || h.translated, O = t == null ? void 0 : t.userZoom, C = t == null ? void 0 : t.shellWidth, j = `${c}-${y}-${O}-${n}-${h.source}-${h.translated}-${C}`;
  return {
    ...w,
    numPagesByPane: h,
    hudNumPages: R,
    primaryNumPages: T,
    metricsTick: y,
    onNumPages: S,
    onMetrics: I,
    rowSyncRevision: j
  };
}
const Le = "data-reader-page", qe = "data-reader-pane", On = "data-natural-height", Gs = "reader-react-root", Zs = "reader-react-grid", bo = "reader-react-scroll-shell", Ys = "reader-react-pdf-pane", yo = "reader-react-pdf-page", Kt = "reader-react-pdf-page-placeholder", $n = "reader-react-pdf-page-slot";
function Jt(e, t) {
  const n = e != null ? `[${Le}="${e}"]` : `[${Le}]`;
  return t ? `${n}[${qe}="${t}"]` : n;
}
function Xs() {
  return `.${$n}[${Le}]`;
}
function qt(e) {
  return Number(e.getAttribute(Le));
}
const vo = 0.25, Gt = 1, Qs = 0.05, Ct = 0.5, ei = 16, ti = 8, ni = 720;
function et() {
  const e = typeof window > "u" ? NaN : Number(window.innerWidth);
  return Number.isFinite(e) && e > 0 ? e : Number.POSITIVE_INFINITY;
}
function wo(e) {
  return Number.isFinite(e) && e < ni;
}
function ut(e, t = Number.POSITIVE_INFINITY) {
  return wo(t) && (e === "source" || e === "translated") ? Gt : Ct;
}
function Qt(e) {
  return Number.isFinite(e) ? Math.min(Gt, Math.max(vo, e)) : Ct;
}
function kt(e, t) {
  const n = Qt(Number(e) + t * Qs);
  return Math.round(n * 100) / 100;
}
function ri(e) {
  return Math.round(Qt(e) * 100);
}
function oi(e) {
  const n = (Number(e) || 0) - ei - ti;
  return Math.max(160, Math.floor(n));
}
function ai(e, t = Ct) {
  const n = Qt(t);
  return oi((Number(e) || 0) * n);
}
function si(e, t) {
  if (!e || !Number.isFinite(t) || t <= 0 || Math.abs(t - 1) < 1e-3)
    return;
  const n = e.scrollLeft + e.clientWidth / 2, r = e.scrollTop + e.clientHeight / 2, o = Array.from(
    e.querySelectorAll(`[${qe}]`)
  ).map((s) => ({
    pane: s,
    cx: s.scrollLeft + s.clientWidth / 2,
    hadOverflow: s.scrollWidth > s.clientWidth + 1
  })), a = () => {
    e.scrollLeft = Math.max(0, n * t - e.clientWidth / 2), e.scrollTop = Math.max(0, r * t - e.clientHeight / 2);
    for (const { pane: s, cx: i, hadOverflow: l } of o) {
      const c = Math.max(0, s.scrollWidth - s.clientWidth);
      if (c <= 0) {
        s.scrollLeft = 0;
        continue;
      }
      l ? s.scrollLeft = Math.min(
        c,
        Math.max(0, i * t - s.clientWidth / 2)
      ) : s.scrollLeft = c / 2;
    }
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(a);
  });
}
const ii = 8;
function li(e, t) {
  return !Number.isFinite(e) || e < 80 || Math.abs(e - t) < ii ? "ignore" : !Number.isFinite(t) || t <= 0 ? "immediate" : "settle";
}
const So = 200, Io = [
  "markdown"
], ci = Io;
function Ro(e) {
  return ci.includes(e);
}
const di = "retainpdf:reader:view:v1:", gr = /* @__PURE__ */ new Set([
  "source",
  "translated",
  "markdown",
  "ai"
]), ui = /* @__PURE__ */ new Set([
  "source",
  "compare",
  "translated"
]);
function Eo() {
  try {
    return typeof globalThis.localStorage > "u" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
function In(e) {
  return `${e || ""}`.trim();
}
function fi({
  documentId: e,
  jobId: t
}) {
  const n = In(e);
  if (n) return `document:${n}`;
  const r = In(t);
  return r ? `job:${r}` : "";
}
function Po(e) {
  const t = In(e);
  return t ? `${di}${t}` : "";
}
function mi(e) {
  if (!e || typeof e != "object") return;
  const t = Math.floor(Number(e.page)), n = Number(e.fraction);
  if (!(!Number.isFinite(t) || t < 1 || !Number.isFinite(n)))
    return {
      page: t,
      fraction: Math.max(0, Math.min(1, n))
    };
}
function hi(e) {
  if (e === null) return null;
  if (!e || typeof e != "object") return;
  const t = `${e.left || ""}`, n = `${e.right || ""}`;
  if (!(!gr.has(t) || !gr.has(n) || t === n))
    return { left: t, right: n };
}
function pi(e) {
  return e === null ? null : Ro(e) ? e : void 0;
}
function gi(e) {
  return ui.has(e) ? e : void 0;
}
function To(e) {
  if (!e || typeof e != "object") return null;
  const t = e;
  if (t.schema !== "retainpdf_reader_view_v1") return null;
  const n = mi(t.anchor), r = Number(t.zoom), o = gi(t.mode), a = hi(t.splitLayout), s = pi(t.assistantPanel);
  return {
    schema: "retainpdf_reader_view_v1",
    ...n ? { anchor: n } : {},
    ...Number.isFinite(r) ? { zoom: Math.max(0.25, Math.min(1, r)) } : {},
    ...o !== void 0 ? { mode: o } : {},
    ...a !== void 0 ? { splitLayout: a } : {},
    ...s !== void 0 ? { assistantPanel: s } : {},
    updatedAt: Number.isFinite(Number(t.updatedAt)) ? Number(t.updatedAt) : 0
  };
}
function _e(e, t = Eo()) {
  const n = Po(e);
  if (!n || !t) return null;
  try {
    const r = t.getItem(n);
    return r ? To(JSON.parse(r)) : null;
  } catch {
    return null;
  }
}
function en(e, t, n = Eo()) {
  const r = Po(e);
  if (!r || !n) return null;
  const o = _e(e, n), a = To({
    schema: "retainpdf_reader_view_v1",
    ...o || {},
    ...t,
    updatedAt: Date.now()
  });
  if (!a) return null;
  try {
    return n.setItem(r, JSON.stringify(a)), a;
  } catch {
    return null;
  }
}
function bi(e, t, n = "") {
  var u;
  const [r, o] = N(() => {
    var m;
    return ((m = _e(n)) == null ? void 0 : m.zoom) ?? ut(e, et());
  }), a = A(r), s = A(n);
  a.current = r;
  const i = A(1), l = A(((u = _e(n)) == null ? void 0 : u.zoom) !== void 0);
  D(() => {
    var h;
    if (s.current === n) return;
    s.current = n;
    const m = (h = _e(n)) == null ? void 0 : h.zoom;
    l.current = m !== void 0;
    const v = m ?? ut(e, et());
    i.current = 1, a.current = v, o(v);
  }, [e, n]), D(() => {
    if (l.current) return;
    const m = ut(e, et()), v = a.current;
    Math.abs(m - v) < 5e-4 || (i.current = 1, a.current = m, o(m));
  }, [e]);
  const c = $((m) => {
    const v = Qt(m), h = a.current;
    Math.abs(v - h) < 5e-4 || (i.current = v / (h || 1), l.current = !0, en(s.current, { zoom: v }), o(v));
  }, []), d = $((m) => {
    c(kt(a.current, m));
  }, [c]), f = $((m) => {
    c(ut(m));
  }, [c]);
  return Ee(() => {
    const m = i.current;
    Math.abs(m - 1) < 1e-3 || (i.current = 1, si(t == null ? void 0 : t.current, m));
  }, [r, t]), { userZoom: r, onZoomChange: c, stepZoom: d, resetZoom: f };
}
function yi(e) {
  const { mode: t, setMode: n, beginModeSwitch: r } = e, o = A(t), a = A(n), s = A(r);
  return o.current = t, a.current = n, s.current = r, { setModeKeepingPage: $((l) => {
    l !== o.current && (s.current(), a.current(l));
  }, []) };
}
const Fn = 48;
function ko(e, t = Fn) {
  return e.getBoundingClientRect().top + t;
}
function No(e, t) {
  if (!e.length)
    return null;
  let n = null, r = -1 / 0;
  for (const l of e) {
    const c = l.getBoundingClientRect();
    c.height < 8 || c.width < 8 || c.top <= t + 1 && c.top >= r && (n = l, r = c.top);
  }
  if (!n && (n = e.find((c) => {
    const d = c.getBoundingClientRect();
    return d.height >= 8 && d.width >= 8;
  }) ?? null, n)) {
    const c = [...e].reverse().find((d) => {
      const f = d.getBoundingClientRect();
      return f.height >= 8 && f.width >= 8;
    });
    c && c.getBoundingClientRect().bottom < t && (n = c);
  }
  if (!n)
    return null;
  const o = qt(n);
  if (!Number.isFinite(o) || o < 1)
    return null;
  const a = n.getBoundingClientRect(), s = a.height > 0 ? a.height : 1, i = Math.min(1, Math.max(0, (t - a.top) / s));
  return { el: n, page: o, fraction: i };
}
function Ut(e, t, n = Fn) {
  if (!e)
    return null;
  const r = Jt(void 0, t), o = Array.from(e.querySelectorAll(r));
  if (!o.length || e.getBoundingClientRect().height <= 0)
    return null;
  const s = ko(e, n), i = No(o, s);
  return i ? { page: i.page, fraction: i.fraction } : null;
}
function Nt(e, t, n = "auto", r, o = Fn) {
  if (!e || !t)
    return !1;
  const a = Math.max(1, Math.floor(Number(t.page) || 1)), s = Math.min(1, Math.max(0, Number(t.fraction) || 0));
  let i = null;
  if (r && (i = e.querySelector(Jt(a, r))), i || (i = e.querySelector(Jt(a))), !i)
    return !1;
  const l = e.getBoundingClientRect(), c = i.getBoundingClientRect();
  if (l.height <= 0 || c.height < 8 && i.offsetHeight < 8)
    return !1;
  const d = c.height > 0 ? c.height : i.offsetHeight, f = e.scrollTop + (c.top - l.top), u = Math.max(0, f + s * d - o);
  return n === "auto" ? Math.abs(e.scrollTop - u) >= 1 && (e.scrollTop = u) : e.scrollTo({ top: u, behavior: n }), !0;
}
function vi(e, t, n = "smooth", r) {
  return Nt(
    e,
    { page: t, fraction: 0 },
    n,
    r
  );
}
function Rn(e, t, n) {
  const r = (n == null ? void 0 : n.behavior) ?? "auto", o = (n == null ? void 0 : n.delaysMs) ?? [0, 32, 120, 280];
  let a = !1, s = !1;
  const i = [], l = () => {
    var d;
    if (a) return;
    Nt(
      e(),
      t,
      r,
      n == null ? void 0 : n.pane
    ) && !s && (s = !0, (d = n == null ? void 0 : n.onDone) == null || d.call(n));
  };
  for (const c of o)
    c <= 0 ? requestAnimationFrame(() => {
      requestAnimationFrame(l);
    }) : i.push(setTimeout(l, c));
  return () => {
    a = !0;
    for (const c of i)
      clearTimeout(c);
  };
}
function wi(e, t, n) {
  return Rn(
    e,
    { page: t, fraction: 0 },
    n
  );
}
function Zt(e, t) {
  if (!Number.isFinite(e))
    return 1;
  const n = Math.max(1, Math.floor(e));
  return !Number.isFinite(t) || t <= 0 ? n : Math.min(t, n);
}
function ke(e) {
  return {
    page: Math.max(1, Math.floor(Number(e.page) || 1)),
    fraction: Math.min(1, Math.max(0, Number(e.fraction) || 0))
  };
}
function Si(e, t, n = !0, r = "", o) {
  const [a, s] = N(1);
  return D(() => {
    if (!n || t <= 0) {
      s(1);
      return;
    }
    const i = e.current;
    if (!i)
      return;
    let l = !1, c = null, d = 0;
    const f = Jt(void 0, o), u = () => {
      if (l) return;
      const h = Array.from(i.querySelectorAll(f));
      if (!h.length)
        return;
      const y = ko(i), w = No(h, y);
      w && s(w.page);
    }, m = () => {
      l || (d && cancelAnimationFrame(d), d = requestAnimationFrame(() => {
        d = 0, u();
      }));
    }, v = () => {
      if (l) return;
      if (!Array.from(i.querySelectorAll(f)).length) {
        c = setTimeout(v, 120);
        return;
      }
      u(), i.addEventListener("scroll", m, { passive: !0 });
    };
    return v(), () => {
      l = !0, c && clearTimeout(c), d && cancelAnimationFrame(d), i.removeEventListener("scroll", m);
    };
  }, [e, t, n, r, o]), a;
}
const Ii = `canvas, .react-pdf__Page, .${yo}, .${Kt}`, br = /* @__PURE__ */ new WeakMap();
function Ri(e) {
  const t = Number(e.getAttribute(On));
  if (Number.isFinite(t) && t > 0)
    return t;
  let n = br.get(e);
  if ((n == null || !n.isConnected) && (n = e.querySelector(Ii), br.set(e, n)), n) {
    const o = n.getBoundingClientRect().height;
    if (Number.isFinite(o) && o > 0)
      return o;
  }
  const r = e.getBoundingClientRect().height;
  return Number.isFinite(r) && r > 0 ? r : 0;
}
function Ei(e, t) {
  if (e.size !== t.size) return !1;
  for (const [n, r] of t)
    if (e.get(n) !== r) return !1;
  return !0;
}
function Pi(e) {
  const t = /* @__PURE__ */ new Map();
  e.querySelectorAll(Xs()).forEach((r) => {
    const o = qt(r);
    if (!Number.isFinite(o) || o < 1) return;
    const a = Ri(r);
    if (a <= 0) return;
    const s = t.get(o) || { height: 0, count: 0 };
    s.height = Math.max(s.height, a), s.count += 1, t.set(o, s);
  });
  const n = /* @__PURE__ */ new Map();
  return t.forEach((r, o) => {
    r.count >= 2 && r.height > 0 && n.set(o, Math.ceil(r.height));
  }), n;
}
function Ti(e, t, n = "", r) {
  const [o, a] = N(() => /* @__PURE__ */ new Map()), s = A(o), i = A(r);
  return i.current = r, Ee(() => {
    if (!t) {
      s.current.size !== 0 && (s.current = /* @__PURE__ */ new Map(), a(s.current));
      return;
    }
    let l = !1, c = 0, d = !1, f = !1;
    const u = () => {
      var I;
      if (l) return;
      const S = e.current;
      if (!S) return;
      const b = Pi(S);
      Ei(s.current, b) || (s.current = b, a(b)), d && !f && (f = !0, (I = i.current) == null || I.call(i));
    }, m = () => {
      cancelAnimationFrame(c), c = requestAnimationFrame(() => {
        requestAnimationFrame(u);
      });
    };
    m();
    const v = window.setTimeout(m, 100), h = window.setTimeout(() => {
      d = !0, m();
    }, 300), y = window.setTimeout(m, 700), w = e.current;
    let g = null;
    return w && typeof ResizeObserver < "u" && (g = new ResizeObserver(() => m()), g.observe(w)), () => {
      l = !0, cancelAnimationFrame(c), window.clearTimeout(v), window.clearTimeout(h), window.clearTimeout(y), g == null || g.disconnect();
    };
  }, [e, t, n]), o;
}
const ki = [0, 48, 140, 320, 560], Ni = 700, Mi = [80, 200, 400], Ai = 500, _i = 50, Li = /* @__PURE__ */ new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
  "Spacebar",
  "j",
  "k"
]), Ci = 180, yr = [0, 48, 140, 320, 700, 1200];
function xi(e, t) {
  var P;
  const {
    primaryPane: n,
    mode: r,
    enabled: o = !0,
    persistenceKey: a = "",
    restoreReady: s = !0
  } = t, i = A(
    ((P = _e(a)) == null ? void 0 : P.anchor) || { page: 1, fraction: 0 }
  ), l = A(null), c = A(!1), d = A(r), f = A(null), u = A(null), m = A(null), v = A(null), h = A(a), y = A(""), w = A(n);
  w.current = n;
  const g = $(() => {
    var k;
    (k = f.current) == null || k.call(f), f.current = null, u.current != null && (clearTimeout(u.current), u.current = null);
  }, []), S = $(() => {
    !c.current && l.current == null || (g(), m.current != null && (clearTimeout(m.current), m.current = null), l.current = null, c.current = !1);
  }, [g]), b = $((k = !1) => {
    v.current != null && (clearTimeout(v.current), v.current = null);
    const M = () => {
      v.current = null, en(h.current, {
        anchor: ke(i.current)
      });
    };
    k ? M() : v.current = setTimeout(M, Ci);
  }, []), I = $((k) => {
    i.current = ke(k), l.current = null, m.current != null && clearTimeout(m.current), m.current = setTimeout(() => {
      m.current = null, c.current = !1;
    }, _i);
  }, []);
  D(() => {
    if (!o)
      return;
    let k = !1, M = null, _ = null, U = null;
    const F = () => {
      if (k) return;
      const G = e.current;
      if (!G) {
        U = setTimeout(F, 50);
        return;
      }
      M = G, _ = () => {
        if (c.current)
          return;
        const ee = Ut(M, w.current);
        ee && (i.current = ee, b());
      }, M.addEventListener("scroll", _, { passive: !0 }), c.current || _();
    };
    return F(), () => {
      k = !0, U != null && clearTimeout(U), M && _ && M.removeEventListener("scroll", _);
    };
  }, [o, r, n, e, b]), D(() => {
    if (!o) return;
    const k = e.current;
    if (!k) return;
    const M = (_) => {
      _.metaKey || _.ctrlKey || _.altKey || Li.has(_.key) && S();
    };
    return k.addEventListener("wheel", S, { passive: !0 }), k.addEventListener("touchmove", S, { passive: !0 }), window.addEventListener("keydown", M), () => {
      k.removeEventListener("wheel", S), k.removeEventListener("touchmove", S), window.removeEventListener("keydown", M);
    };
  }, [o, e, S]), Ee(() => {
    var M;
    if (h.current === a) return;
    b(!0), g(), m.current != null && (clearTimeout(m.current), m.current = null), h.current = a, y.current = "";
    const k = (M = _e(a)) == null ? void 0 : M.anchor;
    i.current = k ? ke(k) : { page: 1, fraction: 0 }, l.current = null, c.current = !!a, d.current = r;
  }, [a, r, b, g]), D(() => {
    var M;
    if (!o || !s || !a || y.current === a) return;
    y.current = a;
    const k = ke(
      ((M = _e(a)) == null ? void 0 : M.anchor) || { page: 1, fraction: 0 }
    );
    return i.current = k, l.current = k, c.current = !0, g(), f.current = Rn(
      () => e.current,
      k,
      {
        behavior: "auto",
        pane: w.current,
        delaysMs: yr,
        onDone: () => I(k)
      }
    ), u.current = setTimeout(() => {
      u.current = null, I(k);
    }, Math.max(...yr) + 160), () => g();
  }, [o, s, a, e, I, g]), D(() => {
    if (d.current === r)
      return;
    if (d.current = r, !o) {
      c.current = !1, l.current = null, g();
      return;
    }
    const k = l.current ? ke(l.current) : ke(i.current);
    return c.current = !0, l.current = k, i.current = k, g(), f.current = Rn(
      () => e.current,
      k,
      {
        behavior: "auto",
        pane: n,
        // 等页宽/行高同步后再钉；同一 locked 幂等，不会越滚越远
        delaysMs: ki,
        onDone: () => I(k)
      }
    ), u.current = setTimeout(() => {
      u.current = null, I(k);
    }, Ni), () => {
      g();
    };
  }, [r, o, n, e, I, g]), D(() => () => {
    g(), m.current != null && (clearTimeout(m.current), m.current = null), b(!0);
  }, [g, b]);
  const R = $(() => {
    const k = Ut(
      e.current,
      w.current
    );
    return ke(k || i.current);
  }, [e]), T = $(() => {
    c.current = !0;
    const k = Ut(
      e.current,
      w.current
    ), M = ke(k ?? i.current);
    return i.current = M, l.current = M, b(), M;
  }, [e, b]), O = $((k, M, _) => {
    const U = _ || w.current, F = Zt(k, M || 1), G = { page: F, fraction: 0 };
    i.current = G, c.current = !0, l.current = G, b(), g(), vi(e.current, F, "smooth", U), f.current = wi(
      () => e.current,
      F,
      {
        behavior: "auto",
        pane: U,
        delaysMs: Mi,
        onDone: () => I(G)
      }
    ), u.current = setTimeout(() => {
      u.current = null, I(G);
    }, Ai);
  }, [e, I, g, b]), C = $(() => ke(i.current), []), j = $(() => c.current, []), E = $(() => {
    if (!c.current || !l.current)
      return;
    const k = ke(l.current);
    Nt(
      e.current,
      k,
      "auto",
      w.current
    );
  }, [e]);
  return {
    lockFromShell: R,
    beginModeSwitch: T,
    goToPage: O,
    getAnchor: C,
    isRestoring: j,
    repinIfRestoring: E
  };
}
function Di(e, t) {
  if (!e) return null;
  if (e.blockId && t) {
    const o = t(e.blockId);
    if (o != null && Number.isFinite(o) && o >= 1)
      return Math.floor(o);
  }
  if (e.pageIdx === null || e.pageIdx === void 0) return null;
  const n = Number(e.pageIdx);
  if (!Number.isFinite(n)) return null;
  const r = Math.floor(n) + 1;
  return r >= 1 ? r : null;
}
function Mo(e, t, n) {
  const r = `${(n == null ? void 0 : n.jobId) || ""}`.trim(), o = `${(n == null ? void 0 : n.documentId) || ""}`.trim(), a = `j:${r}:d:${o}`;
  return t == null ? `${a}:none:${(e == null ? void 0 : e.blockId) || ""}` : `${a}:p:${t}:b:${(e == null ? void 0 : e.blockId) || ""}`;
}
const zi = [0, 80, 200, 400, 800], Oi = 120, $i = 400;
function Fi(e, t, n) {
  const { enabled: r, numPages: o, goToPage: a, resolveBlockPage: s, onAnchorApplied: i, jobId: l, documentId: c, regionsSettled: d = !0 } = e, f = A(a);
  f.current = a;
  const u = A(s);
  u.current = s;
  const m = A(i);
  m.current = i;
  const v = A(n);
  v.current = n, D(() => {
    var b, I;
    if (!r || !Number.isFinite(o) || o < 1)
      return;
    const h = ss(), y = Di(h, u.current);
    if (y == null && (h != null && h.blockId) && !d) return;
    const w = Mo(h, y, { jobId: l, documentId: c });
    if (t.current === w)
      return;
    if (y == null) {
      t.current = w, (b = v.current) == null || b.call(v);
      return;
    }
    t.current = w, h && ((I = m.current) == null || I.call(m, h, y));
    const g = [];
    let S = 0;
    for (const R of zi)
      S = Math.max(S, R), g.push(
        setTimeout(() => {
          f.current(y);
        }, R)
      );
    return g.push(
      setTimeout(() => {
        var R;
        (R = v.current) == null || R.call(v);
      }, S + Oi)
    ), () => {
      for (const R of g) clearTimeout(R);
    };
  }, [r, o, l, c, t, d]);
}
function ji(e) {
  var a;
  const t = globalThis.window;
  if (!t || typeof ((a = t.history) == null ? void 0 : a.replaceState) != "function") return;
  const n = t.location, r = `${e || ""}`, o = `${n.pathname}${r ? `?${r}` : ""}${n.hash || ""}`;
  t.history.replaceState(null, "", o);
}
function Bi(e, t, n) {
  const {
    syncEnabled: r,
    currentPage: o,
    resolveBlockPage: a,
    syncDebounceMs: s = $i,
    jobId: i,
    documentId: l,
    applyReaderSearch: c
  } = e, d = A(a);
  d.current = a;
  const f = A(c);
  f.current = c;
  const u = A(0);
  D(() => {
    if (!n || !r || !t.current || !Number.isFinite(o) || o < 1 || u.current === o) return;
    const m = setTimeout(() => {
      var w;
      const v = ((w = globalThis.location) == null ? void 0 : w.search) || "", h = wa(v, o, d.current);
      if (u.current = o, h === null) return;
      const y = `${new URLSearchParams(h).get("block_id") || ""}`.trim();
      t.current = Mo(
        { blockId: y },
        o,
        { jobId: i, documentId: l }
      ), (f.current || ji)(h);
    }, s);
    return () => clearTimeout(m);
  }, [
    n,
    r,
    o,
    s,
    i,
    l,
    t
  ]);
}
function Ui(e) {
  const t = A(""), [n, r] = N(!1), o = $(() => r(!0), []), a = {
    enabled: e.enabled,
    numPages: e.numPages,
    goToPage: e.goToPage,
    resolveBlockPage: e.resolveBlockPage,
    onAnchorApplied: e.onAnchorApplied,
    jobId: e.jobId,
    documentId: e.documentId,
    regionsSettled: e.regionsSettled
  };
  Fi(a, t, o), Bi(e, t, n);
}
const vt = {
  layoutByPage: /* @__PURE__ */ new Map(),
  pagesByPage: /* @__PURE__ */ new Map(),
  lastSeq: 0,
  connection: "idle",
  jobStatus: "",
  error: ""
};
function Hi(e) {
  return new Map(((e == null ? void 0 : e.pages) || []).map((t) => [t.page_idx, t]));
}
function vr(e, t) {
  return e.attempt !== t.attempt ? e.attempt < t.attempt ? -1 : 1 : e.generation !== t.generation ? e.generation < t.generation ? -1 : 1 : 0;
}
function Ao(e, t, n) {
  if (n.page_idx !== t.page_idx) return "retry";
  const r = vr(n, t);
  if (r < 0 || r === 0 && n.page_hash !== t.page_hash) return "retry";
  if (!e) return "accept";
  const o = vr(n, e);
  return o < 0 || o === 0 && n.page_hash === e.pageHash ? "ignore" : "accept";
}
function Wi(e, t, n) {
  if (t.seq <= e.lastSeq) return e;
  const r = e.pagesByPage.get(t.page_idx), o = Ao(r, t, n);
  if (o === "retry") return e;
  if (o === "ignore")
    return { ...e, lastSeq: t.seq, connection: "live", error: "" };
  const a = new Map(n.items.map((l) => [l.item_id, l])), s = new Map((r == null ? void 0 : r.changedAtSeqById) || []);
  for (const l of t.changed_item_ids)
    a.has(l) && s.set(l, t.seq);
  const i = new Map(e.pagesByPage);
  return i.set(t.page_idx, {
    attempt: n.attempt,
    generation: n.generation,
    pageHash: n.page_hash,
    itemsById: a,
    changedAtSeqById: s,
    lastEventSeq: t.seq
  }), {
    ...e,
    pagesByPage: i,
    lastSeq: t.seq,
    connection: "live",
    error: ""
  };
}
function Vi(e) {
  const { hasOverlayContent: t, connection: n, showSource: r } = e;
  return {
    topBarPill: t && n !== "terminal",
    sourcePaneToggle: t && r,
    // 和 resolveReaderPaneComposition 的 overlayOnSource 同一套条件，外加
    // 「源文栏得在台面上」——否则叠层没有落脚的地方。
    overlayRenderable: t && r && e.liveTranslationVisible && !e.assistantOpen
  };
}
const wr = [250, 500, 1e3, 2e3, 4e3], on = [80, 160, 320, 640, 1e3, 1500], Sr = [250, 500, 1e3, 2e3, 4e3, 5e3];
function En(e, t) {
  return new Promise((n, r) => {
    if (t.aborted) {
      r(new DOMException("Aborted", "AbortError"));
      return;
    }
    const o = () => {
      clearTimeout(a), r(new DOMException("Aborted", "AbortError"));
    }, a = setTimeout(() => {
      t.removeEventListener("abort", o), n();
    }, e);
    t.addEventListener("abort", o, { once: !0 });
  });
}
function jn(e) {
  return Ta(e) ? `${e.code || ""}`.trim() : "";
}
function $t(e, t) {
  const n = jn(e);
  return n === "LIVE_TRANSLATION_PAGE_NOT_COMMITTED" ? "尚未收到可显示的页面译文" : n === "LIVE_TRANSLATION_LAYOUT_NOT_READY" ? "正在等待 OCR 版面数据" : `${(e == null ? void 0 : e.message) || ""}`.trim() || t;
}
async function Ki(e, t, n, r, o) {
  let a = null;
  for (let s = 0; ; s += 1) {
    try {
      const l = await o.fetchPage(e, t.page_idx, { signal: r });
      if (Ao(n.pagesByPage.get(t.page_idx), t, l) !== "retry")
        return l;
      a = ka(
        "Authoritative page snapshot has not reached the event generation",
        409,
        "LIVE_TRANSLATION_SNAPSHOT_UNAVAILABLE"
      );
    } catch (l) {
      if ((l == null ? void 0 : l.name) === "AbortError") throw l;
      a = l;
      const c = jn(l);
      if (c && ![
        "LIVE_TRANSLATION_PAGE_NOT_COMMITTED",
        "LIVE_TRANSLATION_SNAPSHOT_UNAVAILABLE"
      ].includes(c)) throw l;
    }
    const i = on[Math.min(s, on.length - 1)];
    if (await En(i, r), s >= on.length + 2) throw a;
  }
}
function Ji({
  jobId: e,
  jobStatus: t,
  enabled: n,
  liveTranslationPort: r = void 0
}) {
  const [o, a] = N(vt), s = A(o), i = A("");
  s.current = o;
  const l = `${e || ""}`.trim(), c = `${t || ""}`.trim().toLowerCase(), d = Pt(c) ? c : "";
  return D(() => {
    if (!n || !l) {
      i.current = "", s.current = vt, a(vt);
      return;
    }
    const f = r === void 0 ? as() : r, u = i.current === l;
    if (i.current = l, !f) {
      const S = {
        ...u ? s.current : vt,
        connection: d ? "terminal" : "unavailable",
        jobStatus: c,
        error: "实时译文暂不可用"
      };
      s.current = S, a(S);
      return;
    }
    const m = new AbortController();
    let v = !1;
    const h = {
      ...u ? s.current : vt,
      connection: d ? "terminal" : "connecting",
      jobStatus: c,
      error: ""
    };
    s.current = h, a(h);
    const y = (S) => {
      m.signal.aborted || a((b) => {
        const I = S(b);
        return s.current = I, I;
      });
    }, w = async () => {
      let S = 0;
      for (; !m.signal.aborted; )
        try {
          const b = await f.fetchLayout(l, { signal: m.signal });
          v = !0, y((I) => ({
            ...I,
            layoutByPage: Hi(b),
            jobStatus: c,
            error: ""
          }));
          return;
        } catch (b) {
          if ((b == null ? void 0 : b.name) === "AbortError") return;
          const I = jn(b);
          if (!(I === "LIVE_TRANSLATION_LAYOUT_NOT_READY" || !I)) {
            y((T) => ({
              ...T,
              connection: d ? "terminal" : "unavailable",
              jobStatus: c,
              error: $t(b, "实时译文暂不可用")
            }));
            return;
          }
          if (d) {
            y((T) => ({
              ...T,
              connection: "terminal",
              jobStatus: c,
              error: ""
            }));
            return;
          }
          y((T) => ({
            ...T,
            connection: "connecting",
            jobStatus: c,
            error: $t(b, "正在等待 OCR 版面数据")
          })), await En(wr[Math.min(S, wr.length - 1)], m.signal).catch(() => {
          }), S += 1;
        }
    };
    return (async () => {
      if (await w(), !v || m.signal.aborted) return;
      let S = 0;
      for (; !m.signal.aborted; ) {
        d || y((b) => ({
          ...b,
          connection: b.lastSeq > 0 ? "reconnecting" : "connecting",
          jobStatus: c,
          // 保留已有错误：首页还没提交（lastSeq 为 0）时恰恰是最容易出错的阶段，
          // 此前这里把它清成空串，UI 于是一直显示「连接中」，用户看到的是
          // "正在努力"，实际可能已经在反复失败。
          error: b.error
        }));
        try {
          await f.streamEvents(l, {
            afterSeq: s.current.lastSeq,
            signal: m.signal,
            onEvent: async (b) => {
              if (b.seq <= s.current.lastSeq) return;
              let I;
              try {
                I = await Ki(
                  l,
                  b,
                  s.current,
                  m.signal,
                  f
                );
              } catch (R) {
                if ((R == null ? void 0 : R.name) === "AbortError" || m.signal.aborted) throw R;
                y((T) => ({
                  ...T,
                  lastSeq: Math.max(T.lastSeq, b.seq),
                  error: $t(R, "部分页面的实时译文暂时取不到")
                }));
                return;
              }
              y((R) => {
                const T = Wi(R, b, I);
                return d ? {
                  ...T,
                  connection: "terminal",
                  jobStatus: c
                } : {
                  ...T,
                  jobStatus: c
                };
              }), S = 0;
            }
          });
        } catch (b) {
          if ((b == null ? void 0 : b.name) === "AbortError" || m.signal.aborted) return;
          y((I) => ({
            ...I,
            connection: d ? "terminal" : "reconnecting",
            jobStatus: c,
            error: $t(b, "实时译文连接已中断，正在重连")
          }));
        }
        if (m.signal.aborted) return;
        if (d) {
          y((b) => ({
            ...b,
            connection: "terminal",
            jobStatus: c
          }));
          return;
        }
        await En(Sr[Math.min(S, Sr.length - 1)], m.signal).catch(() => {
        }), S += 1;
      }
    })(), () => m.abort();
  }, [n, r, l, d]), o;
}
function qi(e) {
  const t = e && typeof e == "object" ? e : {}, n = t.data && typeof t.data == "object" ? t.data : t, r = Array.isArray(n.groups) ? n.groups : [], o = /* @__PURE__ */ new Map();
  for (const a of r) {
    const s = a || {}, i = `${s.value ?? ""}`.trim(), l = Number(s.count) || 0;
    i && l > 0 && o.set(i, l);
  }
  return o;
}
function Gi(e, t = !0) {
  const [n, r] = N(() => /* @__PURE__ */ new Map());
  return D(() => {
    r((i) => i.size ? /* @__PURE__ */ new Map() : i);
    const o = `${e || ""}`.trim();
    if (!t || !o) return;
    const a = Ze().fetchRevisionGroups;
    if (!a) return;
    let s = !1;
    return a(o).then((i) => {
      !s && i && r(qi(i));
    }).catch(() => {
    }), () => {
      s = !0;
    };
  }, [e, t]), n;
}
const Zi = 4500;
function Yi(e) {
  if (typeof e == "number") {
    const r = Number(e);
    return !Number.isFinite(r) || r < 0 ? null : Math.floor(r) + 1;
  }
  if (!e || typeof e != "object") return null;
  const t = e.page_idx;
  if (t != null && `${t}`.trim() !== "") {
    const r = Number(t);
    return !Number.isFinite(r) || r < 0 ? null : Math.floor(r) + 1;
  }
  const n = e.page;
  if (n != null && `${n}`.trim() !== "") {
    const r = Number(n);
    return !Number.isFinite(r) || r < 1 ? null : Math.floor(r);
  }
  return null;
}
const Xi = /* @__PURE__ */ new Set(["book", "translate"]);
function _o(e) {
  return !!(e.jobId && e.sourceUrl && Xi.has(e.workflow));
}
function Qi(e) {
  return !!(_o(e) && !(e.jobStatus === "succeeded" && e.translatedUrl));
}
function el() {
  const e = Us(), t = _o({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    workflow: e.workflow
  }), n = Qi({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    translatedUrl: e.translatedUrl,
    jobStatus: e.jobStatus,
    workflow: e.workflow
  }), r = A({ jobId: "", running: !1 });
  r.current.jobId !== e.jobId && (r.current = { jobId: e.jobId, running: !1 });
  const o = `${e.jobStatus || ""}`.trim().toLowerCase();
  o && !Pt(o) && (r.current.running = !0);
  const a = Ji({
    jobId: e.jobId,
    jobStatus: e.jobStatus,
    enabled: t && (n || r.current.running)
  }), { shellRef: s, shellEl: i, shellWidth: l, bindShell: c } = Ks(), d = Gi(e.jobId, !e.sourceOnly), f = fi({
    documentId: e.documentId,
    jobId: e.jobId
  }), u = `${f}\0${e.jobId}\0${e.sourceUrl}\0${e.translatedUrl}`, { userZoom: m, onZoomChange: v } = bi(e.mode, s, f), h = qs(
    {
      mode: e.mode,
      sourceOnly: e.sourceOnly,
      assetsReady: e.assetsReady,
      sourceUrl: e.sourceUrl,
      translatedUrl: e.translatedUrl,
      sourceFile: e.sourceFile,
      translatedFile: e.translatedFile
    },
    { userZoom: m, shellWidth: l, identityKey: u }
  ), {
    beginModeSwitch: y,
    goToPage: w,
    repinIfRestoring: g
  } = xi(s, {
    primaryPane: h.primaryPane,
    mode: e.mode,
    enabled: !e.boot.loading,
    persistenceKey: f,
    restoreReady: h.primaryNumPages > 0
  });
  D(() => {
    g();
  }, [l, g]);
  const S = Ti(
    s,
    h.compareMode,
    h.rowSyncRevision,
    g
  ), b = Si(
    s,
    h.primaryNumPages,
    !e.boot.loading,
    `${e.mode}-${m}-${h.metricsTick}`,
    h.primaryPane
  ), I = $((F, G) => {
    var X, Q;
    const ee = Math.max(
      Number(h.hudNumPages) || 0,
      Number(h.primaryNumPages) || 0,
      Number((X = h.numPagesByPane) == null ? void 0 : X.source) || 0,
      Number((Q = h.numPagesByPane) == null ? void 0 : Q.translated) || 0
    );
    w(F, ee, G);
  }, [w, h.hudNumPages, h.primaryNumPages, h.numPagesByPane]), [R, T] = N(null), O = A(null), C = $((F) => {
    O.current && clearTimeout(O.current), T(F), F && (O.current = setTimeout(() => T(null), Zi));
  }, []);
  D(() => () => {
    O.current && clearTimeout(O.current);
  }, []);
  const j = $((F) => {
    const G = nn(e.regions, F);
    return G ? ir(G, h.primaryPane).page : null;
  }, [e.regions, h.primaryPane]), E = $((F, G) => {
    const ee = G || h.primaryPane, X = typeof F == "object" && F ? `${F.block_id || ""}`.trim() : "", Q = typeof F == "object" && F ? `${F.image_url || ""}`.trim() : "", fe = typeof F == "object" && F ? F.page_idx != null ? Number(F.page_idx) + 1 : F.page != null ? Number(F.page) : null : typeof F == "number" ? F + 1 : null, le = Ia(e.regions, Q, fe) || nn(e.regions, X) || (typeof F == "object" ? Ra(e.regions, F) : null);
    let ue = le ? ir(le, ee).page : null;
    ue == null && (ue = Yi(F)), !(ue == null || ue < 1) && (C(le), I(ue, ee));
  }, [C, I, h.primaryPane, e.regions]);
  Ui({
    enabled: !e.boot.loading && !e.boot.failed && e.assetsReady,
    syncEnabled: !e.boot.loading && !e.boot.failed && e.assetsReady,
    numPages: h.hudNumPages || 0,
    currentPage: b,
    goToPage: I,
    resolveBlockPage: j,
    jobId: e.jobId,
    documentId: e.documentId,
    regionsSettled: e.regionsSettled,
    onAnchorApplied: (F) => {
      C(nn(e.regions, F.blockId));
    }
  });
  const { setModeKeepingPage: P } = yi({
    mode: e.mode,
    setMode: e.setMode,
    beginModeSwitch: y
  });
  D(() => {
    C(null);
  }, [u, C]);
  const k = !e.boot.loading && !e.boot.failed, M = q(() => ({ bindShell: c, shellEl: i, shellWidth: l, shellRef: s }), [c, i, l, s]), _ = q(() => ({
    sourceUrl: e.sourceUrl,
    translatedUrl: e.translatedUrl,
    sourceFile: e.sourceFile,
    translatedFile: e.translatedFile
  }), [e.sourceUrl, e.translatedUrl, e.sourceFile, e.translatedFile]), U = q(() => ({
    session: e,
    boot: e.boot,
    sourceOnly: e.sourceOnly,
    mode: e.mode,
    userZoom: m,
    onZoomChange: v,
    shell: M,
    panes: h,
    sessionFiles: _,
    rowHeights: S,
    goToPage: I,
    activeRegion: R,
    jumpToAnchor: E,
    setModeKeepingPage: P,
    download: e.download,
    showHud: k,
    viewStateKey: f,
    liveTranslation: a,
    liveTranslationAvailable: n,
    revisedBlocks: d
  }), [e, M, h, _, S, I, R, E, P, k, m, v, f, a, n, d]);
  return q(() => ({
    ...U,
    currentPage: b
  }), [U, b]);
}
const tl = [
  { action: "mode-source", keys: ["1"], mode: "source" },
  { action: "mode-compare", keys: ["2"], mode: "compare" },
  { action: "mode-translated", keys: ["3"], mode: "translated" },
  { action: "zoom-in", keys: ["+", "="] },
  { action: "zoom-out", keys: ["-", "_"] },
  { action: "zoom-reset", keys: ["0"] },
  { action: "next-page", keys: ["j", "ArrowDown", "PageDown"], requiresPages: !0 },
  { action: "prev-page", keys: ["k", "ArrowUp", "PageUp"], requiresPages: !0 },
  { action: "first-page", keys: ["Home"], requiresPages: !0 },
  { action: "last-page", keys: ["End"], requiresPages: !0 }
], nl = [
  {
    title: "翻页",
    items: [
      { actions: ["next-page"], keys: "J · ↓ · PgDn", desc: "下一页" },
      { actions: ["prev-page"], keys: "K · ↑ · PgUp", desc: "上一页" },
      { actions: ["first-page", "last-page"], keys: "Home / End", desc: "首页 / 末页" },
      { actions: [], keys: "点底栏页码", desc: "输入页码跳转" }
    ]
  },
  {
    title: "缩放",
    items: [
      { actions: ["zoom-in", "zoom-out"], keys: "+ / −", desc: "放大 / 缩小" },
      { actions: ["zoom-reset"], keys: "0", desc: "重置为模式默认" },
      { actions: [], keys: "点百分比", desc: "重置为模式默认" }
    ]
  },
  {
    title: "搜索",
    items: [
      { actions: [], keys: "⌘F / Ctrl+F", desc: "在书里搜索（光标已在搜索框时再按，用浏览器自己的查找）" },
      { actions: [], keys: "Enter / Shift+Enter", desc: "下一处 / 上一处" },
      { actions: [], keys: "Esc", desc: "收起搜索" }
    ]
  },
  {
    title: "画笔",
    items: [
      { actions: [], keys: "P", desc: "进入 / 退出画笔（书页上右键也能选笔和颜色）" },
      { actions: [], keys: "Esc", desc: "退出画笔" },
      { actions: [], keys: "⌘Z / Ctrl+Z", desc: "画笔模式下撤销" },
      { actions: [], keys: "Shift+右键", desc: "浏览器自己的右键菜单" }
    ]
  },
  {
    title: "待处理",
    items: [
      { actions: [], keys: "N / Shift+N", desc: "跳到下一处 / 上一处要看一眼的段落（底栏「待处理」）" }
    ]
  },
  {
    title: "模式",
    items: [
      { actions: ["mode-source"], keys: "1", desc: "原文" },
      { actions: ["mode-compare"], keys: "2", desc: "对照" },
      { actions: ["mode-translated"], keys: "3", desc: "译文" }
    ]
  },
  {
    title: "改译文",
    items: [
      { actions: [], keys: "E", desc: "改鼠标停着的那一段" },
      { actions: [], keys: "Alt+↑ / Alt+↓", desc: "改上一段 / 下一段" },
      { actions: [], keys: "⌘Enter / Ctrl+Enter", desc: "保存" }
    ]
  }
];
function rl(e) {
  const t = e.length === 1 ? e.toLowerCase() : e;
  for (const n of tl)
    if (n.keys.some(
      (o) => o.length === 1 ? o === t : o === e
    )) return n;
  return null;
}
function ol(e) {
  if (!(e instanceof HTMLElement))
    return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
const al = ".reader-notes-panel";
function sl(e) {
  return e instanceof Element ? !!e.closest(al) : !1;
}
function il(e) {
  const {
    mode: t,
    sourceOnly: n,
    setMode: r,
    userZoom: o,
    onZoomChange: a,
    currentPage: s,
    numPages: i,
    goToPage: l,
    enabled: c = !0
  } = e;
  D(() => {
    if (!c)
      return;
    const d = (f) => {
      if (f.defaultPrevented || f.metaKey || f.ctrlKey || f.altKey || ol(f.target) || sl(f.target))
        return;
      const u = f.key, m = rl(u);
      if (m) {
        if (m.mode) {
          if (n && m.mode !== "source")
            return;
          f.preventDefault(), r(m.mode);
          return;
        }
        if (!(m.requiresPages && i <= 0))
          switch (f.preventDefault(), m.action) {
            case "zoom-in":
              a(kt(o, 1));
              return;
            case "zoom-out":
              a(kt(o, -1));
              return;
            case "zoom-reset":
              a(ut(t, et()));
              return;
            case "next-page":
              l(Zt(s + 1, i));
              return;
            case "prev-page":
              l(Zt(s - 1, i));
              return;
            case "first-page":
              l(1);
              return;
            case "last-page":
              l(i);
              return;
          }
      }
    };
    return window.addEventListener("keydown", d), () => window.removeEventListener("keydown", d);
  }, [
    c,
    t,
    n,
    r,
    o,
    a,
    s,
    i,
    l
  ]);
}
const ll = "retainpdf:soft-reader-close";
function cl() {
  return new URL("./index.html", window.location.href).href;
}
function dl() {
  if (typeof window > "u" || window.self === window.top) return !1;
  try {
    return window.parent.postMessage(
      { type: ll },
      window.location.origin
    ), !0;
  } catch {
    return !1;
  }
}
function ul(e, t, n) {
  if (n <= 1 || !e) return !1;
  try {
    const r = new URL(t), o = new URL(e, r);
    return o.origin === r.origin && !/reader\.html$/i.test(o.pathname) && !/detail\.html$/i.test(o.pathname);
  } catch {
    return !1;
  }
}
function fl() {
  if (!(typeof window > "u") && !dl()) {
    if (ul(
      document.referrer,
      window.location.href,
      window.history.length
    )) {
      window.history.back();
      return;
    }
    window.location.assign(cl());
  }
}
function ml({
  id: e,
  className: t,
  label: n,
  pressed: r,
  onClick: o,
  children: a
}) {
  return /* @__PURE__ */ p("button", { id: e, type: "button", className: t, "aria-label": n, title: n, "aria-pressed": r, onClick: o, children: a });
}
function hl({ onBeforeClose: e } = {}) {
  return /* @__PURE__ */ L(ml, { id: "reader-close-home-btn", className: "reader-close-home-btn", label: "返回主页", onClick: () => {
    e == null || e(), fl();
  }, children: [
    /* @__PURE__ */ p(bt, { className: "reader-close-home-icon", size: 18, strokeWidth: 2.25, "aria-hidden": !0 }),
    /* @__PURE__ */ p("span", { className: "reader-close-home-label", children: "关闭" })
  ] });
}
let Ir = !1;
function pl() {
  if (Ir)
    return;
  const e = Tt().resolvePdfjsVendorUrl("build/pdf.worker.mjs");
  e && (ho.GlobalWorkerOptions.workerSrc = e, Ir = !0);
}
async function gl(e) {
  var n;
  const t = `${e || ""}`;
  if (!t.trim()) return !1;
  try {
    if ((n = navigator.clipboard) != null && n.writeText)
      return await navigator.clipboard.writeText(t), !0;
  } catch {
  }
  try {
    const r = document.createElement("textarea");
    r.value = t, r.setAttribute("readonly", ""), r.style.position = "fixed", r.style.opacity = "0", document.body.appendChild(r), r.select();
    const o = document.execCommand("copy");
    return r.remove(), o;
  } catch {
    return !1;
  }
}
function de(e) {
  return typeof e == "string" ? e : "";
}
function bl(e) {
  return `${e || ""}`.trim().startsWith("merged-");
}
function yl(e) {
  const t = /^p(\d+)-/.exec(`${e || ""}`.trim());
  return t ? Number(t[1]) : 0;
}
function vl(e) {
  return {
    source: de(e == null ? void 0 : e.source_text) || de(e == null ? void 0 : e.unit_source_text),
    translated: de(e == null ? void 0 : e.protected_translated_text) || de(e == null ? void 0 : e.translated_text)
  };
}
const wl = {
  user: "手改",
  agent: "助手改",
  refine: "精修"
};
function Lo(e) {
  const t = e && typeof e == "object" ? e : {}, n = t.data && typeof t.data == "object" && !Array.isArray(t.data) ? t.data : t;
  return (Array.isArray(n.rows) ? n.rows : Array.isArray(n.revisions) ? n.revisions : []).filter((o) => !!o && typeof o == "object");
}
function Sl(e) {
  const t = Lo(e).sort((r, o) => de(r.ts).localeCompare(de(o.ts)));
  return t.length ? [
    { text: de(t[0].previous_text), label: "初译", ts: "", reason: "" },
    ...t.map((r) => ({
      text: de(r.new_text),
      label: wl[de(r.source)] || de(r.source) || "修订",
      ts: de(r.ts),
      reason: de(r.reason)
    }))
  ].reverse() : [];
}
function Il(e) {
  const t = new Date(e);
  if (!e || Number.isNaN(t.getTime())) return e || "";
  const n = (r) => `${r}`.padStart(2, "0");
  return `${t.getMonth() + 1}月${t.getDate()}日 ${n(t.getHours())}:${n(t.getMinutes())}`;
}
function Rl(e) {
  const t = e && typeof e == "object" ? e : {}, n = t.data && typeof t.data == "object" ? t.data : t, r = n.timestamps && typeof n.timestamps == "object" ? n.timestamps : {};
  return de(r.finished_at) || de(n.finished_at) || "";
}
function El(e, t) {
  const n = /* @__PURE__ */ new Map(), r = new Date(t).getTime();
  if (!t || Number.isNaN(r)) return n;
  const o = Lo(e).sort((a, s) => de(a.ts).localeCompare(de(s.ts)));
  for (const a of o) {
    const s = new Date(de(a.ts)).getTime(), i = de(a.reader_item_id) || de(a.item_id);
    !i || Number.isNaN(s) || s <= r || n.set(i, de(a.new_text));
  }
  return n;
}
const Pl = {
  empty_translation: "译文是空的",
  math_delimiter_unbalanced: "公式的 $ 或括号不成对",
  unexpected_placeholder: "多出了原文里没有的占位符",
  placeholder_inventory_mismatch: "占位符（公式、引用）和原文对不上，可能删掉或改坏了",
  english_residue: "还留着没翻的英文",
  mixed_english_residue: "中英文混在一起",
  protocol_shell_output: "混进了模型输出的格式标记",
  truncated_translation: "译文像是被截断了",
  context_bleed: "混进了别的段落的内容",
  formula_commands_dropped: "公式里的命令丢了",
  glossary_term_missing: "没用术语表规定的译法"
};
function Tl(e) {
  return Array.isArray(e) ? e.filter((t) => t && typeof t == "object" && t.severity !== "warning").map((t) => {
    const n = t, r = Pl[de(n.kind)] || de(n.kind) || "问题", o = de(n.message).trim();
    return o && o !== r ? `${r}（${o}）` : r;
  }) : [];
}
const kl = /* @__PURE__ */ new Set(["text", "formula"]);
function Bn(e) {
  return kl.has(e);
}
function Nl(e, t) {
  const n = (e || []).find((r) => (r == null ? void 0 : r.itemId) === t);
  return !n || Bn(Lt(n));
}
function Ml(e) {
  const t = [], n = /* @__PURE__ */ new Set();
  for (const r of e || []) {
    const o = `${(r == null ? void 0 : r.itemId) || ""}`.trim();
    !o || n.has(o) || !Bn(Lt(r)) || (n.add(o), t.push(o));
  }
  return t;
}
const Al = 300, _l = 72;
function Ll(e, t) {
  if (e.width >= Al && e.height >= _l)
    return { mode: "inline", left: e.left, top: e.top, width: e.width, minHeight: e.height };
  const n = Math.max(240, Math.min(Math.max(e.width, 360), t.width - 16)), r = Math.max(8, Math.min(e.left, t.width - n - 8)), o = 6, a = e.top + e.height + o;
  return t.height - a >= 260 ? { mode: "popout", left: r, width: n, top: a } : { mode: "popout", left: r, width: n, bottom: t.height - e.top + o };
}
const Cl = /* @__PURE__ */ new Set(["text", "formula", "table", "figure"]);
function xl(e, t, n) {
  return e.flatMap((r) => {
    if (!Cl.has(Lt(r.region))) return [];
    const o = Dn(r, t, n);
    return o ? [{ itemId: r.itemId, highlight: r, rect: o }] : [];
  });
}
function Rr(e, t, n) {
  let r = null, o = Number.POSITIVE_INFINITY;
  for (const a of e) {
    const { rect: s } = a;
    if (t < s.left || t > s.left + s.width || n < s.top || n > s.top + s.height)
      continue;
    const i = s.width * s.height;
    i < o && (r = a, o = i);
  }
  return r;
}
const Xe = "reader-text-hover-copy", Dl = "reader-text-hover-edit", zl = "reader-text-hover-id";
function Ol(e = typeof window > "u" ? "" : window.location.search) {
  try {
    const t = new URLSearchParams(e).get("debug");
    return t === "1" || t === "true";
  } catch {
    return !1;
  }
}
const Co = "reader-text-hover-tools";
function De({
  className: e,
  state: t,
  label: n,
  title: r,
  onClick: o,
  children: a
}) {
  return /* @__PURE__ */ p(
    "button",
    {
      type: "button",
      className: e,
      "data-copy-state": t,
      "aria-label": n,
      title: r,
      onPointerDown: (s) => s.stopPropagation(),
      onClick: o,
      children: a
    }
  );
}
function $l(e) {
  const t = e.assetUrls[0] || e.assetIds[0] || "";
  if (!t) return "";
  try {
    return ms("", t);
  } catch {
    return t;
  }
}
async function Un(e) {
  const t = await os(e);
  if (!t.ok) throw new Error(`图片加载失败（${t.status}）`);
  return t.blob();
}
async function Fl(e) {
  var n;
  if (e.type === "image/png") return e;
  const t = URL.createObjectURL(e);
  try {
    const r = new Image();
    r.src = t, await r.decode();
    const o = document.createElement("canvas");
    return o.width = r.naturalWidth, o.height = r.naturalHeight, (n = o.getContext("2d")) == null || n.drawImage(r, 0, 0), await new Promise((a, s) => {
      o.toBlob((i) => i ? a(i) : s(new Error("图片转换失败")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(t);
  }
}
async function jl(e) {
  var n;
  if (!e || !((n = navigator.clipboard) != null && n.write) || typeof ClipboardItem > "u") return !1;
  const t = await Fl(await Un(e));
  return await navigator.clipboard.write([new ClipboardItem({ "image/png": t })]), !0;
}
async function Bl(e) {
  const t = URL.createObjectURL(await Un(e)), n = document, r = n.createElement("div");
  r.className = "reader-pdf-image-preview", r.setAttribute("role", "dialog"), r.setAttribute("aria-modal", "true"), r.setAttribute("aria-label", "图片预览");
  const o = n.createElement("div");
  o.className = "reader-pdf-image-preview-panel";
  const a = n.createElement("button");
  a.type = "button", a.className = "reader-pdf-image-preview-close", a.textContent = "关闭", a.setAttribute("aria-label", "关闭图片预览");
  const s = n.createElement("img");
  s.src = t, s.alt = "PDF 图片预览";
  const i = () => {
    n.removeEventListener("keydown", l, !0), URL.revokeObjectURL(t), r.remove();
  }, l = (c) => {
    c.key === "Escape" && (c.preventDefault(), i());
  };
  a.onclick = i, r.onclick = (c) => {
    c.target === r && i();
  }, o.append(a, s), r.append(o), n.body.append(r), n.addEventListener("keydown", l, !0), a.focus();
}
async function Ul(e) {
  const t = URL.createObjectURL(await Un(e)), n = document.createElement("a");
  n.href = t, n.download = "paperloom-image", n.click(), window.setTimeout(() => URL.revokeObjectURL(t), 6e4);
}
function Hl(e) {
  if (typeof DOMParser > "u" || !/<table(?:\s|>)/i.test(e)) return [];
  const t = new DOMParser().parseFromString(e, "text/html").querySelector("table");
  return t ? [...t.rows].map((n) => [...n.cells].map((r) => {
    var o;
    return ((o = r.textContent) == null ? void 0 : o.replace(/\s+/g, " ").trim()) || "";
  })) : [];
}
function Wl(e) {
  const t = Hl(e);
  if (t.length) return t;
  const n = e.trim().split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  return n.length ? n.some((r) => r.includes("|")) ? n.filter((r) => !/^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/.test(r)).map((r) => r.replace(/^\|\s*/, "").replace(/\s*\|$/, "").split("|").map((o) => o.trim())) : n.some((r) => r.includes("	")) ? n.map((r) => r.split(/\t+/).map((o) => o.trim())) : n.map((r) => [r]) : [];
}
function Vl(e) {
  return e.replace(/[\\&%$#_{}~^]/g, (t) => ({
    "\\": "\\textbackslash{}",
    "&": "\\&",
    "%": "\\%",
    $: "\\$",
    "#": "\\#",
    _: "\\_",
    "{": "\\{",
    "}": "\\}",
    "~": "\\textasciitilde{}",
    "^": "\\textasciicircum{}"
  })[t] || `\\${t}`);
}
function an(e, t, n) {
  const o = (t === "translated" ? e.translated : e.source).text.trim() || e.markdown.trim();
  if (n === "text") return gn(e, t);
  const a = Wl(o);
  if (!a.length) return gn(e, t);
  const s = Math.max(...a.map((l) => l.length)), i = a.map((l) => Array.from({ length: s }, (c, d) => l[d] || ""));
  if (n === "markdown") {
    const l = `| ${i[0].join(" | ")} |`, c = `| ${i[0].map(() => "---").join(" | ")} |`;
    return [l, c, ...i.slice(1).map((d) => `| ${d.join(" | ")} |`)].join(`
`);
  }
  return [
    `\\begin{tabular}{${"l".repeat(s)}}`,
    ...i.map((l) => `${l.map(Vl).join(" & ")} \\\\`),
    "\\end{tabular}"
  ].join(`
`);
}
const Kl = 26, Jl = 220;
function ql(e, t = Jl) {
  return e.height < Kl * 2 || e.width < t;
}
function Gl({ state: e }) {
  return /* @__PURE__ */ p(e === "copied" ? io : e === "failed" ? bt : Ma, { size: 13, strokeWidth: 2.2, "aria-hidden": !0 });
}
function Zl({
  target: e,
  pane: t = "source",
  revisedCount: n = 0,
  onEdit: r,
  frameRect: o,
  placement: a,
  tailTop: s = 0
}) {
  const [i, l] = N("idle"), [c, d] = N("idle"), [f] = N(() => Ol()), u = A([]), m = (e == null ? void 0 : e.itemId) || "";
  if (D(() => {
    l("idle"), d("idle");
    const R = u.current;
    return () => {
      R.forEach((T) => window.clearTimeout(T)), u.current = [];
    };
  }, [m]), !e) return null;
  const v = gn(e.highlight.region, t), h = Lt(e.highlight.region), y = h === "figure" ? $l(e.highlight.region) : "", w = (R, T) => async (O) => {
    O.preventDefault(), O.stopPropagation();
    const C = await gl(R);
    T(C ? "copied" : "failed"), u.current.push(window.setTimeout(() => T("idle"), 1200));
  }, g = h === "formula" ? "复制 LaTeX" : "复制", S = o || e.rect, b = a || (ql(S) ? "outside" : "inside"), I = async (R, T) => {
    if (T.preventDefault(), T.stopPropagation(), !y) {
      l("failed");
      return;
    }
    try {
      if (R === "copy") {
        if (!await jl(y)) throw new Error("图片复制不可用");
      } else R === "open" ? await Bl(y) : await Ul(y);
      l("copied");
    } catch {
      l("failed");
    }
    u.current.push(window.setTimeout(() => l("idle"), 1200));
  };
  return /* @__PURE__ */ p("div", { className: "reader-text-hover-layer", children: /* @__PURE__ */ p(
    "div",
    {
      className: "reader-text-hover-frame",
      "data-reader-text-hover-id": e.itemId,
      "data-reader-text-hover-kind": h,
      style: S,
      children: /* @__PURE__ */ L(
        "div",
        {
          className: Co,
          "data-placement": b,
          style: b === "tail" ? { top: s } : void 0,
          children: [
            f ? /* @__PURE__ */ p(
              De,
              {
                className: zl,
                state: c,
                label: `复制翻译编号 ${e.itemId}`,
                title: "翻译编号，点击复制",
                onClick: w(e.itemId, d),
                children: c === "copied" ? "已复制编号" : e.itemId
              }
            ) : null,
            t === "translated" && r && Bn(h) ? /* @__PURE__ */ p(
              De,
              {
                className: Dl,
                state: "idle",
                label: "改这段译文",
                title: n > 0 ? `改这段译文（E；改过 ${n} 次）` : "改这段译文（E）",
                onClick: (R) => {
                  R.preventDefault(), R.stopPropagation(), r(e.itemId);
                },
                children: /* @__PURE__ */ p(zn, { size: 13, strokeWidth: 2.2, "aria-hidden": !0 })
              }
            ) : null,
            h === "table" ? /* @__PURE__ */ L($e, { children: [
              /* @__PURE__ */ p(
                De,
                {
                  className: `${Xe} is-labeled`,
                  state: i,
                  label: "复制表格",
                  title: "复制表格",
                  onClick: w(an(e.highlight.region, t === "translated" ? "translated" : "source", "text"), l),
                  children: i === "copied" ? "已复制" : i === "failed" ? "复制失败" : "复制表格"
                }
              ),
              /* @__PURE__ */ p(
                De,
                {
                  className: `${Xe} is-labeled`,
                  state: i,
                  label: "复制表格为 Markdown",
                  title: "复制表格为 Markdown",
                  onClick: w(an(e.highlight.region, t === "translated" ? "translated" : "source", "markdown"), l),
                  children: "Markdown"
                }
              ),
              /* @__PURE__ */ p(
                De,
                {
                  className: `${Xe} is-labeled`,
                  state: i,
                  label: "复制表格为 LaTeX",
                  title: "复制表格为 LaTeX",
                  onClick: w(an(e.highlight.region, t === "translated" ? "translated" : "source", "latex"), l),
                  children: "LaTeX"
                }
              )
            ] }) : h === "figure" ? /* @__PURE__ */ L($e, { children: [
              /* @__PURE__ */ p(
                De,
                {
                  className: `${Xe} is-labeled`,
                  state: i,
                  label: "复制图片",
                  title: "复制图片",
                  onClick: (R) => void I("copy", R),
                  children: i === "copied" ? "已复制" : i === "failed" ? "复制失败" : "复制图片"
                }
              ),
              /* @__PURE__ */ p(
                De,
                {
                  className: `${Xe} is-labeled`,
                  state: i,
                  label: "放大图片",
                  title: "放大图片",
                  onClick: (R) => void I("open", R),
                  children: "放大"
                }
              ),
              /* @__PURE__ */ p(
                De,
                {
                  className: `${Xe} is-labeled`,
                  state: i,
                  label: "下载图片",
                  title: "下载图片",
                  onClick: (R) => void I("download", R),
                  children: "下载"
                }
              )
            ] }) : v ? /* @__PURE__ */ p(
              De,
              {
                className: Xe,
                state: i,
                label: t === "translated" ? "复制这段译文" : "复制这段原文",
                title: i === "copied" ? "已复制" : i === "failed" ? "复制失败" : g,
                onClick: w(v, l),
                children: /* @__PURE__ */ p(Gl, { state: i })
              }
            ) : null
          ]
        }
      )
    }
  ) });
}
function Yl(e, t) {
  const n = e.page_idx + 1, r = {
    page: n,
    bbox: t.bbox,
    unit: "pdf_point",
    origin: "top_left",
    text: t.source_text
  }, o = {
    itemId: t.item_id,
    source: r,
    translated: r,
    markdown: t.source_text,
    regionType: t.kind,
    status: "live_translation",
    assetIds: [],
    assetUrls: []
  };
  return {
    itemId: t.item_id,
    region: o,
    box: r,
    pageSize: { page: n, width: e.width, height: e.height }
  };
}
function Xl(e, t, n, r) {
  if (!e || !t) return [];
  const o = [];
  for (const a of e.blocks) {
    const s = t.itemsById.get(a.item_id);
    if (!(s != null && s.translated_text)) continue;
    const i = Dn(
      Yl(e, a),
      n,
      r
    );
    i && o.push({
      itemId: a.item_id,
      translatedText: s.translated_text,
      status: s.status,
      kind: a.kind,
      sourceText: a.source_text,
      typography: a.typography,
      rect: i,
      changedAtSeq: t.changedAtSeqById.get(a.item_id) || 0,
      changedNow: t.changedAtSeqById.get(a.item_id) === t.lastEventSeq
    });
  }
  return o;
}
const Ql = '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif', ec = 256, wt = /* @__PURE__ */ new Map();
function tc(e) {
  return `${e || ""}`.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function xo(e) {
  const t = `${e || ""}`, { text: n, slots: r } = Ya(t, { bareLatex: !0 }), o = tc(n), a = Xa(o, r);
  if (!r.length)
    return { fallbackHtml: a, richHtml: Promise.resolve(a), hasMath: !1 };
  let s = wt.get(t);
  if (!s && (s = Qa(o, r, { preserveSource: !1 }), wt.set(t, s), wt.size > ec)) {
    const i = wt.keys().next().value;
    i !== void 0 && wt.delete(i);
  }
  return { fallbackHtml: a, richHtml: s, hasMath: !0 };
}
function sn(e) {
  return /title|heading|header|display_formula|equation/i.test(e);
}
function ze(e) {
  const t = Number(e);
  return Number.isFinite(t) && t > 0 ? t : void 0;
}
function nc(e, t) {
  const n = e.typography, r = ze(t) || 1, o = ze(n == null ? void 0 : n.font_size_pt), a = Math.max(1, `${e.sourceText || ""}`.split(/\n+/).length), s = e.rect.height / Math.max(1.28, a * 1.18), i = sn(e.kind) ? 24 : /caption|footnote|table/i.test(e.kind) ? 9.5 : 11, l = Math.max(5.5 * r, Math.min(s, i * r)), c = ze(n == null ? void 0 : n.fit_min_font_size_pt), d = ze(n == null ? void 0 : n.fit_max_font_size_pt), f = Math.max(3.5, (c || 5.5) * r), u = Math.max(
    f,
    d ? d * r : o ? o * r : l
  ), m = o ? o * r : l, v = ze(n == null ? void 0 : n.leading_em), h = [
    ze(n == null ? void 0 : n.padding_top_pt) || 0,
    ze(n == null ? void 0 : n.padding_right_pt) || 0,
    ze(n == null ? void 0 : n.padding_bottom_pt) || 0,
    ze(n == null ? void 0 : n.padding_left_pt) || 0
  ].map((y) => y * r);
  return {
    fontFamily: `${(n == null ? void 0 : n.font_family) || ""}`.trim() || Ql,
    fontSizePx: Math.max(f, Math.min(u, m)),
    minFontSizePx: f,
    maxFontSizePx: u,
    // Typst leading is the additional inter-line gap, unlike CSS line-height.
    lineHeight: v ? 1 + v : 1.3,
    fontWeight: (n == null ? void 0 : n.font_weight) || (sn(e.kind) ? 600 : 400),
    textAlign: ["left", "center", "right", "justify"].includes(`${(n == null ? void 0 : n.text_align) || ""}`) ? n == null ? void 0 : n.text_align : sn(e.kind) ? "center" : "justify",
    padding: h,
    exact: !!o
  };
}
function rc(e, t, n, r) {
  const { minFontSizePx: o, maxFontSizePx: a } = r, s = /* @__PURE__ */ new Map(), i = (f) => {
    const u = s.get(f);
    if (u !== void 0) return u;
    const { width: m, height: v } = e(f), h = m <= t + 0.5 && v <= n + 0.5;
    return s.set(f, h), h;
  };
  let l = o, c = a, d = Math.min(r.requestedFontSizePx, c);
  if (i(d)) {
    if (!r.exact) {
      l = d;
      for (let f = 0; f < 6 && c > l; f += 1) {
        const u = (l + c) / 2;
        i(u) ? (d = u, l = u) : c = u;
      }
    }
  } else {
    c = d, d = l;
    for (let f = 0; f < 8 && c > l; f += 1) {
      const u = (l + c) / 2;
      i(u) ? (d = u, l = u) : c = u;
    }
  }
  return Math.max(o, d);
}
const oc = 512, St = /* @__PURE__ */ new Map();
let Pn = 0;
typeof document < "u" && document.fonts && (document.fonts.ready.then(() => {
  Pn += 1;
}).catch(() => {
}), typeof document.fonts.addEventListener == "function" && document.fonts.addEventListener("loadingdone", () => {
  Pn += 1;
}));
function ac(e, t, n, r) {
  return [
    Pn,
    r.fontFamily,
    r.fontWeight,
    r.lineHeight,
    r.textAlign,
    r.minFontSizePx,
    r.maxFontSizePx,
    r.fontSizePx,
    r.exact ? 1 : 0,
    t,
    n,
    e
  ].join("");
}
function Do({ item: e, pageScale: t }) {
  const n = A(null), r = q(
    () => xo(e.translatedText),
    [e.translatedText]
  ), [o, a] = N(r.fallbackHtml), s = q(
    () => nc(e, t),
    [e, t]
  );
  D(() => {
    let f = !0;
    return a(r.fallbackHtml), r.hasMath && r.richHtml.then((u) => {
      f && a(u);
    }), () => {
      f = !1;
    };
  }, [r]), Ee(() => {
    const f = n.current;
    if (!f) return;
    const [u, m, v, h] = s.padding, y = Math.max(1, e.rect.width - h - m), w = Math.max(1, e.rect.height - u - v), g = ac(o, y, w, s);
    let S = St.get(g);
    if (S === void 0 && (S = rc(
      (b) => (f.style.fontSize = `${b}px`, { width: f.scrollWidth, height: f.scrollHeight }),
      y,
      w,
      {
        minFontSizePx: s.minFontSizePx,
        maxFontSizePx: s.maxFontSizePx,
        requestedFontSizePx: s.fontSizePx,
        exact: s.exact
      }
    ), St.set(g, S), St.size > oc)) {
      const b = St.keys().next().value;
      b !== void 0 && St.delete(b);
    }
    f.style.fontSize = `${S.toFixed(2)}px`;
  }, [o, e.rect.height, e.rect.width, s]);
  const [i, l, c, d] = s.padding;
  return /* @__PURE__ */ p(
    "div",
    {
      className: `reader-live-translation-item${e.changedNow ? " is-changed" : ""}`,
      "data-live-translation-item": e.itemId,
      "data-live-translation-kind": e.kind,
      "data-live-translation-status": e.status,
      "data-live-translation-typography": s.exact ? "typst" : "fitted",
      style: {
        ...e.rect,
        padding: `${i}px ${l}px ${c}px ${d}px`
      },
      children: /* @__PURE__ */ p(
        "div",
        {
          ref: n,
          className: "reader-live-translation-content",
          style: {
            fontFamily: s.fontFamily,
            fontSize: s.fontSizePx,
            fontWeight: s.fontWeight,
            lineHeight: s.lineHeight,
            textAlign: s.textAlign
          },
          dangerouslySetInnerHTML: { __html: o }
        }
      )
    }
  );
}
function sc({
  layoutPage: e,
  pageState: t,
  width: n,
  height: r
}) {
  const o = q(
    () => Xl(e, t, n, r),
    [r, e, t, n]
  );
  return o.length ? /* @__PURE__ */ p(
    "div",
    {
      className: "reader-live-translation-overlay",
      "data-live-translation-page": e == null ? void 0 : e.page_idx,
      "data-live-translation-generation": t == null ? void 0 : t.generation,
      "aria-hidden": "true",
      children: o.map((a) => /* @__PURE__ */ p(
        Do,
        {
          item: a,
          pageScale: e != null && e.width ? n / e.width : 1
        },
        `${a.itemId}:${a.changedAtSeq}`
      ))
    }
  ) : null;
}
const ic = Xt(sc);
function lc({
  targets: e,
  edits: t,
  width: n,
  excludeId: r
}) {
  const o = e.filter((a) => t.has(a.itemId) && a.itemId !== r);
  return o.length ? /* @__PURE__ */ p("div", { className: "reader-live-translation-overlay reader-edited-overlay", "aria-hidden": "true", children: o.map((a) => {
    const s = a.highlight.pageSize.width;
    return /* @__PURE__ */ L("div", { className: "reader-edited-block", "data-reader-edited-id": a.itemId, children: [
      /* @__PURE__ */ p(
        Do,
        {
          item: {
            itemId: a.itemId,
            translatedText: t.get(a.itemId) || "",
            status: "edited",
            kind: Lt(a.highlight.region),
            sourceText: a.highlight.box.text || "",
            rect: a.rect,
            changedAtSeq: 0,
            changedNow: !1
          },
          pageScale: s > 0 ? n / s : 1
        }
      ),
      /* @__PURE__ */ p("span", { className: "reader-edited-badge", style: { left: a.rect.left, top: a.rect.top }, children: "待排版" })
    ] }, a.itemId);
  }) }) : null;
}
const cc = Xt(lc), zo = 24, We = zo * 2 + 4, Oe = 24, dc = 4, uc = 6, tt = (e) => e.left + e.width, Ge = (e) => e.top + e.height;
function It(e, t) {
  const n = Math.min(tt(e), tt(t)) - Math.max(e.left, t.left), r = Math.min(Ge(e), Ge(t)) - Math.max(e.top, t.top);
  return n > 1 && r > 1 ? n * r : 0;
}
const Er = (e, t) => {
  const n = e.left + e.width / 2, r = e.top + e.height / 2;
  return n >= t.left && n <= tt(t) && r >= t.top && r <= Ge(t);
}, fc = (e) => e.height > 40 && e.height > e.width * 2.5;
function mc(e, t, n) {
  if (!t.length || e.height < Oe || e.width < n + 8) return null;
  const r = Math.max(...t.map(Ge)), o = tt(e) - 4 - n;
  for (const a of [r, Ge(e) - 2]) {
    const s = Math.max(e.top, a - Oe), i = { left: o, top: s, width: n, height: Oe };
    if (!t.some((l) => It(i, l) > 0)) return s - e.top;
  }
  return null;
}
function hc(e, t) {
  const n = [], r = (a) => {
    const s = zo + dc, i = e.top - 2;
    n.push({ placement: "side-right", overhang: a, box: { left: tt(e), top: i, width: s, height: We } }), n.push({ placement: "side-left", overhang: a, box: { left: e.left - s, top: i, width: s, height: We } });
  };
  r(!1), n.push({ placement: "outside", box: { left: e.left - 2, top: e.top - Oe - 3, width: We, height: Oe + 3 } }), n.push({ placement: "below", box: { left: e.left - 2, top: Ge(e), width: We, height: Oe + 3 } }), r(!0);
  const o = mc(e, t, We);
  return o !== null && n.push({ placement: "tail", tailTop: o, box: { left: tt(e) - 4 - We, top: e.top + o, width: We, height: Oe } }), n;
}
function pc(e) {
  const { frame: t, others: n, pageWidth: r, pageHeight: o, glyphs: a = [] } = e, s = a.filter((g) => g.width > 0 && g.height > 0 && !fc(g)), i = s.filter((g) => Er(g, t)), l = s.filter((g) => !Er(g, t)), c = n.filter((g) => g !== t && It(g, t) < t.width * t.height * 0.5), d = hc(t, i).filter(({ box: g, overhang: S }) => {
    const b = S ? uc : 0;
    return g.left >= -b && tt(g) <= r + b && g.top >= 0 && Ge(g) <= o;
  }), f = ({ placement: g, tailTop: S }) => S === void 0 ? { placement: g } : { placement: g, tailTop: S }, u = ({ box: g }) => !l.some((S) => It(g, S) > 0), m = d.filter((g) => g.placement !== "tail"), v = m.find((g) => u(g) && !c.some((S) => It(g.box, S) > 0));
  if (v) return f(v);
  const h = m.find(u) || d.find((g) => g.placement === "tail" && u(g));
  if (h) return f(h);
  let y = null, w = Number.POSITIVE_INFINITY;
  for (const g of d) {
    const S = l.reduce((b, I) => b + It(g.box, I), 0);
    S < w && (y = g, w = S);
  }
  return y ? f(y) : { placement: "outside" };
}
function gc(e, t, n) {
  if (!e) return !1;
  const { rect: r, placement: o } = e;
  if (o !== "outside" && o !== "below") return !1;
  const a = o === "outside" ? r.top - Oe - 3 : Ge(r);
  return t >= r.left - 4 && t <= r.left + We + 4 && n >= a && n <= a + Oe + 3;
}
const ln = (e) => e.left + e.width, cn = (e) => e.top + e.height;
function bc(e, t, n = 3, r = 6) {
  let o = 1 / 0, a = 1 / 0, s = -1 / 0, i = -1 / 0;
  for (const c of t) {
    if (c.width <= 0 || c.height <= 0) continue;
    const d = c.left + c.width / 2, f = c.top + c.height / 2;
    d < e.left || d > ln(e) || f < e.top || f > cn(e) || (o = Math.min(o, c.left), a = Math.min(a, c.top), s = Math.max(s, ln(c)), i = Math.max(i, cn(c)));
  }
  if (!Number.isFinite(o)) return e;
  const l = {
    left: Math.max(e.left - r, o - n),
    top: Math.max(e.top - r, a - n),
    width: 0,
    height: 0
  };
  return l.width = Math.min(ln(e) + r, s + n) - l.left, l.height = Math.min(cn(e) + r, i + n) - l.top, l.width * l.height < e.width * e.height * 0.3 && l.height < 24 ? e : l;
}
function yc(e) {
  const t = e.getBoundingClientRect();
  return Array.from(e.querySelectorAll(".textLayer span")).flatMap((n) => {
    var o;
    if (!((o = n.textContent) != null && o.trim())) return [];
    const r = n.getBoundingClientRect();
    return [{ left: r.left - t.left, top: r.top - t.top, width: r.width, height: r.height }];
  });
}
function vc(e, t, n, r) {
  const [o, a] = N(null);
  return Ee(() => {
    if (!t) {
      a(null);
      return;
    }
    const s = e.current, i = s ? yc(s) : [], l = i.length ? bc(t.rect, i) : t.rect, c = n.filter((f) => f.itemId !== t.itemId).map((f) => f.rect), d = (s == null ? void 0 : s.clientHeight) || Number.POSITIVE_INFINITY;
    a({ rect: l, ...pc({ frame: l, others: c, pageWidth: r, pageHeight: d, glyphs: i }) });
  }, [e, r, t, n]), o && t ? o : null;
}
const Oo = [
  { key: "danger", label: "红" },
  { key: "accent", label: "墨" },
  { key: "ok", label: "绿" },
  { key: "gold", label: "黄" }
], Pr = { pen: 35e-4, highlighter: 0.018 }, Tr = 0.015, Tn = "retainpdf.reader.ink.v1:";
function kr(e) {
  var t;
  if (!e) return [];
  try {
    const n = (t = globalThis.localStorage) == null ? void 0 : t.getItem(Tn + e), r = n ? JSON.parse(n) : [];
    return Array.isArray(r) ? r.filter((o) => o && Array.isArray(o.points)) : [];
  } catch {
    return [];
  }
}
function wc(e, t) {
  var n, r;
  if (e)
    try {
      t.length ? (n = globalThis.localStorage) == null || n.setItem(Tn + e, JSON.stringify(t)) : (r = globalThis.localStorage) == null || r.removeItem(Tn + e);
    } catch {
    }
}
function Sc(e, t, n, r, o, a) {
  const s = Tr * Tr;
  return e.filter((i) => $o(i, t, n) && i.points.some(([l, c]) => (l - r) ** 2 + ((c - o) * a) ** 2 <= s)).map((i) => i.id);
}
function $o(e, t, n) {
  return e.page === t && (e.pane || "translated") === n;
}
function Ic(e, t, n, r = 15e-4) {
  const o = e[e.length - 1];
  return o && Math.abs(o[0] - t) < r && Math.abs(o[1] - n) < r ? e : [...e, [t, n]];
}
function Rc(e) {
  const [t, n] = N(null), [r, o] = N(Oo[0].key), [a, s] = N(() => kr(e)), i = A(a), l = A([]);
  D(() => {
    const h = kr(e);
    i.current = h, s(h), l.current = [];
  }, [e]);
  const c = $((h) => {
    i.current = h, s(h), wc(e, h);
  }, [e]), d = $((h) => {
    const y = i.current, w = h(y);
    w !== y && (l.current = [...l.current.slice(-49), y], c(w));
  }, [c]), f = $((h) => {
    h.points.length < 1 || d((y) => [...y, { ...h, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` }]);
  }, [d]), u = $((h) => {
    h.length && d((y) => y.filter((w) => !h.includes(w.id)));
  }, [d]), m = $((h) => {
    d((y) => y.some((w) => w.page === h) ? y.filter((w) => w.page !== h) : y);
  }, [d]), v = $(() => {
    const h = l.current.pop();
    h && c(h);
  }, [c]);
  return q(
    () => ({ tool: t, color: r, strokes: a, setTool: n, setColor: o, add: f, erase: u, undo: v, clearPage: m }),
    [t, r, a, f, u, v, m]
  );
}
const Ec = "reader-ink-layer";
function Pc(e, t, n) {
  if (!e.length) return "";
  const [r, ...o] = e.map(([a, s]) => `${(a * t).toFixed(1)} ${(s * n).toFixed(1)}`);
  return o.length ? `M${r} L${o.join(" L")}` : `M${r} l0.01 0`;
}
function Nr({ stroke: e, width: t, height: n }) {
  return /* @__PURE__ */ p(
    "path",
    {
      className: `reader-ink-stroke is-${e.tool}`,
      d: Pc(e.points, t, n),
      style: { stroke: `var(--${e.color})`, strokeWidth: Math.max(1, e.width * t) }
    }
  );
}
function Tc({ page: e, pane: t, width: n, height: r, ink: o }) {
  const [a, s] = N(null), i = A(!1), l = o.strokes.filter((h) => $o(h, e, t)), c = !!o.tool;
  if (!c && !l.length) return null;
  const d = (h) => {
    const y = h.currentTarget.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (h.clientX - y.left) / Math.max(1, y.width))),
      Math.min(1, Math.max(0, (h.clientY - y.top) / Math.max(1, y.height)))
    ];
  }, f = (h, y) => o.erase(Sc(o.strokes, e, t, h, y, r / Math.max(1, n))), u = (h) => {
    if (!o.tool || h.button !== 0) return;
    h.preventDefault(), h.stopPropagation(), h.currentTarget.setPointerCapture(h.pointerId), i.current = !0;
    const [y, w] = d(h);
    o.tool === "eraser" ? f(y, w) : s([[y, w]]);
  }, m = (h) => {
    if (!i.current || !o.tool) return;
    h.stopPropagation();
    const [y, w] = d(h);
    o.tool === "eraser" ? f(y, w) : s((g) => g ? Ic(g, y, w) : [[y, w]]);
  }, v = (h) => {
    i.current && (i.current = !1, h.stopPropagation(), a && o.tool && o.tool !== "eraser" && o.add({ page: e, pane: t, tool: o.tool, color: o.color, width: Pr[o.tool], points: a }), s(null));
  };
  return /* @__PURE__ */ L(
    "svg",
    {
      className: Ec,
      "data-ink-active": c ? o.tool : void 0,
      width: n,
      height: r,
      viewBox: `0 0 ${n} ${r}`,
      onPointerDown: u,
      onPointerMove: m,
      onPointerUp: v,
      onPointerCancel: v,
      children: [
        l.map((h) => /* @__PURE__ */ p(Nr, { stroke: h, width: n, height: r }, h.id)),
        a && o.tool && o.tool !== "eraser" ? /* @__PURE__ */ p(Nr, { stroke: { tool: o.tool, color: o.color, width: Pr[o.tool], points: a }, width: n, height: r }) : null
      ]
    }
  );
}
function kc({
  port: e,
  jobId: t,
  readerItemId: n,
  memory: r,
  onSaved: o
}) {
  const [a, s] = N(null), [i, l] = N(!1), [c, d] = N([]), [f, u] = N(""), [m, v] = N(""), [h, y] = N(!1), [w, g] = N(null), [S, b] = N([]), I = r.drafts, R = r.generation, T = $(async (E, P) => {
    if (e)
      try {
        d(Sl(await e.fetchRevisions(E, P)));
      } catch {
        d([]);
      }
  }, [e]);
  D(() => {
    if (s(null), d([]), g(null), b([]), v(""), !e || !t || !n) return;
    let E = !1;
    return l(!0), e.loadItem(t, n).then((P) => {
      if (E) return;
      const k = P == null ? void 0 : P.item;
      if (!k) throw new Error("找不到这一段的译文。");
      const M = `${(P == null ? void 0 : P.item_id) || n}`, { source: _, translated: U } = vl(k);
      s({ readerItemId: n, itemId: M, source: _, current: U }), u(I.get(n) ?? U);
    }).catch((P) => {
      E || g({ tone: "error", message: (P == null ? void 0 : P.message) || "读取这段译文失败。" });
    }).finally(() => {
      E || l(!1);
    }), T(t, n), () => {
      E = !0;
    };
  }, [e, t, n, T]);
  const O = $((E) => {
    u(E), n && I.set(n, E);
  }, [n, I]), C = $(async (E, P) => {
    if (!e || !a || h) return !1;
    const k = E ?? f;
    if (!k.trim()) return !1;
    y(!0), g(null), b([]);
    try {
      const M = await e.revise(t, a.itemId, {
        translated_text: k,
        source: "user",
        reason: (P ?? m).trim() || "在阅读页手动修改",
        ...R.current != null ? { expected_generation: R.current } : {}
      }), _ = Number(M == null ? void 0 : M.generation);
      return Number.isFinite(_) && (R.current = _), I.delete(a.readerItemId), s({ ...a, current: k }), u(k), v(""), (M == null ? void 0 : M.changed) === !1 ? g({ tone: "ok", message: "和原来一样，没有改动。" }) : (o(a.readerItemId, k), g({ tone: "ok", message: "存好了。点「重新排版」以后，译文 PDF 才会换成新的。" })), T(t, a.readerItemId), !0;
    } catch (M) {
      const _ = M;
      return (_ == null ? void 0 : _.reason) === "generation_mismatch" && (R.current = null), g({ tone: "error", message: (_ == null ? void 0 : _.message) || "保存失败，请稍后再试。" }), b(Tl(_ == null ? void 0 : _.issues)), !1;
    } finally {
      y(!1);
    }
  }, [e, a, h, f, m, t, o, T, I, R]), j = $(() => {
    n && I.delete(n);
  }, [n, I]);
  return {
    loading: i,
    loaded: (a == null ? void 0 : a.readerItemId) === n ? a : null,
    history: c,
    draft: f,
    setDraft: O,
    reason: m,
    setReason: v,
    saving: h,
    status: w,
    issues: S,
    save: C,
    discardDraft: j
  };
}
const Fo = "reader-inline-edit";
function Nc({ text: e }) {
  const [t, n] = N("");
  return D(() => {
    if (!/\$|\\\(|\\\[/.test(e)) {
      n("");
      return;
    }
    let r = !0;
    const o = window.setTimeout(() => {
      const a = xo(e);
      n(a.fallbackHtml), a.richHtml.then((s) => {
        r && n(s);
      });
    }, 250);
    return () => {
      r = !1, window.clearTimeout(o);
    };
  }, [e]), t ? /* @__PURE__ */ L("div", { className: "reader-inline-edit-preview", "data-inline-edit-preview": "true", children: [
    /* @__PURE__ */ p("span", { className: "reader-inline-edit-preview-label", children: "预览" }),
    /* @__PURE__ */ p("div", { className: "reader-live-translation-content", dangerouslySetInnerHTML: { __html: t } })
  ] }) : null;
}
function Mc({
  target: e,
  page: t,
  edit: n,
  showSource: r,
  regions: o,
  jumpToBlock: a
}) {
  var j;
  const s = e.itemId, i = kc({
    port: n.available && !n.blockedReason ? n.port : null,
    jobId: n.ownerJobId,
    readerItemId: s,
    memory: n.memory,
    onSaved: n.markSaved
  }), [l, c] = N(!1), [d, f] = N(!1), u = A(null), m = Ll(e.rect, t), v = q(() => Ml(o), [o]), h = v.indexOf(s), { loaded: y } = i, w = i.saving || i.loading, g = n.blockedReason, S = !y || i.draft === y.current, { close: b, select: I } = n, R = $((E) => {
    const P = v[h + E];
    P && (I(P), a == null || a(P));
  }, [v, h, I, a]), T = $(() => {
    i.discardDraft(), b();
  }, [i, b]), O = $(async (E, P) => {
    await i.save(E, P) && b();
  }, [i, b]);
  D(() => {
    const E = (P) => {
      !P.altKey || P.key !== "ArrowUp" && P.key !== "ArrowDown" || (P.preventDefault(), R(P.key === "ArrowUp" ? -1 : 1));
    };
    return window.addEventListener("keydown", E), () => window.removeEventListener("keydown", E);
  }, [R]), Ee(() => {
    const E = u.current;
    if (!E) return;
    E.style.height = "auto";
    const P = m.mode === "inline" ? m.minHeight : 0;
    E.style.height = `${Math.max(P, E.scrollHeight + 2)}px`;
  }, [i.draft, y, m.mode, m.mode === "inline" ? m.minHeight : 0]);
  const C = m.mode === "inline" ? { left: m.left, top: m.top, width: m.width } : { left: m.left, width: m.width, top: m.top, bottom: m.bottom };
  return /* @__PURE__ */ L($e, { children: [
    m.mode === "popout" ? /* @__PURE__ */ p("div", { className: "reader-inline-edit-frame", style: e.rect, "aria-hidden": "true" }) : null,
    /* @__PURE__ */ L(
      "div",
      {
        className: `${Fo} is-${m.mode}`,
        style: C,
        role: "group",
        "aria-label": `改第 ${((j = n.target) == null ? void 0 : j.page) || "?"} 页这一段译文`,
        "data-inline-edit-id": s,
        "data-inline-edit-mode": m.mode,
        onPointerDown: (E) => E.stopPropagation(),
        children: [
          r && (y != null && y.source) ? /* @__PURE__ */ p(
            re,
            {
              className: `reader-inline-edit-source${l ? " is-open" : ""}`,
              "data-block-edit-source": "true",
              title: l ? "收起原文" : "展开原文",
              onClick: () => c((E) => !E),
              children: y.source
            }
          ) : null,
          g ? /* @__PURE__ */ p("p", { className: "reader-inline-edit-note is-blocked", "data-block-edit-blocked": "true", children: g }) : null,
          i.loading ? /* @__PURE__ */ p("p", { className: "reader-inline-edit-note", children: "正在读这一段…" }) : null,
          y ? /* @__PURE__ */ p(
            qa,
            {
              ref: u,
              id: "reader-block-edit-text",
              className: "reader-inline-edit-text",
              rows: 2,
              value: i.draft,
              disabled: w || !!g,
              "aria-label": "译文",
              autoFocus: !0,
              onChange: (E) => i.setDraft(E.target.value),
              onKeyDown: (E) => {
                E.key === "Enter" && (E.metaKey || E.ctrlKey) ? (E.preventDefault(), S || O()) : E.key === "Escape" && (E.preventDefault(), T());
              }
            }
          ) : null,
          y ? /* @__PURE__ */ p(Nc, { text: i.draft }) : null,
          /* @__PURE__ */ L("div", { className: "reader-inline-edit-toolbar", children: [
            /* @__PURE__ */ p(cr, { className: "reader-inline-edit-step", size: "sm", label: "上一段（Alt+↑）", disabled: h <= 0, onClick: () => R(-1), children: /* @__PURE__ */ p(Aa, { size: 14, "aria-hidden": !0 }) }),
            /* @__PURE__ */ p(cr, { className: "reader-inline-edit-step", size: "sm", label: "下一段（Alt+↓）", disabled: h < 0 || h >= v.length - 1, onClick: () => R(1), children: /* @__PURE__ */ p(lo, { size: 14, "aria-hidden": !0 }) }),
            /* @__PURE__ */ p(
              mo,
              {
                size: "sm",
                className: "reader-inline-edit-reason",
                value: i.reason,
                placeholder: "原因（可不填）",
                "aria-label": "修改原因",
                disabled: w || !!g || !y,
                onChange: (E) => i.setReason(E.target.value),
                onKeyDown: (E) => {
                  E.key === "Enter" ? (E.preventDefault(), S || O()) : E.key === "Escape" && (E.preventDefault(), T());
                }
              }
            ),
            i.history.length ? /* @__PURE__ */ L(
              re,
              {
                className: "reader-inline-edit-act",
                variant: "ghost",
                size: "sm",
                "aria-expanded": d,
                "data-block-edit-action": "history",
                onClick: () => f((E) => !E),
                children: [
                  /* @__PURE__ */ p(_a, { size: 13, "aria-hidden": !0 }),
                  i.history.length - 1
                ]
              }
            ) : null,
            /* @__PURE__ */ p(re, { className: "reader-inline-edit-act", variant: "ghost", size: "sm", "data-block-edit-action": "cancel", onClick: T, children: "取消" }),
            /* @__PURE__ */ p(
              re,
              {
                className: "reader-inline-edit-act",
                variant: "primary",
                size: "sm",
                "data-block-edit-action": "save",
                disabled: w || !!g || S || !i.draft.trim(),
                pending: i.saving,
                onClick: () => {
                  O();
                },
                children: "保存"
              }
            )
          ] }),
          i.status ? /* @__PURE__ */ p("p", { className: `reader-inline-edit-status is-${i.status.tone}`, role: i.status.tone === "error" ? "alert" : "status", children: i.status.message }) : null,
          i.issues.length ? /* @__PURE__ */ p("ul", { className: "reader-inline-edit-issues", "data-block-edit-issues": "true", children: i.issues.map((E) => /* @__PURE__ */ p("li", { children: E }, E)) }) : null,
          d && y && i.history.length ? /* @__PURE__ */ p("ol", { className: "reader-inline-edit-history", "aria-label": "修订历史", children: i.history.map((E, P) => {
            const k = E.text === y.current, M = [Il(E.ts), E.label].filter(Boolean).join(" · ");
            return /* @__PURE__ */ L("li", { "data-block-edit-history": E.label, "data-current": k ? "true" : void 0, children: [
              /* @__PURE__ */ L("div", { className: "reader-inline-edit-history-meta", children: [
                /* @__PURE__ */ L("span", { children: [
                  M,
                  k ? "（现在用的）" : "",
                  E.reason ? ` · ${E.reason}` : ""
                ] }),
                k ? null : /* @__PURE__ */ p(
                  re,
                  {
                    className: "reader-inline-edit-act",
                    variant: "ghost",
                    size: "sm",
                    "data-block-edit-action": "restore",
                    disabled: w || !!g,
                    onClick: () => {
                      O(E.text, `回到「${M.replace(" · ", " ")}」那一版`);
                    },
                    children: "用这版"
                  }
                )
              ] }),
              /* @__PURE__ */ p("p", { className: "reader-inline-edit-history-text", children: E.text })
            ] }, `${E.ts}:${P}`);
          }) }) : null
        ]
      }
    )
  ] });
}
const jo = Ln(null), Bo = Ln(null);
function Ac({ value: e, hud: t, children: n }) {
  return /* @__PURE__ */ p(jo.Provider, { value: e, children: /* @__PURE__ */ p(Bo.Provider, { value: t, children: n }) });
}
function je() {
  return Cn(jo);
}
function Uo() {
  return Cn(Bo);
}
const Ke = (e) => `${e ?? ""}`.replace(/\s+/gu, " ").trim(), _c = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉", "+": "₊", "-": "₋" }, Lc = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "+": "⁺", "-": "⁻" }, Cc = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  phi: "φ",
  varphi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Xi: "Ξ",
  Pi: "Π",
  Sigma: "Σ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω"
}, Mr = (e, t) => [...e].every((n) => n in t) ? [...e].map((n) => t[n]).join("") : e;
function xc(e) {
  return e.replace(
    /\$([^$]+)\$/gu,
    (t, n) => n.replace(/\\(?:mathrm|text|mathbf|mathit|operatorname)\{([^{}]*)\}/gu, "$1").replace(/_\{([^{}]*)\}|_(\w)/gu, (r, o, a) => Mr(o ?? a ?? "", _c)).replace(/\^\{([^{}]*)\}|\^(\w)/gu, (r, o, a) => Mr(o ?? a ?? "", Lc)).replace(/\\([a-zA-Z]+)/gu, (r, o) => Cc[o] ?? "").replace(/[{}]/gu, "").trim()
  ).replace(/\s+/gu, " ").trim();
}
function Dc(e) {
  return Ke(e.translatedBlockText) || Ke(e.translated.text) || Ke(e.source.text);
}
const zc = (e) => !!e.headingLevel || e.subType === "title" || e.subType === "heading";
function Oc(e) {
  const t = [];
  for (const n of e) {
    if (!zc(n)) continue;
    const r = xc(Dc(n)), o = Number(n.source.page);
    if (!r || !Number.isFinite(o) || o < 1) continue;
    const a = t[t.length - 1];
    a && a.text === r && a.page === o || t.push({ itemId: n.itemId, level: n.headingLevel && n.headingLevel > 1 ? 2 : 1, page: o, text: r });
  }
  return t;
}
function $c(e, t) {
  let n = -1;
  for (let r = 0; r < e.length && e[r].page <= t; r += 1)
    n = r;
  return n;
}
const Fc = 24, jc = 60;
function Ar(e, t) {
  const n = e.toLowerCase().indexOf(t);
  if (n < 0) return null;
  const r = Math.max(0, n - Fc), o = Math.min(e.length, n + t.length + jc), a = r > 0 ? "…" : "";
  return { snippet: `${a}${e.slice(r, o)}${o < e.length ? "…" : ""}`, at: a.length + n - r, length: t.length };
}
function Bc(e, t, n = 200) {
  const r = Ke(t).toLowerCase();
  if (!r) return [];
  const o = [];
  for (const a of e) {
    const s = Number(a.source.page);
    if (!Number.isFinite(s) || s < 1) continue;
    const i = Ke(a.translatedBlockText) || Ke(a.translated.text), l = i ? Ar(i, r) : null, c = l ?? Ar(Ke(a.source.text), r);
    if (c && (o.push({ itemId: a.itemId, page: s, side: l ? "translated" : "source", ...c }), o.length >= n))
      break;
  }
  return o;
}
function Ft(e) {
  return e.replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t]);
}
function Uc(e, t) {
  const n = Ke(t).toLowerCase();
  if (!n || !e) return Ft(e || "");
  const r = e.toLowerCase();
  let o = "", a = 0;
  for (let s = r.indexOf(n); s >= 0; s = r.indexOf(n, s + n.length))
    o += `${Ft(e.slice(a, s))}<mark class="reader-find-mark">${Ft(e.slice(s, s + n.length))}</mark>`, a = s + n.length;
  return o + Ft(e.slice(a));
}
function Hc(e, t, n) {
  return t <= 0 ? -1 : e < 0 || e >= t ? n ? t - 1 : 0 : (e + (n ? t - 1 : 1)) % t;
}
const Ho = 1.414;
function Wc({
  pageNumber: e,
  width: t,
  devicePixelRatio: n,
  pane: r,
  active: o = !1,
  textLayer: a = !0,
  syncedMinHeight: s = 0,
  onMetrics: i,
  cachedAspect: l,
  onAspectChange: c,
  sentinelRef: d,
  regionHighlight: f = null,
  regionTargets: u = [],
  hoveredRegionId: m,
  onHoverRegion: v,
  liveTranslationLayout: h,
  liveTranslationPage: y,
  showLiveTranslation: w = r === "source"
}) {
  var Ie, Te;
  const g = je(), S = g == null ? void 0 : g.revisedBlocks, b = g == null ? void 0 : g.blockEdit, I = b == null ? void 0 : b.pendingEdits, R = g == null ? void 0 : g.editBlock, T = (g == null ? void 0 : g.findTerm) || "", O = q(
    () => T ? ({ str: z }) => Uc(z, T) : void 0,
    [T]
  ), C = A(l ?? Ho), [j, E] = N(C.current);
  D(() => {
    l != null && Math.abs(l - C.current) >= 1e-3 && (C.current = l, E(l));
  }, [l]);
  const P = A(d);
  P.current = d;
  const k = A(null), M = A((z) => {
    var Y;
    k.current = z, (Y = P.current) == null || Y.call(P, z);
  }).current, _ = A(null), U = A(`${t}@${n}`);
  Ee(() => {
    const z = `${t}@${n}`;
    U.current !== z && (U.current = z, o && Kc(k.current, _.current));
  }, [o, n, t]), D(() => {
    o || dn(_.current);
  }, [o]), D(() => () => dn(_.current), []);
  const F = Math.max(120, Math.floor(t * j)), G = Math.max(F, Math.ceil(s || 0)), ee = Dn(f, t, F), X = q(
    () => xl(u, t, F),
    [F, u, t]
  ), [Q, fe] = N(null), le = typeof v == "function", ue = le ? m ?? null : Q, be = (z) => {
    le ? z !== (m ?? null) && (v == null || v(z)) : fe((Y) => Y === z ? Y : z);
  }, H = q(
    () => X.find((z) => z.itemId === ue) || null,
    [ue, X]
  ), te = r === "translated" && ((Ie = b == null ? void 0 : b.target) == null ? void 0 : Ie.itemId) || "", me = q(
    () => te && X.find((z) => z.itemId === te) || null,
    [te, X]
  ), ie = vc(k, o ? H : null, X, t), ye = (z) => {
    var se, ve, pe, Se, it;
    if (z.pointerType === "touch") return;
    if ((se = g == null ? void 0 : g.ink) != null && se.tool) {
      be(null);
      return;
    }
    if (z.buttons !== 0) {
      be(null);
      return;
    }
    if ((pe = (ve = z.target) == null ? void 0 : ve.closest) != null && pe.call(ve, `.${Co}`) || (it = (Se = z.target) == null ? void 0 : Se.closest) != null && it.call(Se, `.${Fo}`)) return;
    const Y = z.currentTarget.getBoundingClientRect(), ce = z.clientX - Y.left, B = z.clientY - Y.top;
    if (gc(ie, ce, B)) return;
    const V = Rr(X, ce, B);
    be((V == null ? void 0 : V.itemId) || null);
  }, Be = (z) => {
    if (z.pointerType === "mouse") return;
    const Y = z.currentTarget.getBoundingClientRect(), ce = Rr(
      X,
      z.clientX - Y.left,
      z.clientY - Y.top
    );
    be((ce == null ? void 0 : ce.itemId) || null);
  }, Pe = (z) => {
    !Number.isFinite(z) || z <= 0 || Math.abs(C.current - z) < 1e-3 || (C.current = z, E(z), c == null || c(e, z));
  };
  return /* @__PURE__ */ L(
    "div",
    {
      ref: M,
      [Le]: e,
      [qe]: r,
      [On]: F,
      className: $n,
      onPointerMoveCapture: ye,
      onPointerDown: Be,
      onPointerLeave: (z) => {
        z.pointerType === "mouse" && be(null);
      },
      style: {
        width: t,
        height: G,
        minHeight: G
      },
      children: [
        o ? /* @__PURE__ */ p(
          Ga,
          {
            pageNumber: e,
            width: t,
            devicePixelRatio: n,
            renderTextLayer: a,
            customTextRenderer: O,
            renderAnnotationLayer: !1,
            className: yo,
            loading: /* @__PURE__ */ p(
              "div",
              {
                className: Kt,
                style: { width: t, height: F }
              }
            ),
            onLoadSuccess: (z) => {
              try {
                const Y = z.getViewport({ scale: 1 });
                if (Y.width > 0) {
                  const ce = Y.height / Y.width;
                  Pe(ce);
                }
              } catch {
              }
              i == null || i();
            },
            onRenderSuccess: () => {
              dn(_.current), i == null || i();
            }
          }
        ) : /* @__PURE__ */ p(
          "div",
          {
            className: Kt,
            style: { width: t, height: F },
            "aria-hidden": !0
          }
        ),
        o ? /* @__PURE__ */ p("div", { ref: _, className: "reader-react-pdf-kept-paint", "aria-hidden": "true" }) : null,
        ee ? /* @__PURE__ */ p(
          "div",
          {
            className: "reader-react-pdf-region-highlight",
            "data-reader-region-id": f == null ? void 0 : f.itemId,
            style: ee,
            "aria-hidden": "true"
          }
        ) : null,
        o && a && w ? /* @__PURE__ */ p(
          ic,
          {
            layoutPage: h,
            pageState: y,
            width: t,
            height: F
          }
        ) : null,
        o && r === "translated" && (I != null && I.size) ? /* @__PURE__ */ p(cc, { targets: X, edits: I, width: t, excludeId: me == null ? void 0 : me.itemId }) : null,
        o && me && b ? /* @__PURE__ */ p(
          Mc,
          {
            target: me,
            page: { width: t, height: F },
            edit: b,
            showSource: !!(g != null && g.editShowsSource),
            regions: g == null ? void 0 : g.regions,
            jumpToBlock: g == null ? void 0 : g.jumpToBlock
          }
        ) : null,
        o && r === "translated" && (S != null && S.size) ? /* @__PURE__ */ p("div", { className: "reader-revised-markers", "aria-hidden": "true", children: X.filter((z) => S.has(z.itemId)).map((z) => /* @__PURE__ */ p(
          "span",
          {
            className: "reader-revised-marker",
            "data-reader-revised-id": z.itemId,
            style: { left: z.rect.left, top: z.rect.top, height: z.rect.height }
          },
          z.itemId
        )) }) : null,
        o && (g != null && g.ink) ? /* @__PURE__ */ p(
          Tc,
          {
            page: e,
            pane: r === "translated" ? "translated" : g.compareVersion ? "compare" : "source",
            width: t,
            height: F,
            ink: g.ink
          }
        ) : null,
        /* @__PURE__ */ p(
          Zl,
          {
            target: o && !((Te = g == null ? void 0 : g.ink) != null && Te.tool) && (H == null ? void 0 : H.itemId) !== (me == null ? void 0 : me.itemId) ? H : null,
            pane: r === "translated" ? "translated" : "source",
            revisedCount: H && (S == null ? void 0 : S.get(H.itemId)) || 0,
            onEdit: R,
            frameRect: ie == null ? void 0 : ie.rect,
            placement: ie == null ? void 0 : ie.placement,
            tailTop: ie == null ? void 0 : ie.tailTop
          }
        )
      ]
    }
  );
}
const Vc = Xt(Wc);
function Kc(e, t) {
  if (!e || !t || t.firstChild) return;
  const n = e.querySelector(".react-pdf__Page__canvas");
  if (!n || !n.width || !n.height || n.style.visibility === "hidden") return;
  const r = e.ownerDocument.createElement("canvas");
  r.width = n.width, r.height = n.height;
  const o = r.getContext("2d");
  o && (o.drawImage(n, 0, 0), t.appendChild(r));
}
function dn(e) {
  if (e != null && e.firstChild) {
    for (const t of Array.from(e.querySelectorAll("canvas")))
      t.width = 0, t.height = 0;
    e.replaceChildren();
  }
}
const Jc = 2 * 1024 * 1024;
function qc(e) {
  const t = new ho.PDFDataRangeTransport(e.length, null);
  return t.requestDataRange = (n, r) => {
    e.fetchRange(n, r).then(
      (o) => t.onDataRange(n, o),
      () => {
        t.abort();
      }
    );
  }, t;
}
const un = 5, Gc = "120% 0px", Zc = 120, Yc = "25% 0px";
let _r = 1;
const Lr = /* @__PURE__ */ new WeakMap();
function Xc(e) {
  if (!e) return 0;
  const t = Lr.get(e);
  if (t) return t;
  const n = _r;
  return _r += 1, Lr.set(e, n), n;
}
function Qc() {
  const e = typeof window < "u" && window.devicePixelRatio || 1;
  return Math.max(1, Math.min(e, 2));
}
const ed = ro(
  function({
    pane: t,
    url: n = "",
    preloadedFile: r = null,
    userZoom: o = 1,
    visible: a = !0,
    emptyLabel: s = "暂无 PDF",
    scrollRoot: i = null,
    pageWidthOverride: l = null,
    rowHeights: c,
    onMetrics: d,
    onLoadSuccess: f,
    onLoadError: u,
    onNumPagesChange: m,
    activeRegion: v = null,
    regions: h = [],
    readerMetadata: y = null,
    hoveredRegionId: w = null,
    onHoverRegion: g,
    liveTranslation: S,
    showLiveTranslation: b = t === "source",
    liveTranslationPendingLabel: I = "",
    paneAction: R
  }, T) {
    pl();
    const { file: O, loading: C, error: j } = zs(n, r), E = `${n}\0${Xc(O)}`, P = A(E);
    P.current = E;
    const k = q(() => {
      const x = As(O);
      return x ? "ranged" in x ? { range: qc(x.ranged) } : x : null;
    }, [O, n]), [M, _] = N(0), [U, F] = N(""), [G, ee] = N(null), [X, Q] = N(480), fe = A(null), le = A(0), ue = q(() => Qc(), []), be = q(() => ({
      cMapUrl: Tt().resolvePdfjsVendorUrl("cmaps/"),
      cMapPacked: !0,
      standardFontDataUrl: Tt().resolvePdfjsVendorUrl("standard_fonts/"),
      // 只对按段取的大文件起作用：要哪页取哪页，不在后台把整份取完（取完又是一整份在内存里）。
      rangeChunkSize: Jc,
      disableAutoFetch: !0
    }), []);
    xn(T, () => G, [G]), D(() => {
      const x = (W) => {
        le.current = W, Q(W);
      }, J = (W) => {
        const oe = li(W, le.current);
        if (oe !== "ignore") {
          if (fe.current && clearTimeout(fe.current), oe === "immediate") {
            x(W);
            return;
          }
          fe.current = setTimeout(() => x(W), So);
        }
      }, K = !!(l && l >= 80);
      J(K ? l : (i == null ? void 0 : i.clientWidth) || 0);
      const ae = !K && i && typeof ResizeObserver < "u" ? new ResizeObserver((W) => {
        var oe, he;
        J(((he = (oe = W[0]) == null ? void 0 : oe.contentRect) == null ? void 0 : he.width) ?? i.clientWidth);
      }) : null;
      return ae && i && ae.observe(i), () => {
        ae == null || ae.disconnect(), fe.current && clearTimeout(fe.current);
      };
    }, [l, i, a]);
    const H = q(
      () => ai(X, o),
      [X, o]
    ), [te, me] = N(() => /* @__PURE__ */ new Map()), [ie, ye] = N(() => /* @__PURE__ */ new Set()), [Be, Pe] = N(() => /* @__PURE__ */ new Set()), Ie = A(/* @__PURE__ */ new Map()), Te = A(null), z = A(null), [Y, ce] = N(() => /* @__PURE__ */ new Set()), B = A(/* @__PURE__ */ new Map()), V = $((x, J) => {
      me((K) => {
        if (K.get(x) === J) return K;
        const Z = new Map(K);
        return Z.set(x, J), Z;
      });
    }, []), se = $((x, J) => {
      const K = Ie.current, Z = K.get(x), ae = [Te.current, z.current];
      if (Z)
        for (const W of ae)
          try {
            W == null || W.unobserve(Z);
          } catch {
          }
      if (J) {
        K.set(x, J);
        for (const W of ae)
          try {
            W == null || W.observe(J);
          } catch {
          }
      } else
        K.delete(x);
    }, []), ve = A(/* @__PURE__ */ new Map()), pe = $((x) => {
      const J = ve.current;
      let K = J.get(x);
      return K || (K = (Z) => se(x, Z), J.set(x, K)), K;
    }, [se]);
    D(() => {
      if (typeof IntersectionObserver > "u") return;
      const x = B.current, J = new IntersectionObserver(
        (K) => {
          const Z = [], ae = [];
          for (const W of K) {
            const oe = W.target, he = qt(oe);
            Number.isFinite(he) && (W.isIntersecting ? Z : ae).push(he);
          }
          if ((Z.length || ae.length) && ye((W) => {
            let oe = null;
            for (const he of Z)
              W.has(he) || (oe = oe || new Set(W), oe.add(he));
            for (const he of ae)
              W.has(he) && (oe = oe || new Set(W), oe.delete(he));
            return oe || W;
          }), Z.length) {
            for (const W of Z) {
              const oe = x.get(W);
              oe && (clearTimeout(oe), x.delete(W));
            }
            Pe((W) => {
              let oe = null;
              for (const he of Z)
                W.has(he) || (oe = oe || new Set(W), oe.add(he));
              return oe || W;
            });
          }
          for (const W of ae)
            x.has(W) || x.set(W, setTimeout(() => {
              x.delete(W), Pe((oe) => {
                if (!oe.has(W)) return oe;
                const he = new Set(oe);
                return he.delete(W), he;
              });
            }, Zc));
        },
        { root: i, rootMargin: Gc, threshold: 0 }
      );
      Te.current = J;
      for (const K of Ie.current.values())
        try {
          J.observe(K);
        } catch {
        }
      return () => {
        J.disconnect(), Te.current === J && (Te.current = null);
        for (const K of x.values()) clearTimeout(K);
        x.clear();
      };
    }, [i]), D(() => {
      if (typeof IntersectionObserver > "u") return;
      const x = new IntersectionObserver(
        (J) => {
          ce((K) => {
            let Z = null;
            for (const ae of J) {
              const W = qt(ae.target);
              !Number.isFinite(W) || ae.isIntersecting === K.has(W) || (Z = Z || new Set(K), ae.isIntersecting ? Z.add(W) : Z.delete(W));
            }
            return Z || K;
          });
        },
        { root: i, rootMargin: Yc, threshold: 0 }
      );
      z.current = x;
      for (const J of Ie.current.values())
        try {
          x.observe(J);
        } catch {
        }
      return () => {
        x.disconnect(), z.current === x && (z.current = null);
      };
    }, [i]);
    const Se = !!i && typeof IntersectionObserver < "u";
    Ee(() => {
      _(0), F(""), ye(/* @__PURE__ */ new Set()), Pe(/* @__PURE__ */ new Set()), me(/* @__PURE__ */ new Map()), Ie.current.clear();
      const x = B.current;
      for (const J of x.values()) clearTimeout(J);
      x.clear(), m == null || m(0, t);
    }, [E, m, t]);
    const it = $(
      ({ numPages: x }) => {
        P.current === E && (_(x), F(""), m == null || m(x, t), f == null || f({ numPages: x, pane: t }));
      },
      [E, f, m, t]
    ), tn = $(
      (x) => {
        if (P.current !== E) return;
        const J = (x == null ? void 0 : x.message) || "PDF 解析失败";
        F(J), _(0), m == null || m(0, t), u == null || u(x, t);
      },
      [E, u, m, t]
    ), Ue = q(
      () => M > 0 ? Array.from({ length: M }, (x, J) => J + 1) : [],
      [M]
    );
    D(() => {
      typeof IntersectionObserver < "u" || Pe(new Set(Ue));
    }, [Ue]);
    const He = q(
      () => lr(v, y, t),
      [v, y, t]
    ), Ye = q(() => {
      const x = /* @__PURE__ */ new Map();
      for (const J of h) {
        const K = lr(J, y, t);
        if (!K) continue;
        const Z = x.get(K.box.page) || [];
        Z.push(K), x.set(K.box.page, Z);
      }
      return x;
    }, [t, y, h]), xt = q(() => {
      const x = /* @__PURE__ */ new Set();
      if (!w) return x;
      for (const [J, K] of Ye)
        K.some((Z) => Z.itemId === w) && x.add(J);
      return x;
    }, [w, Ye]), Dt = q(() => {
      if (M === 0) return /* @__PURE__ */ new Set();
      if (!a) return /* @__PURE__ */ new Set();
      if (!(!!i && typeof IntersectionObserver < "u")) return new Set(Ue);
      if (ie.size === 0) {
        const K = Math.min(M, un * 2 + 1);
        return new Set(Array.from({ length: K }, (Z, ae) => ae + 1));
      }
      const J = /* @__PURE__ */ new Set();
      for (const K of ie)
        for (let Z = -un; Z <= un; Z++) {
          const ae = K + Z;
          ae >= 1 && ae <= M && J.add(ae);
        }
      return J;
    }, [M, Ue, i, a, ie]), lt = !n || !!j || !!U, zt = n && (j || U) || s;
    return /* @__PURE__ */ L(
      "section",
      {
        ref: ee,
        className: `reader-panel ${Ys}${a ? "" : " is-hidden"}`,
        [qe]: t,
        "data-reader-engine": "react-pdf",
        "data-reader-visible": a ? "true" : "false",
        "data-live-translation-status": (S == null ? void 0 : S.jobStatus) || void 0,
        "aria-hidden": a ? void 0 : !0,
        "aria-label": t === "source" ? "原文 PDF" : "译文 PDF",
        children: [
          R ? /* @__PURE__ */ p("div", { className: "reader-react-pdf-pane-action", children: R }) : null,
          I ? /* @__PURE__ */ L("div", { className: "reader-live-translation-waiting", role: "status", children: [
            /* @__PURE__ */ p("span", { className: "reader-live-translation-waiting-dot", "aria-hidden": "true" }),
            /* @__PURE__ */ p("span", { children: I })
          ] }) : null,
          lt && !C ? /* @__PURE__ */ p("div", { className: "reader-empty reader-react-pdf-empty", "data-reader-pdf-empty": t, children: zt }) : null,
          C ? /* @__PURE__ */ p("div", { className: "reader-empty reader-react-pdf-loading", "data-reader-pdf-loading": t, children: "正在加载 PDF…" }) : null,
          k && !j ? /* @__PURE__ */ p("div", { className: "reader-viewer-wrap reader-react-pdf-wrap", children: /* @__PURE__ */ p(
            Za,
            {
              file: k,
              loading: null,
              error: null,
              options: be,
              onLoadSuccess: it,
              onLoadError: tn,
              className: "reader-react-pdf-document",
              children: Ue.map((x) => {
                if (Dt.has(x))
                  return /* @__PURE__ */ p(
                    Vc,
                    {
                      pane: t,
                      pageNumber: x,
                      width: H,
                      devicePixelRatio: ue,
                      active: Be.has(x),
                      textLayer: !Se || Y.has(x),
                      syncedMinHeight: (c == null ? void 0 : c.get(x)) || 0,
                      onMetrics: d,
                      cachedAspect: te.get(x),
                      onAspectChange: V,
                      sentinelRef: pe(x),
                      regionHighlight: (He == null ? void 0 : He.box.page) === x ? He : null,
                      regionTargets: Ye.get(x),
                      hoveredRegionId: w && xt.has(x) ? w : null,
                      onHoverRegion: g,
                      liveTranslationLayout: S == null ? void 0 : S.layoutByPage.get(x - 1),
                      liveTranslationPage: S == null ? void 0 : S.pagesByPage.get(x - 1),
                      showLiveTranslation: b
                    },
                    `${t}-${x}`
                  );
                const K = te.get(x) ?? Ho, Z = Math.max(120, Math.floor(H * K)), ae = Math.max(Z, Math.ceil((c == null ? void 0 : c.get(x)) || 0));
                return /* @__PURE__ */ p(
                  "div",
                  {
                    ref: pe(x),
                    [Le]: x,
                    [qe]: t,
                    [On]: Z,
                    className: `${$n} is-placeholder`,
                    style: {
                      width: H,
                      height: ae,
                      minHeight: ae
                    },
                    children: /* @__PURE__ */ p(
                      "div",
                      {
                        className: Kt,
                        style: { width: H, height: Z },
                        "aria-hidden": !0
                      }
                    )
                  },
                  `${t}-${x}`
                );
              })
            },
            E
          ) }) : null
        ]
      }
    );
  }
), Cr = Xt(ed), td = 2e3, nd = 6, rd = 500, xr = "reader-react-resizing";
function od(e, t) {
  const n = A(null), r = A(null);
  Ee(() => {
    const o = n.current;
    if (n.current = t, !e || o === null || t === null || Math.abs(o - t) < 1) return;
    const a = r.current;
    a == null || a.stop();
    let s = a ? { pane: a.pane, progress: a.progress, started: a.started } : null;
    if (!s) {
      const b = ad(e), I = Ut(e, b);
      if (!I) return;
      s = { pane: b, progress: I, started: performance.now() };
    }
    const { pane: i, progress: l, started: c } = s;
    let d = 0, f = null, u = e.scrollHeight, m = u, v = 0, h = c;
    const y = /* @__PURE__ */ new WeakMap(), w = typeof ResizeObserver > "u" ? null : new ResizeObserver((b) => {
      let I = !1;
      for (const R of b) {
        const T = Math.round(R.contentRect.height);
        y.has(R.target) && y.get(R.target) !== T && (I = !0), y.set(R.target, T);
      }
      I && Nt(e, l, "auto", i);
    }), g = () => {
      var b;
      f && clearTimeout(f), cancelAnimationFrame(d), w == null || w.disconnect(), e.classList.remove(xr);
      for (const I of Dr) e.removeEventListener(I, g);
      ((b = r.current) == null ? void 0 : b.stop) === g && (r.current = null);
    }, S = () => {
      Nt(e, l, "auto", i);
      const b = e.scrollHeight;
      v = b === m ? v + 1 : 0, m = b;
      const I = performance.now() - h;
      v >= nd && (b !== u || I > rd) || I > td ? g() : d = requestAnimationFrame(S);
    };
    for (const b of Dr) e.addEventListener(b, g, { passive: !0 });
    for (const b of Array.from(e.children)) w == null || w.observe(b);
    e.classList.add(xr), r.current = { ...s, stop: g }, f = setTimeout(() => {
      f = null, h = performance.now(), u = e.scrollHeight, m = u, v = 0, d = requestAnimationFrame(S);
    }, So);
  }, [e, t]), D(() => () => {
    var o;
    return (o = r.current) == null ? void 0 : o.stop();
  }, []);
}
function ad(e) {
  for (const t of Array.from(e.querySelectorAll(`[${Le}]`))) {
    const n = t.getBoundingClientRect();
    if (n.height >= 8 && n.width >= 8) return t.getAttribute(qe) || null;
  }
  return null;
}
const Dr = ["wheel", "touchstart", "keydown", "pointerdown"];
function Wo(e) {
  const t = new Date(e);
  if (!e || Number.isNaN(t.getTime())) return "";
  const n = (r) => `${r}`.padStart(2, "0");
  return `${t.getMonth() + 1}月${t.getDate()}日 ${n(t.getHours())}:${n(t.getMinutes())}`;
}
function sd(e) {
  const t = e.indexOf(" · ");
  return t > 0 ? { engine: e.slice(0, t), model: e.slice(t + 3) } : { engine: "", model: e };
}
function id({ compare: e, onDone: t }) {
  return /* @__PURE__ */ L("div", { className: "reader-version-compare-menu", role: "dialog", "aria-label": "选一份译文放在左边对照", children: [
    /* @__PURE__ */ p("p", { className: "reader-version-compare-hint", children: "选一份放在左边，和右边正在读的这份逐段对着看。" }),
    /* @__PURE__ */ p("ol", { className: "reader-version-compare-list", children: [...e.versions].reverse().map((n) => {
      var s;
      const r = n.versionId === e.readingVersionId, o = ((s = e.compared) == null ? void 0 : s.versionId) === n.versionId, a = e.loading === n.versionId;
      return /* @__PURE__ */ p("li", { children: /* @__PURE__ */ L(
        re,
        {
          className: "reader-version-compare-item",
          "data-version-id": n.versionId,
          "aria-current": o ? "true" : void 0,
          disabled: r,
          onClick: () => {
            e.choose(n.versionId), t();
          },
          children: [
            /* @__PURE__ */ p("span", { className: "reader-version-compare-name", children: n.name }),
            /* @__PURE__ */ p("span", { className: "reader-version-compare-time", children: Wo(n.createdAt) }),
            r ? /* @__PURE__ */ p("span", { className: "reader-version-compare-tag", children: "正在读" }) : null,
            o ? /* @__PURE__ */ p(io, { size: 14, "aria-hidden": !0 }) : null,
            a ? /* @__PURE__ */ p(La, { size: 14, className: "reader-version-compare-spin", "aria-hidden": !0 }) : null
          ]
        }
      ) }, n.versionId);
    }) }),
    e.error ? /* @__PURE__ */ p("p", { className: "reader-version-compare-error", role: "alert", children: e.error }) : null,
    e.compared ? /* @__PURE__ */ L("div", { className: "reader-version-compare-actions", children: [
      /* @__PURE__ */ L(
        re,
        {
          className: "reader-version-compare-adopt",
          title: "以后阅读就用左边这份（和书详情「译文版本」里选的一样）",
          onClick: () => {
            e.adopt(), t();
          },
          children: [
            /* @__PURE__ */ p(Ca, { size: 13, "aria-hidden": !0 }),
            "用左边这份"
          ]
        }
      ),
      /* @__PURE__ */ L(
        re,
        {
          className: "reader-version-compare-close",
          title: "左栏换回原文",
          onClick: () => {
            e.clear(), t();
          },
          children: [
            /* @__PURE__ */ p(xa, { size: 13, "aria-hidden": !0 }),
            "退出对比"
          ]
        }
      )
    ] }) : null
  ] });
}
function zr({ role: e, name: t, createdAt: n }) {
  const { engine: r, model: o } = sd(t), a = [e === "compare" ? "对比" : "正在读", r, Wo(n)].filter(Boolean).join(" · ");
  return /* @__PURE__ */ L("div", { className: `reader-version-watermark is-${e}`, "data-version-watermark": e, children: [
    /* @__PURE__ */ p("em", { children: "PaperLoom" }),
    /* @__PURE__ */ p("strong", { children: o }),
    /* @__PURE__ */ p("span", { children: a })
  ] });
}
function ld({
  shellEl: e,
  left: t,
  right: n
}) {
  const [r, o] = N({ source: null, translated: null });
  return Ee(() => {
    if (!e) return;
    const a = () => {
      const i = e.getBoundingClientRect(), l = (c) => {
        const d = e.querySelector(`[${qe}="${c}"]`), f = d == null ? void 0 : d.getBoundingClientRect();
        return f && f.width > 0 ? { x: Math.round(f.left + f.width / 2), top: Math.round(i.top + 14) } : null;
      };
      o({ source: l("source"), translated: l("translated") });
    };
    a();
    const s = typeof ResizeObserver > "u" ? null : new ResizeObserver(a);
    return s == null || s.observe(e), e.querySelectorAll(`[${qe}]`).forEach((i) => s == null ? void 0 : s.observe(i)), window.addEventListener("resize", a), e.addEventListener("scroll", a, { passive: !0 }), () => {
      s == null || s.disconnect(), window.removeEventListener("resize", a), e.removeEventListener("scroll", a);
    };
  }, [e]), /* @__PURE__ */ L("div", { className: "reader-version-watermarks", "aria-hidden": "true", children: [
    r.source ? /* @__PURE__ */ p("div", { className: "reader-version-watermark-slot", style: { left: r.source.x, top: r.source.top }, children: /* @__PURE__ */ p(zr, { role: "compare", ...t }) }) : null,
    r.translated ? /* @__PURE__ */ p("div", { className: "reader-version-watermark-slot", style: { left: r.translated.x, top: r.translated.top }, children: /* @__PURE__ */ p(zr, { role: "reading", ...n }) }) : null
  ] });
}
const cd = () => () => {
}, Or = () => null;
function dd({
  mode: e,
  compareMode: t,
  showSource: n,
  showTranslated: r,
  markdownSplit: o,
  overlayOnSource: a = !1
}) {
  const s = o && e === "compare";
  return {
    mode: s ? "source" : e,
    compareMode: t && !o,
    showSource: s ? !0 : n,
    showTranslated: s ? !1 : r
  };
}
function ud(e, t, n = e * 2) {
  return t ? !Number.isFinite(e) || e <= 0 ? n : e * 2 : e;
}
function fd(e) {
  return e ? e.connection === "terminal" && e.jobStatus === "failed" ? e.pagesByPage.size > 0 ? `翻译已暂停，已保留 ${e.pagesByPage.size} 页译文` : "翻译已暂停，原始 PDF 仍可阅读" : e.connection === "terminal" && ["cancelled", "canceled"].includes(e.jobStatus) ? e.pagesByPage.size > 0 ? `翻译已取消，已保留 ${e.pagesByPage.size} 页译文` : "翻译已取消，原始 PDF 仍可阅读" : e.pagesByPage.size > 0 ? "" : e.connection === "unavailable" ? e.error || "实时译文暂不可用，原始 PDF 仍可阅读" : e.error ? e.error : e.layoutByPage.size === 0 ? "正在完成 OCR，译文将在这里逐页出现" : "版面已就绪，正在等待首个译文页面" : "";
}
function md(e) {
  const t = je(), {
    markdownSplit: n = !1,
    assistantSplit: r = !1,
    liveTranslation: o,
    paneComposition: a
  } = e, s = (a == null ? void 0 : a.visibleMode) ?? e.mode ?? "compare", i = (a == null ? void 0 : a.compareMode) ?? e.compareMode ?? s === "compare", l = (a == null ? void 0 : a.showSource) ?? e.showSource ?? !0, c = (a == null ? void 0 : a.showTranslated) ?? e.showTranslated ?? (s === "compare" || s === "translated"), d = (a == null ? void 0 : a.overlayOnSource) ?? e.overlayOnSource ?? !1, f = e.bindShell ?? (t == null ? void 0 : t.bindShell), u = e.shellEl ?? (t == null ? void 0 : t.shellEl) ?? null, m = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? Ct, v = e.shellWidth ?? (t == null ? void 0 : t.shellWidth) ?? 0, h = e.rowHeights ?? (t == null ? void 0 : t.rowHeights), y = e.mountSource ?? (t == null ? void 0 : t.mountSource) ?? !1, w = e.mountTranslated ?? (t == null ? void 0 : t.mountTranslated) ?? !1, g = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, S = (t == null ? void 0 : t.compareVersion) ?? null, b = (S == null ? void 0 : S.url) ?? e.sourceUrl ?? (t == null ? void 0 : t.sourceUrl) ?? "", I = e.translatedUrl ?? (t == null ? void 0 : t.translatedUrl) ?? "", R = S ? null : e.sourceFile ?? (t == null ? void 0 : t.sourceFile) ?? null, T = e.translatedFile ?? (t == null ? void 0 : t.translatedFile) ?? null, O = e.onMetrics ?? (t == null ? void 0 : t.onMetrics), C = e.onNumPagesChange ?? (t == null ? void 0 : t.onNumPagesChange), j = e.activeRegion ?? (t == null ? void 0 : t.activeRegion), E = e.regions ?? (t == null ? void 0 : t.regions) ?? [], P = e.readerMetadata ?? (t == null ? void 0 : t.readerMetadata), k = (t == null ? void 0 : t.regionHover) ?? null, [M, _] = N(null), U = oo(
    k ? k.subscribe : cd,
    k ? () => k.get().itemId : Or,
    k ? () => k.get().itemId : Or
  ), F = k ? U : M, G = $((fe) => {
    k ? k.set(fe, "pdf") : _(fe);
  }, [k]), ee = dd({
    mode: s,
    compareMode: i,
    showSource: l,
    showTranslated: c,
    markdownSplit: n,
    overlayOnSource: d
  }), Q = Number.isFinite(v) && v > 0 ? ud(
    v,
    n || r,
    typeof document > "u" ? v * 2 : document.documentElement.clientWidth
  ) : null;
  return od(u, Q), /* @__PURE__ */ L(
    "div",
    {
      ref: f,
      className: bo,
      "data-reader-region-count": E.length,
      "data-reader-structured-region-count": E.filter(Ea).length,
      "data-reader-metadata-ready": P ? "true" : "false",
      children: [
        /* @__PURE__ */ L(
          "main",
          {
            className: `${Zs} reader-mode-${ee.mode}`,
            "data-reader-mode": n ? "markdown-split" : r ? "assistant-split" : s,
            children: [
              y ? /* @__PURE__ */ p(
                Cr,
                {
                  pane: "source",
                  url: b,
                  preloadedFile: R,
                  userZoom: m,
                  visible: ee.showSource,
                  scrollRoot: u,
                  pageWidthOverride: Q,
                  rowHeights: ee.compareMode ? h : void 0,
                  onMetrics: O,
                  emptyLabel: g ? "源文件不可用：该文档没有可读取的源 PDF。" : "暂无原文 PDF",
                  onNumPagesChange: C,
                  activeRegion: j,
                  regions: (S == null ? void 0 : S.regions) ?? E,
                  readerMetadata: P,
                  hoveredRegionId: F,
                  onHoverRegion: G,
                  liveTranslation: d ? o : void 0,
                  showLiveTranslation: d,
                  liveTranslationPendingLabel: d ? fd(o) : "",
                  paneAction: d ? /* @__PURE__ */ L($e, { children: [
                    e.sourcePaneAction,
                    /* @__PURE__ */ p(
                      "span",
                      {
                        className: "reader-source-overlay-badge",
                        "data-source-overlay-badge": "true",
                        title: "源栏正在叠加实时译文，右栏为最终译文 PDF",
                        children: "原文+实时译文叠加"
                      }
                    )
                  ] }) : e.sourcePaneAction
                },
                S ? `compare:${S.url}` : "source"
              ) : null,
              w ? /* @__PURE__ */ p(
                Cr,
                {
                  pane: "translated",
                  url: I,
                  preloadedFile: T,
                  userZoom: m,
                  visible: ee.showTranslated,
                  scrollRoot: u,
                  pageWidthOverride: Q,
                  rowHeights: ee.compareMode ? h : void 0,
                  onMetrics: O,
                  emptyLabel: "暂无译文 PDF",
                  onNumPagesChange: C,
                  activeRegion: j,
                  regions: E,
                  readerMetadata: P,
                  hoveredRegionId: F,
                  onHoverRegion: G,
                  liveTranslation: void 0,
                  showLiveTranslation: !1
                }
              ) : null
            ]
          }
        ),
        S ? /* @__PURE__ */ p(ld, { shellEl: u, left: S.left, right: S.right }) : null
      ]
    }
  );
}
const hd = [
  { id: "source", label: "原文", Icon: co },
  { id: "compare", label: "对照", Icon: uo },
  { id: "translated", label: "译文", Icon: fo }
];
function pd(e) {
  return e.connection === "live" ? `实时译文 · ${e.pagesByPage.size} 页` : e.connection === "reconnecting" ? "实时译文 · 重连中" : e.connection === "unavailable" ? "实时译文 · 不可用" : e.connection === "terminal" ? e.jobStatus === "failed" ? "实时译文 · 已暂停" : e.jobStatus === "cancelled" || e.jobStatus === "canceled" ? "实时译文 · 已取消" : e.jobStatus === "succeeded" ? "实时译文 · 已完成" : "实时译文 · 已结束" : e.error || "实时译文 · 连接中";
}
function gd(e) {
  return e.id === "translated" ? e.sourceViewOnly : e.id === "compare" ? !e.documentReady || e.sourceViewOnly && !e.liveTranslationAvailable : !1;
}
function bd(e) {
  const t = je(), {
    mode: n,
    documentReady: r,
    onModeChange: o,
    liveTranslation: a = null
  } = e, s = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, i = a ? pd(a.state) : "";
  return /* @__PURE__ */ L("header", { className: "reader-workspace-bar", children: [
    a ? /* @__PURE__ */ L(
      "button",
      {
        type: "button",
        className: `reader-live-translation-toggle is-${a.state.connection}${a.visible ? " is-active" : ""}`,
        "aria-pressed": a.visible,
        "aria-label": a.visible ? "隐藏实时译文" : "显示实时译文",
        title: a.state.error || i,
        onClick: a.onToggle,
        children: [
          /* @__PURE__ */ p(Da, { size: 14, strokeWidth: 2.2, "aria-hidden": !0 }),
          /* @__PURE__ */ p("span", { className: "reader-live-translation-toggle-label", children: i })
        ]
      }
    ) : null,
    /* @__PURE__ */ p("div", { className: "reader-workspace-tabs", role: "tablist", "aria-label": "阅读工作区", children: hd.map(({ id: l, label: c, Icon: d }) => {
      const f = n === l, u = gd({
        id: l,
        documentReady: r,
        sourceViewOnly: s,
        liveTranslationAvailable: !!a
      });
      return /* @__PURE__ */ L(
        "button",
        {
          type: "button",
          className: `reader-workspace-tab${f ? " is-active" : ""}`,
          role: "tab",
          "aria-selected": f,
          "aria-label": c,
          title: u ? `${c} 需要文档任务` : c,
          disabled: u,
          onClick: () => o(l),
          children: [
            /* @__PURE__ */ p(d, { size: 15, strokeWidth: 2.2, "aria-hidden": !0 }),
            /* @__PURE__ */ p("span", { className: "reader-workspace-tab-label", children: c })
          ]
        },
        l
      );
    }) })
  ] });
}
const yd = ro(function({ size: t = 24, strokeWidth: n = 2, color: r = "currentColor", className: o, ...a }, s) {
  return /* @__PURE__ */ L(
    "svg",
    {
      ref: s,
      xmlns: "http://www.w3.org/2000/svg",
      width: t,
      height: t,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: r,
      strokeWidth: n,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className: o,
      ...a,
      children: [
        /* @__PURE__ */ p("rect", { x: "2", y: "5", width: "20", height: "14", rx: "2.5" }),
        /* @__PURE__ */ p("path", { d: "M6 15V9l2.5 3L11 9v6" }),
        /* @__PURE__ */ p("path", { d: "M16.5 9v6M14.5 13l2 2 2-2" })
      ]
    }
  );
}), vd = yd, wd = {
  markdown: { label: "Markdown", short: "MD", Icon: vd, needsJob: !0 }
}, Sd = Io.map(
  (e) => ({ id: e, ...wd[e] })
);
function Vo() {
  return Sd.map(({ id: e, label: t, short: n, Icon: r, needsJob: o }) => ({
    id: e,
    label: t,
    short: n,
    Icon: r,
    needsJob: o
  }));
}
function Id(e) {
  const t = je(), { active: n } = e, r = e.sourceOnly ?? (t == null ? void 0 : t.sourceOnly) ?? !1, o = e.onSelect ?? (t == null ? void 0 : t.assistant.select) ?? (() => {
  }), a = e.onClose ?? (t == null ? void 0 : t.assistant.close) ?? (() => {
  });
  return /* @__PURE__ */ p($e, { children: Vo().map(({ id: s, label: i, Icon: l, needsJob: c }) => {
    const d = n === s, f = c && r, u = d ? `收起${i}` : `打开${i}`;
    return /* @__PURE__ */ L(
      "button",
      {
        type: "button",
        className: "reader-panel-toggle",
        "aria-label": u,
        "aria-pressed": d,
        title: f ? `${i} 需打开任务阅读` : i,
        disabled: f,
        onClick: () => d ? a() : o(s),
        children: [
          /* @__PURE__ */ p(l, { className: "reader-close-home-icon", size: 18, strokeWidth: 2.25, "aria-hidden": !0 }),
          /* @__PURE__ */ p("span", { className: "reader-panel-toggle-label", "aria-hidden": "true", children: i })
        ]
      },
      s
    );
  }) });
}
function Rd(e) {
  const t = je(), { active: n, badges: r } = e, o = e.sourceOnly ?? (t == null ? void 0 : t.sourceOnly) ?? !1, a = e.onSelect ?? (t == null ? void 0 : t.assistant.select) ?? (() => {
  }), s = e.onClose ?? (t == null ? void 0 : t.assistant.close) ?? (() => {
  }), i = Vo().map(({ id: l, label: c, short: d, Icon: f, needsJob: u }) => ({
    key: l,
    label: c,
    short: d,
    Icon: f,
    disabled: u && o,
    selected: n === l,
    badge: r == null ? void 0 : r[l],
    onClick: () => a(l)
  }));
  return n ? /* @__PURE__ */ L("header", { className: "reader-assistant-dock-header", children: [
    /* @__PURE__ */ p("div", { className: "reader-assistant-dock-tabs", role: "tablist", "aria-label": "阅读辅助面板", children: i.map(({ key: l, label: c, Icon: d, disabled: f, selected: u, badge: m, onClick: v }) => /* @__PURE__ */ L(
      "button",
      {
        type: "button",
        role: "tab",
        "aria-selected": u,
        className: `reader-assistant-dock-tab${u ? " is-active" : ""}`,
        title: f ? `${c} 需打开任务阅读` : c,
        disabled: f,
        onClick: v,
        children: [
          /* @__PURE__ */ p(d, { size: 15, strokeWidth: 2.15, "aria-hidden": !0 }),
          /* @__PURE__ */ p("span", { className: "reader-assistant-dock-tab-label", children: c }),
          m ? /* @__PURE__ */ p("span", { className: "reader-assistant-dock-badge", children: m }) : null
        ]
      },
      l
    )) }),
    /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: "reader-assistant-dock-close",
        "aria-label": "关闭阅读辅助面板",
        title: "关闭辅助面板",
        onClick: s,
        children: /* @__PURE__ */ p(bt, { size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
      }
    )
  ] }) : null;
}
function Ed(e, t) {
  const n = getComputedStyle(e), r = parseFloat(n.fontSize);
  return t * r;
}
function Pd(e, t) {
  const n = getComputedStyle(e.ownerDocument.documentElement), r = parseFloat(n.fontSize);
  return t * r;
}
function Td(e) {
  return e / 100 * window.innerHeight;
}
function kd(e) {
  return e / 100 * window.innerWidth;
}
function Nd(e) {
  switch (typeof e) {
    case "number":
      return [e, "px"];
    case "string": {
      const t = parseFloat(e);
      return e.endsWith("%") ? [t, "%"] : e.endsWith("px") ? [t, "px"] : e.endsWith("rem") ? [t, "rem"] : e.endsWith("em") ? [t, "em"] : e.endsWith("vh") ? [t, "vh"] : e.endsWith("vw") ? [t, "vw"] : [t, "%"];
    }
  }
}
function Rt({
  groupSize: e,
  panelElement: t,
  styleProp: n
}) {
  let r;
  const [o, a] = Nd(n);
  switch (a) {
    case "%": {
      r = o / 100 * e;
      break;
    }
    case "px": {
      r = o;
      break;
    }
    case "rem": {
      r = Pd(t, o);
      break;
    }
    case "em": {
      r = Ed(t, o);
      break;
    }
    case "vh": {
      r = Td(o);
      break;
    }
    case "vw": {
      r = kd(o);
      break;
    }
  }
  return r;
}
function we(e) {
  return parseFloat(e.toFixed(3));
}
function pt({
  group: e
}) {
  const { orientation: t, panels: n } = e;
  return n.reduce((r, o) => (r += t === "horizontal" ? o.element.offsetWidth : o.element.offsetHeight, r), 0);
}
function kn(e) {
  const { panels: t } = e, n = pt({ group: e });
  return n === 0 ? t.map((r) => ({
    groupResizeBehavior: r.panelConstraints.groupResizeBehavior,
    collapsedSize: 0,
    collapsible: r.panelConstraints.collapsible === !0,
    defaultSize: void 0,
    disabled: r.panelConstraints.disabled,
    minSize: 0,
    maxSize: 100,
    panelId: r.id
  })) : t.map((r) => {
    const { element: o, panelConstraints: a } = r;
    let s = 0;
    if (a.collapsedSize !== void 0) {
      const d = Rt({
        groupSize: n,
        panelElement: o,
        styleProp: a.collapsedSize
      });
      s = we(d / n * 100);
    }
    let i;
    if (a.defaultSize !== void 0) {
      const d = Rt({
        groupSize: n,
        panelElement: o,
        styleProp: a.defaultSize
      });
      i = we(d / n * 100);
    }
    let l = 0;
    if (a.minSize !== void 0) {
      const d = Rt({
        groupSize: n,
        panelElement: o,
        styleProp: a.minSize
      });
      l = we(d / n * 100);
    }
    let c = 100;
    if (a.maxSize !== void 0) {
      const d = Rt({
        groupSize: n,
        panelElement: o,
        styleProp: a.maxSize
      });
      c = we(d / n * 100);
    }
    return {
      groupResizeBehavior: a.groupResizeBehavior,
      collapsedSize: s,
      collapsible: a.collapsible === !0,
      defaultSize: i,
      disabled: a.disabled,
      minSize: l,
      maxSize: c,
      panelId: r.id
    };
  });
}
function ne(e, t = "Assertion error") {
  if (!e)
    throw Error(t);
}
function Nn(e, t) {
  return Array.from(t).sort(
    e === "horizontal" ? Md : Ad
  );
}
function Md(e, t) {
  const n = e.element.offsetLeft - t.element.offsetLeft;
  return n !== 0 ? n : e.element.offsetWidth - t.element.offsetWidth;
}
function Ad(e, t) {
  const n = e.element.offsetTop - t.element.offsetTop;
  return n !== 0 ? n : e.element.offsetHeight - t.element.offsetHeight;
}
function Ko(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.ELEMENT_NODE;
}
function Jo(e, t) {
  return {
    x: e.x >= t.left && e.x <= t.right ? 0 : Math.min(
      Math.abs(e.x - t.left),
      Math.abs(e.x - t.right)
    ),
    y: e.y >= t.top && e.y <= t.bottom ? 0 : Math.min(
      Math.abs(e.y - t.top),
      Math.abs(e.y - t.bottom)
    )
  };
}
function _d({
  orientation: e,
  rects: t,
  targetRect: n
}) {
  const r = {
    x: n.x + n.width / 2,
    y: n.y + n.height / 2
  };
  let o, a = Number.MAX_VALUE;
  for (const s of t) {
    const { x: i, y: l } = Jo(r, s), c = e === "horizontal" ? i : l;
    c < a && (a = c, o = s);
  }
  return ne(o, "No rect found"), o;
}
let jt;
function Ld() {
  return jt === void 0 && (typeof matchMedia == "function" ? jt = !!matchMedia("(pointer:coarse)").matches : jt = !1), jt;
}
function qo(e) {
  const { element: t, orientation: n, panels: r, separators: o } = e, a = Nn(
    n,
    Array.from(t.children).filter(Ko).map((v) => ({ element: v }))
  ).map(({ element: v }) => v), s = [];
  let i = !1, l = !1, c = -1, d = -1, f = 0, u, m = [];
  {
    let v = -1;
    for (const h of a)
      h.hasAttribute("data-panel") && (v++, h.hasAttribute("data-disabled") || (f++, c === -1 && (c = v), d = v));
  }
  if (f > 1) {
    let v = -1;
    for (const h of a)
      if (h.hasAttribute("data-panel")) {
        v++;
        const y = r.find(
          (w) => w.element === h
        );
        if (y) {
          if (u) {
            const w = u.element.getBoundingClientRect(), g = h.getBoundingClientRect();
            let S;
            if (l) {
              const b = n === "horizontal" ? new DOMRect(
                w.right,
                w.top,
                0,
                w.height
              ) : new DOMRect(
                w.left,
                w.bottom,
                w.width,
                0
              ), I = n === "horizontal" ? new DOMRect(g.left, g.top, 0, g.height) : new DOMRect(g.left, g.top, g.width, 0);
              switch (m.length) {
                case 0: {
                  S = [
                    b,
                    I
                  ];
                  break;
                }
                case 1: {
                  const R = m[0], T = _d({
                    orientation: n,
                    rects: [w, g],
                    targetRect: R.element.getBoundingClientRect()
                  });
                  S = [
                    R,
                    T === w ? I : b
                  ];
                  break;
                }
                default: {
                  S = m;
                  break;
                }
              }
            } else
              m.length ? S = m : S = [
                n === "horizontal" ? new DOMRect(
                  w.right,
                  g.top,
                  g.left - w.right,
                  g.height
                ) : new DOMRect(
                  g.left,
                  w.bottom,
                  g.width,
                  g.top - w.bottom
                )
              ];
            for (const b of S) {
              let I = "width" in b ? b : b.element.getBoundingClientRect();
              const R = Ld() ? e.resizeTargetMinimumSize.coarse : e.resizeTargetMinimumSize.fine;
              if (I.width < R) {
                const O = R - I.width;
                I = new DOMRect(
                  I.x - O / 2,
                  I.y,
                  I.width + O,
                  I.height
                );
              }
              if (I.height < R) {
                const O = R - I.height;
                I = new DOMRect(
                  I.x,
                  I.y - O / 2,
                  I.width,
                  I.height + O
                );
              }
              const T = v <= c || v > d;
              !i && !T && s.push({
                group: e,
                groupSize: pt({ group: e }),
                panels: [u, y],
                separator: "width" in b ? void 0 : b,
                rect: I
              }), i = !1;
            }
          }
          l = !1, u = y, m = [];
        }
      } else if (h.hasAttribute("data-separator")) {
        h.ariaDisabled !== null && (i = !0);
        const y = o.find(
          (w) => w.element === h
        );
        y ? m.push(y) : (u = void 0, m = []);
      } else
        l = !0;
  }
  return s;
}
var Ve;
class Go {
  constructor() {
    ar(this, Ve, {});
  }
  addListener(t, n) {
    const r = yt(this, Ve)[t];
    return r === void 0 ? yt(this, Ve)[t] = [n] : r.includes(n) || r.push(n), () => {
      this.removeListener(t, n);
    };
  }
  emit(t, n) {
    const r = yt(this, Ve)[t];
    if (r !== void 0)
      if (r.length === 1)
        r[0].call(null, n);
      else {
        let o = !1, a = null;
        const s = Array.from(r);
        for (let i = 0; i < s.length; i++) {
          const l = s[i];
          try {
            l.call(null, n);
          } catch (c) {
            a === null && (o = !0, a = c);
          }
        }
        if (o)
          throw a;
      }
  }
  removeAllListeners() {
    sr(this, Ve, {});
  }
  removeListener(t, n) {
    const r = yt(this, Ve)[t];
    if (r !== void 0) {
      const o = r.indexOf(n);
      o >= 0 && r.splice(o, 1);
    }
  }
}
Ve = new WeakMap();
let mt = {
  cursorFlags: 0,
  state: "inactive"
};
const Hn = new Go();
function nt() {
  return mt;
}
function Cd(e) {
  return Hn.addListener("change", e);
}
function xd(e) {
  const t = mt, n = { ...mt };
  n.cursorFlags = e, mt = n, Hn.emit("change", {
    prev: t,
    next: n
  });
}
function ht(e) {
  const t = mt;
  mt = e, Hn.emit("change", {
    prev: t,
    next: e
  });
}
const Dd = (e) => e, fn = () => {
}, Zo = 1, Yo = 2, Xo = 4, Qo = 8, $r = 3, Fr = 12;
let Bt;
function jr() {
  return Bt === void 0 && (Bt = !1, typeof window < "u" && (window.navigator.userAgent.includes("Chrome") || window.navigator.userAgent.includes("Firefox")) && (Bt = !0)), Bt;
}
function zd({
  cursorFlags: e,
  groups: t,
  state: n
}) {
  let r = 0, o = 0;
  switch (n) {
    case "active":
    case "hover":
      t.forEach((a) => {
        if (!a.mutableState.disableCursor)
          switch (a.orientation) {
            case "horizontal": {
              r++;
              break;
            }
            case "vertical": {
              o++;
              break;
            }
          }
      });
  }
  if (!(r === 0 && o === 0)) {
    switch (n) {
      case "active": {
        if (e && jr()) {
          const a = (e & Zo) !== 0, s = (e & Yo) !== 0, i = (e & Xo) !== 0, l = (e & Qo) !== 0;
          if (a)
            return i ? "se-resize" : l ? "ne-resize" : "e-resize";
          if (s)
            return i ? "sw-resize" : l ? "nw-resize" : "w-resize";
          if (i)
            return "s-resize";
          if (l)
            return "n-resize";
        }
        break;
      }
    }
    return jr() ? r > 0 && o > 0 ? "move" : r > 0 ? "ew-resize" : "ns-resize" : r > 0 && o > 0 ? "grab" : r > 0 ? "col-resize" : "row-resize";
  }
}
const Br = /* @__PURE__ */ new WeakMap();
function Wn(e) {
  if (e.defaultView === null || e.defaultView === void 0)
    return;
  let { prevStyle: t, styleSheet: n } = Br.get(e) ?? {};
  n === void 0 && (n = new e.defaultView.CSSStyleSheet(), e.adoptedStyleSheets && (Object.isExtensible(e.adoptedStyleSheets) ? e.adoptedStyleSheets.push(n) : e.adoptedStyleSheets = [
    ...e.adoptedStyleSheets,
    n
  ]));
  const r = nt();
  switch (r.state) {
    case "active":
    case "hover": {
      const o = zd({
        cursorFlags: r.cursorFlags,
        groups: r.hitRegions.map((s) => s.group),
        state: r.state
      }), a = `*, *:hover {cursor: ${o} !important; }`;
      if (t === a)
        return;
      t = a, o ? n.cssRules.length === 0 ? n.insertRule(a) : n.replaceSync(a) : n.cssRules.length === 1 && n.deleteRule(0);
      break;
    }
    case "inactive": {
      t = void 0, n.cssRules.length === 1 && n.deleteRule(0);
      break;
    }
  }
  Br.set(e, {
    prevStyle: t,
    styleSheet: n
  });
}
let Ae = /* @__PURE__ */ new Map();
const ea = new Go();
function Od(e) {
  Ae = new Map(Ae), Ae.delete(e);
}
function Ur(e, t) {
  for (const [n] of Ae)
    if (n.id === e)
      return n;
}
function Je(e, t) {
  for (const [n, r] of Ae)
    if (n.id === e)
      return r;
  if (t)
    throw Error(`Could not find data for Group with id ${e}`);
}
function at() {
  return Ae;
}
function Vn(e, t) {
  return ea.addListener("groupChange", (n) => {
    n.group.id === e && t(n);
  });
}
function Fe(e, t, n) {
  const r = Ae.get(e);
  Ae = new Map(Ae), Ae.set(e, t), ea.emit("groupChange", {
    group: e,
    isUserInteraction: (n == null ? void 0 : n.isUserInteraction) === !0,
    prev: r,
    next: t
  });
}
function ta(e) {
  const t = nt();
  let n = !1;
  switch (t.state) {
    case "active":
      ht({
        cursorFlags: 0,
        state: "inactive"
      }), t.hitRegions.length > 0 && (Wn(e), n = !0, t.hitRegions.forEach((r) => {
        const o = Je(r.group.id, !0);
        Fe(r.group, o, {
          isUserInteraction: !0
        });
      }));
  }
  return n;
}
function Hr(e) {
  e.defaultPrevented || ta(e.currentTarget);
}
function $d(e, t, n) {
  let r, o = {
    x: 1 / 0,
    y: 1 / 0
  };
  for (const a of t) {
    const s = Jo(n, a.rect);
    switch (e) {
      case "horizontal": {
        s.x <= o.x && (r = a, o = s);
        break;
      }
      case "vertical": {
        s.y <= o.y && (r = a, o = s);
        break;
      }
    }
  }
  return r ? {
    distance: o,
    hitRegion: r
  } : void 0;
}
function Fd(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}
function jd(e, t) {
  if (e === t) throw new Error("Cannot compare node with itself");
  const n = {
    a: Kr(e),
    b: Kr(t)
  };
  let r;
  for (; n.a.at(-1) === n.b.at(-1); )
    r = n.a.pop(), n.b.pop();
  ne(
    r,
    "Stacking order can only be calculated for elements with a common ancestor"
  );
  const o = {
    a: Vr(Wr(n.a)),
    b: Vr(Wr(n.b))
  };
  if (o.a === o.b) {
    const a = r.childNodes, s = {
      a: n.a.at(-1),
      b: n.b.at(-1)
    };
    let i = a.length;
    for (; i--; ) {
      const l = a[i];
      if (l === s.a) return 1;
      if (l === s.b) return -1;
    }
  }
  return Math.sign(o.a - o.b);
}
const Bd = /\b(?:position|zIndex|opacity|transform|webkitTransform|mixBlendMode|filter|webkitFilter|isolation)\b/;
function Ud(e) {
  const t = getComputedStyle(na(e) ?? e).display;
  return t === "flex" || t === "inline-flex";
}
function Hd(e) {
  const t = getComputedStyle(e);
  return !!(t.position === "fixed" || t.zIndex !== "auto" && (t.position !== "static" || Ud(e)) || +t.opacity < 1 || "transform" in t && t.transform !== "none" || "webkitTransform" in t && t.webkitTransform !== "none" || "mixBlendMode" in t && t.mixBlendMode !== "normal" || "filter" in t && t.filter !== "none" || "webkitFilter" in t && t.webkitFilter !== "none" || "isolation" in t && t.isolation === "isolate" || Bd.test(t.willChange) || t.webkitOverflowScrolling === "touch");
}
function Wr(e) {
  let t = e.length;
  for (; t--; ) {
    const n = e[t];
    if (ne(n, "Missing node"), Hd(n)) return n;
  }
  return null;
}
function Vr(e) {
  return e && Number(getComputedStyle(e).zIndex) || 0;
}
function Kr(e) {
  const t = [];
  for (; e; )
    t.push(e), e = na(e);
  return t;
}
function na(e) {
  const { parentNode: t } = e;
  return Fd(t) ? t.host : t;
}
function Wd(e, t) {
  return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function Vd({
  groupElement: e,
  hitRegion: t,
  pointerEventTarget: n
}) {
  if (!Ko(n) || n.contains(e) || e.contains(n))
    return !0;
  if (jd(n, e) > 0) {
    let r = n;
    for (; r; ) {
      if (r.contains(e))
        return !0;
      if (Wd(r.getBoundingClientRect(), t))
        return !1;
      r = r.parentElement;
    }
  }
  return !0;
}
function Kn(e, t) {
  const n = [];
  return t.forEach((r, o) => {
    if (o.disabled)
      return;
    const a = qo(o), s = $d(o.orientation, a, {
      x: e.clientX,
      y: e.clientY
    });
    s && s.distance.x <= 0 && s.distance.y <= 0 && Vd({
      groupElement: o.element,
      hitRegion: s.hitRegion.rect,
      pointerEventTarget: e.target
    }) && n.push(s.hitRegion);
  }), n;
}
function Kd(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] != t[n])
      return !1;
  return !0;
}
function ge(e, t, n = 0) {
  return Math.abs(we(e) - we(t)) <= n;
}
function Me(e, t) {
  return ge(e, t) ? 0 : e > t ? 1 : -1;
}
function ft({
  overrideDisabledPanels: e,
  panelConstraints: t,
  prevSize: n,
  size: r
}) {
  const {
    collapsedSize: o = 0,
    collapsible: a,
    disabled: s,
    maxSize: i = 100,
    minSize: l = 0
  } = t;
  if (s && !e)
    return n;
  if (Me(r, l) < 0)
    if (a) {
      const c = (o + l) / 2;
      Me(r, c) < 0 ? r = o : r = l;
    } else
      r = l;
  return r = Math.min(i, r), r = we(r), r;
}
function Mt({
  delta: e,
  initialLayout: t,
  panelConstraints: n,
  pivotIndices: r,
  prevLayout: o,
  trigger: a
}) {
  if (ge(e, 0))
    return t;
  const s = a === "imperative-api", i = Object.values(t), l = Object.values(o), c = [...i], [d, f] = r;
  ne(d != null, "Invalid first pivot index"), ne(f != null, "Invalid second pivot index");
  let u = 0;
  switch (a) {
    case "keyboard": {
      {
        const h = e < 0 ? f : d, y = n[h];
        ne(
          y,
          `Panel constraints not found for index ${h}`
        );
        const {
          collapsedSize: w = 0,
          collapsible: g,
          minSize: S = 0
        } = y;
        if (g) {
          const b = i[h];
          if (ne(
            b != null,
            `Previous layout not found for panel index ${h}`
          ), ge(b, w)) {
            const I = S - b;
            Me(I, Math.abs(e)) > 0 && (e = e < 0 ? 0 - I : I);
          }
        }
      }
      {
        const h = e < 0 ? d : f, y = n[h];
        ne(
          y,
          `No panel constraints found for index ${h}`
        );
        const {
          collapsedSize: w = 0,
          collapsible: g,
          minSize: S = 0
        } = y;
        if (g) {
          const b = i[h];
          if (ne(
            b != null,
            `Previous layout not found for panel index ${h}`
          ), ge(b, S)) {
            const I = b - w;
            Me(I, Math.abs(e)) > 0 && (e = e < 0 ? 0 - I : I);
          }
        }
      }
      break;
    }
    default: {
      const h = e < 0 ? f : d, y = n[h];
      ne(
        y,
        `Panel constraints not found for index ${h}`
      );
      const w = i[h], { collapsible: g, collapsedSize: S, minSize: b } = y;
      if (g && Me(w, b) < 0)
        if (e > 0) {
          const I = b - S, R = I / 2, T = w + e;
          Me(T, b) < 0 && (e = Me(e, R) <= 0 ? 0 : I);
        } else {
          const I = b - S, R = 100 - I / 2, T = w - e;
          Me(T, b) < 0 && (e = Me(100 + e, R) > 0 ? 0 : -I);
        }
      break;
    }
  }
  {
    const h = e < 0 ? 1 : -1;
    let y = e < 0 ? f : d, w = 0;
    for (; ; ) {
      const S = i[y];
      ne(
        S != null,
        `Previous layout not found for panel index ${y}`
      );
      const b = ft({
        overrideDisabledPanels: s,
        panelConstraints: n[y],
        prevSize: S,
        size: 100
      }) - S;
      if (w += b, y += h, y < 0 || y >= n.length)
        break;
    }
    const g = Math.min(Math.abs(e), Math.abs(w));
    e = e < 0 ? 0 - g : g;
  }
  {
    let h = e < 0 ? d : f;
    for (; h >= 0 && h < n.length; ) {
      const y = Math.abs(e) - Math.abs(u), w = i[h];
      ne(
        w != null,
        `Previous layout not found for panel index ${h}`
      );
      const g = w - y, S = ft({
        overrideDisabledPanels: s,
        panelConstraints: n[h],
        prevSize: w,
        size: g
      });
      if (!ge(w, S) && (u += w - S, c[h] = S, u.toFixed(3).localeCompare(Math.abs(e).toFixed(3), void 0, {
        numeric: !0
      }) >= 0))
        break;
      e < 0 ? h-- : h++;
    }
  }
  if (Kd(l, c))
    return o;
  {
    const h = e < 0 ? f : d, y = i[h];
    ne(
      y != null,
      `Previous layout not found for panel index ${h}`
    );
    const w = y + u, g = ft({
      overrideDisabledPanels: s,
      panelConstraints: n[h],
      prevSize: y,
      size: w
    });
    if (c[h] = g, !ge(g, w)) {
      let S = w - g, b = e < 0 ? f : d;
      for (; b >= 0 && b < n.length; ) {
        const I = c[b];
        ne(
          I != null,
          `Previous layout not found for panel index ${b}`
        );
        const R = I + S, T = ft({
          overrideDisabledPanels: s,
          panelConstraints: n[b],
          prevSize: I,
          size: R
        });
        if (ge(I, T) || (S -= T - I, c[b] = T), ge(S, 0))
          break;
        e > 0 ? b-- : b++;
      }
    }
  }
  const m = Object.values(c).reduce(
    (h, y) => y + h,
    0
  );
  if (!ge(m, 100, 0.1))
    return o;
  const v = Object.keys(o);
  return c.reduce((h, y, w) => (h[v[w]] = y, h), {});
}
function rt(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (t[n] === void 0 || Me(e[n], t[n]) !== 0)
      return !1;
  return !0;
}
function ot({
  layout: e,
  panelConstraints: t
}) {
  const n = Object.values(e), r = [...n], o = r.reduce(
    (i, l) => i + l,
    0
  );
  if (r.length !== t.length)
    throw Error(
      `Invalid ${t.length} panel layout: ${r.map((i) => `${i}%`).join(", ")}`
    );
  if (!ge(o, 100) && r.length > 0)
    for (let i = 0; i < t.length; i++) {
      const l = r[i];
      ne(l != null, `No layout data found for index ${i}`);
      const c = 100 / o * l;
      r[i] = c;
    }
  let a = 0;
  for (let i = 0; i < t.length; i++) {
    const l = n[i];
    ne(l != null, `No layout data found for index ${i}`);
    const c = r[i];
    ne(c != null, `No layout data found for index ${i}`);
    const d = ft({
      overrideDisabledPanels: !0,
      panelConstraints: t[i],
      prevSize: l,
      size: c
    });
    c != d && (a += c - d, r[i] = d);
  }
  if (!ge(a, 0))
    for (let i = 0; i < t.length; i++) {
      const l = r[i];
      ne(l != null, `No layout data found for index ${i}`);
      const c = l + a, d = ft({
        overrideDisabledPanels: !0,
        panelConstraints: t[i],
        prevSize: l,
        size: c
      });
      if (l !== d && (a -= d - l, r[i] = d, ge(a, 0)))
        break;
    }
  const s = Object.keys(e);
  return r.reduce((i, l, c) => (i[s[c]] = l, i), {});
}
function ra({
  groupId: e,
  panelId: t
}) {
  const n = () => {
    const l = at();
    for (const [
      c,
      {
        defaultLayoutDeferred: d,
        derivedPanelConstraints: f,
        layout: u,
        groupSize: m,
        separatorToPanels: v
      }
    ] of l)
      if (c.id === e)
        return {
          defaultLayoutDeferred: d,
          derivedPanelConstraints: f,
          group: c,
          groupSize: m,
          layout: u,
          separatorToPanels: v
        };
    throw Error(`Group ${e} not found`);
  }, r = () => {
    const l = n().derivedPanelConstraints.find(
      (c) => c.panelId === t
    );
    if (l !== void 0)
      return l;
    throw Error(`Panel constraints not found for Panel ${t}`);
  }, o = () => {
    const l = n().group.panels.find((c) => c.id === t);
    if (l !== void 0)
      return l;
    throw Error(`Layout not found for Panel ${t}`);
  }, a = () => {
    const l = n().layout[t];
    if (l !== void 0)
      return l;
    throw Error(`Layout not found for Panel ${t}`);
  }, s = ({
    nextSize: l,
    panels: c,
    prevLayout: d,
    derivedPanelConstraints: f
  }) => {
    const u = a(), m = c.findIndex((y) => y.id === t), v = m === 0, h = m === c.length - 1;
    if (h && l < u && (v || c.slice(0, m).every((y, w) => {
      const g = f[w];
      return (g == null ? void 0 : g.collapsible) && ge(g.collapsedSize, d[g.panelId]);
    }))) {
      const y = c.slice(0, m).reduce((w, g) => w + d[g.id], 0);
      return {
        ...d,
        [t]: we(100 - y)
      };
    }
    return Mt({
      delta: h ? u - l : l - u,
      initialLayout: d,
      panelConstraints: f,
      pivotIndices: h ? [m - 1, m] : [m, m + 1],
      prevLayout: d,
      trigger: "imperative-api"
    });
  }, i = (l) => {
    const c = a();
    if (l === c)
      return;
    const {
      defaultLayoutDeferred: d,
      derivedPanelConstraints: f,
      group: u,
      groupSize: m,
      layout: v,
      separatorToPanels: h
    } = n(), y = s({
      nextSize: l,
      panels: u.panels,
      prevLayout: v,
      derivedPanelConstraints: f
    }), w = ot({
      layout: y,
      panelConstraints: f
    });
    rt(v, w) || Fe(u, {
      defaultLayoutDeferred: d,
      derivedPanelConstraints: f,
      groupSize: m,
      layout: w,
      separatorToPanels: h
    });
  };
  return {
    collapse: () => {
      const { collapsible: l, collapsedSize: c } = r(), { mutableValues: d } = o(), f = a();
      l && f !== c && (d.expandToSize = f, i(c));
    },
    expand: () => {
      const { collapsible: l, collapsedSize: c, minSize: d } = r(), { mutableValues: f } = o(), u = a();
      if (l && u === c) {
        let m = f.expandToSize ?? d;
        m === 0 && (m = 1), i(m);
      }
    },
    getSize: () => {
      const { group: l } = n(), c = a(), { element: d } = o(), f = l.orientation === "horizontal" ? d.offsetWidth : d.offsetHeight;
      return {
        asPercentage: c,
        inPixels: f
      };
    },
    isCollapsed: () => {
      const { collapsible: l, collapsedSize: c } = r(), d = a();
      return l && ge(c, d);
    },
    resize: (l) => {
      const { group: c } = n(), { element: d } = o(), f = pt({ group: c }), u = Rt({
        groupSize: f,
        panelElement: d,
        styleProp: l
      }), m = we(u / f * 100);
      i(m);
    }
  };
}
function Jr(e) {
  if (e.defaultPrevented)
    return;
  const t = at();
  Kn(e, t).forEach((n) => {
    if (n.separator && !n.separator.disableDoubleClick) {
      const r = n.panels.find(
        (o) => o.panelConstraints.defaultSize !== void 0
      );
      if (r) {
        const o = r.panelConstraints.defaultSize, a = ra({
          groupId: n.group.id,
          panelId: r.id
        });
        a && o !== void 0 && (a.resize(o), e.preventDefault());
      }
    }
  });
}
function Ht(e) {
  const t = at();
  for (const [n] of t)
    if (n.separators.some(
      (r) => r.element === e
    ))
      return n;
  throw Error("Could not find parent Group for separator element");
}
function oa({
  groupId: e
}) {
  const t = () => {
    const n = at();
    for (const [r, o] of n)
      if (r.id === e)
        return { group: r, ...o };
    throw Error(`Could not find Group with id "${e}"`);
  };
  return {
    getLayout() {
      const { defaultLayoutDeferred: n, layout: r } = t();
      return n ? {} : r;
    },
    setLayout(n) {
      const {
        defaultLayoutDeferred: r,
        derivedPanelConstraints: o,
        group: a,
        groupSize: s,
        layout: i,
        separatorToPanels: l
      } = t(), c = ot({
        layout: n,
        panelConstraints: o
      });
      return r ? i : (rt(i, c) || Fe(a, {
        defaultLayoutDeferred: r,
        derivedPanelConstraints: o,
        groupSize: s,
        layout: c,
        separatorToPanels: l
      }), c);
    }
  };
}
function Qe(e, t) {
  const n = Ht(e), r = Je(n.id, !0), o = n.separators.find(
    (d) => d.element === e
  );
  ne(o, "Matching separator not found");
  const a = r.separatorToPanels.get(o);
  ne(a, "Matching panels not found");
  const s = a.map((d) => n.panels.indexOf(d)), i = oa({ groupId: n.id }).getLayout(), l = Mt({
    delta: t,
    initialLayout: i,
    panelConstraints: r.derivedPanelConstraints,
    pivotIndices: s,
    prevLayout: i,
    trigger: "keyboard"
  }), c = ot({
    layout: l,
    panelConstraints: r.derivedPanelConstraints
  });
  rt(i, c) || Fe(
    n,
    {
      defaultLayoutDeferred: r.defaultLayoutDeferred,
      derivedPanelConstraints: r.derivedPanelConstraints,
      groupSize: r.groupSize,
      layout: c,
      separatorToPanels: r.separatorToPanels
    },
    // Keyboard resizes (arrow keys, Home/End, Enter collapse/expand) originate
    // from a real DOM event on the separator, so they are user interactions
    // just like pointer drags. This function is only reached from
    // onDocumentKeyDown. See #716.
    { isUserInteraction: !0 }
  );
}
function qr(e) {
  if (e.defaultPrevented)
    return;
  const t = e.currentTarget, n = Ht(t);
  if (!n.disabled)
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault(), n.orientation === "vertical" && Qe(t, 5);
        break;
      }
      case "ArrowLeft": {
        e.preventDefault(), n.orientation === "horizontal" && Qe(t, -5);
        break;
      }
      case "ArrowRight": {
        e.preventDefault(), n.orientation === "horizontal" && Qe(t, 5);
        break;
      }
      case "ArrowUp": {
        e.preventDefault(), n.orientation === "vertical" && Qe(t, -5);
        break;
      }
      case "End": {
        e.preventDefault(), Qe(t, 100);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const r = Ht(t), o = Je(r.id, !0), { derivedPanelConstraints: a, layout: s, separatorToPanels: i } = o, l = r.separators.find(
          (u) => u.element === t
        );
        ne(l, "Matching separator not found");
        const c = i.get(l);
        ne(c, "Matching panels not found");
        const d = c[0], f = a.find(
          (u) => u.panelId === d.id
        );
        if (ne(f, "Panel metadata not found"), f.collapsible) {
          const u = s[d.id], m = f.collapsedSize === u ? r.mutableState.expandedPanelSizes[d.id] ?? f.minSize : f.collapsedSize;
          Qe(t, m - u);
        }
        break;
      }
      case "F6": {
        e.preventDefault();
        const r = Ht(t).separators.map(
          (s) => s.element
        ), o = Array.from(r).findIndex(
          (s) => s === e.currentTarget
        );
        ne(o !== null, "Index not found");
        const a = e.shiftKey ? o > 0 ? o - 1 : r.length - 1 : o + 1 < r.length ? o + 1 : 0;
        r[a].focus({
          preventScroll: !0
        });
        break;
      }
      case "Home": {
        e.preventDefault(), Qe(t, -100);
        break;
      }
    }
}
function Gr(e) {
  if (e.defaultPrevented || e.pointerType === "mouse" && e.button > 0)
    return;
  const t = at(), n = Kn(e, t), r = /* @__PURE__ */ new Map();
  let o = !1;
  n.forEach((a) => {
    a.separator && (o || (o = !0, a.separator.element.focus({
      // @ts-expect-error https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus#browser_compatibility
      focusVisible: !1,
      preventScroll: !0
    })));
    const s = t.get(a.group);
    s && r.set(a.group, s.layout);
  }), ht({
    cursorFlags: 0,
    hitRegions: n,
    initialLayoutMap: r,
    pointerDownAtPoint: { x: e.clientX, y: e.clientY },
    state: "active"
  }), n.length && e.preventDefault();
}
function aa({
  document: e,
  event: t,
  hitRegions: n,
  initialLayoutMap: r,
  mountedGroups: o,
  pointerDownAtPoint: a,
  prevCursorFlags: s
}) {
  let i = 0;
  n.forEach((c) => {
    const { group: d, groupSize: f } = c, { orientation: u, panels: m } = d, { disableCursor: v } = d.mutableState;
    let h = 0;
    a ? u === "horizontal" ? h = (t.clientX - a.x) / f * 100 : h = (t.clientY - a.y) / f * 100 : u === "horizontal" ? h = t.clientX < 0 ? -100 : 100 : h = t.clientY < 0 ? -100 : 100;
    const y = r.get(d), w = o.get(d);
    if (!y || !w)
      return;
    const {
      defaultLayoutDeferred: g,
      derivedPanelConstraints: S,
      groupSize: b,
      layout: I,
      separatorToPanels: R
    } = w;
    if (S && I && R) {
      const T = Mt({
        delta: h,
        initialLayout: y,
        panelConstraints: S,
        pivotIndices: c.panels.map((O) => m.indexOf(O)),
        prevLayout: I,
        trigger: "mouse-or-touch"
      });
      if (rt(T, I)) {
        if (h !== 0 && !v)
          switch (u) {
            case "horizontal": {
              i |= h < 0 ? Zo : Yo;
              break;
            }
            case "vertical": {
              i |= h < 0 ? Xo : Qo;
              break;
            }
          }
      } else
        Fe(c.group, {
          defaultLayoutDeferred: g,
          derivedPanelConstraints: S,
          groupSize: b,
          layout: T,
          separatorToPanels: R
        });
    }
  });
  let l = 0;
  t.movementX === 0 ? l |= s & $r : l |= i & $r, t.movementY === 0 ? l |= s & Fr : l |= i & Fr, xd(l), Wn(e);
}
function Zr(e) {
  const t = at(), n = nt();
  switch (n.state) {
    case "active":
      aa({
        document: e.currentTarget,
        event: e,
        hitRegions: n.hitRegions,
        initialLayoutMap: n.initialLayoutMap,
        mountedGroups: t,
        prevCursorFlags: n.cursorFlags
      });
  }
}
function Yr(e) {
  var r, o;
  if (e.defaultPrevented)
    return;
  const t = nt(), n = at();
  switch (t.state) {
    case "active": {
      if (
        // Skip this check for "pointerleave" events, else Firefox triggers a false positive (see #514)
        e.buttons === 0
      ) {
        ht({
          cursorFlags: 0,
          state: "inactive"
        }), t.hitRegions.forEach((a) => {
          const s = Je(a.group.id, !0);
          Fe(a.group, s, {
            isUserInteraction: !0
          });
        });
        return;
      }
      for (const a of t.hitRegions)
        if (a.separator) {
          const { element: s } = a.separator;
          (r = s.hasPointerCapture) != null && r.call(s, e.pointerId) || ((o = s.setPointerCapture) == null || o.call(s, e.pointerId));
        }
      aa({
        document: e.currentTarget,
        event: e,
        hitRegions: t.hitRegions,
        initialLayoutMap: t.initialLayoutMap,
        mountedGroups: n,
        pointerDownAtPoint: t.pointerDownAtPoint,
        prevCursorFlags: t.cursorFlags
      });
      break;
    }
    default: {
      const a = Kn(e, n);
      a.length === 0 ? t.state !== "inactive" && ht({
        cursorFlags: 0,
        state: "inactive"
      }) : ht({
        cursorFlags: 0,
        hitRegions: a,
        state: "hover"
      }), Wn(e.currentTarget);
      break;
    }
  }
}
function Xr(e) {
  if (e.relatedTarget instanceof HTMLIFrameElement)
    switch (nt().state) {
      case "hover":
        ht({
          cursorFlags: 0,
          state: "inactive"
        });
    }
}
function Qr(e) {
  e.defaultPrevented || e.pointerType === "mouse" && e.button > 0 || ta(e.currentTarget) && e.preventDefault();
}
function eo(e) {
  let t = 0, n = 0;
  const r = {};
  for (const a of e)
    if (a.defaultSize !== void 0) {
      t++;
      const s = we(a.defaultSize);
      n += s, r[a.panelId] = s;
    } else
      r[a.panelId] = void 0;
  const o = e.length - t;
  if (o !== 0) {
    const a = we((100 - n) / o);
    for (const s of e)
      s.defaultSize === void 0 && (r[s.panelId] = a);
  }
  return r;
}
function Jd(e, t, n) {
  if (!n[0])
    return;
  const r = e.panels.find((l) => l.element === t);
  if (!r || !r.onResize)
    return;
  const o = pt({ group: e }), a = e.orientation === "horizontal" ? r.element.offsetWidth : r.element.offsetHeight, s = r.mutableValues.prevSize, i = {
    asPercentage: we(a / o * 100),
    inPixels: a
  };
  r.mutableValues.prevSize = i, r.onResize(i, r.id, s);
}
function qd(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function Gd({
  group: e,
  nextGroupSize: t,
  prevGroupSize: n,
  prevLayout: r
}) {
  if (n <= 0 || t <= 0 || n === t)
    return r;
  let o = 0, a = 0, s = !1;
  const i = /* @__PURE__ */ new Map(), l = [];
  for (const f of e.panels) {
    const u = r[f.id] ?? 0;
    switch (f.panelConstraints.groupResizeBehavior) {
      case "preserve-pixel-size": {
        s = !0;
        const m = u / 100 * n, v = we(
          m / t * 100
        );
        i.set(f.id, v), o += v;
        break;
      }
      case "preserve-relative-size":
      default: {
        l.push(f.id), a += u;
        break;
      }
    }
  }
  if (!s || l.length === 0)
    return r;
  const c = 100 - o, d = { ...r };
  if (i.forEach((f, u) => {
    d[u] = f;
  }), a > 0)
    for (const f of l) {
      const u = r[f] ?? 0;
      d[f] = we(
        u / a * c
      );
    }
  else {
    const f = we(
      c / l.length
    );
    for (const u of l)
      d[u] = f;
  }
  return d;
}
function Zd(e, t) {
  const n = e.map((o) => o.id), r = Object.keys(t);
  if (n.length !== r.length)
    return !1;
  for (const o of n)
    if (!r.includes(o))
      return !1;
  return !0;
}
const ct = /* @__PURE__ */ new Map();
function Yd(e) {
  let t = !0;
  ne(
    e.element.ownerDocument.defaultView,
    "Cannot register an unmounted Group"
  );
  const n = e.element.ownerDocument.defaultView.ResizeObserver, r = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), a = new n((v) => {
    for (const h of v) {
      const { borderBoxSize: y, target: w } = h;
      if (w === e.element) {
        if (t) {
          const g = pt({ group: e });
          if (g === 0)
            return;
          const S = Je(e.id);
          if (!S)
            return;
          const b = kn(e), I = S.defaultLayoutDeferred ? eo(b) : S.layout, R = Gd({
            group: e,
            nextGroupSize: g,
            prevGroupSize: S.groupSize,
            prevLayout: I
          }), T = ot({
            layout: R,
            panelConstraints: b
          });
          if (!S.defaultLayoutDeferred && rt(S.layout, T) && qd(
            S.derivedPanelConstraints,
            b
          ) && S.groupSize === g)
            return;
          Fe(e, {
            defaultLayoutDeferred: !1,
            derivedPanelConstraints: b,
            groupSize: g,
            layout: T,
            separatorToPanels: S.separatorToPanels
          });
        }
      } else
        Jd(e, w, y);
    }
  });
  a.observe(e.element), e.panels.forEach((v) => {
    ne(
      !r.has(v.id),
      `Panel ids must be unique; id "${v.id}" was used more than once`
    ), r.add(v.id), v.onResize && a.observe(v.element);
  });
  const s = pt({ group: e }), i = kn(e), l = e.panels.map(({ id: v }) => v).join(",");
  let c = e.mutableState.defaultLayout;
  c && (Zd(e.panels, c) || (c = void 0));
  const d = e.mutableState.layouts[l] ?? c ?? eo(i), f = ot({
    layout: d,
    panelConstraints: i
  }), u = e.element.ownerDocument;
  ct.set(
    u,
    (ct.get(u) ?? 0) + 1
  );
  const m = /* @__PURE__ */ new Map();
  return qo(e).forEach((v) => {
    v.separator && m.set(v.separator, v.panels);
  }), Fe(e, {
    defaultLayoutDeferred: s === 0,
    derivedPanelConstraints: i,
    groupSize: s,
    layout: f,
    separatorToPanels: m
  }), e.separators.forEach((v) => {
    ne(
      !o.has(v.id),
      `Separator ids must be unique; id "${v.id}" was used more than once`
    ), o.add(v.id), v.element.addEventListener("keydown", qr);
  }), ct.get(u) === 1 && (u.addEventListener("contextmenu", Hr, !0), u.addEventListener("dblclick", Jr, !0), u.addEventListener("pointerdown", Gr, !0), u.addEventListener("pointerleave", Zr), u.addEventListener("pointermove", Yr), u.addEventListener("pointerout", Xr), u.addEventListener("pointerup", Qr, !0)), function() {
    t = !1, ct.set(
      u,
      Math.max(0, (ct.get(u) ?? 0) - 1)
    ), Od(e), e.separators.forEach((v) => {
      v.element.removeEventListener("keydown", qr);
    }), ct.get(u) || (u.removeEventListener(
      "contextmenu",
      Hr,
      !0
    ), u.removeEventListener(
      "dblclick",
      Jr,
      !0
    ), u.removeEventListener(
      "pointerdown",
      Gr,
      !0
    ), u.removeEventListener("pointerleave", Zr), u.removeEventListener("pointermove", Yr), u.removeEventListener("pointerout", Xr), u.removeEventListener("pointerup", Qr, !0)), a.disconnect();
  };
}
function Xd() {
  const [e, t] = N({}), n = $(() => t({}), []);
  return [e, n];
}
function Jn(e) {
  const t = ao();
  return `${e ?? t}`;
}
const st = typeof window < "u" ? Ee : D;
function Et(e) {
  const t = A(e);
  return st(() => {
    t.current = e;
  }, [e]), $(
    (...n) => {
      var r;
      return (r = t.current) == null ? void 0 : r.call(t, ...n);
    },
    [t]
  );
}
function qn(...e) {
  return Et((t) => {
    e.forEach((n) => {
      if (n)
        switch (typeof n) {
          case "function": {
            n(t);
            break;
          }
          case "object": {
            n.current = t;
            break;
          }
        }
    });
  });
}
function Gn(e) {
  const t = A({ ...e });
  return st(() => {
    for (const n in e)
      t.current[n] = e[n];
  }, [e]), t.current;
}
const sa = Ln(null);
function Qd(e, t) {
  const n = A({
    getLayout: () => ({}),
    setLayout: Dd
  });
  xn(t, () => n.current, []), st(() => {
    Object.assign(
      n.current,
      oa({ groupId: e })
    );
  });
}
function ia({
  children: e,
  className: t,
  defaultLayout: n,
  disableCursor: r,
  disabled: o,
  elementRef: a,
  groupRef: s,
  id: i,
  onLayoutChange: l,
  onLayoutChanged: c,
  orientation: d = "horizontal",
  resizeTargetMinimumSize: f = {
    coarse: 20,
    fine: 10
  },
  style: u,
  ...m
}) {
  const v = A({
    onLayoutChange: {},
    onLayoutChanged: {}
  }), h = Et((E) => {
    rt(v.current.onLayoutChange, E) || (v.current.onLayoutChange = E, l == null || l(E));
  }), y = Et(
    (E, P) => {
      rt(v.current.onLayoutChanged, E) || (v.current.onLayoutChanged = E, c == null || c(E, { isUserInteraction: P }));
    }
  ), w = Jn(i), g = A(null), [S, b] = Xd(), I = A({
    lastExpandedPanelSizes: {},
    layouts: {},
    panels: [],
    resizeTargetMinimumSize: f,
    separators: []
  }), R = qn(g, a);
  Qd(w, s);
  const T = Et(
    (E, P) => {
      const k = nt(), M = Ur(E), _ = Je(E);
      if (_) {
        let U = !1;
        switch (k.state) {
          case "active": {
            U = k.hitRegions.some(
              (F) => F.group === M
            );
            break;
          }
        }
        return {
          flexGrow: _.layout[P] ?? 1,
          pointerEvents: U ? "none" : void 0
        };
      }
      if (n != null && n[P])
        return {
          flexGrow: n == null ? void 0 : n[P]
        };
    }
  ), O = Gn({
    defaultLayout: n,
    disableCursor: r
  }), C = q(
    () => ({
      get disableCursor() {
        return !!O.disableCursor;
      },
      getPanelStyles: T,
      id: w,
      orientation: d,
      registerPanel: (E) => {
        const P = I.current;
        return P.panels = Nn(d, [
          ...P.panels,
          E
        ]), b(), () => {
          P.panels = P.panels.filter(
            (k) => k !== E
          ), b();
        };
      },
      registerSeparator: (E) => {
        const P = I.current;
        return P.separators = Nn(d, [
          ...P.separators,
          E
        ]), b(), () => {
          P.separators = P.separators.filter(
            (k) => k !== E
          ), b();
        };
      },
      updatePanelProps: (E, { disabled: P }) => {
        const k = I.current.panels.find(
          (U) => U.id === E
        );
        k && (k.panelConstraints.disabled = P);
        const M = Ur(w), _ = Je(w);
        M && _ && Fe(M, {
          ..._,
          derivedPanelConstraints: kn(M)
        });
      },
      updateSeparatorProps: (E, {
        disabled: P,
        disableDoubleClick: k
      }) => {
        const M = I.current.separators.find(
          (_) => _.id === E
        );
        M && (M.disabled = P, M.disableDoubleClick = k);
      }
    }),
    [T, w, b, d, O]
  ), j = A(null);
  return st(() => {
    const E = g.current;
    if (E === null)
      return;
    const P = I.current;
    let k;
    if (O.defaultLayout !== void 0 && Object.keys(O.defaultLayout).length === P.panels.length) {
      k = {};
      for (const X of P.panels) {
        const Q = O.defaultLayout[X.id];
        Q !== void 0 && (k[X.id] = Q);
      }
    }
    const M = {
      disabled: !!o,
      element: E,
      id: w,
      mutableState: {
        defaultLayout: k,
        disableCursor: !!O.disableCursor,
        expandedPanelSizes: I.current.lastExpandedPanelSizes,
        layouts: I.current.layouts
      },
      orientation: d,
      panels: P.panels,
      resizeTargetMinimumSize: P.resizeTargetMinimumSize,
      separators: P.separators
    };
    j.current = M;
    const _ = Yd(M), { defaultLayoutDeferred: U, derivedPanelConstraints: F, layout: G } = Je(M.id, !0);
    !U && F.length > 0 && (h(G), y(G, !1));
    const ee = Vn(w, (X) => {
      const { defaultLayoutDeferred: Q, derivedPanelConstraints: fe, layout: le } = X.next;
      if (Q || fe.length === 0)
        return;
      const ue = M.panels.map(({ id: H }) => H).join(",");
      M.mutableState.layouts[ue] = le, fe.forEach((H) => {
        if (H.collapsible) {
          const { layout: te } = X.prev ?? {};
          if (te) {
            const me = ge(
              H.collapsedSize,
              le[H.panelId]
            ), ie = ge(
              H.collapsedSize,
              te[H.panelId]
            );
            me && !ie && (M.mutableState.expandedPanelSizes[H.panelId] = te[H.panelId]);
          }
        }
      });
      const be = nt().state !== "active";
      h(le), be && y(le, X.isUserInteraction);
    });
    return () => {
      j.current = null, _(), ee();
    };
  }, [
    o,
    w,
    y,
    h,
    d,
    S,
    O
  ]), D(() => {
    const E = j.current;
    E && (E.mutableState.defaultLayout = n, E.mutableState.disableCursor = !!r);
  }), /* @__PURE__ */ p(sa.Provider, { value: C, children: /* @__PURE__ */ p(
    "div",
    {
      ...m,
      className: t,
      "data-group": !0,
      "data-testid": w,
      id: w,
      ref: R,
      style: {
        height: "100%",
        width: "100%",
        overflow: "hidden",
        ...u,
        display: "flex",
        flexDirection: d === "horizontal" ? "row" : "column",
        flexWrap: "nowrap",
        // Inform the browser that the library is handling touch events for this element
        // but still allow users to scroll content within panels in the non-resizing direction
        // NOTE This is not an inherited style
        // See github.com/bvaughn/react-resizable-panels/issues/662
        touchAction: d === "horizontal" ? "pan-y" : "pan-x"
      },
      children: e
    }
  ) });
}
ia.displayName = "Group";
function Zn() {
  const e = Cn(sa);
  return ne(
    e,
    "Group Context not found; did you render a Panel or Separator outside of a Group?"
  ), e;
}
function eu(e, t) {
  const { id: n } = Zn(), r = A({
    collapse: fn,
    expand: fn,
    getSize: () => ({
      asPercentage: 0,
      inPixels: 0
    }),
    isCollapsed: () => !1,
    resize: fn
  });
  xn(t, () => r.current, []), st(() => {
    Object.assign(
      r.current,
      ra({ groupId: n, panelId: e })
    );
  });
}
function Mn({
  children: e,
  className: t,
  collapsedSize: n = "0%",
  collapsible: r = !1,
  defaultSize: o,
  disabled: a,
  elementRef: s,
  groupResizeBehavior: i = "preserve-relative-size",
  id: l,
  maxSize: c = "100%",
  minSize: d = "0%",
  onResize: f,
  panelRef: u,
  style: m,
  ...v
}) {
  const h = !!l, y = Jn(l), w = Gn({
    disabled: a
  }), g = A(null), S = qn(g, s), {
    getPanelStyles: b,
    id: I,
    orientation: R,
    registerPanel: T,
    updatePanelProps: O
  } = Zn(), C = f !== null, j = Et(
    (M, _, U) => {
      f == null || f(M, l, U);
    }
  );
  st(() => {
    const M = g.current;
    if (M !== null) {
      const _ = {
        element: M,
        id: y,
        idIsStable: h,
        mutableValues: {
          expandToSize: void 0,
          prevSize: void 0
        },
        onResize: C ? j : void 0,
        panelConstraints: {
          groupResizeBehavior: i,
          collapsedSize: n,
          collapsible: r,
          defaultSize: o,
          disabled: w.disabled,
          maxSize: c,
          minSize: d
        }
      };
      return T(_);
    }
  }, [
    i,
    n,
    r,
    o,
    C,
    y,
    h,
    c,
    d,
    j,
    T,
    w
  ]), D(() => {
    O(y, { disabled: a });
  }, [a, y, O]), eu(y, u);
  const E = () => {
    const M = b(I, y);
    if (M)
      return JSON.stringify(M);
  }, P = oo(
    (M) => Vn(I, M),
    E,
    E
  );
  let k;
  return P ? k = JSON.parse(P) : o !== void 0 ? k = {
    flexGrow: void 0,
    flexShrink: void 0,
    flexBasis: o
  } : k = { flexGrow: 1 }, /* @__PURE__ */ p(
    "div",
    {
      ...v,
      "data-disabled": a || void 0,
      "data-panel": !0,
      "data-testid": y,
      id: y,
      ref: S,
      style: {
        ...tu,
        display: "flex",
        flexBasis: 0,
        flexShrink: 1,
        overflow: "visible",
        ...k
      },
      children: /* @__PURE__ */ p(
        "div",
        {
          className: t,
          style: {
            maxHeight: "100%",
            maxWidth: "100%",
            flexGrow: 1,
            overflow: "auto",
            ...m,
            // Inform the browser that the library is handling touch events for this element
            // but still allow users to scroll content within panels in the non-resizing direction
            // NOTE This is not an inherited style
            // See github.com/bvaughn/react-resizable-panels/issues/662
            touchAction: R === "horizontal" ? "pan-y" : "pan-x"
          },
          children: e
        }
      )
    }
  );
}
Mn.displayName = "Panel";
const tu = {
  minHeight: 0,
  maxHeight: "100%",
  height: "auto",
  minWidth: 0,
  maxWidth: "100%",
  width: "auto",
  border: "none",
  borderWidth: 0,
  padding: 0,
  margin: 0
};
function nu({
  layout: e,
  panelConstraints: t,
  panelId: n,
  panelIndex: r
}) {
  let o, a;
  const s = e[n], i = t.find(
    (l) => l.panelId === n
  );
  if (i) {
    const l = i.maxSize, c = i.collapsible ? i.collapsedSize : i.minSize, d = [r, r + 1];
    a = ot({
      layout: Mt({
        delta: c - s,
        initialLayout: e,
        panelConstraints: t,
        pivotIndices: d,
        prevLayout: e
      }),
      panelConstraints: t
    })[n], o = ot({
      layout: Mt({
        delta: l - s,
        initialLayout: e,
        panelConstraints: t,
        pivotIndices: d,
        prevLayout: e
      }),
      panelConstraints: t
    })[n];
  }
  return {
    valueControls: n,
    valueMax: o,
    valueMin: a,
    valueNow: s
  };
}
function la({
  children: e,
  className: t,
  disabled: n,
  disableDoubleClick: r,
  elementRef: o,
  id: a,
  style: s,
  ...i
}) {
  const l = Jn(a), c = Gn({
    disabled: n,
    disableDoubleClick: r
  }), [d, f] = N({}), [u, m] = N("inactive"), [v, h] = N(!1), y = A(null), w = qn(y, o), {
    disableCursor: g,
    id: S,
    orientation: b,
    registerSeparator: I,
    updateSeparatorProps: R
  } = Zn(), T = b === "horizontal" ? "vertical" : "horizontal";
  st(() => {
    const j = y.current;
    if (j !== null) {
      const E = {
        disabled: c.disabled,
        disableDoubleClick: c.disableDoubleClick,
        element: j,
        id: l
      }, P = I(E), k = Cd(
        (_) => {
          m(
            _.next.state !== "inactive" && _.next.hitRegions.some(
              (U) => U.separator === E
            ) ? _.next.state : "inactive"
          );
        }
      ), M = Vn(
        S,
        (_) => {
          const { derivedPanelConstraints: U, layout: F, separatorToPanels: G } = _.next, ee = G.get(E);
          if (ee) {
            const X = ee[0], Q = ee.indexOf(X);
            f(
              nu({
                layout: F,
                panelConstraints: U,
                panelId: X.id,
                panelIndex: Q
              })
            );
          }
        }
      );
      return () => {
        k(), M(), P();
      };
    }
  }, [S, l, I, c]), D(() => {
    R(l, { disabled: n, disableDoubleClick: r });
  }, [n, r, l, R]);
  let O;
  n && !g && (O = "not-allowed");
  let C;
  if (n)
    C = "disabled";
  else
    switch (u) {
      case "active": {
        C = "active";
        break;
      }
      default:
        v ? C = "focus" : C = u;
    }
  return /* @__PURE__ */ p(
    "div",
    {
      ...i,
      "aria-controls": d.valueControls,
      "aria-disabled": n || void 0,
      "aria-orientation": T,
      "aria-valuemax": d.valueMax,
      "aria-valuemin": d.valueMin,
      "aria-valuenow": d.valueNow,
      children: e,
      className: t,
      "data-separator": C,
      "data-testid": l,
      id: l,
      onBlur: () => h(!1),
      onFocus: () => h(!0),
      ref: w,
      role: "separator",
      style: {
        flexBasis: "auto",
        cursor: O,
        ...s,
        flexGrow: 0,
        flexShrink: 0,
        // Inform the browser that the library is handling touch events for this element
        // See github.com/bvaughn/react-resizable-panels/issues/662
        touchAction: "none"
      },
      tabIndex: n ? void 0 : 0
    }
  );
}
la.displayName = "Separator";
const Yn = 30, Xn = 65, At = 50, ru = 100 - Xn, ou = 100 - Yn;
function au(e) {
  const t = Number(e);
  return Number.isFinite(t) ? Math.min(Xn, Math.max(Yn, t)) : At;
}
function Qn(e) {
  return 100 - e;
}
function dt(e) {
  return `${e}%`;
}
const er = "reader-document", _t = "reader-assistant", ca = "retainpdf.reader.ai-split-layout.v1", su = {
  [er]: Qn(At),
  [_t]: At
};
function tr(e) {
  const t = au(e == null ? void 0 : e[_t]);
  return {
    [er]: Qn(t),
    [_t]: t
  };
}
function iu() {
  try {
    const e = JSON.parse(localStorage.getItem(ca) || "null");
    return tr(e);
  } catch {
    return su;
  }
}
function lu(e) {
  try {
    localStorage.setItem(ca, JSON.stringify(tr(e)));
  } catch {
  }
}
function mn(e, t) {
  const n = e == null ? void 0 : e.closest(".reader-react-root");
  if (!n) return;
  const r = tr(t);
  n.style.setProperty(
    "--reader-ai-split-width",
    `${r[_t]}vw`
  );
}
function cu() {
  const e = A(null), [t] = N(iu);
  Ee(() => {
    const o = e.current;
    return mn(o, t), () => {
      var a;
      (a = o == null ? void 0 : o.closest(".reader-react-root")) == null || a.style.removeProperty("--reader-ai-split-width");
    };
  }, [t]);
  const n = $((o) => {
    mn(e.current, o);
  }, []), r = $((o, a) => {
    mn(e.current, o), a.isUserInteraction && lu(o);
  }, []);
  return /* @__PURE__ */ L(
    ia,
    {
      id: "reader-ai-split",
      className: "reader-ai-split-resizer",
      elementRef: e,
      orientation: "horizontal",
      defaultLayout: t,
      onLayoutChange: n,
      onLayoutChanged: r,
      resizeTargetMinimumSize: { fine: 12, coarse: 28 },
      children: [
        /* @__PURE__ */ p(
          Mn,
          {
            id: er,
            defaultSize: dt(Qn(At)),
            minSize: dt(ru),
            maxSize: dt(ou)
          }
        ),
        /* @__PURE__ */ p(
          la,
          {
            id: "reader-ai-split-separator",
            className: "reader-ai-split-separator",
            "aria-label": "调整文档与 AI 问答宽度",
            children: /* @__PURE__ */ p("span", { "aria-hidden": "true" })
          }
        ),
        /* @__PURE__ */ p(
          Mn,
          {
            id: _t,
            defaultSize: dt(At),
            minSize: dt(Yn),
            maxSize: dt(Xn)
          }
        )
      ]
    }
  );
}
function du({
  regionsFailed: e = !1,
  metadataFailed: t = !1,
  onRetry: n
}) {
  const [r, o] = N(!1);
  if (D(() => {
    !e && !t && o(!1);
  }, [e, t]), r || !e && !t)
    return null;
  const a = [
    e ? "译文区域" : "",
    t ? "阅读元数据" : ""
  ].filter(Boolean);
  return /* @__PURE__ */ L("div", { className: "reader-error-notice", role: "status", "data-reader-error-notice": "true", children: [
    /* @__PURE__ */ L("span", { className: "reader-error-notice-text", children: [
      a.join("、"),
      "加载失败，正文仍可正常阅读。"
    ] }),
    n ? /* @__PURE__ */ p(re, { className: "reader-error-notice-retry", "data-reader-retry": "optional", onClick: n, children: "重试" }) : null,
    /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: "reader-error-notice-dismiss",
        "aria-label": "关闭提示",
        onClick: () => o(!0),
        children: "×"
      }
    )
  ] });
}
function uu({
  loading: e,
  failed: t,
  text: n,
  percent: r,
  regionsError: o = !1,
  metadataError: a = !1,
  onRetry: s
}) {
  return !e && !t ? /* @__PURE__ */ p(du, { regionsFailed: o, metadataFailed: a, onRetry: s }) : /* @__PURE__ */ L($e, { children: [
    e ? /* @__PURE__ */ p("div", { className: "reader-boot-loading", "data-reader-boot-loading": "true", children: /* @__PURE__ */ L("div", { className: "reader-boot-loading-card", children: [
      /* @__PURE__ */ p("div", { className: "reader-boot-loading-text", children: n }),
      /* @__PURE__ */ p("div", { className: "reader-boot-loading-track", children: /* @__PURE__ */ p(
        "span",
        {
          className: "reader-boot-loading-bar",
          style: { width: `${Math.max(0, Math.min(100, r))}%` }
        }
      ) })
    ] }) }) : null,
    t ? /* @__PURE__ */ L("div", { className: "reader-react-error", role: "alert", children: [
      /* @__PURE__ */ p("span", { className: "reader-react-error-text", children: n }),
      s ? /* @__PURE__ */ p(re, { className: "reader-react-error-retry", "data-reader-retry": "boot", onClick: s, children: "重试" }) : null
    ] }) : null
  ] });
}
function fu(e) {
  if (!(e instanceof HTMLElement)) return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
function mu() {
  const [e, t] = N(!1), n = ao(), r = A(null);
  return D(() => {
    if (!e) return;
    const o = (s) => {
      const i = r.current;
      i && s.target instanceof Node && !i.contains(s.target) && t(!1);
    }, a = (s) => {
      s.key === "Escape" && (s.preventDefault(), t(!1));
    };
    return document.addEventListener("mousedown", o), window.addEventListener("keydown", a), () => {
      document.removeEventListener("mousedown", o), window.removeEventListener("keydown", a);
    };
  }, [e]), D(() => {
    const o = (a) => {
      if (a.defaultPrevented || a.metaKey || a.ctrlKey || a.altKey || fu(a.target)) return;
      const s = a.key;
      if (s === "?" || s === "h" || s === "H" || s === "/") {
        if (s === "/" && !a.shiftKey)
          return;
        a.preventDefault(), t((i) => !i);
      }
    };
    return window.addEventListener("keydown", o), () => window.removeEventListener("keydown", o);
  }, []), /* @__PURE__ */ L("div", { className: "reader-react-shortcuts", ref: r, "data-reader-shortcuts": "", children: [
    /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: `reader-react-hud-btn reader-react-shortcuts-btn${e ? " is-active" : ""}`,
        "aria-label": "快捷键说明",
        "aria-expanded": e,
        "aria-controls": n,
        title: "快捷键（H 或 ?）",
        onClick: () => t((o) => !o),
        children: /* @__PURE__ */ p(za, { className: "reader-react-shortcuts-icon", size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
      }
    ),
    e ? /* @__PURE__ */ L(
      "div",
      {
        id: n,
        className: "reader-react-shortcuts-panel reader-floating-surface",
        role: "dialog",
        "aria-label": "阅读器快捷键",
        children: [
          /* @__PURE__ */ L("div", { className: "reader-react-shortcuts-head", children: [
            /* @__PURE__ */ p("strong", { children: "快捷键" }),
            /* @__PURE__ */ p(
              "button",
              {
                type: "button",
                className: "reader-react-shortcuts-close reader-floating-close",
                "aria-label": "关闭",
                onClick: () => t(!1),
                children: "×"
              }
            )
          ] }),
          /* @__PURE__ */ p("div", { className: "reader-react-shortcuts-body", children: nl.map((o) => /* @__PURE__ */ L("section", { className: "reader-react-shortcuts-group", children: [
            /* @__PURE__ */ p("h3", { children: o.title }),
            /* @__PURE__ */ p("ul", { children: o.items.map((a) => /* @__PURE__ */ L("li", { children: [
              /* @__PURE__ */ p("kbd", { children: a.keys }),
              /* @__PURE__ */ p("span", { children: a.desc })
            ] }, `${o.title}-${a.keys}`)) })
          ] }, o.title)) }),
          /* @__PURE__ */ p("p", { className: "reader-react-shortcuts-foot", children: "在输入框内不会触发快捷键" })
        ]
      }
    ) : null
  ] });
}
const hu = ["source", "sideBySide", "translated"], pu = { source: "", translated: "", sideBySide: "" };
function gu(e) {
  if (e.sourceOnly || !e.jobId) {
    const t = Wt(e.sourceUrl), n = Wt(e.translatedUrl);
    return {
      source: t,
      translated: n,
      // sideBySide requires dedicated artifact; no fallback to source url
      sideBySide: ""
    };
  }
  return ds({
    jobId: e.jobId,
    jobPayload: e.jobPayload,
    manifestPayload: e.manifestPayload
  });
}
function bu(e) {
  const [t, n] = N(() => /* @__PURE__ */ new Set()), r = q(
    () => e ? gu(e) : pu,
    [e]
  ), o = q(
    () => hu.filter((s) => !(e != null && e.sourceOnly && s !== "source")),
    [e == null ? void 0 : e.sourceOnly]
  ), a = $(async (s) => {
    if (!e) return;
    const i = Wt(r[s]);
    if (!(!i || t.has(s)))
      try {
        const l = e.jobId ? cs(s, {
          jobId: e.jobId,
          jobPayload: e.jobPayload,
          manifestPayload: e.manifestPayload
        }) : `${e.sourceOnly ? "document" : "reader"}-${s}.pdf`;
        await us(
          e.fetchProtected,
          i,
          l,
          l,
          null,
          (c) => n((d) => {
            const f = new Set(d);
            return c ? f.add(s) : f.delete(s), f;
          })
        );
      } catch (l) {
        const c = l instanceof Error ? l.message : "下载失败";
        fs(c), n((d) => {
          const f = new Set(d);
          return f.delete(s), f;
        });
      }
  }, [r, t, e]);
  return { urls: r, downloadItems: o, busyActions: t, handleDownload: a };
}
const yu = {
  source: co,
  sideBySide: uo,
  translated: fo
}, vu = {
  source: "原文",
  sideBySide: "对照",
  translated: "译文"
};
function wu(e) {
  const t = je(), n = e.download ?? (t == null ? void 0 : t.download), { urls: r, downloadItems: o, busyActions: a, handleDownload: s } = bu(n), i = A(null);
  return D(() => {
    const l = () => {
      var f;
      (f = i.current) != null && f.open && (i.current.open = !1);
    }, c = (f) => {
      i.current && !i.current.contains(f.target) && l();
    }, d = (f) => {
      f.key === "Escape" && l();
    };
    return document.addEventListener("pointerdown", c), document.addEventListener("keydown", d), () => {
      document.removeEventListener("pointerdown", c), document.removeEventListener("keydown", d);
    };
  }, []), /* @__PURE__ */ L("details", { ref: i, className: "reader-download-actions", children: [
    /* @__PURE__ */ L("summary", { className: "reader-download-trigger", "aria-label": "下载 PDF", title: "下载 PDF", children: [
      /* @__PURE__ */ p(Oa, { size: 15, strokeWidth: 2.1, "aria-hidden": !0 }),
      /* @__PURE__ */ p("span", { className: "reader-download-trigger-label", children: "下载" }),
      /* @__PURE__ */ p(lo, { size: 13, strokeWidth: 2.2, "aria-hidden": !0, className: "reader-download-trigger-caret" })
    ] }),
    /* @__PURE__ */ p("div", { className: "reader-download-menu", role: "group", "aria-label": "下载 PDF", children: o.map((l) => {
      const c = ba[l], d = Wt(r[l]), f = a.has(l), u = !!d && !f, m = u ? "" : ya(l, r), v = yu[l];
      return /* @__PURE__ */ L(
        "button",
        {
          type: "button",
          id: `reader-download-${l}`,
          className: `reader-download-action${f ? " is-busy" : ""}`,
          disabled: !u,
          "aria-label": u ? `下载${c.label}` : m,
          onClick: () => {
            i.current && (i.current.open = !1), s(l);
          },
          children: [
            /* @__PURE__ */ p(v, { size: 15, strokeWidth: 2.1, "aria-hidden": !0 }),
            /* @__PURE__ */ L("span", { className: "reader-download-action-text", children: [
              /* @__PURE__ */ L("span", { className: "reader-download-action-label", children: [
                vu[l],
                " PDF"
              ] }),
              m ? /* @__PURE__ */ p("span", { className: "reader-download-action-reason", children: m }) : null
            ] })
          ]
        },
        l
      );
    }) })
  ] });
}
const Su = "retainpdf:reader:bookmarks:v1:", Iu = 200;
function nr() {
  try {
    return typeof globalThis.localStorage > "u" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
function da(e) {
  const t = `${e || ""}`.trim();
  return t ? `${Su}${t}` : "";
}
function Ru(e) {
  if (!e || typeof e != "object") return null;
  const t = e, n = Math.floor(Number(t.page));
  return !Number.isFinite(n) || n < 1 ? null : { page: n, label: `${t.label || ""}`.trim().slice(0, 120), createdAt: `${t.createdAt || ""}` };
}
function Yt(e, t = nr()) {
  const n = da(e);
  if (!n || !t) return [];
  try {
    const r = JSON.parse(t.getItem(n) || "[]"), o = /* @__PURE__ */ new Map();
    for (const a of Array.isArray(r) ? r : []) {
      const s = Ru(a);
      s && !o.has(s.page) && o.set(s.page, s);
    }
    return [...o.values()].sort((a, s) => a.page - s.page);
  } catch {
    return [];
  }
}
function An(e, t, n) {
  const r = da(e), o = [...t].sort((a, s) => a.page - s.page).slice(0, Iu);
  if (!r || !n) return o;
  try {
    n.setItem(r, JSON.stringify(o));
  } catch {
  }
  return o;
}
function Eu(e, t, n = "", { storage: r = nr(), now: o = () => (/* @__PURE__ */ new Date()).toISOString() } = {}) {
  const a = Yt(e, r), s = Math.floor(Number(t));
  return !Number.isFinite(s) || s < 1 ? a : a.some((i) => i.page === s) ? An(e, a.filter((i) => i.page !== s), r) : An(e, [...a, { page: s, label: `${n || ""}`.trim().slice(0, 120), createdAt: o() }], r);
}
function Pu(e, t, n = nr()) {
  return An(e, Yt(e, n).filter((r) => r.page !== t), n);
}
function Tu(e, t) {
  var r, o, a, s;
  let n = null;
  for (const i of e || []) {
    if (`${(i == null ? void 0 : i.regionType) || ""}` != "heading") continue;
    const l = Number(((r = i.source) == null ? void 0 : r.page) ?? ((o = i.translated) == null ? void 0 : o.page));
    if (!Number.isFinite(l) || l > t) continue;
    const c = `${((a = i.translated) == null ? void 0 : a.text) || i.markdown || ((s = i.source) == null ? void 0 : s.text) || ""}`.replace(/\s+/g, " ").trim();
    if (!c) continue;
    const d = Number(i.readingOrder) || 0;
    (!n || l > n.page || l === n.page && d >= n.order) && (n = { page: l, order: d, text: c });
  }
  return n ? n.text.slice(0, 60) : "";
}
function ku({ filled: e }) {
  return /* @__PURE__ */ p("svg", { viewBox: "0 0 24 24", width: "15", height: "15", "aria-hidden": "true", fill: e ? "currentColor" : "none", children: /* @__PURE__ */ p("path", { d: "M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.6L6 20V5.5a1 1 0 0 1 1-1z", stroke: "currentColor", strokeWidth: "1.7", strokeLinejoin: "round" }) });
}
function Nu({ scope: e, currentPage: t, numPages: n, regions: r, onGoToPage: o }) {
  const [a, s] = N(() => Yt(e)), [i, l] = N(!1), c = A(null);
  if (D(() => {
    s(Yt(e)), l(!1);
  }, [e]), D(() => {
    if (!i) return;
    const u = (v) => {
      c.current && !c.current.contains(v.target) && l(!1);
    }, m = (v) => {
      v.key === "Escape" && l(!1);
    };
    return document.addEventListener("pointerdown", u), document.addEventListener("keydown", m), () => {
      document.removeEventListener("pointerdown", u), document.removeEventListener("keydown", m);
    };
  }, [i]), !e || n <= 0) return null;
  const d = Math.min(Math.max(t, 1), n), f = a.some((u) => u.page === d);
  return /* @__PURE__ */ L("div", { className: "reader-react-hud-group reader-bookmarks", "aria-label": "书签", ref: c, children: [
    /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: `reader-react-hud-btn reader-bookmark-toggle${f ? " is-marked" : ""}`,
        "aria-pressed": f,
        "aria-label": f ? `取消第 ${d} 页的书签` : `给第 ${d} 页加书签`,
        title: f ? "取消这一页的书签" : "给这一页加书签",
        onClick: () => s(Eu(e, d, Tu(r, d))),
        children: /* @__PURE__ */ p(ku, { filled: f })
      }
    ),
    a.length ? /* @__PURE__ */ L(
      "button",
      {
        type: "button",
        className: "reader-react-hud-btn reader-bookmark-list-btn",
        "aria-expanded": i,
        "aria-haspopup": "true",
        "aria-label": `书签列表，共 ${a.length} 个`,
        title: "书签列表",
        onClick: () => l((u) => !u),
        children: [
          /* @__PURE__ */ p($a, { size: 14, strokeWidth: 2, "aria-hidden": "true" }),
          /* @__PURE__ */ p("span", { className: "reader-bookmark-count", children: a.length })
        ]
      }
    ) : null,
    i && a.length ? /* @__PURE__ */ p("div", { className: "reader-bookmark-popover", role: "dialog", "aria-label": "书签", children: /* @__PURE__ */ p("ol", { className: "reader-bookmark-list", children: a.map((u) => /* @__PURE__ */ L("li", { className: u.page === d ? "is-current" : "", children: [
      /* @__PURE__ */ L(
        "button",
        {
          type: "button",
          className: "reader-bookmark-jump",
          onClick: () => {
            o == null || o(Math.min(u.page, n)), l(!1);
          },
          children: [
            /* @__PURE__ */ L("span", { className: "reader-bookmark-page", children: [
              "第 ",
              u.page,
              " 页"
            ] }),
            u.label ? /* @__PURE__ */ p("span", { className: "reader-bookmark-label", children: u.label }) : null
          ]
        }
      ),
      /* @__PURE__ */ p(
        "button",
        {
          type: "button",
          className: "reader-bookmark-remove",
          "aria-label": `删除第 ${u.page} 页的书签`,
          onClick: () => s(Pu(e, u.page)),
          children: "×"
        }
      )
    ] }, u.page)) }) }) : null
  ] });
}
function Mu(e) {
  const [t, n] = N([]);
  return D(() => {
    n((s) => s.length ? [] : s);
    const r = `${e || ""}`.trim();
    let o;
    try {
      o = Ze().loadIssues;
    } catch {
      o = void 0;
    }
    if (!r || !o) return;
    let a = !1;
    return o(r).then((s) => {
      a || n(Array.isArray(s) ? s : []);
    }).catch(() => {
    }), () => {
      a = !0;
    };
  }, [e]), t;
}
function Au(e, t, n, r) {
  if (!e.length) return -1;
  if (t >= 0 && t < e.length) return (t + (r ? -1 : 1) + e.length) % e.length;
  if (r) {
    for (let a = e.length - 1; a >= 0; a -= 1) if (e[a].page <= n) return a;
    return e.length - 1;
  }
  const o = e.findIndex((a) => a.page >= n);
  return o >= 0 ? o : 0;
}
const _u = {
  failed: "没翻成",
  content: "内容问题",
  layout: "版面放不下"
}, Lu = ["failed", "content", "layout"];
function Cu(e) {
  return e instanceof Element && !!e.closest("input, textarea, select, [contenteditable='true']");
}
function xu({ jobId: e, currentPage: t }) {
  var f;
  const n = Mu(e), r = (f = je()) == null ? void 0 : f.jumpToBlock, [o, a] = N(!1), [s, i] = N(-1), l = A(null);
  D(() => i(-1), [n]);
  const c = (u) => {
    const m = n[u];
    !m || !r || (i(u), r(m.readerItemId));
  }, d = A({ issues: n, last: s, currentPage: t, goTo: c });
  return d.current = { issues: n, last: s, currentPage: t, goTo: c }, D(() => {
    const u = (m) => {
      if (m.key.toLowerCase() !== "n" || m.metaKey || m.ctrlKey || m.altKey || Cu(m.target)) return;
      const { issues: v, last: h, currentPage: y, goTo: w } = d.current, g = Au(v, h, y, m.shiftKey);
      g < 0 || (m.preventDefault(), w(g));
    };
    return document.addEventListener("keydown", u), () => document.removeEventListener("keydown", u);
  }, []), D(() => {
    if (!o) return;
    const u = (m) => {
      var v;
      (v = l.current) != null && v.contains(m.target) || a(!1);
    };
    return document.addEventListener("pointerdown", u, !0), () => document.removeEventListener("pointerdown", u, !0);
  }, [o]), n.length ? /* @__PURE__ */ L("div", { className: "reader-react-hud-group reader-issues", ref: l, "aria-label": "待处理", children: [
    /* @__PURE__ */ L(
      re,
      {
        className: "reader-react-hud-btn reader-issues-toggle",
        "aria-expanded": o,
        "aria-haspopup": "true",
        "aria-label": `待处理 ${n.length} 处`,
        title: "这次翻译里要人看一眼的段落（N 下一处，Shift+N 上一处）",
        onClick: () => a((u) => !u),
        children: [
          /* @__PURE__ */ p(Fa, { size: 14, strokeWidth: 2, "aria-hidden": "true" }),
          /* @__PURE__ */ p("span", { children: n.length })
        ]
      }
    ),
    o ? /* @__PURE__ */ L("div", { className: "reader-issues-popover", role: "dialog", "aria-label": "待处理", children: [
      /* @__PURE__ */ p("p", { className: "reader-issues-hint", children: "点一条跳过去，悬停那一段可以「改」。N 下一处，Shift+N 上一处。" }),
      Lu.map((u) => {
        const m = n.map((v, h) => ({ issue: v, index: h })).filter(({ issue: v }) => v.kind === u);
        return m.length ? /* @__PURE__ */ L("section", { className: "reader-issues-group", "data-issue-kind": u, children: [
          /* @__PURE__ */ L("h4", { children: [
            _u[u],
            /* @__PURE__ */ p("span", { children: m.length })
          ] }),
          /* @__PURE__ */ p("ol", { children: m.map(({ issue: v, index: h }) => /* @__PURE__ */ p("li", { children: /* @__PURE__ */ L(
            re,
            {
              className: "reader-issues-item",
              "aria-current": h === s ? "true" : void 0,
              onClick: () => {
                c(h), a(!1);
              },
              children: [
                /* @__PURE__ */ p("span", { className: "reader-issues-title", children: v.title }),
                /* @__PURE__ */ L("span", { className: "reader-issues-page", children: [
                  "第 ",
                  v.page,
                  " 页"
                ] }),
                v.detail ? /* @__PURE__ */ p("span", { className: "reader-issues-detail", children: v.detail }) : null
              ]
            }
          ) }, `${v.kind}:${v.readerItemId}`)) })
        ] }, u) : null;
      })
    ] }) : null
  ] }) : null;
}
const Du = 48, zu = 96, Ou = 700;
function $u(e, t, n) {
  if (n < -4) return { hidden: !1, downSoFar: 0 };
  if (n <= 0) return { hidden: e, downSoFar: t };
  const r = t + n;
  return { hidden: r >= Du, downSoFar: r };
}
function Fu(e) {
  const [t, n] = N(!1), r = A(0);
  return D(() => {
    const o = /* @__PURE__ */ new WeakMap();
    let a = 0;
    const s = () => {
      a = Date.now();
    }, i = /* @__PURE__ */ new WeakMap(), l = () => {
      const u = e.current;
      return !!(u && (u.querySelector(":focus-visible") || u.querySelector("[aria-expanded='true']")));
    }, c = (u) => {
      const m = u.target;
      if (!(m instanceof Element) || (i.has(m) || i.set(m, !!m.querySelector(`[${Le}]`)), !i.get(m))) return;
      const v = m.scrollTop, h = o.get(m);
      if (o.set(m, v), h === void 0 || Date.now() - a > Ou) return;
      const y = $u(!1, r.current, v - h);
      r.current = y.downSoFar, v - h < -4 ? n(!1) : y.hidden && !l() && n(!0);
    }, d = (u) => {
      u.clientY >= window.innerHeight - zu && (r.current = 0, n(!1));
    }, f = () => {
      l() && n(!1);
    };
    document.addEventListener("scroll", c, { capture: !0, passive: !0 }), window.addEventListener("pointermove", d, { passive: !0 }), document.addEventListener("focusin", f);
    for (const u of ["wheel", "touchmove", "keydown"]) window.addEventListener(u, s, { passive: !0, capture: !0 });
    return () => {
      for (const u of ["wheel", "touchmove", "keydown"]) window.removeEventListener(u, s, { capture: !0 });
      document.removeEventListener("scroll", c, { capture: !0 }), window.removeEventListener("pointermove", d), document.removeEventListener("focusin", f);
    };
  }, [e]), t;
}
function ju(e) {
  const t = je(), n = Uo(), { mode: r = "compare", modeControls: o } = e, a = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? Ct, s = e.onZoomChange ?? (t == null ? void 0 : t.onZoomChange) ?? (() => {
  }), i = e.currentPage ?? (n == null ? void 0 : n.currentPage) ?? 1, l = e.numPages ?? (n == null ? void 0 : n.numPages) ?? 0, c = e.onGoToPage ?? (t == null ? void 0 : t.goToPage), d = ri(a), f = a > vo + 1e-3, u = a < Gt - 1e-3, m = ut(r, et()), v = m >= Gt ? "恢复默认大小（铺满阅读区）" : "恢复默认大小（对照时左右各占一半）", h = A(null), y = Fu(h), [w, g] = N(!1), [S, b] = N(`${i}`);
  D(() => {
    w || b(`${Math.min(Math.max(i, 1), Math.max(l, 1))}`);
  }, [i, l, w]);
  const I = () => {
    if (g(!1), !c || l <= 0)
      return;
    const R = Number(`${S}`.trim());
    c(Zt(R, l));
  };
  return /* @__PURE__ */ L("div", { ref: h, className: "reader-react-hud", "data-reader-hud": "true", "data-hud-hidden": y ? "true" : void 0, children: [
    o ? /* @__PURE__ */ p("div", { className: "reader-react-hud-group reader-react-hud-modes", children: o }) : null,
    /* @__PURE__ */ p("div", { className: "reader-react-hud-group", "aria-label": "页码", children: w ? /* @__PURE__ */ L(
      "form",
      {
        className: "reader-react-hud-page-form",
        onSubmit: (R) => {
          R.preventDefault(), I();
        },
        children: [
          /* @__PURE__ */ p(
            "input",
            {
              className: "reader-react-hud-page-input",
              type: "text",
              inputMode: "numeric",
              pattern: "[0-9]*",
              "aria-label": "跳转到页码",
              value: S,
              autoFocus: !0,
              onChange: (R) => b(R.target.value.replace(/[^\d]/g, "")),
              onBlur: I,
              onKeyDown: (R) => {
                R.key === "Escape" && (R.preventDefault(), g(!1), b(`${i}`));
              }
            }
          ),
          /* @__PURE__ */ L("span", { className: "reader-react-hud-page-suffix", children: [
            "/ ",
            l || "—"
          ] })
        ]
      }
    ) : /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: "reader-react-hud-page reader-react-hud-page-btn",
        "aria-label": l > 0 ? `跳转页码，当前第 ${i} 页，共 ${l} 页` : "页码",
        title: l > 0 ? "点击输入页码跳转" : void 0,
        disabled: !c || l <= 0,
        onClick: () => {
          !c || l <= 0 || (b(`${i}`), g(!0));
        },
        children: l > 0 ? `${Math.min(i, l)} / ${l}` : "—"
      }
    ) }),
    e.searchSlot ? /* @__PURE__ */ p("div", { className: "reader-react-hud-group", "aria-label": "搜索", children: e.searchSlot }) : null,
    e.bookmarkScope ? /* @__PURE__ */ p(
      Nu,
      {
        scope: e.bookmarkScope,
        currentPage: i,
        numPages: l,
        regions: t == null ? void 0 : t.regions,
        onGoToPage: c
      }
    ) : null,
    e.issuesJobId ? /* @__PURE__ */ p(xu, { jobId: e.issuesJobId, currentPage: i }) : null,
    /* @__PURE__ */ L("div", { className: "reader-react-hud-group", "aria-label": "缩放", children: [
      /* @__PURE__ */ p(
        "button",
        {
          type: "button",
          className: "reader-react-hud-btn",
          "aria-label": "缩小",
          disabled: !f,
          onClick: () => s(kt(a, -1)),
          children: "−"
        }
      ),
      /* @__PURE__ */ L(
        "button",
        {
          type: "button",
          className: "reader-react-hud-btn reader-react-hud-zoom-label",
          "aria-label": `${d}%，点击${v}`,
          title: v,
          onClick: () => s(m),
          children: [
            d,
            "%"
          ]
        }
      ),
      /* @__PURE__ */ p(
        "button",
        {
          type: "button",
          className: "reader-react-hud-btn",
          "aria-label": "放大",
          disabled: !u,
          onClick: () => s(kt(a, 1)),
          children: "+"
        }
      )
    ] }),
    /* @__PURE__ */ p("div", { className: "reader-react-hud-group reader-react-hud-help", "aria-label": "帮助", children: /* @__PURE__ */ p(mu, {}) })
  ] });
}
function to(e) {
  var t, n;
  return Ro(e == null ? void 0 : e.assistantPanel) ? e.assistantPanel : ((t = e == null ? void 0 : e.splitLayout) == null ? void 0 : t.left) === "markdown" || ((n = e == null ? void 0 : e.splitLayout) == null ? void 0 : n.right) === "markdown" ? "markdown" : null;
}
function Bu(e) {
  const [t, n] = N(() => ({
    scope: e,
    panel: to(_e(e))
  }));
  D(() => {
    n((o) => o.scope === e ? o : {
      scope: e,
      panel: to(_e(e))
    });
  }, [e]), D(() => {
    t.scope === e && en(t.scope, {
      assistantPanel: t.panel,
      // 旧的自由两栏布局已经没有写入者了，恢复时只当迁移来源读一次。
      splitLayout: null
    });
  }, [t, e]);
  const r = $((o) => {
    n((a) => ({
      scope: a.scope,
      panel: typeof o == "function" ? o(a.panel) : o
    }));
  }, []);
  return { panel: t.panel, scope: t.scope, setPanel: r };
}
const _n = "download-toast";
function Uu({
  title: e = "下载中",
  status: t = "正在准备...",
  meta: n = "等待响应...",
  percent: r = NaN,
  tone: o = "progress"
}) {
  const a = Number.isFinite(r) ? Math.max(4, Math.min(100, Number(r) || 0)) : 18;
  return /* @__PURE__ */ L("div", { className: "download-toast-card reader-floating-surface", "data-tone": o, "aria-live": "polite", children: [
    /* @__PURE__ */ L("div", { className: "download-toast-head", children: [
      /* @__PURE__ */ p("div", { id: "download-toast-title", className: "download-toast-title", children: e }),
      /* @__PURE__ */ p("div", { id: "download-toast-status", className: "download-toast-status", children: t })
    ] }),
    /* @__PURE__ */ p("div", { className: "download-toast-track", children: /* @__PURE__ */ p("span", { id: "download-toast-bar", className: "download-toast-bar", style: { width: `${a}%` } }) }),
    /* @__PURE__ */ p("div", { id: "download-toast-meta", className: "download-toast-meta", children: n })
  ] });
}
function Hu(e = {}) {
  const {
    visible: t = !1,
    title: n = "下载中",
    status: r = "正在准备...",
    meta: o = "等待响应...",
    percent: a = NaN,
    tone: s = "progress"
  } = e;
  if (!t) {
    bn.dismiss(_n);
    return;
  }
  bn.custom(
    () => /* @__PURE__ */ p(Uu, { title: n, status: r, meta: o, percent: a, tone: s }),
    { id: _n, duration: 1 / 0 }
  );
}
function Wu() {
  const e = $((t) => {
    t && (t.setState = Hu, t.hide = () => bn.dismiss(_n));
  }, []);
  return /* @__PURE__ */ L($e, { children: [
    /* @__PURE__ */ p(Na, { position: "bottom-right" }),
    /* @__PURE__ */ p("download-toast", { style: { display: "none" }, "aria-hidden": "true", ref: e })
  ] });
}
function Vu(e) {
  return e.sourceViewOnly ? { mode: "source", auto: !1 } : e.savedMode ? { mode: e.savedMode, auto: !1 } : wo(e.viewportWidth) ? { mode: "translated", auto: !0 } : { mode: null, auto: !1 };
}
function Ku(e, t) {
  return t === null || e !== t;
}
function Ju(e) {
  const t = A(!1);
  return e && (t.current = !0), t.current;
}
function qu(e, t) {
  const n = e === t;
  return { open: n, mounted: Ju(n) };
}
const no = { itemId: null, origin: null };
function Gu() {
  let e = no;
  const t = /* @__PURE__ */ new Set();
  return {
    get: () => e,
    set(n, r) {
      if (!(e.itemId === n && (n === null || e.origin === r))) {
        e = n === null ? no : { itemId: n, origin: r };
        for (const o of t) o();
      }
    },
    subscribe(n) {
      return t.add(n), () => {
        t.delete(n);
      };
    }
  };
}
const Zu = [];
function Yu({
  open: e,
  onToggle: t,
  children: n
}) {
  return /* @__PURE__ */ L("div", { className: "reader-finder-toggles", children: [
    /* @__PURE__ */ p(re, { className: "reader-finder-toggle", "aria-label": "目录", "aria-pressed": e === "outline", title: "目录", onClick: () => t("outline"), children: /* @__PURE__ */ p(ja, { size: 17, strokeWidth: 2.1, "aria-hidden": !0 }) }),
    n
  ] });
}
function Xu({ open: e, onToggle: t }) {
  return /* @__PURE__ */ p(
    re,
    {
      className: "reader-react-hud-btn reader-search-toggle",
      "data-finder-toggle": "search",
      "aria-label": "在书里搜索",
      "aria-pressed": e === "search",
      title: "在书里搜索（原文和译文，⌘F）",
      onClick: () => t("search"),
      children: /* @__PURE__ */ p(Ba, { size: 15, strokeWidth: 2.1, "aria-hidden": !0 })
    }
  );
}
function Qu({
  tab: e,
  onTab: t,
  onClose: n,
  onJump: r,
  query: o,
  onQuery: a,
  term: s,
  focusSignal: i = 0
}) {
  var b, I;
  const l = ((b = je()) == null ? void 0 : b.regions) ?? Zu, c = ((I = Uo()) == null ? void 0 : I.currentPage) ?? 1, d = q(() => Oc(l), [l]), f = $c(d, c), u = q(() => Bc(l, s), [l, s]), [m, v] = N(-1);
  D(() => v(-1), [s]);
  const h = A(null), y = A(null), w = A(n);
  w.current = n, D(() => {
    const R = (O) => {
      var j, E;
      const C = O.target;
      !C || (j = y.current) != null && j.contains(C) || (E = C.closest) != null && E.call(C, ".reader-finder-toggles, [data-finder-toggle]") || w.current();
    }, T = (O) => {
      O.key === "Escape" && w.current();
    };
    return document.addEventListener("pointerdown", R, !0), document.addEventListener("keydown", T), () => {
      document.removeEventListener("pointerdown", R, !0), document.removeEventListener("keydown", T);
    };
  }, []);
  const g = A(null);
  D(() => {
    var R, T, O;
    e === "search" ? (R = h.current) == null || R.focus() : (O = (T = g.current) == null ? void 0 : T.querySelector('[aria-current="location"]')) == null || O.scrollIntoView({ block: "center" });
  }, [e, i]), D(() => {
    var R, T;
    e === "search" && m >= 0 && ((T = (R = g.current) == null ? void 0 : R.querySelector('[aria-current="true"]')) == null || T.scrollIntoView({ block: "nearest" }));
  }, [e, m]);
  const S = (R) => {
    const T = u[R];
    T && (v(R), r(T.itemId));
  };
  return /* @__PURE__ */ L("aside", { ref: y, className: "reader-finder", "data-finder-tab": e, "aria-label": e === "outline" ? "目录" : "搜索", children: [
    /* @__PURE__ */ L("header", { className: "reader-finder-head", children: [
      /* @__PURE__ */ L("div", { className: "reader-finder-tabs", role: "tablist", children: [
        /* @__PURE__ */ p(re, { className: "reader-finder-tab", role: "tab", "aria-selected": e === "outline", onClick: () => t("outline"), children: "目录" }),
        /* @__PURE__ */ p(re, { className: "reader-finder-tab", role: "tab", "aria-selected": e === "search", onClick: () => t("search"), children: "搜索" })
      ] }),
      /* @__PURE__ */ p(re, { className: "reader-finder-close", "aria-label": "收起", title: "收起", onClick: n, children: /* @__PURE__ */ p(bt, { size: 16, strokeWidth: 2.1, "aria-hidden": !0 }) })
    ] }),
    e === "outline" ? d.length ? /* @__PURE__ */ p("ol", { ref: g, className: "reader-finder-list", children: d.map((R, T) => /* @__PURE__ */ p("li", { children: /* @__PURE__ */ L(
      re,
      {
        className: "reader-finder-entry",
        "data-level": R.level,
        "aria-current": T === f ? "location" : void 0,
        onClick: () => r(R.itemId),
        children: [
          /* @__PURE__ */ p("span", { className: "reader-finder-entry-text", children: R.text }),
          /* @__PURE__ */ p("span", { className: "reader-finder-entry-page", children: R.page })
        ]
      }
    ) }, R.itemId)) }) : /* @__PURE__ */ p("p", { className: "reader-finder-empty", children: l.length ? "这本书没有认出标题。" : "这本书还没有段落数据。" }) : /* @__PURE__ */ L($e, { children: [
      /* @__PURE__ */ L("div", { className: "reader-finder-search", children: [
        /* @__PURE__ */ p(
          mo,
          {
            ref: h,
            type: "search",
            size: "sm",
            className: "reader-finder-input",
            placeholder: "原文、译文里的字",
            "aria-label": "在书里搜索",
            value: o,
            onChange: (R) => a(R.target.value),
            onKeyDown: (R) => {
              R.key === "Enter" ? (R.preventDefault(), S(Hc(m, u.length, R.shiftKey))) : R.key === "Escape" && (R.preventDefault(), n()), R.stopPropagation();
            }
          }
        ),
        s ? /* @__PURE__ */ p("p", { className: "reader-finder-count", "aria-live": "polite", children: u.length === 0 ? "没有找到" : `${m >= 0 ? `第 ${m + 1} / ` : ""}${u.length >= 200 ? "200+ 处，只列前 200 处" : `${u.length} 处`}${m < 0 ? "，回车跳到第一处" : ""}` }) : null
      ] }),
      /* @__PURE__ */ p("ol", { className: "reader-finder-list", children: u.map((R, T) => /* @__PURE__ */ p("li", { children: /* @__PURE__ */ L(re, { className: "reader-finder-entry is-hit", "aria-current": T === m ? "true" : void 0, onClick: () => S(T), children: [
        /* @__PURE__ */ L("span", { className: "reader-finder-entry-text", children: [
          R.snippet.slice(0, R.at),
          /* @__PURE__ */ p("mark", { children: R.snippet.slice(R.at, R.at + R.length) }),
          R.snippet.slice(R.at + R.length)
        ] }),
        /* @__PURE__ */ p("span", { className: "reader-finder-entry-page", children: R.page })
      ] }) }, R.itemId)) })
    ] })
  ] });
}
function ef({ active: e, compare: t, ink: n }) {
  const [r, o] = N(!1), [a, s] = N(!1), i = A(null);
  D(() => {
    if (!r && !a) return;
    const c = () => {
      o(!1), s(!1);
    }, d = (u) => {
      var m;
      (m = i.current) != null && m.contains(u.target) || c();
    }, f = (u) => {
      u.key === "Escape" && c();
    };
    return document.addEventListener("pointerdown", d, !0), document.addEventListener("keydown", f), () => {
      document.removeEventListener("pointerdown", d, !0), document.removeEventListener("keydown", f);
    };
  }, [r, a]);
  const l = !!(t.compared || t.loading);
  return /* @__PURE__ */ L("div", { className: "reader-toolball", ref: i, "data-open": r ? "true" : void 0, children: [
    a ? /* @__PURE__ */ p(id, { compare: t, onDone: () => {
      s(!1), o(!1);
    } }) : null,
    r ? /* @__PURE__ */ L("div", { className: "reader-toolball-stack", role: "group", "aria-label": "工具", children: [
      n ? /* @__PURE__ */ p(
        re,
        {
          className: "reader-toolball-item",
          "aria-label": "画笔",
          title: "画笔（P；书页上右键也能选笔和颜色）",
          "aria-pressed": !!n.tool,
          "data-toolball-item": "ink",
          onClick: () => {
            n.setTool(n.tool ? null : "pen"), o(!1);
          },
          children: /* @__PURE__ */ p(zn, { size: 18, strokeWidth: 2.1, "aria-hidden": !0 })
        }
      ) : null,
      /* @__PURE__ */ p(Id, { active: e }),
      t.available ? /* @__PURE__ */ p(
        re,
        {
          className: "reader-toolball-item",
          "aria-label": "对比版本",
          title: "对比版本：左边换成这本书的另一份译文",
          "aria-pressed": l || a,
          "data-toolball-item": "compare",
          onClick: () => s((c) => !c),
          children: /* @__PURE__ */ p(Ua, { size: 18, strokeWidth: 2.1, "aria-hidden": !0 })
        }
      ) : null
    ] }) : null,
    /* @__PURE__ */ p(
      re,
      {
        className: "reader-toolball-ball",
        "aria-label": r ? "收起工具" : "工具：画笔、Markdown、对比版本",
        title: r ? "收起" : "工具",
        "aria-expanded": r,
        "data-active": e || l ? "true" : void 0,
        onClick: () => {
          o((c) => !c), s(!1);
        },
        children: r ? /* @__PURE__ */ p(bt, { size: 20, strokeWidth: 2.2, "aria-hidden": !0 }) : /* @__PURE__ */ p(Ha, { size: 20, strokeWidth: 2.1, "aria-hidden": !0 })
      }
    )
  ] });
}
const tf = [
  { tool: "pen", label: "画笔", Icon: zn },
  { tool: "highlighter", label: "荧光笔", Icon: Wa },
  { tool: "eraser", label: "橡皮", Icon: Va }
];
function ua(e) {
  return e instanceof Element && !!e.closest("input, textarea, select, [contenteditable='true']");
}
function fa({ ink: e, page: t = 0, onPick: n }) {
  const r = () => n == null ? void 0 : n();
  return /* @__PURE__ */ L($e, { children: [
    tf.map(({ tool: o, label: a, Icon: s }) => /* @__PURE__ */ p(
      re,
      {
        className: "reader-ink-tool",
        "aria-label": a,
        title: a,
        "aria-pressed": e.tool === o,
        "data-ink-tool": o,
        onClick: () => {
          e.setTool(e.tool === o ? null : o), r();
        },
        children: /* @__PURE__ */ p(s, { size: 17, strokeWidth: 2, "aria-hidden": !0 })
      },
      o
    )),
    /* @__PURE__ */ p("span", { className: "reader-ink-sep", "aria-hidden": !0 }),
    Oo.map((o) => /* @__PURE__ */ p(
      re,
      {
        className: "reader-ink-color",
        "aria-label": `${o.label}色`,
        title: `${o.label}色`,
        "aria-pressed": e.color === o.key,
        "data-ink-color": o.key,
        style: { color: `var(--${o.key})` },
        onClick: () => {
          e.setColor(o.key), (!e.tool || e.tool === "eraser") && e.setTool("pen"), r();
        },
        children: /* @__PURE__ */ p("span", { "aria-hidden": !0 })
      },
      o.key
    )),
    /* @__PURE__ */ p("span", { className: "reader-ink-sep", "aria-hidden": !0 }),
    /* @__PURE__ */ p(re, { className: "reader-ink-tool", "aria-label": "撤销", title: "撤销（⌘Z）", onClick: e.undo, children: /* @__PURE__ */ p(Ka, { size: 17, strokeWidth: 2, "aria-hidden": !0 }) }),
    t > 0 ? /* @__PURE__ */ p(
      re,
      {
        className: "reader-ink-tool",
        "aria-label": `清掉第 ${t} 页的笔迹`,
        title: `清掉第 ${t} 页的笔迹`,
        onClick: () => {
          e.clearPage(t), r();
        },
        children: /* @__PURE__ */ p(Ja, { size: 17, strokeWidth: 2, "aria-hidden": !0 })
      }
    ) : null,
    e.tool ? /* @__PURE__ */ p(
      re,
      {
        className: "reader-ink-tool",
        "aria-label": "退出画笔",
        title: "退出画笔（Esc）",
        "data-ink-exit": "true",
        onClick: () => {
          e.setTool(null), r();
        },
        children: /* @__PURE__ */ p(bt, { size: 17, strokeWidth: 2, "aria-hidden": !0 })
      }
    ) : null
  ] });
}
function nf({ ink: e, menu: t, onClose: n }) {
  const r = A(null);
  if (D(() => {
    if (!t) return;
    const i = (c) => {
      var d;
      (d = r.current) != null && d.contains(c.target) || n();
    }, l = (c) => {
      c.key === "Escape" && n();
    };
    return document.addEventListener("pointerdown", i, !0), document.addEventListener("keydown", l), () => {
      document.removeEventListener("pointerdown", i, !0), document.removeEventListener("keydown", l);
    };
  }, [t, n]), !t) return null;
  const o = 380, a = Math.max(8, Math.min(t.x, (globalThis.innerWidth || o) - o - 8)), s = Math.max(68, Math.min(t.y, (globalThis.innerHeight || 600) - 60));
  return /* @__PURE__ */ p("div", { ref: r, className: "reader-ink-bar is-menu", role: "menu", "aria-label": "画笔", style: { left: a, top: s }, "data-ink-menu": "true", children: /* @__PURE__ */ p(fa, { ink: e, page: t.page, onPick: n }) });
}
function rf({ ink: e }) {
  return e.tool ? /* @__PURE__ */ p("div", { className: "reader-ink-bar is-dock", role: "toolbar", "aria-label": "画笔", "data-ink-dock": "true", children: /* @__PURE__ */ p(fa, { ink: e }) }) : null;
}
function of(e) {
  var r;
  if (e.shiftKey || ua(e.target)) return null;
  const t = e.target instanceof Element ? e.target : null;
  if (!(t != null && t.closest(`.${bo}`))) return null;
  const n = Number((r = t.closest(`[${Le}]`)) == null ? void 0 : r.getAttribute(Le)) || 0;
  return { x: e.clientX, y: e.clientY, page: n };
}
function af(e) {
  const t = A(e);
  t.current = e, D(() => {
    const n = (r) => {
      if (ua(r.target)) return;
      const o = t.current;
      !r.metaKey && !r.ctrlKey && !r.altKey && !r.repeat && (r.key === "p" || r.key === "P") ? (r.preventDefault(), o.setTool(o.tool ? null : "pen")) : r.key === "Escape" && o.tool ? o.setTool(null) : o.tool && (r.metaKey || r.ctrlKey) && !r.shiftKey && (r.key === "z" || r.key === "Z") && (r.preventDefault(), o.undo());
    };
    return window.addEventListener("keydown", n), () => window.removeEventListener("keydown", n);
  }, []);
}
function hn() {
  try {
    return Ze().translationVersions ?? null;
  } catch {
    return null;
  }
}
function sf(e) {
  return e.map((t) => ({ ...t, source: { ...t.translated } }));
}
function lf(e, t, n) {
  var r;
  return ((r = e.find((o) => o.jobIds.includes(t))) == null ? void 0 : r.versionId) || n || "";
}
function cf(e, t) {
  const n = new URL(e);
  return n.searchParams.set("job_id", t), n.searchParams.delete("block_id"), `${n.pathname}${n.search}${n.hash}`;
}
function df({ documentId: e, jobId: t }) {
  const [n, r] = N([]), [o, a] = N(null), [s, i] = N(null), [l, c] = N(""), [d, f] = N(""), u = A(0);
  D(() => {
    r([]), i(null), f("");
    const y = hn();
    if (!y || !e) return;
    let w = !1;
    return y.list(e).then((g) => {
      w || (r(g.versions), a(g.currentVersionId));
    }).catch(() => {
    }), () => {
      w = !0;
    };
  }, [e, t]);
  const m = $((y) => {
    const w = hn(), g = n.find((b) => b.versionId === y);
    if (!w || !g || !e) return;
    const S = ++u.current;
    c(y), f(""), (async () => {
      const b = Ze(), I = await w.resolveJob(e, y);
      if (!I) throw new Error("这一份还没有能读的译文。");
      const R = await b.loadReaderPayload(I, { includeOptionalArtifacts: !0 }), T = b.resolveReaderTranslatedPdfUrl(R.jobPayload, R.manifestPayload);
      if (!T) throw new Error("这一份没有译文 PDF。");
      return { versionId: y, name: g.name, jobId: I, url: T, regions: sf(so(R.regionsPayload)) };
    })().then((b) => {
      S === u.current && i(b);
    }).catch((b) => {
      S === u.current && f((b == null ? void 0 : b.message) || "这一份打不开。");
    }).finally(() => {
      S === u.current && c("");
    });
  }, [e, n]), v = $(() => {
    u.current += 1, i(null), c(""), f("");
  }, []), h = $(async () => {
    var g, S;
    const y = hn();
    if (!y || !s || !e) return;
    try {
      await y.select(e, s.versionId);
    } catch (b) {
      f((b == null ? void 0 : b.message) || "换不过去，请稍后再试。");
      return;
    }
    const w = (g = globalThis.location) == null ? void 0 : g.href;
    w && ((S = globalThis.history) == null || S.replaceState(globalThis.history.state, "", cf(w, s.jobId))), i(null);
  }, [s, e]);
  return {
    available: n.length >= 2,
    versions: n,
    readingVersionId: lf(n, t, o),
    compared: s,
    loading: l,
    error: d,
    choose: m,
    clear: v,
    adopt: h
  };
}
const uf = "reader-finder-input";
function ff(e) {
  return (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && `${e.key || ""}`.toLowerCase() === "f";
}
function mf(e, t = typeof window > "u" ? null : window) {
  D(() => {
    if (!t) return;
    const n = (r) => {
      var a, s;
      if (!ff(r)) return;
      const o = (a = t.document) == null ? void 0 : a.activeElement;
      (s = o == null ? void 0 : o.classList) != null && s.contains(uf) || (r.preventDefault(), e());
    };
    return t.addEventListener("keydown", n), () => t.removeEventListener("keydown", n);
  }, [e, t]);
}
function hf() {
  try {
    return Ze().translationEdit ?? null;
  } catch {
    return null;
  }
}
const pf = "这本书正在处理（翻译或排版），处理完才能改。", gf = "这本书的译文是几次翻译拼起来的，这一版还不能在阅读页里改。";
function bf({
  jobId: e,
  jobStatus: t,
  jobPayload: n,
  hasTranslation: r,
  refreshJobStatus: o
}) {
  const a = hf(), s = `${e || ""}`.trim(), i = !!(a && s && r), l = bl(s), c = !t || Pt(t), d = Rl(n), [f, u] = N(""), [m, v] = N(null), [h, y] = N(() => /* @__PURE__ */ new Map()), [w, g] = N(
    () => ({ renderedAt: "", edits: /* @__PURE__ */ new Map() })
  ), [S, b] = N(() => /* @__PURE__ */ new Map()), [I, R] = N({ phase: "idle" }), T = A({ drafts: /* @__PURE__ */ new Map(), generation: { current: null } }).current;
  D(() => {
    v(null), T.drafts.clear(), T.generation.current = null, b(/* @__PURE__ */ new Map()), R({ phase: "idle" });
  }, [s]), D(() => {
    if (u(""), !i || l || !a) return;
    let _ = !1;
    return a.resolveOwnerJobId(s).then((U) => {
      _ || u(`${U || s}`.trim() || s);
    }).catch(() => {
      _ || u(s);
    }), () => {
      _ = !0;
    };
  }, [i, l, a, s]), D(() => {
    if (y(/* @__PURE__ */ new Map()), !a || !f || !d || !c) return;
    let _ = !1;
    return a.fetchRevisions(f).then((U) => {
      _ || y(El(U, d));
    }).catch(() => {
    }), () => {
      _ = !0;
    };
  }, [a, f, d, c]);
  const O = I.phase === "running" && I.seenActive;
  D(() => {
    if (I.phase === "running") {
      if (!c) {
        O || R({ phase: "running", seenActive: !0 });
        return;
      }
      O && R(t === "succeeded" ? { phase: "idle" } : { phase: "failed", message: "重新排版没成功，PDF 还是之前那份，改动都还在，可以再排一次。" });
    }
  }, [I.phase, O, c, t]);
  const C = q(() => {
    const _ = new Map(h);
    if (w.renderedAt === d)
      for (const [U, F] of w.edits) _.set(U, F);
    return _;
  }, [h, w, d]), j = $((_) => {
    const U = `${_ || ""}`.trim();
    U && v({ itemId: U, page: yl(U) });
  }, []), E = $(() => v(null), []), P = $((_, U) => {
    g((F) => {
      const G = new Map(F.renderedAt === d ? F.edits : []);
      return G.set(_, U), { renderedAt: d, edits: G };
    }), b((F) => new Map(F).set(_, (F.get(_) || 0) + 1));
  }, [d]), k = $(async () => {
    if (!(!a || !s || I.phase === "submitting" || I.phase === "running")) {
      R({ phase: "submitting" });
      try {
        await a.rerender(s), R({ phase: "running", seenActive: !1 }), await o();
      } catch (_) {
        R({ phase: "failed", message: (_ == null ? void 0 : _.message) || "提交重新排版失败，请稍后再试。" });
      }
    }
  }, [a, s, I.phase, o]), M = l ? gf : !c || I.phase === "running" || I.phase === "submitting" ? pf : "";
  return q(() => ({
    available: i,
    blockedReason: M,
    port: a,
    ownerJobId: f,
    target: m,
    select: j,
    close: E,
    memory: T,
    pendingEdits: C,
    savedCounts: S,
    markSaved: P,
    rerender: I,
    startRerender: k
  }), [i, M, a, f, m, j, E, T, C, S, P, I, k]);
}
function yf(e, t) {
  D(() => {
    if (!e) return;
    const n = (r) => {
      var s;
      if (r.key !== "e" && r.key !== "E" || r.metaKey || r.ctrlKey || r.altKey || r.repeat) return;
      const o = r.target;
      if ((s = o == null ? void 0 : o.closest) != null && s.call(o, "input, textarea, select, [contenteditable='true']")) return;
      const a = t.get().itemId;
      a && (r.preventDefault(), e(a));
    };
    return window.addEventListener("keydown", n), () => window.removeEventListener("keydown", n);
  }, [e, t]);
}
function vf({ edit: e }) {
  const t = e.pendingEdits.size, { rerender: n } = e;
  return n.phase === "running" || n.phase === "submitting" ? /* @__PURE__ */ p("div", { className: "reader-pending-edits is-running", role: "status", "data-block-edit-rerender": "running", children: "正在重新排版，排完译文 PDF 会自动换成新的（大书要几分钟）。" }) : !t && n.phase !== "failed" ? null : /* @__PURE__ */ L("div", { className: "reader-pending-edits", role: "status", "data-block-edit-pending": t, children: [
    /* @__PURE__ */ p("span", { children: n.phase === "failed" ? n.message : `改了 ${t} 处，还没排进 PDF` }),
    t ? /* @__PURE__ */ p(
      re,
      {
        className: "reader-pending-edits-act",
        size: "sm",
        variant: "primary",
        "data-block-edit-action": "rerender",
        onClick: () => {
          e.startRerender();
        },
        children: "重新排版"
      }
    ) : null
  ] });
}
const wf = ha(() => import("./ReaderMarkdownPanel-BeOAn05I.js").then((e) => ({ default: e.ReaderMarkdownPanel })));
function Sf(e) {
  const t = e.sourceOnly || !e.translatedUrl, n = !!(e.overlayContentAvailable && e.liveTranslationVisible && !e.assistantOpen), o = e.assistantOpen && e.mode === "compare" ? "source" : e.mode, a = !t && (o === "translated" || o === "compare");
  return {
    kind: n ? "live-overlay" : o === "compare" ? "final-compare" : o === "translated" ? "translated-only" : "source-only",
    visibleMode: o,
    compareMode: o === "compare" && a,
    showSource: n || o !== "translated" || !a,
    showTranslated: a,
    overlayOnSource: n,
    sourceOnly: e.sourceOnly,
    sourceViewOnly: t
  };
}
function If(e, t) {
  return e === "compare" ? t ? !0 : null : !1;
}
function Rf() {
  var ce;
  const e = el(), { boot: t, panes: n, sessionFiles: r, session: o } = e, a = Bu(e.viewStateKey), s = a.panel, i = a.setPanel, [l, c] = N(!1), d = A(null), f = A(null), u = s !== null, m = e.liveTranslationAvailable || e.liveTranslation.pagesByPage.size > 0, v = Sf({
    mode: e.mode,
    sourceOnly: e.sourceOnly,
    translatedUrl: r.translatedUrl,
    overlayContentAvailable: m,
    liveTranslationVisible: l,
    assistantOpen: u
  }), h = Vi({
    hasOverlayContent: m,
    connection: e.liveTranslation.connection,
    showSource: v.showSource,
    liveTranslationVisible: l,
    assistantOpen: u
  }), y = v.sourceViewOnly, w = v.visibleMode;
  D(() => {
    c(!1);
  }, [e.viewStateKey]), D(() => {
    e.session.jobTerminal && c(!1);
  }, [e.session.jobTerminal]), D(() => {
    if (!(t.loading || t.failed)) {
      if (d.current !== e.viewStateKey) {
        d.current = e.viewStateKey;
        const B = _e(e.viewStateKey), V = Vu({
          savedMode: B == null ? void 0 : B.mode,
          sourceViewOnly: y,
          viewportWidth: et()
        });
        f.current = V.auto ? V.mode : null, V.mode && V.mode !== e.mode && e.setModeKeepingPage(V.mode);
        return;
      }
      Ku(e.mode, f.current) && (f.current = null, en(e.viewStateKey, { mode: e.mode }));
    }
  }, [t.failed, t.loading, e.mode, e.setModeKeepingPage, e.viewStateKey, y]);
  const g = s || (e.mode === "compare" ? "compare" : "reading"), S = qu(s, "markdown");
  il({
    mode: w,
    sourceOnly: e.sourceOnly,
    setMode: e.setModeKeepingPage,
    userZoom: e.userZoom,
    onZoomChange: e.onZoomChange,
    currentPage: e.currentPage,
    numPages: n.hudNumPages,
    goToPage: e.goToPage,
    enabled: e.showHud
  });
  const b = $(() => {
    i(null);
  }, []), I = $((B) => {
    const V = If(B, e.liveTranslationAvailable);
    V !== null && c(V), e.setModeKeepingPage(B);
  }, [e.liveTranslationAvailable, e.setModeKeepingPage]), R = q(() => h.sourcePaneToggle ? /* @__PURE__ */ p(
    "button",
    {
      type: "button",
      className: `reader-live-translation-toggle${l ? " is-active" : ""}`,
      onClick: () => c((B) => !B),
      "aria-pressed": l,
      title: l ? "隐藏实时译文" : "在原文 PDF 上叠加实时译文",
      children: "译文"
    }
  ) : null, [h.sourcePaneToggle, l]), T = $((B) => {
    i(B);
  }, []), [O] = N(Gu), [C, j] = N(null), E = $((B) => j((V) => V === B ? null : B), []), [P, k] = N(""), [M, _] = N("");
  D(() => {
    const B = P.replace(/\s+/gu, " ").trim(), V = window.setTimeout(() => _(B), B ? 150 : 0);
    return () => window.clearTimeout(V);
  }, [P]);
  const [U, F] = N(0), G = $(() => {
    j("search"), F((B) => B + 1);
  }, []);
  mf(G);
  const ee = $((B) => {
    e.jumpToAnchor({ block_id: B }), (C === "outline" || et() < 900) && j(null);
  }, [e.jumpToAnchor, C]), X = $((B) => e.jumpToAnchor({ block_id: B }), [e.jumpToAnchor]), Q = bf({
    jobId: o.jobId,
    jobStatus: o.jobStatus,
    jobPayload: o.download.jobPayload,
    hasTranslation: !e.sourceOnly && !!r.translatedUrl,
    refreshJobStatus: o.refreshJobStatus
  }), fe = Q.select, le = e.setModeKeepingPage, ue = o.regions, be = $((B) => {
    Nl(ue, B) && (w === "source" && le("compare"), fe(B));
  }, [ue, fe, w, le]);
  yf(Q.available ? be : null, O);
  const H = Rc(e.viewStateKey);
  af(H);
  const [te, me] = N(null), ie = $(() => me(null), []), ye = df({ documentId: o.documentId, jobId: o.jobId }), Be = ((ce = ye.compared) == null ? void 0 : ce.url) || "";
  D(() => {
    Be && w !== "compare" && I("compare");
  }, [Be]), D(() => {
    w !== "compare" && ye.clear();
  }, [w]);
  const Pe = q(
    () => {
      const { compared: B, versions: V, readingVersionId: se } = ye;
      if (!B) return null;
      const ve = V.find((Se) => Se.versionId === B.versionId), pe = V.find((Se) => Se.versionId === se);
      return {
        url: B.url,
        regions: B.regions,
        left: { name: B.name, createdAt: (ve == null ? void 0 : ve.createdAt) || "" },
        right: { name: (pe == null ? void 0 : pe.name) || "当前译文", createdAt: (pe == null ? void 0 : pe.createdAt) || "" }
      };
    },
    [ye.compared, ye.versions, ye.readingVersionId]
  ), Ie = q(() => {
    if (!Q.savedCounts.size) return e.revisedBlocks;
    const B = new Map(e.revisedBlocks);
    for (const [V, se] of Q.savedCounts) B.set(V, (B.get(V) || 0) + se);
    return B;
  }, [e.revisedBlocks, Q.savedCounts]), Te = q(() => ({
    bindShell: e.shell.bindShell,
    shellEl: e.shell.shellEl,
    shellWidth: e.shell.shellWidth,
    userZoom: e.userZoom,
    onZoomChange: e.onZoomChange,
    rowHeights: e.rowHeights,
    mountSource: e.panes.mountSource,
    mountTranslated: e.panes.mountTranslated,
    onMetrics: e.panes.onMetrics,
    onNumPagesChange: e.panes.onNumPages,
    sourceUrl: e.sessionFiles.sourceUrl,
    translatedUrl: e.sessionFiles.translatedUrl,
    sourceFile: e.sessionFiles.sourceFile,
    translatedFile: e.sessionFiles.translatedFile,
    regions: o.regions,
    readerMetadata: o.readerMetadata,
    activeRegion: e.activeRegion,
    regionHover: O,
    jumpToBlock: X,
    revisedBlocks: Ie,
    editBlock: Q.available ? be : void 0,
    blockEdit: Q,
    editShowsSource: w !== "compare",
    findTerm: C === "search" ? M : "",
    compareVersion: Pe,
    ink: H,
    sourceOnly: e.sourceOnly,
    sourceViewOnly: y,
    download: e.download,
    goToPage: e.goToPage,
    assistant: { select: T, close: b }
  }), [
    e.shell,
    e.userZoom,
    e.onZoomChange,
    e.rowHeights,
    e.panes,
    e.sessionFiles,
    o.regions,
    o.readerMetadata,
    e.activeRegion,
    O,
    X,
    Ie,
    Q,
    be,
    w,
    C,
    M,
    Pe,
    H,
    e.sourceOnly,
    y,
    e.download,
    e.goToPage,
    T,
    b
  ]), z = q(() => ({
    currentPage: e.currentPage,
    numPages: n.hudNumPages
  }), [e.currentPage, n.hudNumPages]), Y = [
    Gs,
    `is-workspace-${g}`,
    u ? "is-assistant-open" : "",
    C ? "is-finder-open" : "",
    v.overlayOnSource ? "is-live-translation-overlay" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ p(Ac, { value: Te, hud: z, children: /* @__PURE__ */ L(
    "div",
    {
      className: Y,
      "data-reader-engine": "react-pdf",
      "data-reader-workspace": g,
      "data-ink-mode": H.tool || void 0,
      onContextMenu: (B) => {
        const V = of(B);
        V && (B.preventDefault(), me(V));
      },
      children: [
        /* @__PURE__ */ p(uu, { loading: t.loading, failed: t.failed, text: t.text, percent: t.percent, regionsError: !!o.readerErrors.regions, metadataError: !!o.readerErrors.metadata, onRetry: o.refreshJobArtifacts }),
        /* @__PURE__ */ p(Yu, { open: C, onToggle: E }),
        C ? /* @__PURE__ */ p(
          Qu,
          {
            tab: C,
            onTab: j,
            onClose: () => j(null),
            onJump: ee,
            query: P,
            onQuery: k,
            term: M,
            focusSignal: U
          }
        ) : null,
        /* @__PURE__ */ L("div", { className: "reader-chrome-tray", children: [
          /* @__PURE__ */ p(wu, {}),
          /* @__PURE__ */ p(hl, { onBeforeClose: o.prepareClose })
        ] }),
        /* @__PURE__ */ p(
          bd,
          {
            mode: w,
            documentReady: !!o.jobId,
            sourceViewOnly: y,
            onModeChange: I,
            liveTranslation: h.topBarPill ? {
              visible: l,
              state: e.liveTranslation,
              onToggle: () => c((B) => !B)
            } : null
          }
        ),
        /* @__PURE__ */ p(Rd, { active: s }),
        u ? /* @__PURE__ */ p(cu, {}) : null,
        /* @__PURE__ */ p(md, { paneComposition: v, markdownSplit: S.open, assistantSplit: u, liveTranslation: e.liveTranslation, sourcePaneAction: R }),
        e.showHud ? /* @__PURE__ */ p(
          ju,
          {
            mode: w,
            modeControls: null,
            bookmarkScope: e.viewStateKey,
            issuesJobId: e.sourceOnly ? "" : o.jobId,
            searchSlot: /* @__PURE__ */ p(Xu, { open: C, onToggle: E })
          }
        ) : null,
        /* @__PURE__ */ p(ma, { fallback: null, children: S.mounted ? /* @__PURE__ */ p(wf, { open: S.open, jobId: o.jobId, sourceOnly: e.sourceOnly, side: "right", onClose: b }) : null }),
        /* @__PURE__ */ p(ef, { active: s, compare: ye, ink: H }),
        /* @__PURE__ */ p(nf, { ink: H, menu: te, onClose: ie }),
        /* @__PURE__ */ p(rf, { ink: H }),
        /* @__PURE__ */ p(vf, { edit: Q }),
        /* @__PURE__ */ p(Wu, {})
      ]
    }
  ) });
}
function jf() {
  return /* @__PURE__ */ p(Rf, {});
}
export {
  jf as R,
  Rf as a,
  gl as c,
  Ff as d,
  os as f,
  ms as r,
  je as u
};
//# sourceMappingURL=ReaderApp-DsSATMmR.js.map
