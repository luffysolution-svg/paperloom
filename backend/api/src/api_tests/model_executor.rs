//! 模型执行器里要用到任务领域或整个应用的测试。执行器本身在 `retainpdf-providers` 包里，
//! 它的单测留在包里；这几个要调任务领域的函数、或者搭起整个 `AppState`，包里做不到，放在这里。
use crate::models::domain::JobSnapshot;
use crate::models::request::CreateJobInput;
use crate::services::providers::ModelExecutor;
use axum::{http::StatusCode, routing::post, Json, Router};
use retainpdf_core::model_connection::{Deadlines, ModelConnection, Provider, Thinking};
use retainpdf_data::db::{Db, ModelReservation};
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

struct Fixture {
    root: PathBuf,
    db: Arc<Db>,
    executor: Arc<ModelExecutor>,
}
impl Fixture {
    fn new() -> Self {
        let root = std::env::temp_dir().join(format!(
            "retain-model-test-{}-{:x}",
            std::process::id(),
            fastrand::u64(..)
        ));
        std::fs::create_dir_all(root.join("secrets")).unwrap();
        let vault = root.join("secrets/credentials.json");
        std::fs::write(&vault,serde_json::to_vec(&json!({"schema":"retainpdf_credential_vault_v1","credentials":{"cred_test":{"kind":"translation_api_key","provider":"qwen","secret":"test-secret-not-a-real-key"}}})).unwrap()).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&vault, std::fs::Permissions::from_mode(0o600)).unwrap();
        }
        let db = Arc::new(Db::new(root.join("jobs.db"), root.clone()));
        db.init().unwrap();
        for job_id in ["j", "job-a"] {
            let input: CreateJobInput = serde_json::from_value(json!({})).unwrap();
            db.save_job(&JobSnapshot::new(job_id.into(), input, vec![]))
                .unwrap();
        }
        let executor = Arc::new(ModelExecutor::new(db.clone(), root.clone()).unwrap());
        Self { root, db, executor }
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.root);
    }
}

fn profile(url: &str) -> ModelConnection {
    ModelConnection {
        id: "qwen-main".into(),
        revision: 1,
        provider: Provider::Qwen,
        base_url: url.into(),
        model: "qwen3.8-flash".into(),
        credential_ref: "cred_test".into(),
        concurrency: 2,
        thinking: Thinking::Auto,
        stream: Some(false),
        allow_private_endpoint: true,
        // 和 retainpdf-providers 里执行器测试的 profile 一样留足余量，见那边的注释。
        deadlines: Deadlines {
            queue_ms: 2_000,
            connect_ms: 1_000,
            idle_ms: 1_000,
            total_ms: 3_000,
        },
    }
}
async fn server(app: Router) -> (String, tokio::task::JoinHandle<()>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let task = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    (format!("http://{addr}/v1"), task)
}
fn successful() -> Value {
    json!({"choices":[{"message":{"content":"translated"},"finish_reason":"stop"}],"usage":{"prompt_tokens":12,"completion_tokens":9,"completion_tokens_details":{"reasoning_tokens":3}}})
}

#[test]
fn submission_snapshot_is_validated_and_publicly_roundtrips_without_a_key() {
    let p = profile("https://example.org/v1");
    let mut input:retainpdf_core::models::request::CreateJobInput=serde_json::from_value(json!({"translation":{"model":p.model,"base_url":p.base_url,"credential_ref":p.credential_ref,"workers":p.concurrency,"execution_connection":p}})).unwrap();
    crate::services::jobs::validate_translation_credentials(&input).unwrap();
    let snapshot =
        retainpdf_core::models::domain::JobSnapshot::new("roundtrip".into(), input.clone(), vec![]);
    let public = serde_json::to_value(retainpdf_core::models::public_request_payload(
        &snapshot.request_payload,
    ))
    .unwrap();
    assert_eq!(
        public["translation"]["execution_connection"]["thinking"],
        "auto"
    );
    assert!(public["translation"]["execution_connection"]
        .get("api_key")
        .is_none());
    input.translation.workers = 99;
    assert!(crate::services::jobs::validate_translation_credentials(&input).is_err());
    input.translation.workers = 2;
    input.translation.api_key = "inline-secret".into();
    assert!(crate::services::jobs::validate_translation_credentials(&input).is_err());
}

