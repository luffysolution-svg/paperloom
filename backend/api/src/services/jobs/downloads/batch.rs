use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::models::domain::{JobSnapshot, JobStatusKind, WorkflowKind};
use crate::services::artifacts::{write_zip_atomically, ZipSource};
use crate::storage_paths::{resolve_markdown_images_dir, resolve_markdown_path};

use super::{DocumentDownloadKind, FileDownload, JobDownloads};

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
    path: PathBuf,
    archive: bool,
}

impl JobDownloads<'_> {
    pub(crate) async fn export_batch(
        &self,
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
            let document = self.deps.db.get_document(id);
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
                    self.prepare_batch_item(id, &folder, input.format, input.include_source)
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
        let path = self.deps.downloads_dir.join(&name);
        view.name = Some(name);
        let report = serde_json::to_vec_pretty(&view)
            .map_err(|error| AppError::internal(error.to_string()))?;
        let generation = self.deps.download_generation.clone();
        let key = view.name.clone().unwrap();
        generation
            .run(key, move || {
                std::fs::create_dir_all(path.parent().unwrap())?;
                let mut entries: Vec<_> = files
                    .iter()
                    .map(|file| {
                        (
                            file.name.clone(),
                            if file.archive {
                                ZipSource::Archive(&file.path)
                            } else {
                                ZipSource::File(&file.path)
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
        &self,
        document_id: &str,
        format: BatchExportFormat,
    ) -> Result<JobSnapshot, AppError> {
        for id in self
            .deps
            .db
            .job_ids_for_document(document_id)?
            .into_iter()
            .rev()
        {
            let Ok(job) = self.deps.db.get_job(&id) else {
                continue;
            };
            if job.status != JobStatusKind::Succeeded {
                continue;
            }
            let usable = match format {
                BatchExportFormat::Markdown => resolve_markdown_path(&job, self.deps.data_root)
                    .is_some_and(|path| path.is_file()),
                _ => job.workflow != WorkflowKind::Ocr,
            };
            if usable {
                return Ok(job);
            }
        }
        Err(AppError::not_found(match format {
            BatchExportFormat::Markdown => "尚无可导出的 OCR Markdown，请先完成识别",
            _ => "尚无已完成的译文，请先完成翻译",
        }))
    }

    async fn prepare_batch_item(
        &self,
        document_id: &str,
        folder: &str,
        format: BatchExportFormat,
        include_source: bool,
    ) -> Result<Vec<PreparedFile>, AppError> {
        let file = |name: &str, path| PreparedFile {
            name: format!("{folder}/{name}"),
            path,
            archive: false,
        };
        if matches!(format, BatchExportFormat::Source) {
            let upload = self
                .deps
                .db
                .find_upload_for_document(document_id)?
                .ok_or_else(|| AppError::not_found("原始 PDF 不存在，请重新上传"))?;
            let path = PathBuf::from(upload.stored_path);
            if !path.is_file() {
                return Err(AppError::not_found("原始 PDF 文件已丢失，请重新上传"));
            }
            return Ok(vec![file("source.pdf", path)]);
        }
        let job = self.latest_batch_job(document_id, format)?;
        match format {
            BatchExportFormat::Translated => {
                // Reuse the single-document download path and generation controls.
                let download = self
                    .download_job_document(&job.job_id, false, DocumentDownloadKind::OutputPdf)
                    .await?;
                Ok(vec![file("translated.pdf", download.path)])
            }
            BatchExportFormat::Comparison => {
                let download = self.side_by_side_pdf_download(&job.job_id).await?;
                Ok(vec![file("comparison.pdf", download.path)])
            }
            BatchExportFormat::Markdown => {
                let path = resolve_markdown_path(&job, self.deps.data_root)
                    .ok_or_else(|| AppError::not_found("OCR Markdown 尚未生成"))?;
                let mut files = vec![file("full.md", path)];
                if let Some(images) = resolve_markdown_images_dir(&job, self.deps.data_root) {
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
                let download = self
                    .markdown_export_download(&job.job_id, include_source, Some(base))
                    .await?;
                Ok(vec![PreparedFile {
                    name: folder.to_owned(),
                    path: download.path,
                    archive: true,
                }])
            }
            BatchExportFormat::Source => unreachable!(),
        }
    }

    pub(crate) fn batch_export_download(&self, name: &str) -> Result<FileDownload, AppError> {
        let valid = name
            .strip_prefix("paperloom-export-")
            .and_then(|name| name.strip_suffix(".zip"))
            .is_some_and(|id| id.len() == 32 && id.bytes().all(|byte| byte.is_ascii_hexdigit()));
        if !valid {
            return Err(AppError::bad_request("导出文件名无效"));
        }
        let path = self.deps.downloads_dir.join(name);
        if !path.is_file() {
            return Err(AppError::not_found("导出文件不存在，请重新导出"));
        }
        Ok(FileDownload::new(
            path,
            "application/zip",
            Some(name.to_owned()),
        ))
    }
}
