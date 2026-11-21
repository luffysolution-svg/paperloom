//! 正在收的上传：请求体边收边写到 `uploads/.incoming/` 下的临时文件，同时算 sha256、数字节。
//!
//! 以前整份读进内存（`Vec` 按倍数扩容，峰值接近两倍文件大小），再复制一份交给服务，内存预算
//! （`RUST_API_UPLOAD_BUFFER_MIB`）要等字节全收完才查，几个大文件同时传就能把它顶穿。现在收的时候
//! 只占一个缓冲区；收完由 `UploadService::store_incoming_for` 把临时文件换名进 `uploads/<编号>/`。
//!
//! 临时文件和数据目录在同一块盘上，换名不复制。请求中途断开、超过大小上限、校验没过，临时文件在
//! `StagedFile` 析构时删掉；进程被杀留下的，`UploadService::new` 起来时清掉一小时以前的。

use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

use sha2::{Digest, Sha256};
use tokio::io::{AsyncWriteExt, BufWriter};

use super::UploadError;

pub(super) const INCOMING_DIR: &str = ".incoming";

/// 收的过程中每写这么多字节看一次磁盘剩余空间：不等收完才发现写到了下限以下。
const DISK_CHECK_EVERY: u64 = 16 * 1024 * 1024;

/// 写盘缓冲：multipart 的块很小（几 KB 到几十 KB），攒一攒再交给阻塞线程写。
const WRITE_BUFFER: usize = 1024 * 1024;

/// 进程被杀留下的临时文件，起来时清掉多久以前的。不清刚写的：别的进程（同一数据目录的另一个实例）可能正在收。
const STALE_AFTER: Duration = Duration::from_secs(3600);

/// 磁盘上的临时文件，析构时删掉，除非已经换名走了（`disarm`）。
pub(super) struct StagedFile(PathBuf);

impl StagedFile {
    pub(super) fn path(&self) -> &Path {
        &self.0
    }

    pub(super) fn disarm(mut self) {
        self.0 = PathBuf::new();
    }
}

impl Drop for StagedFile {
    fn drop(&mut self) {
        if self.0.as_os_str().is_empty() {
            return;
        }
        match std::fs::remove_file(&self.0) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => {
                tracing::warn!(error_kind = ?error.kind(), "failed to remove incoming upload file")
            }
        }
    }
}

/// 收完的上传：临时文件、字节数和 sha256（十六进制，和 `documents::sha256_hex` 一样）。
pub struct IncomingFile {
    pub(super) file: StagedFile,
    pub(super) byte_count: u64,
    pub(super) sha256_hex: String,
}

impl IncomingFile {
    pub fn byte_count(&self) -> u64 {
        self.byte_count
    }
}

/// 正在收的上传，由 `UploadService::begin_incoming` 开。
pub struct IncomingUpload {
    writer: BufWriter<tokio::fs::File>,
    file: StagedFile,
    hasher: Sha256,
    byte_count: u64,
    max_bytes: u64,
    unchecked_bytes: u64,
    check_disk: Box<dyn Fn() -> Result<(), UploadError> + Send + Sync>,
}

impl IncomingUpload {
    pub(super) async fn create(
        uploads_dir: &Path,
        max_bytes: u64,
        check_disk: Box<dyn Fn() -> Result<(), UploadError> + Send + Sync>,
    ) -> Result<Self, UploadError> {
        let dir = uploads_dir.join(INCOMING_DIR);
        tokio::fs::create_dir_all(&dir).await?;
        for _ in 0..16 {
            let path = dir.join(format!("{:016x}.part", fastrand::u64(..)));
            match tokio::fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&path)
                .await
            {
                Ok(file) => {
                    return Ok(Self {
                        writer: BufWriter::with_capacity(WRITE_BUFFER, file),
                        file: StagedFile(path),
                        hasher: Sha256::new(),
                        byte_count: 0,
                        max_bytes,
                        unchecked_bytes: 0,
                        check_disk,
                    })
                }
                Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(error) => return Err(error.into()),
            }
        }
        Err(UploadError::internal("could not reserve an incoming upload file"))
    }

    /// 写一块。超过大小上限是 413，磁盘到了下限是 503，两种都丢掉已经收的部分。
    pub async fn write_chunk(&mut self, chunk: &[u8]) -> Result<(), UploadError> {
        let next = self
            .byte_count
            .checked_add(chunk.len() as u64)
            .filter(|next| *next <= self.max_bytes)
            .ok_or_else(|| UploadError::payload_too_large("request body is too large"))?;
        self.unchecked_bytes += chunk.len() as u64;
        if self.unchecked_bytes >= DISK_CHECK_EVERY {
            self.unchecked_bytes = 0;
            (self.check_disk)()?;
        }
        self.hasher.update(chunk);
        self.writer.write_all(chunk).await?;
        self.byte_count = next;
        Ok(())
    }

    pub async fn finish(mut self) -> Result<IncomingFile, UploadError> {
        self.writer.flush().await?;
        // 关掉文件句柄再交出去：Windows 上开着的文件换不了名。
        drop(self.writer);
        let sha256_hex = self
            .hasher
            .finalize()
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect();
        Ok(IncomingFile {
            file: self.file,
            byte_count: self.byte_count,
            sha256_hex,
        })
    }
}

