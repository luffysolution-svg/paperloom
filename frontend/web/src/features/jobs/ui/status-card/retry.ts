// 阶段重试：flow key 归一化 + 选中阶段重试按钮解析。

import type { StatusCardStageRetryAction } from "../../domain/status-card-store.js";
import type { StatusCardSelectedRetry } from "./types.js";

export const STATUS_CARD_STAGE_RETRY_META = {
  ocr: {
    label: "重新 OCR",
    dispatchStage: "ocr",
    actionKeys: ["ocr"] as const,
  },
  translate: {
    label: "重新翻译",
    dispatchStage: "translation",
    actionKeys: ["translate", "translation"] as const,
  },
  render: {
    label: "重新渲染",
    dispatchStage: "render",
    actionKeys: ["render"] as const,
  },
} as const;

export type StatusCardRetryFlowKey = keyof typeof STATUS_CARD_STAGE_RETRY_META;

export function normalizeStatusCardFlowKey(key = ""): string {
  const value = `${key || ""}`.trim().toLowerCase();
  if (value === "translation" || value === "translate" || value === "translating") {
    return "translate";
  }
  if (value === "ocr" || value === "ocr_processing") return "ocr";
  if (value === "render" || value === "rendering") return "render";
  if (value === "done" || value === "finished") return "done";
  return value;
}

function resolveStatusCardStageAction(
  actions: Record<string, StatusCardStageRetryAction> | null | undefined,
  keys: readonly string[],
): StatusCardStageRetryAction | null {
  if (!actions || typeof actions !== "object") return null;
  for (const key of keys) {
    const hit = actions[key];
    if (hit) return hit;
  }
  return null;
}

/**
 * 仅针对「当前选中阶段」返回一颗重试按钮配置。
 * - OCR：有 job 即可（不看失败）
 * - 翻译/渲染：can_retry 或 失败/成功
 * - 完成：不显示
 */
export function resolveStatusCardSelectedRetry(options: {
  hasJob: boolean;
  failed: boolean;
  succeeded: boolean;
  selectedFlow: string;
  stageActions: Record<string, StatusCardStageRetryAction>;
}): StatusCardSelectedRetry | null {
  const { hasJob, failed, succeeded, selectedFlow, stageActions } = options;
  if (!hasJob) return null;
  if (selectedFlow !== "ocr" && selectedFlow !== "translate" && selectedFlow !== "render") {
    return null;
  }
  const flowKey = selectedFlow as StatusCardRetryFlowKey;
  const meta = STATUS_CARD_STAGE_RETRY_META[flowKey];
  const action = resolveStatusCardStageAction(stageActions, meta.actionKeys);

  if (flowKey === "ocr") {
    return {
      label: action?.label || meta.label,
      dispatchStage: meta.dispatchStage,
      title: "从 OCR 重新执行",
    };
  }
  const enabled = Boolean(action?.canRetry) || failed || succeeded;
  if (!enabled) return null;
  return {
    label: action?.label || meta.label,
    dispatchStage: meta.dispatchStage,
    title: action?.disabledReason || meta.label,
  };
}
