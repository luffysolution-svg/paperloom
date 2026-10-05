use crate::error::AppError;
use crate::models::api::{LayoutDocxQuery, MarkdownDocumentView, PagePreviewQuery};
use crate::services::derived_artifacts::word::LayoutDocxOptions;
use crate::services::jobs::downloads::{
    bundle_download, cover_download, document_download, layout_docx_download, load_zotero_extras,
    markdown_document_view, markdown_download, markdown_export_download, markdown_image_download,
    markdown_raw_download, obsidian_vault_export, page_preview_download,
    registered_artifact_download, side_by_side_pdf_download, thumbnail_download, ConflictPolicy,
    DocumentDownloadKind, FileDownload, MarkdownDownload, VaultWriteOutcome,
};

use super::previews::PagePreviewSpec;
use super::JobDownloads;

impl<'a> JobDownloads<'a> {
    pub(crate) async fn download_job_document(
        &self,
        job_id: &str,
        ocr_only: bool,
        kind: DocumentDownloadKind,
    ) -> Result<FileDownload, AppError> {
        let deps = self.deps.owned();
        let job_id = job_id.to_owned();
        let label = match kind {
            DocumentDownloadKind::OutputPdf => "output",
            DocumentDownloadKind::NormalizedDocument => "normalized",
            DocumentDownloadKind::NormalizationReport => "normalization-report",
        };
        self.deps
            .download_generation
            .run(format!("{job_id}:document:{label}:{ocr_only}"), move || {
                let deps = deps.borrowed();
                let job = if ocr_only {
                    crate::services::jobs::query::load_ocr_job_with_supported_layout(
                        deps.db,
                        deps.data_root,
                        &job_id,
                    )?
                } else {
                    crate::services::jobs::query::load_supported_job(
                        deps.db,
                        deps.data_root,
                        &job_id,
                    )?
                };
                document_download(&deps, &job, kind)
            })
            .await
    }

    pub async fn markdown_document(&self, job_id: String) -> Result<MarkdownDownload, AppError> {
        markdown_download(&self.deps, job_id).await
    }

    pub async fn markdown_document_view(
        &self,
        job_id: &str,
        base_url: &str,
    ) -> Result<MarkdownDocumentView, AppError> {
        markdown_document_view(&self.deps, job_id, base_url).await
    }

    pub fn markdown_raw_download(&self, job_id: &str) -> Result<FileDownload, AppError> {
        markdown_raw_download(&self.deps, job_id)
    }

    pub fn markdown_image_download(
        &self,
        job_id: &str,
        path: &str,
    ) -> Result<FileDownload, AppError> {
        markdown_image_download(&self.deps, job_id, path)
    }

    pub async fn markdown_export_download(
        &self,
        job_id: &str,
        include_source: bool,
    ) -> Result<FileDownload, AppError> {
        let zotero_extras = load_zotero_extras(&self.deps, job_id).await;
        let deps = self.deps.owned();
        let job_id = job_id.to_owned();
        self.deps
            .download_generation
            .run(
                format!("{job_id}:markdown-export:{include_source}"),
                move || {
                    markdown_export_download(
                        &deps.borrowed(),
                        &job_id,
                        include_source,
                        zotero_extras,
                    )
                },
            )
            .await
    }

    pub(crate) async fn obsidian_vault_export(
        &self,
        job_id: &str,
        vault_root: std::path::PathBuf,
        folder: String,
        include_source: bool,
        by_collection: bool,
        policy: ConflictPolicy,
    ) -> Result<VaultWriteOutcome, AppError> {
        let zotero_extras = load_zotero_extras(&self.deps, job_id).await;
        let deps = self.deps.owned();
        let job_id = job_id.to_owned();
        tokio::task::spawn_blocking(move || {
            obsidian_vault_export(
                &deps.borrowed(),
                &job_id,
                &vault_root,
                &folder,
                include_source,
                by_collection,
                policy,
                zotero_extras,
            )
        })
        .await
        .map_err(|err| AppError::internal(format!("obsidian export task failed: {err}")))?
    }

