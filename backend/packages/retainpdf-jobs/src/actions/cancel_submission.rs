use retainpdf_api_base::error::AppError;
use crate::views::JobSubmissionView;

use crate::actions::cancel::cancel_job as cancel_job_service;
use retainpdf_api_base::job_loading::load_job_or_404;
use crate::support::ensure_cancelable;
use crate::facade::JobsFacade;
use retainpdf_core::models::domain::JobStatusKind;

impl<'a> JobsFacade<'a> {
    pub async fn cancel_submission(
        &self,
        base_url: &str,
        job_id: &str,
    ) -> Result<JobSubmissionView, AppError> {
        let job = load_job_or_404(self.command.db, job_id)?;
        ensure_cancelable(&job)?;
        let job = cancel_job_service(&self.command.control, job_id).await?;
        // 返回库里的真实状态，不写死 canceled：任务可能在取消前一刻自己跑完了（succeeded）；
        // OCR 任务过了排队阶段时这里只杀进程，终态由 runner 稍后落，此刻还是 running。
        Ok(self.build_submission_view(base_url, &job, job.status.clone(), job.workflow.clone()))
    }

    /// 强制删除（书 / 文档）前的取消：对其中排队 / 运行中的任务走和 `POST actions/cancel`
    /// 同一条路径（登记取消 + 终止 worker 进程，非 OCR 任务落 Canceled），之后调用方再删行删目录。
    ///
    /// 以前强删既不登记取消也不杀进程：worker 继续花 OCR / 模型的钱，runner 的下一次落库
    /// 还会把已删的行写回来。尽力而为：某个任务取消失败（进程已退出、jobsd 抖动）只记日志，
    /// 不挡住删除——行删掉以后 runner 的 CAS 写落空，会自己收手并终止 worker。
    pub async fn cancel_before_delete(&self, job_ids: &[String]) {
        for job_id in job_ids {
            let active = matches!(
                self.command.db.job_status(job_id),
                Ok(Some(JobStatusKind::Queued | JobStatusKind::Running))
            );
            if !active {
                continue;
            }
            if let Err(error) = cancel_job_service(&self.command.control, job_id).await {
                tracing::warn!("cancel before force delete failed for job {job_id}: {error:?}");
            }
        }
    }
}
