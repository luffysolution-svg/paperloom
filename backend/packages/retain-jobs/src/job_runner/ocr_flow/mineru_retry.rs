use std::time::Instant;

use anyhow::{anyhow, Result};
use tokio::time::{sleep, Duration};

use super::save_ocr_job;
use crate::job_events::record_custom_runtime_event_with_resources;
use crate::job_runner::{register_job_retry, ProcessRuntimeDeps};
use crate::models::domain::{now_iso, JobRuntimeState};
use crate::ocr_provider::mineru::response_error::MineruResponseError;

pub(super) fn mineru_error_chain_text(err: &anyhow::Error) -> String {
    err.chain()
        .map(|cause| cause.to_string().to_ascii_lowercase())
        .collect::<Vec<_>>()
        .join("\n")
}

pub(super) async fn query_with_retry<T, F, Fut>(
    deps: &ProcessRuntimeDeps,
    job: &mut JobRuntimeState,
    resource_label: &str,
    resource_id: &str,
    deadline: Instant,
    parent_job_id: Option<&str>,
    mut fetch: F,
) -> Result<Option<T>>
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = Result<T>>,
{
    let runtime = deps.mineru_runtime();
    let mut attempt = 0usize;
    loop {
        if super::polling::should_stop_polling(&deps.canceled_jobs, &job.job_id).await {
            return Ok(None);
        }
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err(anyhow!("MinerU polling deadline exceeded"));
        }
        let result = tokio::time::timeout(remaining, fetch())
            .await
            .map_err(|_| anyhow!("MinerU polling deadline exceeded during query"))?;
        match result {
            Ok(value) => return Ok(Some(value)),
            Err(err) => {
                attempt += 1;
                if !should_retry_mineru_poll_error(&err) || Instant::now() >= deadline {
                    return Err(err);
                }
                let delay_secs = retry_delay_secs(
                    &err,
                    attempt,
                    runtime.poll_retry_base_delay_secs,
                    runtime.poll_retry_max_delay_secs,
                );
                // Applies to degraded cycles as well: do not resume polling sooner
                // than Retry-After when the per-cycle attempt budget is exhausted.
                if Duration::from_secs(delay_secs)
                    >= deadline.saturating_duration_since(Instant::now())
                {
                    return Err(
                        err.context("MinerU retry delay exceeds remaining polling deadline")
                    );
                }
                if attempt >= runtime.poll_retry_limit {
                    job.append_log(&format!(
                        "MinerU {resource_label} poll degraded after {attempt} retries, keep waiting next cycle: {resource_id} error: {}",
                        err
                    ));
                    job.stage = Some("mineru_processing".to_string());
                    job.stage_detail =
                        Some("OCR provider 状态查询连续异常，稍后自动继续拉取".to_string());
                    job.updated_at = now_iso();
                    register_job_retry(job);
                    record_custom_runtime_event_with_resources(
                        deps.db.as_ref(),
                        &deps.persist.data_root,
                        &deps.persist.output_root,
                        &job.snapshot(),
                        "warn",
                        "retry_scheduled",
                        format!("OCR provider {resource_label} 查询降级为下一轮继续轮询"),
                        Some(serde_json::json!({
                            "scope": format!("mineru_{resource_label}_poll"),
                            "attempt": attempt,
                            "max_attempts": runtime.poll_retry_limit,
                            "resource_id": resource_id,
                            "degraded": true,
                            "reason": err.to_string(),
                        })),
                    );
                    save_ocr_job(deps, job, parent_job_id).await?;
                    wait_retry_delay(deps, &job.job_id, Duration::from_secs(delay_secs)).await;
                    return Ok(None);
                }
                job.append_log(&format!(
                    "MinerU {resource_label} poll retry {attempt}/{}: {resource_id} after error: {}",
                    runtime.poll_retry_limit,
                    err
                ));
                job.stage = Some("mineru_processing".to_string());
                job.stage_detail = Some(format!(
                    "OCR provider 状态查询异常，{delay_secs}s 后重试（第 {attempt}/{} 次）",
                    runtime.poll_retry_limit
                ));
                job.updated_at = now_iso();
                register_job_retry(job);
                record_custom_runtime_event_with_resources(
                    deps.db.as_ref(),
                    &deps.persist.data_root,
                    &deps.persist.output_root,
                    &job.snapshot(),
                    "warn",
                    "retry_scheduled",
                    format!("OCR provider {resource_label} 查询进入重试"),
                    Some(serde_json::json!({
                        "scope": format!("mineru_{resource_label}_poll"),
                        "attempt": attempt,
                        "max_attempts": runtime.poll_retry_limit,
                        "delay_seconds": delay_secs,
                        "resource_id": resource_id,
                        "reason": err.to_string(),
                    })),
                );
                save_ocr_job(deps, job, parent_job_id).await?;
                wait_retry_delay(deps, &job.job_id, Duration::from_secs(delay_secs)).await;
            }
        }
    }
}

