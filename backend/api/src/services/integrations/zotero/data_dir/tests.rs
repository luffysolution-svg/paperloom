use std::path::{Path, PathBuf};

use rusqlite::{params, Connection};

use super::*;
use crate::services::integrations::zotero::ZoteroBibliography;

struct TempDir(PathBuf);

impl TempDir {
    fn new(label: &str) -> Self {
        let path = std::env::temp_dir().join(format!(
            "paperloom-zotero-{label}-{:016x}",
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

/// Zotero 数据库里本模块用到的表（列为真实 schema 的子集）。
const SCHEMA: &str = "
CREATE TABLE version (schema TEXT PRIMARY KEY, version INT NOT NULL);
CREATE TABLE libraries (libraryID INTEGER PRIMARY KEY, type TEXT NOT NULL);
CREATE TABLE groups (groupID INTEGER PRIMARY KEY, libraryID INT NOT NULL, name TEXT NOT NULL);
CREATE TABLE itemTypes (itemTypeID INTEGER PRIMARY KEY, typeName TEXT);
CREATE TABLE items (itemID INTEGER PRIMARY KEY, itemTypeID INT NOT NULL, dateAdded TEXT,
                    dateModified TEXT, libraryID INT NOT NULL, key TEXT NOT NULL);
CREATE TABLE itemAttachments (itemID INTEGER PRIMARY KEY, parentItemID INT, linkMode INT,
                              contentType TEXT, path TEXT);
CREATE TABLE fields (fieldID INTEGER PRIMARY KEY, fieldName TEXT);
CREATE TABLE baseFieldMappings (itemTypeID INT, baseFieldID INT, fieldID INT);
CREATE TABLE itemDataValues (valueID INTEGER PRIMARY KEY, value UNIQUE);
CREATE TABLE itemData (itemID INT, fieldID INT, valueID INT);
CREATE TABLE creators (creatorID INTEGER PRIMARY KEY, firstName TEXT, lastName TEXT, fieldMode INT);
CREATE TABLE creatorTypes (creatorTypeID INTEGER PRIMARY KEY, creatorType TEXT);
CREATE TABLE itemCreators (itemID INT, creatorID INT, creatorTypeID INT, orderIndex INT);
CREATE TABLE collections (collectionID INTEGER PRIMARY KEY, collectionName TEXT,
                          parentCollectionID INT, libraryID INT, key TEXT);
CREATE TABLE collectionItems (collectionID INT, itemID INT, orderIndex INT);
CREATE TABLE deletedItems (itemID INTEGER PRIMARY KEY);
CREATE TABLE deletedCollections (collectionID INTEGER PRIMARY KEY);
CREATE TABLE tags (tagID INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE itemTags (itemID INT, tagID INT, type INT);
CREATE TABLE itemAnnotations (itemID INTEGER PRIMARY KEY, parentItemID INT NOT NULL, type INTEGER NOT NULL,
                              authorName TEXT, text TEXT, comment TEXT, color TEXT, pageLabel TEXT,
                              sortIndex TEXT NOT NULL, position TEXT NOT NULL, isExternal INT NOT NULL);
CREATE TABLE itemNotes (itemID INTEGER PRIMARY KEY, parentItemID INT, note TEXT, title TEXT);

INSERT INTO version VALUES ('userdata', 125);
INSERT INTO libraries VALUES (1, 'user'), (2, 'group'), (3, 'feed');
INSERT INTO groups VALUES (777, 2, '课题组');
INSERT INTO itemTypes VALUES (1, 'journalArticle'), (2, 'attachment'), (3, 'note'), (4, 'case');
INSERT INTO fields VALUES (1, 'title'), (2, 'date'), (3, 'DOI'), (4, 'publicationTitle'),
                          (5, 'volume'), (6, 'caseName');
INSERT INTO baseFieldMappings VALUES (4, 1, 6);
INSERT INTO creatorTypes VALUES (1, 'author'), (2, 'editor');
";

struct Fixture {
    conn: Connection,
}

impl Fixture {
    fn item(&self, id: i64, item_type: i64, key: &str, library: i64, added: &str) {
        self.conn
            .execute(
                "INSERT INTO items VALUES (?1, ?2, ?3, ?3, ?4, ?5)",
                params![id, item_type, added, library, key],
            )
            .unwrap();
    }

    fn field(&self, item: i64, field: i64, value: rusqlite::types::Value) {
        self.conn
            .execute(
                "INSERT OR IGNORE INTO itemDataValues (value) VALUES (?1)",
                [&value],
            )
            .unwrap();
        let value_id: i64 = self
            .conn
            .query_row(
                "SELECT valueID FROM itemDataValues WHERE value = ?1",
                [&value],
                |r| r.get(0),
            )
            .unwrap();
        self.conn
            .execute(
                "INSERT INTO itemData VALUES (?1, ?2, ?3)",
                params![item, field, value_id],
            )
            .unwrap();
    }

    fn text(&self, item: i64, field: i64, value: &str) {
        self.field(item, field, rusqlite::types::Value::Text(value.into()));
    }

    fn creator(
        &self,
        item: i64,
        id: i64,
        first: &str,
        last: &str,
        mode: i64,
        kind: i64,
        order: i64,
    ) {
        self.conn
            .execute(
                "INSERT INTO creators VALUES (?1, ?2, ?3, ?4)",
                params![id, first, last, mode],
            )
            .unwrap();
        self.conn
            .execute(
                "INSERT INTO itemCreators VALUES (?1, ?2, ?3, ?4)",
                params![item, id, kind, order],
            )
            .unwrap();
    }

    fn attachment(&self, id: i64, parent: Option<i64>, mode: i64, content_type: &str, path: &str) {
        self.conn
            .execute(
                "INSERT INTO itemAttachments VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, parent, mode, content_type, path],
            )
            .unwrap();
    }
}

/// 个人文库：
/// - ITEMAAAA 期刊文章（分类「光催化」）：本地 PDF、WebDAV 未下载 PDF、HTML 快照
/// - ITEMBBBB 案例（标题在 caseName）、STANDPDF 独立 PDF、LINKEDPD 相对路径链接文件
/// - NOTEAAAA 独立笔记、TRASHAAA 回收站条目（都不应出现）
/// 群组文库 groups/777：GROUPITM。
fn build_library(root: &Path) {
    std::fs::create_dir_all(root).unwrap();
    let fx = Fixture {
        conn: Connection::open(root.join("zotero.sqlite")).unwrap(),
    };
    fx.conn.execute_batch(SCHEMA).unwrap();

    fx.item(10, 1, "ITEMAAAA", 1, "2026-01-01 00:00:00");
    fx.text(10, 1, "Photocatalysis review");
    fx.text(10, 2, "2024-05-00 2024-5");
    fx.text(10, 3, "10.1000/xyz");
    fx.text(10, 4, "Nature Materials");
    fx.field(10, 5, rusqlite::types::Value::Integer(25));
    fx.creator(10, 1, "Xingming", "Chai", 0, 1, 0);
    fx.creator(10, 2, "E.", "Ditor", 0, 2, 1);
    fx.creator(10, 3, "Mei", "Li", 0, 1, 2);
    fx.conn
        .execute_batch(
            "INSERT INTO tags VALUES (1, '光催化'); INSERT INTO itemTags VALUES (10, 1, 0);",
        )
        .unwrap();

    fx.item(11, 2, "PDFLOCAL", 1, "2026-01-02 00:00:00");
    fx.attachment(11, Some(10), 0, "application/pdf", "storage:paper.pdf");
    fx.item(12, 2, "PDFWEBDV", 1, "2026-01-01 00:00:00");
    fx.attachment(12, Some(10), 1, "application/pdf", "storage:remote.pdf");
    fx.item(13, 2, "HTMLSNAP", 1, "2026-01-03 00:00:00");
    fx.attachment(13, Some(10), 1, "text/html", "storage:page.html");

    fx.item(20, 4, "ITEMBBBB", 1, "2026-02-01 00:00:00");
    fx.text(20, 6, "Smith v. Jones");
    fx.creator(20, 4, "", "Supreme Court", 1, 1, 0);

    fx.item(30, 2, "STANDPDF", 1, "2025-12-01 00:00:00");
    fx.text(30, 1, "Loose PDF");
    fx.attachment(30, None, 0, "application/pdf", "storage:loose.pdf");
    fx.item(31, 2, "LINKEDPD", 1, "2025-11-01 00:00:00");
    fx.attachment(31, None, 2, "application/pdf", "attachments:papers/x.pdf");

    fx.item(40, 3, "NOTEAAAA", 1, "2026-03-01 00:00:00");
    fx.item(50, 1, "TRASHAAA", 1, "2026-03-02 00:00:00");
    fx.conn
        .execute("INSERT INTO deletedItems VALUES (50)", [])
        .unwrap();

    fx.item(60, 1, "GROUPITM", 2, "2026-01-05 00:00:00");
    fx.text(60, 1, "Group paper");

    fx.conn
        .execute_batch(
            "INSERT INTO collections VALUES (1, '光催化', NULL, 1, 'COLLAAAA'),
                                            (2, '单原子', 1, 1, 'COLLBBBB'),
                                            (3, '已删除', NULL, 1, 'COLLDDDD');
             INSERT INTO deletedCollections VALUES (3);
             INSERT INTO collectionItems VALUES (1, 10, 0);",
        )
        .unwrap();

    for (key, name) in [("PDFLOCAL", "paper.pdf"), ("STANDPDF", "loose.pdf")] {
        let dir = root.join("storage").join(key);
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join(name), b"%PDF-1.7 test").unwrap();
    }
}

fn data_dir(tmp: &TempDir) -> ZoteroDataDir {
    ZoteroDataDir::with_cache_dir(tmp.0.join("Zotero"), tmp.0.join("cache"))
}

fn keys(page: &ZoteroItemPage) -> Vec<&str> {
    page.items.iter().map(|item| item.key.as_str()).collect()
}

#[tokio::test]
async fn browses_libraries_collections_and_top_level_items_like_the_local_api() {
    let tmp = TempDir::new("browse");
    build_library(&tmp.0.join("Zotero"));
    let dir = data_dir(&tmp);

    let status = dir.status().await;
    assert!(status.supported && status.reachable, "{:?}", status.message);
    assert_eq!(status.mode, "data_dir");
    assert_eq!(status.notice, None);
    let libraries: Vec<_> = status
        .libraries
        .iter()
        .map(|l| (l.id.as_str(), l.name.as_str()))
        .collect();
    assert_eq!(
        libraries,
        vec![("users/0", "我的文库"), ("groups/777", "课题组")]
    );

    let collections = dir.collections("users/0").await.unwrap();
    let collections: Vec<_> = collections
        .iter()
        .map(|c| (c.key.as_str(), c.name.as_str(), c.parent_key.as_deref()))
        .collect();
    // 已删除的分类不出现；与本地 API 一样按名称（码点）排序。
    assert_eq!(
        collections,
        vec![
            ("COLLAAAA", "光催化", None),
            ("COLLBBBB", "单原子", Some("COLLAAAA"))
        ]
    );

    let page = dir.items("users/0", None, None, 0, 50).await.unwrap();
    assert_eq!(
        keys(&page),
        vec!["ITEMBBBB", "ITEMAAAA", "STANDPDF", "LINKEDPD"]
    );
    assert_eq!(page.total, 4);

    let article = &page.items[1];
    assert_eq!(article.title, "Photocatalysis review");
    assert_eq!(article.creators, "Chai和Li");
    assert_eq!(article.year.as_deref(), Some("2024"));
    let attachments: Vec<_> = article
        .attachments
        .iter()
        .map(|a| (a.key.as_str(), a.title.as_str(), a.available, a.size))
        .collect();
    assert_eq!(
        attachments,
        vec![
            ("PDFLOCAL", "paper.pdf", true, Some(13)),
            ("PDFWEBDV", "remote.pdf", false, None)
        ]
    );

    let case = &page.items[0];
    assert_eq!(
        (case.title.as_str(), case.creators.as_str()),
        ("Smith v. Jones", "Supreme Court")
    );
    assert!(case.attachments.is_empty());
    assert_eq!(page.items[2].attachments[0].key, "STANDPDF");
    assert!(page.items[2].attachments[0].available);
    assert!(!page.items[3].attachments[0].available);

    for (query, expected) in [
        ("chai", "ITEMAAAA"),
        ("smith", "ITEMBBBB"),
        ("2024", "ITEMAAAA"),
        ("loose", "STANDPDF"),
    ] {
        let found = dir
            .items("users/0", None, Some(query), 0, 50)
            .await
            .unwrap();
        assert_eq!(keys(&found), vec![expected], "q={query}");
    }
    assert!(dir
        .items("users/0", None, Some("100%"), 0, 50)
        .await
        .unwrap()
        .items
        .is_empty());

    let in_collection = dir
        .items("users/0", Some("COLLAAAA"), None, 0, 50)
        .await
        .unwrap();
    assert_eq!(keys(&in_collection), vec!["ITEMAAAA"]);
    let second = dir.items("users/0", None, None, 1, 1).await.unwrap();
    assert_eq!((keys(&second), second.total), (vec!["ITEMAAAA"], 4));
    let group = dir.items("groups/777", None, None, 0, 50).await.unwrap();
    assert_eq!(keys(&group), vec!["GROUPITM"]);
    assert!(dir.items("groups/1", None, None, 0, 50).await.is_err());
}

#[tokio::test]
async fn resolves_local_attachments_with_api_shaped_snapshot() {
    let tmp = TempDir::new("resolve");
    let root = tmp.0.join("Zotero");
    build_library(&root);
    let dir = data_dir(&tmp);

    let resolved = dir
        .resolve_attachment("users/0", "ITEMAAAA", "PDFLOCAL")
        .await
        .unwrap();
    assert_eq!(resolved.path, root.join("storage/PDFLOCAL/paper.pdf"));
    assert_eq!(resolved.filename, "paper.pdf");
    assert_eq!(resolved.snapshot["data"]["volume"], "25");
    assert_eq!(resolved.snapshot["parsed_date"], "2024-05");
    let bib = ZoteroBibliography::from_snapshot(&resolved.snapshot);
    assert_eq!(bib.title, "Photocatalysis review");
    assert_eq!(bib.authors, vec!["Chai, Xingming", "Li, Mei"]);
    assert_eq!(bib.year, Some(2024));
    assert_eq!(bib.doi, "10.1000/xyz");
    assert_eq!(bib.publication, "Nature Materials");
    assert_eq!(bib.item_type, "journalArticle");
    assert_eq!(bib.tags, vec!["光催化"]);

    let standalone = dir
        .resolve_attachment("users/0", "STANDPDF", "STANDPDF")
        .await
        .unwrap();
    assert_eq!(
        ZoteroBibliography::from_snapshot(&standalone.snapshot).title,
        "Loose PDF"
    );

    let webdav = dir
        .resolve_attachment("users/0", "ITEMAAAA", "PDFWEBDV")
        .await
        .err()
        .unwrap();
    assert!(webdav.to_string().contains("WebDAV"), "{webdav}");
    let linked = dir
        .resolve_attachment("users/0", "LINKEDPD", "LINKEDPD")
        .await
        .err()
        .unwrap();
    assert!(linked.to_string().contains("链接文件"), "{linked}");
    let wrong_parent = dir
        .resolve_attachment("users/0", "ITEMBBBB", "PDFLOCAL")
        .await
        .err()
        .unwrap();
    assert!(
        wrong_parent.to_string().contains("does not belong"),
        "{wrong_parent}"
    );
    let html = dir
        .resolve_attachment("users/0", "ITEMAAAA", "HTMLSNAP")
        .await
        .err()
        .unwrap();
    assert!(html.to_string().contains("not a PDF"), "{html}");
    assert!(dir
        .resolve_attachment("users/0", "TRASHAAA", "TRASHAAA")
        .await
        .is_err());
}

#[tokio::test]
async fn reads_annotations_of_the_attachment_and_notes_of_the_item() {
    let tmp = TempDir::new("extras");
    let root = tmp.0.join("Zotero");
    build_library(&root);
    let conn = Connection::open(root.join("zotero.sqlite")).unwrap();
    conn.execute_batch(
        "INSERT INTO itemTypes VALUES (5, 'annotation');
         INSERT INTO items VALUES (80, 5, '2026-01-04', '2026-01-04', 1, 'ANNOTBBB');
         INSERT INTO items VALUES (81, 5, '2026-01-04', '2026-01-04', 1, 'ANNOTAAA');
         INSERT INTO items VALUES (82, 5, '2026-01-04', '2026-01-04', 1, 'ANNOTDEL');
         INSERT INTO itemAnnotations VALUES (80, 11, 3, '', NULL, '图', '#fff', '3', '00002|000100|00050', '{\"pageIndex\":2}', 0);
         INSERT INTO itemAnnotations VALUES (81, 11, 1, '', 'first', '评论', '#ff0', 'iv', '00000|000010|00020', '{\"pageIndex\":0,\"rects\":[]}', 0);
         INSERT INTO itemAnnotations VALUES (82, 11, 1, '', 'gone', '', '#ff0', '1', '00000|000001|00001', '{\"pageIndex\":0}', 0);
         INSERT INTO deletedItems VALUES (82);
         INSERT INTO items VALUES (90, 3, '2026-01-06', '2026-01-06', 1, 'NOTELATE');
         INSERT INTO items VALUES (91, 3, '2026-01-05', '2026-01-05', 1, 'NOTEEARL');
         INSERT INTO itemNotes VALUES (90, 10, '<p>later</p>', 'later');
         INSERT INTO itemNotes VALUES (91, 10, '<p>earlier</p>', 'earlier');",
    )
    .unwrap();
    drop(conn);
    let dir = data_dir(&tmp);

    let extras = dir.extras("users/0", "ITEMAAAA", "PDFLOCAL").await.unwrap();
    let annotations: Vec<_> = extras
        .annotations
        .iter()
        .map(|a| {
            (
                a.key.as_str(),
                a.kind.as_str(),
                a.text.as_str(),
                a.page_label.as_str(),
                a.page_index,
            )
        })
        .collect();
    assert_eq!(
        annotations,
        vec![
            ("ANNOTAAA", "highlight", "first", "iv", Some(0)),
            ("ANNOTBBB", "image", "", "3", Some(2))
        ]
    );
    assert_eq!(extras.annotations[0].comment, "评论");
    let notes: Vec<_> = extras
        .notes
        .iter()
        .map(|n| (n.key.as_str(), n.html.as_str()))
        .collect();
    assert_eq!(
        notes,
        vec![("NOTEEARL", "<p>earlier</p>"), ("NOTELATE", "<p>later</p>")]
    );

    let standalone = dir.extras("users/0", "STANDPDF", "STANDPDF").await.unwrap();
    assert_eq!(standalone, ZoteroExtras::default());
    assert!(dir.extras("users/0", "ITEMAAAA", "ZZZZZZZZ").await.is_err());
}

#[tokio::test]
async fn falls_back_to_backup_when_live_database_fails_quick_check() {
    let tmp = TempDir::new("fallback");
    let root = tmp.0.join("Zotero");
    build_library(&root);
    std::fs::rename(root.join("zotero.sqlite"), root.join("zotero.sqlite.bak")).unwrap();
    // 模拟复制到半写状态的库。
    std::fs::write(root.join("zotero.sqlite"), vec![0x5a; 8192]).unwrap();
    let dir = data_dir(&tmp);

    let status = dir.status().await;
    assert!(status.supported, "{:?}", status.message);
    assert!(status
        .notice
        .as_deref()
        .is_some_and(|n| n.contains("zotero.sqlite.bak")));
    assert_eq!(
        dir.items("users/0", None, None, 0, 50).await.unwrap().total,
        4
    );

    std::fs::write(root.join("zotero.sqlite.bak"), b"broken").unwrap();
    let status = dir.status().await;
    assert!(!status.supported && !status.reachable);
    assert!(status
        .message
        .as_deref()
        .is_some_and(|m| m.contains("zotero.sqlite.bak")));
}

#[tokio::test]
async fn reports_missing_mount_and_refreshes_snapshot_when_database_changes() {
    let tmp = TempDir::new("cache");
    let dir = data_dir(&tmp);
    let status = dir.status().await;
    assert!(!status.supported);
    assert!(status
        .message
        .as_deref()
        .is_some_and(|m| m.contains("未找到 Zotero 数据库")));

    let root = tmp.0.join("Zotero");
    build_library(&root);
    assert_eq!(
        dir.items("users/0", None, None, 0, 50).await.unwrap().total,
        4
    );
    let snapshots = || std::fs::read_dir(tmp.0.join("cache")).unwrap().count();
    assert_eq!(snapshots(), 1);
    dir.items("users/0", None, None, 0, 50).await.unwrap();
    assert_eq!(snapshots(), 1);

    let conn = Connection::open(root.join("zotero.sqlite")).unwrap();
    conn.execute_batch(
        "INSERT INTO items VALUES (70, 1, '2027-01-01 00:00:00', '2027-01-01 00:00:00', 1, 'NEWITEMA');
         INSERT INTO itemDataValues (value) VALUES ('Fresh paper') ;
         INSERT INTO itemData VALUES (70, 1, last_insert_rowid());",
    )
    .unwrap();
    drop(conn);
    let page = dir.items("users/0", None, None, 0, 50).await.unwrap();
    assert_eq!(keys(&page)[0], "NEWITEMA");
    assert_eq!(page.items[0].title, "Fresh paper");
    assert_eq!(snapshots(), 1);
}
