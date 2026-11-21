//! 同步接口的应用门面(路由只经这里)。

use std::sync::Arc;

use retainpdf_api_base::error::AppError;
use retainpdf_core::models::api::{SyncSettingsInput, SyncStatusView, SyncTestView};

use super::{SyncRun, SyncService};

pub struct SyncApiDeps {
    pub(crate) service: Arc<SyncService>,
}

impl SyncApiDeps {
    pub fn new(service: Arc<SyncService>) -> Self {
        Self { service }
    }
}

pub async fn sync_status_view(deps: &SyncApiDeps) -> Result<SyncStatusView, AppError> {
    Ok(deps.service.status().await?)
}

pub async fn update_sync_settings_view(
    deps: &SyncApiDeps,
    input: &SyncSettingsInput,
) -> Result<SyncStatusView, AppError> {
    deps.service
        .update(input)
        .await?
        .map_err(|reason| AppError::bad_request(reason.0))?;
    Ok(deps.service.status().await?)
}

/// 立即跑一轮并等它跑完。不跑的时候 409 带 `details.reason`:`sync_disabled`(开关关着)、
/// `sync_not_configured`(开着但没填同步位置)。
pub async fn run_sync_now_view(deps: &SyncApiDeps) -> Result<SyncStatusView, AppError> {
    match deps.service.run_once().await? {
        SyncRun::Ran => {}
        SyncRun::Disabled => return Err(AppError::conflict_because("sync_disabled", "同步没有开启")),
        SyncRun::NotConfigured => {
            return Err(AppError::conflict_because("sync_not_configured", "同步已开启，但还没有填写同步位置"))
        }
    }
    Ok(deps.service.status().await?)
}

/// 用填的设置测一次能不能读写(不保存)。
pub async fn test_sync_target_view(
    deps: &SyncApiDeps,
    input: &SyncSettingsInput,
) -> Result<SyncTestView, AppError> {
    Ok(deps.service.test(input).await?)
}
