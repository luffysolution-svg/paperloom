use crate::app::AppState;
use crate::services::integrations::IntegrationApiDeps;

pub(crate) fn build_integration_route_deps(state: &AppState) -> IntegrationApiDeps<'_> {
    IntegrationApiDeps::new(
        state.db.as_ref(),
        state.uploads.as_ref(),
        &state.config.data_root,
        &state.config.downloads_dir,
        &state.download_generation,
        None,
    )
}
