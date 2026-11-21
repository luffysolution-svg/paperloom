//! 用量汇总的应用接口：路由只经这里取数，不直接碰数据库和配置。

use std::path::PathBuf;
use std::sync::Arc;

use retainpdf_data::db::Db;
use retainpdf_api_base::error::AppError;
use retainpdf_api_base::job_loading::load_supported_job;
use retainpdf_core::storage_paths::JobPaths;

pub use super::UsageSummaryView;
use super::{all_job_ids, assistant_usage_ledger_path, read_ledger, summarize_jobs};

/// 自己持有数据（Arc + PathBuf），可以搬进阻塞线程。
#[derive(Clone)]
pub struct UsageApiDeps {
    db: Arc<Db>,
    output_root: PathBuf,
    data_root: PathBuf,
}

impl UsageApiDeps {
    pub fn new(db: Arc<Db>, output_root: PathBuf, data_root: PathBuf) -> Self {
        Self { db, output_root, data_root }
    }
}

/// 单个任务（含它的原地精修、重渲染）。任务不存在时 404。
///
/// 和其余读任务的接口一样走 `load_supported_job`：认合并阅读的虚拟 id（合并结果自己没有用量，
/// 给空汇总），旧目录格式的任务报 409，库读不出来报 500。
///
/// 有意保留的一条：库里没有这个任务、但 `output/<任务>/` 目录还在，仍然给 200（用量账本在任务目录里，
/// 和全局汇总 `all_usage_view` 一样不依赖数据库）；库里删掉记录之后，花过多少 token 仍然查得到。
/// 只有「库里没有、目录也没有」才是 404。
pub fn job_usage_view(deps: &UsageApiDeps, job_id: &str) -> Result<UsageSummaryView, AppError> {
    match load_supported_job(&deps.db, &deps.data_root, job_id) {
        Ok(_) => {}
        Err(AppError::NotFound(_)) if JobPaths::for_job(&deps.output_root, job_id).root.is_dir() => {}
        Err(error) => return Err(error),
    }
    Ok(summarize_jobs("job", &deps.output_root, [job_id], Vec::new()))
}

/// 这本书的全部任务，加上问这本书时助手花的。书不存在时 404（和 `job_usage_view` 一致，以前给 200 和
/// 全零汇总）；有书没任务照旧 200 空汇总。
pub fn document_usage_view(deps: &UsageApiDeps, document_id: &str) -> Result<UsageSummaryView, AppError> {
    deps.db
        .get_document(document_id)
        .map_err(|error| AppError::from_lookup(error, format!("document not found: {document_id}")))?;
    let jobs = deps
        .db
        .list_jobs_for_document(document_id, u32::MAX, 0)
        .map_err(|error| AppError::internal(format!("list document jobs failed: {error:#}")))?;
    let assistant = read_ledger(&assistant_usage_ledger_path(&deps.data_root))
        .into_iter()
        .filter(|record| record.document_id == document_id)
        .collect();
    Ok(summarize_jobs("document", &deps.output_root, jobs.iter().map(|job| job.job_id.as_str()), assistant))
}

/// 现存的全部任务加上助手。删掉的书不再计入。
/// `owner` 非空（多用户模式的网站账号）时只算这个账号的任务；助手对网站账号还没开放，不计。
pub fn all_usage_view(deps: &UsageApiDeps, owner: Option<&str>) -> Result<UsageSummaryView, AppError> {
    if let Some(owner) = owner {
        let ids = deps
            .db
            .job_ids_for_owner(owner)
            .map_err(|error| AppError::internal(format!("list owned jobs failed: {error:#}")))?;
        return Ok(summarize_jobs("all", &deps.output_root, ids.iter().map(String::as_str), Vec::new()));
    }
    let ids = all_job_ids(&deps.output_root);
    let assistant = read_ledger(&assistant_usage_ledger_path(&deps.data_root));
    Ok(summarize_jobs("all", &deps.output_root, ids.iter().map(String::as_str), assistant))
}
