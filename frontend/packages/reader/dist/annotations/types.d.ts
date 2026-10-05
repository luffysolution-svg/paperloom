import { type AnnotationItem } from "../shared/content/annotations/view-model.js";
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
export declare function notesStorageKey(doc: ReaderNotesDocKey): string;
export declare function createNoteId(): string;
export declare function readerNoteToAnnotationItem(note: ReaderNote): AnnotationItem;
export declare function sortNotes(list: ReaderNote[]): ReaderNote[];
export declare function groupNotesByPage(list: ReaderNote[]): Array<{
    page: number;
    items: ReaderNote[];
}>;
export declare function buildNotesMarkdown(title: string, list: ReaderNote[]): string;
//# sourceMappingURL=types.d.ts.map