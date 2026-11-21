use axum::extract::State;
use axum::Json;

use crate::error::AppError;
use crate::models::api::{ApiResponse, ReaderMetadataView, ReaderRegionsView};
use crate::routes::common::{ok_json, run_job_query, ApiPath};
use crate::AppState;

pub async fn get_reader_regions(
    State(state): State<AppState>,
    ApiPath(job_id): ApiPath<String>,
) -> Result<Json<ApiResponse<ReaderRegionsView>>, AppError> {
    let view = run_job_query(&state, format!("reader-regions:{job_id}"), move |jobs| {
        jobs.reader_regions_view(&job_id)
    })
    .await?;
    Ok(ok_json(view))
}

pub async fn get_reader_metadata(
    State(state): State<AppState>,
    ApiPath(job_id): ApiPath<String>,
) -> Result<Json<ApiResponse<ReaderMetadataView>>, AppError> {
    let view = run_job_query(&state, format!("reader-metadata:{job_id}"), move |jobs| {
        jobs.reader_metadata_view(&job_id)
    })
    .await?;
    Ok(ok_json(view))
}
