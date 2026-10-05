// buildProgressRenderModel 拷贝自 components/status/job-status-card-rendering.js
// 第 45-164 行(蓝图 §1 components/status/ 判决,该文件整体死于 cutover——
// js/components/ 是防回弹门禁禁区,只能拷贝纯函数,不能 import)。
// 逐字保留,不做任何行为改写;ProgressBlock.jsx / useStagedProgressAnimation.js
// 共用本文件。

/** useStagedProgressAnimation / buildProgressOptions 输出 → ProgressBlock 输入 */
export type ProgressRenderModelInput = {
  current?: number;
  total?: number;
  fallbackText?: string;
  displayPercent?: number | null;
  percent?: number;
  progressText?: string;
  progressUnit?: string;
  stageKey?: string;
  status?: string;
  forceVisible?: boolean | null;
  indeterminate?: boolean;
};

export type ProgressRenderModel = {
  visible: boolean;
  percent: number;
  text: string;
  componentText: string;
  indeterminate: boolean;
  legacyIndeterminate: boolean;
};

function finiteNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampPercent(percent: number): number {
  return Math.max(0, Math.min(100, percent));
}

function progressRenderPercent(value: unknown): number {
  const parsed = finiteNumberOrNull(value);
  if (parsed === null) return NaN;
  return clampPercent(parsed);
}

const VISIBLE_STAGE_KEYS = new Set([
  "ocr",
  "translate",
  "render",
  "queued",
  "validating",
  "done",
  "failed",
]);

const VISIBLE_STATUSES = new Set([
  "queued",
  "validating",
  "failed",
  "succeeded",
]);

function defaultTextForTerminalState(stageKey: string, status: string, fallbackText: string): string {
  const fallback = `${fallbackText || ""}`.trim();
  const hasFallback = fallback !== "" && fallback !== "-";
  if (hasFallback) return fallback;
  if (status === "failed" || stageKey === "failed") return "失败";
  if (status === "succeeded" || stageKey === "done") return "完成";
  if (stageKey === "queued" || status === "queued") return "排队中";
  if (stageKey === "validating" || status === "validating") return "校验中";
  return fallbackText;
}

export function buildProgressRenderModel({
  current = NaN,
  total = NaN,
  fallbackText = "-",
  displayPercent = null,
  percent = NaN,
  progressText = "",
  progressUnit = "",
  stageKey = "",
  status = "",
  forceVisible = null,
  indeterminate = false,
}: ProgressRenderModelInput = {}): ProgressRenderModel {
  const normalizedStageKey = `${stageKey || ""}`.trim();
  const normalizedStatus = `${status || ""}`.trim().toLowerCase();
  const visible = forceVisible ?? (
    VISIBLE_STAGE_KEYS.has(normalizedStageKey) || VISIBLE_STATUSES.has(normalizedStatus)
  );
  if (!visible) {
    return {
      visible: false,
      percent: 0,
      text: "",
      componentText: "-",
      indeterminate: false,
      legacyIndeterminate: false,
    };
  }

  const numericCurrent = finiteNumberOrNull(current) ?? NaN;
  const numericTotal = finiteNumberOrNull(total) ?? NaN;
  const numericDisplayPercent = progressRenderPercent(displayPercent);
  const numericPercent = finiteNumberOrNull(percent) ?? NaN;
  const normalizedProgressUnit = `${progressUnit || ""}`.trim();
  const textFallback = progressText || defaultTextForTerminalState(normalizedStageKey, normalizedStatus, fallbackText);

  if (indeterminate) {
    return {
      visible: true,
      percent: 42,
      text: textFallback,
      componentText: textFallback,
      indeterminate: true,
      legacyIndeterminate: true,
    };
  }

  if (Number.isFinite(numericDisplayPercent)) {
    const safePercent = clampPercent(numericDisplayPercent);
    const text = progressText || `进度 ${safePercent.toFixed(0)}%`;
    return {
      visible: true,
      percent: safePercent,
      text,
      componentText: text,
      indeterminate: false,
      legacyIndeterminate: false,
    };
  }

  const hasNumbers = Number.isFinite(numericCurrent) && Number.isFinite(numericTotal) && numericTotal > 0;
  if (hasNumbers && normalizedProgressUnit === "percent") {
    const safePercent = clampPercent((numericCurrent / numericTotal) * 100);
    const text = progressText || `进度 ${safePercent.toFixed(0)}%`;
    return {
      visible: true,
      percent: safePercent,
      text,
      componentText: text,
      indeterminate: false,
      legacyIndeterminate: false,
    };
  }

  if (hasNumbers) {
    const safePercent = clampPercent((numericCurrent / numericTotal) * 100);
    const text = progressText || `${numericCurrent} / ${numericTotal} (${safePercent.toFixed(0)}%)`;
    return {
      visible: true,
      percent: safePercent,
      text,
      componentText: text,
      indeterminate: false,
      legacyIndeterminate: false,
    };
  }

  if (Number.isFinite(numericPercent)) {
    const safePercent = clampPercent(numericPercent);
    const text = progressText || `进度 ${safePercent.toFixed(0)}%`;
    return {
      visible: true,
      percent: safePercent,
      text,
      componentText: text,
      indeterminate: false,
      legacyIndeterminate: false,
    };
  }
  // 无可用数字：不再伪造 0%。终态按真实语义兜底（完成 100 / 排队 0），
  // 失败与缺数返回 NaN，由 ProgressBlock 显示非 0% 文案（失败/—）。
  const isDone = normalizedStatus === "succeeded" || normalizedStageKey === "done";
  const isQueuedState = normalizedStageKey === "queued"
    || normalizedStageKey === "validating"
    || normalizedStatus === "queued"
    || normalizedStatus === "validating";
  const fallbackPercent = isDone ? 100 : isQueuedState ? 0 : NaN;
  const text = progressText || defaultTextForTerminalState(normalizedStageKey, normalizedStatus, fallbackText);
  return {
    visible: true,
    percent: fallbackPercent,
    text,
    componentText: text,
    indeterminate: false,
    legacyIndeterminate: false,
  };
}
