//! 平台模型与 OCR 设置（多用户模式）：所有网站账号的任务统一用这里的翻译模型和 OCR，平台出钱。
//!
//! - 来源：管理后台保存过的（库里 platform_settings 那一行）优先；从没保存过就用 RETAIN_PLATFORM_*
//!   环境变量，已有的部署不受影响。第一次保存时以环境变量的值为底。
//! - 生效：每次建任务时现读（[`PlatformSource::resolve`]），保存后下一个任务就用新的，不用重启；
//!   已经提交的任务用提交那一刻的值（模型、地址、凭据编号都已写进任务）。
//! - 密钥：存在凭据库里，库里只记编号。换密钥时新建一条凭据而不是改旧的——排队中的任务还拿着旧编号，
//!   配的是旧地址；旧凭据只有是管理后台自己建的、而且没有任务再用，才顺手删掉。环境变量带来的编号不碰。
//! - OCR 凭据带服务商标签（worker 会核对），所以换 OCR 服务商必须同时填新 token。

use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::json;

use retainpdf_core::config::{
    DeepSeekRuntimeConfig, DeploymentMode, MineruRuntimeConfig, PaddleRuntimeConfig, PlatformModels,
};
use retainpdf_data::db::{Db, PlatformSettingsRecord};
use retainpdf_api_base::error::AppError;
use retainpdf_core::models::domain::{TRANSLATION_API_PROTOCOLS, TRANSLATION_THINKING_LEVELS};
use retainpdf_core::models::now_iso;
use retainpdf_providers::{
    create_credential, delete_credential, validate_deepseek_token_view, validate_mineru_token_view,
    validate_paddle_token_view, validate_provider_base_url, CreateCredentialInput,
    DeepSeekTokenValidationRequest, MineruTokenValidationRequest, PaddleTokenValidationRequest,
    PrivateTargets, ProbePolicy, ProviderProbeView,
};

pub const TRANSLATION_KEY_KIND: &str = "translation_api_key";
pub const OCR_TOKEN_KIND: &str = "ocr_provider_token";
/// 平台能用的 OCR（都要 token）。
pub const PLATFORM_OCR_PROVIDERS: &[&str] = &["mineru", "paddle"];
pub const MAX_WORKERS_LIMIT: i64 = 64;
const MAX_TEXT_CHARS: usize = 512;

fn db_error(error: anyhow::Error) -> AppError {
    AppError::internal(format!("platform settings storage failed: {error:#}"))
}

fn invalid(code: &'static str, message: impl Into<String>) -> AppError {
    AppError::account(StatusCode::BAD_REQUEST, code, message, json!({}))
}

// ---------------------------------------------------------------- 建任务时现读

/// 建任务时从哪读平台设置。只在真的建任务时才读库（列表、轮询这些请求不碰）。
#[derive(Clone, Copy)]
pub struct PlatformSource<'a> {
    pub db: &'a Db,
    /// 环境变量里的（从没在管理后台保存过时用它）。
    pub env: &'a PlatformModels,
}

impl PlatformSource<'_> {
    pub fn resolve(&self) -> Result<PlatformModels, AppError> {
        Ok(match self.db.platform_settings().map_err(db_error)? {
            Some(record) => models_of(&record),
            None => self.env.clone(),
        })
    }
}

fn models_of(record: &PlatformSettingsRecord) -> PlatformModels {
    PlatformModels {
        translation_model: record.translation_model.clone(),
        translation_base_url: record.translation_base_url.clone(),
        translation_api_protocol: record.translation_api_protocol.clone(),
        translation_thinking: record.translation_thinking.clone(),
        translation_max_workers: record.translation_max_workers,
        translation_credential_ref: record.translation_credential_ref.clone(),
        ocr_provider: record.ocr_provider.clone(),
        ocr_credential_ref: record.ocr_credential_ref.clone(),
    }
}

/// 当前生效的设置，统一成库里那一行的形状（来自环境变量的，凭据都不归管理后台管）。
fn current_record(
    db: &Db,
    env: &PlatformModels,
) -> Result<(PlatformSettingsRecord, bool), AppError> {
    Ok(match db.platform_settings().map_err(db_error)? {
        Some(record) => (record, true),
        None => (
            PlatformSettingsRecord {
                translation_model: env.translation_model.clone(),
                translation_base_url: env.translation_base_url.clone(),
                translation_api_protocol: env.translation_api_protocol.clone(),
                translation_thinking: env.translation_thinking.clone(),
                translation_max_workers: env.translation_max_workers,
                translation_credential_ref: env.translation_credential_ref.clone(),
                ocr_provider: env.ocr_provider.clone(),
                ocr_credential_ref: env.ocr_credential_ref.clone(),
                ..Default::default()
            },
            false,
        ),
    })
}

