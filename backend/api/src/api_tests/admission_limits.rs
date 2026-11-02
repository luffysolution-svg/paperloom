use super::jobs_common::{read_json, test_state};
use crate::app::{build_app, build_state};
use crate::models::domain::JobSnapshot;
use crate::models::request::CreateJobInput;
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use std::sync::Arc;
use tower::ServiceExt;

#[tokio::test]
async fn disk_admission_reports_actual_space_but_keeps_readiness_available() {
    let initial = test_state("disk-admission");
    let mut config = (*initial.config).clone();
    config.min_free_disk_bytes = u64::MAX;
    let state = build_state(Arc::new(config)).unwrap();
    let root = state.config.project_root.clone();
    let app = build_app(state.clone());
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let health = read_json(response).await;
    assert_eq!(health["data"]["disk"]["low"], true);
    assert!(health["data"]["disk"]["free_bytes"].is_u64());
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/ready")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    drop(response);
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/jobs")
                .header("X-API-Key", "test-key")
                .header("Content-Type", "application/json")
                .body(Body::from("{\"workflow\":\"book\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(
        read_json(response).await["error"]["details"]["reason"],
        "insufficient_storage"
    );
    let boundary = "paperloom-disk-test";
    let mut body = format!("--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"input.pdf\"\r\n\r\n").into_bytes();
    body.extend(crate::test_support::pdf::build_test_pdf_bytes());
    body.extend(format!("\r\n--{boundary}--\r\n").as_bytes());
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/uploads")
                .header("X-API-Key", "test-key")
                .header(
                    "Content-Type",
                    format!("multipart/form-data; boundary={boundary}"),
                )
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(
        read_json(response).await["error"]["details"]["reason"],
        "insufficient_storage"
    );
    assert_eq!(
        std::fs::read_dir(&state.config.uploads_dir)
            .unwrap()
            .count(),
        0
    );
    assert_eq!(
        std::fs::read_dir(&state.config.output_root)
            .unwrap()
            .count(),
        0
    );
    drop(app);
    drop(state);
    drop(initial);
    std::fs::remove_dir_all(root).unwrap();
}

#[tokio::test]
async fn queue_admission_rejects_before_publishing_a_new_job() {
    let mut state = test_state("queue-admission");
    let mut config = (*state.config).clone();
    config.job_runner.max_queued_jobs = 1;
    state.config = Arc::new(config);
    let existing = JobSnapshot::new(
        "waiting".into(),
        CreateJobInput::default(),
        vec!["not-started".into()],
    );
    state.db.save_job(&existing).unwrap();
    let response = build_app(state.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/jobs")
                .header("X-API-Key", "test-key")
                .header("Content-Type", "application/json")
                .body(Body::from("{\"workflow\":\"book\"}"))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(
        read_json(response).await["error"]["details"]["reason"],
        "queue_full"
    );
    assert_eq!(state.db.list_jobs(10, 0, None, None).unwrap().len(), 1);
    assert_eq!(
        std::fs::read_dir(&state.config.output_root)
            .unwrap()
            .count(),
        0
    );
    let root = state.config.project_root.clone();
    drop(state);
    std::fs::remove_dir_all(root).unwrap();
}
