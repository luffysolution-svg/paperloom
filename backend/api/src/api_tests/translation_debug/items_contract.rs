//! 译文条目三个接口（列表、单条、重放一条）的生产者锁，契约 `translation-revisions.v1`（第 1b 期，2026-10-22）。
//!
//! 和 `library_documents_contract.rs` 一样：打真实接口，拿 serde 写出来的 JSON 对着契约核对类型和键集合
//! （多一个、少一个都红）；查询参数是 `deny_unknown_fields`，Rust 认的字段集合和契约的 `properties` 对上。

use axum::http::StatusCode;
use serde_json::Value;

use crate::api_tests::job_view_contract::{assert_definition, assert_exact_object_keys, contract};
use crate::api_tests::jobs_common::test_state;
use crate::api_tests::library_documents_contract::assert_request_fields_match;
use crate::api_tests::library_paging::send;
use crate::models::api::ListTranslationItemsQuery;

use super::common::{seed_translation_debug_job, ITEM_ID, JOB_ID};

const CONTRACT: &str = "translation-revisions.v1.schema.json";

async fn ok_data(state: &crate::AppState, method: &str, uri: &str) -> Value {
    let (status, payload) = send(state, method, uri, None).await;
    assert_eq!(status, StatusCode::OK, "{method} {uri}: {payload}");
    payload["data"].clone()
}

fn assert_exact(value: &Value, contract: &Value, name: &str, path: &str) {
    assert_definition(value, contract, name, path);
    assert_exact_object_keys(value, contract, name, path);
}

#[tokio::test]
async fn translation_item_list_detail_and_replay_views_match_published_schema() {
    let state = test_state("translation-items-contract");
    seed_translation_debug_job(&state);
    let contract = contract(CONTRACT);

    let list = ok_data(&state, "GET", &format!("/api/v1/jobs/{JOB_ID}/translations")).await;
    assert_exact(&list, &contract, "TranslationDebugListView", "list");
    assert_eq!(list["limit"], 20, "没传 limit 是 20：{list}");
    let items = list["items"].as_array().expect("list.items");
    assert_eq!(items.len(), 1, "{list}");
    assert_exact(&items[0], &contract, "TranslationDebugListItemView", "list.items[0]");
    assert_eq!(items[0]["page_number"], 1, "page_number 从 1 开始");
    assert_eq!(items[0]["block_idx"], -1, "页文件里没有 block_idx 时是 -1");

    let item = ok_data(&state, "GET", &format!("/api/v1/jobs/{JOB_ID}/translations/{ITEM_ID}")).await;
    assert_exact(&item, &contract, "TranslationDebugItemView", "item");
    assert_eq!(item["page_path"], "page-1.json", "page_path 是翻译清单里写的那个路径");

    // 重放不带请求体（前端也是空 body、不带 content-type）。
    let replay =
        ok_data(&state, "POST", &format!("/api/v1/jobs/{JOB_ID}/translations/{ITEM_ID}/replay")).await;
    assert_exact(&replay, &contract, "TranslationReplayView", "replay");
}

#[test]
fn translation_list_query_accepts_exactly_the_contract_fields() {
    let contract = contract(CONTRACT);
    assert_request_fields_match::<ListTranslationItemsQuery>(&contract, "ListTranslationItemsQuery");

    // 重放一条不带请求体：契约端点上不写 input。
    let replay = contract["endpoints"]
        .as_array()
        .expect("endpoints")
        .iter()
        .find(|endpoint| endpoint["method"] == "POST" && endpoint["path"] == "/api/v1/jobs/:job_id/translations/:item_id/replay")
        .expect("replay endpoint");
    assert!(replay.get("input").is_none(), "{replay}");
}
