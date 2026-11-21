//! 书本身的文件：原文 PDF、封面、缩略图、原文单页预览图（`/documents/:id/files/…`）。
//!
//! 这一次加工产出的文件（译文、对照版、Word……）挂在任务下面，见 services::jobs 的 `open`。

use std::path::{Path, PathBuf};
use std::sync::Arc;

use serde::Serialize;

use retainpdf_data::db::Db;
use retainpdf_api_base::error::AppError;
use retainpdf_core::models::api::to_absolute_url;
use retainpdf_jobs::JobFilesQuery;
use retainpdf_core::models::api::DocumentRecord;
use retainpdf_files::{
    document_page_preview_path, ensure_document_book_image, ensure_page_preview, BookImageKind,
    DerivedArtifactDeps, DownloadGeneration,
};
use retainpdf_jobs::{Disposition, FileDownload};

use super::LibraryDeps;

/// 封面、缩略图、原文页预览。书的原文会变：单机下 Agent 文档操作提交以后，原文换成新版本，
/// 书的编号（第一次上传时的指纹）不变，同一个地址的图跟着变（后端按原文戳重新渲染，见
/// `retainpdf_files` 的 `freshness.rs`）。所以不让浏览器直接用缓存：每次带 `ETag` /
/// `Last-Modified`（`stream_file` 给的）来问，没变回 304，和任务的译文页预览一样。
/// 登录后的内容，用 `private`，不进共享缓存。
const BOOK_IMAGE_CACHE: &str = "private, max-age=0, must-revalidate";

/// 书能取的每一种文件。
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DocumentFile {
    SourcePdf,
    Cover,
    Thumbnail,
    /// 原文第几页（从 1 开始）的预览图。
    Page { page: u32, width_px: u32, dpi: u32 },
}

impl DocumentFile {
    /// `/documents/:id/files/<name>`。
    pub fn named(name: &str) -> Result<Self, AppError> {
        Ok(match name {
            "source.pdf" => Self::SourcePdf,
            "cover.jpg" => Self::Cover,
            "thumbnail.jpg" => Self::Thumbnail,
            _ => return Err(AppError::not_found(format!("no such file: {name}"))),
        })
    }

    /// `/documents/:id/files/pages/<页码>.jpg`。
    pub fn page(name: &str, query: &JobFilesQuery) -> Result<Self, AppError> {
        let page = name
            .strip_suffix(".jpg")
            .and_then(|page| page.parse::<u32>().ok())
            .filter(|page| *page >= 1)
            .ok_or_else(|| AppError::not_found(format!("no such file: pages/{name}")))?;
        Ok(Self::Page {
            page,
            width_px: query.width.unwrap_or(1200).clamp(240, 2400),
            dpi: query.dpi.unwrap_or(0).min(300),
        })
    }

    fn generation_key(&self, document_id: &str) -> String {
        match self {
            Self::SourcePdf => format!("document:{document_id}:source.pdf"),
            Self::Cover | Self::Thumbnail => {
                let kind = self.book_image_kind().expect("cover or thumbnail");
                format!("document:{document_id}:{}:w{}", kind.file_name(), kind.width_px())
            }
            Self::Page { page, width_px, dpi } => {
                format!("document:{document_id}:page:{page}:{width_px}:{dpi}")
            }
        }
    }

    /// 响应的 `Cache-Control`。原文 PDF 不设（前端读原文时自己带 `?version=`）。
    fn cache_control(&self) -> Option<&'static str> {
        match self {
            Self::SourcePdf => None,
            Self::Cover | Self::Thumbnail | Self::Page { .. } => Some(BOOK_IMAGE_CACHE),
        }
    }

    fn book_image_kind(&self) -> Option<BookImageKind> {
        match self {
            Self::Cover => Some(BookImageKind::Cover),
            Self::Thumbnail => Some(BookImageKind::Thumbnail),
            _ => None,
        }
    }
}

