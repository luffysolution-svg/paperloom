import { isMockMode } from "@/platform/config/runtime.js";
import { createInFlightDedupe } from "../in-flight-dedupe.js";
import { getMockJobList, getMockJobPayload } from "@/platform/mock/index.js";
import {
  fetchJobList as _fetchJobList,
  fetchJobPayload as _fetchJobPayload,
} from "@retainpdf/api/jobs";

const jobPayloadDedupe = createInFlightDedupe<any>();

export const fetchJobPayload = async (jobId: string, options?: { apiPrefix?: string } | string): Promise<any> => {
  let normalizedJobId = jobId;
  let apiPrefix: string | undefined;
  if (typeof jobId === "string" && jobId.startsWith("/") && typeof options === "string" && options != null && !options.startsWith("/")) {
    console.warn("[deprecated] fetchJobPayload(apiPrefix, jobId) is deprecated, use fetchJobPayload(jobId, { apiPrefix })");
    apiPrefix = jobId;
    normalizedJobId = options;
  } else if (typeof options === "string") {
    console.warn("[deprecated] fetchJobPayload(jobId, apiPrefix) string form is deprecated, use fetchJobPayload(jobId, { apiPrefix })");
    apiPrefix = options;
  } else if (options && typeof options === "object") {
    apiPrefix = (options as { apiPrefix?: string }).apiPrefix;
  }
  if (isMockMode()) { void apiPrefix; return getMockJobPayload(normalizedJobId); }
  // 四个所有者（主轮询 / 书架活跃卡 / 任务中心 / 阅读器 session）都经这一个函数
  // 拉 job detail，同一秒里会对同一个 job 各发一次；后端按设计不会合并它们
  // （见 in-flight-dedupe 的说明）。这里只合并恰好在途的那些，不做任何缓存。
  // apiPrefix 进 key：不同前缀是不同资源，不能互相顶替。
  return jobPayloadDedupe.run(
    `${apiPrefix || ""}|${normalizedJobId}`,
    () => (_fetchJobPayload as any)(normalizedJobId, apiPrefix ? { apiPrefix } : undefined),
  );
};

export const fetchJobList = async (apiPrefix: string, opts: any = {}): Promise<any> => {
  if (isMockMode()) {
    const { limit = 20, offset = 0, q = "" } = opts || {};
    return getMockJobList({ limit, offset, q });
  }
  return (_fetchJobList as any)(apiPrefix, opts);
};
