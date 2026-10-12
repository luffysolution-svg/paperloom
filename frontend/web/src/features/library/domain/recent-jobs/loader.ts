import {
  RECENT_JOBS_LOADING_STATES,
} from "./loading-state-contract.js";
import {
  RECENT_JOBS_PAGE_SIZE,
} from "./pagination.js";
import { createLibraryBooksResource } from "./library-books-resource.js";
import {
  commitRecentJobsEmpty,
  commitRecentJobsError,
  commitRecentJobsNoMore,
  commitRecentJobsPage,
  type ActiveRefreshLoopPort,
  type RecentJobActionsPort,
  type RecentJobsCommitViewPort,
  type RecentJobsInvocationSummary,
} from "./commit.js";
import type { HomeStatePort } from "@/platform/contracts/home-view-contract.js";
import type { LibraryJobItem } from "./runtime-item.js";
import type { RecentJobsRuntimePatches } from "./runtime-patches.js";
import type { RecentJobsStatePort } from "./state.js";
import { libraryCardIdentityAliases } from "./library-card-identity.js";

export interface LoadRecentJobsOptions {
  reset?: boolean;
  silent?: boolean;
  query?: string;
}

export interface LibraryBooksPageData {
  collected?: LibraryJobItem[];
  hasMore?: boolean;
  latestInvocationSummary?: RecentJobsInvocationSummary;
  nextOffset?: number;
}

export interface LibraryBooksResourceSnapshot {
  status?: string;
  error?: unknown;
  data?: LibraryBooksPageData | null;
}

export interface LibraryBooksResourcePort {
  load: (
    params?: {
      startOffset?: number;
      pageSize?: number;
      existingJobIds?: Set<string> | string[];
      query?: string;
      onPreview?: (page: LibraryBooksPageData) => void;
    },
    options?: { cache?: boolean },
  ) => Promise<LibraryBooksResourceSnapshot>;
  invalidate?: () => void;
  reset?: (options?: { keepCache?: boolean }) => unknown;
}

export interface CreateRecentJobsLoaderOptions {
  fetchJobList?: (
    apiPrefix?: string,
    params?: Record<string, unknown>,
  ) => Promise<unknown>;
  fetchLibraryBookList?: (
    apiPrefix?: string,
    params?: Record<string, unknown>,
  ) => Promise<unknown>;
  apiPrefix?: string;
  getQuery?: () => string;
  recentJobActions?: RecentJobActionsPort;
  runtimePatches?: RecentJobsRuntimePatches;
  activeRefreshLoop?: (() => ActiveRefreshLoopPort | null | undefined) | null;
  scheduleAutoLoadIfNeeded?: (() => void) | null;
  homeStatePort?: Pick<HomeStatePort, "setRecentJobsLoadingState">;
  recentJobsStatePort?: Pick<
    RecentJobsStatePort,
    | "getSnapshot"
    | "resetPagination"
    | "batch"
    | "setOffset"
    | "setHasMore"
    | "setInvocationSummary"
    | "setItems"
  >;
  storeDrivenRendering?: boolean;
  viewPort?: RecentJobsCommitViewPort;
  libraryBooksResource?: LibraryBooksResourcePort;
}

export interface RecentJobsLoader {
  dispose: () => void;
  isLoading: () => boolean;
  load: (options?: LoadRecentJobsOptions) => Promise<void>;
}

