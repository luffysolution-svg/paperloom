// 合并阅读过期后接着读：重新问一次阅读入口，换成新的任务编号重开阅读器。
//
// 一本书翻过好几段时，阅读入口（/documents/:id/reading）给的是虚拟编号 `merged-<书>-<指纹>`，
// 后端按需拼一份合并目录。目录超过一天没人读会被清理，拿着旧编号的阅读器（书签、没关的标签页、
// 刷新）就只剩 404。旧编号本身不可能复活，所以按书号再问一次入口：有新编号就换过去，
// 入口说没有可读的译文（null）就退回按书读原文。

import { fetchDocumentReading } from "@retainpdf/api/documents";

type FetchReading = (apiPrefix: string, documentId: string) => Promise<{ job_id: string | null }>;

/** 只换路由里的 job_id / document_id，页码、块锚点、mock 这些参数原样留着。 */
export function readerUrlAfterExpiredMerge(href: string, documentId: string, nextJobId: string | null): string {
  const url = new URL(href);
  if (nextJobId) {
    url.searchParams.set("job_id", nextJobId);
  } else {
    url.searchParams.delete("job_id");
    url.searchParams.set("document_id", documentId);
  }
  return url.toString();
}

/**
 * 换过去返回 true；问不到入口、或者入口又给回同一个过期编号（不该发生，防止来回刷新）返回 false，
 * 调用方照旧显示加载失败。
 */
export async function reopenExpiredMergedReading({
  apiPrefix,
  documentId,
  expiredJobId,
  fetchReading = fetchDocumentReading,
  location = globalThis.location,
}: {
  apiPrefix: string;
  documentId: string;
  expiredJobId: string;
  fetchReading?: FetchReading;
  location?: Pick<Location, "href" | "replace">;
}): Promise<boolean> {
  let nextJobId: string | null;
  try {
    const reading = await fetchReading(apiPrefix, documentId);
    nextJobId = `${reading?.job_id || ""}`.trim() || null;
  } catch {
    return false;
  }
  if (nextJobId === expiredJobId || !location) return false;
  location.replace(readerUrlAfterExpiredMerge(location.href, documentId, nextJobId));
  return true;
}
