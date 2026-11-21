// 把笔记包写进 Obsidian 库。重新导出同一文献时只替换受管区块与受管的 frontmatter 键，
// 用户在标记外写的内容、自己加的 frontmatter 键与 tags 保留。
// 规则见 docs/ops/planning/zotero-obsidian-integration.md「F4」。

use std::path::Path;

use serde::Serialize;

use crate::error::AppError;

use super::note::sanitize_file_name;
use super::{ExportSource, NoteBundle, ZoteroExtrasState};

const MAX_RENAME_ATTEMPTS: usize = 50;

#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ConflictPolicy {
    /// 同名文件属于别的笔记时不写，返回 conflict 让用户选。
    #[default]
    Ask,
    /// 追加 -2、-3 … 另存。
    Rename,
    /// 整篇覆盖（用户已确认）。
    Overwrite,
    Skip,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum VaultWriteStatus {
    Created,
    Updated,
    Conflict,
    Skipped,
}

#[derive(Debug, Serialize)]
pub(crate) struct VaultWriteOutcome {
    pub(crate) status: VaultWriteStatus,
    /// 库内相对路径，`/` 分隔。
    pub(crate) note_path: String,
    pub(crate) source_note_path: Option<String>,
    pub(crate) files_written: usize,
    pub(crate) assets_removed: usize,
}

/// 校验并规范化库内子目录：只允许普通目录名，禁止 `..`、绝对路径、隐藏目录。
pub(crate) fn normalize_vault_folder(folder: &str) -> Result<String, AppError> {
    let mut parts = Vec::new();
    for raw in folder.split(['/', '\\']) {
        let part = raw.trim();
        if part.is_empty() || part == "." {
            continue;
        }
        let clean = sanitize_file_name(part);
        if part == ".." || part.starts_with('.') || clean != part {
            return Err(AppError::bad_request(format!(
                "invalid vault folder: {folder}"
            )));
        }
        parts.push(clean);
    }
    Ok(parts.join("/"))
}

fn join_rel(folder: &str, name: &str) -> String {
    if folder.is_empty() {
        name.to_string()
    } else {
        format!("{folder}/{name}")
    }
}

enum Existing {
    Absent,
    Ours(String),
    Foreign,
}

fn inspect(path: &Path, source: &ExportSource) -> Result<Existing, AppError> {
    if !path.exists() {
        return Ok(Existing::Absent);
    }
    let text = std::fs::read_to_string(path)?.replace("\r\n", "\n");
    let (frontmatter, _) = split_frontmatter(&text);
    let identity = |key: &str| {
        frontmatter
            .iter()
            .find(|entry| entry.key.as_deref() == Some(key))
            .map(|entry| unquote(entry.lines[0].split_once(':').map_or("", |(_, v)| v)))
    };
    let ours = match &source.meta.document_id {
        Some(document_id) => {
            identity("paperloom_document").as_deref() == Some(document_id.as_str())
        }
        None => identity("paperloom_job").as_deref() == Some(source.job.job_id.as_str()),
    };
    Ok(if ours {
        Existing::Ours(text)
    } else {
        Existing::Foreign
    })
}

