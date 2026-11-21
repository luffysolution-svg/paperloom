//! 管理后台的平台设置：只给多用户模式下的管理员；读、存、检测；响应里永远不出现密钥明文。

use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use serde_json::{json, Value};
use tower::util::ServiceExt;

use super::accounts::{create_and_login, login, multi_state, send, ADMIN_PASSWORD};
use crate::api_tests::jobs_common::{read_json, test_state};
use crate::app::build_app;

const KEY: &str = "sk-platform-secret-key-1234";
const TOKEN: &str = "mineru-platform-secret-9876";

fn body() -> Value {
    json!({
        "translation": {
            "model": "deepseek-chat",
            "base_url": "https://api.deepseek.com/v1",
            "api_protocol": "openai",
            "thinking": "off",
            "max_workers": 4,
            "api_key": KEY
        },
        "ocr": { "provider": "mineru", "token": TOKEN }
    })
}

#[tokio::test]
async fn admins_read_save_and_test_platform_settings_without_seeing_secrets() {
    let state = multi_state("platform-http");
    let admin = login(&state, "root", ADMIN_PASSWORD).await;

    let initial = read_json(
        send(
            &state,
            Method::GET,
            "/api/v1/admin/platform",
            Some(&admin),
            None,
        )
        .await,
    )
    .await;
    assert_eq!(
        (
            initial["data"]["source"].as_str(),
            initial["data"]["ready"].as_bool()
        ),
        (Some("environment"), Some(false))
    );
    assert_eq!(
        initial["data"]["options"]["ocr_providers"],
        json!(["mineru", "paddle"])
    );

    let saved = send(
        &state,
        Method::PUT,
        "/api/v1/admin/platform",
        Some(&admin),
        Some(body()),
    )
    .await;
    assert_eq!(saved.status(), StatusCode::OK);
    let saved = read_json(saved).await;
    let raw = saved.to_string();
    assert!(
        !raw.contains(KEY) && !raw.contains(TOKEN),
        "响应里不能有明文：{raw}"
    );
    let data = &saved["data"];
    assert_eq!(
        (data["source"].as_str(), data["ready"].as_bool()),
        (Some("database"), Some(true))
    );
    assert_eq!(
        (
            data["translation"]["api_key_hint"].as_str(),
            data["ocr"]["token_hint"].as_str()
        ),
        (Some("…1234"), Some("…9876"))
    );
    assert_eq!(data["updated_by"]["username"], "root");

    let again = read_json(
        send(
            &state,
            Method::GET,
            "/api/v1/admin/platform",
            Some(&admin),
            None,
        )
        .await,
    )
    .await;
    assert!(!again.to_string().contains(KEY));
    assert_eq!(again["data"]["translation"]["model"], "deepseek-chat");

    let mut bad = body();
    bad["translation"]["max_workers"] = json!(999);
    let response = send(
        &state,
        Method::PUT,
        "/api/v1/admin/platform",
        Some(&admin),
        Some(bad),
    )
    .await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert_eq!(
        read_json(response).await["error"]["code"],
        "INVALID_MAX_WORKERS"
    );

    let probe = send(
        &state,
        Method::POST,
        "/api/v1/admin/platform/test",
        Some(&admin),
        Some(json!({ "target": "ocr", "provider": "paddle" })),
    )
    .await;
    let probe = read_json(probe).await;
    assert_eq!(
        (
            probe["data"]["ok"].as_bool(),
            probe["data"]["status"].as_str()
        ),
        (Some(false), Some("missing_input"))
    );
}

#[tokio::test]
async fn only_multi_mode_admins_may_touch_platform_settings() {
    let state = multi_state("platform-guard");
    let admin = login(&state, "root", ADMIN_PASSWORD).await;
    let (_, alice) = create_and_login(&state, &admin, "alice").await;
    for (method, uri, payload) in [
        (Method::GET, "/api/v1/admin/platform", None),
        (Method::PUT, "/api/v1/admin/platform", Some(body())),
        (
            Method::POST,
            "/api/v1/admin/platform/test",
            Some(json!({ "target": "translation" })),
        ),
    ] {
        let response = send(&state, method.clone(), uri, Some(&alice), payload).await;
        assert_eq!(response.status(), StatusCode::FORBIDDEN, "{method} {uri}");
    }

    let single = test_state("platform-single");
    let key = single.config.api_keys.iter().next().unwrap().clone();
    let request = Request::builder()
        .uri("/api/v1/admin/platform")
        .header("X-API-Key", key)
        .body(Body::empty())
        .unwrap();
    assert_eq!(
        build_app(single.clone())
            .oneshot(request)
            .await
            .unwrap()
            .status(),
        StatusCode::NOT_FOUND
    );
}
