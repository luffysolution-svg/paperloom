import type { ReactElement } from "react";
import type { ReactNode } from "react";
import type { ProtectedPdfFile } from "../../pdf/useProtectedPdfFile.js";
import type { PageRowHeights } from "../../pdf/usePageRowSync.js";
import { type ReaderMetadata, type ReaderRegion, type ReaderRegionSelection } from "../../shared/data/reader-regions.js";
import type { LiveTranslationState } from "../../shared/data/live-translation-state.js";
import type { ReaderPaneComposition } from "../../ReaderAppReactPdf.js";
export type ReaderCompareGridProps = {
    mode?: string;
    /** 以下 controller 透传值缺省时从 reader context 取 */
    bindShell?: (node: HTMLDivElement | null) => void;
    shellEl?: HTMLElement | null;
    userZoom?: number;
    compareMode?: boolean;
    /** 阅读区全宽（shell），用于 zoom% 相对整屏计算 */
    shellWidth?: number;
    rowHeights?: PageRowHeights;
    mountSource?: boolean;
    mountTranslated?: boolean;
    showSource?: boolean;
    showTranslated?: boolean;
    /** 「无可并排的最终译文」；仅决定源文件缺失文案，不是 FAB 的 sourceOnly */
    sourceViewOnly?: boolean;
    sourceUrl?: string;
    translatedUrl?: string;
    sourceFile?: ProtectedPdfFile | null;
    translatedFile?: ProtectedPdfFile | null;
    onMetrics?: () => void;
    onNumPagesChange?: (pages: number, pane: "source" | "translated") => void;
    activeRegion?: ReaderRegion | null;
    regions?: ReaderRegion[];
    readerMetadata?: ReaderMetadata | null;
    onSelectRegion?: (selection: ReaderRegionSelection) => void;
    markdownSplit?: boolean;
    assistantSplit?: boolean;
    liveTranslation?: LiveTranslationState;
    /** 源栏右上角动作（如「译文」叠加开关）；挂在 pane="source" 容器内。 */
    sourcePaneAction?: ReactNode;
    /**
     * 单一真值：是否把流式实时译文叠加到原文 PDF 上。
     * 仅当实时译文可用（最终译文 PDF 未就绪）时为 true；就绪后恒为 false。
     */
    overlayOnSource?: boolean;
    /**
     * 可见台面判别联合（单一真源）。提供时覆盖 mode/compareMode/
     * showSource/showTranslated/overlayOnSource 这几个散落输入。
     */
    paneComposition?: ReaderPaneComposition;
};
export declare function resolveReaderGridPresentation({ mode, compareMode, showSource, showTranslated, markdownSplit, overlayOnSource, }: Pick<ReaderCompareGridProps, "mode" | "compareMode" | "showSource" | "showTranslated"> & {
    markdownSplit: boolean;
    overlayOnSource?: boolean;
}): {
    mode: string;
    compareMode: boolean;
    showSource: boolean;
    showTranslated: boolean;
};
export declare function resolveReaderPageWidthBasis(shellWidth: number, sidePanelSplit: boolean, viewportWidth?: number): number;
export declare function liveTranslationPendingCopy(state: LiveTranslationState | undefined): string;
export declare function ReaderCompareGrid(props: ReaderCompareGridProps): ReactElement;
//# sourceMappingURL=ReaderCompareGrid.d.ts.map