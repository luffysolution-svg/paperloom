import { type RefObject } from "react";
import { type MarkdownOutlineItem } from "../../shared/content/markdown-outline.js";
import { type ReaderMdBlock, type ReaderMdLanguage } from "../../shared/content/reader-blocks.js";
export type ReaderMdView = ReaderMdLanguage | "bilingual";
export declare function useReaderBlockMarkdown(contentRef: RefObject<HTMLElement | null>, blocks: readonly ReaderMdBlock[], view: ReaderMdView, open: boolean): {
    status: string;
    outline: MarkdownOutlineItem[];
    elementsRef: RefObject<Map<string, HTMLElement>>;
    renderedRevision: number;
};
//# sourceMappingURL=useReaderBlockMarkdown.d.ts.map