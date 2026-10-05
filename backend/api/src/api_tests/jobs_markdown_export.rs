use std::fs;
use std::io::{Cursor, Read};
use std::path::Path;
use std::sync::{Mutex, MutexGuard, OnceLock};

use axum::body::{to_bytes, Body};
use axum::http::{header, Request, StatusCode};
use tower::util::ServiceExt;

use super::jobs_common::test_state;
use crate::app::build_app;
use crate::db::documents::sha256_hex;
use crate::models::{
    now_iso, CreateJobInput, JobArtifacts, JobSnapshot, JobStatusKind, UploadRecord,
};

mod zotero_writeback_batch;

#[tokio::test]
async fn markdown_export_recovery_keeps_source_markdown_and_images() {
    let state = setup("markdown-recovery-images", true);
    let original = state.db.get_job(JOB_ID).unwrap();
    let mut recovery = original.clone();
    recovery.job_id = "markdown-recovery-job".into();
    recovery.request_payload.source.artifact_job_id = JOB_ID.into();
    recovery.artifacts.as_mut().unwrap().job_root = Some("jobs/markdown-recovery-job".into());
    state.db.save_job(&recovery).unwrap();
    let response = build_app(state).oneshot(Request::builder()
        .uri("/api/v1/jobs/markdown-recovery-job/markdown/export?include_source=true")
        .header("X-API-Key", "test-key").body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap().to_vec();
    let entries = zip_entries(bytes);
    assert!(entries.iter().any(|(name, bytes)| name.contains(".assets/") && bytes == b"png"), "recovery export must retain OCR images");
    assert!(entries.iter().any(|(name, bytes)| name.ends_with(".en.md") && String::from_utf8_lossy(bytes).contains("# Source title")), "source note must retain the provider Markdown");
}

const JOB_ID: &str = "markdown-export-job";

fn obsidian_env_lock() -> MutexGuard<'static, ()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(())).lock().unwrap()
}

fn copy_dir(from: &Path, to: &Path) {
    fs::create_dir_all(to).expect("create dir");
    for entry in fs::read_dir(from).expect("read dir") {
        let entry = entry.expect("dir entry");
        let target = to.join(entry.file_name());
        if entry.file_type().expect("file type").is_dir() {
            copy_dir(&entry.path(), &target);
        } else {
            fs::copy(entry.path(), target).expect("copy file");
        }
    }
}

async fn export(state: crate::AppState, query: &str) -> (StatusCode, Option<String>, Vec<u8>) {
    let response = build_app(state)
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/v1/jobs/{JOB_ID}/markdown/export{query}"))
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("export request"),
        )
        .await
        .expect("export response");
    let status = response.status();
    let disposition = response
        .headers()
        .get(header::CONTENT_DISPOSITION)
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body")
        .to_vec();
    (status, disposition, body)
}

fn zip_entries(bytes: Vec<u8>) -> Vec<(String, Vec<u8>)> {
    let mut archive = zip::ZipArchive::new(Cursor::new(bytes)).expect("valid zip");
    (0..archive.len())
        .map(|index| {
            let mut file = archive.by_index(index).expect("zip entry");
            let mut content = Vec::new();
            file.read_to_end(&mut content).expect("read entry");
            (file.name().to_string(), content)
        })
        .collect()
}

