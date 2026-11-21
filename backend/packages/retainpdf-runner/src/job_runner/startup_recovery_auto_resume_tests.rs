//! 自动续跑次数上限（崩溃循环熔断）：启动恢复和运行期巡检共用 `reconcile_running_jobs_matching`，
//! 这里直接测启动恢复的入口。

use std::fs;

use crate::db::{Db, PipelineUnitCommit};
use crate::models::domain::{JobSnapshot, JobStatusKind::*};
use crate::models::request::CreateJobInput;

const LIMIT_CODE: &str = "auto_resume_limit_exceeded";

fn seed_running_render_job(db: &Db, job_id: &str) {
    let mut job = JobSnapshot::new(job_id.to_string(), CreateJobInput::default(), vec![]);
    job.status = Running;
    job.stage = Some("rendering".to_string());
    db.save_job(&job).expect("save job");
    db.acquire_pipeline_attempt(job_id, &format!("worker:{job_id}"), "render", 2)
        .expect("attempt");
}

/// 自动续跑起来的那次运行认领了 attempt，跑着跑着又把运行时弄崩：行回到 running、没有 driver。
fn resumed_run_crashes_again(db: &Db, job_id: &str, commit_page: Option<u64>) {
    let cursor = db
        .acquire_pipeline_attempt(job_id, &format!("worker:{job_id}"), "render", 2)
        .expect("resumed run claims the attempt");
    if let Some(page) = commit_page {
        db.commit_pipeline_unit(
            &cursor,
            &PipelineUnitCommit {
                unit_key: format!("page-{page}"),
                unit_order: page,
                page_index: None,
                page_hash: "a".repeat(64),
                producer_generation: None,
                payload: serde_json::json!({}),
            },
        )
        .expect("commit unit");
    }
    let mut job = db.get_job(job_id).unwrap();
    job.status = Running;
    job.pid = None;
    db.save_job(&job).unwrap();
}

/// 回归：一份能把运行时弄崩的输入，每次重启都被自动续跑、再次弄崩，没有尽头。
/// 连续自动续跑 3 次都没有新进度，第 4 次发现它时按失败收尾、attempt 收尾、不再出现在续跑名单里。
#[test]
fn auto_resume_gives_up_after_the_limit_when_no_progress_is_made() {
    let deps = crate::job_runner::process_runner::tests::test_runtime_deps(1);
    let db = deps.db.as_ref();
    seed_running_render_job(db, "crashy");

    for round in 1..=3 {
        super::reconcile_stale_running_jobs(&deps.config, db).expect("startup recovery");
        let job = db.get_job("crashy").unwrap();
        assert_eq!(job.status, Queued, "第 {round} 次还在上限内，应自动续跑");
        assert!(db.list_resumable_pipeline_job_ids().unwrap().contains(&"crashy".to_string()));
        resumed_run_crashes_again(db, "crashy", None);
    }

    super::reconcile_stale_running_jobs(&deps.config, db).expect("startup recovery");
    let job = db.get_job("crashy").unwrap();
    assert_eq!(job.status, Failed, "超过自动续跑上限必须落失败，而不是再续跑一次");
    assert!(job.finished_at.is_some());
    assert!(!db.has_running_pipeline_attempt("crashy").unwrap(), "attempt 要收尾");
    assert!(!db.list_resumable_pipeline_job_ids().unwrap().contains(&"crashy".to_string()));
    let failure = job.failure.as_ref().expect("failure info");
    assert_eq!(failure.failure_code.as_deref(), Some(LIMIT_CODE));
    assert_eq!(failure.category, LIMIT_CODE);
    assert!(failure.summary.contains("自动续跑次数超过上限"), "{}", failure.summary);
    assert!(failure.recovery_hint.as_deref().is_some_and(|hint| !hint.contains("未识别")));
    assert!(job.error.as_deref().is_some_and(|error| error.contains("崩溃")), "{:?}", job.error);

    // 用户手动重试：新的一次运行认领的是新 attempt，计数从零开始。
    let mut job = db.get_job("crashy").unwrap();
    job.status = Running;
    job.failure = None;
    db.save_job(&job).unwrap();
    db.acquire_pipeline_attempt("crashy", "worker:manual", "render", 2).unwrap();
    super::reconcile_stale_running_jobs(&deps.config, db).expect("startup recovery");
    assert_eq!(db.get_job("crashy").unwrap().status, Queued, "手动重试后计数应清零");
    let _ = fs::remove_dir_all(deps.config.project_root.clone());
}

/// 两次中断之间有新进度（提交了新的单元），说明不是卡在同一处崩溃：计数重新开始，
/// 正常的反复重启（桌面端关掉再打开）不会把长任务判死。
#[test]
fn auto_resume_count_restarts_when_the_resumed_run_made_progress() {
    let deps = crate::job_runner::process_runner::tests::test_runtime_deps(1);
    let db = deps.db.as_ref();
    seed_running_render_job(db, "progressing");

    for round in 1..=6 {
        super::reconcile_stale_running_jobs(&deps.config, db).expect("startup recovery");
        assert_eq!(
            db.get_job("progressing").unwrap().status,
            Queued,
            "第 {round} 次：每次都有新进度，不该触发上限"
        );
        resumed_run_crashes_again(db, "progressing", Some(round));
    }
    let _ = fs::remove_dir_all(deps.config.project_root.clone());
}
