import { copyReaderText } from "../shared/utils/clipboard.js";
export { copyReaderText } from "../shared/utils/clipboard.js";
import { fetchProtected, resolveMarkdownAssetUrl } from "../external.js";
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import {
  projectReaderRegion,
  readerRegionCopyText,
  readerRegionKindForRegion,
  type ReaderRegion,
  type ReaderRegionHighlight,
  type ReaderRegionRect,
} from "../shared/data/reader-regions.js";

export type ReaderTextHoverTarget = {
  itemId: string;
  highlight: ReaderRegionHighlight;
  rect: ReaderRegionRect;
};

export type ReaderReferencePreview = {
  itemId: string;
  label: string;
  text: string;
  page: number;
};

export type ReaderReferenceIndex = ReadonlyMap<string, readonly ReaderRegion[]>;

const HOVER_KINDS = new Set(["text", "formula", "table", "figure"]);

export function projectReaderTextHoverTargets(
  regions: readonly ReaderRegionHighlight[],
  width: number,
  height: number,
): ReaderTextHoverTarget[] {
  return regions.flatMap((highlight) => {
    // 正文、行间公式、表格和图片都能悬停操作。
    if (!HOVER_KINDS.has(readerRegionKindForRegion(highlight.region))) return [];
    const rect = projectReaderRegion(highlight, width, height);
    return rect ? [{ itemId: highlight.itemId, highlight, rect }] : [];
  });
}

export function hitTestReaderTextHoverTarget(
  targets: readonly ReaderTextHoverTarget[],
  x: number,
  y: number,
): ReaderTextHoverTarget | null {
  let best: ReaderTextHoverTarget | null = null;
  let bestArea = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    const { rect } = target;
    if (x < rect.left || x > rect.left + rect.width || y < rect.top || y > rect.top + rect.height) {
      continue;
    }
    const area = rect.width * rect.height;
    if (area < bestArea) {
      best = target;
      bestArea = area;
    }
  }
  return best;
}

export const READER_TEXT_HOVER_COPY_CLASS = "reader-text-hover-copy";
export const READER_TEXT_HOVER_ID_CLASS = "reader-text-hover-id";
export const READER_TEXT_HOVER_TOOLS_CLASS = "reader-text-hover-tools";

type CopyState = "idle" | "copied" | "failed";

