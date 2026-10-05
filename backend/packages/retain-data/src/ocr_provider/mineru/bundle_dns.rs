use std::net::{Ipv4Addr, SocketAddr};
use std::time::Duration;

use anyhow::{bail, Context, Result};
use reqwest::{Client, Url};
use serde_json::Value;

const BUNDLE_HOST: &str = "cdn-mineru.openxlab.org.cn";

pub(super) fn should_refresh_for_error(raw_url: &str, error: &reqwest::Error) -> bool {
    let mut source = std::error::Error::source(error);
    let mut description = String::new();
    while let Some(cause) = source {
        description.push_str(&cause.to_string());
        source = cause.source();
    }
    should_refresh_bundle_dns(raw_url, &description)
}

pub(super) fn should_refresh_bundle_dns(raw_url: &str, error: &str) -> bool {
    let Ok(url) = Url::parse(raw_url) else {
        return false;
    };
    url.scheme() == "https"
        && url.host_str() == Some(BUNDLE_HOST)
        && url.port_or_known_default() == Some(443)
        && error.to_ascii_lowercase().contains("certificate")
        && error.to_ascii_lowercase().contains("expired")
}

fn public_bundle_addresses(response: &Value) -> Vec<SocketAddr> {
    if response.get("Status").and_then(Value::as_u64) != Some(0) {
        return Vec::new();
    }
    let mut addresses = Vec::new();
    for answer in response
        .get("Answer")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        if answer.get("type").and_then(Value::as_u64) != Some(1) {
            continue;
        }
        let Some(ip) = answer
            .get("data")
            .and_then(Value::as_str)
            .and_then(|s| s.parse::<Ipv4Addr>().ok())
        else {
            continue;
        };
        if ip.is_private()
            || ip.is_loopback()
            || ip.is_link_local()
            || ip.is_unspecified()
            || ip.is_multicast()
            || ip.is_broadcast()
            || ip.is_documentation()
            || ip.octets()[0] == 0
            || ip.octets()[0] >= 240
            || (ip.octets()[0] == 100 && (64..=127).contains(&ip.octets()[1]))
            || (ip.octets()[0] == 198 && (18..=19).contains(&ip.octets()[1]))
        {
            continue;
        }
        let address = SocketAddr::from((ip, 443));
        if !addresses.contains(&address) {
            addresses.push(address);
        }
    }
    addresses
}

pub(super) async fn refreshed_bundle_client(http: &Client, timeout_secs: u64) -> Result<Client> {
    // A stale overseas CDN edge can have an expired certificate while the
    // same official hostname has healthy edges. Refresh only this hostname;
    // keep SNI, HTTPS certificate validation, and the configured proxy intact.
    let response: Value = http
        .get("https://dns.alidns.com/resolve")
        .query(&[("name", BUNDLE_HOST), ("type", "A")])
        .timeout(Duration::from_secs(10))
        .send()
        .await
        .map_err(reqwest::Error::without_url)?
        .error_for_status()
        .map_err(reqwest::Error::without_url)?
        .json()
        .await
        .context("MinerU CDN DNS response is invalid")?;
    let addresses = public_bundle_addresses(&response);
    if addresses.is_empty() {
        bail!("MinerU CDN DNS refresh returned no public IPv4 addresses");
    }
    Client::builder()
        .connect_timeout(Duration::from_secs(timeout_secs))
        .timeout(Duration::from_secs(timeout_secs))
        .resolve_to_addrs(BUNDLE_HOST, &addresses)
        .build()
        .context("MinerU CDN DNS refresh client failed")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn expired_official_bundle_certificate_can_refresh_dns_without_changing_the_url() {
        assert!(should_refresh_bundle_dns(
            "https://cdn-mineru.openxlab.org.cn/pdf/result.zip?signature=private-marker",
            "client error (Connect): invalid peer certificate: certificate expired",
        ));
    }

    #[test]
    fn arbitrary_hosts_non_https_and_non_certificate_errors_do_not_refresh_dns() {
        for url in [
            "http://cdn-mineru.openxlab.org.cn/result.zip",
            "https://example.com/result.zip",
            "https://cdn-mineru.openxlab.org.cn.evil.example/result.zip",
            "https://cdn-mineru.openxlab.org.cn:8443/result.zip",
        ] {
            assert!(!should_refresh_bundle_dns(url, "certificate expired"));
        }
        assert!(!should_refresh_bundle_dns(
            "https://cdn-mineru.openxlab.org.cn/result.zip",
            "403 forbidden",
        ));
    }

    #[test]
    fn dns_answers_accept_only_successful_public_ipv4_addresses() {
        let answer = json!({"Status":0,"Answer":[
            {"type":5,"data":"cdn.example"},
            {"type":1,"data":"127.0.0.1"},
            {"type":1,"data":"192.168.1.1"},
            {"type":1,"data":"169.254.169.254"},
            {"type":1,"data":"100.64.0.1"},
            {"type":1,"data":"198.18.0.1"},
            {"type":1,"data":"0.0.0.0"},
            {"type":1,"data":"not an address"},
            {"type":1,"data":"183.232.14.3"},
            {"type":1,"data":"183.232.14.3"},
            {"type":1,"data":"120.233.206.23"}
        ]});
        assert_eq!(
            public_bundle_addresses(&answer),
            vec![
                "183.232.14.3:443".parse::<SocketAddr>().unwrap(),
                "120.233.206.23:443".parse::<SocketAddr>().unwrap(),
            ]
        );
        assert!(public_bundle_addresses(
            &json!({"Status":2,"Answer":[{"type":1,"data":"183.232.14.3"}]})
        )
        .is_empty());
    }

    #[tokio::test]
    async fn certificate_words_in_url_do_not_trigger_refresh_for_unrelated_errors() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!(
            "http://{}/certificate-expired?signature=private-marker",
            listener.local_addr().unwrap()
        );
        drop(listener);
        let error = Client::builder()
            .no_proxy()
            .build()
            .unwrap()
            .get(url)
            .send()
            .await
            .unwrap_err();
        assert!(!should_refresh_for_error(
            "https://cdn-mineru.openxlab.org.cn/result.zip",
            &error
        ));
    }
}
