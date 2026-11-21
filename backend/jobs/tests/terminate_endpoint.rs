#![cfg(any(target_os = "linux", target_os = "macos"))]
//! jobsd 的 `POST /internal/v1/processes/:pid/terminate` 只杀它登记过、而且身份核对得上的 worker
//! （状态审计 6-#3 第 5 步），以及 jobsd 拿不到运行时锁时不对账（1-#6）。
//!
//! jobsd 一律放进自己的进程组里起：改坏了的 jobsd 收到 pid=0 会 `kill(0, …)`，杀的是它自己所在的
//! 进程组，不能连累跑测试的进程。pid=1 只在纯函数的单测里测（`main.rs`）：改坏了的版本会
//! `kill(-1, …)`，那是当前用户的所有进程。

use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::os::unix::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use retainpdf_core::models::domain::{JobSnapshot, JobStatusKind};
use retainpdf_core::models::request::CreateJobInput;
use retainpdf_data::db::Db;

const API_KEY: &str = "terminate-test-key";

struct KillOnDrop(Child);

impl KillOnDrop {
    fn child_mut(&mut self) -> &mut Child {
        &mut self.0
    }
}

impl Drop for KillOnDrop {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

fn fixture_root(name: &str) -> PathBuf {
    std::env::temp_dir().join(format!(
        "retain-jobsd-{name}-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time")
            .as_nanos()
    ))
}

fn available_port() -> u16 {
    TcpListener::bind(("127.0.0.1", 0))
        .expect("bind ephemeral port")
        .local_addr()
        .expect("ephemeral address")
        .port()
}

fn jobs_db(root: &Path) -> Db {
    Db::new(root.join("data/db/jobs.db"), root.join("data"))
}

fn spawn_group_leader_sleep() -> KillOnDrop {
    let mut command = Command::new("sleep");
    command
        .arg("60")
        .process_group(0)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    KillOnDrop(command.spawn().expect("spawn sleep"))
}

fn spawn_jobsd(root: &Path, port: u16) -> KillOnDrop {
    let rust_api_root = root.join("rust_api");
    let scripts_dir = root.join("scripts");
    fs::create_dir_all(&rust_api_root).expect("create rust api root");
    fs::create_dir_all(&scripts_dir).expect("create scripts root");
    let child = Command::new(env!("CARGO_BIN_EXE_retain-jobsd"))
        .env("RUST_API_ROOT", &rust_api_root)
        .env("RUST_API_PROJECT_ROOT", root)
        .env("RUST_API_DATA_ROOT", root.join("data"))
        .env("RUST_API_SCRIPTS_DIR", &scripts_dir)
        .env("RUST_API_KEYS", API_KEY)
        .env("RUST_API_JOBS_HOST", "127.0.0.1")
        .env("RUST_API_JOBS_PORT", port.to_string())
        .env("RUST_API_WORKER_TERMINATE_GRACE_SECS", "1")
        .env("RUST_API_WORKER_TERMINATE_POLL_MS", "10")
        .env("RUST_LOG", "warn")
        .process_group(0)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("spawn retain-jobsd");
    KillOnDrop(child)
}

fn wait_for_jobsd(jobsd: &mut KillOnDrop, port: u16) {
    let deadline = Instant::now() + Duration::from_secs(10);
    loop {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return;
        }
        if let Some(status) = jobsd.child_mut().try_wait().expect("poll retain-jobsd") {
            panic!("retain-jobsd exited before listening: {status}");
        }
        assert!(Instant::now() < deadline, "retain-jobsd startup timed out");
        thread::sleep(Duration::from_millis(20));
    }
}

/// 发一个 terminate 请求，返回 HTTP 状态码；连接被掐断（jobsd 自己被杀了）时返回 None。
fn post_terminate(port: u16, pid: u32) -> Option<u16> {
    let mut stream = TcpStream::connect(("127.0.0.1", port)).ok()?;
    stream
        .set_read_timeout(Some(Duration::from_secs(10)))
        .expect("set read timeout");
    let request = format!(
        "POST /internal/v1/processes/{pid}/terminate HTTP/1.1\r\nHost: 127.0.0.1\r\nX-API-Key: {API_KEY}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
    );
    stream.write_all(request.as_bytes()).ok()?;
    let mut response = String::new();
    stream.read_to_string(&mut response).ok()?;
    response.strip_prefix("HTTP/1.1 ")?.get(..3)?.parse().ok()
}

fn alive_after_a_moment(process: &mut KillOnDrop) -> bool {
    thread::sleep(Duration::from_millis(300));
    process
        .child_mut()
        .try_wait()
        .expect("poll process")
        .is_none()
}

