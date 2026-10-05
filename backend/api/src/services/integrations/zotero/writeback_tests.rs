use std::sync::{Arc, Mutex as StdMutex};

use axum::body::{to_bytes, Body};
use axum::extract::{Request, State};
use axum::http::{Method, Response as AxumResponse};
use axum::routing::any;
use axum::Router;

use super::*;

#[derive(Clone, Debug)]
struct CapturedRequest {
    path: String,
    headers: HeaderMap,
    body: Vec<u8>,
}

struct FakeState {
    base: String,
    version: &'static str,
    existing: bool,
    remember: bool,
    requests: StdMutex<Vec<CapturedRequest>>,
}

async fn fake_zotero(State(state): State<Arc<FakeState>>, request: Request) -> AxumResponse<Body> {
    let method = request.method().clone();
    let path = request.uri().path().to_string();
    let headers = request.headers().clone();
    let body = to_bytes(request.into_body(), usize::MAX)
        .await
        .unwrap()
        .to_vec();
    state.requests.lock().unwrap().push(CapturedRequest {
        path: path.clone(),
        headers,
        body: body.clone(),
    });

    let response = AxumResponse::builder();
    match (method, path.as_str()) {
        (Method::GET, "/api/") => response
            .status(200)
            .header("X-Zotero-Version", state.version)
            .header("Zotero-Server-ID", "server-test")
            .body(Body::from("\"Nothing to see here.\""))
            .unwrap(),
        (Method::GET, "/api/users/0/items/ITEM0001/children") => {
            let data = if state.existing {
                json!([{"data": {
                    "key": "TRANS001", "itemType": "attachment",
                    "contentType": "application/pdf", "md5": "old-md5",
                    "note": "<p>paperloom-document:doc-1</p>"
                }}])
            } else {
                json!([])
            };
            response
                .status(200)
                .header(CONTENT_TYPE, "application/json")
                .body(Body::from(data.to_string()))
                .unwrap()
        }
        (Method::POST, "/api/local/authorize") => response
            .status(200)
            .header(CONTENT_TYPE, "application/json")
            .body(Body::from(
                json!({"key":"local-write-key","remember":state.remember}).to_string(),
            ))
            .unwrap(),
        (Method::POST, "/api/users/0/items") => {
            // Zotero 10.0.5 fromJSON applies fields in wire order. Setting
            // filename before linkMode tries to set a path without a link mode.
            let wire = String::from_utf8_lossy(&body);
            let invalid_order = wire.find("\"filename\"").is_some_and(|filename| {
                wire.find("\"linkMode\"")
                    .is_none_or(|link_mode| filename < link_mode)
            });
            let result = if invalid_order {
                json!({"failed":{"0":{"code":400,"message":"Link mode must be set before setting attachment path"}},"success":{}})
            } else {
                json!({"success":{"0":"TRANS001"}})
            };
            response
                .status(200)
                .header(CONTENT_TYPE, "application/json")
                .body(Body::from(result.to_string()))
                .unwrap()
        }
        (Method::POST, "/api/users/0/items/TRANS001/file") => {
            let form = String::from_utf8_lossy(&body);
            if form.starts_with("upload=") {
                response.status(204).body(Body::empty()).unwrap()
            } else {
                response
                    .status(200)
                    .header(CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        json!({
                            "url": format!("{}/api/local/uploads/upload-1", state.base),
                            "contentType": "application/pdf",
                            "prefix": "", "suffix": "", "uploadKey": "upload-1"
                        })
                        .to_string(),
                    ))
                    .unwrap()
            }
        }
        (Method::POST, "/api/local/uploads/upload-1") => {
            response.status(201).body(Body::empty()).unwrap()
        }
        _ => response.status(404).body(Body::from("not found")).unwrap(),
    }
}

async fn spawn_fake(existing: bool, remember: bool) -> (String, Arc<FakeState>) {
    spawn_fake_version(existing, remember, "10.0.5").await
}

async fn spawn_fake_version(
    existing: bool,
    remember: bool,
    version: &'static str,
) -> (String, Arc<FakeState>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base = format!("http://{}", listener.local_addr().unwrap());
    let state = Arc::new(FakeState {
        base: base.clone(),
        version,
        existing,
        remember,
        requests: StdMutex::new(Vec::new()),
    });
    let app = Router::new()
        .route("/*path", any(fake_zotero))
        .with_state(state.clone());
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    (base, state)
}

fn test_paths(name: &str) -> (PathBuf, PathBuf) {
    let root = std::env::temp_dir().join(format!("zotero-writeback-{name}-{}", fastrand::u64(..)));
    fs::create_dir_all(&root).unwrap();
    let pdf = root.join("translated.pdf");
    fs::write(&pdf, b"%PDF-1.7 translated").unwrap();
    (root, pdf)
}

#[test]
fn file_preconditions_select_create_or_replace_guard() {
    let client = reqwest::Client::new();
    let create = apply_file_precondition(client.post("http://localhost/file"), None)
        .build()
        .unwrap();
    assert_eq!(create.headers()[IF_NONE_MATCH], "*");
    let replace = apply_file_precondition(client.post("http://localhost/file"), Some("abc123"))
        .build()
        .unwrap();
    assert_eq!(replace.headers()[IF_MATCH], "abc123");
}

