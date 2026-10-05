// upload state 的读写成对封装。
//
// 从 controller.ts 抽出：把「port 方法可选、缺省时回退到快照」这层防御集中到
// 一处，page-range / session / execution 模块只依赖这几个访问器。

import type { UploadPayload, UploadState, UploadStatePort } from "./state.js";

export function emptyUploadState(): UploadState {
  return {
    uploadId: "",
    documentId: "",
    uploadedFileName: "",
    uploadedPageCount: 0,
    uploadedBytes: 0,
    appliedPageRange: "",
    submitBusy: false,
  };
}

export interface UploadStateAccess {
  readUploadState: () => UploadState;
  updateUploadState: (payload?: UploadPayload) => UploadState;
  updateAppliedPageRange: (value?: string) => UploadState;
  resetAppliedPageRange: () => UploadState;
}

export function createUploadStateAccess(
  uploadState: Partial<UploadStatePort>,
): UploadStateAccess {
  function readUploadState(): UploadState {
    return uploadState.getSnapshot?.() || emptyUploadState();
  }

  function updateUploadState(payload: UploadPayload = {}): UploadState {
    return uploadState.setUpload?.(payload) || readUploadState();
  }

  function updateAppliedPageRange(value = ""): UploadState {
    return uploadState.setAppliedPageRange?.(value) || readUploadState();
  }

  function resetAppliedPageRange(): UploadState {
    return uploadState.clearAppliedPageRange?.() || readUploadState();
  }

  return {
    readUploadState,
    updateUploadState,
    updateAppliedPageRange,
    resetAppliedPageRange,
  };
}
