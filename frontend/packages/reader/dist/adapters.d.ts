import type { createReaderDataPort } from "./runtime/data.js";
import type { createReaderPageConfigPort } from "./runtime/config.js";
import type { FavoriteApiRecord, ServerFavoriteRaw } from "./shared/types/types.js";
import type { askLibraryAi } from "@retainpdf/api/ai";
import type { ReaderLiveTranslationPort } from "./contracts/live-translation.js";
import type { ReaderPdfPort } from "./contracts/pdf.js";
import type { ReaderSessionDataPort } from "./contracts/session.js";
import type { ReaderAgentOperationPort } from "./contracts/ai-operations.js";
import type { ReaderConversationPort } from "./contracts/conversations.js";
import type { ReaderAskPort } from "./contracts/ai-chat.js";
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
    /** Optional during migration; hosts without live translation remain supported. */
    liveTranslation?: ReaderLiveTranslationPort;
    /** Optional during migration; legacy flat fields remain supported. */
    pdf?: ReaderPdfPort;
    /** Optional during migration; legacy data/runtime fields remain supported. */
    sessionData?: ReaderSessionDataPort;
    /** Optional during migration; assistant operation UI uses an unavailable fallback. */
    aiOperations?: ReaderAgentOperationPort;
    /** Optional during migration; legacy conversation exports remain available. */
    conversations?: ReaderConversationPort;
    /** Optional during migration; assistant displays the existing unavailable state without it. */
    askChat?: ReaderAskPort;
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
export type ReaderCredentialsPort = {
    getCredentials?: () => {
        modelApiKey?: string;
    } | null;
};
export type ReaderCredentialsAdapters = {
    credentialsPort: ReaderCredentialsPort;
};
export type ReaderAiAdapters = {
    /** Canonical /ai/ask client supplied by the host (SSE + credentials). */
    askDocumentAi: (options: Parameters<typeof askLibraryAi>[0]) => ReturnType<typeof askLibraryAi>;
};
export type ReaderAdapters = ReaderSessionAdapters & ReaderMarkdownAdapters & ReaderDownloadAdapters & ReaderFavoritesAdapters & ReaderCredentialsAdapters & ReaderAiAdapters;
/**
 * ReaderAdapters 声明键的运行时镜像（TS 类型在运行时被擦除）。
 * 注册层与门禁测试共用，避免手工复制字段集漂移；`satisfies` 保证不引入拼错键。
 * 完整性由紧随其后的编译期断言守护。
 */
export declare const READER_ADAPTER_KEYS: readonly ["isMockMode", "resolveResourceUrl", "fetchProtected", "resolvePdfjsVendorUrl", "defaultReaderDataPort", "defaultReaderPageConfigPort", "resolveReaderAnchor", "resolveReaderDocumentId", "resolveReaderJobId", "resolveReaderArtifactUrl", "resolveReaderSourcePdf", "resolveReaderTranslatedPdfUrl", "liveTranslation", "pdf", "sessionData", "aiOperations", "conversations", "askChat", "resolveMarkdownAssetUrl", "resolveReaderDownloadUrls", "resolveReaderDownloadName", "downloadProtectedResource", "failDownloadToast", "apiPrefix", "fetchDocumentByJobId", "createFavorite", "fetchFavorites", "deleteFavorite", "credentialsPort", "askDocumentAi"];
/** 必填（非 `?`）适配键子集，供门禁断言最小注入面。 */
export declare const READER_REQUIRED_ADAPTER_KEYS: readonly ["resolveMarkdownAssetUrl", "resolveReaderDownloadUrls", "resolveReaderDownloadName", "downloadProtectedResource", "failDownloadToast", "fetchDocumentByJobId", "createFavorite", "fetchFavorites", "deleteFavorite", "credentialsPort", "askDocumentAi"];
export declare function setReaderAdapters(a: ReaderAdapters | null): void;
export declare function getReaderAdapters(): ReaderAdapters | null;
export declare function requireAdapter<T extends keyof ReaderAdapters>(key: T): NonNullable<ReaderAdapters[T]>;
//# sourceMappingURL=adapters.d.ts.map