// 副资源缓存（events / manifest / stageActions）的装配出口。按职责拆到同目录：
// - secondary-resource-records.ts     纯逻辑：类型常量、host 字段映射、
//                                      记录归一化、快照构造、失效判定
// - secondary-resource-store.ts       不可变 store 工厂 + host 单例挂载
// - secondary-resource-state-port.ts  fetch 生命周期端口（in-flight/cache/reset）
// - secondary-resource-accessors.ts   面向模块外的薄封装出口
// 本文件只做再导出，保持既有导出名与 import 路径不变。

export {
  SECONDARY_RESOURCE_TYPES,
  shouldRefreshSecondary,
} from "./secondary-resource-records.js";
export type {
  SecondaryResourceHostState,
  SecondaryResourceRecord,
  SecondaryResourcesState,
  SecondaryResourceType,
} from "./secondary-resource-records.js";
export {
  createSecondaryResourceStore,
  secondaryResourceStoreFor,
} from "./secondary-resource-store.js";
export type {
  SecondaryResourceActions,
  SecondaryResourceStore,
} from "./secondary-resource-store.js";
export {
  createSecondaryResourceStatePort,
} from "./secondary-resource-state-port.js";
export type {
  SecondaryResourceBatchApi,
  SecondaryResourceResetOptions,
  SecondaryResourceStatePort,
  SecondaryResourceStatePortOptions,
} from "./secondary-resource-state-port.js";
export {
  cacheSecondaryResource,
  cachedEventsFor,
  cachedManifestFor,
  cachedSecondaryResourceFor,
  cachedStageActionsFor,
  clearSecondaryFetchInFlightForCurrentJob,
  clearSecondaryResourceForOtherJob,
  isSecondaryFetchInFlight,
  resetSecondaryResourceState,
  secondaryResourceFetchedAt,
  setSecondaryFetchInFlight,
  syncSecondaryResource,
} from "./secondary-resource-accessors.js";
