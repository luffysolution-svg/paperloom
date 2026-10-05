use std::collections::HashSet;

use axum::http::StatusCode;

use crate::api_tests::jobs_common::test_state;
use crate::app::build_app;
use crate::models::WorkflowKind;

use super::feed_support::{append_events, cursor, items, page, response, seed_job};

#[tokio::test]
async fn tail_returns_latest_five_hundred_beyond_ten_thousand_and_head_reaches_all() {
    let state = test_state("events-v2-large-history");
    seed_job(&state, "large-feed", WorkflowKind::Book);
    append_events(&state, "large-feed", 1, 10_001);
    let app = build_app(state);

    let tail = page(&app, "large-feed", "").await;
    assert_eq!(tail["limit"], 500);
    assert_eq!(tail["has_more"], false);
    assert_eq!(items(&tail).len(), 500);
    assert_eq!(items(&tail).first().unwrap()["message"], "event-9502");
    assert_eq!(items(&tail).last().unwrap()["message"], "event-10001");

    let mut current = page(&app, "large-feed", "start=head").await;
    let mut ids = HashSet::new();
    let mut previous_seq = 0;
    loop {
        for event in items(&current) {
            assert!(ids.insert(event["event_id"].as_str().expect("event id").to_owned()));
            let seq = event["seq"].as_i64().expect("feed seq");
            assert!(seq > previous_seq);
            previous_seq = seq;
        }
        if !current["has_more"].as_bool().expect("has more") {
            break;
        }
        assert!(ids.len() <= 10_001, "pagination must make progress");
        current = page(&app, "large-feed", &format!("cursor={}", cursor(&current))).await;
    }
    assert_eq!(ids.len(), 10_001);
    assert_eq!(previous_seq, 10_001);
}

#[tokio::test]
async fn cursor_pins_batch_upper_bound_while_writers_keep_appending() {
    let state = test_state("events-v2-batch-bound");
    seed_job(&state, "batch-feed", WorkflowKind::Book);
    append_events(&state, "batch-feed", 1, 3);
    let app = build_app(state.clone());
    let first = page(&app, "batch-feed", "start=head&limit=1").await;
    assert_eq!(items(&first)[0]["message"], "event-1");
    assert_eq!(first["has_more"], true);

    append_events(&state, "batch-feed", 4, 4);
    let second = page(
        &app,
        "batch-feed",
        &format!("limit=1&cursor={}", cursor(&first)),
    )
    .await;
    assert_eq!(items(&second)[0]["message"], "event-2");
    assert_eq!(second["has_more"], true);
    append_events(&state, "batch-feed", 5, 5);
    let third = page(
        &app,
        "batch-feed",
        &format!("limit=1&cursor={}", cursor(&second)),
    )
    .await;
    assert_eq!(items(&third)[0]["message"], "event-3");
    assert_eq!(
        third["has_more"], false,
        "new writes must not move this batch's bound"
    );

    let next_batch = page(&app, "batch-feed", &format!("cursor={}", cursor(&third))).await;
    assert_eq!(items(&next_batch).len(), 2);
    assert_eq!(items(&next_batch)[0]["message"], "event-4");
    assert_eq!(items(&next_batch)[1]["message"], "event-5");
    let unchanged = page(
        &app,
        "batch-feed",
        &format!("cursor={}", cursor(&next_batch)),
    )
    .await;
    assert!(items(&unchanged).is_empty());
    assert_eq!(unchanged["has_more"], false);
}

#[tokio::test]
async fn empty_feed_cursor_observes_later_events() {
    let state = test_state("events-v2-empty");
    seed_job(&state, "empty-feed", WorkflowKind::Book);
    let app = build_app(state.clone());
    let first = page(&app, "empty-feed", "").await;
    assert!(items(&first).is_empty());
    assert_eq!(first["has_more"], false);
    append_events(&state, "empty-feed", 1, 1);
    let next = page(&app, "empty-feed", &format!("cursor={}", cursor(&first))).await;
    assert_eq!(items(&next).len(), 1);
    assert_eq!(items(&next)[0]["message"], "event-1");
}

#[tokio::test]
async fn concurrent_readers_get_the_same_stable_feed_without_duplicate_imports() {
    let state = test_state("events-v2-concurrent-readers");
    seed_job(&state, "concurrent-feed", WorkflowKind::Book);
    append_events(&state, "concurrent-feed", 1, 1030);
    // Separate application state prevents in-process single-flight from
    // concealing races between API processes sharing the database.
    let second_state = crate::app::build_state(state.config.clone()).expect("second API state");
    let app = build_app(state);
    let second_app = build_app(second_state);
    let (left, right) = tokio::join!(
        page(&app, "concurrent-feed", "start=head"),
        page(&second_app, "concurrent-feed", "start=head"),
    );
    assert_eq!(items(&left).len(), 500);
    assert_eq!(items(&left), items(&right));
    assert_eq!(cursor(&left), cursor(&right));
    let ids: HashSet<_> = items(&left)
        .iter()
        .map(|item| item["event_id"].as_str().expect("event identity"))
        .collect();
    assert_eq!(ids.len(), 500);
    let tail = page(&app, "concurrent-feed", "start=tail").await;
    assert_eq!(items(&tail).last().unwrap()["seq"], 1030);
}

