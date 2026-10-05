// 集成路由的应用门面：Zotero（桌面端本地 API / Docker 数据目录）浏览与导入，
// Obsidian 库发现、默认设置与导出。
//
// 导入只负责「附件 → 书库文档」：同一文件（sha256 相同）不重复上传；翻译由前端
// 沿用书库的「翻译此文档」流程提交，已有译文或在跑的任务会直接复用。

use std::path::Path;

use serde::{Deserialize, Serialize};

use super::obsidian::{
    self, default_obsidian_config_path, discover_vaults, find_available_vault, mounted_vaults_dir,
};
pub(crate) use super::obsidian::{ObsidianIntegrationView, ObsidianSettings};
use super::zotero::{
    self, collection_path, validate_key, validate_library_id, ZoteroBibliography, ZoteroSource,
};
pub(crate) use super::zotero::{ZoteroCollection, ZoteroItemPage, ZoteroStatus};
pub(crate) use super::zotero::writeback::ZoteroWritebackResult;
use crate::db::documents::sha256_hex;
use crate::db::external_refs::ExternalRefRecord;
use crate::db::Db;
use crate::error::AppError;
use crate::models::domain::{JobStatusKind, WorkflowKind};
use crate::services::jobs::{
    normalize_vault_folder, note_uri_path, ConflictPolicy, JobDownloads, VaultWriteStatus,
};
use crate::services::uploads::api::{store_upload, UploadApiDeps};
use crate::services::uploads::UploadService;
use crate::storage_paths::resolve_output_pdf;

const MAX_IMPORT_ATTACHMENTS: usize = 200;
const MAX_OBSIDIAN_BATCH_DOCUMENTS: usize = 200;

mod zotero_batch;
pub(crate) use zotero_batch::{
    write_documents_to_zotero_view, ZoteroBatchWritebackRequest, ZoteroBatchWritebackView,
};

pub(crate) struct IntegrationApiDeps<'a> {
    db: &'a Db,
    uploads: &'a UploadService,
    data_root: &'a Path,
}

impl<'a> IntegrationApiDeps<'a> {
    pub(crate) fn new(db: &'a Db, uploads: &'a UploadService, data_root: &'a Path) -> Self {
        Self {
            db,
            uploads,
            data_root,
        }
    }
}

fn client() -> Result<ZoteroSource, AppError> {
    ZoteroSource::from_env()
}

pub(crate) async fn zotero_status_view() -> Result<ZoteroStatus, AppError> {
    Ok(client()?.status().await)
}

#[derive(Debug, Deserialize)]
pub(crate) struct LibraryQuery {
    pub library_id: String,
}

pub(crate) async fn zotero_collections_view(
    query: &LibraryQuery,
) -> Result<Vec<ZoteroCollection>, AppError> {
    client()?.collections(&query.library_id).await
}

#[derive(Debug, Deserialize)]
pub(crate) struct ItemsQuery {
    pub library_id: String,
    #[serde(default)]
    pub collection_key: Option<String>,
    #[serde(default)]
    pub q: Option<String>,
    #[serde(default)]
    pub start: usize,
    #[serde(default = "default_limit")]
    pub limit: usize,
}

fn default_limit() -> usize {
    50
}

pub(crate) async fn zotero_items_view(
    deps: &IntegrationApiDeps<'_>,
    query: &ItemsQuery,
) -> Result<ZoteroItemPage, AppError> {
    let collection_key = query
        .collection_key
        .as_deref()
        .filter(|key| !key.is_empty());
    let mut page = client()?
        .items(
            &query.library_id,
            collection_key,
            query.q.as_deref(),
            query.start,
            query.limit,
        )
        .await?;
    // 标出已导入过的附件，前端据此显示「已在书库」。
    let refs = deps
        .db
        .external_refs_for_library(zotero::SOURCE, &query.library_id)
        .map_err(|err| AppError::internal(err.to_string()))?;
    for attachment in page
        .items
        .iter_mut()
        .flat_map(|item| item.attachments.iter_mut())
    {
        attachment.document_id = refs
            .iter()
            .find(|r| r.attachment_key == attachment.key)
            .map(|r| r.document_id.clone());
    }
    Ok(page)
}

