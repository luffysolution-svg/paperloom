import type { ReaderDownloadContext } from "../../hooks/use-reader-session.js";
export declare const FAB_DOWNLOAD_ORDER: readonly ["source", "sideBySide", "translated"];
export type FabDownloadAction = (typeof FAB_DOWNLOAD_ORDER)[number];
export type FabDownloadUrls = Record<FabDownloadAction, string>;
export declare function resolveFabDownloadUrls(ctx: ReaderDownloadContext): FabDownloadUrls;
export declare function useReaderFabDownloads(download: ReaderDownloadContext | undefined): {
    urls: FabDownloadUrls;
    downloadItems: ("sideBySide" | "source" | "translated")[];
    busyActions: Set<"sideBySide" | "source" | "translated">;
    handleDownload: (action: FabDownloadAction) => Promise<void>;
};
//# sourceMappingURL=use-reader-fab-downloads.d.ts.map