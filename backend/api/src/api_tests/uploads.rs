use super::jobs_common::{read_json, test_state};
use crate::app::build_app;

#[tokio::test]
async fn upload_domain_errors_preserve_http_envelopes() {
    use crate::services::ingest::UploadError;
    use axum::response::IntoResponse;
    let cases = [
        (
            UploadError::BadRequest("invalid pdf after repair".into()),
            400,
            "BAD_REQUEST",
            "invalid pdf after repair",
        ),
        (
            UploadError::PayloadTooLarge("PDF exceeds processing buffer budget"),
            413,
            "PAYLOAD_TOO_LARGE",
            "PDF exceeds processing buffer budget",
        ),
        (
            UploadError::Busy,
            503,
            "SERVICE_UNAVAILABLE",
            "PDF processing capacity is busy; please retry",
        ),
        (
            UploadError::QueueTimeout,
            503,
            "SERVICE_UNAVAILABLE",
            "PDF processing queue wait timed out",
        ),
        (
            UploadError::RepairUnavailable,
            503,
            "SERVICE_UNAVAILABLE",
            "PDF repair tool unavailable",
        ),
        (
            UploadError::RepairTimeout,
            503,
            "SERVICE_UNAVAILABLE",
            "PDF repair timed out",
        ),
    ];
    for (error, status, code, message) in cases {
        let response = crate::error::AppError::from(error).into_response();
        assert_eq!(response.status().as_u16(), status);
        assert_eq!(
            read_json(response).await,
            serde_json::json!({
                "code": u32::from(status) * 100, "message": message,
                "error": {"code": code, "http_status": status, "details": {}}
            })
        );
    }
    // 内部失败只回编号，原因进日志。
    for error in [
        UploadError::Internal("Failed to publish uploaded PDF"),
        UploadError::Io(std::io::Error::other("synthetic IO failure")),
    ] {
        let response = crate::error::AppError::from(error).into_response();
        assert_eq!(response.status().as_u16(), 500);
        let body = read_json(response).await;
        assert_eq!(body["error"]["code"], "INTERNAL");
        assert!(body["message"].as_str().unwrap().starts_with("internal server error (ref "));
    }
}

#[tokio::test]
async fn upload_route_uses_the_injected_processing_budget() {
    let mut state = test_state("upload-shared-budget");
    let mut processing = crate::config::UploadProcessingConfig::default();
    processing.buffer_mib = 1;
    state.uploads = Arc::new(crate::services::ingest::UploadService::new(
        state.db.clone(),
        crate::services::ingest::UploadServiceConfig {
            uploads_dir: state.config.uploads_dir.clone(),
            python_bin: "/never-start-python".into(),
            upload_max_bytes: 0,
            upload_max_pages: 0,
            min_free_disk_bytes: 0,
            processing,
        },
    ));
    let uploads_dir = state.config.uploads_dir.clone();
    let output_root = state.config.output_root.clone();
    let db = state.db.clone();
    let app = build_app(state);
    let uri = "/api/v1/uploads";
    let mut body = Vec::new();
    body.extend_from_slice(format!("--{UPLOAD_BOUNDARY}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"input.pdf\"\r\nContent-Type: application/pdf\r\n\r\n").as_bytes());
    let mut pdf = crate::test_support::pdf::build_test_pdf_bytes();
    pdf.resize(1024 * 1024 + 1, b' ');
    body.extend_from_slice(&pdf);
    body.extend_from_slice(format!("\r\n--{UPLOAD_BOUNDARY}--\r\n").as_bytes());
    let request = Request::builder()
        .method("POST")
        .uri(uri)
        .header("X-API-Key", "test-key")
        .header(
            header::CONTENT_TYPE,
            format!("multipart/form-data; boundary={UPLOAD_BOUNDARY}"),
        )
        .body(Body::from(body))
        .unwrap();
    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE, "{uri}");
    assert_eq!(
        read_json(response).await["message"],
        "PDF exceeds processing buffer budget",
        "{uri}"
    );
    assert_eq!(upload_leftovers(&uploads_dir), Vec::<std::path::PathBuf>::new());
    assert_eq!(std::fs::read_dir(&output_root).unwrap().count(), 0);
    assert!(db.list_jobs(10, 0, None, None).unwrap().is_empty());
}
use axum::body::Body;
use axum::http::{header, Request, StatusCode};
use std::sync::Arc;
use tower::util::ServiceExt;

#[tokio::test]
async fn upload_route_preserves_success_view_and_document_deduplication() {
    let state = test_state("upload-route-success");
    let db = state.db.clone();
    let uploads_dir = state.config.uploads_dir.clone();
    let app = build_app(state);
    let pdf = crate::test_support::pdf::build_test_pdf_bytes();
    let mut ids = Vec::new();
    for filename in ["first.pdf", "second.pdf"] {
        let mut body = format!("--{UPLOAD_BOUNDARY}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\nContent-Type: application/pdf\r\n\r\n").into_bytes();
        body.extend_from_slice(&pdf);
        body.extend_from_slice(format!("\r\n--{UPLOAD_BOUNDARY}--\r\n").as_bytes());
        let request = Request::builder()
            .method("POST")
            .uri("/api/v1/uploads")
            .header("X-API-Key", "test-key")
            .header(
                header::CONTENT_TYPE,
                format!("multipart/form-data; boundary={UPLOAD_BOUNDARY}"),
            )
            .body(Body::from(body))
            .unwrap();
        let response = app.clone().oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let payload = read_json(response).await;
        let view = &payload["data"];
        assert_eq!(view["filename"], filename);
        assert_eq!(view["bytes"], pdf.len());
        assert_eq!(view["page_count"], 1);
        let mut keys = view
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect::<Vec<_>>();
        keys.sort_unstable();
        assert_eq!(
            keys,
            [
                "bytes",
                "document_id",
                "filename",
                "page_count",
                "upload_id",
                "uploaded_at"
            ]
        );
        ids.push(view["upload_id"].as_str().unwrap().to_owned());
    }
    assert_ne!(ids[0], ids[1]);
    let first = db.get_upload(&ids[0]).unwrap();
    let second = db.get_upload(&ids[1]).unwrap();
    assert_eq!(first.content_hash, second.content_hash);
    assert_eq!(
        db.get_document(&first.content_hash)
            .unwrap()
            .source_filename,
        "second.pdf"
    );
    assert!(std::path::Path::new(&first.stored_path).exists());
    assert!(std::path::Path::new(&second.stored_path).exists());
    // 边收边写、边算指纹：落盘的就是收到的字节，指纹和整份算的一样，收上传用的临时文件一个不剩。
    assert_eq!(std::fs::read(&first.stored_path).unwrap(), pdf);
    assert_eq!(first.content_hash, crate::db::documents::sha256_hex(&pdf));
    let incoming = uploads_dir.join(".incoming");
    assert_eq!(std::fs::read_dir(&incoming).map(|entries| entries.count()).unwrap(), 0);
}

