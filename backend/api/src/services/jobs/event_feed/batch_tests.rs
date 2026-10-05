use std::{fs, io::Write, path::PathBuf};

use chrono::{Duration, Utc};
use rusqlite::{params, Connection};
use serde_json::{json, Value};

use super::*;
use crate::models::{CreateJobInput, JobArtifacts, JobStatusKind};

struct Fixture {
    root: PathBuf,
    db: Db,
}

impl Fixture {
    fn new(name: &str) -> Self {
        let root = std::env::temp_dir().join(format!("{name}-{}", fastrand::u64(..)));
        let db = Db::new(root.join("jobs.db"), root.clone());
        db.init().unwrap();
        Self { root, db }
    }

    fn job(&self, id: &str, child: Option<&str>) {
        let mut job = JobSnapshot::new(id.into(), CreateJobInput::default(), vec![]);
        job.status = JobStatusKind::Running;
        job.stage = Some("translating".into());
        let root = self.root.join("jobs").join(id);
        fs::create_dir_all(root.join("logs")).unwrap();
        job.artifacts = Some(JobArtifacts {
            job_root: Some(root.to_string_lossy().into_owned()),
            ocr_job_id: child.map(str::to_string),
            ..Default::default()
        });
        self.db.save_job(&job).unwrap();
    }

    fn path(&self, id: &str) -> PathBuf {
        self.root
            .join("jobs")
            .join(id)
            .join("logs/pipeline_events.jsonl")
    }

    fn db_progress(&self, id: &str, seq: i64) {
        Connection::open(&self.root.join("jobs.db")).unwrap().execute(
            "INSERT INTO events(job_id,seq,ts,level,stage,event,message,progress_current,progress_total)
             VALUES(?1,?2,?3,'info','translating','stage_progress','progress',?2,100)",
            params![id, seq, (Utc::now() + Duration::seconds(seq)).to_rfc3339()],
        ).unwrap();
    }

    fn fast(&self, id: &str) -> bool {
        let inputs = self.db.load_event_projection_inputs(&[id]).unwrap();
        sync::cached_stage_basis(&self.root, id, &inputs)
            .unwrap()
            .is_some()
    }