/** 工具条上的小按钮（编号、复制）：按下不冒到页面上（触屏下会被当成「点了另一块」）。 */
function HoverToolButton({
  className,
  state,
  label,
  title,
  onClick,
  children,
}: {
  className: string;
  state: CopyState;
  label: string;
  title?: string;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      data-copy-state={state}
      aria-label={label}
      title={title}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function figureAssetUrl(region: ReaderTextHoverTarget["highlight"]["region"]): string {
  const raw = region.assetUrls[0] || region.assetIds[0] || "";
  if (!raw) return "";
  try {
    return resolveMarkdownAssetUrl("", raw);
  } catch {
    return raw;
  }
}

async function imageBlob(url: string): Promise<Blob> {
  const response = await fetchProtected(url);
  if (!response.ok) throw new Error(`图片加载失败（${response.status}）`);
  return response.blob();
}

async function pngBlob(blob: Blob): Promise<Blob> {
  if (blob.type === "image/png") return blob;
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d")?.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error("图片转换失败")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function copyFigureImage(url: string): Promise<boolean> {
  if (!url || !navigator.clipboard?.write || typeof ClipboardItem === "undefined") return false;
  const blob = await pngBlob(await imageBlob(url));
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  return true;
}

async function openOrDownloadFigure(url: string, download: boolean): Promise<void> {
  const objectUrl = URL.createObjectURL(await imageBlob(url));
  if (download) {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "paperloom-image";
    link.click();
  } else {
    window.open(objectUrl, "_blank", "noopener,noreferrer");
  }
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

type TableCopyFormat = "text" | "markdown" | "latex";

function tableRowsFromHtml(value: string): string[][] {
  if (typeof DOMParser === "undefined" || !/<table(?:\s|>)/i.test(value)) return [];
  const table = new DOMParser().parseFromString(value, "text/html").querySelector("table");
  if (!table) return [];
  return [...table.rows].map((row) => [...row.cells].map((cell) => cell.textContent?.replace(/\s+/g, " ").trim() || ""));
}

function tableRowsFromText(value: string): string[][] {
  const rows = tableRowsFromHtml(value);
  if (rows.length) return rows;
  const lines = value.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  if (lines.some((line) => line.includes("|"))) {
    return lines
      .filter((line) => !/^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/.test(line))
      .map((line) => line.replace(/^\|\s*/, "").replace(/\s*\|$/, "").split("|").map((cell) => cell.trim()));
  }
  if (lines.some((line) => line.includes("\t"))) return lines.map((line) => line.split(/\t+/).map((cell) => cell.trim()));
  return lines.map((line) => [line]);
}

function escapeLatexCell(value: string): string {
  return value.replace(/[\\&%$#_{}~^]/g, (character) => ({
    "\\": "\\textbackslash{}",
    "&": "\\&",
    "%": "\\%",
    "$": "\\$",
    "#": "\\#",
    "_": "\\_",
    "{": "\\{",
    "}": "\\}",
    "~": "\\textasciitilde{}",
    "^": "\\textasciicircum{}",
  }[character] || `\\${character}`));
}

function serializeTableForCopy(region: ReaderRegion, pane: "source" | "translated", format: TableCopyFormat): string {
  const box = pane === "translated" ? region.translated : region.source;
  const raw = region.markdown.trim() || box.text.trim();
  if (format === "text") return readerRegionCopyText(region, pane);
  const rows = tableRowsFromText(raw);
  if (!rows.length) return readerRegionCopyText(region, pane);
  const width = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => Array.from({ length: width }, (_, index) => row[index] || ""));
  if (format === "markdown") {
    const header = `| ${normalized[0].join(" | ")} |`;
    const separator = `| ${normalized[0].map(() => "---").join(" | ")} |`;
    return [header, separator, ...normalized.slice(1).map((row) => `| ${row.join(" | ")} |`)].join("\n");
  }
  return [
    `\\begin{tabular}{${"l".repeat(width)}}`,
    ...normalized.map((row) => `${row.map(escapeLatexCell).join(" & ")} \\\\`),
    "\\end{tabular}",
  ].join("\n");
}

/** 工具条（编号 + 复制）大约占的尺寸：放进框内放不下时才挪到框外上方。 */
export const HOVER_TOOLS_HEIGHT = 26;
export const HOVER_TOOLS_WIDTH = 250;

/**
 * 工具条放哪：一般的块放在框内右上角 —— 它就在块的命中范围里，鼠标走过去不会换块，
 * 也不盖住上一块。框太矮或太窄（行间公式常常只有一行高）放不下时才挪到框外上方。
 */
export function hoverToolsOutside(rect: ReaderRegionRect, toolsWidth = HOVER_TOOLS_WIDTH): boolean {
  return rect.height < HOVER_TOOLS_HEIGHT * 2 || rect.width < toolsWidth;
}

function referenceNumber(text: string): string | null {
  return text.match(/\[(\d+)\]/)?.[1] || null;
}

function expandCitationToken(token: string): string[] {
  const values: string[] = [];
  for (const part of token.split(/[,;，、]/)) {
    const match = part.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (match) {
      const start = Number(match[1]);
      const end = Math.min(start + 31, Number(match[2]));
      for (let value = start; value <= end; value += 1) values.push(`${value}`);
    } else if (/^\d+$/.test(part.trim())) {
      values.push(`${Number(part.trim())}`);
    }
  }
  return values;
}

export function extractReaderCitationLabels(text: string): string[] {
  const labels: string[] = [];
  const add = (token: string) => {
    for (const label of expandCitationToken(token)) {
      if (!labels.includes(label)) labels.push(label);
    }
  };
  for (const match of text.matchAll(/\[((?:\d+\s*[-–]\s*\d+|\d+)(?:\s*[,;，、]\s*(?:\d+\s*[-–]\s*\d+|\d+))*)\]/g)) add(match[1]);
  for (const match of text.matchAll(/<sup[^>]*>\s*(\d+(?:\s*[-–]\s*\d+)?)\s*<\/sup>/gi)) add(match[1]);
  return labels.slice(0, 32);
}

type ReaderAuthorYearCitation = { key: string; label: string };

function normalizeAuthorYearKey(author: string, year: string): string {
  return `${author}`.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, "")
    + `|${year.toLocaleLowerCase()}`;
}

function extractReaderAuthorYearCitations(text: string): ReaderAuthorYearCitation[] {
  const citations: ReaderAuthorYearCitation[] = [];
  const seen = new Set<string>();
  const add = (author: string, year: string) => {
    const cleanAuthor = author.trim().replace(/\s+/g, " ");
    const cleanYear = year.trim().toLocaleLowerCase();
    if (!cleanAuthor || !/^\d{4}[a-z]?$/.test(cleanYear)) return;
    const key = normalizeAuthorYearKey(cleanAuthor, cleanYear);
    if (seen.has(key)) return;
    seen.add(key);
    citations.push({ key, label: `${cleanAuthor}, ${cleanYear}` });
  };
  for (const match of text.matchAll(/([\p{L}][\p{L}'’.-]{1,}(?:\s+et\s+al\.?|\s+(?:and|&)\s+[\p{L}][\p{L}'’.-]{1,})?)\s*[,，]?\s*[（(]?\s*((?:19|20)\d{2}[a-z]?)\s*[)）]?/giu)) {
    add(match[1], match[2]);
  }
  return citations.slice(0, 16);
}

