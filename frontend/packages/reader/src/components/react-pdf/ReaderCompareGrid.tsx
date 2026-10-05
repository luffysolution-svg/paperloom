import type { ReactElement } from "react";
import type { ReactNode } from "react";
import { PdfDocumentPane } from "../../pdf/PdfDocumentPane.js";
import type { ProtectedPdfFile } from "../../pdf/useProtectedPdfFile.js";
import type { PageRowHeights } from "../../pdf/usePageRowSync.js";
import { READER_ZOOM_DEFAULT } from "../../pdf/reader-zoom.js";
import {
  READER_GRID_CLASS,
  READER_SCROLL_SHELL_CLASS,
} from "../../pdf/reader-dom-contract.js";
import {
  isStructuredReaderRegion,
  type ReaderMetadata,
  type ReaderRegion,
  type ReaderRegionSelection,
} from "../../shared/data/reader-regions.js";
import type { LiveTranslationState } from "../../shared/data/live-translation-state.js";
import type { ReaderPaneComposition } from "../../ReaderAppReactPdf.js";
import { useReaderContext } from "./reader-context.js";

export type ReaderCompareGridProps = {
  mode?: string; // ReaderMode
  /** 以下 controller 透传值缺省时从 reader context 取 */
  bindShell?: (node: HTMLDivElement | null) => void;
  shellEl?: HTMLElement | null;
  userZoom?: number;
  compareMode?: boolean;
  /** 阅读区全宽（shell），用于 zoom% 相对整屏计算 */
  shellWidth?: number;
  rowHeights?: PageRowHeights;
  mountSource?: boolean;
  mountTranslated?: boolean;
  showSource?: boolean;
  showTranslated?: boolean;
  /** 「无可并排的最终译文」；仅决定源文件缺失文案，不是 FAB 的 sourceOnly */
  sourceViewOnly?: boolean;
  sourceUrl?: string;
  translatedUrl?: string;
  sourceFile?: ProtectedPdfFile | null;
  translatedFile?: ProtectedPdfFile | null;
  onMetrics?: () => void;
  onNumPagesChange?: (pages: number, pane: "source" | "translated") => void;
  activeRegion?: ReaderRegion | null;
  regions?: ReaderRegion[];
  readerMetadata?: ReaderMetadata | null;
  onSelectRegion?: (selection: ReaderRegionSelection) => void;
  markdownSplit?: boolean;
  assistantSplit?: boolean;
  liveTranslation?: LiveTranslationState;
  /** 源栏右上角动作（如「译文」叠加开关）；挂在 pane="source" 容器内。 */
  sourcePaneAction?: ReactNode;
  /**
   * 单一真值：是否把流式实时译文叠加到原文 PDF 上。
   * 仅当实时译文可用（最终译文 PDF 未就绪）时为 true；就绪后恒为 false。
   */
  overlayOnSource?: boolean;
  /**
   * 可见台面判别联合（单一真源）。提供时覆盖 mode/compareMode/
   * showSource/showTranslated/overlayOnSource 这几个散落输入。
   */
  paneComposition?: ReaderPaneComposition;
};

export function resolveReaderGridPresentation({
  mode,
  compareMode,
  showSource,
  showTranslated,
  markdownSplit,
  overlayOnSource = false,
}: Pick<ReaderCompareGridProps, "mode" | "compareMode" | "showSource" | "showTranslated"> & {
  markdownSplit: boolean;
  overlayOnSource?: boolean;
}) {
  // 对照态叠加不再「消栏」：overlayOnSource 只决定源栏是否挂流式画布，
  // 不再强制单栏。右栏（最终译文 PDF）由 paneComposition.showTranslated
  // 保留，避免右栏消失像对照坏了。overlayOnSource 保留在签名中以兼容
  // 旧调用方（未使用）。
  void overlayOnSource;
  const splitSourceCompare = markdownSplit && mode === "compare";
  return {
    mode: splitSourceCompare ? "source" : mode,
    compareMode: compareMode && !markdownSplit,
    showSource: splitSourceCompare ? true : showSource,
    showTranslated: splitSourceCompare ? false : showTranslated,
  };
}

