use crate::job_events::record_custom_runtime_event_with_resources;
use crate::job_runner::{register_job_retry, JobPersistDeps};
use crate::models::domain::{now_iso, JobRuntimeState};

pub(super) struct BundleRetryEvent<'a> {
    pub(super) scope: &'a str,
    pub(super) attempt: usize,
    pub(super) max_attempts: usize,
    pub(super) delay_secs: Option<u64>,
    pub(super) elapsed_secs: Option<u64>,
    pub(super) timeout_secs: Option<u64>,
    pub(super) reason: String,
    pub(super) url: &'a str,
}

pub(super) fn mark_ocr_result_ready(job: &mut JobRuntimeState, stage_detail: String) {
    job.stage = Some("ocr_result_ready".to_string());
    job.stage_detail = Some(stage_detail);
    job.updated_at = now_iso();
}

pub(super) fn record_bundle_retry_scheduled(
    deps: &JobPersistDeps,
    job: &mut JobRuntimeState,
    stage_detail: String,
    message: &str,
    event: BundleRetryEvent<'_>,
) {
    mark_ocr_result_ready(job, stage_detail);
    register_job_retry(job);
    let mut payload = bundle_retry_payload(&event);
    if let Some(delay_secs) = event.delay_secs {
        payload["delay_seconds"] = serde_json::json!(delay_secs);
    }
    record_custom_runtime_event_with_resources(
        deps.db.as_ref(),
        &deps.data_root,
        &deps.output_root,
        &job.snapshot(),
        "warn",
        "retry_scheduled",
        message,
        Some(payload),
    );
}

pub(super) fn record_bundle_retry_degraded(
    deps: &JobPersistDeps,
    job: &mut JobRuntimeState,
    event: BundleRetryEvent<'_>,
) {
    mark_ocr_result_ready(
        job,
        "OCR provider bundle 探测连续异常，改为直接下载并按下载重试策略兜底".to_string(),
    );
    register_job_retry(job);
    let mut payload = bundle_retry_payload(&event);
    if let Some(elapsed_secs) = event.elapsed_secs {
        payload["elapsed_seconds"] = serde_json::json!(elapsed_secs);
    }
    if let Some(timeout_secs) = event.timeout_secs {
        payload["timeout_seconds"] = serde_json::json!(timeout_secs);
    }
    payload["fallback"] = serde_json::json!("direct_download");
    record_custom_runtime_event_with_resources(
        deps.db.as_ref(),
        &deps.data_root,
        &deps.output_root,
        &job.snapshot(),
        "warn",
        "retry_degraded",
        "OCR provider bundle 可达性探测降级为直接下载",
        Some(payload),
    );
}

fn bundle_retry_payload(event: &BundleRetryEvent<'_>) -> serde_json::Value {
    serde_json::json!({
        "scope": event.scope,
        "attempt": event.attempt,
        "max_attempts": event.max_attempts,
        "reason": event.reason,
        "url": event.url,
    })
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use super::*;
    use crate::db::Db;
    use crate::models::domain::JobSnapshot;
    use crate::models::request::CreateJobInput;

    #[test]
    fn bundle_retry_events_need_only_persistence_resources() {
        let root = std::env::temp_dir().join(format!(
            "retain-bundle-events-persist-{}",
            fastrand::u64(..)
        ));
        std::fs::create_dir_all(&root).unwrap();
        let db = Arc::new(Db::new(root.join("jobs.db"), root.clone()));
        db.init().unwrap();
        let deps = JobPersistDeps::new(db, root.clone(), root.join("jobs"));
        let mut job = JobSnapshot::new("bundle-retry".into(), CreateJobInput::default(), vec![])
            .into_runtime();
        deps.db.save_job(&job.snapshot()).unwrap();
        let event = || BundleRetryEvent {
            scope: "mineru_bundle_ready_wait",
            attempt: 2,
            max_attempts: 3,
            delay_secs: Some(5),
            elapsed_secs: Some(10),
            timeout_secs: Some(30),
            reason: "temporarily unavailable".into(),
            url: "https://example.invalid/bundle.zip",
        };

        record_bundle_retry_scheduled(
            &deps,
            &mut job,
            "waiting for bundle".into(),
            "retry scheduled",
            event(),
        );
        assert_eq!(job.stage.as_deref(), Some("ocr_result_ready"));
        assert_eq!(job.stage_detail.as_deref(), Some("waiting for bundle"));
        record_bundle_retry_degraded(&deps, &mut job, event());

        let events = deps.db.list_job_events(&job.job_id, 10, 0).unwrap();
        assert_eq!(events.len(), 2);
        let scheduled = events
            .iter()
            .find(|e| e.event == "retry_scheduled")
            .unwrap();
        assert_eq!(scheduled.retry_count, Some(1));
        assert_eq!(scheduled.level, "warn");
        assert_eq!(scheduled.stage.as_deref(), Some("ocr_result_ready"));
        assert_eq!(
            scheduled.payload.as_ref().unwrap(),
            &serde_json::json!({
                "scope": "mineru_bundle_ready_wait",
                "attempt": 2,
                "max_attempts": 3,
                "reason": "temporarily unavailable",
                "url": "https://example.invalid/bundle.zip",
                "delay_seconds": 5,
            })
        );
        let degraded = events.iter().find(|e| e.event == "retry_degraded").unwrap();
        assert_eq!(degraded.retry_count, Some(2));
        assert_eq!(
            degraded.payload.as_ref().unwrap(),
            &serde_json::json!({
                "scope": "mineru_bundle_ready_wait",
                "attempt": 2,
                "max_attempts": 3,
                "reason": "temporarily unavailable",
                "url": "https://example.invalid/bundle.zip",
                "elapsed_seconds": 10,
                "timeout_seconds": 30,
                "fallback": "direct_download",
            })
        );
        drop(deps);
        std::fs::remove_dir_all(root).unwrap();
    }
}
