import { getOcrProviderDefinition, getTranslationProviderDefinition, inferTranslationProvider, OCR_PROVIDER_DEFINITIONS } from "@/platform/config/providers.js";
import type { CredentialsFields } from "./state.js";
import type { ServiceProfile } from "./service-profiles.js";
import { cachedAiConnections } from "@retainpdf/api";

type TranslationSettings = Record<string, unknown>;
export type TaskServiceSelection = { profileId?: string; ocrId?: string; translationId?: string; model?: string };

export function buildTaskServiceCatalog({ credentials, translation, profiles = [] }: {
  credentials: Partial<CredentialsFields>;
  translation: TranslationSettings;
  profiles?: ServiceProfile[];
}) {
  const ocr: { id: string; label: string; provider: string; token: string; credentialRef: string; configured: boolean }[] = [];
  const translations: { id: string; connectionId?: string; label: string; provider: string; baseUrl: string; apiProtocol: "openai" | "openai_responses" | "anthropic"; apiKey: string; credentialRef: string; model: string; models: string[]; workers: number; configured: boolean }[] = [];

  function addOcr(id: string, provider: string, source: Partial<CredentialsFields>, name = "") {
    const definition = getOcrProviderDefinition(provider);
    const token = `${source[definition.runtimeConfigKey as keyof CredentialsFields] || ""}`.trim();
    const credentialRef = source.ocrProvider === provider && !token ? `${source.ocrCredentialRef || ""}`.trim() : "";
    const existing = ocr.find((item) => item.provider === provider && item.token === token && item.credentialRef === credentialRef);
    if (existing) return existing.id;
    const configured = Boolean(token || credentialRef);
    ocr.push({ id, provider, token, credentialRef, configured, label: `${definition.label}${name ? ` · ${name}` : ""}${configured ? "" : "（未配置）"}` });
    return id;
  }

  function addTranslation(id: string, settings: TranslationSettings, apiKey: string, credentialRef = "", name = "") {
    const baseUrl = `${settings.baseUrl || ""}`.trim();
    const provider = `${settings.translationProvider || inferTranslationProvider(baseUrl)}`;
    const definition = getTranslationProviderDefinition(provider);
    const model = `${settings.model || ""}`.trim();
    const apiProtocol = (settings.apiProtocol || "openai") as "openai" | "openai_responses" | "anthropic";
    const key = apiKey.trim();
    const ref = key ? "" : credentialRef.trim();
    const existing = translations.find((item) => item.baseUrl === baseUrl && item.apiProtocol === apiProtocol && item.apiKey === key && item.credentialRef === ref);
    if (existing) {
      if (model && !existing.models.includes(model)) existing.models.push(model);
      return existing.id;
    }
    translations.push({
      id, provider, baseUrl, apiProtocol, apiKey: key, credentialRef: ref, model, models: model ? [model] : [],
      workers: Math.min(definition.maxWorkers, Math.max(1, Number(settings.workers) || definition.defaultWorkers)),
      configured: Boolean(baseUrl && (key || ref)),
      label: `${definition.label}${name ? ` · ${name}` : ""}`,
    });
    return id;
  }

  const currentOcrIds = Object.fromEntries(OCR_PROVIDER_DEFINITIONS.map(({ id }) => [id, addOcr(`current:${id}`, id, credentials)]));
  const defaultOcrId = currentOcrIds[credentials.ocrProvider || "paddle"];
  const defaultTranslationId = addTranslation("current", translation, credentials.modelApiKey || "", credentials.translationCredentialRef || "");

  function addStoredTranslations(prefix: string, settings: TranslationSettings, name = "") {
    const stored = (settings.translationProfiles || {}) as Record<string, TranslationSettings>;
    for (const [provider, config] of Object.entries(stored)) {
      if (typeof config?.apiKey !== "string" || !config.apiKey.trim()) continue;
      addTranslation(`${prefix}:${provider}`, { ...config, translationProvider: provider }, config.apiKey, "", name);
    }
  }
  addStoredTranslations("provider", translation);
  const presets = profiles.map((profile) => {
    const source = profile.credentials;
    const ocrId = addOcr(`profile:${profile.id}:ocr`, source.ocrProvider, source, profile.name);
    for (const { id } of OCR_PROVIDER_DEFINITIONS) {
      if (id !== source.ocrProvider && source[getOcrProviderDefinition(id).runtimeConfigKey as keyof CredentialsFields]) {
        addOcr(`profile:${profile.id}:${id}`, id, source, profile.name);
      }
    }
    const translationId = addTranslation(`profile:${profile.id}`, profile.translation, source.modelApiKey || "", source.translationCredentialRef || "", profile.name);
    addStoredTranslations(`profile:${profile.id}:provider`, profile.translation, profile.name);
    return { id: profile.id, name: profile.name, ocrId, translationId, model: `${profile.translation.model || ""}`.trim() };
  });

  for (const connection of cachedAiConnections().filter((c) => c.kind === "byok" && c.api_key_configured)) {
    translations.push({ id: `connection:${connection.id}`, connectionId: connection.id, label: `${connection.name} · AI 连接`,
      provider: inferTranslationProvider(connection.base_url), baseUrl: connection.base_url, apiProtocol: connection.api_protocol,
      apiKey: "", credentialRef: "", model: connection.model, models: [...new Set([connection.model, ...connection.models])], workers: 5, configured: true });
  }

  function resolve(selection: TaskServiceSelection = {}) {
    const ocrService = ocr.find((item) => item.id === selection.ocrId) || ocr.find((item) => item.id === defaultOcrId)!;
    const translationService = translations.find((item) => item.id === selection.translationId) || translations[0];
    return { ocr: ocrService, translation: translationService, model: selection.model === undefined ? translationService.model : selection.model };
  }

  return { ocr, translations, profiles: presets, defaultOcrId, defaultTranslationId, resolve };
}

export type TaskServiceCatalog = ReturnType<typeof buildTaskServiceCatalog>;

export function createTaskServiceAccess({ getCredentials, getTaskOptions, getProfiles, defaultPaddleToken, defaultModelApiKey, defaultModelBaseUrl }: {
  getCredentials: () => CredentialsFields;
  getTaskOptions?: () => unknown;
  getProfiles: () => ServiceProfile[];
  defaultPaddleToken?: () => string;
  defaultModelApiKey?: () => string;
  defaultModelBaseUrl?: () => string;
}) {
  const options = () => (getTaskOptions?.() || {}) as TranslationSettings;
  return {
    getTaskServiceCatalog: () => {
      const current = getCredentials();
      return buildTaskServiceCatalog({
        credentials: {
          ...current,
          paddleToken: current.paddleToken || defaultPaddleToken?.() || "",
          modelApiKey: current.modelApiKey || defaultModelApiKey?.() || "",
        },
        translation: { baseUrl: defaultModelBaseUrl?.() || "", ...options() },
        profiles: getProfiles(),
      });
    },
    getTranslationConfig: () => {
      const config = options();
      const baseUrl = `${config.baseUrl || defaultModelBaseUrl?.() || ""}`.trim();
      return {
        provider: `${config.translationProvider || inferTranslationProvider(baseUrl)}`.trim(),
        model: `${config.model || ""}`.trim(),
        workers: Number(config.workers) || 0,
        baseUrl,
        apiProtocol: config.apiProtocol || "openai",
      };
    },
  };
}
