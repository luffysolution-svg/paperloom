import { type Root } from "react-dom/client";
export type ReaderBootOptions = {
    body?: HTMLElement;
    root?: HTMLElement;
    purgeLegacyMarkup?: boolean;
};
export declare function syncReaderBodyClasses(body?: HTMLElement): void;
/**
 * Removes any sibling markup that predates the Reader mount. Retained
 * intentionally as a defensive cleanup: a stale cached MPA shell (old HTML)
 * can still contain legacy markup, and this is the only guarantee that the
 * React root owns <body>. `bootReader` calls it unless the host explicitly
 * opts out via `purgeLegacyMarkup: false`.
 */
export declare function purgeLegacyMarkup(body?: HTMLElement, preservedRoot?: HTMLElement): void;
export declare function resolveReaderRoot(body?: HTMLElement): HTMLElement;
export declare function bootReader(options?: ReaderBootOptions): Root;
//# sourceMappingURL=boot.d.ts.map