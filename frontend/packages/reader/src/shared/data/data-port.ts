// 共享真值（原 frontend/web/src/js/reader/data-port.ts），已抽离为纯函数 + 可注入依赖
// 不直接 import frontend/web 的 api/http，改为参数注入，默认用 window/fetch 或空实现

import type { ReaderLiveTranslationPort } from "../../contracts/live-translation.js";

import {
  hasMarkdownContent,
  loadMarkdownPayloadWithFallback,
  resolveLinkedMarkdownJobId,
} from "./markdown-payload.js";

const DEFAULT_API_PREFIX = "/api/v1";

/**
 * 同一 job 的短期复用窗口。远小于 1s 轮询节奏，只消除同一时刻并发/紧邻的
 * 重复请求（loadReaderPayload / markdown fallback / resolveMarkdownSource /
 * 轮询），不改变每次轮询仍取新数据的刷新语义。
 */
const JOB_LOAD_REUSE_MS = 250;

/** 可选产物（regions/metadata）失败降级：保留 fallback 值，同时记录真实错误。 */
function settleOptional<T>(
  load: () => Promise<T>,
  fallback: T,
): Promise<{ value: T; error: unknown }> {
  return load().then(
    (value) => ({ value, error: null }),
    (error) => ({ value: fallback, error }),
  );
}

function defaultLoadJob(): Promise<unknown> {
  return Promise.resolve(null);
}
function defaultLoadManifest(): Promise<unknown> {
  return Promise.resolve({ items: [] } as unknown);
}
function defaultLoadMarkdown(): Promise<unknown> {
  return Promise.resolve(null);
}
function defaultLoadMarkdownDocument(): Promise<unknown> {
  return Promise.resolve(null);
}
function defaultLoadRegions(): Promise<unknown> {
  return Promise.resolve({ items: [] } as unknown);
}
function defaultLoadMetadata(): Promise<unknown> {
  return Promise.resolve(null);
}
function defaultFetchProtected(input: any, init?: RequestInit): Promise<Response> {
  if (typeof globalThis.fetch === "function") {
    return (globalThis.fetch as any)(input, init);
  }
  return Promise.reject(new Error(`fetchProtected not injected for ${input}`));
}

/** Markdown 原文的来源描述（来自 job detail artifacts.markdown）。 */
export type MarkdownSourceDescriptor = {
  rawUrl: string;
  totalBytes: number | null;
  imagesBaseUrl: string;
  etag?: string | null;
};

/** 一次 HTTP Range 拉取的结果（后端 ?raw=true 支持 206/Range）。 */
export type MarkdownRangeResult = {
  status: number;
  bytes: Uint8Array;
  totalBytes: number | null;
  /** Content-Range 的结束字节（含），供下一段 cursor = rangeEnd + 1 */
  rangeEnd: number | null;
  etag: string | null;
};

