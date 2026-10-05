// DOM 事件派发：重试阶段命令经 CustomEvent 走文档级委托。

import { APP_EVENTS } from "@/platform/contracts/app-contract.js";

export function dispatchStatusCardRetryStage(stage: string, jobId = "") {
  if (globalThis.document?.dispatchEvent && typeof globalThis.CustomEvent === "function") {
    globalThis.document.dispatchEvent(
      new globalThis.CustomEvent(APP_EVENTS.retryStage, {
        bubbles: true,
        composed: true,
        detail: {
          stage,
          jobId: `${jobId || ""}`.trim() || undefined,
        },
      }),
    );
  }
}
