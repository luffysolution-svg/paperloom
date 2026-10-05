use axum::Json;

use crate::error::AppError;
use crate::models::api::{ApiResponse, TranslationReplayView};

use crate::routes::common::{jobs_facade, ok_json, JobsRouteDeps};

pub async fn replay_translation_item_response(
    deps: JobsRouteDeps<'_>,
    job_id: &str,
    item_id: &str,
) -> Result<Json<ApiResponse<TranslationReplayView>>, AppError> {
    Ok(ok_json(
        jobs_facade(deps)
            .replay_translation_item(job_id, item_id)
            .await?,
    ))
}
