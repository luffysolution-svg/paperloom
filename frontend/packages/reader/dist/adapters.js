import { s as t, a, r as s } from "./answer-enhance-DShVYmyb.js";
import { h as u, l as A, n as P } from "./markdown-payload-kK3ewW_I.js";
const l = [
  "isMockMode",
  "resolveResourceUrl",
  "fetchProtected",
  "resolvePdfjsVendorUrl",
  "defaultReaderDataPort",
  "defaultReaderPageConfigPort",
  "resolveReaderAnchor",
  "resolveReaderDocumentId",
  "resolveReaderJobId",
  "resolveReaderArtifactUrl",
  "resolveReaderSourcePdf",
  "resolveReaderTranslatedPdfUrl",
  "liveTranslation",
  "pdf",
  "sessionData",
  "aiOperations",
  "conversations",
  "askChat",
  "resolveMarkdownAssetUrl",
  "resolveReaderDownloadUrls",
  "resolveReaderDownloadName",
  "downloadProtectedResource",
  "failDownloadToast",
  "apiPrefix",
  "fetchDocumentByJobId",
  "createFavorite",
  "fetchFavorites",
  "deleteFavorite",
  "credentialsPort",
  "askDocumentAi"
], n = [
  "resolveMarkdownAssetUrl",
  "resolveReaderDownloadUrls",
  "resolveReaderDownloadName",
  "downloadProtectedResource",
  "failDownloadToast",
  "fetchDocumentByJobId",
  "createFavorite",
  "fetchFavorites",
  "deleteFavorite",
  "credentialsPort",
  "askDocumentAi"
];
let r = null;
function c(e) {
  r = e, t({ credentialsPort: (e == null ? void 0 : e.credentialsPort) ?? null }), s(), e && a({
    fetchProtected: e.fetchProtected,
    resolveResourceUrl: e.resolveResourceUrl
  });
}
function i() {
  return r;
}
function R(e) {
  const o = r == null ? void 0 : r[e];
  if (o == null) throw new Error(`Reader adapter missing: ${String(e)} (call setReaderAdapters)`);
  return o;
}
export {
  l as READER_ADAPTER_KEYS,
  n as READER_REQUIRED_ADAPTER_KEYS,
  i as getReaderAdapters,
  u as hasMarkdownContent,
  A as loadMarkdownPayloadWithFallback,
  P as normalizeMarkdownPayload,
  R as requireAdapter,
  c as setReaderAdapters
};
//# sourceMappingURL=adapters.js.map
