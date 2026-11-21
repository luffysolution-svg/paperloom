use std::path::Path;

use crate::summary_loaders::SummaryCache;
use retainpdf_core::models::api::to_absolute_url;
use retainpdf_files::document_file_path;
use crate::views::{BookSummaryView, JobFailureDiagnosticView, OcrJobSummaryView};
use retainpdf_data::db::Db;
use retainpdf_core::models::domain::{JobFailureInfo, JobSnapshot, UploadRecord};
use retainpdf_files::source_file_name;
use crate::{stored_path, StoredFile};

pub(super) fn build_book_summary(
    upload: Option<&UploadRecord>,
    summaries: &mut SummaryCache,
    job: &JobSnapshot,
    data_root: &Path,
    base_url: &str,
    display_name: &str,
    document_id: Option<&str>,
) -> BookSummaryView {
    BookSummaryView {
        title: display_name.to_string(),
        authors: None,
        page_count: summaries.book_page_count(upload, job, data_root),
        source_language: Some(job.ocr_language().to_string())
            .filter(|value| !value.trim().is_empty()),
        target_language: None,
        source_file_name: source_file_name(upload, job),
        cover_url: cover_url(job, document_id, data_root, base_url),
        thumbnail_url: thumbnail_url(job, document_id, data_root, base_url),
        file_size_bytes: upload.map(|record| record.bytes),
        document_id: None,
    }
    .with_document_id(document_id)
}

/// 书的编号：先看上传记录，没有上传记录的任务（复用别的任务产物建出来的重渲染、续跑）
/// 再查任务表里补写的 document_id。任务视图和书库视图共用这一份。
pub fn book_document_id(db: &Db, job: &JobSnapshot, upload: Option<&UploadRecord>) -> Option<String> {
    upload
        .map(|upload| upload.content_hash.trim().to_string())
        .filter(|id| !id.is_empty())
        .or_else(|| db.document_id_for_job(&job.job_id).ok().flatten())
}

pub(super) fn cover_url(
    job: &JobSnapshot,
    document_id: Option<&str>,
    data_root: &Path,
    base_url: &str,
) -> Option<String> {
    stored_path(job, data_root, StoredFile::SourcePdf).and_then(|_| book_image_url(document_id, base_url, "cover"))
}

pub(super) fn thumbnail_url(
    job: &JobSnapshot,
    document_id: Option<&str>,
    data_root: &Path,
    base_url: &str,
) -> Option<String> {
    stored_path(job, data_root, StoredFile::SourcePdf).and_then(|_| book_image_url(document_id, base_url, "thumbnail"))
}

/// 封面、缩略图是书的属性：`/documents/:id/files/cover.jpg`，和书架、文档列表同一个地址。
/// 查不到书编号就没有封面（按任务取封面的旧地址 2026-10-18 删了）；有原文的任务都会登记成书，
/// 实际只有原文文件不在的任务查不到。
fn book_image_url(document_id: Option<&str>, base_url: &str, kind: &str) -> Option<String> {
    let document_id = document_id.map(str::trim).filter(|id| !id.is_empty())?;
    Some(to_absolute_url(base_url, &document_file_path(document_id, &format!("{kind}.jpg"))))
}

pub(super) fn job_path_prefix(job: &JobSnapshot) -> &'static str {
    job.workflow.job_api_prefix()
}

/// OCR 摘要**不带失败简报**，这是个判断不是遗漏。
///
/// 这里能拿到的 `job` 是**外层那个任务**（通常是翻译任务），而 `artifacts` 里只有
/// `ocr_job_id / ocr_status / ocr_trace_id / ocr_provider_trace_id` —— 没有 OCR 任务
/// 自己的 failure。所以在这里填 `job.failure` 会把翻译任务的失败挂在 OCR 的 job_id
/// 下面，是错数据。要拿 OCR 自己的失败得按 ocr_job_id 回查一次库。
///
/// 而且没人需要：书籍详情页的 OCR 段吃的是 document jobs 列表里的 JobListItemView
/// （经 selectDocumentOcrStatusJob），和翻译段同一个来源；全仓搜 `ocr_job` 只有
/// domain/job/normalize.ts 原样转发一处，没人读 `ocr_job.failure`。
pub(super) fn build_ocr_job_summary(
    job: &JobSnapshot,
    base_url: &str,
) -> Option<OcrJobSummaryView> {
    let artifacts = job.artifacts.as_ref()?;
    let ocr_job_id = artifacts.ocr_job_id.as_ref()?;
    let detail_path = format!("/api/v1/jobs/{ocr_job_id}");
    Some(OcrJobSummaryView {
        job_id: ocr_job_id.clone(),
        status: artifacts.ocr_status.clone(),
        trace_id: artifacts.ocr_trace_id.clone(),
        provider_trace_id: artifacts.ocr_provider_trace_id.clone(),
        detail_path: detail_path.clone(),
        detail_url: to_absolute_url(base_url, &detail_path),
    })
}

