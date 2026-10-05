//! Document source PDF / cover / thumbnail media.

use std::path::PathBuf;
use std::sync::Arc;

use crate::error::AppError;
use crate::services::derived_artifacts;
use crate::services::derived_artifacts::preview::BookImageKind;
use crate::services::download_generation::DownloadGeneration;
use crate::services::jobs::FileDownload;

use super::documents::require_document_upload;
use super::LibraryDeps;

/// Resolved file payload for route-layer streaming (`stream_file`).
#[derive(Debug, Clone)]
pub struct DocumentFileDownload {
    pub path: PathBuf,
    pub content_type: &'static str,
    pub download_name: Option<String>,
}

fn document_source_pdf_path(upload: &crate::models::domain::UploadRecord) -> PathBuf {
    PathBuf::from(&upload.stored_path)
}

async fn ensure_document_image(
    deps: &LibraryDeps<'_>,
    generation: &Arc<DownloadGeneration>,
    document_id: &str,
    source_pdf: &std::path::Path,
    kind: BookImageKind,
) -> Result<PathBuf, AppError> {
    let data_root = deps.data_root.to_path_buf();
    let python_bin = deps.python_bin.to_owned();
    let document_id = document_id.to_owned();
    let source_pdf = source_pdf.to_path_buf();
    let key = format!(
        "document:{document_id}:{}:w{}",
        kind.file_name(),
        kind.width_px()
    );
    let download = generation
        .run(key, move || {
            let artifact_deps = derived_artifacts::DerivedArtifactDeps::new(&python_bin);
            let path = derived_artifacts::preview::ensure_document_book_image(
                artifact_deps,
                &data_root,
                &document_id,
                &source_pdf,
                kind,
            )?;
            Ok(FileDownload::new(path, "image/jpeg", None))
        })
        .await?;
    Ok(download.path)
}

pub fn document_source_pdf(
    deps: &LibraryDeps<'_>,
    document_id: &str,
) -> Result<DocumentFileDownload, AppError> {
    let (document, upload) = require_document_upload(deps, document_id)?;
    let path = document_source_pdf_path(&upload);
    let download_name = if document.source_filename.trim().is_empty() {
        format!("{document_id}.pdf")
    } else {
        document.source_filename.clone()
    };
    Ok(DocumentFileDownload {
        path,
        content_type: "application/pdf",
        download_name: Some(download_name),
    })
}

pub async fn document_cover(
    deps: &LibraryDeps<'_>,
    generation: &Arc<DownloadGeneration>,
    document_id: &str,
) -> Result<DocumentFileDownload, AppError> {
    let (_document, upload) = require_document_upload(deps, document_id)?;
    let source_pdf = document_source_pdf_path(&upload);
    let path = ensure_document_image(
        deps,
        generation,
        document_id,
        &source_pdf,
        BookImageKind::Cover,
    )
    .await?;
    Ok(DocumentFileDownload {
        path,
        content_type: "image/jpeg",
        download_name: None,
    })
}

pub async fn document_thumbnail(
    deps: &LibraryDeps<'_>,
    generation: &Arc<DownloadGeneration>,
    document_id: &str,
) -> Result<DocumentFileDownload, AppError> {
    let (_document, upload) = require_document_upload(deps, document_id)?;
    let source_pdf = document_source_pdf_path(&upload);
    let path = ensure_document_image(
        deps,
        generation,
        document_id,
        &source_pdf,
        BookImageKind::Thumbnail,
    )
    .await?;
    Ok(DocumentFileDownload {
        path,
        content_type: "image/jpeg",
        download_name: None,
    })
}
