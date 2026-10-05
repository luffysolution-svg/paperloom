// 从 frontend/web 迁入的 React-pdf 视图真值，现为 @retainpdf/reader 主入口
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReaderReactController } from "./hooks/use-reader-react-controller.js";
import { useReaderKeyboard } from "./hooks/use-reader-keyboard.js";
import {
  ReaderAiSplitResizeHandle,
  ReaderAssistantDock,
  ReaderCloseHome,
  ReaderWorkspaceTabs,
  ReaderReactBoot,
  ReaderCompareGrid,
  ReaderZoomHud,
  ReaderFab,
  ReaderSelectionToolbar,
  ReaderNotesPanel,
} from "./components/react-pdf/index.js";
import type { ReaderAssistantPanel, ReaderWorkspaceMode } from "./components/react-pdf/index.js";
import type { ReaderFabToolId } from "./components/react-pdf/ReaderFab.js";
import { useReaderAnnotations } from "./hooks/use-reader-annotations.js";
import type { ReaderNote } from "./annotations/types.js";
import { DownloadToastHost } from "./shared/react/DownloadToastHost.jsx";
import { READER_ROOT_CLASS } from "./pdf/reader-dom-contract.js";
import {
  loadReaderViewState,
  saveReaderViewState,
} from "./shared/state/reader-view-state.js";
import type { ReaderSelection } from "./shared/data/reader-regions.js";
import type { ReaderSelectionNoteInput } from "./components/react-pdf/ReaderSelectionToolbar.js";
import {
  ReaderProvider,
  type ReaderContextValue,
  type ReaderHudContextValue,
} from "./components/react-pdf/reader-context.js";

const ReaderFavoritesPanel = lazy(() => import("./components/react-pdf/ReaderFavoritesPanel.js").then((m) => ({ default: m.ReaderFavoritesPanel })));
const ReaderMarkdownPanel = lazy(() => import("./components/react-pdf/ReaderMarkdownPanel.js").then((m) => ({ default: m.ReaderMarkdownPanel })));
const ReaderAiPanel = lazy(() => import("./components/react-pdf/ReaderAiPanel.js").then((m) => ({ default: m.ReaderAiPanel })));

/**
 * 「曾经打开过」latch：上面三个面板是 lazy 的，但 lazy() 的动态 import 在组件
 * 挂载时就会触发 —— 无条件渲染(仅用 open 控制显隐)会让分包边界形同虚设，
 * reader 首屏因此白拉整个 AI 面板与 mathjax。
 *
 * 不能改成 `open && <Panel/>` 条件渲染：关闭即卸载会丢掉面板内部状态
 * (AI 会话、滚动位置)。故首次打开后就一直挂载，仅把首次加载推迟到真正需要时。
 *
 * 用 ref 而非 state：取值只会 false→true 单调翻转，且发生在 open 变化已经
 * 触发的那次渲染内，不需要额外再渲染一轮。
 */
function useMountedSinceFirstOpen(open: boolean): boolean {
  const everOpened = useRef(false);
  if (open) {
    everOpened.current = true;
  }
  return everOpened.current;
}

export function resolveReaderAiLayout(_mode: string): "workspace" {
  return "workspace";
}

export function resolveVisiblePdfMode(
  mode: "source" | "compare" | "translated",
  assistantPanel: ReaderAssistantPanel | null,
) {
  return assistantPanel !== null && mode === "compare"
    ? "source"
    : mode;
}

