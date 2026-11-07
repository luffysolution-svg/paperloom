import { normalizeOcrProvider } from "@/platform/config/providers.js";

export function syncCredentialDialogFields({
  credentials,
  taskOptions = {},
  defaultModelBaseUrl,
  defaultModelApiKey,
  elementsPort,
}: any) {
  const {
    paddleInput,
    mineruInput,
    apiKeyInput,
    modelBaseUrlInput,
    modelNameInput,
    translationWorkersInput,
    mathModeSelect,
    translationProtocolSelect,
  } = elementsPort.elements();

  if (paddleInput) {
    paddleInput.value = credentials.paddleToken || "";
    delete paddleInput.dataset?.clearCredential;
  }
  if (mineruInput) {
    mineruInput.value = credentials.mineruToken || "";
    delete mineruInput.dataset?.clearCredential;
  }
  if (apiKeyInput) {
    apiKeyInput.value = credentials.modelApiKey || defaultModelApiKey?.() || "";
    delete apiKeyInput.dataset?.clearCredential;
  }
  if (modelBaseUrlInput) {
    modelBaseUrlInput.value = taskOptions.baseUrl || defaultModelBaseUrl?.() || "";
    elementsPort.syncTranslationProvider?.(modelBaseUrlInput.value);
  }
  if (translationProtocolSelect) translationProtocolSelect.value = taskOptions.apiProtocol || "openai";
  if (modelNameInput) {
    modelNameInput.value = taskOptions.model || "";
  }
  if (translationWorkersInput) {
    translationWorkersInput.value = `${taskOptions.workers || 50}`;
  }
  if (mathModeSelect) {
    mathModeSelect.value = taskOptions.mathMode === "placeholder" ? "placeholder" : "direct_typst";
  }
  elementsPort.syncOcrProviderControls(normalizeOcrProvider(credentials.ocrProvider));
}
