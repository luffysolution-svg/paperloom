// 悬停的内容块：左右两栏 PDF 和 Markdown 面板三处共享同一个 itemId。
//
// 放 context 里的是这个 store（引用稳定），不是 itemId 本身 —— 悬停每秒能变十几次，
// 直接放进外壳 context 会带着整棵阅读器重渲染。订阅方用 useSyncExternalStore 只取自己要的。

export type RegionHoverOrigin = "pdf" | "markdown";

export type RegionHoverState = {
  itemId: string | null;
  /** 谁触发的：Markdown 面板只对来自 PDF 的悬停做滚动跟随，自己触发的不滚。 */
  origin: RegionHoverOrigin | null;
};

export type RegionHoverStore = {
  get: () => RegionHoverState;
  set: (itemId: string | null, origin: RegionHoverOrigin) => void;
  subscribe: (listener: () => void) => () => void;
};

const EMPTY: RegionHoverState = { itemId: null, origin: null };

export function createRegionHoverStore(): RegionHoverStore {
  let state = EMPTY;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(itemId, origin) {
      if (state.itemId === itemId && (itemId === null || state.origin === origin)) return;
      state = itemId === null ? EMPTY : { itemId, origin };
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