export function resolveReaderPageWidthBasis(
  shellWidth: number,
  sidePanelSplit: boolean,
  viewportWidth = shellWidth * 2,
): number {
  if (!sidePanelSplit) return shellWidth;
  // 切换到 Markdown / AI 时，ResizeObserver 会晚一帧才把 shellWidth 从整屏
  // 更新成半屏。用 viewport 封顶可保证前后两帧得到同一个页面宽度，避免
  // PDF 先放大再缩回，看起来像重新加载。
  return Math.min(shellWidth * 2, viewportWidth);
}

export function liveTranslationPendingCopy(state: LiveTranslationState | undefined): string {
  if (!state) return "";
  if (state.connection === "terminal" && state.jobStatus === "failed") {
    return state.pagesByPage.size > 0
      ? `翻译已暂停，已保留 ${state.pagesByPage.size} 页译文`
      : "翻译已暂停，原始 PDF 仍可阅读";
  }
  if (state.connection === "terminal" && ["cancelled", "canceled"].includes(state.jobStatus)) {
    return state.pagesByPage.size > 0
      ? `翻译已取消，已保留 ${state.pagesByPage.size} 页译文`
      : "翻译已取消，原始 PDF 仍可阅读";
  }
  if (state.pagesByPage.size > 0) return "";
  if (state.connection === "unavailable") {
    return state.error || "实时译文暂不可用，原始 PDF 仍可阅读";
  }
  if (state.error) return state.error;
  if (state.layoutByPage.size === 0) {
    return "正在完成 OCR，译文将在这里逐页出现";
  }
  return "版面已就绪，正在等待首个译文页面";
}

