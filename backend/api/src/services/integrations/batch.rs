use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::models::domain::{JobSnapshot, JobStatusKind, WorkflowKind};
use crate::services::files::{write_zip_atomically, FileDownload, ZipSource};
use crate::services::jobs::{stored_path, Disposition, JobDownloads, JobFile, StoredFile};

use super::markdown_export::{markdown_export_download_async, DownloadJobsDeps};

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum BatchExportFormat {
    Translated,
    Comparison,
    Source,
    Markdown,
    Obsidian,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct BatchExportInput {
    pub document_ids: Vec<String>,
    pub format: BatchExportFormat,
    #[serde(default = "default_true")]
    pub include_source: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Clone, Serialize)]
pub(crate) struct BatchExportItem {
    pub document_id: String,
    pub title: String,
    pub folder: Option<String>,
    pub message: Option<String>,
}

#[derive(Serialize)]
pub(crate) struct BatchExportView {
    pub name: Option<String>,
    pub exported: usize,
    pub failed: usize,
    pub items: Vec<BatchExportItem>,
}

struct PreparedFile {
    name: String,
    source: PreparedSource,
}

enum PreparedSource {
    File(PathBuf),
    Archive(PathBuf),
    Markdown(String),
}

pub(crate) async fn export_batch(
    deps: &DownloadJobsDeps<'_>,
    downloads: &JobDownloads<'_>,
    mut input: BatchExportInput,
) -> Result<BatchExportView, AppError> {
    if input.document_ids.is_empty() || input.document_ids.len() > 100 {
        return Err(AppError::bad_request("请一次选择 1 至 100 篇文献导出"));
    }
    let mut ids = Vec::new();
    for id in input.document_ids.drain(..) {
        let id = id.trim().to_string();
        if id.is_empty() {
            return Err(AppError::bad_request("文献编号不能为空"));
        }
        if !ids.contains(&id) {
            ids.push(id);
        }
    }
    let mut files = Vec::new();
    let mut items = Vec::new();
    for (index, id) in ids.iter().enumerate() {
        let document = deps.db.get_document(id);
        let title = document
            .as_ref()
            .map(|doc| {
                if doc.title.trim().is_empty() {
                    doc.source_filename.clone()
                } else {
                    doc.title.clone()
                }
            })
            .unwrap_or_else(|_| id.clone());
        // A unique prefix also isolates identical Obsidian note and image names.
        let safe_title: String = title
            .chars()
            .map(|ch| {
                if ch.is_control() || "\\/:*?\"<>|#^[]".contains(ch) {
                    '_'
                } else {
                    ch
                }
            })
            .take(60)
            .collect();
        let folder = format!(
            "{:03}-{}",
            index + 1,
            safe_title.trim().trim_end_matches(['.', ' '])
        );
        let result = match document {
            Ok(_) => {
                prepare_batch_item(deps, downloads, id, &folder, input.format, input.include_source)
                    .await
            }
            Err(_) => Err(AppError::not_found("文献不存在，请刷新书库后重试")),
        };
        match result {
            Ok(prepared) => {
                files.extend(prepared);
                items.push(BatchExportItem {
                    document_id: id.clone(),
                    title,
                    folder: Some(folder),
                    message: None,
                });
            }
            Err(error) => items.push(BatchExportItem {
                document_id: id.clone(),
                title,
                folder: None,
                message: Some(error.to_string()),
            }),
        }
    }
    let exported = items.iter().filter(|item| item.message.is_none()).count();
    let mut view = BatchExportView {
        name: None,
        exported,
        failed: items.len() - exported,
        items,
    };
    if exported == 0 {
        return Ok(view);
    }
    let name = format!("paperloom-export-{:032x}.zip", fastrand::u128(..));
    let path = deps.downloads_dir.join(&name);
    view.name = Some(name);
    let report =
        serde_json::to_vec_pretty(&view).map_err(|error| AppError::internal(error.to_string()))?;
    let generation = deps.download_generation.clone();
    let key = view.name.clone().unwrap();
    generation
        .run(key, move || {
            std::fs::create_dir_all(path.parent().unwrap())?;
            let mut entries: Vec<_> = files
                .iter()
                .map(|file| {
                    (
                        file.name.clone(),
                        match &file.source {
                            PreparedSource::File(path) => ZipSource::File(path),
                            PreparedSource::Archive(path) => ZipSource::Archive(path),
                            PreparedSource::Markdown(text) => ZipSource::Bytes(text.as_bytes()),
                        },
                    )
                })
                .collect();
            entries.push(("export-result.json".to_string(), ZipSource::Bytes(&report)));
            write_zip_atomically(&path, &entries)?;
            Ok(FileDownload::new(path, "application/zip", None))
        })
        .await?;
    Ok(view)
}

