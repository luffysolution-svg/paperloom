use std::sync::{Arc, Mutex};

use axum::extract::Request;
use axum::http::{HeaderValue, Method};
use axum::response::IntoResponse;
use serde_json::json;

use super::*;
use crate::db::external_refs::ExternalRefRecord;

const URI: &str = "/api/v1/integrations/zotero/writeback-batch";

#[tokio::test]
async fn zotero_writeback_batch_rejects_empty_invalid_and_oversized_selection() {
    let state = setup("zotero-batch-validation", true);
    for ids in [json!([]), json!([" "]), json!(vec!["doc"; 201])] {
        let (status, _) = call(
            state.clone(),
            "POST",
            URI,
            Some(json!({"document_ids": ids})),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }
}

#[tokio::test]
async fn zotero_writeback_batch_reports_non_zotero_and_missing_translation_per_document() {
    let state = setup("zotero-batch-not-imported", true);
    let document_id = link_export_job_to_document(&state);
    let (status, body) = call(
        state.clone(),
        "POST",
        URI,
        Some(json!({
            "document_ids": [document_id, "missing-document", document_id]
        })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["data"]["failed"], 2);
    assert_eq!(body["data"]["items"].as_array().unwrap().len(), 2);
    assert!(body["data"]["items"][0]["message"]
        .as_str()
        .unwrap()
        .contains("不是从 Zotero 导入"));

    let mut job = state.db.get_job(JOB_ID).unwrap();
    job.status = JobStatusKind::Failed;
    job.sync_runtime_state();
    state.db.save_job(&job).unwrap();
    let (_, body) = call(
        state,
        "POST",
        URI,
        Some(json!({"document_ids": [document_id]})),
    )
    .await;
    assert!(body["data"]["items"][0]["message"]
        .as_str()
        .unwrap()
        .contains("没有可写回的已完成译文"));
}

#[tokio::test]
async fn zotero_writeback_batch_continues_after_failure_deduplicates_and_reuses_authorization() {
    let _env_guard = obsidian_env_lock();
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base = format!("http://{}", listener.local_addr().unwrap());
    let counts = Arc::new(Mutex::new((0, 0, None::<serde_json::Value>)));
    let captured = counts.clone();
    let server_base = base.clone();
    let app = axum::Router::new().fallback(move |request: Request| {
        let captured = captured.clone();
        let base = server_base.clone();
        async move {
            let method = request.method().clone();
            let path = request.uri().path().to_string();
            let body = to_bytes(request.into_body(), usize::MAX).await.unwrap();
            if path == "/api/" {
                let mut response = axum::Json(json!("ready")).into_response();
                response.headers_mut().insert("X-Zotero-Version", HeaderValue::from_static("10.0.5"));
                response.headers_mut().insert("Zotero-Server-ID", HeaderValue::from_static("batch-test-server"));
                return response;
            }
            let result = match (method, path.as_str()) {
                (Method::GET, "/api/users/0/items/ITEM0001/children") => {
                    captured.lock().unwrap().2.clone().map(|attachment| json!([attachment])).unwrap_or(json!([]))
                }
                (Method::POST, "/api/local/authorize") => {
                    captured.lock().unwrap().0 += 1;
                    json!({"key": "fake-batch-authorization", "remember": true})
                }
                (Method::POST, "/api/users/0/items") => {
                    let attachment: serde_json::Value = serde_json::from_slice(&body).unwrap();
                    let mut counters = captured.lock().unwrap();
                    counters.1 += 1;
                    counters.2 = Some(json!({"data": {
                        "key": "TRANS001", "itemType": "attachment", "contentType": "application/pdf",
                        "md5": "previous-md5", "note": attachment[0]["note"],
                    }}));
                    json!({"success": {"0": "TRANS001"}})
                }
                (Method::POST, "/api/users/0/items/TRANS001/file") => {
                    if body.starts_with(b"upload=") { return StatusCode::NO_CONTENT.into_response(); }
                    json!({"url": format!("{base}/api/local/uploads/batch-test"),
                        "contentType": "application/pdf", "prefix": "", "suffix": "", "uploadKey": "fake-upload"})
                }
                (Method::POST, "/api/local/uploads/batch-test") => return StatusCode::CREATED.into_response(),
                _ => return StatusCode::NOT_FOUND.into_response(),
            };
            axum::Json(result).into_response()
        }
    });
    let server = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    let env_name = crate::services::integrations::zotero::ZOTERO_API_ENV;
    let previous = std::env::var_os(env_name);
    std::env::set_var(env_name, base);
    let state = setup("zotero-batch-success", true);
    let document_id = link_export_job_to_document(&state);
    state
        .db
        .upsert_external_ref(&ExternalRefRecord {
            document_id: document_id.clone(),
            source: "zotero".into(),
            library_id: "users/0".into(),
            item_key: "ITEM0001".into(),
            attachment_key: "ATT00001".into(),
            collection_path: String::new(),
            metadata_json: "{}".into(),
            created_at: String::new(),
            updated_at: String::new(),
        })
        .unwrap();
    // A newer translate-only run has no PDF and must not hide the older PDF.
    let mut latest = state.db.get_job(JOB_ID).unwrap();
    latest.job_id = "newer-translation-only".into();
    latest.request_payload.runtime.job_id = latest.job_id.clone();
    latest.workflow = crate::models::domain::WorkflowKind::Translate;
    latest.created_at = "2099-01-01T00:00:00Z".into();
    let artifacts = latest.artifacts.as_mut().unwrap();
    artifacts.output_pdf = None;
    artifacts.job_root = Some("jobs/newer-translation-only".into());
    latest.sync_runtime_state();
    state.db.save_job(&latest).unwrap();
    rusqlite::Connection::open(&state.config.jobs_db_path)
        .unwrap()
        .execute(
            "UPDATE jobs SET document_id = ?1 WHERE job_id = ?2",
            rusqlite::params![document_id, latest.job_id],
        )
        .unwrap();
    for expected_status in ["created", "updated"] {
        let (status, body) = call(
            state.clone(),
            "POST",
            URI,
            Some(json!({
                "document_ids": ["missing-document", document_id, document_id]
            })),
        )
        .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["data"][expected_status], 1);
        assert_eq!(body["data"]["failed"], 1);
        assert_eq!(body["data"]["items"].as_array().unwrap().len(), 2);
        assert_eq!(body["data"]["items"][1]["job_id"], JOB_ID);
        assert_eq!(
            body["data"]["items"][1]["result"]["status"],
            expected_status
        );
        assert_eq!(
            body["data"]["items"][1]["result"]["attachment_key"],
            "TRANS001"
        );
    }
    let counters = counts.lock().unwrap();
    assert_eq!(
        (counters.0, counters.1),
        (1, 1),
        "one authorization and one attachment reused across writes"
    );
    if let Some(value) = previous {
        std::env::set_var(env_name, value);
    } else {
        std::env::remove_var(env_name);
    }
    server.abort();
}
