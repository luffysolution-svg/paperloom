// 提交链路总览(显性化,不改行为;签名与事件名不变):
//   表单校验(WorkflowPanel.handleSubmit)→ 组参(collectRunPayload)→
//   提交(submitJobRequest)→ 接进度(sync 快照/renderJob/startJobPolling)→
//   关框(dispatch APP_EVENTS.closeTranslationWorkflow)。
// 每步成功→ 下一步;失败→ 返回对应 status 并停留,不继续向下走,详见 runSubmitFlow 内联。
// 分支: [MOCK] 直通提交(不做校验/预算/凭证); [真机] 全链路校验后提交。
//
// 本文件是提交链路的对外 facade，实现按职责拆到 ./submit/ 下：
//   contracts   类型与常量
//   normalizers unknown→窄类型归一
//   readiness   表单就绪校验与阻断处理
//   budget      DeepSeek 余额/预算前置检查
//   credentials OCR 凭证前置检查
//   progress    成功后接进度、关框与兜底刷新(800ms/5s，返回取消函数)
//   errors      提交错误→error-box 诊断归一
//   runner      真机/MOCK 总编排
// 原导入路径与导出名保持不变。

export { DEEPSEEK_BALANCE_CHECK_TIMEOUT_MS } from "./submit/contracts.js";
export type {
  AppActionsConfigPort,
  BudgetStateSnapshot,
  CurrentSubmitReadinessOptions,
  DeepSeekBalanceCheckResult,
  DocumentRefLike,
  EnsureDeepSeekBudgetReadyOptions,
  EnsureOcrCredentialsForSubmitOptions,
  HandleSubmitReadinessBlockOptions,
  JobPayload,
  LibraryEventPortLike,
  NeedsDeepSeekBudgetCheckOptions,
  OcrCredentialCheckResult,
  PublishSubmitSuccessOptions,
  RunSubmitFlowOptions,
  SetTextFn,
  SubmitReadinessSnapshot,
  WindowRefLike,
} from "./submit/contracts.js";
export { needsDeepSeekBudgetCheck, ensureDeepSeekBudgetReady } from "./submit/budget.js";
export { ensureOcrCredentialsForSubmit } from "./submit/credentials.js";
export { currentSubmitReadiness, handleSubmitReadinessBlock } from "./submit/readiness.js";
export { publishSubmitSuccess } from "./submit/progress.js";
export { runSubmitFlow } from "./submit/runner.js";
