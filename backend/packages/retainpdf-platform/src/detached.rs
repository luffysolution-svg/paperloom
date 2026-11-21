//! 备份、恢复、同步共用的两件小工具(2026-10-22,审计 C1)。
//!
//! 处理函数的 future 在 HTTP 客户端断开时会被丢掉:挂在它上面的锁守卫随之释放,
//! `spawn_blocking` 里的活却照跑。所以「拿锁 → 阻塞活 → 放锁、置回 running、跑钩子」整段
//! 放进 [`detached`] 起的 tokio 任务里,请求只等结果(上传那边早就这么做,见
//! `retainpdf-ingest` 的 `uploads/service.rs`);`running` 用 [`Running`] 守卫置回,出错、
//! panic 都不会卡在 true。

use std::future::Future;
use std::sync::atomic::{AtomicBool, Ordering};

use anyhow::{anyhow, Result};

/// 在单独的 tokio 任务里把 `work` 做完,调用方只等结果。调用方被丢掉时任务照样做完。
pub(crate) async fn detached<T: Send + 'static>(
    work: impl Future<Output = Result<T>> + Send + 'static,
) -> Result<T> {
    tokio::spawn(work)
        .await
        .map_err(|error| anyhow!("background task failed: {error}"))?
}

/// 放到阻塞线程里做。
pub(crate) async fn blocking<T: Send + 'static>(work: impl FnOnce() -> Result<T> + Send + 'static) -> Result<T> {
    tokio::task::spawn_blocking(work)
        .await
        .map_err(|error| anyhow!("blocking task failed: {error}"))?
}

/// 拿着它期间标着「正在进行」;丢掉时(包括出错、panic)置回。
pub(crate) struct Running<'a>(&'a AtomicBool);

impl<'a> Running<'a> {
    pub(crate) fn raise(flag: &'a AtomicBool) -> Self {
        flag.store(true, Ordering::SeqCst);
        Self(flag)
    }
}

impl Drop for Running<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}
