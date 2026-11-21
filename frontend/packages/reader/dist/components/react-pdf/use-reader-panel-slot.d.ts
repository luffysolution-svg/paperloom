import type { ReaderAssistantPanel } from "../../shared/types/reader-assistant-panels.js";
export type ReaderPanelSlot = {
    open: boolean;
    /** 曾经打开过 —— 懒加载面板拿它决定要不要留在树上。 */
    mounted: boolean;
};
export declare function useReaderPanelSlot(active: ReaderAssistantPanel | null, id: ReaderAssistantPanel): ReaderPanelSlot;
//# sourceMappingURL=use-reader-panel-slot.d.ts.map