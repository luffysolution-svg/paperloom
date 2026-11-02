// 「全部文档」按页取完。GET /documents 一页最多 500 本（契约 ListDocumentsQuery.limit 的上限），
// 只取一页的话书一多就悄悄漏书：库检索的书名匹配只看前 50 本，合集的勾选清单和成员只看前 500 本。

export const DOCUMENT_PAGE_LIMIT = 500;
// 后端 has_more 出错时不至于一直翻下去：40 页是 2 万本。
const MAX_PAGES = 40;

export type DocumentPage<T> = {
  documents?: T[];
  total?: number;
  has_more?: boolean;
} | null | undefined;

export type DocumentPageFetcher<T> = (page: { limit: number; offset: number }) => Promise<DocumentPage<T>>;

/** 按 has_more 翻页（没有 has_more 时按 total）。翻页期间有书新增或删除会让页错开，按 document_id 去重。 */
export async function fetchAllDocuments<T extends { document_id?: string }>(
  fetchPage: DocumentPageFetcher<T>,
): Promise<T[]> {
  const collected: T[] = [];
  const seen = new Set<string>();
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const payload = await fetchPage({ limit: DOCUMENT_PAGE_LIMIT, offset });
    const documents = Array.isArray(payload?.documents) ? payload.documents : [];
    for (const doc of documents) {
      const id = `${doc?.document_id || ""}`;
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      collected.push(doc);
    }
    offset += documents.length;
    const more = typeof payload?.has_more === "boolean"
      ? payload.has_more
      : Number.isFinite(Number(payload?.total)) && offset < Number(payload?.total);
    if (!more || documents.length === 0) break;
  }
  return collected;
}
