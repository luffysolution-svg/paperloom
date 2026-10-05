var Cn = (e) => {
  throw TypeError(e);
};
var Ln = (e, t, n) => t.has(e) || Cn("Cannot " + n);
var Qe = (e, t, n) => (Ln(e, t, "read from private field"), n ? n.call(e) : t.get(e)), zn = (e, t, n) => t.has(e) ? Cn("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, n), Dn = (e, t, n, r) => (Ln(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n);
import { jsxs as z, jsx as p, Fragment as kt } from "react/jsx-runtime";
import { useMemo as J, useState as C, useEffect as O, useCallback as N, useRef as x, useLayoutEffect as Oe, memo as on, forwardRef as mo, useImperativeHandle as an, createContext as sn, useContext as cn, useSyncExternalStore as po, useId as ln, Suspense as ho, lazy as dn } from "react";
import { requireAdapter as ye, getReaderAdapters as le } from "./adapters.js";
import { resolveReaderDownloadName as go, createReaderServerFavoritesPort as bo, resolveReaderDownloadUrls as yo, READER_PROGRESS_COPY as Re, trimString as it, READER_DOWNLOAD_ACTIONS as vo, disabledReason as wo } from "./runtime/state.js";
import { d as So } from "./ask-answerer-GNQdzitl.js";
import "@retainpdf/api/conversations";
import { r as Po, b as Io } from "./page-config-Ct7qR5rm.js";
import { c as Ro, n as To, f as Dt, h as _n, a as Eo, b as Mo, i as Sr, p as Nt, g as Pr, r as Ir, j as Fn, e as Ao } from "./reader-regions-DsePY7B_.js";
import { i as ko, c as No } from "./live-translation-CbniFg2b.js";
import { sortByPageAndCreatedAt as xo, buildAnnotationsMarkdown as Co, groupByPageAndCreatedAt as Lo } from "./runtime/content.js";
import { toast as Jt, Toaster as zo } from "sonner";
import { X as Xe, Radio as Do, FileText as Rr, Columns2 as Tr, Languages as Er, FileCode2 as Mr, Sparkles as un, GripHorizontal as _o, StickyNote as xt, Sigma as Fo, Table2 as Oo, Type as $o, Image as jo, Check as Uo, Copy as Bo, Keyboard as Ho, Download as Wo, Bookmark as Jo } from "lucide-react";
import { pdfjs as qo, Page as Vo, Document as Ko } from "react-pdf";
import { e as Go, m as Yo, a as Zo } from "./markdown-math-XkF5urpn.js";
const Xo = (...e) => {
  var t, n;
  return ((n = (t = le()) == null ? void 0 : t.isMockMode) == null ? void 0 : n.call(t, ...e)) ?? !1;
}, Qo = "", ea = Object.freeze({
  progress: "retainpdf-reader-progress"
}), ta = (e) => {
  var t, n;
  return ((n = (t = le()) == null ? void 0 : t.resolveResourceUrl) == null ? void 0 : n.call(t, e)) ?? e;
}, Nl = (...e) => {
  var n;
  return (((n = le()) == null ? void 0 : n.fetchProtected) ?? fetch)(...e);
}, ke = () => ye("defaultReaderDataPort"), On = () => ye("defaultReaderPageConfigPort"), xl = {
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
}, Ar = {
  messageTargetOrigin: () => On().messageTargetOrigin(),
  readerJobId: () => On().readerJobId()
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
}, Cl = () => {
  var e;
  return ((e = le()) == null ? void 0 : e.aiOperations) ?? null;
}, Ll = () => {
  var e;
  return ((e = le()) == null ? void 0 : e.conversations) ?? null;
}, zl = () => {
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
}, ca = (...e) => ye("downloadProtectedResource")(...e), la = (...e) => ye("failDownloadToast")(...e), Dl = (e, t) => ye("resolveMarkdownAssetUrl")(e, t), _l = (e = {}) => {
  const t = le();
  return So({
    apiPrefix: (t == null ? void 0 : t.apiPrefix) || "/api/v1",
    ask: t == null ? void 0 : t.askDocumentAi,
    documentByJobId: t == null ? void 0 : t.fetchDocumentByJobId,
    ...e
  });
}, mn = "/api/v1", Fl = (e = mn, t = {}) => {
  var n;
  return ye("fetchFavorites")(
    ((n = le()) == null ? void 0 : n.apiPrefix) ?? e,
    t
  );
};
function Ol(e = {}) {
  const t = le();
  return bo({
    apiPrefix: (t == null ? void 0 : t.apiPrefix) ?? mn,
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
  }, [t, n] = C(e);
  return O(() => {
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
function ua() {
  const e = da(), t = J(() => aa(Ar), [e]), n = J(() => oa(), [e]), r = t || n ? `job:${t}|document:${n}` : `location:${e}`;
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
  } = e, [c, i] = C({
    documentId: "",
    jobId: ""
  }), [d, u] = C({
    documentId: "",
    jobId: ""
  }), f = c.documentId === t ? c.jobId : "", m = d.documentId === t ? d.jobId : "", v = n || f, [h, b] = C({
    jobId: "",
    documentId: ""
  }), y = h.jobId === v ? h.documentId : "", P = t || y, w = !!t && !v, [g, S] = C(null), k = (g == null ? void 0 : g.sessionIdentity) === r && g.documentId === P ? g : null, M = w || !!k, _ = N((E) => {
    const R = `${E.documentId || ""}`.trim();
    if (!R || o.current && o.current !== R) return;
    if (!o.current && s.current)
      b({
        jobId: s.current,
        documentId: R
      });
    else if (!o.current)
      return;
    const I = `${E.revision || ""}`.trim() || `${Date.now()}`;
    S({
      documentId: R,
      revision: I,
      sessionIdentity: a.current
    }), l();
  }, []);
  O(() => {
    S((E) => E && E.sessionIdentity !== r ? null : E);
  }, [r]);
  const T = N((E) => {
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
        b((R) => R.jobId === E.jobId && R.documentId === E.documentId ? R : { jobId: E.jobId, documentId: E.documentId });
        break;
      case "committed-source":
        S({
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
    setResolvedJobDocument: b,
    jobDocumentId: y,
    documentId: P,
    sourceOnly: w,
    committedDocumentSource: g,
    setCommittedDocumentSource: S,
    activeCommittedDocumentSource: k,
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
    const c = `${l || ""}`.trim();
    if (c) return c;
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
function qt({
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
      Ar.messageTargetOrigin()
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
  }), qt({ percent: t, text: n, stage: r });
}
function ba(e) {
  const {
    sessionJobId: t,
    sessionIdentity: n,
    sessionIdentityRef: r,
    sessionJobIdRef: a,
    sessionEpochRef: o,
    closingRef: s
  } = e, [l, c] = C(null), [i, d] = C(null), [u, f] = C(""), [m, v] = C(0), h = u === n ? l : null, b = u === n ? i : null, y = $n(h), P = ma.has(y), w = N(() => {
    v((T) => T + 1);
  }, []), g = N((T) => {
    c(T.jobPayload), d(T.manifestPayload), f(T.sessionIdentity);
  }, []), S = N((T) => {
    c(null), d(null), f(T);
  }, []), k = x(""), M = x(""), _ = N(async () => {
    const T = a.current;
    if (!T || k.current === T) return;
    const E = fn().loadJobPayload;
    if (typeof E != "function") return;
    const R = o.current.value;
    k.current = T;
    try {
      const I = await E(T);
      if (s.current || o.current.value !== R || a.current !== T || !I || typeof I != "object")
        return;
      const A = $n(I);
      c(I), f(r.current), A === "succeeded" && M.current !== T && (M.current = T, v((D) => D + 1));
    } catch {
    } finally {
      k.current === T && (k.current = "");
    }
  }, []);
  return O(() => {
    M.current = "";
  }, [n]), O(() => {
    if (!t || P || !h) return;
    const T = window.setInterval(() => {
      _();
    }, 1e3);
    return () => window.clearInterval(T);
  }, [P, _, h, t]), {
    jobPayload: l,
    setJobPayload: c,
    manifestPayload: i,
    setManifestPayload: d,
    payloadSessionIdentity: u,
    setPayloadSessionIdentity: f,
    scopedJobPayload: h,
    scopedManifestPayload: b,
    jobStatus: y,
    jobTerminal: P,
    jobRefreshRevision: m,
    refreshJobArtifacts: w,
    refreshJobStatus: _,
    publishPayload: g,
    clearPayload: S
  };
}
function Vt(e) {
  document.body.classList.remove(
    "reader-mode-source",
    "reader-mode-translated",
    "reader-mode-compare"
  ), document.body.classList.add(`reader-mode-${e}`);
}
function ya(e, t) {
  e(t), Vt(t);
}
function va(e) {
  const [t, n] = C(e ? "source" : "compare"), r = N((o) => {
    e && o !== "source" || (n(o), Vt(o));
  }, [e]), a = N((o) => {
    ya(n, o);
  }, []);
  return O(() => (e && document.documentElement.classList.add("reader-source-only"), Vt(t), () => {
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
function Kt(e, t) {
  ve.delete(e), ve.set(e, t);
}
function Ea(e) {
  if (ve.size < Ta) return;
  const t = ve.keys().next().value;
  t && ve.delete(t);
}
function _t(e) {
  const t = `${e || ""}`.trim();
  if (!t || !ve.has(t)) return null;
  const n = ve.get(t);
  return Kt(t, n), n;
}
async function kr(e, t = ct().fetchProtected, n = {}) {
  const r = `${e || ""}`.trim();
  if (!r)
    return null;
  if (ve.has(r)) {
    const l = ve.get(r);
    return Kt(r, l), l;
  }
  const a = await t(r, { signal: n.signal });
  if (!a.ok) {
    const l = new Error(`读取 PDF 失败 (${a.status})`);
    throw l.status = a.status, l;
  }
  const o = await a.arrayBuffer(), s = { data: new Uint8Array(o) };
  return ve.has(r) ? Kt(r, s) : (Ea(), ve.set(r, s)), s;
}
function Ma(e = "", t = null) {
  const [n, r] = C(
    () => t || _t(e)
  ), [a, o] = C(
    () => !!`${e || ""}`.trim() && !t && !_t(e)
  ), [s, l] = C("");
  return O(() => {
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
    return o(!0), l(""), r(null), kr(c).then((u) => {
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
  const l = await kr(t, ct().fetchProtected, {
    signal: o.signal
  });
  return o.isInactive() ? null : (Rt(s, a, n, "download"), l);
}
async function ka(e) {
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
function Na(e) {
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
    closingRef: b,
    activeLoadAbortRef: y
  } = e, [P, w] = C(""), [g, S] = C(""), [k, M] = C(null), [_, T] = C(null), [E, R] = C(!1), [I, A] = C(""), [D, L] = C([]), [$, B] = C(() => ({
    source: null,
    translated: null
  })), [Y, re] = C(
    vt
  ), [oe, ne] = C({
    loading: !0,
    percent: 4,
    text: Re.boot,
    stage: "progress",
    failed: !1
  });
  return O(() => {
    const se = new AbortController(), U = h.current.value, V = Aa({
      sessionEpochRef: h,
      closingRef: b,
      abort: se,
      sessionEpoch: U
    });
    y.current = se;
    const Z = fn();
    if (b.current)
      return se.abort(), () => {
        y.current === se && (y.current = null);
      };
    function X(Q, q) {
      V.markFailed(), ne({
        loading: !1,
        percent: 100,
        text: Q,
        stage: "failed",
        failed: !0
      }), qt({ percent: 100, text: q, stage: "failed" });
    }
    function de() {
      R(!0), ne({
        loading: !1,
        percent: 100,
        text: Re.ready,
        stage: "ready",
        failed: !1
      }), qt({ percent: 100, text: Re.ready, stage: "ready" });
    }
    function he() {
      return i != null && i.documentId ? jn(
        i.documentId,
        i.revision
      ) : Xo() ? Qo : Z.resolveResourceUrl(`/api/v1/documents/${encodeURIComponent(r)}/source.pdf`);
    }
    async function pe() {
      let Q = { activeJobId: "", activeVersionId: "" };
      try {
        const ge = await Z.fetchProtected(
          Z.resolveResourceUrl(`/api/v1/documents/${encodeURIComponent(r)}`)
        );
        if (ge != null && ge.ok) {
          const Le = await ge.json().catch(() => null);
          Q = wa(Le);
        }
      } catch {
      }
      const q = Sa({
        link: Q,
        rejectedDocumentJobId: o,
        hasCommittedSource: !!i
      });
      if (q.kind === "follow-active-job") {
        if (V.isInactive()) return;
        d({
          type: "resolved-document-job",
          documentId: r,
          jobId: q.jobId
        }), q.activeVersionId ? (i || d({
          type: "committed-source",
          documentId: r,
          revision: q.activeVersionId,
          sessionIdentity: c
        }), m("source")) : m("compare");
        return;
      }
      if (q.kind === "open-committed-source") {
        if (V.isInactive()) return;
        d({
          type: "committed-source",
          documentId: r,
          revision: q.revision,
          sessionIdentity: c
        }), m("source");
        return;
      }
      const ae = he();
      if (V.isInactive()) return;
      w(ae), S(""), A(""), f(c);
      const Pe = await Gt({
        url: ae,
        label: "正在下载原文 PDF…",
        percentStart: 30,
        percentEnd: 85,
        fence: V,
        setBoot: ne
      });
      if (!V.isInactive()) {
        if (!Pe) {
          X("源文件不可用：该文档没有可读取的源 PDF。", "源文件下载失败");
          return;
        }
        M(Pe), de();
      }
    }
    async function j() {
      var yt;
      const Q = await ((yt = Z.loadSessionSnapshot) == null ? void 0 : yt.call(Z, {
        jobId: t,
        documentId: r,
        routeDocumentId: r,
        committedSource: i,
        includeOptionalArtifacts: !i
      })), q = Q ? {
        jobPayload: Q.sourcePayload,
        manifestPayload: Q.manifestPayload,
        readerMetadata: Q.readerMetadata,
        regionsPayload: Q.regions,
        readerErrors: Q.readerErrors
      } : await Z.loadReaderPayload(t, {
        // committedSource 分支会丢弃 regions/metadata（旧页序已失效），
        // 直接跳过这两个可选请求，避免无效网络往返。
        includeOptionalArtifacts: !i
      });
      if (V.isInactive()) return;
      let ae = null;
      if (n && !r) {
        try {
          ae = await Z.fetchDocumentByJobId(mn, t);
        } catch {
        }
        if (V.isInactive()) return;
      }
      const Pe = pa(q.jobPayload) || `${(ae == null ? void 0 : ae.document_id) || ""}`.trim();
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
        hasCommittedSource: !!i
      });
      if (ge.kind === "restore-committed-source") {
        if (V.isInactive()) return;
        d({
          type: "committed-source",
          documentId: ge.documentId,
          revision: ge.revision,
          sessionIdentity: c
        }), m("source");
        return;
      }
      const Le = Z.resolveReaderSourcePdf(q.manifestPayload), gt = Z.resolveReaderTranslatedPdfUrl(q.jobPayload, q.manifestPayload), zt = typeof Le == "string" ? Le : Z.resolveReaderArtifactUrl(Le), bt = r || Pe, Ie = i != null && i.documentId ? jn(
        i.documentId,
        i.revision
      ) : zt || (bt ? Z.resolveResourceUrl(`/api/v1/documents/${encodeURIComponent(bt)}/source.pdf`) : ""), Ae = i ? "" : gt || "";
      if (w(Ie || ""), S(Ae), A(ga(q.jobPayload, t)), u({
        jobPayload: q.jobPayload || null,
        manifestPayload: q.manifestPayload || null,
        sessionIdentity: c
      }), L(i ? [] : Ro(q.regionsPayload)), B(i ? { source: null, translated: null } : To(q.readerMetadata)), re(i ? vt : q.readerErrors ?? vt), !Ie && !Ae) {
        X(Re.failed, Re.failed);
        return;
      }
      const Ue = await ka({
        sourceFinal: Ie || "",
        translatedFinal: Ae,
        fence: V,
        setBoot: ne
      });
      if (Ue.status !== "inactive") {
        if (Ue.status === "incomplete") {
          X("PDF 下载失败，请重试", "PDF 下载失败");
          return;
        }
        M(Ue.sourceBytes), T(Ue.translatedBytes), de();
      }
    }
    async function ie() {
      R(!1), M(null), T(null), L([]), B({ source: null, translated: null }), re(vt), Rt(ne, 8, Re.metadata, "metadata");
      try {
        if (s) {
          await pe();
          return;
        }
        if (!t) {
          X(Re.failed, Re.failed);
          return;
        }
        await j();
      } catch (Q) {
        if (V.isClosedOrStale() || (Q == null ? void 0 : Q.name) === "AbortError") return;
        V.markFailed();
        const q = Number(Q == null ? void 0 : Q.status);
        if (Ia({
          status: q,
          jobId: n,
          routeDocumentId: r,
          documentJobId: a,
          sessionJobId: t
        })) {
          d({ type: "missing-document-job", documentId: r, jobId: t }), d({ type: "cleared-resolved-document-job" }), m("source");
          return;
        }
        const ae = Q instanceof Error ? Q.message : Re.failed;
        X(ae, ae);
      }
    }
    return ie(), () => {
      se.abort(), y.current === se && (y.current = null);
    };
  }, [t, r, a, o, s, l, i, v, n, c, d, u, f, m]), {
    sourceUrl: P,
    translatedUrl: g,
    sourceFile: k,
    translatedFile: _,
    assetsReady: E,
    title: I,
    regions: D,
    readerMetadata: $,
    readerErrors: Y,
    boot: oe
  };
}
function xa() {
  const e = x(!1), t = x(null), { locationKey: n, jobId: r, routeDocumentId: a, sessionIdentity: o } = ua(), s = x({ identity: "", value: 0 });
  s.current.identity !== o && (s.current = {
    identity: o,
    value: s.current.value + 1
  }, e.current = !1);
  const l = x(o), c = x(""), i = x(""), d = x(() => {
  }), u = N(() => d.current(), []), f = fa({
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
    sourceViewOnly: b
  } = f, { mode: y, setMode: P, switchSessionMode: w } = va(b);
  d.current = () => {
    w("source");
  }, l.current = o, c.current = v, i.current = m;
  const g = ba({
    sessionJobId: m,
    sessionIdentity: o,
    sessionIdentityRef: l,
    sessionJobIdRef: i,
    sessionEpochRef: s,
    closingRef: e
  }), {
    scopedJobPayload: S,
    scopedManifestPayload: k,
    jobStatus: M,
    jobTerminal: _,
    jobRefreshRevision: T,
    refreshJobArtifacts: E,
    refreshJobStatus: R
  } = g, I = Na({
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
    publishPayload: g.publishPayload,
    clearPayload: g.clearPayload,
    switchSessionMode: w,
    jobRefreshRevision: T,
    sessionEpochRef: s,
    closingRef: e,
    activeLoadAbortRef: t
  }), A = N(() => {
    var L;
    e.current = !0, (L = t.current) == null || L.abort();
  }, []), D = J(
    () => ({
      fetchProtected: fn().fetchProtected,
      jobId: m,
      jobPayload: S,
      manifestPayload: k,
      sourceUrl: I.sourceUrl,
      translatedUrl: I.translatedUrl,
      sourceOnly: b
    }),
    [m, S, k, I.sourceUrl, I.translatedUrl, b]
  );
  return {
    jobId: m,
    jobStatus: M,
    workflow: `${(S == null ? void 0 : S.workflow) || ""}`.trim().toLowerCase(),
    jobTerminal: _,
    documentId: v,
    sessionIdentity: o,
    sourceOnly: h,
    mode: y,
    setMode: P,
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
const Ca = 160, La = 8, za = 960;
function Da() {
  const e = x(null), [t, n] = C(null), [r, a] = C(za), o = N((s) => {
    e.current = s, n(s);
  }, []);
  return O(() => {
    const s = t;
    if (!s || typeof ResizeObserver > "u")
      return;
    const l = (i) => {
      !Number.isFinite(i) || i < Ca || a((d) => Math.abs(d - i) < La ? d : i);
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
function _a(e) {
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
const Ft = { source: 0, translated: 0 };
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
  const [u, f] = C(() => ({
    identity: i,
    pages: Ft
  })), [m, v] = C(() => ({ identity: i, tick: 0 })), h = u.identity === i ? u.pages : Ft, b = m.identity === i ? m.tick : 0, y = _a({
    mode: n,
    sourceOnly: r,
    assetsReady: a,
    hasSource: !!l || !!o,
    hasTranslated: !!c
  }), { primaryPane: P } = y, w = N((R, I) => {
    d.current === i && f((A) => {
      const D = A.identity === i ? A.pages : Ft;
      return D[I] === R && A.identity === i ? A : {
        identity: i,
        pages: { ...D, [I]: R }
      };
    });
  }, [i]), g = x(null), S = N(() => {
    g.current && clearTimeout(g.current);
    const R = i;
    g.current = setTimeout(() => {
      g.current = null, d.current === R && v((I) => ({
        identity: R,
        tick: I.identity === R ? I.tick + 1 : 1
      }));
    }, 60);
  }, [i]);
  O(() => (g.current && (clearTimeout(g.current), g.current = null), f((R) => R.identity === i && R.pages.source === 0 && R.pages.translated === 0 ? R : { identity: i, pages: { source: 0, translated: 0 } }), v((R) => R.identity === i && R.tick === 0 ? R : { identity: i, tick: 0 }), () => {
    g.current && (clearTimeout(g.current), g.current = null);
  }), [i]);
  const k = J(
    () => Math.max(h.source, h.translated),
    [h]
  ), M = P === "translated" ? h.translated : h.source || h.translated, _ = t == null ? void 0 : t.userZoom, T = t == null ? void 0 : t.shellWidth, E = `${i}-${b}-${_}-${n}-${h.source}-${h.translated}-${T}`;
  return {
    ...y,
    numPagesByPane: h,
    hudNumPages: k,
    primaryNumPages: M,
    metricsTick: b,
    onNumPages: w,
    onMetrics: S,
    rowSyncRevision: E
  };
}
const Ge = "data-reader-page", Ye = "data-reader-pane", pn = "data-natural-height", Oa = "reader-react-root", $a = "reader-react-grid", ja = "reader-react-scroll-shell", Ua = "reader-react-pdf-pane", Nr = "reader-react-pdf-page", Tt = "reader-react-pdf-page-placeholder", hn = "reader-react-pdf-page-slot";
function lt(e, t) {
  const n = e != null ? `[${Ge}="${e}"]` : `[${Ge}]`;
  return t ? `${n}[${Ye}="${t}"]` : n;
}
function Ba() {
  return `.${hn}[${Ge}]`;
}
function Ct(e) {
  return Number(e.getAttribute(Ge));
}
const xr = 0.25, Cr = 1, Ha = 0.05, pt = 0.5, Wa = 16, Ja = 8;
function ot(e) {
  return pt;
}
function Lt(e) {
  return Number.isFinite(e) ? Math.min(Cr, Math.max(xr, e)) : pt;
}
function dt(e, t) {
  const n = Lt(Number(e) + t * Ha);
  return Math.round(n * 100) / 100;
}
function qa(e) {
  return Math.round(Lt(e) * 100);
}
function Va(e) {
  const n = (Number(e) || 0) - Wa - Ja;
  return Math.max(160, Math.floor(n));
}
function Ka(e, t = pt) {
  const n = Lt(t);
  return Va((Number(e) || 0) * n);
}
function Ga(e, t) {
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
const Ya = "retainpdf:reader:view:v1:", Bn = /* @__PURE__ */ new Set([
  "source",
  "translated",
  "markdown",
  "ai"
]), Za = /* @__PURE__ */ new Set([
  "source",
  "compare",
  "translated"
]);
function Lr() {
  try {
    return typeof globalThis.localStorage > "u" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
function Yt(e) {
  return `${e || ""}`.trim();
}
function Xa({
  documentId: e,
  jobId: t
}) {
  const n = Yt(e);
  if (n) return `document:${n}`;
  const r = Yt(t);
  return r ? `job:${r}` : "";
}
function zr(e) {
  const t = Yt(e);
  return t ? `${Ya}${t}` : "";
}
function Qa(e) {
  if (!e || typeof e != "object") return;
  const t = Math.floor(Number(e.page)), n = Number(e.fraction);
  if (!(!Number.isFinite(t) || t < 1 || !Number.isFinite(n)))
    return {
      page: t,
      fraction: Math.max(0, Math.min(1, n))
    };
}
function es(e) {
  if (e === null) return null;
  if (!e || typeof e != "object") return;
  const t = `${e.left || ""}`, n = `${e.right || ""}`;
  if (!(!Bn.has(t) || !Bn.has(n) || t === n))
    return { left: t, right: n };
}
function ts(e) {
  return e === null ? null : e === "markdown" || e === "ai" ? e : void 0;
}
function ns(e) {
  return Za.has(e) ? e : void 0;
}
function Dr(e) {
  if (!e || typeof e != "object") return null;
  const t = e;
  if (t.schema !== "retainpdf_reader_view_v1") return null;
  const n = Qa(t.anchor), r = Number(t.zoom), a = ns(t.mode), o = es(t.splitLayout), s = ts(t.assistantPanel);
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
function Ee(e, t = Lr()) {
  const n = zr(e);
  if (!n || !t) return null;
  try {
    const r = t.getItem(n);
    return r ? Dr(JSON.parse(r)) : null;
  } catch {
    return null;
  }
}
function Et(e, t, n = Lr()) {
  const r = zr(e);
  if (!r || !n) return null;
  const a = Ee(e, n), o = Dr({
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
function rs(e, t, n = "") {
  const [r, a] = C(() => {
    var u;
    return ((u = Ee(n)) == null ? void 0 : u.zoom) ?? ot();
  }), o = x(r), s = x(n);
  o.current = r;
  const l = x(1);
  O(() => {
    var f;
    if (s.current === n) return;
    s.current = n;
    const u = ((f = Ee(n)) == null ? void 0 : f.zoom) ?? ot();
    l.current = 1, o.current = u, a(u);
  }, [e, n]);
  const c = N((u) => {
    const f = Lt(u), m = o.current;
    Math.abs(f - m) < 5e-4 || (l.current = f / (m || 1), Et(s.current, { zoom: f }), a(f));
  }, []), i = N((u) => {
    c(dt(o.current, u));
  }, [c]), d = N((u) => {
    c(ot());
  }, [c]);
  return Oe(() => {
    const u = l.current;
    Math.abs(u - 1) < 1e-3 || (l.current = 1, Ga(t == null ? void 0 : t.current, u));
  }, [r, t]), { userZoom: r, onZoomChange: c, stepZoom: i, resetZoom: d };
}
function os(e, t = !0) {
  const [n, r] = C(null), a = N(() => {
    var l, c;
    r(null);
    const s = (l = globalThis.getSelection) == null ? void 0 : l.call(globalThis);
    (c = s == null ? void 0 : s.removeAllRanges) == null || c.call(s);
  }, []), o = e.current ?? null;
  return O(() => {
    if (!t)
      return;
    const s = () => {
      var L, $;
      const h = e.current, b = (L = globalThis.getSelection) == null ? void 0 : L.call(globalThis);
      if (!h || !b || b.isCollapsed || !b.rangeCount) {
        r(null);
        return;
      }
      const y = b.getRangeAt(0);
      if (!h.contains(y.commonAncestorContainer)) {
        r(null);
        return;
      }
      const P = `${b.toString() || ""}`.replace(/\s+/g, " ").trim();
      if (P.length < 2) {
        r(null);
        return;
      }
      let w = y.commonAncestorContainer;
      w.nodeType === Node.TEXT_NODE && (w = w.parentElement);
      const g = ($ = w == null ? void 0 : w.closest) == null ? void 0 : $.call(
        w,
        lt()
      );
      if (!g || !h.contains(g)) {
        r(null);
        return;
      }
      const S = Math.max(1, Math.floor(Ct(g) || 1)), M = g.getAttribute(Ye) === "translated" ? "translated" : "source", _ = y.getClientRects(), T = _[_.length - 1] || y.getBoundingClientRect();
      if (!T || T.width === 0 && T.height === 0) {
        r(null);
        return;
      }
      const E = typeof window < "u" ? window.innerWidth : 800, R = typeof window < "u" ? window.innerHeight : 600, I = 16, A = Math.min(Math.max(I, T.left), E - I), D = Math.min(Math.max(I, T.top), R - I);
      r({
        selectionType: "text",
        quote: P,
        page: S,
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
function as(e) {
  const { mode: t, setMode: n, beginModeSwitch: r } = e, a = x(t), o = x(n), s = x(r);
  return a.current = t, o.current = n, s.current = r, { setModeKeepingPage: N((c) => {
    c !== a.current && (s.current(), o.current(c));
  }, []) };
}
function ss() {
  const [e, t] = C(null), n = N((s) => {
    t(s);
  }, []), r = N((s = null) => {
    t((l) => !s || l === s ? null : l);
  }, []), a = N((s) => {
    t((l) => l === s ? null : s);
  }, []), o = N(
    (s) => e === s,
    [e]
  );
  return { active: e, open: n, close: r, toggle: a, isOpen: o };
}
const gn = 48;
function _r(e, t = gn) {
  return e.getBoundingClientRect().top + t;
}
function Fr(e, t) {
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
  }) ?? e[0] ?? null, n)) {
    const i = [...e].reverse().find((d) => {
      const u = d.getBoundingClientRect();
      return u.height >= 8 && u.width >= 8;
    });
    i && i.getBoundingClientRect().bottom < t && (n = i);
  }
  if (!n)
    return null;
  const a = Ct(n);
  if (!Number.isFinite(a) || a < 1)
    return null;
  const o = n.getBoundingClientRect(), s = o.height > 0 ? o.height : 1, l = Math.min(1, Math.max(0, (t - o.top) / s));
  return { el: n, page: a, fraction: l };
}
function Ot(e, t, n = gn) {
  if (!e)
    return null;
  const r = lt(void 0, t), a = Array.from(e.querySelectorAll(r));
  if (!a.length || e.getBoundingClientRect().height <= 0)
    return null;
  const s = _r(e, n), l = Fr(a, s);
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
function is(e, t, n = "smooth", r) {
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
function cs(e, t, n) {
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
function ls(e, t, n = !0, r = "", a) {
  const [o, s] = C(1);
  return O(() => {
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
      const b = _r(l), y = Fr(h, b);
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
const ds = `canvas, .react-pdf__Page, .${Nr}, .${Tt}`, Hn = /* @__PURE__ */ new WeakMap();
function us(e) {
  const t = Number(e.getAttribute(pn));
  if (Number.isFinite(t) && t > 0)
    return t;
  let n = Hn.get(e);
  if ((n == null || !n.isConnected) && (n = e.querySelector(ds), Hn.set(e, n)), n) {
    const a = n.getBoundingClientRect().height;
    if (Number.isFinite(a) && a > 0)
      return a;
  }
  const r = e.getBoundingClientRect().height;
  return Number.isFinite(r) && r > 0 ? r : 0;
}
function fs(e, t) {
  if (e.size !== t.size) return !1;
  for (const [n, r] of t)
    if (e.get(n) !== r) return !1;
  return !0;
}
function ms(e) {
  const t = /* @__PURE__ */ new Map();
  e.querySelectorAll(Ba()).forEach((r) => {
    const a = Ct(r);
    if (!Number.isFinite(a) || a < 1) return;
    const o = us(r);
    if (o <= 0) return;
    const s = t.get(a) || { height: 0, count: 0 };
    s.height = Math.max(s.height, o), s.count += 1, t.set(a, s);
  });
  const n = /* @__PURE__ */ new Map();
  return t.forEach((r, a) => {
    r.count >= 2 && r.height > 0 && n.set(a, Math.ceil(r.height));
  }), n;
}
function ps(e, t, n = "", r) {
  const [a, o] = C(() => /* @__PURE__ */ new Map()), s = x(a), l = x(r);
  return l.current = r, Oe(() => {
    if (!t) {
      s.current.size !== 0 && (s.current = /* @__PURE__ */ new Map(), o(s.current));
      return;
    }
    let c = !1, i = 0, d = !1, u = !1;
    const f = () => {
      var S;
      if (c) return;
      const w = e.current;
      if (!w) return;
      const g = ms(w);
      fs(s.current, g) || (s.current = g, o(g)), d && !u && (u = !0, (S = l.current) == null || S.call(l));
    }, m = () => {
      cancelAnimationFrame(i), i = requestAnimationFrame(() => {
        requestAnimationFrame(f);
      });
    };
    m();
    const v = window.setTimeout(m, 100), h = window.setTimeout(() => {
      d = !0, m();
    }, 300), b = window.setTimeout(m, 700), y = e.current;
    let P = null;
    return y && typeof ResizeObserver < "u" && (P = new ResizeObserver(() => m()), P.observe(y)), () => {
      c = !0, cancelAnimationFrame(i), window.clearTimeout(v), window.clearTimeout(h), window.clearTimeout(b), P == null || P.disconnect();
    };
  }, [e, t, n]), a;
}
const hs = [0, 48, 140, 320, 560], gs = 700, bs = [80, 200, 400], ys = 500, vs = 50, ws = 180, Wn = [0, 48, 140, 320, 700, 1200];
function Ss(e, t) {
  var R;
  const {
    primaryPane: n,
    mode: r,
    enabled: a = !0,
    persistenceKey: o = "",
    restoreReady: s = !0
  } = t, l = x(
    ((R = Ee(o)) == null ? void 0 : R.anchor) || { page: 1, fraction: 0 }
  ), c = x(null), i = x(!1), d = x(r), u = x(null), f = x(null), m = x(null), v = x(null), h = x(o), b = x(""), y = x(n);
  y.current = n;
  const P = N(() => {
    var I;
    (I = u.current) == null || I.call(u), u.current = null, f.current != null && (clearTimeout(f.current), f.current = null);
  }, []), w = N((I = !1) => {
    v.current != null && (clearTimeout(v.current), v.current = null);
    const A = () => {
      v.current = null, Et(h.current, {
        anchor: be(l.current)
      });
    };
    I ? A() : v.current = setTimeout(A, ws);
  }, []), g = N((I) => {
    l.current = be(I), c.current = null, m.current != null && clearTimeout(m.current), m.current = setTimeout(() => {
      m.current = null, i.current = !1;
    }, vs);
  }, []);
  O(() => {
    if (!a)
      return;
    let I = !1, A = null, D = null, L = null;
    const $ = () => {
      if (I) return;
      const B = e.current;
      if (!B) {
        L = setTimeout($, 50);
        return;
      }
      A = B, D = () => {
        if (i.current)
          return;
        const Y = Ot(A, y.current);
        Y && (l.current = Y, w());
      }, A.addEventListener("scroll", D, { passive: !0 }), i.current || D();
    };
    return $(), () => {
      I = !0, L != null && clearTimeout(L), A && D && A.removeEventListener("scroll", D);
    };
  }, [a, r, n, e, w]), Oe(() => {
    var A;
    if (h.current === o) return;
    w(!0), P(), m.current != null && (clearTimeout(m.current), m.current = null), h.current = o, b.current = "";
    const I = (A = Ee(o)) == null ? void 0 : A.anchor;
    l.current = I ? be(I) : { page: 1, fraction: 0 }, c.current = null, i.current = !!o, d.current = r;
  }, [o, r, w, P]), O(() => {
    var A;
    if (!a || !s || !o || b.current === o) return;
    b.current = o;
    const I = be(
      ((A = Ee(o)) == null ? void 0 : A.anchor) || { page: 1, fraction: 0 }
    );
    return l.current = I, c.current = I, i.current = !0, P(), u.current = Zt(
      () => e.current,
      I,
      {
        behavior: "auto",
        pane: y.current,
        delaysMs: Wn,
        onDone: () => g(I)
      }
    ), f.current = setTimeout(() => {
      f.current = null, g(I);
    }, Math.max(...Wn) + 160), () => P();
  }, [a, s, o, e, g, P]), O(() => {
    if (d.current === r)
      return;
    if (d.current = r, !a) {
      i.current = !1, c.current = null, P();
      return;
    }
    const I = c.current ? be(c.current) : be(l.current);
    return i.current = !0, c.current = I, l.current = I, P(), u.current = Zt(
      () => e.current,
      I,
      {
        behavior: "auto",
        pane: n,
        // 等页宽/行高同步后再钉；同一 locked 幂等，不会越滚越远
        delaysMs: hs,
        onDone: () => g(I)
      }
    ), f.current = setTimeout(() => {
      f.current = null, g(I);
    }, gs), () => {
      P();
    };
  }, [r, a, n, e, g, P]), O(() => () => {
    P(), m.current != null && (clearTimeout(m.current), m.current = null), w(!0);
  }, [P, w]);
  const S = N(() => {
    const I = Ot(
      e.current,
      y.current
    );
    return be(I || l.current);
  }, [e]), k = N(() => {
    i.current = !0;
    const I = Ot(
      e.current,
      y.current
    ), A = be(I ?? l.current);
    return l.current = A, c.current = A, w(), A;
  }, [e, w]), M = N((I, A, D) => {
    const L = D || y.current, $ = Mt(I, A || 1), B = { page: $, fraction: 0 };
    l.current = B, i.current = !0, c.current = B, w(), P(), is(e.current, $, "smooth", L), u.current = cs(
      () => e.current,
      $,
      {
        behavior: "auto",
        pane: L,
        delaysMs: bs,
        onDone: () => g(B)
      }
    ), f.current = setTimeout(() => {
      f.current = null, g(B);
    }, ys);
  }, [e, g, P, w]), _ = N(() => be(l.current), []), T = N(() => i.current, []), E = N(() => {
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
    lockFromShell: S,
    beginModeSwitch: k,
    goToPage: M,
    getAnchor: _,
    isRestoring: T,
    repinIfRestoring: E
  };
}
function Ps(e, t) {
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
function Or(e, t, n) {
  const r = `${(n == null ? void 0 : n.jobId) || ""}`.trim(), a = `${(n == null ? void 0 : n.documentId) || ""}`.trim(), o = `j:${r}:d:${a}`;
  return t == null ? `${o}:none:${(e == null ? void 0 : e.blockId) || ""}` : `${o}:p:${t}:b:${(e == null ? void 0 : e.blockId) || ""}`;
}
const Is = [0, 80, 200, 400, 800], Rs = 120, Ts = 400;
function Es(e, t, n) {
  const { enabled: r, numPages: a, goToPage: o, resolveBlockPage: s, onAnchorApplied: l, jobId: c, documentId: i } = e, d = x(o);
  d.current = o;
  const u = x(s);
  u.current = s;
  const f = x(l);
  f.current = l;
  const m = x(n);
  m.current = n, O(() => {
    var w, g;
    if (!r || !Number.isFinite(a) || a < 1)
      return;
    const v = ra(), h = Ps(v, u.current), b = Or(v, h, { jobId: c, documentId: i });
    if (t.current === b)
      return;
    if (h == null) {
      t.current = b, (w = m.current) == null || w.call(m);
      return;
    }
    t.current = b, v && ((g = f.current) == null || g.call(f, v, h));
    const y = [];
    let P = 0;
    for (const S of Is)
      P = Math.max(P, S), y.push(
        setTimeout(() => {
          d.current(h);
        }, S)
      );
    return y.push(
      setTimeout(() => {
        var S;
        (S = m.current) == null || S.call(m);
      }, P + Rs)
    ), () => {
      for (const S of y) clearTimeout(S);
    };
  }, [r, a, c, i, t]);
}
function Ms(e) {
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
    syncDebounceMs: s = Ts,
    jobId: l,
    documentId: c,
    applyReaderSearch: i
  } = e, d = x(o);
  d.current = o;
  const u = x(i);
  u.current = i;
  const f = x(0);
  O(() => {
    if (!n || !r || !t.current || !Number.isFinite(a) || a < 1 || f.current === a) return;
    const m = setTimeout(() => {
      var y;
      const v = ((y = globalThis.location) == null ? void 0 : y.search) || "", h = Io(v, a, d.current);
      if (f.current = a, h === null) return;
      const b = `${new URLSearchParams(h).get("block_id") || ""}`.trim();
      t.current = Or(
        { blockId: b },
        a,
        { jobId: l, documentId: c }
      ), (u.current || Ms)(h);
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
function ks(e) {
  const t = x(""), [n, r] = C(!1), a = N(() => r(!0), []), o = {
    enabled: e.enabled,
    numPages: e.numPages,
    goToPage: e.goToPage,
    resolveBlockPage: e.resolveBlockPage,
    onAnchorApplied: e.onAnchorApplied,
    jobId: e.jobId,
    documentId: e.documentId
  };
  Es(o, t, a), As(e, t, n);
}
const et = {
  layoutByPage: /* @__PURE__ */ new Map(),
  pagesByPage: /* @__PURE__ */ new Map(),
  lastSeq: 0,
  connection: "idle",
  jobStatus: "",
  error: ""
};
function Ns(e) {
  return new Map(((e == null ? void 0 : e.pages) || []).map((t) => [t.page_idx, t]));
}
function Jn(e, t) {
  return e.attempt !== t.attempt ? e.attempt < t.attempt ? -1 : 1 : e.generation !== t.generation ? e.generation < t.generation ? -1 : 1 : 0;
}
function $r(e, t, n) {
  if (n.page_idx !== t.page_idx) return "retry";
  const r = Jn(n, t);
  if (r < 0 || r === 0 && n.page_hash !== t.page_hash) return "retry";
  if (!e) return "accept";
  const a = Jn(n, e);
  return a < 0 ? "ignore" : a === 0 ? n.page_hash === e.pageHash ? "ignore" : "retry" : "accept";
}
function xs(e, t, n) {
  if (t.seq <= e.lastSeq) return e;
  const r = e.pagesByPage.get(t.page_idx), a = $r(r, t, n);
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
  return ko(e) ? `${e.code || ""}`.trim() : "";
}
function wt(e, t) {
  const n = yn(e);
  return n === "LIVE_TRANSLATION_PAGE_NOT_COMMITTED" ? "尚未收到可显示的页面译文" : n === "LIVE_TRANSLATION_LAYOUT_NOT_READY" ? "正在等待 OCR 版面数据" : `${(e == null ? void 0 : e.message) || ""}`.trim() || t;
}
async function Ls(e, t, n, r, a) {
  let o = null;
  for (let s = 0; ; s += 1) {
    try {
      const c = await a.fetchPage(e, t.page_idx, { signal: r });
      if ($r(n.pagesByPage.get(t.page_idx), t, c) !== "retry")
        return c;
      o = No(
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
function zs({
  jobId: e,
  jobStatus: t,
  enabled: n,
  liveTranslationPort: r = void 0
}) {
  const [a, o] = C(et), s = x(a), l = x("");
  s.current = a;
  const c = `${e || ""}`.trim(), i = `${t || ""}`.trim().toLowerCase(), d = Cs.has(i) ? i : "";
  return O(() => {
    if (!n || !c) {
      l.current = "", s.current = et, o(et);
      return;
    }
    const u = r === void 0 ? na() : r, f = l.current === c;
    if (l.current = c, !u) {
      const w = {
        ...f ? s.current : et,
        connection: d ? "terminal" : "unavailable",
        jobStatus: i,
        error: "实时译文暂不可用"
      };
      s.current = w, o(w);
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
    const b = (w) => {
      m.signal.aborted || o((g) => {
        const S = w(g);
        return s.current = S, S;
      });
    }, y = async () => {
      let w = 0;
      for (; !m.signal.aborted; )
        try {
          const g = await u.fetchLayout(c, { signal: m.signal });
          v = !0, b((S) => ({
            ...S,
            layoutByPage: Ns(g),
            jobStatus: i,
            error: ""
          }));
          return;
        } catch (g) {
          if ((g == null ? void 0 : g.name) === "AbortError") return;
          const S = yn(g);
          if (!(S === "LIVE_TRANSLATION_LAYOUT_NOT_READY" || !S)) {
            b((M) => ({
              ...M,
              connection: d ? "terminal" : "unavailable",
              jobStatus: i,
              error: wt(g, "实时译文暂不可用")
            }));
            return;
          }
          if (d) {
            b((M) => ({
              ...M,
              connection: "terminal",
              jobStatus: i,
              error: ""
            }));
            return;
          }
          b((M) => ({
            ...M,
            connection: "connecting",
            jobStatus: i,
            error: wt(g, "正在等待 OCR 版面数据")
          })), await Xt(qn[Math.min(w, qn.length - 1)], m.signal).catch(() => {
          }), w += 1;
        }
    };
    return (async () => {
      if (await y(), !v || m.signal.aborted) return;
      let w = 0;
      for (; !m.signal.aborted; ) {
        d || b((g) => ({
          ...g,
          connection: g.lastSeq > 0 ? "reconnecting" : "connecting",
          jobStatus: i,
          // 保留已有错误：首页还没提交（lastSeq 为 0）时恰恰是最容易出错的阶段，
          // 此前这里把它清成空串，UI 于是一直显示「连接中」，用户看到的是
          // "正在努力"，实际可能已经在反复失败。
          error: g.error
        }));
        try {
          await u.streamEvents(c, {
            afterSeq: s.current.lastSeq,
            signal: m.signal,
            onEvent: async (g) => {
              if (g.seq <= s.current.lastSeq) return;
              let S;
              try {
                S = await Ls(
                  c,
                  g,
                  s.current,
                  m.signal,
                  u
                );
              } catch (k) {
                if ((k == null ? void 0 : k.name) === "AbortError" || m.signal.aborted) throw k;
                b((M) => ({
                  ...M,
                  lastSeq: Math.max(M.lastSeq, g.seq),
                  error: wt(k, "部分页面的实时译文暂时取不到")
                }));
                return;
              }
              b((k) => {
                const M = xs(k, g, S);
                return d ? {
                  ...M,
                  connection: "terminal",
                  jobStatus: i
                } : {
                  ...M,
                  jobStatus: i
                };
              }), w = 0;
            }
          });
        } catch (g) {
          if ((g == null ? void 0 : g.name) === "AbortError" || m.signal.aborted) return;
          b((S) => ({
            ...S,
            connection: d ? "terminal" : "reconnecting",
            jobStatus: i,
            error: wt(g, "实时译文连接已中断，正在重连")
          }));
        }
        if (m.signal.aborted) return;
        if (d) {
          b((g) => ({
            ...g,
            connection: "terminal",
            jobStatus: i
          }));
          return;
        }
        await Xt(Vn[Math.min(w, Vn.length - 1)], m.signal).catch(() => {
        }), w += 1;
      }
    })(), () => m.abort();
  }, [n, r, c, d]), a;
}
const Ds = 2e3;
function _s(e) {
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
function jr(e) {
  return !!(e.jobId && e.sourceUrl && Fs.has(e.workflow));
}
function Os(e) {
  return !!(jr(e) && !(e.jobStatus === "succeeded" && e.translatedUrl));
}
function $s() {
  const e = xa(), t = jr({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    workflow: e.workflow
  }), n = Os({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    translatedUrl: e.translatedUrl,
    jobStatus: e.jobStatus,
    workflow: e.workflow
  }), r = zs({
    jobId: e.jobId,
    jobStatus: e.jobStatus,
    enabled: t
  }), a = ss(), { shellRef: o, shellEl: s, shellWidth: l, bindShell: c } = Da(), i = Xa({
    documentId: e.documentId,
    jobId: e.jobId
  }), d = `${i}\0${e.jobId}\0${e.sourceUrl}\0${e.translatedUrl}`, { userZoom: u, onZoomChange: f } = rs(e.mode, o, i), m = Fa(
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
    repinIfRestoring: b
  } = Ss(o, {
    primaryPane: m.primaryPane,
    mode: e.mode,
    enabled: !e.boot.loading,
    persistenceKey: i,
    restoreReady: m.primaryNumPages > 0
  });
  O(() => {
    b();
  }, [l, b]);
  const y = ps(
    o,
    m.compareMode,
    m.rowSyncRevision,
    b
  ), P = ls(
    o,
    m.primaryNumPages,
    !e.boot.loading,
    `${e.mode}-${u}-${m.metricsTick}`,
    m.primaryPane
  ), w = N((U, V) => {
    var X, de;
    const Z = Math.max(
      Number(m.hudNumPages) || 0,
      Number(m.primaryNumPages) || 0,
      Number((X = m.numPagesByPane) == null ? void 0 : X.source) || 0,
      Number((de = m.numPagesByPane) == null ? void 0 : de.translated) || 0
    );
    h(U, Z, V);
  }, [h, m.hudNumPages, m.primaryNumPages, m.numPagesByPane]), [g, S] = C(null), k = x(null), M = N((U) => {
    k.current && clearTimeout(k.current), S(U), U && (k.current = setTimeout(() => S(null), Ds));
  }, []);
  O(() => () => {
    k.current && clearTimeout(k.current);
  }, []);
  const _ = N((U) => {
    const V = Dt(e.regions, U);
    return V ? _n(V, m.primaryPane).page : null;
  }, [e.regions, m.primaryPane]), T = N((U, V) => {
    const Z = V || m.primaryPane, X = typeof U == "object" && U ? `${U.block_id || ""}`.trim() : "", de = typeof U == "object" && U ? `${U.image_url || ""}`.trim() : "", he = typeof U == "object" && U ? U.page_idx != null ? Number(U.page_idx) + 1 : U.page != null ? Number(U.page) : null : typeof U == "number" ? U + 1 : null, pe = Eo(e.regions, de, he) || Dt(e.regions, X) || (typeof U == "object" ? Mo(e.regions, U) : null);
    let j = pe ? _n(pe, Z).page : null;
    j == null && (j = _s(U)), !(j == null || j < 1) && (M(pe), w(j, Z));
  }, [M, w, m.primaryPane, e.regions]);
  ks({
    enabled: !e.boot.loading && !e.boot.failed && e.assetsReady,
    syncEnabled: !e.boot.loading && !e.boot.failed && e.assetsReady,
    numPages: m.hudNumPages || 0,
    currentPage: P,
    goToPage: w,
    resolveBlockPage: _,
    jobId: e.jobId,
    documentId: e.documentId,
    onAnchorApplied: (U) => {
      M(Dt(e.regions, U.blockId));
    }
  });
  const { setModeKeepingPage: E } = as({
    mode: e.mode,
    setMode: e.setMode,
    beginModeSwitch: v
  }), [R, I] = C(null), {
    selection: A,
    clearSelection: D
  } = os(o, !e.boot.loading && !e.boot.failed), L = N(() => {
    I(null), D();
  }, [D]), $ = N((U) => {
    D(), I(U);
  }, [D]);
  O(() => {
    A && I(null);
  }, [A]), O(() => {
    const U = o.current;
    if (!U) return;
    const V = () => I(null);
    return U.addEventListener("scroll", V, { passive: !0 }), () => U.removeEventListener("scroll", V);
  }, [s, o]);
  const B = A || R;
  O(() => {
    M(null), L();
  }, [d, M, L]);
  const Y = !e.boot.loading && !e.boot.failed, re = J(() => a, [a.active, a.open, a.close, a.toggle, a.isOpen]), oe = J(() => ({ bindShell: c, shellEl: s, shellWidth: l, shellRef: o }), [c, s, l, o]), ne = J(() => ({
    sourceUrl: e.sourceUrl,
    translatedUrl: e.translatedUrl,
    sourceFile: e.sourceFile,
    translatedFile: e.translatedFile
  }), [e.sourceUrl, e.translatedUrl, e.sourceFile, e.translatedFile]), se = J(() => ({
    session: e,
    boot: e.boot,
    sourceOnly: e.sourceOnly,
    mode: e.mode,
    userZoom: u,
    onZoomChange: f,
    shell: oe,
    panes: m,
    sessionFiles: ne,
    rowHeights: y,
    goToPage: w,
    activeRegion: g,
    jumpToAnchor: T,
    setModeKeepingPage: E,
    download: e.download,
    showHud: Y,
    tools: re,
    selection: B,
    clearSelection: L,
    selectRegion: $,
    viewStateKey: i,
    liveTranslation: r,
    liveTranslationAvailable: n
  }), [e, oe, m, ne, y, w, g, T, E, Y, re, B, L, $, u, f, i, r, n]);
  return J(() => ({
    ...se,
    currentPage: P
  }), [se, P]);
}
const js = [
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
], Us = [
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
function Bs(e) {
  const t = e.length === 1 ? e.toLowerCase() : e;
  for (const n of js)
    if (n.keys.some(
      (a) => a.length === 1 ? a === t : a === e
    )) return n;
  return null;
}
function Hs(e) {
  if (!(e instanceof HTMLElement))
    return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
function Ws(e) {
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
  O(() => {
    if (!i)
      return;
    const d = (u) => {
      if (u.defaultPrevented || u.metaKey || u.ctrlKey || u.altKey || Hs(u.target))
        return;
      const f = u.key, m = Bs(f);
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
const Js = "retainpdf:soft-reader-close";
function qs() {
  return new URL("./index.html", window.location.href).href;
}
function Vs() {
  if (typeof window > "u" || window.self === window.top) return !1;
  try {
    return window.parent.postMessage(
      { type: Js },
      window.location.origin
    ), !0;
  } catch {
    return !1;
  }
}
function Ks(e, t, n) {
  if (n <= 1 || !e) return !1;
  try {
    const r = new URL(t), a = new URL(e, r);
    return a.origin === r.origin && !/reader\.html$/i.test(a.pathname) && !/detail\.html$/i.test(a.pathname);
  } catch {
    return !1;
  }
}
function Gs() {
  if (!(typeof window > "u") && !Vs()) {
    if (Ks(
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
function Ys({ onBeforeClose: e } = {}) {
  return /* @__PURE__ */ z(
    "button",
    {
      id: "reader-close-home-btn",
      type: "button",
      className: "reader-close-home-btn",
      "aria-label": "返回主页",
      title: "返回主页",
      onClick: () => {
        e == null || e(), Gs();
      },
      children: [
        /* @__PURE__ */ p(Xe, { className: "reader-close-home-icon", size: 18, strokeWidth: 2.25, "aria-hidden": !0 }),
        /* @__PURE__ */ p("span", { className: "reader-close-home-label", children: "关闭" })
      ]
    }
  );
}
let Kn = !1;
function Zs() {
  if (Kn)
    return;
  const e = ct().resolvePdfjsVendorUrl("build/pdf.worker.mjs");
  e && (qo.GlobalWorkerOptions.workerSrc = e, Kn = !0);
}
const Xs = {
  formula: "公式",
  table: "表格",
  figure: "图片",
  text: "文字",
  region: "区域"
};
function Qs({
  pane: e,
  width: t,
  height: n,
  regions: r,
  onSelect: a
}) {
  const o = r.flatMap((s) => {
    if (!Sr(s.region)) return [];
    const l = Nt(s, t, n);
    return l ? [{ highlight: s, rect: l }] : [];
  });
  return o.length ? /* @__PURE__ */ p("div", { className: "reader-structure-selection-layer", "aria-label": "PDF 结构选择层", children: o.map(({ highlight: s, rect: l }) => {
    const c = s.region, i = Pr(c), d = Xs[i];
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
          /* @__PURE__ */ p("span", { className: "sr-only", children: Ir(c, e) })
        ]
      },
      c.itemId
    );
  }) }) : null;
}
function ei(e, t, n) {
  return e.flatMap((r) => {
    if (Pr(r.region) !== "text") return [];
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
function ti({ target: e }) {
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
function ni(e, t) {
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
function ri(e, t, n, r) {
  if (!e || !t) return [];
  const a = [];
  for (const o of e.blocks) {
    const s = t.itemsById.get(o.item_id);
    if (!(s != null && s.translated_text)) continue;
    const l = Nt(
      ni(e, o),
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
const oi = '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif', ai = 256, tt = /* @__PURE__ */ new Map();
function si(e) {
  return `${e || ""}`.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function ii(e) {
  const t = `${e || ""}`, { text: n, slots: r } = Go(t, { bareLatex: !0 }), a = si(n), o = Yo(a, r);
  if (!r.length)
    return { fallbackHtml: o, richHtml: Promise.resolve(o), hasMath: !1 };
  let s = tt.get(t);
  if (!s && (s = Zo(a, r), tt.set(t, s), tt.size > ai)) {
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
function ci(e, t) {
  const n = e.typography, r = Te(t) || 1, a = Te(n == null ? void 0 : n.font_size_pt), o = Math.max(1, `${e.sourceText || ""}`.split(/\n+/).length), s = e.rect.height / Math.max(1.28, o * 1.18), l = jt(e.kind) ? 24 : /caption|footnote|table/i.test(e.kind) ? 9.5 : 11, c = Math.max(5.5 * r, Math.min(s, l * r)), i = Te(n == null ? void 0 : n.fit_min_font_size_pt), d = Te(n == null ? void 0 : n.fit_max_font_size_pt), u = Math.max(3.5, (i || 5.5) * r), f = Math.max(
    u,
    d ? d * r : a ? a * r : c
  ), m = a ? a * r : c, v = Te(n == null ? void 0 : n.leading_em), h = [
    Te(n == null ? void 0 : n.padding_top_pt) || 0,
    Te(n == null ? void 0 : n.padding_right_pt) || 0,
    Te(n == null ? void 0 : n.padding_bottom_pt) || 0,
    Te(n == null ? void 0 : n.padding_left_pt) || 0
  ].map((b) => b * r);
  return {
    fontFamily: `${(n == null ? void 0 : n.font_family) || ""}`.trim() || oi,
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
function li(e, t, n, r) {
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
const di = 512, nt = /* @__PURE__ */ new Map();
let Qt = 0;
typeof document < "u" && document.fonts && (document.fonts.ready.then(() => {
  Qt += 1;
}).catch(() => {
}), typeof document.fonts.addEventListener == "function" && document.fonts.addEventListener("loadingdone", () => {
  Qt += 1;
}));
function ui(e, t, n, r) {
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
function fi({ item: e, pageScale: t }) {
  const n = x(null), r = J(
    () => ii(e.translatedText),
    [e.translatedText]
  ), [a, o] = C(r.fallbackHtml), s = J(
    () => ci(e, t),
    [e, t]
  );
  O(() => {
    let u = !0;
    return o(r.fallbackHtml), r.hasMath && r.richHtml.then((f) => {
      u && o(f);
    }), () => {
      u = !1;
    };
  }, [r]), Oe(() => {
    const u = n.current;
    if (!u) return;
    const [f, m, v, h] = s.padding, b = Math.max(1, e.rect.width - h - m), y = Math.max(1, e.rect.height - f - v), P = ui(a, b, y, s);
    let w = nt.get(P);
    if (w === void 0 && (w = li(
      (g) => (u.style.fontSize = `${g}px`, { width: u.scrollWidth, height: u.scrollHeight }),
      b,
      y,
      {
        minFontSizePx: s.minFontSizePx,
        maxFontSizePx: s.maxFontSizePx,
        requestedFontSizePx: s.fontSizePx,
        exact: s.exact
      }
    ), nt.set(P, w), nt.size > di)) {
      const g = nt.keys().next().value;
      g !== void 0 && nt.delete(g);
    }
    u.style.fontSize = `${w.toFixed(2)}px`;
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
function mi({
  layoutPage: e,
  pageState: t,
  width: n,
  height: r
}) {
  const a = J(
    () => ri(e, t, n, r),
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
        fi,
        {
          item: o,
          pageScale: e != null && e.width ? n / e.width : 1
        },
        `${o.itemId}:${o.changedAtSeq}`
      ))
    }
  ) : null;
}
const pi = on(mi), Ur = 1.414;
function hi({
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
  const b = x(l ?? Ur), [y, P] = C(b.current);
  O(() => {
    l != null && Math.abs(l - b.current) >= 1e-3 && (b.current = l, P(l));
  }, [l]);
  const w = x(i);
  w.current = i;
  const g = x((L) => {
    var $;
    ($ = w.current) == null || $.call(w, L);
  }).current, S = Math.max(120, Math.floor(t * y)), k = Math.max(S, Math.ceil(o || 0)), M = Nt(d, t, S), _ = J(
    () => ei(u, t, S),
    [S, u, t]
  ), [T, E] = C(null), R = J(
    () => _.find((L) => L.itemId === T) || null,
    [T, _]
  ), I = (L) => {
    if (L.buttons !== 0) {
      E(null);
      return;
    }
    const $ = L.currentTarget.getBoundingClientRect(), B = Gn(
      _,
      L.clientX - $.left,
      L.clientY - $.top
    ), Y = (B == null ? void 0 : B.itemId) || null;
    E((re) => re === Y ? re : Y);
  }, A = (L) => {
    var Y, re, oe;
    if (!f || (re = (Y = L.target) == null ? void 0 : Y.closest) != null && re.call(Y, ".reader-structure-selection-target") || `${((oe = window.getSelection()) == null ? void 0 : oe.toString()) || ""}`.trim()) return;
    const $ = L.currentTarget.getBoundingClientRect(), B = Gn(
      _,
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
    !Number.isFinite(L) || L <= 0 || Math.abs(b.current - L) < 1e-3 || (b.current = L, P(L), c == null || c(e, L));
  };
  return /* @__PURE__ */ z(
    "div",
    {
      ref: g,
      [Ge]: e,
      [Ye]: r,
      [pn]: S,
      className: hn,
      onPointerMoveCapture: I,
      onClick: A,
      onPointerLeave: () => E(null),
      style: {
        width: t,
        height: k,
        minHeight: k
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
            className: Nr,
            loading: /* @__PURE__ */ p(
              "div",
              {
                className: Tt,
                style: { width: t, height: S }
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
            style: { width: t, height: S },
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
          pi,
          {
            layoutPage: m,
            pageState: v,
            width: t,
            height: S
          }
        ) : null,
        /* @__PURE__ */ p(ti, { target: a ? R : null }),
        /* @__PURE__ */ p(
          Qs,
          {
            pane: r === "translated" ? "translated" : "source",
            width: t,
            height: S,
            regions: u,
            onSelect: f
          }
        )
      ]
    }
  );
}
const gi = on(hi), Ut = 5, bi = "120% 0px", yi = 120;
let Yn = 1;
const Zn = /* @__PURE__ */ new WeakMap();
function vi(e) {
  if (!e) return 0;
  const t = Zn.get(e);
  if (t) return t;
  const n = Yn;
  return Yn += 1, Zn.set(e, n), n;
}
function wi() {
  const e = typeof window < "u" && window.devicePixelRatio || 1;
  return Math.max(1, Math.min(e, 2));
}
const Si = mo(
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
    readerMetadata: b = null,
    onSelectRegion: y,
    liveTranslation: P,
    showLiveTranslation: w = t === "source",
    liveTranslationPendingLabel: g = "",
    paneAction: S
  }, k) {
    Zs();
    const { file: M, loading: _, error: T } = Ma(n, r), E = `${n}\0${vi(M)}`, R = x(E);
    R.current = E;
    const I = J(
      () => Ra(M),
      [M, n]
    ), [A, D] = C(0), [L, $] = C(""), [B, Y] = C(null), [re, oe] = C(480), ne = x(null), se = x(0), U = J(() => wi(), []), V = J(() => ({
      cMapUrl: ct().resolvePdfjsVendorUrl("cmaps/"),
      cMapPacked: !0,
      standardFontDataUrl: ct().resolvePdfjsVendorUrl("standard_fonts/")
    }), []);
    an(k, () => B, [B]), O(() => {
      const F = (H) => {
        !Number.isFinite(H) || H < 80 || Math.abs(H - se.current) < 8 || (se.current = H, oe(H));
      }, K = c && c >= 80 ? c : (l == null ? void 0 : l.clientWidth) || 0;
      if (F(K), !l || typeof ResizeObserver > "u" || c && c >= 80) return;
      const W = new ResizeObserver((H) => {
        var ee, te;
        const ce = ((te = (ee = H[0]) == null ? void 0 : ee.contentRect) == null ? void 0 : te.width) ?? l.clientWidth;
        !Number.isFinite(ce) || ce < 80 || (ne.current && clearTimeout(ne.current), ne.current = setTimeout(() => F(ce), 80));
      });
      return W.observe(l), () => {
        W.disconnect(), ne.current && clearTimeout(ne.current);
      };
    }, [c, l, o]);
    const Z = J(
      () => Ka(re, a),
      [re, a]
    ), [X, de] = C(() => /* @__PURE__ */ new Map()), [he, pe] = C(() => /* @__PURE__ */ new Set()), [j, ie] = C(() => /* @__PURE__ */ new Set()), Q = x(/* @__PURE__ */ new Map()), q = x(null), ae = x(/* @__PURE__ */ new Map()), Pe = N((F, K) => {
      de((W) => {
        if (W.get(F) === K) return W;
        const H = new Map(W);
        return H.set(F, K), H;
      });
    }, []), ge = N((F, K) => {
      const W = Q.current, H = W.get(F);
      if (H && q.current)
        try {
          q.current.unobserve(H);
        } catch {
        }
      if (K) {
        if (W.set(F, K), q.current)
          try {
            q.current.observe(K);
          } catch {
          }
      } else
        W.delete(F);
    }, []), Le = x(/* @__PURE__ */ new Map()), gt = N((F) => {
      const K = Le.current;
      let W = K.get(F);
      return W || (W = (H) => ge(F, H), K.set(F, W)), W;
    }, [ge]);
    O(() => {
      if (typeof IntersectionObserver > "u") return;
      const F = ae.current, K = new IntersectionObserver(
        (W) => {
          const H = [], ce = [];
          for (const ee of W) {
            const te = ee.target, me = Ct(te);
            Number.isFinite(me) && (ee.isIntersecting ? H : ce).push(me);
          }
          if ((H.length || ce.length) && pe((ee) => {
            let te = null;
            for (const me of H)
              ee.has(me) || (te = te || new Set(ee), te.add(me));
            for (const me of ce)
              ee.has(me) && (te = te || new Set(ee), te.delete(me));
            return te || ee;
          }), H.length) {
            for (const ee of H) {
              const te = F.get(ee);
              te && (clearTimeout(te), F.delete(ee));
            }
            ie((ee) => {
              let te = null;
              for (const me of H)
                ee.has(me) || (te = te || new Set(ee), te.add(me));
              return te || ee;
            });
          }
          for (const ee of ce)
            F.has(ee) || F.set(ee, setTimeout(() => {
              F.delete(ee), ie((te) => {
                if (!te.has(ee)) return te;
                const me = new Set(te);
                return me.delete(ee), me;
              });
            }, yi));
        },
        { root: l, rootMargin: bi, threshold: 0 }
      );
      q.current = K;
      for (const W of Q.current.values())
        try {
          K.observe(W);
        } catch {
        }
      return () => {
        K.disconnect(), q.current === K && (q.current = null);
        for (const W of F.values()) clearTimeout(W);
        F.clear();
      };
    }, [l]), Oe(() => {
      D(0), $(""), pe(/* @__PURE__ */ new Set()), ie(/* @__PURE__ */ new Set()), de(/* @__PURE__ */ new Map()), Q.current.clear();
      const F = ae.current;
      for (const K of F.values()) clearTimeout(K);
      F.clear(), m == null || m(0, t);
    }, [E, m, t]);
    const zt = N(
      ({ numPages: F }) => {
        R.current === E && (D(F), $(""), m == null || m(F, t), u == null || u({ numPages: F, pane: t }));
      },
      [E, u, m, t]
    ), bt = N(
      (F) => {
        if (R.current !== E) return;
        const K = (F == null ? void 0 : F.message) || "PDF 解析失败";
        $(K), D(0), m == null || m(0, t), f == null || f(F, t);
      },
      [E, f, m, t]
    ), Ie = J(
      () => A > 0 ? Array.from({ length: A }, (F, K) => K + 1) : [],
      [A]
    );
    O(() => {
      typeof IntersectionObserver < "u" || ie(new Set(Ie));
    }, [Ie]);
    const Ae = J(
      () => Fn(v, b, t),
      [v, b, t]
    ), Ue = J(() => {
      const F = /* @__PURE__ */ new Map();
      for (const K of h) {
        const W = Fn(K, b, t);
        if (!W) continue;
        const H = F.get(W.box.page) || [];
        H.push(W), F.set(W.box.page, H);
      }
      return F;
    }, [t, b, h]), yt = J(() => {
      if (A === 0) return /* @__PURE__ */ new Set();
      if (!(!!l && typeof IntersectionObserver < "u" && o)) return new Set(Ie);
      if (he.size === 0) {
        const W = Math.min(A, Ut * 2 + 1);
        return new Set(Array.from({ length: W }, (H, ce) => ce + 1));
      }
      const K = /* @__PURE__ */ new Set();
      for (const W of he)
        for (let H = -Ut; H <= Ut; H++) {
          const ce = W + H;
          ce >= 1 && ce <= A && K.add(ce);
        }
      return K;
    }, [A, Ie, l, o, he]), uo = !n || !!T || !!L, fo = n && (T || L) || s;
    return /* @__PURE__ */ z(
      "section",
      {
        ref: Y,
        className: `reader-panel ${Ua}${o ? "" : " is-hidden"}`,
        [Ye]: t,
        "data-reader-engine": "react-pdf",
        "data-reader-visible": o ? "true" : "false",
        "data-live-translation-status": (P == null ? void 0 : P.jobStatus) || void 0,
        "aria-hidden": o ? void 0 : !0,
        "aria-label": t === "source" ? "原文 PDF" : "译文 PDF",
        children: [
          S ? /* @__PURE__ */ p("div", { className: "reader-react-pdf-pane-action", children: S }) : null,
          g ? /* @__PURE__ */ z("div", { className: "reader-live-translation-waiting", role: "status", children: [
            /* @__PURE__ */ p("span", { className: "reader-live-translation-waiting-dot", "aria-hidden": "true" }),
            /* @__PURE__ */ p("span", { children: g })
          ] }) : null,
          uo && !_ ? /* @__PURE__ */ p("div", { className: "reader-empty reader-react-pdf-empty", "data-reader-pdf-empty": t, children: fo }) : null,
          _ ? /* @__PURE__ */ p("div", { className: "reader-empty reader-react-pdf-loading", "data-reader-pdf-loading": t, children: "正在加载 PDF…" }) : null,
          I && !T ? /* @__PURE__ */ p("div", { className: "reader-viewer-wrap reader-react-pdf-wrap", children: /* @__PURE__ */ p(
            Ko,
            {
              file: I,
              loading: null,
              error: null,
              options: V,
              onLoadSuccess: zt,
              onLoadError: bt,
              className: "reader-react-pdf-document",
              children: Ie.map((F) => {
                if (yt.has(F))
                  return /* @__PURE__ */ p(
                    gi,
                    {
                      pane: t,
                      pageNumber: F,
                      width: Z,
                      devicePixelRatio: U,
                      active: j.has(F),
                      syncedMinHeight: (i == null ? void 0 : i.get(F)) || 0,
                      onMetrics: d,
                      cachedAspect: X.get(F),
                      onAspectChange: Pe,
                      sentinelRef: gt(F),
                      regionHighlight: (Ae == null ? void 0 : Ae.box.page) === F ? Ae : null,
                      regionTargets: Ue.get(F),
                      onSelectRegion: y,
                      liveTranslationLayout: P == null ? void 0 : P.layoutByPage.get(F - 1),
                      liveTranslationPage: P == null ? void 0 : P.pagesByPage.get(F - 1),
                      showLiveTranslation: w
                    },
                    `${t}-${F}`
                  );
                const W = X.get(F) ?? Ur, H = Math.max(120, Math.floor(Z * W)), ce = Math.max(H, Math.ceil((i == null ? void 0 : i.get(F)) || 0));
                return /* @__PURE__ */ p(
                  "div",
                  {
                    ref: gt(F),
                    [Ge]: F,
                    [Ye]: t,
                    [pn]: H,
                    className: hn,
                    style: {
                      width: Z,
                      height: ce,
                      minHeight: ce
                    },
                    children: /* @__PURE__ */ p(
                      "div",
                      {
                        className: Tt,
                        style: { width: Z, height: H },
                        "aria-hidden": !0
                      }
                    )
                  },
                  `${t}-${F}`
                );
              })
            },
            E
          ) }) : null
        ]
      }
    );
  }
), Xn = on(Si), Br = sn(null), Hr = sn(null);
function Pi({ value: e, hud: t, children: n }) {
  return /* @__PURE__ */ p(Br.Provider, { value: e, children: /* @__PURE__ */ p(Hr.Provider, { value: t, children: n }) });
}
function ht() {
  return cn(Br);
}
function Ii() {
  return cn(Hr);
}
function Ri({
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
function Ti(e, t, n = e * 2) {
  return t ? Math.min(e * 2, n) : e;
}
function Ei(e) {
  return e ? e.connection === "terminal" && e.jobStatus === "failed" ? e.pagesByPage.size > 0 ? `翻译已暂停，已保留 ${e.pagesByPage.size} 页译文` : "翻译已暂停，原始 PDF 仍可阅读" : e.connection === "terminal" && ["cancelled", "canceled"].includes(e.jobStatus) ? e.pagesByPage.size > 0 ? `翻译已取消，已保留 ${e.pagesByPage.size} 页译文` : "翻译已取消，原始 PDF 仍可阅读" : e.pagesByPage.size > 0 ? "" : e.connection === "unavailable" ? e.error || "实时译文暂不可用，原始 PDF 仍可阅读" : e.error ? e.error : e.layoutByPage.size === 0 ? "正在完成 OCR，译文将在这里逐页出现" : "版面已就绪，正在等待首个译文页面" : "";
}
function Mi(e) {
  const t = ht(), {
    markdownSplit: n = !1,
    assistantSplit: r = !1,
    liveTranslation: a,
    paneComposition: o
  } = e, s = (o == null ? void 0 : o.visibleMode) ?? e.mode ?? "compare", l = (o == null ? void 0 : o.compareMode) ?? e.compareMode ?? s === "compare", c = (o == null ? void 0 : o.showSource) ?? e.showSource ?? !0, i = (o == null ? void 0 : o.showTranslated) ?? e.showTranslated ?? (s === "compare" || s === "translated"), d = (o == null ? void 0 : o.overlayOnSource) ?? e.overlayOnSource ?? !1, u = e.bindShell ?? (t == null ? void 0 : t.bindShell), f = e.shellEl ?? (t == null ? void 0 : t.shellEl) ?? null, m = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? pt, v = e.shellWidth ?? (t == null ? void 0 : t.shellWidth) ?? 0, h = e.rowHeights ?? (t == null ? void 0 : t.rowHeights), b = e.mountSource ?? (t == null ? void 0 : t.mountSource) ?? !1, y = e.mountTranslated ?? (t == null ? void 0 : t.mountTranslated) ?? !1, P = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, w = e.sourceUrl ?? (t == null ? void 0 : t.sourceUrl) ?? "", g = e.translatedUrl ?? (t == null ? void 0 : t.translatedUrl) ?? "", S = e.sourceFile ?? (t == null ? void 0 : t.sourceFile) ?? null, k = e.translatedFile ?? (t == null ? void 0 : t.translatedFile) ?? null, M = e.onMetrics ?? (t == null ? void 0 : t.onMetrics), _ = e.onNumPagesChange ?? (t == null ? void 0 : t.onNumPagesChange), T = e.activeRegion ?? (t == null ? void 0 : t.activeRegion), E = e.regions ?? (t == null ? void 0 : t.regions) ?? [], R = e.readerMetadata ?? (t == null ? void 0 : t.readerMetadata), I = e.onSelectRegion ?? (t == null ? void 0 : t.onSelectRegion), A = Ri({
    mode: s,
    compareMode: l,
    showSource: c,
    showTranslated: i,
    markdownSplit: n,
    overlayOnSource: d
  }), D = Ti(
    v,
    n || r,
    typeof document > "u" ? v * 2 : document.documentElement.clientWidth
  );
  return /* @__PURE__ */ p(
    "div",
    {
      ref: u,
      className: ja,
      "data-reader-region-count": E.length,
      "data-reader-structured-region-count": E.filter(Sr).length,
      "data-reader-metadata-ready": R ? "true" : "false",
      children: /* @__PURE__ */ z(
        "main",
        {
          className: `${$a} reader-mode-${A.mode}`,
          "data-reader-mode": n ? "markdown-split" : r ? "assistant-split" : s,
          children: [
            b ? /* @__PURE__ */ p(
              Xn,
              {
                pane: "source",
                url: w,
                preloadedFile: S,
                userZoom: m,
                visible: A.showSource,
                scrollRoot: f,
                pageWidthOverride: D,
                rowHeights: A.compareMode ? h : void 0,
                onMetrics: M,
                emptyLabel: P ? "源文件不可用：该文档没有可读取的源 PDF。" : "暂无原文 PDF",
                onNumPagesChange: _,
                activeRegion: T,
                regions: E,
                readerMetadata: R,
                onSelectRegion: I,
                liveTranslation: d ? a : void 0,
                showLiveTranslation: d,
                liveTranslationPendingLabel: d ? Ei(a) : "",
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
                url: g,
                preloadedFile: k,
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
const Ai = [
  { id: "source", label: "源文件", Icon: Rr },
  { id: "compare", label: "对照", Icon: Tr },
  { id: "translated", label: "翻译文件", Icon: Er }
];
function ki(e) {
  return e.connection === "live" ? `实时译文 · ${e.pagesByPage.size} 页` : e.connection === "reconnecting" ? "实时译文 · 重连中" : e.connection === "unavailable" ? "实时译文 · 不可用" : e.connection === "terminal" ? e.jobStatus === "failed" ? "实时译文 · 已暂停" : e.jobStatus === "cancelled" || e.jobStatus === "canceled" ? "实时译文 · 已取消" : e.jobStatus === "succeeded" ? "实时译文 · 已完成" : "实时译文 · 已结束" : e.error || "实时译文 · 连接中";
}
function Ni(e) {
  return e.id === "translated" ? e.sourceViewOnly : e.id === "compare" ? !e.documentReady || e.sourceViewOnly && !e.liveTranslationAvailable : !1;
}
function xi(e) {
  const t = ht(), {
    mode: n,
    documentReady: r,
    onModeChange: a,
    liveTranslation: o = null
  } = e, s = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, l = o ? ki(o.state) : "";
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
    /* @__PURE__ */ p("div", { className: "reader-workspace-tabs", role: "tablist", "aria-label": "阅读工作区", children: Ai.map(({ id: c, label: i, Icon: d }) => {
      const u = n === c, f = Ni({
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
const Qn = [
  { id: "markdown", label: "Markdown", Icon: Mr },
  { id: "ai", label: "AI 问答", Icon: un }
];
function Ci(e) {
  const t = ht(), { active: n } = e, r = e.onSelect ?? (t == null ? void 0 : t.assistant.select) ?? (() => {
  }), a = e.onClose ?? (t == null ? void 0 : t.assistant.close) ?? (() => {
  });
  return n ? /* @__PURE__ */ z("header", { className: "reader-assistant-dock-header", children: [
    /* @__PURE__ */ p("div", { className: "reader-assistant-dock-tabs", role: "tablist", "aria-label": "阅读辅助面板", children: Qn.map(({ id: o, label: s, Icon: l }) => {
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
function Li(e, t) {
  const n = getComputedStyle(e), r = parseFloat(n.fontSize);
  return t * r;
}
function zi(e, t) {
  const n = getComputedStyle(e.ownerDocument.documentElement), r = parseFloat(n.fontSize);
  return t * r;
}
function Di(e) {
  return e / 100 * window.innerHeight;
}
function _i(e) {
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
      r = zi(t, a);
      break;
    }
    case "em": {
      r = Li(t, a);
      break;
    }
    case "vh": {
      r = Di(a);
      break;
    }
    case "vw": {
      r = _i(a);
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
function G(e, t = "Assertion error") {
  if (!e)
    throw Error(t);
}
function tn(e, t) {
  return Array.from(t).sort(
    e === "horizontal" ? Oi : $i
  );
}
function Oi(e, t) {
  const n = e.element.offsetLeft - t.element.offsetLeft;
  return n !== 0 ? n : e.element.offsetWidth - t.element.offsetWidth;
}
function $i(e, t) {
  const n = e.element.offsetTop - t.element.offsetTop;
  return n !== 0 ? n : e.element.offsetHeight - t.element.offsetHeight;
}
function Wr(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.ELEMENT_NODE;
}
function Jr(e, t) {
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
function ji({
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
    const { x: l, y: c } = Jr(r, s), i = e === "horizontal" ? l : c;
    i < o && (o = i, a = s);
  }
  return G(a, "No rect found"), a;
}
let St;
function Ui() {
  return St === void 0 && (typeof matchMedia == "function" ? St = !!matchMedia("(pointer:coarse)").matches : St = !1), St;
}
function qr(e) {
  const { element: t, orientation: n, panels: r, separators: a } = e, o = tn(
    n,
    Array.from(t.children).filter(Wr).map((v) => ({ element: v }))
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
        const b = r.find(
          (y) => y.element === h
        );
        if (b) {
          if (f) {
            const y = f.element.getBoundingClientRect(), P = h.getBoundingClientRect();
            let w;
            if (c) {
              const g = n === "horizontal" ? new DOMRect(
                y.right,
                y.top,
                0,
                y.height
              ) : new DOMRect(
                y.left,
                y.bottom,
                y.width,
                0
              ), S = n === "horizontal" ? new DOMRect(P.left, P.top, 0, P.height) : new DOMRect(P.left, P.top, P.width, 0);
              switch (m.length) {
                case 0: {
                  w = [
                    g,
                    S
                  ];
                  break;
                }
                case 1: {
                  const k = m[0], M = ji({
                    orientation: n,
                    rects: [y, P],
                    targetRect: k.element.getBoundingClientRect()
                  });
                  w = [
                    k,
                    M === y ? S : g
                  ];
                  break;
                }
                default: {
                  w = m;
                  break;
                }
              }
            } else
              m.length ? w = m : w = [
                n === "horizontal" ? new DOMRect(
                  y.right,
                  P.top,
                  P.left - y.right,
                  P.height
                ) : new DOMRect(
                  P.left,
                  y.bottom,
                  P.width,
                  P.top - y.bottom
                )
              ];
            for (const g of w) {
              let S = "width" in g ? g : g.element.getBoundingClientRect();
              const k = Ui() ? e.resizeTargetMinimumSize.coarse : e.resizeTargetMinimumSize.fine;
              if (S.width < k) {
                const _ = k - S.width;
                S = new DOMRect(
                  S.x - _ / 2,
                  S.y,
                  S.width + _,
                  S.height
                );
              }
              if (S.height < k) {
                const _ = k - S.height;
                S = new DOMRect(
                  S.x,
                  S.y - _ / 2,
                  S.width,
                  S.height + _
                );
              }
              const M = v <= i || v > d;
              !l && !M && s.push({
                group: e,
                groupSize: Ze({ group: e }),
                panels: [f, b],
                separator: "width" in g ? void 0 : g,
                rect: S
              }), l = !1;
            }
          }
          c = !1, f = b, m = [];
        }
      } else if (h.hasAttribute("data-separator")) {
        h.ariaDisabled !== null && (l = !0);
        const b = a.find(
          (y) => y.element === h
        );
        b ? m.push(b) : (f = void 0, m = []);
      } else
        c = !0;
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
let Ve = {
  cursorFlags: 0,
  state: "inactive"
};
const vn = new Vr();
function De() {
  return Ve;
}
function Bi(e) {
  return vn.addListener("change", e);
}
function Hi(e) {
  const t = Ve, n = { ...Ve };
  n.cursorFlags = e, Ve = n, vn.emit("change", {
    prev: t,
    next: n
  });
}
function Ke(e) {
  const t = Ve;
  Ve = e, vn.emit("change", {
    prev: t,
    next: e
  });
}
const Wi = (e) => e, Bt = () => {
}, Kr = 1, Gr = 2, Yr = 4, Zr = 8, er = 3, tr = 12;
let Pt;
function nr() {
  return Pt === void 0 && (Pt = !1, typeof window < "u" && (window.navigator.userAgent.includes("Chrome") || window.navigator.userAgent.includes("Firefox")) && (Pt = !0)), Pt;
}
function Ji({
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
          const o = (e & Kr) !== 0, s = (e & Gr) !== 0, l = (e & Yr) !== 0, c = (e & Zr) !== 0;
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
    return nr() ? r > 0 && a > 0 ? "move" : r > 0 ? "ew-resize" : "ns-resize" : r > 0 && a > 0 ? "grab" : r > 0 ? "col-resize" : "row-resize";
  }
}
const rr = /* @__PURE__ */ new WeakMap();
function wn(e) {
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
      const a = Ji({
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
const Xr = new Vr();
function qi(e) {
  Se = new Map(Se), Se.delete(e);
}
function or(e, t) {
  for (const [n] of Se)
    if (n.id === e)
      return n;
}
function Ce(e, t) {
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
  return Xr.addListener("groupChange", (n) => {
    n.group.id === e && t(n);
  });
}
function Me(e, t, n) {
  const r = Se.get(e);
  Se = new Map(Se), Se.set(e, t), Xr.emit("groupChange", {
    group: e,
    isUserInteraction: (n == null ? void 0 : n.isUserInteraction) === !0,
    prev: r,
    next: t
  });
}
function Qr(e) {
  const t = De();
  let n = !1;
  switch (t.state) {
    case "active":
      Ke({
        cursorFlags: 0,
        state: "inactive"
      }), t.hitRegions.length > 0 && (wn(e), n = !0, t.hitRegions.forEach((r) => {
        const a = Ce(r.group.id, !0);
        Me(r.group, a, {
          isUserInteraction: !0
        });
      }));
  }
  return n;
}
function ar(e) {
  e.defaultPrevented || Qr(e.currentTarget);
}
function Vi(e, t, n) {
  let r, a = {
    x: 1 / 0,
    y: 1 / 0
  };
  for (const o of t) {
    const s = Jr(n, o.rect);
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
function Ki(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}
function Gi(e, t) {
  if (e === t) throw new Error("Cannot compare node with itself");
  const n = {
    a: cr(e),
    b: cr(t)
  };
  let r;
  for (; n.a.at(-1) === n.b.at(-1); )
    r = n.a.pop(), n.b.pop();
  G(
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
      const c = o[l];
      if (c === s.a) return 1;
      if (c === s.b) return -1;
    }
  }
  return Math.sign(a.a - a.b);
}
const Yi = /\b(?:position|zIndex|opacity|transform|webkitTransform|mixBlendMode|filter|webkitFilter|isolation)\b/;
function Zi(e) {
  const t = getComputedStyle(eo(e) ?? e).display;
  return t === "flex" || t === "inline-flex";
}
function Xi(e) {
  const t = getComputedStyle(e);
  return !!(t.position === "fixed" || t.zIndex !== "auto" && (t.position !== "static" || Zi(e)) || +t.opacity < 1 || "transform" in t && t.transform !== "none" || "webkitTransform" in t && t.webkitTransform !== "none" || "mixBlendMode" in t && t.mixBlendMode !== "normal" || "filter" in t && t.filter !== "none" || "webkitFilter" in t && t.webkitFilter !== "none" || "isolation" in t && t.isolation === "isolate" || Yi.test(t.willChange) || t.webkitOverflowScrolling === "touch");
}
function sr(e) {
  let t = e.length;
  for (; t--; ) {
    const n = e[t];
    if (G(n, "Missing node"), Xi(n)) return n;
  }
  return null;
}
function ir(e) {
  return e && Number(getComputedStyle(e).zIndex) || 0;
}
function cr(e) {
  const t = [];
  for (; e; )
    t.push(e), e = eo(e);
  return t;
}
function eo(e) {
  const { parentNode: t } = e;
  return Ki(t) ? t.host : t;
}
function Qi(e, t) {
  return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function ec({
  groupElement: e,
  hitRegion: t,
  pointerEventTarget: n
}) {
  if (!Wr(n) || n.contains(e) || e.contains(n))
    return !0;
  if (Gi(n, e) > 0) {
    let r = n;
    for (; r; ) {
      if (r.contains(e))
        return !0;
      if (Qi(r.getBoundingClientRect(), t))
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
    const o = qr(a), s = Vi(a.orientation, o, {
      x: e.clientX,
      y: e.clientY
    });
    s && s.distance.x <= 0 && s.distance.y <= 0 && ec({
      groupElement: a.element,
      hitRegion: s.hitRegion.rect,
      pointerEventTarget: e.target
    }) && n.push(s.hitRegion);
  }), n;
}
function tc(e, t) {
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
  G(d != null, "Invalid first pivot index"), G(u != null, "Invalid second pivot index");
  let f = 0;
  switch (o) {
    case "keyboard": {
      {
        const h = e < 0 ? u : d, b = n[h];
        G(
          b,
          `Panel constraints not found for index ${h}`
        );
        const {
          collapsedSize: y = 0,
          collapsible: P,
          minSize: w = 0
        } = b;
        if (P) {
          const g = l[h];
          if (G(
            g != null,
            `Previous layout not found for panel index ${h}`
          ), ue(g, y)) {
            const S = w - g;
            we(S, Math.abs(e)) > 0 && (e = e < 0 ? 0 - S : S);
          }
        }
      }
      {
        const h = e < 0 ? d : u, b = n[h];
        G(
          b,
          `No panel constraints found for index ${h}`
        );
        const {
          collapsedSize: y = 0,
          collapsible: P,
          minSize: w = 0
        } = b;
        if (P) {
          const g = l[h];
          if (G(
            g != null,
            `Previous layout not found for panel index ${h}`
          ), ue(g, w)) {
            const S = g - y;
            we(S, Math.abs(e)) > 0 && (e = e < 0 ? 0 - S : S);
          }
        }
      }
      break;
    }
    default: {
      const h = e < 0 ? u : d, b = n[h];
      G(
        b,
        `Panel constraints not found for index ${h}`
      );
      const y = l[h], { collapsible: P, collapsedSize: w, minSize: g } = b;
      if (P && we(y, g) < 0)
        if (e > 0) {
          const S = g - w, k = S / 2, M = y + e;
          we(M, g) < 0 && (e = we(e, k) <= 0 ? 0 : S);
        } else {
          const S = g - w, k = 100 - S / 2, M = y - e;
          we(M, g) < 0 && (e = we(100 + e, k) > 0 ? 0 : -S);
        }
      break;
    }
  }
  {
    const h = e < 0 ? 1 : -1;
    let b = e < 0 ? u : d, y = 0;
    for (; ; ) {
      const w = l[b];
      G(
        w != null,
        `Previous layout not found for panel index ${b}`
      );
      const g = Je({
        overrideDisabledPanels: s,
        panelConstraints: n[b],
        prevSize: w,
        size: 100
      }) - w;
      if (y += g, b += h, b < 0 || b >= n.length)
        break;
    }
    const P = Math.min(Math.abs(e), Math.abs(y));
    e = e < 0 ? 0 - P : P;
  }
  {
    let h = e < 0 ? d : u;
    for (; h >= 0 && h < n.length; ) {
      const b = Math.abs(e) - Math.abs(f), y = l[h];
      G(
        y != null,
        `Previous layout not found for panel index ${h}`
      );
      const P = y - b, w = Je({
        overrideDisabledPanels: s,
        panelConstraints: n[h],
        prevSize: y,
        size: P
      });
      if (!ue(y, w) && (f += y - w, i[h] = w, f.toFixed(3).localeCompare(Math.abs(e).toFixed(3), void 0, {
        numeric: !0
      }) >= 0))
        break;
      e < 0 ? h-- : h++;
    }
  }
  if (tc(c, i))
    return a;
  {
    const h = e < 0 ? u : d, b = l[h];
    G(
      b != null,
      `Previous layout not found for panel index ${h}`
    );
    const y = b + f, P = Je({
      overrideDisabledPanels: s,
      panelConstraints: n[h],
      prevSize: b,
      size: y
    });
    if (i[h] = P, !ue(P, y)) {
      let w = y - P, g = e < 0 ? u : d;
      for (; g >= 0 && g < n.length; ) {
        const S = i[g];
        G(
          S != null,
          `Previous layout not found for panel index ${g}`
        );
        const k = S + w, M = Je({
          overrideDisabledPanels: s,
          panelConstraints: n[g],
          prevSize: S,
          size: k
        });
        if (ue(S, M) || (w -= M - S, i[g] = M), ue(w, 0))
          break;
        e > 0 ? g-- : g++;
      }
    }
  }
  const m = Object.values(i).reduce(
    (h, b) => b + h,
    0
  );
  if (!ue(m, 100, 0.1))
    return a;
  const v = Object.keys(a);
  return i.reduce((h, b, y) => (h[v[y]] = b, h), {});
}
function _e(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (t[n] === void 0 || we(e[n], t[n]) !== 0)
      return !1;
  return !0;
}
function Fe({
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
      G(c != null, `No layout data found for index ${l}`);
      const i = 100 / a * c;
      r[l] = i;
    }
  let o = 0;
  for (let l = 0; l < t.length; l++) {
    const c = n[l];
    G(c != null, `No layout data found for index ${l}`);
    const i = r[l];
    G(i != null, `No layout data found for index ${l}`);
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
      G(c != null, `No layout data found for index ${l}`);
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
function to({
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
    const f = o(), m = i.findIndex((b) => b.id === t), v = m === 0, h = m === i.length - 1;
    if (h && c < f && (v || i.slice(0, m).every((b, y) => {
      const P = u[y];
      return (P == null ? void 0 : P.collapsible) && ue(P.collapsedSize, d[P.panelId]);
    }))) {
      const b = i.slice(0, m).reduce((y, P) => y + d[P.id], 0);
      return {
        ...d,
        [t]: fe(100 - b)
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
    } = n(), b = s({
      nextSize: c,
      panels: f.panels,
      prevLayout: v,
      derivedPanelConstraints: u
    }), y = Fe({
      layout: b,
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
function lr(e) {
  if (e.defaultPrevented)
    return;
  const t = $e();
  Pn(e, t).forEach((n) => {
    if (n.separator && !n.separator.disableDoubleClick) {
      const r = n.panels.find(
        (a) => a.panelConstraints.defaultSize !== void 0
      );
      if (r) {
        const a = r.panelConstraints.defaultSize, o = to({
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
function no({
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
      } = t(), i = Fe({
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
  const n = It(e), r = Ce(n.id, !0), a = n.separators.find(
    (d) => d.element === e
  );
  G(a, "Matching separator not found");
  const o = r.separatorToPanels.get(a);
  G(o, "Matching panels not found");
  const s = o.map((d) => n.panels.indexOf(d)), l = no({ groupId: n.id }).getLayout(), c = ut({
    delta: t,
    initialLayout: l,
    panelConstraints: r.derivedPanelConstraints,
    pivotIndices: s,
    prevLayout: l,
    trigger: "keyboard"
  }), i = Fe({
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
        const r = It(t), a = Ce(r.id, !0), { derivedPanelConstraints: o, layout: s, separatorToPanels: l } = a, c = r.separators.find(
          (f) => f.element === t
        );
        G(c, "Matching separator not found");
        const i = l.get(c);
        G(i, "Matching panels not found");
        const d = i[0], u = o.find(
          (f) => f.panelId === d.id
        );
        if (G(u, "Panel metadata not found"), u.collapsible) {
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
        G(a !== null, "Index not found");
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
  }), Ke({
    cursorFlags: 0,
    hitRegions: n,
    initialLayoutMap: r,
    pointerDownAtPoint: { x: e.clientX, y: e.clientY },
    state: "active"
  }), n.length && e.preventDefault();
}
function ro({
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
    const b = r.get(d), y = a.get(d);
    if (!b || !y)
      return;
    const {
      defaultLayoutDeferred: P,
      derivedPanelConstraints: w,
      groupSize: g,
      layout: S,
      separatorToPanels: k
    } = y;
    if (w && S && k) {
      const M = ut({
        delta: h,
        initialLayout: b,
        panelConstraints: w,
        pivotIndices: i.panels.map((_) => m.indexOf(_)),
        prevLayout: S,
        trigger: "mouse-or-touch"
      });
      if (_e(M, S)) {
        if (h !== 0 && !v)
          switch (f) {
            case "horizontal": {
              l |= h < 0 ? Kr : Gr;
              break;
            }
            case "vertical": {
              l |= h < 0 ? Yr : Zr;
              break;
            }
          }
      } else
        Me(i.group, {
          defaultLayoutDeferred: P,
          derivedPanelConstraints: w,
          groupSize: g,
          layout: M,
          separatorToPanels: k
        });
    }
  });
  let c = 0;
  t.movementX === 0 ? c |= s & er : c |= l & er, t.movementY === 0 ? c |= s & tr : c |= l & tr, Hi(c), wn(e);
}
function fr(e) {
  const t = $e(), n = De();
  switch (n.state) {
    case "active":
      ro({
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
        Ke({
          cursorFlags: 0,
          state: "inactive"
        }), t.hitRegions.forEach((o) => {
          const s = Ce(o.group.id, !0);
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
      ro({
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
      o.length === 0 ? t.state !== "inactive" && Ke({
        cursorFlags: 0,
        state: "inactive"
      }) : Ke({
        cursorFlags: 0,
        hitRegions: o,
        state: "hover"
      }), wn(e.currentTarget);
      break;
    }
  }
}
function pr(e) {
  if (e.relatedTarget instanceof HTMLIFrameElement)
    switch (De().state) {
      case "hover":
        Ke({
          cursorFlags: 0,
          state: "inactive"
        });
    }
}
function hr(e) {
  e.defaultPrevented || e.pointerType === "mouse" && e.button > 0 || Qr(e.currentTarget) && e.preventDefault();
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
function nc(e, t, n) {
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
function rc(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function oc({
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
function ac(e, t) {
  const n = e.map((a) => a.id), r = Object.keys(t);
  if (n.length !== r.length)
    return !1;
  for (const a of n)
    if (!r.includes(a))
      return !1;
  return !0;
}
const Be = /* @__PURE__ */ new Map();
function sc(e) {
  let t = !0;
  G(
    e.element.ownerDocument.defaultView,
    "Cannot register an unmounted Group"
  );
  const n = e.element.ownerDocument.defaultView.ResizeObserver, r = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set(), o = new n((v) => {
    for (const h of v) {
      const { borderBoxSize: b, target: y } = h;
      if (y === e.element) {
        if (t) {
          const P = Ze({ group: e });
          if (P === 0)
            return;
          const w = Ce(e.id);
          if (!w)
            return;
          const g = en(e), S = w.defaultLayoutDeferred ? gr(g) : w.layout, k = oc({
            group: e,
            nextGroupSize: P,
            prevGroupSize: w.groupSize,
            prevLayout: S
          }), M = Fe({
            layout: k,
            panelConstraints: g
          });
          if (!w.defaultLayoutDeferred && _e(w.layout, M) && rc(
            w.derivedPanelConstraints,
            g
          ) && w.groupSize === P)
            return;
          Me(e, {
            defaultLayoutDeferred: !1,
            derivedPanelConstraints: g,
            groupSize: P,
            layout: M,
            separatorToPanels: w.separatorToPanels
          });
        }
      } else
        nc(e, y, b);
    }
  });
  o.observe(e.element), e.panels.forEach((v) => {
    G(
      !r.has(v.id),
      `Panel ids must be unique; id "${v.id}" was used more than once`
    ), r.add(v.id), v.onResize && o.observe(v.element);
  });
  const s = Ze({ group: e }), l = en(e), c = e.panels.map(({ id: v }) => v).join(",");
  let i = e.mutableState.defaultLayout;
  i && (ac(e.panels, i) || (i = void 0));
  const d = e.mutableState.layouts[c] ?? i ?? gr(l), u = Fe({
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
    G(
      !a.has(v.id),
      `Separator ids must be unique; id "${v.id}" was used more than once`
    ), a.add(v.id), v.element.addEventListener("keydown", dr);
  }), Be.get(f) === 1 && (f.addEventListener("contextmenu", ar, !0), f.addEventListener("dblclick", lr, !0), f.addEventListener("pointerdown", ur, !0), f.addEventListener("pointerleave", fr), f.addEventListener("pointermove", mr), f.addEventListener("pointerout", pr), f.addEventListener("pointerup", hr, !0)), function() {
    t = !1, Be.set(
      f,
      Math.max(0, (Be.get(f) ?? 0) - 1)
    ), qi(e), e.separators.forEach((v) => {
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
function ic() {
  const [e, t] = C({}), n = N(() => t({}), []);
  return [e, n];
}
function In(e) {
  const t = ln();
  return `${e ?? t}`;
}
const je = typeof window < "u" ? Oe : O;
function at(e) {
  const t = x(e);
  return je(() => {
    t.current = e;
  }, [e]), N(
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
const oo = sn(null);
function cc(e, t) {
  const n = x({
    getLayout: () => ({}),
    setLayout: Wi
  });
  an(t, () => n.current, []), je(() => {
    Object.assign(
      n.current,
      no({ groupId: e })
    );
  });
}
function ao({
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
  }), b = at(
    (R, I) => {
      _e(v.current.onLayoutChanged, R) || (v.current.onLayoutChanged = R, i == null || i(R, { isUserInteraction: I }));
    }
  ), y = In(l), P = x(null), [w, g] = ic(), S = x({
    lastExpandedPanelSizes: {},
    layouts: {},
    panels: [],
    resizeTargetMinimumSize: u,
    separators: []
  }), k = Rn(P, o);
  cc(y, s);
  const M = at(
    (R, I) => {
      const A = De(), D = or(R), L = Ce(R);
      if (L) {
        let $ = !1;
        switch (A.state) {
          case "active": {
            $ = A.hitRegions.some(
              (B) => B.group === D
            );
            break;
          }
        }
        return {
          flexGrow: L.layout[I] ?? 1,
          pointerEvents: $ ? "none" : void 0
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
  }), T = J(
    () => ({
      get disableCursor() {
        return !!_.disableCursor;
      },
      getPanelStyles: M,
      id: y,
      orientation: d,
      registerPanel: (R) => {
        const I = S.current;
        return I.panels = tn(d, [
          ...I.panels,
          R
        ]), g(), () => {
          I.panels = I.panels.filter(
            (A) => A !== R
          ), g();
        };
      },
      registerSeparator: (R) => {
        const I = S.current;
        return I.separators = tn(d, [
          ...I.separators,
          R
        ]), g(), () => {
          I.separators = I.separators.filter(
            (A) => A !== R
          ), g();
        };
      },
      updatePanelProps: (R, { disabled: I }) => {
        const A = S.current.panels.find(
          ($) => $.id === R
        );
        A && (A.panelConstraints.disabled = I);
        const D = or(y), L = Ce(y);
        D && L && Me(D, {
          ...L,
          derivedPanelConstraints: en(D)
        });
      },
      updateSeparatorProps: (R, {
        disabled: I,
        disableDoubleClick: A
      }) => {
        const D = S.current.separators.find(
          (L) => L.id === R
        );
        D && (D.disabled = I, D.disableDoubleClick = A);
      }
    }),
    [M, y, g, d, _]
  ), E = x(null);
  return je(() => {
    const R = P.current;
    if (R === null)
      return;
    const I = S.current;
    let A;
    if (_.defaultLayout !== void 0 && Object.keys(_.defaultLayout).length === I.panels.length) {
      A = {};
      for (const oe of I.panels) {
        const ne = _.defaultLayout[oe.id];
        ne !== void 0 && (A[oe.id] = ne);
      }
    }
    const D = {
      disabled: !!a,
      element: R,
      id: y,
      mutableState: {
        defaultLayout: A,
        disableCursor: !!_.disableCursor,
        expandedPanelSizes: S.current.lastExpandedPanelSizes,
        layouts: S.current.layouts
      },
      orientation: d,
      panels: I.panels,
      resizeTargetMinimumSize: I.resizeTargetMinimumSize,
      separators: I.separators
    };
    E.current = D;
    const L = sc(D), { defaultLayoutDeferred: $, derivedPanelConstraints: B, layout: Y } = Ce(D.id, !0);
    !$ && B.length > 0 && (h(Y), b(Y, !1));
    const re = Sn(y, (oe) => {
      const { defaultLayoutDeferred: ne, derivedPanelConstraints: se, layout: U } = oe.next;
      if (ne || se.length === 0)
        return;
      const V = D.panels.map(({ id: X }) => X).join(",");
      D.mutableState.layouts[V] = U, se.forEach((X) => {
        if (X.collapsible) {
          const { layout: de } = oe.prev ?? {};
          if (de) {
            const he = ue(
              X.collapsedSize,
              U[X.panelId]
            ), pe = ue(
              X.collapsedSize,
              de[X.panelId]
            );
            he && !pe && (D.mutableState.expandedPanelSizes[X.panelId] = de[X.panelId]);
          }
        }
      });
      const Z = De().state !== "active";
      h(U), Z && b(U, oe.isUserInteraction);
    });
    return () => {
      E.current = null, L(), re();
    };
  }, [
    a,
    y,
    b,
    h,
    d,
    w,
    _
  ]), O(() => {
    const R = E.current;
    R && (R.mutableState.defaultLayout = n, R.mutableState.disableCursor = !!r);
  }), /* @__PURE__ */ p(oo.Provider, { value: T, children: /* @__PURE__ */ p(
    "div",
    {
      ...m,
      className: t,
      "data-group": !0,
      "data-testid": y,
      id: y,
      ref: k,
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
ao.displayName = "Group";
function En() {
  const e = cn(oo);
  return G(
    e,
    "Group Context not found; did you render a Panel or Separator outside of a Group?"
  ), e;
}
function lc(e, t) {
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
      to({ groupId: n, panelId: e })
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
  const h = !!c, b = In(c), y = Tn({
    disabled: o
  }), P = x(null), w = Rn(P, s), {
    getPanelStyles: g,
    id: S,
    orientation: k,
    registerPanel: M,
    updatePanelProps: _
  } = En(), T = u !== null, E = at(
    (D, L, $) => {
      u == null || u(D, c, $);
    }
  );
  je(() => {
    const D = P.current;
    if (D !== null) {
      const L = {
        element: D,
        id: b,
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
      return M(L);
    }
  }, [
    l,
    n,
    r,
    a,
    T,
    b,
    h,
    i,
    d,
    E,
    M,
    y
  ]), O(() => {
    _(b, { disabled: o });
  }, [o, b, _]), lc(b, f);
  const R = () => {
    const D = g(S, b);
    if (D)
      return JSON.stringify(D);
  }, I = po(
    (D) => Sn(S, D),
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
      "data-testid": b,
      id: b,
      ref: w,
      style: {
        ...dc,
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
            touchAction: k === "horizontal" ? "pan-y" : "pan-x"
          },
          children: e
        }
      )
    }
  );
}
nn.displayName = "Panel";
const dc = {
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
function uc({
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
    o = Fe({
      layout: ut({
        delta: i - s,
        initialLayout: e,
        panelConstraints: t,
        pivotIndices: d,
        prevLayout: e
      }),
      panelConstraints: t
    })[n], a = Fe({
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
function so({
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
  }), [d, u] = C({}), [f, m] = C("inactive"), [v, h] = C(!1), b = x(null), y = Rn(b, a), {
    disableCursor: P,
    id: w,
    orientation: g,
    registerSeparator: S,
    updateSeparatorProps: k
  } = En(), M = g === "horizontal" ? "vertical" : "horizontal";
  je(() => {
    const E = b.current;
    if (E !== null) {
      const R = {
        disabled: i.disabled,
        disableDoubleClick: i.disableDoubleClick,
        element: E,
        id: c
      }, I = S(R), A = Bi(
        (L) => {
          m(
            L.next.state !== "inactive" && L.next.hitRegions.some(
              ($) => $.separator === R
            ) ? L.next.state : "inactive"
          );
        }
      ), D = Sn(
        w,
        (L) => {
          const { derivedPanelConstraints: $, layout: B, separatorToPanels: Y } = L.next, re = Y.get(R);
          if (re) {
            const oe = re[0], ne = re.indexOf(oe);
            u(
              uc({
                layout: B,
                panelConstraints: $,
                panelId: oe.id,
                panelIndex: ne
              })
            );
          }
        }
      );
      return () => {
        A(), D(), I();
      };
    }
  }, [w, c, S, i]), O(() => {
    k(c, { disabled: n, disableDoubleClick: r });
  }, [n, r, c, k]);
  let _;
  n && !P && (_ = "not-allowed");
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
so.displayName = "Separator";
const Mn = 30, An = 65, ft = 50, fc = 100 - An, mc = 100 - Mn;
function pc(e) {
  const t = Number(e);
  return Number.isFinite(t) ? Math.min(An, Math.max(Mn, t)) : ft;
}
function kn(e) {
  return 100 - e;
}
function He(e) {
  return `${e}%`;
}
const Nn = "reader-document", mt = "reader-assistant", io = "retainpdf.reader.ai-split-layout.v1", hc = {
  [Nn]: kn(ft),
  [mt]: ft
};
function xn(e) {
  const t = pc(e == null ? void 0 : e[mt]);
  return {
    [Nn]: kn(t),
    [mt]: t
  };
}
function gc() {
  try {
    const e = JSON.parse(localStorage.getItem(io) || "null");
    return xn(e);
  } catch {
    return hc;
  }
}
function bc(e) {
  try {
    localStorage.setItem(io, JSON.stringify(xn(e)));
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
function yc() {
  const e = x(null), [t] = C(gc);
  Oe(() => {
    const a = e.current;
    return Ht(a, t), () => {
      var o;
      (o = a == null ? void 0 : a.closest(".reader-react-root")) == null || o.style.removeProperty("--reader-ai-split-width");
    };
  }, [t]);
  const n = N((a) => {
    Ht(e.current, a);
  }, []), r = N((a, o) => {
    Ht(e.current, a), o.isUserInteraction && bc(a);
  }, []);
  return /* @__PURE__ */ z(
    ao,
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
            defaultSize: He(kn(ft)),
            minSize: He(fc),
            maxSize: He(mc)
          }
        ),
        /* @__PURE__ */ p(
          so,
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
            maxSize: He(An)
          }
        )
      ]
    }
  );
}
const Ne = 12, vc = 4;
function qe(e, t, n) {
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
  return qe(window.innerWidth - t - 20, 72, e);
}
function wc(e, t) {
  try {
    const n = localStorage.getItem(e);
    if (!n) return br(t);
    const r = JSON.parse(n);
    if (typeof r.x == "number" && typeof r.y == "number")
      return qe(r.x, r.y, t);
  } catch {
  }
  return br(t);
}
function Sc(e, t) {
  try {
    localStorage.setItem(e, JSON.stringify(t));
  } catch {
  }
}
function Pc({
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
  const v = i === "workspace", h = i === "dock-right", b = h || v, [y, P] = C(() => wc(o, c)), [w, g] = C(!1), S = x(null);
  O(() => {
    !t || b || P((T) => qe(T.x, T.y, c));
  }, [b, t, c]), O(() => {
    if (!t || b) return;
    const T = () => P((E) => qe(E.x, E.y, c));
    return window.addEventListener("resize", T), () => window.removeEventListener("resize", T);
  }, [b, t, c]), O(() => {
    if (!t) return;
    const T = (E) => {
      var I;
      if (E.key !== "Escape") return;
      const R = E.target;
      (I = R == null ? void 0 : R.closest) != null && I.call(R, "textarea, input, select, [contenteditable='true']") || (E.preventDefault(), u());
    };
    return window.addEventListener("keydown", T), () => window.removeEventListener("keydown", T);
  }, [t, u]);
  const k = N((T) => {
    var E, R;
    b || T.button === 0 && ((R = (E = T.target) == null ? void 0 : E.closest) != null && R.call(E, "button") || (T.currentTarget.setPointerCapture(T.pointerId), S.current = {
      pointerId: T.pointerId,
      startX: T.clientX,
      startY: T.clientY,
      originX: y.x,
      originY: y.y,
      moved: !1
    }, g(!0)));
  }, [b, y.x, y.y]), M = N((T) => {
    const E = S.current;
    if (!E || E.pointerId !== T.pointerId) return;
    const R = T.clientX - E.startX, I = T.clientY - E.startY;
    !E.moved && Math.hypot(R, I) < vc || (E.moved = !0, P(qe(E.originX + R, E.originY + I, c)));
  }, [c]), _ = N((T) => {
    const E = S.current;
    if (!(!E || E.pointerId !== T.pointerId)) {
      S.current = null, g(!1);
      try {
        T.currentTarget.releasePointerCapture(T.pointerId);
      } catch {
      }
      E.moved && P((R) => {
        const I = qe(R.x, R.y, c);
        return Sc(o, I), I;
      });
    }
  }, [o, c]);
  return t ? /* @__PURE__ */ z(
    "aside",
    {
      id: e,
      className: `reader-notes-panel reader-notes-panel--${v ? "workspace" : h ? "docked" : "float"}${b ? "" : " reader-floating-surface"}${d ? " has-panel-header" : " is-headerless"}${f ? " has-panel-toolbar" : ""}${w ? " is-dragging" : ""} ${l}`.trim(),
      style: b ? void 0 : { left: y.x, top: y.y, width: Math.min(c, typeof window < "u" ? window.innerWidth - 24 : c) },
      "aria-label": s,
      role: "dialog",
      "aria-modal": "false",
      children: [
        d ? /* @__PURE__ */ z(
          "header",
          {
            className: "reader-notes-panel-head",
            onPointerDown: k,
            onPointerMove: M,
            onPointerUp: _,
            onPointerCancel: _,
            children: [
              b ? null : /* @__PURE__ */ p("div", { className: "reader-notes-panel-drag", "aria-hidden": "true", children: /* @__PURE__ */ p(_o, { size: 14, strokeWidth: 2.25 }) }),
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
function Ic({
  note: e,
  onJump: t,
  onUpdateNote: n,
  onRemove: r
}) {
  const [a, o] = C(!1), [s, l] = C(e.note);
  return O(() => {
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
function Rc({
  open: e,
  groups: t,
  count: n,
  onClose: r,
  onJump: a,
  onUpdateNote: o,
  onRemove: s,
  onExport: l
}) {
  const [c, i] = C(!1);
  return /* @__PURE__ */ p(
    Pc,
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
          Ic,
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
function Tc({
  regionsFailed: e = !1,
  metadataFailed: t = !1
}) {
  const [n, r] = C(!1);
  if (O(() => {
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
function Ec({
  loading: e,
  failed: t,
  text: n,
  percent: r,
  regionsError: a = !1,
  metadataError: o = !1
}) {
  return !e && !t ? /* @__PURE__ */ p(Tc, { regionsFailed: a, metadataFailed: o }) : /* @__PURE__ */ z(kt, { children: [
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
async function Mc(e) {
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
  const [a, o] = C(!1), s = e ? e.selectionType === "text" ? `${e.pane}:${e.page}:${e.quote}` : `${e.region.itemId}:${e.pane}` : "";
  if (O(() => o(!1), [s]), !e)
    return null;
  const l = typeof window < "u" ? window.innerWidth : 800, c = typeof window < "u" ? window.innerHeight : 600, i = e.rect.left + e.rect.width / 2, d = 170, u = Math.min(Math.max(16 + d, i), l - 16 - d), f = e.rect.top > 72, m = f ? Math.max(12, e.rect.top - 8) : Math.min(c - 12, e.rect.top + e.rect.height + 8), v = f ? "above" : "below", h = e.pane === "translated" ? "译文" : "原文", b = e.selectionType === "text" ? "text" : e.kind, y = e.selectionType === "text" ? e.quote : Ir(e.region, e.pane), P = b === "formula" ? "公式" : b === "table" ? "表格" : b === "figure" ? "图片" : b === "text" ? "文字" : "区域", w = b === "formula" ? Ao(y) : y, g = b === "formula" ? Fo : b === "table" ? Oo : b === "text" ? $o : jo;
  return /* @__PURE__ */ z(
    "div",
    {
      className: `reader-sel-pop reader-sel-pop--${v} reader-sel-pop--region`,
      style: { left: u, top: m },
      role: "toolbar",
      "aria-label": "选区操作",
      onPointerDown: (S) => {
        S.preventDefault();
      },
      children: [
        /* @__PURE__ */ z("div", { className: "reader-sel-pop-card reader-floating-surface", children: [
          /* @__PURE__ */ z("div", { className: "reader-sel-pop-context", children: [
            /* @__PURE__ */ p(g, { size: 15, strokeWidth: 2.1, "aria-hidden": !0 }),
            /* @__PURE__ */ p("span", { children: P }),
            /* @__PURE__ */ p("span", { className: "reader-sel-pop-context-divider", "aria-hidden": !0, children: "·" }),
            /* @__PURE__ */ p("span", { children: h }),
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
                    await Mc(w), o(!0), window.setTimeout(() => o(!1), 1400);
                  } catch (S) {
                    console.warn("[reader-selection] copy failed", S);
                  }
                },
                children: [
                  a ? /* @__PURE__ */ p(Uo, { size: 15, strokeWidth: 2.4, "aria-hidden": !0 }) : /* @__PURE__ */ p(Bo, { size: 15, strokeWidth: 2.2, "aria-hidden": !0 }),
                  /* @__PURE__ */ p("span", { children: a ? "已复制" : b === "formula" ? "复制 LaTeX" : "复制" })
                ]
              }
            ) : /* @__PURE__ */ p("span", { className: "reader-sel-pop-selection-hint", children: "已选择图片" }),
            r && w ? /* @__PURE__ */ z(
              "button",
              {
                type: "button",
                className: "reader-sel-pop-btn reader-sel-pop-btn--secondary",
                onClick: () => r({ page: e.page, pane: e.pane, quote: w }),
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
function kc(e) {
  if (!(e instanceof HTMLElement)) return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
function Nc() {
  const [e, t] = C(!1), n = ln(), r = x(null);
  return O(() => {
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
  }, [e]), O(() => {
    const a = (o) => {
      if (o.defaultPrevented || o.metaKey || o.ctrlKey || o.altKey || kc(o.target)) return;
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
          /* @__PURE__ */ p("div", { className: "reader-react-shortcuts-body", children: Us.map((a) => /* @__PURE__ */ z("section", { className: "reader-react-shortcuts-group", children: [
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
const xc = Object.freeze([
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
]), Cc = ["source", "sideBySide", "translated"], Lc = { source: "", translated: "", sideBySide: "" };
function zc(e) {
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
function Dc(e) {
  const [t, n] = C(() => /* @__PURE__ */ new Set()), r = J(
    () => e ? zc(e) : Lc,
    [e]
  ), a = J(
    () => Cc.filter((s) => !(e != null && e.sourceOnly && s !== "source")),
    [e == null ? void 0 : e.sourceOnly]
  ), o = N(async (s) => {
    if (!e) return;
    const l = it(r[s]);
    if (!(!l || t.has(s)))
      try {
        const c = e.jobId ? sa(s, {
          jobId: e.jobId,
          jobPayload: e.jobPayload,
          manifestPayload: e.manifestPayload
        }) : `${e.sourceOnly ? "document" : "reader"}-${s}.pdf`;
        await ca(
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
        la(i), n((d) => {
          const u = new Set(d);
          return u.delete(s), u;
        });
      }
  }, [r, t, e]);
  return { urls: r, downloadItems: a, busyActions: t, handleDownload: o };
}
function _c(e) {
  const [t, n] = C(!1), r = N(() => n(!1), []), a = N(() => n((o) => !o), []);
  return O(() => {
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
const co = "retainpdf.reader.fab.pos.v1", At = 52, We = 12, Fc = 6;
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
function Oc() {
  try {
    const e = localStorage.getItem(co);
    if (!e) return yr();
    const t = JSON.parse(e);
    if (typeof t.x == "number" && typeof t.y == "number")
      return st(t.x, t.y);
  } catch {
  }
  return yr();
}
function $c(e) {
  try {
    localStorage.setItem(co, JSON.stringify(e));
  } catch {
  }
}
function jc(e) {
  return typeof window < "u" && e.y > window.innerHeight * 0.55;
}
function Uc(e = {}) {
  const { onDragStart: t, onActivate: n } = e, [r, a] = C(() => Oc()), o = x(null);
  O(() => {
    const i = () => a((d) => st(d.x, d.y));
    return window.addEventListener("resize", i), () => window.removeEventListener("resize", i);
  }, []);
  const s = N((i) => {
    i.button === 0 && (i.currentTarget.setPointerCapture(i.pointerId), o.current = {
      pointerId: i.pointerId,
      startX: i.clientX,
      startY: i.clientY,
      originX: r.x,
      originY: r.y,
      moved: !1
    });
  }, [r.x, r.y]), l = N((i) => {
    const d = o.current;
    if (!d || d.pointerId !== i.pointerId) return;
    const u = i.clientX - d.startX, f = i.clientY - d.startY;
    !d.moved && Math.hypot(u, f) < Fc || (d.moved || (d.moved = !0, t == null || t()), a(st(d.originX + u, d.originY + f)));
  }, [t]), c = N((i) => {
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
          return $c(f), f;
        });
        return;
      }
      n == null || n();
    }
  }, [n]);
  return {
    pos: r,
    openUp: jc(r),
    onPointerDown: s,
    onPointerMove: l,
    onPointerUp: c
  };
}
const Bc = {
  source: Rr,
  sideBySide: Tr,
  translated: Er
}, Hc = {
  source: "原文",
  sideBySide: "对照",
  translated: "译文"
};
function Wc({ onClose: e }) {
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
function Jc({
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
      /* @__PURE__ */ p(Wo, { size: 12, strokeWidth: 2.5, "aria-hidden": !0 }),
      /* @__PURE__ */ p("span", { children: "下载 PDF" })
    ] }),
    /* @__PURE__ */ p("div", { className: "reader-fab-download-grid", children: t.map((a, o) => {
      const s = vo[a], l = it(e[a]), c = n.has(a), i = !!l && !c, d = i ? "" : wo(a, e), u = Bc[a];
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
            /* @__PURE__ */ p("span", { className: "reader-fab-chip-label", children: Hc[a] }),
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
  favorites: Jo,
  markdown: Mr,
  ai: un,
  notes: xt
}, Kc = xc;
function Gc(e) {
  const { activeTool: t, noteCount: n, onToggleTool: r } = e, a = ht(), o = e.sourceOnly ?? (a == null ? void 0 : a.sourceOnly) ?? !1, s = e.download ?? (a == null ? void 0 : a.download), l = x(null), c = ln(), { open: i, setOpen: d, closeMenu: u, toggleMenu: f } = _c(l), { pos: m, openUp: v, onPointerDown: h, onPointerMove: b, onPointerUp: y } = Uc({
    onDragStart: u,
    onActivate: f
  }), { urls: P, downloadItems: w, busyActions: g, handleDownload: S } = Dc(s), k = N((M) => {
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
              /* @__PURE__ */ p(Wc, { onClose: u }),
              (() => {
                const M = t === "notes";
                return /* @__PURE__ */ z(
                  "button",
                  {
                    type: "button",
                    role: "menuitem",
                    className: `reader-fab-row${M ? " is-active" : ""}`,
                    "aria-pressed": M,
                    onClick: () => k("notes"),
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
              Kc.map((M, _) => {
                const T = Vc[M.id], E = t === M.id, R = M.needsJob && o;
                let I = E ? M.subOpen : M.subIdle;
                return R && (I = "需打开任务阅读"), /* @__PURE__ */ p(
                  Jc,
                  {
                    index: _,
                    icon: T,
                    title: M.label,
                    sub: I,
                    active: E,
                    disabled: R,
                    onClick: () => k(M.id)
                  },
                  M.id
                );
              }),
              /* @__PURE__ */ p(
                qc,
                {
                  urls: P,
                  items: w,
                  busyActions: g,
                  onDownload: S
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
            onPointerMove: b,
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
function Yc(e) {
  const t = ht(), n = Ii(), { mode: r = "compare", modeControls: a } = e, o = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? pt, s = e.onZoomChange ?? (t == null ? void 0 : t.onZoomChange) ?? (() => {
  }), l = e.currentPage ?? (n == null ? void 0 : n.currentPage) ?? 1, c = e.numPages ?? (n == null ? void 0 : n.numPages) ?? 0, i = e.onGoToPage ?? (t == null ? void 0 : t.goToPage), d = qa(o), u = o > xr + 1e-3, f = o < Cr - 1e-3, m = ot(), v = "50%（半屏，对照铺满）", [h, b] = C(!1), [y, P] = C(`${l}`);
  O(() => {
    h || P(`${Math.min(Math.max(l, 1), Math.max(c, 1))}`);
  }, [l, c, h]);
  const w = () => {
    if (b(!1), !i || c <= 0)
      return;
    const g = Number(`${y}`.trim());
    i(Mt(g, c));
  };
  return /* @__PURE__ */ z("div", { className: "reader-react-hud", "data-reader-hud": "true", children: [
    a ? /* @__PURE__ */ p("div", { className: "reader-react-hud-group reader-react-hud-modes", children: a }) : null,
    /* @__PURE__ */ p("div", { className: "reader-react-hud-group", "aria-label": "页码", children: h ? /* @__PURE__ */ z(
      "form",
      {
        className: "reader-react-hud-page-form",
        onSubmit: (g) => {
          g.preventDefault(), w();
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
              onChange: (g) => P(g.target.value.replace(/[^\d]/g, "")),
              onBlur: w,
              onKeyDown: (g) => {
                g.key === "Escape" && (g.preventDefault(), b(!1), P(`${l}`));
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
          !i || c <= 0 || (P(`${l}`), b(!0));
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
    /* @__PURE__ */ p("div", { className: "reader-react-hud-group reader-react-hud-help", "aria-label": "帮助", children: /* @__PURE__ */ p(Nc, {}) })
  ] });
}
function lo(e) {
  const t = `${e.jobId || ""}`.trim(), n = `${e.documentId || ""}`.trim();
  return t ? `retainpdf.reader.notes.v1:job:${t}` : n ? `retainpdf.reader.notes.v1:doc:${n}` : "retainpdf.reader.notes.v1:anonymous";
}
function Zc() {
  return typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function Xc(e) {
  return {
    pageIdx: Number(e.page) - 1,
    quoteText: e.quote,
    note: e.note,
    createdAt: e.createdAt
  };
}
function Qc(e) {
  return xo(e, (t) => t.page);
}
function el(e) {
  return Lo(e, (t) => t.page).map((t) => ({ page: t.pageIdx, items: t.items }));
}
function tl(e, t) {
  return Co({
    title: e,
    annotations: t.map(Xc)
  });
}
function nl(e) {
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
function vr(e) {
  if (typeof localStorage > "u")
    return [];
  try {
    return nl(localStorage.getItem(lo(e)));
  } catch {
    return [];
  }
}
function rl(e, t) {
  if (!(typeof localStorage > "u"))
    try {
      localStorage.setItem(lo(e), JSON.stringify(t));
    } catch (n) {
      console.warn("[reader-notes] persist failed", n);
    }
}
function ol(e, t = {}) {
  const n = J(
    () => ({
      jobId: `${e.jobId || ""}`.trim(),
      documentId: `${e.documentId || ""}`.trim()
    }),
    [e.jobId, e.documentId]
  ), [r, a] = C(() => vr(n)), o = t.onAfterAdd;
  O(() => {
    a(vr(n));
  }, [n.jobId, n.documentId]), O(() => {
    rl(n, r);
  }, [n, r]);
  const s = N((u) => {
    const f = `${u.quote || ""}`.trim();
    if (!f)
      return null;
    const m = {
      id: Zc(),
      page: Math.max(1, Math.floor(Number(u.page) || 1)),
      pane: u.pane === "translated" ? "translated" : "source",
      quote: f,
      note: `${u.note || ""}`.trim(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return a((v) => Qc([m, ...v])), o == null || o(), m;
  }, [o]), l = N((u, f) => {
    const m = `${f || ""}`.trim();
    a((v) => v.map((h) => h.id === u ? { ...h, note: m } : h));
  }, []), c = N((u) => {
    a((f) => f.filter((m) => m.id !== u));
  }, []), i = N(async (u = "") => {
    var m, v;
    const f = tl(u, r);
    try {
      return await ((v = (m = navigator.clipboard) == null ? void 0 : m.writeText) == null ? void 0 : v.call(m, f)), !0;
    } catch (h) {
      return console.error("[reader-notes] copy failed", h), !1;
    }
  }, [r]), d = J(() => el(r), [r]);
  return {
    notes: r,
    groups: d,
    addFromQuote: s,
    updateNote: l,
    remove: c,
    exportMarkdown: i,
    count: r.length
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
  const e = N((t) => {
    t && (t.setState = sl, t.hide = () => Jt.dismiss(rn));
  }, []);
  return /* @__PURE__ */ z(kt, { children: [
    /* @__PURE__ */ p(zo, { position: "bottom-right" }),
    /* @__PURE__ */ p("download-toast", { style: { display: "none" }, "aria-hidden": "true", ref: e })
  ] });
}
const cl = dn(() => import("./ReaderFavoritesPanel-BQFk46RS.js").then((e) => ({ default: e.ReaderFavoritesPanel }))), ll = dn(() => import("./ReaderMarkdownPanel-qfvkKI7I.js").then((e) => ({ default: e.ReaderMarkdownPanel }))), dl = dn(() => import("./ReaderAiPanel-CLnTUBdi.js").then((e) => ({ default: e.ReaderAiPanel })));
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
function wr(e, t) {
  var n, r, a, o;
  return e === "compare" ? null : (t == null ? void 0 : t.assistantPanel) === "markdown" || (t == null ? void 0 : t.assistantPanel) === "ai" ? t.assistantPanel : ((n = t == null ? void 0 : t.splitLayout) == null ? void 0 : n.left) === "ai" || ((r = t == null ? void 0 : t.splitLayout) == null ? void 0 : r.right) === "ai" ? "ai" : ((a = t == null ? void 0 : t.splitLayout) == null ? void 0 : a.left) === "markdown" || ((o = t == null ? void 0 : t.splitLayout) == null ? void 0 : o.right) === "markdown" ? "markdown" : null;
}
function pl() {
  const e = $s(), { boot: t, panes: n, sessionFiles: r, tools: a, session: o } = e, [s, l] = C(() => wr(e.mode, Ee(e.viewStateKey))), [c, i] = C(null), [d, u] = C(null), [f, m] = C(!1), v = x(e.viewStateKey), h = x(null), b = s !== null, y = e.liveTranslationAvailable || e.liveTranslation.pagesByPage.size > 0, P = fl({
    mode: e.mode,
    sourceOnly: e.sourceOnly,
    translatedUrl: r.translatedUrl,
    overlayContentAvailable: y,
    liveTranslationVisible: f,
    assistantOpen: b,
    assistantPdfPane: c
  }), w = P.sourceViewOnly, g = P.visibleMode, [S, k] = C(!1), M = N(() => k(!0), []), _ = N(() => k((j) => !j), []), T = ol(
    { jobId: o.jobId, documentId: o.documentId },
    { onAfterAdd: M }
  ), E = N((j) => {
    T.addFromQuote(j), e.clearSelection();
  }, [T.addFromQuote, e.clearSelection]), R = N((j) => {
    e.goToPage(j.page, j.pane === "translated" ? "translated" : "source");
  }, [e.goToPage]), I = N(
    () => T.exportMarkdown(o.title || ""),
    [T.exportMarkdown, o.title]
  );
  O(() => {
    u(null), m(!0), k(!1);
  }, [e.viewStateKey]), O(() => {
    e.session.jobTerminal && m(!1);
  }, [e.session.jobTerminal]), O(() => {
    if (!t.loading) {
      if (v.current !== e.viewStateKey) {
        v.current = e.viewStateKey;
        const j = Ee(e.viewStateKey);
        l(wr(e.mode, j)), i(null);
        return;
      }
      Et(e.viewStateKey, { assistantPanel: s, splitLayout: null });
    }
  }, [s, t.loading, e.mode, e.viewStateKey]), O(() => {
    if (!(t.loading || t.failed)) {
      if (h.current !== e.viewStateKey) {
        h.current = e.viewStateKey;
        const j = Ee(e.viewStateKey), ie = w ? "source" : j == null ? void 0 : j.mode;
        ie && ie !== e.mode && e.setModeKeepingPage(ie);
        return;
      }
      Et(e.viewStateKey, { mode: e.mode });
    }
  }, [t.failed, t.loading, e.mode, e.setModeKeepingPage, e.viewStateKey, w]);
  const A = s || (e.mode === "compare" ? "compare" : "reading"), D = Wt(a.isOpen("favorites")), L = Wt(s === "markdown"), $ = Wt(s === "ai");
  Ws({
    mode: g,
    sourceOnly: e.sourceOnly,
    setMode: e.setModeKeepingPage,
    userZoom: e.userZoom,
    onZoomChange: e.onZoomChange,
    currentPage: e.currentPage,
    numPages: n.hudNumPages,
    goToPage: e.goToPage,
    enabled: e.showHud
  });
  const B = N(() => {
    a.close();
  }, [a]), Y = N(() => {
    l(null), i(null), u(null);
  }, []), re = N((j) => {
    const ie = g === "translated" ? "translated" : "source";
    e.jumpToAnchor(j, ie);
  }, [e.jumpToAnchor, g]), oe = N((j) => {
    o.refreshCommittedDocument(j);
  }, [o.refreshCommittedDocument]), ne = N((j) => {
    a.close(), i(null);
    const ie = ml(j, e.liveTranslationAvailable);
    ie !== null && m(ie), e.setModeKeepingPage(j);
  }, [e.liveTranslationAvailable, e.setModeKeepingPage, a]), se = J(() => !y || !P.showSource ? null : /* @__PURE__ */ p(
    "button",
    {
      type: "button",
      className: `reader-live-translation-toggle${f ? " is-active" : ""}`,
      onClick: () => m((j) => !j),
      "aria-pressed": f,
      title: f ? "隐藏实时译文" : "在原文 PDF 上叠加实时译文",
      children: "译文"
    }
  ), [y, P.showSource, f]), U = N((j) => {
    l(j), j !== "ai" && u(null);
  }, []), V = N((j) => {
    if (j === "notes") {
      _();
      return;
    }
    if (j === "markdown" || j === "ai") {
      s === j ? (l(null), i(null), u(null)) : (l(j), i(null), j !== "ai" && u(null));
      return;
    }
    a.toggle(j);
  }, [s, _, a]), Z = S ? "notes" : s ?? a.active, X = N((j) => {
    const ie = j.pane === "translated" && !w ? "translated" : "source";
    u(j), l("ai"), i(ie), e.clearSelection();
  }, [e.clearSelection, w]), de = J(() => ({
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
    sourceViewOnly: w,
    download: e.download,
    goToPage: e.goToPage,
    assistant: { select: U, close: Y }
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
    w,
    e.download,
    e.goToPage,
    U,
    Y
  ]), he = J(() => ({
    currentPage: e.currentPage,
    numPages: n.hudNumPages
  }), [e.currentPage, n.hudNumPages]), pe = [
    Oa,
    `is-workspace-${A}`,
    b ? "is-assistant-open" : "",
    P.overlayOnSource ? "is-live-translation-overlay" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ p(Pi, { value: de, hud: he, children: /* @__PURE__ */ z("div", { className: pe, "data-reader-engine": "react-pdf", "data-reader-workspace": A, children: [
    /* @__PURE__ */ p(Ec, { loading: t.loading, failed: t.failed, text: t.text, percent: t.percent, regionsError: !!o.readerErrors.regions, metadataError: !!o.readerErrors.metadata }),
    /* @__PURE__ */ p(Ys, { onBeforeClose: o.prepareClose }),
    /* @__PURE__ */ p(
      xi,
      {
        mode: g,
        documentReady: !!o.jobId,
        sourceViewOnly: w,
        onModeChange: ne,
        liveTranslation: y ? {
          visible: f,
          state: e.liveTranslation,
          onToggle: () => m((j) => !j)
        } : null
      }
    ),
    /* @__PURE__ */ p(Ci, { active: s }),
    b ? /* @__PURE__ */ p(yc, {}) : null,
    e.showHud ? /* @__PURE__ */ p(Gc, { activeTool: Z, noteCount: T.count, onToggleTool: V }) : null,
    /* @__PURE__ */ p(Mi, { paneComposition: P, markdownSplit: s === "markdown", assistantSplit: b, liveTranslation: e.liveTranslation, sourcePaneAction: se }),
    e.showHud ? /* @__PURE__ */ p(
      Yc,
      {
        mode: g,
        modeControls: null
      }
    ) : null,
    /* @__PURE__ */ z(ho, { fallback: null, children: [
      D ? /* @__PURE__ */ p(cl, { open: a.isOpen("favorites"), jobId: o.jobId, documentId: o.documentId, onClose: B, onJumpPage: e.goToPage }) : null,
      L ? /* @__PURE__ */ p(ll, { open: s === "markdown", jobId: o.jobId, sourceOnly: e.sourceOnly, layout: "workspace", side: "right", onClose: Y }) : null,
      $ ? /* @__PURE__ */ p(dl, { open: s === "ai", jobId: o.jobId, documentId: o.documentId, sessionIdentity: o.sessionIdentity, layout: ul(e.mode), side: "right", selectionContext: d, onClearSelectionContext: () => u(null), onClose: Y, onJumpCitation: re, onDocumentCommitted: oe }, o.documentId || o.jobId || "reader-ai-pending") : null
    ] }),
    /* @__PURE__ */ p(
      Rc,
      {
        open: S,
        groups: T.groups,
        count: T.count,
        onClose: () => k(!1),
        onJump: R,
        onUpdateNote: T.updateNote,
        onRemove: T.remove,
        onExport: I
      }
    ),
    /* @__PURE__ */ p(Ac, { selection: e.selection, onDismiss: e.clearSelection, onAskAi: X, onAddNote: E }),
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
  Pc as b,
  Ol as c,
  xl as d,
  Nl as e,
  Fl as f,
  Ll as g,
  Cl as h,
  zl as i,
  _l as j,
  Dl as r
};
//# sourceMappingURL=ReaderApp-BFnKNkdf.js.map
