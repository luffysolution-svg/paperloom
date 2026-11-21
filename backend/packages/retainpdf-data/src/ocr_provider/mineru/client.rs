use std::fs::{self, File};
use std::io::{self, Write};
use std::path::Path;
use std::time::Duration;

use anyhow::{anyhow, bail, Context, Result};
use reqwest::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, RANGE, RETRY_AFTER};
use reqwest::Client;
use serde::de::DeserializeOwned;
use serde::Serialize;
use serde_json::{json, Value};
use zip::ZipArchive;

use crate::config::MineruRuntimeConfig;
use crate::ocr_provider::mineru::models::{
    MineruApiEnvelope, MineruApplyUploadUrlsData, MineruBatchResultItem, MineruBatchStatusData,
    MineruTaskData,
};
use crate::ocr_provider::mineru::response_error::{parse_retry_after, MineruResponseError};
use crate::ocr_provider::types::OcrProviderCapabilities;

#[derive(Debug, Clone)]
pub struct MineruClient {
    pub base_url: String,
    pub token: String,
    http: Client,
    runtime: MineruRuntimeConfig,
}

#[derive(Debug, Clone)]
pub struct MineruTrace<T> {
    pub data: T,
    pub trace_id: Option<String>,
}

#[derive(Debug, Clone)]
pub struct MineruUploadTarget {
    pub batch_id: String,
    pub upload_url: String,
    pub trace_id: Option<String>,
}

#[derive(Debug, Clone)]
pub struct MineruCreatedTask {
    pub task_id: String,
    pub trace_id: Option<String>,
}

#[derive(Debug, Clone)]
pub struct MineruUploadOptions<'a> {
    pub model_version: &'a str,
    pub is_ocr: bool,
    pub enable_formula: bool,
    pub enable_table: bool,
    pub language: &'a str,
    pub page_ranges: &'a str,
    pub data_id: &'a str,
    pub extra_formats: &'a [String],
}

impl Default for MineruUploadOptions<'_> {
    fn default() -> Self {
        Self {
            model_version: "vlm",
            is_ocr: false,
            enable_formula: true,
            enable_table: true,
            language: "ch",
            page_ranges: "",
            data_id: "",
            extra_formats: &[],
        }
    }
}

impl MineruClient {
    pub fn new(base_url: impl Into<String>, token: impl Into<String>) -> Self {
        Self::with_runtime(base_url, token, MineruRuntimeConfig::from_env())
    }

    pub fn with_runtime(
        base_url: impl Into<String>,
        token: impl Into<String>,
        runtime: MineruRuntimeConfig,
    ) -> Self {
        let http = Client::builder()
            .connect_timeout(Duration::from_secs(runtime.request_timeout_secs))
            .timeout(Duration::from_secs(runtime.request_timeout_secs))
            .build()
            .expect("reqwest client");
        Self::with_http_client(base_url, token, runtime, http)
    }

    /// 用调用方建好的 HTTP 客户端。给密钥校验用：校验有自己的超时、不跟随重定向，
    /// 正式跑任务的客户端（[`Self::with_runtime`]）不受影响。
    pub fn with_http_client(
        base_url: impl Into<String>,
        token: impl Into<String>,
        runtime: MineruRuntimeConfig,
        http: Client,
    ) -> Self {
        let base_url = {
            let raw = base_url.into();
            let trimmed = raw.trim();
            if trimmed.is_empty() {
                runtime.default_base_url.trim_end_matches('/').to_string()
            } else {
                trimmed.trim_end_matches('/').to_string()
            }
        };
        Self {
            base_url,
            token: token.into(),
            http,
            runtime,
        }
    }

