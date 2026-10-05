// Zotero 数据目录（Docker：宿主的 Zotero 数据目录只读挂载进容器）。
//
// Zotero 运行时独占持有 zotero.sqlite，直接打开会被锁或读到半写状态。这里先把它
// 复制成快照、`PRAGMA quick_check` 通过才使用；多次失败回退到 Zotero 自动维护的
// zotero.sqlite.bak（数据可能滞后，状态里提示）。快照按源文件大小 + 修改时间缓存。
// 附件文件在 storage/<附件 key>/ 下；WebDAV 未下载、链接文件在容器内都不可读。

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime};

use rusqlite::types::Value as SqlValue;
use rusqlite::{params, Connection, OpenFlags, OptionalExtension};
use serde_json::{json, Map, Value};

use super::{
    page_index_of, validate_key, validate_library_id, ResolvedAttachment, ZoteroAnnotation,
    ZoteroAttachment, ZoteroCollection, ZoteroExtras, ZoteroItem, ZoteroItemPage, ZoteroLibrary,
    ZoteroNote, ZoteroStatus,
};
use crate::db::documents::sha256_hex;
use crate::error::AppError;

/// 设置后改读该目录（容器内挂载点，如 /zotero），不再连本地 API。
pub const ZOTERO_DATA_DIR_ENV: &str = "PAPERLOOM_ZOTERO_DATA_DIR";
const DB_FILE: &str = "zotero.sqlite";
const BACKUP_FILE: &str = "zotero.sqlite.bak";
const COPY_ATTEMPTS: usize = 3;
const PDF: &str = "application/pdf";

pub fn data_dir_from_env() -> Option<PathBuf> {
    std::env::var(ZOTERO_DATA_DIR_ENV)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}

#[derive(Clone)]
pub struct ZoteroDataDir {
    root: PathBuf,
    cache_dir: PathBuf,
}

#[derive(Clone, PartialEq)]
struct SourceStamp {
    len: u64,
    modified: Option<SystemTime>,
}

struct Snapshot {
    stamp: SourceStamp,
    path: PathBuf,
    /// 读的是 .bak 备份。
    stale: bool,
}

fn snapshots() -> &'static Mutex<HashMap<PathBuf, Snapshot>> {
    static SNAPSHOTS: OnceLock<Mutex<HashMap<PathBuf, Snapshot>>> = OnceLock::new();
    SNAPSHOTS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn stamp(path: &Path) -> Option<SourceStamp> {
    let meta = std::fs::metadata(path).ok().filter(|meta| meta.is_file())?;
    Some(SourceStamp {
        len: meta.len(),
        modified: meta.modified().ok(),
    })
}

fn sql_error(err: rusqlite::Error) -> AppError {
    AppError::internal(format!("read zotero database: {err}"))
}

/// 复制并校验；通过才返回。
fn copy_checked(source: &Path, target: &Path) -> Result<(), String> {
    std::fs::copy(source, target).map_err(|err| err.to_string())?;
    let conn = open_read_only(target).map_err(|err| err.to_string())?;
    let check: String = conn
        .query_row("PRAGMA quick_check", [], |row| row.get(0))
        .map_err(|err| err.to_string())?;
    if check != "ok" {
        return Err(format!("quick_check: {check}"));
    }
    conn.query_row("SELECT 1 FROM items LIMIT 1", [], |_| Ok(()))
        .optional()
        .map_err(|err| err.to_string())?;
    Ok(())
}

fn open_read_only(path: &Path) -> rusqlite::Result<Connection> {
    Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
}

