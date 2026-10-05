// 导出 Obsidian 可用的笔记包：译文主笔记 + 原文笔记（可选）+ 按序重命名的图片 + 译文 PDF。
// 设计见 docs/ops/planning/zotero-obsidian-integration.md「F3」「F4」。

mod images;
mod note;
mod ocr_source;
mod render;
mod table_math;
mod vault;
mod zotero_notes;

#[cfg(test)]
mod tests;

use std::path::{Path, PathBuf};

use serde_json::Value;

use crate::db::external_refs::ExternalRefRecord;
use crate::error::AppError;
use crate::models::domain::JobSnapshot;
use crate::services::artifacts::{write_zip_atomically, ZipSource};
use crate::services::derived_artifacts::job_artifacts_dir;
use crate::services::integrations::zotero::{self, ZoteroExtras, ZoteroSource};
use crate::services::jobs::query::load_supported_job;
use crate::storage_paths::{resolve_normalized_document, resolve_output_pdf, resolve_translation_manifest};

use self::images::{rewrite_image_links, ImagePlan, PlannedImage};
use self::note::{NoteMeta, NoteNames};
use self::render::{render_document, tighten_inline_math, RenderContext, TranslationIndex};
use super::{DownloadJobsDeps, FileDownload};

pub(crate) use self::vault::{
    normalize_vault_folder, note_uri_path, ConflictPolicy, VaultWriteOutcome, VaultWriteStatus,
};

struct ExportInputs<'a> {
    normalized: &'a Value,
    translation_pages: &'a [(i64, Vec<Value>)],
    /// OCR 服务产出的 md/full.md；有它时原文笔记与 Markdown 视图逐字一致。
    full_markdown: Option<&'a str>,
    images_dir: Option<&'a Path>,
    meta: &'a NoteMeta,
    has_pdf: bool,
    include_source: bool,
    zotero_extras: Option<&'a ZoteroExtras>,
}

/// 导出时实时读到的 Zotero 批注 / 笔记。
pub(crate) enum ZoteroExtrasState {
    /// 不是从 Zotero 导入的文档。
    NotLinked,
    /// 关联了 Zotero，但这次没读到（Zotero 未运行 / 未挂载数据目录）。
    Unavailable,
    Loaded(ZoteroExtras),
}

impl ZoteroExtrasState {
    fn loaded(&self) -> Option<&ZoteroExtras> {
        match self {
            Self::Loaded(extras) => Some(extras),
            _ => None,
        }
    }
}

fn first_zotero_ref(
    deps: &DownloadJobsDeps<'_>,
    job_id: &str,
) -> Result<Option<ExternalRefRecord>, AppError> {
    let Some(document) = deps
        .db
        .get_document_by_job_id(job_id)
        .map_err(|err| AppError::internal(err.to_string()))?
    else {
        return Ok(None);
    };
    let refs = deps
        .db
        .external_refs_for_document(&document.document_id)
        .map_err(|err| AppError::internal(err.to_string()))?;
    Ok(refs.into_iter().find(|r| r.source == zotero::SOURCE))
}

/// 读取任务所属文档在 Zotero 里的批注与子笔记；读不到时不报错，交给合并保留旧内容。
pub(super) async fn load_zotero_extras(
    deps: &DownloadJobsDeps<'_>,
    job_id: &str,
) -> ZoteroExtrasState {
    let external = match first_zotero_ref(deps, job_id) {
        Ok(Some(external)) => external,
        Ok(None) => return ZoteroExtrasState::NotLinked,
        Err(err) => {
            tracing::warn!("zotero ref lookup failed for {job_id}: {err}");
            return ZoteroExtrasState::NotLinked;
        }
    };
    let fetched = match ZoteroSource::from_env() {
        Ok(source) => {
            source
                .extras(
                    &external.library_id,
                    &external.item_key,
                    &external.attachment_key,
                )
                .await
        }
        Err(err) => Err(err),
    };
    match fetched {
        Ok(extras) => ZoteroExtrasState::Loaded(extras),
        Err(err) => {
            tracing::warn!("zotero annotations unavailable for {job_id}: {err}");
            ZoteroExtrasState::Unavailable
        }
    }
}

