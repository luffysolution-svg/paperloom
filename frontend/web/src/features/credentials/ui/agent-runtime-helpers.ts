import type {
  AgentRuntimeConfigView,
  AgentRuntimeMode,
} from "@/platform/api/index.js";
// 直接取 @retainpdf/reader 的真值，不经 @/shared/reader/host/ai —— 后者会
// import 回 credentials 功能，形成 index -> ui -> host -> index 的循环，
// 循环下 defaultCredentialsStatePort 在模块初始化期为 undefined。
import { CREDENTIALS_CHANGED_EVENT } from "@retainpdf/reader/runtime/ai";

export function activeMode(runtime = ""): AgentRuntimeMode | null {
  const normalized = runtime.toLowerCase();
  if (normalized.includes("openai")) return "openai";
  if (normalized.includes("fx")) return "fx";
  if (
    normalized.includes("python")
    || normalized.includes("markdown")
    || normalized.includes("retrieval")
  ) return "python";
  return null;
}

export function modeLabel(mode: AgentRuntimeMode) {
  if (mode === "openai") return "OpenAI 兼容 Agent";
  return mode === "fx" ? "FX Gateway Agent" : "Markdown 检索问答";
}

export function modeShortLabel(mode: AgentRuntimeMode | null) {
  if (mode === "openai") return "OpenAI";
  if (mode === "fx") return "FX";
  if (mode === "python") return "Markdown";
  return "不可用";
}

export function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function announceRuntimeConfigChanged() {
  document.dispatchEvent(new CustomEvent(CREDENTIALS_CHANGED_EVENT));
}

export function runtimeRestartPending(config: AgentRuntimeConfigView) {
  return (
    config.restart_required
    || config.restart_state === "pending"
    || config.active_revision !== config.configured_revision
  );
}
