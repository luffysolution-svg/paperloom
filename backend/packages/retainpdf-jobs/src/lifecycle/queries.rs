use retainpdf_api_base::error::AppError;
use crate::views::{
    DocumentJobListView, JobDetailView, JobListView, ListDocumentJobsQuery, ListJobsQuery,
};

use crate::presentation::{
    build_document_job_list_view, build_job_detail_view, build_job_list_view,
};
use crate::query::JobQueries;

impl JobQueries<'_> {
    pub fn document_jobs_view(
        &self,
        base_url: &str,
        document_id: &str,
        query: &ListDocumentJobsQuery,
    ) -> Result<DocumentJobListView, AppError> {
        self.db
            .get_document(document_id)
            .map_err(|error| AppError::from_lookup(error, format!("document not found: {document_id}")))?;
        build_document_job_list_view(self.db, self.data_root, document_id, query, base_url)
    }

    pub fn list_jobs_view(
        &self,
        base_url: &str,
        query: &ListJobsQuery,
    ) -> Result<JobListView, AppError> {
        build_job_list_view(self.db, self.data_root, query, base_url)
    }

    pub fn job_detail_view(
        &self,
        base_url: &str,
        job_id: &str,
    ) -> Result<JobDetailView, AppError> {
        let job = self.load_supported_job_snapshot(job_id)?;
        Ok(build_job_detail_view(
            self.db,
            self.data_root,
            &job,
            base_url,
        ))
    }
}