pub(super) fn job_failure_to_legacy_view(failure: &JobFailureInfo) -> JobFailureDiagnosticView {
    let failure = failure.clone().with_formal_fields();
    JobFailureDiagnosticView {
        failed_stage: failure.failed_stage_value().to_string(),
        error_kind: failure.failure_code_value().to_string(),
        summary: failure.summary.clone(),
        root_cause: failure.root_cause.clone(),
        retryable: failure.retryable,
        upstream_host: failure.upstream_host.clone(),
        suggestion: failure.suggestion.clone(),
        last_log_line: failure.last_log_line.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use retainpdf_core::models::domain::{CreateJobInput, JobArtifacts};
    use retainpdf_files::{display_title, source_url_file_name};

    /// 任务列表、任务详情里的封面和书架同一个地址：`/documents/:id/files/…`；查不到书的编号就没有封面。
    #[test]
    fn cover_urls_use_the_document_files_when_the_book_is_known() {
        assert_eq!(
            book_image_url(Some("doc-sha"), "https://api.example", "cover").as_deref(),
            Some("https://api.example/api/v1/documents/doc-sha/files/cover.jpg")
        );
        assert_eq!(
            book_image_url(Some("doc-sha"), "https://api.example", "thumbnail").as_deref(),
            Some("https://api.example/api/v1/documents/doc-sha/files/thumbnail.jpg")
        );
        for missing in [None, Some(""), Some("  ")] {
            assert_eq!(
                book_image_url(missing, "https://api.example", "cover"),
                None,
                "查不到书的编号：没有封面（按任务取封面的旧地址已经删了）"
            );
        }
    }

    #[test]
    fn optional_upload_metadata_keeps_display_and_page_count_precedence() {
        let root = std::env::temp_dir().join(format!("retain-page-metadata-{}", fastrand::u64(..)));
        std::fs::create_dir_all(&root).unwrap();
        std::fs::write(
            root.join("normalization.json"),
            r#"{"normalization":{"defaults":{"pages_seen":9}}}"#,
        )
        .unwrap();
        let mut job = JobSnapshot::new("job-fallback".into(), CreateJobInput::default(), vec![]);
        job.request_payload.source.source_url = "https://example.test/source.pdf?dl=1".into();
        job.artifacts = Some(JobArtifacts {
            pages_processed: Some(5),
            normalization_report_json: Some("normalization.json".into()),
            ..Default::default()
        });
        let mut upload = UploadRecord {
            upload_id: "upload".into(),
            filename: " upload.pdf ".into(),
            stored_path: root.join("upload.pdf").to_string_lossy().into_owned(),
            bytes: 20,
            page_count: 0,
            uploaded_at: "now".into(),
            developer_mode: false,
            content_hash: String::new(),
        };
        let mut summaries = SummaryCache::default();
        assert_eq!(display_title(Some(&upload), &job, &Default::default()), "upload.pdf");
        // A stored zero is still metadata, not a signal to substitute artifacts.
        assert_eq!(
            summaries.book_page_count(Some(&upload), &job, &root),
            Some(0)
        );
        assert_eq!(
            summaries.book_page_count(None, &job, &root),
            Some(5)
        );
        job.artifacts.as_mut().unwrap().pages_processed = None;
        assert_eq!(
            summaries.book_page_count(None, &job, &root),
            Some(9)
        );
        upload.filename = " ".into();
        assert_eq!(display_title(Some(&upload), &job, &Default::default()), "source.pdf");
        assert_eq!(source_file_name(None, &job), Some("source.pdf".into()));
        job.request_payload.source.source_url.clear();
        assert_eq!(display_title(None, &job, &Default::default()), "job-fallback");
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn source_url_file_name_extracts_tail() {
        assert_eq!(
            source_url_file_name("https://example.com/files/paper.pdf?download=1#top"),
            Some("paper.pdf".to_string())
        );
    }

    #[test]
    fn source_url_file_name_rejects_empty_tail() {
        assert_eq!(source_url_file_name("https://example.com/files/"), None);
    }
}
