use std::path::{Path, PathBuf};

use super::*;
use retainpdf_core::config::PlatformModels;
use retainpdf_api_base::error::AppError;
use retainpdf_providers::{create_credential, CreateCredentialInput};

struct Env {
    db: Db,
    root: PathBuf,
}

fn env(name: &str) -> Env {
    let root = std::env::temp_dir().join(format!("retain-platform-{name}-{}", fastrand::u64(..)));
    std::fs::create_dir_all(&root).unwrap();
    let db = Db::new(root.join("jobs.db"), root.clone());
    db.init().unwrap();
    Env { db, root }
}

fn vault_secret(root: &Path, kind: &str, provider: &str, secret: &str) -> String {
    create_credential(
        root,
        CreateCredentialInput {
            kind: kind.into(),
            provider: provider.into(),
            label: "env".into(),
            secret: secret.into(),
            expected_revision: None,
        },
    )
    .unwrap()
    .credential
    .credential_ref
}

fn runtime() -> DeepSeekRuntimeConfig {
    DeepSeekRuntimeConfig::from_env()
}

fn input(
    model: &str,
    api_key: Option<&str>,
    provider: &str,
    token: Option<&str>,
) -> SavePlatformSettingsInput {
    SavePlatformSettingsInput {
        translation: SaveTranslationSettings {
            model: model.into(),
            base_url: "https://api.example.com/v1".into(),
            api_protocol: "openai".into(),
            thinking: "low".into(),
            max_workers: 4,
            api_key: api_key.map(Into::into),
        },
        ocr: SaveOcrSettings {
            provider: provider.into(),
            token: token.map(Into::into),
        },
    }
}

fn error_code(error: AppError) -> &'static str {
    match error {
        AppError::Account { code, .. } => code,
        other => panic!("unexpected error: {other:?}"),
    }
}

fn credential_exists(root: &Path, credential_ref: &str, kind: &str) -> bool {
    retainpdf_data::credentials::resolve_credential(root, credential_ref, kind).is_ok()
}

#[test]
fn falls_back_to_the_environment_until_saved() {
    let env_ = env("fallback");
    let empty = view(&env_.db, &env_.root, &PlatformModels::default()).unwrap();
    assert_eq!((empty.source, empty.ready), ("environment", false));
    assert_eq!(
        empty.missing,
        vec![
            "translation_model",
            "translation_base_url",
            "translation_api_key",
            "ocr_provider",
            "ocr_token"
        ]
    );

    let key_ref = vault_secret(
        &env_.root,
        TRANSLATION_KEY_KIND,
        "deepseek",
        "sk-env-secret-1234",
    );
    let token_ref = vault_secret(
        &env_.root,
        OCR_TOKEN_KIND,
        "mineru",
        "mineru-env-token-9876",
    );
    let from_env = PlatformModels {
        translation_model: "env-model".into(),
        translation_base_url: "https://env.example/v1".into(),
        translation_credential_ref: key_ref,
        ocr_provider: "mineru".into(),
        ocr_credential_ref: token_ref,
        ..Default::default()
    };
    let view = view(&env_.db, &env_.root, &from_env).unwrap();
    assert_eq!((view.source, view.ready), ("environment", true));
    assert_eq!(
        (
            view.translation.api_key_hint.as_str(),
            view.ocr.token_hint.as_str()
        ),
        ("…1234", "…9876")
    );
    assert_eq!(view.updated_at, None);
    assert_eq!(
        PlatformSource {
            db: &env_.db,
            env: &from_env
        }
        .resolve()
        .unwrap(),
        from_env
    );
}

