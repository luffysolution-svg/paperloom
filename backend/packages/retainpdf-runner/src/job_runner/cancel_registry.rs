use std::collections::HashSet;

use tokio::sync::RwLock;

use crate::db::Db;
use crate::models::domain::JobStatusKind;

pub async fn request_cancel_with_registry(canceled_jobs: &RwLock<HashSet<String>>, job_id: &str) {
    let mut canceled_jobs = canceled_jobs.write().await;
    canceled_jobs.insert(job_id.to_string());
}

pub async fn clear_cancel_request_with_registry(
    canceled_jobs: &RwLock<HashSet<String>>,
    job_id: &str,
) {
    let mut canceled_jobs = canceled_jobs.write().await;
    canceled_jobs.remove(job_id);
}

pub(super) async fn is_cancel_requested_with_registry(
    canceled_jobs: &RwLock<HashSet<String>>,
    job_id: &str,
) -> bool {
    let canceled_jobs = canceled_jobs.read().await;
    canceled_jobs.contains(job_id)
}

pub(super) async fn is_cancel_requested_any(
    canceled_jobs: &RwLock<HashSet<String>>,
    job_id: &str,
    extra_cancel_job_ids: &[String],
) -> bool {
    if is_cancel_requested_with_registry(canceled_jobs, job_id).await {
        return true;
    }
    let canceled_jobs = canceled_jobs.read().await;
    extra_cancel_job_ids
        .iter()
        .any(|value| canceled_jobs.contains(value))
}

/// 这个任务的行是不是被删了（强制删除运行中的任务 / 整本书）。
///
/// 只有「读库成功且确实没有这一行」才算；读库出错不当成删除（宁可多跑一步，不能误杀）。
/// runner 的落库写（CAS）在行不存在时返回「没更新」，写的人用它区分「被取消 / 已终态」和「被删了」，
/// 后者要连 worker 进程一起停掉，并且不再往磁盘写任何东西。
pub(super) fn job_row_is_gone(db: &Db, job_id: &str) -> bool {
    match db.job_status(job_id) {
        Ok(None) => true,
        Ok(Some(_)) => false,
        Err(error) => {
            tracing::warn!("deleted-row check: reading status of job {job_id} failed: {error:#}");
            false
        }
    }
}

/// OCR 子任务该不该停：自己或父任务登记了取消，**或者库里的父任务已经不在 queued / running**
/// （被取消、失败、被删）。
///
/// 只看内存里的取消登记不够：父任务收尾时会把自己的登记清掉，之后才走到检查点的子任务就再也
/// 看不见——b13ad5-ocr 就是这样在父任务取消之后把 PDF 交给了 Paddle（白付一次 OCR，最后还记成
/// failed）。库里的父任务状态不会丢，所以兜一层。读库出错时不当成取消（宁可多跑一步，不能误杀）；
/// 父任务这一行不存在（被删了）才当成取消。
pub(super) async fn should_stop_ocr_child(
    canceled_jobs: &RwLock<HashSet<String>>,
    db: &Db,
    job_id: &str,
    parent_job_ids: &[String],
) -> bool {
    if is_cancel_requested_any(canceled_jobs, job_id, parent_job_ids).await {
        return true;
    }
    parent_job_ids.iter().any(|parent| match db.job_status(parent) {
        Ok(Some(JobStatusKind::Queued | JobStatusKind::Running)) => false,
        Ok(_) => true,
        Err(error) => {
            tracing::warn!("cancel check: reading status of parent job {parent} failed: {error:#}");
            false
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn registry(ids: &[&str]) -> RwLock<HashSet<String>> {
        RwLock::new(ids.iter().map(|v| v.to_string()).collect())
    }

    /// 取消 book 父任务时，`-ocr` 子任务必须也停。
    ///
    /// 取消只登记被点的那个 id。子任务自查的是**自己**的 id，所以在
    /// `extra_cancel_job_ids` 接上父 id 之前，它永远看不到信号——OCR 会一路
    /// 跑到成功，产物随即被丢弃。job 20260919094352-fa6af6 就是这么来的。
    #[tokio::test]
    async fn child_stops_when_only_the_parent_was_canceled() {
        let reg = registry(&["job-parent"]);

        // 改动前的行为：只看自己的 id —— 看不见父任务的取消。
        assert!(
            !is_cancel_requested_with_registry(&reg, "job-parent-ocr").await,
            "子任务自己的 id 本来就不在注册表里，这是前提"
        );

        // 改动后：带上父 id 就能看见。
        let parent = vec!["job-parent".to_string()];
        assert!(
            is_cancel_requested_any(&reg, "job-parent-ocr", &parent).await,
            "父任务被取消时，子任务必须停下——否则 OCR 白跑、产物白丢"
        );
    }

    /// 反向保证：父任务没被取消时，子任务不能被误停。
    #[tokio::test]
    async fn child_keeps_running_when_nobody_was_canceled() {
        let reg = registry(&["some-other-job"]);
        let parent = vec!["job-parent".to_string()];
        assert!(!is_cancel_requested_any(&reg, "job-parent-ocr", &parent).await);
    }
}
