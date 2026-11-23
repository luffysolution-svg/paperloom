use super::{resolve_obsidian_export, IntegrationApiDeps, ObsidianExportRequest};
use crate::error::AppError;
use crate::services::integrations::{markdown_export, obsidian, zotero};
use serde_json::{json, Value};
use std::path::PathBuf;
use zotero::writeback::{reading, ZoteroWriteClient};

pub(crate) async fn sync_obsidian_reading(
    deps: &IntegrationApiDeps<'_>,
    job: &str,
    request: &ObsidianExportRequest,
) -> Result<reading::SyncResult, AppError> {
    if zotero::data_dir::data_dir_from_env().is_some() {
        return Err(AppError::conflict(
            "Zotero 数据目录只读，回写需要连接 Zotero 10 本地 API",
        ));
    }
    let document = deps
        .db
        .get_document_by_job_id(job)?
        .ok_or_else(|| AppError::not_found("找不到任务所属文献"))?;
    let mut external = deps
        .db
        .external_refs_for_document(&document.document_id)?
        .into_iter()
        .find(|r| r.source == zotero::SOURCE)
        .ok_or_else(|| AppError::conflict("文献尚未关联 Zotero 条目"))?;
    let resolved = resolve_obsidian_export(deps, request)?;
    let folder = if resolved.folder_by_collection {
        markdown_export::folder_with_collection(&resolved.folder, &external.collection_path)
    } else {
        resolved.folder
    };
    let vault = PathBuf::from(&resolved.vault.path).canonicalize()?;
    let dir = vault.join(&folder);
    if !dir.is_dir() {
        return Err(AppError::not_found("所选目录还没有导出的笔记"));
    }
    let dir = dir.canonicalize()?;
    if !dir.starts_with(&vault) {
        return Err(AppError::bad_request("笔记目录不在所选 Vault 内"));
    }
    let mut selected = None;
    for entry in std::fs::read_dir(&dir)? {
        let entry = entry?;
        if !entry.file_type()?.is_file() || entry.path().extension().is_none_or(|e| e != "md") {
            continue;
        }
        let Ok(raw) = std::fs::read_to_string(entry.path()) else {
            continue;
        };
        let text = raw.replace("\r\n", "\n");
        let header = text
            .strip_prefix("---\n")
            .and_then(|s| s.split_once("\n---\n"))
            .map(|(yaml, _)| yaml)
            .unwrap_or("");
        if !header.contains("paperloom_document:") || !header.contains(&document.document_id) {
            continue;
        }
        let (yaml, body) = reading::read_note(&text)?;
        if yaml["paperloom_document"] != document.document_id || yaml.get("translation").is_some() {
            continue;
        }
        if yaml["zotero_item_uri"]
            .as_str()
            .or_else(|| yaml["zotero"].as_str())
            != Some(zotero::select_uri(&external.library_id, &external.item_key).as_str())
        {
            continue;
        }
        if selected.is_some() {
            return Err(AppError::conflict(
                "此目录有多份同一文献的主笔记，请在该目录保留要同步的一份",
            ));
        }
        selected = Some((entry.path(), yaml, body, raw));
    }
    let (file, yaml, body, mut raw) =
        selected.ok_or_else(|| AppError::not_found("所选目录没有与此 Zotero 文献对应的主笔记"))?;
    let mut snapshot: Value = serde_json::from_str(&external.metadata_json)
        .map_err(|_| AppError::conflict("Zotero 导入快照不可读"))?;
    let id = reading::note_key(&file);
    let baseline = match reading::legacy_bibliography(&raw) {
        Some((legacy, marker)) => {
            deps.db.save_obsidian_bibliography(&document.document_id, &id, &legacy)?;
            raw.replace_range(marker, "");
            markdown_export::write_atomically(&file, raw.as_bytes())?;
            legacy
        }
        None => deps.db.obsidian_bibliography(
            &document.document_id, &id, yaml["paperloom_job"].as_str().unwrap_or(job),
        )?.unwrap_or_else(|| reading::bibliography(&snapshot["data"])),
    };
    let local = reading::note_fields(&yaml)?;
    let previous = snapshot
        .get("obsidian_sync")
        .and_then(|s| s.get(&id))
        .cloned()
        .map(serde_json::from_value)
        .transpose()
        .map_err(|_| AppError::conflict("笔记同步记录不可读"))?;
    let rel = file
        .strip_prefix(&vault)
        .unwrap()
        .with_extension("")
        .to_string_lossy()
        .replace('\\', "/");
    let backlink = obsidian::open_uri(&resolved.vault, &rel);
    let client = ZoteroWriteClient::new(zotero::api_base(), deps.data_root)?;
    let (result, state, verified) = client
        .sync_reading(&external, local, &body, &baseline, previous, &backlink)
        .await?;
    snapshot["data"] = verified["data"].clone();
    if let Some(date) = verified.pointer("/meta/parsedDate") {
        snapshot["parsed_date"] = date.clone();
    }
    snapshot["obsidian_sync"][&id] = json!(state);
    external.metadata_json = snapshot.to_string();
    deps.db.upsert_external_ref(&external)?;
    Ok(result)
}
