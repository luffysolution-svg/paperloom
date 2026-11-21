import {
  isMarkdownReady,
  renderMarkdownContract,
  renderMarkdownImagePreview,
  resolveMarkdownImagesBaseUrl,
} from "./artifacts.js";
import type { JobLike, JobPayload } from "@retainpdf/domain/job";
import type {
  DetailFetchProtected,
  DetailSetActionLink,
  DetailSetText,
  MarkdownPayloadLike,
} from "./page-ports.js";
import type { JobDetailPageState } from "./page-state.js";

export function renderInitialMarkdownContract({
  job,
  markdownImageUrls,
  setActionLink,
  setText,
}: {
  job: JobLike | JobPayload | null | undefined;
  markdownImageUrls: string[];
  setActionLink: DetailSetActionLink;
  setText: DetailSetText;
}) {
  renderMarkdownContract({
    job,
    markdownPayload: null,
    markdownImageUrls,
    setText,
    setActionLink,
  });
}

export async function loadAndRenderMarkdownFlow({
  fetchProtected,
  job,
  jobId,
  loadMarkdownPayload,
  markdownImageUrls,
  setActionLink,
  setText,
  state,
}: {
  fetchProtected: DetailFetchProtected;
  job: JobLike | JobPayload | null | undefined;
  jobId: string;
  loadMarkdownPayload: (jobId: string) => Promise<MarkdownPayloadLike | null>;
  markdownImageUrls: string[];
  setActionLink: DetailSetActionLink;
  setText: DetailSetText;
  state?: JobDetailPageState | null;
}) {
  // 没发布 Markdown（失败的、还没跑到 OCR 的任务）时 renderMarkdownContract 本来就不看返回内容，
  // 去取 /reader/markdown 只会拿到一个 404，直接按"没有已发布 Markdown"渲染。
  if (!isMarkdownReady(job)) {
    if (state) {
      state.markdownPayload = null;
    }
    renderMarkdownContract({
      job,
      markdownPayload: null,
      markdownImageUrls,
      setText,
      setActionLink,
    });
    return;
  }
  try {
    const markdownPayload = await loadMarkdownPayload(jobId);
    if (state) {
      state.markdownPayload = markdownPayload;
    }
    renderMarkdownContract({
      job,
      markdownPayload,
      markdownImageUrls,
      setText,
      setActionLink,
    });
    if (markdownPayload) {
      await renderMarkdownImagePreview({
        markdownPayload,
        imagesBaseUrl: resolveMarkdownImagesBaseUrl(job, markdownPayload),
        markdownImageUrls,
        fetchProtected,
      });
    } else if (isMarkdownReady(job)) {
      setText("detail-markdown-status", "Markdown 已标记 ready，但 /markdown 暂未返回内容");
    }
  } catch (error) {
    renderMarkdownContract({
      job,
      markdownPayload: null,
      markdownImageUrls,
      setText,
      setActionLink,
    });
    setText("detail-markdown-status", (error as { message?: string } | null)?.message || "读取 Markdown 失败");
  }
}
