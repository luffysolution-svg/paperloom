//! 术语表在库里存的记录。接口的请求、返回类型在术语表包（retainpdf-glossaries 的 `views`）。

use serde::{Deserialize, Serialize};

use super::common::build_job_id;
use super::input::GlossaryEntryInput;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct GlossaryRecord {
    pub glossary_id: String,
    pub name: String,
    pub description: String,
    pub source_lang: String,
    pub target_lang: String,
    pub enabled: bool,
    pub entries: Vec<GlossaryEntryInput>,
    pub created_at: String,
    pub updated_at: String,
}

pub fn build_glossary_id() -> String {
    format!("glossary-{}", build_job_id())
}
