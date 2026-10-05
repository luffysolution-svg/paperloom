use axum::http::{header, HeaderMap, HeaderValue};
use axum::response::Response;

use crate::error::AppError;
use crate::models::api::PagePreviewQuery;
use crate::routes::job_helpers::file_etag;

use super::files::file_download_response;
use crate::routes::common::JobsDownloadRouteDeps;

pub async fn page_preview_response(
    deps: &JobsDownloadRouteDeps<'_>,
    headers: &HeaderMap,
    job_id: &str,
    page: u32,
    query: &PagePreviewQuery,
) -> Result<Response, AppError> {
    let download = deps
        .downloads
        .page_preview_download(job_id, page, query)
        .await?;
    let etag = file_etag(&download.path);
    let mut response = file_download_response(download, headers).await?;
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("public, max-age=31536000, immutable"),
    );
    if let Some(etag) = etag {
        response.headers_mut().insert(
            header::ETAG,
            HeaderValue::from_str(&etag).map_err(|error| AppError::internal(error.to_string()))?,
        );
    }
    Ok(response)
}
