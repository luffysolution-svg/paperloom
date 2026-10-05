use super::extract_structured_failure;
use crate::job_failure::{classify_job_failure, STRUCTURED_FAILURE_LABEL};
use crate::models::domain::{JobSnapshot, JobStatusKind};
use crate::models::request::CreateJobInput;
use serde_json::json;

#[test]
fn classify_worker_failure_accepts_dual_protocol_fields_and_preserves_traceback() {
    let message = "name 'BBOX_TEXT_STRIP_PAGE_SKIP_NO_TEXT_OVERLAP' is not defined";
    let traceback = format!("Traceback (most recent call last):\nNameError: {message}");
    // Match the Python worker's emitted shape: canonical and legacy fields coexist.
    let payload = json!({
        "failed_stage": "render", "stage": "render",
        "failure_code": "python_unhandled_exception", "error_type": "python_unhandled_exception",
        "failure_category": "render", "detail": message,
        "summary": "任务失败，但暂未识别出明确根因",
        "retryable": true, "provider": "rendering",
        "raw_excerpt": message, "raw_exception_type": "NameError",
        "raw_exception_message": message, "traceback": traceback,
        "suggestion": "检查渲染输入、字体和编译环境。"
    });
    let mut job = JobSnapshot::new(
        "render-failure".to_string(),
        CreateJobInput::default(),
        vec!["python".to_string()],
    );
    job.status = JobStatusKind::Failed;
    job.stage = Some("failed".to_string());
    job.error = Some(format!(
        "{traceback}\n{STRUCTURED_FAILURE_LABEL}: {payload}\n"
    ));

    let failure = classify_job_failure(&job).expect("structured failure");
    assert_eq!(
        failure.failure_code.as_deref(),
        Some("python_unhandled_exception")
    );
    assert_eq!(failure.failed_stage.as_deref(), Some("render"));
    assert_eq!(failure.failure_category.as_deref(), Some("render"));
    assert_eq!(failure.root_cause.as_deref(), Some(message));
    assert_eq!(failure.raw_excerpt.as_deref(), Some(message));
    let raw = failure.raw_diagnostic.expect("raw diagnostic");
    assert_eq!(raw.raw_exception_type.as_deref(), Some("NameError"));
    assert_eq!(raw.raw_exception_message.as_deref(), Some(message));
    assert_eq!(raw.traceback.as_deref(), Some(traceback.as_str()));
}

#[test]
fn structured_failure_prefers_canonical_fields_over_conflicting_legacy_fields() {
    let payload = json!({
        "failed_stage": "render", "stage": "translation",
        "failure_code": "python_unhandled_exception", "error_type": "old_error",
        "root_cause": "current cause", "detail": "legacy cause"
    });
    let parsed = extract_structured_failure(
        STRUCTURED_FAILURE_LABEL,
        &format!("{STRUCTURED_FAILURE_LABEL}: {payload}"),
    )
    .expect("dual-field payload");
    assert_eq!(parsed.failed_stage.as_deref(), Some("render"));
    assert_eq!(
        parsed.failure_code.as_deref(),
        Some("python_unhandled_exception")
    );
    assert_eq!(parsed.root_cause.as_deref(), Some("current cause"));
}

#[test]
fn structured_failure_falls_back_to_legacy_fields_when_canonical_fields_are_empty() {
    for empty in [json!(null), json!(""), json!("  ")] {
        let payload = json!({
            "failed_stage": empty, "stage": "render",
            "failure_code": empty, "error_type": "python_unhandled_exception",
            "root_cause": empty, "detail": "legacy cause"
        });
        let parsed = extract_structured_failure(
            STRUCTURED_FAILURE_LABEL,
            &format!("{STRUCTURED_FAILURE_LABEL}: {payload}"),
        )
        .expect("empty canonical fields");
        assert_eq!(parsed.failed_stage.as_deref(), Some("render"));
        assert_eq!(
            parsed.failure_code.as_deref(),
            Some("python_unhandled_exception")
        );
        assert_eq!(parsed.root_cause.as_deref(), Some("legacy cause"));
    }
}

#[test]
fn structured_failure_uses_latest_valid_payload_and_ignores_malformed_lines() {
    let log = format!(
        "{STRUCTURED_FAILURE_LABEL}: {{\"stage\":\"startup\"}}\n\
         {STRUCTURED_FAILURE_LABEL}: {{\"failed_stage\":\"render\",\"stage\":\"render\"}}\n\
         {STRUCTURED_FAILURE_LABEL}: {{invalid json\n"
    );
    let parsed =
        extract_structured_failure(STRUCTURED_FAILURE_LABEL, &log).expect("latest valid failure");
    assert_eq!(parsed.failed_stage.as_deref(), Some("render"));
}
