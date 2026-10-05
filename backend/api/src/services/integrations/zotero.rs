// Zotero 联动（Zotero 8+）：浏览文库 / 分类 / 条目，解析附件本地文件。
//
// 两种来源，接口一致（ZoteroSource）：
// - 桌面端：本地 API。在 Zotero 7–9 只读；需在 Zotero「设置 → 高级」勾选
//   「允许此电脑上的其他应用与 Zotero 通信」。附件文件经 links.enclosure 的
//   file:// 地址直接读取；WebDAV 未下载到本机的附件没有可读文件。
// - Docker：设置 PAPERLOOM_ZOTERO_DATA_DIR 后读挂载的数据目录（见 data_dir）。

use std::path::PathBuf;

use reqwest::header::HeaderMap;
use serde::Serialize;
use serde_json::{json, Value};

use crate::error::AppError;

pub mod data_dir;
pub mod writeback;

use self::data_dir::ZoteroDataDir;

/// 覆盖本地 API 地址（测试或非常规端口）。
pub const ZOTERO_API_ENV: &str = "PAPERLOOM_ZOTERO_API";
const DEFAULT_API_BASE: &str = "http://127.0.0.1:23119";
pub const MIN_MAJOR_VERSION: u32 = 8;
pub const SOURCE: &str = "zotero";
const PAGE_LIMIT: usize = 100;

pub fn api_base() -> String {
    std::env::var(ZOTERO_API_ENV)
        .ok()
        .map(|value| value.trim().trim_end_matches('/').to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| DEFAULT_API_BASE.to_string())
}

#[derive(Debug, Clone, Serialize)]
pub struct ZoteroLibrary {
    /// API 路径前缀：users/0 或 groups/<id>。
    pub id: String,
    pub name: String,
    pub kind: &'static str,
}

#[derive(Debug, Serialize)]
pub struct ZoteroStatus {
    pub reachable: bool,
    pub version: Option<String>,
    pub supported: bool,
    pub api_base: String,
    pub libraries: Vec<ZoteroLibrary>,
    /// 不可用时给用户看的原因。
    pub message: Option<String>,
    /// local_api | data_dir
    pub mode: &'static str,
    /// 可用但需提醒的情况（如读的是备份、数据可能滞后）。
    pub notice: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ZoteroCollection {
    pub key: String,
    pub name: String,
    pub parent_key: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ZoteroAttachment {
    pub key: String,
    pub title: String,
    /// 本地文件存在、可直接导入。
    pub available: bool,
    pub size: Option<u64>,
    /// 已导入过时对应的书库文档。
    pub document_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ZoteroItem {
    pub key: String,
    pub title: String,
    pub creators: String,
    pub year: Option<String>,
    pub item_type: String,
    pub attachments: Vec<ZoteroAttachment>,
}

#[derive(Debug, Serialize)]
pub struct ZoteroItemPage {
    pub items: Vec<ZoteroItem>,
    pub total: usize,
}

/// PDF 上的一条批注（导出到 Obsidian 时附在译文笔记末尾）。
#[derive(Debug, Clone, Default, PartialEq)]
pub struct ZoteroAnnotation {
    pub key: String,
    /// highlight / underline / note / text / image / ink
    pub kind: String,
    pub text: String,
    pub comment: String,
    pub page_label: String,
    /// 0 起的页序号（annotationPosition.pageIndex）。
    pub page_index: Option<i64>,
    pub sort_index: String,
}

/// 条目下的子笔记（Zotero 存 HTML）。
#[derive(Debug, Clone, Default, PartialEq)]
pub struct ZoteroNote {
    pub key: String,
    pub html: String,
}

/// 附件的批注 + 条目的子笔记。批注按在 PDF 中的位置排序，笔记按添加时间排序。
#[derive(Debug, Clone, Default, PartialEq)]
pub struct ZoteroExtras {
    pub annotations: Vec<ZoteroAnnotation>,
    pub notes: Vec<ZoteroNote>,
}

fn page_index_of(position: &str) -> Option<i64> {
    serde_json::from_str::<Value>(position)
        .ok()?
        .get("pageIndex")?
        .as_i64()
}

/// 导入时解析出的附件：本地文件 + 条目元数据快照。
pub struct ResolvedAttachment {
    pub path: PathBuf,
    pub filename: String,
    pub snapshot: Value,
}

pub struct ZoteroClient {
    base: String,
    http: reqwest::Client,
}

fn unreachable_error(err: reqwest::Error) -> AppError {
    let err = err.without_url();
    AppError::conflict(format!(
        "无法连接 Zotero 本地接口：请确认 Zotero 已打开，并在「设置 → 高级」勾选「允许此电脑上的其他应用与 Zotero 通信」（{err}）"
    ))
}

/// 只接受 users/0 与 groups/<数字>，避免拼出任意 API 路径。
pub fn validate_library_id(library_id: &str) -> Result<&str, AppError> {
    let valid = library_id == "users/0"
        || library_id
            .strip_prefix("groups/")
            .is_some_and(|id| !id.is_empty() && id.chars().all(|c| c.is_ascii_digit()));
    if valid {
        Ok(library_id)
    } else {
        Err(AppError::bad_request(format!(
            "invalid zotero library: {library_id}"
        )))
    }
}

/// Zotero 对象 key：8 位大写字母数字。
pub fn validate_key(key: &str) -> Result<&str, AppError> {
    if key.len() == 8
        && key
            .chars()
            .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit())
    {
        Ok(key)
    } else {
        Err(AppError::bad_request(format!("invalid zotero key: {key}")))
    }
}

fn major_version(version: &str) -> Option<u32> {
    version.split('.').next()?.trim().parse().ok()
}

fn total_results(headers: &HeaderMap) -> Option<usize> {
    headers
        .get("Total-Results")?
        .to_str()
        .ok()?
        .trim()
        .parse()
        .ok()
}

fn str_field<'a>(value: &'a Value, key: &str) -> &'a str {
    value.get(key).and_then(Value::as_str).unwrap_or("")
}