fn setup(test_name: &str, with_translation: bool) -> crate::AppState {
    let state = test_state(test_name);
    let job_root = state.config.output_root.join(JOB_ID);
    let golden = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/golden-jobs/chem-6ada81-10p");
    copy_dir(&golden.join("ocr"), &job_root.join("ocr"));
    if with_translation {
        copy_dir(&golden.join("translated"), &job_root.join("translated"));
    }
    fs::create_dir_all(job_root.join("md/images/page-1")).expect("md dir");
    fs::write(job_root.join("md/images/page-1/chart a.png"), b"png").expect("image");
    fs::write(
        job_root.join("md/full.md"),
        "# Source title\n\n![Fig](images/page-1/chart a.png)\n",
    )
    .expect("full.md");
    fs::create_dir_all(job_root.join("rendered")).expect("rendered dir");
    fs::write(job_root.join("rendered/out.pdf"), b"%PDF-1.7 translated").expect("pdf");

    let mut input = CreateJobInput::default();
    input.runtime.job_id = JOB_ID.to_string();
    input.ocr.language = "en".to_string();
    let mut job = JobSnapshot::new(JOB_ID.to_string(), input, vec!["python".to_string()]);
    let rel = |path: &str| format!("jobs/{JOB_ID}/{path}");
    job.artifacts = Some(JobArtifacts {
        job_root: Some(rel("")),
        normalized_document_json: Some(rel("ocr/normalized/document.v1.json")),
        translations_dir: Some(rel("translated")),
        output_pdf: Some(rel("rendered/out.pdf")),
        ..JobArtifacts::default()
    });
    state.db.save_job(&job).expect("save job");
    state
}

#[tokio::test]
async fn markdown_export_route_returns_obsidian_note_bundle() {
    let state = setup("markdown-export", true);
    let (status, disposition, body) = export(state, "").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        disposition.as_deref(),
        Some(format!("attachment; filename=\"{JOB_ID}.zip\"").as_str())
    );

    let entries = zip_entries(body);
    let names: Vec<_> = entries.iter().map(|(name, _)| name.as_str()).collect();
    let base = JOB_ID;
    assert_eq!(
        names,
        vec![
            format!("{base}.md"),
            format!("{base}.en.md"),
            format!("{base}.assets/fig-001-p01.png"),
            format!("{base}.assets/{base}.zh.pdf"),
        ]
    );
    let text = |name: &str| {
        String::from_utf8(
            entries
                .iter()
                .find(|(entry, _)| entry == name)
                .expect("entry")
                .1
                .clone(),
        )
        .expect("utf8")
    };
    let source = text(&format!("{base}.en.md"));
    // 原文笔记以 full.md 为正文，图片链接指向资源目录。
    assert!(source.contains("# Source title"));
    assert!(source.contains(&format!("![Fig]({base}.assets/fig-001-p01.png)")));
    let translated = text(&format!("{base}.md"));
    assert!(translated.contains(&format!("![[{base}.zh.pdf]]")));
    assert!(translated.contains(&format!("原文：[[{base}.en]]")));
    assert_eq!(entries[2].1, b"png");
}

#[tokio::test]
async fn markdown_export_can_skip_source_note() {
    let state = setup("markdown-export-no-source", true);
    let (status, _, body) = export(state, "?include_source=false").await;
    assert_eq!(status, StatusCode::OK);
    let names: Vec<_> = zip_entries(body)
        .into_iter()
        .map(|(name, _)| name)
        .collect();
    // full.md 里的图片只被原文笔记引用，不导出原文时也不打包。
    assert_eq!(
        names,
        vec![
            format!("{JOB_ID}.md"),
            format!("{JOB_ID}.assets/{JOB_ID}.zh.pdf")
        ]
    );
}

