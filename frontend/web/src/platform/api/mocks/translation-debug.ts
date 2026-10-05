import {
  getMockTranslationItem,
  getMockTranslationItems,
  getMockTranslationReplay,
  getMockTranslationSummary,
} from "@/platform/mock/translation.js";

export async function fetchTranslationDiagnostics(jobId, apiPrefix) {
  void apiPrefix;
  return getMockTranslationSummary(jobId);
}

export async function fetchTranslationItems(
  jobId,
  apiPrefix,
  {
    limit = 20,
    offset = 0,
    page = "",
    finalStatus = "",
    errorType = "",
    route = "",
    q = "",
  } = {},
) {
  void apiPrefix;
  void errorType;
  void route;
  return getMockTranslationItems(jobId, { limit, offset, page, finalStatus, q });
}

export async function fetchTranslationItem(jobId, itemId, apiPrefix) {
  void apiPrefix;
  return getMockTranslationItem(jobId, itemId);
}

export async function replayTranslationItem(jobId, itemId, apiPrefix) {
  void apiPrefix;
  return getMockTranslationReplay(jobId, itemId);
}