fn is_pdf_attachment(data: &Value) -> bool {
    str_field(data, "itemType") == "attachment"
        && str_field(data, "contentType") == "application/pdf"
}

/// links.enclosure 的 file:// 地址 → 本地路径（文件不存在时为 None）。
fn enclosure_path(item: &Value) -> Option<PathBuf> {
    let href = item.pointer("/links/enclosure/href")?.as_str()?;
    let path = url::Url::parse(href)
        .ok()
        .filter(|url| url.scheme() == "file")?
        .to_file_path()
        .ok()?;
    path.is_file().then_some(path)
}

fn attachment_view(item: &Value) -> ZoteroAttachment {
    let data = item.get("data").unwrap_or(&Value::Null);
    let title = [str_field(data, "title"), str_field(data, "filename")]
        .into_iter()
        .find(|value| !value.is_empty())
        .unwrap_or("PDF")
        .to_string();
    ZoteroAttachment {
        key: str_field(data, "key").to_string(),
        title,
        available: enclosure_path(item).is_some(),
        size: item
            .pointer("/links/enclosure/length")
            .and_then(Value::as_u64),
        document_id: None,
    }
}

fn year_of(item: &Value) -> Option<String> {
    let parsed = item
        .pointer("/meta/parsedDate")
        .and_then(Value::as_str)
        .unwrap_or("");
    let year: String = parsed.chars().take(4).collect();
    (year.len() == 4 && year.chars().all(|c| c.is_ascii_digit())).then_some(year)
}

impl ZoteroClient {
    pub fn new(base: String) -> Result<Self, AppError> {
        // 本地接口：不走系统代理。
        let http = reqwest::Client::builder()
            .no_proxy()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .map_err(|err| AppError::internal(format!("build zotero client: {err}")))?;
        Ok(Self { base, http })
    }

