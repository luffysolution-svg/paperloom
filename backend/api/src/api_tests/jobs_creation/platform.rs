//! 管理后台保存的平台设置在建任务时现读：保存后下一个任务就用新的，不用重启。

use crate::config::PlatformModels;
use crate::models::domain::{now_iso, UploadRecord, WorkflowKind};
use crate::services::accounts::{
    self, PlatformSource, SaveOcrSettings, SavePlatformSettingsInput, SaveTranslationSettings,
};
use crate::test_support::pdf::build_test_pdf_bytes;

use super::{base_translation_input, submit_context, submit_input, test_state};

fn settings(model: &str, api_key: Option<&str>) -> SavePlatformSettingsInput {
    settings_with_thinking(model, api_key, "low")
}

fn settings_with_thinking(model: &str, api_key: Option<&str>, thinking: &str) -> SavePlatformSettingsInput {
    SavePlatformSettingsInput {
        translation: SaveTranslationSettings {
            model: model.into(),
            base_url: "https://api.example.com/v1".into(),
            api_protocol: "openai".into(),
            thinking: thinking.into(),
            max_workers: 3,
            api_key: api_key.map(Into::into),
        },
        ocr: SaveOcrSettings {
            provider: "mineru".into(),
            token: api_key.map(|_| "mineru-platform-token".into()),
        },
    }
}

#[test]
fn saved_platform_settings_apply_to_the_next_job_without_restart() {
    let state = test_state("platform-live");
    let env = PlatformModels::default();
    let upload_dir = state.config.uploads_dir.join("up-1");
    std::fs::create_dir_all(&upload_dir).unwrap();
    let path = upload_dir.join("input.pdf");
    std::fs::write(&path, build_test_pdf_bytes()).unwrap();
    state
        .db
        .save_upload(&UploadRecord {
            upload_id: "up-1".into(),
            filename: "input.pdf".into(),
            stored_path: path.to_string_lossy().into_owned(),
            bytes: 1,
            page_count: 1,
            uploaded_at: now_iso(),
            developer_mode: false,
            content_hash: String::new(),
        })
        .unwrap();
    let runtime = state.config.provider_runtime.deepseek.clone();
    let save = |input| {
        accounts::save_platform_settings(
            &state.db,
            &state.config.data_root,
            &env,
            &runtime,
            "u_admin",
            input,
        )
        .unwrap()
    };
    let mut deps = submit_context(&state);
    deps.launcher = deps.launcher.with_platform(Some(PlatformSource {
        db: state.db.as_ref(),
        env: &env,
    }));
    let mut input = base_translation_input(WorkflowKind::Book);
    input.source.upload_id = "up-1".into();
    input.translation.workers = 20;

    save(settings("platform-model-a", Some("sk-platform-key-1234")));
    let first = submit_input(&deps, &input).expect("first job");
    let t = &first.request_payload.translation;
    assert_eq!(
        (t.model.as_str(), t.thinking.as_str(), t.workers),
        ("platform-model-a", "low", 3)
    );
    assert!(
        t.api_key.is_empty() && !t.credential_ref.is_empty(),
        "只带凭据编号，不带明文"
    );

    save(settings("platform-model-b", None));
    let second = submit_input(&deps, &input).expect("second job");
    assert_eq!(second.request_payload.translation.model, "platform-model-b");
    assert_eq!(
        first.request_payload.translation.model, "platform-model-a",
        "已提交的任务不变"
    );
    assert_eq!(
        second.request_payload.translation.credential_ref, t.credential_ref,
        "没换密钥就沿用同一条凭据"
    );
}

/// 回归：平台思考深度选「默认」（存进去是空串）时，所有多用户任务都被 400 拒掉
/// （translation.thinking must be one of …）。要走完整的建任务校验才测得出来。
#[test]
fn default_platform_thinking_passes_job_validation() {
    let state = test_state("platform-thinking-default");
    let env = PlatformModels::default();
    let upload_dir = state.config.uploads_dir.join("up-1");
    std::fs::create_dir_all(&upload_dir).unwrap();
    let path = upload_dir.join("input.pdf");
    std::fs::write(&path, build_test_pdf_bytes()).unwrap();
    state
        .db
        .save_upload(&UploadRecord {
            upload_id: "up-1".into(),
            filename: "input.pdf".into(),
            stored_path: path.to_string_lossy().into_owned(),
            bytes: 1,
            page_count: 1,
            uploaded_at: now_iso(),
            developer_mode: false,
            content_hash: String::new(),
        })
        .unwrap();
    let runtime = state.config.provider_runtime.deepseek.clone();
    accounts::save_platform_settings(
        &state.db,
        &state.config.data_root,
        &env,
        &runtime,
        "u_admin",
        settings_with_thinking("platform-model", Some("sk-platform-key-1234"), ""),
    )
    .unwrap();
    let mut deps = submit_context(&state);
    deps.launcher = deps.launcher.with_platform(Some(PlatformSource { db: state.db.as_ref(), env: &env }));
    for asked in ["", "auto", "max"] {
        let mut input = base_translation_input(WorkflowKind::Book);
        input.source.upload_id = "up-1".into();
        input.translation.thinking = asked.into();
        let job = submit_input(&deps, &input).unwrap_or_else(|error| panic!("thinking={asked:?}: {error:?}"));
        assert_eq!(job.request_payload.translation.thinking, "auto", "thinking={asked:?}");
    }
}
