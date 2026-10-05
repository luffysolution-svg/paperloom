use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE, IF_MATCH, IF_NONE_MATCH};
use reqwest::{Response, StatusCode, Url};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::sync::Mutex;

use crate::error::AppError;

use super::{major_version, str_field, validate_key, validate_library_id};

const WRITE_MAJOR_VERSION: u32 = 10;
const AUTH_FILE: &str = "zotero-local-auth.json";
const APP_NAME: &str = "PaperLoom";

static WRITE_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

#[derive(Debug, Serialize)]
pub struct ZoteroWritebackResult {
    pub status: &'static str,
    pub attachment_key: String,
    pub filename: String,
    pub zotero_uri: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct StoredAuthorization {
    server_id: String,
    key: String,
    remember: bool,
}

#[derive(Debug, Deserialize)]
struct AuthorizationResponse {
    key: String,
    #[serde(default)]
    remember: bool,
}

#[derive(Debug, Deserialize)]
struct UploadAuthorization {
    #[serde(default)]
    exists: u8,
    #[serde(default)]
    url: String,
    #[serde(rename = "contentType", default)]
    content_type: String,
    #[serde(default)]
    prefix: String,
    #[serde(default)]
    suffix: String,
    #[serde(rename = "uploadKey", default)]
    upload_key: String,
}

struct ServerInfo {
    server_id: String,
}

pub struct ZoteroWriteClient {
    base: String,
    http: reqwest::Client,
    auth_path: PathBuf,
}

impl ZoteroWriteClient {
    pub fn new(base: String, data_root: &Path) -> Result<Self, AppError> {
        let http = reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(120))
            .build()
            .map_err(|err| AppError::internal(format!("build zotero write client: {err}")))?;
        Ok(Self {
            base,
            http,
            auth_path: data_root.join("secrets").join(AUTH_FILE),
        })
    }

    pub async fn write_translated_pdf(
        &self,
        library_id: &str,
        parent_item_key: &str,
        document_id: &str,
        pdf_path: &Path,
    ) -> Result<ZoteroWritebackResult, AppError> {
        let _guard = WRITE_LOCK.get_or_init(|| Mutex::new(())).lock().await;
        let library_id = validate_library_id(library_id)?;
        let parent_item_key = validate_key(parent_item_key)?;
        let bytes = tokio::fs::read(pdf_path)
            .await
            .map_err(|err| AppError::internal(format!("读取译文 PDF 失败：{err}")))?;
        if bytes.len() as u64 >= 4 * 1024 * 1024 * 1024u64 {
            return Err(AppError::payload_too_large(
                "Zotero 本地文件上传限制为 4 GB",
            ));
        }

        let server = self.server_info().await?;
        let mut auth = self.load_authorization(&server.server_id);
        let marker = format!("paperloom-document:{document_id}");
        let existing = self
            .find_existing_attachment(library_id, parent_item_key, &marker)
            .await?;
        let (attachment_key, previous_md5, created) = match existing {
            Some((key, md5)) => (key, md5, false),
            None => {
                let key = self
                    .create_attachment(
                        &server.server_id,
                        &mut auth,
                        library_id,
                        parent_item_key,
                        &marker,
                    )
                    .await?;
                (key, None, true)
            }
        };

        let filename = "PaperLoom-zh.pdf".to_string();
        self.upload_file(
            &server.server_id,
            &mut auth,
            library_id,
            &attachment_key,
            previous_md5.as_deref(),
            &filename,
            &bytes,
        )
        .await?;

        Ok(ZoteroWritebackResult {
            status: if created { "created" } else { "updated" },
            zotero_uri: super::open_pdf_uri(library_id, &attachment_key),
            attachment_key,
            filename,
        })
    }