#[tokio::test]
async fn markdown_export_requires_translation() {
    let state = setup("markdown-export-untranslated", false);
    let (status, _, _) = export(state, "").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

fn link_export_job_to_document(state: &crate::AppState) -> String {
    let bytes = crate::test_support::pdf::build_test_pdf_bytes();
    let document_id = sha256_hex(&bytes);
    let stored_path = state.config.uploads_dir.join("batch-export/paper.pdf");
    fs::create_dir_all(stored_path.parent().unwrap()).expect("upload dir");
    fs::write(&stored_path, &bytes).expect("upload pdf");
    let upload = UploadRecord {
        upload_id: "batch-export".to_string(),
        filename: "Batch export.pdf".to_string(),
        stored_path: stored_path.to_string_lossy().to_string(),
        bytes: bytes.len() as u64,
        page_count: 1,
        uploaded_at: now_iso(),
        developer_mode: false,
        content_hash: document_id.clone(),
    };
    state.db.save_upload(&upload).expect("save upload");
    state
        .db
        .upsert_document_from_upload(&upload)
        .expect("upsert document");
    let mut job = state.db.get_job(JOB_ID).expect("load export job");
    job.status = JobStatusKind::Succeeded;
    job.sync_runtime_state();
    state.db.save_job(&job).expect("save succeeded job");
    let connection = rusqlite::Connection::open(&state.config.jobs_db_path).expect("open jobs db");
    connection
        .execute(
            "UPDATE jobs SET document_id = ?1 WHERE job_id = ?2",
            rusqlite::params![document_id, JOB_ID],
        )
        .expect("link job document");
    document_id
}

async fn call(
    state: crate::AppState,
    method: &str,
    uri: &str,
    body: Option<serde_json::Value>,
) -> (StatusCode, serde_json::Value) {
    let request = Request::builder()
        .method(method)
        .uri(uri)
        .header("X-API-Key", "test-key")
        .header(header::CONTENT_TYPE, "application/json");
    let request = match body {
        Some(json) => request.body(Body::from(json.to_string())),
        None => request.body(Body::empty()),
    }
    .expect("request");
    let response = build_app(state).oneshot(request).await.expect("response");
    let status = response.status();
    let bytes = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body");
    (
        status,
        serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null),
    )
}

