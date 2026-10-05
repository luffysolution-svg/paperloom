export type { JobDetailView, JobListItemView, JobListView, JobProgressView, JobStatusKind, WorkflowKind, } from "@retainpdf/contracts/job-status";
export type { JobEventListView, JobEventProgressView, JobEventRawView, JobEventRecord, ListJobEventsQuery, } from "@retainpdf/contracts/job-events";
export type { LibraryBookDetailView, LibraryBookListItemView, LibraryBookListView, LibraryDeleteResultView, } from "@retainpdf/contracts/library-books";
export type ApiResponse<T> = {
    code: number;
    message: string;
    data: T;
};
