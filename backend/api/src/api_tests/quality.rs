//! /api/v1/jobs/:id/reports/quality 与 /quality-items 经真实路由。

use axum::body::Body;
use axum::http::{Request, StatusCode};
use tower::util::ServiceExt;

use crate::api_tests::jobs_common::{read_json, seed_legacy_layout_job, seed_virtual_job, test_state};
use crate::app::build_app;
use crate::models::{CreateJobInput, JobSnapshot};
use crate::storage_paths::{attach_job_paths, build_job_paths};

async fn get(state: &crate::AppState, uri: &str) -> axum::response::Response {
    build_app(state.clone())
        .oneshot(Request::builder().uri(uri).header("X-API-Key", "test-key").body(Body::empty()).unwrap())
        .await
        .unwrap()
}

#[tokio::test]
async fn quality_routes_summarize_reports_and_list_blocks() {
    let state = test_state("quality-routes");
    let mut job = JobSnapshot::new("job-quality".to_string(), CreateJobInput::default(), vec![]);
    let paths = build_job_paths(&state.config.output_root, "job-quality").unwrap();
    attach_job_paths(&mut job, &paths);
    state.db.save_job(&job).unwrap();
    std::fs::write(
        paths.artifacts_dir.join("fit_report.v1.json"),
        serde_json::json!({
            "summary": {"blocks": 2, "overflow_blocks": 1, "min_scale": 0.6},
            "blocks": [
                {"item_id": "p003-b007", "page": 3, "measured": true, "scale": 0.95, "overflow": true},
                {"item_id": "p004-b001", "page": 4, "measured": true, "scale": 0.6, "overflow": false},
            ]
        })
        .to_string(),
    )
    .unwrap();

    let summary = read_json(get(&state, "/api/v1/jobs/job-quality/reports/quality").await).await["data"].clone();
    assert_eq!(summary["layout"]["overflow_pages"], serde_json::json!([3]));
    assert!(summary["qa"].is_null() && summary["refine"].is_null());

    let items = read_json(get(&state, "/api/v1/jobs/job-quality/reports/quality/items?kind=layout&page=4").await).await["data"].clone();
    assert_eq!(items["total"], 1);
    assert_eq!((items["limit"].as_u64(), items["has_more"].as_bool()), (Some(200), Some(false)));
    let first_page = read_json(get(&state, "/api/v1/jobs/job-quality/reports/quality/items?kind=layout&limit=1").await).await["data"].clone();
    assert_eq!((first_page["total"].as_u64(), first_page["limit"].as_u64(), first_page["has_more"].as_bool()), (Some(2), Some(1), Some(true)));
    let last_page = read_json(get(&state, "/api/v1/jobs/job-quality/reports/quality/items?kind=layout&limit=1&offset=1").await).await["data"].clone();
    assert_eq!(last_page["has_more"], false);
    assert_eq!((items["items"][0]["item_id"].as_str(), items["items"][0]["reason"].as_str()), (Some("p004-b0001"), Some("small_scale")));

    for bad in ["kind=everything", "kind=qa&limit=0", "kind=qa&limit=5000", "kind=qa&unknown=1"] {
        let response = get(&state, &format!("/api/v1/jobs/job-quality/reports/quality/items?{bad}")).await;
        assert!(response.status().is_client_error(), "{bad}");
    }
    assert_eq!(get(&state, "/api/v1/jobs/job-missing/reports/quality").await.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn quality_reads_a_merged_reading_job_and_rejects_legacy_layouts() {
    let state = test_state("quality-virtual");
    let (job_id, _root) = seed_virtual_job(&state);

    // 合并目录里没有报告：摘要的各部分是 null、清单是空的，不是错误。
    let response = get(&state, &format!("/api/v1/jobs/{job_id}/reports/quality")).await;
    assert_eq!(response.status(), StatusCode::OK);
    let summary = read_json(response).await["data"].clone();
    assert!(summary["qa"].is_null() && summary["refine"].is_null(), "{summary}");
    let items = get(&state, &format!("/api/v1/jobs/{job_id}/reports/quality/items?kind=layout")).await;
    assert_eq!(items.status(), StatusCode::OK);
    assert_eq!(read_json(items).await["data"]["total"], 0);

    seed_legacy_layout_job(&state, "job-legacy");
    assert_eq!(get(&state, "/api/v1/jobs/job-legacy/reports/quality").await.status(), StatusCode::CONFLICT);
    assert_eq!(get(&state, "/api/v1/jobs/job-legacy/reports/quality/items?kind=layout").await.status(), StatusCode::CONFLICT);
}
