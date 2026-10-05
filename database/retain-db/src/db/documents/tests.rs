use std::fs;
use std::path::PathBuf;

use rusqlite::params;

use super::*;
use crate::models::api::{FavoriteRecord, FtsBlockRow};
use crate::models::domain::{now_iso, JobStatusKind, UploadRecord, WorkflowKind};

struct TestDbFs {
    root: PathBuf,
    data_root: PathBuf,
    db_path: PathBuf,
}

impl TestDbFs {
    fn new(test_name: &str) -> Self {
        let root = std::env::temp_dir().join(format!(
            "rust-api-db-documents-{test_name}-{}",
            fastrand::u64(..)
        ));
        let data_root = root.join("data");
        let db_path = root.join("db").join("jobs.db");
        fs::create_dir_all(&data_root).expect("create data root");
        fs::create_dir_all(db_path.parent().expect("db parent")).expect("create db dir");
        Self {
            root,
            data_root,
            db_path,
        }
    }

    fn db(&self) -> Db {
        Db::new(self.db_path.clone(), self.data_root.clone())
    }
}

impl Drop for TestDbFs {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}

fn upload_with_hash(upload_id: &str, hash: &str) -> UploadRecord {
    UploadRecord {
        upload_id: upload_id.to_string(),
        filename: "paper.pdf".to_string(),
        stored_path: "uploads/x/paper.pdf".to_string(),
        bytes: 10,
        page_count: 3,
        uploaded_at: now_iso(),
        developer_mode: false,
        content_hash: hash.to_string(),
    }
}

fn favorite_for(document_id: &str, job_id: &str, favorite_id: &str) -> FavoriteRecord {
    FavoriteRecord {
        favorite_id: favorite_id.to_string(),
        document_id: document_id.to_string(),
        job_id: job_id.to_string(),
        page_idx: 4,
        block_id: "p005-b0008".to_string(),
        char_start: None,
        char_end: None,
        kind: "sentence".to_string(),
        quote_text: "quoted source".to_string(),
        translated_quote_text: "引文快照".to_string(),
        note: String::new(),
        asset_id: String::new(),
        rect_json: String::new(),
        created_at: now_iso(),
        updated_at: now_iso(),
    }
}

#[test]
fn active_recovery_job_is_linked_to_document_history() {
    let fs = TestDbFs::new("recovery-history");
    let db = fs.db();
    let upload = upload_with_hash("upload-recovery", "recovery-document");
    db.save_upload(&upload).unwrap();
    db.upsert_document_from_upload(&upload).unwrap();
    let mut input = crate::models::domain::CreateJobInput::default();
    input.source.artifact_job_id = "old-job".into();
    let job = crate::models::domain::JobSnapshot::new("recovery-job".into(), input, vec![]);
    db.save_job(&job).unwrap();
    db.set_document_active_job(&upload.content_hash, &job.job_id, None).unwrap();
    assert_eq!(db.job_ids_for_document(&upload.content_hash).unwrap(), vec![job.job_id.clone()]);
    assert_eq!(db.get_document_by_job_id(&job.job_id).unwrap().unwrap().document_id, upload.content_hash);
}

fn insert_succeeded_job(
    db: &Db,
    document_id: &str,
    job_id: &str,
    workflow: WorkflowKind,
    finished_at: &str,
) {
    let conn = db.connect().expect("connect");
    conn.execute(
        r#"
        INSERT INTO jobs (
            job_id, workflow, status_json, created_at, updated_at, finished_at,
            command_json, request_json, log_tail_json, document_id
        ) VALUES (?1, ?2, ?3, ?4, ?4, ?4, '[]', '{}', '[]', ?5)
        "#,
        params![
            job_id,
            serde_json::to_string(&workflow).expect("workflow json"),
            serde_json::to_string(&JobStatusKind::Succeeded).expect("status json"),
            finished_at,
            document_id,
        ],
    )
    .expect("insert succeeded job");
}

fn seed_document(db: &Db, upload_id: &str, bytes: &[u8]) -> String {
    let document_id = sha256_hex(bytes);
    let upload = upload_with_hash(upload_id, &document_id);
    db.save_upload(&upload).expect("save upload");
    db.upsert_document_from_upload(&upload)
        .expect("upsert document");
    document_id
}

