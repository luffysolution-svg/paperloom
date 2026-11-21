use retainpdf_api_base::error::AppError;
use crate::views::{JobEventListView, ListJobEventsQuery};

use retainpdf_api_base::job_loading::load_supported_job;
use crate::query::JobQueries;

impl JobQueries<'_> {
    pub fn live_translation_events_after(
        &self,
        job_id: &str,
        after_seq: i64,
        limit: u32,
    ) -> Result<Vec<crate::views::LiveTranslationCommitEventView>, AppError> {
        load_supported_job(self.db, self.data_root, job_id)?;
        crate::progress::live_translation::load_live_translation_events_after(
            self.db,
            job_id,
            after_seq.max(0),
            limit,
        )
    }

    pub fn job_events_view(
        &self,
        job_id: &str,
        query: &ListJobEventsQuery,
    ) -> Result<JobEventListView, AppError> {
        crate::progress::event_feed::read_events(self.db, self.data_root, job_id, query)
    }
}
