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
