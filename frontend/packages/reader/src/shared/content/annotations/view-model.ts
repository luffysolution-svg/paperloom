// 共享真值（原 frontend/web/src/js/reader/annotations/view-model.ts），已抽离为 standalone 纯函数
// 不直接 import frontend/web 私有路径或 types；仅依赖最小内联类型，宿主可按需收窄
//
// 页码约定（真源）：本模块是批注列表排序/分组/导出的唯一实现，内部一律用 0-based
// `pageIdx`（与后端 favorites.page_idx、jumpToReaderAnchor 的 pageIdx 对齐）。
// UI 与 Markdown 导出面向人，展示时统一 +1 转 1-based 页码（见 buildAnnotationsMarkdown）。
// 本地注记 ReaderNote.page 是 1-based，在 annotations/types.ts 通过
// readerNoteToAnnotationItem 适配成这里的 0-based pageIdx，转换只发生在那一处。

// kind 到展示文案的映射:冻结防止展示层意外改写
export const ANNOTATION_KIND_META = Object.freeze({
  sentence: { label: "句子" },
  data: { label: "数据" },
  figure: { label: "图表" },
});

export type AnnotationKind = keyof typeof ANNOTATION_KIND_META;

export type AnnotationItem = {
  favoriteId?: string;
  documentId?: string;
  jobId?: string;
  /** 0-based 页码（真源约定，见文件头） */
  pageIdx?: number;
  blockId?: string;
  kind?: string;
  quoteText?: string;
  translatedQuoteText?: string;
  note?: string;
  createdAt?: string;
  [key: string]: unknown;
};

export type AnnotationPageGroup<T> = {
  pageIdx: number;
  items: T[];
};

export type AnnotationGroup = AnnotationPageGroup<AnnotationItem>;

// 通用排序核心:先按 pageOf 页码再按 createdAt。
// createdAt 是 ISO 字符串,字典序即时间序;pageOf 由调用方决定读 pageIdx 还是本地 page。
export function sortByPageAndCreatedAt<T>(
  list: unknown,
  pageOf: (item: T) => number,
): T[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return [...(list as T[])].sort((a, b) => {
    const pageDelta = pageOf(a) - pageOf(b);
    if (pageDelta !== 0) {
      return pageDelta;
    }
    const left = `${(a as { createdAt?: unknown })?.createdAt || ""}`;
    const right = `${(b as { createdAt?: unknown })?.createdAt || ""}`;
    return left < right ? -1 : left > right ? 1 : 0;
  });
}

// 通用分组核心:按 pageOf 分组,组内保持排序核心的稳定顺序。
// 展示层按页折叠、导出按页出小节,都复用这一份结果。
export function groupByPageAndCreatedAt<T>(
  list: unknown,
  pageOf: (item: T) => number,
): AnnotationPageGroup<T>[] {
  const groups: AnnotationPageGroup<T>[] = [];
  for (const item of sortByPageAndCreatedAt<T>(list, pageOf)) {
    const pageIdx = pageOf(item);
    const last = groups[groups.length - 1];
    if (last && last.pageIdx === pageIdx) {
      last.items.push(item);
    } else {
      groups.push({ pageIdx, items: [item] });
    }
  }
  return groups;
}

const annotationPageIndex = (annotation: AnnotationItem): number =>
  Number(annotation?.pageIdx ?? 0);

// 先按页码再按创建时间排序:导出与列表展示都依赖这个稳定顺序
export function sortAnnotations(list: unknown): AnnotationItem[] {
  return sortByPageAndCreatedAt<AnnotationItem>(list, annotationPageIndex);
}

// 按页分组:展示层按页折叠、导出按页出小节,都复用这一份分组结果
export function groupAnnotationsByPage(list: unknown): AnnotationGroup[] {
  return groupByPageAndCreatedAt<AnnotationItem>(list, annotationPageIndex);
}

// 多行文本转 Markdown 引用块:每一行都要加 "> ",否则换行会跳出引用
function toQuoteBlockLines(text: unknown): string[] {
  return `${(text as string) || ""}`.split("\n").map((line) => `> ${line}`);
}

// 生成导出用 Markdown:纯字符串拼装,方便精确单测与复制/下载复用
export function buildAnnotationsMarkdown({
  title = "",
  annotations = [],
}: {
  title?: string;
  annotations?: unknown;
} = {}): string {
  const heading = title ? `# ${title} 批注` : "# 批注";
  const groups = groupAnnotationsByPage(annotations);
  if (groups.length === 0) {
    return `${heading}\n\n(暂无批注)\n`;
  }
  const lines: string[] = [heading, ""];
  for (const group of groups) {
    // pageIdx 是 0 基,展示给人看要转成 1 基页码
    lines.push(`## 第 ${group.pageIdx + 1} 页`, "");
    for (const annotation of group.items) {
      lines.push(...toQuoteBlockLines(annotation?.quoteText));
      if (annotation?.translatedQuoteText) {
        // 译文紧贴原文引用块,用 —— 标记这是译文而非原文续行
        lines.push(...toQuoteBlockLines(`—— ${annotation.translatedQuoteText}`));
      }
      if (annotation?.note) {
        lines.push("", `笔记:${annotation.note}`);
      }
      // 每条批注后留空行,末尾的 "" 也保证整篇以换行结尾
      lines.push("");
    }
  }
  return lines.join("\n");
}

// 提取跳转锚点:阅读器只需要页码 + 块 id 就能定位回原文
export function annotationAnchor(annotation: AnnotationItem | null | undefined): {
  pageIdx?: number;
  blockId?: string;
} {
  return {
    pageIdx: annotation?.pageIdx,
    blockId: annotation?.blockId,
  };
}
