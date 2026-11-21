//! 管理后台与页数额度的取数（多用户模式）。路由只经 `accounts::api` 调这里，不直接碰库。
//!
//! 改身份、软删除与恢复在 admin.rs；计费规则本身在 services::accounts::page_quota。

use std::collections::BTreeMap;

use serde::Serialize;

use super::admin::user_not_found;
use super::{admin_view, db_error, AccountsService, AdminUserView, Principal};
use retainpdf_data::db::{OwnerJobRow, UserListQuery, UserStats};
use retainpdf_api_base::error::AppError;
use crate::page_quota::{self, PageQuotaView};

#[derive(Serialize)]
pub struct AdminUserListItem {
    #[serde(flatten)]
    pub user: AdminUserView,
    /// 剩余页数；管理员不限额，为 null。
    pub page_balance: Option<i64>,
}

#[derive(Serialize)]
pub struct AdminUserListView {
    pub users: Vec<AdminUserListItem>,
    /// 符合筛选条件的总数（不受 limit / offset 影响）。
    pub total: i64,
}

#[derive(Serialize)]
pub struct AdminUserStatsView {
    pub jobs_total: i64,
    pub jobs_by_status: BTreeMap<String, i64>,
    pub documents: i64,
    pub uploads: i64,
    /// 上传的原始 PDF 合计字节数（不含任务产物）。
    pub upload_bytes: i64,
    /// 实际扣掉的页数：已确认的 + 还在预扣中的（退回的不算）。
    pub pages_charged: i64,
    pub pages_reserved: i64,
    pub last_submitted_at: Option<String>,
}

impl From<UserStats> for AdminUserStatsView {
    fn from(stats: UserStats) -> Self {
        Self {
            jobs_total: stats.jobs_total,
            jobs_by_status: stats.jobs_by_status,
            documents: stats.documents,
            uploads: stats.uploads,
            upload_bytes: stats.upload_bytes,
            pages_charged: stats.pages_charged,
            pages_reserved: stats.pages_reserved,
            last_submitted_at: stats.last_submitted_at,
        }
    }
}

#[derive(Serialize)]
pub struct AdminUserDetailView {
    pub user: AdminUserView,
    pub page_balance: Option<i64>,
    pub stats: AdminUserStatsView,
}

#[derive(Serialize)]
pub struct AdminUserJobView {
    pub job_id: String,
    pub workflow: String,
    pub status: String,
    /// 书名，没有就是上传的文件名。
    pub title: String,
    /// 源 PDF 总页数。
    pub document_pages: Option<i64>,
    /// 这个任务扣了几页（不计费的为 null）及其状态 reserved / settled / refunded。
    pub charged_pages: Option<i64>,
    pub charge_status: Option<String>,
    pub created_at: String,
    pub finished_at: Option<String>,
}

impl From<OwnerJobRow> for AdminUserJobView {
    fn from(row: OwnerJobRow) -> Self {
        Self {
            job_id: row.job_id,
            workflow: row.workflow,
            status: row.status,
            title: row.title,
            document_pages: row.document_pages,
            charged_pages: row.charged_pages,
            charge_status: row.charge_status,
            created_at: row.created_at,
            finished_at: row.finished_at,
        }
    }
}

#[derive(Serialize)]
pub struct AdminUserJobsView {
    pub jobs: Vec<AdminUserJobView>,
    pub total: i64,
}

impl AccountsService {
    // ------------------------------------------------------------ 页数额度

    /// 自己的额度。单机模式、管理员、内部服务不限额。
    pub fn page_quota_for(&self, principal: &Principal) -> Result<PageQuotaView, AppError> {
        if !self.mode().is_multi() || principal.is_admin() || principal.owner_filter().is_none() {
            return Ok(PageQuotaView::unlimited());
        }
        page_quota::quota_view(&self.db, &principal.user_id)
    }

    /// 管理员看某个账号的额度。
    pub fn user_page_quota(&self, user_id: &str) -> Result<PageQuotaView, AppError> {
        let user = self.require_user(user_id)?;
        if user.role == "admin" {
            return Ok(PageQuotaView::unlimited());
        }
        page_quota::quota_view(&self.db, user_id)
    }

    /// 管理员给普通账号发放（正数）或扣减（负数）页数，返回操作后的余额。
    pub fn grant_pages(&self, acting_admin_id: &str, user_id: &str, delta: i64, note: &str) -> Result<i64, AppError> {
        page_quota::grant_pages(&self.db, acting_admin_id, user_id, delta, note)
    }

    // ------------------------------------------------------------ 管理后台

    pub fn admin_user_list(&self, query: &UserListQuery) -> Result<AdminUserListView, AppError> {
        let page = self.db.list_users_page(query).map_err(db_error)?;
        let users = page
            .rows
            .iter()
            .map(|row| AdminUserListItem {
                page_balance: (row.user.role != "admin").then_some(row.page_balance),
                user: admin_view(&row.user),
            })
            .collect();
        Ok(AdminUserListView { users, total: page.total })
    }

    /// 删了的账号也能看。
    pub fn admin_user_detail(&self, user_id: &str) -> Result<AdminUserDetailView, AppError> {
        let user = self.db.get_user(user_id).map_err(db_error)?.ok_or_else(|| user_not_found(user_id))?;
        let page_balance =
            if user.role == "admin" { None } else { Some(self.db.page_balance(user_id).map_err(db_error)?) };
        let stats = self.db.user_stats(user_id).map_err(db_error)?;
        Ok(AdminUserDetailView { user: admin_view(&user), page_balance, stats: stats.into() })
    }

    pub fn admin_user_jobs(&self, user_id: &str, limit: usize, offset: usize) -> Result<AdminUserJobsView, AppError> {
        self.db.get_user(user_id).map_err(db_error)?.ok_or_else(|| user_not_found(user_id))?;
        let (rows, total) = self.db.list_jobs_for_owner_page(user_id, limit, offset).map_err(db_error)?;
        Ok(AdminUserJobsView { jobs: rows.into_iter().map(AdminUserJobView::from).collect(), total })
    }

    /// 某个账号还在排队或在跑的任务（删账号时由路由经任务门面取消）。
    pub fn active_job_ids_for(&self, user_id: &str) -> Result<Vec<String>, AppError> {
        self.db.active_job_ids_for_owner(user_id).map_err(db_error)
    }
}
