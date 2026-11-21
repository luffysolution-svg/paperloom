use std::path::Path;

use serde_json::Value;

use retainpdf_api_base::error::AppError;
use crate::views::{
    ListTranslationItemsQuery, TranslationDebugIndexView, TranslationDebugListItemView,
    TranslationDebugListView,
};
use retainpdf_core::models::domain::JobSnapshot;

use crate::support::checked_limit;
use retainpdf_core::config::limits::MAX_LIST_LIMIT;
use crate::translations::artifacts::{
    load_manifest_pages, read_translation_debug_index_file, translation_manifest_path,
};
use crate::translations::common::{preview_text, value_string, StringExt};

pub(crate) fn load_translation_debug_list_view(
    data_root: &Path,
    job: &JobSnapshot,
    query: &ListTranslationItemsQuery,
) -> Result<TranslationDebugListView, AppError> {
    let limit = checked_limit(query.limit, MAX_LIST_LIMIT)?;
    // 列表类接口：还没翻译完（没有清单）照旧 200，给空列表；任务不存在的 404 在调用方。
    let mut items = match load_translation_debug_index(data_root, job) {
        Ok(index) => index.items,
        Err(error) if error.is_not_ready() => Vec::new(),
        Err(error) => return Err(error),
    };
    apply_translation_item_filters(&mut items, query);
    let total = items.len();
    let start = query.offset as usize;
    let end = start.saturating_add(limit as usize).min(total);
    let items = if start >= total {
        Vec::new()
    } else {
        items[start..end].to_vec()
    };
    Ok(TranslationDebugListView {
        items,
        total,
        limit,
        offset: query.offset,
        has_more: end < total,
    })
}

/// 列表的数据来源：优先从 manifest + 页文件现算，不信 `translation_debug_index.json`。
///
/// 索引文件只在翻译阶段结束时写一次，之后手改、精修（`translation-revise`）只改页文件，
/// 不碰它；读它会让 `translated_preview`、`final_status` 和 `?q=` 搜索停在改之前。
/// 单条接口本来就每次全扫页文件，列表跟着现算不多花一个量级。
/// 只有找不到 manifest 的老产物才退回读索引文件。
pub(super) fn load_translation_debug_index(
    data_root: &Path,
    job: &JobSnapshot,
) -> Result<TranslationDebugIndexView, AppError> {
    let manifest_path = match translation_manifest_path(data_root, job) {
        Ok(path) => path,
        Err(not_found) => {
            return match read_translation_debug_index_file(data_root, job)? {
                Some(mut payload) => {
                    normalize_page_numbers(&mut payload.items);
                    Ok(payload)
                }
                None => Err(not_found),
            };
        }
    };
    let mut items = Vec::new();
    for (page_idx, _page_path, page_items) in load_manifest_pages(&manifest_path)? {
        for item in page_items {
            items.push(build_index_item_from_value(&item, page_idx));
        }
    }
    Ok(TranslationDebugIndexView {
        schema: "translation_debug_index_v1".to_string(),
        schema_version: 1,
        items,
    })
}

/// 索引文件里只有 0 基的 `page_idx`，没有 1 基的 `page_number`。
///
/// Python 侧写这个 artifact 时就没有 `page_number` 这个字段（实测产物 25 个键里
/// 没有它），而视图字段带 `#[serde(default)]`，于是反序列化出来恒为 0——
/// `?page=N`（N≥1）永远匹配不上任何条目。从 manifest 重建的那条路径在
/// `build_index_item_from_value` 里算了 `page_idx + 1`，两条路径的不变式对不上。
///
/// 退回读索引文件时在这里补齐，让两条路径产出同一个契约。
/// 非零值原样保留：哪天 Python 真开始写这个字段，以它为准。
fn normalize_page_numbers(items: &mut [TranslationDebugListItemView]) {
    for item in items.iter_mut() {
        if item.page_number <= 0 {
            item.page_number = item.page_idx + 1;
        }
    }
}

