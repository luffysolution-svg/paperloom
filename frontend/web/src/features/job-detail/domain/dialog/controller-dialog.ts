// 详情弹窗统一入口：打开/激活 tab（按 tab 触发对应数据加载）与详情页 URL。

import type { StatusDetailDialogStore } from "../status-detail-dialog-store.js";
import {
  defaultStatusDetailConfigPort,
} from "./config-port.js";

export function createStatusDetailDialogActions({
  dialogStore,
  ensureOverviewData,
  ensureTranslationData,
  configPort = defaultStatusDetailConfigPort,
}: {
  dialogStore: StatusDetailDialogStore;
  ensureOverviewData: () => Promise<unknown>;
  ensureTranslationData: () => Promise<unknown>;
  configPort?: typeof defaultStatusDetailConfigPort;
}) {
  // ---- 对外统一入口(蓝图 §1:ResultActions.jsx 的 #status-detail-btn 直调
  //      openStatusDetailDialog("overview"),不是事件分发) ----
  function activateDetailTab(name = "overview") {
    dialogStore.open({ activeTab: name });
    if (name === "translation") {
      void ensureTranslationData();
      return;
    }
    void ensureOverviewData();
  }

  function openStatusDetailDialog(tabName = "overview") {
    activateDetailTab(tabName);
  }

  function buildDetailPageUrl(jobId: string) {
    return configPort.buildDetailPageUrl(jobId);
  }

  return {
    activateDetailTab,
    openStatusDetailDialog,
    buildDetailPageUrl,
  };
}
