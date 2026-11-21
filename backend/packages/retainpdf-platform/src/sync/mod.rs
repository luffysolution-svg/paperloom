//! 多设备同步的应用服务:后台定时同步、立即同步、连通性测试、状态。
//!
//! 同步本身在 `retainpdf_data::sync`(格式与合并规则见那里),设置的读写与「跑一轮并记下
//! 结果」在 `retainpdf_data::sync::control`(命令行在后端没开时也用它)。这里负责:
//! - 后台每隔 `RUST_API_SYNC_INTERVAL_SECS`(默认 60)秒跑一轮,改设置或点「立即同步」
//!   时马上跑;同一时间只跑一轮;数据库恢复期间停住(`pause`);
//! - 其它设备的列表在每轮结束时记在内存里:界面查状态不会再去问 NAS;
//! - 立即同步、改设置整段在单独的 tokio 任务里做完(`crate::detached`):HTTP 请求断开时
//!   锁不提前放,「同一时间只跑一轮」照样成立;查状态、改设置的读写库都在阻塞线程里。

pub mod api;
#[cfg(test)]
mod tests;

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use anyhow::Result;
use retainpdf_data::sync::{SyncControl, SyncSettingsError};

use retainpdf_data::db::Db;
use retainpdf_core::models::api::{SyncPeerView, SyncRunView, SyncSettingsInput, SyncStatusView, SyncTestView};
use retainpdf_core::models::domain::now_iso;

use crate::detached::{blocking, detached, Running};

fn interval_from_env() -> Duration {
    Duration::from_secs(
        retainpdf_core::config::env_vars::env_u64("RUST_API_SYNC_INTERVAL_SECS", 60).max(10),
    )
}

/// 「测试连接」整体最多等多久。每个请求另有短超时(`PROBE_REQUEST_TIMEOUT`,10 秒,不重试),
/// 一次测试通常 3 个请求;这里再兜一层,到点就回 `ok: false`。
const TEST_DEADLINE: Duration = Duration::from_secs(60);

/// 立即同步的结果。
pub(crate) enum SyncRun {
    /// 跑了一轮(成败记在 `last_run`)。
    Ran,
    /// 开关关着。
    Disabled,
    /// 开着,但同步目标没配好。
    NotConfigured,
}

/// 停住同步(数据库恢复期间):拿着期间不开始新的一轮,也不改同步设置。
pub(crate) struct SyncPaused<'a> {
    _run: tokio::sync::MutexGuard<'a, ()>,
    _settings: tokio::sync::MutexGuard<'a, ()>,
}

pub struct SyncService {
    control: SyncControl,
    interval: Duration,
    /// 同一时间只跑一轮。只在 [`detached`] 起的任务里拿着跨过阻塞活。
    run_lock: tokio::sync::Mutex<()>,
    /// 改设置时拿着;恢复期间也拿着(恢复要读恢复前的同步设置再换库,中间不能改)。
    settings_lock: tokio::sync::Mutex<()>,
    running: AtomicBool,
    peers: Mutex<Vec<SyncPeerView>>,
    wake: tokio::sync::Notify,
}

impl SyncService {
    pub fn new(db: Arc<Db>, data_root: PathBuf) -> Self {
        Self {
            control: SyncControl::new((*db).clone(), data_root),
            interval: interval_from_env(),
            run_lock: tokio::sync::Mutex::new(()),
            settings_lock: tokio::sync::Mutex::new(()),
            running: AtomicBool::new(false),
            peers: Mutex::new(Vec::new()),
            wake: tokio::sync::Notify::new(),
        }
    }

    /// 状态(读十来项设置、没设过设备名时起子进程取电脑名,在阻塞线程里做)。
    pub async fn status(&self) -> Result<SyncStatusView> {
        let control = self.control.clone();
        let running = self.running.load(Ordering::SeqCst);
        let interval = self.interval.as_secs();
        let peers = self.peers.lock().expect("sync peers poisoned").clone();
        blocking(move || control.status_view(running, interval, peers)).await
    }

    /// 改设置。开启时必须已配好同步目标;校验不过什么都不改。改成功后马上跑一轮。
    /// 在单独的任务里做完:请求断开时不会在写到一半时放掉设置锁。
    pub async fn update(self: &Arc<Self>, input: &SyncSettingsInput) -> Result<std::result::Result<(), SyncSettingsError>> {
        let this = self.clone();
        let input = input.clone();
        detached(async move {
            let _settings = this.settings_lock.lock().await;
            let control = this.control.clone();
            let outcome = blocking(move || control.update(&input)).await?;
            if outcome.is_ok() {
                this.wake.notify_one();
            }
            Ok(outcome)
        })
        .await
    }

