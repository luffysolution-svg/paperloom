use axum::body::Body;
use axum::http::{Request, StatusCode};
use tower::util::ServiceExt;

use crate::api_tests::jobs_common::{read_json, test_state};
use crate::app::build_app;

use super::common::{seed_translation_debug_job, ITEM_ID, JOB_ID};

#[tokio::test]
async fn translation_item_route_redacts_secrets() {
    let state = test_state("debug-item-redaction");
    seed_translation_debug_job(&state);

    let response = build_app(state)
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/jobs/{JOB_ID}/translations/{ITEM_ID}"))
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("item request"),
        )
        .await
        .expect("item response");

    assert_eq!(response.status(), StatusCode::OK);
    let payload = read_json(response).await;
    assert_eq!(payload["data"]["item"]["api_key"], "");
    assert_eq!(payload["data"]["item"]["source_text"], "English [REDACTED]");
}

async fn list_translations(state: &crate::AppState, query: &str) -> (StatusCode, serde_json::Value) {
    let response = build_app(state.clone())
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/jobs/{JOB_ID}/translations{query}"))
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("list request"),
        )
        .await
        .expect("list response");
    let status = response.status();
    (status, read_json(response).await)
}

#[tokio::test]
async fn translation_list_echoes_limit_has_more_and_rejects_bad_paging() {
    let state = test_state("debug-list-paging");
    seed_translation_debug_job(&state);

    let (status, payload) = list_translations(&state, "?limit=1").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(payload["data"]["limit"], 1);
    assert_eq!(payload["data"]["offset"], 0);
    assert_eq!(payload["data"]["total"], 1);
    assert_eq!(payload["data"]["has_more"], false);

    let (_, payload) = list_translations(&state, "?limit=500&offset=3").await;
    assert_eq!(payload["data"]["has_more"], false);
    assert_eq!(payload["data"]["items"].as_array().unwrap().len(), 0);

    for query in ["?limit=0", "?limit=501", "?limit=4000000000", "?nope=1"] {
        let (status, payload) = list_translations(&state, query).await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{query}: {payload}");
    }
}
