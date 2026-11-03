import { API_PREFIX } from "./api-constants.js";
import { isMockMode, runtimeConfig, setRuntimeConfig } from "./runtime.js";
import { buildRuntimeConfig, readStoredConfig, writeStoredConfig } from "./storage.js";
import { RESTORED_CONFIG_STORAGE_KEY } from "./storage-keys.js";
import {
  loadBrowserStoredConfig,
  loadDeveloperStoredConfig,
  savePersistedBrowserStoredConfig,
  savePersistedDeveloperStoredConfig,
} from "./persisted-config.js";
import { buildApiEndpoint, fetchProtected } from "../api/domains/http.js";

export function backupClientConfig() {
  return {
    browser_config: loadBrowserStoredConfig(),
    developer_config: loadDeveloperStoredConfig(),
  };
}

/** Apply once per completed restore, before credentials and first-run UI hydrate. */
export async function restoreBackupClientConfig() {
  if (isMockMode()) return null;
  const endpoint = buildApiEndpoint(API_PREFIX, "backups/restored-config");
  const response = await fetchProtected(endpoint);
  if (response.status === 404) return null;
  const body = await response.json();
  if (!response.ok) throw new Error(body?.message || "读取恢复的接口配置失败");
  const restored = body.data;
  if (!restored?.config || !restored.restored_at) return null;
  const applied = readStoredConfig(RESTORED_CONFIG_STORAGE_KEY);
  if (applied[endpoint] === restored.restored_at) return null;
  const browserConfig = restored.config.browser_config;
  const developerConfig = restored.config.developer_config;
  if (!browserConfig || typeof browserConfig !== "object" || Array.isArray(browserConfig)
    || !developerConfig || typeof developerConfig !== "object" || Array.isArray(developerConfig)) {
    throw new Error("备份中的接口配置格式无效，请重新导入完整迁移包");
  }
  await savePersistedBrowserStoredConfig(browserConfig);
  const persisted = await savePersistedDeveloperStoredConfig(developerConfig);
  setRuntimeConfig(buildRuntimeConfig(browserConfig, developerConfig, runtimeConfig));
  writeStoredConfig(RESTORED_CONFIG_STORAGE_KEY, { ...applied, [endpoint]: restored.restored_at });
  return persisted;
}
