use std::collections::HashSet;
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Context, Result};
use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use futures_util::stream::{self, StreamExt};
use once_cell::sync::Lazy;
use regex::{Captures, Regex};
use reqwest::Client;
use serde_json::Value;
use tokio::sync::watch;

// 每张图、每页都要用，编一次留着（以前每次调用都 `Regex::new`，`markdown_image_from_attrs` 每张图编一次）。
static IMG_SRC: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"(?i)<img\b[^>]*\bsrc=["']([^"']+)["']"#).expect("valid img src regex"));
static IMG_SRC_PARTS: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"(?i)(<img\b[^>]*\bsrc=["'])([^"']+)(["'])"#).expect("valid img src regex")
});
static CENTERED_IMG_DIV: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"(?i)<div\s+style=["']text-align:\s*center;?["']\s*>\s*(<img\b[^>]*>)\s*</div>"#)
        .expect("valid centered img div regex")
});
static IMG_TAG: Lazy<Regex> = Lazy::new(|| Regex::new(r#"(?i)<img\b([^>]*)>"#).expect("valid img tag regex"));
static HTML_ATTR: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']"#).expect("valid html attr regex")
});

/// 插图下载并发数。之前 16 张串行约 6s。
const IMAGE_DOWNLOAD_CONCURRENCY: usize = 4;

/// 插图物化进度：`done` / `total` 张。只统计需要写盘的插图（含 base64 内联的）。
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub(super) struct ImageProgress {
    pub done: usize,
    pub total: usize,
}

/// 一张待写盘的插图：目标路径 + provider 给的原始载荷（URL / data-url / base64）。
struct ImageTask<'a> {
    target_path: PathBuf,
    raw_payload: &'a Value,
}

/// `http` 必须是带超时的客户端（ocr_flow 传的是 PaddleClient 的那个：有超时、
/// 不走系统代理）。之前这里用 `Client::new()`，没有超时，一张图卡住整个任务就
/// 无限挂起。
pub(super) async fn materialize_paddle_markdown_artifacts(
    payload: &Value,
    job_root: &Path,
    http: &Client,
    progress: &watch::Sender<ImageProgress>,
) -> Result<Option<PathBuf>> {
    let Some(layout_results) = payload
        .get("layoutParsingResults")
        .and_then(Value::as_array)
    else {
        return Ok(None);
    };
    if layout_results.is_empty() {
        return Ok(None);
    }

    let markdown_dir = job_root.join("md");
    let images_root = markdown_dir.join("images");
    let mut page_texts = Vec::new();
    let mut image_tasks: Vec<ImageTask<'_>> = Vec::new();
    let mut wrote_anything = false;

    // 第一遍只算路径、改写正文，不碰网络：正文改写只依赖图片的相对路径，
    // 和下载结果无关，所以下载可以挪到后面并发做。
    for (page_idx, page_payload) in layout_results.iter().enumerate() {
        let Some(markdown) = page_payload.get("markdown").and_then(Value::as_object) else {
            continue;
        };
        let text = markdown
            .get("text")
            .and_then(Value::as_str)
            .unwrap_or("")
            .trim()
            .to_string();
        let images = markdown.get("images").and_then(Value::as_object);
        if text.is_empty() && images.is_none() {
            continue;
        }

        let mut remapped_text = text;
        if let Some(images) = images {
            for (raw_rel_path, raw_payload) in images {
                let rel_path = raw_rel_path.trim().trim_start_matches('/');
                if rel_path.is_empty() {
                    continue;
                }
                // Preserve the provider-returned relative path shape under md/images.
                // The page prefix prevents multi-page jobs from colliding on identical image names.
                let target_rel = paddle_markdown_target_rel_path_for_image_key(
                    rel_path,
                    &remapped_text,
                    page_idx + 1,
                );
                let markdown_rel = PathBuf::from("images").join(&target_rel);
                image_tasks.push(ImageTask {
                    target_path: images_root.join(&target_rel),
                    raw_payload,
                });
                if !is_page_prefixed_alias(&target_rel.to_string_lossy(), rel_path) {
                    remapped_text =
                        remapped_text.replace(rel_path, &markdown_rel.to_string_lossy());
                }
                wrote_anything = true;
            }
        }
        remapped_text = normalize_paddle_markdown_images(&remapped_text, page_idx + 1);

        if !remapped_text.trim().is_empty() {
            page_texts.push(remapped_text.trim().to_string());
            wrote_anything = true;
        }
    }

    if !wrote_anything {
        return Ok(None);
    }

    write_markdown_images(http, dedupe_image_tasks(image_tasks), progress).await?;

    tokio::fs::create_dir_all(&markdown_dir).await?;
    let full_md_path = markdown_dir.join("full.md");
    let mut content = page_texts.join("\n\n");
    if !content.ends_with('\n') {
        content.push('\n');
    }
    tokio::fs::write(&full_md_path, content)
        .await
        .with_context(|| format!("failed to write {}", full_md_path.display()))?;
    Ok(Some(full_md_path))
}

