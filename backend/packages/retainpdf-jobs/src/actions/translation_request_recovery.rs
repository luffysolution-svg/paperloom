use std::path::Path;

use crate::views::TranslationRequestRecoveryView;
use retainpdf_core::models::domain::JobSnapshot;
use crate::{stored_path, StoredFile};

pub fn load_translation_request_recovery(
    job: &JobSnapshot,
    data_root: &Path,
) -> Option<TranslationRequestRecoveryView> {
    // Legacy stage planners have no database handle. Never mistake absence of
    // a Python journal for permission to retry a Rust-owned request.
    if job.uses_model_executor()
    {
        return Some(model_retry_blocked_view());
    }
    let path = stored_path(job, data_root, StoredFile::TranslationRequestJournal)?;
    Some(parse_translation_request_journal(&path))
}

fn model_retry_blocked_view() -> TranslationRequestRecoveryView {
    let mut view = corrupt_view(
        "Rust model recovery requires receipt-preserving retry support; legacy retry is disabled",
    );
    view.status = "blocked".into();
    view.journal_ready = false;
    view
}

pub fn load_translation_request_recovery_with_db(
    db: &retainpdf_data::db::Db,
    job: &JobSnapshot,
    data_root: &Path,
) -> Option<TranslationRequestRecoveryView> {
    if !job.uses_model_executor()
    {
        return load_translation_request_recovery(job, data_root);
    }
    let summary = match db.model_recovery_summary(&job.job_id) {
        Ok(Some(summary)) => summary,
        Ok(None) => return Some(model_retry_blocked_view()),
        Err(_) => return Some(corrupt_view("Rust model recovery state cannot be read")),
    };
    Some(TranslationRequestRecoveryView {
        status: if summary.ambiguous > 0 { "ambiguous" } else if summary.running > 0 { "running" } else if summary.paused { "paused" } else { "clean" }.into(),
        journal_ready: true,
        unresolved_dispatches: summary.running,
        active_ambiguous_request_keys: summary.ambiguous,
        historical_ambiguous_request_keys: summary.ambiguous,
        requires_confirmation: summary.ambiguous > 0 || summary.running > 0,
        // Acknowledgement alone cannot yet preserve successful receipts in a
        // new job. Do not advertise a recovery operation we cannot execute.
        supported_retry_policies: vec!["block".into()],
        detail: Some("Rust model receipts are preserved; legacy translation retry is disabled until receipt-preserving recovery is available".into()),
    })
}

fn parse_translation_request_journal(path: &Path) -> TranslationRequestRecoveryView {
    // 解析本身在核心包：runner 的重启自动续跑也要用同一份判据。
    let state = retainpdf_core::translation_request_journal::parse_translation_request_journal(path);
    if let Some(detail) = state.corrupt_detail {
        return corrupt_view(detail);
    }
    TranslationRequestRecoveryView {
        status: state.status.to_string(),
        journal_ready: true,
        unresolved_dispatches: state.unresolved_dispatches,
        active_ambiguous_request_keys: state.active_ambiguous_request_keys,
        historical_ambiguous_request_keys: state.historical_ambiguous_request_keys,
        requires_confirmation: state.requires_confirmation,
        supported_retry_policies: supported_retry_policies(),
        detail: state.requires_confirmation.then(|| {
            "translation retry is paused until duplicate-request risk is explicitly accepted"
                .to_string()
        }),
    }
}

fn corrupt_view(detail: &str) -> TranslationRequestRecoveryView {
    TranslationRequestRecoveryView {
        status: "corrupt".to_string(),
        journal_ready: true,
        unresolved_dispatches: 0,
        active_ambiguous_request_keys: 0,
        historical_ambiguous_request_keys: 0,
        requires_confirmation: true,
        supported_retry_policies: vec!["block".to_string()],
        detail: Some(detail.to_string()),
    }
}

fn supported_retry_policies() -> Vec<String> {
    vec!["block".to_string(), "accept_duplicate_risk".to_string()]
}
