// DELETE_BLOCKED_BY_FAVORITES: 删除文档/run 被收藏锚点挡住时的结构化 409。
//
// 后端在 error.code 里给稳定错误码，在 error.details 里给 favorite_count 与
// clear_favorites_path。前端据此提示用户「有 N 条收藏，是否一并删除」，
// 确认后 DELETE clear_favorites_path 再重试原删除。
//
// 禁止从 message 里正则抠数字：文案会随翻译/调整而变。此处的数字只来自结构字段。

export const DELETE_BLOCKED_BY_FAVORITES = "DELETE_BLOCKED_BY_FAVORITES";

export type DeleteBlockedByFavoritesError = Error & {
  errorCode?: string;
  favoriteCount?: number;
  clearFavoritesPath?: string;
  favoriteScope?: "document" | "job" | "";
};

export function isDeleteBlockedByFavorites(
  error: unknown,
): error is DeleteBlockedByFavoritesError {
  if (!error || typeof error !== "object") return false;
  const candidate = error as DeleteBlockedByFavoritesError;
  if (`${candidate.errorCode || ""}`.trim() === DELETE_BLOCKED_BY_FAVORITES) return true;
  // 兼容没有 error.code、但带了结构字段的错误源（mock / 自定义错误）。
  return Boolean(candidate.clearFavoritesPath) && Number(candidate.favoriteCount) > 0;
}

export function blockedFavoriteCount(error: unknown): number {
  if (!isDeleteBlockedByFavorites(error)) return 0;
  const count = Number(error.favoriteCount);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

export function blockedClearFavoritesPath(error: unknown): string {
  if (!isDeleteBlockedByFavorites(error)) return "";
  return `${error.clearFavoritesPath || ""}`.trim();
}
