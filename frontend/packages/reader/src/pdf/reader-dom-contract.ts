/** Shared DOM contract for the React PDF reader (selectors / attrs / class names). */

import type { ReaderPaneId } from "../shared/types/reader-dom.js";

export type { ReaderPaneId } from "../shared/types/reader-dom.js";

export const READER_PAGE_ATTR = "data-reader-page";
export const READER_PANE_ATTR = "data-reader-pane";
export const READER_NATURAL_HEIGHT_ATTR = "data-natural-height";
export const READER_MD_SRC_ATTR = "data-reader-md-src";

export const READER_ROOT_CLASS = "reader-react-root";
export const READER_GRID_CLASS = "reader-react-grid";
export const READER_SCROLL_SHELL_CLASS = "reader-react-scroll-shell";
export const READER_PDF_PANE_CLASS = "reader-react-pdf-pane";
export const READER_PDF_PAGE_CLASS = "reader-react-pdf-page";
export const READER_PDF_PAGE_PLACEHOLDER_CLASS = "reader-react-pdf-page-placeholder";
export const READER_PAGE_SLOT_CLASS = "reader-react-pdf-page-slot";

export function pageSelector(page?: number, pane?: ReaderPaneId | null): string {
  const pagePart = page != null
    ? `[${READER_PAGE_ATTR}="${page}"]`
    : `[${READER_PAGE_ATTR}]`;
  if (pane) {
    return `${pagePart}[${READER_PANE_ATTR}="${pane}"]`;
  }
  return pagePart;
}

export function pageInPaneSelector(pane: ReaderPaneId): string {
  return `[${READER_PAGE_ATTR}][${READER_PANE_ATTR}="${pane}"]`;
}

export function pageSlotSelector(): string {
  return `.${READER_PAGE_SLOT_CLASS}[${READER_PAGE_ATTR}]`;
}

export function getPageAttr(el: Element): number {
  return Number(el.getAttribute(READER_PAGE_ATTR));
}
