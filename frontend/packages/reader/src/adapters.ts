import type { createReaderDataPort } from "./runtime/data.js";
import type { createReaderPageConfigPort } from "./runtime/config.js";
import type {
  FavoriteApiRecord,
  ServerFavoriteRaw,
} from "./shared/types/types.js";
import type { ReaderLiveTranslationPort } from "./contracts/live-translation.js";
import type { ReaderPdfPort } from "./contracts/pdf.js";
import type { ReaderSessionDataPort } from "./contracts/session.js";
export {
  hasMarkdownContent,
  loadMarkdownPayloadWithFallback,
  normalizeMarkdownPayload,
} from "./shared/data/markdown-payload.js";

// frontend/packages/reader 对宿主环境的唯一契约
export type ReaderSessionAdapters = {
  isMockMode?: () => boolean;
  resolveResourceUrl?: (url: string) => string;
  fetchProtected?: typeof fetch;
  resolvePdfjsVendorUrl?: (relativePath?: string) => string;
  defaultReaderDataPort?: ReturnType<typeof createReaderDataPort>;
  defaultReaderPageConfigPort?: ReturnType<typeof createReaderPageConfigPort>;
  resolveReaderAnchor?: (...args: any[]) => any;
  resolveReaderDocumentId?: () => string;
  resolveReaderJobId?: () => string;
  resolveReaderArtifactUrl?: (...args: any[]) => string;
  resolveReaderSourcePdf?: (...args: any[]) => any;
  resolveReaderTranslatedPdfUrl?: (...args: any[]) => string;
  liveTranslation?: ReaderLiveTranslationPort;
  pdf?: ReaderPdfPort;
  sessionData?: ReaderSessionDataPort;
};
export type ReaderMarkdownAdapters = {
  resolveMarkdownAssetUrl: (imagesBaseUrl: unknown, relativePath: unknown) => string;
};
export type ReaderDownloadContext = {
  jobId?: string;
  jobPayload?: unknown;
  manifestPayload?: unknown;
};
export type ReaderDownloadUrls = {
  source: string;
  sideBySide: string;
  translated: string;
};
export type ReaderDownloadAdapters = {
  resolveReaderDownloadUrls: (context?: ReaderDownloadContext) => ReaderDownloadUrls;
  resolveReaderDownloadName: (action: string, context: ReaderDownloadContext) => string;
  downloadProtectedResource: (
    fetchProtected: typeof fetch,
    url: string,
    fallbackName: string,
    preferredName?: string,
    onStatus?: ((status: unknown) => void) | null,
    onBusy?: ((busy: boolean, status?: string) => void) | null,
  ) => Promise<unknown>;
  failDownloadToast: (message?: string) => void;
};
export type ReaderFavoritesAdapters = {
  apiPrefix?: string;
  fetchDocumentByJobId: (apiPrefix: string, jobId: string) => Promise<{
    document_id?: string;
    active_job_id?: string | null;
    active_version_id?: string | null;
  } | null>;
  createFavorite: (apiPrefix: string, payload: Record<string, unknown>) => Promise<FavoriteApiRecord>;
  fetchFavorites: (apiPrefix: string, options?: { documentId?: string }) => Promise<{ favorites?: ServerFavoriteRaw[] }>;
  deleteFavorite: (apiPrefix: string, favoriteId: string) => Promise<unknown>;
};
export type ReaderAdapters = ReaderSessionAdapters
  & ReaderMarkdownAdapters
  & ReaderDownloadAdapters
  & ReaderFavoritesAdapters;

export const READER_ADAPTER_KEYS = [
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
  "deleteFavorite",
] as const satisfies readonly (keyof ReaderAdapters)[];

export const READER_REQUIRED_ADAPTER_KEYS = [
  "resolveMarkdownAssetUrl",
  "resolveReaderDownloadUrls",
  "resolveReaderDownloadName",
  "downloadProtectedResource",
  "failDownloadToast",
  "fetchDocumentByJobId",
  "createFavorite",
  "fetchFavorites",
  "deleteFavorite",
] as const satisfies readonly (keyof ReaderAdapters)[];

type RequiredAdapterKey = {
  [K in keyof ReaderAdapters]: undefined extends ReaderAdapters[K] ? never : K;
}[keyof ReaderAdapters];

const _adapterKeysComplete: Exclude<
  keyof ReaderAdapters,
  (typeof READER_ADAPTER_KEYS)[number]
> extends never ? true : false = true;
const _requiredKeysCovered: Exclude<
  RequiredAdapterKey,
  (typeof READER_REQUIRED_ADAPTER_KEYS)[number]
> extends never ? true : false = true;
void _adapterKeysComplete;
void _requiredKeysCovered;

let _adapters: ReaderAdapters | null = null;
export function setReaderAdapters(a: ReaderAdapters | null) {
  _adapters = a;
}
export function getReaderAdapters(): ReaderAdapters | null { return _adapters; }
export function requireAdapter<T extends keyof ReaderAdapters>(key: T): NonNullable<ReaderAdapters[T]> {
  const v = _adapters?.[key];
  if (v == null) throw new Error(`Reader adapter missing: ${String(key)} (call setReaderAdapters)`);
  return v as NonNullable<ReaderAdapters[T]>;
}