#[test]
fn versioned_migrations_are_idempotent() {
    let fs = TestDbFs::new("migrations");
    let db = fs.db();
    db.init().expect("first init");
    db.init().expect("second init");
    let conn = rusqlite::Connection::open(&fs.db_path).expect("open");
    let version: i64 = conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .expect("user_version");
    // 与迁移阶梯动态同步（写死数字曾在 v3 加入后过期红了一轮）
    assert_eq!(version, crate::db::schema::versioned_migration_count());
}

#[test]
fn same_content_hash_upserts_single_document() {
    let fs = TestDbFs::new("dedupe");
    let db = fs.db();
    db.init().expect("init");
    let hash = sha256_hex(b"same pdf bytes");
    // 生产路径:save_upload 先于 upsert_document(列表过滤依赖 upload 存在)
    let up1 = upload_with_hash("up-1", &hash);
    db.save_upload(&up1).expect("save up-1");
    db.upsert_document_from_upload(&up1).expect("first upsert");
    let up2 = upload_with_hash("up-2", &hash);
    db.save_upload(&up2).expect("save up-2");
    db.upsert_document_from_upload(&up2).expect("second upsert");
    let documents = db
        .list_documents(10, 0, None, None, None, None)
        .expect("list documents");
    assert_eq!(documents.len(), 1);
    assert_eq!(documents[0].document_id, hash);
    assert_eq!(documents[0].title, "paper");
}

#[test]
fn reconcile_active_job_prefers_non_ocr_success_over_newer_ocr_job() {
    let fs = TestDbFs::new("reconcile-prefers-non-ocr");
    let db = fs.db();
    db.init().expect("init");
    let document_id = seed_document(&db, "up-reconcile", b"reconcile workflow priority");
    insert_succeeded_job(
        &db,
        &document_id,
        "job-book",
        WorkflowKind::Book,
        "2026-01-01T00:00:00Z",
    );
    insert_succeeded_job(
        &db,
        &document_id,
        "job-ocr",
        WorkflowKind::Ocr,
        "2026-02-01T00:00:00Z",
    );
    db.set_document_active_job(&document_id, "job-missing", None)
        .expect("set stale active job");

    db.reconcile_document_active_job(&document_id)
        .expect("reconcile active job");

    let document = db.get_document(&document_id).expect("get document");
    assert_eq!(document.active_job_id.as_deref(), Some("job-book"));

    db.delete_job("job-book").expect("delete book job");
    db.reconcile_document_active_job(&document_id)
        .expect("fallback reconcile to ocr");
    let document = db.get_document(&document_id).expect("get document");
    assert_eq!(document.active_job_id.as_deref(), Some("job-ocr"));
}

#[test]
fn active_job_backfill_prefers_non_ocr_success_over_newer_ocr_job() {
    let fs = TestDbFs::new("backfill-prefers-non-ocr");
    let db = fs.db();
    db.init().expect("init");
    let document_id = seed_document(&db, "up-backfill", b"backfill workflow priority");
    insert_succeeded_job(
        &db,
        &document_id,
        "job-book",
        WorkflowKind::Book,
        "2026-01-01T00:00:00Z",
    );
    insert_succeeded_job(
        &db,
        &document_id,
        "job-ocr",
        WorkflowKind::Ocr,
        "2026-02-01T00:00:00Z",
    );

    backfill::backfill_active_jobs(&db).expect("backfill active jobs");

    let document = db.get_document(&document_id).expect("get document");
    assert_eq!(document.active_job_id.as_deref(), Some("job-book"));
}

