import { inferTranslationProvider } from "@/platform/config/providers.js";

type ModelListViewPort = {
  elements?: () => {
    apiKeyInput?: { value?: string } | null;
    modelBaseUrlInput?: { value?: string } | null;
  };
  setTranslationModels?: (payload?: Record<string, unknown>) => void;
};

type ModelListElements = {
  apiKeyInput?: { value?: string } | null;
  modelBaseUrlInput?: { value?: string } | null;
};

export function createTranslationModelListFlow({
  apiPrefix,
  dialogElementsPort,
  currentProvider,
  listModels,
  viewPort,
}: {
  apiPrefix?: string;
  dialogElementsPort: { elements: () => ModelListElements };
  currentProvider: () => string;
  listModels?: (apiPrefix?: unknown, payload?: unknown) => Promise<unknown> | unknown;
  viewPort: ModelListViewPort;
}) {
  let requestId = 0;

  async function fetchModels() {
    const request = ++requestId;
    const elements = dialogElementsPort.elements();
    const apiKey = `${elements.apiKeyInput?.value || ""}`.trim();
    const baseUrl = `${elements.modelBaseUrlInput?.value || ""}`.trim();
    const provider = `${currentProvider() || inferTranslationProvider(baseUrl)}`.trim();
    if (!apiKey) {
      viewPort.setTranslationModels?.({
        items: [], loading: false, tone: "error", message: "请先填写 API Key。", provider, baseUrl,
      });
      return false;
    }
    if (!baseUrl) {
      viewPort.setTranslationModels?.({
        items: [], loading: false, tone: "error", message: "请先填写 API URL。", provider, baseUrl,
      });
      return false;
    }
    if (!listModels) {
      viewPort.setTranslationModels?.({
        items: [], loading: false, tone: "error", message: "当前版本暂不支持拉取模型，请手动填写。", provider, baseUrl,
      });
      return false;
    }
    viewPort.setTranslationModels?.({
      items: [], loading: true, tone: "pending", message: "正在拉取模型…", provider, baseUrl,
    });
    function isCurrent() {
      if (request !== requestId) return false;
      const current = dialogElementsPort.elements();
      if (`${current.apiKeyInput?.value || ""}`.trim() !== apiKey
        || `${current.modelBaseUrlInput?.value || ""}`.trim() !== baseUrl) {
        clear();
        return false;
      }
      return true;
    }
    try {
      const result = await listModels(apiPrefix, { api_key: apiKey, base_url: baseUrl });
      if (!isCurrent()) return false;
      const models = Array.isArray((result as any)?.models)
        ? (result as any).models.filter((item) => typeof item === "string" && item.trim())
        : [];
      const ok = (result as any)?.ok === true && models.length > 0;
      viewPort.setTranslationModels?.({
        items: models,
        loading: false,
        tone: ok ? "valid" : "error",
        message: ok
          ? `${(result as any)?.summary || `已获取 ${models.length} 个模型`}`
          : `${(result as any)?.summary || "未获取到模型，请手动填写。"}`,
        provider,
        baseUrl,
      });
      return ok;
    } catch (error) {
      if (!isCurrent()) return false;
      viewPort.setTranslationModels?.({
        items: [],
        loading: false,
        tone: "error",
        message: error instanceof Error ? error.message : "模型列表获取失败，请手动填写。",
        provider,
        baseUrl,
      });
      return false;
    }
  }

  function clear() {
    requestId += 1;
    viewPort.setTranslationModels?.({
      items: [], loading: false, tone: "", message: "", provider: "", baseUrl: "",
    });
  }

  return { fetchModels, clear };
}
