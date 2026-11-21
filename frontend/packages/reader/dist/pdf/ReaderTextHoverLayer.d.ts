export { copyReaderText } from "../shared/utils/clipboard.js";
import { type ReaderRegion, type ReaderRegionHighlight, type ReaderRegionRect } from "../shared/data/reader-regions.js";
export type ReaderTextHoverTarget = {
    itemId: string;
    highlight: ReaderRegionHighlight;
    rect: ReaderRegionRect;
};
export type ReaderReferencePreview = {
    itemId: string;
    label: string;
    text: string;
    page: number;
};
export type ReaderReferenceIndex = ReadonlyMap<string, readonly ReaderRegion[]>;
export declare function projectReaderTextHoverTargets(regions: readonly ReaderRegionHighlight[], width: number, height: number): ReaderTextHoverTarget[];
export declare function hitTestReaderTextHoverTarget(targets: readonly ReaderTextHoverTarget[], x: number, y: number): ReaderTextHoverTarget | null;
export declare const READER_TEXT_HOVER_COPY_CLASS = "reader-text-hover-copy";
export declare const READER_TEXT_HOVER_ID_CLASS = "reader-text-hover-id";
export declare const READER_TEXT_HOVER_TOOLS_CLASS = "reader-text-hover-tools";
/** 工具条（编号 + 复制）大约占的尺寸：放进框内放不下时才挪到框外上方。 */
export declare const HOVER_TOOLS_HEIGHT = 26;
export declare const HOVER_TOOLS_WIDTH = 250;
/**
 * 工具条放哪：一般的块放在框内右上角 —— 它就在块的命中范围里，鼠标走过去不会换块，
 * 也不盖住上一块。框太矮或太窄（行间公式常常只有一行高）放不下时才挪到框外上方。
 */
export declare function hoverToolsOutside(rect: ReaderRegionRect, toolsWidth?: number): boolean;
export declare function extractReaderCitationLabels(text: string): string[];
type ReaderAuthorYearCitation = {
    key: string;
    label: string;
};
export declare function extractReaderAuthorYearCitations(text: string): ReaderAuthorYearCitation[];
export declare function buildReaderReferenceIndex(references: readonly ReaderRegion[]): ReaderReferenceIndex;
export declare function findReaderReferencePreview(target: ReaderTextHoverTarget, references?: readonly ReaderRegion[]): ReaderReferencePreview | null;
export declare function findReaderReferencePreviews(target: ReaderTextHoverTarget, referenceIndex: ReaderReferenceIndex, citationLabel?: string | null, citationDisplayLabel?: string | null): ReaderReferencePreview[];
/**
 * 悬停内容块：红色虚线框 + 翻译编号 + 「复制」（行间公式是「复制 LaTeX」）。
 *
 * 对照阅读时左右两栏一起画（悬停的 itemId 由 ReaderCompareGrid 共享），左栏复制原文、
 * 右栏复制译文 —— 这是 4.1.x 旧引擎里最常用的那个交互，React 引擎替换时丢了。
 * 只有这一种块级交互：双击 / 三击留给浏览器选词选段（以前双击会整块复制，把选词弄坏了）。
 */
export declare function ReaderTextHoverLayer({ target, pane, revisedCount, referenceIndex, referenceRegions, citationLabel, citationDisplayLabel, citationRect, onReferenceClick, }: {
    target: ReaderTextHoverTarget | null;
    pane?: "source" | "translated";
    /** 这一块改过几次（精修、手改、助手改）；只在译文栏提示。 */
    revisedCount?: number;
    referenceIndex?: ReaderReferenceIndex;
    referenceRegions?: readonly ReaderRegion[];
    citationLabel?: string | null;
    citationDisplayLabel?: string | null;
    citationRect?: ReaderRegionRect | null;
    onReferenceClick?: (itemId: string) => void;
}): import("react").JSX.Element;
//# sourceMappingURL=ReaderTextHoverLayer.d.ts.map