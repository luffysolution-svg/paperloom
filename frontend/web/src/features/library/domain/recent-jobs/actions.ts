import { friendlyDocumentDeleteError, type ErrorLike } from "../documents/error-messages.js";
import { resolveRecoverableJobId } from "./active-job-recovery.js";
import { createRecentJobsRuntimePort } from "./job-runtime-port.js";
import { createRecentJobsReaderPort } from "./reader-port.js";
import {
  createRecentJobsNavigationPort,
  type NavigationJobRuntimePort,
  type NavigationReaderPort,
  type RecentJobsNavigationPort,
} from "./navigation-port.js";
import type { LibraryJobItem, RecentJobsStatePort } from "./state.js";

export type CreateRecentJobActionsOptions = {
  apiPrefix?: string;
  deleteJobById?: (apiPrefix: string, jobId: string) => Promise<unknown>;
  startPolling?: (jobId: string) => void;
  openReader?: (jobId: string, anchor: unknown, documentId: string, options: { pinJob?: boolean }) => void;
  currentJobId?: () => string;
  jobRuntimePort?: NavigationJobRuntimePort;
  readerPort?: NavigationReaderPort;
  activeJobRecoveryPort?: { readActiveJobId?: () => string };
  navigationPort?: Pick<RecentJobsNavigationPort, "currentJobId" | "openJob" | "openReader" | "recoverJob">;
  renderCurrentRecentJobs: (options?: { reset?: boolean }) => void;
  renderRecentJobsEmpty: (message?: string) => void;
  renderRecentJobsError: (message?: string, options?: { reset?: boolean }) => void;
  statePort: Pick<RecentJobsStatePort, "getSnapshot" | "removeJobFamily">;
};

export function createRecentJobActions({
  apiPrefix,
  deleteJobById,
  startPolling,
  openReader,
  currentJobId = () => "",
  jobRuntimePort = createRecentJobsRuntimePort({
    openJob: startPolling,
    currentJobId,
  }),
  readerPort = createRecentJobsReaderPort({
    openReader,
  }),
  activeJobRecoveryPort,
  navigationPort = createRecentJobsNavigationPort({
    currentJobId,
    jobRuntimePort,
    readerPort,
  }),
  renderCurrentRecentJobs,
  renderRecentJobsEmpty,
  renderRecentJobsError,
  statePort,
}: CreateRecentJobActionsOptions) {
  let activeJobRecoveryAttempted = false;

  function selectJob(jobId: string) {
    const normalizedJobId = `${jobId || ""}`.trim();
    if (!normalizedJobId) {
      renderRecentJobsError("该任务缺少 job_id，无法打开。", { reset: false });
      return;
    }
    navigationPort.openJob(normalizedJobId);
  }

  // 409（任务还在跑，或别的任务还在用它的产物）不自动 force，让用户先处理。
  function friendlyDeleteError(error: unknown) {
    return friendlyDocumentDeleteError(error as ErrorLike);
  }

  async function deleteJob(jobId: string) {
    const normalizedJobId = `${jobId || ""}`.trim();
    if (!normalizedJobId || !deleteJobById) {
      return;
    }
    try {
      await deleteJobById(apiPrefix || "", normalizedJobId);
    } catch (error) {
      renderRecentJobsError(friendlyDeleteError(error), { reset: false });
      return;
    }
    statePort.removeJobFamily(normalizedJobId);
    const nextItems = statePort.getSnapshot().items;
    if (nextItems.length === 0) {
      renderRecentJobsEmpty("暂无最近任务");
      return;
    }
    renderCurrentRecentJobs({ reset: true });
  }

  // options.pinJob：调用方点名要看这个任务（产物「查看」、实时译文），阅读器不按整本改写。
  // 书卡 / 封面「对照阅读」不传，由 ReaderNavigation 问后端这本书该打开哪个任务。
  function openJobReader(jobId: string, documentId = "", options: { pinJob?: boolean } = {}) {
    const normalizedJobId = `${jobId || ""}`.trim();
    if (!normalizedJobId) {
      renderRecentJobsError("该任务缺少 job_id，无法打开对照阅读。", { reset: false });
      return;
    }
    navigationPort.openReader(normalizedJobId, `${documentId || ""}`.trim(), pinJobOptions(options));
  }

  function recoverActiveJob(items: LibraryJobItem[] = []) {
    if (activeJobRecoveryAttempted) {
      return;
    }
    if (navigationPort.currentJobId()) {
      activeJobRecoveryAttempted = true;
      return;
    }
    activeJobRecoveryAttempted = true;
    const jobId = resolveRecoverableJobId(items, activeJobRecoveryPort);
    if (!jobId) {
      return;
    }
    navigationPort.recoverJob(jobId);
  }

  return {
    deleteJob,
    openJobReader,
    recoverActiveJob,
    selectJob,
  };
}

/** 只认显式的 pinJob: true —— 书卡把 onReader 当事件回调用时，第三个参数可能是别的东西。 */
function pinJobOptions(options: unknown): { pinJob?: boolean } {
  return (options as { pinJob?: unknown } | null)?.pinJob === true ? { pinJob: true } : {};
}
