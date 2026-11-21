//! 没有上传记录的任务（从 `source_url` 建的、早年没登记上传的），把它的原文 PDF 登记成一本书。
//!
//! 书的编号就是原文 PDF 的 sha256。有上传记录的任务建任务时就归属到书了（`link_job_to_document`），
//! 从别的任务派生的任务继承源任务的书；剩下这些原文是流水线自己下载的，没人给它记上传，
//! 所以一直没有书：书架、文件清单里就没有原文的地址。
//!
//! 登记的做法和上传一样：原文复制进上传目录、记一条上传和书，任务归属到这本书。复制而不是指向任务目录，
//! 是因为删任务会删任务目录，书的原文不能跟着没了。已经有同样内容的上传（同一个 PDF 别处传过）就直接归属过去。
//!
//! 任务结束时（`lifecycle::maintain_document_after_terminal`）和 rust_api 启动时（老任务）各调一次。

use std::path::Path;

use anyhow::{Context, Result};
use retainpdf_core::config::AppConfig;
use retainpdf_core::models::domain::{now_iso, JobSnapshot, UploadRecord};
use retainpdf_core::storage_paths::resolve_source_pdf;
use retainpdf_data::db::documents::sha256_hex;
use retainpdf_data::db::{Db, OwnedKind};

/// 把这个任务归属到它原文 PDF 那本书，返回书的编号。已经有书就原样返回；没有原文文件就是 None。
pub fn adopt_job_source_document(config: &AppConfig, db: &Db, job: &JobSnapshot) -> Result<Option<String>> {
    if let Some(document_id) = db.document_id_for_job(&job.job_id)? {
        return Ok(Some(document_id));
    }
    let Some(source) = resolve_source_pdf(job, &config.data_root).filter(|path| path.is_file()) else {
        return Ok(None);
    };
    let bytes = std::fs::read(&source).with_context(|| format!("read source pdf {}", source.display()))?;
    let document_id = sha256_hex(&bytes);
    if let Some(upload) = db.upload_with_content_hash(&document_id)? {
        // 同一个 PDF 已经有上传：书已经在了（没有就按这条上传补上），任务归属过去。
        db.upsert_document_from_upload(&upload)?;
        db.set_job_document_id(&job.job_id, &document_id)?;
        return Ok(Some(document_id));
    }
    let upload = copy_into_uploads(&config.uploads_dir, job, &source, &bytes, &document_id)?;
    let owner = db.resource_owner(OwnedKind::Job, &job.job_id)?;
    match owner.as_deref() {
        Some(owner) => db.save_upload_with_document_for(&upload, owner)?,
        None => db.save_upload_with_document(&upload)?,
    }
    db.set_job_document_id(&job.job_id, &document_id)?;
    Ok(Some(document_id))
}

/// 启动时把还没归属到书的老任务过一遍。单个任务失败只记日志，不挡启动。返回这次归属了几个。
pub fn adopt_unlinked_job_sources(config: &AppConfig, db: &Db) -> Result<usize> {
    let mut adopted = 0;
    for job_id in db.jobs_without_document()? {
        let job = match db.get_job(&job_id) {
            Ok(job) => job,
            Err(error) => {
                tracing::warn!("library: skip unlinked job {job_id}: {error}");
                continue;
            }
        };
        match adopt_job_source_document(config, db, &job) {
            Ok(Some(_)) => adopted += 1,
            Ok(None) => {}
            Err(error) => tracing::warn!("library: adopt source pdf of job {job_id} failed: {error}"),
        }
    }
    Ok(adopted)
}

