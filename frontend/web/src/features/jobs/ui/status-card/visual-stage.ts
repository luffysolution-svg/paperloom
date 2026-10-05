// 视觉阶段选择：选中阶段优先，否则回退快照的 visual/stage key。

import type { StatusCardSnapshot } from "../../domain/status-card-store.js";

export function resolveVisualStageKeyForSnapshot(
  snapshot: StatusCardSnapshot | null = null,
  selectedStageKey = "",
): string {
  const stageKey = `${snapshot?.stageKey || ""}`.trim();
  const visualStageKey = `${snapshot?.visualStageKey || ""}`.trim();
  const selected = `${selectedStageKey || ""}`.trim();
  if (!selected || selected === stageKey) {
    return visualStageKey || stageKey;
  }
  return selected;
}
