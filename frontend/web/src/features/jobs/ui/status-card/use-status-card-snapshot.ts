// store → snapshot 派生：读取 statusCardStore、合并 fallback、解析 ids / flow / selection。

import { useMemo } from "react";
import { useStoreSnapshot } from "@/ui/hooks/use-store.js";
import { useHomeStatusCard } from "@/ui/context/home-services-context.js";
import { useStageSelection } from "../useStageSelection.js";
import { STATUS_CARD_IDS } from "../status-card-dom-ids.js";
import { createPrefixedStatusCardIds, type StatusCardIds } from "../status-card-ids-context.js";
import { mergeSnapshotWithFallback } from "../../domain/merge-snapshot-with-fallback.js";
import type {
  StatusCardSnapshot,
  StatusCardState,
  StatusCardStore,
} from "../../domain/status-card-store.js";
import type { StatusCardSelection, UseStatusCardModelOptions } from "./types.js";

export type StatusCardSnapshotDerivation = {
  snapshot: StatusCardSnapshot;
  ids: StatusCardIds;
  flowStageKey: string;
  selection: StatusCardSelection;
  cancelDisabled: boolean;
  cancelError: string;
  cancelCurrentJob: (() => unknown) | undefined;
};

export function useStatusCardSnapshot({
  embedded = false,
  idPrefix = "book-detail-",
  fallbackItem = null,
}: UseStatusCardModelOptions = {}): StatusCardSnapshotDerivation {
  const statusCard = useHomeStatusCard();
  const store = statusCard.store as StatusCardStore;
  const cancelCurrentJob = statusCard.cancelCurrentJob as (() => unknown) | undefined;
  const stateSnapshot = useStoreSnapshot(store) as StatusCardState;
  const rawSnapshot = stateSnapshot.snapshot;
  const snapshot = (embedded
    ? mergeSnapshotWithFallback(rawSnapshot, fallbackItem)
    : rawSnapshot) as StatusCardSnapshot;
  // 取消按钮调的 cancelCurrentJob 取消的是全局运行时在跟的任务（rawSnapshot）。merge 把快照隔离成
  // 本书的另一条任务时，点下去会取消别的书，所以禁用。
  const rawJobId = `${rawSnapshot?.jobId || ""}`.trim();
  const shownJobId = `${snapshot?.jobId || ""}`.trim();
  const cancelDisabled = stateSnapshot.cancelDisabled || Boolean(rawJobId && shownJobId && rawJobId !== shownJobId);
  const cancelError = `${stateSnapshot.cancelError || ""}`;

  const ids = useMemo(
    () => (embedded ? createPrefixedStatusCardIds(idPrefix) : STATUS_CARD_IDS),
    [embedded, idPrefix],
  );

  const flowStageKey = `${snapshot.status || ""}`.trim() === "succeeded"
    ? "done"
    : `${snapshot.stageKey || ""}`.trim();

  const selection = useStageSelection({
    jobId: snapshot.jobId,
    currentStageKey: flowStageKey || snapshot.stageKey,
  }) as StatusCardSelection;

  return { snapshot, ids, flowStageKey, selection, cancelDisabled, cancelError, cancelCurrentJob };
}
