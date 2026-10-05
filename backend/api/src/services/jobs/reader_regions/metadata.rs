use std::path::Path;

use crate::error::AppError;
use crate::models::api::{ReaderDocumentMetadataView, ReaderMetadataView, ReaderPageMetadataView};
use crate::models::domain::JobSnapshot;
use crate::storage_paths::{resolve_output_pdf, resolve_source_pdf};

#[path = "metadata_geometry.rs"]
mod geometry;

pub(crate) fn load_reader_metadata_view(
    data_root: &Path,
    job: &JobSnapshot,
) -> Result<ReaderMetadataView, AppError> {
    Ok(ReaderMetadataView {
        source: resolve_source_pdf(job, data_root)
            .filter(|path| path.exists() && path.is_file())
            .map(|path| load_pdf_metadata(&path))
            .transpose()?,
        translated: resolve_output_pdf(job, data_root)
            .filter(|path| path.exists() && path.is_file())
            .map(|path| load_pdf_metadata(&path))
            .transpose()?,
    })
}

fn load_pdf_metadata(path: &Path) -> Result<ReaderDocumentMetadataView, AppError> {
    let document = lopdf::Document::load(path).map_err(|error| {
        AppError::internal(format!("read pdf metadata {}: {error}", path.display()))
    })?;
    let pages = document.get_pages();
    let mut page_views = Vec::with_capacity(pages.len());
    for (page_number, object_id) in pages {
        let page_object = document
            .get_object(object_id)
            .map_err(|error| AppError::internal(format!("read pdf page object: {error}")))?;
        let page_dict = page_object
            .as_dict()
            .map_err(|error| AppError::internal(format!("read pdf page dict: {error}")))?;
        let (width, height) = geometry::visible_page_size(&document, page_dict);
        page_views.push(ReaderPageMetadataView {
            page: i64::from(page_number),
            width,
            height,
        });
    }
    page_views.sort_by_key(|page| page.page);
    Ok(ReaderDocumentMetadataView {
        page_count: page_views.len() as i64,
        pages: page_views,
    })
}
