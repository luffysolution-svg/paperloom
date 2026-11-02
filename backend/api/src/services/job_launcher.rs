use std::path::Path;

use crate::db::Db;
use crate::error::AppError;
use crate::job_events::persist_job_with_resources;
use crate::models::domain::{JobSnapshot, JobStatusKind};

use super::runtime_gateway::JobRuntimeLauncher;

#[derive(Clone)]
pub struct JobLaunchDeps<'a> {
    pub db: &'a Db,
    pub data_root: &'a Path,
    pub output_root: &'a Path,
    pub runtime: JobRuntimeLauncher,
    pub min_free_disk_bytes: u64,
    pub max_queued_jobs: u64,
}

impl<'a> JobLaunchDeps<'a> {
    pub fn new(
        db: &'a Db,
        data_root: &'a Path,
        output_root: &'a Path,
        runtime: JobRuntimeLauncher,
    ) -> Self {
        Self {
            db,
            data_root,
            output_root,
            runtime,
            min_free_disk_bytes: 0,
            max_queued_jobs: 0,
        }
    }

    pub fn with_admission_limits(mut self, min_free_disk_bytes: u64, max_queued_jobs: u64) -> Self {
        self.min_free_disk_bytes = min_free_disk_bytes;
        self.max_queued_jobs = max_queued_jobs;
        self
    }
}

pub(crate) fn ensure_job_admission(deps: &JobLaunchDeps<'_>) -> Result<(), AppError> {
    crate::disk_space::ensure_free_space(
        deps.data_root,
        deps.min_free_disk_bytes,
        "create or resume a job",
    )?;
    if deps.max_queued_jobs > 0 {
        let queued = deps.db.count_jobs_with_status(&JobStatusKind::Queued)?;
        if queued as u64 >= deps.max_queued_jobs {
            return Err(AppError::too_many_requests_because(
                "queue_full",
                format!(
                    "任务队列已满（{queued}/{}），请等待任务开始执行后再试。",
                    deps.max_queued_jobs
                ),
            ));
        }
    }
    Ok(())
}

pub fn start_job_execution(
    deps: &JobLaunchDeps<'_>,
    job: JobSnapshot,
) -> Result<JobSnapshot, AppError> {
    ensure_job_admission(deps)?;
    // The new contract must never silently use the legacy Python transport.
    // Worker rollout is a separate, explicit gate while migration is in flight.
    if job
        .request_payload
        .translation
        .execution_connection
        .is_some()
        && (std::env::var("RETAIN_MODEL_EXECUTOR_ENABLED").as_deref() != Ok("1")
            || std::env::var("RETAIN_MODEL_WORKER_ENABLED").as_deref() != Ok("1"))
    {
        return Err(AppError::ServiceUnavailable("Rust model worker rollout is not enabled; execution_connection will not fall back to Python transport".into()));
    }
    persist_job_with_resources(deps.db, deps.data_root, deps.output_root, &job)?;
    // 提交即链文档：主页卡片靠 documents.active_job_id 找运行中任务。
    // 以前只在终态回填，运行中刷新主页就丢转圈。这里尽力而为，失败只记日志，
    // 绝不影响提交；终态 lifecycle 会再次对账（成功覆盖、删除时 reconcile）。
    if let Some(upload_id) = job.upload_id.as_deref().filter(|id| !id.is_empty()) {
        match deps.db.link_job_to_document(&job.job_id, upload_id) {
            Ok(Some(document_id)) => {
                if let Err(error) = deps
                    .db
                    .set_document_active_job(&document_id, &job.job_id, None)
                {
                    tracing::warn!(
                        "library: set active job for {document_id} at submit failed: {error}"
                    );
                }
            }
            Ok(None) => {}
            Err(error) => {
                tracing::warn!(
                    "library: link job {} to document at submit failed: {error}",
                    job.job_id
                );
            }
        }
    }
    deps.runtime.launch(job.job_id.clone());
    Ok(job)
}
