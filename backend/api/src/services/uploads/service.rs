use std::path::PathBuf;
use std::sync::Arc;

use super::capacity::{busy, UploadCapacity};
use super::incoming::{remove_stale_incoming, IncomingFile, IncomingUpload};
use super::pdf::{load_pdf_page_count, repair_pdf_with_pymupdf};
use super::staging::{prepare_upload, publish_upload, sanitize_upload_filename, UploadContent};
use super::UploadError;
use crate::db::Db;
use crate::models::domain::UploadRecord;
use retain_core::config::{effective_upload_max_bytes, UploadProcessingConfig};

#[derive(Debug)]
pub(crate) struct UploadedPdfInput {
    pub(crate) filename: String,
    pub(crate) bytes: Vec<u8>,
    pub(crate) developer_mode: bool,
}

pub(crate) struct UploadServiceConfig {
    pub(crate) uploads_dir: PathBuf,
    pub(crate) python_bin: String,
    pub(crate) upload_max_bytes: u64,
    pub(crate) upload_max_pages: u32,
    pub(crate) min_free_disk_bytes: u64,
    pub(crate) processing: UploadProcessingConfig,
}

struct UploadServiceInner {
    db: Arc<Db>,
    config: UploadServiceConfig,
    capacity: Arc<UploadCapacity>,
}

/// An application-owned upload executor. Clones share the same resource limits.
#[derive(Clone)]
pub(crate) struct UploadService {
    inner: Arc<UploadServiceInner>,
}

impl UploadService {
    pub(crate) fn new(db: Arc<Db>, config: UploadServiceConfig) -> Self {
        remove_stale_incoming(&config.uploads_dir);
        let capacity = Arc::new(UploadCapacity::new(config.processing.clone()));
        Self {
            inner: Arc::new(UploadServiceInner {
                db,
                config,
                capacity,
            }),
        }
    }

    #[cfg(test)]
    pub(super) fn capacity(&self) -> Arc<UploadCapacity> {
        self.inner.capacity.clone()
    }

    pub(crate) async fn store(
        &self,
        upload: UploadedPdfInput,
    ) -> Result<UploadRecord, UploadError> {
        self.store_content(
            upload.filename,
            upload.developer_mode,
            UploadContent::Bytes(upload.bytes),
        )
        .await
    }

    fn ensure_free_space(&self, extra_bytes: u64) -> Result<(), UploadError> {
        let floor = self.inner.config.min_free_disk_bytes;
        if floor == 0 {
            return Ok(());
        }
        crate::disk_space::ensure_free_space(
            &self.inner.config.uploads_dir,
            floor.saturating_add(extra_bytes),
            "upload a PDF",
        )
        .map_err(|error| UploadError::InsufficientStorage(error.to_string()))
    }

    pub(crate) async fn begin_incoming(
        &self,
        filename: &str,
        max_bytes: u64,
    ) -> Result<IncomingUpload, UploadError> {
        validate_upload_filename(filename)?;
        self.ensure_free_space(0)?;
        let service = self.clone();
        IncomingUpload::create(
            &self.inner.config.uploads_dir,
            max_bytes.min(effective_upload_max_bytes(self.inner.config.upload_max_bytes).get()),
            Box::new(move || service.ensure_free_space(0)),
        )
        .await
    }

    pub(crate) async fn store_incoming(
        &self,
        filename: String,
        file: IncomingFile,
        developer_mode: bool,
    ) -> Result<UploadRecord, UploadError> {
        self.store_content(filename, developer_mode, UploadContent::Incoming(file))
            .await
    }

    async fn store_content(
        &self,
        filename: String,
        developer_mode: bool,
        content: UploadContent,
    ) -> Result<UploadRecord, UploadError> {
        let uploads_dir = &self.inner.config.uploads_dir;
        let python_bin = &self.inner.config.python_bin;
        let upload_max_bytes = self.inner.config.upload_max_bytes;
        let upload_max_pages = self.inner.config.upload_max_pages;
        let safe_filename = validate_upload_filename(&filename)?;
        let byte_count = content.byte_count();
        if byte_count > effective_upload_max_bytes(upload_max_bytes).get() {
            return Err(UploadError::payload_too_large("request body is too large"));
        }
        let extra = match &content {
            UploadContent::Bytes(_) => byte_count.saturating_mul(2),
            UploadContent::Incoming(_) => byte_count,
        };
        self.ensure_free_space(extra)?;
        let capacity = self.inner.capacity.clone();
        let admitted = capacity
            .admitted
            .clone()
            .try_acquire_owned()
            .map_err(|_| busy())?;
        let buffer = capacity.reserve_buffer(byte_count)?;
        let permit = capacity.acquire(&capacity.parse).await?;
        let db = self.inner.db.clone();
        let uploads_dir = uploads_dir.to_path_buf();
        let python_bin = python_bin.to_string();
        // The admitted worker owns the permit and directory even if the HTTP
        // caller disconnects. Never release capacity while a parser is still alive.
        tokio::spawn(async move {
            let _admitted = admitted;
            let prepared = tokio::task::spawn_blocking(move || {
                let _permit = permit;
                let _buffer = buffer;
                prepare_upload(
                    &uploads_dir,
                    filename,
                    developer_mode,
                    content,
                    safe_filename,
                )
            })
            .await
            .map_err(|_| UploadError::internal("PDF upload worker failed"))??;
            let prepared = if prepared.page_count.is_none() {
                // No parsing permit or original Vec is held while waiting for repair.
                let repair = match capacity.acquire(&capacity.repair).await {
                    Ok(permit) => permit,
                    Err(error) => {
                        let _ = tokio::task::spawn_blocking(move || drop(prepared)).await;
                        return Err(error);
                    }
                };
                tokio::task::spawn_blocking(move || {
                    let _repair = repair;
                    let mut prepared = prepared;
                    repair_pdf_with_pymupdf(&prepared.path, &python_bin)?;
                    prepared.page_count = Some(
                        load_pdf_page_count(&prepared.path)
                            .map_err(|_| UploadError::bad_request("invalid pdf after repair"))?,
                    );
                    Ok::<_, UploadError>(prepared)
                })
                .await
                .map_err(|_| UploadError::internal("PDF repair worker failed"))??
            } else {
                prepared
            };
            tokio::task::spawn_blocking(move || publish_upload(&db, prepared, upload_max_pages))
                .await
                .map_err(|_| UploadError::internal("PDF publication worker failed"))?
        })
        .await
        .map_err(|_| UploadError::internal("PDF upload worker failed"))?
    }
}

fn validate_upload_filename(filename: &str) -> Result<PathBuf, UploadError> {
    if !filename.to_lowercase().ends_with(".pdf") {
        return Err(UploadError::bad_request("uploaded file must be a PDF"));
    }
    sanitize_upload_filename(filename)
}
