import {
  createMockFavorite,
  deleteMockFavorite,
  getMockFavorites,
} from "@/platform/mock/documents.js";

// mock-only 适配器:index.ts 的 mockable() 只在 mock 模式调用这些实现。
// 必填:document_id、page_idx、block_id、quote_text(引文快照)。
// job_id 不传时后端锚定文档的 active_job_id——阅读器里收藏推荐不传。
export async function createFavorite(apiPrefix, payload = {}) {
  void apiPrefix;
  return createMockFavorite(payload);
}

// 传 documentId 时按页码排序;不传 = 全部收藏,按时间倒序
export async function fetchFavorites(apiPrefix, { documentId = "" } = {}) {
  void apiPrefix;
  return getMockFavorites({ documentId });
}

export async function deleteFavorite(apiPrefix, favoriteId) {
  void apiPrefix;
  const normalized = `${favoriteId || ""}`.trim();
  if (!normalized) {
    throw new Error("缺少 favorite_id。");
  }
  return deleteMockFavorite(normalized);
}
