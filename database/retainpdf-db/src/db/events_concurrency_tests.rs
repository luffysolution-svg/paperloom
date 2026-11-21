//! 并发写事件不得因 SQLite 锁升级而直接失败。
//!
//! 现象：任务翻译成功、正要进入渲染时，偶发
//!   `ERROR: database is locked` / `Error code 5: The database file is locked`
//! 任务被判 failed——尽管 busy_timeout 配的是 5 秒，实测只等 0.00 秒就放弃。
//!
//! 根因：`append_event` 原来用默认的 `BEGIN DEFERRED`，而它先 `SELECT MAX(seq)`
//! 再 `INSERT`。DEFERRED 会先取 SHARED 读锁，写时再升级成写锁；SQLite 对**锁升级**
//! 不应用 busy_timeout——两个连接都持 SHARED 又都想升级时等待必然死锁，所以它
//! 直接返回 SQLITE_BUSY 而不是等待。翻译转渲染那一刻 jobsd 写事件、API 轮询读、
//! completion 写状态并发最密集，于是偶发命中。
//!
//! `BEGIN IMMEDIATE` 在开始时就取写锁，属于"获取"而非"升级"，busy_timeout 正常
//! 生效，并发写者排队而不是互相判死。

use std::path::PathBuf;
use std::sync::{Arc, Barrier};

use super::*;
use crate::models::domain::{JobSnapshot, JobStatusKind};
use crate::models::request::CreateJobInput;

struct Fixture {
    root: PathBuf,
    db: Db,
}

impl Fixture {
    fn new() -> Self {
        let root = std::env::temp_dir().join(format!("retain-events-conc-{}", fastrand::u64(..)));
        let db = Db::new(root.join("db.sqlite"), root.join("data"));
        db.init().unwrap();
        Self { root, db }
    }

    fn seed_job(&self, job_id: &str) {
        let mut job = JobSnapshot::new(
            job_id.to_string(),
            CreateJobInput::default(),
            vec!["python".to_string()],
        );
        job.status = JobStatusKind::Running;
        self.db.save_job(&job).unwrap();
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.root);
    }
}

#[test]
fn concurrent_append_event_does_not_fail_with_database_locked() {
    let fs = Fixture::new();
    let job_id = "job-concurrent-events";
    fs.seed_job(job_id);

    const WRITERS: usize = 8;
    const PER_WRITER: usize = 6;

    let barrier = Arc::new(Barrier::new(WRITERS));
    let handles: Vec<_> = (0..WRITERS)
        .map(|writer| {
            let db = fs.db.clone();
            let barrier = barrier.clone();
            let job_id = job_id.to_string();
            std::thread::spawn(move || {
                // 所有线程同时开闸，最大化锁竞争窗口。
                barrier.wait();
                let mut failures = Vec::new();
                for index in 0..PER_WRITER {
                    let result = db.append_event(
                        &job_id,
                        "info",
                        Some("translating".to_string()),
                        Some(format!("writer {writer} event {index}")),
                        None,
                        None,
                        "stage_progress",
                        Some("stage_progress".to_string()),
                        &format!("writer {writer} event {index}"),
                        None,
                        None,
                        None,
                        None,
                        None,
                    );
                    if let Err(error) = result {
                        failures.push(format!("{error}"));
                    }
                }
                failures
            })
        })
        .collect();

    let failures: Vec<String> = handles
        .into_iter()
        .flat_map(|handle| handle.join().expect("writer thread panicked"))
        .collect();

    assert!(
        failures.is_empty(),
        "并发写事件不应出现锁错误，实际失败 {} 次：{:?}",
        failures.len(),
        &failures[..failures.len().min(3)],
    );

    // 每条事件都要真正落库，且 seq 不重复——IMMEDIATE 同时保证了
    // `SELECT MAX(seq)+1` 与随后的 INSERT 在同一把写锁下是原子的。
    let events = fs.db.list_job_events(job_id, 1_000, 0).unwrap();
    assert_eq!(
        events.len(),
        WRITERS * PER_WRITER,
        "事件条数应与写入次数一致",
    );
    let mut seqs: Vec<i64> = events.iter().map(|event| event.seq).collect();
    seqs.sort_unstable();
    seqs.dedup();
    assert_eq!(
        seqs.len(),
        WRITERS * PER_WRITER,
        "seq 必须唯一：先读后写若不在同一把写锁下会产生重复 seq",
    );
}
