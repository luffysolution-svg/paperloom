import { type ReaderPaneId } from "./reader-dom-contract.js";
import { type ReaderRegionHighlight, type ReaderRegionSelection } from "../shared/data/reader-regions.js";
import type { ReaderLiveTranslationLayoutPage as LiveTranslationLayoutPage } from "../contracts/live-translation.js";
import type { LiveTranslationPageState } from "../shared/data/live-translation-state.js";
export declare const DEFAULT_ASPECT = 1.414;
type PdfPageSlotProps = {
    pageNumber: number;
    width: number;
    devicePixelRatio: number;
    pane?: ReaderPaneId;
    /** pane-level windowing decides whether the page canvas should be mounted */
    active?: boolean;
    /** 对照左右同页 max 高度 */
    syncedMinHeight?: number;
    onMetrics?: () => void;
    /** windowed rendering: aspect cache from pane to keep placeholder height correct */
    cachedAspect?: number;
    onAspectChange?: (pageNumber: number, aspect: number) => void;
    /** pane-level windowing sentinel registration (the pane observer owns activeness) */
    sentinelRef?: (el: HTMLDivElement | null) => void;
    regionHighlight?: ReaderRegionHighlight | null;
    regionTargets?: ReaderRegionHighlight[];
    onSelectRegion?: (selection: ReaderRegionSelection) => void;
    liveTranslationLayout?: LiveTranslationLayoutPage;
    liveTranslationPage?: LiveTranslationPageState;
    showLiveTranslation?: boolean;
};
declare function PdfPageSlotInner({ pageNumber, width, devicePixelRatio, pane, active, syncedMinHeight, onMetrics, cachedAspect, onAspectChange, sentinelRef, regionHighlight, regionTargets, onSelectRegion, liveTranslationLayout, liveTranslationPage, showLiveTranslation, }: PdfPageSlotProps): import("react").JSX.Element;
export declare const PdfPageSlot: import("react").MemoExoticComponent<typeof PdfPageSlotInner>;
export {};
//# sourceMappingURL=PdfPageSlot.d.ts.map