impl ZoteroDataDir {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root,
            cache_dir: std::env::temp_dir().join("paperloom-zotero"),
        }
    }

    #[cfg(test)]
    pub fn with_cache_dir(root: PathBuf, cache_dir: PathBuf) -> Self {
        Self { root, cache_dir }
    }

    fn missing_db(&self) -> AppError {
        AppError::conflict(format!(
            "未找到 Zotero 数据库：{}。请把 Zotero 数据目录（含 zotero.sqlite 与 storage）挂载到这里",
            self.root.join(DB_FILE).display()
        ))
    }

    /// 打开（必要时刷新）快照；返回连接与是否读的是备份。
    fn open(&self) -> Result<(Connection, bool), AppError> {
        let source = self.root.join(DB_FILE);
        let current = stamp(&source).ok_or_else(|| self.missing_db())?;
        let mut cache = snapshots()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let fresh = cache
            .get(&self.root)
            .is_some_and(|snap| !snap.stale && snap.stamp == current && snap.path.is_file());
        if !fresh {
            let snapshot = self.refresh(&source, current)?;
            cache.insert(self.root.clone(), snapshot);
        }
        let snapshot = &cache[&self.root];
        Ok((
            open_read_only(&snapshot.path).map_err(sql_error)?,
            snapshot.stale,
        ))
    }

    fn refresh(&self, source: &Path, current: SourceStamp) -> Result<Snapshot, AppError> {
        std::fs::create_dir_all(&self.cache_dir)?;
        let prefix = sha256_hex(self.root.to_string_lossy().as_bytes())[..16].to_string();
        // 每次换新文件名：Windows 上仍被打开的旧快照无法被覆盖。
        let nonce = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map(|elapsed| elapsed.as_nanos())
            .unwrap_or_default();
        let target = self.cache_dir.join(format!("{prefix}-{nonce}.sqlite"));

        let mut last_error = String::new();
        let mut stale = false;
        let mut ok = false;
        for attempt in 0..COPY_ATTEMPTS {
            if attempt > 0 {
                std::thread::sleep(Duration::from_millis(300));
            }
            match copy_checked(source, &target) {
                Ok(()) => {
                    ok = true;
                    break;
                }
                Err(err) => last_error = err,
            }
        }
        if !ok {
            let backup = self.root.join(BACKUP_FILE);
            copy_checked(&backup, &target).map_err(|backup_error| {
                let _ = std::fs::remove_file(&target);
                AppError::conflict(format!(
                    "Zotero 数据库快照校验失败（{last_error}），备份 {BACKUP_FILE} 也不可用（{backup_error}）"
                ))
            })?;
            stale = true;
        }

        // 清理同一数据目录的旧快照；仍被占用的留到下次。
        if let Ok(entries) = std::fs::read_dir(&self.cache_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = entry.file_name().to_string_lossy().to_string();
                if path != target && name.starts_with(&prefix) {
                    let _ = std::fs::remove_file(path);
                }
            }
        }
        Ok(Snapshot {
            stamp: current,
            path: target,
            stale,
        })
    }

    async fn run<T, F>(&self, task: F) -> Result<T, AppError>
    where
        T: Send + 'static,
        F: FnOnce(&ZoteroDataDir, &Connection, bool) -> Result<T, AppError> + Send + 'static,
    {
        let this = self.clone();
        tokio::task::spawn_blocking(move || {
            let (conn, stale) = this.open()?;
            task(&this, &conn, stale)
        })
        .await
        .map_err(|err| AppError::internal(err.to_string()))?
    }

    pub async fn status(&self) -> ZoteroStatus {
        let base = self.root.display().to_string();
        let result = self
            .run(|_, conn, stale| {
                let schema: Option<i64> = conn
                    .query_row(
                        "SELECT version FROM version WHERE schema = 'userdata'",
                        [],
                        |row| row.get(0),
                    )
                    .optional()
                    .map_err(sql_error)?;
                Ok((libraries(conn)?, schema, stale))
            })
            .await;
        match result {
            Ok((libraries, schema, stale)) => ZoteroStatus {
                reachable: true,
                version: schema.map(|version| format!("userdata schema {version}")),
                supported: true,
                api_base: base,
                libraries,
                message: None,
                mode: "data_dir",
                notice: stale.then(|| {
                    "Zotero 正在写入数据库，暂时读取的是它的自动备份 zotero.sqlite.bak，最近的改动可能还看不到".to_string()
                }),
            },
            Err(err) => ZoteroStatus {
                reachable: false,
                version: None,
                supported: false,
                api_base: base,
                libraries: Vec::new(),
                message: Some(err.to_string()),
                mode: "data_dir",
                notice: None,
            },
        }
    }

    pub async fn collections(&self, library_id: &str) -> Result<Vec<ZoteroCollection>, AppError> {
        let library_id = validate_library_id(library_id)?.to_string();
        self.run(move |_, conn, _| {
            let library = library_row(conn, &library_id)?;
            let mut stmt = conn
                .prepare(
                    "SELECT c.key, c.collectionName, p.key FROM collections c
                     LEFT JOIN collections p ON p.collectionID = c.parentCollectionID
                     WHERE c.libraryID = ?1
                       AND c.collectionID NOT IN (SELECT collectionID FROM deletedCollections)",
                )
                .map_err(sql_error)?;
            let mut collections = stmt
                .query_map([library], |row| {
                    Ok(ZoteroCollection {
                        key: row.get(0)?,
                        name: row.get(1)?,
                        parent_key: row.get(2)?,
                    })
                })
                .map_err(sql_error)?
                .collect::<Result<Vec<_>, _>>()
                .map_err(sql_error)?;
            collections.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
            Ok(collections)
        })
        .await
    }

    pub async fn items(
        &self,
        library_id: &str,
        collection_key: Option<&str>,
        query: Option<&str>,
        start: usize,
        limit: usize,
    ) -> Result<ZoteroItemPage, AppError> {
        let library_id = validate_library_id(library_id)?.to_string();
        let collection_key = collection_key
            .map(validate_key)
            .transpose()?
            .map(str::to_string);
        let pattern = query.map(str::trim).filter(|q| !q.is_empty()).map(|q| {
            format!(
                "%{}%",
                q.replace('\\', "\\\\")
                    .replace('%', "\\%")
                    .replace('_', "\\_")
            )
        });
        let limit = limit.clamp(1, 100);
        self.run(move |this, conn, _| {
            let library = library_row(conn, &library_id)?;
            // 顶层条目：排除笔记 / 批注 / 子附件 / 回收站，与本地 API 的 /items/top 一致。
            let filter = "FROM items i JOIN itemTypes t USING (itemTypeID)
                WHERE i.libraryID = ?1
                  AND t.typeName NOT IN ('note', 'annotation')
                  AND i.itemID NOT IN (SELECT itemID FROM deletedItems)
                  AND NOT EXISTS (SELECT 1 FROM itemAttachments a
                                  WHERE a.itemID = i.itemID AND a.parentItemID IS NOT NULL)
                  AND (?2 IS NULL OR i.itemID IN (
                        SELECT ci.itemID FROM collectionItems ci JOIN collections c USING (collectionID)
                        WHERE c.key = ?2 AND c.libraryID = ?1))
                  AND (?3 IS NULL
                       OR EXISTS (SELECT 1 FROM itemData d JOIN itemDataValues v USING (valueID)
                                  WHERE d.itemID = i.itemID
                                    AND d.fieldID IN (SELECT fieldID FROM fields WHERE fieldName IN ('title', 'date')
                                                      UNION SELECT b.fieldID FROM baseFieldMappings b
                                                      JOIN fields f ON f.fieldID = b.baseFieldID
                                                      WHERE f.fieldName = 'title')
                                    AND v.value LIKE ?3 ESCAPE '\\')
                       OR EXISTS (SELECT 1 FROM itemCreators ic JOIN creators c USING (creatorID)
                                  WHERE ic.itemID = i.itemID
                                    AND (c.lastName LIKE ?3 ESCAPE '\\' OR c.firstName LIKE ?3 ESCAPE '\\')))";
            let args = params![library, collection_key, pattern];
            let total: i64 = conn
                .query_row(&format!("SELECT COUNT(*) {filter}"), args, |row| row.get(0))
                .map_err(sql_error)?;
            let rows = {
                let mut stmt = conn
                    .prepare(&format!(
                        "SELECT i.itemID, i.key, t.typeName {filter}
                         ORDER BY i.dateAdded DESC, i.itemID DESC LIMIT ?4 OFFSET ?5"
                    ))
                    .map_err(sql_error)?;
                let rows = stmt
                    .query_map(params![library, collection_key, pattern, limit as i64, start as i64], |row| {
                        Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?))
                    })
                    .map_err(sql_error)?
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(sql_error)?;
                rows
            };

            let mut items = Vec::with_capacity(rows.len());
            for (item_id, key, item_type) in rows {
                let fields = item_fields(conn, item_id)?;
                let creators = item_creators(conn, item_id)?;
                let attachments = if item_type == "attachment" {
                    match attachment_row(conn, item_id)? {
                        Some(row) if row.content_type == PDF => vec![this.attachment_view(&key, &row, &fields)],
                        _ => Vec::new(),
                    }
                } else {
                    this.child_pdfs(conn, item_id)?
                };
                items.push(ZoteroItem {
                    title: title_of(conn, item_id)?.unwrap_or_default(),
                    creators: creator_summary(&creators),
                    year: parsed_date(&fields).and_then(|date| date.get(0..4).map(str::to_string)),
                    item_type,
                    attachments,
                    key,
                });
            }
            Ok(ZoteroItemPage {
                items,
                total: total.max(0) as usize,
            })
        })
        .await
    }

    pub async fn resolve_attachment(
        &self,
        library_id: &str,
        item_key: &str,
        attachment_key: &str,
    ) -> Result<ResolvedAttachment, AppError> {
        let library_id = validate_library_id(library_id)?.to_string();
        let item_key = validate_key(item_key)?.to_string();
        let attachment_key = validate_key(attachment_key)?.to_string();
        self.run(move |this, conn, _| {
            let library = library_row(conn, &library_id)?;
            let not_found = || AppError::not_found(format!("zotero object not found: {attachment_key}"));
            let attachment_id = item_id(conn, library, &attachment_key)?.ok_or_else(not_found)?;
            let row = attachment_row(conn, attachment_id)?.ok_or_else(not_found)?;
            if row.content_type != PDF {
                return Err(AppError::bad_request(format!(
                    "zotero attachment is not a PDF: {attachment_key}"
                )));
            }
            let parent_id = row.parent_id.unwrap_or(attachment_id);
            let parent_key: String = conn
                .query_row("SELECT key FROM items WHERE itemID = ?1", [parent_id], |r| r.get(0))
                .map_err(sql_error)?;
            if parent_key != item_key {
                return Err(AppError::bad_request(format!(
                    "zotero attachment {attachment_key} does not belong to item {item_key}"
                )));
            }
            let path = this.attachment_file(&attachment_key, &row).ok_or_else(|| {
                AppError::conflict(
                    "附件不在挂载的 Zotero 数据目录里：WebDAV 同步的附件需先在 Zotero 中打开一次、下载到本地；「链接文件」类型的附件暂不支持",
                )
            })?;
            let filename = path
                .file_name()
                .map(|name| name.to_string_lossy().to_string())
                .filter(|name| name.to_lowercase().ends_with(".pdf"))
                .unwrap_or_else(|| format!("{attachment_key}.pdf"));
            Ok(ResolvedAttachment {
                path,
                filename,
                snapshot: item_snapshot(conn, parent_id, &parent_key)?,
            })
        })
        .await
    }

    /// 附件的批注与条目的子笔记（回收站里的不要）。
    pub async fn extras(
        &self,
        library_id: &str,
        item_key: &str,
        attachment_key: &str,
    ) -> Result<ZoteroExtras, AppError> {
        let library_id = validate_library_id(library_id)?.to_string();
        let item_key = validate_key(item_key)?.to_string();
        let attachment_key = validate_key(attachment_key)?.to_string();
        self.run(move |_, conn, _| {
            let library = library_row(conn, &library_id)?;
            let not_found = || AppError::not_found(format!("zotero object not found: {attachment_key}"));
            let attachment_id = item_id(conn, library, &attachment_key)?.ok_or_else(not_found)?;
            let mut stmt = conn
                .prepare(
                    "SELECT i.key, a.type, a.text, a.comment, a.pageLabel, a.sortIndex, a.position
                     FROM itemAnnotations a JOIN items i USING (itemID)
                     WHERE a.parentItemID = ?1 AND i.itemID NOT IN (SELECT itemID FROM deletedItems)
                     ORDER BY a.sortIndex",
                )
                .map_err(sql_error)?;
            let annotations = stmt
                .query_map([attachment_id], |row| {
                    let position: String = row.get(6)?;
                    Ok(ZoteroAnnotation {
                        key: row.get(0)?,
                        kind: annotation_kind(row.get(1)?).to_string(),
                        text: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                        comment: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                        page_label: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                        sort_index: row.get(5)?,
                        page_index: page_index_of(&position),
                    })
                })
                .map_err(sql_error)?
                .collect::<Result<Vec<_>, _>>()
                .map_err(sql_error)?;

            let mut notes = Vec::new();
            if item_key != attachment_key {
                let parent = item_id(conn, library, &item_key)?.ok_or_else(not_found)?;
                let mut stmt = conn
                    .prepare(
                        "SELECT i.key, n.note FROM itemNotes n JOIN items i USING (itemID)
                         WHERE n.parentItemID = ?1 AND i.itemID NOT IN (SELECT itemID FROM deletedItems)
                         ORDER BY i.dateAdded, i.itemID",
                    )
                    .map_err(sql_error)?;
                notes = stmt
                    .query_map([parent], |row| {
                        Ok(ZoteroNote {
                            key: row.get(0)?,
                            html: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                        })
                    })
                    .map_err(sql_error)?
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(sql_error)?;
            }
            Ok(ZoteroExtras { annotations, notes })
        })
        .await
    }

    /// 只认 Zotero 自己管理的文件（storage/<key>/<文件名>）与绝对路径的链接文件。
    fn attachment_file(&self, attachment_key: &str, row: &AttachmentRow) -> Option<PathBuf> {
        let path = row.path.as_deref()?;
        let file = match row.link_mode {
            // imported_file / imported_url
            0 | 1 => {
                let name = path.strip_prefix("storage:")?;
                if name.is_empty() || name.contains(['/', '\\']) || name == ".." {
                    return None;
                }
                self.root.join("storage").join(attachment_key).join(name)
            }
            // linked_file：宿主路径在容器里通常不存在；相对「附件根目录」的暂不支持。
            2 => Some(PathBuf::from(path)).filter(|p| p.is_absolute())?,
            _ => return None,
        };
        file.is_file().then_some(file)
    }

    fn attachment_view(
        &self,
        key: &str,
        row: &AttachmentRow,
        fields: &Map<String, Value>,
    ) -> ZoteroAttachment {
        let file = self.attachment_file(key, row);
        let filename = row
            .path
            .as_deref()
            .map(|path| path.strip_prefix("storage:").unwrap_or(path))
            .and_then(|path| path.rsplit(['/', '\\']).next())
            .unwrap_or("");
        let title = [
            fields.get("title").and_then(Value::as_str).unwrap_or(""),
            filename,
        ]
        .into_iter()
        .find(|value| !value.is_empty())
        .unwrap_or("PDF")
        .to_string();
        ZoteroAttachment {
            key: key.to_string(),
            title,
            available: file.is_some(),
            size: file
                .and_then(|path| std::fs::metadata(path).ok())
                .map(|meta| meta.len()),
            document_id: None,
        }
    }

    fn child_pdfs(
        &self,
        conn: &Connection,
        parent_id: i64,
    ) -> Result<Vec<ZoteroAttachment>, AppError> {
        let mut stmt = conn
            .prepare(
                "SELECT i.itemID, i.key FROM itemAttachments a JOIN items i USING (itemID)
                 WHERE a.parentItemID = ?1 AND a.contentType = ?2
                   AND i.itemID NOT IN (SELECT itemID FROM deletedItems)
                 ORDER BY i.dateModified DESC, i.itemID DESC",
            )
            .map_err(sql_error)?;
        let children = stmt
            .query_map(params![parent_id, PDF], |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(sql_error)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(sql_error)?;
        let mut views = Vec::with_capacity(children.len());
        for (id, key) in children {
            if let Some(row) = attachment_row(conn, id)? {
                views.push(self.attachment_view(&key, &row, &item_fields(conn, id)?));
            }
        }
        Ok(views)
    }
}