fn seed_running_job(db: &Db, job_id: &str, pid: u32, identity: Option<&str>) {
    let mut job = JobSnapshot::new(job_id.to_string(), CreateJobInput::default(), vec![]);
    job.status = JobStatusKind::Running;
    job.stage = Some("translating".to_string());
    job.pid = Some(pid);
    db.save_job(&job).expect("save running job");
    db.record_worker_identity(job_id, identity)
        .expect("record identity");
}

#[test]
fn terminate_rejects_pid_zero_instead_of_killing_its_own_process_group() {
    let root = fixture_root("terminate-pid0");
    fs::create_dir_all(root.join("data/db")).expect("create data root");
    let port = available_port();
    let mut jobsd = spawn_jobsd(&root, port);
    wait_for_jobsd(&mut jobsd, port);

    assert_eq!(post_terminate(port, 0), Some(400), "pid=0 必须 400");
    assert!(
        alive_after_a_moment(&mut jobsd),
        "pid=0 让 jobsd 杀掉了自己的进程组"
    );

    drop(jobsd);
    let _ = fs::remove_dir_all(root);
}

#[test]
fn terminate_only_kills_workers_jobsd_registered() {
    let root = fixture_root("terminate-registered");
    fs::create_dir_all(root.join("data/db")).expect("create data root");
    let db = jobs_db(&root);
    db.init().expect("init db");
    let port = available_port();
    let mut jobsd = spawn_jobsd(&root, port);
    wait_for_jobsd(&mut jobsd, port);

    // 库里没有任何任务记着这个 pid：不是 jobsd 的 worker，不许杀。
    let mut stranger = spawn_group_leader_sleep();
    assert_eq!(post_terminate(port, stranger.child_mut().id()), Some(404));
    assert!(alive_after_a_moment(&mut stranger), "没登记过的 pid 被杀了");

    // 任务记着这个 pid，但身份是另一个进程的（pid 被复用）：也不许杀。
    let mut reused = spawn_group_leader_sleep();
    let reused_pid = reused.child_mut().id();
    seed_running_job(
        &db,
        "job-reused",
        reused_pid,
        Some(&format!("{reused_pid}@darwin:1.000000")),
    );
    assert_eq!(post_terminate(port, reused_pid), Some(404));
    assert!(alive_after_a_moment(&mut reused), "身份对不上的 pid 被杀了");

    // 登记过、身份对得上：照常组杀。
    let mut worker = spawn_group_leader_sleep();
    let worker_pid = worker.child_mut().id();
    seed_running_job(
        &db,
        "job-worker",
        worker_pid,
        retainpdf_proc::process_identity(worker_pid).as_deref(),
    );
    assert_eq!(post_terminate(port, worker_pid), Some(200));
    let deadline = Instant::now() + Duration::from_secs(5);
    while worker
        .child_mut()
        .try_wait()
        .expect("poll worker")
        .is_none()
    {
        assert!(Instant::now() < deadline, "登记过的 worker 没被终止");
        thread::sleep(Duration::from_millis(20));
    }

    drop(jobsd);
    let _ = fs::remove_dir_all(root);
}

/// 同一个任务库已经有运行时（这里由测试进程拿着运行时锁扮演，比如一个进程内模式的 rust_api）：
/// jobsd 拿不到锁就退出，不对账、不杀那个运行时的 worker。
#[test]
fn jobsd_exits_without_reconciling_when_another_runtime_owns_the_db() {
    let root = fixture_root("owner-lock");
    fs::create_dir_all(root.join("data/db")).expect("create data root");
    let db = jobs_db(&root);
    db.init().expect("init db");
    let mut worker = spawn_group_leader_sleep();
    let worker_pid = worker.child_mut().id();
    seed_running_job(
        &db,
        "job-owned-elsewhere",
        worker_pid,
        retainpdf_proc::process_identity(worker_pid).as_deref(),
    );
    let _owner =
        retainpdf_runner::job_runner::acquire_runtime_owner_lock(&root.join("data/db/jobs.db"))
            .expect("hold runtime owner lock");

    let mut jobsd = spawn_jobsd(&root, available_port());
    let deadline = Instant::now() + Duration::from_secs(10);
    let status = loop {
        if let Some(status) = jobsd.child_mut().try_wait().expect("poll retain-jobsd") {
            break status;
        }
        assert!(
            Instant::now() < deadline,
            "jobsd 拿不到运行时锁时应当直接退出"
        );
        thread::sleep(Duration::from_millis(20));
    };
    assert!(!status.success(), "{status}");
    assert!(
        alive_after_a_moment(&mut worker),
        "jobsd 杀掉了别的运行时的 worker"
    );
    assert_eq!(
        db.get_job("job-owned-elsewhere").expect("job").status,
        JobStatusKind::Running
    );

    drop(jobsd);
    let _ = fs::remove_dir_all(root);
}