/** 阅读视图可见台面的判别联合。 */
export type ReaderPaneComposition = {
  /**
   * 台面形态（单一真源）：
   * - source-only：单栏原文；
   * - translated-only：仅译文（右栏语义）；
   * - final-compare：左源右最终译文的并排；
   * - live-overlay：源栏原文 + 流式实时译文叠加（对照态保留右栏最终译文）。
   */
  kind: "source-only" | "translated-only" | "final-compare" | "live-overlay";
  /** 顶栏页签 / 键盘 / HUD 使用的可见 PDF 模式 */
  visibleMode: "source" | "compare" | "translated";
  compareMode: boolean;
  showSource: boolean;
  showTranslated: boolean;
  /**
   * 单一真值：是否把流式实时译文叠加到原文 PDF 上（Grid 消费）。
   * 仅在实时译文可用（最终译文 PDF 未就绪）时为 true；最终就绪后恒为 false。
   */
  overlayOnSource: boolean;
  /** 无 job：FAB / Markdown / AI 等「需要任务」能力判定 */
  sourceOnly: boolean;
  /** 无可并排的最终译文 (sourceOnly || !translatedUrl)：页签禁用判定 */
  sourceViewOnly: boolean;
};

/**
 * 单一纯函数，从 session.mode、实时译文可用/可见、助手开合与译文产物派生
 * 可见台面。原先散落在 app 的实时对照 / visiblePdfMode /
 * resolveReaderGridPresentation 全部收口到这里，Grid/Tabs/键盘/HUD 只消费结果。
 *
 * liveTranslationVisible 只作为「用户是否想开实时译文」的用户意图（默认关）：
 * 源栏按钮切换后，实时译文直接叠加在原文 PDF 上（overlayOnSource）；
 * overlayContentAvailable 表示「有可叠加的流式译文内容」（进行中或已完成都成立）。
 * 默认不叠加，避免旧「左右都是中文」的自动叠加 bug。
 */
export function resolveReaderPaneComposition(input: {
  mode: "source" | "compare" | "translated";
  sourceOnly: boolean;
  translatedUrl: string;
  overlayContentAvailable: boolean;
  liveTranslationVisible: boolean;
  assistantOpen: boolean;
  assistantPdfPane?: "source" | "translated" | null;
}): ReaderPaneComposition {
  const sourceViewOnly = input.sourceOnly || !input.translatedUrl;
  // 单一真值：仅「有可叠加译文内容且用户主动开启且无助手接管」时，
  // 在当前原文 PDF 上叠加流式译文。
  const overlayOnSource = Boolean(
    input.overlayContentAvailable
    && input.liveTranslationVisible
    && !input.assistantOpen,
  );
  // AI 从某栏选区发起时锁定该栏；否则助手分栏把对照降级为单栏原文。
  const pdfMode = input.assistantPdfPane
    || (input.assistantOpen && input.mode === "compare" ? "source" : input.mode);
  const visibleMode = pdfMode;
  // 对照态叠加不再「消栏」：overlay 只在源栏叠加流式画布，右栏（最终译文）
  // 照常保留。compareMode / showTranslated 不再被 overlay 强制关闭。
  const compareMode = visibleMode === "compare";
  const showSource = overlayOnSource || visibleMode !== "translated";
  const showTranslated = visibleMode === "translated" || visibleMode === "compare";
  const kind: ReaderPaneComposition["kind"] = overlayOnSource
    ? "live-overlay"
    : visibleMode === "compare"
      ? "final-compare"
      : visibleMode === "translated"
        ? "translated-only"
        : "source-only";
  return {
    kind,
    visibleMode,
    compareMode,
    showSource,
    showTranslated,
    overlayOnSource,
    sourceOnly: input.sourceOnly,
    sourceViewOnly,
  };
}

/**
 * 切换工作区页签时，是否自动开关实时译文叠加。
 * - 切到对照：仅在“实时译文真正可用（最终译文 PDF 未就绪）”时自动打开。
 *   任务完成后即使残留已提交的实时页，也不得自动选中「实时译文 · 已完成」。
 * - 离开对照（原文/译文）：关闭，回到页签自身的显示。
 * 返回 null 表示保持用户当前选择不动。
 */
export function resolveLiveTranslationVisibleOnWorkspaceChange(
  next: ReaderWorkspaceMode,
  liveTranslationAvailable: boolean,
): boolean | null {
  if (next === "compare") {
    return liveTranslationAvailable ? true : null;
  }
  return false;
}

