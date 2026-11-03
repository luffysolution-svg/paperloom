//! Portable library migration and manual WebDAV backups.

mod archive;
mod progress;
mod restore;
mod webdav;

use std::fs;
use std::path::PathBuf;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use axum::body::Bytes;
use futures_util::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::io::AsyncWriteExt;
use tokio::sync::{Mutex, OwnedRwLockWriteGuard, RwLock};

use crate::config::AppConfig;
use crate::db::Db;
use crate::error::AppError;

pub(crate) use restore::apply_pending;
pub(crate) use webdav::{RemoteItem, SettingsInput, SettingsView};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub(crate) struct BackupItem {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub bytes: u64,
    pub file_count: usize,
    pub includes_credentials: bool,
}

#[derive(Serialize)]
pub(crate) struct BackupStatus {
    pub items: Vec<BackupItem>,
    pub pending_restore: bool,
    pub last_restore: Option<serde_json::Value>,
    pub restore_supported: bool,
    pub restore_hint: Option<String>,
    pub active_tasks: u64,
    pub data_root: String,
    pub backup_dir: String,
    pub webdav: SettingsView,
    pub operation: Option<progress::BackupProgress>,
}

#[derive(Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct CreateBackupInput {
    #[serde(default)]
    pub include_credentials: bool,
    #[serde(default)]
    pub frontend_config: Option<serde_json::Value>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct RestoreInput {
    pub name: String,
    pub confirm_replace: bool,
}

#[derive(Serialize)]
pub(crate) struct RestoreView {
    pub restart_required: bool,
    pub file_count: usize,
    pub includes_credentials: bool,
}

struct WorkDir(PathBuf);
impl Drop for WorkDir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

pub(crate) struct BackupService {
    config: Arc<AppConfig>,
    db: Arc<Db>,
    operation: Mutex<()>,
    pub gate: Arc<RwLock<()>>,
    pub pending: AtomicBool,
    progress: progress::Progress,
}

async fn blocking<T: Send + 'static>(
    work: impl FnOnce() -> Result<T, AppError> + Send + 'static,
) -> Result<T, AppError> {
    tokio::task::spawn_blocking(work)
        .await
        .map_err(|error| AppError::internal(format!("备份操作未完成：{error}")))?
}

async fn detached<T: Send + 'static>(
    work: impl std::future::Future<Output = Result<T, AppError>> + Send + 'static,
) -> Result<T, AppError> {
    tokio::spawn(work)
        .await
        .map_err(|error| AppError::internal(format!("备份操作中断：{error}")))?
}

impl BackupService {
    pub fn new(config: Arc<AppConfig>, db: Arc<Db>) -> Self {
        let pending = config.data_root.join("backups/pending").exists();
        Self {
            config,
            db,
            operation: Mutex::new(()),
            gate: Arc::default(),
            pending: AtomicBool::new(pending),
            progress: progress::Progress::default(),
        }
    }

    fn directory(&self) -> PathBuf {
        self.config.data_root.join("backups")
    }

    fn work_dir(&self) -> Result<WorkDir, AppError> {
        let path = self
            .directory()
            .join(format!(".work-{:016x}", fastrand::u64(..)));
        fs::create_dir_all(&path)?;
        Ok(WorkDir(path))
    }

    fn idle_gate(&self) -> Result<OwnedRwLockWriteGuard<()>, AppError> {
        let guard = self
            .gate
            .clone()
            .try_write_owned()
            .map_err(|_| AppError::conflict("请等待正在上传、问答或编辑的操作完成后重试"))?;
        if self.pending.load(Ordering::SeqCst) {
            return Err(AppError::conflict(
                "已有待恢复的迁移包，请重启应用或先取消恢复",
            ));
        }
        if self.db.backup_blockers()? != 0 {
            return Err(AppError::conflict(
                "请等待排队、翻译和文档操作完成，或取消这些任务后再备份／恢复",
            ));
        }
        restore::check_layout(&self.config)
            .map_err(|error| AppError::conflict(error.to_string()))?;
        Ok(guard)
    }

