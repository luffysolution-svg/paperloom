//! HTTP adapters for the retainpdf-ai reverse proxy.

use crate::AppState;
use axum::extract::State;
use axum::extract::{OriginalUri, Request};
use axum::http::HeaderMap;
use axum::response::Response;

use crate::error::AppError;
use crate::routes::common::ApiJson;
use crate::services::ai::api;

pub async fn ask_proxy(
    State(state): State<AppState>,
    headers: HeaderMap,
    ApiJson(payload): ApiJson<serde_json::Value>,
) -> Result<Response, AppError> {
    api::ask(&state.ai_gateway, &headers, payload).await
}

pub async fn get_runtime_config_proxy(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    api::get_runtime_config(&state.ai_gateway, &headers).await
}

pub async fn update_runtime_config_proxy(
    State(state): State<AppState>,
    headers: HeaderMap,
    ApiJson(payload): ApiJson<serde_json::Value>,
) -> Result<Response, AppError> {
    api::update_runtime_config(&state.ai_gateway, &headers, payload).await
}

pub async fn connections_proxy(
    State(state): State<AppState>,
    OriginalUri(uri): OriginalUri,
    request: Request,
) -> Result<Response, AppError> {
    let suffix = uri
        .path()
        .strip_prefix("/api/v1/ai/connections")
        .ok_or_else(|| AppError::bad_request("invalid connection route"))?;
    let (parts, body) = request.into_parts();
    let method = reqwest::Method::from_bytes(parts.method.as_str().as_bytes())
        .map_err(|_| AppError::bad_request("invalid method"))?;
    let bytes = axum::body::to_bytes(body, 2 * 1024 * 1024)
        .await
        .map_err(|_| AppError::bad_request("AI connection request too large"))?;
    let payload = if bytes.is_empty() {
        None
    } else {
        Some(serde_json::from_slice(&bytes).map_err(|_| AppError::bad_request("invalid JSON"))?)
    };
    api::connections(
        &state.ai_gateway,
        &parts.headers,
        method,
        suffix,
        uri.query().unwrap_or(""),
        payload.as_ref(),
    )
    .await
}
