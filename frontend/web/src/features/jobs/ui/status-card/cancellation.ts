// 取消判定：两卡共用「有任务 + 状态非空 + 非终态」。

import { isTerminalStatus } from "@retainpdf/domain/job";
import type {
  HasCancellableStatusCardJobOptions,
  StatusCardCancelDescription,
} from "./types.js";

// 两卡共用的可取消判定：有任务 + 状态非空 + 非终态。
// 白名单会漏掉 processing 等后端状态词，这里用非终态判断。
export function hasCancellableStatusCardJob(
  jobId: unknown,
  status: unknown,
  options: HasCancellableStatusCardJobOptions = {},
): boolean {
  const trimmedJobId = `${jobId ?? ""}`.trim();
  if (!trimmedJobId) return false;
  if (options.excludeDocPrefix && trimmedJobId.startsWith("doc:")) return false;
  const normalizedStatus = `${status ?? ""}`.trim().toLowerCase();
  if (normalizedStatus === "" || normalizedStatus === "cancelled") return false;
  return !isTerminalStatus(normalizedStatus);
}

export function describeStatusCardCancel(
  jobId: unknown,
  status: unknown,
  cancelDisabled: unknown,
  options: HasCancellableStatusCardJobOptions = {},
): StatusCardCancelDescription {
  const cancellable = hasCancellableStatusCardJob(jobId, status, options);
  const busy = Boolean(cancelDisabled);
  return {
    cancellable,
    disabled: !cancellable || busy,
    busy,
    title: busy ? "正在取消任务" : "停止并取消当前任务",
    label: busy ? "取消中" : "取消任务",
  };
}
