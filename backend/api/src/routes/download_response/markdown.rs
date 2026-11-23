use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};

use crate::error::AppError;
use crate::routes::common::ok_json;

use crate::routes::common::{request_base_url, JobsDownloadRouteDeps};
use crate::services::integrations::{source_markdown_note, IntegrationApiDeps};

pub(crate) async fn markdown_document_response(
    deps: &JobsDownloadRouteDeps<'_>,
    headers: &HeaderMap,
    job_id: &str,
    obsidian: Option<&IntegrationApiDeps<'_>>,
) -> Result<Response, AppError> {
    let base_url = request_base_url(headers, deps.default_port, &deps.bind_host);
    let mut view = deps
        .downloads
        .markdown_document_view(job_id, &base_url, |job, raw| match obsidian {
            Some(export) => source_markdown_note(&export.download_deps(), job, raw.as_deref()),
            None => raw.ok_or_else(|| AppError::not_ready("markdown")),
        })
        .await?;
    if obsidian.is_some() {
        view.markdown_path.push_str("?obsidian=true");
        view.markdown_url.push_str("?obsidian=true");
    }
    Ok(ok_json(view).into_response())
}