export function ReaderCompareGrid(props: ReaderCompareGridProps): ReactElement {
  const ctx = useReaderContext();
  const {
    markdownSplit = false,
    assistantSplit = false,
    liveTranslation,
    paneComposition,
  } = props;
  // 可见台面以 paneComposition 为单一真源；缺省时回退到显式 props（直接单测）。
  const mode = paneComposition?.visibleMode ?? props.mode ?? "compare";
  const compareMode = paneComposition?.compareMode ?? props.compareMode ?? mode === "compare";
  const showSource = paneComposition?.showSource ?? props.showSource ?? true;
  const showTranslated = paneComposition?.showTranslated
    ?? props.showTranslated
    ?? (mode === "compare" || mode === "translated");
  const overlayOnSource = paneComposition?.overlayOnSource ?? props.overlayOnSource ?? false;
  const bindShell = props.bindShell ?? ctx?.bindShell;
  const shellEl = props.shellEl ?? ctx?.shellEl ?? null;
  const userZoom = props.userZoom ?? ctx?.userZoom ?? READER_ZOOM_DEFAULT;
  const shellWidth = props.shellWidth ?? ctx?.shellWidth ?? 0;
  const rowHeights = props.rowHeights ?? ctx?.rowHeights;
  const mountSource = props.mountSource ?? ctx?.mountSource ?? false;
  const mountTranslated = props.mountTranslated ?? ctx?.mountTranslated ?? false;
  // 源文件缺失文案要的是「无可并排的最终译文」，显式取 sourceViewOnly。
  const sourceViewOnly = props.sourceViewOnly ?? ctx?.sourceViewOnly ?? false;
  const sourceUrl = props.sourceUrl ?? ctx?.sourceUrl ?? "";
  const translatedUrl = props.translatedUrl ?? ctx?.translatedUrl ?? "";
  const sourceFile = props.sourceFile ?? ctx?.sourceFile ?? null;
  const translatedFile = props.translatedFile ?? ctx?.translatedFile ?? null;
  const onMetrics = props.onMetrics ?? ctx?.onMetrics;
  const onNumPagesChange = props.onNumPagesChange ?? ctx?.onNumPagesChange;
  const activeRegion = props.activeRegion ?? ctx?.activeRegion;
  const regions = props.regions ?? ctx?.regions ?? [];
  const readerMetadata = props.readerMetadata ?? ctx?.readerMetadata;
  const onSelectRegion = props.onSelectRegion ?? ctx?.onSelectRegion;

  const presentation = resolveReaderGridPresentation({
    mode,
    compareMode,
    showSource,
    showTranslated,
    markdownSplit,
    overlayOnSource,
  });
  // zoom 的产品语义一直相对完整阅读器宽度：Markdown / AI 分栏后 shell
  // 只有半屏，因此用双倍基准保持 50% 恰好铺满左栏。
  const pageWidthBasis = resolveReaderPageWidthBasis(
    shellWidth,
    markdownSplit || assistantSplit,
    typeof document === "undefined" ? shellWidth * 2 : document.documentElement.clientWidth,
  );

  return (
    <div
      ref={bindShell}
      className={READER_SCROLL_SHELL_CLASS}
      data-reader-region-count={regions.length}
      data-reader-structured-region-count={regions.filter(isStructuredReaderRegion).length}
      data-reader-metadata-ready={readerMetadata ? "true" : "false"}
    >
      <main
        className={`${READER_GRID_CLASS} reader-mode-${presentation.mode}`}
        data-reader-mode={markdownSplit ? "markdown-split" : assistantSplit ? "assistant-split" : mode}
      >
        {mountSource ? (
          <PdfDocumentPane
            pane="source"
            url={sourceUrl}
            preloadedFile={sourceFile}
            userZoom={userZoom}
            visible={presentation.showSource}
            scrollRoot={shellEl}
            pageWidthOverride={pageWidthBasis}
            rowHeights={presentation.compareMode ? rowHeights : undefined}
            onMetrics={onMetrics}
            emptyLabel={
              sourceViewOnly
                ? "源文件不可用：该文档没有可读取的源 PDF。"
                : "暂无原文 PDF"
            }
            onNumPagesChange={onNumPagesChange}
            activeRegion={activeRegion}
            regions={regions}
            readerMetadata={readerMetadata}
            onSelectRegion={onSelectRegion}
            // 流式译文直接叠加在源栏原文 PDF 上（overlayOnSource，用户主动触发）。
            // 对照态不再消栏：右栏（最终译文 PDF）照常保留。叠加 badge 由
            // sourcePaneAction 组合透出，避免与「左右都是中文」混淆。
            liveTranslation={overlayOnSource ? liveTranslation : undefined}
            showLiveTranslation={overlayOnSource}
            liveTranslationPendingLabel={overlayOnSource
              ? liveTranslationPendingCopy(liveTranslation)
              : ""}
            paneAction={overlayOnSource ? (
              <>
                {props.sourcePaneAction}
                <span
                  className="reader-source-overlay-badge"
                  data-source-overlay-badge="true"
                  title="源栏正在叠加实时译文，右栏为最终译文 PDF"
                >
                  原文+实时译文叠加
                </span>
              </>
            ) : props.sourcePaneAction}
          />
        ) : null}
        {mountTranslated ? (
          <PdfDocumentPane
            pane="translated"
            url={translatedUrl}
            preloadedFile={translatedFile}
            userZoom={userZoom}
            visible={presentation.showTranslated}
            scrollRoot={shellEl}
            pageWidthOverride={pageWidthBasis}
            rowHeights={presentation.compareMode ? rowHeights : undefined}
            onMetrics={onMetrics}
            emptyLabel="暂无译文 PDF"
            onNumPagesChange={onNumPagesChange}
            activeRegion={activeRegion}
            regions={regions}
            readerMetadata={readerMetadata}
            onSelectRegion={onSelectRegion}
            // 译文 PDF 栏就是最终译文本身，绝不叠加流式画布。
            liveTranslation={undefined}
            showLiveTranslation={false}
          />
        ) : null}
      </main>
    </div>
  );
}
