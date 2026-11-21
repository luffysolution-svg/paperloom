// 按块渲染 Markdown：每块一个 [data-md-block]，带它覆盖的 itemId，和左边 PDF 互相定位。
//
// 渲染是命令式的（marked + 公式 SVG + 受保护图片的 blob 加载都是 DOM 层的事），和整篇
// full.md 那条路共用同一套 markdown-render / markdown-math / markdown-images。

import { useEffect, useRef, useState, type RefObject } from "react";
import { fetchProtected, resolveMarkdownAssetUrl } from "../../external.js";
import { extractMarkdownMath, materializeMarkdownMathHtml } from "../../shared/content/markdown-math.js";
import { buildMarkdownOutline, type MarkdownOutlineItem } from "../../shared/content/markdown-outline.js";
import { startMarkdownImageLoading } from "../../shared/content/markdown-images.js";
import { loadMarked, mountRenderedMarkdown } from "../../shared/content/markdown-render.js";
import {
  readerMdBlockMarkdown,
  type ReaderMdBlock,
  type ReaderMdLanguage,
} from "../../shared/content/reader-blocks.js";

export type ReaderMdView = ReaderMdLanguage | "bilingual";

// 一批渲染多少块再让出主线程：几百块的书一次性 parse 会卡住面板打开的那一下。
const BATCH = 40;

// regions 里的图片地址是 /api/v1/jobs/... 这种根相对路径：直接当 src 会打到静态服务器
// （开发栈里静态页和 API 不同端口，404）。和整篇 full.md 一样交给宿主补上 API 地址。
const ASSETS = { resolveAssetUrl: resolveMarkdownAssetUrl };

export function useReaderBlockMarkdown(
  contentRef: RefObject<HTMLElement | null>,
  blocks: readonly ReaderMdBlock[],
  view: ReaderMdView,
  open: boolean,
) {
  const [status, setStatus] = useState("");
  const [outline, setOutline] = useState<MarkdownOutlineItem[]>([]);
  // itemId → 它所在的块元素。悬停跟随按 itemId 查，跨页合并的一段两个 itemId 指向同一块。
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const [renderedRevision, setRenderedRevision] = useState(0);

  useEffect(() => {
    const container = contentRef.current;
    if (!open || !container) return undefined;
    let cancelled = false;
    const controller = new AbortController();
    const objectUrls: string[] = [];
    const imageCleanups: Array<() => void> = [];
    const elements = new Map<string, HTMLElement>();
    elementsRef.current = elements;
    container.replaceChildren();
    setStatus("正在排版…");

    const scrollRoot = container.closest(".reader-notes-panel-body") as HTMLElement | null;

    const renderMarkdown = async (markdown: string, parse: (src: string) => string) => {
      const { text, slots } = extractMarkdownMath(markdown, { bareLatex: true });
      const html = parse(text);
      return slots.length > 0 ? materializeMarkdownMathHtml(html, slots) : html;
    };

    const fillSection = async (
      host: HTMLElement,
      block: ReaderMdBlock,
      language: ReaderMdLanguage,
      parse: (src: string) => string,
    ): Promise<HTMLImageElement[]> => {
      if (block.kind === "figure") {
        const html = block.assetUrls.map((url) => `<img src="${escapeAttribute(url)}" alt="">`).join("");
        return mountRenderedMarkdown(host, html, "", ASSETS);
      }
      let html = await renderMarkdown(readerMdBlockMarkdown(block, language), parse);
      if (block.kind === "formula" && block.label) {
        html += `<span class="reader-md-formula-label">${escapeText(block.label)}</span>`;
      }
      return mountRenderedMarkdown(host, html, "", ASSETS);
    };

    (async () => {
      try {
        const { marked } = await loadMarked();
        const parse = (src: string) => String(marked.parse(src, { async: false }));
        for (let start = 0; start < blocks.length; start += BATCH) {
          if (cancelled) return;
          const fragment = container.ownerDocument.createDocumentFragment();
          const images: HTMLImageElement[] = [];
          for (const block of blocks.slice(start, start + BATCH)) {
            const element = container.ownerDocument.createElement("div");
            element.className = `reader-md-block is-${block.kind}`;
            element.dataset.mdBlock = block.key;
            element.dataset.mdPage = `${block.page}`;
            element.tabIndex = 0;
            element.setAttribute("role", "button");
            element.setAttribute("aria-label", `跳到第 ${block.page} 页的这一块`);
            const bilingual = view === "bilingual" && block.hasTranslation;
            const languages: ReaderMdLanguage[] = bilingual
              ? ["source", "translated"]
              : [view === "source" ? "source" : "translated"];
            for (const language of languages) {
              const host = container.ownerDocument.createElement("div");
              host.className = bilingual ? `reader-md-block-${language}` : "reader-md-block-body";
              images.push(...await fillSection(host, block, language, parse));
              if (cancelled) return;
              element.appendChild(host);
            }
            for (const itemId of block.itemIds) elements.set(itemId, element);
            fragment.appendChild(element);
          }
          container.appendChild(fragment);
          container.classList.remove("hidden");
          imageCleanups.push(startMarkdownImageLoading(images, {
            root: scrollRoot,
            // 受保护的判断要以 API 地址为准（它可能是局域网 IP，和静态页不同源）。
            protectedBaseUrl: resolveMarkdownAssetUrl("", "/api/v1/"),
            fetchImage: fetchProtected,
            signal: controller.signal,
            onObjectUrl: (url) => objectUrls.push(url),
          }));
          // 让出一帧：首屏几十块先出来，剩下的在后面补。
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        if (cancelled) return;
        // 双语时每个标题原文、译文各一份，目录只列译文那份，不然条目翻倍。
        setOutline(buildMarkdownOutline(container).filter((item) =>
          !container.querySelector(`#${CSS.escape(item.id)}`)?.closest(".reader-md-block-source")));
        setStatus(`${blocks.length} 块`);
        setRenderedRevision((value) => value + 1);
      } catch (err) {
        if (!cancelled) setStatus(err instanceof Error ? err.message : "Markdown 排版失败");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      for (const cleanup of imageCleanups) cleanup();
      for (const url of objectUrls) {
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      }
    };
  }, [blocks, view, open, contentRef]);

  return { status, outline, elementsRef, renderedRevision };
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
