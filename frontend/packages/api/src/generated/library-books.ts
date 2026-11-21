// 生成文件，不要手改。来源：contracts/library-books.v1.schema.json 的 endpoints。
// 重新生成：npm --prefix frontend/packages/api run generate:client

import type {
  LibraryDeleteQuery,
  LibraryDeleteResultView,
} from "@retainpdf/contracts/library-books";
import { encodePathParam, request, type RequestOptions } from "../request.js";

/** DELETE /api/v1/jobs/:job_id */
export function deleteJob(
  apiPrefix: string | undefined,
  args: { job_id: string; query?: LibraryDeleteQuery },
  options?: RequestOptions,
): Promise<LibraryDeleteResultView> {
  return request<LibraryDeleteResultView>({ apiPrefix, method: "DELETE", path: `jobs/${encodePathParam(args.job_id)}`, query: args.query, options });
}
