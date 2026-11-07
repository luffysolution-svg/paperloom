use crate::error::AppError;
use crate::models::domain::{JobSnapshot, ResolvedJobSpec, UploadRecord, WorkflowKind};
use crate::models::request::CreateJobInput;
use crate::ocr_provider::uses_paddle_official_cli;
use crate::services::glossaries::resolve_task_glossary_request;
use crate::services::job_validation::{
    validate_mineru_upload_limits, validate_ocr_credential_reference,
    validate_ocr_provider_request, validate_provider_credentials, validate_render_options,
    validate_translation_credential_reference, validate_translation_credentials,
    validate_translation_modes,
};
use crate::services::ocr_artifact_reuse::validate_ocr_artifact_reuse;

use crate::services::jobs::deps::SnapshotBuildDeps;

/// A saved BYOK connection is resolved before validation and vault import.
/// Retries already contain a frozen vault reference and keep that snapshot.
fn resolve_translation_connection(
    root: &std::path::Path,
    mut input: CreateJobInput,
) -> Result<CreateJobInput, AppError> {
    let translation = &mut input.translation;
    if translation.connection_id.is_empty()
        || !translation.credential_ref.is_empty()
        || !translation.api_key.is_empty()
    {
        return Ok(input);
    }
    let id = translation.connection_id.clone();
    let path = root.join("secrets/ai-connections.json");
    let mut record = serde_json::Value::Null;
    if path.exists() {
        let metadata = std::fs::symlink_metadata(&path)
            .map_err(|_| AppError::internal("cannot read AI connection metadata"))?;
        if metadata.file_type().is_symlink() || metadata.len() > 2 * 1024 * 1024 {
            return Err(AppError::internal("invalid AI connection file"));
        }
        let data: serde_json::Value = serde_json::from_slice(
            &std::fs::read(&path).map_err(|_| AppError::internal("cannot read AI connections"))?,
        )
        .map_err(|_| AppError::internal("invalid AI connections"))?;
        record = data["connections"]
            .as_array()
            .and_then(|records| records.iter().find(|r| r["id"] == id))
            .cloned()
            .unwrap_or_default();
    }
    if record.is_null() && id == "legacy" {
        let runtime = std::fs::read(root.join("secrets/ai-runtime.json"))
            .ok()
            .and_then(|raw| serde_json::from_slice::<serde_json::Value>(&raw).ok())
            .unwrap_or_default();
        let value = |field: &str, variable: &str, default: &str| {
            runtime[field]
                .as_str()
                .filter(|v| !v.is_empty())
                .map(str::to_owned)
                .unwrap_or_else(|| std::env::var(variable).unwrap_or_else(|_| default.to_owned()))
        };
        record = serde_json::json!({"kind":"byok", "base_url":value("llm_base_url","RETAIN_AI_LLM_BASE_URL","https://api.deepseek.com/v1"),
            "model":value("llm_model","RETAIN_AI_LLM_MODEL","deepseek-flash"), "api_protocol":value("llm_api_protocol","RETAIN_AI_LLM_API_PROTOCOL","openai"),
            "api_key":value("llm_api_key","RETAIN_AI_LLM_API_KEY","")});
        if record["api_key"].as_str().unwrap_or("").is_empty() {
            if let Some(reference) = runtime["llm_credential_ref"]
                .as_str()
                .filter(|v| !v.is_empty())
            {
                record["api_key"] = serde_json::json!(
                    retain_data::credentials::resolve_credential(
                        root,
                        reference,
                        "agent_llm_api_key"
                    )
                    .map_err(|_| AppError::bad_request("AI connection credential is unavailable"))?
                    .secret
                );
            }
        }
    }
    if record["kind"] != "byok" {
        return Err(AppError::bad_request("请选择有效的 BYOK 翻译连接"));
    }
    translation.api_key = record["api_key"].as_str().unwrap_or("").to_owned();
    if translation.api_key.is_empty() {
        return Err(AppError::bad_request("此模型连接尚未配置 API Key"));
    }
    translation.base_url = record["base_url"].as_str().unwrap_or("").to_owned();
    translation.api_protocol = record["api_protocol"]
        .as_str()
        .unwrap_or("openai")
        .to_owned();
    if translation.model.trim().is_empty() {
        translation.model = record["model"].as_str().unwrap_or("").to_owned();
    }
    Ok(input)
}

#[cfg(test)]
mod connection_tests {
    use super::*;

