// 书籍详情打开 / 网格选任务导航。

import type { DialogStore } from "@/platform/store/dialog-store.js";
import { isRecentJobActive } from "../card/recent-job-card-presenter.js";
import type { LibraryCardItem } from "../types.js";

export function createBookDetailNavigation({
  bookDetailStore,
  attachJobProgress,
  recentJobsStatePort,
}: {
  bookDetailStore: DialogStore<LibraryCardItem | null>;
  attachJobProgress: (jobId?: string | null, options?: { recovering?: boolean }) => void;
  recentJobsStatePort?: { getSnapshot?: () => { items?: LibraryCardItem[] } } | null;
}) {
  function shouldPreferTranslateTab(item?: LibraryCardItem | null) {
    return Boolean(item?.prefer_translate_tab);
  }

  // 前置条件: item 非空且含 document_id 或真实 job_id;仅活跃 job 才接管轮询。
  // 只有这张卡本身仍在执行时，才允许它接管全局 currentJob 轮询；已完成/失败的
  // 书只是被查看，不能覆盖另一本仍在后台运行的任务。
  function openBookDetail(item?: LibraryCardItem | null) {
    if (!item) return;
    const documentId = `${item.document_id || ""}`.trim();
    const jobId = `${item.job_id || item.active_job_id || ""}`.trim();
    if (!documentId && (!jobId || jobId.startsWith("doc:"))) {
      return;
    }
    const prefer = shouldPreferTranslateTab(item);
    bookDetailStore.open({
      ...item,
      prefer_translate_tab: prefer || Boolean(item.prefer_translate_tab),
    });
    if (jobId && !jobId.startsWith("doc:") && isRecentJobActive(item)) {
      attachJobProgress(jobId, { recovering: true });
    }
  }

  // 前置条件: jobId 非空;findItem 未命中也用 job_id 开详情壳,不弹旧窗。
  function selectJobForDetail(
    jobId?: string | null,
    options: {
      findItem?: (jobId: string) => LibraryCardItem | null | undefined;
      /** @deprecated 图书馆网格不再弹工作流；保留参数兼容测试注入 */
      fallbackSelectJob?: (jobId: string) => void;
    } = {},
  ) {
    const id = `${jobId || ""}`.trim();
    if (!id) {
      return;
    }
    const item = options.findItem?.(id) || null;
    if (item) {
      openBookDetail({ ...item, prefer_translate_tab: true });
      return;
    }
    // 网格里暂时找不到行：仍用 job_id 打开详情壳 + silent 轮询，不弹旧窗
    openBookDetail({ job_id: id, prefer_translate_tab: true, status: "running" });
  }

  // 网格选任务：findItem 直读 recentJobsStatePort(job/active 双键)。
  function selectJob(jobId: string) {
    const id = `${jobId || ""}`.trim();
    if (!id) return;
    const findItem = (targetId: string): LibraryCardItem | null => {
      const items = (recentJobsStatePort?.getSnapshot?.().items || []) as LibraryCardItem[];
      return (
        (items.find((row) => `${(row as { job_id?: string })?.job_id || ""}`.trim() === targetId) as LibraryCardItem) ||
        (items.find((row) => `${(row as { active_job_id?: string })?.active_job_id || ""}`.trim() === targetId) as LibraryCardItem) ||
        null
      );
    };
    selectJobForDetail(id, { findItem });
  }

  return { openBookDetail, selectJobForDetail, selectJob };
}