/// itemAnnotations.type → 本地 API 的 annotationType。
fn annotation_kind(code: i64) -> &'static str {
    match code {
        1 => "highlight",
        2 => "note",
        3 => "image",
        4 => "ink",
        5 => "underline",
        6 => "text",
        _ => "unknown",
    }
}

struct AttachmentRow {
    parent_id: Option<i64>,
    link_mode: i64,
    content_type: String,
    path: Option<String>,
}

fn attachment_row(conn: &Connection, item_id: i64) -> Result<Option<AttachmentRow>, AppError> {
    conn.query_row(
        "SELECT parentItemID, linkMode, contentType, path FROM itemAttachments WHERE itemID = ?1",
        [item_id],
        |row| {
            Ok(AttachmentRow {
                parent_id: row.get(0)?,
                link_mode: row.get::<_, Option<i64>>(1)?.unwrap_or(-1),
                content_type: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                path: row.get(3)?,
            })
        },
    )
    .optional()
    .map_err(sql_error)
}

fn libraries(conn: &Connection) -> Result<Vec<ZoteroLibrary>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT l.type, g.groupID, g.name FROM libraries l
             LEFT JOIN groups g USING (libraryID)
             WHERE l.type = 'user' OR (l.type = 'group' AND g.groupID IS NOT NULL)
             ORDER BY l.type = 'user' DESC, g.name",
        )
        .map_err(sql_error)?;
    let libraries = stmt
        .query_map([], |row| {
            let kind: String = row.get(0)?;
            Ok(if kind == "user" {
                ZoteroLibrary {
                    id: "users/0".into(),
                    name: "我的文库".into(),
                    kind: "user",
                }
            } else {
                ZoteroLibrary {
                    id: format!("groups/{}", row.get::<_, i64>(1)?),
                    name: row
                        .get::<_, Option<String>>(2)?
                        .unwrap_or_else(|| "群组".into()),
                    kind: "group",
                }
            })
        })
        .map_err(sql_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sql_error)?;
    Ok(libraries)
}

