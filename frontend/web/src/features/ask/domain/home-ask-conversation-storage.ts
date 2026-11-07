// 粘性会话 id 的本地持久化（浏览器 localStorage，读写均静默降级）
//
// 纯逻辑，不依赖 React：home-ask runtime 与阅读器侧各自按 job 维度持久化。

import { HOME_ASK_CONVERSATION_STORAGE_KEY as CONV_STORAGE_KEY, HOME_ASK_SCOPES_STORAGE_KEY as SCOPES_KEY } from "@/platform/config/storage-keys.js";
import type { HomeAskScope } from "./types.js";

export function loadConversationScopes(id = ""): HomeAskScope[] {
  try {
    const scopes = JSON.parse(globalThis.localStorage?.getItem(SCOPES_KEY) || "{}")[id || "draft"];
    return Array.isArray(scopes) ? scopes.filter((scope) => scope?.id && ["document", "collection"].includes(scope.kind)) : [];
  } catch { return []; }
}

export function saveConversationScopes(id: string, scopes: HomeAskScope[]) {
  try {
    const stored = JSON.parse(globalThis.localStorage?.getItem(SCOPES_KEY) || "{}");
    stored[id || "draft"] = scopes;
    stored.draft = scopes;
    globalThis.localStorage?.setItem(SCOPES_KEY, JSON.stringify(stored));
  } catch { /* Scope selection remains usable when storage is unavailable. */ }
}

export function loadConversationId(): string {
  try {
    return `${globalThis.localStorage?.getItem(CONV_STORAGE_KEY) || ""}`.trim();
  } catch {
    return "";
  }
}

export function saveConversationId(id: string) {
  const next = `${id || ""}`.trim();
  try {
    if (!next) {
      globalThis.localStorage?.removeItem(CONV_STORAGE_KEY);
      return;
    }
    globalThis.localStorage?.setItem(CONV_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
}
