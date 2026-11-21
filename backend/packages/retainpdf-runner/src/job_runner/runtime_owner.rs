//! 任务运行时的独占锁：同一个任务库同一时刻只许一个进程当 worker 的主人。
//!
//! 启动对账（`reconcile_stale_running_jobs`）假定库里 running 的任务都没人管了，会杀掉记录里的
//! worker、把任务改成 queued/failed。要是另一个运行时还开着、正在管这些任务，第二个进程一启动就把
//! 它的 worker 杀了。jobsd 以前靠「先 bind 端口再对账」挡二次启动，但这只挡得住同一个端口；
//! 进程内模式的 rust_api 换个端口、或者换一个 worktree 指向同一个 `data/` 就挡不住了。
//!
//! 所以按任务库加一把独占文件锁（`flock`，Windows 上是 `LockFileEx`），拿不到就报错退出、不对账。
//! 锁跟着打开的文件走，进程怎么退出（包括被 SIGKILL）都会由内核释放，不会留下要手动删的锁文件。
//! 进程内模式的 rust_api 和 jobsd 拿的是同一把锁，两种模式混着指向同一个库也互相挡得住。
//! 远端模式的壳不拿：它不对账，锁归它监督的 jobsd。

use std::fs::{File, OpenOptions, TryLockError};
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Context, Result};

/// 锁文件和任务库放在一起：`jobs.db` → `jobs.db.runtime-owner.lock`。
pub fn runtime_owner_lock_path(jobs_db_path: &Path) -> PathBuf {
    let mut name = jobs_db_path
        .file_name()
        .map(|name| name.to_os_string())
        .unwrap_or_else(|| "jobs.db".into());
    name.push(".runtime-owner.lock");
    jobs_db_path.with_file_name(name)
}

/// 拿着它就是任务运行时的主人；drop（或进程退出）时释放。
#[derive(Debug)]
pub struct RuntimeOwnerLock {
    _file: File,
    path: PathBuf,
}

impl RuntimeOwnerLock {
    pub fn path(&self) -> &Path {
        &self.path
    }
}

/// 不等待地拿锁。已经被别的进程（或本进程里另一个持有者）拿着时报错。
pub fn acquire_runtime_owner_lock(jobs_db_path: &Path) -> Result<RuntimeOwnerLock> {
    let path = runtime_owner_lock_path(jobs_db_path);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("create runtime lock directory {}", parent.display()))?;
    }
    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(&path)
        .with_context(|| format!("open runtime lock {}", path.display()))?;
    match file.try_lock() {
        Ok(()) => Ok(RuntimeOwnerLock { _file: file, path }),
        Err(TryLockError::WouldBlock) => Err(anyhow!(
            "另一个任务运行时（进程内模式的 rust_api 或 retain-jobsd）正在使用任务库 {}；\
             同一个数据目录只能有一个运行时，本进程不做启动对账、直接退出（锁文件 {}）",
            jobs_db_path.display(),
            path.display()
        )),
        Err(TryLockError::Error(error)) => {
            Err(error).with_context(|| format!("lock runtime owner file {}", path.display()))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn second_owner_is_refused_until_the_first_one_is_dropped() {
        let root = std::env::temp_dir().join(format!(
            "retain-runtime-owner-{}-{}",
            std::process::id(),
            fastrand::u64(..)
        ));
        let db_path = root.join("db/jobs.db");
        let first = acquire_runtime_owner_lock(&db_path).expect("first owner");
        assert_eq!(first.path(), root.join("db/jobs.db.runtime-owner.lock"));
        let error = acquire_runtime_owner_lock(&db_path).expect_err("second owner must be refused");
        assert!(
            format!("{error:#}").contains("另一个任务运行时"),
            "{error:#}"
        );
        drop(first);
        acquire_runtime_owner_lock(&db_path).expect("lock is released on drop");
        let _ = std::fs::remove_dir_all(root);
    }
}