export function resolveInitialAssistantPanel(
  mode: "source" | "compare" | "translated",
  saved: ReturnType<typeof loadReaderViewState>,
): ReaderAssistantPanel | null {
  // A newly opened job always starts in its canonical PDF comparison view.
  if (mode === "compare") return null;
  if (saved?.assistantPanel === "markdown" || saved?.assistantPanel === "ai") {
    return saved.assistantPanel;
  }
  // One-time migration from the former arbitrary two-pane layout.
  if (saved?.splitLayout?.left === "ai" || saved?.splitLayout?.right === "ai") return "ai";
  if (saved?.splitLayout?.left === "markdown" || saved?.splitLayout?.right === "markdown") {
    return "markdown";
  }
  return null;
}

export function ReaderAppReactPdf() {
  const c = useReaderReactController();
  const { boot, panes, sessionFiles, tools, session } = c;
  const [assistantPanel, setAssistantPanel] = useState<ReaderAssistantPanel | null>(() => (
    resolveInitialAssistantPanel(c.mode, loadReaderViewState(c.viewStateKey))
  ));
  const [assistantPdfPane, setAssistantPdfPane] = useState<"source" | "translated" | null>(null);
  const [aiSelectionContext, setAiSelectionContext] = useState<ReaderSelection | null>(null);
  const [liveTranslationVisible, setLiveTranslationVisible] = useState(false);
  const layoutScopeRef = useRef(c.viewStateKey);
  const modeScopeRef = useRef<string | null>(null);

  const assistantOpen = assistantPanel !== null;
  // 是否有「可叠加到原文 PDF 上的流式译文内容」：进行中（available）或已完成
  // （实时页仍在 state 里）都成立，供源栏开关显示与叠加判定。
  const hasOverlayContent = c.liveTranslationAvailable
    || c.liveTranslation.pagesByPage.size > 0;
  // 可见台面唯一真源：Grid / Tabs / 键盘 / HUD 都从这里取。
  const paneComposition = resolveReaderPaneComposition({
    mode: c.mode,
    sourceOnly: c.sourceOnly,
    translatedUrl: sessionFiles.translatedUrl,
    overlayContentAvailable: hasOverlayContent,
    liveTranslationVisible,
    assistantOpen,
    assistantPdfPane,
  });
  const sourceViewOnly = paneComposition.sourceViewOnly;
  const visiblePdfMode = paneComposition.visibleMode;
  // 本地批注：选中文字后生成注记，面板内按页分组 / 编辑 / 删除 / 导出。
  const [notesOpen, setNotesOpen] = useState(false);
  const openNotes = useCallback(() => setNotesOpen(true), []);
  const toggleNotes = useCallback(() => setNotesOpen((value) => !value), []);
  const annotations = useReaderAnnotations(
    { jobId: session.jobId, documentId: session.documentId },
    { onAfterAdd: openNotes },
  );
  const addNoteFromSelection = useCallback((input: ReaderSelectionNoteInput) => {
    annotations.addFromQuote(input);
    c.clearSelection();
  }, [annotations.addFromQuote, c.clearSelection]);
  const jumpToNote = useCallback((note: ReaderNote) => {
    c.goToPage(note.page, note.pane === "translated" ? "translated" : "source");
  }, [c.goToPage]);
  const exportNotes = useCallback(
    () => annotations.exportMarkdown(session.title || ""),
    [annotations.exportMarkdown, session.title],
  );

  useEffect(() => {
    setAiSelectionContext(null);
    setLiveTranslationVisible(true);
    setNotesOpen(false);
  }, [c.viewStateKey]);

  // 任务到终态后自动取消「实时译文」选中：终态应回到最终译文 PDF / 对照，
  // 不应默认停留在实时叠加态（用户仍可手动再点开）。
  useEffect(() => {
    if (c.session.jobTerminal) setLiveTranslationVisible(false);
  }, [c.session.jobTerminal]);

  useEffect(() => {
    if (boot.loading) return;
    if (layoutScopeRef.current !== c.viewStateKey) {
      layoutScopeRef.current = c.viewStateKey;
      const saved = loadReaderViewState(c.viewStateKey);
      setAssistantPanel(resolveInitialAssistantPanel(c.mode, saved));
      setAssistantPdfPane(null);
      return;
    }
    saveReaderViewState(c.viewStateKey, { assistantPanel, splitLayout: null });
  }, [assistantPanel, boot.loading, c.mode, c.viewStateKey]);

  // 阅读模式恢复/持久化：与 anchor/zoom 对齐。sourceViewOnly 时只允许 source。
  useEffect(() => {
    if (boot.loading || boot.failed) return;
    if (modeScopeRef.current !== c.viewStateKey) {
      modeScopeRef.current = c.viewStateKey;
      const saved = loadReaderViewState(c.viewStateKey);
      const target = sourceViewOnly ? "source" : saved?.mode;
      if (target && target !== c.mode) {
        c.setModeKeepingPage(target);
      }
      return;
    }
    saveReaderViewState(c.viewStateKey, { mode: c.mode });
  }, [boot.failed, boot.loading, c.mode, c.setModeKeepingPage, c.viewStateKey, sourceViewOnly]);
  const workspaceView = assistantPanel || (c.mode === "compare" ? "compare" : "reading");
  // 三个 lazy 面板各自的挂载 latch，见 useMountedSinceFirstOpen。
  const favoritesMounted = useMountedSinceFirstOpen(tools.isOpen("favorites"));
  const markdownMounted = useMountedSinceFirstOpen(assistantPanel === "markdown");
  const aiMounted = useMountedSinceFirstOpen(assistantPanel === "ai");
  // 键盘与 UI 共用同一「可见模式」真源：paneComposition.visibleMode。
  // 「0」重置缩放据此取模式默认，避免与 HUD/网格显示的模式脱节。
  useReaderKeyboard({
    mode: visiblePdfMode,
    sourceOnly: c.sourceOnly,
    setMode: c.setModeKeepingPage,
    userZoom: c.userZoom,
    onZoomChange: c.onZoomChange,
    currentPage: c.currentPage,
    numPages: panes.hudNumPages,
    goToPage: c.goToPage,
    enabled: c.showHud,
  });
  const closeTool = useCallback(() => { tools.close(); }, [tools]);
  const closeAssistant = useCallback(() => {
    setAssistantPanel(null);
    setAssistantPdfPane(null);
    setAiSelectionContext(null);
  }, []);
  const jumpCitation = useCallback((citation: { page_idx?: number; page?: number; block_id?: string; image_url?: string; snippet?: string; } | number) => {
    const visiblePane = visiblePdfMode === "translated" ? "translated" : "source";
    c.jumpToAnchor(citation, visiblePane);
  }, [c.jumpToAnchor, visiblePdfMode]);
  const refreshCommittedDocument = useCallback((input: { documentId: string; revision: string }) => {
    session.refreshCommittedDocument(input);
  }, [session.refreshCommittedDocument]);
  const changeWorkspace = useCallback((next: ReaderWorkspaceMode) => {
    tools.close();
    setAssistantPdfPane(null);
    // A running translation can provide the compare workspace before the
    // immutable translated PDF exists. Keep the visible workspace and the
    // top-bar selection in sync instead of asking the session mode (which is
    // correctly source-only until the final artifact arrives) to represent
    // this temporary live pair.
    const autoEnable = resolveLiveTranslationVisibleOnWorkspaceChange(next, c.liveTranslationAvailable);
    if (autoEnable !== null) setLiveTranslationVisible(autoEnable);
    c.setModeKeepingPage(next);
  }, [c.liveTranslationAvailable, c.setModeKeepingPage, tools]);

  // 源栏「译文」开关：把流式译文直接叠在原文 PDF 上 / 收起。进行中与完成后
  // 都可用（只要有可叠加内容）。默认关，避免自动叠加造成「左右都中文」。
  const sourcePaneAction = useMemo(() => {
    if (!hasOverlayContent || !paneComposition.showSource) return null;
    return (
      <button
        type="button"
        className={`reader-live-translation-toggle${liveTranslationVisible ? " is-active" : ""}`}
        onClick={() => setLiveTranslationVisible((visible) => !visible)}
        aria-pressed={liveTranslationVisible}
        title={liveTranslationVisible ? "隐藏实时译文" : "在原文 PDF 上叠加实时译文"}
      >
        译文
      </button>
    );
  }, [hasOverlayContent, paneComposition.showSource, liveTranslationVisible]);

  const selectAssistant = useCallback((next: ReaderAssistantPanel) => {
    setAssistantPanel(next);
    if (next !== "ai") setAiSelectionContext(null);
  }, []);

  // FAB 与 Dock 行为一致：favorites 走 tools，markdown/ai 走辅助面板
  // （workspace），notes 走本地批注。markdown/ai 点击为 toggle（再点关闭）。
  const handleFabTool = useCallback((id: ReaderFabToolId) => {
    if (id === "notes") {
      toggleNotes();
      return;
    }
    if (id === "markdown" || id === "ai") {
      if (assistantPanel === id) {
        setAssistantPanel(null);
        setAssistantPdfPane(null);
        setAiSelectionContext(null);
      } else {
        setAssistantPanel(id);
        setAssistantPdfPane(null);
        if (id !== "ai") setAiSelectionContext(null);
      }
      return;
    }
    tools.toggle(id);
  }, [assistantPanel, toggleNotes, tools]);
  // FAB 高亮：批注 > 辅助面板（与 Dock 同真源）> tools（摘录）。
  const fabActiveTool: ReaderFabToolId | null = notesOpen
    ? "notes"
    : (assistantPanel ?? tools.active);

  const askSelectedRegion = useCallback((selection: ReaderSelection) => {
    const pdf = selection.pane === "translated" && !sourceViewOnly
      ? "translated"
      : "source";
    setAiSelectionContext(selection);
    setAssistantPanel("ai");
    setAssistantPdfPane(pdf);
    c.clearSelection();
  }, [c.clearSelection, sourceViewOnly]);

  // 外壳 Context：只装频繁下钻、且此前纯透传的值；currentPage/numPages 走 HUD
  // context，避免滚动带动整棵外壳重渲染。
  const readerContext = useMemo<ReaderContextValue>(() => ({
    bindShell: c.shell.bindShell,
    shellEl: c.shell.shellEl,
    shellWidth: c.shell.shellWidth,
    userZoom: c.userZoom,
    onZoomChange: c.onZoomChange,
    rowHeights: c.rowHeights,
    mountSource: c.panes.mountSource,
    mountTranslated: c.panes.mountTranslated,
    onMetrics: c.panes.onMetrics,
    onNumPagesChange: c.panes.onNumPages,
    sourceUrl: c.sessionFiles.sourceUrl,
    translatedUrl: c.sessionFiles.translatedUrl,
    sourceFile: c.sessionFiles.sourceFile,
    translatedFile: c.sessionFiles.translatedFile,
    regions: session.regions,
    readerMetadata: session.readerMetadata,
    activeRegion: c.activeRegion,
    onSelectRegion: c.selectRegion,
    sourceOnly: c.sourceOnly,
    sourceViewOnly,
    download: c.download,
    goToPage: c.goToPage,
    assistant: { select: selectAssistant, close: closeAssistant },
  }), [
    c.shell,
    c.userZoom,
    c.onZoomChange,
    c.rowHeights,
    c.panes,
    c.sessionFiles,
    session.regions,
    session.readerMetadata,
    c.activeRegion,
    c.selectRegion,
    c.sourceOnly,
    sourceViewOnly,
    c.download,
    c.goToPage,
    selectAssistant,
    closeAssistant,
  ]);

  const readerHud = useMemo<ReaderHudContextValue>(() => ({
    currentPage: c.currentPage,
    numPages: panes.hudNumPages,
  }), [c.currentPage, panes.hudNumPages]);

  const rootClasses = [
    READER_ROOT_CLASS,
    `is-workspace-${workspaceView}`,
    assistantOpen ? "is-assistant-open" : "",
    paneComposition.overlayOnSource ? "is-live-translation-overlay" : "",
  ].filter(Boolean).join(" ");

  return (
    <ReaderProvider value={readerContext} hud={readerHud}>
      <div className={rootClasses} data-reader-engine="react-pdf" data-reader-workspace={workspaceView}>
        <ReaderReactBoot loading={boot.loading} failed={boot.failed} text={boot.text} percent={boot.percent} regionsError={Boolean(session.readerErrors.regions)} metadataError={Boolean(session.readerErrors.metadata)} />
        <ReaderCloseHome onBeforeClose={session.prepareClose} />
        <ReaderWorkspaceTabs
          mode={visiblePdfMode}
          documentReady={Boolean(session.jobId)}
          sourceViewOnly={sourceViewOnly}
          onModeChange={changeWorkspace}
          liveTranslation={hasOverlayContent ? {
            visible: liveTranslationVisible,
            state: c.liveTranslation,
            onToggle: () => setLiveTranslationVisible((visible) => !visible),
          } : null}
        />
        <ReaderAssistantDock active={assistantPanel} />
        {assistantOpen ? <ReaderAiSplitResizeHandle /> : null}
        {c.showHud ? <ReaderFab activeTool={fabActiveTool} noteCount={annotations.count} onToggleTool={handleFabTool} /> : null}
        <ReaderCompareGrid paneComposition={paneComposition} markdownSplit={assistantPanel === "markdown"} assistantSplit={assistantOpen} liveTranslation={c.liveTranslation} sourcePaneAction={sourcePaneAction} />
        {c.showHud ? (
          <ReaderZoomHud
            mode={visiblePdfMode}
            modeControls={null}
          />
        ) : null}
        <Suspense fallback={null}>
          {favoritesMounted ? <ReaderFavoritesPanel open={tools.isOpen("favorites")} jobId={session.jobId} documentId={session.documentId} onClose={closeTool} onJumpPage={c.goToPage} /> : null}
          {markdownMounted ? <ReaderMarkdownPanel open={assistantPanel === "markdown"} jobId={session.jobId} sourceOnly={c.sourceOnly} layout="workspace" side="right" onClose={closeAssistant} /> : null}
          {aiMounted ? <ReaderAiPanel key={session.documentId || session.jobId || "reader-ai-pending"} open={assistantPanel === "ai"} jobId={session.jobId} documentId={session.documentId} sessionIdentity={session.sessionIdentity} layout={resolveReaderAiLayout(c.mode)} side="right" selectionContext={aiSelectionContext} onClearSelectionContext={() => setAiSelectionContext(null)} onClose={closeAssistant} onJumpCitation={jumpCitation} onDocumentCommitted={refreshCommittedDocument} /> : null}
        </Suspense>
        <ReaderNotesPanel
          open={notesOpen}
          groups={annotations.groups}
          count={annotations.count}
          onClose={() => setNotesOpen(false)}
          onJump={jumpToNote}
          onUpdateNote={annotations.updateNote}
          onRemove={annotations.remove}
          onExport={exportNotes}
        />
        <ReaderSelectionToolbar selection={c.selection} onDismiss={c.clearSelection} onAskAi={askSelectedRegion} onAddNote={addNoteFromSelection} />
        <DownloadToastHost />
      </div>
    </ReaderProvider>
  );
}