/// 起来时清掉上次进程被杀留下的临时文件（一小时以前的）。
pub(super) fn remove_stale_incoming(uploads_dir: &Path) {
    let Ok(entries) = std::fs::read_dir(uploads_dir.join(INCOMING_DIR)) else {
        return;
    };
    let Some(cutoff) = SystemTime::now().checked_sub(STALE_AFTER) else {
        return;
    };
    for entry in entries.flatten() {
        let stale = entry
            .metadata()
            .ok()
            .filter(|metadata| metadata.is_file())
            .and_then(|metadata| metadata.modified().ok())
            .is_some_and(|modified| modified < cutoff);
        if stale {
            let _ = std::fs::remove_file(entry.path());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn uploads_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("retainpdf-incoming-{name}-{}", fastrand::u64(..)));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn no_disk_check() -> Box<dyn Fn() -> Result<(), UploadError> + Send + Sync> {
        Box::new(|| Ok(()))
    }

    fn incoming_entries(dir: &Path) -> usize {
        std::fs::read_dir(dir.join(INCOMING_DIR)).map_or(0, |entries| entries.count())
    }

    #[tokio::test]
    async fn chunks_are_written_to_disk_with_the_same_hash_as_the_whole_bytes() {
        let dir = uploads_dir("hash");
        let body: Vec<u8> = (0..3 * WRITE_BUFFER + 17).map(|index| (index % 251) as u8).collect();
        let mut incoming = IncomingUpload::create(&dir, u64::MAX, no_disk_check()).await.unwrap();
        for chunk in body.chunks(8191) {
            incoming.write_chunk(chunk).await.unwrap();
        }
        let file = incoming.finish().await.unwrap();

        assert_eq!(file.byte_count(), body.len() as u64);
        assert_eq!(file.sha256_hex, retainpdf_data::db::documents::sha256_hex(&body));
        assert_eq!(std::fs::read(file.file.path()).unwrap(), body);
        drop(file);
        assert_eq!(incoming_entries(&dir), 0, "没换名走的临时文件析构时删掉");
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[tokio::test]
    async fn going_over_the_size_limit_is_413_and_the_partial_file_is_removed() {
        let dir = uploads_dir("limit");
        let mut incoming = IncomingUpload::create(&dir, 10, no_disk_check()).await.unwrap();
        incoming.write_chunk(b"0123456789").await.unwrap();
        let error = incoming.write_chunk(b"x").await.unwrap_err();
        assert!(matches!(error, UploadError::PayloadTooLarge(_)), "{error:?}");
        drop(incoming);
        assert_eq!(incoming_entries(&dir), 0);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[tokio::test]
    async fn the_disk_floor_is_checked_while_receiving() {
        let dir = uploads_dir("disk");
        let checks = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let seen = checks.clone();
        let check = Box::new(move || {
            seen.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            Err(UploadError::InsufficientStorage("disk is full".into()))
        });
        let mut incoming = IncomingUpload::create(&dir, u64::MAX, check).await.unwrap();
        let chunk = vec![0u8; 1024 * 1024];
        let mut written = 0u64;
        let error = loop {
            match incoming.write_chunk(&chunk).await {
                Ok(()) => written += chunk.len() as u64,
                Err(error) => break error,
            }
        };
        assert!(matches!(error, UploadError::InsufficientStorage(_)), "{error:?}");
        assert_eq!(checks.load(std::sync::atomic::Ordering::SeqCst), 1);
        assert!(written < DISK_CHECK_EVERY, "到 {DISK_CHECK_EVERY} 字节就该查一次，收了 {written}");
        drop(incoming);
        assert_eq!(incoming_entries(&dir), 0);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn stale_incoming_files_are_removed_and_fresh_ones_kept() {
        let dir = uploads_dir("stale");
        let incoming = dir.join(INCOMING_DIR);
        std::fs::create_dir_all(&incoming).unwrap();
        let stale = incoming.join("stale.part");
        let fresh = incoming.join("fresh.part");
        std::fs::write(&stale, b"x").unwrap();
        std::fs::write(&fresh, b"x").unwrap();
        std::fs::File::options()
            .write(true)
            .open(&stale)
            .unwrap()
            .set_modified(SystemTime::now() - 2 * STALE_AFTER)
            .unwrap();

        remove_stale_incoming(&dir);

        assert!(!stale.exists());
        assert!(fresh.exists(), "可能正在收的不删");
        std::fs::remove_dir_all(dir).unwrap();
    }
}
