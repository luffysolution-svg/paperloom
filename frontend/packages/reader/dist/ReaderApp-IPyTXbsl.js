var qn = (e) => {
  throw TypeError(e);
};
var Gn = (e, t, n) => t.has(e) || qn("Cannot " + n);
var dt = (e, t, n) => (Gn(e, t, "read from private field"), n ? n.call(e) : t.get(e)), Kn = (e, t, n) => t.has(e) ? qn("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, n), Zn = (e, t, n, r) => (Gn(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n);
import { jsxs as D, jsx as y, Fragment as We } from "react/jsx-runtime";
import { useMemo as q, useState as L, useEffect as j, useCallback as F, useRef as A, useLayoutEffect as Ce, memo as vn, createContext as wn, useContext as Sn, forwardRef as $o, useImperativeHandle as Rn, useSyncExternalStore as jr, useId as Br, Suspense as jo, lazy as Bo } from "react";
import { requireAdapter as lt, getReaderAdapters as Re } from "./adapters.js";
import { resolveReaderDownloadName as Uo, resolveReaderDownloadUrls as Ho, READER_PROGRESS_COPY as Ae, trimString as xt, READER_DOWNLOAD_ACTIONS as Wo, disabledReason as Vo } from "./runtime/state.js";
import { r as Jo, b as qo } from "./page-config-Ct7qR5rm.js";
import { documentSourcePdfPath as nn, isFinishedJobStatus as Pn } from "@retainpdf/domain/job";
import { n as Go, d as Ko, f as qt, k as Yn, b as Zo, c as Yo, j as In, p as Tn, g as rn, l as Xn, i as Xo } from "./reader-regions-B6o2DsPy.js";
import { fetchDocumentReading as Qo } from "@retainpdf/api/documents";
import { isReaderTransportError as ea, createReaderTransportError as ta } from "./contracts.js";
import { toast as on, Toaster as na } from "sonner";
import { X as En, Radio as ra, FileText as Ur, Columns2 as Hr, Languages as Wr, FileCode2 as oa, Keyboard as aa, Download as sa, ChevronDown as ia, ListTree as ca, Search as la } from "lucide-react";
import { Button as De, Input as ua } from "@retainpdf/ui";
import { pdfjs as Vr, Page as da, Document as fa } from "react-pdf";
import { e as ma, m as ha, a as pa } from "./markdown-math-DN_X3M3x.js";
const ga = (...e) => {
  var t, n;
  return ((n = (t = Re()) == null ? void 0 : t.isMockMode) == null ? void 0 : n.call(t, ...e)) ?? !1;
}, ba = "", ya = Object.freeze({
  progress: "retainpdf-reader-progress"
}), va = (e) => {
  var t, n;
  return ((n = (t = Re()) == null ? void 0 : t.resolveResourceUrl) == null ? void 0 : n.call(t, e)) ?? e;
}, wa = (...e) => {
  var n;
  return (((n = Re()) == null ? void 0 : n.fetchProtected) ?? fetch)(...e);
}, Me = () => lt("defaultReaderDataPort"), Qn = () => lt("defaultReaderPageConfigPort"), xu = {
  get apiPrefix() {
    return Me().apiPrefix;
  },
  fetchProtected: (...e) => Me().fetchProtected(...e),
  loadMarkdownPayload: (e) => Me().loadMarkdownPayload(e),
  loadMarkdownSource: (e) => Me().loadMarkdownSource(e),
  loadMarkdownRange: (e, t, n, r, o) => Me().loadMarkdownRange(e, t, n, r, o),
  loadJobPayload: (e) => Me().loadJobPayload(e),
  loadReaderPayload: (e, t) => Me().loadReaderPayload(e, t),
  loadReaderOptionalArtifacts: (e) => Me().loadReaderOptionalArtifacts(e),
  get liveTranslation() {
    return Me().liveTranslation;
  }
}, Jr = {
  messageTargetOrigin: () => Qn().messageTargetOrigin(),
  readerJobId: () => Qn().readerJobId()
}, Sa = () => {
  var e;
  return ((e = Re()) == null ? void 0 : e.liveTranslation) ?? null;
}, bt = () => {
  var t;
  const e = Re();
  return (e == null ? void 0 : e.pdf) ?? {
    fetchProtected: (e == null ? void 0 : e.fetchProtected) ?? ((t = e == null ? void 0 : e.defaultReaderDataPort) == null ? void 0 : t.fetchProtected) ?? fetch,
    resolvePdfjsVendorUrl: (n = "") => {
      var r;
      return ((r = e == null ? void 0 : e.resolvePdfjsVendorUrl) == null ? void 0 : r.call(e, n)) ?? "";
    }
  };
}, Ut = () => {
  const e = Re();
  if (e != null && e.sessionData) return e.sessionData;
  const t = e == null ? void 0 : e.defaultReaderDataPort;
  if (!t) throw new Error("Reader adapter missing: defaultReaderDataPort (call setReaderAdapters)");
  return {
    loadReaderPayload: t.loadReaderPayload,
    // 旧宿主 / 测试替身可能没有这个方法：缺了就是 undefined，session 照旧一并加载。
    loadReaderOptionalArtifacts: t.loadReaderOptionalArtifacts,
    loadJobPayload: t.loadJobPayload,
    fetchDocumentByJobId: (...n) => lt("fetchDocumentByJobId")(...n),
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
}, Ra = (...e) => {
  var t, n;
  return ((n = (t = Re()) == null ? void 0 : t.resolveReaderAnchor) == null ? void 0 : n.call(t, ...e)) ?? null;
}, Pa = () => {
  var e, t;
  return ((t = (e = Re()) == null ? void 0 : e.resolveReaderDocumentId) == null ? void 0 : t.call(e)) ?? "";
}, Ia = (...e) => {
  var t, n;
  return ((n = (t = Re()) == null ? void 0 : t.resolveReaderJobId) == null ? void 0 : n.call(t, ...e)) ?? "";
}, Ta = (...e) => {
  var t, n;
  return ((n = (t = Re()) == null ? void 0 : t.resolveReaderDownloadName) == null ? void 0 : n.call(t, ...e)) ?? Uo(...e);
}, Ea = (...e) => {
  var t, n;
  return ((n = (t = Re()) == null ? void 0 : t.resolveReaderDownloadUrls) == null ? void 0 : n.call(t, ...e)) ?? Ho(...e);
}, ka = (...e) => lt("downloadProtectedResource")(...e), Aa = (...e) => lt("failDownloadToast")(...e), Ma = (e, t) => lt("resolveMarkdownAssetUrl")(e, t), er = "/api/v1";
function Na() {
  const e = () => {
    var r;
    return Jo(
      ((r = globalThis.location) == null ? void 0 : r.search) || ""
    );
  }, [t, n] = L(e);
  return j(() => {
    var c, i, l, u;
    const r = () => n(e()), o = (i = (c = globalThis.history) == null ? void 0 : c.pushState) == null ? void 0 : i.bind(globalThis.history), a = (u = (l = globalThis.history) == null ? void 0 : l.replaceState) == null ? void 0 : u.bind(globalThis.history);
    let s = !1;
    if (o && a)
      try {
        const d = (m) => function(...h) {
          const g = m.apply(this, h);
          return r(), globalThis.dispatchEvent(new Event("pushstate")), globalThis.dispatchEvent(new Event("replacestate")), globalThis.dispatchEvent(new Event("locationchange")), g;
        };
        globalThis.history.pushState = d(o), globalThis.history.replaceState = d(a), s = !0;
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
function _a() {
  const e = Na(), t = q(() => Ia(Jr), [e]), n = q(() => Pa(), [e]), r = t || n ? `job:${t}|document:${n}` : `location:${e}`;
  return { locationKey: e, jobId: t, routeDocumentId: n, sessionIdentity: r };
}
function La(e) {
  const {
    routeDocumentId: t,
    jobId: n,
    sessionIdentity: r,
    sessionIdentityRef: o,
    documentIdRef: a,
    sessionJobIdRef: s,
    switchToSourceMode: c
  } = e, [i, l] = L({
    documentId: "",
    jobId: ""
  }), [u, d] = L({
    documentId: "",
    jobId: ""
  }), m = i.documentId === t ? i.jobId : "", h = u.documentId === t ? u.jobId : "", g = n || m, [f, v] = L({
    jobId: "",
    documentId: ""
  }), b = f.jobId === g ? f.documentId : "", S = t || b, R = !!t && !g, [p, w] = L(null), k = (p == null ? void 0 : p.sessionIdentity) === r && p.documentId === S ? p : null, _ = R || !!k, O = F((E) => {
    const P = `${E.documentId || ""}`.trim();
    if (!P || a.current && a.current !== P) return;
    if (!a.current && s.current)
      v({
        jobId: s.current,
        documentId: P
      });
    else if (!a.current)
      return;
    const T = `${E.revision || ""}`.trim() || `${Date.now()}`;
    w({
      documentId: P,
      revision: T,
      sessionIdentity: o.current
    }), c();
  }, []);
  j(() => {
    w((E) => E && E.sessionIdentity !== r ? null : E);
  }, [r]);
  const x = F((E) => {
    switch (E.type) {
      case "resolved-document-job":
        l({ documentId: E.documentId, jobId: E.jobId });
        break;
      case "cleared-resolved-document-job":
        l({ documentId: "", jobId: "" });
        break;
      case "missing-document-job":
        d({ documentId: E.documentId, jobId: E.jobId });
        break;
      case "resolved-job-document":
        v((P) => P.jobId === E.jobId && P.documentId === E.documentId ? P : { jobId: E.jobId, documentId: E.documentId });
        break;
      case "committed-source":
        w({
          documentId: E.documentId,
          revision: E.revision,
          sessionIdentity: E.sessionIdentity
        });
        break;
    }
  }, []);
  return {
    resolvedDocumentJob: i,
    setResolvedDocumentJob: l,
    missingDocumentJob: u,
    setMissingDocumentJob: d,
    documentJobId: m,
    rejectedDocumentJobId: h,
    sessionJobId: g,
    resolvedJobDocument: f,
    setResolvedJobDocument: v,
    jobDocumentId: b,
    documentId: S,
    sourceOnly: R,
    committedDocumentSource: p,
    setCommittedDocumentSource: w,
    activeCommittedDocumentSource: k,
    sourceViewOnly: _,
    refreshCommittedDocument: O,
    applyIdentityEvent: x
  };
}
function tr(e) {
  return `${(e == null ? void 0 : e.status) || ""}`.trim().toLowerCase();
}
function Ca(e) {
  var r, o, a, s;
  if (!e || typeof e != "object") return "";
  const t = e, n = [
    t.document_id,
    t.documentId,
    (r = t.document) == null ? void 0 : r.document_id,
    (o = t.book_summary) == null ? void 0 : o.document_id,
    (s = (a = t.request_payload) == null ? void 0 : a.source) == null ? void 0 : s.document_id
  ];
  for (const c of n) {
    const i = `${c || ""}`.trim();
    if (i) return i;
  }
  return "";
}
function nr(e, t) {
  return va(nn(e, t));
}
function xa(e, t = "") {
  const n = `${e || ""}`.trim(), r = `${t || ""}`.trim();
  return !!(!n || r && (n === r || n === `${r}.pdf`) || /^\d{8,14}-[0-9a-f]{4,}$/i.test(n));
}
function Da(e, t) {
  var r;
  const n = [
    e == null ? void 0 : e.title,
    e == null ? void 0 : e.display_name,
    e == null ? void 0 : e.source_file_name,
    (r = e == null ? void 0 : e.book_summary) == null ? void 0 : r.source_file_name
  ];
  for (const o of n) {
    const a = `${o || ""}`.trim();
    if (a && !xa(a, t))
      return a.replace(/\.pdf$/i, "");
  }
  return "";
}
function an({
  percent: e,
  text: t,
  stage: n
}) {
  var r;
  try {
    (r = window.parent) == null || r.postMessage(
      {
        type: ya.progress,
        stage: n,
        percent: e,
        text: t
      },
      Jr.messageTargetOrigin()
    );
  } catch {
  }
}
function Dt(e, t, n, r = "progress") {
  e({
    loading: !0,
    percent: t,
    text: n,
    stage: r,
    failed: !1
  }), an({ percent: t, text: n, stage: r });
}
function za(e) {
  const {
    sessionJobId: t,
    sessionIdentity: n,
    sessionIdentityRef: r,
    sessionJobIdRef: o,
    sessionEpochRef: a,
    closingRef: s
  } = e, [c, i] = L(null), [l, u] = L(null), [d, m] = L(""), [h, g] = L(0), f = d === n ? c : null, v = d === n ? l : null, b = tr(f), S = Pn(b), R = F(() => {
    g((x) => x + 1);
  }, []), p = F((x) => {
    i(x.jobPayload), u(x.manifestPayload), m(x.sessionIdentity);
  }, []), w = F((x) => {
    i(null), u(null), m(x);
  }, []), k = A(""), _ = A(""), O = F(async () => {
    const x = o.current;
    if (!x || k.current === x) return;
    const E = Ut().loadJobPayload;
    if (typeof E != "function") return;
    const P = a.current.value;
    k.current = x;
    try {
      const T = await E(x);
      if (s.current || a.current.value !== P || o.current !== x || !T || typeof T != "object")
        return;
      const I = tr(T);
      i(T), m(r.current), I === "succeeded" && _.current !== x && (_.current = x, g((N) => N + 1));
    } catch {
    } finally {
      k.current === x && (k.current = "");
    }
  }, []);
  return j(() => {
    _.current = "";
  }, [n]), j(() => {
    if (!t || S || !f) return;
    const x = window.setInterval(() => {
      document.visibilityState !== "hidden" && O();
    }, 1e3);
    return () => window.clearInterval(x);
  }, [S, O, f, t]), {
    jobPayload: c,
    setJobPayload: i,
    manifestPayload: l,
    setManifestPayload: u,
    payloadSessionIdentity: d,
    setPayloadSessionIdentity: m,
    scopedJobPayload: f,
    scopedManifestPayload: v,
    jobStatus: b,
    jobTerminal: S,
    jobRefreshRevision: h,
    refreshJobArtifacts: R,
    refreshJobStatus: O,
    publishPayload: p,
    clearPayload: w
  };
}
function sn(e) {
  document.body.classList.remove(
    "reader-mode-source",
    "reader-mode-translated",
    "reader-mode-compare"
  ), document.body.classList.add(`reader-mode-${e}`);
}
function Oa(e, t) {
  e(t), sn(t);
}
function Fa(e) {
  const [t, n] = L(e ? "source" : "compare"), r = F((a) => {
    e && a !== "source" || (n(a), sn(a));
  }, [e]), o = F((a) => {
    Oa(n, a);
  }, []);
  return j(() => (e && document.documentElement.classList.add("reader-source-only"), sn(t), () => {
    document.documentElement.classList.remove("reader-source-only");
  }), [e, t]), { mode: t, setMode: r, setModeState: n, switchSessionMode: o };
}
function rr(e) {
  return typeof e == "string" ? e.trim() : `${e ?? ""}`.trim();
}
function $a(e) {
  const t = (e == null ? void 0 : e.data) ?? e, n = t && typeof t == "object" ? t : {};
  return {
    activeJobId: rr(n.active_job_id),
    activeVersionId: rr(n.active_version_id)
  };
}
function ja(e) {
  const { link: t, rejectedDocumentJobId: n, hasCommittedSource: r } = e, o = t.activeJobId && t.activeJobId !== n && !t.activeJobId.startsWith("doc:") ? t.activeJobId : "";
  return o ? { kind: "follow-active-job", jobId: o, activeVersionId: t.activeVersionId } : t.activeVersionId && !r ? { kind: "open-committed-source", documentId: "", revision: t.activeVersionId } : { kind: "open-source-url" };
}
function Ba(e) {
  const {
    payloadDocumentId: t,
    linkedActiveJobId: n,
    linkedActiveVersionId: r,
    sessionJobId: o,
    hasCommittedSource: a
  } = e;
  return t && r && n === o && !a ? { kind: "restore-committed-source", documentId: t, revision: r } : { kind: "open-job-artifacts" };
}
function Ua(e) {
  return e.status === 404 && e.reason !== "not_ready" && !e.jobId && !!e.routeDocumentId && !!e.documentJobId && e.sessionJobId === e.documentJobId;
}
const Ha = /^merged-([0-9a-f]{64})-[0-9a-f]+$/;
function Wa(e) {
  var t;
  return e.status !== 404 || e.reason !== "merged_reading_expired" ? "" : ((t = Ha.exec(`${e.sessionJobId || ""}`.trim())) == null ? void 0 : t[1]) || "";
}
const Va = 48 * 1024 * 1024;
function Ja(e) {
  return e ? "ranged" in e ? e : { data: e.data.slice() } : null;
}
const qa = 2, we = /* @__PURE__ */ new Map();
function cn(e, t) {
  we.delete(e), we.set(e, t);
}
function or(e) {
  if (we.size < qa) return;
  const t = we.keys().next().value;
  t && we.delete(t);
}
async function Ga(e) {
  var t, n;
  if (typeof e.json != "function") return "";
  try {
    const r = await e.json(), o = (n = (t = r == null ? void 0 : r.error) == null ? void 0 : t.details) == null ? void 0 : n.reason;
    return typeof o == "string" ? o.trim() : "";
  } catch {
    return "";
  }
}
async function qr(e, t = bt().fetchProtected, n = {}) {
  var u, d, m, h, g, f, v, b, S;
  const r = `${e || ""}`.trim();
  if (!r)
    return null;
  if (we.has(r)) {
    const R = we.get(r);
    return cn(r, R), R;
  }
  const o = new AbortController(), a = () => o.abort();
  (u = n.signal) != null && u.aborted && o.abort(), (m = (d = n.signal) == null ? void 0 : d.addEventListener) == null || m.call(d, "abort", a, { once: !0 });
  let s;
  try {
    s = await t(r, { signal: o.signal });
  } finally {
    (g = (h = n.signal) == null ? void 0 : h.removeEventListener) == null || g.call(h, "abort", a);
  }
  if (!s.ok) {
    const R = new Error(`读取 PDF 失败 (${s.status})`);
    R.status = s.status;
    const p = await Ga(s);
    throw p && (R.reason = p), R;
  }
  const c = Ka(r, s, t);
  if (c) {
    o.abort();
    const R = { ranged: c };
    return or(), we.set(r, R), R;
  }
  (v = (f = n.signal) == null ? void 0 : f.addEventListener) == null || v.call(f, "abort", a, { once: !0 });
  let i;
  try {
    i = await s.arrayBuffer();
  } finally {
    (S = (b = n.signal) == null ? void 0 : b.removeEventListener) == null || S.call(b, "abort", a);
  }
  const l = { data: new Uint8Array(i) };
  return we.has(r) ? cn(r, l) : (or(), we.set(r, l)), l;
}
function Ka(e, t, n) {
  const r = t.headers;
  if (!r || typeof r.get != "function") return null;
  const o = Number(r.get("content-length") || 0), a = `${r.get("accept-ranges") || ""}`.toLowerCase().includes("bytes"), s = `${r.get("content-encoding") || ""}`.trim();
  return !a || s || !Number.isFinite(o) || o < Va ? null : {
    url: e,
    length: o,
    async fetchRange(c, i) {
      const l = await n(e, { headers: { Range: `bytes=${c}-${i - 1}` } });
      if (l.status !== 206) throw new Error(`读取 PDF 片段失败 (${l.status})`);
      return new Uint8Array(await l.arrayBuffer());
    }
  };
}
const Za = { file: null, loading: !1, error: "" }, Ya = { file: null, loading: !0, error: "" };
function Xa(e = "", t = null) {
  const n = `${e || ""}`.trim(), [r, o] = L(null);
  if (j(() => {
    if (t || !n) return;
    const s = we.get(n);
    if (s) {
      cn(n, s);
      return;
    }
    const c = new AbortController();
    return qr(n, void 0, { signal: c.signal }).then((i) => {
      c.signal.aborted || o({ url: n, file: i, loading: !1, error: "" });
    }).catch((i) => {
      c.signal.aborted || o({ url: n, file: null, loading: !1, error: (i == null ? void 0 : i.message) || String(i) });
    }), () => c.abort();
  }, [n, t]), t) return { file: t, loading: !1, error: "" };
  if (!n) return Za;
  if ((r == null ? void 0 : r.url) === n) return r;
  const a = we.get(n);
  return a ? { file: a, loading: !1, error: "" } : Ya;
}
function Qa(e) {
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
async function ln(e) {
  const { url: t, label: n, percentStart: r, percentEnd: o, fence: a, setBoot: s } = e;
  if (!t || a.isInactive())
    return null;
  Dt(s, r, n, "download");
  const c = await qr(t, bt().fetchProtected, {
    signal: a.signal
  });
  return a.isInactive() ? null : (Dt(s, o, n, "download"), c);
}
async function es(e) {
  const { sourceFinal: t, translatedFinal: n, fence: r, setBoot: o } = e;
  Dt(o, 25, "正在下载 PDF…", "download");
  const a = [];
  let s = null, c = null;
  return t && a.push(
    ln({
      url: t,
      label: "正在下载原文 PDF…",
      percentStart: 30,
      percentEnd: 55,
      fence: r,
      setBoot: o
    }).then((u) => {
      s = u;
    })
  ), n && a.push(
    ln({
      url: n,
      label: "正在下载译文 PDF…",
      percentStart: 55,
      percentEnd: 85,
      fence: r,
      setBoot: o
    }).then((u) => {
      c = u;
    })
  ), await Promise.all(a), r.isInactive() ? { status: "inactive" } : !!t && !s || !!n && !c ? { status: "incomplete" } : { status: "downloaded", sourceBytes: s, translatedBytes: c };
}
function ts(e, t, n) {
  const r = new URL(e);
  return n ? r.searchParams.set("job_id", n) : (r.searchParams.delete("job_id"), r.searchParams.set("document_id", t)), r.toString();
}
async function ns({
  apiPrefix: e,
  documentId: t,
  expiredJobId: n,
  fetchReading: r = Qo,
  location: o = globalThis.location
}) {
  let a;
  try {
    const s = await r(e, t);
    a = `${(s == null ? void 0 : s.job_id) || ""}`.trim() || null;
  } catch {
    return !1;
  }
  return a === n || !o ? !1 : (o.replace(ts(o.href, t, a)), !0);
}
const At = {
  regions: null,
  metadata: null
};
function rs(e) {
  const {
    sessionJobId: t,
    jobId: n,
    routeDocumentId: r,
    documentJobId: o,
    rejectedDocumentJobId: a,
    sourceOnly: s,
    locationKey: c,
    sessionIdentity: i,
    committedSource: l,
    applyIdentityEvent: u,
    publishPayload: d,
    clearPayload: m,
    switchSessionMode: h,
    jobRefreshRevision: g,
    sessionEpochRef: f,
    closingRef: v,
    activeLoadAbortRef: b
  } = e, [S, R] = L(""), [p, w] = L(""), [k, _] = L(null), [O, x] = L(null), [E, P] = L(!1), [T, I] = L(""), [N, z] = L([]), [H, Z] = L(!1), [G, ae] = L(() => ({
    source: null,
    translated: null
  })), [B, C] = L(
    At
  ), [se, ne] = L({
    loading: !0,
    percent: 4,
    text: Ae.boot,
    stage: "progress",
    failed: !1
  });
  return j(() => {
    const X = new AbortController(), me = f.current.value, Y = Qa({
      sessionEpochRef: f,
      closingRef: v,
      abort: X,
      sessionEpoch: me
    });
    b.current = X;
    const K = Ut();
    if (v.current)
      return X.abort(), () => {
        b.current === X && (b.current = null);
      };
    let he = !1;
    function be(Q, oe) {
      Y.markFailed(), Z(!0), ne({
        loading: !1,
        percent: 100,
        text: Q,
        stage: "failed",
        failed: !0
      }), an({ percent: 100, text: oe, stage: "failed" });
    }
    function $() {
      P(!0), he || Z(!0), ne({
        loading: !1,
        percent: 100,
        text: Ae.ready,
        stage: "ready",
        failed: !1
      }), an({ percent: 100, text: Ae.ready, stage: "ready" });
    }
    function ce() {
      return l != null && l.documentId ? nr(
        l.documentId,
        l.revision
      ) : ga() ? ba : K.resolveResourceUrl(nn(r));
    }
    async function ye() {
      var le;
      let Q = { activeJobId: "", activeVersionId: "" };
      try {
        const ue = await ((le = K.fetchDocument) == null ? void 0 : le.call(K, r));
        ue && (Q = $a(ue));
      } catch {
      }
      const oe = ja({
        link: Q,
        rejectedDocumentJobId: a,
        hasCommittedSource: !!l
      });
      if (oe.kind === "follow-active-job") {
        if (Y.isInactive()) return;
        u({
          type: "resolved-document-job",
          documentId: r,
          jobId: oe.jobId
        }), oe.activeVersionId ? (l || u({
          type: "committed-source",
          documentId: r,
          revision: oe.activeVersionId,
          sessionIdentity: i
        }), h("source")) : h("compare");
        return;
      }
      if (oe.kind === "open-committed-source") {
        if (Y.isInactive()) return;
        u({
          type: "committed-source",
          documentId: r,
          revision: oe.revision,
          sessionIdentity: i
        }), h("source");
        return;
      }
      const ge = ce();
      if (Y.isInactive()) return;
      R(ge), w(""), I(""), m(i);
      const ie = await ln({
        url: ge,
        label: "正在下载原文 PDF…",
        percentStart: 30,
        percentEnd: 85,
        fence: Y,
        setBoot: ne
      });
      if (!Y.isInactive()) {
        if (!ie) {
          be("源文件不可用：该文档没有可读取的源 PDF。", "源文件下载失败");
          return;
        }
        _(ie), $();
      }
    }
    async function Pe() {
      var kt;
      const Q = !l, oe = !!(Q && K.loadSessionSnapshot && K.loadReaderOptionalArtifacts), ge = oe ? K.loadReaderOptionalArtifacts(t) : null, ie = await ((kt = K.loadSessionSnapshot) == null ? void 0 : kt.call(K, {
        jobId: t,
        documentId: r,
        routeDocumentId: r,
        committedSource: l,
        includeOptionalArtifacts: Q && !oe
      })), le = ie ? {
        jobPayload: ie.sourcePayload,
        manifestPayload: ie.manifestPayload,
        readerMetadata: ie.readerMetadata,
        regionsPayload: ie.regions,
        readerErrors: ie.readerErrors
      } : await K.loadReaderPayload(t, {
        includeOptionalArtifacts: Q
      });
      if (Y.isInactive()) return;
      let ue = null;
      if (n && !r)
        if (ie && ie.linkedDocument !== void 0)
          ue = ie.linkedDocument;
        else {
          try {
            ue = await K.fetchDocumentByJobId(er, t);
          } catch {
          }
          if (Y.isInactive()) return;
        }
      const $e = Ca(le.jobPayload) || `${(ue == null ? void 0 : ue.document_id) || ""}`.trim();
      $e && !r && u({
        type: "resolved-job-document",
        jobId: t,
        documentId: $e
      });
      const ut = Ba({
        payloadDocumentId: $e,
        linkedActiveJobId: `${(ue == null ? void 0 : ue.active_job_id) || ""}`.trim(),
        linkedActiveVersionId: `${(ue == null ? void 0 : ue.active_version_id) || ""}`.trim(),
        sessionJobId: t,
        hasCommittedSource: !!l
      });
      if (ut.kind === "restore-committed-source") {
        if (Y.isInactive()) return;
        u({
          type: "committed-source",
          documentId: ut.documentId,
          revision: ut.revision,
          sessionIdentity: i
        }), h("source");
        return;
      }
      const Ye = K.resolveReaderSourcePdf(le.manifestPayload), Vt = K.resolveReaderTranslatedPdfUrl(le.jobPayload, le.manifestPayload), Jt = typeof Ye == "string" ? Ye : K.resolveReaderArtifactUrl(Ye), It = r || $e, ke = l != null && l.documentId ? nr(
        l.documentId,
        l.revision
      ) : Jt || (It ? K.resolveResourceUrl(nn(It)) : ""), xe = l ? "" : Vt || "";
      R(ke || ""), w(xe), I(Da(le.jobPayload, t)), d({
        jobPayload: le.jobPayload || null,
        manifestPayload: le.manifestPayload || null,
        sessionIdentity: i
      });
      const Xe = () => es({
        sourceFinal: ke || "",
        translatedFinal: xe,
        fence: Y,
        setBoot: ne
      }), Tt = !!(ke || xe), Qe = ge && Tt ? Xe() : null;
      Qe == null || Qe.catch(() => {
      });
      const Et = (M) => {
        Y.isInactive() || (z(l ? [] : Go(M.regionsPayload)), ae(l ? { source: null, translated: null } : Ko(M.readerMetadata)), C(l ? At : M.readerErrors ?? At), Z(!0));
      };
      if (ge ? (he = !0, ge.then(Et)) : Et(le), !Tt) {
        be(Ae.failed, Ae.failed);
        return;
      }
      const et = await (Qe ?? Xe());
      if (et.status !== "inactive") {
        if (et.status === "incomplete") {
          be("PDF 下载失败，请重试", "PDF 下载失败");
          return;
        }
        _(et.sourceBytes), x(et.translatedBytes), $();
      }
    }
    async function ve() {
      P(!1), _(null), x(null), z([]), Z(!1), ae({ source: null, translated: null }), C(At), Dt(ne, 8, Ae.metadata, "metadata");
      try {
        if (s) {
          await ye();
          return;
        }
        if (!t) {
          be(Ae.failed, Ae.failed);
          return;
        }
        await Pe();
      } catch (Q) {
        if (Y.isClosedOrStale() || (Q == null ? void 0 : Q.name) === "AbortError") return;
        Y.markFailed();
        const oe = Number(Q == null ? void 0 : Q.status), ge = `${(Q == null ? void 0 : Q.reason) || ""}`, ie = Wa({ status: oe, reason: ge, sessionJobId: t });
        if (ie && (await ns({
          apiPrefix: er,
          documentId: ie,
          expiredJobId: t
        }) || Y.isClosedOrStale()))
          return;
        if (Ua({
          status: oe,
          reason: ge,
          jobId: n,
          routeDocumentId: r,
          documentJobId: o,
          sessionJobId: t
        })) {
          u({ type: "missing-document-job", documentId: r, jobId: t }), u({ type: "cleared-resolved-document-job" }), h("source");
          return;
        }
        const le = Q instanceof Error ? Q.message : Ae.failed;
        be(le, le);
      }
    }
    return ve(), () => {
      X.abort(), b.current === X && (b.current = null);
    };
  }, [t, r, o, a, s, c, l, g, n, i, u, d, m, h]), {
    sourceUrl: S,
    translatedUrl: p,
    sourceFile: k,
    translatedFile: O,
    assetsReady: E,
    title: T,
    regions: N,
    regionsSettled: H,
    readerMetadata: G,
    readerErrors: B,
    boot: se
  };
}
function os() {
  const e = A(!1), t = A(null), { locationKey: n, jobId: r, routeDocumentId: o, sessionIdentity: a } = _a(), s = A({ identity: "", value: 0 });
  s.current.identity !== a && (s.current = {
    identity: a,
    value: s.current.value + 1
  }, e.current = !1);
  const c = A(a), i = A(""), l = A(""), u = A(() => {
  }), d = F(() => u.current(), []), m = La({
    routeDocumentId: o,
    jobId: r,
    sessionIdentity: a,
    sessionIdentityRef: c,
    documentIdRef: i,
    sessionJobIdRef: l,
    switchToSourceMode: d
  }), {
    sessionJobId: h,
    documentId: g,
    sourceOnly: f,
    sourceViewOnly: v
  } = m, { mode: b, setMode: S, switchSessionMode: R } = Fa(v);
  u.current = () => {
    R("source");
  }, c.current = a, i.current = g, l.current = h;
  const p = za({
    sessionJobId: h,
    sessionIdentity: a,
    sessionIdentityRef: c,
    sessionJobIdRef: l,
    sessionEpochRef: s,
    closingRef: e
  }), {
    scopedJobPayload: w,
    scopedManifestPayload: k,
    jobStatus: _,
    jobTerminal: O,
    jobRefreshRevision: x,
    refreshJobArtifacts: E,
    refreshJobStatus: P
  } = p, T = rs({
    sessionJobId: h,
    jobId: r,
    routeDocumentId: o,
    documentJobId: m.documentJobId,
    rejectedDocumentJobId: m.rejectedDocumentJobId,
    sourceOnly: f,
    locationKey: n,
    sessionIdentity: a,
    committedSource: m.activeCommittedDocumentSource,
    applyIdentityEvent: m.applyIdentityEvent,
    publishPayload: p.publishPayload,
    clearPayload: p.clearPayload,
    switchSessionMode: R,
    jobRefreshRevision: x,
    sessionEpochRef: s,
    closingRef: e,
    activeLoadAbortRef: t
  }), I = F(() => {
    var z;
    e.current = !0, (z = t.current) == null || z.abort();
  }, []), N = q(
    () => ({
      fetchProtected: Ut().fetchProtected,
      jobId: h,
      jobPayload: w,
      manifestPayload: k,
      sourceUrl: T.sourceUrl,
      translatedUrl: T.translatedUrl,
      sourceOnly: v
    }),
    [h, w, k, T.sourceUrl, T.translatedUrl, v]
  );
  return {
    jobId: h,
    jobStatus: _,
    workflow: `${(w == null ? void 0 : w.workflow) || ""}`.trim().toLowerCase(),
    jobTerminal: O,
    documentId: g,
    sessionIdentity: a,
    sourceOnly: f,
    mode: b,
    setMode: S,
    sourceUrl: T.sourceUrl,
    translatedUrl: T.translatedUrl,
    sourceFile: T.sourceFile,
    translatedFile: T.translatedFile,
    assetsReady: T.assetsReady,
    boot: T.boot,
    title: T.title,
    regions: T.regions,
    regionsSettled: T.regionsSettled,
    readerMetadata: T.readerMetadata,
    readerErrors: T.readerErrors,
    download: N,
    refreshJobArtifacts: E,
    refreshJobStatus: P,
    refreshCommittedDocument: m.refreshCommittedDocument,
    prepareClose: I
  };
}
const as = 160, ss = 8, is = 0;
function cs() {
  const e = A(null), [t, n] = L(null), [r, o] = L(is), a = F((s) => {
    e.current = s, n(s);
  }, []);
  return j(() => {
    const s = t;
    if (!s || typeof ResizeObserver > "u")
      return;
    const c = (l) => {
      !Number.isFinite(l) || l < as || o((u) => Math.abs(u - l) < ss ? u : l);
    }, i = new ResizeObserver((l) => {
      var u, d;
      c(((d = (u = l[0]) == null ? void 0 : u.contentRect) == null ? void 0 : d.width) ?? s.clientWidth);
    });
    return i.observe(s), c(s.clientWidth), () => i.disconnect();
  }, [t]), {
    shellRef: e,
    shellEl: t,
    shellWidth: r,
    bindShell: a
  };
}
function ls(e) {
  const { mode: t, sourceOnly: n, assetsReady: r, hasSource: o, hasTranslated: a } = e, s = r && o, c = r && a && !n, i = t === "source" || t === "compare", l = !n && (t === "translated" || t === "compare");
  return {
    mountSource: s,
    mountTranslated: c,
    showSource: i,
    showTranslated: l,
    compareMode: t === "compare" && i && l && s && c,
    primaryPane: t === "translated" ? "translated" : "source"
  };
}
const Gt = { source: 0, translated: 0 };
function us(e, t) {
  const {
    mode: n,
    sourceOnly: r,
    assetsReady: o,
    sourceUrl: a,
    translatedUrl: s,
    sourceFile: c,
    translatedFile: i
  } = e, l = `${(t == null ? void 0 : t.identityKey) || ""}\0${a}\0${s}`, u = A(l);
  u.current = l;
  const [d, m] = L(() => ({
    identity: l,
    pages: Gt
  })), [h, g] = L(() => ({ identity: l, tick: 0 })), f = d.identity === l ? d.pages : Gt, v = h.identity === l ? h.tick : 0, b = ls({
    mode: n,
    sourceOnly: r,
    assetsReady: o,
    hasSource: !!c || !!a,
    hasTranslated: !!i
  }), { primaryPane: S } = b, R = F((P, T) => {
    u.current === l && m((I) => {
      const N = I.identity === l ? I.pages : Gt;
      return N[T] === P && I.identity === l ? I : {
        identity: l,
        pages: { ...N, [T]: P }
      };
    });
  }, [l]), p = A(null), w = F(() => {
    p.current && clearTimeout(p.current);
    const P = l;
    p.current = setTimeout(() => {
      p.current = null, u.current === P && g((T) => ({
        identity: P,
        tick: T.identity === P ? T.tick + 1 : 1
      }));
    }, 60);
  }, [l]);
  j(() => (p.current && (clearTimeout(p.current), p.current = null), m((P) => P.identity === l && P.pages.source === 0 && P.pages.translated === 0 ? P : { identity: l, pages: { source: 0, translated: 0 } }), g((P) => P.identity === l && P.tick === 0 ? P : { identity: l, tick: 0 }), () => {
    p.current && (clearTimeout(p.current), p.current = null);
  }), [l]);
  const k = q(
    () => Math.max(f.source, f.translated),
    [f]
  ), _ = S === "translated" ? f.translated : f.source || f.translated, O = t == null ? void 0 : t.userZoom, x = t == null ? void 0 : t.shellWidth, E = `${l}-${v}-${O}-${n}-${f.source}-${f.translated}-${x}`;
  return {
    ...b,
    numPagesByPane: f,
    hudNumPages: k,
    primaryNumPages: _,
    metricsTick: v,
    onNumPages: R,
    onMetrics: w,
    rowSyncRevision: E
  };
}
const Ve = "data-reader-page", it = "data-reader-pane", kn = "data-natural-height", ds = "reader-react-root", fs = "reader-react-grid", ms = "reader-react-scroll-shell", hs = "reader-react-pdf-pane", Gr = "reader-react-pdf-page", zt = "reader-react-pdf-page-placeholder", An = "reader-react-pdf-page-slot";
function Ot(e, t) {
  const n = e != null ? `[${Ve}="${e}"]` : `[${Ve}]`;
  return t ? `${n}[${it}="${t}"]` : n;
}
function ps() {
  return `.${An}[${Ve}]`;
}
function Ft(e) {
  return Number(e.getAttribute(Ve));
}
const Kr = 0.25, $t = 1, gs = 0.05, Pt = 0.5, bs = 16, ys = 8, vs = 720;
function He() {
  const e = typeof window > "u" ? NaN : Number(window.innerWidth);
  return Number.isFinite(e) && e > 0 ? e : Number.POSITIVE_INFINITY;
}
function Zr(e) {
  return Number.isFinite(e) && e < vs;
}
function rt(e, t = Number.POSITIVE_INFINITY) {
  return Zr(t) && (e === "source" || e === "translated") ? $t : Pt;
}
function Ht(e) {
  return Number.isFinite(e) ? Math.min($t, Math.max(Kr, e)) : Pt;
}
function yt(e, t) {
  const n = Ht(Number(e) + t * gs);
  return Math.round(n * 100) / 100;
}
function ws(e) {
  return Math.round(Ht(e) * 100);
}
function Ss(e) {
  const n = (Number(e) || 0) - bs - ys;
  return Math.max(160, Math.floor(n));
}
function Rs(e, t = Pt) {
  const n = Ht(t);
  return Ss((Number(e) || 0) * n);
}
function Ps(e, t) {
  if (!e || !Number.isFinite(t) || t <= 0 || Math.abs(t - 1) < 1e-3)
    return;
  const n = e.scrollLeft + e.clientWidth / 2, r = e.scrollTop + e.clientHeight / 2, o = Array.from(
    e.querySelectorAll(`[${it}]`)
  ).map((s) => ({
    pane: s,
    cx: s.scrollLeft + s.clientWidth / 2,
    hadOverflow: s.scrollWidth > s.clientWidth + 1
  })), a = () => {
    e.scrollLeft = Math.max(0, n * t - e.clientWidth / 2), e.scrollTop = Math.max(0, r * t - e.clientHeight / 2);
    for (const { pane: s, cx: c, hadOverflow: i } of o) {
      const l = Math.max(0, s.scrollWidth - s.clientWidth);
      if (l <= 0) {
        s.scrollLeft = 0;
        continue;
      }
      i ? s.scrollLeft = Math.min(
        l,
        Math.max(0, c * t - s.clientWidth / 2)
      ) : s.scrollLeft = l / 2;
    }
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(a);
  });
}
const Is = 8;
function Ts(e, t) {
  return !Number.isFinite(e) || e < 80 || Math.abs(e - t) < Is ? "ignore" : !Number.isFinite(t) || t <= 0 ? "immediate" : "settle";
}
const Yr = 200, Xr = [
  "markdown"
], Es = Xr;
function Qr(e) {
  return Es.includes(e);
}
const ks = "retainpdf:reader:view:v1:", ar = /* @__PURE__ */ new Set([
  "source",
  "translated",
  "markdown",
  "ai"
]), As = /* @__PURE__ */ new Set([
  "source",
  "compare",
  "translated"
]);
function eo() {
  try {
    return typeof globalThis.localStorage > "u" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
function un(e) {
  return `${e || ""}`.trim();
}
function Ms({
  documentId: e,
  jobId: t
}) {
  const n = un(e);
  if (n) return `document:${n}`;
  const r = un(t);
  return r ? `job:${r}` : "";
}
function to(e) {
  const t = un(e);
  return t ? `${ks}${t}` : "";
}
function Ns(e) {
  if (!e || typeof e != "object") return;
  const t = Math.floor(Number(e.page)), n = Number(e.fraction);
  if (!(!Number.isFinite(t) || t < 1 || !Number.isFinite(n)))
    return {
      page: t,
      fraction: Math.max(0, Math.min(1, n))
    };
}
function _s(e) {
  if (e === null) return null;
  if (!e || typeof e != "object") return;
  const t = `${e.left || ""}`, n = `${e.right || ""}`;
  if (!(!ar.has(t) || !ar.has(n) || t === n))
    return { left: t, right: n };
}
function Ls(e) {
  return e === null ? null : Qr(e) ? e : void 0;
}
function Cs(e) {
  return As.has(e) ? e : void 0;
}
function no(e) {
  if (!e || typeof e != "object") return null;
  const t = e;
  if (t.schema !== "retainpdf_reader_view_v1") return null;
  const n = Ns(t.anchor), r = Number(t.zoom), o = Cs(t.mode), a = _s(t.splitLayout), s = Ls(t.assistantPanel);
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
function Ee(e, t = eo()) {
  const n = to(e);
  if (!n || !t) return null;
  try {
    const r = t.getItem(n);
    return r ? no(JSON.parse(r)) : null;
  } catch {
    return null;
  }
}
function Wt(e, t, n = eo()) {
  const r = to(e);
  if (!r || !n) return null;
  const o = Ee(e, n), a = no({
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
function xs(e, t, n = "") {
  var m;
  const [r, o] = L(() => {
    var h;
    return ((h = Ee(n)) == null ? void 0 : h.zoom) ?? rt(e, He());
  }), a = A(r), s = A(n);
  a.current = r;
  const c = A(1), i = A(((m = Ee(n)) == null ? void 0 : m.zoom) !== void 0);
  j(() => {
    var f;
    if (s.current === n) return;
    s.current = n;
    const h = (f = Ee(n)) == null ? void 0 : f.zoom;
    i.current = h !== void 0;
    const g = h ?? rt(e, He());
    c.current = 1, a.current = g, o(g);
  }, [e, n]), j(() => {
    if (i.current) return;
    const h = rt(e, He()), g = a.current;
    Math.abs(h - g) < 5e-4 || (c.current = 1, a.current = h, o(h));
  }, [e]);
  const l = F((h) => {
    const g = Ht(h), f = a.current;
    Math.abs(g - f) < 5e-4 || (c.current = g / (f || 1), i.current = !0, Wt(s.current, { zoom: g }), o(g));
  }, []), u = F((h) => {
    l(yt(a.current, h));
  }, [l]), d = F((h) => {
    l(rt(h));
  }, [l]);
  return Ce(() => {
    const h = c.current;
    Math.abs(h - 1) < 1e-3 || (c.current = 1, Ps(t == null ? void 0 : t.current, h));
  }, [r, t]), { userZoom: r, onZoomChange: l, stepZoom: u, resetZoom: d };
}
function Ds(e) {
  const { mode: t, setMode: n, beginModeSwitch: r } = e, o = A(t), a = A(n), s = A(r);
  return o.current = t, a.current = n, s.current = r, { setModeKeepingPage: F((i) => {
    i !== o.current && (s.current(), a.current(i));
  }, []) };
}
const Mn = 48;
function ro(e, t = Mn) {
  return e.getBoundingClientRect().top + t;
}
function oo(e, t) {
  if (!e.length)
    return null;
  let n = null, r = -1 / 0;
  for (const i of e) {
    const l = i.getBoundingClientRect();
    l.height < 8 || l.width < 8 || l.top <= t + 1 && l.top >= r && (n = i, r = l.top);
  }
  if (!n && (n = e.find((l) => {
    const u = l.getBoundingClientRect();
    return u.height >= 8 && u.width >= 8;
  }) ?? null, n)) {
    const l = [...e].reverse().find((u) => {
      const d = u.getBoundingClientRect();
      return d.height >= 8 && d.width >= 8;
    });
    l && l.getBoundingClientRect().bottom < t && (n = l);
  }
  if (!n)
    return null;
  const o = Ft(n);
  if (!Number.isFinite(o) || o < 1)
    return null;
  const a = n.getBoundingClientRect(), s = a.height > 0 ? a.height : 1, c = Math.min(1, Math.max(0, (t - a.top) / s));
  return { el: n, page: o, fraction: c };
}
function Lt(e, t, n = Mn) {
  if (!e)
    return null;
  const r = Ot(void 0, t), o = Array.from(e.querySelectorAll(r));
  if (!o.length || e.getBoundingClientRect().height <= 0)
    return null;
  const s = ro(e, n), c = oo(o, s);
  return c ? { page: c.page, fraction: c.fraction } : null;
}
function vt(e, t, n = "auto", r, o = Mn) {
  if (!e || !t)
    return !1;
  const a = Math.max(1, Math.floor(Number(t.page) || 1)), s = Math.min(1, Math.max(0, Number(t.fraction) || 0));
  let c = null;
  if (r && (c = e.querySelector(Ot(a, r))), c || (c = e.querySelector(Ot(a))), !c)
    return !1;
  const i = e.getBoundingClientRect(), l = c.getBoundingClientRect();
  if (i.height <= 0 || l.height < 8 && c.offsetHeight < 8)
    return !1;
  const u = l.height > 0 ? l.height : c.offsetHeight, d = e.scrollTop + (l.top - i.top), m = Math.max(0, d + s * u - o);
  return n === "auto" ? Math.abs(e.scrollTop - m) >= 1 && (e.scrollTop = m) : e.scrollTo({ top: m, behavior: n }), !0;
}
function zs(e, t, n = "smooth", r) {
  return vt(
    e,
    { page: t, fraction: 0 },
    n,
    r
  );
}
function dn(e, t, n) {
  const r = (n == null ? void 0 : n.behavior) ?? "auto", o = (n == null ? void 0 : n.delaysMs) ?? [0, 32, 120, 280];
  let a = !1, s = !1;
  const c = [], i = () => {
    var u;
    if (a) return;
    vt(
      e(),
      t,
      r,
      n == null ? void 0 : n.pane
    ) && !s && (s = !0, (u = n == null ? void 0 : n.onDone) == null || u.call(n));
  };
  for (const l of o)
    l <= 0 ? requestAnimationFrame(() => {
      requestAnimationFrame(i);
    }) : c.push(setTimeout(i, l));
  return () => {
    a = !0;
    for (const l of c)
      clearTimeout(l);
  };
}
function Os(e, t, n) {
  return dn(
    e,
    { page: t, fraction: 0 },
    n
  );
}
function jt(e, t) {
  if (!Number.isFinite(e))
    return 1;
  const n = Math.max(1, Math.floor(e));
  return !Number.isFinite(t) || t <= 0 ? n : Math.min(t, n);
}
function Se(e) {
  return {
    page: Math.max(1, Math.floor(Number(e.page) || 1)),
    fraction: Math.min(1, Math.max(0, Number(e.fraction) || 0))
  };
}
function Fs(e, t, n = !0, r = "", o) {
  const [a, s] = L(1);
  return j(() => {
    if (!n || t <= 0) {
      s(1);
      return;
    }
    const c = e.current;
    if (!c)
      return;
    let i = !1, l = null, u = 0;
    const d = Ot(void 0, o), m = () => {
      if (i) return;
      const f = Array.from(c.querySelectorAll(d));
      if (!f.length)
        return;
      const v = ro(c), b = oo(f, v);
      b && s(b.page);
    }, h = () => {
      i || (u && cancelAnimationFrame(u), u = requestAnimationFrame(() => {
        u = 0, m();
      }));
    }, g = () => {
      if (i) return;
      if (!Array.from(c.querySelectorAll(d)).length) {
        l = setTimeout(g, 120);
        return;
      }
      m(), c.addEventListener("scroll", h, { passive: !0 });
    };
    return g(), () => {
      i = !0, l && clearTimeout(l), u && cancelAnimationFrame(u), c.removeEventListener("scroll", h);
    };
  }, [e, t, n, r, o]), a;
}
const $s = `canvas, .react-pdf__Page, .${Gr}, .${zt}`, sr = /* @__PURE__ */ new WeakMap();
function js(e) {
  const t = Number(e.getAttribute(kn));
  if (Number.isFinite(t) && t > 0)
    return t;
  let n = sr.get(e);
  if ((n == null || !n.isConnected) && (n = e.querySelector($s), sr.set(e, n)), n) {
    const o = n.getBoundingClientRect().height;
    if (Number.isFinite(o) && o > 0)
      return o;
  }
  const r = e.getBoundingClientRect().height;
  return Number.isFinite(r) && r > 0 ? r : 0;
}
function Bs(e, t) {
  if (e.size !== t.size) return !1;
  for (const [n, r] of t)
    if (e.get(n) !== r) return !1;
  return !0;
}
function Us(e) {
  const t = /* @__PURE__ */ new Map();
  e.querySelectorAll(ps()).forEach((r) => {
    const o = Ft(r);
    if (!Number.isFinite(o) || o < 1) return;
    const a = js(r);
    if (a <= 0) return;
    const s = t.get(o) || { height: 0, count: 0 };
    s.height = Math.max(s.height, a), s.count += 1, t.set(o, s);
  });
  const n = /* @__PURE__ */ new Map();
  return t.forEach((r, o) => {
    r.count >= 2 && r.height > 0 && n.set(o, Math.ceil(r.height));
  }), n;
}
function Hs(e, t, n = "", r) {
  const [o, a] = L(() => /* @__PURE__ */ new Map()), s = A(o), c = A(r);
  return c.current = r, Ce(() => {
    if (!t) {
      s.current.size !== 0 && (s.current = /* @__PURE__ */ new Map(), a(s.current));
      return;
    }
    let i = !1, l = 0, u = !1, d = !1;
    const m = () => {
      var w;
      if (i) return;
      const R = e.current;
      if (!R) return;
      const p = Us(R);
      Bs(s.current, p) || (s.current = p, a(p)), u && !d && (d = !0, (w = c.current) == null || w.call(c));
    }, h = () => {
      cancelAnimationFrame(l), l = requestAnimationFrame(() => {
        requestAnimationFrame(m);
      });
    };
    h();
    const g = window.setTimeout(h, 100), f = window.setTimeout(() => {
      u = !0, h();
    }, 300), v = window.setTimeout(h, 700), b = e.current;
    let S = null;
    return b && typeof ResizeObserver < "u" && (S = new ResizeObserver(() => h()), S.observe(b)), () => {
      i = !0, cancelAnimationFrame(l), window.clearTimeout(g), window.clearTimeout(f), window.clearTimeout(v), S == null || S.disconnect();
    };
  }, [e, t, n]), o;
}
const Ws = [0, 48, 140, 320, 560], Vs = 700, Js = [80, 200, 400], qs = 500, Gs = 50, Ks = /* @__PURE__ */ new Set([
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
]), Zs = 180, ir = [0, 48, 140, 320, 700, 1200];
function Ys(e, t) {
  var T;
  const {
    primaryPane: n,
    mode: r,
    enabled: o = !0,
    persistenceKey: a = "",
    restoreReady: s = !0
  } = t, c = A(
    ((T = Ee(a)) == null ? void 0 : T.anchor) || { page: 1, fraction: 0 }
  ), i = A(null), l = A(!1), u = A(r), d = A(null), m = A(null), h = A(null), g = A(null), f = A(a), v = A(""), b = A(n);
  b.current = n;
  const S = F(() => {
    var I;
    (I = d.current) == null || I.call(d), d.current = null, m.current != null && (clearTimeout(m.current), m.current = null);
  }, []), R = F(() => {
    !l.current && i.current == null || (S(), h.current != null && (clearTimeout(h.current), h.current = null), i.current = null, l.current = !1);
  }, [S]), p = F((I = !1) => {
    g.current != null && (clearTimeout(g.current), g.current = null);
    const N = () => {
      g.current = null, Wt(f.current, {
        anchor: Se(c.current)
      });
    };
    I ? N() : g.current = setTimeout(N, Zs);
  }, []), w = F((I) => {
    c.current = Se(I), i.current = null, h.current != null && clearTimeout(h.current), h.current = setTimeout(() => {
      h.current = null, l.current = !1;
    }, Gs);
  }, []);
  j(() => {
    if (!o)
      return;
    let I = !1, N = null, z = null, H = null;
    const Z = () => {
      if (I) return;
      const G = e.current;
      if (!G) {
        H = setTimeout(Z, 50);
        return;
      }
      N = G, z = () => {
        if (l.current)
          return;
        const ae = Lt(N, b.current);
        ae && (c.current = ae, p());
      }, N.addEventListener("scroll", z, { passive: !0 }), l.current || z();
    };
    return Z(), () => {
      I = !0, H != null && clearTimeout(H), N && z && N.removeEventListener("scroll", z);
    };
  }, [o, r, n, e, p]), j(() => {
    if (!o) return;
    const I = e.current;
    if (!I) return;
    const N = (z) => {
      z.metaKey || z.ctrlKey || z.altKey || Ks.has(z.key) && R();
    };
    return I.addEventListener("wheel", R, { passive: !0 }), I.addEventListener("touchmove", R, { passive: !0 }), window.addEventListener("keydown", N), () => {
      I.removeEventListener("wheel", R), I.removeEventListener("touchmove", R), window.removeEventListener("keydown", N);
    };
  }, [o, e, R]), Ce(() => {
    var N;
    if (f.current === a) return;
    p(!0), S(), h.current != null && (clearTimeout(h.current), h.current = null), f.current = a, v.current = "";
    const I = (N = Ee(a)) == null ? void 0 : N.anchor;
    c.current = I ? Se(I) : { page: 1, fraction: 0 }, i.current = null, l.current = !!a, u.current = r;
  }, [a, r, p, S]), j(() => {
    var N;
    if (!o || !s || !a || v.current === a) return;
    v.current = a;
    const I = Se(
      ((N = Ee(a)) == null ? void 0 : N.anchor) || { page: 1, fraction: 0 }
    );
    return c.current = I, i.current = I, l.current = !0, S(), d.current = dn(
      () => e.current,
      I,
      {
        behavior: "auto",
        pane: b.current,
        delaysMs: ir,
        onDone: () => w(I)
      }
    ), m.current = setTimeout(() => {
      m.current = null, w(I);
    }, Math.max(...ir) + 160), () => S();
  }, [o, s, a, e, w, S]), j(() => {
    if (u.current === r)
      return;
    if (u.current = r, !o) {
      l.current = !1, i.current = null, S();
      return;
    }
    const I = i.current ? Se(i.current) : Se(c.current);
    return l.current = !0, i.current = I, c.current = I, S(), d.current = dn(
      () => e.current,
      I,
      {
        behavior: "auto",
        pane: n,
        // 等页宽/行高同步后再钉；同一 locked 幂等，不会越滚越远
        delaysMs: Ws,
        onDone: () => w(I)
      }
    ), m.current = setTimeout(() => {
      m.current = null, w(I);
    }, Vs), () => {
      S();
    };
  }, [r, o, n, e, w, S]), j(() => () => {
    S(), h.current != null && (clearTimeout(h.current), h.current = null), p(!0);
  }, [S, p]);
  const k = F(() => {
    const I = Lt(
      e.current,
      b.current
    );
    return Se(I || c.current);
  }, [e]), _ = F(() => {
    l.current = !0;
    const I = Lt(
      e.current,
      b.current
    ), N = Se(I ?? c.current);
    return c.current = N, i.current = N, p(), N;
  }, [e, p]), O = F((I, N, z) => {
    const H = z || b.current, Z = jt(I, N || 1), G = { page: Z, fraction: 0 };
    c.current = G, l.current = !0, i.current = G, p(), S(), zs(e.current, Z, "smooth", H), d.current = Os(
      () => e.current,
      Z,
      {
        behavior: "auto",
        pane: H,
        delaysMs: Js,
        onDone: () => w(G)
      }
    ), m.current = setTimeout(() => {
      m.current = null, w(G);
    }, qs);
  }, [e, w, S, p]), x = F(() => Se(c.current), []), E = F(() => l.current, []), P = F(() => {
    if (!l.current || !i.current)
      return;
    const I = Se(i.current);
    vt(
      e.current,
      I,
      "auto",
      b.current
    );
  }, [e]);
  return {
    lockFromShell: k,
    beginModeSwitch: _,
    goToPage: O,
    getAnchor: x,
    isRestoring: E,
    repinIfRestoring: P
  };
}
function Xs(e, t) {
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
function ao(e, t, n) {
  const r = `${(n == null ? void 0 : n.jobId) || ""}`.trim(), o = `${(n == null ? void 0 : n.documentId) || ""}`.trim(), a = `j:${r}:d:${o}`;
  return t == null ? `${a}:none:${(e == null ? void 0 : e.blockId) || ""}` : `${a}:p:${t}:b:${(e == null ? void 0 : e.blockId) || ""}`;
}
const Qs = [0, 80, 200, 400, 800], ei = 120, ti = 400;
function ni(e, t, n) {
  const { enabled: r, numPages: o, goToPage: a, resolveBlockPage: s, onAnchorApplied: c, jobId: i, documentId: l, regionsSettled: u = !0 } = e, d = A(a);
  d.current = a;
  const m = A(s);
  m.current = s;
  const h = A(c);
  h.current = c;
  const g = A(n);
  g.current = n, j(() => {
    var p, w;
    if (!r || !Number.isFinite(o) || o < 1)
      return;
    const f = Ra(), v = Xs(f, m.current);
    if (v == null && (f != null && f.blockId) && !u) return;
    const b = ao(f, v, { jobId: i, documentId: l });
    if (t.current === b)
      return;
    if (v == null) {
      t.current = b, (p = g.current) == null || p.call(g);
      return;
    }
    t.current = b, f && ((w = h.current) == null || w.call(h, f, v));
    const S = [];
    let R = 0;
    for (const k of Qs)
      R = Math.max(R, k), S.push(
        setTimeout(() => {
          d.current(v);
        }, k)
      );
    return S.push(
      setTimeout(() => {
        var k;
        (k = g.current) == null || k.call(g);
      }, R + ei)
    ), () => {
      for (const k of S) clearTimeout(k);
    };
  }, [r, o, i, l, t, u]);
}
function ri(e) {
  var a;
  const t = globalThis.window;
  if (!t || typeof ((a = t.history) == null ? void 0 : a.replaceState) != "function") return;
  const n = t.location, r = `${e || ""}`, o = `${n.pathname}${r ? `?${r}` : ""}${n.hash || ""}`;
  t.history.replaceState(null, "", o);
}
function oi(e, t, n) {
  const {
    syncEnabled: r,
    currentPage: o,
    resolveBlockPage: a,
    syncDebounceMs: s = ti,
    jobId: c,
    documentId: i,
    applyReaderSearch: l
  } = e, u = A(a);
  u.current = a;
  const d = A(l);
  d.current = l;
  const m = A(0);
  j(() => {
    if (!n || !r || !t.current || !Number.isFinite(o) || o < 1 || m.current === o) return;
    const h = setTimeout(() => {
      var b;
      const g = ((b = globalThis.location) == null ? void 0 : b.search) || "", f = qo(g, o, u.current);
      if (m.current = o, f === null) return;
      const v = `${new URLSearchParams(f).get("block_id") || ""}`.trim();
      t.current = ao(
        { blockId: v },
        o,
        { jobId: c, documentId: i }
      ), (d.current || ri)(f);
    }, s);
    return () => clearTimeout(h);
  }, [
    n,
    r,
    o,
    s,
    c,
    i,
    t
  ]);
}
function ai(e) {
  const t = A(""), [n, r] = L(!1), o = F(() => r(!0), []), a = {
    enabled: e.enabled,
    numPages: e.numPages,
    goToPage: e.goToPage,
    resolveBlockPage: e.resolveBlockPage,
    onAnchorApplied: e.onAnchorApplied,
    jobId: e.jobId,
    documentId: e.documentId,
    regionsSettled: e.regionsSettled
  };
  ni(a, t, o), oi(e, t, n);
}
const ft = {
  layoutByPage: /* @__PURE__ */ new Map(),
  pagesByPage: /* @__PURE__ */ new Map(),
  lastSeq: 0,
  connection: "idle",
  jobStatus: "",
  error: ""
};
function si(e) {
  return new Map(((e == null ? void 0 : e.pages) || []).map((t) => [t.page_idx, t]));
}
function cr(e, t) {
  return e.attempt !== t.attempt ? e.attempt < t.attempt ? -1 : 1 : e.generation !== t.generation ? e.generation < t.generation ? -1 : 1 : 0;
}
function so(e, t, n) {
  if (n.page_idx !== t.page_idx) return "retry";
  const r = cr(n, t);
  if (r < 0 || r === 0 && n.page_hash !== t.page_hash) return "retry";
  if (!e) return "accept";
  const o = cr(n, e);
  return o < 0 || o === 0 && n.page_hash === e.pageHash ? "ignore" : "accept";
}
function ii(e, t, n) {
  if (t.seq <= e.lastSeq) return e;
  const r = e.pagesByPage.get(t.page_idx), o = so(r, t, n);
  if (o === "retry") return e;
  if (o === "ignore")
    return { ...e, lastSeq: t.seq, connection: "live", error: "" };
  const a = new Map(n.items.map((i) => [i.item_id, i])), s = new Map((r == null ? void 0 : r.changedAtSeqById) || []);
  for (const i of t.changed_item_ids)
    a.has(i) && s.set(i, t.seq);
  const c = new Map(e.pagesByPage);
  return c.set(t.page_idx, {
    attempt: n.attempt,
    generation: n.generation,
    pageHash: n.page_hash,
    itemsById: a,
    changedAtSeqById: s,
    lastEventSeq: t.seq
  }), {
    ...e,
    pagesByPage: c,
    lastSeq: t.seq,
    connection: "live",
    error: ""
  };
}
function ci(e) {
  const { hasOverlayContent: t, connection: n, showSource: r } = e;
  return {
    topBarPill: t && n !== "terminal",
    sourcePaneToggle: t && r,
    // 和 resolveReaderPaneComposition 的 overlayOnSource 同一套条件，外加
    // 「源文栏得在台面上」——否则叠层没有落脚的地方。
    overlayRenderable: t && r && e.liveTranslationVisible && !e.assistantOpen
  };
}
const lr = [250, 500, 1e3, 2e3, 4e3], Kt = [80, 160, 320, 640, 1e3, 1500], ur = [250, 500, 1e3, 2e3, 4e3, 5e3];
function fn(e, t) {
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
function Nn(e) {
  return ea(e) ? `${e.code || ""}`.trim() : "";
}
function Mt(e, t) {
  const n = Nn(e);
  return n === "LIVE_TRANSLATION_PAGE_NOT_COMMITTED" ? "尚未收到可显示的页面译文" : n === "LIVE_TRANSLATION_LAYOUT_NOT_READY" ? "正在等待 OCR 版面数据" : `${(e == null ? void 0 : e.message) || ""}`.trim() || t;
}
async function li(e, t, n, r, o) {
  let a = null;
  for (let s = 0; ; s += 1) {
    try {
      const i = await o.fetchPage(e, t.page_idx, { signal: r });
      if (so(n.pagesByPage.get(t.page_idx), t, i) !== "retry")
        return i;
      a = ta(
        "Authoritative page snapshot has not reached the event generation",
        409,
        "LIVE_TRANSLATION_SNAPSHOT_UNAVAILABLE"
      );
    } catch (i) {
      if ((i == null ? void 0 : i.name) === "AbortError") throw i;
      a = i;
      const l = Nn(i);
      if (l && ![
        "LIVE_TRANSLATION_PAGE_NOT_COMMITTED",
        "LIVE_TRANSLATION_SNAPSHOT_UNAVAILABLE"
      ].includes(l)) throw i;
    }
    const c = Kt[Math.min(s, Kt.length - 1)];
    if (await fn(c, r), s >= Kt.length + 2) throw a;
  }
}
function ui({
  jobId: e,
  jobStatus: t,
  enabled: n,
  liveTranslationPort: r = void 0
}) {
  const [o, a] = L(ft), s = A(o), c = A("");
  s.current = o;
  const i = `${e || ""}`.trim(), l = `${t || ""}`.trim().toLowerCase(), u = Pn(l) ? l : "";
  return j(() => {
    if (!n || !i) {
      c.current = "", s.current = ft, a(ft);
      return;
    }
    const d = r === void 0 ? Sa() : r, m = c.current === i;
    if (c.current = i, !d) {
      const R = {
        ...m ? s.current : ft,
        connection: u ? "terminal" : "unavailable",
        jobStatus: l,
        error: "实时译文暂不可用"
      };
      s.current = R, a(R);
      return;
    }
    const h = new AbortController();
    let g = !1;
    const f = {
      ...m ? s.current : ft,
      connection: u ? "terminal" : "connecting",
      jobStatus: l,
      error: ""
    };
    s.current = f, a(f);
    const v = (R) => {
      h.signal.aborted || a((p) => {
        const w = R(p);
        return s.current = w, w;
      });
    }, b = async () => {
      let R = 0;
      for (; !h.signal.aborted; )
        try {
          const p = await d.fetchLayout(i, { signal: h.signal });
          g = !0, v((w) => ({
            ...w,
            layoutByPage: si(p),
            jobStatus: l,
            error: ""
          }));
          return;
        } catch (p) {
          if ((p == null ? void 0 : p.name) === "AbortError") return;
          const w = Nn(p);
          if (!(w === "LIVE_TRANSLATION_LAYOUT_NOT_READY" || !w)) {
            v((_) => ({
              ..._,
              connection: u ? "terminal" : "unavailable",
              jobStatus: l,
              error: Mt(p, "实时译文暂不可用")
            }));
            return;
          }
          if (u) {
            v((_) => ({
              ..._,
              connection: "terminal",
              jobStatus: l,
              error: ""
            }));
            return;
          }
          v((_) => ({
            ..._,
            connection: "connecting",
            jobStatus: l,
            error: Mt(p, "正在等待 OCR 版面数据")
          })), await fn(lr[Math.min(R, lr.length - 1)], h.signal).catch(() => {
          }), R += 1;
        }
    };
    return (async () => {
      if (await b(), !g || h.signal.aborted) return;
      let R = 0;
      for (; !h.signal.aborted; ) {
        u || v((p) => ({
          ...p,
          connection: p.lastSeq > 0 ? "reconnecting" : "connecting",
          jobStatus: l,
          // 保留已有错误：首页还没提交（lastSeq 为 0）时恰恰是最容易出错的阶段，
          // 此前这里把它清成空串，UI 于是一直显示「连接中」，用户看到的是
          // "正在努力"，实际可能已经在反复失败。
          error: p.error
        }));
        try {
          await d.streamEvents(i, {
            afterSeq: s.current.lastSeq,
            signal: h.signal,
            onEvent: async (p) => {
              if (p.seq <= s.current.lastSeq) return;
              let w;
              try {
                w = await li(
                  i,
                  p,
                  s.current,
                  h.signal,
                  d
                );
              } catch (k) {
                if ((k == null ? void 0 : k.name) === "AbortError" || h.signal.aborted) throw k;
                v((_) => ({
                  ..._,
                  lastSeq: Math.max(_.lastSeq, p.seq),
                  error: Mt(k, "部分页面的实时译文暂时取不到")
                }));
                return;
              }
              v((k) => {
                const _ = ii(k, p, w);
                return u ? {
                  ..._,
                  connection: "terminal",
                  jobStatus: l
                } : {
                  ..._,
                  jobStatus: l
                };
              }), R = 0;
            }
          });
        } catch (p) {
          if ((p == null ? void 0 : p.name) === "AbortError" || h.signal.aborted) return;
          v((w) => ({
            ...w,
            connection: u ? "terminal" : "reconnecting",
            jobStatus: l,
            error: Mt(p, "实时译文连接已中断，正在重连")
          }));
        }
        if (h.signal.aborted) return;
        if (u) {
          v((p) => ({
            ...p,
            connection: "terminal",
            jobStatus: l
          }));
          return;
        }
        await fn(ur[Math.min(R, ur.length - 1)], h.signal).catch(() => {
        }), R += 1;
      }
    })(), () => h.abort();
  }, [n, r, i, u]), o;
}
function di(e) {
  const t = e && typeof e == "object" ? e : {}, n = t.data && typeof t.data == "object" ? t.data : t, r = Array.isArray(n.groups) ? n.groups : [], o = /* @__PURE__ */ new Map();
  for (const a of r) {
    const s = a || {}, c = `${s.value ?? ""}`.trim(), i = Number(s.count) || 0;
    c && i > 0 && o.set(c, i);
  }
  return o;
}
function fi(e, t = !0) {
  const [n, r] = L(() => /* @__PURE__ */ new Map());
  return j(() => {
    r((c) => c.size ? /* @__PURE__ */ new Map() : c);
    const o = `${e || ""}`.trim();
    if (!t || !o) return;
    const a = Ut().fetchRevisionGroups;
    if (!a) return;
    let s = !1;
    return a(o).then((c) => {
      !s && c && r(di(c));
    }).catch(() => {
    }), () => {
      s = !0;
    };
  }, [e, t]), n;
}
const mi = 4500;
function hi(e) {
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
const pi = /* @__PURE__ */ new Set(["book", "translate"]);
function io(e) {
  return !!(e.jobId && e.sourceUrl && pi.has(e.workflow));
}
function gi(e) {
  return !!(io(e) && !(e.jobStatus === "succeeded" && e.translatedUrl));
}
function bi() {
  const e = os(), t = io({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    workflow: e.workflow
  }), n = gi({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    translatedUrl: e.translatedUrl,
    jobStatus: e.jobStatus,
    workflow: e.workflow
  }), r = A({ jobId: "", running: !1 });
  r.current.jobId !== e.jobId && (r.current = { jobId: e.jobId, running: !1 });
  const o = `${e.jobStatus || ""}`.trim().toLowerCase();
  o && !Pn(o) && (r.current.running = !0);
  const a = ui({
    jobId: e.jobId,
    jobStatus: e.jobStatus,
    enabled: t && (n || r.current.running)
  }), { shellRef: s, shellEl: c, shellWidth: i, bindShell: l } = cs(), u = fi(e.jobId, !e.sourceOnly), d = Ms({
    documentId: e.documentId,
    jobId: e.jobId
  }), m = `${d}\0${e.jobId}\0${e.sourceUrl}\0${e.translatedUrl}`, { userZoom: h, onZoomChange: g } = xs(e.mode, s, d), f = us(
    {
      mode: e.mode,
      sourceOnly: e.sourceOnly,
      assetsReady: e.assetsReady,
      sourceUrl: e.sourceUrl,
      translatedUrl: e.translatedUrl,
      sourceFile: e.sourceFile,
      translatedFile: e.translatedFile
    },
    { userZoom: h, shellWidth: i, identityKey: m }
  ), {
    beginModeSwitch: v,
    goToPage: b,
    repinIfRestoring: S
  } = Ys(s, {
    primaryPane: f.primaryPane,
    mode: e.mode,
    enabled: !e.boot.loading,
    persistenceKey: d,
    restoreReady: f.primaryNumPages > 0
  });
  j(() => {
    S();
  }, [i, S]);
  const R = Hs(
    s,
    f.compareMode,
    f.rowSyncRevision,
    S
  ), p = Fs(
    s,
    f.primaryNumPages,
    !e.boot.loading,
    `${e.mode}-${h}-${f.metricsTick}`,
    f.primaryPane
  ), w = F((C, se) => {
    var X, me;
    const ne = Math.max(
      Number(f.hudNumPages) || 0,
      Number(f.primaryNumPages) || 0,
      Number((X = f.numPagesByPane) == null ? void 0 : X.source) || 0,
      Number((me = f.numPagesByPane) == null ? void 0 : me.translated) || 0
    );
    b(C, ne, se);
  }, [b, f.hudNumPages, f.primaryNumPages, f.numPagesByPane]), [k, _] = L(null), [O, x] = L(null), E = A(null), P = F((C) => {
    E.current && clearTimeout(E.current), _(C), C && (E.current = setTimeout(() => _(null), mi));
  }, []);
  j(() => () => {
    E.current && clearTimeout(E.current);
  }, []);
  const T = F((C) => {
    const se = qt(e.regions, C);
    return se ? Yn(se, f.primaryPane).page : null;
  }, [e.regions, f.primaryPane]), I = F((C, se) => {
    const ne = se || f.primaryPane, X = typeof C == "object" && C ? `${C.block_id || ""}`.trim() : "", me = typeof C == "object" && C ? `${C.image_url || ""}`.trim() : "", Y = typeof C == "object" && C ? C.page_idx != null ? Number(C.page_idx) + 1 : C.page != null ? Number(C.page) : null : typeof C == "number" ? C + 1 : null, K = Zo(e.regions, me, Y) || qt(e.regions, X) || (typeof C == "object" ? Yo(e.regions, C) : null);
    let he = K ? Yn(K, ne).page : null;
    he == null && (he = hi(C)), !(he == null || he < 1) && (P(K), w(he, ne));
  }, [P, w, f.primaryPane, e.regions]), N = F((C, se) => {
    var X;
    const ne = (X = s.current) == null ? void 0 : X.scrollTop;
    ne != null && x(ne), I(C, se);
  }, [I, s]), z = F(() => {
    var C;
    O != null && ((C = s.current) == null || C.scrollTo({ top: O, behavior: "smooth" }), x(null));
  }, [O, s]);
  ai({
    enabled: !e.boot.loading && !e.boot.failed && e.assetsReady,
    syncEnabled: !e.boot.loading && !e.boot.failed && e.assetsReady,
    numPages: f.hudNumPages || 0,
    currentPage: p,
    goToPage: w,
    resolveBlockPage: T,
    jobId: e.jobId,
    documentId: e.documentId,
    regionsSettled: e.regionsSettled,
    onAnchorApplied: (C) => {
      P(qt(e.regions, C.blockId));
    }
  });
  const { setModeKeepingPage: H } = Ds({
    mode: e.mode,
    setMode: e.setMode,
    beginModeSwitch: v
  });
  j(() => {
    P(null), x(null);
  }, [m, P]);
  const Z = !e.boot.loading && !e.boot.failed, G = q(() => ({ bindShell: l, shellEl: c, shellWidth: i, shellRef: s }), [l, c, i, s]), ae = q(() => ({
    sourceUrl: e.sourceUrl,
    translatedUrl: e.translatedUrl,
    sourceFile: e.sourceFile,
    translatedFile: e.translatedFile
  }), [e.sourceUrl, e.translatedUrl, e.sourceFile, e.translatedFile]), B = q(() => ({
    session: e,
    boot: e.boot,
    sourceOnly: e.sourceOnly,
    mode: e.mode,
    userZoom: h,
    onZoomChange: g,
    shell: G,
    panes: f,
    sessionFiles: ae,
    rowHeights: R,
    goToPage: w,
    activeRegion: k,
    jumpToAnchor: I,
    jumpToReference: N,
    referenceReturnAvailable: O != null,
    restoreReferencePosition: z,
    setModeKeepingPage: H,
    download: e.download,
    showHud: Z,
    viewStateKey: d,
    liveTranslation: a,
    liveTranslationAvailable: n,
    revisedBlocks: u
  }), [e, G, f, ae, R, w, k, I, N, O, z, H, Z, h, g, d, a, n, u]);
  return q(() => ({
    ...B,
    currentPage: p
  }), [B, p]);
}
const yi = [
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
], vi = [
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
      { actions: ["mode-source"], keys: "1", desc: "原文" },
      { actions: ["mode-compare"], keys: "2", desc: "对照" },
      { actions: ["mode-translated"], keys: "3", desc: "译文" }
    ]
  }
];
function wi(e) {
  const t = e.length === 1 ? e.toLowerCase() : e;
  for (const n of yi)
    if (n.keys.some(
      (o) => o.length === 1 ? o === t : o === e
    )) return n;
  return null;
}
function Si(e) {
  if (!(e instanceof HTMLElement))
    return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
const Ri = ".reader-notes-panel";
function Pi(e) {
  return e instanceof Element ? !!e.closest(Ri) : !1;
}
function Ii(e) {
  const {
    mode: t,
    sourceOnly: n,
    setMode: r,
    userZoom: o,
    onZoomChange: a,
    currentPage: s,
    numPages: c,
    goToPage: i,
    enabled: l = !0
  } = e;
  j(() => {
    if (!l)
      return;
    const u = (d) => {
      if (d.defaultPrevented || d.metaKey || d.ctrlKey || d.altKey || Si(d.target) || Pi(d.target))
        return;
      const m = d.key, h = wi(m);
      if (h) {
        if (h.mode) {
          if (n && h.mode !== "source")
            return;
          d.preventDefault(), r(h.mode);
          return;
        }
        if (!(h.requiresPages && c <= 0))
          switch (d.preventDefault(), h.action) {
            case "zoom-in":
              a(yt(o, 1));
              return;
            case "zoom-out":
              a(yt(o, -1));
              return;
            case "zoom-reset":
              a(rt(t, He()));
              return;
            case "next-page":
              i(jt(s + 1, c));
              return;
            case "prev-page":
              i(jt(s - 1, c));
              return;
            case "first-page":
              i(1);
              return;
            case "last-page":
              i(c);
              return;
          }
      }
    };
    return window.addEventListener("keydown", u), () => window.removeEventListener("keydown", u);
  }, [
    l,
    t,
    n,
    r,
    o,
    a,
    s,
    c,
    i
  ]);
}
const Ti = "retainpdf:soft-reader-close";
function Ei() {
  return new URL("./index.html", window.location.href).href;
}
function ki() {
  if (typeof window > "u" || window.self === window.top) return !1;
  try {
    return window.parent.postMessage(
      { type: Ti },
      window.location.origin
    ), !0;
  } catch {
    return !1;
  }
}
function Ai(e, t, n) {
  if (n <= 1 || !e) return !1;
  try {
    const r = new URL(t), o = new URL(e, r);
    return o.origin === r.origin && !/reader\.html$/i.test(o.pathname) && !/detail\.html$/i.test(o.pathname);
  } catch {
    return !1;
  }
}
function Mi() {
  if (!(typeof window > "u") && !ki()) {
    if (Ai(
      document.referrer,
      window.location.href,
      window.history.length
    )) {
      window.history.back();
      return;
    }
    window.location.assign(Ei());
  }
}
function Ni({
  id: e,
  className: t,
  label: n,
  pressed: r,
  onClick: o,
  children: a
}) {
  return /* @__PURE__ */ y("button", { id: e, type: "button", className: t, "aria-label": n, title: n, "aria-pressed": r, onClick: o, children: a });
}
function _i({ onBeforeClose: e } = {}) {
  return /* @__PURE__ */ D(Ni, { id: "reader-close-home-btn", className: "reader-close-home-btn", label: "返回主页", onClick: () => {
    e == null || e(), Mi();
  }, children: [
    /* @__PURE__ */ y(En, { className: "reader-close-home-icon", size: 18, strokeWidth: 2.25, "aria-hidden": !0 }),
    /* @__PURE__ */ y("span", { className: "reader-close-home-label", children: "关闭" })
  ] });
}
let dr = !1;
function Li() {
  if (dr)
    return;
  const e = bt().resolvePdfjsVendorUrl("build/pdf.worker.mjs");
  e && (Vr.GlobalWorkerOptions.workerSrc = e, dr = !0);
}
async function Ci(e) {
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
const xi = /* @__PURE__ */ new Set(["text", "formula", "table", "figure"]);
function Di(e, t, n) {
  return e.flatMap((r) => {
    if (!xi.has(In(r.region))) return [];
    const o = Tn(r, t, n);
    return o ? [{ itemId: r.itemId, highlight: r, rect: o }] : [];
  });
}
function fr(e, t, n) {
  let r = null, o = Number.POSITIVE_INFINITY;
  for (const a of e) {
    const { rect: s } = a;
    if (t < s.left || t > s.left + s.width || n < s.top || n > s.top + s.height)
      continue;
    const c = s.width * s.height;
    c < o && (r = a, o = c);
  }
  return r;
}
const je = "reader-text-hover-copy", zi = "reader-text-hover-id", co = "reader-text-hover-tools";
function Ne({
  className: e,
  state: t,
  label: n,
  title: r,
  onClick: o,
  children: a
}) {
  return /* @__PURE__ */ y(
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
function Oi(e) {
  const t = e.assetUrls[0] || e.assetIds[0] || "";
  if (!t) return "";
  try {
    return Ma("", t);
  } catch {
    return t;
  }
}
async function _n(e) {
  const t = await wa(e);
  if (!t.ok) throw new Error(`图片加载失败（${t.status}）`);
  return t.blob();
}
async function Fi(e) {
  var n;
  if (e.type === "image/png") return e;
  const t = URL.createObjectURL(e);
  try {
    const r = new Image();
    r.src = t, await r.decode();
    const o = document.createElement("canvas");
    return o.width = r.naturalWidth, o.height = r.naturalHeight, (n = o.getContext("2d")) == null || n.drawImage(r, 0, 0), await new Promise((a, s) => {
      o.toBlob((c) => c ? a(c) : s(new Error("图片转换失败")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(t);
  }
}
async function $i(e) {
  var n;
  if (!e || !((n = navigator.clipboard) != null && n.write) || typeof ClipboardItem > "u") return !1;
  const t = await Fi(await _n(e));
  return await navigator.clipboard.write([new ClipboardItem({ "image/png": t })]), !0;
}
async function ji(e) {
  const t = URL.createObjectURL(await _n(e)), n = document, r = n.createElement("div");
  r.className = "reader-pdf-image-preview", r.setAttribute("role", "dialog"), r.setAttribute("aria-modal", "true"), r.setAttribute("aria-label", "图片预览");
  const o = n.createElement("div");
  o.className = "reader-pdf-image-preview-panel";
  const a = n.createElement("button");
  a.type = "button", a.className = "reader-pdf-image-preview-close", a.textContent = "关闭", a.setAttribute("aria-label", "关闭图片预览");
  const s = n.createElement("img");
  s.src = t, s.alt = "PDF 图片预览";
  const c = () => {
    n.removeEventListener("keydown", i, !0), URL.revokeObjectURL(t), r.remove();
  }, i = (l) => {
    l.key === "Escape" && (l.preventDefault(), c());
  };
  a.onclick = c, r.onclick = (l) => {
    l.target === r && c();
  }, o.append(a, s), r.append(o), n.body.append(r), n.addEventListener("keydown", i, !0), a.focus();
}
async function Bi(e) {
  const t = URL.createObjectURL(await _n(e)), n = document.createElement("a");
  n.href = t, n.download = "paperloom-image", n.click(), window.setTimeout(() => URL.revokeObjectURL(t), 6e4);
}
function Ui(e) {
  if (typeof DOMParser > "u" || !/<table(?:\s|>)/i.test(e)) return [];
  const t = new DOMParser().parseFromString(e, "text/html").querySelector("table");
  return t ? [...t.rows].map((n) => [...n.cells].map((r) => {
    var o;
    return ((o = r.textContent) == null ? void 0 : o.replace(/\s+/g, " ").trim()) || "";
  })) : [];
}
function Hi(e) {
  const t = Ui(e);
  if (t.length) return t;
  const n = e.trim().split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  return n.length ? n.some((r) => r.includes("|")) ? n.filter((r) => !/^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/.test(r)).map((r) => r.replace(/^\|\s*/, "").replace(/\s*\|$/, "").split("|").map((o) => o.trim())) : n.some((r) => r.includes("	")) ? n.map((r) => r.split(/\t+/).map((o) => o.trim())) : n.map((r) => [r]) : [];
}
function Wi(e) {
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
function Zt(e, t, n) {
  const r = t === "translated" ? e.translated : e.source, o = e.markdown.trim() || r.text.trim();
  if (n === "text") return rn(e, t);
  const a = Hi(o);
  if (!a.length) return rn(e, t);
  const s = Math.max(...a.map((i) => i.length)), c = a.map((i) => Array.from({ length: s }, (l, u) => i[u] || ""));
  if (n === "markdown") {
    const i = `| ${c[0].join(" | ")} |`, l = `| ${c[0].map(() => "---").join(" | ")} |`;
    return [i, l, ...c.slice(1).map((u) => `| ${u.join(" | ")} |`)].join(`
`);
  }
  return [
    `\\begin{tabular}{${"l".repeat(s)}}`,
    ...c.map((i) => `${i.map(Wi).join(" & ")} \\\\`),
    "\\end{tabular}"
  ].join(`
`);
}
const lo = 26, uo = 250;
function fo(e, t = uo) {
  return e.height < lo * 2 || e.width < t;
}
function Vi(e) {
  var t;
  return ((t = e.match(/\[(\d+)\]/)) == null ? void 0 : t[1]) || null;
}
function Ji(e) {
  const t = [];
  for (const n of e.split(/[,;，、]/)) {
    const r = n.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (r) {
      const o = Number(r[1]), a = Math.min(o + 31, Number(r[2]));
      for (let s = o; s <= a; s += 1) t.push(`${s}`);
    } else /^\d+$/.test(n.trim()) && t.push(`${Number(n.trim())}`);
  }
  return t;
}
function mo(e) {
  const t = [], n = (r) => {
    for (const o of Ji(r))
      t.includes(o) || t.push(o);
  };
  for (const r of e.matchAll(/\[((?:\d+\s*[-–]\s*\d+|\d+)(?:\s*[,;，、]\s*(?:\d+\s*[-–]\s*\d+|\d+))*)\]/g)) n(r[1]);
  for (const r of e.matchAll(/【((?:\d+\s*[-–]\s*\d+|\d+)(?:\s*[,;，、]\s*(?:\d+\s*[-–]\s*\d+|\d+))*)】/g)) n(r[1]);
  for (const r of e.matchAll(/<sup[^>]*>\s*(\d+(?:\s*[-–]\s*\d+)?)\s*<\/sup>/gi)) n(r[1]);
  return t.slice(0, 32);
}
function qi(e, t) {
  return `${e}`.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, "") + `|${t.toLocaleLowerCase()}`;
}
function Ln(e) {
  const t = [], n = /* @__PURE__ */ new Set(), r = (o, a) => {
    const s = o.trim().replace(/\s+/g, " "), c = a.trim().toLocaleLowerCase();
    if (!s || !/^\d{4}[a-z]?$/.test(c)) return;
    const i = qi(s, c);
    n.has(i) || (n.add(i), t.push({ key: i, label: `${s}, ${c}` }));
  };
  for (const o of e.matchAll(/([\p{L}][\p{L}'’.-]{1,}(?:\s+et\s+al\.?|\s+(?:and|&)\s+[\p{L}][\p{L}'’.-]{1,})?)\s*[,，]?\s*[（(]?\s*((?:19|20)\d{2}[a-z]?)\s*[)）]?/giu))
    r(o[1], o[2]);
  return t.slice(0, 16);
}
function ho(e) {
  const t = /* @__PURE__ */ new Map();
  for (const n of e) {
    const r = n.source.text || n.translated.text || "", a = [Vi(r), ...Ln(r).map((s) => s.key)].filter(Boolean);
    for (const s of a) {
      const c = t.get(s) || [];
      c.push(n), t.set(s, c);
    }
  }
  return t;
}
function Gi(e, t, n, r) {
  if (In(e.highlight.region) !== "text" || e.highlight.region.subType === "reference_entry") return [];
  const o = e.highlight.region.source.text || e.highlight.region.translated.text || "", a = n ? [n] : mo(o), s = n ? [] : Ln(o);
  return (n ? [{ key: n, label: r || n }] : [
    ...a.map((i) => ({ key: i, label: i })),
    ...s
  ]).flatMap(({ key: i, label: l }) => (t.get(i) || []).map((u) => ({
    itemId: u.itemId,
    label: l,
    text: (u.source.text || u.translated.text || "").trim(),
    page: u.source.page
  }))).filter((i, l, u) => u.findIndex((d) => d.itemId === i.itemId) === l);
}
function Ki({
  target: e,
  pane: t = "source",
  revisedCount: n = 0,
  referenceIndex: r,
  referenceRegions: o,
  citationLabel: a,
  citationDisplayLabel: s,
  citationRect: c,
  onReferenceClick: i
}) {
  const [l, u] = L("idle"), [d, m] = L("idle"), h = A([]), g = (e == null ? void 0 : e.itemId) || "";
  j(() => {
    u("idle"), m("idle");
    const E = h.current;
    return () => {
      E.forEach((P) => window.clearTimeout(P)), h.current = [];
    };
  }, [g]);
  const f = q(
    () => o ? ho(o) : void 0,
    [o]
  );
  if (!e) return null;
  const v = rn(e.highlight.region, t), b = In(e.highlight.region), S = b === "figure" ? Oi(e.highlight.region) : "", R = r || f, p = R && a ? Gi(e, R, a, s) : [], w = (E, P) => async (T) => {
    T.preventDefault(), T.stopPropagation();
    const I = await Ci(E);
    P(I ? "copied" : "failed"), h.current.push(window.setTimeout(() => P("idle"), 1200));
  }, k = b === "formula" ? "复制 LaTeX" : "复制", _ = fo(e.rect), O = c ? (() => {
    const E = c.top > 220, P = typeof window > "u" ? 1200 : window.innerWidth;
    return {
      left: Math.min(c.left, Math.max(8, P - 440)),
      top: E ? c.top - 10 : c.top + c.height + 10,
      transform: E ? "translateY(-100%)" : void 0
    };
  })() : void 0, x = async (E, P) => {
    if (P.preventDefault(), P.stopPropagation(), !S) {
      u("failed");
      return;
    }
    try {
      if (E === "copy") {
        if (!await $i(S)) throw new Error("图片复制不可用");
      } else E === "open" ? await ji(S) : await Bi(S);
      u("copied");
    } catch {
      u("failed");
    }
    h.current.push(window.setTimeout(() => u("idle"), 1200));
  };
  return /* @__PURE__ */ y("div", { className: "reader-text-hover-layer", children: /* @__PURE__ */ y(
    "div",
    {
      className: "reader-text-hover-frame",
      "data-reader-text-hover-id": e.itemId,
      "data-reader-text-hover-kind": b,
      style: e.rect,
      children: /* @__PURE__ */ D(
        "div",
        {
          className: co,
          "data-placement": _ ? "outside" : "inside",
          children: [
            /* @__PURE__ */ y(
              Ne,
              {
                className: zi,
                state: d,
                label: `复制翻译编号 ${e.itemId}`,
                title: "翻译编号，点击复制",
                onClick: w(e.itemId, m),
                children: d === "copied" ? "已复制编号" : e.itemId
              }
            ),
            t === "translated" && n > 0 ? /* @__PURE__ */ D("span", { className: "reader-text-hover-revised", "data-reader-revised-count": n, children: [
              "改过 ",
              n,
              " 次"
            ] }) : null,
            p.length ? /* @__PURE__ */ D(
              "div",
              {
                className: "reader-text-hover-reference-popover",
                style: O,
                onPointerDown: (E) => E.stopPropagation(),
                children: [
                  /* @__PURE__ */ y("div", { className: "reader-text-hover-reference-heading", children: "参考文献" }),
                  p.map((E) => /* @__PURE__ */ D("div", { className: "reader-text-hover-reference-entry", children: [
                    /* @__PURE__ */ y("div", { className: "reader-text-hover-reference-label", children: E.label }),
                    /* @__PURE__ */ y("div", { className: "reader-text-hover-reference-text", children: E.text }),
                    /* @__PURE__ */ y(
                      Ne,
                      {
                        className: "reader-text-hover-reference-jump",
                        state: "idle",
                        label: `跳转到参考文献 ${E.label}`,
                        onClick: (P) => {
                          P.preventDefault(), P.stopPropagation(), i == null || i(E.itemId);
                        },
                        children: "跳转到参考文献"
                      }
                    )
                  ] }, E.itemId))
                ]
              }
            ) : null,
            b === "table" ? /* @__PURE__ */ D(We, { children: [
              /* @__PURE__ */ y(
                Ne,
                {
                  className: je,
                  state: l,
                  label: "复制表格",
                  title: "复制表格",
                  onClick: w(Zt(e.highlight.region, t === "translated" ? "translated" : "source", "text"), u),
                  children: l === "copied" ? "已复制" : l === "failed" ? "复制失败" : "复制表格"
                }
              ),
              /* @__PURE__ */ y(
                Ne,
                {
                  className: je,
                  state: l,
                  label: "复制表格为 Markdown",
                  title: "复制表格为 Markdown",
                  onClick: w(Zt(e.highlight.region, t === "translated" ? "translated" : "source", "markdown"), u),
                  children: "Markdown"
                }
              ),
              /* @__PURE__ */ y(
                Ne,
                {
                  className: je,
                  state: l,
                  label: "复制表格为 LaTeX",
                  title: "复制表格为 LaTeX",
                  onClick: w(Zt(e.highlight.region, t === "translated" ? "translated" : "source", "latex"), u),
                  children: "LaTeX"
                }
              )
            ] }) : b === "figure" ? /* @__PURE__ */ D(We, { children: [
              /* @__PURE__ */ y(
                Ne,
                {
                  className: je,
                  state: l,
                  label: "复制图片",
                  title: "复制图片",
                  onClick: (E) => void x("copy", E),
                  children: l === "copied" ? "已复制" : l === "failed" ? "复制失败" : "复制图片"
                }
              ),
              /* @__PURE__ */ y(
                Ne,
                {
                  className: je,
                  state: l,
                  label: "放大图片",
                  title: "放大图片",
                  onClick: (E) => void x("open", E),
                  children: "放大"
                }
              ),
              /* @__PURE__ */ y(
                Ne,
                {
                  className: je,
                  state: l,
                  label: "下载图片",
                  title: "下载图片",
                  onClick: (E) => void x("download", E),
                  children: "下载"
                }
              )
            ] }) : v ? /* @__PURE__ */ y(
              Ne,
              {
                className: je,
                state: l,
                label: t === "translated" ? "复制这段译文" : "复制这段原文",
                onClick: w(v, u),
                children: l === "copied" ? "已复制" : l === "failed" ? "复制失败" : k
              }
            ) : null
          ]
        }
      )
    }
  ) });
}
function Zi(e, t) {
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
function Yi(e, t, n, r) {
  if (!e || !t) return [];
  const o = [];
  for (const a of e.blocks) {
    const s = t.itemsById.get(a.item_id);
    if (!(s != null && s.translated_text)) continue;
    const c = Tn(
      Zi(e, a),
      n,
      r
    );
    c && o.push({
      itemId: a.item_id,
      translatedText: s.translated_text,
      status: s.status,
      kind: a.kind,
      sourceText: a.source_text,
      typography: a.typography,
      rect: c,
      changedAtSeq: t.changedAtSeqById.get(a.item_id) || 0,
      changedNow: t.changedAtSeqById.get(a.item_id) === t.lastEventSeq
    });
  }
  return o;
}
const Xi = '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif', Qi = 256, mt = /* @__PURE__ */ new Map();
function ec(e) {
  return `${e || ""}`.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function tc(e) {
  const t = `${e || ""}`, { text: n, slots: r } = ma(t, { bareLatex: !0 }), o = ec(n), a = ha(o, r);
  if (!r.length)
    return { fallbackHtml: a, richHtml: Promise.resolve(a), hasMath: !1 };
  let s = mt.get(t);
  if (!s && (s = pa(o, r, { preserveSource: !1 }), mt.set(t, s), mt.size > Qi)) {
    const c = mt.keys().next().value;
    c !== void 0 && mt.delete(c);
  }
  return { fallbackHtml: a, richHtml: s, hasMath: !0 };
}
function Yt(e) {
  return /title|heading|header|display_formula|equation/i.test(e);
}
function _e(e) {
  const t = Number(e);
  return Number.isFinite(t) && t > 0 ? t : void 0;
}
function nc(e, t) {
  const n = e.typography, r = _e(t) || 1, o = _e(n == null ? void 0 : n.font_size_pt), a = Math.max(1, `${e.sourceText || ""}`.split(/\n+/).length), s = e.rect.height / Math.max(1.28, a * 1.18), c = Yt(e.kind) ? 24 : /caption|footnote|table/i.test(e.kind) ? 9.5 : 11, i = Math.max(5.5 * r, Math.min(s, c * r)), l = _e(n == null ? void 0 : n.fit_min_font_size_pt), u = _e(n == null ? void 0 : n.fit_max_font_size_pt), d = Math.max(3.5, (l || 5.5) * r), m = Math.max(
    d,
    u ? u * r : o ? o * r : i
  ), h = o ? o * r : i, g = _e(n == null ? void 0 : n.leading_em), f = [
    _e(n == null ? void 0 : n.padding_top_pt) || 0,
    _e(n == null ? void 0 : n.padding_right_pt) || 0,
    _e(n == null ? void 0 : n.padding_bottom_pt) || 0,
    _e(n == null ? void 0 : n.padding_left_pt) || 0
  ].map((v) => v * r);
  return {
    fontFamily: `${(n == null ? void 0 : n.font_family) || ""}`.trim() || Xi,
    fontSizePx: Math.max(d, Math.min(m, h)),
    minFontSizePx: d,
    maxFontSizePx: m,
    // Typst leading is the additional inter-line gap, unlike CSS line-height.
    lineHeight: g ? 1 + g : 1.3,
    fontWeight: (n == null ? void 0 : n.font_weight) || (Yt(e.kind) ? 600 : 400),
    textAlign: ["left", "center", "right", "justify"].includes(`${(n == null ? void 0 : n.text_align) || ""}`) ? n == null ? void 0 : n.text_align : Yt(e.kind) ? "center" : "justify",
    padding: f,
    exact: !!o
  };
}
function rc(e, t, n, r) {
  const { minFontSizePx: o, maxFontSizePx: a } = r, s = /* @__PURE__ */ new Map(), c = (d) => {
    const m = s.get(d);
    if (m !== void 0) return m;
    const { width: h, height: g } = e(d), f = h <= t + 0.5 && g <= n + 0.5;
    return s.set(d, f), f;
  };
  let i = o, l = a, u = Math.min(r.requestedFontSizePx, l);
  if (c(u)) {
    if (!r.exact) {
      i = u;
      for (let d = 0; d < 6 && l > i; d += 1) {
        const m = (i + l) / 2;
        c(m) ? (u = m, i = m) : l = m;
      }
    }
  } else {
    l = u, u = i;
    for (let d = 0; d < 8 && l > i; d += 1) {
      const m = (i + l) / 2;
      c(m) ? (u = m, i = m) : l = m;
    }
  }
  return Math.max(o, u);
}
const oc = 512, ht = /* @__PURE__ */ new Map();
let mn = 0;
typeof document < "u" && document.fonts && (document.fonts.ready.then(() => {
  mn += 1;
}).catch(() => {
}), typeof document.fonts.addEventListener == "function" && document.fonts.addEventListener("loadingdone", () => {
  mn += 1;
}));
function ac(e, t, n, r) {
  return [
    mn,
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
function sc({ item: e, pageScale: t }) {
  const n = A(null), r = q(
    () => tc(e.translatedText),
    [e.translatedText]
  ), [o, a] = L(r.fallbackHtml), s = q(
    () => nc(e, t),
    [e, t]
  );
  j(() => {
    let d = !0;
    return a(r.fallbackHtml), r.hasMath && r.richHtml.then((m) => {
      d && a(m);
    }), () => {
      d = !1;
    };
  }, [r]), Ce(() => {
    const d = n.current;
    if (!d) return;
    const [m, h, g, f] = s.padding, v = Math.max(1, e.rect.width - f - h), b = Math.max(1, e.rect.height - m - g), S = ac(o, v, b, s);
    let R = ht.get(S);
    if (R === void 0 && (R = rc(
      (p) => (d.style.fontSize = `${p}px`, { width: d.scrollWidth, height: d.scrollHeight }),
      v,
      b,
      {
        minFontSizePx: s.minFontSizePx,
        maxFontSizePx: s.maxFontSizePx,
        requestedFontSizePx: s.fontSizePx,
        exact: s.exact
      }
    ), ht.set(S, R), ht.size > oc)) {
      const p = ht.keys().next().value;
      p !== void 0 && ht.delete(p);
    }
    d.style.fontSize = `${R.toFixed(2)}px`;
  }, [o, e.rect.height, e.rect.width, s]);
  const [c, i, l, u] = s.padding;
  return /* @__PURE__ */ y(
    "div",
    {
      className: `reader-live-translation-item${e.changedNow ? " is-changed" : ""}`,
      "data-live-translation-item": e.itemId,
      "data-live-translation-kind": e.kind,
      "data-live-translation-status": e.status,
      "data-live-translation-typography": s.exact ? "typst" : "fitted",
      style: {
        ...e.rect,
        padding: `${c}px ${i}px ${l}px ${u}px`
      },
      children: /* @__PURE__ */ y(
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
function ic({
  layoutPage: e,
  pageState: t,
  width: n,
  height: r
}) {
  const o = q(
    () => Yi(e, t, n, r),
    [r, e, t, n]
  );
  return o.length ? /* @__PURE__ */ y(
    "div",
    {
      className: "reader-live-translation-overlay",
      "data-live-translation-page": e == null ? void 0 : e.page_idx,
      "data-live-translation-generation": t == null ? void 0 : t.generation,
      "aria-hidden": "true",
      children: o.map((a) => /* @__PURE__ */ y(
        sc,
        {
          item: a,
          pageScale: e != null && e.width ? n / e.width : 1
        },
        `${a.itemId}:${a.changedAtSeq}`
      ))
    }
  ) : null;
}
const cc = vn(ic), po = wn(null), go = wn(null);
function lc({ value: e, hud: t, children: n }) {
  return /* @__PURE__ */ y(po.Provider, { value: e, children: /* @__PURE__ */ y(go.Provider, { value: t, children: n }) });
}
function Fe() {
  return Sn(po);
}
function bo() {
  return Sn(go);
}
const yo = 1.414;
function uc(e, t, n) {
  var f, v;
  const r = (e == null ? void 0 : e.closest(".react-pdf__Page__textContent span, .react-pdf__Page__textLayer span")) || (e == null ? void 0 : e.closest("span"));
  if (!r) return null;
  const o = ((f = r.textContent) == null ? void 0 : f.trim()) || "", a = mo(o).filter((b) => t.has(b)), s = Ln(o).find((b) => t.has(b.key));
  let c = a[0] || (s == null ? void 0 : s.key) || "", i = a[0] || (s == null ? void 0 : s.label) || "";
  const l = ((v = r.parentElement) == null ? void 0 : v.textContent) || "", u = l.indexOf(o), d = u > 0 ? l[u - 1] : "", m = u >= 0 && l[u + o.length] || "", h = !!r.closest("sup") || Number.parseFloat(getComputedStyle(r).fontSize || "0") < Number.parseFloat(getComputedStyle(r.parentElement || r).fontSize || "0") * 0.85;
  if (!c && h && /^\d{1,3}$/.test(o) && t.has(o) && !/[A-Za-z0-9_^]/.test(`${d}${m}`) && (c = o, i = o), !c) return null;
  const g = r.getBoundingClientRect();
  return {
    key: c,
    label: i,
    rect: {
      left: g.left - n.left,
      top: g.top - n.top,
      width: g.width,
      height: g.height
    }
  };
}
function dc({
  pageNumber: e,
  width: t,
  devicePixelRatio: n,
  pane: r,
  active: o = !1,
  textLayer: a = !0,
  syncedMinHeight: s = 0,
  onMetrics: c,
  cachedAspect: i,
  onAspectChange: l,
  sentinelRef: u,
  regionHighlight: d = null,
  regionTargets: m = [],
  referenceRegions: h = [],
  hoveredRegionId: g,
  onHoverRegion: f,
  onJumpToRegion: v,
  liveTranslationLayout: b,
  liveTranslationPage: S,
  showLiveTranslation: R = r === "source"
}) {
  var be;
  const p = (be = Fe()) == null ? void 0 : be.revisedBlocks, w = A(i ?? yo), [k, _] = L(w.current);
  j(() => {
    i != null && Math.abs(i - w.current) >= 1e-3 && (w.current = i, _(i));
  }, [i]);
  const O = A(u);
  O.current = u;
  const x = A(null), E = A(($) => {
    var ce;
    x.current = $, (ce = O.current) == null || ce.call(O, $);
  }).current, P = A(null), T = A(`${t}@${n}`);
  Ce(() => {
    const $ = `${t}@${n}`;
    T.current !== $ && (T.current = $, o && mc(x.current, P.current));
  }, [o, n, t]), j(() => {
    o || Xt(P.current);
  }, [o]), j(() => () => Xt(P.current), []);
  const I = Math.max(120, Math.floor(t * k)), N = Math.max(I, Math.ceil(s || 0)), z = Tn(d, t, I), H = q(
    () => Di(m, t, I),
    [I, m, t]
  ), [Z, G] = L(null), ae = typeof f == "function", B = ae ? g ?? null : Z, C = ($) => {
    ae ? $ !== (g ?? null) && (f == null || f($)) : G((ce) => ce === $ ? ce : $);
  }, se = q(
    () => H.find(($) => $.itemId === B) || null,
    [B, H]
  ), ne = q(() => ho(h), [h]), [X, me] = L(null), Y = ($) => {
    var oe, ge, ie, le;
    if ($.pointerType === "touch") return;
    if ($.buttons !== 0) {
      C(null), me(null);
      return;
    }
    if ((ge = (oe = $.target) == null ? void 0 : oe.closest) != null && ge.call(oe, `.${co}`) || (le = (ie = $.target) == null ? void 0 : ie.closest) != null && le.call(ie, ".reader-text-hover-reference-popover")) return;
    const ce = $.currentTarget.getBoundingClientRect(), ye = $.clientX - ce.left, Pe = $.clientY - ce.top, ve = se == null ? void 0 : se.rect;
    if (ve && fo(ve) && ye >= ve.left - 4 && ye <= ve.left + uo && Pe >= ve.top - lo && Pe <= ve.top) return;
    const Q = fr(H, ye, Pe);
    C((Q == null ? void 0 : Q.itemId) || null), me(uc($.target, ne, ce));
  }, K = ($) => {
    if ($.pointerType === "mouse") return;
    me(null);
    const ce = $.currentTarget.getBoundingClientRect(), ye = fr(
      H,
      $.clientX - ce.left,
      $.clientY - ce.top
    );
    C((ye == null ? void 0 : ye.itemId) || null);
  }, he = ($) => {
    !Number.isFinite($) || $ <= 0 || Math.abs(w.current - $) < 1e-3 || (w.current = $, _($), l == null || l(e, $));
  };
  return /* @__PURE__ */ D(
    "div",
    {
      ref: E,
      [Ve]: e,
      [it]: r,
      [kn]: I,
      className: An,
      onPointerMoveCapture: Y,
      onPointerDown: K,
      onPointerLeave: ($) => {
        $.pointerType === "mouse" && C(null), $.pointerType === "mouse" && me(null);
      },
      style: {
        width: t,
        height: N,
        minHeight: N
      },
      children: [
        o ? /* @__PURE__ */ y(
          da,
          {
            pageNumber: e,
            width: t,
            devicePixelRatio: n,
            renderTextLayer: a,
            renderAnnotationLayer: !1,
            className: Gr,
            loading: /* @__PURE__ */ y(
              "div",
              {
                className: zt,
                style: { width: t, height: I }
              }
            ),
            onLoadSuccess: ($) => {
              try {
                const ce = $.getViewport({ scale: 1 });
                if (ce.width > 0) {
                  const ye = ce.height / ce.width;
                  he(ye);
                }
              } catch {
              }
              c == null || c();
            },
            onRenderSuccess: () => {
              Xt(P.current), c == null || c();
            }
          }
        ) : /* @__PURE__ */ y(
          "div",
          {
            className: zt,
            style: { width: t, height: I },
            "aria-hidden": !0
          }
        ),
        o ? /* @__PURE__ */ y("div", { ref: P, className: "reader-react-pdf-kept-paint", "aria-hidden": "true" }) : null,
        z ? /* @__PURE__ */ y(
          "div",
          {
            className: "reader-react-pdf-region-highlight",
            "data-reader-region-id": d == null ? void 0 : d.itemId,
            style: z,
            "aria-hidden": "true"
          }
        ) : null,
        o && a && R ? /* @__PURE__ */ y(
          cc,
          {
            layoutPage: b,
            pageState: S,
            width: t,
            height: I
          }
        ) : null,
        o && r === "translated" && (p != null && p.size) ? /* @__PURE__ */ y("div", { className: "reader-revised-markers", "aria-hidden": "true", children: H.filter(($) => p.has($.itemId)).map(($) => /* @__PURE__ */ y(
          "span",
          {
            className: "reader-revised-marker",
            "data-reader-revised-id": $.itemId,
            style: { left: $.rect.left, top: $.rect.top, height: $.rect.height }
          },
          $.itemId
        )) }) : null,
        /* @__PURE__ */ y(
          Ki,
          {
            target: o ? se : null,
            pane: r === "translated" ? "translated" : "source",
            revisedCount: se && (p == null ? void 0 : p.get(se.itemId)) || 0,
            referenceRegions: h,
            citationLabel: X == null ? void 0 : X.key,
            citationDisplayLabel: X == null ? void 0 : X.label,
            citationRect: X == null ? void 0 : X.rect,
            onReferenceClick: v
          }
        )
      ]
    }
  );
}
const fc = vn(dc);
function mc(e, t) {
  if (!e || !t || t.firstChild) return;
  const n = e.querySelector(".react-pdf__Page__canvas");
  if (!n || !n.width || !n.height || n.style.visibility === "hidden") return;
  const r = e.ownerDocument.createElement("canvas");
  r.width = n.width, r.height = n.height;
  const o = r.getContext("2d");
  o && (o.drawImage(n, 0, 0), t.appendChild(r));
}
function Xt(e) {
  if (e != null && e.firstChild) {
    for (const t of Array.from(e.querySelectorAll("canvas")))
      t.width = 0, t.height = 0;
    e.replaceChildren();
  }
}
const hc = 2 * 1024 * 1024;
function pc(e) {
  const t = new Vr.PDFDataRangeTransport(e.length, null);
  return t.requestDataRange = (n, r) => {
    e.fetchRange(n, r).then(
      (o) => t.onDataRange(n, o),
      () => {
        t.abort();
      }
    );
  }, t;
}
const Qt = 5, gc = "120% 0px", bc = 120, yc = "25% 0px";
let mr = 1;
const hr = /* @__PURE__ */ new WeakMap();
function vc(e) {
  if (!e) return 0;
  const t = hr.get(e);
  if (t) return t;
  const n = mr;
  return mr += 1, hr.set(e, n), n;
}
function wc() {
  const e = typeof window < "u" && window.devicePixelRatio || 1;
  return Math.max(1, Math.min(e, 2));
}
const Sc = $o(
  function({
    pane: t,
    url: n = "",
    preloadedFile: r = null,
    userZoom: o = 1,
    visible: a = !0,
    emptyLabel: s = "暂无 PDF",
    scrollRoot: c = null,
    pageWidthOverride: i = null,
    rowHeights: l,
    onMetrics: u,
    onLoadSuccess: d,
    onLoadError: m,
    onNumPagesChange: h,
    activeRegion: g = null,
    regions: f = [],
    readerMetadata: v = null,
    hoveredRegionId: b = null,
    onHoverRegion: S,
    onJumpToRegion: R,
    liveTranslation: p,
    showLiveTranslation: w = t === "source",
    liveTranslationPendingLabel: k = "",
    paneAction: _
  }, O) {
    Li();
    const { file: x, loading: E, error: P } = Xa(n, r), T = `${n}\0${vc(x)}`, I = A(T);
    I.current = T;
    const N = q(() => {
      const M = Ja(x);
      return M ? "ranged" in M ? { range: pc(M.ranged) } : M : null;
    }, [x, n]), [z, H] = L(0), [Z, G] = L(""), [ae, B] = L(null), [C, se] = L(480), ne = A(null), X = A(0), me = q(() => wc(), []), Y = q(() => ({
      cMapUrl: bt().resolvePdfjsVendorUrl("cmaps/"),
      cMapPacked: !0,
      standardFontDataUrl: bt().resolvePdfjsVendorUrl("standard_fonts/"),
      // 只对按段取的大文件起作用：要哪页取哪页，不在后台把整份取完（取完又是一整份在内存里）。
      rangeChunkSize: hc,
      disableAutoFetch: !0
    }), []);
    Rn(O, () => ae, [ae]), j(() => {
      const M = (U) => {
        X.current = U, se(U);
      }, V = (U) => {
        const te = Ts(U, X.current);
        if (te !== "ignore") {
          if (ne.current && clearTimeout(ne.current), te === "immediate") {
            M(U);
            return;
          }
          ne.current = setTimeout(() => M(U), Yr);
        }
      }, W = !!(i && i >= 80);
      V(W ? i : (c == null ? void 0 : c.clientWidth) || 0);
      const re = !W && c && typeof ResizeObserver < "u" ? new ResizeObserver((U) => {
        var te, de;
        V(((de = (te = U[0]) == null ? void 0 : te.contentRect) == null ? void 0 : de.width) ?? c.clientWidth);
      }) : null;
      return re && c && re.observe(c), () => {
        re == null || re.disconnect(), ne.current && clearTimeout(ne.current);
      };
    }, [i, c, a]);
    const K = q(
      () => Rs(C, o),
      [C, o]
    ), [he, be] = L(() => /* @__PURE__ */ new Map()), [$, ce] = L(() => /* @__PURE__ */ new Set()), [ye, Pe] = L(() => /* @__PURE__ */ new Set()), ve = A(/* @__PURE__ */ new Map()), Q = A(null), oe = A(null), [ge, ie] = L(() => /* @__PURE__ */ new Set()), le = A(/* @__PURE__ */ new Map()), ue = F((M, V) => {
      be((W) => {
        if (W.get(M) === V) return W;
        const J = new Map(W);
        return J.set(M, V), J;
      });
    }, []), $e = F((M, V) => {
      const W = ve.current, J = W.get(M), re = [Q.current, oe.current];
      if (J)
        for (const U of re)
          try {
            U == null || U.unobserve(J);
          } catch {
          }
      if (V) {
        W.set(M, V);
        for (const U of re)
          try {
            U == null || U.observe(V);
          } catch {
          }
      } else
        W.delete(M);
    }, []), ut = A(/* @__PURE__ */ new Map()), Ye = F((M) => {
      const V = ut.current;
      let W = V.get(M);
      return W || (W = (J) => $e(M, J), V.set(M, W)), W;
    }, [$e]);
    j(() => {
      if (typeof IntersectionObserver > "u") return;
      const M = le.current, V = new IntersectionObserver(
        (W) => {
          const J = [], re = [];
          for (const U of W) {
            const te = U.target, de = Ft(te);
            Number.isFinite(de) && (U.isIntersecting ? J : re).push(de);
          }
          if ((J.length || re.length) && ce((U) => {
            let te = null;
            for (const de of J)
              U.has(de) || (te = te || new Set(U), te.add(de));
            for (const de of re)
              U.has(de) && (te = te || new Set(U), te.delete(de));
            return te || U;
          }), J.length) {
            for (const U of J) {
              const te = M.get(U);
              te && (clearTimeout(te), M.delete(U));
            }
            Pe((U) => {
              let te = null;
              for (const de of J)
                U.has(de) || (te = te || new Set(U), te.add(de));
              return te || U;
            });
          }
          for (const U of re)
            M.has(U) || M.set(U, setTimeout(() => {
              M.delete(U), Pe((te) => {
                if (!te.has(U)) return te;
                const de = new Set(te);
                return de.delete(U), de;
              });
            }, bc));
        },
        { root: c, rootMargin: gc, threshold: 0 }
      );
      Q.current = V;
      for (const W of ve.current.values())
        try {
          V.observe(W);
        } catch {
        }
      return () => {
        V.disconnect(), Q.current === V && (Q.current = null);
        for (const W of M.values()) clearTimeout(W);
        M.clear();
      };
    }, [c]), j(() => {
      if (typeof IntersectionObserver > "u") return;
      const M = new IntersectionObserver(
        (V) => {
          ie((W) => {
            let J = null;
            for (const re of V) {
              const U = Ft(re.target);
              !Number.isFinite(U) || re.isIntersecting === W.has(U) || (J = J || new Set(W), re.isIntersecting ? J.add(U) : J.delete(U));
            }
            return J || W;
          });
        },
        { root: c, rootMargin: yc, threshold: 0 }
      );
      oe.current = M;
      for (const V of ve.current.values())
        try {
          M.observe(V);
        } catch {
        }
      return () => {
        M.disconnect(), oe.current === M && (oe.current = null);
      };
    }, [c]);
    const Vt = !!c && typeof IntersectionObserver < "u";
    Ce(() => {
      H(0), G(""), ce(/* @__PURE__ */ new Set()), Pe(/* @__PURE__ */ new Set()), be(/* @__PURE__ */ new Map()), ve.current.clear();
      const M = le.current;
      for (const V of M.values()) clearTimeout(V);
      M.clear(), h == null || h(0, t);
    }, [T, h, t]);
    const Jt = F(
      ({ numPages: M }) => {
        I.current === T && (H(M), G(""), h == null || h(M, t), d == null || d({ numPages: M, pane: t }));
      },
      [T, d, h, t]
    ), It = F(
      (M) => {
        if (I.current !== T) return;
        const V = (M == null ? void 0 : M.message) || "PDF 解析失败";
        G(V), H(0), h == null || h(0, t), m == null || m(M, t);
      },
      [T, m, h, t]
    ), ke = q(
      () => z > 0 ? Array.from({ length: z }, (M, V) => V + 1) : [],
      [z]
    );
    j(() => {
      typeof IntersectionObserver < "u" || Pe(new Set(ke));
    }, [ke]);
    const xe = q(
      () => Xn(g, v, t),
      [g, v, t]
    ), Xe = q(() => {
      const M = /* @__PURE__ */ new Map();
      for (const V of f) {
        const W = Xn(V, v, t);
        if (!W) continue;
        const J = M.get(W.box.page) || [];
        J.push(W), M.set(W.box.page, J);
      }
      return M;
    }, [t, v, f]), Tt = q(
      () => f.filter((M) => M.subType === "reference_entry"),
      [f]
    ), Qe = q(() => {
      const M = /* @__PURE__ */ new Set();
      if (!b) return M;
      for (const [V, W] of Xe)
        W.some((J) => J.itemId === b) && M.add(V);
      return M;
    }, [b, Xe]), Et = q(() => {
      if (z === 0) return /* @__PURE__ */ new Set();
      if (!a) return /* @__PURE__ */ new Set();
      if (!(!!c && typeof IntersectionObserver < "u")) return new Set(ke);
      if ($.size === 0) {
        const W = Math.min(z, Qt * 2 + 1);
        return new Set(Array.from({ length: W }, (J, re) => re + 1));
      }
      const V = /* @__PURE__ */ new Set();
      for (const W of $)
        for (let J = -Qt; J <= Qt; J++) {
          const re = W + J;
          re >= 1 && re <= z && V.add(re);
        }
      return V;
    }, [z, ke, c, a, $]), et = !n || !!P || !!Z, kt = n && (P || Z) || s;
    return /* @__PURE__ */ D(
      "section",
      {
        ref: B,
        className: `reader-panel ${hs}${a ? "" : " is-hidden"}`,
        [it]: t,
        "data-reader-engine": "react-pdf",
        "data-reader-visible": a ? "true" : "false",
        "data-live-translation-status": (p == null ? void 0 : p.jobStatus) || void 0,
        "aria-hidden": a ? void 0 : !0,
        "aria-label": t === "source" ? "原文 PDF" : "译文 PDF",
        children: [
          _ ? /* @__PURE__ */ y("div", { className: "reader-react-pdf-pane-action", children: _ }) : null,
          k ? /* @__PURE__ */ D("div", { className: "reader-live-translation-waiting", role: "status", children: [
            /* @__PURE__ */ y("span", { className: "reader-live-translation-waiting-dot", "aria-hidden": "true" }),
            /* @__PURE__ */ y("span", { children: k })
          ] }) : null,
          et && !E ? /* @__PURE__ */ y("div", { className: "reader-empty reader-react-pdf-empty", "data-reader-pdf-empty": t, children: kt }) : null,
          E ? /* @__PURE__ */ y("div", { className: "reader-empty reader-react-pdf-loading", "data-reader-pdf-loading": t, children: "正在加载 PDF…" }) : null,
          N && !P ? /* @__PURE__ */ y("div", { className: "reader-viewer-wrap reader-react-pdf-wrap", children: /* @__PURE__ */ y(
            fa,
            {
              file: N,
              loading: null,
              error: null,
              options: Y,
              onLoadSuccess: Jt,
              onLoadError: It,
              className: "reader-react-pdf-document",
              children: ke.map((M) => {
                if (Et.has(M))
                  return /* @__PURE__ */ y(
                    fc,
                    {
                      pane: t,
                      pageNumber: M,
                      width: K,
                      devicePixelRatio: me,
                      active: ye.has(M),
                      textLayer: !Vt || ge.has(M),
                      syncedMinHeight: (l == null ? void 0 : l.get(M)) || 0,
                      onMetrics: u,
                      cachedAspect: he.get(M),
                      onAspectChange: ue,
                      sentinelRef: Ye(M),
                      regionHighlight: (xe == null ? void 0 : xe.box.page) === M ? xe : null,
                      regionTargets: Xe.get(M),
                      referenceRegions: Tt,
                      hoveredRegionId: b && Qe.has(M) ? b : null,
                      onHoverRegion: S,
                      onJumpToRegion: R,
                      liveTranslationLayout: p == null ? void 0 : p.layoutByPage.get(M - 1),
                      liveTranslationPage: p == null ? void 0 : p.pagesByPage.get(M - 1),
                      showLiveTranslation: w
                    },
                    `${t}-${M}`
                  );
                const W = he.get(M) ?? yo, J = Math.max(120, Math.floor(K * W)), re = Math.max(J, Math.ceil((l == null ? void 0 : l.get(M)) || 0));
                return /* @__PURE__ */ y(
                  "div",
                  {
                    ref: Ye(M),
                    [Ve]: M,
                    [it]: t,
                    [kn]: J,
                    className: `${An} is-placeholder`,
                    style: {
                      width: K,
                      height: re,
                      minHeight: re
                    },
                    children: /* @__PURE__ */ y(
                      "div",
                      {
                        className: zt,
                        style: { width: K, height: J },
                        "aria-hidden": !0
                      }
                    )
                  },
                  `${t}-${M}`
                );
              })
            },
            T
          ) }) : null
        ]
      }
    );
  }
), pr = vn(Sc), Rc = 2e3, Pc = 6, Ic = 500, gr = "reader-react-resizing";
function Tc(e, t) {
  const n = A(null), r = A(null);
  Ce(() => {
    const o = n.current;
    if (n.current = t, !e || o === null || t === null || Math.abs(o - t) < 1) return;
    const a = r.current;
    a == null || a.stop();
    let s = a ? { pane: a.pane, progress: a.progress, started: a.started } : null;
    if (!s) {
      const p = Ec(e), w = Lt(e, p);
      if (!w) return;
      s = { pane: p, progress: w, started: performance.now() };
    }
    const { pane: c, progress: i, started: l } = s;
    let u = 0, d = null, m = e.scrollHeight, h = m, g = 0, f = l;
    const v = /* @__PURE__ */ new WeakMap(), b = typeof ResizeObserver > "u" ? null : new ResizeObserver((p) => {
      let w = !1;
      for (const k of p) {
        const _ = Math.round(k.contentRect.height);
        v.has(k.target) && v.get(k.target) !== _ && (w = !0), v.set(k.target, _);
      }
      w && vt(e, i, "auto", c);
    }), S = () => {
      var p;
      d && clearTimeout(d), cancelAnimationFrame(u), b == null || b.disconnect(), e.classList.remove(gr);
      for (const w of br) e.removeEventListener(w, S);
      ((p = r.current) == null ? void 0 : p.stop) === S && (r.current = null);
    }, R = () => {
      vt(e, i, "auto", c);
      const p = e.scrollHeight;
      g = p === h ? g + 1 : 0, h = p;
      const w = performance.now() - f;
      g >= Pc && (p !== m || w > Ic) || w > Rc ? S() : u = requestAnimationFrame(R);
    };
    for (const p of br) e.addEventListener(p, S, { passive: !0 });
    for (const p of Array.from(e.children)) b == null || b.observe(p);
    e.classList.add(gr), r.current = { ...s, stop: S }, d = setTimeout(() => {
      d = null, f = performance.now(), m = e.scrollHeight, h = m, g = 0, u = requestAnimationFrame(R);
    }, Yr);
  }, [e, t]), j(() => () => {
    var o;
    return (o = r.current) == null ? void 0 : o.stop();
  }, []);
}
function Ec(e) {
  for (const t of Array.from(e.querySelectorAll(`[${Ve}]`))) {
    const n = t.getBoundingClientRect();
    if (n.height >= 8 && n.width >= 8) return t.getAttribute(it) || null;
  }
  return null;
}
const br = ["wheel", "touchstart", "keydown", "pointerdown"], kc = () => () => {
}, yr = () => null;
function Ac({
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
function Mc(e, t, n = e * 2) {
  return t ? !Number.isFinite(e) || e <= 0 ? n : e * 2 : e;
}
function Nc(e) {
  return e ? e.connection === "terminal" && e.jobStatus === "failed" ? e.pagesByPage.size > 0 ? `翻译已暂停，已保留 ${e.pagesByPage.size} 页译文` : "翻译已暂停，原始 PDF 仍可阅读" : e.connection === "terminal" && ["cancelled", "canceled"].includes(e.jobStatus) ? e.pagesByPage.size > 0 ? `翻译已取消，已保留 ${e.pagesByPage.size} 页译文` : "翻译已取消，原始 PDF 仍可阅读" : e.pagesByPage.size > 0 ? "" : e.connection === "unavailable" ? e.error || "实时译文暂不可用，原始 PDF 仍可阅读" : e.error ? e.error : e.layoutByPage.size === 0 ? "正在完成 OCR，译文将在这里逐页出现" : "版面已就绪，正在等待首个译文页面" : "";
}
function _c(e) {
  const t = Fe(), {
    markdownSplit: n = !1,
    assistantSplit: r = !1,
    liveTranslation: o,
    paneComposition: a
  } = e, s = (a == null ? void 0 : a.visibleMode) ?? e.mode ?? "compare", c = (a == null ? void 0 : a.compareMode) ?? e.compareMode ?? s === "compare", i = (a == null ? void 0 : a.showSource) ?? e.showSource ?? !0, l = (a == null ? void 0 : a.showTranslated) ?? e.showTranslated ?? (s === "compare" || s === "translated"), u = (a == null ? void 0 : a.overlayOnSource) ?? e.overlayOnSource ?? !1, d = e.bindShell ?? (t == null ? void 0 : t.bindShell), m = e.shellEl ?? (t == null ? void 0 : t.shellEl) ?? null, h = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? Pt, g = e.shellWidth ?? (t == null ? void 0 : t.shellWidth) ?? 0, f = e.rowHeights ?? (t == null ? void 0 : t.rowHeights), v = e.mountSource ?? (t == null ? void 0 : t.mountSource) ?? !1, b = e.mountTranslated ?? (t == null ? void 0 : t.mountTranslated) ?? !1, S = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, R = e.sourceUrl ?? (t == null ? void 0 : t.sourceUrl) ?? "", p = e.translatedUrl ?? (t == null ? void 0 : t.translatedUrl) ?? "", w = e.sourceFile ?? (t == null ? void 0 : t.sourceFile) ?? null, k = e.translatedFile ?? (t == null ? void 0 : t.translatedFile) ?? null, _ = e.onMetrics ?? (t == null ? void 0 : t.onMetrics), O = e.onNumPagesChange ?? (t == null ? void 0 : t.onNumPagesChange), x = e.activeRegion ?? (t == null ? void 0 : t.activeRegion), E = e.regions ?? (t == null ? void 0 : t.regions) ?? [], P = e.readerMetadata ?? (t == null ? void 0 : t.readerMetadata), T = (t == null ? void 0 : t.regionHover) ?? null, [I, N] = L(null), z = jr(
    T ? T.subscribe : kc,
    T ? () => T.get().itemId : yr,
    T ? () => T.get().itemId : yr
  ), H = T ? z : I, Z = F((C) => {
    T ? T.set(C, "pdf") : N(C);
  }, [T]), G = Ac({
    mode: s,
    compareMode: c,
    showSource: i,
    showTranslated: l,
    markdownSplit: n,
    overlayOnSource: u
  }), B = Number.isFinite(g) && g > 0 ? Mc(
    g,
    n || r,
    typeof document > "u" ? g * 2 : document.documentElement.clientWidth
  ) : null;
  return Tc(m, B), /* @__PURE__ */ y(
    "div",
    {
      ref: d,
      className: ms,
      "data-reader-region-count": E.length,
      "data-reader-structured-region-count": E.filter(Xo).length,
      "data-reader-metadata-ready": P ? "true" : "false",
      children: /* @__PURE__ */ D(
        "main",
        {
          className: `${fs} reader-mode-${G.mode}`,
          "data-reader-mode": n ? "markdown-split" : r ? "assistant-split" : s,
          children: [
            v ? /* @__PURE__ */ y(
              pr,
              {
                pane: "source",
                url: R,
                preloadedFile: w,
                userZoom: h,
                visible: G.showSource,
                scrollRoot: m,
                pageWidthOverride: B,
                rowHeights: G.compareMode ? f : void 0,
                onMetrics: _,
                emptyLabel: S ? "源文件不可用：该文档没有可读取的源 PDF。" : "暂无原文 PDF",
                onNumPagesChange: O,
                activeRegion: x,
                regions: E,
                readerMetadata: P,
                hoveredRegionId: H,
                onHoverRegion: Z,
                onJumpToRegion: t == null ? void 0 : t.jumpToReference,
                liveTranslation: u ? o : void 0,
                showLiveTranslation: u,
                liveTranslationPendingLabel: u ? Nc(o) : "",
                paneAction: u ? /* @__PURE__ */ D(We, { children: [
                  e.sourcePaneAction,
                  /* @__PURE__ */ y(
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
            b ? /* @__PURE__ */ y(
              pr,
              {
                pane: "translated",
                url: p,
                preloadedFile: k,
                userZoom: h,
                visible: G.showTranslated,
                scrollRoot: m,
                pageWidthOverride: B,
                rowHeights: G.compareMode ? f : void 0,
                onMetrics: _,
                emptyLabel: "暂无译文 PDF",
                onNumPagesChange: O,
                activeRegion: x,
                regions: E,
                readerMetadata: P,
                hoveredRegionId: H,
                onHoverRegion: Z,
                onJumpToRegion: t == null ? void 0 : t.jumpToReference,
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
const Lc = [
  { id: "source", label: "原文", Icon: Ur },
  { id: "compare", label: "对照", Icon: Hr },
  { id: "translated", label: "译文", Icon: Wr }
];
function Cc(e) {
  return e.connection === "live" ? `实时译文 · ${e.pagesByPage.size} 页` : e.connection === "reconnecting" ? "实时译文 · 重连中" : e.connection === "unavailable" ? "实时译文 · 不可用" : e.connection === "terminal" ? e.jobStatus === "failed" ? "实时译文 · 已暂停" : e.jobStatus === "cancelled" || e.jobStatus === "canceled" ? "实时译文 · 已取消" : e.jobStatus === "succeeded" ? "实时译文 · 已完成" : "实时译文 · 已结束" : e.error || "实时译文 · 连接中";
}
function xc(e) {
  return e.id === "translated" ? e.sourceViewOnly : e.id === "compare" ? !e.documentReady || e.sourceViewOnly && !e.liveTranslationAvailable : !1;
}
function Dc(e) {
  const t = Fe(), {
    mode: n,
    documentReady: r,
    onModeChange: o,
    liveTranslation: a = null
  } = e, s = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, c = a ? Cc(a.state) : "";
  return /* @__PURE__ */ D("header", { className: "reader-workspace-bar", children: [
    a ? /* @__PURE__ */ D(
      "button",
      {
        type: "button",
        className: `reader-live-translation-toggle is-${a.state.connection}${a.visible ? " is-active" : ""}`,
        "aria-pressed": a.visible,
        "aria-label": a.visible ? "隐藏实时译文" : "显示实时译文",
        title: a.state.error || c,
        onClick: a.onToggle,
        children: [
          /* @__PURE__ */ y(ra, { size: 14, strokeWidth: 2.2, "aria-hidden": !0 }),
          /* @__PURE__ */ y("span", { className: "reader-live-translation-toggle-label", children: c })
        ]
      }
    ) : null,
    /* @__PURE__ */ y("div", { className: "reader-workspace-tabs", role: "tablist", "aria-label": "阅读工作区", children: Lc.map(({ id: i, label: l, Icon: u }) => {
      const d = n === i, m = xc({
        id: i,
        documentReady: r,
        sourceViewOnly: s,
        liveTranslationAvailable: !!a
      });
      return /* @__PURE__ */ D(
        "button",
        {
          type: "button",
          className: `reader-workspace-tab${d ? " is-active" : ""}`,
          role: "tab",
          "aria-selected": d,
          "aria-label": l,
          title: m ? `${l} 需要文档任务` : l,
          disabled: m,
          onClick: () => o(i),
          children: [
            /* @__PURE__ */ y(u, { size: 15, strokeWidth: 2.2, "aria-hidden": !0 }),
            /* @__PURE__ */ y("span", { className: "reader-workspace-tab-label", children: l })
          ]
        },
        i
      );
    }) })
  ] });
}
const zc = {
  markdown: { label: "Markdown", short: "MD", Icon: oa, needsJob: !0 }
}, Oc = Xr.map(
  (e) => ({ id: e, ...zc[e] })
);
function vo() {
  return Oc.map(({ id: e, label: t, short: n, Icon: r, needsJob: o }) => ({
    id: e,
    label: t,
    short: n,
    Icon: r,
    needsJob: o
  }));
}
function Fc(e) {
  const t = Fe(), { active: n } = e, r = e.sourceOnly ?? (t == null ? void 0 : t.sourceOnly) ?? !1, o = e.onSelect ?? (t == null ? void 0 : t.assistant.select) ?? (() => {
  }), a = e.onClose ?? (t == null ? void 0 : t.assistant.close) ?? (() => {
  });
  return /* @__PURE__ */ y(We, { children: vo().map(({ id: s, label: c, Icon: i, needsJob: l }) => {
    const u = n === s, d = l && r, m = u ? `收起${c}` : `打开${c}`;
    return /* @__PURE__ */ y(
      "button",
      {
        type: "button",
        className: "reader-panel-toggle",
        "aria-label": m,
        "aria-pressed": u,
        title: d ? `${c} 需打开任务阅读` : c,
        disabled: d,
        onClick: () => u ? a() : o(s),
        children: /* @__PURE__ */ y(i, { className: "reader-close-home-icon", size: 18, strokeWidth: 2.25, "aria-hidden": !0 })
      },
      s
    );
  }) });
}
function $c(e) {
  const t = Fe(), { active: n, badges: r } = e, o = e.sourceOnly ?? (t == null ? void 0 : t.sourceOnly) ?? !1, a = e.onSelect ?? (t == null ? void 0 : t.assistant.select) ?? (() => {
  }), s = e.onClose ?? (t == null ? void 0 : t.assistant.close) ?? (() => {
  }), c = vo().map(({ id: i, label: l, short: u, Icon: d, needsJob: m }) => ({
    key: i,
    label: l,
    short: u,
    Icon: d,
    disabled: m && o,
    selected: n === i,
    badge: r == null ? void 0 : r[i],
    onClick: () => a(i)
  }));
  return n ? /* @__PURE__ */ D("header", { className: "reader-assistant-dock-header", children: [
    /* @__PURE__ */ y("div", { className: "reader-assistant-dock-tabs", role: "tablist", "aria-label": "阅读辅助面板", children: c.map(({ key: i, label: l, Icon: u, disabled: d, selected: m, badge: h, onClick: g }) => /* @__PURE__ */ D(
      "button",
      {
        type: "button",
        role: "tab",
        "aria-selected": m,
        className: `reader-assistant-dock-tab${m ? " is-active" : ""}`,
        title: d ? `${l} 需打开任务阅读` : l,
        disabled: d,
        onClick: g,
        children: [
          /* @__PURE__ */ y(u, { size: 15, strokeWidth: 2.15, "aria-hidden": !0 }),
          /* @__PURE__ */ y("span", { className: "reader-assistant-dock-tab-label", children: l }),
          h ? /* @__PURE__ */ y("span", { className: "reader-assistant-dock-badge", children: h }) : null
        ]
      },
      i
    )) }),
    /* @__PURE__ */ y(
      "button",
      {
        type: "button",
        className: "reader-assistant-dock-close",
        "aria-label": "关闭阅读辅助面板",
        title: "关闭辅助面板",
        onClick: s,
        children: /* @__PURE__ */ y(En, { size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
      }
    )
  ] }) : null;
}
function jc(e, t) {
  const n = getComputedStyle(e), r = parseFloat(n.fontSize);
  return t * r;
}
function Bc(e, t) {
  const n = getComputedStyle(e.ownerDocument.documentElement), r = parseFloat(n.fontSize);
  return t * r;
}
function Uc(e) {
  return e / 100 * window.innerHeight;
}
function Hc(e) {
  return e / 100 * window.innerWidth;
}
function Wc(e) {
  switch (typeof e) {
    case "number":
      return [e, "px"];
    case "string": {
      const t = parseFloat(e);
      return e.endsWith("%") ? [t, "%"] : e.endsWith("px") ? [t, "px"] : e.endsWith("rem") ? [t, "rem"] : e.endsWith("em") ? [t, "em"] : e.endsWith("vh") ? [t, "vh"] : e.endsWith("vw") ? [t, "vw"] : [t, "%"];
    }
  }
}
function pt({
  groupSize: e,
  panelElement: t,
  styleProp: n
}) {
  let r;
  const [o, a] = Wc(n);
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
      r = Bc(t, o);
      break;
    }
    case "em": {
      r = jc(t, o);
      break;
    }
    case "vh": {
      r = Uc(o);
      break;
    }
    case "vw": {
      r = Hc(o);
      break;
    }
  }
  return r;
}
function pe(e) {
  return parseFloat(e.toFixed(3));
}
function ct({
  group: e
}) {
  const { orientation: t, panels: n } = e;
  return n.reduce((r, o) => (r += t === "horizontal" ? o.element.offsetWidth : o.element.offsetHeight, r), 0);
}
function hn(e) {
  const { panels: t } = e, n = ct({ group: e });
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
      const u = pt({
        groupSize: n,
        panelElement: o,
        styleProp: a.collapsedSize
      });
      s = pe(u / n * 100);
    }
    let c;
    if (a.defaultSize !== void 0) {
      const u = pt({
        groupSize: n,
        panelElement: o,
        styleProp: a.defaultSize
      });
      c = pe(u / n * 100);
    }
    let i = 0;
    if (a.minSize !== void 0) {
      const u = pt({
        groupSize: n,
        panelElement: o,
        styleProp: a.minSize
      });
      i = pe(u / n * 100);
    }
    let l = 100;
    if (a.maxSize !== void 0) {
      const u = pt({
        groupSize: n,
        panelElement: o,
        styleProp: a.maxSize
      });
      l = pe(u / n * 100);
    }
    return {
      groupResizeBehavior: a.groupResizeBehavior,
      collapsedSize: s,
      collapsible: a.collapsible === !0,
      defaultSize: c,
      disabled: a.disabled,
      minSize: i,
      maxSize: l,
      panelId: r.id
    };
  });
}
function ee(e, t = "Assertion error") {
  if (!e)
    throw Error(t);
}
function pn(e, t) {
  return Array.from(t).sort(
    e === "horizontal" ? Vc : Jc
  );
}
function Vc(e, t) {
  const n = e.element.offsetLeft - t.element.offsetLeft;
  return n !== 0 ? n : e.element.offsetWidth - t.element.offsetWidth;
}
function Jc(e, t) {
  const n = e.element.offsetTop - t.element.offsetTop;
  return n !== 0 ? n : e.element.offsetHeight - t.element.offsetHeight;
}
function wo(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.ELEMENT_NODE;
}
function So(e, t) {
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
function qc({
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
    const { x: c, y: i } = So(r, s), l = e === "horizontal" ? c : i;
    l < a && (a = l, o = s);
  }
  return ee(o, "No rect found"), o;
}
let Nt;
function Gc() {
  return Nt === void 0 && (typeof matchMedia == "function" ? Nt = !!matchMedia("(pointer:coarse)").matches : Nt = !1), Nt;
}
function Ro(e) {
  const { element: t, orientation: n, panels: r, separators: o } = e, a = pn(
    n,
    Array.from(t.children).filter(wo).map((g) => ({ element: g }))
  ).map(({ element: g }) => g), s = [];
  let c = !1, i = !1, l = -1, u = -1, d = 0, m, h = [];
  {
    let g = -1;
    for (const f of a)
      f.hasAttribute("data-panel") && (g++, f.hasAttribute("data-disabled") || (d++, l === -1 && (l = g), u = g));
  }
  if (d > 1) {
    let g = -1;
    for (const f of a)
      if (f.hasAttribute("data-panel")) {
        g++;
        const v = r.find(
          (b) => b.element === f
        );
        if (v) {
          if (m) {
            const b = m.element.getBoundingClientRect(), S = f.getBoundingClientRect();
            let R;
            if (i) {
              const p = n === "horizontal" ? new DOMRect(
                b.right,
                b.top,
                0,
                b.height
              ) : new DOMRect(
                b.left,
                b.bottom,
                b.width,
                0
              ), w = n === "horizontal" ? new DOMRect(S.left, S.top, 0, S.height) : new DOMRect(S.left, S.top, S.width, 0);
              switch (h.length) {
                case 0: {
                  R = [
                    p,
                    w
                  ];
                  break;
                }
                case 1: {
                  const k = h[0], _ = qc({
                    orientation: n,
                    rects: [b, S],
                    targetRect: k.element.getBoundingClientRect()
                  });
                  R = [
                    k,
                    _ === b ? w : p
                  ];
                  break;
                }
                default: {
                  R = h;
                  break;
                }
              }
            } else
              h.length ? R = h : R = [
                n === "horizontal" ? new DOMRect(
                  b.right,
                  S.top,
                  S.left - b.right,
                  S.height
                ) : new DOMRect(
                  S.left,
                  b.bottom,
                  S.width,
                  S.top - b.bottom
                )
              ];
            for (const p of R) {
              let w = "width" in p ? p : p.element.getBoundingClientRect();
              const k = Gc() ? e.resizeTargetMinimumSize.coarse : e.resizeTargetMinimumSize.fine;
              if (w.width < k) {
                const O = k - w.width;
                w = new DOMRect(
                  w.x - O / 2,
                  w.y,
                  w.width + O,
                  w.height
                );
              }
              if (w.height < k) {
                const O = k - w.height;
                w = new DOMRect(
                  w.x,
                  w.y - O / 2,
                  w.width,
                  w.height + O
                );
              }
              const _ = g <= l || g > u;
              !c && !_ && s.push({
                group: e,
                groupSize: ct({ group: e }),
                panels: [m, v],
                separator: "width" in p ? void 0 : p,
                rect: w
              }), c = !1;
            }
          }
          i = !1, m = v, h = [];
        }
      } else if (f.hasAttribute("data-separator")) {
        f.ariaDisabled !== null && (c = !0);
        const v = o.find(
          (b) => b.element === f
        );
        v ? h.push(v) : (m = void 0, h = []);
      } else
        i = !0;
  }
  return s;
}
var ze;
class Po {
  constructor() {
    Kn(this, ze, {});
  }
  addListener(t, n) {
    const r = dt(this, ze)[t];
    return r === void 0 ? dt(this, ze)[t] = [n] : r.includes(n) || r.push(n), () => {
      this.removeListener(t, n);
    };
  }
  emit(t, n) {
    const r = dt(this, ze)[t];
    if (r !== void 0)
      if (r.length === 1)
        r[0].call(null, n);
      else {
        let o = !1, a = null;
        const s = Array.from(r);
        for (let c = 0; c < s.length; c++) {
          const i = s[c];
          try {
            i.call(null, n);
          } catch (l) {
            a === null && (o = !0, a = l);
          }
        }
        if (o)
          throw a;
      }
  }
  removeAllListeners() {
    Zn(this, ze, {});
  }
  removeListener(t, n) {
    const r = dt(this, ze)[t];
    if (r !== void 0) {
      const o = r.indexOf(n);
      o >= 0 && r.splice(o, 1);
    }
  }
}
ze = new WeakMap();
let at = {
  cursorFlags: 0,
  state: "inactive"
};
const Cn = new Po();
function Je() {
  return at;
}
function Kc(e) {
  return Cn.addListener("change", e);
}
function Zc(e) {
  const t = at, n = { ...at };
  n.cursorFlags = e, at = n, Cn.emit("change", {
    prev: t,
    next: n
  });
}
function st(e) {
  const t = at;
  at = e, Cn.emit("change", {
    prev: t,
    next: e
  });
}
const Yc = (e) => e, en = () => {
}, Io = 1, To = 2, Eo = 4, ko = 8, vr = 3, wr = 12;
let _t;
function Sr() {
  return _t === void 0 && (_t = !1, typeof window < "u" && (window.navigator.userAgent.includes("Chrome") || window.navigator.userAgent.includes("Firefox")) && (_t = !0)), _t;
}
function Xc({
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
        if (e && Sr()) {
          const a = (e & Io) !== 0, s = (e & To) !== 0, c = (e & Eo) !== 0, i = (e & ko) !== 0;
          if (a)
            return c ? "se-resize" : i ? "ne-resize" : "e-resize";
          if (s)
            return c ? "sw-resize" : i ? "nw-resize" : "w-resize";
          if (c)
            return "s-resize";
          if (i)
            return "n-resize";
        }
        break;
      }
    }
    return Sr() ? r > 0 && o > 0 ? "move" : r > 0 ? "ew-resize" : "ns-resize" : r > 0 && o > 0 ? "grab" : r > 0 ? "col-resize" : "row-resize";
  }
}
const Rr = /* @__PURE__ */ new WeakMap();
function xn(e) {
  if (e.defaultView === null || e.defaultView === void 0)
    return;
  let { prevStyle: t, styleSheet: n } = Rr.get(e) ?? {};
  n === void 0 && (n = new e.defaultView.CSSStyleSheet(), e.adoptedStyleSheets && (Object.isExtensible(e.adoptedStyleSheets) ? e.adoptedStyleSheets.push(n) : e.adoptedStyleSheets = [
    ...e.adoptedStyleSheets,
    n
  ]));
  const r = Je();
  switch (r.state) {
    case "active":
    case "hover": {
      const o = Xc({
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
  Rr.set(e, {
    prevStyle: t,
    styleSheet: n
  });
}
let Te = /* @__PURE__ */ new Map();
const Ao = new Po();
function Qc(e) {
  Te = new Map(Te), Te.delete(e);
}
function Pr(e, t) {
  for (const [n] of Te)
    if (n.id === e)
      return n;
}
function Oe(e, t) {
  for (const [n, r] of Te)
    if (n.id === e)
      return r;
  if (t)
    throw Error(`Could not find data for Group with id ${e}`);
}
function Ke() {
  return Te;
}
function Dn(e, t) {
  return Ao.addListener("groupChange", (n) => {
    n.group.id === e && t(n);
  });
}
function Le(e, t, n) {
  const r = Te.get(e);
  Te = new Map(Te), Te.set(e, t), Ao.emit("groupChange", {
    group: e,
    isUserInteraction: (n == null ? void 0 : n.isUserInteraction) === !0,
    prev: r,
    next: t
  });
}
function Mo(e) {
  const t = Je();
  let n = !1;
  switch (t.state) {
    case "active":
      st({
        cursorFlags: 0,
        state: "inactive"
      }), t.hitRegions.length > 0 && (xn(e), n = !0, t.hitRegions.forEach((r) => {
        const o = Oe(r.group.id, !0);
        Le(r.group, o, {
          isUserInteraction: !0
        });
      }));
  }
  return n;
}
function Ir(e) {
  e.defaultPrevented || Mo(e.currentTarget);
}
function el(e, t, n) {
  let r, o = {
    x: 1 / 0,
    y: 1 / 0
  };
  for (const a of t) {
    const s = So(n, a.rect);
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
function tl(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}
function nl(e, t) {
  if (e === t) throw new Error("Cannot compare node with itself");
  const n = {
    a: kr(e),
    b: kr(t)
  };
  let r;
  for (; n.a.at(-1) === n.b.at(-1); )
    r = n.a.pop(), n.b.pop();
  ee(
    r,
    "Stacking order can only be calculated for elements with a common ancestor"
  );
  const o = {
    a: Er(Tr(n.a)),
    b: Er(Tr(n.b))
  };
  if (o.a === o.b) {
    const a = r.childNodes, s = {
      a: n.a.at(-1),
      b: n.b.at(-1)
    };
    let c = a.length;
    for (; c--; ) {
      const i = a[c];
      if (i === s.a) return 1;
      if (i === s.b) return -1;
    }
  }
  return Math.sign(o.a - o.b);
}
const rl = /\b(?:position|zIndex|opacity|transform|webkitTransform|mixBlendMode|filter|webkitFilter|isolation)\b/;
function ol(e) {
  const t = getComputedStyle(No(e) ?? e).display;
  return t === "flex" || t === "inline-flex";
}
function al(e) {
  const t = getComputedStyle(e);
  return !!(t.position === "fixed" || t.zIndex !== "auto" && (t.position !== "static" || ol(e)) || +t.opacity < 1 || "transform" in t && t.transform !== "none" || "webkitTransform" in t && t.webkitTransform !== "none" || "mixBlendMode" in t && t.mixBlendMode !== "normal" || "filter" in t && t.filter !== "none" || "webkitFilter" in t && t.webkitFilter !== "none" || "isolation" in t && t.isolation === "isolate" || rl.test(t.willChange) || t.webkitOverflowScrolling === "touch");
}
function Tr(e) {
  let t = e.length;
  for (; t--; ) {
    const n = e[t];
    if (ee(n, "Missing node"), al(n)) return n;
  }
  return null;
}
function Er(e) {
  return e && Number(getComputedStyle(e).zIndex) || 0;
}
function kr(e) {
  const t = [];
  for (; e; )
    t.push(e), e = No(e);
  return t;
}
function No(e) {
  const { parentNode: t } = e;
  return tl(t) ? t.host : t;
}
function sl(e, t) {
  return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function il({
  groupElement: e,
  hitRegion: t,
  pointerEventTarget: n
}) {
  if (!wo(n) || n.contains(e) || e.contains(n))
    return !0;
  if (nl(n, e) > 0) {
    let r = n;
    for (; r; ) {
      if (r.contains(e))
        return !0;
      if (sl(r.getBoundingClientRect(), t))
        return !1;
      r = r.parentElement;
    }
  }
  return !0;
}
function zn(e, t) {
  const n = [];
  return t.forEach((r, o) => {
    if (o.disabled)
      return;
    const a = Ro(o), s = el(o.orientation, a, {
      x: e.clientX,
      y: e.clientY
    });
    s && s.distance.x <= 0 && s.distance.y <= 0 && il({
      groupElement: o.element,
      hitRegion: s.hitRegion.rect,
      pointerEventTarget: e.target
    }) && n.push(s.hitRegion);
  }), n;
}
function cl(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] != t[n])
      return !1;
  return !0;
}
function fe(e, t, n = 0) {
  return Math.abs(pe(e) - pe(t)) <= n;
}
function Ie(e, t) {
  return fe(e, t) ? 0 : e > t ? 1 : -1;
}
function ot({
  overrideDisabledPanels: e,
  panelConstraints: t,
  prevSize: n,
  size: r
}) {
  const {
    collapsedSize: o = 0,
    collapsible: a,
    disabled: s,
    maxSize: c = 100,
    minSize: i = 0
  } = t;
  if (s && !e)
    return n;
  if (Ie(r, i) < 0)
    if (a) {
      const l = (o + i) / 2;
      Ie(r, l) < 0 ? r = o : r = i;
    } else
      r = i;
  return r = Math.min(c, r), r = pe(r), r;
}
function wt({
  delta: e,
  initialLayout: t,
  panelConstraints: n,
  pivotIndices: r,
  prevLayout: o,
  trigger: a
}) {
  if (fe(e, 0))
    return t;
  const s = a === "imperative-api", c = Object.values(t), i = Object.values(o), l = [...c], [u, d] = r;
  ee(u != null, "Invalid first pivot index"), ee(d != null, "Invalid second pivot index");
  let m = 0;
  switch (a) {
    case "keyboard": {
      {
        const f = e < 0 ? d : u, v = n[f];
        ee(
          v,
          `Panel constraints not found for index ${f}`
        );
        const {
          collapsedSize: b = 0,
          collapsible: S,
          minSize: R = 0
        } = v;
        if (S) {
          const p = c[f];
          if (ee(
            p != null,
            `Previous layout not found for panel index ${f}`
          ), fe(p, b)) {
            const w = R - p;
            Ie(w, Math.abs(e)) > 0 && (e = e < 0 ? 0 - w : w);
          }
        }
      }
      {
        const f = e < 0 ? u : d, v = n[f];
        ee(
          v,
          `No panel constraints found for index ${f}`
        );
        const {
          collapsedSize: b = 0,
          collapsible: S,
          minSize: R = 0
        } = v;
        if (S) {
          const p = c[f];
          if (ee(
            p != null,
            `Previous layout not found for panel index ${f}`
          ), fe(p, R)) {
            const w = p - b;
            Ie(w, Math.abs(e)) > 0 && (e = e < 0 ? 0 - w : w);
          }
        }
      }
      break;
    }
    default: {
      const f = e < 0 ? d : u, v = n[f];
      ee(
        v,
        `Panel constraints not found for index ${f}`
      );
      const b = c[f], { collapsible: S, collapsedSize: R, minSize: p } = v;
      if (S && Ie(b, p) < 0)
        if (e > 0) {
          const w = p - R, k = w / 2, _ = b + e;
          Ie(_, p) < 0 && (e = Ie(e, k) <= 0 ? 0 : w);
        } else {
          const w = p - R, k = 100 - w / 2, _ = b - e;
          Ie(_, p) < 0 && (e = Ie(100 + e, k) > 0 ? 0 : -w);
        }
      break;
    }
  }
  {
    const f = e < 0 ? 1 : -1;
    let v = e < 0 ? d : u, b = 0;
    for (; ; ) {
      const R = c[v];
      ee(
        R != null,
        `Previous layout not found for panel index ${v}`
      );
      const p = ot({
        overrideDisabledPanels: s,
        panelConstraints: n[v],
        prevSize: R,
        size: 100
      }) - R;
      if (b += p, v += f, v < 0 || v >= n.length)
        break;
    }
    const S = Math.min(Math.abs(e), Math.abs(b));
    e = e < 0 ? 0 - S : S;
  }
  {
    let f = e < 0 ? u : d;
    for (; f >= 0 && f < n.length; ) {
      const v = Math.abs(e) - Math.abs(m), b = c[f];
      ee(
        b != null,
        `Previous layout not found for panel index ${f}`
      );
      const S = b - v, R = ot({
        overrideDisabledPanels: s,
        panelConstraints: n[f],
        prevSize: b,
        size: S
      });
      if (!fe(b, R) && (m += b - R, l[f] = R, m.toFixed(3).localeCompare(Math.abs(e).toFixed(3), void 0, {
        numeric: !0
      }) >= 0))
        break;
      e < 0 ? f-- : f++;
    }
  }
  if (cl(i, l))
    return o;
  {
    const f = e < 0 ? d : u, v = c[f];
    ee(
      v != null,
      `Previous layout not found for panel index ${f}`
    );
    const b = v + m, S = ot({
      overrideDisabledPanels: s,
      panelConstraints: n[f],
      prevSize: v,
      size: b
    });
    if (l[f] = S, !fe(S, b)) {
      let R = b - S, p = e < 0 ? d : u;
      for (; p >= 0 && p < n.length; ) {
        const w = l[p];
        ee(
          w != null,
          `Previous layout not found for panel index ${p}`
        );
        const k = w + R, _ = ot({
          overrideDisabledPanels: s,
          panelConstraints: n[p],
          prevSize: w,
          size: k
        });
        if (fe(w, _) || (R -= _ - w, l[p] = _), fe(R, 0))
          break;
        e > 0 ? p-- : p++;
      }
    }
  }
  const h = Object.values(l).reduce(
    (f, v) => v + f,
    0
  );
  if (!fe(h, 100, 0.1))
    return o;
  const g = Object.keys(o);
  return l.reduce((f, v, b) => (f[g[b]] = v, f), {});
}
function qe(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (t[n] === void 0 || Ie(e[n], t[n]) !== 0)
      return !1;
  return !0;
}
function Ge({
  layout: e,
  panelConstraints: t
}) {
  const n = Object.values(e), r = [...n], o = r.reduce(
    (c, i) => c + i,
    0
  );
  if (r.length !== t.length)
    throw Error(
      `Invalid ${t.length} panel layout: ${r.map((c) => `${c}%`).join(", ")}`
    );
  if (!fe(o, 100) && r.length > 0)
    for (let c = 0; c < t.length; c++) {
      const i = r[c];
      ee(i != null, `No layout data found for index ${c}`);
      const l = 100 / o * i;
      r[c] = l;
    }
  let a = 0;
  for (let c = 0; c < t.length; c++) {
    const i = n[c];
    ee(i != null, `No layout data found for index ${c}`);
    const l = r[c];
    ee(l != null, `No layout data found for index ${c}`);
    const u = ot({
      overrideDisabledPanels: !0,
      panelConstraints: t[c],
      prevSize: i,
      size: l
    });
    l != u && (a += l - u, r[c] = u);
  }
  if (!fe(a, 0))
    for (let c = 0; c < t.length; c++) {
      const i = r[c];
      ee(i != null, `No layout data found for index ${c}`);
      const l = i + a, u = ot({
        overrideDisabledPanels: !0,
        panelConstraints: t[c],
        prevSize: i,
        size: l
      });
      if (i !== u && (a -= u - i, r[c] = u, fe(a, 0)))
        break;
    }
  const s = Object.keys(e);
  return r.reduce((c, i, l) => (c[s[l]] = i, c), {});
}
function _o({
  groupId: e,
  panelId: t
}) {
  const n = () => {
    const i = Ke();
    for (const [
      l,
      {
        defaultLayoutDeferred: u,
        derivedPanelConstraints: d,
        layout: m,
        groupSize: h,
        separatorToPanels: g
      }
    ] of i)
      if (l.id === e)
        return {
          defaultLayoutDeferred: u,
          derivedPanelConstraints: d,
          group: l,
          groupSize: h,
          layout: m,
          separatorToPanels: g
        };
    throw Error(`Group ${e} not found`);
  }, r = () => {
    const i = n().derivedPanelConstraints.find(
      (l) => l.panelId === t
    );
    if (i !== void 0)
      return i;
    throw Error(`Panel constraints not found for Panel ${t}`);
  }, o = () => {
    const i = n().group.panels.find((l) => l.id === t);
    if (i !== void 0)
      return i;
    throw Error(`Layout not found for Panel ${t}`);
  }, a = () => {
    const i = n().layout[t];
    if (i !== void 0)
      return i;
    throw Error(`Layout not found for Panel ${t}`);
  }, s = ({
    nextSize: i,
    panels: l,
    prevLayout: u,
    derivedPanelConstraints: d
  }) => {
    const m = a(), h = l.findIndex((v) => v.id === t), g = h === 0, f = h === l.length - 1;
    if (f && i < m && (g || l.slice(0, h).every((v, b) => {
      const S = d[b];
      return (S == null ? void 0 : S.collapsible) && fe(S.collapsedSize, u[S.panelId]);
    }))) {
      const v = l.slice(0, h).reduce((b, S) => b + u[S.id], 0);
      return {
        ...u,
        [t]: pe(100 - v)
      };
    }
    return wt({
      delta: f ? m - i : i - m,
      initialLayout: u,
      panelConstraints: d,
      pivotIndices: f ? [h - 1, h] : [h, h + 1],
      prevLayout: u,
      trigger: "imperative-api"
    });
  }, c = (i) => {
    const l = a();
    if (i === l)
      return;
    const {
      defaultLayoutDeferred: u,
      derivedPanelConstraints: d,
      group: m,
      groupSize: h,
      layout: g,
      separatorToPanels: f
    } = n(), v = s({
      nextSize: i,
      panels: m.panels,
      prevLayout: g,
      derivedPanelConstraints: d
    }), b = Ge({
      layout: v,
      panelConstraints: d
    });
    qe(g, b) || Le(m, {
      defaultLayoutDeferred: u,
      derivedPanelConstraints: d,
      groupSize: h,
      layout: b,
      separatorToPanels: f
    });
  };
  return {
    collapse: () => {
      const { collapsible: i, collapsedSize: l } = r(), { mutableValues: u } = o(), d = a();
      i && d !== l && (u.expandToSize = d, c(l));
    },
    expand: () => {
      const { collapsible: i, collapsedSize: l, minSize: u } = r(), { mutableValues: d } = o(), m = a();
      if (i && m === l) {
        let h = d.expandToSize ?? u;
        h === 0 && (h = 1), c(h);
      }
    },
    getSize: () => {
      const { group: i } = n(), l = a(), { element: u } = o(), d = i.orientation === "horizontal" ? u.offsetWidth : u.offsetHeight;
      return {
        asPercentage: l,
        inPixels: d
      };
    },
    isCollapsed: () => {
      const { collapsible: i, collapsedSize: l } = r(), u = a();
      return i && fe(l, u);
    },
    resize: (i) => {
      const { group: l } = n(), { element: u } = o(), d = ct({ group: l }), m = pt({
        groupSize: d,
        panelElement: u,
        styleProp: i
      }), h = pe(m / d * 100);
      c(h);
    }
  };
}
function Ar(e) {
  if (e.defaultPrevented)
    return;
  const t = Ke();
  zn(e, t).forEach((n) => {
    if (n.separator && !n.separator.disableDoubleClick) {
      const r = n.panels.find(
        (o) => o.panelConstraints.defaultSize !== void 0
      );
      if (r) {
        const o = r.panelConstraints.defaultSize, a = _o({
          groupId: n.group.id,
          panelId: r.id
        });
        a && o !== void 0 && (a.resize(o), e.preventDefault());
      }
    }
  });
}
function Ct(e) {
  const t = Ke();
  for (const [n] of t)
    if (n.separators.some(
      (r) => r.element === e
    ))
      return n;
  throw Error("Could not find parent Group for separator element");
}
function Lo({
  groupId: e
}) {
  const t = () => {
    const n = Ke();
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
        layout: c,
        separatorToPanels: i
      } = t(), l = Ge({
        layout: n,
        panelConstraints: o
      });
      return r ? c : (qe(c, l) || Le(a, {
        defaultLayoutDeferred: r,
        derivedPanelConstraints: o,
        groupSize: s,
        layout: l,
        separatorToPanels: i
      }), l);
    }
  };
}
function Be(e, t) {
  const n = Ct(e), r = Oe(n.id, !0), o = n.separators.find(
    (u) => u.element === e
  );
  ee(o, "Matching separator not found");
  const a = r.separatorToPanels.get(o);
  ee(a, "Matching panels not found");
  const s = a.map((u) => n.panels.indexOf(u)), c = Lo({ groupId: n.id }).getLayout(), i = wt({
    delta: t,
    initialLayout: c,
    panelConstraints: r.derivedPanelConstraints,
    pivotIndices: s,
    prevLayout: c,
    trigger: "keyboard"
  }), l = Ge({
    layout: i,
    panelConstraints: r.derivedPanelConstraints
  });
  qe(c, l) || Le(
    n,
    {
      defaultLayoutDeferred: r.defaultLayoutDeferred,
      derivedPanelConstraints: r.derivedPanelConstraints,
      groupSize: r.groupSize,
      layout: l,
      separatorToPanels: r.separatorToPanels
    },
    // Keyboard resizes (arrow keys, Home/End, Enter collapse/expand) originate
    // from a real DOM event on the separator, so they are user interactions
    // just like pointer drags. This function is only reached from
    // onDocumentKeyDown. See #716.
    { isUserInteraction: !0 }
  );
}
function Mr(e) {
  if (e.defaultPrevented)
    return;
  const t = e.currentTarget, n = Ct(t);
  if (!n.disabled)
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault(), n.orientation === "vertical" && Be(t, 5);
        break;
      }
      case "ArrowLeft": {
        e.preventDefault(), n.orientation === "horizontal" && Be(t, -5);
        break;
      }
      case "ArrowRight": {
        e.preventDefault(), n.orientation === "horizontal" && Be(t, 5);
        break;
      }
      case "ArrowUp": {
        e.preventDefault(), n.orientation === "vertical" && Be(t, -5);
        break;
      }
      case "End": {
        e.preventDefault(), Be(t, 100);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const r = Ct(t), o = Oe(r.id, !0), { derivedPanelConstraints: a, layout: s, separatorToPanels: c } = o, i = r.separators.find(
          (m) => m.element === t
        );
        ee(i, "Matching separator not found");
        const l = c.get(i);
        ee(l, "Matching panels not found");
        const u = l[0], d = a.find(
          (m) => m.panelId === u.id
        );
        if (ee(d, "Panel metadata not found"), d.collapsible) {
          const m = s[u.id], h = d.collapsedSize === m ? r.mutableState.expandedPanelSizes[u.id] ?? d.minSize : d.collapsedSize;
          Be(t, h - m);
        }
        break;
      }
      case "F6": {
        e.preventDefault();
        const r = Ct(t).separators.map(
          (s) => s.element
        ), o = Array.from(r).findIndex(
          (s) => s === e.currentTarget
        );
        ee(o !== null, "Index not found");
        const a = e.shiftKey ? o > 0 ? o - 1 : r.length - 1 : o + 1 < r.length ? o + 1 : 0;
        r[a].focus({
          preventScroll: !0
        });
        break;
      }
      case "Home": {
        e.preventDefault(), Be(t, -100);
        break;
      }
    }
}
function Nr(e) {
  if (e.defaultPrevented || e.pointerType === "mouse" && e.button > 0)
    return;
  const t = Ke(), n = zn(e, t), r = /* @__PURE__ */ new Map();
  let o = !1;
  n.forEach((a) => {
    a.separator && (o || (o = !0, a.separator.element.focus({
      // @ts-expect-error https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus#browser_compatibility
      focusVisible: !1,
      preventScroll: !0
    })));
    const s = t.get(a.group);
    s && r.set(a.group, s.layout);
  }), st({
    cursorFlags: 0,
    hitRegions: n,
    initialLayoutMap: r,
    pointerDownAtPoint: { x: e.clientX, y: e.clientY },
    state: "active"
  }), n.length && e.preventDefault();
}
function Co({
  document: e,
  event: t,
  hitRegions: n,
  initialLayoutMap: r,
  mountedGroups: o,
  pointerDownAtPoint: a,
  prevCursorFlags: s
}) {
  let c = 0;
  n.forEach((l) => {
    const { group: u, groupSize: d } = l, { orientation: m, panels: h } = u, { disableCursor: g } = u.mutableState;
    let f = 0;
    a ? m === "horizontal" ? f = (t.clientX - a.x) / d * 100 : f = (t.clientY - a.y) / d * 100 : m === "horizontal" ? f = t.clientX < 0 ? -100 : 100 : f = t.clientY < 0 ? -100 : 100;
    const v = r.get(u), b = o.get(u);
    if (!v || !b)
      return;
    const {
      defaultLayoutDeferred: S,
      derivedPanelConstraints: R,
      groupSize: p,
      layout: w,
      separatorToPanels: k
    } = b;
    if (R && w && k) {
      const _ = wt({
        delta: f,
        initialLayout: v,
        panelConstraints: R,
        pivotIndices: l.panels.map((O) => h.indexOf(O)),
        prevLayout: w,
        trigger: "mouse-or-touch"
      });
      if (qe(_, w)) {
        if (f !== 0 && !g)
          switch (m) {
            case "horizontal": {
              c |= f < 0 ? Io : To;
              break;
            }
            case "vertical": {
              c |= f < 0 ? Eo : ko;
              break;
            }
          }
      } else
        Le(l.group, {
          defaultLayoutDeferred: S,
          derivedPanelConstraints: R,
          groupSize: p,
          layout: _,
          separatorToPanels: k
        });
    }
  });
  let i = 0;
  t.movementX === 0 ? i |= s & vr : i |= c & vr, t.movementY === 0 ? i |= s & wr : i |= c & wr, Zc(i), xn(e);
}
function _r(e) {
  const t = Ke(), n = Je();
  switch (n.state) {
    case "active":
      Co({
        document: e.currentTarget,
        event: e,
        hitRegions: n.hitRegions,
        initialLayoutMap: n.initialLayoutMap,
        mountedGroups: t,
        prevCursorFlags: n.cursorFlags
      });
  }
}
function Lr(e) {
  var r, o;
  if (e.defaultPrevented)
    return;
  const t = Je(), n = Ke();
  switch (t.state) {
    case "active": {
      if (
        // Skip this check for "pointerleave" events, else Firefox triggers a false positive (see #514)
        e.buttons === 0
      ) {
        st({
          cursorFlags: 0,
          state: "inactive"
        }), t.hitRegions.forEach((a) => {
          const s = Oe(a.group.id, !0);
          Le(a.group, s, {
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
      Co({
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
      const a = zn(e, n);
      a.length === 0 ? t.state !== "inactive" && st({
        cursorFlags: 0,
        state: "inactive"
      }) : st({
        cursorFlags: 0,
        hitRegions: a,
        state: "hover"
      }), xn(e.currentTarget);
      break;
    }
  }
}
function Cr(e) {
  if (e.relatedTarget instanceof HTMLIFrameElement)
    switch (Je().state) {
      case "hover":
        st({
          cursorFlags: 0,
          state: "inactive"
        });
    }
}
function xr(e) {
  e.defaultPrevented || e.pointerType === "mouse" && e.button > 0 || Mo(e.currentTarget) && e.preventDefault();
}
function Dr(e) {
  let t = 0, n = 0;
  const r = {};
  for (const a of e)
    if (a.defaultSize !== void 0) {
      t++;
      const s = pe(a.defaultSize);
      n += s, r[a.panelId] = s;
    } else
      r[a.panelId] = void 0;
  const o = e.length - t;
  if (o !== 0) {
    const a = pe((100 - n) / o);
    for (const s of e)
      s.defaultSize === void 0 && (r[s.panelId] = a);
  }
  return r;
}
function ll(e, t, n) {
  if (!n[0])
    return;
  const r = e.panels.find((i) => i.element === t);
  if (!r || !r.onResize)
    return;
  const o = ct({ group: e }), a = e.orientation === "horizontal" ? r.element.offsetWidth : r.element.offsetHeight, s = r.mutableValues.prevSize, c = {
    asPercentage: pe(a / o * 100),
    inPixels: a
  };
  r.mutableValues.prevSize = c, r.onResize(c, r.id, s);
}
function ul(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function dl({
  group: e,
  nextGroupSize: t,
  prevGroupSize: n,
  prevLayout: r
}) {
  if (n <= 0 || t <= 0 || n === t)
    return r;
  let o = 0, a = 0, s = !1;
  const c = /* @__PURE__ */ new Map(), i = [];
  for (const d of e.panels) {
    const m = r[d.id] ?? 0;
    switch (d.panelConstraints.groupResizeBehavior) {
      case "preserve-pixel-size": {
        s = !0;
        const h = m / 100 * n, g = pe(
          h / t * 100
        );
        c.set(d.id, g), o += g;
        break;
      }
      case "preserve-relative-size":
      default: {
        i.push(d.id), a += m;
        break;
      }
    }
  }
  if (!s || i.length === 0)
    return r;
  const l = 100 - o, u = { ...r };
  if (c.forEach((d, m) => {
    u[m] = d;
  }), a > 0)
    for (const d of i) {
      const m = r[d] ?? 0;
      u[d] = pe(
        m / a * l
      );
    }
  else {
    const d = pe(
      l / i.length
    );
    for (const m of i)
      u[m] = d;
  }
  return u;
}
function fl(e, t) {
  const n = e.map((o) => o.id), r = Object.keys(t);
  if (n.length !== r.length)
    return !1;
  for (const o of n)
    if (!r.includes(o))
      return !1;
  return !0;
}
const tt = /* @__PURE__ */ new Map();
function ml(e) {
  let t = !0;
  ee(
    e.element.ownerDocument.defaultView,
    "Cannot register an unmounted Group"
  );
  const n = e.element.ownerDocument.defaultView.ResizeObserver, r = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), a = new n((g) => {
    for (const f of g) {
      const { borderBoxSize: v, target: b } = f;
      if (b === e.element) {
        if (t) {
          const S = ct({ group: e });
          if (S === 0)
            return;
          const R = Oe(e.id);
          if (!R)
            return;
          const p = hn(e), w = R.defaultLayoutDeferred ? Dr(p) : R.layout, k = dl({
            group: e,
            nextGroupSize: S,
            prevGroupSize: R.groupSize,
            prevLayout: w
          }), _ = Ge({
            layout: k,
            panelConstraints: p
          });
          if (!R.defaultLayoutDeferred && qe(R.layout, _) && ul(
            R.derivedPanelConstraints,
            p
          ) && R.groupSize === S)
            return;
          Le(e, {
            defaultLayoutDeferred: !1,
            derivedPanelConstraints: p,
            groupSize: S,
            layout: _,
            separatorToPanels: R.separatorToPanels
          });
        }
      } else
        ll(e, b, v);
    }
  });
  a.observe(e.element), e.panels.forEach((g) => {
    ee(
      !r.has(g.id),
      `Panel ids must be unique; id "${g.id}" was used more than once`
    ), r.add(g.id), g.onResize && a.observe(g.element);
  });
  const s = ct({ group: e }), c = hn(e), i = e.panels.map(({ id: g }) => g).join(",");
  let l = e.mutableState.defaultLayout;
  l && (fl(e.panels, l) || (l = void 0));
  const u = e.mutableState.layouts[i] ?? l ?? Dr(c), d = Ge({
    layout: u,
    panelConstraints: c
  }), m = e.element.ownerDocument;
  tt.set(
    m,
    (tt.get(m) ?? 0) + 1
  );
  const h = /* @__PURE__ */ new Map();
  return Ro(e).forEach((g) => {
    g.separator && h.set(g.separator, g.panels);
  }), Le(e, {
    defaultLayoutDeferred: s === 0,
    derivedPanelConstraints: c,
    groupSize: s,
    layout: d,
    separatorToPanels: h
  }), e.separators.forEach((g) => {
    ee(
      !o.has(g.id),
      `Separator ids must be unique; id "${g.id}" was used more than once`
    ), o.add(g.id), g.element.addEventListener("keydown", Mr);
  }), tt.get(m) === 1 && (m.addEventListener("contextmenu", Ir, !0), m.addEventListener("dblclick", Ar, !0), m.addEventListener("pointerdown", Nr, !0), m.addEventListener("pointerleave", _r), m.addEventListener("pointermove", Lr), m.addEventListener("pointerout", Cr), m.addEventListener("pointerup", xr, !0)), function() {
    t = !1, tt.set(
      m,
      Math.max(0, (tt.get(m) ?? 0) - 1)
    ), Qc(e), e.separators.forEach((g) => {
      g.element.removeEventListener("keydown", Mr);
    }), tt.get(m) || (m.removeEventListener(
      "contextmenu",
      Ir,
      !0
    ), m.removeEventListener(
      "dblclick",
      Ar,
      !0
    ), m.removeEventListener(
      "pointerdown",
      Nr,
      !0
    ), m.removeEventListener("pointerleave", _r), m.removeEventListener("pointermove", Lr), m.removeEventListener("pointerout", Cr), m.removeEventListener("pointerup", xr, !0)), a.disconnect();
  };
}
function hl() {
  const [e, t] = L({}), n = F(() => t({}), []);
  return [e, n];
}
function On(e) {
  const t = Br();
  return `${e ?? t}`;
}
const Ze = typeof window < "u" ? Ce : j;
function gt(e) {
  const t = A(e);
  return Ze(() => {
    t.current = e;
  }, [e]), F(
    (...n) => {
      var r;
      return (r = t.current) == null ? void 0 : r.call(t, ...n);
    },
    [t]
  );
}
function Fn(...e) {
  return gt((t) => {
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
function $n(e) {
  const t = A({ ...e });
  return Ze(() => {
    for (const n in e)
      t.current[n] = e[n];
  }, [e]), t.current;
}
const xo = wn(null);
function pl(e, t) {
  const n = A({
    getLayout: () => ({}),
    setLayout: Yc
  });
  Rn(t, () => n.current, []), Ze(() => {
    Object.assign(
      n.current,
      Lo({ groupId: e })
    );
  });
}
function Do({
  children: e,
  className: t,
  defaultLayout: n,
  disableCursor: r,
  disabled: o,
  elementRef: a,
  groupRef: s,
  id: c,
  onLayoutChange: i,
  onLayoutChanged: l,
  orientation: u = "horizontal",
  resizeTargetMinimumSize: d = {
    coarse: 20,
    fine: 10
  },
  style: m,
  ...h
}) {
  const g = A({
    onLayoutChange: {},
    onLayoutChanged: {}
  }), f = gt((P) => {
    qe(g.current.onLayoutChange, P) || (g.current.onLayoutChange = P, i == null || i(P));
  }), v = gt(
    (P, T) => {
      qe(g.current.onLayoutChanged, P) || (g.current.onLayoutChanged = P, l == null || l(P, { isUserInteraction: T }));
    }
  ), b = On(c), S = A(null), [R, p] = hl(), w = A({
    lastExpandedPanelSizes: {},
    layouts: {},
    panels: [],
    resizeTargetMinimumSize: d,
    separators: []
  }), k = Fn(S, a);
  pl(b, s);
  const _ = gt(
    (P, T) => {
      const I = Je(), N = Pr(P), z = Oe(P);
      if (z) {
        let H = !1;
        switch (I.state) {
          case "active": {
            H = I.hitRegions.some(
              (Z) => Z.group === N
            );
            break;
          }
        }
        return {
          flexGrow: z.layout[T] ?? 1,
          pointerEvents: H ? "none" : void 0
        };
      }
      if (n != null && n[T])
        return {
          flexGrow: n == null ? void 0 : n[T]
        };
    }
  ), O = $n({
    defaultLayout: n,
    disableCursor: r
  }), x = q(
    () => ({
      get disableCursor() {
        return !!O.disableCursor;
      },
      getPanelStyles: _,
      id: b,
      orientation: u,
      registerPanel: (P) => {
        const T = w.current;
        return T.panels = pn(u, [
          ...T.panels,
          P
        ]), p(), () => {
          T.panels = T.panels.filter(
            (I) => I !== P
          ), p();
        };
      },
      registerSeparator: (P) => {
        const T = w.current;
        return T.separators = pn(u, [
          ...T.separators,
          P
        ]), p(), () => {
          T.separators = T.separators.filter(
            (I) => I !== P
          ), p();
        };
      },
      updatePanelProps: (P, { disabled: T }) => {
        const I = w.current.panels.find(
          (H) => H.id === P
        );
        I && (I.panelConstraints.disabled = T);
        const N = Pr(b), z = Oe(b);
        N && z && Le(N, {
          ...z,
          derivedPanelConstraints: hn(N)
        });
      },
      updateSeparatorProps: (P, {
        disabled: T,
        disableDoubleClick: I
      }) => {
        const N = w.current.separators.find(
          (z) => z.id === P
        );
        N && (N.disabled = T, N.disableDoubleClick = I);
      }
    }),
    [_, b, p, u, O]
  ), E = A(null);
  return Ze(() => {
    const P = S.current;
    if (P === null)
      return;
    const T = w.current;
    let I;
    if (O.defaultLayout !== void 0 && Object.keys(O.defaultLayout).length === T.panels.length) {
      I = {};
      for (const B of T.panels) {
        const C = O.defaultLayout[B.id];
        C !== void 0 && (I[B.id] = C);
      }
    }
    const N = {
      disabled: !!o,
      element: P,
      id: b,
      mutableState: {
        defaultLayout: I,
        disableCursor: !!O.disableCursor,
        expandedPanelSizes: w.current.lastExpandedPanelSizes,
        layouts: w.current.layouts
      },
      orientation: u,
      panels: T.panels,
      resizeTargetMinimumSize: T.resizeTargetMinimumSize,
      separators: T.separators
    };
    E.current = N;
    const z = ml(N), { defaultLayoutDeferred: H, derivedPanelConstraints: Z, layout: G } = Oe(N.id, !0);
    !H && Z.length > 0 && (f(G), v(G, !1));
    const ae = Dn(b, (B) => {
      const { defaultLayoutDeferred: C, derivedPanelConstraints: se, layout: ne } = B.next;
      if (C || se.length === 0)
        return;
      const X = N.panels.map(({ id: Y }) => Y).join(",");
      N.mutableState.layouts[X] = ne, se.forEach((Y) => {
        if (Y.collapsible) {
          const { layout: K } = B.prev ?? {};
          if (K) {
            const he = fe(
              Y.collapsedSize,
              ne[Y.panelId]
            ), be = fe(
              Y.collapsedSize,
              K[Y.panelId]
            );
            he && !be && (N.mutableState.expandedPanelSizes[Y.panelId] = K[Y.panelId]);
          }
        }
      });
      const me = Je().state !== "active";
      f(ne), me && v(ne, B.isUserInteraction);
    });
    return () => {
      E.current = null, z(), ae();
    };
  }, [
    o,
    b,
    v,
    f,
    u,
    R,
    O
  ]), j(() => {
    const P = E.current;
    P && (P.mutableState.defaultLayout = n, P.mutableState.disableCursor = !!r);
  }), /* @__PURE__ */ y(xo.Provider, { value: x, children: /* @__PURE__ */ y(
    "div",
    {
      ...h,
      className: t,
      "data-group": !0,
      "data-testid": b,
      id: b,
      ref: k,
      style: {
        height: "100%",
        width: "100%",
        overflow: "hidden",
        ...m,
        display: "flex",
        flexDirection: u === "horizontal" ? "row" : "column",
        flexWrap: "nowrap",
        // Inform the browser that the library is handling touch events for this element
        // but still allow users to scroll content within panels in the non-resizing direction
        // NOTE This is not an inherited style
        // See github.com/bvaughn/react-resizable-panels/issues/662
        touchAction: u === "horizontal" ? "pan-y" : "pan-x"
      },
      children: e
    }
  ) });
}
Do.displayName = "Group";
function jn() {
  const e = Sn(xo);
  return ee(
    e,
    "Group Context not found; did you render a Panel or Separator outside of a Group?"
  ), e;
}
function gl(e, t) {
  const { id: n } = jn(), r = A({
    collapse: en,
    expand: en,
    getSize: () => ({
      asPercentage: 0,
      inPixels: 0
    }),
    isCollapsed: () => !1,
    resize: en
  });
  Rn(t, () => r.current, []), Ze(() => {
    Object.assign(
      r.current,
      _o({ groupId: n, panelId: e })
    );
  });
}
function gn({
  children: e,
  className: t,
  collapsedSize: n = "0%",
  collapsible: r = !1,
  defaultSize: o,
  disabled: a,
  elementRef: s,
  groupResizeBehavior: c = "preserve-relative-size",
  id: i,
  maxSize: l = "100%",
  minSize: u = "0%",
  onResize: d,
  panelRef: m,
  style: h,
  ...g
}) {
  const f = !!i, v = On(i), b = $n({
    disabled: a
  }), S = A(null), R = Fn(S, s), {
    getPanelStyles: p,
    id: w,
    orientation: k,
    registerPanel: _,
    updatePanelProps: O
  } = jn(), x = d !== null, E = gt(
    (N, z, H) => {
      d == null || d(N, i, H);
    }
  );
  Ze(() => {
    const N = S.current;
    if (N !== null) {
      const z = {
        element: N,
        id: v,
        idIsStable: f,
        mutableValues: {
          expandToSize: void 0,
          prevSize: void 0
        },
        onResize: x ? E : void 0,
        panelConstraints: {
          groupResizeBehavior: c,
          collapsedSize: n,
          collapsible: r,
          defaultSize: o,
          disabled: b.disabled,
          maxSize: l,
          minSize: u
        }
      };
      return _(z);
    }
  }, [
    c,
    n,
    r,
    o,
    x,
    v,
    f,
    l,
    u,
    E,
    _,
    b
  ]), j(() => {
    O(v, { disabled: a });
  }, [a, v, O]), gl(v, m);
  const P = () => {
    const N = p(w, v);
    if (N)
      return JSON.stringify(N);
  }, T = jr(
    (N) => Dn(w, N),
    P,
    P
  );
  let I;
  return T ? I = JSON.parse(T) : o !== void 0 ? I = {
    flexGrow: void 0,
    flexShrink: void 0,
    flexBasis: o
  } : I = { flexGrow: 1 }, /* @__PURE__ */ y(
    "div",
    {
      ...g,
      "data-disabled": a || void 0,
      "data-panel": !0,
      "data-testid": v,
      id: v,
      ref: R,
      style: {
        ...bl,
        display: "flex",
        flexBasis: 0,
        flexShrink: 1,
        overflow: "visible",
        ...I
      },
      children: /* @__PURE__ */ y(
        "div",
        {
          className: t,
          style: {
            maxHeight: "100%",
            maxWidth: "100%",
            flexGrow: 1,
            overflow: "auto",
            ...h,
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
gn.displayName = "Panel";
const bl = {
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
function yl({
  layout: e,
  panelConstraints: t,
  panelId: n,
  panelIndex: r
}) {
  let o, a;
  const s = e[n], c = t.find(
    (i) => i.panelId === n
  );
  if (c) {
    const i = c.maxSize, l = c.collapsible ? c.collapsedSize : c.minSize, u = [r, r + 1];
    a = Ge({
      layout: wt({
        delta: l - s,
        initialLayout: e,
        panelConstraints: t,
        pivotIndices: u,
        prevLayout: e
      }),
      panelConstraints: t
    })[n], o = Ge({
      layout: wt({
        delta: i - s,
        initialLayout: e,
        panelConstraints: t,
        pivotIndices: u,
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
function zo({
  children: e,
  className: t,
  disabled: n,
  disableDoubleClick: r,
  elementRef: o,
  id: a,
  style: s,
  ...c
}) {
  const i = On(a), l = $n({
    disabled: n,
    disableDoubleClick: r
  }), [u, d] = L({}), [m, h] = L("inactive"), [g, f] = L(!1), v = A(null), b = Fn(v, o), {
    disableCursor: S,
    id: R,
    orientation: p,
    registerSeparator: w,
    updateSeparatorProps: k
  } = jn(), _ = p === "horizontal" ? "vertical" : "horizontal";
  Ze(() => {
    const E = v.current;
    if (E !== null) {
      const P = {
        disabled: l.disabled,
        disableDoubleClick: l.disableDoubleClick,
        element: E,
        id: i
      }, T = w(P), I = Kc(
        (z) => {
          h(
            z.next.state !== "inactive" && z.next.hitRegions.some(
              (H) => H.separator === P
            ) ? z.next.state : "inactive"
          );
        }
      ), N = Dn(
        R,
        (z) => {
          const { derivedPanelConstraints: H, layout: Z, separatorToPanels: G } = z.next, ae = G.get(P);
          if (ae) {
            const B = ae[0], C = ae.indexOf(B);
            d(
              yl({
                layout: Z,
                panelConstraints: H,
                panelId: B.id,
                panelIndex: C
              })
            );
          }
        }
      );
      return () => {
        I(), N(), T();
      };
    }
  }, [R, i, w, l]), j(() => {
    k(i, { disabled: n, disableDoubleClick: r });
  }, [n, r, i, k]);
  let O;
  n && !S && (O = "not-allowed");
  let x;
  if (n)
    x = "disabled";
  else
    switch (m) {
      case "active": {
        x = "active";
        break;
      }
      default:
        g ? x = "focus" : x = m;
    }
  return /* @__PURE__ */ y(
    "div",
    {
      ...c,
      "aria-controls": u.valueControls,
      "aria-disabled": n || void 0,
      "aria-orientation": _,
      "aria-valuemax": u.valueMax,
      "aria-valuemin": u.valueMin,
      "aria-valuenow": u.valueNow,
      children: e,
      className: t,
      "data-separator": x,
      "data-testid": i,
      id: i,
      onBlur: () => f(!1),
      onFocus: () => f(!0),
      ref: b,
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
zo.displayName = "Separator";
const Bn = 30, Un = 65, St = 50, vl = 100 - Un, wl = 100 - Bn;
function Sl(e) {
  const t = Number(e);
  return Number.isFinite(t) ? Math.min(Un, Math.max(Bn, t)) : St;
}
function Hn(e) {
  return 100 - e;
}
function nt(e) {
  return `${e}%`;
}
const Wn = "reader-document", Rt = "reader-assistant", Oo = "retainpdf.reader.ai-split-layout.v1", Rl = {
  [Wn]: Hn(St),
  [Rt]: St
};
function Vn(e) {
  const t = Sl(e == null ? void 0 : e[Rt]);
  return {
    [Wn]: Hn(t),
    [Rt]: t
  };
}
function Pl() {
  try {
    const e = JSON.parse(localStorage.getItem(Oo) || "null");
    return Vn(e);
  } catch {
    return Rl;
  }
}
function Il(e) {
  try {
    localStorage.setItem(Oo, JSON.stringify(Vn(e)));
  } catch {
  }
}
function tn(e, t) {
  const n = e == null ? void 0 : e.closest(".reader-react-root");
  if (!n) return;
  const r = Vn(t);
  n.style.setProperty(
    "--reader-ai-split-width",
    `${r[Rt]}vw`
  );
}
function Tl() {
  const e = A(null), [t] = L(Pl);
  Ce(() => {
    const o = e.current;
    return tn(o, t), () => {
      var a;
      (a = o == null ? void 0 : o.closest(".reader-react-root")) == null || a.style.removeProperty("--reader-ai-split-width");
    };
  }, [t]);
  const n = F((o) => {
    tn(e.current, o);
  }, []), r = F((o, a) => {
    tn(e.current, o), a.isUserInteraction && Il(o);
  }, []);
  return /* @__PURE__ */ D(
    Do,
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
        /* @__PURE__ */ y(
          gn,
          {
            id: Wn,
            defaultSize: nt(Hn(St)),
            minSize: nt(vl),
            maxSize: nt(wl)
          }
        ),
        /* @__PURE__ */ y(
          zo,
          {
            id: "reader-ai-split-separator",
            className: "reader-ai-split-separator",
            "aria-label": "调整文档与 AI 问答宽度",
            children: /* @__PURE__ */ y("span", { "aria-hidden": "true" })
          }
        ),
        /* @__PURE__ */ y(
          gn,
          {
            id: Rt,
            defaultSize: nt(St),
            minSize: nt(Bn),
            maxSize: nt(Un)
          }
        )
      ]
    }
  );
}
function El({
  regionsFailed: e = !1,
  metadataFailed: t = !1
}) {
  const [n, r] = L(!1);
  if (j(() => {
    !e && !t && r(!1);
  }, [e, t]), n || !e && !t)
    return null;
  const o = [
    e ? "译文区域" : "",
    t ? "阅读元数据" : ""
  ].filter(Boolean);
  return /* @__PURE__ */ D("div", { className: "reader-error-notice", role: "status", "data-reader-error-notice": "true", children: [
    /* @__PURE__ */ D("span", { className: "reader-error-notice-text", children: [
      o.join("、"),
      "加载失败，正文仍可正常阅读。"
    ] }),
    /* @__PURE__ */ y(
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
function kl({
  loading: e,
  failed: t,
  text: n,
  percent: r,
  regionsError: o = !1,
  metadataError: a = !1
}) {
  return !e && !t ? /* @__PURE__ */ y(El, { regionsFailed: o, metadataFailed: a }) : /* @__PURE__ */ D(We, { children: [
    e ? /* @__PURE__ */ y("div", { className: "reader-boot-loading", "data-reader-boot-loading": "true", children: /* @__PURE__ */ D("div", { className: "reader-boot-loading-card", children: [
      /* @__PURE__ */ y("div", { className: "reader-boot-loading-text", children: n }),
      /* @__PURE__ */ y("div", { className: "reader-boot-loading-track", children: /* @__PURE__ */ y(
        "span",
        {
          className: "reader-boot-loading-bar",
          style: { width: `${Math.max(0, Math.min(100, r))}%` }
        }
      ) })
    ] }) }) : null,
    t ? /* @__PURE__ */ y("div", { className: "reader-react-error", role: "alert", children: n }) : null
  ] });
}
function Al(e) {
  if (!(e instanceof HTMLElement)) return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
function Ml() {
  const [e, t] = L(!1), n = Br(), r = A(null);
  return j(() => {
    if (!e) return;
    const o = (s) => {
      const c = r.current;
      c && s.target instanceof Node && !c.contains(s.target) && t(!1);
    }, a = (s) => {
      s.key === "Escape" && (s.preventDefault(), t(!1));
    };
    return document.addEventListener("mousedown", o), window.addEventListener("keydown", a), () => {
      document.removeEventListener("mousedown", o), window.removeEventListener("keydown", a);
    };
  }, [e]), j(() => {
    const o = (a) => {
      if (a.defaultPrevented || a.metaKey || a.ctrlKey || a.altKey || Al(a.target)) return;
      const s = a.key;
      if (s === "?" || s === "h" || s === "H" || s === "/") {
        if (s === "/" && !a.shiftKey)
          return;
        a.preventDefault(), t((c) => !c);
      }
    };
    return window.addEventListener("keydown", o), () => window.removeEventListener("keydown", o);
  }, []), /* @__PURE__ */ D("div", { className: "reader-react-shortcuts", ref: r, "data-reader-shortcuts": "", children: [
    /* @__PURE__ */ y(
      "button",
      {
        type: "button",
        className: `reader-react-hud-btn reader-react-shortcuts-btn${e ? " is-active" : ""}`,
        "aria-label": "快捷键说明",
        "aria-expanded": e,
        "aria-controls": n,
        title: "快捷键（H 或 ?）",
        onClick: () => t((o) => !o),
        children: /* @__PURE__ */ y(aa, { className: "reader-react-shortcuts-icon", size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
      }
    ),
    e ? /* @__PURE__ */ D(
      "div",
      {
        id: n,
        className: "reader-react-shortcuts-panel reader-floating-surface",
        role: "dialog",
        "aria-label": "阅读器快捷键",
        children: [
          /* @__PURE__ */ D("div", { className: "reader-react-shortcuts-head", children: [
            /* @__PURE__ */ y("strong", { children: "快捷键" }),
            /* @__PURE__ */ y(
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
          /* @__PURE__ */ y("div", { className: "reader-react-shortcuts-body", children: vi.map((o) => /* @__PURE__ */ D("section", { className: "reader-react-shortcuts-group", children: [
            /* @__PURE__ */ y("h3", { children: o.title }),
            /* @__PURE__ */ y("ul", { children: o.items.map((a) => /* @__PURE__ */ D("li", { children: [
              /* @__PURE__ */ y("kbd", { children: a.keys }),
              /* @__PURE__ */ y("span", { children: a.desc })
            ] }, `${o.title}-${a.keys}`)) })
          ] }, o.title)) }),
          /* @__PURE__ */ y("p", { className: "reader-react-shortcuts-foot", children: "在输入框内不会触发快捷键" })
        ]
      }
    ) : null
  ] });
}
const Nl = ["source", "sideBySide", "translated"], _l = { source: "", translated: "", sideBySide: "" };
function Ll(e) {
  if (e.sourceOnly || !e.jobId) {
    const t = xt(e.sourceUrl), n = xt(e.translatedUrl);
    return {
      source: t,
      translated: n,
      // sideBySide requires dedicated artifact; no fallback to source url
      sideBySide: ""
    };
  }
  return Ea({
    jobId: e.jobId,
    jobPayload: e.jobPayload,
    manifestPayload: e.manifestPayload
  });
}
function Cl(e) {
  const [t, n] = L(() => /* @__PURE__ */ new Set()), r = q(
    () => e ? Ll(e) : _l,
    [e]
  ), o = q(
    () => Nl.filter((s) => !(e != null && e.sourceOnly && s !== "source")),
    [e == null ? void 0 : e.sourceOnly]
  ), a = F(async (s) => {
    if (!e) return;
    const c = xt(r[s]);
    if (!(!c || t.has(s)))
      try {
        const i = e.jobId ? Ta(s, {
          jobId: e.jobId,
          jobPayload: e.jobPayload,
          manifestPayload: e.manifestPayload
        }) : `${e.sourceOnly ? "document" : "reader"}-${s}.pdf`;
        await ka(
          e.fetchProtected,
          c,
          i,
          i,
          null,
          (l) => n((u) => {
            const d = new Set(u);
            return l ? d.add(s) : d.delete(s), d;
          })
        );
      } catch (i) {
        const l = i instanceof Error ? i.message : "下载失败";
        Aa(l), n((u) => {
          const d = new Set(u);
          return d.delete(s), d;
        });
      }
  }, [r, t, e]);
  return { urls: r, downloadItems: o, busyActions: t, handleDownload: a };
}
const xl = {
  source: Ur,
  sideBySide: Hr,
  translated: Wr
}, Dl = {
  source: "原文",
  sideBySide: "对照",
  translated: "译文"
};
function zl(e) {
  const t = Fe(), n = e.download ?? (t == null ? void 0 : t.download), { urls: r, downloadItems: o, busyActions: a, handleDownload: s } = Cl(n), c = A(null);
  return j(() => {
    const i = () => {
      var d;
      (d = c.current) != null && d.open && (c.current.open = !1);
    }, l = (d) => {
      c.current && !c.current.contains(d.target) && i();
    }, u = (d) => {
      d.key === "Escape" && i();
    };
    return document.addEventListener("pointerdown", l), document.addEventListener("keydown", u), () => {
      document.removeEventListener("pointerdown", l), document.removeEventListener("keydown", u);
    };
  }, []), /* @__PURE__ */ D("details", { ref: c, className: "reader-download-actions", children: [
    /* @__PURE__ */ D("summary", { className: "reader-download-trigger", "aria-label": "下载 PDF", title: "下载 PDF", children: [
      /* @__PURE__ */ y(sa, { size: 15, strokeWidth: 2.1, "aria-hidden": !0 }),
      /* @__PURE__ */ y("span", { className: "reader-download-trigger-label", children: "下载" }),
      /* @__PURE__ */ y(ia, { size: 13, strokeWidth: 2.2, "aria-hidden": !0, className: "reader-download-trigger-caret" })
    ] }),
    /* @__PURE__ */ y("div", { className: "reader-download-menu", role: "group", "aria-label": "下载 PDF", children: o.map((i) => {
      const l = Wo[i], u = xt(r[i]), d = a.has(i), m = !!u && !d, h = m ? "" : Vo(i, r), g = xl[i];
      return /* @__PURE__ */ D(
        "button",
        {
          type: "button",
          id: `reader-download-${i}`,
          className: `reader-download-action${d ? " is-busy" : ""}`,
          disabled: !m,
          "aria-label": m ? `下载${l.label}` : h,
          onClick: () => {
            c.current && (c.current.open = !1), s(i);
          },
          children: [
            /* @__PURE__ */ y(g, { size: 15, strokeWidth: 2.1, "aria-hidden": !0 }),
            /* @__PURE__ */ D("span", { className: "reader-download-action-text", children: [
              /* @__PURE__ */ D("span", { className: "reader-download-action-label", children: [
                Dl[i],
                " PDF"
              ] }),
              h ? /* @__PURE__ */ y("span", { className: "reader-download-action-reason", children: h }) : null
            ] })
          ]
        },
        i
      );
    }) })
  ] });
}
const Ol = "retainpdf:reader:bookmarks:v1:", Fl = 200;
function Jn() {
  try {
    return typeof globalThis.localStorage > "u" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
function Fo(e) {
  const t = `${e || ""}`.trim();
  return t ? `${Ol}${t}` : "";
}
function $l(e) {
  if (!e || typeof e != "object") return null;
  const t = e, n = Math.floor(Number(t.page));
  return !Number.isFinite(n) || n < 1 ? null : { page: n, label: `${t.label || ""}`.trim().slice(0, 120), createdAt: `${t.createdAt || ""}` };
}
function Bt(e, t = Jn()) {
  const n = Fo(e);
  if (!n || !t) return [];
  try {
    const r = JSON.parse(t.getItem(n) || "[]"), o = /* @__PURE__ */ new Map();
    for (const a of Array.isArray(r) ? r : []) {
      const s = $l(a);
      s && !o.has(s.page) && o.set(s.page, s);
    }
    return [...o.values()].sort((a, s) => a.page - s.page);
  } catch {
    return [];
  }
}
function bn(e, t, n) {
  const r = Fo(e), o = [...t].sort((a, s) => a.page - s.page).slice(0, Fl);
  if (!r || !n) return o;
  try {
    n.setItem(r, JSON.stringify(o));
  } catch {
  }
  return o;
}
function jl(e, t, n = "", { storage: r = Jn(), now: o = () => (/* @__PURE__ */ new Date()).toISOString() } = {}) {
  const a = Bt(e, r), s = Math.floor(Number(t));
  return !Number.isFinite(s) || s < 1 ? a : a.some((c) => c.page === s) ? bn(e, a.filter((c) => c.page !== s), r) : bn(e, [...a, { page: s, label: `${n || ""}`.trim().slice(0, 120), createdAt: o() }], r);
}
function Bl(e, t, n = Jn()) {
  return bn(e, Bt(e, n).filter((r) => r.page !== t), n);
}
function Ul(e, t) {
  var r, o, a, s;
  let n = null;
  for (const c of e || []) {
    if (`${(c == null ? void 0 : c.regionType) || ""}` != "heading") continue;
    const i = Number(((r = c.source) == null ? void 0 : r.page) ?? ((o = c.translated) == null ? void 0 : o.page));
    if (!Number.isFinite(i) || i > t) continue;
    const l = `${((a = c.translated) == null ? void 0 : a.text) || c.markdown || ((s = c.source) == null ? void 0 : s.text) || ""}`.replace(/\s+/g, " ").trim();
    if (!l) continue;
    const u = Number(c.readingOrder) || 0;
    (!n || i > n.page || i === n.page && u >= n.order) && (n = { page: i, order: u, text: l });
  }
  return n ? n.text.slice(0, 60) : "";
}
function Hl({ filled: e }) {
  return /* @__PURE__ */ y("svg", { viewBox: "0 0 24 24", width: "15", height: "15", "aria-hidden": "true", fill: e ? "currentColor" : "none", children: /* @__PURE__ */ y("path", { d: "M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.6L6 20V5.5a1 1 0 0 1 1-1z", stroke: "currentColor", strokeWidth: "1.7", strokeLinejoin: "round" }) });
}
function Wl({ scope: e, currentPage: t, numPages: n, regions: r, onGoToPage: o }) {
  const [a, s] = L(() => Bt(e)), [c, i] = L(!1), l = A(null);
  if (j(() => {
    s(Bt(e)), i(!1);
  }, [e]), j(() => {
    if (!c) return;
    const m = (g) => {
      l.current && !l.current.contains(g.target) && i(!1);
    }, h = (g) => {
      g.key === "Escape" && i(!1);
    };
    return document.addEventListener("pointerdown", m), document.addEventListener("keydown", h), () => {
      document.removeEventListener("pointerdown", m), document.removeEventListener("keydown", h);
    };
  }, [c]), !e || n <= 0) return null;
  const u = Math.min(Math.max(t, 1), n), d = a.some((m) => m.page === u);
  return /* @__PURE__ */ D("div", { className: "reader-react-hud-group reader-bookmarks", "aria-label": "书签", ref: l, children: [
    /* @__PURE__ */ y(
      "button",
      {
        type: "button",
        className: `reader-react-hud-btn reader-bookmark-toggle${d ? " is-marked" : ""}`,
        "aria-pressed": d,
        "aria-label": d ? `取消第 ${u} 页的书签` : `给第 ${u} 页加书签`,
        title: d ? "取消这一页的书签" : "给这一页加书签",
        onClick: () => s(jl(e, u, Ul(r, u))),
        children: /* @__PURE__ */ y(Hl, { filled: d })
      }
    ),
    /* @__PURE__ */ y(
      "button",
      {
        type: "button",
        className: "reader-react-hud-btn reader-bookmark-list-btn",
        "aria-expanded": c,
        "aria-haspopup": "true",
        "aria-label": `书签列表，共 ${a.length} 个`,
        title: "书签列表",
        disabled: !a.length,
        onClick: () => i((m) => !m),
        children: a.length
      }
    ),
    c && a.length ? /* @__PURE__ */ y("div", { className: "reader-bookmark-popover", role: "dialog", "aria-label": "书签", children: /* @__PURE__ */ y("ol", { className: "reader-bookmark-list", children: a.map((m) => /* @__PURE__ */ D("li", { className: m.page === u ? "is-current" : "", children: [
      /* @__PURE__ */ D(
        "button",
        {
          type: "button",
          className: "reader-bookmark-jump",
          onClick: () => {
            o == null || o(Math.min(m.page, n)), i(!1);
          },
          children: [
            /* @__PURE__ */ D("span", { className: "reader-bookmark-page", children: [
              "第 ",
              m.page,
              " 页"
            ] }),
            m.label ? /* @__PURE__ */ y("span", { className: "reader-bookmark-label", children: m.label }) : null
          ]
        }
      ),
      /* @__PURE__ */ y(
        "button",
        {
          type: "button",
          className: "reader-bookmark-remove",
          "aria-label": `删除第 ${m.page} 页的书签`,
          onClick: () => s(Bl(e, m.page)),
          children: "×"
        }
      )
    ] }, m.page)) }) }) : null
  ] });
}
function Vl(e) {
  const t = Fe(), n = bo(), { mode: r = "compare", modeControls: o } = e, a = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? Pt, s = e.onZoomChange ?? (t == null ? void 0 : t.onZoomChange) ?? (() => {
  }), c = e.currentPage ?? (n == null ? void 0 : n.currentPage) ?? 1, i = e.numPages ?? (n == null ? void 0 : n.numPages) ?? 0, l = e.onGoToPage ?? (t == null ? void 0 : t.goToPage), u = ws(a), d = a > Kr + 1e-3, m = a < $t - 1e-3, h = rt(r, He()), g = h >= $t ? "100%（铺满阅读区）" : "50%（半屏，对照铺满）", [f, v] = L(!1), [b, S] = L(`${c}`);
  j(() => {
    f || S(`${Math.min(Math.max(c, 1), Math.max(i, 1))}`);
  }, [c, i, f]);
  const R = () => {
    if (v(!1), !l || i <= 0)
      return;
    const p = Number(`${b}`.trim());
    l(jt(p, i));
  };
  return /* @__PURE__ */ D("div", { className: "reader-react-hud", "data-reader-hud": "true", children: [
    o ? /* @__PURE__ */ y("div", { className: "reader-react-hud-group reader-react-hud-modes", children: o }) : null,
    /* @__PURE__ */ y("div", { className: "reader-react-hud-group", "aria-label": "页码", children: f ? /* @__PURE__ */ D(
      "form",
      {
        className: "reader-react-hud-page-form",
        onSubmit: (p) => {
          p.preventDefault(), R();
        },
        children: [
          /* @__PURE__ */ y(
            "input",
            {
              className: "reader-react-hud-page-input",
              type: "text",
              inputMode: "numeric",
              pattern: "[0-9]*",
              "aria-label": "跳转到页码",
              value: b,
              autoFocus: !0,
              onChange: (p) => S(p.target.value.replace(/[^\d]/g, "")),
              onBlur: R,
              onKeyDown: (p) => {
                p.key === "Escape" && (p.preventDefault(), v(!1), S(`${c}`));
              }
            }
          ),
          /* @__PURE__ */ D("span", { className: "reader-react-hud-page-suffix", children: [
            "/ ",
            i || "—"
          ] })
        ]
      }
    ) : /* @__PURE__ */ y(
      "button",
      {
        type: "button",
        className: "reader-react-hud-page reader-react-hud-page-btn",
        "aria-label": i > 0 ? `跳转页码，当前第 ${c} 页，共 ${i} 页` : "页码",
        title: i > 0 ? "点击输入页码跳转" : void 0,
        disabled: !l || i <= 0,
        onClick: () => {
          !l || i <= 0 || (S(`${c}`), v(!0));
        },
        children: i > 0 ? `${Math.min(c, i)} / ${i}` : "—"
      }
    ) }),
    e.bookmarkScope ? /* @__PURE__ */ y(
      Wl,
      {
        scope: e.bookmarkScope,
        currentPage: c,
        numPages: i,
        regions: t == null ? void 0 : t.regions,
        onGoToPage: l
      }
    ) : null,
    /* @__PURE__ */ D("div", { className: "reader-react-hud-group", "aria-label": "缩放", children: [
      /* @__PURE__ */ y(
        "button",
        {
          type: "button",
          className: "reader-react-hud-btn",
          "aria-label": "缩小",
          disabled: !d,
          onClick: () => s(yt(a, -1)),
          children: "−"
        }
      ),
      /* @__PURE__ */ D(
        "button",
        {
          type: "button",
          className: "reader-react-hud-btn reader-react-hud-zoom-label",
          "aria-label": `重置为${g}`,
          title: g,
          onClick: () => s(h),
          children: [
            u,
            "%"
          ]
        }
      ),
      /* @__PURE__ */ y(
        "button",
        {
          type: "button",
          className: "reader-react-hud-btn",
          "aria-label": "放大",
          disabled: !m,
          onClick: () => s(yt(a, 1)),
          children: "+"
        }
      )
    ] }),
    /* @__PURE__ */ y("div", { className: "reader-react-hud-group reader-react-hud-help", "aria-label": "帮助", children: /* @__PURE__ */ y(Ml, {}) })
  ] });
}
function zr(e) {
  var t, n;
  return Qr(e == null ? void 0 : e.assistantPanel) ? e.assistantPanel : ((t = e == null ? void 0 : e.splitLayout) == null ? void 0 : t.left) === "markdown" || ((n = e == null ? void 0 : e.splitLayout) == null ? void 0 : n.right) === "markdown" ? "markdown" : null;
}
function Jl(e) {
  const [t, n] = L(() => ({
    scope: e,
    panel: zr(Ee(e))
  }));
  j(() => {
    n((o) => o.scope === e ? o : {
      scope: e,
      panel: zr(Ee(e))
    });
  }, [e]), j(() => {
    t.scope === e && Wt(t.scope, {
      assistantPanel: t.panel,
      // 旧的自由两栏布局已经没有写入者了，恢复时只当迁移来源读一次。
      splitLayout: null
    });
  }, [t, e]);
  const r = F((o) => {
    n((a) => ({
      scope: a.scope,
      panel: typeof o == "function" ? o(a.panel) : o
    }));
  }, []);
  return { panel: t.panel, scope: t.scope, setPanel: r };
}
const yn = "download-toast";
function ql({
  title: e = "下载中",
  status: t = "正在准备...",
  meta: n = "等待响应...",
  percent: r = NaN,
  tone: o = "progress"
}) {
  const a = Number.isFinite(r) ? Math.max(4, Math.min(100, Number(r) || 0)) : 18;
  return /* @__PURE__ */ D("div", { className: "download-toast-card reader-floating-surface", "data-tone": o, "aria-live": "polite", children: [
    /* @__PURE__ */ D("div", { className: "download-toast-head", children: [
      /* @__PURE__ */ y("div", { id: "download-toast-title", className: "download-toast-title", children: e }),
      /* @__PURE__ */ y("div", { id: "download-toast-status", className: "download-toast-status", children: t })
    ] }),
    /* @__PURE__ */ y("div", { className: "download-toast-track", children: /* @__PURE__ */ y("span", { id: "download-toast-bar", className: "download-toast-bar", style: { width: `${a}%` } }) }),
    /* @__PURE__ */ y("div", { id: "download-toast-meta", className: "download-toast-meta", children: n })
  ] });
}
function Gl(e = {}) {
  const {
    visible: t = !1,
    title: n = "下载中",
    status: r = "正在准备...",
    meta: o = "等待响应...",
    percent: a = NaN,
    tone: s = "progress"
  } = e;
  if (!t) {
    on.dismiss(yn);
    return;
  }
  on.custom(
    () => /* @__PURE__ */ y(ql, { title: n, status: r, meta: o, percent: a, tone: s }),
    { id: yn, duration: 1 / 0 }
  );
}
function Kl() {
  const e = F((t) => {
    t && (t.setState = Gl, t.hide = () => on.dismiss(yn));
  }, []);
  return /* @__PURE__ */ D(We, { children: [
    /* @__PURE__ */ y(na, { position: "bottom-right" }),
    /* @__PURE__ */ y("download-toast", { style: { display: "none" }, "aria-hidden": "true", ref: e })
  ] });
}
function Zl(e) {
  return e.sourceViewOnly ? { mode: "source", auto: !1 } : e.savedMode ? { mode: e.savedMode, auto: !1 } : Zr(e.viewportWidth) ? { mode: "translated", auto: !0 } : { mode: null, auto: !1 };
}
function Yl(e, t) {
  return t === null || e !== t;
}
function Xl(e) {
  const t = A(!1);
  return e && (t.current = !0), t.current;
}
function Ql(e, t) {
  const n = e === t;
  return { open: n, mounted: Xl(n) };
}
const Or = { itemId: null, origin: null };
function eu() {
  let e = Or;
  const t = /* @__PURE__ */ new Set();
  return {
    get: () => e,
    set(n, r) {
      if (!(e.itemId === n && (n === null || e.origin === r))) {
        e = n === null ? Or : { itemId: n, origin: r };
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
const Ue = (e) => `${e ?? ""}`.replace(/\s+/gu, " ").trim(), tu = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉", "+": "₊", "-": "₋" }, nu = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "+": "⁺", "-": "⁻" }, ru = {
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
}, Fr = (e, t) => [...e].every((n) => n in t) ? [...e].map((n) => t[n]).join("") : e;
function ou(e) {
  return e.replace(
    /\$([^$]+)\$/gu,
    (t, n) => n.replace(/\\(?:mathrm|text|mathbf|mathit|operatorname)\{([^{}]*)\}/gu, "$1").replace(/_\{([^{}]*)\}|_(\w)/gu, (r, o, a) => Fr(o ?? a ?? "", tu)).replace(/\^\{([^{}]*)\}|\^(\w)/gu, (r, o, a) => Fr(o ?? a ?? "", nu)).replace(/\\([a-zA-Z]+)/gu, (r, o) => ru[o] ?? "").replace(/[{}]/gu, "").trim()
  ).replace(/\s+/gu, " ").trim();
}
function au(e) {
  return Ue(e.translatedBlockText) || Ue(e.translated.text) || Ue(e.source.text);
}
const su = (e) => !!e.headingLevel || e.subType === "title" || e.subType === "heading";
function iu(e) {
  const t = [];
  for (const n of e) {
    if (!su(n)) continue;
    const r = ou(au(n)), o = Number(n.source.page);
    if (!r || !Number.isFinite(o) || o < 1) continue;
    const a = t[t.length - 1];
    a && a.text === r && a.page === o || t.push({ itemId: n.itemId, level: n.headingLevel && n.headingLevel > 1 ? 2 : 1, page: o, text: r });
  }
  return t;
}
function cu(e, t) {
  let n = -1;
  for (let r = 0; r < e.length && e[r].page <= t; r += 1)
    n = r;
  return n;
}
const lu = 24, uu = 60;
function $r(e, t) {
  const n = e.toLowerCase().indexOf(t);
  if (n < 0) return null;
  const r = Math.max(0, n - lu), o = Math.min(e.length, n + t.length + uu), a = r > 0 ? "…" : "";
  return { snippet: `${a}${e.slice(r, o)}${o < e.length ? "…" : ""}`, at: a.length + n - r, length: t.length };
}
function du(e, t, n = 200) {
  const r = Ue(t).toLowerCase();
  if (!r) return [];
  const o = [];
  for (const a of e) {
    const s = Number(a.source.page);
    if (!Number.isFinite(s) || s < 1) continue;
    const c = Ue(a.translatedBlockText) || Ue(a.translated.text), i = c ? $r(c, r) : null, l = i ?? $r(Ue(a.source.text), r);
    if (l && (o.push({ itemId: a.itemId, page: s, side: i ? "translated" : "source", ...l }), o.length >= n))
      break;
  }
  return o;
}
const fu = [];
function mu({ open: e, onToggle: t }) {
  return /* @__PURE__ */ D("div", { className: "reader-finder-toggles", children: [
    /* @__PURE__ */ D(De, { className: "reader-finder-toggle", "aria-pressed": e === "outline", title: "目录", onClick: () => t("outline"), children: [
      /* @__PURE__ */ y(ca, { size: 16, strokeWidth: 2.1, "aria-hidden": !0 }),
      /* @__PURE__ */ y("span", { children: "目录" })
    ] }),
    /* @__PURE__ */ D(De, { className: "reader-finder-toggle", "aria-pressed": e === "search", title: "在书里搜索（原文和译文）", onClick: () => t("search"), children: [
      /* @__PURE__ */ y(la, { size: 16, strokeWidth: 2.1, "aria-hidden": !0 }),
      /* @__PURE__ */ y("span", { children: "搜索" })
    ] })
  ] });
}
function hu({
  tab: e,
  onTab: t,
  onClose: n,
  onJump: r
}) {
  var h, g;
  const o = ((h = Fe()) == null ? void 0 : h.regions) ?? fu, a = ((g = bo()) == null ? void 0 : g.currentPage) ?? 1, s = q(() => iu(o), [o]), c = cu(s, a), [i, l] = L(""), u = q(() => du(o, i), [o, i]), d = A(null), m = A(null);
  return j(() => {
    var f, v, b;
    e === "search" ? (f = d.current) == null || f.focus() : (b = (v = m.current) == null ? void 0 : v.querySelector('[aria-current="location"]')) == null || b.scrollIntoView({ block: "center" });
  }, [e]), /* @__PURE__ */ D("aside", { className: "reader-finder", "aria-label": e === "outline" ? "目录" : "搜索", children: [
    /* @__PURE__ */ D("header", { className: "reader-finder-head", children: [
      /* @__PURE__ */ D("div", { className: "reader-finder-tabs", role: "tablist", children: [
        /* @__PURE__ */ y(De, { className: "reader-finder-tab", role: "tab", "aria-selected": e === "outline", onClick: () => t("outline"), children: "目录" }),
        /* @__PURE__ */ y(De, { className: "reader-finder-tab", role: "tab", "aria-selected": e === "search", onClick: () => t("search"), children: "搜索" })
      ] }),
      /* @__PURE__ */ y(De, { className: "reader-finder-close", "aria-label": "收起", title: "收起", onClick: n, children: /* @__PURE__ */ y(En, { size: 16, strokeWidth: 2.1, "aria-hidden": !0 }) })
    ] }),
    e === "outline" ? s.length ? /* @__PURE__ */ y("ol", { ref: m, className: "reader-finder-list", children: s.map((f, v) => /* @__PURE__ */ y("li", { children: /* @__PURE__ */ D(
      De,
      {
        className: "reader-finder-entry",
        "data-level": f.level,
        "aria-current": v === c ? "location" : void 0,
        onClick: () => r(f.itemId),
        children: [
          /* @__PURE__ */ y("span", { className: "reader-finder-entry-text", children: f.text }),
          /* @__PURE__ */ y("span", { className: "reader-finder-entry-page", children: f.page })
        ]
      }
    ) }, f.itemId)) }) : /* @__PURE__ */ y("p", { className: "reader-finder-empty", children: o.length ? "这本书没有认出标题。" : "这本书还没有段落数据。" }) : /* @__PURE__ */ D(We, { children: [
      /* @__PURE__ */ D("div", { className: "reader-finder-search", children: [
        /* @__PURE__ */ y(
          ua,
          {
            ref: d,
            type: "search",
            size: "sm",
            className: "reader-finder-input",
            placeholder: "原文、译文里的字",
            "aria-label": "在书里搜索",
            value: i,
            onChange: (f) => l(f.target.value),
            onKeyDown: (f) => {
              f.key === "Enter" && u[0] && r(u[0].itemId), f.stopPropagation();
            }
          }
        ),
        i.trim() ? /* @__PURE__ */ y("p", { className: "reader-finder-count", children: u.length >= 200 ? "200 处以上，只列前 200 处" : `${u.length} 处` }) : null
      ] }),
      /* @__PURE__ */ y("ol", { className: "reader-finder-list", children: u.map((f) => /* @__PURE__ */ y("li", { children: /* @__PURE__ */ D(De, { className: "reader-finder-entry is-hit", onClick: () => r(f.itemId), children: [
        /* @__PURE__ */ D("span", { className: "reader-finder-entry-text", children: [
          f.snippet.slice(0, f.at),
          /* @__PURE__ */ y("mark", { children: f.snippet.slice(f.at, f.at + f.length) }),
          f.snippet.slice(f.at + f.length)
        ] }),
        /* @__PURE__ */ y("span", { className: "reader-finder-entry-page", children: f.page })
      ] }) }, f.itemId)) })
    ] })
  ] });
}
const pu = Bo(() => import("./ReaderMarkdownPanel-sUfUtGhX.js").then((e) => ({ default: e.ReaderMarkdownPanel })));
function gu(e) {
  const t = e.sourceOnly || !e.translatedUrl, n = !!(e.overlayContentAvailable && e.liveTranslationVisible && !e.assistantOpen), o = e.assistantPdfPane || (e.assistantOpen && e.mode === "compare" ? "source" : e.mode), a = !t && (o === "translated" || o === "compare");
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
function bu(e, t) {
  return e === "compare" ? t ? !0 : null : !1;
}
function yu() {
  const e = bi(), { boot: t, panes: n, sessionFiles: r, session: o } = e, a = Jl(e.viewStateKey), s = a.panel, c = a.setPanel, [i, l] = L(null), [u, d] = L(!1), m = A(null), h = A(null), g = s !== null, f = e.liveTranslationAvailable || e.liveTranslation.pagesByPage.size > 0, v = gu({
    mode: e.mode,
    sourceOnly: e.sourceOnly,
    translatedUrl: r.translatedUrl,
    overlayContentAvailable: f,
    liveTranslationVisible: u,
    assistantOpen: g,
    assistantPdfPane: i
  }), b = ci({
    hasOverlayContent: f,
    connection: e.liveTranslation.connection,
    showSource: v.showSource,
    liveTranslationVisible: u,
    assistantOpen: g
  }), S = v.sourceViewOnly, R = v.visibleMode;
  j(() => {
    d(!1);
  }, [e.viewStateKey]), j(() => {
    e.session.jobTerminal && d(!1);
  }, [e.session.jobTerminal]), j(() => {
    l(null);
  }, [a.scope]), j(() => {
    if (!(t.loading || t.failed)) {
      if (m.current !== e.viewStateKey) {
        m.current = e.viewStateKey;
        const B = Ee(e.viewStateKey), C = Zl({
          savedMode: B == null ? void 0 : B.mode,
          sourceViewOnly: S,
          viewportWidth: He()
        });
        h.current = C.auto ? C.mode : null, C.mode && C.mode !== e.mode && e.setModeKeepingPage(C.mode);
        return;
      }
      Yl(e.mode, h.current) && (h.current = null, Wt(e.viewStateKey, { mode: e.mode }));
    }
  }, [t.failed, t.loading, e.mode, e.setModeKeepingPage, e.viewStateKey, S]);
  const p = s || (e.mode === "compare" ? "compare" : "reading"), w = Ql(s, "markdown");
  Ii({
    mode: R,
    sourceOnly: e.sourceOnly,
    setMode: e.setModeKeepingPage,
    userZoom: e.userZoom,
    onZoomChange: e.onZoomChange,
    currentPage: e.currentPage,
    numPages: n.hudNumPages,
    goToPage: e.goToPage,
    enabled: e.showHud
  });
  const k = F(() => {
    c(null), l(null);
  }, []), _ = F((B) => {
    l(null);
    const C = bu(B, e.liveTranslationAvailable);
    C !== null && d(C), e.setModeKeepingPage(B);
  }, [e.liveTranslationAvailable, e.setModeKeepingPage]), O = q(() => b.sourcePaneToggle ? /* @__PURE__ */ y(
    "button",
    {
      type: "button",
      className: `reader-live-translation-toggle${u ? " is-active" : ""}`,
      onClick: () => d((B) => !B),
      "aria-pressed": u,
      title: u ? "隐藏实时译文" : "在原文 PDF 上叠加实时译文",
      children: "译文"
    }
  ) : null, [b.sourcePaneToggle, u]), x = F((B) => {
    c(B), l(null);
  }, []), [E] = L(eu), [P, T] = L(null), I = F((B) => T((C) => C === B ? null : B), []), N = F((B) => {
    e.jumpToAnchor({ block_id: B }), He() < 900 && T(null);
  }, [e.jumpToAnchor]), z = F((B) => e.jumpToAnchor({ block_id: B }), [e.jumpToAnchor]), H = F((B) => e.jumpToReference({ block_id: B }), [e.jumpToReference]), Z = q(() => ({
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
    regionHover: E,
    jumpToBlock: z,
    jumpToReference: H,
    referenceReturnAvailable: e.referenceReturnAvailable,
    restoreReferencePosition: e.restoreReferencePosition,
    revisedBlocks: e.revisedBlocks,
    sourceOnly: e.sourceOnly,
    sourceViewOnly: S,
    download: e.download,
    goToPage: e.goToPage,
    assistant: { select: x, close: k }
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
    E,
    z,
    H,
    e.referenceReturnAvailable,
    e.restoreReferencePosition,
    e.revisedBlocks,
    e.sourceOnly,
    S,
    e.download,
    e.goToPage,
    x,
    k
  ]), G = q(() => ({
    currentPage: e.currentPage,
    numPages: n.hudNumPages
  }), [e.currentPage, n.hudNumPages]), ae = [
    ds,
    `is-workspace-${p}`,
    g ? "is-assistant-open" : "",
    P ? "is-finder-open" : "",
    v.overlayOnSource ? "is-live-translation-overlay" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ y(lc, { value: Z, hud: G, children: /* @__PURE__ */ D("div", { className: ae, "data-reader-engine": "react-pdf", "data-reader-workspace": p, children: [
    /* @__PURE__ */ y(kl, { loading: t.loading, failed: t.failed, text: t.text, percent: t.percent, regionsError: !!o.readerErrors.regions, metadataError: !!o.readerErrors.metadata }),
    /* @__PURE__ */ y(mu, { open: P, onToggle: I }),
    P ? /* @__PURE__ */ y(
      hu,
      {
        tab: P,
        onTab: T,
        onClose: () => T(null),
        onJump: N
      }
    ) : null,
    /* @__PURE__ */ D("div", { className: "reader-chrome-tray", children: [
      /* @__PURE__ */ y(Fc, { active: s }),
      e.referenceReturnAvailable ? /* @__PURE__ */ y(
        De,
        {
          type: "button",
          variant: "secondary",
          size: "sm",
          className: "reader-reference-return",
          onClick: e.restoreReferencePosition,
          children: "返回引用前位置"
        }
      ) : null,
      /* @__PURE__ */ y(zl, {}),
      /* @__PURE__ */ y(_i, { onBeforeClose: o.prepareClose })
    ] }),
    /* @__PURE__ */ y(
      Dc,
      {
        mode: R,
        documentReady: !!o.jobId,
        sourceViewOnly: S,
        onModeChange: _,
        liveTranslation: b.topBarPill ? {
          visible: u,
          state: e.liveTranslation,
          onToggle: () => d((B) => !B)
        } : null
      }
    ),
    /* @__PURE__ */ y($c, { active: s }),
    g ? /* @__PURE__ */ y(Tl, {}) : null,
    /* @__PURE__ */ y(_c, { paneComposition: v, markdownSplit: w.open, assistantSplit: g, liveTranslation: e.liveTranslation, sourcePaneAction: O }),
    e.showHud ? /* @__PURE__ */ y(
      Vl,
      {
        mode: R,
        modeControls: null,
        bookmarkScope: e.viewStateKey
      }
    ) : null,
    /* @__PURE__ */ y(jo, { fallback: null, children: w.mounted ? /* @__PURE__ */ y(pu, { open: w.open, jobId: o.jobId, sourceOnly: e.sourceOnly, side: "right", onClose: k }) : null }),
    /* @__PURE__ */ y(Kl, {})
  ] }) });
}
function Du() {
  return /* @__PURE__ */ y(yu, {});
}
export {
  Du as R,
  yu as a,
  Ci as c,
  xu as d,
  wa as f,
  Ma as r,
  Fe as u
};
//# sourceMappingURL=ReaderApp-IPyTXbsl.js.map
