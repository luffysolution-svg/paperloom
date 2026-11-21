use anyhow::{Context, Result};
use rusqlite::params;

use crate::models::domain::GlossaryRecord;

use super::rows::row_to_glossary_record;
use super::Db;

impl Db {
    pub fn save_glossary(&self, glossary: &GlossaryRecord) -> Result<()> {
        let conn = self.connect()?;
        conn.execute(
            r#"
            INSERT INTO glossaries (glossary_id, name, description, source_lang, target_lang, enabled, entries_json, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT(glossary_id) DO UPDATE SET
                name=excluded.name,
                description=excluded.description,
                source_lang=excluded.source_lang,
                target_lang=excluded.target_lang,
                enabled=excluded.enabled,
                entries_json=excluded.entries_json,
                created_at=excluded.created_at,
                updated_at=excluded.updated_at
            "#,
            params![
                glossary.glossary_id,
                glossary.name,
                glossary.description,
                glossary.source_lang,
                glossary.target_lang,
                if glossary.enabled { 1 } else { 0 },
                serde_json::to_string(&glossary.entries)?,
                glossary.created_at,
                glossary.updated_at,
            ],
        )?;
        Ok(())
    }

    /// 改一张已有的术语表，不插入（PUT 和 DELETE 撞上时不会把删掉的表写回来）。
    /// 给了 `expected_updated_at` 就只在库里的 `updated_at` 等于它时才改。
    /// 没有这一行、或者 `updated_at` 对不上，返回 `false`，调用方再读一次分清是哪种。
    pub fn update_glossary(
        &self,
        glossary: &GlossaryRecord,
        expected_updated_at: Option<&str>,
    ) -> Result<bool> {
        let conn = self.connect()?;
        let changed = conn.execute(
            r#"
            UPDATE glossaries SET
                name=?2,
                description=?3,
                source_lang=?4,
                target_lang=?5,
                enabled=?6,
                entries_json=?7,
                updated_at=?8
            WHERE glossary_id=?1 AND (?9 IS NULL OR updated_at=?9)
            "#,
            params![
                glossary.glossary_id,
                glossary.name,
                glossary.description,
                glossary.source_lang,
                glossary.target_lang,
                if glossary.enabled { 1 } else { 0 },
                serde_json::to_string(&glossary.entries)?,
                glossary.updated_at,
                expected_updated_at,
            ],
        )?;
        Ok(changed > 0)
    }

    pub fn get_glossary(&self, glossary_id: &str) -> Result<GlossaryRecord> {
        let conn = self.connect()?;
        let glossary = conn
            .query_row(
                "SELECT glossary_id, name, description, source_lang, target_lang, enabled, entries_json, created_at, updated_at FROM glossaries WHERE glossary_id = ?1",
                params![glossary_id],
                row_to_glossary_record,
            )
            .with_context(|| format!("glossary not found: {glossary_id}"))?;
        Ok(glossary)
    }

    pub fn list_glossaries(&self) -> Result<Vec<GlossaryRecord>> {
        let conn = self.connect()?;
        let mut stmt = conn.prepare(
            "SELECT glossary_id, name, description, source_lang, target_lang, enabled, entries_json, created_at, updated_at FROM glossaries ORDER BY updated_at DESC",
        )?;
        let rows = stmt.query_map([], row_to_glossary_record)?;
        let mut items = Vec::new();
        for row in rows {
            items.push(row?);
        }
        Ok(items)
    }

    pub fn delete_glossary(&self, glossary_id: &str) -> Result<()> {
        let conn = self.connect()?;
        conn.execute(
            "DELETE FROM glossaries WHERE glossary_id = ?1",
            params![glossary_id],
        )?;
        Ok(())
    }
}
