// RetainPDF 宿主对 @retainpdf/reader 的适配实现 — 将 frontend/web 的 external 真值注入 frontend/packages/reader 的 adapters
import * as ext from "../external.js";
import { setReaderAdapters } from "@retainpdf/reader/adapters";
import type { ReaderAdapters } from "@retainpdf/reader/adapters";

// external.ts 是 MPA 宿主能力的单一出口。这里只显式列出 ReaderAdapters
// 声明的字段：过去的 `...ext` 会把未声明的导出静默带入运行时对象，
// 一旦包契约增删字段无法在类型层暴露。逐字段映射可让漏接/错配立即报错。
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
  aiOperations: ext.aiOperationsPort,
  conversations: ext.conversationPort,
  askChat: ext.askChatPort,
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
  // —— credentials ——
  credentialsPort: ext.defaultCredentialsStatePort,
  // —— AI ——
  askDocumentAi: ext.askLibraryAi,
};
setReaderAdapters(adapters);
export { adapters as retainPdfReaderAdapters };
export { ext as retainPdfExternal };
