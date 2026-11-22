import { copyReaderText } from "../shared/utils/clipboard.js";
export { copyReaderText } from "../shared/utils/clipboard.js";
import { fetchProtected, resolveMarkdownAssetUrl } from "../external.js";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { Check, Copy, PenLine, X } from "lucide-react";
import {
  projectReaderRegion,
  readerRegionCopyText,
  readerRegionKindForRegion,
  type ReaderRegion,
  type ReaderRegionHighlight,
  type ReaderRegionRect,
} from "../shared/data/reader-regions.js";
import { canEditReaderKind } from "../shared/data/block-edit.js";

export type ReaderTextHoverTarget = {
  itemId: string;
  highlight: ReaderRegionHighlight;
  rect: ReaderRegionRect;
};

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
export const READER_TEXT_HOVER_EDIT_CLASS = "reader-text-hover-edit";
export const READER_TEXT_HOVER_ID_CLASS = "reader-text-hover-id";

/**
 * 框上要不要显示翻译编号（和翻译调试、日志里的 item_id 同一个）：读者用不上，默认不显示；排查翻译问题时在阅读页地址后
 * 加 `?debug=1`（或 `&debug=1`）就出来，点一下复制。2026-11-12 以前每个读者都看得到。
 */
export function readerShowsItemIds(search: string = typeof window === "undefined" ? "" : window.location.search): boolean {
  try {
    const value = new URLSearchParams(search).get("debug");
    return value === "1" || value === "true";
  } catch {
    return false;
  }
}
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

async function openFigurePreview(url: string): Promise<void> {
  const objectUrl = URL.createObjectURL(await imageBlob(url));
  const doc = document;
  const overlay = doc.createElement("div");
  overlay.className = "reader-pdf-image-preview";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "图片预览");
  const panel = doc.createElement("div");
  panel.className = "reader-pdf-image-preview-panel";
  const close = doc.createElement("button");
  close.type = "button";
  close.className = "reader-pdf-image-preview-close";
  close.textContent = "关闭";
  close.setAttribute("aria-label", "关闭图片预览");
  const image = doc.createElement("img");
  image.src = objectUrl;
  image.alt = "PDF 图片预览";
  const dismiss = () => {
    doc.removeEventListener("keydown", onKeyDown, true);
    URL.revokeObjectURL(objectUrl);
    overlay.remove();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dismiss();
    }
  };
  close.onclick = dismiss;
  overlay.onclick = (event) => {
    if (event.target === overlay) dismiss();
  };
  panel.append(close, image);
  overlay.append(panel);
  doc.body.append(overlay);
  doc.addEventListener("keydown", onKeyDown, true);
  close.focus();
}