// ---------------------------------------------------------------- 查看

/// 凭据库里这条能用的密钥（kind 对、OCR 还要服务商对）；用不了返回 None。
fn resolve_secret(
    data_root: &std::path::Path,
    credential_ref: &str,
    kind: &str,
    provider: Option<&str>,
) -> Option<String> {
    let credential_ref = credential_ref.trim();
    if credential_ref.is_empty() {
        return None;
    }
    let resolved =
        retainpdf_data::credentials::resolve_credential(data_root, credential_ref, kind).ok()?;
    if let Some(provider) = provider {
        if !resolved
            .provider
            .trim()
            .eq_ignore_ascii_case(provider.trim())
        {
            return None;
        }
    }
    Some(resolved.secret)
}

/// 末 4 位，前面用 … 代替；太短的不露。
fn secret_hint(secret: &str) -> String {
    let chars: Vec<char> = secret.trim().chars().collect();
    if chars.len() <= 8 {
        return "…".to_string();
    }
    format!("…{}", chars[chars.len() - 4..].iter().collect::<String>())
}

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct TranslationSettingsView {
    pub model: String,
    pub base_url: String,
    pub api_protocol: String,
    pub thinking: String,
    pub max_workers: i64,
    pub api_key_configured: bool,
    /// 末 4 位，例如 `…a1b2`；没配为空。
    pub api_key_hint: String,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct OcrSettingsView {
    pub provider: String,
    pub token_configured: bool,
    pub token_hint: String,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct UpdatedByView {
    pub user_id: String,
    pub username: String,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct SettingsOptionsView {
    pub api_protocols: &'static [&'static str],
    pub thinking_levels: &'static [&'static str],
    pub ocr_providers: &'static [&'static str],
    pub max_workers_limit: i64,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct PlatformSettingsView {
    /// `database`（管理后台保存过）或 `environment`（RETAIN_PLATFORM_* 环境变量）。
    pub source: &'static str,
    pub translation: TranslationSettingsView,
    pub ocr: OcrSettingsView,
    /// 翻译和 OCR 都配齐了。
    pub ready: bool,
    /// 缺的项：translation_model / translation_base_url / translation_api_key / ocr_provider / ocr_token。
    pub missing: Vec<&'static str>,
    pub updated_at: Option<String>,
    pub updated_by: Option<UpdatedByView>,
    pub options: SettingsOptionsView,
}

pub fn view(
    db: &Db,
    data_root: &std::path::Path,
    env: &PlatformModels,
) -> Result<PlatformSettingsView, AppError> {
    let (record, saved) = current_record(db, env)?;
    let key = resolve_secret(
        data_root,
        &record.translation_credential_ref,
        TRANSLATION_KEY_KIND,
        None,
    );
    let token = resolve_secret(
        data_root,
        &record.ocr_credential_ref,
        OCR_TOKEN_KIND,
        Some(&record.ocr_provider),
    );
    let mut missing = Vec::new();
    if record.translation_model.trim().is_empty() {
        missing.push("translation_model");
    }
    if record.translation_base_url.trim().is_empty() {
        missing.push("translation_base_url");
    }
    if key.is_none() {
        missing.push("translation_api_key");
    }
    if record.ocr_provider.trim().is_empty() {
        missing.push("ocr_provider");
    }
    if token.is_none() {
        missing.push("ocr_token");
    }
    let updated_by = if saved && !record.updated_by.is_empty() {
        let username = db
            .get_user(&record.updated_by)
            .map_err(db_error)?
            .map(|user| user.username)
            .unwrap_or_default();
        Some(UpdatedByView {
            user_id: record.updated_by.clone(),
            username,
        })
    } else {
        None
    };
    Ok(PlatformSettingsView {
        source: if saved { "database" } else { "environment" },
        translation: TranslationSettingsView {
            model: record.translation_model.clone(),
            base_url: record.translation_base_url.clone(),
            api_protocol: record.translation_api_protocol.clone(),
            thinking: record.translation_thinking.clone(),
            max_workers: record.translation_max_workers,
            api_key_configured: key.is_some(),
            api_key_hint: key.as_deref().map(secret_hint).unwrap_or_default(),
        },
        ocr: OcrSettingsView {
            provider: record.ocr_provider.clone(),
            token_configured: token.is_some(),
            token_hint: token.as_deref().map(secret_hint).unwrap_or_default(),
        },
        ready: missing.is_empty(),
        missing,
        updated_at: saved.then(|| record.updated_at.clone()),
        updated_by,
        options: SettingsOptionsView {
            api_protocols: TRANSLATION_API_PROTOCOLS,
            thinking_levels: TRANSLATION_THINKING_LEVELS,
            ocr_providers: PLATFORM_OCR_PROVIDERS,
            max_workers_limit: MAX_WORKERS_LIMIT,
        },
    })
}

// ---------------------------------------------------------------- 保存

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SaveTranslationSettings {
    #[serde(default)]
    pub model: String,
    #[serde(default)]
    pub base_url: String,
    #[serde(default)]
    pub api_protocol: String,
    #[serde(default)]
    pub thinking: String,
    #[serde(default)]
    pub max_workers: i64,
    /// 不传 / 空串 = 保留原来的；传了就换。
    #[serde(default)]
    pub api_key: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SaveOcrSettings {
    #[serde(default)]
    pub provider: String,
    /// 不传 / 空串 = 保留原来的；传了就换。换服务商时必须传。
    #[serde(default)]
    pub token: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SavePlatformSettingsInput {
    pub translation: SaveTranslationSettings,
    pub ocr: SaveOcrSettings,
}

fn provided(secret: &Option<String>) -> Option<&str> {
    secret
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn clean_text(name: &'static str, value: &str) -> Result<String, AppError> {
    let value = value.trim();
    if value.chars().count() > MAX_TEXT_CHARS || value.chars().any(char::is_control) {
        return Err(invalid(
            "INVALID_SETTING",
            format!("{name} 太长或含有非法字符"),
        ));
    }
    Ok(value.to_string())
}

fn create_secret(
    data_root: &std::path::Path,
    kind: &str,
    provider: &str,
    label: &str,
    secret: &str,
) -> Result<String, AppError> {
    let created = create_credential(
        data_root,
        CreateCredentialInput {
            kind: kind.to_string(),
            provider: provider.to_string(),
            label: label.to_string(),
            secret: secret.to_string(),
            expected_revision: None,
        },
    )?;
    Ok(created.credential.credential_ref)
}

/// 换下来的、管理后台自己建的旧凭据：没有任务再用就删（有任务在用 delete_credential 会拒绝）。尽力而为。
fn retire_owned_credential(
    db: &Db,
    data_root: &std::path::Path,
    old_ref: &str,
    owned: bool,
    new_ref: &str,
) {
    if !owned || old_ref.trim().is_empty() || old_ref == new_ref {
        return;
    }
    if let Err(error) = delete_credential(db, data_root, old_ref, None, false) {
        tracing::info!("platform settings: keeping replaced credential {old_ref}: {error:?}");
    }
}

pub fn save(
    db: &Db,
    data_root: &std::path::Path,
    env: &PlatformModels,
    deepseek_runtime: &DeepSeekRuntimeConfig,
    actor_user_id: &str,
    input: SavePlatformSettingsInput,
) -> Result<PlatformSettingsView, AppError> {
    let (current, _) = current_record(db, env)?;
    let translation = &input.translation;
    let model = clean_text("模型名", &translation.model)?;
    let base_url = clean_text("接口地址", &translation.base_url)?;
    let api_protocol = translation.api_protocol.trim().to_ascii_lowercase();
    let thinking = translation.thinking.trim().to_ascii_lowercase();
    if !api_protocol.is_empty() && !TRANSLATION_API_PROTOCOLS.contains(&api_protocol.as_str()) {
        return Err(invalid(
            "INVALID_API_PROTOCOL",
            format!("接口协议只能是 {}", TRANSLATION_API_PROTOCOLS.join("、")),
        ));
    }
    if !thinking.is_empty() && !TRANSLATION_THINKING_LEVELS.contains(&thinking.as_str()) {
        return Err(invalid(
            "INVALID_THINKING",
            format!("思考深度只能是 {}", TRANSLATION_THINKING_LEVELS.join("、")),
        ));
    }
    if !(0..=MAX_WORKERS_LIMIT).contains(&translation.max_workers) {
        return Err(invalid(
            "INVALID_MAX_WORKERS",
            format!("并发上限要在 0～{MAX_WORKERS_LIMIT} 之间（0 = 不限）"),
        ));
    }
    if !base_url.is_empty() {
        validate_provider_base_url(&base_url, deepseek_runtime.allow_private_urls).map_err(
            |error| {
                AppError::account(
                    StatusCode::BAD_REQUEST,
                    "INVALID_BASE_URL",
                    "接口地址不可用：要是 http(s) 地址，不能带账号密码，内网地址默认不允许",
                    json!({ "reason": format!("{error:?}") }),
                )
            },
        )?;
    }
    let provider = input.ocr.provider.trim().to_ascii_lowercase();
    if !provider.is_empty() && !PLATFORM_OCR_PROVIDERS.contains(&provider.as_str()) {
        return Err(invalid(
            "INVALID_OCR_PROVIDER",
            format!("OCR 服务商只能是 {}", PLATFORM_OCR_PROVIDERS.join("、")),
        ));
    }
    let new_token = provided(&input.ocr.token);
    let provider_changed = !provider.eq_ignore_ascii_case(current.ocr_provider.trim());
    if provider_changed && !provider.is_empty() && new_token.is_none() {
        return Err(invalid(
            "OCR_TOKEN_REQUIRED",
            "换了 OCR 服务商，要同时填新的 token",
        ));
    }

    // 校验都过了才动凭据库。
    let mut record = PlatformSettingsRecord {
        translation_model: model,
        translation_base_url: base_url,
        translation_api_protocol: api_protocol,
        translation_thinking: thinking,
        translation_max_workers: translation.max_workers,
        translation_credential_ref: current.translation_credential_ref.clone(),
        translation_credential_owned: current.translation_credential_owned,
        ocr_provider: provider.clone(),
        ocr_credential_ref: current.ocr_credential_ref.clone(),
        ocr_credential_owned: current.ocr_credential_owned,
        updated_at: now_iso(),
        updated_by: actor_user_id.to_string(),
    };
    if let Some(api_key) = provided(&translation.api_key) {
        record.translation_credential_ref = create_secret(
            data_root,
            TRANSLATION_KEY_KIND,
            "platform",
            "平台翻译模型（管理后台）",
            api_key,
        )?;
        record.translation_credential_owned = true;
    }
    if provider.is_empty() {
        record.ocr_credential_ref.clear();
        record.ocr_credential_owned = false;
    } else if let Some(token) = new_token {
        record.ocr_credential_ref = create_secret(
            data_root,
            OCR_TOKEN_KIND,
            &provider,
            "平台 OCR（管理后台）",
            token,
        )?;
        record.ocr_credential_owned = true;
    }
    db.save_platform_settings(&record).map_err(db_error)?;
    retire_owned_credential(
        db,
        data_root,
        &current.translation_credential_ref,
        current.translation_credential_owned,
        &record.translation_credential_ref,
    );
    retire_owned_credential(
        db,
        data_root,
        &current.ocr_credential_ref,
        current.ocr_credential_owned,
        &record.ocr_credential_ref,
    );
    view(db, data_root, env)
}

// ---------------------------------------------------------------- 检测

/// 检测用的值：没传的用已保存（或环境变量）的。
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TestPlatformInput {
    /// `translation` 或 `ocr`。
    pub target: String,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub base_url: Option<String>,
    #[serde(default)]
    pub api_protocol: Option<String>,
    #[serde(default)]
    pub api_key: Option<String>,
    #[serde(default)]
    pub provider: Option<String>,
    #[serde(default)]
    pub token: Option<String>,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct PlatformTestView {
    pub target: String,
    pub ok: bool,
    /// 机器可读的结果，如 ok / unauthorized / model_not_found / rate_limited / missing_input。
    pub status: String,
    /// 中文说明，直接给人看。
    pub summary: String,
    /// 建议怎么处理（有的话）。
    pub hint: Option<String>,
}

pub struct ProbeRuntimes {
    pub deepseek: DeepSeekRuntimeConfig,
    pub mineru: MineruRuntimeConfig,
    pub paddle: PaddleRuntimeConfig,
}

fn missing_input(target: &str, summary: &str) -> PlatformTestView {
    PlatformTestView {
        target: target.to_string(),
        ok: false,
        status: "missing_input".to_string(),
        summary: summary.to_string(),
        hint: None,
    }
}

fn from_probe(
    target: &str,
    result: Result<ProviderProbeView, AppError>,
) -> PlatformTestView {
    match result {
        Ok(view) => PlatformTestView {
            target: target.to_string(),
            ok: view.ok,
            status: view.status.to_string(),
            summary: view.summary,
            hint: view.operator_hint,
        },
        // 探针自己拒绝（地址不合规等）也算「检测没通过」，而不是接口报错。
        Err(error) => PlatformTestView {
            target: target.to_string(),
            ok: false,
            status: "invalid_input".to_string(),
            summary: "填写的值不能用来连接，请检查接口地址".to_string(),
            hint: Some(format!("{error:?}")),
        },
    }
}

fn pick(value: &Option<String>, saved: &str) -> String {
    value.as_deref().unwrap_or(saved).trim().to_string()
}

pub async fn test(
    db: &Db,
    data_root: &std::path::Path,
    env: &PlatformModels,
    runtimes: &ProbeRuntimes,
    input: TestPlatformInput,
) -> Result<PlatformTestView, AppError> {
    let (current, _) = current_record(db, env)?;
    // 平台设置只在多用户下用：地址照旧按多用户拦（`RUST_API_ALLOW_PRIVATE_PROVIDER_URLS=1` 才放开）；
    // 超时、不重试、不跟随重定向和公开的校验接口一样。
    let policy = ProbePolicy::new(
        runtimes.deepseek.probe_timeout_secs,
        PrivateTargets::for_deployment(DeploymentMode::Multi, runtimes.deepseek.allow_private_urls),
    );
    match input.target.trim() {
        "translation" => {
            let target = "translation";
            let base_url = pick(&input.base_url, &current.translation_base_url);
            let model = pick(&input.model, &current.translation_model);
            let api_key = match provided(&input.api_key) {
                Some(key) => Some(key.to_string()),
                None => resolve_secret(
                    data_root,
                    &current.translation_credential_ref,
                    TRANSLATION_KEY_KIND,
                    None,
                ),
            };
            let Some(api_key) = api_key else {
                return Ok(missing_input(target, "还没有填 API Key"));
            };
            if base_url.is_empty() {
                return Ok(missing_input(target, "还没有填接口地址"));
            }
            if model.is_empty() {
                return Ok(missing_input(target, "还没有填模型名"));
            }
            let request = DeepSeekTokenValidationRequest {
                api_key,
                base_url,
                model,
                api_protocol: pick(&input.api_protocol, &current.translation_api_protocol),
            };
            Ok(from_probe(
                target,
                validate_deepseek_token_view(request, runtimes.deepseek.clone(), policy).await,
            ))
        }
        "ocr" => {
            let target = "ocr";
            let provider = pick(&input.provider, &current.ocr_provider).to_ascii_lowercase();
            if provider.is_empty() {
                return Ok(missing_input(target, "还没有选 OCR 服务商"));
            }
            let token = match provided(&input.token) {
                Some(token) => Some(token.to_string()),
                // 已保存的 token 带着服务商标签：换了服务商就不能拿旧 token 去试。
                None => resolve_secret(
                    data_root,
                    &current.ocr_credential_ref,
                    OCR_TOKEN_KIND,
                    Some(&provider),
                ),
            };
            let Some(token) = token else {
                return Ok(missing_input(target, "还没有填这个服务商的 token"));
            };
            let result = match provider.as_str() {
                "mineru" => {
                    validate_mineru_token_view(
                        MineruTokenValidationRequest {
                            mineru_token: token,
                            base_url: String::new(),
                            model_version: String::new(),
                        },
                        runtimes.mineru.clone(),
                        policy,
                    )
                    .await
                }
                "paddle" => {
                    validate_paddle_token_view(
                        PaddleTokenValidationRequest {
                            paddle_token: token,
                            base_url: String::new(),
                        },
                        runtimes.paddle.clone(),
                        policy,
                    )
                    .await
                }
                _ => {
                    return Err(invalid(
                        "INVALID_OCR_PROVIDER",
                        format!("OCR 服务商只能是 {}", PLATFORM_OCR_PROVIDERS.join("、")),
                    ))
                }
            };
            Ok(from_probe(target, result))
        }
        _ => Err(invalid(
            "INVALID_TEST_TARGET",
            "target 只能是 translation 或 ocr",
        )),
    }
}

pub mod api;

#[cfg(test)]
mod tests;
