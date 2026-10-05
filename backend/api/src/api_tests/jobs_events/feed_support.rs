use std::fs;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use rusqlite::{params, Connection};
use serde_json::Value;
use tower::util::ServiceExt;

use crate::api_tests::jobs_common::read_json;
use crate::models::{CreateJobInput, JobArtifacts, JobSnapshot, WorkflowKind};
use crate::AppState;

pub(super) fn seed_job(state: &AppState, job_id: &str, workflow: WorkflowKind) {
    let root = state.config.output_root.join(job_id);
    fs::create_dir_all(root.join("logs")).expect("create logs");
    let mut job = JobSnapshot::new(
        job_id.to_owned(),
        CreateJobInput {
            workflow,
            ..Default::default()
        },
        vec![],
    );
    job.artifacts = Some(JobArtifacts {
        job_root: Some(root.to_string_lossy().into_owned()),
        ..Default::default()
    });
    state.db.save_job(&job).expect("save fixture job");
}

/// Use one transaction so the large-history regression measures event reads,
/// not ten thousand independent test setup connections and commits.
pub(super) fn append_events(state: &AppState, job_id: &str, first: i64, last: i64) {
    let mut conn = Connection::open(&state.config.jobs_db_path).expect("open fixture database");
    let tx = conn.transaction().expect("fixture transaction");
    {
        let mut insert = tx.prepare(
            "INSERT INTO events (job_id, seq, ts, level, event, message) VALUES (?1, ?2, ?3, 'info', 'progress', ?4)",
        ).expect("prepare event fixture");
        for seq in first..=last {
            insert
                .execute(params![
                    job_id,
                    seq,
                    "2026-09-14T00:00:00Z",
                    format!("event-{seq}")
                ])
                .expect("insert fixture event");
        }
    }
    tx.commit().expect("commit fixture events");
}

pub(super) async fn response(app: &Router, uri: &str) -> (StatusCode, Value) {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(uri)
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("events request"),
        )
        .await
        .expect("events response");
    let status = response.status();
    (status, read_json(response).await)
}

pub(super) async fn page(app: &Router, job_id: &str, query: &str) -> Value {
    let (status, payload) = response(app, &format!("/api/v1/jobs/{job_id}/events?{query}")).await;
    assert_eq!(status, StatusCode::OK, "{payload}");
    assert_eq!(payload["data"]["protocol_version"], 2);
    assert!(!cursor(&payload["data"]).is_empty());
    assert!(payload["data"].get("offset").is_none());
    payload["data"].clone()
}

pub(super) fn cursor(page: &Value) -> &str {
    page["next_cursor"].as_str().expect("next cursor")
}

pub(super) fn items(page: &Value) -> &[Value] {
    page["items"].as_array().expect("event items")
}

pub(super) fn pipeline_line(job_id: &str, seq: i64, ts: &str, message: &str) -> String {
    serde_json::json!({
        "job_id": job_id, "seq": seq, "ts": ts, "level": "info",
        "stage": "translating", "event_type": "stage_progress", "message": message,
        "progress_current": seq, "progress_total": 100,
    })
    .to_string()
        + "\n"
}
