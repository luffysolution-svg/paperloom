// 三路下载（原始 / 对照 / 译文）的 URL 解析与 busy 状态。
//
// 这套逻辑原来住在可拖动圆钮（FAB）的菜单里，而圆钮在任何 dock 面板开着时会被
// `.is-assistant-open .reader-fab { opacity: 0 }` 整个吃掉 —— 也就是说「开着
// Markdown 就下载不了 PDF」。现在入口搬到顶栏（ReaderDownloadActions），和
// 「关闭回主页」同一组，永远在。

import { useCallback, useMemo, useState } from "react";
import type { ReaderDownloadContext } from "../../hooks/use-reader-session.js";
import {
  downloadProtectedResource,
  failDownloadToast,
  resolveReaderDownloadName,
  resolveReaderDownloadUrls,
  trimReaderDownloadString,
} from "../../external.js";

export const READER_DOWNLOAD_ORDER = ["source", "sideBySide", "translated"] as const;
export type ReaderDownloadAction = (typeof READER_DOWNLOAD_ORDER)[number];
export type ReaderDownloadUrls = Record<ReaderDownloadAction, string>;

const EMPTY_URLS: ReaderDownloadUrls = { source: "", translated: "", sideBySide: "" };

export function resolveReaderDownloadTargets(ctx: ReaderDownloadContext): ReaderDownloadUrls {
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
  }) as ReaderDownloadUrls;
}

export function useReaderDownloads(download: ReaderDownloadContext | undefined) {
  const [busyActions, setBusyActions] = useState<Set<ReaderDownloadAction>>(() => new Set());

  const urls = useMemo(
    () => (download ? resolveReaderDownloadTargets(download) : EMPTY_URLS),
    [download],
  );

  const downloadItems = useMemo(
    () => READER_DOWNLOAD_ORDER.filter((action) => !(download?.sourceOnly && action !== "source")),
    [download?.sourceOnly],
  );

  const handleDownload = useCallback(async (action: ReaderDownloadAction) => {
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
