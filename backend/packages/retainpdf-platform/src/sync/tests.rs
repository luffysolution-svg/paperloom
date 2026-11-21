//! 立即同步的请求断开时的行为(审计 C1)。

use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use retainpdf_core::models::api::SyncSettingsInput;
use retainpdf_data::db::Db;

use super::SyncService;

/// 收下连接、一个字也不回的 WebDAV 服务器(慢线路、中转断了)。`stop` 之后断开已有连接、
/// 不再接受新连接,卡着的请求马上失败。
struct SilentServer {
    url: String,
    stop: Arc<AtomicBool>,
    accepted: Arc<std::sync::atomic::AtomicUsize>,
}

impl SilentServer {
    fn start() -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        listener.set_nonblocking(true).unwrap();
        let url = format!("http://127.0.0.1:{}/dav/retainpdf", listener.local_addr().unwrap().port());
        let stop = Arc::new(AtomicBool::new(false));
        let accepted = Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let (stopping, counter) = (stop.clone(), accepted.clone());
        std::thread::spawn(move || {
            let mut held: Vec<TcpStream> = Vec::new();
            while !stopping.load(Ordering::SeqCst) {
                match listener.accept() {
                    Ok((stream, _)) => {
                        counter.fetch_add(1, Ordering::SeqCst);
                        held.push(stream);
                    }
                    Err(_) => std::thread::sleep(Duration::from_millis(5)),
                }
            }
        });
        Self { url, stop, accepted }
    }

    fn stop(&self) {
        self.stop.store(true, Ordering::SeqCst);
    }
}

impl Drop for SilentServer {
    /// 断言失败时也放开卡着的请求,不让测试挂住(运行时关闭要等阻塞线程)。
    fn drop(&mut self) {
        self.stop();
    }
}

fn setup(name: &str) -> (PathBuf, Arc<SyncService>) {
    let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    let root = std::env::temp_dir().join(format!("retain-platform-{name}-{}-{nanos}", std::process::id()));
    std::fs::create_dir_all(&root).unwrap();
    let root = std::fs::canonicalize(root).unwrap();
    let db = Arc::new(Db::new(root.join("db").join("jobs.db"), root.clone()));
    db.init().unwrap();
    (root.clone(), Arc::new(SyncService::new(db, root)))
}

/// 回归（审计 C1）：立即同步的请求断开时，以前 `run_lock` 随请求的 future 一起放掉，这一轮
/// 却还在阻塞线程里跑：下一个立即同步、后台循环、恢复的「停住同步」都能马上进来。现在整段在
/// 单独的任务里：这一轮真正结束才放锁，`running` 最后回到 false，结果照样记进 `last_run`。
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_sync_run_whose_request_goes_away_keeps_the_lock_until_the_cycle_ends() {
    let (root, service) = setup("drop-sync");
    let server = SilentServer::start();
    let settings = SyncSettingsInput {
        enabled: Some(true),
        transport: Some("webdav".into()),
        webdav_url: Some(server.url.clone()),
        ..Default::default()
    };
    service.control.update(&settings).unwrap().unwrap();

    let request = service.run_once();
    assert!(tokio::time::timeout(Duration::from_millis(800), request).await.is_err());
    assert!(server.accepted.load(Ordering::SeqCst) >= 1, "这一轮已经在等 WebDAV 回话");
    assert!(service.is_paused(), "这一轮没跑完，锁不能放");
    assert!(service.running.load(Ordering::SeqCst));

    server.stop();
    let held = tokio::time::timeout(Duration::from_secs(60), service.run_lock.lock()).await.expect("这一轮结束后放锁");
    assert!(!service.running.load(Ordering::SeqCst), "running 回到 false");
    drop(held);
    let status = service.status().await.unwrap();
    let last = status.last_run.expect("结果记进 last_run");
    assert!(!last.ok);
    std::fs::remove_dir_all(root).ok();
}
