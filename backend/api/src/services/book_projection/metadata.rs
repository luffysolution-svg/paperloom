use std::path::Path;

use crate::models::api::BookSummaryView;
use crate::models::domain::{JobSnapshot, UploadRecord};
use crate::services::jobs::summary_loaders::SummaryCache;

pub(super) fn derive_display_name(upload: Option<&UploadRecord>, job: &JobSnapshot) -> String {
    source_file_name(upload, job).unwrap_or_else(|| job.job_id.clone())
}

pub(super) fn upload_id(job: &JobSnapshot) -> Option<&str> {
    job.upload_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

pub(super) fn source_file_name(upload: Option<&UploadRecord>, job: &JobSnapshot) -> Option<String> {
    if let Some(upload) = upload {
        let file_name = upload.filename.trim();
        if !file_name.is_empty() {
            return Some(file_name.to_string());
        }
    }
    source_url_file_name(&job.request_payload.source.source_url)
}

pub(super) fn page_count_for_library(
    upload: Option<&UploadRecord>,
    summaries: &mut SummaryCache,
    job: &JobSnapshot,
    data_root: &Path,
) -> Option<i64> {
    upload
        .map(|record| i64::from(record.page_count))
        .or_else(|| {
            job.artifacts
                .as_ref()
                .and_then(|artifacts| artifacts.pages_processed)
        })
        .or_else(|| {
            summaries
                .normalization(job, data_root)
                .and_then(|summary| summary.page_count.or(summary.pages_seen))
        })
}

pub(super) fn build_book_summary(
    upload: Option<&UploadRecord>,
    summaries: &mut SummaryCache,
    job: &JobSnapshot,
    data_root: &Path,
    display_name: &str,
) -> BookSummaryView {
    BookSummaryView {
        title: display_name.to_string(),
        authors: None,
        page_count: page_count_for_library(upload, summaries, job, data_root),
        source_language: Some(job.request_payload.ocr.language.clone())
            .filter(|value| !value.trim().is_empty()),
        target_language: None,
        source_file_name: source_file_name(upload, job),
        cover_url: None,
        thumbnail_url: None,
        file_size_bytes: upload.map(|record| record.bytes),
    }
}

pub(super) fn source_url_file_name(source_url: &str) -> Option<String> {
    let trimmed = source_url.trim();
    if trimmed.is_empty() {
        return None;
    }
    let no_fragment = trimmed.split('#').next().unwrap_or(trimmed);
    let no_query = no_fragment.split('?').next().unwrap_or(no_fragment);
    let candidate = no_query.rsplit('/').next().unwrap_or(no_query).trim();
    if candidate.is_empty() {
        return None;
    }
    Some(candidate.to_string())
}
