use std::collections::HashSet;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use walkdir::WalkDir;
use zip::{write::FileOptions, ZipArchive, ZipWriter};

use crate::db::{backup::inspect_backup_snapshot, Db};

pub(super) const DATA_DIRS: &[&str] = &[
    "uploads",
    "jobs",
    "documents",
    "assets",
    "operations",
    "fonts",
    "integrations",
    "agent-runtime",
];
const CREDENTIAL_FILES: &[&str] = &[
    "secrets/credentials.json",
    "secrets/ai-runtime.json",
    "secrets/zotero-local-auth.json",
];
pub(super) const MAX_ARCHIVE_BYTES: u64 = 64 * 1024 * 1024 * 1024;
const MAX_EXPANDED_BYTES: u64 = 256 * 1024 * 1024 * 1024;
const MAX_FILES: usize = 100_000;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub(super) struct Entry {
    pub path: String,
    pub bytes: u64,
    pub sha256: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub(super) struct Manifest {
    pub format: String,
    pub version: u32,
    pub created_at: String,
    pub schema_version: i64,
    pub includes_credentials: bool,
    pub files: Vec<Entry>,
}

/// Restrict both POSIX and Windows names, including aliases such as a trailing dot.
pub(super) fn safe_relative(raw: &str) -> Result<PathBuf> {
    if raw.is_empty() || raw.contains(['\\', ':', '\0']) {
        bail!("备份中的路径无效：{raw}");
    }
    for part in raw.split('/') {
        let stem = part.split('.').next().unwrap_or("").to_ascii_uppercase();
        if part.is_empty()
            || part == "."
            || part == ".."
            || part.ends_with(['.', ' '])
            || matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
            || (stem.len() == 4
                && (stem.starts_with("COM") || stem.starts_with("LPT"))
                && matches!(stem.as_bytes()[3], b'1'..=b'9'))
        {
            bail!("备份中的路径无效：{raw}");
        }
    }
    Ok(PathBuf::from(raw))
}

fn permitted_file(raw: &str, credentials: bool) -> bool {
    raw == "db/jobs.db"
        || DATA_DIRS
            .iter()
            .any(|dir| raw.starts_with(&format!("{dir}/")))
        || (credentials && CREDENTIAL_FILES.contains(&raw))
}

pub(super) fn private_file(path: &Path) -> Result<File> {
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    Ok(options.open(path)?)
}

pub(super) fn write_json(path: &Path, value: &impl Serialize) -> Result<()> {
    let temporary = path.with_extension(format!("{:016x}.tmp", fastrand::u64(..)));
    let mut file = private_file(&temporary)?;
    file.write_all(&serde_json::to_vec_pretty(value)?)?;
    file.sync_all()?;
    drop(file);
    // Publish complete JSON only after its bytes have been flushed.
    fs::rename(&temporary, path)?;
    Ok(())
}

pub(super) fn copy_hashed(input: &mut impl Read, output: &mut impl Write) -> Result<(u64, String)> {
    let mut digest = Sha256::new();
    let mut bytes = 0;
    let mut buffer = [0u8; 64 * 1024];
    loop {
        let read = input.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        output.write_all(&buffer[..read])?;
        digest.update(&buffer[..read]);
        bytes += read as u64;
    }
    Ok((
        bytes,
        digest
            .finalize()
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect(),
    ))
}

pub(super) fn create(
    root: &Path,
    db: &Db,
    work: &Path,
    destination: &Path,
    credentials: bool,
) -> Result<Manifest> {
    fs::create_dir_all(work)?;
    let snapshot = work.join("snapshot.db");
    let schema_version = db.create_backup_snapshot(&snapshot)?;
    let mut sources = vec![("db/jobs.db".to_owned(), snapshot)];
    for dir in DATA_DIRS {
        let directory = root.join(dir);
        if !directory.exists() {
            continue;
        }
        for item in WalkDir::new(directory).follow_links(false) {
            let item = item?;
            if item.file_type().is_symlink() {
                bail!("备份目录包含符号链接，请先移除：{}", item.path().display());
            }
            if item.file_type().is_file() {
                let relative = item
                    .path()
                    .strip_prefix(root)?
                    .to_str()
                    .context("备份文件名必须为 UTF-8")?
                    .replace('\\', "/");
                safe_relative(&relative)?;
                sources.push((relative, item.path().to_owned()));
            }
        }
    }
    if credentials {
        for relative in CREDENTIAL_FILES {
            let path = root.join(relative);
            if path.is_file() {
                if path.symlink_metadata()?.file_type().is_symlink() {
                    bail!("凭据文件不能是符号链接");
                }
                sources.push((relative.to_string(), path));
            }
        }
    }
    if sources.len() > MAX_FILES {
        bail!("备份文件数超过 100000");
    }
    sources.sort_by(|a, b| a.0.cmp(&b.0));
    let mut archive = ZipWriter::new(private_file(destination)?);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o600);
    let mut manifest = Manifest {
        format: "paperloom-backup".into(),
        version: 1,
        created_at: chrono::Utc::now().to_rfc3339(),
        schema_version,
        includes_credentials: credentials,
        files: Vec::new(),
    };
    let mut total = 0u64;
    for (path, source) in sources {
        archive.start_file(format!("data/{path}"), options)?;
        let (bytes, sha256) = copy_hashed(&mut File::open(&source)?, &mut archive)?;
        total = total.checked_add(bytes).context("备份大小溢出")?;
        if total > MAX_EXPANDED_BYTES {
            bail!("备份数据超过 256 GiB");
        }
        manifest.files.push(Entry {
            path,
            bytes,
            sha256,
        });
    }
    if db.backup_blockers()? != 0 {
        bail!("备份期间有任务启动，请等待任务完成后重试");
    }
    archive.start_file("manifest.json", options)?;
    archive.write_all(&serde_json::to_vec(&manifest)?)?;
    let file = archive.finish()?;
    file.sync_all()?;
    if file.metadata()?.len() > MAX_ARCHIVE_BYTES {
        bail!("迁移包超过 64 GiB");
    }
    Ok(manifest)
}

