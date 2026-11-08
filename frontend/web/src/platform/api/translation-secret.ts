import { fetchJobPayload } from "@retainpdf/api/jobs";
import { loadBrowserStoredConfig, loadDeveloperStoredConfig } from "../config/persisted-config.js";
import { defaultModelBaseUrl } from "../config/runtime.js";

function endpoint(value: unknown): string {
  const url = new URL(`${value || ""}`.trim());
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.href;
}

/** 同一模型接口续跑时使用当前密钥，保留原任务参数及调用方的显式覆盖。 */
export async function withCurrentTranslationSecret(
  jobId: string,
  apiPrefix: string | undefined,
  body: Record<string, any> = {},
): Promise<Record<string, any>> {
  const overrides = body.overrides || {};
  const translation = overrides.translation || {};
  if (Object.hasOwn(translation, "api_key") || Object.hasOwn(translation, "credential_ref")) return body;
  const saved = loadBrowserStoredConfig();
  const apiKey = `${saved.modelApiKey || ""}`.trim();
  const credentialRef = `${saved.translationCredentialRef || ""}`.trim();
  if (!jobId || (!apiKey && !credentialRef)) return body;
  try {
    const job = await fetchJobPayload(jobId, { apiPrefix, signal: AbortSignal.timeout(10_000) });
    const target = translation.base_url || (job as any).request_payload?.translation?.base_url;
    const current = loadDeveloperStoredConfig().baseUrl || defaultModelBaseUrl();
    if (!target || endpoint(target) !== endpoint(current)) return body;
  } catch {
    return body;
  }
  return {
    ...body,
    overrides: {
      ...overrides,
      translation: { ...translation, ...(apiKey ? { api_key: apiKey } : { credential_ref: credentialRef }) },
    },
  };
}