/// users/0 / groups/<id> → libraries.libraryID。
fn library_row(conn: &Connection, library_id: &str) -> Result<i64, AppError> {
    let found = match library_id.strip_prefix("groups/") {
        Some(group) => conn
            .query_row(
                "SELECT libraryID FROM groups WHERE groupID = ?1",
                [group.parse::<i64>().unwrap_or(-1)],
                |row| row.get(0),
            )
            .optional(),
        None => conn
            .query_row(
                "SELECT libraryID FROM libraries WHERE type = 'user'",
                [],
                |row| row.get(0),
            )
            .optional(),
    }
    .map_err(sql_error)?;
    found.ok_or_else(|| AppError::not_found(format!("zotero library not found: {library_id}")))
}

fn item_id(conn: &Connection, library: i64, key: &str) -> Result<Option<i64>, AppError> {
    conn.query_row(
        "SELECT itemID FROM items WHERE libraryID = ?1 AND key = ?2
           AND itemID NOT IN (SELECT itemID FROM deletedItems)",
        params![library, key],
        |row| row.get(0),
    )
    .optional()
    .map_err(sql_error)
}

/// 条目字段（字段名与 Web API 的 data 一致）。
fn item_fields(conn: &Connection, item_id: i64) -> Result<Map<String, Value>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT f.fieldName, v.value FROM itemData d
             JOIN fields f USING (fieldID) JOIN itemDataValues v USING (valueID)
             WHERE d.itemID = ?1",
        )
        .map_err(sql_error)?;
    let rows = stmt
        .query_map([item_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, SqlValue>(1)?))
        })
        .map_err(sql_error)?;
    let mut fields = Map::new();
    for row in rows {
        let (name, value) = row.map_err(sql_error)?;
        // itemDataValues 是无类型列：数字形态的值（如卷号）会以整数存储。
        let text = match value {
            SqlValue::Text(text) => text,
            SqlValue::Integer(number) => number.to_string(),
            SqlValue::Real(number) => number.to_string(),
            SqlValue::Null | SqlValue::Blob(_) => continue,
        };
        fields.insert(name, Value::String(text));
    }
    Ok(fields)
}

