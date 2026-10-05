// Zotero 导入流程（纯逻辑，便于单测）：按分类分组导入 → 刷新书库 → 逐篇提交翻译。
import type { ZoteroCollection, ZoteroImportResult } from "@/platform/api/index.js";

export type ZoteroSelection = {
  item_key: string;
  attachment_key: string;
  /** 勾选时所在分类；空串表示「全部文献」。 */
  collection_key: string;
  title: string;
};

export type ZoteroImportSummary = {
  /** 新提交翻译的文档数。 */
  queued: number;
  /** 已有译文或翻译中，直接复用。 */
  reused: number;
  /** 只导入、未翻译。 */
  stored: number;
  failed: Array<{ title: string; message: string }>;
};

export function selectionKey(itemKey: string, attachmentKey: string): string {
  return `${itemKey}:${attachmentKey}`;
}

/** 分类扁平列表 → 按树序排列并带深度；孤儿分类（父不存在）当顶层。 */
export function orderCollections(
  collections: ZoteroCollection[],
): Array<ZoteroCollection & { depth: number }> {
  const keys = new Set(collections.map((c) => c.key));
  const children = new Map<string, ZoteroCollection[]>();
  for (const collection of collections) {
    const parent = collection.parent_key && keys.has(collection.parent_key) ? collection.parent_key : "";
    children.set(parent, [...(children.get(parent) || []), collection]);
  }
  const ordered: Array<ZoteroCollection & { depth: number }> = [];
  const visit = (parent: string, depth: number) => {
    for (const collection of children.get(parent) || []) {
      if (ordered.some((c) => c.key === collection.key)) continue;
      ordered.push({ ...collection, depth });
      visit(collection.key, depth + 1);
    }
  };
  visit("", 0);
  return ordered;
}

export async function runZoteroImport({
  libraryId,
  selections,
  translate,
  importAttachments,
  translateDocument,
  requestLibraryRefresh,
}: {
  libraryId: string;
  selections: ZoteroSelection[];
  translate: boolean;
  importAttachments: (payload: {
    library_id: string;
    collection_key?: string;
    attachments: Array<{ item_key: string; attachment_key: string }>;
  }) => Promise<ZoteroImportResult[]>;
  translateDocument: (documentId: string) => Promise<unknown>;
  requestLibraryRefresh: () => void;
}): Promise<ZoteroImportSummary> {
  const summary: ZoteroImportSummary = { queued: 0, reused: 0, stored: 0, failed: [] };
  const groups = new Map<string, ZoteroSelection[]>();
  for (const selection of selections) {
    groups.set(selection.collection_key, [...(groups.get(selection.collection_key) || []), selection]);
  }

  const results: ZoteroImportResult[] = [];
  for (const [collectionKey, group] of groups) {
    try {
      results.push(...await importAttachments({
        library_id: libraryId,
        collection_key: collectionKey || undefined,
        attachments: group.map(({ item_key, attachment_key }) => ({ item_key, attachment_key })),
      }));
    } catch (error: any) {
      const message = `${error?.message || error}`;
      summary.failed.push(...group.map((selection) => ({ title: selection.title, message })));
    }
  }
  requestLibraryRefresh();

  // 同一文件被多个附件引用时只翻译一次。
  const seen = new Set<string>();
  for (const result of results) {
    const title = result.title || selections.find((s) => s.attachment_key === result.attachment_key)?.title || "";
    if (result.status === "failed" || !result.document_id) {
      summary.failed.push({ title, message: result.message || "导入失败" });
      continue;
    }
    if (seen.has(result.document_id)) continue;
    seen.add(result.document_id);
    if (result.translation_job_id) {
      summary.reused += 1;
    } else if (!translate) {
      summary.stored += 1;
    } else {
      try {
        await translateDocument(result.document_id);
        summary.queued += 1;
      } catch (error: any) {
        summary.failed.push({ title, message: `已导入，但提交翻译失败：${error?.message || error}` });
      }
    }
  }
  return summary;
}
