import type { JobListItemView, JobListView } from "@retainpdf/contracts/job-status";
import { API_PREFIX } from "@/platform/config/api-constants.js";
import {
  cancelJob,
  cancelOcrJob,
  fetchJobList,
  fetchJobPayload,
  rerunJob,
} from "@/platform/api/index.js";
import { resolveJobActions } from "@retainpdf/domain/job";

export const TASK_CENTER_PAGE_LIMIT = 50;
export const TASK_CENTER_MAX_ITEMS = 2000;

export type TaskCenterLoadResult = {
  items: JobListItemView[];
  reachedLimit: boolean;
  hasMore: boolean;
  nextOffset: number;
};

export type TaskCenterApiDependencies = {
  fetchList: typeof fetchJobList;
  fetchDetail: typeof fetchJobPayload;
  cancelTranslation: typeof cancelJob;
  cancelOcr: typeof cancelOcrJob;
  rerun: typeof rerunJob;
  resolveActions: typeof resolveJobActions;
};

const DEFAULT_DEPENDENCIES: TaskCenterApiDependencies = {
  fetchList: fetchJobList,
  fetchDetail: fetchJobPayload,
  cancelTranslation: cancelJob,
  cancelOcr: cancelOcrJob,
  rerun: rerunJob,
  resolveActions: resolveJobActions,
};

export async function loadTaskCenterJobs(
  dependencies: Pick<TaskCenterApiDependencies, "fetchList"> = DEFAULT_DEPENDENCIES,
  { offset = 0 }: { offset?: number } = {},
): Promise<TaskCenterLoadResult> {
  const start = Math.min(TASK_CENTER_MAX_ITEMS, Math.max(0, Math.trunc(offset) || 0));
  if (start >= TASK_CENTER_MAX_ITEMS) {
    return { items: [], reachedLimit: true, hasMore: false, nextOffset: start };
  }
  const limit = Math.min(TASK_CENTER_PAGE_LIMIT, TASK_CENTER_MAX_ITEMS - start);
  const page = await dependencies.fetchList(API_PREFIX, {
    limit, offset: start, includeLiveStage: false,
  }) as JobListView;
  const pageItems = Array.isArray(page?.items) ? page.items : [];
  const items: JobListItemView[] = [];
  const seen = new Set<string>();
  for (const item of pageItems) {
    const jobId = `${item?.job_id || ""}`.trim();
    if (jobId && !seen.has(jobId)) {
      seen.add(jobId);
      items.push(item);
    }
  }
  const nextOffset = start + pageItems.length;
  const reachedLimit = nextOffset >= TASK_CENTER_MAX_ITEMS;
  return { items, reachedLimit, nextOffset, hasMore: !reachedLimit && pageItems.length === limit };
}

/** Hydrate only visible active tasks; completed history never gates first paint. */
export async function loadTaskCenterLiveJobs(
  items: JobListItemView[],
  dependencies: Pick<TaskCenterApiDependencies, "fetchDetail"> = DEFAULT_DEPENDENCIES,
): Promise<JobListItemView[]> {
  const active = items.filter((item) => (
    item.status === "running" || item.status === "queued"
  ));
  const result: JobListItemView[] = [];
  let offset = 0;
  async function worker() {
    while (offset < active.length) {
      const item = active[offset++];
      try {
        const detail = await dependencies.fetchDetail(item.job_id, { apiPrefix: API_PREFIX });
        if (detail?.job_id === item.job_id) result.push({ ...item, ...detail });
      } catch {
        // One missing task must not discard another task's live progress.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, active.length) }, () => worker()));
  return result;
}

/**
 * 从「第 0 页」里挑出手上还没有的任务。
 *
 * 任务中心的 3s 周期只对已在列表里的 job 拉详情，拉列表只在挂载/手动刷新/
 * 加载更多时发生——所以别处新建的任务此前永远不会出现，直到用户点刷新。
 *
 * 列表是新任务在前，因此第 0 页里我们没有的那些必然比手上全部都新，调用方
 * 应当**前插**而不是用 mergeTaskCenterJobs 追加到末尾（那会让顺序错位）。
 * 返回值同时给出 addedCount，调用方据此把分页游标后移同样的距离：服务端列表
 * 整体右移了这么多，不移的话「加载更多」会重复取到已有的那几条。
 */
export function discoverNewTaskCenterJobs(
  previous: JobListItemView[],
  pageItems: JobListItemView[],
): { fresh: JobListItemView[]; addedCount: number } {
  const known = new Set(
    (Array.isArray(previous) ? previous : [])
      .map((item) => `${item?.job_id || ""}`.trim())
      .filter(Boolean),
  );
  const fresh = (Array.isArray(pageItems) ? pageItems : []).filter((item) => {
    const jobId = `${item?.job_id || ""}`.trim();
    return Boolean(jobId) && !known.has(jobId);
  });
  return { fresh, addedCount: fresh.length };
}

export function mergeTaskCenterJobs(previous: JobListItemView[], incoming: JobListItemView[]) {
  const updates = new Map(incoming.map((item) => [item.job_id, item]));
  const merged = previous.map((item) => {
    const next = updates.get(item.job_id);
    updates.delete(item.job_id);
    if (!next || (item.updated_at && next.updated_at && item.updated_at > next.updated_at)) return item;
    return next;
  });
  return [...merged, ...updates.values()];
}

export async function cancelTaskCenterJob(
  job: Pick<JobListItemView, "job_id" | "workflow">,
  dependencies: Pick<TaskCenterApiDependencies, "cancelTranslation" | "cancelOcr"> = DEFAULT_DEPENDENCIES,
): Promise<unknown> {
  const jobId = `${job?.job_id || ""}`.trim();
  if (!jobId) throw new Error("任务缺少 job_id，无法取消。");
  return `${job.workflow || ""}`.trim().toLowerCase() === "ocr"
    ? dependencies.cancelOcr(jobId, API_PREFIX)
    : dependencies.cancelTranslation(jobId, API_PREFIX);
}

export async function retryTaskCenterJob(
  jobId: string,
  dependencies: Pick<TaskCenterApiDependencies, "fetchDetail" | "rerun" | "resolveActions"> = DEFAULT_DEPENDENCIES,
): Promise<unknown> {
  const normalizedJobId = `${jobId || ""}`.trim();
  if (!normalizedJobId) throw new Error("任务缺少 job_id，无法重试。");
  const detail = await dependencies.fetchDetail(normalizedJobId, { apiPrefix: API_PREFIX });
  const actions = dependencies.resolveActions(detail || {});
  const actionUrl = `${actions?.rerun || ""}`.trim();
  if (!actions?.rerunEnabled || !actionUrl) {
    throw new Error("后端未提供可用的重试操作，请打开详情查看恢复建议。");
  }
  return dependencies.rerun(actionUrl);
}