    pub async fn apply_upload_url(
        &self,
        file_name: &str,
        options: &MineruUploadOptions<'_>,
    ) -> Result<MineruUploadTarget> {
        let payload = build_apply_upload_payload(file_name, options);
        let envelope: MineruApiEnvelope<MineruApplyUploadUrlsData> = self
            .post_json("/api/v4/file-urls/batch", &payload)
            .await
            .context("MinerU apply upload url failed")?;
        let data = envelope
            .data
            .ok_or_else(|| anyhow!("MinerU apply upload url missing data"))?;
        let upload_url = data
            .file_urls
            .into_iter()
            .find(|item| !item.trim().is_empty())
            .ok_or_else(|| anyhow!("MinerU API did not return any upload URL"))?;
        Ok(MineruUploadTarget {
            batch_id: data.batch_id,
            upload_url,
            trace_id: normalize_trace_id(&envelope.trace_id),
        })
    }

    /// 把源文件 PUT 到预签名地址。
    ///
    /// # 为什么这里要重试
    ///
    /// MinerU 这个 client 的轮询、bundle 下载、bundle 就绪都各有重试上限，
    /// **只有上传是一次性的** —— 一次传输抖动就让整个任务在 OCR 阶段死掉，用户
    /// 只能重新提交。实测：最近 4 次任务失败里 3 次是 `failed to upload file`，
    /// 分类是 timeout/ocr。
    ///
    /// # 只重试传输错误，不重试 HTTP 错误码
    ///
    /// 和 paddle client 的 `is_retryable_transport_error` 同一套判断。错误码
    /// （预签名地址过期的 403、对象存储拒绝的 4xx）重试多少次都一样，而且会
    /// 白白多等几轮 —— `error_for_status()` 的失败不进重试循环。
    ///
    /// # 为什么重试是安全的
    ///
    /// PUT 到同一个预签名地址、同样的字节，是幂等的：对象存储的语义是整体替换，
    /// 重传不会产生第二份。（paddle 那边把重试限定在幂等调用上，非幂等的提交走
    /// send_once —— 同一个原则。）
    ///
    /// # 超时按文件大小放宽
    ///
    /// 每次尝试的超时是 `upload_timeout_secs` + 每 MB `upload_timeout_per_mb_secs`，
    /// 封顶 `upload_timeout_max_secs`（和 paddle 提交同一套公式）。固定 300s 在
    /// 25 KB/s 的上行下只够传 7 MB 左右。超时变长不会让取消变慢 —— ocr_flow
    /// 那边 select 了取消信号，取消时直接丢掉这个 future。
    pub async fn upload_file(&self, upload_url: &str, file_path: &Path) -> Result<()> {
        let bytes = tokio::fs::read(file_path)
            .await
            .with_context(|| format!("failed to read upload file {}", file_path.display()))?;
        let upload_timeout = self.runtime.upload_timeout_for_bytes(bytes.len() as u64);
        let attempts = self.runtime.upload_retry_attempts.max(1);
        let mut last_error: Option<reqwest::Error> = None;
        for attempt in 1..=attempts {
            match self
                .http
                .put(upload_url)
                .timeout(upload_timeout)
                .body(bytes.clone())
                .send()
                .await
            {
                Ok(response) => {
                    response
                        .error_for_status()
                        .context("MinerU file upload returned error status")?;
                    return Ok(());
                }
                Err(err) => {
                    let retryable = is_retryable_upload_error(&err);
                    last_error = Some(err);
                    if !retryable || attempt >= attempts {
                        break;
                    }
                    tokio::time::sleep(Duration::from_secs(
                        self.runtime.upload_retry_base_delay_secs * attempt as u64,
                    ))
                    .await;
                }
            }
        }
        let err = last_error.expect("upload retry loop should capture the last error");
        Err(anyhow::Error::new(err)).context("MinerU file upload request failed")
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn create_extract_task(
        &self,
        file_url: &str,
        model_version: &str,
        is_ocr: bool,
        enable_formula: bool,
        enable_table: bool,
        language: &str,
        page_ranges: &str,
        data_id: &str,
        no_cache: bool,
        cache_tolerance: i64,
        extra_formats: &[String],
    ) -> Result<MineruCreatedTask> {
        let payload = build_extract_task_payload(
            file_url,
            model_version,
            is_ocr,
            enable_formula,
            enable_table,
            language,
            page_ranges,
            data_id,
            no_cache,
            cache_tolerance,
            extra_formats,
        );
        let envelope: MineruApiEnvelope<MineruTaskData> = self
            .post_json("/api/v4/extract/task", &payload)
            .await
            .context("MinerU create extract task failed")?;
        let data = envelope
            .data
            .ok_or_else(|| anyhow!("MinerU create extract task missing data"))?;
        if data.task_id.trim().is_empty() {
            bail!("MinerU create extract task returned empty task_id");
        }
        Ok(MineruCreatedTask {
            task_id: data.task_id,
            trace_id: normalize_trace_id(&envelope.trace_id),
        })
    }

    pub async fn query_batch_status(
        &self,
        batch_id: &str,
    ) -> Result<MineruTrace<MineruBatchStatusData>> {
        let envelope: MineruApiEnvelope<MineruBatchStatusData> = self
            .get_json(&format!("/api/v4/extract-results/batch/{batch_id}"))
            .await
            .with_context(|| format!("MinerU query batch status failed: {batch_id}"))?;
        Ok(MineruTrace {
            data: envelope.data.unwrap_or_default(),
            trace_id: normalize_trace_id(&envelope.trace_id),
        })
    }

    pub async fn query_task(&self, task_id: &str) -> Result<MineruTrace<MineruTaskData>> {
        let envelope: MineruApiEnvelope<MineruTaskData> = self
            .get_json(&format!("/api/v4/extract/task/{task_id}"))
            .await
            .with_context(|| format!("MinerU query task failed: {task_id}"))?;
        Ok(MineruTrace {
            data: envelope.data.unwrap_or_default(),
            trace_id: normalize_trace_id(&envelope.trace_id),
        })
    }

    pub async fn download_bundle(&self, full_zip_url: &str, dest_path: &Path) -> Result<()> {
        let response = self
            .http
            .get(full_zip_url)
            .header(AUTHORIZATION, self.auth_header())
            .header(ACCEPT, "*/*")
            .timeout(Duration::from_secs(self.runtime.download_timeout_secs))
            .send()
            .await
            .context("MinerU download bundle request failed")?
            .error_for_status()
            .context("MinerU download bundle returned error status")?;
        let bytes = response
            .bytes()
            .await
            .context("failed to read MinerU bundle response bytes")?;
        if let Some(parent) = dest_path.parent() {
            fs::create_dir_all(parent)?;
        }
        tokio::fs::write(dest_path, &bytes)
            .await
            .with_context(|| format!("failed to write bundle to {}", dest_path.display()))?;
        Ok(())
    }

    pub async fn probe_bundle_available(&self, full_zip_url: &str) -> Result<()> {
        self.http
            .get(full_zip_url)
            .header(AUTHORIZATION, self.auth_header())
            .header(ACCEPT, "*/*")
            // Probe only the first byte so we can cheaply wait for CDN availability.
            .header(RANGE, "bytes=0-0")
            .timeout(Duration::from_secs(self.runtime.request_timeout_secs))
            .send()
            .await
            .context("MinerU bundle readiness probe failed")?
            .error_for_status()
            .context("MinerU bundle readiness probe returned error status")?;
        Ok(())
    }

    pub fn unpack_zip(&self, zip_path: &Path, dest_dir: &Path) -> Result<()> {
        fs::create_dir_all(dest_dir)?;
        let file = File::open(zip_path)
            .with_context(|| format!("failed to open bundle {}", zip_path.display()))?;
        let mut archive =
            ZipArchive::new(file).with_context(|| format!("invalid zip {}", zip_path.display()))?;
        // 先把每个条目的名字都查一遍，再开始写：包来自服务商的下载地址，里面有绝对路径或
        // `..` 的条目会写到 dest_dir 外面（zip-slip），整个包直接拒收，不写任何文件。
        for idx in 0..archive.len() {
            let entry = archive.by_index(idx)?;
            if entry.enclosed_name().is_none() {
                bail!(
                    "MinerU bundle rejected: entry {:?} escapes the extraction directory",
                    entry.name()
                );
            }
        }
        for idx in 0..archive.len() {
            let mut entry = archive.by_index(idx)?;
            let relative = entry
                .enclosed_name()
                .map(Path::to_path_buf)
                .ok_or_else(|| anyhow!("MinerU bundle entry escapes the extraction directory"))?;
            let out_path = dest_dir.join(relative);
            if entry.is_dir() {
                fs::create_dir_all(&out_path)?;
                continue;
            }
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent)?;
            }
            let mut writer = File::create(&out_path)?;
            io::copy(&mut entry, &mut writer)?;
            writer.flush()?;
        }
        Ok(())
    }

    async fn post_json<T: DeserializeOwned>(
        &self,
        path: &str,
        payload: &impl Serialize,
    ) -> Result<MineruApiEnvelope<T>> {
        let response = self
            .http
            .post(self.build_url(path))
            .header(CONTENT_TYPE, "application/json")
            .header(ACCEPT, "*/*")
            .header(AUTHORIZATION, self.auth_header())
            .json(payload)
            .send()
            .await
            .with_context(|| format!("POST {} failed", self.build_url(path)))?;
        self.parse_envelope_response(response).await
    }

    async fn get_json<T: DeserializeOwned>(&self, path: &str) -> Result<MineruApiEnvelope<T>> {
        let response = self
            .http
            .get(self.build_url(path))
            .header(ACCEPT, "*/*")
            .header(AUTHORIZATION, self.auth_header())
            .send()
            .await
            .with_context(|| format!("GET {} failed", self.build_url(path)))?;
        self.parse_envelope_response(response).await
    }

    async fn parse_envelope_response<T: DeserializeOwned>(
        &self,
        response: reqwest::Response,
    ) -> Result<MineruApiEnvelope<T>> {
        let status = response.status();
        let retry_after = parse_retry_after(
            response
                .headers()
                .get(RETRY_AFTER)
                .and_then(|h| h.to_str().ok()),
        );
        let text = response
            .text()
            .await
            .context("failed to read MinerU response body")?;
        if !status.is_success() {
            return Err(
                MineruResponseError::from_response(status.as_u16(), &text, retry_after).into(),
            );
        }
        // Inspect the envelope before decoding success-only data. A provider error
        // may contain a different data shape and must retain its code and trace.
        let raw: MineruApiEnvelope<Value> = serde_json::from_str(&text)
            .map_err(|_| MineruResponseError::from_response(status.as_u16(), &text, retry_after))?;
        if !matches!(&raw.code, Value::Number(n) if n.as_i64() == Some(0))
            && !matches!(&raw.code, Value::String(s) if s.trim() == "0")
        {
            return Err(
                MineruResponseError::from_response(status.as_u16(), &text, retry_after).into(),
            );
        }
        let envelope: MineruApiEnvelope<T> = serde_json::from_str(&text).with_context(|| {
            format!(
                "invalid MinerU JSON response: {}",
                summarize_error_text(&text)
            )
        })?;
        Ok(envelope)
    }

    fn build_url(&self, path: &str) -> String {
        if path.starts_with("http://") || path.starts_with("https://") {
            return path.to_string();
        }
        format!(
            "{}/{}",
            self.base_url.trim_end_matches('/'),
            path.trim_start_matches('/')
        )
    }

    fn auth_header(&self) -> String {
        format!("Bearer {}", self.token.trim())
    }
}

