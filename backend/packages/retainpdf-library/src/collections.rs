//! Collection folders and document membership.

use retainpdf_api_base::error::AppError;
use retainpdf_core::models::api::CollectionRecord;
use crate::views::{
    AddCollectionDocumentsInput, CollectionListView, CollectionMutationResult,
    CreateCollectionInput, PatchCollectionInput,
};
use retainpdf_core::models::domain::build_job_id;

use super::collection_workspace::remove_collection_dir;
use super::LibraryDeps;

/// 合集编号的形状只有这一个来源：工作区目录按它校验（`collection_workspace::is_valid_collection_id`）。
pub(crate) fn new_collection_id() -> String {
    format!("col-{}", build_job_id())
}

pub fn create_collection(
    deps: &LibraryDeps<'_>,
    payload: &CreateCollectionInput,
) -> Result<CollectionRecord, AppError> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err(AppError::bad_request("name must not be empty"));
    }
    let parent_id = payload
        .parent_id
        .as_deref()
        .map(str::trim)
        .filter(|id| !id.is_empty());
    if let Some(parent_id) = parent_id {
        if deps.db.get_collection(parent_id)?.is_none() {
            return Err(AppError::not_found(format!(
                "parent collection not found: {parent_id}"
            )));
        }
    }
    Ok(deps
        .db
        .create_collection(&new_collection_id(), name, parent_id)?)
}

pub fn list_collections(
    deps: &LibraryDeps<'_>,
    owner: Option<&str>,
) -> Result<CollectionListView, AppError> {
    let collections = deps.db.list_collections_for_owner(owner)?;
    Ok(CollectionListView { collections })
}

pub fn patch_collection(
    deps: &LibraryDeps<'_>,
    collection_id: &str,
    payload: &PatchCollectionInput,
) -> Result<CollectionRecord, AppError> {
    let name = payload
        .name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if payload.name.is_some() && name.is_none() {
        return Err(AppError::bad_request("name must not be empty"));
    }
    deps.db
        .update_collection(collection_id, name, payload.sort_order)
        .map_err(|error| AppError::from_lookup(error, format!("collection not found: {collection_id}")))
}

pub fn delete_collection(
    deps: &LibraryDeps<'_>,
    collection_id: &str,
) -> Result<CollectionMutationResult, AppError> {
    let deleted = deps.db.delete_collection(collection_id)?;
    if !deleted {
        return Err(AppError::not_found(format!(
            "collection not found: {collection_id}"
        )));
    }
    // 合集删了，它的工作区（`data/collections/<id>/`）也没用了。清不掉只记日志，不让删除失败。
    remove_collection_dir(deps.data_root, collection_id);
    Ok(CollectionMutationResult {
        deleted: Some(true),
        removed: None,
    })
}

pub fn add_collection_documents(
    deps: &LibraryDeps<'_>,
    collection_id: &str,
    payload: AddCollectionDocumentsInput,
) -> Result<CollectionRecord, AppError> {
    if deps.db.get_collection(collection_id)?.is_none() {
        return Err(AppError::not_found(format!(
            "collection not found: {collection_id}"
        )));
    }
    let document_ids: Vec<String> = payload
        .document_ids
        .into_iter()
        .map(|id| id.trim().to_string())
        .filter(|id| !id.is_empty())
        .collect();
    for document_id in &document_ids {
        deps.db
            .get_document(document_id)
            .map_err(|error| AppError::from_lookup(error, format!("document not found: {document_id}")))?;
    }
    deps.db
        .add_documents_to_collection(collection_id, &document_ids)?;
    deps.db
        .get_collection(collection_id)?
        .ok_or_else(|| AppError::not_found(format!("collection not found: {collection_id}")))
}

pub fn remove_collection_document(
    deps: &LibraryDeps<'_>,
    collection_id: &str,
    document_id: &str,
) -> Result<CollectionMutationResult, AppError> {
    let removed = deps
        .db
        .remove_document_from_collection(collection_id, document_id)?;
    if !removed {
        return Err(AppError::not_found(format!(
            "document {document_id} is not in collection {collection_id}"
        )));
    }
    Ok(CollectionMutationResult {
        deleted: None,
        removed: Some(true),
    })
}
