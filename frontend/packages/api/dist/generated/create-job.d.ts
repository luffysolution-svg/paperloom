import type { CreateJobInput } from "@retainpdf/contracts/create-job";
import { type RequestOptions } from "../request.js";
/** POST /api/v1/jobs */
export declare function createJob(apiPrefix: string | undefined, args: {
    body: CreateJobInput;
}, options?: RequestOptions): Promise<unknown>;
