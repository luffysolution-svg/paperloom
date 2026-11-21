//! 译文：逐条看、人工改、重翻一条（`/jobs/:id/translations/…`）。

use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;

use crate::error::AppError;
use crate::models::api::{
    ApiResponse, ListTranslationItemsQuery, ReviseTranslationItemRequest, TranslationDebugItemView,
    TranslationDebugListView, TranslationReplayView, TranslationRevisionHistoryView,
    TranslationRevisionView,
};
use crate::AppState;

use crate::routes::common::{
    build_jobs_query_route_deps, build_jobs_route_deps, jobs_facade, ok_json, request_base_url,
    run_state_blocking, ApiJson, ApiPath, ApiQuery, JobsRouteDeps,
};

pub async fn list_translation_items(
    State(state): State<AppState>,
    ApiPath(job_id): ApiPath<String>,
    ApiQuery(query): ApiQuery<ListTranslationItemsQuery>,
) -> Result<Json<ApiResponse<TranslationDebugListView>>, AppError> {
    run_state_blocking(&state, "translation items", move |state| {
        let deps = build_jobs_query_route_deps(state);
        Ok(ok_json(deps.jobs.translation_items_view(&job_id, &query)?))
    })
    .await
}

pub async fn get_translation_item(
    State(state): State<AppState>,
    ApiPath((job_id, item_id)): ApiPath<(String, String)>,
) -> Result<Json<ApiResponse<TranslationDebugItemView>>, AppError> {
    run_state_blocking(&state, "translation item", move |state| {
        let deps = build_jobs_query_route_deps(state);
        Ok(ok_json(deps.jobs.translation_item_view(&job_id, &item_id)?))
    })
    .await
}

pub async fn revise_translation_item_route(
    State(state): State<AppState>,
    ApiPath((job_id, item_id)): ApiPath<(String, String)>,
    headers: HeaderMap,
    ApiJson(request): ApiJson<ReviseTranslationItemRequest>,
) -> Result<Json<ApiResponse<TranslationRevisionView>>, AppError> {
    revise_translation_item_response(
        build_jobs_route_deps(&state),
        &headers,
        &job_id,
        &item_id,
        request,
    )
    .await
}

pub async fn get_translation_item_revisions(
    State(state): State<AppState>,
    ApiPath((job_id, item_id)): ApiPath<(String, String)>,
) -> Result<Json<ApiResponse<TranslationRevisionHistoryView>>, AppError> {
    run_state_blocking(&state, "translation item revisions", move |state| {
        let deps = build_jobs_query_route_deps(state);
        Ok(ok_json(
            deps.jobs.translation_item_revisions_view(&job_id, &item_id)?,
        ))
    })
    .await
}

pub async fn replay_translation_item_route(
    State(state): State<AppState>,
    ApiPath((job_id, item_id)): ApiPath<(String, String)>,
) -> Result<Json<ApiResponse<TranslationReplayView>>, AppError> {
    replay_translation_item_response(build_jobs_route_deps(&state), &job_id, &item_id).await
}

async fn replay_translation_item_response(
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

async fn revise_translation_item_response(
    deps: JobsRouteDeps<'_>,
    headers: &HeaderMap,
    job_id: &str,
    item_id: &str,
    request: ReviseTranslationItemRequest,
) -> Result<Json<ApiResponse<TranslationRevisionView>>, AppError> {
    let base_url = request_base_url(headers, deps.default_port, &deps.bind_host);
    Ok(ok_json(
        jobs_facade(deps)
            .revise_translation_item(&base_url, job_id, item_id, request)
            .await?,
    ))
}
