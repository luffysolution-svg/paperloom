use crate::app::AppState;
use crate::services::health_api::HealthApiDeps;

pub fn build_health_route_deps(state: &AppState) -> HealthApiDeps<'_> {
    HealthApiDeps::new(
        state.db.as_ref(),
        state.config.jobs_service.is_remote() && state.config.jobs_service.supervise,
    )
    .with_disk(&state.config.data_root, state.config.min_free_disk_bytes)
}
