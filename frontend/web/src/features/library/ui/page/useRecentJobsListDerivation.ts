import { useMemo } from "react";
import {
  countLibraryStatusFilters,
  matchesLibraryFilter,
} from "./LibraryFilterMenu.jsx";
import {
  isRecentJobActive,
} from "../../domain/card/recent-job-card-presenter.js";
import {
  isLibraryOnlyItem,
} from "../../domain/documents/document-card-item.js";
import { sortItems } from "./recent-jobs-library-helpers.js";
import type { LibraryCardItem } from "../../domain/types.js";

type RecentJobsListDerivationOptions = {
  items: LibraryCardItem[];
  statusFilter: string;
  sortMode: string;
};

// 图书馆列表派生:状态计数 + 过滤/排序后的可见项。
// 从 RecentJobsLibrary 抽出,逻辑与 memo 依赖保持不变。
export function useRecentJobsListDerivation({ items, statusFilter, sortMode }: RecentJobsListDerivationOptions) {
  // 各状态计数(供筛选面板显示,基于已加载项)。
  const statusCounts = useMemo(() => countLibraryStatusFilters(items, {
    isLibraryOnly: isLibraryOnlyItem,
    isActive: isRecentJobActive,
  }), [items]);

  const visibleItems = useMemo(() => {
    const filtered = statusFilter === "all"
      ? items
      : items.filter((item) => matchesLibraryFilter(item, statusFilter, { isLibraryOnly: isLibraryOnlyItem, isActive: isRecentJobActive }));
    return sortItems(filtered, sortMode);
  }, [items, statusFilter, sortMode]);

  return { statusCounts, visibleItems };
}
