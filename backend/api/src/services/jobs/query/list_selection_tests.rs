use super::*;
use crate::api_tests::jobs_common::test_state;
use crate::models::domain::{
    CreateJobInput, JobArtifacts, OcrProviderDiagnostics, OcrProviderKind,
};

#[test]
fn jobs_limit_is_clamped_at_api_boundary_and_library_filters_stay_ignored() {
    let state = test_state("job-list-limit");
    let request = serde_json::to_string(
        &JobSnapshot::new("seed".into(), CreateJobInput::default(), vec![]).request_payload,
    )
    .unwrap();
    let conn = rusqlite::Connection::open(&state.config.jobs_db_path).unwrap();
    conn.execute(
        "WITH RECURSIVE n(value) AS (SELECT 1 UNION ALL SELECT value + 1 FROM n WHERE value < 501) \
         INSERT INTO jobs (job_id, workflow, status_json, created_at, updated_at, command_json, request_json, log_tail_json) \
         SELECT printf('job-%05d', value), '\"book\"', '\"queued\"', '2026-01-01', '2026-01-01', '[]', ?1, '[]' FROM n",
        [request],
    ).unwrap();
    for (limit, expected) in [(0, 1), (500, 500), (501, 500), (u32::MAX, 500)] {
        let query = serde_json::from_value(
            serde_json::json!({"limit":limit, "q":"no match", "job_ids":"missing"}),
        )
        .unwrap();
        assert_eq!(
            list_jobs_filtered(&state.db, &query).unwrap().len(),
            expected
        );
    }
    let query = serde_json::from_value(serde_json::json!({"limit":1, "offset":1})).unwrap();
    assert_eq!(
        list_jobs_filtered(&state.db, &query).unwrap()[0].job_id,
        "job-00500"
    );
}

#[test]
fn jobs_provider_filter_is_applied_before_pagination() {
    let state = test_state("job-list-provider");
    for (id, provider) in [
        ("3-nonmatching", OcrProviderKind::Mineru),
        ("2-first", OcrProviderKind::Paddle),
        ("1-second", OcrProviderKind::Paddle),
    ] {
        let mut job = JobSnapshot::new(id.into(), CreateJobInput::default(), vec![]);
        job.updated_at = "2026-01-01T00:00:00Z".into();
        job.artifacts = Some(JobArtifacts {
            ocr_provider_diagnostics: Some(OcrProviderDiagnostics::new(provider)),
            ..Default::default()
        });
        state.db.save_job(&job).unwrap();
    }
    let query =
        serde_json::from_value(serde_json::json!({"provider":"PADDLE", "limit":1, "offset":1}))
            .unwrap();
    let jobs = list_jobs_filtered(&state.db, &query).unwrap();
    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].job_id, "1-second");
}
