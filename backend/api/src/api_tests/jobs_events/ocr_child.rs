use std::fs;
use std::path::PathBuf;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use tower::util::ServiceExt;

use crate::app::build_app;
use crate::models::{CreateJobInput, JobSnapshot};

use crate::api_tests::jobs_common::{read_json, test_state};

#[tokio::test]
async fn main_job_events_include_ocr_child_page_progress() {
    let state = test_state("events-ocr-child-progress");
    let mut parent = JobSnapshot::new(
        "job-route-parent-progress".to_string(),
        CreateJobInput::default(),
        vec!["python".to_string()],
    );
    let parent_root: PathBuf = state.config.data_root.join("jobs").join(&parent.job_id);
    fs::create_dir_all(parent_root.join("logs")).expect("create parent logs dir");
    parent
        .artifacts
        .get_or_insert_with(crate::models::JobArtifacts::default)
        .job_root = Some(parent_root.to_string_lossy().to_string());
    parent.artifacts.as_mut().unwrap().ocr_job_id =
        Some("job-route-parent-progress-ocr".to_string());
    state.db.save_job(&parent).expect("save parent job");

    let mut child_input = CreateJobInput::default();
    child_input.workflow = crate::models::WorkflowKind::Ocr;
    let mut child = JobSnapshot::new(
        "job-route-parent-progress-ocr".to_string(),
        child_input,
        vec!["python".to_string()],
    );
    let child_root: PathBuf = state.config.data_root.join("jobs").join(&child.job_id);
    fs::create_dir_all(child_root.join("logs")).expect("create child logs dir");
    child
        .artifacts
        .get_or_insert_with(crate::models::JobArtifacts::default)
        .job_root = Some(child_root.to_string_lossy().to_string());
    state.db.save_job(&child).expect("save child job");
    fs::write(
        child_root.join("logs").join("pipeline_events.jsonl"),
        concat!(r#"{"job_id":"job-route-parent-progress-ocr","seq":1,"ts":"2026-04-24T01:00:00Z","level":"info","user_stage":"ocr","stage":"ocr_processing","substage":"provider_processing","stage_detail":"Paddle 正在解析文件，第 12/34 页","provider":"paddle","provider_stage":"provider_processing","event_type":"stage_progress","message":"Paddle 正在解析文件，第 12/34 页","progress_current":12,"progress_total":34,"progress_unit":"page","payload":{"provider_task_id":"task-1"}}"#, "\n"),
    )
    .expect("write child pipeline events");

    let app = build_app(state.clone());
    let events_response = app
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/jobs/{}/progress/events", parent.job_id))
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("events request"),
        )
        .await
        .expect("events response");
    assert_eq!(events_response.status(), StatusCode::OK);
    let events_json = read_json(events_response).await;
    let items = events_json["data"]["items"]
        .as_array()
        .expect("events items");
    let ocr_progress = items
        .iter()
        .find(|item| item["display_stage"] == "ocr" && item["raw_event_type"] == "stage_progress")
        .expect("ocr child progress event");
    assert_eq!(ocr_progress["job_id"], parent.job_id);
    assert_eq!(ocr_progress["stage"], "ocr_processing");
    assert!(ocr_progress.get("user_stage").is_none());
    assert_eq!(ocr_progress["event_type"], "progress");
    assert_eq!(ocr_progress["substage"], "ocr_processing");
    assert!(ocr_progress.get("progress_unit").is_none());
    assert!(ocr_progress.get("progress_current").is_none());
    assert!(ocr_progress.get("progress_total").is_none());
    assert_eq!(ocr_progress["progress"]["unit"], "page");
    assert_eq!(
        ocr_progress["payload"]["source_job_id"],
        "job-route-parent-progress-ocr"
    );
    assert_eq!(ocr_progress["raw"]["source_kind"], "ocr_child");
}