pub(super) fn write_to_vault(
    source: &ExportSource,
    vault_root: &Path,
    folder: &str,
    include_source: bool,
    policy: ConflictPolicy,
) -> Result<VaultWriteOutcome, AppError> {
    // 这次没读到 Zotero（未运行 / 未挂载）：保留笔记里上次导出的批注区块。
    let keep: &[&str] = if matches!(source.zotero_extras, ZoteroExtrasState::Unavailable) {
        &["zotero"]
    } else {
        &[]
    };
    // 同一进程内串行化写库，避免并发导出同一篇时互相覆盖。
    static WRITE_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let _guard = WRITE_LOCK
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    let folder = normalize_vault_folder(folder)?;
    let dir = vault_root.join(&folder);
    let base = source.default_base_name();
    let numbered = |attempt: usize| {
        if attempt == 1 {
            base.clone()
        } else {
            format!("{base}-{attempt}")
        }
    };
    // 之前另存为过（-2、-3 …）的同一文献：直接更新那一篇，不再每次都问。
    let mut previous = None;
    for attempt in 2..=MAX_RENAME_ATTEMPTS {
        match inspect(&dir.join(format!("{}.md", numbered(attempt))), source)? {
            Existing::Absent => break,
            Existing::Ours(_) => {
                previous = Some(numbered(attempt));
                break;
            }
            Existing::Foreign => {}
        }
    }
    let first_is_foreign = matches!(
        inspect(&dir.join(format!("{base}.md")), source)?,
        Existing::Foreign
    );
    // 用户明确选择覆盖时，覆盖的是首选名那篇。
    let preferred = previous.filter(|_| first_is_foreign && policy != ConflictPolicy::Overwrite);
    let candidates = preferred
        .into_iter()
        .chain((1..=MAX_RENAME_ATTEMPTS).map(numbered));

    for candidate in candidates {
        let bundle = source.bundle(&candidate, include_source);
        let note_path = dir.join(format!("{}.md", bundle.names.base));
        let source_path = dir.join(format!("{}.md", bundle.names.source_note));
        let main = inspect(&note_path, source)?;
        let side = if bundle.source.is_some() {
            inspect(&source_path, source)?
        } else {
            Existing::Absent
        };
        let foreign = matches!(main, Existing::Foreign) || matches!(side, Existing::Foreign);
        // 同一文献但受管标记被删掉：无法安全合并，按冲突处理。
        let unmergeable = [&main, &side].iter().any(|existing| match existing {
            Existing::Ours(text) => !has_section(text, "body"),
            _ => false,
        });

        let overwrite = if foreign || unmergeable {
            match policy {
                ConflictPolicy::Rename => continue,
                ConflictPolicy::Overwrite => true,
                ConflictPolicy::Ask | ConflictPolicy::Skip => {
                    let status = if policy == ConflictPolicy::Ask {
                        VaultWriteStatus::Conflict
                    } else {
                        VaultWriteStatus::Skipped
                    };
                    return Ok(VaultWriteOutcome {
                        status,
                        note_path: join_rel(&folder, &format!("{}.md", bundle.names.base)),
                        source_note_path: None,
                        files_written: 0,
                        assets_removed: 0,
                    });
                }
            }
        } else {
            false
        };

        let updated = matches!(main, Existing::Ours(_)) && !overwrite;
        let mut files_written = 0;
        std::fs::create_dir_all(&dir)?;
        let main_text = merged(&main, &bundle.translated, overwrite, keep);
        write_atomically(&note_path, main_text.as_bytes())?;
        files_written += 1;
        let source_note_path = match &bundle.source {
            Some(note) => {
                write_atomically(&source_path, merged(&side, note, overwrite, &[]).as_bytes())?;
                files_written += 1;
                Some(join_rel(
                    &folder,
                    &format!("{}.md", bundle.names.source_note),
                ))
            }
            None => None,
        };
        let (written, assets_removed) = sync_assets(&dir.join(&bundle.names.assets_dir), &bundle)?;
        files_written += written;
        return Ok(VaultWriteOutcome {
            status: if updated {
                VaultWriteStatus::Updated
            } else {
                VaultWriteStatus::Created
            },
            note_path: join_rel(&folder, &format!("{}.md", bundle.names.base)),
            source_note_path,
            files_written,
            assets_removed,
        });
    }
    Err(AppError::conflict(format!(
        "too many notes named {base} in {folder}"
    )))
}

fn merged(existing: &Existing, new_text: &str, overwrite: bool, keep: &[&str]) -> String {
    match existing {
        Existing::Ours(old) if !overwrite => {
            merge_note(old, new_text, keep).unwrap_or_else(|| new_text.to_string())
        }
        _ => new_text.to_string(),
    }
}

