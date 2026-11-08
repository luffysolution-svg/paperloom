// workflow + upload 特性。

import { API_PREFIX } from "@/platform/config/api-constants.js";
import {
  apiBase,
  defaultModelApiKey,
  defaultModelBaseUrl,
  defaultModelName,
  defaultOcrProvider,
  defaultPaddleApiUrl,
  defaultPaddleToken,
} from "@/platform/config/runtime.js";
import {
  DEFAULT_FILE_LABEL,
  FRONT_MAX_BYTES,
  FRONT_MAX_PAGE_COUNT,
} from "@/platform/config/upload-constants.js";
import { savePersistedDeveloperStoredConfig } from "@/platform/config/persisted-config.js";
import {
  UploadStatePort,
  collectUploadFormData,
  countPdfPages,
  defaultWorkflowConfigPort,
  mountUploadFeature,
  mountWorkflowFeature,
} from "@/features/ingest/domain.js";
// isDesktopMode 在 state/desktop-state 与 config/desktop-persistence 各有一个同名
// 函数，签名不同（前者收 target，后者无参）。这里要的是前者。
import {
  getDeveloperConfig,
  resetDeveloperConfig,
  setDeveloperConfig,
  isDesktopMode,
} from "@/platform/desktop/state.js";
import {
  normalizeMathMode,
  normalizeWorkflow,
  workflowConstants,
} from "@/features/ingest/domain.js";
import type {
  AsyncFn,
  CredentialsStatePort,
  HomeFeatures,
  UploadFeature,
  WorkflowFeature,
} from "./types.js";

type WorkflowViewPort = {
  selectedGlossaryId: () => string;
  taskServiceSelection?: () => Record<string, string> | null;
  isOcrOnly?: () => boolean;
  viewPort: unknown;
};

type UploadViewPort = {
  viewPort: unknown;
  setUploadProgress: (loaded: number, total: number) => void;
  clearFileInputValue: () => void;
};

type CreateWorkflowAndUploadArgs = {
  features: HomeFeatures;
  credentialsStatePort: CredentialsStatePort;
  workflowView: WorkflowViewPort;
  uploadView: UploadViewPort;
  uploadStatePort: UploadStatePort;
  bridge: { resetUploadedFile: () => void; resetUploadProgress: () => void };
  legacyState: Record<string, unknown>;
  setText: (id: string, value?: string) => void;
  fetchGlossaries: AsyncFn;
  submitUploadRequest: AsyncFn;
};