    #[test]
    fn byok_translation_freezes_protocol_model_and_secret_before_vault_import() {
        let root = std::env::temp_dir().join(format!("paperloom-byok-{}", fastrand::u64(..)));
        std::fs::create_dir_all(root.join("secrets")).unwrap();
        let path = root.join("secrets/ai-connections.json");
        std::fs::write(&path, serde_json::to_vec(&serde_json::json!({"connections":[
            {"id":"api","kind":"byok","model":"default","base_url":"https://example.test/v1","api_protocol":"anthropic","api_key":"test-key"},
            {"id":"agent","kind":"byoa"}
        ]})).unwrap()).unwrap();
        let mut input = CreateJobInput::default();
        input.translation.connection_id = "api".into();
        input.translation.model = "chosen-model".into();
        let resolved = resolve_translation_connection(&root, input.clone()).unwrap();
        assert_eq!(resolved.translation.api_protocol, "anthropic");
        assert_eq!(resolved.translation.model, "chosen-model");
        assert_eq!(resolved.translation.api_key, "test-key");
        // A retry keeps the task's immutable credential even after deletion.
        std::fs::remove_file(&path).unwrap();
        input.translation.credential_ref = "cred_frozen".into();
        assert_eq!(
            resolve_translation_connection(&root, input)
                .unwrap()
                .translation
                .credential_ref,
            "cred_frozen"
        );
        std::fs::remove_dir_all(root).unwrap();
    }
}

fn load_upload_or_404(db: &crate::db::Db, upload_id: &str) -> Result<UploadRecord, AppError> {
    db.get_upload(upload_id)
        .map_err(|_| AppError::not_found(format!("upload not found: {upload_id}")))
}

pub(super) struct PreparedTranslationUpload {
    pub(super) spec: ResolvedJobSpec,
}

pub(super) struct PreparedTranslateOnlyInput {
    pub(super) spec: ResolvedJobSpec,
}

pub(super) struct PreparedRenderInput {
    pub(super) spec: ResolvedJobSpec,
}

pub(super) struct PreparedOcrInput {
    pub(super) spec: ResolvedJobSpec,
}

pub(super) fn prepare_full_pipeline_input(
    ctx: &SnapshotBuildDeps<'_>,
    input: &CreateJobInput,
) -> Result<PreparedTranslationUpload, AppError> {
    let input = resolve_translation_connection(
        ctx.config.data_root,
        resolve_task_glossary_request(ctx.db, input)?,
    )?;
    validate_render_options(&input)?;
    validate_translation_modes(&input)?;
    validate_translation_credential_reference(&input, ctx.config.data_root)?;
    if !input.source.artifact_job_id.trim().is_empty() {
        validate_translation_credentials(&input)?;
        let page_count = artifact_document_page_count(ctx, &input.source.artifact_job_id)?;
        let selection =
            validate_ocr_artifact_reuse(ctx.db, ctx.config.data_root, &input, None, page_count)?;
        let mut spec = ResolvedJobSpec::from_input(input);
        spec.translation.start_page = selection.start_page;
        spec.translation.end_page = selection.end_page;
        return Ok(PreparedTranslationUpload { spec });
    }
    let _ = require_translation_upload(ctx, &input)?;
    Ok(PreparedTranslationUpload {
        spec: ResolvedJobSpec::from_input(input),
    })
}

pub(super) fn prepare_translate_only_input(
    ctx: &SnapshotBuildDeps<'_>,
    input: &CreateJobInput,
) -> Result<PreparedTranslateOnlyInput, AppError> {
    let input = resolve_translation_connection(
        ctx.config.data_root,
        resolve_task_glossary_request(ctx.db, input)?,
    )?;
    validate_render_options(&input)?;
    validate_translation_modes(&input)?;
    validate_translation_credential_reference(&input, ctx.config.data_root)?;
    if input.source.artifact_job_id.trim().is_empty() {
        let _ = require_translation_upload(ctx, &input)?;
    } else {
        validate_translation_credentials(&input)?;
        let page_count = artifact_document_page_count(ctx, &input.source.artifact_job_id)?;
        let selection =
            validate_ocr_artifact_reuse(ctx.db, ctx.config.data_root, &input, None, page_count)?;
        let mut spec = ResolvedJobSpec::from_input(input);
        spec.workflow = WorkflowKind::Translate;
        spec.translation.start_page = selection.start_page;
        spec.translation.end_page = selection.end_page;
        return Ok(PreparedTranslateOnlyInput { spec });
    }
    let mut spec = ResolvedJobSpec::from_input(input);
    spec.workflow = WorkflowKind::Translate;
    Ok(PreparedTranslateOnlyInput { spec })
}

