//! 派生缓存的定期回收（`RUST_API_DERIVED_CACHE_RETENTION_DAYS`）：整轮清理只删终态任务的、生成超过保留天数的
//! 派生缓存，在跑的任务、管线写的产物、没过期的缓存都不动；保留天数 0 时什么都不删。

use std::fs;
use std::path::Path;
use std::time::{Duration, SystemTime};

use super::jobs_common::test_state;
use crate::app::{run_cleanup_once, RetentionSettings};
use crate::models::{CreateJobInput, JobSnapshot, JobStatusKind};

const DAY: Duration = Duration::from_secs(24 * 3600);

fn settings(derived_cache_retention_days: u64) -> RetentionSettings {
    RetentionSettings {
        events_retention_days: 0,
        orphan_upload_retention_hours: 0,
        derived_cache_retention_days,
    }
}

fn save_job(state: &crate::AppState, job_id: &str, status: JobStatusKind) {
    let mut job = JobSnapshot::new(job_id.to_string(), CreateJobInput::default(), vec!["python".into()]);
    job.status = status;
    job.sync_runtime_state();
    state.db.save_job(&job).expect("save job");
}

fn write_aged(path: &Path, age: Duration) {
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, b"cache").unwrap();
    fs::File::options()
        .write(true)
        .open(path)
        .unwrap()
        .set_modified(SystemTime::now() - age)
        .unwrap();
}

#[test]
fn only_old_caches_of_finished_jobs_are_removed() {
    let state = test_state("derived-cache-retention");
    let data_root = state.config.data_root.clone();
    save_job(&state, "job-done", JobStatusKind::Succeeded);
    save_job(&state, "job-failed", JobStatusKind::Failed);
    save_job(&state, "job-running", JobStatusKind::Running);
    let artifacts = |job_id: &str| data_root.join("jobs").join(job_id).join("artifacts");

    let old_done = artifacts("job-done").join("job-done-side-by-side.pdf");
    let old_failed = artifacts("job-failed").join("preview-source-p0001-w1200-d0.jpg");
    let fresh_done = artifacts("job-done").join("output.linearized.pdf");
    let pipeline_output = artifacts("job-done").join("pipeline_summary.json");
    let running = artifacts("job-running").join("job-running-side-by-side.pdf");
    let book_page = data_root.join("documents").join("doc-a").join("pages").join("p0001-w1200-d0.jpg");
    for path in [&old_done, &old_failed, &pipeline_output, &running, &book_page] {
        write_aged(path, 40 * DAY);
    }
    write_aged(&fresh_done, DAY);

    run_cleanup_once(&settings(0), &state.db, &data_root).expect("disabled sweep");
    for path in [&old_done, &old_failed, &fresh_done, &pipeline_output, &running, &book_page] {
        assert!(path.exists(), "保留天数 0 时不删：{}", path.display());
    }

    run_cleanup_once(&settings(30), &state.db, &data_root).expect("sweep");
    assert!(!old_done.exists());
    assert!(!old_failed.exists());
    assert!(!book_page.exists());
    assert!(fresh_done.exists(), "没过期的留着");
    assert!(pipeline_output.exists(), "管线写的产物不碰");
    assert!(running.exists(), "在跑的任务不碰");
}
