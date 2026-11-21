//! 只读查询的入口 `JobQueries`。各类的查询方法写在各自目录的 `queries.rs` 里；按编号取任务在 `retainpdf_api_base::job_loading`。

use std::path::Path;

use retainpdf_data::db::Db;
use retainpdf_api_base::error::AppError;
use retainpdf_api_base::job_loading::load_supported_job;
use crate::support::checked_limit;
use crate::views::ListJobsQuery;
use retainpdf_core::config::limits::MAX_JOB_LIMIT;
use retainpdf_core::models::domain::JobSnapshot;

/// Read-only job views require only persisted state and its artifacts, never a
/// launcher, upload service, or download/replay configuration.
pub struct JobQueries<'a> {
    pub(crate) db: &'a Db,
    pub(crate) data_root: &'a Path,
}

impl<'a> JobQueries<'a> {
    pub fn new(db: &'a Db, data_root: &'a Path) -> Self {
        Self { db, data_root }
    }

    pub(crate) fn load_supported_job_snapshot(
        &self,
        job_id: &str,
    ) -> Result<JobSnapshot, AppError> {
        load_supported_job(self.db, self.data_root, job_id)
    }
}

/// 任务列表的一页。`limit` 是实际生效的条数上限，`has_more` 由多取一条算出，不需要 COUNT。
pub struct JobsPage {
    pub jobs: Vec<JobSnapshot>,
    pub limit: u32,
    pub has_more: bool,
}

pub fn list_jobs_filtered(db: &Db, query: &ListJobsQuery) -> Result<JobsPage, AppError> {
    let limit = checked_limit(query.limit, MAX_JOB_LIMIT)?;
    let search_query = query
        .q
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_ascii_lowercase);
    let job_ids: Option<Vec<String>> = query
        .job_ids
        .as_deref()
        .map(|raw| {
            raw.split(',')
                .map(str::trim)
                .filter(|id| !id.is_empty())
                .map(str::to_string)
                .collect::<Vec<_>>()
        })
        .filter(|ids| !ids.is_empty());
    let mut jobs = db.select_jobs(
        &retainpdf_data::db::JobListSelection {
            status: query.status.as_ref(),
            workflow: query.workflow.as_ref(),
            provider: query.provider.as_deref(),
            job_ids: job_ids.as_deref(),
            include_upload_filename: search_query.is_some(),
            // 列表项上显示的书名可能来自所属文档的标题（改过名的书），也要能搜到。
            title_contains: search_query.as_deref(),
            // 多取一条：有第 limit+1 条就说明还有下一页。
            limit: Some(limit.saturating_add(1)),
            offset: query.offset,
            owner: query.owner.as_deref(),
            ..Default::default()
        },
        |job, upload_filename| {
            search_query
                .as_deref()
                .map(|q| job_search_text(job, upload_filename).contains(q))
                .unwrap_or(true)
        },
    )?;
    let has_more = jobs.len() > limit as usize;
    jobs.truncate(limit as usize);
    Ok(JobsPage {
        jobs,
        limit,
        has_more,
    })
}

/// `?q=` 在任务上搜的文本：编号、阶段、阶段说明、错误、来源地址、来源文件名，转成 ASCII 小写。
/// 任务列表（`/jobs?q=`）用（书架 `/library/books?q=` 以前也用，2026-10-22 删了）；任务列表另外还搜所属文档的标题。
pub fn job_search_text(job: &JobSnapshot, upload_filename: Option<&str>) -> String {
    let source_filename = upload_filename
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .map(str::to_string)
        .or_else(|| retainpdf_files::source_url_file_name(job.source_url()));
    [
        job.job_id.as_str(),
        job.stage.as_deref().unwrap_or(""),
        job.stage_detail.as_deref().unwrap_or(""),
        job.error.as_deref().unwrap_or(""),
        job.source_url(),
        source_filename.as_deref().unwrap_or(""),
    ]
    .join(" ")
    .to_ascii_lowercase()
}