pub fn capabilities() -> OcrProviderCapabilities {
    OcrProviderCapabilities {
        supports_remote_url_submit: true,
        supports_local_file_upload: true,
        supports_polling: true,
        supports_download_bundle: true,
        supports_extra_formats: true,
        supports_formula_toggle: true,
        supports_table_toggle: true,
    }
}

pub fn parse_extra_formats(value: &str) -> Vec<String> {
    value
        .split(',')
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

pub fn find_extract_result_in_batch<'a>(
    batch: &'a MineruBatchStatusData,
    file_name: &str,
) -> Option<&'a MineruBatchResultItem> {
    batch
        .extract_result
        .iter()
        .find(|item| item.file_name == file_name)
}

fn build_apply_upload_payload(file_name: &str, options: &MineruUploadOptions<'_>) -> Value {
    let mut file_spec = json!({ "name": file_name, "is_ocr": options.is_ocr });
    if !options.data_id.trim().is_empty() {
        file_spec["data_id"] = Value::String(options.data_id.trim().to_string());
    }
    if !options.page_ranges.trim().is_empty() {
        file_spec["page_ranges"] = Value::String(options.page_ranges.trim().to_string());
    }
    let mut payload = json!({
        "files": [file_spec],
        "model_version": options.model_version,
        "enable_formula": options.enable_formula,
        "enable_table": options.enable_table,
        "language": options.language,
    });
    if !options.extra_formats.is_empty() {
        payload["extra_formats"] = json!(options.extra_formats);
    }
    payload
}

