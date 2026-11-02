use axum::body::{to_bytes, Body};
use axum::http::{Request, StatusCode};
use serde_json::json;
use tower::ServiceExt;

use super::jobs_common::{read_json, test_state};
use crate::app::build_app;

#[tokio::test]
async fn backup_routes_require_authentication() {
    let state = test_state("backup-auth");
    let root = state.config.project_root.clone();
    let app = build_app(state);
    for (method, path) in [
        ("GET", "/api/v1/backups"),
        ("POST", "/api/v1/backups"),
        ("POST", "/api/v1/backups/import"),
        ("POST", "/api/v1/backups/restore"),
        ("GET", "/api/v1/backups/download/paperloom-backup-x.zip"),
        ("DELETE", "/api/v1/backups/pending"),
        ("PUT", "/api/v1/backups/webdav/settings"),
        ("POST", "/api/v1/backups/webdav/test"),
        ("GET", "/api/v1/backups/webdav/files"),
        ("POST", "/api/v1/backups/webdav/backup"),
        ("POST", "/api/v1/backups/webdav/restore"),
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(method)
                    .uri(path)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(
            response.status(),
            StatusCode::UNAUTHORIZED,
            "{method} {path}"
        );
    }
    drop(app);
    std::fs::remove_dir_all(root).unwrap();
}

#[tokio::test]
async fn export_download_restore_confirmation_and_maintenance_are_connected() {
    let state = test_state("backup-http");
    let root = state.config.project_root.clone();
    let app = build_app(state);
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/backups")
                .header("X-API-Key", "test-key")
                .header("Content-Type", "application/json")
                .body(Body::from("{\"include_credentials\":false}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let item = read_json(response).await;
    let name = item["data"]["name"].as_str().unwrap();
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/backups/download/{name}"))
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()["cache-control"], "no-store");
    let bytes = to_bytes(response.into_body(), 1024 * 1024).await.unwrap();
    assert!(bytes.starts_with(b"PK"));

    for confirmed in [false, true] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/backups/restore")
                    .header("X-API-Key", "test-key")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        json!({"name":name,"confirm_replace":confirmed}).to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(
            response.status(),
            if confirmed {
                StatusCode::OK
            } else {
                StatusCode::BAD_REQUEST
            }
        );
    }
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/collections")
                .header("X-API-Key", "test-key")
                .header("Content-Type", "application/json")
                .body(Body::from("{\"name\":\"blocked\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/api/v1/backups/pending")
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/backups/import")
                .header("X-API-Key", "test-key")
                .header("Content-Type", "application/zip")
                .header("X-Confirm-Replace", "true")
                .body(Body::from(bytes))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert!(read_json(response).await["data"]["restart_required"]
        .as_bool()
        .unwrap());
    drop(app);
    std::fs::remove_dir_all(root).unwrap();
}
