use axum::extract::State;
use axum::Json;

use crate::error::AppError;
use crate::models::api::ApiResponse;
use crate::routes::common::{run_credentials_blocking, ApiJson, ApiPath, ApiQuery};
use crate::services::providers::{
    create_credential, delete_credential, get_credential_metadata, list_credentials,
    update_credential, CreateCredentialInput, CredentialDeleteView, CredentialListView,
    CredentialMutationView, DeleteCredentialQuery, ListCredentialQuery, UpdateCredentialInput,
};
use crate::AppState;

/// GET /api/v1/credentials —— 只有元数据，不回明文；不收查询参数（以前的 `include_values` 也是 400）。
pub async fn list_credentials_route(
    State(state): State<AppState>,
    ApiQuery(ListCredentialQuery {}): ApiQuery<ListCredentialQuery>,
) -> Result<impl axum::response::IntoResponse, AppError> {
    let view: CredentialListView =
        run_credentials_blocking(&state, |_, data_root| list_credentials(data_root)).await?;
    Ok((
        [(axum::http::header::CACHE_CONTROL, "no-store")],
        Json(ApiResponse::ok(view)),
    ))
}

pub async fn create_credential_route(
    State(state): State<AppState>,
    ApiJson(input): ApiJson<CreateCredentialInput>,
) -> Result<Json<ApiResponse<CredentialMutationView>>, AppError> {
    let view =
        run_credentials_blocking(&state, move |_, data_root| create_credential(data_root, input))
            .await?;
    Ok(Json(ApiResponse::ok(view)))
}

pub async fn get_credential_route(
    State(state): State<AppState>,
    ApiPath(credential_ref): ApiPath<String>,
) -> Result<Json<ApiResponse<CredentialMutationView>>, AppError> {
    let view = run_credentials_blocking(&state, move |_, data_root| {
        get_credential_metadata(data_root, &credential_ref)
    })
    .await?;
    Ok(Json(ApiResponse::ok(view)))
}

pub async fn update_credential_route(
    State(state): State<AppState>,
    ApiPath(credential_ref): ApiPath<String>,
    ApiJson(input): ApiJson<UpdateCredentialInput>,
) -> Result<Json<ApiResponse<CredentialMutationView>>, AppError> {
    let view = run_credentials_blocking(&state, move |_, data_root| {
        update_credential(data_root, &credential_ref, input)
    })
    .await?;
    Ok(Json(ApiResponse::ok(view)))
}

pub async fn delete_credential_route(
    State(state): State<AppState>,
    ApiPath(credential_ref): ApiPath<String>,
    ApiQuery(query): ApiQuery<DeleteCredentialQuery>,
) -> Result<Json<ApiResponse<CredentialDeleteView>>, AppError> {
    let view = run_credentials_blocking(&state, move |db, data_root| {
        delete_credential(
            db,
            data_root,
            &credential_ref,
            query.expected_revision,
            query.force,
        )
    })
    .await?;
    Ok(Json(ApiResponse::ok(view)))
}