#[allow(clippy::too_many_arguments)]
fn build_extract_task_payload(
    file_url: &str,
    model_version: &str,
    is_ocr: bool,
    enable_formula: bool,
    enable_table: bool,
    language: &str,
    page_ranges: &str,
    data_id: &str,
    no_cache: bool,
    cache_tolerance: i64,
    extra_formats: &[String],
) -> Value {
    let mut payload = json!({
        "url": file_url,
        "model_version": model_version,
        "is_ocr": is_ocr,
        "enable_formula": enable_formula,
        "enable_table": enable_table,
        "language": language,
        "no_cache": no_cache,
        "cache_tolerance": cache_tolerance,
    });
    if !page_ranges.trim().is_empty() {
        payload["page_ranges"] = Value::String(page_ranges.trim().to_string());
    }
    if !data_id.trim().is_empty() {
        payload["data_id"] = Value::String(data_id.trim().to_string());
    }
    if !extra_formats.is_empty() {
        payload["extra_formats"] = Value::Array(
            extra_formats
                .iter()
                .map(|item| Value::String(item.clone()))
                .collect(),
        );
    }
    payload
}

fn summarize_error_text(text: &str) -> String {
    text.trim().chars().take(300).collect()
}

fn normalize_trace_id(trace_id: &str) -> Option<String> {
    let trimmed = trace_id.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_string())
}

