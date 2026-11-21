// 生成文件，不要手改。来源：contracts/job-actions.v1.schema.json 的 endpoints。
// 重新生成：npm --prefix frontend/packages/api run generate:client

import type {
  JobResumePlanView,
  JobSubmissionView,
  OcrAmbiguityResolutionRequest,
  OcrAmbiguityResolutionView,
  ResumeJobInput,
  RetryStageRequest,
  RetryStageSubmissionView,
  StageActionsView,
} from "@retainpdf/contracts/job-actions";
import { encodePathParam, request, type RequestOptions } from "../request.js";

/** GET /api/v1/jobs/:job_id/actions */
export function listJobActions(
  apiPrefix: string | undefined,
  args: { job_id: string },
  options?: RequestOptions,
): Promise<StageActionsView> {
  return request<StageActionsView>({ apiPrefix, method: "GET", path: `jobs/${encodePathParam(args.job_id)}/actions`, options });
}

/** POST /api/v1/jobs/:job_id/actions/cancel */
export function cancelJob(
  apiPrefix: string | undefined,
  args: { job_id: string },
  options?: RequestOptions,
): Promise<JobSubmissionView> {
  return request<JobSubmissionView>({ apiPrefix, method: "POST", path: `jobs/${encodePathParam(args.job_id)}/actions/cancel`, options });
}

/** POST /api/v1/jobs/:job_id/actions/resolve-ocr-ambiguity */
export function resolveOcrAmbiguity(
  apiPrefix: string | undefined,
  args: { job_id: string; body: OcrAmbiguityResolutionRequest },
  options?: RequestOptions,
): Promise<OcrAmbiguityResolutionView> {
  return request<OcrAmbiguityResolutionView>({ apiPrefix, method: "POST", path: `jobs/${encodePathParam(args.job_id)}/actions/resolve-ocr-ambiguity`, body: args.body, options });
}

/** GET /api/v1/jobs/:job_id/actions/resume */
export function getResumePlan(
  apiPrefix: string | undefined,
  args: { job_id: string },
  options?: RequestOptions,
): Promise<JobResumePlanView> {
  return request<JobResumePlanView>({ apiPrefix, method: "GET", path: `jobs/${encodePathParam(args.job_id)}/actions/resume`, options });
}

/** POST /api/v1/jobs/:job_id/actions/resume */
export function resumeJob(
  apiPrefix: string | undefined,
  args: { job_id: string; body: ResumeJobInput },
  options?: RequestOptions,
): Promise<JobSubmissionView> {
  return request<JobSubmissionView>({ apiPrefix, method: "POST", path: `jobs/${encodePathParam(args.job_id)}/actions/resume`, body: args.body, options });
}

/** POST /api/v1/jobs/:job_id/actions/retry-stage */
export function retryJobStage(
  apiPrefix: string | undefined,
  args: { job_id: string; body: RetryStageRequest },
  options?: RequestOptions,
): Promise<RetryStageSubmissionView> {
  return request<RetryStageSubmissionView>({ apiPrefix, method: "POST", path: `jobs/${encodePathParam(args.job_id)}/actions/retry-stage`, body: args.body, options });
}
