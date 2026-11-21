//! 书库视图和任务视图要对得上的测试（书架列表 2026-10-22 删了，只剩文档的任务列表和书的封面）。原来写在任务领域的事件流、下载测试里；任务拆成包以后，
//! 任务包引用不到书库（书库依赖任务），挪到这里，测试内容不变。临时库、假渲染器从任务包的
//! `test-fixtures` 特性取。

use std::{fs, io::Write};

use chrono::Utc;
use rusqlite::Connection;
use serde_json::json;

use retainpdf_jobs::{ListDocumentJobsQuery, ListJobsQuery};
use retainpdf_core::models::domain::{now_iso, JobStatusKind, UploadRecord};
use retainpdf_jobs::{
    build_document_job_list_view, build_job_list_view, event_line as line, jsonl_bytes_read,
    Disposition, DownloadFixture, EventFeedFixture, DOWNLOAD_FIXTURE_JOB_ID,
};

use super::{open_document_file, DocumentFile, LibraryDeps};

#[test]
fn summary_lists_skip_cold_history_without_changing_default_live_reads() {

    let fs = EventFeedFixture::new("summary-list-cold");
    fs.job("owner", None);
    fs.db_progress("owner", 9);
    let mut file = fs::File::create(fs.path("owner")).unwrap();
    for seq in 10..2010 {
        file.write_all(line("owner", seq).as_bytes()).unwrap();
    }
    drop(file);
    let summary: ListJobsQuery =
        serde_json::from_value(json!({"include_live_stage":false})).unwrap();
    let bytes = jsonl_bytes_read();
    let jobs = build_job_list_view(&fs.db, &fs.root, &summary, "http://test").unwrap();
    assert_eq!(jobs.items.len(), 1);
    assert_eq!(jobs.items[0].status, JobStatusKind::Running);
    assert!(fs.db.load_event_feed("owner").unwrap().is_none());
    assert_eq!(
        bytes,
        jsonl_bytes_read(),
        "summary never reads JSONL history"
    );

    let full: ListJobsQuery = serde_json::from_value(json!({})).unwrap();
    let jobs = build_job_list_view(&fs.db, &fs.root, &full, "http://test").unwrap();
    assert_eq!(
        jobs.items[0]
            .stage_snapshot
            .as_ref()
            .unwrap()
            .progress
            .current,
        Some(2009)
    );
    assert!(fs.db.load_event_feed("owner").unwrap().is_some());
}

#[test]
fn task_and_document_lists_keep_live_progress_and_background_stage_parity() {

    let fs = EventFeedFixture::new("batch-list-view-parity");
    fs.job("owner", None);
    fs.job("other", None);
    fs.db_progress("owner", 1);
    fs.db_progress("other", 2);
    let conn = Connection::open(fs.root.join("jobs.db")).unwrap();
    conn.execute("UPDATE jobs SET document_id='document'", [])
        .unwrap();
    let background = json!({"job_id":"owner","ts":Utc::now().to_rfc3339(),"level":"info",
        "stage":"rendering","substage":"render_prewarm","lane":"background",
        "event_type":"stage_progress","message":"render payload prewarm: ready",
        "progress_current":2,"progress_total":3,"progress_unit":"step"});
    fs::write(fs.path("owner"), background.to_string() + "\n").unwrap();
    let query: ListJobsQuery = serde_json::from_value(json!({})).unwrap();
    let doc_query: ListDocumentJobsQuery = serde_json::from_value(json!({})).unwrap();
    for round in 0..4 {
        if round == 2 {
            fs.db_progress("owner", 5);
        }
        let expected = if round < 2 { 1 } else { 5 };
        let jobs = build_job_list_view(&fs.db, &fs.root, &query, "http://test").unwrap();
        let doc =
            build_document_job_list_view(&fs.db, &fs.root, "document", &doc_query, "http://test")
                .unwrap();
        let task = serde_json::to_value(
            jobs.items
                .iter()
                .find(|item| item.job_id == "owner")
                .unwrap(),
        )
        .unwrap();
        let doc_task = serde_json::to_value(
            doc.items
                .iter()
                .find(|item| item.job_id == "owner")
                .unwrap(),
        )
        .unwrap();
        assert_eq!(task, doc_task, "document listing shares the same task view");
        assert_eq!(task["stage_snapshot"]["progress"]["current"], expected);
        assert_eq!(task["background_snapshots"].as_array().unwrap().len(), 1);
        assert!(fs.fast("owner"));
    }
}

#[tokio::test(flavor = "current_thread")]
async fn document_images_use_the_same_bounded_generation_without_jobs() {
    let fixture = DownloadFixture::new();
    let document_id = retainpdf_data::db::documents::sha256_hex(b"source");
    fixture
        .db
        .save_upload_with_document(&UploadRecord {
            upload_id: "document-upload".into(),
            filename: "source.pdf".into(),
            stored_path: fixture
                .root
                .join("jobs")
                .join(DOWNLOAD_FIXTURE_JOB_ID)
                .join("source.pdf")
                .to_string_lossy()
                .into_owned(),
            bytes: 6,
            page_count: 1,
            uploaded_at: now_iso(),
            developer_mode: false,
            content_hash: document_id.clone(),
        })
        .unwrap();
    let deps = LibraryDeps {
        db: &fixture.db,
        data_root: &fixture.root,
        output_root: &fixture.root,
        downloads_dir: &fixture.root,
        scripts_dir: &fixture.root,
        python_bin: &fixture.renderer,
        pipeline_command: "",
    };
    let (first, duplicate, thumbnail, ()) = tokio::join!(
        open_document_file(&deps, &fixture.generation, &document_id, DocumentFile::Cover, Disposition::Inline),
        open_document_file(&deps, &fixture.generation, &document_id, DocumentFile::Cover, Disposition::Inline),
        open_document_file(&deps, &fixture.generation, &document_id, DocumentFile::Thumbnail, Disposition::Inline),
        fixture.release_when_started(),
    );
    let cover_path = first.unwrap().path;
    assert_eq!(cover_path, duplicate.unwrap().path);
    let document_root = fixture.root.join("documents").join(document_id);
    assert_eq!(cover_path, document_root.join("cover.jpg"));
    assert_eq!(thumbnail.unwrap().path, document_root.join("thumbnail.jpg"));
    assert_eq!(fixture.render_count(), 2);
}