#[test]
fn backfill_links_artifact_reuse_job_and_refreshes_active_job() {
    let fs = TestDbFs::new("backfill-artifact-reuse-link");
    let db = fs.db();
    db.init().expect("init");
    let document_id = seed_document(&db, "up-artifact-source", b"artifact reuse source");
    insert_succeeded_job(
        &db,
        &document_id,
        "job-ocr-source",
        WorkflowKind::Ocr,
        "2026-01-01T00:00:00Z",
    );
    let conn = db.connect().expect("connect");
    conn.execute(
        r#"
        INSERT INTO jobs (
            job_id, workflow, status_json, created_at, updated_at, finished_at,
            command_json, request_json, log_tail_json
        ) VALUES (?1, ?2, ?3, ?4, ?4, ?4, '[]', ?5, '[]')
        "#,
        params![
            "job-translation-reuse",
            serde_json::to_string(&WorkflowKind::Translate).expect("workflow json"),
            serde_json::to_string(&JobStatusKind::Succeeded).expect("status json"),
            "2026-02-01T00:00:00Z",
            serde_json::json!({
                "source": {"artifact_job_id": "job-ocr-source"}
            })
            .to_string(),
        ],
    )
    .expect("insert artifact reuse job");
    drop(conn);
    db.set_document_active_job(&document_id, "job-ocr-source", None)
        .expect("set old active job");

    backfill::run(&db).expect("run library backfill");

    let linked_document = db
        .get_document_by_job_id("job-translation-reuse")
        .expect("lookup linked document")
        .expect("artifact reuse job should be linked");
    assert_eq!(linked_document.document_id, document_id);
    let document = db.get_document(&document_id).expect("get document");
    assert_eq!(
        document.active_job_id.as_deref(),
        Some("job-translation-reuse")
    );
}

#[test]
fn document_delete_cascades_favorites() {
    let fs = TestDbFs::new("cascade");
    let db = fs.db();
    db.init().expect("init");
    let hash = sha256_hex(b"cascade doc");
    db.upsert_document_from_upload(&upload_with_hash("up-1", &hash))
        .expect("upsert");
    insert_succeeded_job(
        &db,
        &hash,
        "job-1",
        WorkflowKind::Book,
        "2026-01-01T00:00:00Z",
    );
    db.save_favorite(&favorite_for(&hash, "job-1", "fav-1"))
        .expect("save favorite");
    assert_eq!(db.favorites_referencing_job("job-1").expect("count"), 1);
    let conn = db.connect().expect("connect");
    conn.execute(
        "DELETE FROM documents WHERE document_id = ?1",
        params![hash],
    )
    .expect("delete document");
    assert_eq!(db.list_favorites(None).expect("list").len(), 0);
}

#[test]
fn fts_rows_use_exact_asset_caption_for_empty_image_block() {
    let fs = TestDbFs::new("fts-asset-caption");
    let job_root = fs.root.join("job-asset-caption");
    let normalized = job_root.join("ocr/normalized/document.v1.json");
    std::fs::create_dir_all(normalized.parent().expect("normalized parent"))
        .expect("normalized dir");
    std::fs::write(
        &normalized,
        serde_json::to_vec(&serde_json::json!({
            "assets": {
                "asset-figure": {
                    "uri": "md/images/page-1/imgs/figure.png",
                    "caption": "Absorption spectrum under applied field"
                }
            },
            "pages": [{
                "page_index": 0,
                "blocks": [{
                    "block_id": "p001-b0004",
                    "text": "",
                    "type": "image",
                    "content": {
                        "kind": "image",
                        "asset_ids": ["asset-figure"]
                    }
                }]
            }]
        }))
        .expect("normalized json"),
    )
    .expect("write normalized");

    let rows = build_fts_rows_from_job_dir(&job_root).expect("build fts rows");

    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].block_id, "p001-b0004");
    assert_eq!(
        rows[0].source_text,
        "Absorption spectrum under applied field"
    );
}

