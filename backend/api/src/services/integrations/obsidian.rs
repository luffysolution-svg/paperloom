// Obsidian 库发现与导出设置。
//
// 只会往「已发现的库」写：桌面端读 Obsidian 自己的 obsidian.json；Docker 读
// PAPERLOOM_OBSIDIAN_VAULTS_DIR 下挂载进来的目录。两者都要求目录内有 .obsidian。

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::error::AppError;

/// 覆盖 obsidian.json 位置（测试或非常规安装）。
pub const OBSIDIAN_CONFIG_ENV: &str = "PAPERLOOM_OBSIDIAN_CONFIG";
/// Docker：库挂载根目录，例如 /vaults（其下每个含 .obsidian 的子目录是一个库）。
pub const OBSIDIAN_VAULTS_DIR_ENV: &str = "PAPERLOOM_OBSIDIAN_VAULTS_DIR";

const SETTINGS_FILE: &str = "integrations/obsidian.json";
const DEFAULT_FOLDER: &str = "PaperLoom";

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum VaultSource {
    /// Obsidian 本机登记的库（桌面端）。
    Obsidian,
    /// 挂载进容器的库（Docker）。
    Mounted,
}

#[derive(Debug, Clone, Serialize)]
pub struct ObsidianVault {
    pub id: String,
    pub name: String,
    pub path: String,
    pub source: VaultSource,
    /// 目录存在且含 .obsidian。
    pub available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ObsidianSettings {
    #[serde(default)]
    pub default_vault_id: Option<String>,
    #[serde(default = "default_folder")]
    pub folder: String,
    #[serde(default = "default_true")]
    pub include_source: bool,
    /// Zotero 导入的文献按其所在分类建子目录。
    #[serde(default)]
    pub folder_by_collection: bool,
}

fn default_folder() -> String {
    DEFAULT_FOLDER.to_string()
}

fn default_true() -> bool {
    true
}

impl Default for ObsidianSettings {
    fn default() -> Self {
        Self {
            default_vault_id: None,
            folder: default_folder(),
            include_source: true,
            folder_by_collection: false,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ObsidianIntegrationView {
    pub vaults: Vec<ObsidianVault>,
    pub settings: ObsidianSettings,
    /// 便于排查「为什么一个库都没有」。
    pub obsidian_config_path: Option<String>,
    pub mounted_vaults_dir: Option<String>,
}

/// Obsidian 桌面版的 obsidian.json 位置。
pub fn default_obsidian_config_path() -> Option<PathBuf> {
    if let Some(path) = std::env::var_os(OBSIDIAN_CONFIG_ENV).filter(|v| !v.is_empty()) {
        return Some(PathBuf::from(path));
    }
    let base = if cfg!(target_os = "windows") {
        std::env::var_os("APPDATA").map(PathBuf::from)
    } else if cfg!(target_os = "macos") {
        std::env::var_os("HOME").map(|home| PathBuf::from(home).join("Library/Application Support"))
    } else {
        std::env::var_os("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".config")))
    }?;
    Some(base.join("obsidian").join("obsidian.json"))
}

pub fn mounted_vaults_dir() -> Option<PathBuf> {
    std::env::var_os(OBSIDIAN_VAULTS_DIR_ENV)
        .filter(|v| !v.is_empty())
        .map(PathBuf::from)
}

fn is_vault(path: &Path) -> bool {
    path.join(".obsidian").is_dir()
}

fn dir_name(path: &Path) -> String {
    path.file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string())
}

pub fn discover_vaults(
    config_path: Option<&Path>,
    mounted_dir: Option<&Path>,
) -> Vec<ObsidianVault> {
    let mut vaults = Vec::new();
    if let Some(config) = config_path.and_then(|path| std::fs::read_to_string(path).ok()) {
        let parsed: Value = serde_json::from_str(&config).unwrap_or(Value::Null);
        if let Some(entries) = parsed.get("vaults").and_then(Value::as_object) {
            for (id, entry) in entries {
                let Some(path) = entry.get("path").and_then(Value::as_str) else {
                    continue;
                };
                let path = PathBuf::from(path);
                vaults.push(ObsidianVault {
                    id: id.clone(),
                    name: dir_name(&path),
                    available: is_vault(&path),
                    path: path.to_string_lossy().to_string(),
                    source: VaultSource::Obsidian,
                });
            }
        }
    }
    if let Some(entries) = mounted_dir.and_then(|dir| std::fs::read_dir(dir).ok()) {
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if !is_vault(&path) {
                continue;
            }
            let name = dir_name(&path);
            vaults.push(ObsidianVault {
                id: format!("mounted:{name}"),
                name,
                path: path.to_string_lossy().to_string(),
                source: VaultSource::Mounted,
                available: true,
            });
        }
    }
    vaults.sort_by(|a, b| {
        a.name
            .to_lowercase()
            .cmp(&b.name.to_lowercase())
            .then(a.id.cmp(&b.id))
    });
    vaults
}

pub fn find_available_vault(
    vaults: &[ObsidianVault],
    vault_id: &str,
) -> Result<ObsidianVault, AppError> {
    let vault = vaults
        .iter()
        .find(|vault| vault.id == vault_id)
        .ok_or_else(|| AppError::not_found(format!("obsidian vault not found: {vault_id}")))?;
    if !vault.available {
        return Err(AppError::conflict(format!(
            "obsidian vault is not available (missing .obsidian): {}",
            vault.path
        )));
    }
    Ok(vault.clone())
}

pub fn load_settings(data_root: &Path) -> ObsidianSettings {
    std::fs::read_to_string(data_root.join(SETTINGS_FILE))
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

pub fn save_settings(data_root: &Path, settings: &ObsidianSettings) -> Result<(), AppError> {
    let path = data_root.join(SETTINGS_FILE);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let tmp = path.with_extension("json.tmp");
    let json = serde_json::to_vec_pretty(settings)
        .map_err(|err| AppError::internal(format!("serialize obsidian settings: {err}")))?;
    std::fs::write(&tmp, json)?;
    std::fs::rename(&tmp, &path)?;
    Ok(())
}

/// obsidian://open?vault=…&file=…；Obsidian 的 vault 参数接受库 id 或库名。
/// 挂载库的 id 是我们自己编的，只能用目录名（需与宿主机上的库名一致）。
pub fn open_uri(vault: &ObsidianVault, note_path_without_ext: &str) -> String {
    let vault_param = match vault.source {
        VaultSource::Obsidian => &vault.id,
        VaultSource::Mounted => &vault.name,
    };
    format!(
        "obsidian://open?vault={}&file={}",
        uri_encode(vault_param),
        uri_encode(note_path_without_ext)
    )
}

fn uri_encode(value: &str) -> String {
    let mut out = String::new();
    for byte in value.as_bytes() {
        let ch = *byte as char;
        if ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.' | '~') {
            out.push(ch);
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    out
}

#[cfg(test)]
mod tests;