export function createReaderDataPort({
  apiPrefix = DEFAULT_API_PREFIX,
  loadJob = defaultLoadJob,
  loadManifest = defaultLoadManifest,
  loadMarkdown = defaultLoadMarkdown,
  loadMarkdownDocument = defaultLoadMarkdownDocument,
  loadMarkdownSource = null,
  fetchMarkdownRange = null,
  loadRegions = defaultLoadRegions,
  loadMetadata = defaultLoadMetadata,
  fetchProtectedResource = defaultFetchProtected,
  liveTranslation = null,
}: {
  apiPrefix?: string;
  loadJob?: (jobId: string, apiPrefix: string) => Promise<unknown>;
  loadManifest?: (jobId: string, apiPrefix: string) => Promise<unknown>;
  loadMarkdown?: (jobId: string, apiPrefix: string) => Promise<unknown>;
  loadMarkdownDocument?: (jobId: string, apiPrefix: string) => Promise<unknown>;
  loadMarkdownSource?: ((jobId: string, apiPrefix: string) => Promise<MarkdownSourceDescriptor | null>) | null;
  fetchMarkdownRange?: ((rawUrl: string, start: number, endInclusive: number, etag?: string, signal?: AbortSignal) => Promise<MarkdownRangeResult>) | null;
  loadRegions?: (jobId: string, apiPrefix: string) => Promise<unknown>;
  loadMetadata?: (jobId: string, apiPrefix: string) => Promise<unknown>;
  fetchProtectedResource?: typeof fetch;
  liveTranslation?: ReaderLiveTranslationPort | null;
} = {}) {
  // 同一 jobId 的短期 in-flight / 结果复用。status 轮询、loader 编排与
  // markdown fallback 可能在同一时刻打同一端点，这里合并为一次请求。
  const inFlightJobLoads = new Map<string, Promise<unknown>>();
  const recentJobLoads = new Map<string, { at: number; value: unknown }>();

  function loadJobShared(jobId: string): Promise<unknown> {
    const recent = recentJobLoads.get(jobId);
    if (recent && Date.now() - recent.at < JOB_LOAD_REUSE_MS) {
      return Promise.resolve(recent.value);
    }
    const pending = inFlightJobLoads.get(jobId);
    if (pending) return pending;
    let request: Promise<unknown>;
    try {
      request = Promise.resolve(loadJob(jobId, apiPrefix))
        .then((value) => {
          const now = Date.now();
          recentJobLoads.set(jobId, { at: now, value });
          for (const [key, entry] of recentJobLoads) {
            if (now - entry.at >= JOB_LOAD_REUSE_MS) recentJobLoads.delete(key);
          }
          return value;
        })
        .finally(() => {
          if (inFlightJobLoads.get(jobId) === request) inFlightJobLoads.delete(jobId);
        });
    } catch (error) {
      request = Promise.reject(error);
    }
    inFlightJobLoads.set(jobId, request);
    return request;
  }

  async function loadReaderPayload(
    jobId: string,
    options: { includeOptionalArtifacts?: boolean } = {},
  ) {
    const includeOptional = options.includeOptionalArtifacts !== false;
    const jobPromise = loadJobShared(jobId);
    // During OCR the immutable artifact manifest does not exist yet, so a 404
    // stays a normal in-progress state (the API layer already maps it to
    // `{ items: [] }`, but older/mock hosts may reject). Any other rejection is
    // a real failure (network/5xx) and must surface with its accurate message
    // instead of being swallowed into the generic "PDF 下载失败" screen.
    const manifestPromise = loadManifest(jobId, apiPrefix).catch((error) => {
      if (Number((error as { status?: number })?.status) === 404) return { items: [] };
      throw error;
    });
    if (!includeOptional) {
      const [jobPayload, manifestPayload] = await Promise.all([jobPromise, manifestPromise]);
      return {
        jobPayload,
        manifestPayload,
        readerMetadata: null,
        regionsPayload: { items: [] },
        readerErrors: { regions: null, metadata: null },
      };
    }
    // regions/metadata are optional overlays: a failure must not be fatal, but
    // it must be recorded rather than silently normalized into empty data.
    const [jobPayload, manifestPayload, regionsResult, metadataResult] = await Promise.all([
      jobPromise,
      manifestPromise,
      settleOptional(() => (loadRegions as any)(jobId, apiPrefix), { items: [] }),
      settleOptional(() => (loadMetadata as any)(jobId, apiPrefix), null),
    ]);
    return {
      jobPayload,
      manifestPayload,
      readerMetadata: metadataResult.value,
      regionsPayload: regionsResult.value,
      readerErrors: {
        regions: regionsResult.error,
        metadata: metadataResult.error,
      },
    };
  }

  function loadJobPayload(jobId: string) {
    return loadJobShared(jobId);
  }

  async function loadMarkdownPayload(jobId: string) {
    const currentPayload = await loadMarkdownPayloadWithFallback(
      () => loadMarkdownDocument(jobId, apiPrefix),
      () => loadMarkdown(jobId, apiPrefix),
    );
    if (hasMarkdownContent(currentPayload)) return currentPayload;

    // OCR-reuse translation jobs do not copy the source Markdown into their
    // own job root. Follow the public source_artifact_job_id and load the
    // canonical Markdown from the OCR job instead.
    try {
      const jobPayload = await loadJobShared(jobId);
      const linkedJobId = resolveLinkedMarkdownJobId(jobPayload, jobId);
      if (!linkedJobId) return currentPayload;
      const linkedPayload = await loadMarkdownPayloadWithFallback(
        () => loadMarkdownDocument(linkedJobId, apiPrefix),
        () => loadMarkdown(linkedJobId, apiPrefix),
      );
      return hasMarkdownContent(linkedPayload) ? linkedPayload : currentPayload;
    } catch {
      return currentPayload;
    }
  }

  // Range 分段读原文：优先真实后端（job detail 已给 raw_url/images_base_url/
  // size_bytes），无端口（mock/旧宿主）时返回 null，panel 回退整篇加载。
  async function resolveMarkdownSource(jobId: string): Promise<MarkdownSourceDescriptor | null> {
    if (typeof loadMarkdownSource !== "function") return null;
    let source = await loadMarkdownSource(jobId, apiPrefix).catch(() => null);
    if (source?.rawUrl) return source;
    // OCR-reuse translation job：Markdown 归属 source OCR job。
    try {
      const jobPayload = await loadJobShared(jobId);
      const linkedJobId = resolveLinkedMarkdownJobId(jobPayload, jobId);
      if (!linkedJobId) return source;
      source = await loadMarkdownSource(linkedJobId, apiPrefix).catch(() => null);
      return source?.rawUrl ? source : null;
    } catch {
      return source;
    }
  }

  function loadMarkdownRange(rawUrl: string, start: number, endInclusive: number, etag?: string, signal?: AbortSignal) {
    if (typeof fetchMarkdownRange !== "function") {
      return Promise.reject(new Error("fetchMarkdownRange not injected"));
    }
    return fetchMarkdownRange(rawUrl, start, endInclusive, etag, signal);
  }

  return Object.freeze({
    apiPrefix,
    fetchProtected: fetchProtectedResource,
    loadMarkdownPayload,
    loadMarkdownSource: resolveMarkdownSource,
    loadMarkdownRange,
    loadJobPayload,
    loadReaderPayload,
    liveTranslation,
  });
}

export const defaultReaderDataPort = createReaderDataPort();
