use std::collections::HashSet;
use std::sync::Arc;

use anyhow::{anyhow, Result};
use tokio::sync::{OwnedSemaphorePermit, RwLock, Semaphore};
use tokio::time::{sleep, Duration};

use crate::db::Db;
use crate::models::domain::JobStatusKind;

use super::cancel_registry::{
    clear_cancel_request_with_registry, is_cancel_requested_with_registry,
};

/// 排队等一个运行名额。拿到返回名额；排队期间被取消、删掉、改成了终态返回 None（取消标记顺手清掉）。
///
/// 名额按排队先后给：一直挂在 `Semaphore::acquire_owned` 上（tokio 的信号量按等待先后放行），
/// 每 `queue_poll_interval_ms` 醒一次看取消标记和库里的状态。以前是每轮 `try_acquire` 抢，
/// 名额空出来时谁那一轮先醒谁拿到，先排的不一定先跑。看状态只读状态那一列（`job_status`），
/// 不解码整行：排队的任务多时这是每秒几次乘以排队数。
pub(super) async fn wait_for_execution_slot(
    db: &Db,
    canceled_jobs: &RwLock<HashSet<String>>,
    job_slots: &Arc<Semaphore>,
    job_id: &str,
    queue_poll_interval_ms: u64,
) -> Result<Option<OwnedSemaphorePermit>> {
    let acquire = job_slots.clone().acquire_owned();
    tokio::pin!(acquire);
    loop {
        if !still_waiting(db, canceled_jobs, job_id).await? {
            return Ok(None);
        }
        tokio::select! {
            permit = &mut acquire => {
                let permit = permit.map_err(|_| anyhow!("job execution slots are closed"))?;
                // 等到名额的这一刻也可能刚被取消：交回名额，不开跑。
                if !still_waiting(db, canceled_jobs, job_id).await? {
                    return Ok(None);
                }
                return Ok(Some(permit));
            }
            _ = sleep(Duration::from_millis(queue_poll_interval_ms)) => {}
        }
    }
}

/// 还该接着排：没被取消，库里还是排队或在跑。不是的话清掉取消标记。
async fn still_waiting(
    db: &Db,
    canceled_jobs: &RwLock<HashSet<String>>,
    job_id: &str,
) -> Result<bool> {
    if is_cancel_requested_with_registry(canceled_jobs, job_id).await {
        clear_cancel_request_with_registry(canceled_jobs, job_id).await;
        return Ok(false);
    }
    let status = db
        .job_status(job_id)?
        .ok_or_else(|| anyhow!("job not found: {job_id}"))?;
    if !matches!(status, JobStatusKind::Queued | JobStatusKind::Running) {
        clear_cancel_request_with_registry(canceled_jobs, job_id).await;
        return Ok(false);
    }
    Ok(true)
}