#[test]
fn first_save_keeps_environment_credentials_and_takes_effect_immediately() {
    let env_ = env("first-save");
    let key_ref = vault_secret(
        &env_.root,
        TRANSLATION_KEY_KIND,
        "deepseek",
        "sk-env-secret-1234",
    );
    let token_ref = vault_secret(
        &env_.root,
        OCR_TOKEN_KIND,
        "mineru",
        "mineru-env-token-9876",
    );
    let from_env = PlatformModels {
        translation_credential_ref: key_ref.clone(),
        ocr_provider: "mineru".into(),
        ocr_credential_ref: token_ref.clone(),
        ..Default::default()
    };
    env_.db
        .create_user(
            "u_admin",
            "admin",
            "hash",
            "admin",
            false,
            "2026-10-11T00:00:00Z",
        )
        .unwrap();
    let saved = save(
        &env_.db,
        &env_.root,
        &from_env,
        &runtime(),
        "u_admin",
        input("new-model", None, "mineru", None),
    )
    .unwrap();
    assert_eq!((saved.source, saved.ready), ("database", true));
    assert_eq!(
        saved.updated_by.as_ref().map(|by| by.username.as_str()),
        Some("admin")
    );

    let resolved = PlatformSource {
        db: &env_.db,
        env: &from_env,
    }
    .resolve()
    .unwrap();
    assert_eq!(
        (
            resolved.translation_model.as_str(),
            resolved.translation_thinking.as_str(),
            resolved.translation_max_workers
        ),
        ("new-model", "low", 4)
    );
    assert_eq!(
        (
            resolved.translation_credential_ref,
            resolved.ocr_credential_ref
        ),
        (key_ref, token_ref),
        "没填密钥就沿用"
    );
}

#[test]
fn replacing_a_key_creates_a_new_credential_and_retires_only_our_own_unused_ones() {
    let env_ = env("rotate");
    let env_key = vault_secret(
        &env_.root,
        TRANSLATION_KEY_KIND,
        "deepseek",
        "sk-env-secret-1234",
    );
    let from_env = PlatformModels {
        translation_credential_ref: env_key.clone(),
        ..Default::default()
    };
    let none = PlatformModels::default();

    let first = save(
        &env_.db,
        &env_.root,
        &from_env,
        &runtime(),
        "u1",
        input("m", Some("sk-first-key-aaaa"), "", None),
    )
    .unwrap();
    assert_eq!(first.translation.api_key_hint, "…aaaa");
    let first_ref = env_
        .db
        .platform_settings()
        .unwrap()
        .unwrap()
        .translation_credential_ref;
    assert_ne!(first_ref, env_key);
    assert!(
        credential_exists(&env_.root, &env_key, TRANSLATION_KEY_KIND),
        "环境变量带来的凭据不碰"
    );

    save(
        &env_.db,
        &env_.root,
        &none,
        &runtime(),
        "u1",
        input("m", Some("sk-second-key-bbbb"), "", None),
    )
    .unwrap();
    assert!(
        !credential_exists(&env_.root, &first_ref, TRANSLATION_KEY_KIND),
        "自己建的、没人用了就删"
    );

    // 有任务还拿着旧编号：留着。
    let second_ref = env_
        .db
        .platform_settings()
        .unwrap()
        .unwrap()
        .translation_credential_ref;
    let mut job_input = retainpdf_core::models::CreateJobInput::default();
    job_input.translation.credential_ref = second_ref.clone();
    let job = retainpdf_core::models::domain::JobSnapshot::new(
        "queued-job".into(),
        job_input,
        vec!["noop".into()],
    );
    env_.db.save_job(&job).unwrap();
    save(
        &env_.db,
        &env_.root,
        &none,
        &runtime(),
        "u1",
        input("m", Some("sk-third-key-cccc"), "", None),
    )
    .unwrap();
    assert!(
        credential_exists(&env_.root, &second_ref, TRANSLATION_KEY_KIND),
        "排队中的任务还要用"
    );
}

#[test]
fn switching_ocr_provider_requires_a_new_token_tagged_with_that_provider() {
    let env_ = env("ocr");
    let none = PlatformModels::default();
    save(
        &env_.db,
        &env_.root,
        &none,
        &runtime(),
        "u1",
        input("m", None, "mineru", Some("mineru-token-1111")),
    )
    .unwrap();
    let error = save(
        &env_.db,
        &env_.root,
        &none,
        &runtime(),
        "u1",
        input("m", None, "paddle", None),
    )
    .unwrap_err();
    assert_eq!(error_code(error), "OCR_TOKEN_REQUIRED");

    let view = save(
        &env_.db,
        &env_.root,
        &none,
        &runtime(),
        "u1",
        input("m", None, "paddle", Some("paddle-token-2222")),
    )
    .unwrap();
    assert_eq!(
        (
            view.ocr.provider.as_str(),
            view.ocr.token_configured,
            view.ocr.token_hint.as_str()
        ),
        ("paddle", true, "…2222")
    );
    let record = env_.db.platform_settings().unwrap().unwrap();
    let resolved = retainpdf_data::credentials::resolve_credential(
        &env_.root,
        &record.ocr_credential_ref,
        OCR_TOKEN_KIND,
    )
    .unwrap();
    assert_eq!(resolved.provider, "paddle", "worker 会核对服务商标签");

    // 清空服务商：凭据编号一起清掉。
    let cleared = save(
        &env_.db,
        &env_.root,
        &none,
        &runtime(),
        "u1",
        input("m", None, "", None),
    )
    .unwrap();
    assert!(cleared.missing.contains(&"ocr_provider") && !cleared.ocr.token_configured);
}

