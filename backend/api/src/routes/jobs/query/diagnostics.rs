use axum::extract::State;
use axum::Json;

use crate::error::AppError;
use crate::models::api::{ApiResponse, JobDiagnosticsView, JobResumePlanView};
use crate::AppState;

use crate::routes::common::{build_jobs_query_route_deps, ok_json, ApiPath};

pub async fn get_job_diagnostics(
    State(state): State<AppState>,
    ApiPath(job_id): ApiPath<String>,
) -> Result<Json<ApiResponse<JobDiagnosticsView>>, AppError> {
    let deps = build_jobs_query_route_deps(&state);
    Ok(ok_json(deps.jobs.job_diagnostics_view(&job_id)?))
}

pub async fn get_resume_plan(
    State(state): State<AppState>,
    ApiPath(job_id): ApiPath<String>,
) -> Result<Json<ApiResponse<JobResumePlanView>>, AppError> {
    let deps = build_jobs_query_route_deps(&state);
    Ok(ok_json(deps.jobs.resume_plan_view(&job_id)?))
}