async fn wait_retry_delay(deps: &ProcessRuntimeDeps, job_id: &str, delay: Duration) {
    let until = Instant::now() + delay;
    loop {
        if super::polling::should_stop_polling(&deps.canceled_jobs, job_id).await {
            return;
        }
        let remaining = until.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return;
        }
        sleep(remaining.min(Duration::from_millis(250))).await;
    }
}

pub(super) fn should_retry_mineru_poll_error(err: &anyhow::Error) -> bool {
    if let Some(response) = err.downcast_ref::<MineruResponseError>() {
        return response.retryable_query();
    }
    if let Some(network) = err.downcast_ref::<reqwest::Error>() {
        if let Some(status) = network.status() {
            return matches!(status.as_u16(), 408 | 429 | 500 | 502 | 503 | 504);
        }
        return network.is_timeout() || network.is_connect() || network.is_body();
    }
    // Compatibility for older process/string-only errors; never match bare
    // status numbers, which can occur in a URL, trace ID, or filename.
    let text = mineru_error_chain_text(err);
    text.contains("timed out")
        || text.contains("connection timed out")
        || text.contains("server disconnected")
        || text.contains("connection reset")
        || text.contains("connection error")
        || text.contains("sendrequest")
        || text.contains("tempor")
        || text.contains("service unavailable")
}

fn retry_delay_secs(err: &anyhow::Error, attempt: usize, base: u64, cap: u64) -> u64 {
    let backoff = base.saturating_mul(attempt as u64).min(cap);
    let requested = err
        .downcast_ref::<MineruResponseError>()
        .and_then(|response| response.retry_after_secs)
        .unwrap_or_default();
    backoff.max(requested)
}

#[cfg(test)]
#[path = "mineru_retry_tests.rs"]
mod integration_tests;

#[cfg(test)]
mod tests {
    use super::{
        mineru_error_chain_text, retry_delay_secs, should_retry_mineru_poll_error,
        MineruResponseError,
    };

    #[test]
    fn structured_business_errors_override_retry_sounding_messages() {
        for (code, expected) in [
            ("A0211", false),
            ("-60018", false),
            ("-60009", true),
            ("-10001", true),
        ] {
            let err = anyhow::Error::new(MineruResponseError::from_response(
                200,
                &serde_json::json!({"code": code, "msg": "503 temporary timeout"}).to_string(),
                None,
            ))
            .context("query batch failed");
            assert_eq!(should_retry_mineru_poll_error(&err), expected, "{code}");
        }
        assert!(!should_retry_mineru_poll_error(&anyhow::anyhow!(
            "bad request trace_id=503 file=502.pdf"
        )));
    }

    #[test]
    fn rate_limit_retains_server_delay_and_fallback_is_bounded() {
        let err = anyhow::Error::new(MineruResponseError::from_response(429, "", Some(45)));
        assert!(should_retry_mineru_poll_error(&err));
        assert_eq!(retry_delay_secs(&err, 2, 2, 10), 45);
        let plain = anyhow::anyhow!("timeout");
        assert_eq!(retry_delay_secs(&plain, 3, 2, 10), 6);
        assert_eq!(retry_delay_secs(&plain, usize::MAX, u64::MAX, 10), 10);
    }

    #[test]
    fn should_retry_mineru_poll_error_matches_dns_and_timeout_noise() {
        let dns = anyhow::anyhow!("dns error: Temporary failure in name resolution");
        let timeout = anyhow::anyhow!("request timed out after 120s");
        let auth = anyhow::anyhow!("401 unauthorized");

        assert!(should_retry_mineru_poll_error(&dns));
        assert!(should_retry_mineru_poll_error(&timeout));
        assert!(!should_retry_mineru_poll_error(&auth));
    }

    #[test]
    fn should_retry_mineru_poll_error_matches_nested_connection_reset_chain() {
        let err = anyhow::anyhow!("Connection reset by peer (os error 104)")
            .context("client error (Connect)")
            .context("error sending request for url (https://cdn-mineru.openxlab.org.cn/file.zip)")
            .context("MinerU download bundle request failed");

        let chain = mineru_error_chain_text(&err);
        assert!(chain.contains("connection reset by peer"));
        assert!(should_retry_mineru_poll_error(&err));
    }
}
