// 共享滚动定位类型：下沉自 pdf/scroll-to-page.ts，供 shared 层与 pdf 层共同引用，
// 避免 shared 向上依赖 pdf。纯类型，无运行时依赖。

export type PageScrollProgress = {
  page: number;
  fraction: number;
};