/// 复制资源；删除资源目录里由导出生成、但本次不再引用的文件（只认我们的命名模式）。
fn sync_assets(assets_dir: &Path, bundle: &NoteBundle) -> Result<(usize, usize), AppError> {
    if bundle.assets.is_empty() && !assets_dir.exists() {
        return Ok((0, 0));
    }
    std::fs::create_dir_all(assets_dir)?;
    let mut written = 0;
    for (name, from) in &bundle.assets {
        let target = assets_dir.join(name);
        let bytes = std::fs::read(from)?;
        // 内容未变就不重写，避免 Obsidian 与同步盘把它当成新修改。
        if std::fs::read(&target).ok().as_deref() != Some(bytes.as_slice()) {
            write_atomically(&target, &bytes)?;
            written += 1;
        }
    }
    let mut removed = 0;
    for entry in std::fs::read_dir(assets_dir)?.filter_map(Result::ok) {
        let name = entry.file_name().to_string_lossy().to_string();
        // 本次没有译文 PDF 时，上次导出的那份也算过期产物。
        let ours = is_generated_asset(&name) || name == bundle.names.translated_pdf;
        let keep = bundle.assets.iter().any(|(asset, _)| *asset == name);
        if ours && !keep && entry.path().is_file() {
            std::fs::remove_file(entry.path())?;
            removed += 1;
        }
    }
    Ok((written, removed))
}

/// fig-001-p03.png / tab-002.jpg / eq-010-p12.webp
pub(super) fn is_generated_asset(name: &str) -> bool {
    let Some((stem, ext)) = name.rsplit_once('.') else {
        return false;
    };
    if ext.is_empty() || !ext.chars().all(|c| c.is_ascii_alphanumeric()) {
        return false;
    }
    let mut parts = stem.split('-');
    let prefix_ok = matches!(parts.next(), Some("fig" | "tab" | "eq"));
    let number_ok = parts
        .next()
        .is_some_and(|n| n.len() >= 3 && n.chars().all(|c| c.is_ascii_digit()));
    let page_ok = match parts.next() {
        None => true,
        Some(page) => page
            .strip_prefix('p')
            .is_some_and(|n| !n.is_empty() && n.chars().all(|c| c.is_ascii_digit())),
    };
    prefix_ok && number_ok && page_ok && parts.next().is_none()
}

fn write_atomically(path: &Path, bytes: &[u8]) -> Result<(), AppError> {
    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    let tmp = parent.join(format!(".paperloom-{:016x}.tmp", fastrand::u64(..)));
    std::fs::write(&tmp, bytes)?;
    std::fs::rename(&tmp, path).map_err(|err| {
        let _ = std::fs::remove_file(&tmp);
        AppError::from(err)
    })
}

// ---- frontmatter / 受管区块合并 ----

#[derive(Debug, Clone)]
struct FrontmatterEntry {
    /// None 表示注释或无法识别的行，原样保留。
    key: Option<String>,
    lines: Vec<String>,
}

fn split_frontmatter(text: &str) -> (Vec<FrontmatterEntry>, &str) {
    let Some(rest) = text.strip_prefix("---\n") else {
        return (Vec::new(), text);
    };
    let Some(end) = rest.find("\n---\n").map(|i| (i, i + 5)).or_else(|| {
        rest.strip_suffix("\n---")
            .map(|head| (head.len(), rest.len()))
    }) else {
        return (Vec::new(), text);
    };
    let (yaml, body) = (&rest[..end.0], &rest[end.1..]);
    let mut entries: Vec<FrontmatterEntry> = Vec::new();
    for line in yaml.lines() {
        let top_level = !line.starts_with([' ', '\t', '-', '#']) && line.contains(':');
        if top_level {
            let key = line.split_once(':').map(|(k, _)| k.trim().to_string());
            entries.push(FrontmatterEntry {
                key,
                lines: vec![line.to_string()],
            });
        } else if let Some(last) = entries.last_mut().filter(|_| !line.starts_with('#')) {
            last.lines.push(line.to_string());
        } else {
            entries.push(FrontmatterEntry {
                key: None,
                lines: vec![line.to_string()],
            });
        }
    }
    (entries, body)
}