#[derive(Debug, Deserialize)]
pub(crate) struct ImportAttachment {
    pub item_key: String,
    pub attachment_key: String,
}

#[derive(Debug, Deserialize)]
pub(crate) struct ZoteroImportRequest {
    pub library_id: String,
    /// 选择时所在的分类，用于「按分类建子目录」。
    #[serde(default)]
    pub collection_key: Option<String>,
    pub attachments: Vec<ImportAttachment>,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ImportStatus {
    /// 新上传进书库。
    Imported,
    /// 书库里已有同一文件。
    Existing,
    Failed,
}

#[derive(Debug, Serialize)]
pub(crate) struct ZoteroImportResult {
    pub item_key: String,
    pub attachment_key: String,
    pub status: ImportStatus,
    pub document_id: Option<String>,
    pub title: String,
    /// 已完成或进行中的翻译任务；有则无需再提交。
    pub translation_job_id: Option<String>,
    pub message: Option<String>,
}

pub(crate) async fn import_zotero_attachments_view(
    deps: &IntegrationApiDeps<'_>,
    request: &ZoteroImportRequest,
) -> Result<Vec<ZoteroImportResult>, AppError> {
    let library_id = validate_library_id(&request.library_id)?.to_string();
    if request.attachments.is_empty() {
        return Err(AppError::bad_request("no zotero attachments selected"));
    }
    if request.attachments.len() > MAX_IMPORT_ATTACHMENTS {
        return Err(AppError::bad_request(format!(
            "too many attachments (max {MAX_IMPORT_ATTACHMENTS})"
        )));
    }
    for attachment in &request.attachments {
        validate_key(&attachment.item_key)?;
        validate_key(&attachment.attachment_key)?;
    }
    let client = client()?;
    let folder = match request
        .collection_key
        .as_deref()
        .filter(|key| !key.is_empty())
    {
        Some(key) => collection_path(&client.collections(&library_id).await?, validate_key(key)?),
        None => String::new(),
    };

    let mut results = Vec::with_capacity(request.attachments.len());
    for attachment in &request.attachments {
        let outcome = import_one(deps, &client, &library_id, &folder, attachment).await;
        results.push(outcome.unwrap_or_else(|err| ZoteroImportResult {
            item_key: attachment.item_key.clone(),
            attachment_key: attachment.attachment_key.clone(),
            status: ImportStatus::Failed,
            document_id: None,
            title: String::new(),
            translation_job_id: None,
            message: Some(err.to_string()),
        }));
    }
    Ok(results)
}

async fn import_one(
    deps: &IntegrationApiDeps<'_>,
    client: &ZoteroSource,
    library_id: &str,
    folder: &str,
    attachment: &ImportAttachment,
) -> Result<ZoteroImportResult, AppError> {
    let resolved = client
        .resolve_attachment(library_id, &attachment.item_key, &attachment.attachment_key)
        .await?;
    let bytes = tokio::fs::read(&resolved.path).await?;
    let document_id = sha256_hex(&bytes);
    let existing = deps
        .db
        .find_upload_for_document(&document_id)
        .map_err(|err| AppError::internal(err.to_string()))?
        .is_some();
    let status = if existing {
        ImportStatus::Existing
    } else {
        let upload = store_upload(
            &UploadApiDeps::new(deps.uploads),
            resolved.filename.clone(),
            bytes,
            false,
        )
        .await?;
        debug_assert_eq!(upload.content_hash, document_id);
        ImportStatus::Imported
    };

    let bibliography = ZoteroBibliography::from_snapshot(&resolved.snapshot);
    let db = deps.db.clone();
    let record = ExternalRefRecord {
        source: zotero::SOURCE.into(),
        library_id: library_id.into(),
        item_key: attachment.item_key.clone(),
        attachment_key: attachment.attachment_key.clone(),
        document_id: document_id.clone(),
        metadata_json: resolved.snapshot.to_string(),
        collection_path: folder.into(),
        created_at: String::new(),
        updated_at: String::new(),
    };
    let lookup_id = document_id.clone();
    let bib = bibliography.clone();
    let translation_job_id =
        tokio::task::spawn_blocking(move || -> anyhow::Result<Option<String>> {
            db.upsert_external_ref(&record)?;
            db.apply_external_bibliography(
                &lookup_id,
                &bib.title,
                &bib.authors,
                bib.year,
                &bib.doi,
            )?;
            // 最近一个未失败的翻译任务。
            for job_id in db.job_ids_for_document(&lookup_id)?.into_iter().rev() {
                let job = db.get_job(&job_id)?;
                let translating = job.workflow != WorkflowKind::Ocr;
                let alive = matches!(
                    job.status,
                    JobStatusKind::Queued | JobStatusKind::Running | JobStatusKind::Succeeded
                );
                if translating && alive {
                    return Ok(Some(job_id));
                }
            }
            Ok(None)
        })
        .await
        .map_err(|err| AppError::internal(err.to_string()))?
        .map_err(|err| AppError::internal(err.to_string()))?;

    Ok(ZoteroImportResult {
        item_key: attachment.item_key.clone(),
        attachment_key: attachment.attachment_key.clone(),
        status,
        document_id: Some(document_id),
        title: if bibliography.title.is_empty() {
            resolved.filename
        } else {
            bibliography.title
        },
        translation_job_id,
        message: None,
    })
}

fn current_vaults() -> Vec<obsidian::ObsidianVault> {
    discover_vaults(
        default_obsidian_config_path().as_deref(),
        mounted_vaults_dir().as_deref(),
    )
}

pub(crate) async fn obsidian_integration_view(
    deps: &IntegrationApiDeps<'_>,
) -> Result<ObsidianIntegrationView, AppError> {
    let data_root = deps.data_root.to_path_buf();
    tokio::task::spawn_blocking(move || ObsidianIntegrationView {
        vaults: current_vaults(),
        settings: obsidian::load_settings(&data_root),
        obsidian_config_path: default_obsidian_config_path()
            .map(|path| path.to_string_lossy().to_string()),
        mounted_vaults_dir: mounted_vaults_dir().map(|path| path.to_string_lossy().to_string()),
    })
    .await
    .map_err(|err| AppError::internal(err.to_string()))
}

pub(crate) fn save_obsidian_settings_view(
    deps: &IntegrationApiDeps<'_>,
    mut settings: ObsidianSettings,
) -> Result<ObsidianSettings, AppError> {
    settings.folder = normalize_vault_folder(&settings.folder)?;
    obsidian::save_settings(deps.data_root, &settings)?;
    Ok(settings)
}

#[derive(Debug, Deserialize)]
pub(crate) struct ObsidianExportRequest {
    /// 缺省时用设置里的默认库。
    #[serde(default)]
    pub vault_id: Option<String>,
    #[serde(default)]
    pub folder: Option<String>,
    #[serde(default)]
    pub include_source: Option<bool>,
    #[serde(default)]
    pub folder_by_collection: Option<bool>,
    #[serde(default)]
    pub on_conflict: ConflictPolicy,
    /// 把本次的库 / 目录 / 是否导出原文记为默认值。
    #[serde(default = "default_true")]
    pub remember: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Serialize)]