#[test]
fn fts_trigram_matches_chinese_and_short_query_falls_back() {
    let fs = TestDbFs::new("fts");
    let db = fs.db();
    db.init().expect("init");
    let hash = sha256_hex(b"fts doc");
    db.upsert_document_from_upload(&upload_with_hash("up-1", &hash))
        .expect("upsert");
    db.replace_document_fts(
        &hash,
        "job-1",
        &[FtsBlockRow {
            page_idx: 2,
            block_id: "p003-b0001".to_string(),
            source_text: "vibrationally resolved optical spectra".to_string(),
            translated_text: "振动分辨光学光谱的有效计算方法".to_string(),
        }],
    )
    .expect("fts insert");
    let hits = db.search_blocks("光学光谱", 10, None).expect("search zh");
    assert_eq!(hits.len(), 1);
    assert_eq!(hits[0].document_id, hash);
    assert_eq!(hits[0].page_idx, 2);
    assert_eq!(hits[0].block_id, "p003-b0001");
    // 2 字符查询走 LIKE 回退
    let short_hits = db.search_blocks("光谱", 10, None).expect("search short");
    assert_eq!(short_hits.len(), 1);
    // 单文档过滤：不存在的 document_id 应无命中
    let scoped_miss = db
        .search_blocks("光学光谱", 10, Some("no-such-doc"))
        .expect("search scoped miss");
    assert!(scoped_miss.is_empty());
    let scoped_hit = db
        .search_blocks("光学光谱", 10, Some(&hash))
        .expect("search scoped hit");
    assert_eq!(scoped_hit.len(), 1);
    // 重建幂等:再次替换后仍只有一行
    db.replace_document_fts(
        &hash,
        "job-2",
        &[FtsBlockRow {
            page_idx: 2,
            block_id: "p003-b0001".to_string(),
            source_text: "updated".to_string(),
            translated_text: "更新后的光学光谱".to_string(),
        }],
    )
    .expect("fts rebuild");
    let rebuilt = db
        .search_blocks("光学光谱", 10, None)
        .expect("search rebuilt");
    assert_eq!(rebuilt.len(), 1);
    assert_eq!(rebuilt[0].job_id, "job-2");
}

#[test]
fn update_document_fields_manages_tags_and_status() {
    let fs = TestDbFs::new("patch");
    let db = fs.db();
    db.init().expect("init");
    let hash = sha256_hex(b"patch doc");
    let up = upload_with_hash("up-1", &hash);
    db.save_upload(&up).expect("save upload");
    db.upsert_document_from_upload(&up).expect("upsert");
    let updated = db
        .update_document_fields(
            &hash,
            Some("光谱计算方法综述"),
            Some("reading"),
            Some(&["化学".to_string(), "光谱".to_string()]),
        )
        .expect("patch");
    assert_eq!(updated.title, "光谱计算方法综述");
    assert_eq!(updated.reading_status, "reading");
    assert_eq!(updated.tags, vec!["光谱".to_string(), "化学".to_string()]);
    let filtered = db
        .list_documents(10, 0, None, Some("化学"), None, None)
        .expect("list by tag");
    assert_eq!(filtered.len(), 1);
    assert_eq!(
        db.count_documents(None, Some("化学"), None, None)
            .expect("count by tag"),
        1
    );
    let missed = db
        .list_documents(10, 0, None, Some("生物"), None, None)
        .expect("list by other tag");
    assert!(missed.is_empty());
}

/// 建一篇文档并设好标题：`upload_with_hash` 的文件名是写死的，
/// 文本搜索要同时验标题列与文件名列，所以这里让调用方两者都能指定。
fn seed_titled_document(
    db: &crate::db::Db,
    seed: &str,
    filename: &str,
    title: Option<&str>,
) -> String {
    let hash = sha256_hex(seed.as_bytes());
    let mut upload = upload_with_hash(&format!("up-{seed}"), &hash);
    upload.filename = filename.to_string();
    upload.stored_path = format!("uploads/x/{filename}");
    db.save_upload(&upload).expect("save upload");
    db.upsert_document_from_upload(&upload).expect("upsert");
    if let Some(title) = title {
        db.update_document_fields(&hash, Some(title), None, None)
            .expect("set title");
    }
    hash
}

#[test]
fn document_text_search_matches_title_or_filename() {
    let fs = TestDbFs::new("doc-search");
    let db = fs.db();
    db.init().expect("init");
    seed_titled_document(&db, "a", "spectra.pdf", Some("光谱计算方法综述"));
    seed_titled_document(
        &db,
        "b",
        "attention-is-all-you-need.pdf",
        Some("Attention Is All You Need"),
    );
    seed_titled_document(&db, "c", "misc.pdf", Some("无关文档"));

    // 标题命中
    let by_title = db
        .list_documents(10, 0, None, None, None, Some("光谱"))
        .expect("search by title");
    assert_eq!(by_title.len(), 1);
    assert_eq!(by_title[0].title, "光谱计算方法综述");

    // 文件名命中（标题里没有 "attention" 之外的线索时，文件名也应算）
    let by_filename = db
        .list_documents(10, 0, None, None, None, Some("all-you-need"))
        .expect("search by filename");
    assert_eq!(by_filename.len(), 1);

    // 大小写不敏感（SQLite LIKE 对 ASCII 默认不敏感）
    let case_insensitive = db
        .list_documents(10, 0, None, None, None, Some("ATTENTION"))
        .expect("search case-insensitive");
    assert_eq!(case_insensitive.len(), 1);

    // count 与 list 用同一套过滤
    assert_eq!(
        db.count_documents(None, None, None, Some("光谱"))
            .expect("count"),
        1
    );

    // 无命中
    let miss = db
        .list_documents(10, 0, None, None, None, Some("不存在的词"))
        .expect("search miss");
    assert!(miss.is_empty());
}

