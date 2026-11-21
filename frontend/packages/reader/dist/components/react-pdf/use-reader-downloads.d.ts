import type { ReaderDownloadContext } from "../../hooks/use-reader-session.js";
export declare const READER_DOWNLOAD_ORDER: readonly ["source", "sideBySide", "translated"];
export type ReaderDownloadAction = (typeof READER_DOWNLOAD_ORDER)[number];
export type ReaderDownloadUrls = Record<ReaderDownloadAction, string>;
export declare function resolveReaderDownloadTargets(ctx: ReaderDownloadContext): ReaderDownloadUrls;
export declare function useReaderDownloads(download: ReaderDownloadContext | undefined): {
    urls: ReaderDownloadUrls;
    downloadItems: ("sideBySide" | "source" | "translated")[];
    busyActions: Set<"sideBySide" | "source" | "translated">;
    handleDownload: (action: ReaderDownloadAction) => Promise<void>;
};
//# sourceMappingURL=use-reader-downloads.d.ts.map