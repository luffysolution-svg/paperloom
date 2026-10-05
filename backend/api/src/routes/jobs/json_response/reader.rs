use axum::Json;

use crate::error::AppError;
use crate::models::api::{ApiResponse, ReaderAiChatRequest, ReaderAiChatView};

use crate::routes::common::{jobs_facade, ok_json, JobsRouteDeps};

pub async fn reader_ai_chat_response(
    deps: JobsRouteDeps<'_>,
    job_id: &str,
    request: ReaderAiChatRequest,
) -> Result<Json<ApiResponse<ReaderAiChatView>>, AppError> {
    Ok(ok_json(
        jobs_facade(deps).reader_ai_chat(job_id, request).await?,
    ))
}
