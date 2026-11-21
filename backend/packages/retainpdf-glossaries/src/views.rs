//! 术语表接口的请求和返回类型（`/api/v1/glossaries`）。2026-10-18 从核心包挪过来；库里存的记录
//! `GlossaryRecord` 还在核心包，数据库层要用。

use retainpdf_core::models::domain::GlossaryRecord;
use retainpdf_core::models::request::GlossaryEntryInput;
use serde::{Deserialize, Serialize};

use super::csv::{CSV_FORMULA_GUARD, CSV_FORMULA_TRIGGERS};
/// 新建（POST）和整份保存（PUT）术语表的请求体。
///
/// `name`、`entries` 必填、整份替换。`description`、`source_lang`、`target_lang`、`enabled` 请求里没出现
/// （或是 `null`）时：新建用默认值（空串、`true`），PUT 保留原值（2026-10-22 起；以前会被清空、`enabled`
/// 重置成 `true`）。`expected_updated_at` 只对 PUT 有用：给了就只在库里的 `updated_at` 还是它时才保存，
/// 否则 409 `glossary_changed`。
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(deny_unknown_fields)]
pub struct GlossaryUpsertInput {
    /// 不用：以前 `POST /glossaries/import` 按它区分新建、覆盖（2026-10-22 删了）。留着是为了带它的老请求不 400。
    #[serde(default)]
    pub glossary_id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub source_lang: Option<String>,
    #[serde(default)]
    pub target_lang: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,
    pub entries: Vec<GlossaryEntryInput>,
    #[serde(default)]
    pub expected_updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(deny_unknown_fields)]
pub struct GlossaryCsvParseInput {
    pub csv_text: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct GlossarySummaryView {
    pub glossary_id: String,
    pub name: String,
    pub description: String,
    pub source_lang: String,
    pub target_lang: String,
    pub enabled: bool,
    pub entry_count: usize,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct GlossaryDetailView {
    pub glossary_id: String,
    pub name: String,
    pub description: String,
    pub source_lang: String,
    pub target_lang: String,
    pub enabled: bool,
    pub entry_count: usize,
    pub entries: Vec<GlossaryEntryInput>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct GlossaryListView {
    pub items: Vec<GlossarySummaryView>,
}

#[derive(Debug, Serialize, Clone)]
pub struct GlossaryCsvParseView {
    pub entry_count: usize,
    pub entries: Vec<GlossaryEntryInput>,
    /// 去重时丢掉的行数（同一条以最后一行为准）。2026-10-22 加。
    pub duplicate_count: usize,
}

#[derive(Debug, Serialize, Clone)]
pub struct GlossaryCsvExportView {
    pub glossary_id: String,
    pub name: String,
    pub csv_text: String,
    pub file_name: String,
}

pub fn glossary_to_summary(record: &GlossaryRecord) -> GlossarySummaryView {
    GlossarySummaryView {
        glossary_id: record.glossary_id.clone(),
        name: record.name.clone(),
        description: record.description.clone(),
        source_lang: record.source_lang.clone(),
        target_lang: record.target_lang.clone(),
        enabled: record.enabled,
        entry_count: record.entries.len(),
        created_at: record.created_at.clone(),
        updated_at: record.updated_at.clone(),
    }
}

pub fn glossary_to_detail(record: &GlossaryRecord) -> GlossaryDetailView {
    GlossaryDetailView {
        glossary_id: record.glossary_id.clone(),
        name: record.name.clone(),
        description: record.description.clone(),
        source_lang: record.source_lang.clone(),
        target_lang: record.target_lang.clone(),
        enabled: record.enabled,
        entry_count: record.entries.len(),
        entries: record.entries.clone(),
        created_at: record.created_at.clone(),
        updated_at: record.updated_at.clone(),
    }
}

/// 导出成 CSV：开头带 UTF-8 BOM（中文 Windows 的 Excel 双击打开不乱码）；以 `= + - @`、制表符、回车开头的
/// 单元格前加 `'`（防公式注入），`parse-csv` 读回时去掉，导出再导入能还原。
pub fn glossary_to_csv_export(record: &GlossaryRecord) -> GlossaryCsvExportView {
    let mut csv_text = String::from("\u{feff}source,target,note,level,match_mode,context\n");
    for entry in &record.entries {
        let cells = [
            &entry.source,
            &entry.target,
            &entry.note,
            &entry.level,
            &entry.match_mode,
            &entry.context,
        ];
        let line: Vec<String> = cells.iter().map(|cell| escape_csv_cell(cell)).collect();
        csv_text.push_str(&line.join(","));
        csv_text.push('\n');
    }
    GlossaryCsvExportView {
        glossary_id: record.glossary_id.clone(),
        name: record.name.clone(),
        csv_text,
        file_name: format!("{}.csv", record.name.replace(['/', '\\'], "_")),
    }
}

fn escape_csv_cell(value: &str) -> String {
    let guarded = if value.starts_with(CSV_FORMULA_TRIGGERS) {
        format!("{CSV_FORMULA_GUARD}{value}")
    } else {
        value.to_string()
    };
    if guarded.contains(',') || guarded.contains('"') || guarded.contains('\n') || guarded.contains('\r') {
        let escaped = guarded.replace('"', "\"\"");
        format!("\"{escaped}\"")
    } else {
        guarded
    }
}

/// `GET /api/v1/glossaries` 的筛选条件。不认识的参数 400；`q` 是空串（或全是空白）时不过滤。
#[derive(Debug, Deserialize, Clone, Default)]
#[serde(deny_unknown_fields)]
pub struct ListGlossariesQuery {
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub source_lang: Option<String>,
    #[serde(default)]
    pub target_lang: Option<String>,
    #[serde(default)]
    pub q: Option<String>,
}