/// 书的原文：上传记录里的文件。没有上传记录的旧数据（复用别的任务产物建出来的书）
/// 退回这本书当前任务的原文。
pub(super) fn document_source(db: &Db, data_root: &Path, document_id: &str) -> Result<(DocumentRecord, PathBuf), AppError> {
    let document = db
        .get_document(document_id)
        .map_err(|error| AppError::from_lookup(error, format!("document not found: {document_id}")))?;
    if let Some(upload) = db.find_upload_for_document(document_id)? {
        let path = PathBuf::from(&upload.stored_path);
        if path.is_file() {
            return Ok((document, path));
        }
    }
    let from_job = document
        .active_job_id
        .as_deref()
        .and_then(|job_id| db.get_job(job_id).ok())
        .and_then(|job| retainpdf_core::storage_paths::resolve_source_pdf(&job, data_root))
        .filter(|path| path.is_file());
    match from_job {
        Some(path) => Ok((document, path)),
        None => Err(AppError::not_found(format!(
            "source pdf missing on disk for document: {document_id}"
        ))),
    }
}

fn download_title(document: &DocumentRecord) -> String {
    // 和任务下载同一个命名规则：书名（文档标题）优先，其次原文件名，最后 document_id。
    let title = [document.title.trim(), document.source_filename.trim(), document.document_id.as_str()]
        .into_iter()
        .find(|value| !value.is_empty())
        .unwrap_or(document.document_id.as_str())
        .to_string();
    retainpdf_files::download_file_name(
        &title,
        retainpdf_files::DownloadKind::Source,
    )
}

fn locate(db: &Db, data_root: &Path, python_bin: &str, document_id: &str, file: &DocumentFile) -> Result<FileDownload, AppError> {
    let (document, source_pdf) = document_source(db, data_root, document_id)?;
    let artifact_deps = DerivedArtifactDeps::new(python_bin);
    match file {
        DocumentFile::SourcePdf => {
            Ok(FileDownload::new(source_pdf, "application/pdf", None).with_inline_name(download_title(&document)))
        }
        DocumentFile::Cover | DocumentFile::Thumbnail => {
            let kind = file.book_image_kind().expect("cover or thumbnail");
            let path = ensure_document_book_image(
                artifact_deps,
                data_root,
                document_id,
                &source_pdf,
                kind,
            )?;
            let mut download = FileDownload::new(path, "image/jpeg", None);
            download.cache_control = file.cache_control();
            Ok(download)
        }
        DocumentFile::Page { page, width_px, dpi } => {
            // 页码超出页数：不用起渲染进程，直接 404。页数用 `/files` 清单里 `pages.page_count`
            // 同一份（0 表示没记录，交给渲染脚本判断）。
            if document.page_count > 0 && *page > document.page_count {
                return Err(AppError::not_found(format!("no such file: pages/{page}.jpg")));
            }
            let output = document_page_preview_path(data_root, document_id, *page, *width_px, *dpi)?;
            let path = ensure_page_preview(
                artifact_deps,
                &output,
                &source_pdf,
                page - 1,
                *width_px,
                *dpi,
            )?;
            let mut download = FileDownload::new(path, "image/jpeg", None);
            download.cache_control = file.cache_control();
            Ok(download)
        }
    }
}

/// 书的文件的唯一出口。读文件、按需生成都放进 `download_generation`：同一份产物同时被
/// 请求时只生成一次。
pub async fn open_document_file(
    deps: &LibraryDeps<'_>,
    generation: &Arc<DownloadGeneration>,
    document_id: &str,
    file: DocumentFile,
    disposition: Disposition,
) -> Result<FileDownload, AppError> {
    let key = file.generation_key(document_id);
    let db = deps.db.clone();
    let data_root = deps.data_root.to_path_buf();
    let python_bin = deps.python_bin.to_owned();
    let document_id = document_id.to_owned();
    let mut download = generation
        .run(key, move || locate(&db, &data_root, &python_bin, &document_id, &file))
        .await?;
    // 原文默认带文件名在浏览器里打开；按调用方要的方式改。
    match disposition {
        Disposition::Inline => {}
        Disposition::Attachment => download.download_name = download.inline_name.take(),
    }
    Ok(download)
}

