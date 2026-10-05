// StatusCard 共享模型 facade：保持既有导出名与行为，实现按职责拆到 ./status-card/。
//
// - types.ts            类型
// - use-status-card-*.ts store→snapshot / display / elapsed / media 组装
// - cancellation.ts     取消判定
// - retry.ts            阶段重试解析
// - dom-events.ts       重试阶段 DOM 事件派发
// - visual-stage.ts     视觉阶段选择

export type {
  HasCancellableStatusCardJobOptions,
  StatusCardCancelDescription,
  StatusCardElapsed,
  StatusCardErrorState,
  StatusCardLottie,
  StatusCardModel,
  StatusCardPrimaryActions,
  StatusCardSelectedRetry,
  StatusCardSelection,
  StatusCardStageDisplay,
  UseStatusCardModelOptions,
} from "./status-card/types.js";

export {
  describeStatusCardCancel,
  hasCancellableStatusCardJob,
} from "./status-card/cancellation.js";

export {
  STATUS_CARD_STAGE_RETRY_META,
  normalizeStatusCardFlowKey,
  resolveStatusCardSelectedRetry,
} from "./status-card/retry.js";
export type { StatusCardRetryFlowKey } from "./status-card/retry.js";

export { dispatchStatusCardRetryStage } from "./status-card/dom-events.js";

export { useStatusCardModel } from "./status-card/use-status-card-model.js";
