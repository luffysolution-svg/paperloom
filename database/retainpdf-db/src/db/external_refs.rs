// 外部文献库（Zotero）附件与文档的对应关系，见 schema v30。

use anyhow::Result;
use rusqlite::{params, Row};

use crate::models::domain::now_iso;

use super::Db;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ExternalRefRecord {
    pub source: String,
    pub library_id: String,
    pub item_key: String,
    pub attachment_key: String,
    pub document_id: String,
    pub metadata_json: String,
    pub collection_path: String,
    pub created_at: String,
    pub updated_at: String,
}

const COLUMNS: &str = "source, library_id, item_key, attachment_key, document_id, metadata_json, collection_path, created_at, updated_at";

fn row_to_ref(row: &Row<'_>) -> rusqlite::Result<ExternalRefRecord> {
    Ok(ExternalRefRecord {
        source: row.get(0)?,
        library_id: row.get(1)?,
        item_key: row.get(2)?,
        attachment_key: row.get(3)?,
        document_id: row.get(4)?,
        metadata_json: row.get(5)?,
        collection_path: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

impl Db {
    /// 按 (source, library_id, attachment_key) 写入；created_at 只在首次写入时生效。
    pub fn upsert_external_ref(&self, record: &ExternalRefRecord) -> Result<()> {
        let conn = self.connect()?;
        let now = now_iso();
        conn.execute(
            r#"
            INSERT INTO document_external_refs (owner_user_id, source, library_id, item_key, attachment_key, document_id, metadata_json, collection_path, created_at, updated_at)
            VALUES ((SELECT owner_user_id FROM documents WHERE document_id = ?5), ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
            ON CONFLICT(owner_user_id, source, library_id, attachment_key) DO UPDATE SET
                item_key = excluded.item_key,
                document_id = excluded.document_id,
                metadata_json = excluded.metadata_json,
                collection_path = excluded.collection_path,
                updated_at = excluded.updated_at
            "#,
            params![
                record.source,
                record.library_id,
                record.item_key,
                record.attachment_key,
                record.document_id,
                record.metadata_json,
                record.collection_path,
                now,
            ],
        )?;
        Ok(())
    }

    /// 文档的外部来源，最近导入的在前。
    pub fn external_refs_for_document(&self, document_id: &str) -> Result<Vec<ExternalRefRecord>> {
        let conn = self.connect()?;
        let mut stmt = conn.prepare(&format!(
            "SELECT {COLUMNS} FROM document_external_refs WHERE document_id = ?1 ORDER BY updated_at DESC"
        ))?;
        let rows = stmt.query_map(params![document_id], row_to_ref)?;
        Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
    }

    pub fn external_refs_for_library(&self, owner: &str, source: &str, library_id: &str) -> Result<Vec<ExternalRefRecord>> {
        let conn = self.connect()?;
        let mut stmt = conn.prepare(&format!(
            "SELECT {COLUMNS} FROM document_external_refs WHERE source = ?1 AND library_id = ?2 AND owner_user_id = ?3"
        ))?;
        let rows = stmt.query_map(params![source, library_id, owner], row_to_ref)?;
        Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
    }

    /// 用外部条目的书目信息补全文档；用户手动改过的标题（locked）不动。
    pub fn apply_external_bibliography(
        &self,
        document_id: &str,
        title: &str,
        authors: &[String],
        year: Option<i64>,
        doi: &str,
    ) -> Result<()> {
        let conn = self.connect()?;
        let now = now_iso();
        conn.execute(
            r#"
            UPDATE documents SET
                title = CASE
                    WHEN ?2 = '' THEN title
                    WHEN COALESCE((SELECT locked FROM document_title_state WHERE document_id = ?1), 0) = 1 THEN title
                    ELSE ?2
                END,
                authors_json = ?3,
                year = ?4,
                doi = ?5,
                updated_at = ?6
            WHERE document_id = ?1
            "#,
            params![document_id, title, serde_json::to_string(authors)?, year, doi, now],
        )?;
        Ok(())
    }
}
