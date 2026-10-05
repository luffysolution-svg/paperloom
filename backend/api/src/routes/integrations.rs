use axum::extract::State;
use axum::Json;

use crate::error::AppError;
use crate::models::api::ApiResponse;
use crate::routes::common::{
    build_integration_route_deps, build_jobs_download_route_deps, ok_json, ApiJson, ApiPath,
};
use crate::services::integrations::api::{
    export_documents_to_obsidian_view, export_job_to_obsidian_view, obsidian_integration_view,
    save_obsidian_settings_view, ObsidianBatchExportRequest, ObsidianBatchExportView,
    ObsidianExportRequest, ObsidianExportView, ObsidianIntegrationView, ObsidianSettings,
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
    let downloads = build_jobs_download_route_deps(&state).downloads;
    Ok(ok_json(
        export_job_to_obsidian_view(&deps, &downloads, &job_id, &request).await?,
    ))
}

pub(crate) async fn export_documents_to_obsidian(
    State(state): State<AppState>,
    ApiJson(request): ApiJson<ObsidianBatchExportRequest>,
) -> Result<Json<ApiResponse<ObsidianBatchExportView>>, AppError> {
    let deps = build_integration_route_deps(&state);
    let downloads = build_jobs_download_route_deps(&state).downloads;
    Ok(ok_json(
        export_documents_to_obsidian_view(&deps, &downloads, &request).await?,
    ))
}
