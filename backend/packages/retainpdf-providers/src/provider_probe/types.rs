use serde::{Deserialize, Serialize};

use super::policy::truncate_provider_message;

// 三个请求体都拒绝不认识的字段（400）：`base_url` 拼错以前会静默走默认地址，校验的是另一个服务商。

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MineruTokenValidationRequest {
    pub mineru_token: String,
    #[serde(default)]
    pub base_url: String,
    #[serde(default)]
    pub model_version: String,
}

/// 三个密钥校验接口（MinerU、Paddle、翻译接口）共用的返回。以前叫 `MineruTokenValidationView`，
/// 只改了 Rust 里的名字，JSON 字段不变。各家 `status` 的取值见 `docs/core/rust_api/08-Provider 校验接口.md`。
#[derive(Debug, Serialize)]
pub struct ProviderProbeView {
    pub ok: bool,
    pub status: &'static str,
    pub summary: String,
    pub retryable: bool,
    pub provider_code: Option<String>,
    pub provider_message: Option<String>,
    pub operator_hint: Option<String>,
    pub trace_id: Option<String>,
    pub base_url: String,
    pub checked_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PaddleTokenValidationRequest {
    pub paddle_token: String,
    #[serde(default)]
    pub base_url: String,
}

/// 翻译接口校验和 DeepSeek 余额共用（CLI 查余额时四个字段都发）。
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DeepSeekTokenValidationRequest {
    pub api_key: String,
    #[serde(default)]
    pub base_url: String,
    /// 翻译实际要调用的模型名。为空时探针只能验 Key，不能验模型。
    #[serde(default)]
    pub model: String,
    /// 接口协议:`openai`(默认)、`openai_responses` 或 `anthropic`。探针按翻译实际用的协议发请求。
    #[serde(default)]
    pub api_protocol: String,
}

#[derive(Debug, Serialize)]
pub struct DeepSeekBalanceInfoView {
    pub currency: String,
    pub total_balance: String,
    pub granted_balance: String,
    pub topped_up_balance: String,
}

#[derive(Debug, Serialize)]
pub struct DeepSeekBalanceView {
    pub ok: bool,
    pub status: &'static str,
    pub summary: String,
    pub retryable: bool,
    pub is_available: bool,
    pub balance_infos: Vec<DeepSeekBalanceInfoView>,
    pub provider_code: Option<String>,
    pub provider_message: Option<String>,
    pub trace_id: Option<String>,
    pub base_url: String,
    pub checked_at: String,
}

impl ProviderProbeView {
    /// 交出去之前截短服务商原文：一整页 HTML 错误页不原样转给前端。
    pub(super) fn bounded(mut self) -> Self {
        self.provider_message = truncate_provider_message(self.provider_message);
        self.operator_hint = truncate_provider_message(self.operator_hint);
        self
    }
}

impl DeepSeekBalanceView {
    pub(super) fn bounded(mut self) -> Self {
        self.provider_message = truncate_provider_message(self.provider_message);
        self
    }
}