export function createWorkflowAndUpload({
  features,
  credentialsStatePort,
  workflowView,
  uploadView,
  uploadStatePort,
  bridge,
  legacyState,
  setText,
  fetchGlossaries,
  submitUploadRequest,
}: CreateWorkflowAndUploadArgs): {
  workflowFeature: WorkflowFeature;
  uploadFeature: UploadFeature;
} {
  const constants = workflowConstants();

  function readSubmitValues({
    defaultOcrProvider: ocrProviderFallback,
    defaultPaddleToken: paddleTokenFallback,
    defaultModelApiKey: _modelApiKeyFallback,
  }: {
    defaultOcrProvider?: string;
    defaultPaddleToken?: string;
    defaultModelApiKey?: string;
  } = {}) {
    const credentials = credentialsStatePort.getCredentials();
    const ocrProvider = credentials?.ocrProvider || ocrProviderFallback;
    // 两家 OCR 分开读取本机 Token；引用仅兼容尚未迁移的旧配置。
    const ocrToken = credentialsStatePort.getOcrToken({
      providerId: ocrProvider,
      defaultPaddleToken: () => paddleTokenFallback || "",
    }) || "";
    return {
      ocrProvider,
      ocrCredentialRef: ocrToken ? "" : credentials?.ocrCredentialRef || "",
      ocrToken,
      translationCredentialRef: credentials?.modelApiKey ? "" : credentials?.translationCredentialRef || "",
      modelApiKey: credentials?.modelApiKey || _modelApiKeyFallback || "",
      selectedGlossaryId: workflowView.selectedGlossaryId(),
    };
  }

  const isOcrOnly = () => Boolean((workflowView as any).isOcrOnly?.() ?? false);

  function getUploadServiceOverrides() {
    const selection = workflowView.taskServiceSelection?.();
    const catalog = selection && features.browserCredentialsFeature?.getTaskServiceCatalog();
    if (!catalog) return null;
    const { ocr, translation, model } = catalog.resolve(selection);
    return {
      ocrProvider: ocr.provider,
      ocrToken: ocr.token,
      ocrCredentialRef: ocr.credentialRef,
      modelApiKey: translation.apiKey,
      translationCredentialRef: translation.credentialRef,
      model: model.trim(),
      baseUrl: translation.baseUrl,
      apiProtocol: translation.apiProtocol,
      workers: translation.workers,
    };
  }

  const workflowFeature = mountWorkflowFeature({
    configPort: defaultWorkflowConfigPort,
    saveDeveloperStoredConfig: savePersistedDeveloperStoredConfig,
    getDeepSeekBalanceState: () => {
      const selected = getUploadServiceOverrides();
      const current = credentialsStatePort.getCredentials();
      if (selected && (selected.modelApiKey !== current.modelApiKey || selected.translationCredentialRef !== current.translationCredentialRef)) {
        return { balanceCny: null, balanceChecked: false };
      }
      return credentialsStatePort.getDeepSeekBalanceState();
    },
    getDeveloperConfig: () => getDeveloperConfig(legacyState),
    getUploadState: uploadStatePort.getSnapshot,
    isDesktopMode: () => isDesktopMode(legacyState),
    resetDeveloperConfig: () => resetDeveloperConfig(legacyState),
    setDeveloperConfig: (config: Record<string, unknown>) => setDeveloperConfig(legacyState, config),
    defaultModelName,
    defaultModelBaseUrl,
    defaultPaddleApiUrl,
    defaultPaddleToken,
    defaultOcrProvider,
    defaultModelApiKey,
    defaultFileLabel: DEFAULT_FILE_LABEL,
    normalizeWorkflow,
    normalizeMathMode,
    constants,
    currentPageRanges: () => features.uploadFeature.currentPageRanges() || "",
    viewPort: workflowView.viewPort as import("@/features/ingest/domain.js").WorkflowViewPortLike,
    readSubmitValues,
    getUploadServiceOverrides,
    renderPageRangeSummary: () => features.uploadFeature.renderPageRangeSummary(),
    hasBrowserCredentials: () => {
      const selected = getUploadServiceOverrides();
      if (selected) {
        return Boolean((selected.ocrToken || selected.ocrCredentialRef)
          && (isOcrOnly() || (selected.baseUrl && selected.model && (selected.modelApiKey || selected.translationCredentialRef))));
      }
      if (isOcrOnly()) {
        const credentials = credentialsStatePort.getCredentials();
        const token = credentialsStatePort.getOcrToken({ defaultPaddleToken: () => defaultPaddleToken() }) || "";
        return Boolean(credentials.ocrCredentialRef || token);
      }
      return Boolean(features.browserCredentialsFeature.hasBrowserCredentials());
    },
    updateCredentialGate: (options?: unknown) => features.browserCredentialsFeature.updateCredentialGate(options),
    fetchGlossaries,
    apiPrefix: API_PREFIX,
    setText,
    isOcrOnly,
  }) as WorkflowFeature;

  // mountUploadFeature 签名要求 state，但 uploadStatePort 在运行时已足够；下层 nocheck 签名未放宽。
  const uploadFeature = mountUploadFeature({
    uploadStatePort,
    viewPort: uploadView.viewPort as import("@/features/ingest/domain.js").UploadViewPort,
    apiBase: typeof apiBase === "function" ? apiBase() : apiBase,
    apiPrefix: API_PREFIX,
    frontMaxBytes: FRONT_MAX_BYTES,
    frontMaxPageCount: FRONT_MAX_PAGE_COUNT,
    countPdfPages,
    defaultFileLabel: DEFAULT_FILE_LABEL,
    collectUploadFormData,
    submitUploadRequest: submitUploadRequest as import("@/features/ingest/domain.js").MountUploadFeatureOptions["submitUploadRequest"],
    resetUploadedFile: bridge.resetUploadedFile,
    resetUploadProgress: bridge.resetUploadProgress,
    setUploadProgress: uploadView.setUploadProgress,
    clearFileInputValue: uploadView.clearFileInputValue,
    setText,
    applyWorkflowMode: () => workflowFeature.applyWorkflowMode(),
    refreshSubmitControls: () => workflowFeature.refreshSubmitControls(),
    refreshDeepSeekBalance: null,
    workflowNeedsUpload: (workflow?: string) => workflowFeature.workflowNeedsUpload(workflow),
  }) as UploadFeature;

  return { workflowFeature, uploadFeature };
}
