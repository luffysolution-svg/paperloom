// 新阅读器批注模型（与旧 favorites / selection-favorites 无关）
//
// 两套批注模型已收敛：排序/分组/Markdown 导出的唯一实现是
// shared/content/annotations/view-model.ts。本文件只保留本地注记的领域类型与
// 持久化键，并把 ReaderNote 适配成共享视图（见 readerNoteToAnnotationItem）。
//
// 页码约定：ReaderNote.page 是 1-based（与 PDF 页脚、面板「第 N 页」一致）；
// 共享视图 AnnotationItem.pageIdx 是 0-based（与后端 page_idx 一致）。
// 两者只在 readerNoteToAnnotationItem 这一处换算，导出/UI 展示统一用 1-based。

import {
  buildAnnotationsMarkdown,
  groupByPageAndCreatedAt,
  sortByPageAndCreatedAt,
  type AnnotationItem,
} from "../shared/content/annotations/view-model.js";

export type ReaderNotePane = "source" | "translated";

export type ReaderNote = {
  id: string;
  /** 1-based 页码（面向人的约定；共享视图里会 -1 成 0-based pageIdx） */
  page: number;
  pane: ReaderNotePane;
  quote: string;
  note: string;
  createdAt: string;
};

export type ReaderNotesDocKey = {
  jobId?: string;
  documentId?: string;
};

// 本地注记的存储键：jobId 优先，其次 documentId。
// 注意生命周期不一致（已知、暂不改）：本键以 job 为第一身份，而服务端收藏按
// document_id 去重（见 shared/state/server-favorites-port.ts 的 dedupeServerFavorites）；
// 同文档换 run/job 时会命中不同 notes 键。UI/导出里的页码已统一为 1-based 展示。
export function notesStorageKey(doc: ReaderNotesDocKey): string {
  const job = `${doc.jobId || ""}`.trim();
  const documentId = `${doc.documentId || ""}`.trim();
  if (job) {
    return `retainpdf.reader.notes.v1:job:${job}`;
  }
  if (documentId) {
    return `retainpdf.reader.notes.v1:doc:${documentId}`;
  }
  return "retainpdf.reader.notes.v1:anonymous";
}

export function createNoteId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ReaderNote → 共享批注视图。两套模型唯一的页码换算点：page(1-based) - 1。
export function readerNoteToAnnotationItem(note: ReaderNote): AnnotationItem {
  return {
    pageIdx: Number(note.page) - 1,
    quoteText: note.quote,
    note: note.note,
    createdAt: note.createdAt,
  };
}

export function sortNotes(list: ReaderNote[]): ReaderNote[] {
  return sortByPageAndCreatedAt<ReaderNote>(list, (note) => note.page);
}

export function groupNotesByPage(list: ReaderNote[]): Array<{ page: number; items: ReaderNote[] }> {
  return groupByPageAndCreatedAt<ReaderNote>(list, (note) => note.page)
    .map((group) => ({ page: group.pageIdx, items: group.items }));
}

// 导出复用共享实现，格式与「摘录/服务端批注」的 Markdown 导出一致。
export function buildNotesMarkdown(title: string, list: ReaderNote[]): string {
  return buildAnnotationsMarkdown({
    title,
    annotations: list.map(readerNoteToAnnotationItem),
  });
}
