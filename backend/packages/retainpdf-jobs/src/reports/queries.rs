use retainpdf_api_base::error::AppError;
use crate::views::{JobReportView, TranslationDiagnosticsView};

use retainpdf_api_base::job_loading::load_supported_job;
use crate::query::JobQueries;
use crate::reports::translation_reports::{
    load_fit_report_view, load_refine_report_view, load_translation_diagnostics_view,
    load_translation_qa_view,
};

impl JobQueries<'_> {
    pub fn translation_diagnostics_view(
        &self,
        job_id: &str,
    ) -> Result<TranslationDiagnosticsView, AppError> {
        let job = load_supported_job(self.db, self.data_root, job_id)?;
        load_translation_diagnostics_view(self.data_root, &job)
    }

    pub fn translation_qa_view(&self, job_id: &str) -> Result<JobReportView, AppError> {
        let job = load_supported_job(self.db, self.data_root, job_id)?;
        load_translation_qa_view(self.data_root, &job)
    }

    pub fn fit_report_view(&self, job_id: &str) -> Result<JobReportView, AppError> {
        let job = load_supported_job(self.db, self.data_root, job_id)?;
        load_fit_report_view(self.data_root, &job)
    }

    pub fn refine_report_view(&self, job_id: &str) -> Result<JobReportView, AppError> {
        let job = load_supported_job(self.db, self.data_root, job_id)?;
        load_refine_report_view(self.data_root, &job)
    }
}
