use axum::http::{header, HeaderMap, HeaderValue};
use axum::response::{IntoResponse, Response};

use crate::error::AppError;
use crate::models::api::{to_absolute_url, MarkdownExportQuery, MarkdownQuery, MarkdownView};
use crate::routes::common::ok_json;
use crate::services::jobs::MarkdownDownload;

use super::files::file_download_response;
use crate::routes::common::{request_base_url, JobsDownloadRouteDeps};
use crate::routes::job_helpers::file_etag;

pub async fn markdown_response(
    deps: &JobsDownloadRouteDeps<'_>,
    headers: &HeaderMap,
    job_id: String,
    query: &MarkdownQuery,
) -> Result<Response, AppError> {
    // raw 走文件流,于是直接拿到 `stream_file` 已经实现好的 HTTP Range:
    // 阅读器要的"滚到底再拉下一段"用 `Range: bytes=a-b` 就够,不必再开一套
    // 游标端点。ETag(size+mtime)让客户端能发现正文换了版本——分段拉取期间
    // 正文若被改写,拼出来的会是两个版本的混合,而那是静默的。
    //
    // 非 raw 仍走 JSON,那条路要把正文塞进 JSON 字段,没法流式给。
    if query.raw {
        let download = deps.downloads.markdown_raw_download(&job_id)?;
        let etag = file_etag(&download.path);
        let mut response = file_download_response(download, headers).await?;
        if let Some(etag) = etag {
            response.headers_mut().insert(
                header::ETAG,
                HeaderValue::from_str(&etag)
                    .map_err(|error| AppError::internal(error.to_string()))?,
            );
        }
        return Ok(response);
    }
    let markdown = deps.downloads.markdown_document(job_id).await?;
    markdown_download_response(
        headers,
        markdown,
        query.raw,
        deps.default_port,
        &deps.bind_host,
    )
}

pub async fn markdown_export_response(
    deps: &JobsDownloadRouteDeps<'_>,
    headers: &HeaderMap,
    job_id: &str,
    query: &MarkdownExportQuery,
) -> Result<Response, AppError> {
    let download = deps
        .downloads
        .markdown_export_download(job_id, query.include_source)
        .await?;
    file_download_response(download, headers).await
}

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

fn markdown_download_response(
    headers: &HeaderMap,
    markdown: MarkdownDownload,
    raw: bool,
    default_port: u16,
    bind_host: &str,
) -> Result<Response, AppError> {
    if raw {
        return Ok((
            [(header::CONTENT_TYPE, "text/markdown; charset=utf-8")],
            markdown.content,
        )
            .into_response());
    }
    let base_url = request_base_url(headers, default_port, bind_host);
    let raw_path = format!("/api/v1/jobs/{}/markdown?raw=true", markdown.job_id);
    let images_base_path = format!("/api/v1/jobs/{}/markdown/images/", markdown.job_id);
    Ok(ok_json(MarkdownView {
        job_id: markdown.job_id,
        content: markdown.content,
        raw_path: raw_path.clone(),
        raw_url: to_absolute_url(&base_url, &raw_path),
        images_base_path: images_base_path.clone(),
        images_base_url: to_absolute_url(&base_url, &images_base_path),
    })
    .into_response())
}
