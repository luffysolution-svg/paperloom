export declare function resolveReaderJobId({ search, isMock, mockJobId, }?: {
    search?: string;
    isMock?: () => boolean;
    mockJobId?: () => string;
}): string;
export declare function resolveReaderDocumentId({ search }?: {
    search?: string;
}): string;
export declare function resolveReaderAnchor({ search }?: {
    search?: string;
}): {
    pageIdx: number | null;
    blockId: string;
} | null;
/**
 * route 身份签名：剔除阅读位置锚点后的 query（排序归一）。
 * 供 history 监听把「会话身份变化」与「阅读位置变化」区分开。
 */
export declare function readerRouteSearchSignature(search?: string): string;
/**
 * 当前页码（1 基）→ URL query（0 基规范名 page_idx）。
 * 仅当 URL 真正变化时返回新串，否则 null（调用方据此跳过写 history）。
 *
 * - 保留 job_id/document_id/mock 等既有参数；
 * - block_id 只在仍指向当前页时保留；滚动离开后剔除，避免刷新回跳旧锚点；
 * - 第 1 页且 URL 本无 page_idx 时视为等价，不写入以保持 URL 干净。
 */
export declare function buildReaderPageIdxSearch(search: string, pageNumber: number, resolveBlockPage?: (blockId: string) => number | null): string | null;
export declare function createReaderPageConfigPort({ messageTargetOrigin, isMock, mockJobId, search, }?: {
    messageTargetOrigin?: () => string;
    isMock?: () => boolean;
    mockJobId?: () => string;
    search?: () => string;
}): Readonly<{
    messageTargetOrigin: () => string;
    readerJobId: () => string;
}>;
export declare const defaultReaderPageConfigPort: Readonly<{
    messageTargetOrigin: () => string;
    readerJobId: () => string;
}>;
//# sourceMappingURL=page-config.d.ts.map