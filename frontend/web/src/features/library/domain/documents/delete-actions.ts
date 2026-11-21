// 文档删除：单篇 / 批量 / 卡片入口。

import { API_PREFIX } from "@/platform/config/api-constants.js";
import {
  deleteDocument as defaultDeleteDocument,
} from "@/platform/api/index.js";
import type {
  DeleteCardTarget,
  DeleteDocumentsResult,
  LibraryControllerDeps,
  ReloadRecentJobsOptions,
} from "../types.js";
import { friendlyDocumentDeleteError, type ErrorLike } from "./error-messages.js";

export function createDocumentDeleteActions({
  removeLibraryDocuments,
  reload,
  deleteJob,
  deleteDocumentApi = defaultDeleteDocument,
}: {
  removeLibraryDocuments?: LibraryControllerDeps["removeLibraryDocuments"];
  reload: (opts?: ReloadRecentJobsOptions) => void | Promise<void>;
  deleteJob?: LibraryControllerDeps["deleteJob"];
  /** 可注入，便于单测；默认走平台 API 网关。 */
  deleteDocumentApi?: typeof defaultDeleteDocument;
}) {
  // 文档级删除:删掉 document + 名下所有 job/upload/文件。
  // 文档下还有排队或运行中的任务时后端返回 409，错误都转成友好文案。
  async function deleteDocument(documentId?: string | null): Promise<void> {
    const normalizedId = `${documentId || ""}`.trim();
    if (!normalizedId) {
      return;
    }
    try {
      await deleteDocumentApi(API_PREFIX, normalizedId);
    } catch (error) {
      throw new Error(friendlyDocumentDeleteError(error as ErrorLike));
    }
    removeLibraryDocuments?.([normalizedId]);
    void reload({ reset: true, silent: true });
  }

  // 批量删除：API 仍逐个 delete；网格乐观一次移除 + 单次 silent soft reload。
  async function deleteDocuments(
    documentIds: Array<string | null | undefined> = [],
  ): Promise<DeleteDocumentsResult> {
    const ids = [...new Set((documentIds || []).map((id) => `${id || ""}`.trim()).filter(Boolean))];
    if (!ids.length) {
      return { confirmed: 0, failed: 0 };
    }
    const results = await Promise.allSettled(ids.map((id) => deleteDocumentApi(API_PREFIX, id)));
    const confirmedIds: string[] = [];
    let failed = 0;
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        confirmedIds.push(ids[index]);
        return;
      }
      failed += 1;
    });
    if (confirmedIds.length) {
      removeLibraryDocuments?.(confirmedIds);
    }
    void reload({ reset: true, silent: true });
    return { confirmed: confirmedIds.length, failed };
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

  return { deleteDocument, deleteDocuments, deleteCard };
}
