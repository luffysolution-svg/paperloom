use super::*;
use crate::models::domain::{
    CreateJobInput, JobArtifacts, OcrProviderDiagnostics, OcrProviderKind, UploadRecord,
};

struct TestDb {
    db: Db,
    root: std::path::PathBuf,
}

impl TestDb {
    fn new() -> Self {
        let root = std::env::temp_dir().join(format!("retain-job-selection-{}", fastrand::u64(..)));
        let db = Db::new(root.join("jobs.db"), root.clone());
        db.init().unwrap();
        Self { db, root }
    }

    fn seed(
        &self,
        id: &str,
        workflow: WorkflowKind,
        status: JobStatusKind,
        provider: OcrProviderKind,
    ) {
        let mut job = JobSnapshot::new(
            id.into(),
            CreateJobInput {
                workflow,
                ..Default::default()
            },
            vec![],
        );
        job.status = status;
        job.updated_at = "2026-01-01T00:00:00Z".into();
        job.artifacts = Some(JobArtifacts {
            ocr_provider_diagnostics: Some(OcrProviderDiagnostics::new(provider)),
            ..Default::default()
        });
        self.db.save_job(&job).unwrap();
    }
}

impl Drop for TestDb {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.root);
    }
}

fn ids(jobs: &[JobSnapshot]) -> Vec<&str> {
    jobs.iter().map(|job| job.job_id.as_str()).collect()
}

#[test]
fn provider_status_and_workflow_filter_before_stable_pagination() {
    let test = TestDb::new();
    test.seed(
        "6-ocr",
        WorkflowKind::Ocr,
        JobStatusKind::Queued,
        OcrProviderKind::Paddle,
    );
    test.seed(
        "5-failed",
        WorkflowKind::Book,
        JobStatusKind::Failed,
        OcrProviderKind::Paddle,
    );
    test.seed(
        "4-mineru",
        WorkflowKind::Book,
        JobStatusKind::Queued,
        OcrProviderKind::Mineru,
    );
    test.seed(
        "3-first",
        WorkflowKind::Book,
        JobStatusKind::Queued,
        OcrProviderKind::Paddle,
    );
    test.seed(
        "2-second",
        WorkflowKind::Book,
        JobStatusKind::Queued,
        OcrProviderKind::Paddle,
    );
    test.seed(
        "1-third",
        WorkflowKind::Book,
        JobStatusKind::Queued,
        OcrProviderKind::Paddle,
    );
    let selection = JobListSelection {
        status: Some(&JobStatusKind::Queued),
        workflow: Some(&WorkflowKind::Book),
        provider: Some("PaDdLe"),
        limit: Some(1),
        offset: 1,
        ..Default::default()
    };
    let jobs = test.db.select_jobs(&selection, |_, _| true).unwrap();
    assert_eq!(ids(&jobs), ["2-second"]);
    let excluded = test
        .db
        .select_jobs(
            &JobListSelection {
                workflow: None,
                exclude_ocr: true,
                ..selection
            },
            |_, _| true,
        )
        .unwrap();
    assert_eq!(ids(&excluded), ["2-second"]);
}

#[test]
fn malformed_rows_and_artifacts_do_not_consume_matching_page_slots() {
    let test = TestDb::new();
    for id in [
        "6-bad-request",
        "5-bad-json",
        "4-bad-artifact-field",
        "3-first",
        "2-second",
        "1-third",
    ] {
        test.seed(
            id,
            WorkflowKind::Book,
            JobStatusKind::Queued,
            OcrProviderKind::Paddle,
        );
    }
    let conn = test.db.connect().unwrap();
    conn.execute(
        "UPDATE jobs SET request_json = 'not json' WHERE job_id = '6-bad-request'",
        [],
    )
    .unwrap();
    conn.execute(
        "UPDATE artifacts SET artifacts_json = 'not json' WHERE job_id = '5-bad-json'",
        [],
    )
    .unwrap();
    conn.execute("UPDATE artifacts SET artifacts_json = json_set(artifacts_json, '$.pages_processed', 'invalid') WHERE job_id = '4-bad-artifact-field'", []).unwrap();
    let jobs = test
        .db
        .select_jobs(
            &JobListSelection {
                provider: Some("paddle"),
                limit: Some(2),
                offset: 1,
                ..Default::default()
            },
            |_, _| true,
        )
        .unwrap();
    assert_eq!(ids(&jobs), ["2-second", "1-third"]);
    let without_provider = test
        .db
        .select_jobs(
            &JobListSelection {
                limit: Some(2),
                ..Default::default()
            },
            |_, _| true,
        )
        .unwrap();
    assert_eq!(
        ids(&without_provider),
        ["5-bad-json", "4-bad-artifact-field"]
    );
    assert!(without_provider.iter().all(|job| job.artifacts.is_none()));
}

