use super::*;

fn legacy_database() -> (PathBuf, Db) {
    let root = std::env::temp_dir().join(format!("paperloom-upgrade-{:016x}", fastrand::u64(..)));
    std::fs::create_dir_all(root.join("db")).unwrap();
    let path = root.join("db/jobs.db");
    let conn = Connection::open(&path).unwrap();
    conn.execute_batch(r#"
        PRAGMA journal_mode=WAL;
        CREATE TABLE uploads (upload_id TEXT PRIMARY KEY, filename TEXT NOT NULL,
            stored_path TEXT NOT NULL, bytes INTEGER NOT NULL, page_count INTEGER NOT NULL,
            uploaded_at TEXT NOT NULL, developer_mode INTEGER NOT NULL);
        CREATE TABLE jobs (job_id TEXT PRIMARY KEY, workflow TEXT NOT NULL, status_json TEXT NOT NULL,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL, started_at TEXT, finished_at TEXT,
            upload_id TEXT, pid INTEGER, command_json TEXT NOT NULL, request_json TEXT NOT NULL,
            error TEXT, stage TEXT, stage_detail TEXT, progress_current INTEGER, progress_total INTEGER,
            log_tail_json TEXT NOT NULL, result_json TEXT);
        CREATE TABLE events (job_id TEXT NOT NULL, seq INTEGER NOT NULL, ts TEXT NOT NULL,
            level TEXT NOT NULL, stage TEXT, event TEXT NOT NULL, payload_json TEXT,
            message TEXT NOT NULL, PRIMARY KEY(job_id, seq));
        CREATE TABLE glossaries (glossary_id TEXT PRIMARY KEY, name TEXT NOT NULL,
            entries_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        INSERT INTO glossaries VALUES ('legacy','老术语表','[]','now','now');
    "#).unwrap();
    drop(conn);
    let db = Db::new(path, root.clone());
    (root, db)
}

#[test]
fn old_database_is_backed_up_before_columns_or_versions_change() {
    let (root, db) = legacy_database();
    db.init().unwrap();
    let backups: Vec<_> = std::fs::read_dir(root.join("backups/schema-upgrades"))
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .collect();
    assert_eq!(backups.len(), 1);
    let snapshot = Connection::open(&backups[0]).unwrap();
    assert_eq!(
        snapshot
            .query_row("PRAGMA user_version", [], |row| row.get::<_, i64>(0))
            .unwrap(),
        0
    );
    assert_eq!(
        snapshot
            .query_row("SELECT name FROM glossaries", [], |row| row
                .get::<_, String>(0))
            .unwrap(),
        "老术语表"
    );
    assert!(snapshot.prepare("SELECT runtime_json FROM jobs").is_err());
    drop(snapshot);
    Db::new(root.join("db/jobs.db"), root.clone())
        .init()
        .unwrap();
    assert_eq!(
        std::fs::read_dir(root.join("backups/schema-upgrades"))
            .unwrap()
            .count(),
        1
    );
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn required_backup_failure_keeps_the_original_schema() {
    let _env = retain_core::config::env_vars::env_test_lock();
    let (root, db) = legacy_database();
    std::fs::write(root.join("backups"), b"not a directory").unwrap();
    let previous = std::env::var_os("RUST_API_DB_REQUIRE_UPGRADE_BACKUP");
    std::env::set_var("RUST_API_DB_REQUIRE_UPGRADE_BACKUP", "true");
    let result = db.init();
    match previous {
        Some(value) => std::env::set_var("RUST_API_DB_REQUIRE_UPGRADE_BACKUP", value),
        None => std::env::remove_var("RUST_API_DB_REQUIRE_UPGRADE_BACKUP"),
    }
    assert!(
        result.is_err(),
        "required backup must fail before upgrading"
    );
    let conn = Connection::open(root.join("db/jobs.db")).unwrap();
    assert!(conn.prepare("SELECT runtime_json FROM jobs").is_err());
    assert_eq!(
        conn.query_row("PRAGMA user_version", [], |row| row.get::<_, i64>(0))
            .unwrap(),
        0
    );
    drop(conn);
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn separate_connections_can_upgrade_the_same_old_database_together() {
    for _ in 0..8 {
        let (root, _) = legacy_database();
        let barrier = Arc::new(std::sync::Barrier::new(4));
        let workers: Vec<_> = (0..4)
            .map(|_| {
                let root = root.clone();
                let barrier = barrier.clone();
                std::thread::spawn(move || {
                    barrier.wait();
                    Db::new(root.join("db/jobs.db"), root).init()
                })
            })
            .collect();
        for worker in workers {
            worker.join().unwrap().unwrap();
        }
        std::fs::remove_dir_all(root).unwrap();
    }
}
