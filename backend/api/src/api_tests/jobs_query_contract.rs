use std::fs;
use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use serde_json::json;
use tower::util::ServiceExt;

use super::jobs_common::{read_json, test_state};
use crate::app::build_app;
use crate::models::api::ListJobsQuery;
use crate::models::domain::{CreateJobInput, JobArtifacts, JobSnapshot, WorkflowKind};

fn seed_job(state: &crate::AppState, job_id: &str, workflow: WorkflowKind) {
    let job_root = state.config.output_root.join(job_id);
    fs::create_dir_all(&job_root).expect("job directory");
    let mut job = JobSnapshot::new(
        job_id.to_owned(),
        CreateJobInput {
            workflow,
            ..Default::default()
        },
        vec![],
    );
    job.artifacts = Some(JobArtifacts {
        job_root: Some(job_root.to_string_lossy().into_owned()),
        ..Default::default()
    });
    state.db.save_job(&job).expect("save job");
}

#[test]
fn query_dependencies_do_not_capture_execution_resources() {
    let state = test_state("query-dependencies");
    let owners = (
        Arc::strong_count(&state.job_runtime),
        Arc::strong_count(&state.uploads),
        Arc::strong_count(&state.job_slots),
    );
    let deps = crate::routes::common::build_jobs_query_route_deps(&state);
    let query: ListJobsQuery = serde_json::from_value(json!({})).expect("default list query");
    assert!(deps
        .jobs
        .list_jobs_view("http://localhost", &query)
        .expect("list jobs")
        .items
        .is_empty());
    assert_eq!(
        (
            Arc::strong_count(&state.job_runtime),
            Arc::strong_count(&state.uploads),
            Arc::strong_count(&state.job_slots),
        ),
        owners,
        "job queries must not assemble execution or upload capabilities"
    );
}

#[tokio::test]
async fn ocr_list_keeps_its_scope_when_query_requests_another_workflow() {
    let state = test_state("ocr-query-list-scope");
    seed_job(&state, "query-book", WorkflowKind::Book);
    seed_job(&state, "query-ocr", WorkflowKind::Ocr);
    let response = build_app(state)
        .oneshot(
            Request::builder()
                .uri("/api/v1/ocr/jobs?workflow=book&limit=1")
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("list request"),
        )
        .await
        .expect("list response");
    assert_eq!(response.status(), StatusCode::OK);
    let payload = read_json(response).await;
    let items = payload["data"]["items"].as_array().expect("items");
    assert_eq!(items.len(), 1);
    assert_eq!(items[0]["job_id"], "query-ocr");
    assert_eq!(items[0]["workflow"], "ocr");
}

#[tokio::test]
async fn ocr_read_routes_reject_non_ocr_jobs_before_building_views() {
    let state = test_state("ocr-query-scope");
    seed_job(&state, "query-book", WorkflowKind::Book);
    let app = build_app(state);
    for suffix in ["", "/events", "/artifacts", "/artifacts-manifest"] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(format!("/api/v1/ocr/jobs/query-book{suffix}"))
                    .header("X-API-Key", "test-key")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::NOT_FOUND, "{suffix}");
        let payload = read_json(response).await;
        assert_eq!(payload["error"]["code"], "NOT_FOUND");
        assert!(payload.get("data").is_none());
    }
}

#[tokio::test]
async fn ocr_read_routes_accept_ocr_jobs() {
    let state = test_state("ocr-query-views");
    seed_job(&state, "query-ocr", WorkflowKind::Ocr);
    let app = build_app(state);
    for suffix in ["", "/events", "/artifacts", "/artifacts-manifest"] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(format!("/api/v1/ocr/jobs/query-ocr{suffix}"))
                    .header("X-API-Key", "test-key")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK, "{suffix}");
        let payload = read_json(response).await;
        assert!(payload["data"].is_object());
    }
}

#[tokio::test]
async fn ocr_events_keep_limit_and_resume_with_cursor() {
    let state = test_state("ocr-query-event-pagination");
    seed_job(&state, "query-ocr", WorkflowKind::Ocr);
    for message in ["first event", "second event", "third event"] {
        state
            .db
            .append_event(
                "query-ocr",
                "info",
                None,
                None,
                None,
                None,
                "progress",
                None,
                message,
                None,
                None,
                None,
                None,
                None,
            )
            .expect("append event");
    }
    let app = build_app(state);
    let first_response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/ocr/jobs/query-ocr/events?limit=1&start=head")
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("events request"),
        )
        .await
        .expect("events response");
    assert_eq!(first_response.status(), StatusCode::OK);
    let first = read_json(first_response).await;
    assert_eq!(first["data"]["items"][0]["message"], "first event");
    assert_eq!(first["data"]["has_more"], true);
    let cursor = first["data"]["next_cursor"].as_str().expect("cursor");
    let response = app
        .oneshot(
            Request::builder()
                .uri(format!(
                    "/api/v1/ocr/jobs/query-ocr/events?limit=1&cursor={cursor}"
                ))
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("resume events request"),
        )
        .await
        .expect("resume events response");
    assert_eq!(response.status(), StatusCode::OK);
    let payload = read_json(response).await;
    assert_eq!(payload["data"]["limit"], 1);
    assert_eq!(payload["data"]["protocol_version"], 2);
    assert!(payload["data"].get("offset").is_none());
    let items = payload["data"]["items"].as_array().expect("items");
    assert_eq!(items.len(), 1);
    assert_eq!(items[0]["message"], "second event");
}
