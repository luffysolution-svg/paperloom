//! 书的元数据建议和书上的建任务入口（`/documents/:id/metadata-suggestions`、`/translate`、`/ocr`）：
//! 自动命名的判断、apply 的返回、错误形状、请求写错先 400。

use std::fs;

use axum::body::{to_bytes, Body};
use axum::http::{Request, StatusCode};
use serde_json::{json, Value};
use tower::util::ServiceExt;

use super::jobs_common::{minimal_pdf_bytes, test_state};
use crate::app::build_app;
use crate::db::documents::sha256_hex;
use crate::models::domain::{
    now_iso, CreateJobInput, JobSnapshot, JobStatusKind, UploadRecord, WorkflowKind,
};

/// 存一份上传（同一内容就是同一本书），返回书号。
fn upload_as(state: &crate::AppState, content: &[u8], upload_id: &str, filename: &str) -> String {
    let hash = sha256_hex(content);
    let absolute = state.config.data_root.join(format!("uploads/{upload_id}/{filename}"));
    fs::create_dir_all(absolute.parent().unwrap()).unwrap();
    fs::write(&absolute, minimal_pdf_bytes(200, 280)).unwrap();
    let upload = UploadRecord {
        upload_id: upload_id.to_string(),
        filename: filename.to_string(),
        stored_path: absolute.to_string_lossy().to_string(),
        bytes: 10,
        page_count: 3,
        uploaded_at: now_iso(),
        developer_mode: false,
        content_hash: hash.clone(),
    };
    state.db.save_upload(&upload).unwrap();
    state.db.upsert_document_from_upload(&upload).unwrap();
    hash
}

/// 这本书名下一个做完 OCR 的任务，规范化文档里第一页有文档标题。
fn ocr_job_with_title(state: &crate::AppState, document_id: &str, job_id: &str, title: &str) {
    let upload = state.db.find_upload_for_document(document_id).unwrap().unwrap();
    let normalized = state.config.output_root.join(job_id).join("ocr/normalized/document.v1.json");
    fs::create_dir_all(normalized.parent().unwrap()).unwrap();
    fs::write(
        &normalized,
        json!({
            "schema": "document.v1",
            "pages": [{
                "page_index": 0,
                "blocks": [{
                    "block_id": "p001-b0001",
                    "text": title,
                    "layout_role": "title",
                    "structure_role": "document_title",
                    "sub_type": "title"
                }]
            }]
        })
        .to_string(),
    )
    .unwrap();
    let mut input = CreateJobInput::default();
    input.workflow = WorkflowKind::Ocr;
    input.source.upload_id = upload.upload_id;
    let mut job = JobSnapshot::new(job_id.to_string(), input, vec!["ocr".to_string()]);
    job.status = JobStatusKind::Succeeded;
    if let Some(artifacts) = job.artifacts.as_mut() {
        artifacts.normalized_document_json = Some(normalized.to_string_lossy().to_string());
    }
    job.sync_runtime_state();
    state.db.save_job(&job).unwrap();
    rusqlite::Connection::open(&state.config.jobs_db_path)
        .unwrap()
        .execute(
            "UPDATE jobs SET document_id = ?1 WHERE job_id = ?2",
            rusqlite::params![document_id, job_id],
        )
        .unwrap();
}

async fn post(app: &axum::Router, uri: &str, body: Value) -> (StatusCode, Value) {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(uri)
                .header("X-API-Key", "test-key")
                .header("content-type", "application/json")
                .header("host", "127.0.0.1:41000")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    (status, serde_json::from_slice(&bytes).unwrap())
}