    async fn get(
        &self,
        path: &str,
        query: &[(&str, String)],
    ) -> Result<(Value, HeaderMap), AppError> {
        let resp = self
            .http
            .get(format!("{}/api/{path}", self.base))
            .header("Zotero-API-Version", "3")
            .query(query)
            .send()
            .await
            .map_err(unreachable_error)?;
        let status = resp.status();
        let headers = resp.headers().clone();
        if status == reqwest::StatusCode::NOT_FOUND {
            return Err(AppError::not_found(format!(
                "zotero object not found: {path}"
            )));
        }
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(AppError::conflict(format!(
                "Zotero 本地接口返回 {status}：{}",
                body.chars().take(200).collect::<String>()
            )));
        }
        let value = resp
            .json()
            .await
            .map_err(|err| AppError::internal(format!("parse zotero response: {err}")))?;
        Ok((value, headers))
    }

    pub async fn status(&self) -> ZoteroStatus {
        let mut status = ZoteroStatus {
            reachable: false,
            version: None,
            supported: false,
            api_base: self.base.clone(),
            libraries: Vec::new(),
            message: None,
            mode: "local_api",
            notice: None,
        };
        let resp = match self.http.get(format!("{}/api/", self.base)).send().await {
            Ok(resp) => resp,
            Err(err) => {
                status.message = Some(unreachable_error(err).to_string());
                return status;
            }
        };
        status.reachable = true;
        status.version = resp
            .headers()
            .get("X-Zotero-Version")
            .and_then(|value| value.to_str().ok())
            .map(str::to_string);
        if !resp.status().is_success() {
            status.message = Some("Zotero 本地接口未开启：请在「设置 → 高级」勾选「允许此电脑上的其他应用与 Zotero 通信」".into());
            return status;
        }
        status.supported = status
            .version
            .as_deref()
            .and_then(major_version)
            .is_some_and(|major| major >= MIN_MAJOR_VERSION);
        if !status.supported {
            status.message = Some(format!(
                "需要 Zotero {MIN_MAJOR_VERSION} 及以上（当前 {}）",
                status.version.as_deref().unwrap_or("未知版本")
            ));
            return status;
        }
        match self.libraries().await {
            Ok(libraries) => status.libraries = libraries,
            Err(err) => status.message = Some(err.to_string()),
        }
        status
    }

    async fn libraries(&self) -> Result<Vec<ZoteroLibrary>, AppError> {
        let (top, _) = self
            .get("users/0/items/top", &[("limit", "1".into())])
            .await?;
        let user_name = top
            .pointer("/0/library/name")
            .and_then(Value::as_str)
            .filter(|name| !name.is_empty())
            .unwrap_or("我的文库");
        let mut libraries = vec![ZoteroLibrary {
            id: "users/0".into(),
            name: user_name.to_string(),
            kind: "user",
        }];
        let (groups, _) = self.get("users/0/groups", &[]).await?;
        for group in groups.as_array().into_iter().flatten() {
            let Some(id) = group.get("id").and_then(Value::as_i64) else {
                continue;
            };
            libraries.push(ZoteroLibrary {
                id: format!("groups/{id}"),
                name: group
                    .pointer("/data/name")
                    .and_then(Value::as_str)
                    .unwrap_or("群组")
                    .to_string(),
                kind: "group",
            });
        }
        Ok(libraries)
    }

    pub async fn collections(&self, library_id: &str) -> Result<Vec<ZoteroCollection>, AppError> {
        let path = format!("{}/collections", validate_library_id(library_id)?);
        let mut collections = Vec::new();
        loop {
            let (page, headers) = self
                .get(
                    &path,
                    &[
                        ("limit", PAGE_LIMIT.to_string()),
                        ("start", collections.len().to_string()),
                    ],
                )
                .await?;
            let entries = page.as_array().cloned().unwrap_or_default();
            let fetched = entries.len();
            collections.extend(entries.iter().map(|entry| {
                let data = entry.get("data").unwrap_or(&Value::Null);
                ZoteroCollection {
                    key: str_field(data, "key").to_string(),
                    name: str_field(data, "name").to_string(),
                    parent_key: data
                        .get("parentCollection")
                        .and_then(Value::as_str)
                        .map(str::to_string),
                }
            }));
            let total = total_results(&headers).unwrap_or(collections.len());
            if fetched == 0 || collections.len() >= total {
                break;
            }
        }
        collections.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        Ok(collections)
    }

    /// 顶层条目一页，附带每条的 PDF 附件（独立 PDF 附件条目的附件就是它自己）。
    pub async fn items(
        &self,
        library_id: &str,
        collection_key: Option<&str>,
        query: Option<&str>,
        start: usize,
        limit: usize,
    ) -> Result<ZoteroItemPage, AppError> {
        let library_id = validate_library_id(library_id)?;
        let path = match collection_key {
            Some(key) => format!("{library_id}/collections/{}/items/top", validate_key(key)?),
            None => format!("{library_id}/items/top"),
        };
        let mut params = vec![
            ("limit", limit.clamp(1, PAGE_LIMIT).to_string()),
            ("start", start.to_string()),
            // 不用 itemType 过滤：Zotero 9 本地 API 在 /top 上带 itemType 会把子条目也返回。
            ("sort", "dateAdded".to_string()),
            ("direction", "desc".to_string()),
        ];
        if let Some(q) = query.map(str::trim).filter(|q| !q.is_empty()) {
            params.push(("q", q.to_string()));
        }
        let (page, headers) = self.get(&path, &params).await?;
        // 独立笔记没有可翻译的 PDF；带 parentItem 的是子条目，不应出现在顶层。
        let entries: Vec<Value> = page
            .as_array()
            .into_iter()
            .flatten()
            .filter(|entry| {
                let data = entry.get("data").unwrap_or(&Value::Null);
                !matches!(str_field(data, "itemType"), "note" | "annotation")
                    && data.get("parentItem").and_then(Value::as_str).is_none()
            })
            .cloned()
            .collect();
        let children = futures_util::future::join_all(entries.iter().map(|entry| async move {
            let data = entry.get("data").unwrap_or(&Value::Null);
            let has_children = entry
                .pointer("/meta/numChildren")
                .and_then(Value::as_u64)
                .unwrap_or(0)
                > 0;
            if is_pdf_attachment(data) {
                return vec![attachment_view(entry)];
            }
            if !has_children {
                return Vec::new();
            }
            let key = str_field(data, "key");
            match self
                .get(
                    &format!("{library_id}/items/{key}/children"),
                    &[("itemType", "attachment".into())],
                )
                .await
            {
                Ok((list, _)) => list
                    .as_array()
                    .into_iter()
                    .flatten()
                    .filter(|child| child.get("data").is_some_and(is_pdf_attachment))
                    .map(attachment_view)
                    .collect(),
                Err(_) => Vec::new(),
            }
        }))
        .await;

        let items = entries
            .iter()
            .zip(children)
            .map(|(entry, attachments)| {
                let data = entry.get("data").unwrap_or(&Value::Null);
                ZoteroItem {
                    key: str_field(data, "key").to_string(),
                    title: str_field(data, "title").to_string(),
                    creators: entry
                        .pointer("/meta/creatorSummary")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string(),
                    year: year_of(entry),
                    item_type: str_field(data, "itemType").to_string(),
                    attachments,
                }
            })
            .collect::<Vec<_>>();
        Ok(ZoteroItemPage {
            total: total_results(&headers).unwrap_or(items.len()),
            items,
        })
    }

    /// 指定类型的子条目。Zotero 9 本地 API 不带 itemType 时不返回批注。
    async fn children(
        &self,
        library_id: &str,
        key: &str,
        item_type: &str,
    ) -> Result<Vec<Value>, AppError> {
        let path = format!("{library_id}/items/{key}/children");
        let mut children = Vec::new();
        loop {
            let query = [
                ("itemType", item_type.to_string()),
                ("limit", PAGE_LIMIT.to_string()),
                ("start", children.len().to_string()),
            ];
            let (page, headers) = self.get(&path, &query).await?;
            let entries = page.as_array().cloned().unwrap_or_default();
            let fetched = entries.len();
            children.extend(entries);
            let total = total_results(&headers).unwrap_or(children.len());
            if fetched == 0 || children.len() >= total {
                break;
            }
        }
        Ok(children)
    }

    /// 附件的批注与条目的子笔记（独立附件没有子笔记）。
    pub async fn extras(
        &self,
        library_id: &str,
        item_key: &str,
        attachment_key: &str,
    ) -> Result<ZoteroExtras, AppError> {
        let library_id = validate_library_id(library_id)?;
        let (item_key, attachment_key) = (validate_key(item_key)?, validate_key(attachment_key)?);
        let mut annotations: Vec<ZoteroAnnotation> = self
            .children(library_id, attachment_key, "annotation")
            .await?
            .iter()
            .filter_map(|entry| entry.get("data"))
            .filter(|data| str_field(data, "itemType") == "annotation")
            .map(|data| ZoteroAnnotation {
                key: str_field(data, "key").to_string(),
                kind: str_field(data, "annotationType").to_string(),
                text: str_field(data, "annotationText").to_string(),
                comment: str_field(data, "annotationComment").to_string(),
                page_label: str_field(data, "annotationPageLabel").to_string(),
                page_index: page_index_of(str_field(data, "annotationPosition")),
                sort_index: str_field(data, "annotationSortIndex").to_string(),
            })
            .collect();
        annotations.sort_by(|a, b| a.sort_index.cmp(&b.sort_index));
        let mut notes: Vec<(String, ZoteroNote)> = Vec::new();
        if item_key != attachment_key {
            for entry in self.children(library_id, item_key, "note").await? {
                let Some(data) = entry
                    .get("data")
                    .filter(|data| str_field(data, "itemType") == "note")
                else {
                    continue;
                };
                notes.push((
                    str_field(data, "dateAdded").to_string(),
                    ZoteroNote {
                        key: str_field(data, "key").to_string(),
                        html: str_field(data, "note").to_string(),
                    },
                ));
            }
        }
        notes.sort_by(|a, b| a.0.cmp(&b.0));
        Ok(ZoteroExtras {
            annotations,
            notes: notes.into_iter().map(|(_, note)| note).collect(),
        })
    }

    /// 导入用：附件的本地文件 + 父条目元数据快照（独立附件用它自己）。
    pub async fn resolve_attachment(
        &self,
        library_id: &str,
        item_key: &str,
        attachment_key: &str,
    ) -> Result<ResolvedAttachment, AppError> {
        let library_id = validate_library_id(library_id)?;
        let (attachment, _) = self
            .get(
                &format!("{library_id}/items/{}", validate_key(attachment_key)?),
                &[],
            )
            .await?;
        let data = attachment.get("data").unwrap_or(&Value::Null);
        if !is_pdf_attachment(data) {
            return Err(AppError::bad_request(format!(
                "zotero attachment is not a PDF: {attachment_key}"
            )));
        }
        let parent_key = data
            .get("parentItem")
            .and_then(Value::as_str)
            .unwrap_or(attachment_key);
        if parent_key != validate_key(item_key)? {
            return Err(AppError::bad_request(format!(
                "zotero attachment {attachment_key} does not belong to item {item_key}"
            )));
        }
        let path = enclosure_path(&attachment).ok_or_else(|| {
            AppError::conflict(
                "附件不在本机：WebDAV 同步的附件需先在 Zotero 中打开一次，下载到本地后再导入",
            )
        })?;
        let item = if parent_key == attachment_key {
            attachment.clone()
        } else {
            self.get(&format!("{library_id}/items/{parent_key}"), &[])
                .await?
                .0
        };
        let filename = path
            .file_name()
            .map(|name| name.to_string_lossy().to_string())
            .filter(|name| name.to_lowercase().ends_with(".pdf"))
            .unwrap_or_else(|| format!("{attachment_key}.pdf"));
        Ok(ResolvedAttachment {
            path,
            filename,
            snapshot: json!({
                "data": item.get("data").cloned().unwrap_or(Value::Null),
                "parsed_date": item.pointer("/meta/parsedDate").cloned().unwrap_or(Value::Null),
            }),
        })
    }
}