/// 照真实样本（20261006023250-703433）的事件形态搭一对父子任务：父任务只发
/// 自己的阶段事件，OCR 进度来自子任务导入。
fn seed_parent_with_ocr_child(
    state: &crate::AppState,
    parent_id: &str,
    parent_status: crate::models::JobStatusKind,
) -> String {
    let child_id = format!("{parent_id}-ocr");
    let mut parent = JobSnapshot::new(
        parent_id.to_string(),
        CreateJobInput::default(),
        vec!["python".to_string()],
    );
    parent
        .artifacts
        .get_or_insert_with(crate::models::JobArtifacts::default)
        .ocr_job_id = Some(child_id.clone());
    parent.status = parent_status;
    parent.stage = Some("translating".to_string());
    parent.sync_runtime_state();
    state.db.save_job(&parent).expect("save parent job");

    let mut child_input = CreateJobInput::default();
    child_input.workflow = crate::models::WorkflowKind::Ocr;
    let child = JobSnapshot::new(child_id.clone(), child_input, vec!["python".to_string()]);
    state.db.save_job(&child).expect("save child job");
    child_id
}

fn append(
    state: &crate::AppState,
    job_id: &str,
    level: &str,
    stage: &str,
    event: &str,
    message: &str,
    progress: Option<(i64, i64)>,
) {
    state
        .db
        .append_event(
            job_id,
            level,
            Some(stage.to_string()),
            Some(message.to_string()),
            None,
            None,
            event,
            Some(event.to_string()),
            message,
            progress.map(|p| p.0),
            progress.map(|p| p.1),
            None,
            None,
            None,
        )
        .expect("append event");
}

async fn get_json(state: &crate::AppState, uri: &str) -> serde_json::Value {
    let response = build_app(state.clone())
        .oneshot(
            Request::builder()
                .uri(uri)
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::OK);
    read_json(response).await
}

fn from_child<'a>(items: &'a [serde_json::Value], child_id: &str) -> Vec<&'a serde_json::Value> {
    items
        .iter()
        .filter(|item| item["payload"]["source_job_id"] == child_id)
        .collect()
}

fn messages(items: &[serde_json::Value]) -> Vec<String> {
    items
        .iter()
        .map(|item| item["message"].as_str().unwrap_or_default().to_string())
        .collect()
}

/// 子任务的建档 / 状态切换 / 终态 / 「任务完成」说的是子任务那一行。改写成
/// 父任务的 job_id 导进来，父任务的事件列表里就会在翻译开始前出现标红的
/// 「任务进入终态 succeeded」和「任务完成」。OCR 中间进度则必须保留，且每条
/// 只出现一次。
#[tokio::test]
async fn ocr_child_terminal_events_stay_out_of_parent_feed_but_progress_stays() {
    let state = test_state("events-ocr-child-terminal-filter");
    let parent_id = "job-route-ocr-terminal-filter";
    let child_id =
        seed_parent_with_ocr_child(&state, parent_id, crate::models::JobStatusKind::Running);
    let child = child_id.as_str();

    append(&state, parent_id, "info", "queued", "job_created", "任务已创建", None);
    append(&state, parent_id, "info", "ocr_submitting", "status_changed", "任务状态变更为 running", None);
    append(&state, parent_id, "info", "ocr_submitting", "stage_updated", "正在启动 OCR 子任务", None);
    append(&state, parent_id, "info", "ocr_submitting", "ocr_child_created", "OCR 子任务已创建", None);

    append(&state, child, "info", "queued", "job_created", "任务已创建", None);
    append(&state, child, "info", "ocr_upload", "status_changed", "任务状态变更为 running", None);
    append(&state, child, "info", "ocr_processing", "stage_updated", "Paddle 正在解析文件，第 9/48 页", Some((9, 48)));
    append(&state, child, "info", "ocr_processing", "stage_progress", "Paddle 正在解析文件，第 45/48 页", Some((45, 48)));
    append(&state, child, "info", "normalizing", "stage_updated", "OCR 完成，开始标准化", None);
    append(&state, child, "info", "finished", "status_changed", "任务状态变更为 succeeded", None);
    append(&state, child, "info", "finished", "job_terminal", "任务进入终态 succeeded", None);
    append(&state, child, "info", "finished", "stage_updated", "任务完成", None);
    append(&state, child, "info", "finished", "stage_transition", "任务完成", None);
    append(&state, child, "info", "ocr", "pipeline_attempt_terminal", "pipeline attempt 1 succeeded", None);

    append(&state, parent_id, "info", "ocr_submitting", "ocr_child_finished", "OCR 子任务结束，状态=Succeeded", None);
    append(&state, parent_id, "info", "translating", "stage_transition", "OCR 完成，开始翻译", None);

    let body = get_json(&state, &format!("/api/v1/jobs/{parent_id}/progress/events")).await;
    let items = body["data"]["items"].as_array().expect("events items");

    let child_events: Vec<&str> = from_child(items, child)
        .iter()
        .map(|item| item["raw_event_type"].as_str().unwrap_or_default())
        .collect();
    assert_eq!(
        child_events,
        ["stage_updated", "stage_progress", "stage_updated"],
        "only OCR progress may be imported from the child"
    );
    for item in items {
        assert_ne!(item["raw_event_type"], "job_terminal", "{item}");
        assert_ne!(item["stage"], "finished", "{item}");
        assert_ne!(item["message"], "任务完成", "{item}");
    }
    // 父任务自己的建档事件还在，只有子任务那一份被挡掉。
    assert_eq!(
        items
            .iter()
            .filter(|item| item["raw_event_type"] == "job_created")
            .count(),
        1
    );

    let all = messages(items);
    for progress in ["Paddle 正在解析文件，第 9/48 页", "Paddle 正在解析文件，第 45/48 页"] {
        assert_eq!(
            all.iter().filter(|message| message.as_str() == progress).count(),
            1,
            "{progress} must be visible exactly once: {all:?}"
        );
    }
    assert!(
        all.iter().all(|message| !message.starts_with("OCR 子任务：")),
        "parent must not carry a mirrored copy of child progress: {all:?}"
    );
    assert!(all.iter().any(|message| message == "OCR 子任务结束，状态=Succeeded"));

    let detail = get_json(&state, &format!("/api/v1/jobs/{parent_id}")).await;
    assert_eq!(detail["data"]["stage_snapshot"]["stage"], "translating");
}

