// BookDetailDialog —— 容器：组合 hooks + shell/tabs。
// 业务状态见 use-book-detail-*.js；UI 见 shell / tabs / panels。

import {
  useHomeBookDetail,
  useHomeCollections,
  useHomeJobRuntime,
  useHomeLibrary,
  useHomeStatusCard,
} from "@/ui/context/home-services-context.js";
import { useDialogState } from "@/ui/hooks/use-dialog-state.js";
import { useDialogReturnFocus } from "@/ui/hooks/use-dialog-return-focus.js";
import { useRecentJobCover } from "@/features/library/index.js";
import { BookDetailShell } from "./shell/BookDetailShell.jsx";
import { CoverActionsPanel } from "./panels/CoverActionsPanel.jsx";
import { ArtifactQuickDownloads } from "./panels/ArtifactQuickDownloads.js";
import { ProcessingResultActions } from "./panels/processing/ProcessingResultActions.jsx";
import {
  BookDetailRightTabs,
  BookDetailOverviewTab,
  BookDetailProcessingTab,
  BookDetailArtifactsTab,
  BookDetailManageTab,
} from "./tabs/index.js";
import { useBookDetailLiveItem } from "./use-book-detail-live-item.js";
import { useBookDetailDocument } from "./use-book-detail-document.js";
import { useBookDetailTranslate } from "./use-book-detail-translate.js";
import { useBookDetailOcr } from "./use-book-detail-ocr.js";
import { useBookDetailStageActions } from "./use-book-detail-stage-actions.js";
import {
  documentJobPresentation,
  isDocumentJobActive,
  useDocumentJobs,
} from "./use-document-jobs.js";
import { canStartTranslation, useBookDetailCover } from "./use-book-detail-cover.js";
import { useBookDetailTab } from "./use-book-detail-tab.js";
import { useBookDetailArtifactCenter } from "./use-book-detail-artifact-center.js";
import { useStoreSnapshot } from "@/ui/hooks/use-store.js";

