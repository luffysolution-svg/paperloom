//! 数据库结构：编号迁移的执行器，以及任务系统老表后来加的列（`LEGACY_COLUMNS`）。
//!
//! 迁移本身在 `migrations/` 下，一个迁移一个 `.sql` 文件，见那里的说明。`apply_schema` 的
//! 幂等建表和 `ensure_legacy_columns` 补列继续负责任务系统的老表；新表、新列都从编号迁移走。

use anyhow::{Context, Result};
use rusqlite::{Connection, Transaction, TransactionBehavior};

mod migrations;

use migrations::MIGRATIONS;

/// 迁移阶梯当前版本数——测试用它做幂等断言，加迁移时无需再手改测试；备份据此判断
/// 结构要不要升级、一份备份是不是来自更新的版本。
pub(crate) fn versioned_migration_count() -> i64 {
    MIGRATIONS.len() as i64
}

pub(super) fn run_versioned_migrations(conn: &Connection) -> Result<()> {
    let initial_version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    // PaperLoom v0.2.8 used v17 for `document_external_refs` (now v30). If an existing
    // PaperLoom v17 database is opened, its user_version is 17 but `sync_state` from
    // upstream's v17_sync_bookkeeping.sql is not present yet. Backfill v17_sync_bookkeeping
    // before running v18..v30 so existing PaperLoom libraries upgrade cleanly.
    if initial_version == 17 {
        let has_sync_state: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='sync_state')",
            [],
            |row| row.get(0),
        )?;
        if !has_sync_state {
            let tx = Transaction::new_unchecked(conn, TransactionBehavior::Immediate)?;
            let still_missing: bool = tx.query_row(
                "SELECT NOT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='sync_state')",
                [],
                |row| row.get(0),
            )?;
            if still_missing {
                let v17 = &MIGRATIONS[16];
                debug_assert_eq!(v17.version, 17);
                tx.execute_batch(v17.sql)
                    .with_context(|| format!("schema migration v17 ({}) backfill failed", v17.name))?;
            }
            tx.commit()?;
        }
    }
    for migration in MIGRATIONS {
        let version = migration.version;
        if version <= initial_version {
            continue;
        }
        // API and jobsd can start together. Re-read the version while holding
        // the write reservation, so only one process executes additive ALTERs.
        let tx = Transaction::new_unchecked(conn, TransactionBehavior::Immediate)?;
        let current: i64 = tx.query_row("PRAGMA user_version", [], |row| row.get(0))?;
        if version <= current {
            continue;
        }
        tx.execute_batch(migration.sql)
            .with_context(|| format!("schema migration v{version} ({}) failed", migration.name))?;
        tx.pragma_update(None, "user_version", version)?;
        tx.commit()?;
    }
    Ok(())
}

/// 编号迁移以前就有的老表后来加的列：(表, 列, 定义)。只许往后加。
///
/// 不能收进编号迁移：早的几个迁移（v01 起）就要用到其中的列（`jobs.document_id` 等），而编号迁移是从库现在的版本往后跑的，
/// 一个更早的库得先有这些列、才跑得了 v01。所以它们在迁移阶梯之前补，每次起来都看一眼（几条 `PRAGMA table_info`）。
const LEGACY_COLUMNS: &[(&str, &str, &str)] = &[
    ("jobs", "document_id", "TEXT"),
    // 运行代次：每次建/重新发射一次运行加一，CAS 写按它认"是不是同一次运行"。
    ("jobs", "run_generation", "INTEGER NOT NULL DEFAULT 0"),
    // worker 进程身份（`<pid>@<启动时间指纹>`）：杀进程前核对 pid 没被别的进程复用。
    // 只由 `record_worker_identity` 写；任务行的 upsert 不碰它。
    ("jobs", "worker_identity", "TEXT"),
    ("jobs", "runtime_json", "TEXT"),
    ("jobs", "failure_json", "TEXT"),
    ("events", "stage_detail", "TEXT"),
    ("events", "provider", "TEXT"),
    ("events", "provider_stage", "TEXT"),
    ("events", "event_type", "TEXT"),
    ("events", "progress_current", "INTEGER"),
    ("events", "progress_total", "INTEGER"),
    ("events", "retry_count", "INTEGER"),
    ("events", "elapsed_ms", "INTEGER"),
    ("glossaries", "description", "TEXT NOT NULL DEFAULT ''"),
    ("glossaries", "source_lang", "TEXT NOT NULL DEFAULT ''"),
    ("glossaries", "target_lang", "TEXT NOT NULL DEFAULT ''"),
    ("glossaries", "enabled", "INTEGER NOT NULL DEFAULT 1"),
    ("uploads", "content_hash", "TEXT NOT NULL DEFAULT ''"),
];

