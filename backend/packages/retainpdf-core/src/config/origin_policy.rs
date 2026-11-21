//! 单机模式下哪些网页来源、哪些 `Host` 能用本机 API。
//!
//! 单机版靠 `X-API-Key` 认证，开发栈的默认 key `dev-local-key` 又是公开的，所以不能让任意网页
//! 拿着它调本机 API：
//!
//! - **来源**（CORS 和助手终端 WebSocket 共用 [`OriginPolicyConfig::allows_origin`]）：只认
//!   回环页面（`localhost`、`127.0.0.0/8`、`[::1]`，端口、http/https 不限）、和请求的主机相同只是
//!   端口不同的页面、`RUST_API_ALLOWED_ORIGINS` 列出的来源。`null`（`file://`、沙箱 iframe）不认。
//! - **主机**（防 DNS rebinding，[`OriginPolicyConfig::allows_host`]）：后端监听回环地址时，`Host`
//!   必须是 `localhost`、IP 字面量或 `RUST_API_ALLOWED_HOSTS` 里的主机名；监听非回环地址时只有配了
//!   名单才查。
//!
//! 多用户模式不用这里（它的跨域名单是 `RETAIN_ALLOWED_ORIGINS`，见 `accounts.rs`）。
//! 方案：`docs/ops/planning/api-reorg/20261022-单机来源和主机校验.md`。

use std::net::IpAddr;

use super::env_vars::env_optional_string;

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct OriginPolicyConfig {
    /// 额外放行的网页来源，`scheme://host[:port]`，已转小写、去掉末尾 `/`。
    pub allowed_origins: Vec<String>,
    /// 额外放行的主机名（不带端口），已转小写。
    pub allowed_hosts: Vec<String>,
}

impl OriginPolicyConfig {
    pub fn from_env() -> Self {
        Self::from_lists(
            env_optional_string("RUST_API_ALLOWED_ORIGINS").as_deref().unwrap_or(""),
            env_optional_string("RUST_API_ALLOWED_HOSTS").as_deref().unwrap_or(""),
        )
    }

    /// 逗号分隔的两份名单。`null` 和写不成来源的项丢掉；主机名带的端口去掉。
    pub fn from_lists(origins: &str, hosts: &str) -> Self {
        let allowed_origins = origins
            .split(',')
            .filter_map(|item| parse_origin(item.trim().trim_end_matches('/')))
            .map(|origin| origin.normalized())
            .collect();
        let allowed_hosts = hosts
            .split(',')
            .map(|item| hostname_of(item.trim()))
            .filter(|host| !host.is_empty())
            .collect();
        Self { allowed_origins, allowed_hosts }
    }

    /// 浏览器带来的 `Origin` 能不能用本机 API。`request_hosts` 是这次请求的 `Host`，以及反向代理
    /// 写的 `X-Forwarded-Host`（浏览器跨源时设不了它：设了会先发预检，预检里没有它的值）。
    pub fn allows_origin<'a>(
        &self,
        origin: &str,
        request_hosts: impl IntoIterator<Item = &'a str>,
    ) -> bool {
        let Some(origin) = parse_origin(origin.trim()) else {
            return false;
        };
        if is_loopback_name(&origin.host) {
            return true;
        }
        if request_hosts
            .into_iter()
            .map(hostname_of)
            .any(|host| !host.is_empty() && host == origin.host)
        {
            return true;
        }
        let normalized = origin.normalized();
        self.allowed_origins.iter().any(|item| *item == normalized)
    }

    /// 请求的 `Host` 能不能进来。`host` 为 `None`（HTTP/1.0、命令行直连、单测）放行：
    /// DNS rebinding 一定经过浏览器，浏览器一定带 `Host`。
    pub fn allows_host(&self, host: Option<&str>, listening_on_loopback: bool) -> bool {
        if !listening_on_loopback && self.allowed_hosts.is_empty() {
            return true;
        }
        let Some(host) = host else {
            return true;
        };
        let name = hostname_of(host);
        if is_loopback_name(&name) || name.parse::<IpAddr>().is_ok() {
            return true;
        }
        self.allowed_hosts.iter().any(|item| *item == name)
    }
}

/// 监听地址是不是回环（`127.0.0.0/8`、`::1`、`::ffff:127.x`）。写不成 IP 的当作不是。
pub fn bind_host_is_loopback(host: &str) -> bool {
    match host.trim().parse::<IpAddr>() {
        Ok(IpAddr::V4(address)) => address.is_loopback(),
        Ok(IpAddr::V6(address)) => address
            .to_ipv4_mapped()
            .map_or_else(|| address.is_loopback(), |address| address.is_loopback()),
        Err(_) => false,
    }
}

struct ParsedOrigin {
    scheme: String,
    /// 小写；IPv6 不带方括号。
    host: String,
    port: Option<u16>,
}

impl ParsedOrigin {
    fn normalized(&self) -> String {
        let host = if self.host.contains(':') {
            format!("[{}]", self.host)
        } else {
            self.host.clone()
        };
        match self.port {
            Some(port) => format!("{}://{host}:{port}", self.scheme),
            None => format!("{}://{host}", self.scheme),
        }
    }
}

/// `http(s)://host[:port]`，别的（`null`、带路径、`file:`、扩展页）一律不认。
fn parse_origin(raw: &str) -> Option<ParsedOrigin> {
    let (scheme, rest) = raw.split_once("://")?;
    let scheme = scheme.to_ascii_lowercase();
    if scheme != "http" && scheme != "https" {
        return None;
    }
    if rest.is_empty() || rest.contains(['/', '?', '#', '@']) {
        return None;
    }
    let (host, port) = split_host_port(rest)?;
    if host.is_empty() {
        return None;
    }
    Some(ParsedOrigin { scheme, host, port })
}

