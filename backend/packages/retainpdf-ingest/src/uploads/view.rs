//! 上传接口返回的视图（`POST /api/v1/uploads`）。2026-10-18 从核心包挪过来。

use retainpdf_core::models::domain::UploadRecord;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct UploadView {
    pub upload_id: String,
    /// documents.document_id（= sha256(文件字节)）。上传即建档，前端据此可直接
    /// 打开该文档的书籍详情；旧记录未回填 content_hash 时为空串。
    pub document_id: String,
    pub filename: String,
    pub bytes: u64,
    pub page_count: u32,
    pub uploaded_at: String,
}

pub fn upload_to_response(upload: &UploadRecord) -> UploadView {
    UploadView {
        upload_id: upload.upload_id.clone(),
        document_id: upload.content_hash.clone(),
        filename: upload.filename.clone(),
        bytes: upload.bytes,
        page_count: upload.page_count,
        uploaded_at: upload.uploaded_at.clone(),
    }
}
