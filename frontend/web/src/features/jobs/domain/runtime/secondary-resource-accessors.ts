import type { ManifestPayload } from "@retainpdf/domain/job";
import { createSecondaryResourceStatePort } from "./secondary-resource-state-port.js";
import type {
  SecondaryResourceResetOptions,
  SecondaryResourceStatePort,
} from "./secondary-resource-state-port.js";
import type { SecondaryResourceType } from "./secondary-resource-records.js";

// 面向模块外的便捷出口：每次按 host state 取端口再委托。全部薄封装，
// 保持与端口一致的单例/围栏语义。

function portFor(state: unknown): SecondaryResourceStatePort {
  return createSecondaryResourceStatePort(state as object);
}

export function resetSecondaryResourceState(
  state: unknown,
  options: SecondaryResourceResetOptions = {},
) {
  return portFor(state).reset(options);
}

export function isSecondaryFetchInFlight(
  state: unknown,
  type: SecondaryResourceType | string,
) {
  return portFor(state).isInFlight(type);
}

export function secondaryResourceFetchedAt(
  state: unknown,
  type: SecondaryResourceType | string,
) {
  return portFor(state).fetchedAt(type);
}

export function setSecondaryFetchInFlight(
  state: unknown,
  type: SecondaryResourceType | string,
  value: unknown,
) {
  portFor(state).setInFlight(type, value);
}

export function clearSecondaryFetchInFlightForCurrentJob(
  state: unknown,
  type: SecondaryResourceType | string,
  jobId: unknown,
) {
  portFor(state).clearInFlightForCurrentJob(type, jobId);
}

export function cacheSecondaryResource(
  state: unknown,
  type: SecondaryResourceType | string,
  jobId: unknown,
  payload: unknown,
) {
  portFor(state).cache(type, jobId, payload);
}

export function clearSecondaryResourceForOtherJob(
  state: unknown,
  type: SecondaryResourceType | string,
  jobId: unknown,
) {
  portFor(state).clearForOtherJob(type, jobId);
}

export function cachedSecondaryResourceFor(
  state: unknown,
  type: SecondaryResourceType | string,
  jobId: unknown,
) {
  return portFor(state).cachedFor(type, jobId);
}

export function syncSecondaryResource(
  state: unknown,
  type: SecondaryResourceType | string,
  jobId: unknown,
  payload: unknown,
) {
  return portFor(state).sync(type, jobId, payload);
}

export function cachedEventsFor(state: unknown, jobId: unknown) {
  return cachedSecondaryResourceFor(state, "events", jobId);
}

export function cachedManifestFor(state: unknown, jobId: unknown): ManifestPayload | null {
  const payload = cachedSecondaryResourceFor(state, "manifest", jobId);
  return payload && typeof payload === "object"
    ? (payload as ManifestPayload)
    : null;
}

export function cachedStageActionsFor(state: unknown, jobId: unknown) {
  return cachedSecondaryResourceFor(state, "stageActions", jobId);
}