fn latest_batch_job(
    deps: &DownloadJobsDeps<'_>,
    document_id: &str,
    format: BatchExportFormat,
) -> Result<JobSnapshot, AppError> {
    let mut ocr = None;
    for id in deps
        .db
        .job_ids_for_document(document_id)?
        .into_iter()
        .rev()
    {
        let Ok(job) = deps.db.get_job(&id) else {
            continue;
        };
        if job.status != JobStatusKind::Succeeded {
            continue;
        }
        let usable = match format {
            BatchExportFormat::Markdown => {
                stored_path(&job, deps.data_root, StoredFile::OcrMarkdown)
                    .is_some_and(|path| path.is_file())
            }
            BatchExportFormat::Obsidian
                if stored_path(&job, deps.data_root, StoredFile::NormalizedDocument)
                    .is_some_and(|p| p.is_file()) =>
            {
                if job.workflow == WorkflowKind::Ocr {
                    ocr.get_or_insert(job);
                    continue;
                }
                stored_path(&job, deps.data_root, StoredFile::TranslationManifest)
                    .is_some_and(|p| p.is_file())
            }
            BatchExportFormat::Obsidian => false,
            _ => job.workflow != WorkflowKind::Ocr,
        };
        if usable {
            return Ok(job);
        }
    }
    if let Some(job) = ocr {
        return Ok(job);
    }
    Err(AppError::not_found(match format {
        BatchExportFormat::Markdown => "尚无可导出的 OCR Markdown，请先完成识别",
        _ => "尚无已完成的译文，请先完成翻译",
    }))
}

async fn prepare_batch_item(
    deps: &DownloadJobsDeps<'_>,
    downloads: &JobDownloads<'_>,
    document_id: &str,
    folder: &str,
    format: BatchExportFormat,
    include_source: bool,
) -> Result<Vec<PreparedFile>, AppError> {
    let file = |name: &str, path| PreparedFile {
        name: format!("{folder}/{name}"),
        source: PreparedSource::File(path),
    };
    if matches!(format, BatchExportFormat::Source) {
        let upload = deps
            .db
            .find_upload_for_document(document_id)?
            .ok_or_else(|| AppError::not_found("原始 PDF 不存在，请重新上传"))?;
        let path = PathBuf::from(upload.stored_path);
        if !path.is_file() {
            return Err(AppError::not_found("原始 PDF 文件已丢失，请重新上传"));
        }
        return Ok(vec![file("source.pdf", path)]);
    }
    let job = latest_batch_job(deps, document_id, format)?;
    match format {
        BatchExportFormat::Translated => {
            let download = downloads
                .open(&job.job_id, JobFile::TranslatedPdf { watermark: true }, Disposition::Attachment)
                .await?;
            Ok(vec![file("translated.pdf", download.path)])
        }
        BatchExportFormat::Comparison => {
            let download = downloads
                .open(&job.job_id, JobFile::SideBySidePdf { watermark: true }, Disposition::Attachment)
                .await?;
            Ok(vec![file("comparison.pdf", download.path)])
        }
        BatchExportFormat::Markdown => {
            let path = stored_path(&job, deps.data_root, StoredFile::OcrMarkdown)
                .ok_or_else(|| AppError::not_found("OCR Markdown 尚未生成"))?;
            let raw = std::fs::read_to_string(path)?;
            let md = super::markdown_export::source_markdown_note(deps, &job, Some(&raw))?;
            let mut files = vec![PreparedFile {
                name: format!("{folder}/full.md"),
                source: PreparedSource::Markdown(md),
            }];
            if let Some(images) = stored_path(&job, deps.data_root, StoredFile::OcrImagesDir) {
                for entry in walkdir::WalkDir::new(&images).follow_links(false) {
                    let entry = entry.map_err(|error| AppError::internal(error.to_string()))?;
                    if !entry.file_type().is_file() {
                        continue;
                    }
                    let relative = entry
                        .path()
                        .strip_prefix(&images)
                        .unwrap()
                        .to_string_lossy()
                        .replace('\\', "/");
                    files.push(file(&format!("images/{relative}"), entry.path().to_owned()));
                }
            }
            Ok(files)
        }
        BatchExportFormat::Obsidian => {
            let base = format!("{folder}-{:x}", md5::compute(document_id));
            let download =
                markdown_export_download_async(deps, &job.job_id, include_source, Some(base))
                    .await?;
            Ok(vec![PreparedFile {
                name: folder.to_owned(),
                source: PreparedSource::Archive(download.path),
            }])
        }
        BatchExportFormat::Source => unreachable!(),
    }
}

pub(crate) fn batch_export_download(
    deps: &DownloadJobsDeps<'_>,
    name: &str,
) -> Result<FileDownload, AppError> {
    let valid = name
        .strip_prefix("paperloom-export-")
        .and_then(|name| name.strip_suffix(".zip"))
        .is_some_and(|id| id.len() == 32 && id.bytes().all(|byte| byte.is_ascii_hexdigit()));
    if !valid {
        return Err(AppError::bad_request("导出文件名无效"));
    }
    let path = deps.downloads_dir.join(name);
    if !path.is_file() {
        return Err(AppError::not_found("导出文件不存在，请重新导出"));
    }
    Ok(FileDownload::new(
        path,
        "application/zip",
        Some(name.to_owned()),
    ))
}
