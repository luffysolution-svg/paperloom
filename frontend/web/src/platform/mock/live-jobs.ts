// 可推进的 mock 翻译任务（公开入口）。
// 实现已下沉到叶子模块 live-jobs-shared（避免与 live-jobs-events 互成
// import 环）；本文件保留原有导出面：注册表 API + payload/事件投影。
// 相位/时间线见 live-jobs-timeline。

export {
  buildLiveMockJobPayload,
  getLiveMockJobMeta,
  isLiveMockJobActive,
  isLiveMockJobId,
  listLiveMockJobIds,
  registerLiveMockJob,
  resetLiveMockJobs,
} from "./live-jobs-shared.js";
export {
  normalizeLiveMockFromStage,
} from "./live-jobs-timeline.js";
export type {
  LiveMockFromStage,
  LiveMockJobMeta,
} from "./live-jobs-timeline.js";
export { buildLiveMockJobEvents } from "./live-jobs-events.js";
