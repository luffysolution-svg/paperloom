// 粘性会话 id 的本地持久化（浏览器 localStorage，读写均静默降级）
//
// 纯逻辑，不依赖 React：home-ask runtime 与阅读器侧各自按 job 维度持久化。

import { HOME_ASK_CONVERSATION_STORAGE_KEY as CONV_STORAGE_KEY } from "@/platform/config/storage-keys.js";

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
