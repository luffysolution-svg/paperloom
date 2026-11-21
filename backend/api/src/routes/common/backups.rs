use std::sync::Arc;

use crate::app::AppState;
use crate::services::backups::BackupService;

pub(crate) fn build_backup_route_deps(state: &AppState) -> Arc<BackupService> {
    state.backups.clone()
}
