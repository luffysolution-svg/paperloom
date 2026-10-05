// 断点续跑 / 重新运行：把 resume-actions 的纯逻辑接到 store 驱动的 resumeViewPort。
// 依赖只取 resume-actions + store/dialogStore + runtimePort。

import type { StatusDetailRuntimePort } from "../status-detail-runtime-port.js";
import type { StatusDetailStore } from "../status-detail-store.js";
import type { StatusDetailDialogStore } from "../status-detail-dialog-store.js";
import {
  rerunCurrentJob as rerunCurrentJobAction,
  syncRerunAction as syncRerunActionState,
} from "./resume-actions.js";
import type {
  JobActionResolver,
  StatusDetailResumeViewPort,
} from "./controller-types.js";

export function createStatusDetailResumeActions({
  runtimePort,
  store,
  dialogStore,
  rerunJob,
  setText,
  startPolling,
  resolveActions,
}: {
  runtimePort: StatusDetailRuntimePort;
  store: StatusDetailStore;
  dialogStore: StatusDetailDialogStore;
  rerunJob: (actionUrl: string) => Promise<unknown>;
  setText?: (id: string, message: string) => void;
  startPolling?: (jobId: string) => void;
  resolveActions: JobActionResolver;
}) {
  // ---- resume/rerun(resume-actions.js 保留;resumeViewPort 换 store 驱动,
  //      不再走 view.js 的 dialogComponent() DOM 查询) ----
  const resumeViewPort: StatusDetailResumeViewPort = {
    closeDialog: () => dialogStore.close(),
    setRerunAction: ({ enabled, status }: { enabled?: boolean; status?: string } = {}) => {
      store.actions.setOverview({ rerun: { enabled: Boolean(enabled), status: status || "" } });
    },
    setRerunDisabled: (disabled: boolean) => store.actions.setRerunPending(disabled),
  };

  function syncRerunAction(statusText = "") {
    return syncRerunActionState({
      ...runtimePort.rerunContext(),
      statusText,
      viewPort: resumeViewPort,
      resolveActions,
    });
  }

  async function rerunCurrentJob() {
    await rerunCurrentJobAction({
      rerunContext: runtimePort.rerunContext(),
      rerunJob,
      setText,
      startPolling,
      viewPort: resumeViewPort,
      resolveActions,
    });
  }

  return { syncRerunAction, rerunCurrentJob };
}
