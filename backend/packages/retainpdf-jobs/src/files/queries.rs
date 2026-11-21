use retainpdf_api_base::error::AppError;

use retainpdf_api_base::job_loading::load_supported_job;
use crate::query::JobQueries;

impl JobQueries<'_> {

    /// `/jobs/:id/files`：按 output / pages / internal 列出文件。`internal` 只给管理员。
    pub fn job_files_view(
        &self,
        base_url: &str,
        job_id: &str,
        include_internal: bool,
    ) -> Result<crate::JobFilesView, AppError> {
        let job = load_supported_job(self.db, self.data_root, job_id)?;
        crate::files::downloads::job_files_view(self.db, self.data_root, &job, include_internal, base_url)
    }

}
