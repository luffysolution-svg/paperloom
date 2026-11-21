//! 排队任务的上限（`RUST_API_MAX_QUEUED_JOBS`）：排队的已经满了，建任务 429 + `queue_full`，什么都不留下。

use std::sync::Arc;

use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use tower::util::ServiceExt;

use super::jobs_common::{minimal_pdf_bytes, read_json, test_state};
use crate::app::build_app;
use crate::models::domain::JobStatusKind;
use crate::models::{CreateJobInput, JobSnapshot};

const BOUNDARY: &str = "retainpdf-queue-limit-boundary";

fn upload_request() -> Request<Body> {
    let mut body = format!(
        "--{BOUNDARY}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"queue.pdf\"\r\nContent-Type: application/pdf\r\n\r\n"
    )
    .into_bytes();
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

fn create_request(upload_id: &str) -> Request<Body> {
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
        .expect("create request")
}

fn save_job(state: &crate::AppState, job_id: &str, status: JobStatusKind) {
    let mut job = JobSnapshot::new(job_id.into(), CreateJobInput::default(), vec!["python".into()]);
    job.status = status;
    job.sync_runtime_state();
    state.db.save_job(&job).expect("save job");
}

#[tokio::test]
async fn job_creation_is_refused_when_the_queue_is_full_and_running_jobs_do_not_count() {
    let mut state = test_state("queue-limit");
    let response = build_app(state.clone()).oneshot(upload_request()).await.expect("upload response");
    assert_eq!(response.status(), StatusCode::OK);
    let upload_id = read_json(response).await["data"]["upload_id"].as_str().expect("upload id").to_string();

    let mut config = (*state.config).clone();
    config.job_runner.max_queued_jobs = 2;
    state.config = Arc::new(config);
    save_job(&state, "job-queued-1", JobStatusKind::Queued);
    save_job(&state, "job-queued-2", JobStatusKind::Queued);
    save_job(&state, "job-running-1", JobStatusKind::Running);
    save_job(&state, "job-running-2", JobStatusKind::Running);

    let response = build_app(state.clone()).oneshot(create_request(&upload_id)).await.expect("create response");

    let status = response.status();
    let payload = read_json(response).await;
    assert_eq!(status, StatusCode::TOO_MANY_REQUESTS, "{payload}");
    assert_eq!(payload["code"], 42900);
    assert_eq!(payload["error"]["code"], "TOO_MANY_REQUESTS");
    assert_eq!(payload["error"]["details"]["reason"], "queue_full");
    assert!(payload["message"].as_str().unwrap_or_default().contains("limit 2"), "{payload}");
    assert_eq!(state.db.count_jobs_with_status(&JobStatusKind::Queued).unwrap(), 2, "没有多出排队的任务");
    assert_eq!(state.db.list_jobs(10, 0, None, None).unwrap().len(), 4, "没有落新任务行");

    // 上限 3：排队的 2 个加在跑的 2 个超过 3，但在跑的不算，照样建得出来。
    let mut config = (*state.config).clone();
    config.job_runner.max_queued_jobs = 3;
    state.config = Arc::new(config);
    let response = build_app(state.clone()).oneshot(create_request(&upload_id)).await.expect("create response");
    let status = response.status();
    let payload = read_json(response).await;
    assert_eq!(status, StatusCode::OK, "{payload}");
}
