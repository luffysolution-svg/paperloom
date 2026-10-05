//! Favorite anchors CRUD.

use crate::error::AppError;
use crate::models::api::{
    CreateFavoriteInput, FavoriteListView, FavoriteMutationResult, FavoriteRecord,
    FavoritesClearedResult, ListFavoritesQuery, PatchFavoriteInput,
};
use crate::models::domain::{build_job_id, now_iso};

use super::LibraryDeps;

pub fn create_favorite(
    deps: &LibraryDeps<'_>,
    payload: CreateFavoriteInput,
) -> Result<FavoriteRecord, AppError> {
    let requested_job_id = payload
        .job_id
        .as_deref()
        .map(str::trim)
        .filter(|id| !id.is_empty())
        .map(str::to_string);
    let document = if !payload.document_id.trim().is_empty() {
        deps.db
            .get_document(payload.document_id.trim())
            .map_err(|_| {
                AppError::not_found(format!("document not found: {}", payload.document_id))
            })?
    } else if let Some(job_id) = requested_job_id.as_deref() {
        // 只给 job_id 也能收藏:历史 run 同样解析到所属文档
        deps.db
            .get_document_by_job_id(job_id)?
            .ok_or_else(|| AppError::not_found(format!("no document owns job: {job_id}")))?
    } else {
        return Err(AppError::bad_request(
            "either document_id or job_id is required",
        ));
    };
    let job_id = requested_job_id
        .or(document.active_job_id.clone())
        .ok_or_else(|| {
            AppError::bad_request("document has no active job; pass job_id explicitly")
        })?;
    if payload.quote_text.trim().is_empty() {
        return Err(AppError::bad_request("quote_text must not be empty"));
    }
    let asset_id = payload
        .asset_id
        .as_deref()
        .map(str::trim)
        .filter(|id| !id.is_empty())
        .map(str::to_string)
        .unwrap_or_default();
    if !asset_id.is_empty() && deps.db.get_asset(&asset_id)?.is_none() {
        return Err(AppError::bad_request(format!(
            "asset not found: {asset_id}; upload it via POST /api/v1/assets first"
        )));
    }
    let now = now_iso();
    let favorite = FavoriteRecord {
        favorite_id: format!("fav-{}", build_job_id()),
        document_id: document.document_id,
        job_id,
        page_idx: payload.page_idx,
        block_id: payload.block_id,
        char_start: payload.char_start,
        char_end: payload.char_end,
        kind: payload.kind.unwrap_or_else(|| "sentence".to_string()),
        quote_text: payload.quote_text,
        translated_quote_text: payload.translated_quote_text.unwrap_or_default(),
        note: payload.note.unwrap_or_default(),
        asset_id,
        rect_json: payload.rect_json.unwrap_or_default(),
        created_at: now.clone(),
        updated_at: now,
    };
    deps.db.save_favorite(&favorite)?;
    Ok(favorite)
}

pub fn list_favorites(
    deps: &LibraryDeps<'_>,
    query: &ListFavoritesQuery,
) -> Result<FavoriteListView, AppError> {
    let favorites = deps.db.list_favorites(query.document_id.as_deref())?;
    Ok(FavoriteListView { favorites })
}

pub fn patch_favorite(
    deps: &LibraryDeps<'_>,
    favorite_id: &str,
    payload: &PatchFavoriteInput,
) -> Result<FavoriteMutationResult, AppError> {
    let Some(note) = payload.note.as_ref() else {
        return Err(AppError::bad_request("note is required"));
    };
    let updated = deps.db.update_favorite_note(favorite_id, note)?;
    if !updated {
        return Err(AppError::not_found(format!(
            "favorite not found: {favorite_id}"
        )));
    }
    Ok(FavoriteMutationResult {
        updated: Some(true),
        deleted: None,
    })
}

pub fn delete_favorite(
    deps: &LibraryDeps<'_>,
    favorite_id: &str,
) -> Result<FavoriteMutationResult, AppError> {
    let deleted = deps.db.delete_favorite(favorite_id)?;
    if !deleted {
        return Err(AppError::not_found(format!(
            "favorite not found: {favorite_id}"
        )));
    }
    Ok(FavoriteMutationResult {
        updated: None,
        deleted: Some(true),
    })
}

/// 清空一篇文档名下的全部收藏。
///
/// 与删除保护配套:文档被收藏引用时 `DELETE /documents/{id}` 返回
/// `DELETE_BLOCKED_BY_FAVORITES`,里面带着收藏条数和本端点的路径。用户确认
/// "连收藏一起删"后打这里,再重试删除。
///
/// 先校验文档存在,好让"文档不存在"与"文档存在但没有收藏"这两种情况分别
/// 落到 404 和 `deleted_count: 0`,而不是都返回一个含糊的成功。
pub fn clear_favorites_for_document(
    deps: &LibraryDeps<'_>,
    document_id: &str,
) -> Result<FavoritesClearedResult, AppError> {
    deps.db
        .get_document(document_id)
        .map_err(|_| AppError::not_found(format!("document not found: {document_id}")))?;
    let deleted_count = deps.db.delete_favorites_for_document(document_id)?;
    Ok(FavoritesClearedResult { deleted_count })
}

/// 清空引用某个 run 的全部收藏(含它的 -ocr 子任务),与馆藏图书的删除保护配套。
///
/// 子任务一并清:`delete_library_book` 会连着删 `{job_id}-ocr`,并对两者都做
/// 收藏检查。只清父任务的收藏会让紧接着的重试仍然 409,用户点两次才成功。
pub fn clear_favorites_for_job(
    deps: &LibraryDeps<'_>,
    job_id: &str,
) -> Result<FavoritesClearedResult, AppError> {
    deps.db
        .get_job(job_id)
        .map_err(|_| AppError::not_found(format!("job not found: {job_id}")))?;
    let mut deleted_count = deps.db.delete_favorites_referencing_job(job_id)?;
    let child = format!("{job_id}-ocr");
    if deps.db.get_job(&child).is_ok() {
        deleted_count += deps.db.delete_favorites_referencing_job(&child)?;
    }
    Ok(FavoritesClearedResult { deleted_count })
}
