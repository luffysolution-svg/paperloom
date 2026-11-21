//! OCR-from-library: reuse a document's stored upload without exposing upload_id.

use retainpdf_api_base::error::AppError;
use retainpdf_jobs::JobSubmissionView;
use retainpdf_core::models::domain::WorkflowKind;
use retainpdf_jobs::{reject_client_job_id, JobsFacade};

use super::documents::require_document_upload;
use super::LibraryDeps;
use crate::views::DocumentJobRequest;

/// Bind an OCR request to the document's stored upload and create an OCR-only job.
///
/// 和 `POST /jobs` 一样严格：和这个入口矛盾的字段（`workflow` 不是 ocr、`source.artifact_job_id`、
/// `source.source_url`）一律 400，不再悄悄改掉。先看请求写没写对（400），再看书和原文在不在（404）。
pub async fn ocr_document(
    deps: &LibraryDeps<'_>,
    jobs: &JobsFacade<'_>,
    document_id: &str,
    request: DocumentJobRequest,
    base_url: &str,
) -> Result<JobSubmissionView, AppError> {
    let DocumentJobRequest { input: mut request, workflow_given } = request;
    reject_client_job_id(&request)?;
    if workflow_given && !matches!(request.workflow, WorkflowKind::Ocr) {
        return Err(AppError::bad_request(
            "workflow must be ocr (or omitted) on /documents/:document_id/ocr; use /documents/:document_id/translate to translate",
        ));
    }
    if !request.source.artifact_job_id.trim().is_empty() {
        return Err(AppError::bad_request(
            "source.artifact_job_id is not accepted on /documents/:document_id/ocr: document OCR always reads the document's own PDF",
        ));
    }
    if !request.source.source_url.trim().is_empty() {
        return Err(AppError::bad_request(
            "source.source_url is not accepted on /documents/:document_id/ocr: the document's stored PDF is used",
        ));
    }

    let (_document, upload) = require_document_upload(deps, document_id)?;
    if !request.source.upload_id.trim().is_empty()
        && request.source.upload_id.trim() != upload.upload_id
    {
        return Err(AppError::bad_request(
            "source.upload_id does not match this document's stored upload",
        ));
    }

    request.workflow = WorkflowKind::Ocr;
    request.source.upload_id = upload.upload_id;
    jobs.create_document_submission(base_url, &request, document_id)
}
