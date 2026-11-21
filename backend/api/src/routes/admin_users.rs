//! 管理后台（/api/v1/admin/users*，只给管理员、只在多用户模式）：账号列表的搜索筛选排序分页、
//! 账号详情与统计、某个账号的任务、改身份、软删除与恢复。发放页数、重置密码、停用启用在 accounts.rs。
//! 取数都在 services::accounts（经 accounts::api），这里只管解析参数。
//!
//! 管理员看得到别人的账号和任务列表，但打不开别人的任务详情：/jobs/:id 这类接口按数据归属走，
//! 管理员的网站会话也只认自己的数据。

use std::collections::HashMap;

use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use serde::Deserialize;
use serde_json::json;

use super::accounts::{require_admin, require_multi};
use crate::error::AppError;
use crate::models::api::ApiResponse;
use crate::routes::common::{
    build_accounts_route_deps, build_jobs_route_deps, ok_json, ApiJson, ApiPath, ApiQuery,
};
use crate::services::accounts::{
    admin_view, AdminUserDetailView, AdminUserJobsView, AdminUserListView, Principal, UserListQuery,
    UserSortKey, UserStatusFilter,
};
use crate::AppState;

const MAX_PAGE_SIZE: usize = 500;
const DEFAULT_JOBS_PAGE_SIZE: usize = 20;
const MAX_JOBS_PAGE_SIZE: usize = 200;

fn invalid_query(name: &str, allowed: &str) -> AppError {
    AppError::account(
        StatusCode::BAD_REQUEST,
        "INVALID_QUERY",
        format!("查询参数 {name} 不对，可选：{allowed}"),
        json!({ "param": name }),
    )
}

fn admin_only(state: &AppState, principal: &Principal) -> Result<(), AppError> {
    require_multi(&build_accounts_route_deps(state))?;
    require_admin(principal)
}

async fn blocking<T: Send + 'static>(
    work: impl FnOnce() -> Result<T, AppError> + Send + 'static,
) -> Result<T, AppError> {
    tokio::task::spawn_blocking(work)
        .await
        .map_err(|_| AppError::internal("admin task failed"))?
}

fn parse_list_query(params: &HashMap<String, String>) -> Result<UserListQuery, AppError> {
    let get = |name: &str| {
        params
            .get(name)
            .map(|value| value.trim())
            .filter(|value| !value.is_empty())
    };
    let mut query = UserListQuery {
        q: get("q").unwrap_or_default().to_string(),
        ..Default::default()
    };
    query.status = match get("status") {
        None => None,
        Some("active") => Some(UserStatusFilter::Active),
        Some("disabled") => Some(UserStatusFilter::Disabled),
        Some("deleted") => Some(UserStatusFilter::Deleted),
        Some(_) => return Err(invalid_query("status", "active、disabled、deleted")),
    };
    query.role = match get("role") {
        None => None,
        Some(role @ ("admin" | "user")) => Some(role.to_string()),
        Some(_) => return Err(invalid_query("role", "admin、user")),
    };
    query.sort = match get("sort") {
        None | Some("created_at") => UserSortKey::CreatedAt,
        Some("username") => UserSortKey::Username,
        Some("last_login_at") => UserSortKey::LastLoginAt,
        Some("page_balance") => UserSortKey::PageBalance,
        Some(_) => {
            return Err(invalid_query(
                "sort",
                "username、created_at、last_login_at、page_balance",
            ))
        }
    };
    query.descending = match get("order") {
        None | Some("asc") => false,
        Some("desc") => true,
        Some(_) => return Err(invalid_query("order", "asc、desc")),
    };
    query.limit = match get("limit") {
        None => None,
        Some(raw) => match raw.parse::<usize>() {
            Ok(limit) if (1..=MAX_PAGE_SIZE).contains(&limit) => Some(limit),
            _ => return Err(invalid_query("limit", &format!("1～{MAX_PAGE_SIZE}"))),
        },
    };
    query.offset = match get("offset") {
        None => 0,
        Some(raw) => raw
            .parse::<usize>()
            .map_err(|_| invalid_query("offset", "不小于 0 的整数"))?,
    };
    Ok(query)
}

