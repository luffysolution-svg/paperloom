import { createStore, type Store } from "@/platform/store/store.js";

export const JOB_POLL_INTERVAL_MS = 1000;

/** 瞬态失败指数退避：基线 1s ×2 / 上限 15s（1s→2s→4s→8s→15s→…）。 */
export const JOB_POLL_BACKOFF_FACTOR = 2;
export const JOB_POLL_MAX_INTERVAL_MS = 15000;

/**
 * 按连续瞬态失败次数算下一次轮询间隔（纯函数）。
 * failures<=1 取基线，之后按 factor 指数增长，maxMs 封顶。
 */
export function nextJobPollBackoffDelay(
  failures: number,
  baseMs: number = JOB_POLL_INTERVAL_MS,
  maxMs: number = JOB_POLL_MAX_INTERVAL_MS,
): number {
  const attempts = Math.max(0, Math.floor(Number(failures) || 0));
  if (attempts <= 1) return baseMs;
  let delay = baseMs;
  for (let i = 1; i < attempts; i += 1) {
    delay = Math.min(delay * JOB_POLL_BACKOFF_FACTOR, maxMs);
    if (delay >= maxMs) break;
  }
  return Math.min(delay, maxMs);
}

const RUNTIME_POLLING_STORE_KEY = Symbol.for("retainpdf.runtimePollingStore");

/** Normalized runtime-polling sub-store snapshot. */
export interface RuntimePollingState {
  jobId: string;
  generation: number;
  pollInFlight: boolean;
  /** 在途时又来一拍的合并标记，finishPoll 消费后补发一次。 */
  pollPending: boolean;
}

/** Host-state or partial fields accepted when seeding the store. */
export type RuntimePollingInitialState = Partial<RuntimePollingState> & {
  currentJobId?: string;
  currentJobPollGeneration?: number;
  currentJobPollInFlight?: boolean;
  currentJobPollPending?: boolean;
  currentJobStartedAt?: string;
  /** DOM / Node timer handle (number or Timeout depending on lib). */
  timer?: unknown;
  [key: string]: unknown;
};

export type IntervalClearFn = (handle?: unknown) => void;
export type IntervalSetFn = (
  handler: (...args: unknown[]) => void,
  timeout?: number,
  ...args: unknown[]
) => unknown;

export interface RuntimePollingStatePortOptions {
  clearIntervalFn?: IntervalClearFn;
  setIntervalFn?: IntervalSetFn;
  now?: () => string;
}

/**
 * 轮询引擎纯状态机（无副作用，不碰 timer/host/store）。
 *
 * 状态转换图（generation 是并发围栏，单调递增）：
 * ```
 *   idle --start(jobId)--> armed[generation+1, inFlight=false, pending=false]
 *   armed --begin()--> inFlight=true[generation 不变]
 *   inFlight --begin()--> pending=true（合并拍，不丢拍，generation 不变）
 *   inFlight --finish(gen)--> armed[inFlight=false] + 返回 hadPending（调用方补发一次）
 *   pending --finish(gen)--> armed[pending=false, inFlight=false] + 返回 true
 *   any --stop()--> idle[generation+1, inFlight=false, pending=false]
 *   决议后 --isCurrent(jobId, gen)--> 失配丢弃 / 命中继续 render→publish→schedule
 * ```
 * port 只做副作用编排（清 timer、写 startedAt、调 store），转换逻辑原样委托下述纯函数。
 */

export type RuntimePollingActions = {
  stop(currentState: RuntimePollingState): RuntimePollingState;
  beginPoll(currentState: RuntimePollingState): RuntimePollingState;
  finishPoll(currentState: RuntimePollingState): RuntimePollingState;
  startJob(currentState: RuntimePollingState, jobId: unknown): RuntimePollingState;
};

/** 纯状态机四操作 + generation 判定：现有逻辑原样搬运，无副作用。 */
export function pollingStartState(currentState: RuntimePollingState, jobId: unknown): RuntimePollingState {
  return {
    ...currentState,
    jobId: `${jobId || ""}`.trim(),
    generation: Number(currentState.generation || 0) + 1,
    pollInFlight: false,
    pollPending: false,
  };
}

