use std::collections::HashSet;
use std::path::PathBuf;

use crate::models::domain::JobSnapshot;
use crate::storage_paths::{resolve_markdown_images_dir, resolve_markdown_path};

use super::DownloadJobsDeps;

/// Recovery tasks reuse OCR artifacts but may not have their own md directory.
pub(super) fn markdown_sources(
    deps: &DownloadJobsDeps<'_>,
    job: &JobSnapshot,
) -> (Option<PathBuf>, Option<PathBuf>) {
    let mut current = job.clone();
    let mut visited = HashSet::new();
    let mut markdown = None;
    let mut images = None;
    while visited.insert(current.job_id.clone()) {
        markdown = markdown.or_else(|| {
            resolve_markdown_path(&current, deps.data_root).filter(|path| path.is_file())
        });
        images = images.or_else(|| {
            resolve_markdown_images_dir(&current, deps.data_root).filter(|path| path.is_dir())
        });
        if markdown.is_some() && images.is_some() {
            break;
        }
        let source = current.request_payload.source.artifact_job_id.trim();
        if source.is_empty() {
            break;
        }
        let Ok(source_job) = deps.db.get_job(source) else {
            break;
        };
        current = source_job;
    }
    (markdown, images)
}
