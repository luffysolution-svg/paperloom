var Ln = (e) => {
  throw TypeError(e);
};
var Cn = (e, t, n) => t.has(e) || Ln("Cannot " + n);
var Qe = (e, t, n) => (Cn(e, t, "read from private field"), n ? n.call(e) : t.get(e)), zn = (e, t, n) => t.has(e) ? Ln("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, n), Dn = (e, t, n, r) => (Cn(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n);
import { jsxs as z, jsx as p, Fragment as kt } from "react/jsx-runtime";
import { useMemo as q, useState as L, useEffect as $, useCallback as k, useRef as x, useLayoutEffect as Fe, memo as rn, forwardRef as mo, useImperativeHandle as on, createContext as an, useContext as sn, useSyncExternalStore as po, useId as cn, Suspense as ho, lazy as ln } from "react";
import { requireAdapter as ye, getReaderAdapters as le } from "./adapters.js";
import { resolveReaderDownloadName as go, createReaderServerFavoritesPort as bo, resolveReaderDownloadUrls as yo, READER_PROGRESS_COPY as Re, trimString as it, READER_DOWNLOAD_ACTIONS as vo, disabledReason as wo } from "./runtime/state.js";
import { d as So } from "./ask-answerer-GNQdzitl.js";
import "@retainpdf/api/conversations";
import { r as Po, b as Io } from "./page-config-Ct7qR5rm.js";
import { c as Ro, n as To, f as Dt, h as _n, a as Eo, b as Mo, i as Pr, p as Nt, g as Ir, r as Rr, j as On, e as Ao } from "./reader-regions-DsePY7B_.js";
import { i as ko, c as No } from "./live-translation-CbniFg2b.js";
import { sortByPageAndCreatedAt as xo, buildAnnotationsMarkdown as Lo, groupByPageAndCreatedAt as Co } from "./runtime/content.js";
import { toast as Wt, Toaster as zo } from "sonner";
import { X as Xe, Radio as Do, FileText as Tr, Columns2 as Er, Languages as Mr, FileCode2 as Ar, Sparkles as dn, GripHorizontal as _o, StickyNote as xt, Sigma as Oo, Table2 as Fo, Type as $o, Image as jo, Check as Uo, Copy as Bo, Keyboard as Ho, Download as Wo, Bookmark as Jo } from "lucide-react";
import { pdfjs as Ko, Page as qo, Document as Vo } from "react-pdf";
import { e as Go, m as Yo, a as Zo } from "./markdown-math-XkF5urpn.js";
const Xo = (...e) => {
  var t, n;
  return ((n = (t = le()) == null ? void 0 : t.isMockMode) == null ? void 0 : n.call(t, ...e)) ?? !1;
}, Qo = "", ea = Object.freeze({
  progress: "retainpdf-reader-progress"
}), ta = (e) => {
  var t, n;
  return ((n = (t = le()) == null ? void 0 : t.resolveResourceUrl) == null ? void 0 : n.call(t, e)) ?? e;
}, xl = (...e) => {
  var n;
  return (((n = le()) == null ? void 0 : n.fetchProtected) ?? fetch)(...e);
}, ke = () => ye("defaultReaderDataPort"), Fn = () => ye("defaultReaderPageConfigPort"), Ll = {
  get apiPrefix() {
    return ke().apiPrefix;
  },
  fetchProtected: (...e) => ke().fetchProtected(...e),
  loadMarkdownPayload: (e) => ke().loadMarkdownPayload(e),
  loadMarkdownSource: (e) => ke().loadMarkdownSource(e),
  loadMarkdownRange: (e, t, n, r, a) => ke().loadMarkdownRange(e, t, n, r, a),
  loadJobPayload: (e) => ke().loadJobPayload(e),
  loadReaderPayload: (e, t) => ke().loadReaderPayload(e, t),
  get liveTranslation() {
    return ke().liveTranslation;
  }
}, kr = {
  messageTargetOrigin: () => Fn().messageTargetOrigin(),
  readerJobId: () => Fn().readerJobId()
}, na = () => {
  var e;
  return ((e = le()) == null ? void 0 : e.liveTranslation) ?? null;
}, ct = () => {
  var t;
  const e = le();
  return (e == null ? void 0 : e.pdf) ?? {
    fetchProtected: (e == null ? void 0 : e.fetchProtected) ?? ((t = e == null ? void 0 : e.defaultReaderDataPort) == null ? void 0 : t.fetchProtected) ?? fetch,
    resolvePdfjsVendorUrl: (n = "") => {
      var r;
      return ((r = e == null ? void 0 : e.resolvePdfjsVendorUrl) == null ? void 0 : r.call(e, n)) ?? "";
    }
  };
}, un = () => {
  const e = le();
  if (e != null && e.sessionData) return e.sessionData;
  const t = e == null ? void 0 : e.defaultReaderDataPort;
  if (!t) throw new Error("Reader adapter missing: defaultReaderDataPort (call setReaderAdapters)");
  return {
    loadReaderPayload: t.loadReaderPayload,
    loadJobPayload: t.loadJobPayload,
    fetchDocumentByJobId: (...n) => ye("fetchDocumentByJobId")(...n),
    fetchProtected: t.fetchProtected,
    resolveResourceUrl: e.resolveResourceUrl ?? ((n) => n),
    resolveReaderSourcePdf: (n) => {
      var r;
      return ((r = e.resolveReaderSourcePdf) == null ? void 0 : r.call(e, n)) ?? null;
    },
    resolveReaderTranslatedPdfUrl: (n, r) => {
      var a;
      return ((a = e.resolveReaderTranslatedPdfUrl) == null ? void 0 : a.call(e, n, r)) ?? "";
    },
    resolveReaderArtifactUrl: (n) => {
      var r;
      return ((r = e.resolveReaderArtifactUrl) == null ? void 0 : r.call(e, n)) ?? "";
    }
  };
}, Cl = () => {
  var e;
  return ((e = le()) == null ? void 0 : e.aiOperations) ?? null;
}, zl = () => {
  var e;
  return ((e = le()) == null ? void 0 : e.conversations) ?? null;
}, Dl = () => {
  var e;
  return ((e = le()) == null ? void 0 : e.askChat) ?? null;
}, ra = (...e) => {
  var t, n;
  return ((n = (t = le()) == null ? void 0 : t.resolveReaderAnchor) == null ? void 0 : n.call(t, ...e)) ?? null;
}, oa = () => {
  var e, t;
  return ((t = (e = le()) == null ? void 0 : e.resolveReaderDocumentId) == null ? void 0 : t.call(e)) ?? "";
}, aa = (...e) => {
  var t, n;
  return ((n = (t = le()) == null ? void 0 : t.resolveReaderJobId) == null ? void 0 : n.call(t, ...e)) ?? "";
}, sa = (...e) => {
  var t, n;
  return ((n = (t = le()) == null ? void 0 : t.resolveReaderDownloadName) == null ? void 0 : n.call(t, ...e)) ?? go(...e);
}, ia = (...e) => {
  var t, n;
  return ((n = (t = le()) == null ? void 0 : t.resolveReaderDownloadUrls) == null ? void 0 : n.call(t, ...e)) ?? yo(...e);
}, ca = (...e) => ye("downloadProtectedResource")(...e), la = (...e) => ye("failDownloadToast")(...e), _l = (e, t) => ye("resolveMarkdownAssetUrl")(e, t), Ol = (e = {}) => {
  const t = le();
  return So({
    apiPrefix: (t == null ? void 0 : t.apiPrefix) || "/api/v1",
    ask: t == null ? void 0 : t.askDocumentAi,
    documentByJobId: t == null ? void 0 : t.fetchDocumentByJobId,
    ...e
  });
}, fn = "/api/v1", Fl = (e = fn, t = {}) => {
  var n;
  return ye("fetchFavorites")(
    ((n = le()) == null ? void 0 : n.apiPrefix) ?? e,
    t
  );
};
function $l(e = {}) {
  const t = le();
  return bo({
    apiPrefix: (t == null ? void 0 : t.apiPrefix) ?? fn,
    documentByJobId: (...n) => ye("fetchDocumentByJobId")(...n),
    submitFavorite: (...n) => ye("createFavorite")(...n),
    loadFavorites: (...n) => ye("fetchFavorites")(...n),
    removeFavorite: (...n) => ye("deleteFavorite")(...n),
    ...e
  });
}
function da() {
  const e = () => {
    var r;
    return Po(
      ((r = globalThis.location) == null ? void 0 : r.search) || ""
    );
  }, [t, n] = L(e);
  return $(() => {
    var l, i, c, d;
    const r = () => n(e()), a = (i = (l = globalThis.history) == null ? void 0 : l.pushState) == null ? void 0 : i.bind(globalThis.history), o = (d = (c = globalThis.history) == null ? void 0 : c.replaceState) == null ? void 0 : d.bind(globalThis.history);
    let s = !1;
    if (a && o)
      try {
        const u = (f) => function(...m) {
          const v = f.apply(this, m);
          return r(), globalThis.dispatchEvent(new Event("pushstate")), globalThis.dispatchEvent(new Event("replacestate")), globalThis.dispatchEvent(new Event("locationchange")), v;
        };
        globalThis.history.pushState = u(a), globalThis.history.replaceState = u(o), s = !0;
      } catch {
      }
    return window.addEventListener("popstate", r), window.addEventListener("hashchange", r), window.addEventListener("pushstate", r), window.addEventListener("replacestate", r), window.addEventListener("locationchange", r), () => {
      if (window.removeEventListener("popstate", r), window.removeEventListener("hashchange", r), window.removeEventListener("pushstate", r), window.removeEventListener("replacestate", r), window.removeEventListener("locationchange", r), s && a && o)
        try {
          globalThis.history.pushState = a, globalThis.history.replaceState = o;
        } catch {
        }
    };
  }, []), t;
}
function ua() {
  const e = da(), t = q(() => aa(kr), [e]), n = q(() => oa(), [e]), r = t || n ? `job:${t}|document:${n}` : `location:${e}`;
  return { locationKey: e, jobId: t, routeDocumentId: n, sessionIdentity: r };
}
function fa(e) {
  const {
    routeDocumentId: t,
    jobId: n,
    sessionIdentity: r,
    sessionIdentityRef: a,
    documentIdRef: o,
    sessionJobIdRef: s,
    switchToSourceMode: l
  } = e, [i, c] = L({
    documentId: "",
    jobId: ""
  }), [d, u] = L({
    documentId: "",
    jobId: ""
  }), f = i.documentId === t ? i.jobId : "", m = d.documentId === t ? d.jobId : "", v = n || f, [h, g] = L({
    jobId: "",
    documentId: ""
  }), y = h.jobId === v ? h.documentId : "", w = t || y, S = !!t && !v, [b, P] = L(null), N = (b == null ? void 0 : b.sessionIdentity) === r && b.documentId === w ? b : null, M = S || !!N, _ = k((E) => {
    const R = `${E.documentId || ""}`.trim();
    if (!R || o.current && o.current !== R) return;
    if (!o.current && s.current)
      g({
        jobId: s.current,
        documentId: R
      });
    else if (!o.current)
      return;
    const I = `${E.revision || ""}`.trim() || `${Date.now()}`;
    P({
      documentId: R,
      revision: I,
      sessionIdentity: a.current
    }), l();
  }, []);
  $(() => {
    P((E) => E && E.sessionIdentity !== r ? null : E);
  }, [r]);
  const T = k((E) => {
    switch (E.type) {
      case "resolved-document-job":
        c({ documentId: E.documentId, jobId: E.jobId });
        break;
      case "cleared-resolved-document-job":
        c({ documentId: "", jobId: "" });
        break;
      case "missing-document-job":
        u({ documentId: E.documentId, jobId: E.jobId });
        break;
      case "resolved-job-document":
        g((R) => R.jobId === E.jobId && R.documentId === E.documentId ? R : { jobId: E.jobId, documentId: E.documentId });
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
    resolvedDocumentJob: i,
    setResolvedDocumentJob: c,
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
    activeCommittedDocumentSource: N,
    sourceViewOnly: M,
    refreshCommittedDocument: _,
    applyIdentityEvent: T
  };
}
const ma = /* @__PURE__ */ new Set(["succeeded", "failed", "cancelled", "canceled"]);
function $n(e) {
  return `${(e == null ? void 0 : e.status) || ""}`.trim().toLowerCase();
}
function pa(e) {
  var r, a, o, s;
  if (!e || typeof e != "object") return "";
  const t = e, n = [
    t.document_id,
    t.documentId,
    (r = t.document) == null ? void 0 : r.document_id,
    (a = t.book_summary) == null ? void 0 : a.document_id,
    (s = (o = t.request_payload) == null ? void 0 : o.source) == null ? void 0 : s.document_id
  ];
  for (const l of n) {
    const i = `${l || ""}`.trim();
    if (i) return i;
  }
  return "";
}
function jn(e, t) {
  const n = `/api/v1/documents/${encodeURIComponent(e)}/source.pdf`, r = `${t || ""}`.trim();
  return ta(r ? `${n}?version=${encodeURIComponent(r)}` : n);
}
function ha(e, t = "") {
  const n = `${e || ""}`.trim(), r = `${t || ""}`.trim();
  return !!(!n || r && (n === r || n === `${r}.pdf`) || /^\d{8,14}-[0-9a-f]{4,}$/i.test(n));
}
function ga(e, t) {
  var r;
  const n = [
    e == null ? void 0 : e.title,
    e == null ? void 0 : e.display_name,
    e == null ? void 0 : e.source_file_name,
    (r = e == null ? void 0 : e.book_summary) == null ? void 0 : r.source_file_name
  ];
  for (const a of n) {
    const o = `${a || ""}`.trim();
    if (o && !ha(o, t))
      return o.replace(/\.pdf$/i, "");
  }
  return "";
}
function Jt({
  percent: e,
  text: t,
  stage: n
}) {
  var r;
  try {
    (r = window.parent) == null || r.postMessage(
      {
        type: ea.progress,
        stage: n,
        percent: e,
        text: t
      },
      kr.messageTargetOrigin()
    );
  } catch {
  }
}
function Rt(e, t, n, r = "progress") {
  e({
    loading: !0,
    percent: t,
    text: n,
    stage: r,
    failed: !1
  }), Jt({ percent: t, text: n, stage: r });
}
function ba(e) {
  const {
    sessionJobId: t,
    sessionIdentity: n,
    sessionIdentityRef: r,
    sessionJobIdRef: a,
    sessionEpochRef: o,
    closingRef: s
  } = e, [l, i] = L(null), [c, d] = L(null), [u, f] = L(""), [m, v] = L(0), h = u === n ? l : null, g = u === n ? c : null, y = $n(h), w = ma.has(y), S = k(() => {
    v((T) => T + 1);
  }, []), b = k((T) => {
    i(T.jobPayload), d(T.manifestPayload), f(T.sessionIdentity);
  }, []), P = k((T) => {
    i(null), d(null), f(T);
  }, []), N = x(""), M = x(""), _ = k(async () => {
    const T = a.current;
    if (!T || N.current === T) return;
    const E = un().loadJobPayload;
    if (typeof E != "function") return;
    const R = o.current.value;
    N.current = T;
    try {
      const I = await E(T);
      if (s.current || o.current.value !== R || a.current !== T || !I || typeof I != "object")
        return;
      const A = $n(I);
      i(I), f(r.current), A === "succeeded" && M.current !== T && (M.current = T, v((D) => D + 1));
    } catch {
    } finally {
      N.current === T && (N.current = "");
    }
  }, []);
  return $(() => {
    M.current = "";
  }, [n]), $(() => {
    if (!t || w || !h) return;
    const T = window.setInterval(() => {
      _();
    }, 1e3);
    return () => window.clearInterval(T);
  }, [w, _, h, t]), {
    jobPayload: l,
    setJobPayload: i,
    manifestPayload: c,
    setManifestPayload: d,
    payloadSessionIdentity: u,
    setPayloadSessionIdentity: f,
    scopedJobPayload: h,
    scopedManifestPayload: g,
    jobStatus: y,
    jobTerminal: w,
    jobRefreshRevision: m,
    refreshJobArtifacts: S,
    refreshJobStatus: _,
    publishPayload: b,
    clearPayload: P
  };
}
function Kt(e) {
  document.body.classList.remove(
    "reader-mode-source",
    "reader-mode-translated",
    "reader-mode-compare"
  ), document.body.classList.add(`reader-mode-${e}`);
}
function ya(e, t) {
  e(t), Kt(t);
}
function va(e) {
  const [t, n] = L(e ? "source" : "compare"), r = k((o) => {
    e && o !== "source" || (n(o), Kt(o));
  }, [e]), a = k((o) => {
    ya(n, o);
  }, []);
  return $(() => (e && document.documentElement.classList.add("reader-source-only"), Kt(t), () => {
    document.documentElement.classList.remove("reader-source-only");
  }), [e, t]), { mode: t, setMode: r, setModeState: n, switchSessionMode: a };
}
function Un(e) {
  return typeof e == "string" ? e.trim() : `${e ?? ""}`.trim();
}
function wa(e) {
  const t = (e == null ? void 0 : e.data) ?? e, n = t && typeof t == "object" ? t : {};
  return {
    activeJobId: Un(n.active_job_id),
    activeVersionId: Un(n.active_version_id)
  };
}
function Sa(e) {
  const { link: t, rejectedDocumentJobId: n, hasCommittedSource: r } = e, a = t.activeJobId && t.activeJobId !== n && !t.activeJobId.startsWith("doc:") ? t.activeJobId : "";
  return a ? { kind: "follow-active-job", jobId: a, activeVersionId: t.activeVersionId } : t.activeVersionId && !r ? { kind: "open-committed-source", documentId: "", revision: t.activeVersionId } : { kind: "open-source-url" };
}
function Pa(e) {
  const {
    payloadDocumentId: t,
    linkedActiveJobId: n,
    linkedActiveVersionId: r,
    sessionJobId: a,
    hasCommittedSource: o
  } = e;
  return t && r && n === a && !o ? { kind: "restore-committed-source", documentId: t, revision: r } : { kind: "open-job-artifacts" };
}
function Ia(e) {
  return e.status === 404 && !e.jobId && !!e.routeDocumentId && !!e.documentJobId && e.sessionJobId === e.documentJobId;
}
function Ra(e) {
  return e ? { data: e.data.slice() } : null;
}
const Ta = 2, ve = /* @__PURE__ */ new Map();
function qt(e, t) {
  ve.delete(e), ve.set(e, t);
}
function Ea(e) {
  if (ve.size < Ta) return;
  const t = ve.keys().next().value;
  t && ve.delete(t);
}
async function Nr(e, t = ct().fetchProtected, n = {}) {
  const r = `${e || ""}`.trim();
  if (!r)
    return null;
  if (ve.has(r)) {
    const l = ve.get(r);
    return qt(r, l), l;
  }
  const a = await t(r, { signal: n.signal });
  if (!a.ok) {
    const l = new Error(`读取 PDF 失败 (${a.status})`);
    throw l.status = a.status, l;
  }
  const o = await a.arrayBuffer(), s = { data: new Uint8Array(o) };
  return ve.has(r) ? qt(r, s) : (Ea(), ve.set(r, s)), s;
}
const Ma = { file: null, loading: !1, error: "" }, Aa = { file: null, loading: !0, error: "" };
function ka(e = "", t = null) {
  const n = `${e || ""}`.trim(), [r, a] = L(null);
  if ($(() => {
    if (t || !n) return;
    const s = ve.get(n);
    if (s) {
      qt(n, s), a({ url: n, file: s, loading: !1, error: "" });
      return;
    }
    const l = new AbortController();
    return Nr(n, void 0, { signal: l.signal }).then((i) => {
      l.signal.aborted || a({ url: n, file: i, loading: !1, error: "" });
    }).catch((i) => {
      l.signal.aborted || a({ url: n, file: null, loading: !1, error: (i == null ? void 0 : i.message) || String(i) });
    }), () => l.abort();
  }, [n, t]), t) return { file: t, loading: !1, error: "" };
  if (!n) return Ma;
  const o = ve.get(n);
  return o ? { file: o, loading: !1, error: "" } : (r == null ? void 0 : r.url) === n ? r : Aa;
}
function Na(e) {
  const { sessionEpochRef: t, closingRef: n, abort: r, sessionEpoch: a } = e;
  let o = !1;
  const s = () => r.signal.aborted || n.current || t.current.value !== a;
  return {
    signal: r.signal,
    isClosedOrStale: s,
    isInactive: () => o || s(),
    markFailed: () => {
      o = !0;
    }
  };
}
async function Vt(e) {
  const { url: t, label: n, percentStart: r, percentEnd: a, fence: o, setBoot: s } = e;
  if (!t || o.isInactive())
    return null;
  Rt(s, r, n, "download");
  const l = await Nr(t, ct().fetchProtected, {
    signal: o.signal
  });
  return o.isInactive() ? null : (Rt(s, a, n, "download"), l);
}
async function xa(e) {
  const { sourceFinal: t, translatedFinal: n, fence: r, setBoot: a } = e;
  Rt(a, 25, "正在下载 PDF…", "download");
  const o = [];
  let s = null, l = null;
  return t && o.push(
    Vt({
      url: t,
      label: "正在下载原文 PDF…",
      percentStart: 30,
      percentEnd: 55,
      fence: r,
      setBoot: a
    }).then((d) => {
      s = d;
    })
  ), n && o.push(
    Vt({
      url: n,
      label: "正在下载译文 PDF…",
      percentStart: 55,
      percentEnd: 85,
      fence: r,
      setBoot: a
    }).then((d) => {
      l = d;
    })
  ), await Promise.all(o), r.isInactive() ? { status: "inactive" } : !!t && !s || !!n && !l ? { status: "incomplete" } : { status: "downloaded", sourceBytes: s, translatedBytes: l };
}
const vt = {
  regions: null,
  metadata: null
};
function La(e) {
  const {
    sessionJobId: t,
    jobId: n,
    routeDocumentId: r,
    documentJobId: a,
    rejectedDocumentJobId: o,
    sourceOnly: s,
    locationKey: l,
    sessionIdentity: i,
    committedSource: c,
    applyIdentityEvent: d,
    publishPayload: u,
    clearPayload: f,
    switchSessionMode: m,
    jobRefreshRevision: v,
    sessionEpochRef: h,
    closingRef: g,
    activeLoadAbortRef: y
  } = e, [w, S] = L(""), [b, P] = L(""), [N, M] = L(null), [_, T] = L(null), [E, R] = L(!1), [I, A] = L(""), [D, C] = L([]), [F, B] = L(() => ({
    source: null,
    translated: null
  })), [X, J] = L(
    vt
  ), [K, oe] = L({
    loading: !0,
    percent: 4,
    text: Re.boot,
    stage: "progress",
    failed: !1
  });
  return $(() => {
    const se = new AbortController(), U = h.current.value, G = Na({
      sessionEpochRef: h,
      closingRef: g,
      abort: se,
      sessionEpoch: U
    });
    y.current = se;
    const Q = un();
    if (g.current)
      return se.abort(), () => {
        y.current === se && (y.current = null);
      };
    function ee(te, V) {
      G.markFailed(), oe({
        loading: !1,
        percent: 100,
        text: te,
        stage: "failed",
        failed: !0
      }), Jt({ percent: 100, text: V, stage: "failed" });
    }
    function de() {
      R(!0), oe({
        loading: !1,
        percent: 100,
        text: Re.ready,
        stage: "ready",
        failed: !1
      }), Jt({ percent: 100, text: Re.ready, stage: "ready" });
    }
    function he() {
      return c != null && c.documentId ? jn(
        c.documentId,
        c.revision
      ) : Xo() ? Qo : Q.resolveResourceUrl(`/api/v1/documents/${encodeURIComponent(r)}/source.pdf`);
    }
    async function pe() {
      let te = { activeJobId: "", activeVersionId: "" };
      try {
        const ge = await Q.fetchProtected(
          Q.resolveResourceUrl(`/api/v1/documents/${encodeURIComponent(r)}`)
        );
        if (ge != null && ge.ok) {
          const Ce = await ge.json().catch(() => null);
          te = wa(Ce);
        }
      } catch {
      }
      const V = Sa({
        link: te,
        rejectedDocumentJobId: o,
        hasCommittedSource: !!c
      });
      if (V.kind === "follow-active-job") {
        if (G.isInactive()) return;
        d({
          type: "resolved-document-job",
          documentId: r,
          jobId: V.jobId
        }), V.activeVersionId ? (c || d({
          type: "committed-source",
          documentId: r,
          revision: V.activeVersionId,
          sessionIdentity: i
        }), m("source")) : m("compare");
        return;
      }
      if (V.kind === "open-committed-source") {
        if (G.isInactive()) return;
        d({
          type: "committed-source",
          documentId: r,
          revision: V.revision,
          sessionIdentity: i
        }), m("source");
        return;
      }
      const ae = he();
      if (G.isInactive()) return;
      S(ae), P(""), A(""), f(i);
      const Pe = await Vt({
        url: ae,
        label: "正在下载原文 PDF…",
        percentStart: 30,
        percentEnd: 85,
        fence: G,
        setBoot: oe
      });
      if (!G.isInactive()) {
        if (!Pe) {
          ee("源文件不可用：该文档没有可读取的源 PDF。", "源文件下载失败");
          return;
        }
        M(Pe), de();
      }
    }
    async function j() {
      var yt;
      const te = await ((yt = Q.loadSessionSnapshot) == null ? void 0 : yt.call(Q, {
        jobId: t,
        documentId: r,
        routeDocumentId: r,
        committedSource: c,
        includeOptionalArtifacts: !c
      })), V = te ? {
        jobPayload: te.sourcePayload,
        manifestPayload: te.manifestPayload,
        readerMetadata: te.readerMetadata,
        regionsPayload: te.regions,
        readerErrors: te.readerErrors
      } : await Q.loadReaderPayload(t, {
        // committedSource 分支会丢弃 regions/metadata（旧页序已失效），
        // 直接跳过这两个可选请求，避免无效网络往返。
        includeOptionalArtifacts: !c
      });
      if (G.isInactive()) return;
      let ae = null;
      if (n && !r) {
        try {
          ae = await Q.fetchDocumentByJobId(fn, t);
        } catch {
        }
        if (G.isInactive()) return;
      }
      const Pe = pa(V.jobPayload) || `${(ae == null ? void 0 : ae.document_id) || ""}`.trim();
      Pe && !r && d({
        type: "resolved-job-document",
        jobId: t,
        documentId: Pe
      });
      const ge = Pa({
        payloadDocumentId: Pe,
        linkedActiveJobId: `${(ae == null ? void 0 : ae.active_job_id) || ""}`.trim(),
        linkedActiveVersionId: `${(ae == null ? void 0 : ae.active_version_id) || ""}`.trim(),
        sessionJobId: t,
        hasCommittedSource: !!c
      });
      if (ge.kind === "restore-committed-source") {
        if (G.isInactive()) return;
        d({
          type: "committed-source",
          documentId: ge.documentId,
          revision: ge.revision,
          sessionIdentity: i
        }), m("source");
        return;
      }
      const Ce = Q.resolveReaderSourcePdf(V.manifestPayload), gt = Q.resolveReaderTranslatedPdfUrl(V.jobPayload, V.manifestPayload), zt = typeof Ce == "string" ? Ce : Q.resolveReaderArtifactUrl(Ce), bt = r || Pe, Ie = c != null && c.documentId ? jn(
        c.documentId,
        c.revision
      ) : zt || (bt ? Q.resolveResourceUrl(`/api/v1/documents/${encodeURIComponent(bt)}/source.pdf`) : ""), Ae = c ? "" : gt || "";
      if (S(Ie || ""), P(Ae), A(ga(V.jobPayload, t)), u({
        jobPayload: V.jobPayload || null,
        manifestPayload: V.manifestPayload || null,
        sessionIdentity: i
      }), C(c ? [] : Ro(V.regionsPayload)), B(c ? { source: null, translated: null } : To(V.readerMetadata)), J(c ? vt : V.readerErrors ?? vt), !Ie && !Ae) {
        ee(Re.failed, Re.failed);
        return;
      }
      const Ue = await xa({
        sourceFinal: Ie || "",
        translatedFinal: Ae,
        fence: G,
        setBoot: oe
      });
      if (Ue.status !== "inactive") {
        if (Ue.status === "incomplete") {
          ee("PDF 下载失败，请重试", "PDF 下载失败");
          return;
        }
        M(Ue.sourceBytes), T(Ue.translatedBytes), de();
      }
    }
    async function ie() {
      R(!1), M(null), T(null), C([]), B({ source: null, translated: null }), J(vt), Rt(oe, 8, Re.metadata, "metadata");
      try {
        if (s) {
          await pe();
          return;
        }
        if (!t) {
          ee(Re.failed, Re.failed);
          return;
        }
        await j();
      } catch (te) {
        if (G.isClosedOrStale() || (te == null ? void 0 : te.name) === "AbortError") return;
        G.markFailed();
        const V = Number(te == null ? void 0 : te.status);
        if (Ia({
          status: V,
          jobId: n,
          routeDocumentId: r,
          documentJobId: a,
          sessionJobId: t
        })) {
          d({ type: "missing-document-job", documentId: r, jobId: t }), d({ type: "cleared-resolved-document-job" }), m("source");
          return;
        }
        const ae = te instanceof Error ? te.message : Re.failed;
        ee(ae, ae);
      }
    }
    return ie(), () => {
      se.abort(), y.current === se && (y.current = null);
    };
  }, [t, r, a, o, s, l, c, v, n, i, d, u, f, m]), {
    sourceUrl: w,
    translatedUrl: b,
    sourceFile: N,
    translatedFile: _,
    assetsReady: E,
    title: I,
    regions: D,
    readerMetadata: F,
    readerErrors: X,
    boot: K
  };
}
function Ca() {
  const e = x(!1), t = x(null), { locationKey: n, jobId: r, routeDocumentId: a, sessionIdentity: o } = ua(), s = x({ identity: "", value: 0 });
  s.current.identity !== o && (s.current = {
    identity: o,
    value: s.current.value + 1
  }, e.current = !1);
  const l = x(o), i = x(""), c = x(""), d = x(() => {
  }), u = k(() => d.current(), []), f = fa({
    routeDocumentId: a,
    jobId: r,
    sessionIdentity: o,
    sessionIdentityRef: l,
    documentIdRef: i,
    sessionJobIdRef: c,
    switchToSourceMode: u
  }), {
    sessionJobId: m,
    documentId: v,
    sourceOnly: h,
    sourceViewOnly: g
  } = f, { mode: y, setMode: w, switchSessionMode: S } = va(g);
  d.current = () => {
    S("source");
  }, l.current = o, i.current = v, c.current = m;
  const b = ba({
    sessionJobId: m,
    sessionIdentity: o,
    sessionIdentityRef: l,
    sessionJobIdRef: c,
    sessionEpochRef: s,
    closingRef: e
  }), {
    scopedJobPayload: P,
    scopedManifestPayload: N,
    jobStatus: M,
    jobTerminal: _,
    jobRefreshRevision: T,
    refreshJobArtifacts: E,
    refreshJobStatus: R
  } = b, I = La({
    sessionJobId: m,
    jobId: r,
    routeDocumentId: a,
    documentJobId: f.documentJobId,
    rejectedDocumentJobId: f.rejectedDocumentJobId,
    sourceOnly: h,
    locationKey: n,
    sessionIdentity: o,
    committedSource: f.activeCommittedDocumentSource,
    applyIdentityEvent: f.applyIdentityEvent,
    publishPayload: b.publishPayload,
    clearPayload: b.clearPayload,
    switchSessionMode: S,
    jobRefreshRevision: T,
    sessionEpochRef: s,
    closingRef: e,
    activeLoadAbortRef: t
  }), A = k(() => {
    var C;
    e.current = !0, (C = t.current) == null || C.abort();
  }, []), D = q(
    () => ({
      fetchProtected: un().fetchProtected,
      jobId: m,
      jobPayload: P,
      manifestPayload: N,
      sourceUrl: I.sourceUrl,
      translatedUrl: I.translatedUrl,
      sourceOnly: g
    }),
    [m, P, N, I.sourceUrl, I.translatedUrl, g]
  );
  return {
    jobId: m,
    jobStatus: M,
    workflow: `${(P == null ? void 0 : P.workflow) || ""}`.trim().toLowerCase(),
    jobTerminal: _,
    documentId: v,
    sessionIdentity: o,
    sourceOnly: h,
    mode: y,
    setMode: w,
    sourceUrl: I.sourceUrl,
    translatedUrl: I.translatedUrl,
    sourceFile: I.sourceFile,
    translatedFile: I.translatedFile,
    assetsReady: I.assetsReady,
    boot: I.boot,
    title: I.title,
    regions: I.regions,
    readerMetadata: I.readerMetadata,
    readerErrors: I.readerErrors,
    download: D,
    refreshJobArtifacts: E,
    refreshJobStatus: R,
    refreshCommittedDocument: f.refreshCommittedDocument,
    prepareClose: A
  };
}
const za = 160, Da = 8, _a = 960;
function Oa() {
  const e = x(null), [t, n] = L(null), [r, a] = L(_a), o = k((s) => {
    e.current = s, n(s);
  }, []);
  return $(() => {
    const s = t;
    if (!s || typeof ResizeObserver > "u")
      return;
    const l = (c) => {
      !Number.isFinite(c) || c < za || a((d) => Math.abs(d - c) < Da ? d : c);
    }, i = new ResizeObserver((c) => {
      var d, u;
      l(((u = (d = c[0]) == null ? void 0 : d.contentRect) == null ? void 0 : u.width) ?? s.clientWidth);
    });
    return i.observe(s), l(s.clientWidth), () => i.disconnect();
  }, [t]), {
    shellRef: e,
    shellEl: t,
    shellWidth: r,
    bindShell: o
  };
}
function Fa(e) {
  const { mode: t, sourceOnly: n, assetsReady: r, hasSource: a, hasTranslated: o } = e, s = r && a, l = r && o && !n, i = t === "source" || t === "compare", c = !n && (t === "translated" || t === "compare");
  return {
    mountSource: s,
    mountTranslated: l,
    showSource: i,
    showTranslated: c,
    compareMode: t === "compare" && i && c && s && l,
    primaryPane: t === "translated" ? "translated" : "source"
  };
}
const _t = { source: 0, translated: 0 };
function $a(e, t) {
  const {
    mode: n,
    sourceOnly: r,
    assetsReady: a,
    sourceUrl: o,
    translatedUrl: s,
    sourceFile: l,
    translatedFile: i
  } = e, c = `${(t == null ? void 0 : t.identityKey) || ""}\0${o}\0${s}`, d = x(c);
  d.current = c;
  const [u, f] = L(() => ({
    identity: c,
    pages: _t
  })), [m, v] = L(() => ({ identity: c, tick: 0 })), h = u.identity === c ? u.pages : _t, g = m.identity === c ? m.tick : 0, y = Fa({
    mode: n,
    sourceOnly: r,
    assetsReady: a,
    hasSource: !!l || !!o,
    hasTranslated: !!i
  }), { primaryPane: w } = y, S = k((R, I) => {
    d.current === c && f((A) => {
      const D = A.identity === c ? A.pages : _t;
      return D[I] === R && A.identity === c ? A : {
        identity: c,
        pages: { ...D, [I]: R }
      };
    });
  }, [c]), b = x(null), P = k(() => {
    b.current && clearTimeout(b.current);
    const R = c;
    b.current = setTimeout(() => {
      b.current = null, d.current === R && v((I) => ({
        identity: R,
        tick: I.identity === R ? I.tick + 1 : 1
      }));
    }, 60);
  }, [c]);
  $(() => (b.current && (clearTimeout(b.current), b.current = null), f((R) => R.identity === c && R.pages.source === 0 && R.pages.translated === 0 ? R : { identity: c, pages: { source: 0, translated: 0 } }), v((R) => R.identity === c && R.tick === 0 ? R : { identity: c, tick: 0 }), () => {
    b.current && (clearTimeout(b.current), b.current = null);
  }), [c]);
  const N = q(
    () => Math.max(h.source, h.translated),
    [h]
  ), M = w === "translated" ? h.translated : h.source || h.translated, _ = t == null ? void 0 : t.userZoom, T = t == null ? void 0 : t.shellWidth, E = `${c}-${g}-${_}-${n}-${h.source}-${h.translated}-${T}`;
  return {
    ...y,
    numPagesByPane: h,
    hudNumPages: N,
    primaryNumPages: M,
    metricsTick: g,
    onNumPages: S,
    onMetrics: P,
    rowSyncRevision: E
  };
}
const Ge = "data-reader-page", Ye = "data-reader-pane", mn = "data-natural-height", ja = "reader-react-root", Ua = "reader-react-grid", Ba = "reader-react-scroll-shell", Ha = "reader-react-pdf-pane", xr = "reader-react-pdf-page", Tt = "reader-react-pdf-page-placeholder", pn = "reader-react-pdf-page-slot";
function lt(e, t) {
  const n = e != null ? `[${Ge}="${e}"]` : `[${Ge}]`;
  return t ? `${n}[${Ye}="${t}"]` : n;
}
function Wa() {
  return `.${pn}[${Ge}]`;
}
function Lt(e) {
  return Number(e.getAttribute(Ge));
}
const Lr = 0.25, Cr = 1, Ja = 0.05, pt = 0.5, Ka = 16, qa = 8;
function ot(e) {
  return pt;
}
function Ct(e) {
  return Number.isFinite(e) ? Math.min(Cr, Math.max(Lr, e)) : pt;
}
function dt(e, t) {
  const n = Ct(Number(e) + t * Ja);
  return Math.round(n * 100) / 100;
}
function Va(e) {
  return Math.round(Ct(e) * 100);
}
function Ga(e) {
  const n = (Number(e) || 0) - Ka - qa;
  return Math.max(160, Math.floor(n));
}
function Ya(e, t = pt) {
  const n = Ct(t);
  return Ga((Number(e) || 0) * n);
}
function Za(e, t) {
  if (!e || !Number.isFinite(t) || t <= 0 || Math.abs(t - 1) < 1e-3)
    return;
  const n = e.scrollLeft + e.clientWidth / 2, r = e.scrollTop + e.clientHeight / 2, a = Array.from(
    e.querySelectorAll(`[${Ye}]`)
  ).map((s) => ({
    pane: s,
    cx: s.scrollLeft + s.clientWidth / 2,
    hadOverflow: s.scrollWidth > s.clientWidth + 1
  })), o = () => {
    e.scrollLeft = Math.max(0, n * t - e.clientWidth / 2), e.scrollTop = Math.max(0, r * t - e.clientHeight / 2);
    for (const { pane: s, cx: l, hadOverflow: i } of a) {
      const c = Math.max(0, s.scrollWidth - s.clientWidth);
      if (c <= 0) {
        s.scrollLeft = 0;
        continue;
      }
      i ? s.scrollLeft = Math.min(
        c,
        Math.max(0, l * t - s.clientWidth / 2)
      ) : s.scrollLeft = c / 2;
    }
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(o);
  });
}
const Xa = "retainpdf:reader:view:v1:", Bn = /* @__PURE__ */ new Set([
  "source",
  "translated",
  "markdown",
  "ai"
]), Qa = /* @__PURE__ */ new Set([
  "source",
  "compare",
  "translated"
]);
function zr() {
  try {
    return typeof globalThis.localStorage > "u" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
function Gt(e) {
  return `${e || ""}`.trim();
}
function es({
  documentId: e,
  jobId: t
}) {
  const n = Gt(e);
  if (n) return `document:${n}`;
  const r = Gt(t);
  return r ? `job:${r}` : "";
}
function Dr(e) {
  const t = Gt(e);
  return t ? `${Xa}${t}` : "";
}
function ts(e) {
  if (!e || typeof e != "object") return;
  const t = Math.floor(Number(e.page)), n = Number(e.fraction);
  if (!(!Number.isFinite(t) || t < 1 || !Number.isFinite(n)))
    return {
      page: t,
      fraction: Math.max(0, Math.min(1, n))
    };
}
function ns(e) {
  if (e === null) return null;
  if (!e || typeof e != "object") return;
  const t = `${e.left || ""}`, n = `${e.right || ""}`;
  if (!(!Bn.has(t) || !Bn.has(n) || t === n))
    return { left: t, right: n };
}
function rs(e) {
  return e === null ? null : e === "markdown" || e === "ai" ? e : void 0;
}
function os(e) {
  return Qa.has(e) ? e : void 0;
}
function _r(e) {
  if (!e || typeof e != "object") return null;
  const t = e;
  if (t.schema !== "retainpdf_reader_view_v1") return null;
  const n = ts(t.anchor), r = Number(t.zoom), a = os(t.mode), o = ns(t.splitLayout), s = rs(t.assistantPanel);
  return {
    schema: "retainpdf_reader_view_v1",
    ...n ? { anchor: n } : {},
    ...Number.isFinite(r) ? { zoom: Math.max(0.25, Math.min(1, r)) } : {},
    ...a !== void 0 ? { mode: a } : {},
    ...o !== void 0 ? { splitLayout: o } : {},
    ...s !== void 0 ? { assistantPanel: s } : {},
    updatedAt: Number.isFinite(Number(t.updatedAt)) ? Number(t.updatedAt) : 0
  };
}
function Ee(e, t = zr()) {
  const n = Dr(e);
  if (!n || !t) return null;
  try {
    const r = t.getItem(n);
    return r ? _r(JSON.parse(r)) : null;
  } catch {
    return null;
  }
}
function Et(e, t, n = zr()) {
  const r = Dr(e);
  if (!r || !n) return null;
  const a = Ee(e, n), o = _r({
    schema: "retainpdf_reader_view_v1",
    ...a || {},
    ...t,
    updatedAt: Date.now()
  });
  if (!o) return null;
  try {
    return n.setItem(r, JSON.stringify(o)), o;
  } catch {
    return null;
  }
}
function as(e, t, n = "") {
  const [r, a] = L(() => {
    var u;
    return ((u = Ee(n)) == null ? void 0 : u.zoom) ?? ot();
  }), o = x(r), s = x(n);
  o.current = r;
  const l = x(1);
  $(() => {
    var f;
    if (s.current === n) return;
    s.current = n;
    const u = ((f = Ee(n)) == null ? void 0 : f.zoom) ?? ot();
    l.current = 1, o.current = u, a(u);
  }, [e, n]);
  const i = k((u) => {
    const f = Ct(u), m = o.current;
    Math.abs(f - m) < 5e-4 || (l.current = f / (m || 1), Et(s.current, { zoom: f }), a(f));
  }, []), c = k((u) => {
    i(dt(o.current, u));
  }, [i]), d = k((u) => {
    i(ot());
  }, [i]);
  return Fe(() => {
    const u = l.current;
    Math.abs(u - 1) < 1e-3 || (l.current = 1, Za(t == null ? void 0 : t.current, u));
  }, [r, t]), { userZoom: r, onZoomChange: i, stepZoom: c, resetZoom: d };
}
function ss(e, t = !0) {
  const [n, r] = L(null), a = k(() => {
    var l, i;
    r(null);
    const s = (l = globalThis.getSelection) == null ? void 0 : l.call(globalThis);
    (i = s == null ? void 0 : s.removeAllRanges) == null || i.call(s);
  }, []), o = e.current ?? null;
  return $(() => {
    if (!t)
      return;
    const s = () => {
      var C, F;
      const h = e.current, g = (C = globalThis.getSelection) == null ? void 0 : C.call(globalThis);
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
      const b = (F = S == null ? void 0 : S.closest) == null ? void 0 : F.call(
        S,
        lt()
      );
      if (!b || !h.contains(b)) {
        r(null);
        return;
      }
      const P = Math.max(1, Math.floor(Lt(b) || 1)), M = b.getAttribute(Ye) === "translated" ? "translated" : "source", _ = y.getClientRects(), T = _[_.length - 1] || y.getBoundingClientRect();
      if (!T || T.width === 0 && T.height === 0) {
        r(null);
        return;
      }
      const E = typeof window < "u" ? window.innerWidth : 800, R = typeof window < "u" ? window.innerHeight : 600, I = 16, A = Math.min(Math.max(I, T.left), E - I), D = Math.min(Math.max(I, T.top), R - I);
      r({
        selectionType: "text",
        quote: w,
        page: P,
        pane: M,
        rect: {
          left: A,
          top: D,
          width: T.width,
          height: T.height
        }
      });
    }, l = () => {
      window.setTimeout(s, 0);
    }, i = () => {
      l();
    }, c = () => l(), d = () => l(), u = () => {
      l();
    }, f = (h) => {
      h.key === "Escape" && a();
    }, m = () => {
      r((h) => h && null);
    };
    document.addEventListener("mouseup", i), document.addEventListener("pointerup", c), document.addEventListener("touchend", d), document.addEventListener("selectionchange", u), document.addEventListener("keyup", f);
    const v = o ?? e.current;
    return v == null || v.addEventListener("scroll", m, { passive: !0 }), window.addEventListener("scroll", m, { passive: !0, capture: !0 }), () => {
      document.removeEventListener("mouseup", i), document.removeEventListener("pointerup", c), document.removeEventListener("touchend", d), document.removeEventListener("selectionchange", u), document.removeEventListener("keyup", f), v == null || v.removeEventListener("scroll", m), window.removeEventListener("scroll", m, !0);
    };
  }, [t, o, a]), { selection: n, clearSelection: a };
}
function is(e) {
  const { mode: t, setMode: n, beginModeSwitch: r } = e, a = x(t), o = x(n), s = x(r);
  return a.current = t, o.current = n, s.current = r, { setModeKeepingPage: k((i) => {
    i !== a.current && (s.current(), o.current(i));
  }, []) };
}
function cs() {
  const [e, t] = L(null), n = k((s) => {
    t(s);
  }, []), r = k((s = null) => {
    t((l) => !s || l === s ? null : l);
  }, []), a = k((s) => {
    t((l) => l === s ? null : s);
  }, []), o = k(
    (s) => e === s,
    [e]
  );
  return { active: e, open: n, close: r, toggle: a, isOpen: o };
}
const hn = 48;
function Or(e, t = hn) {
  return e.getBoundingClientRect().top + t;
}
function Fr(e, t) {
  if (!e.length)
    return null;
  let n = null, r = -1 / 0;
  for (const i of e) {
    const c = i.getBoundingClientRect();
    c.height < 8 || c.width < 8 || c.top <= t + 1 && c.top >= r && (n = i, r = c.top);
  }
  if (!n && (n = e.find((c) => {
    const d = c.getBoundingClientRect();
    return d.height >= 8 && d.width >= 8;
  }) ?? null, n)) {
    const c = [...e].reverse().find((d) => {
      const u = d.getBoundingClientRect();
      return u.height >= 8 && u.width >= 8;
    });
    c && c.getBoundingClientRect().bottom < t && (n = c);
  }
  if (!n)
    return null;
  const a = Lt(n);
  if (!Number.isFinite(a) || a < 1)
    return null;
  const o = n.getBoundingClientRect(), s = o.height > 0 ? o.height : 1, l = Math.min(1, Math.max(0, (t - o.top) / s));
  return { el: n, page: a, fraction: l };
}
function Ot(e, t, n = hn) {
  if (!e)
    return null;
  const r = lt(void 0, t), a = Array.from(e.querySelectorAll(r));
  if (!a.length || e.getBoundingClientRect().height <= 0)
    return null;
  const s = Or(e, n), l = Fr(a, s);
  return l ? { page: l.page, fraction: l.fraction } : null;
}
function gn(e, t, n = "auto", r, a = hn) {
  if (!e || !t)
    return !1;
  const o = Math.max(1, Math.floor(Number(t.page) || 1)), s = Math.min(1, Math.max(0, Number(t.fraction) || 0));
  let l = null;
  if (r && (l = e.querySelector(lt(o, r))), l || (l = e.querySelector(lt(o))), !l)
    return !1;
  const i = e.getBoundingClientRect(), c = l.getBoundingClientRect();
  if (i.height <= 0 || c.height < 8 && l.offsetHeight < 8)
    return !1;
  const d = c.height > 0 ? c.height : l.offsetHeight, u = e.scrollTop + (c.top - i.top), f = Math.max(0, u + s * d - a);
  return n === "auto" ? e.scrollTop = f : e.scrollTo({ top: f, behavior: n }), !0;
}
function ls(e, t, n = "smooth", r) {
  return gn(
    e,
    { page: t, fraction: 0 },
    n,
    r
  );
}
function Yt(e, t, n) {
  const r = (n == null ? void 0 : n.behavior) ?? "auto", a = (n == null ? void 0 : n.delaysMs) ?? [0, 32, 120, 280];
  let o = !1, s = !1;
  const l = [], i = () => {
    var d;
    if (o) return;
    gn(
      e(),
      t,
      r,
      n == null ? void 0 : n.pane
    ) && !s && (s = !0, (d = n == null ? void 0 : n.onDone) == null || d.call(n));
  };
  for (const c of a)
    c <= 0 ? requestAnimationFrame(() => {
      requestAnimationFrame(i);
    }) : l.push(setTimeout(i, c));
  return () => {
    o = !0;
    for (const c of l)
      clearTimeout(c);
  };
}
function ds(e, t, n) {
  return Yt(
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
function be(e) {
  return {
    page: Math.max(1, Math.floor(Number(e.page) || 1)),
    fraction: Math.min(1, Math.max(0, Number(e.fraction) || 0))
  };
}
function us(e, t, n = !0, r = "", a) {
  const [o, s] = L(1);
  return $(() => {
    if (!n || t <= 0) {
      s(1);
      return;
    }
    const l = e.current;
    if (!l)
      return;
    let i = !1, c = null, d = 0;
    const u = lt(void 0, a), f = () => {
      if (i) return;
      const h = Array.from(l.querySelectorAll(u));
      if (!h.length)
        return;
      const g = Or(l), y = Fr(h, g);
      y && s(y.page);
    }, m = () => {
      i || (d && cancelAnimationFrame(d), d = requestAnimationFrame(() => {
        d = 0, f();
      }));
    }, v = () => {
      if (i) return;
      if (!Array.from(l.querySelectorAll(u)).length) {
        c = setTimeout(v, 120);
        return;
      }
      f(), l.addEventListener("scroll", m, { passive: !0 });
    };
    return v(), () => {
      i = !0, c && clearTimeout(c), d && cancelAnimationFrame(d), l.removeEventListener("scroll", m);
    };
  }, [e, t, n, r, a]), o;
}
const fs = `canvas, .react-pdf__Page, .${xr}, .${Tt}`, Hn = /* @__PURE__ */ new WeakMap();
function ms(e) {
  const t = Number(e.getAttribute(mn));
  if (Number.isFinite(t) && t > 0)
    return t;
  let n = Hn.get(e);
  if ((n == null || !n.isConnected) && (n = e.querySelector(fs), Hn.set(e, n)), n) {
    const a = n.getBoundingClientRect().height;
    if (Number.isFinite(a) && a > 0)
      return a;
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
function hs(e) {
  const t = /* @__PURE__ */ new Map();
  e.querySelectorAll(Wa()).forEach((r) => {
    const a = Lt(r);
    if (!Number.isFinite(a) || a < 1) return;
    const o = ms(r);
    if (o <= 0) return;
    const s = t.get(a) || { height: 0, count: 0 };
    s.height = Math.max(s.height, o), s.count += 1, t.set(a, s);
  });
  const n = /* @__PURE__ */ new Map();
  return t.forEach((r, a) => {
    r.count >= 2 && r.height > 0 && n.set(a, Math.ceil(r.height));
  }), n;
}
function gs(e, t, n = "", r) {
  const [a, o] = L(() => /* @__PURE__ */ new Map()), s = x(a), l = x(r);
  return l.current = r, Fe(() => {
    if (!t) {
      s.current.size !== 0 && (s.current = /* @__PURE__ */ new Map(), o(s.current));
      return;
    }
    let i = !1, c = 0, d = !1, u = !1;
    const f = () => {
      var P;
      if (i) return;
      const S = e.current;
      if (!S) return;
      const b = hs(S);
      ps(s.current, b) || (s.current = b, o(b)), d && !u && (u = !0, (P = l.current) == null || P.call(l));
    }, m = () => {
      cancelAnimationFrame(c), c = requestAnimationFrame(() => {
        requestAnimationFrame(f);
      });
    };
    m();
    const v = window.setTimeout(m, 100), h = window.setTimeout(() => {
      d = !0, m();
    }, 300), g = window.setTimeout(m, 700), y = e.current;
    let w = null;
    return y && typeof ResizeObserver < "u" && (w = new ResizeObserver(() => m()), w.observe(y)), () => {
      i = !0, cancelAnimationFrame(c), window.clearTimeout(v), window.clearTimeout(h), window.clearTimeout(g), w == null || w.disconnect();
    };
  }, [e, t, n]), a;
}
const bs = [0, 48, 140, 320, 560], ys = 700, vs = [80, 200, 400], ws = 500, Ss = 50, Ps = 180, Wn = [0, 48, 140, 320, 700, 1200];
function Is(e, t) {
  var R;
  const {
    primaryPane: n,
    mode: r,
    enabled: a = !0,
    persistenceKey: o = "",
    restoreReady: s = !0
  } = t, l = x(
    ((R = Ee(o)) == null ? void 0 : R.anchor) || { page: 1, fraction: 0 }
  ), i = x(null), c = x(!!o), d = x(r), u = x(null), f = x(null), m = x(null), v = x(null), h = x(o), g = x(""), y = x(n);
  y.current = n;
  const w = k(() => {
    var I;
    (I = u.current) == null || I.call(u), u.current = null, f.current != null && (clearTimeout(f.current), f.current = null);
  }, []), S = k((I = !1) => {
    v.current != null && (clearTimeout(v.current), v.current = null);
    const A = () => {
      v.current = null, Et(h.current, {
        anchor: be(l.current)
      });
    };
    I ? A() : v.current = setTimeout(A, Ps);
  }, []), b = k((I) => {
    l.current = be(I), i.current = null, m.current != null && clearTimeout(m.current), m.current = setTimeout(() => {
      m.current = null, c.current = !1;
    }, Ss);
  }, []);
  $(() => {
    if (!a)
      return;
    let I = !1, A = null, D = null, C = null;
    const F = () => {
      w(), m.current != null && (clearTimeout(m.current), m.current = null), c.current = !1, i.current = null, g.current = h.current;
    }, B = (J) => {
      if (J.ctrlKey || J.metaKey || J.altKey) return;
      const K = J.target;
      K != null && K.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes((K == null ? void 0 : K.tagName) || "") || ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(J.key) && F();
    }, X = () => {
      if (I) return;
      const J = e.current;
      if (!J) {
        C = setTimeout(X, 50);
        return;
      }
      A = J, D = () => {
        if (c.current)
          return;
        const K = Ot(A, y.current);
        K && (l.current = K, S());
      }, A.addEventListener("scroll", D, { passive: !0 }), A.addEventListener("wheel", F, { passive: !0 }), A.addEventListener("touchmove", F, { passive: !0 }), window.addEventListener("keydown", B), c.current || D();
    };
    return X(), () => {
      I = !0, C != null && clearTimeout(C), A && D && (A.removeEventListener("scroll", D), A.removeEventListener("wheel", F), A.removeEventListener("touchmove", F)), window.removeEventListener("keydown", B);
    };
  }, [a, r, n, e, S, w]), Fe(() => {
    var A;
    if (h.current === o) return;
    S(!0), w(), m.current != null && (clearTimeout(m.current), m.current = null), h.current = o, g.current = "";
    const I = (A = Ee(o)) == null ? void 0 : A.anchor;
    l.current = I ? be(I) : { page: 1, fraction: 0 }, i.current = null, c.current = !!o, d.current = r;
  }, [o, r, S, w]), $(() => {
    var A;
    if (!a || !s || !o || g.current === o) return;
    g.current = o;
    const I = be(
      ((A = Ee(o)) == null ? void 0 : A.anchor) || { page: 1, fraction: 0 }
    );
    return l.current = I, i.current = I, c.current = !0, w(), u.current = Yt(
      () => e.current,
      I,
      {
        behavior: "auto",
        pane: y.current,
        delaysMs: Wn,
        onDone: () => b(I)
      }
    ), f.current = setTimeout(() => {
      f.current = null, b(I);
    }, Math.max(...Wn) + 160), () => w();
  }, [a, s, o, e, b, w]), $(() => {
    if (d.current === r)
      return;
    if (d.current = r, !a) {
      c.current = !1, i.current = null, w();
      return;
    }
    const I = i.current ? be(i.current) : be(l.current);
    return c.current = !0, i.current = I, l.current = I, w(), u.current = Yt(
      () => e.current,
      I,
      {
        behavior: "auto",
        pane: n,
        // 等页宽/行高同步后再钉；同一 locked 幂等，不会越滚越远
        delaysMs: bs,
        onDone: () => b(I)
      }
    ), f.current = setTimeout(() => {
      f.current = null, b(I);
    }, ys), () => {
      w();
    };
  }, [r, a, n, e, b, w]), $(() => () => {
    w(), m.current != null && (clearTimeout(m.current), m.current = null), S(!0);
  }, [w, S]);
  const P = k(() => {
    const I = Ot(
      e.current,
      y.current
    );
    return be(I || l.current);
  }, [e]), N = k(() => {
    c.current = !0;
    const I = Ot(
      e.current,
      y.current
    ), A = be(I ?? l.current);
    return l.current = A, i.current = A, S(), A;
  }, [e, S]), M = k((I, A, D) => {
    const C = D || y.current, F = Mt(I, A || 1), B = { page: F, fraction: 0 };
    l.current = B, c.current = !0, i.current = B, S(), w(), ls(e.current, F, "smooth", C), u.current = ds(
      () => e.current,
      F,
      {
        behavior: "auto",
        pane: C,
        delaysMs: vs,
        onDone: () => b(B)
      }
    ), f.current = setTimeout(() => {
      f.current = null, b(B);
    }, ws);
  }, [e, b, w, S]), _ = k(() => be(l.current), []), T = k(() => c.current, []), E = k(() => {
    if (!c.current || !i.current)
      return;
    const I = be(i.current);
    gn(
      e.current,
      I,
      "auto",
      y.current
    );
  }, [e]);
  return {
    lockFromShell: P,
    beginModeSwitch: N,
    goToPage: M,
    getAnchor: _,
    isRestoring: T,
    repinIfRestoring: E
  };
}
function Rs(e, t) {
  if (!e) return null;
  if (e.blockId && t) {
    const a = t(e.blockId);
    if (a != null && Number.isFinite(a) && a >= 1)
      return Math.floor(a);
  }
  if (e.pageIdx === null || e.pageIdx === void 0) return null;
  const n = Number(e.pageIdx);
  if (!Number.isFinite(n)) return null;
  const r = Math.floor(n) + 1;
  return r >= 1 ? r : null;
}
function $r(e, t, n) {
  const r = `${(n == null ? void 0 : n.jobId) || ""}`.trim(), a = `${(n == null ? void 0 : n.documentId) || ""}`.trim(), o = `j:${r}:d:${a}`;
  return t == null ? `${o}:none:${(e == null ? void 0 : e.blockId) || ""}` : `${o}:p:${t}:b:${(e == null ? void 0 : e.blockId) || ""}`;
}
const Ts = [0, 80, 200, 400, 800], Es = 120, Ms = 400;
function As(e, t, n) {
  const { enabled: r, numPages: a, goToPage: o, resolveBlockPage: s, onAnchorApplied: l, jobId: i, documentId: c } = e, d = x(o);
  d.current = o;
  const u = x(s);
  u.current = s;
  const f = x(l);
  f.current = l;
  const m = x(n);
  m.current = n, $(() => {
    var S, b;
    if (!r || !Number.isFinite(a) || a < 1)
      return;
    const v = ra(), h = Rs(v, u.current), g = $r(v, h, { jobId: i, documentId: c });
    if (t.current === g)
      return;
    if (h == null) {
      t.current = g, (S = m.current) == null || S.call(m);
      return;
    }
    t.current = g, v && ((b = f.current) == null || b.call(f, v, h));
    const y = [];
    let w = 0;
    for (const P of Ts)
      w = Math.max(w, P), y.push(
        setTimeout(() => {
          d.current(h);
        }, P)
      );
    return y.push(
      setTimeout(() => {
        var P;
        (P = m.current) == null || P.call(m);
      }, w + Es)
    ), () => {
      for (const P of y) clearTimeout(P);
    };
  }, [r, a, i, c, t]);
}
function ks(e) {
  var o;
  const t = globalThis.window;
  if (!t || typeof ((o = t.history) == null ? void 0 : o.replaceState) != "function") return;
  const n = t.location, r = `${e || ""}`, a = `${n.pathname}${r ? `?${r}` : ""}${n.hash || ""}`;
  t.history.replaceState(null, "", a);
}
function Ns(e, t, n) {
  const {
    syncEnabled: r,
    currentPage: a,
    resolveBlockPage: o,
    syncDebounceMs: s = Ms,
    jobId: l,
    documentId: i,
    applyReaderSearch: c
  } = e, d = x(o);
  d.current = o;
  const u = x(c);
  u.current = c;
  const f = x(0);
  $(() => {
    if (!n || !r || !t.current || !Number.isFinite(a) || a < 1 || f.current === a) return;
    const m = setTimeout(() => {
      var y;
      const v = ((y = globalThis.location) == null ? void 0 : y.search) || "", h = Io(v, a, d.current);
      if (f.current = a, h === null) return;
      const g = `${new URLSearchParams(h).get("block_id") || ""}`.trim();
      t.current = $r(
        { blockId: g },
        a,
        { jobId: l, documentId: i }
      ), (u.current || ks)(h);
    }, s);
    return () => clearTimeout(m);
  }, [
    n,
    r,
    a,
    s,
    l,
    i,
    t
  ]);
}
function xs(e) {
  const t = x(""), [n, r] = L(!1), a = k(() => r(!0), []), o = {
    enabled: e.enabled,
    numPages: e.numPages,
    goToPage: e.goToPage,
    resolveBlockPage: e.resolveBlockPage,
    onAnchorApplied: e.onAnchorApplied,
    jobId: e.jobId,
    documentId: e.documentId
  };
  As(o, t, a), Ns(e, t, n);
}
const et = {
  layoutByPage: /* @__PURE__ */ new Map(),
  pagesByPage: /* @__PURE__ */ new Map(),
  lastSeq: 0,
  connection: "idle",
  jobStatus: "",
  error: ""
};
function Ls(e) {
  return new Map(((e == null ? void 0 : e.pages) || []).map((t) => [t.page_idx, t]));
}
function Jn(e, t) {
  return e.attempt !== t.attempt ? e.attempt < t.attempt ? -1 : 1 : e.generation !== t.generation ? e.generation < t.generation ? -1 : 1 : 0;
}
function jr(e, t, n) {
  if (n.page_idx !== t.page_idx) return "retry";
  const r = Jn(n, t);
  if (r < 0 || r === 0 && n.page_hash !== t.page_hash) return "retry";
  if (!e) return "accept";
  const a = Jn(n, e);
  return a < 0 ? "ignore" : a === 0 ? n.page_hash === e.pageHash ? "ignore" : "retry" : "accept";
}
function Cs(e, t, n) {
  if (t.seq <= e.lastSeq) return e;
  const r = e.pagesByPage.get(t.page_idx), a = jr(r, t, n);
  if (a === "retry") return e;
  if (a === "ignore")
    return { ...e, lastSeq: t.seq, connection: "live", error: "" };
  const o = new Map(n.items.map((i) => [i.item_id, i])), s = new Map((r == null ? void 0 : r.changedAtSeqById) || []);
  for (const i of t.changed_item_ids)
    o.has(i) && s.set(i, t.seq);
  const l = new Map(e.pagesByPage);
  return l.set(t.page_idx, {
    attempt: n.attempt,
    generation: n.generation,
    pageHash: n.page_hash,
    itemsById: o,
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
const Kn = [250, 500, 1e3, 2e3, 4e3], Ft = [80, 160, 320, 640, 1e3, 1500], qn = [250, 500, 1e3, 2e3, 4e3, 5e3], zs = /* @__PURE__ */ new Set(["succeeded", "failed", "cancelled", "canceled"]);
function Zt(e, t) {
  return new Promise((n, r) => {
    if (t.aborted) {
      r(new DOMException("Aborted", "AbortError"));
      return;
    }
    const a = () => {
      clearTimeout(o), r(new DOMException("Aborted", "AbortError"));
    }, o = setTimeout(() => {
      t.removeEventListener("abort", a), n();
    }, e);
    t.addEventListener("abort", a, { once: !0 });
  });
}
function bn(e) {
  return ko(e) ? `${e.code || ""}`.trim() : "";
}
function wt(e, t) {
  const n = bn(e);
  return n === "LIVE_TRANSLATION_PAGE_NOT_COMMITTED" ? "尚未收到可显示的页面译文" : n === "LIVE_TRANSLATION_LAYOUT_NOT_READY" ? "正在等待 OCR 版面数据" : `${(e == null ? void 0 : e.message) || ""}`.trim() || t;
}
async function Ds(e, t, n, r, a) {
  let o = null;
  for (let s = 0; ; s += 1) {
    try {
      const i = await a.fetchPage(e, t.page_idx, { signal: r });
      if (jr(n.pagesByPage.get(t.page_idx), t, i) !== "retry")
        return i;
      o = No(
        "Authoritative page snapshot has not reached the event generation",
        409,
        "LIVE_TRANSLATION_SNAPSHOT_UNAVAILABLE"
      );
    } catch (i) {
      if ((i == null ? void 0 : i.name) === "AbortError") throw i;
      o = i;
      const c = bn(i);
      if (c && ![
        "LIVE_TRANSLATION_PAGE_NOT_COMMITTED",
        "LIVE_TRANSLATION_SNAPSHOT_UNAVAILABLE"
      ].includes(c)) throw i;
    }
    const l = Ft[Math.min(s, Ft.length - 1)];
    if (await Zt(l, r), s >= Ft.length + 2) throw o;
  }
}
function _s({
  jobId: e,
  jobStatus: t,
  enabled: n,
  liveTranslationPort: r = void 0
}) {
  const [a, o] = L(et), s = x(a), l = x("");
  s.current = a;
  const i = `${e || ""}`.trim(), c = `${t || ""}`.trim().toLowerCase(), d = zs.has(c) ? c : "";
  return $(() => {
    if (!n || !i) {
      l.current = "", s.current = et, o(et);
      return;
    }
    const u = r === void 0 ? na() : r, f = l.current === i;
    if (l.current = i, !u) {
      const S = {
        ...f ? s.current : et,
        connection: d ? "terminal" : "unavailable",
        jobStatus: c,
        error: "实时译文暂不可用"
      };
      s.current = S, o(S);
      return;
    }
    const m = new AbortController();
    let v = !1;
    const h = {
      ...f ? s.current : et,
      connection: d ? "terminal" : "connecting",
      jobStatus: c,
      error: ""
    };
    s.current = h, o(h);
    const g = (S) => {
      m.signal.aborted || o((b) => {
        const P = S(b);
        return s.current = P, P;
      });
    }, y = async () => {
      let S = 0;
      for (; !m.signal.aborted; )
        try {
          const b = await u.fetchLayout(i, { signal: m.signal });
          v = !0, g((P) => ({
            ...P,
            layoutByPage: Ls(b),
            jobStatus: c,
            error: ""
          }));
          return;
        } catch (b) {
          if ((b == null ? void 0 : b.name) === "AbortError") return;
          const P = bn(b);
          if (!(P === "LIVE_TRANSLATION_LAYOUT_NOT_READY" || !P)) {
            g((M) => ({
              ...M,
              connection: d ? "terminal" : "unavailable",
              jobStatus: c,
              error: wt(b, "实时译文暂不可用")
            }));
            return;
          }
          if (d) {
            g((M) => ({
              ...M,
              connection: "terminal",
              jobStatus: c,
              error: ""
            }));
            return;
          }
          g((M) => ({
            ...M,
            connection: "connecting",
            jobStatus: c,
            error: wt(b, "正在等待 OCR 版面数据")
          })), await Zt(Kn[Math.min(S, Kn.length - 1)], m.signal).catch(() => {
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
          jobStatus: c,
          // 保留已有错误：首页还没提交（lastSeq 为 0）时恰恰是最容易出错的阶段，
          // 此前这里把它清成空串，UI 于是一直显示「连接中」，用户看到的是
          // "正在努力"，实际可能已经在反复失败。
          error: b.error
        }));
        try {
          await u.streamEvents(i, {
            afterSeq: s.current.lastSeq,
            signal: m.signal,
            onEvent: async (b) => {
              if (b.seq <= s.current.lastSeq) return;
              let P;
              try {
                P = await Ds(
                  i,
                  b,
                  s.current,
                  m.signal,
                  u
                );
              } catch (N) {
                if ((N == null ? void 0 : N.name) === "AbortError" || m.signal.aborted) throw N;
                g((M) => ({
                  ...M,
                  lastSeq: Math.max(M.lastSeq, b.seq),
                  error: wt(N, "部分页面的实时译文暂时取不到")
                }));
                return;
              }
              g((N) => {
                const M = Cs(N, b, P);
                return d ? {
                  ...M,
                  connection: "terminal",
                  jobStatus: c
                } : {
                  ...M,
                  jobStatus: c
                };
              }), S = 0;
            }
          });
        } catch (b) {
          if ((b == null ? void 0 : b.name) === "AbortError" || m.signal.aborted) return;
          g((P) => ({
            ...P,
            connection: d ? "terminal" : "reconnecting",
            jobStatus: c,
            error: wt(b, "实时译文连接已中断，正在重连")
          }));
        }
        if (m.signal.aborted) return;
        if (d) {
          g((b) => ({
            ...b,
            connection: "terminal",
            jobStatus: c
          }));
          return;
        }
        await Zt(qn[Math.min(S, qn.length - 1)], m.signal).catch(() => {
        }), S += 1;
      }
    })(), () => m.abort();
  }, [n, r, i, d]), a;
}
const Os = 2e3;
function Fs(e) {
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
const $s = /* @__PURE__ */ new Set(["book", "translate"]);
function Ur(e) {
  return !!(e.jobId && e.sourceUrl && $s.has(e.workflow));
}
function js(e) {
  return !!(Ur(e) && !(e.jobStatus === "succeeded" && e.translatedUrl));
}
function Us() {
  const e = Ca(), t = Ur({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    workflow: e.workflow
  }), n = js({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    translatedUrl: e.translatedUrl,
    jobStatus: e.jobStatus,
    workflow: e.workflow
  }), r = _s({
    jobId: e.jobId,
    jobStatus: e.jobStatus,
    enabled: t
  }), a = cs(), { shellRef: o, shellEl: s, shellWidth: l, bindShell: i } = Oa(), c = es({
    documentId: e.documentId,
    jobId: e.jobId
  }), d = `${c}\0${e.jobId}\0${e.sourceUrl}\0${e.translatedUrl}`, { userZoom: u, onZoomChange: f } = as(e.mode, o, c), m = $a(
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
  } = Is(o, {
    primaryPane: m.primaryPane,
    mode: e.mode,
    enabled: !e.boot.loading,
    persistenceKey: c,
    restoreReady: m.primaryNumPages > 0
  });
  $(() => {
    g();
  }, [l, g]);
  const y = gs(
    o,
    m.compareMode,
    m.rowSyncRevision,
    g
  ), w = us(
    o,
    m.primaryNumPages,
    !e.boot.loading,
    `${e.mode}-${u}-${m.metricsTick}`,
    m.primaryPane
  ), S = k((U, G) => {
    var ee, de;
    const Q = Math.max(
      Number(m.hudNumPages) || 0,
      Number(m.primaryNumPages) || 0,
      Number((ee = m.numPagesByPane) == null ? void 0 : ee.source) || 0,
      Number((de = m.numPagesByPane) == null ? void 0 : de.translated) || 0
    );
    h(U, Q, G);
  }, [h, m.hudNumPages, m.primaryNumPages, m.numPagesByPane]), [b, P] = L(null), N = x(null), M = k((U) => {
    N.current && clearTimeout(N.current), P(U), U && (N.current = setTimeout(() => P(null), Os));
  }, []);
  $(() => () => {
    N.current && clearTimeout(N.current);
  }, []);
  const _ = k((U) => {
    const G = Dt(e.regions, U);
    return G ? _n(G, m.primaryPane).page : null;
  }, [e.regions, m.primaryPane]), T = k((U, G) => {
    const Q = G || m.primaryPane, ee = typeof U == "object" && U ? `${U.block_id || ""}`.trim() : "", de = typeof U == "object" && U ? `${U.image_url || ""}`.trim() : "", he = typeof U == "object" && U ? U.page_idx != null ? Number(U.page_idx) + 1 : U.page != null ? Number(U.page) : null : typeof U == "number" ? U + 1 : null, pe = Eo(e.regions, de, he) || Dt(e.regions, ee) || (typeof U == "object" ? Mo(e.regions, U) : null);
    let j = pe ? _n(pe, Q).page : null;
    j == null && (j = Fs(U)), !(j == null || j < 1) && (M(pe), S(j, Q));
  }, [M, S, m.primaryPane, e.regions]);
  xs({
    enabled: !e.boot.loading && !e.boot.failed && e.assetsReady,
    syncEnabled: !e.boot.loading && !e.boot.failed && e.assetsReady,
    numPages: m.hudNumPages || 0,
    currentPage: w,
    goToPage: S,
    resolveBlockPage: _,
    jobId: e.jobId,
    documentId: e.documentId,
    onAnchorApplied: (U) => {
      M(Dt(e.regions, U.blockId));
    }
  });
  const { setModeKeepingPage: E } = is({
    mode: e.mode,
    setMode: e.setMode,
    beginModeSwitch: v
  }), [R, I] = L(null), {
    selection: A,
    clearSelection: D
  } = ss(o, !e.boot.loading && !e.boot.failed), C = k(() => {
    I(null), D();
  }, [D]), F = k((U) => {
    D(), I(U);
  }, [D]);
  $(() => {
    A && I(null);
  }, [A]), $(() => {
    const U = o.current;
    if (!U) return;
    const G = () => I(null);
    return U.addEventListener("scroll", G, { passive: !0 }), () => U.removeEventListener("scroll", G);
  }, [s, o]);
  const B = A || R;
  $(() => {
    M(null), C();
  }, [d, M, C]);
  const X = !e.boot.loading && !e.boot.failed, J = q(() => a, [a.active, a.open, a.close, a.toggle, a.isOpen]), K = q(() => ({ bindShell: i, shellEl: s, shellWidth: l, shellRef: o }), [i, s, l, o]), oe = q(() => ({
    sourceUrl: e.sourceUrl,
    translatedUrl: e.translatedUrl,
    sourceFile: e.sourceFile,
    translatedFile: e.translatedFile
  }), [e.sourceUrl, e.translatedUrl, e.sourceFile, e.translatedFile]), se = q(() => ({
    session: e,
    boot: e.boot,
    sourceOnly: e.sourceOnly,
    mode: e.mode,
    userZoom: u,
    onZoomChange: f,
    shell: K,
    panes: m,
    sessionFiles: oe,
    rowHeights: y,
    goToPage: S,
    activeRegion: b,
    jumpToAnchor: T,
    setModeKeepingPage: E,
    download: e.download,
    showHud: X,
    tools: J,
    selection: B,
    clearSelection: C,
    selectRegion: F,
    viewStateKey: c,
    liveTranslation: r,
    liveTranslationAvailable: n
  }), [e, K, m, oe, y, S, b, T, E, X, J, B, C, F, u, f, c, r, n]);
  return q(() => ({
    ...se,
    currentPage: w
  }), [se, w]);
}
const Bs = [
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
], Hs = [
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
function Ws(e) {
  const t = e.length === 1 ? e.toLowerCase() : e;
  for (const n of Bs)
    if (n.keys.some(
      (a) => a.length === 1 ? a === t : a === e
    )) return n;
  return null;
}
function Js(e) {
  if (!(e instanceof HTMLElement))
    return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
function Ks(e) {
  const {
    mode: t,
    sourceOnly: n,
    setMode: r,
    userZoom: a,
    onZoomChange: o,
    currentPage: s,
    numPages: l,
    goToPage: i,
    enabled: c = !0
  } = e;
  $(() => {
    if (!c)
      return;
    const d = (u) => {
      if (u.defaultPrevented || u.metaKey || u.ctrlKey || u.altKey || Js(u.target))
        return;
      const f = u.key, m = Ws(f);
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
              o(dt(a, 1));
              return;
            case "zoom-out":
              o(dt(a, -1));
              return;
            case "zoom-reset":
              o(ot());
              return;
            case "next-page":
              i(Mt(s + 1, l));
              return;
            case "prev-page":
              i(Mt(s - 1, l));
              return;
            case "first-page":
              i(1);
              return;
            case "last-page":
              i(l);
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
    a,
    o,
    s,
    l,
    i
  ]);
}
const qs = "retainpdf:soft-reader-close";
function Vs() {
  return new URL("./index.html", window.location.href).href;
}
function Gs() {
  if (typeof window > "u" || window.self === window.top) return !1;
  try {
    return window.parent.postMessage(
      { type: qs },
      window.location.origin
    ), !0;
  } catch {
    return !1;
  }
}
function Ys(e, t, n) {
  if (n <= 1 || !e) return !1;
  try {
    const r = new URL(t), a = new URL(e, r);
    return a.origin === r.origin && !/reader\.html$/i.test(a.pathname) && !/detail\.html$/i.test(a.pathname);
  } catch {
    return !1;
  }
}
function Zs() {
  if (!(typeof window > "u") && !Gs()) {
    if (Ys(
      document.referrer,
      window.location.href,
      window.history.length
    )) {
      window.history.back();
      return;
    }
    window.location.assign(Vs());
  }
}
function Xs({ onBeforeClose: e } = {}) {
  return /* @__PURE__ */ z(
    "button",
    {
      id: "reader-close-home-btn",
      type: "button",
      className: "reader-close-home-btn",
      "aria-label": "返回主页",
      title: "返回主页",
      onClick: () => {
        e == null || e(), Zs();
      },
      children: [
        /* @__PURE__ */ p(Xe, { className: "reader-close-home-icon", size: 18, strokeWidth: 2.25, "aria-hidden": !0 }),
        /* @__PURE__ */ p("span", { className: "reader-close-home-label", children: "关闭" })
      ]
    }
  );
}
let Vn = !1;
function Qs() {
  if (Vn)
    return;
  const e = ct().resolvePdfjsVendorUrl("build/pdf.worker.mjs");
  e && (Ko.GlobalWorkerOptions.workerSrc = e, Vn = !0);
}
const ei = {
  formula: "公式",
  table: "表格",
  figure: "图片",
  text: "文字",
  region: "区域"
};
function ti({
  pane: e,
  width: t,
  height: n,
  regions: r,
  onSelect: a
}) {
  const o = r.flatMap((s) => {
    if (!Pr(s.region)) return [];
    const l = Nt(s, t, n);
    return l ? [{ highlight: s, rect: l }] : [];
  });
  return o.length ? /* @__PURE__ */ p("div", { className: "reader-structure-selection-layer", "aria-label": "PDF 结构选择层", children: o.map(({ highlight: s, rect: l }) => {
    const i = s.region, c = Ir(i), d = ei[c];
    return /* @__PURE__ */ z(
      "button",
      {
        type: "button",
        className: `reader-structure-selection-target is-${c}`,
        "data-reader-region-id": i.itemId,
        "data-reader-region-kind": c,
        style: l,
        "aria-label": `${d}区域，点击选择`,
        title: `${d} · 点击选择`,
        onClick: (u) => {
          u.stopPropagation();
          const f = u.currentTarget.getBoundingClientRect();
          a == null || a({
            selectionType: "region",
            region: i,
            kind: c,
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
          /* @__PURE__ */ p("span", { className: "sr-only", children: Rr(i, e) })
        ]
      },
      i.itemId
    );
  }) }) : null;
}
function ni(e, t, n) {
  return e.flatMap((r) => {
    if (Ir(r.region) !== "text") return [];
    const a = Nt(r, t, n);
    return a ? [{ itemId: r.itemId, highlight: r, rect: a }] : [];
  });
}
function Gn(e, t, n) {
  let r = null, a = Number.POSITIVE_INFINITY;
  for (const o of e) {
    const { rect: s } = o;
    if (t < s.left || t > s.left + s.width || n < s.top || n > s.top + s.height)
      continue;
    const l = s.width * s.height;
    l < a && (r = o, a = l);
  }
  return r;
}
function ri({ target: e }) {
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
function oi(e, t) {
  const n = e.page_idx + 1, r = {
    page: n,
    bbox: t.bbox,
    unit: "pdf_point",
    origin: "top_left",
    text: t.source_text
  }, a = {
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
    region: a,
    box: r,
    pageSize: { page: n, width: e.width, height: e.height }
  };
}
function ai(e, t, n, r) {
  if (!e || !t) return [];
  const a = [];
  for (const o of e.blocks) {
    const s = t.itemsById.get(o.item_id);
    if (!(s != null && s.translated_text)) continue;
    const l = Nt(
      oi(e, o),
      n,
      r
    );
    l && a.push({
      itemId: o.item_id,
      translatedText: s.translated_text,
      status: s.status,
      kind: o.kind,
      sourceText: o.source_text,
      typography: o.typography,
      rect: l,
      changedAtSeq: t.changedAtSeqById.get(o.item_id) || 0,
      changedNow: t.changedAtSeqById.get(o.item_id) === t.lastEventSeq
    });
  }
  return a;
}
const si = '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif', ii = 256, tt = /* @__PURE__ */ new Map();
function ci(e) {
  return `${e || ""}`.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function li(e) {
  const t = `${e || ""}`, { text: n, slots: r } = Go(t, { bareLatex: !0 }), a = ci(n), o = Yo(a, r);
  if (!r.length)
    return { fallbackHtml: o, richHtml: Promise.resolve(o), hasMath: !1 };
  let s = tt.get(t);
  if (!s && (s = Zo(a, r), tt.set(t, s), tt.size > ii)) {
    const l = tt.keys().next().value;
    l !== void 0 && tt.delete(l);
  }
  return { fallbackHtml: o, richHtml: s, hasMath: !0 };
}
function $t(e) {
  return /title|heading|header|display_formula|equation/i.test(e);
}
function Te(e) {
  const t = Number(e);
  return Number.isFinite(t) && t > 0 ? t : void 0;
}
function di(e, t) {
  const n = e.typography, r = Te(t) || 1, a = Te(n == null ? void 0 : n.font_size_pt), o = Math.max(1, `${e.sourceText || ""}`.split(/\n+/).length), s = e.rect.height / Math.max(1.28, o * 1.18), l = $t(e.kind) ? 24 : /caption|footnote|table/i.test(e.kind) ? 9.5 : 11, i = Math.max(5.5 * r, Math.min(s, l * r)), c = Te(n == null ? void 0 : n.fit_min_font_size_pt), d = Te(n == null ? void 0 : n.fit_max_font_size_pt), u = Math.max(3.5, (c || 5.5) * r), f = Math.max(
    u,
    d ? d * r : a ? a * r : i
  ), m = a ? a * r : i, v = Te(n == null ? void 0 : n.leading_em), h = [
    Te(n == null ? void 0 : n.padding_top_pt) || 0,
    Te(n == null ? void 0 : n.padding_right_pt) || 0,
    Te(n == null ? void 0 : n.padding_bottom_pt) || 0,
    Te(n == null ? void 0 : n.padding_left_pt) || 0
  ].map((g) => g * r);
  return {
    fontFamily: `${(n == null ? void 0 : n.font_family) || ""}`.trim() || si,
    fontSizePx: Math.max(u, Math.min(f, m)),
    minFontSizePx: u,
    maxFontSizePx: f,
    // Typst leading is the additional inter-line gap, unlike CSS line-height.
    lineHeight: v ? 1 + v : 1.3,
    fontWeight: (n == null ? void 0 : n.font_weight) || ($t(e.kind) ? 600 : 400),
    textAlign: ["left", "center", "right", "justify"].includes(`${(n == null ? void 0 : n.text_align) || ""}`) ? n == null ? void 0 : n.text_align : $t(e.kind) ? "center" : "justify",
    padding: h,
    exact: !!a
  };
}
function ui(e, t, n, r) {
  const { minFontSizePx: a, maxFontSizePx: o } = r, s = /* @__PURE__ */ new Map(), l = (u) => {
    const f = s.get(u);
    if (f !== void 0) return f;
    const { width: m, height: v } = e(u), h = m <= t + 0.5 && v <= n + 0.5;
    return s.set(u, h), h;
  };
  let i = a, c = o, d = Math.min(r.requestedFontSizePx, c);
  if (l(d)) {
    if (!r.exact) {
      i = d;
      for (let u = 0; u < 6 && c > i; u += 1) {
        const f = (i + c) / 2;
        l(f) ? (d = f, i = f) : c = f;
      }
    }
  } else {
    c = d, d = i;
    for (let u = 0; u < 8 && c > i; u += 1) {
      const f = (i + c) / 2;
      l(f) ? (d = f, i = f) : c = f;
    }
  }
  return Math.max(a, d);
}
const fi = 512, nt = /* @__PURE__ */ new Map();
let Xt = 0;
typeof document < "u" && document.fonts && (document.fonts.ready.then(() => {
  Xt += 1;
}).catch(() => {
}), typeof document.fonts.addEventListener == "function" && document.fonts.addEventListener("loadingdone", () => {
  Xt += 1;
}));
function mi(e, t, n, r) {
  return [
    Xt,
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
  const n = x(null), r = q(
    () => li(e.translatedText),
    [e.translatedText]
  ), [a, o] = L(r.fallbackHtml), s = q(
    () => di(e, t),
    [e, t]
  );
  $(() => {
    let u = !0;
    return o(r.fallbackHtml), r.hasMath && r.richHtml.then((f) => {
      u && o(f);
    }), () => {
      u = !1;
    };
  }, [r]), Fe(() => {
    const u = n.current;
    if (!u) return;
    const [f, m, v, h] = s.padding, g = Math.max(1, e.rect.width - h - m), y = Math.max(1, e.rect.height - f - v), w = mi(a, g, y, s);
    let S = nt.get(w);
    if (S === void 0 && (S = ui(
      (b) => (u.style.fontSize = `${b}px`, { width: u.scrollWidth, height: u.scrollHeight }),
      g,
      y,
      {
        minFontSizePx: s.minFontSizePx,
        maxFontSizePx: s.maxFontSizePx,
        requestedFontSizePx: s.fontSizePx,
        exact: s.exact
      }
    ), nt.set(w, S), nt.size > fi)) {
      const b = nt.keys().next().value;
      b !== void 0 && nt.delete(b);
    }
    u.style.fontSize = `${S.toFixed(2)}px`;
  }, [a, e.rect.height, e.rect.width, s]);
  const [l, i, c, d] = s.padding;
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
        padding: `${l}px ${i}px ${c}px ${d}px`
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
          dangerouslySetInnerHTML: { __html: a }
        }
      )
    }
  );
}
function hi({
  layoutPage: e,
  pageState: t,
  width: n,
  height: r
}) {
  const a = q(
    () => ai(e, t, n, r),
    [r, e, t, n]
  );
  return a.length ? /* @__PURE__ */ p(
    "div",
    {
      className: "reader-live-translation-overlay",
      "data-live-translation-page": e == null ? void 0 : e.page_idx,
      "data-live-translation-generation": t == null ? void 0 : t.generation,
      "aria-hidden": "true",
      children: a.map((o) => /* @__PURE__ */ p(
        pi,
        {
          item: o,
          pageScale: e != null && e.width ? n / e.width : 1
        },
        `${o.itemId}:${o.changedAtSeq}`
      ))
    }
  ) : null;
}
const gi = rn(hi), Br = 1.414;
function bi({
  pageNumber: e,
  width: t,
  devicePixelRatio: n,
  pane: r,
  active: a = !1,
  syncedMinHeight: o = 0,
  onMetrics: s,
  cachedAspect: l,
  onAspectChange: i,
  sentinelRef: c,
  regionHighlight: d = null,
  regionTargets: u = [],
  onSelectRegion: f,
  liveTranslationLayout: m,
  liveTranslationPage: v,
  showLiveTranslation: h = r === "source"
}) {
  const g = x(l ?? Br), [y, w] = L(g.current);
  $(() => {
    l != null && Math.abs(l - g.current) >= 1e-3 && (g.current = l, w(l));
  }, [l]);
  const S = x(c);
  S.current = c;
  const b = x((C) => {
    var F;
    (F = S.current) == null || F.call(S, C);
  }).current, P = Math.max(120, Math.floor(t * y)), N = Math.max(P, Math.ceil(o || 0)), M = Nt(d, t, P), _ = q(
    () => ni(u, t, P),
    [P, u, t]
  ), [T, E] = L(null), R = q(
    () => _.find((C) => C.itemId === T) || null,
    [T, _]
  ), I = (C) => {
    if (C.buttons !== 0) {
      E(null);
      return;
    }
    const F = C.currentTarget.getBoundingClientRect(), B = Gn(
      _,
      C.clientX - F.left,
      C.clientY - F.top
    ), X = (B == null ? void 0 : B.itemId) || null;
    E((J) => J === X ? J : X);
  }, A = (C) => {
    var X, J, K;
    if (!f || (J = (X = C.target) == null ? void 0 : X.closest) != null && J.call(X, ".reader-structure-selection-target") || `${((K = window.getSelection()) == null ? void 0 : K.toString()) || ""}`.trim()) return;
    const F = C.currentTarget.getBoundingClientRect(), B = Gn(
      _,
      C.clientX - F.left,
      C.clientY - F.top
    );
    B && f({
      selectionType: "region",
      region: B.highlight.region,
      kind: "text",
      page: B.highlight.box.page,
      pane: r === "translated" ? "translated" : "source",
      rect: {
        left: F.left + B.rect.left,
        top: F.top + B.rect.top,
        width: B.rect.width,
        height: B.rect.height
      }
    });
  }, D = (C) => {
    !Number.isFinite(C) || C <= 0 || Math.abs(g.current - C) < 1e-3 || (g.current = C, w(C), i == null || i(e, C));
  };
  return /* @__PURE__ */ z(
    "div",
    {
      ref: b,
      [Ge]: e,
      [Ye]: r,
      [mn]: P,
      className: pn,
      onPointerMoveCapture: I,
      onClick: A,
      onPointerLeave: () => E(null),
      style: {
        width: t,
        height: N,
        minHeight: N
      },
      children: [
        a ? /* @__PURE__ */ p(
          qo,
          {
            pageNumber: e,
            width: t,
            devicePixelRatio: n,
            renderTextLayer: !0,
            renderAnnotationLayer: !1,
            className: xr,
            loading: /* @__PURE__ */ p(
              "div",
              {
                className: Tt,
                style: { width: t, height: P }
              }
            ),
            onLoadSuccess: (C) => {
              try {
                const F = C.getViewport({ scale: 1 });
                if (F.width > 0) {
                  const B = F.height / F.width;
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
        M ? /* @__PURE__ */ p(
          "div",
          {
            className: "reader-react-pdf-region-highlight",
            "data-reader-region-id": d == null ? void 0 : d.itemId,
            style: M,
            "aria-hidden": "true"
          }
        ) : null,
        a && h ? /* @__PURE__ */ p(
          gi,
          {
            layoutPage: m,
            pageState: v,
            width: t,
            height: P
          }
        ) : null,
        /* @__PURE__ */ p(ri, { target: a ? R : null }),
        /* @__PURE__ */ p(
          ti,
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
const yi = rn(bi), jt = 5, vi = "120% 0px", wi = 120;
let Yn = 1;
const Zn = /* @__PURE__ */ new WeakMap();
function Si(e) {
  if (!e) return 0;
  const t = Zn.get(e);
  if (t) return t;
  const n = Yn;
  return Yn += 1, Zn.set(e, n), n;
}
function Pi() {
  const e = typeof window < "u" && window.devicePixelRatio || 1;
  return Math.max(1, Math.min(e, 2));
}
const Ii = mo(
  function({
    pane: t,
    url: n = "",
    preloadedFile: r = null,
    userZoom: a = 1,
    visible: o = !0,
    emptyLabel: s = "暂无 PDF",
    scrollRoot: l = null,
    pageWidthOverride: i = null,
    rowHeights: c,
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
  }, N) {
    Qs();
    const { file: M, loading: _, error: T } = ka(n, r), E = `${n}\0${Si(M)}`, R = x(E);
    R.current = E;
    const I = q(
      () => Ra(M),
      [M, n]
    ), [A, D] = L(0), [C, F] = L(""), [B, X] = L(null), [J, K] = L(480), oe = x(null), se = x(0), U = q(() => Pi(), []), G = q(() => ({
      cMapUrl: ct().resolvePdfjsVendorUrl("cmaps/"),
      cMapPacked: !0,
      standardFontDataUrl: ct().resolvePdfjsVendorUrl("standard_fonts/")
    }), []);
    on(N, () => B, [B]), $(() => {
      const O = (H) => {
        !Number.isFinite(H) || H < 80 || Math.abs(H - se.current) < 8 || (se.current = H, K(H));
      }, Y = i && i >= 80 ? i : (l == null ? void 0 : l.clientWidth) || 0;
      if (O(Y), !l || typeof ResizeObserver > "u" || i && i >= 80) return;
      const W = new ResizeObserver((H) => {
        var ne, re;
        const ce = ((re = (ne = H[0]) == null ? void 0 : ne.contentRect) == null ? void 0 : re.width) ?? l.clientWidth;
        !Number.isFinite(ce) || ce < 80 || (oe.current && clearTimeout(oe.current), oe.current = setTimeout(() => O(ce), 80));
      });
      return W.observe(l), () => {
        W.disconnect(), oe.current && clearTimeout(oe.current);
      };
    }, [i, l, o]);
    const Q = q(
      () => Ya(J, a),
      [J, a]
    ), [ee, de] = L(() => /* @__PURE__ */ new Map()), [he, pe] = L(() => /* @__PURE__ */ new Set()), [j, ie] = L(() => /* @__PURE__ */ new Set()), te = x(/* @__PURE__ */ new Map()), V = x(null), ae = x(/* @__PURE__ */ new Map()), Pe = k((O, Y) => {
      de((W) => {
        if (W.get(O) === Y) return W;
        const H = new Map(W);
        return H.set(O, Y), H;
      });
    }, []), ge = k((O, Y) => {
      const W = te.current, H = W.get(O);
      if (H && V.current)
        try {
          V.current.unobserve(H);
        } catch {
        }
      if (Y) {
        if (W.set(O, Y), V.current)
          try {
            V.current.observe(Y);
          } catch {
          }
      } else
        W.delete(O);
    }, []), Ce = x(/* @__PURE__ */ new Map()), gt = k((O) => {
      const Y = Ce.current;
      let W = Y.get(O);
      return W || (W = (H) => ge(O, H), Y.set(O, W)), W;
    }, [ge]);
    $(() => {
      if (typeof IntersectionObserver > "u") return;
      const O = ae.current, Y = new IntersectionObserver(
        (W) => {
          const H = [], ce = [];
          for (const ne of W) {
            const re = ne.target, me = Lt(re);
            Number.isFinite(me) && (ne.isIntersecting ? H : ce).push(me);
          }
          if ((H.length || ce.length) && pe((ne) => {
            let re = null;
            for (const me of H)
              ne.has(me) || (re = re || new Set(ne), re.add(me));
            for (const me of ce)
              ne.has(me) && (re = re || new Set(ne), re.delete(me));
            return re || ne;
          }), H.length) {
            for (const ne of H) {
              const re = O.get(ne);
              re && (clearTimeout(re), O.delete(ne));
            }
            ie((ne) => {
              let re = null;
              for (const me of H)
                ne.has(me) || (re = re || new Set(ne), re.add(me));
              return re || ne;
            });
          }
          for (const ne of ce)
            O.has(ne) || O.set(ne, setTimeout(() => {
              O.delete(ne), ie((re) => {
                if (!re.has(ne)) return re;
                const me = new Set(re);
                return me.delete(ne), me;
              });
            }, wi));
        },
        { root: l, rootMargin: vi, threshold: 0 }
      );
      V.current = Y;
      for (const W of te.current.values())
        try {
          Y.observe(W);
        } catch {
        }
      return () => {
        Y.disconnect(), V.current === Y && (V.current = null);
        for (const W of O.values()) clearTimeout(W);
        O.clear();
      };
    }, [l]), Fe(() => {
      D(0), F(""), pe(/* @__PURE__ */ new Set()), ie(/* @__PURE__ */ new Set()), de(/* @__PURE__ */ new Map()), te.current.clear();
      const O = ae.current;
      for (const Y of O.values()) clearTimeout(Y);
      O.clear(), m == null || m(0, t);
    }, [E, m, t]);
    const zt = k(
      ({ numPages: O }) => {
        R.current === E && (D(O), F(""), m == null || m(O, t), u == null || u({ numPages: O, pane: t }));
      },
      [E, u, m, t]
    ), bt = k(
      (O) => {
        if (R.current !== E) return;
        const Y = (O == null ? void 0 : O.message) || "PDF 解析失败";
        F(Y), D(0), m == null || m(0, t), f == null || f(O, t);
      },
      [E, f, m, t]
    ), Ie = q(
      () => A > 0 ? Array.from({ length: A }, (O, Y) => Y + 1) : [],
      [A]
    );
    $(() => {
      typeof IntersectionObserver < "u" || ie(new Set(Ie));
    }, [Ie]);
    const Ae = q(
      () => On(v, g, t),
      [v, g, t]
    ), Ue = q(() => {
      const O = /* @__PURE__ */ new Map();
      for (const Y of h) {
        const W = On(Y, g, t);
        if (!W) continue;
        const H = O.get(W.box.page) || [];
        H.push(W), O.set(W.box.page, H);
      }
      return O;
    }, [t, g, h]), yt = q(() => {
      if (A === 0) return /* @__PURE__ */ new Set();
      if (!(!!l && typeof IntersectionObserver < "u" && o)) return new Set(Ie);
      if (he.size === 0) {
        const W = Math.min(A, jt * 2 + 1);
        return new Set(Array.from({ length: W }, (H, ce) => ce + 1));
      }
      const Y = /* @__PURE__ */ new Set();
      for (const W of he)
        for (let H = -jt; H <= jt; H++) {
          const ce = W + H;
          ce >= 1 && ce <= A && Y.add(ce);
        }
      return Y;
    }, [A, Ie, l, o, he]), uo = !n || !!T || !!C, fo = n && (T || C) || s;
    return /* @__PURE__ */ z(
      "section",
      {
        ref: X,
        className: `reader-panel ${Ha}${o ? "" : " is-hidden"}`,
        [Ye]: t,
        "data-reader-engine": "react-pdf",
        "data-reader-visible": o ? "true" : "false",
        "data-live-translation-status": (w == null ? void 0 : w.jobStatus) || void 0,
        "aria-hidden": o ? void 0 : !0,
        "aria-label": t === "source" ? "原文 PDF" : "译文 PDF",
        children: [
          P ? /* @__PURE__ */ p("div", { className: "reader-react-pdf-pane-action", children: P }) : null,
          b ? /* @__PURE__ */ z("div", { className: "reader-live-translation-waiting", role: "status", children: [
            /* @__PURE__ */ p("span", { className: "reader-live-translation-waiting-dot", "aria-hidden": "true" }),
            /* @__PURE__ */ p("span", { children: b })
          ] }) : null,
          uo && !_ ? /* @__PURE__ */ p("div", { className: "reader-empty reader-react-pdf-empty", "data-reader-pdf-empty": t, children: fo }) : null,
          _ ? /* @__PURE__ */ p("div", { className: "reader-empty reader-react-pdf-loading", "data-reader-pdf-loading": t, children: "正在加载 PDF…" }) : null,
          I && !T ? /* @__PURE__ */ p("div", { className: "reader-viewer-wrap reader-react-pdf-wrap", children: /* @__PURE__ */ p(
            Vo,
            {
              file: I,
              loading: null,
              error: null,
              options: G,
              onLoadSuccess: zt,
              onLoadError: bt,
              className: "reader-react-pdf-document",
              children: Ie.map((O) => {
                if (yt.has(O))
                  return /* @__PURE__ */ p(
                    yi,
                    {
                      pane: t,
                      pageNumber: O,
                      width: Q,
                      devicePixelRatio: U,
                      active: j.has(O),
                      syncedMinHeight: (c == null ? void 0 : c.get(O)) || 0,
                      onMetrics: d,
                      cachedAspect: ee.get(O),
                      onAspectChange: Pe,
                      sentinelRef: gt(O),
                      regionHighlight: (Ae == null ? void 0 : Ae.box.page) === O ? Ae : null,
                      regionTargets: Ue.get(O),
                      onSelectRegion: y,
                      liveTranslationLayout: w == null ? void 0 : w.layoutByPage.get(O - 1),
                      liveTranslationPage: w == null ? void 0 : w.pagesByPage.get(O - 1),
                      showLiveTranslation: S
                    },
                    `${t}-${O}`
                  );
                const W = ee.get(O) ?? Br, H = Math.max(120, Math.floor(Q * W)), ce = Math.max(H, Math.ceil((c == null ? void 0 : c.get(O)) || 0));
                return /* @__PURE__ */ p(
                  "div",
                  {
                    ref: gt(O),
                    [Ge]: O,
                    [Ye]: t,
                    [mn]: H,
                    className: pn,
                    style: {
                      width: Q,
                      height: ce,
                      minHeight: ce
                    },
                    children: /* @__PURE__ */ p(
                      "div",
                      {
                        className: Tt,
                        style: { width: Q, height: H },
                        "aria-hidden": !0
                      }
                    )
                  },
                  `${t}-${O}`
                );
              })
            },
            E
          ) }) : null
        ]
      }
    );
  }
), Xn = rn(Ii), Hr = an(null), Wr = an(null);
function Ri({ value: e, hud: t, children: n }) {
  return /* @__PURE__ */ p(Hr.Provider, { value: e, children: /* @__PURE__ */ p(Wr.Provider, { value: t, children: n }) });
}
function ht() {
  return sn(Hr);
}
function Ti() {
  return sn(Wr);
}
function Ei({
  mode: e,
  compareMode: t,
  showSource: n,
  showTranslated: r,
  markdownSplit: a,
  overlayOnSource: o = !1
}) {
  const s = a && e === "compare";
  return {
    mode: s ? "source" : e,
    compareMode: t && !a,
    showSource: s ? !0 : n,
    showTranslated: s ? !1 : r
  };
}
function Mi(e, t, n = e * 2) {
  return t ? Math.min(e * 2, n) : e;
}
function Ai(e) {
  return e ? e.connection === "terminal" && e.jobStatus === "failed" ? e.pagesByPage.size > 0 ? `翻译已暂停，已保留 ${e.pagesByPage.size} 页译文` : "翻译已暂停，原始 PDF 仍可阅读" : e.connection === "terminal" && ["cancelled", "canceled"].includes(e.jobStatus) ? e.pagesByPage.size > 0 ? `翻译已取消，已保留 ${e.pagesByPage.size} 页译文` : "翻译已取消，原始 PDF 仍可阅读" : e.pagesByPage.size > 0 ? "" : e.connection === "unavailable" ? e.error || "实时译文暂不可用，原始 PDF 仍可阅读" : e.error ? e.error : e.layoutByPage.size === 0 ? "正在完成 OCR，译文将在这里逐页出现" : "版面已就绪，正在等待首个译文页面" : "";
}
function ki(e) {
  const t = ht(), {
    markdownSplit: n = !1,
    assistantSplit: r = !1,
    liveTranslation: a,
    paneComposition: o
  } = e, s = (o == null ? void 0 : o.visibleMode) ?? e.mode ?? "compare", l = (o == null ? void 0 : o.compareMode) ?? e.compareMode ?? s === "compare", i = (o == null ? void 0 : o.showSource) ?? e.showSource ?? !0, c = (o == null ? void 0 : o.showTranslated) ?? e.showTranslated ?? (s === "compare" || s === "translated"), d = (o == null ? void 0 : o.overlayOnSource) ?? e.overlayOnSource ?? !1, u = e.bindShell ?? (t == null ? void 0 : t.bindShell), f = e.shellEl ?? (t == null ? void 0 : t.shellEl) ?? null, m = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? pt, v = e.shellWidth ?? (t == null ? void 0 : t.shellWidth) ?? 0, h = e.rowHeights ?? (t == null ? void 0 : t.rowHeights), g = e.mountSource ?? (t == null ? void 0 : t.mountSource) ?? !1, y = e.mountTranslated ?? (t == null ? void 0 : t.mountTranslated) ?? !1, w = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, S = e.sourceUrl ?? (t == null ? void 0 : t.sourceUrl) ?? "", b = e.translatedUrl ?? (t == null ? void 0 : t.translatedUrl) ?? "", P = e.sourceFile ?? (t == null ? void 0 : t.sourceFile) ?? null, N = e.translatedFile ?? (t == null ? void 0 : t.translatedFile) ?? null, M = e.onMetrics ?? (t == null ? void 0 : t.onMetrics), _ = e.onNumPagesChange ?? (t == null ? void 0 : t.onNumPagesChange), T = e.activeRegion ?? (t == null ? void 0 : t.activeRegion), E = e.regions ?? (t == null ? void 0 : t.regions) ?? [], R = e.readerMetadata ?? (t == null ? void 0 : t.readerMetadata), I = e.onSelectRegion ?? (t == null ? void 0 : t.onSelectRegion), A = Ei({
    mode: s,
    compareMode: l,
    showSource: i,
    showTranslated: c,
    markdownSplit: n,
    overlayOnSource: d
  }), D = Mi(
    v,
    n || r,
    typeof document > "u" ? v * 2 : document.documentElement.clientWidth
  );
  return /* @__PURE__ */ p(
    "div",
    {
      ref: u,
      className: Ba,
      "data-reader-region-count": E.length,
      "data-reader-structured-region-count": E.filter(Pr).length,
      "data-reader-metadata-ready": R ? "true" : "false",
      children: /* @__PURE__ */ z(
        "main",
        {
          className: `${Ua} reader-mode-${A.mode}`,
          "data-reader-mode": n ? "markdown-split" : r ? "assistant-split" : s,
          children: [
            g ? /* @__PURE__ */ p(
              Xn,
              {
                pane: "source",
                url: S,
                preloadedFile: P,
                userZoom: m,
                visible: A.showSource,
                scrollRoot: f,
                pageWidthOverride: D,
                rowHeights: A.compareMode ? h : void 0,
                onMetrics: M,
                emptyLabel: w ? "源文件不可用：该文档没有可读取的源 PDF。" : "暂无原文 PDF",
                onNumPagesChange: _,
                activeRegion: T,
                regions: E,
                readerMetadata: R,
                onSelectRegion: I,
                liveTranslation: d ? a : void 0,
                showLiveTranslation: d,
                liveTranslationPendingLabel: d ? Ai(a) : "",
                paneAction: d ? /* @__PURE__ */ z(kt, { children: [
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
              Xn,
              {
                pane: "translated",
                url: b,
                preloadedFile: N,
                userZoom: m,
                visible: A.showTranslated,
                scrollRoot: f,
                pageWidthOverride: D,
                rowHeights: A.compareMode ? h : void 0,
                onMetrics: M,
                emptyLabel: "暂无译文 PDF",
                onNumPagesChange: _,
                activeRegion: T,
                regions: E,
                readerMetadata: R,
                onSelectRegion: I,
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
const Ni = [
  { id: "source", label: "源文件", Icon: Tr },
  { id: "compare", label: "对照", Icon: Er },
  { id: "translated", label: "翻译文件", Icon: Mr }
];
function xi(e) {
  return e.connection === "live" ? `实时译文 · ${e.pagesByPage.size} 页` : e.connection === "reconnecting" ? "实时译文 · 重连中" : e.connection === "unavailable" ? "实时译文 · 不可用" : e.connection === "terminal" ? e.jobStatus === "failed" ? "实时译文 · 已暂停" : e.jobStatus === "cancelled" || e.jobStatus === "canceled" ? "实时译文 · 已取消" : e.jobStatus === "succeeded" ? "实时译文 · 已完成" : "实时译文 · 已结束" : e.error || "实时译文 · 连接中";
}
function Li(e) {
  return e.id === "translated" ? e.sourceViewOnly : e.id === "compare" ? !e.documentReady || e.sourceViewOnly && !e.liveTranslationAvailable : !1;
}
function Ci(e) {
  const t = ht(), {
    mode: n,
    documentReady: r,
    onModeChange: a,
    liveTranslation: o = null
  } = e, s = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, l = o ? xi(o.state) : "";
  return /* @__PURE__ */ z("header", { className: "reader-workspace-bar", children: [
    o ? /* @__PURE__ */ z(
      "button",
      {
        type: "button",
        className: `reader-live-translation-toggle is-${o.state.connection}${o.visible ? " is-active" : ""}`,
        "aria-pressed": o.visible,
        "aria-label": o.visible ? "隐藏实时译文" : "显示实时译文",
        title: o.state.error || l,
        onClick: o.onToggle,
        children: [
          /* @__PURE__ */ p(Do, { size: 14, strokeWidth: 2.2, "aria-hidden": !0 }),
          /* @__PURE__ */ p("span", { className: "reader-live-translation-toggle-label", children: l })
        ]
      }
    ) : null,
    /* @__PURE__ */ p("div", { className: "reader-workspace-tabs", role: "tablist", "aria-label": "阅读工作区", children: Ni.map(({ id: i, label: c, Icon: d }) => {
      const u = n === i, f = Li({
        id: i,
        documentReady: r,
        sourceViewOnly: s,
        liveTranslationAvailable: !!o
      });
      return /* @__PURE__ */ z(
        "button",
        {
          type: "button",
          className: `reader-workspace-tab${u ? " is-active" : ""}`,
          role: "tab",
          "aria-selected": u,
          "aria-label": c,
          title: f ? `${c} 需要文档任务` : c,
          disabled: f,
          onClick: () => a(i),
          children: [
            /* @__PURE__ */ p(d, { size: 15, strokeWidth: 2.2, "aria-hidden": !0 }),
            /* @__PURE__ */ p("span", { className: "reader-workspace-tab-label", children: c })
          ]
        },
        i
      );
    }) })
  ] });
}
const Qn = [
  { id: "markdown", label: "Markdown", Icon: Ar },
  { id: "ai", label: "AI 问答", Icon: dn }
];
function zi(e) {
  const t = ht(), { active: n } = e, r = e.onSelect ?? (t == null ? void 0 : t.assistant.select) ?? (() => {
  }), a = e.onClose ?? (t == null ? void 0 : t.assistant.close) ?? (() => {
  });
  return n ? /* @__PURE__ */ z("header", { className: "reader-assistant-dock-header", children: [
    /* @__PURE__ */ p("div", { className: "reader-assistant-dock-tabs", role: "tablist", "aria-label": "阅读辅助面板", children: Qn.map(({ id: o, label: s, Icon: l }) => {
      const i = n === o;
      return /* @__PURE__ */ z(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": i,
          className: `reader-assistant-dock-tab${i ? " is-active" : ""}`,
          onClick: () => r(o),
          children: [
            /* @__PURE__ */ p(l, { size: 15, strokeWidth: 2.15, "aria-hidden": !0 }),
            /* @__PURE__ */ p("span", { children: s })
          ]
        },
        o
      );
    }) }),
    /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: "reader-assistant-dock-close",
        "aria-label": "关闭阅读辅助面板",
        title: "关闭辅助面板",
        onClick: a,
        children: /* @__PURE__ */ p(Xe, { size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
      }
    )
  ] }) : /* @__PURE__ */ p("nav", { className: "reader-assistant-rail", "aria-label": "阅读辅助工具", children: Qn.map(({ id: o, label: s, Icon: l }) => /* @__PURE__ */ z(
    "button",
    {
      type: "button",
      className: "reader-assistant-rail-button",
      "aria-label": `打开${s}`,
      title: s,
      onClick: () => r(o),
      children: [
        /* @__PURE__ */ p(l, { size: 18, strokeWidth: 2, "aria-hidden": !0 }),
        /* @__PURE__ */ p("span", { children: s === "AI 问答" ? "AI" : "MD" })
      ]
    },
    o
  )) });
}
function Di(e, t) {
  const n = getComputedStyle(e), r = parseFloat(n.fontSize);
  return t * r;
}
function _i(e, t) {
  const n = getComputedStyle(e.ownerDocument.documentElement), r = parseFloat(n.fontSize);
  return t * r;
}
function Oi(e) {
  return e / 100 * window.innerHeight;
}
function Fi(e) {
  return e / 100 * window.innerWidth;
}
function $i(e) {
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
  const [a, o] = $i(n);
  switch (o) {
    case "%": {
      r = a / 100 * e;
      break;
    }
    case "px": {
      r = a;
      break;
    }
    case "rem": {
      r = _i(t, a);
      break;
    }
    case "em": {
      r = Di(t, a);
      break;
    }
    case "vh": {
      r = Oi(a);
      break;
    }
    case "vw": {
      r = Fi(a);
      break;
    }
  }
  return r;
}
function fe(e) {
  return parseFloat(e.toFixed(3));
}
function Ze({
  group: e
}) {
  const { orientation: t, panels: n } = e;
  return n.reduce((r, a) => (r += t === "horizontal" ? a.element.offsetWidth : a.element.offsetHeight, r), 0);
}
function Qt(e) {
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
    const { element: a, panelConstraints: o } = r;
    let s = 0;
    if (o.collapsedSize !== void 0) {
      const d = rt({
        groupSize: n,
        panelElement: a,
        styleProp: o.collapsedSize
      });
      s = fe(d / n * 100);
    }
    let l;
    if (o.defaultSize !== void 0) {
      const d = rt({
        groupSize: n,
        panelElement: a,
        styleProp: o.defaultSize
      });
      l = fe(d / n * 100);
    }
    let i = 0;
    if (o.minSize !== void 0) {
      const d = rt({
        groupSize: n,
        panelElement: a,
        styleProp: o.minSize
      });
      i = fe(d / n * 100);
    }
    let c = 100;
    if (o.maxSize !== void 0) {
      const d = rt({
        groupSize: n,
        panelElement: a,
        styleProp: o.maxSize
      });
      c = fe(d / n * 100);
    }
    return {
      groupResizeBehavior: o.groupResizeBehavior,
      collapsedSize: s,
      collapsible: o.collapsible === !0,
      defaultSize: l,
      disabled: o.disabled,
      minSize: i,
      maxSize: c,
      panelId: r.id
    };
  });
}
function Z(e, t = "Assertion error") {
  if (!e)
    throw Error(t);
}
function en(e, t) {
  return Array.from(t).sort(
    e === "horizontal" ? ji : Ui
  );
}
function ji(e, t) {
  const n = e.element.offsetLeft - t.element.offsetLeft;
  return n !== 0 ? n : e.element.offsetWidth - t.element.offsetWidth;
}
function Ui(e, t) {
  const n = e.element.offsetTop - t.element.offsetTop;
  return n !== 0 ? n : e.element.offsetHeight - t.element.offsetHeight;
}
function Jr(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.ELEMENT_NODE;
}
function Kr(e, t) {
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
function Bi({
  orientation: e,
  rects: t,
  targetRect: n
}) {
  const r = {
    x: n.x + n.width / 2,
    y: n.y + n.height / 2
  };
  let a, o = Number.MAX_VALUE;
  for (const s of t) {
    const { x: l, y: i } = Kr(r, s), c = e === "horizontal" ? l : i;
    c < o && (o = c, a = s);
  }
  return Z(a, "No rect found"), a;
}
let St;
function Hi() {
  return St === void 0 && (typeof matchMedia == "function" ? St = !!matchMedia("(pointer:coarse)").matches : St = !1), St;
}
function qr(e) {
  const { element: t, orientation: n, panels: r, separators: a } = e, o = en(
    n,
    Array.from(t.children).filter(Jr).map((v) => ({ element: v }))
  ).map(({ element: v }) => v), s = [];
  let l = !1, i = !1, c = -1, d = -1, u = 0, f, m = [];
  {
    let v = -1;
    for (const h of o)
      h.hasAttribute("data-panel") && (v++, h.hasAttribute("data-disabled") || (u++, c === -1 && (c = v), d = v));
  }
  if (u > 1) {
    let v = -1;
    for (const h of o)
      if (h.hasAttribute("data-panel")) {
        v++;
        const g = r.find(
          (y) => y.element === h
        );
        if (g) {
          if (f) {
            const y = f.element.getBoundingClientRect(), w = h.getBoundingClientRect();
            let S;
            if (i) {
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
                  const N = m[0], M = Bi({
                    orientation: n,
                    rects: [y, w],
                    targetRect: N.element.getBoundingClientRect()
                  });
                  S = [
                    N,
                    M === y ? P : b
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
              const N = Hi() ? e.resizeTargetMinimumSize.coarse : e.resizeTargetMinimumSize.fine;
              if (P.width < N) {
                const _ = N - P.width;
                P = new DOMRect(
                  P.x - _ / 2,
                  P.y,
                  P.width + _,
                  P.height
                );
              }
              if (P.height < N) {
                const _ = N - P.height;
                P = new DOMRect(
                  P.x,
                  P.y - _ / 2,
                  P.width,
                  P.height + _
                );
              }
              const M = v <= c || v > d;
              !l && !M && s.push({
                group: e,
                groupSize: Ze({ group: e }),
                panels: [f, g],
                separator: "width" in b ? void 0 : b,
                rect: P
              }), l = !1;
            }
          }
          i = !1, f = g, m = [];
        }
      } else if (h.hasAttribute("data-separator")) {
        h.ariaDisabled !== null && (l = !0);
        const g = a.find(
          (y) => y.element === h
        );
        g ? m.push(g) : (f = void 0, m = []);
      } else
        i = !0;
  }
  return s;
}
var xe;
class Vr {
  constructor() {
    zn(this, xe, {});
  }
  addListener(t, n) {
    const r = Qe(this, xe)[t];
    return r === void 0 ? Qe(this, xe)[t] = [n] : r.includes(n) || r.push(n), () => {
      this.removeListener(t, n);
    };
  }
  emit(t, n) {
    const r = Qe(this, xe)[t];
    if (r !== void 0)
      if (r.length === 1)
        r[0].call(null, n);
      else {
        let a = !1, o = null;
        const s = Array.from(r);
        for (let l = 0; l < s.length; l++) {
          const i = s[l];
          try {
            i.call(null, n);
          } catch (c) {
            o === null && (a = !0, o = c);
          }
        }
        if (a)
          throw o;
      }
  }
  removeAllListeners() {
    Dn(this, xe, {});
  }
  removeListener(t, n) {
    const r = Qe(this, xe)[t];
    if (r !== void 0) {
      const a = r.indexOf(n);
      a >= 0 && r.splice(a, 1);
    }
  }
}
xe = new WeakMap();
let qe = {
  cursorFlags: 0,
  state: "inactive"
};
const yn = new Vr();
function De() {
  return qe;
}
function Wi(e) {
  return yn.addListener("change", e);
}
function Ji(e) {
  const t = qe, n = { ...qe };
  n.cursorFlags = e, qe = n, yn.emit("change", {
    prev: t,
    next: n
  });
}
function Ve(e) {
  const t = qe;
  qe = e, yn.emit("change", {
    prev: t,
    next: e
  });
}
const Ki = (e) => e, Ut = () => {
}, Gr = 1, Yr = 2, Zr = 4, Xr = 8, er = 3, tr = 12;
let Pt;
function nr() {
  return Pt === void 0 && (Pt = !1, typeof window < "u" && (window.navigator.userAgent.includes("Chrome") || window.navigator.userAgent.includes("Firefox")) && (Pt = !0)), Pt;
}
function qi({
  cursorFlags: e,
  groups: t,
  state: n
}) {
  let r = 0, a = 0;
  switch (n) {
    case "active":
    case "hover":
      t.forEach((o) => {
        if (!o.mutableState.disableCursor)
          switch (o.orientation) {
            case "horizontal": {
              r++;
              break;
            }
            case "vertical": {
              a++;
              break;
            }
          }
      });
  }
  if (!(r === 0 && a === 0)) {
    switch (n) {
      case "active": {
        if (e && nr()) {
          const o = (e & Gr) !== 0, s = (e & Yr) !== 0, l = (e & Zr) !== 0, i = (e & Xr) !== 0;
          if (o)
            return l ? "se-resize" : i ? "ne-resize" : "e-resize";
          if (s)
            return l ? "sw-resize" : i ? "nw-resize" : "w-resize";
          if (l)
            return "s-resize";
          if (i)
            return "n-resize";
        }
        break;
      }
    }
    return nr() ? r > 0 && a > 0 ? "move" : r > 0 ? "ew-resize" : "ns-resize" : r > 0 && a > 0 ? "grab" : r > 0 ? "col-resize" : "row-resize";
  }
}
const rr = /* @__PURE__ */ new WeakMap();
function vn(e) {
  if (e.defaultView === null || e.defaultView === void 0)
    return;
  let { prevStyle: t, styleSheet: n } = rr.get(e) ?? {};
  n === void 0 && (n = new e.defaultView.CSSStyleSheet(), e.adoptedStyleSheets && (Object.isExtensible(e.adoptedStyleSheets) ? e.adoptedStyleSheets.push(n) : e.adoptedStyleSheets = [
    ...e.adoptedStyleSheets,
    n
  ]));
  const r = De();
  switch (r.state) {
    case "active":
    case "hover": {
      const a = qi({
        cursorFlags: r.cursorFlags,
        groups: r.hitRegions.map((s) => s.group),
        state: r.state
      }), o = `*, *:hover {cursor: ${a} !important; }`;
      if (t === o)
        return;
      t = o, a ? n.cssRules.length === 0 ? n.insertRule(o) : n.replaceSync(o) : n.cssRules.length === 1 && n.deleteRule(0);
      break;
    }
    case "inactive": {
      t = void 0, n.cssRules.length === 1 && n.deleteRule(0);
      break;
    }
  }
  rr.set(e, {
    prevStyle: t,
    styleSheet: n
  });
}
let Se = /* @__PURE__ */ new Map();
const Qr = new Vr();
function Vi(e) {
  Se = new Map(Se), Se.delete(e);
}
function or(e, t) {
  for (const [n] of Se)
    if (n.id === e)
      return n;
}
function Le(e, t) {
  for (const [n, r] of Se)
    if (n.id === e)
      return r;
  if (t)
    throw Error(`Could not find data for Group with id ${e}`);
}
function $e() {
  return Se;
}
function wn(e, t) {
  return Qr.addListener("groupChange", (n) => {
    n.group.id === e && t(n);
  });
}
function Me(e, t, n) {
  const r = Se.get(e);
  Se = new Map(Se), Se.set(e, t), Qr.emit("groupChange", {
    group: e,
    isUserInteraction: (n == null ? void 0 : n.isUserInteraction) === !0,
    prev: r,
    next: t
  });
}
function eo(e) {
  const t = De();
  let n = !1;
  switch (t.state) {
    case "active":
      Ve({
        cursorFlags: 0,
        state: "inactive"
      }), t.hitRegions.length > 0 && (vn(e), n = !0, t.hitRegions.forEach((r) => {
        const a = Le(r.group.id, !0);
        Me(r.group, a, {
          isUserInteraction: !0
        });
      }));
  }
  return n;
}
function ar(e) {
  e.defaultPrevented || eo(e.currentTarget);
}
function Gi(e, t, n) {
  let r, a = {
    x: 1 / 0,
    y: 1 / 0
  };
  for (const o of t) {
    const s = Kr(n, o.rect);
    switch (e) {
      case "horizontal": {
        s.x <= a.x && (r = o, a = s);
        break;
      }
      case "vertical": {
        s.y <= a.y && (r = o, a = s);
        break;
      }
    }
  }
  return r ? {
    distance: a,
    hitRegion: r
  } : void 0;
}
function Yi(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}
function Zi(e, t) {
  if (e === t) throw new Error("Cannot compare node with itself");
  const n = {
    a: cr(e),
    b: cr(t)
  };
  let r;
  for (; n.a.at(-1) === n.b.at(-1); )
    r = n.a.pop(), n.b.pop();
  Z(
    r,
    "Stacking order can only be calculated for elements with a common ancestor"
  );
  const a = {
    a: ir(sr(n.a)),
    b: ir(sr(n.b))
  };
  if (a.a === a.b) {
    const o = r.childNodes, s = {
      a: n.a.at(-1),
      b: n.b.at(-1)
    };
    let l = o.length;
    for (; l--; ) {
      const i = o[l];
      if (i === s.a) return 1;
      if (i === s.b) return -1;
    }
  }
  return Math.sign(a.a - a.b);
}
const Xi = /\b(?:position|zIndex|opacity|transform|webkitTransform|mixBlendMode|filter|webkitFilter|isolation)\b/;
function Qi(e) {
  const t = getComputedStyle(to(e) ?? e).display;
  return t === "flex" || t === "inline-flex";
}
function ec(e) {
  const t = getComputedStyle(e);
  return !!(t.position === "fixed" || t.zIndex !== "auto" && (t.position !== "static" || Qi(e)) || +t.opacity < 1 || "transform" in t && t.transform !== "none" || "webkitTransform" in t && t.webkitTransform !== "none" || "mixBlendMode" in t && t.mixBlendMode !== "normal" || "filter" in t && t.filter !== "none" || "webkitFilter" in t && t.webkitFilter !== "none" || "isolation" in t && t.isolation === "isolate" || Xi.test(t.willChange) || t.webkitOverflowScrolling === "touch");
}
function sr(e) {
  let t = e.length;
  for (; t--; ) {
    const n = e[t];
    if (Z(n, "Missing node"), ec(n)) return n;
  }
  return null;
}
function ir(e) {
  return e && Number(getComputedStyle(e).zIndex) || 0;
}
function cr(e) {
  const t = [];
  for (; e; )
    t.push(e), e = to(e);
  return t;
}
function to(e) {
  const { parentNode: t } = e;
  return Yi(t) ? t.host : t;
}
function tc(e, t) {
  return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function nc({
  groupElement: e,
  hitRegion: t,
  pointerEventTarget: n
}) {
  if (!Jr(n) || n.contains(e) || e.contains(n))
    return !0;
  if (Zi(n, e) > 0) {
    let r = n;
    for (; r; ) {
      if (r.contains(e))
        return !0;
      if (tc(r.getBoundingClientRect(), t))
        return !1;
      r = r.parentElement;
    }
  }
  return !0;
}
function Sn(e, t) {
  const n = [];
  return t.forEach((r, a) => {
    if (a.disabled)
      return;
    const o = qr(a), s = Gi(a.orientation, o, {
      x: e.clientX,
      y: e.clientY
    });
    s && s.distance.x <= 0 && s.distance.y <= 0 && nc({
      groupElement: a.element,
      hitRegion: s.hitRegion.rect,
      pointerEventTarget: e.target
    }) && n.push(s.hitRegion);
  }), n;
}
function rc(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] != t[n])
      return !1;
  return !0;
}
function ue(e, t, n = 0) {
  return Math.abs(fe(e) - fe(t)) <= n;
}
function we(e, t) {
  return ue(e, t) ? 0 : e > t ? 1 : -1;
}
function Je({
  overrideDisabledPanels: e,
  panelConstraints: t,
  prevSize: n,
  size: r
}) {
  const {
    collapsedSize: a = 0,
    collapsible: o,
    disabled: s,
    maxSize: l = 100,
    minSize: i = 0
  } = t;
  if (s && !e)
    return n;
  if (we(r, i) < 0)
    if (o) {
      const c = (a + i) / 2;
      we(r, c) < 0 ? r = a : r = i;
    } else
      r = i;
  return r = Math.min(l, r), r = fe(r), r;
}
function ut({
  delta: e,
  initialLayout: t,
  panelConstraints: n,
  pivotIndices: r,
  prevLayout: a,
  trigger: o
}) {
  if (ue(e, 0))
    return t;
  const s = o === "imperative-api", l = Object.values(t), i = Object.values(a), c = [...l], [d, u] = r;
  Z(d != null, "Invalid first pivot index"), Z(u != null, "Invalid second pivot index");
  let f = 0;
  switch (o) {
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
          ), ue(b, y)) {
            const P = S - b;
            we(P, Math.abs(e)) > 0 && (e = e < 0 ? 0 - P : P);
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
          ), ue(b, S)) {
            const P = b - y;
            we(P, Math.abs(e)) > 0 && (e = e < 0 ? 0 - P : P);
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
      if (w && we(y, b) < 0)
        if (e > 0) {
          const P = b - S, N = P / 2, M = y + e;
          we(M, b) < 0 && (e = we(e, N) <= 0 ? 0 : P);
        } else {
          const P = b - S, N = 100 - P / 2, M = y - e;
          we(M, b) < 0 && (e = we(100 + e, N) > 0 ? 0 : -P);
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
      if (!ue(y, S) && (f += y - S, c[h] = S, f.toFixed(3).localeCompare(Math.abs(e).toFixed(3), void 0, {
        numeric: !0
      }) >= 0))
        break;
      e < 0 ? h-- : h++;
    }
  }
  if (rc(i, c))
    return a;
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
    if (c[h] = w, !ue(w, y)) {
      let S = y - w, b = e < 0 ? u : d;
      for (; b >= 0 && b < n.length; ) {
        const P = c[b];
        Z(
          P != null,
          `Previous layout not found for panel index ${b}`
        );
        const N = P + S, M = Je({
          overrideDisabledPanels: s,
          panelConstraints: n[b],
          prevSize: P,
          size: N
        });
        if (ue(P, M) || (S -= M - P, c[b] = M), ue(S, 0))
          break;
        e > 0 ? b-- : b++;
      }
    }
  }
  const m = Object.values(c).reduce(
    (h, g) => g + h,
    0
  );
  if (!ue(m, 100, 0.1))
    return a;
  const v = Object.keys(a);
  return c.reduce((h, g, y) => (h[v[y]] = g, h), {});
}
function _e(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (t[n] === void 0 || we(e[n], t[n]) !== 0)
      return !1;
  return !0;
}
function Oe({
  layout: e,
  panelConstraints: t
}) {
  const n = Object.values(e), r = [...n], a = r.reduce(
    (l, i) => l + i,
    0
  );
  if (r.length !== t.length)
    throw Error(
      `Invalid ${t.length} panel layout: ${r.map((l) => `${l}%`).join(", ")}`
    );
  if (!ue(a, 100) && r.length > 0)
    for (let l = 0; l < t.length; l++) {
      const i = r[l];
      Z(i != null, `No layout data found for index ${l}`);
      const c = 100 / a * i;
      r[l] = c;
    }
  let o = 0;
  for (let l = 0; l < t.length; l++) {
    const i = n[l];
    Z(i != null, `No layout data found for index ${l}`);
    const c = r[l];
    Z(c != null, `No layout data found for index ${l}`);
    const d = Je({
      overrideDisabledPanels: !0,
      panelConstraints: t[l],
      prevSize: i,
      size: c
    });
    c != d && (o += c - d, r[l] = d);
  }
  if (!ue(o, 0))
    for (let l = 0; l < t.length; l++) {
      const i = r[l];
      Z(i != null, `No layout data found for index ${l}`);
      const c = i + o, d = Je({
        overrideDisabledPanels: !0,
        panelConstraints: t[l],
        prevSize: i,
        size: c
      });
      if (i !== d && (o -= d - i, r[l] = d, ue(o, 0)))
        break;
    }
  const s = Object.keys(e);
  return r.reduce((l, i, c) => (l[s[c]] = i, l), {});
}
function no({
  groupId: e,
  panelId: t
}) {
  const n = () => {
    const i = $e();
    for (const [
      c,
      {
        defaultLayoutDeferred: d,
        derivedPanelConstraints: u,
        layout: f,
        groupSize: m,
        separatorToPanels: v
      }
    ] of i)
      if (c.id === e)
        return {
          defaultLayoutDeferred: d,
          derivedPanelConstraints: u,
          group: c,
          groupSize: m,
          layout: f,
          separatorToPanels: v
        };
    throw Error(`Group ${e} not found`);
  }, r = () => {
    const i = n().derivedPanelConstraints.find(
      (c) => c.panelId === t
    );
    if (i !== void 0)
      return i;
    throw Error(`Panel constraints not found for Panel ${t}`);
  }, a = () => {
    const i = n().group.panels.find((c) => c.id === t);
    if (i !== void 0)
      return i;
    throw Error(`Layout not found for Panel ${t}`);
  }, o = () => {
    const i = n().layout[t];
    if (i !== void 0)
      return i;
    throw Error(`Layout not found for Panel ${t}`);
  }, s = ({
    nextSize: i,
    panels: c,
    prevLayout: d,
    derivedPanelConstraints: u
  }) => {
    const f = o(), m = c.findIndex((g) => g.id === t), v = m === 0, h = m === c.length - 1;
    if (h && i < f && (v || c.slice(0, m).every((g, y) => {
      const w = u[y];
      return (w == null ? void 0 : w.collapsible) && ue(w.collapsedSize, d[w.panelId]);
    }))) {
      const g = c.slice(0, m).reduce((y, w) => y + d[w.id], 0);
      return {
        ...d,
        [t]: fe(100 - g)
      };
    }
    return ut({
      delta: h ? f - i : i - f,
      initialLayout: d,
      panelConstraints: u,
      pivotIndices: h ? [m - 1, m] : [m, m + 1],
      prevLayout: d,
      trigger: "imperative-api"
    });
  }, l = (i) => {
    const c = o();
    if (i === c)
      return;
    const {
      defaultLayoutDeferred: d,
      derivedPanelConstraints: u,
      group: f,
      groupSize: m,
      layout: v,
      separatorToPanels: h
    } = n(), g = s({
      nextSize: i,
      panels: f.panels,
      prevLayout: v,
      derivedPanelConstraints: u
    }), y = Oe({
      layout: g,
      panelConstraints: u
    });
    _e(v, y) || Me(f, {
      defaultLayoutDeferred: d,
      derivedPanelConstraints: u,
      groupSize: m,
      layout: y,
      separatorToPanels: h
    });
  };
  return {
    collapse: () => {
      const { collapsible: i, collapsedSize: c } = r(), { mutableValues: d } = a(), u = o();
      i && u !== c && (d.expandToSize = u, l(c));
    },
    expand: () => {
      const { collapsible: i, collapsedSize: c, minSize: d } = r(), { mutableValues: u } = a(), f = o();
      if (i && f === c) {
        let m = u.expandToSize ?? d;
        m === 0 && (m = 1), l(m);
      }
    },
    getSize: () => {
      const { group: i } = n(), c = o(), { element: d } = a(), u = i.orientation === "horizontal" ? d.offsetWidth : d.offsetHeight;
      return {
        asPercentage: c,
        inPixels: u
      };
    },
    isCollapsed: () => {
      const { collapsible: i, collapsedSize: c } = r(), d = o();
      return i && ue(c, d);
    },
    resize: (i) => {
      const { group: c } = n(), { element: d } = a(), u = Ze({ group: c }), f = rt({
        groupSize: u,
        panelElement: d,
        styleProp: i
      }), m = fe(f / u * 100);
      l(m);
    }
  };
}
function lr(e) {
  if (e.defaultPrevented)
    return;
  const t = $e();
  Sn(e, t).forEach((n) => {
    if (n.separator && !n.separator.disableDoubleClick) {
      const r = n.panels.find(
        (a) => a.panelConstraints.defaultSize !== void 0
      );
      if (r) {
        const a = r.panelConstraints.defaultSize, o = no({
          groupId: n.group.id,
          panelId: r.id
        });
        o && a !== void 0 && (o.resize(a), e.preventDefault());
      }
    }
  });
}
function It(e) {
  const t = $e();
  for (const [n] of t)
    if (n.separators.some(
      (r) => r.element === e
    ))
      return n;
  throw Error("Could not find parent Group for separator element");
}
function ro({
  groupId: e
}) {
  const t = () => {
    const n = $e();
    for (const [r, a] of n)
      if (r.id === e)
        return { group: r, ...a };
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
        derivedPanelConstraints: a,
        group: o,
        groupSize: s,
        layout: l,
        separatorToPanels: i
      } = t(), c = Oe({
        layout: n,
        panelConstraints: a
      });
      return r ? l : (_e(l, c) || Me(o, {
        defaultLayoutDeferred: r,
        derivedPanelConstraints: a,
        groupSize: s,
        layout: c,
        separatorToPanels: i
      }), c);
    }
  };
}
function ze(e, t) {
  const n = It(e), r = Le(n.id, !0), a = n.separators.find(
    (d) => d.element === e
  );
  Z(a, "Matching separator not found");
  const o = r.separatorToPanels.get(a);
  Z(o, "Matching panels not found");
  const s = o.map((d) => n.panels.indexOf(d)), l = ro({ groupId: n.id }).getLayout(), i = ut({
    delta: t,
    initialLayout: l,
    panelConstraints: r.derivedPanelConstraints,
    pivotIndices: s,
    prevLayout: l,
    trigger: "keyboard"
  }), c = Oe({
    layout: i,
    panelConstraints: r.derivedPanelConstraints
  });
  _e(l, c) || Me(
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
function dr(e) {
  if (e.defaultPrevented)
    return;
  const t = e.currentTarget, n = It(t);
  if (!n.disabled)
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault(), n.orientation === "vertical" && ze(t, 5);
        break;
      }
      case "ArrowLeft": {
        e.preventDefault(), n.orientation === "horizontal" && ze(t, -5);
        break;
      }
      case "ArrowRight": {
        e.preventDefault(), n.orientation === "horizontal" && ze(t, 5);
        break;
      }
      case "ArrowUp": {
        e.preventDefault(), n.orientation === "vertical" && ze(t, -5);
        break;
      }
      case "End": {
        e.preventDefault(), ze(t, 100);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const r = It(t), a = Le(r.id, !0), { derivedPanelConstraints: o, layout: s, separatorToPanels: l } = a, i = r.separators.find(
          (f) => f.element === t
        );
        Z(i, "Matching separator not found");
        const c = l.get(i);
        Z(c, "Matching panels not found");
        const d = c[0], u = o.find(
          (f) => f.panelId === d.id
        );
        if (Z(u, "Panel metadata not found"), u.collapsible) {
          const f = s[d.id], m = u.collapsedSize === f ? r.mutableState.expandedPanelSizes[d.id] ?? u.minSize : u.collapsedSize;
          ze(t, m - f);
        }
        break;
      }
      case "F6": {
        e.preventDefault();
        const r = It(t).separators.map(
          (s) => s.element
        ), a = Array.from(r).findIndex(
          (s) => s === e.currentTarget
        );
        Z(a !== null, "Index not found");
        const o = e.shiftKey ? a > 0 ? a - 1 : r.length - 1 : a + 1 < r.length ? a + 1 : 0;
        r[o].focus({
          preventScroll: !0
        });
        break;
      }
      case "Home": {
        e.preventDefault(), ze(t, -100);
        break;
      }
    }
}
function ur(e) {
  if (e.defaultPrevented || e.pointerType === "mouse" && e.button > 0)
    return;
  const t = $e(), n = Sn(e, t), r = /* @__PURE__ */ new Map();
  let a = !1;
  n.forEach((o) => {
    o.separator && (a || (a = !0, o.separator.element.focus({
      // @ts-expect-error https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus#browser_compatibility
      focusVisible: !1,
      preventScroll: !0
    })));
    const s = t.get(o.group);
    s && r.set(o.group, s.layout);
  }), Ve({
    cursorFlags: 0,
    hitRegions: n,
    initialLayoutMap: r,
    pointerDownAtPoint: { x: e.clientX, y: e.clientY },
    state: "active"
  }), n.length && e.preventDefault();
}
function oo({
  document: e,
  event: t,
  hitRegions: n,
  initialLayoutMap: r,
  mountedGroups: a,
  pointerDownAtPoint: o,
  prevCursorFlags: s
}) {
  let l = 0;
  n.forEach((c) => {
    const { group: d, groupSize: u } = c, { orientation: f, panels: m } = d, { disableCursor: v } = d.mutableState;
    let h = 0;
    o ? f === "horizontal" ? h = (t.clientX - o.x) / u * 100 : h = (t.clientY - o.y) / u * 100 : f === "horizontal" ? h = t.clientX < 0 ? -100 : 100 : h = t.clientY < 0 ? -100 : 100;
    const g = r.get(d), y = a.get(d);
    if (!g || !y)
      return;
    const {
      defaultLayoutDeferred: w,
      derivedPanelConstraints: S,
      groupSize: b,
      layout: P,
      separatorToPanels: N
    } = y;
    if (S && P && N) {
      const M = ut({
        delta: h,
        initialLayout: g,
        panelConstraints: S,
        pivotIndices: c.panels.map((_) => m.indexOf(_)),
        prevLayout: P,
        trigger: "mouse-or-touch"
      });
      if (_e(M, P)) {
        if (h !== 0 && !v)
          switch (f) {
            case "horizontal": {
              l |= h < 0 ? Gr : Yr;
              break;
            }
            case "vertical": {
              l |= h < 0 ? Zr : Xr;
              break;
            }
          }
      } else
        Me(c.group, {
          defaultLayoutDeferred: w,
          derivedPanelConstraints: S,
          groupSize: b,
          layout: M,
          separatorToPanels: N
        });
    }
  });
  let i = 0;
  t.movementX === 0 ? i |= s & er : i |= l & er, t.movementY === 0 ? i |= s & tr : i |= l & tr, Ji(i), vn(e);
}
function fr(e) {
  const t = $e(), n = De();
  switch (n.state) {
    case "active":
      oo({
        document: e.currentTarget,
        event: e,
        hitRegions: n.hitRegions,
        initialLayoutMap: n.initialLayoutMap,
        mountedGroups: t,
        prevCursorFlags: n.cursorFlags
      });
  }
}
function mr(e) {
  var r, a;
  if (e.defaultPrevented)
    return;
  const t = De(), n = $e();
  switch (t.state) {
    case "active": {
      if (
        // Skip this check for "pointerleave" events, else Firefox triggers a false positive (see #514)
        e.buttons === 0
      ) {
        Ve({
          cursorFlags: 0,
          state: "inactive"
        }), t.hitRegions.forEach((o) => {
          const s = Le(o.group.id, !0);
          Me(o.group, s, {
            isUserInteraction: !0
          });
        });
        return;
      }
      for (const o of t.hitRegions)
        if (o.separator) {
          const { element: s } = o.separator;
          (r = s.hasPointerCapture) != null && r.call(s, e.pointerId) || ((a = s.setPointerCapture) == null || a.call(s, e.pointerId));
        }
      oo({
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
      const o = Sn(e, n);
      o.length === 0 ? t.state !== "inactive" && Ve({
        cursorFlags: 0,
        state: "inactive"
      }) : Ve({
        cursorFlags: 0,
        hitRegions: o,
        state: "hover"
      }), vn(e.currentTarget);
      break;
    }
  }
}
function pr(e) {
  if (e.relatedTarget instanceof HTMLIFrameElement)
    switch (De().state) {
      case "hover":
        Ve({
          cursorFlags: 0,
          state: "inactive"
        });
    }
}
function hr(e) {
  e.defaultPrevented || e.pointerType === "mouse" && e.button > 0 || eo(e.currentTarget) && e.preventDefault();
}
function gr(e) {
  let t = 0, n = 0;
  const r = {};
  for (const o of e)
    if (o.defaultSize !== void 0) {
      t++;
      const s = fe(o.defaultSize);
      n += s, r[o.panelId] = s;
    } else
      r[o.panelId] = void 0;
  const a = e.length - t;
  if (a !== 0) {
    const o = fe((100 - n) / a);
    for (const s of e)
      s.defaultSize === void 0 && (r[s.panelId] = o);
  }
  return r;
}
function oc(e, t, n) {
  if (!n[0])
    return;
  const r = e.panels.find((i) => i.element === t);
  if (!r || !r.onResize)
    return;
  const a = Ze({ group: e }), o = e.orientation === "horizontal" ? r.element.offsetWidth : r.element.offsetHeight, s = r.mutableValues.prevSize, l = {
    asPercentage: fe(o / a * 100),
    inPixels: o
  };
  r.mutableValues.prevSize = l, r.onResize(l, r.id, s);
}
function ac(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function sc({
  group: e,
  nextGroupSize: t,
  prevGroupSize: n,
  prevLayout: r
}) {
  if (n <= 0 || t <= 0 || n === t)
    return r;
  let a = 0, o = 0, s = !1;
  const l = /* @__PURE__ */ new Map(), i = [];
  for (const u of e.panels) {
    const f = r[u.id] ?? 0;
    switch (u.panelConstraints.groupResizeBehavior) {
      case "preserve-pixel-size": {
        s = !0;
        const m = f / 100 * n, v = fe(
          m / t * 100
        );
        l.set(u.id, v), a += v;
        break;
      }
      case "preserve-relative-size":
      default: {
        i.push(u.id), o += f;
        break;
      }
    }
  }
  if (!s || i.length === 0)
    return r;
  const c = 100 - a, d = { ...r };
  if (l.forEach((u, f) => {
    d[f] = u;
  }), o > 0)
    for (const u of i) {
      const f = r[u] ?? 0;
      d[u] = fe(
        f / o * c
      );
    }
  else {
    const u = fe(
      c / i.length
    );
    for (const f of i)
      d[f] = u;
  }
  return d;
}
function ic(e, t) {
  const n = e.map((a) => a.id), r = Object.keys(t);
  if (n.length !== r.length)
    return !1;
  for (const a of n)
    if (!r.includes(a))
      return !1;
  return !0;
}
const Be = /* @__PURE__ */ new Map();
function cc(e) {
  let t = !0;
  Z(
    e.element.ownerDocument.defaultView,
    "Cannot register an unmounted Group"
  );
  const n = e.element.ownerDocument.defaultView.ResizeObserver, r = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set(), o = new n((v) => {
    for (const h of v) {
      const { borderBoxSize: g, target: y } = h;
      if (y === e.element) {
        if (t) {
          const w = Ze({ group: e });
          if (w === 0)
            return;
          const S = Le(e.id);
          if (!S)
            return;
          const b = Qt(e), P = S.defaultLayoutDeferred ? gr(b) : S.layout, N = sc({
            group: e,
            nextGroupSize: w,
            prevGroupSize: S.groupSize,
            prevLayout: P
          }), M = Oe({
            layout: N,
            panelConstraints: b
          });
          if (!S.defaultLayoutDeferred && _e(S.layout, M) && ac(
            S.derivedPanelConstraints,
            b
          ) && S.groupSize === w)
            return;
          Me(e, {
            defaultLayoutDeferred: !1,
            derivedPanelConstraints: b,
            groupSize: w,
            layout: M,
            separatorToPanels: S.separatorToPanels
          });
        }
      } else
        oc(e, y, g);
    }
  });
  o.observe(e.element), e.panels.forEach((v) => {
    Z(
      !r.has(v.id),
      `Panel ids must be unique; id "${v.id}" was used more than once`
    ), r.add(v.id), v.onResize && o.observe(v.element);
  });
  const s = Ze({ group: e }), l = Qt(e), i = e.panels.map(({ id: v }) => v).join(",");
  let c = e.mutableState.defaultLayout;
  c && (ic(e.panels, c) || (c = void 0));
  const d = e.mutableState.layouts[i] ?? c ?? gr(l), u = Oe({
    layout: d,
    panelConstraints: l
  }), f = e.element.ownerDocument;
  Be.set(
    f,
    (Be.get(f) ?? 0) + 1
  );
  const m = /* @__PURE__ */ new Map();
  return qr(e).forEach((v) => {
    v.separator && m.set(v.separator, v.panels);
  }), Me(e, {
    defaultLayoutDeferred: s === 0,
    derivedPanelConstraints: l,
    groupSize: s,
    layout: u,
    separatorToPanels: m
  }), e.separators.forEach((v) => {
    Z(
      !a.has(v.id),
      `Separator ids must be unique; id "${v.id}" was used more than once`
    ), a.add(v.id), v.element.addEventListener("keydown", dr);
  }), Be.get(f) === 1 && (f.addEventListener("contextmenu", ar, !0), f.addEventListener("dblclick", lr, !0), f.addEventListener("pointerdown", ur, !0), f.addEventListener("pointerleave", fr), f.addEventListener("pointermove", mr), f.addEventListener("pointerout", pr), f.addEventListener("pointerup", hr, !0)), function() {
    t = !1, Be.set(
      f,
      Math.max(0, (Be.get(f) ?? 0) - 1)
    ), Vi(e), e.separators.forEach((v) => {
      v.element.removeEventListener("keydown", dr);
    }), Be.get(f) || (f.removeEventListener(
      "contextmenu",
      ar,
      !0
    ), f.removeEventListener(
      "dblclick",
      lr,
      !0
    ), f.removeEventListener(
      "pointerdown",
      ur,
      !0
    ), f.removeEventListener("pointerleave", fr), f.removeEventListener("pointermove", mr), f.removeEventListener("pointerout", pr), f.removeEventListener("pointerup", hr, !0)), o.disconnect();
  };
}
function lc() {
  const [e, t] = L({}), n = k(() => t({}), []);
  return [e, n];
}
function Pn(e) {
  const t = cn();
  return `${e ?? t}`;
}
const je = typeof window < "u" ? Fe : $;
function at(e) {
  const t = x(e);
  return je(() => {
    t.current = e;
  }, [e]), k(
    (...n) => {
      var r;
      return (r = t.current) == null ? void 0 : r.call(t, ...n);
    },
    [t]
  );
}
function In(...e) {
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
function Rn(e) {
  const t = x({ ...e });
  return je(() => {
    for (const n in e)
      t.current[n] = e[n];
  }, [e]), t.current;
}
const ao = an(null);
function dc(e, t) {
  const n = x({
    getLayout: () => ({}),
    setLayout: Ki
  });
  on(t, () => n.current, []), je(() => {
    Object.assign(
      n.current,
      ro({ groupId: e })
    );
  });
}
function so({
  children: e,
  className: t,
  defaultLayout: n,
  disableCursor: r,
  disabled: a,
  elementRef: o,
  groupRef: s,
  id: l,
  onLayoutChange: i,
  onLayoutChanged: c,
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
  }), h = at((R) => {
    _e(v.current.onLayoutChange, R) || (v.current.onLayoutChange = R, i == null || i(R));
  }), g = at(
    (R, I) => {
      _e(v.current.onLayoutChanged, R) || (v.current.onLayoutChanged = R, c == null || c(R, { isUserInteraction: I }));
    }
  ), y = Pn(l), w = x(null), [S, b] = lc(), P = x({
    lastExpandedPanelSizes: {},
    layouts: {},
    panels: [],
    resizeTargetMinimumSize: u,
    separators: []
  }), N = In(w, o);
  dc(y, s);
  const M = at(
    (R, I) => {
      const A = De(), D = or(R), C = Le(R);
      if (C) {
        let F = !1;
        switch (A.state) {
          case "active": {
            F = A.hitRegions.some(
              (B) => B.group === D
            );
            break;
          }
        }
        return {
          flexGrow: C.layout[I] ?? 1,
          pointerEvents: F ? "none" : void 0
        };
      }
      if (n != null && n[I])
        return {
          flexGrow: n == null ? void 0 : n[I]
        };
    }
  ), _ = Rn({
    defaultLayout: n,
    disableCursor: r
  }), T = q(
    () => ({
      get disableCursor() {
        return !!_.disableCursor;
      },
      getPanelStyles: M,
      id: y,
      orientation: d,
      registerPanel: (R) => {
        const I = P.current;
        return I.panels = en(d, [
          ...I.panels,
          R
        ]), b(), () => {
          I.panels = I.panels.filter(
            (A) => A !== R
          ), b();
        };
      },
      registerSeparator: (R) => {
        const I = P.current;
        return I.separators = en(d, [
          ...I.separators,
          R
        ]), b(), () => {
          I.separators = I.separators.filter(
            (A) => A !== R
          ), b();
        };
      },
      updatePanelProps: (R, { disabled: I }) => {
        const A = P.current.panels.find(
          (F) => F.id === R
        );
        A && (A.panelConstraints.disabled = I);
        const D = or(y), C = Le(y);
        D && C && Me(D, {
          ...C,
          derivedPanelConstraints: Qt(D)
        });
      },
      updateSeparatorProps: (R, {
        disabled: I,
        disableDoubleClick: A
      }) => {
        const D = P.current.separators.find(
          (C) => C.id === R
        );
        D && (D.disabled = I, D.disableDoubleClick = A);
      }
    }),
    [M, y, b, d, _]
  ), E = x(null);
  return je(() => {
    const R = w.current;
    if (R === null)
      return;
    const I = P.current;
    let A;
    if (_.defaultLayout !== void 0 && Object.keys(_.defaultLayout).length === I.panels.length) {
      A = {};
      for (const K of I.panels) {
        const oe = _.defaultLayout[K.id];
        oe !== void 0 && (A[K.id] = oe);
      }
    }
    const D = {
      disabled: !!a,
      element: R,
      id: y,
      mutableState: {
        defaultLayout: A,
        disableCursor: !!_.disableCursor,
        expandedPanelSizes: P.current.lastExpandedPanelSizes,
        layouts: P.current.layouts
      },
      orientation: d,
      panels: I.panels,
      resizeTargetMinimumSize: I.resizeTargetMinimumSize,
      separators: I.separators
    };
    E.current = D;
    const C = cc(D), { defaultLayoutDeferred: F, derivedPanelConstraints: B, layout: X } = Le(D.id, !0);
    !F && B.length > 0 && (h(X), g(X, !1));
    const J = wn(y, (K) => {
      const { defaultLayoutDeferred: oe, derivedPanelConstraints: se, layout: U } = K.next;
      if (oe || se.length === 0)
        return;
      const G = D.panels.map(({ id: ee }) => ee).join(",");
      D.mutableState.layouts[G] = U, se.forEach((ee) => {
        if (ee.collapsible) {
          const { layout: de } = K.prev ?? {};
          if (de) {
            const he = ue(
              ee.collapsedSize,
              U[ee.panelId]
            ), pe = ue(
              ee.collapsedSize,
              de[ee.panelId]
            );
            he && !pe && (D.mutableState.expandedPanelSizes[ee.panelId] = de[ee.panelId]);
          }
        }
      });
      const Q = De().state !== "active";
      h(U), Q && g(U, K.isUserInteraction);
    });
    return () => {
      E.current = null, C(), J();
    };
  }, [
    a,
    y,
    g,
    h,
    d,
    S,
    _
  ]), $(() => {
    const R = E.current;
    R && (R.mutableState.defaultLayout = n, R.mutableState.disableCursor = !!r);
  }), /* @__PURE__ */ p(ao.Provider, { value: T, children: /* @__PURE__ */ p(
    "div",
    {
      ...m,
      className: t,
      "data-group": !0,
      "data-testid": y,
      id: y,
      ref: N,
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
so.displayName = "Group";
function Tn() {
  const e = sn(ao);
  return Z(
    e,
    "Group Context not found; did you render a Panel or Separator outside of a Group?"
  ), e;
}
function uc(e, t) {
  const { id: n } = Tn(), r = x({
    collapse: Ut,
    expand: Ut,
    getSize: () => ({
      asPercentage: 0,
      inPixels: 0
    }),
    isCollapsed: () => !1,
    resize: Ut
  });
  on(t, () => r.current, []), je(() => {
    Object.assign(
      r.current,
      no({ groupId: n, panelId: e })
    );
  });
}
function tn({
  children: e,
  className: t,
  collapsedSize: n = "0%",
  collapsible: r = !1,
  defaultSize: a,
  disabled: o,
  elementRef: s,
  groupResizeBehavior: l = "preserve-relative-size",
  id: i,
  maxSize: c = "100%",
  minSize: d = "0%",
  onResize: u,
  panelRef: f,
  style: m,
  ...v
}) {
  const h = !!i, g = Pn(i), y = Rn({
    disabled: o
  }), w = x(null), S = In(w, s), {
    getPanelStyles: b,
    id: P,
    orientation: N,
    registerPanel: M,
    updatePanelProps: _
  } = Tn(), T = u !== null, E = at(
    (D, C, F) => {
      u == null || u(D, i, F);
    }
  );
  je(() => {
    const D = w.current;
    if (D !== null) {
      const C = {
        element: D,
        id: g,
        idIsStable: h,
        mutableValues: {
          expandToSize: void 0,
          prevSize: void 0
        },
        onResize: T ? E : void 0,
        panelConstraints: {
          groupResizeBehavior: l,
          collapsedSize: n,
          collapsible: r,
          defaultSize: a,
          disabled: y.disabled,
          maxSize: c,
          minSize: d
        }
      };
      return M(C);
    }
  }, [
    l,
    n,
    r,
    a,
    T,
    g,
    h,
    c,
    d,
    E,
    M,
    y
  ]), $(() => {
    _(g, { disabled: o });
  }, [o, g, _]), uc(g, f);
  const R = () => {
    const D = b(P, g);
    if (D)
      return JSON.stringify(D);
  }, I = po(
    (D) => wn(P, D),
    R,
    R
  );
  let A;
  return I ? A = JSON.parse(I) : a !== void 0 ? A = {
    flexGrow: void 0,
    flexShrink: void 0,
    flexBasis: a
  } : A = { flexGrow: 1 }, /* @__PURE__ */ p(
    "div",
    {
      ...v,
      "data-disabled": o || void 0,
      "data-panel": !0,
      "data-testid": g,
      id: g,
      ref: S,
      style: {
        ...fc,
        display: "flex",
        flexBasis: 0,
        flexShrink: 1,
        overflow: "visible",
        ...A
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
            touchAction: N === "horizontal" ? "pan-y" : "pan-x"
          },
          children: e
        }
      )
    }
  );
}
tn.displayName = "Panel";
const fc = {
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
function mc({
  layout: e,
  panelConstraints: t,
  panelId: n,
  panelIndex: r
}) {
  let a, o;
  const s = e[n], l = t.find(
    (i) => i.panelId === n
  );
  if (l) {
    const i = l.maxSize, c = l.collapsible ? l.collapsedSize : l.minSize, d = [r, r + 1];
    o = Oe({
      layout: ut({
        delta: c - s,
        initialLayout: e,
        panelConstraints: t,
        pivotIndices: d,
        prevLayout: e
      }),
      panelConstraints: t
    })[n], a = Oe({
      layout: ut({
        delta: i - s,
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
    valueMax: a,
    valueMin: o,
    valueNow: s
  };
}
function io({
  children: e,
  className: t,
  disabled: n,
  disableDoubleClick: r,
  elementRef: a,
  id: o,
  style: s,
  ...l
}) {
  const i = Pn(o), c = Rn({
    disabled: n,
    disableDoubleClick: r
  }), [d, u] = L({}), [f, m] = L("inactive"), [v, h] = L(!1), g = x(null), y = In(g, a), {
    disableCursor: w,
    id: S,
    orientation: b,
    registerSeparator: P,
    updateSeparatorProps: N
  } = Tn(), M = b === "horizontal" ? "vertical" : "horizontal";
  je(() => {
    const E = g.current;
    if (E !== null) {
      const R = {
        disabled: c.disabled,
        disableDoubleClick: c.disableDoubleClick,
        element: E,
        id: i
      }, I = P(R), A = Wi(
        (C) => {
          m(
            C.next.state !== "inactive" && C.next.hitRegions.some(
              (F) => F.separator === R
            ) ? C.next.state : "inactive"
          );
        }
      ), D = wn(
        S,
        (C) => {
          const { derivedPanelConstraints: F, layout: B, separatorToPanels: X } = C.next, J = X.get(R);
          if (J) {
            const K = J[0], oe = J.indexOf(K);
            u(
              mc({
                layout: B,
                panelConstraints: F,
                panelId: K.id,
                panelIndex: oe
              })
            );
          }
        }
      );
      return () => {
        A(), D(), I();
      };
    }
  }, [S, i, P, c]), $(() => {
    N(i, { disabled: n, disableDoubleClick: r });
  }, [n, r, i, N]);
  let _;
  n && !w && (_ = "not-allowed");
  let T;
  if (n)
    T = "disabled";
  else
    switch (f) {
      case "active": {
        T = "active";
        break;
      }
      default:
        v ? T = "focus" : T = f;
    }
  return /* @__PURE__ */ p(
    "div",
    {
      ...l,
      "aria-controls": d.valueControls,
      "aria-disabled": n || void 0,
      "aria-orientation": M,
      "aria-valuemax": d.valueMax,
      "aria-valuemin": d.valueMin,
      "aria-valuenow": d.valueNow,
      children: e,
      className: t,
      "data-separator": T,
      "data-testid": i,
      id: i,
      onBlur: () => h(!1),
      onFocus: () => h(!0),
      ref: y,
      role: "separator",
      style: {
        flexBasis: "auto",
        cursor: _,
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
io.displayName = "Separator";
const En = 30, Mn = 65, ft = 50, pc = 100 - Mn, hc = 100 - En;
function gc(e) {
  const t = Number(e);
  return Number.isFinite(t) ? Math.min(Mn, Math.max(En, t)) : ft;
}
function An(e) {
  return 100 - e;
}
function He(e) {
  return `${e}%`;
}
const kn = "reader-document", mt = "reader-assistant", co = "retainpdf.reader.ai-split-layout.v1", bc = {
  [kn]: An(ft),
  [mt]: ft
};
function Nn(e) {
  const t = gc(e == null ? void 0 : e[mt]);
  return {
    [kn]: An(t),
    [mt]: t
  };
}
function yc() {
  try {
    const e = JSON.parse(localStorage.getItem(co) || "null");
    return Nn(e);
  } catch {
    return bc;
  }
}
function vc(e) {
  try {
    localStorage.setItem(co, JSON.stringify(Nn(e)));
  } catch {
  }
}
function Bt(e, t) {
  const n = e == null ? void 0 : e.closest(".reader-react-root");
  if (!n) return;
  const r = Nn(t);
  n.style.setProperty(
    "--reader-ai-split-width",
    `${r[mt]}vw`
  );
}
function wc() {
  const e = x(null), [t] = L(yc);
  Fe(() => {
    const a = e.current;
    return Bt(a, t), () => {
      var o;
      (o = a == null ? void 0 : a.closest(".reader-react-root")) == null || o.style.removeProperty("--reader-ai-split-width");
    };
  }, [t]);
  const n = k((a) => {
    Bt(e.current, a);
  }, []), r = k((a, o) => {
    Bt(e.current, a), o.isUserInteraction && vc(a);
  }, []);
  return /* @__PURE__ */ z(
    so,
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
          tn,
          {
            id: kn,
            defaultSize: He(An(ft)),
            minSize: He(pc),
            maxSize: He(hc)
          }
        ),
        /* @__PURE__ */ p(
          io,
          {
            id: "reader-ai-split-separator",
            className: "reader-ai-split-separator",
            "aria-label": "调整文档与 AI 问答宽度",
            children: /* @__PURE__ */ p("span", { "aria-hidden": "true" })
          }
        ),
        /* @__PURE__ */ p(
          tn,
          {
            id: mt,
            defaultSize: He(ft),
            minSize: He(En),
            maxSize: He(Mn)
          }
        )
      ]
    }
  );
}
const Ne = 12, Sc = 4;
function Ke(e, t, n) {
  if (typeof window > "u") return { x: e, y: t };
  const r = Math.min(n, window.innerWidth - Ne * 2), a = Math.max(Ne, window.innerWidth - r - Ne), o = Math.min(window.innerHeight * 0.9, 860), s = Math.max(Ne, window.innerHeight - o - Ne);
  return {
    x: Math.min(a, Math.max(Ne, e)),
    y: Math.min(s, Math.max(Ne, t))
  };
}
function br(e) {
  if (typeof window > "u") return { x: 24, y: 72 };
  const t = Math.min(e, window.innerWidth - Ne * 2);
  return Ke(window.innerWidth - t - 20, 72, e);
}
function Pc(e, t) {
  try {
    const n = localStorage.getItem(e);
    if (!n) return br(t);
    const r = JSON.parse(n);
    if (typeof r.x == "number" && typeof r.y == "number")
      return Ke(r.x, r.y, t);
  } catch {
  }
  return br(t);
}
function Ic(e, t) {
  try {
    localStorage.setItem(e, JSON.stringify(t));
  } catch {
  }
}
function Rc({
  id: e,
  open: t,
  title: n,
  subtitle: r = "拖动标题可移动",
  titleIcon: a,
  storageKey: o,
  ariaLabel: s,
  className: l = "",
  width: i = 360,
  placement: c = "floating",
  showHeader: d = !0,
  onClose: u,
  toolbar: f,
  children: m
}) {
  const v = c === "workspace", h = c === "dock-right", g = h || v, [y, w] = L(() => Pc(o, i)), [S, b] = L(!1), P = x(null);
  $(() => {
    !t || g || w((T) => Ke(T.x, T.y, i));
  }, [g, t, i]), $(() => {
    if (!t || g) return;
    const T = () => w((E) => Ke(E.x, E.y, i));
    return window.addEventListener("resize", T), () => window.removeEventListener("resize", T);
  }, [g, t, i]), $(() => {
    if (!t) return;
    const T = (E) => {
      var I;
      if (E.key !== "Escape") return;
      const R = E.target;
      (I = R == null ? void 0 : R.closest) != null && I.call(R, "textarea, input, select, [contenteditable='true']") || (E.preventDefault(), u());
    };
    return window.addEventListener("keydown", T), () => window.removeEventListener("keydown", T);
  }, [t, u]);
  const N = k((T) => {
    var E, R;
    g || T.button === 0 && ((R = (E = T.target) == null ? void 0 : E.closest) != null && R.call(E, "button") || (T.currentTarget.setPointerCapture(T.pointerId), P.current = {
      pointerId: T.pointerId,
      startX: T.clientX,
      startY: T.clientY,
      originX: y.x,
      originY: y.y,
      moved: !1
    }, b(!0)));
  }, [g, y.x, y.y]), M = k((T) => {
    const E = P.current;
    if (!E || E.pointerId !== T.pointerId) return;
    const R = T.clientX - E.startX, I = T.clientY - E.startY;
    !E.moved && Math.hypot(R, I) < Sc || (E.moved = !0, w(Ke(E.originX + R, E.originY + I, i)));
  }, [i]), _ = k((T) => {
    const E = P.current;
    if (!(!E || E.pointerId !== T.pointerId)) {
      P.current = null, b(!1);
      try {
        T.currentTarget.releasePointerCapture(T.pointerId);
      } catch {
      }
      E.moved && w((R) => {
        const I = Ke(R.x, R.y, i);
        return Ic(o, I), I;
      });
    }
  }, [o, i]);
  return t ? /* @__PURE__ */ z(
    "aside",
    {
      id: e,
      className: `reader-notes-panel reader-notes-panel--${v ? "workspace" : h ? "docked" : "float"}${g ? "" : " reader-floating-surface"}${d ? " has-panel-header" : " is-headerless"}${f ? " has-panel-toolbar" : ""}${S ? " is-dragging" : ""} ${l}`.trim(),
      style: g ? void 0 : { left: y.x, top: y.y, width: Math.min(i, typeof window < "u" ? window.innerWidth - 24 : i) },
      "aria-label": s,
      role: "dialog",
      "aria-modal": "false",
      children: [
        d ? /* @__PURE__ */ z(
          "header",
          {
            className: "reader-notes-panel-head",
            onPointerDown: N,
            onPointerMove: M,
            onPointerUp: _,
            onPointerCancel: _,
            children: [
              g ? null : /* @__PURE__ */ p("div", { className: "reader-notes-panel-drag", "aria-hidden": "true", children: /* @__PURE__ */ p(_o, { size: 14, strokeWidth: 2.25 }) }),
              /* @__PURE__ */ z("div", { className: "reader-notes-panel-head-text", children: [
                /* @__PURE__ */ z("strong", { children: [
                  a,
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
function Tc({
  note: e,
  onJump: t,
  onUpdateNote: n,
  onRemove: r
}) {
  const [a, o] = L(!1), [s, l] = L(e.note);
  return $(() => {
    a || l(e.note);
  }, [e.note, a]), /* @__PURE__ */ z("article", { className: "reader-notes-item", children: [
    /* @__PURE__ */ z("div", { className: "reader-notes-item-top", children: [
      /* @__PURE__ */ p("span", { className: "reader-notes-kind", children: e.pane === "translated" ? "译文" : "原文" }),
      /* @__PURE__ */ z("div", { className: "reader-notes-item-actions", children: [
        /* @__PURE__ */ p("button", { type: "button", className: "reader-notes-link", onClick: () => t(e), children: "定位" }),
        /* @__PURE__ */ p("button", { type: "button", className: "reader-notes-danger", onClick: () => r(e.id), children: "删除" })
      ] })
    ] }),
    /* @__PURE__ */ p("p", { className: "reader-notes-quote", children: e.quote }),
    a ? /* @__PURE__ */ z("div", { className: "reader-notes-editor", children: [
      /* @__PURE__ */ p(
        "textarea",
        {
          className: "reader-notes-textarea",
          value: s,
          placeholder: "写点想法…",
          rows: 3,
          onChange: (i) => l(i.target.value)
        }
      ),
      /* @__PURE__ */ z("div", { className: "reader-notes-editor-actions", children: [
        /* @__PURE__ */ p(
          "button",
          {
            type: "button",
            className: "reader-notes-primary",
            onClick: () => {
              n(e.id, s), o(!1);
            },
            children: "保存"
          }
        ),
        /* @__PURE__ */ p("button", { type: "button", className: "reader-notes-link", onClick: () => o(!1), children: "取消" })
      ] })
    ] }) : e.note ? /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: "reader-notes-note",
        onClick: () => o(!0),
        title: "点击编辑",
        children: e.note
      }
    ) : /* @__PURE__ */ p("button", { type: "button", className: "reader-notes-add-note", onClick: () => o(!0), children: "添加笔记" })
  ] });
}
function Ec({
  open: e,
  groups: t,
  count: n,
  onClose: r,
  onJump: a,
  onUpdateNote: o,
  onRemove: s,
  onExport: l
}) {
  const [i, c] = L(!1);
  return /* @__PURE__ */ p(
    Rc,
    {
      id: "reader-notes-panel",
      open: e,
      title: "批注",
      subtitle: "选中 PDF 文字后可添加 · 本地保存",
      titleIcon: /* @__PURE__ */ p(xt, { size: 14, strokeWidth: 2.25, "aria-hidden": !0 }),
      storageKey: "retainpdf.reader.notes-float.pos.v1",
      ariaLabel: "批注",
      onClose: r,
      toolbar: /* @__PURE__ */ z(kt, { children: [
        /* @__PURE__ */ z("span", { className: "reader-notes-count", children: [
          n,
          " 条"
        ] }),
        /* @__PURE__ */ p(
          "button",
          {
            type: "button",
            className: "reader-notes-export",
            disabled: i || n === 0,
            onClick: async () => {
              await l() && (c(!0), window.setTimeout(() => c(!1), 1800));
            },
            children: i ? "已复制" : "导出 Markdown"
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
          Tc,
          {
            note: u,
            onJump: a,
            onUpdateNote: o,
            onRemove: s
          },
          u.id
        ))
      ] }, d.page))
    }
  );
}
function Mc({
  regionsFailed: e = !1,
  metadataFailed: t = !1
}) {
  const [n, r] = L(!1);
  if ($(() => {
    !e && !t && r(!1);
  }, [e, t]), n || !e && !t)
    return null;
  const a = [
    e ? "译文区域" : "",
    t ? "阅读元数据" : ""
  ].filter(Boolean);
  return /* @__PURE__ */ z("div", { className: "reader-error-notice", role: "status", "data-reader-error-notice": "true", children: [
    /* @__PURE__ */ z("span", { className: "reader-error-notice-text", children: [
      a.join("、"),
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
function Ac({
  loading: e,
  failed: t,
  text: n,
  percent: r,
  regionsError: a = !1,
  metadataError: o = !1
}) {
  return !e && !t ? /* @__PURE__ */ p(Mc, { regionsFailed: a, metadataFailed: o }) : /* @__PURE__ */ z(kt, { children: [
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
async function kc(e) {
  var a;
  const t = `${e || ""}`;
  if (!t) throw new Error("empty selection");
  try {
    if ((a = navigator.clipboard) != null && a.writeText) {
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
function Nc({
  selection: e,
  onDismiss: t,
  onAskAi: n,
  onAddNote: r
}) {
  const [a, o] = L(!1), s = e ? e.selectionType === "text" ? `${e.pane}:${e.page}:${e.quote}` : `${e.region.itemId}:${e.pane}` : "";
  if ($(() => o(!1), [s]), !e)
    return null;
  const l = typeof window < "u" ? window.innerWidth : 800, i = typeof window < "u" ? window.innerHeight : 600, c = e.rect.left + e.rect.width / 2, d = 170, u = Math.min(Math.max(16 + d, c), l - 16 - d), f = e.rect.top > 72, m = f ? Math.max(12, e.rect.top - 8) : Math.min(i - 12, e.rect.top + e.rect.height + 8), v = f ? "above" : "below", h = e.pane === "translated" ? "译文" : "原文", g = e.selectionType === "text" ? "text" : e.kind, y = e.selectionType === "text" ? e.quote : Rr(e.region, e.pane), w = g === "formula" ? "公式" : g === "table" ? "表格" : g === "figure" ? "图片" : g === "text" ? "文字" : "区域", S = g === "formula" ? Ao(y) : y, b = g === "formula" ? Oo : g === "table" ? Fo : g === "text" ? $o : jo;
  return /* @__PURE__ */ z(
    "div",
    {
      className: `reader-sel-pop reader-sel-pop--${v} reader-sel-pop--region`,
      style: { left: u, top: m },
      role: "toolbar",
      "aria-label": "选区操作",
      onPointerDown: (P) => {
        P.preventDefault();
      },
      children: [
        /* @__PURE__ */ z("div", { className: "reader-sel-pop-card reader-floating-surface", children: [
          /* @__PURE__ */ z("div", { className: "reader-sel-pop-context", children: [
            /* @__PURE__ */ p(b, { size: 15, strokeWidth: 2.1, "aria-hidden": !0 }),
            /* @__PURE__ */ p("span", { children: w }),
            /* @__PURE__ */ p("span", { className: "reader-sel-pop-context-divider", "aria-hidden": !0, children: "·" }),
            /* @__PURE__ */ p("span", { children: h }),
            /* @__PURE__ */ p("span", { className: "reader-sel-pop-context-divider", "aria-hidden": !0, children: "·" }),
            /* @__PURE__ */ z("span", { children: [
              e.page,
              " 页"
            ] })
          ] }),
          /* @__PURE__ */ z("div", { className: "reader-sel-pop-actions", children: [
            S ? /* @__PURE__ */ z(
              "button",
              {
                type: "button",
                className: "reader-sel-pop-btn reader-sel-pop-btn--primary",
                onClick: async () => {
                  try {
                    await kc(S), o(!0), window.setTimeout(() => o(!1), 1400);
                  } catch (P) {
                    console.warn("[reader-selection] copy failed", P);
                  }
                },
                children: [
                  a ? /* @__PURE__ */ p(Uo, { size: 15, strokeWidth: 2.4, "aria-hidden": !0 }) : /* @__PURE__ */ p(Bo, { size: 15, strokeWidth: 2.2, "aria-hidden": !0 }),
                  /* @__PURE__ */ p("span", { children: a ? "已复制" : g === "formula" ? "复制 LaTeX" : "复制" })
                ]
              }
            ) : /* @__PURE__ */ p("span", { className: "reader-sel-pop-selection-hint", children: "已选择图片" }),
            r && S ? /* @__PURE__ */ z(
              "button",
              {
                type: "button",
                className: "reader-sel-pop-btn reader-sel-pop-btn--secondary",
                onClick: () => r({ page: e.page, pane: e.pane, quote: S }),
                children: [
                  /* @__PURE__ */ p(xt, { size: 15, strokeWidth: 2.2, "aria-hidden": !0 }),
                  /* @__PURE__ */ p("span", { children: "添加批注" })
                ]
              }
            ) : null,
            n ? /* @__PURE__ */ z(
              "button",
              {
                type: "button",
                className: "reader-sel-pop-btn reader-sel-pop-btn--secondary",
                onClick: () => n(e),
                children: [
                  /* @__PURE__ */ p(dn, { size: 15, strokeWidth: 2.2, "aria-hidden": !0 }),
                  /* @__PURE__ */ p("span", { children: "问 AI" })
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
function xc(e) {
  if (!(e instanceof HTMLElement)) return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
function Lc() {
  const [e, t] = L(!1), n = cn(), r = x(null);
  return $(() => {
    if (!e) return;
    const a = (s) => {
      const l = r.current;
      l && s.target instanceof Node && !l.contains(s.target) && t(!1);
    }, o = (s) => {
      s.key === "Escape" && (s.preventDefault(), t(!1));
    };
    return document.addEventListener("mousedown", a), window.addEventListener("keydown", o), () => {
      document.removeEventListener("mousedown", a), window.removeEventListener("keydown", o);
    };
  }, [e]), $(() => {
    const a = (o) => {
      if (o.defaultPrevented || o.metaKey || o.ctrlKey || o.altKey || xc(o.target)) return;
      const s = o.key;
      if (s === "?" || s === "h" || s === "H" || s === "/") {
        if (s === "/" && !o.shiftKey)
          return;
        o.preventDefault(), t((l) => !l);
      }
    };
    return window.addEventListener("keydown", a), () => window.removeEventListener("keydown", a);
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
        onClick: () => t((a) => !a),
        children: /* @__PURE__ */ p(Ho, { className: "reader-react-shortcuts-icon", size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
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
          /* @__PURE__ */ p("div", { className: "reader-react-shortcuts-body", children: Hs.map((a) => /* @__PURE__ */ z("section", { className: "reader-react-shortcuts-group", children: [
            /* @__PURE__ */ p("h3", { children: a.title }),
            /* @__PURE__ */ p("ul", { children: a.items.map((o) => /* @__PURE__ */ z("li", { children: [
              /* @__PURE__ */ p("kbd", { children: o.keys }),
              /* @__PURE__ */ p("span", { children: o.desc })
            ] }, `${a.title}-${o.keys}`)) })
          ] }, a.title)) }),
          /* @__PURE__ */ p("p", { className: "reader-react-shortcuts-foot", children: "在输入框内不会触发快捷键" })
        ]
      }
    ) : null
  ] });
}
const Cc = Object.freeze([
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
  },
  {
    id: "ai",
    label: "AI 问答",
    subIdle: "基于文档提问",
    subOpen: "关闭悬浮窗",
    needsJob: !0
  }
]), zc = ["source", "sideBySide", "translated"], Dc = { source: "", translated: "", sideBySide: "" };
function _c(e) {
  if (e.sourceOnly || !e.jobId) {
    const t = it(e.sourceUrl), n = it(e.translatedUrl);
    return {
      source: t,
      translated: n,
      // sideBySide requires dedicated artifact; no fallback to source url
      sideBySide: ""
    };
  }
  return ia({
    jobId: e.jobId,
    jobPayload: e.jobPayload,
    manifestPayload: e.manifestPayload
  });
}
function Oc(e) {
  const [t, n] = L(() => /* @__PURE__ */ new Set()), r = q(
    () => e ? _c(e) : Dc,
    [e]
  ), a = q(
    () => zc.filter((s) => !(e != null && e.sourceOnly && s !== "source")),
    [e == null ? void 0 : e.sourceOnly]
  ), o = k(async (s) => {
    if (!e) return;
    const l = it(r[s]);
    if (!(!l || t.has(s)))
      try {
        const i = e.jobId ? sa(s, {
          jobId: e.jobId,
          jobPayload: e.jobPayload,
          manifestPayload: e.manifestPayload
        }) : `${e.sourceOnly ? "document" : "reader"}-${s}.pdf`;
        await ca(
          e.fetchProtected,
          l,
          i,
          i,
          null,
          (c) => n((d) => {
            const u = new Set(d);
            return c ? u.add(s) : u.delete(s), u;
          })
        );
      } catch (i) {
        const c = i instanceof Error ? i.message : "下载失败";
        la(c), n((d) => {
          const u = new Set(d);
          return u.delete(s), u;
        });
      }
  }, [r, t, e]);
  return { urls: r, downloadItems: a, busyActions: t, handleDownload: o };
}
function Fc(e) {
  const [t, n] = L(!1), r = k(() => n(!1), []), a = k(() => n((o) => !o), []);
  return $(() => {
    if (!t) return;
    const o = (l) => {
      const i = e.current;
      i && l.target instanceof Node && !i.contains(l.target) && n(!1);
    }, s = (l) => {
      l.key === "Escape" && (l.preventDefault(), n(!1));
    };
    return document.addEventListener("mousedown", o), window.addEventListener("keydown", s), () => {
      document.removeEventListener("mousedown", o), window.removeEventListener("keydown", s);
    };
  }, [t, e]), { open: t, setOpen: n, closeMenu: r, toggleMenu: a };
}
const lo = "retainpdf.reader.fab.pos.v1", At = 52, We = 12, $c = 6;
function st(e, t) {
  if (typeof window > "u")
    return { x: e, y: t };
  const n = Math.max(We, window.innerWidth - At - We), r = Math.max(We, window.innerHeight - At - We);
  return {
    x: Math.min(n, Math.max(We, e)),
    y: Math.min(r, Math.max(We, t))
  };
}
function yr() {
  return typeof window > "u" ? { x: 24, y: 120 } : st(
    window.innerWidth - At - 20,
    window.innerHeight - At - 88
  );
}
function jc() {
  try {
    const e = localStorage.getItem(lo);
    if (!e) return yr();
    const t = JSON.parse(e);
    if (typeof t.x == "number" && typeof t.y == "number")
      return st(t.x, t.y);
  } catch {
  }
  return yr();
}
function Uc(e) {
  try {
    localStorage.setItem(lo, JSON.stringify(e));
  } catch {
  }
}
function Bc(e) {
  return typeof window < "u" && e.y > window.innerHeight * 0.55;
}
function Hc(e = {}) {
  const { onDragStart: t, onActivate: n } = e, [r, a] = L(() => jc()), o = x(null);
  $(() => {
    const c = () => a((d) => st(d.x, d.y));
    return window.addEventListener("resize", c), () => window.removeEventListener("resize", c);
  }, []);
  const s = k((c) => {
    c.button === 0 && (c.currentTarget.setPointerCapture(c.pointerId), o.current = {
      pointerId: c.pointerId,
      startX: c.clientX,
      startY: c.clientY,
      originX: r.x,
      originY: r.y,
      moved: !1
    });
  }, [r.x, r.y]), l = k((c) => {
    const d = o.current;
    if (!d || d.pointerId !== c.pointerId) return;
    const u = c.clientX - d.startX, f = c.clientY - d.startY;
    !d.moved && Math.hypot(u, f) < $c || (d.moved || (d.moved = !0, t == null || t()), a(st(d.originX + u, d.originY + f)));
  }, [t]), i = k((c) => {
    const d = o.current;
    if (!(!d || d.pointerId !== c.pointerId)) {
      o.current = null;
      try {
        c.currentTarget.releasePointerCapture(c.pointerId);
      } catch {
      }
      if (d.moved) {
        a((u) => {
          const f = st(u.x, u.y);
          return Uc(f), f;
        });
        return;
      }
      n == null || n();
    }
  }, [n]);
  return {
    pos: r,
    openUp: Bc(r),
    onPointerDown: s,
    onPointerMove: l,
    onPointerUp: i
  };
}
const Wc = {
  source: Tr,
  sideBySide: Er,
  translated: Mr
}, Jc = {
  source: "原文",
  sideBySide: "对照",
  translated: "译文"
};
function Kc({ onClose: e }) {
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
function qc({
  index: e,
  icon: t,
  title: n,
  sub: r,
  active: a,
  disabled: o,
  onClick: s
}) {
  return /* @__PURE__ */ z(
    "button",
    {
      type: "button",
      role: "menuitem",
      className: `reader-fab-row${a ? " is-active" : ""}${o ? " is-disabled" : ""}`,
      "aria-pressed": a,
      disabled: o,
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
function Vc({
  urls: e,
  items: t,
  busyActions: n,
  onDownload: r
}) {
  return /* @__PURE__ */ z("div", { className: "reader-fab-section", role: "group", "aria-label": "下载", children: [
    /* @__PURE__ */ z("div", { className: "reader-fab-section-head", children: [
      /* @__PURE__ */ p(Wo, { size: 12, strokeWidth: 2.5, "aria-hidden": !0 }),
      /* @__PURE__ */ p("span", { children: "下载 PDF" })
    ] }),
    /* @__PURE__ */ p("div", { className: "reader-fab-download-grid", children: t.map((a, o) => {
      const s = vo[a], l = it(e[a]), i = n.has(a), c = !!l && !i, d = c ? "" : wo(a, e), u = Wc[a];
      return /* @__PURE__ */ z(
        "button",
        {
          type: "button",
          role: "menuitem",
          id: `reader-fab-download-${a}`,
          className: `reader-fab-chip${i ? " is-busy" : ""}${c ? "" : " is-disabled"}`,
          disabled: !c,
          title: c ? `下载${s.label}` : d,
          onClick: () => void r(a),
          style: { "--fab-i": o },
          children: [
            /* @__PURE__ */ p("span", { className: "reader-fab-chip-icon", "aria-hidden": "true", children: /* @__PURE__ */ p(u, { size: 16, strokeWidth: 2 }) }),
            /* @__PURE__ */ p("span", { className: "reader-fab-chip-label", children: Jc[a] }),
            /* @__PURE__ */ p("span", { className: "reader-fab-chip-state", children: i ? "…" : c ? "↓" : "—" })
          ]
        },
        a
      );
    }) }),
    t.every((a) => !it(e[a])) ? /* @__PURE__ */ p("p", { className: "reader-fab-empty", children: "产物尚未就绪" }) : null
  ] });
}
const Gc = {
  favorites: Jo,
  markdown: Ar,
  ai: dn,
  notes: xt
}, Yc = Cc;
function Zc(e) {
  const { activeTool: t, noteCount: n, onToggleTool: r } = e, a = ht(), o = e.sourceOnly ?? (a == null ? void 0 : a.sourceOnly) ?? !1, s = e.download ?? (a == null ? void 0 : a.download), l = x(null), i = cn(), { open: c, setOpen: d, closeMenu: u, toggleMenu: f } = Fc(l), { pos: m, openUp: v, onPointerDown: h, onPointerMove: g, onPointerUp: y } = Hc({
    onDragStart: u,
    onActivate: f
  }), { urls: w, downloadItems: S, busyActions: b, handleDownload: P } = Oc(s), N = k((M) => {
    r(M), d(!1);
  }, [r, d]);
  return /* @__PURE__ */ z(
    "div",
    {
      ref: l,
      className: `reader-fab${c ? " is-open" : ""}${v ? " is-open-up" : ""}`,
      style: { left: m.x, top: m.y },
      "data-reader-fab": "",
      children: [
        c ? /* @__PURE__ */ z(
          "div",
          {
            id: i,
            className: "reader-fab-menu reader-floating-surface",
            role: "menu",
            "aria-label": "阅读工具",
            children: [
              /* @__PURE__ */ p(Kc, { onClose: u }),
              (() => {
                const M = t === "notes";
                return /* @__PURE__ */ z(
                  "button",
                  {
                    type: "button",
                    role: "menuitem",
                    className: `reader-fab-row${M ? " is-active" : ""}`,
                    "aria-pressed": M,
                    onClick: () => N("notes"),
                    style: { "--fab-i": 0 },
                    children: [
                      /* @__PURE__ */ p("span", { className: "reader-fab-row-icon", "aria-hidden": "true", children: /* @__PURE__ */ p(xt, { size: 18, strokeWidth: 2 }) }),
                      /* @__PURE__ */ z("span", { className: "reader-fab-row-copy", children: [
                        /* @__PURE__ */ p("span", { className: "reader-fab-row-title", children: "批注" }),
                        /* @__PURE__ */ p("span", { className: "reader-fab-row-sub", children: M ? "关闭悬浮窗" : "本地批注 · 导出" })
                      ] }),
                      n > 0 ? /* @__PURE__ */ p("span", { className: "reader-fab-row-badge", children: n }) : null
                    ]
                  }
                );
              })(),
              Yc.map((M, _) => {
                const T = Gc[M.id], E = t === M.id, R = M.needsJob && o;
                let I = E ? M.subOpen : M.subIdle;
                return R && (I = "需打开任务阅读"), /* @__PURE__ */ p(
                  qc,
                  {
                    index: _,
                    icon: T,
                    title: M.label,
                    sub: I,
                    active: E,
                    disabled: R,
                    onClick: () => N(M.id)
                  },
                  M.id
                );
              }),
              /* @__PURE__ */ p(
                Vc,
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
            className: `reader-fab-trigger${c ? " is-open" : ""}${t ? " has-active-tool" : ""}`,
            "aria-label": c ? "收起工具菜单" : "打开工具菜单",
            "aria-expanded": c,
            "aria-controls": c ? i : void 0,
            "aria-haspopup": "menu",
            onPointerDown: h,
            onPointerMove: g,
            onPointerUp: y,
            onPointerCancel: y,
            children: /* @__PURE__ */ p("span", { className: "reader-fab-icon", "aria-hidden": "true", children: c ? /* @__PURE__ */ p(Xe, { size: 20, strokeWidth: 2.5 }) : /* @__PURE__ */ z("span", { className: "reader-fab-dots", children: [
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
function Xc(e) {
  const t = ht(), n = Ti(), { mode: r = "compare", modeControls: a } = e, o = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? pt, s = e.onZoomChange ?? (t == null ? void 0 : t.onZoomChange) ?? (() => {
  }), l = e.currentPage ?? (n == null ? void 0 : n.currentPage) ?? 1, i = e.numPages ?? (n == null ? void 0 : n.numPages) ?? 0, c = e.onGoToPage ?? (t == null ? void 0 : t.goToPage), d = Va(o), u = o > Lr + 1e-3, f = o < Cr - 1e-3, m = ot(), v = "50%（半屏，对照铺满）", [h, g] = L(!1), [y, w] = L(`${l}`);
  $(() => {
    h || w(`${Math.min(Math.max(l, 1), Math.max(i, 1))}`);
  }, [l, i, h]);
  const S = () => {
    if (g(!1), !c || i <= 0)
      return;
    const b = Number(`${y}`.trim());
    c(Mt(b, i));
  };
  return /* @__PURE__ */ z("div", { className: "reader-react-hud", "data-reader-hud": "true", children: [
    a ? /* @__PURE__ */ p("div", { className: "reader-react-hud-group reader-react-hud-modes", children: a }) : null,
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
            i || "—"
          ] })
        ]
      }
    ) : /* @__PURE__ */ p(
      "button",
      {
        type: "button",
        className: "reader-react-hud-page reader-react-hud-page-btn",
        "aria-label": i > 0 ? `跳转页码，当前第 ${l} 页，共 ${i} 页` : "页码",
        title: i > 0 ? "点击输入页码跳转" : void 0,
        disabled: !c || i <= 0,
        onClick: () => {
          !c || i <= 0 || (w(`${l}`), g(!0));
        },
        children: i > 0 ? `${Math.min(l, i)} / ${i}` : "—"
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
          onClick: () => s(dt(o, -1)),
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
          onClick: () => s(dt(o, 1)),
          children: "+"
        }
      )
    ] }),
    /* @__PURE__ */ p("div", { className: "reader-react-hud-group reader-react-hud-help", "aria-label": "帮助", children: /* @__PURE__ */ p(Lc, {}) })
  ] });
}
function xn(e) {
  const t = `${e.jobId || ""}`.trim(), n = `${e.documentId || ""}`.trim();
  return n ? `retainpdf.reader.notes.v1:doc:${n}` : t ? `retainpdf.reader.notes.v1:job:${t}` : "retainpdf.reader.notes.v1:anonymous";
}
function Qc() {
  return typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function el(e) {
  return {
    pageIdx: Number(e.page) - 1,
    quoteText: e.quote,
    note: e.note,
    createdAt: e.createdAt
  };
}
function tl(e) {
  return xo(e, (t) => t.page);
}
function nl(e) {
  return Co(e, (t) => t.page).map((t) => ({ page: t.pageIdx, items: t.items }));
}
function rl(e, t) {
  return Lo({
    title: e,
    annotations: t.map(el)
  });
}
function vr(e) {
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
function wr(e) {
  if (typeof localStorage > "u")
    return [];
  try {
    const t = xn(e), n = vr(localStorage.getItem(t)), r = `${e.jobId || ""}`.trim(), a = `retainpdf.reader.notes.v1:job:${r}`;
    if (!r || t === a) return n;
    const o = vr(localStorage.getItem(a));
    if (!o.length) return n;
    const s = new Set(n.map((c) => c.id)), l = [...n, ...o.filter((c) => !s.has(c.id))], i = JSON.stringify(l);
    try {
      localStorage.setItem(t, i), localStorage.getItem(t) === i && localStorage.removeItem(a);
    } catch {
    }
    return l;
  } catch {
    return [];
  }
}
function ol(e, t) {
  if (!(typeof localStorage > "u"))
    try {
      localStorage.setItem(xn(e), JSON.stringify(t));
    } catch (n) {
      console.warn("[reader-notes] persist failed", n);
    }
}
function al(e, t = {}) {
  const n = q(
    () => ({
      jobId: `${e.jobId || ""}`.trim(),
      documentId: `${e.documentId || ""}`.trim()
    }),
    [e.jobId, e.documentId]
  ), r = xn(n), [a, o] = L(() => ({
    key: r,
    notes: wr(n)
  })), s = a.key === r ? a.notes : [], l = k((v) => {
    o((h) => ({
      key: h.key,
      notes: typeof v == "function" ? v(h.notes) : v
    }));
  }, []), i = t.onAfterAdd;
  $(() => {
    o({ key: r, notes: wr(n) });
  }, [n, r]), $(() => {
    a.key === r && ol(n, a.notes);
  }, [n, r, a]);
  const c = k((v) => {
    const h = `${v.quote || ""}`.trim();
    if (!h)
      return null;
    const g = {
      id: Qc(),
      page: Math.max(1, Math.floor(Number(v.page) || 1)),
      pane: v.pane === "translated" ? "translated" : "source",
      quote: h,
      note: `${v.note || ""}`.trim(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return l((y) => tl([g, ...y])), i == null || i(), g;
  }, [i]), d = k((v, h) => {
    const g = `${h || ""}`.trim();
    l((y) => y.map((w) => w.id === v ? { ...w, note: g } : w));
  }, []), u = k((v) => {
    l((h) => h.filter((g) => g.id !== v));
  }, []), f = k(async (v = "") => {
    var g, y;
    const h = rl(v, s);
    try {
      return await ((y = (g = navigator.clipboard) == null ? void 0 : g.writeText) == null ? void 0 : y.call(g, h)), !0;
    } catch (w) {
      return console.error("[reader-notes] copy failed", w), !1;
    }
  }, [s]), m = q(() => nl(s), [s]);
  return {
    notes: s,
    groups: m,
    addFromQuote: c,
    updateNote: d,
    remove: u,
    exportMarkdown: f,
    count: s.length
  };
}
const nn = "download-toast";
function sl({
  title: e = "下载中",
  status: t = "正在准备...",
  meta: n = "等待响应...",
  percent: r = NaN,
  tone: a = "progress"
}) {
  const o = Number.isFinite(r) ? Math.max(4, Math.min(100, Number(r) || 0)) : 18;
  return /* @__PURE__ */ z("div", { className: "download-toast-card reader-floating-surface", "data-tone": a, "aria-live": "polite", children: [
    /* @__PURE__ */ z("div", { className: "download-toast-head", children: [
      /* @__PURE__ */ p("div", { id: "download-toast-title", className: "download-toast-title", children: e }),
      /* @__PURE__ */ p("div", { id: "download-toast-status", className: "download-toast-status", children: t })
    ] }),
    /* @__PURE__ */ p("div", { className: "download-toast-track", children: /* @__PURE__ */ p("span", { id: "download-toast-bar", className: "download-toast-bar", style: { width: `${o}%` } }) }),
    /* @__PURE__ */ p("div", { id: "download-toast-meta", className: "download-toast-meta", children: n })
  ] });
}
function il(e = {}) {
  const {
    visible: t = !1,
    title: n = "下载中",
    status: r = "正在准备...",
    meta: a = "等待响应...",
    percent: o = NaN,
    tone: s = "progress"
  } = e;
  if (!t) {
    Wt.dismiss(nn);
    return;
  }
  Wt.custom(
    () => /* @__PURE__ */ p(sl, { title: n, status: r, meta: a, percent: o, tone: s }),
    { id: nn, duration: 1 / 0 }
  );
}
function cl() {
  const e = k((t) => {
    t && (t.setState = il, t.hide = () => Wt.dismiss(nn));
  }, []);
  return /* @__PURE__ */ z(kt, { children: [
    /* @__PURE__ */ p(zo, { position: "bottom-right" }),
    /* @__PURE__ */ p("download-toast", { style: { display: "none" }, "aria-hidden": "true", ref: e })
  ] });
}
const ll = ln(() => import("./ReaderFavoritesPanel-BDfgJccY.js").then((e) => ({ default: e.ReaderFavoritesPanel }))), dl = ln(() => import("./ReaderMarkdownPanel-DVOZEPhp.js").then((e) => ({ default: e.ReaderMarkdownPanel }))), ul = ln(() => import("./ReaderAiPanel-BuPm6GEv.js").then((e) => ({ default: e.ReaderAiPanel })));
function Ht(e) {
  const t = x(!1);
  return e && (t.current = !0), t.current;
}
function fl(e) {
  return "workspace";
}
function ml(e) {
  const t = e.sourceOnly || !e.translatedUrl, n = !!(e.overlayContentAvailable && e.liveTranslationVisible && !e.assistantOpen), a = e.assistantPdfPane || (e.assistantOpen && e.mode === "compare" ? "source" : e.mode);
  return {
    kind: n ? "live-overlay" : a === "compare" ? "final-compare" : a === "translated" ? "translated-only" : "source-only",
    visibleMode: a,
    compareMode: a === "compare",
    showSource: n || a !== "translated",
    showTranslated: a === "translated" || a === "compare",
    overlayOnSource: n,
    sourceOnly: e.sourceOnly,
    sourceViewOnly: t
  };
}
function pl(e, t) {
  return e === "compare" ? t ? !0 : null : !1;
}
function Sr(e, t) {
  var n, r, a, o;
  return e === "compare" ? null : (t == null ? void 0 : t.assistantPanel) === "markdown" || (t == null ? void 0 : t.assistantPanel) === "ai" ? t.assistantPanel : ((n = t == null ? void 0 : t.splitLayout) == null ? void 0 : n.left) === "ai" || ((r = t == null ? void 0 : t.splitLayout) == null ? void 0 : r.right) === "ai" ? "ai" : ((a = t == null ? void 0 : t.splitLayout) == null ? void 0 : a.left) === "markdown" || ((o = t == null ? void 0 : t.splitLayout) == null ? void 0 : o.right) === "markdown" ? "markdown" : null;
}
function hl() {
  const e = Us(), { boot: t, panes: n, sessionFiles: r, tools: a, session: o } = e, [s, l] = L(() => Sr(e.mode, Ee(e.viewStateKey))), [i, c] = L(null), [d, u] = L(null), [f, m] = L(!1), v = x(e.viewStateKey), h = x(null), g = s !== null, y = e.liveTranslationAvailable || e.liveTranslation.pagesByPage.size > 0, w = ml({
    mode: e.mode,
    sourceOnly: e.sourceOnly,
    translatedUrl: r.translatedUrl,
    overlayContentAvailable: y,
    liveTranslationVisible: f,
    assistantOpen: g,
    assistantPdfPane: i
  }), S = w.sourceViewOnly, b = w.visibleMode, [P, N] = L(!1), M = k(() => N(!0), []), _ = k(() => N((j) => !j), []), T = al(
    { jobId: o.jobId, documentId: o.documentId },
    { onAfterAdd: M }
  ), E = k((j) => {
    T.addFromQuote(j), e.clearSelection();
  }, [T.addFromQuote, e.clearSelection]), R = k((j) => {
    e.goToPage(j.page, j.pane === "translated" ? "translated" : "source");
  }, [e.goToPage]), I = k(
    () => T.exportMarkdown(o.title || ""),
    [T.exportMarkdown, o.title]
  );
  $(() => {
    u(null), m(!0), N(!1);
  }, [e.viewStateKey]), $(() => {
    e.session.jobTerminal && m(!1);
  }, [e.session.jobTerminal]), $(() => {
    if (!t.loading) {
      if (v.current !== e.viewStateKey) {
        v.current = e.viewStateKey;
        const j = Ee(e.viewStateKey);
        l(Sr(e.mode, j)), c(null);
        return;
      }
      Et(e.viewStateKey, { assistantPanel: s, splitLayout: null });
    }
  }, [s, t.loading, e.mode, e.viewStateKey]), $(() => {
    if (!(t.loading || t.failed)) {
      if (h.current !== e.viewStateKey) {
        h.current = e.viewStateKey;
        const j = Ee(e.viewStateKey), ie = S ? "source" : j == null ? void 0 : j.mode;
        ie && ie !== e.mode && e.setModeKeepingPage(ie);
        return;
      }
      Et(e.viewStateKey, { mode: e.mode });
    }
  }, [t.failed, t.loading, e.mode, e.setModeKeepingPage, e.viewStateKey, S]);
  const A = s || (e.mode === "compare" ? "compare" : "reading"), D = Ht(a.isOpen("favorites")), C = Ht(s === "markdown"), F = Ht(s === "ai");
  Ks({
    mode: b,
    sourceOnly: e.sourceOnly,
    setMode: e.setModeKeepingPage,
    userZoom: e.userZoom,
    onZoomChange: e.onZoomChange,
    currentPage: e.currentPage,
    numPages: n.hudNumPages,
    goToPage: e.goToPage,
    enabled: e.showHud
  });
  const B = k(() => {
    a.close();
  }, [a]), X = k(() => {
    l(null), c(null), u(null);
  }, []), J = k((j) => {
    const ie = b === "translated" ? "translated" : "source";
    e.jumpToAnchor(j, ie);
  }, [e.jumpToAnchor, b]), K = k((j) => {
    o.refreshCommittedDocument(j);
  }, [o.refreshCommittedDocument]), oe = k((j) => {
    a.close(), c(null);
    const ie = pl(j, e.liveTranslationAvailable);
    ie !== null && m(ie), e.setModeKeepingPage(j);
  }, [e.liveTranslationAvailable, e.setModeKeepingPage, a]), se = q(() => !y || !w.showSource ? null : /* @__PURE__ */ p(
    "button",
    {
      type: "button",
      className: `reader-live-translation-toggle${f ? " is-active" : ""}`,
      onClick: () => m((j) => !j),
      "aria-pressed": f,
      title: f ? "隐藏实时译文" : "在原文 PDF 上叠加实时译文",
      children: "译文"
    }
  ), [y, w.showSource, f]), U = k((j) => {
    l(j), j !== "ai" && u(null);
  }, []), G = k((j) => {
    if (j === "notes") {
      _();
      return;
    }
    if (j === "markdown" || j === "ai") {
      s === j ? (l(null), c(null), u(null)) : (l(j), c(null), j !== "ai" && u(null));
      return;
    }
    a.toggle(j);
  }, [s, _, a]), Q = P ? "notes" : s ?? a.active, ee = k((j) => {
    const ie = j.pane === "translated" && !S ? "translated" : "source";
    u(j), l("ai"), c(ie), e.clearSelection();
  }, [e.clearSelection, S]), de = q(() => ({
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
    onSelectRegion: e.selectRegion,
    sourceOnly: e.sourceOnly,
    sourceViewOnly: S,
    download: e.download,
    goToPage: e.goToPage,
    assistant: { select: U, close: X }
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
    e.selectRegion,
    e.sourceOnly,
    S,
    e.download,
    e.goToPage,
    U,
    X
  ]), he = q(() => ({
    currentPage: e.currentPage,
    numPages: n.hudNumPages
  }), [e.currentPage, n.hudNumPages]), pe = [
    ja,
    `is-workspace-${A}`,
    g ? "is-assistant-open" : "",
    w.overlayOnSource ? "is-live-translation-overlay" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ p(Ri, { value: de, hud: he, children: /* @__PURE__ */ z("div", { className: pe, "data-reader-engine": "react-pdf", "data-reader-workspace": A, children: [
    /* @__PURE__ */ p(Ac, { loading: t.loading, failed: t.failed, text: t.text, percent: t.percent, regionsError: !!o.readerErrors.regions, metadataError: !!o.readerErrors.metadata }),
    /* @__PURE__ */ p(Xs, { onBeforeClose: o.prepareClose }),
    /* @__PURE__ */ p(
      Ci,
      {
        mode: b,
        documentReady: !!o.jobId,
        sourceViewOnly: S,
        onModeChange: oe,
        liveTranslation: y ? {
          visible: f,
          state: e.liveTranslation,
          onToggle: () => m((j) => !j)
        } : null
      }
    ),
    /* @__PURE__ */ p(zi, { active: s }),
    g ? /* @__PURE__ */ p(wc, {}) : null,
    e.showHud ? /* @__PURE__ */ p(Zc, { activeTool: Q, noteCount: T.count, onToggleTool: G }) : null,
    /* @__PURE__ */ p(ki, { paneComposition: w, markdownSplit: s === "markdown", assistantSplit: g, liveTranslation: e.liveTranslation, sourcePaneAction: se }),
    e.showHud ? /* @__PURE__ */ p(
      Xc,
      {
        mode: b,
        modeControls: null
      }
    ) : null,
    /* @__PURE__ */ z(ho, { fallback: null, children: [
      D ? /* @__PURE__ */ p(ll, { open: a.isOpen("favorites"), jobId: o.jobId, documentId: o.documentId, onClose: B, onJumpPage: e.goToPage }) : null,
      C ? /* @__PURE__ */ p(dl, { open: s === "markdown", jobId: o.jobId, sourceOnly: e.sourceOnly, layout: "workspace", side: "right", onClose: X }) : null,
      F ? /* @__PURE__ */ p(ul, { open: s === "ai", jobId: o.jobId, documentId: o.documentId, sessionIdentity: o.sessionIdentity, layout: fl(e.mode), side: "right", selectionContext: d, onClearSelectionContext: () => u(null), onClose: X, onJumpCitation: J, onDocumentCommitted: K }, o.documentId || o.jobId || "reader-ai-pending") : null
    ] }),
    /* @__PURE__ */ p(
      Ec,
      {
        open: P,
        groups: T.groups,
        count: T.count,
        onClose: () => N(!1),
        onJump: R,
        onUpdateNote: T.updateNote,
        onRemove: T.remove,
        onExport: I
      }
    ),
    /* @__PURE__ */ p(Nc, { selection: e.selection, onDismiss: e.clearSelection, onAskAi: ee, onAddNote: E }),
    /* @__PURE__ */ p(cl, {})
  ] }) });
}
function jl() {
  return /* @__PURE__ */ p(hl, {});
}
export {
  fn as A,
  jl as R,
  hl as a,
  Rc as b,
  $l as c,
  Ll as d,
  xl as e,
  Fl as f,
  zl as g,
  Cl as h,
  Dl as i,
  Ol as j,
  _l as r
};
//# sourceMappingURL=ReaderApp-BjOPjAlI.js.map