    fn settings(&self) -> Result<webdav::Settings, AppError> {
        let path = self.directory().join("webdav.json");
        match fs::read(path) {
            Ok(bytes) => serde_json::from_slice(&bytes)
                .map_err(|_| AppError::internal("WebDAV 配置损坏，请重新设置")),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                Ok(webdav::Settings::default())
            }
            Err(error) => Err(error.into()),
        }
    }

    pub async fn status(self: &Arc<Self>) -> Result<BackupStatus, AppError> {
        let this = self.clone();
        blocking(move || {
            let mut items = Vec::new();
            if this.directory().exists() {
                for entry in fs::read_dir(this.directory())? {
                    let path = entry?.path();
                    if path.extension().is_some_and(|ext| ext == "json")
                        && path.file_name().is_some_and(|name| {
                            name.to_string_lossy().starts_with("paperloom-backup-")
                        })
                    {
                        if let Ok(item) = serde_json::from_slice::<BackupItem>(&fs::read(path)?) {
                            if this.download_path(&item.name).is_ok() {
                                items.push(item);
                            }
                        }
                    }
                }
            }
            items.sort_by(|a, b| b.created_at.cmp(&a.created_at));
            let restore_hint = restore::check_layout(&this.config)
                .and_then(|_| restore::check_runtime(&this.config))
                .err()
                .map(|error| error.to_string());
            let last_restore = match fs::read(this.directory().join("last-restore.json")) {
                Ok(bytes) => Some(
                    serde_json::from_slice(&bytes)
                        .map_err(|_| AppError::internal("恢复记录损坏"))?,
                ),
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
                Err(error) => return Err(error.into()),
            };
            Ok(BackupStatus {
                items,
                pending_restore: this.pending.load(Ordering::SeqCst),
                last_restore,
                restore_supported: restore_hint.is_none(),
                restore_hint,
                active_tasks: this.db.backup_blockers()?,
                data_root: this.config.data_root.to_string_lossy().into_owned(),
                backup_dir: this.directory().to_string_lossy().into_owned(),
                webdav: this.settings()?.view(),
                operation: this.progress.snapshot(),
            })
        })
        .await
    }

    fn create_sync(&self, input: CreateBackupInput) -> Result<BackupItem, AppError> {
        let work = self.work_dir()?;
        let id = format!(
            "{}-{:016x}",
            chrono::Utc::now().format("%Y%m%dT%H%M%SZ"),
            fastrand::u64(..)
        );
        let name = format!("paperloom-backup-{id}.zip");
        let path = work.0.join("package.zip");
        let manifest = archive::create(
            &self.config.data_root,
            &self.db,
            &work.0,
            &path,
            input.include_credentials,
            input.frontend_config.as_ref(),
            &self.progress,
        )?;
        let item = BackupItem {
            id,
            name: name.clone(),
            created_at: manifest.created_at,
            bytes: fs::metadata(&path)?.len(),
            file_count: manifest.files.len(),
            includes_credentials: input.include_credentials,
        };
        fs::rename(path, self.directory().join(&name))?;
        archive::write_json(&self.directory().join(name.replace(".zip", ".json")), &item)?;
        Ok(item)
    }

    pub async fn create(
        self: Arc<Self>,
        input: CreateBackupInput,
        remote: bool,
    ) -> Result<BackupItem, AppError> {
        detached(async move {
            let _operation = self.operation.lock().await;
            let _gate = self.idle_gate()?;
            self.progress
                .track("pack", async {
                    let this = self.clone();
                    let item = blocking(move || this.create_sync(input)).await?;
                    if remote {
                        if let Err(error) = webdav::upload(
                            &self.settings()?,
                            &self.download_path(&item.name)?,
                            &item.name,
                            self.progress.clone(),
                        )
                        .await
                        {
                            return Err(AppError::bad_gateway(format!(
                                "云端上传未完成，本地迁移包已保留，可在本地列表中下载。{error}"
                            )));
                        }
                    }
                    Ok(item)
                })
                .await
        })
        .await
    }

    pub fn download_path(&self, name: &str) -> Result<PathBuf, AppError> {
        webdav::validate_name(name)?;
        let path = self.directory().join(name);
        if !path.is_file() || path.symlink_metadata()?.file_type().is_symlink() {
            return Err(AppError::not_found("备份文件不存在"));
        }
        Ok(path)
    }

    pub async fn delete(self: Arc<Self>, name: String, remote: bool) -> Result<(), AppError> {
        webdav::validate_name(&name)?;
        detached(async move {
            let _operation = self.operation.lock().await;
            if self.pending.load(Ordering::SeqCst) {
                return Err(AppError::conflict("请先完成或取消待恢复操作，再删除备份"));
            }
            if remote {
                webdav::delete(&self.settings()?, &name).await?;
            } else {
                let this = self.clone();
                blocking(move || {
                    fs::remove_file(this.download_path(&name)?)?;
                    match fs::remove_file(this.directory().join(name.replace(".zip", ".json"))) {
                        Ok(()) => Ok(()),
                        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
                        Err(error) => Err(error.into()),
                    }
                })
                .await?;
            }
            Ok(())
        })
        .await
    }

    fn stage_sync(&self, source: PathBuf, work: WorkDir) -> Result<RestoreView, AppError> {
        restore::check_runtime(&self.config)
            .map_err(|error| AppError::conflict(error.to_string()))?;
        let extracted = work.0.join("extracted");
        let manifest = archive::extract(
            &source,
            &extracted,
            self.db.backup_schema_version()?,
            &self.progress,
        )
        .map_err(|error| AppError::bad_request(format!("迁移包校验失败：{error}")))?;
        if self.db.backup_blockers()? != 0 {
            return Err(AppError::conflict("有任务正在运行，请稍后重试恢复"));
        }
        fs::rename(extracted, self.directory().join("pending"))?;
        self.pending.store(true, Ordering::SeqCst);
        Ok(RestoreView {
            restart_required: true,
            file_count: manifest.files.len(),
            includes_credentials: manifest.includes_credentials,
        })
    }

    pub async fn import<S, E>(
        self: Arc<Self>,
        stream: S,
        total: Option<u64>,
    ) -> Result<RestoreView, AppError>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Send + 'static,
    {
        detached(async move {
            let _operation = self.operation.lock().await;
            let _gate = self.idle_gate()?;
            self.progress
                .track("import", async {
                    self.progress.phase("import", total, "bytes");
                    restore::check_runtime(&self.config)
                        .map_err(|error| AppError::conflict(error.to_string()))?;
                    let work = self.work_dir()?;
                    let path = work.0.join("upload.zip");
                    let mut file = tokio::fs::File::from_std(archive::private_file(&path)?);
                    let mut stream = stream;
                    let mut bytes = 0u64;
                    while let Some(chunk) = stream.next().await {
                        let chunk = chunk
                            .map_err(|_| AppError::bad_request("迁移包上传中断，请重新选择文件"))?;
                        bytes += chunk.len() as u64;
                        if bytes > archive::MAX_ARCHIVE_BYTES {
                            return Err(AppError::payload_too_large("迁移包不能超过 64 GiB"));
                        }
                        file.write_all(&chunk).await?;
                        self.progress.advance(chunk.len() as u64);
                    }
                    file.sync_all().await?;
                    drop(file);
                    let this = self.clone();
                    blocking(move || this.stage_sync(path, work)).await
                })
                .await
        })
        .await
    }

    pub async fn restore(
        self: Arc<Self>,
        input: RestoreInput,
        remote: bool,
    ) -> Result<RestoreView, AppError> {
        if !input.confirm_replace {
            return Err(AppError::bad_request("请先确认在重启后替换当前资料库"));
        }
        detached(async move {
            let _operation = self.operation.lock().await;
            let _gate = self.idle_gate()?;
            self.progress
                .track(if remote { "download" } else { "validate" }, async {
                    restore::check_runtime(&self.config)
                        .map_err(|error| AppError::conflict(error.to_string()))?;
                    let work = self.work_dir()?;
                    let source = if remote {
                        let source = work.0.join("download.zip");
                        webdav::download(
                            &self.settings()?,
                            &input.name,
                            &source,
                            self.progress.clone(),
                        )
                        .await?;
                        source
                    } else {
                        self.download_path(&input.name)?
                    };
                    let this = self.clone();
                    blocking(move || this.stage_sync(source, work)).await
                })
                .await
        })
        .await
    }

    pub async fn cancel(self: Arc<Self>) -> Result<(), AppError> {
        detached(async move {
            let _operation = self.operation.lock().await;
            let _gate = self
                .gate
                .clone()
                .try_write_owned()
                .map_err(|_| AppError::conflict("请等待当前操作结束后重试"))?;
            let this = self.clone();
            blocking(move || {
                let pending = this.directory().join("pending");
                if pending.exists() {
                    fs::remove_dir_all(pending)?;
                }
                this.pending.store(false, Ordering::SeqCst);
                Ok(())
            })
            .await
        })
        .await
    }

    pub async fn save_settings(
        self: Arc<Self>,
        input: SettingsInput,
    ) -> Result<SettingsView, AppError> {
        let _operation = self.operation.lock().await;
        let this = self.clone();
        blocking(move || {
            let settings = webdav::merge(input, this.settings()?)?;
            fs::create_dir_all(this.directory())?;
            archive::write_json(&this.directory().join("webdav.json"), &settings)?;
            Ok(settings.view())
        })
        .await
    }

    pub async fn test_webdav(self: Arc<Self>, input: SettingsInput) -> Result<(), AppError> {
        let this = self.clone();
        let settings = blocking(move || webdav::merge(input, this.settings()?)).await?;
        webdav::test(&settings).await
    }

    pub async fn list_remote(self: Arc<Self>) -> Result<Vec<RemoteItem>, AppError> {
        let this = self.clone();
        let settings = blocking(move || this.settings()).await?;
        webdav::list(&settings).await
    }

    /// Keep a verified remote package locally without staging a library replacement.
    pub async fn sync_remote(self: Arc<Self>, name: String) -> Result<BackupItem, AppError> {
        webdav::validate_name(&name)?;
        detached(async move {
            let _operation = self.operation.lock().await;
            self.progress
                .track("download", async {
                    if self.download_path(&name).is_ok() {
                        return Err(AppError::conflict("此备份已在本地列表中"));
                    }
                    let work = self.work_dir()?;
                    let path = work.0.join("download.zip");
                    webdav::download(&self.settings()?, &name, &path, self.progress.clone())
                        .await?;
                    let this = self.clone();
                    blocking(move || {
                        let manifest = archive::extract(
                            &path,
                            &work.0.join("verified"),
                            this.db.backup_schema_version()?,
                            &this.progress,
                        )
                        .map_err(|error| {
                            AppError::bad_request(format!("迁移包校验失败：{error}"))
                        })?;
                        let item = BackupItem {
                            id: name
                                .trim_start_matches("paperloom-backup-")
                                .trim_end_matches(".zip")
                                .to_owned(),
                            name: name.clone(),
                            created_at: manifest.created_at,
                            bytes: fs::metadata(&path)?.len(),
                            file_count: manifest.files.len(),
                            includes_credentials: manifest.includes_credentials,
                        };
                        archive::write_json(
                            &this.directory().join(name.replace(".zip", ".json")),
                            &item,
                        )?;
                        fs::rename(path, this.directory().join(name))?;
                        Ok(item)
                    })
                    .await
                })
                .await
        })
        .await
    }

    pub async fn restored_config(self: Arc<Self>) -> Result<Option<serde_json::Value>, AppError> {
        blocking(move || {
            let receipt = self.directory().join("last-restore.json");
            if !receipt.is_file() {
                return Ok(None);
            }
            let receipt: serde_json::Value = serde_json::from_slice(&fs::read(receipt)?)
                .map_err(|_| AppError::internal("恢复记录损坏"))?;
            if receipt["frontend_config_restored"] != true {
                return Ok(None);
            }
            let config: serde_json::Value = serde_json::from_slice(&fs::read(
                self.config.data_root.join("secrets/frontend-config.json"),
            )?)
            .map_err(|_| AppError::internal("恢复的接口配置损坏"))?;
            Ok(Some(
                serde_json::json!({ "restored_at": receipt["restored_at"], "config": config }),
            ))
        })
        .await
    }
}

#[cfg(test)]
mod tests;