#[tokio::test]
async fn reuploading_the_same_book_under_another_name_keeps_auto_naming() {
    let state = test_state("metadata-reupload-auto-naming");
    let app = build_app(state.clone());
    let document_id = upload_as(&state, b"same book bytes", "up-first", "a.pdf");
    // 同一内容换个文件名再传：书号不变，source_filename 变成 b.pdf，书名还是上一次的默认值 a。
    upload_as(&state, b"same book bytes", "up-second", "b.pdf");
    let document = state.db.get_document(&document_id).unwrap();
    assert_eq!((document.title.as_str(), document.source_filename.as_str()), ("a", "b.pdf"));
    assert_eq!(document.title_source, "filename");
    ocr_job_with_title(&state, &document_id, "ocr-reupload", "A Real Paper Title");

    let (status, payload) = post(
        &app,
        &format!("/api/v1/documents/{document_id}/metadata-suggestions"),
        json!({ "job_id": "ocr-reupload", "fields": ["title"], "apply_if_default": true }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{payload}");
    assert_eq!(payload["data"]["applied"], true, "{payload}");
    assert_eq!(payload["data"]["can_apply"], true, "{payload}");
    assert_eq!(state.db.get_document(&document_id).unwrap().title, "A Real Paper Title");
}

#[tokio::test]
async fn apply_returns_the_document_with_the_same_links_as_patch() {
    let state = test_state("metadata-apply-links");
    let app = build_app(state.clone());
    let document_id = upload_as(&state, b"apply links book", "up-apply", "paper.pdf");
    ocr_job_with_title(&state, &document_id, "ocr-apply", "Applied Title");
    let (status, created) = post(
        &app,
        &format!("/api/v1/documents/{document_id}/metadata-suggestions"),
        json!({ "job_id": "ocr-apply" }),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{created}");
    let suggestion_id = created["data"]["suggestion_id"].as_str().unwrap();

    let (status, applied) = post(
        &app,
        &format!("/api/v1/documents/{document_id}/metadata-suggestions/{suggestion_id}/apply"),
        json!({}),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{applied}");
    let document = &applied["data"]["document"];
    assert_eq!(document["title"], "Applied Title");
    let base = format!("http://127.0.0.1:41000/api/v1/documents/{document_id}/files");
    assert_eq!(document["source_pdf_url"], format!("{base}/source.pdf?download=1"));
    assert_eq!(document["cover_url"], format!("{base}/cover.jpg"));
    assert_eq!(document["thumbnail_url"], format!("{base}/thumbnail.jpg"));
}

#[tokio::test]
async fn metadata_errors_carry_a_reason_and_use_the_agreed_status_codes() {
    let state = test_state("metadata-error-shape");
    let app = build_app(state.clone());
    let document_id = upload_as(&state, b"error shape book", "up-errors", "paper.pdf");
    let uri = format!("/api/v1/documents/{document_id}/metadata-suggestions");

    // 没有 OCR、原文也没有 Info Title：以前是 422，现在是状态不允许的 409。
    let (status, payload) = post(&app, &uri, json!({})).await;
    assert_eq!(status, StatusCode::CONFLICT, "{payload}");
    assert_eq!(payload["code"], "DOCUMENT_TITLE_CANDIDATE_NOT_FOUND");
    assert_eq!(payload["error"]["code"], "DOCUMENT_TITLE_CANDIDATE_NOT_FOUND");
    assert_eq!(payload["error"]["details"], json!({ "reason": "title_candidate_not_found" }));

    // 点名的任务不存在：顶层 code 照旧，error.code 不再和建任务复用 OCR 的同名码撞车。
    let (status, payload) = post(&app, &uri, json!({ "job_id": "no-such-job" })).await;
    assert_eq!(status, StatusCode::NOT_FOUND, "{payload}");
    assert_eq!(payload["code"], "OCR_JOB_NOT_FOUND");
    assert_eq!(payload["error"]["code"], "DOCUMENT_METADATA_JOB_NOT_FOUND");
    assert_eq!(payload["error"]["details"], json!({ "reason": "job_not_found" }));

    // 规范化文档不是合法 JSON：以前 422，现在 409。
    ocr_job_with_title(&state, &document_id, "ocr-broken", "whatever");
    let broken = state.config.output_root.join("ocr-broken/ocr/normalized/document.v1.json");
    fs::write(&broken, b"{ not json").unwrap();
    let (status, payload) = post(&app, &uri, json!({ "job_id": "ocr-broken" })).await;
    assert_eq!(status, StatusCode::CONFLICT, "{payload}");
    assert_eq!(payload["error"]["details"]["reason"], "source_invalid");

    let (status, payload) = post(&app, &format!("{uri}/meta-missing/apply"), json!({})).await;
    assert_eq!(status, StatusCode::NOT_FOUND, "{payload}");
    assert_eq!(payload["error"]["details"]["reason"], "suggestion_not_found");

    let (status, payload) = post(&app, &uri, json!({ "fields": ["authors"] })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "{payload}");
    assert_eq!(payload["error"]["details"]["reason"], "field_unsupported");
}

#[tokio::test]
async fn metadata_request_bodies_reject_unknown_fields() {
    let state = test_state("metadata-unknown-fields");
    let app = build_app(state.clone());
    let document_id = upload_as(&state, b"unknown fields book", "up-unknown", "paper.pdf");
    let uri = format!("/api/v1/documents/{document_id}/metadata-suggestions");

    let (status, payload) = post(&app, &uri, json!({ "apply_if_defualt": true })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "{payload}");
    assert!(payload["message"].as_str().unwrap().contains("apply_if_defualt"), "{payload}");

    let (status, payload) =
        post(&app, &format!("{uri}/meta-x/apply"), json!({ "expected_updated_at": "t" })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "{payload}");
    assert!(payload["message"].as_str().unwrap().contains("expected_updated_at"), "{payload}");
}

fn ocr_settings() -> Value {
    json!({ "provider": "paddle", "paddle_token": "t", "paddle_api_url": "https://paddle.example.com" })
}

#[tokio::test]
async fn book_ocr_rejects_fields_that_contradict_the_entry_instead_of_rewriting_them() {
    let state = test_state("document-ocr-contradicting-fields");
    let app = build_app(state.clone());
    let document_id = upload_as(&state, b"ocr strict book", "up-ocr-strict", "paper.pdf");
    let uri = format!("/api/v1/documents/{document_id}/ocr");
    for (body, field) in [
        (json!({ "workflow": "book", "ocr": ocr_settings() }), "workflow"),
        (json!({ "workflow": "translate", "ocr": ocr_settings() }), "workflow"),
        (json!({ "source": { "artifact_job_id": "some-job" }, "ocr": ocr_settings() }), "source.artifact_job_id"),
        (json!({ "source": { "source_url": "https://example.com/a.pdf" }, "ocr": ocr_settings() }), "source.source_url"),
    ] {
        let (status, payload) = post(&app, &uri, body.clone()).await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{body} -> {payload}");
        assert!(payload["message"].as_str().unwrap().contains(field), "{body} -> {payload}");
    }
    assert!(state.db.list_jobs_for_document(&document_id, 10, 0).unwrap().is_empty(), "nothing submitted");

    // 不写 workflow、写 ocr 都照旧能建。
    for body in [json!({ "ocr": ocr_settings() }), json!({ "workflow": "ocr", "ocr": ocr_settings() })] {
        let (status, payload) = post(&app, &uri, body).await;
        assert_eq!(status, StatusCode::OK, "{payload}");
        assert_eq!(payload["data"]["workflow"], "ocr");
    }
}

#[tokio::test]
async fn book_translate_rejects_a_source_url_instead_of_dropping_it() {
    let state = test_state("document-translate-source-url");
    let app = build_app(state.clone());
    let document_id = upload_as(&state, b"translate strict book", "up-tr-strict", "paper.pdf");
    let (status, payload) = post(
        &app,
        &format!("/api/v1/documents/{document_id}/translate"),
        json!({ "source": { "source_url": "https://example.com/a.pdf" }, "ocr": ocr_settings() }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "{payload}");
    assert!(payload["message"].as_str().unwrap().contains("source.source_url"), "{payload}");
    assert!(state.db.list_jobs_for_document(&document_id, 10, 0).unwrap().is_empty());
}

#[tokio::test]
async fn book_entries_check_the_request_before_the_state() {
    let state = test_state("document-entries-request-first");
    let app = build_app(state.clone());
    let document_id = upload_as(&state, b"request first book", "up-req-first", "paper.pdf");

    // 带 runtime.job_id、又复用一份不存在的 OCR：先说请求写错了（400），不说 OCR 不在（404/409）。
    let (status, payload) = post(
        &app,
        &format!("/api/v1/documents/{document_id}/translate"),
        json!({
            "workflow": "translate",
            "source": { "artifact_job_id": "missing-ocr" },
            "runtime": { "job_id": "custom-id" }
        }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "{payload}");
    assert!(payload["message"].as_str().unwrap().contains("runtime.job_id"), "{payload}");

    // 书不存在、请求也写错：先 400。
    for (path, body) in [
        ("translate", json!({ "workflow": "ocr" })),
        ("translate", json!({ "runtime": { "job_id": "custom-id" } })),
        ("ocr", json!({ "workflow": "book" })),
        ("ocr", json!({ "runtime": { "job_id": "custom-id" } })),
    ] {
        let (status, payload) = post(&app, &format!("/api/v1/documents/no-such-book/{path}"), body.clone()).await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{path} {body} -> {payload}");
    }
    // 请求没问题、书不存在：404。
    let (status, _) = post(&app, "/api/v1/documents/no-such-book/ocr", json!({ "ocr": ocr_settings() })).await;
    assert_eq!(status, StatusCode::NOT_FOUND);

    // 未知字段的提示和 POST /jobs 一样。
    let (status, payload) = post(
        &app,
        &format!("/api/v1/documents/{document_id}/translate"),
        json!({ "workflwo": "book" }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "{payload}");
    assert!(payload["message"].as_str().unwrap().starts_with("invalid job payload: unknown field `workflwo`"), "{payload}");
}
