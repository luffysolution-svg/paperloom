//! Apply a validated restore before opening SQLite or starting supervised workers.
//! The journal makes an interrupted directory swap reversible on the next startup.

use std::fs;
use std::path::Path;

use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};

use super::archive::{self, Manifest, DATA_DIRS};
use crate::config::AppConfig;

#[derive(Deserialize, Serialize)]
struct Journal {
    id: String,
    entries: Vec<(String, bool)>,
    complete: bool,
}

fn managed_names(credentials: bool) -> Vec<String> {
    let mut names: Vec<String> = ["db", "downloads"]
        .into_iter()
        .chain(DATA_DIRS.iter().copied())
        .map(str::to_owned)
        .collect();
    if credentials {
        names.push("secrets".into());
    }
    names
}

pub(super) fn check_layout(config: &AppConfig) -> Result<()> {
    if config.jobs_db_path != config.data_root.join("db/jobs.db")
        || config.output_root != config.data_root.join("jobs")
        || config.uploads_dir != config.data_root.join("uploads")
        || config.downloads_dir != config.data_root.join("downloads")
    {
        bail!("迁移需要使用数据目录内的标准 db、jobs、uploads、downloads 路径");
    }
    Ok(())
}

pub(super) fn check_runtime(config: &AppConfig) -> Result<()> {
    if config.jobs_service.is_remote() && !config.jobs_service.supervise {
        bail!("恢复需要先将独立 jobsd 切换为由应用监督启动，或使用进程内模式，再重启全部服务");
    }
    Ok(())
}

fn remove_owned(path: &Path) -> Result<()> {
    if path.symlink_metadata()?.is_dir() {
        fs::remove_dir_all(path)?;
    } else {
        fs::remove_file(path)?;
    }
    Ok(())
}

fn recover(root: &Path, journal: &Journal) -> Result<()> {
    archive::safe_relative(&journal.id)?;
    if journal.id.contains('/') {
        bail!("恢复日志编号无效");
    }
    let backups = root.join("backups");
    let previous = backups.join("before-restore").join(&journal.id);
    let allowed = managed_names(true);
    for (name, _) in &journal.entries {
        if !allowed.contains(name) {
            bail!("恢复日志路径无效");
        }
    }
    if !journal.complete {
        for (name, had_old) in journal.entries.iter().rev() {
            let old = previous.join(name);
            let live = root.join(name);
            let staged = backups.join("pending/data").join(name);
            if old.symlink_metadata().is_ok() {
                if live.symlink_metadata().is_ok() {
                    remove_owned(&live)?;
                }
                fs::rename(old, live)?;
            } else if !had_old && !staged.exists() && live.symlink_metadata().is_ok() {
                remove_owned(&live)?;
            }
        }
        // Some staged directories may already have been moved. A fresh import is required.
        let pending = backups.join("pending");
        if pending.exists() {
            fs::remove_dir_all(pending)?;
        }
    } else {
        let frontend_config_restored = journal.entries.iter().any(|(name, _)| name == "secrets")
            && root.join("secrets/frontend-config.json").is_file();
        let receipt = backups.join("last-restore.json");
        if receipt.exists() {
            fs::remove_file(&receipt)?;
        }
        archive::write_json(
            &receipt,
            &serde_json::json!({
                "restored_at": chrono::Utc::now().to_rfc3339(),
                "previous_data_dir": previous.to_string_lossy(),
                "frontend_config_restored": frontend_config_restored,
            }),
        )?;
        let pending = backups.join("pending");
        if pending.exists() {
            fs::remove_dir_all(pending)?;
        }
    }
    fs::remove_file(backups.join("restore-journal.json"))?;
    let complete = backups.join("restore-complete.json");
    if complete.exists() {
        fs::remove_file(complete)?;
    }
    Ok(())
}

