// web 侧终态状态判定单一真源。
//
// 基础谓词直接复用 @retainpdf/domain/job 的 isTerminalStatus / isJobTerminal，
// 这里只补齐 domain 未覆盖、web 各处又各写一份的部分：
//   - 后端偶发英式 "cancelled"（domain 只认美式 "canceled"）；
//   - 翻译任务可重发的终态（成功除外，另有后端 timeout/dead）。
// 其余模块一律从这里取，避免 feature 内再散落状态集合。
import { isTerminalStatus } from "@retainpdf/domain/job";

export { isJobTerminal, isTerminalStatus } from "@retainpdf/domain/job";

/** 精确匹配取消态（美式 canceled + 英式 cancelled）。大小写口径由调用方决定。 */
const CANCELED_STATUSES = ["canceled", "cancelled"] as const;

export function isCanceledStatus(status: unknown): boolean {
  return (CANCELED_STATUSES as readonly string[]).includes(`${status || ""}`.trim());
}

/** 精确匹配 "failed"。 */
export function isFailedStatus(status: unknown): boolean {
  return `${status || ""}`.trim() === "failed";
}

/** 终态（含英式 cancelled）；是否大小写归一由调用方按原有口径决定。 */
export function isTerminalJobStatus(status: unknown): boolean {
  return isTerminalStatus(`${status || ""}`.trim()) || isCanceledStatus(status);
}

/** 翻译任务可重新发起的终态；成功不可再发。 */
const RETRYABLE_TERMINAL_STATUSES = ["failed", "cancelled", "canceled", "timeout", "dead"] as const;

export function isRetryableTerminalStatus(status: unknown): boolean {
  return (RETRYABLE_TERMINAL_STATUSES as readonly string[])
    .includes(`${status || ""}`.trim().toLowerCase());
}
