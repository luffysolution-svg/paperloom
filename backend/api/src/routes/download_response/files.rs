use axum::http::{HeaderMap, HeaderValue};
use axum::response::Response;

use crate::error::AppError;
use crate::models::api::LayoutDocxQuery;
use crate::routes::job_helpers::stream_file;
use crate::services::jobs::{DocumentDownloadKind, FileDownload};

use crate::routes::common::JobsDownloadRouteDeps;

pub async fn download_document_response(
    deps: &JobsDownloadRouteDeps<'_>,
    headers: &HeaderMap,
    job_id: &str,
    ocr_only: bool,
    kind: DocumentDownloadKind,
) -> Result<Response, AppError> {
    file_download_response(
        deps.downloads
            .download_job_document(job_id, ocr_only, kind)
            .await?,
        headers,
    )
    .await
}

pub async fn markdown_image_response(
    deps: &JobsDownloadRouteDeps<'_>,
    headers: &HeaderMap,
    job_id: &str,
    path: &str,
) -> Result<Response, AppError> {
    file_download_response(
        deps.downloads.markdown_image_download(job_id, path)?,
        headers,
    )
    .await
}

pub async fn cover_response(
    deps: &JobsDownloadRouteDeps<'_>,
    headers: &HeaderMap,
    job_id: &str,
) -> Result<Response, AppError> {
    file_download_response(deps.downloads.cover_download(job_id).await?, headers).await
}

pub async fn thumbnail_response(
    deps: &JobsDownloadRouteDeps<'_>,
    headers: &HeaderMap,
    job_id: &str,
) -> Result<Response, AppError> {
    file_download_response(deps.downloads.thumbnail_download(job_id).await?, headers).await
}

pub async fn side_by_side_pdf_response(
    deps: &JobsDownloadRouteDeps<'_>,
    headers: &HeaderMap,
    job_id: &str,
) -> Result<Response, AppError> {
    file_download_response(
        deps.downloads.side_by_side_pdf_download(job_id).await?,
        headers,
    )
    .await
}

pub async fn layout_docx_response(
    deps: &JobsDownloadRouteDeps<'_>,
    headers: &HeaderMap,
    job_id: &str,
    query: &LayoutDocxQuery,
) -> Result<Response, AppError> {
    // 只把 query 往下传,DPI 的取值范围由 service 决定——路由层不该知道
    // `LayoutDocxOptions` 这种内部类型（架构门禁盯着这条，和 page_preview 一个路子）。
    file_download_response(
        deps.downloads.layout_docx_download(job_id, query).await?,
        headers,
    )
    .await
}

pub async fn bundle_response(
    deps: &JobsDownloadRouteDeps<'_>,
    headers: &HeaderMap,
    job_id: &str,
) -> Result<Response, AppError> {
    file_download_response(deps.downloads.bundle_download(job_id).await?, headers).await
}

pub async fn registered_artifact_response(
    deps: &JobsDownloadRouteDeps<'_>,
    headers: &HeaderMap,
    job_id: &str,
    artifact_key: &str,
    include_job_dir: bool,
    ocr_only: bool,
) -> Result<Response, AppError> {
    file_download_response(
        deps.downloads
            .registered_artifact_download(job_id, artifact_key, include_job_dir, ocr_only)
            .await?,
        headers,
    )
    .await
}

pub(super) async fn file_download_response(
    download: FileDownload,
    headers: &HeaderMap,
) -> Result<Response, AppError> {
    let mut response = stream_file(
        download.path,
        &download.content_type,
        download.download_name,
        Some(headers),
    )
    .await?;
    if let Some(job_id) = download.job_id_header {
        response.headers_mut().insert(
            "X-Job-Id",
            HeaderValue::from_str(&job_id).map_err(|e| AppError::internal(e.to_string()))?,
        );
    }
    Ok(response)
}
