use std::collections::{BTreeMap, HashMap, HashSet};

use serde_json::Value;

use super::{abstract_parts, join_prose, layout::compact, plain_title, Outline, PageFlow};
use crate::reader::reader_regions::canonical_item_id;
use crate::views::ReaderRegionItemView;

/// Project the export-only copy. The Reader's evidence view keeps every
/// physical region and its original page coordinates.
pub fn format_export_regions(document: &Value, items: &mut Vec<ReaderRegionItemView>) {
    let layout = PageFlow::new(document);
    let skip: HashSet<_> = layout
        .panels
        .iter()
        .chain(&layout.furniture)
        .map(|id| canonical_item_id(id))
        .collect();
    let joins: HashMap<_, _> = layout
        .joins
        .iter()
        .map(|(tail, head)| (canonical_item_id(tail), canonical_item_id(head)))
        .collect();
    let abstracts: HashMap<_, _> = layout
        .abstracts
        .iter()
        .map(|(id, (_, label))| (canonical_item_id(id), *label))
        .collect();
    let primary = layout.primary_title.map(|s| compact(&plain_title(s)));
    let mut result = Vec::<ReaderRegionItemView>::new();
    let mut positions = HashMap::<String, usize>::new();
    let mut notes = BTreeMap::<i64, Vec<ReaderRegionItemView>>::new();
    let mut outline = Outline::default();
    let mut previous_abstract = None;
    for mut row in std::mem::take(items) {
        let id = &row.item_id;
        if skip.contains(id) {
            continue;
        }
        if matches!(row.sub_type.as_deref(), Some("footnote" | "page_footnote")) {
            notes.entry(row.source.page).or_default().push(row);
            continue;
        }
        let source = row.source.text.as_deref().unwrap_or("");
        if let Some((label, body)) =
            abstract_parts(source).or_else(|| abstracts.get(id).map(|s| (*s, source)))
        {
            let level = outline.level(label, row.heading_level.unwrap_or(2) as usize, false);
            if body.is_empty() {
                row.heading_level = Some(level as i64);
                row.sub_type = Some("heading".into());
                row.source.text = Some(label.into());
                previous_abstract = Some(label);
            } else {
                let header = if previous_abstract == Some(label) {
                    String::new()
                } else {
                    format!("{} {label}\n\n", "#".repeat(level))
                };
                row.source.text = Some(format!("{header}{body}"));
                if let Some(translated) = &mut row.translated.text {
                    let (translated_label, translated_body) =
                        abstract_parts(translated).unwrap_or((label, translated.as_str()));
                    let header = if header.is_empty() {
                        String::new()
                    } else {
                        format!("{} {translated_label}\n\n", "#".repeat(level))
                    };
                    *translated = format!("{header}{translated_body}");
                }
                row.heading_level = None;
                row.sub_type = Some("body".into());
                previous_abstract = None;
            }
        } else {
            previous_abstract = None;
            if let Some(level) = row.heading_level {
                let first = primary
                    .as_ref()
                    .is_some_and(|p| p == &compact(&plain_title(source)));
                row.heading_level = Some(outline.level(source, level as usize, first) as i64);
            }
        }
        if let Some(&index) = joins.get(id).and_then(|left| positions.get(left)) {
            let head = &mut result[index];
            let whole = head.continuation_group_id.is_some()
                && head.continuation_group_id == row.continuation_group_id;
            if !whole && (head.translated.text.is_some() || row.translated.text.is_some()) {
                let translated = head
                    .translated
                    .text
                    .get_or_insert_with(|| head.source.text.clone().unwrap_or_default());
                join_prose(
                    translated,
                    row.translated
                        .text
                        .as_deref()
                        .or(row.source.text.as_deref())
                        .unwrap_or(""),
                );
            }
            join_prose(
                head.source.text.get_or_insert_with(String::new),
                row.source.text.as_deref().unwrap_or(""),
            );
            positions.insert(id.clone(), index);
            continue;
        }
        positions.insert(id.clone(), result.len());
        result.push(row);
    }
    for (i, (page, mut entries)) in notes.into_iter().enumerate() {
        let section = if i == 0 { "## 页下注\n\n" } else { "" };
        let prefix = format!("{section}**第 {page} 页**\n\n");
        let first = &mut entries[0];
        for text in [&mut first.source.text, &mut first.translated.text]
            .into_iter()
            .flatten()
        {
            text.insert_str(0, &prefix);
        }
        result.extend(entries);
    }
    *items = result;
}
