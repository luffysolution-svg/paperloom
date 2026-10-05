use crate::app::AppState;
use crate::services::library::LibraryDeps;

pub struct LibraryRouteDeps<'a> {
    pub library: LibraryDeps<'a>,
    pub default_port: u16,
    pub bind_host: String,
}

/// Ordinary library requests need no job runtime. Routes that operate on jobs
/// compose these resources with the existing jobs route dependencies explicitly.
pub fn build_library_route_deps(state: &AppState) -> LibraryRouteDeps<'_> {
    LibraryRouteDeps {
        library: LibraryDeps {
            db: state.db.as_ref(),
            data_root: &state.config.data_root,
            output_root: &state.config.output_root,
            downloads_dir: &state.config.downloads_dir,
            scripts_dir: &state.config.scripts_dir,
            python_bin: &state.config.python_bin,
            asset_config: &state.config.asset,
        },
        default_port: state.config.port,
        bind_host: state.config.bind_host.clone(),
    }
}