/// 按部署形态选择来源：设置了数据目录就读目录，否则连本地 API。
pub enum ZoteroSource {
    Api(ZoteroClient),
    DataDir(ZoteroDataDir),
}

impl ZoteroSource {
    pub fn from_env() -> Result<Self, AppError> {
        Ok(match data_dir::data_dir_from_env() {
            Some(root) => Self::DataDir(ZoteroDataDir::new(root)),
            None => Self::Api(ZoteroClient::new(api_base())?),
        })
    }

    pub async fn status(&self) -> ZoteroStatus {
        match self {
            Self::Api(client) => client.status().await,
            Self::DataDir(dir) => dir.status().await,
        }
    }

    pub async fn collections(&self, library_id: &str) -> Result<Vec<ZoteroCollection>, AppError> {
        match self {
            Self::Api(client) => client.collections(library_id).await,
            Self::DataDir(dir) => dir.collections(library_id).await,
        }
    }

    pub async fn items(
        &self,
        library_id: &str,
        collection_key: Option<&str>,
        query: Option<&str>,
        start: usize,
        limit: usize,
    ) -> Result<ZoteroItemPage, AppError> {
        match self {
            Self::Api(client) => {
                client
                    .items(library_id, collection_key, query, start, limit)
                    .await
            }
            Self::DataDir(dir) => {
                dir.items(library_id, collection_key, query, start, limit)
                    .await
            }
        }
    }

