//! 连 jobsd 的客户端不走系统代理。单独一个测试文件：要改进程的代理环境变量，
//! 放在别的测试旁边会影响它们建的客户端。

use std::time::Duration;

use retainpdf_core::config::{JobsRuntimeMode, JobsServiceConfig};
use retainpdf_jobs::JobRuntime;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

#[tokio::test]
async fn launch_reaches_loopback_jobsd_even_with_a_proxy_in_the_environment() {
    // 代理指向一个没人听的端口：请求要是走了代理，就连不上。
    for name in ["HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy"] {
        std::env::set_var(name, "http://127.0.0.1:9");
    }
    for name in ["NO_PROXY", "no_proxy"] {
        std::env::remove_var(name);
    }

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let (seen_tx, mut seen_rx) = tokio::sync::mpsc::unbounded_channel::<String>();
    tokio::spawn(async move {
        loop {
            let (mut socket, _) = listener.accept().await.unwrap();
            let seen_tx = seen_tx.clone();
            tokio::spawn(async move {
                let mut buf = [0u8; 4096];
                let n = socket.read(&mut buf).await.unwrap_or(0);
                let request_line = String::from_utf8_lossy(&buf[..n])
                    .lines()
                    .next()
                    .unwrap_or_default()
                    .to_string();
                let _ = seen_tx.send(request_line);
                let _ = socket
                    .write_all(b"HTTP/1.1 200 OK\r\ncontent-length: 2\r\n\r\n{}")
                    .await;
            });
        }
    });

    let config = JobsServiceConfig {
        mode: JobsRuntimeMode::Remote,
        port,
        ..Default::default()
    };
    let runtime = JobRuntime::remote(&config, "test-key".into());
    // 发射失败会重试，几次加起来 4 秒多；3 秒内没成功就是走了代理。
    tokio::time::timeout(Duration::from_secs(3), runtime.launch_remote("job-1".into()))
        .await
        .expect("launch must not go through the proxy and retry")
        .expect("loopback jobsd accepted the launch");
    assert_eq!(
        seen_rx.recv().await.as_deref(),
        Some("POST /internal/v1/jobs/job-1/launch HTTP/1.1")
    );
}
