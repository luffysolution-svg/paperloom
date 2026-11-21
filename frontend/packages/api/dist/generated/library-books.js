// 生成文件，不要手改。来源：contracts/library-books.v1.schema.json 的 endpoints。
// 重新生成：npm --prefix frontend/packages/api run generate:client
import { encodePathParam, request } from "../request.js";
/** DELETE /api/v1/jobs/:job_id */
export function deleteJob(apiPrefix, args, options) {
    return request({ apiPrefix, method: "DELETE", path: `jobs/${encodePathParam(args.job_id)}`, query: args.query, options });
}
