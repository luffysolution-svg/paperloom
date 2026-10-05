import {
  SECONDARY_RESOURCE_TYPES,
  emptySecondaryResourceRecord,
  shouldRefreshSecondary,
  type SecondaryResourcesState,
  type SecondaryResourceType,
} from "./secondary-resource-records.js";
import {
  applySecondaryResourceAction,
  secondaryResourceStoreFor,
  type SecondaryResourceStore,
} from "./secondary-resource-store.js";

// 副资源状态端口：面向调用方暴露 fetch 生命周期（in-flight / cache / 失效 /
// 重置）与批量 API，内部把每次写操作委托给 host 上的单例 store。

export interface SecondaryResourceStatePortOptions {
  now?: () => number;
}

export interface SecondaryResourceResetOptions {
  preserveInFlight?: boolean;
}

export interface SecondaryResourceBatchApi {
  actions: SecondaryResourceStore["actions"];
  cache: (type: SecondaryResourceType | string, jobId: unknown, payload: unknown, ownerGen?: number | string | null) => SecondaryResourcesState;
  clearForOtherJob: SecondaryResourceStore["actions"]["clearForOtherJob"];
  getSnapshot: () => SecondaryResourcesState;
  setInFlight: (type: SecondaryResourceType | string, value: unknown, ownerGen?: number | string | null) => SecondaryResourcesState;
}

export interface SecondaryResourceStatePort {
  store: SecondaryResourceStore;
  batch: (callback?: (api: SecondaryResourceBatchApi) => unknown) => unknown;
  getSnapshot: () => SecondaryResourcesState;
  isInFlight: (type: SecondaryResourceType | string) => boolean;
  fetchedAt: (type: SecondaryResourceType | string) => number;
  shouldRefresh: (type: SecondaryResourceType | string, intervalMs: number, force?: boolean) => boolean;
  setInFlight: (type: SecondaryResourceType | string, value: unknown, ownerGen?: number | string | null) => SecondaryResourcesState;
  clearInFlightForCurrentJob: (
    type: SecondaryResourceType | string,
    jobId: unknown,
    ownerGen?: number | string | null,
  ) => SecondaryResourcesState;
  cache: (
    type: SecondaryResourceType | string,
    jobId: unknown,
    payload: unknown,
    ownerGen?: number | string | null,
  ) => SecondaryResourcesState;
  clearForOtherJob: (
    type: SecondaryResourceType | string,
    jobId: unknown,
  ) => SecondaryResourcesState;
  cachedFor: (type: SecondaryResourceType | string, jobId: unknown) => unknown;
  sync: (
    type: SecondaryResourceType | string,
    jobId: unknown,
    payload: unknown,
  ) => unknown;
  reset: (options?: SecondaryResourceResetOptions) => SecondaryResourcesState;
}

export function createSecondaryResourceStatePort(
  state: object,
  {
    now = () => Date.now(),
  }: SecondaryResourceStatePortOptions = {},
): SecondaryResourceStatePort {
  const store = secondaryResourceStoreFor(state);
  function applyBatch(callback?: (api: SecondaryResourceBatchApi) => unknown) {
    if (typeof callback !== "function") {
      return store.getSnapshot();
    }
    const result = store.batch(({ actions }) => callback({
      actions,
      cache: (type, jobId, payload, ownerGen) => actions.cache(type, jobId, payload, now(), ownerGen),
      clearForOtherJob: actions.clearForOtherJob,
      getSnapshot: () => store.getSnapshot(),
      setInFlight: (type, value, ownerGen) => actions.setInFlight(type, value, ownerGen),
    }));
    return result;
  }
  return {
    store,
    batch: applyBatch,
    getSnapshot: () => store.getSnapshot(),
    isInFlight(type) {
      const record = store.getSnapshot()[type as SecondaryResourceType];
      return Boolean(record?.inFlight);
    },
    fetchedAt(type) {
      const record = store.getSnapshot()[type as SecondaryResourceType];
      return Number(record?.fetchedAt || 0);
    },
    shouldRefresh(type, intervalMs, force = false) {
      return shouldRefreshSecondary(this.fetchedAt(type), intervalMs, force);
    },
    setInFlight(type, value, ownerGen = undefined) {
      return applySecondaryResourceAction(
        state,
        (currentStore) => currentStore.actions.setInFlight(type, value, ownerGen),
      );
    },
    clearInFlightForCurrentJob(type, jobId, ownerGen = undefined) {
      const record = store.getSnapshot()[type as SecondaryResourceType];
      if (record?.jobId === jobId) {
        return this.setInFlight(type, false, ownerGen);
      }
      return store.getSnapshot();
    },
    cache(type, jobId, payload, ownerGen = undefined) {
      return applySecondaryResourceAction(
        state,
        (currentStore) => currentStore.actions.cache(type, jobId, payload, now(), ownerGen),
      );
    },
    clearForOtherJob(type, jobId) {
      return applySecondaryResourceAction(
        state,
        (currentStore) => currentStore.actions.clearForOtherJob(type, jobId),
      );
    },
    cachedFor(type, jobId) {
      const record = store.getSnapshot()[type as SecondaryResourceType];
      return record?.jobId === jobId ? record.payload : null;
    },
    sync(type, jobId, payload) {
      if (payload === null) {
        this.clearForOtherJob(type, jobId);
        return this.cachedFor(type, jobId);
      }
      this.cache(type, jobId, payload);
      return this.cachedFor(type, jobId);
    },
    reset({ preserveInFlight = false }: SecondaryResourceResetOptions = {}) {
      const current = store.getSnapshot();
      const next = Object.fromEntries(
        SECONDARY_RESOURCE_TYPES.map((type) => [
          type,
          {
            ...emptySecondaryResourceRecord(),
            inFlight: preserveInFlight ? Boolean(current[type]?.inFlight) : false,
            ownerGen: preserveInFlight ? (current[type]?.ownerGen ?? null) : null,
          },
        ]),
      ) as SecondaryResourcesState;
      return store.reset(next);
    },
  };
}