    async fn server_info(&self) -> Result<ServerInfo, AppError> {
        let response = self
            .http
            .get(format!("{}/api/", self.base))
            .send()
            .await
            .map_err(super::unreachable_error)?;
        if !response.status().is_success() {
            return Err(response_error("读取 Zotero 版本", response).await);
        }
        let headers = response.headers();
        let version = header_text(headers, "X-Zotero-Version").unwrap_or_default();
        let major = major_version(&version).unwrap_or_default();
        if major < WRITE_MAJOR_VERSION {
            return Err(AppError::conflict(format!(
                "译文写回需要 Zotero {WRITE_MAJOR_VERSION} 及以上（当前 {}）",
                if version.is_empty() {
                    "未知版本"
                } else {
                    &version
                }
            )));
        }
        let server_id = header_text(headers, "Zotero-Server-ID")
            .filter(|value| !value.is_empty())
            .ok_or_else(|| AppError::conflict("Zotero 10 本地接口未返回 Zotero-Server-ID"))?;
        Ok(ServerInfo { server_id })
    }

    async fn find_existing_attachment(
        &self,
        library_id: &str,
        parent_item_key: &str,
        marker: &str,
    ) -> Result<Option<(String, Option<String>)>, AppError> {
        let response = self
            .http
            .get(format!(
                "{}/api/{library_id}/items/{parent_item_key}/children",
                self.base
            ))
            .header("Zotero-API-Version", "3")
            .query(&[("itemType", "attachment")])
            .send()
            .await
            .map_err(super::unreachable_error)?;
        if !response.status().is_success() {
            return Err(response_error("读取 Zotero 子附件", response).await);
        }
        let items: Value = response
            .json()
            .await
            .map_err(|err| AppError::bad_gateway(format!("解析 Zotero 子附件失败：{err}")))?;
        for item in items.as_array().into_iter().flatten() {
            let data = item.get("data").unwrap_or(&Value::Null);
            if str_field(data, "itemType") != "attachment"
                || str_field(data, "contentType") != "application/pdf"
                || !str_field(data, "note").contains(marker)
            {
                continue;
            }
            let key = validate_key(str_field(data, "key"))?.to_string();
            let md5 = str_field(data, "md5").trim();
            return Ok(Some((key, (!md5.is_empty()).then(|| md5.to_string()))));
        }
        Ok(None)
    }

    async fn create_attachment(
        &self,
        server_id: &str,
        auth: &mut Option<StoredAuthorization>,
        library_id: &str,
        parent_item_key: &str,
        marker: &str,
    ) -> Result<String, AppError> {
        let write_token = format!("{:016x}{:016x}", fastrand::u64(..), fastrand::u64(..));
        let payload = json!([{
            "itemType": "attachment",
            "parentItem": parent_item_key,
            "linkMode": "imported_file",
            "title": "PaperLoom 中文译文",
            "accessDate": "",
            "url": "",
            "note": format!("<p>PaperLoom translated PDF</p><p>{marker}</p>"),
            "tags": [],
            "relations": {},
            "contentType": "application/pdf",
            "charset": "",
            "md5": null,
            "mtime": null
        }]);
        // Zotero 10 applies JSON fields in order; filename before linkMode
        // fails for new attachments. The file upload sets the filename later.
        let response = self
            .authenticated_write(server_id, auth, |key| {
                self.http
                    .post(format!("{}/api/{library_id}/items", self.base))
                    .header(CONTENT_TYPE, "application/json")
                    .header("Zotero-Write-Token", &write_token)
                    .header("Zotero-API-Key", key)
                    .json(&payload)
            })
            .await?;
        let body: Value = response
            .json()
            .await
            .map_err(|err| AppError::bad_gateway(format!("解析 Zotero 创建附件响应失败：{err}")))?;
        body.pointer("/success/0")
            .and_then(Value::as_str)
            .map(str::to_string)
            .ok_or_else(|| AppError::conflict(format!("Zotero 未创建译文附件：{body}")))
    }