export function createRecentJobsLoader({
  fetchJobList,
  fetchLibraryBookList,
  apiPrefix,
  getQuery,
  recentJobActions,
  runtimePatches,
  activeRefreshLoop,
  scheduleAutoLoadIfNeeded,
  homeStatePort,
  recentJobsStatePort,
  storeDrivenRendering = false,
  viewPort,
  libraryBooksResource = createLibraryBooksResource({
    fetchJobList,
    fetchLibraryBookList,
    apiPrefix,
  }) as LibraryBooksResourcePort,
}: CreateRecentJobsLoaderOptions): RecentJobsLoader {
  let loading = false;
  let pendingLoad: LoadRecentJobsOptions | null = null;
  let disposed = false;
  let loadGeneration = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let loadTimer: ReturnType<typeof setTimeout> | null = null;
  let cancelLoad: (() => void) | null = null;

  function isLoading() {
    return loading;
  }

  // 卸载后丢弃：回包不再写 store，不再追发 pending，避免已销毁视图被覆写。
  function dispose() {
    disposed = true;
    pendingLoad = null;
    cancelLoad?.();
    cancelLoad = null;
    if (retryTimer != null) clearTimeout(retryTimer);
    if (loadTimer != null) clearTimeout(loadTimer);
    retryTimer = null;
    loadTimer = null;
  }

  async function loadLibraryBooksPage(params: {
    startOffset?: number;
    pageSize?: number;
    existingJobIds?: Set<string> | string[];
    query?: string;
    onPreview?: (page: LibraryBooksPageData) => void;
  }): Promise<{
    collected: LibraryJobItem[];
    hasMore: boolean;
    latestInvocationSummary: RecentJobsInvocationSummary;
    nextOffset: number;
  }> {
    let snapshot: LibraryBooksResourceSnapshot;
    try {
      snapshot = await Promise.race([
        libraryBooksResource.load(params, { cache: false }),
        new Promise<never>((_, reject) => {
          cancelLoad = () => reject(new Error("读取书库已停止。"));
          loadTimer = setTimeout(() => {
            loadGeneration += 1;
            libraryBooksResource.reset?.({ keepCache: true });
            reject(new Error("读取书库超时，请稍后重试。"));
          }, 20_000);
        }),
      ]);
    } finally {
      if (loadTimer != null) clearTimeout(loadTimer);
      loadTimer = null;
      cancelLoad = null;
    }
    if (snapshot.status === "error") {
      if ((snapshot.error as Error)?.name === "TimeoutError") throw new Error("读取书库超时，请稍后重试。");
      throw snapshot.error || new Error("读取最近任务失败");
    }
    return (snapshot.data || {
      collected: [],
      hasMore: false,
      latestInvocationSummary: null,
      nextOffset: params.startOffset || 0,
    }) as {
      collected: LibraryJobItem[];
      hasMore: boolean;
      latestInvocationSummary: RecentJobsInvocationSummary;
      nextOffset: number;
    };
  }

  async function load({
    reset = false,
    silent = false,
    query = getQuery?.() || "",
  }: LoadRecentJobsOptions = {}): Promise<void> {
    if (disposed) {
      return;
    }
    if (loading) {
      pendingLoad = {
        reset: reset || Boolean(pendingLoad?.reset),
        silent: silent && pendingLoad?.silent !== false,
        query,
      };
      return;
    }
    if (!viewPort.hasView()) {
      return;
    }
    if (retryTimer != null) clearTimeout(retryTimer);
    retryTimer = null;
    const generation = ++loadGeneration;
    loading = true;
    if (!silent) {
      homeStatePort.setRecentJobsLoadingState(RECENT_JOBS_LOADING_STATES.LOADING);
    }
    if (reset) {
      recentJobsStatePort.resetPagination();
      if (!silent) {
        viewPort.renderLoading();
      }
    } else {
      viewPort.setLoadMoreLoading();
    }

    try {
      const { offset, items: previousItems } = recentJobsStatePort.getSnapshot();
      const existingJobIds = new Set(
        (reset ? [] : previousItems)
          .flatMap((item) => libraryCardIdentityAliases(item))
          .filter(Boolean),
      );
      const {
        collected,
        hasMore,
        latestInvocationSummary,
        nextOffset,
      } = await loadLibraryBooksPage({
        startOffset: reset ? 0 : offset,
        pageSize: RECENT_JOBS_PAGE_SIZE,
        existingJobIds,
        query,
        onPreview: ({ collected = [] }) => {
          if (disposed || generation !== loadGeneration || pendingLoad?.reset || !collected.length) return;
          // Initial empty view only: refreshes retain already hydrated cards.
          if (recentJobsStatePort.getSnapshot().items.length) return;
          const items = runtimePatches.applyExisting?.(collected) || collected;
          recentJobsStatePort.setItems(items);
          homeStatePort.setRecentJobsLoadingState(RECENT_JOBS_LOADING_STATES.READY);
          if (!storeDrivenRendering) {
            viewPort.renderList({
              items, allItems: items, reset: true,
              onSelect: recentJobActions?.selectJob,
              onDelete: recentJobActions?.deleteJob,
              onReader: recentJobActions?.openJobReader,
            });
          }
        },
      });

      if (disposed || pendingLoad?.reset) {
        return;
      }
      if (reset && collected.length === 0) {
        commitRecentJobsEmpty({
          query,
          invocationSummary: latestInvocationSummary,
          homeStatePort,
          recentJobsStatePort,
          storeDrivenRendering,
          viewPort,
        });
        return;
      }
      if (!reset && collected.length === 0) {
        commitRecentJobsNoMore({
          homeStatePort,
          recentJobsStatePort,
          storeDrivenRendering,
          viewPort,
        });
        return;
      }

      commitRecentJobsPage({
        reset,
        collected,
        hasMore,
        nextOffset,
        invocationSummary: latestInvocationSummary,
        query,
        recentJobActions,
        runtimePatches,
        activeRefreshLoop,
        scheduleAutoLoadIfNeeded,
        recentJobsStatePort,
        storeDrivenRendering,
        viewPort,
      });
      homeStatePort.setRecentJobsLoadingState(RECENT_JOBS_LOADING_STATES.READY);
    } catch (err) {
      if (disposed || pendingLoad?.reset) return;
      commitRecentJobsError({
        error: err as { message?: string } | Error | null,
        reset,
        homeStatePort,
        recentJobsStatePort,
        storeDrivenRendering,
        viewPort,
      });
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void load({ reset: true, silent: true, query: getQuery?.() || query });
      }, 3_000);
    } finally {
      loading = false;
      if (!disposed && pendingLoad) {
        const nextLoad = pendingLoad;
        pendingLoad = null;
        window.setTimeout(() => {
          void load(nextLoad);
        }, 0);
      } else {
        pendingLoad = null;
      }
    }
  }

  return {
    dispose,
    isLoading,
    load,
  };
}