async function downloadFigure(url: string): Promise<void> {
  const objectUrl = URL.createObjectURL(await imageBlob(url));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = "paperloom-image";
  link.click();
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
  const raw = box.text.trim() || region.markdown.trim();
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

/**
 * 工具条放哪（hover-presentation 的 placeHoverTools 选）：框外右边 / 左边的页边（竖排）、框外上方（outside）、
 * 框外下方（below）、框里最后一行的右边（tail，段尾空着的地方）；inside（框里右上角）只在没量位置时用。
 */
export type HoverToolsPlacement = "side-right" | "side-left" | "inside" | "outside" | "below" | "tail";

/** 工具条（编号 + 复制）大约占的尺寸：放进框内放不下时才挪到框外上方。 */
export const HOVER_TOOLS_HEIGHT = 26;
export const HOVER_TOOLS_WIDTH = 220;

/**
 * 工具条放哪：一般的块放在框内右上角 —— 它就在块的命中范围里，鼠标走过去不会换块，
 * 也不盖住上一块。框太矮或太窄（行间公式常常只有一行高）放不下时才挪到框外上方。
 */
export function hoverToolsOutside(rect: ReaderRegionRect, toolsWidth = HOVER_TOOLS_WIDTH): boolean {
  return rect.height < HOVER_TOOLS_HEIGHT * 2 || rect.width < toolsWidth;
}

/** 「复制」的图标：复制好了变勾、失败变叉。 */
function CopyStateIcon({ state }: { state: CopyState }) {
  const Icon = state === "copied" ? Check : state === "failed" ? X : Copy;
  return <Icon size={13} strokeWidth={2.2} aria-hidden />;
}

/**
 * 悬停内容块：淡色的框 + 「改」「复制」两个图标按钮（2026-11-20 起只画图标，名字在悬停提示和读屏里；
 * 行间公式的复制是「复制 LaTeX」；表格和图片保留格式复制与放大/下载操作）。地址带 ?debug=1 时前面多一个翻译编号。
 * 框和工具条位置由页面量好传进来（frameRect 贴着字、placement 放页边，见 hover-presentation）；不传就照原块、按旧规则放。
 */
export function ReaderTextHoverLayer({
  target,
  pane = "source",
  revisedCount = 0,
  onEdit,
  frameRect,
  placement,
  tailTop = 0,
}: {
  target: ReaderTextHoverTarget | null;
  /** 框画多大：贴着字的范围（不给就是原块）。 */
  frameRect?: ReaderRegionRect | null;
  /** 工具条放哪（不给按框的大小选框里 / 框外上方）。 */
  placement?: HoverToolsPlacement;
  /** placement 是 tail 时，工具条离框顶多高（对齐最后一行）。 */
  tailTop?: number;
  pane?: "source" | "translated";
  /** 这一块改过几次（精修、手改、助手改）；写在译文栏「改」的提示里。 */
  revisedCount?: number;
  /** 译文栏的「改」：打开侧栏「改译文」改这一块。不给就不画。 */
  onEdit?: (itemId: string) => void;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const [idState, setIdState] = useState<CopyState>("idle");
  // 地址不会在阅读页里变，算一次。
  const [showItemId] = useState(() => readerShowsItemIds());
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
  if (!target) return null;
  const text = readerRegionCopyText(target.highlight.region, pane);
  const kind = readerRegionKindForRegion(target.highlight.region);
  const figureUrl = kind === "figure" ? figureAssetUrl(target.highlight.region) : "";
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
  const rect = frameRect || target.rect;
  const where: HoverToolsPlacement = placement || (hoverToolsOutside(rect) ? "outside" : "inside");
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
        await openFigurePreview(figureUrl);
      } else {
        await downloadFigure(figureUrl);
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
        style={rect}
      >
        {/* 复制；地址带 ?debug=1 时前面多一个编号（和翻译调试、日志里的 item_id 同一个，点一下复制）。 */}
        <div
          className={READER_TEXT_HOVER_TOOLS_CLASS}
          data-placement={where}
          style={where === "tail" ? { top: tailTop } : undefined}
        >
          {showItemId ? (
            <HoverToolButton
              className={READER_TEXT_HOVER_ID_CLASS}
              state={idState}
              label={`复制翻译编号 ${target.itemId}`}
              title="翻译编号，点击复制"
              onClick={copyWith(target.itemId, setIdState)}
            >
              {idState === "copied" ? "已复制编号" : target.itemId}
            </HoverToolButton>
          ) : null}
          {pane === "translated" && onEdit && canEditReaderKind(kind) ? (
            <HoverToolButton
              className={READER_TEXT_HOVER_EDIT_CLASS}
              state="idle"
              label="改这段译文"
              title={revisedCount > 0 ? `改这段译文（E；改过 ${revisedCount} 次）` : "改这段译文（E）"}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onEdit(target.itemId);
              }}
            >
              <PenLine size={13} strokeWidth={2.2} aria-hidden />
            </HoverToolButton>
          ) : null}
          {kind === "table" ? (
            <>
              <HoverToolButton
                className={`${READER_TEXT_HOVER_COPY_CLASS} is-labeled`}
                state={state}
                label="复制表格"
                title="复制表格"
                onClick={copyWith(serializeTableForCopy(target.highlight.region, pane === "translated" ? "translated" : "source", "text"), setState)}
              >
                {state === "copied" ? "已复制" : state === "failed" ? "复制失败" : "复制表格"}
              </HoverToolButton>
              <HoverToolButton
                className={`${READER_TEXT_HOVER_COPY_CLASS} is-labeled`}
                state={state}
                label="复制表格为 Markdown"
                title="复制表格为 Markdown"
                onClick={copyWith(serializeTableForCopy(target.highlight.region, pane === "translated" ? "translated" : "source", "markdown"), setState)}
              >
                Markdown
              </HoverToolButton>
              <HoverToolButton
                className={`${READER_TEXT_HOVER_COPY_CLASS} is-labeled`}
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
                className={`${READER_TEXT_HOVER_COPY_CLASS} is-labeled`}
                state={state}
                label="复制图片"
                title="复制图片"
                onClick={(event) => void figureAction("copy", event)}
              >
                {state === "copied" ? "已复制" : state === "failed" ? "复制失败" : "复制图片"}
              </HoverToolButton>
              <HoverToolButton
                className={`${READER_TEXT_HOVER_COPY_CLASS} is-labeled`}
                state={state}
                label="放大图片"
                title="放大图片"
                onClick={(event) => void figureAction("open", event)}
              >
                放大
              </HoverToolButton>
              <HoverToolButton
                className={`${READER_TEXT_HOVER_COPY_CLASS} is-labeled`}
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
              title={state === "copied" ? "已复制" : state === "failed" ? "复制失败" : idleLabel}
              onClick={copyWith(text, setState)}
            >
              <CopyStateIcon state={state} />
            </HoverToolButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
