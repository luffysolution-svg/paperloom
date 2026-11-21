//! 重跑、阶段重试出新任务时的术语表：用现在的表，加上用户当时内联的条目（2026-10-22 定）。
//!
//! 源任务请求里的 `glossary_entries` 是建任务时和表合并后的快照，不能原样再当内联条目解析一次
//! （表里改过的译法、删掉的词会被旧快照盖回来）。所以先换回用户真正内联的那些，再走 `submit_job`
//! 里的 `resolve_task_glossary_request` 按现在的表重新合并；源任务用的表已经删了（或停用了）是 409。
//! 渲染不用术语，出新渲染任务时原样留着快照。

use retainpdf_api_base::error::AppError;
use retainpdf_core::models::domain::{JobSnapshot, WorkflowKind};
use retainpdf_core::models::request::CreateJobInput;
use retainpdf_data::db::Db;
use retainpdf_glossaries::require_glossary_for_rerun;

fn resolves_glossary(request: &CreateJobInput) -> bool {
    request.workflow != WorkflowKind::Render
}

/// 在套用 overrides 之前调：overrides 里给了 `glossary_entries` 的，以 overrides 为准。
pub(super) fn restore_inline_glossary_entries(source_job: &JobSnapshot, request: &mut CreateJobInput) {
    if resolves_glossary(request) {
        request.translation.glossary_entries = source_job.glossary_inline_entries_for_rerun();
    }
}

/// 在套用 overrides 之后、`submit_job` 之前调。只管源任务那张表：overrides 换成了别的表，
/// 别的表不在是请求写错了，照建任务的规矩 400。
pub(super) fn require_source_glossary(
    db: &Db,
    source_job: &JobSnapshot,
    request: &CreateJobInput,
) -> Result<(), AppError> {
    let Some(glossary_id) = source_job.translation_glossary_id() else {
        return Ok(());
    };
    if !resolves_glossary(request) || request.translation.glossary_id.trim() != glossary_id {
        return Ok(());
    }
    require_glossary_for_rerun(db, glossary_id)
}
