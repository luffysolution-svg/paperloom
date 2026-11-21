import type { LibraryCardItem } from "../types.js";

export type LibraryReadTarget = "job" | "source" | "none";

export type LibraryReadPresentation = {
  label: string;
  target: LibraryReadTarget;
  jobId: string;
  documentId: string;
};

/** OCR-only 只认后端规范 workflow，不用历史 `-ocr` job_id 猜测业务类型。 */
export function isOcrOnlyItem(item: LibraryCardItem = {}): boolean {
  const workflow = `${item.workflow || item.job_type || ""}`.trim().toLowerCase();
  return workflow === "ocr";
}

/**
 * 这本书有没有可读的译文：有过任何成功的、带译文的任务（后端文档列表的 `has_translation`）。
 *
 * 和「当前任务成没成功」是两回事：早已翻译完的书重新翻译 / 重新渲染时，当前任务在跑或
 * 失败了，旧译文照样能读 —— 阅读器按 document 解析（/documents/:id/reading），挑的就是
 * 全部成功任务。老后端不带这个字段时按 false，退回只看当前任务的旧规则。
 */
export function hasReadableTranslation(item: LibraryCardItem = {}): boolean {
  return item.has_translation === true;
}

/** 网格卡和列表行共用的阅读文案与路由语义。 */
export function resolveLibraryReadPresentation(
  item: LibraryCardItem = {},
): LibraryReadPresentation {
  const documentId = `${item.document_id || ""}`.trim();
  const jobId = `${item.job_id || ""}`.trim();
  const succeeded = `${item.status || ""}`.trim().toLowerCase() === "succeeded";

  // 有译文就对照阅读，不管当前任务是什么状态。传给阅读器的 jobId 只是个起点：没有锚点时
  // 阅读器会按 documentId 改问后端该打开哪个任务（见 reader/domain/resolve-reading-target）。
  if (hasReadableTranslation(item) && documentId) {
    return { label: "对照阅读", target: "job", jobId, documentId };
  }
  if (succeeded && jobId) {
    return {
      label: isOcrOnlyItem(item) ? "查看 OCR" : "对照阅读",
      target: "job",
      jobId,
      documentId,
    };
  }
  if (documentId) {
    return { label: "读原文", target: "source", jobId, documentId };
  }
  return { label: "读原文", target: "none", jobId, documentId };
}
