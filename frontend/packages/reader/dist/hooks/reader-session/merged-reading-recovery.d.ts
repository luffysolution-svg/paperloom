type FetchReading = (apiPrefix: string, documentId: string) => Promise<{
    job_id: string | null;
}>;
/** 只换路由里的 job_id / document_id，页码、块锚点、mock 这些参数原样留着。 */
export declare function readerUrlAfterExpiredMerge(href: string, documentId: string, nextJobId: string | null): string;
/**
 * 换过去返回 true；问不到入口、或者入口又给回同一个过期编号（不该发生，防止来回刷新）返回 false，
 * 调用方照旧显示加载失败。
 */
export declare function reopenExpiredMergedReading({ apiPrefix, documentId, expiredJobId, fetchReading, location, }: {
    apiPrefix: string;
    documentId: string;
    expiredJobId: string;
    fetchReading?: FetchReading;
    location?: Pick<Location, "href" | "replace">;
}): Promise<boolean>;
export {};
//# sourceMappingURL=merged-reading-recovery.d.ts.map