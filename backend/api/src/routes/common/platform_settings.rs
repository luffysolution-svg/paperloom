use crate::app::AppState;
use crate::services::accounts::PlatformSettingsApiDeps;

pub fn build_platform_settings_route_deps(state: &AppState) -> PlatformSettingsApiDeps {
    PlatformSettingsApiDeps::new(
        state.db.clone(),
        state.config.data_root.clone(),
        state.config.accounts.platform.clone(),
        state.config.provider_runtime.deepseek.clone(),
        state.config.provider_runtime.mineru.clone(),
        state.config.provider_runtime.paddle.clone(),
    )
}
