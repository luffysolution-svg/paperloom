//! 资产存储（收藏截图等二进制附件）。
//!
//! 资产是内容寻址的:asset_id = sha256(文件字节),文件落
//! data_root/assets/<前2位>/<hash>,重复上传自动归并,URL 永久可缓存。

use std::num::NonZeroU64;

use axum::extract::State;
use axum::http::header;
use axum::response::{IntoResponse, Response};
use axum::Json;

use crate::error::AppError;
use crate::models::api::{ApiResponse, AssetRecord};
use crate::routes::common::{
    build_library_route_deps, ok_json, read_multipart_field_limited, safe_multipart_error,
    ApiMultipart, ApiPath,
};
use crate::services::library::api::{load_asset_view, store_asset_view};
use crate::AppState;

pub async fn upload_asset_route(
    State(state): State<AppState>,
    ApiMultipart(mut multipart): ApiMultipart,
) -> Result<Json<ApiResponse<AssetRecord>>, AppError> {
    let deps = build_library_route_deps(&state);
    let mut bytes: Option<(String, Vec<u8>)> = None;
    while let Some(field) = multipart.next_field().await.map_err(safe_multipart_error)? {
        if field.name() != Some("file") {
            continue;
        }
        let max_bytes = u64::try_from(deps.library.asset_config.max_bytes)
            .ok()
            .and_then(NonZeroU64::new)
            .ok_or_else(|| AppError::payload_too_large("request body is too large"))?;
        let mime = field
            .content_type()
            .unwrap_or("application/octet-stream")
            .to_string();
        let data = read_multipart_field_limited(field, max_bytes).await?;
        bytes = Some((mime, data.to_vec()));
        break;
    }
    let Some((mime, data)) = bytes else {
        return Err(AppError::bad_request("multipart field 'file' is required"));
    };
    Ok(ok_json(store_asset_view(&deps.library, &mime, &data)?))
}

pub async fn download_asset_route(
    State(state): State<AppState>,
    ApiPath(asset_id): ApiPath<String>,
) -> Result<Response, AppError> {
    let deps = build_library_route_deps(&state);
    let asset = load_asset_view(&deps.library, &asset_id)?;
    Ok((
        [
            (header::CONTENT_TYPE, asset.mime),
            // 内容寻址 → 永久缓存安全
            (
                header::CACHE_CONTROL,
                "public, max-age=31536000, immutable".to_string(),
            ),
        ],
        asset.data,
    )
        .into_response())
}
