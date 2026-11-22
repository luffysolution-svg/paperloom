var Hn = (e) => {
  throw TypeError(e);
};
var Wn = (e, t, n) => t.has(e) || Hn("Cannot " + n);
var ut = (e, t, n) => (Wn(e, t, "read from private field"), n ? n.call(e) : t.get(e)), Vn = (e, t, n) => t.has(e) ? Hn("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, n), Jn = (e, t, n, r) => (Wn(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n);
import { jsxs as x, jsx as v, Fragment as Be } from "react/jsx-runtime";
import { useMemo as Y, useState as _, useEffect as z, useCallback as $, useRef as M, useLayoutEffect as Me, memo as bn, createContext as yn, useContext as vn, forwardRef as Do, useImperativeHandle as wn, useSyncExternalStore as zr, useId as Or, Suspense as xo, lazy as zo } from "react";
import { requireAdapter as ct, getReaderAdapters as ye } from "./adapters.js";
import { resolveReaderDownloadName as Oo, resolveReaderDownloadUrls as Fo, READER_PROGRESS_COPY as Ie, trimString as Lt, READER_DOWNLOAD_ACTIONS as $o, disabledReason as jo } from "./runtime/state.js";
import { r as Uo, b as Bo } from "./page-config-Ct7qR5rm.js";
import { documentSourcePdfPath as en, isFinishedJobStatus as Sn } from "@retainpdf/domain/job";
import { n as Ho, d as Wo, f as Vt, k as qn, b as Vo, c as Jo, j as Fr, p as Rn, g as tn, l as Gn, i as qo } from "./reader-regions-B6o2DsPy.js";
import { fetchDocumentReading as Go } from "@retainpdf/api/documents";
import { isReaderTransportError as Ko, createReaderTransportError as Zo } from "./contracts.js";
import { toast as nn, Toaster as Yo } from "sonner";
import { X as Pn, Radio as Xo, FileText as $r, Columns2 as jr, Languages as Ur, FileCode2 as Qo, Keyboard as ea, Download as ta, ChevronDown as na, ListTree as ra, Search as oa } from "lucide-react";
import { Button as $e, Input as aa } from "@retainpdf/ui";
import { pdfjs as Br, Page as sa, Document as ia } from "react-pdf";
import { e as ca, m as la, a as ua } from "./markdown-math-DN_X3M3x.js";
const da = (...e) => {
  var t, n;
  return ((n = (t = ye()) == null ? void 0 : t.isMockMode) == null ? void 0 : n.call(t, ...e)) ?? !1;
}, fa = "", ma = Object.freeze({
  progress: "retainpdf-reader-progress"
}), ha = (e) => {
  var t, n;
  return ((n = (t = ye()) == null ? void 0 : t.resolveResourceUrl) == null ? void 0 : n.call(t, e)) ?? e;
}, pa = (...e) => {
  var n;
  return (((n = ye()) == null ? void 0 : n.fetchProtected) ?? fetch)(...e);
}, Ee = () => ct("defaultReaderDataPort"), Kn = () => ct("defaultReaderPageConfigPort"), Iu = {
  get apiPrefix() {
    return Ee().apiPrefix;
  },
  fetchProtected: (...e) => Ee().fetchProtected(...e),
  loadMarkdownPayload: (e) => Ee().loadMarkdownPayload(e),
  loadMarkdownSource: (e) => Ee().loadMarkdownSource(e),
  loadMarkdownRange: (e, t, n, r, o) => Ee().loadMarkdownRange(e, t, n, r, o),
  loadJobPayload: (e) => Ee().loadJobPayload(e),
  loadReaderPayload: (e, t) => Ee().loadReaderPayload(e, t),
  loadReaderOptionalArtifacts: (e) => Ee().loadReaderOptionalArtifacts(e),
  get liveTranslation() {
    return Ee().liveTranslation;
  }
}, Hr = {
  messageTargetOrigin: () => Kn().messageTargetOrigin(),
  readerJobId: () => Kn().readerJobId()
}, ga = () => {
  var e;
  return ((e = ye()) == null ? void 0 : e.liveTranslation) ?? null;
}, gt = () => {
  var t;
  const e = ye();
  return (e == null ? void 0 : e.pdf) ?? {
    fetchProtected: (e == null ? void 0 : e.fetchProtected) ?? ((t = e == null ? void 0 : e.defaultReaderDataPort) == null ? void 0 : t.fetchProtected) ?? fetch,
    resolvePdfjsVendorUrl: (n = "") => {
      var r;
      return ((r = e == null ? void 0 : e.resolvePdfjsVendorUrl) == null ? void 0 : r.call(e, n)) ?? "";
    }
  };
}, jt = () => {
  const e = ye();
  if (e != null && e.sessionData) return e.sessionData;
  const t = e == null ? void 0 : e.defaultReaderDataPort;
  if (!t) throw new Error("Reader adapter missing: defaultReaderDataPort (call setReaderAdapters)");
  return {
    loadReaderPayload: t.loadReaderPayload,
    // 旧宿主 / 测试替身可能没有这个方法：缺了就是 undefined，session 照旧一并加载。
    loadReaderOptionalArtifacts: t.loadReaderOptionalArtifacts,
    loadJobPayload: t.loadJobPayload,
    fetchDocumentByJobId: (...n) => ct("fetchDocumentByJobId")(...n),
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
}, ba = (...e) => {
  var t, n;
  return ((n = (t = ye()) == null ? void 0 : t.resolveReaderAnchor) == null ? void 0 : n.call(t, ...e)) ?? null;
}, ya = () => {
  var e, t;
  return ((t = (e = ye()) == null ? void 0 : e.resolveReaderDocumentId) == null ? void 0 : t.call(e)) ?? "";
}, va = (...e) => {
  var t, n;
  return ((n = (t = ye()) == null ? void 0 : t.resolveReaderJobId) == null ? void 0 : n.call(t, ...e)) ?? "";
}, wa = (...e) => {
  var t, n;
  return ((n = (t = ye()) == null ? void 0 : t.resolveReaderDownloadName) == null ? void 0 : n.call(t, ...e)) ?? Oo(...e);
}, Sa = (...e) => {
  var t, n;
  return ((n = (t = ye()) == null ? void 0 : t.resolveReaderDownloadUrls) == null ? void 0 : n.call(t, ...e)) ?? Fo(...e);
}, Ra = (...e) => ct("downloadProtectedResource")(...e), Pa = (...e) => ct("failDownloadToast")(...e), Ia = (e, t) => ct("resolveMarkdownAssetUrl")(e, t), Zn = "/api/v1";
function Ea() {
  const e = () => {
    var r;
    return Uo(
      ((r = globalThis.location) == null ? void 0 : r.search) || ""
    );
  }, [t, n] = _(e);
  return z(() => {
    var c, i, l, u;
    const r = () => n(e()), o = (i = (c = globalThis.history) == null ? void 0 : c.pushState) == null ? void 0 : i.bind(globalThis.history), a = (u = (l = globalThis.history) == null ? void 0 : l.replaceState) == null ? void 0 : u.bind(globalThis.history);
    let s = !1;
    if (o && a)
      try {
        const d = (f) => function(...h) {
          const g = f.apply(this, h);
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
function Ta() {
  const e = Ea(), t = Y(() => va(Hr), [e]), n = Y(() => ya(), [e]), r = t || n ? `job:${t}|document:${n}` : `location:${e}`;
  return { locationKey: e, jobId: t, routeDocumentId: n, sessionIdentity: r };
}
function ka(e) {
  const {
    routeDocumentId: t,
    jobId: n,
    sessionIdentity: r,
    sessionIdentityRef: o,
    documentIdRef: a,
    sessionJobIdRef: s,
    switchToSourceMode: c
  } = e, [i, l] = _({
    documentId: "",
    jobId: ""
  }), [u, d] = _({
    documentId: "",
    jobId: ""
  }), f = i.documentId === t ? i.jobId : "", h = u.documentId === t ? u.jobId : "", g = n || f, [m, y] = _({
    jobId: "",
    documentId: ""
  }), b = m.jobId === g ? m.documentId : "", S = t || b, R = !!t && !g, [p, w] = _(null), T = (p == null ? void 0 : p.sessionIdentity) === r && p.documentId === S ? p : null, N = R || !!T, O = $((C) => {
    const P = `${C.documentId || ""}`.trim();
    if (!P || a.current && a.current !== P) return;
    if (!a.current && s.current)
      y({
        jobId: s.current,
        documentId: P
      });
    else if (!a.current)
      return;
    const I = `${C.revision || ""}`.trim() || `${Date.now()}`;
    w({
      documentId: P,
      revision: I,
      sessionIdentity: o.current
    }), c();
  }, []);
  z(() => {
    w((C) => C && C.sessionIdentity !== r ? null : C);
  }, [r]);
  const L = $((C) => {
    switch (C.type) {
      case "resolved-document-job":
        l({ documentId: C.documentId, jobId: C.jobId });
        break;
      case "cleared-resolved-document-job":
        l({ documentId: "", jobId: "" });
        break;
      case "missing-document-job":
        d({ documentId: C.documentId, jobId: C.jobId });
        break;
      case "resolved-job-document":
        y((P) => P.jobId === C.jobId && P.documentId === C.documentId ? P : { jobId: C.jobId, documentId: C.documentId });
        break;
      case "committed-source":
        w({
          documentId: C.documentId,
          revision: C.revision,
          sessionIdentity: C.sessionIdentity
        });
        break;
    }
  }, []);
  return {
    resolvedDocumentJob: i,
    setResolvedDocumentJob: l,
    missingDocumentJob: u,
    setMissingDocumentJob: d,
    documentJobId: f,
    rejectedDocumentJobId: h,
    sessionJobId: g,
    resolvedJobDocument: m,
    setResolvedJobDocument: y,
    jobDocumentId: b,
    documentId: S,
    sourceOnly: R,
    committedDocumentSource: p,
    setCommittedDocumentSource: w,
    activeCommittedDocumentSource: T,
    sourceViewOnly: N,
    refreshCommittedDocument: O,
    applyIdentityEvent: L
  };
}
function Yn(e) {
  return `${(e == null ? void 0 : e.status) || ""}`.trim().toLowerCase();
}
function Ma(e) {
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
function Xn(e, t) {
  return ha(en(e, t));
}
function Aa(e, t = "") {
  const n = `${e || ""}`.trim(), r = `${t || ""}`.trim();
  return !!(!n || r && (n === r || n === `${r}.pdf`) || /^\d{8,14}-[0-9a-f]{4,}$/i.test(n));
}
function Na(e, t) {
  var r;
  const n = [
    e == null ? void 0 : e.title,
    e == null ? void 0 : e.display_name,
    e == null ? void 0 : e.source_file_name,
    (r = e == null ? void 0 : e.book_summary) == null ? void 0 : r.source_file_name
  ];
  for (const o of n) {
    const a = `${o || ""}`.trim();
    if (a && !Aa(a, t))
      return a.replace(/\.pdf$/i, "");
  }
  return "";
}
function rn({
  percent: e,
  text: t,
  stage: n
}) {
  var r;
  try {
    (r = window.parent) == null || r.postMessage(
      {
        type: ma.progress,
        stage: n,
        percent: e,
        text: t
      },
      Hr.messageTargetOrigin()
    );
  } catch {
  }
}
function Ct(e, t, n, r = "progress") {
  e({
    loading: !0,
    percent: t,
    text: n,
    stage: r,
    failed: !1
  }), rn({ percent: t, text: n, stage: r });
}
function _a(e) {
  const {
    sessionJobId: t,
    sessionIdentity: n,
    sessionIdentityRef: r,
    sessionJobIdRef: o,
    sessionEpochRef: a,
    closingRef: s
  } = e, [c, i] = _(null), [l, u] = _(null), [d, f] = _(""), [h, g] = _(0), m = d === n ? c : null, y = d === n ? l : null, b = Yn(m), S = Sn(b), R = $(() => {
    g((L) => L + 1);
  }, []), p = $((L) => {
    i(L.jobPayload), u(L.manifestPayload), f(L.sessionIdentity);
  }, []), w = $((L) => {
    i(null), u(null), f(L);
  }, []), T = M(""), N = M(""), O = $(async () => {
    const L = o.current;
    if (!L || T.current === L) return;
    const C = jt().loadJobPayload;
    if (typeof C != "function") return;
    const P = a.current.value;
    T.current = L;
    try {
      const I = await C(L);
      if (s.current || a.current.value !== P || o.current !== L || !I || typeof I != "object")
        return;
      const E = Yn(I);
      i(I), f(r.current), E === "succeeded" && N.current !== L && (N.current = L, g((k) => k + 1));
    } catch {
    } finally {
      T.current === L && (T.current = "");
    }
  }, []);
  return z(() => {
    N.current = "";
  }, [n]), z(() => {
    if (!t || S || !m) return;
    const L = window.setInterval(() => {
      document.visibilityState !== "hidden" && O();
    }, 1e3);
    return () => window.clearInterval(L);
  }, [S, O, m, t]), {
    jobPayload: c,
    setJobPayload: i,
    manifestPayload: l,
    setManifestPayload: u,
    payloadSessionIdentity: d,
    setPayloadSessionIdentity: f,
    scopedJobPayload: m,
    scopedManifestPayload: y,
    jobStatus: b,
    jobTerminal: S,
    jobRefreshRevision: h,
    refreshJobArtifacts: R,
    refreshJobStatus: O,
    publishPayload: p,
    clearPayload: w
  };
}
function on(e) {
  document.body.classList.remove(
    "reader-mode-source",
    "reader-mode-translated",
    "reader-mode-compare"
  ), document.body.classList.add(`reader-mode-${e}`);
}
function La(e, t) {
  e(t), on(t);
}
function Ca(e) {
  const [t, n] = _(e ? "source" : "compare"), r = $((a) => {
    e && a !== "source" || (n(a), on(a));
  }, [e]), o = $((a) => {
    La(n, a);
  }, []);
  return z(() => (e && document.documentElement.classList.add("reader-source-only"), on(t), () => {
    document.documentElement.classList.remove("reader-source-only");
  }), [e, t]), { mode: t, setMode: r, setModeState: n, switchSessionMode: o };
}
function Qn(e) {
  return typeof e == "string" ? e.trim() : `${e ?? ""}`.trim();
}
function Da(e) {
  const t = (e == null ? void 0 : e.data) ?? e, n = t && typeof t == "object" ? t : {};
  return {
    activeJobId: Qn(n.active_job_id),
    activeVersionId: Qn(n.active_version_id)
  };
}
function xa(e) {
  const { link: t, rejectedDocumentJobId: n, hasCommittedSource: r } = e, o = t.activeJobId && t.activeJobId !== n && !t.activeJobId.startsWith("doc:") ? t.activeJobId : "";
  return o ? { kind: "follow-active-job", jobId: o, activeVersionId: t.activeVersionId } : t.activeVersionId && !r ? { kind: "open-committed-source", documentId: "", revision: t.activeVersionId } : { kind: "open-source-url" };
}
function za(e) {
  const {
    payloadDocumentId: t,
    linkedActiveJobId: n,
    linkedActiveVersionId: r,
    sessionJobId: o,
    hasCommittedSource: a
  } = e;
  return t && r && n === o && !a ? { kind: "restore-committed-source", documentId: t, revision: r } : { kind: "open-job-artifacts" };
}
function Oa(e) {
  return e.status === 404 && e.reason !== "not_ready" && !e.jobId && !!e.routeDocumentId && !!e.documentJobId && e.sessionJobId === e.documentJobId;
}
const Fa = /^merged-([0-9a-f]{64})-[0-9a-f]+$/;
function $a(e) {
  var t;
  return e.status !== 404 || e.reason !== "merged_reading_expired" ? "" : ((t = Fa.exec(`${e.sessionJobId || ""}`.trim())) == null ? void 0 : t[1]) || "";
}
const ja = 48 * 1024 * 1024;
function Ua(e) {
  return e ? "ranged" in e ? e : { data: e.data.slice() } : null;
}
const Ba = 2, he = /* @__PURE__ */ new Map();
function an(e, t) {
  he.delete(e), he.set(e, t);
}
function er(e) {
  if (he.size < Ba) return;
  const t = he.keys().next().value;
  t && he.delete(t);
}
async function Ha(e) {
  var t, n;
  if (typeof e.json != "function") return "";
  try {
    const r = await e.json(), o = (n = (t = r == null ? void 0 : r.error) == null ? void 0 : t.details) == null ? void 0 : n.reason;
    return typeof o == "string" ? o.trim() : "";
  } catch {
    return "";
  }
}
async function Wr(e, t = gt().fetchProtected, n = {}) {
  var u, d, f, h, g, m, y, b, S;
  const r = `${e || ""}`.trim();
  if (!r)
    return null;
  if (he.has(r)) {
    const R = he.get(r);
    return an(r, R), R;
  }
  const o = new AbortController(), a = () => o.abort();
  (u = n.signal) != null && u.aborted && o.abort(), (f = (d = n.signal) == null ? void 0 : d.addEventListener) == null || f.call(d, "abort", a, { once: !0 });
  let s;
  try {
    s = await t(r, { signal: o.signal });
  } finally {
    (g = (h = n.signal) == null ? void 0 : h.removeEventListener) == null || g.call(h, "abort", a);
  }
  if (!s.ok) {
    const R = new Error(`读取 PDF 失败 (${s.status})`);
    R.status = s.status;
    const p = await Ha(s);
    throw p && (R.reason = p), R;
  }
  const c = Wa(r, s, t);
  if (c) {
    o.abort();
    const R = { ranged: c };
    return er(), he.set(r, R), R;
  }
  (y = (m = n.signal) == null ? void 0 : m.addEventListener) == null || y.call(m, "abort", a, { once: !0 });
  let i;
  try {
    i = await s.arrayBuffer();
  } finally {
    (S = (b = n.signal) == null ? void 0 : b.removeEventListener) == null || S.call(b, "abort", a);
  }
  const l = { data: new Uint8Array(i) };
  return he.has(r) ? an(r, l) : (er(), he.set(r, l)), l;
}
function Wa(e, t, n) {
  const r = t.headers;
  if (!r || typeof r.get != "function") return null;
  const o = Number(r.get("content-length") || 0), a = `${r.get("accept-ranges") || ""}`.toLowerCase().includes("bytes"), s = `${r.get("content-encoding") || ""}`.trim();
  return !a || s || !Number.isFinite(o) || o < ja ? null : {
    url: e,
    length: o,
    async fetchRange(c, i) {
      const l = await n(e, { headers: { Range: `bytes=${c}-${i - 1}` } });
      if (l.status !== 206) throw new Error(`读取 PDF 片段失败 (${l.status})`);
      return new Uint8Array(await l.arrayBuffer());
    }
  };
}
const Va = { file: null, loading: !1, error: "" }, Ja = { file: null, loading: !0, error: "" };
function qa(e = "", t = null) {
  const n = `${e || ""}`.trim(), [r, o] = _(null);
  if (z(() => {
    if (t || !n) return;
    const s = he.get(n);
    if (s) {
      an(n, s);
      return;
    }
    const c = new AbortController();
    return Wr(n, void 0, { signal: c.signal }).then((i) => {
      c.signal.aborted || o({ url: n, file: i, loading: !1, error: "" });
    }).catch((i) => {
      c.signal.aborted || o({ url: n, file: null, loading: !1, error: (i == null ? void 0 : i.message) || String(i) });
    }), () => c.abort();
  }, [n, t]), t) return { file: t, loading: !1, error: "" };
  if (!n) return Va;
  if ((r == null ? void 0 : r.url) === n) return r;
  const a = he.get(n);
  return a ? { file: a, loading: !1, error: "" } : Ja;
}
function Ga(e) {
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
async function sn(e) {
  const { url: t, label: n, percentStart: r, percentEnd: o, fence: a, setBoot: s } = e;
  if (!t || a.isInactive())
    return null;
  Ct(s, r, n, "download");
  const c = await Wr(t, gt().fetchProtected, {
    signal: a.signal
  });
  return a.isInactive() ? null : (Ct(s, o, n, "download"), c);
}
async function Ka(e) {
  const { sourceFinal: t, translatedFinal: n, fence: r, setBoot: o } = e;
  Ct(o, 25, "正在下载 PDF…", "download");
  const a = [];
  let s = null, c = null;
  return t && a.push(
    sn({
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
    sn({
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
function Za(e, t, n) {
  const r = new URL(e);
  return n ? r.searchParams.set("job_id", n) : (r.searchParams.delete("job_id"), r.searchParams.set("document_id", t)), r.toString();
}
async function Ya({
  apiPrefix: e,
  documentId: t,
  expiredJobId: n,
  fetchReading: r = Go,
  location: o = globalThis.location
}) {
  let a;
  try {
    const s = await r(e, t);
    a = `${(s == null ? void 0 : s.job_id) || ""}`.trim() || null;
  } catch {
    return !1;
  }
  return a === n || !o ? !1 : (o.replace(Za(o.href, t, a)), !0);
}
const Tt = {
  regions: null,
  metadata: null
};
function Xa(e) {
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
    clearPayload: f,
    switchSessionMode: h,
    jobRefreshRevision: g,
    sessionEpochRef: m,
    closingRef: y,
    activeLoadAbortRef: b
  } = e, [S, R] = _(""), [p, w] = _(""), [T, N] = _(null), [O, L] = _(null), [C, P] = _(!1), [I, E] = _(""), [k, F] = _([]), [K, D] = _(!1), [q, B] = _(() => ({
    source: null,
    translated: null
  })), [V, ne] = _(
    Tt
  ), [me, re] = _({
    loading: !0,
    percent: 4,
    text: Ie.boot,
    stage: "progress",
    failed: !1
  });
  return z(() => {
    const oe = new AbortController(), j = m.current.value, U = Ga({
      sessionEpochRef: m,
      closingRef: y,
      abort: oe,
      sessionEpoch: j
    });
    b.current = oe;
    const Z = jt();
    if (y.current)
      return oe.abort(), () => {
        b.current === oe && (b.current = null);
      };
    let pe = !1;
    function ae(te, le) {
      U.markFailed(), D(!0), re({
        loading: !1,
        percent: 100,
        text: te,
        stage: "failed",
        failed: !0
      }), rn({ percent: 100, text: le, stage: "failed" });
    }
    function Re() {
      P(!0), pe || D(!0), re({
        loading: !1,
        percent: 100,
        text: Ie.ready,
        stage: "ready",
        failed: !1
      }), rn({ percent: 100, text: Ie.ready, stage: "ready" });
    }
    function Ae() {
      return l != null && l.documentId ? Xn(
        l.documentId,
        l.revision
      ) : da() ? fa : Z.resolveResourceUrl(en(r));
    }
    async function Pe() {
      var ue;
      let te = { activeJobId: "", activeVersionId: "" };
      try {
        const ie = await ((ue = Z.fetchDocument) == null ? void 0 : ue.call(Z, r));
        ie && (te = Da(ie));
      } catch {
      }
      const le = xa({
        link: te,
        rejectedDocumentJobId: a,
        hasCommittedSource: !!l
      });
      if (le.kind === "follow-active-job") {
        if (U.isInactive()) return;
        u({
          type: "resolved-document-job",
          documentId: r,
          jobId: le.jobId
        }), le.activeVersionId ? (l || u({
          type: "committed-source",
          documentId: r,
          revision: le.activeVersionId,
          sessionIdentity: i
        }), h("source")) : h("compare");
        return;
      }
      if (le.kind === "open-committed-source") {
        if (U.isInactive()) return;
        u({
          type: "committed-source",
          documentId: r,
          revision: le.revision,
          sessionIdentity: i
        }), h("source");
        return;
      }
      const ge = Ae();
      if (U.isInactive()) return;
      R(ge), w(""), E(""), f(i);
      const se = await sn({
        url: ge,
        label: "正在下载原文 PDF…",
        percentStart: 30,
        percentEnd: 85,
        fence: U,
        setBoot: re
      });
      if (!U.isInactive()) {
        if (!se) {
          ae("源文件不可用：该文档没有可读取的源 PDF。", "源文件下载失败");
          return;
        }
        N(se), Re();
      }
    }
    async function Ke() {
      var J;
      const te = !l, le = !!(te && Z.loadSessionSnapshot && Z.loadReaderOptionalArtifacts), ge = le ? Z.loadReaderOptionalArtifacts(t) : null, se = await ((J = Z.loadSessionSnapshot) == null ? void 0 : J.call(Z, {
        jobId: t,
        documentId: r,
        routeDocumentId: r,
        committedSource: l,
        includeOptionalArtifacts: te && !le
      })), ue = se ? {
        jobPayload: se.sourcePayload,
        manifestPayload: se.manifestPayload,
        readerMetadata: se.readerMetadata,
        regionsPayload: se.regions,
        readerErrors: se.readerErrors
      } : await Z.loadReaderPayload(t, {
        includeOptionalArtifacts: te
      });
      if (U.isInactive()) return;
      let ie = null;
      if (n && !r)
        if (se && se.linkedDocument !== void 0)
          ie = se.linkedDocument;
        else {
          try {
            ie = await Z.fetchDocumentByJobId(Zn, t);
          } catch {
          }
          if (U.isInactive()) return;
        }
      const Ye = Ma(ue.jobPayload) || `${(ie == null ? void 0 : ie.document_id) || ""}`.trim();
      Ye && !r && u({
        type: "resolved-job-document",
        jobId: t,
        documentId: Ye
      });
      const Xe = za({
        payloadDocumentId: Ye,
        linkedActiveJobId: `${(ie == null ? void 0 : ie.active_job_id) || ""}`.trim(),
        linkedActiveVersionId: `${(ie == null ? void 0 : ie.active_version_id) || ""}`.trim(),
        sessionJobId: t,
        hasCommittedSource: !!l
      });
      if (Xe.kind === "restore-committed-source") {
        if (U.isInactive()) return;
        u({
          type: "committed-source",
          documentId: Xe.documentId,
          revision: Xe.revision,
          sessionIdentity: i
        }), h("source");
        return;
      }
      const lt = Z.resolveReaderSourcePdf(ue.manifestPayload), Ht = Z.resolveReaderTranslatedPdfUrl(ue.jobPayload, ue.manifestPayload), Wt = typeof lt == "string" ? lt : Z.resolveReaderArtifactUrl(lt), Ne = r || Ye, _e = l != null && l.documentId ? Xn(
        l.documentId,
        l.revision
      ) : Wt || (Ne ? Z.resolveResourceUrl(en(Ne)) : ""), ze = l ? "" : Ht || "";
      R(_e || ""), w(ze), E(Na(ue.jobPayload, t)), d({
        jobPayload: ue.jobPayload || null,
        manifestPayload: ue.manifestPayload || null,
        sessionIdentity: i
      });
      const Pt = () => Ka({
        sourceFinal: _e || "",
        translatedFinal: ze,
        fence: U,
        setBoot: re
      }), It = !!(_e || ze), Qe = ge && It ? Pt() : null;
      Qe == null || Qe.catch(() => {
      });
      const Et = (W) => {
        U.isInactive() || (F(l ? [] : Ho(W.regionsPayload)), B(l ? { source: null, translated: null } : Wo(W.readerMetadata)), ne(l ? Tt : W.readerErrors ?? Tt), D(!0));
      };
      if (ge ? (pe = !0, ge.then(Et)) : Et(ue), !It) {
        ae(Ie.failed, Ie.failed);
        return;
      }
      const A = await (Qe ?? Pt());
      if (A.status !== "inactive") {
        if (A.status === "incomplete") {
          ae("PDF 下载失败，请重试", "PDF 下载失败");
          return;
        }
        N(A.sourceBytes), L(A.translatedBytes), Re();
      }
    }
    async function Ze() {
      P(!1), N(null), L(null), F([]), D(!1), B({ source: null, translated: null }), ne(Tt), Ct(re, 8, Ie.metadata, "metadata");
      try {
        if (s) {
          await Pe();
          return;
        }
        if (!t) {
          ae(Ie.failed, Ie.failed);
          return;
        }
        await Ke();
      } catch (te) {
        if (U.isClosedOrStale() || (te == null ? void 0 : te.name) === "AbortError") return;
        U.markFailed();
        const le = Number(te == null ? void 0 : te.status), ge = `${(te == null ? void 0 : te.reason) || ""}`, se = $a({ status: le, reason: ge, sessionJobId: t });
        if (se && (await Ya({
          apiPrefix: Zn,
          documentId: se,
          expiredJobId: t
        }) || U.isClosedOrStale()))
          return;
        if (Oa({
          status: le,
          reason: ge,
          jobId: n,
          routeDocumentId: r,
          documentJobId: o,
          sessionJobId: t
        })) {
          u({ type: "missing-document-job", documentId: r, jobId: t }), u({ type: "cleared-resolved-document-job" }), h("source");
          return;
        }
        const ue = te instanceof Error ? te.message : Ie.failed;
        ae(ue, ue);
      }
    }
    return Ze(), () => {
      oe.abort(), b.current === oe && (b.current = null);
    };
  }, [t, r, o, a, s, c, l, g, n, i, u, d, f, h]), {
    sourceUrl: S,
    translatedUrl: p,
    sourceFile: T,
    translatedFile: O,
    assetsReady: C,
    title: I,
    regions: k,
    regionsSettled: K,
    readerMetadata: q,
    readerErrors: V,
    boot: me
  };
}
function Qa() {
  const e = M(!1), t = M(null), { locationKey: n, jobId: r, routeDocumentId: o, sessionIdentity: a } = Ta(), s = M({ identity: "", value: 0 });
  s.current.identity !== a && (s.current = {
    identity: a,
    value: s.current.value + 1
  }, e.current = !1);
  const c = M(a), i = M(""), l = M(""), u = M(() => {
  }), d = $(() => u.current(), []), f = ka({
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
    sourceOnly: m,
    sourceViewOnly: y
  } = f, { mode: b, setMode: S, switchSessionMode: R } = Ca(y);
  u.current = () => {
    R("source");
  }, c.current = a, i.current = g, l.current = h;
  const p = _a({
    sessionJobId: h,
    sessionIdentity: a,
    sessionIdentityRef: c,
    sessionJobIdRef: l,
    sessionEpochRef: s,
    closingRef: e
  }), {
    scopedJobPayload: w,
    scopedManifestPayload: T,
    jobStatus: N,
    jobTerminal: O,
    jobRefreshRevision: L,
    refreshJobArtifacts: C,
    refreshJobStatus: P
  } = p, I = Xa({
    sessionJobId: h,
    jobId: r,
    routeDocumentId: o,
    documentJobId: f.documentJobId,
    rejectedDocumentJobId: f.rejectedDocumentJobId,
    sourceOnly: m,
    locationKey: n,
    sessionIdentity: a,
    committedSource: f.activeCommittedDocumentSource,
    applyIdentityEvent: f.applyIdentityEvent,
    publishPayload: p.publishPayload,
    clearPayload: p.clearPayload,
    switchSessionMode: R,
    jobRefreshRevision: L,
    sessionEpochRef: s,
    closingRef: e,
    activeLoadAbortRef: t
  }), E = $(() => {
    var F;
    e.current = !0, (F = t.current) == null || F.abort();
  }, []), k = Y(
    () => ({
      fetchProtected: jt().fetchProtected,
      jobId: h,
      jobPayload: w,
      manifestPayload: T,
      sourceUrl: I.sourceUrl,
      translatedUrl: I.translatedUrl,
      sourceOnly: y
    }),
    [h, w, T, I.sourceUrl, I.translatedUrl, y]
  );
  return {
    jobId: h,
    jobStatus: N,
    workflow: `${(w == null ? void 0 : w.workflow) || ""}`.trim().toLowerCase(),
    jobTerminal: O,
    documentId: g,
    sessionIdentity: a,
    sourceOnly: m,
    mode: b,
    setMode: S,
    sourceUrl: I.sourceUrl,
    translatedUrl: I.translatedUrl,
    sourceFile: I.sourceFile,
    translatedFile: I.translatedFile,
    assetsReady: I.assetsReady,
    boot: I.boot,
    title: I.title,
    regions: I.regions,
    regionsSettled: I.regionsSettled,
    readerMetadata: I.readerMetadata,
    readerErrors: I.readerErrors,
    download: k,
    refreshJobArtifacts: C,
    refreshJobStatus: P,
    refreshCommittedDocument: f.refreshCommittedDocument,
    prepareClose: E
  };
}
const es = 160, ts = 8, ns = 0;
function rs() {
  const e = M(null), [t, n] = _(null), [r, o] = _(ns), a = $((s) => {
    e.current = s, n(s);
  }, []);
  return z(() => {
    const s = t;
    if (!s || typeof ResizeObserver > "u")
      return;
    const c = (l) => {
      !Number.isFinite(l) || l < es || o((u) => Math.abs(u - l) < ts ? u : l);
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
function os(e) {
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
const Jt = { source: 0, translated: 0 };
function as(e, t) {
  const {
    mode: n,
    sourceOnly: r,
    assetsReady: o,
    sourceUrl: a,
    translatedUrl: s,
    sourceFile: c,
    translatedFile: i
  } = e, l = `${(t == null ? void 0 : t.identityKey) || ""}\0${a}\0${s}`, u = M(l);
  u.current = l;
  const [d, f] = _(() => ({
    identity: l,
    pages: Jt
  })), [h, g] = _(() => ({ identity: l, tick: 0 })), m = d.identity === l ? d.pages : Jt, y = h.identity === l ? h.tick : 0, b = os({
    mode: n,
    sourceOnly: r,
    assetsReady: o,
    hasSource: !!c || !!a,
    hasTranslated: !!i
  }), { primaryPane: S } = b, R = $((P, I) => {
    u.current === l && f((E) => {
      const k = E.identity === l ? E.pages : Jt;
      return k[I] === P && E.identity === l ? E : {
        identity: l,
        pages: { ...k, [I]: P }
      };
    });
  }, [l]), p = M(null), w = $(() => {
    p.current && clearTimeout(p.current);
    const P = l;
    p.current = setTimeout(() => {
      p.current = null, u.current === P && g((I) => ({
        identity: P,
        tick: I.identity === P ? I.tick + 1 : 1
      }));
    }, 60);
  }, [l]);
  z(() => (p.current && (clearTimeout(p.current), p.current = null), f((P) => P.identity === l && P.pages.source === 0 && P.pages.translated === 0 ? P : { identity: l, pages: { source: 0, translated: 0 } }), g((P) => P.identity === l && P.tick === 0 ? P : { identity: l, tick: 0 }), () => {
    p.current && (clearTimeout(p.current), p.current = null);
  }), [l]);
  const T = Y(
    () => Math.max(m.source, m.translated),
    [m]
  ), N = S === "translated" ? m.translated : m.source || m.translated, O = t == null ? void 0 : t.userZoom, L = t == null ? void 0 : t.shellWidth, C = `${l}-${y}-${O}-${n}-${m.source}-${m.translated}-${L}`;
  return {
    ...b,
    numPagesByPane: m,
    hudNumPages: T,
    primaryNumPages: N,
    metricsTick: y,
    onNumPages: R,
    onMetrics: w,
    rowSyncRevision: C
  };
}
const He = "data-reader-page", st = "data-reader-pane", In = "data-natural-height", ss = "reader-react-root", is = "reader-react-grid", cs = "reader-react-scroll-shell", ls = "reader-react-pdf-pane", Vr = "reader-react-pdf-page", Dt = "reader-react-pdf-page-placeholder", En = "reader-react-pdf-page-slot";
function xt(e, t) {
  const n = e != null ? `[${He}="${e}"]` : `[${He}]`;
  return t ? `${n}[${st}="${t}"]` : n;
}
function us() {
  return `.${En}[${He}]`;
}
function zt(e) {
  return Number(e.getAttribute(He));
}
const Jr = 0.25, Ot = 1, ds = 0.05, Rt = 0.5, fs = 16, ms = 8, hs = 720;
function Ue() {
  const e = typeof window > "u" ? NaN : Number(window.innerWidth);
  return Number.isFinite(e) && e > 0 ? e : Number.POSITIVE_INFINITY;
}
function qr(e) {
  return Number.isFinite(e) && e < hs;
}
function nt(e, t = Number.POSITIVE_INFINITY) {
  return qr(t) && (e === "source" || e === "translated") ? Ot : Rt;
}
function Ut(e) {
  return Number.isFinite(e) ? Math.min(Ot, Math.max(Jr, e)) : Rt;
}
function bt(e, t) {
  const n = Ut(Number(e) + t * ds);
  return Math.round(n * 100) / 100;
}
function ps(e) {
  return Math.round(Ut(e) * 100);
}
function gs(e) {
  const n = (Number(e) || 0) - fs - ms;
  return Math.max(160, Math.floor(n));
}
function bs(e, t = Rt) {
  const n = Ut(t);
  return gs((Number(e) || 0) * n);
}
function ys(e, t) {
  if (!e || !Number.isFinite(t) || t <= 0 || Math.abs(t - 1) < 1e-3)
    return;
  const n = e.scrollLeft + e.clientWidth / 2, r = e.scrollTop + e.clientHeight / 2, o = Array.from(
    e.querySelectorAll(`[${st}]`)
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
const vs = 8;
function ws(e, t) {
  return !Number.isFinite(e) || e < 80 || Math.abs(e - t) < vs ? "ignore" : !Number.isFinite(t) || t <= 0 ? "immediate" : "settle";
}
const Gr = 200, Kr = [
  "markdown"
], Ss = Kr;
function Zr(e) {
  return Ss.includes(e);
}
const Rs = "retainpdf:reader:view:v1:", tr = /* @__PURE__ */ new Set([
  "source",
  "translated",
  "markdown",
  "ai"
]), Ps = /* @__PURE__ */ new Set([
  "source",
  "compare",
  "translated"
]);
function Yr() {
  try {
    return typeof globalThis.localStorage > "u" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
function cn(e) {
  return `${e || ""}`.trim();
}
function Is({
  documentId: e,
  jobId: t
}) {
  const n = cn(e);
  if (n) return `document:${n}`;
  const r = cn(t);
  return r ? `job:${r}` : "";
}
function Xr(e) {
  const t = cn(e);
  return t ? `${Rs}${t}` : "";
}
function Es(e) {
  if (!e || typeof e != "object") return;
  const t = Math.floor(Number(e.page)), n = Number(e.fraction);
  if (!(!Number.isFinite(t) || t < 1 || !Number.isFinite(n)))
    return {
      page: t,
      fraction: Math.max(0, Math.min(1, n))
    };
}
function Ts(e) {
  if (e === null) return null;
  if (!e || typeof e != "object") return;
  const t = `${e.left || ""}`, n = `${e.right || ""}`;
  if (!(!tr.has(t) || !tr.has(n) || t === n))
    return { left: t, right: n };
}
function ks(e) {
  return e === null ? null : Zr(e) ? e : void 0;
}
function Ms(e) {
  return Ps.has(e) ? e : void 0;
}
function Qr(e) {
  if (!e || typeof e != "object") return null;
  const t = e;
  if (t.schema !== "retainpdf_reader_view_v1") return null;
  const n = Es(t.anchor), r = Number(t.zoom), o = Ms(t.mode), a = Ts(t.splitLayout), s = ks(t.assistantPanel);
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
function Se(e, t = Yr()) {
  const n = Xr(e);
  if (!n || !t) return null;
  try {
    const r = t.getItem(n);
    return r ? Qr(JSON.parse(r)) : null;
  } catch {
    return null;
  }
}
function Bt(e, t, n = Yr()) {
  const r = Xr(e);
  if (!r || !n) return null;
  const o = Se(e, n), a = Qr({
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
function As(e, t, n = "") {
  var f;
  const [r, o] = _(() => {
    var h;
    return ((h = Se(n)) == null ? void 0 : h.zoom) ?? nt(e, Ue());
  }), a = M(r), s = M(n);
  a.current = r;
  const c = M(1), i = M(((f = Se(n)) == null ? void 0 : f.zoom) !== void 0);
  z(() => {
    var m;
    if (s.current === n) return;
    s.current = n;
    const h = (m = Se(n)) == null ? void 0 : m.zoom;
    i.current = h !== void 0;
    const g = h ?? nt(e, Ue());
    c.current = 1, a.current = g, o(g);
  }, [e, n]), z(() => {
    if (i.current) return;
    const h = nt(e, Ue()), g = a.current;
    Math.abs(h - g) < 5e-4 || (c.current = 1, a.current = h, o(h));
  }, [e]);
  const l = $((h) => {
    const g = Ut(h), m = a.current;
    Math.abs(g - m) < 5e-4 || (c.current = g / (m || 1), i.current = !0, Bt(s.current, { zoom: g }), o(g));
  }, []), u = $((h) => {
    l(bt(a.current, h));
  }, [l]), d = $((h) => {
    l(nt(h));
  }, [l]);
  return Me(() => {
    const h = c.current;
    Math.abs(h - 1) < 1e-3 || (c.current = 1, ys(t == null ? void 0 : t.current, h));
  }, [r, t]), { userZoom: r, onZoomChange: l, stepZoom: u, resetZoom: d };
}
function Ns(e) {
  const { mode: t, setMode: n, beginModeSwitch: r } = e, o = M(t), a = M(n), s = M(r);
  return o.current = t, a.current = n, s.current = r, { setModeKeepingPage: $((i) => {
    i !== o.current && (s.current(), a.current(i));
  }, []) };
}
const Tn = 48;
function eo(e, t = Tn) {
  return e.getBoundingClientRect().top + t;
}
function to(e, t) {
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
  const o = zt(n);
  if (!Number.isFinite(o) || o < 1)
    return null;
  const a = n.getBoundingClientRect(), s = a.height > 0 ? a.height : 1, c = Math.min(1, Math.max(0, (t - a.top) / s));
  return { el: n, page: o, fraction: c };
}
function Nt(e, t, n = Tn) {
  if (!e)
    return null;
  const r = xt(void 0, t), o = Array.from(e.querySelectorAll(r));
  if (!o.length || e.getBoundingClientRect().height <= 0)
    return null;
  const s = eo(e, n), c = to(o, s);
  return c ? { page: c.page, fraction: c.fraction } : null;
}
function yt(e, t, n = "auto", r, o = Tn) {
  if (!e || !t)
    return !1;
  const a = Math.max(1, Math.floor(Number(t.page) || 1)), s = Math.min(1, Math.max(0, Number(t.fraction) || 0));
  let c = null;
  if (r && (c = e.querySelector(xt(a, r))), c || (c = e.querySelector(xt(a))), !c)
    return !1;
  const i = e.getBoundingClientRect(), l = c.getBoundingClientRect();
  if (i.height <= 0 || l.height < 8 && c.offsetHeight < 8)
    return !1;
  const u = l.height > 0 ? l.height : c.offsetHeight, d = e.scrollTop + (l.top - i.top), f = Math.max(0, d + s * u - o);
  return n === "auto" ? Math.abs(e.scrollTop - f) >= 1 && (e.scrollTop = f) : e.scrollTo({ top: f, behavior: n }), !0;
}
function _s(e, t, n = "smooth", r) {
  return yt(
    e,
    { page: t, fraction: 0 },
    n,
    r
  );
}
function ln(e, t, n) {
  const r = (n == null ? void 0 : n.behavior) ?? "auto", o = (n == null ? void 0 : n.delaysMs) ?? [0, 32, 120, 280];
  let a = !1, s = !1;
  const c = [], i = () => {
    var u;
    if (a) return;
    yt(
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
function Ls(e, t, n) {
  return ln(
    e,
    { page: t, fraction: 0 },
    n
  );
}
function Ft(e, t) {
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
function Cs(e, t, n = !0, r = "", o) {
  const [a, s] = _(1);
  return z(() => {
    if (!n || t <= 0) {
      s(1);
      return;
    }
    const c = e.current;
    if (!c)
      return;
    let i = !1, l = null, u = 0;
    const d = xt(void 0, o), f = () => {
      if (i) return;
      const m = Array.from(c.querySelectorAll(d));
      if (!m.length)
        return;
      const y = eo(c), b = to(m, y);
      b && s(b.page);
    }, h = () => {
      i || (u && cancelAnimationFrame(u), u = requestAnimationFrame(() => {
        u = 0, f();
      }));
    }, g = () => {
      if (i) return;
      if (!Array.from(c.querySelectorAll(d)).length) {
        l = setTimeout(g, 120);
        return;
      }
      f(), c.addEventListener("scroll", h, { passive: !0 });
    };
    return g(), () => {
      i = !0, l && clearTimeout(l), u && cancelAnimationFrame(u), c.removeEventListener("scroll", h);
    };
  }, [e, t, n, r, o]), a;
}
const Ds = `canvas, .react-pdf__Page, .${Vr}, .${Dt}`, nr = /* @__PURE__ */ new WeakMap();
function xs(e) {
  const t = Number(e.getAttribute(In));
  if (Number.isFinite(t) && t > 0)
    return t;
  let n = nr.get(e);
  if ((n == null || !n.isConnected) && (n = e.querySelector(Ds), nr.set(e, n)), n) {
    const o = n.getBoundingClientRect().height;
    if (Number.isFinite(o) && o > 0)
      return o;
  }
  const r = e.getBoundingClientRect().height;
  return Number.isFinite(r) && r > 0 ? r : 0;
}
function zs(e, t) {
  if (e.size !== t.size) return !1;
  for (const [n, r] of t)
    if (e.get(n) !== r) return !1;
  return !0;
}
function Os(e) {
  const t = /* @__PURE__ */ new Map();
  e.querySelectorAll(us()).forEach((r) => {
    const o = zt(r);
    if (!Number.isFinite(o) || o < 1) return;
    const a = xs(r);
    if (a <= 0) return;
    const s = t.get(o) || { height: 0, count: 0 };
    s.height = Math.max(s.height, a), s.count += 1, t.set(o, s);
  });
  const n = /* @__PURE__ */ new Map();
  return t.forEach((r, o) => {
    r.count >= 2 && r.height > 0 && n.set(o, Math.ceil(r.height));
  }), n;
}
function Fs(e, t, n = "", r) {
  const [o, a] = _(() => /* @__PURE__ */ new Map()), s = M(o), c = M(r);
  return c.current = r, Me(() => {
    if (!t) {
      s.current.size !== 0 && (s.current = /* @__PURE__ */ new Map(), a(s.current));
      return;
    }
    let i = !1, l = 0, u = !1, d = !1;
    const f = () => {
      var w;
      if (i) return;
      const R = e.current;
      if (!R) return;
      const p = Os(R);
      zs(s.current, p) || (s.current = p, a(p)), u && !d && (d = !0, (w = c.current) == null || w.call(c));
    }, h = () => {
      cancelAnimationFrame(l), l = requestAnimationFrame(() => {
        requestAnimationFrame(f);
      });
    };
    h();
    const g = window.setTimeout(h, 100), m = window.setTimeout(() => {
      u = !0, h();
    }, 300), y = window.setTimeout(h, 700), b = e.current;
    let S = null;
    return b && typeof ResizeObserver < "u" && (S = new ResizeObserver(() => h()), S.observe(b)), () => {
      i = !0, cancelAnimationFrame(l), window.clearTimeout(g), window.clearTimeout(m), window.clearTimeout(y), S == null || S.disconnect();
    };
  }, [e, t, n]), o;
}
const $s = [0, 48, 140, 320, 560], js = 700, Us = [80, 200, 400], Bs = 500, Hs = 50, Ws = /* @__PURE__ */ new Set([
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
]), Vs = 180, rr = [0, 48, 140, 320, 700, 1200];
function Js(e, t) {
  var I;
  const {
    primaryPane: n,
    mode: r,
    enabled: o = !0,
    persistenceKey: a = "",
    restoreReady: s = !0
  } = t, c = M(
    ((I = Se(a)) == null ? void 0 : I.anchor) || { page: 1, fraction: 0 }
  ), i = M(null), l = M(!1), u = M(r), d = M(null), f = M(null), h = M(null), g = M(null), m = M(a), y = M(""), b = M(n);
  b.current = n;
  const S = $(() => {
    var E;
    (E = d.current) == null || E.call(d), d.current = null, f.current != null && (clearTimeout(f.current), f.current = null);
  }, []), R = $(() => {
    !l.current && i.current == null || (S(), h.current != null && (clearTimeout(h.current), h.current = null), i.current = null, l.current = !1);
  }, [S]), p = $((E = !1) => {
    g.current != null && (clearTimeout(g.current), g.current = null);
    const k = () => {
      g.current = null, Bt(m.current, {
        anchor: be(c.current)
      });
    };
    E ? k() : g.current = setTimeout(k, Vs);
  }, []), w = $((E) => {
    c.current = be(E), i.current = null, h.current != null && clearTimeout(h.current), h.current = setTimeout(() => {
      h.current = null, l.current = !1;
    }, Hs);
  }, []);
  z(() => {
    if (!o)
      return;
    let E = !1, k = null, F = null, K = null;
    const D = () => {
      if (E) return;
      const q = e.current;
      if (!q) {
        K = setTimeout(D, 50);
        return;
      }
      k = q, F = () => {
        if (l.current)
          return;
        const B = Nt(k, b.current);
        B && (c.current = B, p());
      }, k.addEventListener("scroll", F, { passive: !0 }), l.current || F();
    };
    return D(), () => {
      E = !0, K != null && clearTimeout(K), k && F && k.removeEventListener("scroll", F);
    };
  }, [o, r, n, e, p]), z(() => {
    if (!o) return;
    const E = e.current;
    if (!E) return;
    const k = (F) => {
      F.metaKey || F.ctrlKey || F.altKey || Ws.has(F.key) && R();
    };
    return E.addEventListener("wheel", R, { passive: !0 }), E.addEventListener("touchmove", R, { passive: !0 }), window.addEventListener("keydown", k), () => {
      E.removeEventListener("wheel", R), E.removeEventListener("touchmove", R), window.removeEventListener("keydown", k);
    };
  }, [o, e, R]), Me(() => {
    var k;
    if (m.current === a) return;
    p(!0), S(), h.current != null && (clearTimeout(h.current), h.current = null), m.current = a, y.current = "";
    const E = (k = Se(a)) == null ? void 0 : k.anchor;
    c.current = E ? be(E) : { page: 1, fraction: 0 }, i.current = null, l.current = !!a, u.current = r;
  }, [a, r, p, S]), z(() => {
    var k;
    if (!o || !s || !a || y.current === a) return;
    y.current = a;
    const E = be(
      ((k = Se(a)) == null ? void 0 : k.anchor) || { page: 1, fraction: 0 }
    );
    return c.current = E, i.current = E, l.current = !0, S(), d.current = ln(
      () => e.current,
      E,
      {
        behavior: "auto",
        pane: b.current,
        delaysMs: rr,
        onDone: () => w(E)
      }
    ), f.current = setTimeout(() => {
      f.current = null, w(E);
    }, Math.max(...rr) + 160), () => S();
  }, [o, s, a, e, w, S]), z(() => {
    if (u.current === r)
      return;
    if (u.current = r, !o) {
      l.current = !1, i.current = null, S();
      return;
    }
    const E = i.current ? be(i.current) : be(c.current);
    return l.current = !0, i.current = E, c.current = E, S(), d.current = ln(
      () => e.current,
      E,
      {
        behavior: "auto",
        pane: n,
        // 等页宽/行高同步后再钉；同一 locked 幂等，不会越滚越远
        delaysMs: $s,
        onDone: () => w(E)
      }
    ), f.current = setTimeout(() => {
      f.current = null, w(E);
    }, js), () => {
      S();
    };
  }, [r, o, n, e, w, S]), z(() => () => {
    S(), h.current != null && (clearTimeout(h.current), h.current = null), p(!0);
  }, [S, p]);
  const T = $(() => {
    const E = Nt(
      e.current,
      b.current
    );
    return be(E || c.current);
  }, [e]), N = $(() => {
    l.current = !0;
    const E = Nt(
      e.current,
      b.current
    ), k = be(E ?? c.current);
    return c.current = k, i.current = k, p(), k;
  }, [e, p]), O = $((E, k, F) => {
    const K = F || b.current, D = Ft(E, k || 1), q = { page: D, fraction: 0 };
    c.current = q, l.current = !0, i.current = q, p(), S(), _s(e.current, D, "smooth", K), d.current = Ls(
      () => e.current,
      D,
      {
        behavior: "auto",
        pane: K,
        delaysMs: Us,
        onDone: () => w(q)
      }
    ), f.current = setTimeout(() => {
      f.current = null, w(q);
    }, Bs);
  }, [e, w, S, p]), L = $(() => be(c.current), []), C = $(() => l.current, []), P = $(() => {
    if (!l.current || !i.current)
      return;
    const E = be(i.current);
    yt(
      e.current,
      E,
      "auto",
      b.current
    );
  }, [e]);
  return {
    lockFromShell: T,
    beginModeSwitch: N,
    goToPage: O,
    getAnchor: L,
    isRestoring: C,
    repinIfRestoring: P
  };
}
function qs(e, t) {
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
function no(e, t, n) {
  const r = `${(n == null ? void 0 : n.jobId) || ""}`.trim(), o = `${(n == null ? void 0 : n.documentId) || ""}`.trim(), a = `j:${r}:d:${o}`;
  return t == null ? `${a}:none:${(e == null ? void 0 : e.blockId) || ""}` : `${a}:p:${t}:b:${(e == null ? void 0 : e.blockId) || ""}`;
}
const Gs = [0, 80, 200, 400, 800], Ks = 120, Zs = 400;
function Ys(e, t, n) {
  const { enabled: r, numPages: o, goToPage: a, resolveBlockPage: s, onAnchorApplied: c, jobId: i, documentId: l, regionsSettled: u = !0 } = e, d = M(a);
  d.current = a;
  const f = M(s);
  f.current = s;
  const h = M(c);
  h.current = c;
  const g = M(n);
  g.current = n, z(() => {
    var p, w;
    if (!r || !Number.isFinite(o) || o < 1)
      return;
    const m = ba(), y = qs(m, f.current);
    if (y == null && (m != null && m.blockId) && !u) return;
    const b = no(m, y, { jobId: i, documentId: l });
    if (t.current === b)
      return;
    if (y == null) {
      t.current = b, (p = g.current) == null || p.call(g);
      return;
    }
    t.current = b, m && ((w = h.current) == null || w.call(h, m, y));
    const S = [];
    let R = 0;
    for (const T of Gs)
      R = Math.max(R, T), S.push(
        setTimeout(() => {
          d.current(y);
        }, T)
      );
    return S.push(
      setTimeout(() => {
        var T;
        (T = g.current) == null || T.call(g);
      }, R + Ks)
    ), () => {
      for (const T of S) clearTimeout(T);
    };
  }, [r, o, i, l, t, u]);
}
function Xs(e) {
  var a;
  const t = globalThis.window;
  if (!t || typeof ((a = t.history) == null ? void 0 : a.replaceState) != "function") return;
  const n = t.location, r = `${e || ""}`, o = `${n.pathname}${r ? `?${r}` : ""}${n.hash || ""}`;
  t.history.replaceState(null, "", o);
}
function Qs(e, t, n) {
  const {
    syncEnabled: r,
    currentPage: o,
    resolveBlockPage: a,
    syncDebounceMs: s = Zs,
    jobId: c,
    documentId: i,
    applyReaderSearch: l
  } = e, u = M(a);
  u.current = a;
  const d = M(l);
  d.current = l;
  const f = M(0);
  z(() => {
    if (!n || !r || !t.current || !Number.isFinite(o) || o < 1 || f.current === o) return;
    const h = setTimeout(() => {
      var b;
      const g = ((b = globalThis.location) == null ? void 0 : b.search) || "", m = Bo(g, o, u.current);
      if (f.current = o, m === null) return;
      const y = `${new URLSearchParams(m).get("block_id") || ""}`.trim();
      t.current = no(
        { blockId: y },
        o,
        { jobId: c, documentId: i }
      ), (d.current || Xs)(m);
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
function ei(e) {
  const t = M(""), [n, r] = _(!1), o = $(() => r(!0), []), a = {
    enabled: e.enabled,
    numPages: e.numPages,
    goToPage: e.goToPage,
    resolveBlockPage: e.resolveBlockPage,
    onAnchorApplied: e.onAnchorApplied,
    jobId: e.jobId,
    documentId: e.documentId,
    regionsSettled: e.regionsSettled
  };
  Ys(a, t, o), Qs(e, t, n);
}
const dt = {
  layoutByPage: /* @__PURE__ */ new Map(),
  pagesByPage: /* @__PURE__ */ new Map(),
  lastSeq: 0,
  connection: "idle",
  jobStatus: "",
  error: ""
};
function ti(e) {
  return new Map(((e == null ? void 0 : e.pages) || []).map((t) => [t.page_idx, t]));
}
function or(e, t) {
  return e.attempt !== t.attempt ? e.attempt < t.attempt ? -1 : 1 : e.generation !== t.generation ? e.generation < t.generation ? -1 : 1 : 0;
}
function ro(e, t, n) {
  if (n.page_idx !== t.page_idx) return "retry";
  const r = or(n, t);
  if (r < 0 || r === 0 && n.page_hash !== t.page_hash) return "retry";
  if (!e) return "accept";
  const o = or(n, e);
  return o < 0 || o === 0 && n.page_hash === e.pageHash ? "ignore" : "accept";
}
function ni(e, t, n) {
  if (t.seq <= e.lastSeq) return e;
  const r = e.pagesByPage.get(t.page_idx), o = ro(r, t, n);
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
function ri(e) {
  const { hasOverlayContent: t, connection: n, showSource: r } = e;
  return {
    topBarPill: t && n !== "terminal",
    sourcePaneToggle: t && r,
    // 和 resolveReaderPaneComposition 的 overlayOnSource 同一套条件，外加
    // 「源文栏得在台面上」——否则叠层没有落脚的地方。
    overlayRenderable: t && r && e.liveTranslationVisible && !e.assistantOpen
  };
}
const ar = [250, 500, 1e3, 2e3, 4e3], qt = [80, 160, 320, 640, 1e3, 1500], sr = [250, 500, 1e3, 2e3, 4e3, 5e3];
function un(e, t) {
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
function kn(e) {
  return Ko(e) ? `${e.code || ""}`.trim() : "";
}
function kt(e, t) {
  const n = kn(e);
  return n === "LIVE_TRANSLATION_PAGE_NOT_COMMITTED" ? "尚未收到可显示的页面译文" : n === "LIVE_TRANSLATION_LAYOUT_NOT_READY" ? "正在等待 OCR 版面数据" : `${(e == null ? void 0 : e.message) || ""}`.trim() || t;
}
async function oi(e, t, n, r, o) {
  let a = null;
  for (let s = 0; ; s += 1) {
    try {
      const i = await o.fetchPage(e, t.page_idx, { signal: r });
      if (ro(n.pagesByPage.get(t.page_idx), t, i) !== "retry")
        return i;
      a = Zo(
        "Authoritative page snapshot has not reached the event generation",
        409,
        "LIVE_TRANSLATION_SNAPSHOT_UNAVAILABLE"
      );
    } catch (i) {
      if ((i == null ? void 0 : i.name) === "AbortError") throw i;
      a = i;
      const l = kn(i);
      if (l && ![
        "LIVE_TRANSLATION_PAGE_NOT_COMMITTED",
        "LIVE_TRANSLATION_SNAPSHOT_UNAVAILABLE"
      ].includes(l)) throw i;
    }
    const c = qt[Math.min(s, qt.length - 1)];
    if (await un(c, r), s >= qt.length + 2) throw a;
  }
}
function ai({
  jobId: e,
  jobStatus: t,
  enabled: n,
  liveTranslationPort: r = void 0
}) {
  const [o, a] = _(dt), s = M(o), c = M("");
  s.current = o;
  const i = `${e || ""}`.trim(), l = `${t || ""}`.trim().toLowerCase(), u = Sn(l) ? l : "";
  return z(() => {
    if (!n || !i) {
      c.current = "", s.current = dt, a(dt);
      return;
    }
    const d = r === void 0 ? ga() : r, f = c.current === i;
    if (c.current = i, !d) {
      const R = {
        ...f ? s.current : dt,
        connection: u ? "terminal" : "unavailable",
        jobStatus: l,
        error: "实时译文暂不可用"
      };
      s.current = R, a(R);
      return;
    }
    const h = new AbortController();
    let g = !1;
    const m = {
      ...f ? s.current : dt,
      connection: u ? "terminal" : "connecting",
      jobStatus: l,
      error: ""
    };
    s.current = m, a(m);
    const y = (R) => {
      h.signal.aborted || a((p) => {
        const w = R(p);
        return s.current = w, w;
      });
    }, b = async () => {
      let R = 0;
      for (; !h.signal.aborted; )
        try {
          const p = await d.fetchLayout(i, { signal: h.signal });
          g = !0, y((w) => ({
            ...w,
            layoutByPage: ti(p),
            jobStatus: l,
            error: ""
          }));
          return;
        } catch (p) {
          if ((p == null ? void 0 : p.name) === "AbortError") return;
          const w = kn(p);
          if (!(w === "LIVE_TRANSLATION_LAYOUT_NOT_READY" || !w)) {
            y((N) => ({
              ...N,
              connection: u ? "terminal" : "unavailable",
              jobStatus: l,
              error: kt(p, "实时译文暂不可用")
            }));
            return;
          }
          if (u) {
            y((N) => ({
              ...N,
              connection: "terminal",
              jobStatus: l,
              error: ""
            }));
            return;
          }
          y((N) => ({
            ...N,
            connection: "connecting",
            jobStatus: l,
            error: kt(p, "正在等待 OCR 版面数据")
          })), await un(ar[Math.min(R, ar.length - 1)], h.signal).catch(() => {
          }), R += 1;
        }
    };
    return (async () => {
      if (await b(), !g || h.signal.aborted) return;
      let R = 0;
      for (; !h.signal.aborted; ) {
        u || y((p) => ({
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
                w = await oi(
                  i,
                  p,
                  s.current,
                  h.signal,
                  d
                );
              } catch (T) {
                if ((T == null ? void 0 : T.name) === "AbortError" || h.signal.aborted) throw T;
                y((N) => ({
                  ...N,
                  lastSeq: Math.max(N.lastSeq, p.seq),
                  error: kt(T, "部分页面的实时译文暂时取不到")
                }));
                return;
              }
              y((T) => {
                const N = ni(T, p, w);
                return u ? {
                  ...N,
                  connection: "terminal",
                  jobStatus: l
                } : {
                  ...N,
                  jobStatus: l
                };
              }), R = 0;
            }
          });
        } catch (p) {
          if ((p == null ? void 0 : p.name) === "AbortError" || h.signal.aborted) return;
          y((w) => ({
            ...w,
            connection: u ? "terminal" : "reconnecting",
            jobStatus: l,
            error: kt(p, "实时译文连接已中断，正在重连")
          }));
        }
        if (h.signal.aborted) return;
        if (u) {
          y((p) => ({
            ...p,
            connection: "terminal",
            jobStatus: l
          }));
          return;
        }
        await un(sr[Math.min(R, sr.length - 1)], h.signal).catch(() => {
        }), R += 1;
      }
    })(), () => h.abort();
  }, [n, r, i, u]), o;
}
function si(e) {
  const t = e && typeof e == "object" ? e : {}, n = t.data && typeof t.data == "object" ? t.data : t, r = Array.isArray(n.groups) ? n.groups : [], o = /* @__PURE__ */ new Map();
  for (const a of r) {
    const s = a || {}, c = `${s.value ?? ""}`.trim(), i = Number(s.count) || 0;
    c && i > 0 && o.set(c, i);
  }
  return o;
}
function ii(e, t = !0) {
  const [n, r] = _(() => /* @__PURE__ */ new Map());
  return z(() => {
    r((c) => c.size ? /* @__PURE__ */ new Map() : c);
    const o = `${e || ""}`.trim();
    if (!t || !o) return;
    const a = jt().fetchRevisionGroups;
    if (!a) return;
    let s = !1;
    return a(o).then((c) => {
      !s && c && r(si(c));
    }).catch(() => {
    }), () => {
      s = !0;
    };
  }, [e, t]), n;
}
const ci = 4500;
function li(e) {
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
const ui = /* @__PURE__ */ new Set(["book", "translate"]);
function oo(e) {
  return !!(e.jobId && e.sourceUrl && ui.has(e.workflow));
}
function di(e) {
  return !!(oo(e) && !(e.jobStatus === "succeeded" && e.translatedUrl));
}
function fi() {
  const e = Qa(), t = oo({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    workflow: e.workflow
  }), n = di({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    translatedUrl: e.translatedUrl,
    jobStatus: e.jobStatus,
    workflow: e.workflow
  }), r = M({ jobId: "", running: !1 });
  r.current.jobId !== e.jobId && (r.current = { jobId: e.jobId, running: !1 });
  const o = `${e.jobStatus || ""}`.trim().toLowerCase();
  o && !Sn(o) && (r.current.running = !0);
  const a = ai({
    jobId: e.jobId,
    jobStatus: e.jobStatus,
    enabled: t && (n || r.current.running)
  }), { shellRef: s, shellEl: c, shellWidth: i, bindShell: l } = rs(), u = ii(e.jobId, !e.sourceOnly), d = Is({
    documentId: e.documentId,
    jobId: e.jobId
  }), f = `${d}\0${e.jobId}\0${e.sourceUrl}\0${e.translatedUrl}`, { userZoom: h, onZoomChange: g } = As(e.mode, s, d), m = as(
    {
      mode: e.mode,
      sourceOnly: e.sourceOnly,
      assetsReady: e.assetsReady,
      sourceUrl: e.sourceUrl,
      translatedUrl: e.translatedUrl,
      sourceFile: e.sourceFile,
      translatedFile: e.translatedFile
    },
    { userZoom: h, shellWidth: i, identityKey: f }
  ), {
    beginModeSwitch: y,
    goToPage: b,
    repinIfRestoring: S
  } = Js(s, {
    primaryPane: m.primaryPane,
    mode: e.mode,
    enabled: !e.boot.loading,
    persistenceKey: d,
    restoreReady: m.primaryNumPages > 0
  });
  z(() => {
    S();
  }, [i, S]);
  const R = Fs(
    s,
    m.compareMode,
    m.rowSyncRevision,
    S
  ), p = Cs(
    s,
    m.primaryNumPages,
    !e.boot.loading,
    `${e.mode}-${h}-${m.metricsTick}`,
    m.primaryPane
  ), w = $((D, q) => {
    var V, ne;
    const B = Math.max(
      Number(m.hudNumPages) || 0,
      Number(m.primaryNumPages) || 0,
      Number((V = m.numPagesByPane) == null ? void 0 : V.source) || 0,
      Number((ne = m.numPagesByPane) == null ? void 0 : ne.translated) || 0
    );
    b(D, B, q);
  }, [b, m.hudNumPages, m.primaryNumPages, m.numPagesByPane]), [T, N] = _(null), O = M(null), L = $((D) => {
    O.current && clearTimeout(O.current), N(D), D && (O.current = setTimeout(() => N(null), ci));
  }, []);
  z(() => () => {
    O.current && clearTimeout(O.current);
  }, []);
  const C = $((D) => {
    const q = Vt(e.regions, D);
    return q ? qn(q, m.primaryPane).page : null;
  }, [e.regions, m.primaryPane]), P = $((D, q) => {
    const B = q || m.primaryPane, V = typeof D == "object" && D ? `${D.block_id || ""}`.trim() : "", ne = typeof D == "object" && D ? `${D.image_url || ""}`.trim() : "", me = typeof D == "object" && D ? D.page_idx != null ? Number(D.page_idx) + 1 : D.page != null ? Number(D.page) : null : typeof D == "number" ? D + 1 : null, re = Vo(e.regions, ne, me) || Vt(e.regions, V) || (typeof D == "object" ? Jo(e.regions, D) : null);
    let oe = re ? qn(re, B).page : null;
    oe == null && (oe = li(D)), !(oe == null || oe < 1) && (L(re), w(oe, B));
  }, [L, w, m.primaryPane, e.regions]);
  ei({
    enabled: !e.boot.loading && !e.boot.failed && e.assetsReady,
    syncEnabled: !e.boot.loading && !e.boot.failed && e.assetsReady,
    numPages: m.hudNumPages || 0,
    currentPage: p,
    goToPage: w,
    resolveBlockPage: C,
    jobId: e.jobId,
    documentId: e.documentId,
    regionsSettled: e.regionsSettled,
    onAnchorApplied: (D) => {
      L(Vt(e.regions, D.blockId));
    }
  });
  const { setModeKeepingPage: I } = Ns({
    mode: e.mode,
    setMode: e.setMode,
    beginModeSwitch: y
  });
  z(() => {
    L(null);
  }, [f, L]);
  const E = !e.boot.loading && !e.boot.failed, k = Y(() => ({ bindShell: l, shellEl: c, shellWidth: i, shellRef: s }), [l, c, i, s]), F = Y(() => ({
    sourceUrl: e.sourceUrl,
    translatedUrl: e.translatedUrl,
    sourceFile: e.sourceFile,
    translatedFile: e.translatedFile
  }), [e.sourceUrl, e.translatedUrl, e.sourceFile, e.translatedFile]), K = Y(() => ({
    session: e,
    boot: e.boot,
    sourceOnly: e.sourceOnly,
    mode: e.mode,
    userZoom: h,
    onZoomChange: g,
    shell: k,
    panes: m,
    sessionFiles: F,
    rowHeights: R,
    goToPage: w,
    activeRegion: T,
    jumpToAnchor: P,
    setModeKeepingPage: I,
    download: e.download,
    showHud: E,
    viewStateKey: d,
    liveTranslation: a,
    liveTranslationAvailable: n,
    revisedBlocks: u
  }), [e, k, m, F, R, w, T, P, I, E, h, g, d, a, n, u]);
  return Y(() => ({
    ...K,
    currentPage: p
  }), [K, p]);
}
const mi = [
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
], hi = [
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
function pi(e) {
  const t = e.length === 1 ? e.toLowerCase() : e;
  for (const n of mi)
    if (n.keys.some(
      (o) => o.length === 1 ? o === t : o === e
    )) return n;
  return null;
}
function gi(e) {
  if (!(e instanceof HTMLElement))
    return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
const bi = ".reader-notes-panel";
function yi(e) {
  return e instanceof Element ? !!e.closest(bi) : !1;
}
function vi(e) {
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
  z(() => {
    if (!l)
      return;
    const u = (d) => {
      if (d.defaultPrevented || d.metaKey || d.ctrlKey || d.altKey || gi(d.target) || yi(d.target))
        return;
      const f = d.key, h = pi(f);
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
              a(bt(o, 1));
              return;
            case "zoom-out":
              a(bt(o, -1));
              return;
            case "zoom-reset":
              a(nt(t, Ue()));
              return;
            case "next-page":
              i(Ft(s + 1, c));
              return;
            case "prev-page":
              i(Ft(s - 1, c));
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
const wi = "retainpdf:soft-reader-close";
function Si() {
  return new URL("./index.html", window.location.href).href;
}
function Ri() {
  if (typeof window > "u" || window.self === window.top) return !1;
  try {
    return window.parent.postMessage(
      { type: wi },
      window.location.origin
    ), !0;
  } catch {
    return !1;
  }
}
function Pi(e, t, n) {
  if (n <= 1 || !e) return !1;
  try {
    const r = new URL(t), o = new URL(e, r);
    return o.origin === r.origin && !/reader\.html$/i.test(o.pathname) && !/detail\.html$/i.test(o.pathname);
  } catch {
    return !1;
  }
}
function Ii() {
  if (!(typeof window > "u") && !Ri()) {
    if (Pi(
      document.referrer,
      window.location.href,
      window.history.length
    )) {
      window.history.back();
      return;
    }
    window.location.assign(Si());
  }
}
function Ei({
  id: e,
  className: t,
  label: n,
  pressed: r,
  onClick: o,
  children: a
}) {
  return /* @__PURE__ */ v("button", { id: e, type: "button", className: t, "aria-label": n, title: n, "aria-pressed": r, onClick: o, children: a });
}
function Ti({ onBeforeClose: e } = {}) {
  return /* @__PURE__ */ x(Ei, { id: "reader-close-home-btn", className: "reader-close-home-btn", label: "返回主页", onClick: () => {
    e == null || e(), Ii();
  }, children: [
    /* @__PURE__ */ v(Pn, { className: "reader-close-home-icon", size: 18, strokeWidth: 2.25, "aria-hidden": !0 }),
    /* @__PURE__ */ v("span", { className: "reader-close-home-label", children: "关闭" })
  ] });
}
let ir = !1;
function ki() {
  if (ir)
    return;
  const e = gt().resolvePdfjsVendorUrl("build/pdf.worker.mjs");
  e && (Br.GlobalWorkerOptions.workerSrc = e, ir = !0);
}
async function Mi(e) {
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
const Ai = /* @__PURE__ */ new Set(["text", "formula", "table", "figure"]);
function Ni(e, t, n) {
  return e.flatMap((r) => {
    if (!Ai.has(Fr(r.region))) return [];
    const o = Rn(r, t, n);
    return o ? [{ itemId: r.itemId, highlight: r, rect: o }] : [];
  });
}
function cr(e, t, n) {
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
const Oe = "reader-text-hover-copy", _i = "reader-text-hover-id", ao = "reader-text-hover-tools";
function Le({
  className: e,
  state: t,
  label: n,
  title: r,
  onClick: o,
  children: a
}) {
  return /* @__PURE__ */ v(
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
function Li(e) {
  const t = e.assetUrls[0] || e.assetIds[0] || "";
  if (!t) return "";
  try {
    return Ia("", t);
  } catch {
    return t;
  }
}
async function Mn(e) {
  const t = await pa(e);
  if (!t.ok) throw new Error(`图片加载失败（${t.status}）`);
  return t.blob();
}
async function Ci(e) {
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
async function Di(e) {
  var n;
  if (!e || !((n = navigator.clipboard) != null && n.write) || typeof ClipboardItem > "u") return !1;
  const t = await Ci(await Mn(e));
  return await navigator.clipboard.write([new ClipboardItem({ "image/png": t })]), !0;
}
async function xi(e) {
  const t = URL.createObjectURL(await Mn(e)), n = document, r = n.createElement("div");
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
async function zi(e) {
  const t = URL.createObjectURL(await Mn(e)), n = document.createElement("a");
  n.href = t, n.download = "paperloom-image", n.click(), window.setTimeout(() => URL.revokeObjectURL(t), 6e4);
}
function Oi(e) {
  if (typeof DOMParser > "u" || !/<table(?:\s|>)/i.test(e)) return [];
  const t = new DOMParser().parseFromString(e, "text/html").querySelector("table");
  return t ? [...t.rows].map((n) => [...n.cells].map((r) => {
    var o;
    return ((o = r.textContent) == null ? void 0 : o.replace(/\s+/g, " ").trim()) || "";
  })) : [];
}
function Fi(e) {
  const t = Oi(e);
  if (t.length) return t;
  const n = e.trim().split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  return n.length ? n.some((r) => r.includes("|")) ? n.filter((r) => !/^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/.test(r)).map((r) => r.replace(/^\|\s*/, "").replace(/\s*\|$/, "").split("|").map((o) => o.trim())) : n.some((r) => r.includes("	")) ? n.map((r) => r.split(/\t+/).map((o) => o.trim())) : n.map((r) => [r]) : [];
}
function $i(e) {
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
function Gt(e, t, n) {
  const r = t === "translated" ? e.translated : e.source, o = e.markdown.trim() || r.text.trim();
  if (n === "text") return tn(e, t);
  const a = Fi(o);
  if (!a.length) return tn(e, t);
  const s = Math.max(...a.map((i) => i.length)), c = a.map((i) => Array.from({ length: s }, (l, u) => i[u] || ""));
  if (n === "markdown") {
    const i = `| ${c[0].join(" | ")} |`, l = `| ${c[0].map(() => "---").join(" | ")} |`;
    return [i, l, ...c.slice(1).map((u) => `| ${u.join(" | ")} |`)].join(`
`);
  }
  return [
    `\\begin{tabular}{${"l".repeat(s)}}`,
    ...c.map((i) => `${i.map($i).join(" & ")} \\\\`),
    "\\end{tabular}"
  ].join(`
`);
}
const so = 26, io = 250;
function co(e, t = io) {
  return e.height < so * 2 || e.width < t;
}
function ji({
  target: e,
  pane: t = "source",
  revisedCount: n = 0
}) {
  const [r, o] = _("idle"), [a, s] = _("idle"), c = M([]), i = (e == null ? void 0 : e.itemId) || "";
  if (z(() => {
    o("idle"), s("idle");
    const y = c.current;
    return () => {
      y.forEach((b) => window.clearTimeout(b)), c.current = [];
    };
  }, [i]), !e) return null;
  const l = tn(e.highlight.region, t), u = Fr(e.highlight.region), d = u === "figure" ? Li(e.highlight.region) : "", f = (y, b) => async (S) => {
    S.preventDefault(), S.stopPropagation();
    const R = await Mi(y);
    b(R ? "copied" : "failed"), c.current.push(window.setTimeout(() => b("idle"), 1200));
  }, h = u === "formula" ? "复制 LaTeX" : "复制", g = co(e.rect), m = async (y, b) => {
    if (b.preventDefault(), b.stopPropagation(), !d) {
      o("failed");
      return;
    }
    try {
      if (y === "copy") {
        if (!await Di(d)) throw new Error("图片复制不可用");
      } else y === "open" ? await xi(d) : await zi(d);
      o("copied");
    } catch {
      o("failed");
    }
    c.current.push(window.setTimeout(() => o("idle"), 1200));
  };
  return /* @__PURE__ */ v("div", { className: "reader-text-hover-layer", children: /* @__PURE__ */ v(
    "div",
    {
      className: "reader-text-hover-frame",
      "data-reader-text-hover-id": e.itemId,
      "data-reader-text-hover-kind": u,
      style: e.rect,
      children: /* @__PURE__ */ x(
        "div",
        {
          className: ao,
          "data-placement": g ? "outside" : "inside",
          children: [
            /* @__PURE__ */ v(
              Le,
              {
                className: _i,
                state: a,
                label: `复制翻译编号 ${e.itemId}`,
                title: "翻译编号，点击复制",
                onClick: f(e.itemId, s),
                children: a === "copied" ? "已复制编号" : e.itemId
              }
            ),
            t === "translated" && n > 0 ? /* @__PURE__ */ x("span", { className: "reader-text-hover-revised", "data-reader-revised-count": n, children: [
              "改过 ",
              n,
              " 次"
            ] }) : null,
            u === "table" ? /* @__PURE__ */ x(Be, { children: [
              /* @__PURE__ */ v(
                Le,
                {
                  className: Oe,
                  state: r,
                  label: "复制表格",
                  title: "复制表格",
                  onClick: f(Gt(e.highlight.region, t === "translated" ? "translated" : "source", "text"), o),
                  children: r === "copied" ? "已复制" : r === "failed" ? "复制失败" : "复制表格"
                }
              ),
              /* @__PURE__ */ v(
                Le,
                {
                  className: Oe,
                  state: r,
                  label: "复制表格为 Markdown",
                  title: "复制表格为 Markdown",
                  onClick: f(Gt(e.highlight.region, t === "translated" ? "translated" : "source", "markdown"), o),
                  children: "Markdown"
                }
              ),
              /* @__PURE__ */ v(
                Le,
                {
                  className: Oe,
                  state: r,
                  label: "复制表格为 LaTeX",
                  title: "复制表格为 LaTeX",
                  onClick: f(Gt(e.highlight.region, t === "translated" ? "translated" : "source", "latex"), o),
                  children: "LaTeX"
                }
              )
            ] }) : u === "figure" ? /* @__PURE__ */ x(Be, { children: [
              /* @__PURE__ */ v(
                Le,
                {
                  className: Oe,
                  state: r,
                  label: "复制图片",
                  title: "复制图片",
                  onClick: (y) => void m("copy", y),
                  children: r === "copied" ? "已复制" : r === "failed" ? "复制失败" : "复制图片"
                }
              ),
              /* @__PURE__ */ v(
                Le,
                {
                  className: Oe,
                  state: r,
                  label: "放大图片",
                  title: "放大图片",
                  onClick: (y) => void m("open", y),
                  children: "放大"
                }
              ),
              /* @__PURE__ */ v(
                Le,
                {
                  className: Oe,
                  state: r,
                  label: "下载图片",
                  title: "下载图片",
                  onClick: (y) => void m("download", y),
                  children: "下载"
                }
              )
            ] }) : l ? /* @__PURE__ */ v(
              Le,
              {
                className: Oe,
                state: r,
                label: t === "translated" ? "复制这段译文" : "复制这段原文",
                onClick: f(l, o),
                children: r === "copied" ? "已复制" : r === "failed" ? "复制失败" : h
              }
            ) : null
          ]
        }
      )
    }
  ) });
}
function Ui(e, t) {
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
function Bi(e, t, n, r) {
  if (!e || !t) return [];
  const o = [];
  for (const a of e.blocks) {
    const s = t.itemsById.get(a.item_id);
    if (!(s != null && s.translated_text)) continue;
    const c = Rn(
      Ui(e, a),
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
const Hi = '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif', Wi = 256, ft = /* @__PURE__ */ new Map();
function Vi(e) {
  return `${e || ""}`.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function Ji(e) {
  const t = `${e || ""}`, { text: n, slots: r } = ca(t, { bareLatex: !0 }), o = Vi(n), a = la(o, r);
  if (!r.length)
    return { fallbackHtml: a, richHtml: Promise.resolve(a), hasMath: !1 };
  let s = ft.get(t);
  if (!s && (s = ua(o, r, { preserveSource: !1 }), ft.set(t, s), ft.size > Wi)) {
    const c = ft.keys().next().value;
    c !== void 0 && ft.delete(c);
  }
  return { fallbackHtml: a, richHtml: s, hasMath: !0 };
}
function Kt(e) {
  return /title|heading|header|display_formula|equation/i.test(e);
}
function Te(e) {
  const t = Number(e);
  return Number.isFinite(t) && t > 0 ? t : void 0;
}
function qi(e, t) {
  const n = e.typography, r = Te(t) || 1, o = Te(n == null ? void 0 : n.font_size_pt), a = Math.max(1, `${e.sourceText || ""}`.split(/\n+/).length), s = e.rect.height / Math.max(1.28, a * 1.18), c = Kt(e.kind) ? 24 : /caption|footnote|table/i.test(e.kind) ? 9.5 : 11, i = Math.max(5.5 * r, Math.min(s, c * r)), l = Te(n == null ? void 0 : n.fit_min_font_size_pt), u = Te(n == null ? void 0 : n.fit_max_font_size_pt), d = Math.max(3.5, (l || 5.5) * r), f = Math.max(
    d,
    u ? u * r : o ? o * r : i
  ), h = o ? o * r : i, g = Te(n == null ? void 0 : n.leading_em), m = [
    Te(n == null ? void 0 : n.padding_top_pt) || 0,
    Te(n == null ? void 0 : n.padding_right_pt) || 0,
    Te(n == null ? void 0 : n.padding_bottom_pt) || 0,
    Te(n == null ? void 0 : n.padding_left_pt) || 0
  ].map((y) => y * r);
  return {
    fontFamily: `${(n == null ? void 0 : n.font_family) || ""}`.trim() || Hi,
    fontSizePx: Math.max(d, Math.min(f, h)),
    minFontSizePx: d,
    maxFontSizePx: f,
    // Typst leading is the additional inter-line gap, unlike CSS line-height.
    lineHeight: g ? 1 + g : 1.3,
    fontWeight: (n == null ? void 0 : n.font_weight) || (Kt(e.kind) ? 600 : 400),
    textAlign: ["left", "center", "right", "justify"].includes(`${(n == null ? void 0 : n.text_align) || ""}`) ? n == null ? void 0 : n.text_align : Kt(e.kind) ? "center" : "justify",
    padding: m,
    exact: !!o
  };
}
function Gi(e, t, n, r) {
  const { minFontSizePx: o, maxFontSizePx: a } = r, s = /* @__PURE__ */ new Map(), c = (d) => {
    const f = s.get(d);
    if (f !== void 0) return f;
    const { width: h, height: g } = e(d), m = h <= t + 0.5 && g <= n + 0.5;
    return s.set(d, m), m;
  };
  let i = o, l = a, u = Math.min(r.requestedFontSizePx, l);
  if (c(u)) {
    if (!r.exact) {
      i = u;
      for (let d = 0; d < 6 && l > i; d += 1) {
        const f = (i + l) / 2;
        c(f) ? (u = f, i = f) : l = f;
      }
    }
  } else {
    l = u, u = i;
    for (let d = 0; d < 8 && l > i; d += 1) {
      const f = (i + l) / 2;
      c(f) ? (u = f, i = f) : l = f;
    }
  }
  return Math.max(o, u);
}
const Ki = 512, mt = /* @__PURE__ */ new Map();
let dn = 0;
typeof document < "u" && document.fonts && (document.fonts.ready.then(() => {
  dn += 1;
}).catch(() => {
}), typeof document.fonts.addEventListener == "function" && document.fonts.addEventListener("loadingdone", () => {
  dn += 1;
}));
function Zi(e, t, n, r) {
  return [
    dn,
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
function Yi({ item: e, pageScale: t }) {
  const n = M(null), r = Y(
    () => Ji(e.translatedText),
    [e.translatedText]
  ), [o, a] = _(r.fallbackHtml), s = Y(
    () => qi(e, t),
    [e, t]
  );
  z(() => {
    let d = !0;
    return a(r.fallbackHtml), r.hasMath && r.richHtml.then((f) => {
      d && a(f);
    }), () => {
      d = !1;
    };
  }, [r]), Me(() => {
    const d = n.current;
    if (!d) return;
    const [f, h, g, m] = s.padding, y = Math.max(1, e.rect.width - m - h), b = Math.max(1, e.rect.height - f - g), S = Zi(o, y, b, s);
    let R = mt.get(S);
    if (R === void 0 && (R = Gi(
      (p) => (d.style.fontSize = `${p}px`, { width: d.scrollWidth, height: d.scrollHeight }),
      y,
      b,
      {
        minFontSizePx: s.minFontSizePx,
        maxFontSizePx: s.maxFontSizePx,
        requestedFontSizePx: s.fontSizePx,
        exact: s.exact
      }
    ), mt.set(S, R), mt.size > Ki)) {
      const p = mt.keys().next().value;
      p !== void 0 && mt.delete(p);
    }
    d.style.fontSize = `${R.toFixed(2)}px`;
  }, [o, e.rect.height, e.rect.width, s]);
  const [c, i, l, u] = s.padding;
  return /* @__PURE__ */ v(
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
      children: /* @__PURE__ */ v(
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
function Xi({
  layoutPage: e,
  pageState: t,
  width: n,
  height: r
}) {
  const o = Y(
    () => Bi(e, t, n, r),
    [r, e, t, n]
  );
  return o.length ? /* @__PURE__ */ v(
    "div",
    {
      className: "reader-live-translation-overlay",
      "data-live-translation-page": e == null ? void 0 : e.page_idx,
      "data-live-translation-generation": t == null ? void 0 : t.generation,
      "aria-hidden": "true",
      children: o.map((a) => /* @__PURE__ */ v(
        Yi,
        {
          item: a,
          pageScale: e != null && e.width ? n / e.width : 1
        },
        `${a.itemId}:${a.changedAtSeq}`
      ))
    }
  ) : null;
}
const Qi = bn(Xi), lo = yn(null), uo = yn(null);
function ec({ value: e, hud: t, children: n }) {
  return /* @__PURE__ */ v(lo.Provider, { value: e, children: /* @__PURE__ */ v(uo.Provider, { value: t, children: n }) });
}
function xe() {
  return vn(lo);
}
function fo() {
  return vn(uo);
}
const mo = 1.414;
function tc({
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
  regionTargets: f = [],
  hoveredRegionId: h,
  onHoverRegion: g,
  liveTranslationLayout: m,
  liveTranslationPage: y,
  showLiveTranslation: b = r === "source"
}) {
  var oe;
  const S = (oe = xe()) == null ? void 0 : oe.revisedBlocks, R = M(i ?? mo), [p, w] = _(R.current);
  z(() => {
    i != null && Math.abs(i - R.current) >= 1e-3 && (R.current = i, w(i));
  }, [i]);
  const T = M(u);
  T.current = u;
  const N = M(null), O = M((j) => {
    var U;
    N.current = j, (U = T.current) == null || U.call(T, j);
  }).current, L = M(null), C = M(`${t}@${n}`);
  Me(() => {
    const j = `${t}@${n}`;
    C.current !== j && (C.current = j, o && rc(N.current, L.current));
  }, [o, n, t]), z(() => {
    o || Zt(L.current);
  }, [o]), z(() => () => Zt(L.current), []);
  const P = Math.max(120, Math.floor(t * p)), I = Math.max(P, Math.ceil(s || 0)), E = Rn(d, t, P), k = Y(
    () => Ni(f, t, P),
    [P, f, t]
  ), [F, K] = _(null), D = typeof g == "function", q = D ? h ?? null : F, B = (j) => {
    D ? j !== (h ?? null) && (g == null || g(j)) : K((U) => U === j ? U : j);
  }, V = Y(
    () => k.find((j) => j.itemId === q) || null,
    [q, k]
  ), ne = (j) => {
    var Ae, Pe;
    if (j.pointerType === "touch") return;
    if (j.buttons !== 0) {
      B(null);
      return;
    }
    if ((Pe = (Ae = j.target) == null ? void 0 : Ae.closest) != null && Pe.call(Ae, `.${ao}`)) return;
    const U = j.currentTarget.getBoundingClientRect(), Z = j.clientX - U.left, pe = j.clientY - U.top, ae = V == null ? void 0 : V.rect;
    if (ae && co(ae) && Z >= ae.left - 4 && Z <= ae.left + io && pe >= ae.top - so && pe <= ae.top) return;
    const Re = cr(k, Z, pe);
    B((Re == null ? void 0 : Re.itemId) || null);
  }, me = (j) => {
    if (j.pointerType === "mouse") return;
    const U = j.currentTarget.getBoundingClientRect(), Z = cr(
      k,
      j.clientX - U.left,
      j.clientY - U.top
    );
    B((Z == null ? void 0 : Z.itemId) || null);
  }, re = (j) => {
    !Number.isFinite(j) || j <= 0 || Math.abs(R.current - j) < 1e-3 || (R.current = j, w(j), l == null || l(e, j));
  };
  return /* @__PURE__ */ x(
    "div",
    {
      ref: O,
      [He]: e,
      [st]: r,
      [In]: P,
      className: En,
      onPointerMoveCapture: ne,
      onPointerDown: me,
      onPointerLeave: (j) => {
        j.pointerType === "mouse" && B(null);
      },
      style: {
        width: t,
        height: I,
        minHeight: I
      },
      children: [
        o ? /* @__PURE__ */ v(
          sa,
          {
            pageNumber: e,
            width: t,
            devicePixelRatio: n,
            renderTextLayer: a,
            renderAnnotationLayer: !1,
            className: Vr,
            loading: /* @__PURE__ */ v(
              "div",
              {
                className: Dt,
                style: { width: t, height: P }
              }
            ),
            onLoadSuccess: (j) => {
              try {
                const U = j.getViewport({ scale: 1 });
                if (U.width > 0) {
                  const Z = U.height / U.width;
                  re(Z);
                }
              } catch {
              }
              c == null || c();
            },
            onRenderSuccess: () => {
              Zt(L.current), c == null || c();
            }
          }
        ) : /* @__PURE__ */ v(
          "div",
          {
            className: Dt,
            style: { width: t, height: P },
            "aria-hidden": !0
          }
        ),
        o ? /* @__PURE__ */ v("div", { ref: L, className: "reader-react-pdf-kept-paint", "aria-hidden": "true" }) : null,
        E ? /* @__PURE__ */ v(
          "div",
          {
            className: "reader-react-pdf-region-highlight",
            "data-reader-region-id": d == null ? void 0 : d.itemId,
            style: E,
            "aria-hidden": "true"
          }
        ) : null,
        o && a && b ? /* @__PURE__ */ v(
          Qi,
          {
            layoutPage: m,
            pageState: y,
            width: t,
            height: P
          }
        ) : null,
        o && r === "translated" && (S != null && S.size) ? /* @__PURE__ */ v("div", { className: "reader-revised-markers", "aria-hidden": "true", children: k.filter((j) => S.has(j.itemId)).map((j) => /* @__PURE__ */ v(
          "span",
          {
            className: "reader-revised-marker",
            "data-reader-revised-id": j.itemId,
            style: { left: j.rect.left, top: j.rect.top, height: j.rect.height }
          },
          j.itemId
        )) }) : null,
        /* @__PURE__ */ v(
          ji,
          {
            target: o ? V : null,
            pane: r === "translated" ? "translated" : "source",
            revisedCount: V && (S == null ? void 0 : S.get(V.itemId)) || 0
          }
        )
      ]
    }
  );
}
const nc = bn(tc);
function rc(e, t) {
  if (!e || !t || t.firstChild) return;
  const n = e.querySelector(".react-pdf__Page__canvas");
  if (!n || !n.width || !n.height || n.style.visibility === "hidden") return;
  const r = e.ownerDocument.createElement("canvas");
  r.width = n.width, r.height = n.height;
  const o = r.getContext("2d");
  o && (o.drawImage(n, 0, 0), t.appendChild(r));
}
function Zt(e) {
  if (e != null && e.firstChild) {
    for (const t of Array.from(e.querySelectorAll("canvas")))
      t.width = 0, t.height = 0;
    e.replaceChildren();
  }
}
const oc = 2 * 1024 * 1024;
function ac(e) {
  const t = new Br.PDFDataRangeTransport(e.length, null);
  return t.requestDataRange = (n, r) => {
    e.fetchRange(n, r).then(
      (o) => t.onDataRange(n, o),
      () => {
        t.abort();
      }
    );
  }, t;
}
const Yt = 5, sc = "120% 0px", ic = 120, cc = "25% 0px";
let lr = 1;
const ur = /* @__PURE__ */ new WeakMap();
function lc(e) {
  if (!e) return 0;
  const t = ur.get(e);
  if (t) return t;
  const n = lr;
  return lr += 1, ur.set(e, n), n;
}
function uc() {
  const e = typeof window < "u" && window.devicePixelRatio || 1;
  return Math.max(1, Math.min(e, 2));
}
const dc = Do(
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
    onLoadError: f,
    onNumPagesChange: h,
    activeRegion: g = null,
    regions: m = [],
    readerMetadata: y = null,
    hoveredRegionId: b = null,
    onHoverRegion: S,
    liveTranslation: R,
    showLiveTranslation: p = t === "source",
    liveTranslationPendingLabel: w = "",
    paneAction: T
  }, N) {
    ki();
    const { file: O, loading: L, error: C } = qa(n, r), P = `${n}\0${lc(O)}`, I = M(P);
    I.current = P;
    const E = Y(() => {
      const A = Ua(O);
      return A ? "ranged" in A ? { range: ac(A.ranged) } : A : null;
    }, [O, n]), [k, F] = _(0), [K, D] = _(""), [q, B] = _(null), [V, ne] = _(480), me = M(null), re = M(0), oe = Y(() => uc(), []), j = Y(() => ({
      cMapUrl: gt().resolvePdfjsVendorUrl("cmaps/"),
      cMapPacked: !0,
      standardFontDataUrl: gt().resolvePdfjsVendorUrl("standard_fonts/"),
      // 只对按段取的大文件起作用：要哪页取哪页，不在后台把整份取完（取完又是一整份在内存里）。
      rangeChunkSize: oc,
      disableAutoFetch: !0
    }), []);
    wn(N, () => q, [q]), z(() => {
      const A = (H) => {
        re.current = H, ne(H);
      }, J = (H) => {
        const Q = ws(H, re.current);
        if (Q !== "ignore") {
          if (me.current && clearTimeout(me.current), Q === "immediate") {
            A(H);
            return;
          }
          me.current = setTimeout(() => A(H), Gr);
        }
      }, W = !!(i && i >= 80);
      J(W ? i : (c == null ? void 0 : c.clientWidth) || 0);
      const ee = !W && c && typeof ResizeObserver < "u" ? new ResizeObserver((H) => {
        var Q, ce;
        J(((ce = (Q = H[0]) == null ? void 0 : Q.contentRect) == null ? void 0 : ce.width) ?? c.clientWidth);
      }) : null;
      return ee && c && ee.observe(c), () => {
        ee == null || ee.disconnect(), me.current && clearTimeout(me.current);
      };
    }, [i, c, a]);
    const U = Y(
      () => bs(V, o),
      [V, o]
    ), [Z, pe] = _(() => /* @__PURE__ */ new Map()), [ae, Re] = _(() => /* @__PURE__ */ new Set()), [Ae, Pe] = _(() => /* @__PURE__ */ new Set()), Ke = M(/* @__PURE__ */ new Map()), Ze = M(null), te = M(null), [le, ge] = _(() => /* @__PURE__ */ new Set()), se = M(/* @__PURE__ */ new Map()), ue = $((A, J) => {
      pe((W) => {
        if (W.get(A) === J) return W;
        const G = new Map(W);
        return G.set(A, J), G;
      });
    }, []), ie = $((A, J) => {
      const W = Ke.current, G = W.get(A), ee = [Ze.current, te.current];
      if (G)
        for (const H of ee)
          try {
            H == null || H.unobserve(G);
          } catch {
          }
      if (J) {
        W.set(A, J);
        for (const H of ee)
          try {
            H == null || H.observe(J);
          } catch {
          }
      } else
        W.delete(A);
    }, []), Ye = M(/* @__PURE__ */ new Map()), Xe = $((A) => {
      const J = Ye.current;
      let W = J.get(A);
      return W || (W = (G) => ie(A, G), J.set(A, W)), W;
    }, [ie]);
    z(() => {
      if (typeof IntersectionObserver > "u") return;
      const A = se.current, J = new IntersectionObserver(
        (W) => {
          const G = [], ee = [];
          for (const H of W) {
            const Q = H.target, ce = zt(Q);
            Number.isFinite(ce) && (H.isIntersecting ? G : ee).push(ce);
          }
          if ((G.length || ee.length) && Re((H) => {
            let Q = null;
            for (const ce of G)
              H.has(ce) || (Q = Q || new Set(H), Q.add(ce));
            for (const ce of ee)
              H.has(ce) && (Q = Q || new Set(H), Q.delete(ce));
            return Q || H;
          }), G.length) {
            for (const H of G) {
              const Q = A.get(H);
              Q && (clearTimeout(Q), A.delete(H));
            }
            Pe((H) => {
              let Q = null;
              for (const ce of G)
                H.has(ce) || (Q = Q || new Set(H), Q.add(ce));
              return Q || H;
            });
          }
          for (const H of ee)
            A.has(H) || A.set(H, setTimeout(() => {
              A.delete(H), Pe((Q) => {
                if (!Q.has(H)) return Q;
                const ce = new Set(Q);
                return ce.delete(H), ce;
              });
            }, ic));
        },
        { root: c, rootMargin: sc, threshold: 0 }
      );
      Ze.current = J;
      for (const W of Ke.current.values())
        try {
          J.observe(W);
        } catch {
        }
      return () => {
        J.disconnect(), Ze.current === J && (Ze.current = null);
        for (const W of A.values()) clearTimeout(W);
        A.clear();
      };
    }, [c]), z(() => {
      if (typeof IntersectionObserver > "u") return;
      const A = new IntersectionObserver(
        (J) => {
          ge((W) => {
            let G = null;
            for (const ee of J) {
              const H = zt(ee.target);
              !Number.isFinite(H) || ee.isIntersecting === W.has(H) || (G = G || new Set(W), ee.isIntersecting ? G.add(H) : G.delete(H));
            }
            return G || W;
          });
        },
        { root: c, rootMargin: cc, threshold: 0 }
      );
      te.current = A;
      for (const J of Ke.current.values())
        try {
          A.observe(J);
        } catch {
        }
      return () => {
        A.disconnect(), te.current === A && (te.current = null);
      };
    }, [c]);
    const lt = !!c && typeof IntersectionObserver < "u";
    Me(() => {
      F(0), D(""), Re(/* @__PURE__ */ new Set()), Pe(/* @__PURE__ */ new Set()), pe(/* @__PURE__ */ new Map()), Ke.current.clear();
      const A = se.current;
      for (const J of A.values()) clearTimeout(J);
      A.clear(), h == null || h(0, t);
    }, [P, h, t]);
    const Ht = $(
      ({ numPages: A }) => {
        I.current === P && (F(A), D(""), h == null || h(A, t), d == null || d({ numPages: A, pane: t }));
      },
      [P, d, h, t]
    ), Wt = $(
      (A) => {
        if (I.current !== P) return;
        const J = (A == null ? void 0 : A.message) || "PDF 解析失败";
        D(J), F(0), h == null || h(0, t), f == null || f(A, t);
      },
      [P, f, h, t]
    ), Ne = Y(
      () => k > 0 ? Array.from({ length: k }, (A, J) => J + 1) : [],
      [k]
    );
    z(() => {
      typeof IntersectionObserver < "u" || Pe(new Set(Ne));
    }, [Ne]);
    const _e = Y(
      () => Gn(g, y, t),
      [g, y, t]
    ), ze = Y(() => {
      const A = /* @__PURE__ */ new Map();
      for (const J of m) {
        const W = Gn(J, y, t);
        if (!W) continue;
        const G = A.get(W.box.page) || [];
        G.push(W), A.set(W.box.page, G);
      }
      return A;
    }, [t, y, m]), Pt = Y(() => {
      const A = /* @__PURE__ */ new Set();
      if (!b) return A;
      for (const [J, W] of ze)
        W.some((G) => G.itemId === b) && A.add(J);
      return A;
    }, [b, ze]), It = Y(() => {
      if (k === 0) return /* @__PURE__ */ new Set();
      if (!a) return /* @__PURE__ */ new Set();
      if (!(!!c && typeof IntersectionObserver < "u")) return new Set(Ne);
      if (ae.size === 0) {
        const W = Math.min(k, Yt * 2 + 1);
        return new Set(Array.from({ length: W }, (G, ee) => ee + 1));
      }
      const J = /* @__PURE__ */ new Set();
      for (const W of ae)
        for (let G = -Yt; G <= Yt; G++) {
          const ee = W + G;
          ee >= 1 && ee <= k && J.add(ee);
        }
      return J;
    }, [k, Ne, c, a, ae]), Qe = !n || !!C || !!K, Et = n && (C || K) || s;
    return /* @__PURE__ */ x(
      "section",
      {
        ref: B,
        className: `reader-panel ${ls}${a ? "" : " is-hidden"}`,
        [st]: t,
        "data-reader-engine": "react-pdf",
        "data-reader-visible": a ? "true" : "false",
        "data-live-translation-status": (R == null ? void 0 : R.jobStatus) || void 0,
        "aria-hidden": a ? void 0 : !0,
        "aria-label": t === "source" ? "原文 PDF" : "译文 PDF",
        children: [
          T ? /* @__PURE__ */ v("div", { className: "reader-react-pdf-pane-action", children: T }) : null,
          w ? /* @__PURE__ */ x("div", { className: "reader-live-translation-waiting", role: "status", children: [
            /* @__PURE__ */ v("span", { className: "reader-live-translation-waiting-dot", "aria-hidden": "true" }),
            /* @__PURE__ */ v("span", { children: w })
          ] }) : null,
          Qe && !L ? /* @__PURE__ */ v("div", { className: "reader-empty reader-react-pdf-empty", "data-reader-pdf-empty": t, children: Et }) : null,
          L ? /* @__PURE__ */ v("div", { className: "reader-empty reader-react-pdf-loading", "data-reader-pdf-loading": t, children: "正在加载 PDF…" }) : null,
          E && !C ? /* @__PURE__ */ v("div", { className: "reader-viewer-wrap reader-react-pdf-wrap", children: /* @__PURE__ */ v(
            ia,
            {
              file: E,
              loading: null,
              error: null,
              options: j,
              onLoadSuccess: Ht,
              onLoadError: Wt,
              className: "reader-react-pdf-document",
              children: Ne.map((A) => {
                if (It.has(A))
                  return /* @__PURE__ */ v(
                    nc,
                    {
                      pane: t,
                      pageNumber: A,
                      width: U,
                      devicePixelRatio: oe,
                      active: Ae.has(A),
                      textLayer: !lt || le.has(A),
                      syncedMinHeight: (l == null ? void 0 : l.get(A)) || 0,
                      onMetrics: u,
                      cachedAspect: Z.get(A),
                      onAspectChange: ue,
                      sentinelRef: Xe(A),
                      regionHighlight: (_e == null ? void 0 : _e.box.page) === A ? _e : null,
                      regionTargets: ze.get(A),
                      hoveredRegionId: b && Pt.has(A) ? b : null,
                      onHoverRegion: S,
                      liveTranslationLayout: R == null ? void 0 : R.layoutByPage.get(A - 1),
                      liveTranslationPage: R == null ? void 0 : R.pagesByPage.get(A - 1),
                      showLiveTranslation: p
                    },
                    `${t}-${A}`
                  );
                const W = Z.get(A) ?? mo, G = Math.max(120, Math.floor(U * W)), ee = Math.max(G, Math.ceil((l == null ? void 0 : l.get(A)) || 0));
                return /* @__PURE__ */ v(
                  "div",
                  {
                    ref: Xe(A),
                    [He]: A,
                    [st]: t,
                    [In]: G,
                    className: `${En} is-placeholder`,
                    style: {
                      width: U,
                      height: ee,
                      minHeight: ee
                    },
                    children: /* @__PURE__ */ v(
                      "div",
                      {
                        className: Dt,
                        style: { width: U, height: G },
                        "aria-hidden": !0
                      }
                    )
                  },
                  `${t}-${A}`
                );
              })
            },
            P
          ) }) : null
        ]
      }
    );
  }
), dr = bn(dc), fc = 2e3, mc = 6, hc = 500, fr = "reader-react-resizing";
function pc(e, t) {
  const n = M(null), r = M(null);
  Me(() => {
    const o = n.current;
    if (n.current = t, !e || o === null || t === null || Math.abs(o - t) < 1) return;
    const a = r.current;
    a == null || a.stop();
    let s = a ? { pane: a.pane, progress: a.progress, started: a.started } : null;
    if (!s) {
      const p = gc(e), w = Nt(e, p);
      if (!w) return;
      s = { pane: p, progress: w, started: performance.now() };
    }
    const { pane: c, progress: i, started: l } = s;
    let u = 0, d = null, f = e.scrollHeight, h = f, g = 0, m = l;
    const y = /* @__PURE__ */ new WeakMap(), b = typeof ResizeObserver > "u" ? null : new ResizeObserver((p) => {
      let w = !1;
      for (const T of p) {
        const N = Math.round(T.contentRect.height);
        y.has(T.target) && y.get(T.target) !== N && (w = !0), y.set(T.target, N);
      }
      w && yt(e, i, "auto", c);
    }), S = () => {
      var p;
      d && clearTimeout(d), cancelAnimationFrame(u), b == null || b.disconnect(), e.classList.remove(fr);
      for (const w of mr) e.removeEventListener(w, S);
      ((p = r.current) == null ? void 0 : p.stop) === S && (r.current = null);
    }, R = () => {
      yt(e, i, "auto", c);
      const p = e.scrollHeight;
      g = p === h ? g + 1 : 0, h = p;
      const w = performance.now() - m;
      g >= mc && (p !== f || w > hc) || w > fc ? S() : u = requestAnimationFrame(R);
    };
    for (const p of mr) e.addEventListener(p, S, { passive: !0 });
    for (const p of Array.from(e.children)) b == null || b.observe(p);
    e.classList.add(fr), r.current = { ...s, stop: S }, d = setTimeout(() => {
      d = null, m = performance.now(), f = e.scrollHeight, h = f, g = 0, u = requestAnimationFrame(R);
    }, Gr);
  }, [e, t]), z(() => () => {
    var o;
    return (o = r.current) == null ? void 0 : o.stop();
  }, []);
}
function gc(e) {
  for (const t of Array.from(e.querySelectorAll(`[${He}]`))) {
    const n = t.getBoundingClientRect();
    if (n.height >= 8 && n.width >= 8) return t.getAttribute(st) || null;
  }
  return null;
}
const mr = ["wheel", "touchstart", "keydown", "pointerdown"], bc = () => () => {
}, hr = () => null;
function yc({
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
function vc(e, t, n = e * 2) {
  return t ? !Number.isFinite(e) || e <= 0 ? n : e * 2 : e;
}
function wc(e) {
  return e ? e.connection === "terminal" && e.jobStatus === "failed" ? e.pagesByPage.size > 0 ? `翻译已暂停，已保留 ${e.pagesByPage.size} 页译文` : "翻译已暂停，原始 PDF 仍可阅读" : e.connection === "terminal" && ["cancelled", "canceled"].includes(e.jobStatus) ? e.pagesByPage.size > 0 ? `翻译已取消，已保留 ${e.pagesByPage.size} 页译文` : "翻译已取消，原始 PDF 仍可阅读" : e.pagesByPage.size > 0 ? "" : e.connection === "unavailable" ? e.error || "实时译文暂不可用，原始 PDF 仍可阅读" : e.error ? e.error : e.layoutByPage.size === 0 ? "正在完成 OCR，译文将在这里逐页出现" : "版面已就绪，正在等待首个译文页面" : "";
}
function Sc(e) {
  const t = xe(), {
    markdownSplit: n = !1,
    assistantSplit: r = !1,
    liveTranslation: o,
    paneComposition: a
  } = e, s = (a == null ? void 0 : a.visibleMode) ?? e.mode ?? "compare", c = (a == null ? void 0 : a.compareMode) ?? e.compareMode ?? s === "compare", i = (a == null ? void 0 : a.showSource) ?? e.showSource ?? !0, l = (a == null ? void 0 : a.showTranslated) ?? e.showTranslated ?? (s === "compare" || s === "translated"), u = (a == null ? void 0 : a.overlayOnSource) ?? e.overlayOnSource ?? !1, d = e.bindShell ?? (t == null ? void 0 : t.bindShell), f = e.shellEl ?? (t == null ? void 0 : t.shellEl) ?? null, h = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? Rt, g = e.shellWidth ?? (t == null ? void 0 : t.shellWidth) ?? 0, m = e.rowHeights ?? (t == null ? void 0 : t.rowHeights), y = e.mountSource ?? (t == null ? void 0 : t.mountSource) ?? !1, b = e.mountTranslated ?? (t == null ? void 0 : t.mountTranslated) ?? !1, S = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, R = e.sourceUrl ?? (t == null ? void 0 : t.sourceUrl) ?? "", p = e.translatedUrl ?? (t == null ? void 0 : t.translatedUrl) ?? "", w = e.sourceFile ?? (t == null ? void 0 : t.sourceFile) ?? null, T = e.translatedFile ?? (t == null ? void 0 : t.translatedFile) ?? null, N = e.onMetrics ?? (t == null ? void 0 : t.onMetrics), O = e.onNumPagesChange ?? (t == null ? void 0 : t.onNumPagesChange), L = e.activeRegion ?? (t == null ? void 0 : t.activeRegion), C = e.regions ?? (t == null ? void 0 : t.regions) ?? [], P = e.readerMetadata ?? (t == null ? void 0 : t.readerMetadata), I = (t == null ? void 0 : t.regionHover) ?? null, [E, k] = _(null), F = zr(
    I ? I.subscribe : bc,
    I ? () => I.get().itemId : hr,
    I ? () => I.get().itemId : hr
  ), K = I ? F : E, D = $((ne) => {
    I ? I.set(ne, "pdf") : k(ne);
  }, [I]), q = yc({
    mode: s,
    compareMode: c,
    showSource: i,
    showTranslated: l,
    markdownSplit: n,
    overlayOnSource: u
  }), V = Number.isFinite(g) && g > 0 ? vc(
    g,
    n || r,
    typeof document > "u" ? g * 2 : document.documentElement.clientWidth
  ) : null;
  return pc(f, V), /* @__PURE__ */ v(
    "div",
    {
      ref: d,
      className: cs,
      "data-reader-region-count": C.length,
      "data-reader-structured-region-count": C.filter(qo).length,
      "data-reader-metadata-ready": P ? "true" : "false",
      children: /* @__PURE__ */ x(
        "main",
        {
          className: `${is} reader-mode-${q.mode}`,
          "data-reader-mode": n ? "markdown-split" : r ? "assistant-split" : s,
          children: [
            y ? /* @__PURE__ */ v(
              dr,
              {
                pane: "source",
                url: R,
                preloadedFile: w,
                userZoom: h,
                visible: q.showSource,
                scrollRoot: f,
                pageWidthOverride: V,
                rowHeights: q.compareMode ? m : void 0,
                onMetrics: N,
                emptyLabel: S ? "源文件不可用：该文档没有可读取的源 PDF。" : "暂无原文 PDF",
                onNumPagesChange: O,
                activeRegion: L,
                regions: C,
                readerMetadata: P,
                hoveredRegionId: K,
                onHoverRegion: D,
                liveTranslation: u ? o : void 0,
                showLiveTranslation: u,
                liveTranslationPendingLabel: u ? wc(o) : "",
                paneAction: u ? /* @__PURE__ */ x(Be, { children: [
                  e.sourcePaneAction,
                  /* @__PURE__ */ v(
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
            b ? /* @__PURE__ */ v(
              dr,
              {
                pane: "translated",
                url: p,
                preloadedFile: T,
                userZoom: h,
                visible: q.showTranslated,
                scrollRoot: f,
                pageWidthOverride: V,
                rowHeights: q.compareMode ? m : void 0,
                onMetrics: N,
                emptyLabel: "暂无译文 PDF",
                onNumPagesChange: O,
                activeRegion: L,
                regions: C,
                readerMetadata: P,
                hoveredRegionId: K,
                onHoverRegion: D,
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
const Rc = [
  { id: "source", label: "原文", Icon: $r },
  { id: "compare", label: "对照", Icon: jr },
  { id: "translated", label: "译文", Icon: Ur }
];
function Pc(e) {
  return e.connection === "live" ? `实时译文 · ${e.pagesByPage.size} 页` : e.connection === "reconnecting" ? "实时译文 · 重连中" : e.connection === "unavailable" ? "实时译文 · 不可用" : e.connection === "terminal" ? e.jobStatus === "failed" ? "实时译文 · 已暂停" : e.jobStatus === "cancelled" || e.jobStatus === "canceled" ? "实时译文 · 已取消" : e.jobStatus === "succeeded" ? "实时译文 · 已完成" : "实时译文 · 已结束" : e.error || "实时译文 · 连接中";
}
function Ic(e) {
  return e.id === "translated" ? e.sourceViewOnly : e.id === "compare" ? !e.documentReady || e.sourceViewOnly && !e.liveTranslationAvailable : !1;
}
function Ec(e) {
  const t = xe(), {
    mode: n,
    documentReady: r,
    onModeChange: o,
    liveTranslation: a = null
  } = e, s = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, c = a ? Pc(a.state) : "";
  return /* @__PURE__ */ x("header", { className: "reader-workspace-bar", children: [
    a ? /* @__PURE__ */ x(
      "button",
      {
        type: "button",
        className: `reader-live-translation-toggle is-${a.state.connection}${a.visible ? " is-active" : ""}`,
        "aria-pressed": a.visible,
        "aria-label": a.visible ? "隐藏实时译文" : "显示实时译文",
        title: a.state.error || c,
        onClick: a.onToggle,
        children: [
          /* @__PURE__ */ v(Xo, { size: 14, strokeWidth: 2.2, "aria-hidden": !0 }),
          /* @__PURE__ */ v("span", { className: "reader-live-translation-toggle-label", children: c })
        ]
      }
    ) : null,
    /* @__PURE__ */ v("div", { className: "reader-workspace-tabs", role: "tablist", "aria-label": "阅读工作区", children: Rc.map(({ id: i, label: l, Icon: u }) => {
      const d = n === i, f = Ic({
        id: i,
        documentReady: r,
        sourceViewOnly: s,
        liveTranslationAvailable: !!a
      });
      return /* @__PURE__ */ x(
        "button",
        {
          type: "button",
          className: `reader-workspace-tab${d ? " is-active" : ""}`,
          role: "tab",
          "aria-selected": d,
          "aria-label": l,
          title: f ? `${l} 需要文档任务` : l,
          disabled: f,
          onClick: () => o(i),
          children: [
            /* @__PURE__ */ v(u, { size: 15, strokeWidth: 2.2, "aria-hidden": !0 }),
            /* @__PURE__ */ v("span", { className: "reader-workspace-tab-label", children: l })
          ]
        },
        i
      );
    }) })
  ] });
}
const Tc = {
  markdown: { label: "Markdown", short: "MD", Icon: Qo, needsJob: !0 }
}, kc = Kr.map(
  (e) => ({ id: e, ...Tc[e] })
);
function ho() {
  return kc.map(({ id: e, label: t, short: n, Icon: r, needsJob: o }) => ({
    id: e,
    label: t,
    short: n,
    Icon: r,
    needsJob: o
  }));
}
function Mc(e) {
  const t = xe(), { active: n } = e, r = e.sourceOnly ?? (t == null ? void 0 : t.sourceOnly) ?? !1, o = e.onSelect ?? (t == null ? void 0 : t.assistant.select) ?? (() => {
  }), a = e.onClose ?? (t == null ? void 0 : t.assistant.close) ?? (() => {
  });
  return /* @__PURE__ */ v(Be, { children: ho().map(({ id: s, label: c, Icon: i, needsJob: l }) => {
    const u = n === s, d = l && r, f = u ? `收起${c}` : `打开${c}`;
    return /* @__PURE__ */ v(
      "button",
      {
        type: "button",
        className: "reader-panel-toggle",
        "aria-label": f,
        "aria-pressed": u,
        title: d ? `${c} 需打开任务阅读` : c,
        disabled: d,
        onClick: () => u ? a() : o(s),
        children: /* @__PURE__ */ v(i, { className: "reader-close-home-icon", size: 18, strokeWidth: 2.25, "aria-hidden": !0 })
      },
      s
    );
  }) });
}
function Ac(e) {
  const t = xe(), { active: n, badges: r } = e, o = e.sourceOnly ?? (t == null ? void 0 : t.sourceOnly) ?? !1, a = e.onSelect ?? (t == null ? void 0 : t.assistant.select) ?? (() => {
  }), s = e.onClose ?? (t == null ? void 0 : t.assistant.close) ?? (() => {
  }), c = ho().map(({ id: i, label: l, short: u, Icon: d, needsJob: f }) => ({
    key: i,
    label: l,
    short: u,
    Icon: d,
    disabled: f && o,
    selected: n === i,
    badge: r == null ? void 0 : r[i],
    onClick: () => a(i)
  }));
  return n ? /* @__PURE__ */ x("header", { className: "reader-assistant-dock-header", children: [
    /* @__PURE__ */ v("div", { className: "reader-assistant-dock-tabs", role: "tablist", "aria-label": "阅读辅助面板", children: c.map(({ key: i, label: l, Icon: u, disabled: d, selected: f, badge: h, onClick: g }) => /* @__PURE__ */ x(
      "button",
      {
        type: "button",
        role: "tab",
        "aria-selected": f,
        className: `reader-assistant-dock-tab${f ? " is-active" : ""}`,
        title: d ? `${l} 需打开任务阅读` : l,
        disabled: d,
        onClick: g,
        children: [
          /* @__PURE__ */ v(u, { size: 15, strokeWidth: 2.15, "aria-hidden": !0 }),
          /* @__PURE__ */ v("span", { className: "reader-assistant-dock-tab-label", children: l }),
          h ? /* @__PURE__ */ v("span", { className: "reader-assistant-dock-badge", children: h }) : null
        ]
      },
      i
    )) }),
    /* @__PURE__ */ v(
      "button",
      {
        type: "button",
        className: "reader-assistant-dock-close",
        "aria-label": "关闭阅读辅助面板",
        title: "关闭辅助面板",
        onClick: s,
        children: /* @__PURE__ */ v(Pn, { size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
      }
    )
  ] }) : null;
}
function Nc(e, t) {
  const n = getComputedStyle(e), r = parseFloat(n.fontSize);
  return t * r;
}
function _c(e, t) {
  const n = getComputedStyle(e.ownerDocument.documentElement), r = parseFloat(n.fontSize);
  return t * r;
}
function Lc(e) {
  return e / 100 * window.innerHeight;
}
function Cc(e) {
  return e / 100 * window.innerWidth;
}
function Dc(e) {
  switch (typeof e) {
    case "number":
      return [e, "px"];
    case "string": {
      const t = parseFloat(e);
      return e.endsWith("%") ? [t, "%"] : e.endsWith("px") ? [t, "px"] : e.endsWith("rem") ? [t, "rem"] : e.endsWith("em") ? [t, "em"] : e.endsWith("vh") ? [t, "vh"] : e.endsWith("vw") ? [t, "vw"] : [t, "%"];
    }
  }
}
function ht({
  groupSize: e,
  panelElement: t,
  styleProp: n
}) {
  let r;
  const [o, a] = Dc(n);
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
      r = _c(t, o);
      break;
    }
    case "em": {
      r = Nc(t, o);
      break;
    }
    case "vh": {
      r = Lc(o);
      break;
    }
    case "vw": {
      r = Cc(o);
      break;
    }
  }
  return r;
}
function fe(e) {
  return parseFloat(e.toFixed(3));
}
function it({
  group: e
}) {
  const { orientation: t, panels: n } = e;
  return n.reduce((r, o) => (r += t === "horizontal" ? o.element.offsetWidth : o.element.offsetHeight, r), 0);
}
function fn(e) {
  const { panels: t } = e, n = it({ group: e });
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
      const u = ht({
        groupSize: n,
        panelElement: o,
        styleProp: a.collapsedSize
      });
      s = fe(u / n * 100);
    }
    let c;
    if (a.defaultSize !== void 0) {
      const u = ht({
        groupSize: n,
        panelElement: o,
        styleProp: a.defaultSize
      });
      c = fe(u / n * 100);
    }
    let i = 0;
    if (a.minSize !== void 0) {
      const u = ht({
        groupSize: n,
        panelElement: o,
        styleProp: a.minSize
      });
      i = fe(u / n * 100);
    }
    let l = 100;
    if (a.maxSize !== void 0) {
      const u = ht({
        groupSize: n,
        panelElement: o,
        styleProp: a.maxSize
      });
      l = fe(u / n * 100);
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
function X(e, t = "Assertion error") {
  if (!e)
    throw Error(t);
}
function mn(e, t) {
  return Array.from(t).sort(
    e === "horizontal" ? xc : zc
  );
}
function xc(e, t) {
  const n = e.element.offsetLeft - t.element.offsetLeft;
  return n !== 0 ? n : e.element.offsetWidth - t.element.offsetWidth;
}
function zc(e, t) {
  const n = e.element.offsetTop - t.element.offsetTop;
  return n !== 0 ? n : e.element.offsetHeight - t.element.offsetHeight;
}
function po(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.ELEMENT_NODE;
}
function go(e, t) {
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
function Oc({
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
    const { x: c, y: i } = go(r, s), l = e === "horizontal" ? c : i;
    l < a && (a = l, o = s);
  }
  return X(o, "No rect found"), o;
}
let Mt;
function Fc() {
  return Mt === void 0 && (typeof matchMedia == "function" ? Mt = !!matchMedia("(pointer:coarse)").matches : Mt = !1), Mt;
}
function bo(e) {
  const { element: t, orientation: n, panels: r, separators: o } = e, a = mn(
    n,
    Array.from(t.children).filter(po).map((g) => ({ element: g }))
  ).map(({ element: g }) => g), s = [];
  let c = !1, i = !1, l = -1, u = -1, d = 0, f, h = [];
  {
    let g = -1;
    for (const m of a)
      m.hasAttribute("data-panel") && (g++, m.hasAttribute("data-disabled") || (d++, l === -1 && (l = g), u = g));
  }
  if (d > 1) {
    let g = -1;
    for (const m of a)
      if (m.hasAttribute("data-panel")) {
        g++;
        const y = r.find(
          (b) => b.element === m
        );
        if (y) {
          if (f) {
            const b = f.element.getBoundingClientRect(), S = m.getBoundingClientRect();
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
                  const T = h[0], N = Oc({
                    orientation: n,
                    rects: [b, S],
                    targetRect: T.element.getBoundingClientRect()
                  });
                  R = [
                    T,
                    N === b ? w : p
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
              const T = Fc() ? e.resizeTargetMinimumSize.coarse : e.resizeTargetMinimumSize.fine;
              if (w.width < T) {
                const O = T - w.width;
                w = new DOMRect(
                  w.x - O / 2,
                  w.y,
                  w.width + O,
                  w.height
                );
              }
              if (w.height < T) {
                const O = T - w.height;
                w = new DOMRect(
                  w.x,
                  w.y - O / 2,
                  w.width,
                  w.height + O
                );
              }
              const N = g <= l || g > u;
              !c && !N && s.push({
                group: e,
                groupSize: it({ group: e }),
                panels: [f, y],
                separator: "width" in p ? void 0 : p,
                rect: w
              }), c = !1;
            }
          }
          i = !1, f = y, h = [];
        }
      } else if (m.hasAttribute("data-separator")) {
        m.ariaDisabled !== null && (c = !0);
        const y = o.find(
          (b) => b.element === m
        );
        y ? h.push(y) : (f = void 0, h = []);
      } else
        i = !0;
  }
  return s;
}
var Ce;
class yo {
  constructor() {
    Vn(this, Ce, {});
  }
  addListener(t, n) {
    const r = ut(this, Ce)[t];
    return r === void 0 ? ut(this, Ce)[t] = [n] : r.includes(n) || r.push(n), () => {
      this.removeListener(t, n);
    };
  }
  emit(t, n) {
    const r = ut(this, Ce)[t];
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
    Jn(this, Ce, {});
  }
  removeListener(t, n) {
    const r = ut(this, Ce)[t];
    if (r !== void 0) {
      const o = r.indexOf(n);
      o >= 0 && r.splice(o, 1);
    }
  }
}
Ce = new WeakMap();
let ot = {
  cursorFlags: 0,
  state: "inactive"
};
const An = new yo();
function We() {
  return ot;
}
function $c(e) {
  return An.addListener("change", e);
}
function jc(e) {
  const t = ot, n = { ...ot };
  n.cursorFlags = e, ot = n, An.emit("change", {
    prev: t,
    next: n
  });
}
function at(e) {
  const t = ot;
  ot = e, An.emit("change", {
    prev: t,
    next: e
  });
}
const Uc = (e) => e, Xt = () => {
}, vo = 1, wo = 2, So = 4, Ro = 8, pr = 3, gr = 12;
let At;
function br() {
  return At === void 0 && (At = !1, typeof window < "u" && (window.navigator.userAgent.includes("Chrome") || window.navigator.userAgent.includes("Firefox")) && (At = !0)), At;
}
function Bc({
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
        if (e && br()) {
          const a = (e & vo) !== 0, s = (e & wo) !== 0, c = (e & So) !== 0, i = (e & Ro) !== 0;
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
    return br() ? r > 0 && o > 0 ? "move" : r > 0 ? "ew-resize" : "ns-resize" : r > 0 && o > 0 ? "grab" : r > 0 ? "col-resize" : "row-resize";
  }
}
const yr = /* @__PURE__ */ new WeakMap();
function Nn(e) {
  if (e.defaultView === null || e.defaultView === void 0)
    return;
  let { prevStyle: t, styleSheet: n } = yr.get(e) ?? {};
  n === void 0 && (n = new e.defaultView.CSSStyleSheet(), e.adoptedStyleSheets && (Object.isExtensible(e.adoptedStyleSheets) ? e.adoptedStyleSheets.push(n) : e.adoptedStyleSheets = [
    ...e.adoptedStyleSheets,
    n
  ]));
  const r = We();
  switch (r.state) {
    case "active":
    case "hover": {
      const o = Bc({
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
  yr.set(e, {
    prevStyle: t,
    styleSheet: n
  });
}
let we = /* @__PURE__ */ new Map();
const Po = new yo();
function Hc(e) {
  we = new Map(we), we.delete(e);
}
function vr(e, t) {
  for (const [n] of we)
    if (n.id === e)
      return n;
}
function De(e, t) {
  for (const [n, r] of we)
    if (n.id === e)
      return r;
  if (t)
    throw Error(`Could not find data for Group with id ${e}`);
}
function qe() {
  return we;
}
function _n(e, t) {
  return Po.addListener("groupChange", (n) => {
    n.group.id === e && t(n);
  });
}
function ke(e, t, n) {
  const r = we.get(e);
  we = new Map(we), we.set(e, t), Po.emit("groupChange", {
    group: e,
    isUserInteraction: (n == null ? void 0 : n.isUserInteraction) === !0,
    prev: r,
    next: t
  });
}
function Io(e) {
  const t = We();
  let n = !1;
  switch (t.state) {
    case "active":
      at({
        cursorFlags: 0,
        state: "inactive"
      }), t.hitRegions.length > 0 && (Nn(e), n = !0, t.hitRegions.forEach((r) => {
        const o = De(r.group.id, !0);
        ke(r.group, o, {
          isUserInteraction: !0
        });
      }));
  }
  return n;
}
function wr(e) {
  e.defaultPrevented || Io(e.currentTarget);
}
function Wc(e, t, n) {
  let r, o = {
    x: 1 / 0,
    y: 1 / 0
  };
  for (const a of t) {
    const s = go(n, a.rect);
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
function Vc(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}
function Jc(e, t) {
  if (e === t) throw new Error("Cannot compare node with itself");
  const n = {
    a: Pr(e),
    b: Pr(t)
  };
  let r;
  for (; n.a.at(-1) === n.b.at(-1); )
    r = n.a.pop(), n.b.pop();
  X(
    r,
    "Stacking order can only be calculated for elements with a common ancestor"
  );
  const o = {
    a: Rr(Sr(n.a)),
    b: Rr(Sr(n.b))
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
const qc = /\b(?:position|zIndex|opacity|transform|webkitTransform|mixBlendMode|filter|webkitFilter|isolation)\b/;
function Gc(e) {
  const t = getComputedStyle(Eo(e) ?? e).display;
  return t === "flex" || t === "inline-flex";
}
function Kc(e) {
  const t = getComputedStyle(e);
  return !!(t.position === "fixed" || t.zIndex !== "auto" && (t.position !== "static" || Gc(e)) || +t.opacity < 1 || "transform" in t && t.transform !== "none" || "webkitTransform" in t && t.webkitTransform !== "none" || "mixBlendMode" in t && t.mixBlendMode !== "normal" || "filter" in t && t.filter !== "none" || "webkitFilter" in t && t.webkitFilter !== "none" || "isolation" in t && t.isolation === "isolate" || qc.test(t.willChange) || t.webkitOverflowScrolling === "touch");
}
function Sr(e) {
  let t = e.length;
  for (; t--; ) {
    const n = e[t];
    if (X(n, "Missing node"), Kc(n)) return n;
  }
  return null;
}
function Rr(e) {
  return e && Number(getComputedStyle(e).zIndex) || 0;
}
function Pr(e) {
  const t = [];
  for (; e; )
    t.push(e), e = Eo(e);
  return t;
}
function Eo(e) {
  const { parentNode: t } = e;
  return Vc(t) ? t.host : t;
}
function Zc(e, t) {
  return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function Yc({
  groupElement: e,
  hitRegion: t,
  pointerEventTarget: n
}) {
  if (!po(n) || n.contains(e) || e.contains(n))
    return !0;
  if (Jc(n, e) > 0) {
    let r = n;
    for (; r; ) {
      if (r.contains(e))
        return !0;
      if (Zc(r.getBoundingClientRect(), t))
        return !1;
      r = r.parentElement;
    }
  }
  return !0;
}
function Ln(e, t) {
  const n = [];
  return t.forEach((r, o) => {
    if (o.disabled)
      return;
    const a = bo(o), s = Wc(o.orientation, a, {
      x: e.clientX,
      y: e.clientY
    });
    s && s.distance.x <= 0 && s.distance.y <= 0 && Yc({
      groupElement: o.element,
      hitRegion: s.hitRegion.rect,
      pointerEventTarget: e.target
    }) && n.push(s.hitRegion);
  }), n;
}
function Xc(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] != t[n])
      return !1;
  return !0;
}
function de(e, t, n = 0) {
  return Math.abs(fe(e) - fe(t)) <= n;
}
function ve(e, t) {
  return de(e, t) ? 0 : e > t ? 1 : -1;
}
function rt({
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
  if (ve(r, i) < 0)
    if (a) {
      const l = (o + i) / 2;
      ve(r, l) < 0 ? r = o : r = i;
    } else
      r = i;
  return r = Math.min(c, r), r = fe(r), r;
}
function vt({
  delta: e,
  initialLayout: t,
  panelConstraints: n,
  pivotIndices: r,
  prevLayout: o,
  trigger: a
}) {
  if (de(e, 0))
    return t;
  const s = a === "imperative-api", c = Object.values(t), i = Object.values(o), l = [...c], [u, d] = r;
  X(u != null, "Invalid first pivot index"), X(d != null, "Invalid second pivot index");
  let f = 0;
  switch (a) {
    case "keyboard": {
      {
        const m = e < 0 ? d : u, y = n[m];
        X(
          y,
          `Panel constraints not found for index ${m}`
        );
        const {
          collapsedSize: b = 0,
          collapsible: S,
          minSize: R = 0
        } = y;
        if (S) {
          const p = c[m];
          if (X(
            p != null,
            `Previous layout not found for panel index ${m}`
          ), de(p, b)) {
            const w = R - p;
            ve(w, Math.abs(e)) > 0 && (e = e < 0 ? 0 - w : w);
          }
        }
      }
      {
        const m = e < 0 ? u : d, y = n[m];
        X(
          y,
          `No panel constraints found for index ${m}`
        );
        const {
          collapsedSize: b = 0,
          collapsible: S,
          minSize: R = 0
        } = y;
        if (S) {
          const p = c[m];
          if (X(
            p != null,
            `Previous layout not found for panel index ${m}`
          ), de(p, R)) {
            const w = p - b;
            ve(w, Math.abs(e)) > 0 && (e = e < 0 ? 0 - w : w);
          }
        }
      }
      break;
    }
    default: {
      const m = e < 0 ? d : u, y = n[m];
      X(
        y,
        `Panel constraints not found for index ${m}`
      );
      const b = c[m], { collapsible: S, collapsedSize: R, minSize: p } = y;
      if (S && ve(b, p) < 0)
        if (e > 0) {
          const w = p - R, T = w / 2, N = b + e;
          ve(N, p) < 0 && (e = ve(e, T) <= 0 ? 0 : w);
        } else {
          const w = p - R, T = 100 - w / 2, N = b - e;
          ve(N, p) < 0 && (e = ve(100 + e, T) > 0 ? 0 : -w);
        }
      break;
    }
  }
  {
    const m = e < 0 ? 1 : -1;
    let y = e < 0 ? d : u, b = 0;
    for (; ; ) {
      const R = c[y];
      X(
        R != null,
        `Previous layout not found for panel index ${y}`
      );
      const p = rt({
        overrideDisabledPanels: s,
        panelConstraints: n[y],
        prevSize: R,
        size: 100
      }) - R;
      if (b += p, y += m, y < 0 || y >= n.length)
        break;
    }
    const S = Math.min(Math.abs(e), Math.abs(b));
    e = e < 0 ? 0 - S : S;
  }
  {
    let m = e < 0 ? u : d;
    for (; m >= 0 && m < n.length; ) {
      const y = Math.abs(e) - Math.abs(f), b = c[m];
      X(
        b != null,
        `Previous layout not found for panel index ${m}`
      );
      const S = b - y, R = rt({
        overrideDisabledPanels: s,
        panelConstraints: n[m],
        prevSize: b,
        size: S
      });
      if (!de(b, R) && (f += b - R, l[m] = R, f.toFixed(3).localeCompare(Math.abs(e).toFixed(3), void 0, {
        numeric: !0
      }) >= 0))
        break;
      e < 0 ? m-- : m++;
    }
  }
  if (Xc(i, l))
    return o;
  {
    const m = e < 0 ? d : u, y = c[m];
    X(
      y != null,
      `Previous layout not found for panel index ${m}`
    );
    const b = y + f, S = rt({
      overrideDisabledPanels: s,
      panelConstraints: n[m],
      prevSize: y,
      size: b
    });
    if (l[m] = S, !de(S, b)) {
      let R = b - S, p = e < 0 ? d : u;
      for (; p >= 0 && p < n.length; ) {
        const w = l[p];
        X(
          w != null,
          `Previous layout not found for panel index ${p}`
        );
        const T = w + R, N = rt({
          overrideDisabledPanels: s,
          panelConstraints: n[p],
          prevSize: w,
          size: T
        });
        if (de(w, N) || (R -= N - w, l[p] = N), de(R, 0))
          break;
        e > 0 ? p-- : p++;
      }
    }
  }
  const h = Object.values(l).reduce(
    (m, y) => y + m,
    0
  );
  if (!de(h, 100, 0.1))
    return o;
  const g = Object.keys(o);
  return l.reduce((m, y, b) => (m[g[b]] = y, m), {});
}
function Ve(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (t[n] === void 0 || ve(e[n], t[n]) !== 0)
      return !1;
  return !0;
}
function Je({
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
  if (!de(o, 100) && r.length > 0)
    for (let c = 0; c < t.length; c++) {
      const i = r[c];
      X(i != null, `No layout data found for index ${c}`);
      const l = 100 / o * i;
      r[c] = l;
    }
  let a = 0;
  for (let c = 0; c < t.length; c++) {
    const i = n[c];
    X(i != null, `No layout data found for index ${c}`);
    const l = r[c];
    X(l != null, `No layout data found for index ${c}`);
    const u = rt({
      overrideDisabledPanels: !0,
      panelConstraints: t[c],
      prevSize: i,
      size: l
    });
    l != u && (a += l - u, r[c] = u);
  }
  if (!de(a, 0))
    for (let c = 0; c < t.length; c++) {
      const i = r[c];
      X(i != null, `No layout data found for index ${c}`);
      const l = i + a, u = rt({
        overrideDisabledPanels: !0,
        panelConstraints: t[c],
        prevSize: i,
        size: l
      });
      if (i !== u && (a -= u - i, r[c] = u, de(a, 0)))
        break;
    }
  const s = Object.keys(e);
  return r.reduce((c, i, l) => (c[s[l]] = i, c), {});
}
function To({
  groupId: e,
  panelId: t
}) {
  const n = () => {
    const i = qe();
    for (const [
      l,
      {
        defaultLayoutDeferred: u,
        derivedPanelConstraints: d,
        layout: f,
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
          layout: f,
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
    const f = a(), h = l.findIndex((y) => y.id === t), g = h === 0, m = h === l.length - 1;
    if (m && i < f && (g || l.slice(0, h).every((y, b) => {
      const S = d[b];
      return (S == null ? void 0 : S.collapsible) && de(S.collapsedSize, u[S.panelId]);
    }))) {
      const y = l.slice(0, h).reduce((b, S) => b + u[S.id], 0);
      return {
        ...u,
        [t]: fe(100 - y)
      };
    }
    return vt({
      delta: m ? f - i : i - f,
      initialLayout: u,
      panelConstraints: d,
      pivotIndices: m ? [h - 1, h] : [h, h + 1],
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
      group: f,
      groupSize: h,
      layout: g,
      separatorToPanels: m
    } = n(), y = s({
      nextSize: i,
      panels: f.panels,
      prevLayout: g,
      derivedPanelConstraints: d
    }), b = Je({
      layout: y,
      panelConstraints: d
    });
    Ve(g, b) || ke(f, {
      defaultLayoutDeferred: u,
      derivedPanelConstraints: d,
      groupSize: h,
      layout: b,
      separatorToPanels: m
    });
  };
  return {
    collapse: () => {
      const { collapsible: i, collapsedSize: l } = r(), { mutableValues: u } = o(), d = a();
      i && d !== l && (u.expandToSize = d, c(l));
    },
    expand: () => {
      const { collapsible: i, collapsedSize: l, minSize: u } = r(), { mutableValues: d } = o(), f = a();
      if (i && f === l) {
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
      return i && de(l, u);
    },
    resize: (i) => {
      const { group: l } = n(), { element: u } = o(), d = it({ group: l }), f = ht({
        groupSize: d,
        panelElement: u,
        styleProp: i
      }), h = fe(f / d * 100);
      c(h);
    }
  };
}
function Ir(e) {
  if (e.defaultPrevented)
    return;
  const t = qe();
  Ln(e, t).forEach((n) => {
    if (n.separator && !n.separator.disableDoubleClick) {
      const r = n.panels.find(
        (o) => o.panelConstraints.defaultSize !== void 0
      );
      if (r) {
        const o = r.panelConstraints.defaultSize, a = To({
          groupId: n.group.id,
          panelId: r.id
        });
        a && o !== void 0 && (a.resize(o), e.preventDefault());
      }
    }
  });
}
function _t(e) {
  const t = qe();
  for (const [n] of t)
    if (n.separators.some(
      (r) => r.element === e
    ))
      return n;
  throw Error("Could not find parent Group for separator element");
}
function ko({
  groupId: e
}) {
  const t = () => {
    const n = qe();
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
      } = t(), l = Je({
        layout: n,
        panelConstraints: o
      });
      return r ? c : (Ve(c, l) || ke(a, {
        defaultLayoutDeferred: r,
        derivedPanelConstraints: o,
        groupSize: s,
        layout: l,
        separatorToPanels: i
      }), l);
    }
  };
}
function Fe(e, t) {
  const n = _t(e), r = De(n.id, !0), o = n.separators.find(
    (u) => u.element === e
  );
  X(o, "Matching separator not found");
  const a = r.separatorToPanels.get(o);
  X(a, "Matching panels not found");
  const s = a.map((u) => n.panels.indexOf(u)), c = ko({ groupId: n.id }).getLayout(), i = vt({
    delta: t,
    initialLayout: c,
    panelConstraints: r.derivedPanelConstraints,
    pivotIndices: s,
    prevLayout: c,
    trigger: "keyboard"
  }), l = Je({
    layout: i,
    panelConstraints: r.derivedPanelConstraints
  });
  Ve(c, l) || ke(
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
function Er(e) {
  if (e.defaultPrevented)
    return;
  const t = e.currentTarget, n = _t(t);
  if (!n.disabled)
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault(), n.orientation === "vertical" && Fe(t, 5);
        break;
      }
      case "ArrowLeft": {
        e.preventDefault(), n.orientation === "horizontal" && Fe(t, -5);
        break;
      }
      case "ArrowRight": {
        e.preventDefault(), n.orientation === "horizontal" && Fe(t, 5);
        break;
      }
      case "ArrowUp": {
        e.preventDefault(), n.orientation === "vertical" && Fe(t, -5);
        break;
      }
      case "End": {
        e.preventDefault(), Fe(t, 100);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const r = _t(t), o = De(r.id, !0), { derivedPanelConstraints: a, layout: s, separatorToPanels: c } = o, i = r.separators.find(
          (f) => f.element === t
        );
        X(i, "Matching separator not found");
        const l = c.get(i);
        X(l, "Matching panels not found");
        const u = l[0], d = a.find(
          (f) => f.panelId === u.id
        );
        if (X(d, "Panel metadata not found"), d.collapsible) {
          const f = s[u.id], h = d.collapsedSize === f ? r.mutableState.expandedPanelSizes[u.id] ?? d.minSize : d.collapsedSize;
          Fe(t, h - f);
        }
        break;
      }
      case "F6": {
        e.preventDefault();
        const r = _t(t).separators.map(
          (s) => s.element
        ), o = Array.from(r).findIndex(
          (s) => s === e.currentTarget
        );
        X(o !== null, "Index not found");
        const a = e.shiftKey ? o > 0 ? o - 1 : r.length - 1 : o + 1 < r.length ? o + 1 : 0;
        r[a].focus({
          preventScroll: !0
        });
        break;
      }
      case "Home": {
        e.preventDefault(), Fe(t, -100);
        break;
      }
    }
}
function Tr(e) {
  if (e.defaultPrevented || e.pointerType === "mouse" && e.button > 0)
    return;
  const t = qe(), n = Ln(e, t), r = /* @__PURE__ */ new Map();
  let o = !1;
  n.forEach((a) => {
    a.separator && (o || (o = !0, a.separator.element.focus({
      // @ts-expect-error https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus#browser_compatibility
      focusVisible: !1,
      preventScroll: !0
    })));
    const s = t.get(a.group);
    s && r.set(a.group, s.layout);
  }), at({
    cursorFlags: 0,
    hitRegions: n,
    initialLayoutMap: r,
    pointerDownAtPoint: { x: e.clientX, y: e.clientY },
    state: "active"
  }), n.length && e.preventDefault();
}
function Mo({
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
    const { group: u, groupSize: d } = l, { orientation: f, panels: h } = u, { disableCursor: g } = u.mutableState;
    let m = 0;
    a ? f === "horizontal" ? m = (t.clientX - a.x) / d * 100 : m = (t.clientY - a.y) / d * 100 : f === "horizontal" ? m = t.clientX < 0 ? -100 : 100 : m = t.clientY < 0 ? -100 : 100;
    const y = r.get(u), b = o.get(u);
    if (!y || !b)
      return;
    const {
      defaultLayoutDeferred: S,
      derivedPanelConstraints: R,
      groupSize: p,
      layout: w,
      separatorToPanels: T
    } = b;
    if (R && w && T) {
      const N = vt({
        delta: m,
        initialLayout: y,
        panelConstraints: R,
        pivotIndices: l.panels.map((O) => h.indexOf(O)),
        prevLayout: w,
        trigger: "mouse-or-touch"
      });
      if (Ve(N, w)) {
        if (m !== 0 && !g)
          switch (f) {
            case "horizontal": {
              c |= m < 0 ? vo : wo;
              break;
            }
            case "vertical": {
              c |= m < 0 ? So : Ro;
              break;
            }
          }
      } else
        ke(l.group, {
          defaultLayoutDeferred: S,
          derivedPanelConstraints: R,
          groupSize: p,
          layout: N,
          separatorToPanels: T
        });
    }
  });
  let i = 0;
  t.movementX === 0 ? i |= s & pr : i |= c & pr, t.movementY === 0 ? i |= s & gr : i |= c & gr, jc(i), Nn(e);
}
function kr(e) {
  const t = qe(), n = We();
  switch (n.state) {
    case "active":
      Mo({
        document: e.currentTarget,
        event: e,
        hitRegions: n.hitRegions,
        initialLayoutMap: n.initialLayoutMap,
        mountedGroups: t,
        prevCursorFlags: n.cursorFlags
      });
  }
}
function Mr(e) {
  var r, o;
  if (e.defaultPrevented)
    return;
  const t = We(), n = qe();
  switch (t.state) {
    case "active": {
      if (
        // Skip this check for "pointerleave" events, else Firefox triggers a false positive (see #514)
        e.buttons === 0
      ) {
        at({
          cursorFlags: 0,
          state: "inactive"
        }), t.hitRegions.forEach((a) => {
          const s = De(a.group.id, !0);
          ke(a.group, s, {
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
      Mo({
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
      const a = Ln(e, n);
      a.length === 0 ? t.state !== "inactive" && at({
        cursorFlags: 0,
        state: "inactive"
      }) : at({
        cursorFlags: 0,
        hitRegions: a,
        state: "hover"
      }), Nn(e.currentTarget);
      break;
    }
  }
}
function Ar(e) {
  if (e.relatedTarget instanceof HTMLIFrameElement)
    switch (We().state) {
      case "hover":
        at({
          cursorFlags: 0,
          state: "inactive"
        });
    }
}
function Nr(e) {
  e.defaultPrevented || e.pointerType === "mouse" && e.button > 0 || Io(e.currentTarget) && e.preventDefault();
}
function _r(e) {
  let t = 0, n = 0;
  const r = {};
  for (const a of e)
    if (a.defaultSize !== void 0) {
      t++;
      const s = fe(a.defaultSize);
      n += s, r[a.panelId] = s;
    } else
      r[a.panelId] = void 0;
  const o = e.length - t;
  if (o !== 0) {
    const a = fe((100 - n) / o);
    for (const s of e)
      s.defaultSize === void 0 && (r[s.panelId] = a);
  }
  return r;
}
function Qc(e, t, n) {
  if (!n[0])
    return;
  const r = e.panels.find((i) => i.element === t);
  if (!r || !r.onResize)
    return;
  const o = it({ group: e }), a = e.orientation === "horizontal" ? r.element.offsetWidth : r.element.offsetHeight, s = r.mutableValues.prevSize, c = {
    asPercentage: fe(a / o * 100),
    inPixels: a
  };
  r.mutableValues.prevSize = c, r.onResize(c, r.id, s);
}
function el(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function tl({
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
    const f = r[d.id] ?? 0;
    switch (d.panelConstraints.groupResizeBehavior) {
      case "preserve-pixel-size": {
        s = !0;
        const h = f / 100 * n, g = fe(
          h / t * 100
        );
        c.set(d.id, g), o += g;
        break;
      }
      case "preserve-relative-size":
      default: {
        i.push(d.id), a += f;
        break;
      }
    }
  }
  if (!s || i.length === 0)
    return r;
  const l = 100 - o, u = { ...r };
  if (c.forEach((d, f) => {
    u[f] = d;
  }), a > 0)
    for (const d of i) {
      const f = r[d] ?? 0;
      u[d] = fe(
        f / a * l
      );
    }
  else {
    const d = fe(
      l / i.length
    );
    for (const f of i)
      u[f] = d;
  }
  return u;
}
function nl(e, t) {
  const n = e.map((o) => o.id), r = Object.keys(t);
  if (n.length !== r.length)
    return !1;
  for (const o of n)
    if (!r.includes(o))
      return !1;
  return !0;
}
const et = /* @__PURE__ */ new Map();
function rl(e) {
  let t = !0;
  X(
    e.element.ownerDocument.defaultView,
    "Cannot register an unmounted Group"
  );
  const n = e.element.ownerDocument.defaultView.ResizeObserver, r = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), a = new n((g) => {
    for (const m of g) {
      const { borderBoxSize: y, target: b } = m;
      if (b === e.element) {
        if (t) {
          const S = it({ group: e });
          if (S === 0)
            return;
          const R = De(e.id);
          if (!R)
            return;
          const p = fn(e), w = R.defaultLayoutDeferred ? _r(p) : R.layout, T = tl({
            group: e,
            nextGroupSize: S,
            prevGroupSize: R.groupSize,
            prevLayout: w
          }), N = Je({
            layout: T,
            panelConstraints: p
          });
          if (!R.defaultLayoutDeferred && Ve(R.layout, N) && el(
            R.derivedPanelConstraints,
            p
          ) && R.groupSize === S)
            return;
          ke(e, {
            defaultLayoutDeferred: !1,
            derivedPanelConstraints: p,
            groupSize: S,
            layout: N,
            separatorToPanels: R.separatorToPanels
          });
        }
      } else
        Qc(e, b, y);
    }
  });
  a.observe(e.element), e.panels.forEach((g) => {
    X(
      !r.has(g.id),
      `Panel ids must be unique; id "${g.id}" was used more than once`
    ), r.add(g.id), g.onResize && a.observe(g.element);
  });
  const s = it({ group: e }), c = fn(e), i = e.panels.map(({ id: g }) => g).join(",");
  let l = e.mutableState.defaultLayout;
  l && (nl(e.panels, l) || (l = void 0));
  const u = e.mutableState.layouts[i] ?? l ?? _r(c), d = Je({
    layout: u,
    panelConstraints: c
  }), f = e.element.ownerDocument;
  et.set(
    f,
    (et.get(f) ?? 0) + 1
  );
  const h = /* @__PURE__ */ new Map();
  return bo(e).forEach((g) => {
    g.separator && h.set(g.separator, g.panels);
  }), ke(e, {
    defaultLayoutDeferred: s === 0,
    derivedPanelConstraints: c,
    groupSize: s,
    layout: d,
    separatorToPanels: h
  }), e.separators.forEach((g) => {
    X(
      !o.has(g.id),
      `Separator ids must be unique; id "${g.id}" was used more than once`
    ), o.add(g.id), g.element.addEventListener("keydown", Er);
  }), et.get(f) === 1 && (f.addEventListener("contextmenu", wr, !0), f.addEventListener("dblclick", Ir, !0), f.addEventListener("pointerdown", Tr, !0), f.addEventListener("pointerleave", kr), f.addEventListener("pointermove", Mr), f.addEventListener("pointerout", Ar), f.addEventListener("pointerup", Nr, !0)), function() {
    t = !1, et.set(
      f,
      Math.max(0, (et.get(f) ?? 0) - 1)
    ), Hc(e), e.separators.forEach((g) => {
      g.element.removeEventListener("keydown", Er);
    }), et.get(f) || (f.removeEventListener(
      "contextmenu",
      wr,
      !0
    ), f.removeEventListener(
      "dblclick",
      Ir,
      !0
    ), f.removeEventListener(
      "pointerdown",
      Tr,
      !0
    ), f.removeEventListener("pointerleave", kr), f.removeEventListener("pointermove", Mr), f.removeEventListener("pointerout", Ar), f.removeEventListener("pointerup", Nr, !0)), a.disconnect();
  };
}
function ol() {
  const [e, t] = _({}), n = $(() => t({}), []);
  return [e, n];
}
function Cn(e) {
  const t = Or();
  return `${e ?? t}`;
}
const Ge = typeof window < "u" ? Me : z;
function pt(e) {
  const t = M(e);
  return Ge(() => {
    t.current = e;
  }, [e]), $(
    (...n) => {
      var r;
      return (r = t.current) == null ? void 0 : r.call(t, ...n);
    },
    [t]
  );
}
function Dn(...e) {
  return pt((t) => {
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
function xn(e) {
  const t = M({ ...e });
  return Ge(() => {
    for (const n in e)
      t.current[n] = e[n];
  }, [e]), t.current;
}
const Ao = yn(null);
function al(e, t) {
  const n = M({
    getLayout: () => ({}),
    setLayout: Uc
  });
  wn(t, () => n.current, []), Ge(() => {
    Object.assign(
      n.current,
      ko({ groupId: e })
    );
  });
}
function No({
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
  style: f,
  ...h
}) {
  const g = M({
    onLayoutChange: {},
    onLayoutChanged: {}
  }), m = pt((P) => {
    Ve(g.current.onLayoutChange, P) || (g.current.onLayoutChange = P, i == null || i(P));
  }), y = pt(
    (P, I) => {
      Ve(g.current.onLayoutChanged, P) || (g.current.onLayoutChanged = P, l == null || l(P, { isUserInteraction: I }));
    }
  ), b = Cn(c), S = M(null), [R, p] = ol(), w = M({
    lastExpandedPanelSizes: {},
    layouts: {},
    panels: [],
    resizeTargetMinimumSize: d,
    separators: []
  }), T = Dn(S, a);
  al(b, s);
  const N = pt(
    (P, I) => {
      const E = We(), k = vr(P), F = De(P);
      if (F) {
        let K = !1;
        switch (E.state) {
          case "active": {
            K = E.hitRegions.some(
              (D) => D.group === k
            );
            break;
          }
        }
        return {
          flexGrow: F.layout[I] ?? 1,
          pointerEvents: K ? "none" : void 0
        };
      }
      if (n != null && n[I])
        return {
          flexGrow: n == null ? void 0 : n[I]
        };
    }
  ), O = xn({
    defaultLayout: n,
    disableCursor: r
  }), L = Y(
    () => ({
      get disableCursor() {
        return !!O.disableCursor;
      },
      getPanelStyles: N,
      id: b,
      orientation: u,
      registerPanel: (P) => {
        const I = w.current;
        return I.panels = mn(u, [
          ...I.panels,
          P
        ]), p(), () => {
          I.panels = I.panels.filter(
            (E) => E !== P
          ), p();
        };
      },
      registerSeparator: (P) => {
        const I = w.current;
        return I.separators = mn(u, [
          ...I.separators,
          P
        ]), p(), () => {
          I.separators = I.separators.filter(
            (E) => E !== P
          ), p();
        };
      },
      updatePanelProps: (P, { disabled: I }) => {
        const E = w.current.panels.find(
          (K) => K.id === P
        );
        E && (E.panelConstraints.disabled = I);
        const k = vr(b), F = De(b);
        k && F && ke(k, {
          ...F,
          derivedPanelConstraints: fn(k)
        });
      },
      updateSeparatorProps: (P, {
        disabled: I,
        disableDoubleClick: E
      }) => {
        const k = w.current.separators.find(
          (F) => F.id === P
        );
        k && (k.disabled = I, k.disableDoubleClick = E);
      }
    }),
    [N, b, p, u, O]
  ), C = M(null);
  return Ge(() => {
    const P = S.current;
    if (P === null)
      return;
    const I = w.current;
    let E;
    if (O.defaultLayout !== void 0 && Object.keys(O.defaultLayout).length === I.panels.length) {
      E = {};
      for (const V of I.panels) {
        const ne = O.defaultLayout[V.id];
        ne !== void 0 && (E[V.id] = ne);
      }
    }
    const k = {
      disabled: !!o,
      element: P,
      id: b,
      mutableState: {
        defaultLayout: E,
        disableCursor: !!O.disableCursor,
        expandedPanelSizes: w.current.lastExpandedPanelSizes,
        layouts: w.current.layouts
      },
      orientation: u,
      panels: I.panels,
      resizeTargetMinimumSize: I.resizeTargetMinimumSize,
      separators: I.separators
    };
    C.current = k;
    const F = rl(k), { defaultLayoutDeferred: K, derivedPanelConstraints: D, layout: q } = De(k.id, !0);
    !K && D.length > 0 && (m(q), y(q, !1));
    const B = _n(b, (V) => {
      const { defaultLayoutDeferred: ne, derivedPanelConstraints: me, layout: re } = V.next;
      if (ne || me.length === 0)
        return;
      const oe = k.panels.map(({ id: U }) => U).join(",");
      k.mutableState.layouts[oe] = re, me.forEach((U) => {
        if (U.collapsible) {
          const { layout: Z } = V.prev ?? {};
          if (Z) {
            const pe = de(
              U.collapsedSize,
              re[U.panelId]
            ), ae = de(
              U.collapsedSize,
              Z[U.panelId]
            );
            pe && !ae && (k.mutableState.expandedPanelSizes[U.panelId] = Z[U.panelId]);
          }
        }
      });
      const j = We().state !== "active";
      m(re), j && y(re, V.isUserInteraction);
    });
    return () => {
      C.current = null, F(), B();
    };
  }, [
    o,
    b,
    y,
    m,
    u,
    R,
    O
  ]), z(() => {
    const P = C.current;
    P && (P.mutableState.defaultLayout = n, P.mutableState.disableCursor = !!r);
  }), /* @__PURE__ */ v(Ao.Provider, { value: L, children: /* @__PURE__ */ v(
    "div",
    {
      ...h,
      className: t,
      "data-group": !0,
      "data-testid": b,
      id: b,
      ref: T,
      style: {
        height: "100%",
        width: "100%",
        overflow: "hidden",
        ...f,
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
No.displayName = "Group";
function zn() {
  const e = vn(Ao);
  return X(
    e,
    "Group Context not found; did you render a Panel or Separator outside of a Group?"
  ), e;
}
function sl(e, t) {
  const { id: n } = zn(), r = M({
    collapse: Xt,
    expand: Xt,
    getSize: () => ({
      asPercentage: 0,
      inPixels: 0
    }),
    isCollapsed: () => !1,
    resize: Xt
  });
  wn(t, () => r.current, []), Ge(() => {
    Object.assign(
      r.current,
      To({ groupId: n, panelId: e })
    );
  });
}
function hn({
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
  panelRef: f,
  style: h,
  ...g
}) {
  const m = !!i, y = Cn(i), b = xn({
    disabled: a
  }), S = M(null), R = Dn(S, s), {
    getPanelStyles: p,
    id: w,
    orientation: T,
    registerPanel: N,
    updatePanelProps: O
  } = zn(), L = d !== null, C = pt(
    (k, F, K) => {
      d == null || d(k, i, K);
    }
  );
  Ge(() => {
    const k = S.current;
    if (k !== null) {
      const F = {
        element: k,
        id: y,
        idIsStable: m,
        mutableValues: {
          expandToSize: void 0,
          prevSize: void 0
        },
        onResize: L ? C : void 0,
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
      return N(F);
    }
  }, [
    c,
    n,
    r,
    o,
    L,
    y,
    m,
    l,
    u,
    C,
    N,
    b
  ]), z(() => {
    O(y, { disabled: a });
  }, [a, y, O]), sl(y, f);
  const P = () => {
    const k = p(w, y);
    if (k)
      return JSON.stringify(k);
  }, I = zr(
    (k) => _n(w, k),
    P,
    P
  );
  let E;
  return I ? E = JSON.parse(I) : o !== void 0 ? E = {
    flexGrow: void 0,
    flexShrink: void 0,
    flexBasis: o
  } : E = { flexGrow: 1 }, /* @__PURE__ */ v(
    "div",
    {
      ...g,
      "data-disabled": a || void 0,
      "data-panel": !0,
      "data-testid": y,
      id: y,
      ref: R,
      style: {
        ...il,
        display: "flex",
        flexBasis: 0,
        flexShrink: 1,
        overflow: "visible",
        ...E
      },
      children: /* @__PURE__ */ v(
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
            touchAction: T === "horizontal" ? "pan-y" : "pan-x"
          },
          children: e
        }
      )
    }
  );
}
hn.displayName = "Panel";
const il = {
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
function cl({
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
    a = Je({
      layout: vt({
        delta: l - s,
        initialLayout: e,
        panelConstraints: t,
        pivotIndices: u,
        prevLayout: e
      }),
      panelConstraints: t
    })[n], o = Je({
      layout: vt({
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
function _o({
  children: e,
  className: t,
  disabled: n,
  disableDoubleClick: r,
  elementRef: o,
  id: a,
  style: s,
  ...c
}) {
  const i = Cn(a), l = xn({
    disabled: n,
    disableDoubleClick: r
  }), [u, d] = _({}), [f, h] = _("inactive"), [g, m] = _(!1), y = M(null), b = Dn(y, o), {
    disableCursor: S,
    id: R,
    orientation: p,
    registerSeparator: w,
    updateSeparatorProps: T
  } = zn(), N = p === "horizontal" ? "vertical" : "horizontal";
  Ge(() => {
    const C = y.current;
    if (C !== null) {
      const P = {
        disabled: l.disabled,
        disableDoubleClick: l.disableDoubleClick,
        element: C,
        id: i
      }, I = w(P), E = $c(
        (F) => {
          h(
            F.next.state !== "inactive" && F.next.hitRegions.some(
              (K) => K.separator === P
            ) ? F.next.state : "inactive"
          );
        }
      ), k = _n(
        R,
        (F) => {
          const { derivedPanelConstraints: K, layout: D, separatorToPanels: q } = F.next, B = q.get(P);
          if (B) {
            const V = B[0], ne = B.indexOf(V);
            d(
              cl({
                layout: D,
                panelConstraints: K,
                panelId: V.id,
                panelIndex: ne
              })
            );
          }
        }
      );
      return () => {
        E(), k(), I();
      };
    }
  }, [R, i, w, l]), z(() => {
    T(i, { disabled: n, disableDoubleClick: r });
  }, [n, r, i, T]);
  let O;
  n && !S && (O = "not-allowed");
  let L;
  if (n)
    L = "disabled";
  else
    switch (f) {
      case "active": {
        L = "active";
        break;
      }
      default:
        g ? L = "focus" : L = f;
    }
  return /* @__PURE__ */ v(
    "div",
    {
      ...c,
      "aria-controls": u.valueControls,
      "aria-disabled": n || void 0,
      "aria-orientation": N,
      "aria-valuemax": u.valueMax,
      "aria-valuemin": u.valueMin,
      "aria-valuenow": u.valueNow,
      children: e,
      className: t,
      "data-separator": L,
      "data-testid": i,
      id: i,
      onBlur: () => m(!1),
      onFocus: () => m(!0),
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
_o.displayName = "Separator";
const On = 30, Fn = 65, wt = 50, ll = 100 - Fn, ul = 100 - On;
function dl(e) {
  const t = Number(e);
  return Number.isFinite(t) ? Math.min(Fn, Math.max(On, t)) : wt;
}
function $n(e) {
  return 100 - e;
}
function tt(e) {
  return `${e}%`;
}
const jn = "reader-document", St = "reader-assistant", Lo = "retainpdf.reader.ai-split-layout.v1", fl = {
  [jn]: $n(wt),
  [St]: wt
};
function Un(e) {
  const t = dl(e == null ? void 0 : e[St]);
  return {
    [jn]: $n(t),
    [St]: t
  };
}
function ml() {
  try {
    const e = JSON.parse(localStorage.getItem(Lo) || "null");
    return Un(e);
  } catch {
    return fl;
  }
}
function hl(e) {
  try {
    localStorage.setItem(Lo, JSON.stringify(Un(e)));
  } catch {
  }
}
function Qt(e, t) {
  const n = e == null ? void 0 : e.closest(".reader-react-root");
  if (!n) return;
  const r = Un(t);
  n.style.setProperty(
    "--reader-ai-split-width",
    `${r[St]}vw`
  );
}
function pl() {
  const e = M(null), [t] = _(ml);
  Me(() => {
    const o = e.current;
    return Qt(o, t), () => {
      var a;
      (a = o == null ? void 0 : o.closest(".reader-react-root")) == null || a.style.removeProperty("--reader-ai-split-width");
    };
  }, [t]);
  const n = $((o) => {
    Qt(e.current, o);
  }, []), r = $((o, a) => {
    Qt(e.current, o), a.isUserInteraction && hl(o);
  }, []);
  return /* @__PURE__ */ x(
    No,
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
        /* @__PURE__ */ v(
          hn,
          {
            id: jn,
            defaultSize: tt($n(wt)),
            minSize: tt(ll),
            maxSize: tt(ul)
          }
        ),
        /* @__PURE__ */ v(
          _o,
          {
            id: "reader-ai-split-separator",
            className: "reader-ai-split-separator",
            "aria-label": "调整文档与 AI 问答宽度",
            children: /* @__PURE__ */ v("span", { "aria-hidden": "true" })
          }
        ),
        /* @__PURE__ */ v(
          hn,
          {
            id: St,
            defaultSize: tt(wt),
            minSize: tt(On),
            maxSize: tt(Fn)
          }
        )
      ]
    }
  );
}
function gl({
  regionsFailed: e = !1,
  metadataFailed: t = !1
}) {
  const [n, r] = _(!1);
  if (z(() => {
    !e && !t && r(!1);
  }, [e, t]), n || !e && !t)
    return null;
  const o = [
    e ? "译文区域" : "",
    t ? "阅读元数据" : ""
  ].filter(Boolean);
  return /* @__PURE__ */ x("div", { className: "reader-error-notice", role: "status", "data-reader-error-notice": "true", children: [
    /* @__PURE__ */ x("span", { className: "reader-error-notice-text", children: [
      o.join("、"),
      "加载失败，正文仍可正常阅读。"
    ] }),
    /* @__PURE__ */ v(
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
function bl({
  loading: e,
  failed: t,
  text: n,
  percent: r,
  regionsError: o = !1,
  metadataError: a = !1
}) {
  return !e && !t ? /* @__PURE__ */ v(gl, { regionsFailed: o, metadataFailed: a }) : /* @__PURE__ */ x(Be, { children: [
    e ? /* @__PURE__ */ v("div", { className: "reader-boot-loading", "data-reader-boot-loading": "true", children: /* @__PURE__ */ x("div", { className: "reader-boot-loading-card", children: [
      /* @__PURE__ */ v("div", { className: "reader-boot-loading-text", children: n }),
      /* @__PURE__ */ v("div", { className: "reader-boot-loading-track", children: /* @__PURE__ */ v(
        "span",
        {
          className: "reader-boot-loading-bar",
          style: { width: `${Math.max(0, Math.min(100, r))}%` }
        }
      ) })
    ] }) }) : null,
    t ? /* @__PURE__ */ v("div", { className: "reader-react-error", role: "alert", children: n }) : null
  ] });
}
function yl(e) {
  if (!(e instanceof HTMLElement)) return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
function vl() {
  const [e, t] = _(!1), n = Or(), r = M(null);
  return z(() => {
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
  }, [e]), z(() => {
    const o = (a) => {
      if (a.defaultPrevented || a.metaKey || a.ctrlKey || a.altKey || yl(a.target)) return;
      const s = a.key;
      if (s === "?" || s === "h" || s === "H" || s === "/") {
        if (s === "/" && !a.shiftKey)
          return;
        a.preventDefault(), t((c) => !c);
      }
    };
    return window.addEventListener("keydown", o), () => window.removeEventListener("keydown", o);
  }, []), /* @__PURE__ */ x("div", { className: "reader-react-shortcuts", ref: r, "data-reader-shortcuts": "", children: [
    /* @__PURE__ */ v(
      "button",
      {
        type: "button",
        className: `reader-react-hud-btn reader-react-shortcuts-btn${e ? " is-active" : ""}`,
        "aria-label": "快捷键说明",
        "aria-expanded": e,
        "aria-controls": n,
        title: "快捷键（H 或 ?）",
        onClick: () => t((o) => !o),
        children: /* @__PURE__ */ v(ea, { className: "reader-react-shortcuts-icon", size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
      }
    ),
    e ? /* @__PURE__ */ x(
      "div",
      {
        id: n,
        className: "reader-react-shortcuts-panel reader-floating-surface",
        role: "dialog",
        "aria-label": "阅读器快捷键",
        children: [
          /* @__PURE__ */ x("div", { className: "reader-react-shortcuts-head", children: [
            /* @__PURE__ */ v("strong", { children: "快捷键" }),
            /* @__PURE__ */ v(
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
          /* @__PURE__ */ v("div", { className: "reader-react-shortcuts-body", children: hi.map((o) => /* @__PURE__ */ x("section", { className: "reader-react-shortcuts-group", children: [
            /* @__PURE__ */ v("h3", { children: o.title }),
            /* @__PURE__ */ v("ul", { children: o.items.map((a) => /* @__PURE__ */ x("li", { children: [
              /* @__PURE__ */ v("kbd", { children: a.keys }),
              /* @__PURE__ */ v("span", { children: a.desc })
            ] }, `${o.title}-${a.keys}`)) })
          ] }, o.title)) }),
          /* @__PURE__ */ v("p", { className: "reader-react-shortcuts-foot", children: "在输入框内不会触发快捷键" })
        ]
      }
    ) : null
  ] });
}
const wl = ["source", "sideBySide", "translated"], Sl = { source: "", translated: "", sideBySide: "" };
function Rl(e) {
  if (e.sourceOnly || !e.jobId) {
    const t = Lt(e.sourceUrl), n = Lt(e.translatedUrl);
    return {
      source: t,
      translated: n,
      // sideBySide requires dedicated artifact; no fallback to source url
      sideBySide: ""
    };
  }
  return Sa({
    jobId: e.jobId,
    jobPayload: e.jobPayload,
    manifestPayload: e.manifestPayload
  });
}
function Pl(e) {
  const [t, n] = _(() => /* @__PURE__ */ new Set()), r = Y(
    () => e ? Rl(e) : Sl,
    [e]
  ), o = Y(
    () => wl.filter((s) => !(e != null && e.sourceOnly && s !== "source")),
    [e == null ? void 0 : e.sourceOnly]
  ), a = $(async (s) => {
    if (!e) return;
    const c = Lt(r[s]);
    if (!(!c || t.has(s)))
      try {
        const i = e.jobId ? wa(s, {
          jobId: e.jobId,
          jobPayload: e.jobPayload,
          manifestPayload: e.manifestPayload
        }) : `${e.sourceOnly ? "document" : "reader"}-${s}.pdf`;
        await Ra(
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
        Pa(l), n((u) => {
          const d = new Set(u);
          return d.delete(s), d;
        });
      }
  }, [r, t, e]);
  return { urls: r, downloadItems: o, busyActions: t, handleDownload: a };
}
const Il = {
  source: $r,
  sideBySide: jr,
  translated: Ur
}, El = {
  source: "原文",
  sideBySide: "对照",
  translated: "译文"
};
function Tl(e) {
  const t = xe(), n = e.download ?? (t == null ? void 0 : t.download), { urls: r, downloadItems: o, busyActions: a, handleDownload: s } = Pl(n), c = M(null);
  return z(() => {
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
  }, []), /* @__PURE__ */ x("details", { ref: c, className: "reader-download-actions", children: [
    /* @__PURE__ */ x("summary", { className: "reader-download-trigger", "aria-label": "下载 PDF", title: "下载 PDF", children: [
      /* @__PURE__ */ v(ta, { size: 15, strokeWidth: 2.1, "aria-hidden": !0 }),
      /* @__PURE__ */ v("span", { className: "reader-download-trigger-label", children: "下载" }),
      /* @__PURE__ */ v(na, { size: 13, strokeWidth: 2.2, "aria-hidden": !0, className: "reader-download-trigger-caret" })
    ] }),
    /* @__PURE__ */ v("div", { className: "reader-download-menu", role: "group", "aria-label": "下载 PDF", children: o.map((i) => {
      const l = $o[i], u = Lt(r[i]), d = a.has(i), f = !!u && !d, h = f ? "" : jo(i, r), g = Il[i];
      return /* @__PURE__ */ x(
        "button",
        {
          type: "button",
          id: `reader-download-${i}`,
          className: `reader-download-action${d ? " is-busy" : ""}`,
          disabled: !f,
          "aria-label": f ? `下载${l.label}` : h,
          onClick: () => {
            c.current && (c.current.open = !1), s(i);
          },
          children: [
            /* @__PURE__ */ v(g, { size: 15, strokeWidth: 2.1, "aria-hidden": !0 }),
            /* @__PURE__ */ x("span", { className: "reader-download-action-text", children: [
              /* @__PURE__ */ x("span", { className: "reader-download-action-label", children: [
                El[i],
                " PDF"
              ] }),
              h ? /* @__PURE__ */ v("span", { className: "reader-download-action-reason", children: h }) : null
            ] })
          ]
        },
        i
      );
    }) })
  ] });
}
const kl = "retainpdf:reader:bookmarks:v1:", Ml = 200;
function Bn() {
  try {
    return typeof globalThis.localStorage > "u" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
function Co(e) {
  const t = `${e || ""}`.trim();
  return t ? `${kl}${t}` : "";
}
function Al(e) {
  if (!e || typeof e != "object") return null;
  const t = e, n = Math.floor(Number(t.page));
  return !Number.isFinite(n) || n < 1 ? null : { page: n, label: `${t.label || ""}`.trim().slice(0, 120), createdAt: `${t.createdAt || ""}` };
}
function $t(e, t = Bn()) {
  const n = Co(e);
  if (!n || !t) return [];
  try {
    const r = JSON.parse(t.getItem(n) || "[]"), o = /* @__PURE__ */ new Map();
    for (const a of Array.isArray(r) ? r : []) {
      const s = Al(a);
      s && !o.has(s.page) && o.set(s.page, s);
    }
    return [...o.values()].sort((a, s) => a.page - s.page);
  } catch {
    return [];
  }
}
function pn(e, t, n) {
  const r = Co(e), o = [...t].sort((a, s) => a.page - s.page).slice(0, Ml);
  if (!r || !n) return o;
  try {
    n.setItem(r, JSON.stringify(o));
  } catch {
  }
  return o;
}
function Nl(e, t, n = "", { storage: r = Bn(), now: o = () => (/* @__PURE__ */ new Date()).toISOString() } = {}) {
  const a = $t(e, r), s = Math.floor(Number(t));
  return !Number.isFinite(s) || s < 1 ? a : a.some((c) => c.page === s) ? pn(e, a.filter((c) => c.page !== s), r) : pn(e, [...a, { page: s, label: `${n || ""}`.trim().slice(0, 120), createdAt: o() }], r);
}
function _l(e, t, n = Bn()) {
  return pn(e, $t(e, n).filter((r) => r.page !== t), n);
}
function Ll(e, t) {
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
function Cl({ filled: e }) {
  return /* @__PURE__ */ v("svg", { viewBox: "0 0 24 24", width: "15", height: "15", "aria-hidden": "true", fill: e ? "currentColor" : "none", children: /* @__PURE__ */ v("path", { d: "M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.6L6 20V5.5a1 1 0 0 1 1-1z", stroke: "currentColor", strokeWidth: "1.7", strokeLinejoin: "round" }) });
}
function Dl({ scope: e, currentPage: t, numPages: n, regions: r, onGoToPage: o }) {
  const [a, s] = _(() => $t(e)), [c, i] = _(!1), l = M(null);
  if (z(() => {
    s($t(e)), i(!1);
  }, [e]), z(() => {
    if (!c) return;
    const f = (g) => {
      l.current && !l.current.contains(g.target) && i(!1);
    }, h = (g) => {
      g.key === "Escape" && i(!1);
    };
    return document.addEventListener("pointerdown", f), document.addEventListener("keydown", h), () => {
      document.removeEventListener("pointerdown", f), document.removeEventListener("keydown", h);
    };
  }, [c]), !e || n <= 0) return null;
  const u = Math.min(Math.max(t, 1), n), d = a.some((f) => f.page === u);
  return /* @__PURE__ */ x("div", { className: "reader-react-hud-group reader-bookmarks", "aria-label": "书签", ref: l, children: [
    /* @__PURE__ */ v(
      "button",
      {
        type: "button",
        className: `reader-react-hud-btn reader-bookmark-toggle${d ? " is-marked" : ""}`,
        "aria-pressed": d,
        "aria-label": d ? `取消第 ${u} 页的书签` : `给第 ${u} 页加书签`,
        title: d ? "取消这一页的书签" : "给这一页加书签",
        onClick: () => s(Nl(e, u, Ll(r, u))),
        children: /* @__PURE__ */ v(Cl, { filled: d })
      }
    ),
    /* @__PURE__ */ v(
      "button",
      {
        type: "button",
        className: "reader-react-hud-btn reader-bookmark-list-btn",
        "aria-expanded": c,
        "aria-haspopup": "true",
        "aria-label": `书签列表，共 ${a.length} 个`,
        title: "书签列表",
        disabled: !a.length,
        onClick: () => i((f) => !f),
        children: a.length
      }
    ),
    c && a.length ? /* @__PURE__ */ v("div", { className: "reader-bookmark-popover", role: "dialog", "aria-label": "书签", children: /* @__PURE__ */ v("ol", { className: "reader-bookmark-list", children: a.map((f) => /* @__PURE__ */ x("li", { className: f.page === u ? "is-current" : "", children: [
      /* @__PURE__ */ x(
        "button",
        {
          type: "button",
          className: "reader-bookmark-jump",
          onClick: () => {
            o == null || o(Math.min(f.page, n)), i(!1);
          },
          children: [
            /* @__PURE__ */ x("span", { className: "reader-bookmark-page", children: [
              "第 ",
              f.page,
              " 页"
            ] }),
            f.label ? /* @__PURE__ */ v("span", { className: "reader-bookmark-label", children: f.label }) : null
          ]
        }
      ),
      /* @__PURE__ */ v(
        "button",
        {
          type: "button",
          className: "reader-bookmark-remove",
          "aria-label": `删除第 ${f.page} 页的书签`,
          onClick: () => s(_l(e, f.page)),
          children: "×"
        }
      )
    ] }, f.page)) }) }) : null
  ] });
}
function xl(e) {
  const t = xe(), n = fo(), { mode: r = "compare", modeControls: o } = e, a = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? Rt, s = e.onZoomChange ?? (t == null ? void 0 : t.onZoomChange) ?? (() => {
  }), c = e.currentPage ?? (n == null ? void 0 : n.currentPage) ?? 1, i = e.numPages ?? (n == null ? void 0 : n.numPages) ?? 0, l = e.onGoToPage ?? (t == null ? void 0 : t.goToPage), u = ps(a), d = a > Jr + 1e-3, f = a < Ot - 1e-3, h = nt(r, Ue()), g = h >= Ot ? "100%（铺满阅读区）" : "50%（半屏，对照铺满）", [m, y] = _(!1), [b, S] = _(`${c}`);
  z(() => {
    m || S(`${Math.min(Math.max(c, 1), Math.max(i, 1))}`);
  }, [c, i, m]);
  const R = () => {
    if (y(!1), !l || i <= 0)
      return;
    const p = Number(`${b}`.trim());
    l(Ft(p, i));
  };
  return /* @__PURE__ */ x("div", { className: "reader-react-hud", "data-reader-hud": "true", children: [
    o ? /* @__PURE__ */ v("div", { className: "reader-react-hud-group reader-react-hud-modes", children: o }) : null,
    /* @__PURE__ */ v("div", { className: "reader-react-hud-group", "aria-label": "页码", children: m ? /* @__PURE__ */ x(
      "form",
      {
        className: "reader-react-hud-page-form",
        onSubmit: (p) => {
          p.preventDefault(), R();
        },
        children: [
          /* @__PURE__ */ v(
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
                p.key === "Escape" && (p.preventDefault(), y(!1), S(`${c}`));
              }
            }
          ),
          /* @__PURE__ */ x("span", { className: "reader-react-hud-page-suffix", children: [
            "/ ",
            i || "—"
          ] })
        ]
      }
    ) : /* @__PURE__ */ v(
      "button",
      {
        type: "button",
        className: "reader-react-hud-page reader-react-hud-page-btn",
        "aria-label": i > 0 ? `跳转页码，当前第 ${c} 页，共 ${i} 页` : "页码",
        title: i > 0 ? "点击输入页码跳转" : void 0,
        disabled: !l || i <= 0,
        onClick: () => {
          !l || i <= 0 || (S(`${c}`), y(!0));
        },
        children: i > 0 ? `${Math.min(c, i)} / ${i}` : "—"
      }
    ) }),
    e.bookmarkScope ? /* @__PURE__ */ v(
      Dl,
      {
        scope: e.bookmarkScope,
        currentPage: c,
        numPages: i,
        regions: t == null ? void 0 : t.regions,
        onGoToPage: l
      }
    ) : null,
    /* @__PURE__ */ x("div", { className: "reader-react-hud-group", "aria-label": "缩放", children: [
      /* @__PURE__ */ v(
        "button",
        {
          type: "button",
          className: "reader-react-hud-btn",
          "aria-label": "缩小",
          disabled: !d,
          onClick: () => s(bt(a, -1)),
          children: "−"
        }
      ),
      /* @__PURE__ */ x(
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
      /* @__PURE__ */ v(
        "button",
        {
          type: "button",
          className: "reader-react-hud-btn",
          "aria-label": "放大",
          disabled: !f,
          onClick: () => s(bt(a, 1)),
          children: "+"
        }
      )
    ] }),
    /* @__PURE__ */ v("div", { className: "reader-react-hud-group reader-react-hud-help", "aria-label": "帮助", children: /* @__PURE__ */ v(vl, {}) })
  ] });
}
function Lr(e) {
  var t, n;
  return Zr(e == null ? void 0 : e.assistantPanel) ? e.assistantPanel : ((t = e == null ? void 0 : e.splitLayout) == null ? void 0 : t.left) === "markdown" || ((n = e == null ? void 0 : e.splitLayout) == null ? void 0 : n.right) === "markdown" ? "markdown" : null;
}
function zl(e) {
  const [t, n] = _(() => ({
    scope: e,
    panel: Lr(Se(e))
  }));
  z(() => {
    n((o) => o.scope === e ? o : {
      scope: e,
      panel: Lr(Se(e))
    });
  }, [e]), z(() => {
    t.scope === e && Bt(t.scope, {
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
const gn = "download-toast";
function Ol({
  title: e = "下载中",
  status: t = "正在准备...",
  meta: n = "等待响应...",
  percent: r = NaN,
  tone: o = "progress"
}) {
  const a = Number.isFinite(r) ? Math.max(4, Math.min(100, Number(r) || 0)) : 18;
  return /* @__PURE__ */ x("div", { className: "download-toast-card reader-floating-surface", "data-tone": o, "aria-live": "polite", children: [
    /* @__PURE__ */ x("div", { className: "download-toast-head", children: [
      /* @__PURE__ */ v("div", { id: "download-toast-title", className: "download-toast-title", children: e }),
      /* @__PURE__ */ v("div", { id: "download-toast-status", className: "download-toast-status", children: t })
    ] }),
    /* @__PURE__ */ v("div", { className: "download-toast-track", children: /* @__PURE__ */ v("span", { id: "download-toast-bar", className: "download-toast-bar", style: { width: `${a}%` } }) }),
    /* @__PURE__ */ v("div", { id: "download-toast-meta", className: "download-toast-meta", children: n })
  ] });
}
function Fl(e = {}) {
  const {
    visible: t = !1,
    title: n = "下载中",
    status: r = "正在准备...",
    meta: o = "等待响应...",
    percent: a = NaN,
    tone: s = "progress"
  } = e;
  if (!t) {
    nn.dismiss(gn);
    return;
  }
  nn.custom(
    () => /* @__PURE__ */ v(Ol, { title: n, status: r, meta: o, percent: a, tone: s }),
    { id: gn, duration: 1 / 0 }
  );
}
function $l() {
  const e = $((t) => {
    t && (t.setState = Fl, t.hide = () => nn.dismiss(gn));
  }, []);
  return /* @__PURE__ */ x(Be, { children: [
    /* @__PURE__ */ v(Yo, { position: "bottom-right" }),
    /* @__PURE__ */ v("download-toast", { style: { display: "none" }, "aria-hidden": "true", ref: e })
  ] });
}
function jl(e) {
  return e.sourceViewOnly ? { mode: "source", auto: !1 } : e.savedMode ? { mode: e.savedMode, auto: !1 } : qr(e.viewportWidth) ? { mode: "translated", auto: !0 } : { mode: null, auto: !1 };
}
function Ul(e, t) {
  return t === null || e !== t;
}
function Bl(e) {
  const t = M(!1);
  return e && (t.current = !0), t.current;
}
function Hl(e, t) {
  const n = e === t;
  return { open: n, mounted: Bl(n) };
}
const Cr = { itemId: null, origin: null };
function Wl() {
  let e = Cr;
  const t = /* @__PURE__ */ new Set();
  return {
    get: () => e,
    set(n, r) {
      if (!(e.itemId === n && (n === null || e.origin === r))) {
        e = n === null ? Cr : { itemId: n, origin: r };
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
const je = (e) => `${e ?? ""}`.replace(/\s+/gu, " ").trim(), Vl = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉", "+": "₊", "-": "₋" }, Jl = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "+": "⁺", "-": "⁻" }, ql = {
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
}, Dr = (e, t) => [...e].every((n) => n in t) ? [...e].map((n) => t[n]).join("") : e;
function Gl(e) {
  return e.replace(
    /\$([^$]+)\$/gu,
    (t, n) => n.replace(/\\(?:mathrm|text|mathbf|mathit|operatorname)\{([^{}]*)\}/gu, "$1").replace(/_\{([^{}]*)\}|_(\w)/gu, (r, o, a) => Dr(o ?? a ?? "", Vl)).replace(/\^\{([^{}]*)\}|\^(\w)/gu, (r, o, a) => Dr(o ?? a ?? "", Jl)).replace(/\\([a-zA-Z]+)/gu, (r, o) => ql[o] ?? "").replace(/[{}]/gu, "").trim()
  ).replace(/\s+/gu, " ").trim();
}
function Kl(e) {
  return je(e.translatedBlockText) || je(e.translated.text) || je(e.source.text);
}
const Zl = (e) => !!e.headingLevel || e.subType === "title" || e.subType === "heading";
function Yl(e) {
  const t = [];
  for (const n of e) {
    if (!Zl(n)) continue;
    const r = Gl(Kl(n)), o = Number(n.source.page);
    if (!r || !Number.isFinite(o) || o < 1) continue;
    const a = t[t.length - 1];
    a && a.text === r && a.page === o || t.push({ itemId: n.itemId, level: n.headingLevel && n.headingLevel > 1 ? 2 : 1, page: o, text: r });
  }
  return t;
}
function Xl(e, t) {
  let n = -1;
  for (let r = 0; r < e.length && e[r].page <= t; r += 1)
    n = r;
  return n;
}
const Ql = 24, eu = 60;
function xr(e, t) {
  const n = e.toLowerCase().indexOf(t);
  if (n < 0) return null;
  const r = Math.max(0, n - Ql), o = Math.min(e.length, n + t.length + eu), a = r > 0 ? "…" : "";
  return { snippet: `${a}${e.slice(r, o)}${o < e.length ? "…" : ""}`, at: a.length + n - r, length: t.length };
}
function tu(e, t, n = 200) {
  const r = je(t).toLowerCase();
  if (!r) return [];
  const o = [];
  for (const a of e) {
    const s = Number(a.source.page);
    if (!Number.isFinite(s) || s < 1) continue;
    const c = je(a.translatedBlockText) || je(a.translated.text), i = c ? xr(c, r) : null, l = i ?? xr(je(a.source.text), r);
    if (l && (o.push({ itemId: a.itemId, page: s, side: i ? "translated" : "source", ...l }), o.length >= n))
      break;
  }
  return o;
}
const nu = [];
function ru({ open: e, onToggle: t }) {
  return /* @__PURE__ */ x("div", { className: "reader-finder-toggles", children: [
    /* @__PURE__ */ x($e, { className: "reader-finder-toggle", "aria-pressed": e === "outline", title: "目录", onClick: () => t("outline"), children: [
      /* @__PURE__ */ v(ra, { size: 16, strokeWidth: 2.1, "aria-hidden": !0 }),
      /* @__PURE__ */ v("span", { children: "目录" })
    ] }),
    /* @__PURE__ */ x($e, { className: "reader-finder-toggle", "aria-pressed": e === "search", title: "在书里搜索（原文和译文）", onClick: () => t("search"), children: [
      /* @__PURE__ */ v(oa, { size: 16, strokeWidth: 2.1, "aria-hidden": !0 }),
      /* @__PURE__ */ v("span", { children: "搜索" })
    ] })
  ] });
}
function ou({
  tab: e,
  onTab: t,
  onClose: n,
  onJump: r
}) {
  var h, g;
  const o = ((h = xe()) == null ? void 0 : h.regions) ?? nu, a = ((g = fo()) == null ? void 0 : g.currentPage) ?? 1, s = Y(() => Yl(o), [o]), c = Xl(s, a), [i, l] = _(""), u = Y(() => tu(o, i), [o, i]), d = M(null), f = M(null);
  return z(() => {
    var m, y, b;
    e === "search" ? (m = d.current) == null || m.focus() : (b = (y = f.current) == null ? void 0 : y.querySelector('[aria-current="location"]')) == null || b.scrollIntoView({ block: "center" });
  }, [e]), /* @__PURE__ */ x("aside", { className: "reader-finder", "aria-label": e === "outline" ? "目录" : "搜索", children: [
    /* @__PURE__ */ x("header", { className: "reader-finder-head", children: [
      /* @__PURE__ */ x("div", { className: "reader-finder-tabs", role: "tablist", children: [
        /* @__PURE__ */ v($e, { className: "reader-finder-tab", role: "tab", "aria-selected": e === "outline", onClick: () => t("outline"), children: "目录" }),
        /* @__PURE__ */ v($e, { className: "reader-finder-tab", role: "tab", "aria-selected": e === "search", onClick: () => t("search"), children: "搜索" })
      ] }),
      /* @__PURE__ */ v($e, { className: "reader-finder-close", "aria-label": "收起", title: "收起", onClick: n, children: /* @__PURE__ */ v(Pn, { size: 16, strokeWidth: 2.1, "aria-hidden": !0 }) })
    ] }),
    e === "outline" ? s.length ? /* @__PURE__ */ v("ol", { ref: f, className: "reader-finder-list", children: s.map((m, y) => /* @__PURE__ */ v("li", { children: /* @__PURE__ */ x(
      $e,
      {
        className: "reader-finder-entry",
        "data-level": m.level,
        "aria-current": y === c ? "location" : void 0,
        onClick: () => r(m.itemId),
        children: [
          /* @__PURE__ */ v("span", { className: "reader-finder-entry-text", children: m.text }),
          /* @__PURE__ */ v("span", { className: "reader-finder-entry-page", children: m.page })
        ]
      }
    ) }, m.itemId)) }) : /* @__PURE__ */ v("p", { className: "reader-finder-empty", children: o.length ? "这本书没有认出标题。" : "这本书还没有段落数据。" }) : /* @__PURE__ */ x(Be, { children: [
      /* @__PURE__ */ x("div", { className: "reader-finder-search", children: [
        /* @__PURE__ */ v(
          aa,
          {
            ref: d,
            type: "search",
            size: "sm",
            className: "reader-finder-input",
            placeholder: "原文、译文里的字",
            "aria-label": "在书里搜索",
            value: i,
            onChange: (m) => l(m.target.value),
            onKeyDown: (m) => {
              m.key === "Enter" && u[0] && r(u[0].itemId), m.stopPropagation();
            }
          }
        ),
        i.trim() ? /* @__PURE__ */ v("p", { className: "reader-finder-count", children: u.length >= 200 ? "200 处以上，只列前 200 处" : `${u.length} 处` }) : null
      ] }),
      /* @__PURE__ */ v("ol", { className: "reader-finder-list", children: u.map((m) => /* @__PURE__ */ v("li", { children: /* @__PURE__ */ x($e, { className: "reader-finder-entry is-hit", onClick: () => r(m.itemId), children: [
        /* @__PURE__ */ x("span", { className: "reader-finder-entry-text", children: [
          m.snippet.slice(0, m.at),
          /* @__PURE__ */ v("mark", { children: m.snippet.slice(m.at, m.at + m.length) }),
          m.snippet.slice(m.at + m.length)
        ] }),
        /* @__PURE__ */ v("span", { className: "reader-finder-entry-page", children: m.page })
      ] }) }, m.itemId)) })
    ] })
  ] });
}
const au = zo(() => import("./ReaderMarkdownPanel-BXMJ9GMe.js").then((e) => ({ default: e.ReaderMarkdownPanel })));
function su(e) {
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
function iu(e, t) {
  return e === "compare" ? t ? !0 : null : !1;
}
function cu() {
  const e = fi(), { boot: t, panes: n, sessionFiles: r, session: o } = e, a = zl(e.viewStateKey), s = a.panel, c = a.setPanel, [i, l] = _(null), [u, d] = _(!1), f = M(null), h = M(null), g = s !== null, m = e.liveTranslationAvailable || e.liveTranslation.pagesByPage.size > 0, y = su({
    mode: e.mode,
    sourceOnly: e.sourceOnly,
    translatedUrl: r.translatedUrl,
    overlayContentAvailable: m,
    liveTranslationVisible: u,
    assistantOpen: g,
    assistantPdfPane: i
  }), b = ri({
    hasOverlayContent: m,
    connection: e.liveTranslation.connection,
    showSource: y.showSource,
    liveTranslationVisible: u,
    assistantOpen: g
  }), S = y.sourceViewOnly, R = y.visibleMode;
  z(() => {
    d(!1);
  }, [e.viewStateKey]), z(() => {
    e.session.jobTerminal && d(!1);
  }, [e.session.jobTerminal]), z(() => {
    l(null);
  }, [a.scope]), z(() => {
    if (!(t.loading || t.failed)) {
      if (f.current !== e.viewStateKey) {
        f.current = e.viewStateKey;
        const B = Se(e.viewStateKey), V = jl({
          savedMode: B == null ? void 0 : B.mode,
          sourceViewOnly: S,
          viewportWidth: Ue()
        });
        h.current = V.auto ? V.mode : null, V.mode && V.mode !== e.mode && e.setModeKeepingPage(V.mode);
        return;
      }
      Ul(e.mode, h.current) && (h.current = null, Bt(e.viewStateKey, { mode: e.mode }));
    }
  }, [t.failed, t.loading, e.mode, e.setModeKeepingPage, e.viewStateKey, S]);
  const p = s || (e.mode === "compare" ? "compare" : "reading"), w = Hl(s, "markdown");
  vi({
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
  const T = $(() => {
    c(null), l(null);
  }, []), N = $((B) => {
    l(null);
    const V = iu(B, e.liveTranslationAvailable);
    V !== null && d(V), e.setModeKeepingPage(B);
  }, [e.liveTranslationAvailable, e.setModeKeepingPage]), O = Y(() => b.sourcePaneToggle ? /* @__PURE__ */ v(
    "button",
    {
      type: "button",
      className: `reader-live-translation-toggle${u ? " is-active" : ""}`,
      onClick: () => d((B) => !B),
      "aria-pressed": u,
      title: u ? "隐藏实时译文" : "在原文 PDF 上叠加实时译文",
      children: "译文"
    }
  ) : null, [b.sourcePaneToggle, u]), L = $((B) => {
    c(B), l(null);
  }, []), [C] = _(Wl), [P, I] = _(null), E = $((B) => I((V) => V === B ? null : B), []), k = $((B) => {
    e.jumpToAnchor({ block_id: B }), Ue() < 900 && I(null);
  }, [e.jumpToAnchor]), F = $((B) => e.jumpToAnchor({ block_id: B }), [e.jumpToAnchor]), K = Y(() => ({
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
    regionHover: C,
    jumpToBlock: F,
    revisedBlocks: e.revisedBlocks,
    sourceOnly: e.sourceOnly,
    sourceViewOnly: S,
    download: e.download,
    goToPage: e.goToPage,
    assistant: { select: L, close: T }
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
    C,
    F,
    e.revisedBlocks,
    e.sourceOnly,
    S,
    e.download,
    e.goToPage,
    L,
    T
  ]), D = Y(() => ({
    currentPage: e.currentPage,
    numPages: n.hudNumPages
  }), [e.currentPage, n.hudNumPages]), q = [
    ss,
    `is-workspace-${p}`,
    g ? "is-assistant-open" : "",
    P ? "is-finder-open" : "",
    y.overlayOnSource ? "is-live-translation-overlay" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ v(ec, { value: K, hud: D, children: /* @__PURE__ */ x("div", { className: q, "data-reader-engine": "react-pdf", "data-reader-workspace": p, children: [
    /* @__PURE__ */ v(bl, { loading: t.loading, failed: t.failed, text: t.text, percent: t.percent, regionsError: !!o.readerErrors.regions, metadataError: !!o.readerErrors.metadata }),
    /* @__PURE__ */ v(ru, { open: P, onToggle: E }),
    P ? /* @__PURE__ */ v(
      ou,
      {
        tab: P,
        onTab: I,
        onClose: () => I(null),
        onJump: k
      }
    ) : null,
    /* @__PURE__ */ x("div", { className: "reader-chrome-tray", children: [
      /* @__PURE__ */ v(Mc, { active: s }),
      /* @__PURE__ */ v(Tl, {}),
      /* @__PURE__ */ v(Ti, { onBeforeClose: o.prepareClose })
    ] }),
    /* @__PURE__ */ v(
      Ec,
      {
        mode: R,
        documentReady: !!o.jobId,
        sourceViewOnly: S,
        onModeChange: N,
        liveTranslation: b.topBarPill ? {
          visible: u,
          state: e.liveTranslation,
          onToggle: () => d((B) => !B)
        } : null
      }
    ),
    /* @__PURE__ */ v(Ac, { active: s }),
    g ? /* @__PURE__ */ v(pl, {}) : null,
    /* @__PURE__ */ v(Sc, { paneComposition: y, markdownSplit: w.open, assistantSplit: g, liveTranslation: e.liveTranslation, sourcePaneAction: O }),
    e.showHud ? /* @__PURE__ */ v(
      xl,
      {
        mode: R,
        modeControls: null,
        bookmarkScope: e.viewStateKey
      }
    ) : null,
    /* @__PURE__ */ v(xo, { fallback: null, children: w.mounted ? /* @__PURE__ */ v(au, { open: w.open, jobId: o.jobId, sourceOnly: e.sourceOnly, side: "right", onClose: T }) : null }),
    /* @__PURE__ */ v($l, {})
  ] }) });
}
function Eu() {
  return /* @__PURE__ */ v(cu, {});
}
export {
  Eu as R,
  cu as a,
  Mi as c,
  Iu as d,
  pa as f,
  Ia as r,
  xe as u
};
//# sourceMappingURL=ReaderApp-BbKcAtvP.js.map
