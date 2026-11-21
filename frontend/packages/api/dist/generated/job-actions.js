// 生成文件，不要手改。来源：contracts/job-actions.v1.schema.json 的 endpoints。
// 重新生成：npm --prefix frontend/packages/api run generate:client
import { encodePathParam, request } from "../request.js";
/** GET /api/v1/jobs/:job_id/actions */
export function listJobActions(apiPrefix, args, options) {
    return request({ apiPrefix, method: "GET", path: `jobs/${encodePathParam(args.job_id)}/actions`, options });
}
/** POST /api/v1/jobs/:job_id/actions/cancel */
export function cancelJob(apiPrefix, args, options) {
    return request({ apiPrefix, method: "POST", path: `jobs/${encodePathParam(args.job_id)}/actions/cancel`, options });
}
/** POST /api/v1/jobs/:job_id/actions/resolve-ocr-ambiguity */
export function resolveOcrAmbiguity(apiPrefix, args, options) {
    return request({ apiPrefix, method: "POST", path: `jobs/${encodePathParam(args.job_id)}/actions/resolve-ocr-ambiguity`, body: args.body, options });
}
/** GET /api/v1/jobs/:job_id/actions/resume */
export function getResumePlan(apiPrefix, args, options) {
    return request({ apiPrefix, method: "GET", path: `jobs/${encodePathParam(args.job_id)}/actions/resume`, options });
}
/** POST /api/v1/jobs/:job_id/actions/resume */
export function resumeJob(apiPrefix, args, options) {
    return request({ apiPrefix, method: "POST", path: `jobs/${encodePathParam(args.job_id)}/actions/resume`, body: args.body, options });
}
/** POST /api/v1/jobs/:job_id/actions/retry-stage */
export function retryJobStage(apiPrefix, args, options) {
    return request({ apiPrefix, method: "POST", path: `jobs/${encodePathParam(args.job_id)}/actions/retry-stage`, body: args.body, options });
}
