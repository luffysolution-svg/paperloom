//! A separate process keeps proxy environment changes out of other tests.
use retain_core::config::JobsServiceConfig;
use rust_api::services::runtime_gateway::JobRuntime;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

#[tokio::test]
async fn launch_reaches_loopback_jobsd_even_with_a_proxy_in_the_environment() {
    for name in ["HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy"] {
        std::env::set_var(name, "http://127.0.0.1:9");
    }
    for name in ["NO_PROXY", "no_proxy"] {
        std::env::remove_var(name);
    }
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let config = JobsServiceConfig {
        port: listener.local_addr().unwrap().port(),
        ..Default::default()
    };
    let server = tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.unwrap();
        let mut buf = [0u8; 4096];
        let n = socket.read(&mut buf).await.unwrap();
        let request = String::from_utf8_lossy(&buf[..n]).into_owned();
        socket
            .write_all(b"HTTP/1.1 200 OK\r\ncontent-length: 2\r\n\r\n{}")
            .await
            .unwrap();
        request
    });
    JobRuntime::remote(&config, "test-key".into())
        .launch_remote("job-1".into())
        .await;
    let request = tokio::time::timeout(Duration::from_secs(2), server)
        .await
        .expect("launch must reach jobsd directly")
        .unwrap();
    assert!(request.starts_with("POST /internal/v1/jobs/job-1/launch HTTP/1.1"));
    assert!(request.to_lowercase().contains("x-api-key: test-key"));
}
