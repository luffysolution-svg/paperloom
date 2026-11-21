//! 邀请码管理（/api/v1/admin/invites*，只给管理员、只在多用户模式）：新建、列表、详情（谁用它注册了）、
//! 作废。凭邀请码注册在 accounts.rs 的 /api/v1/auth/register。规则在 services::accounts（经 accounts::api）。

use axum::extract::State;
use axum::Json;
use serde::Deserialize;
use serde_json::json;

use super::accounts::{require_admin, require_multi};
use crate::error::AppError;
use crate::models::api::ApiResponse;
use crate::routes::common::{build_accounts_route_deps, ok_json, ApiJson, ApiPath};
use crate::services::accounts::{InviteDetailView, InviteView, NewInvite, Principal};
use crate::AppState;

fn admin_only(state: &AppState, principal: &Principal) -> Result<(), AppError> {
    require_multi(&build_accounts_route_deps(state))?;
    require_admin(principal)
}

async fn blocking<T: Send + 'static>(
    work: impl FnOnce() -> Result<T, AppError> + Send + 'static,
) -> Result<T, AppError> {
    tokio::task::spawn_blocking(work)
        .await
        .map_err(|_| AppError::internal("invite task failed"))?
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateInviteInput {
    /// 能注册几个账号，默认 1。
    #[serde(default)]
    pub max_uses: Option<i64>,
    /// 每个用它注册的账号送多少页，默认 0。
    #[serde(default)]
    pub initial_pages: Option<i64>,
    /// 几天后过期；不填不过期。
    #[serde(default)]
    pub expires_in_days: Option<i64>,
    #[serde(default)]
    pub note: String,
}

/// GET /api/v1/admin/invites（新的在前）
pub async fn list_invites_route(
    State(state): State<AppState>,
    principal: Principal,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    admin_only(&state, &principal)?;
    let accounts = build_accounts_route_deps(&state);
    let invites = blocking(move || accounts.list_invites()).await?;
    Ok(ok_json(json!({ "invites": invites })))
}

/// POST /api/v1/admin/invites，`{ "max_uses"?, "initial_pages"?, "expires_in_days"?, "note"? }`
pub async fn create_invite_route(
    State(state): State<AppState>,
    principal: Principal,
    ApiJson(input): ApiJson<CreateInviteInput>,
) -> Result<Json<ApiResponse<InviteView>>, AppError> {
    admin_only(&state, &principal)?;
    let accounts = build_accounts_route_deps(&state);
    let new_invite = NewInvite {
        max_uses: input.max_uses,
        initial_pages: input.initial_pages,
        expires_in_days: input.expires_in_days,
        note: input.note,
    };
    Ok(ok_json(blocking(move || accounts.create_invite(&principal.user_id, new_invite)).await?))
}

/// GET /api/v1/admin/invites/:invite_id
pub async fn invite_detail_route(
    State(state): State<AppState>,
    principal: Principal,
    ApiPath(invite_id): ApiPath<String>,
) -> Result<Json<ApiResponse<InviteDetailView>>, AppError> {
    admin_only(&state, &principal)?;
    let accounts = build_accounts_route_deps(&state);
    Ok(ok_json(blocking(move || accounts.invite_detail(&invite_id)).await?))
}

/// POST /api/v1/admin/invites/:invite_id/revoke
pub async fn revoke_invite_route(
    State(state): State<AppState>,
    principal: Principal,
    ApiPath(invite_id): ApiPath<String>,
) -> Result<Json<ApiResponse<InviteView>>, AppError> {
    admin_only(&state, &principal)?;
    let accounts = build_accounts_route_deps(&state);
    Ok(ok_json(blocking(move || accounts.revoke_invite(&invite_id)).await?))
}
