use std::path::{Path, PathBuf};

use retainpdf_api_base::error::AppError;
use retainpdf_core::models::domain::JobSnapshot;
use retainpdf_files::linearized_pdf_or_original as linearize_pdf;

use crate::files::downloads::DownloadJobsDeps;

pub(super) fn linearized_pdf_or_original(
    deps: &DownloadJobsDeps<'_>,
    job: &JobSnapshot,
    input_pdf: &Path,
    label: &str,
) -> Result<PathBuf, AppError> {
    linearize_pdf(deps.data_root, job, input_pdf, label)
}
