// reader — pure：阅读页的区域和元数据（契约 reader-data.v1），任务还没有这些数据时后端回 404，这里当作空。
import * as generated from "./generated/reader-data.js";
import { failWith, orOnStatus } from "./request.js";

export async function fetchReaderRegions(jobId: string, apiPrefix?: string): Promise<any> {
  return orOnStatus(
    generated.getReaderRegions(apiPrefix, { job_id: jobId }, { onError: failWith("读取阅读区域失败，请稍后重试。") }),
    404,
    { items: [] },
  );
}

export async function fetchReaderMetadata(jobId: string, apiPrefix?: string): Promise<any> {
  return orOnStatus(
    generated.getReaderMetadata(apiPrefix, { job_id: jobId }, { onError: failWith("读取阅读元数据失败，请稍后重试。") }),
    404,
    null,
  );
}
