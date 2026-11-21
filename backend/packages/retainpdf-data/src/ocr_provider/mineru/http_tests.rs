use super::*;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

async fn serve_once(
    status: u16,
    headers: &str,
    body: &str,
) -> (String, tokio::task::JoinHandle<String>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    let response = format!("HTTP/1.1 {status} Test\r\nContent-Length: {}\r\nContent-Type: application/json\r\nConnection: close\r\n{headers}\r\n{body}", body.len());
    let server = tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.unwrap();
        let mut bytes = Vec::new();
        loop {
            let mut chunk = [0u8; 4096];
            let n = socket.read(&mut chunk).await.unwrap();
            assert!(n > 0);
            bytes.extend_from_slice(&chunk[..n]);
            if let Some(end) = bytes.windows(4).position(|s| s == b"\r\n\r\n") {
                let header = String::from_utf8_lossy(&bytes[..end]).to_lowercase();
                let size = header
                    .lines()
                    .find_map(|line| {
                        line.strip_prefix("content-length:")
                            .and_then(|s| s.trim().parse::<usize>().ok())
                    })
                    .unwrap_or_default();
                if bytes.len() >= end + 4 + size {
                    break;
                }
            }
        }
        socket.write_all(response.as_bytes()).await.unwrap();
        String::from_utf8(bytes).unwrap()
    });
    (url, server)
}

#[tokio::test]
async fn mineru_upload_wire_contains_all_parsing_options() {
    let (url, server) = serve_once(200, "", r#"{"code":0,"data":{"batch_id":"batch-1","file_urls":["https://example.invalid/upload"]}}"#).await;
    let client = MineruClient::new(url, "fixture-token");
    let formats = vec!["html".to_string()];
    let target = client
        .apply_upload_url(
            "scan.pdf",
            &MineruUploadOptions {
                is_ocr: true,
                enable_formula: false,
                enable_table: false,
                language: "en",
                page_ranges: "2-3",
                data_id: "scan",
                extra_formats: &formats,
                ..Default::default()
            },
        )
        .await
        .unwrap();
    assert_eq!(target.batch_id, "batch-1");
    let request = server.await.unwrap();
    assert!(request.starts_with("POST /api/v4/file-urls/batch "));
    let payload: Value = serde_json::from_str(request.split_once("\r\n\r\n").unwrap().1).unwrap();
    assert_eq!(
        payload,
        json!({"model_version":"vlm","language":"en",
        "enable_formula":false,"enable_table":false,"extra_formats":["html"],
        "files":[{"name":"scan.pdf","is_ocr":true,"page_ranges":"2-3","data_id":"scan"}]})
    );
}

#[tokio::test]
async fn mineru_query_preserves_http_business_errors_and_retry_after() {
    for (status, body, retryable, expected_code) in [
        (429, "upstream busy", true, None),
        (503, "upstream unavailable", true, None),
        (
            200,
            r#"{"code":-60009,"msg":"队列已满","trace_id":"trace-queue","data":[]}"#,
            true,
            Some("-60009"),
        ),
        (
            200,
            r#"{"code":"A0211","msg":"503 timeout","data":[]}"#,
            false,
            Some("A0211"),
        ),
        (200, r#"{"data":{}}"#, false, None),
        (200, "not json", false, None),
    ] {
        let (url, server) = serve_once(status, "Retry-After: 7\r\n", body).await;
        let client = MineruClient::new(url, "fixture-token");
        let err = client
            .query_batch_status("original-batch")
            .await
            .unwrap_err();
        let response = err
            .downcast_ref::<MineruResponseError>()
            .expect("typed provider error");
        assert_eq!(response.info.http_status, Some(status));
        assert_eq!(response.info.provider_code.as_deref(), expected_code);
        assert_eq!(response.retryable_query(), retryable);
        assert_eq!(response.retry_after_secs, Some(7));
        assert!(server
            .await
            .unwrap()
            .starts_with("GET /api/v4/extract-results/batch/original-batch "));
    }
}

#[tokio::test]
async fn mineru_query_accepts_numeric_and_string_success_codes() {
    for code in [json!(0), json!("0")] {
        let (url, server) = serve_once(200, "", &json!({"code":code,"data":{"state":"done","task_id":"task-1","full_zip_url":"https://example.invalid/result.zip"}}).to_string()).await;
        let task = MineruClient::new(url, "fixture-token")
            .query_task("task-1")
            .await
            .unwrap();
        assert_eq!(task.data.state, "done");
        server.await.unwrap();
    }
}

/// 前 `fail_times` 次连接直接断掉（不回任何响应），之后正常返回 200。
///
/// 这模拟的是真实失败：`failed to upload file`，分类 timeout/ocr —— 传输层断了，
/// 不是服务端回了错误码。
async fn serve_upload_flaky(fail_times: usize) -> (String, tokio::task::JoinHandle<usize>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move {
        let mut seen = 0usize;
        loop {
            let (mut socket, _) = listener.accept().await.unwrap();
            seen += 1;
            if seen <= fail_times {
                // 连上就断：reqwest 侧表现为传输错误，而不是 HTTP 错误码。
                drop(socket);
                continue;
            }
            let mut sink = [0u8; 4096];
            let _ = socket.read(&mut sink).await;
            socket
                .write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
                .await
                .unwrap();
            return seen;
        }
    });
    (url, server)
}

/// 显式给定重试预算的 client。
///
/// **不要用 `MineruClient::new`** —— 它走 `MineruRuntimeConfig::from_env()`，于是
/// 「放弃前传了几次」这个结论跟着跑测试那台机器的环境变量漂：
/// `RUST_API_MINERU_UPLOAD_RETRY_ATTEMPTS=1` 能让下面那条断言直接红，设成 10 它仍然
/// 绿但不再守任何上限。
fn upload_client(attempts: usize) -> MineruClient {
    let mut runtime = crate::config::MineruRuntimeConfig::from_env();
    runtime.upload_retry_attempts = attempts;
    // 退避不是这几条在守的东西，设成 0 省掉几秒等待。
    runtime.upload_retry_base_delay_secs = 0;
    MineruClient::with_runtime("http://unused.invalid".to_string(), "fixture-token", runtime)
}

fn tmp_upload_file(name: &str) -> std::path::PathBuf {
    let path = std::env::temp_dir().join(format!("mineru-upload-{}-{}", name, fastrand::u64(..)));
    std::fs::write(&path, b"%PDF-1.7\n").unwrap();
    path
}

/// 上传抖一下不该让整个任务死掉。
///
/// 这个 client 的轮询、bundle 下载、bundle 就绪都各有重试上限，**只有上传曾经是
/// 一次性的**。实测：最近 4 次任务失败里 3 次是 `failed to upload file`。
#[tokio::test]
async fn mineru_upload_retries_transport_failures() {
    let (url, server) = serve_upload_flaky(2).await;
    let file = tmp_upload_file("retry");
    let client = upload_client(3);
    let result = client.upload_file(&url, &file).await;
    let attempts = server.await.unwrap();
    let _ = std::fs::remove_file(&file);

    assert!(result.is_ok(), "前两次传输中断之后应当重传成功: {result:?}");
    assert_eq!(attempts, 3, "重试次数不对 —— 期望前 2 次断、第 3 次成功");
}

/// 正对照：重试是有上限的，不会无限重传。
#[tokio::test]
async fn mineru_upload_gives_up_after_the_configured_attempts() {
    // 断的次数超过上限（默认 3 次）。
    let (url, server) = serve_upload_flaky(99).await;
    let file = tmp_upload_file("giveup");
    let client = upload_client(3);
    let result = client.upload_file(&url, &file).await;
    let _ = std::fs::remove_file(&file);
    server.abort();

    assert!(result.is_err(), "一直断也该放弃，不能无限重传");
    let message = format!("{:#}", result.unwrap_err());
    assert!(
        message.contains("MinerU file upload request failed"),
        "放弃时的错误文案变了，任务失败分类会跟着漂: {message}"
    );
}

/// HTTP 错误码**不该**重试 —— 预签名地址过期的 403 重试多少次都一样，
/// 白白多等几轮退避。
#[tokio::test]
async fn mineru_upload_does_not_retry_http_error_status() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move {
        let mut seen = 0usize;
        loop {
            let (mut socket, _) = listener.accept().await.unwrap();
            seen += 1;
            let mut sink = [0u8; 4096];
            let _ = socket.read(&mut sink).await;
            socket
                .write_all(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
                .await
                .unwrap();
            if seen >= 2 {
                return seen;
            }
        }
    });
    let file = tmp_upload_file("forbidden");
    let client = MineruClient::new("http://unused.invalid".to_string(), "fixture-token");
    let result = client.upload_file(&url, &file).await;
    let _ = std::fs::remove_file(&file);
    server.abort();

    assert!(result.is_err(), "403 应当直接失败");
    let message = format!("{:#}", result.unwrap_err());
    assert!(
        message.contains("returned error status"),
        "403 走了传输重试那条路，错误文案不对: {message}"
    );
}

