import type { SearchResultView } from "@retainpdf/contracts/library-documents";
export type { BlockSearchHit, SearchResultView } from "@retainpdf/contracts/library-documents";
export declare function searchLibrary(apiPrefix: string, q: string, { limit }?: {
    limit?: number;
}): Promise<SearchResultView>;
