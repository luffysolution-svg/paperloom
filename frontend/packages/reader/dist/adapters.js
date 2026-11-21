import { h as R, l as i, n as v } from "./markdown-payload-kK3ewW_I.js";
const a = [
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
  "resolveMarkdownAssetUrl",
  "resolveReaderDownloadUrls",
  "resolveReaderDownloadName",
  "downloadProtectedResource",
  "failDownloadToast",
  "apiPrefix",
  "fetchDocumentByJobId",
  "createFavorite",
  "fetchFavorites",
  "deleteFavorite"
], t = [
  "resolveMarkdownAssetUrl",
  "resolveReaderDownloadUrls",
  "resolveReaderDownloadName",
  "downloadProtectedResource",
  "failDownloadToast",
  "fetchDocumentByJobId",
  "createFavorite",
  "fetchFavorites",
  "deleteFavorite"
];
let e = null;
function d(r) {
  e = r;
}
function l() {
  return e;
}
function s(r) {
  const o = e == null ? void 0 : e[r];
  if (o == null) throw new Error(`Reader adapter missing: ${String(r)} (call setReaderAdapters)`);
  return o;
}
export {
  a as READER_ADAPTER_KEYS,
  t as READER_REQUIRED_ADAPTER_KEYS,
  l as getReaderAdapters,
  R as hasMarkdownContent,
  i as loadMarkdownPayloadWithFallback,
  v as normalizeMarkdownPayload,
  s as requireAdapter,
  d as setReaderAdapters
};
//# sourceMappingURL=adapters.js.map
