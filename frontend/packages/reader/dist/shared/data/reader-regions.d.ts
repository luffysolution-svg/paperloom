import type { ReaderPaneId } from "../types/reader-dom.js";
export type ReaderRegionBox = {
    page: number;
    bbox: [number, number, number, number];
    unit: "pdf_point";
    origin: "top_left" | "bottom_left";
    text: string;
};
export type ReaderRegion = {
    itemId: string;
    source: ReaderRegionBox;
    translated: ReaderRegionBox;
    markdown: string;
    regionType: string;
    status: string;
    assetIds: string[];
    assetUrls: string[];
    /** 页内阅读顺序（后端已按 (页, 顺序) 排好；老后端没有这几项）。 */
    readingOrder?: number;
    /** document.v1 的 sub_type，词表随 provider 不同（见 reader-blocks.ts）。 */
    subType?: string;
    /** title = 1，heading = 2；只在标题块上有。 */
    headingLevel?: number;
    /** 同一段被拆成几块（跨页 / 跨栏）时共享的组 id。 */
    continuationGroupId?: string;
    /** 组内成员各自那一截译文；translated.text 在组内每个成员上都是整段。 */
    translatedBlockText?: string;
};
export type ReaderRegionKind = "formula" | "table" | "figure" | "text" | "region";
export type ReaderPageMetadata = {
    page: number;
    width: number;
    height: number;
};
export type ReaderDocumentMetadata = {
    pageCount: number;
    pages: ReaderPageMetadata[];
};
export type ReaderMetadata = {
    source: ReaderDocumentMetadata | null;
    translated: ReaderDocumentMetadata | null;
};
export type ReaderRegionHighlight = {
    itemId: string;
    region: ReaderRegion;
    box: ReaderRegionBox;
    pageSize: ReaderPageMetadata;
};
export type ReaderRegionRect = {
    left: number;
    top: number;
    width: number;
    height: number;
};
/**
 * 接口响应（`{ items: [...] }`，可带 `{ data }` 信封）→ ReaderRegion[]。
 *
 * 必须幂等：宿主的 loadSessionSnapshot 已经归一化过一次，session-assets 又会再调一次。
 * 以前这里只认 `{ items }`，第二次拿到的是数组，直接返回空 —— 阅读器里的内容块数恒为 0，
 * 悬停红框、整块复制、点块浮条全部失效（接口明明返回了 875 块）。
 */
export declare function normalizeReaderRegions(payload: unknown): ReaderRegion[];
export declare function readerRegionKind(regionType: string): ReaderRegionKind;
export declare function readerRegionKindForRegion(region: ReaderRegion): ReaderRegionKind;
export declare function isStructuredReaderRegion(region: ReaderRegion): boolean;
export declare function readerRegionContent(region: ReaderRegion, pane: ReaderPaneId): string;
/**
 * 悬停「复制」写进剪贴板的内容。
 * - 译文栏没有译文（公式、保留原文的块）时退回原文 —— 右栏这时显示的就是原文；
 * - 行间公式给 LaTeX（去掉 `$$` 包裹），和浮条里「复制 LaTeX」一致；
 * - 正文里的行内公式本来就是 `$m$` 这种写法，原样保留。
 */
export declare function readerRegionCopyText(region: ReaderRegion, pane: ReaderPaneId): string;
export declare function extractReaderFormulaLatex(value: string): string;
export declare function normalizeReaderMetadata(payload: unknown): ReaderMetadata;
export declare function findReaderRegion(regions: readonly ReaderRegion[], blockId: string | null | undefined): ReaderRegion | null;
type ReaderCitationTarget = {
    block_id?: string;
    page_idx?: number;
    page?: number;
    snippet?: string;
};
/**
 * Resolve legacy Markdown fallback citations (md-xxxx, no page_idx) against
 * the structured region layer. The same region coordinates work for source
 * and translated PDFs, so one match restores navigation in either pane.
 */
export declare function findReaderRegionByCitation(regions: readonly ReaderRegion[], citation: ReaderCitationTarget | null | undefined): ReaderRegion | null;
/** Match an AI-rendered image back to its structured PDF region. */
export declare function findReaderRegionByAssetUrl(regions: readonly ReaderRegion[], assetUrl: string | null | undefined, page?: number | null): ReaderRegion | null;
export declare function regionBoxForPane(region: ReaderRegion, pane: ReaderPaneId): ReaderRegionBox;
export declare function resolveReaderRegionHighlight(region: ReaderRegion | null | undefined, metadata: ReaderMetadata | null | undefined, pane: ReaderPaneId): ReaderRegionHighlight | null;
export declare function projectReaderRegion(highlight: ReaderRegionHighlight | null | undefined, renderedWidth: number, renderedHeight: number): ReaderRegionRect | null;
export {};
//# sourceMappingURL=reader-regions.d.ts.map