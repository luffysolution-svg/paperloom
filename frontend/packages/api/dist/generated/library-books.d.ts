import type { LibraryDeleteQuery, LibraryDeleteResultView } from "@retainpdf/contracts/library-books";
import { type RequestOptions } from "../request.js";
/** DELETE /api/v1/jobs/:job_id */
export declare function deleteJob(apiPrefix: string | undefined, args: {
    job_id: string;
    query?: LibraryDeleteQuery;
}, options?: RequestOptions): Promise<LibraryDeleteResultView>;