fn build_index_item_from_value(
    item: &Value,
    fallback_page_idx: i64,
) -> TranslationDebugListItemView {
    let diagnostics = item
        .get("translation_diagnostics")
        .and_then(Value::as_object);
    let route_path = diagnostics
        .and_then(|diag| diag.get("route_path"))
        .and_then(Value::as_array)
        .map(|parts| {
            parts
                .iter()
                .map(|part| value_string(Some(part)))
                .filter(|part| !part.is_empty())
                .collect()
        })
        .unwrap_or_default();
    let error_types = diagnostics
        .and_then(|diag| diag.get("error_trace"))
        .and_then(Value::as_array)
        .map(|entries| {
            entries
                .iter()
                .filter_map(|entry| entry.get("type"))
                .map(|value| value_string(Some(value)))
                .filter(|value| !value.is_empty())
                .collect()
        })
        .unwrap_or_default();
    let page_idx = item
        .get("page_idx")
        .and_then(Value::as_i64)
        .unwrap_or(fallback_page_idx);
    TranslationDebugListItemView {
        item_id: value_string(item.get("item_id")),
        page_idx,
        page_number: page_idx + 1,
        block_idx: item.get("block_idx").and_then(Value::as_i64).unwrap_or(-1),
        block_type: value_string(item.get("block_type")),
        math_mode: value_string(item.get("math_mode")),
        continuation_group: value_string(item.get("continuation_group")),
        classification_label: value_string(item.get("classification_label")),
        should_translate: item
            .get("should_translate")
            .and_then(Value::as_bool)
            .unwrap_or(true),
        skip_reason: value_string(item.get("skip_reason")),
        final_status: value_string(item.get("final_status")).if_empty_then(|| {
            diagnostics
                .and_then(|diag| diag.get("final_status"))
                .map(|value| value_string(Some(value)))
        }),
        source_preview: preview_text(value_string(item.get("source_text"))),
        translated_preview: preview_text(value_string(item.get("translated_text"))),
        route_path,
        fallback_to: diagnostics
            .and_then(|diag| diag.get("fallback_to"))
            .map(|value| value_string(Some(value)))
            .unwrap_or_default(),
        degradation_reason: diagnostics
            .and_then(|diag| diag.get("degradation_reason"))
            .map(|value| value_string(Some(value)))
            .unwrap_or_default(),
        error_types,
    }
}

fn apply_translation_item_filters(
    items: &mut Vec<TranslationDebugListItemView>,
    query: &ListTranslationItemsQuery,
) {
    let page = query.page.map(i64::from);
    let final_status: Option<String> = query
        .final_status
        .as_ref()
        .map(|value| value.trim().to_ascii_lowercase())
        .filter(|value| !value.is_empty());
    let error_type: Option<String> = query
        .error_type
        .as_ref()
        .map(|value| value.trim().to_ascii_lowercase())
        .filter(|value| !value.is_empty());
    let route: Option<String> = query
        .route
        .as_ref()
        .map(|value| value.trim().to_ascii_lowercase())
        .filter(|value| !value.is_empty());
    let q: Option<String> = query
        .q
        .as_ref()
        .map(|value| value.trim().to_ascii_lowercase())
        .filter(|value| !value.is_empty());

    items.retain(|item| {
        if let Some(page_number) = page {
            if item.page_number != page_number {
                return false;
            }
        }
        if let Some(expected) = final_status.as_ref() {
            if item.final_status.to_ascii_lowercase() != *expected {
                return false;
            }
        }
        if let Some(expected) = error_type.as_ref() {
            if !item
                .error_types
                .iter()
                .any(|value: &String| value.to_ascii_lowercase() == *expected)
            {
                return false;
            }
        }
        if let Some(expected) = route.as_ref() {
            let joined = item.route_path.join("/").to_ascii_lowercase();
            if !joined.contains(expected) {
                return false;
            }
        }
        if let Some(expected) = q.as_ref() {
            let haystacks = [
                item.item_id.to_ascii_lowercase(),
                item.source_preview.to_ascii_lowercase(),
                item.translated_preview.to_ascii_lowercase(),
            ];
            if !haystacks
                .iter()
                .any(|value: &String| value.contains(expected))
            {
                return false;
            }
        }
        true
    });
}
