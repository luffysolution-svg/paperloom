// 生成文件，不要手改。来源：contracts/job-data.v1.schema.json 的 endpoints。
// 重新生成：npm --prefix frontend/packages/api run generate:client

import type {
  JobDataCatalogView,
  JobDataView,
  JobDatasetQuery,
} from "@retainpdf/contracts/job-data";
import { encodePathParam, request, type RequestOptions } from "../request.js";

/** GET /api/v1/jobs/:job_id/data */
export function listJobDatasets(
  apiPrefix: string | undefined,
  args: { job_id: string },
  options?: RequestOptions,
): Promise<JobDataCatalogView> {
  return request<JobDataCatalogView>({ apiPrefix, method: "GET", path: `jobs/${encodePathParam(args.job_id)}/data`, options });
}

/** GET /api/v1/jobs/:job_id/data/:dataset */
export function getJobDataset(
  apiPrefix: string | undefined,
  args: { job_id: string; dataset: string; query?: JobDatasetQuery },
  options?: RequestOptions,
): Promise<JobDataView> {
  return request<JobDataView>({ apiPrefix, method: "GET", path: `jobs/${encodePathParam(args.job_id)}/data/${encodePathParam(args.dataset)}`, query: args.query, options });
}
