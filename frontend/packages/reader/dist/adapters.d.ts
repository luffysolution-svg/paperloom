import type { createReaderDataPort } from "./runtime/data.js";
import type { createReaderPageConfigPort } from "./runtime/config.js";
import type { FavoriteApiRecord, ServerFavoriteRaw } from "./shared/types/types.js";
import type { ReaderLiveTranslationPort } from "./contracts/live-translation.js";
import type { ReaderPdfPort } from "./contracts/pdf.js";
import type { ReaderSessionDataPort } from "./contracts/session.js";
export { hasMarkdownContent, loadMarkdownPayloadWithFallback, normalizeMarkdownPayload, } from "./shared/data/markdown-payload.js";
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
    downloadProtectedResource: (fetchProtected: typeof fetch, url: string, fallbackName: string, preferredName?: string, onStatus?: ((status: unknown) => void) | null, onBusy?: ((busy: boolean, status?: string) => void) | null) => Promise<unknown>;
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
    fetchFavorites: (apiPrefix: string, options?: {
        documentId?: string;
    }) => Promise<{
        favorites?: ServerFavoriteRaw[];
    }>;
    deleteFavorite: (apiPrefix: string, favoriteId: string) => Promise<unknown>;
};
export type ReaderAdapters = ReaderSessionAdapters & ReaderMarkdownAdapters & ReaderDownloadAdapters & ReaderFavoritesAdapters;
export declare const READER_ADAPTER_KEYS: readonly ["isMockMode", "resolveResourceUrl", "fetchProtected", "resolvePdfjsVendorUrl", "defaultReaderDataPort", "defaultReaderPageConfigPort", "resolveReaderAnchor", "resolveReaderDocumentId", "resolveReaderJobId", "resolveReaderArtifactUrl", "resolveReaderSourcePdf", "resolveReaderTranslatedPdfUrl", "liveTranslation", "pdf", "sessionData", "resolveMarkdownAssetUrl", "resolveReaderDownloadUrls", "resolveReaderDownloadName", "downloadProtectedResource", "failDownloadToast", "apiPrefix", "fetchDocumentByJobId", "createFavorite", "fetchFavorites", "deleteFavorite"];
export declare const READER_REQUIRED_ADAPTER_KEYS: readonly ["resolveMarkdownAssetUrl", "resolveReaderDownloadUrls", "resolveReaderDownloadName", "downloadProtectedResource", "failDownloadToast", "fetchDocumentByJobId", "createFavorite", "fetchFavorites", "deleteFavorite"];
export declare function setReaderAdapters(a: ReaderAdapters | null): void;
export declare function getReaderAdapters(): ReaderAdapters | null;
export declare function requireAdapter<T extends keyof ReaderAdapters>(key: T): NonNullable<ReaderAdapters[T]>;
//# sourceMappingURL=adapters.d.ts.map