import { APP_EVENTS } from "@/platform/contracts/app-contract.js";
import { bindRecentJobsCommandHandlers } from "./command-handlers.js";
import { invalidateLibraryBooksResource } from "./library-books-resource.js";

export function bindRecentJobsFeatureEvents({
  apiPrefix,
  commandPort,
  doc = document,
  fetchJobPayload,
  libraryBooksResource,
  libraryRefreshPort,
  refreshScheduler,
  runtime,
  viewPort,
}: any = {}) {
  viewPort.bindEvents({
    onOpen: refreshScheduler.openDialog,
    onLoadMore: () => runtime.loadRecentJobs({ reset: false }),
    onSearch: refreshScheduler.updateSearch,
    isSuspended: refreshScheduler.isSuspended,
  });

  const commandSubscription = bindRecentJobsCommandHandlers({
    apiPrefix,
    commandPort,
    fetchJobPayload,
    libraryBooksResource,
    runtimePatches: runtime.runtimePatches,
    refreshScheduler,
  });

  const librarySubscription = libraryRefreshPort.subscribe({
    onRefreshRequested: (detail) => {
      void commandPort.requestRefresh(detail);
    },
    onJobUpdated: ({ job }: any = {}) => {
      void commandPort.publishJobUpdated(job);
    },
    onJobCreated: ({ job }: any = {}) => {
      void commandPort.publishJobCreated(job);
    },
  });

  function onStatusAreaVisibilityChanged() {
    refreshScheduler.setSuspended(refreshScheduler.isSuspended());
  }
  function onOpenTranslationWorkflow() {
    refreshScheduler.setSuspended(true);
  }
  function onCloseTranslationWorkflow() {
    // 关闭上传/任务弹窗后必须真正刷新书架：上传只建文档、不建任务，若这里不刷新，
    // 新上传的 PDF 要等整页刷新才会出现。
    //
    // 注意：`bypassThrottle` **不解除 suspend**，而 `scheduleRefresh` 在
    // `isWorkflowOpen()`（DOM `data-open`）仍为真时会把非 force 请求排进 pending
    // 且此场景不会 replay（setSuspended 已是 false→false），于是刷新被静默丢弃。
    // 关闭瞬间 data-open 可能还没被 workflow 监听器清掉（监听器注册顺序），所以这里
    // 用 `force: true` 跳过 suspend+throttle，并失效书架资源确保读到最新文档。
    refreshScheduler.setSuspended(false);
    invalidateLibraryBooksResource(libraryBooksResource);
    refreshScheduler.scheduleRefresh({ delay: 300, force: true });
  }
  doc.addEventListener(APP_EVENTS.statusAreaVisibilityChanged, onStatusAreaVisibilityChanged);
  doc.addEventListener(APP_EVENTS.openTranslationWorkflow, onOpenTranslationWorkflow);
  doc.addEventListener(APP_EVENTS.closeTranslationWorkflow, onCloseTranslationWorkflow);

  return {
    commandSubscription,
    librarySubscription,
    dispose() {
      doc.removeEventListener(APP_EVENTS.statusAreaVisibilityChanged, onStatusAreaVisibilityChanged);
      doc.removeEventListener(APP_EVENTS.openTranslationWorkflow, onOpenTranslationWorkflow);
      doc.removeEventListener(APP_EVENTS.closeTranslationWorkflow, onCloseTranslationWorkflow);
      commandSubscription?.destroy?.();
      librarySubscription?.destroy?.();
      refreshScheduler?.dispose?.();
      runtime?.recentJobsLoader?.dispose?.();
      runtime?.activeRefreshLoop?.dispose?.();
    },
  };
}