    #[allow(clippy::too_many_arguments)]
    async fn upload_file(
        &self,
        server_id: &str,
        auth: &mut Option<StoredAuthorization>,
        library_id: &str,
        attachment_key: &str,
        previous_md5: Option<&str>,
        filename: &str,
        bytes: &[u8],
    ) -> Result<(), AppError> {
        let hash = format!("{:x}", md5::compute(bytes));
        let mtime = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
            .to_string();
        let filesize = bytes.len().to_string();
        let form = [
            ("md5", hash.as_str()),
            ("filename", filename),
            ("filesize", filesize.as_str()),
            ("mtime", mtime.as_str()),
        ];
        let file_url = format!("{}/api/{library_id}/items/{attachment_key}/file", self.base);
        let authorization = self
            .authenticated_write(server_id, auth, |key| {
                apply_file_precondition(
                    self.http
                        .post(&file_url)
                        .header("Zotero-API-Key", key)
                        .form(&form),
                    previous_md5,
                )
            })
            .await?;
        let upload: UploadAuthorization = authorization
            .json()
            .await
            .map_err(|err| AppError::bad_gateway(format!("解析 Zotero 上传授权失败：{err}")))?;
        if upload.exists == 1 {
            return Ok(());
        }
        if upload.url.is_empty() || upload.upload_key.is_empty() || upload.content_type.is_empty() {
            return Err(AppError::bad_gateway("Zotero 上传授权响应缺少必要字段"));
        }
        self.validate_upload_url(&upload.url)?;
        let mut body = Vec::with_capacity(upload.prefix.len() + bytes.len() + upload.suffix.len());
        body.extend_from_slice(upload.prefix.as_bytes());
        body.extend_from_slice(bytes);
        body.extend_from_slice(upload.suffix.as_bytes());
        let response = self
            .http
            .post(&upload.url)
            .header(CONTENT_TYPE, upload.content_type)
            .body(body)
            .send()
            .await
            .map_err(super::unreachable_error)?;
        if response.status() != StatusCode::CREATED {
            return Err(response_error("上传译文 PDF 到 Zotero", response).await);
        }

        let completion = [("upload", upload.upload_key.as_str())];
        self.authenticated_write(server_id, auth, |key| {
            apply_file_precondition(
                self.http
                    .post(&file_url)
                    .header("Zotero-API-Key", key)
                    .form(&completion),
                previous_md5,
            )
        })
        .await?;
        Ok(())
    }

    fn validate_upload_url(&self, raw: &str) -> Result<(), AppError> {
        let upload = Url::parse(raw)
            .map_err(|_| AppError::bad_gateway("Zotero 返回了无效的本地上传地址"))?;
        let base = Url::parse(&self.base)
            .map_err(|_| AppError::internal("invalid configured Zotero API base"))?;
        if upload.scheme() != base.scheme()
            || upload.host_str() != base.host_str()
            || upload.port_or_known_default() != base.port_or_known_default()
            || !upload.path().starts_with("/api/local/uploads/")
        {
            return Err(AppError::bad_gateway(
                "Zotero 返回的上传地址不属于当前本地 Zotero 实例",
            ));
        }
        Ok(())
    }

    async fn authenticated_write<F>(
        &self,
        server_id: &str,
        auth: &mut Option<StoredAuthorization>,
        build: F,
    ) -> Result<Response, AppError>
    where
        F: Fn(&str) -> reqwest::RequestBuilder,
    {
        for _ in 0..2 {
            if auth.is_none() {
                *auth = Some(self.authorize(server_id).await?);
            }
            let current = auth.as_ref().expect("authorization initialized").clone();
            let response = build(&current.key)
                .header("Zotero-Server-ID", server_id)
                .header("Zotero-API-Version", "3")
                .send()
                .await
                .map_err(super::unreachable_error)?;
            let status = response.status();
            if !current.remember {
                *auth = None;
            }
            if status == StatusCode::UNAUTHORIZED {
                self.clear_authorization();
                *auth = None;
                continue;
            }
            if !status.is_success() {
                return Err(response_error("写入 Zotero", response).await);
            }
            return Ok(response);
        }
        Err(AppError::unauthorized(
            "Zotero 写入授权已失效，请在 Zotero 中重新允许 PaperLoom",
        ))
    }