/// 同一个目标路径只写一次，保留最后一次出现的载荷 —— 和原来串行写盘
/// 「后写的覆盖先写的」结果一致，也避免两个并发任务同时写一个文件。
fn dedupe_image_tasks(tasks: Vec<ImageTask<'_>>) -> Vec<ImageTask<'_>> {
    let mut seen = HashSet::new();
    let mut deduped: Vec<ImageTask<'_>> = tasks
        .into_iter()
        .rev()
        .filter(|task| seen.insert(task.target_path.clone()))
        .collect();
    deduped.reverse();
    deduped
}

/// 以 [`IMAGE_DOWNLOAD_CONCURRENCY`] 并发下载 / 解码并写盘，任意一张失败即整体
/// 失败（和原来串行版本的语义一致）。每写完一张就更新 `progress`。
async fn write_markdown_images(
    http: &Client,
    tasks: Vec<ImageTask<'_>>,
    progress: &watch::Sender<ImageProgress>,
) -> Result<()> {
    let total = tasks.len();
    progress.send_replace(ImageProgress { done: 0, total });
    // 先把 future 收成 Vec 再进 stream，而不是 `stream::iter(tasks).map(|t| async {..})`：
    // 后者那个返回借用 future 的闭包会撞上 rustc 的高阶生命周期 Send 推断问题，
    // 让整个 transport future 失去 Send。
    let pending: Vec<_> = tasks
        .into_iter()
        .map(|task| write_markdown_image(http, task))
        .collect();
    let mut writes = stream::iter(pending).buffer_unordered(IMAGE_DOWNLOAD_CONCURRENCY);
    let mut done = 0;
    while let Some(result) = writes.next().await {
        result?;
        done += 1;
        progress.send_replace(ImageProgress { done, total });
    }
    Ok(())
}

async fn write_markdown_image(http: &Client, task: ImageTask<'_>) -> Result<()> {
    let image_bytes = decode_markdown_image_payload(http, task.raw_payload).await?;
    if let Some(parent) = task.target_path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    tokio::fs::write(&task.target_path, image_bytes)
        .await
        .with_context(|| format!("failed to write {}", task.target_path.display()))
}

fn paddle_markdown_target_rel_path(rel_path: &str, page_index: usize) -> PathBuf {
    let normalized = rel_path.trim().trim_start_matches('/').replace('\\', "/");
    if normalized
        .split_once('/')
        .map(|(prefix, _)| is_page_prefix(prefix))
        .unwrap_or_else(|| is_page_prefix(&normalized))
    {
        return PathBuf::from(normalized);
    }
    PathBuf::from(format!("page-{page_index}")).join(normalized)
}

fn paddle_markdown_target_rel_path_for_image_key(
    rel_path: &str,
    markdown_text: &str,
    page_index: usize,
) -> PathBuf {
    let normalized = rel_path.trim().trim_start_matches('/').replace('\\', "/");
    if normalized
        .split_once('/')
        .map(|(prefix, _)| is_page_prefix(prefix))
        .unwrap_or_else(|| is_page_prefix(&normalized))
    {
        return PathBuf::from(normalized);
    }
    for captures in IMG_SRC.captures_iter(markdown_text) {
        let src = captures[1]
            .trim()
            .trim_start_matches('/')
            .replace('\\', "/");
        if src.ends_with(&normalized)
            && src
                .split_once('/')
                .map(|(prefix, _)| is_page_prefix(prefix))
                .unwrap_or_else(|| is_page_prefix(&src))
        {
            return PathBuf::from(src);
        }
    }
    paddle_markdown_target_rel_path(&normalized, page_index)
}

fn paddle_markdown_rel_src_path(src: &str, page_index: usize) -> String {
    let normalized = src.trim().trim_start_matches('/').replace('\\', "/");
    if normalized.is_empty()
        || normalized.starts_with("http://")
        || normalized.starts_with("https://")
        || normalized.starts_with("data:")
    {
        return normalized;
    }
    if normalized.starts_with("images/") {
        return normalized;
    }
    PathBuf::from("images")
        .join(paddle_markdown_target_rel_path(&normalized, page_index))
        .to_string_lossy()
        .replace('\\', "/")
}

fn rewrite_paddle_markdown_image_srcs(text: &str, page_index: usize) -> String {
    IMG_SRC_PARTS.replace_all(text, |captures: &Captures<'_>| {
        format!(
            "{}{}{}",
            &captures[1],
            paddle_markdown_rel_src_path(&captures[2], page_index),
            &captures[3]
        )
    })
    .into_owned()
}