/// 标题：title 或其类型专属映射字段（如 caseName）。
fn title_of(conn: &Connection, item_id: i64) -> Result<Option<String>, AppError> {
    conn.query_row(
        "SELECT v.value FROM itemData d JOIN itemDataValues v USING (valueID)
         WHERE d.itemID = ?1
           AND d.fieldID IN (SELECT fieldID FROM fields WHERE fieldName = 'title'
                             UNION SELECT b.fieldID FROM baseFieldMappings b
                             JOIN fields f ON f.fieldID = b.baseFieldID WHERE f.fieldName = 'title')
         LIMIT 1",
        [item_id],
        |row| row.get(0),
    )
    .optional()
    .map_err(sql_error)
}

/// (creatorType, firstName, lastName, 单字段姓名)
type CreatorRow = (String, String, String, bool);

fn item_creators(conn: &Connection, item_id: i64) -> Result<Vec<CreatorRow>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT ct.creatorType, c.firstName, c.lastName, c.fieldMode FROM itemCreators ic
             JOIN creators c USING (creatorID) JOIN creatorTypes ct USING (creatorTypeID)
             WHERE ic.itemID = ?1 ORDER BY ic.orderIndex",
        )
        .map_err(sql_error)?;
    let creators = stmt
        .query_map([item_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                row.get::<_, Option<i64>>(3)?.unwrap_or(0) == 1,
            ))
        })
        .map_err(sql_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sql_error)?;
    Ok(creators)
}

