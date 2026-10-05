// composition 层公共类型（单一入口 facade）。
// 原 types.ts 已按域拆到 ./types/*；本文件仅 re-export，对外 import 路径与导出名不变。
// CT: HomeFeatures=10, HomeServices=24( core6+domains13+视图帮助5 )。
export type * from "./types/common.js";
export type * from "./types/features.js";
export type * from "./types/credentials.js";
export type * from "./types/library.js";
export type * from "./types/status.js";
export type * from "./types/workflow.js";
export type * from "./types/reader.js";
export type * from "./types/services.js";
