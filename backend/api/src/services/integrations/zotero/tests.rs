use serde_json::json;

use super::*;

#[test]
fn library_and_key_validation_rejects_arbitrary_paths() {
    assert!(validate_library_id("users/0").is_ok());
    assert!(validate_library_id("groups/12345").is_ok());
    assert!(validate_library_id("users/16943074").is_err());
    assert!(validate_library_id("groups/../users/0").is_err());
    assert!(validate_key("E2T3LH8Y").is_ok());
    assert!(validate_key("e2t3lh8y").is_err());
    assert!(validate_key("E2T3LH8Y/x").is_err());
}

#[test]
fn bibliography_prefers_authors_and_parsed_year() {
    let snapshot = json!({
        "data": {
            "title": " Constructing redox-active sites ",
            "itemType": "journalArticle",
            "DOI": "10.1016/j.jechem.2026.08.002",
            "publicationTitle": "Journal of Energy Chemistry",
            "url": "https://example.org/a",
            "creators": [
                {"firstName": "Xingming", "lastName": "Chai", "creatorType": "author"},
                {"name": "Catalysis Consortium", "creatorType": "author"},
                {"firstName": "E.", "lastName": "Ditor", "creatorType": "editor"}
            ],
            "tags": [{"tag": "光催化"}, {"tag": " "}]
        },
        "parsed_date": "2026-11"
    });
    let bib = ZoteroBibliography::from_snapshot(&snapshot);
    assert_eq!(bib.title, "Constructing redox-active sites");
    assert_eq!(bib.authors, vec!["Chai, Xingming", "Catalysis Consortium"]);
    assert_eq!(bib.year, Some(2026));
    assert_eq!(bib.publication, "Journal of Energy Chemistry");
    assert_eq!(bib.tags, vec!["光催化"]);
    assert_eq!(bib.citekey, "");
}

#[test]
fn bibliography_falls_back_to_editors_without_authors() {
    let snapshot = json!({"data": {"creators": [
        {"firstName": "E.", "lastName": "Ditor", "creatorType": "editor"}
    ], "citationKey": "ditor2020"}});
    let bib = ZoteroBibliography::from_snapshot(&snapshot);
    assert_eq!(bib.authors, vec!["Ditor, E."]);
    assert_eq!(bib.citekey, "ditor2020");
    assert_eq!(bib.year, None);
}

#[test]
fn zotero_uris_distinguish_user_and_group_libraries() {
    assert_eq!(
        select_uri("users/0", "RUYDFIVJ"),
        "zotero://select/library/items/RUYDFIVJ"
    );
    assert_eq!(
        open_pdf_uri("users/0", "E2T3LH8Y"),
        "zotero://open-pdf/library/items/E2T3LH8Y"
    );
    assert_eq!(
        select_uri("groups/42", "RUYDFIVJ"),
        "zotero://select/groups/42/items/RUYDFIVJ"
    );
}

#[test]
fn collection_path_walks_parents() {
    let collections = vec![
        ZoteroCollection {
            key: "AAAAAAAA".into(),
            name: "能源".into(),
            parent_key: None,
        },
        ZoteroCollection {
            key: "BBBBBBBB".into(),
            name: "光催化".into(),
            parent_key: Some("AAAAAAAA".into()),
        },
    ];
    assert_eq!(collection_path(&collections, "BBBBBBBB"), "能源/光催化");
    assert_eq!(collection_path(&collections, "ZZZZZZZZ"), "");
}

#[test]
fn enclosure_requires_existing_local_file() {
    let dir = std::env::temp_dir().join(format!("paperloom-zotero-enc-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let file = dir.join("a b.pdf");
    std::fs::write(&file, b"%PDF").unwrap();
    let href = url::Url::from_file_path(&file).unwrap().to_string();
    let present = json!({"links": {"enclosure": {"href": href}}});
    assert_eq!(enclosure_path(&present).as_deref(), Some(file.as_path()));
    std::fs::remove_file(&file).unwrap();
    assert!(enclosure_path(&present).is_none());
    assert!(enclosure_path(&json!({"links": {}})).is_none());
    let _ = std::fs::remove_dir_all(dir);
}
