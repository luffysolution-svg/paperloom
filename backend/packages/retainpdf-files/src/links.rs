//! 返回给前端的文件链接（新地址）。任务详情、书籍详情、Markdown 视图里的链接都从这里拼，
//! 和路由 `/jobs/:id/files/<组>/<文件名>`、`/documents/:id/files/<文件名>` 对得上。
//! 旧地址（`/jobs/:id/pdf`、`/markdown?raw=true`……）2026-10-18 删了。
//! 对照表见 docs/ops/planning/api-reorg/20261017-返回链接换新地址清单.md。

/// `internal/` 组：新文件名 ↔ 产物清单里的名字。文件出口（任务包的 `files/downloads/catalog.rs`）和
/// 产物清单的 `resource_path` 共用这一张表。
///
/// `layout_json` 不在这里：它和 `provider_result_json` 指向同一个文件
/// （OCR 的 `paddle_result.json`），只列 `ocr-provider/result.json` 一个。
pub const JOB_INTERNAL_FILES: &[(&str, &str)] = &[
    ("normalized-document.json", "normalized_document_json"),
    ("normalization-report.json", "normalization_report_json"),
    ("render-config.json", "render_config_json"),
    ("translation-manifest.json", "translation_manifest_json"),
    ("translation-checkpoint.json", "translation_checkpoint_json"),
    ("translation-requests.jsonl", "translation_request_journal_jsonl"),
    ("translation-diagnostics.json", "translation_diagnostics_json"),
    ("translation-debug-index.json", "translation_debug_index_json"),
    ("pipeline-summary.json", "pipeline_summary"),
    ("events.jsonl", "events_jsonl"),
    ("typst/source.typ", "typst_source"),
    ("typst/render.pdf", "typst_render_pdf"),
    ("ocr-provider/result.json", "provider_result_json"),
    ("ocr-provider/raw.zip", "provider_bundle_zip"),
];

/// 任务的一个文件：`/api/v1/jobs/{job_id}/files/{relative}`，`relative` 是 `<组>/<文件名>`。
pub fn job_file_path(job_id: &str, relative: &str) -> String {
    format!("/api/v1/jobs/{job_id}/files/{relative}")
}

/// 任务的文件清单：`/api/v1/jobs/{job_id}/files`。取代旧的 `/artifacts`、`/artifacts-manifest`。
pub fn job_files_list_path(job_id: &str) -> String {
    format!("/api/v1/jobs/{job_id}/files")
}

/// 书的一个文件：`/api/v1/documents/{document_id}/files/{name}`。
pub fn document_file_path(document_id: &str, name: &str) -> String {
    format!("/api/v1/documents/{document_id}/files/{name}")
}

/// 译文 PDF（在浏览器里打开）。
pub fn job_translated_pdf_path(job_id: &str) -> String {
    job_file_path(job_id, "output/translated.pdf")
}

/// 原文 Markdown 原样（OCR 结果，不是译文）。
pub fn job_ocr_markdown_path(job_id: &str) -> String {
    job_file_path(job_id, "output/ocr.md")
}

/// Markdown 引用的图片的目录，后面接 `images/` 下的相对路径。
pub fn job_ocr_images_base_path(job_id: &str) -> String {
    job_file_path(job_id, "output/ocr/images/")
}

/// 全部成品打包。带 `?download=1`：直接下载（以前的 `/download` 就是这样）。
pub fn job_bundle_path(job_id: &str) -> String {
    job_file_path(job_id, "output/all.zip?download=1")
}

/// 原文 Markdown 的 JSON 视图（阅读页用，图片链接已换成绝对地址）。
pub fn job_markdown_view_path(job_id: &str) -> String {
    format!("/api/v1/jobs/{job_id}/reader/markdown")
}
