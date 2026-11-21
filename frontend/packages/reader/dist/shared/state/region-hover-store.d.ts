export type RegionHoverOrigin = "pdf" | "markdown";
export type RegionHoverState = {
    itemId: string | null;
    /** 谁触发的：Markdown 面板只对来自 PDF 的悬停做滚动跟随，自己触发的不滚。 */
    origin: RegionHoverOrigin | null;
};
export type RegionHoverStore = {
    get: () => RegionHoverState;
    set: (itemId: string | null, origin: RegionHoverOrigin) => void;
    subscribe: (listener: () => void) => () => void;
};
export declare function createRegionHoverStore(): RegionHoverStore;
//# sourceMappingURL=region-hover-store.d.ts.map