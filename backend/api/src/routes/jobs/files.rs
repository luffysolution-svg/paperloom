//! 任务的文件：`/jobs/:id/files/…`。
//!
//! 按"给谁用"分三组：`output/` 成品、`pages/` 译文页预览图、`internal/` 中间产物
//! （多用户模式下只给管理员，访问策略在 services::accounts::access）。默认在浏览器里打开，
//! `?download=1` 直接下载。旧地址（`/pdf`、`/artifacts/:key`……）2026-10-18 删了。

use axum::extract::State;
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};


use crate::auth::Principal;
use crate::error::AppError;
use crate::models::api::JobFilesQuery;
use crate::routes::common::{
    build_jobs_download_route_deps, build_jobs_query_route_deps, ok_json, request_base_url,
    run_job_query_once, ApiPath, ApiQuery,
};
use crate::routes::download_response::file_download_response;
use crate::services::jobs::FileGroup;
use crate::AppState;

/// 有哪些文件。网站账号看不到 `internal` 组。
pub async fn list_job_files(
    State(state): State<AppState>,
    principal: Principal,
    ApiPath(job_id): ApiPath<String>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    let deps = build_jobs_query_route_deps(&state);
    let base_url = request_base_url(&headers, deps.default_port, &deps.bind_host);
    let include_internal = principal.is_admin();
    let view = run_job_query_once(&state, format!("jobs:files:{job_id}:{include_internal}"), move |jobs| {
        jobs.job_files_view(&base_url, &job_id, include_internal)
    })
    .await?;
    Ok(ok_json(view).into_response())
}

async fn named(
    state: &AppState,
    headers: &HeaderMap,
    job_id: &str,
    group: FileGroup,
    name: &str,
    query: &JobFilesQuery,
) -> Result<Response, AppError> {
    let deps = build_jobs_download_route_deps(state);
    let download = deps.downloads.open_named(job_id, group, name, query).await?;
    file_download_response(download, headers).await
}

pub async fn job_output_file(
    State(state): State<AppState>,
    ApiPath((job_id, name)): ApiPath<(String, String)>,
    headers: HeaderMap,
    ApiQuery(query): ApiQuery<JobFilesQuery>,
) -> Result<Response, AppError> {
    named(&state, &headers, &job_id, FileGroup::Output, &name, &query).await
}

pub async fn job_page_file(
    State(state): State<AppState>,
    ApiPath((job_id, page)): ApiPath<(String, String)>,
    headers: HeaderMap,
    ApiQuery(query): ApiQuery<JobFilesQuery>,
) -> Result<Response, AppError> {
    named(&state, &headers, &job_id, FileGroup::Pages, &page, &query).await
}

pub async fn job_internal_file(
    State(state): State<AppState>,
    ApiPath((job_id, name)): ApiPath<(String, String)>,
    headers: HeaderMap,
    ApiQuery(query): ApiQuery<JobFilesQuery>,
) -> Result<Response, AppError> {
    named(&state, &headers, &job_id, FileGroup::Internal, &name, &query).await
}