/// 子任务失败：子任务自己的 job_error / failure_classified / 终态都不进父任务，
/// 失败原因由父任务自己的 job_error 交代（finalize_parent_after_ocr 会把子任务
/// 的 error 复制过来），所以同一条失败原因只出现一次。
#[tokio::test]
async fn failed_ocr_child_is_explained_by_the_parents_own_failure_events() {
    let state = test_state("events-ocr-child-failed");
    let parent_id = "job-route-ocr-child-failed";
    let child_id =
        seed_parent_with_ocr_child(&state, parent_id, crate::models::JobStatusKind::Failed);
    let child = child_id.as_str();
    let reason = "Paddle 解析失败：upstream 502";

    append(&state, child, "info", "ocr_processing", "stage_progress", "Paddle 正在解析文件，第 9/48 页", Some((9, 48)));
    append(&state, child, "error", "failed", "job_error", reason, None);
    append(&state, child, "error", "failed", "failure_classified", "OCR 服务暂时不可用", None);
    append(&state, child, "info", "failed", "status_changed", "任务状态变更为 failed", None);
    append(&state, child, "error", "failed", "job_terminal", "任务进入终态 failed", None);

    append(&state, parent_id, "error", "ocr_processing", "ocr_child_finished", "OCR 子任务结束，状态=Failed", None);
    append(&state, parent_id, "error", "failed", "job_error", reason, None);
    append(&state, parent_id, "error", "failed", "failure_classified", "OCR 服务暂时不可用", None);
    append(&state, parent_id, "error", "failed", "job_terminal", "任务进入终态 failed", None);

    let body = get_json(&state, &format!("/api/v1/jobs/{parent_id}/progress/events")).await;
    let items = body["data"]["items"].as_array().expect("events items");
    let child_items = from_child(items, child);
    assert_eq!(child_items.len(), 1, "{child_items:?}");
    assert_eq!(child_items[0]["raw_event_type"], "stage_progress");

    let all = messages(items);
    assert_eq!(all.iter().filter(|m| m.as_str() == reason).count(), 1, "{all:?}");
    assert_eq!(
        items
            .iter()
            .filter(|item| item["raw_event_type"] == "job_terminal")
            .count(),
        1
    );
    assert!(all.iter().any(|m| m == "OCR 子任务结束，状态=Failed"));
}
