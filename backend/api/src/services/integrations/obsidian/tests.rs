use std::path::PathBuf;

use super::*;

struct TempDir(PathBuf);

impl TempDir {
    fn new(label: &str) -> Self {
        let path = std::env::temp_dir().join(format!(
            "paperloom-obsidian-{label}-{:016x}",
            fastrand::u64(..)
        ));
        std::fs::create_dir_all(&path).expect("temp dir");
        Self(path)
    }
}

impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

fn make_vault(path: &Path) {
    std::fs::create_dir_all(path.join(".obsidian")).expect("vault");
}

#[test]
fn discovers_registered_and_mounted_vaults() {
    let tmp = TempDir::new("discover");
    let notes = tmp.0.join("My Notes");
    make_vault(&notes);
    let gone = tmp.0.join("Deleted");
    let config = tmp.0.join("obsidian.json");
    std::fs::write(
        &config,
        serde_json::json!({ "vaults": {
            "abc123": { "path": notes, "ts": 1, "open": true },
            "dead01": { "path": gone, "ts": 2 }
        }})
        .to_string(),
    )
    .expect("config");
    let mounted = tmp.0.join("mounted");
    make_vault(&mounted.join("Research"));
    std::fs::create_dir_all(mounted.join("not-a-vault")).expect("plain dir");

    let vaults = discover_vaults(Some(&config), Some(&mounted));
    let summary: Vec<_> = vaults
        .iter()
        .map(|v| {
            (
                v.id.as_str(),
                v.name.as_str(),
                v.available,
                v.source.clone(),
            )
        })
        .collect();
    assert_eq!(
        summary,
        vec![
            ("dead01", "Deleted", false, VaultSource::Obsidian),
            ("abc123", "My Notes", true, VaultSource::Obsidian),
            ("mounted:Research", "Research", true, VaultSource::Mounted),
        ]
    );
    assert!(find_available_vault(&vaults, "dead01").is_err());
    assert!(find_available_vault(&vaults, "missing").is_err());
    assert_eq!(
        find_available_vault(&vaults, "abc123").expect("vault").name,
        "My Notes"
    );
}

#[test]
fn missing_config_yields_no_vaults() {
    assert!(discover_vaults(Some(Path::new("Z:/nope/obsidian.json")), None).is_empty());
}

#[test]
fn settings_round_trip_with_defaults() {
    let tmp = TempDir::new("settings");
    assert_eq!(load_settings(&tmp.0), ObsidianSettings::default());
    let settings = ObsidianSettings {
        default_vault_id: Some("abc123".into()),
        folder: "Literature/Chem".into(),
        include_source: false,
        folder_by_collection: true,
    };
    save_settings(&tmp.0, &settings).expect("save");
    assert_eq!(load_settings(&tmp.0), settings);
}

#[test]
fn open_uri_uses_id_for_registered_and_name_for_mounted() {
    let mut vault = ObsidianVault {
        id: "abc123".into(),
        name: "My Notes".into(),
        path: String::new(),
        source: VaultSource::Obsidian,
        available: true,
    };
    assert_eq!(
        open_uri(&vault, "PaperLoom/注意力 机制"),
        "obsidian://open?vault=abc123&file=PaperLoom%2F%E6%B3%A8%E6%84%8F%E5%8A%9B%20%E6%9C%BA%E5%88%B6"
    );
    vault.source = VaultSource::Mounted;
    assert!(open_uri(&vault, "a").starts_with("obsidian://open?vault=My%20Notes&file=a"));
}
