use retainpdf_api_base::error::AppError;
use crate::views::JobSubmissionView;
use retainpdf_core::models::domain::JobStatusKind;
use retainpdf_core::models::request::CreateJobInput;

use crate::lifecycle::creation::{reject_client_job_id, submit_job, NewJob};
use crate::facade::JobsFacade;

impl<'a> JobsFacade<'a> {
    /// `POST /jobs`：已经上传过的文件（`source.upload_id`）或已有任务的产物（`source.artifact_job_id`）。
    pub fn create_submission(
        &self,
        base_url: &str,
        request: &CreateJobInput,
    ) -> Result<JobSubmissionView, AppError> {
        reject_client_job_id(request)?;
        let job = submit_job(&self.command.submit, NewJob::new(request.clone()))?;
        Ok(self.build_submission_view(base_url, &job, JobStatusKind::Queued, request.workflow.clone()))
    }

    /// 书库发起的提交（`/documents/:id/translate`、`/ocr`）：请求已经绑好这本书的上传。
    pub fn create_document_submission(
        &self,
        base_url: &str,
        request: &CreateJobInput,
        document_id: &str,
    ) -> Result<JobSubmissionView, AppError> {
        reject_client_job_id(request)?;
        let job = submit_job(
            &self.command.submit,
            NewJob::new(request.clone()).for_document(document_id),
        )?;
        Ok(self.build_submission_view(base_url, &job, JobStatusKind::Queued, request.workflow.clone()))
    }
}
