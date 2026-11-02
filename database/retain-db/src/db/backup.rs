//! SQLite snapshots used by portable backups. Files are handled by the API service.

use std::path::Path;

use anyhow::{bail, Result};
use rusqlite::{Connection, OpenFlags};

use super::Db;

pub(super) fn backup_before_upgrade(conn: &Connection, root: &Path, require: bool) -> Result<()> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    let target = super::schema::versioned_migration_count();
    let has_tables: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%')",
        [], |row| row.get(0),
    )?;
    if !has_tables || version >= target {
        return Ok(());
    }
    let copy = (|| -> Result<()> {
        let directory = root.join("backups/schema-upgrades");
        std::fs::create_dir_all(&directory)?;
        let path = directory.join(format!(
            "before-v{version}-to-v{target}-{:016x}.db",
            fastrand::u64(..)
        ));
        let mut options = std::fs::OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        drop(options.open(&path)?);
        if let Err(error) = conn.execute("VACUUM INTO ?1", [path.to_string_lossy().as_ref()]) {
            let _ = std::fs::remove_file(&path);
            return Err(error.into());
        }
        Ok(())
    })();
    match copy {
        Ok(()) => Ok(()),
        Err(error) if require => {
            Err(error
                .context("RUST_API_DB_REQUIRE_UPGRADE_BACKUP: 升级前备份失败，保留原数据库结构"))
        }
        Err(error) => {
            tracing::error!(
                "database upgrade backup failed; continuing without a fallback copy: {error:#}"
            );
            Ok(())
        }
    }
}

impl Db {
    pub fn backup_schema_version(&self) -> Result<i64> {
        Ok(self
            .connect()?
            .query_row("PRAGMA user_version", [], |row| row.get(0))?)
    }

    pub fn backup_blockers(&self) -> Result<u64> {
        let conn = self.connect()?;
        let count: i64 = conn.query_row(
            "SELECT (SELECT COUNT(*) FROM jobs WHERE status_json IN ('\"queued\"','\"running\"'))
             + (SELECT COUNT(*) FROM document_operations WHERE status IN ('queued','running','validating'))
             + (SELECT COUNT(*) FROM model_operations WHERE status IN ('queued','running'))",
            [],
            |row| row.get(0),
        )?;
        Ok(count as u64)
    }

    /// VACUUM INTO includes committed WAL pages without copying a live database file.
    pub fn create_backup_snapshot(&self, destination: &Path) -> Result<i64> {
        let conn = self.connect()?;
        conn.execute("VACUUM INTO ?1", [destination.to_string_lossy().as_ref()])?;
        inspect_backup_snapshot(destination)
    }
}

pub fn inspect_backup_snapshot(path: &Path) -> Result<i64> {
    // FTS5's integrity check uses a savepoint even when the index is healthy.
    // This is a private snapshot, never the live database.
    let conn = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_WRITE)?;
    let integrity: String = conn.query_row("PRAGMA integrity_check", [], |row| row.get(0))?;
    if integrity != "ok" {
        bail!("备份数据库完整性检查失败：{integrity}");
    }
    // A random SQLite database is not a PaperLoom migration package.
    for table in [
        "jobs",
        "uploads",
        "documents",
        "favorites",
        "ai_messages",
        "glossaries",
    ] {
        let present: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name=?1)",
            [table],
            |row| row.get(0),
        )?;
        if !present {
            bail!("备份缺少数据表：{table}");
        }
    }
    Ok(conn.query_row("PRAGMA user_version", [], |row| row.get(0))?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshot_contains_committed_wal_and_is_independent_of_source() {
        let root =
            std::env::temp_dir().join(format!("paperloom-snapshot-{:016x}", fastrand::u64(..)));
        std::fs::create_dir_all(&root).unwrap();
        let db = Db::new(root.join("jobs.db"), root.clone());
        db.init().unwrap();
        let conn = db.connect().unwrap();
        conn.execute(
            "INSERT INTO collections VALUES ('c1','备份测试',NULL,0,'now')",
            [],
        )
        .unwrap();
        let snapshot = root.join("snapshot.db");
        let version = db.create_backup_snapshot(&snapshot).unwrap();
        assert!(version > 0);
        conn.execute("DELETE FROM collections", []).unwrap();
        let copy = Connection::open(&snapshot).unwrap();
        let title: String = copy
            .query_row("SELECT name FROM collections", [], |row| row.get(0))
            .unwrap();
        assert_eq!(title, "备份测试");
        assert_eq!(db.backup_blockers().unwrap(), 0);
        drop(copy);
        drop(conn);
        std::fs::remove_dir_all(root).unwrap();
    }
}
