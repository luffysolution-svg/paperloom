export type { MarkdownOutlineItem } from "../../shared/content/markdown-outline.js";
export { buildMarkdownOutline } from "../../shared/content/markdown-outline.js";
export { clearMarkdownSearchHighlights, findMarkdownSearchTargets, } from "../../shared/content/markdown-search.js";
export { isProtectedMarkdownAssetUrl, startMarkdownImageLoading, } from "../../shared/content/markdown-images.js";
export type ReaderMarkdownPanelProps = {
    open: boolean;
    jobId: string;
    sourceOnly: boolean;
    side?: "left" | "right";
    onClose: () => void;
};
export declare function ReaderMarkdownPanel(props: ReaderMarkdownPanelProps): import("react").JSX.Element;
//# sourceMappingURL=ReaderMarkdownPanel.d.ts.map