#[test]
fn unknown_provider_retains_its_typed_meaning() {
    let test = TestDb::new();
    test.seed(
        "unknown-provider",
        WorkflowKind::Book,
        JobStatusKind::Queued,
        OcrProviderKind::Unknown,
    );
    assert_eq!(
        test.db
            .select_jobs(
                &JobListSelection {
                    provider: Some("UNKNOWN"),
                    ..Default::default()
                },
                |_, _| true
            )
            .unwrap()
            .len(),
        1
    );
    for provider in ["unrecognized", " unknown ", ""] {
        assert!(test
            .db
            .select_jobs(
                &JobListSelection {
                    provider: Some(provider),
                    ..Default::default()
                },
                |_, _| true
            )
            .unwrap()
            .is_empty());
    }
}

#[test]
fn joined_upload_search_metadata_matches_trim_and_invalid_path_fallback() {
    let test = TestDb::new();
    test.seed(
        "with-upload",
        WorkflowKind::Book,
        JobStatusKind::Queued,
        OcrProviderKind::Local,
    );
    let upload = UploadRecord {
        upload_id: "upload-a".into(),
        filename: "  My Paper.pdf  ".into(),
        stored_path: "uploads/a.pdf".into(),
        bytes: 4,
        page_count: 1,
        uploaded_at: "2026-01-01T00:00:00Z".into(),
        developer_mode: false,
        content_hash: String::new(),
    };
    test.db.save_upload(&upload).unwrap();
    let conn = test.db.connect().unwrap();
    conn.execute(
        "UPDATE jobs SET upload_id = ?",
        ["\u{2000}\tupload-a\r\u{3000}"],
    )
    .unwrap();
    let mut seen = Vec::new();
    test.db
        .select_jobs(
            &JobListSelection {
                include_upload_filename: true,
                ..Default::default()
            },
            |_, filename| {
                seen.push(filename.map(str::to_string));
                true
            },
        )
        .unwrap();
    assert_eq!(seen, [Some(upload.filename)]);
    conn.execute("UPDATE uploads SET stored_path = '../outside.pdf'", [])
        .unwrap();
    test.db
        .select_jobs(
            &JobListSelection {
                include_upload_filename: true,
                ..Default::default()
            },
            |_, filename| {
                assert!(filename.is_none());
                true
            },
        )
        .unwrap();
}

#[test]
fn streaming_search_and_exact_ids_have_no_ten_thousand_row_cutoff() {
    let test = TestDb::new();
    let request = serde_json::to_string(
        &JobSnapshot::new("seed".into(), CreateJobInput::default(), vec![]).request_payload,
    )
    .unwrap();
    let conn = test.db.connect().unwrap();
    conn.execute(
        "WITH RECURSIVE n(value) AS (SELECT 1 UNION ALL SELECT value + 1 FROM n WHERE value < 10001) \
         INSERT INTO jobs (job_id, workflow, status_json, created_at, updated_at, command_json, request_json, log_tail_json) \
         SELECT printf('job-%05d', value), '\"book\"', '\"queued\"', '2026-01-01', '2026-01-01', '[]', ?1, '[]' FROM n",
        [request],
    ).unwrap();
    let mut visited = 0;
    let jobs = test
        .db
        .select_jobs(
            &JobListSelection {
                limit: Some(1),
                ..Default::default()
            },
            |job, _| {
                visited += 1;
                job.job_id == "job-00001"
            },
        )
        .unwrap();
    assert_eq!(visited, 10001);
    assert_eq!(ids(&jobs), ["job-00001"]);
    let requested: Vec<String> = (1..=10001).map(|id| format!("job-{id:05}")).collect();
    let jobs = test
        .db
        .select_jobs(
            &JobListSelection {
                job_ids: Some(&requested),
                ..Default::default()
            },
            |_, _| true,
        )
        .unwrap();
    assert_eq!(jobs.len(), 10001);
    assert_eq!(jobs.last().unwrap().job_id, "job-00001");
    assert!(test.db.list_jobs(0, 0, None, None).unwrap().is_empty());
    assert_eq!(test.db.list_jobs(501, 0, None, None).unwrap().len(), 501);
}

#[test]
fn streaming_stops_after_the_matching_page() {
    let test = TestDb::new();
    for id in ["4-skip", "3-match", "2-match", "1-never-read"] {
        test.seed(
            id,
            WorkflowKind::Book,
            JobStatusKind::Queued,
            OcrProviderKind::Local,
        );
    }
    let mut visited = Vec::new();
    let jobs = test
        .db
        .select_jobs(
            &JobListSelection {
                offset: 1,
                limit: Some(1),
                ..Default::default()
            },
            |job, _| {
                visited.push(job.job_id.clone());
                job.job_id.ends_with("match")
            },
        )
        .unwrap();
    assert_eq!(ids(&jobs), ["2-match"]);
    assert_eq!(visited, ["4-skip", "3-match", "2-match"]);
}