fn copy_into_uploads(
    uploads_dir: &Path,
    job: &JobSnapshot,
    source: &Path,
    bytes: &[u8],
    document_id: &str,
) -> Result<UploadRecord> {
    let upload_id = retainpdf_core::models::domain::build_job_id();
    let file_name = source
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .unwrap_or("source.pdf")
        .to_string();
    let upload_dir = uploads_dir.join(&upload_id);
    std::fs::create_dir_all(&upload_dir)?;
    let stored = upload_dir.join(&file_name);
    std::fs::write(&stored, bytes)?;
    // 上传记录里的页数是书的页数（存 0 也算数，不再换别的来源），所以要真数一遍。
    let page_count = lopdf::Document::load_mem(bytes)
        .map(|document| document.get_pages().len() as u32)
        .unwrap_or(0);
    Ok(UploadRecord {
        upload_id,
        filename: file_name,
        stored_path: stored.to_string_lossy().into_owned(),
        bytes: bytes.len() as u64,
        page_count,
        // 任务什么时候建的，这本书就什么时候进的书架。
        uploaded_at: if job.created_at.is_empty() { now_iso() } else { job.created_at.clone() },
        developer_mode: false,
        content_hash: document_id.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::job_runner::test_support::{temp_root, test_app_config};
    use retainpdf_core::models::domain::JobArtifacts;
    use lopdf::dictionary;
    use retainpdf_core::models::request::CreateJobInput;

    /// 两页的最小 PDF（只有页面框）。
    fn two_page_pdf() -> Vec<u8> {
        let mut document = lopdf::Document::with_version("1.5");
        let pages_id = document.new_object_id();
        let kids: Vec<lopdf::Object> = (0..2)
            .map(|_| {
                document
                    .add_object(dictionary! {
                        "Type" => "Page",
                        "Parent" => pages_id,
                        "MediaBox" => vec![0.into(), 0.into(), 200.into(), 280.into()],
                    })
                    .into()
            })
            .collect();
        document.objects.insert(
            pages_id,
            lopdf::Object::Dictionary(dictionary! { "Type" => "Pages", "Kids" => kids, "Count" => 2 }),
        );
        let catalog = document.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
        document.trailer.set("Root", catalog);
        let mut bytes = Vec::new();
        document.save_to(&mut bytes).expect("save pdf");
        bytes
    }

    fn setup(name: &str) -> (AppConfig, Db) {
        let config = test_app_config(&temp_root(name));
        let db = Db::new(config.jobs_db_path.clone(), config.data_root.clone());
        db.init().expect("init db");
        (config, db)
    }

    /// 原文是流水线自己下载的任务（没有 upload_id）：原文落在任务目录里。
    fn url_job(config: &AppConfig, db: &Db, job_id: &str, pdf: Option<&[u8]>) -> JobSnapshot {
        let mut input = CreateJobInput::default();
        input.source.source_url = "https://example.test/paper.pdf".into();
        let mut job = JobSnapshot::new(job_id.into(), input, vec![]);
        let source_dir = config.output_root.join(job_id).join("source");
        std::fs::create_dir_all(&source_dir).unwrap();
        if let Some(pdf) = pdf {
            std::fs::write(source_dir.join("paper.pdf"), pdf).unwrap();
        }
        job.artifacts = Some(JobArtifacts {
            job_root: Some(format!("jobs/{job_id}")),
            source_pdf: Some(format!("jobs/{job_id}/source/paper.pdf")),
            ..Default::default()
        });
        db.save_job(&job).unwrap();
        job
    }

    #[test]
    fn a_downloaded_source_becomes_a_book_with_its_own_copy() {
        let (config, db) = setup("adopt-new");
        let pdf = two_page_pdf();
        let job = url_job(&config, &db, "job-url", Some(&pdf));

        let document_id = adopt_job_source_document(&config, &db, &job).unwrap().expect("document");
        assert_eq!(document_id, sha256_hex(&pdf));
        assert_eq!(db.document_id_for_job("job-url").unwrap().as_deref(), Some(document_id.as_str()));
        let upload = db.upload_with_content_hash(&document_id).unwrap().expect("upload");
        assert_eq!(upload.page_count, 2, "页数是书的页数，要真数");
        assert_eq!(upload.filename, "paper.pdf");
        // 原文复制进了上传目录：删任务目录不影响书的原文。
        assert!(Path::new(&upload.stored_path).starts_with(&config.uploads_dir));
        std::fs::remove_dir_all(config.output_root.join("job-url")).unwrap();
        assert_eq!(std::fs::read(&upload.stored_path).unwrap(), pdf);
        // 再跑一次是空操作。
        assert_eq!(adopt_job_source_document(&config, &db, &job).unwrap(), Some(document_id));
        assert!(db.jobs_without_document().unwrap().is_empty());
    }

    #[test]
    fn the_same_pdf_already_uploaded_is_reused_without_another_copy() {
        let (config, db) = setup("adopt-existing");
        let pdf = two_page_pdf();
        let first = url_job(&config, &db, "job-first", Some(&pdf));
        let document_id = adopt_job_source_document(&config, &db, &first).unwrap().unwrap();
        let second = url_job(&config, &db, "job-second", Some(&pdf));

        assert_eq!(adopt_job_source_document(&config, &db, &second).unwrap(), Some(document_id.clone()));
        let uploads = std::fs::read_dir(&config.uploads_dir).unwrap().count();
        assert_eq!(uploads, 1, "同一个 PDF 只复制一份");
        assert_eq!(db.document_id_for_job("job-second").unwrap(), Some(document_id));
    }

    #[test]
    fn jobs_without_a_source_file_stay_unlinked_and_startup_skips_them() {
        let (config, db) = setup("adopt-missing");
        url_job(&config, &db, "job-no-source", None);
        let pdf = two_page_pdf();
        url_job(&config, &db, "job-with-source", Some(&pdf));

        assert_eq!(adopt_unlinked_job_sources(&config, &db).unwrap(), 1);
        assert_eq!(db.jobs_without_document().unwrap(), vec!["job-no-source".to_string()]);
    }
}
