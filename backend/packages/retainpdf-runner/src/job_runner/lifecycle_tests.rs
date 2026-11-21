use super::*;
use crate::job_events::cas_persist_job_with_resources;
use crate::models::request::CreateJobInput;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};
use tokio::sync::Notify;

struct Fixture {
    deps: ProcessRuntimeDeps,
    root: std::path::PathBuf,
}
impl Fixture {
    fn new(slots: usize) -> Self {
        let deps = super::super::process_runner::tests::test_runtime_deps(slots);
        let root = deps.config.project_root.clone();
        Self { deps, root }
    }
    fn job(&self, id: &str, status: JobStatusKind) -> JobSnapshot {
        let mut job = JobSnapshot::new(
            id.into(),
            CreateJobInput::default(),
            vec!["fake-worker".into()],
        );
        job.status = status;
        self.deps.db.save_job(&job).unwrap();
        job
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.root);
    }
}

async fn succeeded(_: ProcessRuntimeDeps, mut job: JobRuntimeState) -> Result<JobRuntimeState> {
    job.status = JobStatusKind::Succeeded;
    Ok(job)
}

#[test]
fn workflow_dispatch_does_not_embed_large_pipeline_futures() {
    fn future_size<F, Fut>(_: F) -> usize
    where
        F: FnOnce(ProcessRuntimeDeps, JobRuntimeState) -> Fut,
        Fut: std::future::Future<Output = Result<JobRuntimeState>>,
    {
        std::mem::size_of::<Fut>()
    }
    let size = future_size(dispatch_workflow);
    assert!(
        size <= 64 * 1024,
        "workflow dispatcher retains {size} bytes; pipeline branches must be heap-pinned"
    );
}

#[tokio::test]
async fn repeated_launch_has_one_driver_even_while_queued() {
    let fixture = Fixture::new(1);
    fixture.job("same", JobStatusKind::Queued);
    let permit = fixture
        .deps
        .job_slots
        .clone()
        .acquire_owned()
        .await
        .unwrap();
    let count = Arc::new(AtomicUsize::new(0));
    let worker_count = count.clone();
    let handle = spawn_job_with_workflow(
        fixture.deps.clone(),
        "same".into(),
        move |deps, job| async move {
            worker_count.fetch_add(1, Ordering::SeqCst);
            succeeded(deps, job).await
        },
    )
    .unwrap();
    for _ in 0..100 {
        assert!(spawn_job_with_workflow(fixture.deps.clone(), "same".into(), succeeded).is_none());
    }
    assert_eq!(count.load(Ordering::SeqCst), 0);
    drop(permit);
    handle.await.unwrap();
    assert_eq!(count.load(Ordering::SeqCst), 1);
    assert!(fixture.deps.job_drivers.claim("same", 0).is_some());
}

#[tokio::test]
async fn terminal_launch_never_dispatches_or_changes_snapshot() {
    let fixture = Fixture::new(1);
    for (id, status) in [
        ("done", JobStatusKind::Succeeded),
        ("failed", JobStatusKind::Failed),
        ("cancel", JobStatusKind::Canceled),
    ] {
        fixture.job(id, status);
        let before = serde_json::to_value(fixture.deps.db.get_job(id).unwrap()).unwrap();
        spawn_job_with_workflow(fixture.deps.clone(), id.into(), |_, _| async {
            panic!("terminal job dispatched");
            #[allow(unreachable_code)]
            Ok(unreachable!())
        })
        .unwrap()
        .await
        .unwrap();
        assert_eq!(
            serde_json::to_value(fixture.deps.db.get_job(id).unwrap()).unwrap(),
            before
        );
    }
}

