use retainpdf_api_base::error::AppError;
use crate::views::{
    ListTranslationItemsQuery, TranslationDebugItemView, TranslationDebugListView,
    TranslationRevisionHistoryView,
};

use retainpdf_api_base::job_loading::load_supported_job;
use crate::query::JobQueries;
use crate::translations::{
    load_translation_debug_item_view, load_translation_debug_list_view,
    load_translation_revision_history,
};

impl JobQueries<'_> {
    pub fn translation_items_view(
        &self,
        job_id: &str,
        query: &ListTranslationItemsQuery,
    ) -> Result<TranslationDebugListView, AppError> {
        let job = load_supported_job(self.db, self.data_root, job_id)?;
        load_translation_debug_list_view(self.data_root, &job, query)
    }

    pub fn translation_item_view(
        &self,
        job_id: &str,
        item_id: &str,
    ) -> Result<TranslationDebugItemView, AppError> {
        let job = load_supported_job(self.db, self.data_root, job_id)?;
        load_translation_debug_item_view(self.data_root, &job, item_id)
    }

    pub fn translation_item_revisions_view(
        &self,
        job_id: &str,
        item_id: &str,
    ) -> Result<TranslationRevisionHistoryView, AppError> {
        let job = load_supported_job(self.db, self.data_root, job_id)?;
        load_translation_revision_history(self.data_root, &job, item_id)
    }
}