/// 环境变量是进程级的：所有依赖它的断言放在同一个测试里，避免并发互相覆盖。
#[tokio::test]
async fn obsidian_integration_routes_discover_export_and_remember() {
    let _env_guard = obsidian_env_lock();
    let state = setup("obsidian-export", true);
    let vaults_dir = state.config.data_root.join("mounted-vaults");
    let vault = vaults_dir.join("Research");
    fs::create_dir_all(vault.join(".obsidian")).expect("vault");
    // 不读本机真实的 Obsidian 配置。
    std::env::set_var(
        crate::services::integrations::obsidian::OBSIDIAN_CONFIG_ENV,
        state.config.data_root.join("no-obsidian.json"),
    );
    std::env::set_var(
        crate::services::integrations::obsidian::OBSIDIAN_VAULTS_DIR_ENV,
        &vaults_dir,
    );

    let (status, view) = call(state.clone(), "GET", "/api/v1/integrations/obsidian", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(view["data"]["vaults"][0]["id"], "mounted:Research");
    assert_eq!(view["data"]["settings"]["folder"], "PaperLoom");

    let export_uri = format!("/api/v1/jobs/{JOB_ID}/obsidian/export");
    let (status, created) = call(
        state.clone(),
        "POST",
        &export_uri,
        Some(serde_json::json!({ "vault_id": "mounted:Research", "folder": "Lit" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{created}");
    assert_eq!(created["data"]["status"], "created");
    assert_eq!(created["data"]["note_path"], format!("Lit/{JOB_ID}.md"));
    assert_eq!(
        created["data"]["obsidian_uri"],
        format!("obsidian://open?vault=Research&file=Lit%2F{JOB_ID}")
    );
    assert!(vault.join(format!("Lit/{JOB_ID}.md")).is_file());
    assert!(vault.join(format!("Lit/{JOB_ID}.en.md")).is_file());
    assert!(vault
        .join(format!("Lit/{JOB_ID}.assets/fig-001-p01.png"))
        .is_file());

    // 选择被记住：不带参数再导出 → 同一位置更新。
    let (_, view) = call(state.clone(), "GET", "/api/v1/integrations/obsidian", None).await;
    assert_eq!(
        view["data"]["settings"]["default_vault_id"],
        "mounted:Research"
    );
    assert_eq!(view["data"]["settings"]["folder"], "Lit");
    let (status, updated) = call(
        state.clone(),
        "POST",
        &export_uri,
        Some(serde_json::json!({})),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(updated["data"]["status"], "updated");

    let (status, _) = call(
        state.clone(),
        "PUT",
        "/api/v1/integrations/obsidian/settings",
        Some(serde_json::json!({ "folder": "../escape" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    let (status, _) = call(
        state.clone(),
        "POST",
        &export_uri,
        Some(serde_json::json!({ "vault_id": "nope" })),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert!(!state.config.data_root.join("escape").exists());
}

#[tokio::test]
async fn obsidian_batch_export_resolves_documents_and_returns_per_item_results() {
    let _env_guard = obsidian_env_lock();
    let state = setup("obsidian-batch-export", true);
    let document_id = link_export_job_to_document(&state);
    let vaults_dir = state.config.data_root.join("batch-mounted-vaults");
    let vault = vaults_dir.join("Research");
    fs::create_dir_all(vault.join(".obsidian")).expect("vault");
    std::env::set_var(
        crate::services::integrations::obsidian::OBSIDIAN_CONFIG_ENV,
        state.config.data_root.join("no-obsidian.json"),
    );
    std::env::set_var(
        crate::services::integrations::obsidian::OBSIDIAN_VAULTS_DIR_ENV,
        &vaults_dir,
    );

    let (status, body) = call(
        state,
        "POST",
        "/api/v1/integrations/obsidian/export-batch",
        Some(serde_json::json!({
            "document_ids": [document_id, document_id, "missing-document"],
            "vault_id": "mounted:Research",
            "folder": "Batch",
            "on_conflict": "rename"
        })),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["data"]["written"], 1);
    assert_eq!(body["data"]["failed"], 1);
    assert_eq!(body["data"]["items"].as_array().unwrap().len(), 2);
    assert_eq!(body["data"]["items"][0]["job_id"], JOB_ID);
    assert_eq!(body["data"]["items"][0]["result"]["status"], "created");
    assert!(body["data"]["items"][1]["message"]
        .as_str()
        .unwrap()
        .contains("document not found"));
    let note_path = body["data"]["items"][0]["result"]["note_path"]
        .as_str()
        .expect("batch note path");
    assert!(vault.join(note_path).is_file());
}

/// 假的 Zotero 本地 API：一个条目，挂一个本地 PDF、一个 HTML 快照，
/// 另有一个「WebDAV 未下载」的 PDF 附件（没有 enclosure）。
async fn spawn_fake_zotero(pdf_path: &Path) -> String {
    use axum::http::{HeaderMap, HeaderValue, Uri};
    use serde_json::json;

    let file_url = url::Url::from_file_path(pdf_path)
        .expect("file url")
        .to_string();
    let item = json!({
        "key": "ITEM0001",
        "meta": {"creatorSummary": "Chai 等", "parsedDate": "2026-11", "numChildren": 3},
        "library": {"name": "我的文库"},
        "links": {},
        "data": {
            "key": "ITEM0001", "itemType": "journalArticle",
            "title": "Constructing redox-active sites",
            "DOI": "10.1016/j.jechem.2026.08.002",
            "publicationTitle": "Journal of Energy Chemistry",
            "creators": [{"firstName": "Xingming", "lastName": "Chai", "creatorType": "author"}],
            "tags": [{"tag": "光催化"}]
        }
    });
    let pdf = json!({
        "key": "ATT00001",
        "links": {"enclosure": {"href": file_url, "type": "application/pdf", "length": 1234}},
        "data": {"key": "ATT00001", "itemType": "attachment", "parentItem": "ITEM0001",
                 "contentType": "application/pdf", "title": "Full Text PDF"}
    });
    let remote_pdf = json!({
        "key": "ATT00009",
        "links": {},
        "data": {"key": "ATT00009", "itemType": "attachment", "parentItem": "ITEM0001",
                 "contentType": "application/pdf", "title": "WebDAV PDF"}
    });
    let snapshot = json!({
        "key": "ATT00002",
        "links": {},
        "data": {"key": "ATT00002", "itemType": "attachment", "parentItem": "ITEM0001",
                 "contentType": "text/html", "title": "Snapshot"}
    });
    let collections =
        json!([{"data": {"key": "COLL0001", "name": "光催化", "parentCollection": false}}]);
    let annotation = json!({"key": "ANNOT001", "data": {
        "key": "ANNOT001", "itemType": "annotation", "parentItem": "ATT00001",
        "annotationType": "highlight", "annotationText": "redox-active sites",
        "annotationComment": "关键", "annotationPageLabel": "2",
        "annotationSortIndex": "00001|000100|00050", "annotationPosition": "{\"pageIndex\":1}"
    }});
    let note = json!({"key": "NOTE0001", "data": {
        "key": "NOTE0001", "itemType": "note", "parentItem": "ITEM0001",
        "note": "<p>读后：<strong>重要</strong></p>", "dateAdded": "2026-09-20T13:06:04Z"
    }});

    let handler = move |uri: Uri| {
        let (item, pdf, remote_pdf, snapshot, collections, annotation, note) = (
            item.clone(),
            pdf.clone(),
            remote_pdf.clone(),
            snapshot.clone(),
            collections.clone(),
            annotation.clone(),
            note.clone(),
        );
        let item_type = uri
            .query()
            .and_then(|query| {
                query
                    .split('&')
                    .find_map(|pair| pair.strip_prefix("itemType="))
            })
            .unwrap_or("")
            .to_string();
        async move {
            let mut headers = HeaderMap::new();
            headers.insert("X-Zotero-Version", HeaderValue::from_static("9.0.6"));
            headers.insert("Total-Results", HeaderValue::from_static("1"));
            let body = match uri.path() {
                "/api/" => json!("Nothing to see here."),
                "/api/users/0/items/top" | "/api/users/0/collections/COLL0001/items/top" => {
                    json!([item])
                }
                "/api/users/0/groups" => json!([]),
                "/api/users/0/collections" => collections,
                "/api/users/0/items/ITEM0001/children" if item_type == "note" => json!([note]),
                "/api/users/0/items/ITEM0001/children" => json!([pdf, snapshot, remote_pdf]),
                // 与 Zotero 9 一致：不带 itemType=annotation 时附件的子条目里没有批注。
                "/api/users/0/items/ATT00001/children" if item_type == "annotation" => {
                    json!([annotation])
                }
                "/api/users/0/items/ATT00001/children" => json!([]),
                "/api/users/0/items/ITEM0001" => item,
                "/api/users/0/items/ATT00001" => pdf,
                "/api/users/0/items/ATT00009" => remote_pdf,
                _ => {
                    return (
                        StatusCode::NOT_FOUND,
                        headers,
                        axum::Json(json!("Not found")),
                    )
                }
            };
            (StatusCode::OK, headers, axum::Json(body))
        }
    };
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind");
    let addr = listener.local_addr().expect("addr");
    tokio::spawn(async move {
        axum::serve(listener, axum::Router::new().fallback(handler))
            .await
            .ok();
    });
    format!("http://{addr}")
}

#[tokio::test]
async fn zotero_routes_browse_import_dedupe_and_feed_note_metadata() {
    let state = setup("zotero-import", true);
    let pdf_path = state.config.data_root.join("zotero-storage/Chai 2026.pdf");
    fs::create_dir_all(pdf_path.parent().unwrap()).expect("storage");
    fs::write(&pdf_path, crate::test_support::pdf::build_test_pdf_bytes()).expect("pdf");
    std::env::set_var(
        crate::services::integrations::zotero::ZOTERO_API_ENV,
        spawn_fake_zotero(&pdf_path).await,
    );

    let (status, view) = call(state.clone(), "GET", "/api/v1/integrations/zotero", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(view["data"]["supported"], true, "{view}");
    assert_eq!(view["data"]["libraries"][0]["id"], "users/0");
    assert_eq!(view["data"]["libraries"][0]["name"], "我的文库");

    let (_, collections) = call(
        state.clone(),
        "GET",
        "/api/v1/integrations/zotero/collections?library_id=users/0",
        None,
    )
    .await;
    assert_eq!(collections["data"][0]["name"], "光催化");

    let items_uri = "/api/v1/integrations/zotero/items?library_id=users/0&collection_key=COLL0001";
    let (status, items) = call(state.clone(), "GET", items_uri, None).await;
    assert_eq!(status, StatusCode::OK, "{items}");
    let attachments = &items["data"]["items"][0]["attachments"];
    // 只列 PDF：HTML 快照被过滤；未下载的附件标为不可用。
    assert_eq!(attachments.as_array().map(Vec::len), Some(2));
    assert_eq!(attachments[0]["available"], true);
    assert_eq!(attachments[1]["available"], false);
    assert!(attachments[0]["document_id"].is_null());

    let import_body = serde_json::json!({
        "library_id": "users/0",
        "collection_key": "COLL0001",
        "attachments": [
            {"item_key": "ITEM0001", "attachment_key": "ATT00001"},
            {"item_key": "ITEM0001", "attachment_key": "ATT00009"}
        ]
    });
    let import_uri = "/api/v1/integrations/zotero/import";
    let (status, imported) =
        call(state.clone(), "POST", import_uri, Some(import_body.clone())).await;
    assert_eq!(status, StatusCode::OK, "{imported}");
    assert_eq!(imported["data"][0]["status"], "imported", "{imported}");
    assert_eq!(
        imported["data"][0]["title"],
        "Constructing redox-active sites"
    );
    assert_eq!(imported["data"][1]["status"], "failed");
    assert!(imported["data"][1]["message"]
        .as_str()
        .unwrap()
        .contains("WebDAV"));
    let document_id = imported["data"][0]["document_id"]
        .as_str()
        .unwrap()
        .to_string();
    let doc = state.db.get_document(&document_id).expect("document");
    assert_eq!(doc.title, "Constructing redox-active sites");
    assert_eq!(doc.year, Some(2026));

    // 再导入同一文件：不重复上传；把它挂到已翻译的任务上后，返回可复用的任务。
    let upload = state
        .db
        .find_upload_for_document(&document_id)
        .unwrap()
        .expect("upload");
    state
        .db
        .link_job_to_document(JOB_ID, &upload.upload_id)
        .expect("link");
    let (_, again) = call(state.clone(), "POST", import_uri, Some(import_body)).await;
    assert_eq!(again["data"][0]["status"], "existing");
    assert_eq!(again["data"][0]["document_id"], document_id.as_str());
    assert_eq!(again["data"][0]["translation_job_id"], JOB_ID);
    assert_eq!(
        state.db.uploads_for_document(&document_id).unwrap().len(),
        1
    );

    let (_, items) = call(state.clone(), "GET", items_uri, None).await;
    assert_eq!(
        items["data"]["items"][0]["attachments"][0]["document_id"],
        document_id.as_str()
    );

    // 导出笔记：用 Zotero 元数据命名并写 frontmatter。
    let (status, _, body) = export(state.clone(), "").await;
    assert_eq!(status, StatusCode::OK);
    let entries = zip_entries(body);
    let (name, note) = entries.first().expect("note");
    assert_eq!(name, "Chai2026Constructing.md");
    let note = String::from_utf8(note.clone()).unwrap();
    assert!(
        note.contains("zotero: \"zotero://select/library/items/ITEM0001\""),
        "{note}"
    );
    assert!(note.contains("zotero_pdf: \"zotero://open-pdf/library/items/ATT00001\""));
    // 导出时实时读到的批注与子笔记。
    assert!(
        note.contains("> [!quote] 第 2 页 · [在 Zotero 中定位](zotero://open-pdf/library/items/ATT00001?page=2&annotation=ANNOT001)
> redox-active sites

关键"),
        "{note}"
    );
    assert!(
        note.contains(
            "## Zotero 笔记

读后：**重要**"
        ),
        "{note}"
    );

    let (status, _) = call(
        state.clone(),
        "GET",
        "/api/v1/integrations/zotero/items?library_id=users/123",
        None,
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}