#[tokio::test]
async fn canceled_stale_snapshot_rejects_queue_cas_and_dispatch() {
    let fixture = Fixture::new(1);
    let mut stale = fixture.job("race", JobStatusKind::Queued);
    fixture.job("race", JobStatusKind::Canceled);
    assert!(!persist_queued_job(&fixture.deps, &mut stale).unwrap());
    assert_eq!(
        fixture.deps.db.get_job("race").unwrap().status,
        JobStatusKind::Canceled
    );
    run_job(fixture.deps.clone(), "race".into(), |_, _| async {
        panic!("canceled job dispatched");
        #[allow(unreachable_code)]
        Ok(unreachable!())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn two_jobs_share_slot_limit_and_waiting_cancel_never_dispatches() {
    let fixture = Fixture::new(1);
    fixture.job("first", JobStatusKind::Queued);
    fixture.job("second", JobStatusKind::Queued);
    let entered = Arc::new(Notify::new());
    let release = Arc::new(Notify::new());
    let (worker_entered, worker_release) = (entered.clone(), release.clone());
    let first = spawn_job_with_workflow(
        fixture.deps.clone(),
        "first".into(),
        move |deps, job| async move {
            worker_entered.notify_one();
            worker_release.notified().await;
            succeeded(deps, job).await
        },
    )
    .unwrap();
    entered.notified().await;
    let second = spawn_job_with_workflow(fixture.deps.clone(), "second".into(), |_, _| async {
        panic!("waiting canceled job dispatched");
        #[allow(unreachable_code)]
        Ok(unreachable!())
    })
    .unwrap();
    tokio::task::yield_now().await;
    assert_eq!(fixture.deps.job_slots.available_permits(), 0);
    fixture.job("second", JobStatusKind::Canceled);
    second.await.unwrap();
    release.notify_one();
    first.await.unwrap();
    assert_eq!(fixture.deps.job_slots.available_permits(), 1);
}

#[tokio::test]
async fn failure_and_abort_release_driver_ownership() {
    let fixture = Fixture::new(1);
    fixture.job("error", JobStatusKind::Queued);
    spawn_job_with_workflow(fixture.deps.clone(), "error".into(), |_, _| async {
        anyhow::bail!("synthetic failure")
    })
    .unwrap()
    .await
    .unwrap();
    assert_eq!(
        fixture.deps.db.get_job("error").unwrap().status,
        JobStatusKind::Failed
    );
    assert!(fixture.deps.job_drivers.claim("error", 0).is_some());
    fixture.job("abort", JobStatusKind::Queued);
    let handle = spawn_job_with_workflow(fixture.deps.clone(), "abort".into(), |_, _| async {
        std::future::pending().await
    })
    .unwrap();
    handle.abort();
    assert!(handle.await.unwrap_err().is_cancelled());
    assert!(fixture.deps.job_drivers.claim("abort", 0).is_some());
}

#[tokio::test]
async fn repeated_launch_starts_only_one_real_local_worker() {
    let fixture = Fixture::new(1);
    let marker = fixture.root.join("worker-starts.txt");
    let mut job = fixture.job("real-worker", JobStatusKind::Queued);
    job.command = vec![
        "python3".into(),
        "-c".into(),
        "import pathlib,sys; p=pathlib.Path(sys.argv[1]); p.open('a').write('started\\n')".into(),
        marker.to_string_lossy().into_owned(),
    ];
    fixture.deps.db.save_job(&job).unwrap();
    let handle = spawn_job_with_workflow(
        fixture.deps.clone(),
        job.job_id.clone(),
        |deps, job| async move {
            super::super::process_runner::execute_process_job(deps, job, &[]).await
        },
    )
    .unwrap();
    for _ in 0..100 {
        assert!(
            spawn_job_with_workflow(fixture.deps.clone(), job.job_id.clone(), succeeded).is_none()
        );
    }
    handle.await.unwrap();
    assert_eq!(std::fs::read_to_string(marker).unwrap(), "started\n");
    assert_eq!(
        fixture.deps.db.get_job(&job.job_id).unwrap().status,
        JobStatusKind::Succeeded
    );
}

/// 强制删除运行中的任务后，runner 必须收手：行不能被写回来，worker 要被停掉。
///
/// 删除只删了行和目录，没人通知 driver。driver 下一次逐行落库走的 CAS 以前在
/// 「行不存在」时直接 INSERT，把已删任务复活成 running 的幽灵行，worker 接着跑完整个
/// 流水线（继续花 OCR/模型的钱）。
///
/// 用真实的本地 worker（python 脚本，吞掉 BrokenPipe，只有被杀才会停）。
///
/// 反证方式：把 `cas_save_job` 里「行不存在就返回 false」去掉，这个测试必须变红——
/// 任务行会重新出现，worker 也会一直写到脚本结束。
#[tokio::test]
async fn force_deleting_a_running_job_stops_the_runner_and_revives_no_row() {
    let fx = Fixture::new(1);
    let marker = fx.root.join("ghost-worker-ticks.txt");
    let mut job = fx.job("ghost", JobStatusKind::Running);
    job.command = vec![
        "python3".into(),
        "-c".into(),
        concat!(
            "import pathlib,sys,time\n",
            "p=pathlib.Path(sys.argv[1])\n",
            "for i in range(60):\n",
            "    p.open('a').write('tick\\n')\n",
            "    try:\n",
            "        print('line', i, flush=True)\n",
            "    except Exception:\n",
            "        pass\n",
            "    time.sleep(0.2)\n",
        )
        .into(),
        marker.to_string_lossy().into_owned(),
    ];
    fx.deps.db.save_job(&job).unwrap();
    let handle = spawn_job_with_workflow(
        fx.deps.clone(),
        job.job_id.clone(),
        |deps, job| async move {
            super::super::process_runner::execute_process_job(deps, job, &[]).await
        },
    )
    .unwrap();

    let ticks = || {
        std::fs::read_to_string(&marker)
            .map(|text| text.lines().count())
            .unwrap_or(0)
    };
    for _ in 0..100 {
        if ticks() >= 2 {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }
    assert!(ticks() >= 2, "worker 应该已经在跑");

    // 强制删除：删行，再删磁盘目录（worker 启动时建了日志目录）。
    fx.deps.db.delete_jobs(&["ghost".to_string()]).unwrap();
    let _ = std::fs::remove_dir_all(fx.deps.persist.output_root.join("ghost"));

    tokio::time::timeout(std::time::Duration::from_secs(5), handle)
        .await
        .expect("行被删之后 driver 必须很快退出，而不是陪 worker 跑到结束")
        .unwrap();
    assert!(
        fx.deps.db.get_job("ghost").is_err(),
        "已删除的任务行不能被 runner 写回来"
    );
    let after = ticks();
    tokio::time::sleep(std::time::Duration::from_millis(800)).await;
    assert_eq!(ticks(), after, "worker 进程必须已被终止，不能继续干活");
    assert!(
        !fx.deps.persist.output_root.join("ghost").exists(),
        "runner 不能给已删除的任务重建输出目录"
    );
}

/// 读 stdout 的任务出错退出时，worker 要马上被停掉，任务带着那个错误落失败。
///
/// 以前读取任务带着 `Err` 退出以后没人通知等待方：worker 照样跑（吞掉 BrokenPipe 的
/// Python 会把翻译做完、继续花模型的钱），一直拖到它自己退出或总超时，才在收尾时把错误抛出来。
/// 这里让 worker 报一条 job_id 对不上的阶段观测（`apply_durable_stage_observation` 会拒绝），
/// 然后假装继续干 12 秒。
///
/// 反证方式：把 `wait_with_limits` 里 `reader_failed` 那个分支去掉，这个测试必须变红——
/// driver 要陪 worker 跑满 12 秒。
#[tokio::test]
async fn a_failing_stdout_reader_stops_the_worker_right_away() {
    let fx = Fixture::new(1);
    let marker = fx.root.join("orphaned-worker-ticks.txt");
    let mut job = fx.job("reader-fails", JobStatusKind::Running);
    job.command = vec![
        "python3".into(),
        "-c".into(),
        concat!(
            "import pathlib,sys,time\n",
            "p=pathlib.Path(sys.argv[1])\n",
            "print('boom: the real reason', flush=True)\n",
            "print('{\"schema\":\"pipeline_stage_observation_v1\",\"schema_version\":1,\"job_id\":\"someone-else\",",
            "\"seq\":1,\"ts\":\"2026-10-24T00:00:00Z\",\"user_stage\":\"translation\",\"stage\":\"translating\",",
            "\"substage\":\"translation_batches\",\"event_type\":\"stage_progress\",\"message\":\"batch 1/2\",",
            "\"progress_current\":1,\"progress_total\":2,\"progress_unit\":\"batch\",\"payload\":{}}', flush=True)\n",
            "for i in range(60):\n",
            "    p.open('a').write('tick\\n')\n",
            "    try:\n",
            "        print('line', i, flush=True)\n",
            "    except Exception:\n",
            "        pass\n",
            "    time.sleep(0.2)\n",
        )
        .into(),
        marker.to_string_lossy().into_owned(),
    ];
    fx.deps.db.save_job(&job).unwrap();
    let handle = spawn_job_with_workflow(
        fx.deps.clone(),
        job.job_id.clone(),
        |deps, job| async move {
            super::super::process_runner::execute_process_job(deps, job, &[]).await
        },
    )
    .unwrap();

    tokio::time::timeout(std::time::Duration::from_secs(5), handle)
        .await
        .expect("读取任务出错以后 driver 必须很快收尾，而不是陪 worker 跑到结束")
        .unwrap();
    let stored = fx.deps.db.get_job("reader-fails").unwrap();
    assert_eq!(stored.status, JobStatusKind::Failed);
    let error = stored.error.clone().unwrap_or_default();
    assert!(error.contains("job mismatch"), "失败原因要是读取任务的错误: {error}");
    // 落失败时从库里重读任务：出错前读到、还在节流里没写的行要先补写进去（失败页拿 log_tail 兜底显示报错）。
    assert!(
        stored.log_tail.iter().any(|line| line == "boom: the real reason"),
        "{:?}",
        stored.log_tail
    );
    let ticks = || {
        std::fs::read_to_string(&marker)
            .map(|text| text.lines().count())
            .unwrap_or(0)
    };
    let after = ticks();
    tokio::time::sleep(std::time::Duration::from_millis(800)).await;
    assert_eq!(ticks(), after, "worker 进程必须已被终止，不能继续干活");
}

/// worker 打完最后几行马上以非 0 退出：任务落失败以后 log_tail 里有这几行（往往就是报错原因）。
#[tokio::test]
async fn last_lines_before_a_failing_exit_reach_log_tail() {
    let fx = Fixture::new(1);
    let mut job = fx.job("fails-fast", JobStatusKind::Queued);
    job.command = vec![
        "python3".into(),
        "-c".into(),
        "import sys\nfor i in range(50): print('progress', i)\nprint('Traceback: the last line', flush=True)\nsys.exit(3)".into(),
    ];
    fx.deps.db.save_job(&job).unwrap();
    let handle = spawn_job_with_workflow(
        fx.deps.clone(),
        job.job_id.clone(),
        |deps, job| async move {
            super::super::process_runner::execute_process_job(deps, job, &[]).await
        },
    )
    .unwrap();
    handle.await.unwrap();
    let stored = fx.deps.db.get_job("fails-fast").unwrap();
    assert_eq!(stored.status, JobStatusKind::Failed);
    assert!(
        stored.log_tail.iter().any(|line| line == "Traceback: the last line"),
        "{:?}",
        stored.log_tail
    );
}

/// worker 打完一行就不出声（卡住、在等上游）：这一行也要在合并窗口（500ms）过后进库，
/// 不能等到下一行或者进程退出。
#[tokio::test]
async fn a_quiet_worker_still_gets_its_last_line_persisted() {
    let fx = Fixture::new(1);
    let mut job = fx.job("goes-quiet", JobStatusKind::Queued);
    job.command = vec![
        "python3".into(),
        "-c".into(),
        "import time\nprint('waiting for upstream', flush=True)\ntime.sleep(3)".into(),
    ];
    fx.deps.db.save_job(&job).unwrap();
    let handle = spawn_job_with_workflow(
        fx.deps.clone(),
        job.job_id.clone(),
        |deps, job| async move {
            super::super::process_runner::execute_process_job(deps, job, &[]).await
        },
    )
    .unwrap();
    let mut seen = false;
    for _ in 0..30 {
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        let stored = fx.deps.db.get_job("goes-quiet").unwrap();
        if stored.log_tail.iter().any(|line| line == "waiting for upstream") {
            seen = true;
            break;
        }
    }
    assert!(seen, "worker 不出声 1.5 秒以后，它打的最后一行还没进库");
    handle.await.unwrap();
}

/// worker 打出一行不是 UTF-8 的字节，任务照样成功（按替换字符解码），不再让读取任务报错退出。
#[tokio::test]
async fn non_utf8_stdout_does_not_fail_the_job() {
    let fx = Fixture::new(1);
    let mut job = fx.job("non-utf8", JobStatusKind::Queued);
    job.command = vec![
        "python3".into(),
        "-c".into(),
        "import sys; sys.stdout.buffer.write(b'before\\n\\xff\\xfe bad bytes\\nafter\\n'); sys.stdout.flush()".into(),
    ];
    fx.deps.db.save_job(&job).unwrap();
    let handle = spawn_job_with_workflow(
        fx.deps.clone(),
        job.job_id.clone(),
        |deps, job| async move {
            super::super::process_runner::execute_process_job(deps, job, &[]).await
        },
    )
    .unwrap();
    handle.await.unwrap();
    let stored = fx.deps.db.get_job("non-utf8").unwrap();
    assert_eq!(stored.status, JobStatusKind::Succeeded, "error: {:?}", stored.error);
    assert!(stored.log_tail.iter().any(|line| line == "\u{fffd}\u{fffd} bad bytes"), "{:?}", stored.log_tail);
    assert_eq!(stored.log_tail.last().map(String::as_str), Some("after"));
}

/// 取消标记在队列门被消费掉之后，任务必须落终态，不能挂着。
///
/// `wait_for_execution_slot` 命中标记会清掉它并返回 None，driver 随即退出。
/// 正常取消路径靠 `cancel_job` 紧接着的 CAS 写兜底，但取消 OCR 任务时 `cancel_job`
/// 在 `stage != "queued"` 时一个字都不写 DB——于是没人收尾，任务永久卡在
/// queued/running 且再无 driver 驱动，用户看到永久转圈、连重跑都点不了。
///
/// 反证方式：把 `run_job` 里 `None => { persist_canceled_job(..)?; .. }` 退回
/// `None => return Ok(())`，这个测试必须变红——行会停在 Queued。
#[tokio::test]
async fn consumed_cancel_flag_still_lands_a_terminal_state() {
    let fx = Fixture::new(1);
    let job = fx.job("job-consumed-flag", JobStatusKind::Queued);

    // 模拟取消 OCR 任务 + stage != "queued"：只塞注册表，不写 DB。
    super::super::cancel_registry::request_cancel_with_registry(
        fx.deps.canceled_jobs.as_ref(),
        &job.job_id,
    )
    .await;

    let handle = spawn_job_with_workflow(fx.deps.clone(), job.job_id.clone(), succeeded);
    if let Some(h) = handle {
        let _ = h.await;
    }

    let after = fx.deps.db.get_job(&job.job_id).unwrap();
    assert_eq!(
        after.status,
        JobStatusKind::Canceled,
        "取消标记被队列门消费掉之后，必须有人落终态；停在 {:?} 就是永久挂起",
        after.status
    );
    assert!(
        !super::super::cancel_registry::is_cancel_requested_with_registry(
            fx.deps.canceled_jobs.as_ref(),
            &job.job_id,
        )
        .await,
        "标记应当已被清除"
    );
}

/// 取消在「等待执行槽位」期间到达时，同样必须落终态。
///
/// 这条走的是 `wait_for_execution_slot` 里的取消分支，和上面那个测试不是同一处出口：
/// `should_skip_job_execution` 在 job 启动的一瞬间只查一次，之后 job 可能在队列里
/// 等很久，取消完全可能落在这段窗口里。队列门命中标记后同样会**清掉标记并返回
/// None**，若无人收尾，任务就永久挂着。
///
/// 做法：先把唯一的槽位占掉，让 job 卡在轮询循环里，再塞取消标记。
///
/// 反证方式：把 `run_job` 里 `None => { persist_canceled_job(..)?; .. }` 退回
/// `None => return Ok(())`，这个测试必须变红。
#[tokio::test]
async fn cancel_while_waiting_for_a_slot_still_lands_a_terminal_state() {
    let fx = Fixture::new(1);
    let job = fx.job("job-canceled-in-queue", JobStatusKind::Queued);

    // 占住唯一的槽位，逼 job 停在 wait_for_execution_slot 的轮询里。
    let hold = fx.deps.job_slots.clone().acquire_owned().await.unwrap();

    let handle = spawn_job_with_workflow(fx.deps.clone(), job.job_id.clone(), succeeded);

    // 让它先跑过 should_skip_job_execution，确保确实是在队列门里等。
    tokio::time::sleep(std::time::Duration::from_millis(60)).await;
    assert_eq!(
        fx.deps.db.get_job(&job.job_id).unwrap().status,
        JobStatusKind::Queued,
        "此刻应当已经进入排队状态"
    );

    super::super::cancel_registry::request_cancel_with_registry(
        fx.deps.canceled_jobs.as_ref(),
        &job.job_id,
    )
    .await;

    if let Some(h) = handle {
        let _ = tokio::time::timeout(std::time::Duration::from_secs(5), h).await;
    }
    drop(hold);

    let after = fx.deps.db.get_job(&job.job_id).unwrap();
    assert_eq!(
        after.status,
        JobStatusKind::Canceled,
        "队列门消费掉标记之后必须落终态；停在 {:?} 就是永久挂起",
        after.status
    );
}

// ── 运行代次：取消后立刻原地重跑，旧 driver 的收尾不许碰新的一次运行 ─────────────

/// 模拟 `cancel_job` 的非 OCR 路径：读最新行，CAS 写 Canceled（期望 queued/running）。
fn api_cancel(fx: &Fixture, id: &str) -> bool {
    let mut job = fx.deps.db.get_job(id).unwrap();
    job.status = JobStatusKind::Canceled;
    job.stage = Some("canceled".into());
    job.finished_at = Some(now_iso());
    job.sync_runtime_state();
    cas_persist_job_with_resources(
        fx.deps.db.as_ref(),
        &fx.deps.persist.data_root,
        &fx.deps.persist.output_root,
        &job,
        &["queued", "running"],
    )
    .unwrap()
}

/// 模拟 `relaunch_in_place`：把行重置为 Queued，整行落库并开启新的一次运行。
fn relaunch_in_place_like(fx: &Fixture, id: &str) {
    let mut job = fx.deps.db.get_job(id).unwrap();
    job.status = JobStatusKind::Queued;
    job.stage = Some("queued".into());
    job.finished_at = None;
    job.error = None;
    job.sync_runtime_state();
    crate::job_events::persist_job_as_new_run_with_resources(
        fx.deps.db.as_ref(),
        &fx.deps.persist.data_root,
        &fx.deps.persist.output_root,
        &job,
    )
    .unwrap();
}

/// 取消 → 立刻原地重跑：旧 driver 还在收尾（登记表里还有它），新的发射不能被丢掉，
/// 旧 driver 最后那次 CAS 也不能把新一次运行的 Queued 行盖成它自己的 Canceled。
///
/// 反证：去掉 `cas_save_job` 的代次比对、或让 `claim` 对老代次 driver 直接拒绝，这个测试变红。
#[tokio::test]
async fn cancel_then_immediate_relaunch_old_driver_never_touches_the_new_run() {
    let fx = Fixture::new(2);
    fx.job("rerun", JobStatusKind::Queued);
    let old_entered = Arc::new(Notify::new());
    let old_release = Arc::new(Notify::new());
    let (entered, release) = (old_entered.clone(), old_release.clone());
    let old = spawn_job_with_workflow(fx.deps.clone(), "rerun".into(), move |_, mut job| async move {
        entered.notify_one();
        release.notified().await;
        // 被取消的旧运行，收尾时带回的是 Canceled 快照。
        job.status = JobStatusKind::Canceled;
        Ok(job)
    })
    .unwrap();
    old_entered.notified().await;

    assert!(api_cancel(&fx, "rerun"), "API 取消先赢终态 CAS");
    relaunch_in_place_like(&fx, "rerun");

    let new_runs = Arc::new(AtomicUsize::new(0));
    let new_entered = Arc::new(Notify::new());
    let new_release = Arc::new(Notify::new());
    let (runs, entered, release) = (new_runs.clone(), new_entered.clone(), new_release.clone());
    let new = spawn_job_with_workflow(fx.deps.clone(), "rerun".into(), move |deps, job| async move {
        runs.fetch_add(1, Ordering::SeqCst);
        entered.notify_one();
        release.notified().await;
        succeeded(deps, job).await
    });
    let new = new.expect("旧 driver 还在收尾时重跑的发射不能被丢弃");

    // 旧 driver 此刻才收尾：它的终态 CAS 必须落空，行仍是新一次运行的 Queued。
    old_release.notify_one();
    old.await.unwrap();
    assert_ne!(
        fx.deps.db.get_job("rerun").unwrap().status,
        JobStatusKind::Canceled,
        "旧运行的 Canceled 快照盖掉了新一次运行"
    );

    new_entered.notified().await;
    assert_eq!(new_runs.load(Ordering::SeqCst), 1);
    new_release.notify_one();
    new.await.unwrap();
    assert_eq!(
        fx.deps.db.get_job("rerun").unwrap().status,
        JobStatusKind::Succeeded
    );
}

/// 旧 driver 在任务被重跑之后又 `get_job` 重读了一次行（深处的阶段代码常这么写）：
/// 重读到的快照带着新一次运行的代次，但 driver 的写仍钉在它自己那次运行上，必须落空。
#[tokio::test]
async fn a_superseded_driver_that_reloads_the_job_still_cannot_write() {
    let fx = Fixture::new(2);
    fx.job("reload", JobStatusKind::Queued);
    let entered = Arc::new(Notify::new());
    let release = Arc::new(Notify::new());
    let (e, r) = (entered.clone(), release.clone());
    let wrote = Arc::new(std::sync::Mutex::new(None));
    let wrote_in_driver = wrote.clone();
    let old = spawn_job_with_workflow(fx.deps.clone(), "reload".into(), move |deps, job| async move {
        e.notify_one();
        r.notified().await;
        let mut reloaded = deps.db.get_job("reload").unwrap();
        reloaded.status = JobStatusKind::Failed;
        reloaded.sync_runtime_state();
        let updated = cas_persist_job_with_resources(
            deps.db.as_ref(),
            &deps.persist.data_root,
            &deps.persist.output_root,
            &reloaded,
            &["queued", "running"],
        )
        .unwrap();
        *wrote_in_driver.lock().unwrap() = Some(updated);
        Ok(job)
    })
    .unwrap();
    entered.notified().await;
    assert!(api_cancel(&fx, "reload"));
    relaunch_in_place_like(&fx, "reload");
    release.notify_one();
    old.await.unwrap();
    assert_eq!(*wrote.lock().unwrap(), Some(false), "旧 driver 重读后的写居然成功了");
    assert_eq!(fx.deps.db.get_job("reload").unwrap().status, JobStatusKind::Queued);
}

/// 成功后立刻原地重跑：旧 driver 赢了终态 CAS 之后还在善后，新一次运行的发射同样不能丢。
#[tokio::test]
async fn relaunch_while_previous_driver_is_still_finishing_is_not_dropped() {
    let fx = Fixture::new(2);
    fx.job("after-success", JobStatusKind::Queued);
    let old = spawn_job_with_workflow(fx.deps.clone(), "after-success".into(), succeeded).unwrap();
    // 不让 tokio 调度旧 driver：它的 guard 已经登记了，等同于「善后中」。
    relaunch_in_place_like(&fx, "after-success");
    let runs = Arc::new(AtomicUsize::new(0));
    let counter = runs.clone();
    let new = spawn_job_with_workflow(fx.deps.clone(), "after-success".into(), move |deps, job| async move {
        counter.fetch_add(1, Ordering::SeqCst);
        succeeded(deps, job).await
    })
    .expect("重跑的发射不能因旧 driver 还登记着而被丢弃");
    old.await.unwrap();
    new.await.unwrap();
    assert_eq!(runs.load(Ordering::SeqCst), 1, "新一次运行必须真的跑一遍");
    assert_eq!(
        fx.deps.db.get_job("after-success").unwrap().status,
        JobStatusKind::Succeeded
    );
}

// ── API 取消先赢终态 CAS：pipeline attempt 要被收尾 ────────────────────────────────

fn running_attempt(fx: &Fixture, id: &str) {
    fx.deps
        .db
        .acquire_pipeline_attempt(id, "worker-1", "translate", 1)
        .unwrap();
    assert!(fx.deps.db.has_running_pipeline_attempt(id).unwrap());
}

/// driver 的 workflow 正常返回（带回 Canceled 快照），但 API 的取消已经先落了终态：
/// driver 走 `!updated` 分支，必须把这次运行的 attempt 收尾，否则它永远是 running，
/// 之后的译文修订登记一直 pending。
#[tokio::test]
async fn api_cancel_winning_the_cas_still_closes_the_attempt_on_the_normal_exit() {
    let fx = Fixture::new(1);
    fx.job("cancel-attempt", JobStatusKind::Queued);
    let entered = Arc::new(Notify::new());
    let release = Arc::new(Notify::new());
    let (e, r) = (entered.clone(), release.clone());
    let fx_ref = &fx;
    let handle = spawn_job_with_workflow(fx.deps.clone(), "cancel-attempt".into(), move |deps, mut job| async move {
        deps.db
            .acquire_pipeline_attempt("cancel-attempt", "worker-1", "translate", 1)
            .unwrap();
        e.notify_one();
        r.notified().await;
        job.status = JobStatusKind::Canceled;
        Ok(job)
    })
    .unwrap();
    entered.notified().await;
    assert!(fx_ref.deps.db.has_running_pipeline_attempt("cancel-attempt").unwrap());
    assert!(api_cancel(&fx, "cancel-attempt"));
    release.notify_one();
    handle.await.unwrap();
    assert!(
        !fx.deps.db.has_running_pipeline_attempt("cancel-attempt").unwrap(),
        "API 取消赢了 CAS 之后，attempt 仍是 running"
    );
}

/// 同上，但 workflow 以错误退出（被杀的 worker 常见）：错误分支看到行已是 Canceled 就跳过，
/// 同样不能把 attempt 留成 running。
#[tokio::test]
async fn api_cancel_winning_the_cas_still_closes_the_attempt_on_the_error_exit() {
    let fx = Fixture::new(1);
    fx.job("cancel-attempt-err", JobStatusKind::Queued);
    let entered = Arc::new(Notify::new());
    let release = Arc::new(Notify::new());
    let (e, r) = (entered.clone(), release.clone());
    let handle = spawn_job_with_workflow(fx.deps.clone(), "cancel-attempt-err".into(), move |deps, _| async move {
        deps.db
            .acquire_pipeline_attempt("cancel-attempt-err", "worker-1", "translate", 1)
            .unwrap();
        e.notify_one();
        r.notified().await;
        anyhow::bail!("worker killed")
    })
    .unwrap();
    entered.notified().await;
    assert!(api_cancel(&fx, "cancel-attempt-err"));
    release.notify_one();
    handle.await.unwrap();
    assert!(
        !fx.deps.db.has_running_pipeline_attempt("cancel-attempt-err").unwrap(),
        "错误退出时 attempt 仍是 running"
    );
    let _ = running_attempt;
}

// ── 取消标记不跨运行泄漏 ─────────────────────────────────────────────────────

/// 对没有 driver 的任务点取消：API 自己 CAS 落 Canceled，内存里的标记没人消费，留了下来。
/// 随后原地重跑——新一次运行不能被这个旧标记立刻取消。
#[tokio::test]
async fn cancel_flag_left_by_a_driverless_cancel_does_not_cancel_the_next_run() {
    let fx = Fixture::new(1);
    fx.job("leaky", JobStatusKind::Running);
    // cancel_job：登记标记 + CAS 落终态；这个任务没有 driver，没人会清标记。
    super::super::cancel_registry::request_cancel_with_registry(
        fx.deps.canceled_jobs.as_ref(),
        "leaky",
    )
    .await;
    assert!(api_cancel(&fx, "leaky"));

    relaunch_in_place_like(&fx, "leaky");
    let runs = Arc::new(AtomicUsize::new(0));
    let counter = runs.clone();
    launch_job_with_workflow(fx.deps.clone(), "leaky".into(), move |deps, job| async move {
        counter.fetch_add(1, Ordering::SeqCst);
        succeeded(deps, job).await
    })
    .await
    .unwrap();

    assert_eq!(runs.load(Ordering::SeqCst), 1, "新一次运行被上一次遗留的取消标记吃掉了");
    assert_eq!(
        fx.deps.db.get_job("leaky").unwrap().status,
        JobStatusKind::Succeeded
    );
}

/// 重复发射仍然去重（`launch_job` 只是先清标记，不绕过登记表）。
#[tokio::test]
async fn launch_job_still_deduplicates_by_driver_registry() {
    let fx = Fixture::new(1);
    fx.job("dup", JobStatusKind::Queued);
    let hold = fx.deps.job_slots.clone().acquire_owned().await.unwrap();
    let runs = Arc::new(AtomicUsize::new(0));
    let mut handles = Vec::new();
    for _ in 0..5 {
        let counter = runs.clone();
        handles.push(launch_job_with_workflow(
            fx.deps.clone(),
            "dup".into(),
            move |deps, job| async move {
                counter.fetch_add(1, Ordering::SeqCst);
                succeeded(deps, job).await
            },
        ));
    }
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    drop(hold);
    for handle in handles {
        handle.await.unwrap();
    }
    assert_eq!(runs.load(Ordering::SeqCst), 1);
}

// ── 发射丢了：运行期巡检 ──────────────────────────────────────────────────────────

fn age(fx: &Fixture, id: &str, updated_at: &str) {
    let mut job = fx.deps.db.get_job(id).unwrap();
    job.updated_at = updated_at.to_string();
    // save_job 不动代次；直接整行写回，只改 updated_at。
    fx.deps.db.save_job(&job).unwrap();
}

const LONG_AGO: &str = "2020-01-01T00:00:00Z";

/// 发射丢了（队列里没有 driver）的 queued 任务：巡检重新发射，真的把它跑完。
#[tokio::test]
async fn sweep_relaunches_a_queued_job_whose_launch_was_lost() {
    let fx = Fixture::new(1);
    fx.job("lost", JobStatusKind::Queued);
    age(&fx, "lost", LONG_AGO);

    let handles = Arc::new(std::sync::Mutex::new(Vec::new()));
    let sink = handles.clone();
    let handled = super::super::driverless_sweep::sweep_driverless_jobs_with(
        &fx.deps,
        std::time::Duration::from_secs(30),
        move |deps, job_id| {
            sink.lock()
                .unwrap()
                .push(spawn_job_with_workflow(deps, job_id, succeeded).unwrap());
        },
    )
    .unwrap();
    assert_eq!(handled, 1);
    let handle = handles.lock().unwrap().pop().unwrap();
    handle.await.unwrap();
    assert_eq!(
        fx.deps.db.get_job("lost").unwrap().status,
        JobStatusKind::Succeeded
    );
}

/// 巡检不碰：有 driver 在管的、刚落库还在宽限期内的、已终态的。
#[tokio::test]
async fn sweep_leaves_owned_fresh_and_terminal_jobs_alone() {
    let fx = Fixture::new(1);
    // 有 driver 在管（排队等槽位）。
    fx.job("owned", JobStatusKind::Queued);
    age(&fx, "owned", LONG_AGO);
    let hold = fx.deps.job_slots.clone().acquire_owned().await.unwrap();
    let owner = spawn_job_with_workflow(fx.deps.clone(), "owned".into(), succeeded).unwrap();
    tokio::task::yield_now().await;
    // 宽限期内。
    fx.job("fresh", JobStatusKind::Queued);
    // 终态。
    fx.job("done", JobStatusKind::Succeeded);
    age(&fx, "done", LONG_AGO);

    let handled = super::super::driverless_sweep::sweep_driverless_jobs_with(
        &fx.deps,
        std::time::Duration::from_secs(30),
        |_, job_id| panic!("sweep must not launch {job_id}"),
    )
    .unwrap();
    assert_eq!(handled, 0);
    assert_eq!(fx.deps.db.get_job("fresh").unwrap().status, JobStatusKind::Queued);
    assert_eq!(fx.deps.db.get_job("done").unwrap().status, JobStatusKind::Succeeded);
    drop(hold);
    owner.await.unwrap();
}

/// running 但没有 driver、worker 也不在了：落失败（和启动恢复同一套规则），而不是永远转圈。
#[tokio::test]
async fn sweep_fails_a_running_job_with_no_driver_and_no_worker() {
    let fx = Fixture::new(1);
    fx.job("zombie", JobStatusKind::Running);
    age(&fx, "zombie", LONG_AGO);
    let handled = super::super::driverless_sweep::sweep_driverless_jobs_with(
        &fx.deps,
        std::time::Duration::from_secs(30),
        |_, job_id| panic!("sweep must not launch {job_id}"),
    )
    .unwrap();
    assert_eq!(handled, 1);
    let job = fx.deps.db.get_job("zombie").unwrap();
    assert_eq!(job.status, JobStatusKind::Failed);
    assert!(job.error.is_some());
}

/// 有 driver 的 running 任务不能被巡检判成失败（driver 在跑，行的 updated_at 再旧也一样）。
#[tokio::test]
async fn sweep_does_not_fail_a_running_job_that_has_a_driver() {
    let fx = Fixture::new(1);
    fx.job("alive", JobStatusKind::Running);
    age(&fx, "alive", LONG_AGO);
    let _guard = fx.deps.job_drivers.claim("alive", 0).unwrap();
    let handled = super::super::driverless_sweep::sweep_driverless_jobs_with(
        &fx.deps,
        std::time::Duration::from_secs(30),
        |_, job_id| panic!("sweep must not launch {job_id}"),
    )
    .unwrap();
    assert_eq!(handled, 0);
    assert_eq!(fx.deps.db.get_job("alive").unwrap().status, JobStatusKind::Running);
}

/// 发射交不出去（壳转发给 jobsd 重试后仍失败）：queued 的任务落成失败并写清原因；
/// 已经有 driver 动过的不碰。
#[tokio::test]
async fn unlaunched_job_is_failed_with_a_clear_reason_but_only_while_queued() {
    let fx = Fixture::new(1);
    fx.job("undelivered", JobStatusKind::Queued);
    assert!(fail_unlaunched_job(&fx.deps, "undelivered", "任务服务不可用").unwrap());
    let job = fx.deps.db.get_job("undelivered").unwrap();
    assert_eq!(job.status, JobStatusKind::Failed);
    assert!(job.error.as_deref().unwrap().contains("任务服务不可用"), "{:?}", job.error);

    fx.job("running-now", JobStatusKind::Running);
    assert!(!fail_unlaunched_job(&fx.deps, "running-now", "x").unwrap());
    assert_eq!(fx.deps.db.get_job("running-now").unwrap().status, JobStatusKind::Running);
}

// ── 任务成功后 active_job_id 换不换 ────────────────────────────────────────

fn seed_document(fx: &Fixture) -> String {
    let upload = crate::models::domain::UploadRecord {
        upload_id: "up-1".into(),
        filename: "book.pdf".into(),
        stored_path: "uploads/up-1/book.pdf".into(),
        bytes: 1,
        page_count: 10,
        uploaded_at: crate::models::domain::now_iso(),
        developer_mode: false,
        content_hash: "d".repeat(64),
    };
    fx.deps.db.save_upload(&upload).unwrap();
    fx.deps.db.upsert_document_from_upload(&upload).unwrap();
    "d".repeat(64)
}

fn document_job(fx: &Fixture, id: &str, created_at: &str, workflow: WorkflowKind, status: JobStatusKind) -> JobSnapshot {
    let mut job = JobSnapshot::new(id.into(), CreateJobInput::default(), vec!["fake-worker".into()]);
    job.status = status;
    job.workflow = workflow;
    job.created_at = created_at.into();
    job.upload_id = Some("up-1".into());
    fx.deps.db.save_job(&job).unwrap();
    fx.deps.db.link_job_to_document(id, "up-1").unwrap();
    job
}

fn active(fx: &Fixture, document_id: &str) -> Option<String> {
    fx.deps.db.get_document(document_id).unwrap().active_job_id
}

#[test]
fn an_older_job_finishing_while_a_newer_one_runs_keeps_the_newer_on_the_card() {
    // 先提交 1-5 页（old），再提交 6-10 页（new）。new 提交时指针给了它；old 先完成。
    let fx = Fixture::new(1);
    let document_id = seed_document(&fx);
    let old = document_job(&fx, "old", "2026-10-01T00:00:00", WorkflowKind::Book, JobStatusKind::Succeeded);
    document_job(&fx, "new", "2026-10-02T00:00:00", WorkflowKind::Book, JobStatusKind::Running);
    fx.deps.db.set_document_active_job(&document_id, "new", None).unwrap();

    update_document_after_job(&fx.deps, &old.into_runtime());

    assert_eq!(active(&fx, &document_id).as_deref(), Some("new"), "旧任务后完成，把正在跑的新任务顶掉了");
}

#[test]
fn an_ocr_job_finishing_does_not_hide_the_translation_from_the_card() {
    let fx = Fixture::new(1);
    let document_id = seed_document(&fx);
    document_job(&fx, "translation", "2026-10-01T00:00:00", WorkflowKind::Book, JobStatusKind::Succeeded);
    let ocr = document_job(&fx, "ocr", "2026-10-02T00:00:00", WorkflowKind::Ocr, JobStatusKind::Succeeded);
    fx.deps.db.set_document_active_job(&document_id, "ocr", None).unwrap();

    update_document_after_job(&fx.deps, &ocr.into_runtime());

    assert_eq!(active(&fx, &document_id).as_deref(), Some("translation"));
}

#[test]
fn a_newer_job_finishing_takes_the_card_as_before() {
    let fx = Fixture::new(1);
    let document_id = seed_document(&fx);
    document_job(&fx, "old", "2026-10-01T00:00:00", WorkflowKind::Book, JobStatusKind::Succeeded);
    let new = document_job(&fx, "new", "2026-10-02T00:00:00", WorkflowKind::Book, JobStatusKind::Succeeded);
    fx.deps.db.set_document_active_job(&document_id, "old", None).unwrap();

    update_document_after_job(&fx.deps, &new.into_runtime());

    assert_eq!(active(&fx, &document_id).as_deref(), Some("new"));
}

// ── 没有 upload_id 的派生任务（重新渲染 / 重试 / 继续）结束后的维护 ──────────────

/// 派生任务只带 artifact_job_id；提交时已经继承了 jobs.document_id（job_launcher）。
fn derived_job(fx: &Fixture, document_id: &str, id: &str, created_at: &str, status: JobStatusKind) -> JobSnapshot {
    let mut job = JobSnapshot::new(id.into(), CreateJobInput::default(), vec!["fake-worker".into()]);
    job.status = status;
    job.workflow = WorkflowKind::Render;
    job.created_at = created_at.into();
    job.upload_id = None;
    job.request_payload.source.artifact_job_id = "old".into();
    fx.deps.db.save_job(&job).unwrap();
    fx.deps.db.set_job_document_id(id, document_id).unwrap();
    job
}

#[test]
fn a_derived_job_without_upload_id_still_takes_the_card_and_rebuilds_the_index() {
    let fx = Fixture::new(1);
    let document_id = seed_document(&fx);
    document_job(&fx, "old", "2026-10-01T00:00:00", WorkflowKind::Book, JobStatusKind::Succeeded);
    fx.deps.db.set_document_active_job(&document_id, "old", None).unwrap();
    // 旧任务留下的索引行：派生任务成功后必须按整本书重建（这里没有产物文件，重建后为空）。
    fx.deps
        .db
        .replace_document_fts(
            &document_id,
            "old",
            &[crate::models::api::FtsBlockRow {
                page_idx: 0,
                block_id: "p001-b0000".into(),
                source_text: "stale source".into(),
                translated_text: "过期的旧索引".into(),
            }],
        )
        .unwrap();
    let render = derived_job(&fx, &document_id, "render", "2026-10-02T00:00:00", JobStatusKind::Succeeded);

    update_document_after_job(&fx.deps, &render.into_runtime());

    assert_eq!(active(&fx, &document_id).as_deref(), Some("render"), "没有 upload_id 的任务成功后没纠正书卡");
    assert!(
        fx.deps.db.search_blocks("过期的旧索引", 10, None).unwrap().is_empty(),
        "没有 upload_id 的任务成功后没重建全文索引"
    );
}

#[tokio::test]
async fn a_failed_derived_job_hands_the_card_back_to_the_last_success() {
    let fx = Fixture::new(1);
    let document_id = seed_document(&fx);
    let mut old = document_job(&fx, "old", "2026-10-01T00:00:00", WorkflowKind::Book, JobStatusKind::Succeeded);
    old.finished_at = Some("2026-10-01T01:00:00".into());
    fx.deps.db.save_job(&old).unwrap();

    // 1) workflow 正常返回 Failed（run_job 的出口）。
    let failed = derived_job(&fx, &document_id, "retry-a", "2026-10-02T00:00:00", JobStatusKind::Failed);
    fx.deps.db.set_document_active_job(&document_id, "retry-a", None).unwrap();
    update_document_after_job(&fx.deps, &failed.into_runtime());
    assert_eq!(active(&fx, &document_id).as_deref(), Some("old"), "失败的重试把书卡留在了失败任务上");

    // 2) workflow 报错（spawn_job_with_workflow → persist_failed_job 的出口）。
    derived_job(&fx, &document_id, "retry-b", "2026-10-03T00:00:00", JobStatusKind::Queued);
    fx.deps.db.set_document_active_job(&document_id, "retry-b", None).unwrap();
    spawn_job_with_workflow(fx.deps.clone(), "retry-b".into(), |_, _| async {
        anyhow::bail!("synthetic failure")
    })
    .unwrap()
    .await
    .unwrap();
    assert_eq!(fx.deps.db.get_job("retry-b").unwrap().status, JobStatusKind::Failed);
    assert_eq!(active(&fx, &document_id).as_deref(), Some("old"), "报错退出的重试把书卡留在了失败任务上");

    // 3) 指针已被别的任务接走时不动。
    derived_job(&fx, &document_id, "retry-c", "2026-10-04T00:00:00", JobStatusKind::Failed);
    derived_job(&fx, &document_id, "newer", "2026-10-05T00:00:00", JobStatusKind::Running);
    fx.deps.db.set_document_active_job(&document_id, "newer", None).unwrap();
    update_document_after_job(&fx.deps, &fx.deps.db.get_job("retry-c").unwrap().into_runtime());
    assert_eq!(active(&fx, &document_id).as_deref(), Some("newer"));
}

/// 经 API 取消已过排队阶段的 OCR 任务时 API 不写 DB,由 runner 的取消检查点自己落 Canceled;
/// driver 最后的 CAS 没更新就退出 —— 以前这里不碰书卡,书卡停在被取消的任务上。
#[tokio::test]
async fn a_job_canceled_by_its_own_runner_checkpoint_hands_the_card_back() {
    let fx = Fixture::new(1);
    let document_id = seed_document(&fx);
    let mut old = document_job(&fx, "old", "2026-10-01T00:00:00", WorkflowKind::Book, JobStatusKind::Succeeded);
    old.finished_at = Some("2026-10-01T01:00:00".into());
    fx.deps.db.save_job(&old).unwrap();
    derived_job(&fx, &document_id, "ocr-redo", "2026-10-02T00:00:00", JobStatusKind::Queued);
    fx.deps.db.set_document_active_job(&document_id, "ocr-redo", None).unwrap();

    spawn_job_with_workflow(fx.deps.clone(), "ocr-redo".into(), |deps, mut job| async move {
        // runner 的取消检查点:自己 CAS 落 Canceled,再把同样的终态返回给 driver。
        job.status = JobStatusKind::Canceled;
        job.stage = Some("canceled".into());
        assert!(cas_persist_job_with_resources(
            deps.db.as_ref(),
            &deps.persist.data_root,
            &deps.persist.output_root,
            &job.snapshot(),
            &["queued", "running"],
        )?);
        Ok(job)
    })
    .unwrap()
    .await
    .unwrap();

    assert_eq!(fx.deps.db.get_job("ocr-redo").unwrap().status, JobStatusKind::Canceled);
    assert_eq!(
        active(&fx, &document_id).as_deref(),
        Some("old"),
        "runner 自己落定的取消没有把书卡退回上一个成功任务"
    );
}

/// 名额按排队先后给：以前每个排队的 driver 每 250ms `try_acquire` 一次，名额空出来时谁那一轮先醒谁拿到，
/// 先排的不一定先跑；现在挂在信号量的等待队列上，先来先跑。
///
/// 反证方式：把 `wait_for_execution_slot` 退回每轮 `try_acquire_owned` 加 sleep，这条应当变红（五个任务的
/// 开跑顺序按各自轮询的相位打乱）。
#[tokio::test]
async fn queued_jobs_start_in_the_order_they_were_queued() {
    let fx = Fixture::new(1);
    let hold = fx.deps.job_slots.clone().acquire_owned().await.unwrap();
    let started = Arc::new(std::sync::Mutex::new(Vec::new()));
    let mut handles = Vec::new();
    let ids: Vec<String> = (0..5).map(|index| format!("job-fifo-{index}")).collect();
    for id in &ids {
        fx.job(id, JobStatusKind::Queued);
        let started = started.clone();
        let handle = spawn_job_with_workflow(fx.deps.clone(), id.clone(), move |deps, job| async move {
            started.lock().unwrap().push(job.job_id.clone());
            // 占一会儿名额，让后面的都还在排队。
            tokio::time::sleep(std::time::Duration::from_millis(30)).await;
            succeeded(deps, job).await
        })
        .expect("driver");
        handles.push(handle);
        // 错开登记时间，排队先后就是 ids 的顺序。
        tokio::time::sleep(std::time::Duration::from_millis(70)).await;
    }

    drop(hold);
    for handle in handles {
        tokio::time::timeout(std::time::Duration::from_secs(20), handle)
            .await
            .expect("every queued job runs")
            .unwrap();
    }
    assert_eq!(*started.lock().unwrap(), ids);
}
