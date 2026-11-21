use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

use crate::error::AppError;
use crate::models::api::ApiResponse;
use crate::routes::common::{build_health_route_deps, run_state_blocking};
use crate::services::platform::{
    build_current_readiness_view, build_health_view, HealthView, ReadinessView,
};
use crate::AppState;

/// 两个都要连库（`ping`、数任务），放进阻塞线程：库被锁时健康检查不该把异步工作线程一起占住。
pub async fn health(State(state): State<AppState>) -> Result<Json<ApiResponse<HealthView>>, AppError> {
    run_state_blocking(&state, "health", |state| {
        Ok(Json(ApiResponse::ok(build_health_view(&build_health_route_deps(state)))))
    })
    .await
}

pub async fn ready(State(state): State<AppState>) -> Result<Response, AppError> {
    run_state_blocking(&state, "readiness", |state| {
        Ok(readiness_response(build_current_readiness_view(&build_health_route_deps(state))))
    })
    .await
}

/// 就绪：200 + 普通成功信封。不就绪：503，信封的 `code` 是 `50300`、`message` 是 `not ready`，
/// 带上 `error`（`SERVICE_UNAVAILABLE`，`details.reasons` 和 `data.reasons` 一样）；`data` 照旧是整份就绪视图，
/// 命令行、开发栈读 `data` 的写法不用改。2026-10-22 以前 503 时信封仍是 `code: 0`、`message: "ok"`。
pub(crate) fn readiness_response(view: ReadinessView) -> Response {
    if view.is_ready() {
        return Json(ApiResponse::ok(view)).into_response();
    }
    let status = StatusCode::SERVICE_UNAVAILABLE;
    let body = json!({
        "code": 50300,
        "message": "not ready",
        "error": {
            "code": "SERVICE_UNAVAILABLE",
            "http_status": status.as_u16(),
            "details": { "reasons": view.reasons },
        },
        "data": view,
    });
    (status, Json(body)).into_response()
}
