// Markdown 取数/分窗渲染：Range + ETag + 取消，按块挂载并维护目录、续带与 blob 生命周期。

import { useEffect, useRef, useState, type RefObject } from "react";
import { defaultReaderDataPort, fetchProtected, resolveMarkdownAssetUrl } from "../../external.js";
import {
  extractMarkdownMath,
  materializeMarkdownMathFallbackHtml,
  materializeMarkdownMathHtml,
} from "../../shared/content/markdown-math.js";
import { buildMarkdownOutline, type MarkdownOutlineItem } from "../../shared/content/markdown-outline.js";
import { startMarkdownImageLoading } from "../../shared/content/markdown-images.js";
import { loadMarked, mountRenderedMarkdown } from "../../shared/content/markdown-render.js";
import { normalizeMarkdownPayload } from "../../shared/data/markdown-payload.js";
import { takeCompleteMarkdownChunk } from "../../shared/content/markdown-windowing.js";

export type UseReaderMarkdownDocumentOptions = {
  open: boolean;
  jobId: string;
  sourceOnly: boolean;
  /** 当前搜索词，渲染完成后重算命中时读取。 */
  searchQueryRef: RefObject<string>;
  /** 正文渲染完成后重算搜索命中（含只渲染部分块时的补算）。 */
  reapplySearchRef: RefObject<() => void>;
};

