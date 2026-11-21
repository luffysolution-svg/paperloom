// 生成文件，不要手改。来源：contracts/job-status.v1.schema.json 的 endpoints。
// 重新生成：npm --prefix frontend/packages/api run generate:client
import { encodePathParam, request } from "../request.js";
/** GET /api/v1/jobs */
export function listJobs(apiPrefix, args = {}, options) {
    return request({ apiPrefix, method: "GET", path: `jobs`, query: args.query, options });
}
/** GET /api/v1/jobs/:job_id */
export function getJob(apiPrefix, args, options) {
    return request({ apiPrefix, method: "GET", path: `jobs/${encodePathParam(args.job_id)}`, options });
}
