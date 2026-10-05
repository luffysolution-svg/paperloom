// upload 域视图 store + React viewPort 的对外出口（装配根）。
//
// 实现已按职责拆分到 upload/ 下的聚焦模块：
//   view-state.ts        状态形状 + 默认态
//   view-actions.ts      纯 reducer 动作组
//   view-store.ts        store 组装
//   view-derivations.ts  纯派生 helper（进度百分比 / 文件标签）
//   view-feature.ts      React viewPort + uploadTilePort
// 本文件仅再导出，模块路径与导出名保持不变。

export type {
  TranslationOptionsOpenOptions,
  UploadDomRefs,
  UploadFileLabelSource,
  UploadPageRangesWrite,
  UploadTileLockedOptions,
  UploadTileTextOptions,
  UploadViewState,
} from "./upload/view-state.js";
export type { UploadViewActions } from "./upload/view-actions.js";
export type { UploadViewStore } from "./upload/view-store.js";
export { createUploadViewStore } from "./upload/view-store.js";
export { createUploadViewFeature } from "./upload/view-feature.js";
