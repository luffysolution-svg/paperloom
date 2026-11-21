//! 按页额度接在建任务上：预扣、余额不够拒绝、失败退回、谁不计费、渲染补扣。

use crate::error::AppError;
use crate::models::domain::{now_iso, JobStatusKind, UploadRecord, WorkflowKind};
use crate::services::jobs::relaunch_in_place;
use crate::services::jobs::JobSubmitDeps;
use crate::test_support::pdf::build_test_pdf_bytes;
use crate::AppState;

use super::{base_translation_input, submit_context, submit_input, test_state};

fn quota_context(state: &AppState) -> JobSubmitDeps<'_> {
    let mut deps = submit_context(state);
    deps.launcher = deps.launcher.with_page_quota(true);
    deps
}

fn seed_user(state: &AppState, user_id: &str, role: &str) {
    state
        .db
        .create_user(user_id, user_id, "hash", role, false, &now_iso())
        .expect("create user");
}

/// 一份 `page_count` 页、记在 `owner` 名下的上传。
fn seed_owned_upload(state: &AppState, upload_id: &str, owner: &str, page_count: u32) -> String {
    let upload_dir = state.config.uploads_dir.join(upload_id);
    std::fs::create_dir_all(&upload_dir).expect("create upload dir");
    let upload_path = upload_dir.join("input.pdf");
    std::fs::write(&upload_path, build_test_pdf_bytes()).expect("write upload pdf");
    let upload = UploadRecord {
        upload_id: upload_id.to_string(),
        filename: "input.pdf".to_string(),
        stored_path: upload_path.to_string_lossy().to_string(),
        bytes: std::fs::metadata(&upload_path).expect("metadata").len(),
        page_count,
        uploaded_at: now_iso(),
        developer_mode: false,
        content_hash: format!("hash-{upload_id}"),
    };
    state
        .db
        .save_upload_with_document_for(&upload, owner)
        .expect("save upload");
    upload_id.to_string()
}

fn book_input(upload_id: &str) -> crate::models::request::CreateJobInput {
    let mut input = base_translation_input(WorkflowKind::Book);
    input.source.upload_id = upload_id.to_string();
    input
}

fn set_status(state: &AppState, job_id: &str, status: JobStatusKind) {
    let mut job = state.db.get_job(job_id).expect("load job");
    job.status = status;
    state.db.save_job(&job).expect("save job");
}

#[test]
fn submit_reserves_pages_and_failure_refunds_them() {
    let state = test_state("quota-reserve");
    seed_user(&state, "u_alice", "user");
    let upload = seed_owned_upload(&state, "up-alice", "u_alice", 3);
    state
        .db
        .grant_pages("u_alice", 5, "内测", "u_root", &now_iso())
        .unwrap();

    let job =
        submit_input(&quota_context(&state), &book_input(&upload)).expect("first job");
    let charge = state.db.page_charge(&job.job_id).unwrap().expect("charged");
    assert_eq!((charge.pages, charge.status.as_str()), (3, "reserved"));
    assert_eq!(state.db.page_balance("u_alice").unwrap(), 2);

    let error = submit_input(&quota_context(&state), &book_input(&upload))
        .expect_err("only 2 pages left");
    match error {
        AppError::Account {
            status,
            code,
            details,
            ..
        } => {
            assert_eq!((status.as_u16(), code), (402, "PAGE_QUOTA_EXCEEDED"));
            assert_eq!(
                (
                    details["required_pages"].as_i64(),
                    details["balance"].as_i64()
                ),
                (Some(3), Some(2))
            );
        }
        other => panic!("unexpected error: {other:?}"),
    }
    assert_eq!(
        state.db.job_ids_for_owner("u_alice").unwrap(),
        vec![job.job_id.clone()],
        "被拒的不留任务行"
    );

    set_status(&state, &job.job_id, JobStatusKind::Failed);
    assert_eq!(state.db.page_balance("u_alice").unwrap(), 5, "失败全额退");
}

