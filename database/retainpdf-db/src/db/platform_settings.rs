//! 管理后台保存的平台模型与 OCR 设置（多用户模式）。只有一行；没有这一行时调用方回退到环境变量。

use anyhow::Result;
use rusqlite::{params, OptionalExtension};

use super::Db;

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct PlatformSettingsRecord {
    pub translation_model: String,
    pub translation_base_url: String,
    pub translation_api_protocol: String,
    pub translation_thinking: String,
    pub translation_max_workers: i64,
    pub translation_credential_ref: String,
    /// 这条凭据是管理后台建的（换掉后没人用了可以清）；false = 从环境变量带过来的，不碰。
    pub translation_credential_owned: bool,
    pub ocr_provider: String,
    pub ocr_credential_ref: String,
    pub ocr_credential_owned: bool,
    pub updated_at: String,
    /// 改的人（user_id）。
    pub updated_by: String,
}

const COLUMNS: &str = "translation_model, translation_base_url, translation_api_protocol, translation_thinking, \
                       translation_max_workers, translation_credential_ref, translation_credential_owned, \
                       ocr_provider, ocr_credential_ref, ocr_credential_owned, updated_at, updated_by";

impl Db {
    pub fn platform_settings(&self) -> Result<Option<PlatformSettingsRecord>> {
        let conn = self.connect()?;
        Ok(conn
            .query_row(
                &format!("SELECT {COLUMNS} FROM platform_settings WHERE id = 1"),
                [],
                |row| {
                    Ok(PlatformSettingsRecord {
                        translation_model: row.get(0)?,
                        translation_base_url: row.get(1)?,
                        translation_api_protocol: row.get(2)?,
                        translation_thinking: row.get(3)?,
                        translation_max_workers: row.get(4)?,
                        translation_credential_ref: row.get(5)?,
                        translation_credential_owned: row.get::<_, i64>(6)? != 0,
                        ocr_provider: row.get(7)?,
                        ocr_credential_ref: row.get(8)?,
                        ocr_credential_owned: row.get::<_, i64>(9)? != 0,
                        updated_at: row.get(10)?,
                        updated_by: row.get(11)?,
                    })
                },
            )
            .optional()?)
    }

    pub fn save_platform_settings(&self, record: &PlatformSettingsRecord) -> Result<()> {
        let conn = self.connect()?;
        conn.execute(
            &format!(
                "INSERT INTO platform_settings (id, {COLUMNS}) \
                 VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12) \
                 ON CONFLICT(id) DO UPDATE SET \
                 translation_model = excluded.translation_model, \
                 translation_base_url = excluded.translation_base_url, \
                 translation_api_protocol = excluded.translation_api_protocol, \
                 translation_thinking = excluded.translation_thinking, \
                 translation_max_workers = excluded.translation_max_workers, \
                 translation_credential_ref = excluded.translation_credential_ref, \
                 translation_credential_owned = excluded.translation_credential_owned, \
                 ocr_provider = excluded.ocr_provider, \
                 ocr_credential_ref = excluded.ocr_credential_ref, \
                 ocr_credential_owned = excluded.ocr_credential_owned, \
                 updated_at = excluded.updated_at, \
                 updated_by = excluded.updated_by"
            ),
            params![
                record.translation_model,
                record.translation_base_url,
                record.translation_api_protocol,
                record.translation_thinking,
                record.translation_max_workers,
                record.translation_credential_ref,
                record.translation_credential_owned as i64,
                record.ocr_provider,
                record.ocr_credential_ref,
                record.ocr_credential_owned as i64,
                record.updated_at,
                record.updated_by,
            ],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_until_saved_then_upserted_in_place() {
        let root =
            std::env::temp_dir().join(format!("retain-platform-settings-{}", fastrand::u64(..)));
        std::fs::create_dir_all(&root).unwrap();
        let db = Db::new(root.join("jobs.db"), root);
        db.init().unwrap();
        assert_eq!(db.platform_settings().unwrap(), None);

        let mut record = PlatformSettingsRecord {
            translation_model: "m1".into(),
            translation_max_workers: 4,
            translation_credential_owned: true,
            ocr_provider: "mineru".into(),
            updated_at: "2026-10-11T00:00:00Z".into(),
            updated_by: "u_admin".into(),
            ..Default::default()
        };
        db.save_platform_settings(&record).unwrap();
        assert_eq!(db.platform_settings().unwrap().as_ref(), Some(&record));

        record.translation_model = "m2".into();
        record.translation_credential_owned = false;
        db.save_platform_settings(&record).unwrap();
        assert_eq!(db.platform_settings().unwrap(), Some(record));
    }
}
