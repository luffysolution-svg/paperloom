// upload 视图 store 的组装。
//
// 从 upload-store.ts 抽出：默认态（view-state.ts）+ 动作组（view-actions.ts）
// 交给通用 createStore。

import { createStore } from "@/platform/store/store.js";
import type { Store } from "@/platform/store/store.js";
import { createInitialUploadViewState, type UploadViewState } from "./view-state.js";
import { uploadViewActions, type UploadViewActions } from "./view-actions.js";

export type UploadViewStore = Store<UploadViewState, UploadViewActions>;

export function createUploadViewStore(): UploadViewStore {
  return createStore<UploadViewState, UploadViewActions>({
    name: "homeUploadView",
    initialState: createInitialUploadViewState(),
    actions: uploadViewActions,
  });
}
