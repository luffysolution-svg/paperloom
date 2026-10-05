// 文档删除：单篇 / 批量 / 卡片入口 + 收藏清空。

import { API_PREFIX } from "@/platform/config/api-constants.js";
import {
  clearFavorites as defaultClearFavorites,
  deleteDocument as defaultDeleteDocument,
} from "@/platform/api/index.js";
import type {
  DeleteBlockedDocument,
  DeleteCardTarget,
  DeleteDocumentsResult,
  LibraryControllerDeps,
  ReloadRecentJobsOptions,
} from "../types.js";
import {
  blockedClearFavoritesPath,
  blockedFavoriteCount,
  isDeleteBlockedByFavorites,
} from "./delete-blocked-favorites.js";
import { friendlyDocumentDeleteError, type ErrorLike } from "./error-messages.js";

export function createDocumentDeleteActions({
  removeLibraryDocuments,
  reload,
  deleteJob,
  deleteDocumentApi = defaultDeleteDocument,
  clearFavoritesApi = defaultClearFavorites,
}: {
  removeLibraryDocuments?: LibraryControllerDeps["removeLibraryDocuments"];
  reload: (opts?: ReloadRecentJobsOptions) => void | Promise<void>;
  deleteJob?: LibraryControllerDeps["deleteJob"];
  /** 可注入，便于单测；默认走平台 API 网关。 */
  deleteDocumentApi?: typeof defaultDeleteDocument;
  clearFavoritesApi?: typeof defaultClearFavorites;
}) {
  // 文档级删除:删掉 document + 名下所有 job/upload/文件。
  // 被收藏挡住时原样抛出结构化错误（带 favoriteCount/clearFavoritesPath），
  // 由调用方提示用户 → 清空收藏 → 重试；其余错误转成友好文案。
  async function deleteDocument(documentId?: string | null): Promise<void> {
    const normalizedId = `${documentId || ""}`.trim();
    if (!normalizedId) {
      return;
    }
    try {
      await deleteDocumentApi(API_PREFIX, normalizedId);
    } catch (error) {
      if (isDeleteBlockedByFavorites(error)) {
        throw error;
      }
      throw new Error(friendlyDocumentDeleteError(error as ErrorLike));
    }
    removeLibraryDocuments?.([normalizedId]);
    void reload({ reset: true, silent: true });
  }

  // 清空 clear_favorites_path 指向的收藏（文档级/run 级共用）。返回删除条数。
  async function clearFavorites(clearFavoritesPath?: string | null): Promise<number> {
    const path = `${clearFavoritesPath || ""}`.trim();
    if (!path) return 0;
    return clearFavoritesApi(API_PREFIX, path);
  }

  // 批量删除：API 仍逐个 delete；网格乐观一次移除 + 单次 silent soft reload。
  // 被收藏挡住的条目单独收集（不并入 failed），交 UI 汇总提示后清空重试。
  async function deleteDocuments(
    documentIds: Array<string | null | undefined> = [],
  ): Promise<DeleteDocumentsResult> {
    const ids = [...new Set((documentIds || []).map((id) => `${id || ""}`.trim()).filter(Boolean))];
    if (!ids.length) {
      return { confirmed: 0, failed: 0, blocked: [] };
    }
    const results = await Promise.allSettled(ids.map((id) => deleteDocumentApi(API_PREFIX, id)));
    const confirmedIds: string[] = [];
    const blocked: DeleteBlockedDocument[] = [];
    let failed = 0;
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        confirmedIds.push(ids[index]);
        return;
      }
      if (isDeleteBlockedByFavorites(result.reason)) {
        blocked.push({
          documentId: ids[index],
          favoriteCount: blockedFavoriteCount(result.reason),
          clearFavoritesPath: blockedClearFavoritesPath(result.reason),
        });
        return;
      }
      failed += 1;
    });
    if (confirmedIds.length) {
      removeLibraryDocuments?.(confirmedIds);
    }
    void reload({ reset: true, silent: true });
    return { confirmed: confirmedIds.length, failed, blocked };
  }

  // 卡片删除入口:有 document_id 走文档级删除,无则退回老的 job 删除。
  function deleteCard(target: DeleteCardTarget = {}): void {
    const documentId = `${target?.documentId || ""}`.trim();
    if (documentId) {
      // fire-and-forget:deleteDocument 现在会 throw,吞掉避免未处理拒绝
      void deleteDocument(documentId).catch(() => {});
      return;
    }
    deleteJob?.(`${target?.jobId || ""}`.trim());
  }

  return { deleteDocument, clearFavorites, deleteDocuments, deleteCard };
}
