//! 库里记的 worker pid 现在还是不是我们的 worker。
//!
//! 启动对账、取消、jobsd 的 terminate 接口都按库里的 pid 组杀进程（`kill(-pid)`）。pid 会被复用：
//! 长时间宕机、重启机器之后，这个号可能已经归了别的程序（macOS 上从 launchd 起的 GUI 程序都是
//! 进程组组长），只用 `kill(pid, 0)` 判「活着」会把它整组杀掉。所以 spawn 时记下进程身份
//! （`retainpdf_proc::process_identity`，pid + 启动时间指纹），杀之前在这里核对。
//!
//! 取舍见 `docs/ops/planning/api-reorg/20261019-worker进程身份与运行时独占.md`。

use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::Result;
use retainpdf_proc::{identity_matches, process_start, worker_process_exists};

use crate::db::{Db, JobProcessRecord};
use crate::models::domain::{seconds_since_iso, JobStatusKind};

/// 没有身份信息的老行：进程启动时刻晚于任务行最后一次写入这么多秒，就认定不是记录里的 worker。
///
/// 真 worker 一定在 pid 落库那一刻之前就已经启动（落库那次写入的 `updated_at` 取的是 spawn 前一刻，
/// 所以要留余量；`updated_at` 只精确到秒）。被复用的 pid 属于 worker 死后、而且运行时也不在了
/// （不再写这一行）之后才起来的进程，正常要晚得多——重启机器就更不用说。
const LEGACY_START_SLACK_SECS: f64 = 30.0;

/// 核对结果。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RecordedWorker {
    /// 就是当初 spawn 的那个 worker（或老行按启动时间判断可能是）：可以杀。
    Ours,
    /// 这个 pid 已经没有进程了。
    Gone,
    /// 这个 pid 有进程，但不是记录里的 worker（号被复用了）：不许杀。
    NotOurs,
}

/// 核对一条任务行记的 pid。
///
/// - 进程不在：`Gone`。
/// - 有身份信息（`<pid>@<指纹>`，pid 对得上）：指纹相同才 `Ours`，不同或读不到当前指纹都是 `NotOurs`。
/// - 没有身份信息（升级前写的老行，或读不到身份的平台；身份串的 pid 和行里的 pid 对不上也算这类）：
///   读得到进程启动时刻时，比任务行最后一次写入还晚 [`LEGACY_START_SLACK_SECS`] 以上就 `NotOurs`；
///   读不到（平台不支持）照旧当 `Ours`——那些平台上本来也没有别的办法。
pub fn classify_recorded_worker(
    pid: u32,
    worker_identity: Option<&str>,
    row_updated_at: &str,
) -> RecordedWorker {
    if pid <= 1 || !worker_process_exists(pid) {
        return RecordedWorker::Gone;
    }
    match worker_identity.and_then(|identity| identity_matches(pid, identity)) {
        Some(true) => return RecordedWorker::Ours,
        Some(false) => return RecordedWorker::NotOurs,
        None => {}
    }
    let (Some(start), Some(row_age_secs)) = (process_start(pid), seconds_since_iso(row_updated_at))
    else {
        return RecordedWorker::Ours;
    };
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64();
    let row_written_at = now - row_age_secs as f64;
    if start.started_unix_secs > row_written_at + LEGACY_START_SLACK_SECS {
        RecordedWorker::NotOurs
    } else {
        RecordedWorker::Ours
    }
}

/// 同上，直接拿任务行的进程记录；没记 pid 时 None。
pub fn classify_process_record(record: &JobProcessRecord) -> Option<(u32, RecordedWorker)> {
    let pid = record.pid?;
    Some((
        pid,
        classify_recorded_worker(pid, record.worker_identity.as_deref(), &record.updated_at),
    ))
}

/// 取消路径用：任务 `job_id` 库里记的 pid 是 `pid`，且核对下来是我们的 worker。
pub fn recorded_worker_is_ours(db: &Db, job_id: &str, pid: u32) -> Result<bool> {
    let Some(record) = db.job_process_record(job_id)? else {
        return Ok(false);
    };
    Ok(record.pid == Some(pid)
        && classify_process_record(&record).map(|(_, verdict)| verdict)
            == Some(RecordedWorker::Ours))
}

/// jobsd 的 terminate 接口用：`pid` 是某个 running 任务登记的 worker，而且核对下来还是它。
/// 返回那个任务的编号；不是登记过的 worker 时 None。
pub fn registered_running_worker(db: &Db, pid: u32) -> Result<Option<String>> {
    for record in db.list_job_process_records_with_pid(pid, &JobStatusKind::Running)? {
        if classify_process_record(&record).map(|(_, verdict)| verdict)
            == Some(RecordedWorker::Ours)
        {
            return Ok(Some(record.job_id));
        }
    }
    Ok(None)
}

#[cfg(all(test, any(target_os = "linux", target_os = "macos")))]
mod tests {
    use super::*;
    use retainpdf_proc::process_identity;

    fn spawn_sleep() -> std::process::Child {
        std::process::Command::new("sleep")
            .arg("30")
            .spawn()
            .expect("spawn sleep")
    }

    /// 行最后一次写入远在进程启动之前。
    const LONG_AGO: &str = "2020-01-01T00:00:00Z";

    #[test]
    fn matching_identity_is_ours_and_a_forged_one_is_not() {
        let mut child = spawn_sleep();
        let pid = child.id();
        let identity = process_identity(pid).expect("identity");
        let long_ago = LONG_AGO;
        // 有身份信息时不看 updated_at：worker 跑了很久也照样认得出。
        assert_eq!(
            classify_recorded_worker(pid, Some(&identity), long_ago),
            RecordedWorker::Ours
        );
        // 同一个 pid、另一个启动时间：号被复用了。
        let forged = format!("{pid}@darwin:1.000000");
        assert_eq!(
            classify_recorded_worker(pid, Some(&forged), long_ago),
            RecordedWorker::NotOurs
        );
        let _ = child.kill();
        let _ = child.wait();
        assert_eq!(
            classify_recorded_worker(pid, Some(&identity), long_ago),
            RecordedWorker::Gone
        );
    }

    #[test]
    fn legacy_rows_fall_back_to_start_time_versus_last_row_write() {
        let mut child = spawn_sleep();
        let pid = child.id();
        // 行最后一次写入在几年前，进程是刚起的：不可能是那一行记的 worker。
        let long_ago = LONG_AGO;
        assert_eq!(
            classify_recorded_worker(pid, None, long_ago),
            RecordedWorker::NotOurs
        );
        // 行刚写过（进程起来之后）：照旧当成我们的。
        let just_now = &crate::models::domain::now_iso();
        assert_eq!(
            classify_recorded_worker(pid, None, just_now),
            RecordedWorker::Ours
        );
        // 身份串是别的 pid 的（陈旧记录）：等于没有身份信息。
        let stale = format!("{}@darwin:1.000000", pid + 1);
        assert_eq!(
            classify_recorded_worker(pid, Some(&stale), just_now),
            RecordedWorker::Ours
        );
        assert_eq!(
            classify_recorded_worker(pid, Some(&stale), long_ago),
            RecordedWorker::NotOurs
        );
        let _ = child.kill();
        let _ = child.wait();
    }

    #[test]
    fn pid_zero_and_one_are_never_workers() {
        assert_eq!(
            classify_recorded_worker(0, None, "2026-01-01T00:00:00Z"),
            RecordedWorker::Gone
        );
        assert_eq!(
            classify_recorded_worker(1, None, "2026-01-01T00:00:00Z"),
            RecordedWorker::Gone
        );
    }
}
