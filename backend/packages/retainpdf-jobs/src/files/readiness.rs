use std::path::Path;

use retainpdf_core::models::domain::{JobSnapshot, JobStatusKind};
use crate::{stored_path, StoredFile};

pub fn job_readiness(job: &JobSnapshot, data_root: &Path) -> (bool, bool, bool) {
    let pdf_ready = stored_path(job, data_root, StoredFile::TranslatedPdf)
        .map(|path| path.exists())
        .unwrap_or(false);
    let markdown_ready = stored_path(job, data_root, StoredFile::OcrMarkdown)
        .map(|path| path.exists())
        .unwrap_or(false);
    let bundle_ready = matches!(job.status, JobStatusKind::Succeeded);
    (pdf_ready, markdown_ready, bundle_ready)
}
