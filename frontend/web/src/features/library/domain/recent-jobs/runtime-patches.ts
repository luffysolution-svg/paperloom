// recent-jobs 运行时补丁的装配/出口根。
// 纯合并规则拆到 runtime-patch-merge.ts，insert/update/apply/applyExisting 状态机
// 拆到 runtime-patch-commands.ts；本文件只组装依赖并转出对外类型。
//
// 单元测试断言（均已存在，不删）：tests/library/recent-jobs*.test.mjs 断言单调进度 /
// 终态覆盖脏轮询 / 重试走 replaceItem；tests/home/submit-spinning-guarantee.test.mjs
// 断言提交即 queued 转圈 / 空状态不降级 / 终态正常落地。

import {
  createRuntimePatchCommands,
  type RuntimePatchCommands,
  type RuntimePatchCommandsDeps,
} from "./runtime-patch-commands.js";

export type {
  RuntimeJobPatch,
  RuntimePatchMergeOptions,
} from "./runtime-patch-merge.js";

export type {
  RuntimePatchCommands,
  RuntimePatchCommandsDeps,
} from "./runtime-patch-commands.js";

export interface RecentJobsRuntimePatchesDeps extends RuntimePatchCommandsDeps {}

export type RecentJobsRuntimePatches = RuntimePatchCommands;

export function createRecentJobsRuntimePatches(
  deps: RecentJobsRuntimePatchesDeps,
): RecentJobsRuntimePatches {
  return createRuntimePatchCommands(deps);
}