pub(super) fn prepare_render_input(
    ctx: &SnapshotBuildDeps<'_>,
    input: &CreateJobInput,
) -> Result<PreparedRenderInput, AppError> {
    if input.source.artifact_job_id.trim().is_empty() {
        return Err(AppError::bad_request(
            "source.artifact_job_id is required for render workflow",
        ));
    }
    let source_job = ctx.db.get_job(&input.source.artifact_job_id).map_err(|_| {
        AppError::not_found(format!(
            "artifact job not found: {}",
            input.source.artifact_job_id
        ))
    })?;
    reject_paddle_cli_artifact(&source_job)?;
    validate_render_options(input)?;
    validate_translation_modes(input)?;
    let mut spec = ResolvedJobSpec::from_input(input.clone());
    spec.workflow = WorkflowKind::Render;
    Ok(PreparedRenderInput { spec })
}

pub(super) fn prepare_ocr_input(
    ctx: &SnapshotBuildDeps<'_>,
    input: &CreateJobInput,
    upload: Option<&UploadRecord>,
) -> Result<PreparedOcrInput, AppError> {
    validate_ocr_provider_request(input)?;
    validate_ocr_credential_reference(input, ctx.config.data_root)?;
    // Direct file upload (multipart file) takes precedence
    if let Some(upload) = upload {
        let mut resolved = ResolvedJobSpec::from_input(input.clone());
        resolved.workflow = WorkflowKind::Ocr;
        resolved.source.upload_id = upload.upload_id.clone();
        validate_mineru_upload_limits(input, upload, ctx.config.provider_limits)?;
        return Ok(PreparedOcrInput { spec: resolved });
    }
    // Reuse existing upload via upload_id (frontend after POST /uploads)
    if !input.source.upload_id.trim().is_empty() {
        let existing = load_upload_or_404(ctx.db, input.source.upload_id.trim())?;
        let mut resolved = ResolvedJobSpec::from_input(input.clone());
        resolved.workflow = WorkflowKind::Ocr;
        resolved.source.upload_id = existing.upload_id.clone();
        validate_mineru_upload_limits(input, &existing, ctx.config.provider_limits)?;
        return Ok(PreparedOcrInput { spec: resolved });
    }
    if !input.source.source_url.trim().is_empty() {
        let mut resolved = ResolvedJobSpec::from_input(input.clone());
        resolved.workflow = WorkflowKind::Ocr;
        return Ok(PreparedOcrInput { spec: resolved });
    }
    eprintln!(
        "[prepare_ocr_input] no file/upload_id/source_url: upload={:?} upload_id='{}' source_url='{}' workflow={:?}",
        upload.map(|u| &u.upload_id),
        input.source.upload_id,
        input.source.source_url,
        input.workflow
    );
    return Err(AppError::bad_request(
        "either file, upload_id, or source_url is required",
    ));
}

fn require_translation_upload(
    ctx: &SnapshotBuildDeps<'_>,
    input: &CreateJobInput,
) -> Result<UploadRecord, AppError> {
    if input.source.upload_id.trim().is_empty() {
        return Err(AppError::bad_request("upload_id is required"));
    }
    validate_provider_credentials(input)?;
    validate_ocr_credential_reference(input, ctx.config.data_root)?;
    validate_render_options(input)?;
    validate_translation_modes(input)?;
    let upload = load_upload_or_404(ctx.db, &input.source.upload_id)?;
    validate_mineru_upload_limits(input, &upload, ctx.config.provider_limits)?;
    Ok(upload)
}

fn artifact_document_page_count(
    ctx: &SnapshotBuildDeps<'_>,
    artifact_job_id: &str,
) -> Result<Option<u32>, AppError> {
    Ok(ctx
        .db
        .get_document_by_job_id(artifact_job_id)?
        .map(|document| document.page_count))
}

fn reject_paddle_cli_artifact(source_job: &JobSnapshot) -> Result<(), AppError> {
    if uses_paddle_official_cli(&source_job.request_payload.ocr) {
        return Err(AppError::bad_request(format!(
            "artifact job {} was produced by PaddleOCR official_cli and cannot be used for translation or render because it does not provide the required bbox/prunedResult contract",
            source_job.job_id
        )));
    }
    Ok(())
}
