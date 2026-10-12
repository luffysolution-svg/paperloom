// 本地持久化批注（localStorage）。不接旧 favorites API。

import {
  notesStorageKey,
  type ReaderNote,
  type ReaderNotesDocKey,
} from "./types.js";

function safeParse(raw: string | null): ReaderNote[] {
  if (!raw) {
    return [];
  }
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      return [];
    }
    return data
      .map((item) => ({
        id: `${item?.id || ""}`.trim(),
        page: Math.max(1, Math.floor(Number(item?.page) || 1)),
        pane: item?.pane === "translated" ? "translated" as const : "source" as const,
        quote: `${item?.quote || ""}`.trim(),
        note: `${item?.note || ""}`.trim(),
        createdAt: `${item?.createdAt || ""}`.trim() || new Date().toISOString(),
      }))
      .filter((item) => item.id && item.quote);
  } catch {
    return [];
  }
}

export function loadNotes(doc: ReaderNotesDocKey): ReaderNote[] {
  if (typeof localStorage === "undefined") {
    return [];
  }
  try {
    const key = notesStorageKey(doc);
    const notes = safeParse(localStorage.getItem(key));
    const jobId = `${doc.jobId || ""}`.trim();
    const legacyKey = `retainpdf.reader.notes.v1:job:${jobId}`;
    if (!jobId || key === legacyKey) return notes;
    const legacy = safeParse(localStorage.getItem(legacyKey));
    if (!legacy.length) return notes;
    const ids = new Set(notes.map((note) => note.id));
    const merged = [...notes, ...legacy.filter((note) => !ids.has(note.id))];
    const raw = JSON.stringify(merged);
    try {
      localStorage.setItem(key, raw);
      if (localStorage.getItem(key) === raw) localStorage.removeItem(legacyKey);
    } catch {
      // 迁移没有确认写入时保留旧键，当前仍可阅读这些笔记。
    }
    return merged;
  } catch {
    return [];
  }
}

export function saveNotes(doc: ReaderNotesDocKey, list: ReaderNote[]): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(notesStorageKey(doc), JSON.stringify(list));
  } catch (error) {
    console.warn("[reader-notes] persist failed", error);
  }
}
