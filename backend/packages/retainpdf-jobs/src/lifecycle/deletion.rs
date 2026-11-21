//! 删一个任务（`DELETE /api/v1/jobs/:job_id`）：任务本身 + 它的 `-ocr` 子任务，书（文档行、上传、原文）留着。
//!
//! 2026-10-19 从书库包的书架删除（`DELETE /library/books/:job_id`）挪过来；书架删除那个旧地址 2026-10-22 删了。
//! 整本删除（`DELETE /documents/:id`）用这里的
//! 校验和删目录。强删前先取消 runner 由路由经任务门面 `cancel_before_delete` 做，再调 [`JobDeletion::delete`]。

use std::path::{Path, PathBuf};

use retainpdf_api_base::error::AppError;
use retainpdf_api_base::job_loading::load_job_or_404;
use retainpdf_core::models::domain::{ocr_child_job_id, JobSnapshot, JobStatusKind, WorkflowKind};
use retainpdf_data::db::Db;

use crate::lifecycle::managed_credential_gc::cleanup_deleted_job_credentials;
use crate::views::JobDeleteResultView;

/// 删任务要动的库和目录。
pub struct JobDeletion<'a> {
    db: &'a Db,
    data_root: &'a Path,
    output_root: &'a Path,
    downloads_dir: &'a Path,
}

impl<'a> JobDeletion<'a> {
    pub fn new(db: &'a Db, data_root: &'a Path, output_root: &'a Path, downloads_dir: &'a Path) -> Self {
        Self {
            db,
            data_root,
            output_root,
            downloads_dir,
        }
    }

    /// 删这个任务会动到的任务编号（它本身 + `-ocr` 子任务），强删前拿去取消。找不到 → 404。
    pub fn job_ids(&self, job_id: &str) -> Result<Vec<String>, AppError> {
        let job = load_job_or_404(self.db, job_id)?;
        self.scope_ids(job)
    }

    /// 已经读出来的任务的删除范围编号。
    fn scope_ids(&self, job: JobSnapshot) -> Result<Vec<String>, AppError> {
        Ok(self.scope(job)?.into_iter().map(|job| job.job_id.clone()).collect())
    }

    /// 删一个任务（任何工作流，OCR 任务也行）。找不到 → 404。
    pub fn delete(&self, job_id: &str, force: bool) -> Result<JobDeleteResultView, AppError> {
        let job = load_job_or_404(self.db, job_id)?;
        self.delete_loaded(job, force)
    }

    /// 删一个已经读出来的任务和它的 `-ocr` 子任务。
    ///
    /// 不带 `force`：范围内有排队 / 运行中的任务 409；别的任务还要用范围内任务的产物 409 + `job_has_dependents`。
    fn delete_loaded(&self, job: JobSnapshot, force: bool) -> Result<JobDeleteResultView, AppError> {
        let job_id = job.job_id.clone();
        let jobs = self.scope(job)?;
        for job in &jobs {
            ensure_deletable(job, force)?;
        }
        ensure_no_dependents(self.db, &jobs, force)?;

        // 删 job 前先记住它所属文档,删后 reconcile 其 active_job_id,
        // 否则文档行会悬空指向已删 job,前端 join 不到而渲染成僵尸卡。
        // 读不出来是 500，不能当成「这个任务不属于任何书」悄悄跳过对账。
        let affected_document = self
            .db
            .get_document_by_job_id(&job_id)?
            .map(|doc| doc.document_id);

        // 先一次性提交行删除,再动磁盘。逐个 `remove_job_files` + `delete_job`
        // 自动提交时,book job 删完而 -ocr 子 job 那步失败就留下一个没有父任务的
        // 孤儿行,没有任何自动修复路径。反过来,事务提交后文件删失败只是留下可
        // 重删的孤儿目录。
        let job_ids: Vec<String> = jobs.iter().map(|job| job.job_id.clone()).collect();
        self.db.delete_jobs(&job_ids)?;

        let mut removed_paths = Vec::new();
        let mut removed_child_jobs = Vec::new();
        for job in &jobs {
            removed_paths.extend(self.remove_job_files(&job.job_id)?);
            if job.job_id != job_id {
                removed_child_jobs.push(job.job_id.clone());
            }
        }
        cleanup_deleted_job_credentials(self.db, self.data_root, &jobs);

        if let Some(document_id) = affected_document {
            // reconcile 失败不阻断删除(job 已删),仅记录——文档最坏保持悬空,
            // 下次任一 job 删除或启动回填会再修。
            if let Err(error) = self.db.reconcile_document_active_job(&document_id) {
                eprintln!(
                    "[jobs] reconcile active_job for {document_id} after deleting {job_id} failed: {error}"
                );
            }
            // 被删任务的全文索引行已在删除事务里清掉;它独占的页之外,别的成功任务覆盖的页
            // 要按剩下的任务重建回来。索引是可重建的派生数据,失败只记日志。
            if let Err(error) = self.db.rebuild_document_fts(&document_id) {
                eprintln!(
                    "[jobs] rebuild fts for {document_id} after deleting {job_id} failed: {error}"
                );
            }
        }

        Ok(JobDeleteResultView {
            deleted: true,
            job_id,
            removed_paths,
            removed_child_jobs,
        })
    }

