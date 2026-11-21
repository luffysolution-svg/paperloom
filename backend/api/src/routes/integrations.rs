use axum::extract::State;
use axum::http::HeaderMap;
use axum::response::Response;
use axum::Json;

use crate::error::AppError;
use crate::models::api::ApiResponse;
use crate::routes::common::{
    build_integration_route_deps, build_jobs_download_route_deps, ok_json, ApiJson, ApiPath,
    ApiQuery,
};
use crate::routes::download_response::file_download_response;
use crate::routes::job_helpers::stream_file;
use crate::services::integrations::{
    batch_export_download, export_batch, export_documents_to_obsidian_view,
    export_job_to_obsidian_view, markdown_export_download_async, obsidian_integration_view,
    save_obsidian_settings_view, BatchExportInput, BatchExportView, MarkdownExportQuery,
    ObsidianBatchExportRequest, ObsidianBatchExportView, ObsidianExportRequest, ObsidianExportView,
    ObsidianIntegrationView, ObsidianSettings,
};
use crate::AppState;

pub(crate) async fn get_obsidian_integration(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<ObsidianIntegrationView>>, AppError> {
    let deps = build_integration_route_deps(&state);
    Ok(ok_json(obsidian_integration_view(&deps).await?))
}

pub(crate) async fn put_obsidian_settings(
    State(state): State<AppState>,
    ApiJson(settings): ApiJson<ObsidianSettings>,
) -> Result<Json<ApiResponse<ObsidianSettings>>, AppError> {
    let deps = build_integration_route_deps(&state);
    Ok(ok_json(save_obsidian_settings_view(&deps, settings)?))
}

pub(crate) async fn export_job_to_obsidian(
    State(state): State<AppState>,
    ApiPath(job_id): ApiPath<String>,
    ApiJson(request): ApiJson<ObsidianExportRequest>,
) -> Result<Json<ApiResponse<ObsidianExportView>>, AppError> {
    let deps = build_integration_route_deps(&state);
    Ok(ok_json(
        export_job_to_obsidian_view(&deps, &job_id, &request).await?,
    ))
}

pub(crate) async fn export_documents_to_obsidian(
    State(state): State<AppState>,
    ApiJson(request): ApiJson<ObsidianBatchExportRequest>,
) -> Result<Json<ApiResponse<ObsidianBatchExportView>>, AppError> {
    let deps = build_integration_route_deps(&state);
    Ok(ok_json(
        export_documents_to_obsidian_view(&deps, &request).await?,
    ))
}

pub(crate) async fn download_markdown_export(
    State(state): State<AppState>,
    ApiPath(job_id): ApiPath<String>,
    ApiQuery(query): ApiQuery<MarkdownExportQuery>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    let deps = build_integration_route_deps(&state);
    let download =
        markdown_export_download_async(&deps.download_deps(), &job_id, query.include_source, None)
            .await?;
    file_download_response(download, &headers).await
}

pub(crate) async fn export_documents_route(
    State(state): State<AppState>,
    ApiJson(input): ApiJson<BatchExportInput>,
) -> Result<Json<ApiResponse<BatchExportView>>, AppError> {
    let deps = build_integration_route_deps(&state);
    let downloads = build_jobs_download_route_deps(&state).downloads;
    Ok(ok_json(
        export_batch(&deps.download_deps(), &downloads, input).await?,
    ))
}

pub(crate) async fn download_document_export_route(
    State(state): State<AppState>,
    ApiPath(name): ApiPath<String>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    let deps = build_integration_route_deps(&state);
    let file = batch_export_download(&deps.download_deps(), &name)?;
    stream_file(
        file.path,
        &file.content_type,
        file.download_name,
        Some(&headers),
    )
    .await
}
