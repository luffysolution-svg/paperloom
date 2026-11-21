use std::path::{Component, Path, PathBuf};

use retainpdf_api_base::error::AppError;
use retainpdf_core::models::domain::JobSnapshot;

use crate::files::downloads::DownloadJobsDeps;

pub(super) fn safe_markdown_image_path(path: &str) -> Result<PathBuf, AppError> {
    let raw = Path::new(path);
    if raw.is_absolute() {
        return Err(AppError::bad_request(
            "absolute markdown image path is not allowed",
        ));
    }
    let mut clean = PathBuf::new();
    for component in raw.components() {
        match component {
            Component::Normal(part) => clean.push(part),
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err(AppError::bad_request(
                    "parent-relative markdown image path is not allowed",
                ));
            }
        }
    }
    if clean.as_os_str().is_empty() {
        return Err(AppError::bad_request("markdown image path is empty"));
    }
    Ok(clean)
}

pub(super) fn job_artifacts_dir(
    deps: &DownloadJobsDeps<'_>,
    job: &JobSnapshot,
) -> Result<PathBuf, AppError> {
    let output_dir = retainpdf_files::job_artifacts_dir_path(deps.data_root, job)?;
    std::fs::create_dir_all(&output_dir)?;
    Ok(output_dir)
}
