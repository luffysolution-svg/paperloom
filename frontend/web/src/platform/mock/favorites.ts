// ===== 收藏 =====

import { MOCK_JOB_ID } from "./constants.js";
import { MOCK_DOCUMENT_ID, documents, getMockDocumentByJobId } from "./document-seed.js";
import { nowIso, sequentialId, trimId } from "./mock-utils.js";
import type { MockFavorite, MockFavoriteCreatePayload } from "./documents.types.js";

let mockFavorites: MockFavorite[] | null = null;
let favoriteSeq = 0;

function favorites(): MockFavorite[] {
  if (!mockFavorites) {
    favoriteSeq = 2;
    mockFavorites = [
      {
        favorite_id: "fav-001",
        document_id: MOCK_DOCUMENT_ID,
        job_id: MOCK_JOB_ID,
        page_idx: 0,
        block_id: "b-intro-3",
        kind: "sentence",
        quote_text: "现代有机合成已达到极高的精密水平。",
        translated_quote_text: "",
        note: "",
        created_at: "2026-06-01T11:00:00Z",
      },
      {
        favorite_id: "fav-002",
        document_id: MOCK_DOCUMENT_ID,
        job_id: MOCK_JOB_ID,
        page_idx: 2,
        block_id: "b-scheme-1b",
        kind: "figure",
        quote_text: "Scheme 1b",
        translated_quote_text: "",
        note: "萘系刚性对位阻的影响",
        created_at: "2026-06-01T11:20:00Z",
      },
    ];
  }
  return mockFavorites;
}

export function createMockFavorite(payload: MockFavoriteCreatePayload = {}): MockFavorite {
  const quoteText = `${payload.quote_text || ""}`.trim();
  const jobId = trimId(payload.job_id);
  // document_id 可缺省:给了 job_id 时后端解析所属文档(含历史 run)。二者至少有一。
  const requestedDocId = trimId(payload.document_id);
  const doc = requestedDocId
    ? documents().find((item) => item.document_id === requestedDocId)
    : (jobId ? getMockDocumentByJobId(jobId) : null);
  if (!doc || payload.page_idx === undefined || !payload.block_id || !quoteText) {
    throw new Error("document_id 或 job_id、page_idx、block_id、quote_text 为必填。(400)");
  }
  favorites(); // 先确保种子数据与 favoriteSeq 初始化,再分配新 id
  favoriteSeq += 1;
  const favorite: MockFavorite = {
    favorite_id: sequentialId("fav", favoriteSeq),
    document_id: doc.document_id,
    // job_id 不传时锚定文档的 active_job_id
    job_id: jobId || doc.active_job_id || "",
    page_idx: Number(payload.page_idx) || 0,
    block_id: `${payload.block_id}`,
    kind: ["sentence", "data", "figure"].includes(payload.kind as string) ? payload.kind! : "sentence",
    quote_text: quoteText,
    translated_quote_text: `${payload.translated_quote_text || ""}`,
    note: `${payload.note || ""}`,
    char_start: payload.char_start,
    char_end: payload.char_end,
    created_at: nowIso(),
  };
  favorites().push(favorite);
  return { ...favorite };
}

export function getMockFavorites({ documentId = "" }: { documentId?: string } = {}): {
  favorites: MockFavorite[];
} {
  const normalized = trimId(documentId);
  const list = normalized
    ? favorites().filter((item) => item.document_id === normalized)
        .sort((a, b) => a.page_idx - b.page_idx)
    : [...favorites()].sort((a, b) => `${b.created_at}`.localeCompare(`${a.created_at}`));
  return { favorites: list.map((item) => ({ ...item })) };
}

export function deleteMockFavorite(favoriteId: string): { favorite_id: string } {
  const list = favorites();
  const index = list.findIndex((item) => item.favorite_id === favoriteId);
  if (index < 0) {
    throw new Error("未找到该收藏。(404)");
  }
  list.splice(index, 1);
  return { favorite_id: favoriteId };
}

export function countMockFavoritesByJob(jobId: string): number {
  return favorites().filter((item) => item.job_id === trimId(jobId)).length;
}

/** 某文档下的收藏条数（删除文档时的收藏保护判定）。 */
export function countMockFavoritesForDocument(documentId: string): number {
  return favorites().filter((item) => item.document_id === documentId).length;
}

// 清空某文档下全部收藏，返回删除条数（幂等：没有就是 0）。镜像后端
// DELETE /documents/:id/favorites。目标文档不存在时抛 404。
export function clearMockFavoritesForDocument(documentId: string): number {
  const normalized = trimId(documentId);
  if (!normalized) {
    throw new Error("未找到该文档。(404)");
  }
  if (!documents().some((item) => item.document_id === normalized)) {
    throw new Error("未找到该文档。(404)");
  }
  const list = favorites();
  const before = list.length;
  const kept = list.filter((item) => item.document_id !== normalized);
  mockFavorites = kept;
  return before - kept.length;
}
