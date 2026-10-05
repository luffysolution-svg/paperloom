// display / stage 选择派生：done 折叠 + buildSelectedStageDisplay + visual / ring / flow 键。

import { useMemo } from "react";
import {
  buildSelectedStageDisplay,
  statusStageLabel,
} from "@retainpdf/domain/job-status";
import { resolveVisualStageKeyForSnapshot } from "./visual-stage.js";
import type { StatusCardSnapshot } from "../../domain/status-card-store.js";
import type { StatusCardSelection, StatusCardStageDisplay } from "./types.js";

export type StatusCardDisplayDerivation = {
  displaySnapshot: StatusCardSnapshot;
  display: StatusCardStageDisplay;
  visualStageKey: string;
  ringLabel: string;
  stageKeyForFlow: string;
  selectedForFlow: string;
};

export function useStatusCardDisplay({
  snapshot,
  flowStageKey,
  selection,
}: {
  snapshot: StatusCardSnapshot;
  flowStageKey: string;
  selection: StatusCardSelection;
}): StatusCardDisplayDerivation {
  const displaySnapshot = useMemo(() => (
    flowStageKey === "done" && snapshot.stageKey !== "done"
      ? { ...snapshot, stageKey: "done" }
      : snapshot
  ), [snapshot, flowStageKey]);

  const display = useMemo(
    () => buildSelectedStageDisplay({
      snapshot: displaySnapshot,
      selectedStageKey: selection.selectedStageKey,
    }) as StatusCardStageDisplay,
    [displaySnapshot, selection.selectedStageKey],
  );

  const visualStageKey = display.visualStageKey
    || resolveVisualStageKeyForSnapshot(snapshot, display.selected)
    || (flowStageKey === "done" ? "done" : "");

  const ringLabel = display.selectedIsCurrent
    ? statusStageLabel(selection.currentStageKey || flowStageKey, snapshot.label)
    : statusStageLabel(selection.selectedStageKey, "阶段");

  const stageKeyForFlow = flowStageKey || snapshot.stageKey;
  const selectedForFlow = display.selected || stageKeyForFlow;

  return { displaySnapshot, display, visualStageKey, ringLabel, stageKeyForFlow, selectedForFlow };
}
