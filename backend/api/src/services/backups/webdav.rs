use std::path::Path;
use std::time::Duration;

use futures_util::StreamExt;
use reqwest::{Client, Method, Response, StatusCode, Url};
use serde::{Deserialize, Serialize};
use tokio::io::AsyncWriteExt;
use tokio_util::io::ReaderStream;

use super::archive::{self, MAX_ARCHIVE_BYTES};
use crate::error::AppError;

#[derive(Clone, Default, Deserialize, Serialize)]
pub(crate) struct Settings {
    pub url: String,
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct SettingsInput {
    pub url: String,
    pub username: String,
    pub password: Option<String>,
}

#[derive(Serialize)]
pub(crate) struct SettingsView {
    pub url: String,
    pub username: String,
    pub password_configured: bool,
}

impl Settings {
    pub fn view(&self) -> SettingsView {
        SettingsView {
            url: self
                .target(None)
                .map(|url| url.to_string())
                .unwrap_or_else(|_| self.url.clone()),
            username: self.username.clone(),
            password_configured: !self.password.is_empty(),
        }
    }

    fn target(&self, name: Option<&str>) -> Result<Url, AppError> {
        let mut url = Url::parse(self.url.trim())
            .map_err(|_| AppError::bad_request("请输入完整的 WebDAV 文件夹地址"))?;
        if !matches!(url.scheme(), "http" | "https")
            || url.host_str().is_none()
            || !url.username().is_empty()
            || url.password().is_some()
            || url.query().is_some()
            || url.fragment().is_some()
        {
            return Err(AppError::bad_request(
                "WebDAV 地址须为 HTTP(S) 文件夹地址，账号和密码请填在对应字段中",
            ));
        }
        // Nutstore exposes a readable /dav/ root, but files must live inside a folder.
        if url.host_str() == Some("dav.jianguoyun.com") && matches!(url.path(), "/dav" | "/dav/") {
            url.set_path("/dav/PaperLoom/");
        }
        if !url.path().ends_with('/') {
            url.set_path(&format!("{}/", url.path()));
        }
        if let Some(name) = name {
            validate_name(name)?;
            url.path_segments_mut()
                .map_err(|_| AppError::bad_request("WebDAV 地址无效"))?
                .pop_if_empty()
                .push(name);
        }
        Ok(url)
    }

    fn request(
        &self,
        method: &str,
        name: Option<&str>,
    ) -> Result<reqwest::RequestBuilder, AppError> {
        let client = Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(30 * 60))
            .build()
            .map_err(|_| AppError::internal("无法创建 WebDAV 客户端"))?;
        Ok(client
            .request(
                Method::from_bytes(method.as_bytes()).expect("static DAV method"),
                self.target(name)?,
            )
            .basic_auth(&self.username, Some(&self.password)))
    }
}

pub(super) fn validate_name(name: &str) -> Result<(), AppError> {
    if !name.starts_with("paperloom-backup-")
        || !name.ends_with(".zip")
        || !name
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.'))
    {
        return Err(AppError::bad_request("WebDAV 备份文件名无效"));
    }
    Ok(())
}

async fn checked(response: Result<Response, reqwest::Error>) -> Result<Response, AppError> {
    let response = checked_connection(response)?;
    if !response.status().is_success() {
        let hint = match response.status() {
            StatusCode::UNAUTHORIZED => "账号或应用专用密码不正确，请重新检查 WebDAV 设置",
            StatusCode::FORBIDDEN => "没有此文件夹的访问或写入权限，请检查服务端授权",
            StatusCode::NOT_FOUND | StatusCode::CONFLICT => {
                "备份文件或父文件夹不存在，请检查文件夹地址"
            }
            StatusCode::PAYLOAD_TOO_LARGE => "备份超过服务器允许的单文件大小，请检查服务商限制",
            StatusCode::TOO_MANY_REQUESTS => "请求过于频繁，请稍后重试",
            StatusCode::INSUFFICIENT_STORAGE => "云端存储空间不足，请释放空间后重试",
            _ => "请检查文件夹权限、网络和服务器状态",
        };
        return Err(AppError::bad_gateway(format!(
            "WebDAV 返回 HTTP {}：{hint}",
            response.status().as_u16()
        )));
    }
    Ok(response)
}

fn propfind(settings: &Settings, depth: &str) -> Result<reqwest::RequestBuilder, AppError> {
    Ok(settings.request("PROPFIND", None)?
        .timeout(Duration::from_secs(20))
        .header("Depth", depth)
        .header("Content-Type", "application/xml; charset=utf-8")
        .body("<?xml version=\"1.0\"?><d:propfind xmlns:d=\"DAV:\"><d:prop><d:getcontentlength/><d:getlastmodified/></d:prop></d:propfind>"))
}

async fn listing(settings: &Settings, depth: &str) -> Result<String, AppError> {
    let response = checked(propfind(settings, depth)?.send().await).await?;
    let mut stream = response.bytes_stream();
    let mut body = Vec::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|_| AppError::bad_gateway("读取 WebDAV 文件清单失败"))?;
        if body.len() + chunk.len() > 4 * 1024 * 1024 {
            return Err(AppError::bad_gateway(
                "WebDAV 清单过大，请使用专门的备份文件夹",
            ));
        }
        body.extend_from_slice(&chunk);
    }
    String::from_utf8(body).map_err(|_| AppError::bad_gateway("WebDAV 清单不是有效的 UTF-8"))
}

