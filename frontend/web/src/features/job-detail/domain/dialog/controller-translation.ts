// 翻译调试 tab：组合 translation-data-port + translation-tab-coordinator，
// render* 回调改为把 translationState 浅拷贝镜像进 store。

import type { StatusDetailRuntimePort } from "../status-detail-runtime-port.js";
import type { StatusDetailStore, StatusDetailTranslation } from "../status-detail-store.js";
import {
  createStatusDetailTranslationDataPort,
} from "./translation-data-port.js";
import {
  createTranslationState,
} from "./translation-state.js";
import {
  createStatusDetailTranslationTabCoordinator,
} from "./translation-tab-coordinator.js";
import type { StatusDetailControllerDeps } from "./controller-types.js";

export function createStatusDetailTranslationActions({
  runtimePort,
  apiPrefix,
  fetchTranslationDiagnostics,
  fetchTranslationItems,
  fetchTranslationItem,
  replayTranslationItem,
  store,
}: {
  runtimePort: StatusDetailRuntimePort;
  apiPrefix?: string;
  fetchTranslationDiagnostics: StatusDetailControllerDeps["fetchTranslationDiagnostics"];
  fetchTranslationItems: StatusDetailControllerDeps["fetchTranslationItems"];
  fetchTranslationItem: StatusDetailControllerDeps["fetchTranslationItem"];
  replayTranslationItem: StatusDetailControllerDeps["replayTranslationItem"];
  store: StatusDetailStore;
}) {
  function getCurrentJobId() {
    return runtimePort.currentJobId();
  }

  // ---- translation(translation-data-port.js + translation-tab-coordinator.js
  //      保留;render* 回调改成"浅拷贝 translationState 写 store"——store 的
  //      translation 段就是这份状态袋的镜像,加少量纯 UI 态(*Loading/
  //      *ErrorText)) ----
  const translationState = createTranslationState();
  const dataPort = createStatusDetailTranslationDataPort({
    translationState,
    apiPrefix,
    currentJobId: getCurrentJobId,
    fetchTranslationDiagnostics,
    fetchTranslationItems,
    fetchTranslationItem,
    replayTranslationItem,
  });

  function syncTranslation(extra: Partial<StatusDetailTranslation> = {}) {
    store.actions.setTranslation({ ...translationState, ...extra });
  }

  const translationTab = createStatusDetailTranslationTabCoordinator({
    dataPort,
    renderEmpty: (message: string) => syncTranslation({
      emptyMessage: message,
      itemsLoading: false,
      itemDetailLoading: false,
    }),
    renderSummary: () => syncTranslation({ emptyMessage: "" }),
    renderItems: (options: { loading?: boolean; emptyText?: string } = {}) => syncTranslation({
      itemsLoading: Boolean(options.loading),
      itemsErrorText: options.loading ? "" : (options.emptyText || ""),
    }),
    renderItemDetail: (options: { loading?: boolean } = {}) => syncTranslation({
      itemDetailLoading: Boolean(options.loading),
    }),
    renderReplay: () => syncTranslation({ replayLoading: false }),
    setReplayLoading: (payload: { hasResult?: boolean } | null) => syncTranslation({
      replayLoading: Boolean(payload && !payload.hasResult),
    }),
  });

  async function ensureTranslationData({ force = false }: { force?: boolean } = {}) {
    await translationTab.ensureLoaded({ force });
  }

  async function applyTranslationFilter(query: { finalStatus?: string; q?: string }) {
    await translationTab.applyFilter(query);
  }

  async function changeTranslationPage(direction: string) {
    await translationTab.changePage(direction);
  }

  async function selectTranslationItem(itemId: string) {
    const normalizedItemId = `${itemId || ""}`.trim();
    if (!normalizedItemId) {
      return;
    }
    try {
      await translationTab.loadItem(getCurrentJobId(), normalizedItemId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      syncTranslation({ itemErrorText: message, itemDetailLoading: false });
    }
  }

  async function replayCurrentItem() {
    try {
      await translationTab.replaySelected();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      syncTranslation({ replayErrorText: message, replayLoading: false });
    }
  }

  return {
    ensureTranslationData,
    applyTranslationFilter,
    changeTranslationPage,
    selectTranslationItem,
    replayCurrentItem,
  };
}
