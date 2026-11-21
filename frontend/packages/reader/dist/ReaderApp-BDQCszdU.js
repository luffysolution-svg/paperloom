var Vn = (e) => {
  throw TypeError(e);
};
var Jn = (e, t, n) => t.has(e) || Vn("Cannot " + n);
var dt = (e, t, n) => (Jn(e, t, "read from private field"), n ? n.call(e) : t.get(e)), qn = (e, t, n) => t.has(e) ? Vn("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, n), Gn = (e, t, n, r) => (Jn(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n);
import { jsxs as z, jsx as b, Fragment as We } from "react/jsx-runtime";
import { useMemo as K, useState as L, useEffect as $, useCallback as j, useRef as M, useLayoutEffect as _e, memo as vn, createContext as wn, useContext as Sn, forwardRef as Fo, useImperativeHandle as Rn, useSyncExternalStore as $r, useId as jr, Suspense as $o, lazy as jo } from "react";
import { requireAdapter as lt, getReaderAdapters as ve } from "./adapters.js";
import { resolveReaderDownloadName as Bo, resolveReaderDownloadUrls as Uo, READER_PROGRESS_COPY as Ee, trimString as xt, READER_DOWNLOAD_ACTIONS as Ho, disabledReason as Wo } from "./runtime/state.js";
import { r as Vo, b as Jo } from "./page-config-Ct7qR5rm.js";
import { documentSourcePdfPath as nn, isFinishedJobStatus as Pn } from "@retainpdf/domain/job";
import { n as qo, d as Go, f as qt, k as Kn, b as Ko, c as Yo, j as In, p as Tn, g as rn, l as Yn, i as Zo } from "./reader-regions-B6o2DsPy.js";
import { fetchDocumentReading as Xo } from "@retainpdf/api/documents";
import { isReaderTransportError as Qo, createReaderTransportError as ea } from "./contracts.js";
import { toast as on, Toaster as ta } from "sonner";
import { X as En, Radio as na, FileText as Br, Columns2 as Ur, Languages as Hr, FileCode2 as ra, Keyboard as oa, Download as aa, ChevronDown as sa, ListTree as ia, Search as ca } from "lucide-react";
import { Button as Be, Input as la } from "@retainpdf/ui";
import { pdfjs as Wr, Page as ua, Document as da } from "react-pdf";
import { e as fa, m as ma, a as ha } from "./markdown-math-DN_X3M3x.js";
const pa = (...e) => {
  var t, n;
  return ((n = (t = ve()) == null ? void 0 : t.isMockMode) == null ? void 0 : n.call(t, ...e)) ?? !1;
}, ga = "", ba = Object.freeze({
  progress: "retainpdf-reader-progress"
}), ya = (e) => {
  var t, n;
  return ((n = (t = ve()) == null ? void 0 : t.resolveResourceUrl) == null ? void 0 : n.call(t, e)) ?? e;
}, va = (...e) => {
  var n;
  return (((n = ve()) == null ? void 0 : n.fetchProtected) ?? fetch)(...e);
}, ke = () => lt("defaultReaderDataPort"), Zn = () => lt("defaultReaderPageConfigPort"), Lu = {
  get apiPrefix() {
    return ke().apiPrefix;
  },
  fetchProtected: (...e) => ke().fetchProtected(...e),
  loadMarkdownPayload: (e) => ke().loadMarkdownPayload(e),
  loadMarkdownSource: (e) => ke().loadMarkdownSource(e),
  loadMarkdownRange: (e, t, n, r, o) => ke().loadMarkdownRange(e, t, n, r, o),
  loadJobPayload: (e) => ke().loadJobPayload(e),
  loadReaderPayload: (e, t) => ke().loadReaderPayload(e, t),
  loadReaderOptionalArtifacts: (e) => ke().loadReaderOptionalArtifacts(e),
  get liveTranslation() {
    return ke().liveTranslation;
  }
}, Vr = {
  messageTargetOrigin: () => Zn().messageTargetOrigin(),
  readerJobId: () => Zn().readerJobId()
}, wa = () => {
  var e;
  return ((e = ve()) == null ? void 0 : e.liveTranslation) ?? null;
}, bt = () => {
  var t;
  const e = ve();
  return (e == null ? void 0 : e.pdf) ?? {
    fetchProtected: (e == null ? void 0 : e.fetchProtected) ?? ((t = e == null ? void 0 : e.defaultReaderDataPort) == null ? void 0 : t.fetchProtected) ?? fetch,
    resolvePdfjsVendorUrl: (n = "") => {
      var r;
      return ((r = e == null ? void 0 : e.resolvePdfjsVendorUrl) == null ? void 0 : r.call(e, n)) ?? "";
    }
  };
}, Ut = () => {
  const e = ve();
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
}, Sa = (...e) => {
  var t, n;
  return ((n = (t = ve()) == null ? void 0 : t.resolveReaderAnchor) == null ? void 0 : n.call(t, ...e)) ?? null;
}, Ra = () => {
  var e, t;
  return ((t = (e = ve()) == null ? void 0 : e.resolveReaderDocumentId) == null ? void 0 : t.call(e)) ?? "";
}, Pa = (...e) => {
  var t, n;
  return ((n = (t = ve()) == null ? void 0 : t.resolveReaderJobId) == null ? void 0 : n.call(t, ...e)) ?? "";
}, Ia = (...e) => {
  var t, n;
  return ((n = (t = ve()) == null ? void 0 : t.resolveReaderDownloadName) == null ? void 0 : n.call(t, ...e)) ?? Bo(...e);
}, Ta = (...e) => {
  var t, n;
  return ((n = (t = ve()) == null ? void 0 : t.resolveReaderDownloadUrls) == null ? void 0 : n.call(t, ...e)) ?? Uo(...e);
}, Ea = (...e) => lt("downloadProtectedResource")(...e), ka = (...e) => lt("failDownloadToast")(...e), Ma = (e, t) => lt("resolveMarkdownAssetUrl")(e, t), Xn = "/api/v1";
function Aa() {
  const e = () => {
    var r;
    return Vo(
      ((r = globalThis.location) == null ? void 0 : r.search) || ""
    );
  }, [t, n] = L(e);
  return $(() => {
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
function Na() {
  const e = Aa(), t = K(() => Pa(Vr), [e]), n = K(() => Ra(), [e]), r = t || n ? `job:${t}|document:${n}` : `location:${e}`;
  return { locationKey: e, jobId: t, routeDocumentId: n, sessionIdentity: r };
}
function _a(e) {
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
  }), y = f.jobId === g ? f.documentId : "", S = t || y, R = !!t && !g, [p, w] = L(null), k = (p == null ? void 0 : p.sessionIdentity) === r && p.documentId === S ? p : null, T = R || !!k, C = j((D) => {
    const E = `${D.documentId || ""}`.trim();
    if (!E || a.current && a.current !== E) return;
    if (!a.current && s.current)
      v({
        jobId: s.current,
        documentId: E
      });
    else if (!a.current)
      return;
    const P = `${D.revision || ""}`.trim() || `${Date.now()}`;
    w({
      documentId: E,
      revision: P,
      sessionIdentity: o.current
    }), c();
  }, []);
  $(() => {
    w((D) => D && D.sessionIdentity !== r ? null : D);
  }, [r]);
  const x = j((D) => {
    switch (D.type) {
      case "resolved-document-job":
        l({ documentId: D.documentId, jobId: D.jobId });
        break;
      case "cleared-resolved-document-job":
        l({ documentId: "", jobId: "" });
        break;
      case "missing-document-job":
        d({ documentId: D.documentId, jobId: D.jobId });
        break;
      case "resolved-job-document":
        v((E) => E.jobId === D.jobId && E.documentId === D.documentId ? E : { jobId: D.jobId, documentId: D.documentId });
        break;
      case "committed-source":
        w({
          documentId: D.documentId,
          revision: D.revision,
          sessionIdentity: D.sessionIdentity
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
    jobDocumentId: y,
    documentId: S,
    sourceOnly: R,
    committedDocumentSource: p,
    setCommittedDocumentSource: w,
    activeCommittedDocumentSource: k,
    sourceViewOnly: T,
    refreshCommittedDocument: C,
    applyIdentityEvent: x
  };
}
function Qn(e) {
  return `${(e == null ? void 0 : e.status) || ""}`.trim().toLowerCase();
}
function La(e) {
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
function er(e, t) {
  return ya(nn(e, t));
}
function Ca(e, t = "") {
  const n = `${e || ""}`.trim(), r = `${t || ""}`.trim();
  return !!(!n || r && (n === r || n === `${r}.pdf`) || /^\d{8,14}-[0-9a-f]{4,}$/i.test(n));
}
function xa(e, t) {
  var r;
  const n = [
    e == null ? void 0 : e.title,
    e == null ? void 0 : e.display_name,
    e == null ? void 0 : e.source_file_name,
    (r = e == null ? void 0 : e.book_summary) == null ? void 0 : r.source_file_name
  ];
  for (const o of n) {
    const a = `${o || ""}`.trim();
    if (a && !Ca(a, t))
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
        type: ba.progress,
        stage: n,
        percent: e,
        text: t
      },
      Vr.messageTargetOrigin()
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
function Da(e) {
  const {
    sessionJobId: t,
    sessionIdentity: n,
    sessionIdentityRef: r,
    sessionJobIdRef: o,
    sessionEpochRef: a,
    closingRef: s
  } = e, [c, i] = L(null), [l, u] = L(null), [d, m] = L(""), [h, g] = L(0), f = d === n ? c : null, v = d === n ? l : null, y = Qn(f), S = Pn(y), R = j(() => {
    g((x) => x + 1);
  }, []), p = j((x) => {
    i(x.jobPayload), u(x.manifestPayload), m(x.sessionIdentity);
  }, []), w = j((x) => {
    i(null), u(null), m(x);
  }, []), k = M(""), T = M(""), C = j(async () => {
    const x = o.current;
    if (!x || k.current === x) return;
    const D = Ut().loadJobPayload;
    if (typeof D != "function") return;
    const E = a.current.value;
    k.current = x;
    try {
      const P = await D(x);
      if (s.current || a.current.value !== E || o.current !== x || !P || typeof P != "object")
        return;
      const I = Qn(P);
      i(P), m(r.current), I === "succeeded" && T.current !== x && (T.current = x, g((N) => N + 1));
    } catch {
    } finally {
      k.current === x && (k.current = "");
    }
  }, []);
  return $(() => {
    T.current = "";
  }, [n]), $(() => {
    if (!t || S || !f) return;
    const x = window.setInterval(() => {
      document.visibilityState !== "hidden" && C();
    }, 1e3);
    return () => window.clearInterval(x);
  }, [S, C, f, t]), {
    jobPayload: c,
    setJobPayload: i,
    manifestPayload: l,
    setManifestPayload: u,
    payloadSessionIdentity: d,
    setPayloadSessionIdentity: m,
    scopedJobPayload: f,
    scopedManifestPayload: v,
    jobStatus: y,
    jobTerminal: S,
    jobRefreshRevision: h,
    refreshJobArtifacts: R,
    refreshJobStatus: C,
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
function za(e, t) {
  e(t), sn(t);
}
function Oa(e) {
  const [t, n] = L(e ? "source" : "compare"), r = j((a) => {
    e && a !== "source" || (n(a), sn(a));
  }, [e]), o = j((a) => {
    za(n, a);
  }, []);
  return $(() => (e && document.documentElement.classList.add("reader-source-only"), sn(t), () => {
    document.documentElement.classList.remove("reader-source-only");
  }), [e, t]), { mode: t, setMode: r, setModeState: n, switchSessionMode: o };
}
function tr(e) {
  return typeof e == "string" ? e.trim() : `${e ?? ""}`.trim();
}
function Fa(e) {
  const t = (e == null ? void 0 : e.data) ?? e, n = t && typeof t == "object" ? t : {};
  return {
    activeJobId: tr(n.active_job_id),
    activeVersionId: tr(n.active_version_id)
  };
}
function $a(e) {
  const { link: t, rejectedDocumentJobId: n, hasCommittedSource: r } = e, o = t.activeJobId && t.activeJobId !== n && !t.activeJobId.startsWith("doc:") ? t.activeJobId : "";
  return o ? { kind: "follow-active-job", jobId: o, activeVersionId: t.activeVersionId } : t.activeVersionId && !r ? { kind: "open-committed-source", documentId: "", revision: t.activeVersionId } : { kind: "open-source-url" };
}
function ja(e) {
  const {
    payloadDocumentId: t,
    linkedActiveJobId: n,
    linkedActiveVersionId: r,
    sessionJobId: o,
    hasCommittedSource: a
  } = e;
  return t && r && n === o && !a ? { kind: "restore-committed-source", documentId: t, revision: r } : { kind: "open-job-artifacts" };
}
function Ba(e) {
  return e.status === 404 && e.reason !== "not_ready" && !e.jobId && !!e.routeDocumentId && !!e.documentJobId && e.sessionJobId === e.documentJobId;
}
const Ua = /^merged-([0-9a-f]{64})-[0-9a-f]+$/;
function Ha(e) {
  var t;
  return e.status !== 404 || e.reason !== "merged_reading_expired" ? "" : ((t = Ua.exec(`${e.sessionJobId || ""}`.trim())) == null ? void 0 : t[1]) || "";
}
const Wa = 48 * 1024 * 1024;
function Va(e) {
  return e ? "ranged" in e ? e : { data: e.data.slice() } : null;
}
const Ja = 2, he = /* @__PURE__ */ new Map();
function cn(e, t) {
  he.delete(e), he.set(e, t);
}
function nr(e) {
  if (he.size < Ja) return;
  const t = he.keys().next().value;
  t && he.delete(t);
}
async function qa(e) {
  var t, n;
  if (typeof e.json != "function") return "";
  try {
    const r = await e.json(), o = (n = (t = r == null ? void 0 : r.error) == null ? void 0 : t.details) == null ? void 0 : n.reason;
    return typeof o == "string" ? o.trim() : "";
  } catch {
    return "";
  }
}
async function Jr(e, t = bt().fetchProtected, n = {}) {
  var u, d, m, h, g, f, v, y, S;
  const r = `${e || ""}`.trim();
  if (!r)
    return null;
  if (he.has(r)) {
    const R = he.get(r);
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
    const p = await qa(s);
    throw p && (R.reason = p), R;
  }
  const c = Ga(r, s, t);
  if (c) {
    o.abort();
    const R = { ranged: c };
    return nr(), he.set(r, R), R;
  }
  (v = (f = n.signal) == null ? void 0 : f.addEventListener) == null || v.call(f, "abort", a, { once: !0 });
  let i;
  try {
    i = await s.arrayBuffer();
  } finally {
    (S = (y = n.signal) == null ? void 0 : y.removeEventListener) == null || S.call(y, "abort", a);
  }
  const l = { data: new Uint8Array(i) };
  return he.has(r) ? cn(r, l) : (nr(), he.set(r, l)), l;
}
function Ga(e, t, n) {
  const r = t.headers;
  if (!r || typeof r.get != "function") return null;
  const o = Number(r.get("content-length") || 0), a = `${r.get("accept-ranges") || ""}`.toLowerCase().includes("bytes"), s = `${r.get("content-encoding") || ""}`.trim();
  return !a || s || !Number.isFinite(o) || o < Wa ? null : {
    url: e,
    length: o,
    async fetchRange(c, i) {
      const l = await n(e, { headers: { Range: `bytes=${c}-${i - 1}` } });
      if (l.status !== 206) throw new Error(`读取 PDF 片段失败 (${l.status})`);
      return new Uint8Array(await l.arrayBuffer());
    }
  };
}
const Ka = { file: null, loading: !1, error: "" }, Ya = { file: null, loading: !0, error: "" };
function Za(e = "", t = null) {
  const n = `${e || ""}`.trim(), [r, o] = L(null);
  if ($(() => {
    if (t || !n) return;
    const s = he.get(n);
    if (s) {
      cn(n, s);
      return;
    }
    const c = new AbortController();
    return Jr(n, void 0, { signal: c.signal }).then((i) => {
      c.signal.aborted || o({ url: n, file: i, loading: !1, error: "" });
    }).catch((i) => {
      c.signal.aborted || o({ url: n, file: null, loading: !1, error: (i == null ? void 0 : i.message) || String(i) });
    }), () => c.abort();
  }, [n, t]), t) return { file: t, loading: !1, error: "" };
  if (!n) return Ka;
  if ((r == null ? void 0 : r.url) === n) return r;
  const a = he.get(n);
  return a ? { file: a, loading: !1, error: "" } : Ya;
}
function Xa(e) {
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
  const c = await Jr(t, bt().fetchProtected, {
    signal: a.signal
  });
  return a.isInactive() ? null : (Dt(s, o, n, "download"), c);
}
async function Qa(e) {
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
function es(e, t, n) {
  const r = new URL(e);
  return n ? r.searchParams.set("job_id", n) : (r.searchParams.delete("job_id"), r.searchParams.set("document_id", t)), r.toString();
}
async function ts({
  apiPrefix: e,
  documentId: t,
  expiredJobId: n,
  fetchReading: r = Xo,
  location: o = globalThis.location
}) {
  let a;
  try {
    const s = await r(e, t);
    a = `${(s == null ? void 0 : s.job_id) || ""}`.trim() || null;
  } catch {
    return !1;
  }
  return a === n || !o ? !1 : (o.replace(es(o.href, t, a)), !0);
}
const Mt = {
  regions: null,
  metadata: null
};
function ns(e) {
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
    activeLoadAbortRef: y
  } = e, [S, R] = L(""), [p, w] = L(""), [k, T] = L(null), [C, x] = L(null), [D, E] = L(!1), [P, I] = L(""), [N, O] = L([]), [H, F] = L(!1), [J, B] = L(() => ({
    source: null,
    translated: null
  })), [V, ee] = L(
    Mt
  ), [fe, re] = L({
    loading: !0,
    percent: 4,
    text: Ee.boot,
    stage: "progress",
    failed: !1
  });
  return $(() => {
    const ae = new AbortController(), ze = f.current.value, Y = Xa({
      sessionEpochRef: f,
      closingRef: v,
      abort: ae,
      sessionEpoch: ze
    });
    y.current = ae;
    const _ = Ut();
    if (v.current)
      return ae.abort(), () => {
        y.current === ae && (y.current = null);
      };
    let ne = !1;
    function oe(te, se) {
      Y.markFailed(), F(!0), re({
        loading: !1,
        percent: 100,
        text: te,
        stage: "failed",
        failed: !0
      }), an({ percent: 100, text: se, stage: "failed" });
    }
    function we() {
      E(!0), ne || F(!0), re({
        loading: !1,
        percent: 100,
        text: Ee.ready,
        stage: "ready",
        failed: !1
      }), an({ percent: 100, text: Ee.ready, stage: "ready" });
    }
    function pe() {
      return l != null && l.documentId ? er(
        l.documentId,
        l.revision
      ) : pa() ? ga : _.resolveResourceUrl(nn(r));
    }
    async function Oe() {
      var ce;
      let te = { activeJobId: "", activeVersionId: "" };
      try {
        const le = await ((ce = _.fetchDocument) == null ? void 0 : ce.call(_, r));
        le && (te = Fa(le));
      } catch {
      }
      const se = $a({
        link: te,
        rejectedDocumentJobId: a,
        hasCommittedSource: !!l
      });
      if (se.kind === "follow-active-job") {
        if (Y.isInactive()) return;
        u({
          type: "resolved-document-job",
          documentId: r,
          jobId: se.jobId
        }), se.activeVersionId ? (l || u({
          type: "committed-source",
          documentId: r,
          revision: se.activeVersionId,
          sessionIdentity: i
        }), h("source")) : h("compare");
        return;
      }
      if (se.kind === "open-committed-source") {
        if (Y.isInactive()) return;
        u({
          type: "committed-source",
          documentId: r,
          revision: se.revision,
          sessionIdentity: i
        }), h("source");
        return;
      }
      const be = pe();
      if (Y.isInactive()) return;
      R(be), w(""), I(""), m(i);
      const ie = await ln({
        url: be,
        label: "正在下载原文 PDF…",
        percentStart: 30,
        percentEnd: 85,
        fence: Y,
        setBoot: re
      });
      if (!Y.isInactive()) {
        if (!ie) {
          oe("源文件不可用：该文档没有可读取的源 PDF。", "源文件下载失败");
          return;
        }
        T(ie), we();
      }
    }
    async function ge() {
      var kt;
      const te = !l, se = !!(te && _.loadSessionSnapshot && _.loadReaderOptionalArtifacts), be = se ? _.loadReaderOptionalArtifacts(t) : null, ie = await ((kt = _.loadSessionSnapshot) == null ? void 0 : kt.call(_, {
        jobId: t,
        documentId: r,
        routeDocumentId: r,
        committedSource: l,
        includeOptionalArtifacts: te && !se
      })), ce = ie ? {
        jobPayload: ie.sourcePayload,
        manifestPayload: ie.manifestPayload,
        readerMetadata: ie.readerMetadata,
        regionsPayload: ie.regions,
        readerErrors: ie.readerErrors
      } : await _.loadReaderPayload(t, {
        includeOptionalArtifacts: te
      });
      if (Y.isInactive()) return;
      let le = null;
      if (n && !r)
        if (ie && ie.linkedDocument !== void 0)
          le = ie.linkedDocument;
        else {
          try {
            le = await _.fetchDocumentByJobId(Xn, t);
          } catch {
          }
          if (Y.isInactive()) return;
        }
      const Fe = La(ce.jobPayload) || `${(le == null ? void 0 : le.document_id) || ""}`.trim();
      Fe && !r && u({
        type: "resolved-job-document",
        jobId: t,
        documentId: Fe
      });
      const ut = ja({
        payloadDocumentId: Fe,
        linkedActiveJobId: `${(le == null ? void 0 : le.active_job_id) || ""}`.trim(),
        linkedActiveVersionId: `${(le == null ? void 0 : le.active_version_id) || ""}`.trim(),
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
      const Ze = _.resolveReaderSourcePdf(ce.manifestPayload), Vt = _.resolveReaderTranslatedPdfUrl(ce.jobPayload, ce.manifestPayload), Jt = typeof Ze == "string" ? Ze : _.resolveReaderArtifactUrl(Ze), It = r || Fe, Te = l != null && l.documentId ? er(
        l.documentId,
        l.revision
      ) : Jt || (It ? _.resolveResourceUrl(nn(It)) : ""), Le = l ? "" : Vt || "";
      R(Te || ""), w(Le), I(xa(ce.jobPayload, t)), d({
        jobPayload: ce.jobPayload || null,
        manifestPayload: ce.manifestPayload || null,
        sessionIdentity: i
      });
      const Xe = () => Qa({
        sourceFinal: Te || "",
        translatedFinal: Le,
        fence: Y,
        setBoot: re
      }), Tt = !!(Te || Le), Qe = be && Tt ? Xe() : null;
      Qe == null || Qe.catch(() => {
      });
      const Et = (A) => {
        Y.isInactive() || (O(l ? [] : qo(A.regionsPayload)), B(l ? { source: null, translated: null } : Go(A.readerMetadata)), ee(l ? Mt : A.readerErrors ?? Mt), F(!0));
      };
      if (be ? (ne = !0, be.then(Et)) : Et(ce), !Tt) {
        oe(Ee.failed, Ee.failed);
        return;
      }
      const et = await (Qe ?? Xe());
      if (et.status !== "inactive") {
        if (et.status === "incomplete") {
          oe("PDF 下载失败，请重试", "PDF 下载失败");
          return;
        }
        T(et.sourceBytes), x(et.translatedBytes), we();
      }
    }
    async function Ie() {
      E(!1), T(null), x(null), O([]), F(!1), B({ source: null, translated: null }), ee(Mt), Dt(re, 8, Ee.metadata, "metadata");
      try {
        if (s) {
          await Oe();
          return;
        }
        if (!t) {
          oe(Ee.failed, Ee.failed);
          return;
        }
        await ge();
      } catch (te) {
        if (Y.isClosedOrStale() || (te == null ? void 0 : te.name) === "AbortError") return;
        Y.markFailed();
        const se = Number(te == null ? void 0 : te.status), be = `${(te == null ? void 0 : te.reason) || ""}`, ie = Ha({ status: se, reason: be, sessionJobId: t });
        if (ie && (await ts({
          apiPrefix: Xn,
          documentId: ie,
          expiredJobId: t
        }) || Y.isClosedOrStale()))
          return;
        if (Ba({
          status: se,
          reason: be,
          jobId: n,
          routeDocumentId: r,
          documentJobId: o,
          sessionJobId: t
        })) {
          u({ type: "missing-document-job", documentId: r, jobId: t }), u({ type: "cleared-resolved-document-job" }), h("source");
          return;
        }
        const ce = te instanceof Error ? te.message : Ee.failed;
        oe(ce, ce);
      }
    }
    return Ie(), () => {
      ae.abort(), y.current === ae && (y.current = null);
    };
  }, [t, r, o, a, s, c, l, g, n, i, u, d, m, h]), {
    sourceUrl: S,
    translatedUrl: p,
    sourceFile: k,
    translatedFile: C,
    assetsReady: D,
    title: P,
    regions: N,
    regionsSettled: H,
    readerMetadata: J,
    readerErrors: V,
    boot: fe
  };
}
function rs() {
  const e = M(!1), t = M(null), { locationKey: n, jobId: r, routeDocumentId: o, sessionIdentity: a } = Na(), s = M({ identity: "", value: 0 });
  s.current.identity !== a && (s.current = {
    identity: a,
    value: s.current.value + 1
  }, e.current = !1);
  const c = M(a), i = M(""), l = M(""), u = M(() => {
  }), d = j(() => u.current(), []), m = _a({
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
  } = m, { mode: y, setMode: S, switchSessionMode: R } = Oa(v);
  u.current = () => {
    R("source");
  }, c.current = a, i.current = g, l.current = h;
  const p = Da({
    sessionJobId: h,
    sessionIdentity: a,
    sessionIdentityRef: c,
    sessionJobIdRef: l,
    sessionEpochRef: s,
    closingRef: e
  }), {
    scopedJobPayload: w,
    scopedManifestPayload: k,
    jobStatus: T,
    jobTerminal: C,
    jobRefreshRevision: x,
    refreshJobArtifacts: D,
    refreshJobStatus: E
  } = p, P = ns({
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
  }), I = j(() => {
    var O;
    e.current = !0, (O = t.current) == null || O.abort();
  }, []), N = K(
    () => ({
      fetchProtected: Ut().fetchProtected,
      jobId: h,
      jobPayload: w,
      manifestPayload: k,
      sourceUrl: P.sourceUrl,
      translatedUrl: P.translatedUrl,
      sourceOnly: v
    }),
    [h, w, k, P.sourceUrl, P.translatedUrl, v]
  );
  return {
    jobId: h,
    jobStatus: T,
    workflow: `${(w == null ? void 0 : w.workflow) || ""}`.trim().toLowerCase(),
    jobTerminal: C,
    documentId: g,
    sessionIdentity: a,
    sourceOnly: f,
    mode: y,
    setMode: S,
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
    download: N,
    refreshJobArtifacts: D,
    refreshJobStatus: E,
    refreshCommittedDocument: m.refreshCommittedDocument,
    prepareClose: I
  };
}
const os = 160, as = 8, ss = 0;
function is() {
  const e = M(null), [t, n] = L(null), [r, o] = L(ss), a = j((s) => {
    e.current = s, n(s);
  }, []);
  return $(() => {
    const s = t;
    if (!s || typeof ResizeObserver > "u")
      return;
    const c = (l) => {
      !Number.isFinite(l) || l < os || o((u) => Math.abs(u - l) < as ? u : l);
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
function cs(e) {
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
function ls(e, t) {
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
  const [d, m] = L(() => ({
    identity: l,
    pages: Gt
  })), [h, g] = L(() => ({ identity: l, tick: 0 })), f = d.identity === l ? d.pages : Gt, v = h.identity === l ? h.tick : 0, y = cs({
    mode: n,
    sourceOnly: r,
    assetsReady: o,
    hasSource: !!c || !!a,
    hasTranslated: !!i
  }), { primaryPane: S } = y, R = j((E, P) => {
    u.current === l && m((I) => {
      const N = I.identity === l ? I.pages : Gt;
      return N[P] === E && I.identity === l ? I : {
        identity: l,
        pages: { ...N, [P]: E }
      };
    });
  }, [l]), p = M(null), w = j(() => {
    p.current && clearTimeout(p.current);
    const E = l;
    p.current = setTimeout(() => {
      p.current = null, u.current === E && g((P) => ({
        identity: E,
        tick: P.identity === E ? P.tick + 1 : 1
      }));
    }, 60);
  }, [l]);
  $(() => (p.current && (clearTimeout(p.current), p.current = null), m((E) => E.identity === l && E.pages.source === 0 && E.pages.translated === 0 ? E : { identity: l, pages: { source: 0, translated: 0 } }), g((E) => E.identity === l && E.tick === 0 ? E : { identity: l, tick: 0 }), () => {
    p.current && (clearTimeout(p.current), p.current = null);
  }), [l]);
  const k = K(
    () => Math.max(f.source, f.translated),
    [f]
  ), T = S === "translated" ? f.translated : f.source || f.translated, C = t == null ? void 0 : t.userZoom, x = t == null ? void 0 : t.shellWidth, D = `${l}-${v}-${C}-${n}-${f.source}-${f.translated}-${x}`;
  return {
    ...y,
    numPagesByPane: f,
    hudNumPages: k,
    primaryNumPages: T,
    metricsTick: v,
    onNumPages: R,
    onMetrics: w,
    rowSyncRevision: D
  };
}
const Ve = "data-reader-page", it = "data-reader-pane", kn = "data-natural-height", us = "reader-react-root", ds = "reader-react-grid", fs = "reader-react-scroll-shell", ms = "reader-react-pdf-pane", qr = "reader-react-pdf-page", zt = "reader-react-pdf-page-placeholder", Mn = "reader-react-pdf-page-slot";
function Ot(e, t) {
  const n = e != null ? `[${Ve}="${e}"]` : `[${Ve}]`;
  return t ? `${n}[${it}="${t}"]` : n;
}
function hs() {
  return `.${Mn}[${Ve}]`;
}
function Ft(e) {
  return Number(e.getAttribute(Ve));
}
const Gr = 0.25, $t = 1, ps = 0.05, Pt = 0.5, gs = 16, bs = 8, ys = 720;
function He() {
  const e = typeof window > "u" ? NaN : Number(window.innerWidth);
  return Number.isFinite(e) && e > 0 ? e : Number.POSITIVE_INFINITY;
}
function Kr(e) {
  return Number.isFinite(e) && e < ys;
}
function rt(e, t = Number.POSITIVE_INFINITY) {
  return Kr(t) && (e === "source" || e === "translated") ? $t : Pt;
}
function Ht(e) {
  return Number.isFinite(e) ? Math.min($t, Math.max(Gr, e)) : Pt;
}
function yt(e, t) {
  const n = Ht(Number(e) + t * ps);
  return Math.round(n * 100) / 100;
}
function vs(e) {
  return Math.round(Ht(e) * 100);
}
function ws(e) {
  const n = (Number(e) || 0) - gs - bs;
  return Math.max(160, Math.floor(n));
}
function Ss(e, t = Pt) {
  const n = Ht(t);
  return ws((Number(e) || 0) * n);
}
function Rs(e, t) {
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
const Ps = 8;
function Is(e, t) {
  return !Number.isFinite(e) || e < 80 || Math.abs(e - t) < Ps ? "ignore" : !Number.isFinite(t) || t <= 0 ? "immediate" : "settle";
}
const Yr = 200, Zr = [
  "markdown"
], Ts = Zr;
function Xr(e) {
  return Ts.includes(e);
}
const Es = "retainpdf:reader:view:v1:", rr = /* @__PURE__ */ new Set([
  "source",
  "translated",
  "markdown",
  "ai"
]), ks = /* @__PURE__ */ new Set([
  "source",
  "compare",
  "translated"
]);
function Qr() {
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
function eo(e) {
  const t = un(e);
  return t ? `${Es}${t}` : "";
}
function As(e) {
  if (!e || typeof e != "object") return;
  const t = Math.floor(Number(e.page)), n = Number(e.fraction);
  if (!(!Number.isFinite(t) || t < 1 || !Number.isFinite(n)))
    return {
      page: t,
      fraction: Math.max(0, Math.min(1, n))
    };
}
function Ns(e) {
  if (e === null) return null;
  if (!e || typeof e != "object") return;
  const t = `${e.left || ""}`, n = `${e.right || ""}`;
  if (!(!rr.has(t) || !rr.has(n) || t === n))
    return { left: t, right: n };
}
function _s(e) {
  return e === null ? null : Xr(e) ? e : void 0;
}
function Ls(e) {
  return ks.has(e) ? e : void 0;
}
function to(e) {
  if (!e || typeof e != "object") return null;
  const t = e;
  if (t.schema !== "retainpdf_reader_view_v1") return null;
  const n = As(t.anchor), r = Number(t.zoom), o = Ls(t.mode), a = Ns(t.splitLayout), s = _s(t.assistantPanel);
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
function Pe(e, t = Qr()) {
  const n = eo(e);
  if (!n || !t) return null;
  try {
    const r = t.getItem(n);
    return r ? to(JSON.parse(r)) : null;
  } catch {
    return null;
  }
}
function Wt(e, t, n = Qr()) {
  const r = eo(e);
  if (!r || !n) return null;
  const o = Pe(e, n), a = to({
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
function Cs(e, t, n = "") {
  var m;
  const [r, o] = L(() => {
    var h;
    return ((h = Pe(n)) == null ? void 0 : h.zoom) ?? rt(e, He());
  }), a = M(r), s = M(n);
  a.current = r;
  const c = M(1), i = M(((m = Pe(n)) == null ? void 0 : m.zoom) !== void 0);
  $(() => {
    var f;
    if (s.current === n) return;
    s.current = n;
    const h = (f = Pe(n)) == null ? void 0 : f.zoom;
    i.current = h !== void 0;
    const g = h ?? rt(e, He());
    c.current = 1, a.current = g, o(g);
  }, [e, n]), $(() => {
    if (i.current) return;
    const h = rt(e, He()), g = a.current;
    Math.abs(h - g) < 5e-4 || (c.current = 1, a.current = h, o(h));
  }, [e]);
  const l = j((h) => {
    const g = Ht(h), f = a.current;
    Math.abs(g - f) < 5e-4 || (c.current = g / (f || 1), i.current = !0, Wt(s.current, { zoom: g }), o(g));
  }, []), u = j((h) => {
    l(yt(a.current, h));
  }, [l]), d = j((h) => {
    l(rt(h));
  }, [l]);
  return _e(() => {
    const h = c.current;
    Math.abs(h - 1) < 1e-3 || (c.current = 1, Rs(t == null ? void 0 : t.current, h));
  }, [r, t]), { userZoom: r, onZoomChange: l, stepZoom: u, resetZoom: d };
}
function xs(e) {
  const { mode: t, setMode: n, beginModeSwitch: r } = e, o = M(t), a = M(n), s = M(r);
  return o.current = t, a.current = n, s.current = r, { setModeKeepingPage: j((i) => {
    i !== o.current && (s.current(), a.current(i));
  }, []) };
}
const An = 48;
function no(e, t = An) {
  return e.getBoundingClientRect().top + t;
}
function ro(e, t) {
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
function Lt(e, t, n = An) {
  if (!e)
    return null;
  const r = Ot(void 0, t), o = Array.from(e.querySelectorAll(r));
  if (!o.length || e.getBoundingClientRect().height <= 0)
    return null;
  const s = no(e, n), c = ro(o, s);
  return c ? { page: c.page, fraction: c.fraction } : null;
}
function vt(e, t, n = "auto", r, o = An) {
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
function Ds(e, t, n = "smooth", r) {
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
function zs(e, t, n) {
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
function ye(e) {
  return {
    page: Math.max(1, Math.floor(Number(e.page) || 1)),
    fraction: Math.min(1, Math.max(0, Number(e.fraction) || 0))
  };
}
function Os(e, t, n = !0, r = "", o) {
  const [a, s] = L(1);
  return $(() => {
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
      const v = no(c), y = ro(f, v);
      y && s(y.page);
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
const Fs = `canvas, .react-pdf__Page, .${qr}, .${zt}`, or = /* @__PURE__ */ new WeakMap();
function $s(e) {
  const t = Number(e.getAttribute(kn));
  if (Number.isFinite(t) && t > 0)
    return t;
  let n = or.get(e);
  if ((n == null || !n.isConnected) && (n = e.querySelector(Fs), or.set(e, n)), n) {
    const o = n.getBoundingClientRect().height;
    if (Number.isFinite(o) && o > 0)
      return o;
  }
  const r = e.getBoundingClientRect().height;
  return Number.isFinite(r) && r > 0 ? r : 0;
}
function js(e, t) {
  if (e.size !== t.size) return !1;
  for (const [n, r] of t)
    if (e.get(n) !== r) return !1;
  return !0;
}
function Bs(e) {
  const t = /* @__PURE__ */ new Map();
  e.querySelectorAll(hs()).forEach((r) => {
    const o = Ft(r);
    if (!Number.isFinite(o) || o < 1) return;
    const a = $s(r);
    if (a <= 0) return;
    const s = t.get(o) || { height: 0, count: 0 };
    s.height = Math.max(s.height, a), s.count += 1, t.set(o, s);
  });
  const n = /* @__PURE__ */ new Map();
  return t.forEach((r, o) => {
    r.count >= 2 && r.height > 0 && n.set(o, Math.ceil(r.height));
  }), n;
}
function Us(e, t, n = "", r) {
  const [o, a] = L(() => /* @__PURE__ */ new Map()), s = M(o), c = M(r);
  return c.current = r, _e(() => {
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
      const p = Bs(R);
      js(s.current, p) || (s.current = p, a(p)), u && !d && (d = !0, (w = c.current) == null || w.call(c));
    }, h = () => {
      cancelAnimationFrame(l), l = requestAnimationFrame(() => {
        requestAnimationFrame(m);
      });
    };
    h();
    const g = window.setTimeout(h, 100), f = window.setTimeout(() => {
      u = !0, h();
    }, 300), v = window.setTimeout(h, 700), y = e.current;
    let S = null;
    return y && typeof ResizeObserver < "u" && (S = new ResizeObserver(() => h()), S.observe(y)), () => {
      i = !0, cancelAnimationFrame(l), window.clearTimeout(g), window.clearTimeout(f), window.clearTimeout(v), S == null || S.disconnect();
    };
  }, [e, t, n]), o;
}
const Hs = [0, 48, 140, 320, 560], Ws = 700, Vs = [80, 200, 400], Js = 500, qs = 50, Gs = /* @__PURE__ */ new Set([
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
]), Ks = 180, ar = [0, 48, 140, 320, 700, 1200];
function Ys(e, t) {
  var P;
  const {
    primaryPane: n,
    mode: r,
    enabled: o = !0,
    persistenceKey: a = "",
    restoreReady: s = !0
  } = t, c = M(
    ((P = Pe(a)) == null ? void 0 : P.anchor) || { page: 1, fraction: 0 }
  ), i = M(null), l = M(!1), u = M(r), d = M(null), m = M(null), h = M(null), g = M(null), f = M(a), v = M(""), y = M(n);
  y.current = n;
  const S = j(() => {
    var I;
    (I = d.current) == null || I.call(d), d.current = null, m.current != null && (clearTimeout(m.current), m.current = null);
  }, []), R = j(() => {
    !l.current && i.current == null || (S(), h.current != null && (clearTimeout(h.current), h.current = null), i.current = null, l.current = !1);
  }, [S]), p = j((I = !1) => {
    g.current != null && (clearTimeout(g.current), g.current = null);
    const N = () => {
      g.current = null, Wt(f.current, {
        anchor: ye(c.current)
      });
    };
    I ? N() : g.current = setTimeout(N, Ks);
  }, []), w = j((I) => {
    c.current = ye(I), i.current = null, h.current != null && clearTimeout(h.current), h.current = setTimeout(() => {
      h.current = null, l.current = !1;
    }, qs);
  }, []);
  $(() => {
    if (!o)
      return;
    let I = !1, N = null, O = null, H = null;
    const F = () => {
      if (I) return;
      const J = e.current;
      if (!J) {
        H = setTimeout(F, 50);
        return;
      }
      N = J, O = () => {
        if (l.current)
          return;
        const B = Lt(N, y.current);
        B && (c.current = B, p());
      }, N.addEventListener("scroll", O, { passive: !0 }), l.current || O();
    };
    return F(), () => {
      I = !0, H != null && clearTimeout(H), N && O && N.removeEventListener("scroll", O);
    };
  }, [o, r, n, e, p]), $(() => {
    if (!o) return;
    const I = e.current;
    if (!I) return;
    const N = (O) => {
      O.metaKey || O.ctrlKey || O.altKey || Gs.has(O.key) && R();
    };
    return I.addEventListener("wheel", R, { passive: !0 }), I.addEventListener("touchmove", R, { passive: !0 }), window.addEventListener("keydown", N), () => {
      I.removeEventListener("wheel", R), I.removeEventListener("touchmove", R), window.removeEventListener("keydown", N);
    };
  }, [o, e, R]), _e(() => {
    var N;
    if (f.current === a) return;
    p(!0), S(), h.current != null && (clearTimeout(h.current), h.current = null), f.current = a, v.current = "";
    const I = (N = Pe(a)) == null ? void 0 : N.anchor;
    c.current = I ? ye(I) : { page: 1, fraction: 0 }, i.current = null, l.current = !!a, u.current = r;
  }, [a, r, p, S]), $(() => {
    var N;
    if (!o || !s || !a || v.current === a) return;
    v.current = a;
    const I = ye(
      ((N = Pe(a)) == null ? void 0 : N.anchor) || { page: 1, fraction: 0 }
    );
    return c.current = I, i.current = I, l.current = !0, S(), d.current = dn(
      () => e.current,
      I,
      {
        behavior: "auto",
        pane: y.current,
        delaysMs: ar,
        onDone: () => w(I)
      }
    ), m.current = setTimeout(() => {
      m.current = null, w(I);
    }, Math.max(...ar) + 160), () => S();
  }, [o, s, a, e, w, S]), $(() => {
    if (u.current === r)
      return;
    if (u.current = r, !o) {
      l.current = !1, i.current = null, S();
      return;
    }
    const I = i.current ? ye(i.current) : ye(c.current);
    return l.current = !0, i.current = I, c.current = I, S(), d.current = dn(
      () => e.current,
      I,
      {
        behavior: "auto",
        pane: n,
        // 等页宽/行高同步后再钉；同一 locked 幂等，不会越滚越远
        delaysMs: Hs,
        onDone: () => w(I)
      }
    ), m.current = setTimeout(() => {
      m.current = null, w(I);
    }, Ws), () => {
      S();
    };
  }, [r, o, n, e, w, S]), $(() => () => {
    S(), h.current != null && (clearTimeout(h.current), h.current = null), p(!0);
  }, [S, p]);
  const k = j(() => {
    const I = Lt(
      e.current,
      y.current
    );
    return ye(I || c.current);
  }, [e]), T = j(() => {
    l.current = !0;
    const I = Lt(
      e.current,
      y.current
    ), N = ye(I ?? c.current);
    return c.current = N, i.current = N, p(), N;
  }, [e, p]), C = j((I, N, O) => {
    const H = O || y.current, F = jt(I, N || 1), J = { page: F, fraction: 0 };
    c.current = J, l.current = !0, i.current = J, p(), S(), Ds(e.current, F, "smooth", H), d.current = zs(
      () => e.current,
      F,
      {
        behavior: "auto",
        pane: H,
        delaysMs: Vs,
        onDone: () => w(J)
      }
    ), m.current = setTimeout(() => {
      m.current = null, w(J);
    }, Js);
  }, [e, w, S, p]), x = j(() => ye(c.current), []), D = j(() => l.current, []), E = j(() => {
    if (!l.current || !i.current)
      return;
    const I = ye(i.current);
    vt(
      e.current,
      I,
      "auto",
      y.current
    );
  }, [e]);
  return {
    lockFromShell: k,
    beginModeSwitch: T,
    goToPage: C,
    getAnchor: x,
    isRestoring: D,
    repinIfRestoring: E
  };
}
function Zs(e, t) {
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
function oo(e, t, n) {
  const r = `${(n == null ? void 0 : n.jobId) || ""}`.trim(), o = `${(n == null ? void 0 : n.documentId) || ""}`.trim(), a = `j:${r}:d:${o}`;
  return t == null ? `${a}:none:${(e == null ? void 0 : e.blockId) || ""}` : `${a}:p:${t}:b:${(e == null ? void 0 : e.blockId) || ""}`;
}
const Xs = [0, 80, 200, 400, 800], Qs = 120, ei = 400;
function ti(e, t, n) {
  const { enabled: r, numPages: o, goToPage: a, resolveBlockPage: s, onAnchorApplied: c, jobId: i, documentId: l, regionsSettled: u = !0 } = e, d = M(a);
  d.current = a;
  const m = M(s);
  m.current = s;
  const h = M(c);
  h.current = c;
  const g = M(n);
  g.current = n, $(() => {
    var p, w;
    if (!r || !Number.isFinite(o) || o < 1)
      return;
    const f = Sa(), v = Zs(f, m.current);
    if (v == null && (f != null && f.blockId) && !u) return;
    const y = oo(f, v, { jobId: i, documentId: l });
    if (t.current === y)
      return;
    if (v == null) {
      t.current = y, (p = g.current) == null || p.call(g);
      return;
    }
    t.current = y, f && ((w = h.current) == null || w.call(h, f, v));
    const S = [];
    let R = 0;
    for (const k of Xs)
      R = Math.max(R, k), S.push(
        setTimeout(() => {
          d.current(v);
        }, k)
      );
    return S.push(
      setTimeout(() => {
        var k;
        (k = g.current) == null || k.call(g);
      }, R + Qs)
    ), () => {
      for (const k of S) clearTimeout(k);
    };
  }, [r, o, i, l, t, u]);
}
function ni(e) {
  var a;
  const t = globalThis.window;
  if (!t || typeof ((a = t.history) == null ? void 0 : a.replaceState) != "function") return;
  const n = t.location, r = `${e || ""}`, o = `${n.pathname}${r ? `?${r}` : ""}${n.hash || ""}`;
  t.history.replaceState(null, "", o);
}
function ri(e, t, n) {
  const {
    syncEnabled: r,
    currentPage: o,
    resolveBlockPage: a,
    syncDebounceMs: s = ei,
    jobId: c,
    documentId: i,
    applyReaderSearch: l
  } = e, u = M(a);
  u.current = a;
  const d = M(l);
  d.current = l;
  const m = M(0);
  $(() => {
    if (!n || !r || !t.current || !Number.isFinite(o) || o < 1 || m.current === o) return;
    const h = setTimeout(() => {
      var y;
      const g = ((y = globalThis.location) == null ? void 0 : y.search) || "", f = Jo(g, o, u.current);
      if (m.current = o, f === null) return;
      const v = `${new URLSearchParams(f).get("block_id") || ""}`.trim();
      t.current = oo(
        { blockId: v },
        o,
        { jobId: c, documentId: i }
      ), (d.current || ni)(f);
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
function oi(e) {
  const t = M(""), [n, r] = L(!1), o = j(() => r(!0), []), a = {
    enabled: e.enabled,
    numPages: e.numPages,
    goToPage: e.goToPage,
    resolveBlockPage: e.resolveBlockPage,
    onAnchorApplied: e.onAnchorApplied,
    jobId: e.jobId,
    documentId: e.documentId,
    regionsSettled: e.regionsSettled
  };
  ti(a, t, o), ri(e, t, n);
}
const ft = {
  layoutByPage: /* @__PURE__ */ new Map(),
  pagesByPage: /* @__PURE__ */ new Map(),
  lastSeq: 0,
  connection: "idle",
  jobStatus: "",
  error: ""
};
function ai(e) {
  return new Map(((e == null ? void 0 : e.pages) || []).map((t) => [t.page_idx, t]));
}
function sr(e, t) {
  return e.attempt !== t.attempt ? e.attempt < t.attempt ? -1 : 1 : e.generation !== t.generation ? e.generation < t.generation ? -1 : 1 : 0;
}
function ao(e, t, n) {
  if (n.page_idx !== t.page_idx) return "retry";
  const r = sr(n, t);
  if (r < 0 || r === 0 && n.page_hash !== t.page_hash) return "retry";
  if (!e) return "accept";
  const o = sr(n, e);
  return o < 0 || o === 0 && n.page_hash === e.pageHash ? "ignore" : "accept";
}
function si(e, t, n) {
  if (t.seq <= e.lastSeq) return e;
  const r = e.pagesByPage.get(t.page_idx), o = ao(r, t, n);
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
function ii(e) {
  const { hasOverlayContent: t, connection: n, showSource: r } = e;
  return {
    topBarPill: t && n !== "terminal",
    sourcePaneToggle: t && r,
    // 和 resolveReaderPaneComposition 的 overlayOnSource 同一套条件，外加
    // 「源文栏得在台面上」——否则叠层没有落脚的地方。
    overlayRenderable: t && r && e.liveTranslationVisible && !e.assistantOpen
  };
}
const ir = [250, 500, 1e3, 2e3, 4e3], Kt = [80, 160, 320, 640, 1e3, 1500], cr = [250, 500, 1e3, 2e3, 4e3, 5e3];
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
  return Qo(e) ? `${e.code || ""}`.trim() : "";
}
function At(e, t) {
  const n = Nn(e);
  return n === "LIVE_TRANSLATION_PAGE_NOT_COMMITTED" ? "尚未收到可显示的页面译文" : n === "LIVE_TRANSLATION_LAYOUT_NOT_READY" ? "正在等待 OCR 版面数据" : `${(e == null ? void 0 : e.message) || ""}`.trim() || t;
}
async function ci(e, t, n, r, o) {
  let a = null;
  for (let s = 0; ; s += 1) {
    try {
      const i = await o.fetchPage(e, t.page_idx, { signal: r });
      if (ao(n.pagesByPage.get(t.page_idx), t, i) !== "retry")
        return i;
      a = ea(
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
function li({
  jobId: e,
  jobStatus: t,
  enabled: n,
  liveTranslationPort: r = void 0
}) {
  const [o, a] = L(ft), s = M(o), c = M("");
  s.current = o;
  const i = `${e || ""}`.trim(), l = `${t || ""}`.trim().toLowerCase(), u = Pn(l) ? l : "";
  return $(() => {
    if (!n || !i) {
      c.current = "", s.current = ft, a(ft);
      return;
    }
    const d = r === void 0 ? wa() : r, m = c.current === i;
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
    }, y = async () => {
      let R = 0;
      for (; !h.signal.aborted; )
        try {
          const p = await d.fetchLayout(i, { signal: h.signal });
          g = !0, v((w) => ({
            ...w,
            layoutByPage: ai(p),
            jobStatus: l,
            error: ""
          }));
          return;
        } catch (p) {
          if ((p == null ? void 0 : p.name) === "AbortError") return;
          const w = Nn(p);
          if (!(w === "LIVE_TRANSLATION_LAYOUT_NOT_READY" || !w)) {
            v((T) => ({
              ...T,
              connection: u ? "terminal" : "unavailable",
              jobStatus: l,
              error: At(p, "实时译文暂不可用")
            }));
            return;
          }
          if (u) {
            v((T) => ({
              ...T,
              connection: "terminal",
              jobStatus: l,
              error: ""
            }));
            return;
          }
          v((T) => ({
            ...T,
            connection: "connecting",
            jobStatus: l,
            error: At(p, "正在等待 OCR 版面数据")
          })), await fn(ir[Math.min(R, ir.length - 1)], h.signal).catch(() => {
          }), R += 1;
        }
    };
    return (async () => {
      if (await y(), !g || h.signal.aborted) return;
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
                w = await ci(
                  i,
                  p,
                  s.current,
                  h.signal,
                  d
                );
              } catch (k) {
                if ((k == null ? void 0 : k.name) === "AbortError" || h.signal.aborted) throw k;
                v((T) => ({
                  ...T,
                  lastSeq: Math.max(T.lastSeq, p.seq),
                  error: At(k, "部分页面的实时译文暂时取不到")
                }));
                return;
              }
              v((k) => {
                const T = si(k, p, w);
                return u ? {
                  ...T,
                  connection: "terminal",
                  jobStatus: l
                } : {
                  ...T,
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
            error: At(p, "实时译文连接已中断，正在重连")
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
        await fn(cr[Math.min(R, cr.length - 1)], h.signal).catch(() => {
        }), R += 1;
      }
    })(), () => h.abort();
  }, [n, r, i, u]), o;
}
function ui(e) {
  const t = e && typeof e == "object" ? e : {}, n = t.data && typeof t.data == "object" ? t.data : t, r = Array.isArray(n.groups) ? n.groups : [], o = /* @__PURE__ */ new Map();
  for (const a of r) {
    const s = a || {}, c = `${s.value ?? ""}`.trim(), i = Number(s.count) || 0;
    c && i > 0 && o.set(c, i);
  }
  return o;
}
function di(e, t = !0) {
  const [n, r] = L(() => /* @__PURE__ */ new Map());
  return $(() => {
    r((c) => c.size ? /* @__PURE__ */ new Map() : c);
    const o = `${e || ""}`.trim();
    if (!t || !o) return;
    const a = Ut().fetchRevisionGroups;
    if (!a) return;
    let s = !1;
    return a(o).then((c) => {
      !s && c && r(ui(c));
    }).catch(() => {
    }), () => {
      s = !0;
    };
  }, [e, t]), n;
}
const fi = 4500;
function mi(e) {
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
const hi = /* @__PURE__ */ new Set(["book", "translate"]);
function so(e) {
  return !!(e.jobId && e.sourceUrl && hi.has(e.workflow));
}
function pi(e) {
  return !!(so(e) && !(e.jobStatus === "succeeded" && e.translatedUrl));
}
function gi() {
  const e = rs(), t = so({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    workflow: e.workflow
  }), n = pi({
    jobId: e.jobId,
    sourceUrl: e.sourceUrl,
    translatedUrl: e.translatedUrl,
    jobStatus: e.jobStatus,
    workflow: e.workflow
  }), r = M({ jobId: "", running: !1 });
  r.current.jobId !== e.jobId && (r.current = { jobId: e.jobId, running: !1 });
  const o = `${e.jobStatus || ""}`.trim().toLowerCase();
  o && !Pn(o) && (r.current.running = !0);
  const a = li({
    jobId: e.jobId,
    jobStatus: e.jobStatus,
    enabled: t && (n || r.current.running)
  }), { shellRef: s, shellEl: c, shellWidth: i, bindShell: l } = is(), u = di(e.jobId, !e.sourceOnly), d = Ms({
    documentId: e.documentId,
    jobId: e.jobId
  }), m = `${d}\0${e.jobId}\0${e.sourceUrl}\0${e.translatedUrl}`, { userZoom: h, onZoomChange: g } = Cs(e.mode, s, d), f = ls(
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
    goToPage: y,
    repinIfRestoring: S
  } = Ys(s, {
    primaryPane: f.primaryPane,
    mode: e.mode,
    enabled: !e.boot.loading,
    persistenceKey: d,
    restoreReady: f.primaryNumPages > 0
  });
  $(() => {
    S();
  }, [i, S]);
  const R = Us(
    s,
    f.compareMode,
    f.rowSyncRevision,
    S
  ), p = Os(
    s,
    f.primaryNumPages,
    !e.boot.loading,
    `${e.mode}-${h}-${f.metricsTick}`,
    f.primaryPane
  ), w = j((F, J) => {
    var V, ee;
    const B = Math.max(
      Number(f.hudNumPages) || 0,
      Number(f.primaryNumPages) || 0,
      Number((V = f.numPagesByPane) == null ? void 0 : V.source) || 0,
      Number((ee = f.numPagesByPane) == null ? void 0 : ee.translated) || 0
    );
    y(F, B, J);
  }, [y, f.hudNumPages, f.primaryNumPages, f.numPagesByPane]), [k, T] = L(null), C = M(null), x = j((F) => {
    C.current && clearTimeout(C.current), T(F), F && (C.current = setTimeout(() => T(null), fi));
  }, []);
  $(() => () => {
    C.current && clearTimeout(C.current);
  }, []);
  const D = j((F) => {
    const J = qt(e.regions, F);
    return J ? Kn(J, f.primaryPane).page : null;
  }, [e.regions, f.primaryPane]), E = j((F, J) => {
    const B = J || f.primaryPane, V = typeof F == "object" && F ? `${F.block_id || ""}`.trim() : "", ee = typeof F == "object" && F ? `${F.image_url || ""}`.trim() : "", fe = typeof F == "object" && F ? F.page_idx != null ? Number(F.page_idx) + 1 : F.page != null ? Number(F.page) : null : typeof F == "number" ? F + 1 : null, re = Ko(e.regions, ee, fe) || qt(e.regions, V) || (typeof F == "object" ? Yo(e.regions, F) : null);
    let ae = re ? Kn(re, B).page : null;
    ae == null && (ae = mi(F)), !(ae == null || ae < 1) && (x(re), w(ae, B));
  }, [x, w, f.primaryPane, e.regions]);
  oi({
    enabled: !e.boot.loading && !e.boot.failed && e.assetsReady,
    syncEnabled: !e.boot.loading && !e.boot.failed && e.assetsReady,
    numPages: f.hudNumPages || 0,
    currentPage: p,
    goToPage: w,
    resolveBlockPage: D,
    jobId: e.jobId,
    documentId: e.documentId,
    regionsSettled: e.regionsSettled,
    onAnchorApplied: (F) => {
      x(qt(e.regions, F.blockId));
    }
  });
  const { setModeKeepingPage: P } = xs({
    mode: e.mode,
    setMode: e.setMode,
    beginModeSwitch: v
  });
  $(() => {
    x(null);
  }, [m, x]);
  const I = !e.boot.loading && !e.boot.failed, N = K(() => ({ bindShell: l, shellEl: c, shellWidth: i, shellRef: s }), [l, c, i, s]), O = K(() => ({
    sourceUrl: e.sourceUrl,
    translatedUrl: e.translatedUrl,
    sourceFile: e.sourceFile,
    translatedFile: e.translatedFile
  }), [e.sourceUrl, e.translatedUrl, e.sourceFile, e.translatedFile]), H = K(() => ({
    session: e,
    boot: e.boot,
    sourceOnly: e.sourceOnly,
    mode: e.mode,
    userZoom: h,
    onZoomChange: g,
    shell: N,
    panes: f,
    sessionFiles: O,
    rowHeights: R,
    goToPage: w,
    activeRegion: k,
    jumpToAnchor: E,
    setModeKeepingPage: P,
    download: e.download,
    showHud: I,
    viewStateKey: d,
    liveTranslation: a,
    liveTranslationAvailable: n,
    revisedBlocks: u
  }), [e, N, f, O, R, w, k, E, P, I, h, g, d, a, n, u]);
  return K(() => ({
    ...H,
    currentPage: p
  }), [H, p]);
}
const bi = [
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
], yi = [
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
function vi(e) {
  const t = e.length === 1 ? e.toLowerCase() : e;
  for (const n of bi)
    if (n.keys.some(
      (o) => o.length === 1 ? o === t : o === e
    )) return n;
  return null;
}
function wi(e) {
  if (!(e instanceof HTMLElement))
    return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
const Si = ".reader-notes-panel";
function Ri(e) {
  return e instanceof Element ? !!e.closest(Si) : !1;
}
function Pi(e) {
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
  $(() => {
    if (!l)
      return;
    const u = (d) => {
      if (d.defaultPrevented || d.metaKey || d.ctrlKey || d.altKey || wi(d.target) || Ri(d.target))
        return;
      const m = d.key, h = vi(m);
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
const Ii = "retainpdf:soft-reader-close";
function Ti() {
  return new URL("./index.html", window.location.href).href;
}
function Ei() {
  if (typeof window > "u" || window.self === window.top) return !1;
  try {
    return window.parent.postMessage(
      { type: Ii },
      window.location.origin
    ), !0;
  } catch {
    return !1;
  }
}
function ki(e, t, n) {
  if (n <= 1 || !e) return !1;
  try {
    const r = new URL(t), o = new URL(e, r);
    return o.origin === r.origin && !/reader\.html$/i.test(o.pathname) && !/detail\.html$/i.test(o.pathname);
  } catch {
    return !1;
  }
}
function Mi() {
  if (!(typeof window > "u") && !Ei()) {
    if (ki(
      document.referrer,
      window.location.href,
      window.history.length
    )) {
      window.history.back();
      return;
    }
    window.location.assign(Ti());
  }
}
function Ai({
  id: e,
  className: t,
  label: n,
  pressed: r,
  onClick: o,
  children: a
}) {
  return /* @__PURE__ */ b("button", { id: e, type: "button", className: t, "aria-label": n, title: n, "aria-pressed": r, onClick: o, children: a });
}
function Ni({ onBeforeClose: e } = {}) {
  return /* @__PURE__ */ z(Ai, { id: "reader-close-home-btn", className: "reader-close-home-btn", label: "返回主页", onClick: () => {
    e == null || e(), Mi();
  }, children: [
    /* @__PURE__ */ b(En, { className: "reader-close-home-icon", size: 18, strokeWidth: 2.25, "aria-hidden": !0 }),
    /* @__PURE__ */ b("span", { className: "reader-close-home-label", children: "关闭" })
  ] });
}
let lr = !1;
function _i() {
  if (lr)
    return;
  const e = bt().resolvePdfjsVendorUrl("build/pdf.worker.mjs");
  e && (Wr.GlobalWorkerOptions.workerSrc = e, lr = !0);
}
async function Li(e) {
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
const Ci = /* @__PURE__ */ new Set(["text", "formula", "table", "figure"]);
function xi(e, t, n) {
  return e.flatMap((r) => {
    if (!Ci.has(In(r.region))) return [];
    const o = Tn(r, t, n);
    return o ? [{ itemId: r.itemId, highlight: r, rect: o }] : [];
  });
}
function ur(e, t, n) {
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
const $e = "reader-text-hover-copy", Di = "reader-text-hover-id", io = "reader-text-hover-tools";
function Me({
  className: e,
  state: t,
  label: n,
  title: r,
  onClick: o,
  children: a
}) {
  return /* @__PURE__ */ b(
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
function zi(e) {
  const t = e.assetUrls[0] || e.assetIds[0] || "";
  if (!t) return "";
  try {
    return Ma("", t);
  } catch {
    return t;
  }
}
async function co(e) {
  const t = await va(e);
  if (!t.ok) throw new Error(`图片加载失败（${t.status}）`);
  return t.blob();
}
async function Oi(e) {
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
async function Fi(e) {
  var n;
  if (!e || !((n = navigator.clipboard) != null && n.write) || typeof ClipboardItem > "u") return !1;
  const t = await Oi(await co(e));
  return await navigator.clipboard.write([new ClipboardItem({ "image/png": t })]), !0;
}
async function dr(e, t) {
  const n = URL.createObjectURL(await co(e));
  if (t) {
    const r = document.createElement("a");
    r.href = n, r.download = "paperloom-image", r.click();
  } else
    window.open(n, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(n), 6e4);
}
function $i(e) {
  if (typeof DOMParser > "u" || !/<table(?:\s|>)/i.test(e)) return [];
  const t = new DOMParser().parseFromString(e, "text/html").querySelector("table");
  return t ? [...t.rows].map((n) => [...n.cells].map((r) => {
    var o;
    return ((o = r.textContent) == null ? void 0 : o.replace(/\s+/g, " ").trim()) || "";
  })) : [];
}
function ji(e) {
  const t = $i(e);
  if (t.length) return t;
  const n = e.trim().split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  return n.length ? n.some((r) => r.includes("|")) ? n.filter((r) => !/^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/.test(r)).map((r) => r.replace(/^\|\s*/, "").replace(/\s*\|$/, "").split("|").map((o) => o.trim())) : n.some((r) => r.includes("	")) ? n.map((r) => r.split(/\t+/).map((o) => o.trim())) : n.map((r) => [r]) : [];
}
function Bi(e) {
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
function Yt(e, t, n) {
  const r = t === "translated" ? e.translated : e.source, o = e.markdown.trim() || r.text.trim();
  if (n === "text") return rn(e, t);
  const a = ji(o);
  if (!a.length) return rn(e, t);
  const s = Math.max(...a.map((i) => i.length)), c = a.map((i) => Array.from({ length: s }, (l, u) => i[u] || ""));
  if (n === "markdown") {
    const i = `| ${c[0].join(" | ")} |`, l = `| ${c[0].map(() => "---").join(" | ")} |`;
    return [i, l, ...c.slice(1).map((u) => `| ${u.join(" | ")} |`)].join(`
`);
  }
  return [
    `\\begin{tabular}{${"l".repeat(s)}}`,
    ...c.map((i) => `${i.map(Bi).join(" & ")} \\\\`),
    "\\end{tabular}"
  ].join(`
`);
}
const lo = 26, uo = 250;
function fo(e, t = uo) {
  return e.height < lo * 2 || e.width < t;
}
function Ui(e) {
  var t;
  return ((t = e.match(/\[(\d+)\]/)) == null ? void 0 : t[1]) || null;
}
function Hi(e) {
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
function Wi(e) {
  const t = [], n = (r) => {
    for (const o of Hi(r))
      t.includes(o) || t.push(o);
  };
  for (const r of e.matchAll(/\[((?:\d+\s*[-–]\s*\d+|\d+)(?:\s*[,;，、]\s*(?:\d+\s*[-–]\s*\d+|\d+))*)\]/g)) n(r[1]);
  for (const r of e.matchAll(/<sup[^>]*>\s*(\d+(?:\s*[-–]\s*\d+)?)\s*<\/sup>/gi)) n(r[1]);
  return t.slice(0, 32);
}
function Vi(e, t) {
  return `${e}`.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, "") + `|${t.toLocaleLowerCase()}`;
}
function mo(e) {
  const t = [], n = /* @__PURE__ */ new Set(), r = (o, a) => {
    const s = o.trim().replace(/\s+/g, " "), c = a.trim().toLocaleLowerCase();
    if (!s || !/^\d{4}[a-z]?$/.test(c)) return;
    const i = Vi(s, c);
    n.has(i) || (n.add(i), t.push({ key: i, label: `${s}, ${c}` }));
  };
  for (const o of e.matchAll(/([\p{L}][\p{L}'’.-]{1,}(?:\s+et\s+al\.?|\s+(?:and|&)\s+[\p{L}][\p{L}'’.-]{1,})?)\s*[,，]?\s*[（(]?\s*((?:19|20)\d{2}[a-z]?)\s*[)）]?/giu))
    r(o[1], o[2]);
  return t.slice(0, 16);
}
function Ji(e) {
  const t = /* @__PURE__ */ new Map();
  for (const n of e) {
    const r = n.source.text || n.translated.text || "", a = [Ui(r), ...mo(r).map((s) => s.key)].filter(Boolean);
    for (const s of a) {
      const c = t.get(s) || [];
      c.push(n), t.set(s, c);
    }
  }
  return t;
}
function qi(e, t, n) {
  if (In(e.highlight.region) !== "text" || e.highlight.region.subType === "reference_entry") return [];
  const r = e.highlight.region.source.text || e.highlight.region.translated.text || "", o = n ? [n] : Wi(r), a = n ? [] : mo(r);
  return [
    ...o.map((c) => ({ key: c, label: c })),
    ...a
  ].flatMap(({ key: c, label: i }) => (t.get(c) || []).map((l) => ({
    itemId: l.itemId,
    label: i,
    text: (l.source.text || l.translated.text || "").trim(),
    page: l.source.page
  }))).filter((c, i, l) => l.findIndex((u) => u.itemId === c.itemId) === i);
}
function Gi({
  target: e,
  pane: t = "source",
  revisedCount: n = 0,
  referenceIndex: r,
  referenceRegions: o,
  citationLabel: a,
  onReferenceClick: s
}) {
  const [c, i] = L("idle"), [l, u] = L("idle"), d = M([]), m = (e == null ? void 0 : e.itemId) || "";
  $(() => {
    i("idle"), u("idle");
    const T = d.current;
    return () => {
      T.forEach((C) => window.clearTimeout(C)), d.current = [];
    };
  }, [m]);
  const h = K(
    () => o ? Ji(o) : void 0,
    [o]
  );
  if (!e) return null;
  const g = rn(e.highlight.region, t), f = In(e.highlight.region), v = f === "figure" ? zi(e.highlight.region) : "", y = r || h, S = y ? qi(e, y, a) : [], R = (T, C) => async (x) => {
    x.preventDefault(), x.stopPropagation();
    const D = await Li(T);
    C(D ? "copied" : "failed"), d.current.push(window.setTimeout(() => C("idle"), 1200));
  }, p = f === "formula" ? "复制 LaTeX" : "复制", w = fo(e.rect), k = async (T, C) => {
    if (C.preventDefault(), C.stopPropagation(), !v) {
      i("failed");
      return;
    }
    try {
      if (T === "copy") {
        if (!await Fi(v)) throw new Error("图片复制不可用");
      } else T === "open" ? await dr(v, !1) : await dr(v, !0);
      i("copied");
    } catch {
      i("failed");
    }
    d.current.push(window.setTimeout(() => i("idle"), 1200));
  };
  return /* @__PURE__ */ b("div", { className: "reader-text-hover-layer", children: /* @__PURE__ */ b(
    "div",
    {
      className: "reader-text-hover-frame",
      "data-reader-text-hover-id": e.itemId,
      "data-reader-text-hover-kind": f,
      style: e.rect,
      children: /* @__PURE__ */ z(
        "div",
        {
          className: io,
          "data-placement": w ? "outside" : "inside",
          children: [
            /* @__PURE__ */ b(
              Me,
              {
                className: Di,
                state: l,
                label: `复制翻译编号 ${e.itemId}`,
                title: "翻译编号，点击复制",
                onClick: R(e.itemId, u),
                children: l === "copied" ? "已复制编号" : e.itemId
              }
            ),
            t === "translated" && n > 0 ? /* @__PURE__ */ z("span", { className: "reader-text-hover-revised", "data-reader-revised-count": n, children: [
              "改过 ",
              n,
              " 次"
            ] }) : null,
            S.map((T) => /* @__PURE__ */ z(
              Me,
              {
                className: "reader-text-hover-reference",
                title: `跳转到参考文献 ${T.label}`,
                state: "idle",
                label: `跳转到参考文献 ${T.label}`,
                onClick: (C) => {
                  C.preventDefault(), C.stopPropagation(), s == null || s(T.itemId);
                },
                children: [
                  /* @__PURE__ */ z("strong", { children: [
                    "参考文献 ",
                    T.label
                  ] }),
                  /* @__PURE__ */ b("span", { children: T.text })
                ]
              },
              T.itemId
            )),
            f === "table" ? /* @__PURE__ */ z(We, { children: [
              /* @__PURE__ */ b(
                Me,
                {
                  className: $e,
                  state: c,
                  label: "复制表格",
                  title: "复制表格",
                  onClick: R(Yt(e.highlight.region, t === "translated" ? "translated" : "source", "text"), i),
                  children: c === "copied" ? "已复制" : c === "failed" ? "复制失败" : "复制表格"
                }
              ),
              /* @__PURE__ */ b(
                Me,
                {
                  className: $e,
                  state: c,
                  label: "复制表格为 Markdown",
                  title: "复制表格为 Markdown",
                  onClick: R(Yt(e.highlight.region, t === "translated" ? "translated" : "source", "markdown"), i),
                  children: "Markdown"
                }
              ),
              /* @__PURE__ */ b(
                Me,
                {
                  className: $e,
                  state: c,
                  label: "复制表格为 LaTeX",
                  title: "复制表格为 LaTeX",
                  onClick: R(Yt(e.highlight.region, t === "translated" ? "translated" : "source", "latex"), i),
                  children: "LaTeX"
                }
              )
            ] }) : f === "figure" ? /* @__PURE__ */ z(We, { children: [
              /* @__PURE__ */ b(
                Me,
                {
                  className: $e,
                  state: c,
                  label: "复制图片",
                  title: "复制图片",
                  onClick: (T) => void k("copy", T),
                  children: c === "copied" ? "已复制" : c === "failed" ? "复制失败" : "复制图片"
                }
              ),
              /* @__PURE__ */ b(
                Me,
                {
                  className: $e,
                  state: c,
                  label: "放大图片",
                  title: "放大图片",
                  onClick: (T) => void k("open", T),
                  children: "放大"
                }
              ),
              /* @__PURE__ */ b(
                Me,
                {
                  className: $e,
                  state: c,
                  label: "下载图片",
                  title: "下载图片",
                  onClick: (T) => void k("download", T),
                  children: "下载"
                }
              )
            ] }) : g ? /* @__PURE__ */ b(
              Me,
              {
                className: $e,
                state: c,
                label: t === "translated" ? "复制这段译文" : "复制这段原文",
                onClick: R(g, i),
                children: c === "copied" ? "已复制" : c === "failed" ? "复制失败" : p
              }
            ) : null
          ]
        }
      )
    }
  ) });
}
function Ki(e, t) {
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
      Ki(e, a),
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
const Zi = '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif', Xi = 256, mt = /* @__PURE__ */ new Map();
function Qi(e) {
  return `${e || ""}`.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function ec(e) {
  const t = `${e || ""}`, { text: n, slots: r } = fa(t, { bareLatex: !0 }), o = Qi(n), a = ma(o, r);
  if (!r.length)
    return { fallbackHtml: a, richHtml: Promise.resolve(a), hasMath: !1 };
  let s = mt.get(t);
  if (!s && (s = ha(o, r, { preserveSource: !1 }), mt.set(t, s), mt.size > Xi)) {
    const c = mt.keys().next().value;
    c !== void 0 && mt.delete(c);
  }
  return { fallbackHtml: a, richHtml: s, hasMath: !0 };
}
function Zt(e) {
  return /title|heading|header|display_formula|equation/i.test(e);
}
function Ae(e) {
  const t = Number(e);
  return Number.isFinite(t) && t > 0 ? t : void 0;
}
function tc(e, t) {
  const n = e.typography, r = Ae(t) || 1, o = Ae(n == null ? void 0 : n.font_size_pt), a = Math.max(1, `${e.sourceText || ""}`.split(/\n+/).length), s = e.rect.height / Math.max(1.28, a * 1.18), c = Zt(e.kind) ? 24 : /caption|footnote|table/i.test(e.kind) ? 9.5 : 11, i = Math.max(5.5 * r, Math.min(s, c * r)), l = Ae(n == null ? void 0 : n.fit_min_font_size_pt), u = Ae(n == null ? void 0 : n.fit_max_font_size_pt), d = Math.max(3.5, (l || 5.5) * r), m = Math.max(
    d,
    u ? u * r : o ? o * r : i
  ), h = o ? o * r : i, g = Ae(n == null ? void 0 : n.leading_em), f = [
    Ae(n == null ? void 0 : n.padding_top_pt) || 0,
    Ae(n == null ? void 0 : n.padding_right_pt) || 0,
    Ae(n == null ? void 0 : n.padding_bottom_pt) || 0,
    Ae(n == null ? void 0 : n.padding_left_pt) || 0
  ].map((v) => v * r);
  return {
    fontFamily: `${(n == null ? void 0 : n.font_family) || ""}`.trim() || Zi,
    fontSizePx: Math.max(d, Math.min(m, h)),
    minFontSizePx: d,
    maxFontSizePx: m,
    // Typst leading is the additional inter-line gap, unlike CSS line-height.
    lineHeight: g ? 1 + g : 1.3,
    fontWeight: (n == null ? void 0 : n.font_weight) || (Zt(e.kind) ? 600 : 400),
    textAlign: ["left", "center", "right", "justify"].includes(`${(n == null ? void 0 : n.text_align) || ""}`) ? n == null ? void 0 : n.text_align : Zt(e.kind) ? "center" : "justify",
    padding: f,
    exact: !!o
  };
}
function nc(e, t, n, r) {
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
const rc = 512, ht = /* @__PURE__ */ new Map();
let mn = 0;
typeof document < "u" && document.fonts && (document.fonts.ready.then(() => {
  mn += 1;
}).catch(() => {
}), typeof document.fonts.addEventListener == "function" && document.fonts.addEventListener("loadingdone", () => {
  mn += 1;
}));
function oc(e, t, n, r) {
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
function ac({ item: e, pageScale: t }) {
  const n = M(null), r = K(
    () => ec(e.translatedText),
    [e.translatedText]
  ), [o, a] = L(r.fallbackHtml), s = K(
    () => tc(e, t),
    [e, t]
  );
  $(() => {
    let d = !0;
    return a(r.fallbackHtml), r.hasMath && r.richHtml.then((m) => {
      d && a(m);
    }), () => {
      d = !1;
    };
  }, [r]), _e(() => {
    const d = n.current;
    if (!d) return;
    const [m, h, g, f] = s.padding, v = Math.max(1, e.rect.width - f - h), y = Math.max(1, e.rect.height - m - g), S = oc(o, v, y, s);
    let R = ht.get(S);
    if (R === void 0 && (R = nc(
      (p) => (d.style.fontSize = `${p}px`, { width: d.scrollWidth, height: d.scrollHeight }),
      v,
      y,
      {
        minFontSizePx: s.minFontSizePx,
        maxFontSizePx: s.maxFontSizePx,
        requestedFontSizePx: s.fontSizePx,
        exact: s.exact
      }
    ), ht.set(S, R), ht.size > rc)) {
      const p = ht.keys().next().value;
      p !== void 0 && ht.delete(p);
    }
    d.style.fontSize = `${R.toFixed(2)}px`;
  }, [o, e.rect.height, e.rect.width, s]);
  const [c, i, l, u] = s.padding;
  return /* @__PURE__ */ b(
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
      children: /* @__PURE__ */ b(
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
  const o = K(
    () => Yi(e, t, n, r),
    [r, e, t, n]
  );
  return o.length ? /* @__PURE__ */ b(
    "div",
    {
      className: "reader-live-translation-overlay",
      "data-live-translation-page": e == null ? void 0 : e.page_idx,
      "data-live-translation-generation": t == null ? void 0 : t.generation,
      "aria-hidden": "true",
      children: o.map((a) => /* @__PURE__ */ b(
        ac,
        {
          item: a,
          pageScale: e != null && e.width ? n / e.width : 1
        },
        `${a.itemId}:${a.changedAtSeq}`
      ))
    }
  ) : null;
}
const ic = vn(sc), ho = wn(null), po = wn(null);
function cc({ value: e, hud: t, children: n }) {
  return /* @__PURE__ */ b(ho.Provider, { value: e, children: /* @__PURE__ */ b(po.Provider, { value: t, children: n }) });
}
function De() {
  return Sn(ho);
}
function go() {
  return Sn(po);
}
const bo = 1.414;
function lc({
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
  liveTranslationLayout: y,
  liveTranslationPage: S,
  showLiveTranslation: R = r === "source"
}) {
  var Y;
  const p = (Y = De()) == null ? void 0 : Y.revisedBlocks, w = M(i ?? bo), [k, T] = L(w.current);
  $(() => {
    i != null && Math.abs(i - w.current) >= 1e-3 && (w.current = i, T(i));
  }, [i]);
  const C = M(u);
  C.current = u;
  const x = M(null), D = M((_) => {
    var ne;
    x.current = _, (ne = C.current) == null || ne.call(C, _);
  }).current, E = M(null), P = M(`${t}@${n}`);
  _e(() => {
    const _ = `${t}@${n}`;
    P.current !== _ && (P.current = _, o && dc(x.current, E.current));
  }, [o, n, t]), $(() => {
    o || Xt(E.current);
  }, [o]), $(() => () => Xt(E.current), []);
  const I = Math.max(120, Math.floor(t * k)), N = Math.max(I, Math.ceil(s || 0)), O = Tn(d, t, I), H = K(
    () => xi(m, t, I),
    [I, m, t]
  ), [F, J] = L(null), B = typeof f == "function", V = B ? g ?? null : F, ee = (_) => {
    B ? _ !== (g ?? null) && (f == null || f(_)) : J((ne) => ne === _ ? ne : _);
  }, fe = K(
    () => H.find((_) => _.itemId === V) || null,
    [V, H]
  ), re = (_) => {
    var ge, Ie;
    if (_.pointerType === "touch") return;
    if (_.buttons !== 0) {
      ee(null);
      return;
    }
    if ((Ie = (ge = _.target) == null ? void 0 : ge.closest) != null && Ie.call(ge, `.${io}`)) return;
    const ne = _.currentTarget.getBoundingClientRect(), oe = _.clientX - ne.left, we = _.clientY - ne.top, pe = fe == null ? void 0 : fe.rect;
    if (pe && fo(pe) && oe >= pe.left - 4 && oe <= pe.left + uo && we >= pe.top - lo && we <= pe.top) return;
    const Oe = ur(H, oe, we);
    ee((Oe == null ? void 0 : Oe.itemId) || null);
  }, ae = (_) => {
    if (_.pointerType === "mouse") return;
    const ne = _.currentTarget.getBoundingClientRect(), oe = ur(
      H,
      _.clientX - ne.left,
      _.clientY - ne.top
    );
    ee((oe == null ? void 0 : oe.itemId) || null);
  }, ze = (_) => {
    !Number.isFinite(_) || _ <= 0 || Math.abs(w.current - _) < 1e-3 || (w.current = _, T(_), l == null || l(e, _));
  };
  return /* @__PURE__ */ z(
    "div",
    {
      ref: D,
      [Ve]: e,
      [it]: r,
      [kn]: I,
      className: Mn,
      onPointerMoveCapture: re,
      onPointerDown: ae,
      onPointerLeave: (_) => {
        _.pointerType === "mouse" && ee(null);
      },
      style: {
        width: t,
        height: N,
        minHeight: N
      },
      children: [
        o ? /* @__PURE__ */ b(
          ua,
          {
            pageNumber: e,
            width: t,
            devicePixelRatio: n,
            renderTextLayer: a,
            renderAnnotationLayer: !1,
            className: qr,
            loading: /* @__PURE__ */ b(
              "div",
              {
                className: zt,
                style: { width: t, height: I }
              }
            ),
            onLoadSuccess: (_) => {
              try {
                const ne = _.getViewport({ scale: 1 });
                if (ne.width > 0) {
                  const oe = ne.height / ne.width;
                  ze(oe);
                }
              } catch {
              }
              c == null || c();
            },
            onRenderSuccess: () => {
              Xt(E.current), c == null || c();
            }
          }
        ) : /* @__PURE__ */ b(
          "div",
          {
            className: zt,
            style: { width: t, height: I },
            "aria-hidden": !0
          }
        ),
        o ? /* @__PURE__ */ b("div", { ref: E, className: "reader-react-pdf-kept-paint", "aria-hidden": "true" }) : null,
        O ? /* @__PURE__ */ b(
          "div",
          {
            className: "reader-react-pdf-region-highlight",
            "data-reader-region-id": d == null ? void 0 : d.itemId,
            style: O,
            "aria-hidden": "true"
          }
        ) : null,
        o && a && R ? /* @__PURE__ */ b(
          ic,
          {
            layoutPage: y,
            pageState: S,
            width: t,
            height: I
          }
        ) : null,
        o && r === "translated" && (p != null && p.size) ? /* @__PURE__ */ b("div", { className: "reader-revised-markers", "aria-hidden": "true", children: H.filter((_) => p.has(_.itemId)).map((_) => /* @__PURE__ */ b(
          "span",
          {
            className: "reader-revised-marker",
            "data-reader-revised-id": _.itemId,
            style: { left: _.rect.left, top: _.rect.top, height: _.rect.height }
          },
          _.itemId
        )) }) : null,
        /* @__PURE__ */ b(
          Gi,
          {
            target: o ? fe : null,
            pane: r === "translated" ? "translated" : "source",
            revisedCount: fe && (p == null ? void 0 : p.get(fe.itemId)) || 0,
            referenceRegions: h,
            onReferenceClick: v
          }
        )
      ]
    }
  );
}
const uc = vn(lc);
function dc(e, t) {
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
const fc = 2 * 1024 * 1024;
function mc(e) {
  const t = new Wr.PDFDataRangeTransport(e.length, null);
  return t.requestDataRange = (n, r) => {
    e.fetchRange(n, r).then(
      (o) => t.onDataRange(n, o),
      () => {
        t.abort();
      }
    );
  }, t;
}
const Qt = 5, hc = "120% 0px", pc = 120, gc = "25% 0px";
let fr = 1;
const mr = /* @__PURE__ */ new WeakMap();
function bc(e) {
  if (!e) return 0;
  const t = mr.get(e);
  if (t) return t;
  const n = fr;
  return fr += 1, mr.set(e, n), n;
}
function yc() {
  const e = typeof window < "u" && window.devicePixelRatio || 1;
  return Math.max(1, Math.min(e, 2));
}
const vc = Fo(
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
    hoveredRegionId: y = null,
    onHoverRegion: S,
    onJumpToRegion: R,
    liveTranslation: p,
    showLiveTranslation: w = t === "source",
    liveTranslationPendingLabel: k = "",
    paneAction: T
  }, C) {
    _i();
    const { file: x, loading: D, error: E } = Za(n, r), P = `${n}\0${bc(x)}`, I = M(P);
    I.current = P;
    const N = K(() => {
      const A = Va(x);
      return A ? "ranged" in A ? { range: mc(A.ranged) } : A : null;
    }, [x, n]), [O, H] = L(0), [F, J] = L(""), [B, V] = L(null), [ee, fe] = L(480), re = M(null), ae = M(0), ze = K(() => yc(), []), Y = K(() => ({
      cMapUrl: bt().resolvePdfjsVendorUrl("cmaps/"),
      cMapPacked: !0,
      standardFontDataUrl: bt().resolvePdfjsVendorUrl("standard_fonts/"),
      // 只对按段取的大文件起作用：要哪页取哪页，不在后台把整份取完（取完又是一整份在内存里）。
      rangeChunkSize: fc,
      disableAutoFetch: !0
    }), []);
    Rn(C, () => B, [B]), $(() => {
      const A = (U) => {
        ae.current = U, fe(U);
      }, q = (U) => {
        const X = Is(U, ae.current);
        if (X !== "ignore") {
          if (re.current && clearTimeout(re.current), X === "immediate") {
            A(U);
            return;
          }
          re.current = setTimeout(() => A(U), Yr);
        }
      }, W = !!(i && i >= 80);
      q(W ? i : (c == null ? void 0 : c.clientWidth) || 0);
      const Q = !W && c && typeof ResizeObserver < "u" ? new ResizeObserver((U) => {
        var X, ue;
        q(((ue = (X = U[0]) == null ? void 0 : X.contentRect) == null ? void 0 : ue.width) ?? c.clientWidth);
      }) : null;
      return Q && c && Q.observe(c), () => {
        Q == null || Q.disconnect(), re.current && clearTimeout(re.current);
      };
    }, [i, c, a]);
    const _ = K(
      () => Ss(ee, o),
      [ee, o]
    ), [ne, oe] = L(() => /* @__PURE__ */ new Map()), [we, pe] = L(() => /* @__PURE__ */ new Set()), [Oe, ge] = L(() => /* @__PURE__ */ new Set()), Ie = M(/* @__PURE__ */ new Map()), te = M(null), se = M(null), [be, ie] = L(() => /* @__PURE__ */ new Set()), ce = M(/* @__PURE__ */ new Map()), le = j((A, q) => {
      oe((W) => {
        if (W.get(A) === q) return W;
        const G = new Map(W);
        return G.set(A, q), G;
      });
    }, []), Fe = j((A, q) => {
      const W = Ie.current, G = W.get(A), Q = [te.current, se.current];
      if (G)
        for (const U of Q)
          try {
            U == null || U.unobserve(G);
          } catch {
          }
      if (q) {
        W.set(A, q);
        for (const U of Q)
          try {
            U == null || U.observe(q);
          } catch {
          }
      } else
        W.delete(A);
    }, []), ut = M(/* @__PURE__ */ new Map()), Ze = j((A) => {
      const q = ut.current;
      let W = q.get(A);
      return W || (W = (G) => Fe(A, G), q.set(A, W)), W;
    }, [Fe]);
    $(() => {
      if (typeof IntersectionObserver > "u") return;
      const A = ce.current, q = new IntersectionObserver(
        (W) => {
          const G = [], Q = [];
          for (const U of W) {
            const X = U.target, ue = Ft(X);
            Number.isFinite(ue) && (U.isIntersecting ? G : Q).push(ue);
          }
          if ((G.length || Q.length) && pe((U) => {
            let X = null;
            for (const ue of G)
              U.has(ue) || (X = X || new Set(U), X.add(ue));
            for (const ue of Q)
              U.has(ue) && (X = X || new Set(U), X.delete(ue));
            return X || U;
          }), G.length) {
            for (const U of G) {
              const X = A.get(U);
              X && (clearTimeout(X), A.delete(U));
            }
            ge((U) => {
              let X = null;
              for (const ue of G)
                U.has(ue) || (X = X || new Set(U), X.add(ue));
              return X || U;
            });
          }
          for (const U of Q)
            A.has(U) || A.set(U, setTimeout(() => {
              A.delete(U), ge((X) => {
                if (!X.has(U)) return X;
                const ue = new Set(X);
                return ue.delete(U), ue;
              });
            }, pc));
        },
        { root: c, rootMargin: hc, threshold: 0 }
      );
      te.current = q;
      for (const W of Ie.current.values())
        try {
          q.observe(W);
        } catch {
        }
      return () => {
        q.disconnect(), te.current === q && (te.current = null);
        for (const W of A.values()) clearTimeout(W);
        A.clear();
      };
    }, [c]), $(() => {
      if (typeof IntersectionObserver > "u") return;
      const A = new IntersectionObserver(
        (q) => {
          ie((W) => {
            let G = null;
            for (const Q of q) {
              const U = Ft(Q.target);
              !Number.isFinite(U) || Q.isIntersecting === W.has(U) || (G = G || new Set(W), Q.isIntersecting ? G.add(U) : G.delete(U));
            }
            return G || W;
          });
        },
        { root: c, rootMargin: gc, threshold: 0 }
      );
      se.current = A;
      for (const q of Ie.current.values())
        try {
          A.observe(q);
        } catch {
        }
      return () => {
        A.disconnect(), se.current === A && (se.current = null);
      };
    }, [c]);
    const Vt = !!c && typeof IntersectionObserver < "u";
    _e(() => {
      H(0), J(""), pe(/* @__PURE__ */ new Set()), ge(/* @__PURE__ */ new Set()), oe(/* @__PURE__ */ new Map()), Ie.current.clear();
      const A = ce.current;
      for (const q of A.values()) clearTimeout(q);
      A.clear(), h == null || h(0, t);
    }, [P, h, t]);
    const Jt = j(
      ({ numPages: A }) => {
        I.current === P && (H(A), J(""), h == null || h(A, t), d == null || d({ numPages: A, pane: t }));
      },
      [P, d, h, t]
    ), It = j(
      (A) => {
        if (I.current !== P) return;
        const q = (A == null ? void 0 : A.message) || "PDF 解析失败";
        J(q), H(0), h == null || h(0, t), m == null || m(A, t);
      },
      [P, m, h, t]
    ), Te = K(
      () => O > 0 ? Array.from({ length: O }, (A, q) => q + 1) : [],
      [O]
    );
    $(() => {
      typeof IntersectionObserver < "u" || ge(new Set(Te));
    }, [Te]);
    const Le = K(
      () => Yn(g, v, t),
      [g, v, t]
    ), Xe = K(() => {
      const A = /* @__PURE__ */ new Map();
      for (const q of f) {
        const W = Yn(q, v, t);
        if (!W) continue;
        const G = A.get(W.box.page) || [];
        G.push(W), A.set(W.box.page, G);
      }
      return A;
    }, [t, v, f]), Tt = K(
      () => f.filter((A) => A.subType === "reference_entry"),
      [f]
    ), Qe = K(() => {
      const A = /* @__PURE__ */ new Set();
      if (!y) return A;
      for (const [q, W] of Xe)
        W.some((G) => G.itemId === y) && A.add(q);
      return A;
    }, [y, Xe]), Et = K(() => {
      if (O === 0) return /* @__PURE__ */ new Set();
      if (!a) return /* @__PURE__ */ new Set();
      if (!(!!c && typeof IntersectionObserver < "u")) return new Set(Te);
      if (we.size === 0) {
        const W = Math.min(O, Qt * 2 + 1);
        return new Set(Array.from({ length: W }, (G, Q) => Q + 1));
      }
      const q = /* @__PURE__ */ new Set();
      for (const W of we)
        for (let G = -Qt; G <= Qt; G++) {
          const Q = W + G;
          Q >= 1 && Q <= O && q.add(Q);
        }
      return q;
    }, [O, Te, c, a, we]), et = !n || !!E || !!F, kt = n && (E || F) || s;
    return /* @__PURE__ */ z(
      "section",
      {
        ref: V,
        className: `reader-panel ${ms}${a ? "" : " is-hidden"}`,
        [it]: t,
        "data-reader-engine": "react-pdf",
        "data-reader-visible": a ? "true" : "false",
        "data-live-translation-status": (p == null ? void 0 : p.jobStatus) || void 0,
        "aria-hidden": a ? void 0 : !0,
        "aria-label": t === "source" ? "原文 PDF" : "译文 PDF",
        children: [
          T ? /* @__PURE__ */ b("div", { className: "reader-react-pdf-pane-action", children: T }) : null,
          k ? /* @__PURE__ */ z("div", { className: "reader-live-translation-waiting", role: "status", children: [
            /* @__PURE__ */ b("span", { className: "reader-live-translation-waiting-dot", "aria-hidden": "true" }),
            /* @__PURE__ */ b("span", { children: k })
          ] }) : null,
          et && !D ? /* @__PURE__ */ b("div", { className: "reader-empty reader-react-pdf-empty", "data-reader-pdf-empty": t, children: kt }) : null,
          D ? /* @__PURE__ */ b("div", { className: "reader-empty reader-react-pdf-loading", "data-reader-pdf-loading": t, children: "正在加载 PDF…" }) : null,
          N && !E ? /* @__PURE__ */ b("div", { className: "reader-viewer-wrap reader-react-pdf-wrap", children: /* @__PURE__ */ b(
            da,
            {
              file: N,
              loading: null,
              error: null,
              options: Y,
              onLoadSuccess: Jt,
              onLoadError: It,
              className: "reader-react-pdf-document",
              children: Te.map((A) => {
                if (Et.has(A))
                  return /* @__PURE__ */ b(
                    uc,
                    {
                      pane: t,
                      pageNumber: A,
                      width: _,
                      devicePixelRatio: ze,
                      active: Oe.has(A),
                      textLayer: !Vt || be.has(A),
                      syncedMinHeight: (l == null ? void 0 : l.get(A)) || 0,
                      onMetrics: u,
                      cachedAspect: ne.get(A),
                      onAspectChange: le,
                      sentinelRef: Ze(A),
                      regionHighlight: (Le == null ? void 0 : Le.box.page) === A ? Le : null,
                      regionTargets: Xe.get(A),
                      referenceRegions: Tt,
                      hoveredRegionId: y && Qe.has(A) ? y : null,
                      onHoverRegion: S,
                      onJumpToRegion: R,
                      liveTranslationLayout: p == null ? void 0 : p.layoutByPage.get(A - 1),
                      liveTranslationPage: p == null ? void 0 : p.pagesByPage.get(A - 1),
                      showLiveTranslation: w
                    },
                    `${t}-${A}`
                  );
                const W = ne.get(A) ?? bo, G = Math.max(120, Math.floor(_ * W)), Q = Math.max(G, Math.ceil((l == null ? void 0 : l.get(A)) || 0));
                return /* @__PURE__ */ b(
                  "div",
                  {
                    ref: Ze(A),
                    [Ve]: A,
                    [it]: t,
                    [kn]: G,
                    className: `${Mn} is-placeholder`,
                    style: {
                      width: _,
                      height: Q,
                      minHeight: Q
                    },
                    children: /* @__PURE__ */ b(
                      "div",
                      {
                        className: zt,
                        style: { width: _, height: G },
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
), hr = vn(vc), wc = 2e3, Sc = 6, Rc = 500, pr = "reader-react-resizing";
function Pc(e, t) {
  const n = M(null), r = M(null);
  _e(() => {
    const o = n.current;
    if (n.current = t, !e || o === null || t === null || Math.abs(o - t) < 1) return;
    const a = r.current;
    a == null || a.stop();
    let s = a ? { pane: a.pane, progress: a.progress, started: a.started } : null;
    if (!s) {
      const p = Ic(e), w = Lt(e, p);
      if (!w) return;
      s = { pane: p, progress: w, started: performance.now() };
    }
    const { pane: c, progress: i, started: l } = s;
    let u = 0, d = null, m = e.scrollHeight, h = m, g = 0, f = l;
    const v = /* @__PURE__ */ new WeakMap(), y = typeof ResizeObserver > "u" ? null : new ResizeObserver((p) => {
      let w = !1;
      for (const k of p) {
        const T = Math.round(k.contentRect.height);
        v.has(k.target) && v.get(k.target) !== T && (w = !0), v.set(k.target, T);
      }
      w && vt(e, i, "auto", c);
    }), S = () => {
      var p;
      d && clearTimeout(d), cancelAnimationFrame(u), y == null || y.disconnect(), e.classList.remove(pr);
      for (const w of gr) e.removeEventListener(w, S);
      ((p = r.current) == null ? void 0 : p.stop) === S && (r.current = null);
    }, R = () => {
      vt(e, i, "auto", c);
      const p = e.scrollHeight;
      g = p === h ? g + 1 : 0, h = p;
      const w = performance.now() - f;
      g >= Sc && (p !== m || w > Rc) || w > wc ? S() : u = requestAnimationFrame(R);
    };
    for (const p of gr) e.addEventListener(p, S, { passive: !0 });
    for (const p of Array.from(e.children)) y == null || y.observe(p);
    e.classList.add(pr), r.current = { ...s, stop: S }, d = setTimeout(() => {
      d = null, f = performance.now(), m = e.scrollHeight, h = m, g = 0, u = requestAnimationFrame(R);
    }, Yr);
  }, [e, t]), $(() => () => {
    var o;
    return (o = r.current) == null ? void 0 : o.stop();
  }, []);
}
function Ic(e) {
  for (const t of Array.from(e.querySelectorAll(`[${Ve}]`))) {
    const n = t.getBoundingClientRect();
    if (n.height >= 8 && n.width >= 8) return t.getAttribute(it) || null;
  }
  return null;
}
const gr = ["wheel", "touchstart", "keydown", "pointerdown"], Tc = () => () => {
}, br = () => null;
function Ec({
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
function kc(e, t, n = e * 2) {
  return t ? !Number.isFinite(e) || e <= 0 ? n : e * 2 : e;
}
function Mc(e) {
  return e ? e.connection === "terminal" && e.jobStatus === "failed" ? e.pagesByPage.size > 0 ? `翻译已暂停，已保留 ${e.pagesByPage.size} 页译文` : "翻译已暂停，原始 PDF 仍可阅读" : e.connection === "terminal" && ["cancelled", "canceled"].includes(e.jobStatus) ? e.pagesByPage.size > 0 ? `翻译已取消，已保留 ${e.pagesByPage.size} 页译文` : "翻译已取消，原始 PDF 仍可阅读" : e.pagesByPage.size > 0 ? "" : e.connection === "unavailable" ? e.error || "实时译文暂不可用，原始 PDF 仍可阅读" : e.error ? e.error : e.layoutByPage.size === 0 ? "正在完成 OCR，译文将在这里逐页出现" : "版面已就绪，正在等待首个译文页面" : "";
}
function Ac(e) {
  const t = De(), {
    markdownSplit: n = !1,
    assistantSplit: r = !1,
    liveTranslation: o,
    paneComposition: a
  } = e, s = (a == null ? void 0 : a.visibleMode) ?? e.mode ?? "compare", c = (a == null ? void 0 : a.compareMode) ?? e.compareMode ?? s === "compare", i = (a == null ? void 0 : a.showSource) ?? e.showSource ?? !0, l = (a == null ? void 0 : a.showTranslated) ?? e.showTranslated ?? (s === "compare" || s === "translated"), u = (a == null ? void 0 : a.overlayOnSource) ?? e.overlayOnSource ?? !1, d = e.bindShell ?? (t == null ? void 0 : t.bindShell), m = e.shellEl ?? (t == null ? void 0 : t.shellEl) ?? null, h = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? Pt, g = e.shellWidth ?? (t == null ? void 0 : t.shellWidth) ?? 0, f = e.rowHeights ?? (t == null ? void 0 : t.rowHeights), v = e.mountSource ?? (t == null ? void 0 : t.mountSource) ?? !1, y = e.mountTranslated ?? (t == null ? void 0 : t.mountTranslated) ?? !1, S = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, R = e.sourceUrl ?? (t == null ? void 0 : t.sourceUrl) ?? "", p = e.translatedUrl ?? (t == null ? void 0 : t.translatedUrl) ?? "", w = e.sourceFile ?? (t == null ? void 0 : t.sourceFile) ?? null, k = e.translatedFile ?? (t == null ? void 0 : t.translatedFile) ?? null, T = e.onMetrics ?? (t == null ? void 0 : t.onMetrics), C = e.onNumPagesChange ?? (t == null ? void 0 : t.onNumPagesChange), x = e.activeRegion ?? (t == null ? void 0 : t.activeRegion), D = e.regions ?? (t == null ? void 0 : t.regions) ?? [], E = e.readerMetadata ?? (t == null ? void 0 : t.readerMetadata), P = (t == null ? void 0 : t.regionHover) ?? null, [I, N] = L(null), O = $r(
    P ? P.subscribe : Tc,
    P ? () => P.get().itemId : br,
    P ? () => P.get().itemId : br
  ), H = P ? O : I, F = j((ee) => {
    P ? P.set(ee, "pdf") : N(ee);
  }, [P]), J = Ec({
    mode: s,
    compareMode: c,
    showSource: i,
    showTranslated: l,
    markdownSplit: n,
    overlayOnSource: u
  }), V = Number.isFinite(g) && g > 0 ? kc(
    g,
    n || r,
    typeof document > "u" ? g * 2 : document.documentElement.clientWidth
  ) : null;
  return Pc(m, V), /* @__PURE__ */ b(
    "div",
    {
      ref: d,
      className: fs,
      "data-reader-region-count": D.length,
      "data-reader-structured-region-count": D.filter(Zo).length,
      "data-reader-metadata-ready": E ? "true" : "false",
      children: /* @__PURE__ */ z(
        "main",
        {
          className: `${ds} reader-mode-${J.mode}`,
          "data-reader-mode": n ? "markdown-split" : r ? "assistant-split" : s,
          children: [
            v ? /* @__PURE__ */ b(
              hr,
              {
                pane: "source",
                url: R,
                preloadedFile: w,
                userZoom: h,
                visible: J.showSource,
                scrollRoot: m,
                pageWidthOverride: V,
                rowHeights: J.compareMode ? f : void 0,
                onMetrics: T,
                emptyLabel: S ? "源文件不可用：该文档没有可读取的源 PDF。" : "暂无原文 PDF",
                onNumPagesChange: C,
                activeRegion: x,
                regions: D,
                readerMetadata: E,
                hoveredRegionId: H,
                onHoverRegion: F,
                onJumpToRegion: t == null ? void 0 : t.jumpToBlock,
                liveTranslation: u ? o : void 0,
                showLiveTranslation: u,
                liveTranslationPendingLabel: u ? Mc(o) : "",
                paneAction: u ? /* @__PURE__ */ z(We, { children: [
                  e.sourcePaneAction,
                  /* @__PURE__ */ b(
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
            y ? /* @__PURE__ */ b(
              hr,
              {
                pane: "translated",
                url: p,
                preloadedFile: k,
                userZoom: h,
                visible: J.showTranslated,
                scrollRoot: m,
                pageWidthOverride: V,
                rowHeights: J.compareMode ? f : void 0,
                onMetrics: T,
                emptyLabel: "暂无译文 PDF",
                onNumPagesChange: C,
                activeRegion: x,
                regions: D,
                readerMetadata: E,
                hoveredRegionId: H,
                onHoverRegion: F,
                onJumpToRegion: t == null ? void 0 : t.jumpToBlock,
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
const Nc = [
  { id: "source", label: "原文", Icon: Br },
  { id: "compare", label: "对照", Icon: Ur },
  { id: "translated", label: "译文", Icon: Hr }
];
function _c(e) {
  return e.connection === "live" ? `实时译文 · ${e.pagesByPage.size} 页` : e.connection === "reconnecting" ? "实时译文 · 重连中" : e.connection === "unavailable" ? "实时译文 · 不可用" : e.connection === "terminal" ? e.jobStatus === "failed" ? "实时译文 · 已暂停" : e.jobStatus === "cancelled" || e.jobStatus === "canceled" ? "实时译文 · 已取消" : e.jobStatus === "succeeded" ? "实时译文 · 已完成" : "实时译文 · 已结束" : e.error || "实时译文 · 连接中";
}
function Lc(e) {
  return e.id === "translated" ? e.sourceViewOnly : e.id === "compare" ? !e.documentReady || e.sourceViewOnly && !e.liveTranslationAvailable : !1;
}
function Cc(e) {
  const t = De(), {
    mode: n,
    documentReady: r,
    onModeChange: o,
    liveTranslation: a = null
  } = e, s = e.sourceViewOnly ?? (t == null ? void 0 : t.sourceViewOnly) ?? !1, c = a ? _c(a.state) : "";
  return /* @__PURE__ */ z("header", { className: "reader-workspace-bar", children: [
    a ? /* @__PURE__ */ z(
      "button",
      {
        type: "button",
        className: `reader-live-translation-toggle is-${a.state.connection}${a.visible ? " is-active" : ""}`,
        "aria-pressed": a.visible,
        "aria-label": a.visible ? "隐藏实时译文" : "显示实时译文",
        title: a.state.error || c,
        onClick: a.onToggle,
        children: [
          /* @__PURE__ */ b(na, { size: 14, strokeWidth: 2.2, "aria-hidden": !0 }),
          /* @__PURE__ */ b("span", { className: "reader-live-translation-toggle-label", children: c })
        ]
      }
    ) : null,
    /* @__PURE__ */ b("div", { className: "reader-workspace-tabs", role: "tablist", "aria-label": "阅读工作区", children: Nc.map(({ id: i, label: l, Icon: u }) => {
      const d = n === i, m = Lc({
        id: i,
        documentReady: r,
        sourceViewOnly: s,
        liveTranslationAvailable: !!a
      });
      return /* @__PURE__ */ z(
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
            /* @__PURE__ */ b(u, { size: 15, strokeWidth: 2.2, "aria-hidden": !0 }),
            /* @__PURE__ */ b("span", { className: "reader-workspace-tab-label", children: l })
          ]
        },
        i
      );
    }) })
  ] });
}
const xc = {
  markdown: { label: "Markdown", short: "MD", Icon: ra, needsJob: !0 }
}, Dc = Zr.map(
  (e) => ({ id: e, ...xc[e] })
);
function yo() {
  return Dc.map(({ id: e, label: t, short: n, Icon: r, needsJob: o }) => ({
    id: e,
    label: t,
    short: n,
    Icon: r,
    needsJob: o
  }));
}
function zc(e) {
  const t = De(), { active: n } = e, r = e.sourceOnly ?? (t == null ? void 0 : t.sourceOnly) ?? !1, o = e.onSelect ?? (t == null ? void 0 : t.assistant.select) ?? (() => {
  }), a = e.onClose ?? (t == null ? void 0 : t.assistant.close) ?? (() => {
  });
  return /* @__PURE__ */ b(We, { children: yo().map(({ id: s, label: c, Icon: i, needsJob: l }) => {
    const u = n === s, d = l && r, m = u ? `收起${c}` : `打开${c}`;
    return /* @__PURE__ */ b(
      "button",
      {
        type: "button",
        className: "reader-panel-toggle",
        "aria-label": m,
        "aria-pressed": u,
        title: d ? `${c} 需打开任务阅读` : c,
        disabled: d,
        onClick: () => u ? a() : o(s),
        children: /* @__PURE__ */ b(i, { className: "reader-close-home-icon", size: 18, strokeWidth: 2.25, "aria-hidden": !0 })
      },
      s
    );
  }) });
}
function Oc(e) {
  const t = De(), { active: n, badges: r } = e, o = e.sourceOnly ?? (t == null ? void 0 : t.sourceOnly) ?? !1, a = e.onSelect ?? (t == null ? void 0 : t.assistant.select) ?? (() => {
  }), s = e.onClose ?? (t == null ? void 0 : t.assistant.close) ?? (() => {
  }), c = yo().map(({ id: i, label: l, short: u, Icon: d, needsJob: m }) => ({
    key: i,
    label: l,
    short: u,
    Icon: d,
    disabled: m && o,
    selected: n === i,
    badge: r == null ? void 0 : r[i],
    onClick: () => a(i)
  }));
  return n ? /* @__PURE__ */ z("header", { className: "reader-assistant-dock-header", children: [
    /* @__PURE__ */ b("div", { className: "reader-assistant-dock-tabs", role: "tablist", "aria-label": "阅读辅助面板", children: c.map(({ key: i, label: l, Icon: u, disabled: d, selected: m, badge: h, onClick: g }) => /* @__PURE__ */ z(
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
          /* @__PURE__ */ b(u, { size: 15, strokeWidth: 2.15, "aria-hidden": !0 }),
          /* @__PURE__ */ b("span", { className: "reader-assistant-dock-tab-label", children: l }),
          h ? /* @__PURE__ */ b("span", { className: "reader-assistant-dock-badge", children: h }) : null
        ]
      },
      i
    )) }),
    /* @__PURE__ */ b(
      "button",
      {
        type: "button",
        className: "reader-assistant-dock-close",
        "aria-label": "关闭阅读辅助面板",
        title: "关闭辅助面板",
        onClick: s,
        children: /* @__PURE__ */ b(En, { size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
      }
    )
  ] }) : null;
}
function Fc(e, t) {
  const n = getComputedStyle(e), r = parseFloat(n.fontSize);
  return t * r;
}
function $c(e, t) {
  const n = getComputedStyle(e.ownerDocument.documentElement), r = parseFloat(n.fontSize);
  return t * r;
}
function jc(e) {
  return e / 100 * window.innerHeight;
}
function Bc(e) {
  return e / 100 * window.innerWidth;
}
function Uc(e) {
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
  const [o, a] = Uc(n);
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
      r = $c(t, o);
      break;
    }
    case "em": {
      r = Fc(t, o);
      break;
    }
    case "vh": {
      r = jc(o);
      break;
    }
    case "vw": {
      r = Bc(o);
      break;
    }
  }
  return r;
}
function me(e) {
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
      s = me(u / n * 100);
    }
    let c;
    if (a.defaultSize !== void 0) {
      const u = pt({
        groupSize: n,
        panelElement: o,
        styleProp: a.defaultSize
      });
      c = me(u / n * 100);
    }
    let i = 0;
    if (a.minSize !== void 0) {
      const u = pt({
        groupSize: n,
        panelElement: o,
        styleProp: a.minSize
      });
      i = me(u / n * 100);
    }
    let l = 100;
    if (a.maxSize !== void 0) {
      const u = pt({
        groupSize: n,
        panelElement: o,
        styleProp: a.maxSize
      });
      l = me(u / n * 100);
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
function Z(e, t = "Assertion error") {
  if (!e)
    throw Error(t);
}
function pn(e, t) {
  return Array.from(t).sort(
    e === "horizontal" ? Hc : Wc
  );
}
function Hc(e, t) {
  const n = e.element.offsetLeft - t.element.offsetLeft;
  return n !== 0 ? n : e.element.offsetWidth - t.element.offsetWidth;
}
function Wc(e, t) {
  const n = e.element.offsetTop - t.element.offsetTop;
  return n !== 0 ? n : e.element.offsetHeight - t.element.offsetHeight;
}
function vo(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.ELEMENT_NODE;
}
function wo(e, t) {
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
function Vc({
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
    const { x: c, y: i } = wo(r, s), l = e === "horizontal" ? c : i;
    l < a && (a = l, o = s);
  }
  return Z(o, "No rect found"), o;
}
let Nt;
function Jc() {
  return Nt === void 0 && (typeof matchMedia == "function" ? Nt = !!matchMedia("(pointer:coarse)").matches : Nt = !1), Nt;
}
function So(e) {
  const { element: t, orientation: n, panels: r, separators: o } = e, a = pn(
    n,
    Array.from(t.children).filter(vo).map((g) => ({ element: g }))
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
          (y) => y.element === f
        );
        if (v) {
          if (m) {
            const y = m.element.getBoundingClientRect(), S = f.getBoundingClientRect();
            let R;
            if (i) {
              const p = n === "horizontal" ? new DOMRect(
                y.right,
                y.top,
                0,
                y.height
              ) : new DOMRect(
                y.left,
                y.bottom,
                y.width,
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
                  const k = h[0], T = Vc({
                    orientation: n,
                    rects: [y, S],
                    targetRect: k.element.getBoundingClientRect()
                  });
                  R = [
                    k,
                    T === y ? w : p
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
                  y.right,
                  S.top,
                  S.left - y.right,
                  S.height
                ) : new DOMRect(
                  S.left,
                  y.bottom,
                  S.width,
                  S.top - y.bottom
                )
              ];
            for (const p of R) {
              let w = "width" in p ? p : p.element.getBoundingClientRect();
              const k = Jc() ? e.resizeTargetMinimumSize.coarse : e.resizeTargetMinimumSize.fine;
              if (w.width < k) {
                const C = k - w.width;
                w = new DOMRect(
                  w.x - C / 2,
                  w.y,
                  w.width + C,
                  w.height
                );
              }
              if (w.height < k) {
                const C = k - w.height;
                w = new DOMRect(
                  w.x,
                  w.y - C / 2,
                  w.width,
                  w.height + C
                );
              }
              const T = g <= l || g > u;
              !c && !T && s.push({
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
          (y) => y.element === f
        );
        v ? h.push(v) : (m = void 0, h = []);
      } else
        i = !0;
  }
  return s;
}
var Ce;
class Ro {
  constructor() {
    qn(this, Ce, {});
  }
  addListener(t, n) {
    const r = dt(this, Ce)[t];
    return r === void 0 ? dt(this, Ce)[t] = [n] : r.includes(n) || r.push(n), () => {
      this.removeListener(t, n);
    };
  }
  emit(t, n) {
    const r = dt(this, Ce)[t];
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
    Gn(this, Ce, {});
  }
  removeListener(t, n) {
    const r = dt(this, Ce)[t];
    if (r !== void 0) {
      const o = r.indexOf(n);
      o >= 0 && r.splice(o, 1);
    }
  }
}
Ce = new WeakMap();
let at = {
  cursorFlags: 0,
  state: "inactive"
};
const _n = new Ro();
function Je() {
  return at;
}
function qc(e) {
  return _n.addListener("change", e);
}
function Gc(e) {
  const t = at, n = { ...at };
  n.cursorFlags = e, at = n, _n.emit("change", {
    prev: t,
    next: n
  });
}
function st(e) {
  const t = at;
  at = e, _n.emit("change", {
    prev: t,
    next: e
  });
}
const Kc = (e) => e, en = () => {
}, Po = 1, Io = 2, To = 4, Eo = 8, yr = 3, vr = 12;
let _t;
function wr() {
  return _t === void 0 && (_t = !1, typeof window < "u" && (window.navigator.userAgent.includes("Chrome") || window.navigator.userAgent.includes("Firefox")) && (_t = !0)), _t;
}
function Yc({
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
        if (e && wr()) {
          const a = (e & Po) !== 0, s = (e & Io) !== 0, c = (e & To) !== 0, i = (e & Eo) !== 0;
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
    return wr() ? r > 0 && o > 0 ? "move" : r > 0 ? "ew-resize" : "ns-resize" : r > 0 && o > 0 ? "grab" : r > 0 ? "col-resize" : "row-resize";
  }
}
const Sr = /* @__PURE__ */ new WeakMap();
function Ln(e) {
  if (e.defaultView === null || e.defaultView === void 0)
    return;
  let { prevStyle: t, styleSheet: n } = Sr.get(e) ?? {};
  n === void 0 && (n = new e.defaultView.CSSStyleSheet(), e.adoptedStyleSheets && (Object.isExtensible(e.adoptedStyleSheets) ? e.adoptedStyleSheets.push(n) : e.adoptedStyleSheets = [
    ...e.adoptedStyleSheets,
    n
  ]));
  const r = Je();
  switch (r.state) {
    case "active":
    case "hover": {
      const o = Yc({
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
  Sr.set(e, {
    prevStyle: t,
    styleSheet: n
  });
}
let Re = /* @__PURE__ */ new Map();
const ko = new Ro();
function Zc(e) {
  Re = new Map(Re), Re.delete(e);
}
function Rr(e, t) {
  for (const [n] of Re)
    if (n.id === e)
      return n;
}
function xe(e, t) {
  for (const [n, r] of Re)
    if (n.id === e)
      return r;
  if (t)
    throw Error(`Could not find data for Group with id ${e}`);
}
function Ke() {
  return Re;
}
function Cn(e, t) {
  return ko.addListener("groupChange", (n) => {
    n.group.id === e && t(n);
  });
}
function Ne(e, t, n) {
  const r = Re.get(e);
  Re = new Map(Re), Re.set(e, t), ko.emit("groupChange", {
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
      }), t.hitRegions.length > 0 && (Ln(e), n = !0, t.hitRegions.forEach((r) => {
        const o = xe(r.group.id, !0);
        Ne(r.group, o, {
          isUserInteraction: !0
        });
      }));
  }
  return n;
}
function Pr(e) {
  e.defaultPrevented || Mo(e.currentTarget);
}
function Xc(e, t, n) {
  let r, o = {
    x: 1 / 0,
    y: 1 / 0
  };
  for (const a of t) {
    const s = wo(n, a.rect);
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
function Qc(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}
function el(e, t) {
  if (e === t) throw new Error("Cannot compare node with itself");
  const n = {
    a: Er(e),
    b: Er(t)
  };
  let r;
  for (; n.a.at(-1) === n.b.at(-1); )
    r = n.a.pop(), n.b.pop();
  Z(
    r,
    "Stacking order can only be calculated for elements with a common ancestor"
  );
  const o = {
    a: Tr(Ir(n.a)),
    b: Tr(Ir(n.b))
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
const tl = /\b(?:position|zIndex|opacity|transform|webkitTransform|mixBlendMode|filter|webkitFilter|isolation)\b/;
function nl(e) {
  const t = getComputedStyle(Ao(e) ?? e).display;
  return t === "flex" || t === "inline-flex";
}
function rl(e) {
  const t = getComputedStyle(e);
  return !!(t.position === "fixed" || t.zIndex !== "auto" && (t.position !== "static" || nl(e)) || +t.opacity < 1 || "transform" in t && t.transform !== "none" || "webkitTransform" in t && t.webkitTransform !== "none" || "mixBlendMode" in t && t.mixBlendMode !== "normal" || "filter" in t && t.filter !== "none" || "webkitFilter" in t && t.webkitFilter !== "none" || "isolation" in t && t.isolation === "isolate" || tl.test(t.willChange) || t.webkitOverflowScrolling === "touch");
}
function Ir(e) {
  let t = e.length;
  for (; t--; ) {
    const n = e[t];
    if (Z(n, "Missing node"), rl(n)) return n;
  }
  return null;
}
function Tr(e) {
  return e && Number(getComputedStyle(e).zIndex) || 0;
}
function Er(e) {
  const t = [];
  for (; e; )
    t.push(e), e = Ao(e);
  return t;
}
function Ao(e) {
  const { parentNode: t } = e;
  return Qc(t) ? t.host : t;
}
function ol(e, t) {
  return e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y;
}
function al({
  groupElement: e,
  hitRegion: t,
  pointerEventTarget: n
}) {
  if (!vo(n) || n.contains(e) || e.contains(n))
    return !0;
  if (el(n, e) > 0) {
    let r = n;
    for (; r; ) {
      if (r.contains(e))
        return !0;
      if (ol(r.getBoundingClientRect(), t))
        return !1;
      r = r.parentElement;
    }
  }
  return !0;
}
function xn(e, t) {
  const n = [];
  return t.forEach((r, o) => {
    if (o.disabled)
      return;
    const a = So(o), s = Xc(o.orientation, a, {
      x: e.clientX,
      y: e.clientY
    });
    s && s.distance.x <= 0 && s.distance.y <= 0 && al({
      groupElement: o.element,
      hitRegion: s.hitRegion.rect,
      pointerEventTarget: e.target
    }) && n.push(s.hitRegion);
  }), n;
}
function sl(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] != t[n])
      return !1;
  return !0;
}
function de(e, t, n = 0) {
  return Math.abs(me(e) - me(t)) <= n;
}
function Se(e, t) {
  return de(e, t) ? 0 : e > t ? 1 : -1;
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
  if (Se(r, i) < 0)
    if (a) {
      const l = (o + i) / 2;
      Se(r, l) < 0 ? r = o : r = i;
    } else
      r = i;
  return r = Math.min(c, r), r = me(r), r;
}
function wt({
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
  Z(u != null, "Invalid first pivot index"), Z(d != null, "Invalid second pivot index");
  let m = 0;
  switch (a) {
    case "keyboard": {
      {
        const f = e < 0 ? d : u, v = n[f];
        Z(
          v,
          `Panel constraints not found for index ${f}`
        );
        const {
          collapsedSize: y = 0,
          collapsible: S,
          minSize: R = 0
        } = v;
        if (S) {
          const p = c[f];
          if (Z(
            p != null,
            `Previous layout not found for panel index ${f}`
          ), de(p, y)) {
            const w = R - p;
            Se(w, Math.abs(e)) > 0 && (e = e < 0 ? 0 - w : w);
          }
        }
      }
      {
        const f = e < 0 ? u : d, v = n[f];
        Z(
          v,
          `No panel constraints found for index ${f}`
        );
        const {
          collapsedSize: y = 0,
          collapsible: S,
          minSize: R = 0
        } = v;
        if (S) {
          const p = c[f];
          if (Z(
            p != null,
            `Previous layout not found for panel index ${f}`
          ), de(p, R)) {
            const w = p - y;
            Se(w, Math.abs(e)) > 0 && (e = e < 0 ? 0 - w : w);
          }
        }
      }
      break;
    }
    default: {
      const f = e < 0 ? d : u, v = n[f];
      Z(
        v,
        `Panel constraints not found for index ${f}`
      );
      const y = c[f], { collapsible: S, collapsedSize: R, minSize: p } = v;
      if (S && Se(y, p) < 0)
        if (e > 0) {
          const w = p - R, k = w / 2, T = y + e;
          Se(T, p) < 0 && (e = Se(e, k) <= 0 ? 0 : w);
        } else {
          const w = p - R, k = 100 - w / 2, T = y - e;
          Se(T, p) < 0 && (e = Se(100 + e, k) > 0 ? 0 : -w);
        }
      break;
    }
  }
  {
    const f = e < 0 ? 1 : -1;
    let v = e < 0 ? d : u, y = 0;
    for (; ; ) {
      const R = c[v];
      Z(
        R != null,
        `Previous layout not found for panel index ${v}`
      );
      const p = ot({
        overrideDisabledPanels: s,
        panelConstraints: n[v],
        prevSize: R,
        size: 100
      }) - R;
      if (y += p, v += f, v < 0 || v >= n.length)
        break;
    }
    const S = Math.min(Math.abs(e), Math.abs(y));
    e = e < 0 ? 0 - S : S;
  }
  {
    let f = e < 0 ? u : d;
    for (; f >= 0 && f < n.length; ) {
      const v = Math.abs(e) - Math.abs(m), y = c[f];
      Z(
        y != null,
        `Previous layout not found for panel index ${f}`
      );
      const S = y - v, R = ot({
        overrideDisabledPanels: s,
        panelConstraints: n[f],
        prevSize: y,
        size: S
      });
      if (!de(y, R) && (m += y - R, l[f] = R, m.toFixed(3).localeCompare(Math.abs(e).toFixed(3), void 0, {
        numeric: !0
      }) >= 0))
        break;
      e < 0 ? f-- : f++;
    }
  }
  if (sl(i, l))
    return o;
  {
    const f = e < 0 ? d : u, v = c[f];
    Z(
      v != null,
      `Previous layout not found for panel index ${f}`
    );
    const y = v + m, S = ot({
      overrideDisabledPanels: s,
      panelConstraints: n[f],
      prevSize: v,
      size: y
    });
    if (l[f] = S, !de(S, y)) {
      let R = y - S, p = e < 0 ? d : u;
      for (; p >= 0 && p < n.length; ) {
        const w = l[p];
        Z(
          w != null,
          `Previous layout not found for panel index ${p}`
        );
        const k = w + R, T = ot({
          overrideDisabledPanels: s,
          panelConstraints: n[p],
          prevSize: w,
          size: k
        });
        if (de(w, T) || (R -= T - w, l[p] = T), de(R, 0))
          break;
        e > 0 ? p-- : p++;
      }
    }
  }
  const h = Object.values(l).reduce(
    (f, v) => v + f,
    0
  );
  if (!de(h, 100, 0.1))
    return o;
  const g = Object.keys(o);
  return l.reduce((f, v, y) => (f[g[y]] = v, f), {});
}
function qe(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (t[n] === void 0 || Se(e[n], t[n]) !== 0)
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
  if (!de(o, 100) && r.length > 0)
    for (let c = 0; c < t.length; c++) {
      const i = r[c];
      Z(i != null, `No layout data found for index ${c}`);
      const l = 100 / o * i;
      r[c] = l;
    }
  let a = 0;
  for (let c = 0; c < t.length; c++) {
    const i = n[c];
    Z(i != null, `No layout data found for index ${c}`);
    const l = r[c];
    Z(l != null, `No layout data found for index ${c}`);
    const u = ot({
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
      Z(i != null, `No layout data found for index ${c}`);
      const l = i + a, u = ot({
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
function No({
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
    if (f && i < m && (g || l.slice(0, h).every((v, y) => {
      const S = d[y];
      return (S == null ? void 0 : S.collapsible) && de(S.collapsedSize, u[S.panelId]);
    }))) {
      const v = l.slice(0, h).reduce((y, S) => y + u[S.id], 0);
      return {
        ...u,
        [t]: me(100 - v)
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
    }), y = Ge({
      layout: v,
      panelConstraints: d
    });
    qe(g, y) || Ne(m, {
      defaultLayoutDeferred: u,
      derivedPanelConstraints: d,
      groupSize: h,
      layout: y,
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
      return i && de(l, u);
    },
    resize: (i) => {
      const { group: l } = n(), { element: u } = o(), d = ct({ group: l }), m = pt({
        groupSize: d,
        panelElement: u,
        styleProp: i
      }), h = me(m / d * 100);
      c(h);
    }
  };
}
function kr(e) {
  if (e.defaultPrevented)
    return;
  const t = Ke();
  xn(e, t).forEach((n) => {
    if (n.separator && !n.separator.disableDoubleClick) {
      const r = n.panels.find(
        (o) => o.panelConstraints.defaultSize !== void 0
      );
      if (r) {
        const o = r.panelConstraints.defaultSize, a = No({
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
function _o({
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
      return r ? c : (qe(c, l) || Ne(a, {
        defaultLayoutDeferred: r,
        derivedPanelConstraints: o,
        groupSize: s,
        layout: l,
        separatorToPanels: i
      }), l);
    }
  };
}
function je(e, t) {
  const n = Ct(e), r = xe(n.id, !0), o = n.separators.find(
    (u) => u.element === e
  );
  Z(o, "Matching separator not found");
  const a = r.separatorToPanels.get(o);
  Z(a, "Matching panels not found");
  const s = a.map((u) => n.panels.indexOf(u)), c = _o({ groupId: n.id }).getLayout(), i = wt({
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
  qe(c, l) || Ne(
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
        e.preventDefault(), n.orientation === "vertical" && je(t, 5);
        break;
      }
      case "ArrowLeft": {
        e.preventDefault(), n.orientation === "horizontal" && je(t, -5);
        break;
      }
      case "ArrowRight": {
        e.preventDefault(), n.orientation === "horizontal" && je(t, 5);
        break;
      }
      case "ArrowUp": {
        e.preventDefault(), n.orientation === "vertical" && je(t, -5);
        break;
      }
      case "End": {
        e.preventDefault(), je(t, 100);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const r = Ct(t), o = xe(r.id, !0), { derivedPanelConstraints: a, layout: s, separatorToPanels: c } = o, i = r.separators.find(
          (m) => m.element === t
        );
        Z(i, "Matching separator not found");
        const l = c.get(i);
        Z(l, "Matching panels not found");
        const u = l[0], d = a.find(
          (m) => m.panelId === u.id
        );
        if (Z(d, "Panel metadata not found"), d.collapsible) {
          const m = s[u.id], h = d.collapsedSize === m ? r.mutableState.expandedPanelSizes[u.id] ?? d.minSize : d.collapsedSize;
          je(t, h - m);
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
        Z(o !== null, "Index not found");
        const a = e.shiftKey ? o > 0 ? o - 1 : r.length - 1 : o + 1 < r.length ? o + 1 : 0;
        r[a].focus({
          preventScroll: !0
        });
        break;
      }
      case "Home": {
        e.preventDefault(), je(t, -100);
        break;
      }
    }
}
function Ar(e) {
  if (e.defaultPrevented || e.pointerType === "mouse" && e.button > 0)
    return;
  const t = Ke(), n = xn(e, t), r = /* @__PURE__ */ new Map();
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
function Lo({
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
    const v = r.get(u), y = o.get(u);
    if (!v || !y)
      return;
    const {
      defaultLayoutDeferred: S,
      derivedPanelConstraints: R,
      groupSize: p,
      layout: w,
      separatorToPanels: k
    } = y;
    if (R && w && k) {
      const T = wt({
        delta: f,
        initialLayout: v,
        panelConstraints: R,
        pivotIndices: l.panels.map((C) => h.indexOf(C)),
        prevLayout: w,
        trigger: "mouse-or-touch"
      });
      if (qe(T, w)) {
        if (f !== 0 && !g)
          switch (m) {
            case "horizontal": {
              c |= f < 0 ? Po : Io;
              break;
            }
            case "vertical": {
              c |= f < 0 ? To : Eo;
              break;
            }
          }
      } else
        Ne(l.group, {
          defaultLayoutDeferred: S,
          derivedPanelConstraints: R,
          groupSize: p,
          layout: T,
          separatorToPanels: k
        });
    }
  });
  let i = 0;
  t.movementX === 0 ? i |= s & yr : i |= c & yr, t.movementY === 0 ? i |= s & vr : i |= c & vr, Gc(i), Ln(e);
}
function Nr(e) {
  const t = Ke(), n = Je();
  switch (n.state) {
    case "active":
      Lo({
        document: e.currentTarget,
        event: e,
        hitRegions: n.hitRegions,
        initialLayoutMap: n.initialLayoutMap,
        mountedGroups: t,
        prevCursorFlags: n.cursorFlags
      });
  }
}
function _r(e) {
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
          const s = xe(a.group.id, !0);
          Ne(a.group, s, {
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
      Lo({
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
      const a = xn(e, n);
      a.length === 0 ? t.state !== "inactive" && st({
        cursorFlags: 0,
        state: "inactive"
      }) : st({
        cursorFlags: 0,
        hitRegions: a,
        state: "hover"
      }), Ln(e.currentTarget);
      break;
    }
  }
}
function Lr(e) {
  if (e.relatedTarget instanceof HTMLIFrameElement)
    switch (Je().state) {
      case "hover":
        st({
          cursorFlags: 0,
          state: "inactive"
        });
    }
}
function Cr(e) {
  e.defaultPrevented || e.pointerType === "mouse" && e.button > 0 || Mo(e.currentTarget) && e.preventDefault();
}
function xr(e) {
  let t = 0, n = 0;
  const r = {};
  for (const a of e)
    if (a.defaultSize !== void 0) {
      t++;
      const s = me(a.defaultSize);
      n += s, r[a.panelId] = s;
    } else
      r[a.panelId] = void 0;
  const o = e.length - t;
  if (o !== 0) {
    const a = me((100 - n) / o);
    for (const s of e)
      s.defaultSize === void 0 && (r[s.panelId] = a);
  }
  return r;
}
function il(e, t, n) {
  if (!n[0])
    return;
  const r = e.panels.find((i) => i.element === t);
  if (!r || !r.onResize)
    return;
  const o = ct({ group: e }), a = e.orientation === "horizontal" ? r.element.offsetWidth : r.element.offsetHeight, s = r.mutableValues.prevSize, c = {
    asPercentage: me(a / o * 100),
    inPixels: a
  };
  r.mutableValues.prevSize = c, r.onResize(c, r.id, s);
}
function cl(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const n in e)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function ll({
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
        const h = m / 100 * n, g = me(
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
      u[d] = me(
        m / a * l
      );
    }
  else {
    const d = me(
      l / i.length
    );
    for (const m of i)
      u[m] = d;
  }
  return u;
}
function ul(e, t) {
  const n = e.map((o) => o.id), r = Object.keys(t);
  if (n.length !== r.length)
    return !1;
  for (const o of n)
    if (!r.includes(o))
      return !1;
  return !0;
}
const tt = /* @__PURE__ */ new Map();
function dl(e) {
  let t = !0;
  Z(
    e.element.ownerDocument.defaultView,
    "Cannot register an unmounted Group"
  );
  const n = e.element.ownerDocument.defaultView.ResizeObserver, r = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), a = new n((g) => {
    for (const f of g) {
      const { borderBoxSize: v, target: y } = f;
      if (y === e.element) {
        if (t) {
          const S = ct({ group: e });
          if (S === 0)
            return;
          const R = xe(e.id);
          if (!R)
            return;
          const p = hn(e), w = R.defaultLayoutDeferred ? xr(p) : R.layout, k = ll({
            group: e,
            nextGroupSize: S,
            prevGroupSize: R.groupSize,
            prevLayout: w
          }), T = Ge({
            layout: k,
            panelConstraints: p
          });
          if (!R.defaultLayoutDeferred && qe(R.layout, T) && cl(
            R.derivedPanelConstraints,
            p
          ) && R.groupSize === S)
            return;
          Ne(e, {
            defaultLayoutDeferred: !1,
            derivedPanelConstraints: p,
            groupSize: S,
            layout: T,
            separatorToPanels: R.separatorToPanels
          });
        }
      } else
        il(e, y, v);
    }
  });
  a.observe(e.element), e.panels.forEach((g) => {
    Z(
      !r.has(g.id),
      `Panel ids must be unique; id "${g.id}" was used more than once`
    ), r.add(g.id), g.onResize && a.observe(g.element);
  });
  const s = ct({ group: e }), c = hn(e), i = e.panels.map(({ id: g }) => g).join(",");
  let l = e.mutableState.defaultLayout;
  l && (ul(e.panels, l) || (l = void 0));
  const u = e.mutableState.layouts[i] ?? l ?? xr(c), d = Ge({
    layout: u,
    panelConstraints: c
  }), m = e.element.ownerDocument;
  tt.set(
    m,
    (tt.get(m) ?? 0) + 1
  );
  const h = /* @__PURE__ */ new Map();
  return So(e).forEach((g) => {
    g.separator && h.set(g.separator, g.panels);
  }), Ne(e, {
    defaultLayoutDeferred: s === 0,
    derivedPanelConstraints: c,
    groupSize: s,
    layout: d,
    separatorToPanels: h
  }), e.separators.forEach((g) => {
    Z(
      !o.has(g.id),
      `Separator ids must be unique; id "${g.id}" was used more than once`
    ), o.add(g.id), g.element.addEventListener("keydown", Mr);
  }), tt.get(m) === 1 && (m.addEventListener("contextmenu", Pr, !0), m.addEventListener("dblclick", kr, !0), m.addEventListener("pointerdown", Ar, !0), m.addEventListener("pointerleave", Nr), m.addEventListener("pointermove", _r), m.addEventListener("pointerout", Lr), m.addEventListener("pointerup", Cr, !0)), function() {
    t = !1, tt.set(
      m,
      Math.max(0, (tt.get(m) ?? 0) - 1)
    ), Zc(e), e.separators.forEach((g) => {
      g.element.removeEventListener("keydown", Mr);
    }), tt.get(m) || (m.removeEventListener(
      "contextmenu",
      Pr,
      !0
    ), m.removeEventListener(
      "dblclick",
      kr,
      !0
    ), m.removeEventListener(
      "pointerdown",
      Ar,
      !0
    ), m.removeEventListener("pointerleave", Nr), m.removeEventListener("pointermove", _r), m.removeEventListener("pointerout", Lr), m.removeEventListener("pointerup", Cr, !0)), a.disconnect();
  };
}
function fl() {
  const [e, t] = L({}), n = j(() => t({}), []);
  return [e, n];
}
function Dn(e) {
  const t = jr();
  return `${e ?? t}`;
}
const Ye = typeof window < "u" ? _e : $;
function gt(e) {
  const t = M(e);
  return Ye(() => {
    t.current = e;
  }, [e]), j(
    (...n) => {
      var r;
      return (r = t.current) == null ? void 0 : r.call(t, ...n);
    },
    [t]
  );
}
function zn(...e) {
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
function On(e) {
  const t = M({ ...e });
  return Ye(() => {
    for (const n in e)
      t.current[n] = e[n];
  }, [e]), t.current;
}
const Co = wn(null);
function ml(e, t) {
  const n = M({
    getLayout: () => ({}),
    setLayout: Kc
  });
  Rn(t, () => n.current, []), Ye(() => {
    Object.assign(
      n.current,
      _o({ groupId: e })
    );
  });
}
function xo({
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
  const g = M({
    onLayoutChange: {},
    onLayoutChanged: {}
  }), f = gt((E) => {
    qe(g.current.onLayoutChange, E) || (g.current.onLayoutChange = E, i == null || i(E));
  }), v = gt(
    (E, P) => {
      qe(g.current.onLayoutChanged, E) || (g.current.onLayoutChanged = E, l == null || l(E, { isUserInteraction: P }));
    }
  ), y = Dn(c), S = M(null), [R, p] = fl(), w = M({
    lastExpandedPanelSizes: {},
    layouts: {},
    panels: [],
    resizeTargetMinimumSize: d,
    separators: []
  }), k = zn(S, a);
  ml(y, s);
  const T = gt(
    (E, P) => {
      const I = Je(), N = Rr(E), O = xe(E);
      if (O) {
        let H = !1;
        switch (I.state) {
          case "active": {
            H = I.hitRegions.some(
              (F) => F.group === N
            );
            break;
          }
        }
        return {
          flexGrow: O.layout[P] ?? 1,
          pointerEvents: H ? "none" : void 0
        };
      }
      if (n != null && n[P])
        return {
          flexGrow: n == null ? void 0 : n[P]
        };
    }
  ), C = On({
    defaultLayout: n,
    disableCursor: r
  }), x = K(
    () => ({
      get disableCursor() {
        return !!C.disableCursor;
      },
      getPanelStyles: T,
      id: y,
      orientation: u,
      registerPanel: (E) => {
        const P = w.current;
        return P.panels = pn(u, [
          ...P.panels,
          E
        ]), p(), () => {
          P.panels = P.panels.filter(
            (I) => I !== E
          ), p();
        };
      },
      registerSeparator: (E) => {
        const P = w.current;
        return P.separators = pn(u, [
          ...P.separators,
          E
        ]), p(), () => {
          P.separators = P.separators.filter(
            (I) => I !== E
          ), p();
        };
      },
      updatePanelProps: (E, { disabled: P }) => {
        const I = w.current.panels.find(
          (H) => H.id === E
        );
        I && (I.panelConstraints.disabled = P);
        const N = Rr(y), O = xe(y);
        N && O && Ne(N, {
          ...O,
          derivedPanelConstraints: hn(N)
        });
      },
      updateSeparatorProps: (E, {
        disabled: P,
        disableDoubleClick: I
      }) => {
        const N = w.current.separators.find(
          (O) => O.id === E
        );
        N && (N.disabled = P, N.disableDoubleClick = I);
      }
    }),
    [T, y, p, u, C]
  ), D = M(null);
  return Ye(() => {
    const E = S.current;
    if (E === null)
      return;
    const P = w.current;
    let I;
    if (C.defaultLayout !== void 0 && Object.keys(C.defaultLayout).length === P.panels.length) {
      I = {};
      for (const V of P.panels) {
        const ee = C.defaultLayout[V.id];
        ee !== void 0 && (I[V.id] = ee);
      }
    }
    const N = {
      disabled: !!o,
      element: E,
      id: y,
      mutableState: {
        defaultLayout: I,
        disableCursor: !!C.disableCursor,
        expandedPanelSizes: w.current.lastExpandedPanelSizes,
        layouts: w.current.layouts
      },
      orientation: u,
      panels: P.panels,
      resizeTargetMinimumSize: P.resizeTargetMinimumSize,
      separators: P.separators
    };
    D.current = N;
    const O = dl(N), { defaultLayoutDeferred: H, derivedPanelConstraints: F, layout: J } = xe(N.id, !0);
    !H && F.length > 0 && (f(J), v(J, !1));
    const B = Cn(y, (V) => {
      const { defaultLayoutDeferred: ee, derivedPanelConstraints: fe, layout: re } = V.next;
      if (ee || fe.length === 0)
        return;
      const ae = N.panels.map(({ id: Y }) => Y).join(",");
      N.mutableState.layouts[ae] = re, fe.forEach((Y) => {
        if (Y.collapsible) {
          const { layout: _ } = V.prev ?? {};
          if (_) {
            const ne = de(
              Y.collapsedSize,
              re[Y.panelId]
            ), oe = de(
              Y.collapsedSize,
              _[Y.panelId]
            );
            ne && !oe && (N.mutableState.expandedPanelSizes[Y.panelId] = _[Y.panelId]);
          }
        }
      });
      const ze = Je().state !== "active";
      f(re), ze && v(re, V.isUserInteraction);
    });
    return () => {
      D.current = null, O(), B();
    };
  }, [
    o,
    y,
    v,
    f,
    u,
    R,
    C
  ]), $(() => {
    const E = D.current;
    E && (E.mutableState.defaultLayout = n, E.mutableState.disableCursor = !!r);
  }), /* @__PURE__ */ b(Co.Provider, { value: x, children: /* @__PURE__ */ b(
    "div",
    {
      ...h,
      className: t,
      "data-group": !0,
      "data-testid": y,
      id: y,
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
xo.displayName = "Group";
function Fn() {
  const e = Sn(Co);
  return Z(
    e,
    "Group Context not found; did you render a Panel or Separator outside of a Group?"
  ), e;
}
function hl(e, t) {
  const { id: n } = Fn(), r = M({
    collapse: en,
    expand: en,
    getSize: () => ({
      asPercentage: 0,
      inPixels: 0
    }),
    isCollapsed: () => !1,
    resize: en
  });
  Rn(t, () => r.current, []), Ye(() => {
    Object.assign(
      r.current,
      No({ groupId: n, panelId: e })
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
  const f = !!i, v = Dn(i), y = On({
    disabled: a
  }), S = M(null), R = zn(S, s), {
    getPanelStyles: p,
    id: w,
    orientation: k,
    registerPanel: T,
    updatePanelProps: C
  } = Fn(), x = d !== null, D = gt(
    (N, O, H) => {
      d == null || d(N, i, H);
    }
  );
  Ye(() => {
    const N = S.current;
    if (N !== null) {
      const O = {
        element: N,
        id: v,
        idIsStable: f,
        mutableValues: {
          expandToSize: void 0,
          prevSize: void 0
        },
        onResize: x ? D : void 0,
        panelConstraints: {
          groupResizeBehavior: c,
          collapsedSize: n,
          collapsible: r,
          defaultSize: o,
          disabled: y.disabled,
          maxSize: l,
          minSize: u
        }
      };
      return T(O);
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
    D,
    T,
    y
  ]), $(() => {
    C(v, { disabled: a });
  }, [a, v, C]), hl(v, m);
  const E = () => {
    const N = p(w, v);
    if (N)
      return JSON.stringify(N);
  }, P = $r(
    (N) => Cn(w, N),
    E,
    E
  );
  let I;
  return P ? I = JSON.parse(P) : o !== void 0 ? I = {
    flexGrow: void 0,
    flexShrink: void 0,
    flexBasis: o
  } : I = { flexGrow: 1 }, /* @__PURE__ */ b(
    "div",
    {
      ...g,
      "data-disabled": a || void 0,
      "data-panel": !0,
      "data-testid": v,
      id: v,
      ref: R,
      style: {
        ...pl,
        display: "flex",
        flexBasis: 0,
        flexShrink: 1,
        overflow: "visible",
        ...I
      },
      children: /* @__PURE__ */ b(
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
const pl = {
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
function gl({
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
function Do({
  children: e,
  className: t,
  disabled: n,
  disableDoubleClick: r,
  elementRef: o,
  id: a,
  style: s,
  ...c
}) {
  const i = Dn(a), l = On({
    disabled: n,
    disableDoubleClick: r
  }), [u, d] = L({}), [m, h] = L("inactive"), [g, f] = L(!1), v = M(null), y = zn(v, o), {
    disableCursor: S,
    id: R,
    orientation: p,
    registerSeparator: w,
    updateSeparatorProps: k
  } = Fn(), T = p === "horizontal" ? "vertical" : "horizontal";
  Ye(() => {
    const D = v.current;
    if (D !== null) {
      const E = {
        disabled: l.disabled,
        disableDoubleClick: l.disableDoubleClick,
        element: D,
        id: i
      }, P = w(E), I = qc(
        (O) => {
          h(
            O.next.state !== "inactive" && O.next.hitRegions.some(
              (H) => H.separator === E
            ) ? O.next.state : "inactive"
          );
        }
      ), N = Cn(
        R,
        (O) => {
          const { derivedPanelConstraints: H, layout: F, separatorToPanels: J } = O.next, B = J.get(E);
          if (B) {
            const V = B[0], ee = B.indexOf(V);
            d(
              gl({
                layout: F,
                panelConstraints: H,
                panelId: V.id,
                panelIndex: ee
              })
            );
          }
        }
      );
      return () => {
        I(), N(), P();
      };
    }
  }, [R, i, w, l]), $(() => {
    k(i, { disabled: n, disableDoubleClick: r });
  }, [n, r, i, k]);
  let C;
  n && !S && (C = "not-allowed");
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
  return /* @__PURE__ */ b(
    "div",
    {
      ...c,
      "aria-controls": u.valueControls,
      "aria-disabled": n || void 0,
      "aria-orientation": T,
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
      ref: y,
      role: "separator",
      style: {
        flexBasis: "auto",
        cursor: C,
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
Do.displayName = "Separator";
const $n = 30, jn = 65, St = 50, bl = 100 - jn, yl = 100 - $n;
function vl(e) {
  const t = Number(e);
  return Number.isFinite(t) ? Math.min(jn, Math.max($n, t)) : St;
}
function Bn(e) {
  return 100 - e;
}
function nt(e) {
  return `${e}%`;
}
const Un = "reader-document", Rt = "reader-assistant", zo = "retainpdf.reader.ai-split-layout.v1", wl = {
  [Un]: Bn(St),
  [Rt]: St
};
function Hn(e) {
  const t = vl(e == null ? void 0 : e[Rt]);
  return {
    [Un]: Bn(t),
    [Rt]: t
  };
}
function Sl() {
  try {
    const e = JSON.parse(localStorage.getItem(zo) || "null");
    return Hn(e);
  } catch {
    return wl;
  }
}
function Rl(e) {
  try {
    localStorage.setItem(zo, JSON.stringify(Hn(e)));
  } catch {
  }
}
function tn(e, t) {
  const n = e == null ? void 0 : e.closest(".reader-react-root");
  if (!n) return;
  const r = Hn(t);
  n.style.setProperty(
    "--reader-ai-split-width",
    `${r[Rt]}vw`
  );
}
function Pl() {
  const e = M(null), [t] = L(Sl);
  _e(() => {
    const o = e.current;
    return tn(o, t), () => {
      var a;
      (a = o == null ? void 0 : o.closest(".reader-react-root")) == null || a.style.removeProperty("--reader-ai-split-width");
    };
  }, [t]);
  const n = j((o) => {
    tn(e.current, o);
  }, []), r = j((o, a) => {
    tn(e.current, o), a.isUserInteraction && Rl(o);
  }, []);
  return /* @__PURE__ */ z(
    xo,
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
        /* @__PURE__ */ b(
          gn,
          {
            id: Un,
            defaultSize: nt(Bn(St)),
            minSize: nt(bl),
            maxSize: nt(yl)
          }
        ),
        /* @__PURE__ */ b(
          Do,
          {
            id: "reader-ai-split-separator",
            className: "reader-ai-split-separator",
            "aria-label": "调整文档与 AI 问答宽度",
            children: /* @__PURE__ */ b("span", { "aria-hidden": "true" })
          }
        ),
        /* @__PURE__ */ b(
          gn,
          {
            id: Rt,
            defaultSize: nt(St),
            minSize: nt($n),
            maxSize: nt(jn)
          }
        )
      ]
    }
  );
}
function Il({
  regionsFailed: e = !1,
  metadataFailed: t = !1
}) {
  const [n, r] = L(!1);
  if ($(() => {
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
    /* @__PURE__ */ b(
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
function Tl({
  loading: e,
  failed: t,
  text: n,
  percent: r,
  regionsError: o = !1,
  metadataError: a = !1
}) {
  return !e && !t ? /* @__PURE__ */ b(Il, { regionsFailed: o, metadataFailed: a }) : /* @__PURE__ */ z(We, { children: [
    e ? /* @__PURE__ */ b("div", { className: "reader-boot-loading", "data-reader-boot-loading": "true", children: /* @__PURE__ */ z("div", { className: "reader-boot-loading-card", children: [
      /* @__PURE__ */ b("div", { className: "reader-boot-loading-text", children: n }),
      /* @__PURE__ */ b("div", { className: "reader-boot-loading-track", children: /* @__PURE__ */ b(
        "span",
        {
          className: "reader-boot-loading-bar",
          style: { width: `${Math.max(0, Math.min(100, r))}%` }
        }
      ) })
    ] }) }) : null,
    t ? /* @__PURE__ */ b("div", { className: "reader-react-error", role: "alert", children: n }) : null
  ] });
}
function El(e) {
  if (!(e instanceof HTMLElement)) return !1;
  const t = e.tagName;
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.isContentEditable ? !0 : !!e.closest("input, textarea, select, [contenteditable='true']");
}
function kl() {
  const [e, t] = L(!1), n = jr(), r = M(null);
  return $(() => {
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
  }, [e]), $(() => {
    const o = (a) => {
      if (a.defaultPrevented || a.metaKey || a.ctrlKey || a.altKey || El(a.target)) return;
      const s = a.key;
      if (s === "?" || s === "h" || s === "H" || s === "/") {
        if (s === "/" && !a.shiftKey)
          return;
        a.preventDefault(), t((c) => !c);
      }
    };
    return window.addEventListener("keydown", o), () => window.removeEventListener("keydown", o);
  }, []), /* @__PURE__ */ z("div", { className: "reader-react-shortcuts", ref: r, "data-reader-shortcuts": "", children: [
    /* @__PURE__ */ b(
      "button",
      {
        type: "button",
        className: `reader-react-hud-btn reader-react-shortcuts-btn${e ? " is-active" : ""}`,
        "aria-label": "快捷键说明",
        "aria-expanded": e,
        "aria-controls": n,
        title: "快捷键（H 或 ?）",
        onClick: () => t((o) => !o),
        children: /* @__PURE__ */ b(oa, { className: "reader-react-shortcuts-icon", size: 16, strokeWidth: 2.25, "aria-hidden": !0 })
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
            /* @__PURE__ */ b("strong", { children: "快捷键" }),
            /* @__PURE__ */ b(
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
          /* @__PURE__ */ b("div", { className: "reader-react-shortcuts-body", children: yi.map((o) => /* @__PURE__ */ z("section", { className: "reader-react-shortcuts-group", children: [
            /* @__PURE__ */ b("h3", { children: o.title }),
            /* @__PURE__ */ b("ul", { children: o.items.map((a) => /* @__PURE__ */ z("li", { children: [
              /* @__PURE__ */ b("kbd", { children: a.keys }),
              /* @__PURE__ */ b("span", { children: a.desc })
            ] }, `${o.title}-${a.keys}`)) })
          ] }, o.title)) }),
          /* @__PURE__ */ b("p", { className: "reader-react-shortcuts-foot", children: "在输入框内不会触发快捷键" })
        ]
      }
    ) : null
  ] });
}
const Ml = ["source", "sideBySide", "translated"], Al = { source: "", translated: "", sideBySide: "" };
function Nl(e) {
  if (e.sourceOnly || !e.jobId) {
    const t = xt(e.sourceUrl), n = xt(e.translatedUrl);
    return {
      source: t,
      translated: n,
      // sideBySide requires dedicated artifact; no fallback to source url
      sideBySide: ""
    };
  }
  return Ta({
    jobId: e.jobId,
    jobPayload: e.jobPayload,
    manifestPayload: e.manifestPayload
  });
}
function _l(e) {
  const [t, n] = L(() => /* @__PURE__ */ new Set()), r = K(
    () => e ? Nl(e) : Al,
    [e]
  ), o = K(
    () => Ml.filter((s) => !(e != null && e.sourceOnly && s !== "source")),
    [e == null ? void 0 : e.sourceOnly]
  ), a = j(async (s) => {
    if (!e) return;
    const c = xt(r[s]);
    if (!(!c || t.has(s)))
      try {
        const i = e.jobId ? Ia(s, {
          jobId: e.jobId,
          jobPayload: e.jobPayload,
          manifestPayload: e.manifestPayload
        }) : `${e.sourceOnly ? "document" : "reader"}-${s}.pdf`;
        await Ea(
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
        ka(l), n((u) => {
          const d = new Set(u);
          return d.delete(s), d;
        });
      }
  }, [r, t, e]);
  return { urls: r, downloadItems: o, busyActions: t, handleDownload: a };
}
const Ll = {
  source: Br,
  sideBySide: Ur,
  translated: Hr
}, Cl = {
  source: "原文",
  sideBySide: "对照",
  translated: "译文"
};
function xl(e) {
  const t = De(), n = e.download ?? (t == null ? void 0 : t.download), { urls: r, downloadItems: o, busyActions: a, handleDownload: s } = _l(n), c = M(null);
  return $(() => {
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
  }, []), /* @__PURE__ */ z("details", { ref: c, className: "reader-download-actions", children: [
    /* @__PURE__ */ z("summary", { className: "reader-download-trigger", "aria-label": "下载 PDF", title: "下载 PDF", children: [
      /* @__PURE__ */ b(aa, { size: 15, strokeWidth: 2.1, "aria-hidden": !0 }),
      /* @__PURE__ */ b("span", { className: "reader-download-trigger-label", children: "下载" }),
      /* @__PURE__ */ b(sa, { size: 13, strokeWidth: 2.2, "aria-hidden": !0, className: "reader-download-trigger-caret" })
    ] }),
    /* @__PURE__ */ b("div", { className: "reader-download-menu", role: "group", "aria-label": "下载 PDF", children: o.map((i) => {
      const l = Ho[i], u = xt(r[i]), d = a.has(i), m = !!u && !d, h = m ? "" : Wo(i, r), g = Ll[i];
      return /* @__PURE__ */ z(
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
            /* @__PURE__ */ b(g, { size: 15, strokeWidth: 2.1, "aria-hidden": !0 }),
            /* @__PURE__ */ z("span", { className: "reader-download-action-text", children: [
              /* @__PURE__ */ z("span", { className: "reader-download-action-label", children: [
                Cl[i],
                " PDF"
              ] }),
              h ? /* @__PURE__ */ b("span", { className: "reader-download-action-reason", children: h }) : null
            ] })
          ]
        },
        i
      );
    }) })
  ] });
}
const Dl = "retainpdf:reader:bookmarks:v1:", zl = 200;
function Wn() {
  try {
    return typeof globalThis.localStorage > "u" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}
function Oo(e) {
  const t = `${e || ""}`.trim();
  return t ? `${Dl}${t}` : "";
}
function Ol(e) {
  if (!e || typeof e != "object") return null;
  const t = e, n = Math.floor(Number(t.page));
  return !Number.isFinite(n) || n < 1 ? null : { page: n, label: `${t.label || ""}`.trim().slice(0, 120), createdAt: `${t.createdAt || ""}` };
}
function Bt(e, t = Wn()) {
  const n = Oo(e);
  if (!n || !t) return [];
  try {
    const r = JSON.parse(t.getItem(n) || "[]"), o = /* @__PURE__ */ new Map();
    for (const a of Array.isArray(r) ? r : []) {
      const s = Ol(a);
      s && !o.has(s.page) && o.set(s.page, s);
    }
    return [...o.values()].sort((a, s) => a.page - s.page);
  } catch {
    return [];
  }
}
function bn(e, t, n) {
  const r = Oo(e), o = [...t].sort((a, s) => a.page - s.page).slice(0, zl);
  if (!r || !n) return o;
  try {
    n.setItem(r, JSON.stringify(o));
  } catch {
  }
  return o;
}
function Fl(e, t, n = "", { storage: r = Wn(), now: o = () => (/* @__PURE__ */ new Date()).toISOString() } = {}) {
  const a = Bt(e, r), s = Math.floor(Number(t));
  return !Number.isFinite(s) || s < 1 ? a : a.some((c) => c.page === s) ? bn(e, a.filter((c) => c.page !== s), r) : bn(e, [...a, { page: s, label: `${n || ""}`.trim().slice(0, 120), createdAt: o() }], r);
}
function $l(e, t, n = Wn()) {
  return bn(e, Bt(e, n).filter((r) => r.page !== t), n);
}
function jl(e, t) {
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
function Bl({ filled: e }) {
  return /* @__PURE__ */ b("svg", { viewBox: "0 0 24 24", width: "15", height: "15", "aria-hidden": "true", fill: e ? "currentColor" : "none", children: /* @__PURE__ */ b("path", { d: "M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.6L6 20V5.5a1 1 0 0 1 1-1z", stroke: "currentColor", strokeWidth: "1.7", strokeLinejoin: "round" }) });
}
function Ul({ scope: e, currentPage: t, numPages: n, regions: r, onGoToPage: o }) {
  const [a, s] = L(() => Bt(e)), [c, i] = L(!1), l = M(null);
  if ($(() => {
    s(Bt(e)), i(!1);
  }, [e]), $(() => {
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
  return /* @__PURE__ */ z("div", { className: "reader-react-hud-group reader-bookmarks", "aria-label": "书签", ref: l, children: [
    /* @__PURE__ */ b(
      "button",
      {
        type: "button",
        className: `reader-react-hud-btn reader-bookmark-toggle${d ? " is-marked" : ""}`,
        "aria-pressed": d,
        "aria-label": d ? `取消第 ${u} 页的书签` : `给第 ${u} 页加书签`,
        title: d ? "取消这一页的书签" : "给这一页加书签",
        onClick: () => s(Fl(e, u, jl(r, u))),
        children: /* @__PURE__ */ b(Bl, { filled: d })
      }
    ),
    /* @__PURE__ */ b(
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
    c && a.length ? /* @__PURE__ */ b("div", { className: "reader-bookmark-popover", role: "dialog", "aria-label": "书签", children: /* @__PURE__ */ b("ol", { className: "reader-bookmark-list", children: a.map((m) => /* @__PURE__ */ z("li", { className: m.page === u ? "is-current" : "", children: [
      /* @__PURE__ */ z(
        "button",
        {
          type: "button",
          className: "reader-bookmark-jump",
          onClick: () => {
            o == null || o(Math.min(m.page, n)), i(!1);
          },
          children: [
            /* @__PURE__ */ z("span", { className: "reader-bookmark-page", children: [
              "第 ",
              m.page,
              " 页"
            ] }),
            m.label ? /* @__PURE__ */ b("span", { className: "reader-bookmark-label", children: m.label }) : null
          ]
        }
      ),
      /* @__PURE__ */ b(
        "button",
        {
          type: "button",
          className: "reader-bookmark-remove",
          "aria-label": `删除第 ${m.page} 页的书签`,
          onClick: () => s($l(e, m.page)),
          children: "×"
        }
      )
    ] }, m.page)) }) }) : null
  ] });
}
function Hl(e) {
  const t = De(), n = go(), { mode: r = "compare", modeControls: o } = e, a = e.userZoom ?? (t == null ? void 0 : t.userZoom) ?? Pt, s = e.onZoomChange ?? (t == null ? void 0 : t.onZoomChange) ?? (() => {
  }), c = e.currentPage ?? (n == null ? void 0 : n.currentPage) ?? 1, i = e.numPages ?? (n == null ? void 0 : n.numPages) ?? 0, l = e.onGoToPage ?? (t == null ? void 0 : t.goToPage), u = vs(a), d = a > Gr + 1e-3, m = a < $t - 1e-3, h = rt(r, He()), g = h >= $t ? "100%（铺满阅读区）" : "50%（半屏，对照铺满）", [f, v] = L(!1), [y, S] = L(`${c}`);
  $(() => {
    f || S(`${Math.min(Math.max(c, 1), Math.max(i, 1))}`);
  }, [c, i, f]);
  const R = () => {
    if (v(!1), !l || i <= 0)
      return;
    const p = Number(`${y}`.trim());
    l(jt(p, i));
  };
  return /* @__PURE__ */ z("div", { className: "reader-react-hud", "data-reader-hud": "true", children: [
    o ? /* @__PURE__ */ b("div", { className: "reader-react-hud-group reader-react-hud-modes", children: o }) : null,
    /* @__PURE__ */ b("div", { className: "reader-react-hud-group", "aria-label": "页码", children: f ? /* @__PURE__ */ z(
      "form",
      {
        className: "reader-react-hud-page-form",
        onSubmit: (p) => {
          p.preventDefault(), R();
        },
        children: [
          /* @__PURE__ */ b(
            "input",
            {
              className: "reader-react-hud-page-input",
              type: "text",
              inputMode: "numeric",
              pattern: "[0-9]*",
              "aria-label": "跳转到页码",
              value: y,
              autoFocus: !0,
              onChange: (p) => S(p.target.value.replace(/[^\d]/g, "")),
              onBlur: R,
              onKeyDown: (p) => {
                p.key === "Escape" && (p.preventDefault(), v(!1), S(`${c}`));
              }
            }
          ),
          /* @__PURE__ */ z("span", { className: "reader-react-hud-page-suffix", children: [
            "/ ",
            i || "—"
          ] })
        ]
      }
    ) : /* @__PURE__ */ b(
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
    e.bookmarkScope ? /* @__PURE__ */ b(
      Ul,
      {
        scope: e.bookmarkScope,
        currentPage: c,
        numPages: i,
        regions: t == null ? void 0 : t.regions,
        onGoToPage: l
      }
    ) : null,
    /* @__PURE__ */ z("div", { className: "reader-react-hud-group", "aria-label": "缩放", children: [
      /* @__PURE__ */ b(
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
      /* @__PURE__ */ z(
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
      /* @__PURE__ */ b(
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
    /* @__PURE__ */ b("div", { className: "reader-react-hud-group reader-react-hud-help", "aria-label": "帮助", children: /* @__PURE__ */ b(kl, {}) })
  ] });
}
function Dr(e) {
  var t, n;
  return Xr(e == null ? void 0 : e.assistantPanel) ? e.assistantPanel : ((t = e == null ? void 0 : e.splitLayout) == null ? void 0 : t.left) === "markdown" || ((n = e == null ? void 0 : e.splitLayout) == null ? void 0 : n.right) === "markdown" ? "markdown" : null;
}
function Wl(e) {
  const [t, n] = L(() => ({
    scope: e,
    panel: Dr(Pe(e))
  }));
  $(() => {
    n((o) => o.scope === e ? o : {
      scope: e,
      panel: Dr(Pe(e))
    });
  }, [e]), $(() => {
    t.scope === e && Wt(t.scope, {
      assistantPanel: t.panel,
      // 旧的自由两栏布局已经没有写入者了，恢复时只当迁移来源读一次。
      splitLayout: null
    });
  }, [t, e]);
  const r = j((o) => {
    n((a) => ({
      scope: a.scope,
      panel: typeof o == "function" ? o(a.panel) : o
    }));
  }, []);
  return { panel: t.panel, scope: t.scope, setPanel: r };
}
const yn = "download-toast";
function Vl({
  title: e = "下载中",
  status: t = "正在准备...",
  meta: n = "等待响应...",
  percent: r = NaN,
  tone: o = "progress"
}) {
  const a = Number.isFinite(r) ? Math.max(4, Math.min(100, Number(r) || 0)) : 18;
  return /* @__PURE__ */ z("div", { className: "download-toast-card reader-floating-surface", "data-tone": o, "aria-live": "polite", children: [
    /* @__PURE__ */ z("div", { className: "download-toast-head", children: [
      /* @__PURE__ */ b("div", { id: "download-toast-title", className: "download-toast-title", children: e }),
      /* @__PURE__ */ b("div", { id: "download-toast-status", className: "download-toast-status", children: t })
    ] }),
    /* @__PURE__ */ b("div", { className: "download-toast-track", children: /* @__PURE__ */ b("span", { id: "download-toast-bar", className: "download-toast-bar", style: { width: `${a}%` } }) }),
    /* @__PURE__ */ b("div", { id: "download-toast-meta", className: "download-toast-meta", children: n })
  ] });
}
function Jl(e = {}) {
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
    () => /* @__PURE__ */ b(Vl, { title: n, status: r, meta: o, percent: a, tone: s }),
    { id: yn, duration: 1 / 0 }
  );
}
function ql() {
  const e = j((t) => {
    t && (t.setState = Jl, t.hide = () => on.dismiss(yn));
  }, []);
  return /* @__PURE__ */ z(We, { children: [
    /* @__PURE__ */ b(ta, { position: "bottom-right" }),
    /* @__PURE__ */ b("download-toast", { style: { display: "none" }, "aria-hidden": "true", ref: e })
  ] });
}
function Gl(e) {
  return e.sourceViewOnly ? { mode: "source", auto: !1 } : e.savedMode ? { mode: e.savedMode, auto: !1 } : Kr(e.viewportWidth) ? { mode: "translated", auto: !0 } : { mode: null, auto: !1 };
}
function Kl(e, t) {
  return t === null || e !== t;
}
function Yl(e) {
  const t = M(!1);
  return e && (t.current = !0), t.current;
}
function Zl(e, t) {
  const n = e === t;
  return { open: n, mounted: Yl(n) };
}
const zr = { itemId: null, origin: null };
function Xl() {
  let e = zr;
  const t = /* @__PURE__ */ new Set();
  return {
    get: () => e,
    set(n, r) {
      if (!(e.itemId === n && (n === null || e.origin === r))) {
        e = n === null ? zr : { itemId: n, origin: r };
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
const Ue = (e) => `${e ?? ""}`.replace(/\s+/gu, " ").trim(), Ql = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉", "+": "₊", "-": "₋" }, eu = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "+": "⁺", "-": "⁻" }, tu = {
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
}, Or = (e, t) => [...e].every((n) => n in t) ? [...e].map((n) => t[n]).join("") : e;
function nu(e) {
  return e.replace(
    /\$([^$]+)\$/gu,
    (t, n) => n.replace(/\\(?:mathrm|text|mathbf|mathit|operatorname)\{([^{}]*)\}/gu, "$1").replace(/_\{([^{}]*)\}|_(\w)/gu, (r, o, a) => Or(o ?? a ?? "", Ql)).replace(/\^\{([^{}]*)\}|\^(\w)/gu, (r, o, a) => Or(o ?? a ?? "", eu)).replace(/\\([a-zA-Z]+)/gu, (r, o) => tu[o] ?? "").replace(/[{}]/gu, "").trim()
  ).replace(/\s+/gu, " ").trim();
}
function ru(e) {
  return Ue(e.translatedBlockText) || Ue(e.translated.text) || Ue(e.source.text);
}
const ou = (e) => !!e.headingLevel || e.subType === "title" || e.subType === "heading";
function au(e) {
  const t = [];
  for (const n of e) {
    if (!ou(n)) continue;
    const r = nu(ru(n)), o = Number(n.source.page);
    if (!r || !Number.isFinite(o) || o < 1) continue;
    const a = t[t.length - 1];
    a && a.text === r && a.page === o || t.push({ itemId: n.itemId, level: n.headingLevel && n.headingLevel > 1 ? 2 : 1, page: o, text: r });
  }
  return t;
}
function su(e, t) {
  let n = -1;
  for (let r = 0; r < e.length && e[r].page <= t; r += 1)
    n = r;
  return n;
}
const iu = 24, cu = 60;
function Fr(e, t) {
  const n = e.toLowerCase().indexOf(t);
  if (n < 0) return null;
  const r = Math.max(0, n - iu), o = Math.min(e.length, n + t.length + cu), a = r > 0 ? "…" : "";
  return { snippet: `${a}${e.slice(r, o)}${o < e.length ? "…" : ""}`, at: a.length + n - r, length: t.length };
}
function lu(e, t, n = 200) {
  const r = Ue(t).toLowerCase();
  if (!r) return [];
  const o = [];
  for (const a of e) {
    const s = Number(a.source.page);
    if (!Number.isFinite(s) || s < 1) continue;
    const c = Ue(a.translatedBlockText) || Ue(a.translated.text), i = c ? Fr(c, r) : null, l = i ?? Fr(Ue(a.source.text), r);
    if (l && (o.push({ itemId: a.itemId, page: s, side: i ? "translated" : "source", ...l }), o.length >= n))
      break;
  }
  return o;
}
const uu = [];
function du({ open: e, onToggle: t }) {
  return /* @__PURE__ */ z("div", { className: "reader-finder-toggles", children: [
    /* @__PURE__ */ z(Be, { className: "reader-finder-toggle", "aria-pressed": e === "outline", title: "目录", onClick: () => t("outline"), children: [
      /* @__PURE__ */ b(ia, { size: 16, strokeWidth: 2.1, "aria-hidden": !0 }),
      /* @__PURE__ */ b("span", { children: "目录" })
    ] }),
    /* @__PURE__ */ z(Be, { className: "reader-finder-toggle", "aria-pressed": e === "search", title: "在书里搜索（原文和译文）", onClick: () => t("search"), children: [
      /* @__PURE__ */ b(ca, { size: 16, strokeWidth: 2.1, "aria-hidden": !0 }),
      /* @__PURE__ */ b("span", { children: "搜索" })
    ] })
  ] });
}
function fu({
  tab: e,
  onTab: t,
  onClose: n,
  onJump: r
}) {
  var h, g;
  const o = ((h = De()) == null ? void 0 : h.regions) ?? uu, a = ((g = go()) == null ? void 0 : g.currentPage) ?? 1, s = K(() => au(o), [o]), c = su(s, a), [i, l] = L(""), u = K(() => lu(o, i), [o, i]), d = M(null), m = M(null);
  return $(() => {
    var f, v, y;
    e === "search" ? (f = d.current) == null || f.focus() : (y = (v = m.current) == null ? void 0 : v.querySelector('[aria-current="location"]')) == null || y.scrollIntoView({ block: "center" });
  }, [e]), /* @__PURE__ */ z("aside", { className: "reader-finder", "aria-label": e === "outline" ? "目录" : "搜索", children: [
    /* @__PURE__ */ z("header", { className: "reader-finder-head", children: [
      /* @__PURE__ */ z("div", { className: "reader-finder-tabs", role: "tablist", children: [
        /* @__PURE__ */ b(Be, { className: "reader-finder-tab", role: "tab", "aria-selected": e === "outline", onClick: () => t("outline"), children: "目录" }),
        /* @__PURE__ */ b(Be, { className: "reader-finder-tab", role: "tab", "aria-selected": e === "search", onClick: () => t("search"), children: "搜索" })
      ] }),
      /* @__PURE__ */ b(Be, { className: "reader-finder-close", "aria-label": "收起", title: "收起", onClick: n, children: /* @__PURE__ */ b(En, { size: 16, strokeWidth: 2.1, "aria-hidden": !0 }) })
    ] }),
    e === "outline" ? s.length ? /* @__PURE__ */ b("ol", { ref: m, className: "reader-finder-list", children: s.map((f, v) => /* @__PURE__ */ b("li", { children: /* @__PURE__ */ z(
      Be,
      {
        className: "reader-finder-entry",
        "data-level": f.level,
        "aria-current": v === c ? "location" : void 0,
        onClick: () => r(f.itemId),
        children: [
          /* @__PURE__ */ b("span", { className: "reader-finder-entry-text", children: f.text }),
          /* @__PURE__ */ b("span", { className: "reader-finder-entry-page", children: f.page })
        ]
      }
    ) }, f.itemId)) }) : /* @__PURE__ */ b("p", { className: "reader-finder-empty", children: o.length ? "这本书没有认出标题。" : "这本书还没有段落数据。" }) : /* @__PURE__ */ z(We, { children: [
      /* @__PURE__ */ z("div", { className: "reader-finder-search", children: [
        /* @__PURE__ */ b(
          la,
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
        i.trim() ? /* @__PURE__ */ b("p", { className: "reader-finder-count", children: u.length >= 200 ? "200 处以上，只列前 200 处" : `${u.length} 处` }) : null
      ] }),
      /* @__PURE__ */ b("ol", { className: "reader-finder-list", children: u.map((f) => /* @__PURE__ */ b("li", { children: /* @__PURE__ */ z(Be, { className: "reader-finder-entry is-hit", onClick: () => r(f.itemId), children: [
        /* @__PURE__ */ z("span", { className: "reader-finder-entry-text", children: [
          f.snippet.slice(0, f.at),
          /* @__PURE__ */ b("mark", { children: f.snippet.slice(f.at, f.at + f.length) }),
          f.snippet.slice(f.at + f.length)
        ] }),
        /* @__PURE__ */ b("span", { className: "reader-finder-entry-page", children: f.page })
      ] }) }, f.itemId)) })
    ] })
  ] });
}
const mu = jo(() => import("./ReaderMarkdownPanel-Ue3L7gUo.js").then((e) => ({ default: e.ReaderMarkdownPanel })));
function hu(e) {
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
function pu(e, t) {
  return e === "compare" ? t ? !0 : null : !1;
}
function gu() {
  const e = gi(), { boot: t, panes: n, sessionFiles: r, session: o } = e, a = Wl(e.viewStateKey), s = a.panel, c = a.setPanel, [i, l] = L(null), [u, d] = L(!1), m = M(null), h = M(null), g = s !== null, f = e.liveTranslationAvailable || e.liveTranslation.pagesByPage.size > 0, v = hu({
    mode: e.mode,
    sourceOnly: e.sourceOnly,
    translatedUrl: r.translatedUrl,
    overlayContentAvailable: f,
    liveTranslationVisible: u,
    assistantOpen: g,
    assistantPdfPane: i
  }), y = ii({
    hasOverlayContent: f,
    connection: e.liveTranslation.connection,
    showSource: v.showSource,
    liveTranslationVisible: u,
    assistantOpen: g
  }), S = v.sourceViewOnly, R = v.visibleMode;
  $(() => {
    d(!1);
  }, [e.viewStateKey]), $(() => {
    e.session.jobTerminal && d(!1);
  }, [e.session.jobTerminal]), $(() => {
    l(null);
  }, [a.scope]), $(() => {
    if (!(t.loading || t.failed)) {
      if (m.current !== e.viewStateKey) {
        m.current = e.viewStateKey;
        const B = Pe(e.viewStateKey), V = Gl({
          savedMode: B == null ? void 0 : B.mode,
          sourceViewOnly: S,
          viewportWidth: He()
        });
        h.current = V.auto ? V.mode : null, V.mode && V.mode !== e.mode && e.setModeKeepingPage(V.mode);
        return;
      }
      Kl(e.mode, h.current) && (h.current = null, Wt(e.viewStateKey, { mode: e.mode }));
    }
  }, [t.failed, t.loading, e.mode, e.setModeKeepingPage, e.viewStateKey, S]);
  const p = s || (e.mode === "compare" ? "compare" : "reading"), w = Zl(s, "markdown");
  Pi({
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
  const k = j(() => {
    c(null), l(null);
  }, []), T = j((B) => {
    l(null);
    const V = pu(B, e.liveTranslationAvailable);
    V !== null && d(V), e.setModeKeepingPage(B);
  }, [e.liveTranslationAvailable, e.setModeKeepingPage]), C = K(() => y.sourcePaneToggle ? /* @__PURE__ */ b(
    "button",
    {
      type: "button",
      className: `reader-live-translation-toggle${u ? " is-active" : ""}`,
      onClick: () => d((B) => !B),
      "aria-pressed": u,
      title: u ? "隐藏实时译文" : "在原文 PDF 上叠加实时译文",
      children: "译文"
    }
  ) : null, [y.sourcePaneToggle, u]), x = j((B) => {
    c(B), l(null);
  }, []), [D] = L(Xl), [E, P] = L(null), I = j((B) => P((V) => V === B ? null : B), []), N = j((B) => {
    e.jumpToAnchor({ block_id: B }), He() < 900 && P(null);
  }, [e.jumpToAnchor]), O = j((B) => e.jumpToAnchor({ block_id: B }), [e.jumpToAnchor]), H = K(() => ({
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
    regionHover: D,
    jumpToBlock: O,
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
    D,
    O,
    e.revisedBlocks,
    e.sourceOnly,
    S,
    e.download,
    e.goToPage,
    x,
    k
  ]), F = K(() => ({
    currentPage: e.currentPage,
    numPages: n.hudNumPages
  }), [e.currentPage, n.hudNumPages]), J = [
    us,
    `is-workspace-${p}`,
    g ? "is-assistant-open" : "",
    E ? "is-finder-open" : "",
    v.overlayOnSource ? "is-live-translation-overlay" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ b(cc, { value: H, hud: F, children: /* @__PURE__ */ z("div", { className: J, "data-reader-engine": "react-pdf", "data-reader-workspace": p, children: [
    /* @__PURE__ */ b(Tl, { loading: t.loading, failed: t.failed, text: t.text, percent: t.percent, regionsError: !!o.readerErrors.regions, metadataError: !!o.readerErrors.metadata }),
    /* @__PURE__ */ b(du, { open: E, onToggle: I }),
    E ? /* @__PURE__ */ b(
      fu,
      {
        tab: E,
        onTab: P,
        onClose: () => P(null),
        onJump: N
      }
    ) : null,
    /* @__PURE__ */ z("div", { className: "reader-chrome-tray", children: [
      /* @__PURE__ */ b(zc, { active: s }),
      /* @__PURE__ */ b(xl, {}),
      /* @__PURE__ */ b(Ni, { onBeforeClose: o.prepareClose })
    ] }),
    /* @__PURE__ */ b(
      Cc,
      {
        mode: R,
        documentReady: !!o.jobId,
        sourceViewOnly: S,
        onModeChange: T,
        liveTranslation: y.topBarPill ? {
          visible: u,
          state: e.liveTranslation,
          onToggle: () => d((B) => !B)
        } : null
      }
    ),
    /* @__PURE__ */ b(Oc, { active: s }),
    g ? /* @__PURE__ */ b(Pl, {}) : null,
    /* @__PURE__ */ b(Ac, { paneComposition: v, markdownSplit: w.open, assistantSplit: g, liveTranslation: e.liveTranslation, sourcePaneAction: C }),
    e.showHud ? /* @__PURE__ */ b(
      Hl,
      {
        mode: R,
        modeControls: null,
        bookmarkScope: e.viewStateKey
      }
    ) : null,
    /* @__PURE__ */ b($o, { fallback: null, children: w.mounted ? /* @__PURE__ */ b(mu, { open: w.open, jobId: o.jobId, sourceOnly: e.sourceOnly, side: "right", onClose: k }) : null }),
    /* @__PURE__ */ b(ql, {})
  ] }) });
}
function Cu() {
  return /* @__PURE__ */ b(gu, {});
}
export {
  Cu as R,
  gu as a,
  Li as c,
  Lu as d,
  va as f,
  Ma as r,
  De as u
};
//# sourceMappingURL=ReaderApp-BDQCszdU.js.map
