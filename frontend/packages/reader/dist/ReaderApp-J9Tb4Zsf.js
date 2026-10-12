var Cn = (e) => {
  throw TypeError(e);
};
var zn = (e, t, n) => t.has(e) || Cn("Cannot " + n);
var Qe = (e, t, n) => (zn(e, t, "read from private field"), n ? n.call(e) : t.get(e)), Dn = (e, t, n) => t.has(e) ? Cn("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, n), _n = (e, t, n, r) => (zn(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n);
import { jsxs as z, jsx as p, Fragment as At } from "react/jsx-runtime";
import { useMemo as q, useState as L, useEffect as $, useCallback as A, useRef as x, useLayoutEffect as Fe, memo as on, forwardRef as po, useImperativeHandle as an, createContext as sn, useContext as cn, useSyncExternalStore as ho, useId as ln, Suspense as go, lazy as dn } from "react";
import { requireAdapter as ye, getReaderAdapters as le } from "./adapters.js";
import { resolveReaderDownloadName as bo, createReaderServerFavoritesPort as yo, resolveReaderDownloadUrls as vo, READER_PROGRESS_COPY as Re, trimString as it, READER_DOWNLOAD_ACTIONS as wo, disabledReason as So } from "./runtime/state.js";
import { d as Po } from "./ask-answerer-GNQdzitl.js";
import "@retainpdf/api/conversations";
import { r as Io, b as Ro } from "./page-config-Ct7qR5rm.js";
import { c as To, n as Eo, f as Dt, h as On, a as Mo, b as ko, i as Ir, p as Nt, g as Rr, r as Tr, j as Fn, e as Ao } from "./reader-regions-DsePY7B_.js";
import { i as No, c as xo } from "./live-translation-CbniFg2b.js";
import { sortByPageAndCreatedAt as Lo, buildAnnotationsMarkdown as Co, groupByPageAndCreatedAt as zo } from "./runtime/content.js";
import { toast as Jt, Toaster as Do } from "sonner";
import { X as Xe, Radio as _o, FileText as Er, Columns2 as Mr, Languages as kr, FileCode2 as Ar, Sparkles as un, GripHorizontal as Oo, StickyNote as xt, Sigma as Fo, Table2 as $o, Type as jo, Image as Uo, Check as Bo, Copy as Ho, Keyboard as Wo, Download as Jo, Bookmark as Ko } from "lucide-react";
import { pdfjs as qo, Page as Vo, Document as Go } from "react-pdf";
import { e as Yo, m as Zo, a as Xo } from "./markdown-math-XkF5urpn.js";
const Qo = (...e) => {
  var t, n;
  return ((n = (t = le()) == null ? void 0 : t.isMockMode) == null ? void 0 : n.call(t, ...e)) ?? !1;
}, ea = "", ta = Object.freeze({
  progress: "retainpdf-reader-progress"
}), na = (e) => {
  var t, n;
  return ((n = (t = le()) == null ? void 0 : t.resolveResourceUrl) == null ? void 0 : n.call(t, e)) ?? e;
}, Nl = (...e) => {
  var n;
  return (((n = le()) == null ? void 0 : n.fetchProtected) ?? fetch)(...e);
}, Ae = () => ye("defaultReaderDataPort"), $n = () => ye("defaultReaderPageConfigPort"), xl = {
  get apiPrefix() {
    return Ae().apiPrefix;
  },
  fetchProtected: (...e) => Ae().fetchProtected(...e),
  loadMarkdownPayload: (e) => Ae().loadMarkdownPayload(e),
  loadMarkdownSource: (e) => Ae().loadMarkdownSource(e),
  loadMarkdownRange: (e, t, n, r, a) => Ae().loadMarkdownRange(e, t, n, r, a),
  loadJobPayload: (e) => Ae().loadJobPayload(e),
  loadReaderPayload: (e, t) => Ae().loadReaderPayload(e, t),
  get liveTranslation() {
    return Ae().liveTranslation;
  }
}, Nr = {
  messageTargetOrigin: () => $n().messageTargetOrigin(),
  readerJobId: () => $n().readerJobId()
}, ra = () => {
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
}, fn = () => {
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
}, Ll = () => {
  var e;
  return ((e = le()) == null ? void 0 : e.aiOperations) ?? null;
}, Cl = () => {
  var e;
  return ((e = le()) == null ? void 0 : e.conversations) ?? null;
}, zl = () => {
  var e;
  return ((e = le()) == null ? void 0 : e.askChat) ?? null;
}, oa = (...e) => {
  var t, n;
  return ((n = (t = le()) == null ? void 0 : t.resolveReaderAnchor) == null ? void 0 : n.call(t, ...e)) ?? null;
}, aa = () => {
  var e, t;
  return ((t = (e = le()) == null ? void 0 : e.resolveReaderDocumentId) == null ? void 0 : t.call(e)) ?? "";
}, sa = (...e) => {
  var t, n;
  return ((n = (t = le()) == null ? void 0 : t.resolveReaderJobId) == null ? void 0 : n.call(t, ...e)) ?? "";
}, ia = (...e) => {
  var t, n;
  return ((n = (t = le()) == null ? void 0 : t.resolveReaderDownloadName) == null ? void 0 : n.call(t, ...e)) ?? bo(...e);
}, ca = (...e) => {
  var t, n;
  return ((n = (t = le()) == null ? void 0 : t.resolveReaderDownloadUrls) == null ? void 0 : n.call(t, ...e)) ?? vo(...e);
}, la = (...e) => ye("downloadProtectedResource")(...e), da = (...e) => ye("failDownloadToast")(...e), Dl = (e, t) => ye("resolveMarkdownAssetUrl")(e, t), _l = (e = {}) => {
  const t = le();
  return Po({
    apiPrefix: (t == null ? void 0 : t.apiPrefix) || "/api/v1",
    ask: t == null ? void 0 : t.askDocumentAi,
    documentByJobId: t == null ? void 0 : t.fetchDocumentByJobId,
    ...e
  });
}, mn = "/api/v1", Ol = (e = mn, t = {}) => {
  var n;
  return ye("fetchFavorites")(
    ((n = le()) == null ? void 0 : n.apiPrefix) ?? e,
    t
  );
};
function Fl(e = {}) {
  const t = le();
  return yo({
    apiPrefix: (t == null ? void 0 : t.apiPrefix) ?? mn,
    documentByJobId: (...n) => ye("fetchDocumentByJobId")(...n),
    submitFavorite: (...n) => ye("createFavorite")(...n),
    loadFavorites: (...n) => ye("fetchFavorites")(...n),
    removeFavorite: (...n) => ye("deleteFavorite")(...n),
    ...e
  });
}
function ua() {
  const e = () => {
    var r;
    return Io(
      ((r = globalThis.location) == null ? void 0 : r.search) || ""
    );
  }, [t, n] = L(e);
  return $(() => {
    var l, c, i, d;
    const r = () => n(e()), a = (c = (l = globalThis.history) == null ? void 0 : l.pushState) == null ? void 0 : c.bind(globalThis.history), o = (d = (i = globalThis.history) == null ? void 0 : i.replaceState) == null ? void 0 : d.bind(globalThis.history);
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
function fa() {
  const e = ua(), t = q(() => sa(Nr), [e]), n = q(() => aa(), [e]), r = t || n ? `job:${t}|document:${n}` : `location:${e}`;
  return { locationKey: e, jobId: t, routeDocumentId: n, sessionIdentity: r };
}
function ma(e) {
  const {
    routeDocumentId: t,
    jobId: n,
    sessionIdentity: r,
    sessionIdentityRef: a,
    documentIdRef: o,
    sessionJobIdRef: s,
    switchToSourceMode: l
  } = e, [c, i] = L({
    documentId: "",
    jobId: ""
  }), [d, u] = L({
    documentId: "",
    jobId: ""
  }), f = c.documentId === t ? c.jobId : "", m = d.documentId === t ? d.jobId : "", v = n || f, [h, g] = L({
    jobId: "",
    documentId: ""
  }), y = h.jobId === v ? h.documentId : "", w = t || y, S = !!t && !v, [b, P] = L(null), N = (b == null ? void 0 : b.sessionIdentity) === r && b.documentId === w ? b : null, M = S || !!N, _ = A((E) => {
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
  const T = A((E) => {
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
    activeCommittedDocumentSource: N,
    sourceViewOnly: M,
    refreshCommittedDocument: _,
    applyIdentityEvent: T
  };
}
const pa = /* @__PURE__ */ new Set(["succeeded", "failed", "cancelled", "canceled"]);
function jn(e) {
  return `${(e == null ? void 0 : e.status) || ""}`.trim().toLowerCase();
}
function ha(e) {
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
    const c = `${l || ""}`.trim();
    if (c) return c;
  }
  return "";
}
function Un(e, t) {
  const n = `/api/v1/documents/${encodeURIComponent(e)}/source.pdf`, r = `${t || ""}`.trim();
  return na(r ? `${n}?version=${encodeURIComponent(r)}` : n);
}
function ga(e, t = "") {
  const n = `${e || ""}`.trim(), r = `${t || ""}`.trim();
  return !!(!n || r && (n === r || n === `${r}.pdf`) || /^\d{8,14}-[0-9a-f]{4,}$/i.test(n));
}
function ba(e, t) {
  var r;
  const n = [
    e == null ? void 0 : e.title,
    e == null ? void 0 : e.display_name,
    e == null ? void 0 : e.source_file_name,
    (r = e == null ? void 0 : e.book_summary) == null ? void 0 : r.source_file_name
  ];
  for (const a of n) {
    const o = `${a || ""}`.trim();
    if (o && !ga(o, t))
      return o.replace(/\.pdf$/i, "");
  }
  return "";
}
function Kt({
  percent: e,
  text: t,
  stage: n
}) {
  var r;
  try {
    (r = window.parent) == null || r.postMessage(
      {
        type: ta.progress,
        stage: n,
        percent: e,
        text: t
      },
      Nr.messageTargetOrigin()
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
  }), Kt({ percent: t, text: n, stage: r });
}
function ya(e) {
  const {
    sessionJobId: t,
    sessionIdentity: n,
    sessionIdentityRef: r,
    sessionJobIdRef: a,
    sessionEpochRef: o,
    closingRef: s
  } = e, [l, c] = L(null), [i, d] = L(null), [u, f] = L(""), [m, v] = L(0), h = u === n ? l : null, g = u === n ? i : null, y = jn(h), w = pa.has(y), S = A(() => {
    v((T) => T + 1);
  }, []), b = A((T) => {
    c(T.jobPayload), d(T.manifestPayload), f(T.sessionIdentity);
  }, []), P = A((T) => {
    c(null), d(null), f(T);
  }, []), N = x(""), M = x(""), _ = A(async () => {
    const T = a.current;
    if (!T || N.current === T) return;
    const E = fn().loadJobPayload;
    if (typeof E != "function") return;
    const R = o.current.value;
    N.current = T;
    try {
      const I = await E(T);
      if (s.current || o.current.value !== R || a.current !== T || !I || typeof I != "object")
        return;
      const k = jn(I);
      c(I), f(r.current), k === "succeeded" && M.current !== T && (M.current = T, v((D) => D + 1));
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
    refreshJobStatus: _,
    publishPayload: b,
    clearPayload: P
  };
}
function qt(e) {
  document.body.classList.remove(
    "reader-mode-source",
    "reader-mode-translated",
    "reader-mode-compare"
  ), document.body.classList.add(`reader-mode-${e}`);
}
function va(e, t) {
  e(t), qt(t);
}
function wa(e) {
  const [t, n] = L(e ? "source" : "compare"), r = A((o) => {
    e && o !== "source" || (n(o), qt(o));
  }, [e]), a = A((o) => {
    va(n, o);
  }, []);
  return $(() => (e && document.documentElement.classList.add("reader-source-only"), qt(t), () => {
    document.documentElement.classList.remove("reader-source-only");
  }), [e, t]), { mode: t, setMode: r, setModeState: n, switchSessionMode: a };
}
function Bn(e) {
  return typeof e == "string" ? e.trim() : `${e ?? ""}`.trim();
}
function Sa(e) {
  const t = (e == null ? void 0 : e.data) ?? e, n = t && typeof t == "object" ? t : {};
  return {
    activeJobId: Bn(n.active_job_id),
    activeVersionId: Bn(n.active_version_id)
  };
}
function Pa(e) {
  const { link: t, rejectedDocumentJobId: n, hasCommittedSource: r } = e, a = t.activeJobId && t.activeJobId !== n && !t.activeJobId.startsWith("doc:") ? t.activeJobId : "";
  return a ? { kind: "follow-active-job", jobId: a, activeVersionId: t.activeVersionId } : t.activeVersionId && !r ? { kind: "open-committed-source", documentId: "", revision: t.activeVersionId } : { kind: "open-source-url" };
}
function Ia(e) {
  const {
    payloadDocumentId: t,
    linkedActiveJobId: n,
    linkedActiveVersionId: r,
    sessionJobId: a,
    hasCommittedSource: o
  } = e;
  return t && r && n === a && !o ? { kind: "restore-committed-source", documentId: t, revision: r } : { kind: "open-job-artifacts" };
}
function Ra(e) {
  return e.status === 404 && !e.jobId && !!e.routeDocumentId && !!e.documentJobId && e.sessionJobId === e.documentJobId;
}
function Ta(e) {
  return e ? { data: e.data.slice() } : null;
}
const Ea = 2, ve = /* @__PURE__ */ new Map();
function Vt(e, t) {
  ve.delete(e), ve.set(e, t);
}
function Ma(e) {
  if (ve.size < Ea) return;
  const t = ve.keys().next().value;
  t && ve.delete(t);
}
function _t(e) {
  const t = `${e || ""}`.trim();
  if (!t || !ve.has(t)) return null;
  const n = ve.get(t);
  return Vt(t, n), n;
}
async function xr(e, t = ct().fetchProtected, n = {}) {
  const r = `${e || ""}`.trim();
  if (!r)
    return null;
  if (ve.has(r)) {
    const l = ve.get(r);
    return Vt(r, l), l;
  }
  const a = await t(r, { signal: n.signal });
  if (!a.ok) {
    const l = new Error(`读取 PDF 失败 (${a.status})`);
    throw l.status = a.status, l;
  }
  const o = await a.arrayBuffer(), s = { data: new Uint8Array(o) };
  return ve.has(r) ? Vt(r, s) : (Ma(), ve.set(r, s)), s;
}
function ka(e = "", t = null) {
  const [n, r] = L(
    () => t || _t(e)
  ), [a, o] = L(
    () => !!`${e || ""}`.trim() && !t && !_t(e)
  ), [s, l] = L("");
  return $(() => {
    if (t) {
      r(t), o(!1), l("");
      return;
    }
    const c = `${e || ""}`.trim();
    if (!c) {
      r(null), o(!1), l("");
      return;
    }
    const i = _t(c);
    if (i) {
      r(i), o(!1), l("");
      return;
    }
    let d = !1;
    return o(!0), l(""), r(null), xr(c).then((u) => {
      d || (r(u), o(!1));
    }).catch((u) => {
      d || (r(null), o(!1), l((u == null ? void 0 : u.message) || String(u)));
    }), () => {
      d = !0;
    };
  }, [e, t]), { file: n, loading: a, error: s };
}
function Aa(e) {
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
async function Gt(e) {
  const { url: t, label: n, percentStart: r, percentEnd: a, fence: o, setBoot: s } = e;
  if (!t || o.isInactive())
    return null;
  Rt(s, r, n, "download");
  const l = await xr(t, ct().fetchProtected, {
    signal: o.signal
  });
  return o.isInactive() ? null : (Rt(s, a, n, "download"), l);
}
async function Na(e) {
  const { sourceFinal: t, translatedFinal: n, fence: r, setBoot: a } = e;
  Rt(a, 25, "正在下载 PDF…", "download");
  const o = [];
  let s = null, l = null;
  return t && o.push(
    Gt({
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
    Gt({
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
function xa(e) {
  const {
    sessionJobId: t,
    jobId: n,
    routeDocumentId: r,
    documentJobId: a,
    rejectedDocumentJobId: o,
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
  } = e, [w, S] = L(""), [b, P] = L(""), [N, M] = L(null), [_, T] = L(null), [E, R] = L(!1), [I, k] = L(""), [D, C] = L([]), [F, B] = L(() => ({
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
    const se = new AbortController(), U = h.current.value, G = Aa({
      sessionEpochRef: h,
      closingRef: g,
      abort: se,
      sessionEpoch: U
    });
    y.current = se;
    const Q = fn();
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
      }), Kt({ percent: 100, text: V, stage: "failed" });
    }
    function de() {
      R(!0), oe({
        loading: !1,
        percent: 100,
        text: Re.ready,
        stage: "ready",
        failed: !1
      }), Kt({ percent: 100, text: Re.ready, stage: "ready" });
    }
    function he() {
      return i != null && i.documentId ? Un(
        i.documentId,
        i.revision
      ) : Qo() ? ea : Q.resolveResourceUrl(`/api/v1/documents/${encodeURIComponent(r)}/source.pdf`);
    }
    async function pe() {
      let te = { activeJobId: "", activeVersionId: "" };
      try {
        const ge = await Q.fetchProtected(
          Q.resolveResourceUrl(`/api/v1/documents/${encodeURIComponent(r)}`)
        );
        if (ge != null && ge.ok) {
          const Ce = await ge.json().catch(() => null);
          te = Sa(Ce);
        }
      } catch {
      }
      const V = Pa({
        link: te,
        rejectedDocumentJobId: o,
        hasCommittedSource: !!i
      });
      if (V.kind === "follow-active-job") {
        if (G.isInactive()) return;
        d({
          type: "resolved-document-job",
          documentId: r,
          jobId: V.jobId
        }), V.activeVersionId ? (i || d({
          type: "committed-source",
          documentId: r,
          revision: V.activeVersionId,
          sessionIdentity: c
        }), m("source")) : m("compare");
        return;
      }
      if (V.kind === "open-committed-source") {
        if (G.isInactive()) return;
        d({
          type: "committed-source",
          documentId: r,
          revision: V.revision,
          sessionIdentity: c
        }), m("source");
        return;
      }
      const ae = he();
      if (G.isInactive()) return;
      S(ae), P(""), k(""), f(c);
      const Pe = await Gt({
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
        committedSource: i,
        includeOptionalArtifacts: !i
      })), V = te ? {
        jobPayload: te.sourcePayload,
        manifestPayload: te.manifestPayload,
        readerMetadata: te.readerMetadata,
        regionsPayload: te.regions,
        readerErrors: te.readerErrors
      } : await Q.loadReaderPayload(t, {
        // committedSource 分支会丢弃 regions/metadata（旧页序已失效），
        // 直接跳过这两个可选请求，避免无效网络往返。
        includeOptionalArtifacts: !i
      });
      if (G.isInactive()) return;
      let ae = null;
      if (n && !r) {
        try {
          ae = await Q.fetchDocumentByJobId(mn, t);
        } catch {
        }
        if (G.isInactive()) return;
      }
      const Pe = ha(V.jobPayload) || `${(ae == null ? void 0 : ae.document_id) || ""}`.trim();
      Pe && !r && d({
        type: "resolved-job-document",
        jobId: t,
        documentId: Pe
      });
      const ge = Ia({
        payloadDocumentId: Pe,
        linkedActiveJobId: `${(ae == null ? void 0 : ae.active_job_id) || ""}`.trim(),
        linkedActiveVersionId: `${(ae == null ? void 0 : ae.active_version_id) || ""}`.trim(),
        sessionJobId: t,
        hasCommittedSource: !!i
      });
      if (ge.kind === "restore-committed-source") {
        if (G.isInactive()) return;
        d({
          type: "committed-source",
          documentId: ge.documentId,
          revision: ge.revision,
          sessionIdentity: c
        }), m("source");
        return;
      }
      const Ce = Q.resolveReaderSourcePdf(V.manifestPayload), gt = Q.resolveReaderTranslatedPdfUrl(V.jobPayload, V.manifestPayload), zt = typeof Ce == "string" ? Ce : Q.resolveReaderArtifactUrl(Ce), bt = r || Pe, Ie = i != null && i.documentId ? Un(
        i.documentId,
        i.revision
      ) : zt || (bt ? Q.resolveResourceUrl(`/api/v1/documents/${encodeURIComponent(bt)}/source.pdf`) : ""), ke = i ? "" : gt || "";
      if (S(Ie || ""), P(ke), k(ba(V.jobPayload, t)), u({
        jobPayload: V.jobPayload || null,
        manifestPayload: V.manifestPayload || null,
        sessionIdentity: c
      }), C(i ? [] : To(V.regionsPayload)), B(i ? { source: null, translated: null } : Eo(V.readerMetadata)), J(i ? vt : V.readerErrors ?? vt), !Ie && !ke) {
        ee(Re.failed, Re.failed);
        return;
      }
      const Ue = await Na({
        sourceFinal: Ie || "",
        translatedFinal: ke,
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
        if (Ra({
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
  }, [t, r, a, o, s, l, i, v, n, c, d, u, f, m]), {
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
function La() {
  const e = x(!1), t = x(null), { locationKey: n, jobId: r, routeDocumentId: a, sessionIdentity: o } = fa(), s = x({ identity: "", value: 0 });
  s.current.identity !== o && (s.current = {
    identity: o,
    value: s.current.value + 1
  }, e.current = !1);
  const l = x(o), c = x(""), i = x(""), d = x(() => {
  }), u = A(() => d.current(), []), f = ma({
    routeDocumentId: a,
    jobId: r,
    sessionIdentity: o,
    sessionIdentityRef: l,
    documentIdRef: c,
    sessionJobIdRef: i,
    switchToSourceMode: u
  }), {
    sessionJobId: m,
    documentId: v,
    sourceOnly: h,
    sourceViewOnly: g
  } = f, { mode: y, setMode: w, switchSessionMode: S } = wa(g);
  d.current = () => {
    S("source");
  }, l.current = o, c.current = v, i.current = m;
  const b = ya({
    sessionJobId: m,
    sessionIdentity: o,
    sessionIdentityRef: l,
    sessionJobIdRef: i,
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
  } = b, I = xa({
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
  }), k = A(() => {
    var C;
    e.current = !0, (C = t.current) == null || C.abort();
  }, []), D = q(
    () => ({
      fetchProtected: fn().fetchProtected,
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
    prepareClose: k
  };
}
const Ca = 160, za = 8, Da = 960;
function _a() {
  const e = x(null), [t, n] = L(null), [r, a] = L(Da), o = A((s) => {
    e.current = s, n(s);
  }, []);
  return $(() => {
    const s = t;
    if (!s || typeof ResizeObserver > "u")
      return;
    const l = (i) => {
      !Number.isFinite(i) || i < Ca || a((d) => Math.abs(d - i) < za ? d : i);
    }, c = new ResizeObserver((i) => {
      var d, u;
      l(((u = (d = i[0]) == null ? void 0 : d.contentRect) == null ? void 0 : u.width) ?? s.clientWidth);
    });
    return c.observe(s), l(s.clientWidth), () => c.disconnect();
  }, [t]), {
    shellRef: e,
    shellEl: t,
    shellWidth: r,
    bindShell: o
  };
}
function Oa(e) {
  const { mode: t, sourceOnly: n, assetsReady: r, hasSource: a, hasTranslated: o } = e, s = r && a, l = r && o && !n, c = t === "source" || t === "compare", i = !n && (t === "translated" || t === "compare");
  return {
    mountSource: s,
    mountTranslated: l,
    showSource: c,
    showTranslated: i,
    compareMode: t === "compare" && c && i && s && l,
    primaryPane: t === "translated" ? "translated" : "source"
  };
}
const Ot = { source: 0, translated: 0 };
function Fa(e, t) {
  const {
    mode: n,
    sourceOnly: r,
    assetsReady: a,
    sourceUrl: o,
    translatedUrl: s,
    sourceFile: l,
    translatedFile: c
  } = e, i = `${(t == null ? void 0 : t.identityKey) || ""}\0${o}\0${s}`, d = x(i);
  d.current = i;
  const [u, f] = L(() => ({
    identity: i,
    pages: Ot
  })), [m, v] = L(() => ({ identity: i, tick: 0 })), h = u.identity === i ? u.pages : Ot, g = m.identity === i ? m.tick : 0, y = Oa({
    mode: n,
    sourceOnly: r,
    assetsReady: a,
    hasSource: !!l || !!o,
    hasTranslated: !!c
  }), { primaryPane: w } = y, S = A((R, I) => {
    d.current === i && f((k) => {
      const D = k.identity === i ? k.pages : Ot;
      return D[I] === R && k.identity === i ? k : {
        identity: i,
        pages: { ...D, [I]: R }
      };
    });
  }, [i]), b = x(null), P = A(() => {
    b.current && clearTimeout(b.current);
    const R = i;
    b.current = setTimeout(() => {
      b.current = null, d.current === R && v((I) => ({
        identity: R,
        tick: I.identity === R ? I.tick + 1 : 1
      }));
    }, 60);
  }, [i]);
  $(() => (b.current && (clearTimeout(b.current), b.current = null), f((R) => R.identity === i && R.pages.source === 0 && R.pages.translated === 0 ? R : { identity: i, pages: { source: 0, translated: 0 } }), v((R) => R.identity === i && R.tick === 0 ? R : { identity: i, tick: 0 }), () => {
    b.current && (clearTimeout(b.current), b.current = null);
  }), [i]);
  const N = q(
    () => Math.max(h.source, h.translated),
    [h]
  ), M = w === "translated" ? h.translated : h.source || h.translated, _ = t == null ? void 0 : t.userZoom, T = t == null ? void 0 : t.shellWidth, E = `${i}-${g}-${_}-${n}-${h.source}-${h.translated}-${T}`;
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
const Ge = "data-reader-page", Ye = "data-reader-pane", pn = "data-natural-height", $a = "reader-react-root", ja = "reader-react-grid", Ua = "reader-react-scroll-shell", Ba = "reader-react-pdf-pane", Lr = "reader-react-pdf-page", Tt = "reader-react-pdf-page-placeholder", hn = "reader-react-pdf-page-slot";
function lt(e, t) {
  const n = e != null ? `[${Ge}="${e}"]` : `[${Ge}]`;
  return t ? `${n}[${Ye}="${t}"]` : n;
}
function Ha() {
  return `.${hn}[${Ge}]`;
}
function Lt(e) {
  return Number(e.getAttribute(Ge));
}
const Cr = 0.25, zr = 1, Wa = 0.05, pt = 0.5, Ja = 16, Ka = 8;
function ot(e) {
  return pt;
}
function Ct(e) {
  return Number.isFinite(e) ? Math.min(zr, Math.max(Cr, e)) : pt;
}
function dt(e, t) {
  const n = Ct(Number(e) + t * Wa);
  return Math.round(n * 100) / 100;
}
function qa(e) {
  return Math.round(Ct(e) * 100);
}
function Va(e) {
  const n = (Number(e) || 0) - Ja - Ka;
  return Math.max(160, Math.floor(n));
}
function Ga(e, t = pt) {
  const n = Ct(t);
  return Va((Number(e) || 0) * n);
}
function Ya(e, t) {
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
    for (const { pane: s, cx: l, hadOverflow: c } of a) {
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
    requestAnimationFrame(o);
  });
}
const Za = "retainpdf:reader:view:v1:", Hn = /* @__PURE__ */ new Set([
  "source",
  "translated",
  "markdown",
  "ai"
]), Xa = /* @__PURE__ */ new Set([
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
function Yt(e) {
  return `${e || ""}`.trim();
}
function Qa({
  documentId: e,
  jobId: t
}) {
  const n = Yt(e);
  if (n) return `document:${n}`;
  const r = Yt(t);
  return r ? `job:${r}` : "";
}
function _r(e) {
  const t = Yt(e);
  return t ? `${Za}${t}` : "";
}
function es(e) {
  if (!e || typeof e != "object") return;
  const t = Math.floor(Number(e.page)), n = Number(e.fraction);
  if (!(!Number.isFinite(t) || t < 1 || !Number.isFinite(n)))
    return {
      page: t,
      fraction: Math.max(0, Math.min(1, n))
    };
}
function ts(e) {
  if (e === null) return null;
  if (!e || typeof e != "object") return;
  const t = `${e.left || ""}`, n = `${e.right || ""}`;
  if (!(!Hn.has(t) || !Hn.has(n) || t === n))
    return { left: t, right: n };
}
function ns(e) {
  return e === null ? null : e === "markdown" || e === "ai" ? e : void 0;
}
function rs(e) {
  return Xa.has(e) ? e : void 0;
}
function Or(e) {
  if (!e || typeof e != "object") return null;
  const t = e;
  if (t.schema !== "retainpdf_reader_view_v1") return null;
  const n = es(t.anchor), r = Number(t.zoom), a = rs(t.mode), o = ts(t.splitLayout), s = ns(t.assistantPanel);
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
function Ee(e, t = Dr()) {
  const n = _r(e);
  if (!n || !t) return null;
  try {
    const r = t.getItem(n);
    return r ? Or(JSON.parse(r)) : null;
  } catch {
    return null;
  }
}
function Et(e, t, n = Dr()) {
  const r = _r(e);
  if (!r || !n) return null;
  const a = Ee(e, n), o = Or({
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
function os(e, t, n = "") {
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
  const c = A((u) => {
    const f = Ct(u), m = o.current;
    Math.abs(f - m) < 5e-4 || (l.current = f / (m || 1), Et(s.current, { zoom: f }), a(f));
  }, []), i = A((u) => {
    c(dt(o.current, u));
  }, [c]), d = A((u) => {
    c(ot());
  }, [c]);
  return Fe(() => {
    const u = l.current;
    Math.abs(u - 1) < 1e-3 || (l.current = 1, Ya(t == null ? void 0 : t.current, u));
  }, [r, t]), { userZoom: r, onZoomChange: c, stepZoom: i, resetZoom: d };
}
function as(e, t = !0) {
  const [n, r] = L(null), a = A(() => {
    var l, c;
    r(null);
    const s = (l = globalThis.getSelection) == null ? void 0 : l.call(globalThis);
    (c = s == null ? void 0 : s.removeAllRanges) == null || c.call(s);
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
      const E = typeof window < "u" ? window.innerWidth : 800, R = typeof window < "u" ? window.innerHeight : 600, I = 16, k = Math.min(Math.max(I, T.left), E - I), D = Math.min(Math.max(I, T.top), R - I);
      r({
        selectionType: "text",
        quote: w,
        page: P,
        pane: M,
        rect: {
          left: k,
          top: D,
          width: T.width,
          height: T.height
        }
      });
    }, l = () => {
      window.setTimeout(s, 0);
    }, c = () => {
      l();
    }, i = () => l(), d = () => l(), u = () => {
      l();
    }, f = (h) => {
      h.key === "Escape" && a();
    }, m = () => {
      r((h) => h && null);
    };
    document.addEventListener("mouseup", c), document.addEventListener("pointerup", i), document.addEventListener("touchend", d), document.addEventListener("selectionchange", u), document.addEventListener("keyup", f);
    const v = o ?? e.current;
    return v == null || v.addEventListener("scroll", m, { passive: !0 }), window.addEventListener("scroll", m, { passive: !0, capture: !0 }), () => {
      document.removeEventListener("mouseup", c), document.removeEventListener("pointerup", i), document.removeEventListener("touchend", d), document.removeEventListener("selectionchange", u), document.removeEventListener("keyup", f), v == null || v.removeEventListener("scroll", m), window.removeEventListener("scroll", m, !0);
    };
  }, [t, o, a]), { selection: n, clearSelection: a };
}
function ss(e) {
  const { mode: t, setMode: n, beginModeSwitch: r } = e, a = x(t), o = x(n), s = x(r);
  return a.current = t, o.current = n, s.current = r, { setModeKeepingPage: A((c) => {
    c !== a.current && (s.current(), o.current(c));
  }, []) };
}
function is() {
  const [e, t] = L(null), n = A((s) => {
    t(s);
  }, []), r = A((s = null) => {
    t((l) => !s || l === s ? null : l);
  }, []), a = A((s) => {
    t((l) => l === s ? null : s);
  }, []), o = A(
    (s) => e === s,
    [e]
  );
  return { active: e, open: n, close: r, toggle: a, isOpen: o };
}
const gn = 48;
function Fr(e, t = gn) {
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
  const a = Lt(n);
  if (!Number.isFinite(a) || a < 1)
    return null;
  const o = n.getBoundingClientRect(), s = o.height > 0 ? o.height : 1, l = Math.min(1, Math.max(0, (t - o.top) / s));
  return { el: n, page: a, fraction: l };
}
function Ft(e, t, n = gn) {
  if (!e)
    return null;
  const r = lt(void 0, t), a = Array.from(e.querySelectorAll(r));
  if (!a.length || e.getBoundingClientRect().height <= 0)
    return null;
  const s = Fr(e, n), l = $r(a, s);
  return l ? { page: l.page, fraction: l.fraction } : null;
}
function bn(e, t, n = "auto", r, a = gn) {
  if (!e || !t)
    return !1;
  const o = Math.max(1, Math.floor(Number(t.page) || 1)), s = Math.min(1, Math.max(0, Number(t.fraction) || 0));
  let l = null;
  if (r && (l = e.querySelector(lt(o, r))), l || (l = e.querySelector(lt(o))), !l)
    return !1;
  const c = e.getBoundingClientRect(), i = l.getBoundingClientRect();
  if (c.height <= 0 || i.height < 8 && l.offsetHeight < 8)
    return !1;
  const d = i.height > 0 ? i.height : l.offsetHeight, u = e.scrollTop + (i.top - c.top), f = Math.max(0, u + s * d - a);
  return n === "auto" ? e.scrollTop = f : e.scrollTo({ top: f, behavior: n }), !0;
}
function cs(e, t, n = "smooth", r) {
  return bn(
    e,
    { page: t, fraction: 0 },
    n,
    r
  );
}
function Zt(e, t, n) {
  const r = (n == null ? void 0 : n.behavior) ?? "auto", a = (n == null ? void 0 : n.delaysMs) ?? [0, 32, 120, 280];
  let o = !1, s = !1;
  const l = [], c = () => {
    var d;
    if (o) return;
    bn(
      e(),
      t,
      r,
      n == null ? void 0 : n.pane
    ) && !s && (s = !0, (d = n == null ? void 0 : n.onDone) == null || d.call(n));
  };
  for (const i of a)
    i <= 0 ? requestAnimationFrame(() => {
      requestAnimationFrame(c);
    }) : l.push(setTimeout(c, i));
  return () => {
    o = !0;
    for (const i of l)
      clearTimeout(i);
  };
}
function ls(e, t, n) {
  return Zt(
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
function ds(e, t, n = !0, r = "", a) {
  const [o, s] = L(1);
  return $(() => {
    if (!n || t <= 0) {
      s(1);
      return;
    }
    const l = e.current;
    if (!l)
      return;
    let c = !1, i = null, d = 0;
    const u = lt(void 0, a), f = () => {
      if (c) return;
      const h = Array.from(l.querySelectorAll(u));
      if (!h.length)
        return;
      const g = Fr(l), y = $r(h, g);
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
  }, [e, t, n, r, a]), o;
}
const us = `canvas, .react-pdf__Page, .${Lr}, .${Tt}`, Wn = /* @__PURE__ */ new WeakMap();
function fs(e) {
  const t = Number(e.getAttribute(pn));
  if (Number.isFinite(t) && t > 0)
    return t;
  let n = Wn.get(e);
  if ((n == null || !n.isConnected) && (n = e.querySelector(us), Wn.set(e, n)), n) {
    const a = n.getBoundingClientRect().height;
    if (Number.isFinite(a) && a > 0)
      return a;
  }
  const r = e.getBoundingClientRect().height;
  return Number.isFinite(r) && r > 0 ? r : 0;
}
function ms(e, t) {
  if (e.size !== t.size) return !1;
  for (const [n, r] of t)
    if (e.get(n) !== r) return !1;
  return !0;
}
function ps(e) {
  const t = /* @__PURE__ */ new Map();
  e.querySelectorAll(Ha()).forEach((r) => {
    const a = Lt(r);
    if (!Number.isFinite(a) || a < 1) return;
    const o = fs(r);
    if (o <= 0) return;
    const s = t.get(a) || { height: 0, count: 0 };
    s.height = Math.max(s.height, o), s.count += 1, t.set(a, s);
  });
  const n = /* @__PURE__ */ new Map();
  return t.forEach((r, a) => {
    r.count >= 2 && r.height > 0 && n.set(a, Math.ceil(r.height));
  }), n;
}
function hs(e, t, n = "", r) {
  const [a, o] = L(() => /* @__PURE__ */ new Map()), s = x(a), l = x(r);
  return l.current = r, Fe(() => {
    if (!t) {
      s.current.size !== 0 && (s.current = /* @__PURE__ */ new Map(), o(s.current));
      return;
    }
    let c = !1, i = 0, d = !1, u = !1;
    const f = () => {
      var P;
      if (c) return;
      const S = e.current;
      if (!S) return;
      const b = ps(S);
      ms(s.current, b) || (s.current = b, o(b)), d && !u && (u = !0, (P = l.current) == null || P.call(l));
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
  }, [e, t, n]), a;
}
const gs = [0, 48, 140, 320, 560], bs = 700, ys = [80, 200, 400], vs = 500, ws = 50, Ss = 180, Jn = [0, 48, 140, 320, 700, 1200];
function Ps(e, t) {
  var R;
  const {
    primaryPane: n,
    mode: r,
    enabled: a = !0,
    persistenceKey: o = "",
    restoreReady: s = !0
  } = t, l = x(
    ((R = Ee(o)) == null ? void 0 : R.anchor) || { page: 1, fraction: 0 }
  ), c = x(null), i = x(!!o), d = x(r), u = x(null), f = x(null), m = x(null), v = x(null), h = x(o), g = x(""), y = x(n);
  y.current = n;
  const w = A(() => {
    var I;
    (I = u.current) == null || I.call(u), u.current = null, f.current != null && (clearTimeout(f.current), f.current = null);
  }, []), S = A((I = !1) => {
    v.current != null && (clearTimeout(v.current), v.current = null);
    const k = () => {
      v.current = null, Et(h.current, {
        anchor: be(l.current)
      });
    };
    I ? k() : v.current = setTimeout(k, Ss);
  }, []), b = A((I) => {
    l.current = be(I), c.current = null, m.current != null && clearTimeout(m.current), m.current = setTimeout(() => {
      m.current = null, i.current = !1;
    }, ws);
  }, []);
  $(() => {
    if (!a)
      return;
    let I = !1, k = null, D = null, C = null;
    const F = () => {
      w(), m.current != null && (clearTimeout(m.current), m.current = null), i.current = !1, c.current = null, g.current = h.current;
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
      k = J, D = () => {
        if (i.current)
          return;
        const K = Ft(k, y.current);
        K && (l.current = K, S());
      }, k.addEventListener("scroll", D, { passive: !0 }), k.addEventListener("wheel", F, { passive: !0 }), k.addEventListener("touchmove", F, { passive: !0 }), window.addEventListener("keydown", B), i.current || D();
    };
    return X(), () => {
      I = !0, C != null && clearTimeout(C), k && D && (k.removeEventListener("scroll", D), k.removeEventListener("wheel", F), k.removeEventListener("touchmove", F)), window.removeEventListener("keydown", B);
    };
  }, [a, r, n, e, S, w]), Fe(() => {
    var k;
    if (h.current === o) return;
    S(!0), w(), m.current != null && (clearTimeout(m.current), m.current = null), h.current = o, g.current = "";
    const I = (k = Ee(o)) == null ? void 0 : k.anchor;
    l.current = I ? be(I) : { page: 1, fraction: 0 }, c.current = null, i.current = !!o, d.current = r;
  }, [o, r, S, w]), $(() => {
    var k;
    if (!a || !s || !o || g.current === o) return;
    g.current = o;
    const I = be(
      ((k = Ee(o)) == null ? void 0 : k.anchor) || { page: 1, fraction: 0 }
    );
    return l.current = I, c.current = I, i.current = !0, w(), u.current = Zt(
      () => e.current,
      I,
      {
        behavior: "auto",
        pane: y.current,
        delaysMs: Jn,
        onDone: () => b(I)
      }
    ), f.current = setTimeout(() => {
      f.current = null, b(I);
    }, Math.max(...Jn) + 160), () => w();
  }, [a, s, o, e, b, w]), $(() => {
    if (d.current === r)
      return;
    if (d.current = r, !a) {
      i.current = !1, c.current = null, w();
      return;
    }
    const I = c.current ? be(c.current) : be(l.current);
    return i.current = !0, c.current = I, l.current = I, w(), u.current = Zt(
      () => e.current,
      I,
      {
        behavior: "auto",
        pane: n,
        // 等页宽/行高同步后再钉；同一 locked 幂等，不会越滚越远
        delaysMs: gs,
        onDone: () => b(I)
      }
    ), f.current = setTimeout(() => {
      f.current = null, b(I);
    }, bs), () => {
      w();
    };
  }, [r, a, n, e, b, w]), $(() => () => {
    w(), m.current != null && (clearTimeout(m.current), m.current = null), S(!0);
  }, [w, S]);
  const P = A(() => {
    const I = Ft(
      e.current,
      y.current
    );
    return be(I || l.current);
  }, [e]), N = A(() => {
    i.current = !0;
    const I = Ft(
      e.current,
      y.current
    ), k = be(I ?? l.current);
    return l.current = k, c.current = k, S(), k;
  }, [e, S]), M = A((I, k, D) => {
    const C = D || y.current, F = Mt(I, k || 1), B = { page: F, fraction: 0 };
    l.current = B, i.current = !0, c.current = B, S(), w(), cs(e.current, F, "smooth", C), u.current = ls(
      () => e.current,
      F,
      {
        behavior: "auto",
        pane: C,
        delaysMs: ys,
        onDone: () => b(B)
      }
    ), f.current = setTimeout(() => {
      f.current = null, b(B);
    }, vs);
  }, [e, b, w, S]), _ = A(() => be(l.current), []), T = A(() => i.current, []), E = A(() => {
    if (!i.current || !c.current)
      return;
    const I = be(c.current);
    bn(
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
function Is(e, t) {
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
function jr(e, t, n) {
  const r = `${(n == null ? void 0 : n.jobId) || ""}`.trim(), a = `${(n == null ? void 0 : n.documentId) || ""}`.trim(), o = `j:${r}:d:${a}`;
  return t == null ? `${o}:none:${(e == null ? void 0 : e.blockId) || ""}` : `${o}:p:${t}:b:${(e == null ? void 0 : e.blockId) || ""}`;
}
const Rs = [0, 80, 200, 400, 800], Ts = 120, Es = 400;
function Ms(e, t, n) {
  const { enabled: r, numPages: a, goToPage: o, resolveBlockPage: s, onAnchorApplied: l, jobId: c, documentId: i } = e, d = x(o);
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
    const v = oa(), h = Is(v, u.current), g = jr(v, h, { jobId: c, documentId: i });
    if (t.current === g)
      return;
    if (h == null) {
      t.current = g, (S = m.current) == null || S.call(m);
      return;
    }
    t.current = g, v && ((b = f.current) == null || b.call(f, v, h));
    const y = [];
    let w = 0;
    for (const P of Rs)
      w = Math.max(w, P), y.push(
        setTimeout(() => {
          d.current(h);
        }, P)
      );
    return y.push(
      setTimeout(() => {
        var P;
        (P = m.current) == null || P.call(m);
      }, w + Ts)
    ), () => {
      for (const P of y) clearTimeout(P);
    };
  }, [r, a, c, i, t]);
}
function ks(e) {
  var o;
  const t = globalThis.window;
  if (!t || typeof ((o = t.history) == null ? void 0 : o.replaceState) != "function") return;
  const n = t.location, r = `${e || ""}`, a = `${n.pathname}${r ? `?${r}` : ""}${n.hash || ""}`;
  t.history.replaceState(null, "", a);
}
function As(e, t, n) {
  const {
    syncEnabled: r,
    currentPage: a,
    resolveBlockPage: o,
    syncDebounceMs: s = Es,
    jobId: l,
    documentId: c,
    applyReaderSearch: i
  } = e, d = x(o);
  d.current = o;
  const u = x(i);
  u.current = i;
  const f = x(0);
  $(() => {
    if (!n || !r || !t.current || !Number.isFinite(a) || a < 1 || f.current === a) return;
    const m = setTimeout(() => {
      var y;
      const v = ((y = globalThis.location) == null ? void 0 : y.search) || "", h = Ro(v, a, d.current);
      if (f.current = a, h === null) return;
      const g = `${new URLSearchParams(h).get("block_id") || ""}`.trim();
      t.current = jr(
        { blockId: g },
        a,
        { jobId: l, documentId: c }
      ), (u.current || ks)(h);
    }, s);
    return () => clearTimeout(m);
  }, [
    n,
    r,
    a,
    s,
    l,
    c,
    t
  ]);
}
function Ns(e) {
  const t = x(""), [n, r] = L(!1), a = A(() => r(!0), []), o = {
    enabled: e.enabled,
    numPages: e.numPages,
    goToPage: e.goToPage,
    resolveBlockPage: e.resolveBlockPage,
    onAnchorApplied: e.onAnchorApplied,
    jobId: e.jobId,
    documentId: e.documentId
  };
  Ms(o, t, a), As(e, t, n);
}
const et = {
  layoutByPage: /* @__PURE__ */ new Map(),
  pagesByPage: /* @__PURE__ */ new Map(),
  lastSeq: 0,
  connection: "idle",
  jobStatus: "",
  error: ""
};
function xs(e) {
  return new Map(((e == null ? void 0 : e.pages) || []).map((t) => [t.page_idx, t]));
}
function Kn(e, t) {
  return e.attempt !== t.attempt ? e.attempt < t.attempt ? -1 : 1 : e.generation !== t.generation ? e.generation < t.generation ? -1 : 1 : 0;
}
function Ur(e, t, n) {
  if (n.page_idx !== t.page_idx) return "retry";
  const r = Kn(n, t);
  if (r < 0 || r === 0 && n.page_hash !== t.page_hash) return "retry";
  if (!e) return "accept";
  const a = Kn(n, e);
  return a < 0 ? "ignore" : a === 0 ? n.page_hash === e.pageHash ? "ignore" : "retry" : "accept";
}
function Ls(e, t, n) {
  if (t.seq <= e.lastSeq) return e;
  const r = e.pagesByPage.get(t.page_idx), a = Ur(r, t, n);
  if (a === "retry") return e;
  if (a === "ignore")
    return { ...e, lastSeq: t.seq, connection: "live", error: "" };
  const o = new Map(n.items.map((c) => [c.item_id, c])), s = new Map((r == null ? void 0 : r.changedAtSeqById) || []);
  for (const c of t.changed_item_ids)
    o.has(c) && s.set(c, t.seq);
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
const qn = [250, 500, 1e3, 2e3, 4e3], $t = [80, 160, 320, 640, 1e3, 1500], Vn = [250, 500, 1e3, 2e3, 4e3, 5e3], Cs = /* @__PURE__ */ new Set(["succeeded", "failed", "cancelled", "canceled"]);
function Xt(e, t) {
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
function yn(e) {
  return No(e) ? `${e.code || ""}`.trim() : "";
}
function wt(e, t) {
  const n = yn(e);
  return n === "LIVE_TRANSLATION_PAGE_NOT_COMMITTED" ? "尚未收到可显示的页面译文" : n === "LIVE_TRANSLATION_LAYOUT_NOT_READY" ? "正在等待 OCR 版面数据" : `${(e == null ? void 0 : e.message) || ""}`.trim() || t;
}
async function zs(e, t, n, r, a) {
  let o = null;
  for (let s = 0; ; s += 1) {
    try {
      const c = await a.fetchPage(e, t.page_idx, { signal: r });
      if (Ur(n.pagesByPage.get(t.page_idx), t, c) !== "retry")
        return c;
      o = xo(
        "Authoritative page snapshot has not reached the event generation",
        409,
        "LIVE_TRANSLATION_SNAPSHOT_UNAVAILABLE"
      );
    } catch (c) {
      if ((c == null ? void 0 : c.name) === "AbortError") throw c;
      o = c;
      const i = yn(c);
      if (i && ![
        "LIVE_TRANSLATION_PAGE_NOT_COMMITTED",
        "LIVE_TRANSLATION_SNAPSHOT_UNAVAILABLE"
      ].includes(i)) throw c;
    }
    const l = $t[Math.min(s, $t.length - 1)];
    if (await Xt(l, r), s >= $t.length + 2) throw o;
  }
}
function Ds({
  jobId: e,
  jobStatus: t,
  enabled: n,
  liveTranslationPort: r = void 0
}) {
  const [a, o] = L(et), s = x(a), l = x("");
  s.current = a;
  const c = `${e || ""}`.trim(), i = `${t || ""}`.trim().toLowerCase(), d = Cs.has(i) ? i : "";
  return $(() => {
    if (!n || !c) {
      l.current = "", s.current = et, o(et);
      return;
    }
    const u = r === void 0 ? ra() : r, f = l.current === c;
    if (l.current = c, !u) {
      const S = {
        ...f ? s.current : et,
        connection: d ? "terminal" : "unavailable",
        jobStatus: i,
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
      jobStatus: i,
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
          const b = await u.fetchLayout(c, { signal: m.signal });
          v = !0, g((P) => ({
            ...P,
            layoutByPage: xs(b),
            jobStatus: i,
            error: ""
          }));
          return;
        } catch (b) {
          if ((b == null ? void 0 : b.name) === "AbortError") return;
          const P = yn(b);
          if (!(P === "LIVE_TRANSLATION_LAYOUT_NOT_READY" || !P)) {
            g((M) => ({
              ...M,
              connection: d ? "terminal" : "unavailable",
              jobStatus: i,
              error: wt(b, "实时译文暂不可用")
            }));
            return;
          }
          if (d) {
            g((M) => ({
              ...M,
              connection: "terminal",
              jobStatus: i,
              error: ""
            }));
            return;
          }
          g((M) => ({
            ...M,
            connection: "connecting",
            jobStatus: i,
            error: wt(b, "正在等待 OCR 版面数据")
          })), await Xt(qn[Math.min(S, qn.length - 1)], m.signal).catch(() => {
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
                P = await zs(
                  c,
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
                const M = Ls(N, b, P);
                return d ? {
                  ...M,
                  connection: "terminal",
                  jobStatus: i
                } : {
                  ...M,
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
        await Xt(Vn[Math.min(S, Vn.length - 1)], m.signal).catch(() => {
        }), S += 1;
      }
    })(), () => m.abort();
  }, [n, r, c, d]), a;
}
const _s = 2e3;
function Os(e) {
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
const Fs = /* @__PURE__ */ new Set(["book", "translate"]);
function Br(e) {
  return !!(e.jobId && e.sourceUrl && Fs.has(e.workflow));
}
function $s(e) {
  return !!(Br(e) && !(e.jobStatus === "succeeded" && e.translatedUrl));
}
function js() {
  const e = La(), t = Br({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    workflow: e.workflow
  }), n = $s({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    translatedUrl: e.translatedUrl,
    jobStatus: e.jobStatus,
    workflow: e.workflow
  }), r = Ds({
    jobId: e.jobId,
    jobStatus: e.jobStatus,
    enabled: t
  }), a = is(), { shellRef: o, shellEl: s, shellWidth: l, bindShell: c } = _a(), i = Qa({
    documentId: e.documentId,
    jobId: e.jobId
  }), d = `${i}\0${e.jobId}\0${e.sourceUrl}\0${e.translatedUrl}`, { userZoom: u, onZoomChange: f } = os(e.mode, o, i), m = Fa(
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
  } = Ps(o, {
    primaryPane: m.primaryPane,
    mode: e.mode,
    enabled: !e.boot.loading,
    persistenceKey: i,
    restoreReady: m.primaryNumPages > 0
  });
  $(() => {
    g();
  }, [l, g]);
  const y = hs(
    o,
    m.compareMode,
    m.rowSyncRevision,
    g
  ), w = ds(
    o,
    m.primaryNumPages,
    !e.boot.loading,
    `${e.mode}-${u}-${m.metricsTick}`,
    m.primaryPane
  ), S = A((U, G) => {
    var ee, de;
    const Q = Math.max(
      Number(m.hudNumPages) || 0,
      Number(m.primaryNumPages) || 0,
      Number((ee = m.numPagesByPane) == null ? void 0 : ee.source) || 0,
      Number((de = m.numPagesByPane) == null ? void 0 : de.translated) || 0
    );
    h(U, Q, G);
  }, [h, m.hudNumPages, m.primaryNumPages, m.numPagesByPane]), [b, P] = L(null), N = x(null), M = A((U) => {
    N.current && clearTimeout(N.current), P(U), U && (N.current = setTimeout(() => P(null), _s));
  }, []);
  $(() => () => {
    N.current && clearTimeout(N.current);
  }, []);
  const _ = A((U) => {
    const G = Dt(e.regions, U);
    return G ? On(G, m.primaryPane).page : null;
  }, [e.regions, m.primaryPane]), T = A((U, G) => {
    const Q = G || m.primaryPane, ee = typeof U == "object" && U ? `${U.block_id || ""}`.trim() : "", de = typeof U == "object" && U ? `${U.image_url || ""}`.trim() : "", he = typeof U == "object" && U ? U.page_idx != null ? Number(U.page_idx) + 1 : U.page != null ? Number(U.page) : null : typeof U == "number" ? U + 1 : null, pe = Mo(e.regions, de, he) || Dt(e.regions, ee) || (typeof U == "object" ? ko(e.regions, U) : null);
    let j = pe ? On(pe, Q).page : null;
    j == null && (j = Os(U)), !(j == null || j < 1) && (M(pe), S(j, Q));
  }, [M, S, m.primaryPane, e.regions]);
  Ns({
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
  const { setModeKeepingPage: E } = ss({
    mode: e.mode,
    setMode: e.setMode,
    beginModeSwitch: v
  }), [R, I] = L(null), {
    selection: k,
    clearSelection: D
  } = as(o, !e.boot.loading && !e.boot.failed), C = A(() => {
    I(null), D();
  }, [D]), F = A((U) => {
    D(), I(U);
  }, [D]);
  $(() => {
    k && I(null);
  }, [k]), $(() => {
    const U = o.current;
    if (!U) return;
    const G = () => I(null);
    return U.addEventListener("scroll", G, { passive: !0 }), () => U.removeEventListener("scroll", G);
  }, [s, o]);
  const B = k || R;
  $(() => {
    M(null), C();
  }, [d, M, C]);
  const X = !e.boot.loading && !e.boot.failed, J = q(() => a, [a.active, a.open, a.close, a.toggle, a.isOpen]), K = q(() => ({ bindShell: c, shellEl: s, shellWidth: l, shellRef: o }), [c, s, l, o]), oe = q(() => ({
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
    viewStateKey: i,
    liveTranslation: r,
    liveTranslationAvailable: n
  }), [e, K, m, oe, y, S, b, T, E, X, J, B, C, F, u, f, i, r, n]);
  return q(() => ({
    ...se,
    currentPage: w
  }), [se, w]);
}
const Us = [
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
], Bs = [
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
function Hs(e) {
  const t = e.length === 1 ? e.toLowerCase() : e;
  for (const n of Us)
    if (n.keys.some(
      (a) => a.length === 1 ? a === t : a === e
    )) return n;
  return null;
}
function Ws(e) {
  if (!(e instanceof HTMLElement))
    return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
function Js(e) {
  const {
    mode: t,
    sourceOnly: n,
    setMode: r,
    userZoom: a,
    onZoomChange: o,
    currentPage: s,
    numPages: l,
    goToPage: c,
    enabled: i = !0
  } = e;
  $(() => {
    if (!i)
      return;
    const d = (u) => {
      if (u.defaultPrevented || u.metaKey || u.ctrlKey || u.altKey || Ws(u.target))
        return;
      const f = u.key, m = Hs(f);
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
    a,
    o,
    s,
    l,
    c
  ]);
}
const Ks = "retainpdf:soft-reader-close";
function qs() {
  return new URL("./index.html", window.location.href).href;
}
function Vs() {
  if (typeof window > "u" || window.self === window.top) return !1;
  try {
    return window.parent.postMessage(
      { type: Ks },
      window.location.origin
    ), !0;
  } catch {
    return !1;
  }
}
function Gs(e, t, n) {
  if (n <= 1 || !e) return !1;
  try {
    const r = new URL(t), a = new URL(e, r);
    return a.origin === r.origin && !/reader\.html$/i.test(a.pathname) && !/detail\.html$/i.test(a.pathname);
  } catch {
    return !1;
  }
}
function Ys() {
  if (!(typeof window > "u") && !Vs()) {
    if (Gs(
      document.referrer,
      window.location.href,
      window.history.length
    )) {
      window.history.back();
      return;
    }
    window.location.assign(qs());
  }
}
function Zs({ onBeforeClose: e } = {}) {
  return /* @__PURE__ */ z(
    "button",
    {
      id: "reader-close-home-btn",
      type: "button",
      className: "reader-close-home-btn",
      "aria-label": "返回主页",
      title: "返回主页",
      onClick: () => {
        e == null || e(), Ys();
      },
      children: [
        /* @__PURE__ */ p(Xe, { className: "reader-close-home-icon", size: 18, strokeWidth: 2.25, "aria-hidden": !0 }),
        /* @__PURE__ */ p("span", { className: "reader-close-home-label", children: "关闭" })
      ]
    }
  );
}
let Gn = !1;
function Xs() {
  if (Gn)
    return;
  const e = ct().resolvePdfjsVendorUrl("build/pdf.worker.mjs");
  e && (qo.GlobalWorkerOptions.workerSrc = e, Gn = !0);
}
const Qs = {
  formula: "公式",
  table: "表格",
  figure: "图片",
  text: "文字",
  region: "区域"
};
function ei({
  pane: e,
  width: t,
  height: n,
  regions: r,
  onSelect: a
}) {
  const o = r.flatMap((s) => {
    if (!Ir(s.region)) return [];
    const l = Nt(s, t, n);
    return l ? [{ highlight: s, rect: l }] : [];
  });
  return o.length ? /* @__PURE__ */ p("div", { className: "reader-structure-selection-layer", "aria-label": "PDF 结构选择层", children: o.map(({ highlight: s, rect: l }) => {
    const c = s.region, i = Rr(c), d = Qs[i];
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
          a == null || a({
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
          /* @__PURE__ */ p("span", { className: "sr-only", children: Tr(c, e) })
        ]
      },
      c.itemId
    );
  }) }) : null;
}
function ti(e, t, n) {
  return e.flatMap((r) => {
    if (Rr(r.region) !== "text") return [];
    const a = Nt(r, t, n);
    return a ? [{ itemId: r.itemId, highlight: r, rect: a }] : [];
  });
}
function Yn(e, t, n) {
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
function ni({ target: e }) {
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
function ri(e, t) {
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
function oi(e, t, n, r) {
  if (!e || !t) return [];
  const a = [];
  for (const o of e.blocks) {
    const s = t.itemsById.get(o.item_id);
    if (!(s != null && s.translated_text)) continue;
    const l = Nt(
      ri(e, o),
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
const ai = '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif', si = 256, tt = /* @__PURE__ */ new Map();
function ii(e) {
  return `${e || ""}`.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function ci(e) {
  const t = `${e || ""}`, { text: n, slots: r } = Yo(t, { bareLatex: !0 }), a = ii(n), o = Zo(a, r);
  if (!r.length)
    return { fallbackHtml: o, richHtml: Promise.resolve(o), hasMath: !1 };
  let s = tt.get(t);
  if (!s && (s = Xo(a, r), tt.set(t, s), tt.size > si)) {
    const l = tt.keys().next().value;
    l !== void 0 && tt.delete(l);
  }
  return { fallbackHtml: o, richHtml: s, hasMath: !0 };
}
function jt(e) {
  return /title|heading|header|display_formula|equation/i.test(e);
}
function Te(e) {
  const t = Number(e);
  return Number.isFinite(t) && t > 0 ? t : void 0;
}
function li(e, t) {
  const n = e.typography, r = Te(t) || 1, a = Te(n == null ? void 0 : n.font_size_pt), o = Math.max(1, `${e.sourceText || ""}`.split(/\n+/).length), s = e.rect.height / Math.max(1.28, o * 1.18), l = jt(e.kind) ? 24 : /caption|footnote|table/i.test(e.kind) ? 9.5 : 11, c = Math.max(5.5 * r, Math.min(s, l * r)), i = Te(n == null ? void 0 : n.fit_min_font_size_pt), d = Te(n == null ? void 0 : n.fit_max_font_size_pt), u = Math.max(3.5, (i || 5.5) * r), f = Math.max(
    u,
    d ? d * r : a ? a * r : c
  ), m = a ? a * r : c, v = Te(n == null ? void 0 : n.leading_em), h = [
    Te(n == null ? void 0 : n.padding_top_pt) || 0,
    Te(n == null ? void 0 : n.padding_right_pt) || 0,
    Te(n == null ? void 0 : n.padding_bottom_pt) || 0,
    Te(n == null ? void 0 : n.padding_left_pt) || 0
  ].map((g) => g * r);
  return {
    fontFamily: `${(n == null ? void 0 : n.font_family) || ""}`.trim() || ai,
    fontSizePx: Math.max(u, Math.min(f, m)),
    minFontSizePx: u,
    maxFontSizePx: f,
    // Typst leading is the additional inter-line gap, unlike CSS line-height.
    lineHeight: v ? 1 + v : 1.3,
    fontWeight: (n == null ? void 0 : n.font_weight) || (jt(e.kind) ? 600 : 400),
    textAlign: ["left", "center", "right", "justify"].includes(`${(n == null ? void 0 : n.text_align) || ""}`) ? n == null ? void 0 : n.text_align : jt(e.kind) ? "center" : "justify",
    padding: h,
    exact: !!a
  };
}
function di(e, t, n, r) {
  const { minFontSizePx: a, maxFontSizePx: o } = r, s = /* @__PURE__ */ new Map(), l = (u) => {
    const f = s.get(u);
    if (f !== void 0) return f;
    const { width: m, height: v } = e(u), h = m <= t + 0.5 && v <= n + 0.5;
    return s.set(u, h), h;
  };
  let c = a, i = o, d = Math.min(r.requestedFontSizePx, i);
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
  return Math.max(a, d);
}
const ui = 512, nt = /* @__PURE__ */ new Map();
let Qt = 0;
typeof document < "u" && document.fonts && (document.fonts.ready.then(() => {
  Qt += 1;
}).catch(() => {
}), typeof document.fonts.addEventListener == "function" && document.fonts.addEventListener("loadingdone", () => {
  Qt += 1;
}));
function fi(e, t, n, r) {
  return [
    Qt,
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
function mi({ item: e, pageScale: t }) {
  const n = x(null), r = q(
    () => ci(e.translatedText),
    [e.translatedText]
  ), [a, o] = L(r.fallbackHtml), s = q(
    () => li(e, t),
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
    const [f, m, v, h] = s.padding, g = Math.max(1, e.rect.width - h - m), y = Math.max(1, e.rect.height - f - v), w = fi(a, g, y, s);
    let S = nt.get(w);
    if (S === void 0 && (S = di(
      (b) => (u.style.fontSize = `${b}px`, { width: u.scrollWidth, height: u.scrollHeight }),
      g,
      y,
      {
        minFontSizePx: s.minFontSizePx,
        maxFontSizePx: s.maxFontSizePx,
        requestedFontSizePx: s.fontSizePx,
        exact: s.exact
      }
    ), nt.set(w, S), nt.size > ui)) {
      const b = nt.keys().next().value;
      b !== void 0 && nt.delete(b);
    }
    u.style.fontSize = `${S.toFixed(2)}px`;
  }, [a, e.rect.height, e.rect.width, s]);
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
          dangerouslySetInnerHTML: { __html: a }
        }
      )
    }
  );
}
function pi({
  layoutPage: e,
  pageState: t,
  width: n,
  height: r
}) {
  const a = q(
    () => oi(e, t, n, r),
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
        mi,
        {
          item: o,
          pageScale: e != null && e.width ? n / e.width : 1
        },
        `${o.itemId}:${o.changedAtSeq}`
      ))
    }
  ) : null;
}
const hi = on(pi), Hr = 1.414;
function gi({
  pageNumber: e,
  width: t,
  devicePixelRatio: n,
  pane: r,
  active: a = !1,
  syncedMinHeight: o = 0,
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
  const g = x(l ?? Hr), [y, w] = L(g.current);
  $(() => {
    l != null && Math.abs(l - g.current) >= 1e-3 && (g.current = l, w(l));
  }, [l]);
  const S = x(i);
  S.current = i;
  const b = x((C) => {
    var F;
    (F = S.current) == null || F.call(S, C);
  }).current, P = Math.max(120, Math.floor(t * y)), N = Math.max(P, Math.ceil(o || 0)), M = Nt(d, t, P), _ = q(
    () => ti(u, t, P),
    [P, u, t]
  ), [T, E] = L(null), R = q(
    () => _.find((C) => C.itemId === T) || null,
    [T, _]
  ), I = (C) => {
    if (C.buttons !== 0) {
      E(null);
      return;
    }
    const F = C.currentTarget.getBoundingClientRect(), B = Yn(
      _,
      C.clientX - F.left,
      C.clientY - F.top
    ), X = (B == null ? void 0 : B.itemId) || null;
    E((J) => J === X ? J : X);
  }, k = (C) => {
    var X, J, K;
    if (!f || (J = (X = C.target) == null ? void 0 : X.closest) != null && J.call(X, ".reader-structure-selection-target") || `${((K = window.getSelection()) == null ? void 0 : K.toString()) || ""}`.trim()) return;
    const F = C.currentTarget.getBoundingClientRect(), B = Yn(
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
    !Number.isFinite(C) || C <= 0 || Math.abs(g.current - C) < 1e-3 || (g.current = C, w(C), c == null || c(e, C));
  };
  return /* @__PURE__ */ z(
    "div",
    {
      ref: b,
      [Ge]: e,
      [Ye]: r,
      [pn]: P,
      className: hn,
      onPointerMoveCapture: I,
      onClick: k,
      onPointerLeave: () => E(null),
      style: {
        width: t,
        height: N,
        minHeight: N
      },
      children: [
        a ? /* @__PURE__ */ p(
          Vo,
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
          hi,
          {
            layoutPage: m,
            pageState: v,
            width: t,
            height: P
          }
        ) : null,
        /* @__PURE__ */ p(ni, { target: a ? R : null }),
        /* @__PURE__ */ p(
          ei,
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
const bi = on(gi), Ut = 5, yi = "120% 0px", vi = 120;
let Zn = 1;
const Xn = /* @__PURE__ */ new WeakMap();
function wi(e) {
  if (!e) return 0;
  const t = Xn.get(e);
  if (t) return t;
  const n = Zn;
  return Zn += 1, Xn.set(e, n), n;
}
function Si() {
  const e = typeof window < "u" && window.devicePixelRatio || 1;
  return Math.max(1, Math.min(e, 2));
}
const Pi = po(
  function({
    pane: t,
    url: n = "",
    preloadedFile: r = null,
    userZoom: a = 1,
    visible: o = !0,
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
  }, N) {
    Xs();
    const { file: M, loading: _, error: T } = ka(n, r), E = `${n}\0${wi(M)}`, R = x(E);
    R.current = E;
    const I = q(
      () => Ta(M),
      [M, n]
    ), [k, D] = L(0), [C, F] = L(""), [B, X] = L(null), [J, K] = L(480), oe = x(null), se = x(0), U = q(() => Si(), []), G = q(() => ({
      cMapUrl: ct().resolvePdfjsVendorUrl("cmaps/"),
      cMapPacked: !0,
      standardFontDataUrl: ct().resolvePdfjsVendorUrl("standard_fonts/")
    }), []);
    an(N, () => B, [B]), $(() => {
      const O = (H) => {
        !Number.isFinite(H) || H < 80 || Math.abs(H - se.current) < 8 || (se.current = H, K(H));
      }, Y = c && c >= 80 ? c : (l == null ? void 0 : l.clientWidth) || 0;
      if (O(Y), !l || typeof ResizeObserver > "u" || c && c >= 80) return;
      const W = new ResizeObserver((H) => {
        var ne, re;
        const ce = ((re = (ne = H[0]) == null ? void 0 : ne.contentRect) == null ? void 0 : re.width) ?? l.clientWidth;
        !Number.isFinite(ce) || ce < 80 || (oe.current && clearTimeout(oe.current), oe.current = setTimeout(() => O(ce), 80));
      });
      return W.observe(l), () => {
        W.disconnect(), oe.current && clearTimeout(oe.current);
      };
    }, [c, l, o]);
    const Q = q(
      () => Ga(J, a),
      [J, a]
    ), [ee, de] = L(() => /* @__PURE__ */ new Map()), [he, pe] = L(() => /* @__PURE__ */ new Set()), [j, ie] = L(() => /* @__PURE__ */ new Set()), te = x(/* @__PURE__ */ new Map()), V = x(null), ae = x(/* @__PURE__ */ new Map()), Pe = A((O, Y) => {
      de((W) => {
        if (W.get(O) === Y) return W;
        const H = new Map(W);
        return H.set(O, Y), H;
      });
    }, []), ge = A((O, Y) => {
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
    }, []), Ce = x(/* @__PURE__ */ new Map()), gt = A((O) => {
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
            }, vi));
        },
        { root: l, rootMargin: yi, threshold: 0 }
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
    const zt = A(
      ({ numPages: O }) => {
        R.current === E && (D(O), F(""), m == null || m(O, t), u == null || u({ numPages: O, pane: t }));
      },
      [E, u, m, t]
    ), bt = A(
      (O) => {
        if (R.current !== E) return;
        const Y = (O == null ? void 0 : O.message) || "PDF 解析失败";
        F(Y), D(0), m == null || m(0, t), f == null || f(O, t);
      },
      [E, f, m, t]
    ), Ie = q(
      () => k > 0 ? Array.from({ length: k }, (O, Y) => Y + 1) : [],
      [k]
    );
    $(() => {
      typeof IntersectionObserver < "u" || ie(new Set(Ie));
    }, [Ie]);
    const ke = q(
      () => Fn(v, g, t),
      [v, g, t]
    ), Ue = q(() => {
      const O = /* @__PURE__ */ new Map();
      for (const Y of h) {
        const W = Fn(Y, g, t);
        if (!W) continue;
        const H = O.get(W.box.page) || [];
        H.push(W), O.set(W.box.page, H);
      }
      return O;
    }, [t, g, h]), yt = q(() => {
      if (k === 0) return /* @__PURE__ */ new Set();
      if (!(!!l && typeof IntersectionObserver < "u" && o)) return new Set(Ie);
      if (he.size === 0) {
        const W = Math.min(k, Ut * 2 + 1);
        return new Set(Array.from({ length: W }, (H, ce) => ce + 1));
      }
      const Y = /* @__PURE__ */ new Set();
      for (const W of he)
        for (let H = -Ut; H <= Ut; H++) {
          const ce = W + H;
          ce >= 1 && ce <= k && Y.add(ce);
        }
      return Y;
    }, [k, Ie, l, o, he]), fo = !n || !!T || !!C, mo = n && (T || C) || s;
    return /* @__PURE__ */ z(
      "section",
      {
        ref: X,
        className: `reader-panel ${Ba}${o ? "" : " is-hidden"}`,
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
          fo && !_ ? /* @__PURE__ */ p("div", { className: "reader-empty reader-react-pdf-empty", "data-reader-pdf-empty": t, children: mo }) : null,
          _ ? /* @__PURE__ */ p("div", { className: "reader-empty reader-react-pdf-loading", "data-reader-pdf-loading": t, children: "正在加载 PDF…" }) : null,
          I && !T ? /* @__PURE__ */ p("div", { className: "reader-viewer-wrap reader-react-pdf-wrap", children: /* @__PURE__ */ p(
            Go,
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
                    bi,
                    {
                      pane: t,
                      pageNumber: O,
                      width: Q,
                      devicePixelRatio: U,
                      active: j.has(O),
                      syncedMinHeight: (i == null ? void 0 : i.get(O)) || 0,
                      onMetrics: d,
                      cachedAspect: ee.get(O),
                      onAspectChange: Pe,
                      sentinelRef: gt(O),
                      regionHighlight: (ke == null ? void 0 : ke.box.page) === O ? ke : null,
                      regionTargets: Ue.get(O),
                      onSelectRegion: y,
                      liveTranslationLayout: w == null ? void 0 : w.layoutByPage.get(O - 1),
                      liveTranslationPage: w == null ? void 0 : w.pagesByPage.get(O - 1),
                      showLiveTranslation: S
                    },
                    `${t}-${O}`
                  );
                const W = ee.get(O) ?? Hr, H = Math.max(120, Math.floor(Q * W)), ce = Math.max(H, Math.ceil((i == null ? void 0 : i.get(O)) || 0));
                return /* @__PURE__ */ p(
                  "div",
                  {
                    ref: gt(O),
                    [Ge]: O,
                    [Ye]: t,
                    [pn]: H,
                    className: hn,
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
), Qn = on(Pi), Wr = sn(null), Jr = sn(null);
function Ii({ value: e, hud: t, children: n }) {
  return /* @__PURE__ */ p(Wr.Provider, { value: e, children: /* @__PURE__ */ p(Jr.Provider, { value: t, children: n }) });
}
function ht() {
  return cn(Wr);
}
function Ri() {
  return cn(Jr);
}
function Ti({
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
function Ei(e, t, n = e * 2) {
  return t ? Math.min(e * 2, n) : e;
}
function Mi(e) {
  return e ? e.connection === "terminal" && e.jobStatus === "failed" ? e.pagesByPage.size > 0 ? `翻译已暂停，已保留 ${e.pagesByPage.size} 页译文` : "翻译已暂停，原始 PDF 仍可阅读" : e.connection === "terminal" && ["cancelled", "canceled"].includes(e.jobStatus) ? e.pagesByPage.size > 0 ? `翻译已取消，已保留 ${e.pagesByPage.size} 页译文` : "翻译已取消，原始 PDF 仍可阅读" : e.pagesByPage.size > 0 ? "" : e.connection === "unavailable" ? e.error || "实时译文暂不可用，原始 PDF 仍可阅读" : e.error ? e.error : e.layoutByPage.size === 0 ? "正在完成 OCR，译文将在这里逐页出现" : "版面已就绪，正在等待首个译文页面" : "";
}
function ki(e) {
  const t = ht(), {
    markdownSplit: n = !1,
    assistantSplit: r = !1,
    liveTranslation: a,
    paneComposition: o
  } = e, s = (o == null ? void 0 : o.visibleMode) ?? e.mode ?? "compare", l = (o == null ? void 0 : o.compareMode) ?? e.compareMode ?? s === "compare", c = (o == null ? void 0 : o.showSource) ?? e.showSource ?? !0, i = (o == null ? void 0 : o.showTranslated) ?? e.showTranslated ?? (s === "compare" || s === "translated"), d = (o == null ? void 0 : o.overlayOnSource) ?? e.overlayOnSource ?? !1, u = e.bindShell ?? (t == null ? void 0 : t.bindShell), f = e.shellEl ?? (t == null ? void 0 : t.shellEl) ?? null, m = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? pt, v = e.shellWidth ?? (t == null ? void 0 : t.shellWidth) ?? 0, h = e.rowHeights ?? (t == null ? void 0 : t.rowHeights), g = e.mountSource ?? (t == null ? void 0 : t.mountSource) ?? !1, y = e.mountTranslated ?? (t == null ? void 0 : t.mountTranslated) ?? !1, w = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, S = e.sourceUrl ?? (t == null ? void 0 : t.sourceUrl) ?? "", b = e.translatedUrl ?? (t == null ? void 0 : t.translatedUrl) ?? "", P = e.sourceFile ?? (t == null ? void 0 : t.sourceFile) ?? null, N = e.translatedFile ?? (t == null ? void 0 : t.translatedFile) ?? null, M = e.onMetrics ?? (t == null ? void 0 : t.onMetrics), _ = e.onNumPagesChange ?? (t == null ? void 0 : t.onNumPagesChange), T = e.activeRegion ?? (t == null ? void 0 : t.activeRegion), E = e.regions ?? (t == null ? void 0 : t.regions) ?? [], R = e.readerMetadata ?? (t == null ? void 0 : t.readerMetadata), I = e.onSelectRegion ?? (t == null ? void 0 : t.onSelectRegion), k = Ti({
    mode: s,
    compareMode: l,
    showSource: c,
    showTranslated: i,
    markdownSplit: n,
    overlayOnSource: d
  }), D = Ei(
    v,
    n || r,
    typeof document > "u" ? v * 2 : document.documentElement.clientWidth
  );
  return /* @__PURE__ */ p(
    "div",
    {
      ref: u,
      className: Ua,
      "data-reader-region-count": E.length,
      "data-reader-structured-region-count": E.filter(Ir).length,
      "data-reader-metadata-ready": R ? "true" : "false",
      children: /* @__PURE__ */ z(
        "main",
        {
          className: `${ja} reader-mode-${k.mode}`,
          "data-reader-mode": n ? "markdown-split" : r ? "assistant-split" : s,
          children: [
            g ? /* @__PURE__ */ p(
              Qn,
              {
                pane: "source",
                url: S,
                preloadedFile: P,
                userZoom: m,
                visible: k.showSource,
                scrollRoot: f,
                pageWidthOverride: D,
                rowHeights: k.compareMode ? h : void 0,
                onMetrics: M,
                emptyLabel: w ? "源文件不可用：该文档没有可读取的源 PDF。" : "暂无原文 PDF",
                onNumPagesChange: _,
                activeRegion: T,
                regions: E,
                readerMetadata: R,
                onSelectRegion: I,
                liveTranslation: d ? a : void 0,
                showLiveTranslation: d,
                liveTranslationPendingLabel: d ? Mi(a) : "",
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
              Qn,
              {
                pane: "translated",
                url: b,
                preloadedFile: N,
                userZoom: m,
                visible: k.showTranslated,
                scrollRoot: f,
                pageWidthOverride: D,
                rowHeights: k.compareMode ? h : void 0,
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
const Ai = [
  { id: "source", label: "源文件", Icon: Er },
  { id: "compare", label: "对照", Icon: Mr },
  { id: "translated", label: "翻译文件", Icon: kr }
];
function Ni(e) {
  return e.connection === "live" ? `实时译文 · ${e.pagesByPage.size} 页` : e.connection === "reconnecting" ? "实时译文 · 重连中" : e.connection === "unavailable" ? "实时译文 · 不可用" : e.connection === "terminal" ? e.jobStatus === "failed" ? "实时译文 · 已暂停" : e.jobStatus === "cancelled" || e.jobStatus === "canceled" ? "实时译文 · 已取消" : e.jobStatus === "succeeded" ? "实时译文 · 已完成" : "实时译文 · 已结束" : e.error || "实时译文 · 连接中";
}
function xi(e) {
  return e.id === "translated" ? e.sourceViewOnly : e.id === "compare" ? !e.documentReady || e.sourceViewOnly && !e.liveTranslationAvailable : !1;
}
function Li(e) {
  const t = ht(), {
    mode: n,
    documentReady: r,
    onModeChange: a,
    liveTranslation: o = null
  } = e, s = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, l = o ? Ni(o.state) : "";
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
          /* @__PURE__ */ p(_o, { size: 14, strokeWidth: 2.2, "aria-hidden": !0 }),
          /* @__PURE__ */ p("span", { className: "reader-live-translation-toggle-label", children: l })
        ]
      }
    ) : null,
    /* @__PURE__ */ p("div", { className: "reader-workspace-tabs", role: "tablist", "aria-label": "阅读工作区", children: Ai.map(({ id: c, label: i, Icon: d }) => {
      const u = n === c, f = xi({
        id: c,
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
          "aria-label": i,
          title: f ? `${i} 需要文档任务` : i,
          disabled: f,
          onClick: () => a(c),
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
const er = [
  { id: "markdown", label: "Markdown", Icon: Ar },
  { id: "ai", label: "AI 问答", Icon: un }
];
function Ci(e) {
  const t = ht(), { active: n } = e, r = e.onSelect ?? (t == null ? void 0 : t.assistant.select) ?? (() => {
  }), a = e.onClose ?? (t == null ? void 0 : t.assistant.close) ?? (() => {
  });
  return n ? /* @__PURE__ */ z("header", { className: "reader-assistant-dock-header", children: [
    /* @__PURE__ */ p("div", { className: "reader-assistant-dock-tabs", role: "tablist", "aria-label": "阅读辅助面板", children: er.map(({ id: o, label: s, Icon: l }) => {
      const c = n === o;
      return /* @__PURE__ */ z(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": c,
          className: `reader-assistant-dock-tab${c ? " is-active" : ""}`,
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
  ] }) : /* @__PURE__ */ p("nav", { className: "reader-assistant-rail", "aria-label": "阅读辅助工具", children: er.map(({ id: o, label: s, Icon: l }) => /* @__PURE__ */ z(
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
function zi(e, t) {
  const n = getComputedStyle(e), r = parseFloat(n.fontSize);
  return t * r;
}
function Di(e, t) {
  const n = getComputedStyle(e.ownerDocument.documentElement), r = parseFloat(n.fontSize);
  return t * r;
}
function _i(e) {
  return e / 100 * window.innerHeight;
}
function Oi(e) {
  return e / 100 * window.innerWidth;
}
function Fi(e) {
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
  const [a, o] = Fi(n);
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
      r = Di(t, a);
      break;
    }
    case "em": {
      r = zi(t, a);
      break;
    }
    case "vh": {
      r = _i(a);
      break;
    }
    case "vw": {
      r = Oi(a);
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
function en(e) {
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
    let c = 0;
    if (o.minSize !== void 0) {
      const d = rt({
        groupSize: n,
        panelElement: a,
        styleProp: o.minSize
      });
      c = fe(d / n * 100);
    }
    let i = 100;
    if (o.maxSize !== void 0) {
      const d = rt({
        groupSize: n,
        panelElement: a,
        styleProp: o.maxSize
      });
      i = fe(d / n * 100);
    }
    return {
      groupResizeBehavior: o.groupResizeBehavior,
      collapsedSize: s,
      collapsible: o.collapsible === !0,
      defaultSize: l,
      disabled: o.disabled,
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
function tn(e, t) {
  return Array.from(t).sort(
    e === "horizontal" ? $i : ji
  );
}
function $i(e, t) {
  const n = e.element.offsetLeft - t.element.offsetLeft;
  return n !== 0 ? n : e.element.offsetWidth - t.element.offsetWidth;
}
function ji(e, t) {
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
function Ui({
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
    const { x: l, y: c } = qr(r, s), i = e === "horizontal" ? l : c;
    i < o && (o = i, a = s);
  }
  return Z(a, "No rect found"), a;
}
let St;
function Bi() {
  return St === void 0 && (typeof matchMedia == "function" ? St = !!matchMedia("(pointer:coarse)").matches : St = !1), St;
}
function Vr(e) {
  const { element: t, orientation: n, panels: r, separators: a } = e, o = tn(
    n,
    Array.from(t.children).filter(Kr).map((v) => ({ element: v }))
  ).map(({ element: v }) => v), s = [];
  let l = !1, c = !1, i = -1, d = -1, u = 0, f, m = [];
  {
    let v = -1;
    for (const h of o)
      h.hasAttribute("data-panel") && (v++, h.hasAttribute("data-disabled") || (u++, i === -1 && (i = v), d = v));
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
                  const N = m[0], M = Ui({
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
              const N = Bi() ? e.resizeTargetMinimumSize.coarse : e.resizeTargetMinimumSize.fine;
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
              const M = v <= i || v > d;
              !l && !M && s.push({
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
        const g = a.find(
          (y) => y.element === h
        );
        g ? m.push(g) : (f = void 0, m = []);
      } else
        c = !0;
  }
  return s;
}
var xe;
class Gr {
  constructor() {
    Dn(this, xe, {});
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
          const c = s[l];
          try {
            c.call(null, n);
          } catch (i) {
            o === null && (a = !0, o = i);
          }
        }
        if (a)
          throw o;
      }
  }
  removeAllListeners() {
    _n(this, xe, {});
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
const vn = new Gr();
function De() {
  return qe;
}
function Hi(e) {
  return vn.addListener("change", e);
}
function Wi(e) {
  const t = qe, n = { ...qe };
  n.cursorFlags = e, qe = n, vn.emit("change", {
    prev: t,
    next: n
  });
}
function Ve(e) {
  const t = qe;
  qe = e, vn.emit("change", {
    prev: t,
    next: e
  });
}
const Ji = (e) => e, Bt = () => {
}, Yr = 1, Zr = 2, Xr = 4, Qr = 8, tr = 3, nr = 12;
let Pt;
function rr() {
  return Pt === void 0 && (Pt = !1, typeof window < "u" && (window.navigator.userAgent.includes("Chrome") || window.navigator.userAgent.includes("Firefox")) && (Pt = !0)), Pt;
}
function Ki({
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
        if (e && rr()) {
          const o = (e & Yr) !== 0, s = (e & Zr) !== 0, l = (e & Xr) !== 0, c = (e & Qr) !== 0;
          if (o)
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
    return rr() ? r > 0 && a > 0 ? "move" : r > 0 ? "ew-resize" : "ns-resize" : r > 0 && a > 0 ? "grab" : r > 0 ? "col-resize" : "row-resize";
  }
}
const or = /* @__PURE__ */ new WeakMap();
function wn(e) {
  if (e.defaultView === null || e.defaultView === void 0)
    return;
  let { prevStyle: t, styleSheet: n } = or.get(e) ?? {};
  n === void 0 && (n = new e.defaultView.CSSStyleSheet(), e.adoptedStyleSheets && (Object.isExtensible(e.adoptedStyleSheets) ? e.adoptedStyleSheets.push(n) : e.adoptedStyleSheets = [
    ...e.adoptedStyleSheets,
    n
  ]));
  const r = De();
  switch (r.state) {
    case "active":
    case "hover": {
      const a = Ki({
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
  or.set(e, {
    prevStyle: t,
    styleSheet: n
  });
}
let Se = /* @__PURE__ */ new Map();
const eo = new Gr();
function qi(e) {
  Se = new Map(Se), Se.delete(e);
}
function ar(e, t) {
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
function Sn(e, t) {
  return eo.addListener("groupChange", (n) => {
    n.group.id === e && t(n);
  });
}
function Me(e, t, n) {
  const r = Se.get(e);
  Se = new Map(Se), Se.set(e, t), eo.emit("groupChange", {
    group: e,
    isUserInteraction: (n == null ? void 0 : n.isUserInteraction) === !0,
    prev: r,
    next: t
  });
}
function to(e) {
  const t = De();
  let n = !1;
  switch (t.state) {
    case "active":
      Ve({
        cursorFlags: 0,
        state: "inactive"
      }), t.hitRegions.length > 0 && (wn(e), n = !0, t.hitRegions.forEach((r) => {
        const a = Le(r.group.id, !0);
        Me(r.group, a, {
          isUserInteraction: !0
        });
      }));
  }
  return n;
}
function sr(e) {
  e.defaultPrevented || to(e.currentTarget);
}
function Vi(e, t, n) {
  let r, a = {
    x: 1 / 0,
    y: 1 / 0
  };
  for (const o of t) {
    const s = qr(n, o.rect);
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
function Gi(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}
function Yi(e, t) {
  if (e === t) throw new Error("Cannot compare node with itself");
  const n = {
    a: lr(e),
    b: lr(t)
  };
  let r;
  for (; n.a.at(-1) === n.b.at(-1); )
    r = n.a.pop(), n.b.pop();
  Z(
    r,
    "Stacking order can only be calculated for elements with a common ancestor"
  );
  const a = {
    a: cr(ir(n.a)),
    b: cr(ir(n.b))
  };
  if (a.a === a.b) {
    const o = r.childNodes, s = {
      a: n.a.at(-1),
      b: n.b.at(-1)
    };
    let l = o.length;
    for (; l--; ) {
      const c = o[l];
      if (c === s.a) return 1;
      if (c === s.b) return -1;
    }
  }
  return Math.sign(a.a - a.b);
}
const Zi = /\b(?:position|zIndex|opacity|transform|webkitTransform|mixBlendMode|filter|webkitFilter|isolation)\b/;
function Xi(e) {
  const t = getComputedStyle(no(e) ?? e).display;
  return t === "flex" || t === "inline-flex";
}
function Qi(e) {
  const t = getComputedStyle(e);
  return !!(t.position === "fixed" || t.zIndex !== "auto" && (t.position !== "static" || Xi(e)) || +t.opacity < 1 || "transform" in t && t.transform !== "none" || "webkitTransform" in t && t.webkitTransform !== "none" || "mixBlendMode" in t && t.mixBlendMode !== "normal" || "filter" in t && t.filter !== "none" || "webkitFilter" in t && t.webkitFilter !== "none" || "isolation" in t && t.isolation === "isolate" || Zi.test(t.willChange) || t.webkitOverflowScrolling === "touch");
}
function ir(e) {
  let t = e.length;
  for (; t--; ) {
    const n = e[t];
    if (Z(n, "Missing node"), Qi(n)) return n;
  }
  return null;
}
function cr(e) {
  return e && Number(getComputedStyle(e).zIndex) || 0;
}
function lr(e) {
  const t = [];
  for (; e; )
    t.push(e), e = no(e);
  return t;
}
function no(e) {
  const { parentNode: t } = e;
  return Gi(t) ? t.host : t;
}
function ec(e, t) {
  return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function tc({
  groupElement: e,
  hitRegion: t,
  pointerEventTarget: n
}) {
  if (!Kr(n) || n.contains(e) || e.contains(n))
    return !0;
  if (Yi(n, e) > 0) {
    let r = n;
    for (; r; ) {
      if (r.contains(e))
        return !0;
      if (ec(r.getBoundingClientRect(), t))
        return !1;
      r = r.parentElement;
    }
  }
  return !0;
}
function Pn(e, t) {
  const n = [];
  return t.forEach((r, a) => {
    if (a.disabled)
      return;
    const o = Vr(a), s = Vi(a.orientation, o, {
      x: e.clientX,
      y: e.clientY
    });
    s && s.distance.x <= 0 && s.distance.y <= 0 && tc({
      groupElement: a.element,
      hitRegion: s.hitRegion.rect,
      pointerEventTarget: e.target
    }) && n.push(s.hitRegion);
  }), n;
}
function nc(e, t) {
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
    minSize: c = 0
  } = t;
  if (s && !e)
    return n;
  if (we(r, c) < 0)
    if (o) {
      const i = (a + c) / 2;
      we(r, i) < 0 ? r = a : r = c;
    } else
      r = c;
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
  const s = o === "imperative-api", l = Object.values(t), c = Object.values(a), i = [...l], [d, u] = r;
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
      if (!ue(y, S) && (f += y - S, i[h] = S, f.toFixed(3).localeCompare(Math.abs(e).toFixed(3), void 0, {
        numeric: !0
      }) >= 0))
        break;
      e < 0 ? h-- : h++;
    }
  }
  if (nc(c, i))
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
    if (i[h] = w, !ue(w, y)) {
      let S = y - w, b = e < 0 ? u : d;
      for (; b >= 0 && b < n.length; ) {
        const P = i[b];
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
        if (ue(P, M) || (S -= M - P, i[b] = M), ue(S, 0))
          break;
        e > 0 ? b-- : b++;
      }
    }
  }
  const m = Object.values(i).reduce(
    (h, g) => g + h,
    0
  );
  if (!ue(m, 100, 0.1))
    return a;
  const v = Object.keys(a);
  return i.reduce((h, g, y) => (h[v[y]] = g, h), {});
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
    (l, c) => l + c,
    0
  );
  if (r.length !== t.length)
    throw Error(
      `Invalid ${t.length} panel layout: ${r.map((l) => `${l}%`).join(", ")}`
    );
  if (!ue(a, 100) && r.length > 0)
    for (let l = 0; l < t.length; l++) {
      const c = r[l];
      Z(c != null, `No layout data found for index ${l}`);
      const i = 100 / a * c;
      r[l] = i;
    }
  let o = 0;
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
    i != d && (o += i - d, r[l] = d);
  }
  if (!ue(o, 0))
    for (let l = 0; l < t.length; l++) {
      const c = r[l];
      Z(c != null, `No layout data found for index ${l}`);
      const i = c + o, d = Je({
        overrideDisabledPanels: !0,
        panelConstraints: t[l],
        prevSize: c,
        size: i
      });
      if (c !== d && (o -= d - c, r[l] = d, ue(o, 0)))
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
    const c = $e();
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
  }, a = () => {
    const c = n().group.panels.find((i) => i.id === t);
    if (c !== void 0)
      return c;
    throw Error(`Layout not found for Panel ${t}`);
  }, o = () => {
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
    const f = o(), m = i.findIndex((g) => g.id === t), v = m === 0, h = m === i.length - 1;
    if (h && c < f && (v || i.slice(0, m).every((g, y) => {
      const w = u[y];
      return (w == null ? void 0 : w.collapsible) && ue(w.collapsedSize, d[w.panelId]);
    }))) {
      const g = i.slice(0, m).reduce((y, w) => y + d[w.id], 0);
      return {
        ...d,
        [t]: fe(100 - g)
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
    const i = o();
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
      const { collapsible: c, collapsedSize: i } = r(), { mutableValues: d } = a(), u = o();
      c && u !== i && (d.expandToSize = u, l(i));
    },
    expand: () => {
      const { collapsible: c, collapsedSize: i, minSize: d } = r(), { mutableValues: u } = a(), f = o();
      if (c && f === i) {
        let m = u.expandToSize ?? d;
        m === 0 && (m = 1), l(m);
      }
    },
    getSize: () => {
      const { group: c } = n(), i = o(), { element: d } = a(), u = c.orientation === "horizontal" ? d.offsetWidth : d.offsetHeight;
      return {
        asPercentage: i,
        inPixels: u
      };
    },
    isCollapsed: () => {
      const { collapsible: c, collapsedSize: i } = r(), d = o();
      return c && ue(i, d);
    },
    resize: (c) => {
      const { group: i } = n(), { element: d } = a(), u = Ze({ group: i }), f = rt({
        groupSize: u,
        panelElement: d,
        styleProp: c
      }), m = fe(f / u * 100);
      l(m);
    }
  };
}
function dr(e) {
  if (e.defaultPrevented)
    return;
  const t = $e();
  Pn(e, t).forEach((n) => {
    if (n.separator && !n.separator.disableDoubleClick) {
      const r = n.panels.find(
        (a) => a.panelConstraints.defaultSize !== void 0
      );
      if (r) {
        const a = r.panelConstraints.defaultSize, o = ro({
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
function oo({
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
        separatorToPanels: c
      } = t(), i = Oe({
        layout: n,
        panelConstraints: a
      });
      return r ? l : (_e(l, i) || Me(o, {
        defaultLayoutDeferred: r,
        derivedPanelConstraints: a,
        groupSize: s,
        layout: i,
        separatorToPanels: c
      }), i);
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
  const s = o.map((d) => n.panels.indexOf(d)), l = oo({ groupId: n.id }).getLayout(), c = ut({
    delta: t,
    initialLayout: l,
    panelConstraints: r.derivedPanelConstraints,
    pivotIndices: s,
    prevLayout: l,
    trigger: "keyboard"
  }), i = Oe({
    layout: c,
    panelConstraints: r.derivedPanelConstraints
  });
  _e(l, i) || Me(
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
function ur(e) {
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
        const r = It(t), a = Le(r.id, !0), { derivedPanelConstraints: o, layout: s, separatorToPanels: l } = a, c = r.separators.find(
          (f) => f.element === t
        );
        Z(c, "Matching separator not found");
        const i = l.get(c);
        Z(i, "Matching panels not found");
        const d = i[0], u = o.find(
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
function fr(e) {
  if (e.defaultPrevented || e.pointerType === "mouse" && e.button > 0)
    return;
  const t = $e(), n = Pn(e, t), r = /* @__PURE__ */ new Map();
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
function ao({
  document: e,
  event: t,
  hitRegions: n,
  initialLayoutMap: r,
  mountedGroups: a,
  pointerDownAtPoint: o,
  prevCursorFlags: s
}) {
  let l = 0;
  n.forEach((i) => {
    const { group: d, groupSize: u } = i, { orientation: f, panels: m } = d, { disableCursor: v } = d.mutableState;
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
        pivotIndices: i.panels.map((_) => m.indexOf(_)),
        prevLayout: P,
        trigger: "mouse-or-touch"
      });
      if (_e(M, P)) {
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
        Me(i.group, {
          defaultLayoutDeferred: w,
          derivedPanelConstraints: S,
          groupSize: b,
          layout: M,
          separatorToPanels: N
        });
    }
  });
  let c = 0;
  t.movementX === 0 ? c |= s & tr : c |= l & tr, t.movementY === 0 ? c |= s & nr : c |= l & nr, Wi(c), wn(e);
}
function mr(e) {
  const t = $e(), n = De();
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
function pr(e) {
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
      const o = Pn(e, n);
      o.length === 0 ? t.state !== "inactive" && Ve({
        cursorFlags: 0,
        state: "inactive"
      }) : Ve({
        cursorFlags: 0,
        hitRegions: o,
        state: "hover"
      }), wn(e.currentTarget);
      break;
    }
  }
}
function hr(e) {
  if (e.relatedTarget instanceof HTMLIFrameElement)
    switch (De().state) {
      case "hover":
        Ve({
          cursorFlags: 0,
          state: "inactive"
        });
    }
}
function gr(e) {
  e.defaultPrevented || e.pointerType === "mouse" && e.button > 0 || to(e.currentTarget) && e.preventDefault();
}
function br(e) {
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
function rc(e, t, n) {
  if (!n[0])
    return;
  const r = e.panels.find((c) => c.element === t);
  if (!r || !r.onResize)
    return;
  const a = Ze({ group: e }), o = e.orientation === "horizontal" ? r.element.offsetWidth : r.element.offsetHeight, s = r.mutableValues.prevSize, l = {
    asPercentage: fe(o / a * 100),
    inPixels: o
  };
  r.mutableValues.prevSize = l, r.onResize(l, r.id, s);
}
function oc(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function ac({
  group: e,
  nextGroupSize: t,
  prevGroupSize: n,
  prevLayout: r
}) {
  if (n <= 0 || t <= 0 || n === t)
    return r;
  let a = 0, o = 0, s = !1;
  const l = /* @__PURE__ */ new Map(), c = [];
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
        c.push(u.id), o += f;
        break;
      }
    }
  }
  if (!s || c.length === 0)
    return r;
  const i = 100 - a, d = { ...r };
  if (l.forEach((u, f) => {
    d[f] = u;
  }), o > 0)
    for (const u of c) {
      const f = r[u] ?? 0;
      d[u] = fe(
        f / o * i
      );
    }
  else {
    const u = fe(
      i / c.length
    );
    for (const f of c)
      d[f] = u;
  }
  return d;
}
function sc(e, t) {
  const n = e.map((a) => a.id), r = Object.keys(t);
  if (n.length !== r.length)
    return !1;
  for (const a of n)
    if (!r.includes(a))
      return !1;
  return !0;
}
const Be = /* @__PURE__ */ new Map();
function ic(e) {
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
          const b = en(e), P = S.defaultLayoutDeferred ? br(b) : S.layout, N = ac({
            group: e,
            nextGroupSize: w,
            prevGroupSize: S.groupSize,
            prevLayout: P
          }), M = Oe({
            layout: N,
            panelConstraints: b
          });
          if (!S.defaultLayoutDeferred && _e(S.layout, M) && oc(
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
        rc(e, y, g);
    }
  });
  o.observe(e.element), e.panels.forEach((v) => {
    Z(
      !r.has(v.id),
      `Panel ids must be unique; id "${v.id}" was used more than once`
    ), r.add(v.id), v.onResize && o.observe(v.element);
  });
  const s = Ze({ group: e }), l = en(e), c = e.panels.map(({ id: v }) => v).join(",");
  let i = e.mutableState.defaultLayout;
  i && (sc(e.panels, i) || (i = void 0));
  const d = e.mutableState.layouts[c] ?? i ?? br(l), u = Oe({
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
    ), a.add(v.id), v.element.addEventListener("keydown", ur);
  }), Be.get(f) === 1 && (f.addEventListener("contextmenu", sr, !0), f.addEventListener("dblclick", dr, !0), f.addEventListener("pointerdown", fr, !0), f.addEventListener("pointerleave", mr), f.addEventListener("pointermove", pr), f.addEventListener("pointerout", hr), f.addEventListener("pointerup", gr, !0)), function() {
    t = !1, Be.set(
      f,
      Math.max(0, (Be.get(f) ?? 0) - 1)
    ), qi(e), e.separators.forEach((v) => {
      v.element.removeEventListener("keydown", ur);
    }), Be.get(f) || (f.removeEventListener(
      "contextmenu",
      sr,
      !0
    ), f.removeEventListener(
      "dblclick",
      dr,
      !0
    ), f.removeEventListener(
      "pointerdown",
      fr,
      !0
    ), f.removeEventListener("pointerleave", mr), f.removeEventListener("pointermove", pr), f.removeEventListener("pointerout", hr), f.removeEventListener("pointerup", gr, !0)), o.disconnect();
  };
}
function cc() {
  const [e, t] = L({}), n = A(() => t({}), []);
  return [e, n];
}
function In(e) {
  const t = ln();
  return `${e ?? t}`;
}
const je = typeof window < "u" ? Fe : $;
function at(e) {
  const t = x(e);
  return je(() => {
    t.current = e;
  }, [e]), A(
    (...n) => {
      var r;
      return (r = t.current) == null ? void 0 : r.call(t, ...n);
    },
    [t]
  );
}
function Rn(...e) {
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
function Tn(e) {
  const t = x({ ...e });
  return je(() => {
    for (const n in e)
      t.current[n] = e[n];
  }, [e]), t.current;
}
const so = sn(null);
function lc(e, t) {
  const n = x({
    getLayout: () => ({}),
    setLayout: Ji
  });
  an(t, () => n.current, []), je(() => {
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
  disabled: a,
  elementRef: o,
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
  }), h = at((R) => {
    _e(v.current.onLayoutChange, R) || (v.current.onLayoutChange = R, c == null || c(R));
  }), g = at(
    (R, I) => {
      _e(v.current.onLayoutChanged, R) || (v.current.onLayoutChanged = R, i == null || i(R, { isUserInteraction: I }));
    }
  ), y = In(l), w = x(null), [S, b] = cc(), P = x({
    lastExpandedPanelSizes: {},
    layouts: {},
    panels: [],
    resizeTargetMinimumSize: u,
    separators: []
  }), N = Rn(w, o);
  lc(y, s);
  const M = at(
    (R, I) => {
      const k = De(), D = ar(R), C = Le(R);
      if (C) {
        let F = !1;
        switch (k.state) {
          case "active": {
            F = k.hitRegions.some(
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
  ), _ = Tn({
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
        return I.panels = tn(d, [
          ...I.panels,
          R
        ]), b(), () => {
          I.panels = I.panels.filter(
            (k) => k !== R
          ), b();
        };
      },
      registerSeparator: (R) => {
        const I = P.current;
        return I.separators = tn(d, [
          ...I.separators,
          R
        ]), b(), () => {
          I.separators = I.separators.filter(
            (k) => k !== R
          ), b();
        };
      },
      updatePanelProps: (R, { disabled: I }) => {
        const k = P.current.panels.find(
          (F) => F.id === R
        );
        k && (k.panelConstraints.disabled = I);
        const D = ar(y), C = Le(y);
        D && C && Me(D, {
          ...C,
          derivedPanelConstraints: en(D)
        });
      },
      updateSeparatorProps: (R, {
        disabled: I,
        disableDoubleClick: k
      }) => {
        const D = P.current.separators.find(
          (C) => C.id === R
        );
        D && (D.disabled = I, D.disableDoubleClick = k);
      }
    }),
    [M, y, b, d, _]
  ), E = x(null);
  return je(() => {
    const R = w.current;
    if (R === null)
      return;
    const I = P.current;
    let k;
    if (_.defaultLayout !== void 0 && Object.keys(_.defaultLayout).length === I.panels.length) {
      k = {};
      for (const K of I.panels) {
        const oe = _.defaultLayout[K.id];
        oe !== void 0 && (k[K.id] = oe);
      }
    }
    const D = {
      disabled: !!a,
      element: R,
      id: y,
      mutableState: {
        defaultLayout: k,
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
    const C = ic(D), { defaultLayoutDeferred: F, derivedPanelConstraints: B, layout: X } = Le(D.id, !0);
    !F && B.length > 0 && (h(X), g(X, !1));
    const J = Sn(y, (K) => {
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
  }), /* @__PURE__ */ p(so.Provider, { value: T, children: /* @__PURE__ */ p(
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
io.displayName = "Group";
function En() {
  const e = cn(so);
  return Z(
    e,
    "Group Context not found; did you render a Panel or Separator outside of a Group?"
  ), e;
}
function dc(e, t) {
  const { id: n } = En(), r = x({
    collapse: Bt,
    expand: Bt,
    getSize: () => ({
      asPercentage: 0,
      inPixels: 0
    }),
    isCollapsed: () => !1,
    resize: Bt
  });
  an(t, () => r.current, []), je(() => {
    Object.assign(
      r.current,
      ro({ groupId: n, panelId: e })
    );
  });
}
function nn({
  children: e,
  className: t,
  collapsedSize: n = "0%",
  collapsible: r = !1,
  defaultSize: a,
  disabled: o,
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
  const h = !!c, g = In(c), y = Tn({
    disabled: o
  }), w = x(null), S = Rn(w, s), {
    getPanelStyles: b,
    id: P,
    orientation: N,
    registerPanel: M,
    updatePanelProps: _
  } = En(), T = u !== null, E = at(
    (D, C, F) => {
      u == null || u(D, c, F);
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
          maxSize: i,
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
    i,
    d,
    E,
    M,
    y
  ]), $(() => {
    _(g, { disabled: o });
  }, [o, g, _]), dc(g, f);
  const R = () => {
    const D = b(P, g);
    if (D)
      return JSON.stringify(D);
  }, I = ho(
    (D) => Sn(P, D),
    R,
    R
  );
  let k;
  return I ? k = JSON.parse(I) : a !== void 0 ? k = {
    flexGrow: void 0,
    flexShrink: void 0,
    flexBasis: a
  } : k = { flexGrow: 1 }, /* @__PURE__ */ p(
    "div",
    {
      ...v,
      "data-disabled": o || void 0,
      "data-panel": !0,
      "data-testid": g,
      id: g,
      ref: S,
      style: {
        ...uc,
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
            touchAction: N === "horizontal" ? "pan-y" : "pan-x"
          },
          children: e
        }
      )
    }
  );
}
nn.displayName = "Panel";
const uc = {
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
function fc({
  layout: e,
  panelConstraints: t,
  panelId: n,
  panelIndex: r
}) {
  let a, o;
  const s = e[n], l = t.find(
    (c) => c.panelId === n
  );
  if (l) {
    const c = l.maxSize, i = l.collapsible ? l.collapsedSize : l.minSize, d = [r, r + 1];
    o = Oe({
      layout: ut({
        delta: i - s,
        initialLayout: e,
        panelConstraints: t,
        pivotIndices: d,
        prevLayout: e
      }),
      panelConstraints: t
    })[n], a = Oe({
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
    valueMax: a,
    valueMin: o,
    valueNow: s
  };
}
function co({
  children: e,
  className: t,
  disabled: n,
  disableDoubleClick: r,
  elementRef: a,
  id: o,
  style: s,
  ...l
}) {
  const c = In(o), i = Tn({
    disabled: n,
    disableDoubleClick: r
  }), [d, u] = L({}), [f, m] = L("inactive"), [v, h] = L(!1), g = x(null), y = Rn(g, a), {
    disableCursor: w,
    id: S,
    orientation: b,
    registerSeparator: P,
    updateSeparatorProps: N
  } = En(), M = b === "horizontal" ? "vertical" : "horizontal";
  je(() => {
    const E = g.current;
    if (E !== null) {
      const R = {
        disabled: i.disabled,
        disableDoubleClick: i.disableDoubleClick,
        element: E,
        id: c
      }, I = P(R), k = Hi(
        (C) => {
          m(
            C.next.state !== "inactive" && C.next.hitRegions.some(
              (F) => F.separator === R
            ) ? C.next.state : "inactive"
          );
        }
      ), D = Sn(
        S,
        (C) => {
          const { derivedPanelConstraints: F, layout: B, separatorToPanels: X } = C.next, J = X.get(R);
          if (J) {
            const K = J[0], oe = J.indexOf(K);
            u(
              fc({
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
        k(), D(), I();
      };
    }
  }, [S, c, P, i]), $(() => {
    N(c, { disabled: n, disableDoubleClick: r });
  }, [n, r, c, N]);
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
      "data-testid": c,
      id: c,
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
co.displayName = "Separator";
const Mn = 30, kn = 65, ft = 50, mc = 100 - kn, pc = 100 - Mn;
function hc(e) {
  const t = Number(e);
  return Number.isFinite(t) ? Math.min(kn, Math.max(Mn, t)) : ft;
}
function An(e) {
  return 100 - e;
}
function He(e) {
  return `${e}%`;
}
const Nn = "reader-document", mt = "reader-assistant", lo = "retainpdf.reader.ai-split-layout.v1", gc = {
  [Nn]: An(ft),
  [mt]: ft
};
function xn(e) {
  const t = hc(e == null ? void 0 : e[mt]);
  return {
    [Nn]: An(t),
    [mt]: t
  };
}
function bc() {
  try {
    const e = JSON.parse(localStorage.getItem(lo) || "null");
    return xn(e);
  } catch {
    return gc;
  }
}
function yc(e) {
  try {
    localStorage.setItem(lo, JSON.stringify(xn(e)));
  } catch {
  }
}
function Ht(e, t) {
  const n = e == null ? void 0 : e.closest(".reader-react-root");
  if (!n) return;
  const r = xn(t);
  n.style.setProperty(
    "--reader-ai-split-width",
    `${r[mt]}vw`
  );
}
function vc() {
  const e = x(null), [t] = L(bc);
  Fe(() => {
    const a = e.current;
    return Ht(a, t), () => {
      var o;
      (o = a == null ? void 0 : a.closest(".reader-react-root")) == null || o.style.removeProperty("--reader-ai-split-width");
    };
  }, [t]);
  const n = A((a) => {
    Ht(e.current, a);
  }, []), r = A((a, o) => {
    Ht(e.current, a), o.isUserInteraction && yc(a);
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
          nn,
          {
            id: Nn,
            defaultSize: He(An(ft)),
            minSize: He(mc),
            maxSize: He(pc)
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
          nn,
          {
            id: mt,
            defaultSize: He(ft),
            minSize: He(Mn),
            maxSize: He(kn)
          }
        )
      ]
    }
  );
}
const Ne = 12, wc = 4;
function Ke(e, t, n) {
  if (typeof window > "u") return { x: e, y: t };
  const r = Math.min(n, window.innerWidth - Ne * 2), a = Math.max(Ne, window.innerWidth - r - Ne), o = Math.min(window.innerHeight * 0.9, 860), s = Math.max(Ne, window.innerHeight - o - Ne);
  return {
    x: Math.min(a, Math.max(Ne, e)),
    y: Math.min(s, Math.max(Ne, t))
  };
}
function yr(e) {
  if (typeof window > "u") return { x: 24, y: 72 };
  const t = Math.min(e, window.innerWidth - Ne * 2);
  return Ke(window.innerWidth - t - 20, 72, e);
}
function Sc(e, t) {
  try {
    const n = localStorage.getItem(e);
    if (!n) return yr(t);
    const r = JSON.parse(n);
    if (typeof r.x == "number" && typeof r.y == "number")
      return Ke(r.x, r.y, t);
  } catch {
  }
  return yr(t);
}
function Pc(e, t) {
  try {
    localStorage.setItem(e, JSON.stringify(t));
  } catch {
  }
}
function Ic({
  id: e,
  open: t,
  title: n,
  subtitle: r = "拖动标题可移动",
  titleIcon: a,
  storageKey: o,
  ariaLabel: s,
  className: l = "",
  width: c = 360,
  placement: i = "floating",
  showHeader: d = !0,
  onClose: u,
  toolbar: f,
  children: m
}) {
  const v = i === "workspace", h = i === "dock-right", g = h || v, [y, w] = L(() => Sc(o, c)), [S, b] = L(!1), P = x(null);
  $(() => {
    !t || g || w((T) => Ke(T.x, T.y, c));
  }, [g, t, c]), $(() => {
    if (!t || g) return;
    const T = () => w((E) => Ke(E.x, E.y, c));
    return window.addEventListener("resize", T), () => window.removeEventListener("resize", T);
  }, [g, t, c]), $(() => {
    if (!t) return;
    const T = (E) => {
      var I;
      if (E.key !== "Escape") return;
      const R = E.target;
      (I = R == null ? void 0 : R.closest) != null && I.call(R, "textarea, input, select, [contenteditable='true']") || (E.preventDefault(), u());
    };
    return window.addEventListener("keydown", T), () => window.removeEventListener("keydown", T);
  }, [t, u]);
  const N = A((T) => {
    var E, R;
    g || T.button === 0 && ((R = (E = T.target) == null ? void 0 : E.closest) != null && R.call(E, "button") || (T.currentTarget.setPointerCapture(T.pointerId), P.current = {
      pointerId: T.pointerId,
      startX: T.clientX,
      startY: T.clientY,
      originX: y.x,
      originY: y.y,
      moved: !1
    }, b(!0)));
  }, [g, y.x, y.y]), M = A((T) => {
    const E = P.current;
    if (!E || E.pointerId !== T.pointerId) return;
    const R = T.clientX - E.startX, I = T.clientY - E.startY;
    !E.moved && Math.hypot(R, I) < wc || (E.moved = !0, w(Ke(E.originX + R, E.originY + I, c)));
  }, [c]), _ = A((T) => {
    const E = P.current;
    if (!(!E || E.pointerId !== T.pointerId)) {
      P.current = null, b(!1);
      try {
        T.currentTarget.releasePointerCapture(T.pointerId);
      } catch {
      }
      E.moved && w((R) => {
        const I = Ke(R.x, R.y, c);
        return Pc(o, I), I;
      });
    }
  }, [o, c]);
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
            onPointerDown: N,
            onPointerMove: M,
            onPointerUp: _,
            onPointerCancel: _,
            children: [
              g ? null : /* @__PURE__ */ p("div", { className: "reader-notes-panel-drag", "aria-hidden": "true", children: /* @__PURE__ */ p(Oo, { size: 14, strokeWidth: 2.25 }) }),
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
function Rc({
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
function Tc({
  open: e,
  groups: t,
  count: n,
  onClose: r,
  onJump: a,
  onUpdateNote: o,
  onRemove: s,
  onExport: l
}) {
  const [c, i] = L(!1);
  return /* @__PURE__ */ p(
    Ic,
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
          Rc,
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
function Ec({
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
function Mc({
  loading: e,
  failed: t,
  text: n,
  percent: r,
  regionsError: a = !1,
  metadataError: o = !1
}) {
  return !e && !t ? /* @__PURE__ */ p(Ec, { regionsFailed: a, metadataFailed: o }) : /* @__PURE__ */ z(At, { children: [
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
function Ac({
  selection: e,
  onDismiss: t,
  onAskAi: n,
  onAddNote: r
}) {
  const [a, o] = L(!1), s = e ? e.selectionType === "text" ? `${e.pane}:${e.page}:${e.quote}` : `${e.region.itemId}:${e.pane}` : "";
  if ($(() => o(!1), [s]), !e)
    return null;
  const l = typeof window < "u" ? window.innerWidth : 800, c = typeof window < "u" ? window.innerHeight : 600, i = e.rect.left + e.rect.width / 2, d = 170, u = Math.min(Math.max(16 + d, i), l - 16 - d), f = e.rect.top > 72, m = f ? Math.max(12, e.rect.top - 8) : Math.min(c - 12, e.rect.top + e.rect.height + 8), v = f ? "above" : "below", h = e.pane === "translated" ? "译文" : "原文", g = e.selectionType === "text" ? "text" : e.kind, y = e.selectionType === "text" ? e.quote : Tr(e.region, e.pane), w = g === "formula" ? "公式" : g === "table" ? "表格" : g === "figure" ? "图片" : g === "text" ? "文字" : "区域", S = g === "formula" ? Ao(y) : y, b = g === "formula" ? Fo : g === "table" ? $o : g === "text" ? jo : Uo;
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
                  a ? /* @__PURE__ */ p(Bo, { size: 15, strokeWidth: 2.4, "aria-hidden": !0 }) : /* @__PURE__ */ p(Ho, { size: 15, strokeWidth: 2.2, "aria-hidden": !0 }),
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
                  /* @__PURE__ */ p(un, { size: 15, strokeWidth: 2.2, "aria-hidden": !0 }),
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
function Nc(e) {
  if (!(e instanceof HTMLElement)) return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
function xc() {
  const [e, t] = L(!1), n = ln(), r = x(null);
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
      if (o.defaultPrevented || o.metaKey || o.ctrlKey || o.altKey || Nc(o.target)) return;
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
        children: /* @__PURE__ */ p(Wo, { className: "reader-react-shortcuts-icon", size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
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
          /* @__PURE__ */ p("div", { className: "reader-react-shortcuts-body", children: Bs.map((a) => /* @__PURE__ */ z("section", { className: "reader-react-shortcuts-group", children: [
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
const Lc = Object.freeze([
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
]), Cc = ["source", "sideBySide", "translated"], zc = { source: "", translated: "", sideBySide: "" };
function Dc(e) {
  if (e.sourceOnly || !e.jobId) {
    const t = it(e.sourceUrl), n = it(e.translatedUrl);
    return {
      source: t,
      translated: n,
      // sideBySide requires dedicated artifact; no fallback to source url
      sideBySide: ""
    };
  }
  return ca({
    jobId: e.jobId,
    jobPayload: e.jobPayload,
    manifestPayload: e.manifestPayload
  });
}
function _c(e) {
  const [t, n] = L(() => /* @__PURE__ */ new Set()), r = q(
    () => e ? Dc(e) : zc,
    [e]
  ), a = q(
    () => Cc.filter((s) => !(e != null && e.sourceOnly && s !== "source")),
    [e == null ? void 0 : e.sourceOnly]
  ), o = A(async (s) => {
    if (!e) return;
    const l = it(r[s]);
    if (!(!l || t.has(s)))
      try {
        const c = e.jobId ? ia(s, {
          jobId: e.jobId,
          jobPayload: e.jobPayload,
          manifestPayload: e.manifestPayload
        }) : `${e.sourceOnly ? "document" : "reader"}-${s}.pdf`;
        await la(
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
        da(i), n((d) => {
          const u = new Set(d);
          return u.delete(s), u;
        });
      }
  }, [r, t, e]);
  return { urls: r, downloadItems: a, busyActions: t, handleDownload: o };
}
function Oc(e) {
  const [t, n] = L(!1), r = A(() => n(!1), []), a = A(() => n((o) => !o), []);
  return $(() => {
    if (!t) return;
    const o = (l) => {
      const c = e.current;
      c && l.target instanceof Node && !c.contains(l.target) && n(!1);
    }, s = (l) => {
      l.key === "Escape" && (l.preventDefault(), n(!1));
    };
    return document.addEventListener("mousedown", o), window.addEventListener("keydown", s), () => {
      document.removeEventListener("mousedown", o), window.removeEventListener("keydown", s);
    };
  }, [t, e]), { open: t, setOpen: n, closeMenu: r, toggleMenu: a };
}
const uo = "retainpdf.reader.fab.pos.v1", kt = 52, We = 12, Fc = 6;
function st(e, t) {
  if (typeof window > "u")
    return { x: e, y: t };
  const n = Math.max(We, window.innerWidth - kt - We), r = Math.max(We, window.innerHeight - kt - We);
  return {
    x: Math.min(n, Math.max(We, e)),
    y: Math.min(r, Math.max(We, t))
  };
}
function vr() {
  return typeof window > "u" ? { x: 24, y: 120 } : st(
    window.innerWidth - kt - 20,
    window.innerHeight - kt - 88
  );
}
function $c() {
  try {
    const e = localStorage.getItem(uo);
    if (!e) return vr();
    const t = JSON.parse(e);
    if (typeof t.x == "number" && typeof t.y == "number")
      return st(t.x, t.y);
  } catch {
  }
  return vr();
}
function jc(e) {
  try {
    localStorage.setItem(uo, JSON.stringify(e));
  } catch {
  }
}
function Uc(e) {
  return typeof window < "u" && e.y > window.innerHeight * 0.55;
}
function Bc(e = {}) {
  const { onDragStart: t, onActivate: n } = e, [r, a] = L(() => $c()), o = x(null);
  $(() => {
    const i = () => a((d) => st(d.x, d.y));
    return window.addEventListener("resize", i), () => window.removeEventListener("resize", i);
  }, []);
  const s = A((i) => {
    i.button === 0 && (i.currentTarget.setPointerCapture(i.pointerId), o.current = {
      pointerId: i.pointerId,
      startX: i.clientX,
      startY: i.clientY,
      originX: r.x,
      originY: r.y,
      moved: !1
    });
  }, [r.x, r.y]), l = A((i) => {
    const d = o.current;
    if (!d || d.pointerId !== i.pointerId) return;
    const u = i.clientX - d.startX, f = i.clientY - d.startY;
    !d.moved && Math.hypot(u, f) < Fc || (d.moved || (d.moved = !0, t == null || t()), a(st(d.originX + u, d.originY + f)));
  }, [t]), c = A((i) => {
    const d = o.current;
    if (!(!d || d.pointerId !== i.pointerId)) {
      o.current = null;
      try {
        i.currentTarget.releasePointerCapture(i.pointerId);
      } catch {
      }
      if (d.moved) {
        a((u) => {
          const f = st(u.x, u.y);
          return jc(f), f;
        });
        return;
      }
      n == null || n();
    }
  }, [n]);
  return {
    pos: r,
    openUp: Uc(r),
    onPointerDown: s,
    onPointerMove: l,
    onPointerUp: c
  };
}
const Hc = {
  source: Er,
  sideBySide: Mr,
  translated: kr
}, Wc = {
  source: "原文",
  sideBySide: "对照",
  translated: "译文"
};
function Jc({ onClose: e }) {
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
function Kc({
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
function qc({
  urls: e,
  items: t,
  busyActions: n,
  onDownload: r
}) {
  return /* @__PURE__ */ z("div", { className: "reader-fab-section", role: "group", "aria-label": "下载", children: [
    /* @__PURE__ */ z("div", { className: "reader-fab-section-head", children: [
      /* @__PURE__ */ p(Jo, { size: 12, strokeWidth: 2.5, "aria-hidden": !0 }),
      /* @__PURE__ */ p("span", { children: "下载 PDF" })
    ] }),
    /* @__PURE__ */ p("div", { className: "reader-fab-download-grid", children: t.map((a, o) => {
      const s = wo[a], l = it(e[a]), c = n.has(a), i = !!l && !c, d = i ? "" : So(a, e), u = Hc[a];
      return /* @__PURE__ */ z(
        "button",
        {
          type: "button",
          role: "menuitem",
          id: `reader-fab-download-${a}`,
          className: `reader-fab-chip${c ? " is-busy" : ""}${i ? "" : " is-disabled"}`,
          disabled: !i,
          title: i ? `下载${s.label}` : d,
          onClick: () => void r(a),
          style: { "--fab-i": o },
          children: [
            /* @__PURE__ */ p("span", { className: "reader-fab-chip-icon", "aria-hidden": "true", children: /* @__PURE__ */ p(u, { size: 16, strokeWidth: 2 }) }),
            /* @__PURE__ */ p("span", { className: "reader-fab-chip-label", children: Wc[a] }),
            /* @__PURE__ */ p("span", { className: "reader-fab-chip-state", children: c ? "…" : i ? "↓" : "—" })
          ]
        },
        a
      );
    }) }),
    t.every((a) => !it(e[a])) ? /* @__PURE__ */ p("p", { className: "reader-fab-empty", children: "产物尚未就绪" }) : null
  ] });
}
const Vc = {
  favorites: Ko,
  markdown: Ar,
  ai: un,
  notes: xt
}, Gc = Lc;
function Yc(e) {
  const { activeTool: t, noteCount: n, onToggleTool: r } = e, a = ht(), o = e.sourceOnly ?? (a == null ? void 0 : a.sourceOnly) ?? !1, s = e.download ?? (a == null ? void 0 : a.download), l = x(null), c = ln(), { open: i, setOpen: d, closeMenu: u, toggleMenu: f } = Oc(l), { pos: m, openUp: v, onPointerDown: h, onPointerMove: g, onPointerUp: y } = Bc({
    onDragStart: u,
    onActivate: f
  }), { urls: w, downloadItems: S, busyActions: b, handleDownload: P } = _c(s), N = A((M) => {
    r(M), d(!1);
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
              /* @__PURE__ */ p(Jc, { onClose: u }),
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
              Gc.map((M, _) => {
                const T = Vc[M.id], E = t === M.id, R = M.needsJob && o;
                let I = E ? M.subOpen : M.subIdle;
                return R && (I = "需打开任务阅读"), /* @__PURE__ */ p(
                  Kc,
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
                qc,
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
function Zc(e) {
  const t = ht(), n = Ri(), { mode: r = "compare", modeControls: a } = e, o = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? pt, s = e.onZoomChange ?? (t == null ? void 0 : t.onZoomChange) ?? (() => {
  }), l = e.currentPage ?? (n == null ? void 0 : n.currentPage) ?? 1, c = e.numPages ?? (n == null ? void 0 : n.numPages) ?? 0, i = e.onGoToPage ?? (t == null ? void 0 : t.goToPage), d = qa(o), u = o > Cr + 1e-3, f = o < zr - 1e-3, m = ot(), v = "50%（半屏，对照铺满）", [h, g] = L(!1), [y, w] = L(`${l}`);
  $(() => {
    h || w(`${Math.min(Math.max(l, 1), Math.max(c, 1))}`);
  }, [l, c, h]);
  const S = () => {
    if (g(!1), !i || c <= 0)
      return;
    const b = Number(`${y}`.trim());
    i(Mt(b, c));
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
    /* @__PURE__ */ p("div", { className: "reader-react-hud-group reader-react-hud-help", "aria-label": "帮助", children: /* @__PURE__ */ p(xc, {}) })
  ] });
}
function Ln(e) {
  const t = `${e.jobId || ""}`.trim(), n = `${e.documentId || ""}`.trim();
  return n ? `retainpdf.reader.notes.v1:doc:${n}` : t ? `retainpdf.reader.notes.v1:job:${t}` : "retainpdf.reader.notes.v1:anonymous";
}
function Xc() {
  return typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function Qc(e) {
  return {
    pageIdx: Number(e.page) - 1,
    quoteText: e.quote,
    note: e.note,
    createdAt: e.createdAt
  };
}
function el(e) {
  return Lo(e, (t) => t.page);
}
function tl(e) {
  return zo(e, (t) => t.page).map((t) => ({ page: t.pageIdx, items: t.items }));
}
function nl(e, t) {
  return Co({
    title: e,
    annotations: t.map(Qc)
  });
}
function wr(e) {
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
function Sr(e) {
  if (typeof localStorage > "u")
    return [];
  try {
    const t = Ln(e), n = wr(localStorage.getItem(t)), r = `${e.jobId || ""}`.trim(), a = `retainpdf.reader.notes.v1:job:${r}`;
    if (!r || t === a) return n;
    const o = wr(localStorage.getItem(a));
    if (!o.length) return n;
    const s = new Set(n.map((i) => i.id)), l = [...n, ...o.filter((i) => !s.has(i.id))], c = JSON.stringify(l);
    try {
      localStorage.setItem(t, c), localStorage.getItem(t) === c && localStorage.removeItem(a);
    } catch {
    }
    return l;
  } catch {
    return [];
  }
}
function rl(e, t) {
  if (!(typeof localStorage > "u"))
    try {
      localStorage.setItem(Ln(e), JSON.stringify(t));
    } catch (n) {
      console.warn("[reader-notes] persist failed", n);
    }
}
function ol(e, t = {}) {
  const n = q(
    () => ({
      jobId: `${e.jobId || ""}`.trim(),
      documentId: `${e.documentId || ""}`.trim()
    }),
    [e.jobId, e.documentId]
  ), r = Ln(n), [a, o] = L(() => ({
    key: r,
    notes: Sr(n)
  })), s = a.key === r ? a.notes : [], l = A((v) => {
    o((h) => ({
      key: h.key,
      notes: typeof v == "function" ? v(h.notes) : v
    }));
  }, []), c = t.onAfterAdd;
  $(() => {
    o({ key: r, notes: Sr(n) });
  }, [n, r]), $(() => {
    a.key === r && rl(n, a.notes);
  }, [n, r, a]);
  const i = A((v) => {
    const h = `${v.quote || ""}`.trim();
    if (!h)
      return null;
    const g = {
      id: Xc(),
      page: Math.max(1, Math.floor(Number(v.page) || 1)),
      pane: v.pane === "translated" ? "translated" : "source",
      quote: h,
      note: `${v.note || ""}`.trim(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return l((y) => el([g, ...y])), c == null || c(), g;
  }, [c]), d = A((v, h) => {
    const g = `${h || ""}`.trim();
    l((y) => y.map((w) => w.id === v ? { ...w, note: g } : w));
  }, []), u = A((v) => {
    l((h) => h.filter((g) => g.id !== v));
  }, []), f = A(async (v = "") => {
    var g, y;
    const h = nl(v, s);
    try {
      return await ((y = (g = navigator.clipboard) == null ? void 0 : g.writeText) == null ? void 0 : y.call(g, h)), !0;
    } catch (w) {
      return console.error("[reader-notes] copy failed", w), !1;
    }
  }, [s]), m = q(() => tl(s), [s]);
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
const rn = "download-toast";
function al({
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
function sl(e = {}) {
  const {
    visible: t = !1,
    title: n = "下载中",
    status: r = "正在准备...",
    meta: a = "等待响应...",
    percent: o = NaN,
    tone: s = "progress"
  } = e;
  if (!t) {
    Jt.dismiss(rn);
    return;
  }
  Jt.custom(
    () => /* @__PURE__ */ p(al, { title: n, status: r, meta: a, percent: o, tone: s }),
    { id: rn, duration: 1 / 0 }
  );
}
function il() {
  const e = A((t) => {
    t && (t.setState = sl, t.hide = () => Jt.dismiss(rn));
  }, []);
  return /* @__PURE__ */ z(At, { children: [
    /* @__PURE__ */ p(Do, { position: "bottom-right" }),
    /* @__PURE__ */ p("download-toast", { style: { display: "none" }, "aria-hidden": "true", ref: e })
  ] });
}
const cl = dn(() => import("./ReaderFavoritesPanel-BezA4k4y.js").then((e) => ({ default: e.ReaderFavoritesPanel }))), ll = dn(() => import("./ReaderMarkdownPanel-OkxQcqR8.js").then((e) => ({ default: e.ReaderMarkdownPanel }))), dl = dn(() => import("./ReaderAiPanel-Du0htwaV.js").then((e) => ({ default: e.ReaderAiPanel })));
function Wt(e) {
  const t = x(!1);
  return e && (t.current = !0), t.current;
}
function ul(e) {
  return "workspace";
}
function fl(e) {
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
function ml(e, t) {
  return e === "compare" ? t ? !0 : null : !1;
}
function Pr(e, t) {
  var n, r, a, o;
  return e === "compare" ? null : (t == null ? void 0 : t.assistantPanel) === "markdown" || (t == null ? void 0 : t.assistantPanel) === "ai" ? t.assistantPanel : ((n = t == null ? void 0 : t.splitLayout) == null ? void 0 : n.left) === "ai" || ((r = t == null ? void 0 : t.splitLayout) == null ? void 0 : r.right) === "ai" ? "ai" : ((a = t == null ? void 0 : t.splitLayout) == null ? void 0 : a.left) === "markdown" || ((o = t == null ? void 0 : t.splitLayout) == null ? void 0 : o.right) === "markdown" ? "markdown" : null;
}
function pl() {
  const e = js(), { boot: t, panes: n, sessionFiles: r, tools: a, session: o } = e, [s, l] = L(() => Pr(e.mode, Ee(e.viewStateKey))), [c, i] = L(null), [d, u] = L(null), [f, m] = L(!1), v = x(e.viewStateKey), h = x(null), g = s !== null, y = e.liveTranslationAvailable || e.liveTranslation.pagesByPage.size > 0, w = fl({
    mode: e.mode,
    sourceOnly: e.sourceOnly,
    translatedUrl: r.translatedUrl,
    overlayContentAvailable: y,
    liveTranslationVisible: f,
    assistantOpen: g,
    assistantPdfPane: c
  }), S = w.sourceViewOnly, b = w.visibleMode, [P, N] = L(!1), M = A(() => N(!0), []), _ = A(() => N((j) => !j), []), T = ol(
    { jobId: o.jobId, documentId: o.documentId },
    { onAfterAdd: M }
  ), E = A((j) => {
    T.addFromQuote(j), e.clearSelection();
  }, [T.addFromQuote, e.clearSelection]), R = A((j) => {
    e.goToPage(j.page, j.pane === "translated" ? "translated" : "source");
  }, [e.goToPage]), I = A(
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
        l(Pr(e.mode, j)), i(null);
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
  const k = s || (e.mode === "compare" ? "compare" : "reading"), D = Wt(a.isOpen("favorites")), C = Wt(s === "markdown"), F = Wt(s === "ai");
  Js({
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
  const B = A(() => {
    a.close();
  }, [a]), X = A(() => {
    l(null), i(null), u(null);
  }, []), J = A((j) => {
    const ie = b === "translated" ? "translated" : "source";
    e.jumpToAnchor(j, ie);
  }, [e.jumpToAnchor, b]), K = A((j) => {
    o.refreshCommittedDocument(j);
  }, [o.refreshCommittedDocument]), oe = A((j) => {
    a.close(), i(null);
    const ie = ml(j, e.liveTranslationAvailable);
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
  ), [y, w.showSource, f]), U = A((j) => {
    l(j), j !== "ai" && u(null);
  }, []), G = A((j) => {
    if (j === "notes") {
      _();
      return;
    }
    if (j === "markdown" || j === "ai") {
      s === j ? (l(null), i(null), u(null)) : (l(j), i(null), j !== "ai" && u(null));
      return;
    }
    a.toggle(j);
  }, [s, _, a]), Q = P ? "notes" : s ?? a.active, ee = A((j) => {
    const ie = j.pane === "translated" && !S ? "translated" : "source";
    u(j), l("ai"), i(ie), e.clearSelection();
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
    $a,
    `is-workspace-${k}`,
    g ? "is-assistant-open" : "",
    w.overlayOnSource ? "is-live-translation-overlay" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ p(Ii, { value: de, hud: he, children: /* @__PURE__ */ z("div", { className: pe, "data-reader-engine": "react-pdf", "data-reader-workspace": k, children: [
    /* @__PURE__ */ p(Mc, { loading: t.loading, failed: t.failed, text: t.text, percent: t.percent, regionsError: !!o.readerErrors.regions, metadataError: !!o.readerErrors.metadata }),
    /* @__PURE__ */ p(Zs, { onBeforeClose: o.prepareClose }),
    /* @__PURE__ */ p(
      Li,
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
    /* @__PURE__ */ p(Ci, { active: s }),
    g ? /* @__PURE__ */ p(vc, {}) : null,
    e.showHud ? /* @__PURE__ */ p(Yc, { activeTool: Q, noteCount: T.count, onToggleTool: G }) : null,
    /* @__PURE__ */ p(ki, { paneComposition: w, markdownSplit: s === "markdown", assistantSplit: g, liveTranslation: e.liveTranslation, sourcePaneAction: se }),
    e.showHud ? /* @__PURE__ */ p(
      Zc,
      {
        mode: b,
        modeControls: null
      }
    ) : null,
    /* @__PURE__ */ z(go, { fallback: null, children: [
      D ? /* @__PURE__ */ p(cl, { open: a.isOpen("favorites"), jobId: o.jobId, documentId: o.documentId, onClose: B, onJumpPage: e.goToPage }) : null,
      C ? /* @__PURE__ */ p(ll, { open: s === "markdown", jobId: o.jobId, sourceOnly: e.sourceOnly, layout: "workspace", side: "right", onClose: X }) : null,
      F ? /* @__PURE__ */ p(dl, { open: s === "ai", jobId: o.jobId, documentId: o.documentId, sessionIdentity: o.sessionIdentity, layout: ul(e.mode), side: "right", selectionContext: d, onClearSelectionContext: () => u(null), onClose: X, onJumpCitation: J, onDocumentCommitted: K }, o.documentId || o.jobId || "reader-ai-pending") : null
    ] }),
    /* @__PURE__ */ p(
      Tc,
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
    /* @__PURE__ */ p(Ac, { selection: e.selection, onDismiss: e.clearSelection, onAskAi: ee, onAddNote: E }),
    /* @__PURE__ */ p(il, {})
  ] }) });
}
function $l() {
  return /* @__PURE__ */ p(pl, {});
}
export {
  mn as A,
  $l as R,
  pl as a,
  Ic as b,
  Fl as c,
  xl as d,
  Nl as e,
  Ol as f,
  Cl as g,
  Ll as h,
  zl as i,
  _l as j,
  Dl as r
};
//# sourceMappingURL=ReaderApp-J9Tb4Zsf.js.map