export function useReaderMarkdownDocument({
  open,
  jobId,
  sourceOnly,
  searchQueryRef,
  reapplySearchRef,
}: UseReaderMarkdownDocumentOptions) {
  const contentRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState("尚未加载");
  const objectUrlsRef = useRef<string[]>([]);
  const imageLoaderCleanupRef = useRef<(() => void) | null>(null);
  // 递增式渲染：目录 id 去重表、每块图片加载清理、滚动续渲染的监听清理。
  const outlineUsedRef = useRef<Map<string, number>>(new Map());
  const chunkImageCleanupsRef = useRef<Array<() => void>>([]);
  const resumeCleanupRef = useRef<(() => void) | null>(null);
  // 搜索/跳转需要整篇：置真后分段渲染器不再因视口暂停，直到全部渲染完。
  const renderAllRef = useRef(false);
  // 目录是否覆盖整篇（未覆盖时 UI 明确提示，避免误导）。
  const outlineCompleteRef = useRef(false);
  // 跳转目标尚未渲染时的待办锚点，续带命中后自动滚动。
  const pendingAnchorRef = useRef<string | null>(null);
  const [outline, setOutline] = useState<MarkdownOutlineItem[]>([]);
  const [outlineComplete, setOutlineComplete] = useState(false);
  const [pendingResume, setPendingResume] = useState(false);

  const revokeAll = () => {
    for (const url of objectUrlsRef.current) {
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    }
    objectUrlsRef.current = [];
  };

  // 回收当前已挂载分块产生的图片加载器 / blob / 滚动续带监听。ETag 变化、
  // 服务端忽略 Range 回整篇、卸载/重开都必须走这里，否则旧图 blob 会泄漏。
  const teardownRenderedContent = () => {
    imageLoaderCleanupRef.current?.();
    imageLoaderCleanupRef.current = null;
    for (const cleanup of chunkImageCleanupsRef.current) cleanup();
    chunkImageCleanupsRef.current = [];
    resumeCleanupRef.current?.();
    resumeCleanupRef.current = null;
    revokeAll();
  };

  // 基于当前已挂载的全部块重算目录，保证打开目录/跳转时覆盖所有已加载内容。
  const rebuildOutline = () => {
    const container = contentRef.current;
    if (!container) return;
    outlineUsedRef.current = new Map();
    setOutline(buildMarkdownOutline(container, outlineUsedRef.current));
  };

  const resolvePendingAnchor = () => {
    const anchorId = pendingAnchorRef.current;
    const container = contentRef.current;
    if (!anchorId || !container) return;
    const target = [...container.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")]
      .find((heading) => heading.id === anchorId);
    if (!target) return;
    pendingAnchorRef.current = null;
    if (typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  };

  useEffect(() => {
    return () => {
      imageLoaderCleanupRef.current?.();
      revokeAll();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      teardownRenderedContent();
      setOutline([]);
      outlineCompleteRef.current = false;
      setOutlineComplete(false);
      return;
    }
    let cancelled = false;
    // 每次重新加载前回收上一轮 blob / 图片 / 滚动监听，避免 jobId 切换/重开时泄漏
    teardownRenderedContent();
    outlineUsedRef.current = new Map();
    outlineCompleteRef.current = false;
    setOutlineComplete(false);
    setOutline([]);
    renderAllRef.current = false;
    pendingAnchorRef.current = null;
    setPendingResume(false);
    // 卸载/重来时中止在途的 Range / 图片请求，避免旧版本结果落地。
    const controller = new AbortController();

    const dataPort: any = defaultReaderDataPort;

    async function load() {
      const isSynthetic = jobId.startsWith("doc:");
      if (!jobId || isSynthetic) {
        // OCR 吸怪：馆藏合成 job(doc:*) 仍提示源文档无 Markdown；但 OCR-only 已通过 active_job_id 落真实 job_id（非合成），此分支不再误拦
        const msg = !jobId && sourceOnly ? "源文档阅读不提供 Markdown 产物" : "该任务暂无 Markdown 产物";
        setStatus(msg);
        if (contentRef.current) {
          contentRef.current.replaceChildren();
          contentRef.current.classList.add("hidden");
        }
        return;
      }
      setStatus("正在加载 Markdown…");
      contentRef.current?.replaceChildren();
      contentRef.current?.classList.add("hidden");

      // ---- 分段读取（真实后端：?raw=true 支持 HTTP Range）----
      // 仅在宿主注入 loadMarkdownSource/fetchMarkdownRange 时启用；mock/旧宿主回退整篇。
      try {
        if (typeof dataPort?.loadMarkdownSource === "function"
          && typeof dataPort?.loadMarkdownRange === "function") {
          const source = await dataPort.loadMarkdownSource(jobId, controller.signal);
          if (cancelled) return;
          if (source?.rawUrl) {
            await loadProgressive(source);
            return;
          }
        }
      } catch {
        // 来源解析失败：回退整篇加载
      }

      // ---- 整篇加载（mock / 旧宿主）----
      try {
        const payload = await defaultReaderDataPort.loadMarkdownPayload(jobId);
        if (cancelled) return;
        const { content, imagesBaseUrl } = normalizeMarkdownPayload(payload);
        if (!content.trim()) {
          setStatus("该任务暂无 Markdown 产物");
          contentRef.current?.replaceChildren();
          contentRef.current?.classList.add("hidden");
          return;
        }
        const { marked } = await loadMarked();
        if (cancelled || !contentRef.current) return;
        // 与实时叠加一致：Markdown 原文也可能含未用 `$` 包裹的裸 LaTeX
        // （如 `\mathrm{Pd_2(dba)_3}`），开启 bareLatex 才能渲染。
        const { text: protectedMarkdown, slots } = extractMarkdownMath(content, { bareLatex: true });
        const parsedHtml = String(marked.parse(protectedMarkdown, { async: false }));
        const fastHtml = materializeMarkdownMathFallbackHtml(parsedHtml, slots);
        mountRenderedMarkdown(contentRef.current, fastHtml, imagesBaseUrl, {
          resolveAssetUrl: resolveMarkdownAssetUrl,
        });
        setOutline(buildMarkdownOutline(contentRef.current));
        reapplySearchRef.current?.();
        setStatus(slots.length > 0 ? `正文已显示 · 正在渲染 ${slots.length} 个公式…` : "");

        const html = slots.length > 0
          ? await materializeMarkdownMathHtml(parsedHtml, slots)
          : parsedHtml;
        if (cancelled || !contentRef.current) return;
        const images = mountRenderedMarkdown(contentRef.current, html, imagesBaseUrl, {
          resolveAssetUrl: resolveMarkdownAssetUrl,
        });
        setOutline(buildMarkdownOutline(contentRef.current));
        outlineCompleteRef.current = true;
        setOutlineComplete(true);
        reapplySearchRef.current?.();
        setStatus("");
        const scrollRoot = contentRef.current.closest(".reader-notes-panel-body");
        imageLoaderCleanupRef.current = startMarkdownImageLoading(images, {
          root: scrollRoot,
          protectedBaseUrl: imagesBaseUrl || contentRef.current.ownerDocument.baseURI,
          fetchImage: fetchProtected,
          signal: controller.signal,
          onObjectUrl: (url) => objectUrlsRef.current.push(url),
          onProgress: ({ failed }) => {
            if (!cancelled && failed > 0) setStatus(`正文已加载 · ${failed} 张图片不可用`);
          },
        });
      } catch (err) {
        if (cancelled) return;
        setStatus(err instanceof Error ? err.message : "Markdown 加载失败");
      }
    }

    // 分段读取：Range 拉取（单 TextDecoder 跨块解码）→ 按块边界增量渲染 →
    // 滚动到接近底部再续拉/续渲染。这样几百页 md 首屏只解析前几块，不再一次性
    // parse + 挂载整篇。
    async function loadProgressive(source: any) {
      const container = contentRef.current;
      if (!container) return;
      const WINDOW = 262144;
      const MIN_CHUNK = 8192;
      const imagesBaseUrl = `${source.imagesBaseUrl || ""}`;
      const scrollRoot = container.closest(".reader-notes-panel-body") as HTMLElement | null;
      // 不清则重来时残留污染解码状态；不清零则漏掉半截多字节字符。
      let decoder = new TextDecoder();
      let cursor = 0;
      let etag = `${source.etag || ""}`;
      let total: number | null = Number.isFinite(Number(source.totalBytes))
        ? Number(source.totalBytes)
        : null;
      let pending = "";
      let atEof = false;
      // 用户不滚动时不能永久卡住：有限次自动续带（防一次性拉满），超出后保留
      // 明确的「继续加载」入口。
      const MAX_AUTO_RESUME = 4;
      const RESUME_TIMEOUT_MS = 4000;
      let autoResumeCount = 0;

      // ETag 变化 / 回整篇重建前必须回收旧的图片加载器与 blob，否则泄漏。
      const resetRenderedOutput = () => {
        for (const cleanup of chunkImageCleanupsRef.current) cleanup();
        chunkImageCleanupsRef.current = [];
        revokeAll();
        outlineUsedRef.current = new Map();
        setOutline([]);
      };

      const mountChunk = async (markdownChunk: string) => {
        const { marked } = await loadMarked();
        if (cancelled || !contentRef.current) return;
        const { text, slots } = extractMarkdownMath(markdownChunk, { bareLatex: true });
        const parsedHtml = String(marked.parse(text, { async: false }));
        const html = slots.length > 0
          ? await materializeMarkdownMathHtml(parsedHtml, slots)
          : parsedHtml;
        if (cancelled || !contentRef.current) return;
        const section = container.ownerDocument.createElement("section");
        section.className = "reader-markdown-chunk";
        const images = mountRenderedMarkdown(section, html, imagesBaseUrl, {
          resolveAssetUrl: resolveMarkdownAssetUrl,
        });
        container.appendChild(section);
        container.classList.remove("hidden");
        const items = buildMarkdownOutline(section, outlineUsedRef.current);
        if (items.length) setOutline((prev) => [...prev, ...items]);
        resolvePendingAnchor();
        const cleanup = startMarkdownImageLoading(images, {
          root: scrollRoot,
          protectedBaseUrl: imagesBaseUrl || container.ownerDocument.baseURI,
          fetchImage: fetchProtected,
          signal: controller.signal,
          onObjectUrl: (url) => objectUrlsRef.current.push(url),
          onProgress: ({ failed }) => {
            if (!cancelled && failed > 0) setStatus(`正文已加载 · ${failed} 张图片不可用`);
          },
        });
        chunkImageCleanupsRef.current.push(cleanup);
      };

      // 已渲染内容超过约两屏时暂停，等用户滚动到接近底部再继续；用户不滚动时
      // 也有限次自动续带（避免永久卡在「正在加载 Markdown…」），超出上限后保留
      // 「继续加载」按钮，绝不无限等待，也不会一次性拉满整篇。
      const pauseIfLongEnough = async () => {
        if (renderAllRef.current || !scrollRoot || cancelled) return;
        if (container.scrollHeight <= scrollRoot.clientHeight * 2) return;
        setPendingResume(true);
        setStatus("已加载部分 · 滚动或点击继续加载");
        await new Promise<void>((resolve) => {
          let settled = false;
          let timer: ReturnType<typeof setTimeout> | null = null;
          const finish = (manual: boolean) => {
            if (settled) return;
            settled = true;
            scrollRoot.removeEventListener("scroll", onScroll);
            if (timer) {
              clearTimeout(timer);
              timer = null;
            }
            resumeCleanupRef.current = null;
            if (!cancelled) {
              setPendingResume(false);
              // 用户主动滚动/点击后续带后，重新给满自动续带额度。
              if (manual) autoResumeCount = 0;
            }
            resolve();
          };
          const onScroll = () => {
            if (container.scrollHeight <= scrollRoot.clientHeight * 2
              || scrollRoot.scrollTop + scrollRoot.clientHeight >= container.scrollHeight - 800) {
              finish(true);
            }
          };
          resumeCleanupRef.current = () => finish(true);
          scrollRoot.addEventListener("scroll", onScroll, { passive: true });
          if (autoResumeCount < MAX_AUTO_RESUME) {
            autoResumeCount += 1;
            timer = setTimeout(() => finish(false), RESUME_TIMEOUT_MS);
          }
        });
      };

      try {
        while (!atEof && !cancelled) {
          const res = await dataPort.loadMarkdownRange(
            source.rawUrl,
            cursor,
            cursor + WINDOW - 1,
            etag || undefined,
            controller.signal,
          );
          if (cancelled) return;
          if (res.status === 404) {
            setStatus("该任务暂无 Markdown 产物");
            container.replaceChildren();
            container.classList.add("hidden");
            return;
          }
          if (res.status === 200) {
            // 服务端忽略了 Range（ETag 变了 / 无 Range 支持）：按整篇重建。
            container.replaceChildren();
            resetRenderedOutput();
            decoder = new TextDecoder();
            pending = decoder.decode(res.bytes, { stream: false });
            atEof = true;
          } else if (res.status === 206) {
            // 段落之间 ETag 变了（文件被就地改写）：已拼内容会是两个版本的混合，
            // 静默错误最危险 —— 直接清零，从 0 重来。
            if (etag && res.etag && res.etag !== etag) {
              container.replaceChildren();
              resetRenderedOutput();
              decoder = new TextDecoder();
              pending = "";
              cursor = 0;
              atEof = false;
              etag = res.etag;
              continue;
            }
            if (!etag && res.etag) etag = res.etag;
            if (res.totalBytes != null) total = res.totalBytes;
            const next = res.rangeEnd != null ? res.rangeEnd + 1 : cursor + res.bytes.length;
            atEof = total != null ? next >= total : res.bytes.length < WINDOW;
            pending += decoder.decode(res.bytes, { stream: !atEof });
            cursor = next;
          } else {
            throw new Error(`读取 Markdown 失败，请稍后重试。(${res.status})`);
          }

          let chunk = takeCompleteMarkdownChunk(pending, { minChars: MIN_CHUNK });
          while (chunk && !cancelled) {
            pending = chunk.rest;
            await mountChunk(chunk.complete);
            if (cancelled) return;
            await pauseIfLongEnough();
            chunk = takeCompleteMarkdownChunk(pending, { minChars: MIN_CHUNK });
          }
          if (atEof && pending.trim()) {
            await mountChunk(pending);
            pending = "";
          }
        }
        if (!cancelled) {
          // 整篇完成后基于全部已加载块重建目录并标记完整，供打开目录/跳转使用。
          rebuildOutline();
          outlineCompleteRef.current = true;
          setOutlineComplete(true);
          resolvePendingAnchor();
          setStatus("");
          // 整篇渲染完成后重算搜索：覆盖之前只渲染部分块时漏掉的命中。
          if (searchQueryRef.current.trim()) reapplySearchRef.current?.();
        }
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setStatus(err instanceof Error ? err.message : "Markdown 加载失败");
      }
    }

    void load();
    return () => {
      cancelled = true;
      // 中止在途 Range / 图片请求；旧结果因 cancelled / signal.aborted 不再落地。
      controller.abort();
      teardownRenderedContent();
      // 中途取消时可能仍持有已创建的 blob，teardown 已回收；此处不直接 revoke
      // 与进行中 Promise 竞争，依赖 cancelled 检查让落点自行 revoke。
    };
  }, [open, jobId, sourceOnly]);

  return {
    contentRef,
    status,
    setStatus,
    outline,
    setOutline,
    outlineComplete,
    setOutlineComplete,
    outlineCompleteRef,
    pendingResume,
    rebuildOutline,
    renderAllRef,
    pendingAnchorRef,
    resumeCleanupRef,
  };
}