/// `host[:port]` / `[v6][:port]` → (小写主机名, 端口)。端口写坏了返回 `None`。
fn split_host_port(raw: &str) -> Option<(String, Option<u16>)> {
    if let Some(rest) = raw.strip_prefix('[') {
        let (host, after) = rest.split_once(']')?;
        let port = match after {
            "" => None,
            _ => Some(after.strip_prefix(':')?.parse().ok()?),
        };
        return Some((host.to_ascii_lowercase(), port));
    }
    match raw.rsplit_once(':') {
        // 不带方括号的多个冒号是裸 IPv6（Host 里不会这样写，名单里可能）。
        Some((host, _)) if host.contains(':') => Some((raw.to_ascii_lowercase(), None)),
        Some((host, port)) => Some((host.to_ascii_lowercase(), Some(port.parse().ok()?))),
        None => Some((raw.to_ascii_lowercase(), None)),
    }
}

/// `Host` 头或名单里的一项 → 小写主机名（去端口、去 IPv6 方括号、去末尾的点）。写坏了返回空串。
fn hostname_of(raw: &str) -> String {
    let raw = raw.split(',').next().unwrap_or("").trim();
    split_host_port(raw)
        .map(|(host, _)| host.trim_end_matches('.').to_string())
        .unwrap_or_default()
}

fn is_loopback_name(host: &str) -> bool {
    host == "localhost" || host.parse::<IpAddr>().is_ok_and(|address| match address {
        IpAddr::V4(address) => address.is_loopback(),
        IpAddr::V6(address) => address
            .to_ipv4_mapped()
            .map_or_else(|| address.is_loopback(), |address| address.is_loopback()),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn origins_parse_strictly() {
        let policy = OriginPolicyConfig::default();
        for origin in ["http://127.0.0.1:40001", "https://localhost", "http://[::1]:1", "HTTP://LocalHost:9"] {
            assert!(policy.allows_origin(origin, []), "{origin}");
        }
        for origin in [
            "null",
            "",
            "file://",
            "chrome-extension://abc",
            "http://localhost.evil.example",
            "http://127.0.0.1.evil.example",
            "http://localhost:40001/path",
            "http://user@localhost",
            "http://localhost:notaport",
            "https://evil.example",
        ] {
            assert!(!policy.allows_origin(origin, ["127.0.0.1:41000"]), "{origin}");
        }
    }

    #[test]
    fn same_host_ignores_ports_and_case() {
        let policy = OriginPolicyConfig::default();
        assert!(policy.allows_origin("http://192.168.1.5:40001", ["192.168.1.5:41000"]));
        assert!(policy.allows_origin("https://PDF.example.com", ["pdf.example.com"]));
        assert!(policy.allows_origin("http://[fe80::1]:40001", ["[FE80::1]:41000"]));
        assert!(!policy.allows_origin("http://192.168.1.6:40001", ["192.168.1.5:41000"]));
        assert!(!policy.allows_origin("http://192.168.1.5:40001", [""]));
    }

    #[test]
    fn configured_origins_match_exactly() {
        let policy = OriginPolicyConfig::from_lists(" https://App.Example.com/ , null, ,http://10.0.0.2:8080", "");
        assert_eq!(policy.allowed_origins, ["https://app.example.com", "http://10.0.0.2:8080"]);
        assert!(policy.allows_origin("https://app.example.com", ["127.0.0.1:41000"]));
        assert!(policy.allows_origin("http://10.0.0.2:8080", ["127.0.0.1:41000"]));
        assert!(!policy.allows_origin("http://10.0.0.2:8081", ["127.0.0.1:41000"]));
        assert!(!policy.allows_origin("http://app.example.com", ["127.0.0.1:41000"]));
    }

    #[test]
    fn host_check_only_bites_on_loopback_or_with_a_list() {
        let open = OriginPolicyConfig::default();
        assert!(!open.allows_host(Some("evil.example:41000"), true));
        assert!(!open.allows_host(Some("localhost.evil.example"), true));
        for host in ["127.0.0.1:41000", "localhost", "LOCALHOST:1", "[::1]:41000", "10.0.0.2", "localhost."] {
            assert!(open.allows_host(Some(host), true), "{host}");
        }
        assert!(open.allows_host(None, true));
        assert!(open.allows_host(Some("evil.example"), false), "非回环监听没配名单不查");

        let listed = OriginPolicyConfig::from_lists("", "PDF.example.com:443, ,box.lan");
        assert_eq!(listed.allowed_hosts, ["pdf.example.com", "box.lan"]);
        for loopback in [true, false] {
            assert!(listed.allows_host(Some("pdf.example.com"), loopback));
            assert!(listed.allows_host(Some("box.lan:41000"), loopback));
            assert!(listed.allows_host(Some("127.0.0.1:41000"), loopback));
            assert!(!listed.allows_host(Some("evil.example"), loopback));
        }
    }

    #[test]
    fn loopback_bind_hosts() {
        for host in ["127.0.0.1", "127.0.0.2", "::1", "::ffff:127.0.0.1"] {
            assert!(bind_host_is_loopback(host), "{host}");
        }
        for host in ["0.0.0.0", "::", "192.168.1.2", "::ffff:192.168.1.2", "localhost", ""] {
            assert!(!bind_host_is_loopback(host), "{host}");
        }
    }
}
