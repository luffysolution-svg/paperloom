use reqwest::header::{HeaderMap, HeaderValue, USER_AGENT};
use sha2::{Digest, Sha256};

/// OpenCode requires a client identity and a stable, opaque session identifier.
/// Keep these headers scoped to its exact host; other providers stay unchanged.
pub(crate) fn opencode_headers(base_url: &str, session_id: &str) -> HeaderMap {
    let mut headers = HeaderMap::new();
    if url::Url::parse(base_url)
        .ok()
        .and_then(|url| url.host_str().map(str::to_owned))
        .as_deref()
        == Some("opencode.ai")
    {
        headers.insert(
            USER_AGENT,
            HeaderValue::from_static(concat!("RetainPDF/", env!("CARGO_PKG_VERSION"))),
        );
        let digest: String = Sha256::digest(session_id.as_bytes())
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect();
        let session = format!("retainpdf-{digest}");
        headers.insert(
            "x-opencode-session",
            HeaderValue::from_str(&session).expect("hex session identifier"),
        );
    }
    headers
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn opencode_headers_are_stable_and_scoped_to_the_exact_host() {
        let headers = opencode_headers("https://opencode.ai/inference/go/v1", "job-one");
        assert!(headers[USER_AGENT]
            .to_str()
            .unwrap()
            .starts_with("RetainPDF/"));
        assert_eq!(
            headers,
            opencode_headers("https://opencode.ai/zen/go/v1", "job-one")
        );
        assert_ne!(
            headers["x-opencode-session"],
            opencode_headers("https://opencode.ai/zen/go/v1", "job-two")["x-opencode-session"]
        );
        for url in [
            "https://api.deepseek.com/v1",
            "https://opencode.ai.example/v1",
            "https://example.com/opencode.ai",
            "not a url",
        ] {
            assert!(opencode_headers(url, "job-one").is_empty());
        }
    }
}
