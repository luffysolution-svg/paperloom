use crate::app::AppState;
use crate::services::integrations::IntegrationApiDeps;

pub(crate) fn build_integration_route_deps(state: &AppState) -> IntegrationApiDeps<'_> {
    let public_base_url = std::env::var("PAPERLOOM_PUBLIC_BASE_URL").ok().and_then(|raw| {
        let mut url = url::Url::parse(raw.trim()).ok()?;
        if !matches!(url.scheme(), "https" | "http") || url.host_str().is_none()
            || !url.username().is_empty() || url.password().is_some() {
            return None;
        }
        url.set_query(None);
        url.set_fragment(None);
        Some(url.as_str().trim_end_matches('/').to_owned())
    });
    IntegrationApiDeps::new(
        state.db.as_ref(),
        state.uploads.as_ref(),
        &state.config.data_root,
        &state.config.downloads_dir,
        &state.download_generation,
        public_base_url,
    )
}