#[derive(Debug, Serialize)]
pub struct DocumentFilesView {
    pub document_id: String,
    pub files: Vec<DocumentFileEntryView>,
    pub pages: DocumentPagesView,
}

#[derive(Debug, Serialize)]
pub struct DocumentFileEntryView {
    pub name: String,
    pub url: String,
    pub content_type: String,
    pub ready: bool,
    /// 按需生成：第一次请求时才生成，会慢一些。
    pub on_demand: bool,
}

#[derive(Debug, Serialize)]
pub struct DocumentPagesView {
    /// 把 `{page}` 换成页码（从 1 开始）。
    pub url_template: String,
    pub page_count: Option<u32>,
}

/// `/documents/:id/files`：书有哪些文件。
pub fn document_files_view(
    deps: &LibraryDeps<'_>,
    document_id: &str,
    base_url: &str,
) -> Result<DocumentFilesView, AppError> {
    // 只有「书在、原文不在磁盘上」才是 `ready: false`；书不在 404，库读不出来 500。
    let (document, source) = match document_source(deps.db, deps.data_root, document_id) {
        Ok((document, path)) => (document, Some(path)),
        Err(AppError::NotFound(_)) => (
            deps.db
                .get_document(document_id)
                .map_err(|error| AppError::from_lookup(error, format!("document not found: {document_id}")))?,
            None,
        ),
        Err(error) => return Err(error),
    };
    let ready = source.as_deref().is_some_and(Path::is_file);
    let files_path = format!("/api/v1/documents/{document_id}/files");
    let entry = |name: &str, content_type: &str, on_demand: bool| DocumentFileEntryView {
        name: name.to_string(),
        url: to_absolute_url(base_url, &format!("{files_path}/{name}")),
        content_type: content_type.to_string(),
        ready,
        on_demand,
    };
    Ok(DocumentFilesView {
        document_id: document_id.to_string(),
        files: vec![
            entry("source.pdf", "application/pdf", false),
            entry("cover.jpg", "image/jpeg", true),
            entry("thumbnail.jpg", "image/jpeg", true),
        ],
        pages: DocumentPagesView {
            url_template: to_absolute_url(base_url, &format!("{files_path}/pages/{{page}}.jpg")),
            page_count: (document.page_count > 0).then_some(document.page_count),
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 书的原文会变（Agent 文档操作提交新版本），同一个地址的封面、缩略图、原文页内容会跟着变：
    /// 不能让浏览器直接用缓存（以前原文页 `immutable` 一年、封面一天），要每次带 ETag 来问。
    #[test]
    fn book_images_are_revalidated_because_the_source_can_change() {
        let query = JobFilesQuery::default();
        for file in [DocumentFile::Cover, DocumentFile::Thumbnail, DocumentFile::page("3.jpg", &query).unwrap()] {
            assert_eq!(file.cache_control(), Some("private, max-age=0, must-revalidate"), "{file:?}");
        }
        assert_eq!(DocumentFile::SourcePdf.cache_control(), None);
    }

    #[test]
    fn names_resolve_and_unknown_names_are_404() {
        assert_eq!(DocumentFile::named("source.pdf").unwrap(), DocumentFile::SourcePdf);
        assert_eq!(DocumentFile::named("cover.jpg").unwrap(), DocumentFile::Cover);
        for name in ["cover.png", "source", "../x"] {
            assert!(matches!(DocumentFile::named(name), Err(AppError::NotFound(_))));
        }
        let query = JobFilesQuery::default();
        assert!(DocumentFile::page("3.jpg", &query).is_ok());
        for name in ["0.jpg", "3.png", "x.jpg"] {
            assert!(matches!(DocumentFile::page(name, &query), Err(AppError::NotFound(_))));
        }
    }
}
