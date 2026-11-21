use std::net::{Ipv4Addr, Ipv6Addr};

use url::Host;

use retainpdf_api_base::error::AppError;

use super::policy::PrivateTargets;

/// Validate a client-supplied provider URL before it carries a bearer token.
/// This prevents probe endpoints from becoming SSRF or credential-exfiltration
/// primitives. Self-hosted deployments can explicitly allow private targets.
///
/// `allow_private_urls=false` 拦回环、私网和链路本地（多用户的平台设置在用）；
/// 校验接口按部署模式走 [`validate_probe_base_url`]。
pub fn validate_provider_base_url(
    raw_base_url: &str,
    allow_private_urls: bool,
) -> Result<(), AppError> {
    let targets = if allow_private_urls {
        PrivateTargets::AllowAll
    } else {
        PrivateTargets::Block
    };
    validate_probe_base_url(raw_base_url, targets)
}

/// 校验接口用的地址检查。只看字面地址：域名解析到内网不拦（多用户已冻结，只记录，
/// 见 `docs/ops/planning/api-reorg/20261022-服务商探测与用量.md`）。
pub(super) fn validate_probe_base_url(
    raw_base_url: &str,
    targets: PrivateTargets,
) -> Result<(), AppError> {
    let trimmed = raw_base_url.trim();
    let parsed = url::Url::parse(trimmed)
        .map_err(|_| AppError::bad_request("base_url must be a valid absolute http(s) URL"))?;

    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err(AppError::bad_request(
            "base_url scheme must be http or https",
        ));
    }

    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err(AppError::bad_request(
            "base_url must not contain embedded credentials",
        ));
    }

    let local_allowed = match targets {
        PrivateTargets::AllowAll => return Ok(()),
        PrivateTargets::AllowLocal => true,
        PrivateTargets::Block => false,
    };

    match parsed.host() {
        Some(Host::Ipv4(ip)) if local_allowed => {
            if ip.is_link_local() {
                return Err(AppError::bad_request(
                    "base_url host is not allowed; link-local IPs (cloud metadata) are blocked",
                ));
            }
        }
        Some(Host::Ipv6(ip)) if local_allowed => {
            if is_link_local_ipv6(ip) {
                return Err(AppError::bad_request(
                    "base_url host is not allowed; link-local IPs (cloud metadata) are blocked",
                ));
            }
        }
        Some(Host::Domain(_)) if local_allowed => {}
        Some(Host::Domain(domain)) => {
            if domain.eq_ignore_ascii_case("localhost") {
                return Err(AppError::bad_request(
                    "base_url host is not allowed; localhost/private targets are blocked",
                ));
            }
        }
        Some(Host::Ipv4(ip)) => {
            if is_disallowed_ipv4(ip) {
                return Err(AppError::bad_request(
                    "base_url host is not allowed; loopback/private/link-local IPs are blocked",
                ));
            }
        }
        Some(Host::Ipv6(ip)) => {
            if is_disallowed_ipv6(ip) {
                return Err(AppError::bad_request(
                    "base_url host is not allowed; loopback/private/link-local IPs are blocked",
                ));
            }
        }
        None => {
            return Err(AppError::bad_request("base_url must include a host"));
        }
    }

    Ok(())
}

fn is_disallowed_ipv4(ip: Ipv4Addr) -> bool {
    ip.is_loopback() || ip.is_link_local() || ip.is_private() || ip.is_unspecified()
}

/// `fe80::/10`，以及映射到 `169.254.0.0/16` 的 IPv4 地址。
fn is_link_local_ipv6(ip: Ipv6Addr) -> bool {
    if let Some(mapped) = ip.to_ipv4_mapped() {
        return mapped.is_link_local();
    }
    ip.segments()[0] & 0xffc0 == 0xfe80
}

fn is_disallowed_ipv6(ip: Ipv6Addr) -> bool {
    if ip.is_loopback() || ip.is_unspecified() {
        return true;
    }
    if let Some(mapped) = ip.to_ipv4_mapped() {
        return is_disallowed_ipv4(mapped);
    }
    let segments = ip.segments();
    if segments[0] & 0xfe00 == 0xfc00 {
        return true;
    }
    if segments[0] & 0xffc0 == 0xfe80 {
        return true;
    }
    false
}
