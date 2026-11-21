import type { ReaderLiveTranslationPort } from "../../contracts/live-translation.js";
/** 没注入 = 宿主没有这个端点。返回 null 表示「还没有」，不是失败。 */
/** Markdown 原文的来源描述（来自 job detail artifacts.markdown）。 */
export type MarkdownSourceDescriptor = {
    rawUrl: string;
    totalBytes: number | null;
    imagesBaseUrl: string;
    etag?: string | null;
};
/** 一次 HTTP Range 拉取的结果（后端 ?raw=true 支持 206/Range）。 */
export type MarkdownRangeResult = {
    status: number;
    bytes: Uint8Array;
    totalBytes: number | null;
    /** Content-Range 的结束字节（含），供下一段 cursor = rangeEnd + 1 */
    rangeEnd: number | null;
    etag: string | null;
};
export declare function createReaderDataPort({ apiPrefix, loadJob, loadManifest, loadMarkdown, loadMarkdownDocument, loadMarkdownSource, fetchMarkdownRange, loadRegions, loadMetadata, fetchProtectedResource, liveTranslation, }?: {
    apiPrefix?: string;
    loadJob?: (jobId: string, apiPrefix: string) => Promise<unknown>;
    loadManifest?: (jobId: string, apiPrefix: string) => Promise<unknown>;
    loadMarkdown?: (jobId: string, apiPrefix: string) => Promise<unknown>;
    loadMarkdownDocument?: (jobId: string, apiPrefix: string) => Promise<unknown>;
    loadMarkdownSource?: ((jobId: string, apiPrefix: string) => Promise<MarkdownSourceDescriptor | null>) | null;
    fetchMarkdownRange?: ((rawUrl: string, start: number, endInclusive: number, etag?: string, signal?: AbortSignal) => Promise<MarkdownRangeResult>) | null;
    loadRegions?: (jobId: string, apiPrefix: string) => Promise<unknown>;
    loadMetadata?: (jobId: string, apiPrefix: string) => Promise<unknown>;
    /** agent 写的页面批注。**不跟着 loadReaderPayload 一起加载** —— 它会在阅读过程中
     * 被 agent 重写，需要轮询，而 payload 是一次性的。所以单独一个方法。
     * 文件不存在时返回 null（正常状态，不是错误）。 */
    fetchProtectedResource?: typeof fetch;
    liveTranslation?: ReaderLiveTranslationPort | null;
}): Readonly<{
    apiPrefix: string;
    fetchProtected: typeof fetch;
    loadMarkdownPayload: (jobId: string) => Promise<any>;
    loadMarkdownSource: (jobId: string) => Promise<MarkdownSourceDescriptor | null>;
    loadMarkdownRange: (rawUrl: string, start: number, endInclusive: number, etag?: string, signal?: AbortSignal) => Promise<MarkdownRangeResult>;
    loadJobPayload: (jobId: string) => Promise<unknown>;
    loadReaderPayload: (jobId: string, options?: {
        includeOptionalArtifacts?: boolean;
    }) => Promise<{
        readerMetadata: any;
        regionsPayload: {
            items: any[];
        };
        readerErrors: {
            regions: unknown;
            metadata: unknown;
        };
        jobPayload: unknown;
        manifestPayload: unknown;
    }>;
    loadReaderOptionalArtifacts: (jobId: string) => Promise<{
        readerMetadata: any;
        regionsPayload: {
            items: any[];
        };
        readerErrors: {
            regions: unknown;
            metadata: unknown;
        };
    }>;
    liveTranslation: ReaderLiveTranslationPort;
}>;
export declare const defaultReaderDataPort: Readonly<{
    apiPrefix: string;
    fetchProtected: typeof fetch;
    loadMarkdownPayload: (jobId: string) => Promise<any>;
    loadMarkdownSource: (jobId: string) => Promise<MarkdownSourceDescriptor | null>;
    loadMarkdownRange: (rawUrl: string, start: number, endInclusive: number, etag?: string, signal?: AbortSignal) => Promise<MarkdownRangeResult>;
    loadJobPayload: (jobId: string) => Promise<unknown>;
    loadReaderPayload: (jobId: string, options?: {
        includeOptionalArtifacts?: boolean;
    }) => Promise<{
        readerMetadata: any;
        regionsPayload: {
            items: any[];
        };
        readerErrors: {
            regions: unknown;
            metadata: unknown;
        };
        jobPayload: unknown;
        manifestPayload: unknown;
    }>;
    loadReaderOptionalArtifacts: (jobId: string) => Promise<{
        readerMetadata: any;
        regionsPayload: {
            items: any[];
        };
        readerErrors: {
            regions: unknown;
            metadata: unknown;
        };
    }>;
    liveTranslation: ReaderLiveTranslationPort;
}>;
//# sourceMappingURL=data-port.d.ts.map