/// 放弃之前到底传了几次 —— 不只是「最终失败了」。
///
/// 既有那条 give-up 只断言 `is_err()` 和错误文案，它对次数一无所知（`server.abort()`
/// 把计数也扔了）。而次数一漂，一次注定失败的上传会让任务在界面上停在「OCR 处理中」
/// 很久才报失败：默认 `upload_timeout_secs=300`，3 次就是 15 分钟上限，改成 10 次
/// 就是 50 分钟 —— 而用户完全看不出它早就没救了。
#[tokio::test]
async fn mineru_upload_stops_at_the_configured_attempt_count() {
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    let seen = Arc::new(AtomicUsize::new(0));
    let counter = seen.clone();
    let server = tokio::spawn(async move {
        loop {
            // 连上就断：reqwest 侧表现为传输错误，而不是 HTTP 错误码。
            let (socket, _) = listener.accept().await.unwrap();
            counter.fetch_add(1, Ordering::SeqCst);
            drop(socket);
        }
    });

    let client = upload_client(3);
    let file = tmp_upload_file("attempt-budget");
    let result = client.upload_file(&url, &file).await;
    let _ = std::fs::remove_file(&file);
    server.abort();

    assert!(result.is_err(), "一直断也该放弃，不能无限重传");
    assert_eq!(
        seen.load(Ordering::SeqCst),
        3,
        "上传尝试次数不等于配置的 3 次 —— 预算一漂，注定失败的任务会在「OCR 处理中」里多挂几十分钟"
    );
}

/// 配成 0 次也得至少传一次 —— 否则上传功能被一个配置值静默关掉。
#[tokio::test]
async fn mineru_upload_always_tries_at_least_once() {
    let (url, server) = serve_upload_flaky(0).await;
    let client = upload_client(0);
    let file = tmp_upload_file("zero-attempts");
    let result = client.upload_file(&url, &file).await;
    let attempts = server.await.unwrap();
    let _ = std::fs::remove_file(&file);

    assert!(result.is_ok(), "attempts=0 时一次都没传 —— 上传被配置值静默关掉了: {result:?}");
    assert_eq!(attempts, 1, "attempts=0 应当恰好传一次");
}
