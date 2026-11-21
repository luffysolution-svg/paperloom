// @retainpdf/reader — 包内运行时访问层（runtime access layer）。

import { getReaderAdapters, requireAdapter } from "./adapters.js";
import type { createReaderDataPort } from "./runtime/data.js";
import type { createReaderPageConfigPort } from "./runtime/config.js";
import type { ReaderPdfPort } from "./contracts/pdf.js";
import type { ReaderSessionDataPort } from "./contracts/session.js";
import {
  resolveReaderDownloadName as defaultResolveReaderDownloadName,
  resolveReaderDownloadUrls as defaultResolveReaderDownloadUrls,
} from "./shared/state/downloads/resolve.js";
import {
  createReaderServerFavoritesPort as createSharedReaderServerFavoritesPort,
} from "./shared/state/server-favorites-port.js";
import type { CreateServerFavoritesPortOptions } from "./shared/types/types.js";

// —— config / mock / messaging ——
export const isMockMode = (...args: any[]): boolean => (getReaderAdapters()?.isMockMode as any)?.(...args) ?? false;
export const MOCK_DOCUMENT_SOURCE_PDF_URL = "";
export const READER_DIALOG_MESSAGES = Object.freeze({
  progress: "retainpdf-reader-progress",
});

// —— job / http / vendor ——
export const resolveResourceUrl = (url: string): string =>
  getReaderAdapters()?.resolveResourceUrl?.(url) ?? url;
export const fetchProtected: typeof fetch = (...args: any[]) => {
  const impl = getReaderAdapters()?.fetchProtected ?? fetch;
  return (impl as (...a: any[]) => Promise<Response>)(...args);
};
export const resolvePdfjsVendorUrl = (relativePath = ""): string =>
  (getReaderAdapters()?.resolvePdfjsVendorUrl as any)?.(relativePath) ?? "";

// —— js/reader 共享 ports ——
type ReaderDataPort = ReturnType<typeof createReaderDataPort>;
type ReaderPageConfigPort = ReturnType<typeof createReaderPageConfigPort>;
const readDataPort = (): ReaderDataPort => requireAdapter("defaultReaderDataPort");
const readPageConfigPort = (): ReaderPageConfigPort =>
  requireAdapter("defaultReaderPageConfigPort");
export const defaultReaderDataPort: ReaderDataPort = {
  get apiPrefix(): string { return readDataPort().apiPrefix; },
  fetchProtected: (...args: Parameters<typeof fetch>) => readDataPort().fetchProtected(...args),
  loadMarkdownPayload: (jobId) => readDataPort().loadMarkdownPayload(jobId),
  loadMarkdownSource: (jobId) => readDataPort().loadMarkdownSource(jobId),
  loadMarkdownRange: (rawUrl, start, endInclusive, etag, signal) =>
    readDataPort().loadMarkdownRange(rawUrl, start, endInclusive, etag, signal),
  loadJobPayload: (jobId) => readDataPort().loadJobPayload(jobId),
  loadReaderPayload: (jobId, options) => readDataPort().loadReaderPayload(jobId, options),
  get liveTranslation() { return readDataPort().liveTranslation; },
};
export const defaultReaderPageConfigPort: ReaderPageConfigPort = {
  messageTargetOrigin: () => readPageConfigPort().messageTargetOrigin(),
  readerJobId: () => readPageConfigPort().readerJobId(),
};

export const readerLiveTranslation = () => getReaderAdapters()?.liveTranslation ?? null;
export const readerPdfPort = (): ReaderPdfPort => {
  const adapters = getReaderAdapters();
  return adapters?.pdf ?? {
    fetchProtected: adapters?.fetchProtected ?? adapters?.defaultReaderDataPort?.fetchProtected ?? fetch,
    resolvePdfjsVendorUrl: (relativePath = "") => adapters?.resolvePdfjsVendorUrl?.(relativePath) ?? "",
  };
};
export const readerSessionDataPort = (): ReaderSessionDataPort => {
  const adapters = getReaderAdapters();
  if (adapters?.sessionData) return adapters.sessionData;
  const data = adapters?.defaultReaderDataPort;
  if (!data) throw new Error("Reader adapter missing: defaultReaderDataPort (call setReaderAdapters)");
  return {
    loadReaderPayload: data.loadReaderPayload,
    loadJobPayload: data.loadJobPayload,
    fetchDocumentByJobId: (...args) => requireAdapter("fetchDocumentByJobId")(...args),
    fetchProtected: data.fetchProtected,
    resolveResourceUrl: adapters.resolveResourceUrl ?? ((url) => url),
    resolveReaderSourcePdf: (manifestPayload) => adapters.resolveReaderSourcePdf?.(manifestPayload) ?? null,
    resolveReaderTranslatedPdfUrl: (jobPayload, manifestPayload) => adapters.resolveReaderTranslatedPdfUrl?.(jobPayload, manifestPayload) ?? "",
    resolveReaderArtifactUrl: (item) => adapters.resolveReaderArtifactUrl?.(item) ?? "",
  };
};

