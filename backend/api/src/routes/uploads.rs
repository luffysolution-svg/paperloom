use axum::extract::State;
use axum::Json;

use crate::auth::Principal;
use crate::error::AppError;
use crate::models::api::ApiResponse;
use crate::routes::common::{
    build_upload_route_deps, ok_json, read_multipart_text_limited, safe_multipart_error,
    ApiMultipart,
};
use crate::services::ingest::{begin_upload, ensure_upload_disk_space, store_incoming_upload_view};
use crate::AppState;

pub async fn upload_pdf(
    State(state): State<AppState>,
    principal: Principal,
    ApiMultipart(mut multipart): ApiMultipart,
) -> Result<Json<ApiResponse<crate::models::api::UploadView>>, AppError> {
    const TEXT_FIELD_MAX_BYTES: std::num::NonZeroU64 =
        std::num::NonZeroU64::new(1024 * 1024).expect("multipart text limit is non-zero");

    let deps = build_upload_route_deps(&state);
    ensure_upload_disk_space(&deps.uploads)?;
    let mut received = None;
    let mut developer_mode = false;

    while let Some(mut field) = multipart.next_field().await.map_err(safe_multipart_error)? {
        let name = field.name().unwrap_or_default().to_string();
        if name == "file" {
            if received.is_some() {
                return Err(AppError::bad_request("duplicate multipart field: file"));
            }
            let filename = field
                .file_name()
                .map(|s| s.to_string())
                .unwrap_or_else(|| "upload.pdf".to_string());
            // 边收边写到临时文件，不整份读进内存（大小上限、磁盘下限在写的时候查）。
            let mut incoming = begin_upload(&deps.uploads, &filename, deps.upload_max_bytes).await?;
            while let Some(chunk) = field.chunk().await.map_err(safe_multipart_error)? {
                incoming.write_chunk(&chunk).await?;
            }
            received = Some((filename, incoming.finish().await?));
        } else if name == "developer_mode" {
            let value = read_multipart_text_limited(field, TEXT_FIELD_MAX_BYTES).await?;
            developer_mode = matches!(value.trim(), "1" | "true" | "True" | "TRUE");
        }
    }

    let (filename, file) =
        received.ok_or_else(|| AppError::bad_request("missing multipart field: file"))?;
    Ok(ok_json(
        store_incoming_upload_view(&deps.uploads, filename, file, developer_mode, principal)
            .await?,
    ))
}
