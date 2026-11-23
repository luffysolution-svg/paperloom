//! 阅读：阅读页要的东西（`/jobs/:id/reader/…`）。区块位置、元信息、原文 Markdown 的 JSON 视图。

use axum::extract::State;
use axum::http::{header, HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;

use crate::error::AppError;
use crate::models::api::{ApiResponse, ReaderMetadataView, ReaderRegionsView};
use crate::AppState;

use crate::routes::common::{
    build_integration_route_deps, build_jobs_download_route_deps, ok_json, request_base_url,
    run_job_query, ApiPath, ApiQuery,
};
use crate::routes::job_helpers::if_none_match_values;

/// 带 ETag（弱校验，响应可能压缩）：浏览器带着上次的 ETag 来、译文和原文结构都没变就回 304，大书不用再传
/// 几 MB；`Cache-Control: private, no-cache` 让浏览器存下来、每次用前先问。
#[derive(serde::Deserialize, Default)]
pub struct ReaderExportQuery {
    #[serde(default)]
    obsidian: bool,
}

pub async fn get_reader_regions(
    State(state): State<AppState>,
    ApiPath(job_id): ApiPath<String>,
    ApiQuery(query): ApiQuery<ReaderExportQuery>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    let known: Vec<String> = if_none_match_values(&headers)
        .iter()
        .filter_map(|value| value.strip_prefix('"')?.strip_suffix('"').map(str::to_string))
        .collect();
    // Bibliographic properties can change independently of job artifacts.
    let known = if query.obsidian { Vec::new() } else { known };
    let key = format!(
        "reader-regions:{job_id}:{}:{}",
        query.obsidian,
        known.join(",")
    );
    let export_job_id = job_id.clone();
    let (fingerprint, view) = run_job_query(&state, key, move |jobs| {
        jobs.reader_regions_view_if_changed(&job_id, &known)
    })
    .await?;
    let mut response = match view {
        Some(mut view) => {
            if query.obsidian {
                let deps = build_integration_route_deps(&state);
                deps.download_deps()
                    .prepare_reader_export(&export_job_id, &mut view)?;
            }
            ok_json::<ReaderRegionsView>(view).into_response()
        }
        None => StatusCode::NOT_MODIFIED.into_response(),
    };
    let headers = response.headers_mut();
    if query.obsidian {
        headers.insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("private, no-store"),
        );
        return Ok(response);
    }
    if let Ok(etag) = HeaderValue::from_str(&format!("W/\"{fingerprint}\"")) {
        headers.insert(header::ETAG, etag);
    }
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("private, no-cache"));
    Ok(response)
}

/// 一个区块（引用一段用）：和 `reader/regions` 的一项一样。
pub async fn get_reader_metadata(
    State(state): State<AppState>,
    ApiPath(job_id): ApiPath<String>,
) -> Result<Json<ApiResponse<ReaderMetadataView>>, AppError> {
    let view = run_job_query(&state, format!("reader-metadata:{job_id}"), move |jobs| {
        jobs.reader_metadata_view(&job_id)
    })
    .await?;
    Ok(ok_json(view))
}

/// 原文 Markdown 的 JSON 视图，图片链接已换成绝对地址。
pub async fn get_markdown_document(
    State(state): State<AppState>,
    ApiPath(job_id): ApiPath<String>,
    ApiQuery(query): ApiQuery<ReaderExportQuery>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    let export = query.obsidian.then(|| build_integration_route_deps(&state));
    let deps = build_jobs_download_route_deps(&state);
    let base_url = request_base_url(&headers, deps.default_port, &deps.bind_host);
    let mut view = deps
        .downloads
        .markdown_document_view(&job_id, &base_url, |job, raw| match &export {
            Some(export) => export.download_deps().source_markdown_note(job, raw.as_deref()),
            None => raw.ok_or_else(|| AppError::not_ready("markdown")),
        })
        .await?;
    if query.obsidian {
        view.markdown_path.push_str("?obsidian=true");
        view.markdown_url.push_str("?obsidian=true");
    }
    Ok(ok_json(view).into_response())
}