fn normalize_paddle_markdown_images(text: &str, page_index: usize) -> String {
    let rewritten = rewrite_paddle_markdown_image_srcs(text, page_index);
    let without_center_div = CENTERED_IMG_DIV.replace_all(&rewritten, |captures: &Captures<'_>| {
        markdown_image_from_img_tag(&captures[1])
    });
    IMG_TAG
        .replace_all(&without_center_div, |captures: &Captures<'_>| {
            markdown_image_from_attrs(&captures[1])
        })
        .into_owned()
}

fn markdown_image_from_img_tag(img_tag: &str) -> String {
    let Some(captures) = IMG_TAG.captures(img_tag) else {
        return img_tag.to_string();
    };
    markdown_image_from_attrs(&captures[1])
}

fn markdown_image_from_attrs(attrs_text: &str) -> String {
    let mut src = String::new();
    let mut alt = String::from("Image");
    for captures in HTML_ATTR.captures_iter(attrs_text) {
        let key = captures[1].to_ascii_lowercase();
        if key == "src" {
            src = captures[2].trim().to_string();
        } else if key == "alt" {
            let value = captures[2].trim();
            if !value.is_empty() {
                alt = value.to_string();
            }
        }
    }
    if src.is_empty() {
        return format!("<img{attrs_text}>");
    }
    let escaped_alt = alt.replace('[', r"\[").replace(']', r"\]");
    format!("![{escaped_alt}]({src})")
}

fn is_page_prefixed_alias(target_rel_path: &str, source_rel_path: &str) -> bool {
    let target = target_rel_path
        .trim()
        .trim_start_matches('/')
        .replace('\\', "/");
    let source = source_rel_path
        .trim()
        .trim_start_matches('/')
        .replace('\\', "/");
    target != source
        && target.ends_with(&source)
        && target
            .split_once('/')
            .map(|(prefix, _)| is_page_prefix(prefix))
            .unwrap_or_else(|| is_page_prefix(&target))
}

fn is_page_prefix(value: &str) -> bool {
    let Some(number) = value.strip_prefix("page-") else {
        return false;
    };
    !number.is_empty() && number.chars().all(|ch| ch.is_ascii_digit())
}

