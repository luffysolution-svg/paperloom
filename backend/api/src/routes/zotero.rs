// Zotero 联动（桌面端本地 API / Docker 数据目录）：状态 / 分类 / 条目浏览，以及把选中的 PDF 附件导入书库。

use axum::extract::State;
use axum::Json;

use crate::error::AppError;
use crate::models::api::ApiResponse;
use crate::routes::common::{build_integration_route_deps, ok_json, ApiJson, ApiPath, ApiQuery};
use crate::services::integrations::api::{
    import_zotero_attachments_view, write_documents_to_zotero_view, write_translated_pdf_to_zotero_view, zotero_collections_view,
    zotero_items_view, zotero_status_view, ItemsQuery, LibraryQuery, ZoteroCollection,
    ZoteroImportRequest, ZoteroImportResult, ZoteroItemPage, ZoteroStatus,
    ZoteroBatchWritebackRequest, ZoteroBatchWritebackView,
    ZoteroWritebackResult,
};
use crate::AppState;

pub(crate) async fn get_zotero_status() -> Result<Json<ApiResponse<ZoteroStatus>>, AppError> {
    Ok(ok_json(zotero_status_view().await?))
}

pub(crate) async fn list_zotero_collections(
    ApiQuery(query): ApiQuery<LibraryQuery>,
) -> Result<Json<ApiResponse<Vec<ZoteroCollection>>>, AppError> {
    Ok(ok_json(zotero_collections_view(&query).await?))
}

pub(crate) async fn list_zotero_items(
    State(state): State<AppState>,
    ApiQuery(query): ApiQuery<ItemsQuery>,
) -> Result<Json<ApiResponse<ZoteroItemPage>>, AppError> {
    let deps = build_integration_route_deps(&state);
    Ok(ok_json(zotero_items_view(&deps, &query).await?))
}

pub(crate) async fn import_zotero_attachments(
    State(state): State<AppState>,
    ApiJson(request): ApiJson<ZoteroImportRequest>,
) -> Result<Json<ApiResponse<Vec<ZoteroImportResult>>>, AppError> {
    let deps = build_integration_route_deps(&state);
    Ok(ok_json(
        import_zotero_attachments_view(&deps, &request).await?,
    ))
}

pub(crate) async fn write_translated_pdf_to_zotero(
    State(state): State<AppState>,
    ApiPath(job_id): ApiPath<String>,
) -> Result<Json<ApiResponse<ZoteroWritebackResult>>, AppError> {
    let deps = build_integration_route_deps(&state);
    Ok(ok_json(
        write_translated_pdf_to_zotero_view(&deps, &job_id).await?,
    ))
}

pub(crate) async fn write_documents_to_zotero(
    State(state): State<AppState>,
    ApiJson(request): ApiJson<ZoteroBatchWritebackRequest>,
) -> Result<Json<ApiResponse<ZoteroBatchWritebackView>>, AppError> {
    let deps = build_integration_route_deps(&state);
    Ok(ok_json(write_documents_to_zotero_view(&deps, &request).await?))
}
