// 生成文件，不要手改。来源：contracts/create-job.v1.schema.json 的 endpoints。
// 重新生成：npm --prefix frontend/packages/api run generate:client

import type {
  CreateJobInput,
} from "@retainpdf/contracts/create-job";
import { encodePathParam, request, type RequestOptions } from "../request.js";

/** POST /api/v1/jobs */
export function createJob(
  apiPrefix: string | undefined,
  args: { body: CreateJobInput },
  options?: RequestOptions,
): Promise<unknown> {
  return request<unknown>({ apiPrefix, method: "POST", path: `jobs`, body: args.body, options });
}
