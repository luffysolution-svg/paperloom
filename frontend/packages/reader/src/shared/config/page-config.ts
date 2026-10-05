// 共享真值（原 frontend/web/src/js/reader/page-config.ts），已抽离为纯函数 + 可注入依赖
// 不直接 import frontend/web 的 config/mock，改为参数注入，默认用 window/globalThis

function defaultSearch(): string {
  return globalThis.window?.location?.search || "";
}

function defaultIsMockMode(): boolean {
  return false;
}

function defaultGetMockJobId(): string {
  return "";
}

function defaultReaderMessageTargetOrigin(): string {
  return "*";
}

export function resolveReaderJobId({
  search = defaultSearch(),
  isMock = defaultIsMockMode,
  mockJobId = defaultGetMockJobId,
}: {
  search?: string;
  isMock?: () => boolean;
  mockJobId?: () => string;
} = {}): string {
  const jobId = new URLSearchParams(search).get("job_id")?.trim() || "";
  if (jobId) return jobId;
  const documentId = new URLSearchParams(search).get("document_id")?.trim() || "";
  if (documentId) return "";
  return isMock() ? mockJobId() : "";
}

export function resolveReaderDocumentId({ search = defaultSearch() }: { search?: string } = {}): string {
  return new URLSearchParams(search).get("document_id")?.trim() || "";
}

export function resolveReaderAnchor({ search = defaultSearch() }: { search?: string } = {}): { pageIdx: number | null; blockId: string } | null {
  const params = new URLSearchParams(search);
  const rawPageIdx = `${params.get("page_idx") ?? ""}`.trim();
  const blockId = `${params.get("block_id") || ""}`.trim();
  const pageIdx = rawPageIdx === "" ? NaN : Number(rawPageIdx);
  if (!Number.isFinite(pageIdx) && !blockId) return null;
  return { pageIdx: Number.isFinite(pageIdx) ? pageIdx : null, blockId };
}

/**
 * 阅读位置锚点参数（含历史别名）。它们只表示「读到哪」，不构成路由身份：
 * 滚动同步 page_idx 不应触发 reader 会话重载。
 */
const READER_ANCHOR_PARAM_NAMES = ["page_idx", "page", "block_id", "blockId"] as const;

/**
 * route 身份签名：剔除阅读位置锚点后的 query（排序归一）。
 * 供 history 监听把「会话身份变化」与「阅读位置变化」区分开。
 */
export function readerRouteSearchSignature(search = defaultSearch()): string {
  try {
    const params = new URLSearchParams(search);
    for (const name of READER_ANCHOR_PARAM_NAMES) params.delete(name);
    params.sort();
    return params.toString();
  } catch {
    return `${search || ""}`;
  }
}

/**
 * 当前页码（1 基）→ URL query（0 基规范名 page_idx）。
 * 仅当 URL 真正变化时返回新串，否则 null（调用方据此跳过写 history）。
 *
 * - 保留 job_id/document_id/mock 等既有参数；
 * - block_id 只在仍指向当前页时保留；滚动离开后剔除，避免刷新回跳旧锚点；
 * - 第 1 页且 URL 本无 page_idx 时视为等价，不写入以保持 URL 干净。
 */
export function buildReaderPageIdxSearch(
  search: string,
  pageNumber: number,
  resolveBlockPage?: (blockId: string) => number | null,
): string | null {
  if (!Number.isFinite(pageNumber) || pageNumber < 1) return null;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }
  const page = Math.floor(pageNumber);
  const nextPageIdx = `${page - 1}`;
  const currentPageIdx = params.get("page_idx");
  let dirty = false;
  if (currentPageIdx !== nextPageIdx) {
    if (!(currentPageIdx === null && nextPageIdx === "0")) {
      params.set("page_idx", nextPageIdx);
      dirty = true;
    }
  }
  const blockId = `${params.get("block_id") || ""}`.trim();
  if (blockId && resolveBlockPage) {
    const blockPage = resolveBlockPage(blockId);
    if (blockPage != null && Number.isFinite(blockPage) && Math.floor(blockPage) !== page) {
      params.delete("block_id");
      dirty = true;
    }
  }
  return dirty ? params.toString() : null;
}

export function createReaderPageConfigPort({
  messageTargetOrigin = defaultReaderMessageTargetOrigin,
  isMock = defaultIsMockMode,
  mockJobId = defaultGetMockJobId,
  search = defaultSearch,
}: {
  messageTargetOrigin?: () => string;
  isMock?: () => boolean;
  mockJobId?: () => string;
  search?: () => string;
} = {}) {
  function readerJobId(): string {
    return resolveReaderJobId({ search: search(), isMock, mockJobId });
  }
  return Object.freeze({ messageTargetOrigin, readerJobId });
}

export const defaultReaderPageConfigPort = createReaderPageConfigPort();
