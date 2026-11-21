var An = (e) => {
  throw TypeError(e);
};
var kn = (e, t, n) => t.has(e) || An("Cannot " + n);
var Qe = (e, t, n) => (kn(e, t, "read from private field"), n ? n.call(e) : t.get(e)), xn = (e, t, n) => t.has(e) ? An("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, n), Ln = (e, t, n, r) => (kn(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n);
import { jsxs as z, jsx as p, Fragment as At } from "react/jsx-runtime";
import { useMemo as V, useState as C, useEffect as j, useCallback as k, useRef as x, useLayoutEffect as Fe, memo as nn, forwardRef as ho, useImperativeHandle as rn, createContext as on, useContext as an, useSyncExternalStore as po, useId as sn, Suspense as go, lazy as Sr } from "react";
import { requireAdapter as pe, getReaderAdapters as ue } from "./adapters.js";
import { resolveReaderDownloadName as bo, createReaderServerFavoritesPort as yo, resolveReaderDownloadUrls as vo, READER_PROGRESS_COPY as Re, trimString as it, READER_DOWNLOAD_ACTIONS as wo, disabledReason as So } from "./runtime/state.js";
import { r as Po, b as Ro } from "./page-config-Ct7qR5rm.js";
import { c as Io, n as To, f as Dt, h as Cn, a as Eo, b as Mo, i as Pr, p as kt, g as Rr, r as Ir, j as zn, e as No } from "./reader-regions-DsePY7B_.js";
import { isReaderTransportError as Ao, createReaderTransportError as ko } from "./contracts.js";
import { extractMarkdownMath as xo, materializeMarkdownMathFallbackHtml as Lo, materializeMarkdownMathHtml as Co, sortByPageAndCreatedAt as zo, buildAnnotationsMarkdown as Do, groupByPageAndCreatedAt as _o } from "./runtime/content.js";
import { toast as Ht, Toaster as Fo } from "sonner";
import { X as Xe, Radio as Oo, FileText as Tr, Columns2 as Er, Languages as Mr, FileCode2 as Nr, GripHorizontal as $o, StickyNote as xt, Sigma as jo, Table2 as Uo, Type as Bo, Image as Ho, Check as Wo, Copy as Jo, Keyboard as Ko, Download as qo, Bookmark as Vo } from "lucide-react";
import { pdfjs as Ar, Page as Go, Document as Yo } from "react-pdf";
const Zo = (...e) => {
  var t, n;
  return ((n = (t = ue()) == null ? void 0 : t.isMockMode) == null ? void 0 : n.call(t, ...e)) ?? !1;
}, Xo = "", Qo = Object.freeze({
  progress: "retainpdf-reader-progress"
}), ea = (e) => {
  var t, n;
  return ((n = (t = ue()) == null ? void 0 : t.resolveResourceUrl) == null ? void 0 : n.call(t, e)) ?? e;
}, Al = (...e) => {
  var n;
  return (((n = ue()) == null ? void 0 : n.fetchProtected) ?? fetch)(...e);
}, Ne = () => pe("defaultReaderDataPort"), Dn = () => pe("defaultReaderPageConfigPort"), kl = {
  get apiPrefix() {
    return Ne().apiPrefix;
  },
  fetchProtected: (...e) => Ne().fetchProtected(...e),
  loadMarkdownPayload: (e) => Ne().loadMarkdownPayload(e),
  loadMarkdownSource: (e) => Ne().loadMarkdownSource(e),
  loadMarkdownRange: (e, t, n, r, o) => Ne().loadMarkdownRange(e, t, n, r, o),
  loadJobPayload: (e) => Ne().loadJobPayload(e),
  loadReaderPayload: (e, t) => Ne().loadReaderPayload(e, t),
  get liveTranslation() {
    return Ne().liveTranslation;
  }
}, kr = {
  messageTargetOrigin: () => Dn().messageTargetOrigin(),
  readerJobId: () => Dn().readerJobId()
}, ta = () => {
  var e;
  return ((e = ue()) == null ? void 0 : e.liveTranslation) ?? null;
}, ct = () => {
  var t;
  const e = ue();
  return (e == null ? void 0 : e.pdf) ?? {
    fetchProtected: (e == null ? void 0 : e.fetchProtected) ?? ((t = e == null ? void 0 : e.defaultReaderDataPort) == null ? void 0 : t.fetchProtected) ?? fetch,
    resolvePdfjsVendorUrl: (n = "") => {
      var r;
      return ((r = e == null ? void 0 : e.resolvePdfjsVendorUrl) == null ? void 0 : r.call(e, n)) ?? "";
    }
  };
}, cn = () => {
  const e = ue();
  if (e != null && e.sessionData) return e.sessionData;
  const t = e == null ? void 0 : e.defaultReaderDataPort;
  if (!t) throw new Error("Reader adapter missing: defaultReaderDataPort (call setReaderAdapters)");
  return {
    loadReaderPayload: t.loadReaderPayload,
    loadJobPayload: t.loadJobPayload,
    fetchDocumentByJobId: (...n) => pe("fetchDocumentByJobId")(...n),
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
}, na = (...e) => {
  var t, n;
  return ((n = (t = ue()) == null ? void 0 : t.resolveReaderAnchor) == null ? void 0 : n.call(t, ...e)) ?? null;
}, ra = () => {
  var e, t;
  return ((t = (e = ue()) == null ? void 0 : e.resolveReaderDocumentId) == null ? void 0 : t.call(e)) ?? "";
}, oa = (...e) => {
  var t, n;
  return ((n = (t = ue()) == null ? void 0 : t.resolveReaderJobId) == null ? void 0 : n.call(t, ...e)) ?? "";
}, aa = (...e) => {
  var t, n;
  return ((n = (t = ue()) == null ? void 0 : t.resolveReaderDownloadName) == null ? void 0 : n.call(t, ...e)) ?? bo(...e);
}, sa = (...e) => {
  var t, n;
  return ((n = (t = ue()) == null ? void 0 : t.resolveReaderDownloadUrls) == null ? void 0 : n.call(t, ...e)) ?? vo(...e);
}, ia = (...e) => pe("downloadProtectedResource")(...e), ca = (...e) => pe("failDownloadToast")(...e), xl = (e, t) => pe("resolveMarkdownAssetUrl")(e, t), ln = "/api/v1", Ll = (e = ln, t = {}) => {
  var n;
  return pe("fetchFavorites")(
    ((n = ue()) == null ? void 0 : n.apiPrefix) ?? e,
    t
  );
};
function Cl(e = {}) {
  const t = ue();
  return yo({
    apiPrefix: (t == null ? void 0 : t.apiPrefix) ?? ln,
    documentByJobId: (...n) => pe("fetchDocumentByJobId")(...n),
    submitFavorite: (...n) => pe("createFavorite")(...n),
    loadFavorites: (...n) => pe("fetchFavorites")(...n),
    removeFavorite: (...n) => pe("deleteFavorite")(...n),
    ...e
  });
}
function la() {
  const e = () => {
    var r;
    return Po(
      ((r = globalThis.location) == null ? void 0 : r.search) || ""
    );
  }, [t, n] = C(e);
  return j(() => {
    var l, c, i, d;
    const r = () => n(e()), o = (c = (l = globalThis.history) == null ? void 0 : l.pushState) == null ? void 0 : c.bind(globalThis.history), a = (d = (i = globalThis.history) == null ? void 0 : i.replaceState) == null ? void 0 : d.bind(globalThis.history);
    let s = !1;
    if (o && a)
      try {
        const u = (f) => function(...m) {
          const v = f.apply(this, m);
          return r(), globalThis.dispatchEvent(new Event("pushstate")), globalThis.dispatchEvent(new Event("replacestate")), globalThis.dispatchEvent(new Event("locationchange")), v;
        };
        globalThis.history.pushState = u(o), globalThis.history.replaceState = u(a), s = !0;
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
function da() {
  const e = la(), t = V(() => oa(kr), [e]), n = V(() => ra(), [e]), r = t || n ? `job:${t}|document:${n}` : `location:${e}`;
  return { locationKey: e, jobId: t, routeDocumentId: n, sessionIdentity: r };
}
function ua(e) {
  const {
    routeDocumentId: t,
    jobId: n,
    sessionIdentity: r,
    sessionIdentityRef: o,
    documentIdRef: a,
    sessionJobIdRef: s,
    switchToSourceMode: l
  } = e, [c, i] = C({
    documentId: "",
    jobId: ""
  }), [d, u] = C({
    documentId: "",
    jobId: ""
  }), f = c.documentId === t ? c.jobId : "", m = d.documentId === t ? d.jobId : "", v = n || f, [h, g] = C({
    jobId: "",
    documentId: ""
  }), y = h.jobId === v ? h.documentId : "", w = t || y, S = !!t && !v, [b, P] = C(null), A = (b == null ? void 0 : b.sessionIdentity) === r && b.documentId === w ? b : null, T = S || !!A, F = k((E) => {
    const I = `${E.documentId || ""}`.trim();
    if (!I || a.current && a.current !== I) return;
    if (!a.current && s.current)
      g({
        jobId: s.current,
        documentId: I
      });
    else if (!a.current)
      return;
    const R = `${E.revision || ""}`.trim() || `${Date.now()}`;
    P({
      documentId: I,
      revision: R,
      sessionIdentity: o.current
    }), l();
  }, []);
  j(() => {
    P((E) => E && E.sessionIdentity !== r ? null : E);
  }, [r]);
  const M = k((E) => {
    switch (E.type) {
      case "resolved-document-job":
        i({ documentId: E.documentId, jobId: E.jobId });
        break;
      case "cleared-resolved-document-job":
        i({ documentId: "", jobId: "" });
        break;
      case "missing-document-job":
        u({ documentId: E.documentId, jobId: E.jobId });
        break;
      case "resolved-job-document":
        g((I) => I.jobId === E.jobId && I.documentId === E.documentId ? I : { jobId: E.jobId, documentId: E.documentId });
        break;
      case "committed-source":
        P({
          documentId: E.documentId,
          revision: E.revision,
          sessionIdentity: E.sessionIdentity
        });
        break;
    }
  }, []);
  return {
    resolvedDocumentJob: c,
    setResolvedDocumentJob: i,
    missingDocumentJob: d,
    setMissingDocumentJob: u,
    documentJobId: f,
    rejectedDocumentJobId: m,
    sessionJobId: v,
    resolvedJobDocument: h,
    setResolvedJobDocument: g,
    jobDocumentId: y,
    documentId: w,
    sourceOnly: S,
    committedDocumentSource: b,
    setCommittedDocumentSource: P,
    activeCommittedDocumentSource: A,
    sourceViewOnly: T,
    refreshCommittedDocument: F,
    applyIdentityEvent: M
  };
}
const fa = /* @__PURE__ */ new Set(["succeeded", "failed", "cancelled", "canceled"]);
function _n(e) {
  return `${(e == null ? void 0 : e.status) || ""}`.trim().toLowerCase();
}
function ma(e) {
  var r, o, a, s;
  if (!e || typeof e != "object") return "";
  const t = e, n = [
    t.document_id,
    t.documentId,
    (r = t.document) == null ? void 0 : r.document_id,
    (o = t.book_summary) == null ? void 0 : o.document_id,
    (s = (a = t.request_payload) == null ? void 0 : a.source) == null ? void 0 : s.document_id
  ];
  for (const l of n) {
    const c = `${l || ""}`.trim();
    if (c) return c;
  }
  return "";
}
function Fn(e, t) {
  const n = `/api/v1/documents/${encodeURIComponent(e)}/source.pdf`, r = `${t || ""}`.trim();
  return ea(r ? `${n}?version=${encodeURIComponent(r)}` : n);
}
function ha(e, t = "") {
  const n = `${e || ""}`.trim(), r = `${t || ""}`.trim();
  return !!(!n || r && (n === r || n === `${r}.pdf`) || /^\d{8,14}-[0-9a-f]{4,}$/i.test(n));
}
function pa(e, t) {
  var r;
  const n = [
    e == null ? void 0 : e.title,
    e == null ? void 0 : e.display_name,
    e == null ? void 0 : e.source_file_name,
    (r = e == null ? void 0 : e.book_summary) == null ? void 0 : r.source_file_name
  ];
  for (const o of n) {
    const a = `${o || ""}`.trim();
    if (a && !ha(a, t))
      return a.replace(/\.pdf$/i, "");
  }
  return "";
}
function Wt({
  percent: e,
  text: t,
  stage: n
}) {
  var r;
  try {
    (r = window.parent) == null || r.postMessage(
      {
        type: Qo.progress,
        stage: n,
        percent: e,
        text: t
      },
      kr.messageTargetOrigin()
    );
  } catch {
  }
}
function It(e, t, n, r = "progress") {
  e({
    loading: !0,
    percent: t,
    text: n,
    stage: r,
    failed: !1
  }), Wt({ percent: t, text: n, stage: r });
}
function ga(e) {
  const {
    sessionJobId: t,
    sessionIdentity: n,
    sessionIdentityRef: r,
    sessionJobIdRef: o,
    sessionEpochRef: a,
    closingRef: s
  } = e, [l, c] = C(null), [i, d] = C(null), [u, f] = C(""), [m, v] = C(0), h = u === n ? l : null, g = u === n ? i : null, y = _n(h), w = fa.has(y), S = k(() => {
    v((M) => M + 1);
  }, []), b = k((M) => {
    c(M.jobPayload), d(M.manifestPayload), f(M.sessionIdentity);
  }, []), P = k((M) => {
    c(null), d(null), f(M);
  }, []), A = x(""), T = x(""), F = k(async () => {
    const M = o.current;
    if (!M || A.current === M) return;
    const E = cn().loadJobPayload;
    if (typeof E != "function") return;
    const I = a.current.value;
    A.current = M;
    try {
      const R = await E(M);
      if (s.current || a.current.value !== I || o.current !== M || !R || typeof R != "object")
        return;
      const N = _n(R);
      c(R), f(r.current), N === "succeeded" && T.current !== M && (T.current = M, v((D) => D + 1));
    } catch {
    } finally {
      A.current === M && (A.current = "");
    }
  }, []);
  return j(() => {
    T.current = "";
  }, [n]), j(() => {
    if (!t || w || !h) return;
    const M = window.setInterval(() => {
      F();
    }, 1e3);
    return () => window.clearInterval(M);
  }, [w, F, h, t]), {
    jobPayload: l,
    setJobPayload: c,
    manifestPayload: i,
    setManifestPayload: d,
    payloadSessionIdentity: u,
    setPayloadSessionIdentity: f,
    scopedJobPayload: h,
    scopedManifestPayload: g,
    jobStatus: y,
    jobTerminal: w,
    jobRefreshRevision: m,
    refreshJobArtifacts: S,
    refreshJobStatus: F,
    publishPayload: b,
    clearPayload: P
  };
}
function Jt(e) {
  document.body.classList.remove(
    "reader-mode-source",
    "reader-mode-translated",
    "reader-mode-compare"
  ), document.body.classList.add(`reader-mode-${e}`);
}
function ba(e, t) {
  e(t), Jt(t);
}
function ya(e) {
  const [t, n] = C(e ? "source" : "compare"), r = k((a) => {
    e && a !== "source" || (n(a), Jt(a));
  }, [e]), o = k((a) => {
    ba(n, a);
  }, []);
  return j(() => (e && document.documentElement.classList.add("reader-source-only"), Jt(t), () => {
    document.documentElement.classList.remove("reader-source-only");
  }), [e, t]), { mode: t, setMode: r, setModeState: n, switchSessionMode: o };
}
function On(e) {
  return typeof e == "string" ? e.trim() : `${e ?? ""}`.trim();
}
function va(e) {
  const t = (e == null ? void 0 : e.data) ?? e, n = t && typeof t == "object" ? t : {};
  return {
    activeJobId: On(n.active_job_id),
    activeVersionId: On(n.active_version_id)
  };
}
function wa(e) {
  const { link: t, rejectedDocumentJobId: n, hasCommittedSource: r } = e, o = t.activeJobId && t.activeJobId !== n && !t.activeJobId.startsWith("doc:") ? t.activeJobId : "";
  return o ? { kind: "follow-active-job", jobId: o, activeVersionId: t.activeVersionId } : t.activeVersionId && !r ? { kind: "open-committed-source", documentId: "", revision: t.activeVersionId } : { kind: "open-source-url" };
}
function Sa(e) {
  const {
    payloadDocumentId: t,
    linkedActiveJobId: n,
    linkedActiveVersionId: r,
    sessionJobId: o,
    hasCommittedSource: a
  } = e;
  return t && r && n === o && !a ? { kind: "restore-committed-source", documentId: t, revision: r } : { kind: "open-job-artifacts" };
}
function Pa(e) {
  return e.status === 404 && !e.jobId && !!e.routeDocumentId && !!e.documentJobId && e.sessionJobId === e.documentJobId;
}
const Ra = 48 * 1024 * 1024;
function Ia(e) {
  return e ? "ranged" in e ? e : { data: e.data.slice() } : null;
}
const Ta = 2, fe = /* @__PURE__ */ new Map();
function Kt(e, t) {
  fe.delete(e), fe.set(e, t);
}
function $n(e) {
  if (fe.size < Ta) return;
  const t = fe.keys().next().value;
  t && fe.delete(t);
}
async function Ea(e) {
  var t, n;
  if (typeof e.json != "function") return "";
  try {
    const r = await e.json(), o = (n = (t = r == null ? void 0 : r.error) == null ? void 0 : t.details) == null ? void 0 : n.reason;
    return typeof o == "string" ? o.trim() : "";
  } catch {
    return "";
  }
}
async function xr(e, t = ct().fetchProtected, n = {}) {
  var d, u, f, m, v, h, g, y, w;
  const r = `${e || ""}`.trim();
  if (!r)
    return null;
  if (fe.has(r)) {
    const S = fe.get(r);
    return Kt(r, S), S;
  }
  const o = new AbortController(), a = () => o.abort();
  (d = n.signal) != null && d.aborted && o.abort(), (f = (u = n.signal) == null ? void 0 : u.addEventListener) == null || f.call(u, "abort", a, { once: !0 });
  let s;
  try {
    s = await t(r, { signal: o.signal });
  } finally {
    (v = (m = n.signal) == null ? void 0 : m.removeEventListener) == null || v.call(m, "abort", a);
  }
  if (!s.ok) {
    const S = new Error(`读取 PDF 失败 (${s.status})`);
    S.status = s.status;
    const b = await Ea(s);
    throw b && (S.reason = b), S;
  }
  const l = Ma(r, s, t);
  if (l) {
    o.abort();
    const S = { ranged: l };
    return $n(), fe.set(r, S), S;
  }
  (g = (h = n.signal) == null ? void 0 : h.addEventListener) == null || g.call(h, "abort", a, { once: !0 });
  let c;
  try {
    c = await s.arrayBuffer();
  } finally {
    (w = (y = n.signal) == null ? void 0 : y.removeEventListener) == null || w.call(y, "abort", a);
  }
  const i = { data: new Uint8Array(c) };
  return fe.has(r) ? Kt(r, i) : ($n(), fe.set(r, i)), i;
}
function Ma(e, t, n) {
  const r = t.headers;
  if (!r || typeof r.get != "function") return null;
  const o = Number(r.get("content-length") || 0), a = `${r.get("accept-ranges") || ""}`.toLowerCase().includes("bytes"), s = `${r.get("content-encoding") || ""}`.trim();
  return !a || s || !Number.isFinite(o) || o < Ra ? null : {
    url: e,
    length: o,
    async fetchRange(l, c) {
      const i = await n(e, { headers: { Range: `bytes=${l}-${c - 1}` } });
      if (i.status !== 206) throw new Error(`读取 PDF 片段失败 (${i.status})`);
      return new Uint8Array(await i.arrayBuffer());
    }
  };
}
const Na = { file: null, loading: !1, error: "" }, Aa = { file: null, loading: !0, error: "" };
function ka(e = "", t = null) {
  const n = `${e || ""}`.trim(), [r, o] = C(null);
  if (j(() => {
    if (t || !n) return;
    const s = fe.get(n);
    if (s) {
      Kt(n, s), o({ url: n, file: s, loading: !1, error: "" });
      return;
    }
    const l = new AbortController();
    return xr(n, void 0, { signal: l.signal }).then((c) => {
      l.signal.aborted || o({ url: n, file: c, loading: !1, error: "" });
    }).catch((c) => {
      l.signal.aborted || o({ url: n, file: null, loading: !1, error: (c == null ? void 0 : c.message) || String(c) });
    }), () => l.abort();
  }, [n, t]), t) return { file: t, loading: !1, error: "" };
  if (!n) return Na;
  const a = fe.get(n);
  return a ? { file: a, loading: !1, error: "" } : (r == null ? void 0 : r.url) === n ? r : Aa;
}
function xa(e) {
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
async function qt(e) {
  const { url: t, label: n, percentStart: r, percentEnd: o, fence: a, setBoot: s } = e;
  if (!t || a.isInactive())
    return null;
  It(s, r, n, "download");
  const l = await xr(t, ct().fetchProtected, {
    signal: a.signal
  });
  return a.isInactive() ? null : (It(s, o, n, "download"), l);
}
async function La(e) {
  const { sourceFinal: t, translatedFinal: n, fence: r, setBoot: o } = e;
  It(o, 25, "正在下载 PDF…", "download");
  const a = [];
  let s = null, l = null;
  return t && a.push(
    qt({
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
    qt({
      url: n,
      label: "正在下载译文 PDF…",
      percentStart: 55,
      percentEnd: 85,
      fence: r,
      setBoot: o
    }).then((d) => {
      l = d;
    })
  ), await Promise.all(a), r.isInactive() ? { status: "inactive" } : !!t && !s || !!n && !l ? { status: "incomplete" } : { status: "downloaded", sourceBytes: s, translatedBytes: l };
}
const vt = {
  regions: null,
  metadata: null
};
function Ca(e) {
  const {
    sessionJobId: t,
    jobId: n,
    routeDocumentId: r,
    documentJobId: o,
    rejectedDocumentJobId: a,
    sourceOnly: s,
    locationKey: l,
    sessionIdentity: c,
    committedSource: i,
    applyIdentityEvent: d,
    publishPayload: u,
    clearPayload: f,
    switchSessionMode: m,
    jobRefreshRevision: v,
    sessionEpochRef: h,
    closingRef: g,
    activeLoadAbortRef: y
  } = e, [w, S] = C(""), [b, P] = C(""), [A, T] = C(null), [F, M] = C(null), [E, I] = C(!1), [R, N] = C(""), [D, L] = C([]), [$, B] = C(() => ({
    source: null,
    translated: null
  })), [X, J] = C(
    vt
  ), [K, ne] = C({
    loading: !0,
    percent: 4,
    text: Re.boot,
    stage: "progress",
    failed: !1
  });
  return j(() => {
    const ae = new AbortController(), U = h.current.value, O = xa({
      sessionEpochRef: h,
      closingRef: g,
      abort: ae,
      sessionEpoch: U
    });
    y.current = ae;
    const q = cn();
    if (g.current)
      return ae.abort(), () => {
        y.current === ae && (y.current = null);
      };
    function re(Q, G) {
      O.markFailed(), ne({
        loading: !1,
        percent: 100,
        text: Q,
        stage: "failed",
        failed: !0
      }), Wt({ percent: 100, text: G, stage: "failed" });
    }
    function le() {
      I(!0), ne({
        loading: !1,
        percent: 100,
        text: Re.ready,
        stage: "ready",
        failed: !1
      }), Wt({ percent: 100, text: Re.ready, stage: "ready" });
    }
    function ve() {
      return i != null && i.documentId ? Fn(
        i.documentId,
        i.revision
      ) : Zo() ? Xo : q.resolveResourceUrl(`/api/v1/documents/${encodeURIComponent(r)}/source.pdf`);
    }
    async function ge() {
      let Q = { activeJobId: "", activeVersionId: "" };
      try {
        const me = await q.fetchProtected(
          q.resolveResourceUrl(`/api/v1/documents/${encodeURIComponent(r)}`)
        );
        if (me != null && me.ok) {
          const Le = await me.json().catch(() => null);
          Q = va(Le);
        }
      } catch {
      }
      const G = wa({
        link: Q,
        rejectedDocumentJobId: a,
        hasCommittedSource: !!i
      });
      if (G.kind === "follow-active-job") {
        if (O.isInactive()) return;
        d({
          type: "resolved-document-job",
          documentId: r,
          jobId: G.jobId
        }), G.activeVersionId ? (i || d({
          type: "committed-source",
          documentId: r,
          revision: G.activeVersionId,
          sessionIdentity: c
        }), m("source")) : m("compare");
        return;
      }
      if (G.kind === "open-committed-source") {
        if (O.isInactive()) return;
        d({
          type: "committed-source",
          documentId: r,
          revision: G.revision,
          sessionIdentity: c
        }), m("source");
        return;
      }
      const oe = ve();
      if (O.isInactive()) return;
      S(oe), P(""), N(""), f(c);
      const Se = await qt({
        url: oe,
        label: "正在下载原文 PDF…",
        percentStart: 30,
        percentEnd: 85,
        fence: O,
        setBoot: ne
      });
      if (!O.isInactive()) {
        if (!Se) {
          re("源文件不可用：该文档没有可读取的源 PDF。", "源文件下载失败");
          return;
        }
        T(Se), le();
      }
    }
    async function we() {
      var yt;
      const Q = await ((yt = q.loadSessionSnapshot) == null ? void 0 : yt.call(q, {
        jobId: t,
        documentId: r,
        routeDocumentId: r,
        committedSource: i,
        includeOptionalArtifacts: !i
      })), G = Q ? {
        jobPayload: Q.sourcePayload,
        manifestPayload: Q.manifestPayload,
        readerMetadata: Q.readerMetadata,
        regionsPayload: Q.regions,
        readerErrors: Q.readerErrors
      } : await q.loadReaderPayload(t, {
        // committedSource 分支会丢弃 regions/metadata（旧页序已失效），
        // 直接跳过这两个可选请求，避免无效网络往返。
        includeOptionalArtifacts: !i
      });
      if (O.isInactive()) return;
      let oe = null;
      if (n && !r) {
        try {
          oe = await q.fetchDocumentByJobId(ln, t);
        } catch {
        }
        if (O.isInactive()) return;
      }
      const Se = ma(G.jobPayload) || `${(oe == null ? void 0 : oe.document_id) || ""}`.trim();
      Se && !r && d({
        type: "resolved-job-document",
        jobId: t,
        documentId: Se
      });
      const me = Sa({
        payloadDocumentId: Se,
        linkedActiveJobId: `${(oe == null ? void 0 : oe.active_job_id) || ""}`.trim(),
        linkedActiveVersionId: `${(oe == null ? void 0 : oe.active_version_id) || ""}`.trim(),
        sessionJobId: t,
        hasCommittedSource: !!i
      });
      if (me.kind === "restore-committed-source") {
        if (O.isInactive()) return;
        d({
          type: "committed-source",
          documentId: me.documentId,
          revision: me.revision,
          sessionIdentity: c
        }), m("source");
        return;
      }
      const Le = q.resolveReaderSourcePdf(G.manifestPayload), gt = q.resolveReaderTranslatedPdfUrl(G.jobPayload, G.manifestPayload), zt = typeof Le == "string" ? Le : q.resolveReaderArtifactUrl(Le), bt = r || Se, Pe = i != null && i.documentId ? Fn(
        i.documentId,
        i.revision
      ) : zt || (bt ? q.resolveResourceUrl(`/api/v1/documents/${encodeURIComponent(bt)}/source.pdf`) : ""), Me = i ? "" : gt || "";
      if (S(Pe || ""), P(Me), N(pa(G.jobPayload, t)), u({
        jobPayload: G.jobPayload || null,
        manifestPayload: G.manifestPayload || null,
        sessionIdentity: c
      }), L(i ? [] : Io(G.regionsPayload)), B(i ? { source: null, translated: null } : To(G.readerMetadata)), J(i ? vt : G.readerErrors ?? vt), !Pe && !Me) {
        re(Re.failed, Re.failed);
        return;
      }
      const Ue = await La({
        sourceFinal: Pe || "",
        translatedFinal: Me,
        fence: O,
        setBoot: ne
      });
      if (Ue.status !== "inactive") {
        if (Ue.status === "incomplete") {
          re("PDF 下载失败，请重试", "PDF 下载失败");
          return;
        }
        T(Ue.sourceBytes), M(Ue.translatedBytes), le();
      }
    }
    async function je() {
      I(!1), T(null), M(null), L([]), B({ source: null, translated: null }), J(vt), It(ne, 8, Re.metadata, "metadata");
      try {
        if (s) {
          await ge();
          return;
        }
        if (!t) {
          re(Re.failed, Re.failed);
          return;
        }
        await we();
      } catch (Q) {
        if (O.isClosedOrStale() || (Q == null ? void 0 : Q.name) === "AbortError") return;
        O.markFailed();
        const G = Number(Q == null ? void 0 : Q.status);
        if (Pa({
          status: G,
          jobId: n,
          routeDocumentId: r,
          documentJobId: o,
          sessionJobId: t
        })) {
          d({ type: "missing-document-job", documentId: r, jobId: t }), d({ type: "cleared-resolved-document-job" }), m("source");
          return;
        }
        const oe = Q instanceof Error ? Q.message : Re.failed;
        re(oe, oe);
      }
    }
    return je(), () => {
      ae.abort(), y.current === ae && (y.current = null);
    };
  }, [t, r, o, a, s, l, i, v, n, c, d, u, f, m]), {
    sourceUrl: w,
    translatedUrl: b,
    sourceFile: A,
    translatedFile: F,
    assetsReady: E,
    title: R,
    regions: D,
    readerMetadata: $,
    readerErrors: X,
    boot: K
  };
}
function za() {
  const e = x(!1), t = x(null), { locationKey: n, jobId: r, routeDocumentId: o, sessionIdentity: a } = da(), s = x({ identity: "", value: 0 });
  s.current.identity !== a && (s.current = {
    identity: a,
    value: s.current.value + 1
  }, e.current = !1);
  const l = x(a), c = x(""), i = x(""), d = x(() => {
  }), u = k(() => d.current(), []), f = ua({
    routeDocumentId: o,
    jobId: r,
    sessionIdentity: a,
    sessionIdentityRef: l,
    documentIdRef: c,
    sessionJobIdRef: i,
    switchToSourceMode: u
  }), {
    sessionJobId: m,
    documentId: v,
    sourceOnly: h,
    sourceViewOnly: g
  } = f, { mode: y, setMode: w, switchSessionMode: S } = ya(g);
  d.current = () => {
    S("source");
  }, l.current = a, c.current = v, i.current = m;
  const b = ga({
    sessionJobId: m,
    sessionIdentity: a,
    sessionIdentityRef: l,
    sessionJobIdRef: i,
    sessionEpochRef: s,
    closingRef: e
  }), {
    scopedJobPayload: P,
    scopedManifestPayload: A,
    jobStatus: T,
    jobTerminal: F,
    jobRefreshRevision: M,
    refreshJobArtifacts: E,
    refreshJobStatus: I
  } = b, R = Ca({
    sessionJobId: m,
    jobId: r,
    routeDocumentId: o,
    documentJobId: f.documentJobId,
    rejectedDocumentJobId: f.rejectedDocumentJobId,
    sourceOnly: h,
    locationKey: n,
    sessionIdentity: a,
    committedSource: f.activeCommittedDocumentSource,
    applyIdentityEvent: f.applyIdentityEvent,
    publishPayload: b.publishPayload,
    clearPayload: b.clearPayload,
    switchSessionMode: S,
    jobRefreshRevision: M,
    sessionEpochRef: s,
    closingRef: e,
    activeLoadAbortRef: t
  }), N = k(() => {
    var L;
    e.current = !0, (L = t.current) == null || L.abort();
  }, []), D = V(
    () => ({
      fetchProtected: cn().fetchProtected,
      jobId: m,
      jobPayload: P,
      manifestPayload: A,
      sourceUrl: R.sourceUrl,
      translatedUrl: R.translatedUrl,
      sourceOnly: g
    }),
    [m, P, A, R.sourceUrl, R.translatedUrl, g]
  );
  return {
    jobId: m,
    jobStatus: T,
    workflow: `${(P == null ? void 0 : P.workflow) || ""}`.trim().toLowerCase(),
    jobTerminal: F,
    documentId: v,
    sessionIdentity: a,
    sourceOnly: h,
    mode: y,
    setMode: w,
    sourceUrl: R.sourceUrl,
    translatedUrl: R.translatedUrl,
    sourceFile: R.sourceFile,
    translatedFile: R.translatedFile,
    assetsReady: R.assetsReady,
    boot: R.boot,
    title: R.title,
    regions: R.regions,
    readerMetadata: R.readerMetadata,
    readerErrors: R.readerErrors,
    download: D,
    refreshJobArtifacts: E,
    refreshJobStatus: I,
    refreshCommittedDocument: f.refreshCommittedDocument,
    prepareClose: N
  };
}
const Da = 160, _a = 8, Fa = 960;
function Oa() {
  const e = x(null), [t, n] = C(null), [r, o] = C(Fa), a = k((s) => {
    e.current = s, n(s);
  }, []);
  return j(() => {
    const s = t;
    if (!s || typeof ResizeObserver > "u")
      return;
    const l = (i) => {
      !Number.isFinite(i) || i < Da || o((d) => Math.abs(d - i) < _a ? d : i);
    }, c = new ResizeObserver((i) => {
      var d, u;
      l(((u = (d = i[0]) == null ? void 0 : d.contentRect) == null ? void 0 : u.width) ?? s.clientWidth);
    });
    return c.observe(s), l(s.clientWidth), () => c.disconnect();
  }, [t]), {
    shellRef: e,
    shellEl: t,
    shellWidth: r,
    bindShell: a
  };
}
function $a(e) {
  const { mode: t, sourceOnly: n, assetsReady: r, hasSource: o, hasTranslated: a } = e, s = r && o, l = r && a && !n, c = t === "source" || t === "compare", i = !n && (t === "translated" || t === "compare");
  return {
    mountSource: s,
    mountTranslated: l,
    showSource: c,
    showTranslated: i,
    compareMode: t === "compare" && c && i && s && l,
    primaryPane: t === "translated" ? "translated" : "source"
  };
}
const _t = { source: 0, translated: 0 };
function ja(e, t) {
  const {
    mode: n,
    sourceOnly: r,
    assetsReady: o,
    sourceUrl: a,
    translatedUrl: s,
    sourceFile: l,
    translatedFile: c
  } = e, i = `${(t == null ? void 0 : t.identityKey) || ""}\0${a}\0${s}`, d = x(i);
  d.current = i;
  const [u, f] = C(() => ({
    identity: i,
    pages: _t
  })), [m, v] = C(() => ({ identity: i, tick: 0 })), h = u.identity === i ? u.pages : _t, g = m.identity === i ? m.tick : 0, y = $a({
    mode: n,
    sourceOnly: r,
    assetsReady: o,
    hasSource: !!l || !!a,
    hasTranslated: !!c
  }), { primaryPane: w } = y, S = k((I, R) => {
    d.current === i && f((N) => {
      const D = N.identity === i ? N.pages : _t;
      return D[R] === I && N.identity === i ? N : {
        identity: i,
        pages: { ...D, [R]: I }
      };
    });
  }, [i]), b = x(null), P = k(() => {
    b.current && clearTimeout(b.current);
    const I = i;
    b.current = setTimeout(() => {
      b.current = null, d.current === I && v((R) => ({
        identity: I,
        tick: R.identity === I ? R.tick + 1 : 1
      }));
    }, 60);
  }, [i]);
  j(() => (b.current && (clearTimeout(b.current), b.current = null), f((I) => I.identity === i && I.pages.source === 0 && I.pages.translated === 0 ? I : { identity: i, pages: { source: 0, translated: 0 } }), v((I) => I.identity === i && I.tick === 0 ? I : { identity: i, tick: 0 }), () => {
    b.current && (clearTimeout(b.current), b.current = null);
  }), [i]);
  const A = V(
    () => Math.max(h.source, h.translated),
    [h]
  ), T = w === "translated" ? h.translated : h.source || h.translated, F = t == null ? void 0 : t.userZoom, M = t == null ? void 0 : t.shellWidth, E = `${i}-${g}-${F}-${n}-${h.source}-${h.translated}-${M}`;
  return {
    ...y,
    numPagesByPane: h,
    hudNumPages: A,
    primaryNumPages: T,
    metricsTick: g,
    onNumPages: S,
    onMetrics: P,
    rowSyncRevision: E
  };
}
const Ge = "data-reader-page", Ye = "data-reader-pane", dn = "data-natural-height", Ua = "reader-react-root", Ba = "reader-react-grid", Ha = "reader-react-scroll-shell", Wa = "reader-react-pdf-pane", Lr = "reader-react-pdf-page", Tt = "reader-react-pdf-page-placeholder", un = "reader-react-pdf-page-slot";
function lt(e, t) {
  const n = e != null ? `[${Ge}="${e}"]` : `[${Ge}]`;
  return t ? `${n}[${Ye}="${t}"]` : n;
}
function Ja() {
  return `.${un}[${Ge}]`;
}
function Lt(e) {
  return Number(e.getAttribute(Ge));
}
const Cr = 0.25, zr = 1, Ka = 0.05, ht = 0.5, qa = 16, Va = 8;
function ot(e) {
  return ht;
}
function Ct(e) {
  return Number.isFinite(e) ? Math.min(zr, Math.max(Cr, e)) : ht;
}
function dt(e, t) {
  const n = Ct(Number(e) + t * Ka);
  return Math.round(n * 100) / 100;
}
function Ga(e) {
  return Math.round(Ct(e) * 100);
}
function Ya(e) {
  const n = (Number(e) || 0) - qa - Va;
  return Math.max(160, Math.floor(n));
}
function Za(e, t = ht) {
  const n = Ct(t);
  return Ya((Number(e) || 0) * n);
}
function Xa(e, t) {
  if (!e || !Number.isFinite(t) || t <= 0 || Math.abs(t - 1) < 1e-3)
    return;
  const n = e.scrollLeft + e.clientWidth / 2, r = e.scrollTop + e.clientHeight / 2, o = Array.from(
    e.querySelectorAll(`[${Ye}]`)
  ).map((s) => ({
    pane: s,
    cx: s.scrollLeft + s.clientWidth / 2,
    hadOverflow: s.scrollWidth > s.clientWidth + 1
  })), a = () => {
    e.scrollLeft = Math.max(0, n * t - e.clientWidth / 2), e.scrollTop = Math.max(0, r * t - e.clientHeight / 2);
    for (const { pane: s, cx: l, hadOverflow: c } of o) {
      const i = Math.max(0, s.scrollWidth - s.clientWidth);
      if (i <= 0) {
        s.scrollLeft = 0;
        continue;
      }
      c ? s.scrollLeft = Math.min(
        i,
        Math.max(0, l * t - s.clientWidth / 2)
      ) : s.scrollLeft = i / 2;
    }
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(a);
  });
}
const Qa = "retainpdf:reader:view:v1:", jn = /* @__PURE__ */ new Set([
  "source",
  "translated",
  "markdown"
]), es = /* @__PURE__ */ new Set([
  "source",
  "compare",
  "translated"
]);
function Dr() {
  try {
    return typeof globalThis.localStorage > "u" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
function Vt(e) {
  return `${e || ""}`.trim();
}
function ts({
  documentId: e,
  jobId: t
}) {
  const n = Vt(e);
  if (n) return `document:${n}`;
  const r = Vt(t);
  return r ? `job:${r}` : "";
}
function _r(e) {
  const t = Vt(e);
  return t ? `${Qa}${t}` : "";
}
function ns(e) {
  if (!e || typeof e != "object") return;
  const t = Math.floor(Number(e.page)), n = Number(e.fraction);
  if (!(!Number.isFinite(t) || t < 1 || !Number.isFinite(n)))
    return {
      page: t,
      fraction: Math.max(0, Math.min(1, n))
    };
}
function rs(e) {
  if (e === null) return null;
  if (!e || typeof e != "object") return;
  const t = `${e.left || ""}`, n = `${e.right || ""}`;
  if (!(!jn.has(t) || !jn.has(n) || t === n))
    return { left: t, right: n };
}
function os(e) {
  return e === null ? null : e === "markdown" ? e : void 0;
}
function as(e) {
  return es.has(e) ? e : void 0;
}
function Fr(e) {
  if (!e || typeof e != "object") return null;
  const t = e;
  if (t.schema !== "retainpdf_reader_view_v1") return null;
  const n = ns(t.anchor), r = Number(t.zoom), o = as(t.mode), a = rs(t.splitLayout), s = os(t.assistantPanel);
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
function Te(e, t = Dr()) {
  const n = _r(e);
  if (!n || !t) return null;
  try {
    const r = t.getItem(n);
    return r ? Fr(JSON.parse(r)) : null;
  } catch {
    return null;
  }
}
function Et(e, t, n = Dr()) {
  const r = _r(e);
  if (!r || !n) return null;
  const o = Te(e, n), a = Fr({
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
function ss(e, t, n = "") {
  const [r, o] = C(() => {
    var u;
    return ((u = Te(n)) == null ? void 0 : u.zoom) ?? ot();
  }), a = x(r), s = x(n);
  a.current = r;
  const l = x(1);
  j(() => {
    var f;
    if (s.current === n) return;
    s.current = n;
    const u = ((f = Te(n)) == null ? void 0 : f.zoom) ?? ot();
    l.current = 1, a.current = u, o(u);
  }, [e, n]);
  const c = k((u) => {
    const f = Ct(u), m = a.current;
    Math.abs(f - m) < 5e-4 || (l.current = f / (m || 1), Et(s.current, { zoom: f }), o(f));
  }, []), i = k((u) => {
    c(dt(a.current, u));
  }, [c]), d = k((u) => {
    c(ot());
  }, [c]);
  return Fe(() => {
    const u = l.current;
    Math.abs(u - 1) < 1e-3 || (l.current = 1, Xa(t == null ? void 0 : t.current, u));
  }, [r, t]), { userZoom: r, onZoomChange: c, stepZoom: i, resetZoom: d };
}
function is(e, t = !0) {
  const [n, r] = C(null), o = k(() => {
    var l, c;
    r(null);
    const s = (l = globalThis.getSelection) == null ? void 0 : l.call(globalThis);
    (c = s == null ? void 0 : s.removeAllRanges) == null || c.call(s);
  }, []), a = e.current ?? null;
  return j(() => {
    if (!t)
      return;
    const s = () => {
      var L, $;
      const h = e.current, g = (L = globalThis.getSelection) == null ? void 0 : L.call(globalThis);
      if (!h || !g || g.isCollapsed || !g.rangeCount) {
        r(null);
        return;
      }
      const y = g.getRangeAt(0);
      if (!h.contains(y.commonAncestorContainer)) {
        r(null);
        return;
      }
      const w = `${g.toString() || ""}`.replace(/\s+/g, " ").trim();
      if (w.length < 2) {
        r(null);
        return;
      }
      let S = y.commonAncestorContainer;
      S.nodeType === Node.TEXT_NODE && (S = S.parentElement);
      const b = ($ = S == null ? void 0 : S.closest) == null ? void 0 : $.call(
        S,
        lt()
      );
      if (!b || !h.contains(b)) {
        r(null);
        return;
      }
      const P = Math.max(1, Math.floor(Lt(b) || 1)), T = b.getAttribute(Ye) === "translated" ? "translated" : "source", F = y.getClientRects(), M = F[F.length - 1] || y.getBoundingClientRect();
      if (!M || M.width === 0 && M.height === 0) {
        r(null);
        return;
      }
      const E = typeof window < "u" ? window.innerWidth : 800, I = typeof window < "u" ? window.innerHeight : 600, R = 16, N = Math.min(Math.max(R, M.left), E - R), D = Math.min(Math.max(R, M.top), I - R);
      r({
        selectionType: "text",
        quote: w,
        page: P,
        pane: T,
        rect: {
          left: N,
          top: D,
          width: M.width,
          height: M.height
        }
      });
    }, l = () => {
      window.setTimeout(s, 0);
    }, c = () => {
      l();
    }, i = () => l(), d = () => l(), u = () => {
      l();
    }, f = (h) => {
      h.key === "Escape" && o();
    }, m = () => {
      r((h) => h && null);
    };
    document.addEventListener("mouseup", c), document.addEventListener("pointerup", i), document.addEventListener("touchend", d), document.addEventListener("selectionchange", u), document.addEventListener("keyup", f);
    const v = a ?? e.current;
    return v == null || v.addEventListener("scroll", m, { passive: !0 }), window.addEventListener("scroll", m, { passive: !0, capture: !0 }), () => {
      document.removeEventListener("mouseup", c), document.removeEventListener("pointerup", i), document.removeEventListener("touchend", d), document.removeEventListener("selectionchange", u), document.removeEventListener("keyup", f), v == null || v.removeEventListener("scroll", m), window.removeEventListener("scroll", m, !0);
    };
  }, [t, a, o]), { selection: n, clearSelection: o };
}
function cs(e) {
  const { mode: t, setMode: n, beginModeSwitch: r } = e, o = x(t), a = x(n), s = x(r);
  return o.current = t, a.current = n, s.current = r, { setModeKeepingPage: k((c) => {
    c !== o.current && (s.current(), a.current(c));
  }, []) };
}
function ls() {
  const [e, t] = C(null), n = k((s) => {
    t(s);
  }, []), r = k((s = null) => {
    t((l) => !s || l === s ? null : l);
  }, []), o = k((s) => {
    t((l) => l === s ? null : s);
  }, []), a = k(
    (s) => e === s,
    [e]
  );
  return { active: e, open: n, close: r, toggle: o, isOpen: a };
}
const fn = 48;
function Or(e, t = fn) {
  return e.getBoundingClientRect().top + t;
}
function $r(e, t) {
  if (!e.length)
    return null;
  let n = null, r = -1 / 0;
  for (const c of e) {
    const i = c.getBoundingClientRect();
    i.height < 8 || i.width < 8 || i.top <= t + 1 && i.top >= r && (n = c, r = i.top);
  }
  if (!n && (n = e.find((i) => {
    const d = i.getBoundingClientRect();
    return d.height >= 8 && d.width >= 8;
  }) ?? null, n)) {
    const i = [...e].reverse().find((d) => {
      const u = d.getBoundingClientRect();
      return u.height >= 8 && u.width >= 8;
    });
    i && i.getBoundingClientRect().bottom < t && (n = i);
  }
  if (!n)
    return null;
  const o = Lt(n);
  if (!Number.isFinite(o) || o < 1)
    return null;
  const a = n.getBoundingClientRect(), s = a.height > 0 ? a.height : 1, l = Math.min(1, Math.max(0, (t - a.top) / s));
  return { el: n, page: o, fraction: l };
}
function Ft(e, t, n = fn) {
  if (!e)
    return null;
  const r = lt(void 0, t), o = Array.from(e.querySelectorAll(r));
  if (!o.length || e.getBoundingClientRect().height <= 0)
    return null;
  const s = Or(e, n), l = $r(o, s);
  return l ? { page: l.page, fraction: l.fraction } : null;
}
function mn(e, t, n = "auto", r, o = fn) {
  if (!e || !t)
    return !1;
  const a = Math.max(1, Math.floor(Number(t.page) || 1)), s = Math.min(1, Math.max(0, Number(t.fraction) || 0));
  let l = null;
  if (r && (l = e.querySelector(lt(a, r))), l || (l = e.querySelector(lt(a))), !l)
    return !1;
  const c = e.getBoundingClientRect(), i = l.getBoundingClientRect();
  if (c.height <= 0 || i.height < 8 && l.offsetHeight < 8)
    return !1;
  const d = i.height > 0 ? i.height : l.offsetHeight, u = e.scrollTop + (i.top - c.top), f = Math.max(0, u + s * d - o);
  return n === "auto" ? e.scrollTop = f : e.scrollTo({ top: f, behavior: n }), !0;
}
function ds(e, t, n = "smooth", r) {
  return mn(
    e,
    { page: t, fraction: 0 },
    n,
    r
  );
}
function Gt(e, t, n) {
  const r = (n == null ? void 0 : n.behavior) ?? "auto", o = (n == null ? void 0 : n.delaysMs) ?? [0, 32, 120, 280];
  let a = !1, s = !1;
  const l = [], c = () => {
    var d;
    if (a) return;
    mn(
      e(),
      t,
      r,
      n == null ? void 0 : n.pane
    ) && !s && (s = !0, (d = n == null ? void 0 : n.onDone) == null || d.call(n));
  };
  for (const i of o)
    i <= 0 ? requestAnimationFrame(() => {
      requestAnimationFrame(c);
    }) : l.push(setTimeout(c, i));
  return () => {
    a = !0;
    for (const i of l)
      clearTimeout(i);
  };
}
function us(e, t, n) {
  return Gt(
    e,
    { page: t, fraction: 0 },
    n
  );
}
function Mt(e, t) {
  if (!Number.isFinite(e))
    return 1;
  const n = Math.max(1, Math.floor(e));
  return !Number.isFinite(t) || t <= 0 ? n : Math.min(t, n);
}
function he(e) {
  return {
    page: Math.max(1, Math.floor(Number(e.page) || 1)),
    fraction: Math.min(1, Math.max(0, Number(e.fraction) || 0))
  };
}
function fs(e, t, n = !0, r = "", o) {
  const [a, s] = C(1);
  return j(() => {
    if (!n || t <= 0) {
      s(1);
      return;
    }
    const l = e.current;
    if (!l)
      return;
    let c = !1, i = null, d = 0;
    const u = lt(void 0, o), f = () => {
      if (c) return;
      const h = Array.from(l.querySelectorAll(u));
      if (!h.length)
        return;
      const g = Or(l), y = $r(h, g);
      y && s(y.page);
    }, m = () => {
      c || (d && cancelAnimationFrame(d), d = requestAnimationFrame(() => {
        d = 0, f();
      }));
    }, v = () => {
      if (c) return;
      if (!Array.from(l.querySelectorAll(u)).length) {
        i = setTimeout(v, 120);
        return;
      }
      f(), l.addEventListener("scroll", m, { passive: !0 });
    };
    return v(), () => {
      c = !0, i && clearTimeout(i), d && cancelAnimationFrame(d), l.removeEventListener("scroll", m);
    };
  }, [e, t, n, r, o]), a;
}
const ms = `canvas, .react-pdf__Page, .${Lr}, .${Tt}`, Un = /* @__PURE__ */ new WeakMap();
function hs(e) {
  const t = Number(e.getAttribute(dn));
  if (Number.isFinite(t) && t > 0)
    return t;
  let n = Un.get(e);
  if ((n == null || !n.isConnected) && (n = e.querySelector(ms), Un.set(e, n)), n) {
    const o = n.getBoundingClientRect().height;
    if (Number.isFinite(o) && o > 0)
      return o;
  }
  const r = e.getBoundingClientRect().height;
  return Number.isFinite(r) && r > 0 ? r : 0;
}
function ps(e, t) {
  if (e.size !== t.size) return !1;
  for (const [n, r] of t)
    if (e.get(n) !== r) return !1;
  return !0;
}
function gs(e) {
  const t = /* @__PURE__ */ new Map();
  e.querySelectorAll(Ja()).forEach((r) => {
    const o = Lt(r);
    if (!Number.isFinite(o) || o < 1) return;
    const a = hs(r);
    if (a <= 0) return;
    const s = t.get(o) || { height: 0, count: 0 };
    s.height = Math.max(s.height, a), s.count += 1, t.set(o, s);
  });
  const n = /* @__PURE__ */ new Map();
  return t.forEach((r, o) => {
    r.count >= 2 && r.height > 0 && n.set(o, Math.ceil(r.height));
  }), n;
}
function bs(e, t, n = "", r) {
  const [o, a] = C(() => /* @__PURE__ */ new Map()), s = x(o), l = x(r);
  return l.current = r, Fe(() => {
    if (!t) {
      s.current.size !== 0 && (s.current = /* @__PURE__ */ new Map(), a(s.current));
      return;
    }
    let c = !1, i = 0, d = !1, u = !1;
    const f = () => {
      var P;
      if (c) return;
      const S = e.current;
      if (!S) return;
      const b = gs(S);
      ps(s.current, b) || (s.current = b, a(b)), d && !u && (u = !0, (P = l.current) == null || P.call(l));
    }, m = () => {
      cancelAnimationFrame(i), i = requestAnimationFrame(() => {
        requestAnimationFrame(f);
      });
    };
    m();
    const v = window.setTimeout(m, 100), h = window.setTimeout(() => {
      d = !0, m();
    }, 300), g = window.setTimeout(m, 700), y = e.current;
    let w = null;
    return y && typeof ResizeObserver < "u" && (w = new ResizeObserver(() => m()), w.observe(y)), () => {
      c = !0, cancelAnimationFrame(i), window.clearTimeout(v), window.clearTimeout(h), window.clearTimeout(g), w == null || w.disconnect();
    };
  }, [e, t, n]), o;
}
const ys = [0, 48, 140, 320, 560], vs = 700, ws = [80, 200, 400], Ss = 500, Ps = 50, Rs = 180, Bn = [0, 48, 140, 320, 700, 1200];
function Is(e, t) {
  var I;
  const {
    primaryPane: n,
    mode: r,
    enabled: o = !0,
    persistenceKey: a = "",
    restoreReady: s = !0
  } = t, l = x(
    ((I = Te(a)) == null ? void 0 : I.anchor) || { page: 1, fraction: 0 }
  ), c = x(null), i = x(!!a), d = x(r), u = x(null), f = x(null), m = x(null), v = x(null), h = x(a), g = x(""), y = x(n);
  y.current = n;
  const w = k(() => {
    var R;
    (R = u.current) == null || R.call(u), u.current = null, f.current != null && (clearTimeout(f.current), f.current = null);
  }, []), S = k((R = !1) => {
    v.current != null && (clearTimeout(v.current), v.current = null);
    const N = () => {
      v.current = null, Et(h.current, {
        anchor: he(l.current)
      });
    };
    R ? N() : v.current = setTimeout(N, Rs);
  }, []), b = k((R) => {
    l.current = he(R), c.current = null, m.current != null && clearTimeout(m.current), m.current = setTimeout(() => {
      m.current = null, i.current = !1;
    }, Ps);
  }, []);
  j(() => {
    if (!o)
      return;
    let R = !1, N = null, D = null, L = null;
    const $ = () => {
      w(), m.current != null && (clearTimeout(m.current), m.current = null), i.current = !1, c.current = null, g.current = h.current;
    }, B = (J) => {
      if (J.ctrlKey || J.metaKey || J.altKey) return;
      const K = J.target;
      K != null && K.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes((K == null ? void 0 : K.tagName) || "") || ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(J.key) && $();
    }, X = () => {
      if (R) return;
      const J = e.current;
      if (!J) {
        L = setTimeout(X, 50);
        return;
      }
      N = J, D = () => {
        if (i.current)
          return;
        const K = Ft(N, y.current);
        K && (l.current = K, S());
      }, N.addEventListener("scroll", D, { passive: !0 }), N.addEventListener("wheel", $, { passive: !0 }), N.addEventListener("touchmove", $, { passive: !0 }), window.addEventListener("keydown", B), i.current || D();
    };
    return X(), () => {
      R = !0, L != null && clearTimeout(L), N && D && (N.removeEventListener("scroll", D), N.removeEventListener("wheel", $), N.removeEventListener("touchmove", $)), window.removeEventListener("keydown", B);
    };
  }, [o, r, n, e, S, w]), Fe(() => {
    var N;
    if (h.current === a) return;
    S(!0), w(), m.current != null && (clearTimeout(m.current), m.current = null), h.current = a, g.current = "";
    const R = (N = Te(a)) == null ? void 0 : N.anchor;
    l.current = R ? he(R) : { page: 1, fraction: 0 }, c.current = null, i.current = !!a, d.current = r;
  }, [a, r, S, w]), j(() => {
    var N;
    if (!o || !s || !a || g.current === a) return;
    g.current = a;
    const R = he(
      ((N = Te(a)) == null ? void 0 : N.anchor) || { page: 1, fraction: 0 }
    );
    return l.current = R, c.current = R, i.current = !0, w(), u.current = Gt(
      () => e.current,
      R,
      {
        behavior: "auto",
        pane: y.current,
        delaysMs: Bn,
        onDone: () => b(R)
      }
    ), f.current = setTimeout(() => {
      f.current = null, b(R);
    }, Math.max(...Bn) + 160), () => w();
  }, [o, s, a, e, b, w]), j(() => {
    if (d.current === r)
      return;
    if (d.current = r, !o) {
      i.current = !1, c.current = null, w();
      return;
    }
    const R = c.current ? he(c.current) : he(l.current);
    return i.current = !0, c.current = R, l.current = R, w(), u.current = Gt(
      () => e.current,
      R,
      {
        behavior: "auto",
        pane: n,
        // 等页宽/行高同步后再钉；同一 locked 幂等，不会越滚越远
        delaysMs: ys,
        onDone: () => b(R)
      }
    ), f.current = setTimeout(() => {
      f.current = null, b(R);
    }, vs), () => {
      w();
    };
  }, [r, o, n, e, b, w]), j(() => () => {
    w(), m.current != null && (clearTimeout(m.current), m.current = null), S(!0);
  }, [w, S]);
  const P = k(() => {
    const R = Ft(
      e.current,
      y.current
    );
    return he(R || l.current);
  }, [e]), A = k(() => {
    i.current = !0;
    const R = Ft(
      e.current,
      y.current
    ), N = he(R ?? l.current);
    return l.current = N, c.current = N, S(), N;
  }, [e, S]), T = k((R, N, D) => {
    const L = D || y.current, $ = Mt(R, N || 1), B = { page: $, fraction: 0 };
    l.current = B, i.current = !0, c.current = B, S(), w(), ds(e.current, $, "smooth", L), u.current = us(
      () => e.current,
      $,
      {
        behavior: "auto",
        pane: L,
        delaysMs: ws,
        onDone: () => b(B)
      }
    ), f.current = setTimeout(() => {
      f.current = null, b(B);
    }, Ss);
  }, [e, b, w, S]), F = k(() => he(l.current), []), M = k(() => i.current, []), E = k(() => {
    if (!i.current || !c.current)
      return;
    const R = he(c.current);
    mn(
      e.current,
      R,
      "auto",
      y.current
    );
  }, [e]);
  return {
    lockFromShell: P,
    beginModeSwitch: A,
    goToPage: T,
    getAnchor: F,
    isRestoring: M,
    repinIfRestoring: E
  };
}
function Ts(e, t) {
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
function jr(e, t, n) {
  const r = `${(n == null ? void 0 : n.jobId) || ""}`.trim(), o = `${(n == null ? void 0 : n.documentId) || ""}`.trim(), a = `j:${r}:d:${o}`;
  return t == null ? `${a}:none:${(e == null ? void 0 : e.blockId) || ""}` : `${a}:p:${t}:b:${(e == null ? void 0 : e.blockId) || ""}`;
}
const Es = [0, 80, 200, 400, 800], Ms = 120, Ns = 400;
function As(e, t, n) {
  const { enabled: r, numPages: o, goToPage: a, resolveBlockPage: s, onAnchorApplied: l, jobId: c, documentId: i } = e, d = x(a);
  d.current = a;
  const u = x(s);
  u.current = s;
  const f = x(l);
  f.current = l;
  const m = x(n);
  m.current = n, j(() => {
    var S, b;
    if (!r || !Number.isFinite(o) || o < 1)
      return;
    const v = na(), h = Ts(v, u.current), g = jr(v, h, { jobId: c, documentId: i });
    if (t.current === g)
      return;
    if (h == null) {
      t.current = g, (S = m.current) == null || S.call(m);
      return;
    }
    t.current = g, v && ((b = f.current) == null || b.call(f, v, h));
    const y = [];
    let w = 0;
    for (const P of Es)
      w = Math.max(w, P), y.push(
        setTimeout(() => {
          d.current(h);
        }, P)
      );
    return y.push(
      setTimeout(() => {
        var P;
        (P = m.current) == null || P.call(m);
      }, w + Ms)
    ), () => {
      for (const P of y) clearTimeout(P);
    };
  }, [r, o, c, i, t]);
}
function ks(e) {
  var a;
  const t = globalThis.window;
  if (!t || typeof ((a = t.history) == null ? void 0 : a.replaceState) != "function") return;
  const n = t.location, r = `${e || ""}`, o = `${n.pathname}${r ? `?${r}` : ""}${n.hash || ""}`;
  t.history.replaceState(null, "", o);
}
function xs(e, t, n) {
  const {
    syncEnabled: r,
    currentPage: o,
    resolveBlockPage: a,
    syncDebounceMs: s = Ns,
    jobId: l,
    documentId: c,
    applyReaderSearch: i
  } = e, d = x(a);
  d.current = a;
  const u = x(i);
  u.current = i;
  const f = x(0);
  j(() => {
    if (!n || !r || !t.current || !Number.isFinite(o) || o < 1 || f.current === o) return;
    const m = setTimeout(() => {
      var y;
      const v = ((y = globalThis.location) == null ? void 0 : y.search) || "", h = Ro(v, o, d.current);
      if (f.current = o, h === null) return;
      const g = `${new URLSearchParams(h).get("block_id") || ""}`.trim();
      t.current = jr(
        { blockId: g },
        o,
        { jobId: l, documentId: c }
      ), (u.current || ks)(h);
    }, s);
    return () => clearTimeout(m);
  }, [
    n,
    r,
    o,
    s,
    l,
    c,
    t
  ]);
}
function Ls(e) {
  const t = x(""), [n, r] = C(!1), o = k(() => r(!0), []), a = {
    enabled: e.enabled,
    numPages: e.numPages,
    goToPage: e.goToPage,
    resolveBlockPage: e.resolveBlockPage,
    onAnchorApplied: e.onAnchorApplied,
    jobId: e.jobId,
    documentId: e.documentId
  };
  As(a, t, o), xs(e, t, n);
}
const et = {
  layoutByPage: /* @__PURE__ */ new Map(),
  pagesByPage: /* @__PURE__ */ new Map(),
  lastSeq: 0,
  connection: "idle",
  jobStatus: "",
  error: ""
};
function Cs(e) {
  return new Map(((e == null ? void 0 : e.pages) || []).map((t) => [t.page_idx, t]));
}
function Hn(e, t) {
  return e.attempt !== t.attempt ? e.attempt < t.attempt ? -1 : 1 : e.generation !== t.generation ? e.generation < t.generation ? -1 : 1 : 0;
}
function Ur(e, t, n) {
  if (n.page_idx !== t.page_idx) return "retry";
  const r = Hn(n, t);
  if (r < 0 || r === 0 && n.page_hash !== t.page_hash) return "retry";
  if (!e) return "accept";
  const o = Hn(n, e);
  return o < 0 ? "ignore" : o === 0 ? n.page_hash === e.pageHash ? "ignore" : "retry" : "accept";
}
function zs(e, t, n) {
  if (t.seq <= e.lastSeq) return e;
  const r = e.pagesByPage.get(t.page_idx), o = Ur(r, t, n);
  if (o === "retry") return e;
  if (o === "ignore")
    return { ...e, lastSeq: t.seq, connection: "live", error: "" };
  const a = new Map(n.items.map((c) => [c.item_id, c])), s = new Map((r == null ? void 0 : r.changedAtSeqById) || []);
  for (const c of t.changed_item_ids)
    a.has(c) && s.set(c, t.seq);
  const l = new Map(e.pagesByPage);
  return l.set(t.page_idx, {
    attempt: n.attempt,
    generation: n.generation,
    pageHash: n.page_hash,
    itemsById: a,
    changedAtSeqById: s,
    lastEventSeq: t.seq
  }), {
    ...e,
    pagesByPage: l,
    lastSeq: t.seq,
    connection: "live",
    error: ""
  };
}
const Wn = [250, 500, 1e3, 2e3, 4e3], Ot = [80, 160, 320, 640, 1e3, 1500], Jn = [250, 500, 1e3, 2e3, 4e3, 5e3], Ds = /* @__PURE__ */ new Set(["succeeded", "failed", "cancelled", "canceled"]);
function Yt(e, t) {
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
function hn(e) {
  return Ao(e) ? `${e.code || ""}`.trim() : "";
}
function wt(e, t) {
  const n = hn(e);
  return n === "LIVE_TRANSLATION_PAGE_NOT_COMMITTED" ? "尚未收到可显示的页面译文" : n === "LIVE_TRANSLATION_LAYOUT_NOT_READY" ? "正在等待 OCR 版面数据" : `${(e == null ? void 0 : e.message) || ""}`.trim() || t;
}
async function _s(e, t, n, r, o) {
  let a = null;
  for (let s = 0; ; s += 1) {
    try {
      const c = await o.fetchPage(e, t.page_idx, { signal: r });
      if (Ur(n.pagesByPage.get(t.page_idx), t, c) !== "retry")
        return c;
      a = ko(
        "Authoritative page snapshot has not reached the event generation",
        409,
        "LIVE_TRANSLATION_SNAPSHOT_UNAVAILABLE"
      );
    } catch (c) {
      if ((c == null ? void 0 : c.name) === "AbortError") throw c;
      a = c;
      const i = hn(c);
      if (i && ![
        "LIVE_TRANSLATION_PAGE_NOT_COMMITTED",
        "LIVE_TRANSLATION_SNAPSHOT_UNAVAILABLE"
      ].includes(i)) throw c;
    }
    const l = Ot[Math.min(s, Ot.length - 1)];
    if (await Yt(l, r), s >= Ot.length + 2) throw a;
  }
}
function Fs({
  jobId: e,
  jobStatus: t,
  enabled: n,
  liveTranslationPort: r = void 0
}) {
  const [o, a] = C(et), s = x(o), l = x("");
  s.current = o;
  const c = `${e || ""}`.trim(), i = `${t || ""}`.trim().toLowerCase(), d = Ds.has(i) ? i : "";
  return j(() => {
    if (!n || !c) {
      l.current = "", s.current = et, a(et);
      return;
    }
    const u = r === void 0 ? ta() : r, f = l.current === c;
    if (l.current = c, !u) {
      const S = {
        ...f ? s.current : et,
        connection: d ? "terminal" : "unavailable",
        jobStatus: i,
        error: "实时译文暂不可用"
      };
      s.current = S, a(S);
      return;
    }
    const m = new AbortController();
    let v = !1;
    const h = {
      ...f ? s.current : et,
      connection: d ? "terminal" : "connecting",
      jobStatus: i,
      error: ""
    };
    s.current = h, a(h);
    const g = (S) => {
      m.signal.aborted || a((b) => {
        const P = S(b);
        return s.current = P, P;
      });
    }, y = async () => {
      let S = 0;
      for (; !m.signal.aborted; )
        try {
          const b = await u.fetchLayout(c, { signal: m.signal });
          v = !0, g((P) => ({
            ...P,
            layoutByPage: Cs(b),
            jobStatus: i,
            error: ""
          }));
          return;
        } catch (b) {
          if ((b == null ? void 0 : b.name) === "AbortError") return;
          const P = hn(b);
          if (!(P === "LIVE_TRANSLATION_LAYOUT_NOT_READY" || !P)) {
            g((T) => ({
              ...T,
              connection: d ? "terminal" : "unavailable",
              jobStatus: i,
              error: wt(b, "实时译文暂不可用")
            }));
            return;
          }
          if (d) {
            g((T) => ({
              ...T,
              connection: "terminal",
              jobStatus: i,
              error: ""
            }));
            return;
          }
          g((T) => ({
            ...T,
            connection: "connecting",
            jobStatus: i,
            error: wt(b, "正在等待 OCR 版面数据")
          })), await Yt(Wn[Math.min(S, Wn.length - 1)], m.signal).catch(() => {
          }), S += 1;
        }
    };
    return (async () => {
      if (await y(), !v || m.signal.aborted) return;
      let S = 0;
      for (; !m.signal.aborted; ) {
        d || g((b) => ({
          ...b,
          connection: b.lastSeq > 0 ? "reconnecting" : "connecting",
          jobStatus: i,
          // 保留已有错误：首页还没提交（lastSeq 为 0）时恰恰是最容易出错的阶段，
          // 此前这里把它清成空串，UI 于是一直显示「连接中」，用户看到的是
          // "正在努力"，实际可能已经在反复失败。
          error: b.error
        }));
        try {
          await u.streamEvents(c, {
            afterSeq: s.current.lastSeq,
            signal: m.signal,
            onEvent: async (b) => {
              if (b.seq <= s.current.lastSeq) return;
              let P;
              try {
                P = await _s(
                  c,
                  b,
                  s.current,
                  m.signal,
                  u
                );
              } catch (A) {
                if ((A == null ? void 0 : A.name) === "AbortError" || m.signal.aborted) throw A;
                g((T) => ({
                  ...T,
                  lastSeq: Math.max(T.lastSeq, b.seq),
                  error: wt(A, "部分页面的实时译文暂时取不到")
                }));
                return;
              }
              g((A) => {
                const T = zs(A, b, P);
                return d ? {
                  ...T,
                  connection: "terminal",
                  jobStatus: i
                } : {
                  ...T,
                  jobStatus: i
                };
              }), S = 0;
            }
          });
        } catch (b) {
          if ((b == null ? void 0 : b.name) === "AbortError" || m.signal.aborted) return;
          g((P) => ({
            ...P,
            connection: d ? "terminal" : "reconnecting",
            jobStatus: i,
            error: wt(b, "实时译文连接已中断，正在重连")
          }));
        }
        if (m.signal.aborted) return;
        if (d) {
          g((b) => ({
            ...b,
            connection: "terminal",
            jobStatus: i
          }));
          return;
        }
        await Yt(Jn[Math.min(S, Jn.length - 1)], m.signal).catch(() => {
        }), S += 1;
      }
    })(), () => m.abort();
  }, [n, r, c, d]), o;
}
const Os = 2e3;
function $s(e) {
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
const js = /* @__PURE__ */ new Set(["book", "translate"]);
function Br(e) {
  return !!(e.jobId && e.sourceUrl && js.has(e.workflow));
}
function Us(e) {
  return !!(Br(e) && !(e.jobStatus === "succeeded" && e.translatedUrl));
}
function Bs() {
  const e = za(), t = Br({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    workflow: e.workflow
  }), n = Us({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    translatedUrl: e.translatedUrl,
    jobStatus: e.jobStatus,
    workflow: e.workflow
  }), r = Fs({
    jobId: e.jobId,
    jobStatus: e.jobStatus,
    enabled: t
  }), o = ls(), { shellRef: a, shellEl: s, shellWidth: l, bindShell: c } = Oa(), i = ts({
    documentId: e.documentId,
    jobId: e.jobId
  }), d = `${i}\0${e.jobId}\0${e.sourceUrl}\0${e.translatedUrl}`, { userZoom: u, onZoomChange: f } = ss(e.mode, a, i), m = ja(
    {
      mode: e.mode,
      sourceOnly: e.sourceOnly,
      assetsReady: e.assetsReady,
      sourceUrl: e.sourceUrl,
      translatedUrl: e.translatedUrl,
      sourceFile: e.sourceFile,
      translatedFile: e.translatedFile
    },
    { userZoom: u, shellWidth: l, identityKey: d }
  ), {
    beginModeSwitch: v,
    goToPage: h,
    repinIfRestoring: g
  } = Is(a, {
    primaryPane: m.primaryPane,
    mode: e.mode,
    enabled: !e.boot.loading,
    persistenceKey: i,
    restoreReady: m.primaryNumPages > 0
  });
  j(() => {
    g();
  }, [l, g]);
  const y = bs(
    a,
    m.compareMode,
    m.rowSyncRevision,
    g
  ), w = fs(
    a,
    m.primaryNumPages,
    !e.boot.loading,
    `${e.mode}-${u}-${m.metricsTick}`,
    m.primaryPane
  ), S = k((U, O) => {
    var re, le;
    const q = Math.max(
      Number(m.hudNumPages) || 0,
      Number(m.primaryNumPages) || 0,
      Number((re = m.numPagesByPane) == null ? void 0 : re.source) || 0,
      Number((le = m.numPagesByPane) == null ? void 0 : le.translated) || 0
    );
    h(U, q, O);
  }, [h, m.hudNumPages, m.primaryNumPages, m.numPagesByPane]), [b, P] = C(null), A = x(null), T = k((U) => {
    A.current && clearTimeout(A.current), P(U), U && (A.current = setTimeout(() => P(null), Os));
  }, []);
  j(() => () => {
    A.current && clearTimeout(A.current);
  }, []);
  const F = k((U) => {
    const O = Dt(e.regions, U);
    return O ? Cn(O, m.primaryPane).page : null;
  }, [e.regions, m.primaryPane]), M = k((U, O) => {
    const q = O || m.primaryPane, re = typeof U == "object" && U ? `${U.block_id || ""}`.trim() : "", le = typeof U == "object" && U ? `${U.image_url || ""}`.trim() : "", ve = typeof U == "object" && U ? U.page_idx != null ? Number(U.page_idx) + 1 : U.page != null ? Number(U.page) : null : typeof U == "number" ? U + 1 : null, ge = Eo(e.regions, le, ve) || Dt(e.regions, re) || (typeof U == "object" ? Mo(e.regions, U) : null);
    let we = ge ? Cn(ge, q).page : null;
    we == null && (we = $s(U)), !(we == null || we < 1) && (T(ge), S(we, q));
  }, [T, S, m.primaryPane, e.regions]);
  Ls({
    enabled: !e.boot.loading && !e.boot.failed && e.assetsReady,
    syncEnabled: !e.boot.loading && !e.boot.failed && e.assetsReady,
    numPages: m.hudNumPages || 0,
    currentPage: w,
    goToPage: S,
    resolveBlockPage: F,
    jobId: e.jobId,
    documentId: e.documentId,
    onAnchorApplied: (U) => {
      T(Dt(e.regions, U.blockId));
    }
  });
  const { setModeKeepingPage: E } = cs({
    mode: e.mode,
    setMode: e.setMode,
    beginModeSwitch: v
  }), [I, R] = C(null), {
    selection: N,
    clearSelection: D
  } = is(a, !e.boot.loading && !e.boot.failed), L = k(() => {
    R(null), D();
  }, [D]), $ = k((U) => {
    D(), R(U);
  }, [D]);
  j(() => {
    N && R(null);
  }, [N]), j(() => {
    const U = a.current;
    if (!U) return;
    const O = () => R(null);
    return U.addEventListener("scroll", O, { passive: !0 }), () => U.removeEventListener("scroll", O);
  }, [s, a]);
  const B = N || I;
  j(() => {
    T(null), L();
  }, [d, T, L]);
  const X = !e.boot.loading && !e.boot.failed, J = V(() => o, [o.active, o.open, o.close, o.toggle, o.isOpen]), K = V(() => ({ bindShell: c, shellEl: s, shellWidth: l, shellRef: a }), [c, s, l, a]), ne = V(() => ({
    sourceUrl: e.sourceUrl,
    translatedUrl: e.translatedUrl,
    sourceFile: e.sourceFile,
    translatedFile: e.translatedFile
  }), [e.sourceUrl, e.translatedUrl, e.sourceFile, e.translatedFile]), ae = V(() => ({
    session: e,
    boot: e.boot,
    sourceOnly: e.sourceOnly,
    mode: e.mode,
    userZoom: u,
    onZoomChange: f,
    shell: K,
    panes: m,
    sessionFiles: ne,
    rowHeights: y,
    goToPage: S,
    activeRegion: b,
    jumpToAnchor: M,
    setModeKeepingPage: E,
    download: e.download,
    showHud: X,
    tools: J,
    selection: B,
    clearSelection: L,
    selectRegion: $,
    viewStateKey: i,
    liveTranslation: r,
    liveTranslationAvailable: n
  }), [e, K, m, ne, y, S, b, M, E, X, J, B, L, $, u, f, i, r, n]);
  return V(() => ({
    ...ae,
    currentPage: w
  }), [ae, w]);
}
const Hs = [
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
], Ws = [
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
    title: "模式",
    items: [
      { actions: ["mode-source"], keys: "1", desc: "源文件" },
      { actions: ["mode-compare"], keys: "2", desc: "对照" },
      { actions: ["mode-translated"], keys: "3", desc: "翻译文件" }
    ]
  }
];
function Js(e) {
  const t = e.length === 1 ? e.toLowerCase() : e;
  for (const n of Hs)
    if (n.keys.some(
      (o) => o.length === 1 ? o === t : o === e
    )) return n;
  return null;
}
function Ks(e) {
  if (!(e instanceof HTMLElement))
    return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
function qs(e) {
  const {
    mode: t,
    sourceOnly: n,
    setMode: r,
    userZoom: o,
    onZoomChange: a,
    currentPage: s,
    numPages: l,
    goToPage: c,
    enabled: i = !0
  } = e;
  j(() => {
    if (!i)
      return;
    const d = (u) => {
      if (u.defaultPrevented || u.metaKey || u.ctrlKey || u.altKey || Ks(u.target))
        return;
      const f = u.key, m = Js(f);
      if (m) {
        if (m.mode) {
          if (n && m.mode !== "source")
            return;
          u.preventDefault(), r(m.mode);
          return;
        }
        if (!(m.requiresPages && l <= 0))
          switch (u.preventDefault(), m.action) {
            case "zoom-in":
              a(dt(o, 1));
              return;
            case "zoom-out":
              a(dt(o, -1));
              return;
            case "zoom-reset":
              a(ot());
              return;
            case "next-page":
              c(Mt(s + 1, l));
              return;
            case "prev-page":
              c(Mt(s - 1, l));
              return;
            case "first-page":
              c(1);
              return;
            case "last-page":
              c(l);
              return;
          }
      }
    };
    return window.addEventListener("keydown", d), () => window.removeEventListener("keydown", d);
  }, [
    i,
    t,
    n,
    r,
    o,
    a,
    s,
    l,
    c
  ]);
}
const Vs = "retainpdf:soft-reader-close";
function Gs() {
  return new URL("./index.html", window.location.href).href;
}
function Ys() {
  if (typeof window > "u" || window.self === window.top) return !1;
  try {
    return window.parent.postMessage(
      { type: Vs },
      window.location.origin
    ), !0;
  } catch {
    return !1;
  }
}
function Zs(e, t, n) {
  if (n <= 1 || !e) return !1;
  try {
    const r = new URL(t), o = new URL(e, r);
    return o.origin === r.origin && !/reader\.html$/i.test(o.pathname) && !/detail\.html$/i.test(o.pathname);
  } catch {
    return !1;
  }
}
function Xs() {
  if (!(typeof window > "u") && !Ys()) {
    if (Zs(
      document.referrer,
      window.location.href,
      window.history.length
    )) {
      window.history.back();
      return;
    }
    window.location.assign(Gs());
  }
}
function Qs({ onBeforeClose: e } = {}) {
  return /* @__PURE__ */ z(
    "button",
    {
      id: "reader-close-home-btn",
      type: "button",
      className: "reader-close-home-btn",
      "aria-label": "返回主页",
      title: "返回主页",
      onClick: () => {
        e == null || e(), Xs();
      },
      children: [
        /* @__PURE__ */ p(Xe, { className: "reader-close-home-icon", size: 18, strokeWidth: 2.25, "aria-hidden": !0 }),
        /* @__PURE__ */ p("span", { className: "reader-close-home-label", children: "关闭" })
      ]
    }
  );
}
let Kn = !1;
function ei() {
  if (Kn)
    return;
  const e = ct().resolvePdfjsVendorUrl("build/pdf.worker.mjs");
  e && (Ar.GlobalWorkerOptions.workerSrc = e, Kn = !0);
}
const ti = {
  formula: "公式",
  table: "表格",
  figure: "图片",
  text: "文字",
  region: "区域"
};
function ni({
  pane: e,
  width: t,
  height: n,
  regions: r,
  onSelect: o
}) {
  const a = r.flatMap((s) => {
    if (!Pr(s.region)) return [];
    const l = kt(s, t, n);
    return l ? [{ highlight: s, rect: l }] : [];
  });
  return a.length ? /* @__PURE__ */ p("div", { className: "reader-structure-selection-layer", "aria-label": "PDF 结构选择层", children: a.map(({ highlight: s, rect: l }) => {
    const c = s.region, i = Rr(c), d = ti[i];
    return /* @__PURE__ */ z(
      "button",
      {
        type: "button",
        className: `reader-structure-selection-target is-${i}`,
        "data-reader-region-id": c.itemId,
        "data-reader-region-kind": i,
        style: l,
        "aria-label": `${d}区域，点击选择`,
        title: `${d} · 点击选择`,
        onClick: (u) => {
          u.stopPropagation();
          const f = u.currentTarget.getBoundingClientRect();
          o == null || o({
            selectionType: "region",
            region: c,
            kind: i,
            page: s.box.page,
            pane: e,
            rect: {
              left: f.left,
              top: f.top,
              width: f.width,
              height: f.height
            }
          });
        },
        children: [
          /* @__PURE__ */ p("span", { className: "reader-structure-selection-label", "aria-hidden": "true", children: d }),
          /* @__PURE__ */ p("span", { className: "sr-only", children: Ir(c, e) })
        ]
      },
      c.itemId
    );
  }) }) : null;
}
function ri(e, t, n) {
  return e.flatMap((r) => {
    if (Rr(r.region) !== "text") return [];
    const o = kt(r, t, n);
    return o ? [{ itemId: r.itemId, highlight: r, rect: o }] : [];
  });
}
function qn(e, t, n) {
  let r = null, o = Number.POSITIVE_INFINITY;
  for (const a of e) {
    const { rect: s } = a;
    if (t < s.left || t > s.left + s.width || n < s.top || n > s.top + s.height)
      continue;
    const l = s.width * s.height;
    l < o && (r = a, o = l);
  }
  return r;
}
function oi({ target: e }) {
  return e ? /* @__PURE__ */ p("div", { className: "reader-text-hover-layer", "aria-hidden": "true", children: /* @__PURE__ */ p(
    "div",
    {
      className: "reader-text-hover-frame",
      "data-reader-text-hover-id": e.itemId,
      style: e.rect,
      children: /* @__PURE__ */ p("span", { className: "reader-text-hover-label", children: "文字" })
    }
  ) }) : null;
}
function ai(e, t) {
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
function si(e, t, n, r) {
  if (!e || !t) return [];
  const o = [];
  for (const a of e.blocks) {
    const s = t.itemsById.get(a.item_id);
    if (!(s != null && s.translated_text)) continue;
    const l = kt(
      ai(e, a),
      n,
      r
    );
    l && o.push({
      itemId: a.item_id,
      translatedText: s.translated_text,
      status: s.status,
      kind: a.kind,
      sourceText: a.source_text,
      typography: a.typography,
      rect: l,
      changedAtSeq: t.changedAtSeqById.get(a.item_id) || 0,
      changedNow: t.changedAtSeqById.get(a.item_id) === t.lastEventSeq
    });
  }
  return o;
}
const ii = '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif', ci = 256, tt = /* @__PURE__ */ new Map();
function li(e) {
  return `${e || ""}`.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function di(e) {
  const t = `${e || ""}`, { text: n, slots: r } = xo(t, { bareLatex: !0 }), o = li(n), a = Lo(o, r);
  if (!r.length)
    return { fallbackHtml: a, richHtml: Promise.resolve(a), hasMath: !1 };
  let s = tt.get(t);
  if (!s && (s = Co(o, r), tt.set(t, s), tt.size > ci)) {
    const l = tt.keys().next().value;
    l !== void 0 && tt.delete(l);
  }
  return { fallbackHtml: a, richHtml: s, hasMath: !0 };
}
function $t(e) {
  return /title|heading|header|display_formula|equation/i.test(e);
}
function Ie(e) {
  const t = Number(e);
  return Number.isFinite(t) && t > 0 ? t : void 0;
}
function ui(e, t) {
  const n = e.typography, r = Ie(t) || 1, o = Ie(n == null ? void 0 : n.font_size_pt), a = Math.max(1, `${e.sourceText || ""}`.split(/\n+/).length), s = e.rect.height / Math.max(1.28, a * 1.18), l = $t(e.kind) ? 24 : /caption|footnote|table/i.test(e.kind) ? 9.5 : 11, c = Math.max(5.5 * r, Math.min(s, l * r)), i = Ie(n == null ? void 0 : n.fit_min_font_size_pt), d = Ie(n == null ? void 0 : n.fit_max_font_size_pt), u = Math.max(3.5, (i || 5.5) * r), f = Math.max(
    u,
    d ? d * r : o ? o * r : c
  ), m = o ? o * r : c, v = Ie(n == null ? void 0 : n.leading_em), h = [
    Ie(n == null ? void 0 : n.padding_top_pt) || 0,
    Ie(n == null ? void 0 : n.padding_right_pt) || 0,
    Ie(n == null ? void 0 : n.padding_bottom_pt) || 0,
    Ie(n == null ? void 0 : n.padding_left_pt) || 0
  ].map((g) => g * r);
  return {
    fontFamily: `${(n == null ? void 0 : n.font_family) || ""}`.trim() || ii,
    fontSizePx: Math.max(u, Math.min(f, m)),
    minFontSizePx: u,
    maxFontSizePx: f,
    // Typst leading is the additional inter-line gap, unlike CSS line-height.
    lineHeight: v ? 1 + v : 1.3,
    fontWeight: (n == null ? void 0 : n.font_weight) || ($t(e.kind) ? 600 : 400),
    textAlign: ["left", "center", "right", "justify"].includes(`${(n == null ? void 0 : n.text_align) || ""}`) ? n == null ? void 0 : n.text_align : $t(e.kind) ? "center" : "justify",
    padding: h,
    exact: !!o
  };
}
function fi(e, t, n, r) {
  const { minFontSizePx: o, maxFontSizePx: a } = r, s = /* @__PURE__ */ new Map(), l = (u) => {
    const f = s.get(u);
    if (f !== void 0) return f;
    const { width: m, height: v } = e(u), h = m <= t + 0.5 && v <= n + 0.5;
    return s.set(u, h), h;
  };
  let c = o, i = a, d = Math.min(r.requestedFontSizePx, i);
  if (l(d)) {
    if (!r.exact) {
      c = d;
      for (let u = 0; u < 6 && i > c; u += 1) {
        const f = (c + i) / 2;
        l(f) ? (d = f, c = f) : i = f;
      }
    }
  } else {
    i = d, d = c;
    for (let u = 0; u < 8 && i > c; u += 1) {
      const f = (c + i) / 2;
      l(f) ? (d = f, c = f) : i = f;
    }
  }
  return Math.max(o, d);
}
const mi = 512, nt = /* @__PURE__ */ new Map();
let Zt = 0;
typeof document < "u" && document.fonts && (document.fonts.ready.then(() => {
  Zt += 1;
}).catch(() => {
}), typeof document.fonts.addEventListener == "function" && document.fonts.addEventListener("loadingdone", () => {
  Zt += 1;
}));
function hi(e, t, n, r) {
  return [
    Zt,
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
function pi({ item: e, pageScale: t }) {
  const n = x(null), r = V(
    () => di(e.translatedText),
    [e.translatedText]
  ), [o, a] = C(r.fallbackHtml), s = V(
    () => ui(e, t),
    [e, t]
  );
  j(() => {
    let u = !0;
    return a(r.fallbackHtml), r.hasMath && r.richHtml.then((f) => {
      u && a(f);
    }), () => {
      u = !1;
    };
  }, [r]), Fe(() => {
    const u = n.current;
    if (!u) return;
    const [f, m, v, h] = s.padding, g = Math.max(1, e.rect.width - h - m), y = Math.max(1, e.rect.height - f - v), w = hi(o, g, y, s);
    let S = nt.get(w);
    if (S === void 0 && (S = fi(
      (b) => (u.style.fontSize = `${b}px`, { width: u.scrollWidth, height: u.scrollHeight }),
      g,
      y,
      {
        minFontSizePx: s.minFontSizePx,
        maxFontSizePx: s.maxFontSizePx,
        requestedFontSizePx: s.fontSizePx,
        exact: s.exact
      }
    ), nt.set(w, S), nt.size > mi)) {
      const b = nt.keys().next().value;
      b !== void 0 && nt.delete(b);
    }
    u.style.fontSize = `${S.toFixed(2)}px`;
  }, [o, e.rect.height, e.rect.width, s]);
  const [l, c, i, d] = s.padding;
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
        padding: `${l}px ${c}px ${i}px ${d}px`
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
function gi({
  layoutPage: e,
  pageState: t,
  width: n,
  height: r
}) {
  const o = V(
    () => si(e, t, n, r),
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
        pi,
        {
          item: a,
          pageScale: e != null && e.width ? n / e.width : 1
        },
        `${a.itemId}:${a.changedAtSeq}`
      ))
    }
  ) : null;
}
const bi = nn(gi), Hr = 1.414;
function yi({
  pageNumber: e,
  width: t,
  devicePixelRatio: n,
  pane: r,
  active: o = !1,
  syncedMinHeight: a = 0,
  onMetrics: s,
  cachedAspect: l,
  onAspectChange: c,
  sentinelRef: i,
  regionHighlight: d = null,
  regionTargets: u = [],
  onSelectRegion: f,
  liveTranslationLayout: m,
  liveTranslationPage: v,
  showLiveTranslation: h = r === "source"
}) {
  const g = x(l ?? Hr), [y, w] = C(g.current);
  j(() => {
    l != null && Math.abs(l - g.current) >= 1e-3 && (g.current = l, w(l));
  }, [l]);
  const S = x(i);
  S.current = i;
  const b = x((L) => {
    var $;
    ($ = S.current) == null || $.call(S, L);
  }).current, P = Math.max(120, Math.floor(t * y)), A = Math.max(P, Math.ceil(a || 0)), T = kt(d, t, P), F = V(
    () => ri(u, t, P),
    [P, u, t]
  ), [M, E] = C(null), I = V(
    () => F.find((L) => L.itemId === M) || null,
    [M, F]
  ), R = (L) => {
    if (L.buttons !== 0) {
      E(null);
      return;
    }
    const $ = L.currentTarget.getBoundingClientRect(), B = qn(
      F,
      L.clientX - $.left,
      L.clientY - $.top
    ), X = (B == null ? void 0 : B.itemId) || null;
    E((J) => J === X ? J : X);
  }, N = (L) => {
    var X, J, K;
    if (!f || (J = (X = L.target) == null ? void 0 : X.closest) != null && J.call(X, ".reader-structure-selection-target") || `${((K = window.getSelection()) == null ? void 0 : K.toString()) || ""}`.trim()) return;
    const $ = L.currentTarget.getBoundingClientRect(), B = qn(
      F,
      L.clientX - $.left,
      L.clientY - $.top
    );
    B && f({
      selectionType: "region",
      region: B.highlight.region,
      kind: "text",
      page: B.highlight.box.page,
      pane: r === "translated" ? "translated" : "source",
      rect: {
        left: $.left + B.rect.left,
        top: $.top + B.rect.top,
        width: B.rect.width,
        height: B.rect.height
      }
    });
  }, D = (L) => {
    !Number.isFinite(L) || L <= 0 || Math.abs(g.current - L) < 1e-3 || (g.current = L, w(L), c == null || c(e, L));
  };
  return /* @__PURE__ */ z(
    "div",
    {
      ref: b,
      [Ge]: e,
      [Ye]: r,
      [dn]: P,
      className: un,
      onPointerMoveCapture: R,
      onClick: N,
      onPointerLeave: () => E(null),
      style: {
        width: t,
        height: A,
        minHeight: A
      },
      children: [
        o ? /* @__PURE__ */ p(
          Go,
          {
            pageNumber: e,
            width: t,
            devicePixelRatio: n,
            renderTextLayer: !0,
            renderAnnotationLayer: !1,
            className: Lr,
            loading: /* @__PURE__ */ p(
              "div",
              {
                className: Tt,
                style: { width: t, height: P }
              }
            ),
            onLoadSuccess: (L) => {
              try {
                const $ = L.getViewport({ scale: 1 });
                if ($.width > 0) {
                  const B = $.height / $.width;
                  D(B);
                }
              } catch {
              }
              s == null || s();
            },
            onRenderSuccess: () => {
              s == null || s();
            }
          }
        ) : /* @__PURE__ */ p(
          "div",
          {
            className: Tt,
            style: { width: t, height: P },
            "aria-hidden": !0
          }
        ),
        T ? /* @__PURE__ */ p(
          "div",
          {
            className: "reader-react-pdf-region-highlight",
            "data-reader-region-id": d == null ? void 0 : d.itemId,
            style: T,
            "aria-hidden": "true"
          }
        ) : null,
        o && h ? /* @__PURE__ */ p(
          bi,
          {
            layoutPage: m,
            pageState: v,
            width: t,
            height: P
          }
        ) : null,
        /* @__PURE__ */ p(oi, { target: o ? I : null }),
        /* @__PURE__ */ p(
          ni,
          {
            pane: r === "translated" ? "translated" : "source",
            width: t,
            height: P,
            regions: u,
            onSelect: f
          }
        )
      ]
    }
  );
}
const vi = nn(yi), wi = 2 * 1024 * 1024;
function Si(e) {
  const t = new Ar.PDFDataRangeTransport(e.length, null);
  return t.requestDataRange = (n, r) => {
    e.fetchRange(n, r).then(
      (o) => t.onDataRange(n, o),
      () => {
        t.abort();
      }
    );
  }, t;
}
const jt = 5, Pi = "120% 0px", Ri = 120;
let Vn = 1;
const Gn = /* @__PURE__ */ new WeakMap();
function Ii(e) {
  if (!e) return 0;
  const t = Gn.get(e);
  if (t) return t;
  const n = Vn;
  return Vn += 1, Gn.set(e, n), n;
}
function Ti() {
  const e = typeof window < "u" && window.devicePixelRatio || 1;
  return Math.max(1, Math.min(e, 2));
}
const Ei = ho(
  function({
    pane: t,
    url: n = "",
    preloadedFile: r = null,
    userZoom: o = 1,
    visible: a = !0,
    emptyLabel: s = "暂无 PDF",
    scrollRoot: l = null,
    pageWidthOverride: c = null,
    rowHeights: i,
    onMetrics: d,
    onLoadSuccess: u,
    onLoadError: f,
    onNumPagesChange: m,
    activeRegion: v = null,
    regions: h = [],
    readerMetadata: g = null,
    onSelectRegion: y,
    liveTranslation: w,
    showLiveTranslation: S = t === "source",
    liveTranslationPendingLabel: b = "",
    paneAction: P
  }, A) {
    ei();
    const { file: T, loading: F, error: M } = ka(n, r), E = `${n}\0${Ii(T)}`, I = x(E);
    I.current = E;
    const R = V(() => {
      const _ = Ia(T);
      return _ ? "ranged" in _ ? { range: Si(_.ranged) } : _ : null;
    }, [T, n]), [N, D] = C(0), [L, $] = C(""), [B, X] = C(null), [J, K] = C(480), ne = x(null), ae = x(0), U = V(() => Ti(), []), O = V(() => ({
      cMapUrl: ct().resolvePdfjsVendorUrl("cmaps/"),
      cMapPacked: !0,
      standardFontDataUrl: ct().resolvePdfjsVendorUrl("standard_fonts/"),
      // 只对按段取的大文件起作用：要哪页取哪页，不在后台把整份取完（取完又是一整份在内存里）。
      rangeChunkSize: wi,
      disableAutoFetch: !0
    }), []);
    rn(A, () => B, [B]), j(() => {
      const _ = (H) => {
        !Number.isFinite(H) || H < 80 || Math.abs(H - ae.current) < 8 || (ae.current = H, K(H));
      }, Y = c && c >= 80 ? c : (l == null ? void 0 : l.clientWidth) || 0;
      if (_(Y), !l || typeof ResizeObserver > "u" || c && c >= 80) return;
      const W = new ResizeObserver((H) => {
        var ee, te;
        const se = ((te = (ee = H[0]) == null ? void 0 : ee.contentRect) == null ? void 0 : te.width) ?? l.clientWidth;
        !Number.isFinite(se) || se < 80 || (ne.current && clearTimeout(ne.current), ne.current = setTimeout(() => _(se), 80));
      });
      return W.observe(l), () => {
        W.disconnect(), ne.current && clearTimeout(ne.current);
      };
    }, [c, l, a]);
    const q = V(
      () => Za(J, o),
      [J, o]
    ), [re, le] = C(() => /* @__PURE__ */ new Map()), [ve, ge] = C(() => /* @__PURE__ */ new Set()), [we, je] = C(() => /* @__PURE__ */ new Set()), Q = x(/* @__PURE__ */ new Map()), G = x(null), oe = x(/* @__PURE__ */ new Map()), Se = k((_, Y) => {
      le((W) => {
        if (W.get(_) === Y) return W;
        const H = new Map(W);
        return H.set(_, Y), H;
      });
    }, []), me = k((_, Y) => {
      const W = Q.current, H = W.get(_);
      if (H && G.current)
        try {
          G.current.unobserve(H);
        } catch {
        }
      if (Y) {
        if (W.set(_, Y), G.current)
          try {
            G.current.observe(Y);
          } catch {
          }
      } else
        W.delete(_);
    }, []), Le = x(/* @__PURE__ */ new Map()), gt = k((_) => {
      const Y = Le.current;
      let W = Y.get(_);
      return W || (W = (H) => me(_, H), Y.set(_, W)), W;
    }, [me]);
    j(() => {
      if (typeof IntersectionObserver > "u") return;
      const _ = oe.current, Y = new IntersectionObserver(
        (W) => {
          const H = [], se = [];
          for (const ee of W) {
            const te = ee.target, de = Lt(te);
            Number.isFinite(de) && (ee.isIntersecting ? H : se).push(de);
          }
          if ((H.length || se.length) && ge((ee) => {
            let te = null;
            for (const de of H)
              ee.has(de) || (te = te || new Set(ee), te.add(de));
            for (const de of se)
              ee.has(de) && (te = te || new Set(ee), te.delete(de));
            return te || ee;
          }), H.length) {
            for (const ee of H) {
              const te = _.get(ee);
              te && (clearTimeout(te), _.delete(ee));
            }
            je((ee) => {
              let te = null;
              for (const de of H)
                ee.has(de) || (te = te || new Set(ee), te.add(de));
              return te || ee;
            });
          }
          for (const ee of se)
            _.has(ee) || _.set(ee, setTimeout(() => {
              _.delete(ee), je((te) => {
                if (!te.has(ee)) return te;
                const de = new Set(te);
                return de.delete(ee), de;
              });
            }, Ri));
        },
        { root: l, rootMargin: Pi, threshold: 0 }
      );
      G.current = Y;
      for (const W of Q.current.values())
        try {
          Y.observe(W);
        } catch {
        }
      return () => {
        Y.disconnect(), G.current === Y && (G.current = null);
        for (const W of _.values()) clearTimeout(W);
        _.clear();
      };
    }, [l]), Fe(() => {
      D(0), $(""), ge(/* @__PURE__ */ new Set()), je(/* @__PURE__ */ new Set()), le(/* @__PURE__ */ new Map()), Q.current.clear();
      const _ = oe.current;
      for (const Y of _.values()) clearTimeout(Y);
      _.clear(), m == null || m(0, t);
    }, [E, m, t]);
    const zt = k(
      ({ numPages: _ }) => {
        I.current === E && (D(_), $(""), m == null || m(_, t), u == null || u({ numPages: _, pane: t }));
      },
      [E, u, m, t]
    ), bt = k(
      (_) => {
        if (I.current !== E) return;
        const Y = (_ == null ? void 0 : _.message) || "PDF 解析失败";
        $(Y), D(0), m == null || m(0, t), f == null || f(_, t);
      },
      [E, f, m, t]
    ), Pe = V(
      () => N > 0 ? Array.from({ length: N }, (_, Y) => Y + 1) : [],
      [N]
    );
    j(() => {
      typeof IntersectionObserver < "u" || je(new Set(Pe));
    }, [Pe]);
    const Me = V(
      () => zn(v, g, t),
      [v, g, t]
    ), Ue = V(() => {
      const _ = /* @__PURE__ */ new Map();
      for (const Y of h) {
        const W = zn(Y, g, t);
        if (!W) continue;
        const H = _.get(W.box.page) || [];
        H.push(W), _.set(W.box.page, H);
      }
      return _;
    }, [t, g, h]), yt = V(() => {
      if (N === 0) return /* @__PURE__ */ new Set();
      if (!(!!l && typeof IntersectionObserver < "u" && a)) return new Set(Pe);
      if (ve.size === 0) {
        const W = Math.min(N, jt * 2 + 1);
        return new Set(Array.from({ length: W }, (H, se) => se + 1));
      }
      const Y = /* @__PURE__ */ new Set();
      for (const W of ve)
        for (let H = -jt; H <= jt; H++) {
          const se = W + H;
          se >= 1 && se <= N && Y.add(se);
        }
      return Y;
    }, [N, Pe, l, a, ve]), fo = !n || !!M || !!L, mo = n && (M || L) || s;
    return /* @__PURE__ */ z(
      "section",
      {
        ref: X,
        className: `reader-panel ${Wa}${a ? "" : " is-hidden"}`,
        [Ye]: t,
        "data-reader-engine": "react-pdf",
        "data-reader-visible": a ? "true" : "false",
        "data-live-translation-status": (w == null ? void 0 : w.jobStatus) || void 0,
        "aria-hidden": a ? void 0 : !0,
        "aria-label": t === "source" ? "原文 PDF" : "译文 PDF",
        children: [
          P ? /* @__PURE__ */ p("div", { className: "reader-react-pdf-pane-action", children: P }) : null,
          b ? /* @__PURE__ */ z("div", { className: "reader-live-translation-waiting", role: "status", children: [
            /* @__PURE__ */ p("span", { className: "reader-live-translation-waiting-dot", "aria-hidden": "true" }),
            /* @__PURE__ */ p("span", { children: b })
          ] }) : null,
          fo && !F ? /* @__PURE__ */ p("div", { className: "reader-empty reader-react-pdf-empty", "data-reader-pdf-empty": t, children: mo }) : null,
          F ? /* @__PURE__ */ p("div", { className: "reader-empty reader-react-pdf-loading", "data-reader-pdf-loading": t, children: "正在加载 PDF…" }) : null,
          R && !M ? /* @__PURE__ */ p("div", { className: "reader-viewer-wrap reader-react-pdf-wrap", children: /* @__PURE__ */ p(
            Yo,
            {
              file: R,
              loading: null,
              error: null,
              options: O,
              onLoadSuccess: zt,
              onLoadError: bt,
              className: "reader-react-pdf-document",
              children: Pe.map((_) => {
                if (yt.has(_))
                  return /* @__PURE__ */ p(
                    vi,
                    {
                      pane: t,
                      pageNumber: _,
                      width: q,
                      devicePixelRatio: U,
                      active: we.has(_),
                      syncedMinHeight: (i == null ? void 0 : i.get(_)) || 0,
                      onMetrics: d,
                      cachedAspect: re.get(_),
                      onAspectChange: Se,
                      sentinelRef: gt(_),
                      regionHighlight: (Me == null ? void 0 : Me.box.page) === _ ? Me : null,
                      regionTargets: Ue.get(_),
                      onSelectRegion: y,
                      liveTranslationLayout: w == null ? void 0 : w.layoutByPage.get(_ - 1),
                      liveTranslationPage: w == null ? void 0 : w.pagesByPage.get(_ - 1),
                      showLiveTranslation: S
                    },
                    `${t}-${_}`
                  );
                const W = re.get(_) ?? Hr, H = Math.max(120, Math.floor(q * W)), se = Math.max(H, Math.ceil((i == null ? void 0 : i.get(_)) || 0));
                return /* @__PURE__ */ p(
                  "div",
                  {
                    ref: gt(_),
                    [Ge]: _,
                    [Ye]: t,
                    [dn]: H,
                    className: un,
                    style: {
                      width: q,
                      height: se,
                      minHeight: se
                    },
                    children: /* @__PURE__ */ p(
                      "div",
                      {
                        className: Tt,
                        style: { width: q, height: H },
                        "aria-hidden": !0
                      }
                    )
                  },
                  `${t}-${_}`
                );
              })
            },
            E
          ) }) : null
        ]
      }
    );
  }
), Yn = nn(Ei), Wr = on(null), Jr = on(null);
function Mi({ value: e, hud: t, children: n }) {
  return /* @__PURE__ */ p(Wr.Provider, { value: e, children: /* @__PURE__ */ p(Jr.Provider, { value: t, children: n }) });
}
function pt() {
  return an(Wr);
}
function Ni() {
  return an(Jr);
}
function Ai({
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
function ki(e, t, n = e * 2) {
  return t ? Math.min(e * 2, n) : e;
}
function xi(e) {
  return e ? e.connection === "terminal" && e.jobStatus === "failed" ? e.pagesByPage.size > 0 ? `翻译已暂停，已保留 ${e.pagesByPage.size} 页译文` : "翻译已暂停，原始 PDF 仍可阅读" : e.connection === "terminal" && ["cancelled", "canceled"].includes(e.jobStatus) ? e.pagesByPage.size > 0 ? `翻译已取消，已保留 ${e.pagesByPage.size} 页译文` : "翻译已取消，原始 PDF 仍可阅读" : e.pagesByPage.size > 0 ? "" : e.connection === "unavailable" ? e.error || "实时译文暂不可用，原始 PDF 仍可阅读" : e.error ? e.error : e.layoutByPage.size === 0 ? "正在完成 OCR，译文将在这里逐页出现" : "版面已就绪，正在等待首个译文页面" : "";
}
function Li(e) {
  const t = pt(), {
    markdownSplit: n = !1,
    assistantSplit: r = !1,
    liveTranslation: o,
    paneComposition: a
  } = e, s = (a == null ? void 0 : a.visibleMode) ?? e.mode ?? "compare", l = (a == null ? void 0 : a.compareMode) ?? e.compareMode ?? s === "compare", c = (a == null ? void 0 : a.showSource) ?? e.showSource ?? !0, i = (a == null ? void 0 : a.showTranslated) ?? e.showTranslated ?? (s === "compare" || s === "translated"), d = (a == null ? void 0 : a.overlayOnSource) ?? e.overlayOnSource ?? !1, u = e.bindShell ?? (t == null ? void 0 : t.bindShell), f = e.shellEl ?? (t == null ? void 0 : t.shellEl) ?? null, m = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? ht, v = e.shellWidth ?? (t == null ? void 0 : t.shellWidth) ?? 0, h = e.rowHeights ?? (t == null ? void 0 : t.rowHeights), g = e.mountSource ?? (t == null ? void 0 : t.mountSource) ?? !1, y = e.mountTranslated ?? (t == null ? void 0 : t.mountTranslated) ?? !1, w = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, S = e.sourceUrl ?? (t == null ? void 0 : t.sourceUrl) ?? "", b = e.translatedUrl ?? (t == null ? void 0 : t.translatedUrl) ?? "", P = e.sourceFile ?? (t == null ? void 0 : t.sourceFile) ?? null, A = e.translatedFile ?? (t == null ? void 0 : t.translatedFile) ?? null, T = e.onMetrics ?? (t == null ? void 0 : t.onMetrics), F = e.onNumPagesChange ?? (t == null ? void 0 : t.onNumPagesChange), M = e.activeRegion ?? (t == null ? void 0 : t.activeRegion), E = e.regions ?? (t == null ? void 0 : t.regions) ?? [], I = e.readerMetadata ?? (t == null ? void 0 : t.readerMetadata), R = e.onSelectRegion ?? (t == null ? void 0 : t.onSelectRegion), N = Ai({
    mode: s,
    compareMode: l,
    showSource: c,
    showTranslated: i,
    markdownSplit: n,
    overlayOnSource: d
  }), D = ki(
    v,
    n || r,
    typeof document > "u" ? v * 2 : document.documentElement.clientWidth
  );
  return /* @__PURE__ */ p(
    "div",
    {
      ref: u,
      className: Ha,
      "data-reader-region-count": E.length,
      "data-reader-structured-region-count": E.filter(Pr).length,
      "data-reader-metadata-ready": I ? "true" : "false",
      children: /* @__PURE__ */ z(
        "main",
        {
          className: `${Ba} reader-mode-${N.mode}`,
          "data-reader-mode": n ? "markdown-split" : r ? "assistant-split" : s,
          children: [
            g ? /* @__PURE__ */ p(
              Yn,
              {
                pane: "source",
                url: S,
                preloadedFile: P,
                userZoom: m,
                visible: N.showSource,
                scrollRoot: f,
                pageWidthOverride: D,
                rowHeights: N.compareMode ? h : void 0,
                onMetrics: T,
                emptyLabel: w ? "源文件不可用：该文档没有可读取的源 PDF。" : "暂无原文 PDF",
                onNumPagesChange: F,
                activeRegion: M,
                regions: E,
                readerMetadata: I,
                onSelectRegion: R,
                liveTranslation: d ? o : void 0,
                showLiveTranslation: d,
                liveTranslationPendingLabel: d ? xi(o) : "",
                paneAction: d ? /* @__PURE__ */ z(At, { children: [
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
              }
            ) : null,
            y ? /* @__PURE__ */ p(
              Yn,
              {
                pane: "translated",
                url: b,
                preloadedFile: A,
                userZoom: m,
                visible: N.showTranslated,
                scrollRoot: f,
                pageWidthOverride: D,
                rowHeights: N.compareMode ? h : void 0,
                onMetrics: T,
                emptyLabel: "暂无译文 PDF",
                onNumPagesChange: F,
                activeRegion: M,
                regions: E,
                readerMetadata: I,
                onSelectRegion: R,
                liveTranslation: void 0,
                showLiveTranslation: !1
              }
            ) : null
          ]
        }
      )
    }
  );
}
const Ci = [
  { id: "source", label: "源文件", Icon: Tr },
  { id: "compare", label: "对照", Icon: Er },
  { id: "translated", label: "翻译文件", Icon: Mr }
];
function zi(e) {
  return e.connection === "live" ? `实时译文 · ${e.pagesByPage.size} 页` : e.connection === "reconnecting" ? "实时译文 · 重连中" : e.connection === "unavailable" ? "实时译文 · 不可用" : e.connection === "terminal" ? e.jobStatus === "failed" ? "实时译文 · 已暂停" : e.jobStatus === "cancelled" || e.jobStatus === "canceled" ? "实时译文 · 已取消" : e.jobStatus === "succeeded" ? "实时译文 · 已完成" : "实时译文 · 已结束" : e.error || "实时译文 · 连接中";
}
function Di(e) {
  return e.id === "translated" ? e.sourceViewOnly : e.id === "compare" ? !e.documentReady || e.sourceViewOnly && !e.liveTranslationAvailable : !1;
}
function _i(e) {
  const t = pt(), {
    mode: n,
    documentReady: r,
    onModeChange: o,
    liveTranslation: a = null
  } = e, s = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, l = a ? zi(a.state) : "";
  return /* @__PURE__ */ z("header", { className: "reader-workspace-bar", children: [
    a ? /* @__PURE__ */ z(
      "button",
      {
        type: "button",
        className: `reader-live-translation-toggle is-${a.state.connection}${a.visible ? " is-active" : ""}`,
        "aria-pressed": a.visible,
        "aria-label": a.visible ? "隐藏实时译文" : "显示实时译文",
        title: a.state.error || l,
        onClick: a.onToggle,
        children: [
          /* @__PURE__ */ p(Oo, { size: 14, strokeWidth: 2.2, "aria-hidden": !0 }),
          /* @__PURE__ */ p("span", { className: "reader-live-translation-toggle-label", children: l })
        ]
      }
    ) : null,
    /* @__PURE__ */ p("div", { className: "reader-workspace-tabs", role: "tablist", "aria-label": "阅读工作区", children: Ci.map(({ id: c, label: i, Icon: d }) => {
      const u = n === c, f = Di({
        id: c,
        documentReady: r,
        sourceViewOnly: s,
        liveTranslationAvailable: !!a
      });
      return /* @__PURE__ */ z(
        "button",
        {
          type: "button",
          className: `reader-workspace-tab${u ? " is-active" : ""}`,
          role: "tab",
          "aria-selected": u,
          "aria-label": i,
          title: f ? `${i} 需要文档任务` : i,
          disabled: f,
          onClick: () => o(c),
          children: [
            /* @__PURE__ */ p(d, { size: 15, strokeWidth: 2.2, "aria-hidden": !0 }),
            /* @__PURE__ */ p("span", { className: "reader-workspace-tab-label", children: i })
          ]
        },
        c
      );
    }) })
  ] });
}
const Zn = [
  { id: "markdown", label: "Markdown", Icon: Nr }
];
function Fi(e) {
  const t = pt(), { active: n } = e, r = e.onSelect ?? (t == null ? void 0 : t.assistant.select) ?? (() => {
  }), o = e.onClose ?? (t == null ? void 0 : t.assistant.close) ?? (() => {
  });
  return n ? /* @__PURE__ */ z("header", { className: "reader-assistant-dock-header", children: [
    /* @__PURE__ */ p("div", { className: "reader-assistant-dock-tabs", role: "tablist", "aria-label": "阅读辅助面板", children: Zn.map(({ id: a, label: s, Icon: l }) => {
      const c = n === a;
      return /* @__PURE__ */ z(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": c,
          className: `reader-assistant-dock-tab${c ? " is-active" : ""}`,
          onClick: () => r(a),
          children: [
            /* @__PURE__ */ p(l, { size: 15, strokeWidth: 2.15, "aria-hidden": !0 }),
            /* @__PURE__ */ p("span", { children: s })
          ]
        },
        a
      );
    }) }),
    /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: "reader-assistant-dock-close",
        "aria-label": "关闭阅读辅助面板",
        title: "关闭辅助面板",
        onClick: o,
        children: /* @__PURE__ */ p(Xe, { size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
      }
    )
  ] }) : /* @__PURE__ */ p("nav", { className: "reader-assistant-rail", "aria-label": "阅读辅助工具", children: Zn.map(({ id: a, label: s, Icon: l }) => /* @__PURE__ */ z(
    "button",
    {
      type: "button",
      className: "reader-assistant-rail-button",
      "aria-label": `打开${s}`,
      title: s,
      onClick: () => r(a),
      children: [
        /* @__PURE__ */ p(l, { size: 18, strokeWidth: 2, "aria-hidden": !0 }),
        /* @__PURE__ */ p("span", { children: "MD" })
      ]
    },
    a
  )) });
}
function Oi(e, t) {
  const n = getComputedStyle(e), r = parseFloat(n.fontSize);
  return t * r;
}
function $i(e, t) {
  const n = getComputedStyle(e.ownerDocument.documentElement), r = parseFloat(n.fontSize);
  return t * r;
}
function ji(e) {
  return e / 100 * window.innerHeight;
}
function Ui(e) {
  return e / 100 * window.innerWidth;
}
function Bi(e) {
  switch (typeof e) {
    case "number":
      return [e, "px"];
    case "string": {
      const t = parseFloat(e);
      return e.endsWith("%") ? [t, "%"] : e.endsWith("px") ? [t, "px"] : e.endsWith("rem") ? [t, "rem"] : e.endsWith("em") ? [t, "em"] : e.endsWith("vh") ? [t, "vh"] : e.endsWith("vw") ? [t, "vw"] : [t, "%"];
    }
  }
}
function rt({
  groupSize: e,
  panelElement: t,
  styleProp: n
}) {
  let r;
  const [o, a] = Bi(n);
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
      r = $i(t, o);
      break;
    }
    case "em": {
      r = Oi(t, o);
      break;
    }
    case "vh": {
      r = ji(o);
      break;
    }
    case "vw": {
      r = Ui(o);
      break;
    }
  }
  return r;
}
function ce(e) {
  return parseFloat(e.toFixed(3));
}
function Ze({
  group: e
}) {
  const { orientation: t, panels: n } = e;
  return n.reduce((r, o) => (r += t === "horizontal" ? o.element.offsetWidth : o.element.offsetHeight, r), 0);
}
function Xt(e) {
  const { panels: t } = e, n = Ze({ group: e });
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
      const d = rt({
        groupSize: n,
        panelElement: o,
        styleProp: a.collapsedSize
      });
      s = ce(d / n * 100);
    }
    let l;
    if (a.defaultSize !== void 0) {
      const d = rt({
        groupSize: n,
        panelElement: o,
        styleProp: a.defaultSize
      });
      l = ce(d / n * 100);
    }
    let c = 0;
    if (a.minSize !== void 0) {
      const d = rt({
        groupSize: n,
        panelElement: o,
        styleProp: a.minSize
      });
      c = ce(d / n * 100);
    }
    let i = 100;
    if (a.maxSize !== void 0) {
      const d = rt({
        groupSize: n,
        panelElement: o,
        styleProp: a.maxSize
      });
      i = ce(d / n * 100);
    }
    return {
      groupResizeBehavior: a.groupResizeBehavior,
      collapsedSize: s,
      collapsible: a.collapsible === !0,
      defaultSize: l,
      disabled: a.disabled,
      minSize: c,
      maxSize: i,
      panelId: r.id
    };
  });
}
function Z(e, t = "Assertion error") {
  if (!e)
    throw Error(t);
}
function Qt(e, t) {
  return Array.from(t).sort(
    e === "horizontal" ? Hi : Wi
  );
}
function Hi(e, t) {
  const n = e.element.offsetLeft - t.element.offsetLeft;
  return n !== 0 ? n : e.element.offsetWidth - t.element.offsetWidth;
}
function Wi(e, t) {
  const n = e.element.offsetTop - t.element.offsetTop;
  return n !== 0 ? n : e.element.offsetHeight - t.element.offsetHeight;
}
function Kr(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.ELEMENT_NODE;
}
function qr(e, t) {
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
function Ji({
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
    const { x: l, y: c } = qr(r, s), i = e === "horizontal" ? l : c;
    i < a && (a = i, o = s);
  }
  return Z(o, "No rect found"), o;
}
let St;
function Ki() {
  return St === void 0 && (typeof matchMedia == "function" ? St = !!matchMedia("(pointer:coarse)").matches : St = !1), St;
}
function Vr(e) {
  const { element: t, orientation: n, panels: r, separators: o } = e, a = Qt(
    n,
    Array.from(t.children).filter(Kr).map((v) => ({ element: v }))
  ).map(({ element: v }) => v), s = [];
  let l = !1, c = !1, i = -1, d = -1, u = 0, f, m = [];
  {
    let v = -1;
    for (const h of a)
      h.hasAttribute("data-panel") && (v++, h.hasAttribute("data-disabled") || (u++, i === -1 && (i = v), d = v));
  }
  if (u > 1) {
    let v = -1;
    for (const h of a)
      if (h.hasAttribute("data-panel")) {
        v++;
        const g = r.find(
          (y) => y.element === h
        );
        if (g) {
          if (f) {
            const y = f.element.getBoundingClientRect(), w = h.getBoundingClientRect();
            let S;
            if (c) {
              const b = n === "horizontal" ? new DOMRect(
                y.right,
                y.top,
                0,
                y.height
              ) : new DOMRect(
                y.left,
                y.bottom,
                y.width,
                0
              ), P = n === "horizontal" ? new DOMRect(w.left, w.top, 0, w.height) : new DOMRect(w.left, w.top, w.width, 0);
              switch (m.length) {
                case 0: {
                  S = [
                    b,
                    P
                  ];
                  break;
                }
                case 1: {
                  const A = m[0], T = Ji({
                    orientation: n,
                    rects: [y, w],
                    targetRect: A.element.getBoundingClientRect()
                  });
                  S = [
                    A,
                    T === y ? P : b
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
                  y.right,
                  w.top,
                  w.left - y.right,
                  w.height
                ) : new DOMRect(
                  w.left,
                  y.bottom,
                  w.width,
                  w.top - y.bottom
                )
              ];
            for (const b of S) {
              let P = "width" in b ? b : b.element.getBoundingClientRect();
              const A = Ki() ? e.resizeTargetMinimumSize.coarse : e.resizeTargetMinimumSize.fine;
              if (P.width < A) {
                const F = A - P.width;
                P = new DOMRect(
                  P.x - F / 2,
                  P.y,
                  P.width + F,
                  P.height
                );
              }
              if (P.height < A) {
                const F = A - P.height;
                P = new DOMRect(
                  P.x,
                  P.y - F / 2,
                  P.width,
                  P.height + F
                );
              }
              const T = v <= i || v > d;
              !l && !T && s.push({
                group: e,
                groupSize: Ze({ group: e }),
                panels: [f, g],
                separator: "width" in b ? void 0 : b,
                rect: P
              }), l = !1;
            }
          }
          c = !1, f = g, m = [];
        }
      } else if (h.hasAttribute("data-separator")) {
        h.ariaDisabled !== null && (l = !0);
        const g = o.find(
          (y) => y.element === h
        );
        g ? m.push(g) : (f = void 0, m = []);
      } else
        c = !0;
  }
  return s;
}
var ke;
class Gr {
  constructor() {
    xn(this, ke, {});
  }
  addListener(t, n) {
    const r = Qe(this, ke)[t];
    return r === void 0 ? Qe(this, ke)[t] = [n] : r.includes(n) || r.push(n), () => {
      this.removeListener(t, n);
    };
  }
  emit(t, n) {
    const r = Qe(this, ke)[t];
    if (r !== void 0)
      if (r.length === 1)
        r[0].call(null, n);
      else {
        let o = !1, a = null;
        const s = Array.from(r);
        for (let l = 0; l < s.length; l++) {
          const c = s[l];
          try {
            c.call(null, n);
          } catch (i) {
            a === null && (o = !0, a = i);
          }
        }
        if (o)
          throw a;
      }
  }
  removeAllListeners() {
    Ln(this, ke, {});
  }
  removeListener(t, n) {
    const r = Qe(this, ke)[t];
    if (r !== void 0) {
      const o = r.indexOf(n);
      o >= 0 && r.splice(o, 1);
    }
  }
}
ke = new WeakMap();
let qe = {
  cursorFlags: 0,
  state: "inactive"
};
const pn = new Gr();
function ze() {
  return qe;
}
function qi(e) {
  return pn.addListener("change", e);
}
function Vi(e) {
  const t = qe, n = { ...qe };
  n.cursorFlags = e, qe = n, pn.emit("change", {
    prev: t,
    next: n
  });
}
function Ve(e) {
  const t = qe;
  qe = e, pn.emit("change", {
    prev: t,
    next: e
  });
}
const Gi = (e) => e, Ut = () => {
}, Yr = 1, Zr = 2, Xr = 4, Qr = 8, Xn = 3, Qn = 12;
let Pt;
function er() {
  return Pt === void 0 && (Pt = !1, typeof window < "u" && (window.navigator.userAgent.includes("Chrome") || window.navigator.userAgent.includes("Firefox")) && (Pt = !0)), Pt;
}
function Yi({
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
        if (e && er()) {
          const a = (e & Yr) !== 0, s = (e & Zr) !== 0, l = (e & Xr) !== 0, c = (e & Qr) !== 0;
          if (a)
            return l ? "se-resize" : c ? "ne-resize" : "e-resize";
          if (s)
            return l ? "sw-resize" : c ? "nw-resize" : "w-resize";
          if (l)
            return "s-resize";
          if (c)
            return "n-resize";
        }
        break;
      }
    }
    return er() ? r > 0 && o > 0 ? "move" : r > 0 ? "ew-resize" : "ns-resize" : r > 0 && o > 0 ? "grab" : r > 0 ? "col-resize" : "row-resize";
  }
}
const tr = /* @__PURE__ */ new WeakMap();
function gn(e) {
  if (e.defaultView === null || e.defaultView === void 0)
    return;
  let { prevStyle: t, styleSheet: n } = tr.get(e) ?? {};
  n === void 0 && (n = new e.defaultView.CSSStyleSheet(), e.adoptedStyleSheets && (Object.isExtensible(e.adoptedStyleSheets) ? e.adoptedStyleSheets.push(n) : e.adoptedStyleSheets = [
    ...e.adoptedStyleSheets,
    n
  ]));
  const r = ze();
  switch (r.state) {
    case "active":
    case "hover": {
      const o = Yi({
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
  tr.set(e, {
    prevStyle: t,
    styleSheet: n
  });
}
let ye = /* @__PURE__ */ new Map();
const eo = new Gr();
function Zi(e) {
  ye = new Map(ye), ye.delete(e);
}
function nr(e, t) {
  for (const [n] of ye)
    if (n.id === e)
      return n;
}
function xe(e, t) {
  for (const [n, r] of ye)
    if (n.id === e)
      return r;
  if (t)
    throw Error(`Could not find data for Group with id ${e}`);
}
function Oe() {
  return ye;
}
function bn(e, t) {
  return eo.addListener("groupChange", (n) => {
    n.group.id === e && t(n);
  });
}
function Ee(e, t, n) {
  const r = ye.get(e);
  ye = new Map(ye), ye.set(e, t), eo.emit("groupChange", {
    group: e,
    isUserInteraction: (n == null ? void 0 : n.isUserInteraction) === !0,
    prev: r,
    next: t
  });
}
function to(e) {
  const t = ze();
  let n = !1;
  switch (t.state) {
    case "active":
      Ve({
        cursorFlags: 0,
        state: "inactive"
      }), t.hitRegions.length > 0 && (gn(e), n = !0, t.hitRegions.forEach((r) => {
        const o = xe(r.group.id, !0);
        Ee(r.group, o, {
          isUserInteraction: !0
        });
      }));
  }
  return n;
}
function rr(e) {
  e.defaultPrevented || to(e.currentTarget);
}
function Xi(e, t, n) {
  let r, o = {
    x: 1 / 0,
    y: 1 / 0
  };
  for (const a of t) {
    const s = qr(n, a.rect);
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
function Qi(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}
function ec(e, t) {
  if (e === t) throw new Error("Cannot compare node with itself");
  const n = {
    a: sr(e),
    b: sr(t)
  };
  let r;
  for (; n.a.at(-1) === n.b.at(-1); )
    r = n.a.pop(), n.b.pop();
  Z(
    r,
    "Stacking order can only be calculated for elements with a common ancestor"
  );
  const o = {
    a: ar(or(n.a)),
    b: ar(or(n.b))
  };
  if (o.a === o.b) {
    const a = r.childNodes, s = {
      a: n.a.at(-1),
      b: n.b.at(-1)
    };
    let l = a.length;
    for (; l--; ) {
      const c = a[l];
      if (c === s.a) return 1;
      if (c === s.b) return -1;
    }
  }
  return Math.sign(o.a - o.b);
}
const tc = /\b(?:position|zIndex|opacity|transform|webkitTransform|mixBlendMode|filter|webkitFilter|isolation)\b/;
function nc(e) {
  const t = getComputedStyle(no(e) ?? e).display;
  return t === "flex" || t === "inline-flex";
}
function rc(e) {
  const t = getComputedStyle(e);
  return !!(t.position === "fixed" || t.zIndex !== "auto" && (t.position !== "static" || nc(e)) || +t.opacity < 1 || "transform" in t && t.transform !== "none" || "webkitTransform" in t && t.webkitTransform !== "none" || "mixBlendMode" in t && t.mixBlendMode !== "normal" || "filter" in t && t.filter !== "none" || "webkitFilter" in t && t.webkitFilter !== "none" || "isolation" in t && t.isolation === "isolate" || tc.test(t.willChange) || t.webkitOverflowScrolling === "touch");
}
function or(e) {
  let t = e.length;
  for (; t--; ) {
    const n = e[t];
    if (Z(n, "Missing node"), rc(n)) return n;
  }
  return null;
}
function ar(e) {
  return e && Number(getComputedStyle(e).zIndex) || 0;
}
function sr(e) {
  const t = [];
  for (; e; )
    t.push(e), e = no(e);
  return t;
}
function no(e) {
  const { parentNode: t } = e;
  return Qi(t) ? t.host : t;
}
function oc(e, t) {
  return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function ac({
  groupElement: e,
  hitRegion: t,
  pointerEventTarget: n
}) {
  if (!Kr(n) || n.contains(e) || e.contains(n))
    return !0;
  if (ec(n, e) > 0) {
    let r = n;
    for (; r; ) {
      if (r.contains(e))
        return !0;
      if (oc(r.getBoundingClientRect(), t))
        return !1;
      r = r.parentElement;
    }
  }
  return !0;
}
function yn(e, t) {
  const n = [];
  return t.forEach((r, o) => {
    if (o.disabled)
      return;
    const a = Vr(o), s = Xi(o.orientation, a, {
      x: e.clientX,
      y: e.clientY
    });
    s && s.distance.x <= 0 && s.distance.y <= 0 && ac({
      groupElement: o.element,
      hitRegion: s.hitRegion.rect,
      pointerEventTarget: e.target
    }) && n.push(s.hitRegion);
  }), n;
}
function sc(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] != t[n])
      return !1;
  return !0;
}
function ie(e, t, n = 0) {
  return Math.abs(ce(e) - ce(t)) <= n;
}
function be(e, t) {
  return ie(e, t) ? 0 : e > t ? 1 : -1;
}
function Je({
  overrideDisabledPanels: e,
  panelConstraints: t,
  prevSize: n,
  size: r
}) {
  const {
    collapsedSize: o = 0,
    collapsible: a,
    disabled: s,
    maxSize: l = 100,
    minSize: c = 0
  } = t;
  if (s && !e)
    return n;
  if (be(r, c) < 0)
    if (a) {
      const i = (o + c) / 2;
      be(r, i) < 0 ? r = o : r = c;
    } else
      r = c;
  return r = Math.min(l, r), r = ce(r), r;
}
function ut({
  delta: e,
  initialLayout: t,
  panelConstraints: n,
  pivotIndices: r,
  prevLayout: o,
  trigger: a
}) {
  if (ie(e, 0))
    return t;
  const s = a === "imperative-api", l = Object.values(t), c = Object.values(o), i = [...l], [d, u] = r;
  Z(d != null, "Invalid first pivot index"), Z(u != null, "Invalid second pivot index");
  let f = 0;
  switch (a) {
    case "keyboard": {
      {
        const h = e < 0 ? u : d, g = n[h];
        Z(
          g,
          `Panel constraints not found for index ${h}`
        );
        const {
          collapsedSize: y = 0,
          collapsible: w,
          minSize: S = 0
        } = g;
        if (w) {
          const b = l[h];
          if (Z(
            b != null,
            `Previous layout not found for panel index ${h}`
          ), ie(b, y)) {
            const P = S - b;
            be(P, Math.abs(e)) > 0 && (e = e < 0 ? 0 - P : P);
          }
        }
      }
      {
        const h = e < 0 ? d : u, g = n[h];
        Z(
          g,
          `No panel constraints found for index ${h}`
        );
        const {
          collapsedSize: y = 0,
          collapsible: w,
          minSize: S = 0
        } = g;
        if (w) {
          const b = l[h];
          if (Z(
            b != null,
            `Previous layout not found for panel index ${h}`
          ), ie(b, S)) {
            const P = b - y;
            be(P, Math.abs(e)) > 0 && (e = e < 0 ? 0 - P : P);
          }
        }
      }
      break;
    }
    default: {
      const h = e < 0 ? u : d, g = n[h];
      Z(
        g,
        `Panel constraints not found for index ${h}`
      );
      const y = l[h], { collapsible: w, collapsedSize: S, minSize: b } = g;
      if (w && be(y, b) < 0)
        if (e > 0) {
          const P = b - S, A = P / 2, T = y + e;
          be(T, b) < 0 && (e = be(e, A) <= 0 ? 0 : P);
        } else {
          const P = b - S, A = 100 - P / 2, T = y - e;
          be(T, b) < 0 && (e = be(100 + e, A) > 0 ? 0 : -P);
        }
      break;
    }
  }
  {
    const h = e < 0 ? 1 : -1;
    let g = e < 0 ? u : d, y = 0;
    for (; ; ) {
      const S = l[g];
      Z(
        S != null,
        `Previous layout not found for panel index ${g}`
      );
      const b = Je({
        overrideDisabledPanels: s,
        panelConstraints: n[g],
        prevSize: S,
        size: 100
      }) - S;
      if (y += b, g += h, g < 0 || g >= n.length)
        break;
    }
    const w = Math.min(Math.abs(e), Math.abs(y));
    e = e < 0 ? 0 - w : w;
  }
  {
    let h = e < 0 ? d : u;
    for (; h >= 0 && h < n.length; ) {
      const g = Math.abs(e) - Math.abs(f), y = l[h];
      Z(
        y != null,
        `Previous layout not found for panel index ${h}`
      );
      const w = y - g, S = Je({
        overrideDisabledPanels: s,
        panelConstraints: n[h],
        prevSize: y,
        size: w
      });
      if (!ie(y, S) && (f += y - S, i[h] = S, f.toFixed(3).localeCompare(Math.abs(e).toFixed(3), void 0, {
        numeric: !0
      }) >= 0))
        break;
      e < 0 ? h-- : h++;
    }
  }
  if (sc(c, i))
    return o;
  {
    const h = e < 0 ? u : d, g = l[h];
    Z(
      g != null,
      `Previous layout not found for panel index ${h}`
    );
    const y = g + f, w = Je({
      overrideDisabledPanels: s,
      panelConstraints: n[h],
      prevSize: g,
      size: y
    });
    if (i[h] = w, !ie(w, y)) {
      let S = y - w, b = e < 0 ? u : d;
      for (; b >= 0 && b < n.length; ) {
        const P = i[b];
        Z(
          P != null,
          `Previous layout not found for panel index ${b}`
        );
        const A = P + S, T = Je({
          overrideDisabledPanels: s,
          panelConstraints: n[b],
          prevSize: P,
          size: A
        });
        if (ie(P, T) || (S -= T - P, i[b] = T), ie(S, 0))
          break;
        e > 0 ? b-- : b++;
      }
    }
  }
  const m = Object.values(i).reduce(
    (h, g) => g + h,
    0
  );
  if (!ie(m, 100, 0.1))
    return o;
  const v = Object.keys(o);
  return i.reduce((h, g, y) => (h[v[y]] = g, h), {});
}
function De(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (t[n] === void 0 || be(e[n], t[n]) !== 0)
      return !1;
  return !0;
}
function _e({
  layout: e,
  panelConstraints: t
}) {
  const n = Object.values(e), r = [...n], o = r.reduce(
    (l, c) => l + c,
    0
  );
  if (r.length !== t.length)
    throw Error(
      `Invalid ${t.length} panel layout: ${r.map((l) => `${l}%`).join(", ")}`
    );
  if (!ie(o, 100) && r.length > 0)
    for (let l = 0; l < t.length; l++) {
      const c = r[l];
      Z(c != null, `No layout data found for index ${l}`);
      const i = 100 / o * c;
      r[l] = i;
    }
  let a = 0;
  for (let l = 0; l < t.length; l++) {
    const c = n[l];
    Z(c != null, `No layout data found for index ${l}`);
    const i = r[l];
    Z(i != null, `No layout data found for index ${l}`);
    const d = Je({
      overrideDisabledPanels: !0,
      panelConstraints: t[l],
      prevSize: c,
      size: i
    });
    i != d && (a += i - d, r[l] = d);
  }
  if (!ie(a, 0))
    for (let l = 0; l < t.length; l++) {
      const c = r[l];
      Z(c != null, `No layout data found for index ${l}`);
      const i = c + a, d = Je({
        overrideDisabledPanels: !0,
        panelConstraints: t[l],
        prevSize: c,
        size: i
      });
      if (c !== d && (a -= d - c, r[l] = d, ie(a, 0)))
        break;
    }
  const s = Object.keys(e);
  return r.reduce((l, c, i) => (l[s[i]] = c, l), {});
}
function ro({
  groupId: e,
  panelId: t
}) {
  const n = () => {
    const c = Oe();
    for (const [
      i,
      {
        defaultLayoutDeferred: d,
        derivedPanelConstraints: u,
        layout: f,
        groupSize: m,
        separatorToPanels: v
      }
    ] of c)
      if (i.id === e)
        return {
          defaultLayoutDeferred: d,
          derivedPanelConstraints: u,
          group: i,
          groupSize: m,
          layout: f,
          separatorToPanels: v
        };
    throw Error(`Group ${e} not found`);
  }, r = () => {
    const c = n().derivedPanelConstraints.find(
      (i) => i.panelId === t
    );
    if (c !== void 0)
      return c;
    throw Error(`Panel constraints not found for Panel ${t}`);
  }, o = () => {
    const c = n().group.panels.find((i) => i.id === t);
    if (c !== void 0)
      return c;
    throw Error(`Layout not found for Panel ${t}`);
  }, a = () => {
    const c = n().layout[t];
    if (c !== void 0)
      return c;
    throw Error(`Layout not found for Panel ${t}`);
  }, s = ({
    nextSize: c,
    panels: i,
    prevLayout: d,
    derivedPanelConstraints: u
  }) => {
    const f = a(), m = i.findIndex((g) => g.id === t), v = m === 0, h = m === i.length - 1;
    if (h && c < f && (v || i.slice(0, m).every((g, y) => {
      const w = u[y];
      return (w == null ? void 0 : w.collapsible) && ie(w.collapsedSize, d[w.panelId]);
    }))) {
      const g = i.slice(0, m).reduce((y, w) => y + d[w.id], 0);
      return {
        ...d,
        [t]: ce(100 - g)
      };
    }
    return ut({
      delta: h ? f - c : c - f,
      initialLayout: d,
      panelConstraints: u,
      pivotIndices: h ? [m - 1, m] : [m, m + 1],
      prevLayout: d,
      trigger: "imperative-api"
    });
  }, l = (c) => {
    const i = a();
    if (c === i)
      return;
    const {
      defaultLayoutDeferred: d,
      derivedPanelConstraints: u,
      group: f,
      groupSize: m,
      layout: v,
      separatorToPanels: h
    } = n(), g = s({
      nextSize: c,
      panels: f.panels,
      prevLayout: v,
      derivedPanelConstraints: u
    }), y = _e({
      layout: g,
      panelConstraints: u
    });
    De(v, y) || Ee(f, {
      defaultLayoutDeferred: d,
      derivedPanelConstraints: u,
      groupSize: m,
      layout: y,
      separatorToPanels: h
    });
  };
  return {
    collapse: () => {
      const { collapsible: c, collapsedSize: i } = r(), { mutableValues: d } = o(), u = a();
      c && u !== i && (d.expandToSize = u, l(i));
    },
    expand: () => {
      const { collapsible: c, collapsedSize: i, minSize: d } = r(), { mutableValues: u } = o(), f = a();
      if (c && f === i) {
        let m = u.expandToSize ?? d;
        m === 0 && (m = 1), l(m);
      }
    },
    getSize: () => {
      const { group: c } = n(), i = a(), { element: d } = o(), u = c.orientation === "horizontal" ? d.offsetWidth : d.offsetHeight;
      return {
        asPercentage: i,
        inPixels: u
      };
    },
    isCollapsed: () => {
      const { collapsible: c, collapsedSize: i } = r(), d = a();
      return c && ie(i, d);
    },
    resize: (c) => {
      const { group: i } = n(), { element: d } = o(), u = Ze({ group: i }), f = rt({
        groupSize: u,
        panelElement: d,
        styleProp: c
      }), m = ce(f / u * 100);
      l(m);
    }
  };
}
function ir(e) {
  if (e.defaultPrevented)
    return;
  const t = Oe();
  yn(e, t).forEach((n) => {
    if (n.separator && !n.separator.disableDoubleClick) {
      const r = n.panels.find(
        (o) => o.panelConstraints.defaultSize !== void 0
      );
      if (r) {
        const o = r.panelConstraints.defaultSize, a = ro({
          groupId: n.group.id,
          panelId: r.id
        });
        a && o !== void 0 && (a.resize(o), e.preventDefault());
      }
    }
  });
}
function Rt(e) {
  const t = Oe();
  for (const [n] of t)
    if (n.separators.some(
      (r) => r.element === e
    ))
      return n;
  throw Error("Could not find parent Group for separator element");
}
function oo({
  groupId: e
}) {
  const t = () => {
    const n = Oe();
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
        layout: l,
        separatorToPanels: c
      } = t(), i = _e({
        layout: n,
        panelConstraints: o
      });
      return r ? l : (De(l, i) || Ee(a, {
        defaultLayoutDeferred: r,
        derivedPanelConstraints: o,
        groupSize: s,
        layout: i,
        separatorToPanels: c
      }), i);
    }
  };
}
function Ce(e, t) {
  const n = Rt(e), r = xe(n.id, !0), o = n.separators.find(
    (d) => d.element === e
  );
  Z(o, "Matching separator not found");
  const a = r.separatorToPanels.get(o);
  Z(a, "Matching panels not found");
  const s = a.map((d) => n.panels.indexOf(d)), l = oo({ groupId: n.id }).getLayout(), c = ut({
    delta: t,
    initialLayout: l,
    panelConstraints: r.derivedPanelConstraints,
    pivotIndices: s,
    prevLayout: l,
    trigger: "keyboard"
  }), i = _e({
    layout: c,
    panelConstraints: r.derivedPanelConstraints
  });
  De(l, i) || Ee(
    n,
    {
      defaultLayoutDeferred: r.defaultLayoutDeferred,
      derivedPanelConstraints: r.derivedPanelConstraints,
      groupSize: r.groupSize,
      layout: i,
      separatorToPanels: r.separatorToPanels
    },
    // Keyboard resizes (arrow keys, Home/End, Enter collapse/expand) originate
    // from a real DOM event on the separator, so they are user interactions
    // just like pointer drags. This function is only reached from
    // onDocumentKeyDown. See #716.
    { isUserInteraction: !0 }
  );
}
function cr(e) {
  if (e.defaultPrevented)
    return;
  const t = e.currentTarget, n = Rt(t);
  if (!n.disabled)
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault(), n.orientation === "vertical" && Ce(t, 5);
        break;
      }
      case "ArrowLeft": {
        e.preventDefault(), n.orientation === "horizontal" && Ce(t, -5);
        break;
      }
      case "ArrowRight": {
        e.preventDefault(), n.orientation === "horizontal" && Ce(t, 5);
        break;
      }
      case "ArrowUp": {
        e.preventDefault(), n.orientation === "vertical" && Ce(t, -5);
        break;
      }
      case "End": {
        e.preventDefault(), Ce(t, 100);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const r = Rt(t), o = xe(r.id, !0), { derivedPanelConstraints: a, layout: s, separatorToPanels: l } = o, c = r.separators.find(
          (f) => f.element === t
        );
        Z(c, "Matching separator not found");
        const i = l.get(c);
        Z(i, "Matching panels not found");
        const d = i[0], u = a.find(
          (f) => f.panelId === d.id
        );
        if (Z(u, "Panel metadata not found"), u.collapsible) {
          const f = s[d.id], m = u.collapsedSize === f ? r.mutableState.expandedPanelSizes[d.id] ?? u.minSize : u.collapsedSize;
          Ce(t, m - f);
        }
        break;
      }
      case "F6": {
        e.preventDefault();
        const r = Rt(t).separators.map(
          (s) => s.element
        ), o = Array.from(r).findIndex(
          (s) => s === e.currentTarget
        );
        Z(o !== null, "Index not found");
        const a = e.shiftKey ? o > 0 ? o - 1 : r.length - 1 : o + 1 < r.length ? o + 1 : 0;
        r[a].focus({
          preventScroll: !0
        });
        break;
      }
      case "Home": {
        e.preventDefault(), Ce(t, -100);
        break;
      }
    }
}
function lr(e) {
  if (e.defaultPrevented || e.pointerType === "mouse" && e.button > 0)
    return;
  const t = Oe(), n = yn(e, t), r = /* @__PURE__ */ new Map();
  let o = !1;
  n.forEach((a) => {
    a.separator && (o || (o = !0, a.separator.element.focus({
      // @ts-expect-error https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus#browser_compatibility
      focusVisible: !1,
      preventScroll: !0
    })));
    const s = t.get(a.group);
    s && r.set(a.group, s.layout);
  }), Ve({
    cursorFlags: 0,
    hitRegions: n,
    initialLayoutMap: r,
    pointerDownAtPoint: { x: e.clientX, y: e.clientY },
    state: "active"
  }), n.length && e.preventDefault();
}
function ao({
  document: e,
  event: t,
  hitRegions: n,
  initialLayoutMap: r,
  mountedGroups: o,
  pointerDownAtPoint: a,
  prevCursorFlags: s
}) {
  let l = 0;
  n.forEach((i) => {
    const { group: d, groupSize: u } = i, { orientation: f, panels: m } = d, { disableCursor: v } = d.mutableState;
    let h = 0;
    a ? f === "horizontal" ? h = (t.clientX - a.x) / u * 100 : h = (t.clientY - a.y) / u * 100 : f === "horizontal" ? h = t.clientX < 0 ? -100 : 100 : h = t.clientY < 0 ? -100 : 100;
    const g = r.get(d), y = o.get(d);
    if (!g || !y)
      return;
    const {
      defaultLayoutDeferred: w,
      derivedPanelConstraints: S,
      groupSize: b,
      layout: P,
      separatorToPanels: A
    } = y;
    if (S && P && A) {
      const T = ut({
        delta: h,
        initialLayout: g,
        panelConstraints: S,
        pivotIndices: i.panels.map((F) => m.indexOf(F)),
        prevLayout: P,
        trigger: "mouse-or-touch"
      });
      if (De(T, P)) {
        if (h !== 0 && !v)
          switch (f) {
            case "horizontal": {
              l |= h < 0 ? Yr : Zr;
              break;
            }
            case "vertical": {
              l |= h < 0 ? Xr : Qr;
              break;
            }
          }
      } else
        Ee(i.group, {
          defaultLayoutDeferred: w,
          derivedPanelConstraints: S,
          groupSize: b,
          layout: T,
          separatorToPanels: A
        });
    }
  });
  let c = 0;
  t.movementX === 0 ? c |= s & Xn : c |= l & Xn, t.movementY === 0 ? c |= s & Qn : c |= l & Qn, Vi(c), gn(e);
}
function dr(e) {
  const t = Oe(), n = ze();
  switch (n.state) {
    case "active":
      ao({
        document: e.currentTarget,
        event: e,
        hitRegions: n.hitRegions,
        initialLayoutMap: n.initialLayoutMap,
        mountedGroups: t,
        prevCursorFlags: n.cursorFlags
      });
  }
}
function ur(e) {
  var r, o;
  if (e.defaultPrevented)
    return;
  const t = ze(), n = Oe();
  switch (t.state) {
    case "active": {
      if (
        // Skip this check for "pointerleave" events, else Firefox triggers a false positive (see #514)
        e.buttons === 0
      ) {
        Ve({
          cursorFlags: 0,
          state: "inactive"
        }), t.hitRegions.forEach((a) => {
          const s = xe(a.group.id, !0);
          Ee(a.group, s, {
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
      ao({
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
      const a = yn(e, n);
      a.length === 0 ? t.state !== "inactive" && Ve({
        cursorFlags: 0,
        state: "inactive"
      }) : Ve({
        cursorFlags: 0,
        hitRegions: a,
        state: "hover"
      }), gn(e.currentTarget);
      break;
    }
  }
}
function fr(e) {
  if (e.relatedTarget instanceof HTMLIFrameElement)
    switch (ze().state) {
      case "hover":
        Ve({
          cursorFlags: 0,
          state: "inactive"
        });
    }
}
function mr(e) {
  e.defaultPrevented || e.pointerType === "mouse" && e.button > 0 || to(e.currentTarget) && e.preventDefault();
}
function hr(e) {
  let t = 0, n = 0;
  const r = {};
  for (const a of e)
    if (a.defaultSize !== void 0) {
      t++;
      const s = ce(a.defaultSize);
      n += s, r[a.panelId] = s;
    } else
      r[a.panelId] = void 0;
  const o = e.length - t;
  if (o !== 0) {
    const a = ce((100 - n) / o);
    for (const s of e)
      s.defaultSize === void 0 && (r[s.panelId] = a);
  }
  return r;
}
function ic(e, t, n) {
  if (!n[0])
    return;
  const r = e.panels.find((c) => c.element === t);
  if (!r || !r.onResize)
    return;
  const o = Ze({ group: e }), a = e.orientation === "horizontal" ? r.element.offsetWidth : r.element.offsetHeight, s = r.mutableValues.prevSize, l = {
    asPercentage: ce(a / o * 100),
    inPixels: a
  };
  r.mutableValues.prevSize = l, r.onResize(l, r.id, s);
}
function cc(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function lc({
  group: e,
  nextGroupSize: t,
  prevGroupSize: n,
  prevLayout: r
}) {
  if (n <= 0 || t <= 0 || n === t)
    return r;
  let o = 0, a = 0, s = !1;
  const l = /* @__PURE__ */ new Map(), c = [];
  for (const u of e.panels) {
    const f = r[u.id] ?? 0;
    switch (u.panelConstraints.groupResizeBehavior) {
      case "preserve-pixel-size": {
        s = !0;
        const m = f / 100 * n, v = ce(
          m / t * 100
        );
        l.set(u.id, v), o += v;
        break;
      }
      case "preserve-relative-size":
      default: {
        c.push(u.id), a += f;
        break;
      }
    }
  }
  if (!s || c.length === 0)
    return r;
  const i = 100 - o, d = { ...r };
  if (l.forEach((u, f) => {
    d[f] = u;
  }), a > 0)
    for (const u of c) {
      const f = r[u] ?? 0;
      d[u] = ce(
        f / a * i
      );
    }
  else {
    const u = ce(
      i / c.length
    );
    for (const f of c)
      d[f] = u;
  }
  return d;
}
function dc(e, t) {
  const n = e.map((o) => o.id), r = Object.keys(t);
  if (n.length !== r.length)
    return !1;
  for (const o of n)
    if (!r.includes(o))
      return !1;
  return !0;
}
const Be = /* @__PURE__ */ new Map();
function uc(e) {
  let t = !0;
  Z(
    e.element.ownerDocument.defaultView,
    "Cannot register an unmounted Group"
  );
  const n = e.element.ownerDocument.defaultView.ResizeObserver, r = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), a = new n((v) => {
    for (const h of v) {
      const { borderBoxSize: g, target: y } = h;
      if (y === e.element) {
        if (t) {
          const w = Ze({ group: e });
          if (w === 0)
            return;
          const S = xe(e.id);
          if (!S)
            return;
          const b = Xt(e), P = S.defaultLayoutDeferred ? hr(b) : S.layout, A = lc({
            group: e,
            nextGroupSize: w,
            prevGroupSize: S.groupSize,
            prevLayout: P
          }), T = _e({
            layout: A,
            panelConstraints: b
          });
          if (!S.defaultLayoutDeferred && De(S.layout, T) && cc(
            S.derivedPanelConstraints,
            b
          ) && S.groupSize === w)
            return;
          Ee(e, {
            defaultLayoutDeferred: !1,
            derivedPanelConstraints: b,
            groupSize: w,
            layout: T,
            separatorToPanels: S.separatorToPanels
          });
        }
      } else
        ic(e, y, g);
    }
  });
  a.observe(e.element), e.panels.forEach((v) => {
    Z(
      !r.has(v.id),
      `Panel ids must be unique; id "${v.id}" was used more than once`
    ), r.add(v.id), v.onResize && a.observe(v.element);
  });
  const s = Ze({ group: e }), l = Xt(e), c = e.panels.map(({ id: v }) => v).join(",");
  let i = e.mutableState.defaultLayout;
  i && (dc(e.panels, i) || (i = void 0));
  const d = e.mutableState.layouts[c] ?? i ?? hr(l), u = _e({
    layout: d,
    panelConstraints: l
  }), f = e.element.ownerDocument;
  Be.set(
    f,
    (Be.get(f) ?? 0) + 1
  );
  const m = /* @__PURE__ */ new Map();
  return Vr(e).forEach((v) => {
    v.separator && m.set(v.separator, v.panels);
  }), Ee(e, {
    defaultLayoutDeferred: s === 0,
    derivedPanelConstraints: l,
    groupSize: s,
    layout: u,
    separatorToPanels: m
  }), e.separators.forEach((v) => {
    Z(
      !o.has(v.id),
      `Separator ids must be unique; id "${v.id}" was used more than once`
    ), o.add(v.id), v.element.addEventListener("keydown", cr);
  }), Be.get(f) === 1 && (f.addEventListener("contextmenu", rr, !0), f.addEventListener("dblclick", ir, !0), f.addEventListener("pointerdown", lr, !0), f.addEventListener("pointerleave", dr), f.addEventListener("pointermove", ur), f.addEventListener("pointerout", fr), f.addEventListener("pointerup", mr, !0)), function() {
    t = !1, Be.set(
      f,
      Math.max(0, (Be.get(f) ?? 0) - 1)
    ), Zi(e), e.separators.forEach((v) => {
      v.element.removeEventListener("keydown", cr);
    }), Be.get(f) || (f.removeEventListener(
      "contextmenu",
      rr,
      !0
    ), f.removeEventListener(
      "dblclick",
      ir,
      !0
    ), f.removeEventListener(
      "pointerdown",
      lr,
      !0
    ), f.removeEventListener("pointerleave", dr), f.removeEventListener("pointermove", ur), f.removeEventListener("pointerout", fr), f.removeEventListener("pointerup", mr, !0)), a.disconnect();
  };
}
function fc() {
  const [e, t] = C({}), n = k(() => t({}), []);
  return [e, n];
}
function vn(e) {
  const t = sn();
  return `${e ?? t}`;
}
const $e = typeof window < "u" ? Fe : j;
function at(e) {
  const t = x(e);
  return $e(() => {
    t.current = e;
  }, [e]), k(
    (...n) => {
      var r;
      return (r = t.current) == null ? void 0 : r.call(t, ...n);
    },
    [t]
  );
}
function wn(...e) {
  return at((t) => {
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
function Sn(e) {
  const t = x({ ...e });
  return $e(() => {
    for (const n in e)
      t.current[n] = e[n];
  }, [e]), t.current;
}
const so = on(null);
function mc(e, t) {
  const n = x({
    getLayout: () => ({}),
    setLayout: Gi
  });
  rn(t, () => n.current, []), $e(() => {
    Object.assign(
      n.current,
      oo({ groupId: e })
    );
  });
}
function io({
  children: e,
  className: t,
  defaultLayout: n,
  disableCursor: r,
  disabled: o,
  elementRef: a,
  groupRef: s,
  id: l,
  onLayoutChange: c,
  onLayoutChanged: i,
  orientation: d = "horizontal",
  resizeTargetMinimumSize: u = {
    coarse: 20,
    fine: 10
  },
  style: f,
  ...m
}) {
  const v = x({
    onLayoutChange: {},
    onLayoutChanged: {}
  }), h = at((I) => {
    De(v.current.onLayoutChange, I) || (v.current.onLayoutChange = I, c == null || c(I));
  }), g = at(
    (I, R) => {
      De(v.current.onLayoutChanged, I) || (v.current.onLayoutChanged = I, i == null || i(I, { isUserInteraction: R }));
    }
  ), y = vn(l), w = x(null), [S, b] = fc(), P = x({
    lastExpandedPanelSizes: {},
    layouts: {},
    panels: [],
    resizeTargetMinimumSize: u,
    separators: []
  }), A = wn(w, a);
  mc(y, s);
  const T = at(
    (I, R) => {
      const N = ze(), D = nr(I), L = xe(I);
      if (L) {
        let $ = !1;
        switch (N.state) {
          case "active": {
            $ = N.hitRegions.some(
              (B) => B.group === D
            );
            break;
          }
        }
        return {
          flexGrow: L.layout[R] ?? 1,
          pointerEvents: $ ? "none" : void 0
        };
      }
      if (n != null && n[R])
        return {
          flexGrow: n == null ? void 0 : n[R]
        };
    }
  ), F = Sn({
    defaultLayout: n,
    disableCursor: r
  }), M = V(
    () => ({
      get disableCursor() {
        return !!F.disableCursor;
      },
      getPanelStyles: T,
      id: y,
      orientation: d,
      registerPanel: (I) => {
        const R = P.current;
        return R.panels = Qt(d, [
          ...R.panels,
          I
        ]), b(), () => {
          R.panels = R.panels.filter(
            (N) => N !== I
          ), b();
        };
      },
      registerSeparator: (I) => {
        const R = P.current;
        return R.separators = Qt(d, [
          ...R.separators,
          I
        ]), b(), () => {
          R.separators = R.separators.filter(
            (N) => N !== I
          ), b();
        };
      },
      updatePanelProps: (I, { disabled: R }) => {
        const N = P.current.panels.find(
          ($) => $.id === I
        );
        N && (N.panelConstraints.disabled = R);
        const D = nr(y), L = xe(y);
        D && L && Ee(D, {
          ...L,
          derivedPanelConstraints: Xt(D)
        });
      },
      updateSeparatorProps: (I, {
        disabled: R,
        disableDoubleClick: N
      }) => {
        const D = P.current.separators.find(
          (L) => L.id === I
        );
        D && (D.disabled = R, D.disableDoubleClick = N);
      }
    }),
    [T, y, b, d, F]
  ), E = x(null);
  return $e(() => {
    const I = w.current;
    if (I === null)
      return;
    const R = P.current;
    let N;
    if (F.defaultLayout !== void 0 && Object.keys(F.defaultLayout).length === R.panels.length) {
      N = {};
      for (const K of R.panels) {
        const ne = F.defaultLayout[K.id];
        ne !== void 0 && (N[K.id] = ne);
      }
    }
    const D = {
      disabled: !!o,
      element: I,
      id: y,
      mutableState: {
        defaultLayout: N,
        disableCursor: !!F.disableCursor,
        expandedPanelSizes: P.current.lastExpandedPanelSizes,
        layouts: P.current.layouts
      },
      orientation: d,
      panels: R.panels,
      resizeTargetMinimumSize: R.resizeTargetMinimumSize,
      separators: R.separators
    };
    E.current = D;
    const L = uc(D), { defaultLayoutDeferred: $, derivedPanelConstraints: B, layout: X } = xe(D.id, !0);
    !$ && B.length > 0 && (h(X), g(X, !1));
    const J = bn(y, (K) => {
      const { defaultLayoutDeferred: ne, derivedPanelConstraints: ae, layout: U } = K.next;
      if (ne || ae.length === 0)
        return;
      const O = D.panels.map(({ id: re }) => re).join(",");
      D.mutableState.layouts[O] = U, ae.forEach((re) => {
        if (re.collapsible) {
          const { layout: le } = K.prev ?? {};
          if (le) {
            const ve = ie(
              re.collapsedSize,
              U[re.panelId]
            ), ge = ie(
              re.collapsedSize,
              le[re.panelId]
            );
            ve && !ge && (D.mutableState.expandedPanelSizes[re.panelId] = le[re.panelId]);
          }
        }
      });
      const q = ze().state !== "active";
      h(U), q && g(U, K.isUserInteraction);
    });
    return () => {
      E.current = null, L(), J();
    };
  }, [
    o,
    y,
    g,
    h,
    d,
    S,
    F
  ]), j(() => {
    const I = E.current;
    I && (I.mutableState.defaultLayout = n, I.mutableState.disableCursor = !!r);
  }), /* @__PURE__ */ p(so.Provider, { value: M, children: /* @__PURE__ */ p(
    "div",
    {
      ...m,
      className: t,
      "data-group": !0,
      "data-testid": y,
      id: y,
      ref: A,
      style: {
        height: "100%",
        width: "100%",
        overflow: "hidden",
        ...f,
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
io.displayName = "Group";
function Pn() {
  const e = an(so);
  return Z(
    e,
    "Group Context not found; did you render a Panel or Separator outside of a Group?"
  ), e;
}
function hc(e, t) {
  const { id: n } = Pn(), r = x({
    collapse: Ut,
    expand: Ut,
    getSize: () => ({
      asPercentage: 0,
      inPixels: 0
    }),
    isCollapsed: () => !1,
    resize: Ut
  });
  rn(t, () => r.current, []), $e(() => {
    Object.assign(
      r.current,
      ro({ groupId: n, panelId: e })
    );
  });
}
function en({
  children: e,
  className: t,
  collapsedSize: n = "0%",
  collapsible: r = !1,
  defaultSize: o,
  disabled: a,
  elementRef: s,
  groupResizeBehavior: l = "preserve-relative-size",
  id: c,
  maxSize: i = "100%",
  minSize: d = "0%",
  onResize: u,
  panelRef: f,
  style: m,
  ...v
}) {
  const h = !!c, g = vn(c), y = Sn({
    disabled: a
  }), w = x(null), S = wn(w, s), {
    getPanelStyles: b,
    id: P,
    orientation: A,
    registerPanel: T,
    updatePanelProps: F
  } = Pn(), M = u !== null, E = at(
    (D, L, $) => {
      u == null || u(D, c, $);
    }
  );
  $e(() => {
    const D = w.current;
    if (D !== null) {
      const L = {
        element: D,
        id: g,
        idIsStable: h,
        mutableValues: {
          expandToSize: void 0,
          prevSize: void 0
        },
        onResize: M ? E : void 0,
        panelConstraints: {
          groupResizeBehavior: l,
          collapsedSize: n,
          collapsible: r,
          defaultSize: o,
          disabled: y.disabled,
          maxSize: i,
          minSize: d
        }
      };
      return T(L);
    }
  }, [
    l,
    n,
    r,
    o,
    M,
    g,
    h,
    i,
    d,
    E,
    T,
    y
  ]), j(() => {
    F(g, { disabled: a });
  }, [a, g, F]), hc(g, f);
  const I = () => {
    const D = b(P, g);
    if (D)
      return JSON.stringify(D);
  }, R = po(
    (D) => bn(P, D),
    I,
    I
  );
  let N;
  return R ? N = JSON.parse(R) : o !== void 0 ? N = {
    flexGrow: void 0,
    flexShrink: void 0,
    flexBasis: o
  } : N = { flexGrow: 1 }, /* @__PURE__ */ p(
    "div",
    {
      ...v,
      "data-disabled": a || void 0,
      "data-panel": !0,
      "data-testid": g,
      id: g,
      ref: S,
      style: {
        ...pc,
        display: "flex",
        flexBasis: 0,
        flexShrink: 1,
        overflow: "visible",
        ...N
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
            touchAction: A === "horizontal" ? "pan-y" : "pan-x"
          },
          children: e
        }
      )
    }
  );
}
en.displayName = "Panel";
const pc = {
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
function gc({
  layout: e,
  panelConstraints: t,
  panelId: n,
  panelIndex: r
}) {
  let o, a;
  const s = e[n], l = t.find(
    (c) => c.panelId === n
  );
  if (l) {
    const c = l.maxSize, i = l.collapsible ? l.collapsedSize : l.minSize, d = [r, r + 1];
    a = _e({
      layout: ut({
        delta: i - s,
        initialLayout: e,
        panelConstraints: t,
        pivotIndices: d,
        prevLayout: e
      }),
      panelConstraints: t
    })[n], o = _e({
      layout: ut({
        delta: c - s,
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
function co({
  children: e,
  className: t,
  disabled: n,
  disableDoubleClick: r,
  elementRef: o,
  id: a,
  style: s,
  ...l
}) {
  const c = vn(a), i = Sn({
    disabled: n,
    disableDoubleClick: r
  }), [d, u] = C({}), [f, m] = C("inactive"), [v, h] = C(!1), g = x(null), y = wn(g, o), {
    disableCursor: w,
    id: S,
    orientation: b,
    registerSeparator: P,
    updateSeparatorProps: A
  } = Pn(), T = b === "horizontal" ? "vertical" : "horizontal";
  $e(() => {
    const E = g.current;
    if (E !== null) {
      const I = {
        disabled: i.disabled,
        disableDoubleClick: i.disableDoubleClick,
        element: E,
        id: c
      }, R = P(I), N = qi(
        (L) => {
          m(
            L.next.state !== "inactive" && L.next.hitRegions.some(
              ($) => $.separator === I
            ) ? L.next.state : "inactive"
          );
        }
      ), D = bn(
        S,
        (L) => {
          const { derivedPanelConstraints: $, layout: B, separatorToPanels: X } = L.next, J = X.get(I);
          if (J) {
            const K = J[0], ne = J.indexOf(K);
            u(
              gc({
                layout: B,
                panelConstraints: $,
                panelId: K.id,
                panelIndex: ne
              })
            );
          }
        }
      );
      return () => {
        N(), D(), R();
      };
    }
  }, [S, c, P, i]), j(() => {
    A(c, { disabled: n, disableDoubleClick: r });
  }, [n, r, c, A]);
  let F;
  n && !w && (F = "not-allowed");
  let M;
  if (n)
    M = "disabled";
  else
    switch (f) {
      case "active": {
        M = "active";
        break;
      }
      default:
        v ? M = "focus" : M = f;
    }
  return /* @__PURE__ */ p(
    "div",
    {
      ...l,
      "aria-controls": d.valueControls,
      "aria-disabled": n || void 0,
      "aria-orientation": T,
      "aria-valuemax": d.valueMax,
      "aria-valuemin": d.valueMin,
      "aria-valuenow": d.valueNow,
      children: e,
      className: t,
      "data-separator": M,
      "data-testid": c,
      id: c,
      onBlur: () => h(!1),
      onFocus: () => h(!0),
      ref: y,
      role: "separator",
      style: {
        flexBasis: "auto",
        cursor: F,
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
co.displayName = "Separator";
const Rn = 30, In = 65, ft = 50, bc = 100 - In, yc = 100 - Rn;
function vc(e) {
  const t = Number(e);
  return Number.isFinite(t) ? Math.min(In, Math.max(Rn, t)) : ft;
}
function Tn(e) {
  return 100 - e;
}
function He(e) {
  return `${e}%`;
}
const En = "reader-document", mt = "reader-assistant", lo = "retainpdf.reader.ai-split-layout.v1", wc = {
  [En]: Tn(ft),
  [mt]: ft
};
function Mn(e) {
  const t = vc(e == null ? void 0 : e[mt]);
  return {
    [En]: Tn(t),
    [mt]: t
  };
}
function Sc() {
  try {
    const e = JSON.parse(localStorage.getItem(lo) || "null");
    return Mn(e);
  } catch {
    return wc;
  }
}
function Pc(e) {
  try {
    localStorage.setItem(lo, JSON.stringify(Mn(e)));
  } catch {
  }
}
function Bt(e, t) {
  const n = e == null ? void 0 : e.closest(".reader-react-root");
  if (!n) return;
  const r = Mn(t);
  n.style.setProperty(
    "--reader-ai-split-width",
    `${r[mt]}vw`
  );
}
function Rc() {
  const e = x(null), [t] = C(Sc);
  Fe(() => {
    const o = e.current;
    return Bt(o, t), () => {
      var a;
      (a = o == null ? void 0 : o.closest(".reader-react-root")) == null || a.style.removeProperty("--reader-ai-split-width");
    };
  }, [t]);
  const n = k((o) => {
    Bt(e.current, o);
  }, []), r = k((o, a) => {
    Bt(e.current, o), a.isUserInteraction && Pc(o);
  }, []);
  return /* @__PURE__ */ z(
    io,
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
          en,
          {
            id: En,
            defaultSize: He(Tn(ft)),
            minSize: He(bc),
            maxSize: He(yc)
          }
        ),
        /* @__PURE__ */ p(
          co,
          {
            id: "reader-ai-split-separator",
            className: "reader-ai-split-separator",
            "aria-label": "调整文档与 AI 问答宽度",
            children: /* @__PURE__ */ p("span", { "aria-hidden": "true" })
          }
        ),
        /* @__PURE__ */ p(
          en,
          {
            id: mt,
            defaultSize: He(ft),
            minSize: He(Rn),
            maxSize: He(In)
          }
        )
      ]
    }
  );
}
const Ae = 12, Ic = 4;
function Ke(e, t, n) {
  if (typeof window > "u") return { x: e, y: t };
  const r = Math.min(n, window.innerWidth - Ae * 2), o = Math.max(Ae, window.innerWidth - r - Ae), a = Math.min(window.innerHeight * 0.9, 860), s = Math.max(Ae, window.innerHeight - a - Ae);
  return {
    x: Math.min(o, Math.max(Ae, e)),
    y: Math.min(s, Math.max(Ae, t))
  };
}
function pr(e) {
  if (typeof window > "u") return { x: 24, y: 72 };
  const t = Math.min(e, window.innerWidth - Ae * 2);
  return Ke(window.innerWidth - t - 20, 72, e);
}
function Tc(e, t) {
  try {
    const n = localStorage.getItem(e);
    if (!n) return pr(t);
    const r = JSON.parse(n);
    if (typeof r.x == "number" && typeof r.y == "number")
      return Ke(r.x, r.y, t);
  } catch {
  }
  return pr(t);
}
function Ec(e, t) {
  try {
    localStorage.setItem(e, JSON.stringify(t));
  } catch {
  }
}
function Mc({
  id: e,
  open: t,
  title: n,
  subtitle: r = "拖动标题可移动",
  titleIcon: o,
  storageKey: a,
  ariaLabel: s,
  className: l = "",
  width: c = 360,
  placement: i = "floating",
  showHeader: d = !0,
  onClose: u,
  toolbar: f,
  children: m
}) {
  const v = i === "workspace", h = i === "dock-right", g = h || v, [y, w] = C(() => Tc(a, c)), [S, b] = C(!1), P = x(null);
  j(() => {
    !t || g || w((M) => Ke(M.x, M.y, c));
  }, [g, t, c]), j(() => {
    if (!t || g) return;
    const M = () => w((E) => Ke(E.x, E.y, c));
    return window.addEventListener("resize", M), () => window.removeEventListener("resize", M);
  }, [g, t, c]), j(() => {
    if (!t) return;
    const M = (E) => {
      var R;
      if (E.key !== "Escape") return;
      const I = E.target;
      (R = I == null ? void 0 : I.closest) != null && R.call(I, "textarea, input, select, [contenteditable='true']") || (E.preventDefault(), u());
    };
    return window.addEventListener("keydown", M), () => window.removeEventListener("keydown", M);
  }, [t, u]);
  const A = k((M) => {
    var E, I;
    g || M.button === 0 && ((I = (E = M.target) == null ? void 0 : E.closest) != null && I.call(E, "button") || (M.currentTarget.setPointerCapture(M.pointerId), P.current = {
      pointerId: M.pointerId,
      startX: M.clientX,
      startY: M.clientY,
      originX: y.x,
      originY: y.y,
      moved: !1
    }, b(!0)));
  }, [g, y.x, y.y]), T = k((M) => {
    const E = P.current;
    if (!E || E.pointerId !== M.pointerId) return;
    const I = M.clientX - E.startX, R = M.clientY - E.startY;
    !E.moved && Math.hypot(I, R) < Ic || (E.moved = !0, w(Ke(E.originX + I, E.originY + R, c)));
  }, [c]), F = k((M) => {
    const E = P.current;
    if (!(!E || E.pointerId !== M.pointerId)) {
      P.current = null, b(!1);
      try {
        M.currentTarget.releasePointerCapture(M.pointerId);
      } catch {
      }
      E.moved && w((I) => {
        const R = Ke(I.x, I.y, c);
        return Ec(a, R), R;
      });
    }
  }, [a, c]);
  return t ? /* @__PURE__ */ z(
    "aside",
    {
      id: e,
      className: `reader-notes-panel reader-notes-panel--${v ? "workspace" : h ? "docked" : "float"}${g ? "" : " reader-floating-surface"}${d ? " has-panel-header" : " is-headerless"}${f ? " has-panel-toolbar" : ""}${S ? " is-dragging" : ""} ${l}`.trim(),
      style: g ? void 0 : { left: y.x, top: y.y, width: Math.min(c, typeof window < "u" ? window.innerWidth - 24 : c) },
      "aria-label": s,
      role: "dialog",
      "aria-modal": "false",
      children: [
        d ? /* @__PURE__ */ z(
          "header",
          {
            className: "reader-notes-panel-head",
            onPointerDown: A,
            onPointerMove: T,
            onPointerUp: F,
            onPointerCancel: F,
            children: [
              g ? null : /* @__PURE__ */ p("div", { className: "reader-notes-panel-drag", "aria-hidden": "true", children: /* @__PURE__ */ p($o, { size: 14, strokeWidth: 2.25 }) }),
              /* @__PURE__ */ z("div", { className: "reader-notes-panel-head-text", children: [
                /* @__PURE__ */ z("strong", { children: [
                  o,
                  n
                ] }),
                r ? /* @__PURE__ */ p("span", { children: r }) : null
              ] }),
              /* @__PURE__ */ p("button", { type: "button", className: "reader-notes-close reader-floating-close", "aria-label": `关闭${n}`, onClick: u, children: /* @__PURE__ */ p(Xe, { size: 14, strokeWidth: 2.5, "aria-hidden": !0 }) })
            ]
          }
        ) : null,
        f ? /* @__PURE__ */ p("div", { className: "reader-notes-panel-toolbar", children: f }) : null,
        /* @__PURE__ */ p("div", { className: "reader-notes-panel-body", children: m })
      ]
    }
  ) : null;
}
function Nc({
  note: e,
  onJump: t,
  onUpdateNote: n,
  onRemove: r
}) {
  const [o, a] = C(!1), [s, l] = C(e.note);
  return j(() => {
    o || l(e.note);
  }, [e.note, o]), /* @__PURE__ */ z("article", { className: "reader-notes-item", children: [
    /* @__PURE__ */ z("div", { className: "reader-notes-item-top", children: [
      /* @__PURE__ */ p("span", { className: "reader-notes-kind", children: e.pane === "translated" ? "译文" : "原文" }),
      /* @__PURE__ */ z("div", { className: "reader-notes-item-actions", children: [
        /* @__PURE__ */ p("button", { type: "button", className: "reader-notes-link", onClick: () => t(e), children: "定位" }),
        /* @__PURE__ */ p("button", { type: "button", className: "reader-notes-danger", onClick: () => r(e.id), children: "删除" })
      ] })
    ] }),
    /* @__PURE__ */ p("p", { className: "reader-notes-quote", children: e.quote }),
    o ? /* @__PURE__ */ z("div", { className: "reader-notes-editor", children: [
      /* @__PURE__ */ p(
        "textarea",
        {
          className: "reader-notes-textarea",
          value: s,
          placeholder: "写点想法…",
          rows: 3,
          onChange: (c) => l(c.target.value)
        }
      ),
      /* @__PURE__ */ z("div", { className: "reader-notes-editor-actions", children: [
        /* @__PURE__ */ p(
          "button",
          {
            type: "button",
            className: "reader-notes-primary",
            onClick: () => {
              n(e.id, s), a(!1);
            },
            children: "保存"
          }
        ),
        /* @__PURE__ */ p("button", { type: "button", className: "reader-notes-link", onClick: () => a(!1), children: "取消" })
      ] })
    ] }) : e.note ? /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: "reader-notes-note",
        onClick: () => a(!0),
        title: "点击编辑",
        children: e.note
      }
    ) : /* @__PURE__ */ p("button", { type: "button", className: "reader-notes-add-note", onClick: () => a(!0), children: "添加笔记" })
  ] });
}
function Ac({
  open: e,
  groups: t,
  count: n,
  onClose: r,
  onJump: o,
  onUpdateNote: a,
  onRemove: s,
  onExport: l
}) {
  const [c, i] = C(!1);
  return /* @__PURE__ */ p(
    Mc,
    {
      id: "reader-notes-panel",
      open: e,
      title: "批注",
      subtitle: "选中 PDF 文字后可添加 · 本地保存",
      titleIcon: /* @__PURE__ */ p(xt, { size: 14, strokeWidth: 2.25, "aria-hidden": !0 }),
      storageKey: "retainpdf.reader.notes-float.pos.v1",
      ariaLabel: "批注",
      onClose: r,
      toolbar: /* @__PURE__ */ z(At, { children: [
        /* @__PURE__ */ z("span", { className: "reader-notes-count", children: [
          n,
          " 条"
        ] }),
        /* @__PURE__ */ p(
          "button",
          {
            type: "button",
            className: "reader-notes-export",
            disabled: c || n === 0,
            onClick: async () => {
              await l() && (i(!0), window.setTimeout(() => i(!1), 1800));
            },
            children: c ? "已复制" : "导出 Markdown"
          }
        )
      ] }),
      children: n === 0 ? /* @__PURE__ */ p("p", { className: "reader-notes-empty", children: "暂无批注。在 PDF 上拖选文字，点「添加批注」。" }) : t.map((d) => /* @__PURE__ */ z("section", { className: "reader-notes-group", children: [
        /* @__PURE__ */ z("h3", { className: "reader-notes-group-title", children: [
          "第 ",
          d.page,
          " 页"
        ] }),
        d.items.map((u) => /* @__PURE__ */ p(
          Nc,
          {
            note: u,
            onJump: o,
            onUpdateNote: a,
            onRemove: s
          },
          u.id
        ))
      ] }, d.page))
    }
  );
}
function kc({
  regionsFailed: e = !1,
  metadataFailed: t = !1
}) {
  const [n, r] = C(!1);
  if (j(() => {
    !e && !t && r(!1);
  }, [e, t]), n || !e && !t)
    return null;
  const o = [
    e ? "译文区域" : "",
    t ? "阅读元数据" : ""
  ].filter(Boolean);
  return /* @__PURE__ */ z("div", { className: "reader-error-notice", role: "status", "data-reader-error-notice": "true", children: [
    /* @__PURE__ */ z("span", { className: "reader-error-notice-text", children: [
      o.join("、"),
      "加载失败，正文仍可正常阅读。"
    ] }),
    /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: "reader-error-notice-dismiss",
        "aria-label": "关闭提示",
        onClick: () => r(!0),
        children: "×"
      }
    )
  ] });
}
function xc({
  loading: e,
  failed: t,
  text: n,
  percent: r,
  regionsError: o = !1,
  metadataError: a = !1
}) {
  return !e && !t ? /* @__PURE__ */ p(kc, { regionsFailed: o, metadataFailed: a }) : /* @__PURE__ */ z(At, { children: [
    e ? /* @__PURE__ */ p("div", { className: "reader-boot-loading", "data-reader-boot-loading": "true", children: /* @__PURE__ */ z("div", { className: "reader-boot-loading-card", children: [
      /* @__PURE__ */ p("div", { className: "reader-boot-loading-text", children: n }),
      /* @__PURE__ */ p("div", { className: "reader-boot-loading-track", children: /* @__PURE__ */ p(
        "span",
        {
          className: "reader-boot-loading-bar",
          style: { width: `${Math.max(0, Math.min(100, r))}%` }
        }
      ) })
    ] }) }) : null,
    t ? /* @__PURE__ */ p("div", { className: "reader-react-error", role: "alert", children: n }) : null
  ] });
}
async function Lc(e) {
  var o;
  const t = `${e || ""}`;
  if (!t) throw new Error("empty selection");
  try {
    if ((o = navigator.clipboard) != null && o.writeText) {
      await navigator.clipboard.writeText(t);
      return;
    }
  } catch {
  }
  const n = document.createElement("textarea");
  n.value = t, n.setAttribute("readonly", ""), n.style.position = "fixed", n.style.opacity = "0", document.body.appendChild(n), n.select();
  const r = document.execCommand("copy");
  if (n.remove(), !r) throw new Error("copy failed");
}
function Cc({
  selection: e,
  onDismiss: t,
  onAddNote: n
}) {
  const [r, o] = C(!1), a = e ? e.selectionType === "text" ? `${e.pane}:${e.page}:${e.quote}` : `${e.region.itemId}:${e.pane}` : "";
  if (j(() => o(!1), [a]), !e)
    return null;
  const s = typeof window < "u" ? window.innerWidth : 800, l = typeof window < "u" ? window.innerHeight : 600, c = e.rect.left + e.rect.width / 2, i = 170, d = Math.min(Math.max(16 + i, c), s - 16 - i), u = e.rect.top > 72, f = u ? Math.max(12, e.rect.top - 8) : Math.min(l - 12, e.rect.top + e.rect.height + 8), m = u ? "above" : "below", v = e.pane === "translated" ? "译文" : "原文", h = e.selectionType === "text" ? "text" : e.kind, g = e.selectionType === "text" ? e.quote : Ir(e.region, e.pane), y = h === "formula" ? "公式" : h === "table" ? "表格" : h === "figure" ? "图片" : h === "text" ? "文字" : "区域", w = h === "formula" ? No(g) : g, S = h === "formula" ? jo : h === "table" ? Uo : h === "text" ? Bo : Ho;
  return /* @__PURE__ */ z(
    "div",
    {
      className: `reader-sel-pop reader-sel-pop--${m} reader-sel-pop--region`,
      style: { left: d, top: f },
      role: "toolbar",
      "aria-label": "选区操作",
      onPointerDown: (b) => {
        b.preventDefault();
      },
      children: [
        /* @__PURE__ */ z("div", { className: "reader-sel-pop-card reader-floating-surface", children: [
          /* @__PURE__ */ z("div", { className: "reader-sel-pop-context", children: [
            /* @__PURE__ */ p(S, { size: 15, strokeWidth: 2.1, "aria-hidden": !0 }),
            /* @__PURE__ */ p("span", { children: y }),
            /* @__PURE__ */ p("span", { className: "reader-sel-pop-context-divider", "aria-hidden": !0, children: "·" }),
            /* @__PURE__ */ p("span", { children: v }),
            /* @__PURE__ */ p("span", { className: "reader-sel-pop-context-divider", "aria-hidden": !0, children: "·" }),
            /* @__PURE__ */ z("span", { children: [
              e.page,
              " 页"
            ] })
          ] }),
          /* @__PURE__ */ z("div", { className: "reader-sel-pop-actions", children: [
            w ? /* @__PURE__ */ z(
              "button",
              {
                type: "button",
                className: "reader-sel-pop-btn reader-sel-pop-btn--primary",
                onClick: async () => {
                  try {
                    await Lc(w), o(!0), window.setTimeout(() => o(!1), 1400);
                  } catch (b) {
                    console.warn("[reader-selection] copy failed", b);
                  }
                },
                children: [
                  r ? /* @__PURE__ */ p(Wo, { size: 15, strokeWidth: 2.4, "aria-hidden": !0 }) : /* @__PURE__ */ p(Jo, { size: 15, strokeWidth: 2.2, "aria-hidden": !0 }),
                  /* @__PURE__ */ p("span", { children: r ? "已复制" : h === "formula" ? "复制 LaTeX" : "复制" })
                ]
              }
            ) : /* @__PURE__ */ p("span", { className: "reader-sel-pop-selection-hint", children: "已选择图片" }),
            n && w ? /* @__PURE__ */ z(
              "button",
              {
                type: "button",
                className: "reader-sel-pop-btn reader-sel-pop-btn--secondary",
                onClick: () => n({ page: e.page, pane: e.pane, quote: w }),
                children: [
                  /* @__PURE__ */ p(xt, { size: 15, strokeWidth: 2.2, "aria-hidden": !0 }),
                  /* @__PURE__ */ p("span", { children: "添加批注" })
                ]
              }
            ) : null,
            /* @__PURE__ */ p(
              "button",
              {
                type: "button",
                className: "reader-sel-pop-btn reader-sel-pop-btn--ghost",
                onClick: t,
                "aria-label": "取消选区",
                title: "取消",
                children: /* @__PURE__ */ p(Xe, { size: 15, strokeWidth: 2.5, "aria-hidden": !0 })
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ p("span", { className: "reader-sel-pop-caret", "aria-hidden": "true" })
      ]
    }
  );
}
function zc(e) {
  if (!(e instanceof HTMLElement)) return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
function Dc() {
  const [e, t] = C(!1), n = sn(), r = x(null);
  return j(() => {
    if (!e) return;
    const o = (s) => {
      const l = r.current;
      l && s.target instanceof Node && !l.contains(s.target) && t(!1);
    }, a = (s) => {
      s.key === "Escape" && (s.preventDefault(), t(!1));
    };
    return document.addEventListener("mousedown", o), window.addEventListener("keydown", a), () => {
      document.removeEventListener("mousedown", o), window.removeEventListener("keydown", a);
    };
  }, [e]), j(() => {
    const o = (a) => {
      if (a.defaultPrevented || a.metaKey || a.ctrlKey || a.altKey || zc(a.target)) return;
      const s = a.key;
      if (s === "?" || s === "h" || s === "H" || s === "/") {
        if (s === "/" && !a.shiftKey)
          return;
        a.preventDefault(), t((l) => !l);
      }
    };
    return window.addEventListener("keydown", o), () => window.removeEventListener("keydown", o);
  }, []), /* @__PURE__ */ z("div", { className: "reader-react-shortcuts", ref: r, "data-reader-shortcuts": "", children: [
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
        children: /* @__PURE__ */ p(Ko, { className: "reader-react-shortcuts-icon", size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
      }
    ),
    e ? /* @__PURE__ */ z(
      "div",
      {
        id: n,
        className: "reader-react-shortcuts-panel reader-floating-surface",
        role: "dialog",
        "aria-label": "阅读器快捷键",
        children: [
          /* @__PURE__ */ z("div", { className: "reader-react-shortcuts-head", children: [
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
          /* @__PURE__ */ p("div", { className: "reader-react-shortcuts-body", children: Ws.map((o) => /* @__PURE__ */ z("section", { className: "reader-react-shortcuts-group", children: [
            /* @__PURE__ */ p("h3", { children: o.title }),
            /* @__PURE__ */ p("ul", { children: o.items.map((a) => /* @__PURE__ */ z("li", { children: [
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
const _c = Object.freeze([
  {
    id: "favorites",
    label: "摘录",
    subIdle: "本书云端收藏",
    subOpen: "关闭悬浮窗",
    needsJob: !1
  },
  {
    id: "markdown",
    label: "Markdown",
    subIdle: "识别 / 译文文本",
    subOpen: "关闭悬浮窗",
    needsJob: !0
  }
]), Fc = ["source", "sideBySide", "translated"], Oc = { source: "", translated: "", sideBySide: "" };
function $c(e) {
  if (e.sourceOnly || !e.jobId) {
    const t = it(e.sourceUrl), n = it(e.translatedUrl);
    return {
      source: t,
      translated: n,
      // sideBySide requires dedicated artifact; no fallback to source url
      sideBySide: ""
    };
  }
  return sa({
    jobId: e.jobId,
    jobPayload: e.jobPayload,
    manifestPayload: e.manifestPayload
  });
}
function jc(e) {
  const [t, n] = C(() => /* @__PURE__ */ new Set()), r = V(
    () => e ? $c(e) : Oc,
    [e]
  ), o = V(
    () => Fc.filter((s) => !(e != null && e.sourceOnly && s !== "source")),
    [e == null ? void 0 : e.sourceOnly]
  ), a = k(async (s) => {
    if (!e) return;
    const l = it(r[s]);
    if (!(!l || t.has(s)))
      try {
        const c = e.jobId ? aa(s, {
          jobId: e.jobId,
          jobPayload: e.jobPayload,
          manifestPayload: e.manifestPayload
        }) : `${e.sourceOnly ? "document" : "reader"}-${s}.pdf`;
        await ia(
          e.fetchProtected,
          l,
          c,
          c,
          null,
          (i) => n((d) => {
            const u = new Set(d);
            return i ? u.add(s) : u.delete(s), u;
          })
        );
      } catch (c) {
        const i = c instanceof Error ? c.message : "下载失败";
        ca(i), n((d) => {
          const u = new Set(d);
          return u.delete(s), u;
        });
      }
  }, [r, t, e]);
  return { urls: r, downloadItems: o, busyActions: t, handleDownload: a };
}
function Uc(e) {
  const [t, n] = C(!1), r = k(() => n(!1), []), o = k(() => n((a) => !a), []);
  return j(() => {
    if (!t) return;
    const a = (l) => {
      const c = e.current;
      c && l.target instanceof Node && !c.contains(l.target) && n(!1);
    }, s = (l) => {
      l.key === "Escape" && (l.preventDefault(), n(!1));
    };
    return document.addEventListener("mousedown", a), window.addEventListener("keydown", s), () => {
      document.removeEventListener("mousedown", a), window.removeEventListener("keydown", s);
    };
  }, [t, e]), { open: t, setOpen: n, closeMenu: r, toggleMenu: o };
}
const uo = "retainpdf.reader.fab.pos.v1", Nt = 52, We = 12, Bc = 6;
function st(e, t) {
  if (typeof window > "u")
    return { x: e, y: t };
  const n = Math.max(We, window.innerWidth - Nt - We), r = Math.max(We, window.innerHeight - Nt - We);
  return {
    x: Math.min(n, Math.max(We, e)),
    y: Math.min(r, Math.max(We, t))
  };
}
function gr() {
  return typeof window > "u" ? { x: 24, y: 120 } : st(
    window.innerWidth - Nt - 20,
    window.innerHeight - Nt - 88
  );
}
function Hc() {
  try {
    const e = localStorage.getItem(uo);
    if (!e) return gr();
    const t = JSON.parse(e);
    if (typeof t.x == "number" && typeof t.y == "number")
      return st(t.x, t.y);
  } catch {
  }
  return gr();
}
function Wc(e) {
  try {
    localStorage.setItem(uo, JSON.stringify(e));
  } catch {
  }
}
function Jc(e) {
  return typeof window < "u" && e.y > window.innerHeight * 0.55;
}
function Kc(e = {}) {
  const { onDragStart: t, onActivate: n } = e, [r, o] = C(() => Hc()), a = x(null);
  j(() => {
    const i = () => o((d) => st(d.x, d.y));
    return window.addEventListener("resize", i), () => window.removeEventListener("resize", i);
  }, []);
  const s = k((i) => {
    i.button === 0 && (i.currentTarget.setPointerCapture(i.pointerId), a.current = {
      pointerId: i.pointerId,
      startX: i.clientX,
      startY: i.clientY,
      originX: r.x,
      originY: r.y,
      moved: !1
    });
  }, [r.x, r.y]), l = k((i) => {
    const d = a.current;
    if (!d || d.pointerId !== i.pointerId) return;
    const u = i.clientX - d.startX, f = i.clientY - d.startY;
    !d.moved && Math.hypot(u, f) < Bc || (d.moved || (d.moved = !0, t == null || t()), o(st(d.originX + u, d.originY + f)));
  }, [t]), c = k((i) => {
    const d = a.current;
    if (!(!d || d.pointerId !== i.pointerId)) {
      a.current = null;
      try {
        i.currentTarget.releasePointerCapture(i.pointerId);
      } catch {
      }
      if (d.moved) {
        o((u) => {
          const f = st(u.x, u.y);
          return Wc(f), f;
        });
        return;
      }
      n == null || n();
    }
  }, [n]);
  return {
    pos: r,
    openUp: Jc(r),
    onPointerDown: s,
    onPointerMove: l,
    onPointerUp: c
  };
}
const qc = {
  source: Tr,
  sideBySide: Er,
  translated: Mr
}, Vc = {
  source: "原文",
  sideBySide: "对照",
  translated: "译文"
};
function Gc({ onClose: e }) {
  return /* @__PURE__ */ z("header", { className: "reader-fab-menu-head", children: [
    /* @__PURE__ */ z("div", { className: "reader-fab-menu-head-text", children: [
      /* @__PURE__ */ p("strong", { children: "工具" }),
      /* @__PURE__ */ p("span", { children: "拖动圆钮可移动" })
    ] }),
    /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: "reader-fab-menu-close reader-floating-close",
        "aria-label": "关闭菜单",
        onClick: e,
        children: /* @__PURE__ */ p(Xe, { size: 14, strokeWidth: 2.5, "aria-hidden": !0 })
      }
    )
  ] });
}
function Yc({
  index: e,
  icon: t,
  title: n,
  sub: r,
  active: o,
  disabled: a,
  onClick: s
}) {
  return /* @__PURE__ */ z(
    "button",
    {
      type: "button",
      role: "menuitem",
      className: `reader-fab-row${o ? " is-active" : ""}${a ? " is-disabled" : ""}`,
      "aria-pressed": o,
      disabled: a,
      onClick: s,
      style: { "--fab-i": e + 1 },
      children: [
        /* @__PURE__ */ p("span", { className: "reader-fab-row-icon", "aria-hidden": "true", children: /* @__PURE__ */ p(t, { size: 18, strokeWidth: 2 }) }),
        /* @__PURE__ */ z("span", { className: "reader-fab-row-copy", children: [
          /* @__PURE__ */ p("span", { className: "reader-fab-row-title", children: n }),
          /* @__PURE__ */ p("span", { className: "reader-fab-row-sub", children: r })
        ] })
      ]
    }
  );
}
function Zc({
  urls: e,
  items: t,
  busyActions: n,
  onDownload: r
}) {
  return /* @__PURE__ */ z("div", { className: "reader-fab-section", role: "group", "aria-label": "下载", children: [
    /* @__PURE__ */ z("div", { className: "reader-fab-section-head", children: [
      /* @__PURE__ */ p(qo, { size: 12, strokeWidth: 2.5, "aria-hidden": !0 }),
      /* @__PURE__ */ p("span", { children: "下载 PDF" })
    ] }),
    /* @__PURE__ */ p("div", { className: "reader-fab-download-grid", children: t.map((o, a) => {
      const s = wo[o], l = it(e[o]), c = n.has(o), i = !!l && !c, d = i ? "" : So(o, e), u = qc[o];
      return /* @__PURE__ */ z(
        "button",
        {
          type: "button",
          role: "menuitem",
          id: `reader-fab-download-${o}`,
          className: `reader-fab-chip${c ? " is-busy" : ""}${i ? "" : " is-disabled"}`,
          disabled: !i,
          title: i ? `下载${s.label}` : d,
          onClick: () => void r(o),
          style: { "--fab-i": a },
          children: [
            /* @__PURE__ */ p("span", { className: "reader-fab-chip-icon", "aria-hidden": "true", children: /* @__PURE__ */ p(u, { size: 16, strokeWidth: 2 }) }),
            /* @__PURE__ */ p("span", { className: "reader-fab-chip-label", children: Vc[o] }),
            /* @__PURE__ */ p("span", { className: "reader-fab-chip-state", children: c ? "…" : i ? "↓" : "—" })
          ]
        },
        o
      );
    }) }),
    t.every((o) => !it(e[o])) ? /* @__PURE__ */ p("p", { className: "reader-fab-empty", children: "产物尚未就绪" }) : null
  ] });
}
const Xc = {
  favorites: Vo,
  markdown: Nr,
  notes: xt
}, Qc = _c;
function el(e) {
  const { activeTool: t, noteCount: n, onToggleTool: r } = e, o = pt(), a = e.sourceOnly ?? (o == null ? void 0 : o.sourceOnly) ?? !1, s = e.download ?? (o == null ? void 0 : o.download), l = x(null), c = sn(), { open: i, setOpen: d, closeMenu: u, toggleMenu: f } = Uc(l), { pos: m, openUp: v, onPointerDown: h, onPointerMove: g, onPointerUp: y } = Kc({
    onDragStart: u,
    onActivate: f
  }), { urls: w, downloadItems: S, busyActions: b, handleDownload: P } = jc(s), A = k((T) => {
    r(T), d(!1);
  }, [r, d]);
  return /* @__PURE__ */ z(
    "div",
    {
      ref: l,
      className: `reader-fab${i ? " is-open" : ""}${v ? " is-open-up" : ""}`,
      style: { left: m.x, top: m.y },
      "data-reader-fab": "",
      children: [
        i ? /* @__PURE__ */ z(
          "div",
          {
            id: c,
            className: "reader-fab-menu reader-floating-surface",
            role: "menu",
            "aria-label": "阅读工具",
            children: [
              /* @__PURE__ */ p(Gc, { onClose: u }),
              (() => {
                const T = t === "notes";
                return /* @__PURE__ */ z(
                  "button",
                  {
                    type: "button",
                    role: "menuitem",
                    className: `reader-fab-row${T ? " is-active" : ""}`,
                    "aria-pressed": T,
                    onClick: () => A("notes"),
                    style: { "--fab-i": 0 },
                    children: [
                      /* @__PURE__ */ p("span", { className: "reader-fab-row-icon", "aria-hidden": "true", children: /* @__PURE__ */ p(xt, { size: 18, strokeWidth: 2 }) }),
                      /* @__PURE__ */ z("span", { className: "reader-fab-row-copy", children: [
                        /* @__PURE__ */ p("span", { className: "reader-fab-row-title", children: "批注" }),
                        /* @__PURE__ */ p("span", { className: "reader-fab-row-sub", children: T ? "关闭悬浮窗" : "本地批注 · 导出" })
                      ] }),
                      n > 0 ? /* @__PURE__ */ p("span", { className: "reader-fab-row-badge", children: n }) : null
                    ]
                  }
                );
              })(),
              Qc.map((T, F) => {
                const M = Xc[T.id], E = t === T.id, I = T.needsJob && a;
                let R = E ? T.subOpen : T.subIdle;
                return I && (R = "需打开任务阅读"), /* @__PURE__ */ p(
                  Yc,
                  {
                    index: F,
                    icon: M,
                    title: T.label,
                    sub: R,
                    active: E,
                    disabled: I,
                    onClick: () => A(T.id)
                  },
                  T.id
                );
              }),
              /* @__PURE__ */ p(
                Zc,
                {
                  urls: w,
                  items: S,
                  busyActions: b,
                  onDownload: P
                }
              )
            ]
          }
        ) : null,
        /* @__PURE__ */ p(
          "button",
          {
            type: "button",
            className: `reader-fab-trigger${i ? " is-open" : ""}${t ? " has-active-tool" : ""}`,
            "aria-label": i ? "收起工具菜单" : "打开工具菜单",
            "aria-expanded": i,
            "aria-controls": i ? c : void 0,
            "aria-haspopup": "menu",
            onPointerDown: h,
            onPointerMove: g,
            onPointerUp: y,
            onPointerCancel: y,
            children: /* @__PURE__ */ p("span", { className: "reader-fab-icon", "aria-hidden": "true", children: i ? /* @__PURE__ */ p(Xe, { size: 20, strokeWidth: 2.5 }) : /* @__PURE__ */ z("span", { className: "reader-fab-dots", children: [
              /* @__PURE__ */ p("i", {}),
              /* @__PURE__ */ p("i", {}),
              /* @__PURE__ */ p("i", {})
            ] }) })
          }
        )
      ]
    }
  );
}
function tl(e) {
  const t = pt(), n = Ni(), { mode: r = "compare", modeControls: o } = e, a = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? ht, s = e.onZoomChange ?? (t == null ? void 0 : t.onZoomChange) ?? (() => {
  }), l = e.currentPage ?? (n == null ? void 0 : n.currentPage) ?? 1, c = e.numPages ?? (n == null ? void 0 : n.numPages) ?? 0, i = e.onGoToPage ?? (t == null ? void 0 : t.goToPage), d = Ga(a), u = a > Cr + 1e-3, f = a < zr - 1e-3, m = ot(), v = "50%（半屏，对照铺满）", [h, g] = C(!1), [y, w] = C(`${l}`);
  j(() => {
    h || w(`${Math.min(Math.max(l, 1), Math.max(c, 1))}`);
  }, [l, c, h]);
  const S = () => {
    if (g(!1), !i || c <= 0)
      return;
    const b = Number(`${y}`.trim());
    i(Mt(b, c));
  };
  return /* @__PURE__ */ z("div", { className: "reader-react-hud", "data-reader-hud": "true", children: [
    o ? /* @__PURE__ */ p("div", { className: "reader-react-hud-group reader-react-hud-modes", children: o }) : null,
    /* @__PURE__ */ p("div", { className: "reader-react-hud-group", "aria-label": "页码", children: h ? /* @__PURE__ */ z(
      "form",
      {
        className: "reader-react-hud-page-form",
        onSubmit: (b) => {
          b.preventDefault(), S();
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
              value: y,
              autoFocus: !0,
              onChange: (b) => w(b.target.value.replace(/[^\d]/g, "")),
              onBlur: S,
              onKeyDown: (b) => {
                b.key === "Escape" && (b.preventDefault(), g(!1), w(`${l}`));
              }
            }
          ),
          /* @__PURE__ */ z("span", { className: "reader-react-hud-page-suffix", children: [
            "/ ",
            c || "—"
          ] })
        ]
      }
    ) : /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: "reader-react-hud-page reader-react-hud-page-btn",
        "aria-label": c > 0 ? `跳转页码，当前第 ${l} 页，共 ${c} 页` : "页码",
        title: c > 0 ? "点击输入页码跳转" : void 0,
        disabled: !i || c <= 0,
        onClick: () => {
          !i || c <= 0 || (w(`${l}`), g(!0));
        },
        children: c > 0 ? `${Math.min(l, c)} / ${c}` : "—"
      }
    ) }),
    /* @__PURE__ */ z("div", { className: "reader-react-hud-group", "aria-label": "缩放", children: [
      /* @__PURE__ */ p(
        "button",
        {
          type: "button",
          className: "reader-react-hud-btn",
          "aria-label": "缩小",
          disabled: !u,
          onClick: () => s(dt(a, -1)),
          children: "−"
        }
      ),
      /* @__PURE__ */ z(
        "button",
        {
          type: "button",
          className: "reader-react-hud-btn reader-react-hud-zoom-label",
          "aria-label": `重置为${v}`,
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
          disabled: !f,
          onClick: () => s(dt(a, 1)),
          children: "+"
        }
      )
    ] }),
    /* @__PURE__ */ p("div", { className: "reader-react-hud-group reader-react-hud-help", "aria-label": "帮助", children: /* @__PURE__ */ p(Dc, {}) })
  ] });
}
function Nn(e) {
  const t = `${e.jobId || ""}`.trim(), n = `${e.documentId || ""}`.trim();
  return n ? `retainpdf.reader.notes.v1:doc:${n}` : t ? `retainpdf.reader.notes.v1:job:${t}` : "retainpdf.reader.notes.v1:anonymous";
}
function nl() {
  return typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function rl(e) {
  return {
    pageIdx: Number(e.page) - 1,
    quoteText: e.quote,
    note: e.note,
    createdAt: e.createdAt
  };
}
function ol(e) {
  return zo(e, (t) => t.page);
}
function al(e) {
  return _o(e, (t) => t.page).map((t) => ({ page: t.pageIdx, items: t.items }));
}
function sl(e, t) {
  return Do({
    title: e,
    annotations: t.map(rl)
  });
}
function br(e) {
  if (!e)
    return [];
  try {
    const t = JSON.parse(e);
    return Array.isArray(t) ? t.map((n) => ({
      id: `${(n == null ? void 0 : n.id) || ""}`.trim(),
      page: Math.max(1, Math.floor(Number(n == null ? void 0 : n.page) || 1)),
      pane: (n == null ? void 0 : n.pane) === "translated" ? "translated" : "source",
      quote: `${(n == null ? void 0 : n.quote) || ""}`.trim(),
      note: `${(n == null ? void 0 : n.note) || ""}`.trim(),
      createdAt: `${(n == null ? void 0 : n.createdAt) || ""}`.trim() || (/* @__PURE__ */ new Date()).toISOString()
    })).filter((n) => n.id && n.quote) : [];
  } catch {
    return [];
  }
}
function yr(e) {
  if (typeof localStorage > "u")
    return [];
  try {
    const t = Nn(e), n = br(localStorage.getItem(t)), r = `${e.jobId || ""}`.trim(), o = `retainpdf.reader.notes.v1:job:${r}`;
    if (!r || t === o) return n;
    const a = br(localStorage.getItem(o));
    if (!a.length) return n;
    const s = new Set(n.map((i) => i.id)), l = [...n, ...a.filter((i) => !s.has(i.id))], c = JSON.stringify(l);
    try {
      localStorage.setItem(t, c), localStorage.getItem(t) === c && localStorage.removeItem(o);
    } catch {
    }
    return l;
  } catch {
    return [];
  }
}
function il(e, t) {
  if (!(typeof localStorage > "u"))
    try {
      localStorage.setItem(Nn(e), JSON.stringify(t));
    } catch (n) {
      console.warn("[reader-notes] persist failed", n);
    }
}
function cl(e, t = {}) {
  const n = V(
    () => ({
      jobId: `${e.jobId || ""}`.trim(),
      documentId: `${e.documentId || ""}`.trim()
    }),
    [e.jobId, e.documentId]
  ), r = Nn(n), [o, a] = C(() => ({
    key: r,
    notes: yr(n)
  })), s = o.key === r ? o.notes : [], l = k((v) => {
    a((h) => ({
      key: h.key,
      notes: typeof v == "function" ? v(h.notes) : v
    }));
  }, []), c = t.onAfterAdd;
  j(() => {
    a({ key: r, notes: yr(n) });
  }, [n, r]), j(() => {
    o.key === r && il(n, o.notes);
  }, [n, r, o]);
  const i = k((v) => {
    const h = `${v.quote || ""}`.trim();
    if (!h)
      return null;
    const g = {
      id: nl(),
      page: Math.max(1, Math.floor(Number(v.page) || 1)),
      pane: v.pane === "translated" ? "translated" : "source",
      quote: h,
      note: `${v.note || ""}`.trim(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return l((y) => ol([g, ...y])), c == null || c(), g;
  }, [c]), d = k((v, h) => {
    const g = `${h || ""}`.trim();
    l((y) => y.map((w) => w.id === v ? { ...w, note: g } : w));
  }, []), u = k((v) => {
    l((h) => h.filter((g) => g.id !== v));
  }, []), f = k(async (v = "") => {
    var g, y;
    const h = sl(v, s);
    try {
      return await ((y = (g = navigator.clipboard) == null ? void 0 : g.writeText) == null ? void 0 : y.call(g, h)), !0;
    } catch (w) {
      return console.error("[reader-notes] copy failed", w), !1;
    }
  }, [s]), m = V(() => al(s), [s]);
  return {
    notes: s,
    groups: m,
    addFromQuote: i,
    updateNote: d,
    remove: u,
    exportMarkdown: f,
    count: s.length
  };
}
const tn = "download-toast";
function ll({
  title: e = "下载中",
  status: t = "正在准备...",
  meta: n = "等待响应...",
  percent: r = NaN,
  tone: o = "progress"
}) {
  const a = Number.isFinite(r) ? Math.max(4, Math.min(100, Number(r) || 0)) : 18;
  return /* @__PURE__ */ z("div", { className: "download-toast-card reader-floating-surface", "data-tone": o, "aria-live": "polite", children: [
    /* @__PURE__ */ z("div", { className: "download-toast-head", children: [
      /* @__PURE__ */ p("div", { id: "download-toast-title", className: "download-toast-title", children: e }),
      /* @__PURE__ */ p("div", { id: "download-toast-status", className: "download-toast-status", children: t })
    ] }),
    /* @__PURE__ */ p("div", { className: "download-toast-track", children: /* @__PURE__ */ p("span", { id: "download-toast-bar", className: "download-toast-bar", style: { width: `${a}%` } }) }),
    /* @__PURE__ */ p("div", { id: "download-toast-meta", className: "download-toast-meta", children: n })
  ] });
}
function dl(e = {}) {
  const {
    visible: t = !1,
    title: n = "下载中",
    status: r = "正在准备...",
    meta: o = "等待响应...",
    percent: a = NaN,
    tone: s = "progress"
  } = e;
  if (!t) {
    Ht.dismiss(tn);
    return;
  }
  Ht.custom(
    () => /* @__PURE__ */ p(ll, { title: n, status: r, meta: o, percent: a, tone: s }),
    { id: tn, duration: 1 / 0 }
  );
}
function ul() {
  const e = k((t) => {
    t && (t.setState = dl, t.hide = () => Ht.dismiss(tn));
  }, []);
  return /* @__PURE__ */ z(At, { children: [
    /* @__PURE__ */ p(Fo, { position: "bottom-right" }),
    /* @__PURE__ */ p("download-toast", { style: { display: "none" }, "aria-hidden": "true", ref: e })
  ] });
}
const fl = Sr(() => import("./ReaderFavoritesPanel-CyjWpY8h.js").then((e) => ({ default: e.ReaderFavoritesPanel }))), ml = Sr(() => import("./ReaderMarkdownPanel-D_PfHKUD.js").then((e) => ({ default: e.ReaderMarkdownPanel })));
function vr(e) {
  const t = x(!1);
  return e && (t.current = !0), t.current;
}
function hl(e) {
  const t = e.sourceOnly || !e.translatedUrl, n = !!(e.overlayContentAvailable && e.liveTranslationVisible && !e.assistantOpen), o = e.assistantPdfPane || (e.assistantOpen && e.mode === "compare" ? "source" : e.mode);
  return {
    kind: n ? "live-overlay" : o === "compare" ? "final-compare" : o === "translated" ? "translated-only" : "source-only",
    visibleMode: o,
    compareMode: o === "compare",
    showSource: n || o !== "translated",
    showTranslated: o === "translated" || o === "compare",
    overlayOnSource: n,
    sourceOnly: e.sourceOnly,
    sourceViewOnly: t
  };
}
function pl(e, t) {
  return e === "compare" ? t ? !0 : null : !1;
}
function wr(e, t) {
  var n, r;
  return e === "compare" ? null : (t == null ? void 0 : t.assistantPanel) === "markdown" || ((n = t == null ? void 0 : t.splitLayout) == null ? void 0 : n.left) === "markdown" || ((r = t == null ? void 0 : t.splitLayout) == null ? void 0 : r.right) === "markdown" ? "markdown" : null;
}
function gl() {
  const e = Bs(), { boot: t, panes: n, sessionFiles: r, tools: o, session: a } = e, [s, l] = C(() => wr(e.mode, Te(e.viewStateKey))), [c, i] = C(null), [d, u] = C(!1), f = x(e.viewStateKey), m = x(null), v = s !== null, h = e.liveTranslationAvailable || e.liveTranslation.pagesByPage.size > 0, g = hl({
    mode: e.mode,
    sourceOnly: e.sourceOnly,
    translatedUrl: r.translatedUrl,
    overlayContentAvailable: h,
    liveTranslationVisible: d,
    assistantOpen: v,
    assistantPdfPane: c
  }), y = g.sourceViewOnly, w = g.visibleMode, [S, b] = C(!1), P = k(() => b(!0), []), A = k(() => b((O) => !O), []), T = cl(
    { jobId: a.jobId, documentId: a.documentId },
    { onAfterAdd: P }
  ), F = k((O) => {
    T.addFromQuote(O), e.clearSelection();
  }, [T.addFromQuote, e.clearSelection]), M = k((O) => {
    e.goToPage(O.page, O.pane === "translated" ? "translated" : "source");
  }, [e.goToPage]), E = k(
    () => T.exportMarkdown(a.title || ""),
    [T.exportMarkdown, a.title]
  );
  j(() => {
    u(!0), b(!1);
  }, [e.viewStateKey]), j(() => {
    e.session.jobTerminal && u(!1);
  }, [e.session.jobTerminal]), j(() => {
    if (!t.loading) {
      if (f.current !== e.viewStateKey) {
        f.current = e.viewStateKey;
        const O = Te(e.viewStateKey);
        l(wr(e.mode, O)), i(null);
        return;
      }
      Et(e.viewStateKey, { assistantPanel: s, splitLayout: null });
    }
  }, [s, t.loading, e.mode, e.viewStateKey]), j(() => {
    if (!(t.loading || t.failed)) {
      if (m.current !== e.viewStateKey) {
        m.current = e.viewStateKey;
        const O = Te(e.viewStateKey), q = y ? "source" : O == null ? void 0 : O.mode;
        q && q !== e.mode && e.setModeKeepingPage(q);
        return;
      }
      Et(e.viewStateKey, { mode: e.mode });
    }
  }, [t.failed, t.loading, e.mode, e.setModeKeepingPage, e.viewStateKey, y]);
  const I = s || (e.mode === "compare" ? "compare" : "reading"), R = vr(o.isOpen("favorites")), N = vr(s === "markdown");
  qs({
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
  const D = k(() => {
    o.close();
  }, [o]), L = k(() => {
    l(null), i(null);
  }, []), $ = k((O) => {
    o.close(), i(null);
    const q = pl(O, e.liveTranslationAvailable);
    q !== null && u(q), e.setModeKeepingPage(O);
  }, [e.liveTranslationAvailable, e.setModeKeepingPage, o]), B = V(() => !h || !g.showSource ? null : /* @__PURE__ */ p(
    "button",
    {
      type: "button",
      className: `reader-live-translation-toggle${d ? " is-active" : ""}`,
      onClick: () => u((O) => !O),
      "aria-pressed": d,
      title: d ? "隐藏实时译文" : "在原文 PDF 上叠加实时译文",
      children: "译文"
    }
  ), [h, g.showSource, d]), X = k((O) => {
    l(O);
  }, []), J = k((O) => {
    if (O === "notes") {
      A();
      return;
    }
    if (O === "markdown") {
      s === O ? (l(null), i(null)) : (l(O), i(null));
      return;
    }
    o.toggle(O);
  }, [s, A, o]), K = S ? "notes" : s ?? o.active, ne = V(() => ({
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
    regions: a.regions,
    readerMetadata: a.readerMetadata,
    activeRegion: e.activeRegion,
    onSelectRegion: e.selectRegion,
    sourceOnly: e.sourceOnly,
    sourceViewOnly: y,
    download: e.download,
    goToPage: e.goToPage,
    assistant: { select: X, close: L }
  }), [
    e.shell,
    e.userZoom,
    e.onZoomChange,
    e.rowHeights,
    e.panes,
    e.sessionFiles,
    a.regions,
    a.readerMetadata,
    e.activeRegion,
    e.selectRegion,
    e.sourceOnly,
    y,
    e.download,
    e.goToPage,
    X,
    L
  ]), ae = V(() => ({
    currentPage: e.currentPage,
    numPages: n.hudNumPages
  }), [e.currentPage, n.hudNumPages]), U = [
    Ua,
    `is-workspace-${I}`,
    v ? "is-assistant-open" : "",
    g.overlayOnSource ? "is-live-translation-overlay" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ p(Mi, { value: ne, hud: ae, children: /* @__PURE__ */ z("div", { className: U, "data-reader-engine": "react-pdf", "data-reader-workspace": I, children: [
    /* @__PURE__ */ p(xc, { loading: t.loading, failed: t.failed, text: t.text, percent: t.percent, regionsError: !!a.readerErrors.regions, metadataError: !!a.readerErrors.metadata }),
    /* @__PURE__ */ p(Qs, { onBeforeClose: a.prepareClose }),
    /* @__PURE__ */ p(
      _i,
      {
        mode: w,
        documentReady: !!a.jobId,
        sourceViewOnly: y,
        onModeChange: $,
        liveTranslation: h ? {
          visible: d,
          state: e.liveTranslation,
          onToggle: () => u((O) => !O)
        } : null
      }
    ),
    /* @__PURE__ */ p(Fi, { active: s }),
    v ? /* @__PURE__ */ p(Rc, {}) : null,
    e.showHud ? /* @__PURE__ */ p(el, { activeTool: K, noteCount: T.count, onToggleTool: J }) : null,
    /* @__PURE__ */ p(Li, { paneComposition: g, markdownSplit: s === "markdown", assistantSplit: v, liveTranslation: e.liveTranslation, sourcePaneAction: B }),
    e.showHud ? /* @__PURE__ */ p(
      tl,
      {
        mode: w,
        modeControls: null
      }
    ) : null,
    /* @__PURE__ */ z(go, { fallback: null, children: [
      R ? /* @__PURE__ */ p(fl, { open: o.isOpen("favorites"), jobId: a.jobId, documentId: a.documentId, onClose: D, onJumpPage: e.goToPage }) : null,
      N ? /* @__PURE__ */ p(ml, { open: s === "markdown", jobId: a.jobId, sourceOnly: e.sourceOnly, layout: "workspace", side: "right", onClose: L }) : null
    ] }),
    /* @__PURE__ */ p(
      Ac,
      {
        open: S,
        groups: T.groups,
        count: T.count,
        onClose: () => b(!1),
        onJump: M,
        onUpdateNote: T.updateNote,
        onRemove: T.remove,
        onExport: E
      }
    ),
    /* @__PURE__ */ p(Cc, { selection: e.selection, onDismiss: e.clearSelection, onAddNote: F }),
    /* @__PURE__ */ p(ul, {})
  ] }) });
}
function zl() {
  return /* @__PURE__ */ p(gl, {});
}
export {
  ln as A,
  zl as R,
  gl as a,
  Mc as b,
  Cl as c,
  kl as d,
  Al as e,
  Ll as f,
  xl as r
};
//# sourceMappingURL=ReaderApp-B9RufCE9.js.map
