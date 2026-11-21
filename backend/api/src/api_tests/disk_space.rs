//! 磁盘剩余空间低于下限（`RUST_API_MIN_FREE_DISK_MB`）：上传、建任务 503 + `insufficient_storage`，
//! 什么都不留下；`/health` 的 `disk` 报出来，`/ready` 不跟着变。
//!
//! 测试机的剩余空间不归测试管，所以下限设成 `u64::MAX`（一定不够）和 `0`（不查）两头。

use std::sync::Arc;

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use tower::util::ServiceExt;

use super::jobs_common::{minimal_pdf_bytes, read_json, test_state};
use crate::app::build_app;
use crate::models::domain::JobStatusKind;

const BOUNDARY: &str = "retainpdf-disk-space-boundary";

fn upload_request() -> Request<Body> {
    let mut body = Vec::new();
    body.extend_from_slice(
        format!(
            "--{BOUNDARY}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"disk.pdf\"\r\nContent-Type: application/pdf\r\n\r\n"
        )
        .as_bytes(),
    );
    body.extend_from_slice(&minimal_pdf_bytes(595, 842));
    body.extend_from_slice(format!("\r\n--{BOUNDARY}--\r\n").as_bytes());
    Request::builder()
        .method("POST")
        .uri("/api/v1/uploads")
        .header("X-API-Key", "test-key")
        .header(header::CONTENT_TYPE, format!("multipart/form-data; boundary={BOUNDARY}"))
        .body(Body::from(body))
        .expect("upload request")
}

/// 换一份下限为 `min_free` 的配置和上传服务。
fn with_disk_floor(mut state: crate::AppState, min_free: u64) -> crate::AppState {
    let mut config = (*state.config).clone();
    config.min_free_disk_bytes = min_free;
    state.uploads = Arc::new(crate::services::ingest::UploadService::new(
        state.db.clone(),
        crate::services::ingest::UploadServiceConfig {
            uploads_dir: config.uploads_dir.clone(),
            python_bin: config.python_bin.clone(),
            upload_max_bytes: config.upload_max_bytes,
            upload_max_pages: config.upload_max_pages,
            min_free_disk_bytes: min_free,
            processing: config.upload_processing.clone(),
        },
    ));
    state.config = Arc::new(config);
    state
}

fn assert_insufficient_storage(status: StatusCode, payload: &serde_json::Value) {
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE, "{payload}");
    assert_eq!(payload["code"], 50300);
    assert_eq!(payload["error"]["code"], "SERVICE_UNAVAILABLE");
    assert_eq!(payload["error"]["details"]["reason"], "insufficient_storage");
    assert!(
        payload["message"].as_str().unwrap_or_default().starts_with("not enough free disk space"),
        "{payload}"
    );
}

#[tokio::test]
async fn upload_is_refused_and_leaves_nothing_behind_when_the_disk_is_low() {
    let state = with_disk_floor(test_state("disk-space-upload"), u64::MAX);
    let uploads_dir = state.config.uploads_dir.clone();
    let response = build_app(state).oneshot(upload_request()).await.expect("upload response");
    let status = response.status();
    let payload = read_json(response).await;
    assert_insufficient_storage(status, &payload);
    let leftovers = std::fs::read_dir(&uploads_dir).map(|entries| entries.count()).unwrap_or(0);
    assert_eq!(leftovers, 0, "上传目录里不能留下东西");
}

#[tokio::test]
async fn job_creation_is_refused_before_any_row_is_written_when_the_disk_is_low() {
    // 先在不查空间时传一份 PDF，再把下限调到一定不够去建任务。
    let state = test_state("disk-space-create-job");
    let response = build_app(state.clone()).oneshot(upload_request()).await.expect("upload response");
    assert_eq!(response.status(), StatusCode::OK);
    let upload_id = read_json(response).await["data"]["upload_id"].as_str().expect("upload id").to_string();

    let state = with_disk_floor(state, u64::MAX);
    let response = build_app(state.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/jobs")
                .header("X-API-Key", "test-key")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "workflow": "ocr",
                        "source": { "upload_id": upload_id },
                        "ocr": { "provider": "local" }
                    })
                    .to_string(),
                ))
                .expect("create request"),
        )
        .await
        .expect("create response");
    let status = response.status();
    let payload = read_json(response).await;
    assert_insufficient_storage(status, &payload);
    assert_eq!(state.db.count_jobs_with_status(&JobStatusKind::Queued).unwrap(), 0);
    assert_eq!(state.db.count_jobs_with_status(&JobStatusKind::Running).unwrap(), 0);
}

#[tokio::test]
async fn health_reports_the_disk_and_readiness_ignores_it() {
    let state = with_disk_floor(test_state("disk-space-health"), u64::MAX);
    let app = build_app(state);
    let health = app
        .clone()
        .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(health.status(), StatusCode::OK);
    let disk = read_json(health).await["data"]["disk"].clone();
    assert_eq!(disk["min_free_bytes"], u64::MAX);
    if cfg!(unix) {
        assert!(disk["free_bytes"].is_u64(), "{disk}");
        assert_eq!(disk["low"], true, "{disk}");
    }
    // 磁盘满了更要能打开页面删任务腾空间：/ready 不因为它变成 503。
    let ready = app.oneshot(Request::builder().uri("/ready").body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(ready.status(), StatusCode::OK);

    let state = with_disk_floor(test_state("disk-space-health-off"), 0);
    let health = build_app(state)
        .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    let disk = read_json(health).await["data"]["disk"].clone();
    assert_eq!(disk["min_free_bytes"], 0);
    assert_eq!(disk["low"], false, "下限 0 是不查");
}