export function buildReaderReferenceIndex(references: readonly ReaderRegion[]): ReaderReferenceIndex {
  const index = new Map<string, ReaderRegion[]>();
  for (const region of references) {
    const text = region.source.text || region.translated.text || "";
    const label = referenceNumber(text);
    const keys = [label, ...extractReaderAuthorYearCitations(text).map((citation) => citation.key)].filter(Boolean) as string[];
    for (const key of keys) {
      const list = index.get(key) || [];
      list.push(region);
      index.set(key, list);
    }
  }
  return index;
}

export function findReaderReferencePreview(
  target: ReaderTextHoverTarget,
  references: readonly ReaderRegion[] = [],
): ReaderReferencePreview | null {
  return findReaderReferencePreviews(target, buildReaderReferenceIndex(references))[0] || null;
}

export function findReaderReferencePreviews(
  target: ReaderTextHoverTarget,
  referenceIndex: ReaderReferenceIndex,
  citationLabel?: string | null,
): ReaderReferencePreview[] {
  if (readerRegionKindForRegion(target.highlight.region) !== "text"
    || target.highlight.region.subType === "reference_entry") return [];
  const source = target.highlight.region.source.text || target.highlight.region.translated.text || "";
  const numericLabels = citationLabel ? [citationLabel] : extractReaderCitationLabels(source);
  const authorYearLabels = citationLabel ? [] : extractReaderAuthorYearCitations(source);
  const matches = [
    ...numericLabels.map((label) => ({ key: label, label })),
    ...authorYearLabels,
  ];
  return matches.flatMap(({ key, label }) => (referenceIndex.get(key) || []).map((entry) => ({
    itemId: entry.itemId,
    label,
    text: (entry.source.text || entry.translated.text || "").trim(),
    page: entry.source.page,
  }))).filter((preview, index, list) => list.findIndex((item) => item.itemId === preview.itemId) === index);
}

/**
 * 悬停内容块：红色虚线框 + 翻译编号 + 「复制」（行间公式是「复制 LaTeX」）。
 *
 * 对照阅读时左右两栏一起画（悬停的 itemId 由 ReaderCompareGrid 共享），左栏复制原文、
 * 右栏复制译文 —— 这是 4.1.x 旧引擎里最常用的那个交互，React 引擎替换时丢了。
 * 只有这一种块级交互：双击 / 三击留给浏览器选词选段（以前双击会整块复制，把选词弄坏了）。
 */
