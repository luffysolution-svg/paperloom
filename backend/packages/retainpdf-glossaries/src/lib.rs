//! 术语表领域（从 retainpdf-api 拆出来的第一个领域包，2026-10-16）。
//!
//! 管术语表的增删改查、CSV 导入导出，以及建任务时解析任务用的术语（`resolve_task_glossary_request`）。
//! 这个文件就是门面：子模块私有，外面只能用下面导出的东西。retainpdf-api 里以
//! `crate::services::glossaries` 接上（`services/mod.rs`）。

mod api;
mod csv;
mod entries;
mod records;
mod views;

#[cfg(test)]
use csv::parse_glossary_csv_text;
#[cfg(test)]
use entries::{merge_glossary_entries, normalize_glossary_entries, MAX_GLOSSARY_ENTRIES};
#[cfg(test)]
use records::{
    create_glossary, delete_glossary, filter_glossaries, list_glossaries, load_glossary_or_404,
    update_glossary,
};

#[cfg(test)]
mod tests;

// 门面。
pub use api::{
    create_glossary_view, delete_glossary_view, export_glossary_csv_view, get_glossary_view,
    list_glossaries_view, parse_glossary_csv_view, update_glossary_view, GlossaryApiDeps,
};
pub use entries::{require_glossary_for_rerun, resolve_task_glossary_request};
pub use views::{
    glossary_to_csv_export, glossary_to_detail, glossary_to_summary, GlossaryCsvExportView,
    GlossaryCsvParseInput, GlossaryCsvParseView, GlossaryDetailView, GlossaryListView,
    GlossarySummaryView, GlossaryUpsertInput, ListGlossariesQuery,
};
