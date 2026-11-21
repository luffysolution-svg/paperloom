import type { JobDataCatalogView, JobDataView, JobDatasetQuery } from "@retainpdf/contracts/job-data";
import { type RequestOptions } from "../request.js";
/** GET /api/v1/jobs/:job_id/data */
export declare function listJobDatasets(apiPrefix: string | undefined, args: {
    job_id: string;
}, options?: RequestOptions): Promise<JobDataCatalogView>;
/** GET /api/v1/jobs/:job_id/data/:dataset */
export declare function getJobDataset(apiPrefix: string | undefined, args: {
    job_id: string;
    dataset: string;
    query?: JobDatasetQuery;
}, options?: RequestOptions): Promise<JobDataView>;
