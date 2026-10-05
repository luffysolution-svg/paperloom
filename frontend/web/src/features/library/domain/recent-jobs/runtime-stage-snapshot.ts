// Stage/snapshot 归一化：把任意 job 形状折算成可信的 StageSnapshot。
// 纯逻辑，无副作用；runtime-item.ts 与 library-job-item-merge.ts 共用。

import {
  clampRuntimeStageKeyForJob,
  firstNonEmpty,
  normalizeRuntimeDisplayStage,
} from "./runtime-value-helpers.js";
import type {
  LibraryJobItem,
  RuntimeItemOptions,
  StageAdapterPort,
  StageSnapshot,
} from "./runtime-item-types.js";

const EMPTY_STAGE_SNAPSHOT: StageSnapshot = Object.freeze({
  stageKey: "",
  source: "missing-stage-adapter",
  publicStage: "",
  lane: "",
  substage: "",
  detail: "",
  progress: {},
});

const IGNORED_SNAPSHOT_SOURCES = new Set(["legacy-stage", "canonical-empty-stage"]);
const PUBLIC_STAGE_KEYS = new Set(["ocr", "translate", "render", "done"]);

export function isMeaningfulStageKey(value: unknown = ""): boolean {
  return !["", "idle", "running", "queued"].includes(`${value || ""}`.trim());
}

function publicStageName(stageKey = ""): string {
  return stageKey === "translate" ? "translation" : stageKey;
}

function normalizePublicStageKey(value: unknown = ""): string {
  const normalized = normalizeRuntimeDisplayStage(`${value || ""}`);
  return PUBLIC_STAGE_KEYS.has(normalized) ? normalized : "";
}

function snapshotCanDriveStage(snapshot: StageSnapshot | null | undefined = {}): boolean {
  const source = `${snapshot?.source || ""}`.trim();
  return !IGNORED_SNAPSHOT_SOURCES.has(source);
}

function directPublicStageKey(job: LibraryJobItem = {}): string {
  return normalizePublicStageKey(job.display_stage);
}

export function snapshotHasPublicStage(stageSnapshot: StageSnapshot = {}): boolean {
  return Boolean(normalizePublicStageKey(stageSnapshot.publicStage) || normalizePublicStageKey(stageSnapshot.stageKey));
}

function stageSnapshotForJob(
  job: LibraryJobItem = {},
  stageAdapterPort: StageAdapterPort = {},
): StageSnapshot {
  const displayStageKey = clampRuntimeStageKeyForJob(directPublicStageKey(job), job);
  if (displayStageKey) {
    const adaptJobStageSnapshot = stageAdapterPort.adaptJobStageSnapshot;
    const adapted = typeof adaptJobStageSnapshot === "function"
      ? adaptJobStageSnapshot(job)
      : null;
    return {
      stageKey: displayStageKey,
      source: "display-stage",
      publicStage: publicStageName(displayStageKey),
      lane: firstNonEmpty(job.lane, "main"),
      substage: firstNonEmpty(job.substage),
      detail: firstNonEmpty(adapted?.detail, job.stage_detail),
      progress: adapted?.progress || (job.progress && typeof job.progress === "object" ? job.progress : {}),
    };
  }
  if (job.stage_snapshot && typeof job.stage_snapshot === "object" && snapshotCanDriveStage(job.stage_snapshot)) {
    const snapshot = job.stage_snapshot;
    const clampedStageKey = clampRuntimeStageKeyForJob(snapshot.stageKey, job);
    const clampedPublicStage = clampRuntimeStageKeyForJob(
      normalizePublicStageKey(snapshot.publicStage),
      job,
    );
    if (clampedStageKey === snapshot.stageKey
        && clampedPublicStage === normalizePublicStageKey(snapshot.publicStage)) {
      return snapshot;
    }
    return {
      ...snapshot,
      stageKey: clampedStageKey,
      publicStage: clampedPublicStage
        ? publicStageName(clampedPublicStage)
        : snapshot.publicStage,
    };
  }
  const adaptJobStageSnapshot = stageAdapterPort.adaptJobStageSnapshot;
  const adapted = typeof adaptJobStageSnapshot === "function"
    ? adaptJobStageSnapshot(job)
    : EMPTY_STAGE_SNAPSHOT;
  return snapshotCanDriveStage(adapted) ? (adapted as StageSnapshot) : EMPTY_STAGE_SNAPSHOT;
}

export function buildRecentJobRuntimeSnapshot(
  job: LibraryJobItem = {},
  { stageAdapterPort = {} }: RuntimeItemOptions = {},
): StageSnapshot {
  const stageSnapshot = stageSnapshotForJob(job, stageAdapterPort);
  return {
    stageKey: stageSnapshot.stageKey,
    source: stageSnapshot.source,
    publicStage: stageSnapshot.publicStage,
    lane: stageSnapshot.lane,
    substage: stageSnapshot.substage,
    detail: stageSnapshot.detail,
    progress: stageSnapshot.progress || {},
  };
}
