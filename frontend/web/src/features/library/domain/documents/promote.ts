// 提交成功后的即时反馈：详情 payload 挂真实 job_id + 网格按 document_id 就地更新
// + 静默接进度。

import type { DialogStore } from "@/platform/store/dialog-store.js";
import type { JobSubmissionView, LibraryCardItem, LibraryEventPort } from "../types.js";

export function promoteDocumentToJob({
  bookDetailStore,
  libraryEventPort,
  attachJobProgress,
  documentId,
  result,
  sourceJobId = "",
}: {
  bookDetailStore: DialogStore<LibraryCardItem | null>;
  libraryEventPort?: LibraryEventPort | null;
  attachJobProgress: (jobId?: string | null, options?: { recovering?: boolean }) => void;
  documentId: string;
  result: JobSubmissionView | null | undefined;
  sourceJobId?: string;
}): void {
  const jobId = `${result?.job_id || result?.id || ""}`.trim();
  if (!jobId) {
    return;
  }
  const dialogState = bookDetailStore.getState();
  const base = (dialogState.payload || {}) as LibraryCardItem;
  const status = `${result?.status || "queued"}`.trim() || "queued";
  const stage = `${result?.stage || result?.display_stage || "queued"}`.trim() || "queued";
  const workflow = `${result?.workflow || ""}`.trim();
  const reuseProjection = {
    ...(typeof result?.ocr_reused === "boolean" ? { ocr_reused: result.ocr_reused } : {}),
    ...(result?.source_artifact_job_id
      ? { source_artifact_job_id: result.source_artifact_job_id }
      : {}),
    ...(result?.stages ? { stages: result.stages } : {}),
  };

  if (dialogState.open && `${base.document_id || ""}`.trim() === documentId) {
    bookDetailStore.open({
      ...base,
      job_id: jobId,
      active_job_id: jobId,
      library_only: false,
      status,
      stage,
      display_stage: `${result?.display_stage || stage}`,
      ...(workflow ? { workflow, job_type: workflow } : {}),
      ...reuseProjection,
    });
  }

  // 用 JobUpdated：按 document_id 就地改原卡，禁止主页再插一张新书
  const originJobId = `${sourceJobId || base.job_id || ""}`.trim();
  libraryEventPort?.publishJobUpdated?.({
    job_id: jobId,
    source_job_id: originJobId && originJobId !== jobId ? originJobId : undefined,
    document_id: documentId,
    active_job_id: jobId,
    library_only: false,
    status,
    stage,
    display_stage: `${result?.display_stage || stage}`,
    ...(workflow ? { workflow, job_type: workflow } : {}),
    ...reuseProjection,
    title: base.title,
    display_name: base.display_name || base.title,
    page_count: base.page_count,
    cover_url: base.cover_url,
    thumbnail_url: base.thumbnail_url,
  });
  attachJobProgress(jobId);
}
