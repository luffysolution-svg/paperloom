import type { LiveTranslationCommitEvent, LiveTranslationLayout, LiveTranslationPageSnapshot } from "@retainpdf/contracts/reader-data";
export type { LiveTranslationCommitEvent, LiveTranslationItem, LiveTranslationLayout, LiveTranslationLayoutBlock, LiveTranslationLayoutPage, LiveTranslationPageSnapshot, LiveTranslationTypography, } from "@retainpdf/contracts/reader-data";
export type LiveTranslationRequestOptions = {
    apiPrefix?: string;
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
};
export declare class LiveTranslationApiError extends Error {
    status: number;
    code: string;
    constructor(message: string, status: number, code?: string);
}
export declare function fetchLiveTranslationLayout(jobId: string, options?: LiveTranslationRequestOptions): Promise<LiveTranslationLayout>;
export declare function fetchLiveTranslationPage(jobId: string, pageIdx: number, options?: LiveTranslationRequestOptions): Promise<LiveTranslationPageSnapshot>;
export type StreamLiveTranslationOptions = LiveTranslationRequestOptions & {
    afterSeq?: number;
    onEvent: (event: LiveTranslationCommitEvent) => void | Promise<void>;
};
/** Authenticated fetch-based SSE reader. Resolves only when the stream closes. */
export declare function streamLiveTranslationEvents(jobId: string, options: StreamLiveTranslationOptions): Promise<void>;
