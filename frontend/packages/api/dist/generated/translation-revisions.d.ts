import type { ListTranslationItemsQuery, TranslationDebugItemView, TranslationDebugListView, TranslationReplayView } from "@retainpdf/contracts/translation-revisions";
import { type RequestOptions } from "../request.js";
/** GET /api/v1/jobs/:job_id/translations */
export declare function listTranslationItems(apiPrefix: string | undefined, args: {
    job_id: string;
    query?: ListTranslationItemsQuery;
}, options?: RequestOptions): Promise<TranslationDebugListView>;
/** GET /api/v1/jobs/:job_id/translations/:item_id */
export declare function getTranslationItem(apiPrefix: string | undefined, args: {
    job_id: string;
    item_id: string;
}, options?: RequestOptions): Promise<TranslationDebugItemView>;
/** POST /api/v1/jobs/:job_id/translations/:item_id/replay */
export declare function replayTranslationItem(apiPrefix: string | undefined, args: {
    job_id: string;
    item_id: string;
}, options?: RequestOptions): Promise<TranslationReplayView>;
