use axum::extract::{Request, State};
use axum::http::{header, HeaderMap};
use axum::response::Response;
use axum::Json;

use crate::error::AppError;
use crate::models::api::ApiResponse;
use crate::routes::common::{ok_json, ApiJson, ApiPath};
use crate::routes::job_helpers::stream_file;
use crate::services::backups::{
    BackupItem, BackupStatus, CreateBackupInput, RemoteItem, RestoreInput, RestoreView,
    SettingsInput, SettingsView,
};
use crate::AppState;

pub(crate) async fn status(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<BackupStatus>>, AppError> {
    Ok(ok_json(state.backups.status().await?))
}

pub(crate) async fn create(
    State(state): State<AppState>,
    ApiJson(input): ApiJson<CreateBackupInput>,
) -> Result<Json<ApiResponse<BackupItem>>, AppError> {
    Ok(ok_json(state.backups.create(input, false).await?))
}

pub(crate) async fn download(
    State(state): State<AppState>,
    ApiPath(name): ApiPath<String>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    let mut response = stream_file(
        state.backups.download_path(&name)?,
        "application/zip",
        Some(name),
        Some(&headers),
    )
    .await?;
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        "no-store".parse().expect("static header"),
    );
    Ok(response)
}

pub(crate) async fn import(
    State(state): State<AppState>,
    request: Request,
) -> Result<Json<ApiResponse<RestoreView>>, AppError> {
    if request
        .headers()
        .get("X-Confirm-Replace")
        .and_then(|value| value.to_str().ok())
        != Some("true")
    {
        return Err(AppError::bad_request("请先确认在重启后替换当前资料库"));
    }
    Ok(ok_json(
        state
            .backups
            .import(request.into_body().into_data_stream())
            .await?,
    ))
}

pub(crate) async fn restore_local(
    State(state): State<AppState>,
    ApiJson(input): ApiJson<RestoreInput>,
) -> Result<Json<ApiResponse<RestoreView>>, AppError> {
    Ok(ok_json(state.backups.restore(input, false).await?))
}

pub(crate) async fn cancel(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    state.backups.cancel().await?;
    Ok(ok_json(serde_json::json!({ "cancelled": true })))
}

pub(crate) async fn save_settings(
    State(state): State<AppState>,
    ApiJson(input): ApiJson<SettingsInput>,
) -> Result<Json<ApiResponse<SettingsView>>, AppError> {
    Ok(ok_json(state.backups.save_settings(input).await?))
}

pub(crate) async fn test_webdav(
    State(state): State<AppState>,
    ApiJson(input): ApiJson<SettingsInput>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    state.backups.test_webdav(input).await?;
    Ok(ok_json(serde_json::json!({ "connected": true })))
}

pub(crate) async fn list_remote(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<RemoteItem>>>, AppError> {
    Ok(ok_json(state.backups.list_remote().await?))
}

pub(crate) async fn backup_remote(
    State(state): State<AppState>,
    ApiJson(input): ApiJson<CreateBackupInput>,
) -> Result<Json<ApiResponse<BackupItem>>, AppError> {
    Ok(ok_json(state.backups.create(input, true).await?))
}

pub(crate) async fn restore_remote(
    State(state): State<AppState>,
    ApiJson(input): ApiJson<RestoreInput>,
) -> Result<Json<ApiResponse<RestoreView>>, AppError> {
    Ok(ok_json(state.backups.restore(input, true).await?))
}

pub(crate) async fn delete_local(
    State(state): State<AppState>,
    ApiPath(name): ApiPath<String>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    state.backups.delete(name, false).await?;
    Ok(ok_json(serde_json::json!({ "deleted": true })))
}

pub(crate) async fn delete_remote(
    State(state): State<AppState>,
    ApiPath(name): ApiPath<String>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    state.backups.delete(name, true).await?;
    Ok(ok_json(serde_json::json!({ "deleted": true })))
}