/// GET /api/v1/admin/users?q=&status=&role=&sort=&order=&limit=&offset=
/// 不带参数：没删的全部账号，按建号时间排（和以前一样）。
pub async fn list_users_route(
    State(state): State<AppState>,
    principal: Principal,
    ApiQuery(params): ApiQuery<HashMap<String, String>>,
) -> Result<Json<ApiResponse<AdminUserListView>>, AppError> {
    admin_only(&state, &principal)?;
    let query = parse_list_query(&params)?;
    let accounts = build_accounts_route_deps(&state);
    Ok(ok_json(blocking(move || accounts.admin_user_list(&query)).await?))
}

/// GET /api/v1/admin/users/:user_id（删了的也能看）
pub async fn user_detail_route(
    State(state): State<AppState>,
    principal: Principal,
    ApiPath(user_id): ApiPath<String>,
) -> Result<Json<ApiResponse<AdminUserDetailView>>, AppError> {
    admin_only(&state, &principal)?;
    let accounts = build_accounts_route_deps(&state);
    Ok(ok_json(blocking(move || accounts.admin_user_detail(&user_id)).await?))
}

#[derive(Debug, Deserialize)]
pub struct PageQuery {
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

/// GET /api/v1/admin/users/:user_id/jobs?limit=&offset=（新的在前，默认 20 条，最多 200）
pub async fn user_jobs_route(
    State(state): State<AppState>,
    principal: Principal,
    ApiPath(user_id): ApiPath<String>,
    ApiQuery(page): ApiQuery<PageQuery>,
) -> Result<Json<ApiResponse<AdminUserJobsView>>, AppError> {
    admin_only(&state, &principal)?;
    let limit = page.limit.unwrap_or(DEFAULT_JOBS_PAGE_SIZE);
    if !(1..=MAX_JOBS_PAGE_SIZE).contains(&limit) {
        return Err(invalid_query("limit", &format!("1～{MAX_JOBS_PAGE_SIZE}")));
    }
    let offset = page.offset.unwrap_or(0);
    let accounts = build_accounts_route_deps(&state);
    Ok(ok_json(blocking(move || accounts.admin_user_jobs(&user_id, limit, offset)).await?))
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SetRoleInput {
    pub role: String,
}

/// POST /api/v1/admin/users/:user_id/role，`{ "role": "admin" | "user" }`
pub async fn set_role_route(
    State(state): State<AppState>,
    principal: Principal,
    ApiPath(user_id): ApiPath<String>,
    ApiJson(input): ApiJson<SetRoleInput>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    admin_only(&state, &principal)?;
    let accounts = build_accounts_route_deps(&state);
    let user = blocking(move || accounts.set_role(&principal.user_id, &user_id, input.role.trim()))
        .await?;
    Ok(ok_json(json!({ "user": admin_view(&user) })))
}

/// DELETE /api/v1/admin/users/:user_id：软删除，踢掉会话，取消它还在排队 / 在跑的任务（按页数规则退回）。
pub async fn delete_user_route(
    State(state): State<AppState>,
    principal: Principal,
    ApiPath(user_id): ApiPath<String>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    admin_only(&state, &principal)?;
    let accounts = build_accounts_route_deps(&state);
    let target = user_id.clone();
    let (user, active) = blocking(move || {
        let user = accounts.soft_delete(&principal.user_id, &target)?;
        Ok((user, accounts.active_job_ids_for(&target)?))
    })
    .await?;
    let mut canceled = Vec::new();
    for job_id in active {
        // 尽力而为：任务可能刚好自己结束了，或者是父任务取消时连带结束的 OCR 子任务。
        match build_jobs_route_deps(&state)
            .jobs
            .cancel_submission("", &job_id)
            .await
        {
            Ok(_) => canceled.push(job_id),
            Err(error) => tracing::warn!(
                "admin: cancel job {job_id} of deleted user {user_id} failed: {error:?}"
            ),
        }
    }
    Ok(ok_json(
        json!({ "user": admin_view(&user), "canceled_jobs": canceled }),
    ))
}

/// POST /api/v1/admin/users/:user_id/restore
pub async fn restore_user_route(
    State(state): State<AppState>,
    principal: Principal,
    ApiPath(user_id): ApiPath<String>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    admin_only(&state, &principal)?;
    let accounts = build_accounts_route_deps(&state);
    let user = blocking(move || accounts.restore(&user_id)).await?;
    Ok(ok_json(json!({ "user": admin_view(&user) })))
}