#[test]
fn invalid_values_are_rejected_before_touching_the_vault() {
    let env_ = env("invalid");
    let none = PlatformModels::default();
    let with = |edit: fn(&mut SavePlatformSettingsInput)| {
        let mut value = input("m", Some("sk-x-key-zzzz"), "", None);
        edit(&mut value);
        value
    };
    let cases: Vec<(SavePlatformSettingsInput, &str)> = vec![
        (
            with(|i| i.translation.api_protocol = "grpc".into()),
            "INVALID_API_PROTOCOL",
        ),
        (
            with(|i| i.translation.thinking = "extreme".into()),
            "INVALID_THINKING",
        ),
        (
            with(|i| i.translation.max_workers = 65),
            "INVALID_MAX_WORKERS",
        ),
        (
            with(|i| i.translation.base_url = "http://127.0.0.1:8000/v1".into()),
            "INVALID_BASE_URL",
        ),
        (
            with(|i| i.translation.base_url = "https://user:pass@api.example.com".into()),
            "INVALID_BASE_URL",
        ),
        (
            with(|i| i.ocr.provider = "local".into()),
            "INVALID_OCR_PROVIDER",
        ),
    ];
    for (bad, code) in cases {
        assert_eq!(
            error_code(save(&env_.db, &env_.root, &none, &runtime(), "u1", bad).unwrap_err()),
            code
        );
    }
    assert_eq!(
        env_.db.platform_settings().unwrap(),
        None,
        "没有存下任何东西"
    );
    let vault = std::fs::read_to_string(env_.root.join("secrets").join("credentials.json"))
        .unwrap_or_default();
    assert!(!vault.contains("sk-x-key-zzzz"), "校验没过不建凭据");
}

#[tokio::test]
async fn test_reports_missing_inputs_without_calling_anyone() {
    let env_ = env("probe");
    let none = PlatformModels::default();
    let runtimes = ProbeRuntimes {
        deepseek: DeepSeekRuntimeConfig::from_env(),
        mineru: MineruRuntimeConfig::from_env(),
        paddle: PaddleRuntimeConfig::from_env(),
    };
    let probe = |target: &str| TestPlatformInput {
        target: target.into(),
        model: None,
        base_url: None,
        api_protocol: None,
        api_key: None,
        provider: None,
        token: None,
    };
    let no_key = test(&env_.db, &env_.root, &none, &runtimes, probe("translation"))
        .await
        .unwrap();
    assert_eq!(
        (no_key.ok, no_key.status.as_str(), no_key.summary.as_str()),
        (false, "missing_input", "还没有填 API Key")
    );
    let mut no_url = probe("translation");
    no_url.api_key = Some("sk-unsaved".into());
    assert_eq!(
        test(&env_.db, &env_.root, &none, &runtimes, no_url)
            .await
            .unwrap()
            .summary,
        "还没有填接口地址"
    );

    save(
        &env_.db,
        &env_.root,
        &none,
        &runtime(),
        "u1",
        input("m", None, "mineru", Some("mineru-token-1111")),
    )
    .unwrap();
    let mut switched = probe("ocr");
    switched.provider = Some("paddle".into());
    let result = test(&env_.db, &env_.root, &none, &runtimes, switched)
        .await
        .unwrap();
    assert_eq!(
        result.summary, "还没有填这个服务商的 token",
        "旧 token 是 MinerU 的，不能拿去试 Paddle"
    );
    let bad_target = test(&env_.db, &env_.root, &none, &runtimes, probe("tts"))
        .await
        .unwrap_err();
    assert_eq!(error_code(bad_target), "INVALID_TEST_TARGET");
}
