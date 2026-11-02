use std::sync::atomic::Ordering;

use axum::body::Body;
use axum::extract::{DefaultBodyLimit, Request, State};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::Router;
use futures_util::StreamExt;

use crate::app::AppState;
use crate::error::AppError;
use crate::routes::backups;

pub(super) fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/v1/backups",
            get(backups::status).post(backups::create),
        )
        .route(
            "/api/v1/backups/import",
            post(backups::import).layer(DefaultBodyLimit::disable()),
        )
        .route("/api/v1/backups/download/:name", get(backups::download))
        .route("/api/v1/backups/restore", post(backups::restore_local))
        .route(
            "/api/v1/backups/pending",
            axum::routing::delete(backups::cancel),
        )
        .route(
            "/api/v1/backups/webdav/settings",
            axum::routing::put(backups::save_settings),
        )
        .route("/api/v1/backups/webdav/test", post(backups::test_webdav))
        .route("/api/v1/backups/webdav/files", get(backups::list_remote))
        .route(
            "/api/v1/backups/webdav/backup",
            post(backups::backup_remote),
        )
        .route(
            "/api/v1/backups/webdav/restore",
            post(backups::restore_remote),
        )
}

pub(super) async fn maintenance_access(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    let path = request.uri().path();
    let mutation = !matches!(request.method().as_str(), "GET" | "HEAD" | "OPTIONS");
    if !mutation || path == "/api/v1/backups" || path.starts_with("/api/v1/backups/") {
        return next.run(request).await;
    }
    let guard = state.backups.gate.clone().read_owned().await;
    if state.backups.pending.load(Ordering::SeqCst) {
        return AppError::ServiceUnavailable(
            "迁移包已暂存，请重启应用完成恢复，或在设置中取消恢复后继续操作".into(),
        )
        .into_response();
    }
    let response = next.run(request).await;
    let (parts, body) = response.into_parts();
    // POST chat responses keep writing while their body streams. Keep the guard
    // until the stream ends or the client disconnects, not just until its headers.
    let stream = futures_util::stream::unfold(
        (body.into_data_stream(), guard),
        |(mut stream, guard)| async move { stream.next().await.map(|chunk| (chunk, (stream, guard))) },
    );
    Response::from_parts(parts, Body::from_stream(stream))
}
