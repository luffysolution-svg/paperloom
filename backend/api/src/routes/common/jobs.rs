use std::num::NonZeroU64;

use retain_core::config::effective_upload_max_bytes;

use crate::app::{build_jobs_facade_from_state, AppState};
use crate::services::jobs::{JobDownloads, JobQueries, JobsFacade};

pub struct JobsDownloadRouteDeps<'a> {
    pub downloads: JobDownloads<'a>,
    pub default_port: u16,
    pub bind_host: String,
}

pub fn build_jobs_download_route_deps(state: &AppState) -> JobsDownloadRouteDeps<'_> {
    JobsDownloadRouteDeps {
        downloads: JobDownloads::new(
            state.db.as_ref(),
            &state.config.data_root,
            &state.config.downloads_dir,
            &state.download_generation,
            &state.config.python_bin,
            &state.config.pipeline_command,
            state.config.public_base_url.as_deref(),
        ),
        default_port: state.config.port,
        bind_host: state.config.bind_host.clone(),
    }
}

/// Transfer only read capabilities into the bounded blocking worker.
pub async fn run_job_query<T>(
    state: &AppState,
    key: String,
    work: impl for<'a> FnOnce(JobQueries<'a>) -> Result<T, crate::error::AppError> + Send + 'static,
) -> Result<T, crate::error::AppError>
where
    T: Clone + Send + Sync + 'static,
{
    let db = state.db.clone();
    let root = state.config.data_root.clone();
    state
        .query_execution
        .run(key, move || work(JobQueries::new(&db, &root)))
        .await
}

/// Non-clone DTOs use the same bounded executor without sharing their result.
pub async fn run_job_query_once<T>(
    state: &AppState,
    key: String,
    work: impl for<'a> FnOnce(JobQueries<'a>) -> Result<T, crate::error::AppError> + Send + 'static,
) -> Result<T, crate::error::AppError>
where
    T: Send + 'static,
{
    run_read_query_once(state, key, move |db, root| work(JobQueries::new(db, root))).await
}

/// Read-only library projections use the same pool without capturing library
/// mutation, asset generation or job execution capabilities.
pub async fn run_read_query_once<T>(
    state: &AppState,
    key: String,
    work: impl FnOnce(&crate::db::Db, &std::path::Path) -> Result<T, crate::error::AppError>
        + Send
        + 'static,
) -> Result<T, crate::error::AppError>
where
    T: Send + 'static,
{
    let db = state.db.clone();
    let root = state.config.data_root.clone();
    let key = format!("one-shot:{key}:{:032x}", fastrand::u128(..));
    let result = state
        .query_execution
        .run(key, move || {
            work(&db, &root).map(|value| std::sync::Arc::new(std::sync::Mutex::new(Some(value))))
        })
        .await?;
    let value = result
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .take();
    value.ok_or_else(|| crate::error::AppError::internal("query result already consumed"))
}

pub struct JobsQueryRouteDeps<'a> {
    pub jobs: JobQueries<'a>,
    pub default_port: u16,
    pub bind_host: String,
}

pub fn build_jobs_query_route_deps(state: &AppState) -> JobsQueryRouteDeps<'_> {
    JobsQueryRouteDeps {
        jobs: JobQueries::new(state.db.as_ref(), &state.config.data_root),
        default_port: state.config.port,
        bind_host: state.config.bind_host.clone(),
    }
}

pub struct JobsRouteDeps<'a> {
    pub jobs: JobsFacade<'a>,
    pub default_port: u16,
    pub bind_host: String,
    pub upload_max_bytes: NonZeroU64,
}

pub fn build_jobs_route_deps(state: &AppState) -> JobsRouteDeps<'_> {
    JobsRouteDeps {
        jobs: build_jobs_facade_from_state(state),
        default_port: state.config.port,
        bind_host: state.config.bind_host.clone(),
        upload_max_bytes: effective_upload_max_bytes(state.config.upload_max_bytes),
    }
}

pub fn jobs_facade(deps: JobsRouteDeps<'_>) -> JobsFacade<'_> {
    deps.jobs
}
