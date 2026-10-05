// 外部文献库（Zotero）附件与文档的对应关系，见 schema v17。

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
            INSERT INTO document_external_refs (source, library_id, item_key, attachment_key, document_id, metadata_json, collection_path, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
            ON CONFLICT(source, library_id, attachment_key) DO UPDATE SET
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

    pub fn external_refs_for_library(&self, source: &str, library_id: &str) -> Result<Vec<ExternalRefRecord>> {
        let conn = self.connect()?;
        let mut stmt = conn.prepare(&format!(
            "SELECT {COLUMNS} FROM document_external_refs WHERE source = ?1 AND library_id = ?2"
        ))?;
        let rows = stmt.query_map(params![source, library_id], row_to_ref)?;
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::documents::sha256_hex;
    use crate::models::domain::UploadRecord;

    fn test_db(name: &str) -> (Db, std::path::PathBuf) {
        let root = std::env::temp_dir().join(format!("retain-db-external-refs-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        let db = Db::new(root.join("jobs.db"), root.clone());
        db.init().unwrap();
        (db, root)
    }

    fn insert_document(db: &Db, bytes: &[u8]) -> String {
        let hash = sha256_hex(bytes);
        db.upsert_document_from_upload(&UploadRecord {
            upload_id: format!("up-{}", &hash[..8]),
            filename: "Chai 等 - 2026 - Constructing.pdf".into(),
            stored_path: "x.pdf".into(),
            bytes: bytes.len() as u64,
            page_count: 3,
            uploaded_at: now_iso(),
            developer_mode: false,
            content_hash: hash.clone(),
        })
        .unwrap();
        hash
    }

    fn record(document_id: &str, attachment_key: &str) -> ExternalRefRecord {
        ExternalRefRecord {
            source: "zotero".into(),
            library_id: "users/0".into(),
            item_key: "ITEM0001".into(),
            attachment_key: attachment_key.into(),
            document_id: document_id.into(),
            metadata_json: "{}".into(),
            collection_path: "光催化".into(),
            created_at: String::new(),
            updated_at: String::new(),
        }
    }

    #[test]
    fn upsert_repoints_attachment_and_lists_by_document() {
        let (db, root) = test_db("upsert");
        let first = insert_document(&db, b"v1");
        let second = insert_document(&db, b"v2");
        db.upsert_external_ref(&record(&first, "ATT00001")).unwrap();
        assert_eq!(db.external_refs_for_document(&first).unwrap().len(), 1);

        // 同一附件换了文件内容：改指新文档，不新增行。
        db.upsert_external_ref(&record(&second, "ATT00001")).unwrap();
        assert!(db.external_refs_for_document(&first).unwrap().is_empty());
        let refs = db.external_refs_for_library("zotero", "users/0").unwrap();
        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].document_id, second);
        assert!(!refs[0].created_at.is_empty());

        // 删除文档时级联删除对应关系。
        db.delete_document(&second).unwrap();
        assert!(db.external_refs_for_library("zotero", "users/0").unwrap().is_empty());
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn bibliography_respects_locked_title() {
        let (db, root) = test_db("biblio");
        let document_id = insert_document(&db, b"paper");
        let authors = vec!["Chai, Xingming".to_string()];
        db.apply_external_bibliography(&document_id, "Zotero Title", &authors, Some(2026), "10.1/x")
            .unwrap();
        let doc = db.get_document(&document_id).unwrap();
        assert_eq!(doc.title, "Zotero Title");
        assert_eq!(doc.year, Some(2026));
        assert_eq!(doc.doi, "10.1/x");

        db.update_document_fields(&document_id, Some("我的标题"), None, None).unwrap();
        db.apply_external_bibliography(&document_id, "Another", &authors, Some(2026), "10.1/x")
            .unwrap();
        assert_eq!(db.get_document(&document_id).unwrap().title, "我的标题");
        let _ = std::fs::remove_dir_all(root);
    }
}