pub(super) async fn test(settings: &Settings) -> Result<(), AppError> {
    let response = checked_connection(propfind(settings, "0")?.send().await)?;
    if response.status() != StatusCode::NOT_FOUND {
        checked(Ok(response)).await?;
        return Ok(());
    }
    let created = checked_connection(settings.request("MKCOL", None)?.send().await)?;
    // Another client may have created the folder since the first PROPFIND.
    if created.status() != StatusCode::METHOD_NOT_ALLOWED {
        checked(Ok(created)).await?;
    }
    checked(propfind(settings, "0")?.send().await).await?;
    Ok(())
}

fn checked_connection(response: Result<Response, reqwest::Error>) -> Result<Response, AppError> {
    response
        .map_err(|_| AppError::bad_gateway("WebDAV 连接失败或超时，请检查地址、网络和服务器状态"))
}

#[derive(Debug, Serialize)]
pub(crate) struct RemoteItem {
    pub name: String,
    pub bytes: u64,
    pub modified_at: String,
}

pub(super) async fn list(settings: &Settings) -> Result<Vec<RemoteItem>, AppError> {
    let xml = listing(settings, "1").await?;
    let document = roxmltree::Document::parse(&xml)
        .map_err(|_| AppError::bad_gateway("WebDAV 返回的文件清单格式无效"))?;
    let base = settings.target(None)?;
    let mut items = Vec::new();
    for response in document
        .descendants()
        .filter(|node| node.has_tag_name(("DAV:", "response")))
    {
        let text = |tag| {
            response
                .descendants()
                .find(|node| node.has_tag_name(("DAV:", tag)))
                .and_then(|node| node.text())
                .unwrap_or("")
        };
        let Ok(url) = base.join(text("href")) else {
            continue;
        };
        let Some(name) = url.path_segments().and_then(|segments| segments.last()) else {
            continue;
        };
        if validate_name(name).is_err() || url != settings.target(Some(name))? {
            continue;
        }
        items.push(RemoteItem {
            name: name.to_owned(),
            bytes: text("getcontentlength").parse().unwrap_or(0),
            modified_at: text("getlastmodified").to_owned(),
        });
    }
    items.sort_by(|a, b| b.name.cmp(&a.name));
    items.dedup_by(|a, b| a.name == b.name);
    Ok(items)
}

pub(super) async fn upload(settings: &Settings, path: &Path, name: &str) -> Result<(), AppError> {
    test(settings).await?;
    let file = tokio::fs::File::open(path).await?;
    let bytes = file.metadata().await?.len();
    checked(
        settings
            .request("PUT", Some(name))?
            .header("Content-Type", "application/zip")
            .header("Content-Length", bytes)
            .header("If-None-Match", "*")
            .body(reqwest::Body::wrap_stream(ReaderStream::new(file)))
            .send()
            .await,
    )
    .await?;
    Ok(())
}

pub(super) async fn delete(settings: &Settings, name: &str) -> Result<(), AppError> {
    checked(settings.request("DELETE", Some(name))?.send().await).await?;
    Ok(())
}

pub(super) async fn download(
    settings: &Settings,
    name: &str,
    destination: &Path,
) -> Result<(), AppError> {
    let response = checked(settings.request("GET", Some(name))?.send().await).await?;
    if response
        .content_length()
        .is_some_and(|size| size > MAX_ARCHIVE_BYTES)
    {
        return Err(AppError::payload_too_large("迁移包不能超过 64 GiB"));
    }
    let mut file = tokio::fs::File::from_std(archive::private_file(destination)?);
    let mut bytes = 0u64;
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|_| AppError::bad_gateway("下载 WebDAV 备份中断，请重试"))?;
        bytes += chunk.len() as u64;
        if bytes > MAX_ARCHIVE_BYTES {
            return Err(AppError::payload_too_large("迁移包不能超过 64 GiB"));
        }
        file.write_all(&chunk).await?;
    }
    file.sync_all().await?;
    Ok(())
}

pub(super) fn merge(input: SettingsInput, current: Settings) -> Result<Settings, AppError> {
    let mut settings = Settings {
        url: input.url.trim().to_owned(),
        username: input.username,
        password: input.password.unwrap_or(current.password),
    };
    settings.url = settings.target(None)?.to_string();
    Ok(settings)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nutstore_root_uses_a_writable_folder_without_changing_other_targets() {
        for root in [
            "https://dav.jianguoyun.com/dav",
            "https://dav.jianguoyun.com/dav/",
        ] {
            let settings = Settings {
                url: root.into(),
                ..Settings::default()
            };
            assert_eq!(
                settings.view().url,
                "https://dav.jianguoyun.com/dav/PaperLoom/"
            );
            assert_eq!(
                settings
                    .target(Some("paperloom-backup-test.zip"))
                    .unwrap()
                    .path(),
                "/dav/PaperLoom/paperloom-backup-test.zip"
            );
        }
        for url in [
            "https://dav.jianguoyun.com/dav/Custom/",
            "https://example.com/dav/",
        ] {
            assert_eq!(
                Settings {
                    url: url.into(),
                    ..Settings::default()
                }
                .view()
                .url,
                url
            );
        }
    }
}