#[tokio::test]
async fn parent_import_does_not_advance_the_ocr_childs_independent_checkpoint() {
    let state = test_state("events-v2-child-checkpoint-scope");
    seed_job(&state, "parent-feed", WorkflowKind::Book);
    seed_job(&state, "child-feed", WorkflowKind::Ocr);
    let mut parent = state.db.get_job("parent-feed").expect("parent job");
    parent
        .artifacts
        .as_mut()
        .expect("parent artifacts")
        .ocr_job_id = Some("child-feed".into());
    state.db.save_job(&parent).expect("attach OCR child");
    append_events(&state, "child-feed", 1, 10_001);
    let app = build_app(state);
    let parent_page = page(&app, "parent-feed", "").await;
    let (status, child_response) = response(&app, "/api/v1/ocr/jobs/child-feed/events").await;
    assert_eq!(status, StatusCode::OK, "{child_response}");
    let child_page = &child_response["data"];
    assert_eq!(items(&parent_page).len(), 500);
    assert_eq!(items(child_page).len(), 500);
    assert_eq!(items(child_page).last().unwrap()["message"], "event-10001");
    assert_eq!(items(&parent_page).last().unwrap()["job_id"], "parent-feed");
    assert_eq!(items(child_page).last().unwrap()["job_id"], "child-feed");
    assert_ne!(
        items(&parent_page)[0]["event_id"],
        items(child_page)[0]["event_id"]
    );
}

#[tokio::test]
async fn limit_is_clamped_and_legacy_or_ambiguous_queries_are_rejected() {
    let state = test_state("events-v2-query-validation");
    seed_job(&state, "query-feed", WorkflowKind::Book);
    append_events(&state, "query-feed", 1, 2);
    let app = build_app(state);
    for (requested, expected) in [(0, 1), (500, 500), (501, 500), (u32::MAX, 500)] {
        let data = page(&app, "query-feed", &format!("limit={requested}")).await;
        assert_eq!(data["limit"], expected);
        assert_eq!(items(&data).len(), usize::min(expected as usize, 2));
    }
    for query in [
        "offset=0",
        "unknown=1",
        "start=middle",
        "limit=-1",
        "cursor=invalid",
        "start=head&cursor=invalid",
    ] {
        let (status, body) =
            response(&app, &format!("/api/v1/jobs/query-feed/events?{query}")).await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{query}: {body}");
        assert_eq!(body["error"]["code"], "BAD_REQUEST");
        assert!(body.get("data").is_none());
    }
}

#[tokio::test]
async fn cursor_scope_cannot_cross_jobs_or_ocr_routes() {
    let state = test_state("events-v2-cursor-scope");
    seed_job(&state, "scope-a", WorkflowKind::Ocr);
    seed_job(&state, "scope-b", WorkflowKind::Ocr);
    let app = build_app(state);
    let first = page(&app, "scope-a", "").await;
    for path in [
        "/api/v1/jobs/scope-b/events",
        "/api/v1/ocr/jobs/scope-a/events",
    ] {
        let (status, payload) = response(&app, &format!("{path}?cursor={}", cursor(&first))).await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{payload}");
        assert_eq!(payload["error"]["code"], "BAD_REQUEST");
    }
}

#[tokio::test]
async fn job_scope_and_legacy_layout_are_checked_before_cursor_decoding() {
    let state = test_state("events-v2-query-guard-order");
    seed_job(&state, "scope-book", WorkflowKind::Book);
    seed_job(&state, "scope-legacy", WorkflowKind::Ocr);
    std::fs::create_dir(
        state
            .config
            .output_root
            .join("scope-legacy")
            .join("originPDF"),
    )
    .expect("legacy directory");
    let app = build_app(state);
    for (path, expected, code) in [
        (
            "/api/v1/ocr/jobs/scope-book/events",
            StatusCode::NOT_FOUND,
            "NOT_FOUND",
        ),
        (
            "/api/v1/jobs/missing/events",
            StatusCode::NOT_FOUND,
            "NOT_FOUND",
        ),
        (
            "/api/v1/jobs/scope-legacy/events",
            StatusCode::CONFLICT,
            "CONFLICT",
        ),
        (
            "/api/v1/ocr/jobs/scope-legacy/events",
            StatusCode::CONFLICT,
            "CONFLICT",
        ),
    ] {
        let (status, body) = response(&app, &format!("{path}?cursor=invalid")).await;
        assert_eq!(status, expected, "{path}: {body}");
        assert_eq!(body["error"]["code"], code);
        assert!(body.get("data").is_none());
    }
}
