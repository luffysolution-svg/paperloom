import type { JobDetailView, JobListView } from "@retainpdf/contracts/job-status";
export type FetchJobPayloadOptions = {
    apiPrefix?: string;
};
export declare function fetchJobPayload(jobId: string, options?: FetchJobPayloadOptions): Promise<JobDetailView>;
/** @deprecated string form: use fetchJobPayload(jobId, { apiPrefix }) */
export declare function fetchJobPayload(jobId: string, apiPrefix?: string): Promise<JobDetailView>;
/** @deprecated swapped order: use fetchJobPayload(jobId, { apiPrefix }) */
export declare function fetchJobPayload(apiPrefix: string, jobId: string): Promise<JobDetailView>;
export declare function fetchJobList(apiPrefix?: string, { limit, offset, status, workflow, provider, scope, q, includeLiveStage, jobIds, }?: {
    limit?: number;
    offset?: number;
    status?: string;
    workflow?: string;
    provider?: string;
    scope?: string;
    q?: string;
    includeLiveStage?: boolean;
    /** 只列这些任务（`job_ids=a,b`），OCR 任务也在内。 */
    jobIds?: string[];
}): Promise<JobListView>;
export declare const JOB_LIST_MAX_LIMIT = 500;
export declare function fetchJobsByIds(apiPrefix?: string, jobIds?: string[]): Promise<Pick<JobListView, "items">>;
