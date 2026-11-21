use retainpdf_data::db::Db;
use retainpdf_api_base::error::AppError;
use super::views::{GlossaryUpsertInput, ListGlossariesQuery};
use chrono::{DateTime, SecondsFormat, Utc};
use retainpdf_core::models::domain::{build_glossary_id, GlossaryRecord};

use super::entries::normalize_glossary_entries;

const MAX_GLOSSARY_NAME_LEN: usize = 120;

pub(crate) fn create_glossary(
    db: &Db,
    input: &GlossaryUpsertInput,
) -> Result<GlossaryRecord, AppError> {
    let name = normalize_glossary_name(&input.name)?;
    let entries = normalize_glossary_entries(&input.entries)?;
    let description = normalize_glossary_description(input.description.as_deref().unwrap_or_default())?;
    let source_lang = normalize_glossary_lang(input.source_lang.as_deref().unwrap_or_default())?;
    let target_lang = normalize_glossary_lang(input.target_lang.as_deref().unwrap_or_default())?;
    let now = timestamp_now();
    let record = GlossaryRecord {
        glossary_id: build_glossary_id(),
        name,
        description,
        source_lang,
        target_lang,
        enabled: input.enabled.unwrap_or(true),
        entries,
        created_at: now.clone(),
        updated_at: now,
    };
    db.save_glossary(&record)?;
    Ok(record)
}

/// 整份保存一张已有的表（PUT）。`name`、`entries` 整份替换；请求里没给的 `description`、`source_lang`、
/// `target_lang`、`enabled` 保留原值。只 `UPDATE` 不插入：表在读完之后被删了是 404，不会写回来。
/// 给了 `expected_updated_at` 而表已经被别处改过：409 `glossary_changed`。不给照旧后写覆盖。
pub(crate) fn update_glossary(
    db: &Db,
    glossary_id: &str,
    input: &GlossaryUpsertInput,
) -> Result<GlossaryRecord, AppError> {
    let previous = load_glossary_or_404(db, glossary_id)?;
    let expected = input
        .expected_updated_at
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if let Some(expected) = expected {
        if expected != previous.updated_at {
            return Err(glossary_changed(glossary_id, &previous.updated_at));
        }
    }
    let record = GlossaryRecord {
        name: normalize_glossary_name(&input.name)?,
        description: match input.description.as_deref() {
            Some(value) => normalize_glossary_description(value)?,
            None => previous.description.clone(),
        },
        source_lang: match input.source_lang.as_deref() {
            Some(value) => normalize_glossary_lang(value)?,
            None => previous.source_lang.clone(),
        },
        target_lang: match input.target_lang.as_deref() {
            Some(value) => normalize_glossary_lang(value)?,
            None => previous.target_lang.clone(),
        },
        enabled: input.enabled.unwrap_or(previous.enabled),
        entries: normalize_glossary_entries(&input.entries)?,
        updated_at: next_updated_at(&previous.updated_at),
        glossary_id: previous.glossary_id,
        created_at: previous.created_at,
    };
    if db.update_glossary(&record, expected)? {
        return Ok(record);
    }
    // 没改到：表没了是 404；给了 expected 而库里的 updated_at 变了是 409。
    let current = load_glossary_or_404(db, glossary_id)?;
    Err(glossary_changed(glossary_id, &current.updated_at))
}

fn glossary_changed(glossary_id: &str, current_updated_at: &str) -> AppError {
    AppError::conflict_because(
        "glossary_changed",
        format!(
            "glossary {glossary_id} was changed elsewhere (updated_at is now {current_updated_at}); reload it and save again"
        ),
    )
}

/// 术语表的时间戳精确到毫秒，并且保存时一定比上一版晚：`expected_updated_at` 靠它分辨版本，
/// 同一秒里连着保存两次也不能是同一个值。
fn timestamp_now() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn next_updated_at(previous: &str) -> String {
    let now = Utc::now();
    let next = match DateTime::parse_from_rfc3339(previous) {
        Ok(previous) => {
            let previous = previous.with_timezone(&Utc);
            if now > previous {
                now
            } else {
                previous + chrono::Duration::milliseconds(1)
            }
        }
        Err(_) => now,
    };
    next.to_rfc3339_opts(SecondsFormat::Millis, true)
}

pub(crate) fn list_glossaries(db: &Db, owner: Option<&str>) -> Result<Vec<GlossaryRecord>, AppError> {
    let mut items = db.list_glossaries_for_owner(owner)?;
    items.sort_by(|a, b| {
        b.updated_at
            .cmp(&a.updated_at)
            .then_with(|| a.glossary_id.cmp(&b.glossary_id))
    });
    Ok(items)
}

pub(crate) fn filter_glossaries(
    items: Vec<GlossaryRecord>,
    query: &ListGlossariesQuery,
) -> Vec<GlossaryRecord> {
    items
        .into_iter()
        .filter(|item| {
            query
                .enabled
                .map(|enabled| item.enabled == enabled)
                .unwrap_or(true)
        })
        .filter(|item| {
            query
                .source_lang
                .as_ref()
                .map(|lang| item.source_lang.eq_ignore_ascii_case(lang.trim()))
                .unwrap_or(true)
        })
        .filter(|item| {
            query
                .target_lang
                .as_ref()
                .map(|lang| item.target_lang.eq_ignore_ascii_case(lang.trim()))
                .unwrap_or(true)
        })
        .filter(|item| {
            query
                .q
                .as_ref()
                .map(|needle| {
                    // 空的 `q` 不过滤（和书库一致）。
                    let needle = needle.trim().to_lowercase();
                    needle.is_empty()
                        || item.name.to_lowercase().contains(&needle)
                        || item.description.to_lowercase().contains(&needle)
                        || item.glossary_id.to_lowercase().contains(&needle)
                })
                .unwrap_or(true)
        })
        .collect()
}

pub(crate) fn load_glossary_or_404(db: &Db, glossary_id: &str) -> Result<GlossaryRecord, AppError> {
    db.get_glossary(glossary_id)
        .map_err(|error| AppError::from_lookup(error, format!("glossary not found: {glossary_id}")))
}

pub(crate) fn delete_glossary(db: &Db, glossary_id: &str) -> Result<(), AppError> {
    load_glossary_or_404(db, glossary_id)?;
    db.delete_glossary(glossary_id)?;
    Ok(())
}

fn normalize_glossary_name(name: &str) -> Result<String, AppError> {
    let normalized = name.trim();
    if normalized.is_empty() {
        return Err(AppError::bad_request("glossary name is required"));
    }
    if normalized.chars().count() > MAX_GLOSSARY_NAME_LEN {
        return Err(AppError::bad_request(format!(
            "glossary name exceeds {MAX_GLOSSARY_NAME_LEN} characters"
        )));
    }
    Ok(normalized.to_string())
}

fn normalize_glossary_description(description: &str) -> Result<String, AppError> {
    let normalized = description.trim();
    if normalized.chars().count() > 500 {
        return Err(AppError::bad_request(
            "glossary description exceeds 500 characters",
        ));
    }
    Ok(normalized.to_string())
}

fn normalize_glossary_lang(value: &str) -> Result<String, AppError> {
    let normalized = value.trim();
    if normalized.chars().count() > 64 {
        return Err(AppError::bad_request(
            "glossary language exceeds 64 characters",
        ));
    }
    Ok(normalized.to_string())
}
