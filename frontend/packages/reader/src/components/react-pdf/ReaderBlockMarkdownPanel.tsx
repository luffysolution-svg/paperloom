// Markdown 面板的按块视图：每块和左边 PDF 上的一块互相定位。
// - 点这里的一块 → PDF 滚到那页、那块闪一下红框；
// - 鼠标在这里的一块上 → PDF 上同一块画红色虚线框（和两栏 PDF 之间的悬停是同一个 store）；
// - 鼠标在 PDF 的一块上 → 这里对应的块高亮并滚进视野。
// 译文是按 itemId 接上的翻译结果，所以「原文 / 译文 / 双语」只是同一组块换个渲染。

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { ChevronDown, ChevronUp, ListTree, Search } from "lucide-react";
import {
  clearMarkdownSearchHighlights,
  findMarkdownSearchTargets,
} from "../../shared/content/markdown-search.js";
import type { ReaderMdBlock } from "../../shared/content/reader-blocks.js";
import type { RegionHoverStore } from "../../shared/state/region-hover-store.js";
import { ReaderPanelShell } from "./ReaderPanelShell.js";
import { useReaderBlockMarkdown, type ReaderMdView } from "./useReaderBlockMarkdown.js";

export type ReaderBlockMarkdownPanelProps = {
  open: boolean;
  blocks: readonly ReaderMdBlock[];
  side?: "left" | "right";
  regionHover?: RegionHoverStore;
  jumpToBlock?: (itemId: string) => void;
  onClose: () => void;
};

const VIEWS: ReadonlyArray<{ value: ReaderMdView; label: string }> = [
  { value: "translated", label: "译文" },
  { value: "source", label: "原文" },
  { value: "bilingual", label: "双语" },
];

