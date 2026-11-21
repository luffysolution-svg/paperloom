//! 备份接口的应用门面(路由只经这里)。

use std::sync::Arc;

use retainpdf_api_base::error::AppError;
use super::views::{BackupItemView, BackupRestoreView, BackupStatusView};

use super::{BackupRefusal, BackupService};

pub struct BackupApiDeps {
    pub(crate) service: Arc<BackupService>,
}

impl BackupApiDeps {
    pub fn new(service: Arc<BackupService>) -> Self {
        Self { service }
    }
}

/// 404 照旧;409 带 `details.reason`(`restore_blocked`、`backup_damaged`、`backup_newer`)。
/// 坏备份、来自新版本的备份 2026-10-22 起由 400 改 409:请求没写错,是那份文件的状态不允许。
fn refused(refusal: BackupRefusal) -> AppError {
    let reason = refusal.reason();
    match refusal {
        BackupRefusal::NotFound(message) => AppError::not_found(message),
        BackupRefusal::Damaged(message) | BackupRefusal::Newer(message) | BackupRefusal::Busy(message) => {
            AppError::conflict_because(reason, message)
        }
    }
}

pub async fn backup_status_view(deps: &BackupApiDeps) -> Result<BackupStatusView, AppError> {
    Ok(deps.service.status().await?)
}

/// 立即备份一份,等它存完。
pub async fn create_backup_view(deps: &BackupApiDeps) -> Result<BackupItemView, AppError> {
    Ok(deps.service.create_manual().await?)
}

pub async fn restore_backup_view(deps: &BackupApiDeps, id: &str) -> Result<BackupRestoreView, AppError> {
    deps.service.restore(id).await?.map_err(refused)
}

pub async fn delete_backup_view(deps: &BackupApiDeps, id: &str) -> Result<BackupStatusView, AppError> {
    deps.service.delete(id).await?.map_err(refused)?;
    Ok(deps.service.status().await?)
}
