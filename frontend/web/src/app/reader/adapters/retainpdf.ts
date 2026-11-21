// RetainPDF 宿主对 @retainpdf/reader 的适配实现 — 将 frontend/web 的 external 真值注入 frontend/packages/reader 的 adapters
import * as ext from "../external.js";
import { setReaderAdapters } from "@retainpdf/reader/adapters";
import type { ReaderAdapters } from "@retainpdf/reader/adapters";

const adapters: ReaderAdapters = {
  // —— session ——
  isMockMode: ext.isMockMode,
  resolveResourceUrl: ext.resolveResourceUrl,
  fetchProtected: ext.fetchProtected,
  resolvePdfjsVendorUrl: ext.resolvePdfjsVendorUrl,
  defaultReaderDataPort: ext.defaultReaderDataPort,
  liveTranslation: ext.liveTranslationPort,
  pdf: ext.pdfPort,
  sessionData: ext.sessionDataPort,
  defaultReaderPageConfigPort: ext.defaultReaderPageConfigPort,
  resolveReaderAnchor: ext.resolveReaderAnchor,
  resolveReaderDocumentId: ext.resolveReaderDocumentId,
  resolveReaderJobId: ext.resolveReaderJobId,
  resolveReaderArtifactUrl: ext.resolveReaderArtifactUrl,
  resolveReaderSourcePdf: ext.resolveReaderSourcePdf,
  resolveReaderTranslatedPdfUrl: ext.resolveReaderTranslatedPdfUrl,
  // —— markdown ——
  resolveMarkdownAssetUrl: ext.resolveMarkdownAssetUrl,
  // —— downloads ——
  resolveReaderDownloadUrls: ext.resolveReaderDownloadUrls,
  resolveReaderDownloadName: ext.resolveReaderDownloadName,
  downloadProtectedResource: ext.downloadProtectedResource,
  failDownloadToast: ext.failDownloadToast,
  // —— favorites ——
  apiPrefix: ext.API_PREFIX,
  fetchDocumentByJobId: ext.fetchDocumentByJobId,
  createFavorite: ext.createFavorite,
  fetchFavorites: ext.fetchFavorites,
  deleteFavorite: ext.deleteFavorite,
};
setReaderAdapters(adapters);
export { adapters as retainPdfReaderAdapters };
export { ext as retainPdfExternal };
