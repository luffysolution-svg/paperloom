import type { JobResumePlanView, JobSubmissionView, OcrAmbiguityResolutionRequest, OcrAmbiguityResolutionView, ResumeJobInput, RetryStageRequest, RetryStageSubmissionView, StageActionsView } from "@retainpdf/contracts/job-actions";
import { type RequestOptions } from "../request.js";
/** GET /api/v1/jobs/:job_id/actions */
export declare function listJobActions(apiPrefix: string | undefined, args: {
    job_id: string;
}, options?: RequestOptions): Promise<StageActionsView>;
/** POST /api/v1/jobs/:job_id/actions/cancel */
export declare function cancelJob(apiPrefix: string | undefined, args: {
    job_id: string;
}, options?: RequestOptions): Promise<JobSubmissionView>;
/** POST /api/v1/jobs/:job_id/actions/resolve-ocr-ambiguity */
export declare function resolveOcrAmbiguity(apiPrefix: string | undefined, args: {
    job_id: string;
    body: OcrAmbiguityResolutionRequest;
}, options?: RequestOptions): Promise<OcrAmbiguityResolutionView>;
/** GET /api/v1/jobs/:job_id/actions/resume */
export declare function getResumePlan(apiPrefix: string | undefined, args: {
    job_id: string;
}, options?: RequestOptions): Promise<JobResumePlanView>;
/** POST /api/v1/jobs/:job_id/actions/resume */
export declare function resumeJob(apiPrefix: string | undefined, args: {
    job_id: string;
    body: ResumeJobInput;
}, options?: RequestOptions): Promise<JobSubmissionView>;
/** POST /api/v1/jobs/:job_id/actions/retry-stage */
export declare function retryJobStage(apiPrefix: string | undefined, args: {
    job_id: string;
    body: RetryStageRequest;
}, options?: RequestOptions): Promise<RetryStageSubmissionView>;