#[tokio::test]
async fn upload_route_repair_unavailable_preserves_safe_error_and_cleanup() {
    let mut state = test_state("upload-route-repair-unavailable");
    let uploads_dir = state.config.uploads_dir.clone();
    state.uploads = Arc::new(crate::services::ingest::UploadService::new(
        state.db.clone(),
        crate::services::ingest::UploadServiceConfig {
            uploads_dir: uploads_dir.clone(),
            python_bin: "/synthetic-private-missing-python".into(),
            upload_max_bytes: 0,
            upload_max_pages: 0,
            min_free_disk_bytes: 0,
            processing: Default::default(),
        },
    ));
    let body = format!(
        "{}--{UPLOAD_BOUNDARY}--\r\n",
        upload_file_field("broken.pdf", "broken")
    );
    let response = build_app(state)
        .oneshot(upload_request(body))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let payload = read_json(response).await;
    assert_eq!(payload["code"], 50300);
    assert_eq!(payload["message"], "PDF repair tool unavailable");
    assert_eq!(payload["error"]["code"], "SERVICE_UNAVAILABLE");
    assert_eq!(payload["error"]["http_status"], 503);
    assert_eq!(payload["error"]["details"], serde_json::json!({}));
    assert!(!payload.to_string().contains("synthetic-private"));
    assert_eq!(upload_leftovers(&uploads_dir), Vec::<std::path::PathBuf>::new());
}

/// 上传目录里留下的东西：上传目录本身的条目，和收上传用的 `.incoming/` 里的临时文件（目录在，里面得是空的）。
fn upload_leftovers(uploads_dir: &std::path::Path) -> Vec<std::path::PathBuf> {
    let mut leftovers = Vec::new();
    for entry in std::fs::read_dir(uploads_dir).expect("read uploads directory") {
        let path = entry.expect("uploads entry").path();
        if path.file_name().is_some_and(|name| name == ".incoming") {
            leftovers.extend(
                std::fs::read_dir(&path)
                    .expect("read incoming directory")
                    .map(|entry| entry.expect("incoming entry").path()),
            );
        } else {
            leftovers.push(path);
        }
    }
    leftovers
}

const UPLOAD_BOUNDARY: &str = "retainpdf-upload-route-test";

fn upload_file_field(filename: &str, value: &str) -> String {
    format!(
        "--{UPLOAD_BOUNDARY}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\nContent-Type: application/pdf\r\n\r\n{value}\r\n"
    )
}

fn upload_request(body: String) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri("/api/v1/uploads")
        .header("X-API-Key", "test-key")
        .header(
            header::CONTENT_TYPE,
            format!("multipart/form-data; boundary={UPLOAD_BOUNDARY}"),
        )
        .body(Body::from(body))
        .unwrap()
}

#[tokio::test]
async fn upload_route_enforces_configured_stream_limit_without_content_length() {
    let mut state = test_state("upload-route-stream-limit");
    let mut config = (*state.config).clone();
    config.upload_max_bytes = 4;
    let uploads_dir = config.uploads_dir.clone();
    state.config = Arc::new(config);
    let body = format!(
        "{}--{UPLOAD_BOUNDARY}--\r\n",
        upload_file_field("input.pdf", "12345")
    );

    let response = build_app(state)
        .oneshot(upload_request(body))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
    let payload = read_json(response).await;
    assert_eq!(payload["code"], 41300);
    assert_eq!(payload["message"], "request body is too large");
    assert_eq!(payload["error"]["code"], "PAYLOAD_TOO_LARGE");
    let entries = upload_leftovers(&uploads_dir);
    assert!(entries.is_empty(), "oversize route upload created files: {entries:?}");
}

#[tokio::test]
async fn upload_route_rejects_duplicate_file_before_reading_second_body() {
    let mut state = test_state("upload-route-duplicate-file");
    let mut config = (*state.config).clone();
    config.upload_max_bytes = 4;
    state.config = Arc::new(config);
    let body = format!(
        "{}{}--{UPLOAD_BOUNDARY}--\r\n",
        upload_file_field("first.pdf", "1234"),
        upload_file_field("second.pdf", "12345")
    );

    let response = build_app(state)
        .oneshot(upload_request(body))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let payload = read_json(response).await;
    assert_eq!(payload["code"], 40000);
    assert_eq!(payload["message"], "duplicate multipart field: file");
    assert_eq!(payload["error"]["code"], "BAD_REQUEST");
}
