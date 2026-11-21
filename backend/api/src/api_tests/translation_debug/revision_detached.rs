//! 修订写回的子进程不随请求一起死:客户端断开(处理函数的 future 被丢弃)时,
//! 子进程照样把这一次写回做完。
//!
//! 写回走真实的 `retainpdf-pipeline translation-revise`,只是在「页文件已改、
//! checkpoint 还没写」的窗口里让它多睡一会儿——正是旧实现里 `kill_on_drop`
//! 把进程 SIGKILL 掉、页文件领先 checkpoint 的那一段。

use std::fs;
use std::path::Path;
use std::time::{Duration, Instant};

use axum::http::StatusCode;
use serde_json::json;

use crate::api_tests::jobs_common::test_state;
use crate::models::JobStatusKind;
use crate::test_support::python::project_venv_bin;

use super::revisions::{
    checkpoint, patch_item, python_path, render_loader_text, seed_committed_job,
    state_with_pipeline_command, ITEM_ID, REVISED_TEXT,
};

/// 假子命令:先在窗口里留个记号再睡 `sleep_secs` 秒,然后接着跑真实的 checkpoint 写入。
fn slow_pipeline(root: &Path, marker: &Path, sleep_secs: f64) -> String {
    let script = root.join("slow_revise.py");
    fs::write(
        &script,
        format!(
            "import pathlib, time\n\
             from retainpdf_translation.workflow.checkpoint.store import CheckpointStore\n\
             real_save = CheckpointStore.save\n\
             def slow_save(self, payload):\n\
             \x20   pathlib.Path({marker:?}).write_text('in-window')\n\
             \x20   time.sleep({sleep_secs})\n\
             \x20   real_save(self, payload)\n\
             CheckpointStore.save = slow_save\n\
             import sys\n\
             from retainpdf_pipeline.entrypoints.console import main\n\
             raise SystemExit(main(sys.argv[1:]))\n",
            marker = marker.display().to_string(),
        ),
    )
    .expect("write slow script");
    let wrapper = root.join("retainpdf-pipeline-slow");
    fs::write(
        &wrapper,
        format!(
            "#!/bin/sh\nPYTHONPATH='{}' exec '{}' '{}' \"$@\"\n",
            python_path(),
            project_venv_bin("python").display(),
            script.display(),
        ),
    )
    .expect("write slow wrapper");
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&wrapper, fs::Permissions::from_mode(0o755)).expect("chmod wrapper");
    }
    wrapper.to_string_lossy().into_owned()
}

async fn wait_until(what: &str, timeout: Duration, mut done: impl FnMut() -> bool) {
    let deadline = Instant::now() + timeout;
    while !done() {
        assert!(Instant::now() < deadline, "timed out waiting for {what}");
        tokio::time::sleep(Duration::from_millis(50)).await;
    }
}

#[tokio::test]
async fn dropping_the_request_mid_commit_lets_the_revision_finish() {
    let base = test_state("translation-revision-detached");
    let marker = base.config.data_root.join("in-window.marker");
    let command = slow_pipeline(&base.config.data_root, &marker, 1.5);
    let state = state_with_pipeline_command(base, command);
    let translated = seed_committed_job(&state, "job-revision-detached", JobStatusKind::Succeeded);

    let mut request = Box::pin(patch_item(
        &state,
        "job-revision-detached",
        ITEM_ID,
        json!({"translated_text": REVISED_TEXT, "source": "user", "reason": "断开"}),
    ));
    // 子进程进入窗口(页文件已写、checkpoint 未写)那一刻,客户端断开:future 被丢弃。
    tokio::select! {
        _ = request.as_mut() => panic!("the request finished before the window"),
        _ = wait_until("revise to reach the checkpoint write", Duration::from_secs(30), || marker.exists()) => {}
    }
    // Box::pin 的 future 在这里才真正被丢弃(tokio::pin! 的 drop 丢不掉它)。
    drop(request);

    // 写回必须自己做完:checkpoint 前进、日志落盘、渲染侧读得出新译文。
    wait_until("the detached revision to commit", Duration::from_secs(30), || {
        checkpoint(&translated)["generation"] == 8
    })
    .await;
    assert_eq!(render_loader_text(&translated, ITEM_ID), REVISED_TEXT);
    wait_until("the revision log", Duration::from_secs(10), || {
        translated.join("revisions.v1.jsonl").exists()
            && !translated.join(".translation-revision-intent.v1.json").exists()
    })
    .await;
    let journal = fs::read_to_string(translated.join("revisions.v1.jsonl")).expect("revisions");
    assert_eq!(journal.lines().count(), 1);

    // 接着再改一次:没有被 publication_inconsistent 卡住。
    let (status, payload) = patch_item(
        &state,
        "job-revision-detached",
        ITEM_ID,
        json!({"translated_text": "谐振子是分子振动的理想模型。", "source": "user"}),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{payload}");
    assert_eq!(payload["data"]["generation"], 9);
}

/// 修这个问题之前被杀留下的现场(页文件领先 checkpoint,没有意图记录):PATCH 用
/// checkpoint 的快照把页文件换回去再写回,不再永远 409 `publication_inconsistent`。
#[tokio::test]
async fn pages_ahead_of_the_checkpoint_are_healed_by_the_next_patch() {
    let state = super::revisions::state_with_pipeline("translation-revision-heal");
    let translated = seed_committed_job(&state, "job-revision-heal", JobStatusKind::Succeeded);
    let page_path = translated.join("page-001-deepseek.json");
    // 真实任务的翻译提交会给当前 generation 建快照;seed 没有,补上。
    let snapshot_dir = translated.join(".translation-checkpoints/generation-7");
    fs::create_dir_all(&snapshot_dir).expect("snapshot dir");
    fs::copy(&page_path, snapshot_dir.join("page-001-deepseek.json")).expect("snapshot");
    let ahead = fs::read_to_string(&page_path)
        .expect("page")
        .replace(super::revisions::ORIGINAL_TEXT, "页文件里没提交的内容。");
    fs::remove_file(&page_path).expect("unlink page");
    fs::write(&page_path, ahead).expect("write page ahead of checkpoint");
    assert_eq!(checkpoint(&translated)["generation"], 7);

    let (status, payload) = patch_item(
        &state,
        "job-revision-heal",
        ITEM_ID,
        json!({"translated_text": REVISED_TEXT, "source": "user"}),
    )
    .await;

    assert_eq!(status, StatusCode::OK, "{payload}");
    assert_eq!(payload["data"]["generation"], 8);
    assert_eq!(render_loader_text(&translated, ITEM_ID), REVISED_TEXT);
}