fn unquote(value: &str) -> String {
    let value = value.trim();
    value
        .strip_prefix('"')
        .and_then(|v| v.strip_suffix('"'))
        .or_else(|| value.strip_prefix('\'').and_then(|v| v.strip_suffix('\'')))
        .unwrap_or(value)
        .replace("\\\"", "\"")
        .replace("\\\\", "\\")
}

/// 早期版本的标记是 HTML 注释，两种都认；合并时整块替换，旧标记随之换成新标记。
fn section_bounds(text: &str, section: &str) -> Option<(usize, usize)> {
    [("%% ", " %%"), ("<!-- ", " -->")]
        .iter()
        .find_map(|(open, close)| {
            let begin = format!("{open}paperloom:begin {section}{close}");
            let end = format!("{open}paperloom:end {section}{close}");
            let start = text.find(&begin)?;
            let stop = start + text[start..].find(&end)? + end.len();
            Some((start, stop))
        })
}

fn has_section(text: &str, section: &str) -> bool {
    section_bounds(text, section).is_some()
}

const SECTIONS: [&str; 3] = ["links", "body", "zotero"];

/// 合并：受管 frontmatter 键取新值（tags 若用户已有则保留用户的），用户自己的键保留；
/// 受管区块整块替换，标记外内容保留。旧文件没有 body 区块时返回 None。
/// keep 中的区块在新内容里缺席时原样保留（本次没读到数据，不等于数据没了）。
pub(super) fn merge_note(old: &str, new: &str, keep: &[&str]) -> Option<String> {
    let old = old.replace("\r\n", "\n");
    let (old_fm, old_body) = split_frontmatter(&old);
    let (new_fm, new_body) = split_frontmatter(new);
    section_bounds(old_body, "body")?;

    let new_keys: Vec<&str> = new_fm
        .iter()
        .filter_map(|entry| entry.key.as_deref())
        .collect();
    let user_tags = old_fm
        .iter()
        .find(|entry| entry.key.as_deref() == Some("tags"));
    let mut fm: Vec<String> = Vec::new();
    for entry in &new_fm {
        match (entry.key.as_deref(), user_tags) {
            (Some("tags"), Some(tags)) => fm.extend(tags.lines.iter().cloned()),
            _ => fm.extend(entry.lines.iter().cloned()),
        }
    }
    for entry in &old_fm {
        if entry
            .key
            .as_deref()
            .is_none_or(|key| !new_keys.contains(&key))
        {
            fm.extend(entry.lines.iter().cloned());
        }
    }

    let mut body = old_body.to_string();
    for section in SECTIONS {
        let replacement = section_bounds(new_body, section).map(|(a, b)| &new_body[a..b]);
        match (section_bounds(&body, section), replacement) {
            (Some((a, b)), Some(block)) => body.replace_range(a..b, block),
            (Some(_), None) if keep.contains(&section) => {}
            (Some((a, b)), None) => {
                // 本次不再需要该区块（例如不再导出原文笔记）：连同其后的空行一起移除。
                let tail = body[b..].len() - body[b..].trim_start_matches('\n').len();
                body.replace_range(a..b + tail, "");
            }
            (None, Some(block)) if section == "zotero" => {
                // 批注区块在正文之后。
                let (_, b) = section_bounds(&body, "body")?;
                body.insert_str(b, &format!("\n\n{block}"));
            }
            (None, Some(block)) => {
                // 旧笔记没有该区块：放在 body 区块之前。
                let (a, _) = section_bounds(&body, "body")?;
                body.insert_str(a, &format!("{block}\n\n"));
            }
            (None, None) => {}
        }
    }
    Some(format!("---\n{}\n---\n{body}", fm.join("\n")))
}

/// 供路由层拼 obsidian://open 的 file 参数：库内路径去掉 .md。
pub(crate) fn note_uri_path(note_path: &str) -> String {
    note_path
        .strip_suffix(".md")
        .unwrap_or(note_path)
        .to_string()
}
