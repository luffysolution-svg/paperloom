/** platform/mock 文档/合集/收藏/检索的 API 形状类型。 */

/** API-shaped document record (mirrors backend documents layer). */
export type MockReadingStatus = "unread" | "reading" | "done";

export interface MockDocument {
  document_id: string;
  title: string;
  source_filename: string;
  page_count: number;
  bytes: number;
  active_job_id: string | null;
  reading_status: MockReadingStatus | string;
  tags: string[];
  added_at: string;
  updated_at: string;
  last_opened_at?: string | null;
  [key: string]: unknown;
}

/** Document after API media-url enrichment. */
export interface MockDocumentWithMedia extends MockDocument {
  source_pdf_url: string;
  cover_url: string;
  thumbnail_url: string;
}

export interface MockDocumentListQuery {
  limit?: number;
  offset?: number;
  readingStatus?: string;
  tag?: string;
  collectionId?: string;
  /** 镜像后端 q：标题或原始文件名包含（大小写不敏感，字面匹配）。 */
  q?: string;
}

export interface MockDocumentListResult {
  documents: MockDocumentWithMedia[];
  total: number;
  limit: number;
  offset: number;
}

export interface MockDocumentPatch {
  title?: string;
  reading_status?: MockReadingStatus | string;
  tags?: string[];
}

export interface MockCollection {
  collection_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface MockCollectionWithCount extends MockCollection {
  document_count: number;
}

export interface MockCollectionCreate {
  name?: string;
  parent_id?: string | null;
}

export interface MockCollectionPatch {
  name?: string;
  sort_order?: number;
}

export type MockFavoriteKind = "sentence" | "data" | "figure" | string;

export interface MockFavorite {
  favorite_id: string;
  document_id: string;
  job_id: string;
  page_idx: number;
  block_id: string;
  kind: MockFavoriteKind;
  quote_text: string;
  translated_quote_text: string;
  note: string;
  created_at: string;
  char_start?: number;
  char_end?: number;
}

export interface MockFavoriteCreatePayload {
  document_id?: string;
  job_id?: string;
  page_idx?: number;
  block_id?: string;
  kind?: MockFavoriteKind;
  quote_text?: string;
  translated_quote_text?: string;
  note?: string;
  char_start?: number;
  char_end?: number;
}

export interface MockSearchHit {
  document_id: string;
  job_id: string;
  page_idx: number;
  block_id: string;
  source_snippet: string;
  translated_snippet: string;
}
