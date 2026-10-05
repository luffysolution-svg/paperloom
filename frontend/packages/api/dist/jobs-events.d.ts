import type { JobEventListView, ListJobEventsQuery } from "@retainpdf/contracts/job-events";
export type JobEventsQuery = ListJobEventsQuery & {
    signal?: AbortSignal;
};
export declare class JobEventsError extends Error {
    readonly status: number;
    readonly code: string;
    constructor(message: string, status: number, code: string);
}
export declare function validateJobEventsPage(payload: unknown): JobEventListView;
export declare function mergeJobEventPages(previous: {
    items?: JobEventListView["items"];
} | null, next: JobEventListView): JobEventListView;
export declare function fetchJobEvents(jobId: string, apiPrefix?: string, query?: JobEventsQuery): Promise<JobEventListView>;
/** Drain only the fixed batch encoded by a cursor; never chase a moving head. */
export declare function fetchJobEventPages({ fetchPage, jobId, apiPrefix, query, isCurrent, }: {
    fetchPage?: typeof fetchJobEvents;
    jobId: string;
    apiPrefix?: string;
    query?: JobEventsQuery;
    isCurrent?: () => boolean;
}): Promise<JobEventListView>;
