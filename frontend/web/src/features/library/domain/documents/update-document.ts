// 文档元数据更新（标题 / 标签 / 阅读状态）:PATCH 后乐观写网格/详情。

import type { DialogStore } from "@/platform/store/dialog-store.js";
import { API_PREFIX } from "@/platform/config/api-constants.js";
import { patchDocument as patchDocumentApi } from "@/platform/api/index.js";
import type {
  LibraryCardItem,
  LibraryControllerDeps,
  ReloadRecentJobsOptions,
  UpdateDocumentPayload,
} from "../types.js";

export function createDocumentUpdateAction({
  bookDetailStore,
  patchLibraryDocumentItem,
  reload,
}: {
  bookDetailStore: DialogStore<LibraryCardItem | null>;
  patchLibraryDocumentItem?: LibraryControllerDeps["patchLibraryDocumentItem"];
  reload: (opts?: ReloadRecentJobsOptions) => void | Promise<void>;
}) {
  // 前置条件: documentId 非空;空返回 null,仅 title/tags/reading_status 可 patch。
  async function updateDocument(
    documentId?: string | null,
    payload: UpdateDocumentPayload = {},
  ): Promise<unknown> {
    const normalizedId = `${documentId || ""}`.trim();
    if (!normalizedId) {
      return null;
    }
    const updated = await patchDocumentApi(API_PREFIX, normalizedId, payload) as Record<string, unknown> | null;
    const patch: Partial<LibraryCardItem> = {
      ...(payload.title !== undefined
        ? {
          title: `${updated?.title ?? payload.title ?? ""}`,
          display_name: `${updated?.title ?? payload.title ?? ""}`,
        }
        : {}),
      ...(payload.reading_status !== undefined
        ? { reading_status: `${updated?.reading_status ?? payload.reading_status ?? ""}` }
        : {}),
      ...(payload.tags !== undefined
        ? { tags: (Array.isArray(updated?.tags) ? updated.tags : payload.tags) as string[] }
        : {}),
    };
    if (Object.keys(patch).length) {
      patchLibraryDocumentItem?.(normalizedId, patch);
      const dialogState = bookDetailStore.getState();
      const base = dialogState.payload;
      if (dialogState.open && base && `${base.document_id || ""}`.trim() === normalizedId) {
        bookDetailStore.open({ ...base, ...patch });
      }
    }
    void reload({ reset: true, silent: true });
    return updated;
  }

  return { updateDocument };
}