/// 与 Zotero 中文界面下本地 API 的 meta.creatorSummary 同格式：A / A和B / A 等。
fn creator_summary(creators: &[CreatorRow]) -> String {
    let has_author = creators.iter().any(|c| c.0 == "author");
    let names: Vec<&str> = creators
        .iter()
        .filter(|c| !has_author || c.0 == "author")
        .map(|c| c.2.as_str())
        .filter(|name| !name.is_empty())
        .collect();
    match names.as_slice() {
        [] => String::new(),
        [one] => one.to_string(),
        [a, b] => format!("{a}和{b}"),
        [a, ..] => format!("{a} 等"),
    }
}

/// date 字段是「YYYY-MM-DD 原文」；去掉 00 的月 / 日，与 meta.parsedDate 一致。
fn parsed_date(fields: &Map<String, Value>) -> Option<String> {
    let raw = fields.get("date")?.as_str()?.split_whitespace().next()?;
    let mut parts: Vec<&str> = raw.split('-').collect();
    let year = parts.first().copied().unwrap_or("");
    if year.len() != 4 || year == "0000" || !year.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    while parts.len() > 1 && parts.last() == Some(&"00") {
        parts.pop();
    }
    Some(parts.join("-"))
}

/// 与本地 API 导入时相同形状的快照：{"data": 条目 data, "parsed_date": ...}。
fn item_snapshot(conn: &Connection, item_id: i64, key: &str) -> Result<Value, AppError> {
    let mut data = item_fields(conn, item_id)?;
    let date = parsed_date(&data);
    let item_type: String = conn
        .query_row(
            "SELECT t.typeName FROM items i JOIN itemTypes t USING (itemTypeID) WHERE i.itemID = ?1",
            [item_id],
            |row| row.get(0),
        )
        .map_err(sql_error)?;
    let creators: Vec<Value> = item_creators(conn, item_id)?
        .into_iter()
        .map(|(kind, first, last, single)| {
            if single {
                json!({ "creatorType": kind, "name": last })
            } else {
                json!({ "creatorType": kind, "firstName": first, "lastName": last })
            }
        })
        .collect();
    let mut stmt = conn
        .prepare("SELECT t.name FROM itemTags it JOIN tags t USING (tagID) WHERE it.itemID = ?1 ORDER BY t.name")
        .map_err(sql_error)?;
    let tags: Vec<Value> = stmt
        .query_map([item_id], |row| row.get::<_, String>(0))
        .map_err(sql_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sql_error)?
        .into_iter()
        .map(|tag| json!({ "tag": tag }))
        .collect();
    data.insert("key".into(), json!(key));
    data.insert("itemType".into(), json!(item_type));
    data.insert("creators".into(), Value::Array(creators));
    data.insert("tags".into(), Value::Array(tags));
    Ok(json!({ "data": data, "parsed_date": date }))
}

#[cfg(test)]
mod tests;