    /// 用给的设置(没给的用已保存的)测一次能不能读写。不改设置、不碰同步数据。WebDAV 用
    /// 短超时、不重试的客户端;整体超过 [`TEST_DEADLINE`] 也回 `ok: false`。
    pub async fn test(self: &Arc<Self>, input: &SyncSettingsInput) -> Result<SyncTestView> {
        let control = self.control.clone();
        let input = input.clone();
        let task = tokio::task::spawn_blocking(move || control.test(&input));
        Ok(match tokio::time::timeout(TEST_DEADLINE, task).await {
            Ok(Ok(view)) => view?,
            Ok(Err(error)) => SyncTestView {
                ok: false,
                location: String::new(),
                latency_ms: None,
                error: Some(format!("测试中断：{error}")),
            },
            Err(_) => SyncTestView {
                ok: false,
                location: String::new(),
                latency_ms: None,
                error: Some(format!("测试连接超时：{} 秒内没有结果", TEST_DEADLINE.as_secs())),
            },
        })
    }

    /// 跑一轮(已经有一轮在跑就等它跑完,再跑一轮)。开关关着或没配好时不跑。整段在单独的
    /// 任务里做完:请求断开时锁在这一轮真正结束后才放,`running` 不会卡住。
    pub(crate) async fn run_once(self: &Arc<Self>) -> Result<SyncRun> {
        let this = self.clone();
        detached(async move {
            let _guard = this.run_lock.lock().await;
            let control = this.control.clone();
            let ready = blocking(move || {
                Ok(if !control.enabled()? {
                    Some(SyncRun::Disabled)
                } else if control.target(None)?.is_none() {
                    Some(SyncRun::NotConfigured)
                } else {
                    None
                })
            })
            .await?;
            if let Some(skipped) = ready {
                return Ok(skipped);
            }
            let _running = Running::raise(&this.running);
            let started_at = now_iso();
            let control = this.control.clone();
            let outcome = tokio::task::spawn_blocking(move || control.run_recorded()).await;
            match outcome {
                Ok(Ok(Some((view, peers)))) => {
                    if view.ok {
                        *this.peers.lock().expect("sync peers poisoned") = peers;
                    }
                    Ok(SyncRun::Ran)
                }
                // 查过之后、跑之前被关掉了。
                Ok(Ok(None)) => Ok(SyncRun::Disabled),
                Ok(Err(error)) => Err(error),
                Err(error) => {
                    // 阻塞线程 panic 了:照样记一笔 last_run,不让界面以为还没跑过。
                    let view = SyncRunView {
                        started_at,
                        finished_at: now_iso(),
                        error: Some(format!("同步中断：{error}")),
                        ..SyncRunView::default()
                    };
                    let control = this.control.clone();
                    let _ = blocking(move || control.record_run(&view)).await;
                    Ok(SyncRun::Ran)
                }
            }
        })
        .await
    }

    /// 停住同步(数据库恢复期间):正在跑的一轮先跑完,拿着它期间不开始新的一轮、不改设置。
    pub(crate) async fn pause(&self) -> SyncPaused<'_> {
        let run = self.run_lock.lock().await;
        let settings = self.settings_lock.lock().await;
        SyncPaused { _run: run, _settings: settings }
    }

    #[cfg(test)]
    pub(crate) fn is_paused(&self) -> bool {
        self.run_lock.try_lock().is_err()
    }

    /// 后台定时同步;改设置时立即醒来。
    pub fn spawn_loop(self: Arc<Self>, mut shutdown: tokio::sync::watch::Receiver<bool>) -> tokio::task::JoinHandle<()> {
        tokio::spawn(async move {
            // 启动后稍等一会儿再跑第一轮,不跟启动抢资源。
            let mut next = Duration::from_secs(10);
            loop {
                tokio::select! {
                    _ = tokio::time::sleep(next) => {}
                    _ = self.wake.notified() => {}
                    _ = shutdown.changed() => return,
                }
                if *shutdown.borrow() {
                    return;
                }
                if let Err(error) = self.run_once().await {
                    tracing::warn!("sync: {error:#}");
                }
                next = self.interval;
            }
        })
    }
}