/// Rust 执行器只会发 `/chat/completions`：别的协议直接拒，不静默走错接口。
#[test]
fn execution_connection_only_accepts_the_chat_completions_protocol() {
    let p = profile("https://example.org/v1");
    let mut input: retainpdf_core::models::request::CreateJobInput = serde_json::from_value(json!({"translation":{"model":p.model,"base_url":p.base_url,"credential_ref":p.credential_ref,"workers":p.concurrency,"execution_connection":p}})).unwrap();
    for protocol in ["openai_responses", "anthropic"] {
        input.translation.api_protocol = protocol.into();
        let error = crate::services::jobs::validate_translation_credentials(&input)
            .expect_err(protocol);
        assert!(error.to_string().contains("api_protocol=openai"), "{error}");
    }
    input.translation.api_protocol = "openai".into();
    crate::services::jobs::validate_translation_credentials(&input).unwrap();
}

#[test]
fn recovery_projection_preserves_receipts_and_blocks_legacy_recovery() {
    use crate::services::jobs::{load_translation_request_recovery, load_translation_request_recovery_with_db};
    let f = Fixture::new();
    let e = &f.executor;
    let p = profile("https://example.org/v1");
    let mut job = f.db.get_job("j").unwrap();
    job.request_payload.translation.execution_connection = Some(p.clone());
    assert!(f.db.model_recovery_summary("j").unwrap().is_none());
    let missing = load_translation_request_recovery_with_db(&f.db, &job, &f.root).unwrap();
    assert_eq!(missing.status, "blocked");
    assert_eq!(missing.supported_retry_policies, vec!["block"]);
    e.register_job("j", &p, 60).unwrap();
    for id in ["done", "unknown", "queued"] {
        f.db.reserve_model_operation("j", id, id, id, "primary")
            .unwrap();
    }
    assert!(f.db.claim_model_operation("j", "done").unwrap());
    f.db.finish_model_operation(
        "j",
        "done",
        "succeeded",
        Some(&json!({"content":"private receipt"})),
        None,
    )
    .unwrap();
    assert!(f.db.claim_model_operation("j", "unknown").unwrap());
    f.db.close_model_worker_session("j").unwrap();
    let summary = f.db.model_recovery_summary("j").unwrap().unwrap();
    assert_eq!(
        (summary.succeeded, summary.ambiguous, summary.cancelled),
        (1, 1, 1)
    );
    assert!(!serde_json::to_string(&summary)
        .unwrap()
        .contains("private receipt"));
    let view = load_translation_request_recovery_with_db(&f.db, &job, &f.root).unwrap();
    assert_eq!(view.status, "ambiguous");
    assert_eq!(view.active_ambiguous_request_keys, 1);
    assert!(view.requires_confirmation);
    assert_eq!(view.supported_retry_policies, vec!["block"]);
    assert!(
        load_translation_request_recovery(&job, &f.root)
            .unwrap()
            .requires_confirmation
    );
    // Rotating a capability is not an acknowledgement or an unpause.
    e.register_job("j", &p, 60).unwrap();
    assert!(matches!(
        f.db.reserve_model_operation("j", "new", "new", "new", "primary")
            .unwrap(),
        ModelReservation::Paused
    ));
    assert_eq!(
        f.db.get_model_operation("j", "done")
            .unwrap()
            .unwrap()
            .status,
        "succeeded"
    );
}

