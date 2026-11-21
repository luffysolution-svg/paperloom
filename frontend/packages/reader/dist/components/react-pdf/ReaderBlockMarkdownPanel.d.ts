import type { ReaderMdBlock } from "../../shared/content/reader-blocks.js";
import type { RegionHoverStore } from "../../shared/state/region-hover-store.js";
export type ReaderBlockMarkdownPanelProps = {
    open: boolean;
    blocks: readonly ReaderMdBlock[];
    side?: "left" | "right";
    regionHover?: RegionHoverStore;
    jumpToBlock?: (itemId: string) => void;
    onClose: () => void;
};
export declare function ReaderBlockMarkdownPanel({ open, blocks, side, regionHover, jumpToBlock, onClose, }: ReaderBlockMarkdownPanelProps): import("react").JSX.Element;
//# sourceMappingURL=ReaderBlockMarkdownPanel.d.ts.map