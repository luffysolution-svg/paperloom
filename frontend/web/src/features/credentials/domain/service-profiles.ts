import {
  fetchAgentRuntimeConfig,
  updateAgentRuntimeConfig,
  type AgentRuntimeConfigUpdate,
  type AgentRuntimeConfigView,
} from "@/platform/api/index.js";
import { savePersistedBrowserStoredConfig } from "@/platform/config/persisted-config.js";
import { notifyCredentialsChanged } from "@/platform/contracts/credentials-contract.js";
import type { CredentialsFields, CredentialsStatePort } from "./state.js";

export const SERVICE_PROFILES_CHANGED = "retainpdf:service-profiles-changed";

export type ServiceProfile = {
  id: string;
  name: string;
  credentials: CredentialsFields;
  translation: Record<string, unknown>;
  agent: AgentRuntimeConfigUpdate | null;
};

export function agentConfigSnapshot(config: AgentRuntimeConfigView): AgentRuntimeConfigUpdate {
  return {
    agent_runtime: config.configured_runtime,
    agent_confirmation_mode: config.agent_confirmation_mode,
    llm_base_url: config.llm_base_url,
    llm_model: config.llm_model,
    llm_api_key: config.llm_api_key || "",
    clear_llm_api_key: !config.llm_api_key,
    fx_gateway_base_url: config.fx_gateway_base_url,
    fx_model: config.fx_model,
    fx_gateway_api_key: config.fx_gateway_api_key || "",
    clear_fx_gateway_api_key: !config.fx_gateway_api_key,
  };
}

export function createServiceProfiles({
  getSettings,
  getTaskOptions,
  saveSettings,
  credentialsStatePort,
  onApply,
  fetchAgent = fetchAgentRuntimeConfig,
  updateAgent = updateAgentRuntimeConfig,
}: {
  getSettings: () => Record<string, unknown>;
  getTaskOptions: () => Record<string, unknown>;
  saveSettings: (settings: Record<string, unknown>) => Promise<unknown>;
  credentialsStatePort: CredentialsStatePort;
  onApply: () => void;
  fetchAgent?: typeof fetchAgentRuntimeConfig;
  updateAgent?: typeof updateAgentRuntimeConfig;
}) {
  let busy = false;

  function getState() {
    const settings = getSettings();
    return {
      profiles: (Array.isArray(settings.serviceProfiles) ? settings.serviceProfiles : []) as ServiceProfile[],
      activeId: `${settings.activeServiceProfileId || ""}`,
      busy,
    };
  }

  function announce(applied = false) {
    document.dispatchEvent(new CustomEvent(SERVICE_PROFILES_CHANGED, { detail: { applied } }));
  }

  async function persist(profiles: ServiceProfile[], activeId = getState().activeId) {
    await saveSettings({ serviceProfiles: profiles, activeServiceProfileId: activeId });
    announce();
  }

  function validName(value: string) {
    const name = value.trim();
    if (!name) throw new Error("请填写配置方案名称");
    return name;
  }

  // Capture only service settings, so a profile never contains other profiles.
  async function save(name: string, id?: string, agent?: AgentRuntimeConfigUpdate | null) {
    const state = getState();
    const options = getTaskOptions();
    const profile: ServiceProfile = {
      id: id || globalThis.crypto?.randomUUID?.() || `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: validName(name),
      credentials: { ...credentialsStatePort.getCredentials() },
      translation: Object.fromEntries(
        ["model", "baseUrl", "workers", "translationProvider", "translationProfiles"]
          .map((key) => [key, structuredClone(options[key])]),
      ),
      agent: agent === undefined
        ? state.profiles.find((item) => item.id === id)?.agent ?? null
        : agent ? { ...agent } : null,
    };
    await persist([...state.profiles.filter((item) => item.id !== profile.id), profile], profile.id);
  }

  async function rename(id: string, name: string) {
    const nextName = validName(name);
    await persist(getState().profiles.map((profile) => profile.id === id ? { ...profile, name: nextName } : profile));
  }

  async function remove(id: string) {
    const state = getState();
    await persist(state.profiles.filter((profile) => profile.id !== id), state.activeId === id ? "" : state.activeId);
  }

  async function apply(id: string) {
    if (busy) return;
    const profile = getState().profiles.find((item) => item.id === id);
    if (!profile) throw new Error("该配置方案已删除，请重新选择");
    busy = true;
    announce();
    try {
      if (profile.agent) {
        const current = await fetchAgent();
        await updateAgent({ ...profile.agent, expected_revision: current.configured_revision });
      }
      await savePersistedBrowserStoredConfig(profile.credentials);
      await saveSettings({ ...profile.translation, activeServiceProfileId: profile.id });
      credentialsStatePort.setCredentials(profile.credentials);
      credentialsStatePort.resetOcrValidationCache();
      onApply();
      notifyCredentialsChanged();
      announce(true);
    } finally {
      busy = false;
      announce();
    }
  }

  return { getState, save, rename, remove, apply };
}

export type ServiceProfiles = ReturnType<typeof createServiceProfiles>;
