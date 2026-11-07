import type { AiConnection, ApiProtocol } from "@retainpdf/api";
import type { AI_BRAND_MARKS } from "./brand-marks.js";

export type AiBrandKey = keyof typeof AI_BRAND_MARKS;
export type AiProvider = { id: string; name: string; brand: AiBrandKey | "custom"; baseUrl: string; protocol: ApiProtocol; keyUrl?: string };

export const AI_PROVIDERS: AiProvider[] = [
  { id: "openai", name: "OpenAI", brand: "codex", baseUrl: "https://api.openai.com/v1", protocol: "openai_responses", keyUrl: "https://platform.openai.com/api-keys" },
  { id: "anthropic", name: "Anthropic / Claude", brand: "claude", baseUrl: "https://api.anthropic.com/v1", protocol: "anthropic", keyUrl: "https://console.anthropic.com/settings/keys" },
  { id: "deepseek", name: "DeepSeek", brand: "deepseek", baseUrl: "https://api.deepseek.com/v1", protocol: "openai", keyUrl: "https://platform.deepseek.com/api_keys" },
  { id: "openrouter", name: "OpenRouter", brand: "openrouter", baseUrl: "https://openrouter.ai/api/v1", protocol: "openai", keyUrl: "https://openrouter.ai/settings/keys" },
  { id: "qwen", name: "通义千问", brand: "qwen", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", protocol: "openai" },
  { id: "custom", name: "其他模型服务", brand: "custom", baseUrl: "", protocol: "openai" },
];

const AGENT_BRANDS: Record<string, AiBrandKey> = {
  "codex-acp": "codex", "claude-acp": "claude", opencode: "opencode", pi: "pi", "grok-build": "grok", codebuddy: "codebuddy",
  "cursor-agent": "cursor", hermes: "hermes", "antigravity-acp": "antigravity", qodercli: "qoder", "qoder-cn": "qoder",
  dsh: "deepseek", "kimi-code": "kimi", zcode: "zai", "minimax-code": "minimax", "mimo-code": "mimo",
};

export function connectionProvider(connection: AiConnection) {
  if (connection.provider) return AI_PROVIDERS.find((p) => p.id === connection.provider) || AI_PROVIDERS.at(-1)!;
  const host = connection.base_url.toLowerCase();
  const id = host.includes("anthropic") ? "anthropic" : host.includes("deepseek") ? "deepseek" : host.includes("openrouter") ? "openrouter"
    : host.includes("dashscope") ? "qwen" : host.includes("openai.com") ? "openai" : "custom";
  return AI_PROVIDERS.find((p) => p.id === id)!;
}

export function aiConnectionBrand(connection: AiConnection): AiBrandKey | "custom" {
  return connection.kind === "byoa" ? AGENT_BRANDS[connection.preset] || "custom" : connectionProvider(connection).brand;
}
export function agentBrand(preset: string): AiBrandKey | "custom" { return AGENT_BRANDS[preset] || "custom"; }
export function aiConnectionName(connection: AiConnection) {
  return connection.id === "legacy" && connection.name === "现有模型连接" ? connectionProvider(connection).id === "custom" ? "默认模型服务" : connectionProvider(connection).name : connection.name;
}
export function isVisibleAiConnection(connection: AiConnection, legacyBrowserKey = false) {
  return !connection.legacy_inherited || Boolean(connection.api_key_configured || legacyBrowserKey);
}
