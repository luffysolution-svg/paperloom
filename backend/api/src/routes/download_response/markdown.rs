use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};

use crate::error::AppError;
use crate::routes::common::ok_json;

use crate::routes::common::{request_base_url, JobsDownloadRouteDeps};

pub async fn markdown_document_response(
    deps: &JobsDownloadRouteDeps<'_>,
    headers: &HeaderMap,
    job_id: &str,
) -> Result<Response, AppError> {
    let base_url = request_base_url(headers, deps.default_port, &deps.bind_host);
    let view = deps
        .downloads
        .markdown_document_view(job_id, &base_url)
        .await?;
    Ok(ok_json(view).into_response())
}

