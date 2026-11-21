// 生成文件，不要手改。来源：contracts/providers.v1.schema.json 的 endpoints。
// 重新生成：npm --prefix frontend/packages/api run generate:client

import type {
  FetchTranslationModelsInput,
  FetchTranslationModelsView,
} from "@retainpdf/contracts/providers";
import { encodePathParam, request, type RequestOptions } from "../request.js";

/** POST /api/v1/providers/models */
export function fetchTranslationModels(
  apiPrefix: string | undefined,
  args: { body: FetchTranslationModelsInput },
  options?: RequestOptions,
): Promise<FetchTranslationModelsView> {
  return request<FetchTranslationModelsView>({ apiPrefix, method: "POST", path: `providers/models`, body: args.body, options });
}
