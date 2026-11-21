// 生成文件，不要手改。来源：contracts/job-status.v1.schema.json 的 endpoints。
// 重新生成：npm --prefix frontend/packages/api run generate:client

import type {
  JobDetailView,
  JobListView,
  ListJobsQuery,
} from "@retainpdf/contracts/job-status";
import { encodePathParam, request, type RequestOptions } from "../request.js";

/** GET /api/v1/jobs */
export function listJobs(
  apiPrefix: string | undefined,
  args: { query?: ListJobsQuery } = {},
  options?: RequestOptions,
): Promise<JobListView> {
  return request<JobListView>({ apiPrefix, method: "GET", path: `jobs`, query: args.query, options });
}

/** GET /api/v1/jobs/:job_id */
export function getJob(
  apiPrefix: string | undefined,
  args: { job_id: string },
  options?: RequestOptions,
): Promise<JobDetailView> {
  return request<JobDetailView>({ apiPrefix, method: "GET", path: `jobs/${encodePathParam(args.job_id)}`, options });
}