/// 余额不够时回给客户端的整个信封：契约 library-documents.v1 的 translateDocument、ocrDocument 在 note 里
/// 写了它，`error.details` 是 `PageQuotaExceededErrorDetails`。顶层 `code` 是字符串，不是 40200 这种数字。
#[tokio::test]
async fn quota_rejection_envelope_matches_the_library_documents_contract() {
    use axum::response::IntoResponse;

    use crate::api_tests::job_view_contract::{assert_definition, assert_exact_object_keys, contract};
    use crate::api_tests::jobs_common::read_json;

    let state = test_state("quota-envelope");
    seed_user(&state, "u_alice", "user");
    let upload = seed_owned_upload(&state, "up-alice", "u_alice", 3);
    state.db.grant_pages("u_alice", 2, "", "u_root", &now_iso()).unwrap();

    let error = submit_input(&quota_context(&state), &book_input(&upload)).expect_err("3 pages > 2 left");
    let response = error.into_response();
    assert_eq!(response.status().as_u16(), 402);
    let body = read_json(response).await;
    let keys: std::collections::BTreeSet<&str> = body.as_object().unwrap().keys().map(String::as_str).collect();
    assert_eq!(keys, ["code", "error", "message"].into(), "{body}");
    assert_eq!(body["code"], "PAGE_QUOTA_EXCEEDED");
    assert!(body["message"].as_str().is_some_and(|message| message.contains("页数额度不够")), "{body}");
    let error_keys: std::collections::BTreeSet<&str> =
        body["error"].as_object().unwrap().keys().map(String::as_str).collect();
    assert_eq!(error_keys, ["code", "details", "http_status"].into(), "{body}");
    assert_eq!(body["error"]["code"], "PAGE_QUOTA_EXCEEDED");
    assert_eq!(body["error"]["http_status"], 402);
    let contract = contract("library-documents.v1.schema.json");
    let details = &body["error"]["details"];
    assert_definition(details, &contract, "PageQuotaExceededErrorDetails", "error.details");
    assert_exact_object_keys(details, &contract, "PageQuotaExceededErrorDetails", "error.details");
    assert_eq!((details["required_pages"].as_i64(), details["balance"].as_i64()), (Some(3), Some(2)));
}

#[test]
fn ocr_only_jobs_charge_the_selected_pages() {
    let state = test_state("quota-ocr");
    seed_user(&state, "u_alice", "user");
    let upload = seed_owned_upload(&state, "up-alice", "u_alice", 10);
    state
        .db
        .grant_pages("u_alice", 10, "", "u_root", &now_iso())
        .unwrap();
    let mut input = book_input(&upload);
    input.workflow = WorkflowKind::Ocr;
    input.ocr.page_ranges = "2-4".to_string();
    let job = submit_input(&quota_context(&state), &input).expect("ocr job");
    assert_eq!(state.db.page_charge(&job.job_id).unwrap().unwrap().pages, 3);
    assert_eq!(state.db.page_balance("u_alice").unwrap(), 7);
}

#[test]
fn admins_local_uploads_and_single_mode_are_not_charged() {
    let state = test_state("quota-exempt");
    seed_user(&state, "u_root", "admin");
    seed_user(&state, "u_alice", "user");
    let admin_upload = seed_owned_upload(&state, "up-root", "u_root", 3);
    let local_upload = seed_owned_upload(&state, "up-local", "local", 3);
    let alice_upload = seed_owned_upload(&state, "up-alice", "u_alice", 3);

    for upload in [&admin_upload, &local_upload] {
        let job = submit_input(&quota_context(&state), &book_input(upload))
            .expect("exempt job");
        assert!(
            state.db.page_charge(&job.job_id).unwrap().is_none(),
            "{upload}"
        );
    }
    // 单机模式（没开额度）：账号余额是 0 也照样能建。
    let job = submit_input(&submit_context(&state), &book_input(&alice_upload))
        .expect("single mode");
    assert!(state.db.page_charge(&job.job_id).unwrap().is_none());
}

#[test]
fn rerendering_a_refunded_job_charges_it_again_but_a_paid_one_stays_free() {
    let state = test_state("quota-render");
    seed_user(&state, "u_alice", "user");
    let upload = seed_owned_upload(&state, "up-alice", "u_alice", 3);
    state
        .db
        .grant_pages("u_alice", 6, "", "u_root", &now_iso())
        .unwrap();
    let deps = quota_context(&state);

    let failed = submit_input(&deps, &book_input(&upload)).expect("job");
    set_status(&state, &failed.job_id, JobStatusKind::Failed);
    let paid = submit_input(&deps, &book_input(&upload)).expect("job");
    set_status(&state, &paid.job_id, JobStatusKind::Succeeded);
    assert_eq!(state.db.page_balance("u_alice").unwrap(), 3);

    let rerender = |job_id: &str| {
        let mut job = state.db.get_job(job_id).expect("load job");
        let read_as = crate::services::jobs::RunFence::of(&job);
        job.workflow = WorkflowKind::Render;
        job.request_payload.workflow = WorkflowKind::Render;
        job.request_payload.source.upload_id.clear();
        job.request_payload.source.artifact_job_id = job_id.to_string();
        job.status = JobStatusKind::Queued;
        relaunch_in_place(&deps.launcher, job, &read_as).expect("rerender")
    };
    rerender(&paid.job_id);
    assert_eq!(
        state.db.page_balance("u_alice").unwrap(),
        3,
        "付过钱的重新渲染免费"
    );
    rerender(&failed.job_id);
    assert_eq!(
        state
            .db
            .page_charge(&failed.job_id)
            .unwrap()
            .unwrap()
            .status,
        "reserved"
    );
    assert_eq!(
        state.db.page_balance("u_alice").unwrap(),
        0,
        "退过款的接着做完要补扣"
    );
}
