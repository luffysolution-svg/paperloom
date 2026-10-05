// 产物下载 URL 解析与细清单补全：把 /artifacts 的稳定发布链接
// 合并进后端 manifest，供产物中心下载/预览使用。

import type { DocumentJobSummary } from "@/features/library/domain.js";
import type {
  ArtifactLinks,
  ArtifactManifest,
  ArtifactResourceLink,
} from "./artifact-center-types.js";
import { artifactKey, jobAttempt, numberOrNull, text, workflowOf } from "./artifact-values.js";

function resolvedResourceUrl(resource: ArtifactResourceLink | undefined, fallback: unknown): string {
  return text(resource?.url || resource?.path || fallback);
}

function sideBySideUrl(pdfUrl: string): string {
  const clean = pdfUrl.split("?")[0].replace(/\/$/, "");
  return clean ? `${clean}/side-by-side` : "";
}

/**
 * Word 排版稿走的是 `/jobs/{id}/docx`，和译文 PDF 是兄弟路由而不是它的子路径——
 * 这里要把结尾的 `/pdf` 换掉，不能像 side-by-side 那样往后拼。
 */
function layoutDocxUrl(pdfUrl: string): string {
  const clean = pdfUrl.split("?")[0].replace(/\/$/, "");
  return clean.endsWith("/pdf") ? `${clean.slice(0, -"/pdf".length)}/docx` : "";
}

/** Obsidian 笔记包同样是 `/pdf` 的兄弟路由：`/jobs/{id}/markdown/export`。 */
function obsidianNotesUrl(pdfUrl: string): string {
  const clean = pdfUrl.split("?")[0].replace(/\/$/, "");
  return clean.endsWith("/pdf") ? `${clean.slice(0, -"/pdf".length)}/markdown/export` : "";
}

/**
 * Completes a detailed manifest with the stable published links also used by
 * Reader. Some older successful jobs legitimately have an empty detailed
 * manifest while /artifacts still advertises working downloads.
 */
export function mergeArtifactLinksIntoManifest(
  job: DocumentJobSummary,
  manifest: ArtifactManifest | null | undefined,
  links: ArtifactLinks | null | undefined,
): ArtifactManifest {
  const jobId = text(job.job_id);
  const generatedAt = text(job.updated_at || job.created_at);
  const attempt = jobAttempt(job);
  const items = [...(Array.isArray(manifest?.items) ? manifest.items : [])];

  const add = (
    artifactKeyValue: string,
    ready: boolean,
    url: string,
    fileName: string,
    contentType: string,
    sizeBytes?: number | null,
  ) => {
    if (!ready || !url) return;
    const alreadyDownloadable = items.some((item) => (
      artifactKey(item) === artifactKeyValue
      && Boolean(item.ready)
      && Boolean(text(item.resource_url || item.resource_path))
    ));
    if (alreadyDownloadable) return;
    items.push({
      artifact_key: artifactKeyValue,
      artifact_kind: "file",
      ready: true,
      file_name: fileName,
      content_type: contentType,
      size_bytes: sizeBytes ?? null,
      updated_at: generatedAt,
      attempt,
      resource_url: url,
    });
  };

  if (!links) return { ...(manifest || {}), job_id: manifest?.job_id || jobId, items };

  const workflow = workflowOf(job);
  const markdownUrl = text(links.markdown?.raw_url || links.markdown?.raw_path || links.markdown_url);
  const pdfUrl = resolvedResourceUrl(links.pdf, links.pdf_url);
  const bundleUrl = resolvedResourceUrl(links.bundle, links.bundle_url);
  const normalizedUrl = resolvedResourceUrl(links.normalized_document, links.normalized_document_url);
  const reportUrl = resolvedResourceUrl(links.normalization_report, links.normalization_report_url);
  const markdownReady = Boolean(links.markdown?.ready ?? links.markdown_ready);
  const pdfReady = Boolean(links.pdf?.ready ?? links.pdf_ready);
  const bundleReady = Boolean(links.bundle?.ready ?? links.bundle_ready);
  const isTranslation = ["book", "translate", "translation", "render"].includes(workflow);

  add(
    "markdown_raw",
    markdownReady,
    markdownUrl,
    text(links.markdown?.file_name) || `${jobId || "document"}.md`,
    "text/markdown",
    numberOrNull(links.markdown?.size_bytes),
  );
  add(
    "normalized_document_json",
    Boolean(links.normalized_document?.ready),
    normalizedUrl,
    text(links.normalized_document?.file_name) || "document.v1.json",
    "application/json",
    numberOrNull(links.normalized_document?.size_bytes),
  );
  add(
    "normalization_report_json",
    Boolean(links.normalization_report?.ready),
    reportUrl,
    text(links.normalization_report?.file_name) || "normalization-report.json",
    "application/json",
    numberOrNull(links.normalization_report?.size_bytes),
  );
  add(
    "translated_pdf",
    isTranslation && pdfReady,
    pdfUrl,
    text(links.pdf?.file_name) || `${jobId || "document"}-translated.pdf`,
    "application/pdf",
    numberOrNull(links.pdf?.size_bytes),
  );
  add(
    "side_by_side_pdf",
    isTranslation && pdfReady,
    sideBySideUrl(pdfUrl),
    `${jobId || "document"}-side-by-side.pdf`,
    "application/pdf",
  );
  add(
    "layout_docx",
    isTranslation && pdfReady,
    layoutDocxUrl(pdfUrl),
    `${jobId || "document"}-layout.docx`,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  add(
    "obsidian_notes_zip",
    isTranslation && pdfReady,
    obsidianNotesUrl(pdfUrl),
    `${jobId || "document"}-obsidian.zip`,
    "application/zip",
  );
  add(
    "artifact_bundle_zip",
    bundleReady,
    bundleUrl,
    text(links.bundle?.file_name) || `${jobId || "document"}.zip`,
    "application/zip",
    numberOrNull(links.bundle?.size_bytes),
  );

  return { ...(manifest || {}), job_id: manifest?.job_id || jobId, items };
}
