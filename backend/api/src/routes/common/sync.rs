use crate::app::AppState;
use crate::services::platform::SyncApiDeps;

pub fn build_sync_route_deps(state: &AppState) -> SyncApiDeps {
    SyncApiDeps::new(state.sync.clone())
}
