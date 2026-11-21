//! 书名：一个任务 / 一本书在界面上叫什么。
//!
//! 书籍详情、任务列表、下载文件名用的都是这一个规则：所属文档的标题优先（会被
//! 自动改名 / 手改），其次上传文件名（或来源 URL 的文件名），最后才是 job_id。
//!
//! 放在 artifacts（共享展示）而不是书库包：jobs 不能依赖书库（check_architecture.py），而任务列表
//! 和下载命名都要用它。规则只写这一份，任务列表、任务详情都调这里，不要在别处再抄一遍。

use std::collections::HashMap;

use retainpdf_data::db::Db;
use retainpdf_core::models::domain::{JobSnapshot, UploadRecord};

/// `document_id`（= 上传内容的 sha256）→ 文档当前标题。
pub type DocumentTitles = HashMap<String, String>;

pub(crate) fn document_title(upload: Option<&UploadRecord>, titles: &DocumentTitles) -> Option<String> {
    let hash = upload?.content_hash.trim();
    (!hash.is_empty()).then(|| titles.get(hash).cloned()).flatten()
}

/// 给一批上传记录查它们所属文档的标题。查询失败就当没有 —— 退回文件名，不影响列表。
pub fn document_titles_for<'a>(
    db: &Db,
    uploads: impl IntoIterator<Item = &'a UploadRecord>,
) -> DocumentTitles {
    let ids: Vec<String> = uploads
        .into_iter()
        .map(|upload| upload.content_hash.trim().to_string())
        .filter(|hash| !hash.is_empty())
        .collect();
    db.document_titles(&ids).unwrap_or_default()
}

/// 书名：所属文档的标题优先，其次上传文件名（或来源 URL 的文件名），最后 job_id。
pub fn display_title(
    upload: Option<&UploadRecord>,
    job: &JobSnapshot,
    titles: &DocumentTitles,
) -> String {
    document_title(upload, titles)
        .or_else(|| source_file_name(upload, job))
        .unwrap_or_else(|| job.job_id.clone())
}

/// 单个任务的书名（下载文件名用）。
pub fn job_display_title(db: &Db, job: &JobSnapshot) -> String {
    let upload_id = job_upload_id(job);
    let ids: Vec<&str> = upload_id.into_iter().collect();
    let uploads = db.get_uploads(&ids).unwrap_or_default();
    let upload = upload_id.and_then(|id| uploads.get(id));
    let titles = document_titles_for(db, upload);
    display_title(upload, job, &titles)
}

/// 任务挂的上传编号，空白当没有。
pub fn job_upload_id(job: &JobSnapshot) -> Option<&str> {
    job.upload_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

/// 源文件名：上传文件名优先，没有就取来源 URL 的最后一段。
pub fn source_file_name(upload: Option<&UploadRecord>, job: &JobSnapshot) -> Option<String> {
    upload
        .map(|upload| upload.filename.trim())
        .filter(|name| !name.is_empty())
        .map(str::to_string)
        .or_else(|| source_url_file_name(job.source_url()))
}

/// 来源 URL 的最后一段（去掉 `#…` 和 `?…`）。书架、任务列表、下载命名共用这一份。
pub fn source_url_file_name(source_url: &str) -> Option<String> {
    let trimmed = source_url.trim();
    let no_fragment = trimmed.split('#').next().unwrap_or(trimmed);
    let no_query = no_fragment.split('?').next().unwrap_or(no_fragment);
    let candidate = no_query.rsplit('/').next().unwrap_or(no_query).trim();
    (!candidate.is_empty()).then(|| candidate.to_string())
}
