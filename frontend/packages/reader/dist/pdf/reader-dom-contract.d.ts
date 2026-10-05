/** Shared DOM contract for the React PDF reader (selectors / attrs / class names). */
import type { ReaderPaneId } from "../shared/types/reader-dom.js";
export type { ReaderPaneId } from "../shared/types/reader-dom.js";
export declare const READER_PAGE_ATTR = "data-reader-page";
export declare const READER_PANE_ATTR = "data-reader-pane";
export declare const READER_NATURAL_HEIGHT_ATTR = "data-natural-height";
export declare const READER_MD_SRC_ATTR = "data-reader-md-src";
export declare const READER_ROOT_CLASS = "reader-react-root";
export declare const READER_GRID_CLASS = "reader-react-grid";
export declare const READER_SCROLL_SHELL_CLASS = "reader-react-scroll-shell";
export declare const READER_PDF_PANE_CLASS = "reader-react-pdf-pane";
export declare const READER_PDF_PAGE_CLASS = "reader-react-pdf-page";
export declare const READER_PDF_PAGE_PLACEHOLDER_CLASS = "reader-react-pdf-page-placeholder";
export declare const READER_PAGE_SLOT_CLASS = "reader-react-pdf-page-slot";
export declare function pageSelector(page?: number, pane?: ReaderPaneId | null): string;
export declare function pageInPaneSelector(pane: ReaderPaneId): string;
export declare function pageSlotSelector(): string;
export declare function getPageAttr(el: Element): number;
//# sourceMappingURL=reader-dom-contract.d.ts.map