export function pollingStopState(currentState: RuntimePollingState): RuntimePollingState {
  // 旧 fetch 决议后靠 generation 失配直接返回，不再清新轮询的 pollInFlight。
  return {
    ...currentState,
    generation: Number(currentState.generation || 0) + 1,
    pollInFlight: false,
    pollPending: false,
  };
}

export function pollingBeginState(currentState: RuntimePollingState): RuntimePollingState {
  // 在途不再返 null 丢拍：合并为 pending，由 finishPoll 消费补发一次。
  if (currentState.pollInFlight) {
    return { ...currentState, pollPending: true };
  }
  return { ...currentState, pollInFlight: true };
}

export function pollingFinishState(currentState: RuntimePollingState): RuntimePollingState {
  if (currentState.pollPending) {
    return { ...currentState, pollPending: false, pollInFlight: false };
  }
  return { ...currentState, pollInFlight: false };
}

/** generation 守卫纯判定：jobId + generation 双匹配才算当前轮。 */
export function isPollingCurrentGeneration(
  snapshot: RuntimePollingState,
  jobId: unknown,
  generation: unknown,
): boolean {
  return snapshot.jobId === jobId && Number(generation) === Number(snapshot.generation || 0);
}

/** finish 守卫纯判定：失配直接 false，不清在途。 */
export function acceptsPollingFinish(snapshot: RuntimePollingState, generation: unknown): boolean {
  if (generation === undefined || generation === null) return true;
  return Number(generation) === Number(snapshot.generation || 0);
}

export type RuntimePollingStore = Store<RuntimePollingState, RuntimePollingActions>;

export interface RuntimePollingStartResult {
  generation: number;
  startedAt: string;
}

export interface RuntimePollingStatePort {
  store: RuntimePollingStore;
  getSnapshot: () => RuntimePollingState;
  stop: () => RuntimePollingState;
  beginPoll: () => number | null;
  /** 返回 true 表示消费掉一次合并待发，调用方需补发一次。 */
  finishPoll: (generation?: unknown) => boolean;
  isCurrentGeneration: (jobId: unknown, generation: unknown) => boolean;
  startJob: (jobId: unknown) => RuntimePollingStartResult;
  startTimer: (
    callback: (...args: unknown[]) => void,
    intervalMs?: number,
  ) => unknown;
  /**
   * 暂停轮询 timer（页面不可见用）：只清 timer，不涨 generation、
   * 不碰在途状态；可见恢复时由调用方 startTimer 重启 + 补拉一次。
   */
  pauseTimer: () => void;
}

function normalizePollingState(
  initialState: RuntimePollingInitialState = {},
): RuntimePollingState {
  return {
    jobId: `${initialState.jobId ?? initialState.currentJobId ?? ""}`.trim(),
    generation: Number(initialState.generation ?? initialState.currentJobPollGeneration ?? 0),
    pollInFlight: Boolean(initialState.pollInFlight ?? initialState.currentJobPollInFlight),
    pollPending: Boolean(
      (initialState as RuntimePollingInitialState).pollPending
        ?? initialState.currentJobPollPending
        ?? false,
    ),
  };
}

export function createRuntimePollingStore(
  initialState: RuntimePollingInitialState = {},
): RuntimePollingStore {
  return createStore<RuntimePollingState, RuntimePollingActions>({
    name: "runtimePolling",
    initialState: normalizePollingState(initialState),
    actions: {
      stop: (currentState) => pollingStopState(currentState),
      beginPoll: (currentState) => pollingBeginState(currentState),
      finishPoll: (currentState) => pollingFinishState(currentState),
      startJob: (currentState, jobId) => pollingStartState(currentState, jobId),
    },
  });
}

function asPollingHost(state: object): RuntimePollingInitialState {
  return state as RuntimePollingInitialState;
}

