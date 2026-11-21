use axum::body::Body;
use axum::http::{Request, StatusCode};
use tower::util::ServiceExt;

use crate::app::build_app;
use crate::api_tests::jobs_common::test_state;
use crate::models::{now_iso, CreateJobInput, JobSnapshot, JobStatusKind, UploadRecord, WorkflowKind};

const DOCUMENT_ID: &str = "doc-sha-cancel";

fn seed_document(state: &crate::AppState) {
    let upload = UploadRecord {
        upload_id: "upload-cancel-doc".to_string(),
        filename: "book.pdf".to_string(),
        stored_path: "uploads/upload-cancel-doc/book.pdf".to_string(),
        bytes: 1,
        page_count: 1,
        uploaded_at: now_iso(),
        developer_mode: false,
        content_hash: DOCUMENT_ID.to_string(),
    };
    state.db.save_upload(&upload).expect("save upload");
    state.db.upsert_document_from_upload(&upload).expect("seed document");
}

fn seed_job(state: &crate::AppState, job_id: &str, workflow: WorkflowKind, status: JobStatusKind) {
    let mut input = CreateJobInput::default();
    input.runtime.job_id = job_id.to_string();
    let mut job = JobSnapshot::new(job_id.to_string(), input, vec!["python".to_string()]);
    job.workflow = workflow;
    job.status = status.clone();
    if status == JobStatusKind::Succeeded {
        job.stage = Some("finished".to_string());
        job.finished_at = Some(now_iso());
    } else {
        job.stage = Some("queued".to_string());
    }
    state.db.save_job(&job).expect("save job");
    state.db.set_job_document_id(job_id, DOCUMENT_ID).expect("link job");
}

async fn cancel(state: &crate::AppState, uri: String) -> serde_json::Value {
    let response = build_app(state.clone())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(uri)
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("cancel request"),
        )
        .await
        .expect("cancel response");
    assert_eq!(response.status(), StatusCode::OK, "取消请求本身必须成功");
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.expect("body");
    serde_json::from_slice(&bytes).expect("json")
}

fn card(state: &crate::AppState) -> Option<String> {
    state.db.get_document(DOCUMENT_ID).expect("document").active_job_id
}

/// 重试 / 重跑 / 继续提交时书卡就指向新任务;紧接着经 API 取消,终态由 `cancel_job` 写,
/// driver 看到 CAS 没更新就退出、不走书卡回退 —— 以前书卡停在被取消的任务上(显示已取消、
/// 阅读入口读原文),要等下次启动回填才纠正。普通取消和 OCR 排队中取消两条出口都要退回。
#[tokio::test]
async fn canceling_a_freshly_submitted_job_hands_the_card_back_to_the_last_success() {
    let state = test_state("cancel-hands-card-back");
    seed_document(&state);
    seed_job(&state, "job-cancel-ok", WorkflowKind::Book, JobStatusKind::Succeeded);

    seed_job(&state, "job-cancel-retry", WorkflowKind::Book, JobStatusKind::Queued);
    state.db.set_document_active_job(DOCUMENT_ID, "job-cancel-retry", None).expect("card");
    cancel(&state, "/api/v1/jobs/job-cancel-retry/actions/cancel".to_string()).await;
    assert_eq!(state.db.get_job("job-cancel-retry").unwrap().status, JobStatusKind::Canceled);
    assert_eq!(card(&state).as_deref(), Some("job-cancel-ok"), "取消后书卡停在了被取消的任务上");

    seed_job(&state, "job-cancel-ocr", WorkflowKind::Ocr, JobStatusKind::Queued);
    state.db.set_document_active_job(DOCUMENT_ID, "job-cancel-ocr", None).expect("card");
    cancel(&state, "/api/v1/jobs/job-cancel-ocr/actions/cancel".to_string()).await;
    assert_eq!(state.db.get_job("job-cancel-ocr").unwrap().status, JobStatusKind::Canceled);
    assert_eq!(card(&state).as_deref(), Some("job-cancel-ok"), "OCR 排队中取消后书卡停在了被取消的任务上");

    // 书卡已经被别的任务接走时,取消不该把它抢回来。
    seed_job(&state, "job-cancel-other", WorkflowKind::Book, JobStatusKind::Queued);
    seed_job(&state, "job-cancel-newer", WorkflowKind::Book, JobStatusKind::Queued);
    state.db.set_document_active_job(DOCUMENT_ID, "job-cancel-newer", None).expect("card");
    cancel(&state, "/api/v1/jobs/job-cancel-other/actions/cancel".to_string()).await;
    assert_eq!(card(&state).as_deref(), Some("job-cancel-newer"));
}

/// 这本书一个成功任务都没有时,书卡留在被取消的任务上(能看到状态、能重试),不清空。
#[tokio::test]
async fn canceling_without_any_success_leaves_the_card_alone() {
    let state = test_state("cancel-no-success");
    seed_document(&state);
    seed_job(&state, "job-cancel-first", WorkflowKind::Book, JobStatusKind::Queued);
    state.db.set_document_active_job(DOCUMENT_ID, "job-cancel-first", None).expect("card");

    cancel(&state, "/api/v1/jobs/job-cancel-first/actions/cancel".to_string()).await;

    assert_eq!(state.db.get_job("job-cancel-first").unwrap().status, JobStatusKind::Canceled);
    assert_eq!(card(&state).as_deref(), Some("job-cancel-first"));
}

/// 取消的返回报库里的真实状态。OCR 任务过了排队阶段时，取消只杀进程、终态由 runner 稍后落，
/// 这一刻库里还是 running —— 以前返回写死 canceled，和随后读到的任务对不上。
#[tokio::test]
async fn cancel_response_reports_the_stored_status() {
    let state = test_state("cancel-real-status");
    seed_document(&state);

    seed_job(&state, "job-cancel-book", WorkflowKind::Book, JobStatusKind::Queued);
    let body = cancel(&state, "/api/v1/jobs/job-cancel-book/actions/cancel".to_string()).await;
    assert_eq!(body["data"]["status"], "canceled");

    seed_job(&state, "job-cancel-ocr-running", WorkflowKind::Ocr, JobStatusKind::Running);
    let mut job = state.db.get_job("job-cancel-ocr-running").unwrap();
    job.stage = Some("ocr".to_string());
    state.db.save_job(&job).expect("save running ocr job");
    let body = cancel(&state, "/api/v1/jobs/job-cancel-ocr-running/actions/cancel".to_string()).await;
    let stored = state.db.get_job("job-cancel-ocr-running").unwrap().status.clone();
    assert_eq!(stored, JobStatusKind::Running, "OCR 任务过了排队阶段，终态留给 runner");
    assert_eq!(body["data"]["status"], "running", "返回要和库里一致");
}
