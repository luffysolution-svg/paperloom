pub mod app;
pub mod auth;
pub mod models;
pub mod routes;
pub(crate) mod runtime;
pub mod services;

pub use retainpdf_api_base::error;
pub use retainpdf_core::{config, job_failure, storage_paths};
pub use retainpdf_data::{db, job_events, ocr_provider, worker_command};
pub use retainpdf_runner::job_runner;
pub use retainpdf_proc as process;

#[cfg(test)]
mod api_tests;

#[cfg(test)]
pub(crate) mod test_support;

pub use app::{
    build_app, build_simple_app, build_state, run_servers, run_servers_with_shutdown,
    spawn_servers, stop_owned_workers_after_shutdown, AppState, RunningServers,
};
