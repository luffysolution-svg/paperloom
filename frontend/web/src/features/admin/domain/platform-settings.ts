// 平台设置表单的纯逻辑：读回的配置 → 表单、选服务自动带出地址 / 模型 / 协议、校验、
// 只提交填过的密钥、检测请求体、有没有改动、缺项和选项说成人话。接口见 docs/core/api/index.md 13.7。
import type { PlatformSettingsInput, PlatformSettingsView, PlatformTestInput, PlatformTestTarget } from "@retainpdf/api/admin-platform";
import {
  OCR_PROVIDER_DEFINITIONS,
  TRANSLATION_API_PROTOCOL_OPTIONS,
  TRANSLATION_PROVIDER_OPTIONS,
  TRANSLATION_THINKING_OPTIONS,
  inferTranslationProvider,
} from "@/platform/config/providers.js";

export type PlatformForm = {
  /** 翻译服务预设（qwen / deepseek / … / custom），只用来带出默认值，不提交。 */
  provider: string;
  baseUrl: string;
  model: string;
  apiProtocol: string;
  /** 思考深度；空 = 用默认。 */
  thinking: string;
  /** 单个任务的并发上限（输入框原文）；0 = 不限。 */
  maxWorkers: string;
  /** 新的 API Key；空 = 不改。 */
  apiKey: string;
  ocrProvider: string;
  /** 新的 OCR Token；空 = 不改。 */
  ocrToken: string;
};

const MISSING_LABELS: Record<string, string> = {
  translation_model: "翻译模型",
  translation_base_url: "翻译接口地址",
  translation_api_key: "翻译 API Key",
  ocr_provider: "OCR 服务",
  ocr_token: "OCR Token",
};

export const missingLabel = (key: string) => MISSING_LABELS[key] || key;

const labelOf = (options: ReadonlyArray<{ id: string; label: string }>, id: string) => options.find((o) => o.id === id)?.label || id;
export const protocolLabel = (id: string) => {
  const option = TRANSLATION_API_PROTOCOL_OPTIONS.find((o) => o.id === id);
  return option ? `${option.label}（${option.hint}）` : id;
};
export const thinkingLabel = (id: string) => (id ? labelOf(TRANSLATION_THINKING_OPTIONS, id) : "默认");
export const ocrProviderLabel = (id: string) => labelOf(OCR_PROVIDER_DEFINITIONS, id);
export const ocrTokenLabel = (id: string) => OCR_PROVIDER_DEFINITIONS.find((d) => d.id === id)?.tokenLabel || "OCR Token";

export function formFromView(view: PlatformSettingsView | null): PlatformForm {
  const t = view?.translation;
  const baseUrl = t?.base_url || "";
  return {
    provider: baseUrl ? inferTranslationProvider(baseUrl) : "deepseek",
    baseUrl,
    model: t?.model || "",
    apiProtocol: t?.api_protocol || "openai",
    thinking: t?.thinking || "",
    maxWorkers: `${t?.max_workers ?? 0}`,
    apiKey: "",
    ocrProvider: view?.ocr.provider || view?.options.ocr_providers[0] || OCR_PROVIDER_DEFINITIONS[0].id,
    ocrToken: "",
  };
}

/** 换翻译服务：预设带出地址、模型、协议；「自定义」保留当前填的。 */
export function applyTranslationProvider(form: PlatformForm, provider: string): PlatformForm {
  const preset = TRANSLATION_PROVIDER_OPTIONS.find((item) => item.id === provider);
  if (!preset || provider === "custom") return { ...form, provider: "custom" };
  return { ...form, provider, baseUrl: preset.baseUrl, model: preset.defaultModel, apiProtocol: preset.protocol };
}

/** 密钥输入框的占位：已配置显示末 4 位、留空不改。 */
export function secretPlaceholder(configured: boolean | undefined, hint: string | undefined, label: string): string {
  if (configured) return `已配置${hint ? ` ${hint}` : ""}，留空不改`;
  return `填写${label}`;
}

/** 换了 OCR 服务商：OCR 凭据带服务商标签，旧 token 用不了，必须填新的。 */
export function ocrProviderChanged(form: PlatformForm, view: PlatformSettingsView | null): boolean {
  return Boolean(view?.ocr.provider) && form.ocrProvider !== view?.ocr.provider;
}

/** 保存前的检查；没问题返回空串。 */
export function platformFormProblem(form: PlatformForm, view: PlatformSettingsView | null): string {
  if (!form.baseUrl.trim()) return "请填写翻译接口地址。";
  if (!/^https?:\/\//i.test(form.baseUrl.trim())) return "翻译接口地址要以 http:// 或 https:// 开头。";
  if (!form.model.trim()) return "请填写翻译模型。";
  const limit = view?.options.max_workers_limit ?? 64;
  const workers = form.maxWorkers.trim();
  if (!/^\d+$/.test(workers) || Number(workers) > limit) return `并发上限要填 0～${limit} 的整数（0 表示不限）。`;
  if (!form.apiKey.trim() && !view?.translation.api_key_configured) return "请填写翻译 API Key。";
  if (!form.ocrToken.trim()) {
    if (ocrProviderChanged(form, view)) return `换了 OCR 服务，要同时填 ${ocrTokenLabel(form.ocrProvider)}（旧的 token 在新服务下用不了）。`;
    if (!view?.ocr.token_configured) return `请填写 ${ocrTokenLabel(form.ocrProvider)}。`;
  }
  return "";
}

export function platformInput(form: PlatformForm): PlatformSettingsInput {
  const apiKey = form.apiKey.trim();
  const ocrToken = form.ocrToken.trim();
  return {
    translation: {
      model: form.model.trim(),
      base_url: form.baseUrl.trim(),
      api_protocol: form.apiProtocol,
      thinking: form.thinking,
      max_workers: Number(form.maxWorkers.trim()) || 0,
      ...(apiKey ? { api_key: apiKey } : {}),
    },
    ocr: { provider: form.ocrProvider, ...(ocrToken ? { token: ocrToken } : {}) },
  };
}

/** 检测用表单里当前的值（还没保存也行）；密钥没填就让后端用已保存的。 */
export function platformTestInput(form: PlatformForm, target: PlatformTestTarget): PlatformTestInput {
  const pick = (value: string) => (value.trim() ? value.trim() : undefined);
  if (target === "translation") {
    return { model: pick(form.model), base_url: pick(form.baseUrl), api_protocol: form.apiProtocol, api_key: pick(form.apiKey) };
  }
  return { provider: form.ocrProvider, token: pick(form.ocrToken) };
}

export function isPlatformFormDirty(form: PlatformForm, view: PlatformSettingsView | null): boolean {
  const saved = formFromView(view);
  return (
    form.baseUrl.trim() !== saved.baseUrl
    || form.model.trim() !== saved.model
    || form.apiProtocol !== saved.apiProtocol
    || form.thinking !== saved.thinking
    || (Number(form.maxWorkers.trim()) || 0) !== (Number(saved.maxWorkers) || 0)
    || form.ocrProvider !== saved.ocrProvider
    || Boolean(form.apiKey.trim())
    || Boolean(form.ocrToken.trim())
  );
}
