use std::sync::Arc;

use crate::app::AppState;
use crate::services::backups::BackupService;
use crate::services::platform::BackupApiDeps;

pub(crate) fn build_backup_route_deps(state: &AppState) -> Arc<BackupService> {
    state.backups.clone()
}

pub(crate) fn build_database_backup_route_deps(state: &AppState) -> BackupApiDeps {
    BackupApiDeps::new(state.backup.clone())
}
