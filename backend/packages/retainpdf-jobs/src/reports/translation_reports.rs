use std::path::Path;

use retainpdf_api_base::error::AppError;
use retainpdf_core::models::api::{redact_json_value, sensitive_values};
use crate::views::{JobReportView, TranslationDiagnosticsView};
use retainpdf_core::models::domain::JobSnapshot;
use retainpdf_core::storage_paths::{
    resolve_fit_report, resolve_refine_report, resolve_translation_diagnostics,
    resolve_translation_qa,
};

use crate::translations::common::read_json_value;

pub(crate) fn load_translation_diagnostics_view(
    data_root: &Path,
    job: &JobSnapshot,
) -> Result<TranslationDiagnosticsView, AppError> {
    // 任务在、报告还没生成：404 + `reason: not_ready`（任务不存在是调用方 `load_supported_job` 的普通 404）。
    let path = resolve_translation_diagnostics(job, data_root)
        .ok_or_else(|| AppError::not_ready("translation report"))?;
    let secrets = sensitive_values(&job.request_payload);
    let summary = redact_json_value(&read_json_value(&path)?, &secrets);
    Ok(TranslationDiagnosticsView {
        job_id: job.job_id.clone(),
        summary,
    })
}

pub(crate) fn load_translation_qa_view(
    data_root: &Path,
    job: &JobSnapshot,
) -> Result<JobReportView, AppError> {
    let path =
        resolve_translation_qa(job, data_root).ok_or_else(|| AppError::not_ready("translation-qa report"))?;
    load_report_view(&path, job)
}

pub(crate) fn load_fit_report_view(
    data_root: &Path,
    job: &JobSnapshot,
) -> Result<JobReportView, AppError> {
    let path = resolve_fit_report(job, data_root).ok_or_else(|| AppError::not_ready("layout-fit report"))?;
    load_report_view(&path, job)
}

pub(crate) fn load_refine_report_view(
    data_root: &Path,
    job: &JobSnapshot,
) -> Result<JobReportView, AppError> {
    let path = resolve_refine_report(job, data_root).ok_or_else(|| AppError::not_ready("refine report"))?;
    load_report_view(&path, job)
}

fn load_report_view(path: &Path, job: &JobSnapshot) -> Result<JobReportView, AppError> {
    // 报告里带原文、译文片段和任务目录路径；和 diagnostics 一样过一遍脱敏。
    let secrets = sensitive_values(&job.request_payload);
    Ok(JobReportView {
        job_id: job.job_id.clone(),
        report: redact_json_value(&read_json_value(path)?, &secrets),
    })
}