struct ExportedNotes {
    names: NoteNames,
    translated: String,
    source: Option<String>,
    images: Vec<PlannedImage>,
}

fn build_notes(inputs: &ExportInputs<'_>, names: NoteNames) -> ExportedNotes {
    let translations = TranslationIndex::from_pages(inputs.translation_pages);
    let exists = |rel: &str| inputs.images_dir.is_some_and(|dir| dir.join(rel).is_file());
    let mut plan = ImagePlan::default();

    // 先渲染译文：图片编号以译文笔记中的出现顺序为准。
    let translated_body = render_document(
        inputs.normalized,
        &RenderContext {
            images_dir: inputs.images_dir,
            translations: Some(&translations),
        },
        &mut plan,
    );
    let translated_body =
        rewrite_image_links(&translated_body, &mut plan, &names.assets_dir, &exists);

    let source = inputs.include_source.then(|| {
        let body = match inputs.full_markdown.filter(|text| !text.trim().is_empty()) {
            Some(full) => tighten_inline_math(full),
            None => render_document(
                inputs.normalized,
                &RenderContext {
                    images_dir: inputs.images_dir,
                    translations: None,
                },
                &mut plan,
            ),
        };
        let body = table_math::normalize_table_math(&body);
        let body = rewrite_image_links(&body, &mut plan, &names.assets_dir, &exists);
        note::source_note(inputs.meta, &names, &body)
    });

    let zotero_section = match (inputs.zotero_extras, &inputs.meta.zotero) {
        (Some(extras), Some(z)) => zotero_notes::zotero_section(extras, &z.pdf_uri),
        _ => None,
    };
    let translated = note::translated_note(
        inputs.meta,
        &names,
        &translated_body,
        source.is_some(),
        inputs.has_pdf,
        zotero_section.as_deref(),
    );
    ExportedNotes {
        images: plan.entries().to_vec(),
        names,
        translated,
        source,
    }
}

/// 一个任务导出所需的全部原料（与笔记名无关，可按不同笔记名多次组装）。
struct ExportSource {
    job: JobSnapshot,
    normalized: Value,
    translation_pages: Vec<(i64, Vec<Value>)>,
    full_markdown: Option<String>,
    images_dir: Option<PathBuf>,
    pdf: Option<PathBuf>,
    meta: NoteMeta,
    zotero_extras: ZoteroExtrasState,
}

/// 组装好的笔记包：两篇笔记 + 资源目录里的文件（目录内文件名 → 来源路径）。
struct NoteBundle {
    names: NoteNames,
    translated: String,
    source: Option<String>,
    assets: Vec<(String, PathBuf)>,
}

impl ExportSource {
    fn load(
        deps: &DownloadJobsDeps<'_>,
        job_id: &str,
        zotero_extras: ZoteroExtrasState,
    ) -> Result<Self, AppError> {
        let job = load_supported_job(deps.db, deps.data_root, job_id)?;
        let normalized_path = resolve_normalized_document(&job, deps.data_root)
            .filter(|path| path.is_file())
            .ok_or_else(|| {
                AppError::not_found(format!("normalized document not ready: {job_id}"))
            })?;
        let manifest_ready =
            resolve_translation_manifest(&job, deps.data_root).is_some_and(|p| p.is_file());
        if !manifest_ready {
            return Err(AppError::not_found(format!(
                "translation not ready: {job_id}"
            )));
        }
        let normalized: Value =
            serde_json::from_str(&std::fs::read_to_string(&normalized_path)?)
                .map_err(|err| AppError::internal(format!("parse normalized document: {err}")))?;
        let translation_pages =
            crate::services::jobs::reader_regions::load_translation_pages(deps.data_root, &job)?;
        let (full_markdown, images_dir) = ocr_source::markdown_sources(deps, &job);
        let full_markdown = full_markdown
            .map(std::fs::read_to_string)
            .transpose()?;
        let document = deps
            .db
            .get_document_by_job_id(&job.job_id)
            .map_err(|err| AppError::internal(err.to_string()))?;
        let mut meta = NoteMeta::from_document(
            document.as_ref(),
            &job.job_id,
            &job.request_payload.ocr.language,
            deps.public_base_url,
        );
        if let Some(document) = &document {
            let external = deps
                .db
                .external_refs_for_document(&document.document_id)
                .map_err(|err| AppError::internal(err.to_string()))?;
            if let Some(external) = external.first() {
                meta = meta.with_zotero(external);
            }
        }
        Ok(Self {
            meta,
            images_dir,
            pdf: resolve_output_pdf(&job, deps.data_root).filter(|path| path.is_file()),
            job,
            normalized,
            translation_pages,
            full_markdown,
            zotero_extras,
        })
    }

