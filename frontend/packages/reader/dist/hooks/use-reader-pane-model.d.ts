import type { ReaderMode } from "./use-reader-session.js";
import type { ProtectedPdfFile } from "../pdf/useProtectedPdfFile.js";
type ReaderPaneModelInput = {
    mode: ReaderMode;
    sourceOnly: boolean;
    assetsReady: boolean;
    sourceUrl: string;
    translatedUrl: string;
    sourceFile: ProtectedPdfFile | null;
    translatedFile: ProtectedPdfFile | null;
};
type ReaderPaneFlags = {
    mountSource: boolean;
    mountTranslated: boolean;
    showSource: boolean;
    showTranslated: boolean;
    compareMode: boolean;
    primaryPane: "source" | "translated";
};
export type ReaderPaneModel = ReaderPaneFlags & {
    numPagesByPane: {
        source: number;
        translated: number;
    };
    hudNumPages: number;
    primaryNumPages: number;
    metricsTick: number;
    onNumPages: (pages: number, pane: "source" | "translated") => void;
    onMetrics: () => void;
    /** string for usePageRowSync revision */
    rowSyncRevision: string;
};
/** Pure mount/visibility flags for dual-pane reader (testable without React). */
export declare function computeReaderPaneFlags(input: {
    mode: ReaderMode;
    sourceOnly: boolean;
    assetsReady: boolean;
    hasSource: boolean;
    hasTranslated: boolean;
}): ReaderPaneFlags;
export declare function useReaderPaneModel(input: ReaderPaneModelInput, extras?: {
    userZoom?: number;
    shellWidth?: number;
    identityKey?: string;
}): ReaderPaneModel;
export {};
//# sourceMappingURL=use-reader-pane-model.d.ts.map