async fn decode_markdown_image_payload(http: &Client, raw_payload: &Value) -> Result<Vec<u8>> {
    let payload = raw_payload
        .as_str()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| anyhow!("empty paddle markdown image payload"))?;

    if payload.starts_with("http://") || payload.starts_with("https://") {
        let response = http
            .get(payload)
            .send()
            .await
            .with_context(|| format!("failed to download markdown image {payload}"))?
            .error_for_status()
            .with_context(|| format!("markdown image returned error status: {payload}"))?;
        let bytes = response.bytes().await?;
        return Ok(bytes.to_vec());
    }

    if payload.starts_with("data:") {
        let (_, encoded) = payload
            .split_once(',')
            .ok_or_else(|| anyhow!("invalid data-url markdown image payload"))?;
        return STANDARD
            .decode(encoded)
            .context("failed to decode data-url markdown image payload");
    }

    STANDARD
        .decode(payload)
        .context("failed to decode base64 markdown image payload")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[tokio::test]
    async fn materialize_paddle_markdown_artifacts_writes_full_md_and_images() {
        let root = std::env::temp_dir().join(format!("rust-api-paddle-md-{}", fastrand::u64(..)));
        let payload = json!({
            "layoutParsingResults": [
                {
                    "markdown": {
                        "text": "<div style=\"text-align: center;\"><img src=\"imgs/a.png\" alt=\"Image\" width=\"48%\" /></div>",
                        "images": {
                            "imgs/a.png": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD3sAAAAASUVORK5CYII="
                        }
                    }
                }
            ]
        });

        let full_md = materialize_paddle_markdown_artifacts(&payload, &root, &test_http(), &progress())
            .await
            .expect("materialize")
            .expect("markdown path");
        let content = tokio::fs::read_to_string(&full_md)
            .await
            .expect("read markdown");
        assert!(content.contains("![Image](images/page-1/imgs/a.png)"));
        assert!(!content.contains("<img"));
        assert!(root.join("md/images/page-1/imgs/a.png").exists());

        let _ = std::fs::remove_dir_all(root);
    }

    #[tokio::test]
    async fn materialize_paddle_markdown_artifacts_rewrites_page_prefixed_src_with_unprefixed_key()
    {
        let root = std::env::temp_dir().join(format!("rust-api-paddle-md-{}", fastrand::u64(..)));
        let payload = json!({
            "layoutParsingResults": [
                {
                    "markdown": {
                        "text": "<div><img src=\"page-5/imgs/a.png\" alt=\"Image\" /></div>",
                        "images": {
                            "imgs/a.png": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD3sAAAAASUVORK5CYII="
                        }
                    }
                }
            ]
        });

        let full_md = materialize_paddle_markdown_artifacts(&payload, &root, &test_http(), &progress())
            .await
            .expect("materialize")
            .expect("markdown path");
        let content = tokio::fs::read_to_string(&full_md)
            .await
            .expect("read markdown");
        assert!(content.contains("![Image](images/page-5/imgs/a.png)"));
        assert!(!content.contains("<img"));
        assert!(root.join("md/images/page-5/imgs/a.png").exists());

        let _ = std::fs::remove_dir_all(root);
    }

    /// 和 PaddleClient 同样形状的客户端：有超时、不走系统代理。
    fn test_http() -> Client {
        Client::builder()
            .timeout(std::time::Duration::from_secs(2))
            .no_proxy()
            .build()
            .expect("client")
    }

    fn progress() -> watch::Sender<ImageProgress> {
        watch::channel(ImageProgress::default()).0
    }

    const PNG_1X1: &[u8] = &[0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a];

    /// 本地 HTTP 服务：每个连接读完请求头后回一张固定的「图」；`hang` 时只收不回。
    async fn serve_images(hang: bool) -> String {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base = format!("http://{}", listener.local_addr().unwrap());
        tokio::spawn(async move {
            loop {
                let (mut socket, _) = listener.accept().await.unwrap();
                tokio::spawn(async move {
                    let mut buf = vec![0_u8; 4096];
                    let mut seen = Vec::new();
                    while !seen.windows(4).any(|w| w == b"\r\n\r\n") {
                        let n = socket.read(&mut buf).await.unwrap_or(0);
                        if n == 0 {
                            return;
                        }
                        seen.extend_from_slice(&buf[..n]);
                    }
                    if hang {
                        tokio::time::sleep(std::time::Duration::from_secs(60)).await;
                        return;
                    }
                    let head = format!(
                        "HTTP/1.1 200 OK\r\nContent-Type: image/png\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                        PNG_1X1.len()
                    );
                    let _ = socket.write_all(head.as_bytes()).await;
                    let _ = socket.write_all(PNG_1X1).await;
                });
            }
        });
        base
    }

    fn payload_with_url_images(base: &str, count: usize) -> Value {
        let mut images = serde_json::Map::new();
        let mut text = String::new();
        for idx in 0..count {
            let key = format!("imgs/{idx}.png");
            text.push_str(&format!("<img src=\"{key}\" alt=\"Image\" />\n"));
            images.insert(key, json!(format!("{base}/{idx}.png")));
        }
        json!({
            "layoutParsingResults": [
                { "markdown": { "text": text, "images": images } }
            ]
        })
    }

    /// URL 插图并发下载后全部落盘，进度最终停在 N/N。
    #[tokio::test]
    async fn materialize_downloads_url_images_and_reports_progress() {
        let base = serve_images(false).await;
        let root = std::env::temp_dir().join(format!("rust-api-paddle-md-{}", fastrand::u64(..)));
        let payload = payload_with_url_images(&base, 9);
        let (tx, rx) = watch::channel(ImageProgress::default());

        materialize_paddle_markdown_artifacts(&payload, &root, &test_http(), &tx)
            .await
            .expect("materialize")
            .expect("markdown path");

        for idx in 0..9 {
            let path = root.join(format!("md/images/page-1/imgs/{idx}.png"));
            assert_eq!(std::fs::read(&path).expect("image written"), PNG_1X1);
        }
        assert_eq!(*rx.borrow(), ImageProgress { done: 9, total: 9 });

        let _ = std::fs::remove_dir_all(root);
    }

    /// 一张图卡住不能把整个任务无限挂起：客户端超时到了就报错。
    #[tokio::test]
    async fn materialize_fails_instead_of_hanging_on_a_stuck_image() {
        let base = serve_images(true).await;
        let root = std::env::temp_dir().join(format!("rust-api-paddle-md-{}", fastrand::u64(..)));
        let payload = payload_with_url_images(&base, 1);

        let result = tokio::time::timeout(
            std::time::Duration::from_secs(10),
            materialize_paddle_markdown_artifacts(&payload, &root, &test_http(), &progress()),
        )
        .await
        .expect("应当在客户端超时内返回，而不是挂起");

        assert!(result.is_err(), "卡住的插图应当报错");
        let _ = std::fs::remove_dir_all(root);
    }
}