export const resolveReaderAnchor = (...a: any[]) => getReaderAdapters()?.resolveReaderAnchor?.(...a) ?? null;
export const resolveReaderDocumentId = (): string => getReaderAdapters()?.resolveReaderDocumentId?.() ?? "";
export const resolveReaderJobId = (...a: any[]): string => (getReaderAdapters()?.resolveReaderJobId as any)?.(...a) ?? "";
export const resolveReaderArtifactUrl = (...a: any[]) => getReaderAdapters()?.resolveReaderArtifactUrl?.(...a) ?? "";
export const resolveReaderSourcePdf = (...a: any[]) => getReaderAdapters()?.resolveReaderSourcePdf?.(...a) ?? null;
export const resolveReaderTranslatedPdfUrl = (...a: any[]) => getReaderAdapters()?.resolveReaderTranslatedPdfUrl?.(...a) ?? "";
export { READER_PROGRESS_COPY } from "./shared/state/page-state.js";

// —— 下载 ——
export {
  READER_DOWNLOAD_ACTIONS,
  disabledReason as readerDownloadDisabledReason,
  trimString as trimReaderDownloadString,
} from "./shared/state/downloads/resolve.js";
export const resolveReaderDownloadName: typeof defaultResolveReaderDownloadName = (...args) =>
  getReaderAdapters()?.resolveReaderDownloadName?.(...args)
  ?? defaultResolveReaderDownloadName(...args);
export const resolveReaderDownloadUrls: typeof defaultResolveReaderDownloadUrls = (...args) =>
  getReaderAdapters()?.resolveReaderDownloadUrls?.(...args)
  ?? defaultResolveReaderDownloadUrls(...args);
export const downloadProtectedResource = (...args: Parameters<ReaderAdaptersDownloadResource>) =>
  requireAdapter("downloadProtectedResource")(...args);
export const failDownloadToast = (...args: Parameters<ReaderAdaptersFailToast>) =>
  requireAdapter("failDownloadToast")(...args);
type ReaderAdaptersDownloadResource = NonNullable<ReturnType<typeof getReaderAdapters>>["downloadProtectedResource"];
type ReaderAdaptersFailToast = NonNullable<ReturnType<typeof getReaderAdapters>>["failDownloadToast"];

// —— markdown ——
export const resolveMarkdownAssetUrl = (
  imagesBaseUrl: unknown,
  relativePath: unknown,
): string => requireAdapter("resolveMarkdownAssetUrl")(imagesBaseUrl, relativePath);
export { parseMarkdownWithMath } from "./shared/content/markdown-math.js";

// —— 服务端收藏 ——
export const API_PREFIX = "/api/v1";
export const fetchDocumentByJobId = (...args: [string, string]) =>
  requireAdapter("fetchDocumentByJobId")(...args);
export const fetchFavorites = (
  apiPrefix = API_PREFIX,
  options: { documentId?: string } = {},
) => requireAdapter("fetchFavorites")(
  getReaderAdapters()?.apiPrefix ?? apiPrefix,
  options,
);
export function createReaderServerFavoritesPort(options: CreateServerFavoritesPortOptions = {}) {
  const adapters = getReaderAdapters();
  return createSharedReaderServerFavoritesPort({
    apiPrefix: adapters?.apiPrefix ?? API_PREFIX,
    documentByJobId: (...args) => requireAdapter("fetchDocumentByJobId")(...args),
    submitFavorite: (...args) => requireAdapter("createFavorite")(...args),
    loadFavorites: (...args) => requireAdapter("fetchFavorites")(...args),
    removeFavorite: (...args) => requireAdapter("deleteFavorite")(...args),
    ...options,
  });
}
export { normalizeServerFavorite } from "./shared/state/server-favorites-port.js";
export type { ServerFavorite } from "./shared/types/types.js";
