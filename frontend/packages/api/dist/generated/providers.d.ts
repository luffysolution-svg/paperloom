import type { FetchTranslationModelsInput, FetchTranslationModelsView } from "@retainpdf/contracts/providers";
import { type RequestOptions } from "../request.js";
/** POST /api/v1/providers/models */
export declare function fetchTranslationModels(apiPrefix: string | undefined, args: {
    body: FetchTranslationModelsInput;
}, options?: RequestOptions): Promise<FetchTranslationModelsView>;
