import { type RefObject } from "react";
import { type MarkdownOutlineItem } from "../../shared/content/markdown-outline.js";
export type UseReaderMarkdownDocumentOptions = {
    open: boolean;
    jobId: string;
    sourceOnly: boolean;
    /** 当前搜索词，渲染完成后重算命中时读取。 */
    searchQueryRef: RefObject<string>;
    /** 正文渲染完成后重算搜索命中（含只渲染部分块时的补算）。 */
    reapplySearchRef: RefObject<() => void>;
};
export declare function useReaderMarkdownDocument({ open, jobId, sourceOnly, searchQueryRef, reapplySearchRef, }: UseReaderMarkdownDocumentOptions): {
    contentRef: RefObject<HTMLElement>;
    status: string;
    setStatus: import("react").Dispatch<import("react").SetStateAction<string>>;
    outline: MarkdownOutlineItem[];
    setOutline: import("react").Dispatch<import("react").SetStateAction<MarkdownOutlineItem[]>>;
    outlineComplete: boolean;
    setOutlineComplete: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    outlineCompleteRef: RefObject<boolean>;
    pendingResume: boolean;
    rebuildOutline: () => void;
    renderAllRef: RefObject<boolean>;
    pendingAnchorRef: RefObject<string>;
    resumeCleanupRef: RefObject<() => void>;
};
//# sourceMappingURL=useReaderMarkdownDocument.d.ts.map