    pub async fn resolve_attachment(
        &self,
        library_id: &str,
        item_key: &str,
        attachment_key: &str,
    ) -> Result<ResolvedAttachment, AppError> {
        match self {
            Self::Api(client) => {
                client
                    .resolve_attachment(library_id, item_key, attachment_key)
                    .await
            }
            Self::DataDir(dir) => {
                dir.resolve_attachment(library_id, item_key, attachment_key)
                    .await
            }
        }
    }

    pub async fn extras(
        &self,
        library_id: &str,
        item_key: &str,
        attachment_key: &str,
    ) -> Result<ZoteroExtras, AppError> {
        match self {
            Self::Api(client) => client.extras(library_id, item_key, attachment_key).await,
            Self::DataDir(dir) => dir.extras(library_id, item_key, attachment_key).await,
        }
    }
}

/// 从导入快照提取笔记 frontmatter 用的书目信息。
#[derive(Debug, Clone, Default, PartialEq)]
pub struct ZoteroBibliography {
    pub title: String,
    /// 「姓, 名」；单字段姓名原样。
    pub authors: Vec<String>,
    pub year: Option<i64>,
    pub doi: String,
    pub item_type: String,
    pub publication: String,
    pub url: String,
    pub citekey: String,
    pub tags: Vec<String>,
}

