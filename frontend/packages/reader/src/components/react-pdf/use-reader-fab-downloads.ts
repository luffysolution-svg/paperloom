// ReaderFab 三路下载（原始 / 对照 / 译文）的 URL 解析与 busy 状态。
// 从 ReaderFab.tsx 抽出，主组件只消费结果。

import { useCallback, useMemo, useState } from "react";
import type { ReaderDownloadContext } from "../../hooks/use-reader-session.js";
import {
  downloadProtectedResource,
  failDownloadToast,
  resolveReaderDownloadName,
  resolveReaderDownloadUrls,
  trimReaderDownloadString,
} from "../../external.js";

export const FAB_DOWNLOAD_ORDER = ["source", "sideBySide", "translated"] as const;
export type FabDownloadAction = (typeof FAB_DOWNLOAD_ORDER)[number];
export type FabDownloadUrls = Record<FabDownloadAction, string>;

const EMPTY_URLS: FabDownloadUrls = { source: "", translated: "", sideBySide: "" };

export function resolveFabDownloadUrls(ctx: ReaderDownloadContext): FabDownloadUrls {
  if (ctx.sourceOnly || !ctx.jobId) {
    const source = trimReaderDownloadString(ctx.sourceUrl);
    const translated = trimReaderDownloadString(ctx.translatedUrl);
    return {
      source,
      translated,
      // sideBySide requires dedicated artifact; no fallback to source url
      sideBySide: "",
    };
  }
  return resolveReaderDownloadUrls({
    jobId: ctx.jobId,
    jobPayload: ctx.jobPayload,
    manifestPayload: ctx.manifestPayload,
  }) as FabDownloadUrls;
}

export function useReaderFabDownloads(download: ReaderDownloadContext | undefined) {
  const [busyActions, setBusyActions] = useState<Set<FabDownloadAction>>(() => new Set());

  const urls = useMemo(
    () => (download ? resolveFabDownloadUrls(download) : EMPTY_URLS),
    [download],
  );

  const downloadItems = useMemo(
    () => FAB_DOWNLOAD_ORDER.filter((action) => !(download?.sourceOnly && action !== "source")),
    [download?.sourceOnly],
  );

  const handleDownload = useCallback(async (action: FabDownloadAction) => {
    if (!download) return;
    const url = trimReaderDownloadString(urls[action]);
    if (!url || busyActions.has(action)) return;
    try {
      const filename = download.jobId
        ? resolveReaderDownloadName(action, {
            jobId: download.jobId,
            jobPayload: download.jobPayload,
            manifestPayload: download.manifestPayload,
          })
        : `${download.sourceOnly ? "document" : "reader"}-${action}.pdf`;
      await downloadProtectedResource(
        download.fetchProtected,
        url,
        filename,
        filename,
        null,
        (busy: boolean) => setBusyActions((prev) => {
          const next = new Set(prev);
          if (busy) next.add(action);
          else next.delete(action);
          return next;
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "下载失败";
      failDownloadToast(message);
      setBusyActions((prev) => {
        const next = new Set(prev);
        next.delete(action);
        return next;
      });
    }
  }, [urls, busyActions, download]);

  return { urls, downloadItems, busyActions, handleDownload };
}
