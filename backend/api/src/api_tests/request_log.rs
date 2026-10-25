use super::jobs_common::test_state;
use crate::app::{build_app, build_simple_app};
use axum::body::Body;
use axum::http::{Request, StatusCode};
use std::io::Write;
use std::sync::{Arc, Mutex};
use tower::util::ServiceExt;
use tracing_subscriber::fmt::format::FmtSpan;

#[derive(Clone, Default)]
struct Captured(Arc<Mutex<Vec<u8>>>);

impl Write for Captured {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        self.0.lock().unwrap().extend_from_slice(buf);
        Ok(buf.len())
    }
    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}

#[tokio::test]
async fn both_routers_log_the_path_without_raw_or_encoded_query_secrets() {
    let captured = Captured::default();
    let writer = captured.clone();
    let subscriber = tracing_subscriber::fmt()
        .with_max_level(tracing::Level::DEBUG)
        .with_ansi(false)
        .with_span_events(FmtSpan::NEW)
        .with_writer(move || writer.clone())
        .finish();
    let _guard = tracing::subscriber::set_default(subscriber);
    for app in [
        build_app(test_state("log-full")),
        build_simple_app(test_state("log-simple")),
    ] {
        captured.0.lock().unwrap().clear();
        for _ in 0..20 {
            tracing::callsite::rebuild_interest_cache();
            let response = app
                .clone()
                .oneshot(
                    Request::builder()
                        .uri("/health?api_key=query-secret&token=encoded%2Dsecret")
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::OK);
            if !captured.0.lock().unwrap().is_empty() {
                break;
            }
        }
        let logs = String::from_utf8(captured.0.lock().unwrap().clone()).unwrap();
        assert!(logs.contains("/health"), "missing request path: {logs}");
        assert!(!logs.contains("query-secret"), "raw query leaked: {logs}");
        assert!(
            !logs.contains("encoded%2Dsecret"),
            "encoded query leaked: {logs}"
        );
        assert!(!logs.contains("api_key="), "query parameter leaked: {logs}");
    }
}
