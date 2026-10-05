import type { ManifestPayload } from "@retainpdf/domain/job";

// 副资源（events / manifest / stageActions）的纯逻辑：类型常量、host-state
// 字段映射、记录归一化、快照构造与失效判定。无 store、无 timer、无副作用。

export const SECONDARY_RESOURCE_TYPES = Object.freeze([
  "events",
  "manifest",
  "stageActions",
] as const);

export type SecondaryResourceType = (typeof SECONDARY_RESOURCE_TYPES)[number];

/** Cached payload for one secondary resource (events / manifest / stageActions). */
export interface SecondaryResourceRecord {
  payload: unknown;
  jobId: string;
  fetchedAt: number;
  inFlight: boolean;
  ownerGen: number | string | null;
}

export type SecondaryResourcesState = {
  [K in SecondaryResourceType]: SecondaryResourceRecord;
};

/** Flat host-state fields that seed secondary resource records. */
export interface SecondaryResourceHostState {
  currentJobId?: string;
  currentJobEvents?: unknown;
  currentJobEventsJobId?: string;
  currentJobEventsFetchedAt?: number;
  currentJobEventsFetchInFlight?: boolean;
  currentJobManifest?: ManifestPayload | null;
  currentJobManifestJobId?: string;
  currentJobManifestFetchedAt?: number;
  currentJobManifestFetchInFlight?: boolean;
  currentJobStageActions?: unknown;
  currentJobStageActionsJobId?: string;
  currentJobStageActionsFetchedAt?: number;
  currentJobStageActionsFetchInFlight?: boolean;
  [key: string]: unknown;
}

interface SecondaryResourceFieldMap {
  payload: string;
  jobId: string;
  fetchedAt: string;
  inFlight: string;
}

const SECONDARY_RESOURCE_FIELDS = Object.freeze({
  events: {
    payload: "currentJobEvents",
    jobId: "currentJobEventsJobId",
    fetchedAt: "currentJobEventsFetchedAt",
    inFlight: "currentJobEventsFetchInFlight",
  },
  manifest: {
    payload: "currentJobManifest",
    jobId: "currentJobManifestJobId",
    fetchedAt: "currentJobManifestFetchedAt",
    inFlight: "currentJobManifestFetchInFlight",
  },
  stageActions: {
    payload: "currentJobStageActions",
    jobId: "currentJobStageActionsJobId",
    fetchedAt: "currentJobStageActionsFetchedAt",
    inFlight: "currentJobStageActionsFetchInFlight",
  },
} as const satisfies Record<SecondaryResourceType, SecondaryResourceFieldMap>);

export function secondaryResourceFields(
  type: SecondaryResourceType | string,
): SecondaryResourceFieldMap | null {
  return (SECONDARY_RESOURCE_FIELDS as Record<string, SecondaryResourceFieldMap>)[type] || null;
}

export function emptySecondaryResourceRecord(): SecondaryResourceRecord {
  return {
    payload: null,
    jobId: "",
    fetchedAt: 0,
    inFlight: false,
    ownerGen: null,
  };
}

export function normalizeSecondaryResourceRecord(
  initialState: SecondaryResourceHostState = {},
  type: SecondaryResourceType | string,
): SecondaryResourceRecord {
  const fields = secondaryResourceFields(type);
  if (!fields) {
    return emptySecondaryResourceRecord();
  }
  return {
    payload: initialState[fields.payload] ?? null,
    jobId: `${initialState[fields.jobId] || ""}`.trim(),
    fetchedAt: Number(initialState[fields.fetchedAt] || 0),
    inFlight: Boolean(initialState[fields.inFlight]),
    ownerGen: null,
  };
}

export function normalizeSecondaryResourcesState(
  initialState: SecondaryResourceHostState = {},
): SecondaryResourcesState {
  return Object.fromEntries(
    SECONDARY_RESOURCE_TYPES.map((type) => [
      type,
      normalizeSecondaryResourceRecord(initialState, type),
    ]),
  ) as SecondaryResourcesState;
}

/** 失效判定（纯函数）：force 直真；无有效 fetchedAt 直真；否则按间隔判陈旧。 */
export function shouldRefreshSecondary(
  lastFetchedAt: number,
  refreshMs: number,
  force: boolean,
) {
  if (force) {
    return true;
  }
  if (!Number.isFinite(lastFetchedAt) || lastFetchedAt <= 0) {
    return true;
  }
  return (Date.now() - lastFetchedAt) >= refreshMs;
}