/// 补上 `LEGACY_COLUMNS` 里缺的列。
///
/// 先不加锁看一遍，都在就直接回去（平常每次起来都是这样）。缺了才拿写锁、在锁里再看一遍再加：rust_api 和 jobsd
/// 会同时起来，以前两边都看到缺列、都去 `ALTER`，后到的那个报 "duplicate column" 起不来。和编号迁移一样用
/// IMMEDIATE 事务，加列要么全加上要么一个不加。
pub(super) fn ensure_legacy_columns(conn: &Connection) -> Result<()> {
    if missing_legacy_columns(conn)?.is_empty() {
        return Ok(());
    }
    let tx = Transaction::new_unchecked(conn, TransactionBehavior::Immediate)?;
    for (table, column, column_def) in missing_legacy_columns(&tx)? {
        tx.execute(&format!("ALTER TABLE {table} ADD COLUMN {column} {column_def}"), [])
            .with_context(|| format!("failed to add column {table}.{column}"))?;
    }
    tx.commit()?;
    Ok(())
}

fn missing_legacy_columns(conn: &Connection) -> Result<Vec<(&'static str, &'static str, &'static str)>> {
    let mut missing = Vec::new();
    let mut table_columns: Vec<(&str, Vec<String>)> = Vec::new();
    for &(table, column, column_def) in LEGACY_COLUMNS {
        if !table_columns.iter().any(|(name, _)| *name == table) {
            table_columns.push((table, table_column_names(conn, table)?));
        }
        let (_, columns) = table_columns.iter().find(|(name, _)| *name == table).expect("just added");
        if !columns.iter().any(|existing| existing == column) {
            missing.push((table, column, column_def));
        }
    }
    Ok(missing)
}

fn table_column_names(conn: &Connection, table: &str) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(1))?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub(super) fn ensure_no_legacy_artifacts_json(conn: &Connection) -> Result<()> {
    let mut stmt = conn.prepare("PRAGMA table_info(jobs)")?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(1))?;
    let mut has_legacy_column = false;
    for row in rows {
        if row? == "artifacts_json" {
            has_legacy_column = true;
            break;
        }
    }
    if !has_legacy_column {
        return Ok(());
    }
    let legacy_count: i64 = conn.query_row(
        r#"
        SELECT COUNT(*)
        FROM jobs
        WHERE artifacts_json IS NOT NULL AND TRIM(artifacts_json) <> ''
        "#,
        [],
        |row| row.get(0),
    )?;
    if legacy_count > 0 {
        anyhow::bail!(
            "legacy jobs.artifacts_json storage is no longer supported; found {legacy_count} legacy rows, clear the DB or rerun those jobs"
        );
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn upgrades_paperloom_v17_external_refs_db_with_sync_state_backfill() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE uploads (upload_id TEXT PRIMARY KEY, filename TEXT NOT NULL, stored_path TEXT NOT NULL, bytes INTEGER NOT NULL, page_count INTEGER NOT NULL, uploaded_at TEXT NOT NULL, developer_mode INTEGER NOT NULL, content_hash TEXT NOT NULL DEFAULT '');
             CREATE TABLE jobs (job_id TEXT PRIMARY KEY, workflow TEXT NOT NULL, status_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, command_json TEXT NOT NULL, request_json TEXT NOT NULL, log_tail_json TEXT NOT NULL, document_id TEXT, run_generation INTEGER NOT NULL DEFAULT 0);
             CREATE TABLE artifacts (job_id TEXT PRIMARY KEY, artifacts_json TEXT NOT NULL, updated_at TEXT NOT NULL);
             CREATE TABLE job_artifact_entries (job_id TEXT NOT NULL, artifact_key TEXT NOT NULL, PRIMARY KEY(job_id, artifact_key));
             CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL, seq INTEGER NOT NULL DEFAULT 0, ts TEXT NOT NULL, level TEXT NOT NULL DEFAULT '', stage TEXT, stage_detail TEXT, provider TEXT, provider_stage TEXT, event TEXT NOT NULL DEFAULT '', event_type TEXT, progress_current INTEGER, progress_total INTEGER, payload_json TEXT NOT NULL DEFAULT '{}', retry_count INTEGER, elapsed_ms INTEGER, message TEXT NOT NULL);
             CREATE TABLE glossaries (glossary_id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
             CREATE TABLE glossary_entries (entry_id TEXT PRIMARY KEY, glossary_id TEXT NOT NULL, source_term TEXT NOT NULL, target_term TEXT NOT NULL);",
        ).unwrap();
        for m in &MIGRATIONS[..16] {
            conn.execute_batch(m.sql).unwrap();
        }
        // Apply PaperLoom v0.2.8's v17 (document_external_refs, now v30) and set user_version = 17
        conn.execute_batch(MIGRATIONS[29].sql).unwrap();
        conn.pragma_update(None, "user_version", 17).unwrap();

        run_versioned_migrations(&conn).expect("upgrade PaperLoom v17 to v30");
        let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0)).unwrap();
        assert_eq!(version, versioned_migration_count());
        let has_sync: i64 = conn
            .query_row("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sync_state'", [], |r| r.get(0))
            .unwrap();
        let has_ext: i64 = conn
            .query_row("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='document_external_refs'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(has_sync, 1);
        assert_eq!(has_ext, 1);
    }
}
