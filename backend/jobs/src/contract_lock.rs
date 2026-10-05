//! jobs-control.v1 契约锁（生产者侧：jobsd）。
//!
//! 后端测试镜像在 backend-root/contracts/jobs-control.v1.schema.json。本测试保证 jobsd
//! 真实挂载的路由与契约端点集合**双向相等**——多挂一个（未入契约的私货）
//! 或少挂一个（壳会打到 404）都红。消费者侧锁在
//! rust_api src/api_tests/jobs_control_contract.rs。

use std::collections::BTreeSet;
use std::path::PathBuf;

use serde_json::Value;

fn contract() -> Value {
    // backend/jobs → backend (test mirror, not the root canonical contract).
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(1)
        .expect("backend root")
        .join("contracts/jobs-control.v1.schema.json");
    serde_json::from_str(&std::fs::read_to_string(path).expect("read jobs-control contract"))
        .expect("parse jobs-control contract")
}

/// 契约路径 `/internal/v1/jobs/{job_id}/launch` → axum 形式 `:job_id`
fn to_axum_path(contract_path: &str) -> String {
    let mut out = String::new();
    for segment in contract_path.split('/') {
        if segment.is_empty() {
            continue;
        }
        out.push('/');
        if segment.starts_with('{') && segment.ends_with('}') {
            out.push(':');
            out.push_str(segment.trim_matches(|c| c == '{' || c == '}'));
        } else {
            out.push_str(segment);
        }
    }
    out
}

#[test]
fn router_paths_match_contract_exactly() {
    let contract = contract();
    let expected: BTreeSet<String> = contract["endpoints"]
        .as_array()
        .expect("endpoints array")
        .iter()
        .map(|endpoint| to_axum_path(endpoint["path"].as_str().expect("path")))
        .collect();

    // 路由表就是真值，不另建注册清单（那会变成第二个主人）。扫 main.rs 里
    // 所有 /internal/ 开头的字符串字面量——不依赖 .route( 的换行格式。
    let source = include_str!("main.rs");
    let mounted: BTreeSet<String> = source
        .split('"')
        .skip(1)
        .step_by(2)
        .filter(|literal| literal.starts_with("/internal/"))
        .map(str::to_string)
        .collect();

    assert_eq!(
        mounted, expected,
        "jobsd 路由与 jobs-control.v1 契约不一致：改一侧必须同步 schema 与另一侧"
    );
}

#[test]
fn every_contract_op_has_its_http_method_mounted() {
    let contract = contract();
    let source = include_str!("main.rs");
    for endpoint in contract["endpoints"].as_array().unwrap() {
        let method = endpoint["method"].as_str().unwrap().to_ascii_lowercase();
        let op = endpoint["op"].as_str().unwrap();
        // delete 走 `.delete(...)` 链式挂载，post 走 `post(...)`
        assert!(
            source.contains(&format!("{method}(")),
            "契约操作 {op} 的 HTTP 方法 {method} 未在路由中出现"
        );
    }
}

#[test]
fn contract_binds_loopback_only() {
    let contract = contract();
    assert_eq!(contract["bind_host"], "127.0.0.1");
    // 默认仅回环：代码应通过 JobsServiceConfig::bind_host 决定监听地址
    // （默认 127.0.0.1，可经 RUST_API_JOBS_HOST 覆盖），而非到处散落字面量。
    let source = include_str!("main.rs");
    assert!(
        source.contains("jobs_service.bind_host") || source.contains("bind_host"),
        "jobsd 必须通过 bind_host 配置决定监听地址——内部控制面默认仅回环"
    );
    // 同时确保持续声明默认值为回环（双重保险，字面量仅允许在配置默认值处）
    assert_eq!(
        retain_core::config::JobsServiceConfig::default().bind_host,
        "127.0.0.1",
        "JobsServiceConfig 默认 bind_host 必须为 127.0.0.1（仅回环）"
    );
}

#[test]
fn jobsd_startup_owns_remote_worker_reconciliation() {
    let source = include_str!("main.rs");
    assert!(
        source.contains("reconcile_stale_running_jobs(config.as_ref(), db.as_ref())"),
        "jobsd must reconcile its own stale workers before accepting launch requests"
    );
}

#[test]
fn jobsd_acquires_listener_before_reconciling_workers() {
    let source = include_str!("main.rs");
    let bind = source
        .find("TcpListener::bind")
        .expect("jobsd listener bind");
    let reconcile = source
        .find("reconcile_stale_running_jobs(config.as_ref(), db.as_ref())")
        .expect("jobsd startup recovery");
    assert!(
        bind < reconcile,
        "jobsd must acquire its exclusive listener before reconciling running workers"
    );
}

/// jobsd 必须显式设定 worker 栈大小,不能退回 `#[tokio::main]` 的默认值。
///
/// tokio 默认 2 MiB,而 book 工作流在 2 MiB 下必然栈溢出(debug 与 release
/// 都会)。溢出不是"某个 job 失败",而是 `fatal runtime error: stack overflow`
/// 直接 abort 掉整个 jobsd 进程;supervisor 重启后,startup_recovery 又会把
/// 当时在跑的 book 父任务判成"未记录 worker pid"的孤儿——报错指向的位置
/// 与真实原因毫无关系,极难查。
///
/// 所以这条守的是"有没有显式设",而不是具体数值:换回 `#[tokio::main]`
/// 会让 2 MiB 悄悄回来,而症状只在跑 book 时才浮现。
#[test]
fn jobsd_sets_an_explicit_worker_stack_size() {
    let source = include_str!("main.rs");
    // 只认属性行本身：上面那段文档注释里就提到了这个属性名,用 contains
    // 会把说明文字当成代码。
    assert!(
        !source
            .lines()
            .any(|line| line.trim_start().starts_with("#[tokio::main]")),
        "jobsd 不能用 #[tokio::main]：那会让 worker 栈退回 tokio 默认的 2 MiB"
    );
    assert!(
        source.contains(".thread_stack_size(JOB_WORKER_THREAD_STACK_BYTES)"),
        "jobsd 必须显式设定 worker 栈大小（JOB_WORKER_THREAD_STACK_BYTES）"
    );
    assert!(
        retain_core::config::JOB_WORKER_THREAD_STACK_BYTES >= 4 * 1024 * 1024,
        "实测 book 工作流在 4 MiB 下才不溢出，这个下限不能再调低"
    );
}
