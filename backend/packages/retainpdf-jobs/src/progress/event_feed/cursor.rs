use retainpdf_api_base::error::AppError;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Cursor {
    version: u8,
    owner: String,
    /// 以前区分 `/ocr/jobs/:id/events` 和 `/jobs/:id/events` 的游标，2026-10-18 `/ocr/jobs` 删了以后恒为 false。
    /// 字段留在编码里，客户端手里的旧游标照样能用；去掉它要升游标版本。
    ocr_only: bool,
    pub epoch: String,
    pub position: i64,
    pub upper: i64,
}

impl Cursor {
    pub fn new(owner: &str, epoch: String, position: i64, upper: i64) -> Self {
        Self {
            version: 2,
            owner: owner.into(),
            ocr_only: false,
            epoch,
            position,
            upper,
        }
    }
    pub fn decode(raw: &str, owner: &str) -> Result<Self, AppError> {
        let invalid = || AppError::bad_request("invalid event cursor");
        if raw.len() > 4096 {
            return Err(invalid());
        }
        let bytes = URL_SAFE_NO_PAD.decode(raw).map_err(|_| invalid())?;
        let cursor: Self = serde_json::from_slice(&bytes).map_err(|_| invalid())?;
        if cursor.version != 2
            || cursor.owner != owner
            || cursor.ocr_only
            || cursor.position < 0
            || cursor.upper < cursor.position
            || cursor.epoch.is_empty()
        {
            return Err(invalid());
        }
        Ok(cursor)
    }
    pub fn encode(&self) -> Result<String, AppError> {
        Ok(URL_SAFE_NO_PAD.encode(
            serde_json::to_vec(self).map_err(|_| AppError::internal("encode event cursor"))?,
        ))
    }
}
