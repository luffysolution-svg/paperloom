//! 长时间网络传输（上传 PDF、下载识别结果、下载插图）期间的进度与取消。
//!
//! 这几步单次就要几十秒到几分钟，期间既没有阶段写入、也看不到取消：
//! 上传 5.2 MB 要 82s，界面一直停在「OCR provider transport 启动中」；任务取消后
//! 上传又跑了 2 分钟才超时，最后还写了 failed 终态。
//!
//! 这里把传输 future 和两个定时器放进同一个 select：
//! - 每 [`CANCEL_CHECK_INTERVAL`] 查一次取消（含父任务），取消就直接 drop 传输
//!   future —— 连接随之关闭，不用等超时；
//! - 每 `progress_interval` 写一次 stage_detail 并持久化。
//!
//! 传输 future 只借用 client / 路径 / payload，不借用 job，所以和这里改写 job 不冲突。

use std::future::Future;
use std::time::Duration;

use anyhow::Result;
use tokio::time::{interval_at, Instant, MissedTickBehavior};

use crate::job_runner::cancel_registry::should_stop_ocr_child;
use crate::job_runner::ProcessRuntimeDeps;
use crate::models::domain::{now_iso, JobRuntimeState};

use super::save_ocr_job;

/// 取消检查的间隔。查的是内存里的取消登记表，开销可以忽略。
pub(super) const CANCEL_CHECK_INTERVAL: Duration = Duration::from_millis(500);
/// 上传 / 结果下载的「已用 xx 秒」刷新间隔。
pub(super) const TRANSFER_PROGRESS_INTERVAL: Duration = Duration::from_secs(2);

pub(super) enum Watched<T> {
    Finished(T),
    /// 传输期间收到取消，传输 future 已被丢弃。调用方应当原样返回 `Ok(())`，
    /// 让 ocr_flow/mod.rs 的取消检查点写 canceled 终态。
    Canceled,
}

/// 驱动 `transfer` 直到完成或被取消，期间按 `progress_interval` 刷新进度。
///
/// `describe` 拿到已用时间，返回要写的 stage_detail；返回 None 表示这一轮没有
/// 新内容可写（比如插图计数没变），跳过持久化。
///
/// 进度写入失败只记日志不中断传输 —— 进度是给人看的，不值得为它丢掉一次上传。
pub(super) async fn watch_transfer<T, F, D>(
    deps: &ProcessRuntimeDeps,
    job: &mut JobRuntimeState,
    parent_job_id: Option<&str>,
    transfer: F,
    progress_interval: Duration,
    mut describe: D,
) -> Result<Watched<T>>
where
    F: Future<Output = T>,
    D: FnMut(Duration) -> Option<String>,
{
    let parent_cancel_ids: Vec<String> = parent_job_id.iter().map(|v| v.to_string()).collect();
    let started = Instant::now();
    let mut cancel_tick = interval_at(started + CANCEL_CHECK_INTERVAL, CANCEL_CHECK_INTERVAL);
    cancel_tick.set_missed_tick_behavior(MissedTickBehavior::Delay);
    let mut progress_tick = interval_at(started + progress_interval, progress_interval);
    progress_tick.set_missed_tick_behavior(MissedTickBehavior::Delay);
    tokio::pin!(transfer);

    loop {
        tokio::select! {
            // 传输先完成就以传输为准，哪怕同一时刻也到了取消检查。
            biased;
            output = &mut transfer => return Ok(Watched::Finished(output)),
            _ = cancel_tick.tick() => {
                if should_stop_ocr_child(
                    deps.canceled_jobs.as_ref(),
                    deps.db.as_ref(),
                    &job.job_id,
                    &parent_cancel_ids,
                )
                .await
                {
                    return Ok(Watched::Canceled);
                }
            }
            _ = progress_tick.tick() => {
                let Some(detail) = describe(started.elapsed()) else {
                    continue;
                };
                job.stage_detail = Some(detail);
                job.updated_at = now_iso();
                if let Err(err) = save_ocr_job(deps, job, parent_job_id).await {
                    tracing::warn!(
                        job_id = %job.job_id,
                        error = %err,
                        "failed to persist OCR transfer progress"
                    );
                }
            }
        }
    }
}

/// 进度文案里的文件大小：「5.2 MB」。
pub(super) fn format_megabytes(bytes: u64) -> String {
    format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
}

/// 「正在上传 PDF 到 Paddle（5.2 MB）」；拿不到大小时省掉括号。
pub(super) fn upload_detail(provider: &str, file_bytes: Option<u64>) -> String {
    match file_bytes {
        Some(bytes) => format!("正在上传 PDF 到 {provider}（{}）", format_megabytes(bytes)),
        None => format!("正在上传 PDF 到 {provider}"),
    }
}

