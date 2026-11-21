//! 进程内模式的后端退出时，停掉还在跑的 worker。
//!
//! worker 自成进程组、没有 `kill_on_drop`，后端退出后它们接着跑：桌面版关掉以后接着翻、接着花模型的钱，
//! 没人读它的 stdout，进度也不进库，直到下次启动被 `reconcile_stale_running_jobs` 杀掉。
//! 用户 2026-10-24 定：退出时停掉。Docker 里容器停了进程本来就全没，这里只是一样的结果提前到退出时。

use anyhow::Result;
use tracing::{info, warn};

use crate::config::AppConfig;
use crate::db::Db;
use crate::models::domain::JobStatusKind;

use super::worker_identity::{classify_process_record, RecordedWorker};
use super::worker_process::terminate_job_process_tree_blocking;

/// 终止库里 running 任务还活着的 worker 进程树（杀之前核对进程身份，pid 被别的进程复用了不碰），**不改库**：
/// 任务行留在 running，下次启动由 `reconcile_stale_running_jobs` 照常接手（有检查点的自动续跑）。
///
/// 调用前要先停掉 tokio 运行时：driver 和读 stdout 的任务不再跑，不会把被终止的 worker 当成失败写进库。
/// 几个 worker 并行终止（各自 SIGTERM、宽限 `worker_terminate_grace_secs` 后 SIGKILL），桌面版只给后端 10 秒退出。
/// 返回终止了几个。远端模式（jobsd 管 worker）不要调。
pub fn terminate_running_workers_on_shutdown(config: &AppConfig, db: &Db) -> Result<usize> {
    let pids: Vec<(String, u32)> = db
        .list_job_process_records_with_status(&JobStatusKind::Running)?
        .into_iter()
        .filter_map(|record| match classify_process_record(&record) {
            Some((pid, RecordedWorker::Ours)) => Some((record.job_id.clone(), pid)),
            _ => None,
        })
        .collect();
    let grace = config.job_runner.worker_terminate_grace_secs;
    let poll = config.job_runner.worker_terminate_poll_ms;
    std::thread::scope(|scope| {
        for (job_id, pid) in &pids {
            scope.spawn(move || {
                info!("shutdown: terminating worker pid={pid} of job {job_id}; it resumes on next start");
                if let Err(error) = terminate_job_process_tree_blocking(*pid, grace, poll) {
                    warn!("shutdown: failed to terminate worker pid={pid} of job {job_id}: {error:#}");
                }
            });
        }
    });
    Ok(pids.len())
}

#[cfg(all(test, any(target_os = "linux", target_os = "macos")))]
mod tests {
    use std::os::unix::process::CommandExt;

    use crate::models::domain::{JobSnapshot, JobStatusKind};
    use crate::models::request::CreateJobInput;

    fn spawn_group_leader_sleep() -> std::process::Child {
        std::process::Command::new("sleep")
            .arg("60")
            .process_group(0)
            .spawn()
            .expect("spawn sleep")
    }

    fn seed_running(db: &crate::db::Db, id: &str, pid: u32) {
        let mut job = JobSnapshot::new(id.to_string(), CreateJobInput::default(), vec![]);
        job.status = JobStatusKind::Running;
        job.stage = Some("translating".to_string());
        job.pid = Some(pid);
        db.save_job(&job).expect("save job");
    }

    /// 自己的 worker 被终止，任务行一个字都不改（留给下次启动的对账）；pid 被复用了的不碰。
    #[test]
    fn shutdown_terminates_our_workers_and_leaves_the_rows_for_next_start() {
        let deps = crate::job_runner::process_runner::tests::test_runtime_deps(1);
        let db = deps.db.as_ref();
        let mut ours = spawn_group_leader_sleep();
        seed_running(db, "ours", ours.id());
        db.record_worker_identity("ours", retainpdf_proc::process_identity(ours.id()).as_deref())
            .unwrap();
        let mut stranger = spawn_group_leader_sleep();
        seed_running(db, "reused", stranger.id());
        db.record_worker_identity("reused", Some(&format!("{}@darwin:1.000000", stranger.id())))
            .unwrap();
        let before = db.get_job("ours").unwrap();

        let terminated = super::terminate_running_workers_on_shutdown(&deps.config, db).expect("shutdown");

        assert_eq!(terminated, 1);
        assert!(!ours.wait().expect("reap").success(), "自己的 worker 应被信号终止");
        std::thread::sleep(std::time::Duration::from_millis(200));
        assert!(stranger.try_wait().expect("poll").is_none(), "pid 被复用的进程不能碰");
        let after = db.get_job("ours").unwrap();
        assert_eq!(after.status, JobStatusKind::Running);
        assert_eq!(after.pid, before.pid);
        assert_eq!(after.updated_at, before.updated_at);
        let _ = stranger.kill();
        let _ = stranger.wait();
        let _ = std::fs::remove_dir_all(deps.config.project_root.clone());
    }
}
