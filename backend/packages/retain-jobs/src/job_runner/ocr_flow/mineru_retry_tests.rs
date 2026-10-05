use super::*;
use crate::job_runner::{ocr_provider_diagnostics_mut, process_runner::tests::test_runtime_deps};
use crate::models::domain::JobSnapshot;
use crate::models::request::CreateJobInput;

struct Fixture(ProcessRuntimeDeps);
impl Fixture {
    fn new() -> Self {
        let mut deps = test_runtime_deps(1);
        let runtime = &mut std::sync::Arc::make_mut(&mut deps.config)
            .provider_runtime
            .mineru;
        runtime.poll_retry_base_delay_secs = 0;
        runtime.poll_retry_max_delay_secs = 0;
        runtime.poll_retry_limit = 3;
        Self(deps)
    }
    fn job(&self) -> JobRuntimeState {
        let mut input = CreateJobInput::default();
        input.ocr.provider = "mineru".into();
        let mut job = JobSnapshot::new("mineru-retry".into(), input, vec![]).into_runtime();
        ocr_provider_diagnostics_mut(&mut job).handle.batch_id = Some("original-batch".into());
        self.0.db.save_job(&job.snapshot()).unwrap();
        job
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0.config.project_root);
    }
}

#[tokio::test]
async fn transient_query_failure_reuses_original_handle() {
    let fixture = Fixture::new();
    let mut job = fixture.job();
    let mut calls = 0;
    let result = query_with_retry(
        &fixture.0,
        &mut job,
        "batch",
        "original-batch",
        Instant::now() + Duration::from_secs(5),
        None,
        || {
            calls += 1;
            let result = if calls == 1 {
                Err(MineruResponseError::from_response(
                    200,
                    r#"{"code":-10001,"msg":"服务异常"}"#,
                    None,
                )
                .into())
            } else {
                Ok("original-batch")
            };
            std::future::ready(result)
        },
    )
    .await
    .unwrap();
    assert_eq!(result, Some("original-batch"));
    assert_eq!(calls, 2);
    assert_eq!(
        ocr_provider_diagnostics_mut(&mut job)
            .handle
            .batch_id
            .as_deref(),
        Some("original-batch")
    );
}

#[tokio::test]
async fn permanent_errors_and_unaffordable_retry_after_stop_after_one_query() {
    let fixture = Fixture::new();
    for error in [
        MineruResponseError::from_response(200, r#"{"code":"A0211","msg":"timeout"}"#, None),
        MineruResponseError::from_response(429, "", Some(60)),
    ] {
        let mut job = fixture.job();
        let mut calls = 0;
        let result = query_with_retry::<(), _, _>(
            &fixture.0,
            &mut job,
            "batch",
            "original-batch",
            Instant::now() + Duration::from_secs(1),
            None,
            || {
                calls += 1;
                std::future::ready(Err(error.clone().into()))
            },
        )
        .await;
        assert!(result.is_err());
        assert_eq!(calls, 1);
    }
}

#[tokio::test]
async fn polling_deadline_bounds_a_stalled_http_request() {
    let fixture = Fixture::new();
    let mut job = fixture.job();
    let result = query_with_retry::<(), _, _>(
        &fixture.0,
        &mut job,
        "batch",
        "original-batch",
        Instant::now() + Duration::from_millis(10),
        None,
        std::future::pending,
    )
    .await;
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("deadline exceeded during query"));
}

#[test]
fn transport_failure_keeps_http_status_and_trace_in_diagnostics() {
    let fixture = Fixture::new();
    let mut job = fixture.job();
    let error = anyhow::Error::new(MineruResponseError::from_response(
        403,
        r#"{"code":"A0211","msg":"expired","trace_id":"provider-trace"}"#,
        None,
    ))
    .context("query failed");
    super::super::support::fail_ocr_transport(&mut job, &error);
    let info = ocr_provider_diagnostics_mut(&mut job)
        .last_error
        .as_ref()
        .unwrap();
    assert_eq!(info.http_status, Some(403));
    assert_eq!(info.provider_code.as_deref(), Some("A0211"));
    assert_eq!(info.trace_id.as_deref(), Some("provider-trace"));
}

#[tokio::test]
async fn canceled_job_does_not_wait_retry_after_or_issue_another_query() {
    let fixture = Fixture::new();
    let mut job = fixture.job();
    fixture
        .0
        .canceled_jobs
        .write()
        .await
        .insert(job.job_id.clone());
    tokio::time::timeout(
        Duration::from_millis(100),
        wait_retry_delay(&fixture.0, &job.job_id, Duration::from_secs(60)),
    )
    .await
    .unwrap();
    let result = query_with_retry::<(), _, _>(
        &fixture.0,
        &mut job,
        "batch",
        "original-batch",
        Instant::now() + Duration::from_secs(5),
        None,
        || {
            panic!("canceled task must not be queried");
            #[allow(unreachable_code)]
            std::future::ready(Ok(()))
        },
    )
    .await
    .unwrap();
    assert!(result.is_none());
}