export function BookDetailDialog() {
  const { dialogStore } = useHomeBookDetail();
  const library = useHomeLibrary();
  const actions = library.actions;
  const collections = useHomeCollections();
  const collectionsCtl = collections?.controller;
  const collectionsReload = collections?.reloadSignal;
  const { store: statusCardStore } = useHomeStatusCard();
  const { store: jobRuntimeStore } = useHomeJobRuntime();
  const dialogState: any = useDialogState(dialogStore);
  const open = Boolean(dialogState.open);
  const payloadItem: any = dialogState.payload || {};
  const { onCloseAutoFocus } = useDialogReturnFocus(open);

  const item = useBookDetailLiveItem(payloadItem);
  const statusCardState = useStoreSnapshot(statusCardStore);
  const documentId = `${item.document_id || ""}`.trim();
  const {
    coverProcessing,
    readPresentation,
    readerAvailable,
    canTranslate,
    isActive,
    cardJobId,
  } =
    useBookDetailCover({ item, statusCardState });
  const jobId = `${item.job_id || item.active_job_id || cardJobId || ""}`.trim();
  const coverUrl = useRecentJobCover(item);

  // 点「翻译整本」/ 网格选中活跃任务：强制处理 Tab，进度在 bd-job-status-inner
  const { preferTranslateTab, defaultTab, setPreferTranslateTab } = useBookDetailTab({
    open,
    payloadItem,
    item,
    readerAvailable,
    isActive,
  });

  const close = () => dialogStore.close();

  const docState = useBookDetailDocument({
    open,
    documentId,
    item,
    actions,
    collectionsCtl,
    collectionsReload,
    onClose: close,
  });

  const documentJobs = useDocumentJobs({
    open,
    documentId,
    actions,
    initialJob: item,
    runtimeStore: jobRuntimeStore,
    onJobSucceeded: () => {
      void docState.refreshDocument?.();
    },
  });
  const translateState = useBookDetailTranslate({
    open,
    documentId,
    pageCount: docState.pageCount,
    actions,
    withBusy: docState.withBusy,
    setError: docState.setError,
    onTranslateStarted: () => setPreferTranslateTab(true),
    onJobSubmitted: documentJobs.upsert,
    reusableOcrJob: documentJobs.reusableOcr,
  });

  const ocrState = useBookDetailOcr({
    open,
    documentId,
    pageCount: docState.pageCount,
    actions,
    onStarted: documentJobs.upsert,
    onCancelled: () => documentJobs.refresh(),
  });
  const latestTranslation: any = documentJobs.latestTranslation;
  const overviewOcrStatus = documentJobPresentation(documentJobs.ocrStatusJob, "尚未执行");
  const translationActive = isDocumentJobActive(latestTranslation);
  const translationStatus = documentJobPresentation(latestTranslation, "尚未翻译");
  const translationSucceeded = `${latestTranslation?.status || ""}`.toLowerCase() === "succeeded";
  const translationItem = latestTranslation
    ? { ...item, ...latestTranslation, library_only: false }
    : {
        ...item,
        job_id: "",
        active_job_id: "",
        workflow: "",
        job_type: "",
        status: "",
        library_only: true,
      };
  const stageActionState = useBookDetailStageActions({
    open,
    job: latestTranslation,
    actions,
    onJobSubmitted: documentJobs.upsert,
    // OCR 完成可能发生在失败翻译任务之后；此时 translation job_id 不变，
    // 但可重试能力已经变化，必须清除旧 409 并重新读取 stage-actions。
    refreshKey: [
      documentJobs.reusableOcr?.job_id || documentJobs.reusableOcr?.id || "",
      documentJobs.reusableOcr?.status || "",
      documentJobs.reusableOcr?.updated_at || "",
    ].join(":"),
  });
  const artifactCenter = useBookDetailArtifactCenter({
    active: open,
    documentId,
    refreshRevision: documentJobs.succeededRevision,
    source: {
      filename: docState.doc?.source_filename || item.source_filename || item.title,
      url: docState.doc?.source_pdf_url || item.source_pdf_url,
      sizeBytes: docState.doc?.bytes ?? item.bytes,
      generatedAt: docState.doc?.added_at || item.added_at || item.created_at,
    },
    jobs: documentJobs.jobs,
  });

  const handleOpenChange = (next) => {
    if (!next) close();
  };

  const openSource = () => {
    actions.openSourceReader(documentId);
    close();
  };

  return (
    <BookDetailShell
      open={open}
      onOpenChange={handleOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
      title={`${docState.doc?.title || item.title || "文档"}`}
      left={(
        <CoverActionsPanel
          coverUrl={coverUrl}
          title={docState.doc?.title || docState.titleText || item.title}
          authors={docState.authors}
          year={docState.doc?.year || item.year}
          pageCount={docState.pageCount}
          readingStatus={docState.readingStatus}
          readerAvailable={readerAvailable}
          readerActionLabel={readPresentation.label}
          documentId={documentId}
          jobId={jobId}
          busy={docState.busy}
          processing={coverProcessing}
          onCompare={() => {
            actions.openJobReader(readPresentation.jobId || jobId, documentId);
            close();
          }}
          onReadSource={openSource}
          quickDownloadsSlot={(
            <ArtifactQuickDownloads
              sections={artifactCenter.sections}
              loading={artifactCenter.loading}
              downloadingId={artifactCenter.downloadingId}
              onDownload={(artifact) => void artifactCenter.download(artifact)}
            />
          )}
        />
      )}
      right={(
        <BookDetailRightTabs
          open={open}
          resetKey={documentId}
          defaultTab={defaultTab}
          overviewTab={({ selectTab }) => (
            <BookDetailOverviewTab
              pageCount={docState.pageCount}
              bytes={docState.doc?.bytes}
              addedAt={docState.doc?.added_at}
              memberCollections={docState.memberCollections}
              editing={docState.editing}
              titleText={docState.titleText}
              tagsText={docState.tagsText}
              tags={docState.tags}
              authors={docState.authors}
              year={docState.doc?.year}
              displayTitle={docState.doc?.title || docState.titleText}
              busy={docState.busy}
              ocrStatus={overviewOcrStatus}
              translationStatus={translationStatus}
              jobs={documentJobs.jobs}
              onOpenProcessing={() => selectTab("processing")}
              onOpenArtifacts={() => selectTab("artifacts")}
              onStartEdit={docState.startEdit}
              onCancelEdit={() => docState.setEditing(false)}
              onSave={docState.handleSaveEdit}
              onTitleChange={docState.setTitleText}
              onTagsTextChange={docState.setTagsText}
              management={(
                <BookDetailManageTab
                  readingStatus={docState.readingStatus}
                  busy={docState.busy}
                  onReadingStatusChange={docState.handleReadingStatus}
                  collections={docState.collections}
                  collectionsBusy={docState.collectionsBusy}
                  onToggleCollection={docState.toggleCollection}
                  error={docState.error}
                  onDelete={docState.handleDelete}
                  deleteTitle={docState.doc?.title || docState.titleText || item.title}
                  deleteBlockedFavoriteCount={docState.deleteBlocked?.favoriteCount || 0}
                  onClearFavoritesAndDelete={docState.clearFavoritesAndDelete}
                  onDismissDeleteBlocked={docState.dismissDeleteBlocked}
                />
              )}
            />
          )}
          processingTab={({ activeTab }) => (
            <BookDetailProcessingTab
              loading={documentJobs.loading}
              error={documentJobs.error}
              // 结果操作行读全局 statusCard store，注入点放在这里（对话框本身
              // 长在 HomeShellProviders 内），让「进度」Tab 组件保持纯展示。
              resultActionsSlot={<ProcessingResultActions />}
              ocr={{
                job: documentJobs.ocrStatusJob,
                rangeOn: ocrState.rangeOn,
                startPage: ocrState.startPage,
                endPage: ocrState.endPage,
                pageCount: docState.pageCount,
                pending: ocrState.pending,
                cancelling: ocrState.cancelling,
                error: ocrState.error,
                onRangeOnChange: ocrState.setRangeOn,
                onStartPageChange: ocrState.setStartPage,
                onEndPageChange: ocrState.setEndPage,
                onOcr: ocrState.handleOcr,
                onCancel: ocrState.handleCancel,
              }}
              translation={{
                item: translationItem,
                status: translationStatus,
                isActive: translationActive,
                // OCR 提交待定期间不能同时发起翻译，避免两份任务并发。
                canTranslate: canStartTranslation({
                  latestTranslation,
                  translationActive,
                  baseCanTranslate: canTranslate,
                }) && !ocrState.pending,
                readerAvailable: translationSucceeded || readerAvailable,
                dialogOpen: open,
                tabActive: activeTab === "processing",
                rangeOn: translateState.rangeOn,
                startPage: translateState.startPage,
                endPage: translateState.endPage,
                pageCount: docState.pageCount,
                busy: docState.busy,
                error: docState.error,
                stageActions: stageActionState.stageActions,
                stageActionsLoading: stageActionState.loading,
                stageActionPending: stageActionState.pendingStage,
                stageActionError: stageActionState.error,
                ocrReuse: documentJobs.reusableOcr
                  ? { jobId: `${documentJobs.reusableOcr.job_id || documentJobs.reusableOcr.id || ""}` }
                  : null,
                onRangeOnChange: translateState.setRangeOn,
                onStartPageChange: translateState.setStartPage,
                onEndPageChange: translateState.setEndPage,
                onTranslate: async () => {
                  await translateState.handleTranslate();
                },
                onOpenLiveReader: (activeJobId) => {
                  actions.openJobReader(activeJobId, documentId);
                  close();
                },
                onRetryStage: stageActionState.retry,
              }}
            />
          )}
          artifactsTab={() => (
            <BookDetailArtifactsTab
              onOpenSource={openSource}
              artifactCenter={artifactCenter}
              onOpenJob={(artifactJobId) => {
                actions.openJobReader(artifactJobId, documentId);
                close();
              }}
            />
          )}
        />
      )}
    />
  );
}