    fn default_base_name(&self) -> String {
        self.meta.note_name()
    }

    fn bundle(&self, base: &str, include_source: bool) -> NoteBundle {
        let names = NoteNames::new(base.to_string(), &self.meta.source_lang);
        let exported = build_notes(
            &ExportInputs {
                normalized: &self.normalized,
                translation_pages: &self.translation_pages,
                full_markdown: self.full_markdown.as_deref(),
                images_dir: self.images_dir.as_deref(),
                meta: &self.meta,
                has_pdf: self.pdf.is_some(),
                include_source,
                zotero_extras: self.zotero_extras.loaded(),
            },
            names,
        );
        let mut assets: Vec<(String, PathBuf)> = exported
            .images
            .iter()
            .filter_map(|image| {
                let dir = self.images_dir.as_deref()?;
                Some((image.file_name.clone(), dir.join(&image.source_rel)))
            })
            .collect();
        if let Some(pdf) = &self.pdf {
            assets.push((exported.names.translated_pdf.clone(), pdf.clone()));
        }
        NoteBundle {
            names: exported.names,
            translated: exported.translated,
            source: exported.source,
            assets,
        }
    }
}

pub(super) fn markdown_export_download(
    deps: &DownloadJobsDeps<'_>,
    job_id: &str,
    include_source: bool,
    zotero_extras: ZoteroExtrasState,
) -> Result<FileDownload, AppError> {
    let source = ExportSource::load(deps, job_id, zotero_extras)?;
    let bundle = source.bundle(&source.default_base_name(), include_source);
    let names = &bundle.names;
    let mut entries: Vec<(String, ZipSource<'_>)> = vec![(
        format!("{}.md", names.base),
        ZipSource::Bytes(bundle.translated.as_bytes()),
    )];
    if let Some(note) = &bundle.source {
        entries.push((
            format!("{}.md", names.source_note),
            ZipSource::Bytes(note.as_bytes()),
        ));
    }
    for (file_name, path) in &bundle.assets {
        entries.push((
            format!("{}/{file_name}", names.assets_dir),
            ZipSource::File(path),
        ));
    }

    let zip_path = job_artifacts_dir(deps.data_root, &source.job)?
        .join(format!("{}-obsidian.zip", source.job.job_id));
    write_zip_atomically(&zip_path, &entries)?;
    // Content-Disposition 直接拼文件名，非 ASCII 会失败；中文笔记名只体现在包内。
    let download_name = if names.base.is_ascii() {
        format!("{}.zip", names.base)
    } else {
        format!("paperloom-{}.zip", source.job.job_id)
    };
    Ok(FileDownload::new(
        zip_path,
        "application/zip",
        Some(download_name),
    ))
}

/// folder 后接 Zotero 分类路径；每级按文件名规则清洗，清洗后为空的级别跳过。
fn folder_with_collection(folder: &str, collection_path: &str) -> String {
    std::iter::once(folder.to_string())
        .chain(collection_path.split('/').map(note::sanitize_file_name))
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("/")
}

/// 写入 Obsidian 库。vault_root 由调用方从已发现的库中解析，这里不接受任意路径。
pub(super) fn obsidian_vault_export(
    deps: &DownloadJobsDeps<'_>,
    job_id: &str,
    vault_root: &Path,
    folder: &str,
    include_source: bool,
    by_collection: bool,
    policy: ConflictPolicy,
    zotero_extras: ZoteroExtrasState,
) -> Result<VaultWriteOutcome, AppError> {
    let source = ExportSource::load(deps, job_id, zotero_extras)?;
    let folder = match source.meta.zotero.as_ref().filter(|_| by_collection) {
        Some(zotero) => folder_with_collection(folder, &zotero.collection_path),
        None => folder.to_string(),
    };
    vault::write_to_vault(&source, vault_root, &folder, include_source, policy)
}