#[tokio::test]
async fn creates_attachment_and_completes_three_phase_local_upload() {
    let (base, state) = spawn_fake(false, true).await;
    let (root, pdf) = test_paths("create");
    let result = ZoteroWriteClient::new(base, &root)
        .unwrap()
        .write_translated_pdf("users/0", "ITEM0001", "doc-1", &pdf)
        .await
        .unwrap();
    assert_eq!(result.status, "created");
    assert_eq!(result.attachment_key, "TRANS001");
    assert!(root.join("secrets").join(AUTH_FILE).is_file());

    let requests = state.requests.lock().unwrap();
    assert_eq!(
        requests
            .iter()
            .filter(|request| request.path == "/api/local/authorize")
            .count(),
        1
    );
    let writes: Vec<_> = requests
        .iter()
        .filter(|request| {
            request.path == "/api/users/0/items"
                || request.path == "/api/users/0/items/TRANS001/file"
        })
        .collect();
    assert_eq!(writes.len(), 3);
    let create: Value = serde_json::from_slice(&writes[0].body).unwrap();
    assert_eq!(create[0]["linkMode"], "imported_file");
    assert!(create[0].get("filename").is_none());
    assert!(String::from_utf8_lossy(&writes[1].body).contains("filename=PaperLoom-zh.pdf"));
    for request in writes {
        assert_eq!(request.headers["Zotero-Server-ID"], "server-test");
        assert_eq!(request.headers["Zotero-API-Key"], "local-write-key");
    }
    let upload = requests
        .iter()
        .find(|request| request.path == "/api/local/uploads/upload-1")
        .unwrap();
    assert_eq!(upload.body, b"%PDF-1.7 translated");
    assert!(upload.headers.get("Zotero-API-Key").is_none());
    let _ = fs::remove_dir_all(root);
}

#[tokio::test]
async fn updates_existing_attachment_with_md5_precondition() {
    let (base, state) = spawn_fake(true, true).await;
    let (root, pdf) = test_paths("update");
    let result = ZoteroWriteClient::new(base, &root)
        .unwrap()
        .write_translated_pdf("users/0", "ITEM0001", "doc-1", &pdf)
        .await
        .unwrap();
    assert_eq!(result.status, "updated");

    let requests = state.requests.lock().unwrap();
    assert!(!requests
        .iter()
        .any(|request| request.path == "/api/users/0/items"));
    let file_requests: Vec<_> = requests
        .iter()
        .filter(|request| request.path == "/api/users/0/items/TRANS001/file")
        .collect();
    assert_eq!(file_requests.len(), 2);
    assert!(file_requests
        .iter()
        .all(|request| request.headers[IF_MATCH] == "old-md5"));
    let _ = fs::remove_dir_all(root);
}

#[tokio::test]
async fn one_time_authorization_is_renewed_for_each_write() {
    let (base, state) = spawn_fake(false, false).await;
    let (root, pdf) = test_paths("one-time");
    ZoteroWriteClient::new(base, &root)
        .unwrap()
        .write_translated_pdf("users/0", "ITEM0001", "doc-1", &pdf)
        .await
        .unwrap();
    let requests = state.requests.lock().unwrap();
    assert_eq!(
        requests
            .iter()
            .filter(|request| request.path == "/api/local/authorize")
            .count(),
        3
    );
    assert!(!root.join("secrets").join(AUTH_FILE).exists());
    let _ = fs::remove_dir_all(root);
}

#[tokio::test]
async fn remembered_authorization_is_reused_without_prompting() {
    let (base, state) = spawn_fake(true, true).await;
    let (root, pdf) = test_paths("remembered");
    let auth_path = root.join("secrets").join(AUTH_FILE);
    fs::create_dir_all(auth_path.parent().unwrap()).unwrap();
    fs::write(
        &auth_path,
        serde_json::to_vec(&StoredAuthorization {
            server_id: "server-test".to_string(),
            key: "local-write-key".to_string(),
            remember: true,
        })
        .unwrap(),
    )
    .unwrap();

    ZoteroWriteClient::new(base, &root)
        .unwrap()
        .write_translated_pdf("users/0", "ITEM0001", "doc-1", &pdf)
        .await
        .unwrap();

    let requests = state.requests.lock().unwrap();
    assert!(!requests
        .iter()
        .any(|request| request.path == "/api/local/authorize"));
    let _ = fs::remove_dir_all(root);
}

#[test]
fn rejects_upload_urls_outside_the_local_zotero_instance() {
    let root = std::env::temp_dir();
    let client = ZoteroWriteClient::new("http://127.0.0.1:23119".to_string(), &root).unwrap();
    assert!(client
        .validate_upload_url("https://example.invalid/api/local/uploads/stolen")
        .is_err());
    assert!(client
        .validate_upload_url("http://127.0.0.1:23119/not-an-upload/path")
        .is_err());
}

#[tokio::test]
async fn older_zotero_is_rejected_before_authorization_or_writes() {
    for version in ["9.0.6", "8.0.0"] {
        let (base, state) = spawn_fake_version(false, true, version).await;
        let (root, pdf) = test_paths("old-version");
        let error = ZoteroWriteClient::new(base, &root)
            .unwrap()
            .write_translated_pdf("users/0", "ITEM0001", "doc-1", &pdf)
            .await
            .unwrap_err();
        assert!(error.to_string().contains("Zotero 10"));
        assert_eq!(state.requests.lock().unwrap().len(), 1);
        let _ = fs::remove_dir_all(root);
    }
}

#[tokio::test]
async fn connection_errors_do_not_expose_temporary_upload_urls() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!(
        "http://{}/api/local/uploads/private-upload-marker?key=private-query-marker",
        listener.local_addr().unwrap()
    );
    drop(listener);
    let error = reqwest::Client::new().post(url).send().await.unwrap_err();
    let message = super::super::unreachable_error(error).to_string();
    assert!(message.contains("无法连接 Zotero"));
    assert!(!message.contains("private-upload-marker"));
    assert!(!message.contains("private-query-marker"));
}
