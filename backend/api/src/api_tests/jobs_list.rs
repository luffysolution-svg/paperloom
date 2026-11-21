use std::fs;
use std::path::PathBuf;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use tower::util::ServiceExt;

use crate::app::build_app;
use crate::models::{CreateJobInput, JobSnapshot};

use super::jobs_common::{read_json, test_state};

#[tokio::test]
async fn jobs_list_route_prefers_live_pipeline_stage_snapshot() {
    let state = test_state("list-live-stage");
    let mut job = JobSnapshot::new(
        "job-route-list-live-stage".to_string(),
        CreateJobInput::default(),
        vec!["python".to_string()],
    );
    job.stage = Some("queued".to_string());
    let job_root: PathBuf = state.config.data_root.join("jobs").join(&job.job_id);
    fs::create_dir_all(job_root.join("logs")).expect("create logs dir");
    job.artifacts
        .get_or_insert_with(crate::models::JobArtifacts::default)
        .job_root = Some(job_root.to_string_lossy().to_string());
    state.db.save_job(&job).expect("save job");
    fs::write(
        job_root.join("logs").join("pipeline_events.jsonl"),
        concat!(
            r#"{"job_id":"job-route-list-live-stage","seq":1,"ts":"2026-04-24T01:00:00Z","level":"info","stage":"translating","stage_detail":"已完成第 3/8 批翻译","provider":"","provider_stage":"","event_type":"stage_progress","message":"已完成第 3/8 批翻译","progress_current":3,"progress_total":8,"retry_count":0,"elapsed_ms":900,"payload":{}}"#,
            "\n",
            r#"{"job_id":"job-route-list-live-stage","seq":2,"ts":"2026-04-24T01:00:01Z","level":"info","stage":"saving","stage_detail":"最终 PDF 已发布","provider":"","provider_stage":"","event_type":"artifact_published","message":"最终 PDF 已发布","progress_current":null,"progress_total":null,"retry_count":0,"elapsed_ms":1000,"payload":{"artifact_key":"output_pdf"}}"#,
            "\n"
        ),
    )
    .expect("write pipeline events");

    let app = build_app(state.clone());
    let list_response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/jobs")
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("list request"),
        )
        .await
        .expect("list response");
    assert_eq!(list_response.status(), StatusCode::OK);
    let list_json = read_json(list_response).await;
    let items = list_json["data"]["items"].as_array().expect("items array");
    let item = items
        .iter()
        .find(|item| item["job_id"] == "job-route-list-live-stage")
        .expect("job item");
    assert!(item.get("stage").is_none());
    assert!(item.get("progress").is_none());
    assert_eq!(item["stage_snapshot"]["stage"], "translating");
    assert_eq!(item["stage_snapshot"]["display_stage"], "translation");
}

async fn get_json(state: &crate::AppState, uri: &str) -> (StatusCode, serde_json::Value) {
    let response = build_app(state.clone())
        .oneshot(
            Request::builder()
                .uri(uri)
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");
    let status = response.status();
    (status, read_json(response).await)
}

fn save_plain_jobs(state: &crate::AppState, count: usize) {
    for index in 0..count {
        let mut job = JobSnapshot::new(
            format!("job-page-{index:04}"),
            CreateJobInput::default(),
            vec![],
        );
        job.updated_at = format!("2026-01-01T00:{:02}:{:02}Z", index / 60, index % 60);
        state.db.save_job(&job).expect("save job");
    }
}

#[tokio::test]
async fn jobs_list_echoes_limit_offset_and_has_more() {
    let state = test_state("list-paging-echo");
    save_plain_jobs(&state, 3);

    let (status, body) = get_json(&state, "/api/v1/jobs?limit=2&include_live_stage=false").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["data"]["limit"], 2);
    assert_eq!(body["data"]["offset"], 0);
    assert_eq!(body["data"]["has_more"], true);
    assert_eq!(body["data"]["items"].as_array().unwrap().len(), 2);

    let (_, body) = get_json(&state, "/api/v1/jobs?limit=2&offset=2&include_live_stage=false").await;
    assert_eq!(body["data"]["offset"], 2);
    assert_eq!(body["data"]["has_more"], false);
    assert_eq!(body["data"]["items"].as_array().unwrap().len(), 1);

    // 默认 limit 也回显。
    let (_, body) = get_json(&state, "/api/v1/jobs?include_live_stage=false").await;
    assert_eq!(body["data"]["limit"], 20);
    assert_eq!(body["data"]["has_more"], false);
}

#[tokio::test]
async fn jobs_list_limit_out_of_range_is_400() {
    let state = test_state("list-paging-400");
    for uri in [
        "/api/v1/jobs?limit=0",
        "/api/v1/jobs?limit=501",
        "/api/v1/jobs?limit=4000000000",
    ] {
        let (status, body) = get_json(&state, uri).await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{uri}");
        assert!(
            body["message"].as_str().unwrap_or_default().contains("limit must be 1..=500"),
            "{uri}: {body}"
        );
    }
    let (status, _) = get_json(&state, "/api/v1/jobs?limit=500").await;
    assert_eq!(status, StatusCode::OK);
}

#[tokio::test]
async fn jobs_list_q_filters_by_id_and_is_case_insensitive() {
    let state = test_state("list-paging-q");
    save_plain_jobs(&state, 3);
    let (status, body) = get_json(&state, "/api/v1/jobs?q=PAGE-0001&include_live_stage=false").await;
    assert_eq!(status, StatusCode::OK);
    let items = body["data"]["items"].as_array().unwrap();
    assert_eq!(items.len(), 1);
    assert_eq!(items[0]["job_id"], "job-page-0001");
    let (_, body) = get_json(&state, "/api/v1/jobs?job_ids=job-page-0000,job-page-0002&limit=1&include_live_stage=false").await;
    assert_eq!(body["data"]["items"].as_array().unwrap().len(), 1);
    assert_eq!(body["data"]["has_more"], true);
}
