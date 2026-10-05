/**
 * Reader-owned live-translation wire DTOs and host transport port.
 *
 * The Web host owns HTTP/authentication/SSE implementation. Reader consumes
 * these structural contracts and never imports an API-client error or URL.
 */
export type ReaderLiveTranslationTypography = {
    font_family?: string;
    font_size_pt?: number;
    leading_em?: number;
    font_weight?: string | number;
    text_align?: "left" | "center" | "right" | "justify" | string;
    padding_top_pt?: number;
    padding_right_pt?: number;
    padding_bottom_pt?: number;
    padding_left_pt?: number;
    fit_min_font_size_pt?: number;
    fit_max_font_size_pt?: number;
};
export type ReaderLiveTranslationLayoutBlock = {
    item_id: string;
    bbox: [number, number, number, number];
    source_text: string;
    kind: string;
    typography?: ReaderLiveTranslationTypography;
};
export type ReaderLiveTranslationLayoutPage = {
    page_idx: number;
    width: number;
    height: number;
    blocks: ReaderLiveTranslationLayoutBlock[];
};
export type ReaderLiveTranslationLayout = {
    pages: ReaderLiveTranslationLayoutPage[];
};
export type ReaderLiveTranslationItem = {
    item_id: string;
    translated_text: string;
    status: string;
};
export type ReaderLiveTranslationPageSnapshot = {
    attempt: number;
    generation: number;
    page_idx: number;
    page_hash: string;
    items: ReaderLiveTranslationItem[];
};
export type ReaderLiveTranslationCommitEvent = {
    event: "translation_units_committed";
    seq: number;
    attempt: number;
    generation: number;
    page_idx: number;
    page_hash: string;
    changed_item_ids: string[];
};
export type ReaderTransportError = Error & {
    code?: string;
    status?: number;
};
export declare function isReaderTransportError(error: unknown): error is ReaderTransportError;
export declare function createReaderTransportError(message: string, status?: number, code?: string): ReaderTransportError;
export type ReaderLiveTranslationRequestOptions = {
    signal?: AbortSignal;
};
export type ReaderLiveTranslationStreamOptions = ReaderLiveTranslationRequestOptions & {
    afterSeq?: number;
    onEvent: (event: ReaderLiveTranslationCommitEvent) => void | Promise<void>;
};
export type ReaderLiveTranslationPort = {
    fetchLayout: (jobId: string, options?: ReaderLiveTranslationRequestOptions) => Promise<ReaderLiveTranslationLayout>;
    fetchPage: (jobId: string, pageIdx: number, options?: ReaderLiveTranslationRequestOptions) => Promise<ReaderLiveTranslationPageSnapshot>;
    streamEvents: (jobId: string, options: ReaderLiveTranslationStreamOptions) => Promise<void>;
};
//# sourceMappingURL=live-translation.d.ts.map