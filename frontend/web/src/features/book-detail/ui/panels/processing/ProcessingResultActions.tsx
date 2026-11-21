// 处理卡底部的结果操作行：下载 Markdown / 原始 PDF / 对照阅读 / 下载 PDF。
//
// 这四个按钮原本挂在主页那张页面级状态卡 #job-status-card 上。那张卡随
// 「进度主场收敛到书籍详情」一并下线，于是它们跟着没了宿主——所以搬到这里，
// 和流水线同卡。
//
// 为什么不直接复用左栏已有的「文件下载」(ArtifactQuickDownloads)：那是另一套
// 实现，自带 book-detail-download-*-btn 的 id 和自己的 downloadingId busy 态。
// 而这四个按钮的 id 是一组**契约**——artifacts 域在 document 上挂了委托
// (mountArtifactDownloadsFeature → handleProtectedArtifactClick)，靠 id 命中来
// 把点击接管成带 X-API-Key 的 fetchProtected 下载，而不是裸 <a> 跳转（裸跳转
// 没有鉴权头，后端会 401）。委托与谁渲染了按钮无关，但 id 必须原样保留。
//
// 数据源沿用旧卡那套 model，保证 ready/url 的口径不变。
//
// 但全局 statusCard 只有一张，播的是最近一次被轮询的任务——可能是另一本书的（打开一本
// 已完成的书时详情不会 attach 它自己的任务）。所以只在卡片的 jobId 属于本书
// （documentJobIds，即 documentJobs.jobs）时才渲染，否则会把别的书的产物挂到这本书上。
import { ResultActions, useStatusCardModel } from "@/features/jobs/index.js";

export function ProcessingResultActions({ documentJobIds = [] }: { documentJobIds?: string[] }) {
  const model = useStatusCardModel({ embedded: true });
  const cardJobId = `${model?.snapshot?.jobId || ""}`.trim();
  const primaryActions = (model?.display?.primaryActions || {}) as Record<string, unknown>;
  if (!cardJobId || !documentJobIds.includes(cardJobId)) return null;
  const hasActions = Boolean(
    primaryActions.markdownBundleReady
    || primaryActions.pdfReady
    || primaryActions.readerReady
    || primaryActions.sourcePdfReady,
  );
  if (!hasActions) return null;
  return (
    <div className="book-detail-processing-result-actions">
      <ResultActions
        {...primaryActions}
        onReaderClick={() => model.reader?.openReader?.(cardJobId, null, "", { pinJob: true })}
      />
    </div>
  );
}