#[cfg(test)]
#[path = "http_tests.rs"]
mod http_tests;

#[cfg(test)]
mod tests {
    use super::{
        build_apply_upload_payload, build_extract_task_payload, MineruClient, MineruUploadOptions,
    };
    use std::io::Write;

    fn write_zip(path: &std::path::Path, entries: &[(&str, &[u8])]) {
        let mut writer = zip::ZipWriter::new(std::fs::File::create(path).unwrap());
        let options = zip::write::FileOptions::default();
        for (name, body) in entries {
            writer.start_file(*name, options).unwrap();
            writer.write_all(body).unwrap();
        }
        writer.finish().unwrap();
    }

    fn scratch_dir(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("retainpdf-unpack-{name}-{}", fastrand::u64(..)));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn unpack_zip_extracts_nested_entries_inside_the_destination() {
        let root = scratch_dir("ok");
        let zip_path = root.join("bundle.zip");
        write_zip(&zip_path, &[("full.md", b"# md"), ("images/a.png", b"png")]);
        let dest = root.join("raw");
        MineruClient::new("", "token").unpack_zip(&zip_path, &dest).unwrap();
        assert_eq!(std::fs::read(dest.join("full.md")).unwrap(), b"# md");
        assert_eq!(std::fs::read(dest.join("images/a.png")).unwrap(), b"png");
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn unpack_zip_rejects_parent_dir_and_absolute_entries_without_writing_anything() {
        let outside = scratch_dir("slip-abs-target");
        let abs_name = outside.join("absolute.txt");
        let abs_name = abs_name.to_string_lossy().to_string();
        for (label, evil) in [
            ("parent", "../escaped.txt".to_string()),
            ("nested-parent", "ok/../../escaped.txt".to_string()),
            ("absolute", abs_name.clone()),
        ] {
            let root = scratch_dir(&format!("slip-{label}"));
            let zip_path = root.join("bundle.zip");
            // 好条目排在前面：整个包都要被拒收，连它也不该落盘。
            write_zip(&zip_path, &[("fine.txt", b"fine"), (evil.as_str(), b"pwned")]);
            let dest = root.join("raw");
            let error = MineruClient::new("", "token")
                .unpack_zip(&zip_path, &dest)
                .expect_err(label);
            assert!(error.to_string().contains("escapes"), "{label}: {error:#}");
            assert!(!root.join("escaped.txt").exists(), "{label}: wrote outside dest");
            assert!(!dest.join("fine.txt").exists(), "{label}: partial extraction");
            let _ = std::fs::remove_dir_all(root);
        }
        assert!(!outside.join("absolute.txt").exists(), "absolute entry was written");
        let _ = std::fs::remove_dir_all(outside);
    }

    #[test]
    fn build_apply_upload_payload_includes_page_ranges_when_present() {
        let payload = build_apply_upload_payload(
            "sample.pdf",
            &MineruUploadOptions {
                page_ranges: "1-5",
                data_id: "data-1",
                ..Default::default()
            },
        );

        assert_eq!(payload["model_version"], "vlm");
        assert_eq!(payload["files"][0]["name"], "sample.pdf");
        assert_eq!(payload["files"][0]["data_id"], "data-1");
        assert_eq!(payload["files"][0]["page_ranges"], "1-5");
    }

    #[test]
    fn local_upload_matches_remote_parsing_options_at_correct_wire_levels() {
        let formats = vec!["html".to_string(), "docx".to_string()];
        let local = build_apply_upload_payload(
            "scan.pdf",
            &MineruUploadOptions {
                model_version: "pipeline",
                is_ocr: true,
                enable_formula: false,
                enable_table: false,
                language: "en",
                page_ranges: "2,4-6",
                data_id: "scan-1",
                extra_formats: &formats,
            },
        );
        let remote = build_extract_task_payload(
            "https://example.com/scan.pdf",
            "pipeline",
            true,
            false,
            false,
            "en",
            "2,4-6",
            "scan-1",
            false,
            900,
            &formats,
        );
        for field in [
            "model_version",
            "enable_formula",
            "enable_table",
            "language",
            "extra_formats",
        ] {
            assert_eq!(local[field], remote[field], "{field}");
        }
        for field in ["is_ocr", "page_ranges", "data_id"] {
            assert_eq!(local["files"][0][field], remote[field], "{field}");
            assert!(local.get(field).is_none(), "{field} belongs to each file");
        }
        assert!(
            local.get("no_cache").is_none(),
            "URL caching is not an upload option"
        );
    }

    #[test]
    fn local_upload_defaults_preserve_optional_field_absence() {
        let payload = build_apply_upload_payload("sample.pdf", &Default::default());
        assert_eq!(payload["files"][0]["is_ocr"], false);
        assert_eq!(payload["enable_formula"], true);
        assert_eq!(payload["enable_table"], true);
        assert_eq!(payload["language"], "ch");
        assert!(payload["files"][0].get("page_ranges").is_none());
        assert!(payload["files"][0].get("data_id").is_none());
        assert!(payload.get("extra_formats").is_none());
    }

    #[test]
    fn build_extract_task_payload_includes_page_ranges_when_present() {
        let payload = build_extract_task_payload(
            "https://example.com/a.pdf",
            "vlm",
            false,
            true,
            true,
            "en",
            "2,4-6",
            "data-2",
            false,
            0,
            &["html".to_string()],
        );

        assert_eq!(payload["page_ranges"], "2,4-6");
        assert_eq!(payload["data_id"], "data-2");
        assert_eq!(payload["extra_formats"][0], "html");
    }
}

/// 哪些上传失败值得重传。
///
/// 和 paddle client 的同名判断保持一致：连接、超时、响应体中断，以及 hyper 在
/// 「连上了但一个响应头都没收到」时报的那种 request 错误。**不含 HTTP 错误码**
/// —— 那种重试只是白等。
fn is_retryable_upload_error(err: &reqwest::Error) -> bool {
    err.is_connect()
        || err.is_timeout()
        || err.is_body()
        || (err.is_request() && err.status().is_none())
}
