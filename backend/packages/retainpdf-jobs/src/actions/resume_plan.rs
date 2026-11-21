use retainpdf_api_base::error::AppError;
use crate::views::JobResumePlanView;
use retainpdf_core::models::domain::JobSnapshot;
use crate::actions::stage_plan::resume_plan;
use retainpdf_api_base::job_loading::load_supported_job;
use crate::query::JobQueries;

impl JobQueries<'_> {
    pub fn resume_plan_view(&self, job_id: &str) -> Result<JobResumePlanView, AppError> {
        let job = load_supported_job(self.db, self.data_root, job_id)?;
        Ok(build_resume_plan_view(&job, self.data_root))
    }
}

pub(crate) fn build_resume_plan_view(
    job: &JobSnapshot,
    data_root: &std::path::Path,
) -> JobResumePlanView {
    let plan = resume_plan(job, data_root);
    JobResumePlanView {
        can_resume: plan.can_resume,
        job_id: job.job_id.clone(),
        from_stage: plan.from_stage,
        resume_workflow: plan.resume_workflow,
        reuses_artifacts: plan.reuses_artifacts,
        reruns_stages: plan.reruns_stages,
        reason: plan.reason,
        reason_code: plan.reason_code,
    }
}
