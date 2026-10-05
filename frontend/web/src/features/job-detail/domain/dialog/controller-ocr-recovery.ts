// OCR 歧义恢复：把 ocr-ambiguity-recovery 纯逻辑接到 store（pending/status）、
// 弹窗关闭、全局错误与诊断刷新。

import type { StatusDetailRuntimePort } from "../status-detail-runtime-port.js";
import type { StatusDetailStore } from "../status-detail-store.js";
import type { StatusDetailDialogStore } from "../status-detail-dialog-store.js";
import type { OcrAmbiguityResolutionKind } from "@/platform/api/index.js";
import {
  resolveOcrAmbiguityRecovery,
} from "../ocr-ambiguity-recovery.js";
import type { OcrReceiptValues } from "../ocr-ambiguity-recovery.js";
import type { StatusDetailControllerDeps } from "./controller-types.js";

export function createStatusDetailOcrRecoveryActions({
  runtimePort,
  apiPrefix,
  resolveOcrAmbiguity,
  startPolling,
  store,
  dialogStore,
  setText,
  refreshOverview,
}: {
  runtimePort: StatusDetailRuntimePort;
  apiPrefix?: string;
  resolveOcrAmbiguity: StatusDetailControllerDeps["resolveOcrAmbiguity"];
  startPolling?: (jobId: string) => void;
  store: StatusDetailStore;
  dialogStore: StatusDetailDialogStore;
  setText?: (id: string, message: string) => void;
  refreshOverview: () => Promise<unknown>;
}) {
  async function resolveOcrAmbiguityAndRecover(
    resolution: OcrAmbiguityResolutionKind,
    values: OcrReceiptValues = {},
  ) {
    return resolveOcrAmbiguityRecovery({
      job: runtimePort.currentJobSnapshot(),
      descriptor: store.getSnapshot().overview.ocrAmbiguity.descriptor,
      resolution,
      values,
      apiPrefix,
      resolveOcrAmbiguity,
      refreshDiagnostics: refreshOverview,
      startPolling,
      closeDialog: () => dialogStore.close(),
      setPending: (pending) => store.actions.setOcrAmbiguityPending(pending),
      setStatus: (status) => store.actions.setOverview({
        ocrAmbiguity: {
          ...store.getSnapshot().overview.ocrAmbiguity,
          status,
        },
      }),
      setGlobalError: (message) => setText?.("error-box", message),
    });
  }

  function acceptOcrDuplicateRiskAndRecover() {
    return resolveOcrAmbiguityAndRecover("accept_duplicate_risk");
  }

  function bindExistingOcrReceiptAndRecover(values: OcrReceiptValues) {
    return resolveOcrAmbiguityAndRecover("bind_existing_receipt", values);
  }

  return {
    acceptOcrDuplicateRiskAndRecover,
    bindExistingOcrReceiptAndRecover,
  };
}
