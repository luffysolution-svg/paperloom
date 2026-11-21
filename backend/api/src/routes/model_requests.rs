//! 翻译工作进程调模型的三个内部接口。凭只对一个任务有效的短期能力令牌（`Authorization: Bearer`），
//! 挂在应用 API 密钥的认证之外；绝不把应用 API 密钥当能力令牌，也绝不在模型请求里收上游地址。
//! 能力令牌由任务运行时在进程内直接发（`retainpdf-runner` 的 `worker_process.rs`），没有签发接口
//! （`POST …/capability` 2026-10-22 删了）。登记表在 `app/router/model_requests.rs`。
//!
//! 成功时回裸 JSON（不带 `{code, message, data}` 信封），报错走统一的错误信封。先验令牌、再解析请求体：
//! 没有有效令牌的请求只会得到 401，拿不到「哪个字段写错了」的回答。
use crate::routes::common::{parse_json_body, ApiPath};
use crate::services::providers::ModelRequest;
use crate::{
    app::{build_model_requests_api_from_state, AppState},
    error::AppError,
};
use axum::{
    body::Bytes,
    extract::{rejection::BytesRejection, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde_json::{json, Value};

fn token(headers: &HeaderMap) -> Result<&str, AppError> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .filter(|s| s.len() == 64)
        .ok_or_else(|| AppError::Unauthorized("worker capability required".into()))
}

pub(crate) async fn submit(
    State(state): State<AppState>,
    ApiPath(job_id): ApiPath<String>,
    headers: HeaderMap,
    body: Result<Bytes, BytesRejection>,
) -> Result<Json<Value>, AppError> {
    let api = build_model_requests_api_from_state(&state);
    let token = token(&headers)?;
    api.authorize(&job_id, token)?;
    let body = body.map_err(|rejection| {
        if rejection.status() == StatusCode::PAYLOAD_TOO_LARGE {
            AppError::payload_too_large("request body is too large")
        } else {
            AppError::bad_request("unable to read JSON request body")
        }
    })?;
    let request: ModelRequest = parse_json_body(&headers, &body)?;
    let operation = api.submit(&job_id, token, request).await?;
    Ok(Json(json!(operation)))
}

pub(crate) async fn status(
    State(state): State<AppState>,
    ApiPath((job_id, operation_id)): ApiPath<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<Value>, AppError> {
    let operation = build_model_requests_api_from_state(&state).status(
        &job_id,
        token(&headers)?,
        &operation_id,
    )?;
    Ok(Json(json!(operation)))
}

pub(crate) async fn cancel(
    State(state): State<AppState>,
    ApiPath((job_id, operation_id)): ApiPath<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<Value>, AppError> {
    let changed = build_model_requests_api_from_state(&state).cancel(
        &job_id,
        token(&headers)?,
        &operation_id,
    )?;
    Ok(Json(json!({"changed":changed})))
}
