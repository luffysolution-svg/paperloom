import type { JobDetailView, JobListView, ListJobsQuery } from "@retainpdf/contracts/job-status";
import { type RequestOptions } from "../request.js";
/** GET /api/v1/jobs */
export declare function listJobs(apiPrefix: string | undefined, args?: {
    query?: ListJobsQuery;
}, options?: RequestOptions): Promise<JobListView>;
/** GET /api/v1/jobs/:job_id */
export declare function getJob(apiPrefix: string | undefined, args: {
    job_id: string;
}, options?: RequestOptions): Promise<JobDetailView>;