    async fn authorize(&self, server_id: &str) -> Result<StoredAuthorization, AppError> {
        let response = self
            .http
            .post(format!("{}/api/local/authorize", self.base))
            .header(CONTENT_TYPE, "application/json")
            .header("Zotero-Server-ID", server_id)
            .json(&json!({ "appName": APP_NAME }))
            .send()
            .await
            .map_err(super::unreachable_error)?;
        if !response.status().is_success() {
            return Err(response_error("请求 Zotero 写入授权", response).await);
        }
        let granted: AuthorizationResponse = response
            .json()
            .await
            .map_err(|err| AppError::bad_gateway(format!("解析 Zotero 授权响应失败：{err}")))?;
        if granted.key.trim().is_empty() {
            return Err(AppError::unauthorized("Zotero 未返回写入授权密钥"));
        }
        let authorization = StoredAuthorization {
            server_id: server_id.to_string(),
            key: granted.key,
            remember: granted.remember,
        };
        if authorization.remember {
            self.save_authorization(&authorization)?;
        }
        Ok(authorization)
    }

    fn load_authorization(&self, server_id: &str) -> Option<StoredAuthorization> {
        let raw = fs::read_to_string(&self.auth_path).ok()?;
        let auth: StoredAuthorization = serde_json::from_str(&raw).ok()?;
        (auth.remember && auth.server_id == server_id && !auth.key.trim().is_empty())
            .then_some(auth)
    }

    fn save_authorization(&self, authorization: &StoredAuthorization) -> Result<(), AppError> {
        let parent = self
            .auth_path
            .parent()
            .ok_or_else(|| AppError::internal("invalid Zotero authorization path"))?;
        fs::create_dir_all(parent)?;
        let temp = self.auth_path.with_extension("json.tmp");
        fs::write(
            &temp,
            serde_json::to_vec(authorization).map_err(|err| {
                AppError::internal(format!("serialize Zotero authorization: {err}"))
            })?,
        )?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&temp, fs::Permissions::from_mode(0o600))?;
        }
        fs::rename(temp, &self.auth_path)?;
        Ok(())
    }

    fn clear_authorization(&self) {
        let _ = fs::remove_file(&self.auth_path);
    }
}

fn apply_file_precondition(
    request: reqwest::RequestBuilder,
    previous_md5: Option<&str>,
) -> reqwest::RequestBuilder {
    match previous_md5 {
        Some(md5) => request.header(IF_MATCH, md5),
        None => request.header(IF_NONE_MATCH, HeaderValue::from_static("*")),
    }
}

fn header_text(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get(name)?
        .to_str()
        .ok()
        .map(str::trim)
        .map(str::to_string)
}

async fn response_error(context: &str, response: Response) -> AppError {
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    let detail: String = body.trim().chars().take(300).collect();
    let message = if detail.is_empty() {
        format!("{context}失败：Zotero 返回 {status}")
    } else {
        format!("{context}失败：Zotero 返回 {status}：{detail}")
    };
    match status {
        StatusCode::UNAUTHORIZED => AppError::unauthorized(message),
        StatusCode::FORBIDDEN => AppError::forbidden(message),
        StatusCode::CONFLICT | StatusCode::PRECONDITION_FAILED => AppError::conflict(message),
        StatusCode::PAYLOAD_TOO_LARGE => AppError::payload_too_large(message),
        StatusCode::TOO_MANY_REQUESTS => AppError::too_many_requests(message),
        StatusCode::PRECONDITION_REQUIRED | StatusCode::BAD_REQUEST => {
            AppError::bad_request(message)
        }
        _ => AppError::bad_gateway(message),
    }
}

#[cfg(test)]
#[path = "writeback_tests.rs"]
mod tests;
