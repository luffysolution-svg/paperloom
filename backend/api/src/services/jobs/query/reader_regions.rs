use crate::error::AppError;
use crate::models::api::{ReaderMetadataView, ReaderRegionsView};

use super::super::reader_regions::{load_reader_metadata_view, load_reader_regions_view};
use super::{load_supported_job, JobQueries};

impl JobQueries<'_> {
    pub fn reader_regions_view(&self, job_id: &str) -> Result<ReaderRegionsView, AppError> {
        let job = load_supported_job(self.db, self.data_root, job_id)?;
        load_reader_regions_view(self.data_root, &job)
    }

    pub fn reader_metadata_view(&self, job_id: &str) -> Result<ReaderMetadataView, AppError> {
        let job = load_supported_job(self.db, self.data_root, job_id)?;
        load_reader_metadata_view(self.data_root, &job)
    }
}
