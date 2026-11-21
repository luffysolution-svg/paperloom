use retainpdf_api_base::error::AppError;
use crate::views::{ActionBlockReason, RetryStageKind};
use retainpdf_core::models::domain::{CreateJobInput, JobSnapshot, WorkflowKind};
use retainpdf_core::models::request::JobSourceInput;
use retainpdf_data::ocr_provider::strip_server_owned_ocr_options;
use crate::actions::rerun_glossary::restore_inline_glossary_entries;

pub(super) fn build_retry_request(
    source_job: &JobSnapshot,
    stage: &RetryStageKind,
) -> Result<CreateJobInput, AppError> {
    let workflow = match stage {
        RetryStageKind::Ocr => WorkflowKind::Book,
        RetryStageKind::Translation => WorkflowKind::Book,
        RetryStageKind::Render => WorkflowKind::Render,
        RetryStageKind::Refine => {
            return Err(AppError::bad_request(
                "refine retry runs in place on the source job; set create_new_job=false",
            ))
        }
    };
    let mut request = CreateJobInput {
        workflow,
        source: JobSourceInput::default(),
        ocr: source_job.request_payload.ocr.clone(),
        translation: source_job.request_payload.translation.clone(),
        render: source_job.request_payload.render.clone(),
        runtime: source_job.request_payload.runtime.clone(),
    };
    match stage {
        RetryStageKind::Ocr => {
            request.source.upload_id = source_job.request_payload.source.upload_id.clone();
            request.source.source_url = source_job.request_payload.source.source_url.clone();
            require_request_source(&request)?;
        }
        RetryStageKind::Translation => {
            let artifacts = source_job
                .artifacts
                .as_ref()
                .ok_or_else(no_reusable_artifacts)?;
            require_artifact(
                artifacts.normalized_document_json.as_ref(),
                "normalized_document_json",
            )?;
            require_artifact(artifacts.source_pdf.as_ref(), "source_pdf")?;
            request.source.artifact_job_id = source_job.job_id.clone();
        }
        RetryStageKind::Render => {
            let artifacts = source_job
                .artifacts
                .as_ref()
                .ok_or_else(no_reusable_artifacts)?;
            require_artifact(artifacts.translations_dir.as_ref(), "translations_dir")?;
            require_artifact(artifacts.source_pdf.as_ref(), "source_pdf")?;
            request.source.artifact_job_id = source_job.job_id.clone();
        }
        RetryStageKind::Refine => unreachable!("refine is rejected above"),
    }
    request.runtime.job_id.clear();
    // 老任务的请求里可能存着只能服务器定的 OCR 选项（2026-10-22 之前建任务不拦）：复制时去掉，
    // 重试不因此 400，也不再带下去。overrides 里再带就 400（stage_retry_overrides）。
    strip_server_owned_ocr_options(&mut request.ocr);
    restore_inline_glossary_entries(source_job, &mut request);
    Ok(request)
}

fn require_request_source(request: &CreateJobInput) -> Result<(), AppError> {
    if !request.source.upload_id.trim().is_empty() || !request.source.source_url.trim().is_empty() {
        return Ok(());
    }
    Err(ActionBlockReason::ArtifactsMissing.conflict(
        "OCR retry requires the original upload_id or source_url",
    ))
}

fn require_artifact(value: Option<&String>, name: &str) -> Result<(), AppError> {
    if value.as_ref().is_some_and(|item| !item.trim().is_empty()) {
        return Ok(());
    }
    Err(ActionBlockReason::ArtifactsMissing.conflict(format!(
        "source job missing required artifact: {name}"
    )))
}

fn no_reusable_artifacts() -> AppError {
    ActionBlockReason::ArtifactsMissing.conflict("source job has no reusable artifacts")
}
