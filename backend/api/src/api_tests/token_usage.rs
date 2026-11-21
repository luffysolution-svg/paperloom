//! /api/v1/usage、/api/v1/jobs/:id/usage、/api/v1/documents/:id/usage 经真实路由。

use axum::body::Body;
use axum::http::{Request, StatusCode};
use tower::util::ServiceExt;

use crate::api_tests::jobs_common::{read_json, seed_legacy_layout_job, seed_virtual_job, test_state};
use crate::app::build_app;
use crate::models::domain::{now_iso, UploadRecord};
use crate::models::{CreateJobInput, JobSnapshot};

async fn get(state: &crate::AppState, uri: &str) -> axum::response::Response {
    build_app(state.clone())
        .oneshot(
            Request::builder()
                .uri(uri)
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response")
}

#[tokio::test]
async fn usage_routes_summarize_the_job_ledgers() {
    let state = test_state("token-usage-routes");
    let job = JobSnapshot::new("job-usage".to_string(), CreateJobInput::default(), vec![]);
    state.db.save_job(&job).expect("save job");
    let ledger = crate::services::jobs::job_usage_ledger_path(&state.config.output_root, "job-usage");
    std::fs::create_dir_all(ledger.parent().unwrap()).unwrap();
    std::fs::write(
        &ledger,
        concat!(
            r#"{"ts":"2026-10-10T00:00:00Z","stage":"translation","model":"m","host":"h","input":120000,"output":30000,"cache_hit":100000,"reasoning":5000}"#,
            "\n",
            r#"{"ts":"2026-10-10T00:01:00Z","stage":"refine_review","model":"m","host":"h","input":1000,"output":10,"cache_hit":null}"#,
            "\n",
        ),
    )
    .unwrap();

    let response = get(&state, "/api/v1/jobs/job-usage/reports/usage").await;
    assert_eq!(response.status(), StatusCode::OK);
    let data = read_json(response).await["data"].clone();
    assert_eq!(data["scope"], "job");
    assert_eq!(data["totals"]["total_tokens"], 151010);
    assert_eq!(data["totals"]["cache_hit_tokens"], 100000);
    assert_eq!(data["totals"]["cache_reported_input_tokens"], 120000);
    assert_eq!(data["by_stage"][0]["label"], "翻译");

    let all = read_json(get(&state, "/api/v1/usage").await).await["data"].clone();
    assert_eq!((all["scope"].as_str(), all["jobs_counted"].as_u64()), (Some("all"), Some(1)));
    assert_eq!(all["totals"]["total_tokens"], 151010);

    // 有书没任务：200 空汇总。书不存在是 404（见 library_lookup_errors）。
    let upload = UploadRecord {
        upload_id: "up-without-jobs".to_string(),
        filename: "book.pdf".to_string(),
        stored_path: "uploads/up-without-jobs/book.pdf".to_string(),
        bytes: 1,
        page_count: 1,
        uploaded_at: now_iso(),
        developer_mode: false,
        content_hash: "doc-without-jobs".to_string(),
    };
    state.db.save_upload(&upload).expect("save upload");
    state.db.upsert_document_from_upload(&upload).expect("seed document");
    let document = read_json(get(&state, "/api/v1/documents/doc-without-jobs/usage").await).await["data"].clone();
    assert_eq!((document["scope"].as_str(), document["totals"]["requests"].as_u64()), (Some("document"), Some(0)));
    assert_eq!(get(&state, "/api/v1/documents/doc-missing/usage").await.status(), StatusCode::NOT_FOUND);

    assert_eq!(get(&state, "/api/v1/jobs/job-missing/reports/usage").await.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn job_usage_follows_the_same_loading_rules_as_the_other_job_reads() {
    let state = test_state("token-usage-loading");

    // 合并阅读的虚拟任务认；合并结果自己没有用量账本，给空汇总。
    let (virtual_id, _root) = seed_virtual_job(&state);
    let response = get(&state, &format!("/api/v1/jobs/{virtual_id}/reports/usage")).await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(read_json(response).await["data"]["totals"]["requests"], 0);

    // 旧目录格式的任务：409。
    seed_legacy_layout_job(&state, "job-legacy");
    assert_eq!(get(&state, "/api/v1/jobs/job-legacy/reports/usage").await.status(), StatusCode::CONFLICT);

    // 有意保留：库里没有记录、任务目录还在，照样给用量（账本在目录里，删掉记录不丢）。
    let ledger = crate::services::jobs::job_usage_ledger_path(&state.config.output_root, "job-dir-only");
    std::fs::create_dir_all(ledger.parent().unwrap()).unwrap();
    std::fs::write(
        &ledger,
        concat!(r#"{"ts":"2026-10-10T00:00:00Z","stage":"translation","model":"m","host":"h","input":10,"output":5}"#, "\n"),
    )
    .unwrap();
    let response = get(&state, "/api/v1/jobs/job-dir-only/reports/usage").await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(read_json(response).await["data"]["totals"]["total_tokens"], 15);

    // 库里没有、目录也没有：404。
    assert_eq!(get(&state, "/api/v1/jobs/job-nowhere/reports/usage").await.status(), StatusCode::NOT_FOUND);
}
