//! Application facade for provider credential probes.
//!
//! HTTP routes depend on this module instead of the provider-specific probe
//! implementation. This keeps transport handlers independent from provider
//! clients, URL policy, and runtime configuration details.

use crate::config::{DeepSeekRuntimeConfig, MineruRuntimeConfig, PaddleRuntimeConfig};
use crate::error::AppError;
use once_cell::sync::Lazy;
use std::sync::atomic::{AtomicBool, Ordering};

pub use super::provider_probe::{
    DeepSeekBalanceInfoView, DeepSeekBalanceView, DeepSeekTokenValidationRequest,
    MineruTokenValidationRequest, MineruTokenValidationView, ModelListRequest, ModelListView,
    PaddleTokenValidationRequest,
};

/// Narrow application dependency bundle assembled at the HTTP boundary.
pub struct ProviderApiDeps {
    mineru_runtime: MineruRuntimeConfig,
    paddle_runtime: PaddleRuntimeConfig,
    deepseek_runtime: DeepSeekRuntimeConfig,
}

static PRIVATE_PROVIDER_URLS_ENABLED: Lazy<AtomicBool> = Lazy::new(|| AtomicBool::new(false));
static PRIVATE_PROVIDER_URLS_CONFIGURED: Lazy<AtomicBool> = Lazy::new(|| AtomicBool::new(false));

pub fn initialize_private_provider_urls(enabled: bool) {
    if !PRIVATE_PROVIDER_URLS_CONFIGURED.swap(true, Ordering::AcqRel) {
        PRIVATE_PROVIDER_URLS_ENABLED.store(enabled, Ordering::Release);
    }
}

pub fn set_private_provider_urls(enabled: bool) {
    PRIVATE_PROVIDER_URLS_CONFIGURED.store(true, Ordering::Release);
    PRIVATE_PROVIDER_URLS_ENABLED.store(enabled, Ordering::Release);
}

pub fn private_provider_urls_enabled() -> bool {
    PRIVATE_PROVIDER_URLS_ENABLED.load(Ordering::Acquire)
}

impl ProviderApiDeps {
    pub fn new(
        mineru_runtime: MineruRuntimeConfig,
        paddle_runtime: PaddleRuntimeConfig,
        deepseek_runtime: DeepSeekRuntimeConfig,
    ) -> Self {
        initialize_private_provider_urls(deepseek_runtime.allow_private_urls);
        Self {
            mineru_runtime,
            paddle_runtime,
            deepseek_runtime,
        }
    }

    fn mineru_runtime(&self) -> MineruRuntimeConfig {
        let mut runtime = self.mineru_runtime.clone();
        runtime.allow_private_urls = private_provider_urls_enabled();
        runtime
    }

    fn paddle_runtime(&self) -> PaddleRuntimeConfig {
        let mut runtime = self.paddle_runtime.clone();
        runtime.allow_private_urls = private_provider_urls_enabled();
        runtime
    }

    fn deepseek_runtime(&self) -> DeepSeekRuntimeConfig {
        let mut runtime = self.deepseek_runtime.clone();
        runtime.allow_private_urls = private_provider_urls_enabled();
        runtime
    }
}

pub async fn validate_mineru_token(
    deps: &ProviderApiDeps,
    payload: MineruTokenValidationRequest,
) -> Result<MineruTokenValidationView, AppError> {
    super::provider_probe::validate_mineru_token_view(payload, deps.mineru_runtime()).await
}

pub async fn validate_paddle_token(
    deps: &ProviderApiDeps,
    payload: PaddleTokenValidationRequest,
) -> Result<MineruTokenValidationView, AppError> {
    super::provider_probe::validate_paddle_token_view(payload, deps.paddle_runtime()).await
}

pub async fn validate_deepseek_token(
    deps: &ProviderApiDeps,
    payload: DeepSeekTokenValidationRequest,
) -> Result<MineruTokenValidationView, AppError> {
    super::provider_probe::validate_deepseek_token_view(payload, deps.deepseek_runtime())
        .await
}

pub async fn query_deepseek_balance(
    deps: &ProviderApiDeps,
    payload: DeepSeekTokenValidationRequest,
) -> Result<DeepSeekBalanceView, AppError> {
    super::provider_probe::query_deepseek_balance_view(payload, deps.deepseek_runtime()).await
}

pub async fn list_models(
    deps: &ProviderApiDeps,
    payload: ModelListRequest,
) -> Result<ModelListView, AppError> {
    super::provider_probe::list_models_view(payload, deps.deepseek_runtime()).await
}