pub(crate) struct ObsidianExportView {
    pub status: VaultWriteStatus,
    pub vault_id: String,
    pub vault_name: String,
    pub note_path: String,
    pub source_note_path: Option<String>,
    pub files_written: usize,
    pub assets_removed: usize,
    /// conflict / skipped 时为 None。
    pub obsidian_uri: Option<String>,
}

struct ResolvedObsidianExport {
    vault: obsidian::ObsidianVault,
    folder: String,
    include_source: bool,
    folder_by_collection: bool,
}

fn resolve_obsidian_export(
    deps: &IntegrationApiDeps<'_>,
    request: &ObsidianExportRequest,
) -> Result<ResolvedObsidianExport, AppError> {
    let settings = obsidian::load_settings(deps.data_root);
    let vault_id = request
        .vault_id
        .clone()
        .or_else(|| settings.default_vault_id.clone())
        .ok_or_else(|| AppError::bad_request("no obsidian vault selected"))?;
    let vault = find_available_vault(&current_vaults(), &vault_id)?;
    let folder = normalize_vault_folder(request.folder.as_deref().unwrap_or(&settings.folder))?;
    let include_source = request.include_source.unwrap_or(settings.include_source);
    let folder_by_collection = request
        .folder_by_collection
        .unwrap_or(settings.folder_by_collection);
    Ok(ResolvedObsidianExport {
        vault,
        folder,
        include_source,
        folder_by_collection,
    })
}

