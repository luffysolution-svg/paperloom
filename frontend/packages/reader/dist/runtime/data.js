import { r as J, l as C, h as $ } from "../markdown-payload-kK3ewW_I.js";
import { d as T } from "../pdf-document-config-DOSsufI-.js";
import { e as Re, f as we, a as me, b as he, i as _e, n as Ue, c as ke, p as ve, r as ge, d as Me, g as Ee, h as De, j as Le } from "../reader-regions-DsePY7B_.js";
const G = "/api/v1", S = 250;
function y(e, t) {
  return e().then(
    (u) => ({ value: u, error: null }),
    (u) => ({ value: t, error: u })
  );
}
function q() {
  return Promise.resolve(null);
}
function X() {
  return Promise.resolve({ items: [] });
}
function Z() {
  return Promise.resolve(null);
}
function Q() {
  return Promise.resolve(null);
}
function Y() {
  return Promise.resolve({ items: [] });
}
function V() {
  return Promise.resolve(null);
}
function x(e, t) {
  return typeof globalThis.fetch == "function" ? globalThis.fetch(e, t) : Promise.reject(new Error(`fetchProtected not injected for ${e}`));
}
function I({
  apiPrefix: e = G,
  loadJob: t = q,
  loadManifest: u = X,
  loadMarkdown: r = Z,
  loadMarkdownDocument: s = Q,
  loadMarkdownSource: l = null,
  fetchMarkdownRange: o = null,
  loadRegions: f = Y,
  loadMetadata: p = V,
  fetchProtectedResource: k = x,
  liveTranslation: h = null
} = {}) {
  const R = /* @__PURE__ */ new Map(), _ = /* @__PURE__ */ new Map();
  function w(n) {
    const a = _.get(n);
    if (a && Date.now() - a.at < S)
      return Promise.resolve(a.value);
    const i = R.get(n);
    if (i) return i;
    let c;
    try {
      c = Promise.resolve(t(n, e)).then((d) => {
        const v = Date.now();
        _.set(n, { at: v, value: d });
        for (const [D, g] of _)
          v - g.at >= S && _.delete(D);
        return d;
      }).finally(() => {
        R.get(n) === c && R.delete(n);
      });
    } catch (d) {
      c = Promise.reject(d);
    }
    return R.set(n, c), c;
  }
  async function O(n, a = {}) {
    const i = a.includeOptionalArtifacts !== !1, c = w(n), d = u(n, e).catch((m) => {
      if (Number(m == null ? void 0 : m.status) === 404) return { items: [] };
      throw m;
    });
    if (!i) {
      const [m, W] = await Promise.all([c, d]);
      return {
        jobPayload: m,
        manifestPayload: W,
        readerMetadata: null,
        regionsPayload: { items: [] },
        readerErrors: { regions: null, metadata: null }
      };
    }
    const [v, D, g, F] = await Promise.all([
      c,
      d,
      y(() => f(n, e), { items: [] }),
      y(() => p(n, e), null)
    ]);
    return {
      jobPayload: v,
      manifestPayload: D,
      readerMetadata: F.value,
      regionsPayload: g.value,
      readerErrors: {
        regions: g.error,
        metadata: F.error
      }
    };
  }
  function z(n) {
    return w(n);
  }
  async function H(n) {
    const a = await C(
      () => s(n, e),
      () => r(n, e)
    );
    if ($(a)) return a;
    try {
      const i = await w(n), c = J(i, n);
      if (!c) return a;
      const d = await C(
        () => s(c, e),
        () => r(c, e)
      );
      return $(d) ? d : a;
    } catch {
      return a;
    }
  }
  async function K(n) {
    if (typeof l != "function") return null;
    let a = await l(n, e).catch(() => null);
    if (a != null && a.rawUrl) return a;
    try {
      const i = await w(n), c = J(i, n);
      return c ? (a = await l(c, e).catch(() => null), a != null && a.rawUrl ? a : null) : a;
    } catch {
      return a;
    }
  }
  function N(n, a, i, c, d) {
    return typeof o != "function" ? Promise.reject(new Error("fetchMarkdownRange not injected")) : o(n, a, i, c, d);
  }
  return Object.freeze({
    apiPrefix: e,
    fetchProtected: k,
    loadMarkdownPayload: H,
    loadMarkdownSource: K,
    loadMarkdownRange: N,
    loadJobPayload: z,
    loadReaderPayload: O,
    liveTranslation: h
  });
}
const ue = I();
function B(e) {
  return `${e ?? ""}`.trim();
}
function M(e = "") {
  return `${e ?? ""}`.trim() ? `${e}`.trim() : "";
}
const P = 512 * 1024;
let U = null;
function L(e = M) {
  return {
    moduleUrl: e("build/pdf.mjs"),
    workerUrl: e("build/pdf.worker.mjs"),
    cmapUrl: e("cmaps/"),
    standardFontDataUrl: e("standard_fonts/")
  };
}
async function b({ resolvePdfjsVendorUrl: e = M } = {}) {
  const { moduleUrl: t, workerUrl: u } = L(e);
  if (!t)
    throw new Error("resolvePdfjsVendorUrl not injected");
  return U || (U = import(t).then((r) => (r.GlobalWorkerOptions.workerSrc = u, r)).catch((r) => {
    throw U = null, r;
  })), U;
}
function j(e, { resolveResourceUrl: t = B } = {}) {
  return t((e == null ? void 0 : e.resource_url) || (e == null ? void 0 : e.resource_path) || "");
}
function ee({
  url: e,
  configPort: t = T,
  resolvePdfjsVendorUrl: u = M
} = {}) {
  var l;
  if (!e)
    return null;
  const { cmapUrl: r, standardFontDataUrl: s } = L(u);
  return {
    url: e,
    httpHeaders: ((l = t == null ? void 0 : t.apiHeaders) == null ? void 0 : l.call(t)) ?? {},
    withCredentials: !1,
    disableRange: !1,
    disableStream: !1,
    rangeChunkSize: P,
    cMapUrl: r,
    cMapPacked: !0,
    standardFontDataUrl: s
  };
}
async function le({
  itemOrUrl: e,
  configPort: t = T,
  fetchProtected: u = null,
  resolveResourceUrl: r = B,
  resolvePdfjsVendorUrl: s = M
} = {}) {
  const l = typeof e == "string" ? e : j(e, { resolveResourceUrl: r });
  if (!l)
    return null;
  const o = await b({ resolvePdfjsVendorUrl: s }), { cmapUrl: f, standardFontDataUrl: p } = L(s);
  if (l.startsWith("mock://") && typeof u == "function") {
    const k = await u(l), h = new Uint8Array(await k.arrayBuffer());
    return o.getDocument({
      data: h,
      cMapUrl: f,
      cMapPacked: !0,
      standardFontDataUrl: p
    }).promise;
  }
  return o.getDocument(ee({ url: l, configPort: t, resolvePdfjsVendorUrl: s })).promise;
}
function oe() {
  U = null;
}
function E(e) {
  return `${e ?? ""}`.trim();
}
function A(e, t) {
  return (Array.isArray(e == null ? void 0 : e.items) ? e.items : []).find((r) => (r == null ? void 0 : r.artifact_key) === t && (r == null ? void 0 : r.ready)) || null;
}
function te(e, t, { resolveResourceUrl: u = E, findReadyManifestArtifact: r = A } = {}) {
  const s = r(e, t), l = `${(s == null ? void 0 : s.resource_url) || (s == null ? void 0 : s.resource_path) || ""}`.trim();
  return l ? u(l) : "";
}
function re(e, { resolveResourceUrl: t = E } = {}) {
  return t((e == null ? void 0 : e.resource_url) || (e == null ? void 0 : e.resource_path) || "");
}
function ne(e) {
  var l, o, f, p;
  if (!e) return null;
  const t = (e == null ? void 0 : e.actions) || {}, u = (e == null ? void 0 : e.artifacts) || {}, r = !!(((l = t.download_pdf) == null ? void 0 : l.enabled) ?? ((o = u.pdf) == null ? void 0 : o.ready) ?? (e == null ? void 0 : e.pdf_ready) ?? (e == null ? void 0 : e.output_pdf_ready)), s = `${((f = t.download_pdf) == null ? void 0 : f.url) || ((p = u.pdf) == null ? void 0 : p.url) || (e == null ? void 0 : e.pdf_url) || ""}`.trim();
  return { pdfEnabled: r, pdf: s ? E(s) : "" };
}
function ce(e) {
  var t;
  return ((t = e == null ? void 0 : e.readerJobId) == null ? void 0 : t.call(e)) || "";
}
function de(e, {
  findReadyManifestArtifact: t = A,
  resolveManifestArtifactUrl: u = (r, s) => te(r, s, { findReadyManifestArtifact: t })
} = {}) {
  const r = u(e, "source_pdf");
  return r || t(e, "source_pdf");
}
function ie(e, t, {
  resolveJobActions: u = ne,
  findReadyManifestArtifact: r = A,
  resolveReaderArtifactUrl: s = re,
  resolveResourceUrl: l = E
} = {}) {
  const o = e ? u(e) : null;
  if (o != null && o.pdfEnabled && (o != null && o.pdf))
    return o.pdf;
  const f = ["pdf", "translated_pdf", "result_pdf"];
  for (const h of f) {
    const R = r(t, h), w = s(R, { resolveResourceUrl: l }) || s(R);
    if (w)
      return w;
  }
  const p = `${(e == null ? void 0 : e.workflow) || (e == null ? void 0 : e.job_type) || ""}`.trim().toLowerCase();
  return ((o == null ? void 0 : o.pdfEnabled) || `${(e == null ? void 0 : e.status) || ""}`.trim().toLowerCase() === "succeeded" && p !== "ocr") && (e != null && e.job_id) ? l(`/api/v1/jobs/${encodeURIComponent(e.job_id)}/pdf`) : "";
}
export {
  oe as __resetPdfjsForTests,
  ee as buildPdfDocumentOptions,
  I as createReaderDataPort,
  ue as defaultReaderDataPort,
  Re as extractReaderFormulaLatex,
  we as findReaderRegion,
  me as findReaderRegionByAssetUrl,
  he as findReaderRegionByCitation,
  _e as isStructuredReaderRegion,
  le as loadPdfDocument,
  Ue as normalizeReaderMetadata,
  ke as normalizeReaderRegions,
  ve as projectReaderRegion,
  ge as readerRegionContent,
  Me as readerRegionKind,
  Ee as readerRegionKindForRegion,
  De as regionBoxForPane,
  j as resolveReaderArtifactUrl,
  ce as resolveReaderJobId,
  Le as resolveReaderRegionHighlight,
  de as resolveReaderSourcePdf,
  ie as resolveReaderTranslatedPdfUrl
};
//# sourceMappingURL=data.js.map