export function ReaderTextHoverLayer({
  target,
  pane = "source",
  revisedCount = 0,
  referenceIndex,
  referenceRegions,
  citationLabel,
  onReferenceClick,
}: {
  target: ReaderTextHoverTarget | null;
  pane?: "source" | "translated";
  /** 这一块改过几次（精修、手改、助手改）；只在译文栏提示。 */
  revisedCount?: number;
  referenceIndex?: ReaderReferenceIndex;
  referenceRegions?: readonly ReaderRegion[];
  citationLabel?: string | null;
  onReferenceClick?: (itemId: string) => void;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const [idState, setIdState] = useState<CopyState>("idle");
  const timersRef = useRef<number[]>([]);
  const itemId = target?.itemId || "";
  // 换了块，「已复制」必须跟着消 —— 否则它在说另一段的话；上一块的定时器也一起清掉，
  // 不然在 A 上复制、1.2 秒内换到 B 再复制，B 的「已复制」会被 A 的旧定时器提前收掉。
  useEffect(() => {
    setState("idle");
    setIdState("idle");
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, [itemId]);
  const fallbackReferenceIndex = useMemo(
    () => (referenceRegions ? buildReaderReferenceIndex(referenceRegions) : undefined),
    [referenceRegions],
  );
  if (!target) return null;
  const text = readerRegionCopyText(target.highlight.region, pane);
  const kind = readerRegionKindForRegion(target.highlight.region);
  const figureUrl = kind === "figure" ? figureAssetUrl(target.highlight.region) : "";
  const resolvedReferenceIndex = referenceIndex || fallbackReferenceIndex;
  const referencePreviews = resolvedReferenceIndex
    ? findReaderReferencePreviews(target, resolvedReferenceIndex, citationLabel)
    : [];
  const copyWith = (value: string, set: (next: CopyState) => void) =>
    async (event: ReactMouseEvent<HTMLButtonElement>) => {
      // 不让这次点击冒到页面上（触屏下会被当成「点了另一块」）。
      event.preventDefault();
      event.stopPropagation();
      const ok = await copyReaderText(value);
      set(ok ? "copied" : "failed");
      timersRef.current.push(window.setTimeout(() => set("idle"), 1200));
    };
  const idleLabel = kind === "formula" ? "复制 LaTeX" : "复制";
  const outside = hoverToolsOutside(target.rect);
  const figureAction = async (
    action: "copy" | "open" | "download",
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!figureUrl) {
      setState("failed");
      return;
    }
    try {
      if (action === "copy") {
        if (!await copyFigureImage(figureUrl)) throw new Error("图片复制不可用");
      } else if (action === "open") {
        await openOrDownloadFigure(figureUrl, false);
      } else {
        await openOrDownloadFigure(figureUrl, true);
      }
      setState("copied");
    } catch {
      setState("failed");
    }
    timersRef.current.push(window.setTimeout(() => setState("idle"), 1200));
  };
  return (
    <div className="reader-text-hover-layer">
      <div
        className="reader-text-hover-frame"
        data-reader-text-hover-id={target.itemId}
        data-reader-text-hover-kind={kind}
        style={target.rect}
      >
        {/* 编号（和翻译调试、日志里的 item_id 同一个，点一下复制）+ 复制。 */}
        <div
          className={READER_TEXT_HOVER_TOOLS_CLASS}
          data-placement={outside ? "outside" : "inside"}
        >
          <HoverToolButton
            className={READER_TEXT_HOVER_ID_CLASS}
            state={idState}
            label={`复制翻译编号 ${target.itemId}`}
            title="翻译编号，点击复制"
            onClick={copyWith(target.itemId, setIdState)}
          >
            {idState === "copied" ? "已复制编号" : target.itemId}
          </HoverToolButton>
          {pane === "translated" && revisedCount > 0 ? (
            <span className="reader-text-hover-revised" data-reader-revised-count={revisedCount}>
              改过 {revisedCount} 次
            </span>
          ) : null}
          {referencePreviews.map((preview) => (
            <HoverToolButton
              key={preview.itemId}
              className="reader-text-hover-reference"
              title={`跳转到参考文献 ${preview.label}`}
              state="idle"
              label={`跳转到参考文献 ${preview.label}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onReferenceClick?.(preview.itemId);
              }}
            >
              <strong>参考文献 {preview.label}</strong>
              <span>{preview.text}</span>
            </HoverToolButton>
          ))}
          {kind === "table" ? (
            <>
              <HoverToolButton
                className={READER_TEXT_HOVER_COPY_CLASS}
                state={state}
                label="复制表格"
                title="复制表格"
                onClick={copyWith(serializeTableForCopy(target.highlight.region, pane === "translated" ? "translated" : "source", "text"), setState)}
              >
                {state === "copied" ? "已复制" : state === "failed" ? "复制失败" : "复制表格"}
              </HoverToolButton>
              <HoverToolButton
                className={READER_TEXT_HOVER_COPY_CLASS}
                state={state}
                label="复制表格为 Markdown"
                title="复制表格为 Markdown"
                onClick={copyWith(serializeTableForCopy(target.highlight.region, pane === "translated" ? "translated" : "source", "markdown"), setState)}
              >
                Markdown
              </HoverToolButton>
              <HoverToolButton
                className={READER_TEXT_HOVER_COPY_CLASS}
                state={state}
                label="复制表格为 LaTeX"
                title="复制表格为 LaTeX"
                onClick={copyWith(serializeTableForCopy(target.highlight.region, pane === "translated" ? "translated" : "source", "latex"), setState)}
              >
                LaTeX
              </HoverToolButton>
            </>
          ) : kind === "figure" ? (
            <>
              <HoverToolButton
                className={READER_TEXT_HOVER_COPY_CLASS}
                state={state}
                label="复制图片"
                title="复制图片"
                onClick={(event) => void figureAction("copy", event)}
              >
                {state === "copied" ? "已复制" : state === "failed" ? "复制失败" : "复制图片"}
              </HoverToolButton>
              <HoverToolButton
                className={READER_TEXT_HOVER_COPY_CLASS}
                state={state}
                label="放大图片"
                title="放大图片"
                onClick={(event) => void figureAction("open", event)}
              >
                放大
              </HoverToolButton>
              <HoverToolButton
                className={READER_TEXT_HOVER_COPY_CLASS}
                state={state}
                label="下载图片"
                title="下载图片"
                onClick={(event) => void figureAction("download", event)}
              >
                下载
              </HoverToolButton>
            </>
          ) : text ? (
            <HoverToolButton
              className={READER_TEXT_HOVER_COPY_CLASS}
              state={state}
              label={pane === "translated" ? "复制这段译文" : "复制这段原文"}
              onClick={copyWith(text, setState)}
            >
              {state === "copied" ? "已复制" : state === "failed" ? "复制失败" : idleLabel}
            </HoverToolButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