pub(super) fn extract(source: &Path, destination: &Path, current_schema: i64) -> Result<Manifest> {
    let mut archive = ZipArchive::new(File::open(source)?).context("无法读取 ZIP 迁移包")?;
    if archive.len() > MAX_FILES + 1 {
        bail!("迁移包文件数过多");
    }
    let manifest: Manifest = {
        let file = archive
            .by_name("manifest.json")
            .context("缺少 PaperLoom 迁移清单")?;
        if file.size() > 32 * 1024 * 1024 {
            bail!("迁移清单过大");
        }
        serde_json::from_reader(file)?
    };
    if manifest.format != "paperloom-backup" || manifest.version != 1 {
        bail!("不支持此迁移包格式，请使用 PaperLoom 导出的 ZIP 文件");
    }
    if manifest.schema_version > current_schema {
        bail!("备份来自更新版本的 PaperLoom，请先升级应用");
    }
    if manifest.files.len() + 1 != archive.len() {
        bail!("迁移清单与文件数量不一致");
    }
    let mut names = HashSet::new();
    let mut total = 0u64;
    for entry in &manifest.files {
        safe_relative(&entry.path)?;
        if !permitted_file(&entry.path, manifest.includes_credentials)
            || !names.insert(entry.path.to_lowercase())
        {
            bail!("迁移包包含不允许或重复的文件：{}", entry.path);
        }
        total = total.checked_add(entry.bytes).context("迁移包大小溢出")?;
        if total > MAX_EXPANDED_BYTES {
            bail!("迁移包展开后超过 256 GiB");
        }
    }
    if !names.contains("db/jobs.db") {
        bail!("迁移包缺少数据库");
    }
    // Validate every ZIP entry, not just entries selected from the manifest.
    for index in 0..archive.len() {
        let file = archive.by_index(index)?;
        safe_relative(file.name())?;
        if file.is_dir()
            || file
                .unix_mode()
                .is_some_and(|mode| mode & 0o170000 == 0o120000)
        {
            bail!("迁移包不能包含目录条目或符号链接");
        }
        if file.name() != "manifest.json"
            && !names.contains(
                &file
                    .name()
                    .strip_prefix("data/")
                    .unwrap_or("")
                    .to_lowercase(),
            )
        {
            bail!("迁移包包含未登记的文件");
        }
    }
    for entry in &manifest.files {
        let mut file = archive.by_name(&format!("data/{}", entry.path))?;
        if file.size() != entry.bytes {
            bail!("文件大小不匹配：{}", entry.path);
        }
        let output = destination.join("data").join(safe_relative(&entry.path)?);
        fs::create_dir_all(output.parent().context("缺少父目录")?)?;
        let (bytes, sha256) = copy_hashed(
            &mut file.by_ref().take(entry.bytes + 1),
            &mut private_file(&output)?,
        )?;
        if bytes != entry.bytes || sha256 != entry.sha256 {
            bail!("文件校验失败：{}，请重新导出或下载备份", entry.path);
        }
    }
    let version = inspect_backup_snapshot(&destination.join("data/db/jobs.db"))?;
    if version != manifest.schema_version {
        bail!("数据库版本与迁移清单不一致");
    }
    write_json(&destination.join("manifest.json"), &manifest)?;
    Ok(manifest)
}