impl ZoteroBibliography {
    pub fn from_snapshot(snapshot: &Value) -> Self {
        let data = snapshot.get("data").unwrap_or(&Value::Null);
        let creators = data
            .get("creators")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        // 有 author 时只取 author；否则（如编著）取全部。
        let has_author = creators
            .iter()
            .any(|c| str_field(c, "creatorType") == "author");
        let authors = creators
            .iter()
            .filter(|c| !has_author || str_field(c, "creatorType") == "author")
            .filter_map(|c| {
                let (last, first, name) = (
                    str_field(c, "lastName"),
                    str_field(c, "firstName"),
                    str_field(c, "name"),
                );
                let full = match (last.trim(), first.trim()) {
                    ("", _) => name.trim().to_string(),
                    (last, "") => last.to_string(),
                    (last, first) => format!("{last}, {first}"),
                };
                (!full.is_empty()).then_some(full)
            })
            .collect();
        let year = snapshot
            .get("parsed_date")
            .and_then(Value::as_str)
            .and_then(|date| date.get(0..4))
            .and_then(|year| year.parse().ok());
        let publication = [
            "publicationTitle",
            "bookTitle",
            "proceedingsTitle",
            "university",
            "publisher",
        ]
        .iter()
        .map(|key| str_field(data, key).trim())
        .find(|value| !value.is_empty())
        .unwrap_or("")
        .to_string();
        Self {
            title: str_field(data, "title").trim().to_string(),
            authors,
            year,
            doi: str_field(data, "DOI").trim().to_string(),
            item_type: str_field(data, "itemType").to_string(),
            publication,
            url: str_field(data, "url").trim().to_string(),
            citekey: str_field(data, "citationKey").trim().to_string(),
            tags: data
                .get("tags")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .map(|tag| str_field(tag, "tag").trim().to_string())
                .filter(|tag| !tag.is_empty())
                .collect(),
        }
    }
}

/// zotero://select/... 与 zotero://open-pdf/...；个人文库用 library，群组用 groups/<id>。
pub fn select_uri(library_id: &str, item_key: &str) -> String {
    format!(
        "zotero://select/{}/items/{item_key}",
        uri_library(library_id)
    )
}

pub fn open_pdf_uri(library_id: &str, attachment_key: &str) -> String {
    format!(
        "zotero://open-pdf/{}/items/{attachment_key}",
        uri_library(library_id)
    )
}

fn uri_library(library_id: &str) -> &str {
    if library_id.starts_with("groups/") {
        library_id
    } else {
        "library"
    }
}

/// 分类 key → 「父/子」路径；找不到返回空串。
pub fn collection_path(collections: &[ZoteroCollection], key: &str) -> String {
    let mut names = Vec::new();
    let mut current = Some(key.to_string());
    while let Some(key) = current {
        let Some(collection) = collections.iter().find(|c| c.key == key) else {
            break;
        };
        names.push(collection.name.clone());
        if names.len() > 32 {
            break;
        }
        current = collection.parent_key.clone();
    }
    names.reverse();
    names.join("/")
}

#[cfg(test)]
mod tests;
