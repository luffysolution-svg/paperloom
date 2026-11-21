// RetainPDF Web 宿主能力出口（host capability exit）：方向是 Web → 包。

// —— config / mock / messaging ——
export { isMockMode } from "@/platform/config/runtime.js";
export { MOCK_DOCUMENT_SOURCE_PDF_URL } from "@/platform/mock/documents.js";
export { READER_DIALOG_MESSAGES } from "@/features/reader/domain.js";

// —— job / http / vendor ——
export { resolveResourceUrl } from "@retainpdf/domain/job";
export { fetchProtected } from "@/features/reader/domain.js";
export {
  resolvePdfjsVendorUrl,
  resolveMarkedVendorUrl,
} from "@/platform/runtime/vendor-url.js";

// —— Reader 宿主 ports ——
export { defaultReaderDataPort, liveTranslationPort, pdfPort, sessionDataPort } from "@/features/reader/domain.js";
export {
  defaultReaderPageConfigPort,
  resolveReaderAnchor,
  resolveReaderDocumentId,
  resolveReaderJobId,
} from "@/features/reader/domain.js";
export { resolveReaderArtifactUrl } from "@/features/reader/domain.js";
export {
  resolveReaderSourcePdf,
  resolveReaderTranslatedPdfUrl,
} from "@/features/reader/domain.js";
export { READER_PROGRESS_COPY } from "@/features/reader/domain.js";

// —— 下载解析 / 受保护下载 ——
export {
  READER_DOWNLOAD_ACTIONS,
  disabledReason as readerDownloadDisabledReason,
  resolveReaderDownloadName,
  resolveReaderDownloadUrls,
  trimString as trimReaderDownloadString,
} from "@/features/reader/domain.js";
export { downloadProtectedResource } from "@/features/reader/domain.js";
export { failDownloadToast } from "@/platform/utils/download-feedback.js";

// —— markdown 面板 ——
export { resolveMarkdownAssetUrl } from "@retainpdf/domain/job";
export { parseMarkdownWithMath } from "@/features/reader/domain.js";

// —— 服务端收藏面板 ——
export { API_PREFIX } from "@/platform/config/api-constants.js";
export { fetchDocumentByJobId } from "@/platform/api/index.js";
export {
  createFavorite,
  deleteFavorite,
  fetchFavorites,
} from "@/platform/api/index.js";
export {
  createReaderServerFavoritesPort,
  normalizeServerFavorite,
} from "@/features/reader/domain.js";
export type { ServerFavorite } from "@/features/reader/domain.js";