    fn project(&self, id: &str) -> Value {
        let job = self.db.get_job(id).unwrap();
        let batch = live_snapshots(&self.db, &self.root, std::slice::from_ref(&job));
        let result = serde_json::to_value(batch.get(id)).unwrap();
        let single = live_snapshot(&self.db, &self.root, &job);
        assert_eq!(
            result,
            serde_json::to_value(single).unwrap(),
            "batch/single projection parity"
        );
        result
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}

fn line(id: &str, seq: i64) -> String {
    json!({"job_id":id,"ts":(Utc::now()+Duration::seconds(seq)).to_rfc3339(),
        "level":"info","stage":"translating","event_type":"stage_progress",
        "message":format!("JSONL-{seq}"),"progress_current":seq,"progress_total":100})
    .to_string()
        + "\n"
}

#[test]
fn eventless_list_does_not_initialize_empty_feeds() {
    let fs = Fixture::new("batch-stage-empty");
    for n in 0..50 {
        fs.job(&format!("empty-{n}"), None);
    }
    let jobs = fs.db.list_jobs(100, 0, None, None).unwrap();
    assert!(live_snapshots(&fs.db, &fs.root, &jobs).is_empty());
    for job in jobs {
        assert!(fs.fast(&job.job_id));
        assert!(fs.db.load_event_feed(&job.job_id).unwrap().is_none());
    }
}

#[test]
fn summary_lists_skip_cold_history_without_changing_default_live_reads() {
    use crate::models::api::ListJobsQuery;
    use crate::services::book_projection::build_library_book_list_view;
    use crate::services::jobs::presentation::build_job_list_view;

    let fs = Fixture::new("summary-list-cold");
    fs.job("owner", None);
    fs.db_progress("owner", 9);
    let mut file = fs::File::create(fs.path("owner")).unwrap();
    for seq in 10..2010 {
        file.write_all(line("owner", seq).as_bytes()).unwrap();
    }
    drop(file);
    let summary: ListJobsQuery =
        serde_json::from_value(json!({"include_live_stage":false})).unwrap();
    let bytes = files::read_bytes();
    let jobs = build_job_list_view(&fs.db, &fs.root, &summary, "http://test").unwrap();
    let books = build_library_book_list_view(&fs.db, &fs.root, &summary, "http://test").unwrap();
    assert_eq!(jobs.items.len(), 1);
    assert_eq!(books.items.len(), 1);
    assert_eq!(jobs.items[0].status, JobStatusKind::Running);
    assert!(fs.db.load_event_feed("owner").unwrap().is_none());
    assert_eq!(
        bytes,
        files::read_bytes(),
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
fn batch_stage_reuses_unchanged_feeds_and_observes_db_appends_mutations_and_deletes() {
    let fs = Fixture::new("batch-stage-db-deltas");
    fs.job("owner", None);
    fs.db_progress("owner", 1);
    assert!(!fs.fast("owner"));
    assert_eq!(fs.project("owner")["progress_current"], 1);
    assert!(fs.fast("owner"));
    let revision = fs.db.load_event_feed("owner").unwrap().unwrap().revision;
    assert_eq!(fs.project("owner")["progress_current"], 1);
    assert_eq!(
        fs.db.load_event_feed("owner").unwrap().unwrap().revision,
        revision
    );
    fs.db_progress("owner", 2);
    assert!(!fs.fast("owner"));
    assert_eq!(fs.project("owner")["progress_current"], 2);
    let conn = Connection::open(&fs.root.join("jobs.db")).unwrap();
    conn.execute(
        "UPDATE events SET progress_current=42 WHERE job_id='owner' AND seq=2",
        [],
    )
    .unwrap();
    assert!(!fs.fast("owner"));
    assert_eq!(fs.project("owner")["progress_current"], 42);
    conn.execute("DELETE FROM events WHERE job_id='owner' AND seq=2", [])
        .unwrap();
    assert!(!fs.fast("owner"));
    assert_eq!(fs.project("owner")["progress_current"], 1);
}

#[test]
fn batch_stage_observes_partial_jsonl_append_rewrite_replacement_and_removal() {
    let fs = Fixture::new("batch-stage-file-deltas");
    fs.job("owner", None);
    fs.db_progress("owner", 1);
    let path = fs.path("owner");
    fs::write(&path, line("owner", 3)).unwrap();
    assert_eq!(fs.project("owner")["progress_current"], 3);
    assert!(fs.fast("owner"));
    let reads = files::read_bytes();
    assert_eq!(fs.project("owner")["progress_current"], 3);
    assert_eq!(
        files::read_bytes(),
        reads,
        "unchanged files are not parsed again"
    );
    let partial = line("owner", 4);
    let mut file = fs::OpenOptions::new().append(true).open(&path).unwrap();
    file.write_all(partial[..partial.len() - 1].as_bytes())
        .unwrap();
    assert!(!fs.fast("owner"));
    assert_eq!(fs.project("owner")["progress_current"], 3);
    assert!(
        fs.fast("owner"),
        "unchanged partial tail is already accounted for"
    );
    file.write_all(b"\n").unwrap();
    drop(file);
    assert!(!fs.fast("owner"));
    assert_eq!(fs.project("owner")["progress_current"], 4);
    fs::write(&path, line("owner", 5)).unwrap();
    assert!(!fs.fast("owner"));
    assert_eq!(fs.project("owner")["progress_current"], 5);
    let replacement = path.with_extension("replacement");
    fs::write(&replacement, line("owner", 6)).unwrap();
    fs::rename(&replacement, &path).unwrap();
    assert!(!fs.fast("owner"));
    assert_eq!(fs.project("owner")["progress_current"], 6);
    fs::remove_file(path).unwrap();
    assert!(!fs.fast("owner"));
    assert_eq!(fs.project("owner")["progress_current"], 1);
}

#[test]
fn batch_stage_observes_child_creation_updates_and_detachment() {
    let fs = Fixture::new("batch-stage-child-deltas");
    fs.job("owner", Some("child"));
    assert!(fs.fast("owner"));
    fs.job("child", None);
    fs.db_progress("child", 2);
    assert!(!fs.fast("owner"));
    assert_eq!(fs.project("owner")["progress_current"], 2);
    assert!(fs.fast("owner"));
    fs.db_progress("child", 9);
    assert!(!fs.fast("owner"));
    assert_eq!(fs.project("owner")["progress_current"], 9);
    let mut owner = fs.db.get_job("owner").unwrap();
    owner.artifacts.as_mut().unwrap().ocr_job_id = None;
    fs.db.save_job(&owner).unwrap();
    assert!(!fs.fast("owner"));
    assert_eq!(fs.project("owner"), Value::Null);
}

#[test]
fn batch_stage_invalidates_authority_status_and_retention_without_resurrection() {
    let fs = Fixture::new("batch-stage-context-retention");
    fs.job("owner", None);
    fs.db_progress("owner", 1);
    let conn = Connection::open(&fs.root.join("jobs.db")).unwrap();
    let old = (Utc::now() - Duration::days(60)).to_rfc3339();
    conn.execute("UPDATE events SET ts=?1 WHERE job_id='owner'", [&old])
        .unwrap();
    let old_line = json!({"job_id":"owner","ts":old,"stage":"translating","event_type":"stage_progress","message":"old file","progress_current":2,"progress_total":100});
    fs::write(fs.path("owner"), old_line.to_string() + "\n").unwrap();
    fs.project("owner");
    assert!(fs.fast("owner"));
    conn.execute("INSERT INTO pipeline_attempts(job_id,attempt,generation,status,worker_id,created_at,updated_at) VALUES('owner',1,1,'completed','test',?1,?1)", [&old]).unwrap();
    assert!(!fs.fast("owner"));
    fs.project("owner");
    let mut owner = fs.db.get_job("owner").unwrap();
    owner.status = JobStatusKind::Failed;
    fs.db.save_job(&owner).unwrap();
    assert!(!fs.fast("owner"));
    fs.project("owner");
    fs.db.cleanup_expired_events(30).unwrap();
    assert!(!fs.fast("owner"));
    assert_eq!(fs.project("owner"), Value::Null);
    owner.status = JobStatusKind::Running;
    fs.db.save_job(&owner).unwrap();
    assert!(!fs.fast("owner"));
    assert_eq!(fs.project("owner"), Value::Null);
    fs.db_progress("owner", 2);
    assert_eq!(fs.project("owner")["progress_current"], 2);
}

#[test]
fn task_document_and_library_lists_keep_live_progress_and_background_stage_parity() {
    use crate::models::api::{ListDocumentJobsQuery, ListJobsQuery};
    use crate::services::book_projection::{
        build_library_book_detail_view, build_library_book_list_view,
    };
    use crate::services::jobs::presentation::{build_document_job_list_view, build_job_list_view};

    let fs = Fixture::new("batch-list-view-parity");
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
        let books = build_library_book_list_view(&fs.db, &fs.root, &query, "http://test").unwrap();
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
        let book = books
            .items
            .iter()
            .find(|item| item.job_id == "owner")
            .unwrap();
        let job = fs.db.get_job("owner").unwrap();
        let detail = build_library_book_detail_view(&fs.db, &fs.root, &job, "http://test");
        assert_eq!(task, doc_task, "document listing shares the same task view");
        assert_eq!(task["stage_snapshot"]["progress"]["current"], expected);
        assert_eq!(task["background_snapshots"].as_array().unwrap().len(), 1);
        assert_eq!(book.progress.current, Some(expected));
        assert_eq!(
            serde_json::to_value(&book.progress).unwrap(),
            serde_json::to_value(detail.progress).unwrap()
        );
        assert!(fs.fast("owner"));
    }
}