#[test]
fn document_text_search_escapes_like_wildcards() {
    // 不转义的话，标题里的 % 和 _ 会被当通配符：搜 "50%" 会命中一切。
    let fs = TestDbFs::new("doc-search-escape");
    let db = fs.db();
    db.init().expect("init");
    seed_titled_document(&db, "pct", "a.pdf", Some("压缩率 50% 报告"));
    seed_titled_document(&db, "plain", "b.pdf", Some("压缩率 5099 报告"));
    seed_titled_document(&db, "under", "c.pdf", Some("run_id 说明"));
    seed_titled_document(&db, "nounder", "d.pdf", Some("runXid 说明"));

    let percent = db
        .list_documents(10, 0, None, None, None, Some("50%"))
        .expect("search percent");
    assert_eq!(percent.len(), 1, "% 必须当字面量，不能匹配 5099");
    assert_eq!(percent[0].title, "压缩率 50% 报告");

    let underscore = db
        .list_documents(10, 0, None, None, None, Some("run_id"))
        .expect("search underscore");
    assert_eq!(underscore.len(), 1, "_ 必须当字面量，不能匹配 runXid");
    assert_eq!(underscore[0].title, "run_id 说明");
}

#[test]
fn document_text_search_combines_with_other_filters() {
    let fs = TestDbFs::new("doc-search-combo");
    let db = fs.db();
    db.init().expect("init");
    let reading = sha256_hex(b"combo-reading");
    let mut up = upload_with_hash("up-combo-1", &reading);
    up.filename = "spectra-a.pdf".to_string();
    db.save_upload(&up).expect("save");
    db.upsert_document_from_upload(&up).expect("upsert");
    db.update_document_fields(&reading, Some("光谱 A"), Some("reading"), None)
        .expect("patch a");

    let unread = sha256_hex(b"combo-unread");
    let mut up2 = upload_with_hash("up-combo-2", &unread);
    up2.filename = "spectra-b.pdf".to_string();
    db.save_upload(&up2).expect("save");
    db.upsert_document_from_upload(&up2).expect("upsert");
    db.update_document_fields(&unread, Some("光谱 B"), Some("unread"), None)
        .expect("patch b");

    // 两篇都含「光谱」，但只有一篇是 reading
    let both = db
        .list_documents(10, 0, None, None, None, Some("光谱"))
        .expect("search only");
    assert_eq!(both.len(), 2);

    let narrowed = db
        .list_documents(10, 0, Some("reading"), None, None, Some("光谱"))
        .expect("search + status");
    assert_eq!(narrowed.len(), 1);
    assert_eq!(narrowed[0].title, "光谱 A");

    assert_eq!(
        db.count_documents(Some("reading"), None, None, Some("光谱"))
            .expect("count combined"),
        1
    );
}

#[test]
fn document_text_search_ignores_blank_query() {
    // 空串/纯空白不应变成 "%%" 把全库当命中——它应当等价于「不过滤」。
    let fs = TestDbFs::new("doc-search-blank");
    let db = fs.db();
    db.init().expect("init");
    seed_titled_document(&db, "x", "x.pdf", Some("甲"));
    seed_titled_document(&db, "y", "y.pdf", Some("乙"));

    let none = db
        .list_documents(10, 0, None, None, None, None)
        .expect("no query");
    let blank = db
        .list_documents(10, 0, None, None, None, Some("   "))
        .expect("blank query");
    assert_eq!(none.len(), 2);
    assert_eq!(blank.len(), none.len(), "空白查询应等价于不过滤");
}
