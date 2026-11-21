//! pipeline_* 故障注入测试共用的夹具：临时根目录、直连库、一条 running 任务。
//!
//! 放在 tests/support/ 子目录里，cargo 不会把它当成独立的测试二进制。

use std::path::{Path, PathBuf};

use retainpdf_data::db::Db;
use retainpdf_data::models::domain::{JobSnapshot, JobStatusKind};
use retainpdf_data::models::request::CreateJobInput;

/// `<prefix>-<label>-<pid>-<随机数>`；只给路径，不建目录（各测试建的时机不同）。
pub fn fixture_root(prefix: &str, label: &str) -> PathBuf {
    std::env::temp_dir().join(format!(
        "{prefix}-{label}-{}-{}",
        std::process::id(),
        fastrand::u64(..)
    ))
}

/// 按 root 打开库；「进程重启」场景对同一个 root 再调一次即可。
pub fn db(root: &Path) -> Db {
    Db::new(root.join("jobs.db"), root.to_path_buf())
}

/// 故障注入前的起点：库里有一条 running 任务。`command` 只是便于辨认的占位。
pub fn seed_running_job(db: &Db, job_id: &str, command: &str) {
    let mut job = JobSnapshot::new(
        job_id.to_string(),
        CreateJobInput::default(),
        vec![command.to_string()],
    );
    job.status = JobStatusKind::Running;
    db.save_job(&job).expect("seed running job");
}