async fn export_job_to_resolved_obsidian(
    downloads: &JobDownloads<'_>,
    job_id: &str,
    request: &ObsidianExportRequest,
    resolved: &ResolvedObsidianExport,
) -> Result<ObsidianExportView, AppError> {
    let outcome = downloads
        .obsidian_vault_export(
            job_id,
            resolved.vault.path.clone().into(),
            resolved.folder.clone(),
            resolved.include_source,
            resolved.folder_by_collection,
            request.on_conflict,
        )
        .await?;
    let written = matches!(
        outcome.status,
        VaultWriteStatus::Created | VaultWriteStatus::Updated
    );
    Ok(ObsidianExportView {
        obsidian_uri: written
            .then(|| obsidian::open_uri(&resolved.vault, &note_uri_path(&outcome.note_path))),
        status: outcome.status,
        vault_id: resolved.vault.id.clone(),
        vault_name: resolved.vault.name.clone(),
        note_path: outcome.note_path,
        source_note_path: outcome.source_note_path,
        files_written: outcome.files_written,
        assets_removed: outcome.assets_removed,
    })
}

fn remember_obsidian_export(
    deps: &IntegrationApiDeps<'_>,
    request: &ObsidianExportRequest,
    resolved: &ResolvedObsidianExport,
) -> Result<(), AppError> {
    if request.remember {
        obsidian::save_settings(
            deps.data_root,
            &ObsidianSettings {
                default_vault_id: Some(resolved.vault.id.clone()),
                folder: resolved.folder.clone(),
                include_source: resolved.include_source,
                folder_by_collection: resolved.folder_by_collection,
            },
        )?;
    }
    Ok(())
}

pub(crate) async fn export_job_to_obsidian_view(
    deps: &IntegrationApiDeps<'_>,
    downloads: &JobDownloads<'_>,
    job_id: &str,
    request: &ObsidianExportRequest,
) -> Result<ObsidianExportView, AppError> {
    let resolved = resolve_obsidian_export(deps, request)?;
    let view = export_job_to_resolved_obsidian(downloads, job_id, request, &resolved).await?;
    if matches!(
        view.status,
        VaultWriteStatus::Created | VaultWriteStatus::Updated
    ) {
        remember_obsidian_export(deps, request, &resolved)?;
    }
    Ok(view)
}

#[derive(Debug, Deserialize)]
pub(crate) struct ObsidianBatchExportRequest {
    pub document_ids: Vec<String>,
    #[serde(flatten)]
    pub export: ObsidianExportRequest,
}

#[derive(Debug, Serialize)]
pub(crate) struct ObsidianBatchExportItem {
    pub document_id: String,
    pub job_id: Option<String>,
    pub result: Option<ObsidianExportView>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize)]
pub(crate) struct ObsidianBatchExportView {
    pub items: Vec<ObsidianBatchExportItem>,
    pub written: usize,
    pub conflicts: usize,
    pub skipped: usize,
    pub failed: usize,
}

fn latest_exportable_job_id(db: &Db, document_id: &str) -> Result<Option<String>, AppError> {
    db.get_document(document_id)
        .map_err(|_| AppError::not_found(format!("document not found: {document_id}")))?;
    let job_ids = db
        .job_ids_for_document(document_id)
        .map_err(|err| AppError::internal(err.to_string()))?;
    for job_id in job_ids.into_iter().rev() {
        let Ok(job) = db.get_job(&job_id) else {
            continue;
        };
        if job.status == JobStatusKind::Succeeded && job.workflow != WorkflowKind::Ocr {
            return Ok(Some(job_id));
        }
    }
    Ok(None)
}

