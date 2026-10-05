// 上传会话复位：清 store、清视图、清 DOM 输入，再补一次派生与提交态刷新。
//
// 与会话状态相关的副作用集中在此；controller 只注入依赖。

import type { UploadState, UploadStatePort } from "./state.js";
import type { UploadViewPort } from "./ports.js";

export interface UploadSessionControllerDeps {
  uploadState: Partial<UploadStatePort>;
  readUploadState: () => UploadState;
  resetUploadedFile?: () => void;
  resetUploadProgress?: () => void;
  clearFileInputValue?: () => void;
  viewPort: Pick<UploadViewPort, "clearPageRanges" | "markUploadReady">;
  renderPageRangeSummary: () => void;
  refreshSubmitControls: () => void;
}

export function createUploadSessionController({
  uploadState,
  readUploadState,
  resetUploadedFile,
  resetUploadProgress,
  clearFileInputValue,
  viewPort,
  renderPageRangeSummary,
  refreshSubmitControls,
}: UploadSessionControllerDeps) {
  function resetUploadSession(): UploadState {
    const snapshot = uploadState.reset?.() || readUploadState();
    resetUploadedFile?.();
    resetUploadProgress?.();
    clearFileInputValue?.();
    viewPort.clearPageRanges();
    viewPort.markUploadReady(false);
    renderPageRangeSummary();
    refreshSubmitControls();
    return snapshot;
  }

  return { resetUploadSession };
}
