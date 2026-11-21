// 进度数值归一化：把后端可能给到的 null / "" / 字符串数字统一成 number | null。
//
// 关键点：Number(null) === 0、Number("") === 0，直接 Number() 会把「没有进度」
// 错当成 0%，渲染出永远卡在 0% 的进度条。这里先判断缺失再解析。

export function finiteNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function clampPercent(percent: number): number {
  return Math.max(0, Math.min(100, percent));
}

/**
 * 从 progress 形状里取百分比：
 * - 显式 `percent` 优先；
 * - 否则用 `current / total` 推导；
 * - 都不可用返回 null（不伪造 0%）。
 */
export function percentFromProgress(progress: unknown): number | null {
  const record = progress && typeof progress === "object"
    ? progress as Record<string, unknown>
    : {};
  const explicit = finiteNumberOrNull(record.percent);
  if (explicit !== null) return clampPercent(explicit);
  const current = finiteNumberOrNull(record.current);
  const total = finiteNumberOrNull(record.total);
  if (current !== null && total !== null && total > 0) {
    return clampPercent((current / total) * 100);
  }
  return null;
}

export function countFromProgress(progress: unknown): { current: number; total: number } | null {
  const record = progress && typeof progress === "object"
    ? progress as Record<string, unknown>
    : {};
  const current = finiteNumberOrNull(record.current);
  const total = finiteNumberOrNull(record.total);
  return current !== null && total !== null && total > 0 ? { current, total } : null;
}

const UNIT_LABELS: Record<string, string> = {
  page: "页", pages: "页",
  batch: "批", batches: "批",
  block: "块", blocks: "块",
};

/** 进度的单位：「32/48」到底是页还是批。后端没给或认不出就是空串（不猜）。 */
export function unitLabelFromProgress(progress: unknown): string {
  const record = progress && typeof progress === "object"
    ? progress as Record<string, unknown>
    : {};
  return UNIT_LABELS[`${record.unit || ""}`.trim().toLowerCase()] || "";
}

/**
 * 当前阶段的说明（stage_detail），去掉和状态行重复的「第 51/88 页」。
 *
 * 只认带「页」字的那种：以前的正则把「页」当可选，于是「4s 后重试（第 2/5 次）」里的
 * 「第 2/5」也被当成页码删了，剩下「（次）」。
 */
export function stageDetailWithoutPageCount(detail: string, stripPageCount: boolean): string {
  const text = `${detail || ""}`.trim();
  if (!stripPageCount || !text) return text;
  return text
    .replace(/[,，、\s]*第?\s*\d+\s*\/\s*\d+\s*页/g, "")
    .replace(/^[,，:：、\s]+|[,，:：、\s]+$/g, "")
    .trim();
}