#[tokio::test]
async fn real_python_worker_bridge_uses_only_the_local_capability() {
    let (upstream, upstream_task) = server(Router::new().route(
        "/v1/chat/completions",
        post(|| async { Json(successful()) }),
    ))
    .await;
    let f = Fixture::new();
    let e = &f.executor;
    let mut state = crate::api_tests::jobs_common::test_state("python-model-bridge");
    state.model_executor = Some(e.clone());
    let p = profile(&upstream);
    let input:retainpdf_core::models::request::CreateJobInput=serde_json::from_value(json!({"workflow":"translate","translation":{"model":p.model,"base_url":p.base_url,"credential_ref":p.credential_ref,"workers":p.concurrency,"execution_connection":p}})).unwrap();
    state
        .db
        .save_job(&retainpdf_core::models::domain::JobSnapshot::new(
            "j".into(),
            input,
            vec![],
        ))
        .unwrap();
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let api_url = format!("http://{}", listener.local_addr().unwrap());
    let app = crate::app::build_app(state);
    let api_task = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    let capability = e.register_job("j", &p, 60).unwrap();
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap();
    let script = r#"
from retainpdf_translation.llm.shared.executor_context import unit_scope
from retainpdf_translation.llm.providers.deepseek.client import request_chat_content, get_api_key
assert get_api_key(required=True) == ''
with unit_scope('domain', ['document-preview']):
    text = request_chat_content([{'role':'user','content':'test source'}], timeout=1, max_attempts=99)
assert text == 'translated', text
print('bridge-ok')
"#;
    let python = crate::test_support::python::project_venv_bin("python");
    let output = tokio::time::timeout(
        Duration::from_secs(20),
        tokio::process::Command::new(python)
            .arg("-c")
            .arg(script)
            .env("PYTHONPATH", root.join("backend/pipeline"))
            .env("RETAIN_TRANSLATION_TRANSPORT", "rust")
            .env("RETAIN_MODEL_EXECUTOR_URL", api_url)
            .env("RETAIN_MODEL_JOB_ID", "j")
            .env("RETAIN_MODEL_CAPABILITY", capability)
            .env_remove("RETAIN_TRANSLATION_API_KEY")
            .env_remove("DEEPSEEK_API_KEY")
            .env_remove("OPENAI_API_KEY")
            .kill_on_drop(true)
            .output(),
    )
    .await
    .unwrap()
    .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert_eq!(String::from_utf8_lossy(&output.stdout).trim(), "bridge-ok");
    api_task.abort();
    upstream_task.abort();
}

#[tokio::test]
async fn http_worker_routes_accept_only_their_own_job_capability() {
    use axum::{body::Body, http::Request};
    use tower::ServiceExt;
    let f = Fixture::new();
    let mut state = crate::api_tests::jobs_common::test_state("model-route-authority");
    state.model_executor = Some(f.executor.clone());
    let profile = profile("http://127.0.0.1:9/v1");
    let input:retainpdf_core::models::request::CreateJobInput=serde_json::from_value(json!({"workflow":"translate","translation":{"execution_connection":profile,"model":profile.model,"base_url":profile.base_url,"credential_ref":profile.credential_ref,"workers":profile.concurrency}})).unwrap();
    state
        .db
        .save_job(&retainpdf_core::models::domain::JobSnapshot::new(
            "j".into(),
            input,
            vec![],
        ))
        .unwrap();
    let app = crate::app::build_app(state);
    // 签发接口 2026-10-22 删了：带不带应用密钥都是 404，令牌只由任务运行时在进程内发。
    let body = serde_json::to_vec(&profile).unwrap();
    for key in [None, Some("test-key")] {
        let mut builder = Request::builder()
            .method("POST")
            .uri("/api/v1/internal/model/jobs/j/capability")
            .header("content-type", "application/json");
        if let Some(key) = key {
            builder = builder.header("x-api-key", key);
        }
        let response = app
            .clone()
            .oneshot(builder.body(Body::from(body.clone())).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND, "{key:?}");
    }
    let capability = f.executor.register_job("j", &profile, 60).unwrap();
    let uri = "/api/v1/internal/model/jobs/j/requests/op";
    let app_key_not_worker = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(uri)
                .header("x-api-key", "test-key")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(app_key_not_worker.status(), StatusCode::UNAUTHORIZED);
    let own = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(uri)
                .header("authorization", format!("Bearer {capability}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(own.status(), StatusCode::NOT_FOUND);
    let other = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/internal/model/jobs/other/requests/op")
                .header("authorization", format!("Bearer {capability}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(other.status(), StatusCode::UNAUTHORIZED);
}