function pollingStoreSlot(state: object): RuntimePollingStore | undefined {
  return (state as Record<PropertyKey, unknown>)[RUNTIME_POLLING_STORE_KEY] as
    | RuntimePollingStore
    | undefined;
}

export function runtimePollingStoreFor(
  state: object | null | undefined,
): RuntimePollingStore {
  if (!state || typeof state !== "object") {
    return createRuntimePollingStore();
  }
  const existing = pollingStoreSlot(state);
  if (!existing) {
    Object.defineProperty(state, RUNTIME_POLLING_STORE_KEY, {
      configurable: false,
      enumerable: false,
      value: createRuntimePollingStore(asPollingHost(state)),
      writable: false,
    });
  }
  return pollingStoreSlot(state) as RuntimePollingStore;
}

function applyRuntimePollingAction(
  state: object,
  action: (store: RuntimePollingStore) => RuntimePollingState,
): RuntimePollingState {
  const store = runtimePollingStoreFor(state);
  return action(store);
}

export function createRuntimePollingStatePort(
  state: object,
  {
    clearIntervalFn = clearInterval as IntervalClearFn,
    setIntervalFn = setInterval as IntervalSetFn,
    now = () => new Date().toISOString(),
  }: RuntimePollingStatePortOptions = {},
): RuntimePollingStatePort {
  const host = asPollingHost(state);
  const store = runtimePollingStoreFor(state);
  return {
    store,
    getSnapshot: () => store.getSnapshot(),
    stop() {
      if (host?.timer) {
        clearIntervalFn(host.timer);
        host.timer = null;
      }
      return applyRuntimePollingAction(state, (currentStore) => currentStore.actions.stop());
    },
    beginPoll() {
      const snapshot = applyRuntimePollingAction(state, (currentStore) => currentStore.actions.beginPoll());
      return snapshot.generation;
    },
    finishPoll(generation?: unknown) {
      const current = store.getSnapshot();
      if (!acceptsPollingFinish(current, generation)) {
        return false;
      }
      const hadPending = Boolean(current.pollPending);
      applyRuntimePollingAction(state, (currentStore) => currentStore.actions.finishPoll());
      return hadPending;
    },
    isCurrentGeneration(jobId, generation) {
      return isPollingCurrentGeneration(store.getSnapshot(), jobId, generation);
    },
    startJob(jobId) {
      const snapshot = applyRuntimePollingAction(
        state,
        (currentStore) => currentStore.actions.startJob(jobId),
      );
      if (host && !host.currentJobStartedAt) {
        host.currentJobStartedAt = now();
      }
      return {
        generation: Number(snapshot.generation || 0),
        startedAt: `${host?.currentJobStartedAt || ""}`,
      };
    },
    startTimer(callback, intervalMs = JOB_POLL_INTERVAL_MS) {
      if (host?.timer) {
        clearIntervalFn(host.timer);
      }
      const timer = setIntervalFn(callback, intervalMs);
      if (host) {
        host.timer = timer;
      }
      return timer;
    },
    pauseTimer() {
      if (host?.timer) {
        clearIntervalFn(host.timer);
        host.timer = null;
      }
    },
  };
}

export function stopPolling(state: unknown) {
  createRuntimePollingStatePort(state as object).stop();
}

export function beginJobPoll(state: unknown) {
  return createRuntimePollingStatePort(state as object).beginPoll();
}

export function finishJobPoll(state: unknown) {
  createRuntimePollingStatePort(state as object).finishPoll();
}

export function isCurrentJobGeneration(
  state: unknown,
  jobId: unknown,
  generation: unknown,
) {
  return createRuntimePollingStatePort(state as object).isCurrentGeneration(jobId, generation);
}

export function startRuntimeJob(state: unknown, jobId: unknown) {
  return createRuntimePollingStatePort(state as object).startJob(jobId);
}

export function startPollingTimer(
  state: unknown,
  callback: (...args: unknown[]) => void,
  intervalMs = JOB_POLL_INTERVAL_MS,
) {
  createRuntimePollingStatePort(state as object).startTimer(callback, intervalMs);
}
