// 产物分组、标签与预览能力判定：把后端 manifest item 映射成人话。
// 仅依赖 types/values，不涉及 URL 解析与 section 组装。

import type { DocumentJobSummary } from "@/features/library/domain.js";
import type { ArtifactCenterGroupId, ArtifactManifestItem } from "./artifact-center-types.js";
import { artifactKey, text, workflowOf } from "./artifact-values.js";

export const GROUP_META: Record<ArtifactCenterGroupId, { label: string; description: string }> = {
  source: { label: "原始文件", description: "入库时保存的 PDF" },
  ocr: { label: "OCR 与结构化", description: "识别正文、Markdown、表格与结构化数据" },
  translation: { label: "翻译与阅读", description: "译文、对照文件与任务包" },
  diagnostics: { label: "诊断与报告", description: "后端实际生成的处理报告" },
  agent: { label: "Agent 版本", description: "候选文件与已应用版本" },
};

export function isDiagnosticArtifact(item: ArtifactManifestItem): boolean {
  const key = `${artifactKey(item)} ${text(item.artifact_group)}`;
  return /(diagnostic|report|summary|failure|error|log|trace)/.test(key);
}

export function groupFor(job: DocumentJobSummary, item: ArtifactManifestItem): ArtifactCenterGroupId {
  if (isDiagnosticArtifact(item)) return "diagnostics";
  const workflow = workflowOf(job);
  return workflow === "ocr" ? "ocr" : "translation";
}

export function labelFor(item: ArtifactManifestItem): string {
  const key = `${artifactKey(item)} ${text(item.file_name || item.filename).toLowerCase()}`;
  if (/layout.docx|\.docx$/.test(key)) return "Word 排版稿";
  if (/obsidian/.test(key)) return "Obsidian 笔记包";
  if (/side.by.side|comparison|bilingual/.test(key)) return "对照 PDF";
  if (/translated.pdf|output.pdf|result.pdf|^pdf$/.test(key)) return "译文 PDF";
  if (/normalized.document|document\.v1/.test(key)) return "结构化文档";
  if (/normalization.report/.test(key)) return "识别报告";
  if (/markdown.*bundle|bundle.*markdown/.test(key)) return "Markdown 任务包";
  if (/bundle|archive|zip/.test(key)) return "完整任务包";
  if (/translation.manifest/.test(key)) return "翻译清单";
  if (/layout\.json/.test(key)) return "版式数据";
  if (/events\.json/.test(key)) return "事件记录";
  if (/paddle_result|paddle_raw/.test(key)) return "识别原始数据";
  if (/request.journal/.test(key)) return "翻译请求记录";
  if (/markdown/.test(key)) return "Markdown";
  if (/diagnostic/.test(key)) return "诊断报告";
  if (/report/.test(key)) return "处理报告";
  if (/summary/.test(key)) return "处理摘要";
  return text(item.file_name || item.filename) || text(item.artifact_key) || "任务产物";
}

export function kindFor(item: ArtifactManifestItem): string {
  const explicit = text(item.artifact_kind).toUpperCase();
  if (explicit && explicit !== "FILE") return explicit;
  const name = text(item.file_name || item.filename || item.artifact_key);
  const extension = name.match(/\.([a-z0-9]+)$/i)?.[1];
  if (extension) return extension.toUpperCase();
  const contentType = text(item.content_type);
  if (contentType.includes("pdf")) return "PDF";
  if (contentType.includes("json")) return "JSON";
  if (contentType.includes("markdown")) return "MD";
  return explicit || "FILE";
}

export function previewable(item: ArtifactManifestItem): boolean {
  const key = artifactKey(item);
  return /(pdf|markdown|normalized.document)/.test(key);
}