    /// 删一个任务的输出目录和打包下载，返回删掉的路径。
    pub fn remove_job_files(&self, job_id: &str) -> Result<Vec<String>, AppError> {
        let mut removed = Vec::new();
        remove_path_if_exists(self.output_root.join(job_id), &mut removed)?;
        remove_path_if_exists(
            self.downloads_dir.join(format!("{job_id}.zip")),
            &mut removed,
        )?;
        Ok(removed)
    }

    /// 删除范围：任务本身 + 它的 `-ocr` 子任务（有的话）。
    fn scope(&self, job: JobSnapshot) -> Result<Vec<JobSnapshot>, AppError> {
        let child_id = ocr_child_job_id(&job.job_id);
        let mut jobs = vec![job];
        if let Some(child) = find_job(self.db, &child_id)? {
            jobs.push(child);
        }
        Ok(jobs)
    }
}

/// 按编号找一个可能不存在的任务：没有这条记录是 `None`；有记录但读不出来是 500，
/// 不能当成「没有」跳过（删除时跳过一个在跑的任务，就绕过了 `ensure_deletable`）。
pub fn find_job(db: &Db, job_id: &str) -> Result<Option<JobSnapshot>, AppError> {
    match db.get_job(job_id) {
        Ok(job) => Ok(Some(job)),
        Err(error) if AppError::is_record_missing(&error) => Ok(None),
        Err(error) => Err(error.into()),
    }
}

/// 名下还有排队 / 在跑的任务：409 + `job_active`（和任务操作同一个原因），带 `force=true` 先取消再删。
pub fn ensure_deletable(job: &JobSnapshot, force: bool) -> Result<(), AppError> {
    if !force && matches!(job.status, JobStatusKind::Queued | JobStatusKind::Running) {
        return Err(AppError::conflict_because("job_active", format!(
            "book is {:?}; pass force=true to delete it",
            job.status
        )));
    }
    Ok(())
}

/// 删除范围之外的任务还要用范围内任务的产物时，不带 `force` 拒绝(409 + `job_has_dependents`)。
///
/// 典型：重新排版产生的 render 任务，译文目录就是源任务的 `translated/`。源任务一删，
/// 这本书的合并阅读(`/documents/:id/reading`)会因为找不到译文目录整个 500。
/// 单删 OCR 子任务 `P-ocr` 而父任务 `P` 还在，也算 `P` 在用它（父任务的 OCR 产物、事件都在子任务里）。
pub fn ensure_no_dependents(db: &Db, jobs: &[JobSnapshot], force: bool) -> Result<(), AppError> {
    if force {
        return Ok(());
    }
    let ids: Vec<String> = jobs.iter().map(|job| job.job_id.clone()).collect();
    let mut dependents = db.jobs_depending_on(&ids)?;
    for job in jobs.iter().filter(|job| job.workflow == WorkflowKind::Ocr) {
        let Some(parent) = job.job_id.strip_suffix("-ocr") else {
            continue;
        };
        if !ids.iter().any(|id| id == parent) && db.job_status(parent)?.is_some() {
            dependents.push((parent.to_string(), job.job_id.clone()));
        }
    }
    if dependents.is_empty() {
        return Ok(());
    }
    let list = dependents
        .iter()
        .map(|(dependent, target)| format!("{dependent} (uses {target})"))
        .collect::<Vec<_>>()
        .join(", ");
    Err(AppError::conflict_because(
        "job_has_dependents",
        format!("other jobs still use this job's artifacts: {list}; delete them first or pass force=true"),
    ))
}

pub fn remove_path_if_exists(path: PathBuf, removed: &mut Vec<String>) -> Result<(), AppError> {
    if !path.exists() {
        return Ok(());
    }
    if path.is_dir() {
        std::fs::remove_dir_all(&path)?;
    } else {
        std::fs::remove_file(&path)?;
    }
    removed.push(path.to_string_lossy().to_string());
    Ok(())
}