pub(crate) async fn export_documents_to_obsidian_view(
    deps: &IntegrationApiDeps<'_>,
    downloads: &JobDownloads<'_>,
    request: &ObsidianBatchExportRequest,
) -> Result<ObsidianBatchExportView, AppError> {
    if request.document_ids.is_empty() {
        return Err(AppError::bad_request("no documents selected"));
    }
    if request.document_ids.len() > MAX_OBSIDIAN_BATCH_DOCUMENTS {
        return Err(AppError::bad_request(format!(
            "too many documents (max {MAX_OBSIDIAN_BATCH_DOCUMENTS})"
        )));
    }
    let mut document_ids = Vec::with_capacity(request.document_ids.len());
    for document_id in &request.document_ids {
        let document_id = document_id.trim();
        if document_id.is_empty() {
            return Err(AppError::bad_request("document id must not be empty"));
        }
        if !document_ids.iter().any(|existing| existing == document_id) {
            document_ids.push(document_id.to_string());
        }
    }

    let resolved = resolve_obsidian_export(deps, &request.export)?;
    let mut items = Vec::with_capacity(document_ids.len());
    let mut written = 0;
    let mut conflicts = 0;
    let mut skipped = 0;
    let mut failed = 0;

    for document_id in document_ids {
        let job_id = match latest_exportable_job_id(deps.db, &document_id) {
            Ok(Some(job_id)) => job_id,
            Ok(None) => {
                failed += 1;
                items.push(ObsidianBatchExportItem {
                    document_id,
                    job_id: None,
                    result: None,
                    message: Some("没有可导出的已完成译文".to_string()),
                });
                continue;
            }
            Err(err) => {
                failed += 1;
                items.push(ObsidianBatchExportItem {
                    document_id,
                    job_id: None,
                    result: None,
                    message: Some(err.to_string()),
                });
                continue;
            }
        };
        match export_job_to_resolved_obsidian(downloads, &job_id, &request.export, &resolved).await
        {
            Ok(result) => {
                match result.status {
                    VaultWriteStatus::Created | VaultWriteStatus::Updated => written += 1,
                    VaultWriteStatus::Conflict => conflicts += 1,
                    VaultWriteStatus::Skipped => skipped += 1,
                }
                items.push(ObsidianBatchExportItem {
                    document_id,
                    job_id: Some(job_id),
                    result: Some(result),
                    message: None,
                });
            }
            Err(err) => {
                failed += 1;
                items.push(ObsidianBatchExportItem {
                    document_id,
                    job_id: Some(job_id),
                    result: None,
                    message: Some(err.to_string()),
                });
            }
        }
    }

    if written > 0 {
        remember_obsidian_export(deps, &request.export, &resolved)?;
    }
    Ok(ObsidianBatchExportView {
        items,
        written,
        conflicts,
        skipped,
        failed,
    })
}

pub(crate) async fn write_translated_pdf_to_zotero_view(
    deps: &IntegrationApiDeps<'_>,
    job_id: &str,
) -> Result<zotero::writeback::ZoteroWritebackResult, AppError> {
    if zotero::data_dir::data_dir_from_env().is_some() {
        return Err(AppError::conflict(
            "Docker Zotero 数据目录模式为只读；译文写回需要同机运行 Zotero 10+ 本地 API",
        ));
    }
    let job = deps
        .db
        .get_job(job_id)
        .map_err(|_| AppError::not_found(format!("job not found: {job_id}")))?;
    if job.status != JobStatusKind::Succeeded || job.workflow == WorkflowKind::Ocr {
        return Err(AppError::conflict("译文 PDF 尚未生成"));
    }
    let pdf_path = resolve_output_pdf(&job, deps.data_root)
        .filter(|path| path.is_file())
        .ok_or_else(|| AppError::not_found(format!("translated pdf not ready: {job_id}")))?;
    let document = deps
        .db
        .get_document_by_job_id(job_id)
        .map_err(|err| AppError::internal(err.to_string()))?
        .ok_or_else(|| AppError::not_found(format!("document not found for job: {job_id}")))?;
    let external = deps
        .db
        .external_refs_for_document(&document.document_id)
        .map_err(|err| AppError::internal(err.to_string()))?
        .into_iter()
        .find(|reference| reference.source == zotero::SOURCE)
        .ok_or_else(|| AppError::conflict("这篇文献不是从 Zotero 导入，无法确定写回位置"))?;
    zotero::writeback::ZoteroWriteClient::new(zotero::api_base(), deps.data_root)?
        .write_translated_pdf(
            &external.library_id,
            &external.item_key,
            &document.document_id,
            &pdf_path,
        )
        .await
}