export function ReaderBlockMarkdownPanel({
  open,
  blocks,
  side = "right",
  regionHover,
  jumpToBlock,
  onClose,
}: ReaderBlockMarkdownPanelProps) {
  const contentRef = useRef<HTMLElement | null>(null);
  const hasTranslation = blocks.some((block) => block.hasTranslation);
  const [view, setView] = useState<ReaderMdView>(hasTranslation ? "translated" : "source");
  const { status, outline, elementsRef, renderedRevision } = useReaderBlockMarkdown(contentRef, blocks, view, open);

  const [outlineOpen, setOutlineOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchMatchesRef = useRef<HTMLElement[]>([]);
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);

  // PDF → 这里：悬停跟随。只对来自 PDF 的悬停滚动；鼠标就在面板里时滚动会把块从鼠标下拽走。
  useEffect(() => {
    if (!regionHover) return undefined;
    let highlighted: HTMLElement | null = null;
    const sync = () => {
      const { itemId, origin } = regionHover.get();
      const element = itemId ? elementsRef.current.get(itemId) ?? null : null;
      if (element === highlighted) return;
      highlighted?.classList.remove("is-linked");
      highlighted = element;
      if (!element) return;
      element.classList.add("is-linked");
      if (origin === "pdf" && typeof element.scrollIntoView === "function") {
        element.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    };
    sync();
    const unsubscribe = regionHover.subscribe(sync);
    return () => {
      unsubscribe();
      highlighted?.classList.remove("is-linked");
    };
  }, [regionHover, elementsRef, renderedRevision]);

  // 这里 → PDF：悬停和点击都走事件委托，几百块不用各挂一套监听。
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return undefined;
    const blockOf = (target: EventTarget | null) =>
      (target instanceof Element ? target.closest<HTMLElement>("[data-md-block]") : null);
    const onOver = (event: MouseEvent) => {
      const element = blockOf(event.target);
      regionHover?.set(element?.dataset.mdBlock ?? null, "markdown");
    };
    const onLeave = () => regionHover?.set(null, "markdown");
    const activate = (element: HTMLElement | null) => {
      const itemId = element?.dataset.mdBlock;
      if (itemId) jumpToBlock?.(itemId);
    };
    const onClick = (event: MouseEvent) => {
      // 拖选文字复制时不跳；点到正文里的链接也不跳。
      if (container.ownerDocument.getSelection()?.toString()) return;
      if (event.target instanceof Element && event.target.closest("a[href]")) return;
      activate(blockOf(event.target));
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const element = blockOf(event.target);
      if (!element || element !== event.target) return;
      event.preventDefault();
      activate(element);
    };
    container.addEventListener("mouseover", onOver);
    container.addEventListener("mouseleave", onLeave);
    container.addEventListener("click", onClick);
    container.addEventListener("keydown", onKey);
    return () => {
      container.removeEventListener("mouseover", onOver);
      container.removeEventListener("mouseleave", onLeave);
      container.removeEventListener("click", onClick);
      container.removeEventListener("keydown", onKey);
    };
  }, [regionHover, jumpToBlock]);

  const activateSearchMatch = (index: number, scroll = true) => {
    const matches = searchMatchesRef.current;
    matches.forEach((element) => element.classList.remove("reader-markdown-search-hit-active"));
    if (matches.length === 0) {
      setActiveSearchIndex(-1);
      return;
    }
    const normalized = (index + matches.length) % matches.length;
    const target = matches[normalized];
    target.classList.add("reader-markdown-search-hit-active");
    setActiveSearchIndex(normalized);
    if (scroll && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };

  const applySearch = (query: string, scroll = false) => {
    const container = contentRef.current;
    if (!container) return;
    if (!query.trim()) clearMarkdownSearchHighlights(container);
    const matches = query.trim() ? findMarkdownSearchTargets(container, query) : [];
    searchMatchesRef.current = matches;
    setSearchMatchCount(matches.length);
    activateSearchMatch(matches.length > 0 ? 0 : -1, scroll);
  };

  // 换了原文 / 译文后 DOM 整个重画，命中要重算。
  useEffect(() => {
    if (searchQuery.trim()) applySearch(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderedRevision]);

  return (
    <ReaderPanelShell
      id="reader-markdown-panel"
      open={open}
      ariaLabel="Markdown 预览"
      className={`is-pane-${side}`}
      onClose={onClose}
      toolbar={(
        <span className="reader-notes-count">{status || "已加载"}</span>
      )}
    >
      <div className="reader-markdown-nav" aria-label="Markdown 导航与搜索">
        {hasTranslation ? (
          <div className="reader-md-view-switch" role="tablist" aria-label="显示原文还是译文">
            {VIEWS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={view === option.value}
                className={view === option.value ? "is-active" : undefined}
                onClick={() => setView(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
        <label className="reader-markdown-search">
          <Search size={13} aria-hidden />
          <input
            type="search"
            value={searchQuery}
            placeholder="搜索正文"
            aria-label="搜索 Markdown 正文"
            onChange={(event) => {
              setSearchQuery(event.target.value);
              applySearch(event.target.value, false);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || searchMatchCount === 0) return;
              event.preventDefault();
              activateSearchMatch(activeSearchIndex + (event.shiftKey ? -1 : 1));
            }}
          />
          {searchQuery ? (
            <span className="reader-markdown-search-count" aria-live="polite">
              {searchMatchCount > 0 ? `${activeSearchIndex + 1}/${searchMatchCount}` : "0/0"}
            </span>
          ) : null}
          <button
            type="button"
            aria-label="上一个搜索结果"
            disabled={searchMatchCount === 0}
            onClick={() => activateSearchMatch(activeSearchIndex - 1)}
          >
            <ChevronUp size={13} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="下一个搜索结果"
            disabled={searchMatchCount === 0}
            onClick={() => activateSearchMatch(activeSearchIndex + 1)}
          >
            <ChevronDown size={13} aria-hidden />
          </button>
        </label>
        <button
          type="button"
          className="reader-markdown-outline-toggle"
          aria-expanded={outlineOpen}
          disabled={outline.length === 0}
          onClick={() => setOutlineOpen((value) => !value)}
        >
          <ListTree size={13} aria-hidden />
          目录{outline.length > 0 ? ` ${outline.length}` : ""}
        </button>
      </div>
      {outlineOpen && outline.length > 0 ? (
        <nav className="reader-markdown-outline" aria-label="Markdown 目录">
          {outline.map((item) => (
            <button
              key={item.id}
              type="button"
              style={{ "--reader-md-outline-level": item.level - 1 } as CSSProperties}
              onClick={() => {
                const target = contentRef.current?.querySelector<HTMLElement>(`#${CSS.escape(item.id)}`);
                target?.scrollIntoView?.({ block: "start", behavior: "smooth" });
                // 目录点了也带着 PDF 走：标题所在的那一块就是跳转目标。
                const itemId = target?.closest<HTMLElement>("[data-md-block]")?.dataset.mdBlock;
                if (itemId) jumpToBlock?.(itemId);
              }}
            >
              {item.text}
            </button>
          ))}
        </nav>
      ) : null}
      <article
        ref={contentRef as RefObject<HTMLElement>}
        id="reader-markdown-content"
        className="reader-markdown-content reader-float-markdown-content is-blocks"
      />
    </ReaderPanelShell>
  );
}
