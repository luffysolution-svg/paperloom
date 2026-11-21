//! 密钥校验接口自己的规矩，和正式跑任务的客户端分开：
//!
//! - 超时三家共用一个（默认 20 秒，比网页端等的 30 秒短），不重试；
//! - 不跟随重定向（和模型执行器一样 `Policy::none()`）：重定向会把 Key 带到别的地址
//!   （reqwest 跨主机时只去掉 `Authorization`，不认识 Anthropic 的 `x-api-key`），
//!   重定向目标也不再过私网拦截；
//! - 能不能连本机、内网，按部署模式定，见 [`PrivateTargets`]。

use std::time::Duration;

use retainpdf_core::config::DeploymentMode;

/// 校验接口能不能把 Key 发到本机、内网地址。
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PrivateTargets {
    /// 回环、私网、链路本地一律拦（多用户：地址是网站用户填的，挡 SSRF 和把平台 Key 发到内网）。
    Block,
    /// 放开回环和私网（单机：就是用户自己的机器和局域网，本机的 Ollama、vLLM 要能校验）；
    /// 链路本地（`169.254.x`、`fe80::/10`，云主机的元数据地址）照样拦，正经的模型服务不会在那里。
    AllowLocal,
    /// 全放开：运维显式设了 `RUST_API_ALLOW_PRIVATE_PROVIDER_URLS=1`。
    AllowAll,
}

impl PrivateTargets {
    pub fn for_deployment(mode: DeploymentMode, allow_private_env: bool) -> Self {
        if allow_private_env {
            Self::AllowAll
        } else if mode.is_multi() {
            Self::Block
        } else {
            Self::AllowLocal
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub struct ProbePolicy {
    pub timeout: Duration,
    pub private_targets: PrivateTargets,
}

impl ProbePolicy {
    pub fn new(timeout_secs: u64, private_targets: PrivateTargets) -> Self {
        Self {
            timeout: Duration::from_secs(timeout_secs.max(1)),
            private_targets,
        }
    }

    /// 校验用的 HTTP 客户端：短超时、不跟随重定向。各家在这上面再加自己的设置。
    pub(super) fn http_client_builder(&self) -> reqwest::ClientBuilder {
        reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .connect_timeout(self.timeout)
            .timeout(self.timeout)
    }
}

/// `provider_message` 最多留这么多个字符：服务商回一整页 HTML 错误页时不原样转给前端。
pub(super) const PROVIDER_MESSAGE_MAX_CHARS: usize = 500;

pub(super) fn truncate_provider_message(message: Option<String>) -> Option<String> {
    message.map(|text| {
        if text.chars().count() <= PROVIDER_MESSAGE_MAX_CHARS {
            text
        } else {
            let mut cut: String = text.chars().take(PROVIDER_MESSAGE_MAX_CHARS).collect();
            cut.push('…');
            cut
        }
    })
}
