export { copyReaderText } from "../shared/utils/clipboard.js";
import { type ReaderRegionHighlight, type ReaderRegionRect } from "../shared/data/reader-regions.js";
export type ReaderTextHoverTarget = {
    itemId: string;
    highlight: ReaderRegionHighlight;
    rect: ReaderRegionRect;
};
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
export declare function ReaderTextHoverLayer({ target, pane, revisedCount, }: {
    target: ReaderTextHoverTarget | null;
    pane?: "source" | "translated";
    /** 这一块改过几次（精修、手改、助手改）；只在译文栏提示。 */
    revisedCount?: number;
}): import("react").JSX.Element;
//# sourceMappingURL=ReaderTextHoverLayer.d.ts.map