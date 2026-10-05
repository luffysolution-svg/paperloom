import { createStore, type Store } from "@/platform/store/store.js";
import {
  SECONDARY_RESOURCE_TYPES,
  emptySecondaryResourceRecord,
  normalizeSecondaryResourcesState,
  secondaryResourceFields,
  type SecondaryResourceHostState,
  type SecondaryResourceRecord,
  type SecondaryResourcesState,
  type SecondaryResourceType,
} from "./secondary-resource-records.js";

// 副资源 store：把 events / manifest / stageActions 三个记录收敛为一个
// 不可变 store，并附带 generation 围栏的 in-flight 关断语义。

export type SecondaryResourceActions = {
  setInFlight(
    currentState: SecondaryResourcesState,
    type: SecondaryResourceType | string,
    value: unknown,
    ownerGen?: number | string | null,
  ): SecondaryResourcesState;
  cache(
    currentState: SecondaryResourcesState,
    type: SecondaryResourceType | string,
    jobId: unknown,
    payload: unknown,
    fetchedAt: unknown,
    ownerGen?: number | string | null,
  ): SecondaryResourcesState;
  clearForOtherJob(
    currentState: SecondaryResourcesState,
    type: SecondaryResourceType | string,
    jobId: unknown,
  ): SecondaryResourcesState;
  reset(currentState: SecondaryResourcesState): SecondaryResourcesState;
  resetWithInFlight(currentState: SecondaryResourcesState): SecondaryResourcesState;
};

export type SecondaryResourceStore = Store<SecondaryResourcesState, SecondaryResourceActions>;

export function createSecondaryResourceStore(
  initialState: SecondaryResourceHostState = {},
): SecondaryResourceStore {
  return createStore<SecondaryResourcesState, SecondaryResourceActions>({
    name: "secondaryResources",
    initialState: normalizeSecondaryResourcesState(initialState),
    actions: {
      setInFlight(currentState, type, value, ownerGen = undefined) {
        if (!secondaryResourceFields(type)) {
          return currentState;
        }
        const current = currentState[type as SecondaryResourceType] || emptySecondaryResourceRecord();
        const on = Boolean(value);
        // 异 gen 不清不覆：携带 ownerGen 的关断只允许同 gen 执行。
        if (!on && ownerGen !== undefined && current.ownerGen !== null && current.ownerGen !== undefined
          && ownerGen !== current.ownerGen) {
          return currentState;
        }
        return {
          ...currentState,
          [type]: {
            ...(currentState[type as SecondaryResourceType] || emptySecondaryResourceRecord()),
            inFlight: on,
            ownerGen: on
              ? (ownerGen !== undefined ? (ownerGen as number | string | null) : null)
              : null,
          },
        };
      },
      cache(currentState, type, jobId, payload, fetchedAt, ownerGen = undefined) {
        if (!secondaryResourceFields(type)) {
          return currentState;
        }
        const current = currentState[type as SecondaryResourceType] || emptySecondaryResourceRecord();
        // 异 gen 不覆：已有属主且来者 gen 不同时直接丢弃。
        if (ownerGen !== undefined && current.ownerGen !== null && current.ownerGen !== undefined
          && ownerGen !== current.ownerGen) {
          return currentState;
        }
        return {
          ...currentState,
          [type]: {
            payload,
            jobId: `${jobId || ""}`.trim(),
            fetchedAt: Number(fetchedAt || 0),
            inFlight: Boolean(currentState[type as SecondaryResourceType]?.inFlight),
            ownerGen: current.ownerGen ?? null,
          },
        };
      },
      clearForOtherJob(currentState, type, jobId) {
        if (!secondaryResourceFields(type)) {
          return currentState;
        }
        const current = currentState[type as SecondaryResourceType] || emptySecondaryResourceRecord();
        const normalizedJobId = `${jobId || ""}`.trim();
        if (!current.jobId || current.jobId === normalizedJobId) {
          return currentState;
        }
        return {
          ...currentState,
          [type]: {
            ...emptySecondaryResourceRecord(),
            inFlight: Boolean(current.inFlight),
            ownerGen: current.ownerGen ?? null,
          },
        };
      },
      reset(currentState) {
        return Object.fromEntries(
          SECONDARY_RESOURCE_TYPES.map((type) => [
            type,
            {
              ...emptySecondaryResourceRecord(),
              inFlight: Boolean(currentState[type]?.inFlight),
              ownerGen: currentState[type]?.ownerGen ?? null,
            },
          ]),
        ) as SecondaryResourcesState;
      },
      resetWithInFlight(currentState) {
        return currentState;
      },
    },
  });
}

const SECONDARY_RESOURCE_STORE_KEY = Symbol.for("retainpdf.secondaryResourceStore");

function asHostBag(state: object): SecondaryResourceHostState {
  return state as SecondaryResourceHostState;
}

function storeSlot(state: object): SecondaryResourceStore | undefined {
  return (state as Record<PropertyKey, unknown>)[SECONDARY_RESOURCE_STORE_KEY] as
    | SecondaryResourceStore
    | undefined;
}

/** 取（必要时挂载）host object 上的单例副资源 store。 */
export function secondaryResourceStoreFor(
  state: object | null | undefined,
): SecondaryResourceStore {
  if (!state || typeof state !== "object") {
    return createSecondaryResourceStore();
  }
  const existing = storeSlot(state);
  if (!existing) {
    Object.defineProperty(state, SECONDARY_RESOURCE_STORE_KEY, {
      configurable: false,
      enumerable: false,
      value: createSecondaryResourceStore(asHostBag(state)),
      writable: false,
    });
  }
  return storeSlot(state) as SecondaryResourceStore;
}

/** 在 host 的单例 store 上跑一次 action 并返回新快照。 */
export function applySecondaryResourceAction(
  state: object,
  action: (store: SecondaryResourceStore) => SecondaryResourcesState,
): SecondaryResourcesState {
  const store = secondaryResourceStoreFor(state);
  return action(store);
}