/// 在基础文案后面补「· 已用 xx 秒」。
pub(super) fn with_elapsed(base: &str, elapsed: Duration) -> String {
    format!("{base} · 已用 {} 秒", elapsed.as_secs())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::job_runner::process_runner::tests::test_runtime_deps;
    use crate::job_runner::test_support::runtime_job;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;

    #[test]
    fn upload_detail_includes_size_when_known() {
        assert_eq!(
            upload_detail("Paddle", Some(5_452_595)),
            "正在上传 PDF 到 Paddle（5.2 MB）"
        );
        assert_eq!(upload_detail("MinerU", None), "正在上传 PDF 到 MinerU");
        assert_eq!(
            with_elapsed("正在上传 PDF 到 Paddle（5.2 MB）", Duration::from_secs(12)),
            "正在上传 PDF 到 Paddle（5.2 MB） · 已用 12 秒"
        );
    }

    #[tokio::test]
    async fn finished_transfer_returns_its_output() {
        let deps = test_runtime_deps(1);
        let mut job = runtime_job();
        let watched = watch_transfer(
            &deps,
            &mut job,
            None,
            async { 42 },
            TRANSFER_PROGRESS_INTERVAL,
            |_| None,
        )
        .await
        .expect("watch");
        assert!(matches!(watched, Watched::Finished(42)));
    }

    /// 取消要直接打断传输，而不是等它自己超时：传输 future 必须被 drop，
    /// 不能跑到结尾。
    #[tokio::test]
    async fn cancel_drops_the_in_flight_transfer() {
        let deps = test_runtime_deps(1);
        let mut job = runtime_job();
        deps.canceled_jobs.write().await.insert(job.job_id.clone());
        let completed = Arc::new(AtomicBool::new(false));
        let flag = completed.clone();
        let transfer = async move {
            tokio::time::sleep(Duration::from_secs(600)).await;
            flag.store(true, Ordering::SeqCst);
        };

        let begun = Instant::now();
        let watched = watch_transfer(
            &deps,
            &mut job,
            None,
            transfer,
            TRANSFER_PROGRESS_INTERVAL,
            |_| None,
        )
        .await
        .expect("watch");

        assert!(matches!(watched, Watched::Canceled));
        assert!(!completed.load(Ordering::SeqCst), "取消后传输不该跑完");
        assert!(
            begun.elapsed() <= CANCEL_CHECK_INTERVAL * 2,
            "取消应当在一个检查周期内生效，实际 {:?}",
            begun.elapsed()
        );
    }

    /// book 任务里用户点的是父任务，子任务的上传也得停。
    #[tokio::test]
    async fn parent_cancel_also_stops_the_transfer() {
        let deps = test_runtime_deps(1);
        let mut job = runtime_job();
        deps.canceled_jobs
            .write()
            .await
            .insert("parent-job".to_string());
        let watched = watch_transfer(
            &deps,
            &mut job,
            Some("parent-job"),
            tokio::time::sleep(Duration::from_secs(600)),
            TRANSFER_PROGRESS_INTERVAL,
            |_| None,
        )
        .await
        .expect("watch");
        assert!(matches!(watched, Watched::Canceled));
    }

    /// 传输期间每个进度周期都要刷新 stage_detail，而不是一直停在开始那句。
    #[tokio::test]
    async fn progress_ticks_update_stage_detail_during_transfer() {
        let deps = test_runtime_deps(1);
        let mut job = runtime_job();
        job.stage_detail = Some("OCR provider transport 启动中".to_string());
        let mut calls = 0;
        // 真实时间：1s 的传输、200ms 一次进度，理论上刷新 4 次。机器忙时可能少一两次，
        // 所以只要求「刷新过不止一次，且最后写进去的就是最后一次的文案」。
        let watched = watch_transfer(
            &deps,
            &mut job,
            None,
            tokio::time::sleep(Duration::from_millis(1000)),
            Duration::from_millis(200),
            |_| {
                calls += 1;
                Some(format!("正在上传 PDF 到 Paddle（5.2 MB） · 第 {calls} 次刷新"))
            },
        )
        .await
        .expect("watch");

        assert!(matches!(watched, Watched::Finished(())));
        assert!(calls >= 2, "传输期间应当多次刷新进度，实际 {calls} 次");
        assert_eq!(
            job.stage_detail,
            Some(format!("正在上传 PDF 到 Paddle（5.2 MB） · 第 {calls} 次刷新"))
        );
    }
}