pub(crate) fn apply_pending(config: &AppConfig) -> Result<()> {
    let root = &config.data_root;
    let backups = root.join("backups");
    let journal_path = backups.join("restore-journal.json");
    if !journal_path.exists() && backups.join("restore-complete.json").exists() {
        fs::remove_file(backups.join("restore-complete.json"))?;
    }
    if journal_path.exists() {
        let mut journal: Journal = serde_json::from_slice(&fs::read(&journal_path)?)?;
        let complete_path = backups.join("restore-complete.json");
        if complete_path.exists() {
            let complete: Journal = serde_json::from_slice(&fs::read(complete_path)?)?;
            if complete.id != journal.id {
                bail!("恢复日志与完成标记不一致");
            }
            journal.complete = true;
        }
        recover(root, &journal)?;
    }
    let pending = backups.join("pending");
    if !pending.exists() {
        return Ok(());
    }
    check_layout(config)?;
    check_runtime(config)?;
    let manifest: Manifest = serde_json::from_slice(&fs::read(pending.join("manifest.json"))?)?;
    // Recheck staged bytes after the application was stopped, before touching live data.
    for entry in &manifest.files {
        let path = pending
            .join("data")
            .join(archive::safe_relative(&entry.path)?);
        let mut file = fs::File::open(path)?;
        let (bytes, digest) = archive::copy_hashed(&mut file, &mut std::io::sink())?;
        if bytes != entry.bytes || digest != entry.sha256 {
            bail!("暂存备份校验失败，请取消恢复并重新导入");
        }
    }
    let id = format!(
        "{}-{:016x}",
        chrono::Utc::now().format("%Y%m%dT%H%M%SZ"),
        fastrand::u64(..)
    );
    let previous = backups.join("before-restore").join(&id);
    fs::create_dir_all(&previous)?;
    let mut journal = Journal {
        id,
        entries: managed_names(manifest.includes_credentials)
            .into_iter()
            .map(|name| {
                let exists = root.join(&name).symlink_metadata().is_ok();
                (name, exists)
            })
            .collect(),
        complete: false,
    };
    archive::write_json(&journal_path, &journal)?;
    let swap = (|| -> Result<()> {
        for (name, had_old) in &journal.entries {
            if *had_old {
                fs::rename(root.join(name), previous.join(name))?;
            }
            let staged = pending.join("data").join(name);
            if staged.exists() {
                fs::rename(staged, root.join(name))?;
            }
        }
        journal.complete = true;
        // Keep the original journal until cleanup completes, including on Windows.
        archive::write_json(&backups.join("restore-complete.json"), &journal)?;
        Ok(())
    })();
    if let Err(error) = swap {
        journal.complete = false;
        recover(root, &journal)?;
        return Err(error);
    }
    recover(root, &journal)?;
    for name in ["db", "jobs", "uploads", "downloads"] {
        fs::create_dir_all(root.join(name))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn interrupted_swap_recovers_previous_data_before_opening_database() {
        let state = crate::api_tests::jobs_common::test_state("restore-journal");
        let config = state.config.clone();
        drop(state);
        let root = &config.data_root;
        fs::write(root.join("uploads/old.pdf"), b"old").unwrap();
        let previous = root.join("backups/before-restore/test-restore");
        fs::create_dir_all(&previous).unwrap();
        fs::rename(root.join("uploads"), previous.join("uploads")).unwrap();
        fs::create_dir_all(root.join("uploads")).unwrap();
        fs::write(root.join("uploads/new.pdf"), b"new").unwrap();
        fs::create_dir_all(root.join("backups/pending/data")).unwrap();
        let journal = Journal {
            id: "test-restore".into(),
            entries: vec![("uploads".into(), true)],
            complete: false,
        };
        archive::write_json(&root.join("backups/restore-journal.json"), &journal).unwrap();
        apply_pending(&config).unwrap();
        assert_eq!(fs::read(root.join("uploads/old.pdf")).unwrap(), b"old");
        assert!(!root.join("uploads/new.pdf").exists());
        assert!(!root.join("backups/pending").exists());
        fs::remove_dir_all(&config.project_root).unwrap();
    }

    #[test]
    fn completion_marker_keeps_restored_data_after_interrupted_cleanup() {
        let state = crate::api_tests::jobs_common::test_state("restore-commit");
        let config = state.config.clone();
        drop(state);
        let root = &config.data_root;
        let previous = root.join("backups/before-restore/test-restore");
        fs::create_dir_all(previous.join("uploads")).unwrap();
        fs::write(previous.join("uploads/old.pdf"), b"old").unwrap();
        fs::write(root.join("uploads/new.pdf"), b"new").unwrap();
        fs::create_dir_all(root.join("backups/pending/data")).unwrap();
        let mut journal = Journal {
            id: "test-restore".into(),
            entries: vec![("uploads".into(), true)],
            complete: false,
        };
        archive::write_json(&root.join("backups/restore-journal.json"), &journal).unwrap();
        journal.complete = true;
        archive::write_json(&root.join("backups/restore-complete.json"), &journal).unwrap();
        apply_pending(&config).unwrap();
        assert_eq!(fs::read(root.join("uploads/new.pdf")).unwrap(), b"new");
        assert!(previous.join("uploads/old.pdf").exists());
        assert!(!root.join("backups/pending").exists());
        fs::remove_dir_all(&config.project_root).unwrap();
    }
}
