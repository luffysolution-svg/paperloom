use retain_core::storage_paths::resolve_job_root;

use crate::error::AppError;
use crate::services::derived_artifacts;
use crate::services::derived_artifacts::word::LayoutDocxOptions;
use crate::storage_paths::{resolve_output_pdf, resolve_source_pdf};

use super::artifact_deps::derived_artifact_deps;
use super::DownloadJobsDeps;
use super::FileDownload;
use crate::services::jobs::query::load_supported_job;

pub(super) const DOCX_CONTENT_TYPE: &str =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

pub(super) fn layout_docx_download(
    deps: &DownloadJobsDeps<'_>,
    job_id: &str,
    options: LayoutDocxOptions,
) -> Result<FileDownload, AppError> {
    let job = load_supported_job(deps.db, deps.data_root, job_id)?;
    let job_root = resolve_job_root(&job, deps.data_root)
        .ok_or_else(|| AppError::not_found(format!("job root not ready: {}", job.job_id)))?;
    let source_pdf = resolve_source_pdf(&job, deps.data_root)
        .ok_or_else(|| AppError::not_found(format!("source pdf not ready: {}", job.job_id)))?;
    if !source_pdf.is_file() {
        return Err(AppError::not_found(format!(
            "source pdf not found: {}",
            job.job_id
        )));
    }
    // 译文 PDF 是**可选**的:有它就从里面读回收敛后的字号和行距（最准），没有就走
    // 阅读器那套字号收敛（html_fit）。所以这里不要求它存在——只翻译没渲染的 job
    // 一样导得出来。它在的时候要算进新鲜度，因为读回的值会跟着它变。
    let translated_pdf = resolve_output_pdf(&job, deps.data_root).filter(|path| path.is_file());

    let output_docx = derived_artifacts::word::ensure_layout_docx(
        derived_artifact_deps(deps),
        deps.data_root,
        &job,
        &job_root,
        &source_pdf,
        translated_pdf.as_deref(),
        options,
    )?;
    Ok(FileDownload::new(
        output_docx,
        DOCX_CONTENT_TYPE,
        Some(format!("{}-layout.docx", job.job_id)),
    ))
}