    pub async fn cover_download(&self, job_id: &str) -> Result<FileDownload, AppError> {
        let deps = self.deps.owned();
        let job_id = job_id.to_owned();
        self.deps
            .download_generation
            .run(format!("{job_id}:cover:w900"), move || {
                cover_download(&deps.borrowed(), &job_id)
            })
            .await
    }

    pub async fn thumbnail_download(&self, job_id: &str) -> Result<FileDownload, AppError> {
        let deps = self.deps.owned();
        let job_id = job_id.to_owned();
        self.deps
            .download_generation
            .run(format!("{job_id}:thumbnail:w360"), move || {
                thumbnail_download(&deps.borrowed(), &job_id)
            })
            .await
    }

    pub async fn page_preview_download(
        &self,
        job_id: &str,
        page: u32,
        query: &PagePreviewQuery,
    ) -> Result<FileDownload, AppError> {
        let deps = self.deps.owned();
        let job_id = job_id.to_owned();
        let spec = PagePreviewSpec::new(page, query);
        self.deps
            .download_generation
            .run(spec.generation_key(&job_id), move || {
                page_preview_download(&deps.borrowed(), &job_id, &spec)
            })
            .await
    }

    pub async fn side_by_side_pdf_download(&self, job_id: &str) -> Result<FileDownload, AppError> {
        let deps = self.deps.owned();
        let job_id = job_id.to_owned();
        self.deps
            .download_generation
            .run(format!("{job_id}:side-by-side"), move || {
                side_by_side_pdf_download(&deps.borrowed(), &job_id)
            })
            .await
    }

    pub(crate) async fn layout_docx_download(
        &self,
        job_id: &str,
        query: &LayoutDocxQuery,
    ) -> Result<FileDownload, AppError> {
        let mut options = LayoutDocxOptions::default();
        if let Some(dpi) = query.dpi {
            // 夹在可用区间里:太低看不清背景,太高单页几十 MB,整本能把浏览器拖垮。
            options.dpi = dpi.clamp(72, 300);
        }
        let deps = self.deps.owned();
        let job_id = job_id.to_owned();
        // 缓存键带上 DPI:换了清晰度就是另一份产物,不能和上一份挤在同一个 in-flight 槽里。
        let key = format!("{job_id}:layout-docx:{}", options.cache_suffix());
        self.deps
            .download_generation
            .run(key, move || {
                layout_docx_download(&deps.borrowed(), &job_id, options)
            })
            .await
    }

    pub async fn bundle_download(&self, job_id: &str) -> Result<FileDownload, AppError> {
        let deps = self.deps.owned();
        let job_id = job_id.to_owned();
        self.deps
            .download_generation
            .run(format!("{job_id}:bundle"), move || {
                bundle_download(&deps.borrowed(), &job_id)
            })
            .await
    }
}

impl<'a> JobDownloads<'a> {
    pub async fn registered_artifact_download(
        &self,
        job_id: &str,
        artifact_key: &str,
        include_job_dir: bool,
        ocr_only: bool,
    ) -> Result<FileDownload, AppError> {
        let deps = self.deps.owned();
        let job_id = job_id.to_owned();
        let artifact_key = artifact_key.to_owned();
        let key = format!("{job_id}:artifact:{artifact_key}:{include_job_dir}:{ocr_only}");
        self.deps
            .download_generation
            .run(key, move || {
                let deps = deps.borrowed();
                let job = if ocr_only {
                    crate::services::jobs::query::load_ocr_job_with_supported_layout(
                        deps.db,
                        deps.data_root,
                        &job_id,
                    )?
                } else {
                    crate::services::jobs::query::load_supported_job(
                        deps.db,
                        deps.data_root,
                        &job_id,
                    )?
                };
                registered_artifact_download(&deps, &job, &artifact_key, include_job_dir)
            })
            .await
    }
}
