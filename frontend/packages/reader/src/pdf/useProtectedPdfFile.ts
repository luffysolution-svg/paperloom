// 把需鉴权 / mock:// 的 PDF URL 拉成 react-pdf 可用的 { data: Uint8Array }。
// 会话层会先整文件下载完成再展示；本 hook 也可独立使用。

import { useEffect, useState } from "react";
import { readerPdfPort } from "../external.js";

export type ProtectedPdfFile = { data: Uint8Array };

/**
 * PDF.js 会把传入的 ArrayBuffer 转移给 Worker，原 buffer 随后会 detached。
 * 缓存/会话持有的原始字节不能直接交给 Document，否则分栏切换导致重挂载时
 * 无法再次解析。每个 Document 实例只消费自己的副本。
 */
export function cloneProtectedPdfFileForWorker(
  file: ProtectedPdfFile | null,
): ProtectedPdfFile | null {
  return file ? { data: file.data.slice() } : null;
}

type ProtectedPdfState = {
  file: ProtectedPdfFile | null;
  loading: boolean;
  error: string;
};

const MAX_FILE_CACHE = 2;
const fileCache = new Map<string, ProtectedPdfFile>();

function touchFileCache(key: string, value: ProtectedPdfFile): void {
  fileCache.delete(key);
  fileCache.set(key, value);
}

function evictIfNeeded(excludeKey?: string): void {
  if (fileCache.size < MAX_FILE_CACHE) return;
  if (excludeKey && fileCache.has(excludeKey)) return;
  const oldest = fileCache.keys().next().value as string | undefined;
  if (oldest) fileCache.delete(oldest);
}

function setCachedProtectedPdf(url: string, file: ProtectedPdfFile) {
  const key = `${url || ""}`.trim();
  if (!key) return;
  if (fileCache.has(key)) {
    touchFileCache(key, file);
    return;
  }
  evictIfNeeded();
  fileCache.set(key, file);
}

export async function loadProtectedPdfFile(
  url: string,
  fetchResource: typeof fetch = readerPdfPort().fetchProtected,
  options: { signal?: AbortSignal } = {},
): Promise<ProtectedPdfFile | null> {
  const normalized = `${url || ""}`.trim();
  if (!normalized) {
    return null;
  }
  if (fileCache.has(normalized)) {
    const cached = fileCache.get(normalized)!;
    touchFileCache(normalized, cached);
    return cached;
  }
  const response = await fetchResource(normalized, { signal: options.signal } as RequestInit);
  if (!response.ok) {
    const err = new Error(`读取 PDF 失败 (${response.status})`) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  const buffer = await response.arrayBuffer();
  const file = { data: new Uint8Array(buffer) };
  if (fileCache.has(normalized)) {
    touchFileCache(normalized, file);
  } else {
    evictIfNeeded();
    fileCache.set(normalized, file);
  }
  return file;
}

const EMPTY_STATE: ProtectedPdfState = { file: null, loading: false, error: "" };
const LOADING_STATE: ProtectedPdfState = { file: null, loading: true, error: "" };

export function useProtectedPdfFile(
  url = "",
  /** 会话已预下载时直接注入，跳过二次请求 */
  preloaded: ProtectedPdfFile | null = null,
): ProtectedPdfState {
  const normalized = `${url || ""}`.trim();
  // 结果记着它属于哪个 url。以前只存文件，换 url 后的第一次渲染还返回旧文件：
  // PdfDocumentPane 拿「新 url + 旧字节」当 Document 的 key 先重挂一次，还把旧 PDF
  // 整份复制一遍交给 worker，等 effect 换掉文件再挂一次。
  const [loaded, setLoaded] = useState<(ProtectedPdfState & { url: string }) | null>(null);

  useEffect(() => {
    if (preloaded || !normalized) return undefined;
    const cached = fileCache.get(normalized);
    if (cached) {
      // 渲染里只读缓存不动它；LRU 的「最近用过」在这里记。
      touchFileCache(normalized, cached);
      setLoaded({ url: normalized, file: cached, loading: false, error: "" });
      return undefined;
    }
    const controller = new AbortController();
    loadProtectedPdfFile(normalized, undefined, { signal: controller.signal })
      .then((next) => {
        if (!controller.signal.aborted) setLoaded({ url: normalized, file: next, loading: false, error: "" });
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setLoaded({ url: normalized, file: null, loading: false, error: err?.message || String(err) });
        }
      });
    // 换书或卸载时中止下载，被放弃的大文件不再下完。
    return () => controller.abort();
  }, [normalized, preloaded]);

  if (preloaded) return { file: preloaded, loading: false, error: "" };
  if (!normalized) return EMPTY_STATE;
  const cached = fileCache.get(normalized);
  if (cached) return { file: cached, loading: false, error: "" };
  if (loaded?.url === normalized) return loaded;
  return LOADING_STATE;
}
